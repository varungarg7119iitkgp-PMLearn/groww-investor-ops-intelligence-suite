/**
 * scripts/audit-routes-direct.ts — Backend route handler audit (no HTTP server)
 *
 * Imports route handlers directly and exercises critical paths.
 * Usage: npx tsx scripts/audit-routes-direct.ts
 */

/* eslint-disable no-console */

try {
  const fn = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (typeof fn === "function") fn(".env.local");
} catch { /* ok */ }

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

const checks: Check[] = [];

function record(name: string, pass: boolean, detail: string) {
  checks.push({ name, pass, detail });
  console.log(`  ${pass ? "✅" : "❌"} ${name} — ${detail}`);
}

async function main() {
  console.log("\n══ Direct Route Handler Audit ══\n");

  /* /api/chat */
  try {
    const { POST: chatPost } = await import("../src/app/api/chat/route");
    const bad = await chatPost(new Request("http://x/api/chat", { method: "POST", body: "{}" }));
    record("chat empty body → 400", bad.status === 400, `status=${bad.status}`);

    const advice = await chatPost(new Request("http://x/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Should I buy HDFC Silver?" }),
    }));
    const adviceJson = await advice.json();
    record(
      "chat advice guard",
      adviceJson.answer?.complianceFlag === "advice_block",
      adviceJson.answer?.complianceFlag ?? "no flag",
    );
  } catch (e) {
    record("chat routes", false, e instanceof Error ? e.message : String(e));
  }

  /* /api/voice/converse */
  try {
    const { POST: conversePost } = await import("../src/app/api/voice/converse/route");
    const empty = await conversePost(new Request("http://x/api/voice/converse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }));
    record("converse empty → 400", empty.status === 400, `status=${empty.status}`);
  } catch (e) {
    record("converse routes", false, e instanceof Error ? e.message : String(e));
  }

  /* /api/pulse/latest */
  try {
    const { GET: pulseGet } = await import("../src/app/api/pulse/latest/route");
    const res = await pulseGet();
    record("pulse/latest", res.status === 200 || res.status === 404, `status=${res.status}`);
  } catch (e) {
    record("pulse/latest", false, e instanceof Error ? e.message : String(e));
  }

  /* /api/approvals */
  try {
    const { GET: approvalsGet } = await import("../src/app/api/approvals/route");
    const res = await approvalsGet(new Request("http://localhost/api/approvals"));
    record("approvals GET", res.status === 200, `status=${res.status}`);
  } catch (e) {
    record("approvals GET", false, e instanceof Error ? e.message : String(e));
  }

  /* /api/shared-state */
  try {
    const { GET: stateGet } = await import("../src/app/api/shared-state/route");
    const res = await stateGet();
    record("shared-state GET", res.status === 200, `status=${res.status}`);
  } catch (e) {
    record("shared-state GET", false, e instanceof Error ? e.message : String(e));
  }

  /* /api/fee-explainer */
  try {
    const { GET: feeGet } = await import("../src/app/api/fee-explainer/route");
    const res = await feeGet(new Request("http://localhost/api/fee-explainer?type=exit_load"));
    record("fee-explainer GET", res.status === 200, `status=${res.status}`);
  } catch (e) {
    record("fee-explainer GET", false, e instanceof Error ? e.message : String(e));
  }

  const failed = checks.filter((c) => !c.pass).length;
  console.log(`\n  ${checks.length - failed}/${checks.length} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
