/**
 * scripts/eval-ux.ts — Phase 12 UX Structure Eval (Tier 2)
 *
 * Runs the pulse-generation route end-to-end against the live Gemini
 * API (NOT a mock) and asserts the Req 6 structural constraints on
 * three dataset sizes (15 / 50 / 100 reviews). Mirrors the eval-rag.ts
 * pattern: standalone, runnable, dependency-free.
 *
 * Usage:
 *   npx tsx scripts/eval-ux.ts
 *
 * Exit code:
 *   0 → gate PASS
 *   1 → gate FAIL or runtime error
 *
 * NOTE: this script ALWAYS uses `reviewsOverride` so it never touches
 * Supabase — it is safe to run in any environment with just GEMINI_API_KEY.
 */

/* eslint-disable no-console */

import { POST as pulseGenerate } from "../src/app/api/pulse/generate/route";
import type { WeeklyPulse } from "../src/types";

// Load .env.local using native Node env-file support (Node 21.7+ ships
// `process.loadEnvFile`; falls back to noop on older runtimes).
{
  const proc = process as unknown as { loadEnvFile?: (path: string) => void };
  if (typeof proc.loadEnvFile === "function") {
    try { proc.loadEnvFile(".env.local"); } catch { /* ok */ }
  }
}

interface Verdict {
  dataset: number;
  attempts: number;
  pass: boolean;
  wordCount: number;
  quoteCount: number;
  actionCount: number;
  themeCount: number;
  topThreeCount: number;
  piiHits: number;
  error?: string;
}

const PII_RE = [
  /[A-Z]{5}\d{4}[A-Z]/,                                       // PAN
  /\b\d{4}\s?\d{4}\s?\d{4}\b/,                                // Aadhaar
  /\b\d{10}\b/,                                                // 10-digit phone
  /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}/,         // email
];

function countPII(strings: string[]): number {
  let hits = 0;
  for (const s of strings) {
    for (const re of PII_RE) {
      if (re.test(s)) { hits++; break; }
    }
  }
  return hits;
}

function buildReviews(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    text:       `Review ${i + 1}: KYC re-verification asked again this week. Statement format also changed. SIP autodebit failed once.`,
    starRating: 1 + (i % 5),
    sentiment:  (i % 3 === 0 ? "negative" : i % 3 === 1 ? "neutral" : "positive") as "negative" | "neutral" | "positive",
    reviewDate: "2026-05-20",
  }));
}

async function evalDataset(size: number): Promise<Verdict> {
  const reviews = buildReviews(size);
  const req = new Request("http://localhost/api/pulse/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewsOverride: reviews }),
  });
  const res = await pulseGenerate(req);
  const json = await res.json();
  if (res.status !== 200 || !json.pulse) {
    return {
      dataset: size,
      attempts: json.attempts ?? 0,
      pass: false,
      wordCount: 0, quoteCount: 0, actionCount: 0, themeCount: 0, topThreeCount: 0, piiHits: 0,
      error: json.error ?? `status ${res.status}`,
    };
  }
  const p = json.pulse as WeeklyPulse;
  const allStrings = [
    p.summaryText,
    ...p.quotes,
    ...p.actionIdeas,
    ...p.themes.map((t) => t.name),
  ];
  const piiHits = countPII(allStrings);

  const pass =
    p.wordCount <= 250 &&
    p.quotes.length === 3 &&
    p.actionIdeas.length === 3 &&
    p.themes.length >= 1 &&
    p.themes.length <= 5 &&
    p.themes.filter((t) => t.isTopThree).length === Math.min(p.themes.length, 3) &&
    piiHits === 0;

  return {
    dataset: size,
    attempts: json.attempts ?? 1,
    pass,
    wordCount:     p.wordCount,
    quoteCount:    p.quotes.length,
    actionCount:   p.actionIdeas.length,
    themeCount:    p.themes.length,
    topThreeCount: p.themes.filter((t) => t.isTopThree).length,
    piiHits,
  };
}

async function main() {
  console.log("[Phase 12 UX Eval] Running pulse-generation against live Gemini…");
  console.log("[Phase 12 UX Eval] Dataset sizes: 15 / 50 / 100\n");

  const results: Verdict[] = [];
  for (const n of [15, 50, 100]) {
    console.log(`[Phase 12 UX Eval]   → dataset = ${n} reviews…`);
    try {
      const v = await evalDataset(n);
      results.push(v);
      console.log(
        `   words=${v.wordCount}/250  quotes=${v.quoteCount}  actions=${v.actionCount}  themes=${v.themeCount}` +
          `  topThree=${v.topThreeCount}  pii=${v.piiHits}  attempts=${v.attempts}  →  ${v.pass ? "PASS" : "FAIL"}`,
      );
      if (v.error) console.log(`   error: ${v.error}`);
    } catch (err) {
      console.error(`   threw: ${err instanceof Error ? err.message : String(err)}`);
      results.push({
        dataset: n,
        attempts: 0,
        pass: false,
        wordCount: 0, quoteCount: 0, actionCount: 0, themeCount: 0, topThreeCount: 0, piiHits: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.log("\n[Phase 12 UX Eval] Suite summary");
  console.log(`  total=${results.length}  pass=${results.filter((r) => r.pass).length}  fail=${results.filter((r) => !r.pass).length}`);

  const passed = results.every((r) => r.pass);
  console.log(`  GATE: ${passed ? "PASS ✅" : "FAIL ❌"}`);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error("[Phase 12 UX Eval] Fatal:", err);
  process.exit(1);
});
