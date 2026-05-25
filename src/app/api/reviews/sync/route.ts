/**
 * POST /api/reviews/sync — fetch live reviews from Play Store / App Store
 * Ported from Groww-Support-PM-Pulsator Phase 2.
 *
 * Body: { platform: "android" | "ios", count?: number }
 */

import { NextResponse } from "next/server";
import { syncPlatform, syncAll } from "@/lib/sync-engine";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { platform?: string; count?: number; syncAll?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const count = Math.min(body.count ?? 200, 500);

  try {
    if (body.syncAll) {
      const results = await syncAll(count);
      return NextResponse.json({ success: true, results });
    }

    const platform = body.platform as "android" | "ios" | undefined;
    if (!platform || !["android", "ios"].includes(platform)) {
      return NextResponse.json(
        { error: "platform must be 'android' or 'ios', or set syncAll: true" },
        { status: 400 },
      );
    }

    const result = await syncPlatform(platform, count);
    return NextResponse.json({
      success: result.status === "success",
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[reviews/sync]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
