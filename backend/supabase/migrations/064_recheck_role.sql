-- REQ-196: sandboxed fact-checking and re-checking.
--
-- Two things, both used only OUTSIDE the request path (GitHub Actions):
--
--   1. exec_checks / exec_check_runs -- "verify by execution" (REQ-187 R4/P7)
--      without running model-written code in a Vercel function.
--        exec_checks      one row per served item that carries the writer's
--                         verification program (lib/exec-checks.ts). Written
--                         by the app when the item is stored: the item has
--                         passed the model fact-check and is served, but its
--                         program has not run yet ("exec_unverified").
--        exec_check_runs  append-only results from the hourly sandbox job
--                         (.github/workflows/content-sandbox.yml): the
--                         program ran in a --network none container and
--                         matched ('passed'), did not ('failed'), or could
--                         not be judged ('error'). A failure is also staged in
--                         item_holdbacks for a person; nothing a learner sees
--                         changes until that person runs `npm run items`.
--      An item is "exec_unverified" while it has no 'passed'/'failed' run.
--
--   2. content_recheck -- a NOLOGIN role with the least privilege the
--      re-check, sandbox and eval jobs need: SELECT on the content tables
--      they read, INSERT on item_holdbacks and exec_check_runs. No UPDATE or
--      DELETE anywhere, nothing on attempts, mastery, users, billing or
--      item_status (so a job can never pull, void or clear an item). Nick
--      creates one LOGIN user that is a member of it (docs/content-review.md,
--      "Re-check database user"); its URL is the RECHECK_DATABASE_URL
--      secret. The jobs refuse to run as a role that can update item_status
--      (lib/recheck-guard.ts).
--
-- RLS. Every public table has RLS on with no policies (026, 052), which the
-- app's owner connection bypasses. content_recheck does not bypass RLS, so
-- each table it reads gets a SELECT policy FOR content_recheck only, and
-- the two it writes an INSERT policy; no other role's access changes.
-- subject_tracks is limited to catalog rows (user_id is null), and
-- lesson_content_overrides is granted column by column without user_id, so
-- the role never sees who a learner's regenerated lesson or own track
-- belongs to.
--
-- LOCKING. Two new tables; GRANT and CREATE POLICY take a brief lock on each
-- named table's catalog entry only. Safe while serving. Safe to run twice:
-- the role is created only if missing, grants and policies are re-issued
-- (policies dropped and created by name).
--
-- ROLLBACK (by hand; nothing else depends on these):
--   revoke all on all tables in schema public from content_recheck;
--   drop policy ... (each "recheck_*" policy below);
--   drop owned by content_recheck; drop role content_recheck;  -- after
--     dropping or reassigning the LOGIN user that is a member of it
--   drop table exec_check_runs; drop table exec_checks;
-- The app tolerates exec_checks being absent only by holding back the
-- lessons that carry a program (fail closed), so roll back the code first.

set local lock_timeout = '5s';

create table if not exists exec_checks (
    item_kind varchar(20) not null check (item_kind in ('lesson', 'review', 'exam', 'quiz', 'comparison')),
    item_id text not null check (length(item_id) between 1 and 300),
    objective_id uuid references objectives(id) on delete cascade,
    question text not null,
    language varchar(20) not null check (language in ('python', 'javascript')),
    code text not null check (length(code) between 1 and 4000),
    -- what the program must print: the key, as the writer stated it
    expected text not null check (length(expected) between 1 and 500),
    created_at timestamptz not null default now(),
    primary key (item_kind, item_id)
);
create index if not exists idx_exec_checks_created on exec_checks (created_at);

create table if not exists exec_check_runs (
    id uuid primary key default uuid_generate_v4(),
    item_kind varchar(20) not null,
    item_id text not null,
    outcome varchar(10) not null check (outcome in ('passed', 'failed', 'error')),
    detail text not null default '' check (length(detail) <= 500),
    runner text not null default '' check (length(runner) <= 120),
    ran_at timestamptz not null default now(),
    foreign key (item_kind, item_id) references exec_checks (item_kind, item_id) on delete cascade
);
create index if not exists idx_exec_check_runs_item on exec_check_runs (item_kind, item_id, ran_at desc);

alter table exec_checks enable row level security;
alter table exec_check_runs enable row level security;
-- 026/052 revoke the Supabase API roles from every table; these are new.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on exec_checks, exec_check_runs from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on exec_checks, exec_check_runs from authenticated';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'content_recheck') then
    create role content_recheck nologin nocreatedb nocreaterole;
  end if;
end $$;

grant usage on schema public to content_recheck;

-- Read: the shared content and the catalog context the checker's prompt uses.
grant select on
    lesson_content, review_items, coach_quiz_items, exam_items, discrimination_items,
    concept_set_members, objectives, course_units, subject_tracks,
    education_subcategories, education_categories, credential_exams, credentials,
    credential_providers, item_status, item_holdbacks, exec_checks, exec_check_runs
  to content_recheck;
-- A learner's regenerated lesson, without whose it is.
grant select (objective_id, fade_problem, fade_choices, fade_correct_index, solo_check, solo_choices,
              solo_correct_index, model, generated_at)
  on lesson_content_overrides to content_recheck;

-- Write: staging only.
grant insert on item_holdbacks, exec_check_runs to content_recheck;

do $$
declare
  t text;
begin
  foreach t in array array[
    'lesson_content', 'lesson_content_overrides', 'review_items', 'coach_quiz_items', 'exam_items',
    'discrimination_items', 'concept_set_members', 'objectives', 'course_units',
    'education_subcategories', 'education_categories', 'credential_exams', 'credentials',
    'credential_providers', 'item_status', 'item_holdbacks', 'exec_checks', 'exec_check_runs'
  ] loop
    execute format('drop policy if exists recheck_read on %I', t);
    execute format('create policy recheck_read on %I for select to content_recheck using (true)', t);
  end loop;
end $$;

drop policy if exists recheck_read on subject_tracks;
create policy recheck_read on subject_tracks for select to content_recheck using (user_id is null);

drop policy if exists recheck_stage on item_holdbacks;
create policy recheck_stage on item_holdbacks for insert to content_recheck with check (true);
drop policy if exists recheck_stage on exec_check_runs;
create policy recheck_stage on exec_check_runs for insert to content_recheck with check (true);
