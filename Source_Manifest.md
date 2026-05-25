# Source Manifest — Investor Ops & Intelligence Suite

> **Requirement 17 (Phase 16)** — comprehensive list of every data source, public
> URL, framework, library, and external API the capstone consumes or cites.
>
> This document is **self-contained** — it duplicates and supersedes the
> `## Source Manifest` section of [`README.md`](./README.md). If you need to
> verify a citation, find an AMC URL, or understand the daily refresh
> pipeline, **you only need this file**.

| Field | Value |
| ----- | ----- |
| **Last refreshed** | 2026-05-25 (after Phase 17 — Groww scrape pipeline) |
| **Total numbered entries** | 145 |
| **Stored in** | this file · `funds.source_urls` · `funds.groww_url` · `fund_chunks.source_urls` · `fee_scenarios.source_urls` |
| **Refreshed by** | [`.github/workflows/daily-nav-refresh.yml`](./.github/workflows/daily-nav-refresh.yml) → [`scripts/refresh-funds-from-groww.ts`](./scripts/refresh-funds-from-groww.ts) |

---

## Pillar map

| Pillar | Modules | Primary sources used |
| ------ | ------- | -------------------- |
| **A — Smart-Sync KB** | `/api/chat`, TF-IDF RAG retriever, Fee Explainer | 20 Groww fund pages · 20 AMC factsheets · 5 fee scenarios · SEBI / AMFI / Income Tax circulars |
| **B — Theme-aware voice** | `/api/voice/*`, Weekly Pulse | `weekly_pulses` (Supabase) · 12 Groww help articles · ElevenLabs STT/TTS · Gemini |
| **C — HITL MCP workflow** | Approval queue, Calendar tool | Google Calendar API · Gmail SMTP · pulse market-context · Groww policy pages |

**Eval gate (Phase 15 formal run):** RAG **0.84** ✅ · Safety **5/5** ✅ · UX **3/3** ✅ · Cross-Pillar **10/10** ✅. See [`evals-report.md`](./evals-report.md) and [`Evals_Report.md`](./Evals_Report.md).

---

## A. Capstone deliverables

| # | Resource | URL |
| - | -------- | --- |
| 1 | Capstone repository | https://github.com/varungarg7119iitkgp-PMLearn/groww-investor-ops-intelligence-suite |
| 2 | Deployed app (Vercel) | https://groww-investor-ops-intelligence-sui.vercel.app |
| 3 | Architecture spec | [`Phase0_Planning/Capstone_architecture.md`](./Phase0_Planning/Capstone_architecture.md) |
| 4 | Requirements spec | [`Phase0_Planning/Capstone_requirements.md`](./Phase0_Planning/Capstone_requirements.md) |
| 5 | UI/UX spec | [`Phase0_Planning/Capstone_ui-ux-requirements.md`](./Phase0_Planning/Capstone_ui-ux-requirements.md) |
| 6 | Evals report (living) | [`Evals_Report.md`](./Evals_Report.md) |
| 7 | Final eval report (Phase 15) | [`evals-report.md`](./evals-report.md) |
| 8 | Demo video script | [`DEMO_VIDEO_SCRIPT.md`](./DEMO_VIDEO_SCRIPT.md) |
| 9 | Full audit report | [`FULL_AUDIT_REPORT.md`](./FULL_AUDIT_REPORT.md) |

---

## B. Prior milestone lineage (M1 · M2 · M3)

| # | Milestone | Repository | Live demo |
| - | --------- | ---------- | --------- |
| 10 | M1 — RAG Mutual Fund FAQ | https://github.com/varungarg7119iitkgp-PMLearn/mutual-fund-rag-chatbot | https://mutual-fund-rag-chatbot-psi.vercel.app/ |
| 11 | M2 — Weekly Pulse / Fee Explainer | https://github.com/varungarg7119iitkgp-PMLearn/Groww-Support-PM-Pulsator | https://groww-support-pm-pulsator.vercel.app/ |
| 12 | M3 — Voice Agent Concierge | https://github.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge | https://voice-agent-concierge.vercel.app/ |

The reference scrape → chunk → store pipeline used in this suite was ported from M1.

---

## C. Pillar A — 20-fund RAG universe

Each fund is chunked into five RAG sections (`overview`, `performance`,
`fees_loads`, `risk`, `news`) — **100 chunks total** in `fund_chunks` —
with a Groww URL as the canonical scrape source and an AMC factsheet as
backup citation. Universe: **5 Commodity · 5 Debt · 5 Hybrid · 5 Equity.**

> NAVs and chunks are refreshed daily by
> [`scripts/refresh-funds-from-groww.ts`](./scripts/refresh-funds-from-groww.ts)
> running on GitHub Actions (see §K).

### C.1 — Groww canonical pages (primary scrape source)

| # | Fund ID | Category | ISIN | Groww URL |
| - | ------- | -------- | ---- | --------- |
| 13 | `hdfc-silv` | commodity | INF179KC1DU7 | https://groww.in/mutual-funds/hdfc-silver-etf-fof-direct-growth |
| 14 | `axis-silv` | commodity | INF846K015J4 | https://groww.in/mutual-funds/axis-silver-fof-direct-growth |
| 15 | `icici-silv` | commodity | INF109KC1Y98 | https://groww.in/mutual-funds/icici-prudential-silver-etf-fof-direct-growth |
| 16 | `nip-silv` | commodity | INF204KC1378 | https://groww.in/mutual-funds/nippon-india-silver-etf-fof-direct-growth |
| 17 | `absl-silv` | commodity | INF209KB16F2 | https://groww.in/mutual-funds/aditya-birla-sun-life-silver-etf-fof-direct-growth |
| 18 | `dsp-cr` | debt | INF740K01OS4 | https://groww.in/mutual-funds/dsp-credit-risk-fund-direct-plan-growth |
| 19 | `hsbc-cr` | debt | INF917K01UH8 | https://groww.in/mutual-funds/hsbc-credit-risk-fund-direct-growth |
| 20 | `absl-cr` | debt | INF209KA1K88 | https://groww.in/mutual-funds/birla-sun-life-corporate-bond-fund-direct-growth |
| 21 | `absl-med` | debt | INF209K01XA9 | https://groww.in/mutual-funds/aditya-birla-sun-life-medium-term-plan-direct-growth |
| 22 | `sbi-med` | debt | INF200K01VB0 | https://groww.in/mutual-funds/sbi-medium-duration-fund-direct-growth |
| 23 | `hdfc-arb` | hybrid | INF179KA1SC5 | https://groww.in/mutual-funds/hdfc-i-come-plus-arbitrage-active-fof-direct-growth |
| 24 | `hdfc-hyb` | hybrid | INF179K01XZ1 | https://groww.in/mutual-funds/hdfc-premier-multi-cap-fund-direct-growth |
| 25 | `icici-ret` | hybrid | INF109KC1TW4 | https://groww.in/mutual-funds/icici-prudential-retirement-fund-hybrid-aggressive-plan-direct-growth |
| 26 | `nip-multi` | hybrid | INF204KB19V4 | https://groww.in/mutual-funds/nippon-india-multi-asset-allocation-fund-direct-growth |
| 27 | `sbi-child` | hybrid | INF200KA1R07 | https://groww.in/mutual-funds/sbi-children's-fund-investment-plan-direct-growth |
| 28 | `mot-bse` | equity | INF247L01BF2 | https://groww.in/mutual-funds/motilal-oswal-bse-enhanced-value-index-fund-direct-growth |
| 29 | `sbi-psu` | equity | INF200K01UY4 | https://groww.in/mutual-funds/sbi-psu-fund-direct-growth |
| 30 | `inv-psu` | equity | INF205K01NG5 | https://groww.in/mutual-funds/invesco-india-psu-equity-fund-direct-growth |
| 31 | `absl-psu` | equity | INF209KB1O82 | https://groww.in/mutual-funds/aditya-birla-sun-life-psu-equity-fund-direct-growth |
| 32 | `icici-psu` | equity | INF109KC12I5 | https://groww.in/mutual-funds/icici-prudential-psu-equity-fund-direct-growth |

**Scrape technique:** `fetch()` the Groww page → parse the embedded
`<script id="__NEXT_DATA__">` → read `props.pageProps.mfServerSideData`.
NAV, returns, expense ratio, exit load, holdings, riskometer and news
items are all server-rendered into that JSON blob — no Playwright /
JavaScript runtime required.

### C.2 — AMC factsheet pages (backup citations & disclosure trail)

| # | Fund ID | AMC factsheet URL |
| - | ------- | ----------------- |
| 33 | `hdfc-silv` | https://www.hdfcfund.com/our-products/exchange-traded-funds/hdfc-silver-etf-fof |
| 34 | `axis-silv` | https://www.axismf.com/silver-fof |
| 35 | `icici-silv` | https://www.icicipruamc.com/silver-etf-fof |
| 36 | `nip-silv` | https://mf.nipponindiaim.com/our-funds/silver-etf-fund-of-fund |
| 37 | `absl-silv` | https://mutualfund.adityabirlacapital.com/aditya-birla-sun-life-silver-etf-fof |
| 38 | `dsp-cr` | https://www.dspim.com/funds/credit-risk-fund |
| 39 | `hsbc-cr` | https://www.assetmanagement.hsbc.co.in/hsbc-credit-risk-fund |
| 40 | `absl-cr` | https://mutualfund.adityabirlacapital.com/aditya-birla-sun-life-credit-risk-fund |
| 41 | `absl-med` | https://mutualfund.adityabirlacapital.com/aditya-birla-sun-life-medium-term-plan |
| 42 | `sbi-med` | https://www.sbimf.com/en/mutual-fund-schemes/income-funds/sbi-magnum-medium-duration-fund |
| 43 | `hdfc-arb` | https://www.hdfcfund.com/our-products/fund-of-funds/hdfc-income-plus-arbitrage-active-fof |
| 44 | `hdfc-hyb` | https://www.hdfcfund.com/our-products/hybrid-funds/hdfc-hybrid-equity-fund |
| 45 | `icici-ret` | https://www.icicipruamc.com/retirement-fund-hybrid-aggressive |
| 46 | `nip-multi` | https://mf.nipponindiaim.com/our-funds/multi-asset-fund |
| 47 | `sbi-child` | https://www.sbimf.com/en/mutual-fund-schemes/childrens-fund/sbi-magnum-childrens-benefit-fund |
| 48 | `mot-bse` | https://www.motilaloswalmf.com/bse-enhanced-value-index-fund |
| 49 | `sbi-psu` | https://www.sbimf.com/en/mutual-fund-schemes/equity-funds/sbi-psu-fund |
| 50 | `inv-psu` | https://www.invescomutualfund.com/psu-equity-fund |
| 51 | `absl-psu` | https://mutualfund.adityabirlacapital.com/aditya-birla-sun-life-psu-equity-fund |
| 52 | `icici-psu` | https://www.icicipruamc.com/psu-equity-fund |

### C.3 — AMC family landing pages

| # | AMC | URL |
| - | --- | --- |
| 53 | HDFC AMC | https://www.hdfcfund.com |
| 54 | ICICI Prudential AMC | https://www.icicipruamc.com |
| 55 | SBI Mutual Fund | https://www.sbimf.com |
| 56 | Axis Mutual Fund | https://www.axismf.com |
| 57 | Nippon India MF | https://mf.nipponindiaim.com |
| 58 | Aditya Birla Sun Life MF | https://mutualfund.adityabirlacapital.com |
| 59 | DSP Mutual Fund | https://www.dspim.com |
| 60 | HSBC Mutual Fund | https://www.assetmanagement.hsbc.co.in |
| 61 | Invesco Mutual Fund | https://in.invesco.com/product/invesco-india-mutual-fund |
| 62 | Motilal Oswal MF | https://www.motilaloswalmf.com |

**Retrieval config:** TF-IDF cosine similarity over `fund_chunks.content`
in Supabase, topK = 5, model `gemini-2.5-flash` (see Evals Report §9).

---

## D. Pillar A — Fee Explainer authoritative sources

Each scenario returns **≤ 6 bullets** and **exactly 2 source URLs**
(`src/tools/fee-explainer.ts`, `/api/fee-explainer`).

| # | Scenario | Source 1 | Source 2 |
| - | -------- | -------- | -------- |
| 63 | Expense ratio | https://www.sebi.gov.in/legal/regulations/sep-2024/securities-and-exchange-board-of-india-mutual-funds-regulations-1996-last-amended-on-september-26-2024-_87122.html | https://www.amfiindia.com/investor-corner/knowledge-center/types-of-mutual-fund-schemes.html |
| 64 | Exit load | https://www.amfiindia.com/investor-corner/knowledge-center/load-structure-mutual-fund.html | https://www.sebi.gov.in/sebi_data/attachdocs/jun-2024/exit_load_circulars.html |
| 65 | TCS (LRS) | https://www.incometax.gov.in/iec/foportal/help/tcs-on-lrs | https://taxguru.in/income-tax/tcs-on-foreign-remittance-under-lrs.html |
| 66 | Brokerage / transaction charges | https://www.amfiindia.com/investor-corner/knowledge-center/transaction-charges.html | https://www.sebi.gov.in/sebi_data/commondocs/jun-2024/distributor-commission-circular.pdf |
| 67 | Account maintenance (folio) | https://www.sebi.gov.in/sebi_data/attachdocs/oct-2024/bsda-revision-circular.pdf | https://www.amfiindia.com/investor-corner/knowledge-center/holding-mode.html |

---

## E. Pillar B — Voice preparation corpus (`src/tools/preparation-data.json`)

Used by the RAG retriever tool (`get_preparation_docs`) for topic taxonomy:
KYC · SIP · Statements · Withdrawals · Account changes.

| # | Topic | Title | Source URL |
| - | ----- | ----- | ---------- |
| 68 | KYC | Documents required | https://groww.in/p/mutual-funds-kyc |
| 69 | KYC | Re-KYC / CKYC status | https://groww.in/p/ckyc-re-kyc |
| 70 | SIP | Start a SIP | https://groww.in/p/start-sip |
| 71 | SIP | Pause / stop / modify | https://groww.in/p/manage-sip |
| 72 | SIP | First-installment timing | https://groww.in/p/sip-first-debit |
| 73 | Statements | Download CAS | https://groww.in/p/download-cas |
| 74 | Statements | Capital gains statement | https://groww.in/p/capital-gains-statement |
| 75 | Withdrawals | Redeem units | https://groww.in/p/redeem-units |
| 76 | Withdrawals | Exit load & tax | https://groww.in/p/mutual-fund-taxation |
| 77 | Account changes | Update email / mobile | https://groww.in/p/update-contact |
| 78 | Account changes | Update nominee | https://groww.in/p/update-nominee |
| 79 | Account changes | Bank account update | https://groww.in/p/update-bank |

---

## F. Groww platform — policy, help & pricing

| # | Source | URL |
| - | ------ | --- |
| 80 | Groww — mutual funds landing | https://groww.in/mutual-funds |
| 81 | Groww — help centre | https://groww.in/help/ |
| 82 | Groww — privacy policy | https://groww.in/privacy-policy |
| 83 | Groww — terms & conditions | https://groww.in/terms-and-conditions |
| 84 | Groww — pricing / charges | https://groww.in/pricing |

---

## G. India regulators, tax & market infrastructure

Facts-only context for compliance guardrails, fee education, and citation
fallbacks.

| # | Source | URL |
| - | ------ | --- |
| 85 | SEBI (main) | https://www.sebi.gov.in/ |
| 86 | SEBI — mutual funds dept | https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=0 |
| 87 | SEBI Investor Portal | https://investor.sebi.gov.in/ |
| 88 | SEBI Investor Knowledge Base | https://investor.sebi.gov.in/knowledge-base.html |
| 89 | SEBI Investor FAQ | https://investor.sebi.gov.in/faq/faq.html |
| 90 | SEBI Circulars | https://www.sebi.gov.in/legal/circulars.html |
| 91 | SEBI Regulations | https://www.sebi.gov.in/legal/regulations.html |
| 92 | AMFI (main) | https://www.amfiindia.com/ |
| 93 | AMFI — NAV history | https://www.amfiindia.com/nav-history |
| 94 | AMFI — Investor Education | https://www.amfiindia.com/investor-corner/investor-education |
| 95 | AMFI — Investor Handbook | https://www.amfiindia.com/investor-center/investor-handbook |
| 96 | AMFI — arrival/departure of funds | https://www.amfiindia.com/investor-corner/online-center/arrival-departure-of-funds |
| 97 | AMFI — intermediary certification | https://www.amfiindia.com/intermediary/students/certification.html |
| 98 | RBI (main) | https://www.rbi.org.in/ |
| 99 | RBI — notifications | https://www.rbi.org.in/commonperson/English/Scripts/rbi_notifications.aspx |
| 100 | Income Tax Portal | https://www.incometax.gov.in/iec/foportal/ |
| 101 | Income Tax — TCS on MF (LRS) | https://incometaxindia.gov.in |
| 102 | Income Tax — ELSS guide | https://www.incometax.gov.in/iec/foportal/help/how-to-save-tax/elss |
| 103 | NPCI | https://www.npci.org.in/ |
| 104 | NSE India | https://www.nseindia.com/ |
| 105 | NSE — about investors | https://www.nseindia.com/invest/content/about_us.htm |
| 106 | BSE India | https://www.bseindia.com/ |
| 107 | BSE — about investors | https://www.bseindia.com/investors/about/about_us.aspx |
| 108 | CCIL | https://www.ccilindia.com/ |

---

## H. Registrars & investor-services platforms

| # | Source | URL |
| - | ------ | --- |
| 109 | CAMS — investor education | https://www.camsonline.com/DistributorsServices/Education/Default.aspx |
| 110 | KFin Technologies — investor services | https://www.kfintech.com/investor-services/ |

---

## I. External APIs & cloud services (production runtime)

| # | Service | Documentation | Used in |
| - | ------- | ------------- | ------- |
| 111 | Google Gemini API | https://ai.google.dev/gemini-api/docs | Smart-Sync KB · Pulse generation · voice orchestration · function-calling |
| 112 | `@google/generative-ai` SDK | https://www.npmjs.com/package/@google/generative-ai | `src/lib/gemini.ts` (`gemini-2.5-flash`) |
| 113 | ElevenLabs TTS | https://api.elevenlabs.io/v1/text-to-speech | `src/app/api/voice/tts/route.ts` |
| 114 | ElevenLabs STT | https://api.elevenlabs.io/v1/speech-to-text | `src/app/api/voice/stt/route.ts` (fallback) |
| 115 | ElevenLabs docs | https://elevenlabs.io/docs | Voice agent (Pillar B) |
| 116 | Web Speech API (browser-native STT) | https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API | `src/hooks/useVoiceInteraction.ts` (primary, Chrome/Edge) |
| 117 | Google Calendar API v3 | https://developers.google.com/calendar/api/v3/reference | `src/tools/calendar.ts` (Pillar C) |
| 118 | Google APIs Node client | https://www.npmjs.com/package/googleapis | Service-account calendar holds |
| 119 | Supabase | https://supabase.com/docs | PostgreSQL — funds, fund_chunks, reviews, weekly_pulses, approval_queue, eval_results, shared_app_state |
| 120 | `@supabase/supabase-js` | https://www.npmjs.com/package/@supabase/supabase-js | `src/lib/supabase.ts`, `src/lib/data.ts` |
| 121 | Vercel deployment | https://vercel.com/docs | Serverless hosting + production env |
| 122 | Atlassian Jira REST API | https://developer.atlassian.com/cloud/jira/platform/rest/v3/ | Optional ticket creation in HITL flow |
| 123 | Atlassian Confluence REST API | https://developer.atlassian.com/cloud/confluence/rest/v1/ | Optional pulse archival |
| 124 | Gmail SMTP | https://developers.google.com/gmail/imap/imap-smtp | Advisor email-draft sender |

---

## J. Frameworks, libraries & tooling

| # | Package / tool | URL | Role |
| - | -------------- | --- | ---- |
| 125 | Next.js 15 (App Router) | https://nextjs.org/docs | SSR, API routes, dual-mode UI |
| 126 | React 19 | https://react.dev/ | Component layer |
| 127 | TypeScript | https://www.typescriptlang.org/docs/ | Type system (`src/types/index.ts`) |
| 128 | Tailwind CSS 4 | https://tailwindcss.com/docs | Stark-Glass HUD styling |
| 129 | Framer Motion | https://www.framer.com/motion/ | Orb states, scanning line, panel animations |
| 130 | Zustand | https://zustand.docs.pmnd.rs/ | Cross-pillar global state |
| 131 | Vitest | https://vitest.dev/ | Phase unit + eval tests |
| 132 | fast-check | https://fast-check.dev/ | Property-based tests (state machine, PII) |
| 133 | Lucide React icons | https://lucide.dev/ | Icon set |
| 134 | tsx (TypeScript runner) | https://www.npmjs.com/package/tsx | Eval scripts + refresh script (no transpile step) |

---

## K. Daily refresh pipeline (Phase 17)

After Phase 16 the project added a Phase-17 data-freshness layer that
mirrors the M1 reference architecture
([`mutual-fund-rag-chatbot`](https://github.com/varungarg7119iitkgp-PMLearn/mutual-fund-rag-chatbot))
but ports it from Python/Playwright to TypeScript/`fetch`.

| # | Component | Path | Notes |
| - | --------- | ---- | ----- |
| 135 | Scrape script | [`scripts/refresh-funds-from-groww.ts`](./scripts/refresh-funds-from-groww.ts) | Fetches each Groww URL, parses `__NEXT_DATA__`, builds 5 chunks/fund |
| 136 | GitHub Actions cron | [`.github/workflows/daily-nav-refresh.yml`](./.github/workflows/daily-nav-refresh.yml) | Runs Mon–Fri 19:30 IST + Tue–Sat 09:00 IST |
| 137 | Atomic chunk replace RPC | `public.replace_fund_chunks(fund_id, name, category, chunks_jsonb)` | `SECURITY DEFINER`, callable from anon client |
| 138 | NAV / source-url batch RPC | `public.refresh_fund_nav_batch(rows)` | Stores ISIN + Groww URL alongside NAV |
| 139 | Manual trigger | `npm run refresh:funds` (local) / `gh workflow run` (CI) | Same code path as cron |

**Run-time profile:** 20 funds scraped sequentially with 800 ms politeness
delay → ~22 s on a fast home connection, ~31 s on a GitHub Actions runner
including 5 chunks × 20 funds = 100 RPC calls plus the NAV batch update.

---

## L. Design & typography references

| # | Reference | URL |
| - | --------- | --- |
| 140 | Inter (Google Fonts) | https://fonts.google.com/specimen/Inter |
| 141 | Inter Tight (Google Fonts) | https://fonts.google.com/specimen/Inter+Tight |
| 142 | JetBrains Mono (Google Fonts) | https://fonts.google.com/specimen/JetBrains+Mono |
| 143 | Palantir Gotham (Director Ops aesthetic) | https://www.palantir.com/platforms/gotham/ |
| 144 | Natural Earth (map data ref) | https://www.naturalearthdata.com/ |
| 145 | Lucide icons (also referenced in J) | https://lucide.dev/ |

Design tokens live in `src/app/globals.css`; motion variants in
`src/lib/animations.ts`; the visual spec is
[`Phase0_Planning/Capstone_ui-ux-requirements.md`](./Phase0_Planning/Capstone_ui-ux-requirements.md).

---

## M. APIs used in production routes

| Route | External dependency |
| ----- | ------------------- |
| `/api/chat` | Gemini + Supabase (TF-IDF over `fund_chunks`) |
| `/api/pulse/generate` | Gemini + Supabase (`reviews`, `weekly_pulses`) |
| `/api/pulse/latest` | Supabase (`weekly_pulses`) |
| `/api/fee-explainer` | Gemini + Supabase (`fee_scenarios`) |
| `/api/voice/converse` | Gemini function calling + Google Calendar |
| `/api/voice/stt` | Web Speech API (primary) → ElevenLabs (fallback) |
| `/api/voice/tts` | ElevenLabs |
| `/api/approvals/*` | Supabase (`approval_queue`) + Google Calendar + Gmail SMTP |
| `/api/shared-state` | Supabase (`shared_app_state`) |
| `/api/reviews/upload` | Supabase (`reviews`, `review_categories`) |

---

## N. Eval reproducibility

Golden dataset, adversarial prompts, and UX rubric are defined in
[`Evals_Report.md`](./Evals_Report.md) and
[`Phase0_Planning/Capstone_architecture.md`](./Phase0_Planning/Capstone_architecture.md)
(AI Eval Gates).

| Artifact | Command / location |
| -------- | ------------------ |
| RAG eval (5 golden questions) | `npm run eval:rag` |
| Safety eval (3 adversarial + 2 edge) | `npm run eval:safety` |
| UX structure eval (pulse rubric) | `npm run eval:ux` |
| Cross-pillar eval | `npm run eval:cross-pillar` |
| Final formal eval (writes `evals-report.md`) | `npm run eval:final` |
| Eval results store | Supabase `public.eval_results` |
| LLM judge rubric | `src/lib/eval-utils.ts` |
| Compliance patterns | `src/lib/compliance.ts` |

**Latest formal scores (2026-05-25):** RAG aggregate **0.84** · Safety **5/5** · UX **3/3** · Cross-pillar **10/10** · Final gate **PASS**.

---

## Environment variables

The full set lives in [`.env.example`](./.env.example). Production values
are mirrored in **Vercel (production)** and as **GitHub Actions secrets**
where the daily refresh cron needs them. No service-role key is stored
anywhere — all writes go through `SECURITY DEFINER` RPCs.

| Variable | Vercel (prod) | GitHub Actions | Used in |
| -------- | :-: | :-: | ------- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | client + cron |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | client + cron |
| `GEMINI_API_KEY` | ✅ | — | server routes |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` | ✅ | — | voice routes |
| `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `TARGET_CALENDAR_ID` | ✅ | — | calendar tool |
| `JIRA_*` / `CONFLUENCE_*` | ✅ | — | optional ops integrations |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | ✅ | — | advisor email |

---

_Maintainer note: When you add a new external citation anywhere in the
codebase, append a row to the appropriate section above and bump the
**Total numbered entries** counter at the top of the file._
