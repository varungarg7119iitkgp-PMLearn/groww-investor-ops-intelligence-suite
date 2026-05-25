/**
 * Phase 16 — Tactical HUD Map & deliverables verification tests
 */
import { describe, it, expect } from "vitest";
import { readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

describe("Phase 16 — TacticalHUDMap component", () => {
  it("component file exists and exports visible prop pattern", () => {
    const src = readFileSync(
      join(ROOT, "src/components/director/TacticalHUDMap.tsx"),
      "utf-8",
    );
    expect(src).toContain("visible: boolean");
    expect(src).toContain('aria-hidden="true"');
    expect(src).toContain("useReducedMotion");
    expect(src).toContain("Mumbai");
    expect(src).toContain("Delhi");
  });

  it("india-map-outline.svg asset exists and is under 5KB", () => {
    const p = join(ROOT, "public/india-map-outline.svg");
    expect(existsSync(p)).toBe(true);
    expect(statSync(p).size).toBeLessThan(5 * 1024);
  });

  it("component bundle is ≤ 8KB source (gzipped target proxy)", () => {
    const size = statSync(join(ROOT, "src/components/director/TacticalHUDMap.tsx")).size;
    expect(size).toBeLessThan(8 * 1024);
  });
});

describe("Phase 16 — AuroraMesh hideOrbs integration", () => {
  it("AuroraMesh accepts hideOrbs prop", () => {
    const src = readFileSync(join(ROOT, "src/components/shared/AuroraMesh.tsx"), "utf-8");
    expect(src).toContain("hideOrbs");
    expect(src).toContain("400ms ease-out");
  });

  it("page.tsx wires TacticalHUDMap to director mode", () => {
    const src = readFileSync(join(ROOT, "src/app/page.tsx"), "utf-8");
    expect(src).toContain("TacticalHUDMap");
    expect(src).toContain("hideOrbs={isDirector}");
    expect(src).toContain('visible={isDirector}');
  });
});

describe("Phase 16 — Design tokens", () => {
  it("globals.css defines map tokens", () => {
    const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf-8");
    expect(css).toContain("--map-silhouette-fill");
    expect(css).toContain("--map-arc-active");
    expect(css).toContain(".tactical-hud-map");
  });
});

describe("Phase 16 — Requirement 17 deliverables", () => {
  const required = [
    "README.md",
    "Source_Manifest.md",
    "Evals_Report.md",
    "evals-report.md",
    ".env.example",
    "DEMO_VIDEO_SCRIPT.md",
    "vercel.json",
  ];

  for (const f of required) {
    it(`includes ${f}`, () => {
      expect(existsSync(join(ROOT, f))).toBe(true);
    });
  }

  it("Source_Manifest has 30+ URL entries", () => {
    const md = readFileSync(join(ROOT, "Source_Manifest.md"), "utf-8");
    const urls = md.match(/https?:\/\/[^\s)>\]`]+/g) ?? [];
    expect(urls.length).toBeGreaterThanOrEqual(30);
  });

  it("README references deployed Vercel URL", () => {
    const md = readFileSync(join(ROOT, "README.md"), "utf-8");
    expect(md).toContain("groww-investor-ops-intelligence-sui.vercel.app");
  });

  it(".env.example documents GOOGLE_CLIENT_EMAIL and ELEVENLABS_VOICE_ID", () => {
    const env = readFileSync(join(ROOT, ".env.example"), "utf-8");
    expect(env).toContain("GOOGLE_CLIENT_EMAIL");
    expect(env).toContain("ELEVENLABS_VOICE_ID");
    expect(env).toContain("TARGET_CALENDAR_ID");
  });
});

describe("Phase 16 — Error state polish", () => {
  it("MarqueeTicker has loading shimmer", () => {
    const src = readFileSync(
      join(ROOT, "src/components/investor-terminal/MarqueeTicker.tsx"),
      "utf-8",
    );
    expect(src).toContain("ticker-shimmer");
    expect(src).toContain("ticker-loading-shimmer");
  });

  it("InvestorTerminal uses spec voice-unavailable copy", () => {
    const src = readFileSync(
      join(ROOT, "src/components/investor-terminal/InvestorTerminal.tsx"),
      "utf-8",
    );
    expect(src).toContain("Voice unavailable. Type your questions below.");
  });
});
