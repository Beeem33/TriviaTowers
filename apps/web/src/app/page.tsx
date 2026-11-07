import { Header, Footer } from "@/components/ui/Header";
import { HeroScene } from "@/components/home/HeroScene";
import { DailyCard } from "@/components/home/DailyCard";
import { RecentTowers } from "@/components/home/RecentTowers";

const STEPS = [
  { emoji: "❓", title: "Answer", text: "10 trivia questions, 15 seconds each." },
  { emoji: "🧱", title: "Build", text: "Every correct answer adds a floor. Fast answers and streaks score more." },
  { emoji: "🏆", title: "Compete", text: "One daily tower for everyone. Share it, challenge friends, or climb forever in Endless." },
];

export default function HomePage() {
  return (
    <div className="sky-bg min-h-dvh">
      <Header />
      <main>
        <section className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr]">
          <div className="relative order-1 h-[46dvh] min-h-[300px] lg:order-none lg:h-[640px]">
            <HeroScene />
          </div>
          <div className="order-2 space-y-5 lg:order-none">
            <div className="space-y-2">
              <h1 className="font-display text-4xl font-bold leading-[1.05] text-white [text-shadow:0_3px_0_#3f6fd8,0_10px_24px_rgba(29,39,71,0.25)] sm:text-5xl">
                Answer trivia.<br />Build your tower.
              </h1>
              <p className="on-sky max-w-md text-lg font-semibold">
                A new 10-question challenge every day. How high can you build?
              </p>
            </div>
            <DailyCard />
          </div>
        </section>

        <section className="mx-auto mt-10 grid w-full max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr]">
          <div className="card p-5 sm:p-6">
            <h2 className="mb-4 font-display text-2xl font-bold">How to play</h2>
            <ol className="grid gap-3 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-2xl bg-slate-50 p-4">
                  <span className="text-3xl" aria-hidden>{s.emoji}</span>
                  <p className="mt-1 font-display text-lg font-bold">{i + 1}. {s.title}</p>
                  <p className="text-sm text-ink-soft">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
          <RecentTowers />
        </section>
      </main>
      <Footer />
    </div>
  );
}
