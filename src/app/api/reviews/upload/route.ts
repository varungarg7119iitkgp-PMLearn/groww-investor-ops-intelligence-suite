/**
 * POST /api/reviews/upload — Phase 12
 *
 * Accepts a multipart CSV file (or a JSON body with `rows[]`), runs each
 * row through the Phase 9 PII redactor, and batch-inserts into Supabase
 * `reviews`. Designed to be called by the Director Ops `CsvUploader` and
 * to drive the pulse-generation pipeline.
 *
 * CSV columns expected (case-insensitive, flexible order):
 *   review_id  (or  platform_review_id  or  id)         -- required
 *   author     (or  author_name)                         -- required
 *   rating     (or  star_rating)                         -- required (1-5)
 *   text       (or  review_text  or  content)            -- required
 *   date       (or  review_date)                         -- optional (defaults to today)
 *   platform   (android | ios | csv | web)               -- optional (default csv)
 *   sentiment  (positive | negative | neutral)           -- optional
 *
 * Response:
 *   200 → { inserted: number, skipped: number, piiHits: number, totalRows: number }
 *   400 → bad CSV / empty / oversized
 *   500 → upstream DB error
 */

import { NextResponse } from "next/server";
import { insertReviews, type IncomingReviewRow } from "@/lib/data";
import { parseCsv, rowsToIncoming } from "@/lib/csv-parser";

export const runtime = "nodejs";

const MAX_BYTES   = 50 * 1024 * 1024; // 50 MB
const MAX_ROWS    = 10_000;

interface UploadStats {
  inserted:   number;
  skipped:    number;
  piiHits:    number;
  totalRows:  number;
}

export async function POST(req: Request): Promise<NextResponse<UploadStats | { error: string }>> {
  /* Branch on content type: multipart vs JSON */
  const ct = req.headers.get("content-type") ?? "";

  let csvText: string;
  if (ct.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (err) {
      return NextResponse.json({ error: `Invalid multipart body: ${err instanceof Error ? err.message : String(err)}` }, { status: 400 });
    }
    const file = formData.get("file");
    if (!file || (typeof file === "string" && file.length === 0)) {
      return NextResponse.json({ error: "Missing 'file' field in multipart body" }, { status: 400 });
    }
    if (typeof file === "string") {
      // Some clients post the CSV as a plain string field rather than a Blob.
      if (file.trim().length === 0) {
        return NextResponse.json({ error: "File is empty" }, { status: 400 });
      }
      csvText = file;
    } else {
      if (file.size === 0) {
        return NextResponse.json({ error: "File is empty" }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `File exceeds ${MAX_BYTES} bytes` }, { status: 400 });
      }
      csvText = await file.text();
    }
  } else if (ct.includes("application/json")) {
    let body: { csv?: string; rows?: string[][] };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (typeof body.csv === "string") {
      csvText = body.csv;
    } else if (Array.isArray(body.rows)) {
      // Skip CSV parsing — pass parsed rows directly
      try {
        const result = rowsToIncoming(body.rows);
        if (result.incoming.length === 0) {
          return NextResponse.json({ error: "No valid rows found" }, { status: 400 });
        }
        if (result.incoming.length > MAX_ROWS) {
          return NextResponse.json({ error: `Too many rows (${result.incoming.length} > ${MAX_ROWS})` }, { status: 400 });
        }
        const insert = await insertReviews(result.incoming);
        if (insert.error) {
          return NextResponse.json({ error: insert.error }, { status: 500 });
        }
        return NextResponse.json({
          inserted:  insert.data?.inserted ?? 0,
          skipped:   result.skipped,
          piiHits:   result.piiHits,
          totalRows: body.rows.length - 1,
        });
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Either 'csv' string or 'rows' array required" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: `Unsupported content-type: ${ct}` }, { status: 415 });
  }

  /* Parse + redact + insert */
  let parsed: string[][];
  try {
    parsed = parseCsv(csvText);
  } catch (err) {
    return NextResponse.json({ error: `CSV parse error: ${err instanceof Error ? err.message : String(err)}` }, { status: 400 });
  }

  let mapped: { incoming: IncomingReviewRow[]; piiHits: number; skipped: number };
  try {
    mapped = rowsToIncoming(parsed);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }

  if (mapped.incoming.length === 0) {
    return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });
  }
  if (mapped.incoming.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (${mapped.incoming.length} > ${MAX_ROWS})` }, { status: 400 });
  }

  const insert = await insertReviews(mapped.incoming);
  if (insert.error) {
    return NextResponse.json({ error: insert.error }, { status: 500 });
  }
  return NextResponse.json({
    inserted:  insert.data?.inserted ?? 0,
    skipped:   mapped.skipped,
    piiHits:   mapped.piiHits,
    totalRows: parsed.length - 1,
  });
}
