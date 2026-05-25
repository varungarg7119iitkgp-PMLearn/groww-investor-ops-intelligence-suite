/**
 * GET /api/reviews/sync-status — last sync timestamps + review totals
 */

import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { GROWW_APP_ID } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let supabase;
    try {
      supabase = getSupabaseAdminClient();
    } catch {
      return NextResponse.json({
        configured: false,
        totalReviews: 0,
        lastAndroidSync: null,
        lastIOSSync: null,
        recentLogs: [],
      });
    }

    const { data: app } = await supabase
      .from("apps")
      .select("id, last_android_sync, last_ios_sync")
      .eq("id", GROWW_APP_ID)
      .maybeSingle();

    const { count: totalReviews } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("app_id", GROWW_APP_ID);

    const { data: recentLogs } = await supabase
      .from("sync_logs")
      .select("*")
      .eq("app_id", GROWW_APP_ID)
      .order("started_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      configured: !!app,
      appId: app?.id ?? GROWW_APP_ID,
      lastAndroidSync: app?.last_android_sync ?? null,
      lastIOSSync: app?.last_ios_sync ?? null,
      totalReviews: totalReviews ?? 0,
      recentLogs: recentLogs ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
