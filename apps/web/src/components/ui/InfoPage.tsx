import { Header, Footer } from "./Header";

/** Layout for long-form text pages. */
export function InfoPage({ title, intro, updated, children }: { title: string; intro?: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="sky-bg min-h-dvh">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
        <article className="card p-6 sm:p-10">
          <h1 className="font-display text-4xl font-bold">{title}</h1>
          {updated && <p className="mt-1 text-sm font-semibold text-ink-soft">Last updated {updated}</p>}
          {intro && <p className="mt-3 text-lg text-ink-soft">{intro}</p>}
          <div className="prose-tt mt-6">{children}</div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
