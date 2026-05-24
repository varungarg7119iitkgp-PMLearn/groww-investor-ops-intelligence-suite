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
- AI Orb (`AudioVisualizer.tsx`) — WebGL/canvas animated sphere, reacts to audio level (0–1)
- Neumorphic buttons (`NeumorphicButton.tsx`) — inset shadow style
- Framer Motion for all transitions

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
