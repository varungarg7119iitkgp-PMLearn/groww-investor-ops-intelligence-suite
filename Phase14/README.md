# Phase 14 — Cross-Pillar Integration & State Wiring

## Goal

Wire all seven cross-pillar data flows so Pillars A, B, and C operate as one integrated system. After this phase, mode switching preserves state and bookings/themes flow bidirectionally.

## Traceability

- **Requirement 9** (State Persistence): All cross-pillar flows
- **Requirements.md §5**: Cross-Pillar Data Flow Matrix

## Scope

| # | Flow | Implementation | Status |
|---|------|----------------|--------|
| 1 | Theme → Voice Greeting | Zustand `topTheme` + Supabase pulse + `topThemeOverride` in `/api/voice/converse` | ✅ |
| 2 | Booking → Approval Queue | Phase 13 bridge verified + shared state sync | ✅ |
| 3 | Chat context preservation | `chatMessages` + `investorChatMeta` in Zustand | ✅ |
| 4 | Voice pause/resume | `voiceSessionPaused` flag + cleanup on unmount | ✅ |
| 5 | Booking status query | `/api/chat` + `booking-status-query.ts` | ✅ |
| 6 | Market context → email | Phase 13 `generateEmailDraft` + pulse snippet | ✅ |
| 7 | Zustand persistence | `shared_app_state` table + `CrossPillarSync` | ✅ |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CrossPillarSync (app root)                                  │
│  • Hydrate from GET /api/shared-state + /api/approvals       │
│  • Debounced PATCH /api/shared-state on store changes        │
│  • Pause voice on mode switch → Director Ops                 │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│ Investor Terminal    │    │ Director Ops                 │
│ • Zustand chat       │    │ • Pulse → topTheme           │
│ • useConversation    │    │ • HITL → bookingStatuses     │
│ • bookingStatuses    │    │ • Authorize/Override sync    │
│   in /api/chat       │    └─────────────────────────────┘
└─────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase: shared_app_state                                   │
│ top_theme, market_context, booking_codes, booking_statuses,  │
│ pulse_snapshot, conversation_snapshot                        │
└─────────────────────────────────────────────────────────────┘
```

## Files Created/Modified

### New
| File | Purpose |
|------|---------|
| `src/lib/booking-status-query.ts` | Detect + answer booking status queries |
| `src/lib/shared-state-persistence.ts` | Load/save shared_app_state |
| `src/app/api/shared-state/route.ts` | GET/PATCH shared state API |
| `src/components/shared/CrossPillarSync.tsx` | Hydration + persistence + voice pause |
| `scripts/eval-cross-pillar.ts` | Phase 14 AI Eval Gate runner |
| `Phase14/__tests__/*.test.ts` | 19 unit + eval tests |

### Modified
| File | Change |
|------|--------|
| `src/lib/store.ts` | Chat meta, voice pause, hydrateSharedState, HITL→bookingStatuses |
| `src/hooks/useConversation.ts` | Zustand-backed conversation + booking sync |
| `src/components/investor-terminal/InvestorTerminal.tsx` | Zustand chat, theme display, voice pause |
| `src/app/api/chat/route.ts` | Booking status query path |
| `src/app/api/voice/converse/route.ts` | `topThemeOverride` from Zustand |
| `src/lib/approval-bridge.ts` | Persist booking to shared_app_state |
| `src/components/director-ops/DirectorOpsConsole.tsx` | HITL status → bookingStatuses |
| `src/app/page.tsx` | Mount CrossPillarSync |

### Supabase Migration
- `phase14_shared_app_state` — durable cross-pillar state table

## Test Summary

```
Phase14: 19 tests — all pass
Phase13 regression: 18 eval tests — all pass
TypeScript: 0 errors
AI Eval Gate: ✅ PASS (npx tsx scripts/eval-cross-pillar.ts)
```

## Manual Testing Guide

### Test 1: Theme → Voice Greeting
1. Switch to **Director Ops**
2. Generate a Weekly Pulse (or use existing pulse with known top theme)
3. Switch to **Investor Terminal**
4. Verify orb subtitle shows `pulse theme: <theme name>`
5. Click orb → voice greeting should reference the top theme

### Test 2: Chat History Preservation
1. In Investor Terminal, send a chat message: `"What is HDFC Silver expense ratio?"`
2. Switch to Director Ops
3. Switch back to Investor Terminal
4. Verify the chat message is still visible

### Test 3: Booking → Approval Queue
1. In Investor Terminal, use voice to book an appointment (complete until `NL-XXXX` code)
2. Switch to Director Ops → HITL Approval Centre
3. Verify pending item with matching booking code and market context

### Test 4: Booking Status Query
1. After booking, in Investor Terminal text chat ask: `"What's the status of my booking?"`
2. Or ask: `"Status of NL-XXXX"` (use your code)
3. Verify 6-bullet response with current status (pending/approved/rejected)

### Test 5: Authorize → Status Update
1. In Director Ops, **Authorize** a pending booking
2. Switch to Investor Terminal
3. Ask `"What's my booking status?"` → should show **approved**

### Test 6: Voice Pause/Resume
1. Start voice session in Investor Terminal (click orb)
2. While listening, switch to Director Ops
3. Switch back → subtitle shows `⏸ voice session paused · click orb to resume`
4. Click orb to resume

### Test 7: Shared State Durability (optional)
```bash
curl http://localhost:3000/api/shared-state
```
Verify `topTheme`, `bookingStatuses`, and `bookingCodes` are populated after cross-pillar actions.

## Verification Checklist

- [x] Generate pulse in Director → switch to Investor → voice greeting mentions top theme
- [x] Book appointment in Investor → switch to Director → see pending item with market context
- [x] Switch to Director → switch back to Investor → chat history intact
- [x] Ask "What's my booking status?" → get correct status from approval queue
- [x] Voice session pauses on mode switch, resumes on return
- [x] Critical state persisted to Supabase shared_app_state
- [x] All 19 Phase 14 tests pass
- [x] Cross-pillar AI Eval Gate pass
