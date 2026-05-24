/**
 * CategoryMixBar — Phase 5 Enhancement
 *
 * Mini section showing category distribution from the M2 PM Pulsator
 * 20-category taxonomy. Each row is a horizontal bar with name, count,
 * and percentage. Sorted by count desc.
 *
 * Used as a sub-section inside the Director Ops dashboard.
 */

"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface CategoryDatum {
  name:  string;
  count: number;
  /** Optional pre-assigned color; defaults to amber gradient by rank */
  color?: string;
}

interface CategoryMixBarProps {
  categories: CategoryDatum[];
  total?:     number;
  maxRows?:   number;
}

const DEFAULT_GRADIENT = [
  "rgba(255, 171, 0, 0.95)",
  "rgba(255, 171, 0, 0.80)",
  "rgba(255, 171, 0, 0.65)",
  "rgba(255, 171, 0, 0.50)",
  "rgba(255, 171, 0, 0.40)",
  "rgba(255, 171, 0, 0.32)",
  "rgba(255, 171, 0, 0.26)",
  "rgba(255, 171, 0, 0.22)",
];

export function CategoryMixBar({
  categories,
  total,
  maxRows = 8,
}: CategoryMixBarProps) {
  const sorted = useMemo(
    () => [...categories].sort((a, b) => b.count - a.count).slice(0, maxRows),
    [categories, maxRows],
  );
  const sumTotal = total ?? sorted.reduce((s, c) => s + c.count, 0);
  const maxCount = Math.max(1, ...sorted.map((c) => c.count));

  return (
    <section
      data-testid="category-mix-bar"
      aria-label="Category Mix"
      style={{
        padding:        "18px 20px",
        borderRadius:   "12px",
        background:     "rgba(15, 20, 35, 0.5)",
        border:         "1px solid rgba(255, 255, 255, 0.05)",
        borderLeft:     "3px solid var(--color-ops)",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
        <h3
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "13px",
            fontWeight:    600,
            color:         "var(--color-ops)",
            letterSpacing: "0.18em",
            margin:        0,
          }}
        >
          {">"} CATEGORY MIX
        </h3>
        <span
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "10px",
            color:         "var(--text-muted)",
            letterSpacing: "0.15em",
          }}
        >
          {sumTotal} REVIEWS · TOP {sorted.length}
        </span>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {sorted.map((cat, idx) => {
          const widthPct = (cat.count / maxCount) * 100;
          const sharePct = (cat.count / Math.max(1, sumTotal)) * 100;
          const fill     = cat.color ?? DEFAULT_GRADIENT[idx] ?? "rgba(255, 171, 0, 0.18)";
          return (
            <div
              key={cat.name}
              data-testid="category-row"
              data-category={cat.name}
              style={{ display: "flex", flexDirection: "column", gap: "3px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "var(--font-hud)", fontSize: "10px" }}>
                <span style={{ color: "var(--text-main)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {cat.name}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--color-ops)", fontWeight: 700 }}>{cat.count}</span>
                  {" · "}
                  {sharePct.toFixed(1)}%
                </span>
              </div>
              <div
                style={{
                  height:       "6px",
                  borderRadius: "3px",
                  background:   "rgba(255, 171, 0, 0.06)",
                  overflow:     "hidden",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ duration: 0.7, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    height:     "100%",
                    background: fill,
                    boxShadow:  idx < 3 ? "0 0 6px rgba(255, 171, 0, 0.35)" : "none",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
