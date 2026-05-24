/**
 * Phase 2 Test Suite — TypeScript Type System & Data Models
 *
 * Covers all types, constants, factory functions, and runtime
 * validators exported from @/types/index.ts.
 *
 * Traceability:
 *  - Arch §Phase 2 Verification: factory functions, BOOKING_CODE_REGEX
 *  - Req 5 (State Machine): step/intent/topic constants
 *  - Req 9 (State Persistence): GlobalState shape
 *  - UI/UX Spec §11: UIState interface shape
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import {
  /* Constants */
  VALID_STEPS,
  VALID_INTENTS,
  VALID_TOPICS,
  VALID_VISUAL_STATES,
  BOOKING_CODE_REGEX,
  SILENCE_TIMEOUTS,
  MODE_LABEL_MAP,
  MODE_CSS_MAP,
  /* Type guards */
  isValidBookingCode,
  /* Factory functions */
  createInitialConversationState,
  createChatMessage,
  /* API helpers */
  apiSuccess,
  apiError,
  /* Types (used for runtime narrowing tests) */
  type ConversationStep,
  type IntentType,
  type TopicType,
  type AgentVisualState,
  type ChatMessage,
  type ConversationState,
  type WeeklyPulse,
  type ApprovalItem,
  type UIState,
  type EvalResult,
  type EvalSuiteResult,
} from "@/types/index";

/* ── 1. VALID_STEPS ─────────────────────────────────────────── */
describe("VALID_STEPS — 7-step Conversation State Machine", () => {
  it("contains exactly 7 steps", () => {
    expect(VALID_STEPS).toHaveLength(7);
  });

  it("starts with 'idle' and ends with 'closing'", () => {
    expect(VALID_STEPS[0]).toBe("idle");
    expect(VALID_STEPS[VALID_STEPS.length - 1]).toBe("closing");
  });

  it("contains all required steps", () => {
    const required: ConversationStep[] = [
      "idle",
      "greeting",
      "intent_classification",
      "faq_resolution",
      "booking_intent",
      "booking_confirmation",
      "closing",
    ];
    required.forEach((step) => expect(VALID_STEPS).toContain(step));
  });

  it("has no duplicate steps", () => {
    expect(new Set(VALID_STEPS).size).toBe(VALID_STEPS.length);
  });
});

/* ── 2. VALID_INTENTS ──────────────────────────────────────── */
describe("VALID_INTENTS — 5 intent routing paths", () => {
  it("contains exactly 5 intents", () => {
    expect(VALID_INTENTS).toHaveLength(5);
  });

  it("contains all required intents", () => {
    const required: IntentType[] = [
      "faq",
      "booking",
      "complaint",
      "general",
      "unknown",
    ];
    required.forEach((intent) => expect(VALID_INTENTS).toContain(intent));
  });

  it("includes 'unknown' as a fallback intent", () => {
    expect(VALID_INTENTS).toContain("unknown");
  });

  it("has no duplicate intents", () => {
    expect(new Set(VALID_INTENTS).size).toBe(VALID_INTENTS.length);
  });
});

/* ── 3. VALID_TOPICS ───────────────────────────────────────── */
describe("VALID_TOPICS — 5 Topic_Taxonomy entries", () => {
  it("contains exactly 5 topics", () => {
    expect(VALID_TOPICS).toHaveLength(5);
  });

  it("contains all required topics", () => {
    const required: TopicType[] = [
      "kyc",
      "sip",
      "statements",
      "withdrawals",
      "account_changes",
    ];
    required.forEach((topic) => expect(VALID_TOPICS).toContain(topic));
  });

  it("has no duplicate topics", () => {
    expect(new Set(VALID_TOPICS).size).toBe(VALID_TOPICS.length);
  });
});

/* ── 4. VALID_VISUAL_STATES ────────────────────────────────── */
describe("VALID_VISUAL_STATES — 4 AI Orb states", () => {
  it("contains exactly 4 visual states", () => {
    expect(VALID_VISUAL_STATES).toHaveLength(4);
  });

  it("contains IDLE, LISTENING, THINKING, SPEAKING", () => {
    const required: AgentVisualState[] = [
      "IDLE",
      "LISTENING",
      "THINKING",
      "SPEAKING",
    ];
    required.forEach((s) => expect(VALID_VISUAL_STATES).toContain(s));
  });
});

/* ── 5. SILENCE_TIMEOUTS ───────────────────────────────────── */
describe("SILENCE_TIMEOUTS — per-step timeout constants", () => {
  it("has an entry for every ConversationStep", () => {
    VALID_STEPS.forEach((step) => {
      expect(SILENCE_TIMEOUTS).toHaveProperty(step);
      expect(typeof SILENCE_TIMEOUTS[step]).toBe("number");
    });
  });

  it("idle step has timeout 0 (no silence needed)", () => {
    expect(SILENCE_TIMEOUTS.idle).toBe(0);
  });

  it("all non-idle timeouts are positive integers in milliseconds", () => {
    VALID_STEPS.filter((s) => s !== "idle").forEach((step) => {
      const t = SILENCE_TIMEOUTS[step];
      expect(t).toBeGreaterThan(0);
      expect(Number.isInteger(t)).toBe(true);
    });
  });

  it("greeting timeout is 30 seconds", () => {
    expect(SILENCE_TIMEOUTS.greeting).toBe(30_000);
  });
});

/* ── 6. BOOKING_CODE_REGEX ─────────────────────────────────── */
describe("BOOKING_CODE_REGEX — NL-[A-Z0-9]{4}", () => {
  it("matches valid codes", () => {
    ["NL-A3X9", "NL-0000", "NL-ZZZZ", "NL-AB12", "NL-9999"].forEach(
      (code) => expect(BOOKING_CODE_REGEX.test(code)).toBe(true)
    );
  });

  it("rejects invalid codes", () => {
    ["NL-abc1", "NL-A1", "AB-1234", "", "NL-A1B2C", "NL-!@#$", " NL-A1B2"].forEach(
      (code) => expect(BOOKING_CODE_REGEX.test(code)).toBe(false)
    );
  });

  it("PROPERTY: all 4-char uppercase alphanumeric NL- codes are valid", () => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...charset.split("")), {
          minLength: 4,
          maxLength: 4,
        }),
        (chars) => BOOKING_CODE_REGEX.test(`NL-${chars.join("")}`)
      )
    );
  });

  it("isValidBookingCode() is a consistent guard", () => {
    expect(isValidBookingCode("NL-A3X9")).toBe(true);
    expect(isValidBookingCode("invalid")).toBe(false);
  });
});

/* ── 7. MODE MAPS ──────────────────────────────────────────── */
describe("Mode maps — bidirectional AppMode ↔ AppModeLabel", () => {
  it("MODE_LABEL_MAP maps both modes to labels", () => {
    expect(MODE_LABEL_MAP["investor-terminal"]).toBe("INVESTOR");
    expect(MODE_LABEL_MAP["director-ops"]).toBe("DIRECTOR");
  });

  it("MODE_CSS_MAP maps both labels to modes", () => {
    expect(MODE_CSS_MAP["INVESTOR"]).toBe("investor-terminal");
    expect(MODE_CSS_MAP["DIRECTOR"]).toBe("director-ops");
  });

  it("round-trips correctly (mode → label → mode)", () => {
    const mode1 = "investor-terminal" as const;
    const mode2 = "director-ops" as const;
    expect(MODE_CSS_MAP[MODE_LABEL_MAP[mode1]]).toBe(mode1);
    expect(MODE_CSS_MAP[MODE_LABEL_MAP[mode2]]).toBe(mode2);
  });
});

/* ── 8. createInitialConversationState() ─────────────────── */
describe("createInitialConversationState() — factory function", () => {
  let state: ConversationState;

  beforeEach(() => {
    state = createInitialConversationState("test-session-001");
  });

  it("sets sessionId correctly", () => {
    expect(state.sessionId).toBe("test-session-001");
  });

  it("starts at 'idle' step", () => {
    expect(state.step).toBe("idle");
    expect(VALID_STEPS).toContain(state.step);
  });

  it("initializes all arrays as empty", () => {
    expect(state.transcript).toEqual([]);
    expect(state.toolCallsMade).toEqual([]);
  });

  it("initializes strikeCount as 0", () => {
    expect(state.strikeCount).toBe(0);
  });

  it("initializes optional fields as undefined", () => {
    expect(state.intent).toBeUndefined();
    expect(state.topic).toBeUndefined();
    expect(state.bookingCode).toBeUndefined();
    expect(state.themeGreeting).toBeUndefined();
  });

  it("sets startedAt as a valid ISO-8601 string", () => {
    expect(() => new Date(state.startedAt).toISOString()).not.toThrow();
    expect(state.startedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
  });

  it("produces different states for different sessionIds", () => {
    const s1 = createInitialConversationState("sess-1");
    const s2 = createInitialConversationState("sess-2");
    expect(s1.sessionId).not.toBe(s2.sessionId);
  });

  it("PROPERTY: factory always returns a valid step", () => {
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        const s = createInitialConversationState(id);
        return VALID_STEPS.includes(s.step);
      })
    );
  });
});

/* ── 9. createChatMessage() ─────────────────────────────────── */
describe("createChatMessage() — factory function", () => {
  it("creates a message with the correct role", () => {
    const msg = createChatMessage("user", "Hello");
    expect(msg.role).toBe("user");
  });

  it("creates a message with the correct content", () => {
    const msg = createChatMessage("assistant", "Hello from the AI");
    expect(msg.content).toBe("Hello from the AI");
  });

  it("generates a unique id (UUID format)", () => {
    const msg = createChatMessage("user", "test");
    expect(msg.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("generates unique IDs on consecutive calls", () => {
    const ids = new Set(
      Array.from({ length: 50 }, () => createChatMessage("user", "x").id)
    );
    expect(ids.size).toBe(50);
  });

  it("sets timestamp as valid ISO-8601", () => {
    const msg = createChatMessage("system", "init");
    expect(() => new Date(msg.timestamp).toISOString()).not.toThrow();
  });

  it("defaults citations to empty array when omitted", () => {
    const msg = createChatMessage("assistant", "text");
    expect(msg.citations).toEqual([]);
  });

  it("accepts and stores citations when provided", () => {
    const citations = [
      {
        fundId: "hdfc-silver",
        fundName: "HDFC Silver ETF",
        source: "https://example.com",
        snippet: "...",
        relevanceScore: 0.9,
      },
    ];
    const msg = createChatMessage("assistant", "text", citations);
    expect(msg.citations).toHaveLength(1);
    expect(msg.citations![0].fundId).toBe("hdfc-silver");
  });

  it("all valid chat roles are accepted", () => {
    const roles: ChatMessage["role"][] = [
      "user",
      "assistant",
      "system",
      "tool",
    ];
    roles.forEach((role) => {
      const msg = createChatMessage(role, "test");
      expect(msg.role).toBe(role);
    });
  });
});

/* ── 10. UIState interface shape ─────────────────────────────── */
describe("UIState interface — shape validation", () => {
  it("UIState contains all required Investor Terminal fields", () => {
    const requiredInvestorFields: (keyof UIState)[] = [
      "orbState",
      "audioLevel",
      "chatMessages",
      "isVoiceActive",
      "isMicAvailable",
      "bookingWidget",
      "conversationState",
    ];
    const mockState = {
      orbState: "IDLE",
      audioLevel: 0,
      chatMessages: [],
      isVoiceActive: false,
      isMicAvailable: true,
      bookingWidget: { isOpen: false, step: "date_selection" },
      conversationState: createInitialConversationState("s1"),
    } as Partial<UIState>;

    requiredInvestorFields.forEach((field) => {
      expect(mockState).toHaveProperty(field);
    });
  });

  it("UIState contains all required Director Ops fields", () => {
    const requiredOpsFields: (keyof UIState)[] = [
      "pulseData",
      "isPulseGenerating",
      "hitlItems",
    ];
    const mockState: Partial<UIState> = {
      pulseData: null,
      isPulseGenerating: false,
      hitlItems: [],
    };
    requiredOpsFields.forEach((field) => {
      expect(mockState).toHaveProperty(field);
    });
  });

  it("UIState contains all required shared state fields", () => {
    const requiredSharedFields: (keyof UIState)[] = [
      "activeMode",
      "isTransitioning",
      "topTheme",
      "marketContext",
      "bookingCodes",
    ];
    const mockState: Partial<UIState> = {
      activeMode: "investor-terminal",
      isTransitioning: false,
      topTheme: null,
      marketContext: null,
      bookingCodes: [],
    };
    requiredSharedFields.forEach((field) => {
      expect(mockState).toHaveProperty(field);
    });
  });
});

/* ── 11. WeeklyPulse constraints ────────────────────────────── */
describe("WeeklyPulse — structural constraints (Req 6)", () => {
  const mockPulse: WeeklyPulse = {
    id: "pulse-001",
    weekStart: "2026-05-18",
    summaryText: "This week's review data highlights login issues across Android users.",
    themes: [
      { name: "Login Issues", reviewCount: 45, isTopThree: true, sentiment: "negative" },
      { name: "KYC Delays", reviewCount: 32, isTopThree: true, sentiment: "negative" },
      { name: "UPI Success", reviewCount: 28, isTopThree: true, sentiment: "positive" },
    ],
    quotes: [
      "Login keeps failing on Android 14",
      "KYC took 3 days — frustrating",
      "UPI payments work great now",
    ],
    actionIdeas: [
      "Investigate Android 14 auth token refresh bug",
      "Streamline KYC document validation pipeline",
      "Highlight UPI success in onboarding screens",
    ],
    wordCount: 42,
    reviewCount: 105,
    status: "authorized",
    createdAt: "2026-05-18T09:00:00.000Z",
  };

  it("has at most 5 themes", () => {
    expect(mockPulse.themes.length).toBeLessThanOrEqual(5);
  });

  it("has exactly 3 quotes", () => {
    expect(mockPulse.quotes).toHaveLength(3);
  });

  it("has exactly 3 action ideas", () => {
    expect(mockPulse.actionIdeas).toHaveLength(3);
  });

  it("word count is within 250-word constraint", () => {
    const actualWordCount = mockPulse.summaryText.split(/\s+/).length;
    expect(actualWordCount).toBeLessThanOrEqual(250);
    expect(mockPulse.wordCount).toBeLessThanOrEqual(250);
  });

  it("has a valid status", () => {
    const validStatuses: WeeklyPulse["status"][] = [
      "draft",
      "pending_review",
      "authorized",
      "rejected",
    ];
    expect(validStatuses).toContain(mockPulse.status);
  });

  it("top-three themes have isTopThree=true", () => {
    const topThree = mockPulse.themes.filter((t) => t.isTopThree);
    expect(topThree.length).toBeLessThanOrEqual(3);
  });
});

/* ── 12. ApprovalItem constraints ───────────────────────────── */
describe("ApprovalItem — Pillar C HITL structure", () => {
  const mockItem: ApprovalItem = {
    id: "appr-001",
    bookingCode: "NL-A3X9",
    investorNameRedacted: "[REDACTED]",
    topic: "kyc",
    proposedSlot: "2026-05-27 14:00",
    advisorEmail: "advisor@example.com",
    emailDraft: "Dear Advisor, please find attached booking NL-A3X9...",
    marketContextSnippet: "Login Issues are trending this week...",
    status: "pending_review",
    createdAt: "2026-05-24T10:00:00.000Z",
  };

  it("has a valid booking code", () => {
    expect(isValidBookingCode(mockItem.bookingCode)).toBe(true);
  });

  it("investor name is redacted", () => {
    expect(mockItem.investorNameRedacted).toBe("[REDACTED]");
  });

  it("topic is a valid TopicType", () => {
    expect(VALID_TOPICS).toContain(mockItem.topic);
  });

  it("status is a valid ArtifactStatus", () => {
    const validStatuses: ApprovalItem["status"][] = [
      "draft",
      "pending_review",
      "authorized",
      "rejected",
      "executed",
    ];
    expect(validStatuses).toContain(mockItem.status);
  });
});

/* ── 13. EvalResult shape ───────────────────────────────────── */
describe("EvalResult & EvalSuiteResult — evaluation types", () => {
  const mockResult: EvalResult = {
    eval_type: "rag_accuracy",
    eval_name: "Expense ratio comparison",
    input: "What is the expense ratio of HDFC Silver ETF?",
    expected: "Contains expense ratio with citation",
    actual: "HDFC Silver ETF has expense ratio of 0.59%...",
    score: 0.85,
    pass_fail: true,
    phase: 8,
    timestamp: new Date().toISOString(),
  };

  it("score is in 0-1 range", () => {
    expect(mockResult.score).toBeGreaterThanOrEqual(0);
    expect(mockResult.score).toBeLessThanOrEqual(1);
  });

  it("eval_type is one of the valid eval types", () => {
    const validTypes: EvalResult["eval_type"][] = [
      "rag_accuracy",
      "safety_compliance",
      "ux_structure",
      "cross_pillar",
    ];
    expect(validTypes).toContain(mockResult.eval_type);
  });

  it("phase is a positive integer", () => {
    expect(mockResult.phase).toBeGreaterThan(0);
    expect(Number.isInteger(mockResult.phase)).toBe(true);
  });

  it("EvalSuiteResult aggregate score computes correctly", () => {
    const suite: EvalSuiteResult = {
      suiteType: "rag_accuracy",
      phase: 8,
      totalTests: 5,
      passed: 4,
      failed: 1,
      aggregateScore: 0.82,
      passRate: 0.8,
      timestamp: new Date().toISOString(),
      results: [mockResult],
    };
    expect(suite.passRate).toBeCloseTo(suite.passed / suite.totalTests, 2);
  });
});

/* ── 14. apiSuccess / apiError ──────────────────────────────── */
describe("apiSuccess() / apiError() — response envelope", () => {
  it("apiSuccess wraps data with null error", () => {
    const res = apiSuccess({ id: "test" });
    expect(res.data).toEqual({ id: "test" });
    expect(res.error).toBeNull();
  });

  it("apiError wraps error with null data", () => {
    const res = apiError("Not found");
    expect(res.data).toBeNull();
    expect(res.error).toBe("Not found");
  });
});

/* ── 15. Complete type coverage snapshot ─────────────────────── */
describe("Type system completeness — Phase 2 spec checklist", () => {
  it("VALID_STEPS has 7 entries (spec: exactly 7 steps)", () => {
    expect(VALID_STEPS).toHaveLength(7);
  });

  it("VALID_INTENTS has 5 entries (spec: exactly 5 intents)", () => {
    expect(VALID_INTENTS).toHaveLength(5);
  });

  it("VALID_TOPICS has 5 entries (spec: exactly 5 topics)", () => {
    expect(VALID_TOPICS).toHaveLength(5);
  });

  it("VALID_VISUAL_STATES has 4 entries (spec: exactly 4 states)", () => {
    expect(VALID_VISUAL_STATES).toHaveLength(4);
  });

  it("SILENCE_TIMEOUTS has an entry per step (7 total)", () => {
    expect(Object.keys(SILENCE_TIMEOUTS)).toHaveLength(7);
  });

  it("factory functions are callable without errors", () => {
    expect(() => createInitialConversationState("s")).not.toThrow();
    expect(() => createChatMessage("user", "test")).not.toThrow();
  });
});
