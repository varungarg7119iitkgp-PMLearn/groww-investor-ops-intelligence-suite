/**
 * ModeToggle — Phase 6 (Mode Switcher & Global Navigation)
 *
 * Neumorphic 2-segment toggle pill that drives the global `activeMode`
 * in the Zustand store.
 *
 * Spec compliance:
 *   - UI/UX §4.1: 420px wide, 52px tall, neumorphic raised state,
 *     sliding pill indicator, mode-specific glow.
 *   - UI/UX §4.2: hover brightens inactive label; transition 400ms
 *     scanning-line sweep + pill slide.
 *   - UI/UX §10.2 + §10.3: role="tablist", each side role="tab",
 *     aria-selected, Arrow-Left/Right + Home/End + Enter/Space.
 *   - Req 1 acc-criteria #1: exactly two labels.
 *   - Req 1 acc-criteria #6: state preservation (delegated to store).
 *
 * Visual layers (z-order, low → high):
 *   1. Neumorphic raised pill base
 *   2. Sliding indicator (glow + colored border, slides 0% ↔ 100%)
 *   3. Two label buttons (left = INVESTOR, right = DIRECTOR)
 */

"use client";

import { forwardRef, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { pillVariant } from "@/lib/animations";
import { useUIStore } from "@/lib/store";

export interface ModeToggleProps {
  /** Optional className for layout-level styling */
  className?: string;
  /** Optional override for the desktop width — default 420px (UI/UX §4.1) */
  widthPx?: number;
}

const HEIGHT_PX = 52;
const PILL_PADDING_PX = 4;

export function ModeToggle({ className, widthPx = 420 }: ModeToggleProps) {
  const activeMode      = useUIStore((s) => s.activeMode);
  const isTransitioning = useUIStore((s) => s.isTransitioning);
  const toggleMode      = useUIStore((s) => s.toggleMode);
  const setActiveMode   = useUIStore((s) => s.setActiveMode);

  const investorTabRef = useRef<HTMLButtonElement | null>(null);
  const directorTabRef = useRef<HTMLButtonElement | null>(null);

  const isInvestor = activeMode === "investor-terminal";
  const accentVar  = isInvestor ? "var(--color-investor)" : "var(--color-ops)";

  /* ── Keyboard handler (UI/UX §10.2) ───────────────────────── */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowLeft":
      case "Home":
        event.preventDefault();
        if (!isInvestor) {
          setActiveMode("investor-terminal");
          investorTabRef.current?.focus();
        }
        break;
      case "ArrowRight":
      case "End":
        event.preventDefault();
        if (isInvestor) {
          setActiveMode("director-ops");
          directorTabRef.current?.focus();
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        toggleMode();
        break;
    }
  };

  /* When mode changes externally, ensure focus moves to the active tab */
  useEffect(() => {
    /* Don't steal focus on first paint — only react after the user
       has interacted via toggleMode/setActiveMode (i.e. document.activeElement
       is one of our tabs). */
    const active = typeof document !== "undefined" ? document.activeElement : null;
    if (active === investorTabRef.current || active === directorTabRef.current) {
      (isInvestor ? investorTabRef : directorTabRef).current?.focus();
    }
  }, [isInvestor]);

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div
      data-testid="mode-toggle"
      role="tablist"
      aria-label="Application mode switcher"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={className}
      style={{
        position:       "relative",
        width:          `${widthPx}px`,
        height:         `${HEIGHT_PX}px`,
        borderRadius:   "999px",
        padding:        `${PILL_PADDING_PX}px`,
        display:        "grid",
        gridTemplateColumns: "1fr 1fr",
        alignItems:     "stretch",
        background:     "linear-gradient(145deg, rgba(20, 26, 38, 0.92), rgba(10, 14, 22, 0.92))",
        boxShadow:
          "inset 4px 4px 10px rgba(0,0,0,0.55), " +
          "inset -3px -3px 8px rgba(255,255,255,0.04), " +
          `0 0 24px ${isInvestor ? "rgba(0, 229, 255, 0.18)" : "rgba(255, 171, 0, 0.18)"}`,
        border:         "1px solid rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        userSelect:     "none",
      }}
    >
      {/* ── Sliding indicator ── */}
      <motion.div
        data-testid="mode-toggle-indicator"
        aria-hidden
        variants={pillVariant}
        initial={false}
        animate={isInvestor ? "investor" : "director"}
        style={{
          position:     "absolute",
          top:          `${PILL_PADDING_PX}px`,
          left:         `${PILL_PADDING_PX}px`,
          width:        `calc(50% - ${PILL_PADDING_PX}px)`,
          height:       `calc(100% - ${PILL_PADDING_PX * 2}px)`,
          borderRadius: "999px",
          background:
            isInvestor
              ? "linear-gradient(135deg, rgba(0, 229, 255, 0.18), rgba(0, 229, 255, 0.04))"
              : "linear-gradient(135deg, rgba(255, 171, 0, 0.18), rgba(255, 171, 0, 0.04))",
          border: `1px solid ${accentVar}`,
          boxShadow:
            isInvestor
              ? "0 0 16px rgba(0, 229, 255, 0.55), inset 0 0 8px rgba(0, 229, 255, 0.25)"
              : "0 0 16px rgba(255, 171, 0, 0.55), inset 0 0 8px rgba(255, 171, 0, 0.25)",
          pointerEvents: "none",
          zIndex:        1,
        }}
      />

      {/* ── INVESTOR TERMINAL tab ── */}
      <ModeTab
        ref={investorTabRef}
        id="mode-tab-investor"
        testId="mode-tab-investor"
        label="INVESTOR TERMINAL"
        isActive={isInvestor}
        accentColor="var(--color-investor)"
        disabled={isTransitioning}
        onActivate={() => {
          if (!isInvestor) toggleMode();
        }}
      />

      {/* ── DIRECTOR OPS tab ── */}
      <ModeTab
        ref={directorTabRef}
        id="mode-tab-director"
        testId="mode-tab-director"
        label="DIRECTOR OPS"
        isActive={!isInvestor}
        accentColor="var(--color-ops)"
        disabled={isTransitioning}
        onActivate={() => {
          if (isInvestor) toggleMode();
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Internal: ModeTab — single tab button
   ───────────────────────────────────────────────────────────── */

interface ModeTabProps {
  id:          string;
  testId:      string;
  label:       string;
  isActive:    boolean;
  accentColor: string;
  disabled:    boolean;
  onActivate:  () => void;
}

const ModeTab = forwardRef<HTMLButtonElement, ModeTabProps>(function ModeTab(
  { id, testId, label, isActive, accentColor, disabled, onActivate },
  ref,
) {
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={isActive ? "mode-panel-active" : undefined}
      tabIndex={isActive ? 0 : -1}
      data-testid={testId}
      disabled={disabled}
      onClick={disabled ? undefined : onActivate}
      style={{
        position:       "relative",
        zIndex:         2,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "6px",
        background:     "transparent",
        border:         "none",
        cursor:         disabled ? "wait" : isActive ? "default" : "pointer",
        color:          isActive ? accentColor : "var(--text-disabled)",
        fontFamily:     "var(--font-display)",
        fontSize:       "13px",
        fontWeight:     600,
        letterSpacing:  "0.08em",
        textTransform:  "uppercase",
        opacity:        disabled && !isActive ? 0.4 : 1,
        transition:     "color 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        outline:        "none",
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
      onMouseEnter={(e) => {
        if (!isActive && !disabled) {
          e.currentTarget.style.color = "var(--text-muted)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive && !disabled) {
          e.currentTarget.style.color = "var(--text-disabled)";
        }
      }}
    >
      {label}
    </button>
  );
});
