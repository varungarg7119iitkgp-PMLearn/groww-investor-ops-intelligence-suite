/**
 * Data Access Layer — Phase 7
 *
 * Typed read-side wrappers around Supabase. Centralizes all read queries
 * the Next.js app makes against the data layer, ensuring:
 *   - Consistent error handling (apiSuccess / apiError envelopes)
 *   - Snake_case row -> camelCase domain mapping (single place)
 *   - Type safety at every call site (returns are typed against the
 *     domain models in src/types/index.ts, not raw Supabase rows)
 *
 * All functions are designed to be called from BOTH server components
 * (preferred) and client components.
 *
 * Traceability: Architecture Phase 7 Task 7 (getFunds, getFundChunks,
 * getFeeScenario, getLatestPulse) + Task 8 (Ticker wiring).
 */

import { getSupabaseClient } from "@/lib/supabase";
import type {
  ApiResponse,
  Fund,
  FundChunk,
  FundCategory,
  ChunkType,
  FeeScenario,
  FeeScenarioType,
  TickerItem,
  WeeklyPulse,
  PulseTheme,
} from "@/types";
import { apiSuccess, apiError } from "@/types";

/* ════════════════════════════════════════════════════════════════════
   ROW <-> DOMAIN MAPPERS
   ════════════════════════════════════════════════════════════════════ */

interface FundDbRow {
  fund_id: string;
  name: string;
  symbol: string;
  category: FundCategory;
  nav: string | number;
  nav_change: string | number;
  nav_change_percent: string | number;
  source_urls: string[] | null;
  keyword_aliases: string[] | null;
  last_updated_at: string;
}

function mapFundRow(row: FundDbRow): Fund {
  return {
    fundId: row.fund_id,
    name: row.name,
    symbol: row.symbol,
    category: row.category,
    nav: Number(row.nav),
    navChange: Number(row.nav_change),
    navChangePercent: Number(row.nav_change_percent),
    sourceUrls: row.source_urls ?? [],
    keywordAliases: row.keyword_aliases ?? [],
    lastUpdatedAt: row.last_updated_at,
  };
}

interface FundChunkDbRow {
  id: string;
  fund_id: string;
  fund_name: string;
  category: FundCategory;
  chunk_type: ChunkType;
  content: string;
  source_urls: string[] | null;
  metadata: Record<string, unknown> | null;
  last_updated_at: string;
}

function mapFundChunkRow(row: FundChunkDbRow): FundChunk {
  return {
    id: row.id,
    fundId: row.fund_id,
    fundName: row.fund_name,
    category: row.category,
    chunkType: row.chunk_type,
    content: row.content,
    sourceUrls: row.source_urls ?? [],
    metadata: row.metadata ?? undefined,
    lastUpdatedAt: row.last_updated_at,
  };
}

interface FeeScenarioDbRow {
  type: FeeScenarioType;
  title: string;
  description: string;
  typical_range: string;
  bullets: string[] | null;
  source_urls: string[] | null;
  last_checked: string;
}

function mapFeeScenarioRow(row: FeeScenarioDbRow): FeeScenario {
  return {
    type: row.type,
    title: row.title,
    description: row.description,
    typicalRange: row.typical_range,
    bullets: row.bullets ?? [],
    sourceUrls: row.source_urls ?? [],
    lastChecked: row.last_checked,
  };
}

interface WeeklyPulseDbRow {
  id: string;
  app_id: string;
  pulse_content: string;
  themes: PulseTheme[] | null;
  quotes: string[] | null;
  action_ideas: string[] | null;
  status: string;
  generated_at: string;
  approved_at: string | null;
}

function mapPulseRow(row: WeeklyPulseDbRow): WeeklyPulse {
  return {
    id: row.id,
    weekStart: row.generated_at,
    summaryText: row.pulse_content,
    themes: row.themes ?? [],
    quotes: row.quotes ?? [],
    actionIdeas: row.action_ideas ?? [],
    wordCount: row.pulse_content.split(/\s+/).filter(Boolean).length,
    reviewCount: 0, // populated downstream by Phase 9 / Pillar B
    status:
      row.status === "approved" || row.status === "authorized"
        ? "authorized"
        : row.status === "pending_review"
          ? "pending_review"
          : row.status === "rejected"
            ? "rejected"
            : "draft",
    createdAt: row.generated_at,
    authorizedAt: row.approved_at ?? undefined,
  };
}

/* ════════════════════════════════════════════════════════════════════
   QUERIES
   ════════════════════════════════════════════════════════════════════ */

/**
 * Returns the entire fund universe (20 funds), ordered by category then symbol.
 * Used by the ticker, by the fund-selector chips, and by RAG.
 */
export async function getFunds(): Promise<ApiResponse<Fund[]>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("funds")
      .select("*")
      .order("category", { ascending: true })
      .order("symbol", { ascending: true });

    if (error) return apiError(error.message);
    if (!data) return apiSuccess<Fund[]>([]);

    return apiSuccess(
      (data as FundDbRow[]).map(mapFundRow),
      { count: data.length },
    );
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Unknown error in getFunds");
  }
}

/**
 * Returns RAG chunks for one fund, optionally filtered by chunk type.
 * Used by the RAG retriever (Phase 8+) and by the chunk inspector UI.
 */
export async function getFundChunks(
  fundId: string,
  chunkType?: ChunkType,
): Promise<ApiResponse<FundChunk[]>> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from("fund_chunks").select("*").eq("fund_id", fundId);
    if (chunkType) query = query.eq("chunk_type", chunkType);

    const { data, error } = await query.order("chunk_type", { ascending: true });

    if (error) return apiError(error.message);
    if (!data) return apiSuccess<FundChunk[]>([]);

    return apiSuccess((data as FundChunkDbRow[]).map(mapFundChunkRow));
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Unknown error in getFundChunks");
  }
}

/**
 * Returns all chunks across all funds, optionally filtered by category and / or chunk_type.
 * Used by the TF-IDF indexer at startup.
 */
export async function getAllChunks(opts?: {
  category?: FundCategory;
  chunkType?: ChunkType;
}): Promise<ApiResponse<FundChunk[]>> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase.from("fund_chunks").select("*");
    if (opts?.category) query = query.eq("category", opts.category);
    if (opts?.chunkType) query = query.eq("chunk_type", opts.chunkType);

    const { data, error } = await query.order("fund_id").order("chunk_type");

    if (error) return apiError(error.message);
    if (!data) return apiSuccess<FundChunk[]>([]);

    return apiSuccess((data as FundChunkDbRow[]).map(mapFundChunkRow));
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Unknown error in getAllChunks");
  }
}

/** Returns one fee scenario by type (expense_ratio / exit_load / tcs / brokerage / account_maintenance). */
export async function getFeeScenario(
  type: FeeScenarioType,
): Promise<ApiResponse<FeeScenario | null>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("fee_scenarios")
      .select("*")
      .eq("type", type)
      .maybeSingle();

    if (error) return apiError(error.message);
    if (!data) return apiSuccess<FeeScenario | null>(null);

    return apiSuccess<FeeScenario | null>(mapFeeScenarioRow(data as FeeScenarioDbRow));
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Unknown error in getFeeScenario");
  }
}

/** Returns all 5 fee scenarios in canonical type order. */
export async function getAllFeeScenarios(): Promise<ApiResponse<FeeScenario[]>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("fee_scenarios")
      .select("*")
      .order("type", { ascending: true });

    if (error) return apiError(error.message);
    if (!data) return apiSuccess<FeeScenario[]>([]);

    return apiSuccess((data as FeeScenarioDbRow[]).map(mapFeeScenarioRow));
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Unknown error in getAllFeeScenarios");
  }
}

/**
 * Returns the latest weekly pulse (most recently generated).
 * Used by the Director Ops PulseBriefing and by the Voice Agent
 * theme-greeting injection (Pillar B).
 */
export async function getLatestPulse(): Promise<ApiResponse<WeeklyPulse | null>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("weekly_pulses")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return apiError(error.message);
    if (!data) return apiSuccess<WeeklyPulse | null>(null);

    return apiSuccess<WeeklyPulse | null>(mapPulseRow(data as WeeklyPulseDbRow));
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Unknown error in getLatestPulse");
  }
}

/**
 * Phase 11 — Pulse → Voice greeting bridge (Pillar B → C).
 * Returns the **top theme label** from the latest weekly_pulse, or
 * `null` if no pulse exists yet. The voice agent injects this into
 * its greeting prompt so the conversation can reference what
 * investors are buzzing about this week.
 */
export async function getLatestPulseTheme(): Promise<ApiResponse<string | null>> {
  try {
    const pulse = await getLatestPulse();
    if (pulse.error || !pulse.data) return apiSuccess<string | null>(null);
    /* WeeklyPulse.themes is sorted by sentiment / count upstream;
     * we trust the order and pick [0]. */
    const top = pulse.data.themes?.[0];
    if (!top) return apiSuccess<string | null>(null);
    const label =
      typeof top === "string"
        ? top
        : (top as { label?: string; name?: string }).label ??
          (top as { label?: string; name?: string }).name ??
          null;
    return apiSuccess<string | null>(label);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Unknown error in getLatestPulseTheme");
  }
}

/**
 * Returns ticker-ready data — 20 fund rows formatted for the MarqueeTicker.
 * Computes `isPositive` from `navChange` and trims to the fields the ticker needs.
 */
export async function getTickerData(): Promise<ApiResponse<TickerItem[]>> {
  const result = await getFunds();
  if (result.error || !result.data) return apiError<TickerItem[]>(result.error ?? "no data");

  const items: TickerItem[] = result.data.map((f) => ({
    fundId: f.fundId,
    symbol: f.symbol,
    name: f.name,
    nav: f.nav,
    navChange: f.navChange,
    navChangePercent: f.navChangePercent,
    category: f.category,
    isPositive: f.navChange >= 0,
  }));

  return apiSuccess(items, { count: items.length });
}
