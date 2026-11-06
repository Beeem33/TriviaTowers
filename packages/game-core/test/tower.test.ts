import { describe, expect, it } from "vitest";
import { generateTower, towerSeed, floorRadius, BASE_RADIUS, MIN_RADIUS_FACTOR, FOUNDATION_HEIGHT, TOWER_SKINS, buildShareText, summarizeMatch } from "../src";

describe("tower blueprints", () => {
  it("is deterministic", () => {
    const seed = towerSeed("player-1", "2026-11-06");
    expect(generateTower(seed, 25)).toEqual(generateTower(seed, 25));
  });

  it("extending a tower never changes existing floors", () => {
    const seed = towerSeed("player-1");
    const short = generateTower(seed, 8).floors;
    const tall = generateTower(seed, 30).floors.slice(0, 8);
    expect(tall).toEqual(short);
  });

  it("stacks floors without gaps and tapers within bounds", () => {
    const t = generateTower(42, 60);
    t.floors.forEach((f, i) => {
      expect(f.index).toBe(i + 1);
      expect(f.y).toBeCloseTo(FOUNDATION_HEIGHT + i * f.height);
      expect(f.radius).toBeLessThanOrEqual(BASE_RADIUS * 1.05);
      expect(f.radius).toBeGreaterThanOrEqual(BASE_RADIUS * MIN_RADIUS_FACTOR * 0.99);
    });
    expect(floorRadius(1)).toBeGreaterThan(floorRadius(40));
  });

  it("varies styles without long identical runs and marks milestones", () => {
    const floors = generateTower(7, 100).floors;
    let run = 1;
    for (let i = 1; i < floors.length; i++) {
      run = floors[i]!.style === floors[i - 1]!.style ? run + 1 : 1;
      expect(run).toBeLessThanOrEqual(2);
    }
    expect(new Set(floors.map((f) => f.style)).size).toBe(4);
    expect(floors.filter((f) => f.index % 5 === 0).every((f) => f.feature === "balcony")).toBe(true);
  });

  it("has a complete default skin", () => {
    expect(TOWER_SKINS.classic!.accents).toHaveLength(4);
  });
});

describe("share text", () => {
  it("is spoiler-free and branded", () => {
    const summary = summarizeMatch(
      [true, true, false, true].map((c) => ({ correct: c, elapsedMs: 3000, points: c ? 140 : 0 })),
      { mode: "daily", ranked: false, dailyNumber: 6, dateKey: "2026-11-06" },
    );
    const text = buildShareText(summary, { dailyStreak: 4 });
    expect(text).toContain("TriviaTowers.io · Daily Tower #6");
    expect(text).toContain("🟩🟩🟥🟩");
    expect(text).toContain("3 floors");
    expect(text).toContain("Streak: 4 days");
    expect(text).toContain("https://triviatowers.io");
    expect(text).not.toMatch(/Trivia Towers/);
  });
});
