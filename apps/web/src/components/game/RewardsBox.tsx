"use client";
import Link from "next/link";
import { levelProgress, levelTitle } from "@triviatowers/game-core";
import type { MatchRewards } from "@/lib/progress";

/** XP, level progress, achievements and unlocks earned by the match just played. */
export function RewardsBox({ rewards }: { rewards: MatchRewards }) {
  const { xp } = rewards;
  const lp = levelProgress(rewards.xpAfter);
  const leveledUp = rewards.levelAfter > rewards.levelBefore;
  const parts = [
    xp.correct && `Correct +${xp.correct}`,
    xp.answered && `Answered +${xp.answered}`,
    xp.dailyBonus && `Daily +${xp.dailyBonus}`,
    xp.perfectBonus && `Perfect +${xp.perfectBonus}`,
  ].filter(Boolean);

  return (
    <div className="space-y-2 rounded-2xl bg-violet-50 p-3">
      {leveledUp && (
        <p className="tt-pop rounded-xl bg-grape px-3 py-2 text-center font-display text-lg font-bold text-white">
          ⬆️ Level up! You’re now level {rewards.levelAfter} · {levelTitle(rewards.levelAfter)}
        </p>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-2xl font-bold text-grape-dark">+{xp.total} XP</p>
        <p className="text-right text-xs font-semibold text-ink-soft">{parts.join(" · ")}</p>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs font-bold text-ink-soft">
          <span>
            Level {lp.level} · {lp.title}
          </span>
          <span className="tabular-nums">
            {lp.into}/{lp.span} XP
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white" role="progressbar" aria-label="Progress to next level" aria-valuemin={0} aria-valuemax={lp.span} aria-valuenow={lp.into}>
          <div className="h-full rounded-full bg-grape transition-[width] duration-1000" style={{ width: `${Math.round(lp.fraction * 100)}%` }} />
        </div>
      </div>
      {rewards.achievements.length > 0 && (
        <ul className="space-y-1.5" aria-label="Achievements unlocked">
          {rewards.achievements.map((a, i) => (
            <li key={a.id} className="tt-pop flex items-center gap-2 rounded-xl bg-white px-2.5 py-1.5" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
              <span className="text-2xl" aria-hidden>
                {a.icon}
              </span>
              <span className="min-w-0 text-sm">
                <span className="block font-display font-bold">Achievement: {a.name}</span>
                <span className="block text-xs text-ink-soft">{a.description}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {rewards.unlocked.length > 0 && (
        <p className="rounded-xl bg-white px-2.5 py-2 text-sm">
          🎨 <b>New unlock{rewards.unlocked.length > 1 ? "s" : ""}:</b> {rewards.unlocked.map((u) => u.name).join(", ")}.{" "}
          <Link href="/profile" className="font-bold text-grape-dark underline">
            Equip in your profile
          </Link>
        </p>
      )}
    </div>
  );
}
