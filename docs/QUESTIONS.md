# Question editorial workflow

Each question: id, prompt, four choices, correct index, category, difficulty, explanation,
verification source, created timestamp, review status.

`draft → pending_review → approved` (or `rejected`, later `retired`). Only `approved` questions can
be scheduled into a ranked Daily Tower.

Guidelines
- One unambiguous correct answer that will stay true (avoid "current" records, counts that change,
  recent events). Phrase time-sensitive facts with a date.
- Plausible distractors from the same domain; no joke answers; similar length.
- Interesting > obscure. Mix: ~40% easy, 40% medium, 20% hard per daily.
- Explanation adds a "did you know" fact without needing the source to be opened.
- Source: a reputable reference URL that states the fact. Reviewer opens it before approving.
- Never generate or modify trivia live during matches. AI-drafted questions must be human-verified.

The Phase 1 sample bank (`packages/game-core/src/questions/bank/<category>.ts`, combined in
`sample-bank.ts`) uses a "correct answer
first" authoring convention; choices are shuffled deterministically at selection time.
