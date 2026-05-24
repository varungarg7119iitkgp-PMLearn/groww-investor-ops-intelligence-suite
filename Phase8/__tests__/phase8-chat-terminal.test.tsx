/**
 * Phase 8 — ChatTerminal wiring tests
 *
 * Verifies that the new `lastUpdated` plumbing surfaces correctly in
 * `BulletResponse` (rendered inside `ChatTerminal`) and that the
 * Phase 8 "Last updated from sources" footer appears for messages
 * that carry a timestamp.
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BulletResponse } from "@/components/investor-terminal/BulletResponse";
import { ChatTerminal } from "@/components/investor-terminal/ChatTerminal";
import type { ChatMessage } from "@/types";

/* ── framer-motion mock (jsdom-friendly) ─────────────────────── */
vi.mock("framer-motion", () => {
  const passthrough = (Tag: keyof React.JSX.IntrinsicElements) => {
    const Component = React.forwardRef<HTMLElement, React.PropsWithChildren<Record<string, unknown>>>(
      ({ children, ...props }, ref) => {
        const clean = { ...props };
        for (const k of ["variants", "initial", "animate", "exit", "whileHover", "whileTap", "transition"]) {
          delete (clean as Record<string, unknown>)[k];
        }
        return React.createElement(Tag as string, { ref, ...(clean as object) }, children as React.ReactNode);
      },
    );
    Component.displayName = `Motion${Tag.toString()}`;
    return Component;
  };
  const motion = {
    div: passthrough("div"),
    span: passthrough("span"),
    p: passthrough("p"),
    button: passthrough("button"),
  };
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

/* ════════════════════════════════════════════════════════════════
   BulletResponse — lastUpdated rendering
   ════════════════════════════════════════════════════════════════ */

describe("BulletResponse — Phase 8 lastUpdated", () => {
  const sampleBullets = ["b1", "b2", "b3", "b4", "b5", "b6"];

  it("renders the lastUpdated footer when an ISO timestamp is provided", () => {
    const iso = "2026-05-24T16:33:00.000Z";
    render(<BulletResponse bullets={sampleBullets} lastUpdated={iso} animate={false} />);
    const footer = screen.getByTestId("last-updated");
    expect(footer).toBeTruthy();
    expect(footer.textContent).toMatch(/Last updated from sources:/i);
    /* HH:MM should be present (regardless of TZ offset) */
    expect(footer.textContent).toMatch(/\d{2}:\d{2}/);
  });

  it("does NOT render the footer when lastUpdated is absent", () => {
    render(<BulletResponse bullets={sampleBullets} animate={false} />);
    expect(screen.queryByTestId("last-updated")).toBeNull();
  });

  it("falls back to raw ISO if Date.parse fails", () => {
    render(<BulletResponse bullets={sampleBullets} lastUpdated="not-a-date" animate={false} />);
    expect(screen.getByTestId("last-updated").textContent).toContain("not-a-date");
  });
});

/* ════════════════════════════════════════════════════════════════
   ChatTerminal — lastUpdatedByMessageId prop
   ════════════════════════════════════════════════════════════════ */

describe("ChatTerminal — Phase 8 lastUpdatedByMessageId", () => {
  it("propagates lastUpdated to the right MessageRow only", () => {
    const messages: ChatMessage[] = [
      {
        id: "m1",
        role: "assistant",
        content: "First response",
        timestamp: "2026-05-24T10:00:00.000Z",
        citations: [],
      },
      {
        id: "m2",
        role: "assistant",
        content: "Second response",
        timestamp: "2026-05-24T11:00:00.000Z",
        citations: [],
      },
    ];
    const bulletsByMessageId = {
      m1: ["a1", "a2", "a3", "a4", "a5", "a6"],
      m2: ["b1", "b2", "b3", "b4", "b5", "b6"],
    };
    const lastUpdatedByMessageId = {
      m1: "2026-05-24T10:00:00.000Z",
      /* m2 deliberately omitted */
    };

    render(
      <ChatTerminal
        messages={messages}
        bulletsByMessageId={bulletsByMessageId}
        lastUpdatedByMessageId={lastUpdatedByMessageId}
      />,
    );

    /* Exactly one footer should render — for m1 */
    const footers = screen.queryAllByTestId("last-updated");
    expect(footers).toHaveLength(1);
  });

  it("accepts no lastUpdatedByMessageId prop (back-compat)", () => {
    const messages: ChatMessage[] = [
      {
        id: "m1",
        role: "assistant",
        content: "x",
        timestamp: "2026-05-24T10:00:00.000Z",
        citations: [],
      },
    ];
    expect(() =>
      render(
        <ChatTerminal
          messages={messages}
          bulletsByMessageId={{ m1: ["a", "b", "c", "d", "e", "f"] }}
        />,
      ),
    ).not.toThrow();
  });
});
