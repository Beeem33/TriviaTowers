import Link from "next/link";
import { Header, Footer } from "./Header";

export function ComingSoon({ emoji, title, intro, items, phase, children }: {
  emoji: string;
  title: string;
  intro: string;
  items: string[];
  phase: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="sky-bg min-h-dvh">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        <div className="card space-y-5 p-6 sm:p-8">
          <div className="text-6xl tt-bob" aria-hidden>{emoji}</div>
          <div>
            <span className="chip bg-grape text-white">Under construction · {phase}</span>
            <h1 className="mt-2 font-display text-4xl font-bold">{title}</h1>
            <p className="mt-2 text-lg text-ink-soft">{intro}</p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((i) => (
              <li key={i} className="rounded-2xl bg-slate-50 px-4 py-3 font-bold">🧱 {i}</li>
            ))}
          </ul>
          {children}
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href="/play?mode=daily" className="btn btn-sun">Play Today’s Tower</Link>
            <Link href="/" className="btn btn-ghost">Back home</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
