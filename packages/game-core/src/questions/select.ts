import type { Question, PublicQuestion, Difficulty, ChoiceIndex, Choices } from "@triviatowers/shared-types";
import { createRng, hashString, seededShuffle } from "../random";
import { addDays } from "../daily";

const DIFFICULTY_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/** Target difficulty mix for a 10-question set; scales for other sizes. */
const DIFFICULTY_TARGET: Record<Difficulty, number> = { easy: 0.4, medium: 0.4, hard: 0.2 };

export interface SelectOptions {
  count: number;
  /** Maximum questions from one category (default 2). */
  maxPerCategory?: number;
  /** Sort the final set easy -> hard (default true). */
  difficultyRamp?: boolean;
  excludeIds?: ReadonlySet<string>;
}

/**
 * Deterministically picks a balanced question set from a bank.
 * Used for local Daily/Quick play now, and as the "auto-draft" for the admin
 * daily scheduler later (admins then review/edit and publish the set).
 */
export function selectQuestionSet(bank: readonly Question[], seed: string, opts: SelectOptions): Question[] {
  const rng = createRng(hashString(seed));
  const pool = seededShuffle(
    bank.filter((q) => !opts.excludeIds?.has(q.id)),
    rng,
  );
  const count = Math.min(opts.count, pool.length);
  const maxPerCategory = opts.maxPerCategory ?? 2;

  const quota: Record<Difficulty, number> = {
    easy: Math.round(count * DIFFICULTY_TARGET.easy),
    hard: Math.round(count * DIFFICULTY_TARGET.hard),
    medium: 0,
  };
  quota.medium = count - quota.easy - quota.hard;

  const chosen: Question[] = [];
  const perCategory = new Map<string, number>();
  const take = (q: Question) => {
    chosen.push(q);
    perCategory.set(q.category, (perCategory.get(q.category) ?? 0) + 1);
  };

  // Pass 1: respect both the difficulty quota and the category cap.
  for (const q of pool) {
    if (chosen.length >= count) break;
    if (quota[q.difficulty] <= 0) continue;
    if ((perCategory.get(q.category) ?? 0) >= maxPerCategory) continue;
    quota[q.difficulty]--;
    take(q);
  }
  // Pass 2: fill remaining slots respecting only the category cap, then anything.
  for (const relaxCategory of [false, true]) {
    for (const q of pool) {
      if (chosen.length >= count) break;
      if (chosen.includes(q)) continue;
      if (!relaxCategory && (perCategory.get(q.category) ?? 0) >= maxPerCategory) continue;
      take(q);
    }
  }

  if (opts.difficultyRamp ?? true) {
    // Stable sort keeps the shuffled order within each difficulty band.
    chosen.sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
  }
  return chosen;
}

/**
 * Shuffles a question's answer order deterministically (same for every player with the
 * same seed) and returns the re-indexed full question.
 */
export function shuffleChoices(q: Question, seed: string): Question {
  const rng = createRng(hashString(`${seed}|${q.id}`));
  const order = seededShuffle([0, 1, 2, 3] as const, rng);
  const choices = order.map((i) => q.choices[i]) as unknown as Choices;
  const correctIndex = order.indexOf(q.correctIndex) as ChoiceIndex;
  return { ...q, choices, correctIndex };
}

/** Strips the answer key and editorial metadata. */
export function toPublicQuestion(q: Question): PublicQuestion {
  return { id: q.id, prompt: q.prompt, choices: q.choices, category: q.category, difficulty: q.difficulty };
}

/**
 * Daily set with a no-repeat window: questions used on the previous `lookbackDays` days
 * (computed without their own lookback, so this stays O(days) and deterministic) are skipped.
 * Production dailies are curated by admins; this is the offline/auto-draft version.
 */
export function selectDailySet(bank: readonly Question[], dateKey: string, count: number, lookbackDays = 7): Question[] {
  const recent = new Set<string>();
  for (let d = 1; d <= lookbackDays; d++) {
    for (const q of selectQuestionSet(bank, `daily|${addDays(dateKey, -d)}`, { count })) recent.add(q.id);
  }
  const enough = bank.length - recent.size >= count * 2;
  return selectQuestionSet(bank, `daily|${dateKey}`, { count, excludeIds: enough ? recent : undefined });
}
