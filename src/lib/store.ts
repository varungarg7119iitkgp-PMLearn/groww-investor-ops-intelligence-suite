/**
 * ============================================================
 * Global Zustand Store — Investor Ops & Intelligence Suite
 * Phase 6: Mode Switcher & Global Navigation
 *
 * Single source of truth for cross-mode UI state.
 *
 * Traceability:
 *   - Requirement 1 (Dual-Mode Interface): activeMode, toggleMode,
 *     isTransitioning, state preservation across mode switches.
 *   - UI/UX Spec §11: UIState interface shape.
 *
 * The store IS the implementation of the UIState interface declared
 * in `src/types/index.ts`. Components subscribe via the `useUIStore`
 * hook; selectors are encouraged to minimise re-renders.
 *
 * Persistence: in-memory only for Phase 6 (Supabase persistence
 * lands in Phase 7). Mode preference is mirrored to localStorage
 * so a reload restores the user's last active mode.
 * ============================================================
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

import {
  createInitialConversationState,
  type ApprovalItem,
  type AppMode,
  type AgentVisualState,
  type BookingSummary,
  type BookingWidgetState,
  type ChatMessage,
  type Citation,
  type ConversationState,
  type UIState,
  type WeeklyPulse,
} from "@/types";

/* ============================================================
   CONSTANTS
   ============================================================ */

/** Debounce window for mode toggling — Req 1 error state #1 */
export const MODE_TOGGLE_DEBOUNCE_MS = 500;

/** Full mode transition duration — UI/UX Spec §4.3 */
export const MODE_TRANSITION_MS = 400;

/** localStorage key for persisting the user's last active mode */
export const MODE_PERSISTENCE_KEY = "nl-suite:active-mode";

/* ============================================================
   HELPERS
   ============================================================ */

/** Persist the active mode (no-op on the server) */
function persistActiveMode(mode: AppMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODE_PERSISTENCE_KEY, mode);
  } catch {
    /* localStorage may be disabled (private browsing); silently ignore */
  }
}

/** Re-hydrate the active mode (returns undefined when unavailable) */
export function readPersistedMode(): AppMode | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(MODE_PERSISTENCE_KEY);
    if (raw === "investor-terminal" || raw === "director-ops") return raw;
    return undefined;
  } catch {
    return undefined;
  }
}

/* ============================================================
   INITIAL STATE
   ============================================================ */

const INITIAL_BOOKING_WIDGET: BookingWidgetState = {
  isOpen: false,
  step:   "date_selection",
};

const INITIAL_CONVERSATION: ConversationState = createInitialConversationState(
  "session-init-placeholder",
);

/* ============================================================
   STORE
   ============================================================ */

/**
 * Internal store shape — extends `UIState` with the `setActiveMode`
 * imperative setter used by the URL-sync layer (we keep it out of
 * UIState to preserve the published type-system surface from Phase 2).
 *
 * Phase 12 additions:
 *   - setIsPulseGenerating  → drive PulseBriefing loading state
 *   - setHitlItems          → batch hydrate the queue from Supabase
 *   - setChatMessages       → batch hydrate chat (Phase 14 mode-switch persistence)
 *   - addBookingStatus / updateBookingStatus → Phase 14 booking-status query
 */
/** Phase 14 — chat metadata preserved across mode switches */
export interface InvestorChatMeta {
  bulletsByMessageId:     Record<string, string[]>;
  citationsByMessageId:   Record<string, Citation[]>;
  lastUpdatedByMessageId: Record<string, string>;
}

export interface UIStoreState extends UIState {
  setActiveMode:        (mode: AppMode) => void;
  setIsPulseGenerating: (v: boolean) => void;
  setHitlItems:         (items: ApprovalItem[]) => void;
  setChatMessages:      (messages: ChatMessage[]) => void;
  /** Phase 14 — booking status lookup populated by HITL events. */
  bookingStatuses:      Record<string, "pending" | "approved" | "rejected">;
  setBookingStatus:     (code: string, status: "pending" | "approved" | "rejected") => void;
  /** Phase 14 — investor chat bullet/citation maps */
  investorChatMeta:     InvestorChatMeta;
  setInvestorChatMeta:  (patch: Partial<InvestorChatMeta>) => void;
  /** Phase 14 — voice pause/resume on mode switch */
  voiceSessionPaused:       boolean;
  voiceWasActiveBeforePause: boolean;
  setVoiceSessionPaused:    (paused: boolean, wasActive?: boolean) => void;
  setIsVoiceActive:         (active: boolean) => void;
  /** Phase 14 — replace full conversation state (voice persistence) */
  setConversationState:   (state: ConversationState) => void;
  hydrateSharedState:     (payload: {
    topTheme?: string | null;
    marketContext?: string | null;
    bookingCodes?: BookingSummary[];
    bookingStatuses?: Record<string, "pending" | "approved" | "rejected">;
    pulseData?: WeeklyPulse | null;
    conversationState?: ConversationState | null;
  }) => void;
}

/* ── Module-scoped transition bookkeeping ──
 * Hoisted out of the store closure so `resetStoreForTests` can clear
 * them between tests; mutating them is intentionally side-effect-only
 * (no Zustand subscribers depend on these values). */
let lastToggleAt: number = 0;
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

function clearTransitionTimer(): void {
  if (transitionTimer !== null) {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  }
}

export const useUIStore = create<UIStoreState>()(
  devtools(
    subscribeWithSelector((set, get) => {
      return {
        /* ── Mode ───────────────────────────────────────────── */
        activeMode:      "investor-terminal",
        isTransitioning: false,

        /* ── Investor Terminal ─────────────────────────────── */
        orbState:        "IDLE",
        audioLevel:      0,
        chatMessages:    [],
        isVoiceActive:   false,
        isMicAvailable:  false,

        /* ── Booking widget ────────────────────────────────── */
        bookingWidget:   INITIAL_BOOKING_WIDGET,

        /* ── Director Ops ──────────────────────────────────── */
        pulseData:         null,
        isPulseGenerating: false,
        hitlItems:         [],

        /* ── Shared cross-pillar state ─────────────────────── */
        topTheme:           null,
        marketContext:      null,
        bookingCodes:       [],
        bookingStatuses:    {},
        conversationState:  INITIAL_CONVERSATION,
        investorChatMeta: {
          bulletsByMessageId:     {},
          citationsByMessageId:   {},
          lastUpdatedByMessageId: {},
        },
        voiceSessionPaused:        false,
        voiceWasActiveBeforePause: false,

        /* ════════════════════════════════════════════════════
           ACTIONS
           ════════════════════════════════════════════════════ */

        /** Debounced 400 ms mode toggle with auto isTransitioning release */
        toggleMode: () => {
          const now = Date.now();
          if (now - lastToggleAt < MODE_TOGGLE_DEBOUNCE_MS) return;
          if (get().isTransitioning) return;
          lastToggleAt = now;

          const next: AppMode =
            get().activeMode === "investor-terminal"
              ? "director-ops"
              : "investor-terminal";

          set({ isTransitioning: true, activeMode: next }, false, "toggleMode");
          persistActiveMode(next);

          clearTransitionTimer();
          transitionTimer = setTimeout(() => {
            set({ isTransitioning: false }, false, "toggleMode/release");
            transitionTimer = null;
          }, MODE_TRANSITION_MS);
        },

        /** Imperative mode setter (used by URL sync) — skips debounce */
        setActiveMode: (mode: AppMode) => {
          if (get().activeMode === mode) return;
          set({ isTransitioning: true, activeMode: mode }, false, "setActiveMode");
          persistActiveMode(mode);

          clearTransitionTimer();
          transitionTimer = setTimeout(() => {
            set({ isTransitioning: false }, false, "setActiveMode/release");
            transitionTimer = null;
          }, MODE_TRANSITION_MS);
        },

        setOrbState: (state: AgentVisualState) =>
          set({ orbState: state }, false, "setOrbState"),

        addChatMessage: (msg: ChatMessage) =>
          set(
            (s) => ({ chatMessages: [...s.chatMessages, msg] }),
            false,
            "addChatMessage",
          ),

        addHitlItem: (item: ApprovalItem) =>
          set(
            (s) => ({ hitlItems: [...s.hitlItems, item] }),
            false,
            "addHitlItem",
          ),

        updateHitlStatus: (
          id: string,
          status: "authorized" | "rejected",
          reason?: string,
        ) =>
          set(
            (s) => {
              const hitlItems = s.hitlItems.map((i) =>
                i.id === id
                  ? {
                      ...i,
                      status,
                      ...(status === "authorized"
                        ? { authorizedAt: new Date().toISOString() }
                        : {}),
                      ...(status === "rejected" && reason
                        ? { overrideReason: reason }
                        : {}),
                    }
                  : i,
              );
              const item = s.hitlItems.find((i) => i.id === id);
              const bookingStatuses = { ...s.bookingStatuses };
              if (item) {
                bookingStatuses[item.bookingCode] =
                  status === "authorized" ? "approved" : "rejected";
              }
              return { hitlItems, bookingStatuses };
            },
            false,
            "updateHitlStatus",
          ),

        setPulseData: (pulse: WeeklyPulse) =>
          set({ pulseData: pulse }, false, "setPulseData"),

        setTopTheme: (theme: string) =>
          set({ topTheme: theme }, false, "setTopTheme"),

        setMarketContext: (snippet: string) =>
          set({ marketContext: snippet }, false, "setMarketContext"),

        addBookingSummary: (summary: BookingSummary) =>
          set(
            (s) => ({ bookingCodes: [...s.bookingCodes, summary] }),
            false,
            "addBookingSummary",
          ),

        updateConversationState: (patch: Partial<ConversationState>) =>
          set(
            (s) => ({ conversationState: { ...s.conversationState, ...patch } }),
            false,
            "updateConversationState",
          ),

        setBookingWidget: (patch: Partial<BookingWidgetState>) =>
          set(
            (s) => ({ bookingWidget: { ...s.bookingWidget, ...patch } }),
            false,
            "setBookingWidget",
          ),

        resetConversation: () =>
          set(
            {
              conversationState: createInitialConversationState(
                "session-" + Date.now(),
              ),
            },
            false,
            "resetConversation",
          ),

        /* ── Phase 12+ additions ──────────────────────────── */
        setIsPulseGenerating: (v: boolean) =>
          set({ isPulseGenerating: v }, false, "setIsPulseGenerating"),

        setHitlItems: (items: ApprovalItem[]) =>
          set({ hitlItems: items }, false, "setHitlItems"),

        setChatMessages: (messages: ChatMessage[]) =>
          set({ chatMessages: messages }, false, "setChatMessages"),

        setBookingStatus: (code: string, status: "pending" | "approved" | "rejected") =>
          set(
            (s) => ({ bookingStatuses: { ...s.bookingStatuses, [code]: status } }),
            false,
            "setBookingStatus",
          ),

        setInvestorChatMeta: (patch: Partial<InvestorChatMeta>) =>
          set(
            (s) => ({
              investorChatMeta: {
                bulletsByMessageId: patch.bulletsByMessageId
                  ? { ...s.investorChatMeta.bulletsByMessageId, ...patch.bulletsByMessageId }
                  : s.investorChatMeta.bulletsByMessageId,
                citationsByMessageId: patch.citationsByMessageId
                  ? { ...s.investorChatMeta.citationsByMessageId, ...patch.citationsByMessageId }
                  : s.investorChatMeta.citationsByMessageId,
                lastUpdatedByMessageId: patch.lastUpdatedByMessageId
                  ? { ...s.investorChatMeta.lastUpdatedByMessageId, ...patch.lastUpdatedByMessageId }
                  : s.investorChatMeta.lastUpdatedByMessageId,
              },
            }),
            false,
            "setInvestorChatMeta",
          ),

        setVoiceSessionPaused: (paused: boolean, wasActive?: boolean) =>
          set(
            {
              voiceSessionPaused: paused,
              ...(wasActive !== undefined
                ? { voiceWasActiveBeforePause: wasActive }
                : {}),
            },
            false,
            "setVoiceSessionPaused",
          ),

        setIsVoiceActive: (active: boolean) =>
          set({ isVoiceActive: active }, false, "setIsVoiceActive"),

        setConversationState: (state: ConversationState) =>
          set({ conversationState: state }, false, "setConversationState"),

        hydrateSharedState: (payload) =>
          set(
            (s) => ({
              topTheme: payload.topTheme !== undefined ? payload.topTheme : s.topTheme,
              marketContext:
                payload.marketContext !== undefined
                  ? payload.marketContext
                  : s.marketContext,
              bookingCodes:
                payload.bookingCodes !== undefined
                  ? payload.bookingCodes
                  : s.bookingCodes,
              bookingStatuses:
                payload.bookingStatuses !== undefined
                  ? payload.bookingStatuses
                  : s.bookingStatuses,
              pulseData:
                payload.pulseData !== undefined ? payload.pulseData : s.pulseData,
              conversationState:
                payload.conversationState != null
                  ? payload.conversationState
                  : s.conversationState,
            }),
            false,
            "hydrateSharedState",
          ),
      } satisfies UIStoreState;
    }),
    { name: "nl-suite-ui-store", enabled: process.env.NODE_ENV !== "production" },
  ),
);

/* ============================================================
   CONVENIENCE SELECTORS — encouraged to minimise re-renders
   ============================================================ */

export const selectActiveMode      = (s: UIStoreState) => s.activeMode;
export const selectIsTransitioning = (s: UIStoreState) => s.isTransitioning;
export const selectOrbState        = (s: UIStoreState) => s.orbState;
export const selectChatMessages    = (s: UIStoreState) => s.chatMessages;
export const selectHitlItems       = (s: UIStoreState) => s.hitlItems;
export const selectPulseData       = (s: UIStoreState) => s.pulseData;

/**
 * Returns the short uppercase label (`"INVESTOR" | "DIRECTOR"`) derived
 * from the long-form `activeMode`. Useful for the ModeToggle pill labels.
 */
export const selectActiveModeLabel = (s: UIStoreState): "INVESTOR" | "DIRECTOR" =>
  s.activeMode === "investor-terminal" ? "INVESTOR" : "DIRECTOR";

/* ============================================================
   STATE-PRESERVATION HELPERS (used by tests + dev tools)
   ============================================================ */

/** Hard reset — wipes the store back to its initial values + clears
 *  the module-scoped debounce / transition bookkeeping. Tests MUST call
 *  this in `beforeEach` to avoid cross-test pollution.
 */
export function resetStoreForTests(): void {
  clearTransitionTimer();
  lastToggleAt = 0;

  useUIStore.setState(
    {
      activeMode:        "investor-terminal",
      isTransitioning:   false,
      orbState:          "IDLE",
      audioLevel:        0,
      chatMessages:      [],
      isVoiceActive:     false,
      isMicAvailable:    false,
      bookingWidget:     INITIAL_BOOKING_WIDGET,
      pulseData:         null,
      isPulseGenerating: false,
      hitlItems:         [],
      topTheme:          null,
      marketContext:     null,
      bookingCodes:      [],
      bookingStatuses:   {},
      conversationState: createInitialConversationState("session-init-placeholder"),
      investorChatMeta: {
        bulletsByMessageId:     {},
        citationsByMessageId:   {},
        lastUpdatedByMessageId: {},
      },
      voiceSessionPaused:        false,
      voiceWasActiveBeforePause: false,
    },
    false,
  );
}
