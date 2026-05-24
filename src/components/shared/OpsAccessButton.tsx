/**
 * OpsAccessButton — Phase 5 Enhancement
 *
 * Premium CTA that links from the Investor Terminal to the Director Ops
 * console. Triggers a cinematic AuthorizingSplash before navigation.
 *
 * Visual: amber shield icon + bold "DIRECTOR OPS" label + chevron icon,
 * inside a neumorphic-style pill with subtle ambient glow.
 */

"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AuthorizingSplash } from "@/components/shared/AuthorizingSplash";
import { useUIStore } from "@/lib/store";

interface OpsAccessButtonProps {
  /** Optional href fallback (kept for backwards compatibility with tests / deep-links) */
  href?:        string;
  splashMs?:    number;
  label?:       string;
}

/* Inline SVG icons (no extra deps) */
const ShieldIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 2.5 4 5.5v6c0 4.6 3.2 8.9 8 10 4.8-1.1 8-5.4 8-10v-6L12 2.5Z"
      fill="rgba(255, 171, 0, 0.18)"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="m9 12 2.2 2.2L15.5 10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const ChevronIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="m9 6 6 6-6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SparkleIcon = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 2v6m0 8v6M2 12h6m8 0h6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export function OpsAccessButton({
  href: _href = "/director-ops",
  splashMs    = 1800,
  label       = "DIRECTOR OPS",
}: OpsAccessButtonProps) {
  const setActiveMode = useUIStore((s) => s.setActiveMode);
  const activeMode    = useUIStore((s) => s.activeMode);
  const [authing, setAuthing] = useState(false);
  /* `href` retained for prop-API compatibility but no router is used in Phase 6+ */
  void _href;

  const handleClick = useCallback(() => {
    if (authing) return;
    if (activeMode === "director-ops") return; // already there — no-op
    setAuthing(true);
  }, [authing, activeMode]);

  const handleSplashComplete = useCallback(() => {
    setActiveMode("director-ops");
    setAuthing(false);
  }, [setActiveMode]);

  return (
    <>
      {/* Floating vertical right-edge tab — pinned to viewport */}
      <motion.button
        type="button"
        onClick={handleClick}
        data-testid="ops-access-button"
        aria-label="Open Director Ops console"
        disabled={authing}
        initial={{ x: 6, opacity: 0 }}
        animate={
          authing
            ? { x: 0, opacity: 1, boxShadow: "0 0 32px rgba(255, 171, 0, 0.7)" }
            : { x: 0, opacity: 1, boxShadow: "0 0 18px rgba(255, 171, 0, 0.35)" }
        }
        whileHover={authing ? undefined : { x: -4 }}
        whileTap={authing ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position:       "fixed",
          right:          0,
          top:            "50%",
          transform:      "translateY(-50%)",
          zIndex:         30,
          display:        "inline-flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          gap:            "10px",
          padding:        "16px 8px 14px",
          width:          "44px",
          minHeight:      "180px",
          borderTopLeftRadius:    "14px",
          borderBottomLeftRadius: "14px",
          borderTopRightRadius:    0,
          borderBottomRightRadius: 0,
          background:     "linear-gradient(135deg, rgba(255, 171, 0, 0.14) 0%, rgba(255, 171, 0, 0.04) 100%)",
          border:         "1px solid rgba(255, 171, 0, 0.55)",
          borderRight:    "none",
          color:          "var(--color-ops)",
          fontFamily:     "var(--font-hud)",
          fontSize:       "11px",
          fontWeight:     700,
          letterSpacing:  "0.22em",
          cursor:         authing ? "wait" : "pointer",
          backdropFilter: "blur(10px) saturate(1.1)",
          WebkitBackdropFilter: "blur(10px) saturate(1.1)",
        }}
      >
        {/* Shield icon (top) */}
        <ShieldIcon size={16} />

        {/* Vertical label (rotated so it reads bottom-to-top) */}
        <span
          style={{
            writingMode:   "vertical-rl",
            transform:     "rotate(180deg)",
            fontFamily:    "var(--font-hud)",
            fontSize:      "11px",
            fontWeight:    700,
            letterSpacing: "0.32em",
            lineHeight:    1,
            padding:       "4px 0",
            color:         "var(--color-ops)",
            textShadow:    "0 0 12px rgba(255, 171, 0, 0.55)",
          }}
        >
          {label}
        </span>

        {/* Chevron (bottom) */}
        <ChevronIcon size={12} />

        {/* Pulsing indicator on the inner edge */}
        <motion.span
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position:     "absolute",
            top:          "8px",
            left:         "-4px",
            width:        "8px",
            height:       "8px",
            borderRadius: "50%",
            background:   "var(--color-ops)",
            boxShadow:    "0 0 8px rgba(255, 171, 0, 0.9)",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            color:        "var(--void-bg)",
          }}
        >
          <SparkleIcon size={6} />
        </motion.span>
      </motion.button>

      <AuthorizingSplash
        open={authing}
        durationMs={splashMs}
        onComplete={handleSplashComplete}
      />
    </>
  );
}
