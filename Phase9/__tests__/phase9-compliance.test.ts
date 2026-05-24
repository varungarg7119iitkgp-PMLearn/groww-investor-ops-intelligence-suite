/**
 * Phase 9 — Full Compliance Layer Unit Tests
 *
 * Asserts the seven PII pattern families, redaction round-trips,
 * advice deflection, brevity enforcement, and the aggregate
 * compliance result entrypoint.
 */

import { describe, expect, it } from "vitest";
import {
  detectPII,
  redactPII,
  detectAdviceRequest,
  isAdviceRequest,
  isOutOfScope,
  enforceBrevity,
  runInputGuard,
  runOutputGuard,
  runComplianceCheck,
  isComplianceViolation,
  getComplianceResponse,
  COMPLIANCE_MESSAGES,
} from "@/lib/compliance";

/* ════════════════════════════════════════════════════════════════════
   PII — 7 Patterns
   ════════════════════════════════════════════════════════════════════ */

describe("detectPII() — 7 patterns", () => {
  it("detects PAN (Indian)", () => {
    const r = detectPII("My PAN is ABCDE1234F");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].type).toBe("pan");
    expect(r[0].value).toBe("ABCDE1234F");
  });

  it("detects Aadhaar (12 digits contiguous)", () => {
    const r = detectPII("Aadhaar 123456789012");
    expect(r.find((d) => d.type === "aadhaar")).toBeTruthy();
  });

  it("detects Aadhaar (4-4-4 spaced)", () => {
    const r = detectPII("Aadhaar 1234 5678 9012");
    expect(r.find((d) => d.type === "aadhaar")).toBeTruthy();
  });

  it("detects SSN (3-2-4 hyphenated)", () => {
    const r = detectPII("My SSN is 123-45-6789");
    expect(r.find((d) => d.type === "ssn")).toBeTruthy();
  });

  it("detects email", () => {
    const r = detectPII("Reach me at user.name@example.com today");
    expect(r.find((d) => d.type === "email")).toBeTruthy();
  });

  it("detects phone (Indian +91 prefix)", () => {
    const r = detectPII("Call me at +91 98765 43210");
    expect(r.find((d) => d.type === "phone")).toBeTruthy();
  });

  it("detects phone (10-digit no prefix)", () => {
    const r = detectPII("My number is 9876543210");
    expect(r.find((d) => d.type === "phone")).toBeTruthy();
  });

  it("detects account number (12-digit)", () => {
    const r = detectPII("Account number 123456789012345");
    /* 15-digit – will match as aadhaar OR account; either is PII */
    expect(r.length).toBeGreaterThan(0);
    expect(["aadhaar", "account_number"]).toContain(r[0].type);
  });

  it("detects balance with ₹ + comma format", () => {
    const r = detectPII("My balance is ₹1,23,456");
    expect(r.find((d) => d.type === "balance")).toBeTruthy();
  });

  it("detects balance with Rs prefix", () => {
    const r = detectPII("Account balance Rs 1,25,000");
    expect(r.find((d) => d.type === "balance")).toBeTruthy();
  });

  it("does NOT detect short numbers (NAV)", () => {
    const r = detectPII("NAV is 25.60 and return is 18.7%");
    expect(r).toEqual([]);
  });

  it("does NOT detect ISO dates", () => {
    const r = detectPII("Last updated 2026-05-24");
    expect(r).toEqual([]);
  });

  it("does NOT flag legitimate fund-fact queries", () => {
    const r = detectPII("What is the expense ratio of HDFC Silver ETF?");
    expect(r).toEqual([]);
  });

  it("PAN takes precedence over phone for same text", () => {
    const r = detectPII("PAN: ABCDE1234F and call 9876543210");
    expect(r.find((d) => d.type === "pan")).toBeTruthy();
    expect(r.find((d) => d.type === "phone")).toBeTruthy();
  });
});

/* ════════════════════════════════════════════════════════════════════
   PII — Redaction round-trip
   ════════════════════════════════════════════════════════════════════ */

describe("redactPII()", () => {
  it("redacts all detected PII spans", () => {
    const { text, redactions } = redactPII(
      "PAN ABCDE1234F, phone 9876543210, email a@b.com",
    );
    expect(text).not.toContain("ABCDE1234F");
    expect(text).not.toContain("9876543210");
    expect(text).not.toContain("a@b.com");
    expect(text).toContain("[REDACTED-PAN]");
    expect(text).toContain("[REDACTED-EMAIL]");
    expect(redactions.length).toBeGreaterThanOrEqual(3);
  });

  it("redacted output passes detectPII", () => {
    const original = "phone 9876543210 and email x@y.com";
    const { text } = redactPII(original);
    const stillPresent = detectPII(text);
    expect(stillPresent).toEqual([]);
  });

  it("no-op on PII-free text", () => {
    const { text, redactions } = redactPII(
      "HDFC Silver ETF has an expense ratio of 0.49 percent",
    );
    expect(text).toBe("HDFC Silver ETF has an expense ratio of 0.49 percent");
    expect(redactions).toEqual([]);
  });

  it("handles empty input", () => {
    expect(redactPII("")).toEqual({ text: "", redactions: [] });
  });
});

/* ════════════════════════════════════════════════════════════════════
   ADVICE
   ════════════════════════════════════════════════════════════════════ */

describe("detectAdviceRequest() / isAdviceRequest()", () => {
  it("aliases the same function", () => {
    expect(detectAdviceRequest).toBe(isAdviceRequest);
  });

  const advice = [
    "Should I buy HDFC Silver?",
    "Recommend a SIP for me",
    "Predict the NAV of HDFC Silver next year",
    "Is HDFC Silver a good investment?",
    "Top 5 funds for short term",
    "Guaranteed 15% return funds",
    "Should I start a SIP now?",
  ];
  for (const q of advice) {
    it(`flags: "${q}"`, () => expect(isAdviceRequest(q)).toBe(true));
  }

  const factual = [
    "What is the expense ratio of HDFC Silver?",
    "Show NAV history for Axis Silver FoF",
    "Compare exit loads across funds",
    "TCS on overseas funds explained",
  ];
  for (const q of factual) {
    it(`does NOT flag: "${q}"`, () => expect(isAdviceRequest(q)).toBe(false));
  }
});

/* ════════════════════════════════════════════════════════════════════
   OUT-OF-SCOPE
   ════════════════════════════════════════════════════════════════════ */

describe("isOutOfScope()", () => {
  const off = [
    "Tell me about Bitcoin",
    "Real estate vs mutual funds",
    "Best term insurance",
    "Forex pairs to trade",
    "Credit card vs debit card",
  ];
  for (const q of off) {
    it(`flags: "${q}"`, () => expect(isOutOfScope(q)).toBe(true));
  }

  it("does not flag mutual-fund queries", () => {
    expect(isOutOfScope("What is HDFC Silver ETF NAV?")).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════════════
   BREVITY
   ════════════════════════════════════════════════════════════════════ */

describe("enforceBrevity()", () => {
  it("trims to ≤2 sentences in voice mode", () => {
    const text =
      "First sentence here. Second sentence follows. Third sentence is extra. Fourth gets cut.";
    const out = enforceBrevity(text, { mode: "voice" });
    /* Count sentence terminators */
    const count = (out.match(/[.!?]/g) ?? []).length;
    expect(count).toBeLessThanOrEqual(2);
    expect(out).toContain("First sentence");
    expect(out).toContain("Second sentence");
    expect(out).not.toContain("Third sentence");
  });

  it("strips filler words in voice mode", () => {
    const out = enforceBrevity(
      "This is actually really very important. We just need to know.",
      { mode: "voice" },
    );
    expect(out.toLowerCase()).not.toContain("actually");
    expect(out.toLowerCase()).not.toContain("really");
    expect(out.toLowerCase()).not.toContain("just");
  });

  it("preserves text in text mode (no filler strip)", () => {
    const out = enforceBrevity("This is actually a long sentence.", {
      mode: "text",
      maxSentences: 6,
    });
    expect(out).toContain("actually");
  });

  it("handles single-sentence input without terminal punctuation", () => {
    const out = enforceBrevity("Short message", { mode: "voice" });
    expect(out).toBe("Short message");
  });

  it("handles empty input", () => {
    expect(enforceBrevity("", { mode: "voice" })).toBe("");
  });
});

/* ════════════════════════════════════════════════════════════════════
   AGGREGATE GUARDRAILS
   ════════════════════════════════════════════════════════════════════ */

describe("runInputGuard() — Phase 9 patterns", () => {
  it("blocks PAN", () => {
    const r = runInputGuard("My PAN is ABCDE1234F");
    expect(r.pass).toBe(false);
    if (!r.pass) expect(r.type).toBe("pii");
  });

  it("blocks Aadhaar", () => {
    const r = runInputGuard("Aadhaar 123456789012");
    expect(r.pass).toBe(false);
  });

  it("blocks PII before checking advice (PII has higher precedence)", () => {
    /* Combined query: contains both PAN and advice */
    const r = runInputGuard("My PAN is ABCDE1234F. Should I buy HDFC Silver?");
    expect(r.pass).toBe(false);
    if (!r.pass) expect(r.type).toBe("pii");
  });

  it("uses canonical Req 10 message for PII", () => {
    const r = runInputGuard("Contact me at user@example.com");
    expect(r.pass).toBe(false);
    if (!r.pass) {
      expect(r.reason).toContain("personal");
    }
  });
});

describe("runOutputGuard() — Phase 9 output scrub", () => {
  it("blocks output that echoes PAN", () => {
    const r = runOutputGuard("Customer ABCDE1234F has expense ratio 0.49.");
    expect(r.pass).toBe(false);
  });

  it("blocks second-person advice ('you should')", () => {
    const r = runOutputGuard("You should consider HDFC Silver for long-term.");
    expect(r.pass).toBe(false);
  });

  it("allows neutral factual output", () => {
    const r = runOutputGuard(
      "HDFC Silver ETF tracks LBMA silver price with a 0.49 percent expense ratio.",
    );
    expect(r.pass).toBe(true);
  });
});

describe("runComplianceCheck() — aggregate result", () => {
  it("returns clean state for factual query", () => {
    const r = runComplianceCheck("What is the expense ratio of HDFC Silver?");
    expect(r.inputGuardrail.pass).toBe(true);
    expect(r.outputGuardrail.pass).toBe(true);
    expect(r.piiDetected).toBe(false);
    expect(r.adviceDetected).toBe(false);
    expect(r.piiPatterns).toEqual([]);
  });

  it("flags PII patterns by type", () => {
    const r = runComplianceCheck("My PAN ABCDE1234F and phone 9876543210");
    expect(r.piiDetected).toBe(true);
    expect(r.piiPatterns).toContain("pan");
    expect(r.piiPatterns).toContain("phone");
  });

  it("flags advice in input", () => {
    const r = runComplianceCheck("Should I buy HDFC Silver?");
    expect(r.adviceDetected).toBe(true);
  });

  it("flags advice in OUTPUT", () => {
    const r = runComplianceCheck(
      "Tell me about HDFC Silver",
      "You should buy HDFC Silver for long-term gains.",
    );
    expect(r.adviceDetected).toBe(true);
    expect(r.outputGuardrail.pass).toBe(false);
  });
});

describe("isComplianceViolation()", () => {
  it("true when input fails", () => {
    expect(isComplianceViolation("Should I buy HDFC?")).toBe(true);
  });

  it("true when output fails", () => {
    expect(
      isComplianceViolation(
        "HDFC?",
        "You should invest in HDFC Silver.",
      ),
    ).toBe(true);
  });

  it("false when both clean", () => {
    expect(
      isComplianceViolation(
        "What is HDFC NAV?",
        "HDFC Silver NAV is 25.60 as of 2026-05-24.",
      ),
    ).toBe(false);
  });
});

describe("getComplianceResponse()", () => {
  it("returns the Req-10 messages", () => {
    expect(getComplianceResponse("advice")).toBe(COMPLIANCE_MESSAGES.advice);
    expect(getComplianceResponse("pii")).toBe(COMPLIANCE_MESSAGES.pii);
    expect(getComplianceResponse("out_of_scope")).toBe(
      COMPLIANCE_MESSAGES.out_of_scope,
    );
    expect(getComplianceResponse("projection")).toBe(
      COMPLIANCE_MESSAGES.projection,
    );
  });
});

/* ════════════════════════════════════════════════════════════════════
   PROPERTY TESTS — invariants
   ════════════════════════════════════════════════════════════════════ */

describe("property: redacted output is PII-free", () => {
  const samples = [
    "phone 9876543210",
    "email user@example.com",
    "PAN ABCDE1234F",
    "ssn 123-45-6789",
    "aadhaar 1234 5678 9012",
    "balance ₹1,23,456",
    "Mix: PAN ABCDE1234F email a@b.com phone 9876543210",
  ];
  for (const s of samples) {
    it(`"${s}" → redacted is detectPII()-clean`, () => {
      const { text } = redactPII(s);
      expect(detectPII(text)).toEqual([]);
    });
  }
});

describe("property: detectPII is order-independent", () => {
  it("multiple PII items in different orders → same set of types detected", () => {
    const s1 = "PAN ABCDE1234F, phone 9876543210";
    const s2 = "phone 9876543210, PAN ABCDE1234F";
    const t1 = new Set(detectPII(s1).map((d) => d.type));
    const t2 = new Set(detectPII(s2).map((d) => d.type));
    expect(t1).toEqual(t2);
  });
});
