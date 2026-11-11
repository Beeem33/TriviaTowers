-- Verified challenge links and answer review.

-- Summaries now carry the attempt id, which a player can share as a challenge link.
-- (Knowing an attempt id gives no control over it: daily_answer checks the owner.)
create or replace function public.tt_attempt_summary(p_attempt uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'attemptId', a.id,
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
revoke execute on function public.tt_attempt_summary(uuid) from public, anon, authenticated;

-- Public, read-only view of a finished attempt for challenge links. Spoiler-free: no answers.
create function public.daily_challenge_info(p_attempt uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'displayName', a.display_name,
    'score', a.score,
    'correct', a.correct,
    'floors', a.correct,
    'total', 10,
    'dailyNumber', c.number,
    'dateKey', c.date_key,
    'outcomes', coalesce((select jsonb_agg(x.correct order by x.question_index) from public.attempt_answers x where x.attempt_id = a.id), '[]'::jsonb)
  )
  from public.daily_attempts a
  join public.daily_challenges c on c.id = a.challenge_id
  where a.id = p_attempt and a.status = 'finished';
$$;
revoke execute on function public.daily_challenge_info(uuid) from public;
grant execute on function public.daily_challenge_info(uuid) to anon, authenticated;

-- Answers for a day: open to everyone once the day is over (an archive), and to a player for
-- today only after they've finished their own attempt. Includes the caller's own choices.
create function public.daily_review(p_date date default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_date date := coalesce(p_date, (now() at time zone 'utc')::date);
  v_today date := (now() at time zone 'utc')::date;
  c public.daily_challenges;
  v_attempt uuid;
  v_finished boolean := false;
begin
  if v_date > v_today then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  select * into c from public.daily_challenges where date_key = v_date;
  if not found then
    return null;
  end if;
  select id, status = 'finished' into v_attempt, v_finished
  from public.daily_attempts where challenge_id = c.id and user_id = auth.uid();
  if v_date = v_today and not coalesce(v_finished, false) then
    raise exception 'finish_first' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'dateKey', c.date_key,
    'dailyNumber', c.number,
    'questions', (
      select jsonb_agg(jsonb_build_object(
        'position', dcq.position,
        'prompt', q.prompt,
        'choices', to_jsonb(q.choices),
        'correctIndex', q.correct_index,
        'explanation', q.explanation,
        'source', q.source,
        'category', q.category,
        'difficulty', q.difficulty,
        'yourChoice', ans.choice,
        'answered', ans.attempt_id is not null,
        'yourCorrect', ans.correct,
        'percentCorrect', (
          select round(100.0 * count(*) filter (where x.correct) / nullif(count(*), 0))
          from public.attempt_answers x
          join public.daily_attempts xa on xa.id = x.attempt_id
          where xa.challenge_id = c.id and x.question_index = dcq.position
        )
      ) order by dcq.position)
      from public.daily_challenge_questions dcq
      join public.questions q on q.id = dcq.question_id
      left join public.attempt_answers ans on ans.attempt_id = v_attempt and ans.question_index = dcq.position
      where dcq.challenge_id = c.id
    )
  );
end $$;
revoke execute on function public.daily_review(date) from public;
grant execute on function public.daily_review(date) to anon, authenticated;
