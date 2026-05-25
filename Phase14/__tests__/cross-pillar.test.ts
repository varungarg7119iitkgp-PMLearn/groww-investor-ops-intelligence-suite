/**
 * Phase 14 — Cross-Pillar Integration Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isBookingStatusQuery,
  buildBookingStatusAnswer,
} from "@/lib/booking-status-query";
import { mapApprovalStatusToBookingStatus } from "@/lib/shared-state-persistence";
import { resetStoreForTests, useUIStore } from "@/lib/store";
import { getPromptForState } from "@/lib/state-machine";

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({ data: [], error: null }),
          }),
        }),
        order: () => ({
          limit: () => ({
            data: [
              {
                booking_code: "NL-X7K2",
                topic: "kyc",
                proposed_slot: "2026-05-27T10:30:00.000Z",
                status: "pending_review",
                override_reason: null,
              },
            ],
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

describe("Phase 14 — booking status query", () => {
  it("detects booking status questions", () => {
    expect(isBookingStatusQuery("What's the status of my booking?")).toBe(true);
    expect(isBookingStatusQuery("Status of NL-X7K2")).toBe(true);
    expect(isBookingStatusQuery("What is the expense ratio of HDFC Silver?")).toBe(false);
  });

  it("returns grounded answer from client bookingStatuses cache", async () => {
    const answer = await buildBookingStatusAnswer("What's my booking status?", {
      "NL-X7K2": "pending",
    });
    expect(answer.summary).toContain("NL-X7K2");
    expect(answer.bullets[0]).toContain("NL-X7K2");
    expect(answer.bullets.length).toBe(6);
  });

  it("maps approval queue status to bookingStatuses vocabulary", () => {
    expect(mapApprovalStatusToBookingStatus("pending_review")).toBe("pending");
    expect(mapApprovalStatusToBookingStatus("authorized")).toBe("approved");
    expect(mapApprovalStatusToBookingStatus("rejected")).toBe("rejected");
  });
});

describe("Phase 14 — theme → voice greeting", () => {
  it("injects top theme into greeting prompt", () => {
    const prompt = getPromptForState("greeting", { topTheme: "Login Issues" });
    expect(prompt).toContain("Login Issues");
  });

  it("works without theme (empty state)", () => {
    const prompt = getPromptForState("greeting", {});
    expect(prompt).not.toContain('most curious about "');
  });
});

describe("Phase 14 — Zustand cross-pillar state", () => {
  beforeEach(() => {
    resetStoreForTests();
  });

  it("preserves chat messages across mode switch simulation", () => {
    useUIStore.getState().addChatMessage({
      id: "m1",
      role: "user",
      content: "Hello from investor mode",
      timestamp: new Date().toISOString(),
    });
    useUIStore.getState().setActiveMode("director-ops");
    useUIStore.getState().setActiveMode("investor-terminal");
    expect(useUIStore.getState().chatMessages.length).toBe(1);
  });

  it("syncs bookingStatuses on HITL authorize", () => {
    useUIStore.getState().setHitlItems([
      {
        id: "a1",
        bookingCode: "NL-A1B2",
        investorNameRedacted: "[REDACTED]",
        topic: "sip",
        proposedSlot: "2026-05-28T10:00:00.000Z",
        advisorEmail: "advisor@groww.in",
        emailDraft: "draft",
        status: "pending_review",
        createdAt: new Date().toISOString(),
      },
    ]);
    useUIStore.getState().updateHitlStatus("a1", "authorized");
    expect(useUIStore.getState().bookingStatuses["NL-A1B2"]).toBe("approved");
  });

  it("tracks voice session pause on mode switch", () => {
    useUIStore.getState().setIsVoiceActive(true);
    useUIStore.getState().setVoiceSessionPaused(true, true);
    expect(useUIStore.getState().voiceSessionPaused).toBe(true);
    expect(useUIStore.getState().voiceWasActiveBeforePause).toBe(true);
  });

  it("hydrates shared state from payload", () => {
    useUIStore.getState().hydrateSharedState({
      topTheme: "KYC Friction",
      bookingStatuses: { "NL-T1S2": "pending" },
    });
    expect(useUIStore.getState().topTheme).toBe("KYC Friction");
    expect(useUIStore.getState().bookingStatuses["NL-T1S2"]).toBe("pending");
  });
});
