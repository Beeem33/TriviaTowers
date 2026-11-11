"use client";
import Link from "next/link";
import type { MatchSummary } from "@triviatowers/shared-types";
import { formatCountdown, maxPossibleScore, msUntilNextDaily, nextStreakMilestone } from "@triviatowers/game-core";
import { useNow } from "@/lib/useNow";
import { useLocalProgress } from "@/lib/useLocalProgress";
import { IconCheck, IconFlame, IconX } from "@/components/ui/Icons";
import { ShareActions } from "./ShareActions";
import { RewardsBox } from "./RewardsBox";
import { useGame } from "@/game/game-store";
import { useCountUp } from "./Hud";

function headline(s: MatchSummary): { title: string; sub: string } {
  if (s.mode === "endless") {
    if (s.floors >= 30) return { title: "Tower Legend!", sub: `${s.floors} floors into the clouds.` };
    if (s.floors >= 20) return { title: "Sky high!", sub: "The air is getting thin up there." };
    if (s.floors >= 10) return { title: "Solid climb!", sub: "Double digits — keep pushing." };
    if (s.floors >= 5) return { title: "Nice climb!", sub: "The next run goes higher." };
    return { title: "Every tower starts somewhere!", sub: "Questions get harder as you climb — try again." };
  }
  const pct = s.total ? s.correct / s.total : 0;
  if (pct === 1) return { title: "Perfect Builder!", sub: "Every floor placed. Flawless." };
  if (pct >= 0.8) return { title: "Sky high!", sub: "That's a seriously tall tower." };
  if (pct >= 0.6) return { title: "Solid tower!", sub: "Strong foundations — keep climbing." };
  if (pct >= 0.3) return { title: "Nice start!", sub: "Every great tower starts somewhere." };
  return { title: "Tiny but mighty!", sub: "Tomorrow's tower will be taller." };
}

function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-2.5 py-2 sm:px-3 sm:py-2.5">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-soft sm:text-xs">{label}</dt>
      <dd className="font-display text-lg font-bold tabular-nums leading-tight sm:text-2xl">{value}</dd>
      {hint && <dd className="text-[11px] font-semibold text-ink-soft">{hint}</dd>}
    </div>
  );
}

export function ResultsPanel({ summary, streak, onPlayAgain }: { summary: MatchSummary; streak: number; onPlayAgain: () => void }) {
  const now = useNow();
  const score = useCountUp(summary.score, 1200);
  const { title, sub } = headline(summary);
  const milestone = nextStreakMilestone(streak);
  const isDaily = summary.mode === "daily";
  const isEndless = summary.mode === "endless";
  const progress = useLocalProgress();
  const rewards = useGame((s) => (s.rewards?.finishedAt === summary.finishedAt ? s.rewards : null));
  const best = progress?.endlessBest ?? null;
  const isRecord = isEndless && best?.finishedAt === summary.finishedAt && summary.floors > 0;
  const modeLabel = isDaily ? `Daily Tower #${summary.dailyNumber}` : isEndless ? "Endless Tower" : "Quick Build";

  return (
    <section className="card tt-rise space-y-4 p-4 sm:p-5" aria-labelledby="results-title">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip bg-grape text-white">{modeLabel}</span>
        {isRecord && <span className="chip tt-pop bg-sun text-white">🏆 New personal best!</span>}
        {summary.online ? (
          <span className="chip bg-emerald-100 text-emerald-800">✓ Online · verified by the server</span>
        ) : (
          <span className="chip bg-slate-100 text-ink-soft">Offline · saved on this device</span>
        )}
      </div>
      <div>
        <h2 id="results-title" className="font-display text-3xl font-bold">{title}</h2>
        <p className="text-ink-soft">{sub}</p>
      </div>

      <div className="flex items-end justify-between rounded-2xl bg-gradient-to-r from-sun to-[#ffb347] px-4 py-3 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-90">Final score</p>
          <p className="font-display text-5xl font-bold tabular-nums leading-none" aria-live="off">{score.toLocaleString("en-US")}</p>
        </div>
        {!isEndless && (
          <p className="text-right text-xs font-bold opacity-90">max {maxPossibleScore(summary.total).toLocaleString("en-US")}</p>
        )}
      </div>

      <dl className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <StatTile label="Correct" value={`${summary.correct}/${summary.total}`} />
        <StatTile label="Accuracy" value={`${summary.accuracy}%`} />
        <StatTile label="Tower" value={`${summary.floors} ${summary.floors === 1 ? "floor" : "floors"}`} />
        <StatTile label="Best streak" value={summary.bestStreak} />
        <StatTile label="Answer time" value={`${(summary.totalAnswerMs / 1000).toFixed(1)}s`} />
        {isDaily &&
          (summary.rank ? (
            <StatTile label="Daily rank" value={`#${summary.rank.toLocaleString("en-US")}`} hint={summary.players ? `of ${summary.players.toLocaleString("en-US")} so far` : undefined} />
          ) : (
            <StatTile label="Daily rank" value="—" hint="Offline run" />
          ))}
        {isEndless && <StatTile label="Your best" value={`${best?.floors ?? summary.floors} floors`} hint={isRecord ? "That's this run!" : undefined} />}
        {!isDaily && !isEndless && (
          <StatTile label="Avg. answer" value={`${(summary.totalAnswerMs / 1000 / Math.max(1, summary.total)).toFixed(1)}s`} />
        )}
      </dl>

      <ol
        className="mx-auto grid max-w-sm gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.min(10, summary.outcomes.length)}, minmax(0, 1fr))` }}
        aria-label="Answers by question"
      >
        {summary.outcomes.map((ok, i) => (
          <li
            key={i}
            className={`grid aspect-square place-items-center rounded-lg text-white ${ok ? "bg-good" : "bg-bad"}`}
            aria-label={`Question ${i + 1}: ${ok ? "correct" : "incorrect"}`}
          >
            {ok ? <IconCheck className="h-4 w-4" /> : <IconX className="h-4 w-4" />}
          </li>
        ))}
      </ol>

      {rewards && <RewardsBox rewards={rewards} />}

      {isDaily && streak > 0 && (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-orange-50 px-3 py-2 text-sm font-bold text-sun-dark">
          <IconFlame className="h-5 w-5" /> {streak}-day streak
          {milestone && <span className="font-semibold text-ink-soft">· {milestone - streak} more to reach {milestone}</span>}
        </p>
      )}

      <ShareActions summary={summary} streak={isDaily ? streak : 0} />

      {isDaily && summary.online && summary.dateKey && (
        <Link href={`/review?date=${summary.dateKey}`} className="btn btn-ghost w-full !text-base">
          Review the answers
        </Link>
      )}

      <div className="grid grid-cols-2 gap-2">
        {isDaily ? (
          <Link href="/play?mode=quick" className="btn btn-mint">Quick Build</Link>
        ) : (
          <button type="button" className="btn btn-mint" onClick={onPlayAgain}>{isEndless ? "Climb again" : "Build again"}</button>
        )}
        <Link href="/" className="btn btn-ghost">Home</Link>
      </div>
      {isDaily && now && (
        <p className="text-center text-sm text-ink-soft">
          Next Daily Tower in <span className="font-display font-bold tabular-nums text-ink">{formatCountdown(msUntilNextDaily(now))}</span>
        </p>
      )}
    </section>
  );
}
