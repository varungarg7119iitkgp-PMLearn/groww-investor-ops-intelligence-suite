/**
 * POST /api/voice/converse  — Phase 11
 *
 * Voice-agent orchestrator. Each call is a single conversation turn:
 *
 *   1. Validate request + run compliance INPUT guard
 *   2. Classify intent (state machine)
 *   3. Compute next ConversationStep
 *   4. Build the Phase-10 voice system prompt for that step
 *   5. Call Gemini chat() with the 3 voice tools registered
 *   6. Loop on Function Calls until the model returns final text
 *   7. Run compliance OUTPUT guard on the final text
 *   8. Return updated ConversationState + assistant text + tool calls
 *
 * Request:
 *   {
 *     userInput: string,            // user transcript from STT (or text)
 *     conversationState?: ConversationState  // optional; created if absent
 *   }
 *
 * Response:
 *   {
 *     assistantText: string,        // ≤ 2 sentences, PII-scrubbed
 *     conversationState: ConversationState,
 *     toolCalls: [...],             // tools fired this turn
 *     orbState: AgentVisualState,   // suggested orb state for next idle
 *     meta: { latencyMs, model, complianceFlag }
 *   }
 *
 * Tracing:
 *   - Phase 8  : InvestorTerminal text path remains on `/api/chat`
 *   - Phase 9  : `runInputGuard` / `runOutputGuard` enforce zero-PII / zero-advice
 *   - Phase 10 : state-machine + voice-tools + prompts
 *   - Phase 11 : adds Gemini Function-Calling loop + theme-aware greeting
 */

import { NextResponse } from "next/server";
import {
  type ConversationState,
  type IntentType,
  createInitialConversationState,
  type AgentVisualState,
} from "@/types";

import {
  classifyIntent,
  classifyTopic,
  getNextState,
  getRephraseForState,
} from "@/lib/state-machine";
import { getAvailableSlots } from "@/tools/calendar";
import { buildVoiceSystemPrompt } from "@/lib/prompts";
import {
  chat as geminiChat,
  type ChatTurn,
  type ChatToolDeclaration,
} from "@/lib/gemini";
import {
  VOICE_FUNCTION_DECLARATIONS,
  executeVoiceToolCall,
} from "@/lib/voice-tools";
import {
  runInputGuard,
  runOutputGuard,
  redactPII,
  enforceBrevity,
  getComplianceResponse,
} from "@/lib/compliance";
import { getLatestPulseTheme } from "@/lib/data";
import { createApprovalItem } from "@/lib/approval-bridge";

/* ════════════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════════════ */

interface RequestBody {
  userInput: string;
  conversationState?: ConversationState;
  /** Phase 14 — Zustand topTheme takes precedence over Supabase fetch */
  topThemeOverride?: string;
}

interface ResponseShape {
  assistantText: string;
  conversationState: ConversationState;
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
    output: Record<string, unknown>;
    ok: boolean;
  }>;
  orbState: AgentVisualState;
  meta: {
    latencyMs: number;
    model: string;
    complianceFlag: "ok" | "advice_block" | "pii_block" | "out_of_scope" | "guard_output";
    step: ConversationState["step"];
    intent?: IntentType;
  };
}

/* ════════════════════════════════════════════════════════════════════
   HANDLER
   ════════════════════════════════════════════════════════════════════ */

export async function POST(req: Request) {
  const started = Date.now();

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userInput = String(body?.userInput ?? "").trim();
  if (!userInput) {
    return NextResponse.json(
      { error: "`userInput` is required" },
      { status: 400 },
    );
  }
  if (userInput.length > 1000) {
    return NextResponse.json(
      { error: "`userInput` exceeds 1000 char limit" },
      { status: 400 },
    );
  }

  let state: ConversationState =
    body.conversationState ?? createInitialConversationState(generateSessionId());

  /* ── 1. Compliance INPUT guard ───────────────────────────── */
  const input = runInputGuard(userInput);
  if (!input.pass) {
    const canonical = input.reason;
    /* Brevity for voice */
    const brief = enforceBrevity(canonical, { mode: "voice", maxSentences: 2 });
    /* Record transcript entries (PII redacted) */
    const scrubbedInput = redactPII(userInput).text;
    state = appendTranscript(state, "user", scrubbedInput);
    state = appendTranscript(state, "assistant", brief);

    return NextResponse.json<ResponseShape>({
      assistantText: brief,
      conversationState: state,
      toolCalls: [],
      orbState: "IDLE",
      meta: {
        latencyMs: Date.now() - started,
        model: "guardrail",
        complianceFlag:
          input.type === "pii"
            ? "pii_block"
            : input.type === "advice"
              ? "advice_block"
              : "out_of_scope",
        step: state.step,
      },
    });
  }

  /* ── 2. Classify intent + compute next state ─────────────── */
  const intent = classifyIntent(userInput);

  /* Booking sub-flow: detect topic + context + slot collection */
  const topic = state.topic ?? classifyTopic(userInput);
  const bookingComplete = !!(topic && (state.toolCallsMade ?? []).includes("generate_booking_code_and_notes"));

  const userRequestedEnd = /\b(bye|goodbye|that's all|thanks bye|end)\b/i.test(userInput);
  const userConfirmed = /\b(yes|yeah|confirm|sure|please|book it|do it)\b/i.test(userInput) && state.step === "booking_confirmation";

  const nextStep = getNextState(state.step, intent, {
    bookingComplete,
    userRequestedEnd,
    userConfirmed,
    strikeCount: state.strikeCount,
  });

  /* ── 3. Theme-aware greeting (Pillar B → C) ──────────────── */
  let topTheme: string | undefined = body.topThemeOverride;
  if (nextStep === "greeting" && !state.themeGreeting && !topTheme) {
    try {
      const theme = await getLatestPulseTheme();
      if (theme.data) topTheme = theme.data;
    } catch {
      /* Pulse not available — proceed without theme */
    }
  } else if (!topTheme && state.themeGreeting) {
    topTheme = state.themeGreeting;
  }

  /* ── 4. Build voice system prompt ────────────────────────── */
  let proposedSlots: string[] | undefined;
  if (nextStep === "booking_intent" && topic && !state.bookingCode) {
    try {
      proposedSlots = await getAvailableSlots(2);
    } catch {
      proposedSlots = undefined;
    }
  }

  const systemPrompt = buildVoiceSystemPrompt({
    step: nextStep,
    topTheme: topTheme ?? state.themeGreeting,
    investorNameRedacted: "[REDACTED]",
    topic,
    proposedSlots,
    bookingCode: state.bookingCode,
  });

  /* ── 5. Convert transcript → Gemini history ──────────────── */
  const history: ChatTurn[] = state.transcript
    .filter((e) => e.role === "user" || e.role === "assistant")
    .slice(-10)
    .map((e) => ({
      role: e.role === "user" ? "user" : "model",
      text: e.content,
    }));

  /* ── 6. Call Gemini chat() with function calling ─────────── */
  let geminiResult;
  try {
    geminiResult = await geminiChat(userInput, {
      systemInstruction: systemPrompt,
      history,
      tools: VOICE_FUNCTION_DECLARATIONS as unknown as ChatToolDeclaration[],
      toolDispatcher: async (name, args) => {
        const r = await executeVoiceToolCall(name, args, { sessionId: state.sessionId });
        /* Track tool calls on state for sub-flow logic */
        state = { ...state, toolCallsMade: [...(state.toolCallsMade ?? []), r.toolName] };
        /* If booking-code generated, capture it on state + create approval item */
        if (r.toolName === "generate_booking_code_and_notes" && r.ok) {
          const code = r.output?.bookingCode;
          if (typeof code === "string") {
            state = {
              ...state,
              bookingCode: code as `NL-${string}`,
              topic: (r.output?.topic as ConversationState["topic"]) ?? state.topic,
            };
            // Phase 13: create pending approval item asynchronously
            createApprovalItem({
              bookingCode: code,
              topic: (r.output?.topic as string) ?? state.topic ?? "kyc",
              proposedSlot: (r.output?.proposedSlot as string) ?? new Date(Date.now() + 86400000).toISOString(),
              investorNameRedacted: "[REDACTED]",
              userContext: (r.output?.contextNotes as string) ?? undefined,
            }).catch(() => { /* non-blocking */ });
          }
        }
        return r;
      },
      maxToolTurns: 4,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Gemini call failed", detail: errorMessage(err) },
      { status: 500 },
    );
  }

  let finalText = geminiResult.text;

  /* If Gemini returned nothing useful (rare), fall back to rephrase */
  if (!finalText || finalText.length === 0) {
    finalText = getRephraseForState(nextStep, state.strikeCount + 1);
    state = { ...state, strikeCount: state.strikeCount + 1 };
  }

  /* ── 7. Compliance OUTPUT guard + PII scrub + brevity ────── */
  const scrubbed = redactPII(finalText).text;
  const brief = enforceBrevity(scrubbed, { mode: "voice", maxSentences: 2 });

  const outGuard = runOutputGuard(brief);
  let assistantText = brief;
  let complianceFlag: ResponseShape["meta"]["complianceFlag"] = "ok";
  if (!outGuard.pass) {
    assistantText = getComplianceResponse(
      outGuard.type === "pii"
        ? "pii"
        : outGuard.type === "advice"
          ? "advice"
          : "out_of_scope",
    );
    complianceFlag = "guard_output";
  }

  /* ── 8. Update state + return ───────────────────────────── */
  state = {
    ...state,
    step: nextStep,
    intent,
    topic: topic ?? state.topic,
    themeGreeting: topTheme ?? state.themeGreeting,
    lastUserInput: userInput,
  };
  state = appendTranscript(state, "user", redactPII(userInput).text);
  state = appendTranscript(state, "assistant", assistantText);

  return NextResponse.json<ResponseShape>({
    assistantText,
    conversationState: state,
    toolCalls: geminiResult.toolCalls,
    orbState: nextStep === "closing" ? "IDLE" : "SPEAKING",
    meta: {
      latencyMs: Date.now() - started,
      model: geminiResult.model,
      complianceFlag,
      step: nextStep,
      intent,
    },
  });
}

/* ────────── helpers ────────── */

function appendTranscript(
  state: ConversationState,
  role: "user" | "assistant",
  content: string,
): ConversationState {
  return {
    ...state,
    transcript: [
      ...state.transcript,
      {
        role,
        content,
        timestamp: new Date().toISOString(),
        step: state.step,
      },
    ],
  };
}

function generateSessionId(): string {
  /* `globalThis.crypto.randomUUID` exists in Node >= 19 + Edge runtime */
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
