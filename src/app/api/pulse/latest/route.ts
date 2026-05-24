/**
 * GET /api/pulse/latest — Phase 12
 *
 * Returns the most-recent weekly pulse for the dashboard. Hydrates the
 * `PulseBriefing` component on mount.
 */

import { NextResponse } from "next/server";
import { getLatestPulse } from "@/lib/data";

export const runtime = "nodejs";

export async function GET() {
  const resp = await getLatestPulse();
  if (resp.error) {
    return NextResponse.json({ error: resp.error }, { status: 500 });
  }
  return NextResponse.json({ pulse: resp.data });
}
