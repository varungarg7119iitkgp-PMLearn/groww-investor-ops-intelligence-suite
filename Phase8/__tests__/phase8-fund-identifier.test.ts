/**
 * Phase 8 — Fund identifier unit tests
 *
 * Mocks `@/lib/data#getFunds` so we control the universe used for
 * alias matching.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Fund } from "@/types";
import { apiSuccess } from "@/types";

const MOCK_FUNDS: Fund[] = [
  {
    fundId: "hdfc-silv",
    name: "HDFC Silver ETF FoF",
    symbol: "HDFC-SILV",
    category: "commodity",
    nav: 25.6,
    navChange: 1.2,
    navChangePercent: 4.92,
    sourceUrls: ["https://hdfc.com/silver-fof"],
    keywordAliases: ["hdfc silver", "hdfc silver etf", "hdfc silver fof"],
    lastUpdatedAt: "2026-05-01T00:00:00Z",
  },
  {
    fundId: "axis-silv",
    name: "Axis Silver FoF",
    symbol: "AXIS-SILV",
    category: "commodity",
    nav: 23.45,
    navChange: -0.23,
    navChangePercent: -0.97,
    sourceUrls: ["https://axis.com/silver-fof"],
    keywordAliases: ["axis silver", "axis silver fof"],
    lastUpdatedAt: "2026-05-01T00:00:00Z",
  },
  {
    fundId: "sbi-psu",
    name: "SBI PSU Fund Direct Growth",
    symbol: "SBI-PSU",
    category: "equity",
    nav: 32.1,
    navChange: 2.1,
    navChangePercent: 7.0,
    sourceUrls: ["https://sbimf.com/psu"],
    keywordAliases: ["sbi psu", "sbi psu fund", "sbi public sector"],
    lastUpdatedAt: "2026-05-01T00:00:00Z",
  },
  {
    fundId: "hdfc-hyb",
    name: "HDFC Hybrid Equity Fund",
    symbol: "HDFC-HYB",
    category: "hybrid",
    nav: 98.23,
    navChange: 1.45,
    navChangePercent: 1.5,
    sourceUrls: ["https://hdfcfund.com/hybrid"],
    keywordAliases: ["hdfc hybrid", "hdfc hybrid equity"],
    lastUpdatedAt: "2026-05-01T00:00:00Z",
  },
];

vi.mock("@/lib/data", () => ({
  getFunds: vi.fn(async () => apiSuccess<Fund[]>(MOCK_FUNDS)),
}));

import { identifyFunds, __resetFundCache } from "@/lib/fund-identifier";

beforeEach(() => {
  __resetFundCache();
});

describe("identifyFunds()", () => {
  it("returns none for empty input", async () => {
    const out = await identifyFunds("");
    expect(out.confidence).toBe("none");
    expect(out.fundIds).toEqual([]);
  });

  it("matches an exact fund name (alias)", async () => {
    const out = await identifyFunds("Tell me about HDFC Silver ETF FoF performance");
    expect(out.fundIds).toContain("hdfc-silv");
    expect(out.confidence).toMatch(/^(exact|substring)$/);
  });

  it("matches by alias substring", async () => {
    const out = await identifyFunds("What is the expense ratio of hdfc silver?");
    expect(out.fundIds).toContain("hdfc-silv");
    expect(out.matchedFunds[0].name).toBe("HDFC Silver ETF FoF");
  });

  it("can match multiple funds at once", async () => {
    const out = await identifyFunds(
      "Compare HDFC Silver ETF FoF and Axis Silver FoF",
    );
    expect(out.fundIds).toContain("hdfc-silv");
    expect(out.fundIds).toContain("axis-silv");
    expect(out.fundIds.length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to category when no fund alias hits", async () => {
    const out = await identifyFunds("Compare debt funds risk levels");
    /* No fund alias contains "debt", so we should hit the category fallback */
    expect(out.confidence).toBe("category");
    expect(out.categories).toContain("debt");
  });

  it("returns 'none' for off-topic queries", async () => {
    const out = await identifyFunds("Tell me about Bitcoin prices today");
    expect(out.confidence).toBe("none");
    expect(out.fundIds).toEqual([]);
  });

  it("is case-insensitive", async () => {
    const a = await identifyFunds("hdfc silver etf fof");
    const b = await identifyFunds("HDFC SILVER ETF FOF");
    expect(a.fundIds).toEqual(b.fundIds);
  });

  it("matched aliases are returned for transparency", async () => {
    const out = await identifyFunds("hdfc silver expense ratio");
    expect(out.matchedAliases.length).toBeGreaterThan(0);
  });

  it("symbol match works", async () => {
    const out = await identifyFunds("HDFC-SILV details");
    expect(out.fundIds).toContain("hdfc-silv");
  });

  it("category-fallback returns all funds in matched category", async () => {
    const out = await identifyFunds("Show me all commodity funds");
    /* Commodity should hit both HDFC and Axis silver funds */
    expect(out.confidence).toBe("category");
    expect(out.fundIds.length).toBe(2);
  });
});
