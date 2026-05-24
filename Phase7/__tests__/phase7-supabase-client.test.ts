/**
 * Phase 7 — Supabase client lazy-init tests
 *
 * Verifies env-var gating, singleton behavior, and test-only reset.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createClientSpy = vi.fn().mockImplementation(() => ({
  __mockClient: true,
  from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClientSpy(...args),
}));

import { getSupabaseClient, __resetSupabaseClient, supabase } from "@/lib/supabase";

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

beforeEach(() => {
  createClientSpy.mockClear();
  __resetSupabaseClient();
  /* Inject test env vars so getSupabaseClient() doesn't throw. */
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test_publishable_key";
});

afterEach(() => {
  __resetSupabaseClient();
  if (ORIGINAL_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  if (ORIGINAL_KEY === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_KEY;
});

describe("getSupabaseClient()", () => {
  it("returns the same singleton on repeated calls", () => {
    /* env values are loaded at module import; the imported reference
     * already has process.env populated by the test runner. */
    const a = getSupabaseClient();
    const b = getSupabaseClient();
    expect(a).toBe(b);
    expect(createClientSpy).toHaveBeenCalledTimes(1);
  });

  it("creates a NEW client after __resetSupabaseClient()", () => {
    const a = getSupabaseClient();
    __resetSupabaseClient();
    const b = getSupabaseClient();
    expect(a).not.toBe(b);
    expect(createClientSpy).toHaveBeenCalledTimes(2);
  });

  it("the supabase Proxy delegates property access to the live client", () => {
    /* The Proxy must trigger lazy init on first property read. */
    expect((supabase as unknown as { __mockClient: boolean }).__mockClient).toBe(true);
    expect(createClientSpy).toHaveBeenCalledTimes(1);
  });

  it("passes auth options that disable session persistence", () => {
    getSupabaseClient();
    const [url, key, opts] = createClientSpy.mock.calls[0];
    expect(typeof url).toBe("string");
    expect(typeof key).toBe("string");
    expect((opts as { auth: { persistSession: boolean; autoRefreshToken: boolean } }).auth).toMatchObject({
      persistSession: false,
      autoRefreshToken: false,
    });
  });

  it("throws a helpful error when env vars are missing", () => {
    __resetSupabaseClient();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => getSupabaseClient()).toThrow(/Missing env vars/);
  });
});
