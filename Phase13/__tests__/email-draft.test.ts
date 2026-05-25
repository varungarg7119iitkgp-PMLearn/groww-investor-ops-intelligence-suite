/**
 * Phase 13 — Email Draft Generation Tests
 */
import { describe, it, expect } from "vitest";
import { generateEmailDraft } from "@/lib/email-draft";

describe("generateEmailDraft", () => {
  const baseInput = {
    bookingCode: "NL-X7K2",
    topic: "kyc" as const,
    proposedSlot: "2026-05-27T10:30:00.000Z",
    investorNameRedacted: "[REDACTED]",
    advisorEmail: "priya@groww.in",
  };

  it("produces a non-empty string with subject line", () => {
    const draft = generateEmailDraft(baseInput);
    expect(draft.length).toBeGreaterThan(100);
    expect(draft).toContain("Subject:");
    expect(draft).toContain("NL-X7K2");
  });

  it("includes the topic label (KYC Documentation)", () => {
    const draft = generateEmailDraft(baseInput);
    expect(draft).toContain("KYC Documentation");
  });

  it("includes advisor email in the body", () => {
    const draft = generateEmailDraft(baseInput);
    expect(draft).toContain("priya@groww.in");
  });

  it("appends market context when provided", () => {
    const draft = generateEmailDraft({
      ...baseInput,
      marketContextSnippet: "KYC re-verification is top theme this week (142 mentions).",
    });
    expect(draft).toContain("Market Context (from Weekly Pulse)");
    expect(draft).toContain("142 mentions");
  });

  it("omits market context block when not provided", () => {
    const draft = generateEmailDraft(baseInput);
    expect(draft).not.toContain("Market Context (from Weekly Pulse)");
  });

  it("includes user context notes when provided", () => {
    const draft = generateEmailDraft({
      ...baseInput,
      userContext: "My PAN was flagged incorrectly",
    });
    expect(draft).toContain("My PAN was flagged incorrectly");
  });

  it("includes compliance disclaimer", () => {
    const draft = generateEmailDraft(baseInput);
    expect(draft).toContain("does not constitute investment advice");
  });

  it("handles all five topic types", () => {
    const topics = ["kyc", "sip", "statements", "withdrawals", "account_changes"] as const;
    for (const topic of topics) {
      const draft = generateEmailDraft({ ...baseInput, topic });
      expect(draft.length).toBeGreaterThan(50);
      expect(draft).toContain("NL-X7K2");
    }
  });
});
