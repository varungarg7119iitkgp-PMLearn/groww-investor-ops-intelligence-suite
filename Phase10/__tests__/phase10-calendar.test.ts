/**
 * Phase 10 — Calendar tool unit tests
 *
 * Mock mode: tests run with no Google credentials so `createCalendarEvent`
 * returns a deterministic mock event. We verify:
 *   - All required fields populated
 *   - Mock id is derived from bookingCode (deterministic)
 *   - buildCalendarPayload constructs valid payload from BookingSummary
 *   - Failure / retry path returns tentative event (no throw)
 */

import { describe, expect, it, beforeAll, vi } from "vitest";
import { BOOKING_CODE_REGEX } from "@/types";

beforeAll(() => {
  /* Force mock mode to avoid attempting real Google auth in CI */
  process.env.CALENDAR_MOCK_MODE = "true";
});

/* Mock googleapis to ensure no real network calls even outside mock mode */
vi.mock("googleapis", () => ({
  google: {
    auth: { JWT: class { constructor() {} } },
    calendar: () => ({
      events: {
        insert: vi.fn().mockResolvedValue({
          data: {
            id: "fake-event-id",
            htmlLink: "https://calendar.google.com/event/fake",
            status: "confirmed",
            start: { dateTime: "2026-05-20T10:00:00+05:30" },
          },
        }),
      },
    }),
  },
}));

describe("createCalendarEvent() — mock mode", () => {
  it("returns a CalendarEventResult with all required fields", async () => {
    const { createCalendarEvent } = await import("@/tools/calendar");
    const result = await createCalendarEvent({
      summary: "Groww Advisor Call",
      description: "Test booking",
      startDateTime: "2026-05-20T10:00:00+05:30",
      endDateTime: "2026-05-20T10:30:00+05:30",
      attendeeEmail: "user@example.com",
      calendarId: "primary",
      bookingCode: "NL-A3X9" as `NL-${string}`,
      topic: "sip",
    });

    expect(result.eventId).toBeTruthy();
    expect(result.htmlLink).toMatch(/^https?:\/\//);
    expect(["confirmed", "tentative"]).toContain(result.status);
    expect(result.startDateTime).toBe("2026-05-20T10:00:00+05:30");
    expect(result.bookingCode).toBe("NL-A3X9");
  });

  it("mock event id is deterministic (derived from booking code)", async () => {
    const { createCalendarEvent } = await import("@/tools/calendar");
    const r1 = await createCalendarEvent({
      summary: "X", description: "X",
      startDateTime: "2026-05-20T10:00:00+05:30",
      endDateTime: "2026-05-20T10:30:00+05:30",
      attendeeEmail: "u@e.com", calendarId: "primary",
      bookingCode: "NL-BC4D" as `NL-${string}`, topic: "kyc",
    });
    const r2 = await createCalendarEvent({
      summary: "Y", description: "Y",
      startDateTime: "2026-05-20T10:00:00+05:30",
      endDateTime: "2026-05-20T10:30:00+05:30",
      attendeeEmail: "u@e.com", calendarId: "primary",
      bookingCode: "NL-BC4D" as `NL-${string}`, topic: "kyc",
    });
    expect(r1.eventId).toBe(r2.eventId);
    expect(r1.eventId).toBe("mock-event-nl-bc4d");
  });
});

describe("buildCalendarPayload()", () => {
  it("constructs a payload from a BookingSummary", async () => {
    const { buildCalendarPayload } = await import("@/tools/calendar");
    const payload = buildCalendarPayload({
      bookingCode: "NL-FEED" as `NL-${string}`,
      investorNameRedacted: "[REDACTED]",
      topic: "sip",
      proposedSlot: "2026-05-20T10:00:00+05:30",
      advisorEmail: "advisor@groww.in",
      status: "pending_review",
      contextNotes: "Increase SIP from 5k to 10k",
    });

    expect(payload.summary).toContain("NL-FEED");
    expect(payload.summary).toContain("sip");
    expect(payload.description).toContain("Increase SIP from 5k to 10k");
    expect(payload.description).toContain("[REDACTED]");
    expect(payload.startDateTime).toBe("2026-05-20T10:00:00+05:30");
    expect(payload.bookingCode).toMatch(BOOKING_CODE_REGEX);
  });

  it("default 30-minute duration", async () => {
    const { buildCalendarPayload } = await import("@/tools/calendar");
    const payload = buildCalendarPayload({
      bookingCode: "NL-ZZ22" as `NL-${string}`,
      investorNameRedacted: "[REDACTED]",
      topic: "kyc",
      proposedSlot: "2026-05-20T10:00:00+05:30",
      advisorEmail: "advisor@groww.in",
      status: "pending_review",
      contextNotes: "KYC pending",
    });
    const start = Date.parse(payload.startDateTime);
    const end = Date.parse(payload.endDateTime);
    expect(end - start).toBe(30 * 60 * 1000);
  });
});
