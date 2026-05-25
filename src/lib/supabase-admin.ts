/**
 * Supabase Admin Client — Phase 12
 *
 * Server-only elevated client using the service-role key. Bypasses RLS for
 * trusted API-route writes (reviews ingest, pulse insert, approval queue).
 *
 * NEVER import this module from client components — the service-role key
 * must not ship to the browser bundle.
 *
 * Env: SUPABASE_SERVICE_ROLE_KEY (legacy JWT service_role or sb_secret_*)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "[supabase-admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Server-side writes require the service-role key in .env.local.",
    );
  }

  _admin = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-application-name": "investor-ops-intelligence-suite-admin" },
    },
  });

  return _admin;
}

/** Test-only helper. */
export function __resetSupabaseAdminClient(): void {
  _admin = null;
}
