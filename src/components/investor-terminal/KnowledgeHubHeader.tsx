/**
 * KnowledgeHubHeader — Phase 5 Enhancement
 *
 * Branded header for the Investor Terminal page.
 *  - Title:    "GROWW INVESTOR KNOWLEDGE HUB"
 *  - Tagline:  "Compliant • Cited • Conversational"
 *  - Greeting: Time-aware ("Good morning / afternoon / evening, Investor")
 *  - Status pills: LIVE indicator, knowledge base size, SEBI disclosure note
 *
 * Replaces the previous temporary "INVESTOR TERMINAL" text label.
 */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface KnowledgeHubHeaderProps {
  investorName?: string;
  fundCount?: number;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function KnowledgeHubHeader({
  investorName = "Investor",
  fundCount    = 20,
}: KnowledgeHubHeaderProps) {
  // Defer greeting computation to the client to avoid hydration mismatch
  const [greeting, setGreeting] = useState<string>("Welcome");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <motion.header
      data-testid="knowledge-hub-header"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        textAlign:      "center",
        padding:        "6px 24px 4px",
        gap:            "6px",
        maxWidth:       "880px",
        margin:         "0 auto",
      }}
    >
      {/* ── Status pills row ── */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        "10px",
          flexWrap:   "wrap",
          justifyContent: "center",
          marginBottom:   "4px",
        }}
      >
        <span
          style={{
            display:       "inline-flex",
            alignItems:    "center",
            gap:           "6px",
            fontFamily:    "var(--font-hud)",
            fontSize:      "10px",
            color:         "var(--color-investor)",
            background:    "rgba(0, 229, 255, 0.10)",
            border:        "1px solid rgba(0, 229, 255, 0.35)",
            padding:       "3px 10px",
            borderRadius:  "999px",
            letterSpacing: "0.18em",
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-investor)" }}
          />
          LIVE · {fundCount} FUNDS
        </span>

        <span
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "10px",
            color:         "var(--color-success)",
            background:    "rgba(16, 185, 129, 0.06)",
            border:        "1px solid rgba(16, 185, 129, 0.25)",
            padding:       "3px 10px",
            borderRadius:  "999px",
            letterSpacing: "0.18em",
          }}
        >
          ✓ FACTS-ONLY · ZERO ADVICE
        </span>

        <span
          style={{
            fontFamily:    "var(--font-hud)",
            fontSize:      "10px",
            color:         "var(--text-muted)",
            background:    "rgba(255, 255, 255, 0.04)",
            border:        "1px solid rgba(255, 255, 255, 0.1)",
            padding:       "3px 10px",
            borderRadius:  "999px",
            letterSpacing: "0.18em",
          }}
        >
          SEBI-DISCLOSED
        </span>
      </div>

      {/* ── Title ── */}
      <h1
        style={{
          fontFamily:    "var(--font-display)",
          fontSize:      "clamp(22px, 3.4vw, 32px)",
          fontWeight:    700,
          color:         "var(--text-main)",
          letterSpacing: "0.12em",
          textShadow:    "0 0 18px rgba(0, 229, 255, 0.25)",
          margin:        0,
          lineHeight:    1.15,
        }}
      >
        GROWW <span style={{ color: "var(--color-investor)" }}>INVESTOR</span> KNOWLEDGE HUB
      </h1>

      {/* ── Tagline ── */}
      <p
        style={{
          fontFamily:    "var(--font-hud)",
          fontSize:      "11px",
          color:         "var(--text-muted)",
          letterSpacing: "0.32em",
          margin:        0,
        }}
      >
        COMPLIANT · CITED · CONVERSATIONAL
      </p>

      {/* ── Time-aware greeting ── */}
      <motion.p
        key={greeting}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        data-testid="knowledge-hub-greeting"
        style={{
          fontFamily: "var(--font-body)",
          fontSize:   "14px",
          color:      "var(--text-main)",
          margin:     "8px 0 0",
          opacity:    0.85,
        }}
      >
        {greeting}, <span style={{ color: "var(--color-investor)", fontWeight: 600 }}>{investorName}</span>.
        Ask anything about{" "}
        <span style={{ color: "var(--color-investor)" }}>{fundCount} curated funds</span> — every answer
        is grounded in approved sources.
      </motion.p>
    </motion.header>
  );
}
