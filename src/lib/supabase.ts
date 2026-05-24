/**
 * Supabase Client — Phase 7
 *
 * Single, shared Supabase client used by both server components and
 * client components. RLS on the project ensures the publishable / anon
 * key only grants `SELECT` to the public tables we have explicitly
 * exposed via policies (funds, fund_chunks, fee_scenarios,
 * weekly_pulses, approval_queue, eval_results).
 *
 * Writes from the application happen via dedicated server actions /
 * API routes that ALSO go through this client when RLS allows, or via
 * the admin client (lib/supabase-admin.ts) for elevated operations.
 *
 * Env vars:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY  (legacy `anon` JWT OR new sb_publishable_*)
 *
 * Both env values are public-safe; they are visible in client bundles.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ── Lazy singleton ─────────────────────────────────────────────────
 * We instantiate the client on first call rather than at module-load
 * so that:
 *   1. Unit tests can override env vars and call __resetSupabaseClient.
 *   2. Server-rendered pages can fail-fast with a clear error if the
 *      env vars are missing.
 *   3. Next.js inlines NEXT_PUBLIC_* at build time, so the value seen
 *      in the bundle matches what the browser has.
 */
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "[supabase] Missing env vars. Expected NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example -> .env.local and fill in.",
    );
  }

  _client = createClient(url, key, {
    auth: {
      /* No user sessions in Phase 7 — pure read-anon access. Disabling
       * persistence avoids polluting localStorage / cookies. */
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-application-name": "investor-ops-intelligence-suite" },
    },
  });

  return _client;
}

/** Test-only helper to reset the singleton between tests. */
export function __resetSupabaseClient(): void {
  _client = null;
}

/** Convenience re-export so callers can `import { supabase } from '@/lib/supabase'` */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any)[prop];
  },
});
