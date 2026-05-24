/**
 * Phase 10 — Voice Tools (Function Calling) tests
 *
 * Covers:
 *   - 3 declarations registered with correct shape
 *   - executeVoiceToolCall routes to the right tool
 *   - Invalid args produce ok:false (no crash)
 *   - Unknown tool name returns ok:false
 */

import { describe, expect, it, beforeAll, vi } from "vitest";
import {
  VOICE_FUNCTION_DECLARATIONS,
  executeVoiceToolCall,
} from "@/lib/voice-tools";
import { BOOKING_CODE_REGEX } from "@/types";

beforeAll(() => {
  process.env.CALENDAR_MOCK_MODE = "true";
});

vi.mock("googleapis", () => ({
  google: {
    auth: { JWT: class { constructor() {} } },
    calendar: () => ({ events: { insert: vi.fn() } }),
  },
}));

describe("VOICE_FUNCTION_DECLARATIONS — shape", () => {
  it("has exactly 3 declarations", () => {
    expect(VOICE_FUNCTION_DECLARATIONS).toHaveLength(3);
  });

  it("all declarations have name + description + parameters.required", () => {
    for (const d of VOICE_FUNCTION_DECLARATIONS) {
      expect(d.name).toBeTruthy();
      expect(d.description.length).toBeGreaterThan(10);
      expect(d.parameters.type).toBe("OBJECT");
      expect(Array.isArray(d.parameters.required)).toBe(true);
    }
  });

  it("get_preparation_docs requires topic", () => {
    const decl = VOICE_FUNCTION_DECLARATIONS.find((d) => d.name === "get_preparation_docs");
    expect(decl?.parameters.required).toContain("topic");
  });

  it("generate_booking_code_and_notes requires 4 fields", () => {
    const decl = VOICE_FUNCTION_DECLARATIONS.find(
      (d) => d.name === "generate_booking_code_and_notes",
    );
    expect(decl?.parameters.required).toEqual(
      expect.arrayContaining(["sessionId", "topic", "contextNotes", "proposedSlot"]),
    );
  });

  it("create_calendar_event requires bookingCode + topic + proposedSlot", () => {
    const decl = VOICE_FUNCTION_DECLARATIONS.find((d) => d.name === "create_calendar_event");
    expect(decl?.parameters.required).toEqual(
      expect.arrayContaining(["bookingCode", "topic", "proposedSlot"]),
    );
  });
});

describe("executeVoiceToolCall — dispatcher", () => {
  const ctx = { sessionId: "test-session" };

  it("get_preparation_docs returns docs for valid topic", async () => {
    const r = await executeVoiceToolCall(
      "get_preparation_docs",
      { topic: "sip", query: "pause" },
      ctx,
    );
    expect(r.ok).toBe(true);
    expect(r.toolName).toBe("get_preparation_docs");
    expect((r.output.documents as unknown[]).length).toBeGreaterThan(0);
  });

  it("get_preparation_docs rejects invalid topic", async () => {
    const r = await executeVoiceToolCall(
      "get_preparation_docs",
      { topic: "foobar" },
      ctx,
    );
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Invalid topic");
  });

  it("generate_booking_code_and_notes returns a NL-XXXX code", async () => {
    const r = await executeVoiceToolCall(
      "generate_booking_code_and_notes",
      {
        sessionId: "abc",
        topic: "sip",
        contextNotes: "Increase SIP",
        proposedSlot: "2026-05-20T10:00:00+05:30",
      },
      ctx,
    );
    expect(r.ok).toBe(true);
    expect(BOOKING_CODE_REGEX.test(String(r.output.bookingCode))).toBe(true);
  });

  it("generate_booking_code_and_notes PII-scrubs contextNotes", async () => {
    const r = await executeVoiceToolCall(
      "generate_booking_code_and_notes",
      {
        sessionId: "pii-session",
        topic: "kyc",
        contextNotes: "PAN ABCDE1234F",
        proposedSlot: "2026-05-20T10:00:00+05:30",
      },
      ctx,
    );
    expect(r.ok).toBe(true);
    expect(String(r.output.contextNotes)).not.toContain("ABCDE1234F");
  });

  it("create_calendar_event with valid code → returns event", async () => {
    const r = await executeVoiceToolCall(
      "create_calendar_event",
      {
        bookingCode: "NL-A3X9",
        topic: "sip",
        proposedSlot: "2026-05-20T10:00:00+05:30",
        contextNotes: "Test notes",
      },
      ctx,
    );
    expect(r.toolName).toBe("create_calendar_event");
    expect(r.output.eventId).toBeTruthy();
  });

  it("create_calendar_event rejects bad bookingCode format", async () => {
    const r = await executeVoiceToolCall(
      "create_calendar_event",
      { bookingCode: "BAD", topic: "sip", proposedSlot: "2026-05-20T10:00:00+05:30" },
      ctx,
    );
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Invalid bookingCode");
  });

  it("unknown tool name returns ok:false", async () => {
    const r = await executeVoiceToolCall("foobar", {}, ctx);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Unknown tool");
  });
});
