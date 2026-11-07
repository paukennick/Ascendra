-- 038_exam_practice.sql (REQ-109): exam-style question formats, timed
-- sprints and mock exams.
--
-- What this adds (additive only; nothing existing is rewritten, so it runs
-- in well under a second and needs no backfill):
--
--   1. Three new rows in assessment_types (migration 031), so answers in the
--      new formats count in the weighted mastery model by name
--      (attempts.assessment_type). The rule itself (mastery_detail,
--      recompute_mastery) is NOT changed.
--   2. exam_items: a SHARED bank of exam-style items, one row per item, per
--      objective. Generated once (or written by hand) and served to every
--      learner who can see the objective, like lesson_content, so the model
--      cost is per objective, not per learner. The answer key lives in
--      `answer_key` and is never sent to the app before the item is graded.
--   3. exam_sessions / exam_session_items: one learner's sprint or mock
--      exam, the items it drew, the saved (ungraded) responses, flags,
--      confidence and time per item, and after submit the grade of each.
--      Grading happens on the server at submit; each graded item is then
--      recorded as an ordinary attempt (kind 'quiz', assessment_type set),
--      so it goes through the same mastery, review-log and assisted/repeat
--      rules as every other answer.
--
-- Weights for the new types. Single multiple choice is 0.75 and free
-- response 1.0 (031). The new formats are still SELECTED responses
-- (recognition, not producing an answer), so they stay below free response
-- and are not application_level: they never count as "format evidence" for
-- Independent / Transfer-ready, the same as multiple choice. They are
-- harder to guess than one-of-four (multiple response: every right option
-- and no wrong one; ordering and matching: a whole arrangement), so they
-- sit a little above single multiple choice. First-pass values for owner
-- tuning; change them here or with UPDATE and run select recompute_mastery().
--
-- Exhibits (a log excerpt, an IAM policy, a firewall table, a network
-- diagram described in text) are an attachment to an item, not a format of
-- their own, so they add no assessment type.

set local lock_timeout = '5s';

insert into assessment_types (type_name, format_family, cognitive_weight, application_level, unit_scope, note) values
  ('multiple_response', 'multiple_response', 0.85, false, false,
   'Exam-style "choose two/three": every correct option and no incorrect one. Verdict is all-or-nothing, as vendors score it; per-option partial credit is stored on exam_session_items.partial_score only. Recognition-level.'),
  ('ordering', 'ordering', 0.9, false, false,
   'Exam-style ordering: put 3-6 steps in sequence (e.g. incident-response phases). Correct = whole order right; partial when at least half the positions are right. Recognition-level.'),
  ('matching', 'matching', 0.9, false, false,
   'Exam-style matching: pair 3-6 prompts with responses (e.g. control type to example). Correct = every pair right; partial when at least half the pairs are right. Recognition-level.')
on conflict (type_name) do nothing;

-- The bank. item_format is what the learner sees and how it is graded;
-- body holds what is shown (choices / steps / prompts and responses) in
-- STORED order, answer_key what is right in stored order:
--   multiple_choice    body {choices: [..]}                     key {correct: [i]}
--   multiple_response  body {choices: [..], selectCount: n}     key {correct: [i, j, ..]}
--   ordering           body {steps: [..]} (stored = right order) key {order: [0..n-1]}
--   matching           body {prompts: [..], responses: [..]}    key {matches: [r0, r1, ..]}
-- The app sees a per-learner shuffle (lib/choice-order.ts HMAC seed).
create table if not exists exam_items (
    id uuid primary key default uuid_generate_v4(),
    objective_id uuid not null references objectives(id) on delete cascade,
    item_format text not null references assessment_types(type_name)
        check (item_format in ('multiple_choice', 'multiple_response', 'ordering', 'matching')),
    stem text not null,
    body jsonb not null,
    answer_key jsonb not null,
    explanation text not null default '',
    -- {kind: log|policy|table|diagram, title, text?, columns?, rows?} or null
    exhibit jsonb,
    -- 'generated' by the model for the bank; 'lesson' = a lesson's own
    -- Guided/Solo check copied in, served only to learners who have already
    -- answered it in the lesson (so it is a repeat, never a preview of a
    -- lesson question they haven't met)
    source text not null default 'generated' check (source in ('generated', 'lesson')),
    model text,
    created_at timestamptz not null default now()
);
create index if not exists idx_exam_items_objective on exam_items(objective_id, item_format);
-- one copy of each lesson check per objective
create unique index if not exists exam_items_lesson_unique on exam_items(objective_id, md5(stem)) where source = 'lesson';

create table if not exists exam_sessions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid not null references subject_tracks(id) on delete cascade,
    mode text not null check (mode in ('sprint', 'mock')),
    status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'abandoned')),
    -- null = untimed (the accessibility option, or a sprint taken untimed)
    time_limit_seconds int check (time_limit_seconds is null or time_limit_seconds > 0),
    -- the exam's own numbers when the session was built, for the results
    -- screen (duration may be unknown: Microsoft does not publish some)
    exam_duration_minutes int,
    exam_question_count int,
    started_at timestamptz not null default now(),
    deadline_at timestamptz,
    submitted_at timestamptz,
    -- course readiness (lib/readiness.ts) taken when the session started,
    -- before any of its answers counted, so the comparison is honest
    readiness_before jsonb,
    client_session_id varchar(64),
    created_at timestamptz not null default now()
);
create index if not exists idx_exam_sessions_user_track on exam_sessions(user_id, track_id, created_at desc);
create unique index if not exists exam_sessions_user_client_unique
    on exam_sessions(user_id, client_session_id) where client_session_id is not null;

create table if not exists exam_session_items (
    session_id uuid not null references exam_sessions(id) on delete cascade,
    position int not null check (position >= 0),
    item_id uuid not null references exam_items(id) on delete cascade,
    objective_id uuid not null references objectives(id) on delete cascade,
    unit_id uuid not null references course_units(id) on delete cascade,
    -- learner's answer in STORED indexes, the shape lib/exam-formats.ts
    -- validates; null until answered
    response jsonb,
    flagged boolean not null default false,
    confidence int check (confidence between 1 and 5),
    -- time the app reports the item was on screen, summed; clamped server-side
    time_spent_ms int not null default 0 check (time_spent_ms >= 0),
    answered_at timestamptz,
    -- filled at submit
    verdict attempt_verdict,
    credited boolean,
    partial_score numeric check (partial_score is null or (partial_score >= 0 and partial_score <= 1)),
    attempt_id uuid references attempts(id) on delete set null,
    primary key (session_id, position)
);
create index if not exists idx_exam_session_items_item on exam_session_items(item_id);
