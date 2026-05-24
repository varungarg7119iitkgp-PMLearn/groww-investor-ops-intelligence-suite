/**
 * ============================================================
 * COMPLETE TYPE SYSTEM — Investor Ops & Intelligence Suite
 * Phase 2: TypeScript Type System & Data Models
 *
 * Single source of truth for all types, interfaces, enums,
 * constants, and factory functions used across the project.
 *
 * Traceability:
 *  - Req 5 (State Machine): ConversationStep, IntentType, TopicType
 *  - Req 9 (State Persistence): GlobalState / UIState
 *  - Req 12 (Ticker): TickerItem
 *  - UI/UX Spec §11: UIState interface
 * ============================================================
 */

/* ============================================================
   SECTION 1 — APP MODE & NAVIGATION
   ============================================================ */

/** CSS data-mode attribute values — used on <html> element */
export type AppMode = "investor-terminal" | "director-ops";

/** Short labels used for display and Zustand state */
export type AppModeLabel = "INVESTOR" | "DIRECTOR";

export const MODE_LABEL_MAP: Record<AppMode, AppModeLabel> = {
  "investor-terminal": "INVESTOR",
  "director-ops": "DIRECTOR",
};

export const MODE_CSS_MAP: Record<AppModeLabel, AppMode> = {
  INVESTOR: "investor-terminal",
  DIRECTOR: "director-ops",
};

/* ============================================================
   SECTION 2 — BOOKING CODE
   ============================================================ */

/** Booking code: NL-[A-Z0-9]{4}  e.g. NL-A3X9 */
export type BookingCode = `NL-${string}`;

export const BOOKING_CODE_REGEX = /^NL-[A-Z0-9]{4}$/;

export function isValidBookingCode(code: string): code is BookingCode {
  return BOOKING_CODE_REGEX.test(code);
}

/* ============================================================
   SECTION 3 — CONVERSATION STATE MACHINE TYPES  (7 steps)
   Traceability: Req 5, M3 state-machine.ts
   ============================================================ */

/**
 * The 7 sequential steps of the voice agent Conversation_State_Machine.
 * Steps must be traversed in order; no skipping allowed except
 * allowed transitions defined in state-machine.ts.
 */
export type ConversationStep =
  | "idle"
  | "greeting"
  | "intent_classification"
  | "faq_resolution"
  | "booking_intent"
  | "booking_confirmation"
  | "closing";

/** All valid steps as an ordered tuple — used for validation */
export const VALID_STEPS: ConversationStep[] = [
  "idle",
  "greeting",
  "intent_classification",
  "faq_resolution",
  "booking_intent",
  "booking_confirmation",
  "closing",
];

/**
 * The 5 intent routing paths the voice agent can handle.
 * Classified from user input after the greeting step.
 */
export type IntentType =
  | "faq"        // Fund information questions → faq_resolution
  | "booking"    // Appointment scheduling → booking_intent
  | "complaint"  // Issues/feedback → faq_resolution with disclaimer
  | "general"    // General financial queries → faq_resolution
  | "unknown";   // Cannot classify → 3-strike escalation

export const VALID_INTENTS: IntentType[] = [
  "faq",
  "booking",
  "complaint",
  "general",
  "unknown",
];

/**
 * The 5 consultation topics (Topic_Taxonomy).
 * Used by RAG_Retriever to query preparation-data.json.
 */
export type TopicType =
  | "kyc"
  | "sip"
  | "statements"
  | "withdrawals"
  | "account_changes";

export const VALID_TOPICS: TopicType[] = [
  "kyc",
  "sip",
  "statements",
  "withdrawals",
  "account_changes",
];

/**
 * The 4 visual states of the AI Orb (AI_Core_Visualizer).
 * Drives animation in AIOrb.tsx.
 */
export type AgentVisualState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export const VALID_VISUAL_STATES: AgentVisualState[] = [
  "IDLE",
  "LISTENING",
  "THINKING",
  "SPEAKING",
];

/**
 * Silence timeout (ms) per conversation step.
 * If no user input received within this window, agent escalates.
 */
export const SILENCE_TIMEOUTS: Record<ConversationStep, number> = {
  idle:                  0,
  greeting:              30_000,
  intent_classification: 45_000,
  faq_resolution:        60_000,
  booking_intent:        45_000,
  booking_confirmation:  30_000,
  closing:               15_000,
};

/* ============================================================
   SECTION 4 — CONVERSATION STATE & TRANSCRIPT
   ============================================================ */

export interface TranscriptEntry {
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: string;   // ISO-8601
  step: ConversationStep;
}

/**
 * Full conversation session state.
 * Created via `createInitialConversationState()`.
 */
export interface ConversationState {
  sessionId: string;
  step: ConversationStep;
  intent?: IntentType;
  topic?: TopicType;
  bookingCode?: BookingCode;
  transcript: TranscriptEntry[];
  toolCallsMade: string[];         // tool names that fired this session
  strikeCount: number;             // for 3-strike escalation
  lastUserInput: string;
  themeGreeting?: string;          // injected from Pillar B pulse theme
  startedAt: string;               // ISO-8601
}

/**
 * Factory function — creates a clean initial conversation state.
 * @param sessionId  Unique session identifier (crypto.randomUUID())
 */
export function createInitialConversationState(
  sessionId: string
): ConversationState {
  return {
    sessionId,
    step: "idle",
    intent: undefined,
    topic: undefined,
    bookingCode: undefined,
    transcript: [],
    toolCallsMade: [],
    strikeCount: 0,
    lastUserInput: "",
    themeGreeting: undefined,
    startedAt: new Date().toISOString(),
  };
}

/* ============================================================
   SECTION 5 — CHAT MESSAGE
   ============================================================ */

export interface Citation {
  fundId: string;
  fundName: string;
  source: string;       // URL
  snippet: string;      // ~50-word excerpt
  relevanceScore: number; // 0-1
}

export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
  id: string;           // crypto.randomUUID()
  role: ChatRole;
  content: string;
  citations?: Citation[];
  timestamp: string;    // ISO-8601
  step?: ConversationStep;
  isStreaming?: boolean;
}

/**
 * Factory function — creates a ChatMessage with generated ID and timestamp.
 * @param role      Message author role
 * @param content   Message text
 * @param citations Optional citation array
 */
export function createChatMessage(
  role: ChatRole,
  content: string,
  citations?: Citation[]
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    citations: citations ?? [],
    timestamp: new Date().toISOString(),
    isStreaming: false,
  };
}

/* ============================================================
   SECTION 6 — AGENT STATE (Voice Concierge)
   ============================================================ */

export interface AgentState {
  visualState: AgentVisualState;
  audioLevel: number;         // 0-1, real-time from useAudioAnalyzer
  isMicEnabled: boolean;
  textFallbackMode: boolean;  // true when mic unavailable
  isVoiceActive: boolean;
  isMicAvailable: boolean;
}

/* ============================================================
   SECTION 7 — TOOL INTERFACES (MCP-Inspired)
   Traceability: Req 5 (Function Calling tools), M3 architecture
   ============================================================ */

/** Payload for `create_calendar_event` Gemini function call */
export interface CalendarEventPayload {
  summary: string;
  description: string;
  startDateTime: string;  // ISO-8601
  endDateTime: string;    // ISO-8601
  attendeeEmail: string;
  calendarId: string;
  bookingCode: BookingCode;
  topic: TopicType;
}

/** Result from Google Calendar API after event creation */
export interface CalendarEventResult {
  eventId: string;
  htmlLink: string;
  status: "confirmed" | "tentative" | "cancelled";
  startDateTime: string;
  bookingCode: BookingCode;
}

/** Result from the `get_preparation_docs` RAG tool */
export interface RAGResult {
  query: string;
  documents: FundChunk[];
  tfidfScores: number[];
  processingMs: number;
  retrievedAt: string;    // ISO-8601
}

/** Single preparation document for a consultation topic */
export interface PreparationDoc {
  topic: TopicType;
  title: string;
  content: string;        // plain text
  source: string;         // URL
  lastUpdated: string;    // ISO-8601 or "YYYY-MM-DD"
}

/** Result from `generate_booking_code_and_notes` */
export interface BookingSummary {
  bookingCode: BookingCode;
  investorNameRedacted: string;   // "[REDACTED]"
  topic: TopicType;
  proposedSlot: string;           // "YYYY-MM-DD HH:mm"
  advisorEmail: string;
  status: ArtifactStatus;
  contextNotes: string;           // for calendar event description
  confirmedAt?: string;           // ISO-8601
}

/* ============================================================
   SECTION 8 — DATA LAYER TYPES (Supabase)
   ============================================================ */

export type FundCategory = "equity" | "debt" | "hybrid" | "commodity";

export type ChunkType =
  | "overview"
  | "performance"
  | "fees_loads"
  | "risk"
  | "news";

/** Master fund record (20 funds, from Supabase `funds` table) */
export interface Fund {
  fundId: string;
  name: string;
  symbol: string;             // e.g. "HDFCSILV"
  category: FundCategory;
  nav: number;
  navChange: number;          // absolute change
  navChangePercent: number;   // % change
  sourceUrls: string[];
  keywordAliases: string[];   // for fund-name identification in queries
  lastUpdatedAt: string;      // ISO-8601
}

/** RAG chunk — one of 5 chunk types per fund (100 total) */
export interface FundChunk {
  id: string;
  fundId: string;
  fundName: string;
  category: FundCategory;
  chunkType: ChunkType;
  content: string;
  sourceUrls: string[];
  lastUpdatedAt: string;
  metadata?: Record<string, unknown>;
}

export type FeeScenarioType =
  | "expense_ratio"
  | "exit_load"
  | "tcs"
  | "brokerage"
  | "account_maintenance";

export interface FeeScenario {
  type: FeeScenarioType;
  title: string;
  description: string;
  typicalRange: string;
  bullets: string[];          // ≤6 bullets
  sourceUrls: string[];       // exactly 2
  lastChecked: string;        // "YYYY-MM-DD"
}

/* ============================================================
   SECTION 9 — UI STATE TYPES
   ============================================================ */

/** Marquee ticker item for a single fund display */
export interface TickerItem {
  fundId: string;
  symbol: string;
  name: string;
  nav: number;
  navChange: number;
  navChangePercent: number;
  category: FundCategory;
  isPositive: boolean;
}

export type BookingWidgetStep =
  | "date_selection"
  | "time_selection"
  | "confirm";

export interface BookingWidgetState {
  isOpen: boolean;
  step: BookingWidgetStep;
  selectedDate?: string;
  selectedTime?: string;
  proposedSlot?: string;
  proposedBookingCode?: BookingCode;
  selectedTopic?: TopicType;
}

/* ============================================================
   SECTION 10 — WEEKLY PULSE & DIRECTOR OPS
   Traceability: Req 6 (≤250 words, 5 themes, 3 quotes, 3 actions)
   ============================================================ */

export type PulseStatus = "draft" | "pending_review" | "authorized" | "rejected";

export interface PulseTheme {
  name: string;
  reviewCount: number;
  isTopThree: boolean;    // top 3 highlighted in amber
  sentiment: "positive" | "negative" | "neutral";
}

export interface WeeklyPulse {
  id: string;
  weekStart: string;          // ISO-8601
  summaryText: string;        // ≤250 words
  themes: PulseTheme[];       // max 5
  quotes: string[];           // exactly 3, PII-sanitized
  actionIdeas: string[];      // exactly 3
  wordCount: number;
  reviewCount: number;
  status: PulseStatus;
  createdAt: string;
  authorizedAt?: string;
  authorizedBy?: string;
}

export type ArtifactStatus =
  | "draft"
  | "pending_review"
  | "authorized"
  | "rejected"
  | "executed";

export interface ApprovalItem {
  id: string;
  bookingCode: BookingCode;
  investorNameRedacted: string;
  topic: TopicType;
  proposedSlot: string;
  advisorEmail: string;
  emailDraft: string;             // editable pre-authorize
  marketContextSnippet?: string;  // from latest pulse top theme
  status: ArtifactStatus;
  createdAt: string;
  authorizedAt?: string;
  overrideReason?: string;
}

export interface FeeExplainer {
  type: FeeScenarioType;
  bullets: string[];    // ≤6
  sources: string[];    // exactly 2 URLs
  lastChecked: string;  // "YYYY-MM-DD"
}

/* ============================================================
   SECTION 11 — COMPLIANCE & GUARDRAILS
   Traceability: Req 10 (Zero PII, Zero Advice, Grounded Citations)
   ============================================================ */

export type ComplianceViolationType =
  | "pii"
  | "advice"
  | "projection"
  | "out_of_scope";

export type GuardrailResult =
  | { pass: true }
  | { pass: false; reason: string; type: ComplianceViolationType };

export interface ComplianceCheckResult {
  inputGuardrail: GuardrailResult;
  outputGuardrail: GuardrailResult;
  piiDetected: boolean;
  adviceDetected: boolean;
  piiPatterns: string[];
}

/* ============================================================
   SECTION 12 — GLOBAL STATE (Zustand UIState)
   Source: UI/UX Spec §11 + Architecture requirements
   ============================================================ */

export interface UIState {
  /* Mode */
  activeMode: AppMode;
  isTransitioning: boolean;

  /* Investor Terminal */
  orbState: AgentVisualState;
  audioLevel: number;         // 0-1
  chatMessages: ChatMessage[];
  isVoiceActive: boolean;
  isMicAvailable: boolean;

  /* Booking widget */
  bookingWidget: BookingWidgetState;

  /* Director Ops */
  pulseData: WeeklyPulse | null;
  isPulseGenerating: boolean;
  hitlItems: ApprovalItem[];

  /* Shared cross-pillar state */
  topTheme: string | null;
  marketContext: string | null;
  bookingCodes: BookingSummary[];
  conversationState: ConversationState;

  /* Actions */
  toggleMode: () => void;
  setOrbState: (state: AgentVisualState) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addHitlItem: (item: ApprovalItem) => void;
  updateHitlStatus: (
    id: string,
    status: "authorized" | "rejected",
    reason?: string
  ) => void;
  setPulseData: (pulse: WeeklyPulse) => void;
  setTopTheme: (theme: string) => void;
  setMarketContext: (snippet: string) => void;
  addBookingSummary: (summary: BookingSummary) => void;
  updateConversationState: (patch: Partial<ConversationState>) => void;
  setBookingWidget: (patch: Partial<BookingWidgetState>) => void;
  resetConversation: () => void;
}

/* ============================================================
   SECTION 13 — SUPABASE ROW TYPES (Database)
   ============================================================ */

export interface FundRow {
  id: string;
  fund_id: string;
  name: string;
  symbol: string;
  category: FundCategory;
  nav: number;
  nav_change: number;
  nav_change_percent: number;
  source_urls: string[];
  keyword_aliases: string[];
  last_updated_at: string;
}

export interface FundChunkRow {
  id: string;
  fund_id: string;
  fund_name: string;
  category: FundCategory;
  chunk_type: ChunkType;
  content: string;
  source_urls: string[];
  last_updated_at: string;
  metadata: Record<string, unknown> | null;
}

export interface ReviewRow {
  id: string;
  content_redacted: string;
  category: string;
  sentiment: "positive" | "negative" | "neutral";
  gemini_tags: string[];
  source: string;
  created_at: string;
}

export interface PulseRow {
  id: string;
  week_start: string;
  summary_text: string;
  themes: PulseTheme[];
  quotes: string[];
  action_ideas: string[];
  word_count: number;
  review_count: number;
  status: PulseStatus;
  created_at: string;
  authorized_at: string | null;
  authorized_by: string | null;
}

export interface ApprovalQueueRow {
  id: string;
  booking_code: string;
  investor_name_redacted: string;
  topic: TopicType;
  proposed_slot: string;
  advisor_email: string;
  email_draft: string;
  market_context_snippet: string | null;
  status: ArtifactStatus;
  created_at: string;
  authorized_at: string | null;
  override_reason: string | null;
}

export interface FeeScenarioRow {
  id: string;
  type: FeeScenarioType;
  title: string;
  description: string;
  typical_range: string;
  bullets: string[];
  source_urls: string[];
  last_checked: string;
}

/* ============================================================
   SECTION 14 — EVALUATION TYPES
   Traceability: Req 11 (Evaluation Suite), Phase 7+ eval tables
   ============================================================ */

export type EvalType =
  | "rag_accuracy"
  | "safety_compliance"
  | "ux_structure"
  | "cross_pillar";

export interface EvalResult {
  id?: string;
  eval_type: EvalType;
  eval_name: string;
  input: string;
  expected: string;
  actual: string;
  score: number;         // 0-1 for quantitative; 1 = pass, 0 = fail for binary
  pass_fail: boolean;
  phase: number;         // which implementation phase ran this eval
  timestamp: string;     // ISO-8601
  notes?: string;
}

export interface EvalSuiteResult {
  suiteType: EvalType;
  phase: number;
  totalTests: number;
  passed: number;
  failed: number;
  aggregateScore: number;   // avg of all scores
  passRate: number;          // 0-1
  timestamp: string;
  results: EvalResult[];
}

export interface EvalResultRow {
  id: string;
  eval_type: EvalType;
  eval_name: string;
  input: string;
  expected: string;
  actual: string;
  score: number;
  pass_fail: boolean;
  phase: number;
  timestamp: string;
  notes: string | null;
}

/* ============================================================
   SECTION 15 — API RESPONSE ENVELOPE
   ============================================================ */

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;
}

export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>
): ApiResponse<T> {
  return { data, error: null, meta };
}

export function apiError<T>(error: string): ApiResponse<T> {
  return { data: null, error };
}

/* ============================================================
   SECTION 16 — FUND DOCUMENT (for RAG / TF-IDF)
   ============================================================ */

/** Used internally by the TF-IDF indexer */
export interface FundDocument {
  fundId: string;
  fundName: string;
  category: FundCategory;
  content: string;
  source: string;
  chunkType: ChunkType;
  chunkIndex: number;
}

/** Context passed to Gemini for answer generation */
export interface RagContext {
  documents: FundDocument[];
  query: string;
  tfidfScores: number[];
}

/** Full RAG response with compliance check */
export interface RagResponse {
  answer: string;
  citations: Citation[];
  guardrail: GuardrailResult;
  wordCount: number;
  tokenUsage?: { input: number; output: number };
  generatedAt: string;
}

/* ============================================================
   SECTION 17 — LEGACY / COMPATIBILITY (Phase 1 aliases)
   Kept for backwards-compatibility with Phase 1 utilities.
   ============================================================ */

/** @deprecated Use `AgentState` instead */
export interface LegacyConversationStateCompat {
  step: ConversationStep;
  sessionId: string;
  bookingCode?: BookingCode;
  themeGreeting?: string;
  transcript: TranscriptEntry[];
  toolCallsMade: string[];
}
