/**
 * Shared State Persistence — Phase 14
 *
 * Durable cross-pillar state in Supabase `shared_app_state`.
 * Bridges Zustand (in-memory) with PostgreSQL for reload durability.
 */

import { getSupabaseClient } from "@/lib/supabase";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { GROWW_APP_ID } from "@/lib/constants";
import type {
  BookingSummary,
  ConversationState,
  WeeklyPulse,
} from "@/types";

export interface SharedAppStateRow {
  app_id: string;
  top_theme: string | null;
  market_context: string | null;
  booking_codes: BookingSummary[];
  booking_statuses: Record<string, "pending" | "approved" | "rejected">;
  pulse_snapshot: WeeklyPulse | null;
  conversation_snapshot: ConversationState | null;
  updated_at: string;
}

export interface SharedStatePayload {
  topTheme?: string | null;
  marketContext?: string | null;
  bookingCodes?: BookingSummary[];
  bookingStatuses?: Record<string, "pending" | "approved" | "rejected">;
  pulseData?: WeeklyPulse | null;
  conversationState?: ConversationState | null;
}

function getWriteClient() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return getSupabaseClient();
  }
}

export async function loadSharedAppState(): Promise<SharedStatePayload | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("shared_app_state")
      .select("*")
      .eq("app_id", GROWW_APP_ID)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as SharedAppStateRow;
    return {
      topTheme: row.top_theme,
      marketContext: row.market_context,
      bookingCodes: row.booking_codes ?? [],
      bookingStatuses: row.booking_statuses ?? {},
      pulseData: row.pulse_snapshot,
      conversationState: row.conversation_snapshot,
    };
  } catch {
    return null;
  }
}

export async function saveSharedAppState(patch: SharedStatePayload): Promise<boolean> {
  try {
    const supabase = getWriteClient();
    const payload: Record<string, unknown> = {
      app_id: GROWW_APP_ID,
      updated_at: new Date().toISOString(),
    };

    if (patch.topTheme !== undefined) payload.top_theme = patch.topTheme;
    if (patch.marketContext !== undefined) payload.market_context = patch.marketContext;
    if (patch.bookingCodes !== undefined) payload.booking_codes = patch.bookingCodes;
    if (patch.bookingStatuses !== undefined) payload.booking_statuses = patch.bookingStatuses;
    if (patch.pulseData !== undefined) payload.pulse_snapshot = patch.pulseData;
    if (patch.conversationState !== undefined) {
      payload.conversation_snapshot = patch.conversationState;
    }

    const { error } = await supabase
      .from("shared_app_state")
      .upsert(payload, { onConflict: "app_id" });

    return !error;
  } catch {
    return false;
  }
}

/** Map approval_queue DB status → bookingStatuses vocabulary */
export function mapApprovalStatusToBookingStatus(
  status: string,
): "pending" | "approved" | "rejected" {
  if (status === "authorized" || status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}
