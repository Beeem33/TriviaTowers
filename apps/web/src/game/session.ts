/**
 * GameSession is the seam between the UI and whoever is authoritative for a match.
 *
 *  - LocalGameSession (Phase 1): runs entirely in the browser using the sample bank.
 *    It is UNRANKED by design — the answer key is in the bundle.
 *  - SupabaseDailySession (Phase 2): same interface, but `submit` calls an Edge Function
 *    that validates the answer, measures time on the server and returns the verdict.
 *    The browser never receives the answer key before answering.
 */
import type { AnswerVerdict, ChoiceIndex, GameMode, MatchSummary, PublicQuestion, Question } from "@triviatowers/shared-types";
import {
  DEFAULT_RULES,
  SAMPLE_QUESTIONS,
  dailyNumber,
  scoreAnswer,
  selectQuestionSet,
  shuffleChoices,
  summarizeMatch,
  toPublicQuestion,
  towerSeed,
  utcDateKey,
  type AnswerRecord,
  type GameRules,
} from "@triviatowers/game-core";

export interface GameSession {
  readonly mode: GameMode;
  readonly ranked: boolean;
  readonly dateKey?: string;
  readonly dailyNumber?: number;
  readonly towerSeed: number;
  readonly rules: GameRules;
  readonly questions: readonly PublicQuestion[];
  /** `choice` null = timed out. `elapsedMs` is advisory for local play; servers measure their own. */
  submit(questionId: string, choice: ChoiceIndex | null, elapsedMs: number): Promise<AnswerVerdict>;
  finish(): Promise<MatchSummary>;
}

export class LocalGameSession implements GameSession {
  readonly ranked = false;
  readonly rules = DEFAULT_RULES;
  readonly questions: readonly PublicQuestion[];
  readonly towerSeed: number;
  readonly dateKey?: string;
  readonly dailyNumber?: number;
  private readonly full: Map<string, Question>;
  private readonly answers = new Map<string, AnswerRecord>();
  private streak = 0;

  constructor(
    readonly mode: "daily" | "quick",
    opts: { playerId: string; now?: Date; bank?: readonly Question[] },
  ) {
    const bank = opts.bank ?? SAMPLE_QUESTIONS;
    const now = opts.now ?? new Date();
    let seed: string;
    if (mode === "daily") {
      this.dateKey = utcDateKey(now);
      this.dailyNumber = dailyNumber(this.dateKey);
      seed = `daily|${this.dateKey}`;
    } else {
      seed = `quick|${opts.playerId}|${now.getTime()}`;
    }
    const picked = selectQuestionSet(bank, seed, {
      count: mode === "daily" ? this.rules.dailyQuestionCount : this.rules.quickQuestionCount,
      difficultyRamp: mode === "daily",
    }).map((q) => shuffleChoices(q, seed));
    this.full = new Map(picked.map((q) => [q.id, q]));
    this.questions = picked.map(toPublicQuestion);
    this.towerSeed = towerSeed(opts.playerId, seed);
  }

  async submit(questionId: string, choice: ChoiceIndex | null, elapsedMs: number): Promise<AnswerVerdict> {
    const q = this.full.get(questionId);
    if (!q) throw new Error("Unknown question");
    if (this.answers.has(questionId)) throw new Error("Question already answered");
    const correct = choice !== null && choice === q.correctIndex;
    const s = scoreAnswer({ correct, elapsedMs, streakBefore: this.streak }, this.rules);
    this.streak = s.streakAfter;
    this.answers.set(questionId, { correct: s.floorsAdded === 1, elapsedMs, points: s.points });
    return {
      questionId,
      choiceIndex: choice,
      correct: s.floorsAdded === 1,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      elapsedMs,
      points: s.points,
      basePoints: s.basePoints,
      speedBonus: s.speedBonus,
      streakBonus: s.streakBonus,
      streakAfter: s.streakAfter,
    };
  }

  async finish(): Promise<MatchSummary> {
    const ordered = this.questions.map(
      (q) => this.answers.get(q.id) ?? { correct: false, elapsedMs: this.rules.questionTimeMs, points: 0 },
    );
    return summarizeMatch(ordered, {
      mode: this.mode,
      ranked: false,
      dateKey: this.dateKey,
      dailyNumber: this.dailyNumber,
      rules: this.rules,
    });
  }
}
