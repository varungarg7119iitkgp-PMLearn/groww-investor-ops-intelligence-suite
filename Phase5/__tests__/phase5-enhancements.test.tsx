/**
 * Phase 5 Enhancements — Test Suite
 *
 * Tests for:
 *   - AuthorizingSplash
 *   - KnowledgeHubHeader
 *   - NewsRail
 *   - OpsAccessButton
 *   - OpsHeader
 *   - OpsFilterBar
 *   - OpsSidebar
 *   - CategoryMixBar
 *   - SentimentTrend
 */

/* eslint-disable react/display-name */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/* ─── next/navigation mock (for useRouter) ────────────────────── */
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

/* ─── next/link mock ─────────────────────────────────────────── */
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

/* ─── Framer-motion mock (same pattern as Phase 5 main suite) ── */
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
        React.createElement(Tag as string, { ref, ...strip(rest as Record<string, unknown>) }, children),
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
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAnimation:    () => ({ start: vi.fn() }),
    useMotionValue:  (v: number) => ({ get: () => v, set: vi.fn() }),
    useTransform:    () => ({ get: vi.fn() }),
  };
});

/* ── Components under test ──────────────────────────────────── */
import { AuthorizingSplash } from "@/components/shared/AuthorizingSplash";
import { KnowledgeHubHeader } from "@/components/investor-terminal/KnowledgeHubHeader";
import { NewsRail }            from "@/components/investor-terminal/NewsRail";
import { OpsAccessButton }     from "@/components/shared/OpsAccessButton";
import { OpsHeader }           from "@/components/director-ops/OpsHeader";
import { OpsFilterBar }        from "@/components/director-ops/OpsFilterBar";
import { OpsSidebar }          from "@/components/director-ops/OpsSidebar";
import { CategoryMixBar }      from "@/components/director-ops/CategoryMixBar";
import { SentimentTrend, type SentimentPoint } from "@/components/director-ops/SentimentTrend";

beforeEach(() => {
  vi.useFakeTimers();
  pushMock.mockClear();
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

/* ════════════════════════════════════════════════════════════════
   SUITE 1 — AuthorizingSplash
   ════════════════════════════════════════════════════════════════ */
describe("AuthorizingSplash", () => {
  it("renders when open=true", () => {
    render(<AuthorizingSplash open onComplete={vi.fn()} />);
    expect(screen.getByTestId("authorizing-splash")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(<AuthorizingSplash open={false} />);
    expect(screen.queryByTestId("authorizing-splash")).toBeNull();
  });

  it("shows the destination label", () => {
    render(<AuthorizingSplash open destinationLabel="OPS CONSOLE" />);
    expect(screen.getByText("OPS CONSOLE")).toBeInTheDocument();
  });

  it("renders the rotor and progress bar", () => {
    render(<AuthorizingSplash open />);
    expect(screen.getByTestId("auth-rotor")).toBeInTheDocument();
    expect(screen.getByTestId("auth-progress-bar")).toBeInTheDocument();
  });

  it("fires onComplete after durationMs", async () => {
    const onComplete = vi.fn();
    render(<AuthorizingSplash open durationMs={500} onComplete={onComplete} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(onComplete).toHaveBeenCalled();
  });

  it("has alertdialog role for screen readers", () => {
    render(<AuthorizingSplash open />);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("renders status step messages", () => {
    render(<AuthorizingSplash open durationMs={2000} />);
    expect(screen.getByTestId("auth-status").textContent).toMatch(/INITIALIZING SECURE CHANNEL/i);
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 2 — KnowledgeHubHeader
   ════════════════════════════════════════════════════════════════ */
describe("KnowledgeHubHeader", () => {
  it("renders the GROWW INVESTOR KNOWLEDGE HUB title", () => {
    const { container } = render(<KnowledgeHubHeader />);
    expect(container.textContent).toContain("GROWW");
    expect(container.textContent).toContain("INVESTOR");
    expect(container.textContent).toContain("KNOWLEDGE HUB");
  });

  it("renders the tagline", () => {
    render(<KnowledgeHubHeader />);
    expect(screen.getByText(/COMPLIANT · CITED · CONVERSATIONAL/i)).toBeInTheDocument();
  });

  it("renders the greeting block with investor name", () => {
    render(<KnowledgeHubHeader investorName="Test User" />);
    expect(screen.getByTestId("knowledge-hub-greeting").textContent).toContain("Test User");
  });

  it("renders LIVE status pill with fund count", () => {
    const { container } = render(<KnowledgeHubHeader fundCount={20} />);
    expect(container.textContent).toMatch(/LIVE.*20.*FUNDS/);
  });

  it("renders FACTS-ONLY · ZERO ADVICE pill", () => {
    render(<KnowledgeHubHeader />);
    expect(screen.getByText(/FACTS-ONLY · ZERO ADVICE/i)).toBeInTheDocument();
  });

  it("renders SEBI-DISCLOSED pill", () => {
    render(<KnowledgeHubHeader />);
    expect(screen.getByText(/SEBI-DISCLOSED/i)).toBeInTheDocument();
  });

  it("greeting matches one of the known patterns after mount", () => {
    render(<KnowledgeHubHeader />);
    const text = screen.getByTestId("knowledge-hub-greeting").textContent ?? "";
    // Either pre-effect "Welcome" or post-effect time-aware greeting; never raw `toLocale*` artifacts
    expect(text).toMatch(/(Welcome|Good morning|Good afternoon|Good evening)/);
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 3 — NewsRail
   ════════════════════════════════════════════════════════════════ */
describe("NewsRail", () => {
  it("renders the header label", () => {
    render(<NewsRail />);
    expect(screen.getByText(/NEWS & UPDATES/i)).toBeInTheDocument();
  });

  it("renders all default news items", () => {
    render(<NewsRail />);
    const items = screen.getAllByTestId("news-item");
    expect(items.length).toBeGreaterThanOrEqual(7);
  });

  it("renders all four category filter pills", () => {
    render(<NewsRail />);
    expect(screen.getByTestId("news-filter-all")).toBeInTheDocument();
    expect(screen.getByTestId("news-filter-market")).toBeInTheDocument();
    expect(screen.getByTestId("news-filter-product")).toBeInTheDocument();
    expect(screen.getByTestId("news-filter-regulatory")).toBeInTheDocument();
  });

  it("filters items when MARKET pill is clicked", () => {
    render(<NewsRail />);
    fireEvent.click(screen.getByTestId("news-filter-market"));
    const items = screen.getAllByTestId("news-item");
    items.forEach((el) => {
      expect(el.getAttribute("data-category")).toBe("MARKET");
    });
  });

  it("filters items when REGULATORY pill is clicked", () => {
    render(<NewsRail />);
    fireEvent.click(screen.getByTestId("news-filter-regulatory"));
    const items = screen.getAllByTestId("news-item");
    items.forEach((el) => {
      expect(el.getAttribute("data-category")).toBe("REGULATORY");
    });
  });

  it("fires onItemClick when a news item is clicked", () => {
    const handler = vi.fn();
    render(<NewsRail onItemClick={handler} />);
    fireEvent.click(screen.getAllByTestId("news-item")[0]);
    expect(handler).toHaveBeenCalled();
  });

  it("shows empty state when no items match filter", () => {
    render(<NewsRail items={[]} />);
    expect(screen.getByTestId("news-empty")).toBeInTheDocument();
  });

  it("ALL filter shows all items including different categories", () => {
    render(<NewsRail />);
    fireEvent.click(screen.getByTestId("news-filter-all"));
    const items = screen.getAllByTestId("news-item");
    const cats = new Set(items.map((el) => el.getAttribute("data-category")));
    expect(cats.size).toBeGreaterThan(1);
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 4 — OpsAccessButton
   ════════════════════════════════════════════════════════════════ */
describe("OpsAccessButton", () => {
  it("renders the CTA button", () => {
    render(<OpsAccessButton />);
    expect(screen.getByTestId("ops-access-button")).toBeInTheDocument();
  });

  it("shows the default DIRECTOR OPS label", () => {
    render(<OpsAccessButton />);
    expect(screen.getByTestId("ops-access-button")).toHaveTextContent("DIRECTOR OPS");
  });

  it("supports custom label", () => {
    render(<OpsAccessButton label="ENTER OPS" />);
    expect(screen.getByTestId("ops-access-button")).toHaveTextContent("ENTER OPS");
  });

  it("opens the AuthorizingSplash on click", () => {
    render(<OpsAccessButton splashMs={500} />);
    expect(screen.queryByTestId("authorizing-splash")).toBeNull();
    fireEvent.click(screen.getByTestId("ops-access-button"));
    expect(screen.getByTestId("authorizing-splash")).toBeInTheDocument();
  });

  it("switches activeMode to director-ops after splash completes (Phase 6 wiring)", async () => {
    const { useUIStore, resetStoreForTests } = await import("@/lib/store");
    resetStoreForTests();
    render(<OpsAccessButton splashMs={300} />);
    expect(useUIStore.getState().activeMode).toBe("investor-terminal");
    fireEvent.click(screen.getByTestId("ops-access-button"));
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(useUIStore.getState().activeMode).toBe("director-ops");
  });

  it("button is aria-labeled", () => {
    render(<OpsAccessButton />);
    expect(screen.getByLabelText(/Director Ops console/i)).toBeInTheDocument();
  });

  it("is a floating right-edge tab (fixed positioning on the right)", () => {
    render(<OpsAccessButton />);
    const btn = screen.getByTestId("ops-access-button");
    expect(btn.style.position).toBe("fixed");
    expect(btn.style.right).toBe("0px");
    // The visible label should still report DIRECTOR OPS (rotated but in DOM text)
    expect(btn).toHaveTextContent("DIRECTOR OPS");
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 1b — AuthorizingSplash freeze-blur behaviour
   ════════════════════════════════════════════════════════════════ */
describe("AuthorizingSplash — freeze-blur overlay", () => {
  it("applies backdrop-filter blur so background motion is muted", () => {
    render(<AuthorizingSplash open />);
    const overlay = screen.getByTestId("authorizing-splash");
    const blur = overlay.style.backdropFilter || overlay.style.getPropertyValue("backdrop-filter");
    expect(blur).toMatch(/blur/);
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 5 — OpsHeader
   ════════════════════════════════════════════════════════════════ */
describe("OpsHeader", () => {
  it("renders the brand block", () => {
    render(<OpsHeader />);
    expect(screen.getByText(/DIRECTOR OPS/)).toBeInTheDocument();
    expect(screen.getByText(/COMMAND CENTRE/)).toBeInTheDocument();
  });

  it("renders the back-to-Investor button (Phase 6 — store-driven, no href)", async () => {
    const { useUIStore, resetStoreForTests } = await import("@/lib/store");
    resetStoreForTests();
    /* Pre-set to director so the button has somewhere to go back from */
    useUIStore.getState().setActiveMode("director-ops");
    render(<OpsHeader />);
    const link = screen.getByTestId("ops-back-link");
    expect(link.tagName).toBe("BUTTON");
    expect(link).toHaveAttribute("aria-label", "Switch back to Investor Hub");
    fireEvent.click(link);
    expect(useUIStore.getState().activeMode).toBe("investor-terminal");
  });

  it("displays pending/total counts", () => {
    render(<OpsHeader pendingCount={2} totalCount={5} />);
    const pill = screen.getByTestId("ops-stat-pill");
    expect(pill.textContent).toContain("2");
    expect(pill.textContent).toContain("5");
  });

  it("sync button fires handler", () => {
    const handler = vi.fn();
    render(<OpsHeader onSync={handler} />);
    fireEvent.click(screen.getByTestId("ops-sync-button"));
    expect(handler).toHaveBeenCalled();
  });

  it("sync button shows SYNCING label when isSyncing=true", () => {
    render(<OpsHeader isSyncing />);
    expect(screen.getByTestId("ops-sync-button")).toHaveTextContent(/SYNCING/i);
  });

  it("renders the brand glyph", () => {
    render(<OpsHeader />);
    expect(screen.getByTestId("ops-brand-glyph")).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 6 — OpsFilterBar
   ════════════════════════════════════════════════════════════════ */
describe("OpsFilterBar", () => {
  it("renders all 3 platform options", () => {
    render(<OpsFilterBar platform="ALL" timeRange="LAST_7" />);
    expect(screen.getByTestId("platform-all")).toBeInTheDocument();
    expect(screen.getByTestId("platform-android")).toBeInTheDocument();
    expect(screen.getByTestId("platform-ios")).toBeInTheDocument();
  });

  it("marks active platform with aria-selected", () => {
    render(<OpsFilterBar platform="ANDROID" timeRange="LAST_7" />);
    expect(screen.getByTestId("platform-android")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("platform-all")).toHaveAttribute("aria-selected", "false");
  });

  it("fires onPlatformChange when a platform pill is clicked", () => {
    const handler = vi.fn();
    render(<OpsFilterBar platform="ALL" timeRange="LAST_7" onPlatformChange={handler} />);
    fireEvent.click(screen.getByTestId("platform-ios"));
    expect(handler).toHaveBeenCalledWith("IOS");
  });

  it("fires onTimeRangeChange when select changes", () => {
    const handler = vi.fn();
    render(<OpsFilterBar platform="ALL" timeRange="LAST_7" onTimeRangeChange={handler} />);
    fireEvent.change(screen.getByTestId("ops-time-select"), { target: { value: "LAST_30" } });
    expect(handler).toHaveBeenCalledWith("LAST_30");
  });

  it("fires onReset when reset clicked (when filters non-default)", () => {
    const handler = vi.fn();
    render(<OpsFilterBar platform="ANDROID" timeRange="TODAY" onReset={handler} />);
    fireEvent.click(screen.getByTestId("ops-filter-reset"));
    expect(handler).toHaveBeenCalled();
  });

  it("reset button is disabled when filters are at default", () => {
    render(<OpsFilterBar platform="ALL" timeRange="LAST_7" />);
    expect(screen.getByTestId("ops-filter-reset")).toBeDisabled();
  });

  it("summary reflects active filters", () => {
    render(<OpsFilterBar platform="IOS" timeRange="LAST_30" />);
    const summary = screen.getByTestId("ops-filter-summary").textContent ?? "";
    expect(summary).toContain("IOS");
    expect(summary).toMatch(/LAST 30 DAYS/);
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 7 — OpsSidebar
   ════════════════════════════════════════════════════════════════ */
describe("OpsSidebar", () => {
  it("renders all section items", () => {
    render(<OpsSidebar />);
    expect(screen.getByTestId("sidebar-pulse")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-approvals")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-categories")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-sentiment")).toBeInTheDocument();
  });

  it("marks active section", () => {
    render(<OpsSidebar active="APPROVALS" />);
    expect(screen.getByTestId("sidebar-approvals")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("sidebar-pulse")).toHaveAttribute("data-active", "false");
  });

  it("fires onSelect for available sections", () => {
    const handler = vi.fn();
    render(<OpsSidebar onSelect={handler} />);
    fireEvent.click(screen.getByTestId("sidebar-categories"));
    expect(handler).toHaveBeenCalledWith("CATEGORIES");
  });

  it("disables unavailable sections", () => {
    render(<OpsSidebar />);
    expect(screen.getByTestId("sidebar-testimonials")).toBeDisabled();
    expect(screen.getByTestId("sidebar-integrations")).toBeDisabled();
  });

  it("renders the NAV header", () => {
    render(<OpsSidebar />);
    expect(screen.getByText(/> NAV/i)).toBeInTheDocument();
  });

  it("does not call onSelect for disabled items", () => {
    const handler = vi.fn();
    render(<OpsSidebar onSelect={handler} />);
    fireEvent.click(screen.getByTestId("sidebar-testimonials"));
    expect(handler).not.toHaveBeenCalled();
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 8 — CategoryMixBar
   ════════════════════════════════════════════════════════════════ */
describe("CategoryMixBar", () => {
  const sample = [
    { name: "KYC",      count: 142 },
    { name: "Payments", count: 118 },
    { name: "Reports",  count: 87  },
  ];

  it("renders the section header", () => {
    render(<CategoryMixBar categories={sample} />);
    expect(screen.getByText(/CATEGORY MIX/i)).toBeInTheDocument();
  });

  it("renders one row per category", () => {
    render(<CategoryMixBar categories={sample} />);
    expect(screen.getAllByTestId("category-row")).toHaveLength(3);
  });

  it("respects maxRows cap", () => {
    const big = Array.from({ length: 20 }, (_, i) => ({ name: `Cat${i}`, count: 100 - i }));
    render(<CategoryMixBar categories={big} maxRows={5} />);
    expect(screen.getAllByTestId("category-row")).toHaveLength(5);
  });

  it("sorts categories by count desc", () => {
    render(<CategoryMixBar categories={[
      { name: "Low",  count: 10 },
      { name: "High", count: 99 },
      { name: "Mid",  count: 50 },
    ]} />);
    const rows = screen.getAllByTestId("category-row");
    expect(rows[0]).toHaveAttribute("data-category", "High");
    expect(rows[1]).toHaveAttribute("data-category", "Mid");
    expect(rows[2]).toHaveAttribute("data-category", "Low");
  });

  it("displays total review count when total prop is provided", () => {
    render(<CategoryMixBar categories={sample} total={500} />);
    expect(screen.getByText(/500 REVIEWS/)).toBeInTheDocument();
  });

  it("falls back to sum of category counts when total not provided", () => {
    render(<CategoryMixBar categories={sample} />);
    // 142 + 118 + 87 = 347
    expect(screen.getByText(/347 REVIEWS/)).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 9 — SentimentTrend
   ════════════════════════════════════════════════════════════════ */
describe("SentimentTrend", () => {
  const samplePoints: SentimentPoint[] = [
    { label: "May 18", positive: 10, neutral: 20, negative: 40 },
    { label: "May 19", positive: 15, neutral: 22, negative: 38 },
    { label: "May 20", positive: 20, neutral: 25, negative: 30 },
  ];

  it("renders the section header", () => {
    render(<SentimentTrend points={samplePoints} />);
    expect(screen.getByText(/SENTIMENT TREND/i)).toBeInTheDocument();
  });

  it("renders all 3 legend items", () => {
    render(<SentimentTrend points={samplePoints} />);
    expect(screen.getByTestId("sentiment-trend-legend-positive")).toBeInTheDocument();
    expect(screen.getByTestId("sentiment-trend-legend-neutral")).toBeInTheDocument();
    expect(screen.getByTestId("sentiment-trend-legend-negative")).toBeInTheDocument();
  });

  it("computes NET POSITIVE label correctly", () => {
    const positive = [
      { label: "a", positive: 100, neutral: 10, negative: 10 },
      { label: "b", positive: 100, neutral: 10, negative: 10 },
    ];
    render(<SentimentTrend points={positive} />);
    expect(screen.getByTestId("sentiment-trend-net-label").textContent).toMatch(/NET POSITIVE/);
  });

  it("computes NET NEGATIVE label correctly", () => {
    const negative = [
      { label: "a", positive: 5,  neutral: 5, negative: 100 },
      { label: "b", positive: 10, neutral: 5, negative: 95  },
    ];
    render(<SentimentTrend points={negative} />);
    expect(screen.getByTestId("sentiment-trend-net-label").textContent).toMatch(/NET NEGATIVE/);
  });

  it("displays per-series totals", () => {
    render(<SentimentTrend points={samplePoints} />);
    // Total positives = 10+15+20 = 45
    expect(screen.getByTestId("sentiment-trend-legend-positive").textContent).toContain("45");
  });

  it("handles empty points gracefully", () => {
    render(<SentimentTrend points={[]} />);
    expect(screen.getByText(/SENTIMENT TREND/i)).toBeInTheDocument();
  });

  /* ── New source/title/subtitle/accent props ── */
  it('uses "reviews" preset → REVIEWS SENTIMENT heading + Play/App Store subtitle', () => {
    render(<SentimentTrend points={samplePoints} source="reviews" />);
    expect(screen.getByText(/REVIEWS SENTIMENT/i)).toBeInTheDocument();
    expect(screen.getByText(/Play Store \+ App Store/i)).toBeInTheDocument();
  });

  it('uses "chat" preset → CHAT SENTIMENT heading + Investor Panel subtitle', () => {
    render(<SentimentTrend points={samplePoints} source="chat" />);
    expect(screen.getByText(/CHAT SENTIMENT/i)).toBeInTheDocument();
    expect(screen.getByText(/Investor Panel chats/i)).toBeInTheDocument();
  });

  it("supports a custom testId so two instances can co-exist on one page", () => {
    render(
      <>
        <SentimentTrend points={samplePoints} source="reviews" testId="sentiment-trend-reviews" />
        <SentimentTrend points={samplePoints} source="chat"    testId="sentiment-trend-chat" />
      </>,
    );
    expect(screen.getByTestId("sentiment-trend-reviews")).toBeInTheDocument();
    expect(screen.getByTestId("sentiment-trend-chat")).toBeInTheDocument();
    expect(screen.getByTestId("sentiment-trend-reviews-legend-positive")).toBeInTheDocument();
    expect(screen.getByTestId("sentiment-trend-chat-legend-positive")).toBeInTheDocument();
  });

  it("explicit title + subtitle override the source preset", () => {
    render(
      <SentimentTrend
        points={samplePoints}
        source="reviews"
        title="CUSTOM TITLE"
        subtitle="custom subtitle"
      />,
    );
    expect(screen.getByText(/CUSTOM TITLE/)).toBeInTheDocument();
    expect(screen.getByText(/custom subtitle/i)).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 10 — Accessibility / Integration
   ════════════════════════════════════════════════════════════════ */
describe("Phase 5 Enhancement — Accessibility", () => {
  it("AuthorizingSplash has alertdialog role + aria-label", () => {
    render(<AuthorizingSplash open />);
    expect(screen.getByLabelText(/Authorizing access/i)).toBeInTheDocument();
  });

  it("NewsRail has aria-label", () => {
    render(<NewsRail />);
    expect(screen.getByLabelText("Market & product news")).toBeInTheDocument();
  });

  it("OpsHeader testIds are stable", () => {
    render(<OpsHeader />);
    expect(screen.getByTestId("ops-header")).toBeInTheDocument();
  });

  it("OpsSidebar has navigation landmark", () => {
    render(<OpsSidebar />);
    expect(screen.getByRole("navigation", { name: /Director Ops sections/i })).toBeInTheDocument();
  });

  it("OpsFilterBar platform group has role=tablist", () => {
    render(<OpsFilterBar platform="ALL" timeRange="LAST_7" />);
    expect(screen.getByRole("tablist", { name: /Platform filter/i })).toBeInTheDocument();
  });

  it("OpsAccessButton has accessible name", () => {
    render(<OpsAccessButton />);
    expect(screen.getByRole("button", { name: /Director Ops console/i })).toBeInTheDocument();
  });
});
