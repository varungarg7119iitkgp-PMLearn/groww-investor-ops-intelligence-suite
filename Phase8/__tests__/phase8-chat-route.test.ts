/**
 * Phase 8 — /api/chat integration tests
 *
 * Exercises the POST handler with the heavy dependencies mocked at
 * module boundary:
 *   - fund-identifier
 *   - rag-retriever
 *   - fee-explainer
 *   - gemini
 *
 * What we verify:
 *   - 200 happy path with 6 bullets + citations + lastUpdated
 *   - Input guard rejection paths (advice, OOS, PII)
 *   - Output guard rejection (advice text returned by Gemini)
 *   - 400 for invalid bodies
 *   - 500 for retriever / gemini failures
 *   - Padding to exactly 6 bullets when Gemini returns fewer
 *   - Fallback citation when Gemini returns none
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ── Mocks ───────────────────────────────────────────────────── */

vi.mock("@/lib/fund-identifier", () => ({
  identifyFunds: vi.fn(async () => ({
    fundIds: ["hdfc-silv"],
    matchedFunds: [],
    categories: ["commodity"],
    confidence: "substring",
    matchedAliases: ["hdfc silver"],
  })),
}));

vi.mock("@/tools/rag-retriever", () => ({
  retrieveTopK: vi.fn(async () => [
    {
      chunk: {
        id: "c1",
        fundId: "hdfc-silv",
        fundName: "HDFC Silver ETF FoF",
        category: "commodity",
        chunkType: "fees_loads",
        content: "HDFC Silver ETF FoF expense ratio 0.49%.",
        sourceUrls: ["https://hdfc.com/silver-fof"],
        lastUpdatedAt: "2026-05-01T00:00:00Z",
      },
      score: 0.92,
    },
  ]),
}));

vi.mock("@/tools/fee-explainer", () => ({
  isFeeQuery: vi.fn(() => true),
  explainFees: vi.fn(async () => ({
    scenarios: [],
    asMarkdown: "Expense Ratio: 0.1%–2.5% direct plans.",
  })),
}));

const generateContentMock = vi.fn();
vi.mock("@/lib/gemini", () => ({
  generateContent: (...args: unknown[]) => generateContentMock(...args),
  parseJson: <T>(raw: string): T => {
    const fenced = raw.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return JSON.parse(fenced ? fenced[1] : raw) as T;
  },
}));

/* ── Import SUT after mocks ──────────────────────────────────── */
import { POST } from "@/app/api/chat/route";

/* ── Test helpers ────────────────────────────────────────────── */

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const HAPPY_GEMINI = JSON.stringify({
  summary: "HDFC Silver ETF FoF expense ratio is 0.49% direct plan.",
  bullets: [
    "HDFC Silver ETF FoF expense ratio is 0.49% (direct plan).",
    "It tracks the HDFC Silver ETF under the FoF structure.",
    "Exit load: 0.5% within 15 days, nil thereafter.",
    "NAV is updated daily by the AMC.",
    "Category: Commodity Fund of Funds (Silver).",
    "Direct plan saves ~50–100 bps versus regular plan.",
  ],
  citations: [
    {
      fundId: "hdfc-silv",
      fundName: "HDFC Silver ETF FoF",
      source: "https://hdfc.com/silver-fof",
      snippet: "Expense ratio 0.49%.",
      relevanceScore: 0.92,
    },
  ],
  inScope: true,
  complianceFlag: "ok",
});

beforeEach(() => {
  generateContentMock.mockReset();
  generateContentMock.mockResolvedValue({
    text: HAPPY_GEMINI,
    model: "gemini-2.5-flash-lite",
    latencyMs: 50,
    retries: 0,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

/* ════════════════════════════════════════════════════════════════
   Happy path
   ════════════════════════════════════════════════════════════════ */

describe("POST /api/chat — happy path", () => {
  it("returns a 6-bullet response with citations + lastUpdated", async () => {
    const res = await POST(makeRequest({ query: "What is the expense ratio of HDFC Silver ETF?" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      answer: { bullets: string[]; citations: unknown[]; complianceFlag: string };
      meta: { lastUpdated: string; retrievedSources: number; feeExplainerInvoked: boolean };
    };
    expect(body.answer.bullets).toHaveLength(6);
    expect(body.answer.citations.length).toBeGreaterThan(0);
    expect(body.answer.complianceFlag).toBe("ok");
    expect(body.meta.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.meta.retrievedSources).toBe(1);
    expect(body.meta.feeExplainerInvoked).toBe(true);
  });

  it("pads bullets to 6 when Gemini returns fewer", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        summary: "Short answer",
        bullets: ["Bullet 1", "Bullet 2", "Bullet 3"],
        citations: [{ fundId: "hdfc-silv", fundName: "HDFC Silver ETF FoF", source: "https://x.com", snippet: "x", relevanceScore: 0.8 }],
        inScope: true,
        complianceFlag: "ok",
      }),
      model: "gemini-2.5-flash-lite",
      latencyMs: 50,
      retries: 0,
    });
    const res = await POST(makeRequest({ query: "expense ratio?" }));
    const body = (await res.json()) as { answer: { bullets: string[] } };
    expect(body.answer.bullets).toHaveLength(6);
  });

  it("truncates bullets to 6 when Gemini returns more", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        summary: "Long answer",
        bullets: Array.from({ length: 12 }, (_, i) => `Bullet ${i + 1}`),
        citations: [{ fundId: "hdfc-silv", fundName: "HDFC Silver ETF FoF", source: "https://x.com", snippet: "x", relevanceScore: 0.8 }],
        inScope: true,
        complianceFlag: "ok",
      }),
      model: "gemini-2.5-flash-lite",
      latencyMs: 50,
      retries: 0,
    });
    const res = await POST(makeRequest({ query: "expense ratio?" }));
    const body = (await res.json()) as { answer: { bullets: string[] } };
    expect(body.answer.bullets).toHaveLength(6);
  });

  it("falls back to retrieved-chunk citation when Gemini returns none", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        summary: "x",
        bullets: ["b1", "b2", "b3", "b4", "b5", "b6"],
        citations: [],
        inScope: true,
        complianceFlag: "ok",
      }),
      model: "gemini-2.5-flash-lite",
      latencyMs: 50,
      retries: 0,
    });
    const res = await POST(makeRequest({ query: "expense ratio?" }));
    const body = (await res.json()) as { answer: { citations: { fundId: string }[] } };
    expect(body.answer.citations.length).toBeGreaterThan(0);
    expect(body.answer.citations[0].fundId).toBe("hdfc-silv");
  });

  it("strips ```json fences from Gemini output", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: "```json\n" + HAPPY_GEMINI + "\n```",
      model: "gemini-2.5-flash-lite",
      latencyMs: 50,
      retries: 0,
    });
    const res = await POST(makeRequest({ query: "expense ratio?" }));
    expect(res.status).toBe(200);
  });
});

/* ════════════════════════════════════════════════════════════════
   Guardrails
   ════════════════════════════════════════════════════════════════ */

describe("POST /api/chat — input guardrails", () => {
  it("blocks advice queries with complianceFlag=advice_block", async () => {
    const res = await POST(makeRequest({ query: "Should I buy HDFC Silver?" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { answer: { complianceFlag: string; bullets: string[] } };
    expect(body.answer.complianceFlag).toBe("advice_block");
    expect(body.answer.bullets).toHaveLength(6);
    /* Should never invoke Gemini when blocked by input guard */
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("blocks out-of-scope queries with complianceFlag=out_of_scope", async () => {
    const res = await POST(makeRequest({ query: "Tell me about Bitcoin" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { answer: { complianceFlag: string; bullets: string[] } };
    expect(body.answer.complianceFlag).toBe("out_of_scope");
    expect(body.answer.bullets).toHaveLength(6);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it("blocks PII-containing queries with complianceFlag=pii_block", async () => {
    const res = await POST(makeRequest({ query: "My number is 9876543210, tell me about HDFC Silver" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { answer: { complianceFlag: string } };
    expect(body.answer.complianceFlag).toBe("pii_block");
    expect(generateContentMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/chat — output guardrail", () => {
  it("re-routes to advice_block when Gemini output contains advice phrasing", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        summary: "You should buy HDFC Silver ETF for long term.",
        bullets: [
          "You should invest in HDFC Silver ETF.",
          "b2", "b3", "b4", "b5", "b6",
        ],
        citations: [{ fundId: "hdfc-silv", fundName: "HDFC Silver ETF FoF", source: "https://x.com", snippet: "x", relevanceScore: 0.8 }],
        inScope: true,
        complianceFlag: "ok",
      }),
      model: "gemini-2.5-flash-lite",
      latencyMs: 50,
      retries: 0,
    });
    const res = await POST(makeRequest({ query: "What about HDFC Silver?" }));
    const body = (await res.json()) as { answer: { complianceFlag: string } };
    expect(body.answer.complianceFlag).toBe("advice_block");
  });
});

/* ════════════════════════════════════════════════════════════════
   Input validation
   ════════════════════════════════════════════════════════════════ */

describe("POST /api/chat — input validation", () => {
  it("returns 400 for invalid JSON body", async () => {
    const res = await POST(new Request("http://localhost/api/chat", { method: "POST", body: "not json" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing query", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty query", async () => {
    const res = await POST(makeRequest({ query: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for over-long query (>1000 chars)", async () => {
    const res = await POST(makeRequest({ query: "x".repeat(2000) }));
    expect(res.status).toBe(400);
  });
});

/* ════════════════════════════════════════════════════════════════
   Error paths
   ════════════════════════════════════════════════════════════════ */

describe("POST /api/chat — error paths", () => {
  it("returns 500 when Gemini fails", async () => {
    generateContentMock.mockRejectedValueOnce(new Error("Gemini API down"));
    const res = await POST(makeRequest({ query: "expense ratio of HDFC Silver?" }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("gemini");
  });

  it("returns 500 with json-parse error when Gemini returns garbage", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: "this is not json at all",
      model: "gemini-2.5-flash-lite",
      latencyMs: 50,
      retries: 0,
    });
    const res = await POST(makeRequest({ query: "expense ratio?" }));
    expect(res.status).toBe(500);
  });
});
