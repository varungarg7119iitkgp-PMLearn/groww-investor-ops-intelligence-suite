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

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PulseBriefing,
  HitlQueue,
  OpsHeader,
  OpsFilterBar,
  OpsSidebar,
  CategoryMixBar,
  SentimentTrend,
  FeeExplainerCard,
} from "@/components/director-ops";
import type { ApprovalItem, WeeklyPulse, PulseTheme } from "@/types";
import type {
  OpsPlatformFilter,
  OpsTimeFilter,
  OpsSection,
  SentimentPoint,
} from "@/components/director-ops";
import type { ReviewCategoryStat } from "@/lib/data";
import { useUIStore } from "@/lib/store";

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
  ], // exactly 3 — Req 6
  createdAt: "2026-05-24T08:00:00.000Z",
};

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
  /* Zustand selectors — preserved across mode switches (Phase 14). */
  const storePulse           = useUIStore((s) => s.pulseData);
  const setPulseData         = useUIStore((s) => s.setPulseData);
  const isStoreGenerating    = useUIStore((s) => s.isPulseGenerating);
  const setIsPulseGenerating = useUIStore((s) => s.setIsPulseGenerating);
  const storeItems           = useUIStore((s) => s.hitlItems);
  const setHitlItems         = useUIStore((s) => s.setHitlItems);
  const setTopTheme          = useUIStore((s) => s.setTopTheme);
  const setMarketContext     = useUIStore((s) => s.setMarketContext);
  const updateHitlStatus     = useUIStore((s) => s.updateHitlStatus);

  /* Locally-derived UI state. */
  const [checkedActions,  setCheckedActions]= useState<boolean[]>([false, false, false]);
  const [platform,        setPlatform]      = useState<OpsPlatformFilter>("ALL");
  const [timeRange,       setTimeRange]     = useState<OpsTimeFilter>("LAST_30");
  const [activeSection,   setActiveSection] = useState<OpsSection>("PULSE");
  const [isSyncing,       setIsSyncing]     = useState(false);
  const [lastSync,        setLastSync]      = useState<string>(new Date().toISOString());
  const [genError,        setGenError]      = useState<string | null>(null);
  const [uploadStats,     setUploadStats]   = useState<{ inserted: number; piiHits: number; totalRows: number } | null>(null);
  const [categories,      setCategories]    = useState<ReviewCategoryStat[]>([]);
  const [sentimentReviews,setSentimentReviews] = useState<SentimentPoint[]>([]);
  const [reviewTotal,     setReviewTotal]    = useState(0);
  const [dataLoaded,      setDataLoaded]     = useState(false);
  const [usingLiveData,   setUsingLiveData]  = useState(false);

  /* Pulse hydration: prefer live Supabase data; mock only when API fails. */
  const pulse        = storePulse ?? null;
  const isGenerating = isStoreGenerating;
  const items        = storeItems;

  /* Fetch live review stats when filters change */
  const fetchReviewStats = useCallback(async (plat: OpsPlatformFilter, range: OpsTimeFilter) => {
    try {
      const qs = new URLSearchParams({ platform: plat, timeRange: range });
      const r = await fetch(`/api/reviews/stats?${qs}`, { cache: "no-store" });
      if (!r.ok) return;
      const json = await r.json();
      const stats = json?.stats;
      if (!stats) return;
      setCategories(stats.categories ?? []);
      setSentimentReviews(stats.sentimentTrend ?? []);
      setReviewTotal(stats.totalReviews ?? 0);
      setUsingLiveData(true);
    } catch {
      /* keep previous stats */
    }
  }, []);

  /* First-mount: hydrate pulse + HITL + review stats; auto-sync stores once */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pulseRes, approvalsRes, statusRes] = await Promise.all([
          fetch("/api/pulse/latest", { cache: "no-store" }),
          fetch("/api/approvals", { cache: "no-store" }),
          fetch("/api/reviews/sync-status", { cache: "no-store" }),
        ]);
        if (cancelled) return;

        if (pulseRes.ok) {
          const json = await pulseRes.json();
          const live: WeeklyPulse | null = json?.pulse ?? null;
          if (live) {
            setPulseData(live);
            const top = live.themes?.[0];
            if (top?.name) setTopTheme(top.name);
            setMarketContext(live.summaryText.slice(0, 240));
            setUsingLiveData(true);
          } else if (!storePulse) {
            setPulseData(MOCK_PULSE);
            setTopTheme(MOCK_PULSE.themes[0]?.name ?? "");
            setMarketContext(MOCK_PULSE.summaryText.slice(0, 240));
          }
        } else if (!storePulse) {
          setPulseData(MOCK_PULSE);
          setTopTheme(MOCK_PULSE.themes[0]?.name ?? "");
        }

        if (approvalsRes.ok) {
          const aJson = await approvalsRes.json();
          setHitlItems((aJson?.items ?? []) as ApprovalItem[]);
        }

        if (statusRes.ok) {
          const status = await statusRes.json();
          const ts = status.lastAndroidSync ?? status.lastIOSSync;
          if (ts) setLastSync(ts);
          /* If DB is empty or stale, pull fresh store reviews on first load */
          if ((status.totalReviews ?? 0) < 50) {
            await fetch("/api/reviews/sync", {
              method:  "POST",
              headers: { "content-type": "application/json" },
              body:    JSON.stringify({ syncAll: true, count: 200 }),
            });
            await fetchReviewStats(platform, timeRange);
          }
        }
      } catch {
        if (!cancelled && !storePulse) {
          setPulseData(MOCK_PULSE);
          setTopTheme(MOCK_PULSE.themes[0]?.name ?? "");
        }
      } finally {
        if (!cancelled) setDataLoaded(true);
      }
    })();
    void fetchReviewStats(platform, timeRange);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void fetchReviewStats(platform, timeRange);
  }, [platform, timeRange, fetchReviewStats]);

  const handleGenerate = useCallback(async () => {
    setIsPulseGenerating(true);
    setGenError(null);
    try {
      const r = await fetch("/api/pulse/generate", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({}),
      });
      const json = await r.json();
      if (!r.ok) {
        setGenError(json?.error ?? `Pulse generation failed (${r.status})`);
        return;
      }
      const generated: WeeklyPulse = json.pulse;
      setPulseData(generated);
      const top = generated.themes?.[0];
      if (top?.name) setTopTheme(top.name);
      setMarketContext(generated.summaryText.slice(0, 240));
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPulseGenerating(false);
    }
  }, [setIsPulseGenerating, setPulseData, setTopTheme, setMarketContext]);

  const handleUploadCSV = useCallback(async (file: File) => {
    setUploadStats(null);
    setGenError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/reviews/upload", { method: "POST", body: fd });
      const json = await r.json();
      if (!r.ok) {
        setGenError(json?.error ?? `Upload failed (${r.status})`);
        return;
      }
      setUploadStats({
        inserted:  json.inserted ?? 0,
        piiHits:   json.piiHits ?? 0,
        totalRows: json.totalRows ?? 0,
      });
      /* Auto-trigger pulse generation after ingest. */
      await handleGenerate();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    }
  }, [handleGenerate]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setGenError(null);
    try {
      /* 1. Fetch fresh reviews from Play Store + App Store (PM-Pulsator pipeline) */
      const syncRes = await fetch("/api/reviews/sync", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ syncAll: true, count: 200 }),
      });
      const syncJson = await syncRes.json().catch(() => ({}));
      if (!syncRes.ok) {
        setGenError(syncJson?.error ?? `Store sync failed (${syncRes.status})`);
      } else {
        const android = syncJson?.results?.android;
        const ios = syncJson?.results?.ios;
        const inserted =
          (android?.reviewsInserted ?? 0) + (ios?.reviewsInserted ?? 0);
        if (inserted > 0) {
          setUploadStats(null);
        }
      }

      /* 2. Refresh pulse, approvals, and dashboard stats from Supabase */
      await Promise.all([
        fetch("/api/pulse/latest", { cache: "no-store" }).then(async (r) => {
          if (r.ok) {
            const json = await r.json();
            if (json?.pulse) {
              setPulseData(json.pulse as WeeklyPulse);
              setUsingLiveData(true);
            }
          }
        }),
        fetch("/api/approvals", { cache: "no-store" }).then(async (r) => {
          if (r.ok) {
            const json = await r.json();
            setHitlItems((json?.items ?? []) as ApprovalItem[]);
          }
        }),
        fetchReviewStats(platform, timeRange),
      ]);

      const statusRes = await fetch("/api/reviews/sync-status", { cache: "no-store" });
      if (statusRes.ok) {
        const status = await statusRes.json();
        const ts = status.lastAndroidSync ?? status.lastIOSSync;
        setLastSync(ts ?? new Date().toISOString());
      } else {
        setLastSync(new Date().toISOString());
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [fetchReviewStats, platform, timeRange, setPulseData, setHitlItems]);

  const handleResetFilters = useCallback(() => {
    setPlatform("ALL");
    setTimeRange("LAST_30");
  }, []);

  /* Mutators — write to Zustand so Phase 14 cross-pillar can read */
  const updateItems = useCallback(
    (mutator: (prev: ApprovalItem[]) => ApprovalItem[]) => {
      setHitlItems(mutator(storeItems));
    },
    [storeItems, setHitlItems],
  );

  const handleAuthorize = useCallback(async (id: string, updatedEmail?: string) => {
    const item = items.find((i) => i.id === id);
    updateHitlStatus(id, "authorized");
    if (item) {
      updateItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, emailDraft: updatedEmail ?? i.emailDraft }
            : i,
        ),
      );
    }
    try {
      const r = await fetch("/api/approvals/authorize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, emailDraft: updatedEmail }),
      });
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        if (json.calendarFailed) {
          setGenError("Calendar event failed — authorize saved but calendar needs retry.");
        } else {
          setGenError(json.error ?? `Authorize failed (${r.status})`);
          updateItems((prev) => prev.map((i) => i.id === id ? { ...i, status: "pending_review" } : i));
        }
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Authorize request failed");
      updateItems((prev) => prev.map((i) => i.id === id ? { ...i, status: "pending_review" } : i));
    }
  }, [items, updateItems, updateHitlStatus]);

  const handleOverride = useCallback(async (id: string, reason?: string) => {
    const overrideReason = reason ?? window.prompt("Override reason (optional):") ?? "Operator override";
    updateHitlStatus(id, "rejected", overrideReason);
    try {
      const r = await fetch("/api/approvals/override", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, reason: overrideReason }),
      });
      if (!r.ok) {
        const json = await r.json().catch(() => ({}));
        setGenError(json.error ?? `Override failed (${r.status})`);
        updateItems((prev) => prev.map((i) => i.id === id ? { ...i, status: "pending_review" } : i));
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Override request failed");
      updateItems((prev) => prev.map((i) => i.id === id ? { ...i, status: "pending_review" } : i));
    }
  }, [updateItems, updateHitlStatus]);

  const handleEmailEdit = useCallback((id: string, newDraft: string) => {
    updateItems((prev) => prev.map((i) => (i.id === id ? { ...i, emailDraft: newDraft } : i)));
  }, [updateItems]);

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

  const displayCategories = categories.length > 0 ? categories : MOCK_CATEGORIES;
  const displaySentimentReviews = sentimentReviews.length > 0 ? sentimentReviews : MOCK_SENTIMENT_REVIEWS;
  const displayPulse = pulse ?? (dataLoaded ? null : MOCK_PULSE);
  const categoryTotal = displayCategories.reduce((s, c) => s + c.count, 0) || reviewTotal || 411;

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
              pulse={displayPulse}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
              onUploadCSV={handleUploadCSV}
              onActionToggle={handleActionToggle}
              checkedActions={checkedActions}
            />
            {(genError || uploadStats) && (
              <div
                data-testid="pulse-status-banner"
                role={genError ? "alert" : "status"}
                style={{
                  marginTop:    "10px",
                  padding:      "8px 12px",
                  fontFamily:   "var(--font-hud)",
                  fontSize:     "11px",
                  letterSpacing: "0.05em",
                  borderRadius: "8px",
                  background:   genError ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)",
                  border:       genError ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(16, 185, 129, 0.45)",
                  color:        genError ? "var(--color-error, #ef4444)" : "var(--color-success, #10b981)",
                }}
              >
                {genError
                  ? `Error: ${genError}`
                  : uploadStats
                  ? `Ingested ${uploadStats.inserted} of ${uploadStats.totalRows} reviews (${uploadStats.piiHits} PII matches scrubbed).`
                  : ""}
              </div>
            )}
          </SectionAnchor>

          <SectionAnchor id="section-fee-explainer" label="FEE EXPLAINER">
            <FeeExplainerCard />
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
            <CategoryMixBar categories={displayCategories} total={categoryTotal} maxRows={8} />
            {usingLiveData && (
              <p
                style={{
                  marginTop:    "8px",
                  fontFamily:   "var(--font-hud)",
                  fontSize:     "10px",
                  color:        "var(--color-success)",
                  letterSpacing: "0.08em",
                }}
              >
                LIVE · {reviewTotal.toLocaleString()} reviews from Play Store + App Store (Supabase)
              </p>
            )}
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
                points={displaySentimentReviews}
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
            PHASE 14 · CROSS-PILLAR INTEGRATION LIVE · HITL + STATE SYNC ACTIVE
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
