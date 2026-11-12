-- REQ-252 (levels phase 1A, Nick 2026-11-10 and 2026-11-12). Number 078
-- assigned by the lead. Design: "Teaching learners at every level" (Nick's
-- decisions of 2026-11-12 override the body of that design).
--
-- 1. learner_course_profiles: one row per learner and course.
--    goal   the per-course goal question (approved 2026-11-10), one of
--           'work'          "I use this at work regularly"
--           'current'       "I'm staying current or keeping a credential"
--           'program'       "I'm in a program or studying for the exam now"
--           'career_change' "I'm getting into this field or changing careers"
--           'interest'      "I'm learning out of interest"
--           or null when the learner skipped it.
--    level  the course level: 'new', 'some' or 'experienced' (shown to the
--           learner as New, Some background, Experienced). The default comes
--           from the goal and the account intake's experience answer
--           (experience wins on a conflict, lib/learner-level.ts); the
--           learner confirms or changes it on the same screen.
--    level_source  'default' (the suggestion, not yet confirmed), 'self'
--           (the learner chose it) or 'auto' (never at course level today;
--           kept so a later course-wide rule needs no migration).
-- 2. learner_unit_levels: an optional per-unit override. The lesson reads the
--    unit's level and falls back to the course's. source 'self' (set by the
--    learner) or 'auto' (moved up one level from mastery evidence).
-- 3. learner_level_changes: every level change -- by the learner, by mastery
--    evidence ('mastery') -- with what it was before, so an automatic change
--    can be undone exactly (prior_unit_level / prior_unit_source: the unit
--    row as it was, both null when the unit had no override), and whether
--    the learner has seen its notice (seen_at) or undone it (undone_at).
--    Nick, 2026-11-12: changes are AUTOMATIC as mastery is gained, each with a
--    short notice and an undo; nothing moves silently, so an unseen change is
--    shown again on the course page until it is acknowledged.
-- 4. subject_tracks.level_flow: the per-course switch for the level-aware
--    lesson flow (the one-tap hunch and full worked example for New, "Skip
--    guided" offered for Experienced). On for Python and JavaScript only;
--    every other course keeps today's lesson until Nick widens it
--    (`update subject_tracks set level_flow = true where code = '...'`). The
--    seed sets it for tracks marked `levelFlow` and never clears it.
-- 5. learner_events: the phase 1 measurement events (lesson steps, the
--    hunch, level changes, the goal answer; key_terms_* for the primers
--    builder's button, REQ-252 / 079) and a small `detail` jsonb (level,
--    card number, a duration in seconds, a level pair). Never answer text --
--    the server builds `detail` from a fixed list of keys (lib/learner-level.ts
--    lessonEventDetail), and the column is capped at 400 bytes.
--
-- Every per-learner table is led by user_id (FAIL-393), deleted with the
-- account (on delete cascade), in the account export (lib/account-export.ts)
-- and in docs/legal/data-inventory.md.
--
-- ORDER. Apply BEFORE the backend that reads it: the level routes and the
-- lesson event route read these tables, and /api/health probes them
-- (lib/schema-status.ts). The code before this migration never reads them.
--
-- LOCKING. Three new tables; one nullable column with a constant default on
-- subject_tracks and one nullable column on learner_events (catalog-only
-- changes in PG 11+, no rewrite, but an instant ACCESS EXCLUSIVE each); the
-- learner_events checks are swapped with NOT VALID (an instant ACCESS
-- EXCLUSIVE) then VALIDATE (SHARE UPDATE EXCLUSIVE, which does not block
-- inserts). lock_timeout 5 s as usual.
--
-- ROLLBACK:
--   drop table if exists learner_level_changes, learner_unit_levels, learner_course_profiles;
--   alter table subject_tracks drop column if exists level_flow;
--   delete from learner_events where event not in ('lesson_started','lesson_finished','review_done',
--     'exam_taken','placement_done','first_run_completed','exam_outcome');
--   alter table learner_events drop constraint if exists learner_events_event_078;
--   alter table learner_events add constraint learner_events_event_check check (event in (...048's list...));
--   alter table learner_events drop column if exists detail;
--
-- Safe to run twice: if not exists, guarded DO blocks.

set local lock_timeout = '5s';

-- 1. Per-course goal and level --------------------------------------------------

create table if not exists learner_course_profiles (
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid not null references subject_tracks(id) on delete cascade,
    goal text check (goal in ('work', 'current', 'program', 'career_change', 'interest')),
    level text not null check (level in ('new', 'some', 'experienced')),
    level_source text not null default 'default' check (level_source in ('default', 'self', 'auto')),
    -- When the learner answered (or skipped) the start-of-course question;
    -- null for a row the level check created before they were asked.
    answered_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, track_id)
);
create index if not exists learner_course_profiles_track on learner_course_profiles (track_id);

-- 2. Per-unit overrides ---------------------------------------------------------

create table if not exists learner_unit_levels (
    user_id uuid not null references app_users(id) on delete cascade,
    unit_id uuid not null references course_units(id) on delete cascade,
    track_id uuid not null references subject_tracks(id) on delete cascade,
    level text not null check (level in ('new', 'some', 'experienced')),
    source text not null check (source in ('self', 'auto')),
    updated_at timestamptz not null default now(),
    primary key (user_id, unit_id)
);
create index if not exists learner_unit_levels_user_track on learner_unit_levels (user_id, track_id);
create index if not exists learner_unit_levels_unit on learner_unit_levels (unit_id);
create index if not exists learner_unit_levels_track on learner_unit_levels (track_id);

-- 3. Level changes (notice + undo) ------------------------------------------------

create table if not exists learner_level_changes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid not null references subject_tracks(id) on delete cascade,
    unit_id uuid references course_units(id) on delete cascade,
    from_level text not null check (from_level in ('new', 'some', 'experienced')),
    to_level text not null check (to_level in ('new', 'some', 'experienced')),
    reason text not null check (reason in ('learner', 'mastery')),
    prior_unit_level text check (prior_unit_level in ('new', 'some', 'experienced')),
    prior_unit_source text check (prior_unit_source in ('self', 'auto')),
    created_at timestamptz not null default now(),
    seen_at timestamptz,
    undone_at timestamptz
);
create index if not exists learner_level_changes_user_track on learner_level_changes (user_id, track_id, created_at);
create index if not exists learner_level_changes_track on learner_level_changes (track_id);
create index if not exists learner_level_changes_unit on learner_level_changes (unit_id);

-- 4. The per-course switch for the level-aware lesson flow ----------------------------

alter table subject_tracks add column if not exists level_flow boolean not null default false;
-- The pilot: the catalog's Python and JavaScript courses (the seed sets the
-- same on a fresh database, where these rows do not exist yet).
update subject_tracks set level_flow = true
 where user_id is null and code in ('PYTHON', 'JAVASCRIPT') and not level_flow;

-- 5. Measurement events ---------------------------------------------------------

alter table learner_events add column if not exists detail jsonb;

do $$
begin
    if not exists (select 1 from pg_constraint where conrelid = 'learner_events'::regclass and conname = 'learner_events_event_078') then
        alter table learner_events drop constraint if exists learner_events_event_check;
        alter table learner_events add constraint learner_events_event_078 check (event in (
            'lesson_started', 'lesson_finished', 'review_done', 'exam_taken',
            'placement_done', 'first_run_completed', 'exam_outcome',
            -- REQ-252 phase 1
            'course_goal_set', 'level_changed',
            'guess_shown', 'guess_answered', 'guess_skipped',
            'teach_card_viewed', 'guided_skipped', 'lesson_step_reached',
            'key_terms_opened', 'key_terms_closed')) not valid;
        alter table learner_events validate constraint learner_events_event_078;
    end if;
    if not exists (select 1 from pg_constraint where conrelid = 'learner_events'::regclass and conname = 'learner_events_detail_078') then
        alter table learner_events add constraint learner_events_detail_078
            check (detail is null or (jsonb_typeof(detail) = 'object' and pg_column_size(detail) <= 400)) not valid;
        alter table learner_events validate constraint learner_events_detail_078;
    end if;
end $$;

select app_runtime_sync();
