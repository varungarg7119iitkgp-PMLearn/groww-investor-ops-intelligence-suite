/**
 * DirectorOpsConsole — Phase 6 (Mode Switcher & Global Navigation)
 *
 * Extracted from the old `/app/director-ops/page.tsx` so the root
 * entry point can render either this OR `InvestorTerminal` via the
 * ModeTransition wrapper driven by Zustand `activeMode`.
 *
 * Spec compliance:
 *   - UI/UX §6: full Director Ops layout (header, sidebar, filter
 *     bar, Pulse, HITL, Categories, dual Sentiment trends).
 *   - Req 1 acc-criteria #5: this is the *only* surface visible when
 *     `activeMode === "director-ops"`.
 *
 * State preservation (Req 1.6): pulse/items/checkedActions are
 * held locally for now; HITL items and pulse metadata will be hoisted
 * to the Zustand store in Phase 7 once Supabase is wired in.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import {
  PulseBriefing,
  HitlQueue,
  OpsHeader,
  OpsFilterBar,
  OpsSidebar,
  CategoryMixBar,
  SentimentTrend,
} from "@/components/director-ops";
import type { ApprovalItem, WeeklyPulse, PulseTheme } from "@/types";
import type {
  OpsPlatformFilter,
  OpsTimeFilter,
  OpsSection,
  SentimentPoint,
} from "@/components/director-ops";

/* ════════════════════════════════════════════════════════════════
   MOCK DATA — anchored to M2 PM Pulsator review patterns
   ════════════════════════════════════════════════════════════════ */

const MOCK_THEMES: PulseTheme[] = [
  { name: "KYC Re-verification Friction",      reviewCount: 142, isTopThree: true,  sentiment: "negative" },
  { name: "SIP Auto-debit Failure Rate",        reviewCount: 118, isTopThree: true,  sentiment: "negative" },
  { name: "Capital-Gains Statement Confusion",  reviewCount: 87,  isTopThree: true,  sentiment: "neutral"  },
  { name: "Fund-of-Funds Tax Clarity",          reviewCount: 41,  isTopThree: false, sentiment: "neutral"  },
  { name: "Smooth Onboarding Praise",           reviewCount: 23,  isTopThree: false, sentiment: "positive" },
];

const MOCK_PULSE: WeeklyPulse = {
  id:          "pulse-2026-w21",
  weekStart:   "2026-05-19",
  reviewCount: 411,
  wordCount:   238,
  status:      "draft",
  themes:      MOCK_THEMES,
  summaryText:
    "This week's 411 reviews surface a sharp uptick in KYC re-verification friction following the SEBI " +
    "May-2026 circular, with 142 mentions citing repeated document re-uploads. SIP auto-debit failures " +
    "remain the second-largest theme (118 mentions), concentrated around HDFC and SBI mandates after a " +
    "NPCI flow change. Capital-gains statement confusion (87 mentions) is largely composed of users " +
    "asking why FY26 statements bundle dividend and growth-plan transactions differently — the recent " +
    "Finance Bill 2026 amendment is the proximate cause. Sentiment skew remains net-negative (-0.42), " +
    "though onboarding praise has grown 18% W-o-W, suggesting the new investor-flow A/B test is " +
    "converting. Recommended posture: prioritize the KYC re-verification UX in the next sprint, " +
    "publish an in-app FAQ on the FY26 statement format, and surface a status banner for the next " +
    "scheduled mandate failure window.",
  quotes: [
    "Asked to upload my PAN three times in one week. KYC team says system flagged me. No further explanation.",
    "My SIP got skipped on May 15 and again on May 30. Got the failure SMS but no fix path inside the app.",
    "The capital-gains PDF for FY26 looks completely different from last year. I cannot tell what is dividend vs growth.",
  ],
  actionIdeas: [
    "Ship a guided KYC re-verification flow with explicit reason codes; eliminate blind re-uploads.",
    "Publish a Finance Bill 2026 statement-format explainer card; pin to the Investments tab.",
    "Trigger proactive in-app banner 48h before known mandate-failure windows on partner banks.",
  ],
  createdAt: "2026-05-24T08:00:00.000Z",
};

const MOCK_APPROVALS: ApprovalItem[] = [
  {
    id:                    "appr-1",
    bookingCode:           "NL-X7K2",
    investorNameRedacted:  "[REDACTED]",
    topic:                 "kyc",
    proposedSlot:          "2026-05-27T10:30:00.000Z",
    advisorEmail:          "priya.advisor@groww.in",
    emailDraft:
      "Dear Investor,\n\n" +
      "Thank you for reaching out regarding KYC re-verification. I have scheduled a 30-minute consultation " +
      "for 27 May 2026 at 10:30 AM IST.\n\n" +
      "During our call we will:\n" +
      "  • Review the exact reason your KYC was flagged\n" +
      "  • Walk through the corrective document set\n" +
      "  • Resolve the re-verification in-session if possible\n\n" +
      "Booking reference: NL-X7K2\n\n" +
      "Best regards,\nPriya | Advisor Desk",
    marketContextSnippet:
      "Top theme this week: KYC Re-verification Friction (142 mentions). " +
      "Likely root cause: SEBI May-2026 circular on enhanced due diligence.",
    status:                "pending_review",
    createdAt:             "2026-05-24T09:15:00.000Z",
  },
  {
    id:                    "appr-2",
    bookingCode:           "NL-M4Q9",
    investorNameRedacted:  "[REDACTED]",
    topic:                 "sip",
    proposedSlot:          "2026-05-26T15:00:00.000Z",
    advisorEmail:          "rahul.advisor@groww.in",
    emailDraft:
      "Hi,\n\n" +
      "Thanks for raising the SIP auto-debit issue. I've blocked 15:00 IST on 26 May 2026 for a call.\n\n" +
      "Please keep handy:\n" +
      "  • Your latest mandate ID\n" +
      "  • Bank statement showing the failed debit\n\n" +
      "Booking reference: NL-M4Q9\n\n" +
      "Regards,\nRahul",
    marketContextSnippet:
      "SIP Auto-debit Failure Rate is the 2nd-largest weekly theme (118 mentions), " +
      "concentrated around HDFC/SBI mandates following a recent NPCI flow change.",
    status:                "pending_review",
    createdAt:             "2026-05-24T10:42:00.000Z",
  },
  {
    id:                    "appr-3",
    bookingCode:           "NL-T8B1",
    investorNameRedacted:  "[REDACTED]",
    topic:                 "statements",
    proposedSlot:          "2026-05-28T11:00:00.000Z",
    advisorEmail:          "anjali.advisor@groww.in",
    emailDraft:
      "Hello,\n\n" +
      "Confirming our consultation on 28 May 2026 at 11:00 AM IST to walk through your FY26 capital-gains statement.\n\n" +
      "We will cover:\n" +
      "  • New statement format introduced post Finance Bill 2026\n" +
      "  • Dividend vs growth plan separation\n" +
      "  • LTCG/STCG calculation methodology\n\n" +
      "Booking reference: NL-T8B1\n\n" +
      "Warm regards,\nAnjali",
    marketContextSnippet:
      "Capital-Gains Statement Confusion is the 3rd-largest theme (87 mentions). " +
      "Driver: Finance Bill 2026 statement format change.",
    status:                "pending_review",
    createdAt:             "2026-05-24T11:08:00.000Z",
  },
];

const MOCK_CATEGORIES = [
  { name: "KYC & Verification",      count: 142 },
  { name: "Payments & SIP",          count: 118 },
  { name: "Statements & Reports",     count: 87  },
  { name: "Onboarding",               count: 64  },
  { name: "Withdrawals",              count: 52  },
  { name: "Mutual Fund Switch",       count: 41  },
  { name: "Tax & Capital Gains",      count: 33  },
  { name: "Customer Support",         count: 28  },
];

const MOCK_SENTIMENT_REVIEWS: SentimentPoint[] = [
  { label: "May 18", positive: 12, neutral: 28, negative: 41 },
  { label: "May 19", positive: 18, neutral: 26, negative: 48 },
  { label: "May 20", positive: 15, neutral: 30, negative: 52 },
  { label: "May 21", positive: 22, neutral: 24, negative: 44 },
  { label: "May 22", positive: 26, neutral: 28, negative: 39 },
  { label: "May 23", positive: 31, neutral: 27, negative: 36 },
  { label: "May 24", positive: 35, neutral: 25, negative: 32 },
];

const MOCK_SENTIMENT_CHAT: SentimentPoint[] = [
  { label: "May 18", positive: 64, neutral: 92, negative: 18 },
  { label: "May 19", positive: 72, neutral: 88, negative: 22 },
  { label: "May 20", positive: 81, neutral: 86, negative: 27 },
  { label: "May 21", positive: 78, neutral: 90, negative: 19 },
  { label: "May 22", positive: 86, neutral: 84, negative: 21 },
  { label: "May 23", positive: 92, neutral: 81, negative: 16 },
  { label: "May 24", positive: 98, neutral: 79, negative: 14 },
];

/* ─────────────────────────────────────────────────────────────── */

export function DirectorOpsConsole() {
  const [pulse,           setPulse]         = useState<WeeklyPulse | null>(MOCK_PULSE);
  const [isGenerating,    setIsGenerating]  = useState(false);
  const [items,           setItems]         = useState<ApprovalItem[]>(MOCK_APPROVALS);
  const [checkedActions,  setCheckedActions]= useState<boolean[]>([false, false, false]);
  const [platform,        setPlatform]      = useState<OpsPlatformFilter>("ALL");
  const [timeRange,       setTimeRange]     = useState<OpsTimeFilter>("LAST_7");
  const [activeSection,   setActiveSection] = useState<OpsSection>("PULSE");
  const [isSyncing,       setIsSyncing]     = useState(false);
  const [lastSync,        setLastSync]      = useState<string>("2026-05-24T11:30:00.000Z");

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setPulse(null);
    window.setTimeout(() => {
      setPulse(MOCK_PULSE);
      setIsGenerating(false);
    }, 1800);
  }, []);

  const handleSync = useCallback(() => {
    setIsSyncing(true);
    window.setTimeout(() => {
      setIsSyncing(false);
      setLastSync(new Date().toISOString());
    }, 1500);
  }, []);

  const handleResetFilters = useCallback(() => {
    setPlatform("ALL");
    setTimeRange("LAST_7");
  }, []);

  const handleAuthorize = useCallback((id: string, updatedEmail?: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: "authorized", authorizedAt: new Date().toISOString(), emailDraft: updatedEmail ?? i.emailDraft }
          : i,
      ),
    );
  }, []);

  const handleOverride = useCallback((id: string, reason?: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: "rejected", overrideReason: reason ?? "Operator override" } : i,
      ),
    );
  }, []);

  const handleEmailEdit = useCallback((id: string, newDraft: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, emailDraft: newDraft } : i)));
  }, []);

  const handleActionToggle = useCallback((idx: number, checked: boolean) => {
    setCheckedActions((prev) => {
      const next = [...prev];
      next[idx] = checked;
      return next;
    });
  }, []);

  const handleSectionSelect = useCallback((section: OpsSection) => {
    setActiveSection(section);
    const el = document.getElementById(`section-${section.toLowerCase()}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "pending_review").length,
    [items],
  );

  return (
    <div
      data-testid="director-ops-root"
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         10,
        overflowY:      "auto",
        display:        "flex",
        flexDirection:  "column",
      }}
    >
      <OpsHeader
        pendingCount={pendingCount}
        totalCount={items.length}
        lastSyncIso={lastSync}
        isSyncing={isSyncing}
        onSync={handleSync}
      />

      <div
        style={{
          display:        "grid",
          gridTemplateColumns: "220px minmax(0, 1fr)",
          gap:            "20px",
          padding:        "20px 24px 60px",
          maxWidth:       "1600px",
          width:          "100%",
          margin:         "0 auto",
          alignItems:     "flex-start",
        }}
      >
        <OpsSidebar active={activeSection} onSelect={handleSectionSelect} />

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>
          <OpsFilterBar
            platform={platform}
            timeRange={timeRange}
            onPlatformChange={setPlatform}
            onTimeRangeChange={setTimeRange}
            onReset={handleResetFilters}
          />

          <SectionAnchor id="section-pulse" label="WEEKLY PULSE ASSESSMENT">
            <PulseBriefing
              pulse={pulse}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
              onActionToggle={handleActionToggle}
              checkedActions={checkedActions}
            />
          </SectionAnchor>

          <SectionAnchor id="section-approvals" label="HITL APPROVAL CENTRE">
            <HitlQueue
              items={items}
              onAuthorize={handleAuthorize}
              onOverride={handleOverride}
              onEmailEdit={handleEmailEdit}
            />
          </SectionAnchor>

          <SectionAnchor id="section-categories" label="CATEGORY MIX">
            <CategoryMixBar categories={MOCK_CATEGORIES} total={411} maxRows={8} />
          </SectionAnchor>

          <SectionAnchor id="section-sentiment" label="SENTIMENT ANALYSIS — REVIEWS + CHAT">
            <div
              style={{
                display:        "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap:            "20px",
              }}
            >
              <SentimentTrend
                points={MOCK_SENTIMENT_REVIEWS}
                source="reviews"
                height={110}
                testId="sentiment-trend-reviews"
              />
              <SentimentTrend
                points={MOCK_SENTIMENT_CHAT}
                source="chat"
                height={110}
                testId="sentiment-trend-chat"
              />
            </div>
          </SectionAnchor>

          <footer
            style={{
              fontFamily:    "var(--font-hud)",
              fontSize:      "10px",
              color:         "var(--text-disabled)",
              letterSpacing: "0.18em",
              textAlign:     "center",
              padding:       "12px 0 24px",
            }}
          >
            PHASE 6 SHELL · MODE SWITCHER WIRED · BACKEND → PHASE 7+
          </footer>
        </div>
      </div>
    </div>
  );
}

function SectionAnchor({
  id,
  label,
  children,
}: {
  id:       string;
  label:    string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} data-section-anchor={id} aria-label={label}>
      <div
        style={{
          fontFamily:    "var(--font-hud)",
          fontSize:      "9px",
          color:         "var(--text-disabled)",
          letterSpacing: "0.3em",
          padding:       "0 0 4px 4px",
        }}
      >
        § {label}
      </div>
      {children}
    </section>
  );
}
