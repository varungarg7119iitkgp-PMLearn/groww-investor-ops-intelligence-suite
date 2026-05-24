/**
 * Fee Explainer — Phase 8
 *
 * Detects fee-related queries and returns a structured explanation
 * sourced from the `fee_scenarios` Supabase table seeded in Phase 7.
 *
 * Per Requirement 7:
 *   - ≤ 6 bullets per scenario
 *   - Exactly 2 source URLs
 *   - "Last checked" date
 *   - Neutral, facts-only tone (no recommendations)
 *
 * The detector recognizes 5 scenarios:
 *   expense_ratio | exit_load | tcs | brokerage | account_maintenance
 *
 * A single query can trigger multiple scenarios — e.g. "Compare exit
 * load and expense ratio" returns both explainers, which the chat
 * orchestrator can merge into a single response.
 */

import { getFeeScenario } from "@/lib/data";
import type { FeeScenario, FeeScenarioType } from "@/types";

/* ════════════════════════════════════════════════════════════════════
   DETECTION — regex banks per scenario
   ════════════════════════════════════════════════════════════════════ */

const SCENARIO_PATTERNS: Record<FeeScenarioType, RegExp[]> = {
  expense_ratio: [
    /\bexpense\s+ratio(s)?\b/i,
    /\bter\b/i,
    /\btotal\s+expense\b/i,
    /\bmanagement\s+fee/i,
    /\bdirect\s+vs\s+regular\b/i,
    /\bregular\s+vs\s+direct\b/i,
  ],
  exit_load: [
    /\bexit\s+load(s)?\b/i,
    /\bredemption\s+(charge|fee|penalty)/i,
    /\bearly\s+(redemption|withdrawal)/i,
    /\bwhy\s+(am|was|did).+(charge|deduct)/i,
  ],
  tcs: [
    /\btcs\b/i,
    /\btax\s+collected/i,
    /\blrs\b/i,
    /\bforeign\s+remittance/i,
    /\boverseas\s+(investment|fund)/i,
  ],
  brokerage: [
    /\bbrokerage\b/i,
    /\btransaction\s+(charge|fee|cost)s?\b/i,
    /\btrail\s+commission/i,
    /\bdistributor\s+(commission|fee)/i,
  ],
  account_maintenance: [
    /\b(account|folio)\s+(maintenance|charge|amc)/i,
    /\bdemat\s+(amc|charge|fee)/i,
    /\bbsda\b/i,
    /\bsoa\b/i,
  ],
};

/** Returns the scenarios the query matches, in detection-confidence order (most-hits first). */
export function detectFeeScenarios(query: string): FeeScenarioType[] {
  const hits: Array<{ type: FeeScenarioType; count: number }> = [];
  for (const [type, patterns] of Object.entries(SCENARIO_PATTERNS) as [FeeScenarioType, RegExp[]][]) {
    const count = patterns.reduce((n, re) => (re.test(query) ? n + 1 : n), 0);
    if (count > 0) hits.push({ type, count });
  }
  hits.sort((a, b) => b.count - a.count);
  return hits.map((h) => h.type);
}

/** True if the query mentions ANY fee scenario. */
export function isFeeQuery(query: string): boolean {
  return detectFeeScenarios(query).length > 0;
}

/* ════════════════════════════════════════════════════════════════════
   RETRIEVAL + FORMATTING
   ════════════════════════════════════════════════════════════════════ */

export interface FeeExplainerResult {
  scenarios: ExplainerBlock[];
  /** Combined Markdown — useful for direct insertion into Gemini context */
  asMarkdown: string;
}

export interface ExplainerBlock {
  type: FeeScenarioType;
  title: string;
  description: string;
  typicalRange: string;
  bullets: string[];
  sourceUrls: string[];
  lastChecked: string;
}

/**
 * Resolve the user's query into 1..N fee-scenario explainer blocks.
 * Honors the ≤6-bullet / exactly-2-source-URLs invariant by truncating
 * if the seeded data ever drifts.
 */
export async function explainFees(query: string): Promise<FeeExplainerResult> {
  const detected = detectFeeScenarios(query);
  const blocks: ExplainerBlock[] = [];

  for (const type of detected) {
    const res = await getFeeScenario(type);
    if (res.error || !res.data) continue;
    blocks.push(toBlock(res.data));
  }

  return { scenarios: blocks, asMarkdown: blocksToMarkdown(blocks) };
}

/** Convenience: fetch a single explainer by type (used in tests + golden eval set). */
export async function explainScenario(type: FeeScenarioType): Promise<ExplainerBlock | null> {
  const res = await getFeeScenario(type);
  if (res.error || !res.data) return null;
  return toBlock(res.data);
}

/* ════════════════════════════════════════════════════════════════════
   PRIVATE HELPERS
   ════════════════════════════════════════════════════════════════════ */

function toBlock(s: FeeScenario): ExplainerBlock {
  return {
    type: s.type,
    title: s.title,
    description: s.description,
    typicalRange: s.typicalRange,
    /* Enforce ≤6 bullets at runtime even if data drifts */
    bullets: s.bullets.slice(0, 6),
    /* Enforce exactly 2 source URLs */
    sourceUrls: s.sourceUrls.slice(0, 2),
    lastChecked: s.lastChecked,
  };
}

function blocksToMarkdown(blocks: ExplainerBlock[]): string {
  if (blocks.length === 0) return "";
  return blocks
    .map((b) => {
      const lines = [
        `### ${b.title}`,
        b.description,
        `**Typical range:** ${b.typicalRange}`,
        ...b.bullets.map((bullet) => `- ${bullet}`),
        `**Sources:** ${b.sourceUrls.join(" · ")}`,
        `**Last checked:** ${b.lastChecked}`,
      ];
      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}
