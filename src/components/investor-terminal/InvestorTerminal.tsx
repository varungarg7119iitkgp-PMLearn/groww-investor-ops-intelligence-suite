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

import { useCallback, useState } from "react";
import {
  MarqueeTicker,
  AIOrb,
  ChatTerminal,
  InputBar,
  KnowledgeHubHeader,
  NewsRail,
} from "@/components/investor-terminal";
import { ScanningLine, OpsAccessButton } from "@/components/shared";
import { createChatMessage } from "@/types";
import type { ChatMessage, AgentVisualState, Citation } from "@/types";
import { useVoiceInteraction } from "@/hooks/useVoiceInteraction";
import { useConversation } from "@/hooks/useConversation";

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
  const [messages,   setMessages]   = useState<ChatMessage[]>(INIT_MESSAGES);
  const [bulletMap,  setBulletMap]  = useState(INIT_BULLETS);
  const [citeMap,    setCiteMap]    = useState(INIT_CITES);
  const [lastUpdatedMap, setLastUpdatedMap] = useState<Record<string, string>>({});
  const [orbState,   setOrbState]   = useState<AgentVisualState>("IDLE");
  const [isTyping,   setIsTyping]   = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [scanVisible, setScanVisible] = useState(false);
  const [orbStateIdx, setOrbStateIdx] = useState(0);
  const [prefill,    setPrefill]    = useState("");

  const cycleOrb = () => {
    const next = (orbStateIdx + 1) % ORB_CYCLE.length;
    setOrbStateIdx(next);
    setOrbState(ORB_CYCLE[next]);
  };

  const handleTickerClick = useCallback((fundName: string) => {
    setPrefill(`Show key stats for ${fundName}`);
  }, []);

  const handleSubmit = useCallback(
    async (text: string) => {
      const userMsg = createChatMessage("user", text);
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      setOrbState("THINKING");

      try {
        const res = await fetch("/api/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ query: text }),
        });

        if (!res.ok) {
          /* Server-side error path — surface a deterministic 6-bullet
           * notice rather than a raw error string. */
          const errBody = await safeJson(res);
          const errMsg = errBody?.error ?? `HTTP ${res.status}`;
          const agentMsg = createChatMessage(
            "assistant",
            "Smart_Sync encountered an issue while processing your query.",
          );
          setMessages((prev) => [...prev, agentMsg]);
          setBulletMap((prev) => ({
            ...prev,
            [agentMsg.id]: [
              "The Smart-Sync orchestrator returned an error.",
              `Status: ${res.status}. Detail: ${String(errMsg).slice(0, 80)}.`,
              "This usually indicates a transient backend issue (Gemini or Supabase).",
              "No facts were generated — to avoid hallucination, no bullets are shown.",
              "Please retry the query in a few seconds.",
              "If the issue persists, contact the Director Ops team.",
            ],
          }));
          setCiteMap((prev) => ({ ...prev, [agentMsg.id]: [] }));
          return;
        }

        const data = (await res.json()) as ChatApiResponse;
        const agentMsg = createChatMessage("assistant", data.answer.summary);
        setMessages((prev) => [...prev, agentMsg]);
        setBulletMap((prev) => ({ ...prev, [agentMsg.id]: data.answer.bullets }));
        setCiteMap((prev) => ({ ...prev, [agentMsg.id]: data.answer.citations }));
        setLastUpdatedMap((prev) => ({ ...prev, [agentMsg.id]: data.meta.lastUpdated }));
      } catch (err) {
        /* Network or JSON-parse failure */
        const agentMsg = createChatMessage(
          "assistant",
          "Smart_Sync could not reach the Knowledge Base.",
        );
        const detail = err instanceof Error ? err.message : String(err);
        setMessages((prev) => [...prev, agentMsg]);
        setBulletMap((prev) => ({
          ...prev,
          [agentMsg.id]: [
            "Network request to /api/chat failed.",
            `Detail: ${detail.slice(0, 80)}.`,
            "Smart_Sync is grounded — no fallback content is generated to prevent hallucination.",
            "Please check your network connection and retry.",
            "If you are running locally, verify `npm run dev` is active.",
            "Smart_Sync will resume normal operation when the API is reachable.",
          ],
        }));
        setCiteMap((prev) => ({ ...prev, [agentMsg.id]: [] }));
      } finally {
        setIsTyping(false);
        setOrbState("IDLE");
        setScanVisible(true);
        setPrefill("");
      }
    },
    [],
  );

  /* ─── PHASE 11: Voice loop integration ─────────────────────── */
  const conversation = useConversation();

  const voice = useVoiceInteraction({
    onTranscript: async (transcript) => {
      /* Push the user transcript into the chat ribbon */
      const userMsg = createChatMessage("user", transcript);
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      /* Call /api/voice/converse via the conversation hook */
      const turn = await conversation.send(transcript);
      setIsTyping(false);

      if (!turn) {
        setMessages((prev) => [
          ...prev,
          createChatMessage(
            "assistant",
            "Sorry — voice service hiccup. Please try again or use text.",
          ),
        ]);
        return;
      }

      /* Push assistant response */
      const agentMsg = createChatMessage("assistant", turn.assistantText);
      setMessages((prev) => [...prev, agentMsg]);
      setScanVisible(true);

      /* Return text so the hook can run TTS */
      return { assistantText: turn.assistantText };
    },
  });

  /* Mic toggle now routes to voice loop. If mic is active, stop
   * recording (triggers STT→converse→TTS). Otherwise start. */
  const handleMicToggle = useCallback(
    async (active: boolean) => {
      setIsMicActive(active);
      if (active) {
        await voice.startListening();
      } else {
        await voice.stopListening();
      }
    },
    [voice],
  );

  /* Derive orb state from voice hook when voice mode is in use,
   * otherwise fall through to the local text-mode state. */
  const displayOrbState =
    voice.isListening || voice.orbState !== "IDLE" ? voice.orbState : orbState;
  const displayAudioLevel =
    voice.isListening || voice.orbState === "SPEAKING" ? voice.audioLevel : 0;

  return (
    <>
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
          overflowY:      "auto",
        }}
      >
        {/* ── Ticker bar — pinned at top ── */}
        <MarqueeTicker onItemClick={handleTickerClick} />

        {/* ── Floating right-edge Director Ops CTA (calls store.setActiveMode) ── */}
        <OpsAccessButton />

        {/* ── Branded Knowledge Hub header ── */}
        <KnowledgeHubHeader investorName="Investor" fundCount={20} />

        {/* ── Main 75:25 split — Chat column (with centered orb) | News rail ── */}
        <div
          style={{
            flex:           1,
            display:        "grid",
            gridTemplateColumns: "minmax(0, 3fr) minmax(0, 1fr)",
            gap:            "24px",
            padding:        "8px 24px 24px",
            maxWidth:       "1600px",
            width:          "100%",
            margin:         "0 auto",
            alignItems:     "flex-start",
          }}
        >
          {/* ─────────────── LEFT (75%) ─────────────── */}
          <main
            style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "stretch",
              gap:            "20px",
              width:          "100%",
              maxWidth:       "100%",
              margin:         "0 auto",
            }}
            aria-label="Investor Knowledge Hub — main conversation"
          >
            {/* ── Centered orb cluster ── */}
            <div
              style={{
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                gap:            "8px",
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={cycleOrb}
                onKeyDown={(e) => e.key === "Enter" && cycleOrb()}
                aria-label={`AI Orb — current state: ${orbState}. Click to cycle states.`}
                style={{
                  cursor:       "pointer",
                  outline:      "none",
                  marginBottom: "-8px",
                }}
                title="Click to cycle orb states (demo)"
              >
                <AIOrb
                  state={displayOrbState}
                  audioLevel={
                    displayAudioLevel ||
                    (displayOrbState === "LISTENING" || displayOrbState === "SPEAKING" ? 0.5 : 0)
                  }
                  themeContext={
                    displayOrbState === "IDLE"
                      ? conversation.state.themeGreeting?.toUpperCase()
                      : "KYC UPDATES"
                  }
                />
              </div>

              <p
                style={{
                  fontFamily:    "var(--font-hud)",
                  fontSize:      "10px",
                  color:         "var(--text-tertiary)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginTop:     "-4px",
                }}
              >
                ← click orb to cycle states (demo): {displayOrbState}
                {voice.isTextFallback && " · text-fallback active"}
                {voice.lastError && ` · ${voice.lastError.slice(0, 60)}`}
              </p>
            </div>

            <div style={{ alignSelf: "stretch", width: "100%" }}>
              <ChatTerminal
                messages={messages}
                isTyping={isTyping}
                bulletsByMessageId={bulletMap}
                citationsByMessageId={citeMap}
                lastUpdatedByMessageId={lastUpdatedMap}
              />
            </div>

            <div style={{ alignSelf: "stretch", width: "100%" }}>
              <InputBar
                onSubmit={handleSubmit}
                onMicToggle={handleMicToggle}
                isMicActive={isMicActive}
                disabled={isTyping}
                prefillValue={prefill}
              />
            </div>

            {/* Book-Appointment teaser */}
            <div
              data-testid="booking-coming-soon"
              style={{
                alignSelf:      "center",
                display:        "inline-flex",
                alignItems:     "center",
                gap:            "8px",
                padding:        "6px 14px",
                borderRadius:   "999px",
                background:     "rgba(0, 229, 255, 0.04)",
                border:         "1px dashed rgba(0, 229, 255, 0.3)",
                fontFamily:     "var(--font-hud)",
                fontSize:       "10px",
                letterSpacing:  "0.18em",
                color:          "var(--color-investor)",
                opacity:        0.85,
              }}
            >
              <span aria-hidden style={{ fontSize: "12px" }}>📅</span>
              BOOK ADVISOR APPOINTMENT
              <span
                style={{
                  fontFamily:    "var(--font-hud)",
                  fontSize:      "9px",
                  color:         "var(--color-ops)",
                  background:    "rgba(255, 171, 0, 0.12)",
                  border:        "1px solid rgba(255, 171, 0, 0.4)",
                  padding:       "1px 6px",
                  borderRadius:  "4px",
                  letterSpacing: "0.1em",
                }}
              >
                PHASE 10–12
              </span>
            </div>

            {/* ── Phase status footer ── */}
            <div
              style={{
                alignSelf:     "center",
                fontFamily:    "var(--font-hud)",
                fontSize:      "10px",
                color:         "var(--text-tertiary)",
                letterSpacing: "0.08em",
                textAlign:     "center",
                paddingBottom: "16px",
                opacity:       0.6,
              }}
            >
              PHASE 8 · LIVE SMART-SYNC RAG · GEMINI + SUPABASE WIRED
            </div>
          </main>

          {/* ─────────────── RIGHT (25%) ─────────────── */}
          <aside style={{ position: "sticky", top: "72px", alignSelf: "flex-start" }}>
            <NewsRail />
          </aside>
        </div>
      </div>
    </>
  );
}
