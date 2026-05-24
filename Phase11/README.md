# Phase 11 — Gemini Integration & Full API Wiring

> **Goal:** Wire the Gemini Function-Calling loop, the `/api/voice` route (ElevenLabs STT + TTS proxy), the voice-conversation `/api/voice/converse` orchestrator, and the frontend hooks (`useVoiceInteraction`, `useAudioAnalyzer`, `useConversation`). After Phase 11, both **text chat** and **voice** interactions work end-to-end with theme-aware greetings, AI-Orb state sync, and a text fallback when the mic is unavailable.

## Traceability

| Architecture | Requirement | Phase 11 Deliverable |
|---|---|---|
| Phase 11 §gemini.ts | Req 3 | `chat()` wrapper with Function-Calling loop |
| Phase 11 §/api/chat enhancement | Req 3 / 10 | already Phase 8 + 9; verified in re-eval |
| Phase 11 §useVoiceInteraction | Req 4 | `src/hooks/useVoiceInteraction.ts` |
| Phase 11 §useAudioAnalyzer | Req 4 | `src/hooks/useAudioAnalyzer.ts` |
| Phase 11 §useConversation | Req 4 / 5 | `src/hooks/useConversation.ts` |
| Phase 11 §/api/voice STT+TTS | Req 4 | `src/app/api/voice/stt/route.ts` + `src/app/api/voice/tts/route.ts` |
| Phase 11 §voice orchestration | Req 5 | `src/app/api/voice/converse/route.ts` |
| Phase 11 §theme-aware greeting | Req 4 | `src/lib/data.ts` (`getLatestPulseTheme`) |
| Phase 11 §RAG re-eval (target ≥0.8) | Req 11 | `scripts/eval-rag.ts` re-run |
| Phase 11 §Safety re-eval (3/3 + 2 edge) | Req 10 / 11 | `Phase11/__tests__/phase11-safety-evals.test.ts` |

## Deliverables

1. **`src/lib/gemini.ts`** — add `chat()` wrapper with Function-Calling loop (up to 4 tool turns)
2. **`src/app/api/voice/tts/route.ts`** — ElevenLabs TTS proxy (text → mp3 stream)
3. **`src/app/api/voice/stt/route.ts`** — ElevenLabs STT proxy (audio → transcript)
4. **`src/app/api/voice/converse/route.ts`** — voice agent orchestrator (state machine + Gemini + tools)
5. **`src/hooks/useAudioAnalyzer.ts`** — Web Audio API mic-level → orb audio level 0–1
6. **`src/hooks/useVoiceInteraction.ts`** — mic capture + STT + TTS playback + orb state sync
7. **`src/hooks/useConversation.ts`** — turn-by-turn state machine + Gemini calls + theme greeting
8. **`src/lib/data.ts`** — add `getLatestPulseTheme()` for Pillar B → C link
9. **Frontend wiring** — `InvestorTerminal` gets a voice toggle that opens the AI Orb to live voice; text fallback when mic unavailable
10. **Re-eval RAG** (Tier-2 LLM judge, target ≥ 0.8) + **Safety re-eval** (3 base + 2 edge cases)

## Verification (per Architecture §Phase 11)

- [ ] Type a fund question → 6-bullet response with citations (already wired Phase 8)
- [ ] POST adversarial prompts to `/api/chat` → intercepted (verified Phase 9)
- [ ] POST audio to `/api/voice/stt` → transcript returned (live ElevenLabs)
- [ ] POST text to `/api/voice/tts` → audio stream returned
- [ ] POST voice turn → Gemini Function Calling invokes tool → final assistant text
- [ ] PII in voice transcript → intercepted before Gemini
- [ ] Orb transitions through Idle → Listening → Thinking → Speaking
- [ ] Theme-aware greeting injects top theme from Supabase
- [ ] **RAG ≥ 0.8 + Safety 3/3 + 2 edge cases passed**

## API Keys consumed (all already in `.env.local`)

- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `TARGET_CALENDAR_ID`
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> All keys verified present. No additional env variables required for Phase 11.
