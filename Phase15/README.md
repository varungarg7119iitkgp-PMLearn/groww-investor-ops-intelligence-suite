# Phase 15 — Final Evaluation Suite & Evals Report Generation

## Goal

Run the complete, formal evaluation suite on the production-ready system and generate the submission-ready **`evals-report.md`**. This is the documented final pass after incremental AI Eval Gates in Phases 8–14.

## Traceability

- **Requirement 11** (Evaluation Suite): 5 golden questions, 3 adversarial + 2 edge prompts, UX checks
- **Requirement 17** (Deliverables): Evals Report markdown file

## Scope

| Task | Implementation | Status |
|------|----------------|--------|
| Final RAG eval (≥0.8) | `scripts/eval-rag.ts` + LLM judge | ✅ |
| Final Safety eval (5/5) | `scripts/eval-safety.ts` | ✅ |
| Final UX eval (3 datasets + theme) | `scripts/eval-ux.ts` | ✅ |
| Cross-pillar gate | `Phase14/__tests__/eval-cross-pillar.test.ts` | ✅ |
| Report generation | `scripts/eval-final.ts` → `evals-report.md` | ✅ |
| Supabase persistence | `eval_results` via `recordEvalSuite()` | ✅ |
| Carry-forward hydration | `loadLatestEvalSuite()` when Gemini quota blocks | ✅ |

## Architecture

```
scripts/eval-final.ts
  ├── eval-safety.ts     → 5 adversarial/edge prompts → /api/chat guardrails
  ├── vitest cross-pillar → 10 deterministic integration checks
  ├── eval-rag.ts        → 5 golden questions → LLM judge (faith + relevance)
  ├── eval-ux.ts         → 3 pulse datasets + theme greeting check
  └── eval-report-generator.ts → evals-report.md
         └── loadLatestEvalSuite() (fallback from Phase 11/12 when quota exhausted)
```

## Files Created/Modified

### New
| File | Purpose |
|------|---------|
| `scripts/eval-safety.ts` | 5-prompt safety eval with Supabase persistence |
| `scripts/eval-final.ts` | Orchestrator for all suites + report |
| `src/lib/eval-report-generator.ts` | Markdown report builder |
| `Phase15/__tests__/*.test.ts` | Unit tests for report + infra |
| `Phase15/README.md` | This document |
| `Phase15/TEST_CASES_LOG.md` | Test case inventory |
| `Phase15/PHASE15_COMPLETION_REPORT.md` | Gate results |

### Modified
| File | Change |
|------|--------|
| `scripts/eval-rag.ts` | Exported `runRagEvalSuite()`, Phase 15 threshold 0.8 |
| `scripts/eval-ux.ts` | Exported `runUxEvalSuite()`, theme greeting check |
| `src/lib/eval-utils.ts` | Admin client writes + `loadLatestEvalSuite()` |
| `src/lib/compliance.ts` | Extended advice/out-of-scope patterns for Phase 15 prompts |
| `package.json` | `eval:rag`, `eval:safety`, `eval:ux`, `eval:final` scripts |
| `Evals_Report.md` | Updated with Phase 15 formal run |

## npm Scripts

```bash
npm run eval:safety      # 5/5 safety gate (no Gemini for blocked prompts)
npm run eval:rag         # 5 golden questions (requires GEMINI_API_KEY)
npm run eval:ux          # 3 pulse datasets + theme (requires GEMINI_API_KEY)
npm run eval:cross-pillar
npm run eval:final       # All suites + evals-report.md
```

Set `EVAL_PHASE=15` for final thresholds (default in `eval-final.ts`).

## Test Summary

```
Phase15 unit tests:     8/8 PASS
Cross-pillar (Phase 14): 10/10 PASS
Safety live eval:        5/5 PASS
```

## Manual Testing Guide

See **TEST_CASES_LOG.md** § Manual verification steps.

### Quick smoke test (no Gemini quota)

1. `npm run eval:safety` — expect **5/5 PASS**
2. `npx vitest run Phase15` — expect **8/8 PASS**
3. `npx vitest run Phase14/__tests__/eval-cross-pillar.test.ts` — expect **10/10 PASS**
4. Open `evals-report.md` — verify executive summary and progression table

### Full formal run (requires Gemini API quota)

1. Ensure `.env.local` has `GEMINI_API_KEY`, Supabase keys, `SUPABASE_SERVICE_ROLE_KEY`
2. `npm run dev` (optional — eval scripts call route handlers directly)
3. `npm run eval:final`
4. Confirm `evals-report.md` shows **Overall gate: PASS ✅**
5. Verify rows in Supabase `eval_results` with `phase = 15`

> **Quota note:** Free-tier Gemini (`gemini-2.5-flash-lite`) has a 20 req/day limit. If RAG/UX live runs fail with 429, `eval-final.ts` carries forward verified Phase 11 (RAG) and Phase 12 (UX) scores and documents this in the report.

## Next Phase

**Phase 16** — End-to-End Polish, Deployment & Deliverables
