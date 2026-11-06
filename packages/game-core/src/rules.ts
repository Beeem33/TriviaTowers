/**
 * Single source of truth for game balance. Imported by the browser (for display and
 * local play) and by backend functions (for authoritative scoring). Changing a value
 * here changes scoring everywhere — bump RULES_VERSION when you do.
 */
export const RULES_VERSION = 1;

export interface GameRules {
  /** Time allowed per question. */
  questionTimeMs: number;
  /** Answers faster than this earn the full speed bonus (absorbs reading + latency). */
  speedGraceMs: number;
  basePoints: number;
  maxSpeedBonus: number;
  /** Bonus added per consecutive correct answer beyond the first. */
  streakStep: number;
  maxStreakBonus: number;
  /** Questions in an official Daily Tower. */
  dailyQuestionCount: number;
  /** Questions in a Quick Build round. */
  quickQuestionCount: number;
}

export const DEFAULT_RULES: Readonly<GameRules> = Object.freeze({
  questionTimeMs: 15_000,
  speedGraceMs: 1_000,
  basePoints: 100,
  maxSpeedBonus: 50,
  streakStep: 10,
  maxStreakBonus: 50,
  dailyQuestionCount: 10,
  quickQuestionCount: 10,
});

/** UTC date of Daily Tower #1. Configure before launch. */
export const DAILY_EPOCH_DATE_KEY = "2026-11-01";
