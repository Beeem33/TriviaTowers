"use client";
import type { MatchSummary } from "@triviatowers/shared-types";
import { useLocalProgress } from "@/lib/useLocalProgress";

export function RecentTowers() {
  const p = useLocalProgress();
  const best: MatchSummary[] = p ? [...p.history].sort((a, b) => b.score - a.score).slice(0, 5) : [];

  return (
    <div className="card space-y-3 p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold">Your best towers</h2>
        <span className="chip bg-slate-100 text-ink-soft">This device</span>
      </div>
      {best.length === 0 ? (
        <p className="text-ink-soft">No towers yet — your best builds will show up here.</p>
      ) : (
        <ol className="space-y-1.5">
          {best.map((r, i) => (
            <li key={r.finishedAt} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-grape font-display font-bold text-white">{i + 1}</span>
              <span className="flex-1 text-sm font-bold">
                {r.mode === "daily" ? `Daily #${r.dailyNumber}` : r.mode === "endless" ? "Endless Tower" : "Quick Build"}
                <span className="block text-xs font-semibold text-ink-soft">{r.floors} floors · {r.correct}/{r.total} correct</span>
              </span>
              <span className="font-display text-lg font-bold tabular-nums">{r.score.toLocaleString("en-US")}</span>
            </li>
          ))}
        </ol>
      )}
      {p?.endlessBest && (
        <p className="rounded-2xl bg-violet-50 px-3 py-2 text-sm font-bold text-grape-dark">
          🏆 Endless record: {p.endlessBest.floors} floors · {p.endlessBest.score.toLocaleString("en-US")} points
        </p>
      )}
      {p && p.lifetime.games > 0 && (
        <p className="text-xs text-ink-soft">
          Lifetime: {p.lifetime.games} games · {p.lifetime.answered} questions · {Math.round((p.lifetime.correct / Math.max(1, p.lifetime.answered)) * 100)}% accuracy · tallest {p.lifetime.highestTower} floors
        </p>
      )}
      <p className="text-xs text-ink-soft">Global and friends leaderboards arrive with accounts (coming soon).</p>
    </div>
  );
}
