/**
 * Phase 12 — CSV parser + row mapper
 *
 * `parseCsv` (RFC-4180 lite) and `rowsToIncoming` (alias-driven header
 * resolution + PII redaction) — exercised offline.
 */

import { describe, expect, it } from "vitest";
import { parseCsv, rowsToIncoming } from "@/lib/csv-parser";

describe("parseCsv", () => {
  it("parses a simple block", () => {
    const csv = "a,b,c\n1,2,3\n4,5,6";
    expect(parseCsv(csv)).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("handles quoted fields with commas", () => {
    const csv = `a,b\n"hello, world","quoted ""escape"" inside"`;
    expect(parseCsv(csv)).toEqual([
      ["a", "b"],
      ['hello, world', 'quoted "escape" inside'],
    ]);
  });

  it("ignores blank trailing rows", () => {
    const csv = "a,b\n1,2\n\n";
    expect(parseCsv(csv)).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles CRLF line endings", () => {
    const csv = "a,b\r\n1,2\r\n3,4";
    expect(parseCsv(csv)).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });
});

describe("rowsToIncoming — header resolution", () => {
  it("accepts canonical headers", () => {
    const rows = [
      ["platform_review_id", "author_name", "star_rating", "review_text", "review_date"],
      ["r1", "Alice", "5", "Great app", "2026-05-19"],
    ];
    const { incoming, piiHits, skipped } = rowsToIncoming(rows);
    expect(incoming).toHaveLength(1);
    expect(piiHits).toBe(0);
    expect(skipped).toBe(0);
    expect(incoming[0].platformReviewId).toBe("r1");
    expect(incoming[0].starRating).toBe(5);
    expect(incoming[0].reviewDate).toBe("2026-05-19");
  });

  it("accepts alias headers (review_id, rating, text, date)", () => {
    const rows = [
      ["review_id", "author", "rating", "text", "date"],
      ["r2", "Bob", "1", "Terrible. KYC re-asks too often.", "2026-05-20"],
    ];
    const { incoming } = rowsToIncoming(rows);
    expect(incoming[0].platformReviewId).toBe("r2");
    expect(incoming[0].authorName).toBe("Bob");
    expect(incoming[0].starRating).toBe(1);
    expect(incoming[0].sentiment).toBe("negative");
  });

  it("PII-scrubs review text and bumps piiHits", () => {
    const rows = [
      ["id", "author", "rating", "text"],
      ["r3", "Carol", "3", "Contact me at user@example.com or 9876543210."],
    ];
    const { incoming, piiHits } = rowsToIncoming(rows);
    expect(piiHits).toBe(1);
    expect(incoming[0].sanitizedText).not.toContain("user@example.com");
    expect(incoming[0].sanitizedText).not.toContain("9876543210");
    expect(incoming[0].sanitizedText).toContain("[REDACTED-EMAIL]");
  });

  it("rejects rows missing required text or rating", () => {
    const rows = [
      ["id", "author", "rating", "text"],
      ["r4", "Dan", "", "nothing"],
      ["r5", "Eve", "4", ""],
    ];
    const { incoming, skipped } = rowsToIncoming(rows);
    expect(incoming).toHaveLength(0);
    expect(skipped).toBe(2);
  });

  it("throws on missing required column", () => {
    const rows = [
      ["id", "rating"],
      ["r6", "5"],
    ];
    expect(() => rowsToIncoming(rows)).toThrow(/missing required column/);
  });

  it("derives sentiment from rating when column absent", () => {
    const rows = [
      ["id", "author", "rating", "text"],
      ["r7", "Frank", "5", "Loved it"],
      ["r8", "Grace", "1", "Bad"],
      ["r9", "Hank",  "3", "Meh"],
    ];
    const { incoming } = rowsToIncoming(rows);
    expect(incoming[0].sentiment).toBe("positive");
    expect(incoming[1].sentiment).toBe("negative");
    expect(incoming[2].sentiment).toBe("neutral");
  });
});
