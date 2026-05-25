# Phase 16 — Test Cases Log

**Date:** 2026-05-25

## Automated

| ID | Test | Result |
|----|------|--------|
| P16-T01 | TacticalHUDMap exports + cities | ✅ |
| P16-T02 | india-map-outline.svg < 5KB | ✅ |
| P16-T03 | Component source ≤ 8KB | ✅ |
| P16-T04 | AuroraMesh hideOrbs prop | ✅ |
| P16-T05 | page.tsx wires map to director mode | ✅ |
| P16-T06 | Map CSS tokens in globals.css | ✅ |
| P16-T07 | Req 17 deliverable files exist | ✅ |
| P16-T08 | Source_Manifest ≥ 30 URLs | ✅ |
| P16-T09 | .env.example var names | ✅ |
| P16-T10 | Ticker loading shimmer | ✅ |
| P16-T11 | Voice unavailable copy | ✅ |
| P16-V01 | verify-deliverables script | ✅ |
| P16-B01 | `npm run build` | ✅ |

Run: `npx vitest run Phase16 --reporter=verbose`

---

## Manual verification

### M1 — Tactical HUD (desktop)

1. Open http://localhost:3000/?mode=director (or switch via Director Ops tab)
2. **Expected:** Violet/emerald orbs fade out; amber India silhouette, grid, 6 city nodes, animated arcs
3. Resize to ≤640px — **Expected:** map hidden, standard background

### M2 — Mode transition

1. Switch Investor Hub ↔ Director Ops
2. **Expected:** ScanningLine sweep; map fades in/out ≤1.8s; no layout jank

### M3 — Deployed app smoke test

1. Open https://groww-investor-ops-intelligence-sui.vercel.app
2. Test all three pillars without local `.env`:
   - Smart-Sync chat (Pillar A)
   - Voice or text with theme (Pillar B)
   - CSV upload → pulse → HITL queue (Pillar C)

### M4 — Deliverables checklist

- [ ] README submission table complete (add demo video URL)
- [ ] `Source_Manifest.md` accessible
- [ ] `evals-report.md` shows PASS
- [ ] GitHub repo public

### M5 — Demo video (Req 17)

Follow [`DEMO_VIDEO_SCRIPT.md`](../DEMO_VIDEO_SCRIPT.md) — three scenarios in ≤5 minutes.

### M6 — Reduced motion

1. Enable OS “reduce motion”
2. Director Ops — **Expected:** static nodes, no arc animation

---

## AI eval gate (Phase 16 §16.9)

| Dimension | Verification |
|-----------|--------------|
| Visual hierarchy | Glass panels legible above map (manual) |
| Accessibility | `aria-hidden="true"` on map (automated test) |
| Bundle | Component file ≤ 8KB source (automated) |
| Mode distinction | Amber HUD vs cyan investor terminal (manual) |
