# Supabase

Project ref: `bicckuevfsfvmmfpgdrg` (us-east-1). The web app talks to it with the public
publishable key; everything sensitive is enforced in the database (RLS + SECURITY DEFINER functions).

## Contents
- `migrations/` — versioned SQL. `20261107000001_daily_challenges.sql` = online Daily Tower;
  `20261111000001_challenges_and_review.sql` = verified challenges and answer review.
- `seed/questions.sql` — generated from `packages/game-core` (never edit by hand).
- `scripts/` — tooling that uses the Supabase Management API (no Supabase CLI needed).

## Commands
All need a personal access token: `export SUPABASE_ACCESS_TOKEN=sbp_...` (create one at
https://supabase.com/dashboard/account/tokens). Behind an HTTP proxy, also `export NODE_USE_ENV_PROXY=1`.

```bash
node supabase/scripts/migrate.mjs --status              # list applied / pending migrations
node supabase/scripts/migrate.mjs                       # apply pending migrations
npx tsx supabase/scripts/export-questions.mts           # regenerate seed/questions.sql from the bank
node supabase/scripts/run-sql.mjs supabase/seed/questions.sql   # upsert questions
npx tsx supabase/scripts/check-scoring.mts              # DB scoring == game-core scoring
node supabase/scripts/smoke-daily.mjs                   # live end-to-end + security checks (cleans up)
```

Migrations are recorded in `supabase_migrations.schema_migrations`, the table the official
Supabase CLI uses, so you can switch to `supabase db push` later.

## Public API (RPC)
| Function | Who | What |
| --- | --- | --- |
| `daily_play(p_name)` | signed-in (guests included) | Start/resume today's attempt; serves the current question (no answer key) |
| `daily_answer(p_attempt, p_index, p_choice)` | signed-in | Lock an answer; server times it, scores it, returns the verdict |
| `daily_my_result(p_date)` | signed-in | Your finished result for a day |
| `daily_leaderboard(p_date, p_limit, p_offset)` | anyone | Ranked finished attempts (no user ids) |
| `daily_challenge_info(p_attempt)` | anyone | Spoiler-free summary of a finished attempt (challenge links) |
| `daily_review(p_date)` | anyone* | Questions, answers, explanations, % correct, and your picks. *Today only after you finish; past days are public |

## Settings (`public.app_settings`)
- `daily_allow_unreviewed` (`true`): allow `pending_review` questions in dailies until the review
  backlog is cleared. Set to `false` once enough questions are `approved`.
- `daily_epoch` (`2026-11-01`): date of Daily Tower #1.
