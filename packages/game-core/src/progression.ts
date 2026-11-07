/**
 * XP, levels and achievements. Pure functions over match summaries and lifetime totals,
 * so the same rules can run on the server once accounts exist (Phase 3).
 * All rewards are cosmetic: nothing here affects scoring.
 */
import type { MatchSummary } from "@triviatowers/shared-types";

/* ------------------------------------------------------------------ XP */

export const XP_RULES = {
  perCorrect: 10,
  perAnswered: 2,
  dailyCompletion: 25,
  perfectRound: 25,
} as const;

export interface XpBreakdown {
  total: number;
  correct: number;
  answered: number;
  dailyBonus: number;
  perfectBonus: number;
}

export function xpForMatch(s: MatchSummary): XpBreakdown {
  const correct = s.correct * XP_RULES.perCorrect;
  const answered = s.total * XP_RULES.perAnswered;
  const dailyBonus = s.mode === "daily" ? XP_RULES.dailyCompletion : 0;
  const perfect = s.mode !== "endless" && s.total >= 10 && s.correct === s.total;
  const perfectBonus = perfect ? XP_RULES.perfectRound : 0;
  return { total: correct + answered + dailyBonus + perfectBonus, correct, answered, dailyBonus, perfectBonus };
}

/* -------------------------------------------------------------- Levels */

/** Total XP needed to reach `level` (level 1 = 0 XP, 2 = 100, 3 = 300, 4 = 600, 5 = 1,000…). */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 50 * l * (l - 1);
}

export const MAX_LEVEL = 99;

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= xp) level++;
  return level;
}

export interface LevelProgress {
  level: number;
  title: string;
  xp: number;
  /** XP earned since reaching this level. */
  into: number;
  /** XP between this level and the next. */
  span: number;
  /** 0–1 progress toward the next level. */
  fraction: number;
}

const TITLES: [number, string][] = [
  [30, "Tower Legend"],
  [20, "Sky Engineer"],
  [15, "Master Architect"],
  [10, "Architect"],
  [7, "Master Builder"],
  [5, "Builder"],
  [3, "Apprentice"],
  [1, "Bricklayer"],
];

export function levelTitle(level: number): string {
  return (TITLES.find(([min]) => level >= min) as [number, string])[1];
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const span = xpForLevel(level + 1) - base;
  const into = xp - base;
  return { level, title: levelTitle(level), xp, into, span, fraction: level >= MAX_LEVEL ? 1 : into / span };
}

/* -------------------------------------------------------- Achievements */

/** Totals AFTER the match being evaluated has been counted. */
export interface PlayerTotals {
  games: number;
  correct: number;
  answered: number;
  dailyStreak: number;
  endlessBestFloors: number;
  dailiesCompleted: number;
}

export interface AchievementContext {
  summary: MatchSummary;
  totals: PlayerTotals;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Unlocked by this match (given totals that already include it)? */
  earned: (ctx: AchievementContext) => boolean;
  /** Optional progress display for cumulative achievements: [current, target]. */
  progress?: (t: PlayerTotals) => [number, number];
}

const isFixedPerfect = (s: MatchSummary) => s.mode !== "endless" && s.total >= 10 && s.correct === s.total;

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: "first-brick", name: "First Brick", description: "Answer your first question correctly.", icon: "🧱", earned: ({ summary }) => summary.correct >= 1 },
  { id: "hot-streak", name: "Hot Streak", description: "Get 5 answers in a row right.", icon: "🔥", earned: ({ summary }) => summary.bestStreak >= 5 },
  { id: "perfect-builder", name: "Perfect Builder", description: "Score 10/10 on a Daily Tower.", icon: "🏆", earned: ({ summary }) => summary.mode === "daily" && isFixedPerfect(summary) },
  { id: "clean-sweep", name: "Clean Sweep", description: "Score 10/10 in Quick Build.", icon: "✨", earned: ({ summary }) => summary.mode === "quick" && isFixedPerfect(summary) },
  {
    id: "lightning",
    name: "Lightning Builder",
    description: "Get 8 or more right in a 10-question round, using under 40 seconds in total.",
    icon: "⚡",
    earned: ({ summary }) => summary.mode !== "endless" && summary.total >= 10 && summary.correct >= 8 && summary.totalAnswerMs < 40_000,
  },
  { id: "habit", name: "Habit Forming", description: "Reach a 3-day Daily Tower streak.", icon: "📅", earned: ({ totals }) => totals.dailyStreak >= 3, progress: (t) => [t.dailyStreak, 3] },
  { id: "brainiac", name: "Brainiac", description: "Reach a 7-day Daily Tower streak.", icon: "🧠", earned: ({ totals }) => totals.dailyStreak >= 7, progress: (t) => [t.dailyStreak, 7] },
  { id: "unstoppable", name: "Unstoppable", description: "Reach a 30-day Daily Tower streak.", icon: "🚀", earned: ({ totals }) => totals.dailyStreak >= 30, progress: (t) => [t.dailyStreak, 30] },
  { id: "ten-up", name: "Ten Up", description: "Build 10 floors in Endless Tower.", icon: "🏗️", earned: ({ totals }) => totals.endlessBestFloors >= 10, progress: (t) => [t.endlessBestFloors, 10] },
  { id: "cloud-climber", name: "Cloud Climber", description: "Build 20 floors in Endless Tower.", icon: "☁️", earned: ({ totals }) => totals.endlessBestFloors >= 20, progress: (t) => [t.endlessBestFloors, 20] },
  { id: "sky-high", name: "Sky High", description: "Build 50 floors in Endless Tower.", icon: "🌤️", earned: ({ totals }) => totals.endlessBestFloors >= 50, progress: (t) => [t.endlessBestFloors, 50] },
  { id: "regular", name: "Regular", description: "Play 25 games.", icon: "🎮", earned: ({ totals }) => totals.games >= 25, progress: (t) => [t.games, 25] },
  { id: "centurion", name: "Centurion", description: "Answer 100 questions correctly.", icon: "💯", earned: ({ totals }) => totals.correct >= 100, progress: (t) => [t.correct, 100] },
  { id: "tower-legend", name: "Tower Legend", description: "Answer 1,000 questions correctly.", icon: "👑", earned: ({ totals }) => totals.correct >= 1000, progress: (t) => [t.correct, 1000] },
];

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Achievements newly earned by this match (excluding ones already unlocked). */
export function newAchievements(ctx: AchievementContext, unlocked: ReadonlySet<string>): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.earned(ctx));
}
