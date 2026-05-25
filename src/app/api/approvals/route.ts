/**
 * /api/approvals — Phase 13
 *
 * GET  → list approval items (all or filtered by status)
 * POST → create a new pending approval item from a confirmed booking
 */

import { NextResponse } from "next/server";
import type { ApprovalItem, TopicType, BookingCode } from "@/types";
import { getSupabaseClient } from "@/lib/supabase";
import { getLatestPulse } from "@/lib/data";
import { generateEmailDraft } from "@/lib/email-draft";

export const runtime = "nodejs";

interface ApprovalDbRow {
  id: string;
  booking_code: string;
  investor_name_redacted: string;
  topic: string;
  proposed_slot: string;
  advisor_email: string;
  email_draft: string;
  market_context_snippet: string | null;
  status: string;
  created_at: string;
  authorized_at: string | null;
  override_reason: string | null;
}

function mapRow(row: ApprovalDbRow): ApprovalItem {
  return {
    id: row.id,
    bookingCode: row.booking_code as BookingCode,
    investorNameRedacted: row.investor_name_redacted,
    topic: row.topic as TopicType,
    proposedSlot: row.proposed_slot,
    advisorEmail: row.advisor_email,
    emailDraft: row.email_draft,
    marketContextSnippet: row.market_context_snippet ?? undefined,
    status: row.status as ApprovalItem["status"],
    createdAt: row.created_at,
    authorizedAt: row.authorized_at ?? undefined,
    overrideReason: row.override_reason ?? undefined,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  const supabase = getSupabaseClient();
  let query = supabase
    .from("approval_queue")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: (data as ApprovalDbRow[]).map(mapRow),
    count: data?.length ?? 0,
  });
}

interface CreateApprovalBody {
  bookingCode: string;
  topic: TopicType;
  proposedSlot: string;
  investorNameRedacted?: string;
  advisorEmail?: string;
  userContext?: string;
}

export async function POST(req: Request) {
  let body: CreateApprovalBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.bookingCode || !body.topic || !body.proposedSlot) {
    return NextResponse.json(
      { error: "bookingCode, topic, and proposedSlot are required" },
      { status: 400 },
    );
  }

  const advisorEmail = body.advisorEmail ?? "advisor@groww.in";
  const investorName = body.investorNameRedacted ?? "[REDACTED]";

  // Fetch market context from latest pulse
  let marketContext: string | null = null;
  try {
    const pulseResp = await getLatestPulse();
    if (pulseResp.data?.summaryText) {
      marketContext = pulseResp.data.summaryText.slice(0, 300);
    }
  } catch {
    // Non-fatal — proceed without market context
  }

  // Generate email draft
  const emailDraft = generateEmailDraft({
    bookingCode: body.bookingCode,
    topic: body.topic,
    proposedSlot: body.proposedSlot,
    investorNameRedacted: investorName,
    advisorEmail,
    userContext: body.userContext,
    marketContextSnippet: marketContext ?? undefined,
  });

  const supabase = getSupabaseClient();
  const payload = {
    booking_code: body.bookingCode,
    investor_name_redacted: investorName,
    topic: body.topic,
    proposed_slot: body.proposedSlot,
    advisor_email: advisorEmail,
    email_draft: emailDraft,
    market_context_snippet: marketContext,
    status: "pending_review",
  };

  const { data, error } = await supabase
    .from("approval_queue")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    item: mapRow(data as ApprovalDbRow),
  }, { status: 201 });
}
