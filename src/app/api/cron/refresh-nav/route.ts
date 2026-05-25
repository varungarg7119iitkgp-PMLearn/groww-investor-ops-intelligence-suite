/**
 * POST /api/cron/refresh-nav — Phase 7 (Scheduling & Data Refresh)
 *
 * Fetches the latest NAV values for all 20 indexed mutual funds from the
 * AMFI (Association of Mutual Funds in India) public daily NAV feed and
 * upserts them into the Supabase `funds` table.
 *
 * AMFI feed: https://www.amfiindia.com/spages/NAVAll.txt
 *   Format per line: SchemeCode;ISIN1;ISIN2;SchemeName;NAV;Date
 *   Updated every trading day after market close (~6 PM IST).
 *
 * Security:
 *   - Requires header `Authorization: Bearer <CRON_SECRET>` (env var).
 *   - GitHub Actions workflow sends this header on schedule.
 *
 * Called by:
 *   - .github/workflows/daily-nav-refresh.yml  (daily at 19:00 IST / 13:30 UTC)
 *   - Director Ops "Refresh NAV" button (manual trigger)
 *
 * Returns:
 *   200 → { updated: number, skipped: number, results: MatchResult[], latencyMs }
 *   401 → Unauthorized (missing/wrong CRON_SECRET)
 *   502 → AMFI feed fetch failed
 */

import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

/* ════════════════════════════════════════════════════════════════════
   AMFI PATTERN MAP
   Maps each fund_id → regex that uniquely identifies the "Direct Growth"
   line for that fund in the AMFI NAV file.
   ════════════════════════════════════════════════════════════════════ */

interface FundPattern {
  fundId: string;
  pattern: RegExp;
}

const FUND_PATTERNS: FundPattern[] = [
  /* ── Commodity ── */
  { fundId: "hdfc-silv",  pattern: /HDFC Silver ETF Fund of Fund.*Direct Plan/i },
  { fundId: "axis-silv",  pattern: /Axis Silver Fund of Fund.*Direct Plan.*Growth/i },
  { fundId: "icici-silv", pattern: /ICICI Prudential Silver ETF FOF.*Direct.*Growth/i },
  { fundId: "nip-silv",   pattern: /Nippon India Silver ETF FOF.*Direct.*Growth/i },
  { fundId: "absl-silv",  pattern: /Aditya Birla Sun Life Silver ETF FOF.*Direct Growth/i },

  /* ── Debt ── */
  { fundId: "dsp-cr",    pattern: /DSP Credit Risk Fund.*Direct Plan.*Growth/i },
  { fundId: "hdfc-arb",  pattern: /HDFC Income Plus Arbitrage Active FOF.*Direct Plan/i },
  { fundId: "absl-cr",   pattern: /Aditya Birla Sun Life Credit Risk Fund.*Direct Plan.*Growth/i },
  { fundId: "hsbc-cr",   pattern: /HSBC Credit Risk Fund.*Direct Growth/i },
  { fundId: "absl-med",  pattern: /Aditya Birla Sun Life Medium Term Plan.*Growth.*Direct Plan/i },

  /* ── Debt (5th fund: SBI Medium Duration — seeded as sbi-med) ── */
  { fundId: "sbi-med",    pattern: /SBI MEDIUM DURATION FUND.*DIRECT.*GROWTH/i },

  /* ── Hybrid ── */
  { fundId: "sbi-child",  pattern: /SBI Children's Fund.*Investment Plan.*Direct.*Growth/i },
  { fundId: "icici-ret",  pattern: /ICICI Prudential Retirement Fund.*Hybrid Aggressive.*Direct.*Growth/i },
  { fundId: "nip-multi",  pattern: /Nippon India Multi Asset Allocation Fund.*Direct.*Growth/i },
  { fundId: "hdfc-hyb",   pattern: /HDFC Hybrid Equity Fund.*Growth.*Direct Plan/i },

  /* ── Equity ── */
  { fundId: "mot-bse",  pattern: /Motilal Oswal BSE Enhanced Value Index Fund.*Direct/i },
  { fundId: "sbi-psu",  pattern: /SBI PSU Fund.*DIRECT.*GROWTH/i },
  { fundId: "inv-psu",  pattern: /Invesco India PSU Equity Fund.*Direct.*Growth/i },
  { fundId: "absl-psu", pattern: /Aditya Birla Sun Life PSU Equity Fund.*Direct Plan.*Growth/i },
  { fundId: "icici-psu",pattern: /ICICI Prudential PSU Equity Fund.*Direct.*Growth/i },
];

const AMFI_URL = "https://www.amfiindia.com/spages/NAVAll.txt";

/* ── Types ── */
interface MatchResult {
  fundId: string;
  status: "updated" | "skipped" | "not_found";
  newNav?: number;
  navChange?: number;
  navChangePct?: number;
  amfiLine?: string;
  error?: string;
}

/* ════════════════════════════════════════════════════════════════════
   HANDLER
   ════════════════════════════════════════════════════════════════════ */

export async function POST(req: Request) {
  const t0 = Date.now();

  /* ── Auth guard ── */
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") ?? "";
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ── 1. Fetch AMFI NAV feed ── */
  let amfiText: string;
  try {
    const res = await fetch(AMFI_URL, {
      headers: { "User-Agent": "Groww-Investor-Ops-Intelligence-Suite/1.0" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `AMFI feed returned ${res.status}` },
        { status: 502 },
      );
    }
    amfiText = await res.text();
  } catch (err) {
    return NextResponse.json(
      { error: `AMFI fetch failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }

  const lines = amfiText.split("\n").map((l) => l.trim()).filter(Boolean);

  /* ── 2. Fetch current NAVs from Supabase (to compute change %) ── */
  const supabase = getSupabaseClient();
  const { data: currentFunds, error: fetchErr } = await supabase
    .from("funds")
    .select("fund_id, nav")
    .in("fund_id", FUND_PATTERNS.map((f) => f.fundId));

  if (fetchErr) {
    return NextResponse.json(
      { error: `Supabase fetch failed: ${fetchErr.message}` },
      { status: 500 },
    );
  }

  const currentNavMap = new Map<string, number>(
    (currentFunds ?? []).map((r) => [r.fund_id, Number(r.nav)]),
  );

  /* ── 3. Match each fund against AMFI lines ── */
  const results: MatchResult[] = [];
  const upsertRows: {
    fund_id: string;
    nav: number;
    nav_change: number;
    nav_change_percent: number;
    last_updated_at: string;
  }[] = [];

  const now = new Date().toISOString();

  for (const { fundId, pattern } of FUND_PATTERNS) {
    /* Find the first matching line */
    const line = lines.find((l) => pattern.test(l));
    if (!line) {
      results.push({ fundId, status: "not_found" });
      continue;
    }

    /* Parse: SchemeCode;ISIN1;ISIN2;SchemeName;NAV;Date */
    const parts = line.split(";");
    const navStr = parts[4]?.trim();
    if (!navStr || isNaN(Number(navStr))) {
      results.push({ fundId, status: "not_found", error: `Unparseable NAV in line: ${line}` });
      continue;
    }

    const newNav = Math.round(Number(navStr) * 10000) / 10000;
    const prevNav = currentNavMap.get(fundId) ?? newNav;
    const navChange = Math.round((newNav - prevNav) * 10000) / 10000;
    const navChangePct = prevNav > 0
      ? Math.round((navChange / prevNav) * 10000) / 100
      : 0;

    upsertRows.push({
      fund_id: fundId,
      nav: newNav,
      nav_change: navChange,
      nav_change_percent: navChangePct,
      last_updated_at: now,
    });

    results.push({
      fundId,
      status: "updated",
      newNav,
      navChange,
      navChangePct,
      amfiLine: line.slice(0, 80),
    });
  }

  /* ── 4. Update via SECURITY DEFINER RPC (bypasses RLS without service key) ── */
  let updated = 0;
  const skipped = results.filter((r) => r.status !== "updated").length;

  if (upsertRows.length > 0) {
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "refresh_fund_nav_batch",
      { rows: upsertRows },
    );

    if (rpcErr) {
      return NextResponse.json(
        { error: `Supabase RPC failed: ${rpcErr.message}`, results },
        { status: 500 },
      );
    }
    updated = (rpcData as { updated?: number })?.updated ?? upsertRows.length;
  }

  return NextResponse.json({
    updated,
    skipped,
    total: FUND_PATTERNS.length,
    results,
    latencyMs: Date.now() - t0,
    refreshedAt: now,
  });
}

/* Allow GET for a quick health check (no auth required, returns status only) */
export async function GET() {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("funds")
    .select("fund_id, nav, last_updated_at")
    .order("last_updated_at", { ascending: false })
    .limit(1);

  const lastRun = data?.[0]?.last_updated_at ?? "never";
  const staleDays = Math.floor(
    (Date.now() - new Date(lastRun).getTime()) / 86_400_000,
  );

  return NextResponse.json({
    status: staleDays > 1 ? "stale" : "fresh",
    lastRefreshedAt: lastRun,
    staleDays,
    fundCount: 20,
  });
}
