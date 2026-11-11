export type GameMode = "daily" | "quick" | "battle" | "endless";

/** Summary of a finished match, used by the results screen, history and share cards. */
export interface MatchSummary {
  mode: GameMode;
  /** UTC date key (YYYY-MM-DD) for daily runs. */
  dateKey?: string;
  dailyNumber?: number;
  ranked: boolean;
  score: number;
  correct: number;
  total: number;
  accuracy: number;
  floors: number;
  bestStreak: number;
  totalAnswerMs: number;
  /** Per-question outcome, in order: true = correct. Used for spoiler-free share grids. */
  outcomes: boolean[];
  rank?: number;
  /** Number of finished players on the same daily (online only). */
  players?: number;
  /** True when the result was validated and stored by the server. */
  online?: boolean;
  /** Server attempt id (online daily) — shareable as a verified challenge link. */
  attemptId?: string;
  finishedAt: string;
}
