/**
 * Phase 12 — pulse-validator.ts
 *
 * Pure-function tests for the Req-6 structural enforcer.
 * No I/O — runs offline.
 */

import { describe, expect, it } from "vitest";
import {
  countWords,
  validatePulseCandidate,
  type PulseCandidate,
} from "@/lib/pulse-validator";
import type { PulseTheme } from "@/types";

const validThemes: PulseTheme[] = [
  { name: "KYC Friction",       reviewCount: 12, isTopThree: true,  sentiment: "negative" },
  { name: "SIP Auto-debit",     reviewCount: 9,  isTopThree: true,  sentiment: "negative" },
  { name: "Statement Confusion", reviewCount: 7, isTopThree: true,  sentiment: "neutral"  },
  { name: "Onboarding Praise",  reviewCount: 3,  isTopThree: false, sentiment: "positive" },
];

const validCandidate: PulseCandidate = {
  summaryText:
    "This week's reviews surface a sharp uptick in KYC friction; SIP auto-debit failures " +
    "remain second; statement confusion is third. Sentiment net-negative but onboarding praise rising. " +
    "Recommended posture: tighten KYC UX and ship the statement explainer card.",
  themes: validThemes,
  quotes: [
    "Asked to upload PAN three times this week.",
    "SIP failed on May 15 and again on May 30.",
    "FY26 statement looks completely different from last year.",
  ],
  actionIdeas: [
    "Ship a guided KYC re-verification flow.",
    "Publish a Finance Bill 2026 statement format explainer.",
    "Trigger proactive banner ahead of mandate-failure windows.",
  ],
};

describe("countWords", () => {
  it("handles empty + whitespace", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });
  it("counts whitespace-separated tokens", () => {
    expect(countWords("one two three")).toBe(3);
    expect(countWords("one  two\nthree\t four")).toBe(4);
  });
});

describe("validatePulseCandidate — happy path", () => {
  it("passes a fully-valid candidate", () => {
    const v = validatePulseCandidate(validCandidate);
    expect(v.ok).toBe(true);
    expect(v.errors).toHaveLength(0);
  });

  it("returns scrubbed copy even on pass", () => {
    const v = validatePulseCandidate(validCandidate);
    expect(v.scrubbed.summaryText).toBe(validCandidate.summaryText);
  });
});

describe("validatePulseCandidate — Req 6 constraints", () => {
  it("flags >250 words", () => {
    const tooLong: PulseCandidate = {
      ...validCandidate,
      summaryText: "word ".repeat(260).trim(),
    };
    const v = validatePulseCandidate(tooLong);
    expect(v.ok).toBe(false);
    expect(v.errors).toContain("word_limit_exceeded");
  });

  it("flags missing summary", () => {
    const v = validatePulseCandidate({ ...validCandidate, summaryText: "" });
    expect(v.errors).toContain("missing_summary");
  });

  it("flags quote count != 3", () => {
    const v1 = validatePulseCandidate({ ...validCandidate, quotes: validCandidate.quotes.slice(0, 2) });
    const v2 = validatePulseCandidate({ ...validCandidate, quotes: [...validCandidate.quotes, "extra"] });
    expect(v1.errors).toContain("quote_count_invalid");
    expect(v2.errors).toContain("quote_count_invalid");
  });

  it("flags action count != 3", () => {
    const v1 = validatePulseCandidate({ ...validCandidate, actionIdeas: validCandidate.actionIdeas.slice(0, 2) });
    const v2 = validatePulseCandidate({ ...validCandidate, actionIdeas: [...validCandidate.actionIdeas, "do another"] });
    expect(v1.errors).toContain("action_count_invalid");
    expect(v2.errors).toContain("action_count_invalid");
  });

  it("flags theme count >5 or 0", () => {
    const sixThemes = Array.from({ length: 6 }, (_, i) => validThemes[0]);
    const v = validatePulseCandidate({ ...validCandidate, themes: sixThemes });
    expect(v.errors).toContain("theme_count_invalid");

    const zero = validatePulseCandidate({ ...validCandidate, themes: [] });
    expect(zero.errors).toContain("theme_count_invalid");
  });

  it("requires top-three marking on first 3 themes", () => {
    const wrongTop: PulseTheme[] = validThemes.map((t, i) => ({ ...t, isTopThree: i === 0 }));
    const v = validatePulseCandidate({ ...validCandidate, themes: wrongTop });
    expect(v.errors).toContain("top_three_marking_invalid");
  });

  it("with <3 themes, every theme must be isTopThree=true", () => {
    const two: PulseTheme[] = validThemes.slice(0, 2).map((t) => ({ ...t, isTopThree: false }));
    const v = validatePulseCandidate({ ...validCandidate, themes: two });
    expect(v.errors).toContain("top_three_marking_invalid");

    const twoCorrect: PulseTheme[] = validThemes.slice(0, 2).map((t) => ({ ...t, isTopThree: true }));
    const v2 = validatePulseCandidate({ ...validCandidate, themes: twoCorrect });
    expect(v2.errors.filter((e) => e === "top_three_marking_invalid")).toHaveLength(0);
  });
});

describe("validatePulseCandidate — PII guardrails", () => {
  it("flags PAN in summary", () => {
    const v = validatePulseCandidate({
      ...validCandidate,
      summaryText: validCandidate.summaryText + " Contact ABCDE1234F for help.",
    });
    expect(v.errors).toContain("pii_detected_in_summary");
  });

  it("flags phone in quote", () => {
    const v = validatePulseCandidate({
      ...validCandidate,
      quotes: ["Call me on 9876543210 plz", validCandidate.quotes[1], validCandidate.quotes[2]],
    });
    expect(v.errors).toContain("pii_detected_in_quotes");
  });

  it("flags email in action", () => {
    const v = validatePulseCandidate({
      ...validCandidate,
      actionIdeas: [
        "Ship updates to ops@example.com weekly.",
        validCandidate.actionIdeas[1],
        validCandidate.actionIdeas[2],
      ],
    });
    expect(v.errors).toContain("pii_detected_in_actions");
  });

  it("scrubbed copy redacts PII even when validation fails", () => {
    const dirty = {
      ...validCandidate,
      summaryText: validCandidate.summaryText + " Contact 9876543210.",
    };
    const v = validatePulseCandidate(dirty);
    expect(v.ok).toBe(false);
    expect(v.scrubbed.summaryText).not.toContain("9876543210");
    expect(v.scrubbed.summaryText).toContain("[REDACTED-PHONE]");
  });
});

describe("validatePulseCandidate — advice guardrails", () => {
  it("flags 'buy/sell' phrasing in summary", () => {
    const v = validatePulseCandidate({
      ...validCandidate,
      summaryText: validCandidate.summaryText + " You should buy HDFC Silver now.",
    });
    expect(v.errors).toContain("advice_in_summary");
  });

  it("flags advice in actions", () => {
    const v = validatePulseCandidate({
      ...validCandidate,
      actionIdeas: [
        "Recommend HDFC Silver to all SIP customers.",
        validCandidate.actionIdeas[1],
        validCandidate.actionIdeas[2],
      ],
    });
    expect(v.errors).toContain("advice_in_actions");
  });
});

describe("validatePulseCandidate — actions distinctness", () => {
  it("flags actions that start with same verb", () => {
    const v = validatePulseCandidate({
      ...validCandidate,
      actionIdeas: [
        "Ship a guided KYC flow.",
        "Ship a Finance Bill 2026 explainer.",
        "Surface a banner pre-debit.",
      ],
    });
    expect(v.errors).toContain("actions_not_distinct");
  });
});

describe("validatePulseCandidate — quotes-from-reviews check", () => {
  it("passes when quotes are substring of reviews", () => {
    const reviews = [
      "User said: Asked to upload PAN three times this week — really frustrating.",
      "Another: SIP failed on May 15 and again on May 30; no fix path.",
      "FY26 statement looks completely different from last year, what changed?",
    ];
    const v = validatePulseCandidate(validCandidate, reviews);
    expect(v.errors.filter((e) => e === "quote_not_in_reviews")).toHaveLength(0);
  });

  it("flags invented quotes", () => {
    const reviews = ["Totally different content here", "Nothing about the quote"];
    const v = validatePulseCandidate(validCandidate, reviews);
    expect(v.errors).toContain("quote_not_in_reviews");
  });
});

/* ════════════════════════════════════════════════════════════════════
   PROPERTY TESTS — exhaustive random fuzzing on a small grid
   ════════════════════════════════════════════════════════════════════ */

describe("validatePulseCandidate — property: random word counts", () => {
  it("never accepts >250 words across 50 random sizes", () => {
    for (let i = 0; i < 50; i++) {
      const n = 251 + Math.floor(Math.random() * 200);
      const c: PulseCandidate = {
        ...validCandidate,
        summaryText: "lorem ".repeat(n).trim(),
      };
      expect(validatePulseCandidate(c).ok).toBe(false);
    }
  });

  it("accepts <=250 words across 30 random sizes (everything else valid)", () => {
    for (let i = 0; i < 30; i++) {
      const n = 50 + Math.floor(Math.random() * 200);
      const c: PulseCandidate = {
        ...validCandidate,
        summaryText: "lorem ".repeat(n).trim(),
      };
      const v = validatePulseCandidate(c);
      // We allow the candidate to fail only on advice/PII (lorem text has none).
      const onlyExpectedErrors = v.errors.every((e) => e !== "word_limit_exceeded");
      expect(onlyExpectedErrors).toBe(true);
    }
  });
});
