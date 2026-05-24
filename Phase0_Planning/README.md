# Phase 0 — Planning & Context
## Investor Ops & Intelligence Suite — Capstone Project

> **Status:** Complete. All planning documents are finalized. Proceed to Phase 1 implementation.

---

## Folder Contents

| Document | Purpose | Size |
|---|---|---|
| [`Capstone_architecture.md`](./Capstone_architecture.md) | **Primary implementation Bible.** Phase-by-phase roadmap (Phases 1–16) with tasks, deliverables, verification gates, and AI Eval gates. Use this to drive every implementation decision. | 54KB |
| [`Capstone_requirements.md`](./Capstone_requirements.md) | **Master source of truth.** 17 numbered requirements with full acceptance criteria, glossary, Supabase schema, cross-pillar data flow matrix, and assignment coverage traceability. | 60KB |
| [`Capstone_ui-ux-requirements.md`](./Capstone_ui-ux-requirements.md) | **Pixel-level UI/UX specification.** Stark-Glass HUD design system, component specs, CSS custom properties, animation variants, Framer Motion code, file structure, interaction flows. | 36KB |
| [`PAST_PROJECTS_CONTEXT.md`](./PAST_PROJECTS_CONTEXT.md) | **Foundation layer reference.** Deep-dive into all three prior GitHub repos (M1 RAG Chatbot, M2 PM Pulsator, M3 Voice Agent) with full stack detail, database schemas, type systems, and integration contracts. | 32KB |

---

## Project Identity

| Property | Value |
|---|---|
| **Product Name** | Investor Ops & Intelligence Suite |
| **Entry Point** | Single-page Next.js app, one URL, two modes |
| **Modes** | `INVESTOR_TERMINAL` (retail investors) + `DIRECTOR_OPS` (PM/advisors) |
| **Three Pillars** | A: Smart-Sync KB · B: Theme-Aware Agent · C: Super-Agent HITL Workflow |

---

## Technology Stack (Final)

| Layer | Technology | Source |
|---|---|---|
| Framework | Next.js 15 App Router, TypeScript 5 | — |
| Styling | Tailwind CSS v4 + CSS custom properties | — |
| Animation | Framer Motion (latest) | M3 |
| State | Zustand | — |
| Database | Supabase (PostgreSQL) | M2 |
| LLM | Gemini 2.0 Flash (fast) + 2.0 Pro (generation) | M1, M2, M3 |
| Voice | ElevenLabs API (TTS + STT) | M3 |
| Calendar | Google Calendar API v3 (Service Account) | M3 |
| Retrieval | TF-IDF index (local) | M1 |
| Testing | Vitest + fast-check (property tests) | M3 |
| Deployment | Vercel (serverless + CRON) | — |

---

## Implementation Roadmap (16 Phases)

```
PHASE GROUP 1 — UI SHELL (Phases 1–6)
  Phase 1 · Project Scaffolding & Design Token System
  Phase 2 · TypeScript Type System & Data Models
  Phase 3 · UI Foundation (Stark-Glass HUD Components)
  Phase 4 · Investor Terminal UI Shell (Static)
  Phase 5 · Director Ops UI Shell (Static)
  Phase 6 · Mode Switcher & Global Navigation
  ── CHECKPOINT: Full UI Shell Complete ──

PHASE GROUP 2 — BACKEND LOGIC (Phases 7–11)
  Phase 7  · Data Layer & Supabase Setup
  Phase 8  · RAG Infrastructure & Smart-Sync KB
  ── AI EVAL GATE: RAG Accuracy ≥0.7 ──
  Phase 9  · Compliance Layer & PII Protection
  ── AI EVAL GATE: Safety 3/3 ──
  Phase 10 · Voice Agent: State Machine & MCP Tools
  Phase 11 · Gemini Integration & Full API Wiring
  ── AI EVAL GATE: RAG ≥0.8 + Safety 3/3 ──
  ── CHECKPOINT: Backend Logic Complete ──

PHASE GROUP 3 — INTEGRATION (Phases 12–14)
  Phase 12 · Weekly Pulse & Fee Explainer Engine
  ── AI EVAL GATE: UX Structure (≤250 words, 3 actions, 3 quotes) ──
  Phase 13 · HITL Approval Center & MCP Gateway
  Phase 14 · Cross-Pillar Integration & State Wiring
  ── AI EVAL GATE: Cross-Pillar Full System ──

PHASE GROUP 4 — DELIVERY (Phases 15–16)
  Phase 15 · Final Evaluation Suite & Evals Report
  Phase 16 · End-to-End Polish, Deployment & Deliverables
```

---

## Critical Non-Negotiables (from Requirements + Past Projects)

### 1. PII Rules
- Run `containsPII()` before every storage/output/API call
- Replace all PII with `[REDACTED_TYPE]` — never drop the sentence
- Applies everywhere: chat, voice, pulse, calendar notes, email drafts

### 2. No-Advice Rule
- Smart-Sync KB: facts only, all claims traceable to retrieved chunks
- Voice agent: compliance disclaimer in every greeting
- Zero buy/sell/hold/recommend language in any output

### 3. HITL Gate Pattern
- All AI artefacts (bookings, pulses, email drafts) start as `status: 'draft'`
- Downstream actions (calendar creation, email send) execute ONLY on `'approved'`
- Enforced by `ActionGate` component — no auto-execution

### 4. Booking Code Format
- Pattern: `NL-[A-Z0-9]{4}` validated by `BOOKING_CODE_REGEX`
- Generated via `crypto.randomBytes` with session-level uniqueness Set
- This code is the cross-pillar state persistence key visible in all three modes

### 5. Strict Output Constraints
- Weekly Pulse: ≤250 words, exactly 5 themes max (top 3 highlighted), exactly 3 quotes, exactly 3 action ideas
- Smart-Sync responses: exactly 6 bullets + at least 1 citation + "Last updated" timestamp
- Voice responses: max 2 sentences, no filler words, 1 question per turn
- Mock slots: always exactly 2 (one morning + one afternoon)

---

## Key Foundation Assets from Prior Projects

### From M1 (RAG Chatbot) — Reuse Directly
- **20-fund TF-IDF index** (`metadata.json`, `tf_matrix.npy`, `vocab.json`) — the retrieval brain
- **Guardrails logic** (`_ADVICE_PHRASES`, `_is_advice_like()`) — port to TypeScript `compliance.ts`
- **Fund universe** (`config/fund_universe.csv`) — seed Supabase `funds` table
- **Chunk structure** — 5 types per fund: overview, performance, fees_loads, risk, news

### From M2 (PM Pulsator) — Reuse Directly
- **Supabase schema** — extend, don't rebuild (`reviews`, `weekly_pulses`, `approval_queue`)
- **AI categorizer** — 25-reviews/batch, 3 retries, 5s inter-batch delay
- **Pulse generation prompt** + output validation (≤250 words enforced with retry)
- **HITL approval pattern** — `draft→approved→rejected` flow
- **PII sanitizer** — port regex patterns to shared `compliance.ts`

### From M3 (Voice Agent) — Reuse Directly
- **`state-machine.ts`** — 7-step machine, all functions (`getNextState`, `getPromptForState`, `classifyIntent`, `isValidTopic`, `generateMockSlots`, `getRephraseForState`)
- **`types/index.ts`** — entire type system (`ConversationState`, `BookingSummary`, `UiAction`, all constants)
- **`tools/calendar.ts`** — Google Calendar Service Account auth
- **Aurora-Glass UI** — `GlassPanel`, `NeumorphicButton`, `AuroraMesh`, `AudioVisualizer`
- **`useVoiceInteraction`**, **`useConversation`**, **`useAudioAnalyzer`** hooks

---

## Supabase Schema (New Tables Required — in Addition to M2 Inherited)

```sql
-- New tables for capstone
funds              (id, name, category, nav, nav_change, keywords_aliases[], source_urls[], last_updated_at)
fund_chunks        (id, fund_id FK, chunk_type, content, metadata JSONB, source_urls[], last_updated_at)
fee_scenarios      (id, scenario_type, bullets JSONB, source_urls[], last_checked)
approval_queue     (id, booking_code, topic, slot, user_context, email_draft, market_context,
                    status 'pending'|'approved'|'rejected', created_at, resolved_at)
eval_results       (id, eval_type, eval_name, input, expected, actual, score, pass_fail, phase, timestamp)

-- Inherited from M2 (already exist in Supabase project)
reviews            -- PII-sanitized review data
weekly_pulses      -- pulse_content, themes JSONB, quotes JSONB, action_ideas JSONB, status, generated_at
```

---

## Environment Variables Needed

```env
# Phase 7+
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Phase 10+
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
TARGET_CALENDAR_ID=
```

---

## Phase 1 Pre-Flight Checklist

Before starting Phase 1, confirm:
- [ ] Next.js 15 project already scaffolded (workspace root) — YES ✓
- [ ] `package.json` exists with Next.js 15.5.9 — YES ✓
- [ ] `app/` directory exists — YES ✓
- [ ] Vercel deployment connected — YES ✓ (https://groww-investor-ops-intelligence-sui.vercel.app)
- [ ] Supabase MCP configured — YES ✓ (`user-supabase` MCP enabled)
- [ ] Phase0_Planning folder complete — YES ✓

**Ready to proceed to Phase 1.**

---

*Phase 0 completed: May 2026. All planning documents finalized. Implementation begins at Phase 1.*
