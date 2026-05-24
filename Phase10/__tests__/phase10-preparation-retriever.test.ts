/**
 * Phase 10 — Preparation Retriever unit tests
 *
 * Covers:
 *   - 5 topics × ≥ 1 doc each present
 *   - Query keyword filter ranks correctly
 *   - Invalid topic returns found=false
 *   - Empty query returns docs in declared order
 *   - Metadata helpers
 */

import { describe, expect, it } from "vitest";
import {
  getPreparationDocs,
  listTopics,
  getDocCounts,
  getPrepDataMeta,
} from "@/tools/preparation-retriever";
import { VALID_TOPICS } from "@/types";

describe("getPreparationDocs() — 5 topics × docs", () => {
  for (const topic of VALID_TOPICS) {
    it(`topic="${topic}" returns at least 1 doc`, async () => {
      const result = await getPreparationDocs(topic);
      expect(result.found).toBe(true);
      expect(result.documents.length).toBeGreaterThan(0);
      expect(result.documents[0].topic).toBe(topic);
      expect(result.documents[0].source).toMatch(/^https?:\/\//);
    });
  }

  it("default k=2 returns up to 2 docs", async () => {
    const result = await getPreparationDocs("sip");
    expect(result.documents.length).toBeLessThanOrEqual(2);
  });

  it("k=1 returns 1 doc", async () => {
    const result = await getPreparationDocs("kyc", { k: 1 });
    expect(result.documents.length).toBe(1);
  });

  it("invalid topic returns found=false with empty docs", async () => {
    const result = await getPreparationDocs("foobar" as unknown as never);
    expect(result.found).toBe(false);
    expect(result.documents).toEqual([]);
  });

  it("query filter ranks by keyword overlap", async () => {
    /* SIP has docs about: starting, pause/stop, first-installment timing */
    const result = await getPreparationDocs("sip", { query: "pause stop SIP", k: 3 });
    expect(result.documents[0].title.toLowerCase()).toContain("pause");
  });

  it("empty query returns docs in declared order", async () => {
    const r1 = await getPreparationDocs("kyc");
    const r2 = await getPreparationDocs("kyc", { query: "" });
    expect(r1.documents[0].title).toBe(r2.documents[0].title);
  });

  it("processing time is finite", async () => {
    const result = await getPreparationDocs("sip");
    expect(result.processingMs).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.processingMs)).toBe(true);
  });
});

describe("metadata helpers", () => {
  it("listTopics returns all 5", () => {
    const topics = listTopics();
    expect(topics).toHaveLength(5);
    for (const t of VALID_TOPICS) expect(topics).toContain(t);
  });

  it("getDocCounts has ≥ 1 for every topic", () => {
    const counts = getDocCounts();
    for (const t of VALID_TOPICS) {
      expect(counts[t]).toBeGreaterThan(0);
    }
  });

  it("getPrepDataMeta returns version + lastUpdated", () => {
    const meta = getPrepDataMeta();
    expect(meta.version).toBeTruthy();
    expect(meta.lastUpdated).toBeTruthy();
  });
});
