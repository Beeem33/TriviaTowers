"use client";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ChoiceIndex, MatchSummary } from "@triviatowers/shared-types";
import { utcDateKey } from "@triviatowers/game-core";
import { useGame } from "@/game/game-store";
import { LocalGameSession } from "@/game/session";
import { useSettings } from "@/game/settings-store";
import { useReducedMotion } from "@/game/useReducedMotion";
import { dailyStreak, loadProgress, recordMatch, todaysResult } from "@/lib/progress";
import { useLocalProgress } from "@/lib/useLocalProgress";
import { decodeChallenge } from "@/lib/challenge";
import { playSound } from "@/audio/sfx";
import { SceneView } from "@/components/three/SceneView";
import { fx } from "@/components/three/fx";
import { towerTopY } from "@/components/three/Tower";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { SettingsButton } from "@/components/ui/SettingsDialog";
import { IconArrowLeft } from "@/components/ui/Icons";
import type { SceneMode } from "@/components/three/framing";
import { Hud } from "./Hud";
import { QuestionCard, REVEAL_MS } from "./QuestionCard";
import { ResultsPanel } from "./ResultsPanel";
import { ChallengeBanner } from "./ChallengeBanner";

type Mode = "daily" | "quick";
type Gate = { kind: "played"; result: MatchSummary } | { kind: "ready" };

const INTRO_MS = 1500;

/** Decides, on first render, whether today's tower was already built on this device. */
function initialEntry(mode: Mode, replay: boolean): { gate: Gate; practice: boolean } {
  const today = todaysResult(loadProgress());
  if (mode === "daily" && today && !replay) return { gate: { kind: "played", result: today }, practice: false };
  return { gate: { kind: "ready" }, practice: mode === "daily" && !!today };
}

/** Client-only (see PlayClient): reads localStorage during the first render. */
export function GameScreen({ mode, replay, challenge }: { mode: Mode; replay: boolean; challenge?: string }) {
  const reduced = useReducedMotion();
  const status = useGame((s) => s.status);
  const floors = useGame((s) => s.floors);
  const buildTick = useGame((s) => s.buildTick);
  const wobbleTick = useGame((s) => s.wobbleTick);
  const verdict = useGame((s) => s.verdict);
  const summary = useGame((s) => s.summary);
  const session = useGame((s) => s.session);
  const deadline = useGame((s) => s.deadline);
  const index = useGame((s) => s.index);
  const questions = useGame((s) => s.questions);
  const matchSeq = useGame((s) => s.matchSeq);
  const error = useGame((s) => s.error);
  const autoAdvance = useSettings((s) => s.autoAdvance);
  const progress = useLocalProgress();
  const streak = progress ? dailyStreak(progress, utcDateKey()) : 0;

  const [entry, setEntry] = useState(() => initialEntry(mode, replay));
  const { gate, practice } = entry;
  const recorded = useRef<MatchSummary | null>(null);
  const introTimer = useRef<number | undefined>(undefined);
  const claim = useMemo(() => decodeChallenge(challenge), [challenge]);

  /** Starts a fresh match. Touches only the external game store and timers. */
  const beginMatch = useCallback(() => {
    const s = new LocalGameSession(mode, { playerId: loadProgress().playerId });
    recorded.current = null;
    window.clearTimeout(introTimer.current);
    useGame.getState().load(s);
    playSound("start");
    introTimer.current = window.setTimeout(() => useGame.getState().beginQuestion(), reduced ? 300 : INTRO_MS);
  }, [mode, reduced]);

  const onGateReady = useEffectEvent(() => beginMatch());
  useEffect(() => {
    if (gate.kind === "ready") onGateReady();
  }, [gate.kind]);
  useEffect(
    () => () => {
      window.clearTimeout(introTimer.current);
      useGame.getState().reset();
    },
    [],
  );

  // Deadline for local play: auto-submit a timeout. (Online modes: the server decides.)
  useEffect(() => {
    if (status !== "question") return;
    const id = window.setTimeout(() => void useGame.getState().answer(null), Math.max(0, deadline - performance.now()));
    return () => window.clearTimeout(id);
  }, [status, deadline]);

  // React to verdicts: sound, particles, auto-advance.
  useEffect(() => {
    if (status !== "reveal" || !verdict) return;
    if (verdict.correct) {
      playSound("correct");
      playSound("place", reduced ? 0 : 650);
      const f = useGame.getState().floors;
      if (f % 5 === 0) playSound("milestone", 800);
      if (verdict.streakAfter >= 3 && !reduced) fx.emit({ kind: "sparkle", y: towerTopY(f) + 1.5 });
    } else {
      playSound("wrong");
    }
    if (!autoAdvance) return;
    const id = window.setTimeout(() => void useGame.getState().next(), verdict.correct ? REVEAL_MS.correct : REVEAL_MS.wrong);
    return () => window.clearTimeout(id);
  }, [status, verdict, reduced, autoAdvance]);

  // Finish: persist locally, celebrate.
  useEffect(() => {
    if (status !== "finished" || !summary || recorded.current === summary) return;
    recorded.current = summary;
    recordMatch(summary, { countsAsDaily: summary.mode === "daily" && !practice });
    playSound("victory", 300);
    if (!reduced) {
      window.setTimeout(() => fx.emit({ kind: "confetti", y: towerTopY(summary.floors) + 1, amount: 140 }), 500);
    }
  }, [status, summary, practice, reduced]);

  // Keyboard: 1–4 / A–D answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.closest("dialog[open]"))) return;
      const s = useGame.getState();
      if (s.status !== "question") return;
      const k = e.key.toLowerCase();
      const idx = ["1", "2", "3", "4"].includes(k) ? Number(k) - 1 : ["a", "b", "c", "d"].indexOf(k);
      if (idx >= 0) {
        e.preventDefault();
        void s.answer(idx as ChoiceIndex);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Screen-reader announcement, derived from game state.
  let announcement = "";
  if (status === "reveal" && verdict) {
    announcement = verdict.correct
      ? `Correct! Plus ${verdict.points} points. Your tower is ${floors} ${floors === 1 ? "floor" : "floors"} tall.`
      : `${verdict.choiceIndex === null ? "Time's up." : "Incorrect."} The answer was ${questions[index]?.choices[verdict.correctIndex] ?? ""}.`;
  } else if (status === "finished" && summary) {
    announcement = `Match complete. ${summary.correct} of ${summary.total} correct, ${summary.score} points.`;
  }

  const onPick = useCallback((i: ChoiceIndex) => void useGame.getState().answer(i), []);
  const onNext = useCallback(() => void useGame.getState().next(), []);

  const playedFloors = gate.kind === "played" ? gate.result.floors : floors;
  const sceneMode: SceneMode =
    gate.kind === "played" || status === "finished" ? "results" : status === "intro" || status === "idle" ? "intro" : "game";
  const towerSeed = session?.towerSeed ?? 1;
  const inProgress = status === "question" || status === "reveal" || status === "submitting";

  return (
    <div className="sky-bg fixed inset-0 flex flex-col overflow-hidden lg:flex-row">
      {/* 3D stage */}
      <section className="relative min-h-[34dvh] flex-1 lg:min-h-0" aria-label="Your tower">
        <SceneView
          mode={sceneMode}
          floors={playedFloors}
          seed={towerSeed}
          buildTick={buildTick}
          wobbleTick={wobbleTick}
          reducedMotion={reduced}
          interactive
          towerKey={`${matchSeq}-${gate.kind}`}
          label={`Your floating island with a ${playedFloors}-floor tower`}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-1.5 p-2 sm:gap-2 sm:p-4">
          <Link
            href="/"
            className="btn btn-ghost pointer-events-auto h-11 w-11 !p-0"
            aria-label="Leave game and go home"
            onClick={(e) => {
              if (inProgress && !window.confirm("Leave this tower? Your progress in this match will be lost.")) e.preventDefault();
            }}
          >
            <IconArrowLeft className="h-5 w-5" />
          </Link>
          {gate.kind === "ready" && status !== "finished" && <Hud />}
          <div className="pointer-events-auto flex gap-2">
            <SoundToggle />
            <SettingsButton className="hidden sm:inline-flex" />
          </div>
        </div>
        {status === "reveal" && verdict?.correct && (
          <div key={index} className="tt-float-up pointer-events-none absolute left-1/2 top-[38%] font-display text-4xl font-bold text-white [text-shadow:0_3px_0_#d9621a,0_8px_16px_rgba(0,0,0,0.25)]" aria-hidden>
            +{verdict.points}
          </div>
        )}
        {status === "intro" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="tt-pop rounded-3xl bg-white/90 px-6 py-3 font-display text-2xl font-bold shadow-lg sm:text-3xl">
              {mode === "daily" ? `Daily Tower${session?.dailyNumber ? ` #${session.dailyNumber}` : ""}` : "Quick Build"} — get ready!
            </p>
          </div>
        )}
      </section>

      {/* Question / results panel */}
      <aside className="relative z-10 max-h-[66dvh] w-full shrink-0 overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 lg:flex lg:max-h-none lg:w-[480px] lg:flex-col lg:justify-center lg:p-6">
        <div className="mx-auto w-full max-w-xl space-y-3">
          {claim && gate.kind !== "played" && status !== "finished" && <ChallengeBanner claim={claim} />}
          {mode === "daily" && practice && status !== "finished" && gate.kind === "ready" && (
            <p className="chip mx-auto flex w-fit bg-white/80 text-ink-soft">Practice replay — your saved result won’t change</p>
          )}
          {gate.kind === "played" && (
            <AlreadyPlayed result={gate.result} streak={streak} onReplay={() => setEntry({ gate: { kind: "ready" }, practice: true })} />
          )}
          {gate.kind === "ready" && (status === "question" || status === "submitting" || status === "reveal") && (
            <QuestionCard onPick={onPick} onNext={onNext} />
          )}
          {gate.kind === "ready" && status === "finished" && summary && (
            <ResultsPanel summary={summary} streak={streak} onPlayAgain={beginMatch} />
          )}
          {status === "error" && (
            <div className="card space-y-3 p-5 text-center">
              <p className="font-display text-xl font-bold">Something went wrong</p>
              <p className="text-ink-soft">{error}</p>
              <Link href="/" className="btn btn-grape">Back home</Link>
            </div>
          )}
        </div>
      </aside>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </div>
  );
}

function AlreadyPlayed({ result, streak, onReplay }: { result: MatchSummary; streak: number; onReplay: () => void }) {
  return (
    <div className="space-y-3">
      <div className="card p-4 text-center">
        <p className="font-display text-xl font-bold">You’ve built today’s tower! 🏰</p>
        <p className="text-sm text-ink-soft">One official attempt per day. Here’s how you did — share it and come back tomorrow.</p>
      </div>
      <ResultsPanel summary={result} streak={streak} onPlayAgain={() => {}} />
      <button type="button" className="btn btn-ghost w-full !text-base" onClick={onReplay}>
        Practice replay (won’t change your result)
      </button>
    </div>
  );
}
