/**
 * Gemini Client — Phase 8
 *
 * Thin wrapper around `@google/generative-ai` mirroring the
 * `generateContent` pattern from M2 PM Pulsator's `src/lib/gemini.ts`.
 *
 * Responsibilities:
 *   - Lazy-singleton client init
 *   - Env-var gating (`GEMINI_API_KEY`)
 *   - 30-second timeout
 *   - Up to 2 retries with exponential back-off
 *   - Optional `responseMimeType: 'application/json'` for structured outputs
 *
 * Public API:
 *   - `generateContent(prompt, opts?)` → `{ text, model, latencyMs, retries }`
 *   - `parseJson(text)` → strict JSON parser tolerant of fenced code blocks
 *   - `__resetGeminiClient()` → test helper
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type {
  GenerativeModel,
  GenerationConfig,
  Content,
  Part,
  Tool,
  FunctionDeclaration,
  Schema,
} from "@google/generative-ai";

/* ────────── Defaults ────────── */
/**
 * `gemini-2.5-flash` — confirmed available and responding on this project's
 * API key (gemini-2.5-flash-lite hit 20 RPD free-tier cap; gemini-2.0-flash-lite
 * shows limit:0 on this project). gemini-2.5-flash tracks separately with a
 * 10 RPM / 250 RPD free-tier quota. Supports JSON, function calling, 1M ctx.
 */
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TEMPERATURE = 0.4;
const RETRY_BASE_DELAY_MS = 750;

/* ────────── Types ────────── */

export interface GenerateOpts {
  /** Override model name (default `gemini-1.5-flash`). */
  model?: string;
  /** Override sampling temperature (default 0.4 — leaning factual). */
  temperature?: number;
  /** Force JSON output via `responseMimeType: 'application/json'`. */
  json?: boolean;
  /** Max output tokens (default ~2048). */
  maxOutputTokens?: number;
  /** Hard timeout in milliseconds (default 30s). */
  timeoutMs?: number;
  /** Override retry count (default 2). */
  maxRetries?: number;
}

export interface GenerateResult {
  text: string;
  model: string;
  latencyMs: number;
  retries: number;
}

/* ────────── Lazy client ────────── */

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (_client) return _client;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "[gemini] GEMINI_API_KEY env var is missing. " +
        "Add it to .env.local (Phase 8 dependency).",
    );
  }
  _client = new GoogleGenerativeAI(key);
  return _client;
}

/* ────────── Core API ────────── */

/**
 * Generate text from Gemini. Throws on the LAST failed retry; never
 * returns an empty string for a successful call.
 */
export async function generateContent(
  prompt: string,
  opts: GenerateOpts = {},
): Promise<GenerateResult> {
  const modelName = opts.model ?? DEFAULT_MODEL;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const generationConfig: GenerationConfig = {
    temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
    maxOutputTokens: opts.maxOutputTokens ?? 2048,
    ...(opts.json ? { responseMimeType: "application/json" as const } : {}),
  };

  const model: GenerativeModel = getClient().getGenerativeModel({
    model: modelName,
    generationConfig,
  });

  const started = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const text = await withTimeout(
        (async () => {
          const r = await model.generateContent(prompt);
          return r.response.text();
        })(),
        timeoutMs,
      );

      if (!text || text.trim().length === 0) {
        throw new Error("Empty response from Gemini");
      }

      return {
        text,
        model: modelName,
        latencyMs: Date.now() - started,
        retries: attempt,
      };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `[gemini] Failed after ${maxRetries + 1} attempts: ${errorMessage(lastError)}`,
  );
}

/**
 * Strict JSON parser tolerant of Gemini's habit of wrapping JSON in
 * fenced code blocks (```json … ```) or adding stray prose.
 */
export function parseJson<T = unknown>(raw: string): T {
  const trimmed = raw.trim();

  /* Strip ```json … ``` or ``` … ``` fences */
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const inner = fenced ? fenced[1].trim() : trimmed;

  /* Bail if not JSON-looking */
  if (!inner.startsWith("{") && !inner.startsWith("[")) {
    throw new Error("[gemini.parseJson] not JSON-looking: " + inner.slice(0, 80));
  }

  try {
    return JSON.parse(inner) as T;
  } catch (err) {
    throw new Error(
      `[gemini.parseJson] JSON.parse failed: ${errorMessage(err)} | head=${inner.slice(0, 200)}`,
    );
  }
}

/** Test helper to reset the cached client (no-op if not yet built). */
export function __resetGeminiClient(): void {
  _client = null;
}

/* ════════════════════════════════════════════════════════════════════
   PHASE 11 — chat() wrapper with Function Calling loop
   ════════════════════════════════════════════════════════════════════ */

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export interface ChatToolDeclaration {
  name: string;
  description: string;
  /**
   * Schema shape — string-typed for portability. Mapped to SDK enums
   * internally. Supports OBJECT, STRING, NUMBER, BOOLEAN, ARRAY.
   */
  parameters: {
    type: "OBJECT";
    properties: Record<
      string,
      {
        type: "STRING" | "NUMBER" | "BOOLEAN" | "OBJECT" | "ARRAY";
        description?: string;
        enum?: string[];
      }
    >;
    required: string[];
  };
}

export type ToolCallDispatcher = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ ok: boolean; output: Record<string, unknown>; error?: string }>;

export interface ChatOpts {
  systemInstruction?: string;
  history?: ChatTurn[];
  tools?: ChatToolDeclaration[];
  toolDispatcher?: ToolCallDispatcher;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  maxToolTurns?: number; // safety cap on function-call iterations
  maxOutputTokens?: number;
}

export interface ChatResult {
  text: string;
  /** Tool calls invoked during this chat() — in invocation order */
  toolCalls: Array<{ name: string; args: Record<string, unknown>; output: Record<string, unknown>; ok: boolean }>;
  model: string;
  latencyMs: number;
}

/**
 * Chat with optional Gemini Function Calling. The loop:
 *   1. Send user prompt + system instruction + history
 *   2. If model returns a `functionCall` part, invoke the dispatcher
 *   3. Send the tool result back as a `functionResponse` part
 *   4. Repeat until model returns plain text OR maxToolTurns is hit
 *
 * The returned `text` is the final model-generated assistant text.
 */
export async function chat(userInput: string, opts: ChatOpts = {}): Promise<ChatResult> {
  const modelName = opts.model ?? DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxToolTurns = opts.maxToolTurns ?? 4;

  const generationConfig: GenerationConfig = {
    temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
    maxOutputTokens: opts.maxOutputTokens ?? 1024,
  };

  /* Map our portable declarations → SDK FunctionDeclaration[]. */
  const tools: Tool[] | undefined = opts.tools
    ? [{ functionDeclarations: opts.tools.map(toSdkDecl) }]
    : undefined;

  const systemInstruction: Content | undefined = opts.systemInstruction
    ? { role: "system", parts: [{ text: opts.systemInstruction }] }
    : undefined;

  const model: GenerativeModel = getClient().getGenerativeModel({
    model: modelName,
    generationConfig,
    tools,
    systemInstruction,
  });

  const history: Content[] = (opts.history ?? []).map((t) => ({
    role: t.role,
    parts: [{ text: t.text }],
  }));

  const session = model.startChat({ history });

  const toolCalls: ChatResult["toolCalls"] = [];
  let toolTurn = 0;
  const started = Date.now();

  let response = await withTimeout(
    (async () => (await session.sendMessage(userInput)).response)(),
    timeoutMs,
  );

  while (toolTurn < maxToolTurns) {
    const calls = extractFunctionCalls(response);
    if (calls.length === 0) break;

    if (!opts.toolDispatcher) {
      /* Model wanted a tool but caller didn't provide one — bail */
      break;
    }

    const responseParts: Part[] = [];
    for (const call of calls) {
      const result = await opts.toolDispatcher(call.name, call.args);
      toolCalls.push({
        name: call.name,
        args: call.args,
        output: result.output,
        ok: result.ok,
      });
      responseParts.push({
        functionResponse: {
          name: call.name,
          response: result.ok
            ? result.output
            : { error: result.error ?? "Tool call failed", ...result.output },
        },
      });
    }

    toolTurn += 1;
    response = await withTimeout(
      (async () => (await session.sendMessage(responseParts)).response)(),
      timeoutMs,
    );
  }

  /* Pull final text. If the loop ran out of turns and we still have
   * function calls in the last response, return an empty string —
   * caller can decide to surface an error. */
  let finalText = "";
  try {
    finalText = response.text() ?? "";
  } catch {
    finalText = "";
  }

  return {
    text: finalText.trim(),
    toolCalls,
    model: modelName,
    latencyMs: Date.now() - started,
  };
}

/* ── Function-Calling helpers ───────────────────────────────── */

/* Loose runtime view of the SDK response — keeps type-check happy. */
type ResponseLike = {
  functionCalls?: () => Array<{ name: string; args?: unknown }> | undefined;
  candidates?: Array<{ content?: { parts?: Part[] } }>;
};

function extractFunctionCalls(
  response: unknown,
): Array<{ name: string; args: Record<string, unknown> }> {
  const r = response as ResponseLike;
  const out: Array<{ name: string; args: Record<string, unknown> }> = [];

  /* SDK >=0.7 exposes `response.functionCalls()` directly */
  if (typeof r.functionCalls === "function") {
    const calls = r.functionCalls();
    if (calls && calls.length > 0) {
      for (const c of calls) {
        out.push({
          name: c.name,
          args: (c.args ?? {}) as Record<string, unknown>,
        });
      }
      return out;
    }
  }
  /* Fallback — walk candidates */
  const parts = r.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if ("functionCall" in part && part.functionCall) {
      out.push({
        name: part.functionCall.name,
        args: ((part.functionCall.args ?? {}) as unknown) as Record<string, unknown>,
      });
    }
  }
  return out;
}

function toSdkDecl(d: ChatToolDeclaration): FunctionDeclaration {
  return {
    name: d.name,
    description: d.description,
    /* The SDK's FunctionDeclarationSchema requires OBJECT type with
     * properties + required — our root schema satisfies that, so we
     * cast through unknown to silence the structural mismatch. */
    parameters: (toSdkSchema(d.parameters) as unknown) as FunctionDeclaration["parameters"],
  };
}

function toSdkSchema(
  schema: ChatToolDeclaration["parameters"] | {
    type: "STRING" | "NUMBER" | "BOOLEAN" | "OBJECT" | "ARRAY";
    description?: string;
    enum?: string[];
  },
): Schema {
  const typeMap: Record<string, SchemaType> = {
    OBJECT: SchemaType.OBJECT,
    STRING: SchemaType.STRING,
    NUMBER: SchemaType.NUMBER,
    BOOLEAN: SchemaType.BOOLEAN,
    ARRAY: SchemaType.ARRAY,
  };
  const t = typeMap[schema.type] ?? SchemaType.STRING;

  if (schema.type === "OBJECT" && "properties" in schema) {
    const properties: Record<string, Schema> = {};
    for (const [k, v] of Object.entries(schema.properties)) {
      properties[k] = toSdkSchema(v);
    }
    return {
      type: t,
      properties,
      required: schema.required,
    } as Schema;
  }

  const base: Schema = { type: t } as Schema;
  if ("description" in schema && schema.description) {
    (base as { description?: string }).description = schema.description;
  }
  if ("enum" in schema && schema.enum) {
    (base as { enum?: string[] }).enum = schema.enum;
  }
  return base;
}

/* ────────── Utilities ────────── */

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[gemini] timeout after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return String(e);
}
