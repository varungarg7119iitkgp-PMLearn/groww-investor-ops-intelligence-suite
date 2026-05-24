/**
 * Phase 12 — GET /api/fee-explainer
 *
 * Integration tests for the standalone fee-explainer route.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

const getFeeScenarioMock     = vi.fn();
const getAllFeeScenariosMock = vi.fn();
vi.mock("@/lib/data", () => ({
  getFeeScenario:      (t: string) => getFeeScenarioMock(t),
  getAllFeeScenarios:  () => getAllFeeScenariosMock(),
}));

beforeEach(() => {
  getFeeScenarioMock.mockReset();
  getAllFeeScenariosMock.mockReset();
});

async function callGet(query: string) {
  const { GET } = await import("@/app/api/fee-explainer/route");
  const req = new Request(`http://localhost/api/fee-explainer?${query}`);
  const res = await GET(req);
  return { status: res.status, json: await res.json() };
}

describe("/api/fee-explainer", () => {
  it("returns one explainer for a known scenario", async () => {
    getFeeScenarioMock.mockResolvedValue({
      data: {
        type: "expense_ratio",
        title: "Expense Ratio",
        description: "Annual recurring fee",
        typicalRange: "0.10% - 2.25%",
        bullets: [
          "Charged annually by AMC", "Adjusted in NAV daily",
          "Direct plans cheaper than Regular", "Capped by SEBI",
          "Equity: max 2.25%", "Debt: max 2.00%",
        ],
        sourceUrls: ["https://sebi.gov.in/x", "https://amfiindia.com/y"],
        lastChecked: "2026-05-01",
      },
      error: null,
    });
    const { status, json } = await callGet("type=expense_ratio");
    expect(status).toBe(200);
    expect(json.explainer.bullets.length).toBeLessThanOrEqual(6);
    expect(json.explainer.sources.length).toBe(2);
    expect(json.explainer.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("trims bullets > 6 to exactly 6 (Req 7)", async () => {
    const tooMany = Array.from({ length: 10 }, (_, i) => `bullet ${i + 1}`);
    getFeeScenarioMock.mockResolvedValue({
      data: {
        type: "exit_load",
        title: "Exit Load",
        description: "",
        typicalRange: "",
        bullets: tooMany,
        sourceUrls: ["https://a.com", "https://b.com", "https://c.com"], // 3 → truncate
        lastChecked: "2026-05-01",
      },
      error: null,
    });
    const { json } = await callGet("type=exit_load");
    expect(json.explainer.bullets).toHaveLength(6);
    expect(json.explainer.sources).toHaveLength(2);
  });

  it("returns 400 on unknown scenario", async () => {
    const { status, json } = await callGet("type=mystery");
    expect(status).toBe(400);
    expect(json.error).toMatch(/Unknown fee scenario/);
    expect(json.knownScenarios).toContain("expense_ratio");
  });

  it("returns all explainers when type is omitted", async () => {
    getAllFeeScenariosMock.mockResolvedValue({
      data: Array.from({ length: 5 }, (_, i) => ({
        type: ["expense_ratio","exit_load","tcs","brokerage","account_maintenance"][i],
        title: "",
        description: "",
        typicalRange: "",
        bullets: ["a","b","c"],
        sourceUrls: ["https://a.com", "https://b.com"],
        lastChecked: "2026-05-01",
      })),
      error: null,
    });
    const { status, json } = await callGet("");
    expect(status).toBe(200);
    expect(json.explainers).toHaveLength(5);
    expect(json.knownScenarios).toHaveLength(5);
  });

  it("returns 404 when DB has no row for the scenario", async () => {
    getFeeScenarioMock.mockResolvedValue({ data: null, error: null });
    const { status, json } = await callGet("type=tcs");
    expect(status).toBe(404);
    expect(json.error).toMatch(/No data found/);
  });
});
