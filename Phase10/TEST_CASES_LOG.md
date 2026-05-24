# Phase 10 — Test Cases Log

## Summary
- **103 tests** across 5 suites, all passing
- TypeScript: clean (`npx tsc --noEmit`)
- ESLint: clean for all new modules

## phase10-state-machine.test.ts (65 tests)

| Suite | Cases | Result |
|---|---|---|
| `isValidTransition()` | 11 (8 allowed + 3 rejected) | ✅ |
| `getNextState()` | 14 (all step × intent paths) | ✅ |
| `classifyIntent()` | 6 (empty/general/booking×3/complaint×2/faq×2/garbled) | ✅ |
| `classifyTopic() + isValidTopic()` | 6 (1 type-guard + 5 topics + undefined) | ✅ |
| `generateMockSlots()` | 6 (default, count=1, clamp, ISO format, future, exact times, weekend) | ✅ |
| `getRephraseForState()` | 5 (3-strike + booking topic + booking confirmation) | ✅ |
| `getPromptForState()` | 12 (1 per step + 5 context variations) | ✅ |
| `SILENCE_TIMEOUTS` | 1 | ✅ |
| **PROPERTY: 100-iter random walk** | 1 | ✅ |

## phase10-preparation-retriever.test.ts (14 tests)

| Case | Result |
|---|---|
| 5 topics × ≥ 1 doc | ✅ |
| default k=2 | ✅ |
| k=1 | ✅ |
| invalid topic | ✅ |
| query filter ranking | ✅ |
| empty-query order | ✅ |
| processingMs finite | ✅ |
| metadata helpers (listTopics, getDocCounts, getPrepDataMeta) | ✅ |

## phase10-notes-extractor.test.ts (8 tests)

| Case | Result |
|---|---|
| Code matches `NL-[A-Z0-9]{4}` | ✅ |
| `isValidGeneratedCode` | ✅ |
| **PROPERTY: 100 codes, all match + unique** | ✅ |
| `resetSessionState` works | ✅ |
| `generateBookingCodeAndNotes` returns canonical fields | ✅ |
| PII scrubbed from contextNotes | ✅ |
| Empty contextNotes preserved | ✅ |
| Custom advisorEmail propagates | ✅ |

## phase10-calendar.test.ts (4 tests)

| Case | Result |
|---|---|
| Mock-mode event has all required fields | ✅ |
| Mock event id is deterministic | ✅ |
| `buildCalendarPayload` constructs valid payload | ✅ |
| 30-min default duration | ✅ |

## phase10-voice-tools.test.ts (12 tests)

| Case | Result |
|---|---|
| 3 declarations registered | ✅ |
| All declarations have required shape | ✅ |
| Each tool requires correct fields | ✅ |
| Dispatcher routes `get_preparation_docs` | ✅ |
| Dispatcher rejects invalid topic | ✅ |
| Dispatcher routes `generate_booking_code_and_notes` (+ NL-XXXX) | ✅ |
| Dispatcher PII-scrubs in `generate_booking_code_and_notes` | ✅ |
| Dispatcher routes `create_calendar_event` (mock) | ✅ |
| Dispatcher rejects bad bookingCode format | ✅ |
| Unknown tool name → ok:false | ✅ |

## Total Project Tests After Phase 10

`npx vitest run` → **833 / 833 PASS**
