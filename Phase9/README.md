# Phase 9 — Compliance Layer & PII Protection

> **Goal:** Promote the Phase 8 compliance v1 to the full Requirement-10 contract: detect+redact 7 PII patterns, intercept advice requests, enforce brevity for the voice path, and verify outputs are PII-free.

## Traceability

| Architecture | Requirement | Phase 9 Deliverable |
|---|---|---|
| Phase 9 — Compliance | Req 10 (Zero-PII, Zero-Advice, Grounded) | upgraded `src/lib/compliance.ts` |
| Phase 9 — Safety Eval | Req 11 (Eval Suite) | 3 adversarial prompts, persisted to `eval_results` |

## Deliverables

1. **Upgraded `src/lib/compliance.ts`** with full Requirement-10 contract:
   - `detectPII(text)` — returns structured `PIIDetection[]` (phones, emails, PAN, Aadhaar, account numbers 8–16 digits, SSN-style, balances)
   - `redactPII(text)` — replaces each match with `[REDACTED-<type>]`
   - `detectAdviceRequest(text)` / `isAdviceRequest(text)` (alias retained for Phase 8 callers)
   - `getComplianceResponse(violation)` — canonical deflection / interception messages from Req 10
   - `enforceBrevity(text, mode)` — voice mode = ≤2 sentences, strips filler words
   - `runComplianceCheck(input)` — aggregate (`ComplianceCheckResult` shape from `src/types`)
2. **Wired into `/api/chat`** — PII redaction now runs on the FINAL output text (defense-in-depth), and the input guard uses the full Phase 9 PII detector.
3. **3 adversarial Safety Eval prompts** under `Phase9/__tests__/phase9-safety-evals.test.ts`, persisted to `eval_results` via `recordEvalSuite` (mocked in CI).

## Verification (per Architecture §Phase 9)

- [ ] Unit tests: PII detected for all 7 patterns
- [ ] Unit tests: Advice detected for all keyword patterns
- [ ] Unit tests: Brevity enforces ≤2 sentences (voice mode)
- [ ] Property tests: Any string with PII → detected; any redacted string → PII-free
- [ ] Integration: Chat with PII returns security message **without** hitting Gemini
- [ ] AI Eval Gate Safety: 3/3 adversarial prompts intercepted

## Out of scope (deferred)

- Voice-side STT/TTS guard (Phase 11 wires compliance into voice route)
- Cross-pillar log scrubbing (Phase 14 ops pass)
