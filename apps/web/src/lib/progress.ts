/**
 * Local (guest) progress. Phase 1 stores everything in this browser only.
 * Phase 3 replaces this with Supabase-backed profiles; guest data can be offered for
 * import when a guest creates an account.
 */
import type { MatchSummary } from "@triviatowers/shared-types";
import {
  computeDailyStreak,
  levelForXp,
  newAchievements,
  newlyUnlocked,
  utcDateKey,
  xpForMatch,
  type CosmeticItem,
  type XpBreakdown,
} from "@triviatowers/game-core";
import { readJSON, writeJSON } from "./storage";

const KEY = "tt.progress.v1";
const HISTORY_LIMIT = 30;

export interface LocalProgress {
  playerId: string;
  /** Today's-style daily results keyed by UTC date. First completion only. */
  daily: Record<string, MatchSummary>;
  history: MatchSummary[];
  lifetime: { games: number; answered: number; correct: number; score: number; highestTower: number };
  /** Best Endless Tower run (by floors, then score). `finishedAt` identifies the record run. */
  endlessBest: { floors: number; score: number; finishedAt: string } | null;
  xp: number;
  /** Achievement id → ISO time unlocked. */
  achievements: Record<string, string>;
}

/** What a finished match earned, shown on the results screen. */
export interface MatchRewards {
  /** Identifies the match these rewards belong to. */
  finishedAt: string;
  xp: XpBreakdown;
  xpAfter: number;
  levelBefore: number;
  levelAfter: number;
  achievements: { id: string; name: string; icon: string; description: string }[];
  unlocked: CosmeticItem[];
}

function newPlayerId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  return c?.randomUUID ? c.randomUUID() : `guest-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function empty(): LocalProgress {
  return {
    playerId: newPlayerId(),
    daily: {},
    history: [],
    lifetime: { games: 0, answered: 0, correct: 0, score: 0, highestTower: 0 },
    endlessBest: null,
    xp: 0,
    achievements: {},
  };
}

export function loadProgress(): LocalProgress {
  const p = readJSON<LocalProgress | null>(KEY, null);
  if (!p || typeof p !== "object" || !p.playerId) {
    const fresh = empty();
    writeJSON(KEY, fresh);
    return fresh;
  }
  return { ...empty(), ...p, lifetime: { ...empty().lifetime, ...p.lifetime } };
}

/**
 * Records a finished match and works out its rewards (XP, level, achievements, unlocks).
 * Daily results are only kept for the first completion of a day. Practice replays of a
 * daily earn answer XP only (no daily bonus, no achievements), since the answers are known.
 */
export function recordMatch(summary: MatchSummary, opts: { countsAsDaily: boolean }): { progress: LocalProgress; rewards: MatchRewards } {
  const p = loadProgress();
  const practice = summary.mode === "daily" && !opts.countsAsDaily;
  const before = { level: levelForXp(p.xp), achievements: new Set(Object.keys(p.achievements)) };
  if (opts.countsAsDaily && summary.dateKey && !p.daily[summary.dateKey]) {
    p.daily[summary.dateKey] = summary;
  }
  if (summary.mode === "endless") {
    const best = p.endlessBest;
    if (!best || summary.floors > best.floors || (summary.floors === best.floors && summary.score > best.score)) {
      p.endlessBest = { floors: summary.floors, score: summary.score, finishedAt: summary.finishedAt };
    }
  }
  p.history = [summary, ...p.history].slice(0, HISTORY_LIMIT);
  p.lifetime.games += 1;
  p.lifetime.answered += summary.total;
  p.lifetime.correct += summary.correct;
  p.lifetime.score += summary.score;
  p.lifetime.highestTower = Math.max(p.lifetime.highestTower, summary.floors);
  const breakdown = xpForMatch(summary);
  const xp: XpBreakdown = practice
    ? { ...breakdown, dailyBonus: 0, perfectBonus: 0, total: breakdown.correct + breakdown.answered }
    : breakdown;
  p.xp += xp.total;

  const earned = practice
    ? []
    : newAchievements(
        {
          summary,
          totals: {
            games: p.lifetime.games,
            correct: p.lifetime.correct,
            answered: p.lifetime.answered,
            dailyStreak: computeDailyStreak(Object.keys(p.daily), summary.dateKey ?? utcDateKey()),
            endlessBestFloors: p.endlessBest?.floors ?? 0,
            dailiesCompleted: Object.keys(p.daily).length,
          },
        },
        before.achievements,
      );
  for (const a of earned) p.achievements[a.id] = summary.finishedAt;

  const after = { level: levelForXp(p.xp), achievements: new Set(Object.keys(p.achievements)) };
  writeJSON(KEY, p);
  notify();
  return {
    progress: p,
    rewards: {
      finishedAt: summary.finishedAt,
      xp,
      xpAfter: p.xp,
      levelBefore: before.level,
      levelAfter: after.level,
      achievements: earned.map(({ id, name, icon, description }) => ({ id, name, icon, description })),
      unlocked: newlyUnlocked(before, after),
    },
  };
}

/** Replaces stored progress (used by progress import) and notifies the UI. */
export function saveProgress(p: LocalProgress): void {
  writeJSON(KEY, p);
  notify();
}

/* ---- Subscription API so React can read progress with useSyncExternalStore ---- */
const EVENT = "tt-progress";
let cachedRaw: string | null | undefined;
let cachedValue: LocalProgress | null = null;

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function subscribeProgress(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Referentially stable snapshot (only changes when the stored JSON changes). */
export function getProgressSnapshot(): LocalProgress {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    /* ignore */
  }
  if (raw !== cachedRaw || !cachedValue) {
    cachedValue = loadProgress();
    try {
      cachedRaw = window.localStorage.getItem(KEY);
    } catch {
      cachedRaw = raw;
    }
  }
  return cachedValue;
}

export function dailyStreak(p: LocalProgress, today = utcDateKey()): number {
  return computeDailyStreak(Object.keys(p.daily), today);
}

export function todaysResult(p: LocalProgress, today = utcDateKey()): MatchSummary | undefined {
  return p.daily[today];
}
