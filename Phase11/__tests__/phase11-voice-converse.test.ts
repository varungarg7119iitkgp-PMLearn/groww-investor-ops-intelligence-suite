/**
 * Phase 11 — /api/voice/converse integration tests
 *
 * Mocks `gemini.chat` and `getLatestPulseTheme` so we can exercise:
 *   - Greeting turn injects top theme
 *   - PII input intercepted before Gemini
 *   - Advice input intercepted
 *   - Booking flow advances state correctly
 *   - State machine transitions reflected in response
 *   - Output guard re-runs on assistant text
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

const chatMock = vi.fn();
vi.mock("@/lib/gemini", () => ({
  chat: (input: string, opts: unknown) => chatMock(input, opts),
}));

const getLatestPulseThemeMock = vi.fn();
vi.mock("@/lib/data", () => ({
  getLatestPulseTheme: () => getLatestPulseThemeMock(),
}));

beforeEach(() => {
  chatMock.mockReset();
  getLatestPulseThemeMock.mockReset();
  getLatestPulseThemeMock.mockResolvedValue({ data: null });
});

async function callConverse(body: unknown) {
  const { POST } = await import("@/app/api/voice/converse/route");
  const req = new Request("http://localhost/api/voice/converse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  return { status: res.status, json: await res.json() };
}

/* ════════════════════════════════════════════════════════════════════
   Tests
   ════════════════════════════════════════════════════════════════════ */

describe("/api/voice/converse — guardrails first", () => {
  it("rejects empty body", async () => {
    const { status, json } = await callConverse({});
    expect(status).toBe(400);
    expect(json.error).toContain("userInput");
  }, 60_000); // cold-start: first module load can be slow

  it("intercepts PII (PAN) without calling Gemini", async () => {
    const { status, json } = await callConverse({
      userInput: "My PAN is ABCDE1234F, what's my balance?",
    });
    expect(status).toBe(200);
    expect(json.meta.complianceFlag).toBe("pii_block");
    expect(chatMock).not.toHaveBeenCalled();
    expect(String(json.assistantText).toLowerCase()).toContain("personal");
    expect(json.assistantText).not.toContain("ABCDE1234F");
  });

  it("intercepts advice without calling Gemini", async () => {
    const { status, json } = await callConverse({
      userInput: "Should I buy HDFC Silver?",
    });
    expect(status).toBe(200);
    expect(json.meta.complianceFlag).toBe("advice_block");
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("intercepts out-of-scope (Bitcoin)", async () => {
    const { status, json } = await callConverse({
      userInput: "Tell me about Bitcoin",
    });
    expect(status).toBe(200);
    expect(json.meta.complianceFlag).toBe("out_of_scope");
    expect(chatMock).not.toHaveBeenCalled();
  });
});

describe("/api/voice/converse — normal flow", () => {
  it("FAQ query: classifies + invokes Gemini + returns assistant text", async () => {
    chatMock.mockResolvedValue({
      text: "HDFC Silver ETF tracks LBMA silver. Expense ratio is 0.49 percent.",
      toolCalls: [],
      model: "gemini-2.5-flash-lite",
      latencyMs: 200,
    });

    const { status, json } = await callConverse({
      userInput: "What is the expense ratio of HDFC Silver ETF?",
    });

    expect(status).toBe(200);
    expect(chatMock).toHaveBeenCalledTimes(1);
    expect(json.meta.intent).toBe("faq");
    expect(json.meta.complianceFlag).toBe("ok");
    expect(json.assistantText).toContain("HDFC Silver");
  });

  it("Greeting turn injects top theme from pulse", async () => {
    getLatestPulseThemeMock.mockResolvedValue({ data: "fee transparency" });
    chatMock.mockResolvedValue({
      text: "Hi there. This is informational and not investment advice.",
      toolCalls: [],
      model: "gemini-2.5-flash-lite",
      latencyMs: 200,
    });

    const { json } = await callConverse({ userInput: "hello" });
    expect(json.conversationState.themeGreeting).toBe("fee transparency");
    /* The system prompt sent to Gemini should reference the theme */
    const systemPrompt = chatMock.mock.calls[0][1].systemInstruction as string;
    expect(systemPrompt.toLowerCase()).toContain("fee transparency");
  });

  it("Booking intent transitions to booking_intent step", async () => {
    chatMock.mockResolvedValue({
      text: "Sure. Which topic — KYC, SIP, statements, withdrawals, or account changes?",
      toolCalls: [],
      model: "gemini-2.5-flash-lite",
      latencyMs: 200,
    });

    const { json } = await callConverse({
      userInput: "I want to book an appointment with an advisor",
      conversationState: {
        sessionId: "s1",
        step: "intent_classification",
        transcript: [],
        toolCallsMade: [],
        strikeCount: 0,
        lastUserInput: "",
        startedAt: new Date().toISOString(),
      },
    });

    expect(json.meta.step).toBe("booking_intent");
    expect(json.meta.intent).toBe("booking");
  });

  it("Output PII scrub strips emails from Gemini response (defense-in-depth)", async () => {
    chatMock.mockResolvedValue({
      /* Hypothetical leaky Gemini output containing PII */
      text: "Sure, I will email you at user@example.com about HDFC Silver.",
      toolCalls: [],
      model: "gemini-2.5-flash-lite",
      latencyMs: 200,
    });

    const { json } = await callConverse({
      userInput: "Tell me about HDFC Silver",
    });

    /* Phase 9 scrub runs BEFORE output guard, so guard sees clean text
     * → complianceFlag stays "ok". The critical assertion is that PII
     * is not echoed to the client. */
    expect(json.assistantText).not.toContain("user@example.com");
    expect(json.assistantText).toContain("[REDACTED-EMAIL]");
  });

  it("Output guard blocks Gemini advice that slipped through", async () => {
    chatMock.mockResolvedValue({
      text: "You should buy HDFC Silver immediately for great returns.",
      toolCalls: [],
      model: "gemini-2.5-flash-lite",
      latencyMs: 200,
    });

    const { json } = await callConverse({
      userInput: "Tell me about HDFC Silver",
    });

    /* This time the output guard fires because the text contains
     * second-person advice ("you should buy"). */
    expect(json.meta.complianceFlag).toBe("guard_output");
    expect(String(json.assistantText).toLowerCase()).toContain("advice");
  });
});

describe("/api/voice/converse — tool calls", () => {
  it("records tool calls returned by gemini.chat", async () => {
    chatMock.mockResolvedValue({
      text: "Your booking code is NL-A3X9.",
      toolCalls: [
        { name: "generate_booking_code_and_notes", args: {}, output: { bookingCode: "NL-A3X9", topic: "sip" }, ok: true },
      ],
      model: "gemini-2.5-flash-lite",
      latencyMs: 200,
    });

    const { json } = await callConverse({
      userInput: "Yes, confirm please",
      conversationState: {
        sessionId: "s2",
        step: "booking_confirmation",
        transcript: [],
        toolCallsMade: [],
        strikeCount: 0,
        lastUserInput: "",
        topic: "sip",
        startedAt: new Date().toISOString(),
      },
    });

    expect(json.toolCalls).toHaveLength(1);
    expect(json.toolCalls[0].name).toBe("generate_booking_code_and_notes");
  });
});
