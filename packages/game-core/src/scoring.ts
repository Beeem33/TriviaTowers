import type { MatchSummary, GameMode } from "@triviatowers/shared-types";
import { DEFAULT_RULES, type GameRules } from "./rules";

export interface ScoreInput {
  correct: boolean;
  /** Milliseconds between the question becoming answerable and the answer arriving. */
  elapsedMs: number;
  /** Consecutive correct answers before this one. */
  streakBefore: number;
}

export interface ScoreBreakdown {
  points: number;
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  streakAfter: number;
  /** 1 if this answer adds a tower floor. */
  floorsAdded: 0 | 1;
}

/**
 * Deterministic integer scoring.
 *  - correct: base + speed bonus (linear from full at grace period to 0 at the deadline)
 *             + streak bonus (streakStep per prior consecutive correct answer, capped)
 *  - wrong / timeout / late: 0 points, streak resets
 */
export function scoreAnswer(input: ScoreInput, rules: GameRules = DEFAULT_RULES): ScoreBreakdown {
  const elapsed = Math.max(0, Math.floor(input.elapsedMs));
  const inTime = elapsed <= rules.questionTimeMs;
  if (!input.correct || !inTime) {
    return { points: 0, basePoints: 0, speedBonus: 0, streakBonus: 0, streakAfter: 0, floorsAdded: 0 };
  }
  const window = Math.max(1, rules.questionTimeMs - rules.speedGraceMs);
  const late = Math.max(0, elapsed - rules.speedGraceMs);
  // round-half-up(maxSpeedBonus × remaining / window) in pure integer maths, so the SQL
  // implementation (supabase/migrations, tt_score) produces bit-identical results.
  const remaining = Math.max(0, window - late);
  const speedBonus = Math.floor((2 * rules.maxSpeedBonus * remaining + window) / (2 * window));
  const streakBefore = Math.max(0, Math.floor(input.streakBefore));
  const streakBonus = Math.min(rules.maxStreakBonus, streakBefore * rules.streakStep);
  const basePoints = rules.basePoints;
  return {
    points: basePoints + speedBonus + streakBonus,
    basePoints,
    speedBonus,
    streakBonus,
    streakAfter: streakBefore + 1,
    floorsAdded: 1,
  };
}

export interface AnswerRecord {
  correct: boolean;
  elapsedMs: number;
  points: number;
}

/** Builds the results-screen summary from per-answer records. */
export function summarizeMatch(
  answers: readonly AnswerRecord[],
  opts: { mode: GameMode; ranked: boolean; dateKey?: string; dailyNumber?: number; finishedAt?: Date; rules?: GameRules },
): MatchSummary {
  const rules = opts.rules ?? DEFAULT_RULES;
  let score = 0;
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  let totalAnswerMs = 0;
  for (const a of answers) {
    score += a.points;
    totalAnswerMs += Math.min(Math.max(0, a.elapsedMs), rules.questionTimeMs);
    if (a.correct) {
      correct++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
  }
  const total = answers.length;
  return {
    mode: opts.mode,
    dateKey: opts.dateKey,
    dailyNumber: opts.dailyNumber,
    ranked: opts.ranked,
    score,
    correct,
    total,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 100),
    floors: correct,
    bestStreak,
    totalAnswerMs,
    outcomes: answers.map((a) => a.correct),
    finishedAt: (opts.finishedAt ?? new Date()).toISOString(),
  };
}

/**
 * Leaderboard ordering: higher score, then more correct answers, then lower total answer time.
 * Returns negative when `a` ranks above `b`.
 */
export function compareResults(
  a: Pick<MatchSummary, "score" | "correct" | "totalAnswerMs">,
  b: Pick<MatchSummary, "score" | "correct" | "totalAnswerMs">,
): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.correct !== b.correct) return b.correct - a.correct;
  return a.totalAnswerMs - b.totalAnswerMs;
}

/** Highest possible score for a match of `count` questions. */
export function maxPossibleScore(count: number, rules: GameRules = DEFAULT_RULES): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += rules.basePoints + rules.maxSpeedBonus + Math.min(rules.maxStreakBonus, i * rules.streakStep);
  }
  return total;
}
