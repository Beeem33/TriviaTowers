/**
 * Endless Tower: keep answering until you run out of lives. Difficulty rises with height:
 * harder questions are drawn more often and the timer shrinks (to a floor of 10 s).
 */
import type { Difficulty, Question } from "@triviatowers/shared-types";
import { DEFAULT_RULES, type GameRules } from "./rules";

export const ENDLESS_LIVES = 3;
export const ENDLESS_MIN_TIME_MS = 10_000;
/** Timer shrinks by this much per floor built. */
export const ENDLESS_TIME_STEP_MS = 250;

export function endlessTimeLimitMs(floors: number, rules: GameRules = DEFAULT_RULES): number {
  return Math.max(ENDLESS_MIN_TIME_MS, rules.questionTimeMs - Math.max(0, floors) * ENDLESS_TIME_STEP_MS);
}

/** Rules for a question asked at a given height (same scoring, shorter timer). */
export function endlessRules(floors: number, rules: GameRules = DEFAULT_RULES): GameRules {
  return { ...rules, questionTimeMs: endlessTimeLimitMs(floors, rules) };
}

export function endlessDifficultyWeights(floors: number): Record<Difficulty, number> {
  if (floors < 5) return { easy: 0.6, medium: 0.35, hard: 0.05 };
  if (floors < 15) return { easy: 0.25, medium: 0.55, hard: 0.2 };
  if (floors < 25) return { easy: 0.1, medium: 0.5, hard: 0.4 };
  return { easy: 0.05, medium: 0.35, hard: 0.6 };
}

const ORDER: readonly Difficulty[] = ["easy", "medium", "hard"];

/**
 * Picks the next Endless question: weighted by difficulty for the current height, never
 * repeating within a run, avoiding the previous category when possible.
 * Falls back to neighbouring difficulties when a band is used up; null when the bank is exhausted.
 */
export function pickEndlessQuestion(
  bank: readonly Question[],
  usedIds: ReadonlySet<string>,
  floors: number,
  prevCategory: string | null,
  rng: () => number,
): Question | null {
  const unused = bank.filter((q) => !usedIds.has(q.id));
  if (unused.length === 0) return null;

  const weights = endlessDifficultyWeights(floors);
  let r = rng();
  let target: Difficulty = "hard";
  for (const d of ORDER) {
    r -= weights[d];
    if (r < 0) {
      target = d;
      break;
    }
  }
  // Try the target band first, then the closest bands (harder first when climbing).
  const t = ORDER.indexOf(target);
  const bands = [t, t + 1, t - 1, t + 2, t - 2].filter((i) => i >= 0 && i < ORDER.length).map((i) => ORDER[i] as Difficulty);

  for (const band of bands) {
    const inBand = unused.filter((q) => q.difficulty === band);
    if (inBand.length === 0) continue;
    const fresh = inBand.filter((q) => q.category !== prevCategory);
    const pool = fresh.length > 0 ? fresh : inBand;
    return pool[Math.floor(rng() * pool.length)] as Question;
  }
  return null;
}
