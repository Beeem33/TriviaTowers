/** Trivia categories used for balancing daily sets and for player stats. */
export const QUESTION_CATEGORIES = [
  "geography",
  "history",
  "science",
  "technology",
  "sports",
  "entertainment",
  "nature",
  "general",
  "food",
  "pop-culture",
] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export type Difficulty = "easy" | "medium" | "hard";

/** Editorial workflow. Only `approved` questions may be scheduled into ranked dailies. */
export type ReviewStatus = "draft" | "pending_review" | "approved" | "rejected" | "retired";

/** Exactly four answer options. */
export type Choices = readonly [string, string, string, string];
export type ChoiceIndex = 0 | 1 | 2 | 3;

/**
 * Full question record, as stored in the database.
 * NEVER send this shape to a browser during a ranked attempt — use PublicQuestion.
 */
export interface Question {
  id: string;
  prompt: string;
  choices: Choices;
  correctIndex: ChoiceIndex;
  category: QuestionCategory;
  difficulty: Difficulty;
  explanation: string;
  /** URL or citation used to verify the answer. */
  source: string;
  createdAt: string;
  reviewStatus: ReviewStatus;
}

/** What a client is allowed to see before answering. No answer key. */
export interface PublicQuestion {
  id: string;
  prompt: string;
  choices: Choices;
  category: QuestionCategory;
  difficulty: Difficulty;
}

/** Server (or local engine) verdict for one submitted answer. */
export interface AnswerVerdict {
  questionId: string;
  /** null when the timer expired without an answer. */
  choiceIndex: ChoiceIndex | null;
  correct: boolean;
  correctIndex: ChoiceIndex;
  explanation: string;
  elapsedMs: number;
  points: number;
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  streakAfter: number;
}
