/**
 * InputBar — Phase 4: Investor Terminal UI Shell
 *
 * Pill-shaped chat input with mic toggle and send button.
 * Spec: UI/UX §5.4 Input Bar.
 *
 * - Height: 52px, border-radius: 26px (pill shape)
 * - Glass Panel darker variant background
 * - Placeholder: "Ask about any of the 20 mutual funds..." (Mono, 13px)
 * - Mic toggle: right side, circular 36px, cyan glow when active
 * - Send button: appears only when text is present, arrow icon, neumorphic
 * - Compliance footer: "This is informational and not investment advice."
 * - Keyboard: Enter submits, Shift+Enter newline (if expanded)
 */

"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Icons (inline SVG, no external deps) ───────────────────── */
function MicIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="9" y="2"
        width="6" height="11"
        rx="3"
        fill={active ? "var(--investor)" : "currentColor"}
        opacity={active ? 1 : 0.6}
      />
      <path
        d="M5 11a7 7 0 0 0 14 0"
        stroke={active ? "var(--investor)" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity={active ? 1 : 0.6}
      />
      <line
        x1="12" y1="18"
        x2="12" y2="22"
        stroke={active ? "var(--investor)" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={active ? 1 : 0.6}
      />
      <line
        x1="9" y1="22"
        x2="15" y2="22"
        stroke={active ? "var(--investor)" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={active ? 1 : 0.6}
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 2L11 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8"  y1="2" x2="8"  y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3"  y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="8"  cy="16" r="1.2" fill="currentColor" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" />
      <circle cx="16" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}

/* ── InputBar Props ─────────────────────────────────────────── */
interface InputBarProps {
  /** Called when the user submits a query */
  onSubmit?: (text: string) => void;
  /** Called when mic button is toggled */
  onMicToggle?: (active: boolean) => void;
  /** Called when the Meet / Book Advisor button is clicked */
  onBookingClick?: () => void;
  /** Whether the mic is currently active */
  isMicActive?: boolean;
  /** Disable the input (e.g. while waiting for a response) */
  disabled?: boolean;
  /** Pre-filled value (e.g. from clicking a ticker item) */
  prefillValue?: string;
}

/* ── Main InputBar component ────────────────────────────────── */
export function InputBar({
  onSubmit,
  onMicToggle,
  onBookingClick,
  isMicActive  = false,
  disabled     = false,
  prefillValue = "",
}: InputBarProps) {
  const [value, setValue] = useState(prefillValue);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit?.(trimmed);
    setValue("");
  }, [value, disabled, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleMicClick = () => {
    onMicToggle?.(!isMicActive);
  };

  const hasText = value.trim().length > 0;

  return (
    <div
      style={{
        width:    "100%",
        maxWidth: "100%",
        display:  "flex",
        flexDirection: "column",
        gap:      "8px",
      }}
    >
      {/* ── Pill-shaped input container ── */}
      <motion.div
        animate={{
          boxShadow: focused
            ? "0 0 0 1px rgba(0,229,255,0.4), 0 0 20px rgba(0,229,255,0.12)"
            : "0 0 0 1px rgba(0,229,255,0.12), 0 4px 20px rgba(0,0,0,0.3)",
        }}
        transition={{ duration: 0.2 }}
        style={{
          display:      "flex",
          alignItems:   "center",
          height:       "52px",
          borderRadius: "26px",
          background:   "rgba(8, 12, 24, 0.75)",
          border:       `1px solid ${focused ? "rgba(0,229,255,0.35)" : "rgba(0,229,255,0.15)"}`,
          backdropFilter: "blur(20px)",
          padding:      "0 8px 0 20px",
          gap:          "8px",
          transition:   "border-color 0.2s ease",
        }}
      >
        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask about any of the 20 mutual funds..."
          disabled={disabled}
          aria-label="Chat input"
          style={{
            flex:        1,
            background:  "none",
            border:      "none",
            outline:     "none",
            fontFamily:  "var(--font-hud)",
            fontSize:    "13px",
            color:       "var(--text-primary)",
            lineHeight:  1,
            opacity:     disabled ? 0.5 : 1,
            cursor:      disabled ? "not-allowed" : "text",
          }}
        />

        {/* Send button — appears only when text is present */}
        <AnimatePresence>
          {hasText && !disabled && (
            <motion.button
              key="send-btn"
              type="button"
              onClick={handleSubmit}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Send message"
              className="neu-btn"
              style={{
                width:        "36px",
                height:       "36px",
                borderRadius: "50%",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                color:        "var(--investor)",
                flexShrink:   0,
                cursor:       "pointer",
              }}
            >
              <SendIcon />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Meet / Book Advisor button */}
        {onBookingClick && (
          <motion.button
            type="button"
            onClick={onBookingClick}
            disabled={disabled}
            whileTap={{ scale: 0.9 }}
            aria-label="Book advisor appointment"
            data-testid="booking-coming-soon"
            style={{
              height:        "36px",
              borderRadius:  "18px",
              display:       "flex",
              alignItems:    "center",
              justifyContent: "center",
              gap:           "5px",
              padding:       "0 12px",
              background:    "rgba(255,171,0,0.10)",
              border:        "1px solid rgba(255,171,0,0.45)",
              boxShadow:     "0 0 10px rgba(255,171,0,0.15)",
              color:         "var(--color-ops)",
              flexShrink:    0,
              cursor:        disabled ? "not-allowed" : "pointer",
              opacity:       disabled ? 0.5 : 1,
              transition:    "all 0.2s ease",
              outline:       "none",
              fontFamily:    "var(--font-hud)",
              fontSize:      "10px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              whiteSpace:    "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.background = "rgba(255,171,0,0.20)";
                e.currentTarget.style.boxShadow  = "0 0 18px rgba(255,171,0,0.30)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,171,0,0.10)";
              e.currentTarget.style.boxShadow  = "0 0 10px rgba(255,171,0,0.15)";
            }}
          >
            <CalendarIcon />
            MEET
          </motion.button>
        )}

        {/* Mic toggle button */}
        <motion.button
          type="button"
          onClick={handleMicClick}
          disabled={disabled}
          whileTap={{ scale: 0.9 }}
          aria-label={isMicActive ? "Stop voice input" : "Start voice input"}
          aria-pressed={isMicActive}
          style={{
            width:        "36px",
            height:       "36px",
            borderRadius: "50%",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            background:   isMicActive ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.04)",
            border:       `1px solid ${isMicActive ? "rgba(0,229,255,0.5)" : "rgba(255,255,255,0.08)"}`,
            boxShadow:    isMicActive ? "0 0 12px rgba(0,229,255,0.35)" : "none",
            color:        isMicActive ? "var(--investor)" : "var(--text-secondary)",
            flexShrink:   0,
            cursor:       disabled ? "not-allowed" : "pointer",
            opacity:      disabled ? 0.5 : 1,
            transition:   "all 0.2s ease",
            outline:      "none",
          }}
        >
          {/* Mic pulse ring when active */}
          {isMicActive && (
            <motion.span
              style={{
                position:     "absolute",
                width:        "36px",
                height:       "36px",
                borderRadius: "50%",
                border:       "1px solid rgba(0,229,255,0.6)",
                pointerEvents: "none",
              }}
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <MicIcon active={isMicActive} />
        </motion.button>
      </motion.div>

      {/* ── Compliance footer ── */}
      <p
        style={{
          textAlign:   "center",
          fontFamily:  "var(--font-body)",
          fontSize:    "11px",
          color:       "var(--text-disabled)",
          lineHeight:  1.4,
          padding:     "0 8px",
          userSelect:  "none",
        }}
        aria-label="Compliance disclaimer"
      >
        This is informational and not investment advice.
      </p>
    </div>
  );
}
