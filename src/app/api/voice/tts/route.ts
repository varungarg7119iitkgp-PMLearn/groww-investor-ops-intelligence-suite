/**
 * POST /api/voice/tts  — Phase 11
 *
 * ElevenLabs Text-to-Speech proxy.
 *
 * Request:
 *   { text: string, voiceId?: string, modelId?: string }
 *
 * Response:
 *   200 → audio/mpeg stream
 *   400 → invalid body / text too long
 *   500 → ElevenLabs upstream error
 *
 * Env:
 *   - ELEVENLABS_API_KEY     (required)
 *   - ELEVENLABS_VOICE_ID    (default voice fallback)
 *
 * Notes:
 *   - We enforce ≤ 600 chars input (≈ 2 sentences = voice-agent norm).
 *   - PII scrub via Phase 9's `redactPII` BEFORE upstream call so we
 *     never vocalize personal data even if upstream caller leaks.
 *   - `enforceBrevity` trims fillers + clamps to 2 sentences.
 */

import { NextResponse } from "next/server";
import { redactPII, enforceBrevity, runOutputGuard } from "@/lib/compliance";

const TTS_ENDPOINT_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_MODEL = "eleven_turbo_v2_5";
const MAX_INPUT_CHARS = 600;
const REQUEST_TIMEOUT_MS = 15_000;

export async function POST(req: Request) {
  let body: { text?: string; voiceId?: string; modelId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId =
    body.voiceId || process.env.ELEVENLABS_VOICE_ID || "IaWqJvI9YWSfioAadRXU";
  const modelId = body.modelId || DEFAULT_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const rawText = String(body?.text ?? "").trim();
  if (!rawText) {
    return NextResponse.json(
      { error: "`text` is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  /* Compliance: scrub PII + enforce brevity */
  const scrubbed = redactPII(rawText).text;
  const brief = enforceBrevity(scrubbed, { mode: "voice", maxSentences: 2 });

  if (brief.length === 0) {
    return NextResponse.json(
      { error: "Text was empty after PII scrub / brevity" },
      { status: 400 },
    );
  }

  if (brief.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Text exceeds ${MAX_INPUT_CHARS} char limit (≈ 2 sentences)` },
      { status: 400 },
    );
  }

  /* Defense-in-depth output guard — block advice */
  const guard = runOutputGuard(brief);
  if (!guard.pass) {
    return NextResponse.json(
      { error: `Compliance guard: ${guard.reason}` },
      { status: 400 },
    );
  }

  /* Upstream call */
  const url = `${TTS_ENDPOINT_BASE}/${encodeURIComponent(voiceId)}?optimize_streaming_latency=2&output_format=mp3_44100_128`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: brief,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `ElevenLabs request failed: ${message}` },
      { status: 502 },
    );
  }
  clearTimeout(timer);

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        error: `ElevenLabs upstream returned ${upstream.status}`,
        detail: text.slice(0, 300),
      },
      { status: upstream.status >= 500 ? 502 : upstream.status },
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "X-Voice-Id": voiceId,
      "X-Model-Id": modelId,
    },
  });
}
