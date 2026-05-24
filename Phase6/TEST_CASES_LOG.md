# Phase 6 — Test Cases Log

> **Total:** 64 Phase-6 tests (24 store + 21 components + 19 AI evals) all green.
> **Suite-wide:** 442 / 442 tests passing across all phases.

---

## Suite 1 — Zustand store (`phase6-store.test.ts`) — 24 tests

| # | ID | Description | Result |
|---|---|---|---|
| 1 | initial-1 | defaults to `investor-terminal` mode and not transitioning | ✅ |
| 2 | initial-2 | empty chatMessages / hitlItems / bookingCodes | ✅ |
| 3 | initial-3 | null pulseData / topTheme / marketContext | ✅ |
| 4 | initial-4 | orbState defaults to `IDLE` | ✅ |
| 5 | toggle-1 | `toggleMode` flips investor → director | ✅ |
| 6 | toggle-2 | sets `isTransitioning=true` then releases after 400ms | ✅ |
| 7 | toggle-3 | rapid second call within 500ms debounce is ignored | ✅ |
| 8 | toggle-4 | second toggle succeeds after the debounce window | ✅ |
| 9 | toggle-5 | toggle issued while transitioning is rejected | ✅ |
| 10 | setActive-1 | `setActiveMode("director-ops")` sets mode + transitioning, releases at 400ms | ✅ |
| 11 | setActive-2 | `setActiveMode(currentMode)` is a no-op | ✅ |
| 12 | inv-1 | `setOrbState` updates orbState | ✅ |
| 13 | inv-2 | `addChatMessage` appends to chatMessages | ✅ |
| 14 | dir-1 | `addHitlItem` appends to hitlItems | ✅ |
| 15 | dir-2 | `updateHitlStatus("authorized")` stamps `authorizedAt` | ✅ |
| 16 | dir-3 | `updateHitlStatus("rejected", reason)` attaches `overrideReason` | ✅ |
| 17 | dir-4 | `setPulseData` stores pulse | ✅ |
| 18 | shared-1 | `setTopTheme` + `setMarketContext` store strings | ✅ |
| 19 | shared-2 | `addBookingSummary` appends bookingCodes | ✅ |
| 20 | preserve-1 | chat messages survive toggleMode round-trip (Req 1.6) | ✅ |
| 21 | preserve-2 | HITL items survive toggleMode round-trip (Req 1.6) | ✅ |
| 22 | persist-1 | `toggleMode` persists `director-ops` to localStorage | ✅ |
| 23 | persist-2 | `readPersistedMode()` returns the persisted value | ✅ |
| 24 | persist-3 | `readPersistedMode()` returns `undefined` for invalid values | ✅ |

---

## Suite 2 — ModeToggle + ModeTransition (`phase6-components.test.tsx`) — 21 tests

### ModeToggle — rendering & accessibility (7)

| # | ID | Description | Result |
|---|---|---|---|
| 1 | mt-render-1 | renders both tab labels (INVESTOR TERMINAL / DIRECTOR OPS) | ✅ |
| 2 | mt-render-2 | wrapper has `role="tablist"` + `aria-orientation="horizontal"` | ✅ |
| 3 | mt-render-3 | each tab has `role="tab"` + `aria-selected` matching activeMode | ✅ |
| 4 | mt-render-4 | active tab `tabindex=0`, inactive tab `tabindex=-1` | ✅ |
| 5 | mt-render-5 | renders exactly two tabs (Req 1.1) | ✅ |
| 6 | mt-render-6 | renders the sliding indicator | ✅ |
| 7 | mt-render-7 | accepts a custom `widthPx` prop (UI/UX §4.1) | ✅ |

### ModeToggle — interaction (8)

| # | ID | Description | Result |
|---|---|---|---|
| 8  | mt-int-1 | click DIRECTOR OPS switches activeMode | ✅ |
| 9  | mt-int-2 | click already-active tab is a no-op | ✅ |
| 10 | mt-int-3 | ArrowRight switches to director-ops | ✅ |
| 11 | mt-int-4 | ArrowLeft switches back to investor-terminal | ✅ |
| 12 | mt-int-5 | Home / End jump to first / last tab | ✅ |
| 13 | mt-int-6 | Enter toggles modes (debounced 500ms) | ✅ |
| 14 | mt-int-7 | Space key activates toggleMode (a11y parity with Enter) | ✅ |
| 15 | mt-int-8 | tab buttons are disabled while isTransitioning | ✅ |

### ModeTransition wrapper (4)

| # | ID | Description | Result |
|---|---|---|---|
| 16 | mtr-1 | renders investor content when activeMode=investor-terminal | ✅ |
| 17 | mtr-2 | renders director content when activeMode=director-ops | ✅ |
| 18 | mtr-3 | exposes `data-mode` and `data-transitioning` attributes | ✅ |
| 19 | mtr-4 | ScanningLine becomes visible on toggleMode (UI/UX §4.3) | ✅ |

### Integration (2)

| # | ID | Description | Result |
|---|---|---|---|
| 20 | int-1 | clicking DIRECTOR OPS swaps the rendered pane | ✅ |
| 21 | int-2 | rapid clicks are debounced — second click is ignored | ✅ |

---

## Suite 3 — AI Eval Gate (`phase6-ai-evals.test.ts`) — 19 tests (incl. summary)

### Eval Gate A — Requirement 1 acceptance criteria (8)

| # | Eval | Statement | Result |
|---|---|---|---|
| 1 | R1.1  | Mode_Switcher exposes exactly two labels | ✅ |
| 2 | R1.2  | Mode transition completes within 400ms | ✅ |
| 3 | R1.3  | Application defaults to Investor_Terminal | ✅ |
| 4 | R1.4  | Investor mode identifiable via activeMode | ✅ |
| 5 | R1.5  | Director mode identifiable via activeMode | ✅ |
| 6 | R1.6  | Switching modes preserves chat + HITL state | ✅ |
| 7 | R1.7  | toggleMode does not navigate (single URL) | ✅ |
| 8 | R1.E1 | Rapid toggles debounced (≤500ms) | ✅ |

### Eval Gate B — Phase 6 deliverables (8)

| # | Eval | Statement | Result |
|---|---|---|---|
| 9  | D1 | ModeToggle module exists | ✅ |
| 10 | D2 | Zustand store module + helpers exposed | ✅ |
| 11 | D3 | ModeTransition wrapper exists | ✅ |
| 12 | D4 | Single entry point page exists | ✅ |
| 13 | D5 | Legacy /director-ops route exists (redirect shim) | ✅ |
| 14 | D6 | InvestorTerminal reachable from barrel | ✅ |
| 15 | D7 | DirectorOpsConsole reachable from barrel | ✅ |
| 16 | D8 | All store actions defined | ✅ |

### Eval Gate C — UI/UX §4 compliance (2)

| # | Eval | Statement | Result |
|---|---|---|---|
| 17 | UX4.1 | Default width 420px | ✅ |
| 18 | UX4.2 | Investor accent cyan / Director accent amber | ✅ |

### Eval summary (1)

| # | ID | Description | Result |
|---|---|---|---|
| 19 | summary | All Phase-6 evals passed (100% gate) | ✅ |

---

## Phase 5 — Tests updated for Phase 6 rewires

| # | ID | Description | Result |
|---|---|---|---|
| 1 | OpsAccessButton-1 | switches `activeMode` to `director-ops` after splash (replaces old `router.push` assertion) | ✅ |
| 2 | OpsHeader-1 | back-link is now a `<button>` driving `setActiveMode("investor-terminal")` (replaces old `href="/"` assertion) | ✅ |

---

## Final tally

```
 Test Files  9 passed (9)
      Tests  442 passed (442)
   Duration  ~12s
```

```
═══════════════════════════════════════════════════════════════
  PHASE 6 — AI EVAL REPORT (Mode Switcher & Navigation)
  Total evals:  18
  Passed:       18
  Failed:        0
  Gate result:  ✅ PASS
═══════════════════════════════════════════════════════════════
```
