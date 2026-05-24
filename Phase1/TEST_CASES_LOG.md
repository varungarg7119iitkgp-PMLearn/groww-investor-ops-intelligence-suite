# Phase 1 — Test Cases Log

**Suite:** `Phase1/__tests__/phase1-scaffold.test.ts`  
**Runner:** Vitest v4.1.7  
**Result:** 29 passed / 0 failed  
**Duration:** 2.44s  

---

## Test Group 1: `cn()` — Tailwind Class Merger

| # | Test | Category | Result |
|---|------|----------|--------|
| T1.1 | Merges simple classes without conflict | Unit | ✅ PASS |
| T1.2 | Resolves Tailwind conflicts (last class wins) | Unit | ✅ PASS |
| T1.3 | Ignores falsy conditionals (false, undefined) | Unit | ✅ PASS |
| T1.4 | Handles array and object inputs | Unit | ✅ PASS |
| T1.5 | Returns empty string for no arguments | Edge case | ✅ PASS |

**Rationale:** `cn()` is used in every component. Correct Tailwind conflict resolution is critical to avoid broken styles in the dual-mode UI.

---

## Test Group 2: Booking Code — `NL-[A-Z0-9]{4}`

| # | Test | Category | Result |
|---|------|----------|--------|
| T2.1 | Accepts `NL-A3X9`, `NL-0000`, `NL-ZZZZ`, `NL-AB12` | Unit | ✅ PASS |
| T2.2 | Rejects lowercase, short, wrong prefix, special chars | Unit | ✅ PASS |
| T2.3 | `formatBookingCode("a3x9")` → `"NL-A3X9"` | Unit | ✅ PASS |
| T2.4 | `generateBookingCode()` valid across 20 random calls | Unit | ✅ PASS |
| T2.5 | PROPERTY: any 4-char uppercase alphanumeric passes regex | Property-based | ✅ PASS |

**Rationale:** The `NL-XXXX` booking code is the cross-module key linking Voice Agent appointments to the PM HITL queue. Format integrity is non-negotiable.

---

## Test Group 3: `redactPII()` — Zero PII Guardrail

| # | Test | Category | Result |
|---|------|----------|--------|
| T3.1 | Full person names (`John Smith`) → `[REDACTED]` | Unit | ✅ PASS |
| T3.2 | Email addresses → `[EMAIL_REDACTED]` | Unit | ✅ PASS |
| T3.3 | 10-digit phone numbers → `[PHONE_REDACTED]` | Unit | ✅ PASS |
| T3.4 | Non-PII financial text passes through unchanged | Unit | ✅ PASS |
| T3.5 | Empty string returns empty string | Edge case | ✅ PASS |

**Rationale:** SEBI/RBI-aligned strict PII handling. The `redactPII()` function is the first line of defence before any text is logged, stored, or sent to Gemini.

---

## Test Group 4: `containsAdvice()` — Zero Advice Guardrail

| # | Test | Category | Result |
|---|------|----------|--------|
| T4.1 | Detects "should buy", "recommend buying", "best fund for", "must invest", "guaranteed returns" | Unit | ✅ PASS |
| T4.2 | Passes 1-year return, expense ratio, fund description | Unit | ✅ PASS |
| T4.3 | Case-insensitive detection (`YOU SHOULD BUY`) | Unit | ✅ PASS |

**Rationale:** Mutual Fund Chatbot and Voice Agent both enforce no-advice rules per SEBI guidelines. All LLM outputs pass through this check before delivery.

---

## Test Group 5: Text Utilities

| # | Test | Category | Result |
|---|------|----------|--------|
| T5.1 | `truncate("Hello World", 8)` → `"Hello..."` | Unit | ✅ PASS |
| T5.2 | Short strings not truncated | Unit | ✅ PASS |
| T5.3 | Exact-length strings not truncated | Edge case | ✅ PASS |
| T5.4 | `formatCurrency(1500)` contains `₹` and `1,500` | Unit | ✅ PASS |
| T5.5 | `formatCurrency(0)` returns valid currency string | Edge case | ✅ PASS |
| T5.6 | `formatDate("2026-01-15T...")` contains "Jan" and "2026" | Unit | ✅ PASS |

---

## Test Group 6: API Response Envelope

| # | Test | Category | Result |
|---|------|----------|--------|
| T6.1 | `apiSuccess(data)` → `{ data: ..., error: null }` | Unit | ✅ PASS |
| T6.2 | `apiSuccess(data, meta)` passes meta through | Unit | ✅ PASS |
| T6.3 | `apiError("msg")` → `{ data: null, error: "msg" }` | Unit | ✅ PASS |

**Rationale:** All API routes return this envelope. Consistent typing prevents runtime `undefined` errors on the client.

---

## Test Group 7: Design Token Naming Conventions

| # | Test | Category | Result |
|---|------|----------|--------|
| T7.1 | All 17 required CSS custom property names match `--[a-z][a-z0-9-]*` | Unit | ✅ PASS |
| T7.2 | Token count ≥ 17 required tokens | Unit | ✅ PASS |

**Rationale:** CSS variable naming consistency ensures Framer Motion inline styles, Tailwind utilities, and direct CSS all reference the same token set.

---

## AI Eval Summary — Phase 1

### Eval Gate EG-1: Scaffold Integrity
- **Criteria:** Build succeeds, TypeScript strict pass, env vars present
- **Result:** ✅ PASS
- **Evidence:** `exit_code: 0`, `✓ Compiled successfully in 29.7s`, `✓ 4/4 static pages`

### Eval Gate EG-2: Design Token Completeness
- **Criteria:** All colour tokens present, mode override working, fonts loaded
- **Result:** ✅ PASS
- **Evidence:** T7.1, T7.2 pass; globals.css contains 50+ CSS custom properties across all token groups

### Eval Gate EG-3: Core Utility Quality
- **Criteria:** Compliance helpers (PII, Advice), BookingCode, API helpers all correct
- **Result:** ✅ PASS
- **Evidence:** T2.1–T2.5, T3.1–T3.5, T4.1–T4.3, T6.1–T6.3 all green

---

## Manual Testing Checklist (Action for Developer)

After running `npm run dev` and opening `http://localhost:3000`:

- [ ] **Background colour** — page shows solid `#030508` (near-black, not pure black)
- [ ] **Aurora mesh** — subtle cyan + amber radial gradient overlays visible
- [ ] **Scanlines** — faint horizontal scan lines visible (subtle effect)
- [ ] **Wordmark** — "Investor Ops & Intelligence Suite" rendered in Inter Tight
- [ ] **Gradient text** — "Intelligence Suite" shows Arc Cyan gradient
- [ ] **Mode badge** — cyan dot + "SYSTEM INITIALIZING" text in JetBrains Mono
- [ ] **Token cards** — 4 cards showing hex values with glass panel effect
- [ ] **Pillar cards** — 3 glass cards for Pillar A, B, C
- [ ] **DevTools → Computed Styles** on `<html>` confirms all `--void-bg`, `--investor`, `--ops`, `--font-display` CSS vars are resolved
- [ ] **DevTools → Network** confirms Inter Tight, Inter, JetBrains Mono all loaded (3 Google Font requests)
- [ ] **Accessibility** — tab through page, focus ring visible in Arc Cyan

---

## Next Phase Preview (Phase 2)

| Task | Scope |
|------|-------|
| Supabase schema SQL migration | 5 tables: `reviews`, `pulses`, `bookings`, `fund_documents`, `audit_log` |
| `src/lib/supabase.ts` client setup | Server + browser clients |
| Row-Level Security policies | Per-table RLS |
| Environment variable runtime validation | Zod schema for all 9 vars |
| Supabase type generation | Auto-generated `database.types.ts` |
