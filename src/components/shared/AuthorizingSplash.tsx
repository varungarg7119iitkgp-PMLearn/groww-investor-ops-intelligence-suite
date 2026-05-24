/**
 * AuthorizingSplash — Phase 5 Enhancement
 *
 * Full-screen cinematic clearance overlay shown when the operator
 * transitions from the Investor Terminal into the Director Ops console.
 *
 * Visual treatment:
 *   - Black backdrop with subtle amber radial gradient
 *   - HUD scan grid (CSS background)
 *   - Sequenced text lines ("INITIALIZING SECURE CHANNEL", …)
 *   - Progress bar that fills 0 → 100%
 *   - Auto-fades after `durationMs` (default 1800ms)
 *
 * Usage:
 *   <AuthorizingSplash open={authing} onComplete={() => router.push("/director-ops")} />
 */

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AuthorizingSplashProps {
  open: boolean;
  durationMs?: number;
  onComplete?: () => void;
  /** Subtitle below the heading; defaults to "DIRECTOR OPS CONSOLE" */
  destinationLabel?: string;
}

const STEP_MESSAGES = [
  "INITIALIZING SECURE CHANNEL",
  "VERIFYING OPERATOR CLEARANCE",
  "DECRYPTING OPS CONSOLE",
  "WELCOME, DIRECTOR",
];

export function AuthorizingSplash({
  open,
  durationMs       = 1800,
  onComplete,
  destinationLabel = "DIRECTOR OPS CONSOLE",
}: AuthorizingSplashProps) {
  const [stepIdx, setStepIdx]       = useState(0);
  const [channelId, setChannelId]   = useState("0000");

  useEffect(() => {
    if (!open) {
      setStepIdx(0);
      return;
    }
    setChannelId(String(Math.floor(Math.random() * 9000 + 1000)));

    const perStep = durationMs / STEP_MESSAGES.length;
    const interval = window.setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, STEP_MESSAGES.length - 1));
    }, perStep);

    const completeTimer = window.setTimeout(() => {
      onComplete?.();
    }, durationMs);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(completeTimer);
    };
  }, [open, durationMs, onComplete]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="auth-splash"
          data-testid="authorizing-splash"
          role="alertdialog"
          aria-live="assertive"
          aria-label="Authorizing access to Director Ops"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         9999,
            background:     "radial-gradient(ellipse at 50% 45%, rgba(255,171,0,0.10) 0%, rgba(3,5,8,0.62) 55%, rgba(3,5,8,0.78) 100%)",
            /* Freeze + blur the underlying view so background motion stops being distracting */
            backdropFilter:        "blur(14px) saturate(0.55) brightness(0.7)",
            WebkitBackdropFilter:  "blur(14px) saturate(0.55) brightness(0.7)",
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "32px",
            padding:        "0 24px",
          }}
        >
          {/* ── HUD grid backdrop ── */}
          <div
            aria-hidden
            style={{
              position:    "absolute",
              inset:       0,
              opacity:     0.18,
              background: `
                linear-gradient(rgba(255, 171, 0, 0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 171, 0, 0.06) 1px, transparent 1px)
              `,
              backgroundSize: "48px 48px",
              pointerEvents:  "none",
            }}
          />

          {/* ── Scanning sweep line ── */}
          <motion.div
            aria-hidden
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: durationMs / 1000, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              top:      "0",
              left:     "0",
              right:    "0",
              height:   "100%",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,171,0,0.0) 40%, rgba(255,171,0,0.25) 50%, rgba(255,171,0,0.0) 60%, transparent 100%)",
              pointerEvents: "none",
            }}
          />

          {/* ── Outer ring (rotating) ── */}
          <motion.div
            data-testid="auth-rotor"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{
              width:        "140px",
              height:       "140px",
              borderRadius: "50%",
              border:       "2px dashed rgba(255, 171, 0, 0.6)",
              borderTopColor:  "rgba(255, 171, 0, 1)",
              boxShadow:    "0 0 30px rgba(255, 171, 0, 0.3), inset 0 0 30px rgba(255, 171, 0, 0.1)",
              position:     "relative",
              zIndex:       2,
            }}
          >
            {/* Inner pulsing core */}
            <motion.div
              animate={{
                scale:   [1, 1.12, 1],
                opacity: [0.5, 0.9, 0.5],
              }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position:     "absolute",
                top:          "50%",
                left:         "50%",
                width:        "56px",
                height:       "56px",
                marginTop:    "-28px",
                marginLeft:   "-28px",
                borderRadius: "50%",
                background:   "radial-gradient(circle, rgba(255,171,0,0.6) 0%, rgba(255,171,0,0.15) 60%, transparent 80%)",
              }}
            />
            {/* Lock glyph */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(0deg)",
                fontSize: "28px",
                color: "var(--color-ops)",
                textShadow: "0 0 12px rgba(255, 171, 0, 0.8)",
              }}
            >
              ◈
            </div>
          </motion.div>

          {/* ── Heading ── */}
          <div style={{ textAlign: "center", zIndex: 2 }}>
            <div
              style={{
                fontFamily:    "var(--font-hud)",
                fontSize:      "12px",
                color:         "var(--color-ops)",
                letterSpacing: "0.4em",
                opacity:       0.7,
                marginBottom:  "8px",
              }}
            >
              ACCESS REQUEST
            </div>
            <h1
              style={{
                fontFamily:    "var(--font-display)",
                fontSize:      "28px",
                fontWeight:    700,
                color:         "var(--text-main)",
                letterSpacing: "0.18em",
                margin:        0,
                textShadow:    "0 0 18px rgba(255, 171, 0, 0.4)",
              }}
            >
              {destinationLabel}
            </h1>
          </div>

          {/* ── Stepped status messages ── */}
          <div
            data-testid="auth-status"
            style={{
              minHeight:     "32px",
              minWidth:      "360px",
              maxWidth:      "90vw",
              textAlign:     "center",
              fontFamily:    "var(--font-hud)",
              fontSize:      "13px",
              color:         "var(--color-ops)",
              letterSpacing: "0.18em",
              zIndex:        2,
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                {">"} {STEP_MESSAGES[stepIdx]}
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                >
                  _
                </motion.span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Progress bar ── */}
          <div
            data-testid="auth-progress-track"
            style={{
              width:        "320px",
              maxWidth:     "80vw",
              height:       "4px",
              borderRadius: "2px",
              background:   "rgba(255, 171, 0, 0.12)",
              overflow:     "hidden",
              zIndex:       2,
            }}
          >
            <motion.div
              data-testid="auth-progress-bar"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: durationMs / 1000, ease: "easeOut" }}
              style={{
                height:     "100%",
                background: "linear-gradient(90deg, var(--color-ops), #FFD27A)",
                boxShadow:  "0 0 12px rgba(255, 171, 0, 0.7)",
              }}
            />
          </div>

          {/* ── Trace info readout (bottom corner) ── */}
          <div
            style={{
              position:      "absolute",
              bottom:        "24px",
              left:          "50%",
              transform:     "translateX(-50%)",
              fontFamily:    "var(--font-hud)",
              fontSize:      "10px",
              color:         "rgba(255, 171, 0, 0.4)",
              letterSpacing: "0.2em",
              zIndex:        2,
            }}
          >
            CHANNEL_ID: NL-OPS-{channelId} · ENCRYPTED · TLS_1.3
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
