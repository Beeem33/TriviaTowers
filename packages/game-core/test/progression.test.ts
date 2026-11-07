import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS, COSMETICS, ISLAND_THEMES, TOWER_SKINS, isUnlocked, levelForXp, levelProgress, newAchievements,
  newlyUnlocked, summarizeMatch, xpForLevel, xpForMatch, type PlayerTotals,
} from "../src";

const totals = (p: Partial<PlayerTotals> = {}): PlayerTotals => ({
  games: 1, correct: 0, answered: 0, dailyStreak: 0, endlessBestFloors: 0, dailiesCompleted: 0, ...p,
});
const match = (mode: "daily" | "quick" | "endless", results: boolean[], ms = 3000) =>
  summarizeMatch(results.map((c) => ({ correct: c, elapsedMs: ms, points: c ? 150 : 0 })), { mode, ranked: false });

describe("XP and levels", () => {
  it("awards XP for answers plus daily and perfect bonuses", () => {
    expect(xpForMatch(match("quick", [true, false, true])).total).toBe(2 * 10 + 3 * 2);
    const perfectDaily = xpForMatch(match("daily", Array(10).fill(true)));
    expect(perfectDaily).toMatchObject({ correct: 100, answered: 20, dailyBonus: 25, perfectBonus: 25, total: 170 });
    expect(xpForMatch(match("endless", Array(12).fill(true))).perfectBonus).toBe(0);
  });

  it("uses a growing level curve", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(999)).toBe(4);
    const p = levelProgress(450);
    expect(p).toMatchObject({ level: 3, into: 150, span: 300, fraction: 0.5, title: "Apprentice" });
  });
});

describe("achievements", () => {
  it("have unique ids", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it("unlock from a single match and are not awarded twice", () => {
    const s = match("daily", Array(10).fill(true), 2000);
    const got = newAchievements({ summary: s, totals: totals({ correct: 10, answered: 10 }) }, new Set()).map((a) => a.id);
    expect(got).toEqual(expect.arrayContaining(["first-brick", "hot-streak", "perfect-builder", "lightning"]));
    expect(got).not.toContain("clean-sweep");
    const again = newAchievements({ summary: s, totals: totals() }, new Set(got)).map((a) => a.id);
    expect(again).toEqual([]);
  });

  it("track cumulative goals through totals", () => {
    const s = match("quick", [false]);
    const ids = newAchievements({ summary: s, totals: totals({ dailyStreak: 7, games: 25, endlessBestFloors: 20 }) }, new Set()).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(["habit", "brainiac", "regular", "ten-up", "cloud-climber"]));
    expect(ids).not.toContain("sky-high");
  });
});

describe("cosmetics", () => {
  it("every catalogue item has art data", () => {
    for (const c of COSMETICS) {
      expect(c.kind === "skin" ? TOWER_SKINS[c.id] : ISLAND_THEMES[c.id]).toBeDefined();
    }
  });

  it("unlock by level or achievement", () => {
    const candy = COSMETICS.find((c) => c.id === "candy")!;
    const haunted = COSMETICS.find((c) => c.id === "haunted")!;
    expect(isUnlocked(candy, { level: 2, achievements: new Set() })).toBe(false);
    expect(isUnlocked(candy, { level: 3, achievements: new Set() })).toBe(true);
    expect(isUnlocked(haunted, { level: 99, achievements: new Set() })).toBe(false);
    expect(isUnlocked(haunted, { level: 1, achievements: new Set(["brainiac"]) })).toBe(true);
    const fresh = newlyUnlocked({ level: 1, achievements: new Set() }, { level: 4, achievements: new Set() }).map((c) => c.id);
    expect(fresh).toEqual(["candy", "desert", "snow"]);
  });
});
