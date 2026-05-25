/**
 * POST /api/chat — Phase 8
 *
 * Smart-Sync KB orchestrator. Receives a free-text user query and
 * returns a strictly-grounded 6-bullet answer with citations.
 *
 * Pipeline:
 *   1. Parse + validate body
 *   2. Compliance INPUT guard (no-advice / PII / out-of-scope)
 *   3. Identify funds via keyword aliases → fund_ids filter
 *   4. Retrieve top-k chunks via TF-IDF
 *   5. If fee query → fetch fee-explainer blocks
 *   6. Build Smart-Sync prompt → Gemini → parse JSON
 *   7. Compliance OUTPUT guard (defense-in-depth)
 *   8. Return ChatResponse envelope
 *
 * Response envelope (consumed by `ChatTerminal`):
 *   {
 *     answer: { summary, bullets[6], citations[], complianceFlag },
 *     meta:   { lastUpdated, retrievedSources, latencyMs, model,
 *               feeExplainerInvoked, fundsIdentified, complianceFlag }
 *   }
 */

import { NextResponse } from "next/server";
import type { Citation } from "@/types";

import {
  runInputGuard,
  runOutputGuard,
  redactPII,
  getComplianceResponse,
} from "@/lib/compliance";
import { identifyFunds } from "@/lib/fund-identifier";
import { retrieveTopK } from "@/tools/rag-retriever";
import { explainFees, isFeeQuery } from "@/tools/fee-explainer";
import { generateContent, parseJson } from "@/lib/gemini";
import {
  buildSmartSyncPrompt,
  buildOutOfScopeResponse,
  buildAdviceBlockResponse,
} from "@/lib/prompts";
import {
  isBookingStatusQuery,
  buildBookingStatusAnswer,
} from "@/lib/booking-status-query";

/* ────────── Types ────────── */

export interface ChatRequestBody {
  query: string;
  /** Reserved for future use (multi-turn). Ignored in Phase 8. */
  history?: Array<{ role: string; content: string }>;
  /** Phase 14 — client-side booking status cache for cross-pillar queries */
  bookingStatuses?: Record<string, "pending" | "approved" | "rejected">;
}

export interface ChatAnswer {
  summary: string;
  bullets: string[];
  citations: Citation[];
  inScope: boolean;
  complianceFlag: "ok" | "out_of_scope" | "advice_block" | "pii_block";
}

export interface ChatMeta {
  lastUpdated: string;
  retrievedSources: number;
  latencyMs: number;
  model: string;
  feeExplainerInvoked: boolean;
  fundsIdentified: string[];
}

export interface ChatResponse {
  answer: ChatAnswer;
  meta: ChatMeta;
}

/* ────────── Shape returned by Gemini (raw JSON) ────────── */

interface RawGeminiAnswer {
  summary?: string;
  bullets?: string[];
  citations?: Array<{
    fundId?: string;
    fundName?: string;
    source?: string;
    snippet?: string;
    relevanceScore?: number;
  }>;
  inScope?: boolean;
  complianceFlag?: string;
}

/* ────────── Handler ────────── */

export async function POST(req: Request) {
  const started = Date.now();
  const nowIso = new Date().toISOString();

  /* 1. Parse + validate */
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const query = String(body?.query ?? "").trim();
  if (!query) {
    return NextResponse.json(
      { error: "`query` is required and must be a non-empty string" },
      { status: 400 },
    );
  }
  if (query.length > 1000) {
    return NextResponse.json(
      { error: "`query` exceeds 1000 character limit" },
      { status: 400 },
    );
  }

  /* 2b. Phase 14 — Booking status cross-pillar query */
  if (isBookingStatusQuery(query)) {
    const answer = await buildBookingStatusAnswer(query, body.bookingStatuses);
    return NextResponse.json(
      buildResponseEnvelope({
        answer,
        meta: {
          lastUpdated: nowIso,
          retrievedSources: 0,
          latencyMs: Date.now() - started,
          model: "booking-status",
          feeExplainerInvoked: false,
          fundsIdentified: [],
        },
      }),
    );
  }

  /* 2. Compliance INPUT guard */
  const inputGuard = runInputGuard(query);
  if (!inputGuard.pass) {
    if (inputGuard.type === "advice") {
      const resp = buildAdviceBlockResponse(query, nowIso);
      return NextResponse.json(
        buildResponseEnvelope({
          answer: { ...resp, citations: [] as Citation[] },
          meta: {
            lastUpdated: nowIso,
            retrievedSources: 0,
            latencyMs: Date.now() - started,
            model: "guardrail",
            feeExplainerInvoked: false,
            fundsIdentified: [],
          },
        }),
      );
    }
    if (inputGuard.type === "out_of_scope") {
      const resp = buildOutOfScopeResponse(query, nowIso);
      return NextResponse.json(
        buildResponseEnvelope({
          answer: { ...resp, citations: [] as Citation[] },
          meta: {
            lastUpdated: nowIso,
            retrievedSources: 0,
            latencyMs: Date.now() - started,
            model: "guardrail",
            feeExplainerInvoked: false,
            fundsIdentified: [],
          },
        }),
      );
    }
    /* PII path — Phase 9: canonical deflection, no PII echoed back */
    return NextResponse.json(
      buildResponseEnvelope({
        answer: {
          summary: getComplianceResponse("pii"),
          bullets: [
            "Personal information (PAN, Aadhaar, phone, email, account number, balance) is never accepted in chat.",
            "Please rephrase your question without sharing such details.",
            "Conversations are logged for compliance and audit; PII is redacted before persistence.",
            "Smart_Sync answers only fact-based questions about the 20 funds in scope.",
            "Examples: 'What is the expense ratio of HDFC Silver ETF?'",
            "For account-specific queries, contact Groww support directly.",
          ],
          citations: [] as Citation[],
          inScope: false,
          complianceFlag: "pii_block" as const,
        },
        meta: {
          lastUpdated: nowIso,
          retrievedSources: 0,
          latencyMs: Date.now() - started,
          model: "guardrail",
          feeExplainerInvoked: false,
          fundsIdentified: [],
        },
      }),
    );
  }

  /* 3. Identify funds */
  let identification;
  try {
    identification = await identifyFunds(query);
  } catch (err) {
    return errorResponse(err, "fund-identifier", started, nowIso);
  }

  /* 4. Retrieve top-k chunks (use fund allowlist when identified) */
  let retrieved;
  try {
    retrieved = await retrieveTopK(query, {
      k: 8,
      fundIds: identification.fundIds.length > 0 ? identification.fundIds : undefined,
    });
    /* Fallback: if fund-filtered retrieval is empty, try corpus-wide */
    if (retrieved.length === 0 && identification.fundIds.length > 0) {
      retrieved = await retrieveTopK(query, { k: 8 });
    }
  } catch (err) {
    return errorResponse(err, "rag-retriever", started, nowIso);
  }

  /* 5. Fee Explainer (parallel to retrieval is overkill at this scale) */
  const feeFlag = isFeeQuery(query);
  let feeBlock = "";
  if (feeFlag) {
    try {
      const fees = await explainFees(query);
      feeBlock = fees.asMarkdown;
    } catch (err) {
      /* Fee explainer is non-critical — degrade gracefully */
      console.warn("[/api/chat] Fee explainer failed:", err);
      feeBlock = "";
    }
  }

  /* If nothing retrieved AND no fee block, fall back to out-of-scope */
  if (retrieved.length === 0 && !feeBlock) {
    const resp = buildOutOfScopeResponse(query, nowIso);
    return NextResponse.json(
      buildResponseEnvelope({
        answer: { ...resp, citations: [] as Citation[] },
        meta: {
          lastUpdated: nowIso,
          retrievedSources: 0,
          latencyMs: Date.now() - started,
          model: "no-retrieval",
          feeExplainerInvoked: feeFlag,
          fundsIdentified: identification.fundIds,
        },
      }),
    );
  }

  /* 6. Build prompt + call Gemini */
  const prompt = buildSmartSyncPrompt({
    query,
    chunks: retrieved.map((r) => r.chunk),
    feeBlock,
    feeFlag,
    nowIso,
  });

  let geminiText = "";
  let geminiModel = "gemini-1.5-flash";
  let geminiLatency = 0;
  try {
    const r = await generateContent(prompt, { json: true, temperature: 0.3 });
    geminiText = r.text;
    geminiModel = r.model;
    geminiLatency = r.latencyMs;
  } catch (err) {
    return errorResponse(err, "gemini", started, nowIso);
  }

  /* Parse JSON */
  let rawAnswer: RawGeminiAnswer;
  try {
    rawAnswer = parseJson<RawGeminiAnswer>(geminiText);
  } catch (err) {
    return errorResponse(err, "gemini-json", started, nowIso);
  }

  /* 7. Normalize + clamp to invariants */
  const answer = normalizeAnswer(rawAnswer, retrieved.map((r) => r.chunk));

  /* 7b. PHASE 9 — final-output PII scrub (defense-in-depth).
   * If Gemini ever echoes PII from the retrieved context, redact it
   * BEFORE handing the response to the client. */
  answer.summary = redactPII(answer.summary).text;
  answer.bullets = answer.bullets.map((b) => redactPII(b).text);
  for (const c of answer.citations) {
    c.snippet = redactPII(c.snippet).text;
  }

  /* 8. Compliance OUTPUT guard */
  const outputGuard = runOutputGuard([answer.summary, ...answer.bullets].join(" "));
  if (!outputGuard.pass) {
    const resp = buildAdviceBlockResponse(query, nowIso);
    return NextResponse.json(
      buildResponseEnvelope({
        answer: { ...resp, citations: [] as Citation[] },
        meta: {
          lastUpdated: nowIso,
          retrievedSources: retrieved.length,
          latencyMs: Date.now() - started,
          model: `${geminiModel}+guardrail`,
          feeExplainerInvoked: feeFlag,
          fundsIdentified: identification.fundIds,
        },
      }),
    );
  }

  return NextResponse.json(
    buildResponseEnvelope({
      answer,
      meta: {
        lastUpdated: nowIso,
        retrievedSources: retrieved.length,
        latencyMs: geminiLatency + (Date.now() - started),
        model: geminiModel,
        feeExplainerInvoked: feeFlag,
        fundsIdentified: identification.fundIds,
      },
    }),
  );
}

/* ════════════════════════════════════════════════════════════════════
   NORMALIZATION + ENVELOPE HELPERS
   ════════════════════════════════════════════════════════════════════ */

/**
 * Clamp Gemini's output to the public ChatAnswer schema. Enforces:
 *  - bullets length === 6 (pad with sensible filler, trim excess)
 *  - citations array uses the typed Citation shape
 *  - complianceFlag is one of the allowed literals
 */
function normalizeAnswer(
  raw: RawGeminiAnswer,
  retrievedChunks: { fundId: string; fundName: string; sourceUrls: string[]; content: string }[],
): ChatAnswer {
  const inScope = raw.inScope !== false; // default true unless explicitly false
  const summary = (raw.summary ?? "Answer based on indexed sources.").slice(0, 240);

  /* Enforce exactly 6 bullets */
  let bullets = Array.isArray(raw.bullets)
    ? raw.bullets.filter((b): b is string => typeof b === "string" && b.trim().length > 0)
    : [];
  bullets = bullets.slice(0, 6);
  while (bullets.length < 6) {
    /* Pad with a deterministic notice — never invent. */
    bullets.push(
      `Additional context available in source #${bullets.length + 1} (see citations).`,
    );
  }

  /* Build citations — prefer Gemini's selections, but fall back to the
   * retrieved chunks if Gemini returned none. */
  let citations: Citation[] = [];
  if (Array.isArray(raw.citations) && raw.citations.length > 0) {
    citations = raw.citations
      .filter((c) => c && (c.fundId || c.fundName))
      .slice(0, 8)
      .map((c) => ({
        fundId: String(c.fundId ?? ""),
        fundName: String(c.fundName ?? ""),
        source: String(c.source ?? ""),
        snippet: String(c.snippet ?? "").slice(0, 300),
        relevanceScore: clamp01(Number(c.relevanceScore ?? 0.75)),
      }));
  }
  if (citations.length === 0 && retrievedChunks.length > 0) {
    /* Fall back to the top retrieved chunk so we always satisfy the
     * "≥1 citation" invariant. */
    citations = retrievedChunks.slice(0, 3).map((c) => ({
      fundId: c.fundId,
      fundName: c.fundName,
      source: c.sourceUrls[0] ?? "",
      snippet: c.content.slice(0, 200),
      relevanceScore: 0.65,
    }));
  }

  /* Normalize compliance flag */
  const allowed = ["ok", "out_of_scope", "advice_block", "pii_block"] as const;
  const flag = (allowed as readonly string[]).includes(raw.complianceFlag ?? "")
    ? (raw.complianceFlag as ChatAnswer["complianceFlag"])
    : inScope
      ? "ok"
      : "out_of_scope";

  return { summary, bullets, citations, inScope, complianceFlag: flag };
}

function buildResponseEnvelope(r: { answer: ChatAnswer; meta: ChatMeta }): ChatResponse {
  return { answer: r.answer, meta: r.meta };
}

function errorResponse(
  err: unknown,
  stage: string,
  started: number,
  nowIso: string,
) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[/api/chat] Stage=${stage} failed:`, message);
  return NextResponse.json(
    {
      error: `Smart_Sync encountered an error at stage: ${stage}`,
      detail: message,
      meta: {
        lastUpdated: nowIso,
        retrievedSources: 0,
        latencyMs: Date.now() - started,
        model: "error",
        feeExplainerInvoked: false,
        fundsIdentified: [],
      },
    },
    { status: 500 },
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
