/**
 * SentimentTrend — Phase 5 Enhancement
 *
 * Compact sentiment-trend visual: a normalized stacked sparkline of
 * positive / neutral / negative reviews over the selected time range.
 * No external chart library — pure SVG.
 *
 * Used as a sub-section inside the Director Ops dashboard.
 */

"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

export interface SentimentPoint {
  /** Display label for x-axis (e.g. "Mon", "May 22") */
  label:    string;
  positive: number;
  neutral:  number;
  negative: number;
}

/** Visual source for the sentiment data — drives heading color + label */
export type SentimentSource = "reviews" | "chat";

interface SentimentTrendProps {
  points:    SentimentPoint[];
  height?:   number;
  /** Bold accent color CSS var (default emerald). Used for header + border. */
  accentVar?: string;
  /** Section title — defaults to "SENTIMENT TREND" */
  title?:     string;
  /** Optional subtitle / data-source label shown beneath the title */
  subtitle?:  string;
  /** Quick preset that picks colors + copy for known sources */
  source?:    SentimentSource;
  /** Optional test-id override (allows multiple instances in one page) */
  testId?:    string;
}

const STROKE = {
  positive: "var(--color-success)",
  neutral:  "var(--color-ops)",
  negative: "var(--color-error)",
};

/** Source presets — used when consumer just passes `source="…"` */
const SOURCE_PRESETS: Record<SentimentSource, { title: string; subtitle: string; accentVar: string }> = {
  reviews: {
    title:     "REVIEWS SENTIMENT",
    subtitle:  "Play Store + App Store reviews",
    accentVar: "var(--color-success)",
  },
  chat: {
    title:     "CHAT SENTIMENT",
    subtitle:  "Investor Panel chats & queries",
    accentVar: "var(--color-investor)",
  },
};

export function SentimentTrend({
  points,
  height    = 96,
  accentVar,
  title,
  subtitle,
  source,
  testId    = "sentiment-trend",
}: SentimentTrendProps) {
  /* Resolve display config — explicit props win over `source` preset */
  const preset       = source ? SOURCE_PRESETS[source] : null;
  const resolvedAccent   = accentVar ?? preset?.accentVar ?? "var(--color-success)";
  const resolvedTitle    = title     ?? preset?.title     ?? "SENTIMENT TREND";
  const resolvedSubtitle = subtitle  ?? preset?.subtitle  ?? "";
  const { paths, totals } = useMemo(() => {
    const n  = points.length;
    if (n === 0) return { paths: { positive: "", neutral: "", negative: "" }, totals: { positive: 0, neutral: 0, negative: 0 } };

    const maxY = Math.max(
      1,
      ...points.map((p) => Math.max(p.positive, p.neutral, p.negative)),
    );

    const xFor = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
    const yFor = (v: number) => 100 - (v / maxY) * 90 - 5;

    const seriesPath = (key: keyof Pick<SentimentPoint, "positive" | "neutral" | "negative">) =>
      points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(p[key]).toFixed(2)}`)
        .join(" ");

    return {
      paths: {
        positive: seriesPath("positive"),
        neutral:  seriesPath("neutral"),
        negative: seriesPath("negative"),
      },
      totals: {
        positive: points.reduce((s, p) => s + p.positive, 0),
        neutral:  points.reduce((s, p) => s + p.neutral, 0),
        negative: points.reduce((s, p) => s + p.negative, 0),
      },
    };
  }, [points]);

  const grandTotal = totals.positive + totals.neutral + totals.negative;
  const net = grandTotal === 0 ? 0 : (totals.positive - totals.negative) / grandTotal;
  const netLabel = net > 0.05 ? "NET POSITIVE" : net < -0.05 ? "NET NEGATIVE" : "NEUTRAL";
  const netColor = net > 0.05 ? "var(--color-success)" : net < -0.05 ? "var(--color-error)" : "var(--color-ops)";

  return (
    <section
      data-testid={testId}
      aria-label={`${resolvedTitle.toLowerCase()} trend`}
      style={{
        padding:        "18px 20px",
        borderRadius:   "12px",
        background:     "rgba(15, 20, 35, 0.5)",
        border:         "1px solid rgba(255, 255, 255, 0.05)",
        borderLeft:     `3px solid ${resolvedAccent}`,
        height:         "100%",
        display:        "flex",
        flexDirection:  "column",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px", gap: "8px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
          <h3
            style={{
              fontFamily:    "var(--font-hud)",
              fontSize:      "13px",
              fontWeight:    600,
              color:         resolvedAccent,
              letterSpacing: "0.18em",
              margin:        0,
            }}
          >
            {">"} {resolvedTitle}
          </h3>
          {resolvedSubtitle && (
            <span
              data-testid={`${testId}-subtitle`}
              style={{
                fontFamily:    "var(--font-hud)",
                fontSize:      "9px",
                color:         "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {resolvedSubtitle}
            </span>
          )}
        </div>
        <span
          data-testid={`${testId}-net-label`}
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "10px",
            color:         netColor,
            letterSpacing: "0.18em",
            padding:       "1px 8px",
            border:        `1px solid ${netColor}`,
            borderRadius:  "999px",
            opacity:       0.85,
            whiteSpace:    "nowrap",
          }}
        >
          {netLabel} · {(net * 100).toFixed(0)}%
        </span>
      </header>

      {/* SVG sparkline */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ width: "100%", height: `${height}px` }}
        aria-hidden
      >
        {/* Background gridlines */}
        {[25, 50, 75].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.4" />
        ))}

        {(["positive", "neutral", "negative"] as const).map((key) => (
          <motion.path
            key={key}
            d={paths[key]}
            stroke={STROKE[key]}
            strokeWidth="0.8"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.95 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {/* X-axis labels (only first / mid / last to avoid crowding) */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
        {[points[0], points[Math.floor(points.length / 2)], points[points.length - 1]]
          .filter(Boolean)
          .map((p, i) => (
            <span
              key={i}
              style={{
                fontFamily:    "var(--font-hud)",
                fontSize:      "9px",
                color:         "var(--text-muted)",
                letterSpacing: "0.1em",
              }}
            >
              {p.label}
            </span>
          ))}
      </div>

      {/* Legend + totals */}
      <div
        style={{
          marginTop:    "12px",
          display:      "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap:          "10px",
        }}
      >
        {(["positive", "neutral", "negative"] as const).map((key) => (
          <div
            key={key}
            data-testid={`${testId}-legend-${key}`}
            style={{
              padding:       "8px 10px",
              borderRadius:  "8px",
              background:    "rgba(255, 255, 255, 0.02)",
              border:        "1px solid rgba(255, 255, 255, 0.05)",
              display:       "flex",
              flexDirection: "column",
              gap:           "2px",
            }}
          >
            <span
              style={{
                fontFamily:    "var(--font-hud)",
                fontSize:      "9px",
                color:         STROKE[key],
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              ● {key}
            </span>
            <span
              style={{
                fontFamily:    "var(--font-hud)",
                fontSize:      "14px",
                fontWeight:    700,
                color:         "var(--text-main)",
              }}
            >
              {totals[key]}
            </span>
            <span
              style={{
                fontFamily:    "var(--font-hud)",
                fontSize:      "9px",
                color:         "var(--text-muted)",
                letterSpacing: "0.12em",
              }}
            >
              {grandTotal === 0 ? "0%" : `${((totals[key] / grandTotal) * 100).toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
