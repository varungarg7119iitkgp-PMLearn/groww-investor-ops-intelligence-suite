/**
 * POST /api/approvals/override — Phase 13
 *
 * Rejects a pending approval item with an optional reason.
 *
 * Body: { id: string, reason?: string }
 */

import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

interface OverrideBody {
  id: string;
  reason?: string;
}

export async function POST(req: Request) {
  let body: OverrideBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Verify item exists and is pending
  const { data: item, error: fetchErr } = await supabase
    .from("approval_queue")
    .select("id, status")
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

  const { error: updateErr } = await supabase
    .from("approval_queue")
    .update({
      status: "rejected",
      override_reason: body.reason ?? "Operator override",
    })
    .eq("id", body.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    item: {
      id: body.id,
      status: "rejected",
      overrideReason: body.reason ?? "Operator override",
    },
  });
}
