/**
 * useConversation — Phase 11
 *
 * Wraps the voice-agent conversation lifecycle:
 *   - Maintains `ConversationState` between turns
 *   - Calls `/api/voice/converse` with each (transcript|text)
 *   - Returns assistantText + updated state + meta
 *   - Surfaces theme-aware greeting on first turn (if data available)
 *
 * This hook is UI-agnostic — used by both the voice loop
 * (`useVoiceInteraction.onTranscript`) and the text fallback.
 */

import { useCallback, useRef, useState } from "react";
import {
  type ConversationState,
  type AgentVisualState,
  createInitialConversationState,
} from "@/types";

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
  const [state, setState] = useState<ConversationState>(() =>
    createInitialConversationState(generateSessionId()),
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

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
      setState(data.conversationState);
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
  }, []);

  const resetConversation = useCallback(() => {
    setState(createInitialConversationState(generateSessionId()));
    setLastError(null);
  }, []);

  return { state, isProcessing, lastError, send, resetConversation };
}

function generateSessionId(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
