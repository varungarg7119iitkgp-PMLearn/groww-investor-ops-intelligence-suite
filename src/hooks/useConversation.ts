/**
 * useConversation — Phase 11 / Phase 14
 *
 * Wraps the voice-agent conversation lifecycle with Zustand-backed
 * state so mode switches preserve the voice session.
 */

import { useCallback, useRef, useState } from "react";
import {
  type ConversationState,
  type AgentVisualState,
  type BookingSummary,
  createInitialConversationState,
} from "@/types";
import { useUIStore } from "@/lib/store";

export interface ConversationTurnResult {
  assistantText: string;
  state: ConversationState;
  toolCalls: Array<{ name: string; ok: boolean }>;
  orbState: AgentVisualState;
  meta: {
    latencyMs: number;
    model: string;
    complianceFlag: string;
  };
}

export interface UseConversationResult {
  state: ConversationState;
  isProcessing: boolean;
  lastError: string | null;
  send: (userInput: string) => Promise<ConversationTurnResult | null>;
  resetConversation: () => void;
}

export function useConversation(): UseConversationResult {
  const storeState = useUIStore((s) => s.conversationState);
  const setConversationState = useUIStore((s) => s.setConversationState);
  const topTheme = useUIStore((s) => s.topTheme);
  const setBookingStatus = useUIStore((s) => s.setBookingStatus);
  const addBookingSummary = useUIStore((s) => s.addBookingSummary);

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const stateRef = useRef(storeState);
  stateRef.current = storeState;

  const send = useCallback(async (userInput: string): Promise<ConversationTurnResult | null> => {
    setIsProcessing(true);
    setLastError(null);
    try {
      const res = await fetch("/api/voice/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput,
          conversationState: stateRef.current,
          topThemeOverride: topTheme ?? undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        setLastError(`Converse API ${res.status}: ${text.slice(0, 200)}`);
        return null;
      }
      const data = (await res.json()) as {
        assistantText: string;
        conversationState: ConversationState;
        toolCalls: Array<{ name: string; ok: boolean; output?: unknown }>;
        orbState: AgentVisualState;
        meta: { latencyMs: number; model: string; complianceFlag: string };
      };

      setConversationState(data.conversationState);

      /* Phase 14 — sync booking code to shared state when generated */
      if (data.conversationState.bookingCode) {
        const code = data.conversationState.bookingCode;
        setBookingStatus(code, "pending");
        const summary: BookingSummary = {
          bookingCode: code,
          investorNameRedacted: "[REDACTED]",
          topic: data.conversationState.topic ?? "kyc",
          proposedSlot: new Date(Date.now() + 86400000).toISOString(),
          advisorEmail: "advisor@groww.in",
          status: "pending_review",
          contextNotes: data.conversationState.lastUserInput ?? "",
        };
        addBookingSummary(summary);
      }

      return {
        assistantText: data.assistantText,
        state: data.conversationState,
        toolCalls: data.toolCalls.map((c) => ({ name: c.name, ok: c.ok })),
        orbState: data.orbState,
        meta: data.meta,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(msg);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [topTheme, setConversationState, setBookingStatus, addBookingSummary]);

  const resetConversation = useCallback(() => {
    const fresh = createInitialConversationState(generateSessionId());
    stateRef.current = fresh;
    setConversationState(fresh);
    setLastError(null);
  }, [setConversationState]);

  return { state: storeState, isProcessing, lastError, send, resetConversation };
}

function generateSessionId(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
