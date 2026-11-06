"use client";
import { useEffect, useRef, useState } from "react";
import { playSound } from "@/audio/sfx";

/**
 * Countdown display. Drives a transform via rAF (not CSS animation) so it keeps working
 * when reduced-motion disables CSS animations. Purely visual: the deadline is enforced
 * by the game loop (and, in online modes, by the server).
 */
export function TimerBar({ deadline, durationMs, running }: { deadline: number; durationMs: number; running: boolean }) {
  const bar = useRef<HTMLDivElement>(null);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(durationMs / 1000));
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      const remaining = Math.max(0, deadline - performance.now());
      const frac = remaining / durationMs;
      if (bar.current) {
        bar.current.style.transform = `scaleX(${frac})`;
        bar.current.style.backgroundColor = frac > 0.5 ? "#2ec4a6" : frac > 0.25 ? "#ffb02e" : "#e23a55";
      }
      const secs = Math.ceil(remaining / 1000);
      setSecondsLeft(secs);
      if (running && secs <= 3 && secs > 0 && lastTick.current !== secs) {
        lastTick.current = secs;
        playSound("tick");
      }
      if (running && remaining > 0) raf = requestAnimationFrame(frame);
    };
    lastTick.current = null;
    frame();
    return () => cancelAnimationFrame(raf);
  }, [deadline, durationMs, running]);

  return (
    <div className="flex items-center gap-3">
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden>
        <div ref={bar} className="h-full origin-left rounded-full" style={{ transform: "scaleX(1)" }} />
      </div>
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-lg font-bold tabular-nums ${secondsLeft <= 5 && running ? "bg-bad text-white" : "bg-slate-100 text-ink"}`}
        role="timer"
        aria-label={`${secondsLeft} seconds left`}
      >
        {secondsLeft}
      </div>
    </div>
  );
}
