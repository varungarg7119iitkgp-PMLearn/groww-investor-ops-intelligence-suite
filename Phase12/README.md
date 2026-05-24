# Phase 12 — Weekly Pulse & Fee Explainer Engine

## Scope

Implement the Weekly Pulse generation pipeline (CSV upload → AI analysis → structured output)
and the standalone Fee Explainer in Director Ops. After this phase, the left column of
Director Ops is fully functional.

## Traceability

- **Req 6** (Weekly Pulse): ≤ 250 words · max 5 themes (top 3 highlighted) · exactly 3 quotes · exactly 3 actions · PII-free
- **Req 7** (Fee Explainer): ≤ 6 bullets · neutral tone · exactly 2 source URLs · "Last checked: YYYY-MM-DD" · 5 scenario types
- **Architecture Phase 12**: `api/pulse/route.ts`, CSV processing, structured-output prompt, validation retry, theme → Zustand

## Tasks

| # | Task | File |
|---|---|---|
| 1 | App-ID constant + reviews / pulse data helpers | `src/lib/constants.ts`, `src/lib/data.ts` |
| 2 | Pulse generation prompt (structured-output) | `src/lib/prompts.ts::buildPulseGenerationPrompt` |
| 3 | Pulse validator (≤ 250 w, == 3 quotes, == 3 actions, ≤ 5 themes, PII-free) | `src/lib/pulse-validator.ts` |
| 4 | Pulse generation API with retry-up-to-3 | `src/app/api/pulse/generate/route.ts` |
| 5 | CSV ingest with PII sanitization | `src/app/api/reviews/upload/route.ts` |
| 6 | Fee Explainer standalone Director-Ops UI + API | `src/components/director-ops/FeeExplainerCard.tsx`, `src/app/api/fee-explainer/route.ts` |
| 7 | Wire `DirectorOpsConsole`: PulseBriefing + CsvUploader + Zustand | `src/components/director-ops/DirectorOpsConsole.tsx`, `src/lib/store.ts` |
| 8 | Tests: unit + property + structured constraints | `Phase12/__tests__/` |
| 9 | UX AI Eval Gate (3 datasets, 5 tests) | `scripts/eval-ux.ts` + `Phase12/__tests__/phase12-ux-evals.test.ts` |

## Architecture Decisions

- **Top theme** persisted in Zustand `sharedState.topTheme` AND read live from Supabase
  for cross-pillar bridge (already wired in Phase 11 via `getLatestPulseTheme`).
- **Apps table FK**: `GROWW_APP_ID = "0e648d69-be08-4be2-8f19-fe9b42addd6a"` (existing 1-row table).
- **CSV ingest** runs through `redactPII()` from Phase 9 before inserting into `reviews`.
- **Pulse generation** uses Gemini Function Calling — strict JSON output, validated with
  Zod, retried up to 3× on constraint violation.
- **Fee Explainer** does NOT use Gemini at runtime (5 scenarios pre-seeded in `fee_scenarios`);
  the Director-Ops card surfaces them on demand, mirroring the `/api/chat` fee_explainer tool.

## Verification (architecture §Phase 12)

- [ ] Upload CSV (15+ rows) → pulse generates successfully
- [ ] Pulse word count ≤ 250 (UI readout green)
- [ ] Exactly 3 quotes, exactly 3 actions
- [ ] ≤ 5 themes, top 3 marked `isTopThree`
- [ ] PII removed from reviews + pulse output
- [ ] Fee Explainer ≤ 6 bullets + 2 source URLs
- [ ] Zustand `topTheme` updated on pulse generation

## AI Eval Gate — UX Structure

5 tests × 3 datasets (15 / 50 / 100 reviews). Pass criteria:

1. word count ≤ 250 for every run
2. exactly 3 action ideas
3. exactly 3 quotes
4. 1 ≤ theme count ≤ 5
5. zero PII matches in any output field

**Consistency check:** Run 3× on the same dataset; all constraints hold every run.
