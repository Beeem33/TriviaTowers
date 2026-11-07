/**
 * Verifies the database scoring function (tt_score) matches game-core scoreAnswer exactly.
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_... NODE_USE_ENV_PROXY=1 npx tsx supabase/scripts/check-scoring.mts
 */
import { scoreAnswer } from "../../packages/game-core/src/index";
import { sql } from "./lib.mjs";

const cases: [boolean, number, number][] = [];
for (const correct of [true, false])
  for (let ms = -100; ms <= 16_000; ms += 37) for (const streak of [0, 1, 3, 6]) cases.push([correct, ms, streak]);

const values = cases.map(([c, ms, s]) => `(${c}, ${ms}, ${s})`).join(",");
const rows: { c: boolean; ms: number; s: number; points: number; speed_bonus: number; streak_after: number }[] = await sql(
  `select v.c, v.ms, v.s, t.points, t.speed_bonus, t.streak_after
   from (values ${values}) as v(c, ms, s), lateral public.tt_score(v.c, v.ms, v.s) t`,
);
let bad = 0;
for (const r of rows) {
  const e = scoreAnswer({ correct: r.c, elapsedMs: r.ms, streakBefore: r.s });
  if (e.points !== r.points || e.speedBonus !== r.speed_bonus || e.streakAfter !== r.streak_after) {
    if (bad++ < 10) console.log("MISMATCH", r, e);
  }
}
console.log(`${rows.length} cases checked, ${bad} mismatches`);
if (bad > 0) process.exit(1);
