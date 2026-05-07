const pillars = [
  {
    id: "A",
    title: "Smart-Sync Knowledge Base",
    subtitle: "M1 Mutual Fund FAQ × M2 Fee Explainer",
    detail:
      "Unified search blending factsheet data with fee logic — citations and six-bullet structure preserved.",
  },
  {
    id: "B",
    title: "Insight-Driven Agent Optimization",
    subtitle: "Weekly Product Pulse × Voice Scheduler",
    detail:
      "Theme-aware greetings driven by review-derived pulse themes (e.g. nominee updates, login issues).",
  },
  {
    id: "C",
    title: "Super-Agent MCP Workflow",
    subtitle: "Human-in-the-loop approval center",
    detail:
      "Post-call calendar holds and advisor email drafts with market / sentiment context from the pulse.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,200,83,0.12),transparent)]" />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16 md:py-24">
        <header className="space-y-6 text-center md:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-xs font-medium tracking-wide text-[var(--accent)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
            </span>
            Under construction — same repo & URL after launch
          </p>
          <div className="space-y-3">
            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
              Investor Ops &amp; Intelligence Suite
            </h1>
            <p className="max-w-2xl text-pretty text-lg text-[var(--muted)]">
              Capstone integration for a fintech-style investor operations ecosystem: RAG FAQ, review pulse,
              and voice-first scheduling in one dashboard — with evaluations for retrieval, safety, and UX.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <span className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-mono text-sm text-[var(--muted)]">
              Deploy on Vercel → keep this production URL
            </span>
          </div>
        </header>

        <section aria-label="Three pillars" className="grid gap-4 md:grid-cols-3">
          {pillars.map((p) => (
            <article
              key={p.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-6 backdrop-blur-sm"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
                Pillar {p.id}
              </span>
              <h2 className="text-lg font-semibold">{p.title}</h2>
              <p className="text-sm font-medium text-[var(--muted)]">{p.subtitle}</p>
              <p className="text-sm leading-relaxed text-[var(--muted)]">{p.detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--accent-dim)] p-8">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
            Submission placeholders (update after full build)
          </h3>
          <ul className="space-y-3 font-mono text-sm text-[var(--text)]">
            <li>
              <strong className="text-[var(--muted)]">GitHub:</strong>{" "}
              create repo &amp; push this project — paste your URL in README.
            </li>
            <li>
              <strong className="text-[var(--muted)]">Live app:</strong>{" "}
              connect Vercel to the repo; root is Next.js app directory (this folder).
            </li>
            <li>
              <strong className="text-[var(--muted)]">Evals:</strong> see{" "}
              <code className="rounded bg-[var(--surface)] px-1.5 py-0.5">Evals_Report.md</code>{" "}
              — golden set, adversarial tests, rubrics (filled when integrated).
            </li>
            <li>
              <strong className="text-[var(--muted)]">Sources:</strong>{" "}
              <code className="rounded bg-[var(--surface)] px-1.5 py-0.5">README.md</code>{" "}
              § Source Manifest — 30+ official URLs (expand as you ingest).
            </li>
          </ul>
        </section>

        <footer className="border-t border-[var(--border)] pt-8 text-center text-xs text-[var(--muted)] md:text-left">
          Educational capstone scaffold — no affiliation with Groww or any broker. PII masked as{" "}
          <code className="rounded bg-[var(--surface)] px-1">[REDACTED]</code> in demos and datasets.
        </footer>
      </div>
    </main>
  );
}
