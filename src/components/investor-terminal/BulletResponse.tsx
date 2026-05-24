/**
 * BulletResponse — Phase 4: Investor Terminal UI Shell
 *
 * 6-bullet structured response renderer inside the Chat Terminal.
 * Spec: UI/UX §5.4 "6-Bullet Response Box".
 *
 * - Nested Glass Panel (slightly lighter: rgba(15, 20, 35, 0.5))
 * - Each bullet prefixed with cyan dot (●)
 * - Bullets appear sequentially with 100ms delay between each
 * - Each bullet has its own typewriter animation (15ms/char stagger)
 * - Optional citation tags below the bullet block
 */

"use client";

import { motion } from "framer-motion";
import { bulletContainerVariant, bulletItemVariant, sentenceVariant, letterVariant } from "@/lib/animations";
import { CitationTagList } from "./CitationTag";
import type { Citation } from "@/types";

interface BulletResponseProps {
  bullets: string[];
  citations?: Citation[];
  /** If true, runs typewriter animation on each bullet */
  animate?: boolean;
  /**
   * ISO-8601 timestamp displayed as "Last updated from sources: HH:MM".
   * Surfaced when the response comes from `/api/chat` (Phase 8+).
   */
  lastUpdated?: string;
}

/* Deterministic HH:MM formatter — matches ChatTerminal's `formatHudTime`.
 * Avoids `toLocaleTimeString` which produces locale-dependent output
 * and is therefore a hydration mismatch risk. */
function formatHudTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return iso;
  }
}

export function BulletResponse({
  bullets,
  citations = [],
  animate = true,
  lastUpdated,
}: BulletResponseProps) {
  if (!bullets.length) return null;

  return (
    <motion.div
      variants={bulletContainerVariant}
      initial="hidden"
      animate="visible"
      style={{
        background:   "rgba(15, 20, 35, 0.5)",
        border:       "1px solid rgba(0, 229, 255, 0.12)",
        borderRadius: "12px",
        padding:      "14px 16px",
        marginTop:    "8px",
        backdropFilter: "blur(8px)",
      }}
      role="list"
      aria-label="Structured response"
    >
      {bullets.slice(0, 6).map((bullet, index) => (
        <motion.div
          key={index}
          variants={bulletItemVariant}
          role="listitem"
          className="flex gap-2.5 items-start"
          style={{ marginBottom: index < bullets.length - 1 ? "8px" : 0 }}
        >
          {/* Cyan bullet dot */}
          <span
            aria-hidden="true"
            style={{
              color:      "var(--investor)",
              fontSize:   "12px",
              lineHeight: "1.6",
              flexShrink: 0,
              marginTop:  "1px",
            }}
          >
            ●
          </span>

          {/* Bullet text with typewriter */}
          {animate ? (
            <motion.span
              variants={sentenceVariant}
              initial="hidden"
              animate="visible"
              style={{
                fontFamily:  "var(--font-body)",
                fontSize:    "14px",
                lineHeight:  "1.6",
                color:       "var(--text-secondary)",
                display:     "inline",
              }}
            >
              {bullet.split("").map((char, ci) => (
                <motion.span key={ci} variants={letterVariant}>
                  {char}
                </motion.span>
              ))}
            </motion.span>
          ) : (
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize:   "14px",
                lineHeight: "1.6",
                color:      "var(--text-secondary)",
              }}
            >
              {bullet}
            </span>
          )}
        </motion.div>
      ))}

      {/* Citation tags */}
      <CitationTagList citations={citations} />

      {/* Last-updated timestamp (Phase 8 — Smart-Sync KB grounding) */}
      {lastUpdated && (
        <div
          data-testid="last-updated"
          style={{
            marginTop:     "10px",
            paddingTop:    "8px",
            borderTop:     "1px dashed rgba(0, 229, 255, 0.12)",
            fontFamily:    "var(--font-hud)",
            fontSize:      "10px",
            color:         "var(--text-tertiary)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity:       0.7,
          }}
        >
          Last updated from sources: {formatHudTime(lastUpdated)}
        </div>
      )}
    </motion.div>
  );
}
