import { DAILY_EPOCH_DATE_KEY } from "./rules";

const DAY_MS = 86_400_000;

/** UTC calendar date key, e.g. "2026-11-06". All daily logic uses UTC. */
export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateKey(key: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error(`Invalid date key: ${key}`);
  const ms = Date.parse(`${key}T00:00:00.000Z`);
  if (Number.isNaN(ms)) throw new Error(`Invalid date key: ${key}`);
  return ms;
}

export function addDays(key: string, days: number): string {
  return utcDateKey(new Date(parseDateKey(key) + days * DAY_MS));
}

/** Daily Tower number (#1 on the epoch date). Returns <= 0 before launch. */
export function dailyNumber(key: string, epochKey: string = DAILY_EPOCH_DATE_KEY): number {
  return Math.round((parseDateKey(key) - parseDateKey(epochKey)) / DAY_MS) + 1;
}

/** Milliseconds until the next 00:00 UTC reset. */
export function msUntilNextDaily(now: Date = new Date()): number {
  const next = parseDateKey(utcDateKey(now)) + DAY_MS;
  return Math.max(0, next - now.getTime());
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
