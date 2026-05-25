/**
 * POST /api/voice/stt  — Phase 11
 *
 * ElevenLabs Speech-to-Text proxy.
 *
 * Request:
 *   multipart/form-data with field `audio` (Blob, audio/webm or wav)
 *   OR application/json with { audioBase64: string, mimeType?: string }
 *
 * Response:
 *   200 → { transcript: string, latencyMs: number }
 *   400 → invalid body / missing audio
 *   500 → ElevenLabs upstream error
 *
 * Env:
 *   - ELEVENLABS_API_KEY (required)
 *
 * Notes:
 *   - We use the `scribe_v1` model (multilingual, English-default).
 *   - Transcripts are NOT scrubbed for PII here — that happens in the
 *     downstream `/api/voice/converse` route. STT must return the raw
 *     transcription so the compliance layer can intercept correctly.
 *
 * Tracing:
 *   - Past project: `learning-2-AI-Agent-Scheduler` used Web Speech API
 *     in-browser; the capstone moves STT server-side (ElevenLabs) so
 *     we can use the better Scribe model AND keep the API key secret.
 */

import { NextResponse } from "next/server";

const STT_ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";
const DEFAULT_MODEL = "scribe_v1";
const REQUEST_TIMEOUT_MS = 25_000;

export async function POST(req: Request) {
  const started = Date.now();
  const apiKey = (process.env.ELEVENLABS_API_KEY ?? "").trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured" },
      { status: 500 },
    );
  }

  /* Accept multipart OR base64 JSON */
  const contentType = req.headers.get("content-type") ?? "";
  let audioBlob: Blob | null = null;
  let modelId = DEFAULT_MODEL;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const audioField = form.get("audio");
      if (audioField instanceof Blob) {
        audioBlob = audioField;
      }
      const modelField = form.get("modelId");
      if (typeof modelField === "string" && modelField.length > 0) {
        modelId = modelField;
      }
    } else if (contentType.includes("application/json")) {
      const body = (await req.json()) as {
        audioBase64?: string;
        mimeType?: string;
        modelId?: string;
      };
      if (body?.audioBase64) {
        const buf = Buffer.from(body.audioBase64, "base64");
        audioBlob = new Blob([buf], {
          type: body.mimeType ?? "audio/webm",
        });
      }
      if (body?.modelId) modelId = body.modelId;
    } else {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data or application/json" },
        { status: 400 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to parse request body", detail: errorMessage(err) },
      { status: 400 },
    );
  }

  if (!audioBlob || audioBlob.size === 0) {
    return NextResponse.json(
      { error: "Missing `audio` field" },
      { status: 400 },
    );
  }

  /* Build upstream multipart body */
  const upstreamForm = new FormData();
  upstreamForm.append("file", audioBlob, "audio.webm");
  upstreamForm.append("model_id", modelId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(STT_ENDPOINT, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: upstreamForm,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    return NextResponse.json(
      { error: `ElevenLabs STT request failed: ${errorMessage(err)}` },
      { status: 502 },
    );
  }
  clearTimeout(timer);

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        error: `ElevenLabs STT returned ${upstream.status}`,
        detail: text.slice(0, 300),
      },
      { status: upstream.status >= 500 ? 502 : upstream.status },
    );
  }

  type ScribeResponse = { text?: string; transcript?: string; language_code?: string };
  let parsed: ScribeResponse;
  try {
    parsed = (await upstream.json()) as ScribeResponse;
  } catch {
    return NextResponse.json(
      { error: "Failed to parse ElevenLabs STT response as JSON" },
      { status: 502 },
    );
  }

  const transcript = (parsed.text ?? parsed.transcript ?? "").trim();
  return NextResponse.json(
    {
      transcript,
      latencyMs: Date.now() - started,
      model: modelId,
      languageCode: parsed.language_code,
    },
    { status: 200 },
  );
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return String(e);
}
