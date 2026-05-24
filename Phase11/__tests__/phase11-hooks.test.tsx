/**
 * Phase 11 — Hook tests for useConversation + useAudioAnalyzer
 *
 * - `useConversation` is tested by mocking fetch and asserting
 *   state transitions.
 * - `useAudioAnalyzer` API surface is tested (mount + null source).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const originalFetch = globalThis.fetch;
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

import { afterAll } from "vitest";

describe("useConversation", () => {
  it("send() posts to /api/voice/converse and updates state", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          assistantText: "Hi there.",
          conversationState: {
            sessionId: "s-1",
            step: "greeting",
            transcript: [],
            toolCallsMade: [],
            strikeCount: 0,
            lastUserInput: "hello",
            startedAt: new Date().toISOString(),
          },
          toolCalls: [],
          orbState: "SPEAKING",
          meta: { latencyMs: 100, model: "gemini-2.5-flash-lite", complianceFlag: "ok", step: "greeting" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { useConversation } = await import("@/hooks/useConversation");
    const { result } = renderHook(() => useConversation());

    expect(result.current.state.step).toBe("idle");
    expect(result.current.isProcessing).toBe(false);

    let turnResult: Awaited<ReturnType<typeof result.current.send>> | undefined;
    await act(async () => {
      turnResult = await result.current.send("hello");
    });

    expect(turnResult).not.toBeNull();
    expect(turnResult?.assistantText).toBe("Hi there.");
    await waitFor(() => {
      expect(result.current.state.step).toBe("greeting");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/voice/converse");
  });

  it("send() surfaces error on non-200", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("server down", { status: 500 }),
    );

    const { useConversation } = await import("@/hooks/useConversation");
    const { result } = renderHook(() => useConversation());

    await act(async () => {
      const r = await result.current.send("hello");
      expect(r).toBeNull();
    });

    await waitFor(() => {
      expect(result.current.lastError).toContain("500");
    });
  });

  it("resetConversation() creates fresh sessionId", async () => {
    const { useConversation } = await import("@/hooks/useConversation");
    const { result } = renderHook(() => useConversation());
    const oldSession = result.current.state.sessionId;

    act(() => {
      result.current.resetConversation();
    });

    expect(result.current.state.sessionId).not.toBe(oldSession);
    expect(result.current.state.step).toBe("idle");
  });
});

describe("useAudioAnalyzer", () => {
  it("returns level=0 when not connected", async () => {
    const { useAudioAnalyzer } = await import("@/hooks/useAudioAnalyzer");
    const { result } = renderHook(() => useAudioAnalyzer());
    expect(result.current.level).toBe(0);
    expect(result.current.isActive).toBe(false);
    expect(typeof result.current.connectStream).toBe("function");
    expect(typeof result.current.connectAudioElement).toBe("function");
    expect(typeof result.current.disconnect).toBe("function");
  });
});
