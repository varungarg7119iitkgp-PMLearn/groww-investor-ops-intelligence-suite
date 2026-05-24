/**
 * Preparation-doc Retriever — Phase 10
 *
 * Topic-keyed RAG over `preparation-data.json` for the Voice Agent
 * (Pillar C). Separate from Phase 8's `rag-retriever.ts` which handles
 * the 20-fund chunked KB (Pillar A).
 *
 * Tool name (Gemini Function Calling): `get_preparation_docs`
 *
 * Inputs:
 *   - `topic`  TopicType — required
 *   - `query?` string    — optional keyword filter within topic
 *   - `k?`     number    — max docs (default 2)
 *
 * Returns RAGResult-shaped envelope (typed loosely to allow voice
 * prep docs OR fund chunks — see `src/types/index.ts:RAGResult`).
 */

import prepData from "./preparation-data.json";
import { type PreparationDoc, type TopicType, VALID_TOPICS } from "@/types";

export interface PrepRetrievalResult {
  topic: TopicType;
  query: string;
  documents: PreparationDoc[];
  scores: number[];
  found: boolean;
  retrievedAt: string;
  processingMs: number;
  source: "preparation-data.json";
}

interface PreparationFile {
  version: string;
  lastUpdated: string;
  topics: Record<TopicType, PreparationDoc[]>;
}

const DATA = prepData as PreparationFile;

/**
 * Retrieve the top-k preparation docs for a topic.
 * If `query` is provided, applies a simple TF-style keyword match
 * to rank docs within the topic; otherwise returns docs in their
 * declared order (most-canonical first).
 */
export async function getPreparationDocs(
  topic: TopicType,
  options: { query?: string; k?: number } = {},
): Promise<PrepRetrievalResult> {
  const started = Date.now();
  const { query = "", k = 2 } = options;

  if (!(VALID_TOPICS as readonly string[]).includes(topic)) {
    return {
      topic,
      query,
      documents: [],
      scores: [],
      found: false,
      retrievedAt: new Date().toISOString(),
      processingMs: Date.now() - started,
      source: "preparation-data.json",
    };
  }

  const allDocs = DATA.topics[topic] ?? [];
  if (allDocs.length === 0) {
    return {
      topic,
      query,
      documents: [],
      scores: [],
      found: false,
      retrievedAt: new Date().toISOString(),
      processingMs: Date.now() - started,
      source: "preparation-data.json",
    };
  }

  let ranked: Array<{ doc: PreparationDoc; score: number }>;

  if (query.trim().length === 0) {
    /* No filter — return in declared order with score=1.0 */
    ranked = allDocs.map((doc) => ({ doc, score: 1.0 }));
  } else {
    const tokens = tokenize(query);
    if (tokens.length === 0) {
      ranked = allDocs.map((doc) => ({ doc, score: 1.0 }));
    } else {
      ranked = allDocs.map((doc) => {
        const haystack = `${doc.title} ${doc.content}`.toLowerCase();
        const hits = tokens.reduce(
          (sum, tok) => sum + (haystack.includes(tok) ? 1 : 0),
          0,
        );
        return { doc, score: hits / tokens.length };
      });
      ranked.sort((a, b) => b.score - a.score);
      /* If all scores are 0, fall back to declared order */
      if (ranked.every((r) => r.score === 0)) {
        ranked = allDocs.map((doc) => ({ doc, score: 0.5 }));
      }
    }
  }

  const topK = ranked.slice(0, Math.max(1, k));
  return {
    topic,
    query,
    documents: topK.map((r) => r.doc),
    scores: topK.map((r) => r.score),
    found: true,
    retrievedAt: new Date().toISOString(),
    processingMs: Date.now() - started,
    source: "preparation-data.json",
  };
}

/** All topic ids exposed for callers (e.g. UI dropdown). */
export function listTopics(): TopicType[] {
  return [...VALID_TOPICS];
}

/** Count of docs per topic (for diagnostics). */
export function getDocCounts(): Record<TopicType, number> {
  return Object.fromEntries(
    VALID_TOPICS.map((t) => [t, DATA.topics[t]?.length ?? 0]),
  ) as Record<TopicType, number>;
}

/** Metadata about the loaded prep dataset. */
export function getPrepDataMeta() {
  return { version: DATA.version, lastUpdated: DATA.lastUpdated };
}

/* ── helpers ─────────────────────────────────────────────────── */

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}
