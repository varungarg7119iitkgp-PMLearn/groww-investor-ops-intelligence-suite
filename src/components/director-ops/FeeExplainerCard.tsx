/**
 * FeeExplainerCard — Phase 12
 *
 * Standalone Fee Explainer surface inside Director Ops. Per Req 7:
 *   - <=6 bullets
 *   - exactly 2 source URLs
 *   - neutral tone
 *   - "Last checked: YYYY-MM-DD" footer
 *
 * Behaviour:
 *   - Scenario picker (5 options: expense_ratio, exit_load, tcs,
 *     brokerage, account_maintenance) → GET /api/fee-explainer?type=<x>
 *   - Renders bullets in the "Stark-Glass HUD" style consistent with
 *     PulseBriefing / HitlQueue.
 *
 * Spec: UI/UX §6.2 "Fee Explainer" + Architecture Phase 12 Task 7.
 */

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FeeExplainer, FeeScenarioType } from "@/types";

interface FeeExplainerCardProps {
  defaultScenario?: FeeScenarioType;
}

const SCENARIOS: { id: FeeScenarioType; label: string }[] = [
  { id: "expense_ratio",        label: "EXPENSE RATIO"   },
  { id: "exit_load",            label: "EXIT LOAD"       },
  { id: "tcs",                  label: "TCS"             },
  { id: "brokerage",            label: "BROKERAGE"       },
  { id: "account_maintenance",  label: "MAINTENANCE"     },
];

export function FeeExplainerCard({ defaultScenario = "expense_ratio" }: FeeExplainerCardProps) {
  const [scenario, setScenario] = useState<FeeScenarioType>(defaultScenario);
  const [data,     setData]     = useState<FeeExplainer | null>(null);
  const [loading,  setLoading]  = useState<boolean>(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/fee-explainer?type=${scenario}`)
      .then(async (r) => {
        const json = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(json?.error ?? `Request failed: ${r.status}`);
          setData(null);
        } else {
          setData(json.explainer ?? null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [scenario]);

  return (
    <section
      data-testid="fee-explainer-card"
      className="glass-panel"
      style={{
        padding:       "20px",
        borderRadius:  "var(--glass-radius, 20px)",
        display:       "flex",
        flexDirection: "column",
        gap:           "16px",
      }}
      aria-label="Fee Explainer"
    >
      <header style={{ borderLeft: "3px solid var(--color-ops)", paddingLeft: "12px" }}>
        <h2
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "14px",
            fontWeight:    600,
            color:         "var(--color-ops)",
            letterSpacing: "0.1em",
            margin:        0,
          }}
        >
          {">"} FEE EXPLAINER
        </h2>
        <p
          style={{
            fontFamily: "var(--font-hud)",
            fontSize:   "10px",
            color:      "var(--text-muted)",
            margin:     "4px 0 0",
            letterSpacing: "0.05em",
          }}
        >
          Director-side reference for the 5 fee scenarios.
        </p>
      </header>

      {/* Scenario selector */}
      <div role="tablist" aria-label="Fee scenarios" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {SCENARIOS.map((s) => {
          const active = s.id === scenario;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`fee-scenario-${s.id}`}
              onClick={() => setScenario(s.id)}
              style={{
                padding:       "6px 10px",
                fontFamily:    "var(--font-hud)",
                fontSize:      "10px",
                letterSpacing: "0.15em",
                cursor:        "pointer",
                borderRadius:  "6px",
                border:        active
                  ? "1px solid rgba(255, 171, 0, 0.7)"
                  : "1px solid rgba(255, 171, 0, 0.25)",
                background:    active
                  ? "rgba(255, 171, 0, 0.12)"
                  : "transparent",
                color:         active ? "var(--color-ops)" : "var(--text-muted)",
                boxShadow:     active ? "0 0 6px rgba(255,171,0,0.3)" : "none",
                transition:    "all 0.15s ease",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              fontFamily:    "var(--font-hud)",
              fontSize:      "12px",
              color:         "var(--text-muted)",
              letterSpacing: "0.15em",
              padding:       "12px 0",
              textAlign:     "center",
            }}
          >
            LOADING…
          </motion.div>
        )}

        {error && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="alert"
            style={{
              fontFamily: "var(--font-body)",
              fontSize:   "12px",
              color:      "var(--color-error)",
              padding:    "10px 0",
            }}
          >
            {error}
          </motion.div>
        )}

        {data && !loading && !error && (
          <motion.div
            key={`fe-${scenario}`}
            data-testid="fee-explainer-content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <ul
              data-testid="fee-explainer-bullets"
              style={{
                listStyle:     "none",
                padding:       0,
                margin:        0,
                display:       "flex",
                flexDirection: "column",
                gap:           "8px",
              }}
            >
              {data.bullets.map((b, i) => (
                <li
                  key={i}
                  data-testid="fee-explainer-bullet"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize:   "13px",
                    color:      "var(--text-main)",
                    lineHeight: 1.55,
                    paddingLeft: "14px",
                    borderLeft:  "2px solid rgba(255, 171, 0, 0.45)",
                  }}
                >
                  {b}
                </li>
              ))}
            </ul>

            <div>
              <div
                style={{
                  fontFamily:    "var(--font-hud)",
                  fontSize:      "10px",
                  color:         "var(--text-muted)",
                  letterSpacing: "0.2em",
                  marginBottom:  "4px",
                }}
              >
                SOURCES
              </div>
              <ul
                data-testid="fee-explainer-sources"
                style={{
                  listStyle: "none",
                  padding:   0,
                  margin:    0,
                  display:   "flex",
                  flexDirection: "column",
                  gap:       "4px",
                }}
              >
                {data.sources.map((url) => (
                  <li
                    key={url}
                    data-testid="fee-explainer-source"
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize:   "11px",
                      color:      "var(--color-investor)",
                      wordBreak:  "break-all",
                    }}
                  >
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div
              data-testid="fee-explainer-last-checked"
              style={{
                fontFamily:    "var(--font-hud)",
                fontSize:      "10px",
                color:         "var(--text-disabled)",
                letterSpacing: "0.15em",
                marginTop:     "4px",
              }}
            >
              Last checked: {data.lastChecked}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
