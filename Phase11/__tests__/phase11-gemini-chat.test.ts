/**
 * Phase 11 — gemini.chat() Function Calling loop unit tests
 *
 * Mocks the Gemini SDK so we can deterministically test the loop
 * without spending tokens. Covers:
 *   - Plain text response (no tool call) → returns text
 *   - Single tool call → dispatcher invoked → result fed back → final text
 *   - Multiple tool calls in one turn → all dispatched
 *   - maxToolTurns cap reached → returns whatever model said
 *   - Tool dispatcher missing → loop breaks without dispatching
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

/* ════════════════════════════════════════════════════════════════════
   Mock the SDK
   ════════════════════════════════════════════════════════════════════ */

const sendMessageMock = vi.fn();
const startChatMock = vi.fn(() => ({ sendMessage: sendMessageMock }));

const getGenerativeModelMock = vi.fn(() => ({
  startChat: startChatMock,
  generateContent: vi.fn(),
}));

vi.mock("@google/generative-ai", () => {
  class FakeClient { getGenerativeModel = getGenerativeModelMock; }
  return {
    GoogleGenerativeAI: FakeClient,
    SchemaType: {
      OBJECT: "OBJECT",
      STRING: "STRING",
      NUMBER: "NUMBER",
      BOOLEAN: "BOOLEAN",
      ARRAY: "ARRAY",
    },
  };
});

beforeEach(() => {
  process.env.GEMINI_API_KEY = "fake-key";
  sendMessageMock.mockReset();
  startChatMock.mockClear();
  getGenerativeModelMock.mockClear();
});

/* Helper to make a fake response */
function textResponse(text: string) {
  return {
    response: {
      text: () => text,
      functionCalls: () => undefined,
      candidates: [{ content: { parts: [{ text }] } }],
    },
  };
}

function functionCallResponse(calls: Array<{ name: string; args: Record<string, unknown> }>) {
  return {
    response: {
      text: () => "",
      functionCalls: () => calls,
      candidates: [{ content: { parts: calls.map((c) => ({ functionCall: c })) } }],
    },
  };
}

/* ════════════════════════════════════════════════════════════════════
   TESTS
   ════════════════════════════════════════════════════════════════════ */

describe("gemini.chat() — function calling loop", () => {
  it("returns plain text when no tools are invoked", async () => {
    const { chat, __resetGeminiClient } = await import("@/lib/gemini");
    __resetGeminiClient();
    sendMessageMock.mockResolvedValueOnce(textResponse("Hello there."));

    const result = await chat("hi", { tools: [], maxToolTurns: 2 });
    expect(result.text).toBe("Hello there.");
    expect(result.toolCalls).toEqual([]);
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
  });

  it("dispatches a single tool call and returns final text", async () => {
    const { chat, __resetGeminiClient } = await import("@/lib/gemini");
    __resetGeminiClient();

    sendMessageMock
      .mockResolvedValueOnce(
        functionCallResponse([{ name: "test_tool", args: { x: 1 } }]),
      )
      .mockResolvedValueOnce(textResponse("Done."));

    const dispatcher = vi.fn(async () => ({
      ok: true,
      output: { result: "ok" },
    }));

    const result = await chat("call the tool", {
      tools: [
        {
          name: "test_tool",
          description: "Test tool",
          parameters: { type: "OBJECT", properties: {}, required: [] },
        },
      ],
      toolDispatcher: dispatcher,
      maxToolTurns: 3,
    });

    expect(result.text).toBe("Done.");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].name).toBe("test_tool");
    expect(result.toolCalls[0].ok).toBe(true);
    expect(dispatcher).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledTimes(2);
  });

  it("dispatches multiple tools in a single response", async () => {
    const { chat, __resetGeminiClient } = await import("@/lib/gemini");
    __resetGeminiClient();

    sendMessageMock
      .mockResolvedValueOnce(
        functionCallResponse([
          { name: "tool_a", args: {} },
          { name: "tool_b", args: {} },
        ]),
      )
      .mockResolvedValueOnce(textResponse("Combined."));

    const dispatcher = vi.fn(async (name) => ({ ok: true, output: { name } }));

    const result = await chat("multi", {
      tools: [
        { name: "tool_a", description: "a", parameters: { type: "OBJECT", properties: {}, required: [] } },
        { name: "tool_b", description: "b", parameters: { type: "OBJECT", properties: {}, required: [] } },
      ],
      toolDispatcher: dispatcher,
    });

    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls.map((c) => c.name)).toEqual(["tool_a", "tool_b"]);
    expect(dispatcher).toHaveBeenCalledTimes(2);
  });

  it("respects maxToolTurns cap", async () => {
    const { chat, __resetGeminiClient } = await import("@/lib/gemini");
    __resetGeminiClient();

    /* Always returns a function call — would loop forever without cap */
    sendMessageMock.mockResolvedValue(
      functionCallResponse([{ name: "infinite", args: {} }]),
    );

    const dispatcher = vi.fn(async () => ({ ok: true, output: {} }));

    const result = await chat("loop", {
      tools: [
        { name: "infinite", description: "x", parameters: { type: "OBJECT", properties: {}, required: [] } },
      ],
      toolDispatcher: dispatcher,
      maxToolTurns: 2,
    });

    /* Initial sendMessage + 2 tool-response sendMessages = 3 total */
    expect(sendMessageMock).toHaveBeenCalledTimes(3);
    expect(result.toolCalls.length).toBe(2);
  });

  it("breaks loop when no dispatcher is provided", async () => {
    const { chat, __resetGeminiClient } = await import("@/lib/gemini");
    __resetGeminiClient();
    sendMessageMock.mockResolvedValueOnce(
      functionCallResponse([{ name: "x", args: {} }]),
    );

    const result = await chat("call", {
      tools: [{ name: "x", description: "x", parameters: { type: "OBJECT", properties: {}, required: [] } }],
      maxToolTurns: 3,
    });

    /* Only the initial send — no follow-up because no dispatcher */
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(result.toolCalls).toEqual([]);
  });

  it("propagates tool dispatcher errors as ok=false", async () => {
    const { chat, __resetGeminiClient } = await import("@/lib/gemini");
    __resetGeminiClient();

    sendMessageMock
      .mockResolvedValueOnce(functionCallResponse([{ name: "fail_tool", args: {} }]))
      .mockResolvedValueOnce(textResponse("Recovered."));

    const dispatcher = vi.fn(async () => ({
      ok: false,
      output: {},
      error: "Tool failed",
    }));

    const result = await chat("call", {
      tools: [
        { name: "fail_tool", description: "x", parameters: { type: "OBJECT", properties: {}, required: [] } },
      ],
      toolDispatcher: dispatcher,
    });

    expect(result.toolCalls[0].ok).toBe(false);
    expect(result.text).toBe("Recovered.");
  });
});
