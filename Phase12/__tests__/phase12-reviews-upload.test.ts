/**
 * Phase 12 — POST /api/reviews/upload
 *
 * Integration tests for the CSV ingestion route. Mocks `insertReviews`.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

const insertReviewsMock = vi.fn();
vi.mock("@/lib/data", () => ({
  insertReviews: (rows: unknown[]) => insertReviewsMock(rows),
}));

beforeEach(() => {
  insertReviewsMock.mockReset();
  insertReviewsMock.mockResolvedValue({ data: { inserted: 0 }, error: null });
});

async function callJson(body: unknown) {
  const { POST } = await import("@/app/api/reviews/upload/route");
  const req = new Request("http://localhost/api/reviews/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  return { status: res.status, json: await res.json() };
}

/* Multipart/form-data parsing in Vitest's Node environment is unreliable
 * (undici's `req.formData()` hangs on synthetic FormData bodies). The
 * route's multipart branch is exercised in live integration testing
 * (manual curl + Director Ops UI). We cover the parsing + insertion
 * logic via the JSON-body paths above which use the exact same
 * `parseCsv()` + `rowsToIncoming()` pipeline. */

describe("/api/reviews/upload — JSON body", () => {
  it("accepts a 'csv' string body and inserts", async () => {
    insertReviewsMock.mockResolvedValue({ data: { inserted: 2 }, error: null });
    const csv = [
      "id,author,rating,text,date",
      "r1,Alice,5,Loved the app,2026-05-19",
      "r2,Bob,2,KYC keeps failing,2026-05-20",
    ].join("\n");
    const { status, json } = await callJson({ csv });
    expect(status).toBe(200);
    expect(json.inserted).toBe(2);
    expect(insertReviewsMock).toHaveBeenCalledTimes(1);
  });

  it("accepts a parsed 'rows' array body", async () => {
    insertReviewsMock.mockResolvedValue({ data: { inserted: 1 }, error: null });
    const rows = [
      ["id", "author", "rating", "text", "date"],
      ["r3", "Carol", "1", "App keeps crashing on Android", "2026-05-21"],
    ];
    const { status, json } = await callJson({ rows });
    expect(status).toBe(200);
    expect(json.inserted).toBe(1);
  });

  it("rejects body with neither 'csv' nor 'rows'", async () => {
    const { status, json } = await callJson({});
    expect(status).toBe(400);
    expect(json.error).toMatch(/csv.*string or 'rows'/i);
  });

  it("counts PII hits and scrubs before insert", async () => {
    insertReviewsMock.mockImplementation(async (rows: unknown[]) => ({
      data: { inserted: rows.length },
      error: null,
    }));
    const csv = [
      "id,author,rating,text",
      `r4,Dan,3,"Call me on 9876543210 or user@example.com please"`,
    ].join("\n");
    const { status, json } = await callJson({ csv });
    expect(status).toBe(200);
    expect(json.piiHits).toBe(1);

    const passedRows = insertReviewsMock.mock.calls[0][0] as Array<{ sanitizedText: string }>;
    expect(passedRows[0].sanitizedText).not.toContain("9876543210");
    expect(passedRows[0].sanitizedText).not.toContain("user@example.com");
  });
});

