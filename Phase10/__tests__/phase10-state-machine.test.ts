/**
 * Phase 10 — State Machine unit + property tests
 *
 * Covers:
 *   - getNextState() — all valid (current, intent) → next step paths
 *   - isValidTransition() — explicit allow-list
 *   - classifyIntent() / classifyTopic() — keyword classifiers
 *   - generateMockSlots() — exactly 2, future-dated, deterministic
 *   - getRephraseForState() — 3-strike escalation strings
 *   - PROPERTY: state machine never enters undefined state (100 iter)
 */

import { describe, expect, it } from "vitest";
import {
  getNextState,
  isValidTransition,
  getPromptForState,
  classifyIntent,
  classifyTopic,
  isValidTopic,
  generateMockSlots,
  getRephraseForState,
  SILENCE_TIMEOUTS,
} from "@/lib/state-machine";
import { VALID_STEPS, VALID_INTENTS, VALID_TOPICS } from "@/types";

/* ════════════════════════════════════════════════════════════════════
   TRANSITIONS
   ════════════════════════════════════════════════════════════════════ */

describe("isValidTransition() — explicit allow-list", () => {
  it("idle → greeting", () => expect(isValidTransition("idle", "greeting")).toBe(true));
  it("greeting → intent_classification", () =>
    expect(isValidTransition("greeting", "intent_classification")).toBe(true));
  it("intent_classification → faq_resolution", () =>
    expect(isValidTransition("intent_classification", "faq_resolution")).toBe(true));
  it("intent_classification → booking_intent", () =>
    expect(isValidTransition("intent_classification", "booking_intent")).toBe(true));
  it("faq_resolution → booking_intent", () =>
    expect(isValidTransition("faq_resolution", "booking_intent")).toBe(true));
  it("booking_intent → booking_confirmation", () =>
    expect(isValidTransition("booking_intent", "booking_confirmation")).toBe(true));
  it("booking_confirmation → closing", () =>
    expect(isValidTransition("booking_confirmation", "closing")).toBe(true));
  it("closing → idle", () => expect(isValidTransition("closing", "idle")).toBe(true));

  /* Rejected transitions */
  it("idle → booking_intent (skip greeting) rejected", () =>
    expect(isValidTransition("idle", "booking_intent")).toBe(false));
  it("greeting → closing (skip resolution) rejected", () =>
    expect(isValidTransition("greeting", "closing")).toBe(false));
  it("booking_confirmation → faq_resolution rejected", () =>
    expect(isValidTransition("booking_confirmation", "faq_resolution")).toBe(false));
});

/* ════════════════════════════════════════════════════════════════════
   getNextState()
   ════════════════════════════════════════════════════════════════════ */

describe("getNextState() — driven by intent + opts", () => {
  it("idle without intent → greeting", () => {
    expect(getNextState("idle")).toBe("greeting");
  });

  it("greeting → intent_classification", () => {
    expect(getNextState("greeting")).toBe("intent_classification");
  });

  it("intent_classification + booking intent → booking_intent", () => {
    expect(getNextState("intent_classification", "booking")).toBe("booking_intent");
  });

  it("intent_classification + faq → faq_resolution", () => {
    expect(getNextState("intent_classification", "faq")).toBe("faq_resolution");
  });

  it("intent_classification + general → faq_resolution", () => {
    expect(getNextState("intent_classification", "general")).toBe("faq_resolution");
  });

  it("intent_classification + complaint → faq_resolution", () => {
    expect(getNextState("intent_classification", "complaint")).toBe("faq_resolution");
  });

  it("intent_classification + unknown (strike < 3) → intent_classification (retry)", () => {
    expect(getNextState("intent_classification", "unknown", { strikeCount: 2 })).toBe(
      "intent_classification",
    );
  });

  it("intent_classification + unknown (strike >= 3) → closing", () => {
    expect(getNextState("intent_classification", "unknown", { strikeCount: 3 })).toBe(
      "closing",
    );
  });

  it("booking_intent (incomplete) → booking_intent (self)", () => {
    expect(getNextState("booking_intent", "booking")).toBe("booking_intent");
  });

  it("booking_intent (complete) → booking_confirmation", () => {
    expect(getNextState("booking_intent", "booking", { bookingComplete: true })).toBe(
      "booking_confirmation",
    );
  });

  it("booking_confirmation + userConfirmed=true → closing", () => {
    expect(
      getNextState("booking_confirmation", undefined, { userConfirmed: true }),
    ).toBe("closing");
  });

  it("booking_confirmation + no confirmation → booking_intent (re-pick)", () => {
    expect(getNextState("booking_confirmation")).toBe("booking_intent");
  });

  it("userRequestedEnd from anywhere → closing", () => {
    expect(getNextState("faq_resolution", "faq", { userRequestedEnd: true })).toBe(
      "closing",
    );
    expect(getNextState("booking_intent", "booking", { userRequestedEnd: true })).toBe(
      "closing",
    );
  });

  it("closing → idle (reset)", () => {
    expect(getNextState("closing")).toBe("idle");
  });

  it("every resulting transition is in the allow-list", () => {
    /* Sample all step/intent combos */
    for (const step of VALID_STEPS) {
      for (const intent of VALID_INTENTS) {
        const next = getNextState(step, intent, { strikeCount: 1 });
        expect(VALID_STEPS).toContain(next);
        /* Self-loops are allowed where the table permits */
        if (step !== next) {
          expect(isValidTransition(step, next)).toBe(true);
        }
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════════════
   INTENT CLASSIFIER
   ════════════════════════════════════════════════════════════════════ */

describe("classifyIntent()", () => {
  it("empty → unknown", () => expect(classifyIntent("")).toBe("unknown"));
  it("greeting → general", () => expect(classifyIntent("Hello, namaste!")).toBe("general"));
  it("booking phrase → booking", () => {
    expect(classifyIntent("Can you book an appointment with an advisor?")).toBe("booking");
    expect(classifyIntent("I'd like to schedule a call")).toBe("booking");
    expect(classifyIntent("Talk to someone please")).toBe("booking");
  });
  it("complaint phrase → complaint", () => {
    expect(classifyIntent("I have a complaint about my SIP")).toBe("complaint");
    expect(classifyIntent("My account is not working")).toBe("complaint");
  });
  it("FAQ phrase → faq", () => {
    expect(classifyIntent("What is the expense ratio of HDFC Silver?")).toBe("faq");
    expect(classifyIntent("How do I start a SIP?")).toBe("faq");
  });
  it("garbled → unknown", () => {
    expect(classifyIntent("asdfkjh qwerty zxcv")).toBe("unknown");
  });
});

describe("classifyTopic() + isValidTopic()", () => {
  it("isValidTopic narrows to TopicType union", () => {
    for (const t of VALID_TOPICS) expect(isValidTopic(t)).toBe(true);
    expect(isValidTopic("foo")).toBe(false);
    expect(isValidTopic(123)).toBe(false);
  });

  it("classifies KYC", () => {
    expect(classifyTopic("I want to verify my KYC")).toBe("kyc");
  });
  it("classifies SIP", () => {
    expect(classifyTopic("Start a SIP of 5000")).toBe("sip");
  });
  it("classifies statements", () => {
    expect(classifyTopic("Capital gains statement for tax")).toBe("statements");
  });
  it("classifies withdrawals", () => {
    expect(classifyTopic("How do I redeem my fund?")).toBe("withdrawals");
  });
  it("classifies account_changes", () => {
    expect(classifyTopic("I want to update my nominee")).toBe("account_changes");
  });
  it("unmatched → undefined", () => {
    expect(classifyTopic("Random unrelated text")).toBeUndefined();
  });
});

/* ════════════════════════════════════════════════════════════════════
   generateMockSlots() — EXACTLY 2
   ════════════════════════════════════════════════════════════════════ */

describe("generateMockSlots()", () => {
  it("default returns exactly 2 slots", () => {
    const slots = generateMockSlots();
    expect(slots).toHaveLength(2);
  });

  it("count=1 returns 1 slot", () => {
    expect(generateMockSlots(1)).toHaveLength(1);
  });

  it("count=99 is clamped to 2 (architecture invariant)", () => {
    expect(generateMockSlots(99)).toHaveLength(2);
  });

  it("slots are ISO-8601 with +05:30 IST offset", () => {
    const slots = generateMockSlots();
    for (const s of slots) {
      expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+05:30$/);
    }
  });

  it("slots are in the future relative to base time", () => {
    const now = Date.now();
    const slots = generateMockSlots(2, now);
    for (const s of slots) {
      const ms = Date.parse(s);
      expect(ms).toBeGreaterThan(now);
    }
  });

  it("two slots are at 10:00 and 14:30 IST", () => {
    const slots = generateMockSlots(2);
    expect(slots[0]).toMatch(/T10:00:00\+05:30$/);
    expect(slots[1]).toMatch(/T14:30:00\+05:30$/);
  });

  it("skips weekend — Sat & Sun jump to Mon", () => {
    /* Friday May 15 2026 (UTC) — tomorrow is Saturday. Should land Monday. */
    const friday = Date.parse("2026-05-15T03:00:00Z");
    const slots = generateMockSlots(2, friday);
    /* slot should be Mon May 18 */
    expect(slots[0].startsWith("2026-05-18")).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════════════
   getRephraseForState() — 3-strike
   ════════════════════════════════════════════════════════════════════ */

describe("getRephraseForState()", () => {
  it("strike 1 → shorter rephrase (non-empty)", () => {
    const s = getRephraseForState("intent_classification", 1);
    expect(s.length).toBeGreaterThan(0);
    expect(s.length).toBeLessThan(200);
  });

  it("strike 2 → narrower prompt", () => {
    const s = getRephraseForState("intent_classification", 2);
    expect(s.length).toBeGreaterThan(0);
  });

  it("strike 3+ → offers text fallback", () => {
    const s = getRephraseForState("intent_classification", 3);
    expect(s.toLowerCase()).toContain("text");
    /* Strike > 3 is clamped to 3 */
    expect(getRephraseForState("intent_classification", 99).toLowerCase()).toContain(
      "text",
    );
  });

  it("booking_intent rephrase covers topic prompts", () => {
    const s = getRephraseForState("booking_intent", 2);
    expect(s.toLowerCase()).toMatch(/kyc|sip|statements|withdrawals|account/);
  });

  it("booking_confirmation rephrase asks for yes/no", () => {
    const s = getRephraseForState("booking_confirmation", 1);
    expect(s.toLowerCase()).toMatch(/yes|no/);
  });
});

/* ════════════════════════════════════════════════════════════════════
   getPromptForState() — non-empty per step, contains required cues
   ════════════════════════════════════════════════════════════════════ */

describe("getPromptForState()", () => {
  for (const step of VALID_STEPS) {
    it(`returns non-empty prompt for step="${step}"`, () => {
      expect(getPromptForState(step).length).toBeGreaterThan(0);
    });
  }

  it("greeting includes theme injection if topTheme provided", () => {
    const p = getPromptForState("greeting", { topTheme: "fee transparency" });
    expect(p.toLowerCase()).toContain("fee transparency");
  });

  it("booking_intent without topic → asks for topic", () => {
    expect(getPromptForState("booking_intent").toLowerCase()).toContain("topic");
  });

  it("booking_intent with topic but no context → asks for context", () => {
    const p = getPromptForState("booking_intent", { topic: "sip" });
    expect(p.toLowerCase()).toContain("context");
  });

  it("booking_intent with topic + context but < 2 slots → proposes slots", () => {
    const p = getPromptForState("booking_intent", {
      topic: "sip",
      contextNotes: "want to increase SIP",
    });
    expect(p.toLowerCase()).toContain("slot");
  });

  it("booking_confirmation includes booking code if present", () => {
    const p = getPromptForState("booking_confirmation", {
      topic: "sip",
      proposedSlots: ["2026-05-20T10:00:00+05:30"],
      bookingCode: "NL-A3X9",
    });
    expect(p).toContain("NL-A3X9");
  });
});

/* ════════════════════════════════════════════════════════════════════
   SILENCE_TIMEOUTS — re-exported correctly
   ════════════════════════════════════════════════════════════════════ */

describe("SILENCE_TIMEOUTS", () => {
  it("has a value for every step", () => {
    for (const step of VALID_STEPS) {
      expect(SILENCE_TIMEOUTS[step]).toBeGreaterThanOrEqual(0);
    }
  });
});

/* ════════════════════════════════════════════════════════════════════
   PROPERTY TEST — fuzz state machine, 100 iterations
   ════════════════════════════════════════════════════════════════════ */

describe("PROPERTY: state machine never enters undefined state (100 iter)", () => {
  it("random walk of 100 steps lands on a valid step every time", () => {
    let step = VALID_STEPS[0];
    for (let i = 0; i < 100; i++) {
      const intent = VALID_INTENTS[Math.floor(Math.random() * VALID_INTENTS.length)];
      const opts = {
        bookingComplete: Math.random() > 0.5,
        userConfirmed: Math.random() > 0.5,
        userRequestedEnd: Math.random() > 0.9,
        strikeCount: Math.floor(Math.random() * 4),
      };
      step = getNextState(step, intent, opts);
      expect(VALID_STEPS).toContain(step);
    }
  });
});
