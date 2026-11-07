-- REQ-097: mastery integrity, and a recompute of every learner's mastery under
-- the new rules (owner decision, 2026-11-07).
--
-- What was wrong (audit, teaching quality): a correct answer on the Guided
-- ("fade") step, which is mostly worked through for the learner, earned
-- Independent; a Guided answer plus a Solo answer earned Transfer-ready in one
-- sitting; the Solo answer could be resubmitted for full credit after the
-- correct option had been shown; looking at the choices hint and then typing
-- the answer counted as unassisted; and status came from the latest answer
-- alone. Live grading now uses mastery_from_attempts() below, and this file
-- recomputes stored mastery from attempt history with the same function, so
-- the recompute and the live path cannot disagree.
--
-- THE RULE (mastery_from_attempts). Evidence for an objective is every graded,
-- non-PBQ attempt on it. "Unassisted Solo success" = stage 'solo', free
-- response, verdict correct, attempts.assisted = false.
--   Needs review   latest verdict incorrect, 2+ attempts, under 50% correct
--                  (unchanged from before)
--   Transfer-ready 2+ unassisted Solo successes, the latest at least 24 hours
--                  after the first. Repeats of one item are assisted (below),
--                  so these are always two different questions.
--   Independent    1 unassisted Solo success
--   Guided         any correct or partial answer (Guided step, multiple
--                  choice, a hint, a repeat)
--   Introduced     attempted, nothing correct or partial
-- attempts.assisted is true when the choices were visible on the Solo step
-- (assist_reason 'hint': answered as multiple choice, or the hint was opened,
-- see lesson_hint_reveals) or when the learner had already answered that same
-- item before, so its answer had been revealed (assist_reason 'repeat').
--
-- ORDER OF WORK, and why it is safe to run twice:
--   1. additive DDL (IF NOT EXISTS / OR REPLACE)
--   2. BACKUP of mastery and review state, before anything changes. One row
--      per mastery / error_log row, ON CONFLICT DO NOTHING: a second run never
--      overwrites the original pre-029 values (rows created after the first
--      run are added with their state at the second run).
--   3. backfill attempts.assisted from history (only rows not yet classified)
--      and error_log.pbq_scenario_id (only rows still null)
--   4. recompute mastery; a row is only rewritten when its status, score or
--      evidence differs, so a second run changes nothing.
-- Review entries (error_log) are backed up but NOT rewound: "Got it" taps are
-- not recorded anywhere, so their stages cannot be rebuilt from attempts.
--
-- What history cannot show: a pre-029 hint that was opened and then answered
-- in free response left no trace, so such answers stay unassisted.
--
-- RESTORE (puts mastery and review state back to what it was just before the
-- first run of this migration; only meaningful together with rolling the code
-- back, because the next graded answer recomputes from the new rules):
--
--   begin;
--   update mastery m
--      set status = b.status, score_0_4 = b.score_0_4,
--          evidence = b.evidence, updated_at = b.updated_at
--     from mastery_backup_029 b
--    where b.mastery_id = m.id;
--   update error_log e
--      set review_stage = b.review_stage, next_review_at = b.next_review_at,
--          resolved = b.resolved
--     from error_log_backup_029 b
--    where b.error_log_id = e.id;
--   commit;
--
-- To see whose level changed:
--   select b.user_id, b.objective_id, b.status as before, m.status as after
--     from mastery_backup_029 b join mastery m on m.id = b.mastery_id
--    where b.status is distinct from m.status;

-- 1. Schema ------------------------------------------------------------------

alter table attempts add column if not exists assisted boolean not null default false;
alter table attempts add column if not exists assist_reason varchar(20);

-- PBQ review entries name their scenario, so Review can offer a retry and a
-- correct retry can advance the entry (PBQ attempts have no objective).
alter table error_log add column if not exists pbq_scenario_id uuid references pbq_scenarios(id) on delete set null;

create index if not exists idx_attempts_user_objective on attempts(user_id, objective_id);
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

-- Same value as lessonItemKey() in backend/lib/choice-order.ts.
create or replace function lesson_item_key(p_stage text, p_question text)
returns text language sql immutable as $$
  select md5(coalesce(p_stage, '') || E'\n' || coalesce(p_question, ''))
$$;

create or replace function mastery_from_attempts(p_user uuid, p_objective uuid)
returns table (status mastery_status, score int, evidence text)
language sql stable as $$
  with a as (
    select id, verdict, created_at,
           (stage = 'solo' and format = 'open' and verdict = 'correct' and not assisted) as solo_win
      from attempts
     where user_id = p_user and objective_id = p_objective
       and format <> 'pbq' and verdict is not null
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
              when n = 0 then null
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
   where status is not null
$$;

-- 2. Backup, before any data changes ------------------------------------------

create table if not exists mastery_backup_029 (
    mastery_id uuid primary key,
    user_id uuid,
    objective_id uuid,
    status mastery_status,
    score_0_4 int,
    evidence text,
    updated_at timestamptz,
    backed_up_at timestamptz not null default now()
);

insert into mastery_backup_029 (mastery_id, user_id, objective_id, status, score_0_4, evidence, updated_at)
select id, user_id, objective_id, status, score_0_4, evidence, updated_at from mastery
on conflict (mastery_id) do nothing;

create table if not exists error_log_backup_029 (
    error_log_id uuid primary key,
    user_id uuid,
    review_stage int,
    next_review_at date,
    resolved boolean,
    backed_up_at timestamptz not null default now()
);

insert into error_log_backup_029 (error_log_id, user_id, review_stage, next_review_at, resolved)
select id, user_id, review_stage, next_review_at, resolved from error_log
on conflict (error_log_id) do nothing;

-- 3. Backfills ----------------------------------------------------------------

-- Multiple choice on the Solo step means the choices were on screen.
update attempts
   set assisted = true, assist_reason = 'hint'
 where kind = 'lesson' and stage = 'solo' and format = 'mc' and assist_reason is null;

-- A second (or later) answer to the same item, after the first had been graded
-- and its answer shown.
update attempts a
   set assisted = true, assist_reason = 'repeat'
 where a.kind = 'lesson' and a.stage in ('fade', 'solo') and a.objective_id is not null
   and a.assist_reason is null
   and exists (
     select 1 from attempts p
      where p.user_id = a.user_id and p.objective_id = a.objective_id
        and p.stage = a.stage and p.question = a.question
        and (p.created_at, p.id) < (a.created_at, a.id)
   );

update error_log e
   set pbq_scenario_id = a.pbq_scenario_id
  from attempts a
 where e.attempt_id = a.id and a.pbq_scenario_id is not null and e.pbq_scenario_id is null;

-- 4. Recompute ----------------------------------------------------------------
--
-- recompute_mastery() re-derives every stored mastery row from attempt
-- history through mastery_from_attempts(), the one function that decides a
-- level (live grading calls it too). A later rule change replaces
-- mastery_from_attempts() with CREATE OR REPLACE and then runs
-- `select recompute_mastery();` -- taking its own backup first; this
-- function never touches mastery_backup_029. Pass a user id to recompute one
-- learner. Returns the number of rows that changed (0 on a re-run).

create or replace function recompute_mastery(p_user uuid default null)
returns int language sql volatile as $$
  with changed as (
    insert into mastery (user_id, objective_id, status, score_0_4, evidence, updated_at)
    select p.user_id, p.objective_id, m.status, m.score, m.evidence, now()
      from (select distinct user_id, objective_id
              from attempts
             where user_id is not null and objective_id is not null
               and format <> 'pbq' and verdict is not null
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

select recompute_mastery();
