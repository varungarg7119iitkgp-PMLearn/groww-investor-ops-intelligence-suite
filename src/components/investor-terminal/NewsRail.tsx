/**
 * NewsRail — Phase 5 Enhancement
 *
 * Compact vertical rail of news + product updates rendered to the right
 * of the Investor Terminal chat area. Items rotate via auto-scroll OR are
 * filterable by category (MARKET / PRODUCT / REGULATORY).
 *
 * All data is mocked for Phase 5; Phase 8 wires real RSS / Supabase feeds.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type NewsCategory = "MARKET" | "PRODUCT" | "REGULATORY";

interface NewsItem {
  id:        string;
  category:  NewsCategory;
  title:     string;
  publisher: string;
  /** ISO date string — display only, no toLocale */
  publishedAt: string;
  isFresh?:  boolean;
}

const MOCK_NEWS: NewsItem[] = [
  {
    id:          "n1",
    category:    "MARKET",
    title:       "Nifty 50 closes at 28,420 — IT and Banks lead 1.4% rally",
    publisher:   "Mint Markets",
    publishedAt: "2026-05-24T13:45:00.000Z",
    isFresh:     true,
  },
  {
    id:          "n2",
    category:    "PRODUCT",
    title:       "Groww launches Direct-to-Investor SIP rebalancer (Beta)",
    publisher:   "Groww Newsroom",
    publishedAt: "2026-05-24T11:00:00.000Z",
    isFresh:     true,
  },
  {
    id:          "n3",
    category:    "REGULATORY",
    title:       "SEBI circular: KYC re-verification window extended to Aug 2026",
    publisher:   "SEBI Press Release",
    publishedAt: "2026-05-23T17:30:00.000Z",
  },
  {
    id:          "n4",
    category:    "MARKET",
    title:       "10-Year G-Sec yield drops 8 bps after RBI policy preview",
    publisher:   "Bloomberg Quint",
    publishedAt: "2026-05-23T15:10:00.000Z",
  },
  {
    id:          "n5",
    category:    "PRODUCT",
    title:       "Goal-based portfolio templates now live for Tier-2 investors",
    publisher:   "Groww Newsroom",
    publishedAt: "2026-05-22T09:25:00.000Z",
  },
  {
    id:          "n6",
    category:    "REGULATORY",
    title:       "Finance Bill 2026: Updated capital-gains statement format active",
    publisher:   "PRS India",
    publishedAt: "2026-05-21T18:45:00.000Z",
  },
  {
    id:          "n7",
    category:    "MARKET",
    title:       "PSU bank index outperforms — May aggregate gain +6.8%",
    publisher:   "ET Markets",
    publishedAt: "2026-05-21T16:00:00.000Z",
  },
];

const CATEGORY_COLOR: Record<NewsCategory, string> = {
  MARKET:     "var(--color-investor)",
  PRODUCT:    "var(--color-ops)",
  REGULATORY: "var(--color-success)",
};

const CATEGORY_BG: Record<NewsCategory, string> = {
  MARKET:     "rgba(0, 229, 255, 0.10)",
  PRODUCT:    "rgba(255, 171, 0, 0.10)",
  REGULATORY: "rgba(16, 185, 129, 0.10)",
};

function timeAgo(iso: string, nowMs = Date.now()): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diffMin = Math.max(0, Math.round((nowMs - t) / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  return `${diffD}d ago`;
}

interface NewsRailProps {
  items?:    NewsItem[];
  onItemClick?: (item: NewsItem) => void;
  /** When true, news list fills parent column height instead of 60vh cap */
  fillHeight?: boolean;
}

export function NewsRail({
  items = MOCK_NEWS,
  onItemClick,
  fillHeight = false,
}: NewsRailProps) {
  const [filter, setFilter] = useState<NewsCategory | "ALL">("ALL");

  // Compute "now" once on mount → stable across renders → server/client safe
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => { setNowMs(Date.now()); }, []);

  const filtered = useMemo(
    () => (filter === "ALL" ? items : items.filter((i) => i.category === filter)),
    [filter, items],
  );

  return (
    <aside
      data-testid="news-rail"
      aria-label="Market & product news"
      className="glass-panel glass-panel-investor"
      style={{
        width:          "100%",
        maxWidth:       "100%",
        height:         fillHeight ? "100%" : undefined,
        minHeight:      fillHeight ? 0 : undefined,
        padding:        "20px",
        display:        "flex",
        flexDirection:  "column",
        gap:            "12px",
        overflow:       "hidden",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          borderBottom:   "1px solid rgba(0, 229, 255, 0.12)",
          paddingBottom:  "6px",
        }}
      >
        <h3
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "11px",
            color:         "var(--color-investor)",
            letterSpacing: "0.22em",
            margin:        0,
            fontWeight:    600,
          }}
        >
          {">"} NEWS & UPDATES
        </h3>
        <motion.span
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "9px",
            color:         "var(--color-success)",
            letterSpacing: "0.15em",
          }}
        >
          ● LIVE
        </motion.span>
      </div>

      {/* ── Category filter pills ── */}
      <div
        role="tablist"
        aria-label="Filter news by category"
        style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
      >
        {(["ALL", "MARKET", "PRODUCT", "REGULATORY"] as const).map((cat) => {
          const isActive = filter === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(cat)}
              data-testid={`news-filter-${cat.toLowerCase()}`}
              style={{
                fontFamily:    "var(--font-hud)",
                fontSize:      "9px",
                fontWeight:    600,
                letterSpacing: "0.12em",
                padding:       "3px 8px",
                border:        `1px solid ${
                  isActive
                    ? cat === "ALL"
                      ? "rgba(0, 229, 255, 0.5)"
                      : CATEGORY_COLOR[cat as NewsCategory]
                    : "rgba(255, 255, 255, 0.08)"
                }`,
                background:    isActive
                  ? cat === "ALL"
                    ? "rgba(0, 229, 255, 0.12)"
                    : CATEGORY_BG[cat as NewsCategory]
                  : "transparent",
                color: isActive
                  ? cat === "ALL"
                    ? "var(--color-investor)"
                    : CATEGORY_COLOR[cat as NewsCategory]
                  : "var(--text-muted)",
                borderRadius:  "999px",
                cursor:        "pointer",
                transition:    "all 0.15s ease",
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── News list (vertically scrollable when long) ── */}
      <div
        role="list"
        aria-live="polite"
        style={{
          display:        "flex",
          flexDirection:  "column",
          gap:            "8px",
          ...(fillHeight
            ? { flex: 1, minHeight: 0 }
            : { maxHeight: "60vh" }),
          overflowY:      "auto",
          paddingRight:   "2px",
        }}
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((item, idx) => (
            <motion.button
              key={item.id}
              data-testid="news-item"
              data-category={item.category}
              type="button"
              role="listitem"
              onClick={() => onItemClick?.(item)}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.25, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.01, x: -2 }}
              style={{
                textAlign:     "left",
                padding:       "10px 12px",
                borderRadius:  "10px",
                background:    "rgba(15, 20, 35, 0.45)",
                border:        "1px solid rgba(255, 255, 255, 0.05)",
                borderLeft:    `2px solid ${CATEGORY_COLOR[item.category]}`,
                cursor:        "pointer",
                display:       "flex",
                flexDirection: "column",
                gap:           "4px",
              }}
            >
              <div
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  gap:            "6px",
                }}
              >
                <span
                  style={{
                    fontFamily:    "var(--font-hud)",
                    fontSize:      "9px",
                    fontWeight:    700,
                    color:         CATEGORY_COLOR[item.category],
                    letterSpacing: "0.18em",
                  }}
                >
                  {item.category}
                  {item.isFresh && (
                    <span
                      style={{
                        marginLeft:  "6px",
                        padding:     "1px 5px",
                        background:  "rgba(0, 229, 255, 0.18)",
                        color:       "var(--color-investor)",
                        borderRadius: "3px",
                        fontSize:    "8px",
                        letterSpacing: "0.1em",
                      }}
                    >
                      NEW
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-hud)",
                    fontSize:   "9px",
                    color:      "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {nowMs !== null ? timeAgo(item.publishedAt, nowMs) : ""}
                </span>
              </div>

              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize:   "12.5px",
                  color:      "var(--text-main)",
                  lineHeight: 1.4,
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  fontFamily: "var(--font-hud)",
                  fontSize:   "9px",
                  color:      "var(--text-muted)",
                  letterSpacing: "0.05em",
                }}
              >
                via {item.publisher}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div
            data-testid="news-empty"
            style={{
              padding:    "20px",
              textAlign:  "center",
              fontFamily: "var(--font-body)",
              fontSize:   "12px",
              color:      "var(--text-disabled)",
              fontStyle:  "italic",
            }}
          >
            No items in this category.
          </div>
        )}
      </div>
    </aside>
  );
}
