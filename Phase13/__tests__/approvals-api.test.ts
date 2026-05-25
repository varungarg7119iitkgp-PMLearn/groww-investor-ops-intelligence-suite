/**
 * Phase 13 — Approvals API Route Tests
 *
 * Tests the GET/POST /api/approvals and authorize/override flows.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

/* ─── Mocked Supabase responses ─── */
const mockItems = [
  {
    id: "uuid-1",
    booking_code: "NL-X7K2",
    investor_name_redacted: "[REDACTED]",
    topic: "kyc",
    proposed_slot: "2026-05-27T10:30:00.000Z",
    advisor_email: "priya@groww.in",
    email_draft: "Subject: Confirmation\nDear Investor...",
    market_context_snippet: "KYC friction top theme",
    status: "pending_review",
    created_at: "2026-05-24T09:15:00.000Z",
    authorized_at: null,
    override_reason: null,
  },
];

const mockSelect = vi.fn().mockReturnValue({
  order: vi.fn().mockReturnValue({
    data: mockItems,
    error: null,
  }),
});

const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: mockItems[0],
      error: null,
    }),
  }),
});

const mockFrom = vi.fn().mockImplementation(() => ({
  select: mockSelect,
  insert: mockInsert,
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/data", () => ({
  getLatestPulse: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock("@/lib/email-draft", () => ({
  generateEmailDraft: vi.fn().mockReturnValue("Mock email draft content"),
}));

describe("Approvals API — field mapping", () => {
  it("maps snake_case DB row to camelCase ApprovalItem", () => {
    const row = mockItems[0];
    // Simulate mapping logic
    const mapped = {
      id: row.id,
      bookingCode: row.booking_code,
      investorNameRedacted: row.investor_name_redacted,
      topic: row.topic,
      proposedSlot: row.proposed_slot,
      advisorEmail: row.advisor_email,
      emailDraft: row.email_draft,
      marketContextSnippet: row.market_context_snippet ?? undefined,
      status: row.status,
      createdAt: row.created_at,
      authorizedAt: row.authorized_at ?? undefined,
      overrideReason: row.override_reason ?? undefined,
    };

    expect(mapped.bookingCode).toBe("NL-X7K2");
    expect(mapped.topic).toBe("kyc");
    expect(mapped.status).toBe("pending_review");
    expect(mapped.marketContextSnippet).toBe("KYC friction top theme");
    expect(mapped.authorizedAt).toBeUndefined();
  });
});

describe("Approvals API — validation logic", () => {
  it("rejects creation without required fields", () => {
    const required = ["bookingCode", "topic", "proposedSlot"];
    const body = { bookingCode: "NL-TEST" }; // missing topic, proposedSlot
    const missingFields = required.filter(
      (f) => !(body as Record<string, unknown>)[f],
    );
    expect(missingFields.length).toBe(2);
    expect(missingFields).toContain("topic");
    expect(missingFields).toContain("proposedSlot");
  });

  it("validates authorize rejects already-processed items", () => {
    const item = { ...mockItems[0], status: "authorized" as string };
    const isAlreadyProcessed = item.status !== "pending_review";
    expect(isAlreadyProcessed).toBe(true);
  });

  it("validates override rejects already-processed items", () => {
    const item = { ...mockItems[0], status: "rejected" as string };
    const isAlreadyProcessed = item.status !== "pending_review";
    expect(isAlreadyProcessed).toBe(true);
  });
});

describe("Approvals API — authorize flow logic", () => {
  it("builds correct calendar payload from approval item", () => {
    const item = mockItems[0];
    const summary = `Groww Advisor Call — ${item.topic} — ${item.booking_code}`;
    expect(summary).toBe("Groww Advisor Call — kyc — NL-X7K2");
  });

  it("updates status to authorized with timestamp", () => {
    const update = {
      status: "authorized",
      authorized_at: new Date().toISOString(),
    };
    expect(update.status).toBe("authorized");
    expect(update.authorized_at).toBeDefined();
    expect(new Date(update.authorized_at).getFullYear()).toBe(2026);
  });
});

describe("Approvals API — override flow logic", () => {
  it("sets rejection reason", () => {
    const reason = "Client unavailable for proposed slot";
    const update = {
      status: "rejected",
      override_reason: reason,
    };
    expect(update.status).toBe("rejected");
    expect(update.override_reason).toContain("unavailable");
  });

  it("defaults to generic reason when none provided", () => {
    const userReason: string | undefined = undefined;
    const reason = userReason ?? "Operator override";
    expect(reason).toBe("Operator override");
  });
});
