-- REQ-169 (intake form) and REQ-170 (category plans), Nick 2026-11-09.
--
-- 1. learner_intake: the learner's answers to "what do you want to learn":
--    goal, experience, weekly study time and, optionally, what they'll use
--    it for. One row per learner, editable later in Settings. Used to set up
--    the study plan and to SUGGEST a plan and length -- never to set a price
--    (one published price per plan for everyone; the New York and
--    Connecticut personalised-pricing laws are the reason).
-- 2. learner_intake_targets: the course(s) they're preparing for, each with
--    an optional exam date (at most 5 per learner, enforced by the API).
-- 3. entitlements.family / entitlements.scope: which category plan a
--    subscription is for. A row without a scope (every grant, and anything
--    written before this migration) covers every course, as before.
-- 4. founding_members: the first N paying learners (FOUNDING_MEMBERS_LIMIT,
--    default 100) while FOUNDING_MEMBERS_ENABLED is on. A seat is held at
--    checkout and confirmed by the first paid webhook; an unpaid hold
--    lapses after FOUNDING_MEMBERS_HOLD_HOURS (48).
--
-- Deleting an account deletes all of it (on delete cascade, like every other
-- per-learner table); a deleted course drops out of the targets. Purely
-- additive: three new tables and two nullable columns. The code before this
-- migration never reads them. Independent of 058 (verified discounts) and
-- 059 (study notice): any order applies cleanly. Safe to run twice.

set local lock_timeout = '5s';

-- 1. Intake answers ------------------------------------------------------------

create table if not exists learner_intake (
    user_id uuid primary key references app_users(id) on delete cascade,
    goal text check (goal is null or goal in ('pass_exam', 'new_skill', 'career_change', 'keep_current', 'exploring')),
    experience text check (experience is null or experience in ('new', 'some', 'experienced', 'retake')),
    weekly_hours numeric(4, 1) check (weekly_hours is null or (weekly_hours >= 0.5 and weekly_hours <= 60)),
    use_for text check (use_for is null or use_for in ('personal', 'work', 'teaching')),
    -- true when the learner chose "Skip for now" without answering
    skipped boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists learner_intake_targets (
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid not null references subject_tracks(id) on delete cascade,
    exam_date date,
    position smallint not null default 0 check (position between 0 and 9),
    created_at timestamptz not null default now(),
    -- FAIL-393 rule: led by user_id, so deleting an account is an index walk.
    primary key (user_id, track_id)
);

create index if not exists learner_intake_targets_track_idx on learner_intake_targets (track_id);

-- 2. Category plans on entitlements -----------------------------------------------

alter table entitlements add column if not exists family text;
alter table entitlements add column if not exists scope text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'entitlements_family_check') then
    alter table entitlements add constraint entitlements_family_check check (
      family is null or family in ('it_cloud_plus', 'it_cloud_pro', 'pm_plus', 'pm_pro', 'fitness_plus', 'fitness_pro',
                                   'all_access', 'clinical_pro', 'clinical_addon'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'entitlements_scope_check') then
    alter table entitlements add constraint entitlements_scope_check check (
      scope is null or scope in ('it_cloud', 'pm', 'fitness', 'all_access', 'clinical'));
  end if;
end $$;

-- 3. Founding members ---------------------------------------------------------------

create table if not exists founding_members (
    user_id uuid primary key references app_users(id) on delete cascade,
    percent smallint not null check (percent between 1 and 90),
    held_at timestamptz not null default now(),
    -- set by the first paid subscription event after the hold; a confirmed
    -- seat keeps its discount for as long as the subscription continues
    confirmed_at timestamptz,
    -- stripe / revenuecat: where it was taken
    source text check (source is null or source in ('stripe', 'revenuecat'))
);

create index if not exists founding_members_confirmed_idx on founding_members (confirmed_at, held_at);

-- Supabase Data API lock-out, as 026 and 052 did for every table before.
alter table learner_intake enable row level security;
alter table learner_intake_targets enable row level security;
alter table founding_members enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on learner_intake, learner_intake_targets, founding_members from anon, authenticated;
  end if;
end $$;
