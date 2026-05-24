/**
 * useAudioAnalyzer — Phase 11
 *
 * Web-Audio-API hook that produces a real-time normalized audio level
 * (0-1) driving the AIOrb's amplitude. Works with EITHER:
 *
 *   - A `MediaStream` (mic capture during LISTENING state), OR
 *   - An `HTMLAudioElement` (TTS playback during SPEAKING state)
 *
 * The hook handles AudioContext lifecycle correctly, including:
 *   - Lazy creation (Safari requires a user gesture before AudioContext)
 *   - Connect / disconnect on source change
 *   - Cleanup on unmount
 *
 * Tracing:
 *   - Past project (`learning-2-AI-Agent-Scheduler/src/hooks/useAudioAnalyzer.ts`)
 *     used a similar pattern; this is a typed rewrite tailored to Phase 11.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAudioAnalyzerResult {
  /** Real-time audio level, normalized 0-1 */
  level: number;
  /** Whether analyzer is currently connected to a source */
  isActive: boolean;
  /** Connect to a microphone MediaStream (begins sampling) */
  connectStream: (stream: MediaStream) => void;
  /** Connect to an HTMLAudioElement (TTS playback) */
  connectAudioElement: (el: HTMLAudioElement) => void;
  /** Disconnect the current source */
  disconnect: () => void;
}

const SMOOTHING = 0.8;
const FFT_SIZE = 256;

export function useAudioAnalyzer(): UseAudioAnalyzerResult {
  const [level, setLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<Uint8Array | null>(null);

  const ensureContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (ctxRef.current) {
      /* Chromium/Safari start the context in "suspended" state until a
       * user gesture. Calling resume() inside the same gesture chain
       * (e.g. the mic click handler) wakes it up. Safe no-op if already
       * running. */
      if (ctxRef.current.state === "suspended") {
        ctxRef.current.resume().catch(() => { /* noop */ });
      }
      return ctxRef.current;
    }
    /* Cast for vendor prefix support */
    const Win = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = Win.AudioContext ?? Win.webkitAudioContext;
    if (!Ctor) return null;
    ctxRef.current = new Ctor();
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => { /* noop */ });
    }
    return ctxRef.current;
  }, []);

  const tearDownSource = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch { /* noop */ }
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch { /* noop */ }
      analyserRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsActive(false);
    setLevel(0);
  }, []);

  const startSampling = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    if (!bufferRef.current || bufferRef.current.length !== analyser.frequencyBinCount) {
      bufferRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
    const buf = bufferRef.current;
    const sample = () => {
      analyser.getByteFrequencyData(buf as unknown as Uint8Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      const avg = sum / buf.length / 255;
      setLevel(Math.min(1, Math.max(0, avg * 2.5)));
      rafRef.current = requestAnimationFrame(sample);
    };
    rafRef.current = requestAnimationFrame(sample);
  }, []);

  const connectStream = useCallback(
    (stream: MediaStream) => {
      tearDownSource();
      const ctx = ensureContext();
      if (!ctx) return;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
      analyserRef.current = analyser;
      setIsActive(true);
      startSampling();
    },
    [ensureContext, startSampling, tearDownSource],
  );

  const connectAudioElement = useCallback(
    (el: HTMLAudioElement) => {
      tearDownSource();
      const ctx = ensureContext();
      if (!ctx) return;
      try {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = SMOOTHING;
        const source = ctx.createMediaElementSource(el);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        sourceRef.current = source;
        analyserRef.current = analyser;
        setIsActive(true);
        startSampling();
      } catch (err) {
        /* createMediaElementSource throws if the element is already
         * connected to another context — silently fall back. */
        console.warn("[useAudioAnalyzer] connectAudioElement failed:", err);
        setIsActive(false);
      }
    },
    [ensureContext, startSampling, tearDownSource],
  );

  const disconnect = useCallback(() => {
    tearDownSource();
  }, [tearDownSource]);

  useEffect(() => {
    return () => {
      tearDownSource();
      if (ctxRef.current) {
        try {
          ctxRef.current.close();
        } catch {
          /* noop */
        }
        ctxRef.current = null;
      }
    };
  }, [tearDownSource]);

  return { level, isActive, connectStream, connectAudioElement, disconnect };
}
