/**
 * Phase 5 — Director Ops UI Shell — Comprehensive Test Suite
 *
 * Components under test:
 *   - ThemeBlock
 *   - MarketContextBlock
 *   - CsvUploader
 *   - PulseBriefing
 *   - ActionGate
 *   - ApprovalCard
 *   - HitlQueue
 *
 * Mock strategy: framer-motion is replaced with plain DOM elements to
 * sidestep JSDOM transform parsing limits (same strategy as Phase 4).
 *
 * Run: `npx vitest run Phase5`
 */

/* eslint-disable react/display-name */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/* ════════════════════════════════════════════════════════════════
   Framer-motion mock — same pattern as Phase 4
   ════════════════════════════════════════════════════════════════ */
vi.mock("framer-motion", () => {
  const strip = (props: Record<string, unknown>) => {
    const clean = { ...props };
    [
      "variants",
      "initial",
      "animate",
      "exit",
      "whileHover",
      "whileTap",
      "transition",
      "layoutId",
      "layout",
    ].forEach((k) => delete clean[k]);
    return clean;
  };

  const MockDiv = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, ...rest }, ref) => <div ref={ref} {...strip(rest as Record<string, unknown>)}>{children}</div>,
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
  const MockSpan = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    ({ children, ...rest }, ref) => (
      <span ref={ref} {...strip(rest as Record<string, unknown>)}>{children}</span>
    ),
  );
  const MockArticle = React.forwardRef<
    HTMLElement,
    React.HTMLAttributes<HTMLElement>
  >(({ children, ...rest }, ref) => (
    <article ref={ref} {...strip(rest as Record<string, unknown>)}>{children}</article>
  ));

  return {
    motion: {
      div:     MockDiv,
      button:  MockButton,
      span:    MockSpan,
      article: MockArticle,
      p:       MockDiv,
      g:       MockDiv,
      circle:  MockDiv,
      rect:    MockDiv,
      path:    MockDiv,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAnimation:    () => ({ start: vi.fn() }),
    useMotionValue:  (v: number) => ({ get: () => v, set: vi.fn() }),
    useTransform:    () => ({ get: vi.fn() }),
  };
});

/* ── Component imports (post-mock) ───────────────────────────── */
import { ThemeBlock }         from "@/components/director-ops/ThemeBlock";
import { MarketContextBlock } from "@/components/director-ops/MarketContextBlock";
import { CsvUploader }        from "@/components/director-ops/CsvUploader";
import { PulseBriefing }      from "@/components/director-ops/PulseBriefing";
import { ActionGate }         from "@/components/director-ops/ActionGate";
import { ApprovalCard }       from "@/components/director-ops/ApprovalCard";
import { HitlQueue }          from "@/components/director-ops/HitlQueue";
import type { ApprovalItem, PulseTheme, WeeklyPulse } from "@/types";

/* ════════════════════════════════════════════════════════════════
   FIXTURES
   ════════════════════════════════════════════════════════════════ */

const themeFixture = (overrides: Partial<PulseTheme> = {}): PulseTheme => ({
  name:        "KYC Re-verification Friction",
  reviewCount: 142,
  isTopThree:  true,
  sentiment:   "negative",
  ...overrides,
});

const pulseFixture = (overrides: Partial<WeeklyPulse> = {}): WeeklyPulse => ({
  id:          "pulse-test-1",
  weekStart:   "2026-05-19",
  reviewCount: 411,
  wordCount:   238,
  status:      "draft",
  themes: [
    themeFixture({ name: "Theme One",   reviewCount: 142, isTopThree: true }),
    themeFixture({ name: "Theme Two",   reviewCount: 118, isTopThree: true,  sentiment: "negative" }),
    themeFixture({ name: "Theme Three", reviewCount: 87,  isTopThree: true,  sentiment: "neutral" }),
    themeFixture({ name: "Theme Four",  reviewCount: 41,  isTopThree: false, sentiment: "neutral" }),
    themeFixture({ name: "Theme Five",  reviewCount: 23,  isTopThree: false, sentiment: "positive" }),
  ],
  summaryText: "Synthetic test pulse summary text.",
  quotes:      ["Quote one.", "Quote two.", "Quote three."],
  actionIdeas: ["Action one.", "Action two.", "Action three."],
  createdAt:   "2026-05-24T08:00:00.000Z",
  ...overrides,
});

const approvalFixture = (overrides: Partial<ApprovalItem> = {}): ApprovalItem => ({
  id:                    "appr-test-1",
  bookingCode:           "NL-X7K2",
  investorNameRedacted:  "[REDACTED]",
  topic:                 "kyc",
  proposedSlot:          "2026-05-27T10:30:00.000Z",
  advisorEmail:          "priya@groww.in",
  emailDraft:            "Dear Investor, ...",
  marketContextSnippet:  "Top theme: KYC friction.",
  status:                "pending_review",
  createdAt:             "2026-05-24T09:15:00.000Z",
  ...overrides,
});

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

/* ════════════════════════════════════════════════════════════════
   SUITE 1 — ThemeBlock
   ════════════════════════════════════════════════════════════════ */
describe("ThemeBlock", () => {
  it("renders the theme name", () => {
    render(<ThemeBlock theme={themeFixture()} />);
    expect(screen.getByText("KYC Re-verification Friction")).toBeInTheDocument();
  });

  it("renders the review count badge with REVIEWS suffix", () => {
    render(<ThemeBlock theme={themeFixture({ reviewCount: 142 })} />);
    expect(screen.getByTestId("theme-review-badge")).toHaveTextContent("142 REVIEWS");
  });

  it("applies top-three glow attribute when isTopThree=true", () => {
    render(<ThemeBlock theme={themeFixture({ isTopThree: true })} />);
    expect(screen.getByTestId("theme-block")).toHaveAttribute("data-top-three", "true");
  });

  it("applies non-top-three attribute when isTopThree=false", () => {
    render(<ThemeBlock theme={themeFixture({ isTopThree: false })} />);
    expect(screen.getByTestId("theme-block")).toHaveAttribute("data-top-three", "false");
  });

  it("fires onClick with theme name", () => {
    const handler = vi.fn();
    render(<ThemeBlock theme={themeFixture({ name: "Theme X" })} onClick={handler} />);
    fireEvent.click(screen.getByTestId("theme-block"));
    expect(handler).toHaveBeenCalledWith("Theme X");
  });

  it("renders sentiment glyph for negative theme", () => {
    const { container } = render(<ThemeBlock theme={themeFixture({ sentiment: "negative" })} />);
    expect(container.textContent).toContain("▼");
  });

  it("renders sentiment glyph for positive theme", () => {
    const { container } = render(<ThemeBlock theme={themeFixture({ sentiment: "positive" })} />);
    expect(container.textContent).toContain("▲");
  });

  it("renders sentiment glyph for neutral theme", () => {
    const { container } = render(<ThemeBlock theme={themeFixture({ sentiment: "neutral" })} />);
    expect(container.textContent).toContain("■");
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 2 — MarketContextBlock
   ════════════════════════════════════════════════════════════════ */
describe("MarketContextBlock", () => {
  it("renders the label", () => {
    render(<MarketContextBlock snippet="Test snippet." />);
    expect(screen.getByText("MARKET CONTEXT")).toBeInTheDocument();
  });

  it("renders the snippet text when provided", () => {
    render(<MarketContextBlock snippet="Top theme: KYC friction." />);
    expect(screen.getByText("Top theme: KYC friction.")).toBeInTheDocument();
  });

  it("renders empty-state copy when snippet is missing", () => {
    render(<MarketContextBlock />);
    expect(
      screen.getByText(/Market context unavailable/i),
    ).toBeInTheDocument();
  });

  it("renders empty-state copy when snippet is blank string", () => {
    render(<MarketContextBlock snippet="   " />);
    expect(
      screen.getByText(/Market context unavailable/i),
    ).toBeInTheDocument();
  });

  it("sets data-empty=true when no snippet", () => {
    render(<MarketContextBlock />);
    expect(screen.getByTestId("market-context-block")).toHaveAttribute("data-empty", "true");
  });

  it("supports custom label", () => {
    render(<MarketContextBlock snippet="X" label="OPERATOR NOTE" />);
    expect(screen.getByText("OPERATOR NOTE")).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 3 — CsvUploader
   ════════════════════════════════════════════════════════════════ */
describe("CsvUploader", () => {
  it("renders default state", () => {
    render(<CsvUploader />);
    expect(screen.getByTestId("csv-uploader")).toHaveAttribute("data-state", "default");
    expect(screen.getByText(/Drop CSV file here/i)).toBeInTheDocument();
  });

  it("clicking zone triggers hidden file input", () => {
    render(<CsvUploader />);
    const input = screen.getByTestId("csv-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");
    fireEvent.click(screen.getByTestId("csv-uploader"));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("rejects non-CSV files", () => {
    const onAccept = vi.fn();
    render(<CsvUploader onFileAccepted={onAccept} />);
    const input = screen.getByTestId("csv-input") as HTMLInputElement;
    const fakeFile = new File(["x"], "image.png", { type: "image/png" });
    Object.defineProperty(input, "files", { value: [fakeFile] });
    fireEvent.change(input);
    expect(screen.getByRole("alert")).toHaveTextContent(/Only .csv files/i);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("rejects files over maxBytes", () => {
    render(<CsvUploader maxBytes={100} />);
    const input = screen.getByTestId("csv-input") as HTMLInputElement;
    const big = new File(["a".repeat(500)], "huge.csv", { type: "text/csv" });
    Object.defineProperty(input, "files", { value: [big] });
    fireEvent.change(input);
    expect(screen.getByRole("alert")).toHaveTextContent(/exceeds/i);
  });

  it("transitions through uploading → complete with simulateProgress", async () => {
    const onAccept = vi.fn();
    render(<CsvUploader onFileAccepted={onAccept} simulateProgress />);
    const input = screen.getByTestId("csv-input") as HTMLInputElement;
    const csv = new File(["a,b\n1,2"], "reviews.csv", { type: "text/csv" });
    Object.defineProperty(input, "files", { value: [csv] });
    fireEvent.change(input);

    expect(screen.getByTestId("csv-uploader")).toHaveAttribute("data-state", "uploading");

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

    expect(screen.getByTestId("csv-uploader")).toHaveAttribute("data-state", "complete");
    expect(onAccept).toHaveBeenCalledWith(csv);
  });

  it("completes immediately when simulateProgress=false", () => {
    const onAccept = vi.fn();
    render(<CsvUploader onFileAccepted={onAccept} simulateProgress={false} />);
    const input = screen.getByTestId("csv-input") as HTMLInputElement;
    const csv = new File(["a"], "x.csv", { type: "text/csv" });
    Object.defineProperty(input, "files", { value: [csv] });
    fireEvent.change(input);
    expect(screen.getByTestId("csv-uploader")).toHaveAttribute("data-state", "complete");
  });

  it("reset button returns to default state", async () => {
    render(<CsvUploader simulateProgress={false} />);
    const input = screen.getByTestId("csv-input") as HTMLInputElement;
    const csv = new File(["a"], "x.csv", { type: "text/csv" });
    Object.defineProperty(input, "files", { value: [csv] });
    fireEvent.change(input);
    fireEvent.click(screen.getByTestId("csv-reset"));
    expect(screen.getByTestId("csv-uploader")).toHaveAttribute("data-state", "default");
  });

  it("dragover transitions to hover state", () => {
    render(<CsvUploader />);
    const zone = screen.getByTestId("csv-uploader");
    fireEvent.dragOver(zone);
    expect(zone).toHaveAttribute("data-state", "hover");
  });

  it("dragleave returns to default from hover", () => {
    render(<CsvUploader />);
    const zone = screen.getByTestId("csv-uploader");
    fireEvent.dragOver(zone);
    fireEvent.dragLeave(zone);
    expect(zone).toHaveAttribute("data-state", "default");
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 4 — PulseBriefing
   ════════════════════════════════════════════════════════════════ */
describe("PulseBriefing", () => {
  it("renders empty state when pulse is null and not generating", () => {
    render(<PulseBriefing pulse={null} />);
    expect(screen.getByTestId("pulse-briefing")).toHaveAttribute("data-state", "empty");
    expect(screen.getByTestId("pulse-empty-state")).toBeInTheDocument();
  });

  it("renders loading state when isGenerating", () => {
    render(<PulseBriefing pulse={null} isGenerating />);
    expect(screen.getByTestId("pulse-briefing")).toHaveAttribute("data-state", "loading");
    expect(screen.getByTestId("pulse-loading-state")).toBeInTheDocument();
    expect(screen.getByText(/ANALYZING REVIEWS/i)).toBeInTheDocument();
  });

  it("renders loaded state with summary, themes, quotes, actions", () => {
    render(<PulseBriefing pulse={pulseFixture()} />);
    expect(screen.getByTestId("pulse-loaded-state")).toBeInTheDocument();
    expect(screen.getByTestId("pulse-summary")).toHaveTextContent("Synthetic test pulse summary");
    expect(screen.getAllByTestId("theme-block")).toHaveLength(5);
    expect(screen.getAllByTestId("pulse-quote")).toHaveLength(3);
    expect(screen.getAllByTestId("pulse-action")).toHaveLength(3);
  });

  it("displays word count in correct format", () => {
    render(<PulseBriefing pulse={pulseFixture({ wordCount: 238 })} />);
    expect(screen.getByTestId("pulse-word-count")).toHaveTextContent("Words: 238/250");
  });

  it("flags word count as over when > 250", () => {
    render(<PulseBriefing pulse={pulseFixture({ wordCount: 280 })} />);
    expect(screen.getByTestId("pulse-word-count")).toHaveAttribute("data-over", "true");
  });

  it("flags word count as not-over when <= 250", () => {
    render(<PulseBriefing pulse={pulseFixture({ wordCount: 250 })} />);
    expect(screen.getByTestId("pulse-word-count")).toHaveAttribute("data-over", "false");
  });

  it("renders week start and review count in header when loaded", () => {
    const { container } = render(<PulseBriefing pulse={pulseFixture({ weekStart: "2026-05-19", reviewCount: 411 })} />);
    expect(container.textContent).toContain("2026-05-19");
    expect(container.textContent).toContain("411 reviews");
  });

  it("fires onGenerate when generate button clicked (empty state)", () => {
    const onGen = vi.fn();
    render(<PulseBriefing pulse={null} onGenerate={onGen} />);
    fireEvent.click(screen.getByTestId("pulse-generate-button"));
    expect(onGen).toHaveBeenCalled();
  });

  it("fires onActionToggle when an action checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(<PulseBriefing pulse={pulseFixture()} onActionToggle={onToggle} checkedActions={[false, false, false]} />);
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);
    expect(onToggle).toHaveBeenCalledWith(1, true);
  });

  it("sorts themes with top-three first", () => {
    const out = themeFixture({ name: "Bottom", isTopThree: false, reviewCount: 100 });
    const top = themeFixture({ name: "Top",    isTopThree: true,  reviewCount: 50  });
    render(<PulseBriefing pulse={pulseFixture({ themes: [out, top] })} />);
    const blocks = screen.getAllByTestId("theme-block");
    expect(blocks[0].textContent).toContain("Top");
    expect(blocks[1].textContent).toContain("Bottom");
  });

  it("fires onThemeSelect when a theme block is clicked", () => {
    const onTheme = vi.fn();
    render(<PulseBriefing pulse={pulseFixture()} onThemeSelect={onTheme} />);
    fireEvent.click(screen.getAllByTestId("theme-block")[0]);
    expect(onTheme).toHaveBeenCalled();
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 5 — ActionGate
   ════════════════════════════════════════════════════════════════ */
describe("ActionGate", () => {
  it("renders authorize and override buttons", () => {
    render(<ActionGate />);
    expect(screen.getByTestId("action-authorize")).toBeInTheDocument();
    expect(screen.getByTestId("action-override")).toBeInTheDocument();
  });

  it("displays default labels", () => {
    render(<ActionGate />);
    expect(screen.getByTestId("action-authorize")).toHaveTextContent("AUTHORIZE");
    expect(screen.getByTestId("action-override")).toHaveTextContent("OVERRIDE");
  });

  it("fires onAuthorize on click", () => {
    const handler = vi.fn();
    render(<ActionGate onAuthorize={handler} />);
    fireEvent.click(screen.getByTestId("action-authorize"));
    expect(handler).toHaveBeenCalled();
  });

  it("requires two clicks on override to confirm", () => {
    const handler = vi.fn();
    render(<ActionGate onOverride={handler} />);
    fireEvent.click(screen.getByTestId("action-override"));
    expect(handler).not.toHaveBeenCalled();
    expect(screen.getByTestId("action-override")).toHaveTextContent("CONFIRM?");
    fireEvent.click(screen.getByTestId("action-override"));
    expect(handler).toHaveBeenCalled();
  });

  it("shows confirmation hint after first override click", () => {
    render(<ActionGate />);
    fireEvent.click(screen.getByTestId("action-override"));
    expect(screen.getByTestId("override-confirm-hint")).toBeInTheDocument();
  });

  it("auto-resets override confirm state after 4 seconds", async () => {
    render(<ActionGate />);
    fireEvent.click(screen.getByTestId("action-override"));
    expect(screen.getByTestId("action-override")).toHaveTextContent("CONFIRM?");
    await act(async () => { await vi.advanceTimersByTimeAsync(4100); });
    expect(screen.getByTestId("action-override")).toHaveTextContent("OVERRIDE");
  });

  it("disabled state prevents onAuthorize", () => {
    const handler = vi.fn();
    render(<ActionGate onAuthorize={handler} disabled />);
    fireEvent.click(screen.getByTestId("action-authorize"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("disabled state prevents onOverride", () => {
    const handler = vi.fn();
    render(<ActionGate onOverride={handler} disabled />);
    fireEvent.click(screen.getByTestId("action-override"));
    fireEvent.click(screen.getByTestId("action-override"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("supports custom labels", () => {
    render(<ActionGate authorizeLabel="APPROVE" overrideLabel="REJECT" />);
    expect(screen.getByTestId("action-authorize")).toHaveTextContent("APPROVE");
    expect(screen.getByTestId("action-override")).toHaveTextContent("REJECT");
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 6 — ApprovalCard
   ════════════════════════════════════════════════════════════════ */
describe("ApprovalCard", () => {
  it("renders the booking code prominently", () => {
    render(<ApprovalCard item={approvalFixture()} />);
    expect(screen.getByTestId("approval-booking-code")).toHaveTextContent("NL-X7K2");
  });

  it("renders the formatted calendar slot", () => {
    render(<ApprovalCard item={approvalFixture({ proposedSlot: "2026-05-27T10:30:00.000Z" })} />);
    const text = screen.getByTestId("approval-slot").textContent ?? "";
    expect(text).toMatch(/2026-05-27/);
    expect(text).toMatch(/(AM|PM)/);
  });

  it("renders the topic badge in uppercase", () => {
    render(<ApprovalCard item={approvalFixture({ topic: "sip" })} />);
    expect(screen.getByTestId("approval-topic-badge")).toHaveTextContent("sip");
  });

  it("renders the email draft inside the editable area", () => {
    render(<ApprovalCard item={approvalFixture({ emailDraft: "Hello Investor" })} />);
    expect(screen.getByTestId("approval-email-draft")).toHaveTextContent("Hello Investor");
  });

  it("email draft is editable when status is pending", () => {
    render(<ApprovalCard item={approvalFixture()} />);
    expect(screen.getByTestId("approval-email-draft")).toHaveAttribute("contenteditable", "true");
  });

  it("email draft is NOT editable when status is authorized", () => {
    render(<ApprovalCard item={approvalFixture({ status: "authorized" })} />);
    expect(screen.getByTestId("approval-email-draft")).toHaveAttribute("contenteditable", "false");
  });

  it("shows MarketContextBlock with snippet from item", () => {
    render(<ApprovalCard item={approvalFixture({ marketContextSnippet: "Custom snippet" })} />);
    expect(screen.getByText("Custom snippet")).toBeInTheDocument();
  });

  it("shows status badge as PENDING for pending_review", () => {
    render(<ApprovalCard item={approvalFixture({ status: "pending_review" })} />);
    expect(screen.getByTestId("approval-status-badge")).toHaveTextContent("PENDING");
  });

  it("shows status badge as AUTHORIZED for authorized", () => {
    render(<ApprovalCard item={approvalFixture({ status: "authorized" })} />);
    expect(screen.getByTestId("approval-status-badge")).toHaveTextContent("AUTHORIZED");
  });

  it("shows status badge as REJECTED for rejected", () => {
    render(<ApprovalCard item={approvalFixture({ status: "rejected" })} />);
    expect(screen.getByTestId("approval-status-badge")).toHaveTextContent("REJECTED");
  });

  it("fires onAuthorize with id when Authorize clicked", () => {
    const handler = vi.fn();
    render(<ApprovalCard item={approvalFixture({ id: "appr-9" })} onAuthorize={handler} />);
    fireEvent.click(screen.getByTestId("action-authorize"));
    expect(handler).toHaveBeenCalledWith("appr-9", expect.any(String));
  });

  it("fires onOverride after two override clicks", () => {
    const handler = vi.fn();
    render(<ApprovalCard item={approvalFixture({ id: "appr-9" })} onOverride={handler} />);
    fireEvent.click(screen.getByTestId("action-override"));
    fireEvent.click(screen.getByTestId("action-override"));
    expect(handler).toHaveBeenCalledWith("appr-9");
  });

  it("hides ActionGate when status is authorized", () => {
    render(<ApprovalCard item={approvalFixture({ status: "authorized" })} />);
    expect(screen.queryByTestId("action-gate")).toBeNull();
    expect(screen.getByTestId("approval-locked-state")).toBeInTheDocument();
  });

  it("hides ActionGate when status is rejected", () => {
    render(<ApprovalCard item={approvalFixture({ status: "rejected" })} />);
    expect(screen.queryByTestId("action-gate")).toBeNull();
    expect(screen.getByTestId("approval-locked-state")).toHaveTextContent(/OVERRODE/i);
  });

  it("sets data-status attribute", () => {
    render(<ApprovalCard item={approvalFixture({ status: "pending_review" })} />);
    expect(screen.getByTestId("approval-card")).toHaveAttribute("data-status", "pending_review");
  });

  it("renders the redacted investor name", () => {
    render(<ApprovalCard item={approvalFixture()} />);
    expect(screen.getAllByText(/REDACTED/)[0]).toBeInTheDocument();
  });

  it("renders the advisor email", () => {
    render(<ApprovalCard item={approvalFixture({ advisorEmail: "test@groww.in" })} />);
    expect(screen.getByText(/test@groww.in/)).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 7 — HitlQueue
   ════════════════════════════════════════════════════════════════ */
describe("HitlQueue", () => {
  it("renders the header", () => {
    render(<HitlQueue items={[]} />);
    expect(screen.getByText(/PENDING AUTHORIZATIONS/i)).toBeInTheDocument();
  });

  it("shows empty state when no items", () => {
    render(<HitlQueue items={[]} />);
    expect(screen.getByTestId("hitl-empty-state")).toBeInTheDocument();
    expect(screen.getByText(/No pending approvals/i)).toBeInTheDocument();
  });

  it("renders approval cards when items exist", () => {
    const items = [
      approvalFixture({ id: "a", bookingCode: "NL-AAAA" }),
      approvalFixture({ id: "b", bookingCode: "NL-BBBB" }),
    ];
    render(<HitlQueue items={items} />);
    expect(screen.getAllByTestId("approval-card")).toHaveLength(2);
  });

  it("count badge reflects pending count", () => {
    const items = [
      approvalFixture({ id: "a", status: "pending_review" }),
      approvalFixture({ id: "b", status: "pending_review" }),
      approvalFixture({ id: "c", status: "authorized" }),
    ];
    render(<HitlQueue items={items} />);
    expect(screen.getByTestId("hitl-count-badge")).toHaveTextContent("2 PENDING");
  });

  it("count badge shows 0 when no pending items", () => {
    const items = [approvalFixture({ id: "a", status: "authorized" })];
    render(<HitlQueue items={items} />);
    expect(screen.getByTestId("hitl-count-badge")).toHaveTextContent("0 PENDING");
  });

  it("sorts items newest-first by createdAt", () => {
    const older = approvalFixture({ id: "old", bookingCode: "NL-OLD1", createdAt: "2026-05-20T09:00:00.000Z" });
    const newer = approvalFixture({ id: "new", bookingCode: "NL-NEW1", createdAt: "2026-05-24T09:00:00.000Z" });
    render(<HitlQueue items={[older, newer]} />);
    const cards = screen.getAllByTestId("approval-card");
    expect(cards[0]).toHaveAttribute("data-booking-code", "NL-NEW1");
    expect(cards[1]).toHaveAttribute("data-booking-code", "NL-OLD1");
  });

  it("forwards onAuthorize from card", () => {
    const handler = vi.fn();
    render(<HitlQueue items={[approvalFixture({ id: "x" })]} onAuthorize={handler} />);
    fireEvent.click(screen.getByTestId("action-authorize"));
    expect(handler).toHaveBeenCalledWith("x", expect.any(String));
  });

  it("filters to pending only when pendingOnly=true", () => {
    const items = [
      approvalFixture({ id: "p", status: "pending_review" }),
      approvalFixture({ id: "a", status: "authorized" }),
      approvalFixture({ id: "r", status: "rejected" }),
    ];
    render(<HitlQueue items={items} pendingOnly />);
    expect(screen.getAllByTestId("approval-card")).toHaveLength(1);
  });

  it("data-pending-count attribute reflects pending items", () => {
    const items = [
      approvalFixture({ id: "p1", status: "pending_review" }),
      approvalFixture({ id: "p2", status: "draft" }),
      approvalFixture({ id: "a",  status: "authorized" }),
    ];
    render(<HitlQueue items={items} />);
    expect(screen.getByTestId("hitl-queue")).toHaveAttribute("data-pending-count", "2");
  });

  it("renders role=list on queue container", () => {
    render(<HitlQueue items={[]} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 8 — Accessibility
   ════════════════════════════════════════════════════════════════ */
describe("Accessibility", () => {
  it("PulseBriefing has aria-label", () => {
    render(<PulseBriefing pulse={null} />);
    expect(screen.getByLabelText("Weekly Pulse Briefing")).toBeInTheDocument();
  });

  it("HitlQueue has aria-label", () => {
    render(<HitlQueue items={[]} />);
    expect(screen.getByLabelText("HITL Approval Center")).toBeInTheDocument();
  });

  it("ApprovalCard has role=listitem", () => {
    render(<ApprovalCard item={approvalFixture()} />);
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it("Email draft has accessible label", () => {
    render(<ApprovalCard item={approvalFixture()} />);
    expect(screen.getByLabelText("Editable email draft")).toBeInTheDocument();
  });

  it("CsvUploader has region role and label", () => {
    render(<CsvUploader />);
    expect(screen.getByRole("region", { name: /CSV file upload zone/i })).toBeInTheDocument();
  });

  it("Action checkboxes have descriptive aria-labels", () => {
    render(<PulseBriefing pulse={pulseFixture()} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0].getAttribute("aria-label")).toMatch(/Action 1/);
  });

  it("Override confirm hint is announced as alert", () => {
    render(<ActionGate />);
    fireEvent.click(screen.getByTestId("action-override"));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════
   SUITE 9 — Type Contract & Spec Compliance
   ════════════════════════════════════════════════════════════════ */
describe("Spec Compliance", () => {
  it("PulseBriefing always renders exactly 3 quotes from spec", () => {
    render(<PulseBriefing pulse={pulseFixture()} />);
    expect(screen.getAllByTestId("pulse-quote")).toHaveLength(3);
  });

  it("PulseBriefing always renders exactly 3 action ideas from spec", () => {
    render(<PulseBriefing pulse={pulseFixture()} />);
    expect(screen.getAllByTestId("pulse-action")).toHaveLength(3);
  });

  it("PulseBriefing renders max 5 themes from spec", () => {
    render(<PulseBriefing pulse={pulseFixture()} />);
    expect(screen.getAllByTestId("theme-block")).toHaveLength(5);
  });

  it("Booking codes match NL-XXXX format", () => {
    render(<ApprovalCard item={approvalFixture({ bookingCode: "NL-X7K2" })} />);
    expect(screen.getByTestId("approval-booking-code").textContent).toMatch(/^NL-[A-Z0-9]{4}$/);
  });

  it("Top-three themes get visual distinction (data attribute)", () => {
    const themes = [
      themeFixture({ name: "TT", isTopThree: true }),
      themeFixture({ name: "BB", isTopThree: false }),
    ];
    render(<PulseBriefing pulse={pulseFixture({ themes })} />);
    const blocks = screen.getAllByTestId("theme-block");
    const tops    = blocks.filter((b) => b.getAttribute("data-top-three") === "true");
    const others  = blocks.filter((b) => b.getAttribute("data-top-three") === "false");
    expect(tops.length).toBeGreaterThan(0);
    expect(others.length).toBeGreaterThan(0);
  });
});
