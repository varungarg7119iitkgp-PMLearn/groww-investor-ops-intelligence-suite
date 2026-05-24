/**
 * HitlQueue — Phase 5: Director Ops
 *
 * Right-column scrollable list of HITL approval cards.
 * Header shows a cyan count badge of pending items.
 *
 * Spec: UI/UX §6.3 + Architecture Phase 5 Task 3
 */

"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ApprovalItem } from "@/types";
import { ApprovalCard } from "./ApprovalCard";

interface HitlQueueProps {
  items: ApprovalItem[];
  onAuthorize?: (id: string, updatedEmail?: string) => void;
  onOverride?: (id: string, reason?: string) => void;
  onEmailEdit?: (id: string, newDraft: string) => void;
  /** Show only items in pending status. Default true. */
  pendingOnly?: boolean;
}

export function HitlQueue({
  items,
  onAuthorize,
  onOverride,
  onEmailEdit,
  pendingOnly = false,
}: HitlQueueProps) {
  const visible = useMemo(() => {
    const filtered = pendingOnly
      ? items.filter((i) => i.status === "pending_review" || i.status === "draft")
      : items;
    return [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [items, pendingOnly]);

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "pending_review" || i.status === "draft").length,
    [items],
  );

  return (
    <section
      data-testid="hitl-queue"
      data-pending-count={pendingCount}
      aria-label="HITL Approval Center"
      style={{
        display:        "flex",
        flexDirection:  "column",
        gap:            "16px",
        minHeight:      "560px",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "4px 0 12px",
          borderBottom:   "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <h2
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "14px",
            fontWeight:    600,
            color:         "var(--text-main)",
            letterSpacing: "0.1em",
            margin:        0,
          }}
        >
          {">"} PENDING AUTHORIZATIONS
        </h2>

        <motion.span
          data-testid="hitl-count-badge"
          animate={{ scale: pendingCount > 0 ? [1, 1.06, 1] : 1 }}
          transition={{ duration: 1.8, repeat: pendingCount > 0 ? Infinity : 0, ease: "easeInOut" }}
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "12px",
            fontWeight:    700,
            color:         pendingCount > 0 ? "var(--color-investor)" : "var(--text-muted)",
            background:    pendingCount > 0 ? "rgba(0, 229, 255, 0.12)" : "rgba(255, 255, 255, 0.04)",
            border:        `1px solid ${
              pendingCount > 0 ? "rgba(0, 229, 255, 0.4)" : "rgba(255, 255, 255, 0.1)"
            }`,
            padding:       "3px 12px",
            borderRadius:  "999px",
            letterSpacing: "0.05em",
            boxShadow:     pendingCount > 0 ? "0 0 8px rgba(0, 229, 255, 0.3)" : "none",
            display:       "inline-block",
          }}
        >
          {pendingCount} PENDING
        </motion.span>
      </header>

      {/* ── List ── */}
      <div
        role="list"
        aria-live="polite"
        style={{
          display:       "flex",
          flexDirection: "column",
          gap:           "14px",
          maxHeight:     "70vh",
          overflowY:     "auto",
          paddingRight:  "4px",
        }}
      >
        <AnimatePresence mode="popLayout">
          {visible.length === 0 ? (
            <EmptyState key="empty" />
          ) : (
            visible.map((item, idx) => (
              <ApprovalCard
                key={item.id}
                item={item}
                index={idx}
                onAuthorize={onAuthorize}
                onOverride={onOverride}
                onEmailEdit={onEmailEdit}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ── Empty state ──────────────────────────────────────────────── */
function EmptyState() {
  return (
    <motion.div
      data-testid="hitl-empty-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        textAlign:      "center",
        padding:        "60px 24px",
        minHeight:      "300px",
        gap:            "16px",
      }}
    >
      {/* Clipboard with checkmark icon */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden
        style={{ opacity: 0.45 }}
      >
        <rect
          x="16"
          y="10"
          width="32"
          height="44"
          rx="4"
          stroke="var(--text-disabled)"
          strokeWidth="1.5"
          fill="none"
        />
        <rect
          x="24"
          y="6"
          width="16"
          height="8"
          rx="2"
          stroke="var(--text-disabled)"
          strokeWidth="1.5"
          fill="rgba(15, 20, 35, 0.5)"
        />
        <path
          d="M24 30 L30 36 L42 24"
          stroke="var(--color-success)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize:   "14px",
          color:      "var(--text-disabled)",
          margin:     0,
          maxWidth:   "320px",
          lineHeight: 1.55,
        }}
      >
        No pending approvals. Items appear here when bookings are confirmed in Investor Terminal.
      </p>

      <span
        style={{
          fontFamily:    "var(--font-hud)",
          fontSize:      "10px",
          color:         "var(--color-success)",
          letterSpacing: "0.2em",
          padding:       "3px 10px",
          border:        "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius:  "999px",
          background:    "rgba(16, 185, 129, 0.05)",
        }}
      >
        ✓ ALL CLEAR
      </span>
    </motion.div>
  );
}
