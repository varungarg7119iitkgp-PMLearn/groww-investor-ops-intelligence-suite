/**
 * scripts/eval-rag.ts — Phase 8 AI Eval Gate (TIER 2)
 *
 * Runs the 5-golden-question RAG accuracy suite from Architecture
 * Phase 8 against the LIVE Supabase + Gemini stack. Each answer is
 * scored by a Gemini LLM-judge on Faithfulness + Relevance.
 *
 * Invocation:
 *   npx tsx scripts/eval-rag.ts
 *
 * Required env vars (set in `.env.local`):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - GEMINI_API_KEY
 *
 * Side effects:
 *   - Writes one row per question to the `eval_results` Supabase table.
 *   - Prints a summary block to stdout.
 *
 * NOTE: This script is INTENTIONALLY separate from the Vitest gate
 * (`Phase8/__tests__/phase8-ai-evals.test.ts`) so we don't burn LLM
 * quota on every `npm test`. The Vitest gate runs the structural
 * (TIER 1) eval; this script runs the LLM-judged (TIER 2) eval.
 */

/* Load .env.local before any env-dependent module is imported.
 * Uses Node 21.7+ built-in process.loadEnvFile() — no dotenv dep needed. */
try {
  const fnSym = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (typeof fnSym === "function") fnSym(".env.local");
} catch (e) {
  console.warn("[eval-rag] Could not load .env.local:", (e as Error).message);
}

import { retrieveTopK } from "@/tools/rag-retriever";
import { explainFees, isFeeQuery } from "@/tools/fee-explainer";
import { identifyFunds } from "@/lib/fund-identifier";
import { generateContent, parseJson } from "@/lib/gemini";
import { buildSmartSyncPrompt, buildLLMJudgePrompt } from "@/lib/prompts";
import { recordEvalSuite, summarizeSuite } from "@/lib/eval-utils";
import type { EvalResult } from "@/types";

interface GoldenQuestion {
  id: string;
  question: string;
  expectedFunds: string[];
  expectedSources: string[];
}

const GOLDEN_SET: GoldenQuestion[] = [
  {
    id: "E8-RAG-1",
    question: "What is the expense ratio of HDFC Silver ETF and how does it compare to Axis Silver?",
    expectedFunds: ["hdfc-silv", "axis-silv"],
    expectedSources: ["HDFC fees_loads chunk", "Axis fees_loads chunk"],
  },
  {
    id: "E8-RAG-2",
    question: "Explain the exit load for equity funds and why was I charged after 3 years?",
    expectedFunds: ["sbi-psu", "absl-psu"],
    expectedSources: ["Equity fees_loads chunk", "exit_load fee scenario"],
  },
  {
    id: "E8-RAG-3",
    question: "Compare 3-year returns of any Debt fund with any Equity fund in your dataset.",
    expectedFunds: [],
    expectedSources: ["Debt performance chunk", "Equity performance chunk"],
  },
  {
    id: "E8-RAG-4",
    question: "What is TCS on mutual fund investments and which funds in your list have the highest expense ratio?",
    expectedFunds: [],
    expectedSources: ["tcs fee scenario", "Multiple fees_loads chunks"],
  },
  {
    id: "E8-RAG-5",
    question: "I want to understand the risk level of commodity funds vs hybrid funds.",
    expectedFunds: [],
    expectedSources: ["Commodity risk chunks", "Hybrid risk chunks"],
  },
];

interface JudgeScores {
  faithfulness: number;
  relevance: number;
  comments: string;
}

async function runOne(g: GoldenQuestion, phase: number, threshold: number): Promise<EvalResult[]> {
  const nowIso = new Date().toISOString();
  const ident = await identifyFunds(g.question);
  const retrieved = await retrieveTopK(g.question, {
    k: 8,
    fundIds: ident.fundIds.length > 0 ? ident.fundIds : undefined,
  });
  const feeFlag = isFeeQuery(g.question);
  const feeBlock = feeFlag ? (await explainFees(g.question)).asMarkdown : "";

  const prompt = buildSmartSyncPrompt({
    query: g.question,
    chunks: retrieved.map((r) => r.chunk),
    feeBlock,
    feeFlag,
    nowIso,
  });

  const answer = await generateContent(prompt, { json: true, temperature: 0.2 });
  const judgePrompt = buildLLMJudgePrompt({
    query: g.question,
    answer: answer.text,
    retrievedSources: retrieved
      .map((r, i) => `[${i + 1}] ${r.chunk.fundName} (${r.chunk.chunkType}) — ${r.chunk.content.slice(0, 200)}`)
      .join("\n"),
  });
  const judgeRaw = await generateContent(judgePrompt, { json: true, temperature: 0 });
  const judge = parseJson<JudgeScores>(judgeRaw.text);

  const faithfulness = clamp01(Number(judge.faithfulness));
  const relevance    = clamp01(Number(judge.relevance));

  return [
    {
      eval_type: "rag_accuracy",
      eval_name: `${g.id}-faithfulness`,
      input: g.question,
      expected: g.expectedSources.join(" + "),
      actual: `faith=${faithfulness.toFixed(2)} retrieved=${retrieved.length}`,
      score: faithfulness,
      pass_fail: faithfulness >= threshold,
      phase,
      timestamp: nowIso,
      notes: judge.comments,
    },
    {
      eval_type: "rag_accuracy",
      eval_name: `${g.id}-relevance`,
      input: g.question,
      expected: g.expectedSources.join(" + "),
      actual: `rel=${relevance.toFixed(2)} retrieved=${retrieved.length}`,
      score: relevance,
      pass_fail: relevance >= threshold,
      phase,
      timestamp: nowIso,
      notes: judge.comments,
    },
  ];
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export async function runRagEvalSuite(
  phase = Number(process.env.EVAL_PHASE ?? 8),
  threshold = phase >= 15 ? 0.8 : 0.7,
): Promise<ReturnType<typeof summarizeSuite>> {
  console.log(`[Phase ${phase} Eval] Running 5-question RAG accuracy suite with LLM-judge…`);
  const allResults: EvalResult[] = [];

  for (const g of GOLDEN_SET) {
    try {
      console.log(`  → ${g.id}: "${g.question.slice(0, 60)}…"`);
      const rows = await runOne(g, phase, threshold);
      allResults.push(...rows);
      const f = rows.find((r) => r.eval_name.endsWith("-faithfulness"));
      const r = rows.find((r) => r.eval_name.endsWith("-relevance"));
      console.log(`     faithfulness=${f?.score.toFixed(2)} relevance=${r?.score.toFixed(2)}`);
    } catch (err) {
      console.error(`  ✗ ${g.id} failed:`, err);
    }
  }

  const summary = summarizeSuite("rag_accuracy", phase, allResults);
  console.log("\n[Phase RAG Eval] Suite Summary");
  console.log(`  total=${summary.totalTests} pass=${summary.passed} fail=${summary.failed}`);
  console.log(`  aggregateScore=${summary.aggregateScore} passRate=${summary.passRate}`);
  console.log(`  GATE: ${summary.aggregateScore >= threshold && summary.passRate >= threshold ? "PASS ✅" : "FAIL ✗"}`);

  const persist = await recordEvalSuite(allResults);
  if (persist.error) {
    console.error("[RAG Eval] Failed to persist:", persist.error);
  } else {
    console.log(`[RAG Eval] Persisted ${persist.data?.inserted ?? 0} rows to eval_results.`);
  }

  return summary;
}

export async function main(): Promise<void> {
  const phase = Number(process.env.EVAL_PHASE ?? 8);
  const threshold = phase >= 15 ? 0.8 : 0.7;
  const summary = await runRagEvalSuite(phase, threshold);
  if (summary.aggregateScore < threshold || summary.passRate < threshold) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
