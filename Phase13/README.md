# Phase 13 — HITL Approval Center & MCP Gateway

## Goal

Implement the full HITL (Human-In-The-Loop) approval workflow: booking creates pending item → advisor reviews → authorize/override → calendar event executes. Completes Pillar C.

## Traceability

- **Requirement 8** (HITL Approval): Approval queue, calendar hold, email draft, market context, authorize/override

## Scope

| Task | Deliverable | Status |
|------|------------|--------|
| Approval item creation | Booking → `pending_review` in `approval_queue` | ✅ |
| Email draft generation | Auto-generate with market context injection | ✅ |
| Market context injection | Pull from latest pulse `summaryText` | ✅ |
| Wire HitlQueue | Fetch live data from `GET /api/approvals` | ✅ |
| Authorize flow | Calendar event + status `authorized` | ✅ |
| Override flow | Rejection with reason | ✅ |
| Email draft editing | Editable before authorization (UI) | ✅ |
| Retry logic | Calendar failure returns `calendarFailed: true` | ✅ |
| Empty state handling | Placeholder when no items | ✅ |

## Architecture Decisions

1. **Booking → Approval Bridge** (`src/lib/approval-bridge.ts`): When the voice flow generates a booking code via `generate_booking_code_and_notes`, the bridge asynchronously creates a pending approval item in Supabase with the email draft and market context.

2. **API Routes**:
   - `GET /api/approvals` — List all approval items (optional `?status=` filter)
   - `POST /api/approvals` — Create a new pending approval item
   - `POST /api/approvals/authorize` — Authorize (creates calendar event + updates status)
   - `POST /api/approvals/override` — Override/reject with reason

3. **Optimistic UI** in `DirectorOpsConsole`: Authorize/Override actions update the Zustand store immediately, then persist to Supabase. If the API call fails, the UI reverts.

4. **Calendar Integration**: Uses the existing `createCalendarEvent` + `buildCalendarPayload` from `src/tools/calendar.ts` (Phase 10). Mock mode returns deterministic events when env vars are absent.

5. **RLS Policy**: Applied migration `phase13_approval_queue_rls` allowing anon/authenticated INSERT and UPDATE on `approval_queue`.

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `src/lib/email-draft.ts` | Email draft generation with market context |
| `src/lib/approval-bridge.ts` | Booking → approval item bridge |
| `src/app/api/approvals/route.ts` | GET/POST approval items |
| `src/app/api/approvals/authorize/route.ts` | Authorize endpoint |
| `src/app/api/approvals/override/route.ts` | Override endpoint |
| `Phase13/__tests__/*.test.ts` | 5 test files, 48 total tests |

### Modified Files
| File | Change |
|------|--------|
| `src/components/director-ops/DirectorOpsConsole.tsx` | Fetches live approval data, calls authorize/override APIs |
| `src/app/api/voice/converse/route.ts` | Creates approval item when booking code generated |
| `Evals_Report.md` | Updated with Phase 13 results |

## Test Summary

```
Test Files  5 passed (5)
     Tests  48 passed (48)
  Duration  4.21s
```

### Test Files
1. `email-draft.test.ts` — 8 tests (email generation)
2. `approval-bridge.test.ts` — 4 tests (Supabase bridge)
3. `approvals-api.test.ts` — 8 tests (API validation logic)
4. `hitl-queue-wiring.test.ts` — 10 tests (UI wiring)
5. `eval-hitl.test.ts` — 18 tests (AI Eval Gate)

## AI Eval Gate Results

**18 / 18 PASS** ✅

| Category | Tests | Pass |
|----------|-------|------|
| Email Draft Quality | 8 | 8 ✅ |
| Status Machine | 6 | 6 ✅ |
| Cross-Pillar (B → C) | 4 | 4 ✅ |

## Verification Checklist

- [x] Complete booking in Investor → switch to Director → see pending item
- [x] Authorize → calendar event created (mock mode confirmed)
- [x] Override → item marked rejected with reason
- [x] Edit email draft → modified version used on authorize
- [x] No market context → placeholder message shown
- [x] Retry indication when calendar API fails (`calendarFailed: true`)
- [x] TypeScript compilation: zero errors
- [x] All 48 tests pass

## Manual Testing Guide

### Prerequisites
- Dev server running: `npm run dev`
- `.env.local` configured with Supabase credentials

### Test 1: Create Approval Item via API

```bash
curl -X POST http://localhost:3000/api/approvals \
  -H "Content-Type: application/json" \
  -d '{
    "bookingCode": "NL-T1S2",
    "topic": "kyc",
    "proposedSlot": "2026-06-02T10:00:00.000Z",
    "investorNameRedacted": "[REDACTED]",
    "advisorEmail": "advisor@groww.in",
    "userContext": "KYC documents flagged without reason"
  }'
```

Expected: 201 response with the created item including `emailDraft` and `marketContextSnippet`.

### Test 2: List Approval Items

```bash
curl http://localhost:3000/api/approvals
```

Expected: Array of items with `status: "pending_review"`.

### Test 3: Authorize an Item

```bash
curl -X POST http://localhost:3000/api/approvals/authorize \
  -H "Content-Type: application/json" \
  -d '{"id": "<item-id-from-test-1>"}'
```

Expected: Response with `calendarEvent.htmlLink` and item status `authorized`.

### Test 4: Override an Item

```bash
curl -X POST http://localhost:3000/api/approvals/override \
  -H "Content-Type: application/json" \
  -d '{"id": "<item-id>", "reason": "Client unavailable for proposed slot"}'
```

Expected: Item status `rejected` with `overrideReason`.

### Test 5: UI Verification

1. Open `http://localhost:3000` in Director Ops mode
2. Scroll to "HITL APPROVAL CENTRE" section
3. Verify pending items appear with amber left border
4. Click "AUTHORIZE" → item turns green, shows "OPERATOR AUTHORIZED"
5. On another item, click "OVERRIDE" → prompt for reason → item turns red

### Test 6: End-to-End Voice → Approval

1. Switch to Investor Terminal mode
2. Start a voice conversation and book an appointment (e.g., "I need help with my KYC")
3. Complete the booking flow until a booking code (`NL-XXXX`) is generated
4. Switch to Director Ops mode
5. The new booking should appear in the HITL queue with:
   - Booking code matching
   - Generated email draft
   - Market context from latest pulse (if pulse exists)
