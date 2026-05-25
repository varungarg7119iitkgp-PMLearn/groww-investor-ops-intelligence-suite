/**
 * CrossPillarSync — Phase 14
 *
 * Mount once at the app root to:
 *   1. Hydrate Zustand from Supabase shared_app_state + approval_queue
 *   2. Persist critical shared state (debounced) on store changes
 *   3. Pause voice session when switching to Director Ops
 */

"use client";

import { useEffect, useRef } from "react";
import { useUIStore } from "@/lib/store";
import { mapApprovalStatusToBookingStatus } from "@/lib/shared-state-persistence";
import type { BookingSummary } from "@/types";

const PERSIST_DEBOUNCE_MS = 1500;

export function CrossPillarSync() {
  const hydrateSharedState = useUIStore((s) => s.hydrateSharedState);
  const setHitlItems       = useUIStore((s) => s.setHitlItems);
  const setVoiceSessionPaused = useUIStore((s) => s.setVoiceSessionPaused);
  const activeMode         = useUIStore((s) => s.activeMode);
  const isVoiceActive      = useUIStore((s) => s.isVoiceActive);
  const prevModeRef        = useRef(activeMode);
  const persistTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Initial hydration ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stateRes, approvalsRes] = await Promise.all([
          fetch("/api/shared-state", { cache: "no-store" }),
          fetch("/api/approvals", { cache: "no-store" }),
        ]);
        if (cancelled) return;

        if (stateRes.ok) {
          const json = await stateRes.json();
          if (json?.state) hydrateSharedState(json.state);
        }

        if (approvalsRes.ok) {
          const aJson = await approvalsRes.json();
          const items = aJson?.items ?? [];
          if (items.length > 0) {
            setHitlItems(items);
            const statuses: Record<string, "pending" | "approved" | "rejected"> = {};
            const codes: BookingSummary[] = [];
            for (const item of items) {
              statuses[item.bookingCode] = mapApprovalStatusToBookingStatus(item.status);
              codes.push({
                bookingCode: item.bookingCode,
                investorNameRedacted: item.investorNameRedacted,
                topic: item.topic,
                proposedSlot: item.proposedSlot,
                advisorEmail: item.advisorEmail,
                status: item.status,
                contextNotes: item.emailDraft?.slice(0, 120) ?? "",
              });
            }
            hydrateSharedState({ bookingStatuses: statuses, bookingCodes: codes });
          }
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => { cancelled = true; };
  }, [hydrateSharedState, setHitlItems]);

  /* ── Voice pause on mode switch away from Investor ── */
  useEffect(() => {
    const prev = prevModeRef.current;
    if (
      prev === "investor-terminal" &&
      activeMode === "director-ops"
    ) {
      setVoiceSessionPaused(true, isVoiceActive);
    }
    if (
      prev === "director-ops" &&
      activeMode === "investor-terminal"
    ) {
      /* Resume flag cleared by InvestorTerminal on orb interaction */
    }
    prevModeRef.current = activeMode;
  }, [activeMode, isVoiceActive, setVoiceSessionPaused]);

  /* ── Debounced persistence to Supabase ── */
  useEffect(() => {
    const unsub = useUIStore.subscribe((state, prev) => {
      const sharedChanged =
        state.topTheme !== prev.topTheme ||
        state.marketContext !== prev.marketContext ||
        state.bookingCodes !== prev.bookingCodes ||
        state.bookingStatuses !== prev.bookingStatuses ||
        state.pulseData !== prev.pulseData ||
        state.conversationState !== prev.conversationState;

      if (!sharedChanged) return;

      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        fetch("/api/shared-state", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            topTheme:           state.topTheme,
            marketContext:      state.marketContext,
            bookingCodes:       state.bookingCodes,
            bookingStatuses:    state.bookingStatuses,
            pulseData:          state.pulseData,
            conversationState:  state.conversationState,
          }),
        }).catch(() => { /* noop */ });
      }, PERSIST_DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  return null;
}
