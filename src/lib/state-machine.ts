/**
 * State Machine — Phase 10
 *
 * Implements the 7-step Conversation State Machine that powers the
 * voice agent (Pillar C). Combines the capstone-tailored outer flow
 * (7 ConversationSteps from `src/types`) with the M3 booking sub-flow
 * (topic → context → slots → confirm) tracked via fields on
 * `ConversationState`.
 *
 * Public API:
 *   - getNextState(currentStep, intent?, opts?) → ConversationStep
 *   - isValidTransition(from, to) → boolean
 *   - getPromptForState(step, ctx) → string  (system-prompt slice)
 *   - classifyIntent(userInput) → IntentType
 *   - isValidTopic(s) → s is TopicType
 *   - generateMockSlots(count?) → string[2] (ISO-8601)
 *   - getRephraseForState(step, strike) → string
 *
 * Outer flow (capstone shape, 7 steps):
 *
 *   idle
 *     → greeting                             (startConversation)
 *   greeting
 *     → intent_classification                (after initial prompt)
 *   intent_classification
 *     → faq_resolution                       (intent ∈ {faq, general, complaint})
 *     → booking_intent                       (intent = booking)
 *     → intent_classification                (intent = unknown, 3-strike)
 *   faq_resolution
 *     → faq_resolution                       (follow-up Q)
 *     → booking_intent                       (user pivots to booking)
 *     → closing                              (user finishes)
 *   booking_intent
 *     → booking_intent                       (collecting topic / context / time)
 *     → booking_confirmation                 (all 3 collected)
 *     → closing                              (user cancels mid-flow)
 *   booking_confirmation
 *     → closing                              (after confirm)
 *     → booking_intent                       (re-pick on no-confirm)
 *   closing
 *     → idle                                 (terminal)
 */

import {
  type ConversationStep,
  type IntentType,
  type TopicType,
  VALID_STEPS,
  VALID_TOPICS,
  SILENCE_TIMEOUTS,
} from "@/types";

export { SILENCE_TIMEOUTS };

/* ════════════════════════════════════════════════════════════════════
   TRANSITION TABLE
   ════════════════════════════════════════════════════════════════════ */

/**
 * Explicit allow-list of (from → to) transitions. Self-loops are
 * included where the agent may stay in the same outer step (e.g. a
 * follow-up FAQ question keeps `faq_resolution`).
 */
const TRANSITIONS: Record<ConversationStep, ConversationStep[]> = {
  idle:                  ["greeting", "booking_intent", "faq_resolution", "intent_classification"],
  greeting:              ["intent_classification", "booking_intent", "faq_resolution"],
  intent_classification: [
    "faq_resolution",
    "booking_intent",
    "intent_classification", // 3-strike retry on unknown
    "closing",
  ],
  faq_resolution:        ["faq_resolution", "booking_intent", "closing"],
  booking_intent:        ["booking_intent", "booking_confirmation", "closing"],
  booking_confirmation:  ["booking_intent", "closing"],
  closing:               ["idle"],
};

export function isValidTransition(
  from: ConversationStep,
  to: ConversationStep,
): boolean {
  if (!VALID_STEPS.includes(from)) return false;
  if (!VALID_STEPS.includes(to)) return false;
  return TRANSITIONS[from].includes(to);
}

/* ════════════════════════════════════════════════════════════════════
   getNextState — derives next step from current + intent
   ════════════════════════════════════════════════════════════════════ */

export interface NextStateOptions {
  /** True when booking sub-flow has collected topic + context + slot. */
  bookingComplete?: boolean;
  /** True when user wants to cancel mid-booking or ends a FAQ session. */
  userRequestedEnd?: boolean;
  /** True when user confirms the proposed booking slot. */
  userConfirmed?: boolean;
  /** Strike count for 3-strike escalation on unknown intent. */
  strikeCount?: number;
}

/**
 * Pure function — given the current step and (optional) classified
 * intent, return the deterministic next step. Always validates the
 * resulting transition against `TRANSITIONS` and falls back to the
 * current step if invalid (caller can then increment strikes).
 */
export function getNextState(
  current: ConversationStep,
  intent?: IntentType,
  opts: NextStateOptions = {},
): ConversationStep {
  const { bookingComplete, userRequestedEnd, userConfirmed, strikeCount = 0 } = opts;

  if (userRequestedEnd && current !== "idle" && current !== "closing") {
    return "closing";
  }

  /* Fast-forward early steps when the user already stated a clear intent
   * (Meet button, mic, or hydrated session stuck at greeting). */
  const active = resolveActiveStep(current, intent);

  switch (active) {
    case "idle": {
      /* When the user already typed/spoke (Meet button, mic, chat), skip
       * the canned greeting and jump straight to the resolved step. */
      if (intent === "booking") return "booking_intent";
      if (intent === "faq" || intent === "complaint") return "faq_resolution";
      return "greeting";
    }

    case "greeting": {
      if (intent === "booking") return "booking_intent";
      if (intent === "faq" || intent === "complaint") return "faq_resolution";
      return "intent_classification";
    }

    case "intent_classification": {
      if (!intent || intent === "unknown") {
        return strikeCount >= 3 ? "closing" : "intent_classification";
      }
      if (intent === "booking") return "booking_intent";
      return "faq_resolution"; // faq | general | complaint
    }

    case "faq_resolution": {
      if (intent === "booking") return "booking_intent";
      if (userRequestedEnd) return "closing";
      return "faq_resolution";
    }

    case "booking_intent": {
      if (bookingComplete) return "booking_confirmation";
      return "booking_intent";
    }

    case "booking_confirmation": {
      if (userConfirmed) return "closing";
      return "booking_intent";
    }

    case "closing":
      return "idle";

    default:
      /* Type-safe exhaustive check — `current` is `never` here when
       * all branches above are exhausted. */
      return "idle";
  }
}

/**
 * When a session is stuck at greeting/intent_classification (e.g. hydrated
 * from shared state) but the user sends a clear booking or FAQ message,
 * jump directly to the correct step.
 */
export function resolveActiveStep(
  current: ConversationStep,
  intent?: IntentType,
): ConversationStep {
  if (intent === "booking") {
    if (
      current === "idle" ||
      current === "greeting" ||
      current === "intent_classification"
    ) {
      return "booking_intent";
    }
  }
  if (intent === "faq" || intent === "complaint") {
    if (
      current === "idle" ||
      current === "greeting" ||
      current === "intent_classification"
    ) {
      return "faq_resolution";
    }
  }
  return current;
}

/* ════════════════════════════════════════════════════════════════════
   PROMPTS — one per state, used by Phase 11 chat() wrapper
   ════════════════════════════════════════════════════════════════════ */

export interface StatePromptContext {
  /** Theme injection from Pulse — Pillar B → C link */
  topTheme?: string;
  /** Investor name — already-redacted upstream */
  investorNameRedacted?: string;
  /** Available mock slots for current booking session */
  proposedSlots?: string[];
  /** Selected booking topic */
  topic?: TopicType;
  /** Captured booking context (PII-redacted) */
  contextNotes?: string;
  /** Generated booking code, if any */
  bookingCode?: string;
}

export function getPromptForState(
  step: ConversationStep,
  ctx: StatePromptContext = {},
): string {
  switch (step) {
    case "idle":
      return "Voice agent is idle. Wait for user activation.";

    case "greeting": {
      const theme = ctx.topTheme
        ? ` This week, our investors are most curious about "${ctx.topTheme}".`
        : "";
      return [
        `You are the Groww Voice Agent. Begin with a 1-sentence acknowledgement greeting.${theme}`,
        `Identify yourself as an AI voice agent. Disclaim: "This is informational and not investment advice."`,
        `Then ask ONE open question: "How can I help — fund information, an appointment, or something else?"`,
        `Keep total response ≤ 2 sentences for TTS pacing.`,
      ].join(" ");
    }

    case "intent_classification":
      return [
        `Classify the user's intent into one of: faq, booking, complaint, general, unknown.`,
        `If clear (faq/booking) — acknowledge once ("Got it.") and move on without asking redundant questions.`,
        `If ambiguous, ask ONE narrower clarifying question. Do NOT list all options every time.`,
        `Keep responses ≤ 2 sentences.`,
      ].join(" ");

    case "faq_resolution":
      return [
        `Answer the user's question using ONLY facts from the query_fund_knowledge tool (NAV, expense ratio, returns, fees) or get_preparation_docs for advisor-prep topics.`,
        `ALWAYS call query_fund_knowledge first for fund/NAV/fee/return questions — the KB has live NAV for all 20 funds.`,
        `Cite the source (fund name + url) inline. NEVER recommend, suggest, or predict — only state facts from sources.`,
        `If the question is outside the 20-fund scope, say so and offer to book an advisor call.`,
        `Keep response ≤ 2 sentences for TTS; if more detail is needed, ask if user wants the full explanation.`,
      ].join(" ");

    case "booking_intent": {
      const haveTopic = !!ctx.topic;
      const haveContext = !!ctx.contextNotes;
      const haveSlots = (ctx.proposedSlots?.length ?? 0) >= 2;
      if (!haveTopic) {
        return [
          `Sub-step: capture booking TOPIC. Ask the user to pick from: KYC, SIP, statements, withdrawals, account changes.`,
          `One question per turn. If they say something close (e.g. "tax doc" → statements), confirm before proceeding.`,
        ].join(" ");
      }
      if (!haveContext) {
        return [
          `Sub-step: capture CONTEXT. Ask ONE short question to understand what they want to discuss.`,
          `Do NOT collect PII — if user volunteers PAN/Aadhaar/phone, redact and tell them not to share personal details.`,
        ].join(" ");
      }
      if (!haveSlots) {
        return `Sub-step: propose EXACTLY 2 future slots via generateMockSlots(). Read them aloud and ask which works.`;
      }
      return `Sub-step: wait for user to pick one of the 2 proposed slots. Repeat the choice and move to confirmation.`;
    }

    case "booking_confirmation": {
      const slot = ctx.proposedSlots?.[0] ?? "selected slot";
      return [
        `Read back booking details exactly once: topic="${ctx.topic}", slot=${slot}, booking code=${ctx.bookingCode ?? "[pending]"}.`,
        `Ask: "Should I confirm this booking?" Wait for explicit yes/no.`,
        `On yes — call createCalendarEvent then close. On no — return to booking_intent for re-pick.`,
      ].join(" ");
    }

    case "closing":
      return [
        `End the session in 1 sentence. Quote the booking code (if any).`,
        `Closing pattern: "Your booking code is NL-XXXX. Anything else?" — pause briefly then end if silent.`,
      ].join(" ");

    default:
      return "Continue the conversation.";
  }
}

/* ════════════════════════════════════════════════════════════════════
   INTENT CLASSIFIER — keyword-driven (Gemini will refine in Phase 11)
   ════════════════════════════════════════════════════════════════════ */

const INTENT_KEYWORDS: Record<Exclude<IntentType, "unknown">, RegExp[]> = {
  booking: [
    /\b(book|schedule|appointment|meeting|call back|call me|advisor)\b/i,
    /\bset\s+up\s+a\s+(call|meeting)/i,
    /\bspeak\s+to\s+(an?\s+)?advisor/i,
    /\btalk\s+to\s+someone/i,
    /\breschedule|cancel\s+(my\s+)?(appointment|call)/i,
    /\bbook\s+an?\s+advisor/i,
    /\badvisor\s+appointment/i,
  ],
  complaint: [
    /\b(complaint|issue|problem|grievance|stuck|broken|failed|error|cant)\b/i,
    /\b(not\s+working|doesn'?t\s+work)/i,
    /\b(refund|chargeback|wrong\s+(amount|transaction))/i,
  ],
  faq: [
    /\b(what|how|when|where|why|which)\b.*\?/i,
    /\b(expense\s+ratio|nav|exit\s+load|tcs|brokerage|fee|charge|return|aum)\b/i,
    /\b(fund|sip|mutual\s+fund|etf|fof|equity|debt|hybrid)\b/i,
  ],
  general: [
    /\b(hi|hello|hey|namaste|good\s+(morning|afternoon|evening))\b/i,
    /\b(thanks|thank\s+you|appreciate)\b/i,
    /\b(yes|no|okay|ok|sure|fine)\b/i,
  ],
};

/**
 * Classify intent from raw user input via ordered keyword check.
 * Priority: booking > complaint > faq > general > unknown.
 * Phase 11 may delegate to Gemini for better accuracy; this is the
 * baseline that always works without an LLM call.
 */
export function classifyIntent(userInput: string): IntentType {
  if (!userInput || userInput.trim().length === 0) return "unknown";

  const text = userInput.trim();
  const order: Exclude<IntentType, "unknown">[] = [
    "booking",
    "complaint",
    "faq",
    "general",
  ];

  for (const intent of order) {
    if (INTENT_KEYWORDS[intent].some((re) => re.test(text))) return intent;
  }
  return "unknown";
}

/* ════════════════════════════════════════════════════════════════════
   TOPIC GUARD
   ════════════════════════════════════════════════════════════════════ */

export function isValidTopic(s: unknown): s is TopicType {
  return typeof s === "string" && (VALID_TOPICS as readonly string[]).includes(s);
}

const TOPIC_KEYWORDS: Record<TopicType, RegExp[]> = {
  kyc: [/\b(kyc|verification|identity|aadhaar|pan\s+update|address\s+update)\b/i],
  sip: [/\b(sip|systematic\s+investment|monthly\s+sip|sip\s+(amount|date|pause|stop|start))\b/i],
  statements: [/\b(statement|tax|cas|capital\s+gains|p&l|profit\s+and\s+loss|account\s+statement)\b/i],
  withdrawals: [/\b(withdraw|redeem|redemption|cash\s+out|exit)\b/i],
  account_changes: [/\b(account|nominee|email\s+update|mobile\s+update|change\s+address|update\s+(my\s+)?details)\b/i],
};

/** Heuristic topic classifier — used when Gemini doesn't return a topic. */
export function classifyTopic(userInput: string): TopicType | undefined {
  if (!userInput) return undefined;
  for (const topic of VALID_TOPICS) {
    if (TOPIC_KEYWORDS[topic].some((re) => re.test(userInput))) return topic;
  }
  return undefined;
}

/* ════════════════════════════════════════════════════════════════════
   MOCK SLOTS — exactly 2, future-dated
   ════════════════════════════════════════════════════════════════════ */

/**
 * Generate exactly `count` (default 2) ISO-8601 booking slots in the
 * NEAR future. Slots are deterministic given a base time (next
 * business day at 10:00 and 14:30 IST) so repeated calls within the
 * same minute return identical proposals — useful for the agent to
 * read back the same slots.
 *
 * IST = UTC+05:30. Output is in ISO-8601 with `+05:30` offset.
 *
 * @param count           Number of slots (default 2). Always clamped.
 * @param baseTimeMs      Optional override for testing.
 */
export function generateMockSlots(count = 2, baseTimeMs?: number): string[] {
  const n = Math.max(1, Math.min(2, count)); // ARCHITECTURE: exactly 2
  const baseMs = baseTimeMs ?? Date.now();

  /* Find the next business day (Mon-Fri) ≥ tomorrow in IST */
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const base = new Date(baseMs + istOffsetMs);
  /* Move to tomorrow */
  base.setUTCDate(base.getUTCDate() + 1);
  base.setUTCHours(0, 0, 0, 0);
  /* Skip Sat (6) and Sun (0) */
  while (base.getUTCDay() === 0 || base.getUTCDay() === 6) {
    base.setUTCDate(base.getUTCDate() + 1);
  }

  const slotTimes: Array<{ h: number; m: number }> = [
    { h: 10, m: 0 },  // 10:00 IST
    { h: 14, m: 30 }, // 14:30 IST
  ];

  return slotTimes.slice(0, n).map(({ h, m }) => {
    const slot = new Date(base.getTime());
    slot.setUTCHours(h, m, 0, 0);
    /* Convert back to absolute UTC ISO and re-format with +05:30 */
    const utcMs = slot.getTime() - istOffsetMs;
    return formatIstIso(utcMs, h, m);
  });
}

function formatIstIso(utcMs: number, h: number, m: number): string {
  const d = new Date(utcMs);
  /* Add IST offset for the date portion */
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const yyyy = ist.getUTCFullYear();
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(ist.getUTCDate()).padStart(2, "0");
  const hh = String(h).padStart(2, "0");
  const mn = String(m).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mn}:00+05:30`;
}

/* ════════════════════════════════════════════════════════════════════
   3-STRIKE REPHRASE
   ════════════════════════════════════════════════════════════════════ */

/**
 * Returns a rephrase string scaled to the current strike (1, 2, 3+).
 * Phase 10 contract: strike 1 = shorter rephrase; 2 = even narrower;
 * 3+ = offer text fallback.
 */
export function getRephraseForState(
  step: ConversationStep,
  strike: number,
): string {
  const s = Math.max(1, Math.min(3, strike));

  if (step === "intent_classification") {
    return [
      "",
      "Sorry, I didn't catch that. Are you looking for fund information or do you want to book an appointment?",
      "Let me try once more — just say 'info' or 'book'.",
      "I'm having trouble understanding. Would you like to switch to text mode?",
    ][s];
  }

  if (step === "booking_intent") {
    return [
      "",
      "Could you tell me which topic — KYC, SIP, statements, withdrawals, or account changes?",
      "Just one word is fine — KYC? SIP? statements? withdrawals? account?",
      "Let's switch to text so you can pick from a list. Tap the keyboard icon.",
    ][s];
  }

  if (step === "booking_confirmation") {
    return [
      "",
      "I didn't hear a yes or no. Should I confirm the booking? Please say yes or no.",
      "Just a yes or no — should I lock in this slot?",
      "I'll need a clearer answer. Switching to text mode to show options.",
    ][s];
  }

  /* Default: greeting / faq_resolution / closing */
  return [
    "",
    "Could you say that again, a bit slower?",
    "I'm still having trouble — let me ask differently: what would you like to do?",
    "Let's try text mode. Tap the keyboard icon below.",
  ][s];
}
