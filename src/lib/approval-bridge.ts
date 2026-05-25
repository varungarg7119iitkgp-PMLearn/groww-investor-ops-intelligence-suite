/**
 * Approval Bridge — Phase 13
 *
 * Server-side helper that creates a pending approval item in Supabase
 * when a booking is confirmed in the Investor Terminal voice flow.
 *
 * This bridges Pillar B (Voice Agent) → Pillar C (Director Ops HITL Queue).
 */

import { getSupabaseClient } from "@/lib/supabase";
import { getLatestPulse } from "@/lib/data";
import { generateEmailDraft } from "@/lib/email-draft";
import { saveSharedAppState, loadSharedAppState } from "@/lib/shared-state-persistence";
import type { TopicType, BookingSummary } from "@/types";

export interface CreateApprovalInput {
  bookingCode: string;
  topic: string;
  proposedSlot: string;
  investorNameRedacted?: string;
  advisorEmail?: string;
  userContext?: string;
}

/**
 * Creates a pending approval item in the `approval_queue` table.
 * Non-blocking — callers should `.catch()` to avoid crashing the voice loop.
 */
export async function createApprovalItem(input: CreateApprovalInput): Promise<{ id: string } | null> {
  const advisorEmail = input.advisorEmail ?? "advisor@groww.in";
  const investorName = input.investorNameRedacted ?? "[REDACTED]";

  let marketContext: string | null = null;
  try {
    const pulseResp = await getLatestPulse();
    if (pulseResp.data?.summaryText) {
      marketContext = pulseResp.data.summaryText.slice(0, 300);
    }
  } catch {
    // proceed without context
  }

  const emailDraft = generateEmailDraft({
    bookingCode: input.bookingCode,
    topic: input.topic as TopicType,
    proposedSlot: input.proposedSlot,
    investorNameRedacted: investorName,
    advisorEmail,
    userContext: input.userContext,
    marketContextSnippet: marketContext ?? undefined,
  });

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("approval_queue")
    .insert({
      booking_code: input.bookingCode,
      investor_name_redacted: investorName,
      topic: input.topic,
      proposed_slot: input.proposedSlot,
      advisor_email: advisorEmail,
      email_draft: emailDraft,
      market_context_snippet: marketContext,
      status: "pending_review",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[approval-bridge] Insert failed:", error.message);
    return null;
  }

  /* Phase 14 — persist booking to shared_app_state (merge) */
  const existing = await loadSharedAppState();
  const summary: BookingSummary = {
    bookingCode: input.bookingCode as BookingSummary["bookingCode"],
    investorNameRedacted: investorName,
    topic: input.topic as TopicType,
    proposedSlot: input.proposedSlot,
    advisorEmail,
    status: "pending_review",
    contextNotes: input.userContext ?? "",
  };
  const mergedCodes = [
    ...(existing?.bookingCodes ?? []).filter((c) => c.bookingCode !== input.bookingCode),
    summary,
  ];
  saveSharedAppState({
    bookingCodes: mergedCodes,
    bookingStatuses: {
      ...(existing?.bookingStatuses ?? {}),
      [input.bookingCode]: "pending",
    },
    marketContext: marketContext ?? undefined,
  }).catch(() => { /* non-blocking */ });

  return { id: data.id };
}
