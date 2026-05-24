/**
 * MarketContextBlock — Phase 5: Director Ops
 *
 * Amber-bordered snippet rendered inside the ApprovalCard.
 * Cross-pillar surface: shows the top Weekly-Pulse theme inside
 * an HITL approval so the operator can see *why* this booking matters.
 *
 * Spec: UI/UX §6.3 "Market Context Snippet"
 */

"use client";

interface MarketContextBlockProps {
  snippet?: string;
  label?: string;
}

export function MarketContextBlock({
  snippet,
  label = "MARKET CONTEXT",
}: MarketContextBlockProps) {
  const hasContent = Boolean(snippet && snippet.trim().length > 0);

  return (
    <div
      data-testid="market-context-block"
      data-empty={!hasContent}
      style={{
        borderLeft:   "2px solid var(--color-ops)",
        background:   "rgba(255, 171, 0, 0.08)",
        padding:      "10px 14px",
        borderRadius: "0 8px 8px 0",
      }}
    >
      <div
        style={{
          fontFamily:    "var(--font-hud)",
          fontSize:      "10px",
          fontWeight:    600,
          color:         "var(--color-ops)",
          letterSpacing: "0.15em",
          marginBottom:  "6px",
        }}
      >
        {label}
      </div>

      {hasContent ? (
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize:   "13px",
            color:      "var(--text-muted)",
            lineHeight: 1.55,
          }}
        >
          {snippet}
        </div>
      ) : (
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize:   "13px",
            color:      "var(--text-disabled)",
            fontStyle:  "italic",
            lineHeight: 1.55,
          }}
        >
          Market context unavailable — generate Weekly Pulse first.
        </div>
      )}
    </div>
  );
}
