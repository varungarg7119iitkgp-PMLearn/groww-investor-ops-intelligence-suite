# Phase 13 — Test Cases Log

**Run date:** 2026-05-25
**Framework:** Vitest 4.1.7
**Total tests:** 48
**Pass rate:** 100%

---

## Test File 1: `email-draft.test.ts` (8 tests)

| # | Test | Status |
|---|------|--------|
| 1 | produces a non-empty string with subject line | ✅ |
| 2 | includes the topic label (KYC Documentation) | ✅ |
| 3 | includes advisor email in the body | ✅ |
| 4 | appends market context when provided | ✅ |
| 5 | omits market context block when not provided | ✅ |
| 6 | includes user context notes when provided | ✅ |
| 7 | includes compliance disclaimer | ✅ |
| 8 | handles all five topic types | ✅ |

---

## Test File 2: `approval-bridge.test.ts` (4 tests)

| # | Test | Status |
|---|------|--------|
| 1 | inserts a pending approval item with correct fields | ✅ |
| 2 | includes market context from latest pulse | ✅ |
| 3 | generates an email draft in the payload | ✅ |
| 4 | returns null when Supabase insert fails | ✅ |

---

## Test File 3: `approvals-api.test.ts` (8 tests)

| # | Test | Status |
|---|------|--------|
| 1 | maps snake_case DB row to camelCase ApprovalItem | ✅ |
| 2 | rejects creation without required fields | ✅ |
| 3 | validates authorize rejects already-processed items | ✅ |
| 4 | validates override rejects already-processed items | ✅ |
| 5 | builds correct calendar payload from approval item | ✅ |
| 6 | updates status to authorized with timestamp | ✅ |
| 7 | sets rejection reason | ✅ |
| 8 | defaults to generic reason when none provided | ✅ |

---

## Test File 4: `hitl-queue-wiring.test.ts` (10 tests)

| # | Test | Status |
|---|------|--------|
| 1 | GET /api/approvals returns correctly shaped items | ✅ |
| 2 | authorize endpoint payload is correctly structured | ✅ |
| 3 | override endpoint payload includes reason | ✅ |
| 4 | DirectorOpsConsole fetches both pulse and approvals on mount | ✅ |
| 5 | empty approval queue shows empty state when no items returned | ✅ |
| 6 | pending count badge is derived from pending_review items | ✅ |
| 7 | optimistic update reverts on API failure | ✅ |
| 8 | booking code from voice flow triggers approval creation | ✅ |
| 9 | market context is injected from latest pulse | ✅ |
| 10 | email draft includes booking code and topic | ✅ |

---

## Test File 5: `eval-hitl.test.ts` (18 tests — AI Eval Gate)

| # | Test | Category | Status |
|---|------|----------|--------|
| 1 | EVAL-1: Email has subject line with booking code | Email Quality | ✅ |
| 2 | EVAL-2: Email greets the investor | Email Quality | ✅ |
| 3 | EVAL-3: Email includes confirmation details | Email Quality | ✅ |
| 4 | EVAL-4: Email includes market context | Email Quality | ✅ |
| 5 | EVAL-5: Email contains compliance disclaimer | Email Quality | ✅ |
| 6 | EVAL-6: Email includes user context notes | Email Quality | ✅ |
| 7 | EVAL-7: Email length appropriate | Email Quality | ✅ |
| 8 | EVAL-8: Empty context omits section | Email Quality | ✅ |
| 9 | EVAL-9: pending_review → authorized | Status Machine | ✅ |
| 10 | EVAL-10: pending_review → rejected | Status Machine | ✅ |
| 11 | EVAL-11: Cannot re-authorize | Status Machine | ✅ |
| 12 | EVAL-12: Cannot re-reject | Status Machine | ✅ |
| 13 | EVAL-13: authorized_at timestamp | Status Machine | ✅ |
| 14 | EVAL-14: Override reason captured | Status Machine | ✅ |
| 15 | EVAL-15: Booking code format | Cross-Pillar | ✅ |
| 16 | EVAL-16: Market context ≤ 300 chars | Cross-Pillar | ✅ |
| 17 | EVAL-17: Email generated without context | Cross-Pillar | ✅ |
| 18 | EVAL-18: Calendar extendedProperties | Cross-Pillar | ✅ |

---

## Summary

```
Test Files  5 passed (5)
     Tests  48 passed (48)
  Duration  4.21s (transform 549ms, setup 1.31s, import 772ms, tests 241ms)
```

**TypeScript check:** 0 errors (`npx tsc --noEmit`)
**AI Eval Gate:** 18/18 PASS ✅
