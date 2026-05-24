/**
 * src/lib/csv-parser.ts  — Phase 12 helper, extracted from
 * `src/app/api/reviews/upload/route.ts`.
 *
 * Next.js (App Router, v15+) disallows non-handler exports from route
 * files: it complains "Property 'parseCsv' is incompatible with index
 * signature" during the type-check phase. Moving these pure functions
 * to `lib/` keeps the route surface clean and lets the same helpers
 * be unit-tested and reused.
 *
 * Behavior is byte-identical to the previous in-route implementation;
 * see `Phase12/__tests__/phase12-csv-parser.test.ts` for coverage.
 */

import { redactPII } from "@/lib/compliance";
import type { IncomingReviewRow, ReviewSentiment } from "@/lib/data";

const KNOWN_PLATFORMS = new Set(["android", "ios", "csv", "web"]);

/* ────────── Minimal CSV parser ──────────
 * Supports double-quoted fields with embedded commas and "" escapes.
 * Doesn't pull in a dependency since we only need defensible RFC 4180
 * behavior. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
      } else if (ch === '"') {
        inQuotes = false;
        i++;
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (ch === "\r") {
        i++;
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim().length > 0));
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

const HEADER_ALIASES: Record<string, string[]> = {
  platform_review_id: ["platform_review_id", "review_id", "id"],
  author_name:        ["author_name", "author", "user", "username"],
  star_rating:        ["star_rating", "rating", "stars"],
  review_text:        ["review_text", "text", "content", "comment", "body"],
  review_date:        ["review_date", "date", "created_at", "timestamp"],
  platform:           ["platform", "source"],
  sentiment:          ["sentiment", "tone"],
};

function buildHeaderIndex(headers: string[]): Record<string, number> {
  const norm = headers.map(normalizeHeader);
  const idx: Record<string, number> = {};
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const i = norm.indexOf(alias);
      if (i >= 0) {
        idx[canonical] = i;
        break;
      }
    }
  }
  return idx;
}

export interface ParsedCsvRow {
  platform_review_id: string;
  author_name:        string;
  star_rating:        number;
  review_text:        string;
  review_date:        string;
  platform:           "android" | "ios" | "csv" | "web";
  sentiment?:         ReviewSentiment;
}

export function rowsToIncoming(
  rows: string[][],
): { incoming: IncomingReviewRow[]; piiHits: number; skipped: number } {
  if (rows.length < 2) return { incoming: [], piiHits: 0, skipped: 0 };
  const idx = buildHeaderIndex(rows[0]);

  const required = ["platform_review_id", "author_name", "star_rating", "review_text"];
  for (const r of required) {
    if (!(r in idx)) {
      throw new Error(`CSV missing required column: ${r}`);
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  let piiHits = 0;
  let skipped = 0;
  const incoming: IncomingReviewRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const id        = (row[idx.platform_review_id] ?? "").trim();
    const author    = (row[idx.author_name] ?? "").trim() || "[REDACTED]";
    const ratingRaw = (row[idx.star_rating] ?? "").trim();
    const textRaw   = (row[idx.review_text] ?? "").trim();
    if (!id || !textRaw || !ratingRaw) {
      skipped++;
      continue;
    }
    const rating = Math.max(1, Math.min(5, Math.round(Number(ratingRaw))));
    if (!Number.isFinite(rating)) {
      skipped++;
      continue;
    }
    const datePart = (idx.review_date != null ? (row[idx.review_date] ?? "").trim() : "");
    const dateIso  = datePart || todayIso;
    const platformRaw = (idx.platform != null ? (row[idx.platform] ?? "").trim().toLowerCase() : "csv");
    const platform: IncomingReviewRow["platform"] = (KNOWN_PLATFORMS.has(platformRaw)
      ? platformRaw
      : "csv") as IncomingReviewRow["platform"];

    const redacted = redactPII(textRaw);
    if (redacted.redactions.length > 0) piiHits++;
    const authorScrubbed = redactPII(author).text;

    const sentimentRaw = idx.sentiment != null ? (row[idx.sentiment] ?? "").trim().toLowerCase() : "";
    const sentiment: ReviewSentiment = sentimentRaw === "positive" || sentimentRaw === "negative" || sentimentRaw === "neutral"
      ? (sentimentRaw as ReviewSentiment)
      : (rating <= 2 ? "negative" : rating >= 4 ? "positive" : "neutral");

    incoming.push({
      platformReviewId: id,
      authorName:       authorScrubbed.slice(0, 80),
      starRating:       rating,
      reviewText:       textRaw,
      sanitizedText:    redacted.text,
      sentiment,
      reviewDate:       /^\d{4}-\d{2}-\d{2}$/.test(dateIso) ? dateIso : todayIso,
      platform,
    });
  }
  return { incoming, piiHits, skipped };
}
