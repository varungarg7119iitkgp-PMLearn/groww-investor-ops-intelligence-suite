/**
 * App-wide constants — Phase 12
 *
 * Single source for IDs and config values that are referenced across
 * multiple modules (avoids hard-coded UUIDs scattered through routes).
 */

/**
 * The Groww `apps` row id — FK target for `reviews` and `weekly_pulses`.
 * One row exists in `public.apps` (created during initial seed); we read
 * it once and pin the constant here so writers don't have to query it.
 *
 * Source query (run once via MCP):
 *   SELECT id, name FROM public.apps WHERE name = 'Groww';
 *
 * If the value ever changes (e.g. on a fresh project), update here and
 * re-run the Phase 12 tests.
 */
export const GROWW_APP_ID = "0e648d69-be08-4be2-8f19-fe9b42addd6a";

/** Hard ceiling for review batch inserts (Supabase row-size + PG payload cap). */
export const REVIEW_INSERT_BATCH_SIZE = 200;

/** Minimum reviews required before pulse generation will run (per Req 6). */
export const PULSE_MIN_REVIEWS = 10;

/** Maximum review window the pulse prompt will analyze. */
export const PULSE_MAX_REVIEWS = 400;

/** Pulse generation constraint values (Req 6 / Architecture Phase 12). */
export const PULSE_LIMITS = {
  WORD_LIMIT:         250,
  EXACT_QUOTES:       3,
  EXACT_ACTIONS:      3,
  MAX_THEMES:         5,
  MIN_THEMES:         1,
  TOP_THREE_THEMES:   3,
  MAX_GENERATION_RETRIES: 3,
} as const;

/** Fee Explainer constraints (Req 7). */
export const FEE_EXPLAINER_LIMITS = {
  MAX_BULLETS:        6,
  EXACT_SOURCES:      2,
} as const;
