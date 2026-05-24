/**
 * ApprovalCard — Phase 5: Director Ops
 *
 * Glass-panel card representing a single AI-generated booking awaiting
 * human authorization (HITL Pattern, Req 4).
 *
 * Sections (top→bottom):
 *  1. Booking Code (cyan glow)
 *  2. Calendar Hold (date/time + topic badge)
 *  3. Email Draft Preview (contenteditable, scrollable, 200px max)
 *  4. Market Context Snippet (from top Weekly-Pulse theme)
 *  5. Action Gate (Authorize / Override)
 *
 * Status indicator (left border):
 *   amber   → pending
 *   emerald → authorized
 *   crimson → rejected
 *
 * Spec: UI/UX §6.3 + Architecture Phase 5 Task 4
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { ApprovalItem, ArtifactStatus } from "@/types";
import { MarketContextBlock } from "./MarketContextBlock";
import { ActionGate } from "./ActionGate";

interface ApprovalCardProps {
  item: ApprovalItem;
  index?: number;
  onAuthorize?: (id: string, updatedEmail?: string) => void;
  onOverride?: (id: string, reason?: string) => void;
  onEmailEdit?: (id: string, newDraft: string) => void;
}

const STATUS_BORDER: Record<ArtifactStatus, string> = {
  draft:           "rgba(255, 171, 0, 0.65)",
  pending_review:  "rgba(255, 171, 0, 0.65)",
  authorized:      "rgba(16, 185, 129, 0.65)",
  rejected:        "rgba(239, 68, 68, 0.65)",
  executed:        "rgba(16, 185, 129, 0.85)",
};

const STATUS_LABEL: Record<ArtifactStatus, string> = {
  draft:           "PENDING",
  pending_review:  "PENDING",
  authorized:      "AUTHORIZED",
  rejected:        "REJECTED",
  executed:        "EXECUTED",
};

const STATUS_COLOR: Record<ArtifactStatus, string> = {
  draft:           "var(--color-ops)",
  pending_review:  "var(--color-ops)",
  authorized:      "var(--color-success)",
  rejected:        "var(--color-error)",
  executed:        "var(--color-success)",
};

/* Deterministic display formatter (server/client match) */
function formatSlot(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const mo = (d.getMonth() + 1).toString().padStart(2, "0");
  const da = d.getDate().toString().padStart(2, "0");
  const h12 = ((d.getHours() % 12) || 12).toString().padStart(2, "0");
  const mi = d.getMinutes().toString().padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  return `${y}-${mo}-${da}  ${h12}:${mi} ${ampm}`;
}

export function ApprovalCard({
  item,
  index = 0,
  onAuthorize,
  onOverride,
  onEmailEdit,
}: ApprovalCardProps) {
  const [emailDraft, setEmailDraft] = useState(item.emailDraft);
  const emailRef = useRef<HTMLDivElement>(null);

  const status      = item.status;
  const borderColor = STATUS_BORDER[status];
  const statusLabel = STATUS_LABEL[status];
  const statusColor = STATUS_COLOR[status];
  const isLocked    = status === "authorized" || status === "rejected" || status === "executed";

  const handleEmailInput = useCallback(() => {
    const text = emailRef.current?.innerText ?? "";
    setEmailDraft(text);
    onEmailEdit?.(item.id, text);
  }, [item.id, onEmailEdit]);

  const handleAuthorize = useCallback(() => {
    onAuthorize?.(item.id, emailDraft);
  }, [item.id, emailDraft, onAuthorize]);

  const handleOverride = useCallback(() => {
    onOverride?.(item.id);
  }, [item.id, onOverride]);

  return (
    <motion.article
      data-testid="approval-card"
      data-status={status}
      data-booking-code={item.bookingCode}
      role="listitem"
      aria-label={`Approval card for booking ${item.bookingCode}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel"
      style={{
        position:        "relative",
        padding:         "16px 18px 16px 22px",
        borderRadius:    "var(--glass-radius, 16px)",
        borderLeft:      `3px solid ${borderColor}`,
        display:         "flex",
        flexDirection:   "column",
        gap:             "14px",
      }}
    >
      {/* ── Status badge (top-right) ── */}
      <span
        data-testid="approval-status-badge"
        style={{
          position:      "absolute",
          top:           "10px",
          right:         "12px",
          fontFamily:    "var(--font-hud)",
          fontSize:      "10px",
          fontWeight:    700,
          color:         statusColor,
          letterSpacing: "0.15em",
          padding:       "2px 8px",
          border:        `1px solid ${borderColor}`,
          borderRadius:  "999px",
          background:    "rgba(0, 0, 0, 0.3)",
        }}
      >
        {statusLabel}
      </span>

      {/* ── Booking Code section ── */}
      <section>
        <div style={fieldLabel}>BOOKING CODE</div>
        <div
          data-testid="approval-booking-code"
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "20px",
            fontWeight:    700,
            color:         "var(--color-investor)",
            letterSpacing: "0.1em",
            textShadow:    "0 0 8px rgba(0, 229, 255, 0.4)",
          }}
        >
          {item.bookingCode}
        </div>
        <div
          style={{
            fontFamily: "var(--font-hud)",
            fontSize:   "11px",
            color:      "var(--text-muted)",
            marginTop:  "2px",
          }}
        >
          INVESTOR: {item.investorNameRedacted}
        </div>
      </section>

      {/* ── Calendar Hold ── */}
      <section>
        <div style={fieldLabel}>CALENDAR HOLD</div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span
            data-testid="approval-slot"
            style={{
              fontFamily: "var(--font-hud)",
              fontSize:   "14px",
              color:      "var(--text-main)",
            }}
          >
            {formatSlot(item.proposedSlot)}
          </span>
          <span
            data-testid="approval-topic-badge"
            style={{
              fontFamily:    "var(--font-display)",
              fontSize:      "11px",
              fontWeight:    600,
              color:         "var(--color-ops)",
              background:    "rgba(255, 171, 0, 0.14)",
              border:        "1px solid rgba(255, 171, 0, 0.4)",
              borderRadius:  "999px",
              padding:       "2px 10px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {item.topic}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-hud)",
            fontSize:   "11px",
            color:      "var(--text-muted)",
            marginTop:  "2px",
          }}
        >
          ADVISOR: {item.advisorEmail}
        </div>
      </section>

      {/* ── Email Draft (editable) ── */}
      <section>
        <div style={{ ...fieldLabel, display: "flex", justifyContent: "space-between" }}>
          <span>EMAIL DRAFT</span>
          {!isLocked && (
            <span style={{ color: "var(--color-investor)", textTransform: "none", letterSpacing: "0.05em" }}>
              ✎ editable
            </span>
          )}
        </div>
        <div
          ref={emailRef}
          contentEditable={!isLocked}
          suppressContentEditableWarning
          onInput={handleEmailInput}
          aria-label="Editable email draft"
          data-testid="approval-email-draft"
          style={{
            fontFamily:   "var(--font-body)",
            fontSize:     "13px",
            color:        "var(--text-muted)",
            background:   "rgba(10, 15, 30, 0.4)",
            border:       "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding:      "10px 12px",
            maxHeight:    "200px",
            overflowY:    "auto",
            lineHeight:   1.55,
            whiteSpace:   "pre-wrap",
            outline:      "none",
            opacity:      isLocked ? 0.7 : 1,
            cursor:       isLocked ? "default" : "text",
          }}
        >
          {item.emailDraft}
        </div>
      </section>

      {/* ── Market Context ── */}
      <MarketContextBlock snippet={item.marketContextSnippet} />

      {/* ── Action Gate ── */}
      {!isLocked && (
        <ActionGate
          onAuthorize={handleAuthorize}
          onOverride={handleOverride}
        />
      )}

      {isLocked && (
        <div
          data-testid="approval-locked-state"
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "11px",
            color:         statusColor,
            letterSpacing: "0.15em",
            textAlign:     "center",
            padding:       "8px 0",
            border:        `1px dashed ${borderColor}`,
            borderRadius:  "8px",
          }}
        >
          {status === "rejected"
            ? "✗ OPERATOR OVERRODE THIS ACTION"
            : "✓ OPERATOR AUTHORIZED THIS ACTION"}
        </div>
      )}
    </motion.article>
  );
}

/* ── Field label shared style ─────────────────────────────────── */
const fieldLabel: React.CSSProperties = {
  fontFamily:    "var(--font-hud)",
  fontSize:      "10px",
  fontWeight:    600,
  color:         "var(--text-muted)",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  marginBottom:  "4px",
};
