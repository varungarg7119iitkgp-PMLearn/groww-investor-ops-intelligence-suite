/**
 * Phase 8 — Compliance v1 unit tests
 *
 * Covers: no-advice detection, out-of-scope detection, minimal-PII
 * detection, and the input/output guardrail entrypoints.
 */

import { describe, expect, it } from "vitest";
import {
  isAdviceRequest,
  isOutOfScope,
  detectMinimalPII,
  runInputGuard,
  runOutputGuard,
} from "@/lib/compliance";

/* ════════════════════════════════════════════════════════════════
   No-Advice
   ════════════════════════════════════════════════════════════════ */

describe("isAdviceRequest()", () => {
  const adviceQueries = [
    "Should I buy HDFC Silver ETF?",
    "Can I invest in equity funds now?",
    "Is it a good time to invest in PSU funds?",
    "Best fund to invest in for long term",
    "Which mutual fund should I invest in?",
    "Recommend me a SIP fund",
    "Suggest some debt funds for me",
    "Give me a recommendation for ELSS",
    "Pick a fund for me",
    "Where should I invest 1 lakh?",
    "Which is better, HDFC or ICICI?",
    "Should I start an SIP now?",
    "Should I lump sum 5 lakh?",
    "Good pick for long term?",
    "Predict the return of HDFC Silver next year",
    "What will my SIP grow to in 5 years?",
    "Guaranteed return funds?",
    "Is HDFC Silver safe to invest?",
    "Is this a good buy?",
    "Worth investing in SBI PSU?",
    "Top 5 funds for short term",
    "Portfolio allocation recommendation",
  ];

  for (const q of adviceQueries) {
    it(`flags advice: "${q}"`, () => {
      expect(isAdviceRequest(q)).toBe(true);
    });
  }

  const factualQueries = [
    "What is the expense ratio of HDFC Silver ETF?",
    "Tell me about HDFC Hybrid Equity Fund performance",
    "What is the NAV of Axis Silver FoF?",
    "Compare exit loads across PSU funds",
    "What is TCS on overseas funds?",
  ];
  for (const q of factualQueries) {
    it(`does NOT flag factual: "${q}"`, () => {
      expect(isAdviceRequest(q)).toBe(false);
    });
  }

  it("empty input → false", () => {
    expect(isAdviceRequest("")).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════════
   Out-of-scope
   ════════════════════════════════════════════════════════════════ */

describe("isOutOfScope()", () => {
  const offTopic = [
    "Tell me about Bitcoin",
    "What is Ethereum price?",
    "Real estate investments in Mumbai",
    "REIT vs mutual funds",
    "Individual stock picks for IT sector",
    "Forex trading strategy",
    "Options trading basics",
    "Best term insurance plan",
    "Personal loan eligibility",
    "Home loan EMI calculation",
    "Credit card vs UPI",
    "NFT investing",
    "Commodity futures trading",
  ];
  for (const q of offTopic) {
    it(`flags off-topic: "${q}"`, () => {
      expect(isOutOfScope(q)).toBe(true);
    });
  }

  it("does not flag mutual-fund queries (even if they mention commodity)", () => {
    expect(isOutOfScope("HDFC Silver ETF commodity fund details")).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════════
   PII v1
   ════════════════════════════════════════════════════════════════ */

describe("detectMinimalPII()", () => {
  it("detects emails", () => {
    const { emails } = detectMinimalPII("Email me at varun@gmail.com");
    expect(emails).toContain("varun@gmail.com");
  });

  it("detects phone numbers (10-13 digits)", () => {
    const { phones } = detectMinimalPII("Call me at +91 98765 43210");
    expect(phones.length).toBeGreaterThan(0);
  });

  it("does NOT detect short numbers (NAV, percentages)", () => {
    const { phones } = detectMinimalPII("NAV is 25.60 and return is 18.7%");
    expect(phones).toEqual([]);
  });

  it("does NOT detect dates", () => {
    const { phones } = detectMinimalPII("Last updated 2026-05-24");
    expect(phones).toEqual([]);
  });

  it("returns empty for empty input", () => {
    const r = detectMinimalPII("");
    expect(r.phones).toEqual([]);
    expect(r.emails).toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════════
   Guardrail entrypoints
   ════════════════════════════════════════════════════════════════ */

describe("runInputGuard()", () => {
  it("passes factual queries", () => {
    const r = runInputGuard("What is the expense ratio of HDFC Silver?");
    expect(r.pass).toBe(true);
  });

  it("blocks advice queries with type=advice", () => {
    const r = runInputGuard("Should I buy HDFC Silver?");
    expect(r.pass).toBe(false);
    if (!r.pass) expect(r.type).toBe("advice");
  });

  it("blocks out-of-scope queries with type=out_of_scope", () => {
    const r = runInputGuard("Tell me about Bitcoin");
    expect(r.pass).toBe(false);
    if (!r.pass) expect(r.type).toBe("out_of_scope");
  });

  it("blocks PII queries with type=pii", () => {
    const r = runInputGuard("My phone is 9876543210, what is HDFC Silver?");
    expect(r.pass).toBe(false);
    if (!r.pass) expect(r.type).toBe("pii");
  });

  it("passes empty input (handled upstream)", () => {
    expect(runInputGuard("").pass).toBe(true);
    expect(runInputGuard("   ").pass).toBe(true);
  });
});

describe("runOutputGuard()", () => {
  it("passes neutral output", () => {
    const r = runOutputGuard("HDFC Silver ETF has expense ratio of 0.49 percent.");
    expect(r.pass).toBe(true);
  });

  it("blocks advice output (defense-in-depth)", () => {
    const r = runOutputGuard("You should buy HDFC Silver ETF for long term.");
    expect(r.pass).toBe(false);
  });

  it("blocks PII in output", () => {
    const r = runOutputGuard("Contact us at support@example.com for details.");
    expect(r.pass).toBe(false);
  });

  it("passes empty output", () => {
    expect(runOutputGuard("").pass).toBe(true);
  });
});
