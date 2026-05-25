/**
 * Phase 15 — Eval report generator tests
 */
import { describe, it, expect } from "vitest";
import { generateEvalReportMarkdown } from "@/lib/eval-report-generator";
import type { EvalSuiteResult } from "@/types";

function mockSuite(type: EvalSuiteResult["suiteType"], passed: number, total: number, agg: number): EvalSuiteResult {
  return {
    suiteType: type,
    phase: 15,
    totalTests: total,
    passed,
    failed: total - passed,
    aggregateScore: agg,
    passRate: total > 0 ? passed / total : 0,
    timestamp: new Date().toISOString(),
    results: Array.from({ length: total }, (_, i) => ({
      eval_type: type,
      eval_name: `test-${i}`,
      input: "in",
      expected: "exp",
      actual: "act",
      score: i < passed ? 1 : 0,
      pass_fail: i < passed,
      phase: 15,
      timestamp: new Date().toISOString(),
    })),
  };
}

describe("generateEvalReportMarkdown", () => {
  it("marks overall PASS when all suites pass", () => {
    const md = generateEvalReportMarkdown({
      runDate: "2026-05-25",
      gitSha: "abc1234",
      rag: mockSuite("rag_accuracy", 10, 10, 0.84),
      safety: mockSuite("safety_compliance", 5, 5, 1),
      ux: mockSuite("ux_structure", 4, 4, 1),
      crossPillar: { passed: 10, total: 10, pass: true },
      themeMentionPass: true,
      themeUsed: "Login Issues",
    });
    expect(md).toContain("PASS ✅");
    expect(md).toContain("Phase 15");
    expect(md).toContain("eval-final.ts");
    expect(md).toContain("Login Issues");
  });

  it("marks overall FAIL when RAG below threshold", () => {
    const md = generateEvalReportMarkdown({
      runDate: "2026-05-25",
      rag: mockSuite("rag_accuracy", 4, 10, 0.65),
      safety: mockSuite("safety_compliance", 5, 5, 1),
      ux: null,
      crossPillar: { passed: 10, total: 10, pass: true },
      themeMentionPass: true,
    });
    expect(md).toContain("FAIL ❌");
  });
});
