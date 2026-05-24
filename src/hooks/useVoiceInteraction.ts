/**
 * useVoiceInteraction — Phase 11
 *
 * High-level voice loop hook. Composes:
 *   - Microphone capture (MediaRecorder → audio Blob → /api/voice/stt)
 *   - Transcript dispatch to caller-supplied `onTranscript`
 *   - TTS playback (text → /api/voice/tts → HTMLAudioElement)
 *   - AI Orb state sync (`idle → listening → thinking → speaking → idle`)
 *   - useAudioAnalyzer integration (orb amplitude)
 *   - Text-mode fallback (when mic unavailable)
 *
 * Owner code (e.g. `InvestorTerminal`) just imports `useVoiceInteraction`,
 * passes `onTranscript` (typically calls `/api/voice/converse`) and renders
 * `audioLevel` on the AIOrb.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioAnalyzer } from "@/hooks/useAudioAnalyzer";
import type { AgentVisualState } from "@/types";

const RECORDING_MIME = "audio/webm;codecs=opus";

export interface UseVoiceInteractionOptions {
  /** Called with the recognized transcript after STT completes */
  onTranscript: (transcript: string) => Promise<{ assistantText: string } | void> | { assistantText: string } | void;
}

export interface UseVoiceInteractionResult {
  /** Current orb state — drive AIOrb with this */
  orbState: AgentVisualState;
  /** Audio level 0-1 for orb amplitude */
  audioLevel: number;
  /** True once mic permission granted and stream acquired */
  isMicReady: boolean;
  /** True when mic is unavailable (text fallback mode) */
  isTextFallback: boolean;
  /** True while recording */
  isListening: boolean;
  /** Last error, if any */
  lastError: string | null;
  /** Begin a single voice turn (start recording) */
  startListening: () => Promise<void>;
  /** Stop recording — STT → caller's onTranscript → optional TTS */
  stopListening: () => Promise<void>;
  /** Speak text via TTS (used by parent for theme-aware greetings) */
  speak: (text: string) => Promise<void>;
  /** Hard reset to IDLE */
  reset: () => void;
}

export function useVoiceInteraction(
  opts: UseVoiceInteractionOptions,
): UseVoiceInteractionResult {
  const [orbState, setOrbState] = useState<AgentVisualState>("IDLE");
  const [isMicReady, setIsMicReady] = useState(false);
  const [isTextFallback, setIsTextFallback] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const { level: audioLevel, connectStream, connectAudioElement, disconnect } = useAudioAnalyzer();

  /* ── Initialize mic availability check (lazy on first call) ── */
  const acquireMic = useCallback(async (): Promise<MediaStream | null> => {
    if (mediaStreamRef.current) return mediaStreamRef.current;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setIsTextFallback(true);
      setLastError("Microphone API not available — using text mode");
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setIsMicReady(true);
      setIsTextFallback(false);
      return stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLastError(`Mic permission denied: ${message}`);
      setIsTextFallback(true);
      setIsMicReady(false);
      return null;
    }
  }, []);

  /* ── startListening ───────────────────────────────────────── */
  const startListening = useCallback(async () => {
    setLastError(null);
    const stream = await acquireMic();
    if (!stream) return;

    let mimeType = RECORDING_MIME;
    if (typeof MediaRecorder !== "undefined" && !MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "audio/webm";
    }
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorderRef.current = recorder;
    recorder.start();
    setIsListening(true);
    setOrbState("LISTENING");
    connectStream(stream);
  }, [acquireMic, connectStream]);

  /* ── stopListening: STT → onTranscript → speak ─────────────── */
  const stopListening = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setIsListening(false);
      setOrbState("IDLE");
      return;
    }

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        setIsListening(false);
        setOrbState("THINKING");
        disconnect();

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];

        try {
          /* 1. STT */
          const form = new FormData();
          form.append("audio", blob, "input.webm");
          const sttRes = await fetch("/api/voice/stt", { method: "POST", body: form });
          if (!sttRes.ok) {
            const err = await sttRes.text();
            setLastError(`STT failed: ${err.slice(0, 200)}`);
            setOrbState("IDLE");
            resolve();
            return;
          }
          const sttJson = (await sttRes.json()) as { transcript?: string };
          const transcript = (sttJson.transcript ?? "").trim();
          if (!transcript) {
            setLastError("Empty transcript — try again");
            setOrbState("IDLE");
            resolve();
            return;
          }

          /* 2. Hand off to caller */
          const result = await opts.onTranscript(transcript);

          /* 3. If caller returned text, speak it */
          if (result && "assistantText" in result && result.assistantText) {
            await speak(result.assistantText);
          } else {
            setOrbState("IDLE");
          }
        } catch (err) {
          setLastError(err instanceof Error ? err.message : String(err));
          setOrbState("IDLE");
        }
        resolve();
      };
      recorder.stop();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disconnect, opts]);

  /* ── speak ────────────────────────────────────────────────── */
  const speak = useCallback(
    async (text: string) => {
      if (!text || text.trim().length === 0) return;
      setOrbState("SPEAKING");
      try {
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok || !res.body) {
          setLastError(`TTS failed: ${res.status}`);
          setOrbState("IDLE");
          return;
        }
        const audioBlob = await res.blob();
        const url = URL.createObjectURL(audioBlob);

        /* Lazy create audio element so analyzer can connect cleanly */
        if (!audioElementRef.current) {
          audioElementRef.current = new Audio();
        }
        const audio = audioElementRef.current;
        audio.src = url;
        audio.crossOrigin = "anonymous";

        try {
          connectAudioElement(audio);
        } catch (_err) {
          void _err;
          /* If analyzer connection fails (e.g. already wired), continue without amplitude */
        }

        await new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            disconnect();
            setOrbState("IDLE");
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            disconnect();
            setOrbState("IDLE");
            resolve();
          };
          audio.play().catch(() => {
            URL.revokeObjectURL(url);
            disconnect();
            setOrbState("IDLE");
            resolve();
          });
        });
      } catch (err) {
        setLastError(err instanceof Error ? err.message : String(err));
        setOrbState("IDLE");
      }
    },
    [connectAudioElement, disconnect],
  );

  const reset = useCallback(() => {
    setOrbState("IDLE");
    setIsListening(false);
    setLastError(null);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch { /* noop */ }
    }
    disconnect();
  }, [disconnect]);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        for (const t of mediaStreamRef.current.getTracks()) {
          try { t.stop(); } catch { /* noop */ }
        }
        mediaStreamRef.current = null;
      }
      disconnect();
    };
  }, [disconnect]);

  return {
    orbState,
    audioLevel,
    isMicReady,
    isTextFallback,
    isListening,
    lastError,
    startListening,
    stopListening,
    speak,
    reset,
  };
}
