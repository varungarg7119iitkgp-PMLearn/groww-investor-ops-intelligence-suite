"use client";

import { useReducedMotion } from "framer-motion";

/**
 * AuroraMesh — 4-layer cinematic dark background
 *
 * Layer stack (bottom → top):
 *  1. Base plate  #030508 (set on <body>)
 *  2. Orb 1       Deep Violet #7C3AED — top-left, 40vw, 15% opacity, blur(140px)
 *  3. Orb 2       Emerald    #10B981 — bottom-right, 50vw, 12% opacity, blur(160px)
 *  4. Grid overlay SVG schematic lines rgba(0,229,255,0.05)
 *  5. Noise texture SVG grain 15% opacity, blend: overlay
 *
 * Source: UI/UX Spec §2.1 The Canvas
 */
export function AuroraMesh() {
  const prefersReduced = useReducedMotion();

  return (
    <div
      className="aurora-root"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Orb 1 — Deep Violet, top-left atmosphere */}
      <div
        className="aurora-orb-1"
        style={{
          position: "absolute",
          width: "40vw",
          height: "40vw",
          left: "-10vw",
          top: "-10vw",
          borderRadius: "50%",
          background: "#7C3AED",
          opacity: prefersReduced ? 0 : 0.15,
          filter: "blur(140px)",
          willChange: "transform",
          transition: "opacity 600ms ease",
        }}
      />

      {/* Orb 2 — Emerald, bottom-right atmosphere */}
      <div
        className="aurora-orb-2"
        style={{
          position: "absolute",
          width: "50vw",
          height: "50vw",
          right: "-15vw",
          bottom: "-15vw",
          borderRadius: "50%",
          background: "#10B981",
          opacity: prefersReduced ? 0 : 0.12,
          filter: "blur(160px)",
          willChange: "transform",
          transition: "opacity 600ms ease",
        }}
      />

      {/* Grid overlay — schematic cyan grid lines */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: prefersReduced ? 0 : 1,
        }}
      >
        <defs>
          <pattern
            id="hud-grid"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="rgba(0,229,255,0.05)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hud-grid)" />
      </svg>

      {/* Noise texture — grain overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/noise-texture.svg)",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          opacity: prefersReduced ? 0 : 0.15,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
