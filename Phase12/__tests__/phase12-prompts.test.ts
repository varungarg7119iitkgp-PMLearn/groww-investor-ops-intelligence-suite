/**
 * Phase 12 — buildPulseGenerationPrompt
 *
 * Smoke tests that the prompt contains every Req-6 constraint string,
 * so prompt-drift can't silently weaken guardrails.
 */

import { describe, expect, it } from "vitest";
import { buildPulseGenerationPrompt } from "@/lib/prompts";

const SAMPLE_REVIEWS = Array.from({ length: 12 }, (_, i) => ({
  text:       `Review ${i + 1}: the app has some issues this week.`,
  starRating: 3,
  sentiment:  "neutral" as const,
  reviewDate: "2026-05-20",
}));

describe("buildPulseGenerationPrompt", () => {
  it("includes the strict JSON schema", () => {
    const p = buildPulseGenerationPrompt({ reviews: SAMPLE_REVIEWS, weekStartLabel: "Week of 2026-05-19" });
    expect(p).toContain('"summaryText"');
    expect(p).toContain('"themes"');
    expect(p).toContain('"quotes"');
    expect(p).toContain('"actionIdeas"');
  });

  it("declares each Req-6 hard limit verbatim", () => {
    const p = buildPulseGenerationPrompt({ reviews: SAMPLE_REVIEWS, weekStartLabel: "Week of 2026-05-19" });
    expect(p).toContain("<= 250 words");
    expect(p).toContain("EXACTLY 3 entries");        // quotes + actions
    expect(p).toContain("between 1 and 5 entries");  // themes
    expect(p).toContain("isTopThree=true");
    expect(p).toContain("NEVER include PII");
    expect(p).toContain("NEVER suggest a fund name");
  });

  it("embeds at most 200 reviews even if 400 provided", () => {
    const bigSet = Array.from({ length: 400 }, (_, i) => ({
      text:       `Review ${i + 1}`,
      starRating: 3,
      sentiment:  "neutral" as const,
      reviewDate: "2026-05-20",
    }));
    const p = buildPulseGenerationPrompt({ reviews: bigSet, weekStartLabel: "Week" });
    // [200] should be in the prompt, [201] should not
    expect(p).toContain("[200]");
    expect(p).not.toContain("[201]");
  });

  it("appends a regeneration block when rerollReason is set", () => {
    const p = buildPulseGenerationPrompt({
      reviews: SAMPLE_REVIEWS,
      weekStartLabel: "Week of 2026-05-19",
      rerollReason: "summaryText exceeded 250 words",
    });
    expect(p).toContain("REGENERATION REQUEST");
    expect(p).toContain("summaryText exceeded 250 words");
  });

  it("handles empty review list with a placeholder line", () => {
    const p = buildPulseGenerationPrompt({ reviews: [], weekStartLabel: "Empty Week" });
    expect(p).toContain("(no reviews)");
  });
});
