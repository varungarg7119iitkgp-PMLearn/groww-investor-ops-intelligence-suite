/**
 * OpsFilterBar — Phase 5 Enhancement
 *
 * Filter controls modelled on the Groww PM Pulsator filter bar:
 *   - Platform: ALL / ANDROID / iOS
 *   - Time Period: TODAY / YESTERDAY / LAST 7 / LAST 15 / LAST 30
 *   - Reset CTA
 *   - Active-filter chip summary line
 */

"use client";

import { motion } from "framer-motion";

export type OpsPlatformFilter = "ALL" | "ANDROID" | "IOS";
export type OpsTimeFilter     = "TODAY" | "YESTERDAY" | "LAST_7" | "LAST_15" | "LAST_30";

interface OpsFilterBarProps {
  platform:   OpsPlatformFilter;
  timeRange:  OpsTimeFilter;
  onPlatformChange?:  (v: OpsPlatformFilter) => void;
  onTimeRangeChange?: (v: OpsTimeFilter) => void;
  onReset?:           () => void;
}

const PLATFORM_OPTIONS: { value: OpsPlatformFilter; label: string; glyph: string }[] = [
  { value: "ALL",     label: "ALL",     glyph: "◉" },
  { value: "ANDROID", label: "ANDROID", glyph: "▴" },
  { value: "IOS",     label: "iOS",     glyph: "▾" },
];

const TIME_OPTIONS: { value: OpsTimeFilter; label: string }[] = [
  { value: "TODAY",     label: "TODAY"     },
  { value: "YESTERDAY", label: "YESTERDAY" },
  { value: "LAST_7",    label: "LAST 7 DAYS" },
  { value: "LAST_15",   label: "LAST 15 DAYS" },
  { value: "LAST_30",   label: "LAST 30 DAYS" },
];

export function OpsFilterBar({
  platform,
  timeRange,
  onPlatformChange,
  onTimeRangeChange,
  onReset,
}: OpsFilterBarProps) {
  const isDefault = platform === "ALL" && timeRange === "LAST_7";

  return (
    <section
      data-testid="ops-filter-bar"
      aria-label="Director Ops filter controls"
      style={{
        display:        "flex",
        flexWrap:       "wrap",
        alignItems:     "center",
        gap:            "20px",
        padding:        "14px 18px",
        borderRadius:   "12px",
        background:     "rgba(15, 20, 35, 0.5)",
        border:         "1px solid rgba(255, 255, 255, 0.05)",
        borderLeft:     "3px solid rgba(255, 171, 0, 0.4)",
        boxShadow:      "inset 0 0 12px rgba(255, 171, 0, 0.03)",
      }}
    >
      {/* ── Platform ── */}
      <div data-testid="ops-filter-platform" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={fieldLabel}>PLATFORM</span>
        <div role="tablist" aria-label="Platform filter" style={{ display: "inline-flex", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255, 171, 0, 0.25)" }}>
          {PLATFORM_OPTIONS.map((opt) => {
            const active = platform === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`platform-${opt.value.toLowerCase()}`}
                onClick={() => onPlatformChange?.(opt.value)}
                style={{
                  display:       "inline-flex",
                  alignItems:    "center",
                  gap:           "5px",
                  padding:       "5px 10px",
                  background:    active ? "rgba(255, 171, 0, 0.18)" : "transparent",
                  border:        "none",
                  borderRight:   "1px solid rgba(255, 171, 0, 0.18)",
                  color:         active ? "var(--color-ops)" : "var(--text-muted)",
                  fontFamily:    "var(--font-hud)",
                  fontSize:      "10px",
                  fontWeight:    600,
                  letterSpacing: "0.15em",
                  cursor:        "pointer",
                  transition:    "background 0.15s ease, color 0.15s ease",
                }}
              >
                <span aria-hidden style={{ opacity: 0.7 }}>{opt.glyph}</span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Time Period ── */}
      <div data-testid="ops-filter-time" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={fieldLabel}>TIME RANGE</span>
        <select
          aria-label="Time range filter"
          value={timeRange}
          onChange={(e) => onTimeRangeChange?.(e.target.value as OpsTimeFilter)}
          data-testid="ops-time-select"
          style={{
            padding:       "5px 10px",
            borderRadius:  "8px",
            background:    "rgba(255, 171, 0, 0.08)",
            border:        "1px solid rgba(255, 171, 0, 0.35)",
            color:         "var(--color-ops)",
            fontFamily:    "var(--font-hud)",
            fontSize:      "10px",
            fontWeight:    600,
            letterSpacing: "0.12em",
            cursor:        "pointer",
            minWidth:      "150px",
            appearance:    "none",
          }}
        >
          {TIME_OPTIONS.map((t) => (
            <option key={t.value} value={t.value} style={{ background: "#0a0f1e", color: "#FFAB00" }}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Active summary ── */}
      <div
        style={{
          display:       "flex",
          flexDirection: "column",
          alignItems:    "flex-start",
          gap:           "2px",
          marginLeft:    "auto",
        }}
      >
        <span style={{ ...fieldLabel, fontSize: "9px" }}>ACTIVE SCOPE</span>
        <span
          data-testid="ops-filter-summary"
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "10px",
            color:         "var(--text-main)",
            letterSpacing: "0.1em",
          }}
        >
          <span style={{ color: "var(--color-ops)" }}>{platform}</span>
          {" · "}
          <span style={{ color: "var(--color-ops)" }}>{TIME_OPTIONS.find((t) => t.value === timeRange)?.label}</span>
        </span>
      </div>

      {/* ── Reset ── */}
      <motion.button
        type="button"
        onClick={onReset}
        data-testid="ops-filter-reset"
        disabled={isDefault}
        whileTap={isDefault ? undefined : { scale: 0.96 }}
        style={{
          padding:       "5px 12px",
          borderRadius:  "8px",
          background:    "transparent",
          border:        "1px solid rgba(255, 255, 255, 0.1)",
          color:         isDefault ? "var(--text-disabled)" : "var(--text-muted)",
          fontFamily:    "var(--font-hud)",
          fontSize:      "10px",
          fontWeight:    600,
          letterSpacing: "0.15em",
          cursor:        isDefault ? "not-allowed" : "pointer",
        }}
      >
        ⟲ RESET
      </motion.button>
    </section>
  );
}

const fieldLabel: React.CSSProperties = {
  fontFamily:    "var(--font-hud)",
  fontSize:      "10px",
  fontWeight:    600,
  color:         "var(--text-muted)",
  letterSpacing: "0.2em",
};
