/**
 * OpsHeader — Phase 5 Enhancement
 *
 * Branded sticky header for the Director Ops console, modelled on the
 * Groww PM Pulsator app's top bar. Combines:
 *   - Brand block (logo glyph + product name + tagline)
 *   - Live status indicators (last sync, channel state)
 *   - Sync / Refresh CTA
 *   - Return-to-Investor link
 */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useUIStore } from "@/lib/store";

interface OpsHeaderProps {
  pendingCount?:   number;
  totalCount?:     number;
  /** Last successful sync ISO; defaults to "now" */
  lastSyncIso?:    string;
  onSync?:         () => void;
  isSyncing?:      boolean;
}

const SyncIcon = ({ size = 14, spinning = false }: { size?: number; spinning?: boolean }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    animate={spinning ? { rotate: 360 } : { rotate: 0 }}
    transition={spinning ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
  >
    <path
      d="M21 12a9 9 0 0 1-9 9c-2.4 0-4.6-0.94-6.2-2.5M3 12a9 9 0 0 1 9-9c2.4 0 4.6 0.94 6.2 2.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M18 1v6h-6M6 23v-6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </motion.svg>
);

const BackIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function formatRelative(iso: string, nowMs: number): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diffS = Math.max(0, Math.round((nowMs - t) / 1000));
  if (diffS < 60)   return `${diffS}s ago`;
  if (diffS < 3600) return `${Math.round(diffS / 60)}m ago`;
  if (diffS < 86400) return `${Math.round(diffS / 3600)}h ago`;
  return `${Math.round(diffS / 86400)}d ago`;
}

export function OpsHeader({
  pendingCount = 0,
  totalCount   = 0,
  lastSyncIso,
  onSync,
  isSyncing    = false,
}: OpsHeaderProps) {
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const syncLabel = lastSyncIso && nowMs !== null ? formatRelative(lastSyncIso, nowMs) : "just now";

  return (
    <header
      data-testid="ops-header"
      style={{
        position:       "sticky",
        top:            0,
        zIndex:         50,
        background:     "rgba(8, 12, 22, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom:   "1px solid rgba(255, 171, 0, 0.18)",
        boxShadow:      "0 2px 24px rgba(0, 0, 0, 0.6)",
      }}
    >
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          padding:        "12px 24px",
          maxWidth:       "1600px",
          margin:         "0 auto",
          gap:            "16px",
        }}
      >
        {/* ── Left: brand ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Logo glyph (Groww-style mountain) */}
          <div
            data-testid="ops-brand-glyph"
            style={{
              width:       "32px",
              height:      "32px",
              borderRadius: "8px",
              background:  "linear-gradient(135deg, rgba(255, 171, 0, 0.25), rgba(255, 171, 0, 0.05))",
              border:      "1px solid rgba(255, 171, 0, 0.5)",
              display:     "flex",
              alignItems:  "center",
              justifyContent: "center",
              boxShadow:   "0 0 12px rgba(255, 171, 0, 0.2)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 20 8 13 12 16 16 9 21 20Z"
                fill="rgba(255, 171, 0, 0.55)"
                stroke="var(--color-ops)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1
                style={{
                  fontFamily:    "var(--font-display)",
                  fontSize:      "16px",
                  fontWeight:    700,
                  color:         "var(--text-main)",
                  margin:        0,
                  letterSpacing: "0.04em",
                }}
              >
                <span style={{ color: "var(--color-ops)" }}>◈</span> DIRECTOR OPS
              </h1>
              <span
                style={{
                  fontFamily:    "var(--font-hud)",
                  fontSize:      "9px",
                  fontWeight:    700,
                  color:         "var(--color-ops)",
                  background:    "rgba(255, 171, 0, 0.12)",
                  border:        "1px solid rgba(255, 171, 0, 0.4)",
                  padding:       "1px 7px",
                  borderRadius:  "4px",
                  letterSpacing: "0.15em",
                }}
              >
                COMMAND CENTRE
              </span>
            </div>
            <p
              style={{
                fontFamily:    "var(--font-hud)",
                fontSize:      "10px",
                color:         "var(--text-muted)",
                margin:        "2px 0 0",
                letterSpacing: "0.12em",
              }}
            >
              AI-POWERED REVIEW INTELLIGENCE · HITL APPROVAL CENTER
            </p>
          </div>
        </div>

        {/* ── Right: status + controls ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Live indicator + last sync */}
          <div
            style={{
              display:    "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap:        "2px",
            }}
          >
            <div
              style={{
                display:    "inline-flex",
                alignItems: "center",
                gap:        "6px",
                fontFamily: "var(--font-hud)",
                fontSize:   "10px",
                letterSpacing: "0.15em",
                color:      "var(--color-success)",
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                style={{
                  width:        "6px",
                  height:       "6px",
                  borderRadius: "50%",
                  background:   "var(--color-success)",
                  boxShadow:    "0 0 6px var(--color-success)",
                  display:      "inline-block",
                }}
              />
              CHANNEL · SECURE
            </div>
            <div
              data-testid="ops-last-sync"
              style={{
                fontFamily:    "var(--font-hud)",
                fontSize:      "9px",
                color:         "var(--text-muted)",
                letterSpacing: "0.1em",
              }}
            >
              SYNCED {syncLabel}
            </div>
          </div>

          {/* Pending stat pill */}
          <div
            data-testid="ops-stat-pill"
            style={{
              padding:       "6px 12px",
              border:        "1px solid rgba(0, 229, 255, 0.35)",
              borderRadius:  "8px",
              background:    "rgba(0, 229, 255, 0.04)",
              fontFamily:    "var(--font-hud)",
              fontSize:      "11px",
              color:         "var(--color-investor)",
              letterSpacing: "0.1em",
              display:       "flex",
              flexDirection: "column",
              alignItems:    "flex-end",
              gap:           "2px",
              minWidth:      "108px",
            }}
          >
            <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.18em" }}>
              QUEUE
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: "13px" }}>{pendingCount}</span>
              <span style={{ color: "var(--text-muted)" }}> / {totalCount} PENDING</span>
            </div>
          </div>

          {/* Sync button */}
          <motion.button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            data-testid="ops-sync-button"
            whileTap={isSyncing ? undefined : { scale: 0.96 }}
            style={{
              display:        "inline-flex",
              alignItems:     "center",
              gap:            "6px",
              padding:        "7px 14px",
              borderRadius:   "8px",
              background:     "linear-gradient(135deg, rgba(255, 171, 0, 0.18), rgba(255, 171, 0, 0.06))",
              border:         "1px solid rgba(255, 171, 0, 0.55)",
              color:          "var(--color-ops)",
              fontFamily:     "var(--font-hud)",
              fontSize:       "11px",
              fontWeight:     600,
              letterSpacing:  "0.15em",
              cursor:         isSyncing ? "wait" : "pointer",
              boxShadow:      "0 0 10px rgba(255, 171, 0, 0.18)",
            }}
          >
            <SyncIcon size={13} spinning={isSyncing} />
            {isSyncing ? "SYNCING…" : "SYNC"}
          </motion.button>

          {/* Back to Investor — Phase 6: drives Zustand activeMode (single URL) */}
          <BackToInvestorButton />
        </div>
      </div>
    </header>
  );
}

/** Phase 6: replaces the previous `<Link href="/">` with a store toggle. */
function BackToInvestorButton() {
  const setActiveMode = useUIStore((s) => s.setActiveMode);
  return (
    <button
      type="button"
      data-testid="ops-back-link"
      onClick={() => setActiveMode("investor-terminal")}
      aria-label="Switch back to Investor Hub"
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        gap:            "5px",
        padding:        "6px 12px",
        borderRadius:   "999px",
        border:         "1px solid rgba(0, 229, 255, 0.4)",
        background:     "rgba(0, 229, 255, 0.04)",
        color:          "var(--color-investor)",
        fontFamily:     "var(--font-hud)",
        fontSize:       "10px",
        fontWeight:     600,
        letterSpacing:  "0.15em",
        cursor:         "pointer",
      }}
    >
      <BackIcon size={11} />
      INVESTOR HUB
    </button>
  );
}
