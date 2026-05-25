# Phase 16 — End-to-End Polish, Deployment & Deliverables

## Goal

Final polish, deployment readiness, submission deliverables (README, Source Manifest, demo script), and Tactical HUD Map for Director Ops.

## Traceability

- **Requirement 17** — GitHub, Vercel, demo video, evals report, source manifest
- **UI/UX §16** — TacticalHUDMap background enhancement

## Scope

| Task | Implementation | Status |
|------|----------------|--------|
| TacticalHUDMap + hideOrbs | `src/components/director/TacticalHUDMap.tsx` | ✅ |
| India map SVG asset | `public/india-map-outline.svg` | ✅ |
| Error/loading polish | Ticker shimmer, voice fallback copy | ✅ |
| Source_Manifest.md | Standalone 30+ URL document | ✅ |
| README finalization | Architecture diagram, eval status, links | ✅ |
| Demo video script | `DEMO_VIDEO_SCRIPT.md` | ✅ |
| Deliverables verifier | `scripts/verify-deliverables.ts` | ✅ |
| .env.example alignment | Matches actual env var names | ✅ |

## Files

| File | Purpose |
|------|---------|
| `src/components/director/TacticalHUDMap.tsx` | Amber India HUD background |
| `src/components/shared/AuroraMesh.tsx` | `hideOrbs` prop for Director mode |
| `src/app/page.tsx` | Wires map + orb suppression |
| `Source_Manifest.md` | Req 17 standalone manifest |
| `DEMO_VIDEO_SCRIPT.md` | 5-min demo recording guide |
| `scripts/verify-deliverables.ts` | Automated deliverable checks |

## Tests

```bash
npx vitest run Phase16
npx tsx scripts/verify-deliverables.ts
npm run build
```

## Manual testing

See [`TEST_CASES_LOG.md`](./TEST_CASES_LOG.md).

## Deployment

Vercel project: https://groww-investor-ops-intelligence-sui.vercel.app

Ensure env vars in Vercel dashboard match `.env.example`. Redeploy after pushing Phase 16 changes.

## Demo video

Record using [`DEMO_VIDEO_SCRIPT.md`](../DEMO_VIDEO_SCRIPT.md) and add URL to README submission table.
