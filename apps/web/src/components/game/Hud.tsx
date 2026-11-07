"use client";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/game-store";
import { IconFlame, IconHeart, IconStar, IconTower } from "@/components/ui/Icons";

/** Counts smoothly toward `value`. */
function useCountUp(value: number, ms = 600) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const v = Math.round(a + (value - a) * (1 - (1 - p) ** 3));
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

export { useCountUp };

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-white/90 py-1 pl-1 pr-2.5 shadow-md backdrop-blur sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-3" title={label}>
      <span className={`grid h-6 w-6 place-items-center rounded-full sm:h-7 sm:w-7 ${accent} text-white`}>{icon}</span>
      <span className="sr-only">{label}:</span>
      <span className="font-display text-base font-bold tabular-nums leading-none sm:text-lg">{value}</span>
    </div>
  );
}

export function Hud() {
  const score = useGame((s) => s.score);
  const floors = useGame((s) => s.floors);
  const streak = useGame((s) => s.streak);
  const index = useGame((s) => s.index);
  const total = useGame((s) => s.session?.expectedTotal ?? s.questions.length);
  const offset = useGame((s) => s.session?.indexOffset ?? 0);
  const livesLeft = useGame((s) => s.livesLeft);
  const maxLives = useGame((s) => s.maxLives);
  const shownScore = useCountUp(score);
  const qNum = Math.min(total, offset + index + 1);

  return (
    <div className="pointer-events-none flex items-center justify-center gap-1 sm:gap-2">
      {livesLeft !== null && maxLives !== null && (
        <div className="flex items-center gap-0.5 rounded-2xl bg-white/90 px-2 py-1 shadow-md sm:py-1.5" aria-label={`${livesLeft} of ${maxLives} lives left`}>
          {Array.from({ length: maxLives }, (_, i) => (
            <IconHeart key={i} className={`h-5 w-5 sm:h-6 sm:w-6 ${i < livesLeft ? "text-bad" : "text-slate-300"}`} />
          ))}
        </div>
      )}
      {total > 0 && livesLeft === null && (
        <div className="rounded-2xl bg-ink/80 px-2.5 py-1 font-display text-base font-bold text-white shadow-md sm:px-3 sm:py-1.5 sm:text-lg" aria-label={`Question ${qNum} of ${total}`}>
          {qNum}<span className="opacity-60">/{total}</span>
        </div>
      )}
      <Stat icon={<IconStar className="h-4 w-4" />} label="Score" value={shownScore.toLocaleString("en-US")} accent="bg-sun" />
      <Stat icon={<IconTower className="h-4 w-4" />} label="Tower floors" value={floors} accent="bg-grape" />
      <Stat
        icon={<IconFlame className="h-4 w-4" />}
        label="Answer streak"
        value={<span className={streak >= 2 ? "text-sun-dark" : ""}>{streak}</span>}
        accent={streak >= 2 ? "bg-bad" : "bg-slate-400"}
      />
    </div>
  );
}
