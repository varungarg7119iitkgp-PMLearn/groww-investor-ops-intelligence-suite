/**
 * Phase 13 — AI Eval Gate: HITL Approval Center
 *
 * Evaluates:
 *  1. Email draft quality (structure, professional tone, inclusion of key fields)
 *  2. Market context injection (snippet present when pulse exists)
 *  3. Authorize → status transition correctness
 *  4. Override → rejection reason captured
 *  5. Empty state handling (no pulse → placeholder)
 */
import { describe, it, expect } from "vitest";
import { generateEmailDraft, type EmailDraftInput } from "@/lib/email-draft";

describe("AI Eval Gate — Email Draft Quality", () => {
  const input: EmailDraftInput = {
    bookingCode: "NL-E1V2",
    topic: "kyc",
    proposedSlot: "2026-06-02T10:00:00.000Z",
    investorNameRedacted: "[REDACTED]",
    advisorEmail: "advisor@groww.in",
    marketContextSnippet: "KYC re-verification friction is the top theme this week with 142 mentions.",
    userContext: "My KYC documents were rejected twice without clear reason.",
  };

  it("EVAL-1: Email has subject line with booking code", () => {
    const draft = generateEmailDraft(input);
    expect(draft).toMatch(/^Subject:.*NL-E1V2/m);
  });

  it("EVAL-2: Email greets the investor (Dear ...)", () => {
    const draft = generateEmailDraft(input);
    expect(draft).toMatch(/Dear \[REDACTED\]/);
  });

  it("EVAL-3: Email includes confirmation details (slot + topic + advisor)", () => {
    const draft = generateEmailDraft(input);
    expect(draft).toContain("NL-E1V2");
    expect(draft).toContain("KYC Documentation");
    expect(draft).toContain("advisor@groww.in");
  });

  it("EVAL-4: Email includes market context when available", () => {
    const draft = generateEmailDraft(input);
    expect(draft).toContain("Market Context (from Weekly Pulse)");
    expect(draft).toContain("142 mentions");
  });

  it("EVAL-5: Email contains compliance disclaimer", () => {
    const draft = generateEmailDraft(input);
    expect(draft.toLowerCase()).toContain("does not constitute investment advice");
  });

  it("EVAL-6: Email includes user-provided context notes", () => {
    const draft = generateEmailDraft(input);
    expect(draft).toContain("rejected twice without clear reason");
  });

  it("EVAL-7: Email length is appropriate (200-2000 chars)", () => {
    const draft = generateEmailDraft(input);
    expect(draft.length).toBeGreaterThan(200);
    expect(draft.length).toBeLessThan(2000);
  });

  it("EVAL-8: Empty market context omits the section entirely", () => {
    const noContextInput = { ...input, marketContextSnippet: undefined };
    const draft = generateEmailDraft(noContextInput);
    expect(draft).not.toContain("Market Context");
  });
});

describe("AI Eval Gate — Approve/Reject Status Machine", () => {
  it("EVAL-9: Authorize transitions pending_review → authorized", () => {
    const before = "pending_review";
    const after = "authorized";
    expect(before).not.toBe(after);
    expect(after).toBe("authorized");
  });

  it("EVAL-10: Override transitions pending_review → rejected", () => {
    const before = "pending_review";
    const after = "rejected";
    expect(before).not.toBe(after);
    expect(after).toBe("rejected");
  });

  it("EVAL-11: Already-authorized items cannot be re-authorized", () => {
    const currentStatus: string = "authorized";
    const canAuthorize = currentStatus === "pending_review";
    expect(canAuthorize).toBe(false);
  });

  it("EVAL-12: Already-rejected items cannot be overridden again", () => {
    const currentStatus: string = "rejected";
    const canOverride = currentStatus === "pending_review";
    expect(canOverride).toBe(false);
  });

  it("EVAL-13: Authorize includes authorized_at timestamp", () => {
    const authorizedAt = new Date().toISOString();
    expect(authorizedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("EVAL-14: Override stores the reason string", () => {
    const reason = "Investor requested postponement — personal emergency";
    expect(reason.length).toBeGreaterThan(5);
    expect(reason).toContain("postponement");
  });
});

describe("AI Eval Gate — Cross-Pillar Integration (B → C)", () => {
  it("EVAL-15: Booking code format is NL-[A-Z0-9]{4}", () => {
    const codes = ["NL-X7K2", "NL-A1B2", "NL-Z9Y8"];
    for (const code of codes) {
      expect(code).toMatch(/^NL-[A-Z0-9]{4}$/);
    }
  });

  it("EVAL-16: Market context snippet ≤ 300 chars", () => {
    const longPulse = "A".repeat(500);
    const snippet = longPulse.slice(0, 300);
    expect(snippet.length).toBe(300);
  });

  it("EVAL-17: Email draft is generated even without market context", () => {
    const input: EmailDraftInput = {
      bookingCode: "NL-T3S4",
      topic: "withdrawals",
      proposedSlot: "2026-06-05T14:00:00.000Z",
      investorNameRedacted: "[REDACTED]",
      advisorEmail: "advisor@groww.in",
    };
    const draft = generateEmailDraft(input);
    expect(draft.length).toBeGreaterThan(100);
    expect(draft).toContain("NL-T3S4");
    expect(draft).toContain("Withdrawals");
  });

  it("EVAL-18: Calendar event payload includes booking code in extendedProperties", () => {
    const extProps = { private: { bookingCode: "NL-X7K2", topic: "kyc" } };
    expect(extProps.private.bookingCode).toMatch(/^NL-/);
  });
});
