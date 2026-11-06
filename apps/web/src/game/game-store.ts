"use client";
/**
 * Match state machine.
 *
 *   idle -> intro -> question <-> reveal -> finished
 *
 * The store never decides correctness or points itself: it asks the GameSession.
 * 3D components subscribe to `buildTick` / `wobbleTick` to play animations.
 */
import { create } from "zustand";
import type { AnswerVerdict, ChoiceIndex, MatchSummary, PublicQuestion } from "@triviatowers/shared-types";
import type { GameSession } from "./session";

export type GameStatus = "idle" | "intro" | "question" | "submitting" | "reveal" | "finished" | "error";

interface GameState {
  status: GameStatus;
  /** Increments every time a new match is loaded (used to remount the tower). */
  matchSeq: number;
  session: GameSession | null;
  questions: readonly PublicQuestion[];
  index: number;
  /** performance.now() when the current question became answerable. */
  shownAt: number;
  /** performance.now() deadline for the current question. */
  deadline: number;
  selected: ChoiceIndex | null;
  verdict: AnswerVerdict | null;
  verdicts: AnswerVerdict[];
  score: number;
  streak: number;
  bestStreak: number;
  floors: number;
  buildTick: number;
  wobbleTick: number;
  summary: MatchSummary | null;
  error: string | null;

  load: (session: GameSession) => void;
  beginQuestion: () => void;
  answer: (choice: ChoiceIndex | null) => Promise<void>;
  next: () => Promise<void>;
  reset: () => void;
}

const initial = {
  status: "idle" as GameStatus,
  matchSeq: 0,
  session: null,
  questions: [] as readonly PublicQuestion[],
  index: 0,
  shownAt: 0,
  deadline: 0,
  selected: null,
  verdict: null,
  verdicts: [] as AnswerVerdict[],
  score: 0,
  streak: 0,
  bestStreak: 0,
  floors: 0,
  buildTick: 0,
  wobbleTick: 0,
  summary: null,
  error: null,
};

export const useGame = create<GameState>()((set, get) => ({
  ...initial,

  load: (session) => set((s) => ({ ...initial, matchSeq: s.matchSeq + 1, session, questions: session.questions, status: "intro" })),

  beginQuestion: () => {
    const { session } = get();
    if (!session) return;
    const now = performance.now();
    set({ status: "question", shownAt: now, deadline: now + session.rules.questionTimeMs, selected: null, verdict: null });
  },

  answer: async (choice) => {
    const { status, session, questions, index, shownAt } = get();
    if (status !== "question" || !session) return; // ignore double submits
    const q = questions[index];
    if (!q) return;
    const elapsedMs = Math.round(performance.now() - shownAt);
    set({ status: "submitting", selected: choice });
    try {
      const verdict = await session.submit(q.id, choice, elapsedMs);
      const s = get();
      set({
        status: "reveal",
        verdict,
        verdicts: [...s.verdicts, verdict],
        score: s.score + verdict.points,
        streak: verdict.streakAfter,
        bestStreak: Math.max(s.bestStreak, verdict.streakAfter),
        floors: s.floors + (verdict.correct ? 1 : 0),
        buildTick: s.buildTick + (verdict.correct ? 1 : 0),
        wobbleTick: s.wobbleTick + (verdict.correct ? 0 : 1),
      });
    } catch (e) {
      set({ status: "error", error: e instanceof Error ? e.message : "Something went wrong" });
    }
  },

  next: async () => {
    const { status, session, index, questions } = get();
    if (status !== "reveal" || !session) return;
    if (index + 1 < questions.length) {
      set({ index: index + 1 });
      get().beginQuestion();
      return;
    }
    const summary = await session.finish();
    set({ status: "finished", summary });
  },

  reset: () => set((s) => ({ ...initial, matchSeq: s.matchSeq })),
}));
