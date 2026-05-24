# Phase 7 — Data Layer & Supabase Setup

> **Goal:** Provision Supabase PostgreSQL with all required tables, seed the 20-fund universe, generate 100 RAG chunks, seed the 5-scenario fee taxonomy, and establish a typed data-access layer. After Phase 7, fund data is queryable, the ticker shows real NAVs from Supabase, and the eval infrastructure is ready to record results for downstream phases.

## Traceability

| Architecture | Requirement | Phase 7 Deliverable |
|---|---|---|
| Phase 7 — Data Layer | Req 2 (Data Layer): Supabase schema, chunking | Tables + seed |
| Phase 7 — Data Layer | Req 12 (Ticker): 20 funds | `getFunds()` + wired `MarqueeTicker` |
| Phase 7 — Eval Infra | Req 11 (Evaluation Suite) | `eval_results` table + `lib/eval-utils.ts` + `scripts/` |

## Existing Supabase State (Reused from M2 PM Pulsator)

The Supabase project is already provisioned and contains M2's PM Pulsator data:

| Table | Rows | Reuse? |
|---|---|---|
| `apps` | 1 | ✓ |
| `reviews` | 8,204 | ✓ (Pillar B sentiment + chat-query analysis later) |
| `categories` | 20 | ✓ (category taxonomy) |
| `review_categories` | 904 | ✓ |
| `weekly_pulses` | 0 | ✓ (schema matches spec) |
| `fee_explainers` | 0 | Kept; new `fee_scenarios` table created per Capstone spec |
| `ai_replies` | 0 | ✓ |
| `sync_logs` | 126 | ✓ |

## New Tables Created (Phase 7)

1. **`funds`** — 20-fund master record (id, fund_id, name, symbol, category enum, NAV, change, alias array, source URLs)
2. **`fund_chunks`** — 100 RAG chunks (fund_id FK, chunk_type enum [overview/performance/fees_loads/risk/news], content, source_urls, metadata jsonb)
3. **`fee_scenarios`** — 5 scenarios per Capstone spec (expense_ratio, exit_load, tcs, brokerage, account_maintenance) with bullets + exactly-2 source URLs
4. **`approval_queue`** — Booking HITL queue (booking_code, redacted name, topic, slot, advisor email, email draft, market context, status)
5. **`eval_results`** — Eval recording (eval_type, eval_name, input, expected, actual, score 0-1, pass_fail, phase, timestamp)

All new tables enable RLS with `SELECT` policy for anon role (read-only for client). Writes happen server-side via admin/MCP.

## Deliverables Checklist

- [x] Supabase project with all tables (funds, fund_chunks, fee_scenarios, approval_queue, eval_results)
- [x] 20 funds seeded (5 debt + 5 commodity + 5 hybrid + 5 equity)
- [x] 100 RAG chunks (5 types × 20 funds)
- [x] 5 fee scenarios seeded
- [x] `src/lib/supabase.ts` (browser client) + `src/lib/supabase-admin.ts` (server-only admin client w/ service role guard)
- [x] `src/lib/data.ts` data-access functions: `getFunds()`, `getFundChunks(fundId, chunkType)`, `getFeeScenario(type)`, `getLatestPulse()`, `getTickerData()`
- [x] `src/lib/eval-utils.ts` with `recordEvalResult()`, `runEvalSuite()`, scoring helpers
- [x] `scripts/eval-runner.ts` scaffolding
- [x] `MarqueeTicker` wired to live Supabase data via server component
- [x] `.env.local` configured (NEXT_PUBLIC_SUPABASE_URL + publishable key)
- [x] Unit tests (data access, eval utils)
- [x] AI Eval Gate — Phase 7

## Verification (per Architecture)

- [x] All tables exist with correct schema (incl. `eval_results`)
- [x] `getFunds()` returns 20 records
- [x] `getFundChunks('fund_id', 'performance')` returns relevant chunks
- [x] Ticker shows real fund names and NAVs
- [x] Fee scenarios queryable for all 5 types
- [x] `eval_results` table accepts test inserts
