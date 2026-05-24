/**
 * CitationTag — Phase 4: Investor Terminal UI Shell
 *
 * Pill-shaped source reference tag rendered below chat bullets.
 * Spec: UI/UX §5.4 Citation Tags.
 *
 * - Pill shape (border-radius 999px)
 * - Background: rgba(0,229,255,0.1) → brightens on hover
 * - Border: 1px solid rgba(0,229,255,0.3)
 * - Font: Mono, 10px, 500, UPPERCASE
 * - Hover: background brightens + glow-cyan box-shadow
 * - Click: opens sourceUrl in new tab
 */

"use client";

import { motion } from "framer-motion";
import { citationTagVariant } from "@/lib/animations";
import type { Citation } from "@/types";

interface CitationTagProps {
  citation: Citation;
}

export function CitationTag({ citation }: CitationTagProps) {
  const handleClick = () => {
    if (citation.source) {
      window.open(citation.source, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <motion.button
      type="button"
      variants={citationTagVariant}
      initial="idle"
      whileHover="hover"
      onClick={handleClick}
      aria-label={`Citation: ${citation.fundName}${citation.source ? " — opens in new tab" : ""}`}
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          "4px",
        padding:      "2px 10px",
        borderRadius: "999px",
        background:   "rgba(0, 229, 255, 0.1)",
        border:       "1px solid rgba(0, 229, 255, 0.3)",
        fontFamily:   "var(--font-hud)",
        fontSize:     "10px",
        fontWeight:   500,
        letterSpacing: "0.06em",
        color:        "var(--investor)",
        cursor:       citation.source ? "pointer" : "default",
        textTransform: "uppercase",
        whiteSpace:   "nowrap",
        outline:      "none",
        transition:   "background 0.15s ease, box-shadow 0.15s ease",
      }}
      whileTap={citation.source ? { scale: 0.96 } : undefined}
    >
      {/* Source icon */}
      <span style={{ opacity: 0.7, fontSize: "9px" }}>⬡</span>
      {citation.fundName}
      {citation.source && (
        <span style={{ opacity: 0.6, fontSize: "8px", marginLeft: "2px" }}>↗</span>
      )}
    </motion.button>
  );
}

/**
 * CitationTagList — renders a row of citation tags
 */
interface CitationTagListProps {
  citations: Citation[];
}

export function CitationTagList({ citations }: CitationTagListProps) {
  if (!citations.length) return null;

  return (
    <div
      className="flex flex-wrap gap-1.5 mt-2"
      role="list"
      aria-label="Source citations"
    >
      {citations.map((c, i) => (
        <div key={`${c.fundName}-${i}`} role="listitem">
          <CitationTag citation={c} />
        </div>
      ))}
    </div>
  );
}
