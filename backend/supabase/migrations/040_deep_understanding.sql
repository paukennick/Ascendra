-- REQ-111: deep understanding -- comparison cards for look-alike concepts,
-- explain-it-back, misconception diagnosis and prerequisite refreshers
-- (owner request, 2026-11-07).
--
-- Additive only: new tables, one new assessment_types row, and a clearer
-- note on the explain_back row 031 reserved. Nothing here changes the
-- mastery rule (mastery_detail / mastery_from_attempts) or touches existing
-- rows' values.
--
-- WHAT IS SHARED AND WHAT IS PER LEARNER
--   Shared, per course, generated once with the cheap model and cached:
--     course_insights            one row per (course, kind): the claim while a
--                                generation runs, then "ready" for good
--     concept_sets               look-alike concepts compared side by side
--     concept_set_members        the concepts of a set (2-4), each tied to the
--                                objective that teaches it where there is one
--     discrimination_items       "which fits this scenario?" questions for a set
--     learned_set_attempts       which learned confusions already had a card
--                                generated (tried once, never re-billed)
--     objective_prerequisites    the light prerequisite map (editable: source
--                                'edited' rows are never replaced by a
--                                regeneration)
--   Per learner (cascade on account deletion, included in the export):
--     learner_misconceptions     one named likely misconception per missed
--                                answer (attempt_id unique, so a retried
--                                request cannot record it twice)
--     prerequisite_refreshers    which refreshers a learner opened, so whether
--                                they help can be measured honestly
--
-- ASSESSMENT TYPES. Discrimination answers are recorded as attempts with
-- kind 'quiz', stage 'discriminate' and assessment_type 'discrimination';
-- explain-it-back answers as kind 'quiz', stage 'explain' and
-- assessment_type 'explain_back' (the row 031 created). mastery_detail
-- counts any attempt that names an assessment_types row, so both are
-- evidence in the weighted model. Their assisted / assist_reason are set by
-- lib/grading-service.ts (repeat = same item answered before; hint = the
-- comparison card reopened before answering; reveal = an explanation
-- copied from the teaching text).
--
-- Safe to run twice: IF NOT EXISTS / ON CONFLICT DO NOTHING throughout.

set local lock_timeout = '5s';

-- 1. Assessment types -----------------------------------------------------------

insert into assessment_types (type_name, format_family, cognitive_weight, application_level, unit_scope, note) values
  ('discrimination', 'discrimination', 1.0, true, false,
   'Comparison-card question: pick which of 2-4 look-alike concepts fits a new scenario (REQ-111). Application-level, but chosen from a short list, so weighted like free response rather than above it.')
on conflict (type_name) do nothing;

-- 031 reserved explain_back with a "nothing records it yet" note; only that
-- untouched note is replaced, so a tuned row keeps its own.
update assessment_types
   set note = 'Explain-it-back (REQ-111): after Guided, the learner explains the objective to a beginner in their own words; graded on correct, complete, key terms used correctly and no misconception.'
 where type_name = 'explain_back' and note like 'Reserved:%';

-- 2. Shared, per-course caches ----------------------------------------------------

create table if not exists course_insights (
    track_id uuid not null references subject_tracks(id) on delete cascade,
    kind varchar(30) not null check (kind in ('concept_sets', 'prerequisites')),
    status varchar(20) not null check (status in ('generating', 'ready', 'failed')),
    claim_token uuid,
    claimed_at timestamptz not null default now(),
    generated_at timestamptz,
    model varchar(100),
    primary key (track_id, kind)
);

create table if not exists concept_sets (
    id uuid primary key default uuid_generate_v4(),
    track_id uuid not null references subject_tracks(id) on delete cascade,
    -- generated: from the course outline; learned: from learners' recorded
    -- confusions; edited: changed by hand.
    source varchar(20) not null check (source in ('generated', 'learned', 'edited')),
    -- Sorted, lower-cased member names: one set per group of concepts.
    set_key text not null,
    how_to_tell text not null,
    -- [{ "dimension": "...", "values": ["value for member 0", ...] }]
    dimensions jsonb not null,
    model varchar(100),
    created_at timestamptz not null default now(),
    unique (track_id, set_key)
);
create index if not exists idx_concept_sets_track on concept_sets(track_id);

create table if not exists concept_set_members (
    set_id uuid not null references concept_sets(id) on delete cascade,
    position int not null check (position between 0 and 3),
    name text not null,
    aliases jsonb not null default '[]'::jsonb,
    objective_id uuid references objectives(id) on delete set null,
    primary key (set_id, position)
);
create index if not exists idx_concept_set_members_objective on concept_set_members(objective_id);

create table if not exists discrimination_items (
    id uuid primary key default uuid_generate_v4(),
    set_id uuid not null references concept_sets(id) on delete cascade,
    scenario text not null,
    answer_position int not null check (answer_position between 0 and 3),
    why text not null,
    created_at timestamptz not null default now()
);
create index if not exists idx_discrimination_items_set on discrimination_items(set_id);

-- A learned set is attempted once per (objective, confused idea): a model
-- answer that does not survive validation is not paid for again on every
-- request.
create table if not exists learned_set_attempts (
    track_id uuid not null references subject_tracks(id) on delete cascade,
    objective_id uuid not null references objectives(id) on delete cascade,
    confused_key text not null,
    attempted_at timestamptz not null default now(),
    primary key (track_id, objective_id, confused_key)
);

create table if not exists objective_prerequisites (
    track_id uuid not null references subject_tracks(id) on delete cascade,
    objective_id uuid not null references objectives(id) on delete cascade,
    prerequisite_id uuid not null references objectives(id) on delete cascade,
    source varchar(20) not null check (source in ('generated', 'edited')),
    created_at timestamptz not null default now(),
    primary key (objective_id, prerequisite_id),
    check (objective_id <> prerequisite_id)
);
create index if not exists idx_objective_prerequisites_track on objective_prerequisites(track_id);

-- 3. Per learner ----------------------------------------------------------------------

create table if not exists learner_misconceptions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    objective_id uuid not null references objectives(id) on delete cascade,
    attempt_id uuid not null unique references attempts(id) on delete cascade,
    -- mc_option: the wrong option picked (no AI); option_reason: the lesson's
    -- reason for that option; concept_match: the option names a sibling
    -- concept of a comparison set; grader: the free-response grader's tag.
    source varchar(20) not null check (source in ('mc_option', 'option_reason', 'concept_match', 'grader')),
    tag text not null,
    sentence text not null,
    confused_with text,
    confused_with_objective_id uuid references objectives(id) on delete set null,
    concept_set_id uuid references concept_sets(id) on delete set null,
    created_at timestamptz not null default now()
);
create index if not exists idx_learner_misconceptions_user_objective
    on learner_misconceptions(user_id, objective_id, created_at desc);
create index if not exists idx_learner_misconceptions_objective on learner_misconceptions(objective_id);

create table if not exists prerequisite_refreshers (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    objective_id uuid not null references objectives(id) on delete cascade,
    prerequisite_id uuid not null references objectives(id) on delete cascade,
    opened_at timestamptz not null default now()
);
create index if not exists idx_prerequisite_refreshers_user on prerequisite_refreshers(user_id, objective_id);
