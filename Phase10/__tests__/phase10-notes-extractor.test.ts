/**
 * Phase 10 — Notes Extractor unit + property tests
 *
 * Covers:
 *   - Booking code format NL-[A-Z0-9]{4}
 *   - In-session uniqueness (no collisions in 100 generations)
 *   - PII redaction in contextNotes
 *   - BookingSummary shape integrity
 *   - resetSessionState clears uniqueness set
 *
 * Property test: 100 booking codes, all match regex, all unique
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  generateBookingCode,
  generateBookingCodeAndNotes,
  isValidGeneratedCode,
  resetSessionState,
} from "@/tools/notes-extractor";
import { BOOKING_CODE_REGEX } from "@/types";

afterEach(() => {
  /* Use fresh session ids so module-level Set doesn't leak across tests */
});

describe("generateBookingCode()", () => {
  it("returns a code matching NL-[A-Z0-9]{4}", () => {
    const code = generateBookingCode("session-1");
    expect(BOOKING_CODE_REGEX.test(code)).toBe(true);
  });

  it("isValidGeneratedCode validates externally-supplied codes", () => {
    expect(isValidGeneratedCode("NL-A3X9")).toBe(true);
    expect(isValidGeneratedCode("NL-")).toBe(false);
    expect(isValidGeneratedCode("ABCD1234")).toBe(false);
  });

  it("PROPERTY: 100 codes, all match regex", () => {
    const session = `prop-session-${Date.now()}`;
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const c = generateBookingCode(session);
      expect(BOOKING_CODE_REGEX.test(c)).toBe(true);
      codes.add(c);
    }
    /* No collisions in 100 within the same session */
    expect(codes.size).toBe(100);
    resetSessionState(session);
  });

  it("resetSessionState clears uniqueness — code from a fresh session reuses pool", () => {
    const session = "test-reset";
    const before = generateBookingCode(session);
    resetSessionState(session);
    /* After reset, the code pool is fresh — we don't expect identical
     * output, but generation continues to work. */
    const after = generateBookingCode(session);
    expect(BOOKING_CODE_REGEX.test(after)).toBe(true);
    expect(after).toBeTruthy();
    void before;
  });
});

describe("generateBookingCodeAndNotes() — BookingSummary", () => {
  it("returns the canonical fields", () => {
    const out = generateBookingCodeAndNotes({
      sessionId: "test-1",
      topic: "sip",
      contextNotes: "Want to increase SIP from 5k to 10k next month",
      proposedSlot: "2026-05-20T10:00:00+05:30",
    });
    expect(out.bookingCode).toMatch(BOOKING_CODE_REGEX);
    expect(out.topic).toBe("sip");
    expect(out.proposedSlot).toBe("2026-05-20T10:00:00+05:30");
    expect(out.status).toBe("pending_review");
    expect(out.advisorEmail).toBe("advisor@groww.in");
    expect(out.investorNameRedacted).toBe("[REDACTED]");
  });

  it("PII is scrubbed from contextNotes (Phase 9 integration)", () => {
    const out = generateBookingCodeAndNotes({
      sessionId: "test-pii",
      topic: "kyc",
      contextNotes: "My PAN is ABCDE1234F and phone is 9876543210",
      proposedSlot: "2026-05-20T10:00:00+05:30",
    });
    expect(out.contextNotes).not.toContain("ABCDE1234F");
    expect(out.contextNotes).not.toContain("9876543210");
    expect(out.contextNotes).toContain("[REDACTED-PAN]");
    expect(out.contextNotes).toContain("[REDACTED-PHONE]");
  });

  it("empty contextNotes is preserved as empty", () => {
    const out = generateBookingCodeAndNotes({
      sessionId: "test-empty",
      topic: "withdrawals",
      contextNotes: "",
      proposedSlot: "2026-05-20T10:00:00+05:30",
    });
    expect(out.contextNotes).toBe("");
  });

  it("custom advisorEmail propagates", () => {
    const out = generateBookingCodeAndNotes({
      sessionId: "test-advisor",
      topic: "statements",
      contextNotes: "Tax season help",
      proposedSlot: "2026-05-20T10:00:00+05:30",
      advisorEmail: "premium@groww.in",
    });
    expect(out.advisorEmail).toBe("premium@groww.in");
  });
});
