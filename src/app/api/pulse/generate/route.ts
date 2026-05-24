/**
 * POST /api/pulse/generate — Phase 12
 *
 * Generates a Weekly Pulse from the most recent reviews and stores it
 * in `weekly_pulses`. Enforces Req 6 constraints (<=250 words, exactly
 * 3 quotes, exactly 3 actions, <=5 themes, PII-free) via retry-up-to-3.
 *
 * Request body (optional):
 *   - reviewLimit?: number  (default 400, capped at PULSE_MAX_REVIEWS)
 *   - forceStatus?: "draft" | "pending_review"  (default "draft")
 *   - reviewsOverride?: Array<{ text, starRating, sentiment, reviewDate }>
 *       Test escape hatch — when set, bypasses Supabase fetch.
 *
 * Response:
 *   200 → { pulse: WeeklyPulse, attempts: number, latencyMs: number }
 *   422 → { error: string, lastReason: string, attempts: number }
 *   503 → { error: string }  (insufficient reviews)
 */

import { NextResponse } from "next/server";
import type { PulseStatus, PulseTheme, WeeklyPulse } from "@/types";
import { redactPII } from "@/lib/compliance";
import { generateContent, parseJson } from "@/lib/gemini";
import { buildPulseGenerationPrompt } from "@/lib/prompts";
import {
  validatePulseCandidate,
  countWords,
  type PulseCandidate,
} from "@/lib/pulse-validator";
import {
  getReviewCount,
  getReviewsForPulse,
  insertWeeklyPulse,
  type ReviewSentiment,
} from "@/lib/data";
import { PULSE_LIMITS, PULSE_MIN_REVIEWS, PULSE_MAX_REVIEWS } from "@/lib/constants";

export const runtime = "nodejs";

interface RequestBody {
  reviewLimit?: number;
  forceStatus?: PulseStatus;
  reviewsOverride?: Array<{
    text:       string;
    starRating: number;
    sentiment:  ReviewSentiment;
    reviewDate: string;
  }>;
}

interface PulseRoutePayload {
  pulse:     WeeklyPulse;
  attempts:  number;
  latencyMs: number;
  reason?:   string;
}

export async function POST(req: Request): Promise<NextResponse<PulseRoutePayload | { error: string; reason?: string; attempts?: number }>> {
  const t0 = Date.now();

  let body: RequestBody = {};
  try {
    const text = await req.text();
    if (text.trim().length > 0) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reviewLimit = Math.min(Math.max(body.reviewLimit ?? PULSE_MAX_REVIEWS, 1), PULSE_MAX_REVIEWS);

  /* ── 1. Gather reviews ── */
  let reviews: Array<{ text: string; starRating: number; sentiment: ReviewSentiment; reviewDate: string }>;
  if (body.reviewsOverride && body.reviewsOverride.length > 0) {
    reviews = body.reviewsOverride.map((r) => ({
      text:       redactPII(r.text).text,
      starRating: r.starRating,
      sentiment:  r.sentiment,
      reviewDate: r.reviewDate,
    }));
  } else {
    const countResp = await getReviewCount();
    if (countResp.error) {
      return NextResponse.json({ error: `Failed to count reviews: ${countResp.error}` }, { status: 500 });
    }
    if ((countResp.data ?? 0) < PULSE_MIN_REVIEWS) {
      return NextResponse.json(
        {
          error: `Need at least ${PULSE_MIN_REVIEWS} reviews to generate a pulse. Found ${countResp.data ?? 0}.`,
        },
        { status: 503 },
      );
    }
    const reviewsResp = await getReviewsForPulse(reviewLimit);
    if (reviewsResp.error || !reviewsResp.data) {
      return NextResponse.json({ error: `Failed to load reviews: ${reviewsResp.error}` }, { status: 500 });
    }
    reviews = reviewsResp.data.map((r) => ({
      text:       r.sanitizedText,
      starRating: r.starRating,
      sentiment:  r.sentiment,
      reviewDate: r.reviewDate,
    }));
  }

  if (reviews.length < PULSE_MIN_REVIEWS) {
    return NextResponse.json(
      { error: `Need at least ${PULSE_MIN_REVIEWS} reviews to generate a pulse. Found ${reviews.length}.` },
      { status: 503 },
    );
  }

  /* ── 2. Try up to MAX_GENERATION_RETRIES (3) ── */
  const weekStartLabel = `Week ending ${new Date().toISOString().slice(0, 10)}`;
  const sourceReviewTexts = reviews.map((r) => r.text);
  let lastReason = "no attempt made";
  let lastCandidate: PulseCandidate | null = null;
  let attempts = 0;
  let rerollReason: string | undefined;

  for (attempts = 1; attempts <= PULSE_LIMITS.MAX_GENERATION_RETRIES; attempts++) {
    const prompt = buildPulseGenerationPrompt({
      reviews: reviews.map((r) => ({
        text:       r.text,
        starRating: r.starRating,
        sentiment:  r.sentiment,
        reviewDate: r.reviewDate,
      })),
      weekStartLabel,
      rerollReason,
    });

    let raw: string;
    try {
      const result = await generateContent(prompt, {
        json:        true,
        temperature: attempts === 1 ? 0.4 : 0.6, // gentle creativity bump on retry
        maxOutputTokens: 2048,
      });
      raw = result.text;
    } catch (err) {
      lastReason = err instanceof Error ? err.message : "Gemini call failed";
      rerollReason = `Previous attempt failed because: ${lastReason}`;
      continue;
    }

    let candidate: PulseCandidate;
    try {
      candidate = parseJson<PulseCandidate>(raw);
    } catch (err) {
      lastReason = `Malformed JSON: ${err instanceof Error ? err.message : String(err)}`;
      rerollReason = lastReason;
      continue;
    }

    const validation = validatePulseCandidate(candidate, sourceReviewTexts);
    lastCandidate = validation.scrubbed;
    if (validation.ok) {
      const themes = lastCandidate.themes as PulseTheme[];
      const insertResp = await insertWeeklyPulse({
        pulseContent: lastCandidate.summaryText,
        themes,
        quotes:       lastCandidate.quotes,
        actionIdeas:  lastCandidate.actionIdeas,
        reviewCount:  reviews.length,
        status:       body.forceStatus ?? "draft",
      });
      if (insertResp.error || !insertResp.data) {
        return NextResponse.json(
          { error: `Pulse generated but insert failed: ${insertResp.error}` },
          { status: 500 },
        );
      }
      const pulse: WeeklyPulse = {
        ...insertResp.data,
        wordCount:    countWords(lastCandidate.summaryText),
        reviewCount:  reviews.length,
      };
      return NextResponse.json({
        pulse,
        attempts,
        latencyMs: Date.now() - t0,
      });
    }

    lastReason = validation.reason ?? "validation failed";
    rerollReason = lastReason;
  }

  /* ── 3. All retries exhausted ── */
  return NextResponse.json(
    {
      error: "Failed to produce a valid pulse after 3 attempts",
      reason: lastReason,
      attempts,
    },
    { status: 422 },
  );
}
