import { describe, expect, it } from "vitest";
import {
  ENDLESS_LIVES, ENDLESS_MIN_TIME_MS, SAMPLE_QUESTIONS, createRng, endlessDifficultyWeights, endlessRules,
  endlessTimeLimitMs, pickEndlessQuestion, selectDailySet, selectQuestionSet, addDays, buildShareText, summarizeMatch,
} from "../src";

describe("endless rules", () => {
  it("shrinks the timer with height down to a minimum", () => {
    expect(endlessTimeLimitMs(0)).toBe(15_000);
    expect(endlessTimeLimitMs(8)).toBe(13_000);
    expect(endlessTimeLimitMs(500)).toBe(ENDLESS_MIN_TIME_MS);
    expect(endlessRules(8).questionTimeMs).toBe(13_000);
    expect(ENDLESS_LIVES).toBe(3);
  });

  it("weights shift toward hard questions and always sum to 1", () => {
    for (const f of [0, 6, 16, 40]) {
      const w = endlessDifficultyWeights(f);
      expect(w.easy + w.medium + w.hard).toBeCloseTo(1);
    }
    expect(endlessDifficultyWeights(40).hard).toBeGreaterThan(endlessDifficultyWeights(0).hard);
  });

  it("never repeats a question and exhausts the whole bank", () => {
    const rng = createRng(1);
    const used = new Set<string>();
    let prev: string | null = null;
    let sameCategoryInARow = 0;
    for (let floors = 0; ; floors++) {
      const q = pickEndlessQuestion(SAMPLE_QUESTIONS, used, floors, prev, rng);
      if (!q) break;
      expect(used.has(q.id)).toBe(false);
      if (q.category === prev) sameCategoryInARow++;
      used.add(q.id);
      prev = q.category;
    }
    expect(used.size).toBe(SAMPLE_QUESTIONS.length);
    expect(sameCategoryInARow).toBeLessThan(SAMPLE_QUESTIONS.length * 0.1);
  });

  it("gets harder as the tower grows", () => {
    const hardShare = (floors: number) => {
      const rng = createRng(floors + 99);
      let hard = 0;
      for (let i = 0; i < 400; i++) if (pickEndlessQuestion(SAMPLE_QUESTIONS, new Set(), floors, null, rng)?.difficulty === "hard") hard++;
      return hard / 400;
    };
    expect(hardShare(30)).toBeGreaterThan(hardShare(0) + 0.3);
  });
});

describe("daily no-repeat window", () => {
  it("does not reuse questions from the previous 7 days", () => {
    for (const day of ["2026-11-20", "2027-03-05", "2027-08-31"]) {
      const today = selectDailySet(SAMPLE_QUESTIONS, day, 10).map((q) => q.id);
      expect(new Set(today).size).toBe(10);
      for (let d = 1; d <= 7; d++) {
        const prior = selectQuestionSet(SAMPLE_QUESTIONS, `daily|${addDays(day, -d)}`, { count: 10 }).map((q) => q.id);
        expect(today.filter((id) => prior.includes(id))).toEqual([]);
      }
      expect(selectDailySet(SAMPLE_QUESTIONS, day, 10).map((q) => q.id)).toEqual(today);
    }
  });
});

describe("endless share text", () => {
  it("is labelled and skips the grid for long runs", () => {
    const answers = Array.from({ length: 30 }, (_, i) => ({ correct: i % 10 !== 9, elapsedMs: 3000, points: 120 }));
    const text = buildShareText(summarizeMatch(answers, { mode: "endless", ranked: false }));
    expect(text).toContain("Endless Tower");
    expect(text).not.toContain("🟩");
  });
});
