/**
 * AIOrb — Phase 4 (Enhanced)
 *
 * 200×200px voice agent visualizer. Enhancements vs. initial build:
 *
 *  [NEW] PLASMA RIPPLE RINGS — 5 staggered expanding rings that radiate
 *        outward from the orb surface, giving a fluid, plasmatic look.
 *
 *  [NEW] HORIZONTAL VOICE WAVE — Symmetric waveform bars extending left
 *        and right of the orb, forming a real-time audio spectrum backdrop.
 *        Bars nearest the orb are tallest; Gaussian envelope taper outward.
 *
 *  [NEW] GROWW LOGO SHADOW — The Groww mountain-chart wave is rendered as
 *        a semi-transparent dual-tone watermark clipped inside the sphere,
 *        grounding the orb as a Groww-native UI element.
 *
 * Adapted from M3 AudioVisualizer.tsx, spec UI/UX §5.3 (updated).
 */

"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentVisualState } from "@/types";

/* ── Layout constants ───────────────────────────────────────── */
const ORBIT_BARS       = 24;   // radial ring bars (existing)
const ORBIT_RADIUS_RATIO = 0.58; // fraction of (size/2) for radial ring
const BAR_BASE_H       = 4;
const BAR_MAX_H        = 22;

const WAVE_BARS        = 13;   // horizontal bars per side
const WAVE_PITCH       = 8;    // px center-to-center  
const WAVE_START       = 20;   // gap from orb edge to first bar
const WAVE_BAR_W       = 3;    // bar width
const WAVE_IDLE_MAX_H  = 18;   // max bar height in idle state
const WAVE_ACTIVE_MAX_H = 36;  // max bar height when active

const PLASMA_RINGS     = 5;    // expanding ripple rings
const SVG_PAD_X_RATIO  = 0.58; // horizontal SVG padding as fraction of size

/* ── Easing ─────────────────────────────────────────────────── */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ── State config ───────────────────────────────────────────── */
const STATE_CONFIG: Record<
  AgentVisualState,
  { scale: number; opacity: number; glowOpacity: number; coreFilter: string }
> = {
  IDLE:      { scale: 1.00, opacity: 0.82, glowOpacity: 0.35, coreFilter: "brightness(1)"    },
  LISTENING: { scale: 1.08, opacity: 1.00, glowOpacity: 0.65, coreFilter: "brightness(1.22)" },
  THINKING:  { scale: 0.95, opacity: 0.62, glowOpacity: 0.20, coreFilter: "brightness(0.8)"  },
  SPEAKING:  { scale: 1.05, opacity: 1.00, glowOpacity: 0.55, coreFilter: "brightness(1.15)" },
};

/* ── Gaussian bar height envelope ──────────────────────────── */
function barEnvelope(i: number, total: number, sigma = 0.65): number {
  return Math.exp(-(((i / total) / sigma) ** 2));
}

/* ── Utility: polar → cartesian ─────────────────────────────── */
function polarToXY(angle: number, r: number, cx: number, cy: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/* ── Groww logo wave path builder ───────────────────────────── */
function growwWavePath(cx: number, cy: number, r: number): string {
  const px = (x: number) => cx + x * r;
  const py = (y: number) => cy + y * r;
  return [
    `M ${px(-1)} ${py(0.18)}`,
    // first gentle hill — leftward rise
    `C ${px(-0.72)} ${py(0.18)} ${px(-0.58)} ${py(-0.08)} ${px(-0.22)} ${py(-0.08)}`,
    // dip, small valley
    `C ${px(0.02)} ${py(-0.08)} ${px(0.18)} ${py(0.10)} ${px(0.38)} ${py(0.04)}`,
    // sharper rise to main peak (the characteristic Groww right-side mountain)
    `C ${px(0.55)} ${py(-0.04)} ${px(0.68)} ${py(-0.52)} ${px(1.0)} ${py(-0.48)}`,
    `L ${px(1)} ${py(1)}`,
    `L ${px(-1)} ${py(1)}`,
    `Z`,
  ].join(" ");
}

/* ── Component Props ────────────────────────────────────────── */
interface AIOrbProps {
  state?: AgentVisualState;
  audioLevel?: number;
  themeContext?: string;
  size?: number;
  ariaLabel?: string;
}

/* ════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════ */

/* ── Horizontal Voice Wave ──────────────────────────────────── */
interface VoiceWaveProps {
  cx: number; cy: number;
  orbRadius: number;
  audioLevel: number;
  state: AgentVisualState;
}

function VoiceWave({ cx, cy, orbRadius, audioLevel, state }: VoiceWaveProps) {
  const isActive  = state === "LISTENING" || state === "SPEAKING";
  const isThink   = state === "THINKING";
  const maxH      = isActive ? WAVE_ACTIVE_MAX_H : WAVE_IDLE_MAX_H;
  const baseAlpha = isThink ? 0.08 : isActive ? 0.65 : 0.25;

  return (
    <g aria-hidden="true" data-testid="voice-wave">
      {/* Left bars */}
      {Array.from({ length: WAVE_BARS }, (_, i) => {
        const env  = barEnvelope(i, WAVE_BARS);
        const bH   = Math.max(WAVE_BAR_W, (maxH * env * (1 + audioLevel * 1.2)));
        const bX   = cx - orbRadius - WAVE_START - i * WAVE_PITCH - WAVE_BAR_W / 2;
        const bY   = cy - bH / 2;
        const alpha = Math.max(0.04, baseAlpha - i * 0.04);

        return (
          <motion.rect
            key={`lw-${i}`}
            x={bX}
            y={bY}
            width={WAVE_BAR_W}
            height={bH}
            rx={1.5}
            fill="var(--investor)"
            opacity={alpha}
            animate={
              isActive
                ? { height: [bH * 0.35, bH * (1 + audioLevel * 0.6), bH * 0.35], y: [cy - bH * 0.175, bY, cy - bH * 0.175] }
                : { height: [bH * 0.5, bH, bH * 0.5], y: [cy - bH * 0.25, bY, cy - bH * 0.25] }
            }
            transition={{
              duration: isActive ? 0.5 + i * 0.04 : 1.8 + i * 0.12,
              repeat: Infinity,
              delay: i * 0.06,
              ease: "easeInOut",
            }}
          />
        );
      })}

      {/* Right bars (mirror) */}
      {Array.from({ length: WAVE_BARS }, (_, i) => {
        const env  = barEnvelope(i, WAVE_BARS);
        const bH   = Math.max(WAVE_BAR_W, (maxH * env * (1 + audioLevel * 1.2)));
        const bX   = cx + orbRadius + WAVE_START + i * WAVE_PITCH - WAVE_BAR_W / 2;
        const bY   = cy - bH / 2;
        const alpha = Math.max(0.04, baseAlpha - i * 0.04);

        return (
          <motion.rect
            key={`rw-${i}`}
            x={bX}
            y={bY}
            width={WAVE_BAR_W}
            height={bH}
            rx={1.5}
            fill="var(--investor)"
            opacity={alpha}
            animate={
              isActive
                ? { height: [bH * 0.35, bH * (1 + audioLevel * 0.6), bH * 0.35], y: [cy - bH * 0.175, bY, cy - bH * 0.175] }
                : { height: [bH * 0.5, bH, bH * 0.5], y: [cy - bH * 0.25, bY, cy - bH * 0.25] }
            }
            transition={{
              duration: isActive ? 0.5 + i * 0.04 : 1.8 + i * 0.12,
              repeat: Infinity,
              delay: i * 0.06 + 0.03, // slight mirror offset
              ease: "easeInOut",
            }}
          />
        );
      })}
    </g>
  );
}

/* ── Plasma Ripple Rings ────────────────────────────────────── */
interface PlasmaRipplesProps {
  cx: number; cy: number;
  orbRadius: number;
  state: AgentVisualState;
}

const RIPPLE_PARAMS = [
  { delay: 0.0,  duration: 2.4, startScale: 1.04, endScale: 2.10, strokeW: 1.4, opacityPeak: 0.55 },
  { delay: 0.48, duration: 2.4, startScale: 1.06, endScale: 2.00, strokeW: 0.8, opacityPeak: 0.38 },
  { delay: 0.96, duration: 2.4, startScale: 1.03, endScale: 1.95, strokeW: 1.2, opacityPeak: 0.45 },
  { delay: 1.44, duration: 2.4, startScale: 1.07, endScale: 2.15, strokeW: 0.7, opacityPeak: 0.30 },
  { delay: 1.92, duration: 2.4, startScale: 1.05, endScale: 2.05, strokeW: 1.0, opacityPeak: 0.40 },
];

function PlasmaRipples({ cx, cy, orbRadius, state }: PlasmaRipplesProps) {
  const isThink = state === "THINKING";
  // Scale down ripple opacity in thinking state (internal focus look)
  const opacityMult = isThink ? 0.3 : 1.0;

  /* Defer ripple mount until after the client has hydrated.
   * Framer Motion animates the SVG `r` attribute, which can race with
   * SSR hydration on first paint (ripples invisible until reload).
   * Mounting on a useEffect tick guarantees clean animation start. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <g aria-hidden="true" data-testid="plasma-ripples">
      {mounted && RIPPLE_PARAMS.map((p, i) => (
        <motion.circle
          key={`ripple-${i}`}
          cx={cx}
          cy={cy}
          fill="none"
          stroke="var(--investor)"
          strokeWidth={p.strokeW}
          initial={{ opacity: p.opacityPeak * opacityMult, r: orbRadius * p.startScale }}
          animate={{
            r:       [orbRadius * p.startScale, orbRadius * p.endScale],
            opacity: [p.opacityPeak * opacityMult, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Inner plasma micro-ring (fast, close to surface) */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={orbRadius * 1.02}
        fill="none"
        stroke="rgba(127, 252, 255, 0.6)"
        strokeWidth={0.5}
        animate={{ opacity: [0.4, 0.8, 0.4], r: [orbRadius * 1.02, orbRadius * 1.08, orbRadius * 1.02] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </g>
  );
}

/* ── Groww Logo Shadow (clipped wave watermark inside sphere) ── */
interface GrowwShadowProps {
  cx: number; cy: number;
  orbRadius: number;
  clipId: string;
}

function GrowwShadow({ cx, cy, orbRadius, clipId }: GrowwShadowProps) {
  const wavePath = growwWavePath(cx, cy, orbRadius);

  return (
    <g clipPath={`url(#${clipId})`} aria-hidden="true" data-testid="groww-shadow">
      {/* Blue/purple upper portion — subtle tint above the wave */}
      <circle
        cx={cx}
        cy={cy}
        r={orbRadius}
        fill="rgba(90, 100, 220, 0.10)"
      />

      {/* Teal lower portion — the growth/chart area below the wave */}
      <path
        d={wavePath}
        fill="rgba(0, 229, 255, 0.12)"
      />

      {/* Wave outline — the actual Groww mountain contour */}
      <path
        d={[
          `M ${cx - orbRadius} ${cy + orbRadius * 0.18}`,
          `C ${cx - orbRadius * 0.72} ${cy + orbRadius * 0.18}`,
          `  ${cx - orbRadius * 0.58} ${cy - orbRadius * 0.08}`,
          `  ${cx - orbRadius * 0.22} ${cy - orbRadius * 0.08}`,
          `C ${cx + orbRadius * 0.02} ${cy - orbRadius * 0.08}`,
          `  ${cx + orbRadius * 0.18} ${cy + orbRadius * 0.10}`,
          `  ${cx + orbRadius * 0.38} ${cy + orbRadius * 0.04}`,
          `C ${cx + orbRadius * 0.55} ${cy - orbRadius * 0.04}`,
          `  ${cx + orbRadius * 0.68} ${cy - orbRadius * 0.52}`,
          `  ${cx + orbRadius} ${cy - orbRadius * 0.48}`,
        ].join(" ")}
        fill="none"
        stroke="rgba(0, 229, 255, 0.22)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/* ── Radial Waveform Ring ────────────────────────────────────── */
interface WaveformRingProps {
  audioLevel: number;
  state: AgentVisualState;
  cx: number; cy: number;
  orbRadius: number;
  phase: number;
}

function WaveformRing({ audioLevel, state, cx, cy, orbRadius, phase }: WaveformRingProps) {
  const active     = state === "LISTENING" || state === "SPEAKING";
  const ringRadius = orbRadius * (ORBIT_RADIUS_RATIO / 0.38);

  const bars = useMemo(() => (
    Array.from({ length: ORBIT_BARS }, (_, i) => {
      const angle     = (i / ORBIT_BARS) * 2 * Math.PI - Math.PI / 2;
      const sinOff    = Math.sin(phase + (i / ORBIT_BARS) * 2 * Math.PI * 2) * 0.5 + 0.5;
      const barHeight = BAR_BASE_H + audioLevel * BAR_MAX_H * sinOff;
      const pos       = polarToXY(angle, ringRadius, cx, cy);
      const rotDeg    = (i / ORBIT_BARS) * 360 - 90;
      return { barHeight, pos, rotDeg, i };
    })
  ), [audioLevel, phase, cx, cy, ringRadius]);

  return (
    <AnimatePresence>
      {active && (
        <motion.g
          key="waveform-ring"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {bars.map(({ barHeight, pos, rotDeg, i }) => (
            <rect
              key={i}
              x={pos.x - 1.5}
              y={pos.y - barHeight / 2}
              width={3}
              height={barHeight}
              rx={1.5}
              fill="var(--investor)"
              opacity={0.7 + audioLevel * 0.3}
              transform={`rotate(${rotDeg}, ${pos.x}, ${pos.y})`}
            />
          ))}
        </motion.g>
      )}
    </AnimatePresence>
  );
}

/* ── Scanner Arc ─────────────────────────────────────────────── */
function ScannerArc({ cx, cy, orbRadius }: { cx: number; cy: number; orbRadius: number }) {
  const r = orbRadius * (ORBIT_RADIUS_RATIO / 0.38);

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, rotate: 360 }}
      exit={{ opacity: 0 }}
      transition={{
        opacity: { duration: 0.1, delay: 0.1 },
        rotate: { duration: 0.6, repeat: Infinity, ease: "linear" },
      }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="url(#scanner-gradient)"
        strokeWidth={2}
        strokeDasharray={`${(r * 2 * Math.PI) / 4} ${(r * 2 * Math.PI * 3) / 4}`}
        strokeLinecap="round"
      />
      <circle
        cx={cx}
        cy={cy - r}
        r={3}
        fill="var(--investor)"
        opacity={0.9}
        style={{ filter: "blur(1px)" }}
      />
    </motion.g>
  );
}

/* ── HUD Brackets ────────────────────────────────────────────── */
function HUDBrackets({ cx, cy, size, themeContext }: { cx: number; cy: number; size: number; themeContext: string }) {
  const pad    = -14;
  const arm    = 20;
  const stroke = 1.5;
  const color  = "var(--ops)";
  const half   = size / 2;

  const corners = [
    { key: "tl", d: `M ${cx - half + arm + pad} ${cy - half + pad} L ${cx - half + pad} ${cy - half + pad} L ${cx - half + pad} ${cy - half + pad + arm}` },
    { key: "tr", d: `M ${cx + half - arm - pad} ${cy - half + pad} L ${cx + half - pad} ${cy - half + pad} L ${cx + half - pad} ${cy - half + pad + arm}` },
    { key: "bl", d: `M ${cx - half + arm + pad} ${cy + half - pad} L ${cx - half + pad} ${cy + half - pad} L ${cx - half + pad} ${cy + half - pad - arm}` },
    { key: "br", d: `M ${cx + half - arm - pad} ${cy + half - pad} L ${cx + half - pad} ${cy + half - pad} L ${cx + half - pad} ${cy + half - pad - arm}` },
  ];

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.4, ease: EASE }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    >
      {corners.map((c) => (
        <motion.path
          key={c.key}
          d={c.d}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="square"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <text
        x={cx}
        y={cy + size / 2 + 20}
        textAnchor="middle"
        style={{
          fontFamily:    "var(--font-hud)",
          fontSize:      "11px",
          fill:          "var(--ops)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {`> CONTEXT: ${themeContext.toUpperCase()}`}
      </text>
    </motion.g>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN AIORB COMPONENT
   ════════════════════════════════════════════════════════════════ */
export function AIOrb({
  state        = "IDLE",
  audioLevel   = 0,
  themeContext,
  size         = 200,
  ariaLabel    = "AI Voice Agent Orb",
}: AIOrbProps) {
  const orbRadius  = size * 0.38;       // ~76px for 200px size
  const svgPadX    = Math.round(size * SVG_PAD_X_RATIO); // ~116px
  const svgPadY    = 20;
  const svgWidth   = size + svgPadX * 2;
  const svgHeight  = size + svgPadY * 2;
  const svgCx      = svgWidth  / 2;
  const svgCy      = svgHeight / 2;
  const cfg        = STATE_CONFIG[state];

  const hasContext = Boolean(themeContext);
  const totalH     = svgHeight + (hasContext ? 28 : 0);

  /* RAF phase tick for radial waveform */
  const phaseRef = useRef(0);
  const rafRef   = useRef<number | null>(null);

  useEffect(() => {
    let last = 0;
    const loop = (ts: number) => {
      const dt       = (ts - last) / 1000;
      last           = ts;
      phaseRef.current = (phaseRef.current + dt * 3) % (2 * Math.PI);
      rafRef.current   = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const showSpeakPulse = state === "SPEAKING";
  const showScanner    = state === "THINKING";
  const showWaveform   = state === "LISTENING" || state === "SPEAKING";
  const CLIP_ID        = "groww-orb-clip";

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="flex flex-col items-center"
    >
      <svg
        width={svgWidth}
        height={totalH}
        viewBox={`0 0 ${svgWidth} ${totalH}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* ── Core sphere gradient ── */}
          <radialGradient id="orb-core-grad" cx="40%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#7FFCFF" stopOpacity={cfg.opacity} />
            <stop offset="45%"  stopColor="#00E5FF" stopOpacity={cfg.opacity * 0.85} />
            <stop offset="100%" stopColor="#0047AB" stopOpacity={cfg.opacity * 0.50} />
          </radialGradient>

          {/* ── Outer glow ── */}
          <radialGradient id="orb-glow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#00E5FF" stopOpacity={cfg.glowOpacity} />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
          </radialGradient>

          {/* ── Inner highlight ── */}
          <radialGradient id="orb-highlight" cx="30%" cy="25%" r="45%">
            <stop offset="0%"   stopColor="#FFFFFF" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0}    />
          </radialGradient>

          {/* ── Scanner arc gradient ── */}
          <linearGradient id="scanner-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#00E5FF" stopOpacity={0}   />
            <stop offset="60%"  stopColor="#00E5FF" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity={1}   />
          </linearGradient>

          {/* ── Glow blur filter ── */}
          <filter id="orb-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="20" />
          </filter>

          {/* ── Drop shadow ── */}
          <filter id="orb-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>

          {/* ── Groww logo clip path (circle = orb boundary) ── */}
          <clipPath id={CLIP_ID}>
            <circle cx={svgCx} cy={svgCy} r={orbRadius} />
          </clipPath>
        </defs>

        {/* ════════════════════════════════════
            LAYER 0 — Horizontal Voice Wave
            (behind everything, provides audio context)
            ════════════════════════════════════ */}
        <VoiceWave
          cx={svgCx}
          cy={svgCy}
          orbRadius={orbRadius}
          audioLevel={audioLevel}
          state={state}
        />

        {/* ════════════════════════════════════
            LAYER 1 — Plasma Ripple Rings
            ════════════════════════════════════ */}
        <PlasmaRipples
          cx={svgCx}
          cy={svgCy}
          orbRadius={orbRadius}
          state={state}
        />

        {/* ════════════════════════════════════
            LAYER 2 — Outer ambient glow halo
            ════════════════════════════════════ */}
        <motion.circle
          cx={svgCx}
          cy={svgCy}
          r={orbRadius * 1.8}
          fill="url(#orb-glow-grad)"
          filter="url(#orb-blur)"
          animate={{ opacity: [cfg.glowOpacity * 0.7, cfg.glowOpacity, cfg.glowOpacity * 0.7] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ════════════════════════════════════
            LAYER 3 — Radial waveform ring (LISTENING / SPEAKING)
            ════════════════════════════════════ */}
        <AnimatePresence>
          {showWaveform && (
            <WaveformRing
              key="radial-wave"
              audioLevel={audioLevel}
              state={state}
              cx={svgCx}
              cy={svgCy}
              orbRadius={orbRadius}
              phase={phaseRef.current}
            />
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════
            LAYER 4 — Scanner arc (THINKING)
            ════════════════════════════════════ */}
        <AnimatePresence>
          {showScanner && (
            <ScannerArc
              key="scanner"
              cx={svgCx}
              cy={svgCy}
              orbRadius={orbRadius}
            />
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════
            LAYER 5 — Speak pulse ring (SPEAKING)
            ════════════════════════════════════ */}
        <AnimatePresence>
          {showSpeakPulse && (
            <motion.circle
              key="speak-ring"
              cx={svgCx}
              cy={svgCy}
              r={orbRadius * 1.25}
              fill="none"
              stroke="var(--investor)"
              strokeWidth={1}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.65, 0.3], scale: [0.95, 1.06, 0.95] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════
            LAYER 6 — Idle dashed orbit (IDLE)
            ════════════════════════════════════ */}
        <AnimatePresence>
          {state === "IDLE" && (
            <motion.circle
              key="idle-ring"
              cx={svgCx}
              cy={svgCy}
              r={orbRadius * 1.14}
              fill="none"
              stroke="rgba(0,229,255,0.15)"
              strokeWidth={0.5}
              strokeDasharray="4 8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.4 },
                rotate:  { duration: 14, repeat: Infinity, ease: "linear" },
              }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════
            LAYER 7 — Core sphere
            (Groww shadow is inside this layer)
            ════════════════════════════════════ */}
        <motion.g
          animate={{ scale: cfg.scale, filter: cfg.coreFilter }}
          transition={{ duration: 0.4, ease: EASE }}
          style={{ transformOrigin: `${svgCx}px ${svgCy}px` }}
        >
          {/* Drop shadow */}
          <circle
            cx={svgCx}
            cy={svgCy + 8}
            r={orbRadius * 0.85}
            fill="rgba(0,0,0,0.4)"
            filter="url(#orb-shadow)"
          />

          {/* Main sphere fill */}
          <motion.circle
            cx={svgCx}
            cy={svgCy}
            r={orbRadius}
            fill="url(#orb-core-grad)"
            animate={
              state === "IDLE"
                ? { scale: [1, 1.014, 1] }
                : state === "SPEAKING"
                ? { scale: [0.9, 1.1, 0.9] }
                : { scale: 1 }
            }
            transition={
              state === "IDLE"
                ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
                : state === "SPEAKING"
                ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.4, ease: EASE }
            }
          />

          {/* ── Groww logo wave shadow ── */}
          <GrowwShadow
            cx={svgCx}
            cy={svgCy}
            orbRadius={orbRadius}
            clipId={CLIP_ID}
          />

          {/* Inner glass highlight */}
          <circle
            cx={svgCx}
            cy={svgCy}
            r={orbRadius}
            fill="url(#orb-highlight)"
          />

          {/* Listening — bright inner ring */}
          {state === "LISTENING" && (
            <motion.circle
              cx={svgCx}
              cy={svgCy}
              r={orbRadius * 0.68}
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
          )}
        </motion.g>

        {/* ════════════════════════════════════
            LAYER 8 — Amber HUD Brackets
            ════════════════════════════════════ */}
        <AnimatePresence>
          {hasContext && themeContext && (
            <HUDBrackets
              key="hud"
              cx={svgCx}
              cy={svgCy}
              size={size}
              themeContext={themeContext}
            />
          )}
        </AnimatePresence>
      </svg>

      {/* ── State readout label ── */}
      <div
        style={{
          fontFamily:    "var(--font-hud)",
          fontSize:      "10px",
          color:         "var(--text-tertiary)",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          marginTop:     "6px",
        }}
      >
        {state === "IDLE"      && <span style={{ color: "rgba(0,229,255,0.35)" }}>● STANDBY</span>}
        {state === "LISTENING" && (
          <motion.span
            style={{ color: "var(--investor)" }}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            ◉ LISTENING
          </motion.span>
        )}
        {state === "THINKING"  && (
          <motion.span
            style={{ color: "var(--ops)" }}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          >
            ◈ PROCESSING
          </motion.span>
        )}
        {state === "SPEAKING"  && (
          <motion.span
            style={{ color: "var(--investor)" }}
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 0.4, repeat: Infinity }}
          >
            ◉ SPEAKING
          </motion.span>
        )}
      </div>
    </div>
  );
}
