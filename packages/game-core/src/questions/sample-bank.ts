import type { Question, ChoiceIndex } from "@triviatowers/shared-types";
import type { Row } from "./bank/row";
import { geography } from "./bank/geography";
import { history } from "./bank/history";
import { science } from "./bank/science";
import { technology } from "./bank/technology";
import { sports } from "./bank/sports";
import { entertainment } from "./bank/entertainment";
import { popCulture } from "./bank/pop-culture";
import { nature } from "./bank/nature";
import { food } from "./bank/food";
import { general } from "./bank/general";

/**
 * Local sample bank (offline play). Answers are well-established facts, but every entry is
 * `pending_review`: run them through the editorial review flow (docs/QUESTIONS.md) before they
 * are scheduled into a ranked Daily Tower.
 *
 * Questions live in ./bank/<category>.ts. The correct answer is written first (index 0); choice
 * order is shuffled deterministically at selection time, so the stored order never leaks.
 */
const CREATED = "2026-11-06T00:00:00.000Z";

const rows: Row[] = [...geography, ...history, ...science, ...technology, ...sports, ...entertainment, ...popCulture, ...nature, ...food, ...general];

export const SAMPLE_QUESTIONS: readonly Question[] = rows.map(
  ([id, category, difficulty, prompt, choices, explanation, source]) => ({
    id,
    prompt,
    choices,
    correctIndex: 0 as ChoiceIndex,
    category,
    difficulty,
    explanation,
    source,
    createdAt: CREATED,
    reviewStatus: "pending_review",
  }),
);
