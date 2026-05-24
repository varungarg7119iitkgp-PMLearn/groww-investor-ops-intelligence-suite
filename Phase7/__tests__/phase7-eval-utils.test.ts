/**
 * Phase 7 — Eval Utilities unit tests
 *
 * Pure functions exercised directly; the persistence path is exercised
 * via a mocked Supabase insert chain.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import fc from "fast-check";

/* ── Mock supabase client BEFORE importing SUT ───────────────── */

const insertResponseQueue: Array<{ data: unknown; error: { message: string } | null; count?: number }> = [];
const insertCalls: Array<{ table: string; payload: unknown }> = [];

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    from: (table: string) => ({
      insert: (payload: unknown, opts?: { count?: string }) => {
        insertCalls.push({ table, payload });
        const response = insertResponseQueue.shift() ?? { data: null, error: null };
        return {
          select: () => ({
            maybeSingle: () => Promise.resolve(response),
          }),
          ...(opts?.count === "exact"
            ? { then: <T>(fn: (v: { data: unknown; error: { message: string } | null; count?: number }) => T) => Promise.resolve(fn(response)) }
            : {}),
          // batch insert returns directly without .select()
          then: <T>(fn: (v: { data: unknown; error: { message: string } | null; count?: number }) => T) => Promise.resolve(fn(response)),
        };
      },
    }),
  }),
  __resetSupabaseClient: () => undefined,
}));

import {
  exactMatchScore,
  containsScore,
  keywordCoverageScore,
  jaccardScore,
  compositeScore,
  passAt,
  summarizeSuite,
  recordEvalResult,
  recordEvalSuite,
} from "@/lib/eval-utils";
import type { EvalResult } from "@/types";

beforeEach(() => {
  insertResponseQueue.length = 0;
  insertCalls.length = 0;
});

/* ════════════════════════════════════════════════════════════════
   PURE SCORERS
   ════════════════════════════════════════════════════════════════ */

describe("exactMatchScore", () => {
  it("returns 1 for identical strings", () => {
    expect(exactMatchScore("hello", "hello")).toBe(1);
  });
  it("returns 0 for any difference (case-sensitive)", () => {
    expect(exactMatchScore("Hello", "hello")).toBe(0);
    expect(exactMatchScore("a", "b")).toBe(0);
  });
});

describe("containsScore", () => {
  it("is case-insensitive", () => {
    expect(containsScore("The Quick Brown Fox", "quick")).toBe(1);
  });
  it("returns 0 when not present", () => {
    expect(containsScore("hello world", "xyz")).toBe(0);
  });
});

describe("keywordCoverageScore", () => {
  it("returns 1.0 when all keywords are present", () => {
    expect(keywordCoverageScore("alpha bravo charlie", ["alpha", "bravo", "charlie"])).toBe(1);
  });
  it("returns 0.5 when half are present", () => {
    expect(keywordCoverageScore("alpha bravo", ["alpha", "bravo", "charlie", "delta"])).toBe(0.5);
  });
  it("returns 1 for empty keyword list (no constraints to violate)", () => {
    expect(keywordCoverageScore("anything", [])).toBe(1);
  });
  it("is case-insensitive", () => {
    expect(keywordCoverageScore("ALPHA bravo", ["alpha", "BRAVO"])).toBe(1);
  });
});

describe("jaccardScore", () => {
  it("returns 1 for identical token sets", () => {
    expect(jaccardScore("the quick brown fox", "fox brown quick the")).toBe(1);
  });
  it("returns 0 for disjoint sets", () => {
    expect(jaccardScore("alpha bravo", "charlie delta")).toBe(0);
  });
  it("handles partial overlap correctly", () => {
    expect(jaccardScore("alpha bravo charlie", "bravo charlie delta")).toBeCloseTo(2 / 4, 3);
  });
  it("returns 1 for two empty strings", () => {
    expect(jaccardScore("", "")).toBe(1);
  });
});

describe("compositeScore", () => {
  it("returns 0 for empty array", () => {
    expect(compositeScore([])).toBe(0);
  });
  it("computes unweighted average", () => {
    expect(compositeScore([1, 0.5, 0])).toBeCloseTo(0.5, 3);
  });
  it("respects weights", () => {
    expect(compositeScore([1, 0], [3, 1])).toBeCloseTo(0.75, 3);
  });
  it("throws when weights length mismatches", () => {
    expect(() => compositeScore([1, 0], [1])).toThrow(/same length/);
  });
});

describe("passAt", () => {
  it("default threshold is 0.7", () => {
    expect(passAt(0.7)).toBe(true);
    expect(passAt(0.69)).toBe(false);
  });
  it("respects custom threshold", () => {
    expect(passAt(0.5, 0.5)).toBe(true);
    expect(passAt(0.49, 0.5)).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════════
   PROPERTY-BASED INVARIANTS
   ════════════════════════════════════════════════════════════════ */

describe("scoring invariants (fast-check)", () => {
  it("all scorers return values in [0, 1]", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        expect(exactMatchScore(a, b)).toBeGreaterThanOrEqual(0);
        expect(exactMatchScore(a, b)).toBeLessThanOrEqual(1);
        expect(containsScore(a, b)).toBeGreaterThanOrEqual(0);
        expect(containsScore(a, b)).toBeLessThanOrEqual(1);
        expect(jaccardScore(a, b)).toBeGreaterThanOrEqual(0);
        expect(jaccardScore(a, b)).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });

  it("composite average is bounded by the min and max of its inputs", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 8 }), (scores) => {
        const agg = compositeScore(scores);
        expect(agg).toBeGreaterThanOrEqual(Math.min(...scores) - 1e-9);
        expect(agg).toBeLessThanOrEqual(Math.max(...scores) + 1e-9);
      }),
      { numRuns: 80 },
    );
  });
});

/* ════════════════════════════════════════════════════════════════
   summarizeSuite
   ════════════════════════════════════════════════════════════════ */

describe("summarizeSuite", () => {
  const sample: EvalResult[] = [
    { eval_type: "rag_accuracy", eval_name: "a", input: "i", expected: "e", actual: "x", score: 1.0, pass_fail: true,  phase: 7, timestamp: "t" },
    { eval_type: "rag_accuracy", eval_name: "b", input: "i", expected: "e", actual: "x", score: 0.5, pass_fail: false, phase: 7, timestamp: "t" },
    { eval_type: "rag_accuracy", eval_name: "c", input: "i", expected: "e", actual: "x", score: 0.8, pass_fail: true,  phase: 7, timestamp: "t" },
  ];

  it("computes totals and pass rate", () => {
    const s = summarizeSuite("rag_accuracy", 7, sample);
    expect(s.totalTests).toBe(3);
    expect(s.passed).toBe(2);
    expect(s.failed).toBe(1);
    expect(s.aggregateScore).toBeCloseTo((1 + 0.5 + 0.8) / 3, 3);
    expect(s.passRate).toBeCloseTo(2 / 3, 3);
  });

  it("handles empty results gracefully", () => {
    const s = summarizeSuite("ux_structure", 7, []);
    expect(s.totalTests).toBe(0);
    expect(s.aggregateScore).toBe(0);
    expect(s.passRate).toBe(0);
  });
});

/* ════════════════════════════════════════════════════════════════
   recordEvalResult / recordEvalSuite
   ════════════════════════════════════════════════════════════════ */

describe("recordEvalResult", () => {
  it("inserts a row and returns the new id", async () => {
    insertResponseQueue.push({ data: { id: "row-1" }, error: null });

    const res = await recordEvalResult({
      eval_type: "ux_structure",
      eval_name: "test_layout",
      input: "x",
      expected: "y",
      actual: "y",
      score: 0.95,
      pass_fail: true,
      phase: 7,
    });

    expect(res.error).toBeNull();
    expect(res.data?.id).toBe("row-1");
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].table).toBe("eval_results");

    const payload = insertCalls[0].payload as { score: number; timestamp: string };
    expect(payload.score).toBe(0.95);
    expect(payload.timestamp).toBeTruthy();
  });

  it("clamps score into [0,1]", async () => {
    insertResponseQueue.push({ data: { id: "row-2" }, error: null });
    await recordEvalResult({
      eval_type: "rag_accuracy",
      eval_name: "clamp_test",
      input: "x", expected: "y", actual: "y",
      score: 2.5,
      pass_fail: false,
      phase: 7,
    });
    const payload = insertCalls[0].payload as { score: number };
    expect(payload.score).toBe(1);

    insertResponseQueue.push({ data: { id: "row-3" }, error: null });
    await recordEvalResult({
      eval_type: "rag_accuracy",
      eval_name: "clamp_test_neg",
      input: "x", expected: "y", actual: "y",
      score: -0.5,
      pass_fail: false,
      phase: 7,
    });
    const payload2 = insertCalls[1].payload as { score: number };
    expect(payload2.score).toBe(0);
  });

  it("returns apiError when Supabase rejects", async () => {
    insertResponseQueue.push({ data: null, error: { message: "RLS denied" } });

    const res = await recordEvalResult({
      eval_type: "safety_compliance",
      eval_name: "pii_test",
      input: "x", expected: "y", actual: "y",
      score: 0.9,
      pass_fail: true,
      phase: 7,
    });

    expect(res.error).toBe("RLS denied");
    expect(res.data).toBeNull();
  });
});

describe("recordEvalSuite", () => {
  it("returns inserted=0 for empty array WITHOUT calling Supabase", async () => {
    const res = await recordEvalSuite([]);
    expect(res.data?.inserted).toBe(0);
    expect(insertCalls).toHaveLength(0);
  });

  it("inserts a batch and returns the inserted count", async () => {
    insertResponseQueue.push({ data: null, error: null, count: 3 });

    const res = await recordEvalSuite([
      { eval_type: "rag_accuracy", eval_name: "a", input: "i", expected: "e", actual: "x", score: 1, pass_fail: true, phase: 7 },
      { eval_type: "rag_accuracy", eval_name: "b", input: "i", expected: "e", actual: "x", score: 0.5, pass_fail: false, phase: 7 },
      { eval_type: "rag_accuracy", eval_name: "c", input: "i", expected: "e", actual: "x", score: 0.8, pass_fail: true, phase: 7 },
    ]);

    expect(res.error).toBeNull();
    expect(res.data?.inserted).toBe(3);
    expect((insertCalls[0].payload as unknown[]).length).toBe(3);
  });
});
