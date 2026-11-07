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
  ENDLESS_LIVES,
  SAMPLE_QUESTIONS,
  createRng,
  dailyNumber,
  endlessRules,
  hashString,
  pickEndlessQuestion,
  scoreAnswer,
  selectDailySet,
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
  /** Questions available so far. Fixed-length modes know them all up front; Endless appends. */
  readonly questions: readonly PublicQuestion[];
  /** Time allowed for question `index` (defaults to rules.questionTimeMs). */
  timeLimitMs?(index: number): number;
  /** Lives remaining, for modes that have them (Endless). */
  readonly livesLeft?: number;
  readonly maxLives?: number;
  /** Total questions when known up front but delivered one at a time (online daily). */
  readonly expectedTotal?: number;
  /** Position of `questions[0]` in the full set (non-zero when resuming online). */
  readonly indexOffset?: number;
  /** Score/tower state carried over when resuming. */
  readonly initial?: { score: number; floors: number; streak: number; bestStreak: number };
  /** False once the server says no further questions will come. */
  readonly hasMore?: boolean;
  /** Fetches the next question; called only when the player moves on, so the server clock starts then. */
  prepareNext?(): Promise<void>;
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
    const picked = (
      mode === "daily"
        ? selectDailySet(bank, this.dateKey as string, this.rules.dailyQuestionCount)
        : selectQuestionSet(bank, seed, { count: this.rules.quickQuestionCount, difficultyRamp: false })
    ).map((q) => shuffleChoices(q, seed));
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

/**
 * Endless Tower: questions are drawn one at a time (harder and faster as the tower grows)
 * until the player runs out of lives or the bank is exhausted.
 */
export class EndlessGameSession implements GameSession {
  readonly mode = "endless" as const;
  readonly ranked = false;
  readonly rules = DEFAULT_RULES;
  readonly towerSeed: number;
  readonly maxLives = ENDLESS_LIVES;
  livesLeft = ENDLESS_LIVES;
  questions: readonly PublicQuestion[] = [];
  private readonly bank: readonly Question[];
  private readonly rng: () => number;
  private readonly seed: string;
  private readonly full = new Map<string, Question>();
  private readonly limits: number[] = [];
  private readonly answers: AnswerRecord[] = [];
  private streak = 0;
  private floors = 0;

  constructor(opts: { playerId: string; now?: Date; bank?: readonly Question[] }) {
    this.bank = opts.bank ?? SAMPLE_QUESTIONS;
    this.seed = `endless|${opts.playerId}|${(opts.now ?? new Date()).getTime()}`;
    this.rng = createRng(hashString(this.seed));
    this.towerSeed = towerSeed(opts.playerId, this.seed);
    this.drawNext();
  }

  private drawNext(): void {
    const prev = this.questions[this.questions.length - 1];
    const q = pickEndlessQuestion(this.bank, new Set(this.full.keys()), this.floors, prev?.category ?? null, this.rng);
    if (!q) return;
    const shuffled = shuffleChoices(q, this.seed);
    this.full.set(q.id, shuffled);
    this.limits.push(endlessRules(this.floors, this.rules).questionTimeMs);
    this.questions = [...this.questions, toPublicQuestion(shuffled)];
  }

  timeLimitMs(index: number): number {
    return this.limits[index] ?? this.rules.questionTimeMs;
  }

  async submit(questionId: string, choice: ChoiceIndex | null, elapsedMs: number): Promise<AnswerVerdict> {
    const index = this.questions.findIndex((q) => q.id === questionId);
    const q = this.full.get(questionId);
    if (!q || index < 0) throw new Error("Unknown question");
    if (index !== this.answers.length) throw new Error("Question already answered");
    if (this.livesLeft <= 0) throw new Error("Run is over");
    const correct = choice !== null && choice === q.correctIndex;
    const rules = { ...this.rules, questionTimeMs: this.timeLimitMs(index) };
    const s = scoreAnswer({ correct, elapsedMs, streakBefore: this.streak }, rules);
    this.streak = s.streakAfter;
    const ok = s.floorsAdded === 1;
    this.answers.push({ correct: ok, elapsedMs: Math.min(elapsedMs, rules.questionTimeMs), points: s.points });
    if (ok) this.floors++;
    else this.livesLeft--;
    if (this.livesLeft > 0) this.drawNext();
    return {
      questionId,
      choiceIndex: choice,
      correct: ok,
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
    return summarizeMatch(this.answers, { mode: "endless", ranked: false, rules: { ...this.rules, questionTimeMs: Number.MAX_SAFE_INTEGER } });
  }
}
