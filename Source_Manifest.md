# Phase 16 — Source Manifest

**Requirement 17** — 30+ URLs of data sources, APIs, libraries, and references.  
**Last updated:** 2026-05-25 · **Total entries:** 90+

Full categorized tables also appear in [`README.md`](./README.md#source-manifest). This document satisfies the standalone **Source_Manifest** deliverable.

---

## Capstone & deployment

| # | Resource | URL |
|---|----------|-----|
| 1 | Capstone repository | https://github.com/varungarg7119iitkgp-PMLearn/groww-investor-ops-intelligence-suite |
| 2 | Deployed app (Vercel) | https://groww-investor-ops-intelligence-sui.vercel.app |
| 3 | Evals report (living) | [`Evals_Report.md`](./Evals_Report.md) |
| 4 | Final eval report (Phase 15) | [`evals-report.md`](./evals-report.md) |
| 5 | Architecture spec | [`Phase0_Planning/Capstone_architecture.md`](./Phase0_Planning/Capstone_architecture.md) |
| 6 | Requirements spec | [`Phase0_Planning/Capstone_requirements.md`](./Phase0_Planning/Capstone_requirements.md) |
| 7 | UI/UX spec | [`Phase0_Planning/Capstone_ui-ux-requirements.md`](./Phase0_Planning/Capstone_ui-ux-requirements.md) |

## Prior milestone lineage

| # | Resource | URL |
|---|----------|-----|
| 8 | M1 — RAG Mutual Fund FAQ (repo) | https://github.com/varungarg7119iitkgp-PMLearn/mutual-fund-rag-chatbot |
| 9 | M1 — deployed demo | https://mutual-fund-rag-chatbot-psi.vercel.app/ |
| 10 | M2 — Weekly Pulse / Fee Explainer (repo) | https://github.com/varungarg7119iitkgp-PMLearn/Groww-Support-PM-Pulsator |
| 11 | M2 — deployed demo | https://groww-support-pm-pulsator.vercel.app/ |
| 12 | M3 — Voice Concierge (repo) | https://github.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge |
| 13 | M3 — deployed demo | https://voice-agent-concierge.vercel.app/ |

## Frameworks & runtime

| # | Resource | URL |
|---|----------|-----|
| 14 | Next.js 15 | https://nextjs.org/docs |
| 15 | React 19 | https://react.dev |
| 16 | TypeScript | https://www.typescriptlang.org/docs/ |
| 17 | Tailwind CSS v4 | https://tailwindcss.com/docs |
| 18 | Framer Motion | https://www.framer.com/motion/ |
| 19 | Zustand | https://zustand.docs.pmnd.rs/ |
| 20 | Vitest | https://vitest.dev/ |
| 21 | Vercel platform | https://vercel.com/docs |
| 22 | Supabase | https://supabase.com/docs |
| 23 | Google Generative AI (Gemini) | https://ai.google.dev/gemini-api/docs |
| 24 | ElevenLabs API | https://elevenlabs.io/docs |
| 25 | Google Calendar API | https://developers.google.com/calendar |
| 26 | googleapis (Node) | https://github.com/googleapis/google-api-nodejs-client |
| 27 | Lucide React icons | https://lucide.dev/ |

## Regulatory & industry references

| # | Resource | URL |
|---|----------|-----|
| 28 | SEBI — mutual funds | https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=0 |
| 29 | AMFI — NAV / scheme data | https://www.amfiindia.com/nav-history |
| 30 | Income Tax — TCS on MF | https://incometaxindia.gov.in |
| 31 | RBI — payment systems | https://www.rbi.org.in |
| 32 | Groww — help centre | https://groww.in/help |
| 33 | Groww — mutual funds | https://groww.in/mutual-funds |
| 34 | Natural Earth (map data ref) | https://www.naturalearthdata.com/ |
| 35 | Palantir Gotham (design inspiration) | https://www.palantir.com/platforms/gotham/ |

## AMC factsheet sources (Pillar A — 20 funds)

| # | AMC / fund family | URL |
|---|-------------------|-----|
| 36 | HDFC AMC | https://www.hdfcfund.com |
| 37 | ICICI Prudential AMC | https://www.icicipruamc.com |
| 38 | SBI Mutual Fund | https://www.sbimf.com |
| 39 | Axis Mutual Fund | https://www.axismf.com |
| 40 | Nippon India MF | https://mf.nipponindiaim.com |
| 41 | Aditya Birla Sun Life MF | https://mutualfund.adityabirlacapital.com |
| 42 | DSP Mutual Fund | https://www.dspim.com |
| 43 | HSBC Mutual Fund | https://www.assetmanagement.hsbc.co.in |
| 44 | Invesco Mutual Fund | https://in.invesco.com/product/invesco-india-mutual-fund |
| 45 | Motilal Oswal MF | https://www.motilaloswalmf.com |

*(Additional scheme-level URLs and fee-scenario references are in README §Source Manifest sections B–K.)*

## APIs used in production routes

| Route | External dependency |
|-------|---------------------|
| `/api/chat` | Gemini + Supabase TF-IDF |
| `/api/pulse/generate` | Gemini |
| `/api/voice/converse` | Gemini function calling |
| `/api/voice/stt`, `/api/voice/tts` | ElevenLabs |
| `/api/approvals/*` | Supabase + Google Calendar |

---

_See [`README.md`](./README.md) for the complete 90+ entry manifest including all 20 fund factsheet URLs, fee scenarios, and Groww policy pages._
