/**
 * Phase 6 — Zustand store unit tests
 *
 * Coverage:
 *   - initial state matches UIState contract
 *   - toggleMode flips activeMode + sets isTransitioning
 *   - toggleMode is debounced (500ms)
 *   - toggleMode is blocked while a transition is in flight
 *   - setActiveMode imperative setter behavior
 *   - state-mutating actions (addChatMessage, addHitlItem, updateHitlStatus,
 *     setPulseData, setTopTheme, setMarketContext, addBookingSummary, etc.)
 *   - state is preserved across multiple toggleMode calls
 *   - localStorage persistence (readPersistedMode)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";

import {
  useUIStore,
  resetStoreForTests,
  readPersistedMode,
  MODE_TOGGLE_DEBOUNCE_MS,
  MODE_TRANSITION_MS,
  MODE_PERSISTENCE_KEY,
} from "@/lib/store";
import { createChatMessage } from "@/types";
import type { ApprovalItem, WeeklyPulse, PulseTheme } from "@/types";

/* ── Test fixtures ──────────────────────────────────────────── */

const SAMPLE_PULSE_THEME: PulseTheme = {
  name:        "KYC Friction",
  reviewCount: 100,
  isTopThree:  true,
  sentiment:   "negative",
};

const SAMPLE_PULSE: WeeklyPulse = {
  id:          "p1",
  weekStart:   "2026-05-19",
  reviewCount: 100,
  wordCount:   200,
  status:      "draft",
  themes:      [SAMPLE_PULSE_THEME],
  summaryText: "test",
  quotes:      ["q1", "q2", "q3"],
  actionIdeas: ["a1", "a2", "a3"],
  createdAt:   "2026-05-24T00:00:00.000Z",
};

const SAMPLE_HITL: ApprovalItem = {
  id:                    "hitl-1",
  bookingCode:           "NL-A3X9",
  investorNameRedacted:  "[REDACTED]",
  topic:                 "kyc",
  proposedSlot:          "2026-05-27T10:30:00.000Z",
  advisorEmail:          "test@groww.in",
  emailDraft:            "draft",
  marketContextSnippet:  "context",
  status:                "pending_review",
  createdAt:             "2026-05-24T09:15:00.000Z",
};

/* ── Setup / teardown ──────────────────────────────────────── */

beforeEach(() => {
  vi.useFakeTimers();
  resetStoreForTests();
  /* Reset localStorage so persistence tests are isolated */
  if (typeof window !== "undefined") window.localStorage.clear();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

/* ════════════════════════════════════════════════════════════
   SUITE 1 — Initial state
   ════════════════════════════════════════════════════════════ */
describe("useUIStore — initial state", () => {
  it("defaults to investor-terminal mode and not transitioning", () => {
    const s = useUIStore.getState();
    expect(s.activeMode).toBe("investor-terminal");
    expect(s.isTransitioning).toBe(false);
  });

  it("has empty chatMessages / hitlItems / bookingCodes", () => {
    const s = useUIStore.getState();
    expect(s.chatMessages).toEqual([]);
    expect(s.hitlItems).toEqual([]);
    expect(s.bookingCodes).toEqual([]);
  });

  it("has null pulse data and null shared context", () => {
    const s = useUIStore.getState();
    expect(s.pulseData).toBeNull();
    expect(s.topTheme).toBeNull();
    expect(s.marketContext).toBeNull();
  });

  it("orbState defaults to IDLE", () => {
    expect(useUIStore.getState().orbState).toBe("IDLE");
  });
});

/* ════════════════════════════════════════════════════════════
   SUITE 2 — toggleMode debounce + transition
   ════════════════════════════════════════════════════════════ */
describe("useUIStore — toggleMode", () => {
  it("flips activeMode investor → director", () => {
    act(() => useUIStore.getState().toggleMode());
    expect(useUIStore.getState().activeMode).toBe("director-ops");
  });

  it("sets isTransitioning=true and releases after MODE_TRANSITION_MS", async () => {
    act(() => useUIStore.getState().toggleMode());
    expect(useUIStore.getState().isTransitioning).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODE_TRANSITION_MS + 50);
    });
    expect(useUIStore.getState().isTransitioning).toBe(false);
  });

  it("a rapid second call within the debounce window is ignored", () => {
    act(() => useUIStore.getState().toggleMode());
    /* Force isTransitioning back to false so only the debounce kicks in */
    useUIStore.setState({ isTransitioning: false });
    act(() => useUIStore.getState().toggleMode());
    expect(useUIStore.getState().activeMode).toBe("director-ops"); /* unchanged */
  });

  it("the second toggle SUCCEEDS once the debounce window elapses", async () => {
    act(() => useUIStore.getState().toggleMode());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODE_TOGGLE_DEBOUNCE_MS + MODE_TRANSITION_MS + 100);
    });
    act(() => useUIStore.getState().toggleMode());
    expect(useUIStore.getState().activeMode).toBe("investor-terminal");
  });

  it("a toggle issued while isTransitioning is true is also rejected", () => {
    act(() => useUIStore.getState().toggleMode());
    /* isTransitioning is now true; further toggles should no-op */
    act(() => useUIStore.getState().toggleMode());
    expect(useUIStore.getState().activeMode).toBe("director-ops");
  });
});

/* ════════════════════════════════════════════════════════════
   SUITE 3 — setActiveMode imperative setter
   ════════════════════════════════════════════════════════════ */
describe("useUIStore — setActiveMode", () => {
  it("sets to director-ops and flips isTransitioning briefly", async () => {
    act(() => useUIStore.getState().setActiveMode("director-ops"));
    expect(useUIStore.getState().activeMode).toBe("director-ops");
    expect(useUIStore.getState().isTransitioning).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(MODE_TRANSITION_MS + 50); });
    expect(useUIStore.getState().isTransitioning).toBe(false);
  });

  it("is a no-op when the requested mode equals the current mode", () => {
    act(() => useUIStore.getState().setActiveMode("investor-terminal"));
    expect(useUIStore.getState().isTransitioning).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════
   SUITE 4 — Investor-side actions
   ════════════════════════════════════════════════════════════ */
describe("useUIStore — investor-side mutations", () => {
  it("setOrbState updates orbState", () => {
    act(() => useUIStore.getState().setOrbState("THINKING"));
    expect(useUIStore.getState().orbState).toBe("THINKING");
  });

  it("addChatMessage appends to chatMessages", () => {
    const m1 = createChatMessage("user", "hello");
    const m2 = createChatMessage("assistant", "hi back");
    act(() => useUIStore.getState().addChatMessage(m1));
    act(() => useUIStore.getState().addChatMessage(m2));
    const msgs = useUIStore.getState().chatMessages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toBe(m1);
    expect(msgs[1]).toBe(m2);
  });
});

/* ════════════════════════════════════════════════════════════
   SUITE 5 — Director-side actions
   ════════════════════════════════════════════════════════════ */
describe("useUIStore — director-side mutations", () => {
  it("addHitlItem appends to hitlItems", () => {
    act(() => useUIStore.getState().addHitlItem(SAMPLE_HITL));
    expect(useUIStore.getState().hitlItems).toHaveLength(1);
  });

  it("updateHitlStatus authorizes and stamps authorizedAt", () => {
    act(() => useUIStore.getState().addHitlItem(SAMPLE_HITL));
    act(() => useUIStore.getState().updateHitlStatus("hitl-1", "authorized"));
    const item = useUIStore.getState().hitlItems[0];
    expect(item.status).toBe("authorized");
    expect(item.authorizedAt).toBeDefined();
  });

  it("updateHitlStatus rejected attaches override reason", () => {
    act(() => useUIStore.getState().addHitlItem(SAMPLE_HITL));
    act(() => useUIStore.getState().updateHitlStatus("hitl-1", "rejected", "Spam"));
    const item = useUIStore.getState().hitlItems[0];
    expect(item.status).toBe("rejected");
    expect(item.overrideReason).toBe("Spam");
  });

  it("setPulseData stores the pulse", () => {
    act(() => useUIStore.getState().setPulseData(SAMPLE_PULSE));
    expect(useUIStore.getState().pulseData).toBe(SAMPLE_PULSE);
  });
});

/* ════════════════════════════════════════════════════════════
   SUITE 6 — Shared cross-pillar state
   ════════════════════════════════════════════════════════════ */
describe("useUIStore — shared state", () => {
  it("setTopTheme + setMarketContext store strings", () => {
    act(() => useUIStore.getState().setTopTheme("KYC Friction"));
    act(() => useUIStore.getState().setMarketContext("SEBI circular May-2026"));
    const s = useUIStore.getState();
    expect(s.topTheme).toBe("KYC Friction");
    expect(s.marketContext).toBe("SEBI circular May-2026");
  });

  it("addBookingSummary appends bookingCodes", () => {
    act(() =>
      useUIStore.getState().addBookingSummary({
        bookingCode:         "NL-A3X9",
        investorNameRedacted:"[REDACTED]",
        topic:               "kyc",
        proposedSlot:        "2026-05-27 10:30",
        advisorEmail:        "test@groww.in",
        status:              "pending_review",
        contextNotes:        "ctx",
      }),
    );
    expect(useUIStore.getState().bookingCodes).toHaveLength(1);
  });
});

/* ════════════════════════════════════════════════════════════
   SUITE 7 — State preservation across mode switches
   ════════════════════════════════════════════════════════════ */
describe("useUIStore — state preservation across switches", () => {
  it("chat messages survive toggleMode → toggleMode round-trip (Req 1.6)", async () => {
    const m1 = createChatMessage("user", "preserved across modes");
    act(() => useUIStore.getState().addChatMessage(m1));

    /* Investor → Director */
    act(() => useUIStore.getState().toggleMode());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODE_TOGGLE_DEBOUNCE_MS + MODE_TRANSITION_MS + 100);
    });

    /* Director → Investor */
    act(() => useUIStore.getState().toggleMode());

    expect(useUIStore.getState().activeMode).toBe("investor-terminal");
    expect(useUIStore.getState().chatMessages).toContainEqual(m1);
  });

  it("HITL items survive cross-mode round-trips (Req 1.6)", async () => {
    act(() => useUIStore.getState().addHitlItem(SAMPLE_HITL));

    act(() => useUIStore.getState().toggleMode());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODE_TOGGLE_DEBOUNCE_MS + MODE_TRANSITION_MS + 100);
    });
    act(() => useUIStore.getState().toggleMode());

    expect(useUIStore.getState().hitlItems[0].id).toBe("hitl-1");
  });
});

/* ════════════════════════════════════════════════════════════
   SUITE 8 — localStorage persistence
   ════════════════════════════════════════════════════════════ */
describe("useUIStore — localStorage persistence", () => {
  it("toggleMode persists the new mode under MODE_PERSISTENCE_KEY", () => {
    act(() => useUIStore.getState().toggleMode());
    const persisted = window.localStorage.getItem(MODE_PERSISTENCE_KEY);
    expect(persisted).toBe("director-ops");
  });

  it("readPersistedMode returns the persisted value", () => {
    window.localStorage.setItem(MODE_PERSISTENCE_KEY, "director-ops");
    expect(readPersistedMode()).toBe("director-ops");
  });

  it("readPersistedMode returns undefined for invalid values", () => {
    window.localStorage.setItem(MODE_PERSISTENCE_KEY, "garbage");
    expect(readPersistedMode()).toBeUndefined();
  });
});
