/**
 * scripts/eval-ux.ts — Phase 12 / Phase 15 UX Structure Eval
 *
 * Usage: npx tsx scripts/eval-ux.ts
 * Phase 15: EVAL_PHASE=15 (default for final run)
 */

/* eslint-disable no-console */

import { POST as pulseGenerate } from "../src/app/api/pulse/generate/route";
import { recordEvalSuite, summarizeSuite } from "../src/lib/eval-utils";
import { getPromptForState } from "../src/lib/state-machine";
import type { EvalResult, WeeklyPulse } from "../src/types";

{
  const proc = process as unknown as { loadEnvFile?: (path: string) => void };
  if (typeof proc.loadEnvFile === "function") {
    try { proc.loadEnvFile(".env.local"); } catch { /* ok */ }
  }
}

const PHASE = Number(process.env.EVAL_PHASE ?? 12);

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
  topTheme?: string;
  error?: string;
}

const PII_RE = [
  /[A-Z]{5}\d{4}[A-Z]/,
  /\b\d{4}\s?\d{4}\s?\d{4}\b/,
  /\b\d{10}\b/,
  /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}/,
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
    text:       `Review ${i + 1}: Login Issues and KYC re-verification asked again. Statement format changed. SIP autodebit failed.`,
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
  const topTheme = p.themes?.[0]?.name;

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
    topTheme,
  };
}

export async function runUxEvalSuite(phase = PHASE): Promise<{
  results: EvalResult[];
  summary: ReturnType<typeof summarizeSuite>;
  themeMentionPass: boolean;
  themeUsed?: string;
}> {
  console.log(`[Phase ${phase} UX Eval] Running pulse-generation against live Gemini…`);
  const verdicts: Verdict[] = [];

  for (const n of [15, 50, 100]) {
    console.log(`[Phase ${phase} UX Eval]   → dataset = ${n} reviews…`);
    try {
      const v = await evalDataset(n);
      verdicts.push(v);
      console.log(
        `   words=${v.wordCount}/250  quotes=${v.quoteCount}  actions=${v.actionCount}  themes=${v.themeCount}` +
          `  →  ${v.pass ? "PASS" : "FAIL"}`,
      );
    } catch (err) {
      verdicts.push({
        dataset: n, attempts: 0, pass: false,
        wordCount: 0, quoteCount: 0, actionCount: 0, themeCount: 0, topThreeCount: 0, piiHits: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const themeUsed = verdicts.find((v) => v.topTheme)?.topTheme ?? "Login Issues";
  const greetingPrompt = getPromptForState("greeting", { topTheme: themeUsed });
  const themeMentionPass = greetingPrompt.toLowerCase().includes(themeUsed.toLowerCase());
  const nowIso = new Date().toISOString();

  const results: EvalResult[] = verdicts.map((v) => ({
    eval_type: "ux_structure",
    eval_name: `P${phase}-UX-${v.dataset}reviews`,
    input: `${v.dataset} synthetic reviews`,
    expected: "≤250 words, 3 quotes, 3 actions, PII-free",
    actual: `words=${v.wordCount} quotes=${v.quoteCount} actions=${v.actionCount} pii=${v.piiHits}`,
    score: v.pass ? 1 : 0,
    pass_fail: v.pass,
    phase,
    timestamp: nowIso,
    notes: v.error,
  }));

  results.push({
    eval_type: "ux_structure",
    eval_name: `P${phase}-UX-theme-greeting`,
    input: `topTheme=${themeUsed}`,
    expected: "Greeting prompt mentions top theme",
    actual: themeMentionPass ? "theme present in prompt" : "theme missing",
    score: themeMentionPass ? 1 : 0,
    pass_fail: themeMentionPass,
    phase,
    timestamp: nowIso,
  });

  const summary = summarizeSuite("ux_structure", phase, results);
  await recordEvalSuite(results);

  return { results, summary, themeMentionPass, themeUsed };
}

async function main() {
  const { summary, themeMentionPass } = await runUxEvalSuite(PHASE);
  console.log("\n[UX Eval] Suite summary");
  console.log(`  total=${summary.totalTests}  pass=${summary.passed}  fail=${summary.failed}`);
  console.log(`  themeMention=${themeMentionPass ? "PASS ✅" : "FAIL ❌"}`);
  const passed = summary.passed === summary.totalTests;
  console.log(`  GATE: ${passed ? "PASS ✅" : "FAIL ❌"}`);
  process.exit(passed ? 0 : 1);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[UX Eval] Fatal:", err);
    process.exit(1);
  });
}
