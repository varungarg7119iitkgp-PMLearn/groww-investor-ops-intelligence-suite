/**
 * Phase 12 — POST /api/pulse/generate
 *
 * Integration tests for the pulse-generation route. Mocks Gemini and
 * the data layer so we exercise:
 *   - happy path: valid JSON → insert called → 200 with pulse
 *   - retry-up-to-3 on validation failure → succeeds on attempt 2 / 3
 *   - all 3 attempts fail → 422 with reason
 *   - <10 reviews → 503
 *   - reviewsOverride bypasses Supabase fetch
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

const generateContentMock = vi.fn();
const parseJsonMock       = vi.fn();
vi.mock("@/lib/gemini", () => ({
  generateContent: (...args: unknown[]) => generateContentMock(...args),
  parseJson:       (raw: string) => parseJsonMock(raw),
}));

const getReviewCountMock     = vi.fn();
const getReviewsForPulseMock = vi.fn();
const insertWeeklyPulseMock  = vi.fn();
vi.mock("@/lib/data", () => ({
  getReviewCount:       () => getReviewCountMock(),
  getReviewsForPulse:   (n?: number) => getReviewsForPulseMock(n),
  insertWeeklyPulse:    (args: unknown) => insertWeeklyPulseMock(args),
}));

beforeEach(() => {
  generateContentMock.mockReset();
  parseJsonMock.mockReset();
  getReviewCountMock.mockReset();
  getReviewsForPulseMock.mockReset();
  insertWeeklyPulseMock.mockReset();
  parseJsonMock.mockImplementation((raw: string) => JSON.parse(raw));
});

function validCandidate() {
  return {
    summaryText:
      "KYC friction is the top theme this week. SIP auto-debit failures are second. " +
      "Statement confusion is third. Net-negative sentiment, ops should tighten KYC UX " +
      "and ship statement explainer.",
    themes: [
      { name: "KYC Friction",       reviewCount: 12, isTopThree: true,  sentiment: "negative" },
      { name: "SIP Auto-debit",     reviewCount: 9,  isTopThree: true,  sentiment: "negative" },
      { name: "Statement Confusion", reviewCount: 7, isTopThree: true,  sentiment: "neutral"  },
      { name: "Onboarding Praise",  reviewCount: 3,  isTopThree: false, sentiment: "positive" },
    ],
    quotes: [
      "Asked to upload PAN three times this week.",
      "SIP failed on May 15 and again on May 30.",
      "FY26 statement looks different from last year.",
    ],
    actionIdeas: [
      "Ship a guided KYC re-verification flow.",
      "Publish a Finance Bill 2026 explainer.",
      "Trigger proactive banners before mandate-failure windows.",
    ],
  };
}

async function callRoute(body: unknown) {
  const { POST } = await import("@/app/api/pulse/generate/route");
  const req = new Request("http://localhost/api/pulse/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const res = await POST(req);
  return { status: res.status, json: await res.json() };
}

/** Reviews that contain every quote in `validCandidate()`. */
function reviewsCoveringQuotes(n: number) {
  const baseSentences = [
    "Asked to upload PAN three times this week. Frustrating.",
    "SIP failed on May 15 and again on May 30. No fix path.",
    "FY26 statement looks different from last year. Confusing.",
  ];
  return Array.from({ length: n }, (_, i) => ({
    text:       baseSentences[i % baseSentences.length],
    starRating: 3,
    sentiment:  "neutral",
    reviewDate: "2026-05-20",
  }));
}

describe("/api/pulse/generate — happy path", () => {
  it("returns 200 with the inserted pulse on first attempt", async () => {
    const reviews = reviewsCoveringQuotes(25);
    const candidate = validCandidate();

    generateContentMock.mockResolvedValue({ text: JSON.stringify(candidate), model: "x", latencyMs: 1, retries: 0 });
    insertWeeklyPulseMock.mockResolvedValue({
      data: {
        id:          "p-1",
        weekStart:   "2026-05-24",
        summaryText: candidate.summaryText,
        themes:      candidate.themes,
        quotes:      candidate.quotes,
        actionIdeas: candidate.actionIdeas,
        wordCount:   80,
        reviewCount: 25,
        status:      "draft",
        createdAt:   "2026-05-24T00:00:00.000Z",
      },
      error: null,
    });

    const { status, json } = await callRoute({ reviewsOverride: reviews });
    expect(status).toBe(200);
    expect(json.pulse.id).toBe("p-1");
    expect(json.attempts).toBe(1);
    expect(insertWeeklyPulseMock).toHaveBeenCalledTimes(1);
  }, 60_000);
});

describe("/api/pulse/generate — retry behaviour", () => {
  it("retries on word-limit violation, succeeds on attempt 2", async () => {
    const tooLong  = { ...validCandidate(), summaryText: "word ".repeat(260).trim() };
    const fineOne  = validCandidate();
    generateContentMock
      .mockResolvedValueOnce({ text: JSON.stringify(tooLong) })
      .mockResolvedValueOnce({ text: JSON.stringify(fineOne) });
    insertWeeklyPulseMock.mockResolvedValue({
      data: {
        id: "p-retry", weekStart: "2026-05-24", summaryText: fineOne.summaryText,
        themes: fineOne.themes, quotes: fineOne.quotes, actionIdeas: fineOne.actionIdeas,
        wordCount: 60, reviewCount: 25, status: "draft", createdAt: "2026-05-24T00:00:00.000Z",
      },
      error: null,
    });

    const reviews = reviewsCoveringQuotes(20);

    const { status, json } = await callRoute({ reviewsOverride: reviews });
    expect(status).toBe(200);
    expect(json.attempts).toBe(2);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("returns 422 after 3 failed attempts", async () => {
    const tooLong = { ...validCandidate(), summaryText: "word ".repeat(300).trim() };
    generateContentMock.mockResolvedValue({ text: JSON.stringify(tooLong) });

    const reviews = reviewsCoveringQuotes(20);

    const { status, json } = await callRoute({ reviewsOverride: reviews });
    expect(status).toBe(422);
    expect(json.error).toMatch(/Failed to produce a valid pulse/);
    expect(json.reason).toMatch(/250 words/);
    expect(generateContentMock).toHaveBeenCalledTimes(3);
  });
});

describe("/api/pulse/generate — preconditions", () => {
  it("returns 503 when fewer than PULSE_MIN_REVIEWS available", async () => {
    getReviewCountMock.mockResolvedValue({ data: 4, error: null });
    const { status, json } = await callRoute({});
    expect(status).toBe(503);
    expect(json.error).toMatch(/at least 10/);
  });

  it("returns 503 when reviewsOverride is below threshold", async () => {
    const { status, json } = await callRoute({
      reviewsOverride: Array.from({ length: 3 }, () => ({
        text: "x", starRating: 3, sentiment: "neutral", reviewDate: "2026-05-20",
      })),
    });
    expect(status).toBe(503);
    expect(json.error).toMatch(/at least 10/);
  });
});

describe("/api/pulse/generate — malformed JSON from Gemini", () => {
  it("treats parse failure like validation failure and retries", async () => {
    const fineOne = validCandidate();
    generateContentMock
      .mockResolvedValueOnce({ text: "not-json" })
      .mockResolvedValueOnce({ text: JSON.stringify(fineOne) });
    insertWeeklyPulseMock.mockResolvedValue({
      data: {
        id: "p-mp", weekStart: "2026-05-24", summaryText: fineOne.summaryText,
        themes: fineOne.themes, quotes: fineOne.quotes, actionIdeas: fineOne.actionIdeas,
        wordCount: 60, reviewCount: 20, status: "draft", createdAt: "2026-05-24T00:00:00.000Z",
      },
      error: null,
    });

    const reviews = reviewsCoveringQuotes(20);

    const { status, json } = await callRoute({ reviewsOverride: reviews });
    expect(status).toBe(200);
    expect(json.attempts).toBe(2);
  });
});
