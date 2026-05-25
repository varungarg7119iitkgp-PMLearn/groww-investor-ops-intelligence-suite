# Phase 12 — Test Cases Log

## Summary

| Metric | Result |
| ------ | ------ |
| Phase 12 unit + integration tests | **57 / 57 PASS** |
| UX AI Eval Gate (live Gemini, 3 datasets) | **3 / 3 PASS** |
| RLS migration (reviews + weekly_pulses) | Applied ✅ |

## phase12-pulse-validator.test.ts (22 tests)

| Case | Result |
| ---- | ------ |
| `countWords` empty / whitespace / tokens | ✅ |
| Valid candidate passes all Req 6 constraints | ✅ |
| Scrubbed copy returned on pass | ✅ |
| Word limit > 250 rejected | ✅ |
| Missing summary rejected | ✅ |
| Quote count ≠ 3 rejected | ✅ |
| Action count ≠ 3 rejected | ✅ |
| Theme count 0 or > 5 rejected | ✅ |
| Top-three marking enforced | ✅ |
| `<3` themes → all must be `isTopThree` | ✅ |
| PII in summary / quote / action flagged | ✅ |
| Scrubbed copy redacts PII on failure | ✅ |
| Advice phrasing in summary / actions flagged | ✅ |
| Duplicate action verbs flagged | ✅ |
| Verbatim quote-from-reviews check | ✅ |
| Property: never accepts > 250 words (50 runs) | ✅ |
| Property: accepts ≤ 250 when rest valid (30 runs) | ✅ |

## phase12-csv-parser.test.ts (10 tests)

| Case | Result |
| ---- | ------ |
| Simple CSV block parse | ✅ |
| Quoted fields with commas | ✅ |
| Blank trailing rows ignored | ✅ |
| CRLF line endings | ✅ |
| Canonical headers | ✅ |
| Alias headers (`review_id`, `rating`, `text`) | ✅ |
| PII scrub + `piiHits` counter | ✅ |
| Skip rows missing text/rating | ✅ |
| Throw on missing required column | ✅ |
| Derive sentiment from star rating | ✅ |

## phase12-prompts.test.ts (5 tests)

| Case | Result |
| ---- | ------ |
| Strict JSON schema in prompt | ✅ |
| Req 6 hard limits declared | ✅ |
| Caps embedded reviews at 200 | ✅ |
| Regeneration block when `rerollReason` set | ✅ |
| Empty review list placeholder | ✅ |

## phase12-pulse-route.test.ts (6 tests)

| Case | Result |
| ---- | ------ |
| Happy path → 200 + inserted pulse | ✅ |
| Retry on word-limit violation (attempt 2) | ✅ |
| 422 after 3 failed attempts | ✅ |
| 503 when DB review count < 10 | ✅ |
| 503 when `reviewsOverride` < 10 | ✅ |
| Malformed JSON → retry → success | ✅ |

## phase12-reviews-upload.test.ts (4 tests)

| Case | Result |
| ---- | ------ |
| JSON body with `csv` string | ✅ |
| JSON body with `rows` array | ✅ |
| Reject body without `csv` or `rows` | ✅ |
| PII hits counted + scrubbed before insert | ✅ |

## phase12-fee-explainer-route.test.ts (5 tests)

| Case | Result |
| ---- | ------ |
| Known scenario → explainer payload | ✅ |
| Bullets trimmed to ≤ 6 | ✅ |
| 400 on unknown scenario | ✅ |
| `type=all` returns all 5 explainers | ✅ |
| 404 when DB row missing | ✅ |

## phase12-ux-evals.test.ts (5 tests)

| Case | Result |
| ---- | ------ |
| Dataset 15: word / quotes / actions / themes / PII | ✅ |
| Dataset 50: word / quotes / actions / themes / PII | ✅ |
| Dataset 100: word / quotes / actions / themes / PII | ✅ |
| Consistency: 3 runs same dataset | ✅ |
| Gate summary banner | ✅ |

## Live UX Eval — `npx tsx scripts/eval-ux.ts`

| Dataset | Words | Quotes | Actions | Themes | PII | Attempts | Result |
| ------- | ----- | ------ | ------- | ------ | --- | -------- | ------ |
| 15 reviews | 64/250 | 3 | 3 | 3 | 0 | 1 | ✅ |
| 50 reviews | 86/250 | 3 | 3 | 3 | 0 | 1 | ✅ |
| 100 reviews | 88/250 | 3 | 3 | 3 | 0 | 1 | ✅ |

**Gate: PASS ✅**
