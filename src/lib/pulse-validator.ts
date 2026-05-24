/**
 * Pulse Validator — Phase 12
 *
 * Validates Gemini-generated pulse payloads against the strict Req 6
 * constraints. Pure functions (no I/O) so they can be reused both inside
 * the /api/pulse/generate retry loop and in offline AI-eval-gate tests.
 *
 * Traceability: Architecture Phase 12 Task 4 ("Output validation: reject
 * if structural constraints violated; retry max 3").
 */

import { detectPII, redactPII } from "@/lib/compliance";
import { PULSE_LIMITS } from "@/lib/constants";
import type { PulseTheme } from "@/types";

export type PulseValidationError =
  | "missing_summary"
  | "word_limit_exceeded"
  | "quote_count_invalid"
  | "action_count_invalid"
  | "theme_count_invalid"
  | "top_three_marking_invalid"
  | "pii_detected_in_summary"
  | "pii_detected_in_themes"
  | "pii_detected_in_quotes"
  | "pii_detected_in_actions"
  | "actions_not_distinct"
  | "quote_not_in_reviews"
  | "advice_in_summary"
  | "advice_in_actions"
  | "malformed_theme"
  | "malformed_quote"
  | "malformed_action";

export interface PulseCandidate {
  summaryText: string;
  themes:       PulseTheme[];
  quotes:       string[];
  actionIdeas:  string[];
}

export interface PulseValidationResult {
  ok: boolean;
  errors: PulseValidationError[];
  /** Human-readable diagnostic for the retry prompt. */
  reason?: string;
  /** Defensively scrubbed copy (PII removed). Always returned. */
  scrubbed: PulseCandidate;
}

/** Banned phrases that would constitute investment advice in a pulse output. */
const ADVICE_PHRASE_RE = /\b(buy|sell|invest in|allocate|recommend|good investment|safe pick|guaranteed)\b/i;

/**
 * Counts whitespace-separated tokens (basic but matches the UI readout
 * and matches Gemini's own internal "word" sense well enough for our
 * <= 250 word constraint).
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .length;
}

/**
 * Validates a single candidate pulse JSON object. Returns ok=true only
 * when EVERY constraint passes. The `reason` string is rendered into the
 * retry prompt so Gemini can self-correct on the next attempt.
 *
 * @param sourceReviews  Optional list of sanitized review texts; when
 *   provided we additionally check that each quote is verbatim from one
 *   of these. When omitted (e.g. in unit tests) we skip that check.
 */
export function validatePulseCandidate(
  candidate: PulseCandidate,
  sourceReviews?: string[],
): PulseValidationResult {
  const errors: PulseValidationError[] = [];

  /* ── 1. summary ── */
  if (!candidate.summaryText || candidate.summaryText.trim().length === 0) {
    errors.push("missing_summary");
  }
  const wordCount = countWords(candidate.summaryText ?? "");
  if (wordCount > PULSE_LIMITS.WORD_LIMIT) {
    errors.push("word_limit_exceeded");
  }

  /* ── 2. quotes (exactly 3) ── */
  if (!Array.isArray(candidate.quotes) || candidate.quotes.length !== PULSE_LIMITS.EXACT_QUOTES) {
    errors.push("quote_count_invalid");
  }
  if (Array.isArray(candidate.quotes)) {
    candidate.quotes.forEach((q) => {
      if (typeof q !== "string" || q.trim().length === 0) {
        errors.push("malformed_quote");
      }
    });
    if (sourceReviews && sourceReviews.length > 0) {
      const haystack = sourceReviews.map((r) => r.toLowerCase());
      candidate.quotes.forEach((q) => {
        if (typeof q !== "string") return;
        const needle = q.toLowerCase().trim();
        // Verbatim OR the 24-char head/tail of the quote appears in some review.
        // We deliberately keep this fuzzy because LLMs may lightly normalize
        // punctuation when echoing a quote.
        const head = needle.slice(0, Math.min(24, needle.length));
        const tail = needle.slice(-Math.min(24, needle.length));
        const found = haystack.some((r) => r.includes(head) || r.includes(tail));
        if (!found) errors.push("quote_not_in_reviews");
      });
    }
  }

  /* ── 3. actions (exactly 3, distinct) ── */
  if (!Array.isArray(candidate.actionIdeas) || candidate.actionIdeas.length !== PULSE_LIMITS.EXACT_ACTIONS) {
    errors.push("action_count_invalid");
  }
  if (Array.isArray(candidate.actionIdeas)) {
    candidate.actionIdeas.forEach((a) => {
      if (typeof a !== "string" || a.trim().length === 0) {
        errors.push("malformed_action");
      }
    });
    const firstWords = new Set<string>();
    candidate.actionIdeas.forEach((a) => {
      if (typeof a !== "string") return;
      const fw = a.trim().toLowerCase().split(/\s+/)[0] ?? "";
      if (firstWords.has(fw)) errors.push("actions_not_distinct");
      firstWords.add(fw);
    });
  }

  /* ── 4. themes (1..5, top 3 marked) ── */
  if (
    !Array.isArray(candidate.themes) ||
    candidate.themes.length < PULSE_LIMITS.MIN_THEMES ||
    candidate.themes.length > PULSE_LIMITS.MAX_THEMES
  ) {
    errors.push("theme_count_invalid");
  }
  if (Array.isArray(candidate.themes)) {
    candidate.themes.forEach((t) => {
      if (
        !t ||
        typeof t.name !== "string" ||
        typeof t.reviewCount !== "number" ||
        typeof t.isTopThree !== "boolean" ||
        !["positive", "negative", "neutral"].includes(t.sentiment)
      ) {
        errors.push("malformed_theme");
      }
    });
    const topCount = candidate.themes.filter((t) => t?.isTopThree === true).length;
    const expectedTop = Math.min(candidate.themes.length, PULSE_LIMITS.TOP_THREE_THEMES);
    if (topCount !== expectedTop) errors.push("top_three_marking_invalid");
  }

  /* ── 5. PII checks (final defense) ── */
  if (detectPII(candidate.summaryText ?? "").length > 0) errors.push("pii_detected_in_summary");
  if ((candidate.themes ?? []).some((t) => t && detectPII(t.name).length > 0)) {
    errors.push("pii_detected_in_themes");
  }
  if ((candidate.quotes ?? []).some((q) => typeof q === "string" && detectPII(q).length > 0)) {
    errors.push("pii_detected_in_quotes");
  }
  if ((candidate.actionIdeas ?? []).some((a) => typeof a === "string" && detectPII(a).length > 0)) {
    errors.push("pii_detected_in_actions");
  }

  /* ── 6. advice checks ── */
  if (typeof candidate.summaryText === "string" && ADVICE_PHRASE_RE.test(candidate.summaryText)) {
    errors.push("advice_in_summary");
  }
  if ((candidate.actionIdeas ?? []).some((a) => typeof a === "string" && ADVICE_PHRASE_RE.test(a))) {
    errors.push("advice_in_actions");
  }

  /* ── 7. defensive scrub regardless of pass/fail ── */
  const scrubbed: PulseCandidate = {
    summaryText: redactPII(candidate.summaryText ?? "").text,
    themes: (candidate.themes ?? []).map((t) => ({
      ...t,
      name: typeof t?.name === "string" ? redactPII(t.name).text : "",
    })),
    quotes: (candidate.quotes ?? []).map((q) => (typeof q === "string" ? redactPII(q).text : "")),
    actionIdeas: (candidate.actionIdeas ?? []).map((a) =>
      typeof a === "string" ? redactPII(a).text : "",
    ),
  };

  if (errors.length === 0) {
    return { ok: true, errors: [], scrubbed };
  }

  return {
    ok:     false,
    errors,
    reason: errorsToReason(errors),
    scrubbed,
  };
}

function errorsToReason(errors: PulseValidationError[]): string {
  const unique = Array.from(new Set(errors));
  const parts: string[] = [];
  if (unique.includes("missing_summary"))         parts.push("summaryText is missing or empty");
  if (unique.includes("word_limit_exceeded"))     parts.push(`summaryText exceeds ${PULSE_LIMITS.WORD_LIMIT} words`);
  if (unique.includes("quote_count_invalid"))     parts.push(`quotes must be exactly ${PULSE_LIMITS.EXACT_QUOTES} entries`);
  if (unique.includes("action_count_invalid"))    parts.push(`actionIdeas must be exactly ${PULSE_LIMITS.EXACT_ACTIONS} entries`);
  if (unique.includes("theme_count_invalid"))     parts.push(`themes must contain 1-${PULSE_LIMITS.MAX_THEMES} entries`);
  if (unique.includes("top_three_marking_invalid")) parts.push("the first 3 themes must have isTopThree=true (or all if <3 total)");
  if (unique.includes("pii_detected_in_summary")) parts.push("summaryText contains PII");
  if (unique.includes("pii_detected_in_themes"))  parts.push("a theme name contains PII");
  if (unique.includes("pii_detected_in_quotes"))  parts.push("a quote contains PII");
  if (unique.includes("pii_detected_in_actions")) parts.push("an action contains PII");
  if (unique.includes("advice_in_summary"))       parts.push("summaryText contains investment advice phrasing");
  if (unique.includes("advice_in_actions"))       parts.push("an action contains investment advice phrasing");
  if (unique.includes("actions_not_distinct"))    parts.push("two or more actions start with the same verb");
  if (unique.includes("quote_not_in_reviews"))    parts.push("a quote is not drawn verbatim from the supplied reviews");
  if (unique.includes("malformed_theme"))         parts.push("one of the themes is malformed");
  if (unique.includes("malformed_quote"))         parts.push("one of the quotes is empty or not a string");
  if (unique.includes("malformed_action"))        parts.push("one of the actions is empty or not a string");
  return parts.join("; ");
}
