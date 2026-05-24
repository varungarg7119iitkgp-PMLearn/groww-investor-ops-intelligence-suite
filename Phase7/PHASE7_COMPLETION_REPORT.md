# Phase 7 — Data Layer & Supabase Setup — Completion Report

**Status:** ✅ Complete — all deliverables shipped, all tests passing, schema + seed verified live.
**Date:** 2026-05-24
**Tests:** 506 / 506 passing (+64 net Phase 7 tests)
**Project test files:** 13 / 13 passing
**Typecheck:** ✅ Clean
**Lint:** ✅ Clean (2 pre-existing warnings, none introduced by Phase 7)

---

## 1. Architecture Alignment

| Architecture Phase 7 Task | Status | Implementation |
|---|---|---|
| 1. Supabase project setup | ✅ | Project already provisioned (M2 reused). URL + publishable key fetched via MCP |
| 2. Database schema migration | ✅ | 5 new tables via `apply_migration`: `funds`, `fund_chunks`, `fee_scenarios`, `approval_queue`, `eval_results` |
| 3. Fund data seeding | ✅ | 20 funds inserted — exact 5/5/5/5 (debt/commodity/hybrid/equity) |
| 4. Chunk generation | ✅ | 100 chunks (5 types × 20 funds) populated via templated INSERT…SELECT |
| 5. Fee scenario data | ✅ | All 5 scenarios seeded with exactly 5 bullets + 2 source URLs each |
| 6. Supabase client | ✅ | `src/lib/supabase.ts` with lazy singleton + reset helper |
| 7. Data access functions | ✅ | `src/lib/data.ts` exports `getFunds`, `getFundChunks`, `getAllChunks`, `getFeeScenario`, `getAllFeeScenarios`, `getLatestPulse`, `getTickerData` |
| 8. Wire ticker | ✅ | `MarqueeTicker` now reads live data via `useEffect` → `getTickerData()`; mock retained as SSR fallback |
| 9. Eval infrastructure | ✅ | `src/lib/eval-utils.ts` (scorers + recorders) + `scripts/eval-runner.ts` (CLI scaffold) + `eval_results` table |

## 2. Live Supabase Verification (read via MCP)

```text
funds          → 20 rows  (5 debt, 5 commodity, 5 hybrid, 5 equity)
fund_chunks    → 100 rows (20 per chunk_type)
fee_scenarios  → 5 rows   (5 bullets / 2 source URLs each)
approval_queue → 0 rows   (no seed needed; populated in Phase 12+)
eval_results   → 1 row    (live sanity insert proves RLS write path works)
```

Live insert audit row:
```
id        = a60a5d34-ddd8-4e30-9f1b-fe203229e7b5
eval_name = phase7_live_sanity_check
score     = 1.000
pass_fail = true
phase     = 7
```

## 3. New / Modified Files

### New files (Phase 7)
| Path | Purpose | Size |
|---|---|---|
| `Phase7/README.md` | Phase plan + traceability matrix | 2.0 KB |
| `Phase7/PHASE7_COMPLETION_REPORT.md` | This report | 5.5 KB |
| `Phase7/TEST_CASES_LOG.md` | Detailed test outcomes | 5.0 KB |
| `Phase7/__tests__/phase7-data.test.ts` | Data-access layer mocks | 8.3 KB / 19 tests |
| `Phase7/__tests__/phase7-eval-utils.test.ts` | Scorer + persistence tests | 7.5 KB / 22 tests |
| `Phase7/__tests__/phase7-supabase-client.test.ts` | Lazy-init + Proxy tests | 2.5 KB / 5 tests |
| `Phase7/__tests__/phase7-ai-evals.test.ts` | Phase 7 AI Eval Gate | 6.0 KB / 16 tests |
| `src/lib/supabase.ts` | Lazy-singleton Supabase client + test-only `__resetSupabaseClient()` | 1.9 KB |
| `src/lib/data.ts` | Typed data-access layer (7 query helpers + 4 row mappers) | 7.5 KB |
| `src/lib/eval-utils.ts` | Pure scorers + persistence (`recordEvalResult` / `recordEvalSuite`) | 6.8 KB |
| `scripts/eval-runner.ts` | CLI eval-suite scaffold | 3.5 KB |
| `.env.local` | NEXT_PUBLIC_SUPABASE_URL + publishable key (gitignored) | 0.7 KB |
| `.env.example` | Template for future devs | 0.6 KB |

### Modified files
| Path | Change | Reason |
|---|---|---|
| `src/components/investor-terminal/MarqueeTicker.tsx` | Added `useEffect` live-fetch + `disableLiveFetch` prop; rebalanced MOCK to 5/5/5/5 | Wire to real Supabase data; keep SSR fallback |
| `Phase4/__tests__/phase4-components.test.tsx` | Updated debt-count expectation 4 → 5; added per-category exact counts | Match new 5/5/5/5 universe |
| `src/components/investor-terminal/AIOrb.tsx` | Added `useState`+`useEffect` mount gate inside `PlasmaRipples` | Fix ripple-not-visible-on-first-load bug |

## 4. Supabase Migrations Applied

```
phase7_create_funds
phase7_create_fund_chunks
phase7_create_fee_scenarios
phase7_fee_scenarios_widen_typical_range   (corrective: VARCHAR(128) → TEXT)
phase7_create_approval_queue
phase7_create_eval_results
```

Each new table:
- Has `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- Has RLS **enabled**
- Has an explicit `SELECT` policy granted to `anon, authenticated`
- Writes happen via admin / MCP context (Phase 8+ will add server-side service-role for runtime writes)

## 5. AI Eval Gate Results — Phase 7

Suite: `ux_structure` (Phase 7) — **16/16 passed, aggregate score 1.000**

### Gate 1 — Fund universe structure (5/5 pass)
- E7-1.1 — 20 records in fixture ✅
- E7-1.2 — 5/5/5/5 category balance ✅
- E7-1.3 — All 20 fund_ids unique ✅
- E7-1.4 — Symbols are uppercase ≥3 chars ✅
- E7-1.5 — All NAVs are positive finite ✅

### Gate 2 — Eval-utils correctness (5/5 pass)
- E7-2.1 — exactMatchScore binary ✅
- E7-2.2 — containsScore case-insensitive ✅
- E7-2.3 — keywordCoverageScore partial coverage = 0.5 ✅
- E7-2.4 — compositeScore bounded by inputs ✅
- E7-2.5 — passAt default threshold 0.7 ✅

### Gate 3 — Deliverables import cleanly (4/4 pass)
- E7-3.1 — `src/lib/supabase.ts` exports verified ✅
- E7-3.2 — `src/lib/data.ts` exports all 7 helpers ✅
- E7-3.3 — `src/lib/eval-utils.ts` exports all 9 helpers ✅
- E7-3.4 — `scripts/eval-runner.ts` exports `main()` ✅

### Gate 4 — Suite aggregate (1/1 pass)
- E7-4.1 — Pass rate 100%, aggregate score ≥ 0.95 ✅

## 6. AI Orb Ripple — Bug Fix (parallel to Phase 7)

**Symptom:** Plasma ripple rings did not appear on first page load; reappeared on reload.

**Root cause:** Framer Motion was animating the SVG `r` attribute. During Next.js SSR → hydration, the first paint sometimes raced with Framer's animation initialization, leaving the ripple circles invisible until a re-mount on reload.

**Fix:** `PlasmaRipples` now defers rendering until after the first client mount via `useEffect(() => setMounted(true), [])`. Combined with explicit `initial={{ r, opacity }}` props, the animation always starts deterministically.

```197:227:src/components/investor-terminal/AIOrb.tsx
function PlasmaRipples({ cx, cy, orbRadius, state }: PlasmaRipplesProps) {
  const isThink = state === "THINKING";
  const opacityMult = isThink ? 0.3 : 1.0;

  /* Defer ripple mount until after the client has hydrated.
   * Framer Motion animates the SVG `r` attribute, which can race with
   * SSR hydration on first paint (ripples invisible until reload).
   * Mounting on a useEffect tick guarantees clean animation start. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // ...
}
```

## 7. API Keys — Status

**No additional keys requested from you** in Phase 7. Reason:
- Project URL + publishable key were directly accessible via the Supabase MCP server.
- Write paths (migrations + seeds) went through the MCP admin context.
- Future phases will require:
  - **Phase 8+:** `GEMINI_API_KEY` (Google AI Studio)
  - **Phase 13:** `ELEVENLABS_API_KEY` (voice agent)
  - **Phase 15:** Google Calendar service-account JSON + advisor `GOOGLE_CALENDAR_ID`

These are placeholders in `.env.example`; I will ask you for them when those phases start.

## 8. Known Items / Notes

1. **Pre-existing M2 tables** (`apps`, `reviews`, `categories`, `review_categories`, `ai_replies`, `weekly_pulses`, `fee_explainers`, `sync_logs`) have RLS enabled but no explicit policies. These are inherited from M2 PM Pulsator and are flagged by the Supabase security advisor. **No remediation needed in Phase 7** — Phase 9 (Pillar B integration) will add proper SELECT policies when we begin reading from `reviews` / `weekly_pulses`.

2. **`fee_explainers` table is retained** (untouched) for historical M2 reference. The new `fee_scenarios` table is the authoritative Capstone source per the architecture's exact column shape.

3. **Eval runner CLI is scaffold-only** for Phase 7. Real suites land in Phases 8 (RAG), 10 (Safety), and 15 (Cross-pillar).

4. **MarqueeTicker hybrid model:** The component initializes with the local 20-fund fixture for instant first paint, then upgrades to the live Supabase fetch on mount. This keeps SSR snappy and tests deterministic while ensuring the UI shows real NAVs once loaded.

---

## Manual Testing Checklist (for the user)

Below items can be exercised on `npm run dev`:

- [ ] **Ticker live data** — Watch the marquee at top of Investor Hub. After ~500ms, NAVs and symbols should update to the seeded values (you'll see the 20 funds in alphabetical-by-category order: ABSL-CR, ABSL-MED, AXIS-SILV, …). On first paint you'll see the same names from the fixture, so the change is subtle.
- [ ] **Orb ripple fix** — Hard-refresh the Investor Hub (Ctrl+F5). The plasma ripples should be visible immediately, not requiring a reload.
- [ ] **DevTools network tab** — Filter by `lqfhcyuceyeedebdjedc.supabase.co` to confirm a real fetch is happening to the `funds` table.
- [ ] **Supabase Dashboard** — Open <https://supabase.com/dashboard/project/lqfhcyuceyeedebdjedc/editor> and confirm the 5 new tables exist.
- [ ] **Live insert audit** — In the `eval_results` table, you should see the row `phase7_live_sanity_check` with score 1.000.

Once you're happy, we can proceed to **Phase 8 — RAG Infrastructure & Smart-Sync KB** (which is where `GEMINI_API_KEY` will be needed).
