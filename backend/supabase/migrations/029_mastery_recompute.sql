-- REQ-097: mastery integrity -- schema and the rule. The data work (backup,
-- backfills, the first recompute) is in 029b_mastery_backfill.sql, which the
-- runner applies straight after this file in its own transaction.
--
-- DEPLOY ORDER (read before running):
--   1. npm run migrate -- --all      (applies 029, then 029b)
--   2. deploy the backend code
--   3. after deploying the code, run `select recompute_mastery()` once.
--      Between steps 1 and 2 the old code is still grading: it writes
--      attempts with assisted = false and overwrites mastery with its
--      latest-answer rule. The rule below does not trust a stored
--      assisted = false for repeats (it reads them from history), and every
--      later grade recomputes the pair, so this one call only catches pairs
--      the old code touched in the gap and nobody has graded since.
-- ROLLBACK: rolling the backend back also needs an over-the-air rollback of
-- the app (a new app against the old backend gets 400 on every grade: the
-- old route requires the question and answer key the new app no longer has).
--
-- What was wrong (audit, teaching quality): a correct answer on the Guided
-- ("fade") step, which is mostly worked through for the learner, earned
-- Independent; a Guided answer plus a Solo answer earned Transfer-ready in one
-- sitting; the Solo answer could be resubmitted for full credit after the
-- correct option had been shown; looking at the choices hint and then typing
-- the answer counted as unassisted; and status came from the latest answer
-- alone. Live grading uses mastery_from_attempts() below, and 029b and
-- recompute_mastery() use the same function, so they cannot disagree.
--
-- THE RULE (mastery_from_attempts). Evidence for an objective is every graded,
-- non-PBQ attempt on it (PBQ answers belong to a unit, not an objective, and
-- never count). "Unassisted Solo success" = stage 'solo', free response,
-- verdict correct, and none of these:
--   - attempts.assisted is true (the hint was shown, or it was multiple choice)
--   - the learner answered the same item (same stage and question) earlier:
--     a repeat. Read from history here, not from attempts.assisted, so an
--     attempt written by code that did not set the flag is still a repeat.
--   - lesson_hint_reveals has the item, revealed before this answer.
--   Not started    no evidence at all (also: only PBQ evidence)
--   Needs review   latest verdict incorrect, 2+ attempts, under 50% correct
--                  (unchanged from before)
--   Transfer-ready 2+ unassisted Solo successes, the latest at least 24 hours
--                  after the first (repeats don't count, so these are always
--                  two different questions)
--   Independent    1 unassisted Solo success
--   Guided         any correct or partial answer (Guided step, multiple
--                  choice, a hint, a repeat)
--   Introduced     attempted, nothing correct or partial
--
-- LOCKING. Everything here is catalog-only or one index build, with
-- lock_timeout 5 s so a long-running query on attempts makes this fail
-- (retry it) instead of queueing every read behind the ALTER. The index on
-- attempts is built first, under a SHARE lock (reads continue, writes wait
-- for the build); the ACCESS EXCLUSIVE locks of the ALTERs come after it,
-- so they are held only for the last moments of this transaction. The
-- whole file took about 1 s on a 1.9M-attempt fixture (an attempts insert
-- waited at most 0.4 s; no read waited).

set local lock_timeout = '5s';

-- 1. Indexes on existing columns, before any ACCESS EXCLUSIVE lock ----------

create index if not exists idx_attempts_user_objective on attempts(user_id, objective_id);

-- 2. Columns ----------------------------------------------------------------

alter table attempts add column if not exists assisted boolean not null default false;
alter table attempts add column if not exists assist_reason varchar(20);

-- PBQ review entries name their scenario, so Review can offer a retry and a
-- correct retry can advance the entry (PBQ attempts have no objective).
alter table error_log add column if not exists pbq_scenario_id uuid references pbq_scenarios(id) on delete set null;
create index if not exists idx_error_log_user_pbq on error_log(user_id, pbq_scenario_id)
  where pbq_scenario_id is not null;

-- One row per Solo item whose choices a learner asked to see. Written by
-- POST /api/objectives/:id/hint before the choices are sent, so the hint is
-- recorded on the server rather than reported by the app.
create table if not exists lesson_hint_reveals (
    user_id uuid not null references app_users(id) on delete cascade,
    objective_id uuid not null references objectives(id) on delete cascade,
    item_key char(32) not null,
    revealed_at timestamptz not null default now(),
    primary key (user_id, objective_id, item_key)
);

-- 3. The rule ---------------------------------------------------------------

-- Same value as lessonItemKey() in backend/lib/choice-order.ts.
create or replace function lesson_item_key(p_stage text, p_question text)
returns text language sql immutable as $$
  select md5(coalesce(p_stage, '') || E'\n' || coalesce(p_question, ''))
$$;

-- Always returns exactly one row ('Not started' when there is no evidence).
create or replace function mastery_from_attempts(p_user uuid, p_objective uuid)
returns table (status mastery_status, score int, evidence text)
language sql stable as $$
  with a as (
    select x.id, x.verdict, x.created_at,
           (x.stage = 'solo' and x.format = 'open' and x.verdict = 'correct'
            and not x.assisted
            and not exists (
              select 1 from attempts p
               where p.user_id = x.user_id and p.objective_id = x.objective_id
                 and p.stage = x.stage and p.question = x.question
                 and (p.created_at, p.id) < (x.created_at, x.id))
            and not exists (
              select 1 from lesson_hint_reveals h
               where h.user_id = x.user_id and h.objective_id = x.objective_id
                 and h.item_key = lesson_item_key(x.stage, x.question)
                 and h.revealed_at <= x.created_at)) as solo_win
      from attempts x
     where x.user_id = p_user and x.objective_id = p_objective
       and x.format <> 'pbq' and x.verdict is not null
  ), s as (
    select count(*) as n,
           count(*) filter (where verdict = 'correct') as n_correct,
           count(*) filter (where verdict in ('correct', 'partial')) as n_credit,
           count(*) filter (where solo_win) as n_solo,
           min(created_at) filter (where solo_win) as first_solo,
           max(created_at) filter (where solo_win) as last_solo,
           (select verdict from a order by created_at desc, id desc limit 1) as last_verdict
      from a
  ), st as (
    select s.*,
           (case
              when n = 0 then 'Not started'
              when last_verdict = 'incorrect' and n >= 2 and n_correct::numeric / n < 0.5 then 'Needs review'
              when n_solo >= 2 and last_solo - first_solo >= interval '24 hours' then 'Transfer-ready'
              when n_solo >= 1 then 'Independent'
              when n_credit >= 1 then 'Guided'
              else 'Introduced'
            end)::mastery_status as status
      from s
  )
  select status,
         case status
           when 'Not started' then 0 when 'Introduced' then 1 when 'Guided' then 2
           when 'Independent' then 3 when 'Transfer-ready' then 4 when 'Needs review' then 1
         end,
         format('%s graded, %s correct; unassisted solo: %s%s',
                n, n_correct, n_solo,
                case when n_solo > 0
                     then format(' (%s to %s)', to_char(first_solo at time zone 'UTC', 'YYYY-MM-DD'),
                                 to_char(last_solo at time zone 'UTC', 'YYYY-MM-DD'))
                     else '' end)
    from st
$$;

-- recompute_mastery() re-derives stored mastery through
-- mastery_from_attempts(), the one function that decides a level (live
-- grading calls it too). It visits every pair with graded non-PBQ attempts
-- AND every existing mastery row, so a level with no evidence behind it
-- (the old self-set override, or a row whose only evidence was PBQ) drops to
-- what the rule gives for no evidence: Not started. A later rule change
-- replaces mastery_from_attempts() with CREATE OR REPLACE and then runs
-- `select recompute_mastery();` -- taking its own backup first; this
-- function never touches mastery_backup_029. Pass a user id to recompute one
-- learner. Returns the number of rows that changed (0 on a re-run).
create or replace function recompute_mastery(p_user uuid default null)
returns int language sql volatile as $$
  with changed as (
    insert into mastery (user_id, objective_id, status, score_0_4, evidence, updated_at)
    select p.user_id, p.objective_id, m.status, m.score, m.evidence, now()
      from (select user_id, objective_id
              from attempts
             where user_id is not null and objective_id is not null
               and format <> 'pbq' and verdict is not null
               and (p_user is null or user_id = p_user)
            union
            select user_id, objective_id
              from mastery
             where user_id is not null and objective_id is not null
               and (p_user is null or user_id = p_user)) p
      cross join lateral mastery_from_attempts(p.user_id, p.objective_id) m
    on conflict (user_id, objective_id) do update
       set status = excluded.status, score_0_4 = excluded.score_0_4,
           evidence = excluded.evidence, updated_at = now()
     where mastery.status is distinct from excluded.status
        or mastery.score_0_4 is distinct from excluded.score_0_4
        or mastery.evidence is distinct from excluded.evidence
    returning 1
  )
  select count(*)::int from changed
$$;
