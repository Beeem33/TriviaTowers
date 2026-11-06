"use client";
import Link from "next/link";
import { dailyNumber, formatCountdown, msUntilNextDaily, nextStreakMilestone, utcDateKey } from "@triviatowers/game-core";
import { dailyStreak, todaysResult } from "@/lib/progress";
import { useLocalProgress } from "@/lib/useLocalProgress";
import { useNow } from "@/lib/useNow";
import { IconFlame } from "@/components/ui/Icons";

export function DailyCard() {
  const now = useNow();
  const progress = useLocalProgress();
  const state = progress && now ? { today: todaysResult(progress, utcDateKey(now)), streak: dailyStreak(progress, utcDateKey(now)) } : null;

  const key = now ? utcDateKey(now) : null;
  const number = key ? dailyNumber(key) : null;
  const played = state?.today;
  const streak = state?.streak ?? 0;
  const milestone = nextStreakMilestone(streak);

  return (
    <div className="card space-y-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">Today’s challenge</p>
          <p className="font-display text-2xl font-bold">Daily Tower {number ? `#${number}` : ""}</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 font-display text-lg font-bold ${streak > 0 ? "bg-orange-100 text-sun-dark" : "bg-slate-100 text-ink-soft"}`} title="Daily streak">
          <IconFlame className="h-5 w-5" />
          <span className="tabular-nums">{state ? streak : "–"}</span>
          <span className="sr-only">day streak</span>
        </div>
      </div>

      {played ? (
        <div className="rounded-2xl bg-emerald-50 p-3 text-sm">
          <p className="font-display text-lg font-bold text-good">Built today ✓</p>
          <p className="text-ink-soft">
            {played.floors} floors · {played.correct}/{played.total} correct · {played.score.toLocaleString("en-US")} points
          </p>
        </div>
      ) : (
        <p className="text-ink-soft">
          10 questions. 15 seconds each. Every correct answer adds a floor.
          {streak > 0 && milestone && <> Play today to keep your <b className="text-sun-dark">{streak}-day streak</b> alive!</>}
        </p>
      )}

      <div className="grid gap-2">
        <Link href="/play?mode=daily" className="btn btn-sun w-full !py-4 !text-xl">
          {played ? "See today’s tower" : "Play Today’s Tower"}
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/play?mode=quick" className="btn btn-mint">Quick Build</Link>
          <Link href="/friends" className="btn btn-grape">Play With Friends</Link>
        </div>
      </div>

      <p className="text-center text-sm text-ink-soft">
        New tower in{" "}
        <span className="font-display font-bold tabular-nums text-ink" suppressHydrationWarning>
          {now ? formatCountdown(msUntilNextDaily(now)) : "--:--:--"}
        </span>{" "}
        <span className="text-xs">(resets 00:00 UTC)</span>
      </p>
    </div>
  );
}
