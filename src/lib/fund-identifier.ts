/**
 * Fund Identifier — Phase 8
 *
 * Maps free-text user queries to the 20-fund universe using the
 * `keyword_aliases` column seeded in Phase 7. Returns the set of fund
 * ids the query is "about" — the RAG retriever uses this as an
 * allowlist filter so we only score chunks belonging to those funds.
 *
 * Matching strategy (in order of preference):
 *   1. Exact alias match (case-insensitive whole-phrase)
 *   2. Substring match on alias (e.g. "hdfc silver" finds "HDFC Silver ETF FoF")
 *   3. Token overlap with fund name (≥ 2 token overlap)
 *
 * Returns an empty array when no fund is identified, in which case the
 * retriever falls back to category-wide / corpus-wide scoring.
 */

import { getFunds } from "@/lib/data";
import type { Fund, FundCategory } from "@/types";

const CATEGORY_TERMS: Record<FundCategory, string[]> = {
  debt:       ["debt fund", "debt funds", "credit risk", "credit-risk", "fixed income"],
  commodity:  ["commodity fund", "commodity funds", "silver", "silver etf", "gold", "gold etf"],
  hybrid:     ["hybrid fund", "hybrid funds", "multi asset", "multi-asset", "balanced fund"],
  equity:     ["equity fund", "equity funds", "psu equity", "psu fund", "stock fund"],
};

/* ════════════════════════════════════════════════════════════════════
   FUND CACHE — avoid hitting Supabase on every call
   ════════════════════════════════════════════════════════════════════ */

let _fundsCache: Fund[] | null = null;
let _fundsPromise: Promise<Fund[]> | null = null;

async function loadFunds(): Promise<Fund[]> {
  if (_fundsCache) return _fundsCache;
  if (_fundsPromise) return _fundsPromise;

  _fundsPromise = (async () => {
    const res = await getFunds();
    if (res.error || !res.data) {
      throw new Error(`[fund-identifier] Cannot load funds: ${res.error ?? "no data"}`);
    }
    _fundsCache = res.data;
    return _fundsCache;
  })();

  try {
    return await _fundsPromise;
  } finally {
    _fundsPromise = null;
  }
}

/* ════════════════════════════════════════════════════════════════════
   PUBLIC API
   ════════════════════════════════════════════════════════════════════ */

export interface IdentificationResult {
  fundIds: string[];
  matchedFunds: Fund[];
  /** Categories implied by the query (e.g. "all hybrid funds") */
  categories: FundCategory[];
  /** Confidence: number of matches found */
  confidence: "exact" | "substring" | "category" | "none";
  /** Phrases from the query that triggered each match */
  matchedAliases: string[];
}

/** Identify the fund(s) a query refers to. */
export async function identifyFunds(query: string): Promise<IdentificationResult> {
  if (!query || query.trim().length === 0) {
    return { fundIds: [], matchedFunds: [], categories: [], confidence: "none", matchedAliases: [] };
  }

  const lower = query.toLowerCase();
  const funds = await loadFunds();

  /* ── Pass 1: alias substring matching (per fund) ── */
  const matched = new Map<string, { fund: Fund; alias: string; isExact: boolean }>();

  for (const fund of funds) {
    /* Pre-build the alias list: include name + symbol + all aliases */
    const candidates = new Set<string>([
      fund.name.toLowerCase(),
      fund.symbol.toLowerCase(),
      ...fund.keywordAliases.map((a) => a.toLowerCase()),
    ]);

    for (const alias of candidates) {
      if (alias.length < 3) continue; // ignore 1-2 char aliases
      if (lower.includes(alias)) {
        const isExact = lower === alias || new RegExp(`\\b${escapeRegex(alias)}\\b`).test(lower);
        const prev = matched.get(fund.fundId);
        if (!prev || (isExact && !prev.isExact)) {
          matched.set(fund.fundId, { fund, alias, isExact });
        }
      }
    }
  }

  if (matched.size > 0) {
    const list = [...matched.values()];
    const anyExact = list.some((m) => m.isExact);
    return {
      fundIds: list.map((m) => m.fund.fundId),
      matchedFunds: list.map((m) => m.fund),
      categories: dedupe(list.map((m) => m.fund.category)),
      confidence: anyExact ? "exact" : "substring",
      matchedAliases: list.map((m) => m.alias),
    };
  }

  /* ── Pass 2: category-only matching ── */
  const categories: FundCategory[] = [];
  const matchedAliases: string[] = [];
  for (const [cat, terms] of Object.entries(CATEGORY_TERMS) as [FundCategory, string[]][]) {
    for (const term of terms) {
      if (lower.includes(term)) {
        if (!categories.includes(cat)) categories.push(cat);
        matchedAliases.push(term);
        break; // one alias is enough for this category
      }
    }
  }

  if (categories.length > 0) {
    const matchedFunds = funds.filter((f) => categories.includes(f.category));
    return {
      fundIds: matchedFunds.map((f) => f.fundId),
      matchedFunds,
      categories,
      confidence: "category",
      matchedAliases,
    };
  }

  /* ── Pass 3: nothing matched ── */
  return { fundIds: [], matchedFunds: [], categories: [], confidence: "none", matchedAliases: [] };
}

/** Test helper: reset the fund cache. */
export function __resetFundCache(): void {
  _fundsCache = null;
  _fundsPromise = null;
}

/* ── helpers ─────────────────────────────────────────────────── */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
