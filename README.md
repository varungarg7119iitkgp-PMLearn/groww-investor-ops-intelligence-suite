# Groww — Investor Ops & Intelligence Suite

**Status:** Under construction — this repository and the linked Vercel deployment are submission placeholders. Full integration (single dashboard, MCP HITL, eval runs) will land in the same repo and reuse the same production URL after the capstone build-out.

## Submission links

| Deliverable | Link |
| ----------- | ---- |
| **GitHub repository** | https://github.com/varungarg7119iitkgp-PMLearn/groww-investor-ops-intelligence-suite |
| **Deployed application (Vercel)** | https://groww-investor-ops-intelligence-sui.vercel.app |
| **Evals report** | [`Evals_Report.md`](./Evals_Report.md) — golden dataset, adversarial tests, scores (detailed template; run metrics after integration). |
| **Source manifest** | This file, section **Source Manifest** below (30+ official URLs; extend as ingestion expands). |

### Prior milestone references (conceptual lineage only)

This capstone **unifies** prior work into one product; implementation here is **new** and integrated:

| Milestone | Role in unified suite | Repo | Demo |
| --------- | --------------------- | ---- | ---- |
| M1 — RAG Mutual Fund FAQ | Pillar A facts & citations | [mutual-fund-rag-chatbot](https://github.com/varungarg7119iitkgp-PMLearn/mutual-fund-rag-chatbot) | [Vercel](https://mutual-fund-rag-chatbot-psi.vercel.app/) |
| M2 — Weekly pulse / fee explainer | Pillar A fee logic + Pillars B & C context | [Groww-Support-PM-Pulsator](https://github.com/varungarg7119iitkgp-PMLearn/Groww-Support-PM-Pulsator) | [Vercel](https://groww-support-pm-pulsator.vercel.app/) |
| M3 — Voice appointment scheduler | Pillars B & C voice + MCP workflow | [voice-agent-concierge](https://github.com/varungarg7119iitkgp-PMLearn/voice-agent-concierge) | [Vercel](https://voice-agent-concierge.vercel.app/) |

---

## Product vision (capstone brief)

Single **Investor Ops & Intelligence Suite** for a fintech-style operator:

1. **Pillar A — Smart-Sync Knowledge Base (M1 + M2):** Unified search answers that blend mutual-fund facts with fee explainer logic; **source citations** and **six-bullet structure** preserved.
2. **Pillar B — Insight-driven agent optimization (M2 + M3):** Weekly review pulse **themes** brief the voice agent; **theme-aware** greetings (e.g. nominee updates, login issues).
3. **Pillar C — Super-agent MCP workflow (M2 + M3):** One **human-in-the-loop (HITL)** approval center for MCP actions; post-call **calendar hold** + **advisor email draft** including **market / sentiment context** from the pulse.

**Technical constraints (target):** Single UI entry point (Streamlit, Gradio, master notebook, **or** this Next.js shell evolved into the dashboard); **no PII** (`[REDACTED]`); **state persistence** — booking reference visible in pulse / ops docs to prove cross-module linkage.

**Evaluations (required on final system):** Retrieval (faithfulness + relevance), constraint adherence (adversarial pass/fail), tone & structure (pulse rubric + voice “top theme” check). Details and templates: [`Evals_Report.md`](./Evals_Report.md).

---

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Production build:

```bash
npm run build
npm start
```

---

## Source Manifest

Official and regulator-facing URLs suitable for facts-only RAG, fee education, and compliance context. **Replace or extend** with the exact URLs your ingestion pipeline uses; keep this list at **≥30** for submission.

### India — regulators & infrastructure

1. https://www.sebi.gov.in/
2. https://investor.sebi.gov.in/
3. https://investor.sebi.gov.in/knowledge-base.html
4. https://investor.sebi.gov.in/faq/faq.html
5. https://www.sebi.gov.in/legal/circulars.html
6. https://www.sebi.gov.in/legal/regulations.html
7. https://www.amfiindia.com/
8. https://www.amfiindia.com/investor-corner/investor-education
9. https://www.amfiindia.com/investor-center/investor-handbook
10. https://www.amfiindia.com/investor-corner/online-center/arrival-departure-of-funds
11. https://www.rbi.org.in/
12. https://www.rbi.org.in/commonperson/English/Scripts/rbi_notifications.aspx
13. https://www.incometax.gov.in/iec/foportal/
14. https://www.incometax.gov.in/iec/foportal/help/how-to-save-tax/elss
15. https://www.npci.org.in/
16. https://www.nseindia.com/
17. https://www.nseindia.com/invest/content/about_us.htm
18. https://www.bseindia.com/
19. https://www.bseindia.com/investors/about/about_us.aspx
20. https://www.ccilindia.com/

### Distributor / platform — public policy & help (example)

21. https://groww.in/help/
22. https://groww.in/privacy-policy
23. https://groww.in/terms-and-conditions
24. https://groww.in/pricing

### AMC — investor information (add scheme-specific factsheet URLs during build)

25. https://www.hdfcfund.com/investor-services
26. https://www.icicipruamc.com/
27. https://dspim.com/
28. https://www.axismf.com/
29. https://www.nipponindiamf.com/
30. https://www.invesco.com/in/en/investments/mutual-funds.html
31. https://www.adityabirlacapital.com/abcmf
32. https://www.amfiindia.com/intermediary/students/certification.html

### Standards & reference

33. https://www.camsonline.com/DistributorsServices/Education/Default.aspx (RTA investor education — validate latest URL when citing)
34. https://www.kfintech.com/investor-services/ (RTA / servicing — validate latest URL when citing)

---

## Repository layout (initial)

```
├── app/                 # Next.js App Router — under-construction landing page
├── Evals_Report.md      # Eval suite template + placeholders
├── README.md            # This file + Source Manifest
├── package.json
└── vercel.json          # Vercel hints (framework: nextjs)
```

Future phases may add `backend/`, `phase*_`, MCP tooling, and notebooks — **same repo, same Vercel project**.

---

## License

Educational capstone scaffold — adjust license when you publish.
