/**
 * GET /api/reviews/stats — live review aggregates for Director Ops
 *
 * Query params:
 *   platform  — ALL | ANDROID | IOS
 *   timeRange — TODAY | YESTERDAY | LAST_7 | LAST_15 | LAST_30
 */

import { NextResponse } from "next/server";
import { getReviewStats } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = (searchParams.get("platform") ?? "ALL").toUpperCase() as
    | "ALL"
    | "ANDROID"
    | "IOS";
  const timeRange = searchParams.get("timeRange") ?? "LAST_7";

  const resp = await getReviewStats({ platform, timeRange });
  if (resp.error) {
    return NextResponse.json({ error: resp.error }, { status: 500 });
  }
  return NextResponse.json({ stats: resp.data });
}
