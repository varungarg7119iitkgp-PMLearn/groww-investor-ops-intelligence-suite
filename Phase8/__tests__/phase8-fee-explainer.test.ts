/**
 * Phase 8 — Fee Explainer unit tests
 *
 * Tests the scenario detector + the Supabase-backed explainer.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeeScenario, FeeScenarioType } from "@/types";
import { apiSuccess } from "@/types";

const MOCK_SCENARIOS: Record<FeeScenarioType, FeeScenario> = {
  expense_ratio: {
    type: "expense_ratio",
    title: "Expense Ratio",
    description: "Annual fee charged by AMCs as a percentage of AUM.",
    typicalRange: "0.1%–2.5% direct plans; up to 2.25% regular",
    bullets: [
      "Expense ratio is the annual fee taken from your AUM.",
      "Direct plans are typically 50–100 bps cheaper than regular plans.",
      "SEBI caps the maximum TER based on scheme size and category.",
      "Equity funds usually have higher TER than debt funds.",
      "ETF FoFs include both the FoF TER and the underlying ETF TER.",
      "Use AMC factsheets to verify current TER per scheme.",
    ],
    sourceUrls: ["https://amfi.in/te-ratio", "https://sebi.gov.in/mf-fees"],
    lastChecked: "2026-05-01",
  },
  exit_load: {
    type: "exit_load",
    title: "Exit Load",
    description: "Penalty for early redemption.",
    typicalRange: "0.5%–1% within 1 year",
    bullets: [
      "Exit load is charged when you redeem within a defined window.",
      "Equity funds usually have 1% exit load if redeemed within 1 year.",
      "ELSS funds have a 3-year lock-in; no exit load after lock-in.",
      "Liquid funds may have a graded exit load for first 6 days.",
      "Exit load is deducted from NAV before crediting to your bank.",
      "Always check the SID for fund-specific exit-load schedules.",
    ],
    sourceUrls: ["https://amfi.in/exit-load", "https://sebi.gov.in/exit"],
    lastChecked: "2026-05-01",
  },
  tcs: {
    type: "tcs",
    title: "TCS on Overseas Mutual Funds",
    description: "Tax Collected at Source on LRS remittances.",
    typicalRange: "20% above ₹7 lakh threshold",
    bullets: [
      "TCS applies to international fund investments under the LRS.",
      "Threshold of ₹7 lakh per FY per individual.",
      "Above threshold, 20% TCS is collected.",
      "TCS is refundable against income tax dues at year-end.",
      "Indian-listed mutual funds investing in overseas equities are exempt.",
      "Consult a tax advisor for cross-border MF positions.",
    ],
    sourceUrls: ["https://rbi.org.in/lrs", "https://incometax.gov.in/tcs"],
    lastChecked: "2026-05-01",
  },
  brokerage: {
    type: "brokerage",
    title: "Brokerage / Distributor Commission",
    description: "Trail commission paid to distributors.",
    typicalRange: "0.25%–1% trail per annum",
    bullets: [
      "Trail commission is paid to distributors as long as you hold the units.",
      "Direct plans pay zero distributor commission.",
      "Commission is embedded in the expense ratio for regular plans.",
      "RIA route pays a fee to the advisor instead.",
      "AMFI mandates full commission disclosure in COSAS.",
      "Verify your fund variant (Direct vs Regular) on the AMC platform.",
    ],
    sourceUrls: ["https://amfi.in/distributor", "https://sebi.gov.in/ria"],
    lastChecked: "2026-05-01",
  },
  account_maintenance: {
    type: "account_maintenance",
    title: "Demat / Folio AMC",
    description: "Annual maintenance charges.",
    typicalRange: "₹0–₹300 per year per demat account",
    bullets: [
      "Mutual fund folios (non-demat) have zero AMC.",
      "Holding ETFs in demat attracts standard demat AMC.",
      "BSDA accounts under ₹50K holdings have zero AMC.",
      "SOA mode (statement of account) is free for MF investors.",
      "Brokerage-specific charges may apply beyond the AMC.",
      "Compare AMC with NSE/BSE listed prices before opening demat.",
    ],
    sourceUrls: ["https://nsdl.co.in/amc", "https://cdsl.co.in/amc"],
    lastChecked: "2026-05-01",
  },
};

vi.mock("@/lib/data", () => ({
  getFeeScenario: vi.fn(async (type: FeeScenarioType) =>
    apiSuccess(MOCK_SCENARIOS[type] ?? null),
  ),
}));

import { detectFeeScenarios, isFeeQuery, explainFees, explainScenario } from "@/tools/fee-explainer";

beforeEach(() => {
  vi.clearAllMocks();
});

/* ════════════════════════════════════════════════════════════════
   detectFeeScenarios
   ════════════════════════════════════════════════════════════════ */

describe("detectFeeScenarios()", () => {
  it("detects expense_ratio queries", () => {
    expect(detectFeeScenarios("What is the expense ratio?")).toContain("expense_ratio");
    expect(detectFeeScenarios("TER of HDFC Silver?")).toContain("expense_ratio");
    expect(detectFeeScenarios("Direct vs Regular plan fees?")).toContain("expense_ratio");
  });

  it("detects exit_load queries", () => {
    expect(detectFeeScenarios("What is the exit load?")).toContain("exit_load");
    expect(detectFeeScenarios("Why was I charged on early redemption?")).toContain("exit_load");
  });

  it("detects tcs queries", () => {
    expect(detectFeeScenarios("What is TCS on overseas funds?")).toContain("tcs");
    expect(detectFeeScenarios("LRS threshold for mutual funds?")).toContain("tcs");
  });

  it("detects brokerage queries", () => {
    expect(detectFeeScenarios("brokerage on mutual funds?")).toContain("brokerage");
    expect(detectFeeScenarios("trail commission to distributors")).toContain("brokerage");
  });

  it("detects account_maintenance queries", () => {
    expect(detectFeeScenarios("demat amc charges?")).toContain("account_maintenance");
    expect(detectFeeScenarios("annual folio maintenance fee?")).toContain("account_maintenance");
  });

  it("returns empty for non-fee queries", () => {
    expect(detectFeeScenarios("Tell me about Bitcoin")).toEqual([]);
    expect(detectFeeScenarios("HDFC Silver 1-year return?")).toEqual([]);
  });

  it("returns multiple scenarios when query mentions multiple", () => {
    const out = detectFeeScenarios("Compare expense ratio and exit load");
    expect(out).toContain("expense_ratio");
    expect(out).toContain("exit_load");
  });
});

describe("isFeeQuery()", () => {
  it("true for any fee phrase", () => {
    expect(isFeeQuery("expense ratio?")).toBe(true);
    expect(isFeeQuery("exit load?")).toBe(true);
  });
  it("false otherwise", () => {
    expect(isFeeQuery("NAV of HDFC Silver?")).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════════
   explainScenario
   ════════════════════════════════════════════════════════════════ */

describe("explainScenario()", () => {
  it("returns a block for a known scenario", async () => {
    const b = await explainScenario("expense_ratio");
    expect(b).not.toBeNull();
    expect(b?.title).toBe("Expense Ratio");
    expect(b?.bullets.length).toBeLessThanOrEqual(6);
    expect(b?.sourceUrls.length).toBeLessThanOrEqual(2);
  });
});

/* ════════════════════════════════════════════════════════════════
   explainFees
   ════════════════════════════════════════════════════════════════ */

describe("explainFees()", () => {
  it("returns empty for non-fee queries", async () => {
    const r = await explainFees("Tell me about Bitcoin");
    expect(r.scenarios).toEqual([]);
    expect(r.asMarkdown).toBe("");
  });

  it("returns one block for one scenario", async () => {
    const r = await explainFees("What is the expense ratio?");
    expect(r.scenarios).toHaveLength(1);
    expect(r.scenarios[0].type).toBe("expense_ratio");
    expect(r.asMarkdown).toContain("Expense Ratio");
    expect(r.asMarkdown).toContain("Last checked:");
  });

  it("merges multiple scenarios into one markdown block", async () => {
    const r = await explainFees("Compare expense ratio and exit load");
    expect(r.scenarios.length).toBe(2);
    expect(r.asMarkdown).toContain("Expense Ratio");
    expect(r.asMarkdown).toContain("Exit Load");
  });

  it("never exceeds 6 bullets per block", async () => {
    const r = await explainFees("expense ratio details");
    for (const b of r.scenarios) {
      expect(b.bullets.length).toBeLessThanOrEqual(6);
    }
  });

  it("exactly 2 source URLs per block", async () => {
    const r = await explainFees("expense ratio details");
    for (const b of r.scenarios) {
      expect(b.sourceUrls.length).toBe(2);
    }
  });

  it("includes lastChecked date per block", async () => {
    const r = await explainFees("expense ratio details");
    expect(r.scenarios[0].lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
