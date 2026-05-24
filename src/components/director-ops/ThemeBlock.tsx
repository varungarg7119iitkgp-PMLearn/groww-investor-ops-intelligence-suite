/**
 * ThemeBlock — Phase 5: Director Ops
 *
 * Individual theme card from the Weekly Pulse.
 * Top 3 themes get a stronger amber glow (`--glow-amber`).
 *
 * Spec: UI/UX §6.2 Theme Blocks
 */

"use client";

import { motion } from "framer-motion";
import type { PulseTheme } from "@/types";

interface ThemeBlockProps {
  theme: PulseTheme;
  index?: number;
  onClick?: (themeName: string) => void;
}

const SENTIMENT_GLYPH: Record<PulseTheme["sentiment"], string> = {
  positive: "▲",
  negative: "▼",
  neutral:  "■",
};

const SENTIMENT_COLOR: Record<PulseTheme["sentiment"], string> = {
  positive: "var(--color-success)",
  negative: "var(--color-error)",
  neutral:  "var(--text-muted)",
};

export function ThemeBlock({ theme, index = 0, onClick }: ThemeBlockProps) {
  const ambient = theme.isTopThree
    ? {
        boxShadow:   "0 0 16px rgba(255, 171, 0, 0.25), inset 0 0 12px rgba(255, 171, 0, 0.06)",
        borderColor: "rgba(255, 171, 0, 0.42)",
      }
    : {
        boxShadow:   "0 0 0 rgba(255, 171, 0, 0)",
        borderColor: "rgba(255, 171, 0, 0.18)",
      };

  return (
    <motion.button
      type="button"
      data-testid="theme-block"
      data-top-three={theme.isTopThree ? "true" : "false"}
      onClick={() => onClick?.(theme.name)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            "12px",
        width:          "100%",
        padding:        "10px 14px",
        borderRadius:   "12px",
        background:     "rgba(15, 20, 35, 0.5)",
        border:         "1px solid",
        borderColor:    ambient.borderColor,
        boxShadow:      ambient.boxShadow,
        cursor:         onClick ? "pointer" : "default",
        textAlign:      "left",
        transition:     "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      whileHover={onClick ? { scale: 1.01, x: 2 } : undefined}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
        <span
          aria-hidden
          style={{
            color:    SENTIMENT_COLOR[theme.sentiment],
            fontSize: "11px",
            width:    "12px",
            display:  "inline-block",
          }}
        >
          {SENTIMENT_GLYPH[theme.sentiment]}
        </span>

        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   "14px",
            fontWeight: 500,
            color:      "var(--text-main)",
          }}
        >
          {theme.name}
        </span>
      </span>

      <span
        data-testid="theme-review-badge"
        style={{
          fontFamily:    "var(--font-hud)",
          fontSize:      "11px",
          fontWeight:    600,
          color:         "var(--color-ops)",
          background:    "rgba(255, 171, 0, 0.16)",
          border:        "1px solid rgba(255, 171, 0, 0.35)",
          borderRadius:  "999px",
          padding:       "2px 10px",
          letterSpacing: "0.05em",
          whiteSpace:    "nowrap",
        }}
      >
        {theme.reviewCount} REVIEWS
      </span>
    </motion.button>
  );
}
