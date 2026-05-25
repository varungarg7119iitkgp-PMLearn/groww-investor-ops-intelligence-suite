/**
 * scripts/eval-cross-pillar.ts — Phase 14 Cross-Pillar Eval Gate
 *
 * Usage: npx tsx scripts/eval-cross-pillar.ts
 * Exit 0 = PASS, 1 = FAIL
 */

/* eslint-disable no-console */

import { execSync } from "node:child_process";

{
  const proc = process as unknown as { loadEnvFile?: (path: string) => void };
  if (typeof proc.loadEnvFile === "function") {
    try { proc.loadEnvFile(".env.local"); } catch { /* ok */ }
  }
}

console.log("═══════════════════════════════════════════════════════════════");
console.log("  PHASE 14 — CROSS-PILLAR INTEGRATION AI EVAL GATE");
console.log("═══════════════════════════════════════════════════════════════\n");

let pass = 0;
let fail = 0;

function runCheck(name: string, cmd: string) {
  process.stdout.write(`→ ${name}... `);
  try {
    execSync(cmd, { stdio: "pipe", encoding: "utf-8" });
    console.log("✅ PASS");
    pass++;
  } catch (err) {
    console.log("❌ FAIL");
    if (err instanceof Error && "stdout" in err) {
      const e = err as { stdout?: string; stderr?: string };
      console.log((e.stdout ?? e.stderr ?? "").slice(0, 400));
    }
    fail++;
  }
}

runCheck(
  "Test 1–3: Cross-pillar unit + eval tests",
  "npx vitest run Phase14/__tests__ --reporter=dot",
);

runCheck(
  "Test 4: Phase 13 HITL regression",
  "npx vitest run Phase13/__tests__/eval-hitl.test.ts --reporter=dot",
);

runCheck(
  "Test 5: TypeScript compilation",
  "npx tsc --noEmit",
);

console.log("\n═══════════════════════════════════════════════════════════════");
console.log(`  Results: ${pass} passed, ${fail} failed`);
console.log(`  GATE: ${fail === 0 ? "✅ PASS" : "❌ FAIL"}`);
console.log("═══════════════════════════════════════════════════════════════\n");

process.exit(fail === 0 ? 0 : 1);
