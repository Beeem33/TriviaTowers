import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, scoreAnswer, summarizeMatch, compareResults, maxPossibleScore } from "../src";

describe("scoreAnswer", () => {
  it("gives base + full speed bonus inside the grace period", () => {
    const r = scoreAnswer({ correct: true, elapsedMs: 800, streakBefore: 0 });
    expect(r).toMatchObject({ basePoints: 100, speedBonus: 50, streakBonus: 0, points: 150, streakAfter: 1, floorsAdded: 1 });
  });

  it("decays the speed bonus linearly to 0 at the deadline", () => {
    const mid = DEFAULT_RULES.speedGraceMs + (DEFAULT_RULES.questionTimeMs - DEFAULT_RULES.speedGraceMs) / 2;
    expect(scoreAnswer({ correct: true, elapsedMs: mid, streakBefore: 0 }).speedBonus).toBe(25);
    expect(scoreAnswer({ correct: true, elapsedMs: DEFAULT_RULES.questionTimeMs, streakBefore: 0 }).speedBonus).toBe(0);
  });

  it("adds 10 per prior streak answer, capped at 50", () => {
    expect(scoreAnswer({ correct: true, elapsedMs: 0, streakBefore: 1 }).streakBonus).toBe(10);
    expect(scoreAnswer({ correct: true, elapsedMs: 0, streakBefore: 4 }).streakBonus).toBe(40);
    expect(scoreAnswer({ correct: true, elapsedMs: 0, streakBefore: 9 }).streakBonus).toBe(50);
  });

  it("scores wrong, late and negative-time answers safely", () => {
    expect(scoreAnswer({ correct: false, elapsedMs: 100, streakBefore: 5 })).toMatchObject({ points: 0, streakAfter: 0, floorsAdded: 0 });
    expect(scoreAnswer({ correct: true, elapsedMs: DEFAULT_RULES.questionTimeMs + 1, streakBefore: 2 }).points).toBe(0);
    expect(scoreAnswer({ correct: true, elapsedMs: -500, streakBefore: 0 }).points).toBe(150);
  });

  it("is deterministic and integer-valued", () => {
    for (let ms = 0; ms <= 15_000; ms += 137) {
      const a = scoreAnswer({ correct: true, elapsedMs: ms, streakBefore: 3 });
      const b = scoreAnswer({ correct: true, elapsedMs: ms, streakBefore: 3 });
      expect(a).toEqual(b);
      expect(Number.isInteger(a.points)).toBe(true);
    }
  });
});

describe("summarizeMatch", () => {
  it("computes accuracy, floors, best streak and capped answer time", () => {
    const s = summarizeMatch(
      [
        { correct: true, elapsedMs: 2000, points: 143 },
        { correct: true, elapsedMs: 3000, points: 150 },
        { correct: false, elapsedMs: 99_999, points: 0 },
        { correct: true, elapsedMs: 1000, points: 150 },
      ],
      { mode: "quick", ranked: false, finishedAt: new Date("2026-11-06T12:00:00Z") },
    );
    expect(s).toMatchObject({ score: 443, correct: 3, total: 4, accuracy: 75, floors: 3, bestStreak: 2, totalAnswerMs: 21_000 });
    expect(s.outcomes).toEqual([true, true, false, true]);
  });
});

describe("compareResults (leaderboard ordering)", () => {
  it("orders by score, then correct answers, then faster total time", () => {
    const rows = [
      { id: "slow", score: 1000, correct: 8, totalAnswerMs: 40_000 },
      { id: "fast", score: 1000, correct: 8, totalAnswerMs: 30_000 },
      { id: "more-correct", score: 1000, correct: 9, totalAnswerMs: 90_000 },
      { id: "top", score: 1200, correct: 7, totalAnswerMs: 99_000 },
    ];
    expect(rows.sort(compareResults).map((r) => r.id)).toEqual(["top", "more-correct", "fast", "slow"]);
  });

  it("knows the perfect score for a 10-question daily", () => {
    // 10 × 150 + streak bonus 0+10+20+30+40+50×5 = 1500 + 350
    expect(maxPossibleScore(10)).toBe(1850);
  });
});
