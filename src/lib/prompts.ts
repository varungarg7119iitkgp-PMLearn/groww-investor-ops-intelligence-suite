/**
 * Prompts — Phase 8
 *
 * Central registry of all LLM prompts used in the Capstone. Each prompt
 * is a pure function that returns a string — no side effects, no I/O —
 * so we can unit-test the prompt body easily.
 *
 * Phase 8 currently exports:
 *   - `buildSmartSyncPrompt({ query, chunks, feeBlock, feeFlag })`
 *     The grounded-RAG prompt that Gemini receives. Forces JSON output
 *     with strict structure (6 bullets + citations).
 *   - `buildLLMJudgePrompt({ query, answer, retrievedSources })`
 *     The eval-time judge prompt used by `scripts/eval-rag.ts` to score
 *     faithfulness + relevance.
 *
 * Conventions:
 *   - All prompts are written for `gemini-1.5-flash` (the default).
 *   - We always include the literal phrase "do not invent" to fight
 *     hallucination.
 *   - For JSON output we set `responseMimeType: 'application/json'`
 *     (see gemini.ts) — the prompt also reiterates the schema verbosely
 *     because Gemini's JSON-mode adherence improves with redundancy.
 */

import type { FundChunk } from "@/types";

/* ════════════════════════════════════════════════════════════════════
   SMART-SYNC KB — primary RAG prompt
   ════════════════════════════════════════════════════════════════════ */

export interface SmartSyncPromptArgs {
  query: string;
  chunks: FundChunk[];
  /** Optional pre-formatted fee-explainer markdown block (empty string if not a fee query). */
  feeBlock: string;
  /** True when the query was classified as a fee question. */
  feeFlag: boolean;
  /** ISO-8601 timestamp to include in the "Last updated from sources" footer. */
  nowIso: string;
}

export function buildSmartSyncPrompt(args: SmartSyncPromptArgs): string {
  const { query, chunks, feeBlock, feeFlag, nowIso } = args;

  const numberedSources = chunks
    .map((c, i) => {
      return `[${i + 1}] fund_id=${c.fundId} | fund=${c.fundName} | section=${c.chunkType}\nURL: ${(c.sourceUrls[0] ?? "n/a")}\n${c.content}`;
    })
    .join("\n\n");

  const feeContext = feeFlag && feeBlock ? `\n\n## FEE_CONTEXT_BLOCK (use as authoritative for fee-related claims)\n${feeBlock}\n` : "";

  return [
    "You are **Smart_Sync**, a strictly-grounded knowledge assistant for Groww's 20-fund universe.",
    "",
    "## NON-NEGOTIABLE RULES",
    "1. Answer ONLY using the SOURCES block below. Do NOT invent fund names, NAVs, percentages, return numbers, or fees that are not explicitly in the sources.",
    "2. NEVER give buy / sell / hold / invest / SIP / lumpsum recommendations. This is a no advice assistant — facts only.",
    "3. NEVER project future returns. NEVER predict prices. NEVER offer 'risk-adjusted' opinions.",
    "4. If the user's question is about a fund or topic NOT present in the sources, set `inScope=false` and explain that you only cover the 20 funds in the configured universe.",
    "5. Output MUST be valid JSON — see schema below.",
    "",
    "## OUTPUT SCHEMA (return EXACTLY this JSON shape)",
    "{",
    `  "summary": string,                 // 1-sentence overview, max 25 words`,
    `  "bullets": string[6],              // EXACTLY 6 concise bullets, ≤ 30 words each`,
    `  "citations": [{                    // ≥ 1 citation; cite each source you used`,
    `    "fundId": string,`,
    `    "fundName": string,`,
    `    "source": string,                // exact URL from the source block`,
    `    "snippet": string,               // <=50-word verbatim or near-verbatim excerpt`,
    `    "relevanceScore": number         // 0-1 self-assessed`,
    `  }],`,
    `  "inScope": boolean,                // true if the query is answerable from sources`,
    `  "complianceFlag": "ok" | "out_of_scope" | "advice_block" | "pii_block"`,
    "}",
    "",
    "## STYLE",
    "- Bullets must be tight: facts first, no filler. Use rupee notation (₹) when quoting NAVs / amounts from sources.",
    "- Use percentages as quoted in sources — DO NOT round.",
    "- Each bullet should pack a single discrete fact (NAV, expense ratio, return %, risk class, exit-load slab, etc.).",
    "- If you mention a fee scenario from the FEE_CONTEXT_BLOCK, attribute it explicitly (e.g. 'Per AMFI guidelines, …').",
    "- The 6-bullet rule is hard. Pad with related grounded facts from the source block rather than dropping below 6. Trim to exactly 6 if more would be possible.",
    "",
    `## USER QUERY`,
    query,
    "",
    "## SOURCES (the ONLY corpus you may draw factual claims from)",
    numberedSources || "(no sources retrieved — set inScope=false)",
    feeContext,
    "",
    `## TIMESTAMP`,
    `Generated at ${nowIso}. The chat UI surfaces this as "Last updated from sources".`,
    "",
    "Return the JSON now.",
  ].join("\n");
}

/* ════════════════════════════════════════════════════════════════════
   OUT-OF-SCOPE FALLBACK — used when no fund / no chunk matches
   ════════════════════════════════════════════════════════════════════ */

export function buildOutOfScopeResponse(query: string, nowIso: string): {
  summary: string;
  bullets: string[];
  citations: never[];
  inScope: false;
  complianceFlag: "out_of_scope";
  lastUpdated: string;
} {
  return {
    summary: "This query falls outside the Smart_Sync coverage.",
    bullets: [
      "Smart_Sync only answers about the 20 mutual funds configured in this terminal.",
      "Supported categories: 5 debt, 5 commodity, 5 hybrid, 5 equity (total 20 funds).",
      `Your query did not match any indexed fund or fee scenario: "${query.slice(0, 80)}${query.length > 80 ? "…" : ""}".`,
      "Try naming a specific fund (e.g. 'HDFC Silver ETF FoF') or topic (expense ratio, exit load, TCS).",
      "For broader market data, refer to the AMFI / SEBI portals directly.",
      "This response carries no financial advice — purely a coverage notice.",
    ],
    citations: [],
    inScope: false,
    complianceFlag: "out_of_scope",
    lastUpdated: nowIso,
  };
}

/* ════════════════════════════════════════════════════════════════════
   ADVICE-BLOCK FALLBACK — used when compliance guard fires
   ════════════════════════════════════════════════════════════════════ */

export function buildAdviceBlockResponse(query: string, nowIso: string): {
  summary: string;
  bullets: string[];
  citations: never[];
  inScope: false;
  complianceFlag: "advice_block";
  lastUpdated: string;
} {
  return {
    summary: "Smart_Sync does not provide investment advice.",
    bullets: [
      "Your question appears to request a recommendation (buy / sell / hold / invest).",
      "Smart_Sync is strictly facts-only and cannot endorse specific actions.",
      "I can share NAV, expense ratio, returns, fees, and risk profile for any of the 20 funds.",
      "I can also explain fee scenarios (expense ratio, exit load, TCS, brokerage, AMC).",
      "For personalized recommendations, please consult a SEBI-registered investment advisor.",
      `Query summary (truncated): "${query.slice(0, 80)}${query.length > 80 ? "…" : ""}".`,
    ],
    citations: [],
    inScope: false,
    complianceFlag: "advice_block",
    lastUpdated: nowIso,
  };
}

/* ════════════════════════════════════════════════════════════════════
   LLM-JUDGE — eval-time scoring prompt
   ════════════════════════════════════════════════════════════════════ */

export interface JudgePromptArgs {
  query: string;
  answer: string;          // the assistant's full bullet response, serialized
  retrievedSources: string; // numbered source list (same format as Smart-Sync)
}

export function buildLLMJudgePrompt(args: JudgePromptArgs): string {
  return [
    "You are an objective evaluator of RAG outputs.",
    "",
    "Score the assistant's ANSWER on two metrics, each 0.0–1.0:",
    "  - faithfulness: Are ALL factual claims in the ANSWER traceable to the SOURCES? 1.0 = perfectly grounded; 0.0 = full hallucination.",
    "  - relevance:    Are the RETRIEVED SOURCES pertinent to the QUERY? 1.0 = directly on-topic; 0.0 = unrelated.",
    "",
    "Return JSON only, exact shape:",
    `{ "faithfulness": number, "relevance": number, "comments": string }`,
    "Comments ≤ 40 words; cite the worst-offending bullet if faithfulness < 1.",
    "",
    "## QUERY",
    args.query,
    "",
    "## ANSWER",
    args.answer,
    "",
    "## SOURCES",
    args.retrievedSources,
    "",
    "Return the JSON now.",
  ].join("\n");
}

/* ════════════════════════════════════════════════════════════════════
   VOICE AGENT — Phase 10 system prompts
   ════════════════════════════════════════════════════════════════════ */

import type { ConversationStep, TopicType } from "@/types";
import { getPromptForState, type StatePromptContext } from "@/lib/state-machine";

export interface VoiceSystemPromptArgs {
  step: ConversationStep;
  /** Top-theme from latest Weekly Pulse — injected into greeting */
  topTheme?: string;
  /** Investor name placeholder (already redacted upstream) */
  investorNameRedacted?: string;
  /** Topic if booking sub-flow is active */
  topic?: TopicType;
  /** PII-scrubbed context if booking sub-flow is active */
  contextNotes?: string;
  /** Proposed slots (max 2) read aloud by the agent */
  proposedSlots?: string[];
  /** Booking code if generated */
  bookingCode?: string;
}

/**
 * The single voice system prompt assembled per turn. Contains the
 * global "voice agent rules" PLUS the per-step prompt slice from the
 * state machine. The Phase 11 chat() loop sends this as the system
 * instruction every turn (state-driven, stateless on the LLM side).
 */
export function buildVoiceSystemPrompt(args: VoiceSystemPromptArgs): string {
  const stateCtx: StatePromptContext = {
    topTheme: args.topTheme,
    investorNameRedacted: args.investorNameRedacted,
    topic: args.topic,
    contextNotes: args.contextNotes,
    proposedSlots: args.proposedSlots,
    bookingCode: args.bookingCode,
  };
  const stateSlice = getPromptForState(args.step, stateCtx);

  return [
    "You are the Groww Voice Agent — an AI voice concierge that answers fund-information questions AND books advisor appointments.",
    "",
    "## VOICE-MODE GLOBAL RULES",
    "1. ALWAYS acknowledge the user briefly before answering (e.g. 'Got it.' / 'Sure.' / 'Noted.').",
    "2. ONE question per turn. Never stack 2+ questions in a single utterance.",
    "3. <= 2 SENTENCES per turn -- TTS pacing is precious.",
    "4. If the user gives information you already need (implicit answer), DO NOT re-ask. Move on.",
    "5. 3-STRIKE PATTERN: if user response is unclear:",
    "   - Strike 1: shorter rephrase",
    "   - Strike 2: even narrower prompt",
    "   - Strike 3: offer text-mode fallback ('Tap the keyboard icon to switch to text.')",
    "6. CLOSING PATTERN: at session end say the booking code (if any) and pause briefly: 'Your booking code is NL-XXXX. Anything else?'",
    "",
    "## COMPLIANCE -- NON-NEGOTIABLE (Req 10)",
    "- Never recommend a fund, predict a return, or make a buy/sell call.",
    "- Never echo PII (PAN, Aadhaar, phone, email, account number). If user shares, gently redirect.",
    "- Cite the source URL or fund-name inline when answering FAQ.",
    "- Every greeting includes: 'This is informational and not investment advice.'",
    "",
    "## TOOLS (Gemini Function Calling)",
    "You have three tools -- use them when the conversation needs them:",
    " - get_preparation_docs(topic, query?)   -- retrieve canonical prep docs for one of 5 topics.",
    " - generate_booking_code_and_notes(...)  -- create the booking artifact when topic+context+slot are captured.",
    " - create_calendar_event(payload)        -- only AFTER explicit user confirmation.",
    "",
    "## CURRENT STATE INSTRUCTIONS",
    `Step = ${args.step}`,
    stateSlice,
  ].join("\n");
}

/**
 * Convenience export -- used by the chat-loop dispatcher to fetch just
 * the per-step instruction (without the global rules header). Helpful
 * for short re-prompts on rephrase / 3-strike escalation.
 */
export { getPromptForState as getVoicePromptForState };
