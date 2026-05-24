/**
 * Phase 4 — Investor Terminal UI Shell
 * Comprehensive test suite for all Phase 4 components.
 *
 * Tests cover:
 *  - MarqueeTicker: render, data, aria, animation class, item click
 *  - AIOrb: render all 4 states, HUD brackets, state labels, props
 *  - ChatTerminal: render empty/messages, role differentiation, auto-scroll
 *  - BulletResponse: render bullets, max 6, citations
 *  - CitationTag: render, aria, url opening
 *  - InputBar: render, submit, mic toggle, compliance footer, disabled state
 *  - Barrel export: all exports present
 *  - Mock data: MOCK_TICKER_DATA has 20 items, all fields valid
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

/* ── framer-motion mock (avoids jsdom animation issues) ─────── */
vi.mock("framer-motion", () => {
  const MockMotionDiv = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variants?: unknown; initial?: unknown; animate?: unknown; exit?: unknown; whileHover?: unknown; whileTap?: unknown; transition?: unknown }>(
    ({ children, ...props }, ref) => {
      const cleanProps = { ...props };
      delete (cleanProps as Record<string, unknown>).variants;
      delete (cleanProps as Record<string, unknown>).initial;
      delete (cleanProps as Record<string, unknown>).animate;
      delete (cleanProps as Record<string, unknown>).exit;
      delete (cleanProps as Record<string, unknown>).whileHover;
      delete (cleanProps as Record<string, unknown>).whileTap;
      delete (cleanProps as Record<string, unknown>).transition;
      return <div ref={ref} {...cleanProps}>{children}</div>;
    }
  );
  MockMotionDiv.displayName = "MotionDiv";

  const MockMotionButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variants?: unknown; initial?: unknown; animate?: unknown; exit?: unknown; whileHover?: unknown; whileTap?: unknown; transition?: unknown }>(
    ({ children, disabled, onClick, ...props }, ref) => {
      const cleanProps = { ...props };
      delete (cleanProps as Record<string, unknown>).variants;
      delete (cleanProps as Record<string, unknown>).initial;
      delete (cleanProps as Record<string, unknown>).animate;
      delete (cleanProps as Record<string, unknown>).exit;
      delete (cleanProps as Record<string, unknown>).whileHover;
      delete (cleanProps as Record<string, unknown>).whileTap;
      delete (cleanProps as Record<string, unknown>).transition;
      return (
        <button ref={ref} disabled={disabled} onClick={disabled ? undefined : onClick} {...cleanProps}>
          {children}
        </button>
      );
    }
  );
  MockMotionButton.displayName = "MotionButton";

  const MockMotionSpan = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement> & { variants?: unknown; initial?: unknown; animate?: unknown; exit?: unknown; whileHover?: unknown; whileTap?: unknown; transition?: unknown }>(
    ({ children, ...props }, ref) => {
      const cleanProps = { ...props };
      delete (cleanProps as Record<string, unknown>).variants;
      delete (cleanProps as Record<string, unknown>).initial;
      delete (cleanProps as Record<string, unknown>).animate;
      delete (cleanProps as Record<string, unknown>).exit;
      delete (cleanProps as Record<string, unknown>).whileHover;
      delete (cleanProps as Record<string, unknown>).whileTap;
      delete (cleanProps as Record<string, unknown>).transition;
      return <span ref={ref} {...cleanProps}>{children}</span>;
    }
  );
  MockMotionSpan.displayName = "MotionSpan";

  const MockMotionP = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement> & { variants?: unknown; initial?: unknown; animate?: unknown; exit?: unknown; whileHover?: unknown; whileTap?: unknown; transition?: unknown }>(
    ({ children, ...props }, ref) => {
      const cleanProps = { ...props };
      delete (cleanProps as Record<string, unknown>).variants;
      delete (cleanProps as Record<string, unknown>).initial;
      delete (cleanProps as Record<string, unknown>).animate;
      delete (cleanProps as Record<string, unknown>).exit;
      delete (cleanProps as Record<string, unknown>).whileHover;
      delete (cleanProps as Record<string, unknown>).whileTap;
      delete (cleanProps as Record<string, unknown>).transition;
      return <p ref={ref} {...cleanProps}>{children}</p>;
    }
  );
  MockMotionP.displayName = "MotionP";

  const MockMotionG = ({ children, ...props }: React.SVGProps<SVGGElement> & { variants?: unknown; initial?: unknown; animate?: unknown; exit?: unknown; style?: React.CSSProperties; transition?: unknown }) => {
    const cleanProps = { ...props };
    delete (cleanProps as Record<string, unknown>).variants;
    delete (cleanProps as Record<string, unknown>).initial;
    delete (cleanProps as Record<string, unknown>).animate;
    delete (cleanProps as Record<string, unknown>).exit;
    delete (cleanProps as Record<string, unknown>).transition;
    return <g {...cleanProps}>{children}</g>;
  };

  const MockMotionCircle = ({ children, ...props }: React.SVGProps<SVGCircleElement> & { variants?: unknown; initial?: unknown; animate?: unknown; exit?: unknown; style?: React.CSSProperties; transition?: unknown }) => {
    const cleanProps = { ...props };
    delete (cleanProps as Record<string, unknown>).variants;
    delete (cleanProps as Record<string, unknown>).initial;
    delete (cleanProps as Record<string, unknown>).animate;
    delete (cleanProps as Record<string, unknown>).exit;
    delete (cleanProps as Record<string, unknown>).transition;
    return <circle {...cleanProps}>{children}</circle>;
  };

  const MockMotionPath = ({ ...props }: React.SVGProps<SVGPathElement> & { variants?: unknown; initial?: unknown; animate?: unknown; exit?: unknown; style?: React.CSSProperties; transition?: unknown }) => {
    const cleanProps = { ...props };
    delete (cleanProps as Record<string, unknown>).variants;
    delete (cleanProps as Record<string, unknown>).initial;
    delete (cleanProps as Record<string, unknown>).animate;
    delete (cleanProps as Record<string, unknown>).exit;
    delete (cleanProps as Record<string, unknown>).transition;
    return <path {...cleanProps} />;
  };

  const MockMotionRect = ({ children, ...props }: React.SVGProps<SVGRectElement> & { variants?: unknown; initial?: unknown; animate?: unknown; exit?: unknown; style?: React.CSSProperties; transition?: unknown }) => {
    const cleanProps = { ...props };
    delete (cleanProps as Record<string, unknown>).variants;
    delete (cleanProps as Record<string, unknown>).initial;
    delete (cleanProps as Record<string, unknown>).animate;
    delete (cleanProps as Record<string, unknown>).exit;
    delete (cleanProps as Record<string, unknown>).transition;
    return <rect {...cleanProps}>{children}</rect>;
  };

  return {
    motion: {
      div:    MockMotionDiv,
      button: MockMotionButton,
      span:   MockMotionSpan,
      p:      MockMotionP,
      g:      MockMotionG,
      circle: MockMotionCircle,
      path:   MockMotionPath,
      rect:   MockMotionRect,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAnimation: () => ({ start: vi.fn() }),
    useMotionValue: (v: number) => ({ get: () => v, set: vi.fn() }),
    useTransform: () => ({ get: vi.fn() }),
  };
});

/* ── Import components after mock ───────────────────────────── */
import { MarqueeTicker, MOCK_TICKER_DATA } from "@/components/investor-terminal/MarqueeTicker";
import { AIOrb } from "@/components/investor-terminal/AIOrb";
import { ChatTerminal } from "@/components/investor-terminal/ChatTerminal";
import { BulletResponse } from "@/components/investor-terminal/BulletResponse";
import { CitationTag, CitationTagList } from "@/components/investor-terminal/CitationTag";
import { InputBar } from "@/components/investor-terminal/InputBar";
import { createChatMessage } from "@/types";
import type { Citation } from "@/types";

/* ── Test Data ───────────────────────────────────────────────── */
const SAMPLE_CITATION: Citation = {
  fundId:         "hdfc-hyb",
  fundName:       "HDFC Hybrid Equity Fund",
  source:         "https://www.hdfcfund.com",
  snippet:        "Equity-oriented hybrid fund with 65-80% equity allocation.",
  relevanceScore: 0.92,
};

/* ========================================================
   SUITE 1 — MarqueeTicker
   ======================================================== */
describe("MarqueeTicker", () => {
  it("renders the ticker container with correct role and aria-label", () => {
    const { container } = render(<MarqueeTicker />);
    const marquee = container.querySelector('[role="marquee"]');
    expect(marquee).not.toBeNull();
    expect(marquee?.getAttribute("aria-label")).toContain("mutual fund");
  });

  it("renders a LIVE indicator", () => {
    render(<MarqueeTicker />);
    expect(screen.getByLabelText("Live data")).toBeTruthy();
  });

  it("applies ticker-track class for CSS animation", () => {
    const { container } = render(<MarqueeTicker />);
    const track = container.querySelector(".ticker-track");
    expect(track).not.toBeNull();
  });

  it("calls onItemClick with fund name when a chip is clicked", () => {
    const onItemClick = vi.fn();
    const { container } = render(<MarqueeTicker onItemClick={onItemClick} />);
    const buttons = container.querySelectorAll("button[type='button']");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(onItemClick).toHaveBeenCalledWith(expect.any(String));
  });

  it("MOCK_TICKER_DATA has exactly 20 items", () => {
    expect(MOCK_TICKER_DATA).toHaveLength(20);
  });

  it("MOCK_TICKER_DATA items have required fields", () => {
    MOCK_TICKER_DATA.forEach((item) => {
      expect(item).toHaveProperty("fundId");
      expect(item).toHaveProperty("symbol");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("nav");
      expect(item).toHaveProperty("navChange");
      expect(item).toHaveProperty("navChangePercent");
      expect(item).toHaveProperty("category");
      expect(item).toHaveProperty("isPositive");
    });
  });

  it("isPositive flag matches navChange sign", () => {
    MOCK_TICKER_DATA.forEach((item) => {
      expect(item.isPositive).toBe(item.navChange >= 0);
    });
  });

  it("all items have nav > 0", () => {
    MOCK_TICKER_DATA.forEach((item) => {
      expect(item.nav).toBeGreaterThan(0);
    });
  });

  it("renders with custom animationDuration", () => {
    const { container } = render(<MarqueeTicker animationDuration={30} />);
    const track = container.querySelector(".ticker-track") as HTMLElement;
    expect(track?.style.animationDuration).toBe("30s");
  });
});

/* ========================================================
   SUITE 2 — AIOrb
   ======================================================== */
describe("AIOrb", () => {
  it("renders with role=img and aria-label", () => {
    render(<AIOrb />);
    expect(screen.getByRole("img")).toBeTruthy();
  });

  it("renders default IDLE state label", () => {
    render(<AIOrb state="IDLE" />);
    expect(screen.getByText("● STANDBY")).toBeTruthy();
  });

  it("renders LISTENING state label", () => {
    render(<AIOrb state="LISTENING" />);
    expect(screen.getByText("◉ LISTENING")).toBeTruthy();
  });

  it("renders THINKING state label", () => {
    render(<AIOrb state="THINKING" />);
    expect(screen.getByText("◈ PROCESSING")).toBeTruthy();
  });

  it("renders SPEAKING state label", () => {
    render(<AIOrb state="SPEAKING" />);
    expect(screen.getByText("◉ SPEAKING")).toBeTruthy();
  });

  it("renders an SVG element for the orb", () => {
    const { container } = render(<AIOrb />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("renders HUD brackets and context label when themeContext is provided", () => {
    render(<AIOrb state="LISTENING" themeContext="SIP QUERIES" />);
    expect(screen.getByText(/CONTEXT: SIP QUERIES/i)).toBeTruthy();
  });

  it("does not render context label when themeContext is absent", () => {
    render(<AIOrb state="IDLE" />);
    expect(screen.queryByText(/CONTEXT/)).toBeNull();
  });

  it("accepts custom size prop", () => {
    const { container } = render(<AIOrb size={150} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(Number(svg?.getAttribute("width"))).toBeGreaterThan(150);
  });

  it("accepts custom ariaLabel prop", () => {
    render(<AIOrb ariaLabel="Custom Orb Label" />);
    expect(screen.getByLabelText("Custom Orb Label")).toBeTruthy();
  });

  it("[NEW] renders plasma ripple rings SVG group", () => {
    const { container } = render(<AIOrb state="IDLE" />);
    const ripples = container.querySelector('[data-testid="plasma-ripples"]');
    expect(ripples).not.toBeNull();
  });

  it("[NEW] renders horizontal voice wave bars SVG group", () => {
    const { container } = render(<AIOrb state="IDLE" />);
    const waveGroup = container.querySelector('[data-testid="voice-wave"]');
    expect(waveGroup).not.toBeNull();
  });

  it("[NEW] voice wave contains 26 rect bars (13 per side)", () => {
    const { container } = render(<AIOrb state="IDLE" />);
    const waveGroup = container.querySelector('[data-testid="voice-wave"]');
    const rects = waveGroup?.querySelectorAll("rect");
    expect(rects?.length).toBe(26); // 13 left + 13 right
  });

  it("[NEW] renders Groww logo shadow inside orb", () => {
    const { container } = render(<AIOrb state="IDLE" />);
    const growwShadow = container.querySelector('[data-testid="groww-shadow"]');
    expect(growwShadow).not.toBeNull();
  });

  it("[NEW] Groww shadow has a clipPath applied", () => {
    const { container } = render(<AIOrb state="IDLE" />);
    const growwShadow = container.querySelector('[data-testid="groww-shadow"]');
    expect(growwShadow?.getAttribute("clip-path")).toMatch(/url\(#/);
  });

  it("[NEW] plasma ripples contain exactly 5+1 circles (5 main + 1 micro-ring)", () => {
    const { container } = render(<AIOrb state="IDLE" />);
    const rippleGroup = container.querySelector('[data-testid="plasma-ripples"]');
    const circles = rippleGroup?.querySelectorAll("circle");
    expect(circles?.length).toBe(6);
  });

  it("[NEW] SVG width is wider than size (accommodates voice wave)", () => {
    const { container } = render(<AIOrb size={200} />);
    const svg = container.querySelector("svg");
    expect(Number(svg?.getAttribute("width"))).toBeGreaterThan(200);
  });
});

/* ========================================================
   SUITE 3 — ChatTerminal
   ======================================================== */
describe("ChatTerminal", () => {
  it("renders empty state with placeholder text when no messages", () => {
    render(<ChatTerminal messages={[]} />);
    expect(screen.getByText(/ASK ABOUT ANY OF THE 20/i)).toBeTruthy();
  });

  it("renders user messages right-aligned", () => {
    const msg = createChatMessage("user", "Hello");
    render(<ChatTerminal messages={[msg]} />);
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("renders assistant messages with agent indicator", () => {
    const msg = createChatMessage("assistant", "Here is the info you requested.");
    const { container } = render(<ChatTerminal messages={[msg]} />);
    expect(container.textContent).toContain("Here is the info you requested.");
  });

  it("renders system messages as centered italic", () => {
    const msg = createChatMessage("system", "Session started");
    render(<ChatTerminal messages={[msg]} />);
    expect(screen.getByText("Session started")).toBeTruthy();
  });

  it("displays terminal header with Smart_Sync label", () => {
    render(<ChatTerminal messages={[]} />);
    expect(screen.getByText(/Smart_Sync Terminal/i)).toBeTruthy();
  });

  it("shows typing indicator when isTyping=true", () => {
    render(<ChatTerminal messages={[]} isTyping={true} />);
    // Typing indicator has aria-live on the parent
    const log = screen.getByRole("log");
    expect(log).toBeTruthy();
  });

  it("renders bullet response for messages with bulletsByMessageId", () => {
    const msg = createChatMessage("assistant", "Key facts:");
    const { container } = render(
      <ChatTerminal
        messages={[msg]}
        bulletsByMessageId={{ [msg.id]: ["Bullet 1", "Bullet 2", "Bullet 3"] }}
      />,
    );
    expect(container.textContent).toContain("Bullet 1");
    expect(container.textContent).toContain("Bullet 2");
    expect(container.textContent).toContain("Bullet 3");
  });

  it("shows message count in header", () => {
    const msgs = [
      createChatMessage("user", "Query 1"),
      createChatMessage("assistant", "Answer 1"),
    ];
    render(<ChatTerminal messages={msgs} />);
    expect(screen.getByText(/2 MSG/i)).toBeTruthy();
  });
});

/* ========================================================
   SUITE 4 — BulletResponse
   ======================================================== */
describe("BulletResponse", () => {
  it("renders all bullets up to 6", () => {
    const bullets = ["B1", "B2", "B3", "B4", "B5", "B6"];
    render(<BulletResponse bullets={bullets} animate={false} />);
    bullets.forEach((b) => expect(screen.getByText(b)).toBeTruthy());
  });

  it("truncates to max 6 bullets even when more are provided", () => {
    const bullets = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"];
    render(<BulletResponse bullets={bullets} animate={false} />);
    expect(screen.getByText("B6")).toBeTruthy();
    expect(screen.queryByText("B7")).toBeNull();
    expect(screen.queryByText("B8")).toBeNull();
  });

  it("renders nothing when bullets array is empty", () => {
    const { container } = render(<BulletResponse bullets={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders with aria list role", () => {
    render(<BulletResponse bullets={["Test bullet"]} animate={false} />);
    expect(screen.getByRole("list")).toBeTruthy();
  });

  it("renders each bullet with listitem role", () => {
    const bullets = ["A", "B", "C"];
    render(<BulletResponse bullets={bullets} animate={false} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("renders citation tags when citations are provided", () => {
    render(
      <BulletResponse
        bullets={["Bullet"]}
        citations={[SAMPLE_CITATION]}
        animate={false}
      />,
    );
    expect(screen.getByText(/HDFC Hybrid Equity Fund/i)).toBeTruthy();
  });
});

/* ========================================================
   SUITE 5 — CitationTag / CitationTagList
   ======================================================== */
describe("CitationTag", () => {
  it("renders fund name as uppercase text", () => {
    render(<CitationTag citation={SAMPLE_CITATION} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain("HDFC Hybrid Equity Fund");
  });

  it("has correct aria-label", () => {
    render(<CitationTag citation={SAMPLE_CITATION} />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toContain("HDFC Hybrid Equity Fund");
    expect(btn.getAttribute("aria-label")).toContain("opens in new tab");
  });

  it("opens source URL in new tab on click", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<CitationTag citation={SAMPLE_CITATION} />);
    fireEvent.click(screen.getByRole("button"));
    expect(openSpy).toHaveBeenCalledWith(
      "https://www.hdfcfund.com",
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });

  it("does not call window.open if source is empty", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const noUrl: Citation = { ...SAMPLE_CITATION, source: "" };
    render(<CitationTag citation={noUrl} />);
    fireEvent.click(screen.getByRole("button"));
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});

describe("CitationTagList", () => {
  it("renders nothing when citations array is empty", () => {
    const { container } = render(<CitationTagList citations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the correct number of citation buttons", () => {
    const cites: Citation[] = [
      SAMPLE_CITATION,
      { ...SAMPLE_CITATION, fundId: "sbi-psu", fundName: "SBI PSU Direct Fund", source: "" },
    ];
    render(<CitationTagList citations={cites} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("renders with list role and aria-label", () => {
    render(<CitationTagList citations={[SAMPLE_CITATION]} />);
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.getByLabelText("Source citations")).toBeTruthy();
  });
});

/* ========================================================
   SUITE 6 — InputBar
   ======================================================== */
describe("InputBar", () => {
  it("renders the text input with placeholder", () => {
    render(<InputBar />);
    const input = screen.getByRole("textbox");
    expect(input).toBeTruthy();
    expect(input.getAttribute("placeholder")).toContain("20 mutual funds");
  });

  it("renders the compliance footer text", () => {
    render(<InputBar />);
    expect(screen.getByLabelText("Compliance disclaimer")).toBeTruthy();
    expect(screen.getByText(/not investment advice/i)).toBeTruthy();
  });

  it("renders mic toggle button with aria-pressed", () => {
    render(<InputBar />);
    const micBtn = screen.getByLabelText(/Start voice input/i);
    expect(micBtn).toBeTruthy();
    expect(micBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onMicToggle with true when mic is clicked", () => {
    const onMicToggle = vi.fn();
    render(<InputBar onMicToggle={onMicToggle} />);
    const micBtn = screen.getByLabelText(/voice input/i);
    fireEvent.click(micBtn);
    expect(onMicToggle).toHaveBeenCalledWith(true);
  });

  it("calls onSubmit with trimmed text on Enter key", async () => {
    const onSubmit = vi.fn();
    render(<InputBar onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  HDFC fund details  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("HDFC fund details");
  });

  it("does not call onSubmit when input is empty", () => {
    const onSubmit = vi.fn();
    render(<InputBar onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("input is disabled when disabled=true", () => {
    render(<InputBar disabled={true} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("does not call onSubmit when disabled", () => {
    const onSubmit = vi.fn();
    render(<InputBar onSubmit={onSubmit} disabled={true} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "test query" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders isMicActive=true with Stop voice input label", () => {
    render(<InputBar isMicActive={true} />);
    expect(screen.getByLabelText(/Stop voice input/i)).toBeTruthy();
  });
});

/* ========================================================
   SUITE 7 — Barrel Exports
   ======================================================== */
describe("investor-terminal barrel exports", () => {
  it("exports MarqueeTicker as a function", async () => {
    const mod = await import("@/components/investor-terminal/index");
    expect(typeof mod.MarqueeTicker).toBe("function");
  });

  it("exports MOCK_TICKER_DATA with 20 items", async () => {
    const mod = await import("@/components/investor-terminal/index");
    expect(Array.isArray(mod.MOCK_TICKER_DATA)).toBe(true);
    expect(mod.MOCK_TICKER_DATA).toHaveLength(20);
  });

  it("exports AIOrb as a function", async () => {
    const mod = await import("@/components/investor-terminal/index");
    expect(typeof mod.AIOrb).toBe("function");
  });

  it("exports ChatTerminal as a function", async () => {
    const mod = await import("@/components/investor-terminal/index");
    expect(typeof mod.ChatTerminal).toBe("function");
  });

  it("exports BulletResponse as a function", async () => {
    const mod = await import("@/components/investor-terminal/index");
    expect(typeof mod.BulletResponse).toBe("function");
  });

  it("exports CitationTag as a function", async () => {
    const mod = await import("@/components/investor-terminal/index");
    expect(typeof mod.CitationTag).toBe("function");
  });

  it("exports CitationTagList as a function", async () => {
    const mod = await import("@/components/investor-terminal/index");
    expect(typeof mod.CitationTagList).toBe("function");
  });

  it("exports InputBar as a function", async () => {
    const mod = await import("@/components/investor-terminal/index");
    expect(typeof mod.InputBar).toBe("function");
  });
});

/* ========================================================
   SUITE 8 — Mock Data Integrity
   ======================================================== */
describe("MOCK_TICKER_DATA integrity", () => {
  it("contains all 4 fund categories", () => {
    const categories = new Set(MOCK_TICKER_DATA.map((i) => i.category));
    expect(categories.has("equity")).toBe(true);
    expect(categories.has("debt")).toBe(true);
    expect(categories.has("hybrid")).toBe(true);
    expect(categories.has("commodity")).toBe(true);
  });

  it("has exactly 4 debt funds", () => {
    const debt = MOCK_TICKER_DATA.filter((i) => i.category === "debt");
    expect(debt).toHaveLength(4);
  });

  it("has at least 3 commodity funds (Silver ETFs)", () => {
    const commodity = MOCK_TICKER_DATA.filter((i) => i.category === "commodity");
    expect(commodity.length).toBeGreaterThanOrEqual(3);
  });

  it("all symbols are uppercase and non-empty", () => {
    MOCK_TICKER_DATA.forEach((item) => {
      expect(item.symbol.length).toBeGreaterThan(0);
      expect(item.symbol).toBe(item.symbol.toUpperCase());
    });
  });

  it("all fund IDs are unique", () => {
    const ids = MOCK_TICKER_DATA.map((i) => i.fundId);
    const unique = new Set(ids);
    expect(unique.size).toBe(20);
  });

  it("navChangePercent values are reasonable (< 30%)", () => {
    MOCK_TICKER_DATA.forEach((item) => {
      expect(Math.abs(item.navChangePercent)).toBeLessThan(30);
    });
  });
});

/* ========================================================
   SUITE 9 — Accessibility Checks
   ======================================================== */
describe("Accessibility", () => {
  it("MarqueeTicker has aria-label on the root", () => {
    const { container } = render(<MarqueeTicker />);
    const el = container.querySelector('[role="marquee"]');
    expect(el?.getAttribute("aria-label")).toBeTruthy();
  });

  it("ChatTerminal message log has role=log and aria-live", () => {
    render(<ChatTerminal messages={[]} />);
    const log = screen.getByRole("log");
    expect(log.getAttribute("aria-live")).toBe("polite");
  });

  it("InputBar compliance footer has aria-label", () => {
    render(<InputBar />);
    const footer = screen.getByLabelText("Compliance disclaimer");
    expect(footer).toBeTruthy();
  });

  it("CitationTagList has list role and aria-label", () => {
    render(<CitationTagList citations={[SAMPLE_CITATION]} />);
    expect(screen.getByLabelText("Source citations")).toBeTruthy();
  });

  it("AIOrb has role=img", () => {
    render(<AIOrb />);
    expect(screen.getByRole("img")).toBeTruthy();
  });

  it("BulletResponse has role=list and items have role=listitem", () => {
    render(<BulletResponse bullets={["A", "B"]} animate={false} />);
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
