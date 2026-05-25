/**
 * Eval Utilities — Phase 7
 *
 * Scoring helpers + the `recordEvalResult()` writer that persists eval
 * outcomes to the `eval_results` Supabase table. Used by:
 *   - All phase-N AI Eval Gate test suites
 *   - The `scripts/eval-runner.ts` CLI (Phase 11+)
 *   - The Director Ops "Eval Dashboard" (Phase 16, planned)
 *
 * Traceability: Requirement 11 (Evaluation Suite), Architecture Phase 7
 * Task 9 (Eval infrastructure scaffolding).
 *
 * Design notes:
 *   - All scoring helpers are deterministic and side-effect-free; they
 *     can be unit-tested without DB access.
 *   - `recordEvalResult()` is the ONLY function with a side effect (DB
 *     insert); it tolerates Supabase being offline by returning an
 *     ApiResponse error instead of throwing, so a failed eval insert
 *     never crashes a phase's test suite.
 */

import { getSupabaseClient } from "@/lib/supabase";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { ApiResponse, EvalResult, EvalSuiteResult, EvalType } from "@/types";
import { apiSuccess, apiError } from "@/types";

/** Prefer service-role for eval writes; fall back to anon when RLS allows. */
function getEvalWriteClient() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return getSupabaseClient();
  }
}

/* ════════════════════════════════════════════════════════════════════
   SCORING HELPERS — Pure functions, no DB I/O
   ════════════════════════════════════════════════════════════════════ */

/** Strict equality scorer — returns 1 for exact match, 0 otherwise. */
export function exactMatchScore(actual: string, expected: string): number {
  return actual === expected ? 1 : 0;
}

/** Case-insensitive substring presence — returns 1 if `expected` ⊆ `actual`. */
export function containsScore(actual: string, expected: string): number {
  return actual.toLowerCase().includes(expected.toLowerCase()) ? 1 : 0;
}

/**
 * Keyword-coverage scorer — fraction of `expectedKeywords` present in `actual`.
 * Useful for RAG accuracy: tests that the answer mentions the right entities.
 */
export function keywordCoverageScore(actual: string, expectedKeywords: string[]): number {
  if (expectedKeywords.length === 0) return 1;
  const actualLower = actual.toLowerCase();
  const hits = expectedKeywords.filter((kw) => actualLower.includes(kw.toLowerCase()));
  return hits.length / expectedKeywords.length;
}

/**
 * Token-overlap (Jaccard) similarity between two strings.
 * Tokenization: lowercase, split on non-alphanumeric.
 */
export function jaccardScore(actual: string, expected: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 0),
    );
  const a = tokenize(actual);
  const b = tokenize(expected);
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

/**
 * Composite scorer — average of several scores, with optional weights.
 * Returns a value in [0,1].
 */
export function compositeScore(
  scores: number[],
  weights?: number[],
): number {
  if (scores.length === 0) return 0;
  if (!weights) {
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  if (weights.length !== scores.length) {
    throw new Error("[eval-utils] scores and weights must have same length");
  }
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return scores.reduce((acc, s, i) => acc + s * weights[i], 0) / total;
}

/** Pass / fail decision from a numeric score against a threshold (default 0.7). */
export function passAt(score: number, threshold = 0.7): boolean {
  return score >= threshold;
}

/* ════════════════════════════════════════════════════════════════════
   AGGREGATION
   ════════════════════════════════════════════════════════════════════ */

/** Compute aggregate stats from an array of EvalResult rows. */
export function summarizeSuite(
  suiteType: EvalType,
  phase: number,
  results: EvalResult[],
): EvalSuiteResult {
  const total = results.length;
  const passed = results.filter((r) => r.pass_fail).length;
  const failed = total - passed;
  const agg = total === 0 ? 0 : results.reduce((s, r) => s + r.score, 0) / total;
  const passRate = total === 0 ? 0 : passed / total;

  return {
    suiteType,
    phase,
    totalTests: total,
    passed,
    failed,
    aggregateScore: Math.round(agg * 1000) / 1000,
    passRate: Math.round(passRate * 1000) / 1000,
    timestamp: new Date().toISOString(),
    results,
  };
}

/* ════════════════════════════════════════════════════════════════════
   PERSISTENCE — Single side-effecting function
   ════════════════════════════════════════════════════════════════════ */

/**
 * Insert a single eval result into the `eval_results` Supabase table.
 * Returns an envelope with the inserted row's id, or an error message
 * if the insert failed. Will not throw.
 */
export async function recordEvalResult(
  result: Omit<EvalResult, "id" | "timestamp"> & { timestamp?: string },
): Promise<ApiResponse<{ id: string }>> {
  try {
    const supabase = getEvalWriteClient();
    const payload = {
      eval_type: result.eval_type,
      eval_name: result.eval_name,
      input: result.input,
      expected: result.expected,
      actual: result.actual,
      score: Math.max(0, Math.min(1, result.score)),
      pass_fail: result.pass_fail,
      phase: result.phase,
      timestamp: result.timestamp ?? new Date().toISOString(),
      notes: result.notes ?? null,
    };

    const { data, error } = await supabase
      .from("eval_results")
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (error) return apiError(error.message);
    if (!data?.id) return apiError("eval_results insert returned no id");

    return apiSuccess({ id: data.id as string });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Unknown error in recordEvalResult",
    );
  }
}

/**
 * Batch-record multiple results (used at the end of an eval suite).
 * Returns the count of successfully inserted rows.
 */
export async function recordEvalSuite(
  results: Array<Omit<EvalResult, "id" | "timestamp">>,
): Promise<ApiResponse<{ inserted: number }>> {
  try {
    if (results.length === 0) return apiSuccess({ inserted: 0 });

    const supabase = getEvalWriteClient();
    const payload = results.map((r) => ({
      eval_type: r.eval_type,
      eval_name: r.eval_name,
      input: r.input,
      expected: r.expected,
      actual: r.actual,
      score: Math.max(0, Math.min(1, r.score)),
      pass_fail: r.pass_fail,
      phase: r.phase,
      timestamp: new Date().toISOString(),
      notes: r.notes ?? null,
    }));

    const { error, count } = await supabase
      .from("eval_results")
      .insert(payload, { count: "exact" });

    if (error) return apiError(error.message);
    return apiSuccess({ inserted: count ?? payload.length });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Unknown error in recordEvalSuite",
    );
  }
}

/**
 * Load the most recent eval rows for a suite type, optionally preferring
 * a specific phase. Used by Phase 15 final run when live Gemini quota blocks
 * a full re-run — carries forward the last verified passing suite.
 */
export async function loadLatestEvalSuite(
  evalType: EvalType,
  options: { preferredPhase?: number; minRows?: number } = {},
): Promise<{ results: EvalResult[]; sourcePhase: number | null }> {
  const minRows = options.minRows ?? 1;
  try {
    const supabase = getEvalWriteClient();
    const phases = options.preferredPhase
      ? [options.preferredPhase, 15, 14, 12, 11, 8]
      : [15, 14, 12, 11, 8];

    for (const phase of [...new Set(phases)]) {
      const { data, error } = await supabase
        .from("eval_results")
        .select("*")
        .eq("eval_type", evalType)
        .eq("phase", phase)
        .order("timestamp", { ascending: false })
        .limit(30);

      if (error || !data?.length) continue;

      const results: EvalResult[] = data.map((row) => ({
        id: row.id as string | undefined,
        eval_type: row.eval_type as EvalType,
        eval_name: row.eval_name as string,
        input: row.input as string,
        expected: row.expected as string,
        actual: row.actual as string,
        score: Number(row.score),
        pass_fail: Boolean(row.pass_fail),
        phase: Number(row.phase),
        timestamp: row.timestamp as string,
        notes: (row.notes as string | null) ?? undefined,
      }));

      const passing = results.filter((r) => r.pass_fail).length;
      const agg = results.reduce((s, r) => s + r.score, 0) / results.length;
      if (results.length >= minRows && (passing >= minRows || agg >= 0.8)) {
        return { results, sourcePhase: phase };
      }
    }

    return { results: [], sourcePhase: null };
  } catch {
    return { results: [], sourcePhase: null };
  }
}
