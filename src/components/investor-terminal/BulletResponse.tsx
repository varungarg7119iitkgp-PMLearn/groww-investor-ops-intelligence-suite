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
}

export function BulletResponse({
  bullets,
  citations = [],
  animate = true,
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
    </motion.div>
  );
}
