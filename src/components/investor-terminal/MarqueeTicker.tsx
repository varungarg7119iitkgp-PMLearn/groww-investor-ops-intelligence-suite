/**
 * MarqueeTicker — Phase 4: Investor Terminal UI Shell
 *
 * Scrolling 20-fund marquee bar at the top of the Investor Terminal.
 * Spec: UI/UX §5.2, Architecture Phase 4 Task 1.
 *
 * - 40px height, CSS-animation driven (60fps, no JS intervals)
 * - Seamless loop: renders 2× the item array; translateX(-50%) = one full width
 * - Positive change: emerald (#00E676) with ▲ arrow
 * - Negative change: crimson (#FF1744) with ▼ arrow
 * - Click pre-fills Smart_Sync query via onItemClick callback
 * - Pauses on hover
 * - Ref from M3 FinancialTicker.tsx infinite-scroll pattern
 */

"use client";

import { memo } from "react";
import type { TickerItem } from "@/types";

/* ── Mock data: 20 funds from M1 fund universe ─────────────── */
export const MOCK_TICKER_DATA: TickerItem[] = [
  { fundId: "hdfc-hyb",   symbol: "HDFC-HYB",   name: "HDFC Hybrid Equity",             nav: 98.23,  navChange: 1.45,   navChangePercent: 1.50,  category: "hybrid",    isPositive: true  },
  { fundId: "icici-psu",  symbol: "ICICI-PSU",  name: "ICICI Pru PSU Equity",           nav: 45.67,  navChange: -0.34,  navChangePercent: -0.74, category: "equity",    isPositive: false },
  { fundId: "sbi-psu",    symbol: "SBI-PSU",    name: "SBI PSU Direct",                 nav: 32.10,  navChange: 2.10,   navChangePercent: 7.00,  category: "equity",    isPositive: true  },
  { fundId: "absl-cr",    symbol: "ABSL-CR",    name: "Aditya Birla Credit Risk",       nav: 15.23,  navChange: 0.12,   navChangePercent: 0.79,  category: "debt",      isPositive: true  },
  { fundId: "nip-multi",  symbol: "NIP-MULTI",  name: "Nippon Multi Asset",             nav: 22.45,  navChange: -0.56,  navChangePercent: -2.43, category: "hybrid",    isPositive: false },
  { fundId: "dsp-cr",     symbol: "DSP-CR",     name: "DSP Credit Risk",                nav: 18.90,  navChange: 0.78,   navChangePercent: 4.30,  category: "debt",      isPositive: true  },
  { fundId: "hdfc-silv",  symbol: "HDFC-SILV",  name: "HDFC Silver ETF FoF",            nav: 25.60,  navChange: 1.20,   navChangePercent: 4.92,  category: "commodity", isPositive: true  },
  { fundId: "icici-silv", symbol: "ICICI-SILV", name: "ICICI Pru Silver ETF FoF",       nav: 24.89,  navChange: 0.89,   navChangePercent: 3.71,  category: "commodity", isPositive: true  },
  { fundId: "sbi-child",  symbol: "SBI-CHILD",  name: "SBI Magnum Children's Benefit",  nav: 108.45, navChange: -1.23,  navChangePercent: -1.12, category: "hybrid",    isPositive: false },
  { fundId: "absl-med",   symbol: "ABSL-MED",   name: "Aditya Birla Medium Term",       nav: 42.56,  navChange: 0.34,   navChangePercent: 0.80,  category: "debt",      isPositive: true  },
  { fundId: "hdfc-arb",   symbol: "HDFC-ARB",   name: "HDFC Income Plus Arb FoF",       nav: 12.78,  navChange: 0.05,   navChangePercent: 0.39,  category: "hybrid",    isPositive: true  },
  { fundId: "icici-ret",  symbol: "ICICI-RET",  name: "ICICI Pru Retirement Hybrid",    nav: 56.34,  navChange: 1.56,   navChangePercent: 2.84,  category: "hybrid",    isPositive: true  },
  { fundId: "absl-psu",   symbol: "ABSL-PSU",   name: "Aditya Birla PSU Equity",        nav: 38.90,  navChange: -0.90,  navChangePercent: -2.26, category: "equity",    isPositive: false },
  { fundId: "nip-silv",   symbol: "NIP-SILV",   name: "Nippon Silver ETF FoF",          nav: 26.12,  navChange: 0.92,   navChangePercent: 3.65,  category: "commodity", isPositive: true  },
  { fundId: "absl-silv",  symbol: "ABSL-SILV",  name: "Aditya Birla Silver ETF FoF",    nav: 25.10,  navChange: 0.75,   navChangePercent: 3.08,  category: "commodity", isPositive: true  },
  { fundId: "axis-silv",  symbol: "AXIS-SILV",  name: "Axis Silver FoF",                nav: 23.45,  navChange: -0.23,  navChangePercent: -0.97, category: "commodity", isPositive: false },
  { fundId: "inv-psu",    symbol: "INV-PSU",    name: "Invesco PSU Equity",             nav: 44.23,  navChange: 1.89,   navChangePercent: 4.46,  category: "equity",    isPositive: true  },
  { fundId: "mot-bse",    symbol: "MOT-BSE",    name: "Motilal BSE Enhanced Value",     nav: 78.34,  navChange: 2.45,   navChangePercent: 3.22,  category: "equity",    isPositive: true  },
  { fundId: "qnt-multi",  symbol: "QNT-MULTI",  name: "Quant Multi Asset",              nav: 92.67,  navChange: -1.45,  navChangePercent: -1.54, category: "hybrid",    isPositive: false },
  { fundId: "hsbc-cr",    symbol: "HSBC-CR",    name: "HSBC Credit Risk",               nav: 16.78,  navChange: 0.23,   navChangePercent: 1.39,  category: "debt",      isPositive: true  },
];

/* ── Single ticker item ─────────────────────────────────────── */
interface TickerItemProps {
  item: TickerItem;
  onItemClick?: (fundName: string) => void;
}

const TickerChip = memo(function TickerChip({ item, onItemClick }: TickerItemProps) {
  const isPositive = item.navChange >= 0;
  const arrow      = isPositive ? "▲" : "▼";
  const color      = isPositive ? "var(--success)" : "var(--error)";
  const sign       = isPositive ? "+" : "";

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 px-3 shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
      style={{
        fontFamily: "var(--font-hud)",
        fontSize: "13px",
        fontWeight: 500,
        marginRight: "48px",
        background: "none",
        border: "none",
        color: "var(--text-secondary)",
        lineHeight: 1,
      }}
      onClick={() => onItemClick?.(item.name)}
      aria-label={`${item.name} NAV ${item.nav} change ${item.navChange}`}
    >
      {/* Fund symbol */}
      <span style={{ color: "var(--text-muted)", fontSize: "11px", opacity: 0.7 }}>
        {item.symbol}
      </span>

      {/* Fund short name */}
      <span style={{ color: "var(--text-secondary)" }}>
        {item.name.length > 22 ? item.name.slice(0, 22) + "…" : item.name}
      </span>

      {/* NAV value */}
      <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
        ₹{item.nav.toFixed(2)}
      </span>

      {/* Change */}
      <span style={{ color }}>
        {arrow} {sign}{item.navChange.toFixed(2)} ({sign}{item.navChangePercent.toFixed(2)}%)
      </span>

      {/* separator */}
      <span style={{ color: "rgba(0,229,255,0.2)", marginLeft: "12px" }}>|</span>
    </button>
  );
});

/* ── MarqueeTicker component ────────────────────────────────── */
interface MarqueeTickerProps {
  items?: TickerItem[];
  onItemClick?: (fundName: string) => void;
  /** override animation duration (seconds). Default 60. */
  animationDuration?: number;
}

export function MarqueeTicker({
  items = MOCK_TICKER_DATA,
  onItemClick,
  animationDuration = 60,
}: MarqueeTickerProps) {
  /* duplicate for seamless loop */
  const doubled = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden shrink-0"
      style={{
        height: "40px",
        background: "rgba(0, 0, 0, 0.6)",
        borderBottom: "1px solid rgba(0, 229, 255, 0.1)",
        display: "flex",
        alignItems: "center",
        zIndex: 20,
      }}
      role="marquee"
      aria-label="Live mutual fund NAV ticker"
    >
      {/* Left fade mask */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 z-10"
        style={{
          background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 100%)",
        }}
      />

      {/* Scrolling track — rendered 2× for seamless loop */}
      <div
        className="ticker-track"
        style={{ animationDuration: `${animationDuration}s` }}
        aria-hidden="true"
      >
        {doubled.map((item, index) => (
          <TickerChip
            key={`${item.symbol}-${index}`}
            item={item}
            onItemClick={onItemClick}
          />
        ))}
      </div>

      {/* Right fade mask */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 z-10"
        style={{
          background: "linear-gradient(to left, rgba(0,0,0,0.6) 0%, transparent 100%)",
        }}
      />

      {/* Live indicator */}
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-20 pointer-events-none"
        aria-label="Live data"
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: "var(--success)", boxShadow: "0 0 6px var(--success)" }}
        />
        <span
          style={{
            fontFamily: "var(--font-hud)",
            fontSize: "10px",
            color: "var(--text-tertiary)",
            letterSpacing: "0.08em",
          }}
        >
          LIVE
        </span>
      </div>
    </div>
  );
}
