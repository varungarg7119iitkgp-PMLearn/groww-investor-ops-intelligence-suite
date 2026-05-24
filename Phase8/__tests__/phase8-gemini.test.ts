/**
 * Phase 8 — Gemini client wrapper unit tests
 *
 * Mocks `@google/generative-ai` so we can simulate success / failure /
 * retry paths without hitting the real API.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ── Mock the SDK ────────────────────────────────────────────── */

const generateContentMock = vi.fn();

const fakeModel = {
  generateContent: generateContentMock,
};

/* `GoogleGenerativeAI` is `new`-ed in our wrapper. Arrow-function mocks
 * are NOT constructible, so we use a regular class to satisfy `new`. */
vi.mock("@google/generative-ai", () => {
  class FakeGoogleGenerativeAI {
    getGenerativeModel() {
      return fakeModel;
    }
  }
  return { GoogleGenerativeAI: FakeGoogleGenerativeAI };
});

/* ── Import SUT *after* the mock ─────────────────────────────── */
import { generateContent, parseJson, __resetGeminiClient } from "@/lib/gemini";

beforeEach(() => {
  generateContentMock.mockReset();
  __resetGeminiClient();
  process.env.GEMINI_API_KEY = "test-key";
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ════════════════════════════════════════════════════════════════
   generateContent
   ════════════════════════════════════════════════════════════════ */

describe("generateContent()", () => {
  it("returns text on success", async () => {
    generateContentMock.mockResolvedValueOnce({
      response: { text: () => "Hello world" },
    });
    const r = await generateContent("test prompt", { maxRetries: 0 });
    expect(r.text).toBe("Hello world");
    expect(r.model).toBe("gemini-2.5-flash-lite");
    expect(r.retries).toBe(0);
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("retries on transient failure and eventually succeeds", async () => {
    generateContentMock
      .mockRejectedValueOnce(new Error("transient 503"))
      .mockRejectedValueOnce(new Error("transient 503"))
      .mockResolvedValueOnce({ response: { text: () => "OK" } });

    const r = await generateContent("p", { maxRetries: 2 });
    expect(r.text).toBe("OK");
    expect(r.retries).toBe(2);
    expect(generateContentMock).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting retries", async () => {
    generateContentMock.mockRejectedValue(new Error("hard fail"));
    await expect(generateContent("p", { maxRetries: 1 })).rejects.toThrow(/Failed after 2 attempts/);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("treats empty response as failure", async () => {
    generateContentMock.mockResolvedValue({ response: { text: () => "" } });
    await expect(generateContent("p", { maxRetries: 0 })).rejects.toThrow(/Empty response/);
  });

  it("throws when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    __resetGeminiClient();
    await expect(generateContent("p")).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("respects the timeout", async () => {
    /* Never-resolving promise simulating a hung request */
    generateContentMock.mockImplementation(
      () => new Promise(() => { /* never */ }),
    );
    await expect(generateContent("p", { timeoutMs: 50, maxRetries: 0 })).rejects.toThrow(/timeout/);
  });
});

/* ════════════════════════════════════════════════════════════════
   parseJson
   ════════════════════════════════════════════════════════════════ */

describe("parseJson()", () => {
  it("parses bare JSON", () => {
    expect(parseJson<{ a: number }>('{"a": 1}').a).toBe(1);
  });

  it("strips ```json fences", () => {
    const r = parseJson<{ a: number }>('```json\n{"a": 2}\n```');
    expect(r.a).toBe(2);
  });

  it("strips ``` fences (no lang tag)", () => {
    const r = parseJson<{ a: number }>('```\n{"a": 3}\n```');
    expect(r.a).toBe(3);
  });

  it("throws on non-JSON content", () => {
    expect(() => parseJson("hello world")).toThrow(/not JSON-looking/);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseJson('{"a": ')).toThrow(/JSON.parse failed/);
  });

  it("parses arrays", () => {
    expect(parseJson<number[]>("[1,2,3]")).toEqual([1, 2, 3]);
  });
});
