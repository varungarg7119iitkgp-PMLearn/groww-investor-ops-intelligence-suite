# Phase 14 — Test Cases Log

**Run date:** 2026-05-25  
**Framework:** Vitest 4.1.7  
**Phase 14 tests:** 19  
**Combined Phase 13+14:** 67  
**Pass rate:** 100%

---

## `cross-pillar.test.ts` (9 tests)

| # | Test | Status |
|---|------|--------|
| 1 | detects booking status questions | ✅ |
| 2 | returns grounded answer from client bookingStatuses cache | ✅ |
| 3 | maps approval queue status to bookingStatuses vocabulary | ✅ |
| 4 | injects top theme into greeting prompt | ✅ |
| 5 | works without theme (empty state) | ✅ |
| 6 | preserves chat messages across mode switch simulation | ✅ |
| 7 | syncs bookingStatuses on HITL authorize | ✅ |
| 8 | tracks voice session pause on mode switch | ✅ |
| 9 | hydrates shared state from payload | ✅ |

---

## `eval-cross-pillar.test.ts` (10 tests — AI Eval Gate)

| # | Test | Status |
|---|------|--------|
| 1 | EVAL-CP1: Greeting prompt includes top theme | ✅ |
| 2 | EVAL-CP2: Zustand topTheme available to voice layer | ✅ |
| 3 | EVAL-CP3: Email draft contains market context snippet | ✅ |
| 4 | EVAL-CP4: Booking code format NL-[A-Z0-9]{4} | ✅ |
| 5 | EVAL-CP5: Status maps consistently across pillars | ✅ |
| 6 | EVAL-CP6: HITL authorize updates bookingStatuses | ✅ |
| 7 | EVAL-CP7: Chat messages survive mode toggle | ✅ |
| 8 | EVAL-CP8: Smart-Sync recognizes booking status intent | ✅ |
| 9 | EVAL-CP9: Voice session pause flag set on mode switch | ✅ |
| 10 | EVAL-CP10: Conversation state persists in Zustand | ✅ |

---

## AI Eval Gate Script

```
npx tsx scripts/eval-cross-pillar.ts
→ Test 1–3: Cross-pillar unit + eval tests... ✅ PASS
→ Test 4: Phase 13 HITL regression... ✅ PASS
→ Test 5: TypeScript compilation... ✅ PASS
GATE: ✅ PASS
```

---

## Regression

Phase 13 suite: **48/48 pass** (included in combined 67 run)
