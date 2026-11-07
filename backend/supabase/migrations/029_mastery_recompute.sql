-- REQ-097: mastery integrity -- schema and the rule. The data work (backup,
-- backfills, the first recompute) is in 029b_mastery_backfill.sql, which the
-- runner applies straight after this file in its own transaction.
--
-- DEPLOY ORDER: follow docs/deploy-runbook-mastery.md, step by step. In
-- short: apply 029, apply 029b (both with `npm run migrate -- --all`), deploy
-- the backend, run `call recompute_mastery_batched();`, publish the app
-- update, verify. The rollback order is in the same file.
--
-- THE DEPLOY GAP (between 029b and the backend deploy) and what is trusted.
-- Until the new backend is live, the old code is still grading: it takes the
-- question, the taught text and the kind from the app, writes attempts with
-- assisted = false, and overwrites mastery with its latest-answer rule. So:
--   - Only kind = 'lesson' attempts are evidence (FAIL-182). A row of any
--     other kind ('quiz' and the like, which the old route accepted from the
--     app and the new one refuses) never counts, even with stage 'solo'.
--   - Repeats are read from history, not from attempts.assisted.
--   - Pre-029 history, and lesson rows the old code writes in the gap, are
--     trusted as they are: a learner who sent the old route a crafted
--     'lesson' answer can keep the level it earns. Nothing in the data tells
--     those rows apart from honest ones. Keep the gap short (minutes: deploy
--     straight after 029b), or pause grading for it, and run the batched
--     recompute after the deploy, which re-derives every pair the old code
--     touched.
-- ROLLBACK: rolling the backend back also needs an over-the-air rollback of
-- the app (a new app against the old backend gets 400 on every grade: the
-- old route requires the question and answer key the new app no longer has).
-- See the runbook for the order.
--
-- What was wrong (audit, teaching quality): a correct answer on the Guided
-- ("fade") step, which is mostly worked through for the learner, earned
-- Independent; a Guided answer plus a Solo answer earned Transfer-ready in one
-- sitting; the Solo answer could be resubmitted for full credit after the
-- correct option had been shown; looking at the choices hint and then typing
-- the answer counted as unassisted; and status came from the latest answer
-- alone. Live grading uses mastery_from_attempts() below, and 029b and
-- recompute_mastery() / recompute_mastery_batched() use the same function, so
-- they cannot disagree.
--
-- THE RULE (mastery_from_attempts). Evidence for an objective is every graded
-- kind = 'lesson', non-PBQ attempt on it (PBQ answers belong to a unit, not an
-- objective, and never count; other kinds never count either -- see above).
-- "Unassisted Solo success" = stage 'solo', free response, verdict correct,
-- and none of these:
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
       and x.kind = 'lesson' and x.format <> 'pbq' and x.verdict is not null
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

-- RECOMPUTE. recompute_mastery() and recompute_mastery_batched() re-derive
-- stored mastery through mastery_from_attempts(), the one function that
-- decides a level (live grading calls it too). They visit every pair with
-- graded lesson attempts AND every existing mastery row, so a level with no
-- evidence behind it (the old self-set override, or a row whose only evidence
-- was PBQ) drops to what the rule gives for no evidence: Not started. A later
-- rule change replaces mastery_from_attempts() with CREATE OR REPLACE and then
-- runs `call recompute_mastery_batched();` -- taking its own backup first;
-- neither touches mastery_backup_029.
--
-- Safe under live grading (FAIL-118). The grader (recordAttemptTx in
-- backend/lib/grading-service.ts) holds pg_advisory_xact_lock(grade_lock_key)
-- while it inserts the attempt and rewrites the pair's mastery. Each pair here
-- is decided under that same lock, in a statement started after the lock was
-- granted, so it sees every grade committed before it and never writes a
-- level computed without one. (The first version computed every pair from one
-- snapshot taken when the statement started and upserted without the lock: a
-- grade committed during the run was overwritten with the level from before
-- it -- 245 of 290 such grades in the review's race test.) A grade that starts
-- after this pair is written waits on the row lock until the batch commits and
-- then writes its own, newer level.
--
-- Unchanged rows are skipped before any lock (FAIL-180): a pair whose stored
-- row already equals the rule is not written and not row-locked, so a re-run
-- touches nothing. The advisory lock is taken and released per pair (session
-- level), so at most one is held at a time whatever the number of rows.

-- Same key as the grader: hashtext('grade:<user id>:<objective id>') with
-- both ids in canonical lowercase text (gradeLockName() in grading-service.ts).
create or replace function grade_lock_key(p_user uuid, p_objective uuid)
returns int language sql immutable as $$
  select hashtext('grade:' || lower(p_user::text) || ':' || lower(p_objective::text))
$$;

-- Re-derives one pair. Returns 1 if the stored row changed, else 0.
create or replace function recompute_mastery_pair(p_user uuid, p_objective uuid)
returns int language plpgsql volatile as $$
declare
  k int := grade_lock_key(p_user, p_objective);
  m record;
  changed int := 0;
begin
  -- Cheap pre-check without any lock: most rows are already current.
  if exists (
    select 1 from mastery x, mastery_from_attempts(p_user, p_objective) f
     where x.user_id = p_user and x.objective_id = p_objective
       and x.status = f.status and x.score_0_4 = f.score and x.evidence = f.evidence) then
    return 0;
  end if;
  perform pg_advisory_lock(k);
  -- New statement, new snapshot: taken after the lock, so any grade of this
  -- pair has committed (or not started).
  select f.status, f.score, f.evidence into m from mastery_from_attempts(p_user, p_objective) f;
  insert into mastery (user_id, objective_id, status, score_0_4, evidence, updated_at)
  values (p_user, p_objective, m.status, m.score, m.evidence, now())
  on conflict (user_id, objective_id) do update
     set status = excluded.status, score_0_4 = excluded.score_0_4,
         evidence = excluded.evidence, updated_at = now()
   where mastery.status is distinct from excluded.status
      or mastery.score_0_4 is distinct from excluded.score_0_4
      or mastery.evidence is distinct from excluded.evidence;
  get diagnostics changed = row_count;
  perform pg_advisory_unlock(k);
  return changed;
end $$;

-- Every pair the recompute visits, in a stable order.
create or replace function mastery_pairs(p_user uuid default null)
returns table (user_id uuid, objective_id uuid) language sql stable as $$
  select a.user_id, a.objective_id
    from attempts a
   where a.user_id is not null and a.objective_id is not null
     and a.kind = 'lesson' and a.format <> 'pbq' and a.verdict is not null
     and (p_user is null or a.user_id = p_user)
  union
  select m.user_id, m.objective_id
    from mastery m
   where m.user_id is not null and m.objective_id is not null
     and (p_user is null or m.user_id = p_user)
  order by 1, 2
$$;

-- One transaction (what 029b and the tests use). Pass a user id to recompute
-- one learner. Returns the number of rows that changed (0 on a re-run). Rows
-- it changes stay row-locked until the caller commits; for a whole database
-- after deploy use recompute_mastery_batched() instead.
create or replace function recompute_mastery(p_user uuid default null)
returns int language plpgsql volatile as $$
declare
  r record;
  n int := 0;
begin
  for r in select * from mastery_pairs(p_user) loop
    n := n + recompute_mastery_pair(r.user_id, r.objective_id);
  end loop;
  return n;
exception when others then
  -- A session-level advisory lock outlives a rollback; never leave one held.
  perform pg_advisory_unlock_all();
  raise;
end $$;

-- The whole database in committed batches: `call recompute_mastery_batched();`
-- (psql or the Supabase SQL editor, outside a transaction block -- CALL with
-- COMMIT inside fails in one). Each batch of p_batch pairs commits on its own,
-- so the row locks it takes are held only for that batch. Progress is printed
-- as NOTICEs; safe to stop and run again (finished batches stay done, and a
-- re-run skips current rows).
create or replace procedure recompute_mastery_batched(p_batch int default 500, p_user uuid default null)
language plpgsql as $$
declare
  v_total int;
  v_from int := 0;
  v_changed int := 0;
  v_n int;
begin
  drop table if exists pg_temp.recompute_mastery_todo;
  create temp table recompute_mastery_todo as
    select (row_number() over ())::int as n, p.user_id, p.objective_id from mastery_pairs(p_user) p;
  alter table recompute_mastery_todo add primary key (n);
  select count(*) into v_total from recompute_mastery_todo;
  commit;
  while v_from < v_total loop
    begin
      select coalesce(sum(recompute_mastery_pair(t.user_id, t.objective_id)), 0)::int into v_n
        from recompute_mastery_todo t
       where t.n > v_from and t.n <= v_from + p_batch;
    exception when others then
      perform pg_advisory_unlock_all();
      raise;
    end;
    v_changed := v_changed + v_n;
    v_from := v_from + p_batch;
    commit;
    raise notice 'recompute_mastery_batched: % of % pairs checked, % rows changed', least(v_from, v_total), v_total, v_changed;
  end loop;
  drop table if exists pg_temp.recompute_mastery_todo;
  commit;
end $$;
