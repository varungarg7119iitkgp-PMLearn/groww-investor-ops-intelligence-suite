# Phase 10 — Voice Agent: State Machine & MCP Tools

> **Goal:** Implement the 7-step conversation state machine, 5-intent routing, 5-topic taxonomy, and three MCP-inspired tools (Calendar, Preparation Retriever, Notes Extractor). After this phase, the voice-agent backend logic works end-to-end via API calls.

## Traceability

| Architecture | Requirement | Phase 10 Deliverable |
|---|---|---|
| Phase 10 §state-machine.ts | Req 5 | `src/lib/state-machine.ts` |
| Phase 10 §calendar.ts | Req 5 (Tools) | `src/tools/calendar.ts` |
| Phase 10 §rag-retriever.ts (prep) | Req 4 / 5 | `src/tools/preparation-retriever.ts` + `preparation-data.json` |
| Phase 10 §notes-extractor.ts | Req 5 (Booking Code) | `src/tools/notes-extractor.ts` |
| Phase 10 §Voice prompts | Req 4 (Voice lifecycle) | `src/lib/prompts.ts` (added) |
| Phase 10 §Function declarations | Req 5 | `src/lib/voice-tools.ts` (decls + dispatcher) |

> **Note on naming**: The architecture says `rag-retriever.ts` for the prep-data tool. Phase 8 already owns that filename for fund-chunk TF-IDF retrieval. To avoid a naming collision we keep Phase 8's `rag-retriever.ts` for the **fund-fact KB** and add a **separate** `preparation-retriever.ts` for the voice prep docs. Both expose the same `RAGResult` shape so callers can be uniform.

## Deliverables

1. `src/lib/state-machine.ts`
   - `getNextState(currentStep, intent, opts)` — outer 7-step transitions
   - `isValidTransition(from, to)` — explicit allow-list
   - `getPromptForState(step, ctx)` — system prompt slice per step
   - `classifyIntent(userInput)` — keyword classifier returning `IntentType`
   - `isValidTopic(s)` — narrow string → `TopicType` guard
   - `generateMockSlots(count = 2)` — **exactly 2** future ISO slots
   - `getRephraseForState(step, strike)` — 3-strike escalation strings
   - `SILENCE_TIMEOUTS` (re-exported from `types`)

2. `src/tools/preparation-retriever.ts` (Voice prep-doc RAG)
   - Reads `preparation-data.json`
   - `getPreparationDocs(topic, query?)` → top docs
   - Falls back to keyword scoring if no exact topic match

3. `src/tools/preparation-data.json`
   - 5 topics × ≥ 2 docs each
   - Each doc: `{ topic, title, content, source, lastUpdated }`

4. `src/tools/notes-extractor.ts`
   - `generateBookingCode()` → `NL-[A-Z0-9]{4}` (crypto-random, in-session uniqueness)
   - `generateBookingCodeAndNotes(input)` → `BookingSummary` with PII-redacted notes

5. `src/tools/calendar.ts`
   - Google Service Account auth via `googleapis` (lazy singleton)
   - `createCalendarEvent(payload)` with 1 retry on transient failure
   - In test / no-credentials mode returns a deterministic mock event

6. `src/lib/prompts.ts` (additions)
   - `buildVoiceSystemPrompt(ctx)` — 7-step rules, one-question-per-turn, ack pattern, closing pattern
   - `getVoicePromptForState(step)` — re-exposes state-machine's per-step prompt

7. `src/lib/voice-tools.ts`
   - 3 Gemini Function Declarations (`createCalendarEvent`, `getPreparationDocs`, `generateBookingCodeAndNotes`)
   - `executeVoiceToolCall(name, args, ctx)` dispatcher used by Phase 11 chat() loop

## Verification (per Architecture §Phase 10)

- [ ] Unit tests: all valid state transitions
- [ ] Unit tests: invalid transitions rejected
- [ ] Unit tests: `generateMockSlots()` returns exactly 2
- [ ] Property tests: state machine never enters undefined state (100 iterations)
- [ ] Property tests: 100 booking codes match `/^NL-[A-Z0-9]{4}$/` and are unique
- [ ] Calendar tool: creates event with all required fields (mock mode)
- [ ] Prep RAG: returns docs for all 5 topics
- [ ] Function dispatcher: routes to all 3 tools correctly

## Out of scope (deferred to Phase 11)

- Live Gemini Function Calling loop (Phase 11 wires it via `gemini.chat()`)
- `/api/voice` STT + TTS proxy (Phase 11)
- Frontend hooks (`useVoiceInteraction`, `useAudioAnalyzer`, `useConversation`) (Phase 11)
