/**
 * RAG Retriever — Phase 8
 *
 * Pure-TypeScript TF-IDF cosine-similarity index over the 100 fund chunks
 * seeded in Phase 7. Modeled on M1's Mutual Fund RAG Chatbot
 * (`backend/app/rag/indexer.py`) but ported to TS so the entire RAG
 * pipeline runs server-side inside the Next.js process — no Python
 * sidecar, no external retrieval service.
 *
 * Public API:
 *   - `buildIndex()`             → fetch chunks from Supabase, build index (idempotent)
 *   - `retrieveTopK(query, opts)` → top-k chunks by cosine similarity
 *   - `__resetIndex()`           → test helper
 *
 * Determinism: the index is pure-deterministic given the same chunk
 * corpus (same vocab, same IDF, same scoring). The only non-determinism
 * is the Supabase fetch order, which we explicitly sort by
 * (fund_id, chunk_type) before indexing.
 *
 * Performance: index build is O(N * tokens). 100 chunks * ~80 tokens =
 * 8000 token-chunk-tuples. Building takes < 50ms on the test box.
 * Retrieval is O(V + matches) where V is vocabulary size (~600 terms).
 */

import { getAllChunks } from "@/lib/data";
import type { FundChunk, FundCategory, ChunkType } from "@/types";

/* ════════════════════════════════════════════════════════════════════
   TOKENIZATION
   ════════════════════════════════════════════════════════════════════ */

/**
 * Small English stop-word list — pruned from the standard NLTK list to
 * keep finance-relevant terms ("fund", "risk", "low", "high", "rate",
 * "ratio", etc.) in the vocabulary.
 */
const STOPWORDS = new Set<string>([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "when",
  "while", "of", "at", "by", "for", "with", "about", "against",
  "between", "into", "through", "during", "before", "after",
  "above", "below", "to", "from", "in", "out", "on", "off", "over",
  "under", "again", "further", "is", "am", "are", "was", "were", "be",
  "been", "being", "have", "has", "had", "having", "do", "does", "did",
  "doing", "this", "that", "these", "those", "i", "you", "your", "we",
  "our", "they", "them", "their", "my", "me", "it", "its", "as", "so",
  "than", "too", "very", "s", "t", "can", "will", "just", "now", "what",
  "how", "why", "where", "which", "who", "whom",
]);

/** Tokenize: lowercase → split on non-alphanumeric → drop stopwords / 1-char tokens. */
export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Compute term-frequency dictionary for an array of tokens. */
export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const tok of tokens) {
    tf.set(tok, (tf.get(tok) ?? 0) + 1);
  }
  return tf;
}

/* ════════════════════════════════════════════════════════════════════
   INDEX STATE
   ════════════════════════════════════════════════════════════════════ */

interface IndexedChunk {
  chunk: FundChunk;
  /** Sparse weighted vector — only non-zero TF-IDF terms */
  vector: Map<string, number>;
  /** L2 norm of `vector` — precomputed for cosine denominator */
  norm: number;
}

interface RagIndex {
  chunks: IndexedChunk[];
  /** IDF[term] = ln(N / (1 + df)) + 1 (smoothed) */
  idf: Map<string, number>;
  builtAt: string;
  /** Total documents (chunks) in index */
  N: number;
}

let _index: RagIndex | null = null;
let _buildPromise: Promise<RagIndex> | null = null;

/* ════════════════════════════════════════════════════════════════════
   INDEX BUILD
   ════════════════════════════════════════════════════════════════════ */

/**
 * Build the TF-IDF index from Supabase chunks. Idempotent — returns the
 * cached index after the first call. Use `__resetIndex()` in tests to
 * force a rebuild.
 *
 * Concurrency-safe: simultaneous callers share the same in-flight
 * promise so we never double-fetch the corpus.
 */
export async function buildIndex(): Promise<RagIndex> {
  if (_index) return _index;
  if (_buildPromise) return _buildPromise;

  _buildPromise = (async () => {
    const res = await getAllChunks();
    if (res.error || !res.data) {
      throw new Error(`[rag-retriever] Cannot build index: ${res.error ?? "no data"}`);
    }
    const rawChunks: FundChunk[] = [...res.data].sort((a, b) => {
      if (a.fundId !== b.fundId) return a.fundId.localeCompare(b.fundId);
      return a.chunkType.localeCompare(b.chunkType);
    });

    /* ── Pass 1: tokenize, build TF per chunk, accumulate document frequency ── */
    const tfPerChunk: Array<Map<string, number>> = [];
    const documentFrequency = new Map<string, number>();

    for (const c of rawChunks) {
      const tokens = tokenize(c.content);
      const tf = termFrequency(tokens);
      tfPerChunk.push(tf);
      for (const term of tf.keys()) {
        documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
      }
    }

    /* ── Pass 2: compute IDF (smoothed) ── */
    const N = rawChunks.length;
    const idf = new Map<string, number>();
    for (const [term, df] of documentFrequency) {
      idf.set(term, Math.log(N / (1 + df)) + 1);
    }

    /* ── Pass 3: weight TF by IDF, compute L2 norm ── */
    const indexed: IndexedChunk[] = rawChunks.map((chunk, i) => {
      const tf = tfPerChunk[i];
      const vector = new Map<string, number>();
      let sumSquares = 0;
      for (const [term, count] of tf) {
        const weight = count * (idf.get(term) ?? 0);
        if (weight === 0) continue;
        vector.set(term, weight);
        sumSquares += weight * weight;
      }
      return { chunk, vector, norm: Math.sqrt(sumSquares) };
    });

    _index = {
      chunks: indexed,
      idf,
      builtAt: new Date().toISOString(),
      N,
    };
    return _index;
  })();

  try {
    return await _buildPromise;
  } finally {
    _buildPromise = null;
  }
}

/* ════════════════════════════════════════════════════════════════════
   RETRIEVAL
   ════════════════════════════════════════════════════════════════════ */

export interface RetrieveOpts {
  /** Top-k chunks to return; default 8, clamped to [1, 16] per architecture spec. */
  k?: number;
  /**
   * Restrict to chunks whose fund_id is in this allowlist. Used by the
   * fund identifier when a user explicitly names one or more funds.
   */
  fundIds?: string[];
  /** Restrict by chunk type — e.g. only `performance` chunks. */
  chunkTypes?: ChunkType[];
  /** Restrict by fund category. */
  categories?: FundCategory[];
  /** Minimum cosine score (filter post-ranking). Default 0 (no filter). */
  minScore?: number;
}

export interface RetrievedChunk {
  chunk: FundChunk;
  score: number;
}

/**
 * Returns the top-k chunks ranked by cosine similarity to `query`.
 * Filters in this order:
 *   1. fundIds (allowlist)
 *   2. chunkTypes
 *   3. categories
 *   4. minScore (post-ranking)
 *
 * If `query` has no in-vocabulary terms, returns an empty array
 * (no fabrication).
 */
export async function retrieveTopK(
  query: string,
  opts: RetrieveOpts = {},
): Promise<RetrievedChunk[]> {
  const k = clamp(opts.k ?? 8, 1, 16);
  const idx = await buildIndex();

  /* ── Build the query vector with the index's IDF weights ── */
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const queryTf = termFrequency(queryTokens);
  const queryVec = new Map<string, number>();
  let querySumSquares = 0;
  for (const [term, count] of queryTf) {
    const idf = idx.idf.get(term);
    if (idf === undefined) continue; // OOV term — skip
    const weight = count * idf;
    queryVec.set(term, weight);
    querySumSquares += weight * weight;
  }
  const queryNorm = Math.sqrt(querySumSquares);
  if (queryNorm === 0) return []; // all tokens OOV

  /* ── Score every chunk that survives the filters ── */
  const scored: RetrievedChunk[] = [];
  for (const ic of idx.chunks) {
    if (opts.fundIds && opts.fundIds.length > 0 && !opts.fundIds.includes(ic.chunk.fundId)) continue;
    if (opts.chunkTypes && opts.chunkTypes.length > 0 && !opts.chunkTypes.includes(ic.chunk.chunkType)) continue;
    if (opts.categories && opts.categories.length > 0 && !opts.categories.includes(ic.chunk.category)) continue;
    if (ic.norm === 0) continue;

    /* Dot product over the smaller of (queryVec, ic.vector) — micro-optim */
    const [outer, inner] = queryVec.size <= ic.vector.size
      ? [queryVec, ic.vector]
      : [ic.vector, queryVec];

    let dot = 0;
    for (const [term, w] of outer) {
      const other = inner.get(term);
      if (other !== undefined) dot += w * other;
    }
    if (dot === 0) continue;

    const score = dot / (queryNorm * ic.norm);
    if (opts.minScore !== undefined && score < opts.minScore) continue;
    scored.push({ chunk: ic.chunk, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/* ════════════════════════════════════════════════════════════════════
   UTILITIES
   ════════════════════════════════════════════════════════════════════ */

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Inspect the current index — used by tests + the eval gate. */
export async function getIndexStats(): Promise<{
  N: number;
  vocabSize: number;
  builtAt: string;
}> {
  const idx = await buildIndex();
  return { N: idx.N, vocabSize: idx.idf.size, builtAt: idx.builtAt };
}

/** Test helper: drop the cached index so the next call rebuilds. */
export function __resetIndex(): void {
  _index = null;
  _buildPromise = null;
}
