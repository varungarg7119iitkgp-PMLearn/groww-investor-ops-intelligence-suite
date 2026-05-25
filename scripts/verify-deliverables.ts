/**
 * scripts/verify-deliverables.ts — Phase 16 final verification
 *
 * Usage: npx tsx scripts/verify-deliverables.ts
 */

/* eslint-disable no-console */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

const checks: Check[] = [];

function check(name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
}

const files = [
  "README.md",
  "Source_Manifest.md",
  "Evals_Report.md",
  "evals-report.md",
  ".env.example",
  "DEMO_VIDEO_SCRIPT.md",
  "src/components/director/TacticalHUDMap.tsx",
  "public/india-map-outline.svg",
];

for (const f of files) {
  check(`File: ${f}`, existsSync(join(ROOT, f)));
}

const manifest = readFileSync(join(ROOT, "Source_Manifest.md"), "utf-8");
const urlCount = (manifest.match(/https?:\/\//g) ?? []).length;
check("Source_Manifest ≥30 URLs", urlCount >= 30, `found ${urlCount}`);

const evalReport = existsSync(join(ROOT, "evals-report.md"))
  ? readFileSync(join(ROOT, "evals-report.md"), "utf-8")
  : "";
check("evals-report.md PASS gate", evalReport.includes("PASS ✅"));

const readme = readFileSync(join(ROOT, "README.md"), "utf-8");
check("README not under construction", !readme.includes("Under construction"));
check("README has architecture section", readme.includes("Architecture"));

console.log("\n══ Phase 16 Deliverables Verification ══\n");
let failed = 0;
for (const c of checks) {
  const icon = c.pass ? "✅" : "❌";
  console.log(`  ${icon} ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
  if (!c.pass) failed++;
}
console.log(`\n  Total: ${checks.length - failed}/${checks.length} passed\n`);
process.exit(failed > 0 ? 1 : 0);
