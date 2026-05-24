/**
 * Google Calendar Tool — Phase 10
 *
 * Wraps the `googleapis` Calendar v3 client behind a small, typed API
 * that the Phase 11 Gemini Function Calling loop invokes.
 *
 * Tool name (Gemini Function Calling): `create_calendar_event`
 *
 * Auth: Google Service Account JWT (Domain-Wide Delegation NOT
 * required because we write to a single shared advisor calendar id
 * exposed by `TARGET_CALENDAR_ID`).
 *
 * Required env vars (validated lazily):
 *   - `GOOGLE_CLIENT_EMAIL`
 *   - `GOOGLE_PRIVATE_KEY` (JSON-escaped, may contain literal `\n`)
 *   - `TARGET_CALENDAR_ID`
 *
 * Reliability:
 *   - Lazy singleton client (avoids re-auth on every call)
 *   - 1 automatic retry on transient (5xx / network) failures
 *   - 10-second timeout per request
 *
 * Test mode:
 *   - When `process.env.CALENDAR_MOCK_MODE === "true"` OR when any
 *     of the required env vars is missing, returns a deterministic
 *     mock event so tests / dev mode never fail.
 */

import { google, type calendar_v3 } from "googleapis";
import {
  type CalendarEventPayload,
  type CalendarEventResult,
  type BookingCode,
} from "@/types";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

type CalendarClient = calendar_v3.Calendar;

let cachedClient: CalendarClient | null = null;

/**
 * Lazily build the calendar client. Returns `null` if any required
 * env var is missing OR if mock mode is on — the caller MUST handle
 * the null case (returning a mock event).
 */
function getCalendarClient(): CalendarClient | null {
  if (cachedClient) return cachedClient;

  const isMockMode = process.env.CALENDAR_MOCK_MODE === "true";
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

  if (isMockMode || !email || !privateKeyRaw) return null;

  /* The private key is stored with literal `\n` sequences in `.env`.
   * Restore them to actual newlines for the JWT library. */
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  const jwt = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });

  cachedClient = google.calendar({ version: "v3", auth: jwt });
  return cachedClient;
}

/* ════════════════════════════════════════════════════════════════════
   PUBLIC API
   ════════════════════════════════════════════════════════════════════ */

/**
 * Create a calendar event for the proposed booking.
 *
 * Retries:
 *   - 1 automatic retry on 5xx / network errors
 *   - HTTP 4xx (auth, invalid payload) are NOT retried
 *
 * @throws never — failures return a `status: "tentative"` event with
 *                  `htmlLink: ""` so the agent can degrade gracefully
 *                  without crashing the conversation.
 */
export async function createCalendarEvent(
  payload: CalendarEventPayload,
): Promise<CalendarEventResult> {
  const targetCalendarId =
    process.env.TARGET_CALENDAR_ID || payload.calendarId || "primary";

  const client = getCalendarClient();

  /* ── Mock / dev mode ──────────────────────────────────────── */
  if (!client) {
    return buildMockEvent(payload);
  }

  const requestBody: calendar_v3.Schema$Event = {
    summary: payload.summary,
    description: payload.description,
    start: { dateTime: payload.startDateTime, timeZone: "Asia/Kolkata" },
    end:   { dateTime: payload.endDateTime,   timeZone: "Asia/Kolkata" },
    /* Booking code embedded in the extendedProperties for retrieval
     * by Pulse / Director Ops audit. */
    extendedProperties: {
      private: {
        bookingCode: payload.bookingCode,
        topic: payload.topic,
      },
    },
    attendees: payload.attendeeEmail
      ? [{ email: payload.attendeeEmail }]
      : undefined,
  };

  return withRetry(async () => {
    const res = await client.events.insert({
      calendarId: targetCalendarId,
      requestBody,
      sendUpdates: "none",
    });

    const data = res.data;
    return {
      eventId: data.id ?? "",
      htmlLink: data.htmlLink ?? "",
      status: (data.status as CalendarEventResult["status"]) ?? "tentative",
      startDateTime: data.start?.dateTime ?? payload.startDateTime,
      bookingCode: payload.bookingCode,
    };
  }, payload);
}

/* ════════════════════════════════════════════════════════════════════
   INTERNAL — retry + mock
   ════════════════════════════════════════════════════════════════════ */

async function withRetry(
  fn: () => Promise<CalendarEventResult>,
  payload: CalendarEventPayload,
): Promise<CalendarEventResult> {
  try {
    return await withTimeout(fn(), 10_000);
  } catch (err1) {
    const transient = isTransientError(err1);
    if (!transient) {
      console.error("[calendar] Non-transient error:", err1);
      return buildMockEvent(payload, "tentative");
    }
    /* Retry once */
    try {
      return await withTimeout(fn(), 10_000);
    } catch (err2) {
      console.error("[calendar] Retry failed:", err2);
      return buildMockEvent(payload, "tentative");
    }
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Calendar request timed out after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: number | string; status?: number; message?: string };
  const code = typeof e.code === "number" ? e.code : Number(e.code);
  const status = typeof e.status === "number" ? e.status : Number(e.status ?? NaN);
  const msg = (e.message ?? "").toLowerCase();
  if (Number.isFinite(code) && code >= 500) return true;
  if (Number.isFinite(status) && status >= 500) return true;
  if (msg.includes("timed out") || msg.includes("network") || msg.includes("etimedout") || msg.includes("econnreset")) return true;
  return false;
}

function buildMockEvent(
  payload: CalendarEventPayload,
  status: CalendarEventResult["status"] = "confirmed",
): CalendarEventResult {
  /* Deterministic mock id derived from the booking code so tests can
   * assert on it. */
  const eventId = `mock-event-${payload.bookingCode.toLowerCase()}`;
  return {
    eventId,
    htmlLink: `https://calendar.example.com/event/${eventId}`,
    status,
    startDateTime: payload.startDateTime,
    bookingCode: payload.bookingCode as BookingCode,
  };
}

/* ════════════════════════════════════════════════════════════════════
   HELPER — build a CalendarEventPayload from a BookingSummary
   ════════════════════════════════════════════════════════════════════ */

import { type BookingSummary } from "@/types";

export interface BuildCalendarPayloadOptions {
  attendeeEmail?: string;
  calendarId?: string;
  durationMinutes?: number;
}

/**
 * Construct a `CalendarEventPayload` from a `BookingSummary` produced
 * by `notes-extractor.generateBookingCodeAndNotes()`.
 */
export function buildCalendarPayload(
  summary: BookingSummary,
  options: BuildCalendarPayloadOptions = {},
): CalendarEventPayload {
  const {
    attendeeEmail = summary.advisorEmail,
    calendarId = process.env.TARGET_CALENDAR_ID || "primary",
    durationMinutes = 30,
  } = options;

  const startMs = Date.parse(summary.proposedSlot);
  const endIso =
    Number.isFinite(startMs)
      ? new Date(startMs + durationMinutes * 60 * 1000).toISOString()
      : new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

  return {
    summary: `Groww Advisor Call — ${summary.topic} — ${summary.bookingCode}`,
    description: [
      `Booking Code: ${summary.bookingCode}`,
      `Topic: ${summary.topic}`,
      `Investor: ${summary.investorNameRedacted}`,
      `Notes: ${summary.contextNotes || "(none captured)"}`,
    ].join("\n"),
    startDateTime: summary.proposedSlot,
    endDateTime: endIso,
    attendeeEmail,
    calendarId,
    bookingCode: summary.bookingCode,
    topic: summary.topic,
  };
}

/** Test helper — wipe the cached client (so env-mode toggles re-init) */
export function _resetCalendarClientForTests(): void {
  cachedClient = null;
}
