/**
 * ChatTerminal — Phase 4: Investor Terminal UI Shell
 *
 * Glass Panel chat container with typewriter-animated message list.
 * Spec: UI/UX §5.4, Architecture Phase 4 Task 3.
 *
 * - Max width: 768px (max-w-3xl), centered
 * - Glass Panel background, max height 60vh, overflow-y scroll
 * - Auto-scroll to bottom on new messages
 * - Agent messages: left cyan border (3px), typewriter fade-in (15ms/char)
 * - User messages: right-aligned, white text, no border, instant render
 * - System messages: centered, italic, 12px, --text-disabled
 * - Timestamps: Mono, 11px, --text-muted, right-aligned
 * - BulletResponse box for structured 6-bullet agent responses
 */

"use client";

import { useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { panelVariant, sentenceVariant, letterVariant } from "@/lib/animations";
import { BulletResponse } from "./BulletResponse";
import type { ChatMessage, Citation } from "@/types";

/* ── Typewriter text — agent message body ───────────────────── */
interface TypewriterTextProps {
  text: string;
  isStreaming?: boolean;
}

const TypewriterText = memo(function TypewriterText({ text, isStreaming }: TypewriterTextProps) {
  return (
    <motion.span
      variants={sentenceVariant}
      initial="hidden"
      animate="visible"
      className={isStreaming ? "typewriter-cursor" : ""}
      style={{
        fontFamily: "var(--font-body)",
        fontSize:   "15px",
        lineHeight: "1.65",
        color:      "var(--text-secondary)",
        display:    "inline",
      }}
    >
      {text.split("").map((char, i) => (
        <motion.span key={i} variants={letterVariant}>
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
});

/* ── Timestamp ──────────────────────────────────────────────── */
/**
 * Deterministic time formatter — produces identical output on Node
 * (server-render) and browser (hydration). `toLocaleTimeString` was
 * producing `04:33 pm` on the server and `04:33 PM` on the client,
 * triggering a React hydration mismatch.
 */
function formatHudTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--:--";
  const rawH = d.getHours();
  const m    = d.getMinutes().toString().padStart(2, "0");
  const ampm = rawH >= 12 ? "PM" : "AM";
  const h12  = (rawH % 12) || 12;
  return `${h12.toString().padStart(2, "0")}:${m} ${ampm}`;
}

function Timestamp({ iso }: { iso: string }) {
  const label = formatHudTime(iso);
  return (
    <span
      style={{
        fontFamily: "var(--font-hud)",
        fontSize:   "11px",
        color:      "var(--text-muted)",
        opacity:    0.6,
        marginTop:  "4px",
        display:    "block",
      }}
    >
      {label}
    </span>
  );
}

/* ── Single message row ─────────────────────────────────────── */
interface MessageRowProps {
  message: ChatMessage;
  /** bullets extracted from content for structured response */
  bullets?: string[];
  citations?: Citation[];
}

const MessageRow = memo(function MessageRow({
  message,
  bullets,
  citations = [],
}: MessageRowProps) {
  const isAgent  = message.role === "assistant";
  const isUser   = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center my-2"
      >
        <span
          style={{
            fontFamily:  "var(--font-body)",
            fontStyle:   "italic",
            fontSize:    "12px",
            color:       "var(--text-disabled)",
          }}
        >
          {message.content}
        </span>
      </motion.div>
    );
  }

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-end mb-4"
      >
        <div style={{ maxWidth: "72%", textAlign: "right" }}>
          <span
            style={{
              fontFamily:   "var(--font-body)",
              fontSize:     "15px",
              lineHeight:   "1.6",
              color:        "var(--text-primary)",
              display:      "inline-block",
              padding:      "10px 16px",
              background:   "rgba(0, 229, 255, 0.08)",
              border:       "1px solid rgba(0, 229, 255, 0.15)",
              borderRadius: "16px 16px 4px 16px",
            }}
          >
            {message.content}
          </span>
          <Timestamp iso={message.timestamp} />
        </div>
      </motion.div>
    );
  }

  /* Agent message */
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex gap-3 mb-5"
    >
      {/* Agent avatar dot */}
      <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
        <div
          style={{
            width:        "8px",
            height:       "8px",
            borderRadius: "50%",
            background:   "var(--investor)",
            boxShadow:    "0 0 8px var(--investor)",
            marginTop:    "4px",
          }}
        />
        <div
          style={{
            width:      "1px",
            flex:       1,
            background: "rgba(0,229,255,0.12)",
            minHeight:  "12px",
          }}
        />
      </div>

      {/* Message body */}
      <div
        style={{
          flex:        1,
          borderLeft:  "3px solid var(--investor)",
          paddingLeft: "14px",
        }}
      >
        {/* Plain text (typewriter for new messages) */}
        {!bullets && (
          <TypewriterText
            text={message.content}
            isStreaming={message.isStreaming}
          />
        )}

        {/* Structured 6-bullet response */}
        {bullets && bullets.length > 0 && (
          <>
            {message.content && (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize:   "15px",
                  lineHeight: "1.6",
                  color:      "var(--text-secondary)",
                  marginBottom: "6px",
                }}
              >
                {message.content}
              </p>
            )}
            <BulletResponse
              bullets={bullets}
              citations={citations.length > 0 ? citations : (message.citations ?? [])}
            />
          </>
        )}

        {/* Inline citations (non-bullet) */}
        {!bullets && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.citations.map((c, i) => (
              <button
                key={i}
                onClick={() => c.source && window.open(c.source, "_blank", "noopener,noreferrer")}
                style={{
                  display:       "inline-flex",
                  alignItems:    "center",
                  gap:           "4px",
                  padding:       "2px 10px",
                  borderRadius:  "999px",
                  background:    "rgba(0, 229, 255, 0.1)",
                  border:        "1px solid rgba(0, 229, 255, 0.3)",
                  fontFamily:    "var(--font-hud)",
                  fontSize:      "10px",
                  fontWeight:    500,
                  letterSpacing: "0.06em",
                  color:         "var(--investor)",
                  cursor:        c.source ? "pointer" : "default",
                  textTransform: "uppercase",
                  outline:       "none",
                }}
              >
                ⬡ {c.fundName}
                {c.source && <span style={{ opacity: 0.6, fontSize: "8px" }}>↗</span>}
              </button>
            ))}
          </div>
        )}

        <Timestamp iso={message.timestamp} />
      </div>
    </motion.div>
  );
});

/* ── Typing indicator ───────────────────────────────────────── */
function TypingIndicator() {
  return (
    <motion.div
      key="typing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex gap-3 mb-4"
    >
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div
          style={{
            width:        "8px",
            height:       "8px",
            borderRadius: "50%",
            background:   "var(--investor)",
            opacity:      0.5,
          }}
        />
      </div>
      <div style={{ borderLeft: "3px solid rgba(0,229,255,0.3)", paddingLeft: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
        {[0, 0.15, 0.3].map((delay, i) => (
          <motion.span
            key={i}
            style={{
              display:      "inline-block",
              width:        "5px",
              height:       "5px",
              borderRadius: "50%",
              background:   "var(--investor)",
            }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ── ChatTerminal Props ──────────────────────────────────────── */
interface ChatTerminalProps {
  messages: ChatMessage[];
  isTyping?: boolean;
  /** Structured bullets keyed by message ID */
  bulletsByMessageId?: Record<string, string[]>;
  /** Citations keyed by message ID */
  citationsByMessageId?: Record<string, Citation[]>;
}

/* ── Main ChatTerminal component ────────────────────────────── */
export function ChatTerminal({
  messages,
  isTyping            = false,
  bulletsByMessageId  = {},
  citationsByMessageId = {},
}: ChatTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll to bottom when messages change */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof el.scrollTo !== "function") return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <motion.div
      variants={panelVariant}
      initial="hidden"
      animate="visible"
      style={{
        width:    "100%",
        maxWidth: "100%",
        position: "relative",
      }}
    >
      {/* Glass Panel container */}
      <div
        className="glass-panel"
        style={{
          padding:   "0",
          overflow:  "hidden",
        }}
      >
        {/* Terminal header bar */}
        <div
          style={{
            display:       "flex",
            alignItems:    "center",
            gap:           "8px",
            padding:       "10px 16px",
            borderBottom:  "1px solid rgba(0,229,255,0.1)",
            background:    "rgba(0, 229, 255, 0.03)",
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--investor)", boxShadow: "0 0 6px var(--investor)" }}
          />
          <span
            style={{
              fontFamily:    "var(--font-hud)",
              fontSize:      "11px",
              color:         "var(--investor)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity:       0.85,
            }}
          >
            Smart_Sync Terminal  //  Investor Mode
          </span>
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontFamily: "var(--font-hud)",
              fontSize:   "10px",
              color:      "var(--text-tertiary)",
            }}
          >
            {messages.length} MSG
          </span>
        </div>

        {/* Message list */}
        <div
          ref={scrollRef}
          style={{
            maxHeight:   "60vh",
            overflowY:   "auto",
            padding:     "20px 20px 8px 20px",
            display:     "flex",
            flexDirection: "column",
          }}
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {messages.length === 0 ? (
            <div
              style={{
                textAlign:  "center",
                padding:    "40px 20px",
                fontFamily: "var(--font-hud)",
                fontSize:   "13px",
                color:      "var(--text-disabled)",
                letterSpacing: "0.1em",
              }}
            >
              ASK ABOUT ANY OF THE 20 INDEXED MUTUAL FUNDS
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageRow
                  key={msg.id}
                  message={msg}
                  bullets={bulletsByMessageId[msg.id]}
                  citations={citationsByMessageId[msg.id]}
                />
              ))}
              {isTyping && <TypingIndicator key="typing-indicator" />}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
