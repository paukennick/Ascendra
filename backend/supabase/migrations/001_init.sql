-- Prep LMS schema
-- Run this whole file once in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- Extends the pasted blueprint's subject_tracks/course_modules shape but replaces the static
-- quiz-bank tables with AI-adaptive lesson caching, a mastery model, a full attempt/error log
-- with spaced review, and a chat-history table.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Users (single-user app today, but every row is scoped by user_id so a second
-- user could be added later without a migration). One row is seeded below.
-- ---------------------------------------------------------------------------
create table if not exists app_users (
    id uuid primary key default uuid_generate_v4(),
    email varchar(255) unique not null,
    display_name varchar(255),
    created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Tracks (a whole course/cert, e.g. "MSCS Foundations" or "Security+ SY0-701")
-- ---------------------------------------------------------------------------
create type track_type as enum ('graduate', 'certification');

create table if not exists subject_tracks (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references app_users(id) on delete cascade,
    code varchar(50) not null,               -- e.g. "MSCS", "SECPLUS"
    title varchar(255) not null,
    description text,
    track_type track_type not null,
    created_at timestamptz default now(),
    unique(user_id, code)
);

-- ---------------------------------------------------------------------------
-- Units within a track (a "week" for MSCS, a "domain" for Security+).
-- weight is a percentage (Security+ domain weights sum to 100); for a
-- sequential/unweighted track (MSCS weeks) weight can be left null and
-- sort_order alone determines sequence.
-- ---------------------------------------------------------------------------
create table if not exists course_units (
    id uuid primary key default uuid_generate_v4(),
    track_id uuid references subject_tracks(id) on delete cascade,
    title varchar(255) not null,
    range_label varchar(100),                -- e.g. "Sept 15-21" or null
    weight numeric(5,2),                     -- percentage weight, nullable
    sort_order int not null,
    gate_description text,                   -- "transfer-ready" bar for this unit
    created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Objectives: the atomic thing that gets taught/graded/tracked for mastery.
-- ---------------------------------------------------------------------------
create table if not exists objectives (
    id uuid primary key default uuid_generate_v4(),
    unit_id uuid references course_units(id) on delete cascade,
    title text not null,
    sort_order int not null,
    lab_prompt text,                          -- optional non-graded hands-on lab (Security+ style)
    created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Lesson content cache: one Anthropic call per objective produces this JSON
-- (guess -> teach -> fade -> solo). Re-visiting an objective reads this row
-- instead of re-generating, unless force-regenerated.
-- ---------------------------------------------------------------------------
create table if not exists lesson_content (
    id uuid primary key default uuid_generate_v4(),
    objective_id uuid unique references objectives(id) on delete cascade,
    guess_prompt text not null,
    teach text not null,
    fade_problem text not null,
    fade_choices jsonb not null,              -- string[4]
    fade_correct_index int not null,
    fade_why text not null,
    solo_check text not null,
    solo_choices jsonb not null,
    solo_correct_index int not null,
    solo_why text not null,
    model varchar(100) not null,
    generated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- PBQ scenario cache (Security+-style multi-part performance based questions).
-- Generated per unit on demand and cached the same way as lesson_content;
-- a unit can accumulate several distinct scenarios over time.
-- ---------------------------------------------------------------------------
create table if not exists pbq_scenarios (
    id uuid primary key default uuid_generate_v4(),
    unit_id uuid references course_units(id) on delete cascade,
    title text not null,
    scenario text not null,
    sub_parts jsonb not null,                 -- string[] - the named sub-tasks
    model varchar(100) not null,
    generated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Mastery: one row per (user, objective). Rollups to unit/track level are
-- views, computed from this table, rather than duplicated storage.
-- ---------------------------------------------------------------------------
create type mastery_status as enum (
    'Not started', 'Introduced', 'Guided', 'Independent', 'Transfer-ready', 'Needs review'
);

create table if not exists mastery (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references app_users(id) on delete cascade,
    objective_id uuid references objectives(id) on delete cascade,
    status mastery_status not null default 'Not started',
    score_0_4 int check (score_0_4 between 0 and 4),
    evidence text,
    updated_at timestamptz default now(),
    unique(user_id, objective_id)
);

-- ---------------------------------------------------------------------------
-- Attempts: every graded answer, of every kind/format, ever produced.
-- missed_parts is used for PBQ / multi-part grading: names which sub-part(s)
-- of a multi-part question were not addressed, per the "never grade past a
-- gap" rule.
-- ---------------------------------------------------------------------------
create type attempt_kind as enum ('lesson', 'quiz', 'pbq', 'unitcheck', 'lab');
create type attempt_format as enum ('mc', 'open', 'pbq');
create type attempt_verdict as enum ('correct', 'partial', 'incorrect');

create table if not exists attempts (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references app_users(id) on delete cascade,
    unit_id uuid references course_units(id) on delete set null,
    objective_id uuid references objectives(id) on delete set null,
    pbq_scenario_id uuid references pbq_scenarios(id) on delete set null,
    kind attempt_kind not null,
    stage varchar(50),                        -- 'guess' | 'fade' | 'solo' | null
    format attempt_format not null,
    question text not null,
    answer text not null,
    verdict attempt_verdict,
    feedback text,
    classification varchar(50),               -- freeform grading tag (e.g. 'misconception')
    missed_parts jsonb,                        -- string[] of sub-parts missed, PBQ/multi-part only
    confidence int check (confidence between 1 and 5),
    created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Error log with spaced review (1 / 7 / 21 days out). next_review_at is the
-- single next due date; review_stage advances 1 -> 7 -> 21 -> done as each
-- review is passed.
-- ---------------------------------------------------------------------------
create table if not exists error_log (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references app_users(id) on delete cascade,
    unit_id uuid references course_units(id) on delete set null,
    objective_id uuid references objectives(id) on delete set null,
    attempt_id uuid references attempts(id) on delete set null,
    topic text not null,
    error_text text not null,
    why text,
    classification varchar(50),
    review_stage int not null default 0,      -- 0 = not yet reviewed once
    next_review_at date,
    resolved boolean not null default false,
    created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Chat history for "Ask the coach", scoped to a track (and optionally a unit).
-- ---------------------------------------------------------------------------
create type chat_role as enum ('user', 'assistant');

create table if not exists chat_messages (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references app_users(id) on delete cascade,
    track_id uuid references subject_tracks(id) on delete cascade,
    unit_id uuid references course_units(id) on delete set null,
    role chat_role not null,
    content text not null,
    created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Study sessions (lightweight log of a sitting, used for the weekly-metrics view)
-- ---------------------------------------------------------------------------
create table if not exists study_sessions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references app_users(id) on delete cascade,
    track_id uuid references subject_tracks(id) on delete cascade,
    started_at timestamptz default now(),
    ended_at timestamptz,
    summary text
);

-- ---------------------------------------------------------------------------
-- Rollup views
-- ---------------------------------------------------------------------------
create or replace view view_unit_mastery as
select
    cu.id as unit_id,
    cu.track_id,
    cu.title as unit_title,
    count(o.id) as total_objectives,
    count(m.id) filter (where m.status in ('Independent', 'Transfer-ready')) as mastered_objectives,
    count(m.id) filter (where m.status = 'Needs review') as needs_review_objectives,
    round(
        avg(coalesce(m.score_0_4, 0))::numeric, 2
    ) as avg_score_0_4
from course_units cu
left join objectives o on o.unit_id = cu.id
left join mastery m on m.objective_id = o.id
group by cu.id, cu.track_id, cu.title;

create or replace view view_track_progress as
select
    st.id as track_id,
    st.title as track_title,
    st.track_type,
    count(distinct cu.id) as total_units,
    count(distinct o.id) as total_objectives,
    count(distinct m.id) filter (where m.status in ('Independent', 'Transfer-ready')) as mastered_objectives,
    round(
        (count(distinct m.id) filter (where m.status in ('Independent', 'Transfer-ready'))::numeric
        / greatest(count(distinct o.id), 1)) * 100, 1
    ) as percent_complete
from subject_tracks st
left join course_units cu on cu.track_id = st.id
left join objectives o on o.unit_id = cu.id
left join mastery m on m.objective_id = o.id
group by st.id, st.title, st.track_type;

create or replace view view_due_reviews as
select e.*
from error_log e
where e.resolved = false
  and e.next_review_at is not null
  and e.next_review_at <= current_date;

-- Helpful indexes
create index if not exists idx_course_units_track on course_units(track_id);
create index if not exists idx_objectives_unit on objectives(unit_id);
create index if not exists idx_mastery_user_objective on mastery(user_id, objective_id);
create index if not exists idx_attempts_user_created on attempts(user_id, created_at desc);
create index if not exists idx_attempts_objective on attempts(objective_id);
create index if not exists idx_error_log_review on error_log(user_id, resolved, next_review_at);
create index if not exists idx_chat_track on chat_messages(track_id, created_at);
