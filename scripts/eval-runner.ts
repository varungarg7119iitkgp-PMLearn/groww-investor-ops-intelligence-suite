/**
 * Eval Runner — Phase 7 scaffolding
 *
 * Run with: `tsx scripts/eval-runner.ts <suite>` (Phase 11+ wires this
 * into npm scripts).
 *
 * Suites:
 *   - rag_accuracy        (Phase 8+)  — RAG retrieval / answer fidelity
 *   - safety_compliance   (Phase 10+) — PII redaction + no-advice
 *   - ux_structure        (Phase 6+)  — UI a11y + interaction shape
 *   - cross_pillar        (Phase 15+) — End-to-end booking + theme injection
 *
 * In Phase 7 this script is the SCAFFOLD only: each suite emits a
 * placeholder "infrastructure-ready" eval row to confirm the
 * persistence path is wired correctly. Phases 8+ replace each `runX()`
 * with the real suite.
 */

import { recordEvalSuite, summarizeSuite } from "@/lib/eval-utils";
import type { EvalResult, EvalType } from "@/types";

interface SuiteDescriptor {
  suiteType: EvalType;
  phase: number;
  run: () => Promise<EvalResult[]>;
}

/* ── Placeholder suite generators ─────────────────────────────── */

async function runRagAccuracy(): Promise<EvalResult[]> {
  return [
    {
      eval_type: "rag_accuracy",
      eval_name: "scaffold:rag_accuracy_placeholder",
      input: "What is the expense ratio of HDFC Hybrid Equity?",
      expected: "non-empty answer with citation",
      actual: "infrastructure-ready",
      score: 1.0,
      pass_fail: true,
      phase: 7,
      timestamp: new Date().toISOString(),
      notes: "Phase 7 scaffold; real eval lands in Phase 8.",
    },
  ];
}

async function runSafetyCompliance(): Promise<EvalResult[]> {
  return [
    {
      eval_type: "safety_compliance",
      eval_name: "scaffold:pii_redaction_placeholder",
      input: "My PAN is ABCDE1234F and my mobile is 9876543210",
      expected: "[REDACTED] markers around PAN and mobile",
      actual: "infrastructure-ready",
      score: 1.0,
      pass_fail: true,
      phase: 7,
      timestamp: new Date().toISOString(),
      notes: "Phase 7 scaffold; real eval lands in Phase 10.",
    },
  ];
}

async function runUxStructure(): Promise<EvalResult[]> {
  return [
    {
      eval_type: "ux_structure",
      eval_name: "scaffold:ux_layout_placeholder",
      input: "Investor Terminal layout shape",
      expected: "ticker + chat + orb + opsAccess",
      actual: "infrastructure-ready",
      score: 1.0,
      pass_fail: true,
      phase: 7,
      timestamp: new Date().toISOString(),
      notes: "Phase 7 scaffold; real eval lands progressively across phases.",
    },
  ];
}

async function runCrossPillar(): Promise<EvalResult[]> {
  return [
    {
      eval_type: "cross_pillar",
      eval_name: "scaffold:e2e_booking_placeholder",
      input: "End-to-end booking flow",
      expected: "NL-[A-Z0-9]{4} booking code surfaces in HITL queue",
      actual: "infrastructure-ready",
      score: 1.0,
      pass_fail: true,
      phase: 7,
      timestamp: new Date().toISOString(),
      notes: "Phase 7 scaffold; real eval lands in Phase 15.",
    },
  ];
}

const SUITES: Record<string, SuiteDescriptor> = {
  rag_accuracy: { suiteType: "rag_accuracy", phase: 7, run: runRagAccuracy },
  safety_compliance: { suiteType: "safety_compliance", phase: 7, run: runSafetyCompliance },
  ux_structure: { suiteType: "ux_structure", phase: 7, run: runUxStructure },
  cross_pillar: { suiteType: "cross_pillar", phase: 7, run: runCrossPillar },
};

/* ── CLI entry point ──────────────────────────────────────────── */

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const suiteName = argv[0] ?? "all";

  const suitesToRun =
    suiteName === "all" ? Object.values(SUITES) : SUITES[suiteName] ? [SUITES[suiteName]] : [];

  if (suitesToRun.length === 0) {
    console.error(
      `[eval-runner] Unknown suite: ${suiteName}. ` +
        `Available: ${Object.keys(SUITES).join(", ")} | all`,
    );
    process.exitCode = 2;
    return;
  }

  for (const s of suitesToRun) {
    const results = await s.run();
    const summary = summarizeSuite(s.suiteType, s.phase, results);
    const persistence = await recordEvalSuite(results);

    console.log(
      `[eval-runner] suite=${summary.suiteType} phase=${summary.phase} ` +
        `passed=${summary.passed}/${summary.totalTests} ` +
        `aggregate=${summary.aggregateScore.toFixed(3)} ` +
        `persistence=${persistence.error ?? "ok"}`,
    );
  }
}

/* Allow direct execution (`tsx scripts/eval-runner.ts`) without affecting tests. */
if (typeof require !== "undefined" && require.main === module) {
  void main();
}
