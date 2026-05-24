/**
 * GET /api/fee-explainer?type=<scenario> — Phase 12
 *
 * Returns one of the 5 pre-seeded fee explainers. Used by the standalone
 * Director-Ops `FeeExplainerCard` (Req 7).
 *
 * Returned shape matches the `FeeExplainer` UI type (Req 7):
 *   { type, bullets[<=6], sources[2 URLs], lastChecked }
 *
 * Fallback (unknown scenario): returns a fixed envelope listing the 5
 * supported types so the UI can render a graceful error.
 */

import { NextResponse } from "next/server";
import type { FeeExplainer, FeeScenarioType } from "@/types";
import { getFeeScenario, getAllFeeScenarios } from "@/lib/data";
import { FEE_EXPLAINER_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

const KNOWN: FeeScenarioType[] = [
  "expense_ratio",
  "exit_load",
  "tcs",
  "brokerage",
  "account_maintenance",
];

function scenarioToExplainer(s: {
  type: FeeScenarioType;
  bullets: string[];
  sourceUrls: string[];
  lastChecked: string;
}): FeeExplainer {
  return {
    type:        s.type,
    bullets:     s.bullets.slice(0, FEE_EXPLAINER_LIMITS.MAX_BULLETS),
    sources:     s.sourceUrls.slice(0, FEE_EXPLAINER_LIMITS.EXACT_SOURCES),
    lastChecked: s.lastChecked,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawType = (searchParams.get("type") ?? "").toLowerCase();

  if (rawType === "" || rawType === "all") {
    const resp = await getAllFeeScenarios();
    if (resp.error || !resp.data) {
      return NextResponse.json({ error: resp.error ?? "no data" }, { status: 500 });
    }
    return NextResponse.json({
      explainers: resp.data.map(scenarioToExplainer),
      knownScenarios: KNOWN,
    });
  }

  if (!KNOWN.includes(rawType as FeeScenarioType)) {
    return NextResponse.json(
      {
        error: `Unknown fee scenario '${rawType}'. Supported: ${KNOWN.join(", ")}`,
        knownScenarios: KNOWN,
      },
      { status: 400 },
    );
  }

  const resp = await getFeeScenario(rawType as FeeScenarioType);
  if (resp.error) {
    return NextResponse.json({ error: resp.error }, { status: 500 });
  }
  if (!resp.data) {
    return NextResponse.json(
      { error: `No data found for scenario '${rawType}'` },
      { status: 404 },
    );
  }
  return NextResponse.json({ explainer: scenarioToExplainer(resp.data) });
}
