-- REQ-119 (Audit 3 product): the basics a paid app for anyone needs.
--
-- 1. terms_acceptances: which version of the Terms and Privacy Policy each
--    account accepted, when, and how (sign-up form, Google sign-up, or the
--    one-tap prompt existing accounts see once). The app only had a checkbox
--    on the phone; nothing was stored, and Google sign-up skipped it.
-- 2. learner_onboarding: whether the account has been through the first-run
--    flow (goal, optional exam date, optional placement). Every account that
--    exists when this runs is marked done, so only new learners see it.
-- 3. learner_events: a first-party, minimal record of learning milestones
--    (lesson started / finished, a review session done, an exam submitted,
--    a placement check finished, first run completed, an exam outcome
--    reported). User id, event name, course / objective / session ids and a
--    time -- never answer text or anything else about the person. No third
--    party sees it. Deleted with the account (cascade); in the export.
--    Most events are written by the triggers below, at the state change
--    that defines them, so no route has to remember to log them; the
--    trigger function swallows its own errors (a warning in the log) so a
--    logging problem can never fail a graded answer.
-- 4. exam_outcomes: "I took the exam" -- date, passed / failed / didn't say,
--    optional score. Editable and deletable by the learner; in the export.
--
-- Additive. New tables, plus AFTER triggers on attempts, lesson_progress,
-- review_sessions, exam_sessions and placement_checks (CREATE TRIGGER takes
-- a SHARE ROW EXCLUSIVE lock for an instant; 5 s lock_timeout as usual).
-- Safe to run twice.

set local lock_timeout = '5s';

-- 1. Terms acceptance -----------------------------------------------------------

create table if not exists terms_acceptances (
    user_id uuid not null references app_users(id) on delete cascade,
    terms_version varchar(32) not null,
    accepted_at timestamptz not null default now(),
    source text not null check (source in ('register', 'google_signup', 'prompt')),
    primary key (user_id, terms_version)
);

-- 2. First run ------------------------------------------------------------------

create table if not exists learner_onboarding (
    user_id uuid primary key references app_users(id) on delete cascade,
    first_run_completed_at timestamptz,
    goal_track_id uuid references subject_tracks(id) on delete set null,
    just_exploring boolean not null default false,
    created_at timestamptz not null default now()
);

-- Accounts that already exist are past their first run: they have been
-- using the app without it. Only accounts created after this see it.
insert into learner_onboarding (user_id, first_run_completed_at)
select id, coalesce(created_at, now()) from app_users
on conflict (user_id) do nothing;

-- 3. Learner events -------------------------------------------------------------

create table if not exists learner_events (
    id bigint generated always as identity primary key,
    user_id uuid not null references app_users(id) on delete cascade,
    event text not null check (event in (
        'lesson_started', 'lesson_finished', 'review_done', 'exam_taken',
        'placement_done', 'first_run_completed', 'exam_outcome')),
    track_id uuid references subject_tracks(id) on delete set null,
    objective_id uuid references objectives(id) on delete set null,
    ref_id uuid,
    created_at timestamptz not null default now()
);

-- A lesson counts as started / finished once per learner and objective; a
-- session, check or outcome once per its id; first run once per learner.
-- Writers insert with ON CONFLICT DO NOTHING, so a retry adds nothing.
create unique index if not exists learner_events_lesson_once
    on learner_events (user_id, event, objective_id)
    where event in ('lesson_started', 'lesson_finished');
create unique index if not exists learner_events_ref_once
    on learner_events (user_id, event, ref_id)
    where ref_id is not null;
create unique index if not exists learner_events_first_run_once
    on learner_events (user_id)
    where event = 'first_run_completed';
create index if not exists learner_events_event_time on learner_events (event, created_at);
create index if not exists learner_events_user_time on learner_events (user_id, created_at);

-- Best effort: an analytics row must never fail the write that caused it.
-- The exception block costs one subtransaction per recorded event, which is
-- one per lesson answer at most.
create or replace function learner_event_record(
    p_user uuid, p_event text, p_track uuid, p_objective uuid, p_ref uuid
) returns void language plpgsql as $$
begin
    if p_user is null then
        return;
    end if;
    insert into learner_events (user_id, event, track_id, objective_id, ref_id)
    values (p_user, p_event, p_track, p_objective, p_ref)
    on conflict do nothing;
exception when others then
    raise warning 'learner_events: % not recorded (%: %)', p_event, sqlstate, sqlerrm;
end;
$$;

-- The course an objective belongs to (null if it is gone).
create or replace function learner_event_track_of(p_objective uuid) returns uuid
language sql stable as $$
    select cu.track_id from objectives o join course_units cu on cu.id = o.unit_id where o.id = p_objective
$$;

-- A lesson answer: the lesson has started; a Solo answer (the last step,
-- right or wrong) means the learner reached the end of it.
create or replace function learner_events_on_attempt() returns trigger language plpgsql as $$
declare
    v_track uuid;
begin
    v_track := learner_event_track_of(new.objective_id);
    perform learner_event_record(new.user_id, 'lesson_started', v_track, new.objective_id, null);
    if new.stage = 'solo' then
        perform learner_event_record(new.user_id, 'lesson_finished', v_track, new.objective_id, null);
    end if;
    return null;
end;
$$;

drop trigger if exists learner_events_attempt on attempts;
create trigger learner_events_attempt
    after insert on attempts
    for each row
    when (new.kind = 'lesson' and new.objective_id is not null and new.user_id is not null)
    execute function learner_events_on_attempt();

-- A saved lesson position (the learner wrote a guess or moved a step)
-- also means the lesson has started, before any graded answer.
create or replace function learner_events_on_lesson_progress() returns trigger language plpgsql as $$
begin
    perform learner_event_record(new.user_id, 'lesson_started', learner_event_track_of(new.objective_id), new.objective_id, null);
    return null;
end;
$$;

drop trigger if exists learner_events_lesson_progress on lesson_progress;
create trigger learner_events_lesson_progress
    after insert on lesson_progress
    for each row
    execute function learner_events_on_lesson_progress();

-- A review session counts once it is finished with at least one answer
-- (opening one and leaving straight away is not a review).
create or replace function learner_events_on_review_session() returns trigger language plpgsql as $$
begin
    if exists (select 1 from review_session_items where session_id = new.id and answered_at is not null) then
        perform learner_event_record(new.user_id, 'review_done', new.track_id, null, new.id);
    end if;
    return null;
end;
$$;

drop trigger if exists learner_events_review_session on review_sessions;
create trigger learner_events_review_session
    after update of finished_at on review_sessions
    for each row
    when (old.finished_at is null and new.finished_at is not null)
    execute function learner_events_on_review_session();

-- A sprint or mock exam submitted.
create or replace function learner_events_on_exam_session() returns trigger language plpgsql as $$
begin
    perform learner_event_record(new.user_id, 'exam_taken', new.track_id, null, new.id);
    return null;
end;
$$;

drop trigger if exists learner_events_exam_session on exam_sessions;
create trigger learner_events_exam_session
    after update of status on exam_sessions
    for each row
    when (old.status is distinct from 'submitted' and new.status = 'submitted')
    execute function learner_events_on_exam_session();

-- A placement check finished (skipping it is not a placement).
create or replace function learner_events_on_placement() returns trigger language plpgsql as $$
begin
    perform learner_event_record(new.user_id, 'placement_done', new.track_id, null, new.id);
    return null;
end;
$$;

drop trigger if exists learner_events_placement on placement_checks;
create trigger learner_events_placement
    after update of status on placement_checks
    for each row
    when (old.status is distinct from 'done' and new.status = 'done')
    execute function learner_events_on_placement();

-- 4. Exam outcomes --------------------------------------------------------------

create table if not exists exam_outcomes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid references subject_tracks(id) on delete set null,
    exam_date date not null,
    result text not null check (result in ('passed', 'failed', 'not_said')),
    -- Whatever the exam reports (a scaled 750/900, a percentage...).
    score numeric(8, 2) check (score is null or (score >= 0 and score <= 100000)),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists exam_outcomes_user_date on exam_outcomes (user_id, exam_date desc);
