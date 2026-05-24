# Phase 11 — Test Cases Log

## Summary
- **35 tests** across 5 Phase-11 suites
- **Full project: 876 / 876 PASS**
- TypeScript: clean
- ESLint: clean for Phase 9-11 modules

## phase11-gemini-chat.test.ts (6 tests)

| Case | Result |
|---|---|
| Plain text response (no tools) | ✅ |
| Single tool call dispatched + result fed back + final text | ✅ |
| Multiple tool calls in one response | ✅ |
| `maxToolTurns` cap reached | ✅ |
| No dispatcher → loop breaks gracefully | ✅ |
| Tool dispatcher error → `ok=false` propagated | ✅ |

## phase11-voice-converse.test.ts (10 tests)

| Case | Result |
|---|---|
| Empty body → 400 | ✅ |
| PII (PAN) intercepted before Gemini | ✅ |
| Advice intercepted before Gemini | ✅ |
| Out-of-scope (Bitcoin) intercepted | ✅ |
| FAQ query → Gemini called → assistantText returned | ✅ |
| Greeting injects top theme from pulse | ✅ |
| Booking intent transitions step | ✅ |
| PII scrub on output (defense-in-depth) | ✅ |
| Output guard blocks advice that slipped through | ✅ |
| Tool calls recorded on response | ✅ |

## phase11-voice-tts.test.ts (7 tests)

| Case | Result |
|---|---|
| 400 on missing text | ✅ |
| Advice text blocked by output guard | ✅ |
| Brevity trims input before upstream | ✅ |
| Upstream success → audio/mpeg stream | ✅ |
| Upstream 500 → 502 | ✅ |
| PII scrub before upstream call | ✅ |
| Missing API key → 500 | ✅ |

## phase11-safety-evals.test.ts (8 tests)

| Suite | Cases | Result |
|---|---|---|
| Tier-1 base (3 prompts) | 3 | ✅ |
| Tier-2 edge (2 prompts) | 2 | ✅ |
| Voice path compliance (advice + PII output) | 2 | ✅ |
| GATE summary (5/5) | 1 | ✅ |

**Gate Result: 5 / 5 PASS**

## phase11-hooks.test.tsx (4 tests)

| Case | Result |
|---|---|
| `useConversation.send()` POSTs to /api/voice/converse | ✅ |
| `useConversation.send()` surfaces 500 errors | ✅ |
| `useConversation.resetConversation()` creates fresh session | ✅ |
| `useAudioAnalyzer` returns level=0 when not connected | ✅ |

## RAG Re-eval (Tier-2 LLM Judge) — live run

```
[Phase 8 Eval] Suite Summary
  total=10  pass=8  fail=2
  aggregateScore=0.84  passRate=0.8
  GATE: PASS ✅
```

- E8-RAG-1 (expense ratio): faithfulness 0.80, relevance 1.00
- E8-RAG-2 (exit load): faithfulness 0.80, relevance 1.00
- E8-RAG-3 (3-year compare): faithfulness 0.50, relevance 0.50 ← only sub-target
- E8-RAG-4 (TCS): faithfulness 1.00, relevance 0.80
- E8-RAG-5 (commodity vs hybrid risk): faithfulness 1.00, relevance 1.00

## Live API verification (against `localhost:3001`)

| Endpoint | Request | Result |
|---|---|---|
| `POST /api/chat` | normal fund question | ✅ 6 bullets + citations + complianceFlag=ok |
| `POST /api/chat` | advice prompt | ✅ complianceFlag=advice_block |
| `POST /api/chat` | PII prompt | ✅ complianceFlag=pii_block (no echo) |
| `POST /api/chat` | out-of-scope | ✅ complianceFlag=out_of_scope |
| `POST /api/voice/converse` | greeting voice turn | ✅ 200, latency ~2.2s, flag=ok |
| `POST /api/voice/tts` | normal text | ✅ 200, 39,750 bytes audio/mpeg |
