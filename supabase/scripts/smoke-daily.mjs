/**
 * End-to-end + security smoke test against the live project, acting as guest players.
 * Creates temporary anonymous users named "SmokeTest…" and deletes them at the end.
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_... NODE_USE_ENV_PROXY=1 node supabase/scripts/smoke-daily.mjs
 */
import { REF, sql } from "./lib.mjs";

const URL = `https://${REF}.supabase.co`;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_zs3tIKKqVoH_6zjynrz9eg_iVbcbRMc";
let failures = 0;
const check = (ok, label, extra = "") => {
  console.log(`${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures++;
};

async function guest() {
  const res = await fetch(`${URL}/auth/v1/signup`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: "{}" });
  const j = await res.json();
  if (!j.access_token) throw new Error(`anonymous sign-in failed: ${JSON.stringify(j).slice(0, 300)}`);
  return { token: j.access_token, id: j.user.id };
}
async function rest(token, method, path, body) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${token ?? KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
const rpc = (token, fn, args = {}) => rest(token, "POST", `rpc/${fn}`, args);

const users = [];
try {
  const a = await guest(); users.push(a.id);
  const b = await guest(); users.push(b.id);

  // Start
  const start = await rpc(a.token, "daily_play", { p_name: "SmokeTest A" });
  check(start.status === 200 && start.data.status === "playing", "guest can start today's Daily Tower", `#${start.data?.dailyNumber}`);
  const q0 = start.data.question;
  check(q0 && q0.choices.length === 4 && !("correctIndex" in q0) && !("explanation" in q0), "question arrives without the answer key");
  const again = await rpc(a.token, "daily_play", { p_name: "SmokeTest A" });
  check(again.data.index === 0 && again.data.question.id === q0.id, "calling start again resumes the same question");

  // Attacks
  const qs = await rest(a.token, "GET", "questions?select=id,correct_index&limit=5");
  check(Array.isArray(qs.data) ? qs.data.length === 0 : qs.status >= 400, "answer key table is not readable", `HTTP ${qs.status}`);
  const dcq = await rest(a.token, "GET", "daily_challenge_questions?select=*&limit=5");
  check(Array.isArray(dcq.data) ? dcq.data.length === 0 : dcq.status >= 400, "today's question list is not readable");
  const forge = await rest(a.token, "POST", "daily_attempts", { challenge_id: 1, user_id: a.id, display_name: "Hacker", is_guest: false, score: 99999, status: "finished" });
  check(forge.status >= 400, "cannot insert a fake attempt", `HTTP ${forge.status}`);
  const bump = await rest(a.token, "PATCH", `daily_attempts?id=eq.${start.data.attemptId}`, { score: 99999 });
  check(bump.status >= 400 || (Array.isArray(bump.data) && bump.data.length === 0), "cannot edit own score", `HTTP ${bump.status}`);
  const internal = await rpc(a.token, "tt_score", { p_correct: true, p_elapsed_ms: 0, p_streak_before: 5 });
  check(internal.status >= 400, "internal scoring function is not callable", `HTTP ${internal.status}`);
  const ensure = await rpc(a.token, "tt_ensure_daily", { p_date: "2030-01-01" });
  check(ensure.status >= 400, "cannot create daily challenges", `HTTP ${ensure.status}`);
  const anonStart = await rpc(null, "daily_play", {});
  check(anonStart.status >= 400, "signed-out requests cannot play", `HTTP ${anonStart.status}`);
  const wrongIdx = await rpc(a.token, "daily_answer", { p_attempt: start.data.attemptId, p_index: 3, p_choice: 0 });
  check(wrongIdx.status >= 400, "cannot answer a question that wasn't served");
  const bStart = await rpc(b.token, "daily_play", { p_name: "SmokeTest B" });
  const steal = await rpc(b.token, "daily_answer", { p_attempt: start.data.attemptId, p_index: 0, p_choice: 0 });
  check(steal.status >= 400, "cannot answer another player's attempt");
  check(bStart.data.question.id === q0.id, "both players get the same question");
  const sameOrder = JSON.stringify(bStart.data.question.choices) === JSON.stringify(q0.choices);
  console.log(`  (answer order for the two players ${sameOrder ? "happens to match" : "differs"})`);

  const early = await rpc(a.token, "daily_review", {});
  check(early.status >= 400, "answers for today stay hidden until you finish", JSON.stringify(early.data?.message ?? ""));
  const unfinishedInfo = await rpc(null, "daily_challenge_info", { p_attempt: start.data.attemptId });
  check(unfinishedInfo.status === 200 && unfinishedInfo.data === null, "unfinished attempts can't be used as challenges");

  // Play all 10 as A (always the first shown choice).
  let verdict;
  let state = start.data;
  for (let i = 0; i < 10; i++) {
    verdict = await rpc(a.token, "daily_answer", { p_attempt: state.attemptId, p_index: i, p_choice: 0 });
    if (verdict.status !== 200) { check(false, `answer ${i + 1}`, JSON.stringify(verdict.data).slice(0, 200)); break; }
    if (i === 0) {
      const dup = await rpc(a.token, "daily_answer", { p_attempt: state.attemptId, p_index: 0, p_choice: 1 });
      check(dup.status >= 400, "cannot answer the same question twice");
      check(typeof verdict.data.correctIndex === "number" && verdict.data.explanation, "answer reveals the correct choice and explanation");
    }
    if (!verdict.data.finished) state = (await rpc(a.token, "daily_play", {})).data;
  }
  const sum = verdict.data.summary;
  check(verdict.data.finished && sum && sum.outcomes.length === 10, "attempt finishes after 10 answers", `score ${sum?.score}, ${sum?.correct}/10, rank #${sum?.rank} of ${sum?.players}`);
  const replay = await rpc(a.token, "daily_play", { p_name: "SmokeTest A" });
  check(replay.data.status === "finished" && replay.data.summary.score === sum.score, "a second attempt is refused (result is final)");
  const late = await rpc(a.token, "daily_answer", { p_attempt: state.attemptId, p_index: 9, p_choice: 1 });
  check(late.status >= 400, "cannot answer after finishing");

  check(typeof sum.attemptId === "string", "summary includes the attempt id for challenge links");
  const info = await rpc(null, "daily_challenge_info", { p_attempt: sum.attemptId });
  check(info.status === 200 && info.data?.score === sum.score && info.data?.displayName === "SmokeTest A", "challenge link info is public and matches the result");
  check(info.data && !JSON.stringify(info.data).includes("explanation") && !("questions" in info.data), "challenge info contains no answers");
  const review = await rpc(a.token, "daily_review", {});
  const rq = review.data?.questions ?? [];
  check(review.status === 200 && rq.length === 10 && rq.every((q) => q.answered && typeof q.correctIndex === "number"), "finished player can review all 10 answers");
  check(rq.filter((q) => q.yourCorrect).length === sum.correct, "review marks the same answers correct as the score");
  const bEarly = await rpc(b.token, "daily_review", {});
  check(bEarly.status >= 400, "a player who hasn't finished still can't see today's answers");
  const anonToday = await rpc(null, "daily_review", {});
  check(anonToday.status >= 400, "signed-out visitors can't see today's answers");
  const future = await rpc(null, "daily_review", { p_date: "2099-01-01" });
  check(future.status >= 400, "future days are not available");

  const board = await rpc(null, "daily_leaderboard", {});
  check(board.status === 200 && board.data.some((r) => r.display_name === "SmokeTest A" && r.score === sum.score), "leaderboard shows the finished result (readable without signing in)");
  check(board.data.every((r) => !("user_id" in r)), "leaderboard exposes no user ids");
  const mine = await rpc(a.token, "daily_my_result", {});
  check(mine.data?.score === sum.score, "player can fetch their own result");
} finally {
  if (users.length) {
    await sql(`delete from auth.users where id in (${users.map((u) => `'${u}'`).join(",")})`);
    console.log(`cleaned up ${users.length} test users`);
  }
}
console.log(failures ? `${failures} check(s) FAILED` : "all checks passed");
process.exit(failures ? 1 : 0);
