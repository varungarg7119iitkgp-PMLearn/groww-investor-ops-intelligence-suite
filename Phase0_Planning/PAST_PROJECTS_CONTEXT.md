# Past Projects Context Document
## Capstone Foundation Reference — Groww Investor Ops & Intelligence Suite

> **Purpose:** Single reference document for the AI coding agent and developer to maintain deep, persistent knowledge of the three standalone projects that form the foundation layers of the capstone integration. Always consult this before building new features or making integration decisions.

---

## Table of Contents
1. [Project 1 — Mutual Fund RAG Chatbot](#1-mutual-fund-rag-chatbot)
2. [Project 2 — Groww Support PM Pulsator](#2-groww-support-pm-pulsator)
3. [Project 3 — Voice Agent Concierge](#3-voice-agent-concierge)
4. [Cross-Project Integration Map](#4-cross-project-integration-map)
5. [Shared Conventions & Reuse Rules](#5-shared-conventions--reuse-rules)

---

## 1. Mutual Fund RAG Chatbot

### Identity
| Field | Value |
|---|---|
| **Repo** | https://github.com/varungarg7119iitkgp-PMLearn/mutual-fund-rag-chatbot |
| **Live** | https://mutual-fund-rag-chatbot-psi.vercel.app/ |
| **Target Persona** | Retail Investors (User-Facing) |
| **Core Purpose** | Strictly constrained, facts-only RAG assistant over 20 specific Indian mutual funds |

### Stack
| Layer | Technology |
|---|---|
| **Frontend** | Next.js (App Router), Tailwind CSS, TypeScript |
| **Backend** | FastAPI + Python (deployed on Railway) |
| **AI** | Google Gemini 1.5 Flash / Pro |
| **Retrieval** | TF-IDF local index (numpy `.npy` matrix + vocab JSON + metadata JSON) |
| **Data Pipeline** | Playwright scraper → chunker → normalizer → TF-IDF indexer |
| **CI/CD** | GitHub Actions (`.github/workflows/refresh-data.yml`) for automated re-ingestion |

### Repository Layout
```
mutual-fund-rag-chatbot/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry
│   │   ├── core/config.py             # Settings (env vars)
│   │   ├── rag/
│   │   │   ├── router.py              # POST /chat endpoint — guardrails + RAG orchestration
│   │   │   ├── gemini_client.py       # Gemini API wrapper
│   │   │   ├── indexer.py             # TF-IDF retrieval (retrieve_top_k)
│   │   │   └── inspect_index.py       # Debug tool
│   │   └── analytics/
│   │       ├── tracker.py             # Query analytics tracker
│   │       └── router.py              # Analytics endpoints
│   ├── rag_index/
│   │   ├── metadata.json              # Chunk metadata (111KB, ~800+ chunks)
│   │   ├── tf_matrix.npy              # TF-IDF sparse matrix (305KB)
│   │   └── vocab.json                 # Vocabulary (11KB)
│   ├── requirements.txt
│   └── start.py
├── config/
│   └── fund_universe.csv              # 20 supported funds (name, AMFI code, AMC, etc.)
├── phase1_ingestion/
│   └── src/
│       ├── playwright_scraper.py      # Scrapes Groww/AMC fund pages
│       ├── html_parsers.py            # Extracts structured data from HTML
│       ├── models.py                  # Pydantic data models
│       └── config_loader.py           # Reads fund_universe.csv
├── phase2_processing/
│   └── src/
│       ├── chunker.py                 # Splits fund documents into fixed-size chunks
│       ├── loader.py                  # Loads raw JSON → processing pipeline
│       └── normalization.py           # Text normalization
├── phase3_llm_rag/                    # (doc only — indexer lives in backend/app/rag)
├── frontend/
│   ├── app/                           # Next.js App Router
│   ├── components/
│   │   ├── AppShell.tsx               # Layout container
│   │   ├── ChatPanel.tsx              # Main chat UI (message list + input)
│   │   ├── HeaderBar.tsx              # App header with fund selector
│   │   ├── SidebarNav.tsx             # Navigation sidebar
│   │   └── MarketPulsePanel.tsx       # Ticker / trending funds panel
│   └── package.json
└── scripts/refresh_pipeline.py        # Manual re-run of full pipeline
```

### Key Implementation Details

#### RAG Pipeline (`backend/app/rag/router.py`)
- **Endpoint:** `POST /chat` with body `{ question, fund_hint?, top_k (1–16, default 8) }`
- **Response:** `{ answer, used_chunks[], model }` — **source citations are always returned**
- **Retrieval:** `retrieve_top_k(question, fund_hint, top_k)` using TF-IDF cosine similarity
- **Generation:** Gemini receives retrieved chunks as context + strict system prompt

#### Guardrails (Non-Negotiable)
1. **No-Advice Guard** — Blocks any question matching ~20 "should I buy/sell/invest" phrases → returns refusal message
2. **PII Guard** — Regex-based detection of phone numbers, email patterns → strips or refuses
3. **Fund Scope Guard** — Only answers about the 20 pre-indexed funds
4. **Citation Enforcement** — Every answer includes `used_chunks` with `chunk_id`, `text`, `score`, `metadata`

#### TF-IDF Index Structure
- `metadata.json`: Array of chunk objects `{ chunk_id, fund_name, section, text, ... }`
- `tf_matrix.npy`: Sparse numpy matrix — rows = chunks, columns = vocabulary terms
- `vocab.json`: Term → column index mapping
- **20 funds covered** (HDFC, ICICI, SBI, Nippon, DSP, ABSЛ, Axis, Invesco, Motilal, Quant — Silver ETF FoF, PSU Equity, Credit Risk, Multi-Asset, Hybrid categories)

#### Fund Universe (20 Funds)
| AMC | Fund Types |
|---|---|
| HDFC | Hybrid Equity, Income Plus Arbitrage FoF, Silver ETF FoF |
| ICICI Pru | PSU Equity, Retirement Hybrid Aggressive, Silver ETF FoF |
| SBI | PSU Direct, Magnum Children's Benefit Investment |
| Aditya Birla SL | Credit Risk, Medium Term, PSU Equity, Silver ETF FoF |
| Nippon India | Silver ETF FoF, Multi Asset Allocation |
| DSP | Credit Risk |
| Axis | Silver FoF |
| Invesco | PSU Equity |
| Motilal Oswal | BSE Enhanced Value Index |
| Quant | Multi Asset Allocation |
| HSBC | Credit Risk |

#### Integration Asset for Capstone
- The **complete pre-built TF-IDF index** (`backend/rag_index/`) is the retrieval brain
- `retrieve_top_k()` and `generate_answer()` are the two functions to call for Pillar A
- The **20 chunks/fund** structure and citation format must be preserved in the unified product
- Guardrails (no-advice + PII) must be replicated in any new RAG endpoint

---

## 2. Groww Support PM Pulsator

### Identity
| Field | Value |
|---|---|
| **Repo** | https://github.com/varungarg7119iitkgp-PMLearn/Groww-Support-PM-Pulsator |
| **Live** | https://groww-support-pm-pulsator.vercel.app/ |
| **Target Persona** | Internal — Product Managers & Support teams |
| **Core Purpose** | AI-powered dashboard: ingest app reviews → categorize sentiment → automate ops (pulse, Jira, email) |

### Stack
| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 App Router, TypeScript, shadcn/ui, Recharts |
| **Database** | Supabase (PostgreSQL) |
| **AI** | Google Gemini 2.0 Flash / Pro |
| **Infra** | Vercel (frontend + API routes), Supabase (DB + auth) |

### Repository Layout
```
Groww-Support-PM-Pulsator/
├── src/
│   ├── app/
│   │   ├── page.tsx                           # Dashboard home
│   │   ├── analytics/page.tsx                 # Analytics view
│   │   ├── categories/page.tsx                # Category manager
│   │   ├── ideation/page.tsx                  # Feature ideation
│   │   ├── reporting/page.tsx                 # Weekly pulse reporting
│   │   ├── word-cloud/page.tsx                # Word cloud view
│   │   └── api/
│   │       ├── reviews/
│   │       │   ├── list/route.ts              # Paginated review list
│   │       │   ├── stats/route.ts             # Sentiment/rating stats
│   │       │   ├── sync/route.ts              # Manual sync trigger
│   │       │   └── sync-status/route.ts       # Sync progress
│   │       ├── ai/
│   │       │   ├── categorize/route.ts        # Trigger AI categorization
│   │       │   ├── recategorize/route.ts      # Re-run on "Others" items
│   │       │   ├── bug-report/route.ts        # AI Jira bug report draft
│   │       │   ├── ideas/route.ts             # AI feature idea extraction
│   │       │   ├── reply/route.ts             # AI reply generator
│   │       │   └── status/route.ts            # Categorization progress
│   │       ├── analytics/route.ts             # Aggregated analytics data
│   │       ├── categories/route.ts            # Category list
│   │       ├── testimonials/route.ts          # Top-rated testimonials
│   │       ├── reporting/
│   │       │   ├── generate/route.ts          # Weekly Pulse + Morning Brew
│   │       │   └── send-mail/route.ts         # Email dispatch
│   │       ├── integrations/
│   │       │   ├── jira/issue/route.ts        # Create Jira bug ticket
│   │       │   └── confluence/page/route.ts   # Create Confluence doc
│   │       ├── upload/csv/route.ts            # CSV review upload
│   │       └── cron/sync-reviews/route.ts     # CRON: automated sync
│   ├── components/
│   │   ├── reviews/                           # ReviewCard, filters, pagination, NPS gauge
│   │   ├── analytics/                         # Charts: sentiment, category, trend, metrics bar
│   │   ├── ideation/                          # BugReporter, IdeaRecommender, ReplyGeneratorModal
│   │   ├── reporting/                         # ReportingWorkflow (HITL approval flow)
│   │   ├── testimonials/                      # WordCloudView, TopUpvotedReviews, TopWordsList
│   │   ├── shared/                            # FilterBar, CategorizationBanner, SyncStatusBanner, CSVUploadModal
│   │   └── layout/                            # Header, DesktopNav, MobileNav, ContextBar
│   ├── lib/
│   │   ├── categorizer.ts                     # Batch AI categorization engine
│   │   ├── gemini.ts                          # Gemini API client (generateContent)
│   │   ├── pii-sanitizer.ts                   # PII detection + redaction
│   │   ├── scraper.ts                         # Review scraper
│   │   ├── supabase.ts                        # Browser Supabase client
│   │   ├── supabase-server.ts                 # Server-side admin Supabase client
│   │   └── sync-engine.ts                     # Review sync orchestration
│   ├── hooks/                                 # useReviews, useAnalytics, useCategorizationProgress, useSyncStatus
│   ├── context/filter-context.tsx             # Global filter state (platform, time period, date range)
│   ├── constants/
│   │   ├── groww.ts                           # GROWW_APP (android/ios bundle IDs, name)
│   │   └── navigation.ts                      # Nav links
│   └── types/index.ts                         # All TypeScript types
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql             # Full DB schema
│       └── 002_add_granular_categories.sql    # Additional category slugs
└── Phase_0_Groundwork/ through Phase_8_Reporting_MCP/  # Per-phase architecture docs
```

### Database Schema (Supabase PostgreSQL)

```sql
-- apps: registered mobile app identities
apps (id UUID PK, name, android_bundle_id, ios_bundle_id, last_android_sync, last_ios_sync, created_at)

-- reviews: scraped/uploaded app store reviews
reviews (
  id UUID PK, app_id FK→apps, platform_review_id, platform ('android'|'ios'),
  author_name, star_rating (1-5), review_text, sanitized_text,
  sentiment ('positive'|'negative'|'neutral'|'uncategorized'),
  device_info, app_version, os_version, upvote_count, review_date, ingested_at,
  UNIQUE(platform_review_id, platform)
)

-- categories: 20 named buckets
categories (id UUID PK, name, slug UNIQUE)
-- Seeded: Login Issues, KYC, Payments, App Crash, UI/UX, Performance,
--         Customer Support, Transaction Issues, Account Issues, Feature Request,
--         Security, Onboarding, Notifications, Others,
--         General Praise, Ease of Use, Investment & Trading,
--         Mutual Funds & SIP, Charges & Fees, Reliability

-- review_categories: M:M junction
review_categories (review_id FK, category_id FK, PRIMARY KEY(review_id, category_id))

-- ai_replies: generated store replies
ai_replies (id, review_id FK, tone ('empathetic'|'professional'|'gratitude'), reply_text, created_at)

-- weekly_pulses: HITL-controlled weekly reports
weekly_pulses (id, app_id FK, pulse_content TEXT, themes JSONB, quotes JSONB,
               action_ideas JSONB, status ('draft'|'approved'|'rejected'),
               generated_at, approved_at)

-- fee_explainers: HITL-controlled fee education content
fee_explainers (id, scenario, bullets JSONB, source_links JSONB,
                status ('draft'|'approved'|'rejected'), last_checked, generated_at)

-- sync_logs: audit trail for every sync run
sync_logs (id, app_id FK, platform, status ('running'|'success'|'failed'),
           reviews_fetched, error_message, retry_count, started_at, completed_at)
```

### Key Implementation Details

#### AI Categorization Engine (`src/lib/categorizer.ts`)
- **Batch size:** 25 reviews per Gemini call
- **Retries:** 3 attempts with delays [5s, 15s, 30s]; rate-limit errors get ≥30s delay
- **Inter-batch delay:** 5 seconds
- **Output per review:** `{ sentiment: 'positive'|'negative'|'neutral', categories: string[] (max 3) }`
- **Category validation:** Strict allowlist of 20 categories; invalid ones replaced with "Others"
- **Functions exported:** `categorizeUncategorizedReviews(limit)`, `recategorizeOthers(limit)`, `getCategorizationProgress()`

#### Weekly Pulse / Morning Brew (`src/app/api/reporting/generate/route.ts`)
- **Input:** `{ platform, timePeriod, dateFrom?, dateTo? }`
- **Process:**
  1. Fetch up to 400 reviews for the period
  2. Compute: total, avg rating, NPS (promoters/detractors formula), sentiment breakdown
  3. Compute top 5 themes from `review_categories`
  4. Identify top 3 bug clusters from negative reviews
  5. AI-generate top 3 feature ideas from feature-request tagged reviews
  6. AI-generate weekly pulse (≤250 words) + 3 top actions
- **Output:** `{ metrics, topThemes, topBugs, topFeatureIdeas, quotes, weeklyPulse, topActions, morningBrewHtml }`
- **HITL:** The generated pulse is saved as `status: 'draft'` in `weekly_pulses` table pending operator approval

#### HITL (Human-in-the-Loop) Pattern
- All AI-generated artefacts (pulses, bug reports, feature ideas, replies) start as `draft`
- Operator sees a preview → Approve or Reject in the `ReportingWorkflow` component
- On Approve → status changes to `'approved'`; downstream actions (email, Jira, Confluence) are triggered only then
- This HITL gate is a core capstone requirement

#### PII Sanitizer (`src/lib/pii-sanitizer.ts`)
- Detects: phone numbers, email addresses, Aadhaar-like patterns
- `containsPII(text): boolean` — used before including quotes in pulse
- `sanitizeText(text): string` — replaces detected PII with `[REDACTED]`

#### Integration Points
- **Jira:** `POST /api/integrations/jira/issue` → creates bug tickets from AI-drafted reports
- **Confluence:** `POST /api/integrations/confluence/page` → publishes pulse as a Confluence page
- **Email:** `POST /api/reporting/send-mail` → sends Morning Brew HTML email
- **CRON:** `GET /api/cron/sync-reviews` (Vercel CRON) → auto-syncs every N hours

#### TypeScript Types (Key)
```typescript
type Sentiment = "positive" | "negative" | "neutral" | "uncategorized"
type Platform = "all" | "android" | "ios"
type TimePeriod = "today" | "yesterday" | "last_7" | "last_15" | "last_30" | "custom"

interface Review { id, app_id, platform, author_name, star_rating, review_text,
                   sanitized_text, sentiment, review_date, categories?: Category[] }
interface WeeklyPulse { id, pulse_content, themes, quotes, action_ideas,
                        status: 'draft'|'approved'|'rejected', generated_at, approved_at }
interface FeeExplainer { id, scenario, bullets, source_links,
                         status: 'draft'|'approved'|'rejected' }
```

#### Integration Asset for Capstone
- The **Supabase project** is already provisioned and contains live review data
- The `weekly_pulses.themes` JSONB field (`[{name, count}]`) is the **cross-module bridge**: voice agent reads top themes for greeting personalization (Pillar B)
- `fee_explainers` table is the Pillar A "fee logic" data source
- The full HITL approval workflow in `ReportingWorkflow` must be replicated/extended in the unified UI
- Category taxonomy (20 categories) is the shared vocabulary between Pulsator and unified knowledge base

---

## 3. Voice Agent Concierge

### Identity
| Field | Value |
|---|---|
| **Repo** | https://github.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge |
| **Live** | https://voice-agent-concierge.vercel.app/ |
| **Default Branch** | `master` (not `main`) |
| **Target Persona** | Investors & Advisors (User-Facing) |
| **Core Purpose** | Voice-first conversational AI for financial FAQs + advisor appointment scheduling with external tool calling |

### Stack
| Layer | Technology |
|---|---|
| **Frontend** | Next.js App Router, TypeScript, Tailwind CSS, Framer Motion |
| **AI — LLM** | Google Gemini API (function calling for tools) |
| **AI — TTS** | ElevenLabs API |
| **AI — STT** | Browser Web Speech API (MediaRecorder) |
| **External Tool** | Google Calendar API (create calendar events) |
| **Testing** | Vitest (unit + property-based tests) |

### Repository Layout
```
voice-agent-concierge/
├── src/
│   ├── app/
│   │   ├── page.tsx                           # Main UI (19KB — full Aurora-glass interface)
│   │   ├── layout.tsx
│   │   ├── globals.css                        # Custom aurora/glass CSS vars
│   │   └── api/
│   │       ├── chat/route.ts                  # POST /api/chat — Gemini orchestration (16KB)
│   │       └── elevenlabs/route.ts            # POST /api/elevenlabs — TTS proxy (6KB)
│   ├── components/
│   │   ├── AudioVisualizer.tsx                # AI Orb — animated audio-reactive visualizer (13KB)
│   │   ├── BookingWidget.tsx                  # Booking confirmation UI (11KB)
│   │   ├── AdvisorCard.tsx                    # Advisor profile display (6KB)
│   │   ├── ChatInterface.tsx                  # Text chat fallback (4KB)
│   │   ├── Sidebar.tsx                        # Session sidebar (6KB)
│   │   └── ui/
│   │       ├── FinancialTicker.tsx            # Market ticker (3KB)
│   │       ├── GlassPanel.tsx                 # Glassmorphism panel component
│   │       └── NeumorphicButton.tsx           # Neumorphic button styles
│   ├── hooks/
│   │   ├── useVoiceInteraction.ts             # STT (MediaRecorder) + full voice loop (9KB)
│   │   ├── useConversation.ts                 # Conversation state management (7KB)
│   │   └── useAudioAnalyzer.ts                # Web Audio API amplitude analysis (4KB)
│   ├── lib/
│   │   ├── state-machine.ts                   # 7-step conversation state machine (19KB)
│   │   ├── gemini.ts                          # Gemini client with function calling (8KB)
│   │   ├── compliance.ts                      # Compliance checks + disclaimers (10KB)
│   │   ├── prompts.ts                         # System prompts per step (12KB)
│   ├── tools/
│   │   ├── calendar.ts                        # Google Calendar API tool (5KB)
│   │   ├── rag-retriever.ts                   # Preparation document retrieval (2KB)
│   │   ├── notes-extractor.ts                 # Post-call notes extraction (3KB)
│   │   └── preparation-data.json             # Static preparation docs per topic
│   └── types/index.ts                         # Full type system + constants + factory fns (11KB)
├── __tests__/
│   ├── unit/                                  # Phase-by-phase unit tests (Vitest)
│   └── property/                             # Property-based tests
├── Phase0_Planning/
│   ├── MASTER_ARCHITECTURE.md                 # 96KB — definitive architecture doc
│   ├── requirements_Final.md                  # 47KB — full requirements spec
│   ├── ui-ux-specifications-final.md          # 28KB — UI/UX spec
│   └── voiceaiagent_Bestpracs.md              # 32KB — voice AI best practices
└── Phase1/ through Phase10/                   # Per-phase completion reports + test logs
```

### Conversation State Machine (`src/lib/state-machine.ts`)

#### 7-Step Rigid Flow
```
greeting → intent_classification → [routing] → close
                                     ↓
                             topic_taxonomy → context_capture → time_preference → confirm_execute → close
                                                                                                    ↑
                                                         availability → time_preference ────────────┘
                                                         cancel → close (direct)
                                                         prepare → close (direct)
```

#### 5 Intent Routing Paths
| Intent | Next Step | Description |
|---|---|---|
| `book` | `topic_taxonomy` | New appointment booking |
| `reschedule` | `topic_taxonomy` | Change existing appointment |
| `cancel` | `close` | Cancel appointment (direct) |
| `prepare` | `close` | Get preparation docs (direct) |
| `availability` | `time_preference` | Check/pick available slots |

#### 5 Consultation Topics
`kyc` | `sip` | `statements` | `withdrawals` | `account_changes`

#### 3-Strike Pattern (Error Recovery)
- **No-match:** Strike 1 = shorter rephrase; Strike 2 = even narrower prompt; Strike 3 = offer text fallback
- **No-input:** Strike 1 = repeat prompt; Strike 2 = rephrase; Strike 3 = "Are you still there?"
- Each state has its own `SILENCE_TIMEOUTS` (10–20 seconds)

### TypeScript Type System (`src/types/index.ts`)

```typescript
// Core flow types
type ConversationStep = 'greeting' | 'intent_classification' | 'topic_taxonomy' |
                        'context_capture' | 'time_preference' | 'confirm_execute' | 'close'
type IntentType = 'book' | 'reschedule' | 'cancel' | 'prepare' | 'availability'
type TopicType = 'kyc' | 'sip' | 'statements' | 'withdrawals' | 'account_changes'
type AgentVisualState = 'idle' | 'listening' | 'thinking' | 'speaking'

// Conversation state (persisted across turns)
interface ConversationState {
  step: ConversationStep; intent?: IntentType; topic?: TopicType;
  userContext?: string; selectedSlot?: string; bookingCode?: string;
  history: ChatMessage[];
  noMatchCount: number; noInputCount: number;
  calendarRetryCount: number; geminiRetryCount: number;
  metrics: ConversationMetrics;
}

// Booking
interface BookingSummary { bookingCode: string; topic: TopicType; slot: string; context: string }
// Booking code format: NL-[A-Z0-9]{4}  (regex: /^NL-[A-Z0-9]{4}$/)

// Tool interfaces
interface CalendarEventPayload { topic, date (ISO), time (24h), userContext, bookingCode }
interface RAGResult { documents: PreparationDoc[]; found: boolean }

// UI
interface UiAction { type: 'show_slots'|'confirm_booking'|'show_documents'|'reset'; payload: Record }
```

### API Routes

#### `POST /api/chat`
- **Input:** `{ message: string, conversationState: ConversationState }`
- **Output:** `{ response: string, updatedState: ConversationState, uiAction?: UiAction }`
- **Process:** Gemini function calling → state machine transition → optional tool calls (calendar, RAG)
- **Tool calls return:** `ToolCallResult { toolName, parameters, result }`

#### `POST /api/elevenlabs`
- **Input:** `{ text: string, voiceId?: string }`
- **Output:** Audio stream (MP3/PCM) → plays in browser
- **Voice:** ElevenLabs voice ID configured via env var

### Key Implementation Details

#### Voice Loop (`src/hooks/useVoiceInteraction.ts`)
1. User presses mic → `MediaRecorder` captures audio
2. Browser Web Speech API transcribes (STT)
3. Transcript sent to `/api/chat`
4. Response text sent to `/api/elevenlabs` → audio returned
5. `AudioVisualizer` orb animates to audio amplitude in real-time
6. `AgentVisualState` cycles: `idle → listening → thinking → speaking → idle`

#### Aurora-Glass UI
- Dark background with animated aurora mesh (`AuroraMesh.tsx`)
- Glassmorphism panels (`GlassPanel.tsx`) — backdrop-blur, semi-transparent borders
- AI Orb (`AudioVisualizer.tsx`) — **pure CSS + Framer Motion** multi-layer animated sphere (NOT WebGL), reacts to audio level (0–1)
- Neumorphic buttons (`NeumorphicButton.tsx`) — inset shadow style
- Framer Motion for all transitions

#### AI Orb — AudioVisualizer.tsx Layer Architecture (13KB)
The orb is the centrepiece visual. 200×200px, 7 concentric layers rendered with CSS + Framer Motion:

| Layer | Purpose | Active States |
|-------|---------|---------------|
| 0. Ambient halo | Box-shadow pulse behind sphere | Always — intensifies on active |
| 1. Base sphere | Deep frosted glass circle (backdrop-blur) | Always |
| 2. Glow layer | Pulsing colored box-shadow halo | Always |
| 3A. Idle core | Rotating gradient nebula (`spin-slow` keyframe) | `idle` only |
| 3B. Waveform ring | 32 audio-reactive bars radially positioned | `listening` only |
| 3C. Scanner arc | 120° rotating arc + bright scanner head | `thinking` only |
| 3D. Pulse core | `orbScale` drives scale based on `audioLevel` | `speaking` only |
| Top highlight | Bright spot for 3D depth illusion | Always |
| Ground shadow | Reflection beneath the orb | Always |

**Key constants:**
```typescript
const SIZE = 200; // px
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
const waveformBars = Array.from({ length: 32 }, (_, i) => ({ angle: (i / 32) * 360, index: i }));
// Audio-reactive scale for speaking state:
const orbScale = state === 'speaking' ? 0.95 + clampedLevel * 0.1 : 1;
```

**Waveform bar height formula:**
```typescript
const barHeight = 6 + clampedLevel * 22 * (0.4 + 0.6 * Math.sin(index * 0.6 + Date.now() * 0.003));
// Range: 6px (silence) → 28px (peak), phase-shifted per bar for organic wave
```

**ARIA labels per state:**
```typescript
const ARIA_LABELS = {
  idle: 'AI assistant is ready',
  listening: 'AI is listening',
  thinking: 'AI is thinking',
  speaking: 'AI is speaking',
};
```

**Keyframe animations used:**
- `spin-slow` — 8s infinite rotation (idle nebula core)
- `spin-scanner` — 1.5s infinite rotation (thinking arc)
- `pulse` keyframe for glow halo on active states

#### FinancialTicker (MarqueeTicker) Implementation — key helpers
```typescript
// From src/components/ui/FinancialTicker.tsx
export function getTickerColor(change: number): string {
  if (change > 0) return '#10B981'; // Emerald (positive)
  if (change < 0) return '#EF4444'; // Crimson (negative)
  return '#A1A1AA'; // Grey (flat)
}
export function getTickerArrow(change: number): string {
  if (change > 0) return '▲';
  if (change < 0) return '▼';
  return '';
}
export function formatTickerValue(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
// Infinite scroll trick: duplicate the array
const items = [...data, ...data]; // renders doubled list, CSS translateX(-50%) loops seamlessly
```

**CSS animation (pure CSS, not JS interval):**
```css
@keyframes ticker {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.ticker-track { animation: ticker 30s linear infinite; }
.ticker-track:hover { animation-play-state: paused; }
```

#### BookingWidget — 3 State Implementation
```typescript
// From src/components/BookingWidget.tsx
type BookingMode = 'dashboard' | 'selecting' | 'confirmed';
const mode = confirmation ? 'confirmed' : slots.length > 0 ? 'selecting' : 'dashboard';
```

**State transitions:**
1. `dashboard` — Shows "Advisor Dashboard" stats + "Schedule a Meeting" CTA
2. `selecting` — Shows available time slots as clickable NeumorphicButtons
3. `confirmed` — Shows booking ticket: code (NL-XXXX), topic label, time slot, context

**Chime on confirmation:**
```typescript
const chimeRef = useRef<HTMLAudioElement>(null);
useEffect(() => {
  if (confirmation) chimeRef.current?.play().catch(() => {});
}, [confirmation]);
```

**Green flash overlay:** `AnimatePresence` conditional `motion.div` with emerald background, opacity 0.3, 500ms, disappears via exit

**TOPIC_LABELS map:**
```typescript
const TOPIC_LABELS = {
  kyc: 'KYC Verification', sip: 'SIP Consultation',
  statements: 'Statements Review', withdrawals: 'Withdrawals',
  account_changes: 'Account Changes',
};
```

#### AdvisorCard Component
Displays advisor profile in the voice agent sidebar panel:
- Avatar (initials or image), Name, Specialization, "Available Now" badge
- `GlassPanel` container, cyan accent border
- Props: `{ name, specialization, isAvailable, rating }`

#### Booking Code Format
- Pattern: `NL-[A-Z0-9]{4}` (e.g. `NL-AX3K`)
- Constant: `BOOKING_CODE_REGEX = /^NL-[A-Z0-9]{4}$/`
- This code is the **cross-module state persistence link** in the capstone (visible in pulse/ops docs)

#### Compliance (`src/lib/compliance.ts`)
- Every greeting includes: *"This is informational and not investment advice."*
- Compliance checks run on every agent response
- `prepare` intent includes structured document retrieval without giving advice

#### Integration Asset for Capstone
- The **7-step state machine** (`state-machine.ts`) is the core engine — port or extend, don't rewrite
- The **`uiAction` pattern** (`show_slots`, `confirm_booking`, `show_documents`, `reset`) is the clean UI–logic bridge
- The **booking code** (`NL-XXXX`) must appear in the weekly pulse (Pillar B → C link)
- The **top themes from Pulsator** (`weekly_pulses.themes`) should brief the voice agent's greeting (Pillar B → C link)
- `ConversationState` is fully serializable → safe to store in Supabase for cross-session persistence

---

## 4. Cross-Project Integration Map

### Pillar A — Smart-Sync Knowledge Base (M1 + M2)
| Source | What it provides | Integration point |
|---|---|---|
| RAG Chatbot | TF-IDF retrieval over 20 fund facts; citation enforcement | Call `retrieve_top_k()` + `generate_answer()` from unified `/api/knowledge` endpoint |
| PM Pulsator | `fee_explainers` table (scenario + bullets + source_links) | Query Supabase `fee_explainers` where `status='approved'` for fee questions |
| PM Pulsator | `categories` taxonomy (20 named buckets) | Shared vocabulary for tagging knowledge content |

### Pillar B — Insight-Driven Agent Optimization (M2 + M3)
| Source | What it provides | Integration point |
|---|---|---|
| PM Pulsator | `weekly_pulses.themes` (JSONB `[{name, count}]`) — top support themes | Voice agent reads top theme → personalizes greeting (e.g. "I see many users are asking about Nominee Updates today") |
| PM Pulsator | `weekly_pulses.topActions` | Contextualizes advisor availability |
| Voice Agent | `ConversationState.topic` + intent routing | Sends topic back to Pulsator to enrich theme counts |

### Pillar C — Super-Agent MCP Workflow (M2 + M3)
| Source | What it provides | Integration point |
|---|---|---|
| Voice Agent | `bookingCode` (NL-XXXX format), `CalendarEventPayload` | After HITL approval: calendar hold created, `bookingCode` stored |
| Voice Agent | `ConversationState.userContext` + topic | Advisor email draft includes market context + topic context |
| PM Pulsator | `weekly_pulses.weeklyPulse` text | Injected into advisor email draft as "market sentiment" section |
| PM Pulsator | HITL approval gate (`ReportingWorkflow`) | Unified approval center: calendar holds + email drafts pending operator approval |

### State Persistence Cross-Link
```
Voice Agent Session
  └─ bookingCode: "NL-AX3K"
  └─ topic: "sip"
  └─ slot: "2026-05-25 14:30"
        ↓ stored in Supabase (new table: appointment_sessions)
        ↓ referenced in weekly_pulses.action_ideas
        ↓ referenced in advisor email draft
```

---

## 5. Shared Conventions & Reuse Rules

### AI Provider
- All three projects use **Google Gemini** (1.5 Flash for fast/cheap, 2.0 Flash for richer outputs, Pro for complex reasoning)
- The `generateContent(prompt)` pattern from Pulsator's `src/lib/gemini.ts` is the standard wrapper
- **Never use a different AI provider** unless explicitly specified — consistency matters for capstone eval

### PII Rules (Non-Negotiable)
- Always run `containsPII()` before including user-generated text in any output/storage
- Always replace PII with `[REDACTED]` — never drop the sentence
- This applies to: weekly pulses, email drafts, advisor notes, chat history exports

### No-Advice Rule (Non-Negotiable)
- RAG answers must never contain buy/sell/hold recommendations
- Voice agent must include compliance disclaimer in every greeting
- Unified knowledge endpoint must inherit both guardrails

### HITL Gate Pattern
- **Format:** `status: 'draft' | 'approved' | 'rejected'`
- **Rule:** Downstream actions (email, calendar, Jira, Confluence) execute **only** on `'approved'`
- Apply to: weekly pulses, advisor email drafts, calendar holds, bug reports

### Booking Code Format
- Always: `NL-[A-Z0-9]{4}` — validated with `BOOKING_CODE_REGEX`
- This code is the primary cross-module state-persistence key

### Next.js Version & Config
- **Pulsator:** Next.js 15 App Router, `src/` directory structure, shadcn/ui, Recharts
- **Voice Agent:** Next.js App Router, no `src/` prefix, Framer Motion
- **Capstone:** Next.js 15 App Router (current workspace) — adopt `src/` convention from Pulsator

### Supabase
- Client: `src/lib/supabase.ts` (browser) + `src/lib/supabase-server.ts` (server/admin)
- Pattern: always use `getSupabaseAdmin()` in API routes, `createClient()` in client components
- The **user-supabase MCP** is enabled in the capstone workspace for DB migrations

### Environment Variables Pattern
```env
# AI
GEMINI_API_KEY=
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# Voice
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
# Integrations
GOOGLE_CALENDAR_CREDENTIALS=  # JSON string
JIRA_API_TOKEN=
JIRA_BASE_URL=
JIRA_PROJECT_KEY=
CONFLUENCE_API_TOKEN=
CONFLUENCE_BASE_URL=
CONFLUENCE_SPACE_KEY=
# App
NEXT_PUBLIC_APP_URL=
```

### Testing Conventions
- **RAG Chatbot:** pytest (Python) — `backend/tests/`
- **Pulsator:** No automated tests (relies on manual test checklists per phase)
- **Voice Agent:** Vitest — `__tests__/unit/` + `__tests__/property/`
- **Capstone:** Adopt Vitest for new TypeScript tests

### Deployment
- All three projects on **Vercel**
- Backend (RAG Chatbot Python) on **Railway** — separate from Vercel
- Capstone unifies all on Vercel (Next.js API routes replace Python backend where possible)

---

*Last updated: May 2026. Update this document whenever a foundational pattern changes in any of the three source repos or when the capstone integration adds a new cross-module contract.*

---

## 6. Critical Visual Elements — Phase Delivery Map

> **Context for AI agent:** This section answers "where does each exciting visual element appear in the capstone roadmap?" Use it to verify nothing exciting is missing from any phase plan.

The current page (Phase 3) is intentionally a **foundation verification page only** — it showcases the primitive atoms (GlassPanel, NeumorphicButton, AuroraMesh). All the high-impact visual features appear starting Phase 4.

### Phase 4 — Investor Terminal UI Shell (exciting elements coming)

| Component | Source Project | What It Does | Why Exciting |
|-----------|---------------|-------------|--------------|
| **MarqueeTicker** | M1 RAG Chatbot + M3 Voice | 40px scrolling bar, 20 fund NAVs, emerald ▲ / crimson ▼, pauses on hover | Real-time financial pulse at the top of the screen |
| **AIOrb (AudioVisualizer)** | M3 Voice Agent | 200×200px multi-layer orb — idle nebula, listening waveform (32 bars), thinking scanner arc, speaking pulse | The centrepiece visualizer, reacts to voice in real-time |
| **ChatTerminal** | M1 RAG Chatbot | Glass panel message list, typewriter animation per character, agent messages with cyan left-border | Immersive typewriter "AI is answering" experience |
| **BulletResponse** | M1 RAG Chatbot | 6-bullet structured layout with stagger animation | Clean, scannable fund data responses |
| **CitationTag** | M1 RAG Chatbot | Pill-shaped `[Fund Name]` source tags, hover glow, click-to-open URL | Trust signal — every answer cites its source |
| **InputBar** | M3 Voice Agent | Pill input with mic toggle button + send, compliance footer | Voice + text in one bar |

### Phase 5 — Director Ops UI Shell (exciting elements coming)

| Component | Source Project | What It Does | Why Exciting |
|-----------|---------------|-------------|--------------|
| **PulseBriefing** | M2 PM Pulsator | Left column — amber theme blocks (top 3 glowing), quotes, 3 action ideas, word count | Real weekly intelligence brief rendered visually |
| **ThemeBlock** | M2 PM Pulsator | Amber-bordered card with review count badge + glow | Quick scan of what users are complaining about |
| **HitlQueue** | M2 PM Pulsator | Right column — scrollable approval card list with count badge | The "mission control" ops panel |
| **ApprovalCard** | M2 PM Pulsator + M3 Voice | Booking code (glowing mono), calendar hold, editable email draft, market context | AI's work waiting for human sign-off |
| **ActionGate** | M2 + M3 | AUTHORIZE (emerald) + OVERRIDE (crimson) — flash 200ms on click | The HITL decision moment — color-coded authority |
| **CsvUploader** | M2 PM Pulsator | Drag-drop zone with progress bar → complete checkmark | Upload → AI generates the pulse |

### Phase 6 — Mode Switcher (exciting elements coming)

| Component | What It Does |
|-----------|-------------|
| **ModeToggle** | Sliding pill between INVESTOR TERMINAL ↔ DIRECTOR OPS — triggers ScanningLine sweep |
| **ScanningLine** | 1px cyan/amber sweep across viewport on mode switch (400ms) |
| **Aurora mode shift** | Orb colors shift temperature (cyan ambient ↔ amber ambient) with mode |

### Phase 10 — Voice Agent Live (most exciting)

| Component | What It Does |
|-----------|-------------|
| **Live AI Orb** | All 4 states wired to real voice: idle → listening (mic on) → thinking (Gemini) → speaking (ElevenLabs) |
| **BookingWidget** | Dashboard → slot selection → confirmed ticket with booking code + emerald flash + chime |
| **Real MarqueTicker** | Wired to live fund data from Supabase |
| **Theme-aware greeting** | Orb greeting includes top theme from latest pulse (Pillar B live) |

### Capstone Final (Phase 14–16) — All Pillars Live

- Voice agent greeting mentions top PM pulse theme (Pillar B)
- Completed bookings appear in HITL queue as approval cards (Pillar C)
- Booking code `NL-XXXX` appears across both modes (cross-module persistence)
- Full end-to-end: speak → get answer → book appointment → ops approves → calendar created

### What is NOT planned (intentional scope exclusions)

| Feature | Reason Excluded |
|---------|----------------|
| `AdvisorCard` sidebar (M3) | The capstone uses a different layout — BookingWidget covers the booking UX |
| Recharts sentiment graphs (M2) | Scope reduction — Phase analytics omitted to focus on core HITL + RAG |
| CRON auto-sync (M2) | Excluded — CSV upload covers the data ingestion flow |
| Jira / Confluence integrations (M2) | Out of scope — capstone focuses on the HITL center + MCP gateway |
| Session sidebar (M3) | Replaced by the dual-mode layout (mode switcher covers navigation) |

---

## 7. Direct-Reuse Code Reference — Copy/Adapt in Upcoming Phases

> **Purpose:** Each module below is production-tested in a past project and should be **copied then adapted** (not rewritten) for the capstone. This directly reduces double-work across all phases.

---

### 7.1 Gemini Clients (Phase 11)

#### Simple wrapper — M2 Pulsator (`src/lib/gemini.ts`)
Use for: pulse generation, AI categorization, fee explainer generation.
```typescript
// File: src/lib/gemini.ts  (M2 pattern — copy directly)
import { GoogleGenerativeAI } from "@google/generative-ai";

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (_genAI) return _genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured.");
  _genAI = new GoogleGenerativeAI(apiKey);
  return _genAI;
}

export async function generateContent(
  prompt: string,
  model: string = "gemini-2.5-flash"
): Promise<string> {
  const genAI = getGenAI();
  const genModel = genAI.getGenerativeModel({ model });
  const result = await genModel.generateContent(prompt);
  return result.response.text();
}
```

#### Function-calling client — M3 Voice Agent (`src/lib/gemini.ts`)
Use for: voice conversation loop with tool calls (Calendar, RAG retriever, notes extractor).
```typescript
// Key exports from M3 gemini.ts:

// 1. Conversation history adapter (Gemini requires 'user' as first message)
export function buildGeminiHistory(history: ChatMessage[]): Content[] {
  const filtered = history.filter((msg) => msg.role !== 'system');
  const firstUserIndex = filtered.findIndex((msg) => msg.role === 'user');
  if (firstUserIndex === -1) return [];
  return filtered.slice(firstUserIndex).map((msg) => ({
    role: msg.role === 'agent' ? 'model' : 'user',
    parts: [{ text: msg.text }] as Part[],
  }));
}

// 2. Function calling loop (max 5 iterations, handles multi-step tool chains)
export async function chat(
  message: string,
  stateContext: string,
  history: ChatMessage[],
  toolExecutor: ToolExecutor           // dispatches tool calls to calendar/RAG/notes
): Promise<GeminiResponse> {
  const model = getModel();            // Gemini 2.0 flash + systemInstruction + tools
  const chatSession = model.startChat({ history: buildGeminiHistory(history) });
  const toolCalls: ToolCallResult[] = [];
  let response = await chatSession.sendMessage(`${stateContext}\n\nUser message: ${message}`);
  let candidate = response.response.candidates?.[0];
  let iterations = 0;
  while (candidate && iterations < 5) {
    const functionCall = extractFunctionCall(candidate);
    if (!functionCall) break;
    const toolResult = await toolExecutor(functionCall.name, functionCall.args);
    toolCalls.push({ toolName: functionCall.name, parameters: functionCall.args, result: toolResult });
    response = await chatSession.sendMessage([{
      functionResponse: { name: functionCall.name, response: toolResult }
    }]);
    candidate = response.response.candidates?.[0];
    iterations++;
  }
  return { text: response.response.text() || '', toolCalls };
}

// 3. Retry wrapper (1 retry, then friendly error message)
export async function chatWithRetry(...args): Promise<GeminiResponse> {
  try { return await chat(...args); }
  catch { try { return await chat(...args); }
    catch { return { text: "I'm experiencing a temporary issue. Please try again.", toolCalls: [] }; }
  }
}
```

---

### 7.2 Compliance & PII Protection (Phase 9)

#### M3 Voice Agent — Full compliance layer (`src/lib/compliance.ts`)
Use for: input checking (before Gemini), output checking (after Gemini), brevity enforcement.
```typescript
// Key exports — copy compliance.ts from M3 directly:

// Exact compliance response texts (immutable — copy word-for-word):
const COMPLIANCE_RESPONSES = {
  pii:    "For security, please hold your personal details for the secure link. Let's continue with scheduling.",
  advice: 'I am an AI assistant and cannot provide financial advice.',
};

// PII types detected: SSN (9/11-digit), email, financial balance (₹/$), account (8-16 digits), phone
export function detectPII(text: string): { hasPII: boolean; types: PIIType[] }
export function redactPII(text: string): string   // replaces PII with [REDACTED_*] placeholders

// Advice detection — 13 regex patterns covering:
//   "should I buy/sell/invest", "recommend ... fund", "best investment", "market prediction"
export function detectAdviceRequest(text: string): boolean

// Brevity enforcement (strip filler words, max 2 sentences):
//   Filler words stripped: um, well, so, actually, basically, honestly, literally
export function enforceBrevity(text: string): string

// Single entry point (PII check takes priority over advice check):
export function isComplianceViolation(text: string): ComplianceCheckResult
```

#### M2 Pulsator — India-specific PII (`src/lib/pii-sanitizer.ts`)
Use for: sanitizing review text before including in pulse or storing in Supabase.
```typescript
// India-specific patterns (copy from M2):
// ✅ Aadhaar: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g  → [REDACTED_AADHAAR]
// ✅ PAN:     /\b[A-Z]{5}\d{4}[A-Z]\b/g             → [REDACTED_PAN]
// ✅ Phone:   /(?:\+91[\s-]?|0)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g → [REDACTED_PHONE]
// ✅ Email:   standard regex

export function sanitizePII(text: string): string   // replaces with [REDACTED_*]
export function containsPII(text: string): boolean  // used as gate before pulse inclusion
```

**Capstone strategy:** Use M3's `compliance.ts` for the voice agent (PII + advice + brevity), M2's `pii-sanitizer.ts` in the review pipeline (Aadhaar/PAN patterns).

---

### 7.3 Conversation State Machine (Phase 10)

Full source: `src/lib/state-machine.ts` in voice-agent-concierge (master branch). Copy directly.

```typescript
// Key exported functions:

// 1. Transition validation
export function isValidTransition(from, to, intent?): boolean
// Special: any state → 'greeting' is always valid ("start over")

// 2. Next state resolver
export function getNextState(current, intent?, input?): ConversationStep
// "start over" / "restart" → always returns 'greeting'

// 3. Prompt generator (includes compliance disclaimer in greeting)
export function getPromptForState(step, context?): string
// greeting prompt: "...This is informational and not investment advice."

// 4. Keyword-based fallback intent classifier (20 keywords per intent)
export function classifyIntent(userInput: string): IntentType
// Order: cancel → reschedule → prepare → availability → book (book = default)

// 5. Topic validation with aliases (30+ aliases across 5 topics)
export function isValidTopic(input: string): input is TopicType
export function resolveTopic(input: string): TopicType | undefined
// aliases: "nominee change" → "account_changes", "systematic investment plan" → "sip", etc.

// 6. Mock slot generation (always returns exactly 2 slots)
export function generateMockSlots(timePreference?): [string, string]
export function getNextBusinessDay(): Date

// 7. 3-Strike no-match rephrasings
export function getRephraseForState(step, noMatchCount): string
// Strike 1: shorter rephrase; Strike 2: different phrasing; Strike 3: "Would you like to type instead?"
export function shouldFallbackToText(noMatchCount: number): boolean
export function getNoInputPrompt(step, noInputCount, context?): string
```

**TRANSITION_MAP (copy exactly):**
```typescript
const TRANSITION_MAP = {
  greeting:              new Set(['intent_classification']),
  intent_classification: new Set(['topic_taxonomy', 'time_preference', 'close']),
  topic_taxonomy:        new Set(['context_capture']),
  context_capture:       new Set(['time_preference']),
  time_preference:       new Set(['confirm_execute', 'topic_taxonomy']),
  confirm_execute:       new Set(['close']),
  close:                 new Set(['intent_classification']),
};
const INTENT_NEXT_STEP = {
  book: 'topic_taxonomy', reschedule: 'topic_taxonomy',
  cancel: 'close', prepare: 'close', availability: 'time_preference',
};
```

---

### 7.4 Voice Hooks (Phase 10–11)

#### useAudioAnalyzer — Real-time 60fps audio level (`src/hooks/useAudioAnalyzer.ts`)
```typescript
// Web Audio API — AnalyserNode over MediaStream or HTMLAudioElement
// fftSize: 256, smoothingTimeConstant: 0.8
// Output: normalized audioLevel (0–1) at ~60fps via requestAnimationFrame

export default function useAudioAnalyzer(): {
  audioLevel: number;           // 0 (silence) → 1 (peak), drives orb waveform
  connectStream: (stream: MediaStream) => void;   // for mic input
  connectElement: (element: HTMLAudioElement) => void; // for TTS playback
  disconnect: () => void;
}

// Level formula: avg(frequencyBinData) / 128 → clamped to 0–1
// On disconnect: cancelAnimationFrame + setAudioLevel(0)
// Cleanup: AudioContext.close() on unmount
```

#### useVoiceInteraction — Full voice loop (`src/hooks/useVoiceInteraction.ts`)
```typescript
// Manages: mic → STT(/api/elevenlabs?mode=stt) → /api/chat → TTS(/api/elevenlabs?mode=tts) → play
// AgentVisualState cycles: idle → listening → thinking → speaking → idle

export default function useVoiceInteraction(options): {
  agentState: AgentVisualState;   // drives AI Orb
  audioLevel: number;             // from audioAnalyzer
  isTextMode: boolean;            // true after 3 no-match strikes or mic denied
  isRecording: boolean;
  micPermission: 'prompt' | 'granted' | 'denied';
  startListening: () => void;     // MediaRecorder.start(100ms chunks)
  stopListening: () => void;      // MediaRecorder.stop() → triggers processAudioBlob
  sendTextMessage: (text: string) => Promise<string | null>;
  ttsAudioRef: React.RefObject<HTMLAudioElement>;
}

// MediaRecorder options: audio/webm;codecs=opus preferred, audio/webm fallback
// Silence timer: per-step timeout from SILENCE_TIMEOUTS constant (10–30s)
// Auto-fallback to text mode when: mic denied OR noInputCount >= MAX_NO_INPUT
// TTS: POST /api/elevenlabs?mode=tts → blob → URL.createObjectURL → Audio.play()
// STT: POST /api/elevenlabs?mode=stt → { text: string }
// Mic request: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
```

---

### 7.5 Google Calendar Tool (Phase 11)

```typescript
// File: src/tools/calendar.ts (M3) — copy directly for Phase 11

// Payload validation (all fields required):
export function validatePayload(payload: CalendarEventPayload): string[]
// Validates: topic ∈ VALID_TOPICS, date = YYYY-MM-DD, time = HH:mm,
//            userContext non-empty, bookingCode matches NL-[A-Z0-9]{4}

// Event creation (Service Account auth, no OAuth browser flow):
export async function createCalendarEvent(payload: CalendarEventPayload): Promise<CalendarEventResult>
// Auth: google.auth.JWT({ email: GOOGLE_CLIENT_EMAIL, key: GOOGLE_PRIVATE_KEY })
// Scope: 'https://www.googleapis.com/auth/calendar.events'
// Event title format: "Advisor Consultation — {Topic} [{BookingCode}]"
// Duration: 1 hour (hardcoded)
// sendUpdates: 'all'

// Title helper (export for testing):
export function getEventTitle(topic: TopicType, bookingCode: string): string
// → "Advisor Consultation — KYC [NL-AX3K]"

// Environment variables required:
// GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, TARGET_CALENDAR_ID
```

---

### 7.6 Weekly Pulse Generation API (Phase 12)

```typescript
// File: src/app/api/reporting/generate/route.ts (M2) — adapt for capstone

// Key functions to port:
function buildDateFilter(timePeriod, dateFrom?, dateTo?): { startDate, endDate }
// Handles: 'today', 'yesterday', 'last_7', 'last_15', 'last_30', 'custom'

function cleanJson(text: string): string
// Strips ```json ... ``` markdown wrapping from Gemini output

function buildWeeklyPrompt(input): string
// Gemini prompt that enforces:
// - weeklyPulse ≤ 250 words (executive summary)
// - topActions = exactly 3 string items
// - Returns ONLY valid JSON: { "weeklyPulse": "...", "topActions": ["...", "...", "..."] }

// API route processing pipeline:
// 1. Fetch ≤400 reviews for period from Supabase
// 2. Compute: total, avgRating, NPS (promoters%×100 − detractors%×100), sentiment breakdown
// 3. Count category occurrences → topThemes (top 5, sorted by count)
// 4. Bucket negative reviews by category → topBugs (top 3)
// 5. AI-generate topFeatureIdeas from feature-request tagged reviews (JSON array, max 3)
// 6. Filter 3 PII-free quotes (containsPII guard)
// 7. buildWeeklyPrompt() → generateContent() → JSON.parse(cleanJson())
// 8. Save as 'draft' in weekly_pulses table → HITL approval required

// NPS formula:
const promoters = reviews.filter(r => r.star_rating >= 4).length;
const detractors = reviews.filter(r => r.star_rating <= 2).length;
const nps = Math.round(((promoters/total)*100 - (detractors/total)*100) * 10) / 10;
```

---

### 7.7 M3 Page Layout — 6-Step Entrance Choreography (Phase 4)

Copy the entrance animation pattern directly from M3's `src/app/page.tsx`:
```typescript
// 6-step staggered entrance sequence (copy timing values):
// Step 1 — AuroraMesh:        opacity 0→1, 1000ms, delay 0ms
// Step 2 — FinancialTicker:   opacity 0→1 + y -20→0, 600ms, delay 200ms
// Step 3 — Sidebar:           opacity 0→1 + y 20→0, 600ms, delay 300ms
// Step 4 — Center column:     opacity 0→1 + y 20→0, 600ms, delay 400ms
// Step 5 — Right panel:       opacity 0→1 + y 20→0, 600ms, delay 500ms
// Step 6 — AI Orb:            opacity 0→1 + scale 0.8→1, 800ms, delay 700ms
// All use EASE_OUT_EXPO = [0.16, 1, 0.3, 1]

// entranceComplete flag (set after 1500ms) gates the voice input controls:
const [entranceComplete, setEntranceComplete] = useState(false);
useEffect(() => {
  const timer = setTimeout(() => setEntranceComplete(true), 1500);
  return () => clearTimeout(timer);
}, []);
```

**TICKER_DATA from M3 page.tsx (starting mock data for Phase 4):**
```typescript
const TICKER_DATA: TickerItem[] = [
  { symbol: 'NIFTY 50',   value: 22450.30, change: 1.2  },
  { symbol: 'SENSEX',     value: 73890.15, change: 0.8  },
  { symbol: 'BANK NIFTY', value: 48220.50, change: -0.3 },
  { symbol: 'RELIANCE',   value: 2845.60,  change: 2.1  },
  { symbol: 'TCS',        value: 3620.10,  change: -1.5 },
  { symbol: 'INFY',       value: 1480.25,  change: 0.6  },
  { symbol: 'HDFC BANK',  value: 1560.40,  change: 0.2  },
  { symbol: 'GOLD',       value: 62340.00, change: -0.1 },
  { symbol: 'USD/INR',    value: 83.25,    change: 0.05 },
];
```

---

### 7.8 ChatInterface Pattern (Phase 4)

From M3 `src/components/ChatInterface.tsx`:
```typescript
// Key design decisions to replicate:
// - Agent messages: LEFT cyan border (no bubble), role='agent'
// - User messages: minimal glass panel styling, role='user'
// - CSS mask: fades older messages toward the orb above (top-to-bottom gradient fade)
// - Auto-scroll: scrollRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' })
//   triggered on messages.length change (useEffect)
// - AnimatePresence wraps each message for enter animation
// - Container: flex:1, overflow-y scroll, glass morphism

// Scroll ref pattern:
const scrollRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
}, [messages.length]);
```

---

### 7.9 FinancialTicker Infinite Scroll Pattern (Phase 4)

```typescript
// From M3 src/components/ui/FinancialTicker.tsx — copy directly:

// Infinite scroll: duplicate array trick
const items = [...data, ...data]; // render doubled list

// CSS keyframe (pure CSS — no JS interval, 60fps):
// @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
// animation: ticker 30s linear infinite
// :hover { animation-play-state: paused; }

// Color + arrow helpers:
export function getTickerColor(change: number): '#10B981' | '#EF4444' | '#A1A1AA'
export function getTickerArrow(change: number): '▲' | '▼' | ''
export function formatTickerValue(value: number): string  // en-IN locale, 2 decimal places
export function formatTickerChange(change: number): string // "▲1.2%" or "▼0.4%"

// Accessibility: aria-live="polite" on outer container
// Each item aria-label="{symbol} {value} {change}"
```

---

### 7.10 Complete URL & Repo Reference

| Project | Live URL | GitHub |
|---------|----------|--------|
| M1 Mutual Fund RAG Chatbot | https://mutual-fund-rag-chatbot-psi.vercel.app/ | https://github.com/varungarg7119iitkgp-PMLearn/mutual-fund-rag-chatbot |
| M2 Groww Support PM Pulsator | https://groww-support-pm-pulsator.vercel.app/ | https://github.com/varungarg7119iitkgp-PMLearn/Groww-Support-PM-Pulsator |
| M3 Voice Agent Concierge | https://voice-agent-concierge.vercel.app/ | https://github.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge (default branch: **master**) |

**Key raw file URLs for future fetches:**
```
# M3 source files (branch: master)
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/components/AudioVisualizer.tsx
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/components/ui/FinancialTicker.tsx
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/components/BookingWidget.tsx
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/components/ChatInterface.tsx
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/components/AdvisorCard.tsx
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/components/Sidebar.tsx
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/hooks/useVoiceInteraction.ts
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/hooks/useAudioAnalyzer.ts
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/hooks/useConversation.ts
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/lib/state-machine.ts
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/lib/gemini.ts
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/lib/compliance.ts
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/tools/calendar.ts
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge/master/src/app/page.tsx

# M2 source files (branch: main)
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/Groww-Support-PM-Pulsator/main/src/lib/gemini.ts
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/Groww-Support-PM-Pulsator/main/src/lib/pii-sanitizer.ts
https://raw.githubusercontent.com/varungarg7119iitkgp-PMLearn/Groww-Support-PM-Pulsator/main/src/app/api/reporting/generate/route.ts

# M1 NOTE: frontend directory structure uses different path prefix
# Try fetching as needed during Phase 8 (RAG) — branch: main
```
