# Phase 8 — Test Cases Log

**Generated:** 2026-05-24
**Vitest run:** `npx vitest run` — **666 / 666 tests passing**
**Phase 8 contribution:** 160 new tests across 8 files

---

## Summary

| Suite | Tests | Pass | Fail |
|---|---|---|---|
| `phase8-rag-retriever.test.ts` | 19 | 19 | 0 |
| `phase8-fund-identifier.test.ts` | 10 | 10 | 0 |
| `phase8-fee-explainer.test.ts` | 21 | 21 | 0 |
| `phase8-compliance.test.ts` | 56 | 56 | 0 |
| `phase8-gemini.test.ts` | 12 | 12 | 0 |
| `phase8-prompts.test.ts` | 12 | 12 | 0 |
| `phase8-chat-route.test.ts` | 15 | 15 | 0 |
| `phase8-chat-terminal.test.tsx` | 5 | 5 | 0 |
| `phase8-ai-evals.test.ts` | 14 | 14 | 0 (Tier 1 eval gate ✅) |
| **TOTAL Phase 8** | **160** | **160** | **0** |
| Existing (Phases 1–7) | 506 | 506 | 0 |
| **TOTAL** | **666** | **666** | **0** |

---

## 1. `phase8-rag-retriever.test.ts` — TF-IDF retriever (19 tests)

### `tokenize()`
- ✅ lowercases, splits on non-alphanumeric, drops stopwords
- ✅ returns [] for empty input
- ✅ drops 1-char tokens

### `termFrequency()`
- ✅ counts term occurrences

### `buildIndex()`
- ✅ indexes all 6 mock chunks (N=6)
- ✅ is idempotent (same instance on second call)
- ✅ `__resetIndex` forces a rebuild
- ✅ `getIndexStats` reports vocab + builtAt

### `retrieveTopK()`
- ✅ returns top-k chunks ranked by cosine similarity
- ✅ respects k cap (clamps to [1, 16])
- ✅ filters by `fundIds` allowlist
- ✅ filters by `chunkTypes`
- ✅ filters by `categories`
- ✅ respects `minScore`
- ✅ returns [] when query has only OOV terms
- ✅ returns [] when query is empty / whitespace
- ✅ scores HDFC vs Axis differently for HDFC-specific query
- ✅ performance chunks rank near top for performance-keyword queries
- ✅ sorted descending by score

---

## 2. `phase8-fund-identifier.test.ts` — Fund identifier (10 tests)

- ✅ returns none for empty input
- ✅ matches an exact fund name (alias)
- ✅ matches by alias substring
- ✅ can match multiple funds at once
- ✅ falls back to category when no fund alias hits
- ✅ returns "none" for off-topic queries
- ✅ is case-insensitive
- ✅ matched aliases are returned for transparency
- ✅ symbol match works
- ✅ category-fallback returns all funds in matched category

---

## 3. `phase8-fee-explainer.test.ts` — Fee Explainer (21 tests)

### `detectFeeScenarios()`
- ✅ detects expense_ratio queries (3 variants)
- ✅ detects exit_load queries (2 variants)
- ✅ detects tcs queries (2 variants)
- ✅ detects brokerage queries (2 variants)
- ✅ detects account_maintenance queries (2 variants)
- ✅ returns empty for non-fee queries
- ✅ returns multiple scenarios when query mentions multiple

### `isFeeQuery()`
- ✅ true for any fee phrase
- ✅ false otherwise

### `explainScenario()`
- ✅ returns a block for a known scenario

### `explainFees()`
- ✅ returns empty for non-fee queries
- ✅ returns one block for one scenario
- ✅ merges multiple scenarios into one markdown block
- ✅ never exceeds 6 bullets per block
- ✅ exactly 2 source URLs per block
- ✅ includes lastChecked date per block

---

## 4. `phase8-compliance.test.ts` — Compliance v1 (56 tests)

### `isAdviceRequest()` — 23 positive cases
All 22 representative advice-seeking phrases blocked, plus the empty input case.

### `isAdviceRequest()` — 5 negative cases (factual)
- ✅ "What is the expense ratio of HDFC Silver ETF?"
- ✅ "Tell me about HDFC Hybrid Equity Fund performance"
- ✅ "What is the NAV of Axis Silver FoF?"
- ✅ "Compare exit loads across PSU funds"
- ✅ "What is TCS on overseas funds?"

### `isOutOfScope()` — 13 positive cases
crypto, BTC, Ethereum, real estate, REIT, individual stocks, forex, options, term insurance, personal loan, home loan, credit card, NFT, commodity futures.

### `isOutOfScope()` — 1 negative case
- ✅ "HDFC Silver ETF commodity fund details" (legitimate mutual-fund query)

### `detectMinimalPII()` — 5 cases
- ✅ detects emails
- ✅ detects phone numbers (10–13 digits)
- ✅ does NOT detect short numbers (NAVs, percentages)
- ✅ does NOT detect dates
- ✅ returns empty for empty input

### `runInputGuard()` — 5 cases
- ✅ passes factual queries
- ✅ blocks advice queries with type=advice
- ✅ blocks out-of-scope queries with type=out_of_scope
- ✅ blocks PII queries with type=pii
- ✅ passes empty input (handled upstream)

### `runOutputGuard()` — 4 cases
- ✅ passes neutral output
- ✅ blocks advice output (defense-in-depth, second-person)
- ✅ blocks PII in output
- ✅ passes empty output

---

## 5. `phase8-gemini.test.ts` — Gemini wrapper (12 tests)

### `generateContent()`
- ✅ returns text on success (model = `gemini-2.5-flash-lite`)
- ✅ retries on transient failure and eventually succeeds
- ✅ throws after exhausting retries
- ✅ treats empty response as failure
- ✅ throws when `GEMINI_API_KEY` is missing
- ✅ respects the timeout

### `parseJson()`
- ✅ parses bare JSON
- ✅ strips ```json fences
- ✅ strips ``` fences (no lang tag)
- ✅ throws on non-JSON content
- ✅ throws on malformed JSON
- ✅ parses arrays

---

## 6. `phase8-prompts.test.ts` — Prompt builders (12 tests)

### `buildSmartSyncPrompt()`
- ✅ includes the user query verbatim
- ✅ renders numbered sources with fund_id / fund / section / URL / content
- ✅ includes the fee block ONLY when feeFlag=true AND feeBlock non-empty
- ✅ declares the JSON schema with 6 bullets
- ✅ includes the no-advice rule (literal phrase "no advice")
- ✅ renders the timestamp
- ✅ handles empty chunks (no retrieval)

### `buildOutOfScopeResponse()`
- ✅ returns exactly 6 bullets, no citations, inScope=false
- ✅ includes the user query (truncated)

### `buildAdviceBlockResponse()`
- ✅ returns exactly 6 bullets, advice_block flag
- ✅ explicitly mentions SEBI-registered advisor

### `buildLLMJudgePrompt()`
- ✅ includes query / answer / sources sections

---

## 7. `phase8-chat-route.test.ts` — `/api/chat` orchestrator (15 tests)

### Happy path
- ✅ returns 6-bullet response with citations + lastUpdated
- ✅ pads bullets to 6 when Gemini returns fewer
- ✅ truncates bullets to 6 when Gemini returns more
- ✅ falls back to retrieved-chunk citation when Gemini returns none
- ✅ strips ```json fences from Gemini output

### Input guardrails
- ✅ blocks advice queries (complianceFlag=advice_block, no Gemini call)
- ✅ blocks out-of-scope queries (complianceFlag=out_of_scope, no Gemini call)
- ✅ blocks PII-containing queries (complianceFlag=pii_block, no Gemini call)

### Output guardrail
- ✅ re-routes to advice_block when Gemini output contains advice phrasing

### Input validation
- ✅ returns 400 for invalid JSON body
- ✅ returns 400 for missing query
- ✅ returns 400 for empty query
- ✅ returns 400 for over-long query (>1000 chars)

### Error paths
- ✅ returns 500 when Gemini fails
- ✅ returns 500 with json-parse error when Gemini returns garbage

---

## 8. `phase8-chat-terminal.test.tsx` — UI wiring (5 tests)

### `BulletResponse — Phase 8 lastUpdated`
- ✅ renders the lastUpdated footer when an ISO timestamp is provided
- ✅ does NOT render the footer when lastUpdated is absent
- ✅ falls back to raw ISO if `Date.parse` fails

### `ChatTerminal — Phase 8 lastUpdatedByMessageId`
- ✅ propagates lastUpdated to the right MessageRow only
- ✅ accepts no `lastUpdatedByMessageId` prop (back-compat)

---

## 9. `phase8-ai-evals.test.ts` — AI Eval Gate · RAG Accuracy Tier 1 (14 tests)

### Tier 1 — Structural retrieval (5 golden questions)
- ✅ E8-RAG-1 — "Expense ratio of HDFC Silver vs Axis Silver" (composite ≥ 0.7)
- ✅ E8-RAG-2 — "Exit load for equity funds, why charged after 3 years" (composite ≥ 0.7)
- ✅ E8-RAG-3 — "Compare 3-year returns debt vs equity" (composite ≥ 0.7)
- ✅ E8-RAG-4 — "TCS + highest expense ratio funds" (composite ≥ 0.7)
- ✅ E8-RAG-5 — "Risk level of commodity vs hybrid funds" (composite ≥ 0.7)

### Tier 2 — Module presence
- ✅ E8-2.1 — `rag-retriever` exports `retrieveTopK` + `buildIndex`
- ✅ E8-2.2 — `fee-explainer` exports `explainFees` + `isFeeQuery`
- ✅ E8-2.3 — `compliance` exports `runInputGuard` + `runOutputGuard`
- ✅ E8-2.4 — `fund-identifier` exports `identifyFunds`
- ✅ E8-2.5 — `gemini` exports `generateContent` + `parseJson`
- ✅ E8-2.6 — `prompts` exports all 4 builders
- ✅ E8-2.7 — `/api/chat` route exports `POST`

### Aggregate gate
- ✅ E8-AGG-1 — aggregate score ≥ 0.7 (Faithfulness floor)
- ✅ E8-AGG-2 — pass rate ≥ 0.7 (Relevance floor)
- ✅ E8-AGG-3 — all 5 golden questions executed

---

## 10. Live `/api/chat` Smoke Tests (manual, not vitest)

Run during Phase 8 integration verification on `localhost:3001`:

| Query | Status | complianceFlag | bullets | citations | model | latency |
|---|---|---|---|---|---|---|
| "What is the expense ratio of HDFC Silver ETF FoF?" | 200 | ok | 6 | 3–4 | gemini-2.5-flash-lite | ~12–14 s |
| "Should I buy HDFC Silver ETF?" | 200 | advice_block | 6 | 0 | guardrail | 1 ms |
| "Tell me about Bitcoin prices" | 200 | out_of_scope | 6 | 0 | guardrail | 0 ms |
| "Risk profiles of commodity vs hybrid funds" | 200 | ok | 6 | 4 | gemini-2.5-flash-lite | ~14 s |

---

## 11. Regression check

`Phase1`–`Phase7` test suites — all green. Phase 8 introduced no regressions.

---

## 12. Tier-2 LLM-judge runner (`scripts/eval-rag.ts`)

Decoupled from `npm test`. Manual invocation:

```bash
npx tsx scripts/eval-rag.ts
```

Output: 10 rows persisted to `eval_results` (5 questions × 2 metrics each: faithfulness, relevance). Pass criterion: aggregate ≥ 0.7 AND pass rate ≥ 0.7.

**Not invoked automatically in CI** to preserve Gemini free-tier quota — operator runs it on demand once per phase milestone.
