/**
 * OpsSidebar — Phase 5 Enhancement
 *
 * Sticky left-rail navigation for the Director Ops console. Mimics the
 * Pulsator app's sidebar pattern: vertical column of icon buttons that
 * scroll to / activate named sections of the dashboard.
 *
 * Each item exposes a stable `data-section` attribute so we can wire
 * the active state to scroll position later (Phase 6).
 */

"use client";

import { motion } from "framer-motion";

export type OpsSection =
  | "PULSE"
  | "APPROVALS"
  | "CATEGORIES"
  | "SENTIMENT"
  | "TESTIMONIALS"
  | "INTEGRATIONS";

interface OpsSidebarProps {
  active?:   OpsSection;
  onSelect?: (section: OpsSection) => void;
}

const ITEMS: { id: OpsSection; label: string; icon: React.ReactNode; available: boolean; phaseHint?: string }[] = [
  {
    id:    "PULSE",
    label: "Weekly Pulse",
    available: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 12h4l3-7 4 14 3-7h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    id:    "APPROVALS",
    label: "HITL Approvals",
    available: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id:    "CATEGORIES",
    label: "Category Mix",
    available: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
      </svg>
    ),
  },
  {
    id:    "SENTIMENT",
    label: "Sentiment · Reviews + Chat",
    available: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 17 9 11 14 16 21 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="9" cy="11" r="1.6" fill="currentColor" />
        <circle cx="14" cy="16" r="1.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    id:    "TESTIMONIALS",
    label: "Testimonials",
    available: false,
    phaseHint: "Phase 12",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 6h14v10H8l-3 3V6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    id:    "INTEGRATIONS",
    label: "Integrations",
    available: false,
    phaseHint: "Phase 13",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M14 7h3a4 4 0 1 1 0 8h-3M10 7H7a4 4 0 1 0 0 8h3M9 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
];

export function OpsSidebar({
  active   = "PULSE",
  onSelect,
}: OpsSidebarProps) {
  return (
    <nav
      data-testid="ops-sidebar"
      aria-label="Director Ops sections"
      style={{
        position:       "sticky",
        top:            "72px",
        alignSelf:      "flex-start",
        display:        "flex",
        flexDirection:  "column",
        gap:            "6px",
        padding:        "16px 12px",
        borderRadius:   "12px",
        background:     "rgba(8, 12, 22, 0.6)",
        border:         "1px solid rgba(255, 255, 255, 0.06)",
        minHeight:      "100%",
        width:          "200px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          fontFamily:    "var(--font-hud)",
          fontSize:      "9px",
          color:         "var(--text-muted)",
          letterSpacing: "0.22em",
          padding:       "4px 8px 8px",
          borderBottom:  "1px solid rgba(255, 255, 255, 0.05)",
          marginBottom:  "6px",
        }}
      >
        {">"} NAV
      </div>

      {ITEMS.map((item) => {
        const isActive    = active === item.id;
        const isAvailable = item.available;

        return (
          <motion.button
            key={item.id}
            type="button"
            data-testid={`sidebar-${item.id.toLowerCase()}`}
            data-section={item.id}
            data-active={isActive}
            data-available={isAvailable}
            disabled={!isAvailable}
            onClick={() => isAvailable && onSelect?.(item.id)}
            whileHover={isAvailable ? { x: 2 } : undefined}
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            "10px",
              padding:        "8px 10px",
              borderRadius:   "8px",
              border:         "1px solid transparent",
              borderLeft:     isActive
                ? "3px solid var(--color-ops)"
                : "3px solid transparent",
              background:     isActive
                ? "rgba(255, 171, 0, 0.10)"
                : "transparent",
              color:          !isAvailable
                ? "var(--text-disabled)"
                : isActive
                ? "var(--color-ops)"
                : "var(--text-muted)",
              fontFamily:     "var(--font-hud)",
              fontSize:       "11px",
              fontWeight:     isActive ? 700 : 500,
              letterSpacing:  "0.08em",
              textAlign:      "left",
              cursor:         isAvailable ? "pointer" : "not-allowed",
              boxShadow:      isActive ? "0 0 8px rgba(255, 171, 0, 0.15)" : "none",
              transition:     "background 0.15s ease, color 0.15s ease",
            }}
          >
            <span style={{ width: "16px", display: "inline-flex", alignItems: "center" }}>
              {item.icon}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {!isAvailable && item.phaseHint && (
              <span
                style={{
                  fontSize:      "8px",
                  letterSpacing: "0.1em",
                  color:         "var(--text-disabled)",
                  padding:       "1px 5px",
                  border:        "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius:  "3px",
                  background:    "rgba(255, 255, 255, 0.02)",
                }}
              >
                {item.phaseHint.replace("Phase ", "P").toUpperCase()}
              </span>
            )}
          </motion.button>
        );
      })}

      <div
        style={{
          marginTop:     "auto",
          fontFamily:    "var(--font-hud)",
          fontSize:      "9px",
          color:         "var(--text-disabled)",
          letterSpacing: "0.15em",
          textAlign:     "center",
          padding:       "12px 4px 4px",
          borderTop:     "1px solid rgba(255, 255, 255, 0.04)",
        }}
      >
        PHASE 5 SHELL
      </div>
    </nav>
  );
}
