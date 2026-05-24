/**
 * Phase 8 — Prompt builder unit tests
 *
 * Pure-function tests; no mocks required.
 */

import { describe, expect, it } from "vitest";
import {
  buildSmartSyncPrompt,
  buildOutOfScopeResponse,
  buildAdviceBlockResponse,
  buildLLMJudgePrompt,
} from "@/lib/prompts";
import type { FundChunk } from "@/types";

const CHUNK_A: FundChunk = {
  id: "c1",
  fundId: "hdfc-silv",
  fundName: "HDFC Silver ETF FoF",
  category: "commodity",
  chunkType: "fees_loads",
  content: "HDFC Silver ETF FoF expense ratio 0.49%.",
  sourceUrls: ["https://hdfc.com/silver-fof"],
  lastUpdatedAt: "2026-05-01T00:00:00Z",
};

const NOW = "2026-05-24T13:00:00.000Z";

describe("buildSmartSyncPrompt()", () => {
  it("includes the user query verbatim", () => {
    const p = buildSmartSyncPrompt({
      query: "What is the expense ratio of HDFC Silver?",
      chunks: [CHUNK_A],
      feeBlock: "",
      feeFlag: false,
      nowIso: NOW,
    });
    expect(p).toContain("What is the expense ratio of HDFC Silver?");
  });

  it("renders numbered sources", () => {
    const p = buildSmartSyncPrompt({
      query: "q",
      chunks: [CHUNK_A],
      feeBlock: "",
      feeFlag: false,
      nowIso: NOW,
    });
    expect(p).toContain("[1] fund_id=hdfc-silv");
    expect(p).toContain("HDFC Silver ETF FoF");
    expect(p).toContain("expense ratio 0.49");
  });

  it("includes the fee block ONLY when feeFlag=true and feeBlock is non-empty", () => {
    const without = buildSmartSyncPrompt({ query: "q", chunks: [CHUNK_A], feeBlock: "", feeFlag: false, nowIso: NOW });
    expect(without).not.toContain("FEE_CONTEXT_BLOCK (use as authoritative");

    const withBlock = buildSmartSyncPrompt({
      query: "q",
      chunks: [CHUNK_A],
      feeBlock: "Expense ratio 0.1%–2.5%",
      feeFlag: true,
      nowIso: NOW,
    });
    expect(withBlock).toContain("FEE_CONTEXT_BLOCK");
    expect(withBlock).toContain("Expense ratio 0.1%–2.5%");
  });

  it("declares the JSON schema with 6 bullets", () => {
    const p = buildSmartSyncPrompt({ query: "q", chunks: [CHUNK_A], feeBlock: "", feeFlag: false, nowIso: NOW });
    expect(p).toContain('"bullets": string[6]');
  });

  it("includes the no-advice rule", () => {
    const p = buildSmartSyncPrompt({ query: "q", chunks: [CHUNK_A], feeBlock: "", feeFlag: false, nowIso: NOW });
    expect(p.toLowerCase()).toContain("no advice");
  });

  it("renders the timestamp", () => {
    const p = buildSmartSyncPrompt({ query: "q", chunks: [CHUNK_A], feeBlock: "", feeFlag: false, nowIso: NOW });
    expect(p).toContain(NOW);
  });

  it("handles empty chunks (no retrieval)", () => {
    const p = buildSmartSyncPrompt({ query: "q", chunks: [], feeBlock: "", feeFlag: false, nowIso: NOW });
    expect(p).toContain("no sources retrieved");
  });
});

describe("buildOutOfScopeResponse()", () => {
  it("returns exactly 6 bullets, no citations, inScope=false", () => {
    const r = buildOutOfScopeResponse("Tell me about crypto", NOW);
    expect(r.bullets).toHaveLength(6);
    expect(r.citations).toEqual([]);
    expect(r.inScope).toBe(false);
    expect(r.complianceFlag).toBe("out_of_scope");
    expect(r.lastUpdated).toBe(NOW);
  });

  it("includes the user query (truncated)", () => {
    const long = "x".repeat(200);
    const r = buildOutOfScopeResponse(long, NOW);
    /* Truncated to 80 chars + ellipsis */
    expect(r.bullets.some((b) => b.includes("…"))).toBe(true);
  });
});

describe("buildAdviceBlockResponse()", () => {
  it("returns exactly 6 bullets, advice_block flag", () => {
    const r = buildAdviceBlockResponse("Should I buy HDFC?", NOW);
    expect(r.bullets).toHaveLength(6);
    expect(r.citations).toEqual([]);
    expect(r.complianceFlag).toBe("advice_block");
  });

  it("explicitly mentions SEBI-registered advisor", () => {
    const r = buildAdviceBlockResponse("Should I buy?", NOW);
    expect(r.bullets.join(" ")).toMatch(/SEBI-registered/i);
  });
});

describe("buildLLMJudgePrompt()", () => {
  it("includes query / answer / sources sections", () => {
    const p = buildLLMJudgePrompt({
      query: "expense ratio of HDFC Silver",
      answer: '{"bullets": ["..."]}',
      retrievedSources: "[1] HDFC Silver",
    });
    expect(p).toContain("## QUERY");
    expect(p).toContain("## ANSWER");
    expect(p).toContain("## SOURCES");
    expect(p).toContain("faithfulness");
    expect(p).toContain("relevance");
  });
});
