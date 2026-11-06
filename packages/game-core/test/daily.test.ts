import { describe, expect, it } from "vitest";
import {
  utcDateKey, dailyNumber, msUntilNextDaily, formatCountdown, addDays,
  computeDailyStreak, nextStreakMilestone,
  selectQuestionSet, shuffleChoices, toPublicQuestion, SAMPLE_QUESTIONS,
} from "../src";

describe("daily calendar (UTC)", () => {
  it("uses UTC dates regardless of local offsets", () => {
    expect(utcDateKey(new Date("2026-11-06T23:59:59-05:00"))).toBe("2026-11-07");
    expect(utcDateKey(new Date("2026-11-06T00:00:00Z"))).toBe("2026-11-06");
  });
  it("numbers dailies from the epoch", () => {
    expect(dailyNumber("2026-11-01")).toBe(1);
    expect(dailyNumber("2026-11-06")).toBe(6);
    expect(dailyNumber("2027-11-01")).toBe(366);
  });
  it("counts down to 00:00 UTC", () => {
    expect(msUntilNextDaily(new Date("2026-11-06T23:00:00Z"))).toBe(3_600_000);
    expect(formatCountdown(3_723_000)).toBe("01:02:03");
  });
  it("handles month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });
});

describe("daily streaks", () => {
  it("counts consecutive days ending today or yesterday", () => {
    const done = ["2026-11-03", "2026-11-04", "2026-11-05"];
    expect(computeDailyStreak(done, "2026-11-05")).toBe(3);
    expect(computeDailyStreak(done, "2026-11-06")).toBe(3); // at risk, not broken
    expect(computeDailyStreak(done, "2026-11-07")).toBe(0);
    expect(computeDailyStreak([...done, "2026-11-06"], "2026-11-06")).toBe(4);
  });
  it("finds the next milestone", () => {
    expect(nextStreakMilestone(0)).toBe(3);
    expect(nextStreakMilestone(7)).toBe(14);
    expect(nextStreakMilestone(100)).toBeNull();
  });
});

describe("question selection", () => {
  it("bank entries are well-formed", () => {
    const ids = new Set<string>();
    for (const q of SAMPLE_QUESTIONS) {
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.explanation.length).toBeGreaterThan(10);
      expect(q.source).toMatch(/^https:\/\//);
    }
    expect(SAMPLE_QUESTIONS.length).toBeGreaterThanOrEqual(10);
  });

  it("is deterministic for the same seed and varies across days", () => {
    const a = selectQuestionSet(SAMPLE_QUESTIONS, "daily|2026-11-06", { count: 10 }).map((q) => q.id);
    const b = selectQuestionSet(SAMPLE_QUESTIONS, "daily|2026-11-06", { count: 10 }).map((q) => q.id);
    const c = selectQuestionSet(SAMPLE_QUESTIONS, "daily|2026-11-07", { count: 10 }).map((q) => q.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(new Set(a).size).toBe(10);
  });

  it("balances categories and ramps difficulty", () => {
    const set = selectQuestionSet(SAMPLE_QUESTIONS, "daily|2026-11-06", { count: 10 });
    const perCat = new Map<string, number>();
    for (const q of set) perCat.set(q.category, (perCat.get(q.category) ?? 0) + 1);
    expect(Math.max(...perCat.values())).toBeLessThanOrEqual(2);
    const order = { easy: 0, medium: 1, hard: 2 } as const;
    const levels = set.map((q) => order[q.difficulty]);
    expect(levels).toEqual([...levels].sort((x, y) => x - y));
  });

  it("shuffles choices consistently and keeps the right answer", () => {
    for (const q of SAMPLE_QUESTIONS) {
      const s = shuffleChoices(q, "seed");
      expect(s.choices[s.correctIndex]).toBe(q.choices[q.correctIndex]);
      expect(shuffleChoices(q, "seed").choices).toEqual(s.choices);
    }
    // The stored "correct answer first" convention must not survive shuffling.
    const firstSlot = SAMPLE_QUESTIONS.map((q) => shuffleChoices(q, "x").correctIndex).filter((i) => i === 0).length;
    expect(firstSlot).toBeLessThan(SAMPLE_QUESTIONS.length * 0.5);
  });

  it("public questions carry no answer key", () => {
    const pub = toPublicQuestion(SAMPLE_QUESTIONS[0]!) as unknown as Record<string, unknown>;
    expect(pub).not.toHaveProperty("correctIndex");
    expect(pub).not.toHaveProperty("explanation");
  });
});
