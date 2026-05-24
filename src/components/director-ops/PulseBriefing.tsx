/**
 * PulseBriefing — Phase 5: Director Ops
 *
 * Left-column panel that presents the AI-generated Weekly Pulse.
 * Adapted from M2 PM Pulsator's ReportingWorkflow output (≤250-word
 * pulse, 3 quotes, 3 actions). For Phase 5 it consumes static mock
 * data via the `pulse` prop; Phase 9 will wire it to the Gemini API.
 *
 * Three rendering modes:
 *   1. EMPTY    — no pulse yet → CSV uploader + Generate button
 *   2. LOADING  — Generate clicked → amber pulsing skeleton
 *   3. LOADED   — full pulse display (themes / quotes / actions / word count)
 *
 * Spec: UI/UX §6.2 + Architecture Phase 5 Task 1
 */

"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WeeklyPulse } from "@/types";
import { ThemeBlock } from "./ThemeBlock";
import { CsvUploader } from "./CsvUploader";

interface PulseBriefingProps {
  pulse?: WeeklyPulse | null;
  isGenerating?: boolean;
  onGenerate?: () => void;
  onUploadCSV?: (file: File) => void;
  onActionToggle?: (idx: number, checked: boolean) => void;
  onThemeSelect?: (themeName: string) => void;
  checkedActions?: boolean[];
}

const WORD_LIMIT = 250;

export function PulseBriefing({
  pulse,
  isGenerating  = false,
  onGenerate,
  onUploadCSV,
  onActionToggle,
  onThemeSelect,
  checkedActions = [],
}: PulseBriefingProps) {
  const hasPulse = Boolean(pulse) && !isGenerating;
  const wordCount = pulse?.wordCount ?? 0;
  const wordCountOver = wordCount > WORD_LIMIT;

  const sortedThemes = useMemo(() => {
    if (!pulse) return [];
    return [...pulse.themes].sort(
      (a, b) => Number(b.isTopThree) - Number(a.isTopThree) || b.reviewCount - a.reviewCount,
    );
  }, [pulse]);

  return (
    <section
      data-testid="pulse-briefing"
      data-state={isGenerating ? "loading" : hasPulse ? "loaded" : "empty"}
      className="glass-panel"
      style={{
        padding:       "20px",
        borderRadius:  "var(--glass-radius, 20px)",
        display:       "flex",
        flexDirection: "column",
        gap:           "16px",
        minHeight:     "560px",
      }}
      aria-label="Weekly Pulse Briefing"
    >
      {/* ── Header ── */}
      <header
        style={{
          borderLeft: "3px solid var(--color-ops)",
          paddingLeft: "12px",
        }}
      >
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
          {">"} WEEKLY PULSE ASSESSMENT
        </h2>
        {hasPulse && pulse && (
          <p
            style={{
              fontFamily: "var(--font-hud)",
              fontSize:   "11px",
              color:      "var(--text-muted)",
              margin:     "4px 0 0",
              letterSpacing: "0.05em",
            }}
          >
            Week of {pulse.weekStart} • {pulse.reviewCount} reviews analyzed
          </p>
        )}
      </header>

      <AnimatePresence mode="wait">
        {/* ─────────────── EMPTY STATE ─────────────── */}
        {!isGenerating && !hasPulse && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            data-testid="pulse-empty-state"
          >
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize:   "13px",
                color:      "var(--text-muted)",
                lineHeight: 1.55,
              }}
            >
              No pulse generated yet. Upload a reviews CSV or click <strong>Generate Weekly Pulse</strong> to
              synthesize themes, representative quotes, and recommended actions from this week&apos;s
              feedback corpus.
            </p>

            <CsvUploader onFileAccepted={onUploadCSV} />

            <GenerateButton onClick={onGenerate} loading={false} />
          </motion.div>
        )}

        {/* ─────────────── LOADING STATE ─────────────── */}
        {isGenerating && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            data-testid="pulse-loading-state"
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{
                  duration: 1.4,
                  repeat:   Infinity,
                  delay:    i * 0.15,
                  ease:     "easeInOut",
                }}
                style={{
                  height:       "44px",
                  borderRadius: "10px",
                  background:   "rgba(255, 171, 0, 0.08)",
                  border:       "1px solid rgba(255, 171, 0, 0.15)",
                }}
              />
            ))}
            <p
              style={{
                fontFamily: "var(--font-hud)",
                fontSize:   "12px",
                color:      "var(--color-ops)",
                letterSpacing: "0.15em",
                marginTop: "8px",
                textAlign: "center",
              }}
            >
              ANALYZING REVIEWS...
            </p>
          </motion.div>
        )}

        {/* ─────────────── LOADED STATE ─────────────── */}
        {hasPulse && pulse && (
          <motion.div
            key="loaded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            data-testid="pulse-loaded-state"
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Summary paragraph */}
            <p
              data-testid="pulse-summary"
              style={{
                fontFamily: "var(--font-body)",
                fontSize:   "13px",
                color:      "var(--text-main)",
                lineHeight: 1.6,
                margin:     0,
              }}
            >
              {pulse.summaryText}
            </p>

            {/* Themes section */}
            <div>
              <h3 style={sectionHeading}>THEMES</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {sortedThemes.map((theme, idx) => (
                  <ThemeBlock key={theme.name} theme={theme} index={idx} onClick={onThemeSelect} />
                ))}
              </div>
            </div>

            {/* Quotes section */}
            <div>
              <h3 style={sectionHeading}>VOICE OF CUSTOMER</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {pulse.quotes.map((quote, i) => (
                  <blockquote
                    key={i}
                    data-testid="pulse-quote"
                    style={{
                      borderLeft:  "2px solid var(--color-ops)",
                      paddingLeft: "14px",
                      margin:      0,
                      position:    "relative",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize:   "24px",
                        color:      "var(--color-ops)",
                        opacity:    0.5,
                        lineHeight: 1,
                        marginRight: "4px",
                      }}
                    >
                      ❝
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize:   "14px",
                        color:      "var(--text-muted)",
                        fontStyle:  "italic",
                        lineHeight: 1.55,
                      }}
                    >
                      {quote}
                    </span>
                  </blockquote>
                ))}
              </div>
            </div>

            {/* Action ideas */}
            <div>
              <h3 style={sectionHeading}>RECOMMENDED ACTIONS</h3>
              <ul
                style={{
                  listStyle:  "none",
                  padding:    0,
                  margin:     0,
                  display:    "flex",
                  flexDirection: "column",
                  gap:        "8px",
                }}
              >
                {pulse.actionIdeas.map((idea, i) => {
                  const checked = checkedActions[i] ?? false;
                  return (
                    <li
                      key={i}
                      data-testid="pulse-action"
                      style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}
                    >
                      <label
                        style={{
                          display:    "flex",
                          alignItems: "flex-start",
                          gap:        "10px",
                          cursor:     "pointer",
                          fontFamily: "var(--font-body)",
                          fontSize:   "14px",
                          color:      "var(--text-main)",
                          lineHeight: 1.5,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => onActionToggle?.(i, e.target.checked)}
                          aria-label={`Action ${i + 1}: ${idea}`}
                          style={{
                            appearance: "none",
                            width:      "16px",
                            height:     "16px",
                            border:     "1.5px solid var(--color-ops)",
                            borderRadius: "3px",
                            background: checked ? "var(--color-ops)" : "transparent",
                            cursor:     "pointer",
                            marginTop:  "2px",
                            position:   "relative",
                            flexShrink: 0,
                            boxShadow:  checked ? "0 0 6px rgba(255, 171, 0, 0.5)" : "none",
                          }}
                        />
                        <span>{idea}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Word count + Generate again */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                data-testid="pulse-word-count"
                data-over={wordCountOver ? "true" : "false"}
                style={{
                  fontFamily: "var(--font-hud)",
                  fontSize:   "12px",
                  color:      wordCountOver ? "var(--color-error)" : "var(--text-muted)",
                  letterSpacing: "0.05em",
                }}
              >
                Words: {wordCount}/{WORD_LIMIT}
              </span>

              <GenerateButton
                onClick={onGenerate}
                loading={false}
                label="REGENERATE"
                compact
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── Section heading shared style ─────────────────────────────── */
const sectionHeading: React.CSSProperties = {
  fontFamily:    "var(--font-hud)",
  fontSize:      "11px",
  fontWeight:    600,
  color:         "var(--color-ops)",
  letterSpacing: "0.2em",
  margin:        "0 0 10px",
};

/* ── Generate button (neumorphic, amber) ──────────────────────── */
interface GenerateButtonProps {
  onClick?: () => void;
  loading: boolean;
  label?: string;
  compact?: boolean;
}

function GenerateButton({
  onClick,
  loading,
  label   = "GENERATE WEEKLY PULSE",
  compact = false,
}: GenerateButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      data-testid="pulse-generate-button"
      whileHover={loading ? undefined : { scale: 1.01 }}
      whileTap={loading ? undefined : { scale: 0.985 }}
      style={{
        width:        compact ? "auto" : "100%",
        padding:      compact ? "8px 16px" : "12px 18px",
        background:   "linear-gradient(135deg, rgba(255,171,0,0.15) 0%, rgba(255,171,0,0.05) 100%)",
        border:       "1px solid rgba(255, 171, 0, 0.5)",
        borderRadius: "10px",
        color:        "var(--color-ops)",
        fontFamily:   "var(--font-hud)",
        fontSize:     compact ? "11px" : "13px",
        fontWeight:   600,
        letterSpacing: "0.15em",
        cursor:       loading ? "wait" : "pointer",
        boxShadow:    loading
          ? "0 0 20px rgba(255, 171, 0, 0.5)"
          : "0 0 10px rgba(255, 171, 0, 0.2)",
        opacity:      loading ? 0.7 : 1,
        transition:   "box-shadow 0.3s ease, opacity 0.2s ease",
      }}
    >
      {loading ? "ANALYZING REVIEWS..." : label}
    </motion.button>
  );
}
