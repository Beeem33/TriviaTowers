-- TriviaTowers — Phase 2: online Daily Tower.
--
-- Security model
--   * Clients (anon / authenticated roles) cannot read questions, answer keys or other
--     players' attempts, and cannot insert/update anything directly: RLS is enabled on every
--     table and only narrow read policies exist.
--   * All game actions go through SECURITY DEFINER functions (RPC) that check auth.uid(),
--     measure time on the server, score answers and write results atomically.
--   * Guests use Supabase anonymous sign-in, so every player has a real auth.uid().
--
-- Scoring constants mirror packages/game-core/src/rules.ts (RULES_VERSION 1):
--   15 s per question, 1 s speed grace, 100 base, ≤50 speed, +10/streak ≤50.
--   NETWORK_GRACE: answers arriving up to 2 s after the deadline still count (latency),
--   scored as if answered at the deadline (no speed bonus).

-- ───────────────────────────────────────────────────────────── settings ──
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
insert into public.app_settings (key, value) values
  -- Until the editorial review backlog is cleared, unreviewed (pending_review) questions may be
  -- scheduled. Set to 'false' to require review_status = 'approved'.
  ('daily_allow_unreviewed', 'true'),
  ('daily_epoch', '2026-11-01');

-- ──────────────────────────────────────────────────────────── questions ──
create table public.questions (
  id text primary key,
  prompt text not null check (length(prompt) between 5 and 300),
  choices text[] not null check (array_length(choices, 1) = 4),
  correct_index smallint not null check (correct_index between 0 and 3),
  category text not null check (category in ('geography','history','science','technology','sports','entertainment','nature','general','food','pop-culture')),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  explanation text not null,
  source text not null,
  review_status text not null default 'pending_review'
    check (review_status in ('draft','pending_review','approved','rejected','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.questions enable row level security; -- no policies: never readable by clients

-- ───────────────────────────────────────────────────── daily challenges ──
create table public.daily_challenges (
  id bigint generated always as identity primary key,
  date_key date not null unique,
  number integer not null,
  status text not null default 'published' check (status in ('draft','scheduled','published')),
  created_at timestamptz not null default now()
);
alter table public.daily_challenges enable row level security;
create policy "daily challenges are public" on public.daily_challenges for select using (true);

create table public.daily_challenge_questions (
  challenge_id bigint not null references public.daily_challenges (id) on delete cascade,
  position smallint not null check (position between 0 and 9),
  question_id text not null references public.questions (id),
  primary key (challenge_id, position),
  unique (challenge_id, question_id)
);
alter table public.daily_challenge_questions enable row level security; -- no policies

-- A published day's questions can't be changed (fairness: everyone gets the same set).
create function public.tt_lock_published_day() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.daily_challenges c
    where c.id = coalesce(old.challenge_id, new.challenge_id)
      and c.status = 'published'
      and c.date_key <= (now() at time zone 'utc')::date
      and exists (select 1 from public.daily_attempts a where a.challenge_id = c.id)
  ) then
    raise exception 'daily challenge % is published and has attempts; its questions are locked', coalesce(old.challenge_id, new.challenge_id);
  end if;
  return coalesce(new, old);
end $$;

-- ─────────────────────────────────────────────────────────────── attempts ──
create table public.daily_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id bigint not null references public.daily_challenges (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  is_guest boolean not null,
  status text not null default 'in_progress' check (status in ('in_progress','finished')),
  current_index smallint not null default 0 check (current_index between 0 and 10),
  served_at timestamptz, -- when the current question was sent; null between questions
  score integer not null default 0,
  correct integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  total_answer_ms integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (challenge_id, user_id) -- one attempt per player per day
);
alter table public.daily_attempts enable row level security;
create policy "players read their own attempts" on public.daily_attempts for select using (user_id = auth.uid());
create index daily_attempts_board on public.daily_attempts (challenge_id, score desc, correct desc, total_answer_ms asc)
  where status = 'finished';

create table public.attempt_answers (
  attempt_id uuid not null references public.daily_attempts (id) on delete cascade,
  question_index smallint not null check (question_index between 0 and 9),
  question_id text not null references public.questions (id),
  choice smallint, -- original (unshuffled) choice index; null = timeout
  correct boolean not null,
  elapsed_ms integer not null,
  points integer not null,
  served_at timestamptz not null,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_index) -- one answer per question
);
alter table public.attempt_answers enable row level security;
create policy "players read their own answers" on public.attempt_answers for select
  using (exists (select 1 from public.daily_attempts a where a.id = attempt_id and a.user_id = auth.uid()));

create trigger tt_lock_published_day before insert or update or delete on public.daily_challenge_questions
  for each row execute function public.tt_lock_published_day();

-- ───────────────────────────────────────────────────────────── helpers ──

-- Shared scoring rules (must match game-core scoreAnswer; see supabase/scripts/check-scoring.mjs).
create function public.tt_score(p_correct boolean, p_elapsed_ms integer, p_streak_before integer)
returns table (points integer, base_points integer, speed_bonus integer, streak_bonus integer, streak_after integer)
language sql immutable set search_path = '' as $$
  select
    case when ok then 100 + sp + st else 0 end,
    case when ok then 100 else 0 end,
    case when ok then sp else 0 end,
    case when ok then st else 0 end,
    case when ok then sb + 1 else 0 end
  from (
    select
      coalesce(p_correct, false) and el <= 15000 as ok,
      ((2 * 50 * greatest(0, 14000 - greatest(0, el - 1000)) + 14000) / (2 * 14000))::integer as sp,
      least(50, sb * 10) as st,
      sb
    from (select greatest(0, coalesce(p_elapsed_ms, 0)) as el, greatest(0, coalesce(p_streak_before, 0)) as sb) x
  ) y;
$$;

-- Per-player answer order: shown position p displays original choice perm[p + 1].
create function public.tt_perm(p_seed text) returns smallint[]
language sql immutable set search_path = '' as $$
  select array_agg(i::smallint order by md5(p_seed || ':' || i)) from generate_series(0, 3) as i;
$$;

-- Display names: letters, digits, spaces, _ and -; 2–20 chars; no staff impersonation.
create function public.tt_clean_name(p_name text) returns text
language sql immutable set search_path = '' as $$
  select case
    when n is null or length(n) < 2 then 'Builder'
    when lower(n) ~ '(admin|moderator|official|staff|support|triviatowers)' then 'Builder'
    else n
  end
  from (select left(btrim(regexp_replace(regexp_replace(coalesce(p_name, ''), '[^[:alnum:] _-]', '', 'g'), '\s+', ' ', 'g')), 20) as n) x;
$$;

create function public.tt_ms(p_ts timestamptz) returns bigint
language sql immutable set search_path = '' as $$ select floor(extract(epoch from p_ts) * 1000)::bigint $$;

-- Creates today's question set on first request (auto-draft): 4 easy, 4 medium, 2 hard,
-- at most 2 per category, nothing used in the previous 7 days, deterministic per date.
create function public.tt_ensure_daily(p_date date) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_id bigint;
  v_allow boolean;
  v_epoch date;
  v_count integer;
begin
  select id into v_id from public.daily_challenges where date_key = p_date;
  if found then return v_id; end if;

  perform pg_advisory_xact_lock(hashtext('tt_daily:' || p_date::text));
  select id into v_id from public.daily_challenges where date_key = p_date;
  if found then return v_id; end if;

  select coalesce((select value::boolean from public.app_settings where key = 'daily_allow_unreviewed'), false) into v_allow;
  select coalesce((select value::date from public.app_settings where key = 'daily_epoch'), date '2026-11-01') into v_epoch;

  insert into public.daily_challenges (date_key, number, status)
  values (p_date, (p_date - v_epoch) + 1, 'published')
  returning id into v_id;

  with recent as (
    select dcq.question_id
    from public.daily_challenge_questions dcq
    join public.daily_challenges dc on dc.id = dcq.challenge_id
    where dc.date_key between p_date - 7 and p_date - 1
  ),
  pool as (
    select q.id, q.category, q.difficulty, md5(p_date::text || ':' || q.id) as h
    from public.questions q
    where (q.review_status = 'approved' or (v_allow and q.review_status = 'pending_review'))
      and q.id not in (select question_id from recent)
  ),
  per_category as (
    select *, row_number() over (partition by category order by h) as cat_rank from pool
  ),
  per_difficulty as (
    select *, row_number() over (partition by difficulty order by h) as diff_rank from per_category where cat_rank <= 2
  ),
  chosen as (
    select id, difficulty, h from per_difficulty
    where (difficulty = 'easy' and diff_rank <= 4) or (difficulty = 'medium' and diff_rank <= 4) or (difficulty = 'hard' and diff_rank <= 2)
  )
  insert into public.daily_challenge_questions (challenge_id, position, question_id)
  select v_id, (row_number() over (order by case difficulty when 'easy' then 0 when 'medium' then 1 else 2 end, h) - 1)::smallint, id
  from chosen;

  -- Top up if the balanced pick came up short (small bank).
  select count(*) into v_count from public.daily_challenge_questions where challenge_id = v_id;
  if v_count < 10 then
    insert into public.daily_challenge_questions (challenge_id, position, question_id)
    select v_id, (v_count + row_number() over (order by h) - 1)::smallint, id
    from (
      select q.id, md5(p_date::text || ':' || q.id) as h
      from public.questions q
      where (q.review_status = 'approved' or (v_allow and q.review_status = 'pending_review'))
        and q.id not in (select question_id from public.daily_challenge_questions where challenge_id = v_id)
      order by h
      limit 10 - v_count
    ) extra;
  end if;

  select count(*) into v_count from public.daily_challenge_questions where challenge_id = v_id;
  if v_count < 10 then
    raise exception 'not enough eligible questions for %', p_date;
  end if;
  return v_id;
end $$;

-- Times out the current question if its deadline (+ network grace) has passed.
-- Quitting mid-question therefore costs that question; the next one is served fresh.
create function public.tt_expire(p_attempt uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a public.daily_attempts;
  v_qid text;
begin
  select * into a from public.daily_attempts where id = p_attempt for update;
  if not found or a.status <> 'in_progress' or a.served_at is null then return; end if;
  if clock_timestamp() <= a.served_at + interval '17 seconds' then return; end if;

  select question_id into v_qid from public.daily_challenge_questions
  where challenge_id = a.challenge_id and position = a.current_index;

  insert into public.attempt_answers (attempt_id, question_index, question_id, choice, correct, elapsed_ms, points, served_at)
  values (a.id, a.current_index, v_qid, null, false, 15000, 0, a.served_at);

  update public.daily_attempts set
    current_index = a.current_index + 1,
    served_at = null,
    streak = 0,
    total_answer_ms = a.total_answer_ms + 15000,
    status = case when a.current_index + 1 >= 10 then 'finished' else 'in_progress' end,
    finished_at = case when a.current_index + 1 >= 10 then now() else null end
  where id = a.id;
end $$;

-- Final result incl. rank (score ↓, correct ↓, total time ↑) among all finished players.
create function public.tt_attempt_summary(p_attempt uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'mode', 'daily',
    'dateKey', c.date_key,
    'dailyNumber', c.number,
    'ranked', true,
    'isGuest', a.is_guest,
    'displayName', a.display_name,
    'score', a.score,
    'correct', a.correct,
    'total', 10,
    'accuracy', round(a.correct * 100.0 / 10),
    'floors', a.correct,
    'bestStreak', a.best_streak,
    'totalAnswerMs', a.total_answer_ms,
    'outcomes', coalesce((select jsonb_agg(x.correct order by x.question_index) from public.attempt_answers x where x.attempt_id = a.id), '[]'::jsonb),
    'rank', 1 + (
      select count(*) from public.daily_attempts o
      where o.challenge_id = a.challenge_id and o.status = 'finished'
        and (o.score > a.score
          or (o.score = a.score and o.correct > a.correct)
          or (o.score = a.score and o.correct = a.correct and o.total_answer_ms < a.total_answer_ms))
    ),
    'players', (select count(*) from public.daily_attempts o where o.challenge_id = a.challenge_id and o.status = 'finished'),
    'finishedAt', coalesce(a.finished_at, now())
  )
  from public.daily_attempts a
  join public.daily_challenges c on c.id = a.challenge_id
  where a.id = p_attempt;
$$;

-- ──────────────────────────────────────────────────────────── public API ──

-- Starts or resumes today's Daily Tower for the signed-in player (guests included) and
-- serves the current question. Safe to call repeatedly (refresh, reconnect).
create function public.daily_play(p_name text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_cid bigint;
  v_number integer;
  a public.daily_attempts;
  q public.questions;
  v_perm smallint[];
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_cid := public.tt_ensure_daily(v_today);
  select number into v_number from public.daily_challenges where id = v_cid;

  insert into public.daily_attempts (challenge_id, user_id, display_name, is_guest)
  values (v_cid, v_uid, public.tt_clean_name(p_name), coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true))
  on conflict (challenge_id, user_id) do nothing;

  select * into a from public.daily_attempts where challenge_id = v_cid and user_id = v_uid;
  if p_name is not null and a.status = 'in_progress' and public.tt_clean_name(p_name) <> a.display_name then
    update public.daily_attempts set display_name = public.tt_clean_name(p_name) where id = a.id;
  end if;

  perform public.tt_expire(a.id);
  select * into a from public.daily_attempts where id = a.id for update;

  if a.status = 'finished' then
    return jsonb_build_object('status', 'finished', 'attemptId', a.id, 'summary', public.tt_attempt_summary(a.id));
  end if;

  if a.served_at is null then
    update public.daily_attempts set served_at = clock_timestamp() where id = a.id returning * into a;
  end if;

  select qq.* into q
  from public.daily_challenge_questions dcq
  join public.questions qq on qq.id = dcq.question_id
  where dcq.challenge_id = v_cid and dcq.position = a.current_index;

  v_perm := public.tt_perm(v_uid::text || ':' || q.id);

  return jsonb_build_object(
    'status', 'playing',
    'attemptId', a.id,
    'dateKey', v_today,
    'dailyNumber', v_number,
    'total', 10,
    'index', a.current_index,
    'servedAt', public.tt_ms(a.served_at),
    'serverNow', public.tt_ms(clock_timestamp()),
    'timeLimitMs', 15000,
    'question', jsonb_build_object(
      'id', q.id,
      'prompt', q.prompt,
      'choices', jsonb_build_array(q.choices[v_perm[1] + 1], q.choices[v_perm[2] + 1], q.choices[v_perm[3] + 1], q.choices[v_perm[4] + 1]),
      'category', q.category,
      'difficulty', q.difficulty
    ),
    'progress', jsonb_build_object(
      'score', a.score, 'correct', a.correct, 'streak', a.streak, 'bestStreak', a.best_streak,
      'outcomes', coalesce((select jsonb_agg(x.correct order by x.question_index) from public.attempt_answers x where x.attempt_id = a.id), '[]'::jsonb)
    )
  );
end $$;

-- Locks in an answer (p_choice = shown position 0–3, or null for a timeout) for the
-- current question. Elapsed time is measured on the server.
create function public.daily_answer(p_attempt uuid, p_index integer, p_choice integer default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.daily_attempts;
  q public.questions;
  v_perm smallint[];
  v_elapsed integer;
  v_late boolean;
  v_orig smallint;
  v_correct boolean;
  s record;
  v_finished boolean;
begin
  select * into a from public.daily_attempts where id = p_attempt for update;
  if not found or a.user_id is distinct from auth.uid() then
    raise exception 'attempt_not_found' using errcode = 'P0002';
  end if;
  if a.status <> 'in_progress' then
    raise exception 'attempt_finished' using errcode = 'P0001';
  end if;
  if a.served_at is null or a.current_index <> p_index then
    raise exception 'wrong_question' using errcode = 'P0001';
  end if;
  if p_choice is not null and (p_choice < 0 or p_choice > 3) then
    raise exception 'bad_choice' using errcode = '22023';
  end if;

  v_elapsed := greatest(0, floor(extract(epoch from (clock_timestamp() - a.served_at)) * 1000))::integer;
  v_late := v_elapsed > 17000;

  select qq.* into q
  from public.daily_challenge_questions dcq
  join public.questions qq on qq.id = dcq.question_id
  where dcq.challenge_id = a.challenge_id and dcq.position = a.current_index;

  v_perm := public.tt_perm(a.user_id::text || ':' || q.id);
  v_orig := case when p_choice is null or v_late then null else v_perm[p_choice + 1] end;
  v_correct := v_orig is not null and v_orig = q.correct_index;
  select * into s from public.tt_score(v_correct, least(v_elapsed, 15000), a.streak);

  insert into public.attempt_answers (attempt_id, question_index, question_id, choice, correct, elapsed_ms, points, served_at)
  values (a.id, a.current_index, q.id, v_orig, s.streak_after > 0, least(v_elapsed, 15000), s.points, a.served_at);

  v_finished := a.current_index + 1 >= 10;
  update public.daily_attempts set
    score = a.score + s.points,
    correct = a.correct + (case when s.streak_after > 0 then 1 else 0 end),
    streak = s.streak_after,
    best_streak = greatest(a.best_streak, s.streak_after),
    total_answer_ms = a.total_answer_ms + least(v_elapsed, 15000),
    current_index = a.current_index + 1,
    served_at = null,
    status = case when v_finished then 'finished' else 'in_progress' end,
    finished_at = case when v_finished then now() else null end
  where id = a.id;

  return jsonb_build_object(
    'questionId', q.id,
    'choiceIndex', case when v_late then null else p_choice end,
    'correct', s.streak_after > 0,
    'correctIndex', array_position(v_perm, q.correct_index) - 1,
    'explanation', q.explanation,
    'elapsedMs', least(v_elapsed, 15000),
    'points', s.points,
    'basePoints', s.base_points,
    'speedBonus', s.speed_bonus,
    'streakBonus', s.streak_bonus,
    'streakAfter', s.streak_after,
    'finished', v_finished,
    'summary', case when v_finished then public.tt_attempt_summary(a.id) else null end
  );
end $$;

-- The player's finished result for a day (or null), e.g. for the homepage.
create function public.daily_my_result(p_date date default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.tt_attempt_summary(a.id)
  from public.daily_attempts a
  join public.daily_challenges c on c.id = a.challenge_id
  where a.user_id = auth.uid()
    and c.date_key = coalesce(p_date, (now() at time zone 'utc')::date)
    and a.status = 'finished';
$$;

-- Daily leaderboard (finished attempts only). No user ids are exposed.
create function public.daily_leaderboard(p_date date default null, p_limit integer default 50, p_offset integer default 0)
returns table (rank bigint, display_name text, score integer, correct integer, total_answer_ms integer, is_guest boolean, is_me boolean, players bigint)
language sql stable security definer set search_path = '' as $$
  select * from (
    select
      rank() over (order by a.score desc, a.correct desc, a.total_answer_ms asc) as rank,
      a.display_name, a.score, a.correct, a.total_answer_ms, a.is_guest,
      a.user_id = auth.uid() as is_me,
      count(*) over () as players
    from public.daily_attempts a
    join public.daily_challenges c on c.id = a.challenge_id
    where c.date_key = coalesce(p_date, (now() at time zone 'utc')::date)
      and a.status = 'finished'
  ) board
  order by rank, display_name
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ─────────────────────────────────────────────────────────── privileges ──
-- Supabase grants EXECUTE on new functions to API roles by default; lock helpers down.
revoke execute on function public.tt_score(boolean, integer, integer) from public, anon, authenticated;
revoke execute on function public.tt_perm(text) from public, anon, authenticated;
revoke execute on function public.tt_clean_name(text) from public, anon, authenticated;
revoke execute on function public.tt_ms(timestamptz) from public, anon, authenticated;
revoke execute on function public.tt_ensure_daily(date) from public, anon, authenticated;
revoke execute on function public.tt_expire(uuid) from public, anon, authenticated;
revoke execute on function public.tt_attempt_summary(uuid) from public, anon, authenticated;
revoke execute on function public.tt_lock_published_day() from public, anon, authenticated;

revoke execute on function public.daily_play(text) from public, anon;
revoke execute on function public.daily_answer(uuid, integer, integer) from public, anon;
revoke execute on function public.daily_my_result(date) from public, anon;
grant execute on function public.daily_play(text) to authenticated;
grant execute on function public.daily_answer(uuid, integer, integer) to authenticated;
grant execute on function public.daily_my_result(date) to authenticated;
grant execute on function public.daily_leaderboard(date, integer, integer) to anon, authenticated;
