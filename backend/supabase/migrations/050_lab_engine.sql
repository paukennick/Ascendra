-- REQ-123: verifiable labs ("build" and "case") as mastery evidence.
--
-- Until now only five CompTIA courses had labs, and those are self-reported
-- tasks done on the learner's own machine (objectives.lab_prompt, migration
-- 035): graded, but never mastery evidence (attempts_lab_not_mastery_evidence).
-- This adds two kinds of lab that the server can verify from what the learner
-- writes, so they CAN count:
--
--   build  the learner produces a professional artifact (an IAM policy, a
--          WBS, a care plan, a training program), one text answer per rubric
--          part, graded per part (met / partial / missed) like a PBQ.
--   case   an unfolding case in 2-4 steps. Each step's text is authored in
--          advance and depends on nothing the learner typed (fixed branching);
--          the decision at each step is graded per rubric part; the run ends
--          with one recorded attempt and a summary.
--
-- The self-reported kind is unchanged: kind 'lab', objective_id NULL,
-- lab_objective_id set, never evidence.
--
-- WHAT IS ADDED
--   1. attempt_kind 'labtask' and two assessment_types rows, lab_build and
--      lab_case (application level, format family 'performance', weight 1.5:
--      the same as a PBQ and the reserved single-objective 'scenario').
--      A finished lab is ONE attempt on the ONE objective the lab names
--      (objective_id set, unit_scope false), format 'open' so the rule's
--      direct-answer branch reads it (it skips format 'pbq').
--      WHY A NEW KIND rather than reusing 'lab': 035's check says a 'lab'
--      attempt never has an objective_id, and mastery_detail() skips kind
--      'lab' in every branch. Reusing 'lab' would mean loosening that
--      constraint and rewriting the rule; a distinct kind keeps 035's
--      meaning exactly ("self-reported, not evidence") and needs no change to
--      mastery_detail(): its direct branch already counts any attempt with an
--      assessment_type, and the stored assisted/assist_reason flags carry the
--      repeat rule (lib/grading-service.ts assistReasonFor: a run of a lab
--      after any graded step of an earlier run -- the model answer was shown
--      -- is a 'repeat': weight x assist_weight_repeat, only the latest
--      repeat counts, never format evidence).
--   2. labs        one authored or generated lab per row, on one objective.
--   3. lab_runs    one learner's pass through one lab (a build is a run of
--                  one step); at most one open run per learner and lab.
--   4. lab_run_steps  each graded step of a run, with the learner's answers,
--                  per-part scores and the client attempt id that replays it.
--   5. attempts.lab_id (partial index, no foreign key -- see section 5) and
--      a check that a 'labtask' attempt is a lab type in format 'open' and
--      that no other kind carries a lab id.
--   6. 'lab' as an item kind in item_flags / item_status / item_holdbacks,
--      so labs flow through "Report a problem", quarantine and voiding
--      (lib/item-quality.ts).
--
-- THE MASTERY RULE IS NOT RESTATED. mastery_detail() (045) is untouched, so
-- 042's `a.voided_at is null` filter and 045's rules stay as they are.
-- lib/labs.dbtest.ts proves a lab win counts and a repeat after the model
-- answer does not lift the level.
--
-- LOCKING. lock_timeout 5 s like 031/041/045. ALTER TYPE ... ADD VALUE is
-- catalog-only. Two small rows in assessment_types; three new tables; one
-- nullable column without a default on attempts (catalog only, no foreign
-- key); its check is NOT VALID (no scan; checks every new row). The
-- partial index on attempts (user_id, lab_id) is built inside the
-- transaction: reads go on, attempt inserts wait while it builds. On a large
-- attempts table build it CONCURRENTLY first (docs/deploy-runbook-integration.md,
-- row 050); the IF NOT EXISTS here then skips it. The item-kind checks are
-- replaced on the three small item tables (each scanned once to validate).
--
-- A later quiet moment can run:
--   alter table attempts validate constraint attempts_labtask_shape;
-- (Nothing wrote kind 'labtask' or lab_id before this file, so there is
-- nothing old for it to reject.)
--
-- Safe to run twice: IF NOT EXISTS / ON CONFLICT DO NOTHING / guarded DO blocks.

set local lock_timeout = '5s';

-- 1. Kind and assessment types ------------------------------------------------------

-- Usable from the next transaction on, so nothing below compares against it
-- as an enum value (the check in section 5 compares kind::text).
alter type attempt_kind add value if not exists 'labtask';

insert into assessment_types (type_name, format_family, cognitive_weight, application_level, unit_scope, note) values
  ('lab_build', 'performance', 1.5, true, false,
   'REQ-123 build lab: the learner produces a professional artifact (policy, plan, schedule, program) for a fictional brief, graded per rubric part like a PBQ. Counts only on the objective the lab names. Same weight as a PBQ: multi-part applied work.'),
  ('lab_case', 'performance', 1.5, true, false,
   'REQ-123 case lab: an unfolding case in 2-4 authored steps, the decision at each graded per rubric part; one attempt per finished run. Counts only on the objective the lab names. Same family as lab_build, so two labs alone never make two format families.')
on conflict (type_name) do nothing;

-- 2. labs ------------------------------------------------------------------------------

create table if not exists labs (
    id uuid primary key default uuid_generate_v4(),
    -- Objectives are retired, not deleted; if one is deleted (a learner's
    -- own private course), its labs go with it (FAIL-480).
    objective_id uuid not null references objectives(id) on delete cascade,
    -- Stable authored identity within the objective (the seed matches on it).
    slug varchar(80) not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
    kind varchar(10) not null check (kind in ('build', 'case')),
    title varchar(200) not null,
    -- The situation, shown before step 1.
    brief text not null check (length(brief) between 20 and 6000),
    -- [{ "text": new information for this step, "ask": what to decide or produce }]
    steps jsonb not null check (jsonb_typeof(steps) = 'array'),
    -- One entry per step: [{ "parts": [{ "label", "criteria", "modelAnswer" }] }].
    -- Never sent to the app before the step is graded.
    rubric jsonb not null check (jsonb_typeof(rubric) = 'array'),
    safety_note text,
    -- Where the lab's exam alignment comes from (outline URLs).
    sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
    source varchar(10) not null check (source in ('authored', 'generated')),
    review_status varchar(24) not null default 'needs_expert_review'
        check (review_status in ('needs_expert_review', 'approved', 'rejected')),
    reviewed_by text,
    reviewed_at timestamptz,
    review_note text,
    -- md5 of the learner-facing and grading content; a change sends an
    -- approved lab back to needs_expert_review (seed and generator).
    content_hash varchar(32) not null,
    model text,
    retired_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (objective_id, slug),
    check ((kind = 'build' and jsonb_array_length(steps) = 1)
        or (kind = 'case' and jsonb_array_length(steps) between 2 and 4)),
    check (jsonb_array_length(rubric) = jsonb_array_length(steps))
);
create index if not exists idx_labs_objective on labs (objective_id) where retired_at is null;

-- 3. lab_runs --------------------------------------------------------------------------

create table if not exists lab_runs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    lab_id uuid not null references labs(id) on delete cascade,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    abandoned_at timestamptz,
    -- The one attempt a finished run recorded.
    attempt_id uuid references attempts(id) on delete set null
);
create index if not exists idx_lab_runs_user_lab on lab_runs (user_id, lab_id, started_at);
create unique index if not exists lab_runs_one_open
    on lab_runs (user_id, lab_id) where completed_at is null and abandoned_at is null;
-- FAIL-393: a key into attempts has an index led by its column.
create index if not exists idx_lab_runs_attempt on lab_runs (attempt_id) where attempt_id is not null;
create index if not exists idx_lab_runs_lab on lab_runs (lab_id);

-- 4. lab_run_steps -----------------------------------------------------------------

create table if not exists lab_run_steps (
    run_id uuid not null references lab_runs(id) on delete cascade,
    user_id uuid not null references app_users(id) on delete cascade,
    step_index int not null check (step_index between 0 and 3),
    client_attempt_id varchar(100),
    answers jsonb not null check (jsonb_typeof(answers) = 'array'),
    verdict attempt_verdict not null,
    feedback text,
    classification text,
    missed_parts jsonb,
    part_scores jsonb,
    fix_next text,
    created_at timestamptz not null default now(),
    primary key (run_id, step_index)
);
create index if not exists idx_lab_run_steps_user on lab_run_steps (user_id, created_at);
create unique index if not exists lab_run_steps_client_attempt
    on lab_run_steps (user_id, client_attempt_id) where client_attempt_id is not null;

-- 5. attempts.lab_id -----------------------------------------------------------------

-- attempts.lab_id is a plain indexed column, WITHOUT a foreign key
-- (FAIL-480, FAIL-481):
--   - the first draft required lab_id and objective_id on every 'labtask'
--     row and had no ON DELETE on labs, so deleting a course with lab answers
--     failed (attempts.objective_id is SET NULL, like every item key on
--     attempts, and labs blocked the objective's deletion);
--   - an immediate ON DELETE SET NULL key failed the same deletion (the
--     check on the row's first SET NULL update still saw the deleted lab),
--     and a DEFERRABLE one queues a trigger event for every attempt insert,
--     so any later DDL on attempts in that transaction fails ("pending
--     trigger events" -- lib/mastery-recompute.dbtest.ts re-runs 029 that way).
-- What the column names is written only by lib/labs.ts recordStep, inside
-- the transaction that reads the lab, and recordAttemptTx refuses a
-- 'labtask' answer without its lab and objective (as 035's rule for 'lab' is
-- enforced there too). After a course is deleted an answer keeps its lab id
-- as history, the way it keeps its question text.
alter table attempts add column if not exists lab_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attempts_labtask_shape' and conrelid = 'attempts'::regclass) then
    -- kind::text: the new enum value cannot be used as a value in the
    -- transaction that adds it. A labtask answer is always a lab type in
    -- format 'open' (the rule's direct branch skips format 'pbq'); a lab id
    -- appears on no other kind.
    alter table attempts add constraint attempts_labtask_shape check (
      (kind::text <> 'labtask' and lab_id is null)
      or (kind::text = 'labtask' and assessment_type in ('lab_build', 'lab_case') and format = 'open')
    ) not valid;
  end if;
end $$;
create index if not exists idx_attempts_user_lab on attempts (user_id, lab_id) where lab_id is not null;

-- 6. Item kinds ------------------------------------------------------------------------

do $$
declare
  t text;
  c text;
begin
  foreach t in array array['item_flags', 'item_status'] loop
    for c in select conname from pg_constraint
              where conrelid = t::regclass and contype = 'c'
                and pg_get_constraintdef(oid) like '%item_kind%' and pg_get_constraintdef(oid) not like '%''lab''%' loop
      execute format('alter table %I drop constraint %I', t, c);
    end loop;
    if not exists (select 1 from pg_constraint where conrelid = t::regclass and conname = t || '_item_kind_050') then
      execute format(
        'alter table %I add constraint %I check (item_kind in (''lesson'', ''review'', ''exam'', ''quiz'', ''comparison'', ''lab''))',
        t, t || '_item_kind_050');
    end if;
  end loop;
  for c in select conname from pg_constraint
            where conrelid = 'item_holdbacks'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) like '%item_kind%' and pg_get_constraintdef(oid) not like '%''lab''%' loop
    execute format('alter table item_holdbacks drop constraint %I', c);
  end loop;
  if not exists (select 1 from pg_constraint where conrelid = 'item_holdbacks'::regclass and conname = 'item_holdbacks_item_kind_050') then
    alter table item_holdbacks add constraint item_holdbacks_item_kind_050 check (item_kind in
      ('lesson', 'lesson_intro', 'review', 'exam', 'quiz', 'comparison', 'pbq', 'unit_check', 'lab'));
  end if;
end $$;
