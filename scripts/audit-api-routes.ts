/**
 * scripts/audit-api-routes.ts — Full backend smoke test (HTTP)
 *
 * Usage: npx tsx scripts/audit-api-routes.ts [baseUrl]
 * Default baseUrl: http://localhost:3000
 *
 * Requires a healthy Next.js server. If you see plain "Internal Server Error"
 * on all routes, run: npm run clean && npm run dev
 */

/* eslint-disable no-console */

try {
  const fn = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (typeof fn === "function") fn(".env.local");
} catch { /* ok */ }

const BASE = process.argv[2] ?? "http://localhost:3000";

interface Result {
  name: string;
  route: string;
  method: string;
  status: number;
  ok: boolean;
  detail: string;
}

const results: Result[] = [];

function isCorruptedServerResponse(status: number, text: string): boolean {
  return status === 500 && text.trim() === "Internal Server Error";
}

async function hit(
  name: string,
  route: string,
  method: string,
  body?: unknown,
  expectStatus?: number[],
  allowGemini500 = false,
): Promise<Result> {
  const url = `${BASE}${route}`;
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    let detail = text.slice(0, 120);
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
      const err = parsed.error;
      const answer = parsed.answer as { summary?: string; complianceFlag?: string } | undefined;
      if (err) detail = String(err).slice(0, 120);
      else if (answer?.summary) detail = `${answer.complianceFlag ?? "ok"} | ${answer.summary.slice(0, 60)}`;
      else if (parsed.assistantText) detail = String(parsed.assistantText).slice(0, 80);
      else if ((parsed.pulse as { summaryText?: string })?.summaryText) detail = "pulse ok";
    } catch { /* raw */ }

    let ok = expectStatus ? expectStatus.includes(res.status) : res.ok;

    if (isCorruptedServerResponse(res.status, text)) {
      ok = false;
      detail = "CORRUPTED .next — run npm run clean && npm run dev";
    } else if (
      allowGemini500 &&
      res.status === 500 &&
      parsed &&
      String(parsed.error ?? "").includes("gemini")
    ) {
      ok = true;
      detail = "Gemini quota/limit (acceptable for live RAG test)";
    }

    const r = { name, route, method, status: res.status, ok, detail };
    results.push(r);
    return r;
  } catch (err) {
    const r = {
      name,
      route,
      method,
      status: 0,
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
    results.push(r);
    return r;
  }
}

async function main() {
  console.log(`\n══ API Audit — ${BASE} ══\n`);

  await hit("chat RAG", "/api/chat", "POST", { query: "What is the expense ratio of HDFC Silver ETF FoF?" }, [200, 500], true);
  await hit("chat advice guard", "/api/chat", "POST", { query: "Should I buy HDFC Silver?" }, [200]);
  await hit("chat empty body", "/api/chat", "POST", {}, [400]);
  await hit("converse empty", "/api/voice/converse", "POST", {}, [400]);
  await hit("converse hello", "/api/voice/converse", "POST", {
    userInput: "Hello",
    conversationState: { step: "greeting", intent: "greeting", topic: "general", bookingCode: null, selectedSlot: null, contextNotes: "" },
  }, [200, 500], true);
  await hit("pulse/latest", "/api/pulse/latest", "GET", undefined, [200]);
  await hit("approvals", "/api/approvals", "GET", undefined, [200]);
  await hit("shared-state", "/api/shared-state", "GET", undefined, [200]);
  await hit("fee-explainer", "/api/fee-explainer?type=exit_load", "GET", undefined, [200]);

  let failed = 0;
  for (const r of results) {
    console.log(`  ${r.ok ? "✅" : "❌"} ${r.name} → ${r.status} | ${r.detail}`);
    if (!r.ok) failed++;
  }

  const corrupted = results.filter((r) => r.detail.includes("CORRUPTED")).length;
  if (corrupted > 0) {
    console.log("\n  ⚠️  Server appears broken (.next cache). Fix:");
    console.log("      1. Stop dev server (Ctrl+C)");
    console.log("      2. npm run clean");
    console.log("      3. npm run dev");
    console.log("      4. Re-run this audit\n");
  }

  console.log(`\n  ${results.length - failed}/${results.length} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
