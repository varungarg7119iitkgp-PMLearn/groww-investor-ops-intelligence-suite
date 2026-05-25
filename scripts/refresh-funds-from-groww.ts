/**
 * scripts/refresh-funds-from-groww.ts
 *
 * Daily refresh pipeline that mirrors the architecture of the reference
 * project (varungarg7119iitkgp-PMLearn/mutual-fund-rag-chatbot):
 *
 *   1. Read the 20 fund slugs + Groww URLs from Supabase `funds` table.
 *   2. For each fund, GET the Groww page and parse the embedded
 *      `__NEXT_DATA__` JSON (`props.pageProps.mfServerSideData`).
 *      All numeric fields, holdings, returns, fees and risk we need are
 *      already in this server-rendered blob — no Playwright / JS execution
 *      needed.
 *   3. Build five RAG chunk types per fund (overview, performance, fees_loads,
 *      risk, news) — same chunk_type vocabulary the existing /api/chat RAG
 *      route already filters by.
 *   4. Atomically replace the chunks for that fund via
 *      `public.replace_fund_chunks(...)` (SECURITY DEFINER RPC).
 *   5. Update the funds table NAV/change/source_urls/isin via
 *      `public.refresh_fund_nav_batch(...)` (also SECURITY DEFINER).
 *
 * Runs in two contexts:
 *   - GitHub Actions (`.github/workflows/daily-refresh-funds.yml`) — daily cron
 *   - Manually:  `npx tsx scripts/refresh-funds-from-groww.ts`
 *
 * Required env vars (any of: `.env.local` for local; GitHub Action secrets
 * for CI):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * No service-role key is needed because all writes go through
 * SECURITY DEFINER functions exposed only to selected RLS roles.
 */

import { createClient } from "@supabase/supabase-js";

/* ── Constants ─────────────────────────────────────────────────────── */

const USER_AGENT =
  "Mozilla/5.0 (compatible; Groww-Capstone-Refresh/1.0; +https://github.com/varungarg7119iitkgp-PMLearn/groww-investor-ops-intelligence-suite)";
const REQUEST_TIMEOUT_MS = 25_000;
const RETRY_BACKOFF_MS = [0, 1500, 4000];
const REQUEST_DELAY_MS = 800;
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "[refresh-funds] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ── Types: shape of mfServerSideData we care about ───────────────── */

interface GrowwHolding {
  company_name?: string;
  corpus_per?: number;
}
interface GrowwStat {
  type?: string;
  stat_1y?: number | string;
  stat_3y?: number | string;
  stat_5y?: number | string;
  stat_all?: number | string;
}
interface GrowwReturnStats {
  risk?: string;
  standard_deviation?: number | string;
  sharpe_ratio?: number | string;
  alpha?: number | string;
  beta?: number | string;
}
interface GrowwNewsItem {
  title?: string;
  url?: string;
  pub_date?: string;
}
interface MfServerSideData {
  isin?: string;
  scheme_name?: string;
  category?: string;
  fund_house?: string;
  amc_info?: { name?: string };
  benchmark?: string;
  benchmark_name?: string;
  scheme_type?: string;
  nav?: number;
  nav_date?: string;
  expense_ratio?: number | string;
  exit_load?: string;
  min_sip_investment?: number;
  min_investment_amount?: number;
  category_info?: { tax_impact?: string };
  portfolio_turnover?: number | string;
  stats?: GrowwStat[];
  return_stats?: GrowwReturnStats[];
  holdings?: GrowwHolding[];
  fund_news?: GrowwNewsItem[];
  fund_manager_details?: Array<{
    person_name?: string;
    experience?: string;
    funds_managed?: Array<{ scheme_name?: string }>;
  }>;
}

interface FundRow {
  fund_id: string;
  name: string;
  category: string;
  groww_url: string | null;
  source_urls: unknown;
  keyword_aliases: unknown;
  nav: number | string | null;
}

interface RagChunk {
  chunk_type: "overview" | "performance" | "fees_loads" | "risk" | "news";
  content: string;
  source_urls: string[];
  metadata: Record<string, unknown>;
}

/* ── HTTP helpers ─────────────────────────────────────────────────── */

async function fetchWithRetry(url: string): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i < RETRY_BACKOFF_MS.length; i++) {
    if (RETRY_BACKOFF_MS[i] > 0) {
      await sleep(RETRY_BACKOFF_MS[i]);
    }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-IN,en;q=0.9",
        },
        signal: ctrl.signal,
        redirect: "follow",
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      return await res.text();
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `fetch failed after ${RETRY_BACKOFF_MS.length} attempts: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ── HTML → mfServerSideData ──────────────────────────────────────── */

const NEXT_DATA_RE =
  /<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/i;

function extractNextData(html: string): MfServerSideData | null {
  const m = html.match(NEXT_DATA_RE);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]) as {
      props?: { pageProps?: { mfServerSideData?: MfServerSideData } };
    };
    return parsed.props?.pageProps?.mfServerSideData ?? null;
  } catch {
    return null;
  }
}

/* ── Number/format helpers ─────────────────────────────────────────── */

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmt(v: number | null, digits = 2): string {
  return v === null ? "—" : v.toFixed(digits);
}

function isoDate(s?: string): string {
  if (!s) return "";
  // Groww serves "25-May-2026"; normalise to "2026-05-25"
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return s;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const dd = m[1].padStart(2, "0");
  const mm = months[m[2]];
  return mm ? `${m[3]}-${mm}-${dd}` : s;
}

/* ── Chunk builders (mirror reference project's chunker.py) ───────── */

function buildOverviewChunk(
  fund: FundRow,
  d: MfServerSideData,
  url: string,
): RagChunk {
  const amc = d.amc_info?.name ?? d.fund_house ?? "—";
  const risk =
    d.return_stats?.[0]?.risk ?? "Not available";
  const nav = num(d.nav);
  const navDate = isoDate(d.nav_date);
  const text =
    `${d.scheme_name ?? fund.name} is a ${d.category ?? fund.category} mutual fund ` +
    `from ${amc} with a risk level rated as ${risk}. ` +
    (nav !== null
      ? `Latest NAV as of ${navDate || "today"} is ₹${fmt(nav, 4)}.`
      : "Latest NAV unavailable.") +
    (d.benchmark_name
      ? ` The fund tracks ${d.benchmark_name} as its benchmark.`
      : "");
  return {
    chunk_type: "overview",
    content: text,
    source_urls: [url],
    metadata: {
      fund_id: fund.fund_id,
      isin: d.isin ?? null,
      amc_name: amc,
      benchmark_name: d.benchmark_name ?? null,
      riskometer: risk,
      nav: { value: nav, date: navDate || d.nav_date || null },
    },
  };
}

function buildPerformanceChunk(
  fund: FundRow,
  d: MfServerSideData,
  url: string,
): RagChunk {
  const fundReturn = d.stats?.find((s) => s.type === "FUND_RETURN") ?? d.stats?.[0];
  const catReturn = d.stats?.find((s) => s.type === "CATEGORY_AVG_RETURN");
  const r1y = num(fundReturn?.stat_1y);
  const r3y = num(fundReturn?.stat_3y);
  const r5y = num(fundReturn?.stat_5y);
  const rSI = num(fundReturn?.stat_all);
  const c1y = num(catReturn?.stat_1y);
  const c3y = num(catReturn?.stat_3y);
  const c5y = num(catReturn?.stat_5y);
  const text =
    `${d.scheme_name ?? fund.name} has delivered the following annualised returns: ` +
    `1Y ${fmt(r1y)}%, 3Y ${fmt(r3y)}%, 5Y ${fmt(r5y)}%, ` +
    `since inception ${fmt(rSI)}%. ` +
    `Category averages: 1Y ${fmt(c1y)}%, 3Y ${fmt(c3y)}%, 5Y ${fmt(c5y)}%. ` +
    `All numbers are direct-plan growth, sourced from Groww (${isoDate(d.nav_date)}).`;
  return {
    chunk_type: "performance",
    content: text,
    source_urls: [url],
    metadata: {
      fund_id: fund.fund_id,
      returns: {
        fund:     { y1: r1y, y3: r3y, y5: r5y, since_inception: rSI },
        category: { y1: c1y, y3: c3y, y5: c5y },
      },
    },
  };
}

function buildFeesChunk(
  fund: FundRow,
  d: MfServerSideData,
  url: string,
): RagChunk {
  const er = num(d.expense_ratio);
  const exitLoad = d.exit_load ?? "Refer Groww for exit-load schedule";
  const minSip = num(d.min_sip_investment);
  const minLump = num(d.min_investment_amount);
  const tax = d.category_info?.tax_impact ?? "Refer SEBI guidance for taxation";
  const text =
    `${d.scheme_name ?? fund.name} fees & loads: ` +
    `expense ratio ${fmt(er)}%, ` +
    `minimum SIP ₹${minSip ?? "—"}, minimum lumpsum ₹${minLump ?? "—"}. ` +
    `Exit load: ${exitLoad}. ` +
    `Tax treatment: ${tax}.`;
  return {
    chunk_type: "fees_loads",
    content: text,
    source_urls: [url],
    metadata: {
      fund_id: fund.fund_id,
      expense_ratio: er,
      exit_load: exitLoad,
      min_sip: minSip,
      min_lumpsum: minLump,
      taxation: tax,
    },
  };
}

function buildRiskChunk(
  fund: FundRow,
  d: MfServerSideData,
  url: string,
): RagChunk {
  const rs = d.return_stats?.[0] ?? {};
  const sd = num(rs.standard_deviation);
  const sharpe = num(rs.sharpe_ratio);
  const alpha = num(rs.alpha);
  const beta = num(rs.beta);
  const text =
    `${d.scheme_name ?? fund.name} risk profile: ` +
    `riskometer ${rs.risk ?? "—"}, ` +
    `standard deviation ${fmt(sd)}%, Sharpe ratio ${fmt(sharpe)}, ` +
    `alpha ${fmt(alpha)}, beta ${fmt(beta)}.`;
  return {
    chunk_type: "risk",
    content: text,
    source_urls: [url],
    metadata: {
      fund_id: fund.fund_id,
      riskometer: rs.risk ?? null,
      standard_deviation: sd,
      sharpe_ratio: sharpe,
      alpha,
      beta,
    },
  };
}

function buildNewsChunk(
  fund: FundRow,
  d: MfServerSideData,
  url: string,
): RagChunk {
  const items = (d.fund_news ?? []).slice(0, 5);
  if (items.length === 0) {
    return {
      chunk_type: "news",
      content:
        `No recent fund-specific news for ${d.scheme_name ?? fund.name}. ` +
        `For latest updates, see the Groww fund page.`,
      source_urls: [url],
      metadata: { fund_id: fund.fund_id, news_items: [] },
    };
  }
  const lines = items.map(
    (n, i) =>
      `${i + 1}. ${n.title ?? "Untitled"} (${n.pub_date ?? "—"})`,
  );
  const sources = items
    .map((n) => n.url)
    .filter((u): u is string => Boolean(u));
  return {
    chunk_type: "news",
    content:
      `Recent news for ${d.scheme_name ?? fund.name}:\n${lines.join("\n")}`,
    source_urls: [url, ...sources].slice(0, 6),
    metadata: { fund_id: fund.fund_id, news_items: items },
  };
}

function buildAllChunks(
  fund: FundRow,
  d: MfServerSideData,
  url: string,
): RagChunk[] {
  return [
    buildOverviewChunk(fund, d, url),
    buildPerformanceChunk(fund, d, url),
    buildFeesChunk(fund, d, url),
    buildRiskChunk(fund, d, url),
    buildNewsChunk(fund, d, url),
  ];
}

/* ── Per-fund refresh ──────────────────────────────────────────────── */

interface RefreshResult {
  fundId: string;
  status: "ok" | "skip" | "error";
  isin?: string;
  newNav?: number | null;
  navChange?: number | null;
  navChangePct?: number | null;
  chunksReplaced?: number;
  error?: string;
}

async function refreshOne(fund: FundRow): Promise<RefreshResult> {
  if (!fund.groww_url) {
    return { fundId: fund.fund_id, status: "skip", error: "no groww_url" };
  }
  try {
    const html = await fetchWithRetry(fund.groww_url);
    const data = extractNextData(html);
    if (!data) {
      return {
        fundId: fund.fund_id,
        status: "error",
        error: "__NEXT_DATA__ not found",
      };
    }

    const newNav = num(data.nav);
    const prevNav = num(fund.nav);
    const navChange =
      newNav !== null && prevNav !== null
        ? Math.round((newNav - prevNav) * 10000) / 10000
        : 0;
    const navChangePct =
      newNav !== null && prevNav !== null && prevNav > 0
        ? Math.round((navChange / prevNav) * 10000) / 100
        : 0;

    /* 1) Replace chunks for this fund */
    const chunks = buildAllChunks(fund, data, fund.groww_url);
    const { error: rpcErr } = await supabase.rpc("replace_fund_chunks", {
      p_fund_id: fund.fund_id,
      p_fund_name: data.scheme_name ?? fund.name,
      p_category: (data.category ?? fund.category).toLowerCase(),
      p_chunks: chunks,
    });
    if (rpcErr) {
      return {
        fundId: fund.fund_id,
        status: "error",
        error: `replace_fund_chunks: ${rpcErr.message}`,
      };
    }

    return {
      fundId: fund.fund_id,
      status: "ok",
      isin: data.isin,
      newNav,
      navChange,
      navChangePct,
      chunksReplaced: chunks.length,
    };
  } catch (err) {
    return {
      fundId: fund.fund_id,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/* ── Main orchestrator ────────────────────────────────────────────── */

async function main() {
  const t0 = Date.now();
  console.log("[refresh-funds] Loading 20 funds from Supabase...");
  const { data: funds, error } = await supabase
    .from("funds")
    .select("fund_id, name, category, groww_url, source_urls, keyword_aliases, nav")
    .order("category, fund_id");

  if (error) {
    console.error("[refresh-funds] Supabase fetch error:", error.message);
    process.exit(3);
  }
  if (!funds || funds.length === 0) {
    console.error("[refresh-funds] No funds found");
    process.exit(4);
  }
  console.log(`[refresh-funds] Loaded ${funds.length} funds`);

  /* Sequential to be polite to Groww (avoid rate limiting) */
  const results: RefreshResult[] = [];
  for (let i = 0; i < funds.length; i++) {
    const f = funds[i] as FundRow;
    const r = await refreshOne(f);
    results.push(r);
    const pad = String(i + 1).padStart(2, " ");
    if (r.status === "ok") {
      console.log(
        `[${pad}/20] ✓ ${r.fundId.padEnd(11)} ` +
          `NAV=${r.newNav?.toFixed(4) ?? "—"} ` +
          `Δ=${r.navChange?.toFixed(4) ?? "—"} (${r.navChangePct?.toFixed(2) ?? "—"}%) ` +
          `chunks=${r.chunksReplaced} ISIN=${r.isin ?? "—"}`,
      );
    } else {
      console.log(
        `[${pad}/20] ✗ ${r.fundId.padEnd(11)} ${r.status.toUpperCase()}: ${r.error ?? ""}`,
      );
    }
    if (i < funds.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  /* Batch update NAV/change/source_urls/isin for all successful funds */
  const successRows = results
    .filter((r) => r.status === "ok" && r.newNav !== null && r.newNav !== undefined)
    .map((r) => {
      const fund = funds.find((f) => f.fund_id === r.fundId)!;
      return {
        fund_id: r.fundId,
        nav: r.newNav,
        nav_change: r.navChange ?? 0,
        nav_change_percent: r.navChangePct ?? 0,
        last_updated_at: new Date().toISOString(),
        isin: r.isin ?? null,
        source_urls: [fund.groww_url],
      };
    });

  if (successRows.length > 0) {
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "refresh_fund_nav_batch",
      { rows: successRows },
    );
    if (rpcErr) {
      console.error(`[refresh-funds] NAV batch RPC failed: ${rpcErr.message}`);
    } else {
      const updated = (rpcData as { updated?: number })?.updated ?? 0;
      console.log(`[refresh-funds] NAV batch RPC: updated ${updated} rows`);
    }
  }

  /* Summary */
  const ok = results.filter((r) => r.status === "ok").length;
  const skip = results.filter((r) => r.status === "skip").length;
  const err = results.filter((r) => r.status === "error").length;
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `\n[refresh-funds] DONE in ${elapsed}s — ok=${ok} skip=${skip} error=${err}`,
  );
  console.log(JSON.stringify({ ok, skip, err, elapsedSec: elapsed }));

  if (err > 0) process.exit(1);
}

main().catch((e) => {
  console.error("[refresh-funds] Fatal:", e);
  process.exit(99);
});
