/**
 * Compliance — Phase 9 (full Requirement 10 contract)
 *
 * Implements the three non-negotiable guardrails:
 *
 *   1. **Zero-PII** — `detectPII`, `redactPII`, and an output-side
 *      scrubber that runs on EVERY response before it leaves
 *      `/api/chat`. Seven pattern families:
 *        - Indian PAN (e.g. ABCDE1234F)
 *        - Indian Aadhaar (12 digits, optionally 4-4-4 spaced)
 *        - Phones (10-13 digits, IN / intl formats)
 *        - Emails (RFC-ish)
 *        - SSN-style (3-2-4)
 *        - Account numbers (8-16 digit contiguous bank/folio numbers)
 *        - Balances (₹ / Rs. / INR followed by money amount)
 *
 *   2. **Zero-Advice** — Phase 8 regex bank PLUS canonical deflection
 *      messages from Requirement 10. Output guard also catches
 *      second-person advice (`OUTPUT_ADVICE_PHRASES`).
 *
 *   3. **Brevity Enforcement** (voice mode) — `enforceBrevity(text)`
 *      strips filler words and trims to ≤2 sentences. Used by the
 *      voice agent (Phase 11) to keep TTS payloads tight.
 *
 * Public API:
 *   - `detectPII(text) -> PIIDetection[]`
 *   - `redactPII(text) -> { text, redactions: PIIDetection[] }`
 *   - `detectAdviceRequest(text) -> boolean` (alias `isAdviceRequest`)
 *   - `isOutOfScope(text) -> boolean`
 *   - `getComplianceResponse(violation) -> string`
 *   - `enforceBrevity(text, mode?) -> string`
 *   - `runInputGuard(query) -> GuardrailResult`
 *   - `runOutputGuard(text) -> GuardrailResult`
 *   - `runComplianceCheck(input) -> ComplianceCheckResult`
 *
 * Phase 8 callers continue to work without changes — the public
 * function names from v1 (`isAdviceRequest`, `detectMinimalPII`,
 * `runInputGuard`, `runOutputGuard`) are preserved.
 */

import type {
  GuardrailResult,
  ComplianceCheckResult,
  ComplianceViolationType,
} from "@/types";

/* ════════════════════════════════════════════════════════════════════
   PII PATTERNS — 7 families
   ════════════════════════════════════════════════════════════════════ */

export type PIIType =
  | "pan"
  | "aadhaar"
  | "phone"
  | "email"
  | "ssn"
  | "account_number"
  | "balance";

export interface PIIDetection {
  type: PIIType;
  value: string;
  startIndex: number;
  endIndex: number;
}

/** PAN: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F) */
const PAN_RE = /\b[A-Z]{5}\d{4}[A-Z]\b/g;

/** Aadhaar: 12 contiguous digits OR 4-4-4 separated by space/hyphen */
const AADHAAR_RE = /\b(?:\d{4}[\s-]\d{4}[\s-]\d{4}|\d{12})\b/g;

/** SSN-style: 3-2-4 with hyphens or spaces */
const SSN_RE = /\b\d{3}[\s-]\d{2}[\s-]\d{4}\b/g;

/**
 * Phones — international or Indian formats, 10–13 digits total when
 * stripped. We DON'T match raw long-digit runs here (account numbers
 * are handled separately); the order in `detectPII` is:
 *   PAN → Aadhaar → SSN → balance → email → phone → account_number
 * so account numbers only catch what the earlier passes missed.
 *
 * Matches: "9876543210", "+91 98765 43210", "+1-555-123-4567",
 *          "(022) 6555-1234", "+91-98765-43210".
 */
const PHONE_RE = /(?:\+?\d{1,3}[\s.\-]?)?\(?\d{2,5}\)?[\s.\-]?\d{2,5}[\s.\-]?\d{2,6}(?:[\s.\-]?\d{2,4})?/g;

/** Emails */
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/** Account numbers — 8 to 16 contiguous digits */
const ACCOUNT_NUMBER_RE = /\b\d{8,16}\b/g;

/**
 * Balance — currency token (₹ / Rs / Rs. / INR) followed by an amount.
 * Used to suppress assistant from quoting balances back at the user.
 * Limited to 4-12 digits + optional decimal to avoid catching NAV
 * disclosures ("NAV ₹25.6").
 *
 * Lakh / crore are matched as suffix tokens.
 */
const BALANCE_RE = /(?:₹|\bRs\.?\s?|\bINR\s?)\s?\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?(?:\s?(?:lakh|crore|cr|L|k))?\b/gi;

const PII_PATTERNS: Array<{ type: PIIType; re: RegExp }> = [
  { type: "pan",            re: PAN_RE },
  { type: "aadhaar",        re: AADHAAR_RE },
  { type: "ssn",            re: SSN_RE },
  { type: "balance",        re: BALANCE_RE },
  { type: "email",          re: EMAIL_RE },
  { type: "phone",          re: PHONE_RE },
  { type: "account_number", re: ACCOUNT_NUMBER_RE },
];

/**
 * Detect ALL PII matches in `text`. Each detected pattern is recorded
 * once with its span. Earlier-listed patterns take precedence — a
 * 12-digit Aadhaar is reported as "aadhaar", not "account_number".
 */
export function detectPII(text: string): PIIDetection[] {
  if (!text) return [];

  const detections: PIIDetection[] = [];
  const claimed: Array<[number, number]> = [];

  function overlaps(start: number, end: number): boolean {
    for (const [s, e] of claimed) {
      if (start < e && end > s) return true;
    }
    return false;
  }

  for (const { type, re } of PII_PATTERNS) {
    /* Each pattern uses /g, so we reset lastIndex per pass */
    const r = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = r.exec(text)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      if (overlaps(start, end)) continue;
      /* Phone-specific guard: reject if digit count is implausible. */
      if (type === "phone") {
        const digitCount = m[0].replace(/\D/g, "").length;
        if (digitCount < 10 || digitCount > 13) continue;
      }
      detections.push({ type, value: m[0], startIndex: start, endIndex: end });
      claimed.push([start, end]);
    }
  }

  detections.sort((a, b) => a.startIndex - b.startIndex);
  return detections;
}

/**
 * Phase 8 backwards-compat alias — returns just `{ phones, emails }`.
 * New code should call `detectPII` instead.
 */
export function detectMinimalPII(text: string): { phones: string[]; emails: string[] } {
  const all = detectPII(text);
  return {
    phones: all.filter((d) => d.type === "phone").map((d) => d.value),
    emails: all.filter((d) => d.type === "email").map((d) => d.value),
  };
}

/**
 * Redact every detected PII span. Returns the redacted text AND the
 * list of detections (caller can decide whether to flag / persist).
 */
export function redactPII(text: string): { text: string; redactions: PIIDetection[] } {
  if (!text) return { text: "", redactions: [] };
  const detections = detectPII(text);
  if (detections.length === 0) return { text, redactions: [] };

  /* Replace from the END so indices remain valid */
  let out = text;
  for (let i = detections.length - 1; i >= 0; i--) {
    const d = detections[i];
    out = out.slice(0, d.startIndex) + `[REDACTED-${d.type.toUpperCase()}]` + out.slice(d.endIndex);
  }
  return { text: out, redactions: detections };
}

/* ════════════════════════════════════════════════════════════════════
   NO-ADVICE — phrase bank (Phase 8 + extensions)
   ════════════════════════════════════════════════════════════════════ */

const ADVICE_PHRASES: RegExp[] = [
  /\bshould\s+i\s+(buy|sell|hold|invest|withdraw|exit|redeem|switch|start|stop)/i,
  /\bcan\s+i\s+(buy|sell|hold|invest|withdraw)/i,
  /\bis\s+it\s+(a\s+)?good\s+(time|idea)\s+to\s+(buy|sell|invest|withdraw)/i,
  /\bbest\s+(fund|mutual\s+fund|sip)\s+to\s+(buy|invest|put|park)/i,
  /\b(which|what)\s+(fund|funds)\s+(should|would)\s+i\b/i,
  /\b(recommend|suggest)\b/i,
  /\b(advise|advice)\s+(me|on)/i,
  /\bgive\s+me\s+(a\s+)?(recommendation|suggestion|advice)/i,
  /\bpick\s+(a\s+|the\s+best\s+)?(fund|mutual\s+fund)\s+for\s+me/i,
  /\bwhere\s+should\s+i\s+(invest|put|park)/i,
  /\bhow\s+(much|long)\s+should\s+i\s+invest/i,
  /\bis\s+(.+\s+)?fund\s+(better|worse)\s+than/i,
  /\bwhich\s+is\s+better\b/i,
  /\bwhich\s+is\s+the\s+best\b/i,
  /\bshould\s+i\s+(start|stop|pause|increase|decrease).{0,10}sip/i,
  /\bshould\s+i\s+(lump\s*sum|lumpsum|put\s+all)/i,
  /\bgood\s+pick\s+for\s+(me|long\s*term|short\s*term)/i,
  /\b(predict|prediction|forecast).+(price|return|nav)/i,
  /\bwhat\s+will\s+(.+\s+)?(give|return|grow|reach)/i,
  /\bguarantee(d)?\s+(return|profit)/i,
  /\bsafe\s+to\s+(invest|buy)/i,
  /\bare\s+(.+\s+)?funds\s+safe/i,
  /\bis\s+(this|it)\s+a\s+good\s+(buy|investment)/i,
  /\bworth\s+(it|investing|buying)/i,
  /\b(top|best)\s+\d*\s*(fund|mutual\s+fund)s?\s+for/i,
  /\bportfolio\s+(allocation|recommendation)/i,
  /\ballocate\b/i,
  /\b\d+%\s+(guaranteed|assured|annual)/i,
  /\bguarantee(d)?\b.{0,30}\b(return|profit|nav|fund|sip|investment|%)/i,
  /\b(good|safe|best)\s+(buy|investment|pick|choice|option)\b/i,
  /\bgood\s+(fund|funds)\b/i,
];

const OUTPUT_ADVICE_PHRASES: RegExp[] = [
  /\byou\s+should\s+(buy|sell|hold|invest|consider|switch|redeem)/i,
  /\bi\s+(recommend|suggest|advise)\b/i,
  /\bwe\s+(recommend|suggest|advise)\b/i,
  /\b(a\s+|the\s+)?good\s+(buy|investment|pick|choice)\s+(is|would\s+be)/i,
  /\bgo\s+(with|for)\s+\w+\s+(fund|sip)/i,
  /\bavoid\s+(this|that|the)\s+fund/i,
];

export function isAdviceRequest(query: string): boolean {
  if (!query) return false;
  return ADVICE_PHRASES.some((re) => re.test(query));
}

/** Alias for the architecture-named entrypoint. */
export const detectAdviceRequest = isAdviceRequest;

/* ════════════════════════════════════════════════════════════════════
   OUT-OF-SCOPE — topic bank
   ════════════════════════════════════════════════════════════════════ */

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(crypto|bitcoin|btc|ethereum|eth|altcoin|nft)\b/i,
  /\b(real\s+estate|property|reit|rera)\b/i,
  /\b(individual\s+stock|stock\s+pick|stock\s+tip)\b/i,
  /\b(forex|currency\s+trading)\b/i,
  /\b(options?|futures?|derivatives?)\s+(trading|chain|strategy)\b/i,
  /\b(insurance|term\s+plan|life\s+insurance|health\s+insurance)\b/i,
  /\b(personal\s+loan|home\s+loan|credit\s+card|emi)\b/i,
  /\bcommodity\s+(future|trading)\b/i,
];

export function isOutOfScope(query: string): boolean {
  if (!query) return false;
  return OFF_TOPIC_PATTERNS.some((re) => re.test(query));
}

/* ════════════════════════════════════════════════════════════════════
   CANONICAL DEFLECTION MESSAGES — Requirement 10
   ════════════════════════════════════════════════════════════════════ */

export const COMPLIANCE_MESSAGES = {
  advice:
    "I am an AI assistant and cannot provide financial advice. I can only share factual information from the 20 indexed funds — NAV, expense ratio, returns, risk profile, fees, and prospectus highlights. For a personalised recommendation, please consult a SEBI-registered investment advisor.",
  pii:
    "For your security, please hold your personal details (PAN, Aadhaar, phone, email, account number, balance). I cannot process queries that contain personal information — please rephrase without sharing any private data.",
  out_of_scope:
    "This query is outside the Smart_Sync coverage — I only answer questions about the 20 mutual funds configured in this terminal. Try asking about a specific fund (e.g. 'HDFC Silver ETF FoF') or a fee scenario (expense ratio, exit load, TCS, brokerage, account maintenance).",
  projection:
    "I cannot project or predict future returns / NAVs. Mutual-fund performance depends on market conditions and past returns are not indicative of future performance. I can share historical data quoted in the sources.",
} as const;

export function getComplianceResponse(violation: ComplianceViolationType): string {
  return COMPLIANCE_MESSAGES[violation] ?? COMPLIANCE_MESSAGES.out_of_scope;
}

/* ════════════════════════════════════════════════════════════════════
   BREVITY — voice agent ≤2 sentences
   ════════════════════════════════════════════════════════════════════ */

const FILLER_WORDS = [
  "just", "really", "very", "actually", "basically", "honestly", "literally",
  "essentially", "definitely", "certainly", "perhaps", "maybe", "kind of",
  "sort of", "you know", "I mean",
];

/**
 * Enforce voice-mode brevity:
 *   - Strip filler tokens (case-insensitive, word-boundary)
 *   - Collapse repeated whitespace
 *   - Trim to ≤ `maxSentences` (default 2)
 *
 * Sentence split is greedy on `.?!` followed by whitespace/EOS.
 * If the input contains no terminal punctuation, the whole string
 * is treated as one sentence.
 */
export function enforceBrevity(
  text: string,
  opts: { mode?: "voice" | "text"; maxSentences?: number } = {},
): string {
  const mode = opts.mode ?? "voice";
  const maxSentences = opts.maxSentences ?? (mode === "voice" ? 2 : 6);

  if (!text) return "";

  let out = text;

  /* Strip filler words (whole-word, case-insensitive) — voice only */
  if (mode === "voice") {
    for (const filler of FILLER_WORDS) {
      const re = new RegExp(`\\b${escapeRegex(filler)}\\b`, "gi");
      out = out.replace(re, "");
    }
    out = out.replace(/\s+/g, " ").trim();
    /* Cleanup double-comma artifacts after filler removal */
    out = out.replace(/\s*,\s*,\s*/g, ", ").replace(/^[,\s]+/, "").replace(/[,\s]+$/, "");
  }

  /* Sentence trim */
  const matches = out.match(/[^.!?]+[.!?]+/g);
  if (matches && matches.length > 0) {
    out = matches.slice(0, maxSentences).join(" ").trim();
  }
  /* If no terminal punctuation, leave as-is (single "sentence") */

  return out;
}

/* ════════════════════════════════════════════════════════════════════
   GUARDRAIL ENTRYPOINTS
   ════════════════════════════════════════════════════════════════════ */

export function runInputGuard(query: string): GuardrailResult {
  if (!query || query.trim().length === 0) return { pass: true };

  const pii = detectPII(query);
  if (pii.length > 0) {
    return { pass: false, reason: getComplianceResponse("pii"), type: "pii" };
  }

  if (isAdviceRequest(query)) {
    return { pass: false, reason: getComplianceResponse("advice"), type: "advice" };
  }

  if (isOutOfScope(query)) {
    return { pass: false, reason: getComplianceResponse("out_of_scope"), type: "out_of_scope" };
  }

  return { pass: true };
}

export function runOutputGuard(text: string): GuardrailResult {
  if (!text) return { pass: true };

  const pii = detectPII(text);
  if (pii.length > 0) {
    return {
      pass: false,
      reason: "Generated output contained PII patterns — blocked.",
      type: "pii",
    };
  }

  if (isAdviceRequest(text) || OUTPUT_ADVICE_PHRASES.some((re) => re.test(text))) {
    return {
      pass: false,
      reason: "Generated output contained advice-style language — blocked.",
      type: "advice",
    };
  }

  return { pass: true };
}

/**
 * Full compliance result — convenience aggregator matching
 * `ComplianceCheckResult` shape from `src/types`. Used by API routes
 * that want a single struct describing the input AND output state.
 */
export function runComplianceCheck(input: string, output?: string): ComplianceCheckResult {
  const inputGuard = runInputGuard(input);
  const outputGuard = output ? runOutputGuard(output) : { pass: true } as GuardrailResult;
  const allPII = [...detectPII(input), ...(output ? detectPII(output) : [])];
  return {
    inputGuardrail: inputGuard,
    outputGuardrail: outputGuard,
    piiDetected: allPII.length > 0,
    adviceDetected: isAdviceRequest(input) || (output ? isAdviceRequest(output) || OUTPUT_ADVICE_PHRASES.some((re) => re.test(output)) : false),
    piiPatterns: [...new Set(allPII.map((p) => p.type))],
  };
}

/** True if any compliance check (input or output) flags a violation. */
export function isComplianceViolation(input: string, output?: string): boolean {
  const r = runComplianceCheck(input, output);
  return !r.inputGuardrail.pass || !r.outputGuardrail.pass;
}

/* ── helpers ─────────────────────────────────────────────────── */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
