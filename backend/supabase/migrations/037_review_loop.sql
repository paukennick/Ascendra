-- REQ-108: the review loop -- spaced review of everything learned, a daily
-- mixed review with fresh questions, unit gate checks and term coverage.
--
-- Additive only: new tables, one new attempt kind, one new assessment type,
-- one new nullable attempts column and one trigger on mastery. Nothing here
-- changes the mastery rule (mastery_detail / mastery_from_attempts, 031) or
-- recompute_mastery() (029). The backfill of existing learners (schedule rows
-- for objectives already at Guided or above) and the validation of the new
-- foreign key are in 037b_review_loop_backfill.sql, which the runner applies
-- straight after this file in its own transaction.
--
-- 1. attempt kind 'review'. A Today's review answer is recorded in attempts
--    with kind 'review', stage 'review' and an explicit assessment_type
--    ('free_response' or 'multiple_choice'), so the 031 rule counts it as
--    direct evidence on its objective with that type's weight, gets the
--    spacing factor from its timestamp and, when it is a correct unassisted
--    free response, counts as format evidence on its own day -- the
--    fresh-question route to Transfer-ready. Its stage is not 'solo', so the
--    rule's "Solo multiple choice is a hint" and "repeat of the same Solo
--    item" never apply; the app records a hint itself (assisted = true,
--    assist_reason 'hint') when the learner opened the choices and then typed
--    an answer. The new enum value is not used anywhere in this file (a value
--    added in a transaction cannot be used until it commits).
--
-- 2. assessment type 'unit_check': one transfer scenario written from the
--    unit's gate statement, graded by the PBQ grader, recorded as kind
--    'unitcheck', format 'pbq', objective_id NULL, unit_id set, in the same
--    shape as a unit PBQ. NOTE: the 031 rule's unit branch reads only
--    kind = 'pbq' attempts, so until its owner widens that branch to the
--    unit_scope assessment types, a unit check is stored but does not move
--    mastery (see REQ-108 for the one-line change proposed).
--
-- 3. review_schedule: one row per (learner, objective) once the objective
--    first reaches Guided, Independent or Transfer-ready, filled by a trigger
--    on mastery so every writer (live grading, PBQ recompute,
--    recompute_mastery()) enrols it. The scheduler itself is code
--    (lib/review-scheduler.ts, fixed 1/3/7/21/60-day steps); `scheduler`
--    and `state` let an FSRS-style scheduler replace it per row later.
--    review_log keeps what FSRS needs: every review's outcome, whether it
--    was assisted, the days since the previous review and the interval that
--    had been scheduled.
--
-- 4. review_items: generated review questions, one batch per session, SHARED
--    by every learner (no learner data in a row). source_hash is md5 of the
--    shared lesson's teaching text they were written from; when the lesson
--    changes the old items are no longer served.
--
-- 5. objective_terms / learner_term_coverage: the named terms of each
--    objective (from its title where it lists them, otherwise once from the
--    cheap model) and, per learner, which terms they have answered correctly
--    without help.
--
-- 6. review_sessions / review_session_items: one Today's review session and
--    the questions in it, in order. choices_shown_at records the "show
--    choices" hint server-side.
--
-- 7. unit_check_items: generated unit checks, one or more per unit, shared;
--    gate_hash = md5 of the gate statement they were written from.
--
-- Safe to run twice (IF NOT EXISTS / ON CONFLICT DO NOTHING / CREATE OR
-- REPLACE). lib/schema-status.ts probes every object the code needs.

set local lock_timeout = '5s';

alter type attempt_kind add value if not exists 'review';

insert into assessment_types (type_name, format_family, cognitive_weight, application_level, unit_scope, note) values
  ('unit_check', 'scenario', 1.25, true, true,
   'Unit gate check: one transfer scenario written from the unit''s gate statement, graded like a PBQ. Covers the whole unit, like a PBQ; counts only once the rule''s unit branch reads unit_scope types (REQ-108).')
on conflict (type_name) do nothing;

-- Schedule ---------------------------------------------------------------------

create table if not exists review_schedule (
    user_id uuid not null references app_users(id) on delete cascade,
    objective_id uuid not null references objectives(id) on delete cascade,
    scheduler varchar(20) not null default 'fixed_v1',
    step int not null default 0 check (step >= 0),
    due_on date not null,
    reps int not null default 0,
    lapses int not null default 0,
    last_reviewed_at timestamptz,
    state jsonb,                              -- scheduler-specific (FSRS: stability, difficulty)
    enrolled_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, objective_id)
);
create index if not exists review_schedule_due on review_schedule (user_id, due_on);

create table if not exists review_log (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    objective_id uuid references objectives(id) on delete set null,
    attempt_id uuid references attempts(id) on delete set null,
    reviewed_at timestamptz not null default now(),
    verdict attempt_verdict not null,
    assisted boolean not null,
    was_due boolean not null,
    elapsed_days numeric,                     -- since the previous review (or enrolment); null if never scheduled
    scheduled_days numeric,                   -- the interval that had been scheduled
    scheduler varchar(20),
    step_before int,
    step_after int,
    due_before date,
    due_after date
);
create index if not exists review_log_user on review_log (user_id, reviewed_at);

-- Enrol on first reaching Guided or above. Runs for every writer of mastery.
create or replace function review_schedule_enrol() returns trigger language plpgsql as $$
begin
  if new.user_id is not null and new.objective_id is not null
     and new.status in ('Guided', 'Independent', 'Transfer-ready') then
    insert into review_schedule (user_id, objective_id, due_on)
    values (new.user_id, new.objective_id, (now() at time zone 'UTC')::date + 1)
    on conflict (user_id, objective_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists mastery_review_enrol on mastery;
create trigger mastery_review_enrol
  after insert or update of status on mastery
  for each row execute function review_schedule_enrol();

-- Shared review questions --------------------------------------------------------

create table if not exists review_items (
    id uuid primary key default uuid_generate_v4(),
    objective_id uuid not null references objectives(id) on delete cascade,
    source_hash varchar(32) not null,
    question text not null,
    choices jsonb not null,                   -- string[4], stored order
    correct_index int not null check (correct_index between 0 and 3),
    why text not null,
    terms jsonb not null default '[]'::jsonb, -- the objective's terms this question tests
    model text not null,
    generated_at timestamptz not null default now()
);
create index if not exists review_items_objective on review_items (objective_id, source_hash);

-- Terms ----------------------------------------------------------------------------

create table if not exists objective_terms (
    objective_id uuid primary key references objectives(id) on delete cascade,
    source_hash varchar(32) not null,         -- md5 of the objective title
    terms jsonb not null,                     -- string[]
    method varchar(20) not null check (method in ('title', 'model')),
    model text,
    extracted_at timestamptz not null default now()
);

create table if not exists learner_term_coverage (
    user_id uuid not null references app_users(id) on delete cascade,
    objective_id uuid not null references objectives(id) on delete cascade,
    term text not null,                       -- lower-cased key
    correct_count int not null default 1,
    first_correct_at timestamptz not null default now(),
    last_correct_at timestamptz not null default now(),
    primary key (user_id, objective_id, term)
);

-- Sessions -----------------------------------------------------------------------

create table if not exists review_sessions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid references subject_tracks(id) on delete set null,   -- null = every course
    day date not null,
    size_cap int not null,
    gentle_start boolean not null default false,
    created_at timestamptz not null default now(),
    finished_at timestamptz
);
create index if not exists review_sessions_user_day on review_sessions (user_id, day);

create table if not exists review_session_items (
    session_id uuid not null references review_sessions(id) on delete cascade,
    position int not null,
    objective_id uuid not null references objectives(id) on delete cascade,
    review_item_id uuid references review_items(id) on delete set null,
    choices_shown_at timestamptz,
    attempt_id uuid references attempts(id) on delete set null,
    verdict attempt_verdict,
    answered_at timestamptz,
    primary key (session_id, position)
);
create index if not exists review_session_items_item on review_session_items (review_item_id);

-- Unit checks --------------------------------------------------------------------

create table if not exists unit_check_items (
    id uuid primary key default uuid_generate_v4(),
    unit_id uuid not null references course_units(id) on delete cascade,
    gate_hash varchar(32) not null,
    title text not null,
    scenario text not null,
    sub_parts jsonb not null,
    model text not null,
    generated_at timestamptz not null default now()
);
create index if not exists unit_check_items_unit on unit_check_items (unit_id, gate_hash);

-- Which unit check an attempt answered. Null on every existing row, so adding
-- it is catalog-only; the key is added NOT VALID (no scan under this file's
-- lock) and validated in 037b.
alter table attempts add column if not exists unit_check_item_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attempts_unit_check_item_fkey'
                    and conrelid = 'attempts'::regclass) then
    alter table attempts add constraint attempts_unit_check_item_fkey
      foreign key (unit_check_item_id) references unit_check_items(id) on delete set null not valid;
  end if;
end $$;
