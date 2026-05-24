/**
 * Phase 8 — TF-IDF retriever unit tests
 *
 * Mocks `@/lib/data#getAllChunks` so we can exercise the indexer against
 * a deterministic in-memory corpus.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FundChunk } from "@/types";
import { apiSuccess } from "@/types";

/* ── Mock corpus — 6 chunks across 3 funds, 4 chunk types ──────── */
const MOCK_CHUNKS: FundChunk[] = [
  {
    id: "c1",
    fundId: "hdfc-silv",
    fundName: "HDFC Silver ETF FoF",
    category: "commodity",
    chunkType: "fees_loads",
    content: "HDFC Silver ETF FoF has an expense ratio of 0.49 percent direct plan. Exit load is 0.5 percent if redeemed within 15 days otherwise nil.",
    sourceUrls: ["https://hdfc.com/silver-fof"],
    lastUpdatedAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "c2",
    fundId: "hdfc-silv",
    fundName: "HDFC Silver ETF FoF",
    category: "commodity",
    chunkType: "performance",
    content: "HDFC Silver ETF FoF 1-year return 18.7 percent. 3-year CAGR 12.4 percent. NAV 25.60 rupees on 24 May 2026.",
    sourceUrls: ["https://hdfc.com/silver-fof"],
    lastUpdatedAt: "2026-05-24T00:00:00Z",
  },
  {
    id: "c3",
    fundId: "axis-silv",
    fundName: "Axis Silver FoF",
    category: "commodity",
    chunkType: "fees_loads",
    content: "Axis Silver FoF has expense ratio of 0.42 percent direct. Exit load 1 percent within 15 days.",
    sourceUrls: ["https://axis.com/silver-fof"],
    lastUpdatedAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "c4",
    fundId: "axis-silv",
    fundName: "Axis Silver FoF",
    category: "commodity",
    chunkType: "risk",
    content: "Axis Silver FoF carries Very High risk on the riskometer. Suitable for diversified commodity exposure.",
    sourceUrls: ["https://axis.com/silver-fof"],
    lastUpdatedAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "c5",
    fundId: "sbi-psu",
    fundName: "SBI PSU Fund Direct Growth",
    category: "equity",
    chunkType: "fees_loads",
    content: "SBI PSU Fund Direct expense ratio is 0.78 percent. Exit load 0.5 percent within 30 days. AMC fee structure.",
    sourceUrls: ["https://sbimf.com/psu"],
    lastUpdatedAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "c6",
    fundId: "sbi-psu",
    fundName: "SBI PSU Fund Direct Growth",
    category: "equity",
    chunkType: "performance",
    content: "SBI PSU Fund Direct 3-year return 18.9 percent CAGR. 5-year 16.2 percent CAGR.",
    sourceUrls: ["https://sbimf.com/psu"],
    lastUpdatedAt: "2026-05-24T00:00:00Z",
  },
];

vi.mock("@/lib/data", () => ({
  getAllChunks: vi.fn(async () => apiSuccess<FundChunk[]>(MOCK_CHUNKS)),
}));

import {
  tokenize,
  termFrequency,
  buildIndex,
  retrieveTopK,
  getIndexStats,
  __resetIndex,
} from "@/tools/rag-retriever";

beforeEach(() => {
  __resetIndex();
});

/* ════════════════════════════════════════════════════════════════
   tokenize
   ════════════════════════════════════════════════════════════════ */

describe("tokenize()", () => {
  it("lowercases, splits on non-alphanumeric, drops stopwords", () => {
    const out = tokenize("HDFC Silver ETF FoF has an expense ratio of 0.49 percent");
    expect(out).toContain("hdfc");
    expect(out).toContain("silver");
    expect(out).toContain("expense");
    expect(out).toContain("ratio");
    expect(out).toContain("49");
    expect(out).not.toContain("of");
    expect(out).not.toContain("an");
    expect(out).not.toContain("the");
  });

  it("returns [] for empty input", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("drops 1-char tokens", () => {
    const out = tokenize("a b c hdfc 1 2 silver");
    expect(out).toEqual(["hdfc", "silver"]);
  });
});

describe("termFrequency()", () => {
  it("counts term occurrences", () => {
    const tf = termFrequency(["hdfc", "silver", "hdfc", "fund", "silver", "hdfc"]);
    expect(tf.get("hdfc")).toBe(3);
    expect(tf.get("silver")).toBe(2);
    expect(tf.get("fund")).toBe(1);
  });
});

/* ════════════════════════════════════════════════════════════════
   buildIndex
   ════════════════════════════════════════════════════════════════ */

describe("buildIndex()", () => {
  it("indexes all 6 mock chunks", async () => {
    const idx = await buildIndex();
    expect(idx.N).toBe(6);
    expect(idx.chunks).toHaveLength(6);
    expect(idx.idf.size).toBeGreaterThan(10);
  });

  it("is idempotent — second call returns the same instance", async () => {
    const a = await buildIndex();
    const b = await buildIndex();
    expect(a).toBe(b);
  });

  it("__resetIndex forces a rebuild", async () => {
    const a = await buildIndex();
    __resetIndex();
    const b = await buildIndex();
    expect(a).not.toBe(b);
  });

  it("getIndexStats reports vocab + builtAt", async () => {
    const s = await getIndexStats();
    expect(s.N).toBe(6);
    expect(s.vocabSize).toBeGreaterThan(0);
    expect(s.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

/* ════════════════════════════════════════════════════════════════
   retrieveTopK
   ════════════════════════════════════════════════════════════════ */

describe("retrieveTopK()", () => {
  it("returns top-k chunks ranked by cosine similarity", async () => {
    const out = await retrieveTopK("HDFC Silver expense ratio", { k: 3 });
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(3);
    /* The top result should be the HDFC Silver fees chunk */
    expect(out[0].chunk.id).toBe("c1");
    expect(out[0].score).toBeGreaterThan(0);
  });

  it("respects the k cap (clamps to [1,16])", async () => {
    const huge = await retrieveTopK("expense ratio", { k: 100 });
    expect(huge.length).toBeLessThanOrEqual(16);

    const tiny = await retrieveTopK("expense ratio", { k: 0 });
    expect(tiny.length).toBeLessThanOrEqual(1);
  });

  it("filters by fundIds allowlist", async () => {
    const out = await retrieveTopK("expense ratio", { fundIds: ["sbi-psu"] });
    expect(out.every((r) => r.chunk.fundId === "sbi-psu")).toBe(true);
  });

  it("filters by chunkTypes", async () => {
    const out = await retrieveTopK("expense ratio", { chunkTypes: ["fees_loads"] });
    expect(out.every((r) => r.chunk.chunkType === "fees_loads")).toBe(true);
  });

  it("filters by categories", async () => {
    const out = await retrieveTopK("expense ratio", { categories: ["commodity"] });
    expect(out.every((r) => r.chunk.category === "commodity")).toBe(true);
  });

  it("respects minScore", async () => {
    const out = await retrieveTopK("expense ratio", { minScore: 0.999 });
    expect(out.length).toBe(0);
  });

  it("returns [] when query has only OOV terms", async () => {
    const out = await retrieveTopK("xylophone zebra quantum");
    expect(out).toEqual([]);
  });

  it("returns [] when query is empty / whitespace", async () => {
    expect(await retrieveTopK("")).toEqual([]);
    expect(await retrieveTopK("   ")).toEqual([]);
  });

  it("scores HDFC vs Axis differently for HDFC-specific query", async () => {
    const out = await retrieveTopK("HDFC silver fund expense ratio");
    const hdfcResult = out.find((r) => r.chunk.fundId === "hdfc-silv");
    const axisResult = out.find((r) => r.chunk.fundId === "axis-silv");
    if (hdfcResult && axisResult) {
      expect(hdfcResult.score).toBeGreaterThan(axisResult.score);
    } else {
      expect(hdfcResult).toBeDefined();
    }
  });

  it("performance chunks rank near top for performance-keyword queries", async () => {
    /* Cosine similarity is length-normalized — short, focused docs can
     * outrank longer ones even with more matched terms. We assert the
     * HDFC Silver performance chunk is in the top-3 rather than #1. */
    const out = await retrieveTopK("HDFC Silver 1-year return CAGR NAV", { k: 4 });
    const topThree = out.slice(0, 3).map((r) => r.chunk.id);
    expect(topThree).toContain("c2"); // HDFC perf
    /* And at least one top result should be a performance chunk */
    expect(out.slice(0, 3).some((r) => r.chunk.chunkType === "performance")).toBe(true);
  });

  it("sorted descending by score", async () => {
    const out = await retrieveTopK("expense ratio", { k: 5 });
    for (let i = 1; i < out.length; i++) {
      expect(out[i].score).toBeLessThanOrEqual(out[i - 1].score);
    }
  });
});
