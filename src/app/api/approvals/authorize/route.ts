/**
 * POST /api/approvals/authorize — Phase 13
 *
 * Authorizes a pending approval item:
 *   1. Creates Google Calendar event
 *   2. Updates status to 'authorized' in Supabase
 *   3. Returns the updated item + calendar event link
 *
 * Body: { id: string, emailDraft?: string }
 * The optional emailDraft allows the advisor to submit an edited version.
 *
 * Retry: If calendar creation fails, responds with `calendarFailed: true`
 * and the client can retry (up to 3 per M2 pattern).
 */

import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { createCalendarEvent, buildCalendarPayload } from "@/tools/calendar";
import type { ApprovalItem, TopicType, BookingCode, BookingSummary } from "@/types";

export const runtime = "nodejs";

interface AuthorizeBody {
  id: string;
  emailDraft?: string;
}

export async function POST(req: Request) {
  let body: AuthorizeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Fetch the approval item
  const { data: item, error: fetchErr } = await supabase
    .from("approval_queue")
    .select("*")
    .eq("id", body.id)
    .single();

  if (fetchErr || !item) {
    return NextResponse.json(
      { error: fetchErr?.message ?? "Item not found" },
      { status: 404 },
    );
  }

  if (item.status !== "pending_review") {
    return NextResponse.json(
      { error: `Item is already ${item.status}` },
      { status: 409 },
    );
  }

  // Build calendar payload from the approval item
  const bookingSummary: BookingSummary = {
    bookingCode: item.booking_code as BookingCode,
    topic: item.topic as TopicType,
    proposedSlot: item.proposed_slot,
    investorNameRedacted: item.investor_name_redacted,
    advisorEmail: item.advisor_email,
    contextNotes: body.emailDraft ?? item.email_draft,
    status: "pending_review",
  };

  const calPayload = buildCalendarPayload(bookingSummary, {
    attendeeEmail: item.advisor_email,
  });

  // Create calendar event
  const calResult = await createCalendarEvent(calPayload);

  if (calResult.status === "tentative") {
    // Calendar creation failed but returned gracefully
    return NextResponse.json(
      {
        error: "Calendar event creation failed. You can retry.",
        calendarFailed: true,
        eventId: calResult.eventId,
      },
      { status: 502 },
    );
  }

  // Update the item in Supabase
  const updatePayload: Record<string, unknown> = {
    status: "authorized",
    authorized_at: new Date().toISOString(),
  };
  if (body.emailDraft) {
    updatePayload.email_draft = body.emailDraft;
  }

  const { error: updateErr } = await supabase
    .from("approval_queue")
    .update(updatePayload)
    .eq("id", body.id);

  if (updateErr) {
    return NextResponse.json(
      { error: `Calendar created but DB update failed: ${updateErr.message}` },
      { status: 500 },
    );
  }

  const updatedItem: Partial<ApprovalItem> = {
    id: body.id,
    status: "authorized",
    authorizedAt: updatePayload.authorized_at as string,
  };

  return NextResponse.json({
    item: updatedItem,
    calendarEvent: {
      eventId: calResult.eventId,
      htmlLink: calResult.htmlLink,
      status: calResult.status,
    },
  });
}
