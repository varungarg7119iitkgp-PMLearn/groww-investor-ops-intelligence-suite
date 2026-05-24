/**
 * Phase 11 — /api/voice/tts route tests
 *
 * Mocks `fetch` to avoid real ElevenLabs calls. Covers:
 *   - Compliance scrub on input (PII)
 *   - Compliance brevity (≤ 2 sentences)
 *   - Compliance guard (block advice)
 *   - Upstream success → streams audio/mpeg
 *   - Upstream failure → 502
 *   - Missing API key → 500
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

const originalFetch = globalThis.fetch;
const fetchMock = vi.fn();

beforeEach(() => {
  process.env.ELEVENLABS_API_KEY = "fake-key";
  process.env.ELEVENLABS_VOICE_ID = "fake-voice-id";
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

async function callTts(body: unknown) {
  const { POST } = await import("@/app/api/voice/tts/route");
  const req = new Request("http://localhost/api/voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("/api/voice/tts — compliance + proxy", () => {
  it("400 on missing text", async () => {
    const res = await callTts({});
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/required/);
  });

  it("blocks advice text via output guard", async () => {
    const res = await callTts({ text: "You should buy HDFC Silver today." });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.toLowerCase()).toContain("compliance");
  });

  it("brevity layer trims input before sending upstream", async () => {
    let capturedText = "";
    fetchMock.mockImplementationOnce(async (_url, init: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) as { text: string } : { text: "" };
      capturedText = body.text;
      const stream = new ReadableStream({ start(c) { c.close(); } });
      return new Response(stream, { status: 200 });
    });

    const long = "Acknowledged. Yes okay sure. This third sentence should be cut by brevity layer.";
    await callTts({ text: long });
    /* Brevity = 2 sentences, so 'This third sentence' must NOT appear */
    expect(capturedText).not.toContain("third");
    /* Captured text length should be < input length */
    expect(capturedText.length).toBeLessThan(long.length);
  });

  it("streams audio on upstream success", async () => {
    const fakeAudio = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([0xff, 0xfb, 0x90, 0x00])); // mp3 header
        controller.close();
      },
    });
    fetchMock.mockResolvedValueOnce(
      new Response(fakeAudio, { status: 200, headers: { "Content-Type": "audio/mpeg" } }),
    );

    const res = await callTts({ text: "Hello there. This is a test." });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
  });

  it("502 on upstream 500", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("upstream broken", { status: 500 }),
    );
    const res = await callTts({ text: "Test message." });
    expect(res.status).toBe(502);
  });

  it("scrubs PII before sending to upstream", async () => {
    fetchMock.mockImplementationOnce(async (_url, init: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) as { text: string } : { text: "" };
      /* The TEXT passed to ElevenLabs must not contain the original PII */
      expect(body.text).not.toContain("9876543210");
      const stream = new ReadableStream({ start(c) { c.close(); } });
      return new Response(stream, { status: 200 });
    });

    const res = await callTts({ text: "Call me at 9876543210." });
    expect([200, 400]).toContain(res.status);
  });

  it("500 when API key missing", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    const res = await callTts({ text: "Test." });
    expect(res.status).toBe(500);
  });
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

import { afterAll } from "vitest";
