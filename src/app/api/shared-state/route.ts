/**
 * GET/PATCH /api/shared-state — Phase 14
 *
 * Cross-pillar durable state for Zustand hydration + persistence.
 */

import { NextResponse } from "next/server";
import {
  loadSharedAppState,
  saveSharedAppState,
  type SharedStatePayload,
} from "@/lib/shared-state-persistence";

export const runtime = "nodejs";

export async function GET() {
  const state = await loadSharedAppState();
  return NextResponse.json({ state: state ?? {} });
}

export async function PATCH(req: Request) {
  let body: SharedStatePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ok = await saveSharedAppState(body);
  if (!ok) {
    return NextResponse.json({ error: "Failed to persist shared state" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
