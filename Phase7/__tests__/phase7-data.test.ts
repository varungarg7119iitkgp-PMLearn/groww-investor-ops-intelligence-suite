/**
 * Phase 7 — Data Access Layer unit tests
 *
 * These tests verify the row->domain mappers and the read APIs against
 * a fully-mocked Supabase client. The real DB calls are exercised
 * separately in `phase7-integration-live.test.ts` (gated by env).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ── Mock Supabase BEFORE importing the SUT ───────────────────── */

interface QueryRecord {
  table: string;
  filters: Array<{ op: string; column: string; value: unknown }>;
  orders: Array<{ column: string; ascending?: boolean }>;
  limits: number[];
  maybeSingle: boolean;
  selected: string;
}

const queryRecord = { current: null as QueryRecord | null };
const responseQueue: Array<{ data: unknown; error: { message: string } | null }> = [];

function buildQuery(table: string) {
  const record: QueryRecord = {
    table,
    filters: [],
    orders: [],
    limits: [],
    maybeSingle: false,
    selected: "*",
  };
  queryRecord.current = record;

  const q: {
    select: (cols: string) => typeof q;
    eq: (column: string, value: unknown) => typeof q;
    order: (column: string, opts?: { ascending?: boolean }) => typeof q;
    limit: (n: number) => typeof q;
    maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
    then: <T>(onFulfilled: (value: { data: unknown; error: { message: string } | null }) => T) => Promise<T>;
  } = {
    select(cols: string) { record.selected = cols; return q; },
    eq(column: string, value: unknown) {
      record.filters.push({ op: "eq", column, value });
      return q;
    },
    order(column: string, opts?: { ascending?: boolean }) {
      record.orders.push({ column, ascending: opts?.ascending });
      return q;
    },
    limit(n: number) { record.limits.push(n); return q; },
    maybeSingle() {
      record.maybeSingle = true;
      return Promise.resolve(responseQueue.shift() ?? { data: null, error: null });
    },
    then<T>(onFulfilled: (value: { data: unknown; error: { message: string } | null }) => T) {
      const result = responseQueue.shift() ?? { data: null, error: null };
      return Promise.resolve(onFulfilled(result));
    },
  };
  return q;
}

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    from: (table: string) => buildQuery(table),
  }),
  __resetSupabaseClient: () => undefined,
}));

/* ── Now import the data layer ─────────────────────────────────── */
import {
  getFunds,
  getFundChunks,
  getAllChunks,
  getFeeScenario,
  getAllFeeScenarios,
  getLatestPulse,
  getTickerData,
} from "@/lib/data";

beforeEach(() => {
  queryRecord.current = null;
  responseQueue.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ════════════════════════════════════════════════════════════════
   getFunds
   ════════════════════════════════════════════════════════════════ */

describe("getFunds()", () => {
  it("returns 20 mapped funds in apiSuccess envelope", async () => {
    responseQueue.push({
      data: Array.from({ length: 20 }, (_, i) => ({
        fund_id: `f-${i}`,
        name: `Fund ${i}`,
        symbol: `F${i}`,
        category: i % 4 === 0 ? "debt" : i % 4 === 1 ? "commodity" : i % 4 === 2 ? "hybrid" : "equity",
        nav: 10 + i,
        nav_change: 0.1 * i,
        nav_change_percent: 0.5 * i,
        source_urls: [`https://example.com/${i}`],
        keyword_aliases: [`alias-${i}`],
        last_updated_at: "2026-05-24T00:00:00Z",
      })),
      error: null,
    });

    const res = await getFunds();

    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(20);
    expect(res.data?.[0]).toMatchObject({
      fundId: "f-0",
      navChange: 0,
      sourceUrls: ["https://example.com/0"],
    });
    expect(res.meta?.count).toBe(20);
    expect(queryRecord.current?.orders).toContainEqual({ column: "category", ascending: true });
  });

  it("returns apiError envelope when Supabase returns an error", async () => {
    responseQueue.push({ data: null, error: { message: "db is on fire" } });
    const res = await getFunds();
    expect(res.data).toBeNull();
    expect(res.error).toBe("db is on fire");
  });

  it("returns empty array when data is null but no error", async () => {
    responseQueue.push({ data: null, error: null });
    const res = await getFunds();
    expect(res.data).toEqual([]);
    expect(res.error).toBeNull();
  });

  it("coerces string NAV values to numbers (Supabase NUMERIC quirk)", async () => {
    responseQueue.push({
      data: [{
        fund_id: "x", name: "X", symbol: "X", category: "debt",
        nav: "15.2300", nav_change: "0.1200", nav_change_percent: "0.7900",
        source_urls: [], keyword_aliases: [], last_updated_at: "2026-05-24T00:00:00Z",
      }],
      error: null,
    });
    const res = await getFunds();
    expect(res.data?.[0].nav).toBe(15.23);
    expect(typeof res.data?.[0].nav).toBe("number");
  });
});

/* ════════════════════════════════════════════════════════════════
   getFundChunks
   ════════════════════════════════════════════════════════════════ */

describe("getFundChunks()", () => {
  it("filters by fund_id only when chunkType not provided", async () => {
    responseQueue.push({
      data: [
        { id: "c1", fund_id: "hdfc-hyb", fund_name: "HDFC Hybrid Equity Fund", category: "hybrid",
          chunk_type: "overview", content: "...", source_urls: [], metadata: null, last_updated_at: "2026-05-24T00:00:00Z" },
      ],
      error: null,
    });

    const res = await getFundChunks("hdfc-hyb");

    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(queryRecord.current?.filters).toContainEqual({ op: "eq", column: "fund_id", value: "hdfc-hyb" });
    expect(queryRecord.current?.filters.some((f) => f.column === "chunk_type")).toBe(false);
  });

  it("adds chunk_type filter when provided", async () => {
    responseQueue.push({ data: [], error: null });
    await getFundChunks("hdfc-hyb", "performance");
    expect(queryRecord.current?.filters).toContainEqual({ op: "eq", column: "chunk_type", value: "performance" });
  });

  it("maps metadata to undefined when null", async () => {
    responseQueue.push({
      data: [{ id: "c1", fund_id: "x", fund_name: "X", category: "debt",
        chunk_type: "risk", content: "c", source_urls: null, metadata: null, last_updated_at: "2026-05-24" }],
      error: null,
    });
    const res = await getFundChunks("x");
    expect(res.data?.[0].metadata).toBeUndefined();
    expect(res.data?.[0].sourceUrls).toEqual([]);
  });
});

describe("getAllChunks()", () => {
  it("applies category + chunkType filters when provided", async () => {
    responseQueue.push({ data: [], error: null });
    await getAllChunks({ category: "debt", chunkType: "fees_loads" });
    const filters = queryRecord.current?.filters ?? [];
    expect(filters).toContainEqual({ op: "eq", column: "category", value: "debt" });
    expect(filters).toContainEqual({ op: "eq", column: "chunk_type", value: "fees_loads" });
  });
});

/* ════════════════════════════════════════════════════════════════
   getFeeScenario
   ════════════════════════════════════════════════════════════════ */

describe("getFeeScenario()", () => {
  it("returns the mapped scenario for a known type", async () => {
    responseQueue.push({
      data: {
        type: "exit_load",
        title: "Exit Load",
        description: "desc",
        typical_range: "1% within 365d",
        bullets: ["a", "b"],
        source_urls: ["https://x", "https://y"],
        last_checked: "2026-05-20",
      },
      error: null,
    });

    const res = await getFeeScenario("exit_load");

    expect(res.error).toBeNull();
    expect(res.data?.type).toBe("exit_load");
    expect(res.data?.bullets).toHaveLength(2);
    expect(res.data?.sourceUrls).toHaveLength(2);
    expect(res.data?.lastChecked).toBe("2026-05-20");
    expect(queryRecord.current?.filters).toContainEqual({ op: "eq", column: "type", value: "exit_load" });
    expect(queryRecord.current?.maybeSingle).toBe(true);
  });

  it("returns null in data when type not found", async () => {
    responseQueue.push({ data: null, error: null });
    const res = await getFeeScenario("expense_ratio");
    expect(res.data).toBeNull();
    expect(res.error).toBeNull();
  });
});

describe("getAllFeeScenarios()", () => {
  it("orders by type ascending", async () => {
    responseQueue.push({
      data: [
        { type: "account_maintenance", title: "AMC", description: "", typical_range: "r", bullets: [], source_urls: [], last_checked: "2026-05-20" },
        { type: "brokerage", title: "Brk", description: "", typical_range: "r", bullets: [], source_urls: [], last_checked: "2026-05-20" },
      ],
      error: null,
    });
    const res = await getAllFeeScenarios();
    expect(res.data).toHaveLength(2);
    expect(queryRecord.current?.orders).toContainEqual({ column: "type", ascending: true });
  });
});

/* ════════════════════════════════════════════════════════════════
   getLatestPulse
   ════════════════════════════════════════════════════════════════ */

describe("getLatestPulse()", () => {
  it("returns mapped pulse with computed word count", async () => {
    responseQueue.push({
      data: {
        id: "p1",
        app_id: "app1",
        pulse_content: "alpha bravo charlie delta echo",
        themes: [{ name: "T1", reviewCount: 10, isTopThree: true, sentiment: "negative" }],
        quotes: ["q1", "q2", "q3"],
        action_ideas: ["a1", "a2", "a3"],
        status: "approved",
        generated_at: "2026-05-20T00:00:00Z",
        approved_at: "2026-05-21T00:00:00Z",
      },
      error: null,
    });

    const res = await getLatestPulse();
    expect(res.data?.wordCount).toBe(5);
    expect(res.data?.status).toBe("authorized");
    expect(res.data?.themes).toHaveLength(1);
    expect(res.data?.authorizedAt).toBe("2026-05-21T00:00:00Z");
    expect(queryRecord.current?.orders).toContainEqual({ column: "generated_at", ascending: false });
  });

  it("maps draft / pending statuses correctly", async () => {
    responseQueue.push({
      data: {
        id: "p2", app_id: "app1", pulse_content: "one two", themes: [], quotes: [], action_ideas: [],
        status: "pending_review", generated_at: "2026-05-20", approved_at: null,
      },
      error: null,
    });
    const res = await getLatestPulse();
    expect(res.data?.status).toBe("pending_review");
    expect(res.data?.authorizedAt).toBeUndefined();
  });

  it("returns null when no pulses exist", async () => {
    responseQueue.push({ data: null, error: null });
    const res = await getLatestPulse();
    expect(res.data).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════
   getTickerData
   ════════════════════════════════════════════════════════════════ */

describe("getTickerData()", () => {
  it("flattens to TickerItem shape with isPositive derived from navChange", async () => {
    responseQueue.push({
      data: [
        { fund_id: "a", name: "A", symbol: "A", category: "debt", nav: 10, nav_change: 1.5, nav_change_percent: 1, source_urls: [], keyword_aliases: [], last_updated_at: "x" },
        { fund_id: "b", name: "B", symbol: "B", category: "equity", nav: 20, nav_change: -0.5, nav_change_percent: -0.5, source_urls: [], keyword_aliases: [], last_updated_at: "x" },
      ],
      error: null,
    });

    const res = await getTickerData();

    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(2);
    expect(res.data?.[0].isPositive).toBe(true);
    expect(res.data?.[1].isPositive).toBe(false);
    expect(res.data?.[0]).not.toHaveProperty("sourceUrls");
  });
});
