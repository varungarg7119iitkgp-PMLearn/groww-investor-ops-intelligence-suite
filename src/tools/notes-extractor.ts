/**
 * Notes Extractor — Phase 10
 *
 * Generates the **booking code** (`NL-[A-Z0-9]{4}`) and the redacted
 * post-call **notes** that get attached to the calendar event AND
 * surfaced in the Director Ops audit log. PII is scrubbed BEFORE
 * notes are stored — caller never sees PAN/Aadhaar/phone leak.
 *
 * Tool name (Gemini Function Calling): `generate_booking_code_and_notes`
 *
 * Booking code format: `NL-[A-Z0-9]{4}`  (16⁴ = 65,536 combos)
 *   - Uses `crypto.randomBytes(2)` (Node) or `crypto.getRandomValues`
 *     (Edge) — never `Math.random()`.
 *   - Session uniqueness enforced via a `Set` per session id.
 *   - Module-level `Set` reset by `resetSessionState(sessionId)`.
 */

import {
  type BookingSummary,
  type BookingCode,
  type TopicType,
  type ArtifactStatus,
  BOOKING_CODE_REGEX,
} from "@/types";

import { redactPII } from "@/lib/compliance";

/* ════════════════════════════════════════════════════════════════════
   BOOKING CODE
   ════════════════════════════════════════════════════════════════════ */

/* Alphabet excludes confusing chars (0/O, 1/I) for read-aloud */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars (5 bits each)

const sessionCodes: Map<string, Set<string>> = new Map();

/**
 * Generate a fresh booking code `NL-[A-Z0-9]{4}`. Guarantees:
 *   - Uniqueness within a session (`sessionId` param)
 *   - Crypto-strong randomness (`crypto.getRandomValues`)
 *   - Matches `BOOKING_CODE_REGEX`
 *
 * @param sessionId  Conversation session id (from ConversationState)
 * @param maxAttempts Defensive cap to avoid infinite loops in tests
 */
export function generateBookingCode(
  sessionId: string,
  maxAttempts = 20,
): BookingCode {
  const set = sessionCodes.get(sessionId) ?? new Set<string>();

  for (let i = 0; i < maxAttempts; i++) {
    const code = randomCode();
    if (!set.has(code)) {
      set.add(code);
      sessionCodes.set(sessionId, set);
      return code as BookingCode;
    }
  }
  /* 65k space is huge — collision after 20 tries is essentially
   * impossible; we throw rather than corrupt state. */
  throw new Error(
    `generateBookingCode: ${maxAttempts} collisions in session ${sessionId} — impossible without bug`,
  );
}

function randomCode(): string {
  const bytes = new Uint8Array(4);
  cryptoFill(bytes);
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    /* Take low 5 bits — alphabet has 32 chars, so 5 bits maps perfectly */
    suffix += CODE_ALPHABET[bytes[i] & 0x1f];
  }
  return `NL-${suffix}`;
}

function cryptoFill(buf: Uint8Array): void {
  /* In Node 19+ and Edge runtime, `crypto.getRandomValues` exists globally. */
  const g = globalThis as unknown as { crypto?: Crypto };
  if (g.crypto && typeof g.crypto.getRandomValues === "function") {
    g.crypto.getRandomValues(buf);
    return;
  }
  /* Server-side Node fallback — require dynamically to avoid edge build issues. */
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("crypto") as { randomFillSync(b: Uint8Array): Uint8Array };
  nodeCrypto.randomFillSync(buf);
}

/** Clear the session uniqueness set — call when conversation ends. */
export function resetSessionState(sessionId: string): void {
  sessionCodes.delete(sessionId);
}

/* ════════════════════════════════════════════════════════════════════
   BOOKING SUMMARY GENERATOR
   ════════════════════════════════════════════════════════════════════ */

export interface GenerateBookingArgs {
  sessionId: string;
  topic: TopicType;
  /** Raw user-provided context — will be PII-scrubbed */
  contextNotes: string;
  /** Slot string in ISO-8601, e.g. from generateMockSlots() */
  proposedSlot: string;
  advisorEmail?: string;
  investorName?: string;
}

/**
 * Generate the canonical `BookingSummary` artifact. Notes are
 * PII-scrubbed via `redactPII()` (Phase 9). The booking code is
 * crypto-random and unique within the session.
 */
export function generateBookingCodeAndNotes(
  args: GenerateBookingArgs,
): BookingSummary {
  const {
    sessionId,
    topic,
    contextNotes,
    proposedSlot,
    advisorEmail = "advisor@groww.in",
    investorName = "",
  } = args;

  const bookingCode = generateBookingCode(sessionId);

  /* Scrub PII from the raw context the user uttered. We keep the
   * structure but replace any matched span with `[REDACTED-<TYPE>]`. */
  const { text: scrubbedNotes } = redactPII(contextNotes ?? "");

  const status: ArtifactStatus = "pending_review";

  /* Investor name is collapsed to "[REDACTED]" unconditionally —
   * names alone aren't a PII pattern but the architecture spec
   * mandates redaction for cross-pillar surfacing in Pulse. */
  const investorNameRedacted = investorName ? "[REDACTED]" : "[REDACTED]";

  return {
    bookingCode,
    investorNameRedacted,
    topic,
    proposedSlot,
    advisorEmail,
    status,
    contextNotes: scrubbedNotes,
  };
}

/**
 * Convenience: validate that an externally-provided code matches the
 * `NL-XXXX` format. Useful for ingest/legacy paths.
 */
export function isValidGeneratedCode(code: string): boolean {
  return BOOKING_CODE_REGEX.test(code);
}
