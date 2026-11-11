"use client";
import { useEffect, useState } from "react";
import { utcDateKey } from "@triviatowers/game-core";
import { fetchChallenge, type VerifiedChallenge as Challenge } from "@/game/online-daily";

function useChallenge(attemptId: string) {
  const [c, setC] = useState<Challenge | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchChallenge(attemptId).then(
      (r) => !cancelled && setC(r),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [attemptId]);
  return c;
}

/** Banner for a server-verified challenge link (?c=<attempt id>). Spoiler-free. */
export function VerifiedChallengeBanner({ attemptId }: { attemptId: string }) {
  const c = useChallenge(attemptId);
  if (!c) return null;
  const sameDay = c.dateKey === utcDateKey();
  return (
    <div className="tt-rise flex items-center gap-3 rounded-3xl bg-grape px-4 py-3 text-white shadow-lg">
      <span className="text-3xl" aria-hidden>
        ⚔️
      </span>
      <p className="text-sm leading-snug">
        <span className="font-display text-base font-bold">{c.displayName}</span> challenged you! They built{" "}
        <b>
          {c.floors} {c.floors === 1 ? "floor" : "floors"}
        </b>{" "}
        with <b>{c.score.toLocaleString("en-US")} points</b> on Daily Tower #{c.dailyNumber}
        <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] font-bold">✓ verified</span>
        {sameDay ? ". Same questions, can you build higher?" : ". Today’s tower has new questions. Can you beat their score?"}
      </p>
    </div>
  );
}

/** Head-to-head line on the results screen. */
export function ChallengeOutcome({ attemptId, myScore }: { attemptId: string; myScore: number }) {
  const c = useChallenge(attemptId);
  if (!c) return null;
  const diff = myScore - c.score;
  const text =
    diff > 0
      ? `You beat ${c.displayName} by ${diff.toLocaleString("en-US")} points! 🎉`
      : diff === 0
        ? `It’s a tie with ${c.displayName}!`
        : `${c.displayName} is ahead by ${(-diff).toLocaleString("en-US")} points. So close!`;
  return (
    <p className={`tt-pop rounded-2xl px-4 py-3 text-center font-display text-lg font-bold ${diff >= 0 ? "bg-emerald-50 text-good" : "bg-violet-50 text-grape-dark"}`}>
      ⚔️ {text}
    </p>
  );
}
