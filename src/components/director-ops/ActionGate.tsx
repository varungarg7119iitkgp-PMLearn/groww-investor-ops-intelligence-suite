/**
 * ActionGate — Phase 5: Director Ops
 *
 * Pair of neumorphic buttons that gate every AI-generated action.
 * Authorize → emerald flash glow (200ms) on click
 * Override  → crimson flash glow (200ms) + inline "Are you sure?" confirm
 *
 * Implements the Human-in-the-Loop pattern (Req 4).
 *
 * Spec: UI/UX §6.3 "Action Gate Buttons"
 */

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ActionGateProps {
  onAuthorize?: () => void;
  onOverride?: (reason?: string) => void;
  disabled?: boolean;
  authorizeLabel?: string;
  overrideLabel?: string;
}

type FlashColor = "emerald" | "crimson" | null;

export function ActionGate({
  onAuthorize,
  onOverride,
  disabled        = false,
  authorizeLabel  = "AUTHORIZE",
  overrideLabel   = "OVERRIDE",
}: ActionGateProps) {
  const [flash,          setFlash]          = useState<FlashColor>(null);
  const [confirmOverride, setConfirmOverride] = useState(false);

  const triggerFlash = useCallback((color: FlashColor) => {
    setFlash(color);
    window.setTimeout(() => setFlash(null), 220);
  }, []);

  const handleAuthorize = useCallback(() => {
    if (disabled) return;
    triggerFlash("emerald");
    onAuthorize?.();
  }, [disabled, onAuthorize, triggerFlash]);

  const handleOverrideClick = useCallback(() => {
    if (disabled) return;
    if (!confirmOverride) {
      setConfirmOverride(true);
      window.setTimeout(() => setConfirmOverride(false), 4000);
      return;
    }
    triggerFlash("crimson");
    onOverride?.();
    setConfirmOverride(false);
  }, [disabled, confirmOverride, onOverride, triggerFlash]);

  return (
    <div data-testid="action-gate" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div
        style={{
          display:      "grid",
          gridTemplateColumns: "1fr 1fr",
          gap:          "10px",
        }}
      >
        {/* ── Authorize Button ── */}
        <motion.button
          type="button"
          data-testid="action-authorize"
          onClick={handleAuthorize}
          disabled={disabled}
          whileTap={disabled ? undefined : { scale: 0.97 }}
          animate={
            flash === "emerald"
              ? { boxShadow: "0 0 24px rgba(16, 185, 129, 0.85), inset 0 0 16px rgba(16, 185, 129, 0.4)" }
              : { boxShadow: "0 0 0 rgba(16, 185, 129, 0)" }
          }
          transition={{ duration: 0.2 }}
          style={{
            padding:      "12px 14px",
            borderRadius: "10px",
            background:   "var(--neu-bg, #0F1B2A)",
            border:       "1px solid rgba(16, 185, 129, 0.4)",
            color:        disabled ? "var(--text-disabled)" : "var(--color-success)",
            fontFamily:   "var(--font-display)",
            fontSize:     "13px",
            fontWeight:   600,
            letterSpacing: "0.1em",
            cursor:       disabled ? "not-allowed" : "pointer",
            boxShadow:    disabled
              ? "none"
              : "var(--neu-shadow-outer, 4px 4px 12px #000, -2px -2px 8px #1a2434)",
            transition:   "color 0.2s ease",
          }}
        >
          ✓ {authorizeLabel}
        </motion.button>

        {/* ── Override Button ── */}
        <motion.button
          type="button"
          data-testid="action-override"
          onClick={handleOverrideClick}
          disabled={disabled}
          whileTap={disabled ? undefined : { scale: 0.97 }}
          animate={
            flash === "crimson"
              ? { boxShadow: "0 0 24px rgba(239, 68, 68, 0.85), inset 0 0 16px rgba(239, 68, 68, 0.4)" }
              : confirmOverride
              ? { boxShadow: "0 0 14px rgba(239, 68, 68, 0.45)" }
              : { boxShadow: "0 0 0 rgba(239, 68, 68, 0)" }
          }
          transition={{ duration: 0.2 }}
          style={{
            padding:      "12px 14px",
            borderRadius: "10px",
            background:   confirmOverride ? "rgba(239, 68, 68, 0.10)" : "var(--neu-bg, #0F1B2A)",
            border:       "1px solid rgba(239, 68, 68, 0.4)",
            color:        disabled ? "var(--text-disabled)" : "var(--color-error)",
            fontFamily:   "var(--font-display)",
            fontSize:     "13px",
            fontWeight:   600,
            letterSpacing: "0.1em",
            cursor:       disabled ? "not-allowed" : "pointer",
            boxShadow:    disabled
              ? "none"
              : "var(--neu-shadow-outer, 4px 4px 12px #000, -2px -2px 8px #1a2434)",
            transition:   "color 0.2s ease",
          }}
        >
          ✗ {confirmOverride ? "CONFIRM?" : overrideLabel}
        </motion.button>
      </div>

      {/* ── Confirm hint ── */}
      <AnimatePresence>
        {confirmOverride && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            data-testid="override-confirm-hint"
            role="alert"
            style={{
              fontFamily: "var(--font-hud)",
              fontSize:   "11px",
              color:      "var(--color-error)",
              letterSpacing: "0.05em",
              textAlign:  "center",
              padding:    "4px 0",
            }}
          >
            Click OVERRIDE again within 4s to confirm rejection.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
