/**
 * InvestorTerminal — Phase 6 (Mode Switcher & Global Navigation)
 *
 * Extracted from the old `/app/page.tsx` so the root entry point can
 * render either this OR `DirectorOpsConsole` via the ModeTransition
 * wrapper driven by Zustand `activeMode`.
 *
 * Spec compliance:
 *   - UI/UX §5: full Investor layout (ticker, orb, chat, news rail).
 *   - Req 1 acc-criteria #4: this is the *only* surface visible when
 *     `activeMode === "investor-terminal"`.
 *
 * State preservation (Req 1.6): all chat / orb / mic state is held
 * in this component for now; Phase 7+ will hoist chat history into
 * Zustand. For Phase 6 the component is kept mounted across mode
 * switches by `AnimatePresence` only when needed — but switching
 * back unmounts and remounts. We rely on the global Zustand store
 * to hold cross-mode persistence; component-local state (chat
 * scratch pad) is intentionally ephemeral until backend wiring.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  MarqueeTicker,
  AIOrb,
  ChatTerminal,
  InputBar,
  KnowledgeHubHeader,
  NewsRail,
} from "@/components/investor-terminal";
import { OpsAccessButton, ScanningLine } from "@/components/shared";
import { createChatMessage } from "@/types";
import type { ChatMessage, AgentVisualState, Citation } from "@/types";
import { useVoiceInteraction } from "@/hooks/useVoiceInteraction";
import { useConversation } from "@/hooks/useConversation";
import { useUIStore } from "@/lib/store";

/** Response envelope from POST /api/chat (Phase 8). */
interface ChatApiResponse {
  answer: {
    summary: string;
    bullets: string[];
    citations: Citation[];
    inScope: boolean;
    complianceFlag: "ok" | "out_of_scope" | "advice_block" | "pii_block";
  };
  meta: {
    lastUpdated: string;
    retrievedSources: number;
    latencyMs: number;
    model: string;
    feeExplainerInvoked: boolean;
    fundsIdentified: string[];
  };
}

/* ── Sample Citations ────────────────────────────────────────── */
const SAMPLE_CITATIONS: Citation[] = [
  {
    fundId:         "hdfc-hyb",
    fundName:       "HDFC Hybrid Equity Fund",
    source:         "https://www.hdfcfund.com",
    snippet:        "The fund maintains 65–80% equity allocation targeting long-term capital appreciation.",
    relevanceScore: 0.92,
  },
  {
    fundId:         "icici-psu",
    fundName:       "ICICI Pru PSU Equity Fund",
    source:         "https://www.icicipruamc.com",
    snippet:        "Focused on Central & State PSU stocks with a minimum 80% allocation to PSU equity.",
    relevanceScore: 0.88,
  },
  {
    fundId:         "sbi-psu",
    fundName:       "SBI PSU Direct Fund",
    source:         "https://www.sbimf.com",
    snippet:        "This thematic fund invests exclusively in public sector undertakings listed on NSE/BSE.",
    relevanceScore: 0.85,
  },
];

/* ── Initial mock message seed ───────────────────────────────── */
function buildInitialMessages(): {
  messages: ChatMessage[];
  bulletsByMessageId: Record<string, string[]>;
  citationsByMessageId: Record<string, Citation[]>;
} {
  const sys = createChatMessage("system", "Smart_Sync Knowledge Base — 20 Funds Indexed");
  const u1  = createChatMessage("user",   "Tell me about HDFC Hybrid Equity Fund performance.");
  const a1  = createChatMessage("assistant", "Here are the key facts about HDFC Hybrid Equity Fund:");
  const u2  = createChatMessage("user",   "Compare PSU equity funds. What are the exit loads?");
  const a2  = createChatMessage("assistant", "Comparing PSU equity funds across exit loads and mandates:");
  const u3  = createChatMessage("user",   "What is the minimum SIP amount for Silver ETF FoFs?");
  const a3  = createChatMessage("assistant", "Silver ETF FoFs have a common SIP structure across AMCs:");

  const bulletsByMessageId: Record<string, string[]> = {
    [a1.id]: [
      "Fund Category: Aggressive Hybrid — 65–80% in equity, remainder in debt instruments.",
      "NAV (24 May 2026): ₹98.23 per unit (+1.45% intraday, +7.2% YTD).",
      "1-Year Return: 16.4% | 3-Year: 12.8% CAGR | 5-Year: 14.1% CAGR (direct plan).",
      "Exit Load: 1% if redeemed within 1 year; Nil thereafter.",
      "Fund Manager: Chirag Setalvad (equity tranche), Anupam Joshi (debt tranche).",
      "Risk Rating: Moderately High. Suitable for investors with 3–5 year horizon.",
    ],
    [a2.id]: [
      "ICICI Pru PSU Equity: 80%+ in PSU stocks; Exit load 1% within 12 months.",
      "SBI PSU Direct: Invests in BSE PSU Index constituents; Exit load 0.5% < 30 days.",
      "Invesco PSU Equity: Active stock-picking within PSU universe; No exit load.",
      "Aditya Birla SL PSU Equity: 80% PSU equity mandate; Exit load 1% < 365 days.",
      "All 4 funds classify as Sectoral/Thematic — highest risk category per SEBI.",
      "Expense ratio ranges 0.35% (direct) to 2.1% (regular) across PSU fund category.",
    ],
    [a3.id]: [
      "Minimum SIP: ₹500/month across all Silver ETF FoF schemes (HDFC, ICICI, Nippon, ABSL, Axis).",
      "These are Fund of Funds — they invest in the AMC's own Silver ETF, not silver directly.",
      "Underlying ETF tracks domestic silver prices (MCX contract-based pricing).",
      "No demat required — units are held in standard MF folios via AMC/registrar.",
      "Tax treatment: Debt fund taxation (pre-2023 budget) — indexation not available post April 2023.",
      "Ideal for: Commodity diversification without holding physical silver or a demat account.",
    ],
  };

  const citationsByMessageId: Record<string, Citation[]> = {
    [a1.id]: [SAMPLE_CITATIONS[0]],
    [a2.id]: [SAMPLE_CITATIONS[1], SAMPLE_CITATIONS[2]],
    [a3.id]: [SAMPLE_CITATIONS[0], SAMPLE_CITATIONS[1]],
  };

  return {
    messages: [sys, u1, a1, u2, a2, u3, a3],
    bulletsByMessageId,
    citationsByMessageId,
  };
}

const { messages: INIT_MESSAGES, bulletsByMessageId: INIT_BULLETS, citationsByMessageId: INIT_CITES } =
  buildInitialMessages();

const ORB_CYCLE: AgentVisualState[] = ["IDLE", "LISTENING", "THINKING", "SPEAKING"];

/** Best-effort JSON parser — returns `undefined` for non-JSON bodies. */
async function safeJson(res: Response): Promise<{ error?: string } | undefined> {
  try {
    return (await res.json()) as { error?: string };
  } catch {
    return undefined;
  }
}

export function InvestorTerminal() {
  const chatMessages      = useUIStore((s) => s.chatMessages);
  const addChatMessage    = useUIStore((s) => s.addChatMessage);
  const setChatMessages   = useUIStore((s) => s.setChatMessages);
  const chatMeta          = useUIStore((s) => s.investorChatMeta);
  const setInvestorChatMeta = useUIStore((s) => s.setInvestorChatMeta);
  const topTheme          = useUIStore((s) => s.topTheme);
  const bookingStatuses   = useUIStore((s) => s.bookingStatuses);
  const voiceSessionPaused = useUIStore((s) => s.voiceSessionPaused);
  const voiceWasActiveBeforePause = useUIStore((s) => s.voiceWasActiveBeforePause);
  const setVoiceSessionPaused = useUIStore((s) => s.setVoiceSessionPaused);
  const setIsVoiceActive  = useUIStore((s) => s.setIsVoiceActive);

  const [orbState,   setOrbState]   = useState<AgentVisualState>("IDLE");
  const [isTyping,   setIsTyping]   = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [scanVisible, setScanVisible] = useState(false);
  const [orbStateIdx, setOrbStateIdx] = useState(0);
  const [prefill,    setPrefill]    = useState("");

  /** Refs used to fire the one-time welcome greeting without stale closure */
  const voiceSpeakRef    = useRef<((text: string) => Promise<void>) | null>(null);
  const greetingFiredRef = useRef(false);

  /* Seed demo chat once if store is empty (Phase 14 persistence) */
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages(INIT_MESSAGES);
      setInvestorChatMeta({
        bulletsByMessageId:     INIT_BULLETS,
        citationsByMessageId:   INIT_CITES,
        lastUpdatedByMessageId: {},
      });
    }
  }, [chatMessages.length, setChatMessages, setInvestorChatMeta]);

  const messages = chatMessages.length > 0 ? chatMessages : INIT_MESSAGES;
  const bulletMap = chatMeta.bulletsByMessageId;
  const citeMap = chatMeta.citationsByMessageId;
  const lastUpdatedMap = chatMeta.lastUpdatedByMessageId;

  const cycleOrb = useCallback(() => {
    setOrbStateIdx((prev) => {
      const next = (prev + 1) % ORB_CYCLE.length;
      setOrbState(ORB_CYCLE[next]);
      return next;
    });
  }, []);

  const handleTickerClick = useCallback((fundName: string) => {
    setPrefill(`Show key stats for ${fundName}`);
  }, []);

  const handleSubmit = useCallback(
    async (text: string) => {
      const userMsg = createChatMessage("user", text);
      addChatMessage(userMsg);
      setIsTyping(true);
      setOrbState("THINKING");

      try {
        const res = await fetch("/api/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ query: text, bookingStatuses }),
        });

        if (!res.ok) {
          const errBody = await safeJson(res);
          const errMsg = errBody?.error ?? `HTTP ${res.status}`;
          const agentMsg = createChatMessage(
            "assistant",
            "Smart_Sync encountered an issue while processing your query.",
          );
          addChatMessage(agentMsg);
          setInvestorChatMeta({
            bulletsByMessageId: {
              [agentMsg.id]: [
                "The Smart-Sync orchestrator returned an error.",
                `Status: ${res.status}. Detail: ${String(errMsg).slice(0, 80)}.`,
                "This usually indicates a transient backend issue (Gemini or Supabase).",
                "No facts were generated — to avoid hallucination, no bullets are shown.",
                "Please retry the query in a few seconds.",
                "If the issue persists, contact the Director Ops team.",
              ],
            },
            citationsByMessageId: { [agentMsg.id]: [] },
          });
          return;
        }

        const data = (await res.json()) as ChatApiResponse;
        const agentMsg = createChatMessage("assistant", data.answer.summary);
        addChatMessage(agentMsg);
        setInvestorChatMeta({
          bulletsByMessageId:     { [agentMsg.id]: data.answer.bullets },
          citationsByMessageId:   { [agentMsg.id]: data.answer.citations },
          lastUpdatedByMessageId: { [agentMsg.id]: data.meta.lastUpdated },
        });
      } catch (err) {
        const agentMsg = createChatMessage(
          "assistant",
          "Smart_Sync could not reach the Knowledge Base.",
        );
        const detail = err instanceof Error ? err.message : String(err);
        addChatMessage(agentMsg);
        setInvestorChatMeta({
          bulletsByMessageId: {
            [agentMsg.id]: [
              "Network request to /api/chat failed.",
              `Detail: ${detail.slice(0, 80)}.`,
              "Smart_Sync is grounded — no fallback content is generated to prevent hallucination.",
              "Please check your network connection and retry.",
              "If you are running locally, verify `npm run dev` is active.",
              "Smart_Sync will resume normal operation when the API is reachable.",
            ],
          },
          citationsByMessageId: { [agentMsg.id]: [] },
        });
      } finally {
        setIsTyping(false);
        setOrbState("IDLE");
        setScanVisible(true);
        setPrefill("");
      }
    },
    [addChatMessage, bookingStatuses, setInvestorChatMeta],
  );

  /* ─── PHASE 11: Voice loop integration ─────────────────────── */
  const conversation = useConversation();

  const voice = useVoiceInteraction({
    onTranscript: async (transcript) => {
      const userMsg = createChatMessage("user", transcript);
      addChatMessage(userMsg);
      setIsTyping(true);
      setIsVoiceActive(true);

      const turn = await conversation.send(transcript);
      setIsTyping(false);

      if (!turn) {
        addChatMessage(
          createChatMessage(
            "assistant",
            "Voice unavailable. Type your questions below.",
          ),
        );
        setIsVoiceActive(false);
        return;
      }

      const agentMsg = createChatMessage("assistant", turn.assistantText);
      addChatMessage(agentMsg);
      setScanVisible(true);
      setIsVoiceActive(false);
      setVoiceSessionPaused(false);

      return { assistantText: turn.assistantText };
    },
  });

  /* Keep the speak ref current so the one-time greeting effect below
   * can call the latest version without it as a dependency. */
  useEffect(() => {
    voiceSpeakRef.current = voice.speak;
  });

  const speakWelcomeGreeting = useCallback(async () => {
    if (greetingFiredRef.current) return;
    const h = new Date().getHours();
    const tod = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
    const msg =
      `Good ${tod}! I'm Smart Sync, your AI research assistant for Groww's curated mutual funds. ` +
      `Tap me to ask anything by voice, or type your question below.`;
    await voiceSpeakRef.current?.(msg);
    greetingFiredRef.current = true;
  }, []);

  /* Welcome greeting — auto-play ~2 s after mount (user expects on load).
   * Orb/mic click retries if autoplay was blocked before first attempt. */
  useEffect(() => {
    const timer = setTimeout(() => {
      void speakWelcomeGreeting();
    }, 2000);
    return () => clearTimeout(timer);
  }, [speakWelcomeGreeting]);

  /* Cleanup voice resources only on unmount — NOT on every render.
   * `useVoiceInteraction` returns a new object each render; depending on
   * `[voice]` caused reset() to fire continuously and killed mic listening. */
  const voiceResetRef = useRef(voice.reset);
  voiceResetRef.current = voice.reset;
  useEffect(() => {
    return () => {
      voiceResetRef.current();
    };
  }, []);

  const handleMicToggle = useCallback(
    async (active: boolean) => {
      void speakWelcomeGreeting();
      setIsMicActive(active);
      setIsVoiceActive(active);
      if (voiceSessionPaused) setVoiceSessionPaused(false);
      if (active) {
        await voice.startListening();
      } else {
        await voice.stopListening();
        setIsVoiceActive(false);
      }
    },
    [voice, voiceSessionPaused, setVoiceSessionPaused, setIsVoiceActive, speakWelcomeGreeting],
  );

  const handleOrbClick = useCallback(async () => {
    void speakWelcomeGreeting();
    if (voiceSessionPaused) setVoiceSessionPaused(false);
    if (voice.isListening) {
      setIsMicActive(false);
      setIsVoiceActive(false);
      await voice.stopListening();
      return;
    }
    if (voice.orbState === "THINKING" || voice.orbState === "SPEAKING") {
      return;
    }
    if (voice.isTextFallback) {
      cycleOrb();
      return;
    }
    setIsMicActive(true);
    setIsVoiceActive(true);
    await voice.startListening();
  }, [voice, voiceSessionPaused, setVoiceSessionPaused, setIsVoiceActive, cycleOrb, speakWelcomeGreeting]);

  /* Derive orb state from voice hook when voice mode is in use,
   * otherwise fall through to the local text-mode state. */
  const displayOrbState =
    voice.isListening || voice.orbState !== "IDLE" ? voice.orbState : orbState;
  const displayAudioLevel =
    voice.isListening || voice.orbState === "SPEAKING" ? voice.audioLevel : 0;

  return (
    <>
      <OpsAccessButton />

      {/* ── Local scanning-line (chat response indicator) ── */}
      <ScanningLine
        isVisible={scanVisible}
        color="investor"
        onComplete={() => setScanVisible(false)}
      />

      {/* ── Full-height layout ── */}
      <div
        data-testid="investor-terminal-root"
        style={{
          position:       "fixed",
          inset:          0,
          display:        "flex",
          flexDirection:  "column",
          zIndex:         10,
          overflow:       "hidden",
        }}
      >
        {/* ── Ticker bar — pinned at top ── */}
        <MarqueeTicker onItemClick={handleTickerClick} />

        {/* ── Branded Knowledge Hub header + global mode toggle ── */}
        <KnowledgeHubHeader investorName="Investor" fundCount={20} />

        {/* ── Main 75:25 split — Chat column | News rail ── */}
        <div
          style={{
            flex:                1,
            minHeight:           0,
            display:             "grid",
            gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)",
            gap:                 "24px",
            padding:             "8px 24px 0",
            maxWidth:            "1600px",
            width:               "100%",
            margin:              "0 auto",
            alignItems:          "stretch",
            overflow:            "hidden",
          }}
        >
          {/* ─────────────── LEFT (75%) ─────────────── */}
          <main
            style={{
              display:        "flex",
              flexDirection:  "column",
              minHeight:      0,
              height:         "100%",
              width:          "100%",
            }}
            aria-label="Investor Knowledge Hub — main conversation"
          >
            {/* ── Compact orb cluster (fixed height) ── */}
            <div
              style={{
                flexShrink:     0,
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                gap:            "2px",
                paddingBottom:  "4px",
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={handleOrbClick}
                onKeyDown={(e) => e.key === "Enter" && handleOrbClick()}
                aria-label={
                  voice.isListening
                    ? "AI Orb — listening. Click to stop and send."
                    : voice.isTextFallback
                    ? `AI Orb — text-fallback (no mic). Current state: ${displayOrbState}. Click to cycle states.`
                    : `AI Orb — current state: ${displayOrbState}. Click to start voice.`
                }
                style={{ cursor: "pointer", outline: "none" }}
                title={
                  voice.isListening
                    ? "Click to stop & send"
                    : voice.isTextFallback
                    ? "Click to cycle states (mic unavailable)"
                    : "Click to talk"
                }
              >
                <AIOrb
                  state={displayOrbState}
                  size={130}
                  audioLevel={
                    displayAudioLevel ||
                    (displayOrbState === "LISTENING" || displayOrbState === "SPEAKING" ? 0.5 : 0)
                  }
                  themeContext={
                    displayOrbState === "IDLE"
                      ? (topTheme ?? conversation.state.themeGreeting)?.toUpperCase()
                      : undefined
                  }
                />
              </div>

              {/* Listening state: animated prominent CTA */}
              {voice.isListening ? (
                <motion.p
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  style={{
                    fontFamily:    "var(--font-hud)",
                    fontSize:      "11px",
                    fontWeight:    600,
                    color:         "rgba(0, 229, 255, 1)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    margin:        0,
                    textAlign:     "center",
                    textShadow:    "0 0 10px rgba(0,229,255,0.6)",
                  }}
                >
                  ● REC · TAP ORB AGAIN TO SUBMIT
                </motion.p>
              ) : (
                <p
                  style={{
                    fontFamily:    "var(--font-hud)",
                    fontSize:      "10px",
                    color:         voice.lastError
                      ? "rgba(255,80,80,0.9)"
                      : "var(--text-tertiary)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    margin:        0,
                    textAlign:     "center",
                  }}
                >
                  {voice.orbState === "THINKING"
                    ? "▣ processing…"
                    : voice.orbState === "SPEAKING"
                    ? "♪ smart sync speaking…"
                    : voiceSessionPaused && voiceWasActiveBeforePause
                    ? "⏸ voice session paused · click orb to resume"
                    : voice.isTextFallback
                    ? "text-fallback active · click orb to cycle demo states"
                    : voice.lastError
                    ? `⚠ ${voice.lastError.slice(0, 70)}`
                    : topTheme
                    ? `pulse theme: ${topTheme} · tap orb to talk`
                    : "tap orb to ask by voice · or type below"}
                </p>
              )}
            </div>

            {/* ── Chat history — fills all remaining height ── */}
            <ChatTerminal
              messages={messages}
              isTyping={isTyping}
              bulletsByMessageId={bulletMap}
              citationsByMessageId={citeMap}
              lastUpdatedByMessageId={lastUpdatedMap}
              fillHeight
            />
          </main>

          {/* ─────────────── RIGHT (25%) ─────────────── */}
          <aside
            style={{
              minHeight: 0,
              height:    "100%",
              display:   "flex",
              flexDirection: "column",
            }}
          >
            <NewsRail fillHeight />
          </aside>
        </div>

        {/* ── Sticky bottom input bar — full width ── */}
        <div
          style={{
            flexShrink:       0,
            background:       "rgba(6, 10, 20, 0.92)",
            backdropFilter:   "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderTop:        "1px solid rgba(0, 229, 255, 0.12)",
            padding:          "10px 24px 6px",
          }}
        >
          <div
            style={{
              maxWidth: "1600px",
              margin:   "0 auto",
            }}
          >
            <InputBar
              onSubmit={handleSubmit}
              onMicToggle={handleMicToggle}
              onBookingClick={async () => {
                /* Fresh booking session — clears hydrated shared state that may
                 * leave the agent stuck at greeting/intent_classification. */
                conversation.resetConversation();
                const intent = "I'd like to book an advisor appointment";
                const userMsg = createChatMessage("user", intent);
                addChatMessage(userMsg);
                setIsTyping(true);
                setOrbState("THINKING");
                try {
                  const turn = await conversation.send(intent);
                  if (turn?.assistantText) {
                    const agentMsg = createChatMessage("assistant", turn.assistantText);
                    addChatMessage(agentMsg);
                    setScanVisible(true);
                    /* Also speak the booking prompt so the user knows what to do next */
                    void voice.speak(turn.assistantText);
                  }
                } finally {
                  setIsTyping(false);
                  setOrbState("IDLE");
                }
              }}
              isMicActive={isMicActive || voice.isListening}
              disabled={isTyping}
              prefillValue={prefill}
            />
          </div>
        </div>
      </div>
    </>
  );
}
