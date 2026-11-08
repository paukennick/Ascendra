-- REQ-110: learner-aware coach with "Quiz me", a study plan built back from
-- the exam date, session choice + "kept" view, and an optional placement
-- check.
--
-- Additive only: new tables and two assessment_types rows. Nothing here
-- changes mastery_detail() / mastery_from_attempts() / recompute_mastery()
-- (migrations 029/031). New answers reach the weighted model only through
-- the existing hook: attempts.assessment_type names a row below, and the row
-- says how much the answer weighs and whether it can ever be format evidence.
--
-- Safe to run twice (IF NOT EXISTS / ON CONFLICT DO NOTHING). No existing
-- table is altered, so no long lock is taken.

set local lock_timeout = '5s';

-- 1. Assessment types --------------------------------------------------------

-- coach_quiz: weight 0. The coach picks the item, the learner can ask for
-- hints, and a miss is followed by a graded hint and another try. That is
-- assisted practice, not evidence of what the learner can do alone, so it
-- adds nothing to weighted accuracy or readiness and is never format
-- evidence (application_level false). The first try is recorded with
-- assist_reason 'coach'; later tries (after a hint) with assist_reason
-- 'retry', which 031 already leaves out entirely. A zero weight still lets
-- the first try count as "answered" (an Introduced/Guided level, and the
-- latest-answer check for Needs review), which is what a coached answer is.
--
-- placement: weight 0.5, the same as a guided step. One multiple-choice
-- answer per objective, in one sitting, before any teaching. It is real but
-- thin evidence: recognition level (application_level false), so on its
-- own it can lift an objective to Guided at most -- never Independent, and
-- never Transfer-ready (which also needs separate days). Placement answers
-- are unassisted (no hint, no answer shown during the check).
insert into assessment_types (type_name, format_family, cognitive_weight, application_level, unit_scope, note) values
  ('coach_quiz', 'coach_quiz', 0, false, false,
   'REQ-110 "Quiz me on my weak spots": coach-chosen item with graded hints and retries. Assisted practice, so weight 0: recorded, never counted toward accuracy, readiness or format evidence. First try assist_reason coach; tries after a hint assist_reason retry.'),
  ('placement', 'placement', 0.5, false, false,
   'REQ-110 placement check: one unassisted multiple-choice answer per objective, single sitting, before teaching. Same weight as a guided step; recognition level, so it can lift an objective to Guided at most and never to Independent or Transfer-ready on its own.')
on conflict (type_name) do nothing;

-- 2. Study plan settings -------------------------------------------------------

-- One row per learner and course. The plan itself is not stored: it is
-- recomputed from these settings and current mastery every time it is
-- opened (lib/study-plan.ts), so it adapts without a job and without an AI
-- call.
create table if not exists study_plans (
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid not null references subject_tracks(id) on delete cascade,
    exam_date date,
    weekly_hours numeric(4,1) not null default 5 check (weekly_hours >= 0.5 and weekly_hours <= 60),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, track_id)
);

-- 3. Placement check -----------------------------------------------------------

create table if not exists placement_checks (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid not null references subject_tracks(id) on delete cascade,
    status text not null default 'active' check (status in ('active', 'done', 'skipped')),
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    unique (user_id, track_id)
);

-- One row per question served. The question is the objective's shared
-- Guided item (lesson_content.fade_problem), so placement makes no AI call.
-- Its choices and key are copied here when served, so grading never depends
-- on the shared lesson staying unchanged. correct is null until answered;
-- tested-out objectives are the rows with correct = true.
create table if not exists placement_items (
    placement_id uuid not null references placement_checks(id) on delete cascade,
    seq int not null check (seq >= 1),
    objective_id uuid not null references objectives(id) on delete cascade,
    question text not null,
    choices jsonb not null,
    correct_index int not null check (correct_index >= 0),
    attempt_id uuid references attempts(id) on delete set null,
    correct boolean,
    served_at timestamptz not null default now(),
    answered_at timestamptz,
    primary key (placement_id, seq),
    unique (placement_id, objective_id)
);

-- 4. "Quiz me" -----------------------------------------------------------------

-- Shared across learners (generic to the objective, no learner data), so a
-- question is generated once per objective and reused. The answer key and the
-- explanation never leave the server until the learner has answered.
create table if not exists coach_quiz_items (
    id uuid primary key default uuid_generate_v4(),
    objective_id uuid not null references objectives(id) on delete cascade,
    question text not null,
    choices jsonb not null,
    correct_index int not null check (correct_index between 0 and 3),
    hints jsonb not null,
    explanation text not null,
    model text,
    generated_at timestamptz not null default now()
);
create index if not exists idx_coach_quiz_items_objective on coach_quiz_items(objective_id);

-- One row per item a learner is quizzed on. open -> correct (got it, on any
-- try) or revealed (three misses: the answer and explanation are shown, and
-- the item is then fair game for the coach to discuss).
create table if not exists coach_quiz_turns (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid not null references subject_tracks(id) on delete cascade,
    item_id uuid not null references coach_quiz_items(id) on delete cascade,
    tries int not null default 0 check (tries >= 0),
    status text not null default 'open' check (status in ('open', 'correct', 'revealed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, item_id)
);
create index if not exists idx_coach_quiz_turns_user_track on coach_quiz_turns(user_id, track_id, status);
