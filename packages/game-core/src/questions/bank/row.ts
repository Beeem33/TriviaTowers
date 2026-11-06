import type { Choices, Difficulty, QuestionCategory } from "@triviatowers/shared-types";

/**
 * Authoring format for the local question bank.
 * Convention: the correct answer is written FIRST; choices are shuffled at selection time.
 */
export type Row = [
  id: string,
  category: QuestionCategory,
  difficulty: Difficulty,
  prompt: string,
  choices: Choices,
  explanation: string,
  source: string,
];

export const W = "https://en.wikipedia.org/wiki/";
