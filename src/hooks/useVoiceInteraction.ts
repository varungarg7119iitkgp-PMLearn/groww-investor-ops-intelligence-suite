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

/* ── Minimal Web Speech API types (not always present in TS dom lib) ── */
interface WSARecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { readonly transcript: string; readonly confidence: number };
}
interface WSAResultList {
  readonly length: number;
  [index: number]: WSARecognitionResult;
}
interface WSAEvent extends Event {
  readonly results: WSAResultList;
  readonly resultIndex: number;
}
interface WSAErrorEvent extends Event {
  readonly error: string;
}
interface WSARecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((ev: WSAEvent) => void) | null;
  onerror: ((ev: WSAErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/** Returns the SpeechRecognition constructor when the browser supports it. */
function getSpeechRecognitionCtor(): (new () => WSARecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    SpeechRecognition?: new () => WSARecognition;
    webkitSpeechRecognition?: new () => WSARecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseVoiceInteractionOptions {
  /** Called with the recognized transcript after STT completes */
  onTranscript: (transcript: string) => Promise<{ assistantText: string } | void> | { assistantText: string } | void;
}

export interface SpeakOptions {
  /** Do not surface browser autoplay-block errors (expected before first tap). */
  suppressAutoplayError?: boolean;
}

function isAutoplayBlockedError(message: string): boolean {
  return /didn't interact|autoplay|NotAllowedError/i.test(message);
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
  speak: (text: string, options?: SpeakOptions) => Promise<boolean>;
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
  /** Web Speech API recognition instance (primary STT when available) */
  const recognitionRef = useRef<WSARecognition | null>(null);
  /** Accumulated WSA transcript (updated on every interim result) */
  const wsaTranscriptRef = useRef<string>("");
  /** True when WSA is the active listening mode */
  const isWsaModeRef = useRef(false);
  /** Current TTS playback element. We deliberately create a FRESH Audio
   *  object on every speak() call so MediaElementAudioSourceNode never
   *  hits its "one source node per element" limitation. */
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  /* Note: we no longer wire the TTS playback through Web Audio. The orb
   * has its own steady-state amplitude during SPEAKING (the parent
   * component falls back to 0.5 in that case), and routing the playback
   * through Web Audio caused silent audio on the 2nd+ turn because the
   * audio element became permanently bound to a MediaElementSourceNode
   * whose destination chain was being torn down between turns. */
  const { level: audioLevel, connectStream, disconnect } = useAudioAnalyzer();

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
    wsaTranscriptRef.current = "";
    isWsaModeRef.current = false;

    /* Primary path: Web Speech API (Chrome/Edge/Safari — no API key needed) */
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (SpeechRecognitionCtor) {
      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = "en-IN";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.onresult = (event) => {
          let finalText = "";
          for (let i = 0; i < event.results.length; i++) {
            finalText += event.results[i][0].transcript + " ";
          }
          wsaTranscriptRef.current = finalText.trim();
        };
        recognition.onerror = (event: WSAErrorEvent) => {
          if (event.error !== "aborted" && event.error !== "no-speech") {
            setLastError(`Speech recognition: ${event.error}`);
          }
        };
        recognitionRef.current = recognition;
        recognition.start();
        isWsaModeRef.current = true;
        setIsListening(true);
        setOrbState("LISTENING");

        /* Also acquire mic for amplitude display on the orb */
        const stream = await acquireMic().catch(() => null);
        if (stream) connectStream(stream);
        return;
      } catch {
        recognitionRef.current = null;
        isWsaModeRef.current = false;
      }
    }

    /* Fallback path: MediaRecorder → ElevenLabs STT */
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

    /* ── Web Speech API path ── */
    if (isWsaModeRef.current && recognitionRef.current) {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      isWsaModeRef.current = false;

      /* Stop WSA — let it finalise any pending result */
      try { recognition.stop(); } catch { /* noop */ }
      setIsListening(false);
      setOrbState("THINKING");
      disconnect();

      /* Small delay so the browser can fire the final onresult */
      await new Promise<void>((r) => setTimeout(r, 200));
      const transcript = wsaTranscriptRef.current.trim();
      wsaTranscriptRef.current = "";

      if (!transcript) {
        setLastError("No speech detected — speak clearly and try again");
        setOrbState("IDLE");
        return;
      }

      try {
        const result = await opts.onTranscript(transcript);
        if (result && "assistantText" in result && result.assistantText) {
          await speak(result.assistantText);
        } else {
          setOrbState("IDLE");
        }
      } catch (err) {
        setLastError(err instanceof Error ? err.message : String(err));
        setOrbState("IDLE");
      }
      return;
    }

    /* ── MediaRecorder + ElevenLabs path (fallback) ── */
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
          /* 1. STT via ElevenLabs */
          const form = new FormData();
          form.append("audio", blob, "input.webm");
          const sttRes = await fetch("/api/voice/stt", { method: "POST", body: form });
          if (!sttRes.ok) {
            const err = await sttRes.text();
            setLastError(`STT error (${sttRes.status}): ${err.slice(0, 160)}`);
            setOrbState("IDLE");
            resolve();
            return;
          }
          const sttJson = (await sttRes.json()) as { transcript?: string };
          const transcript = (sttJson.transcript ?? "").trim();
          if (!transcript) {
            setLastError("Empty transcript — speak closer to mic and try again");
            setOrbState("IDLE");
            resolve();
            return;
          }

          /* 2. Hand off to caller */
          const result = await opts.onTranscript(transcript);

          /* 3. Speak the response if returned */
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

  /* ── speak ──────────────────────────────────────────────────
   * Plays a TTS audio blob from /api/voice/tts.
   *
   * Production-bug fix notes:
   *  - Fresh `new Audio()` per call. Reusing a single element across
   *    turns is fatal because once a MediaElementAudioSourceNode is
   *    bound to it, the playback is hijacked by Web Audio for the
   *    rest of that element's life — even after the source node is
   *    disconnected.
   *  - No `crossOrigin` on blob URLs. Setting `crossOrigin = "anonymous"`
   *    after `src` is set caused Safari to re-fetch the blob and fail.
   *  - No Web Audio routing for playback. The previous version pumped
   *    audio through createMediaElementSource(), which silently produced
   *    no sound on the 2nd turn (single-use limitation). The orb
   *    already pulses with a synthetic amplitude during SPEAKING.
   *  - If the previous turn's audio is still playing, stop it first.
   */
  const speak = useCallback(
    async (text: string, options?: SpeakOptions): Promise<boolean> => {
      if (!text || text.trim().length === 0) return false;

      /* Stop any currently-playing TTS so a fast 2nd reply doesn't
       * stack on top of the previous one. */
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current.src = "";
        } catch { /* noop */ }
        currentAudioRef.current = null;
      }

      setOrbState("SPEAKING");
      try {
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok || !res.body) {
          const errBody = await res.text().catch(() => "");
          setLastError(`TTS failed (${res.status}): ${errBody.slice(0, 160)}`);
          setOrbState("IDLE");
          return false;
        }
        const audioBlob = await res.blob();
        if (!audioBlob || audioBlob.size === 0) {
          setLastError("TTS returned an empty audio body");
          setOrbState("IDLE");
          return false;
        }
        const url = URL.createObjectURL(audioBlob);

        /* Fresh Audio element per playback — sidesteps the
         * MediaElementSourceNode singleton trap entirely. */
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = url;
        currentAudioRef.current = audio;

        return await new Promise<boolean>((resolve) => {
          let settled = false;
          const finish = (errMsg?: string) => {
            if (settled) return;
            settled = true;
            URL.revokeObjectURL(url);
            if (currentAudioRef.current === audio) {
              currentAudioRef.current = null;
            }
            if (errMsg) setLastError(errMsg);
            setOrbState("IDLE");
            resolve(!errMsg);
          };
          audio.onended = () => finish();
          audio.onerror = () => finish("TTS audio decode / playback error");

          /* play() rejects when autoplay is blocked (no prior user gesture). */
          audio.play().catch((err) => {
            const m = err instanceof Error ? err.message : String(err);
            if (options?.suppressAutoplayError && isAutoplayBlockedError(m)) {
              finish();
              return;
            }
            finish(`audio.play() rejected: ${m}`);
          });
        });
      } catch (err) {
        setLastError(err instanceof Error ? err.message : String(err));
        setOrbState("IDLE");
        return false;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setOrbState("IDLE");
    setIsListening(false);
    setLastError(null);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    isWsaModeRef.current = false;
    wsaTranscriptRef.current = "";
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch { /* noop */ }
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = "";
      } catch { /* noop */ }
      currentAudioRef.current = null;
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
