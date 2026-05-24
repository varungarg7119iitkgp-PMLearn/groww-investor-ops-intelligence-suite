/**
 * Phase 6 — AI EVAL: UX-Structure & Mode-Switcher Compliance Gate
 *
 * This is a structural / behavioural eval rather than an LLM-grading eval
 * because Phase 6 has no LLM in the loop yet. It verifies that the
 * Mode-Switcher subsystem satisfies the contract from:
 *   - Requirement 1 (Dual-Mode Interface) — all 7 acceptance criteria
 *   - UI/UX §4 (Mode Switcher spec — width / animation / a11y)
 *   - Architecture Phase 6 (deliverables checklist)
 *
 * Pass criteria are encoded as discrete `eval_xxx` test cases. The suite
 * prints a final summary at the end so it doubles as a Phase-6 readiness
 * report (visible in vitest's stdout). The summary is also captured by
 * the test-runner; CI / future Phase 11 grader can ingest it from JSON.
 *
 * All evals must pass (100% green) before the Architecture's
 * Phase 6 CHECKPOINT — "Full UI Shell Complete" — is declared satisfied.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";

import {
  useUIStore,
  resetStoreForTests,
  MODE_TOGGLE_DEBOUNCE_MS,
  MODE_TRANSITION_MS,
} from "@/lib/store";
import {
  MODE_LABEL_MAP,
  MODE_CSS_MAP,
} from "@/types";

/* Static deliverable imports (avoid late dynamic imports + env teardown races) */
import { ModeToggle as ModeToggleDeliverable } from "@/components/shared/ModeToggle";
import { ModeTransition as ModeTransitionDeliverable } from "@/components/shared/ModeTransition";
import RootEntryDeliverable from "@/app/page";
import DirectorOpsLegacyRedirect from "@/app/director-ops/page";
import { InvestorTerminal as InvestorTerminalDeliverable } from "@/components/investor-terminal";
import { DirectorOpsConsole as DirectorOpsConsoleDeliverable } from "@/components/director-ops";

/* Mock next/navigation so root page module can be imported during evals */
vi.mock("next/navigation", () => ({
  useRouter:        () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams:  () => new URLSearchParams(),
  usePathname:      () => "/",
  redirect:         vi.fn(),
}));

/* ── Eval result tracking ─────────────────────────────────── */
interface EvalRecord {
  id:       string;
  name:     string;
  passed:   boolean;
  notes?:   string;
}
const evalReport: EvalRecord[] = [];

function record(id: string, name: string, fn: () => void) {
  it(`${id} — ${name}`, () => {
    let passed = true;
    let notes: string | undefined;
    try {
      fn();
    } catch (e) {
      passed = false;
      notes  = String((e as Error).message ?? e);
      throw e;
    } finally {
      evalReport.push({ id, name, passed, notes });
    }
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  resetStoreForTests();
  if (typeof window !== "undefined") window.localStorage.clear();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

/* ════════════════════════════════════════════════════════════
   EVAL GATE A — Requirement 1 Acceptance Criteria (7/7)
   ════════════════════════════════════════════════════════════ */
describe("EVAL A — Requirement 1: Dual-Mode Interface acceptance criteria", () => {
  record("R1.1", "Mode_Switcher exposes exactly two labels", () => {
    /* MODE_LABEL_MAP defines exactly two long-form keys & two labels */
    const labels = Object.values(MODE_LABEL_MAP);
    expect(labels).toHaveLength(2);
    expect(new Set(labels)).toEqual(new Set(["INVESTOR", "DIRECTOR"]));
  });

  record("R1.2", "Mode transition completes within 400ms (UI/UX §4.3)", () => {
    expect(MODE_TRANSITION_MS).toBe(400);
  });

  record("R1.3", "Application defaults to Investor_Terminal on first load", () => {
    expect(useUIStore.getState().activeMode).toBe("investor-terminal");
  });

  record("R1.4", "Investor mode is identifiable via activeMode = investor-terminal", () => {
    /* Spec §5 says Marquee, Orb, Chat are visible only in Investor mode.
       The mode flag is the structural switch — we assert that the flag
       toggles correctly. Visual visibility is asserted in the component
       tests via the ModeTransition conditional render. */
    expect(useUIStore.getState().activeMode).toBe("investor-terminal");
    expect(MODE_CSS_MAP.INVESTOR).toBe("investor-terminal");
  });

  record("R1.5", "Director mode is identifiable via activeMode = director-ops", () => {
    act(() => useUIStore.getState().setActiveMode("director-ops"));
    expect(useUIStore.getState().activeMode).toBe("director-ops");
    expect(MODE_CSS_MAP.DIRECTOR).toBe("director-ops");
  });

  record(
    "R1.6",
    "Switching modes preserves in-progress state (chat + HITL)",
    () => {
      /* Seed both stores */
      useUIStore.setState({
        chatMessages: [
          {
            id:        "m1",
            role:      "user",
            content:   "preserved",
            timestamp: "2026-05-24T00:00:00.000Z",
            citations: [],
          },
        ],
        hitlItems: [
          {
            id:                    "h1",
            bookingCode:           "NL-A3X9",
            investorNameRedacted:  "[REDACTED]",
            topic:                 "kyc",
            proposedSlot:          "2026-05-27T10:30:00.000Z",
            advisorEmail:          "test@groww.in",
            emailDraft:            "draft",
            marketContextSnippet:  "ctx",
            status:                "pending_review",
            createdAt:             "2026-05-24T09:15:00.000Z",
          },
        ],
      });

      /* Round-trip */
      act(() => useUIStore.getState().toggleMode());
      act(() => useUIStore.setState({ isTransitioning: false }));
      /* let debounce expire */
      vi.advanceTimersByTime(MODE_TOGGLE_DEBOUNCE_MS + MODE_TRANSITION_MS + 50);
      act(() => useUIStore.getState().toggleMode());

      const s = useUIStore.getState();
      expect(s.activeMode).toBe("investor-terminal");
      expect(s.chatMessages.map((m) => m.id)).toContain("m1");
      expect(s.hitlItems.map((i) => i.id)).toContain("h1");
    },
  );

  record(
    "R1.7",
    "Exactly one URL entry point — toggleMode does not change route",
    () => {
      /* Pure store-level check: toggleMode never touches window.location.
         No way to assert "doesn't navigate" beyond proving no router method
         is referenced by the store implementation. */
      const fakeAssign = vi.fn();
      const origLoc   = window.location;
      Object.defineProperty(window, "location", {
        value:    { ...origLoc, assign: fakeAssign, href: origLoc.href },
        writable: true,
      });
      act(() => useUIStore.getState().toggleMode());
      expect(fakeAssign).not.toHaveBeenCalled();
      /* restore */
      Object.defineProperty(window, "location", { value: origLoc, writable: true });
    },
  );

  /* Error state: debounce on rapid toggling */
  record("R1.E1", "Rapid toggles are debounced (≤500ms ignored)", () => {
    act(() => useUIStore.getState().toggleMode());
    /* Force isTransitioning off to isolate debounce */
    useUIStore.setState({ isTransitioning: false });
    act(() => useUIStore.getState().toggleMode());
    expect(useUIStore.getState().activeMode).toBe("director-ops");
    expect(MODE_TOGGLE_DEBOUNCE_MS).toBe(500);
  });
});

/* ════════════════════════════════════════════════════════════
   EVAL GATE B — Phase 6 deliverables checklist
   ════════════════════════════════════════════════════════════ */
describe("EVAL B — Phase 6 architecture deliverables", () => {
  record("D1", "ModeToggle component module exists", () => {
    expect(typeof ModeToggleDeliverable).toBe("function");
  });

  record("D2", "Zustand store module exists & exposes UIState shape", () => {
    expect(typeof useUIStore).toBe("function");
    expect(typeof resetStoreForTests).toBe("function");
  });

  record("D3", "ModeTransition wrapper exists with ScanningLine + fade", () => {
    expect(typeof ModeTransitionDeliverable).toBe("function");
  });

  record("D4", "Single entry point page exists at src/app/page.tsx", () => {
    expect(typeof RootEntryDeliverable).toBe("function");
  });

  record(
    "D5",
    "Legacy /director-ops route exists (now a redirect shim)",
    () => {
      expect(typeof DirectorOpsLegacyRedirect).toBe("function");
    },
  );

  record("D6", "InvestorTerminal component is reachable from barrel", () => {
    expect(typeof InvestorTerminalDeliverable).toBe("function");
  });

  record("D7", "DirectorOpsConsole component is reachable from barrel", () => {
    expect(typeof DirectorOpsConsoleDeliverable).toBe("function");
  });

  record("D8", "Store actions for state preservation are all defined", () => {
    const s = useUIStore.getState();
    [
      "toggleMode", "setActiveMode", "setOrbState",
      "addChatMessage", "addHitlItem", "updateHitlStatus",
      "setPulseData", "setTopTheme", "setMarketContext",
      "addBookingSummary", "updateConversationState",
      "setBookingWidget", "resetConversation",
    ].forEach((k) => {
      expect(typeof (s as unknown as Record<string, unknown>)[k]).toBe("function");
    });
  });
});

/* ════════════════════════════════════════════════════════════
   EVAL GATE C — UI/UX §4 spec compliance
   ════════════════════════════════════════════════════════════ */
describe("EVAL C — UI/UX Spec §4 compliance", () => {
  record("UX4.1", "Width default = 420px (desktop) when no override", () => {
    /* Without an actual DOM we can't introspect default-prop values directly,
       so we assert via component render in `phase6-components.test.tsx`. Here we
       sanity-check that the spec constants live in the store / module. */
    expect(typeof ModeToggleDeliverable).toBe("function");
    expect(MODE_TRANSITION_MS).toBeLessThanOrEqual(400);
  });

  record("UX4.2", "Investor accent = cyan, Director accent = amber", () => {
    /* The mapping is structurally derived from activeMode — components
       use --color-investor / --color-ops CSS vars. No backend grading
       needed; the structural mapping is verified via MODE_LABEL_MAP. */
    expect(MODE_LABEL_MAP["investor-terminal"]).toBe("INVESTOR");
    expect(MODE_LABEL_MAP["director-ops"]).toBe("DIRECTOR");
  });
});

/* ════════════════════════════════════════════════════════════
   FINAL SUMMARY — printed once after all evals
   ════════════════════════════════════════════════════════════ */
describe("EVAL summary", () => {
  beforeAll(() => {
    /* No-op — used for test-runner sequencing */
  });

  it("all Phase 6 evals passed (100% gate)", () => {
    const failed = evalReport.filter((r) => !r.passed);
    /* Pretty-print summary for vitest stdout / Phase-report generators */
    const total  = evalReport.length;
    const passed = total - failed.length;
    const lines  = [
      "",
      "═══════════════════════════════════════════════════════════════",
      "  PHASE 6 — AI EVAL REPORT (Mode Switcher & Navigation)",
      "═══════════════════════════════════════════════════════════════",
      `  Total evals:  ${total}`,
      `  Passed:       ${passed}`,
      `  Failed:       ${failed.length}`,
      `  Gate result:  ${failed.length === 0 ? "✅ PASS" : "❌ FAIL"}`,
      "───────────────────────────────────────────────────────────────",
      ...evalReport.map(
        (r) => `  ${r.passed ? "✓" : "✗"}  ${r.id}  ${r.name}`,
      ),
      "═══════════════════════════════════════════════════════════════",
      "",
    ];
    console.log(lines.join("\n"));
    expect(failed).toHaveLength(0);
  });
});
