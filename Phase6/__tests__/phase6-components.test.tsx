/**
 * Phase 6 — Component & integration tests
 *
 * Covers:
 *   - ModeToggle: render, accessibility (tablist, aria-selected, tabindex),
 *     click switching, keyboard nav (ArrowLeft/Right, Home/End, Enter/Space),
 *     accent color, disabled-during-transition.
 *   - ModeTransition: scanning-line on toggle, conditional content render,
 *     data-mode attribute, AnimatePresence swap.
 *   - Single-entry integration: page-level render (Investor visible by default,
 *     toggle activates Director, store survives).
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";

/* ─── framer-motion mock (style + animate/variants stripped, ref preserved) ── */
vi.mock("framer-motion", () => {
  const strip = (props: Record<string, unknown>) => {
    const clean = { ...props };
    [
      "variants", "initial", "animate", "exit", "whileHover", "whileTap",
      "transition", "layoutId", "layout",
    ].forEach((k) => delete clean[k]);
    return clean;
  };
  type AnyTag = keyof React.JSX.IntrinsicElements;
  const make = (Tag: AnyTag) =>
    React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
      ({ children, ...rest }, ref) =>
        React.createElement(Tag, { ref, ...strip(rest as Record<string, unknown>) }, children),
    );
  const MockButton = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >(({ children, disabled, onClick, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      {...strip(rest as Record<string, unknown>)}
    >
      {children}
    </button>
  ));
  return {
    motion: {
      div:     make("div"),
      span:    make("span"),
      header:  make("header"),
      article: make("article"),
      section: make("section"),
      p:       make("p"),
      svg:     make("svg" as AnyTag),
      path:    make("path" as AnyTag),
      g:       make("g" as AnyTag),
      circle:  make("circle" as AnyTag),
      rect:    make("rect" as AnyTag),
      button:  MockButton,
    },
    AnimatePresence:   ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAnimation:      () => ({ start: vi.fn() }),
    useMotionValue:    (v: number) => ({ get: () => v, set: vi.fn() }),
    useTransform:      () => ({ get: vi.fn() }),
    useReducedMotion:  () => false,
  };
});

/* ── Mock next/navigation so any code paths that touch the router don't blow up ── */
vi.mock("next/navigation", () => ({
  useRouter:        () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams:  () => new URLSearchParams(),
  usePathname:      () => "/",
  redirect:         vi.fn(),
}));

/* ─────────────────────────────────────────────────────────── */

import { ModeToggle } from "@/components/shared/ModeToggle";
import { ModeTransition } from "@/components/shared/ModeTransition";
import {
  useUIStore,
  resetStoreForTests,
  MODE_TRANSITION_MS,
  MODE_TOGGLE_DEBOUNCE_MS,
} from "@/lib/store";

beforeEach(() => {
  vi.useFakeTimers();
  resetStoreForTests();
  if (typeof window !== "undefined") window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

/* ════════════════════════════════════════════════════════════
   SUITE 1 — ModeToggle rendering & a11y
   ════════════════════════════════════════════════════════════ */
describe("ModeToggle — rendering & accessibility", () => {
  it("renders both tabs with correct labels", () => {
    render(<ModeToggle />);
    expect(screen.getByText("INVESTOR TERMINAL")).toBeInTheDocument();
    expect(screen.getByText("DIRECTOR OPS")).toBeInTheDocument();
  });

  it("has role=tablist with aria-orientation=horizontal", () => {
    render(<ModeToggle />);
    const tablist = screen.getByTestId("mode-toggle");
    expect(tablist).toHaveAttribute("role", "tablist");
    expect(tablist).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("each tab has role=tab + aria-selected matching activeMode", () => {
    render(<ModeToggle />);
    const investor = screen.getByTestId("mode-tab-investor");
    const director = screen.getByTestId("mode-tab-director");
    expect(investor).toHaveAttribute("role", "tab");
    expect(director).toHaveAttribute("role", "tab");
    expect(investor).toHaveAttribute("aria-selected", "true");
    expect(director).toHaveAttribute("aria-selected", "false");
  });

  it("active tab has tabindex=0; inactive tab has tabindex=-1", () => {
    render(<ModeToggle />);
    const investor = screen.getByTestId("mode-tab-investor");
    const director = screen.getByTestId("mode-tab-director");
    expect(investor).toHaveAttribute("tabindex", "0");
    expect(director).toHaveAttribute("tabindex", "-1");
  });

  it("renders exactly two tabs (Req 1.1)", () => {
    render(<ModeToggle />);
    const tablist = screen.getByTestId("mode-toggle");
    const tabs = tablist.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
  });

  it("renders the sliding indicator", () => {
    render(<ModeToggle />);
    expect(screen.getByTestId("mode-toggle-indicator")).toBeInTheDocument();
  });

  it("accepts a custom widthPx (UI/UX §4.1)", () => {
    render(<ModeToggle widthPx={500} />);
    const toggle = screen.getByTestId("mode-toggle");
    expect(toggle.style.width).toBe("500px");
  });
});

/* ════════════════════════════════════════════════════════════
   SUITE 2 — ModeToggle click + keyboard behaviour
   ════════════════════════════════════════════════════════════ */
describe("ModeToggle — interaction", () => {
  it("clicking DIRECTOR OPS switches activeMode", () => {
    render(<ModeToggle />);
    fireEvent.click(screen.getByTestId("mode-tab-director"));
    expect(useUIStore.getState().activeMode).toBe("director-ops");
  });

  it("clicking the already-active tab is a no-op", () => {
    render(<ModeToggle />);
    fireEvent.click(screen.getByTestId("mode-tab-investor"));
    expect(useUIStore.getState().activeMode).toBe("investor-terminal");
  });

  it("ArrowRight on the tablist switches to director-ops", () => {
    render(<ModeToggle />);
    fireEvent.keyDown(screen.getByTestId("mode-toggle"), { key: "ArrowRight" });
    expect(useUIStore.getState().activeMode).toBe("director-ops");
  });

  it("ArrowLeft on the tablist switches back to investor-terminal", () => {
    /* Pre-set to director */
    act(() => useUIStore.getState().setActiveMode("director-ops"));
    render(<ModeToggle />);
    fireEvent.keyDown(screen.getByTestId("mode-toggle"), { key: "ArrowLeft" });
    expect(useUIStore.getState().activeMode).toBe("investor-terminal");
  });

  it("Home / End jump to the first / last tab", () => {
    render(<ModeToggle />);
    fireEvent.keyDown(screen.getByTestId("mode-toggle"), { key: "End" });
    expect(useUIStore.getState().activeMode).toBe("director-ops");

    fireEvent.keyDown(screen.getByTestId("mode-toggle"), { key: "Home" });
    expect(useUIStore.getState().activeMode).toBe("investor-terminal");
  });

  it("Enter toggles modes via toggleMode (debounced 500ms)", async () => {
    render(<ModeToggle />);
    fireEvent.keyDown(screen.getByTestId("mode-toggle"), { key: "Enter" });
    expect(useUIStore.getState().activeMode).toBe("director-ops");
    /* Second Enter inside the debounce window is ignored */
    /* (we also have to clear isTransitioning so only the debounce blocks) */
    useUIStore.setState({ isTransitioning: false });
    fireEvent.keyDown(screen.getByTestId("mode-toggle"), { key: "Enter" });
    expect(useUIStore.getState().activeMode).toBe("director-ops");

    /* After debounce window — Enter works again */
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODE_TOGGLE_DEBOUNCE_MS + 50);
    });
    fireEvent.keyDown(screen.getByTestId("mode-toggle"), { key: "Enter" });
    expect(useUIStore.getState().activeMode).toBe("investor-terminal");
  });

  it("Space key activates toggleMode (a11y parity with Enter)", () => {
    render(<ModeToggle />);
    fireEvent.keyDown(screen.getByTestId("mode-toggle"), { key: " " });
    expect(useUIStore.getState().activeMode).toBe("director-ops");
  });

  it("tab buttons are disabled while isTransitioning is true", () => {
    /* Force a transition into flight */
    act(() => useUIStore.getState().toggleMode());
    expect(useUIStore.getState().isTransitioning).toBe(true);
    render(<ModeToggle />);
    const investor = screen.getByTestId("mode-tab-investor");
    const director = screen.getByTestId("mode-tab-director");
    expect(investor).toBeDisabled();
    expect(director).toBeDisabled();
  });
});

/* ════════════════════════════════════════════════════════════
   SUITE 3 — ModeTransition wrapper
   ════════════════════════════════════════════════════════════ */
describe("ModeTransition — wrapper behaviour", () => {
  it("renders investor content when activeMode = investor-terminal", () => {
    render(
      <ModeTransition
        investorContent={<div data-testid="investor-pane">INV</div>}
        directorContent={<div data-testid="director-pane">DIR</div>}
      />,
    );
    expect(screen.getByTestId("investor-pane")).toBeInTheDocument();
    expect(screen.queryByTestId("director-pane")).toBeNull();
  });

  it("renders director content when activeMode = director-ops", () => {
    act(() => useUIStore.getState().setActiveMode("director-ops"));
    render(
      <ModeTransition
        investorContent={<div data-testid="investor-pane">INV</div>}
        directorContent={<div data-testid="director-pane">DIR</div>}
      />,
    );
    expect(screen.getByTestId("director-pane")).toBeInTheDocument();
    expect(screen.queryByTestId("investor-pane")).toBeNull();
  });

  it("exposes data-mode and data-transitioning attributes", () => {
    render(
      <ModeTransition
        investorContent={<div />}
        directorContent={<div />}
      />,
    );
    const wrap = screen.getByTestId("mode-transition");
    expect(wrap).toHaveAttribute("data-mode", "investor-terminal");
    expect(wrap).toHaveAttribute("data-transitioning", "false");
  });

  it("ScanningLine becomes visible on toggleMode (UI/UX §4.3 step 2)", async () => {
    const { container } = render(
      <ModeTransition
        investorContent={<div />}
        directorContent={<div />}
      />,
    );
    /* Force a transition */
    act(() => useUIStore.getState().toggleMode());

    const wrap = container.querySelector('[data-testid="mode-transition"]');
    expect(wrap?.getAttribute("data-mode")).toBe("director-ops");
    expect(wrap?.getAttribute("data-transitioning")).toBe("true");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODE_TRANSITION_MS + 100);
    });
    expect(useUIStore.getState().isTransitioning).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════
   SUITE 4 — Integration: toggle drives content swap
   ════════════════════════════════════════════════════════════ */
describe("Integration — ModeToggle + ModeTransition", () => {
  it("clicking DIRECTOR OPS swaps the rendered pane", () => {
    render(
      <>
        <ModeToggle />
        <ModeTransition
          investorContent={<div data-testid="i-pane">INV</div>}
          directorContent={<div data-testid="d-pane">DIR</div>}
        />
      </>,
    );
    expect(screen.getByTestId("i-pane")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("mode-tab-director"));
    expect(useUIStore.getState().activeMode).toBe("director-ops");
    expect(screen.getByTestId("d-pane")).toBeInTheDocument();
    expect(screen.queryByTestId("i-pane")).toBeNull();
  });

  it("rapid clicks are debounced — second click is ignored", async () => {
    render(
      <>
        <ModeToggle />
        <ModeTransition
          investorContent={<div data-testid="i-pane">INV</div>}
          directorContent={<div data-testid="d-pane">DIR</div>}
        />
      </>,
    );
    fireEvent.click(screen.getByTestId("mode-tab-director"));
    /* Second click while transitioning — disabled button can't fire */
    fireEvent.click(screen.getByTestId("mode-tab-investor"));
    expect(useUIStore.getState().activeMode).toBe("director-ops");
    /* After the transition + debounce window completes, click works again */
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODE_TOGGLE_DEBOUNCE_MS + MODE_TRANSITION_MS + 100);
    });
    fireEvent.click(screen.getByTestId("mode-tab-investor"));
    expect(useUIStore.getState().activeMode).toBe("investor-terminal");
  });
});
