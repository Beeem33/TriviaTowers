import { addDays } from "./daily";

/**
 * Current daily streak: consecutive UTC days with a completed Daily Tower ending
 * today, or yesterday (a streak is "at risk", not broken, until today's reset passes).
 */
export function computeDailyStreak(completedKeys: Iterable<string>, todayKey: string): number {
  const done = new Set(completedKeys);
  let cursor = done.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while (done.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 100] as const;

export function nextStreakMilestone(streak: number): number | null {
  return STREAK_MILESTONES.find((m) => m > streak) ?? null;
}
