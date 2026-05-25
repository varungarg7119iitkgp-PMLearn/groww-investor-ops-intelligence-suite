/**
 * Phase 13 — Approval Bridge Tests
 *
 * Tests the createApprovalItem function that bridges
 * booking confirmation → pending approval item in Supabase.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

/* Mock Supabase */
const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: { id: "test-uuid-001" },
      error: null,
    }),
  }),
});

const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

/* Mock getLatestPulse */
vi.mock("@/lib/data", () => ({
  getLatestPulse: vi.fn().mockResolvedValue({
    data: {
      summaryText:
        "Top theme: KYC friction (142 mentions). SIP failures second at 118.",
    },
    error: null,
  }),
}));

import { createApprovalItem } from "@/lib/approval-bridge";

describe("createApprovalItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "test-uuid-001" },
          error: null,
        }),
      }),
    });
  });

  it("inserts a pending approval item with correct fields", async () => {
    const result = await createApprovalItem({
      bookingCode: "NL-A1B2",
      topic: "sip",
      proposedSlot: "2026-05-28T10:00:00.000Z",
    });

    expect(result).toEqual({ id: "test-uuid-001" });
    expect(mockFrom).toHaveBeenCalledWith("approval_queue");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        booking_code: "NL-A1B2",
        topic: "sip",
        proposed_slot: "2026-05-28T10:00:00.000Z",
        status: "pending_review",
        investor_name_redacted: "[REDACTED]",
        advisor_email: "advisor@groww.in",
      }),
    );
  });

  it("includes market context from latest pulse", async () => {
    await createApprovalItem({
      bookingCode: "NL-C3D4",
      topic: "kyc",
      proposedSlot: "2026-05-29T14:00:00.000Z",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        market_context_snippet: expect.stringContaining("KYC friction"),
      }),
    );
  });

  it("generates an email draft in the payload", async () => {
    await createApprovalItem({
      bookingCode: "NL-E5F6",
      topic: "statements",
      proposedSlot: "2026-06-01T09:00:00.000Z",
      userContext: "Need my capital gains statement for FY26",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email_draft: expect.stringContaining("NL-E5F6"),
      }),
    );
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email_draft: expect.stringContaining("Account Statements"),
      }),
    );
  });

  it("returns null when Supabase insert fails", async () => {
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "RLS violation" },
        }),
      }),
    });

    const result = await createApprovalItem({
      bookingCode: "NL-G7H8",
      topic: "withdrawals",
      proposedSlot: "2026-06-02T11:00:00.000Z",
    });

    expect(result).toBeNull();
  });
});
