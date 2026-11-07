/**
 * Online Daily Tower: the server (Supabase RPC) serves one question at a time, measures
 * answer time, scores, and stores the result. The browser never has the answer key.
 */
import type { AnswerVerdict, ChoiceIndex, MatchSummary, PublicQuestion } from "@triviatowers/shared-types";
import { DEFAULT_RULES, towerSeed } from "@triviatowers/game-core";
import { ensureGuest, withTimeout } from "@/lib/supabase";
import type { GameSession } from "./session";

interface ServerSummary {
  dateKey: string;
  dailyNumber: number;
  score: number;
  correct: number;
  total: number;
  accuracy: number;
  floors: number;
  bestStreak: number;
  totalAnswerMs: number;
  outcomes: boolean[];
  rank: number;
  players: number;
  finishedAt: string;
}

interface PlayState {
  status: "playing";
  attemptId: string;
  dateKey: string;
  dailyNumber: number;
  total: number;
  index: number;
  servedAt: number;
  serverNow: number;
  timeLimitMs: number;
  question: PublicQuestion;
  progress: { score: number; correct: number; streak: number; bestStreak: number; outcomes: boolean[] };
}

type PlayResponse = PlayState | { status: "finished"; attemptId: string; summary: ServerSummary };

export function toMatchSummary(s: ServerSummary): MatchSummary {
  return {
    mode: "daily",
    dateKey: s.dateKey,
    dailyNumber: s.dailyNumber,
    ranked: true,
    online: true,
    score: s.score,
    correct: s.correct,
    total: s.total,
    accuracy: Math.round(s.accuracy),
    floors: s.floors,
    bestStreak: s.bestStreak,
    totalAnswerMs: s.totalAnswerMs,
    outcomes: s.outcomes,
    rank: s.rank,
    players: s.players,
    finishedAt: new Date(s.finishedAt).toISOString(),
  };
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const sb = await ensureGuest();
  const { data, error } = await withTimeout(sb.rpc(fn, args));
  if (error) throw new Error(error.message);
  return data as T;
}

/** Today's finished result for this player, or null (does not start an attempt). */
export async function fetchMyDailyResult(): Promise<MatchSummary | null> {
  const data = await call<ServerSummary | null>("daily_my_result", {});
  return data ? toMatchSummary(data) : null;
}

export class OnlineDailySession implements GameSession {
  readonly mode = "daily" as const;
  readonly ranked = true;
  readonly rules = DEFAULT_RULES;
  readonly towerSeed: number;
  readonly dateKey: string;
  readonly dailyNumber: number;
  readonly expectedTotal: number;
  /** Server index of the first question in `questions` (non-zero when resuming). */
  readonly indexOffset: number;
  readonly initial: { score: number; floors: number; streak: number; bestStreak: number };
  questions: readonly PublicQuestion[] = [];
  private readonly attemptId: string;
  private readonly limits: { remainingMs: number; receivedAt: number }[] = [];
  private summary: MatchSummary | null = null;
  private done = false;

  private constructor(s: PlayState, private readonly name: string) {
    this.attemptId = s.attemptId;
    this.dateKey = s.dateKey;
    this.dailyNumber = s.dailyNumber;
    this.expectedTotal = s.total;
    this.indexOffset = s.index;
    this.towerSeed = towerSeed(s.attemptId);
    this.initial = { score: s.progress.score, floors: s.progress.correct, streak: s.progress.streak, bestStreak: s.progress.bestStreak };
    this.accept(s);
  }

  /** Starts or resumes today's attempt. Returns a finished summary if already played. */
  static async start(name: string): Promise<{ kind: "playing"; session: OnlineDailySession } | { kind: "finished"; summary: MatchSummary }> {
    const res = await call<PlayResponse>("daily_play", { p_name: name });
    if (res.status === "finished") return { kind: "finished", summary: toMatchSummary(res.summary) };
    return { kind: "playing", session: new OnlineDailySession(res, name) };
  }

  private accept(s: PlayState) {
    // Time already used on the server clock when the response left (survives refreshes).
    const used = Math.max(0, s.serverNow - s.servedAt);
    this.limits.push({ remainingMs: Math.max(1000, s.timeLimitMs - used), receivedAt: performance.now() });
    this.questions = [...this.questions, s.question];
  }

  timeLimitMs(index: number): number {
    const l = this.limits[index];
    if (!l) return this.rules.questionTimeMs;
    return Math.max(500, l.remainingMs - (performance.now() - l.receivedAt));
  }

  get hasMore(): boolean {
    return !this.done;
  }

  async prepareNext(): Promise<void> {
    if (this.done) return;
    const res = await call<PlayResponse>("daily_play", { p_name: this.name });
    if (res.status === "finished") {
      this.done = true;
      this.summary = toMatchSummary(res.summary);
      return;
    }
    this.accept(res);
  }

  async submit(questionId: string, choice: ChoiceIndex | null, elapsedMs: number): Promise<AnswerVerdict> {
    const local = this.questions.findIndex((q) => q.id === questionId);
    if (local < 0) throw new Error("Unknown question");
    const v = await call<AnswerVerdict & { finished: boolean; summary: ServerSummary | null }>("daily_answer", {
      p_attempt: this.attemptId,
      p_index: this.indexOffset + local,
      p_choice: choice,
    });
    if (v.finished) {
      this.done = true;
      if (v.summary) this.summary = toMatchSummary(v.summary);
    }
    return {
      questionId,
      choiceIndex: v.choiceIndex,
      correct: v.correct,
      correctIndex: v.correctIndex,
      explanation: v.explanation,
      elapsedMs: v.elapsedMs ?? elapsedMs,
      points: v.points,
      basePoints: v.basePoints,
      speedBonus: v.speedBonus,
      streakBonus: v.streakBonus,
      streakAfter: v.streakAfter,
    };
  }

  async finish(): Promise<MatchSummary> {
    if (this.summary) return this.summary;
    const s = await fetchMyDailyResult();
    if (!s) throw new Error("Result not available yet");
    this.summary = s;
    return s;
  }
}
