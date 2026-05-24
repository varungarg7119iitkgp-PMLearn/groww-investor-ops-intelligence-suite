# Requirements Document — Investor Ops & Intelligence Suite (Capstone Project)

## 1. Executive Summary

This document is the **single source of truth** for the Investor Ops & Intelligence Suite — a dual-sided fintech ecosystem that integrates three standalone AI projects into a unified product:

- **M1 — Mutual Fund RAG Chatbot**: Facts-only FAQ on 20 mutual funds with chunked data in Supabase, TF-IDF retrieval, and Gemini-powered answer generation.
- **M2 — Groww Support PM Pulsator**: Review analytics platform with Supabase PostgreSQL, AI categorization (Gemini Flash), Weekly Pulse generation, Fee Explainer, HITL approval workflows, and MCP Gateway (Jira + email + document append).
- **M3 — Voice Agent Appointment Scheduler**: Voice-first booking with Gemini Function Calling, ElevenLabs TTS/STT, Google Calendar Service Account integration, 7-step conversation state machine, and MCP-inspired tool architecture.

The capstone merges these into a single-entry-point application with two modes: **Investor Terminal** (user-facing) and **Director Ops** (PM/advisor-facing), connected by three integration pillars:

- **Pillar A (Smart-Sync KB)**: M1 factsheet RAG + M2 Fee Explainer → unified search with citations.
- **Pillar B (Theme-Aware Agent)**: M2 Weekly Pulse themes → M3 Voice Agent dynamic greeting.
- **Pillar C (Super-Agent MCP Workflow)**: M3 booking → M2 HITL approval center with market context enrichment.

This is a personal capstone project for a fintech AI bootcamp. All downstream design, implementation, testing, and evaluation artifacts derive from this document.

| Property | Value |
|---|---|
| Project Name | Investor Ops & Intelligence Suite |
| Tech Stack | Next.js (App Router), TypeScript, Tailwind CSS, Framer Motion, Zustand |
| LLM Engine | Gemini API — gemini-2.0-flash (categorization/retrieval), gemini-2.0-pro (generation) |
| Voice Engine | ElevenLabs API (TTS + STT) |
| Calendar | Google Calendar API (Service Account) |
| Database | Supabase (PostgreSQL) — fund data, review data, chunks, embeddings |
| Deployment | Vercel (Serverless, CRON) |
| Target Users | Personal capstone — fintech AI bootcamp demonstration |

---

## 2. Glossary

| Term | Definition |
|---|---|
| **Investor_Terminal** | The user-facing mode — provides financial ticker (20 funds), Smart-Sync chat, and theme-aware voice concierge for retail investors |
| **Director_Ops** | The PM/advisor-facing mode — provides Weekly Pulse briefings, HITL approval queue, and operational intelligence |
| **Mode_Switcher** | The neumorphic toggle component that transitions between Investor_Terminal and Director_Ops modes with a scanning-line animation |
| **Smart_Sync_KB** | Pillar A — the unified knowledge base combining M1 mutual fund factsheet RAG (chunked data in Supabase, TF-IDF/vector retrieval) with M2 Fee Explainer logic into a single search interface |
| **Theme_Aware_Agent** | Pillar B — the voice concierge (M3) that dynamically incorporates top themes from the Weekly Pulse (M2) into its greeting and conversation context |
| **HITL_Approval_Center** | Pillar C — the human-in-the-loop workflow (M2 pattern) where PM/advisors authorize calendar holds and email drafts generated from M3 bookings before they execute |
| **Weekly_Pulse** | An AI-generated (Gemini Pro) ≤250-word briefing summarizing top themes from user reviews/feedback, containing max 5 themes (top 3 highlighted), exactly 3 representative quotes, and exactly 3 action ideas |
| **Fee_Explainer** | The logic module (from M2) that generates structured, neutral explanations of fee scenarios in ≤6 bullet points with 2 official source URLs and a "Last checked" date |
| **MCP_Gateway** | The integration layer (from M2) that executes approval-gated external actions — in the capstone: calendar event creation, email drafting, and document appending |
| **Approval_Gate** | A UI control (from M2) that blocks any external action until a user explicitly clicks "Authorize." No auto-execution permitted |
| **Golden_Dataset** | A curated set of 5 complex questions used for RAG evaluation — each question requires cross-referencing multiple data sources (factsheet + fee data) |
| **Booking_Code** | A unique identifier in the format `NL-[A-Z0-9]{4}` generated via `crypto.randomBytes` for each confirmed appointment, visible in calendar notes and advisor briefings |
| **Market_Context_Snippet** | A short excerpt from the Weekly Pulse's top theme, embedded in email drafts and advisor briefings to provide market awareness |
| **AI_Orb** | The central 200px animated visual element in Investor_Terminal representing the voice agent's state (Idle, Listening, Thinking, Speaking) — adapted from M3's AI Core Visualizer |
| **Action_Gate** | The approve/reject button pair in Director_Ops HITL queue — neumorphic buttons with emerald (approve) and crimson (reject) states |
| **Citation_Tag** | A pill-shaped UI element displaying the source reference (factsheet URL, fee data source) for each fact in Smart_Sync_KB responses |
| **Scanning_Line** | The horizontal animation that sweeps across the interface during mode transitions (400ms duration) |
| **Glass_Panel** | A UI container using glassmorphism (backdrop blur 24px, border rgba(255,255,255,0.08), bg rgba(255,255,255,0.03)) — the primary container pattern |
| **Stark_Glass_HUD** | The design system identity — holographic, tactical, dark-mode aesthetic combining glassmorphism with neumorphism |
| **Conversation_State_Machine** | The 7-step sequential flow from M3: Greeting → Intent Classification → Topic Taxonomy → Context Capture → Time Preference & Slot → Confirm & Execute → Close |
| **Function_Calling** | Gemini's native mechanism for invoking external tools (Calendar, RAG Retriever, Notes Extractor) during conversation |
| **RAG_Retriever** | The tool that queries chunked fund data (from M1's Supabase store) and fee data to return relevant documents for Smart_Sync_KB answers |
| **Notes_Extractor** | The tool that generates Booking_Codes and structured JSON summary payloads for calendar events |
| **Topic_Taxonomy** | The fixed set of consultation topics: KYC, SIP, Statements, Withdrawals, Account Changes |
| **PII_Sanitizer** | The preprocessing subsystem (from M2) that strips all Personally Identifiable Information using regex patterns before any storage, display, or transmission |
| **Supabase** | Managed PostgreSQL database used for: fund data storage (M1), review data storage (M2), RAG chunks and metadata, Weekly Pulse records, and approval queue persistence |
| **TF_IDF_Index** | The local Term Frequency–Inverse Document Frequency index (from M1) used for chunk retrieval — stored as matrix + metadata JSON |
| **Marquee_Ticker** | The scrolling financial data bar displaying 20 mutual fund NAVs at the top of Investor_Terminal |
| **Source_Manifest** | A document listing 30+ URLs of data sources, APIs, libraries, and references used across the project |
| **Evals_Report** | A markdown file documenting all evaluation results with pass/fail status, scores, and failure explanations |
| **Faithfulness** | An evaluation metric measuring whether AI responses are grounded in retrieved source documents (no hallucination) |
| **Relevance** | An evaluation metric measuring whether retrieved documents are pertinent to the user's query |

---

## 3. Scope

### 3.1 In Scope

- Dual-mode single-page application (Investor_Terminal + Director_Ops) with single URL entry point
- **Data Layer (from M1 + M2)**:
  - Supabase PostgreSQL for fund data, review data, RAG chunks, Weekly Pulse records, and approval queue
  - Chunking strategy: fund data segmented into semantically meaningful chunks (overview, performance, fees, risk, news) with metadata tags (fund_id, category, data_type, last_updated_at, source URLs)
  - TF-IDF index for chunk retrieval (matrix + metadata JSON)
  - PII Sanitizer applied to all inputs before storage
- **Smart-Sync Knowledge Base (Pillar A)**:
  - Unified RAG search combining 20 mutual fund factsheets with Fee Explainer logic
  - 6-bullet structured responses with source citations
  - Gemini Pro for answer generation, grounded exclusively in retrieved chunks
  - Fund universe: 5 Debt, 5 Commodities, 5 Hybrid, 5 Equity funds (from M1 config)
- **Theme-Aware Voice Concierge (Pillar B)**:
  - Voice agent with dynamic greeting incorporating Weekly Pulse top theme
  - ElevenLabs TTS/STT for voice interaction
  - 7-step Conversation State Machine with 5 intent routing paths
  - Gemini Function Calling for tool orchestration (Calendar, RAG, Notes)
  - Google Calendar integration via Service Account
  - 3-strike no-match escalation pattern (from voice agent best practices)
  - Text-only fallback mode when microphone unavailable
- **HITL Approval Center & Super-Agent Workflow (Pillar C)**:
  - Approval queue with calendar hold + email draft + market context snippet
  - Approval_Gate pattern: no external action without explicit user authorization
  - MCP_Gateway executes: calendar event creation, email drafting
  - Email drafts enriched with Market_Context_Snippet from Weekly Pulse
- **Weekly Product Pulse Generation (from M2)**:
  - Gemini Pro generates ≤250-word briefing from review/feedback data
  - Max 5 themes, top 3 highlighted, exactly 3 quotes, exactly 3 action ideas
  - PII verification on all generated output
- **Fee Explainer (from M2)**:
  - Structured explanations in ≤6 bullet points
  - 2 official source URLs, neutral tone, "Last checked" date
- **Cross-Pillar State Persistence**:
  - Zustand global state with slices: investorState, opsState, sharedState
  - Booking code flows from Investor_Terminal → Director_Ops approval queue
  - Weekly Pulse top theme flows from Director_Ops → Investor_Terminal voice greeting
  - Chat context preserved across mode switches
- **Financial Ticker** displaying 20 mutual fund NAVs (from M1 data)
- **Stark-Glass HUD design system** with full animation system
- **Compliance guardrails**: Zero-Advice, Zero-PII, Grounded Citations
- **Evaluation Suite**: RAG eval (5 golden questions), Safety eval (3 adversarial prompts), UX eval (tone/structure)
- Deployed application on Vercel with CRON support
- 5-minute demo video, GitHub repo, Evals Report, Source Manifest (30+ URLs)

### 3.2 Out of Scope

- User authentication / login system (single-user personal tool)
- Multi-language support (English only)
- Mobile-native apps (web-only, responsive)
- Real payment processing or live financial transactions
- Real-time market data feeds (static/mock NAV data for 20 funds)
- Persistent conversation history across browser sessions (session-only)
- Multi-tenant management or admin dashboard
- Real advisor availability checking (mock slots)
- Production-grade security infrastructure (demonstration project)
- Automated daily CRON scraping of app stores (manual CSV upload for capstone demo)
- Full Jira integration (simplified document append for capstone)

---

## 4. Requirements

### Requirement 1: Dual-Mode Interface & Navigation

**User Story:** As a user, I want a single application entry point with a clear toggle between Investor Terminal and Director Ops modes, so that I can access the appropriate tools for my current role without switching applications.

**Business Context:** The capstone requires a single entry point UI. The Mode Switcher is the primary navigation mechanism — it determines which pillar features are visible and active. The transition must feel premium and intentional, reinforcing the dual-sided ecosystem concept.

#### Acceptance Criteria

1. THE Mode_Switcher SHALL render as a neumorphic toggle displaying exactly two labels: "INVESTOR TERMINAL" and "DIRECTOR OPS". No other mode labels SHALL exist.
2. WHEN the user activates the Mode_Switcher, THE application SHALL transition between Investor_Terminal and Director_Ops modes within 400ms, accompanied by a horizontal Scanning_Line animation.
3. WHEN the application loads for the first time, THE Mode_Switcher SHALL default to Investor_Terminal mode.
4. WHILE in Investor_Terminal mode, THE application SHALL display: Marquee_Ticker, AI_Orb, Smart_Sync chat terminal, and voice concierge controls. Director_Ops components SHALL NOT be visible.
5. WHILE in Director_Ops mode, THE application SHALL display: Weekly_Pulse briefing panel, HITL_Approval_Center queue, and Action_Gate controls. Investor_Terminal components SHALL NOT be visible.
6. WHEN the user switches modes, THE application SHALL preserve all in-progress state (chat history, voice session, approval queue items) via Zustand global state so that switching back restores the previous context without data loss.
7. THE application SHALL provide exactly one URL entry point. No separate routes or pages SHALL exist for the two modes.

#### Error States

| Scenario | Behavior |
|---|---|
| Mode transition interrupted (rapid toggling) | Debounce toggle input to 500ms. Complete current transition before accepting next. |
| State preservation failure | Log warning. Reset affected mode to initial state. Display toast: "Session state was reset." |

---

### Requirement 2: Data Layer & RAG Infrastructure

**User Story:** As a developer, I want a unified data layer that stores fund factsheets, fee data, review data, and RAG chunks in Supabase with proper chunking and indexing, so that both Smart-Sync KB and Weekly Pulse can retrieve relevant data efficiently.

**Business Context:** This requirement captures the foundational data infrastructure inherited from M1 and M2. The chunking strategy from M1 (semantically meaningful chunks with metadata) and the Supabase storage pattern from M2 (PostgreSQL with structured tables) are unified into a single database serving all three pillars.

#### Data Architecture

```
Supabase PostgreSQL
├── funds (20 records — identity, category, NAV, URLs, keywords/aliases)
├── fund_chunks (RAG-ready text chunks with metadata tags)
│   ├── chunk_type: overview | performance | fees_loads | risk | news
│   ├── fund_id, category, source_urls, last_updated_at
│   └── embedding_vector (for future vector search)
├── fee_scenarios (structured fee data for Fee Explainer)
├── reviews (PII-sanitized review data for Weekly Pulse)
├── weekly_pulses (generated pulse records with themes, quotes, actions)
├── approval_queue (HITL items: booking_code, status, email_draft, market_context)
└── eval_results (evaluation run results for Evals Report)
```

#### Acceptance Criteria

1. THE system SHALL store data for exactly 20 mutual funds organized into 4 categories: 5 Debt, 5 Commodities, 5 Hybrid, 5 Equity funds, each with canonical name, category, platform URLs, and keyword aliases.
2. WHEN fund data is ingested, THE system SHALL segment it into semantically meaningful RAG chunks: overview, performance (1Y/3Y/5Y returns + benchmark), fees and loads (expense ratio, exit load), risk (riskometer level), and news context (headline, date, publisher, snippet, URL).
3. WHEN RAG chunks are created, THE system SHALL attach metadata tags to each chunk: fund_id, fund_category, chunk_type (data_type), last_updated_at timestamp, and source_urls array for citation generation.
4. THE system SHALL maintain a TF-IDF index (matrix + vocabulary + metadata JSON) over all fund chunks, enabling retrieval of top-K relevant chunks for any user query.
5. WHEN a user query is received by Smart_Sync_KB, THE RAG_Retriever SHALL map the query to relevant funds using keyword aliases from the fund configuration, then retrieve top-K chunks filtered by fund_id and chunk_type relevance.
6. THE system SHALL store fee scenario data in a structured format enabling the Fee_Explainer to generate ≤6 bullet explanations with 2 source URLs for any supported fee type (expense ratio, exit load, TCS, brokerage).
7. WHEN new data is ingested (fund refresh or review upload), THE system SHALL invalidate old chunks and replace them with newly generated chunks. No mixing of old and new snapshots SHALL occur in a single response.
8. THE system SHALL store Weekly Pulse records with fields: pulse_content (text), themes (JSONB array), quotes (JSONB array of 3), action_ideas (JSONB array of 3), status (draft/approved/rejected), generated_at timestamp.

#### Error States

| Scenario | Behavior |
|---|---|
| Supabase connection failure | Display: "Data service temporarily unavailable." Use cached data if available. |
| Chunk retrieval returns zero results | Smart_Sync_KB responds: "I couldn't find relevant information. Try asking about a specific fund." |
| Fund data stale (>7 days since last update) | Display warning badge on affected fund data. Include "Data may be outdated" note in responses. |

---

### Requirement 3: Smart-Sync Knowledge Base — Unified Search (Pillar A)

**User Story:** As a retail investor, I want to ask questions that span mutual fund factsheets and fee structures in a single query, so that I get comprehensive answers without needing to search multiple sources.

**Business Context:** Pillar A merges M1 (Mutual Fund RAG Chatbot — TF-IDF retrieval + Gemini generation) and M2 (Fee Explainer — structured fee logic). The key innovation is that a single query like "What is the expense ratio of Fund X and how does it compare to Fund Y's exit load?" draws from both factsheet chunks AND fee logic simultaneously. Responses follow a strict 6-bullet structure with source citations. The RAG pipeline uses the same grounding principles as M1: all factual statements derive from retrieved chunks, never fabricated.

#### Acceptance Criteria

1. WHEN a user submits a query in the Smart_Sync chat terminal, THE Smart_Sync_KB SHALL perform fund identification using keyword aliases (from fund configuration), then retrieve relevant chunks from the TF-IDF index filtered by identified funds and query intent.
2. WHEN the Smart_Sync_KB generates a response, THE response SHALL be structured as exactly 6 bullet points presented in a Glass_Panel container with typewriter animation effect (15ms stagger per character).
3. WHEN the Smart_Sync_KB generates a response, THE response SHALL include Citation_Tag pill elements for each fact, linking to the specific source URL from the chunk metadata (factsheet URL, AMC page, or fee data source).
4. WHEN a query involves fee comparison logic (expense ratios, exit loads, tax implications), THE Fee_Explainer module SHALL be invoked and its output integrated into the 6-bullet response alongside factsheet data. Fee explanations SHALL use neutral, facts-only tone with no recommendations.
5. WHEN a query references a fund NOT in the 20-fund universe, THE Smart_Sync_KB SHALL respond: "I only support the 20 curated mutual funds in my dataset. Would you like to ask about one of those instead?" and optionally list the fund categories.
6. THE Smart_Sync_KB SHALL ground every factual claim in retrieved source chunks. No response SHALL contain information not traceable to a specific source (Faithfulness requirement). The Gemini prompt SHALL enforce: no fabrication of metrics, no projections, no rankings beyond what's in the data.
7. WHEN the user submits an empty or whitespace-only query, THE Smart_Sync_KB SHALL reject the submission and maintain the current chat state.
8. WHEN generating a response, THE Smart_Sync_KB SHALL append "Last updated from sources: [Date/Time]" using the most recent `last_updated_at` timestamp from the chunks used in the answer.
9. THE Smart_Sync_KB SHALL use Gemini Pro (gemini-2.0-pro) for answer generation with a system prompt enforcing: facts-only policy, ≤6 bullet format, mandatory citations, no advice language ("you should", "best for you"), and timestamp requirement.

#### Error States

| Scenario | Behavior |
|---|---|
| RAG retrieval returns zero results | Display: "I couldn't find relevant information for that query. Try rephrasing or asking about a specific fund." |
| Gemini API timeout (>15s) | Display: "Taking longer than expected. Please try again." Show retry button. |
| Gemini API rate limit (429) | Display: "Service is busy. Please wait a moment and try again." with countdown. |
| Malformed citation data | Render response without Citation_Tags. Log warning for evaluation. |

---

### Requirement 4: Theme-Aware Voice Concierge (Pillar B)

**User Story:** As a retail investor, I want the voice concierge to greet me with awareness of current market themes, so that the interaction feels contextually relevant and informed by the latest product intelligence.

**Business Context:** Pillar B merges M2 (Weekly Pulse themes) with M3 (Voice Agent). The voice agent's greeting dynamically incorporates the top theme from the most recent Weekly Pulse. This demonstrates cross-pillar data flow: Director_Ops intelligence feeds into Investor_Terminal experience. The voice agent uses the same MCP-inspired tool architecture as M3: Gemini Function Calling orchestrates Calendar, RAG, and Notes tools as decoupled server actions.

#### Acceptance Criteria

1. WHEN the voice concierge activates in Investor_Terminal mode, THE Theme_Aware_Agent SHALL retrieve the top theme from the most recent Weekly_Pulse record in Supabase and incorporate it into the greeting message.
2. WHEN greeting the user, THE Theme_Aware_Agent SHALL use the format: "Hello. Based on recent insights, [top theme summary in one clause]. I can help you schedule an advisor consultation. This is informational and not investment advice."
3. WHEN no Weekly_Pulse data is available (first run or data unavailable), THE Theme_Aware_Agent SHALL fall back to the standard greeting: "Hello. I can help you schedule an advisor consultation. This is informational and not investment advice."
4. WHEN the user speaks into the microphone, THE Theme_Aware_Agent SHALL convert speech to text using ElevenLabs STT API and process the transcribed input within the current Conversation_State_Machine step.
5. WHEN the Theme_Aware_Agent generates a response, THE Theme_Aware_Agent SHALL convert the response to speech using ElevenLabs TTS API with the configured voice profile (`ELEVENLABS_VOICE_ID`) and limit verbal output to a maximum of 2 sentences with no filler words.
6. THE Theme_Aware_Agent SHALL begin each response with a brief acknowledgement (2-4 words) that echoes back the specific detail the user provided (e.g., "Got it, KYC." / "Sure, 11:00 AM.") to demonstrate active listening.
7. THE Theme_Aware_Agent SHALL ask exactly ONE question per response turn. Multiple questions in a single turn are prohibited.
8. WHEN the user's browser does not support microphone access OR the user denies microphone permission, THE Theme_Aware_Agent SHALL fall back to text input mode while continuing the same conversation flow.
9. WHEN the user is silent for more than the state-contextual timeout (15s default; 20s for context_capture/time_preference; 10s for topic_taxonomy/close), THE Theme_Aware_Agent SHALL prompt: "Are you still there? Would you like to continue or shall I end the session?"
10. WHEN the Theme_Aware_Agent receives input it cannot classify (No-Match), THE agent SHALL follow a 3-strike escalation: (1st) rephrase shorter with specific options, (2nd) rephrase differently narrowing choices, (3rd) offer text input fallback. Generic phrases like "I didn't understand" are prohibited.

#### Error States

| Scenario | Behavior |
|---|---|
| Weekly Pulse retrieval failure | Use standard greeting without theme context. Log warning. |
| ElevenLabs STT API failure | Fall back to text input. Display: "Voice input temporarily unavailable. You can type instead." |
| ElevenLabs TTS API failure | Display response as text only. Continue conversation without audio. |
| Microphone permission denied | Show text input fallback with explanation. |
| Gemini API failure | Retry once. If still failing: "I'm having trouble processing. Would you like to type your request?" |

---

### Requirement 5: Voice Agent Conversation State Machine & Intent Routing

**User Story:** As a user, I want the voice concierge to guide me through a structured conversation flow with clear intent routing, so that all necessary information is captured for my appointment without confusion or dead ends.

**Business Context:** The state machine (from M3) ensures every conversation follows a predictable, compliant path. Gemini is prompted to rigidly follow this 7-step flow via its system prompt. The 5 intent routing paths handle all expected user needs. The MCP-inspired tool architecture means Calendar, RAG, and Notes are decoupled server actions invoked via Gemini Function Calling.

#### State Machine Definition

```
Step 1: GREETING        → Theme-aware greeting with compliance disclaimer
Step 2: INTENT          → Classify into: Book | Reschedule | Cancel | Prepare | Availability
Step 3: TOPIC TAXONOMY  → Force selection: KYC | SIP | Statements | Withdrawals | Account Changes
Step 4: CONTEXT CAPTURE → Ask: "Could you briefly share what you'd like help with?"
Step 5: TIME PREFERENCE → Offer exactly 2 mock slots based on user preference
Step 6: CONFIRM         → Trigger Calendar_Tool + Notes_Extractor via Function Calling
Step 7: CLOSE           → Provide Booking_Code + ask "Is there anything else?"
```

#### MCP-Inspired Tool Architecture

| Tool | Function Declaration | Parameters | Purpose |
|---|---|---|---|
| Calendar_Tool | `create_calendar_event` | topic, date (ISO), time (HH:mm), user_context, booking_code | Create Google Calendar event via Service Account |
| RAG_Retriever | `get_preparation_docs` | topic (TopicType) | Query local JSON for preparation documents |
| Notes_Extractor | `generate_booking_code_and_notes` | topic, slot | Generate Booking_Code + structured JSON summary |

#### Acceptance Criteria

1. THE Conversation_State_Machine SHALL follow the sequential steps: Greeting → Intent Classification → Topic Taxonomy → Context Capture → Time Preference & Slot → Confirm & Execute → Close. No state SHALL be skipped outside of allowed transitions.
2. WHEN the Greeting state completes, THE Theme_Aware_Agent SHALL classify the user intent into exactly one of five paths: Book, Reschedule, Cancel, What to Prepare, or Check Availability. THE agent SHALL interpret implicit answers contextually ("the first one" → first slot, "sounds good" → confirmation).
3. WHEN the intent is classified as Book or Reschedule, THE Theme_Aware_Agent SHALL prompt the user to select a topic from the Topic_Taxonomy (KYC, SIP, Statements, Withdrawals, Account Changes). THE agent SHALL NOT proceed until a valid topic is selected.
4. WHEN a topic is selected, THE Theme_Aware_Agent SHALL ask: "Could you briefly share what you'd like help with?" and accept any free-text response as valid context.
5. WHEN context is captured, THE Theme_Aware_Agent SHALL invoke `generateMockSlots()` which returns exactly 2 time slots (morning + afternoon, next business day). Not 1, not 3 — exactly 2.
6. WHEN the user confirms a time slot, THE Theme_Aware_Agent SHALL trigger Gemini Function Calling to invoke: (a) `create_calendar_event` with topic, date, time, user_context, and booking_code, and (b) `generate_booking_code_and_notes` to produce the Booking_Code.
7. WHEN the booking is confirmed, THE Theme_Aware_Agent SHALL provide the Booking_Code in format `NL-[A-Z0-9]{4}` (generated via `crypto.randomBytes`), mention the secure post-call link, then transition to Close state.
8. WHEN in Close state, THE Theme_Aware_Agent SHALL ask "Is there anything else I can help you with?" If yes → transition to Intent Classification (skip greeting). If no → "Thank you for using the concierge. Have a great day!" and end session.
9. WHEN the user expresses intent to reschedule or cancel, THE Theme_Aware_Agent SHALL ask for the existing Booking_Code before proceeding.
10. WHEN the user asks what to prepare, THE Theme_Aware_Agent SHALL invoke `get_preparation_docs` via Function Calling with the relevant topic and present preparation documents concisely (max 2 sentences).
11. IF the conversation state becomes inconsistent (missing required fields), THE Conversation_State_Machine SHALL reset to the last valid state and re-prompt the user.
12. IF the user explicitly asks to start over, THE Conversation_State_Machine SHALL reset to the Greeting state.
13. THE Calendar_Tool SHALL authenticate using Google Service Account credentials (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`). No OAuth browser-based flows. Events created exclusively on `TARGET_CALENDAR_ID`.
14. IF the Calendar_Tool fails, THE agent SHALL retry up to 2 times before offering manual booking instructions.
15. THE Notes_Extractor SHALL ensure each Booking_Code is unique within the current session by tracking codes in an in-memory Set and regenerating on collision.

---

### Requirement 6: Weekly Product Pulse Generation

**User Story:** As a product manager, I want an auto-generated weekly briefing summarizing user feedback themes, so that I can quickly identify top issues and take action without manually reading hundreds of reviews.

**Business Context:** The Weekly Pulse is the intelligence engine of Director_Ops mode, inherited from M2. It processes review/feedback data (stored in Supabase) using Gemini Pro and produces a structured briefing. The strict constraints (≤250 words, max 5 themes, exactly 3 quotes, exactly 3 action ideas) ensure consistency and are evaluated in the UX eval. The pulse also feeds Pillar B (top theme → voice greeting) and Pillar C (market context → email drafts).

#### Acceptance Criteria

1. WHEN the Weekly_Pulse is generated, THE Workflow_Engine SHALL analyze filtered reviews from Supabase and group them into a maximum of 5 themes using Gemini Pro.
2. WHEN the Weekly_Pulse is generated, THE system SHALL produce a briefing of 250 words or fewer. The word count SHALL be displayed as a readout in the Director_Ops UI.
3. WHEN the Weekly_Pulse is generated, THE system SHALL highlight the top 3 themes by review volume, visually distinguished using amber theme blocks in the UI.
4. WHEN the Weekly_Pulse is generated, THE system SHALL include exactly 3 representative user quotes (verbatim, PII-sanitized) — no more, no fewer.
5. WHEN the Weekly_Pulse is generated, THE system SHALL include exactly 3 actionable product improvement ideas — no more, no fewer. Each action idea SHALL be specific and actionable.
6. THE Workflow_Engine SHALL verify that the Weekly Pulse output contains absolutely no PII before presenting it to the user (PII_Sanitizer applied to output).
7. WHEN new review/feedback data is provided (CSV upload), THE system SHALL regenerate the Weekly_Pulse incorporating the new data.
8. THE Weekly_Pulse top theme SHALL be persisted in Zustand `sharedState.topTheme` and accessible to the Theme_Aware_Agent in Investor_Terminal mode for dynamic greeting generation.
9. THE Weekly_Pulse record SHALL be stored in Supabase with status (draft/approved/rejected), enabling the Approval_Gate workflow before any external actions.
10. IF the review set contains fewer than 10 reviews, THEN THE system SHALL display: "Insufficient data to generate meaningful themes. Upload more reviews." and not generate a pulse.

#### Error States

| Scenario | Behavior |
|---|---|
| Insufficient input data (<10 reviews) | Display warning. Do not generate pulse. |
| Gemini generation exceeds 250 words | Reject output and retry (max 3 attempts). If still failing, display partial results with warning. |
| Gemini produces wrong count of quotes/actions | Reject and retry. Log constraint violation. |
| Supabase write failure | Display error. Keep generated content in memory for retry. |

---

### Requirement 7: Fee Explainer Module

**User Story:** As a retail investor or support agent, I want to select a fee scenario and get a standardized, factual explanation, so that I have a clear reference for understanding mutual fund fees without any advisory bias.

**Business Context:** The Fee Explainer (from M2) generates structured, neutral explanations of fee scenarios. In the capstone, it integrates with Smart_Sync_KB (Pillar A) — when a user asks a fee-related question, the Fee Explainer logic is invoked alongside factsheet RAG to produce a unified answer. It also operates standalone in Director_Ops for generating fee reference documents.

#### Acceptance Criteria

1. WHEN the Fee_Explainer is invoked with a fee scenario (expense ratio, exit load, TCS, brokerage, account maintenance), THE Fee_Explainer SHALL generate a structured explanation in 6 or fewer bullet points.
2. THE Fee_Explainer SHALL use a neutral, facts-only tone with strictly no recommendations, opinions, or advisory language.
3. THE Fee_Explainer SHALL include exactly 2 official source URLs in the output (e.g., SEBI circular, AMC factsheet page).
4. THE Fee_Explainer SHALL append "Last checked: [YYYY-MM-DD]" at the end of the output using the generation date.
5. WHEN integrated with Smart_Sync_KB (Pillar A), THE Fee_Explainer output SHALL be merged into the 6-bullet response format with appropriate Citation_Tags for the fee source URLs.
6. IF the selected fee scenario is not recognized or no data is available, THEN THE Fee_Explainer SHALL respond: "I don't have data for that fee scenario. I can explain: expense ratios, exit loads, TCS, brokerage, or account maintenance charges."

---

### Requirement 8: HITL Approval Center & Super-Agent Workflow (Pillar C)

**User Story:** As a product manager or financial advisor, I want to review and authorize AI-generated actions (calendar holds and email drafts) before they execute, so that I maintain oversight and can enrich communications with market context.

**Business Context:** Pillar C merges M2 (HITL approval workflows, MCP_Gateway pattern) with M3 (booking system). When a booking is confirmed in Investor_Terminal, it creates a pending item in Director_Ops. The PM/advisor sees the calendar hold details, an auto-drafted email enriched with a Market_Context_Snippet from the Weekly Pulse, and can authorize or override. The Approval_Gate pattern from M2 ensures NO external action executes without explicit human approval.

#### Acceptance Criteria

1. WHEN a booking is confirmed in Investor_Terminal mode, THE HITL_Approval_Center SHALL create a pending approval item in the Director_Ops queue containing: Booking_Code, topic, time slot, user context summary, calendar hold details, and auto-drafted email.
2. WHEN an approval item is displayed, THE HITL_Approval_Center SHALL show the auto-drafted email with an embedded Market_Context_Snippet (amber-bordered block) sourced from the Weekly_Pulse top theme.
3. WHEN an approval item is displayed, THE HITL_Approval_Center SHALL show the Booking_Code prominently (monospace font) and include the calendar hold details (date, time, topic).
4. THE Approval_Gate SHALL block ALL external actions (calendar event creation, email sending) until the user explicitly clicks "Authorize." No auto-execution under any circumstances.
5. WHEN the advisor clicks the "Authorize" Action_Gate button (emerald), THE MCP_Gateway SHALL execute the calendar event creation via Google Calendar API and mark the item as "Approved."
6. WHEN the advisor clicks the "Override" Action_Gate button (crimson), THE system SHALL cancel the calendar hold and mark the item as rejected. THE system SHALL prompt for an optional rejection reason.
7. WHEN the advisor modifies the email draft before authorizing, THE system SHALL use the modified version rather than the auto-generated version.
8. THE HITL_Approval_Center SHALL display items in chronological order (newest first) with clear visual distinction between pending, approved, and rejected states.
9. WHEN no Market_Context_Snippet is available (no Weekly_Pulse generated yet), THE email draft SHALL be generated without the market context block, with placeholder: "Market context unavailable — generate Weekly Pulse first."
10. THE approval queue SHALL be persisted in Supabase (approval_queue table) so items survive page refreshes.

#### Error States

| Scenario | Behavior |
|---|---|
| Calendar event creation fails after authorization | Display error on item. Offer "Retry" button (max 3 retries per M2 pattern). Log failure. |
| Email send fails after authorization | Mark as "Partially Approved (email pending)". Offer retry. |
| Supabase persistence failure | Fall back to Zustand session storage. Display warning about data loss risk. |

---

### Requirement 9: State Persistence & Cross-Pillar Integration

**User Story:** As a user, I want data to flow seamlessly between the three pillars, so that booking codes appear in advisor notes, weekly themes inform the voice agent, and chat context is preserved when I switch modes.

**Business Context:** Cross-pillar integration is what elevates this from three separate projects into a unified product. The assignment specifically requires: booking code visible in notes/doc (state persistence), theme flows to voice agent (Pillar B), and contextual awareness across the system. Zustand manages global state with persistence to session storage.

#### Zustand State Architecture

```typescript
interface GlobalState {
  investorState: {
    chatHistory: ChatMessage[];
    voiceSession: ConversationState | null;
    tickerData: TickerItem[];
    agentVisualState: AgentVisualState;
  };
  opsState: {
    pulseData: WeeklyPulse | null;
    approvalQueue: ApprovalItem[];
    feeExplainers: FeeExplainer[];
  };
  sharedState: {
    topTheme: string | null;
    marketContextSnippet: string | null;
    bookingCodes: BookingSummary[];
    bookingStatuses: Record<string, 'pending' | 'approved' | 'rejected'>;
    currentMode: 'investor' | 'ops';
  };
}
```

#### Acceptance Criteria

1. WHEN a Booking_Code is generated in Investor_Terminal, THE system SHALL persist it in Zustand `sharedState.bookingCodes` and make it immediately accessible in Director_Ops mode within the HITL_Approval_Center.
2. WHEN the Weekly_Pulse is generated in Director_Ops mode, THE top theme SHALL be stored in `sharedState.topTheme` and immediately available to the Theme_Aware_Agent in Investor_Terminal mode without requiring a page refresh or mode switch.
3. WHEN the user switches from Investor_Terminal to Director_Ops and back, THE chat history in Smart_Sync_KB SHALL be preserved in `investorState.chatHistory` and visible upon return.
4. WHEN a voice conversation is in progress and the user switches to Director_Ops mode, THE voice session SHALL be paused (not terminated) in `investorState.voiceSession`. Switching back SHALL resume from the last state.
5. WHEN a booking is authorized in Director_Ops, THE Booking_Code status SHALL update in `sharedState.bookingStatuses` and be queryable if the user asks about booking status in Investor_Terminal.
6. THE system SHALL persist critical state (approval queue, booking codes, pulse data) to Supabase for durability. Zustand session storage SHALL serve as the fast-access layer.
7. WHEN the Market_Context_Snippet is generated from the Weekly Pulse, THE system SHALL store it in `sharedState.marketContextSnippet` for use in HITL email draft enrichment.

---

### Requirement 10: Compliance & Safety Guardrails

**User Story:** As a responsible fintech application, I want to enforce strict compliance rules across all interaction modes, so that no financial advice is given, no PII is stored or transmitted, and all AI responses are grounded in source data.

**Business Context:** Three non-negotiable compliance policies apply across the entire application, inherited from M1 (facts-only, no advice), M2 (PII Sanitizer), and M3 (PII interception, advice deflection, brevity). These are evaluated in the Safety eval (3 adversarial prompts, 100% pass required).

#### Compliance Rules Matrix

| Rule | Trigger | Response | Priority |
|---|---|---|---|
| PII Interception | User provides SSN, account numbers, financial balances, email, phone | "For security, please hold your personal details for the secure link. Let's continue." | Highest — interrupts any state |
| Advice Deflection | User asks for investment recommendations or financial advice | "I am an AI assistant and cannot provide financial advice." | High — overrides normal flow |
| Facts-Only (Smart_Sync) | Every RAG response | All claims grounded in retrieved chunks. No fabrication, projections, or rankings. | Always active |
| Brevity (Voice) | Every voice response | Maximum 2 sentences, no filler words | Always active in voice mode |
| Disclaimer | Greeting state / chat footer | "This is informational and not investment advice." | Every new session |

#### PII Detection Patterns (from M2 + M3)

| PII Type | Detection Pattern | Redaction |
|---|---|---|
| SSN | `\d{3}-\d{2}-\d{4}` or 9 consecutive digits | `[REDACTED_SSN]` |
| Account Number | 8-16 digit sequences | `[REDACTED_ACCOUNT]` |
| Financial Balance | Currency symbols + amounts (₹, $) | `[REDACTED_BALANCE]` |
| Email Address | Standard email regex | `[REDACTED_EMAIL]` |
| Phone Number | 10+ digit sequences with optional country code | `[REDACTED_PHONE]` |
| PAN (India) | `[A-Z]{5}[0-9]{4}[A-Z]` | `[REDACTED_PAN]` |
| Aadhaar (India) | `\d{4}\s?\d{4}\s?\d{4}` | `[REDACTED_AADHAAR]` |

#### Acceptance Criteria

1. WHEN the user provides PII in any mode (voice or chat), THE PII_Sanitizer SHALL immediately intercept with: "For security, please hold your personal details for the secure link. Let's continue with scheduling." THE system SHALL NOT continue normal flow for that turn.
2. WHEN the user asks for investment recommendations, stock picks, or financial advice in any mode, THE system SHALL respond: "I am an AI assistant and cannot provide financial advice." and redirect to the appropriate functional flow.
3. WHEN PII is detected in any user input, THE PII_Sanitizer SHALL strip all PII patterns using regex detection BEFORE any persistence to Supabase, logging, or transmission to external APIs (Gemini, ElevenLabs, Google Calendar).
4. THE Smart_Sync_KB SHALL ground every factual claim in retrieved source chunks. No response SHALL contain information not traceable to a specific source. Faithfulness target: ≥0.8.
5. THE system SHALL include the compliance disclaimer "This is informational and not investment advice." in every new voice conversation greeting and as a persistent footer in the Smart_Sync chat terminal.
6. WHEN generating any output (calendar events, email drafts, booking summaries, Weekly Pulse, chat responses), THE compliance layer SHALL verify the output contains no raw PII before presenting or transmitting.
7. THE system SHALL pass 100% of adversarial safety prompts (3 prompts in the evaluation suite) by correctly refusing advice and intercepting PII.
8. THE PII_Sanitizer SHALL process reviews before storage (M2 pattern) — no raw PII in the reviews table.

---

### Requirement 11: Evaluation Suite

**User Story:** As a capstone evaluator, I want a comprehensive evaluation suite that measures RAG accuracy, safety compliance, and UX quality, so that the system's correctness can be objectively verified.

**Business Context:** The assignment mandates three evaluation types with specific pass criteria. The evaluation suite must be reproducible. Results are documented in the Evals_Report markdown file.

#### Acceptance Criteria

##### RAG Evaluation (Retrieval Accuracy)

1. THE evaluation suite SHALL include exactly 5 complex golden dataset questions that require cross-referencing multiple data sources (e.g., "Compare the expense ratio of Fund X with the exit load of Fund Y and explain which has higher ongoing costs").
2. WHEN the RAG evaluation runs, THE system SHALL measure Faithfulness (response grounded in retrieved chunks — no hallucination) and Relevance (retrieved chunks pertinent to query) for each golden question.
3. THE RAG evaluation SHALL produce a numeric score (0-1) for each question on both metrics, plus an aggregate score, documented in the Evals_Report.
4. THE golden dataset questions SHALL span all 4 fund categories (Debt, Commodities, Hybrid, Equity) and require both factsheet data AND fee data to answer correctly.

##### Safety Evaluation (Constraint Adherence)

5. THE evaluation suite SHALL include exactly 3 adversarial prompts designed to elicit: (a) financial advice, (b) PII disclosure, (c) speculative projections.
6. WHEN the Safety evaluation runs, THE system SHALL produce a binary pass/fail result for each adversarial prompt. The target is 100% pass rate (3/3).
7. THE Safety evaluation SHALL verify that the system refuses advice AND does not leak PII in its refusal response AND does not generate projections.

##### UX Evaluation (Tone & Structure)

8. THE UX evaluation SHALL verify that the Weekly_Pulse output is ≤250 words (word count check).
9. THE UX evaluation SHALL verify that the Weekly_Pulse contains exactly 3 action ideas (count check).
10. THE UX evaluation SHALL verify that the Theme_Aware_Agent greeting mentions the top theme from the Weekly_Pulse (string containment check).
11. THE Evals_Report SHALL be a markdown file documenting all evaluation results with: test name, input, expected behavior, actual behavior, pass/fail status, and scores where applicable.

---

### Requirement 12: Financial Ticker & Market Data Display

**User Story:** As a retail investor, I want to see a scrolling ticker of mutual fund NAVs at the top of the Investor Terminal, so that I have at-a-glance market awareness while using the application.

**Business Context:** The Marquee Ticker (from M1) displays data for the 20 mutual funds in the knowledge base. Data comes from the fund records in Supabase (latest NAV, NAV change). The ticker reinforces the fintech identity and provides visual context for Smart_Sync queries. Clicking a fund can pre-fill a query in the chat.

#### Acceptance Criteria

1. WHILE in Investor_Terminal mode, THE Marquee_Ticker SHALL display a continuously scrolling horizontal bar (40px height, full viewport width) showing NAV data for all 20 mutual funds.
2. THE Marquee_Ticker SHALL display for each fund: fund short name and current NAV value. Positive changes SHALL display in emerald (#00E676), negative in crimson (#FF1744).
3. THE Marquee_Ticker SHALL scroll continuously from right to left using CSS animation (not JavaScript intervals) for smooth 60fps performance, with seamless loop (no gap between last and first items).
4. WHILE in Director_Ops mode, THE Marquee_Ticker SHALL NOT be visible.
5. WHEN the application loads, THE Marquee_Ticker SHALL populate with data from the Supabase funds table within 2 seconds of page load.
6. WHEN a user clicks on a fund in the ticker, THE Smart_Sync chat terminal SHALL pre-fill a default query: "Show key stats for [Fund Name]" and auto-submit.

---

### Requirement 13: Investor Terminal UI

**User Story:** As a retail investor, I want an immersive dark-mode interface with a central AI orb, chat terminal, and voice controls, so that the experience feels premium and the AI interaction is visually engaging.

**Business Context:** The Investor Terminal layout centers on the AI_Orb (voice agent visualization from M3), with the Smart_Sync chat terminal below and the Marquee_Ticker above. The design language is "Stark-Glass HUD" — holographic, tactical, dark. Components reuse patterns from M3 (GlassPanel, NeumorphicButton, AudioVisualizer).

#### Acceptance Criteria

1. WHILE in Investor_Terminal mode, THE layout SHALL display the AI_Orb (200px × 200px) centered horizontally with amber HUD bracket decorations framing it.
2. THE AI_Orb SHALL display four distinct visual states: Idle (slowly rotating cyan #00E5FF gradient core), Listening (expanded border + waveform ring reacting to mic volume normalized 0-1), Thinking (orbiting scanner line with light trail), Speaking (pulsing cyan gradient 90%-110% scale synced to TTS audio output).
3. WHEN the AI_Orb transitions between states, THE transition SHALL animate using ease-out-expo curve (`cubic-bezier(0.16, 1, 0.3, 1)`) over 400ms. No state change SHALL snap instantly.
4. WHEN the Smart_Sync_KB produces a response, THE chat terminal SHALL render it with a typewriter animation effect (15ms stagger per character). Bullet points SHALL appear sequentially.
5. WHEN a response contains citations, THE chat terminal SHALL render Citation_Tag pill elements (rounded, semi-transparent background) adjacent to the relevant bullet point, clickable to open source URL.
6. THE Smart_Sync chat terminal SHALL render responses in a Glass_Panel container (backdrop-filter blur 24px, border 1px solid rgba(255,255,255,0.08), bg rgba(255,255,255,0.03), border-radius 16px).
7. WHEN the voice agent is active, THE chat terminal SHALL display a real-time transcript with agent messages in cyan (#00E5FF) and user messages in white.

---

### Requirement 14: Director Ops UI

**User Story:** As a product manager, I want a tactical operations dashboard showing the Weekly Pulse and HITL approval queue side by side, so that I can review intelligence and take action in a single view.

**Business Context:** Director Ops is the PM/advisor-facing mode. Its layout splits into two columns: left for Weekly Pulse briefing (read), right for HITL Approval Center (act). The amber color accent (#FFAB00) distinguishes it from the cyan Investor Terminal. Components reuse M2's approval gate pattern.

#### Acceptance Criteria

1. WHILE in Director_Ops mode, THE layout SHALL display a two-column structure: Weekly_Pulse briefing in the left column and HITL_Approval_Center in the right column.
2. WHEN the Weekly_Pulse is displayed, THE left column SHALL render: amber-bordered theme blocks (max 5, top 3 highlighted with stronger amber), a word count readout showing "X/250 words", exactly 3 quote blocks (verbatim, in quotation marks), and exactly 3 action idea items.
3. WHEN HITL approval items exist, THE right column SHALL render each item as a Glass_Panel card showing: Booking_Code (prominent, monospace font), calendar hold details (date, time, topic), email draft preview (scrollable), and Market_Context_Snippet in an amber-bordered block.
4. THE Action_Gate buttons SHALL render as a pair: "Authorize" (emerald #00E676 accent) and "Override" (crimson #FF1744 accent), using neumorphic pressed/raised states.
5. WHEN an Action_Gate button is pressed, THE button SHALL animate to a pressed neumorphic state (150ms, scale 0.97) and the approval item SHALL transition to its resolved state with appropriate color feedback.
6. WHEN no Weekly_Pulse has been generated, THE left column SHALL display: "Upload review data or generate pulse to see insights here." with a CSV upload trigger and generation button.
7. WHEN no HITL items are pending, THE right column SHALL display: "No pending approvals. Items appear here when bookings are confirmed in Investor Terminal."
8. THE Director_Ops mode SHALL include a CSV upload mechanism (drag-drop or file picker) for importing review data to feed the Weekly Pulse generator.

---

### Requirement 15: Design Tokens & Typography System

**User Story:** As a developer implementing the UI, I want a defined set of design tokens (colors, typography, spacing), so that the interface is visually consistent across all components and modes.

**Business Context:** The Stark-Glass HUD design system requires precise color and typography definitions. The dual-mode nature means two accent palettes (cyan for Investor, amber for Ops) on a shared dark base. Typography uses monospace for data/code elements and sans-serif for body text. Token values are defined as CSS custom properties (from M3's design system).

#### Acceptance Criteria

1. THE design system SHALL define base colors as CSS custom properties: `--color-base: #030508`, `--glass-bg: rgba(255,255,255,0.03)`, `--glass-border: rgba(255,255,255,0.08)`.
2. THE design system SHALL define mode-specific accent colors: `--color-investor: #00E5FF` (Arc Cyan), `--color-ops: #FFAB00` (Tactical Amber).
3. THE design system SHALL define semantic colors: `--color-success: #00E676` (Emerald), `--color-error: #FF1744` (Crimson).
4. THE typography system SHALL use monospace fonts (JetBrains Mono or Space Mono) for: Booking_Codes, NAV values, code-like data, chat terminal input, and word count readouts.
5. THE typography system SHALL use sans-serif fonts (Inter or Inter Tight for display, Inter for body) for: body text, UI labels, button text, and paragraph content.
6. THE spacing system SHALL use a 4px base unit with scale: 4, 8, 12, 16, 24, 32, 48, 64px.
7. THE Glass_Panel component SHALL use: `backdrop-filter: blur(24px)`, `border: 1px solid rgba(255,255,255,0.08)`, `background: rgba(255,255,255,0.03)`, `border-radius: 16px`, `box-shadow: 0 12px 40px -12px rgba(0,0,0,0.5)`.
8. THE motion system SHALL define: `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`, `--duration-panel: 400ms`, `--duration-hover: 200ms`.

---

### Requirement 16: Animation & Motion System

**User Story:** As a user, I want smooth, purposeful animations throughout the interface, so that transitions feel polished and state changes are clearly communicated.

**Business Context:** The animation system defines the motion language. Key animations include: mode transition scanning line, panel slide-ups (spring physics), typewriter text reveal, orb state transitions, and ticker scrolling. All animations serve functional purposes. The system respects `prefers-reduced-motion`.

#### Acceptance Criteria

1. WHEN the Mode_Switcher is activated, THE system SHALL play a horizontal Scanning_Line animation (bright line sweeping left-to-right) over 400ms before revealing the target mode's content.
2. WHEN Glass_Panel components appear, THE panels SHALL animate with a slide-up spring (from 20px below, opacity 0→1, spring: stiffness 300, damping 30).
3. WHEN the Smart_Sync chat terminal renders a response, THE text SHALL appear with typewriter stagger at 15ms per character. Bullets appear sequentially.
4. WHEN the AI_Orb transitions between states, THE transition SHALL use ease-out-expo over 400ms with no instant snapping.
5. THE Marquee_Ticker SHALL scroll using CSS animation for smooth 60fps. No pause or stutter on re-render.
6. WHEN Action_Gate buttons are pressed, THE button SHALL animate from raised to pressed neumorphic state over 150ms with scale(0.97).
7. THE system SHALL respect `prefers-reduced-motion` media query. WHEN reduced motion is preferred, decorative animations SHALL be disabled while functional state indicators are preserved.

---

### Requirement 17: Deliverables & Submission Requirements

**User Story:** As a capstone evaluator, I want all required deliverables submitted in the specified format, so that the project can be comprehensively assessed.

**Business Context:** The assignment specifies exact deliverables. Each must be complete and accessible. The demo video must demonstrate specific scenarios showing all three pillars working together.

#### Acceptance Criteria

1. THE project SHALL be submitted as a public GitHub repository containing all source code, configuration files, documentation, and the Evals Report.
2. THE project SHALL include a deployed application link (Vercel) that is publicly accessible and fully functional.
3. THE project SHALL include a 5-minute demo video demonstrating: (a) CSV data upload → Weekly Pulse generation in Director_Ops, (b) Voice call in Investor_Terminal with Pulse context in the greeting (Pillar B), (c) Smart-Sync FAQ answering a complex question spanning both fee and factsheet data (Pillar A).
4. THE project SHALL include an Evals_Report markdown file documenting: RAG eval scores for 5 golden questions (Faithfulness + Relevance), Safety eval pass/fail for 3 adversarial prompts, and UX eval results for tone/structure checks.
5. THE project SHALL include a Source_Manifest document listing 30 or more URLs of data sources, APIs, libraries, and references used.
6. THE GitHub repository SHALL include a README with: project overview, architecture diagram, setup instructions, environment variable requirements (with `.env.example`), and links to all deliverables.
7. THE deployed application SHALL be functional without requiring evaluators to configure API keys (all integrations pre-configured or gracefully degraded with mock data where keys are unavailable).

---

## 5. Technical Architecture Summary

### Environment Variables

| Variable | Purpose | Source Project |
|---|---|---|
| `GEMINI_API_KEY` | Gemini API authentication | M1, M2, M3 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | M1, M2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key | M1, M2 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server-side key | M2 |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS/STT | M3 |
| `ELEVENLABS_VOICE_ID` | Voice profile selection | M3 |
| `GOOGLE_CLIENT_EMAIL` | Google Service Account email | M3 |
| `GOOGLE_PRIVATE_KEY` | Google Service Account private key | M3 |
| `TARGET_CALENDAR_ID` | Target Google Calendar | M3 |

### Cross-Pillar Data Flow Matrix

| Data Flow | Source | Destination | Mechanism |
|---|---|---|---|
| Top Theme → Voice Greeting | Weekly_Pulse (Director_Ops) | Theme_Aware_Agent (Investor_Terminal) | Zustand `sharedState.topTheme` + Supabase |
| Booking_Code → Approval Queue | Voice Concierge (Investor_Terminal) | HITL_Approval_Center (Director_Ops) | Zustand `sharedState.bookingCodes` + Supabase |
| Market_Context_Snippet → Email Draft | Weekly_Pulse (Director_Ops) | HITL email template (Director_Ops) | Zustand `sharedState.marketContextSnippet` |
| Fund Chunks → Smart_Sync Answers | Supabase fund_chunks table | Smart_Sync_KB (Investor_Terminal) | TF-IDF retrieval + Gemini generation |
| Fee Data → Unified Response | Supabase fee_scenarios table | Smart_Sync_KB (Investor_Terminal) | Fee_Explainer module invocation |
| Chat Context → Voice Context | Smart_Sync_KB chat history | Theme_Aware_Agent | Zustand `investorState.chatHistory` |
| Booking Status → Investor Query | HITL_Approval_Center (Director_Ops) | Smart_Sync_KB (Investor_Terminal) | Zustand `sharedState.bookingStatuses` |

---

## 6. Assignment Coverage Traceability

| Assignment Requirement | Covered By |
|---|---|
| Pillar A: Smart-Sync Knowledge Base (M1+M2) | Requirements 2, 3, 7 |
| Pillar B: Insight-Driven Agent Optimization (M2+M3) | Requirements 4, 5 |
| Pillar C: Super-Agent MCP Workflow (M2+M3) | Requirement 8 |
| Single Entry Point UI | Requirement 1 |
| Zero PII | Requirement 10 |
| Zero Advice | Requirement 10 |
| State Persistence (booking code in notes/doc) | Requirement 9 |
| RAG Eval (5 golden questions, Faithfulness + Relevance) | Requirement 11 |
| Safety Eval (3 adversarial prompts, 100% pass) | Requirement 11 |
| UX Eval (≤250 words, 3 actions, theme mention) | Requirement 11 |
| GitHub Repository | Requirement 17 |
| Deployed App Link | Requirement 17 |
| 5-min Demo Video (CSV→Pulse, Voice+Pulse, Smart-Sync FAQ) | Requirement 17 |
| Evals Report | Requirement 17 |
| Source Manifest (30+ URLs) | Requirement 17 |
| Financial Ticker (20 funds) | Requirement 12 |
| Voice Agent (full lifecycle, 7-step state machine) | Requirements 4, 5 |
| Weekly Pulse (≤250 words, 3 quotes, 3 actions) | Requirement 6 |
| Fee Explainer (≤6 bullets, 2 sources, neutral tone) | Requirement 7 |
| HITL Approval (calendar hold + email draft + market context) | Requirement 8 |
| Cross-pillar data flow | Requirement 9 |
| Supabase data storage (from M1 + M2) | Requirement 2 |
| Gemini Function Calling / MCP-inspired tools (from M3) | Requirement 5 |
| Google Calendar Service Account (from M3) | Requirement 5 |
| ElevenLabs TTS/STT (from M3) | Requirement 4 |
| Chunking strategy + TF-IDF retrieval (from M1) | Requirement 2 |
| PII Sanitizer (from M2) | Requirement 10 |
| Approval Gate pattern (from M2) | Requirement 8 |
