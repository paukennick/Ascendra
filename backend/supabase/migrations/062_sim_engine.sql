-- REQ-190 (docs/sims.md 6, Phase 1b): the sim engine's tables. Number 062 is
-- reserved for the sim engine (the design said "the next free number").
--
-- WHAT IS ADDED
--   1. attempt_kind 'simtask' and one assessment_types row, sim_run
--      (format family 'simulation', weight 1.5, application level, not
--      unit-wide; docs/sims.md 9.4). A finished run is ONE attempt on the
--      scenario's objective, format 'open' so mastery_detail()'s direct
--      branch reads it. The mastery rule (045) is not restated or changed.
--   2. sims          one row per scenario identity (objective, slug).
--   3. sim_versions  one row per content version (content hash); runs pin one.
--   4. sim_reviews   the review trail. Review is internal and never a gate
--                    (Nick, 2026-11-09, docs/sims.md 19.4 item 5).
--   5. sim_runs      one learner's pass: seed, lease, checkpoint, result.
--   6. sim_run_commands   the append-only command log the server replays.
--   7. sim_run_reasoning  one graded written-reasoning answer per moment.
--   8. attempts.sim_id (no foreign key, as 050's lab_id, FAIL-480/481) and
--      the check attempts_simtask_shape, comparing kind::text because the
--      enum value cannot be used in the transaction that adds it (050).
--   9. RLS on every new table (052 requires it on every public table).
--
-- NOT ADDED HERE (left for a later migration, docs/sims.md 6): the 'sim'
-- item kind for item_flags / item_status / item_holdbacks ("Report a
-- problem" on a sim) and the sim_version_daily metrics view.
--
-- LOCKING. lock_timeout 5 s like 050. ALTER TYPE ... ADD VALUE is
-- catalog-only. One row in assessment_types. New tables are empty. One
-- nullable column without a default on attempts (catalog only); its check is
-- NOT VALID (no scan). The partial index on attempts (user_id, sim_id) is
-- built inside the transaction; on a large attempts table build it
-- CONCURRENTLY first (docs/deploy-runbook-integration.md, row 062), and the
-- IF NOT EXISTS here then skips it.
--
-- ROLLBACK (docs/sims.md 6.1). Switch off and leave the schema: set
-- SIMS_ENABLED off (the default); nothing then reads these tables, so the
-- previous backend runs unchanged on this schema. The enum value 'simtask'
-- cannot be dropped in Postgres. A full removal, if ever needed, is a
-- forward migration that first confirms no 'simtask' attempt exists (or
-- voids them), then:
--   alter table attempts drop constraint if exists attempts_simtask_shape;
--   drop index if exists idx_attempts_user_sim;
--   alter table attempts drop column if exists sim_id;
--   drop table if exists sim_run_reasoning, sim_run_commands, sim_runs,
--     sim_reviews, sim_versions, sims cascade;
--   delete from assessment_types where type_name = 'sim_run';
-- and leaves the enum value.
--
-- A later quiet moment can run:
--   alter table attempts validate constraint attempts_simtask_shape;
--
-- Safe to run twice: IF NOT EXISTS / ON CONFLICT DO NOTHING / guarded DO blocks.

set local lock_timeout = '5s';

-- 1. Kind and assessment type ----------------------------------------------------------

alter type attempt_kind add value if not exists 'simtask';

insert into assessment_types (type_name, format_family, cognitive_weight, application_level, unit_scope, note) values
  ('sim_run', 'simulation', 1.5, true, false,
   'REQ-190 sim run: one finished run of an interactive simulation, rated Good / Mediocre / Bad from the outcome class and the process score (docs/sims.md 9.2). Counts only on the scenario''s objective. Same weight as a PBQ or a lab; its own format family, so a lab and a sim are two families.')
on conflict (type_name) do nothing;

-- 2. sims ------------------------------------------------------------------------------

create table if not exists sims (
    id uuid primary key default uuid_generate_v4(),
    objective_id uuid not null references objectives(id) on delete cascade,
    slug varchar(80) not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
    -- Derived by the seed from the objective's course category (the labs
    -- rule), never read from the document.
    safety_family varchar(10) not null check (safety_family in ('clinical', 'fitness', 'general')),
    screen_type varchar(40) not null,
    title varchar(200) not null,
    -- The version matching the current seed file (set after insert).
    head_version_id uuid,
    retired_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (objective_id, slug)
);
create index if not exists idx_sims_objective on sims (objective_id) where retired_at is null;

-- 3. sim_versions ----------------------------------------------------------------------

create table if not exists sim_versions (
    id uuid primary key default uuid_generate_v4(),
    sim_id uuid not null references sims(id) on delete cascade,
    version int not null check (version >= 1),
    schema_version int not null,
    engine_major int not null,
    engine_minor int not null,
    renderer_level int not null default 1,
    -- Runtime and learner-facing content only; golden paths stay in the repo.
    document jsonb not null check (jsonb_typeof(document) = 'object'),
    -- What the app receives: no scoring, no reasoning rubric, no source dates.
    client_document jsonb not null check (jsonb_typeof(client_document) = 'object'),
    content_hash char(64) not null,
    client_hash char(64) not null,
    sources_recheck_by date,
    source varchar(10) not null default 'authored' check (source in ('authored', 'generated')),
    review_status varchar(24) not null default 'needs_expert_review'
        check (review_status in ('needs_expert_review', 'approved', 'rejected')),
    reviewed_by text,
    reviewer_credential text,
    reviewed_at timestamptz,
    review_note text,
    model text,
    created_at timestamptz not null default now(),
    unique (sim_id, version),
    unique (sim_id, content_hash)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sims_head_version_fk' and conrelid = 'sims'::regclass) then
    alter table sims add constraint sims_head_version_fk
      foreign key (head_version_id) references sim_versions(id) on delete set null;
  end if;
end $$;
create index if not exists idx_sims_head_version on sims (head_version_id) where head_version_id is not null;

-- 4. sim_reviews -----------------------------------------------------------------------

create table if not exists sim_reviews (
    id uuid primary key default uuid_generate_v4(),
    sim_version_id uuid not null references sim_versions(id) on delete cascade,
    reviewer text not null,
    credential text,
    decision varchar(10) not null check (decision in ('approve', 'reject')),
    checklist jsonb not null default '{}'::jsonb,
    note text,
    created_at timestamptz not null default now()
);
create index if not exists idx_sim_reviews_version on sim_reviews (sim_version_id, created_at);

-- 5. sim_runs --------------------------------------------------------------------------

create table if not exists sim_runs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    sim_id uuid not null references sims(id) on delete cascade,
    sim_version_id uuid not null references sim_versions(id) on delete cascade,
    -- A uint32 (the engine's seed), so bigint.
    seed bigint not null check (seed between 0 and 4294967295),
    engine_version varchar(16) not null,
    started_at timestamptz not null default now(),
    status varchar(10) not null default 'open' check (status in ('open', 'ended', 'abandoned')),
    lease_epoch int not null default 1,
    lease_device varchar(100),
    last_seq int not null default 0,
    -- The highest tick any accepted sync reached (commands or heartbeat).
    last_tick int not null default 0,
    last_sync_at timestamptz,
    realtime_ticks int not null default 0,
    skipped_ticks int not null default 0,
    offline_ticks int not null default 0,
    paused_ms bigint not null default 0,
    -- The learner acted, or anything was revealed (docs/sims.md 9.4): a later
    -- run of the same sim is then a repeat.
    revealed boolean not null default false,
    -- Pre(k) at a command boundary (docs/sims.md 5.3).
    checkpoint_tick int,
    checkpoint_state jsonb,
    state_hash char(16),
    ending_id varchar(48),
    outcome_class varchar(10) check (outcome_class in ('target', 'recovered', 'harm')),
    rating varchar(10) check (rating in ('good', 'mediocre', 'bad')),
    ended_at timestamptz,
    -- The debrief: criteria, KPIs, process score, timeline (server-built).
    score jsonb,
    attempt_id uuid references attempts(id) on delete set null,
    desyncs int not null default 0,
    engine_errors int not null default 0
);
create index if not exists idx_sim_runs_user_sim on sim_runs (user_id, sim_id, started_at);
create unique index if not exists sim_runs_one_open on sim_runs (user_id, sim_id) where status = 'open';
create index if not exists idx_sim_runs_attempt on sim_runs (attempt_id) where attempt_id is not null;
create index if not exists idx_sim_runs_sim on sim_runs (sim_id);
create index if not exists idx_sim_runs_version on sim_runs (sim_version_id);

-- 6. sim_run_commands ------------------------------------------------------------------

create table if not exists sim_run_commands (
    run_id uuid not null references sim_runs(id) on delete cascade,
    seq int not null check (seq >= 1),
    tick int not null check (tick >= 0),
    type varchar(10) not null check (type in ('act', 'choose', 'skip', 'pause', 'resume', 'reason', 'end')),
    -- The whole command as the engine reads it.
    payload jsonb not null check (jsonb_typeof(payload) = 'object'),
    lease_epoch int not null,
    received_at timestamptz not null default now(),
    primary key (run_id, seq)
);

-- 7. sim_run_reasoning -----------------------------------------------------------------

create table if not exists sim_run_reasoning (
    run_id uuid not null references sim_runs(id) on delete cascade,
    moment_id varchar(48) not null,
    user_id uuid not null references app_users(id) on delete cascade,
    opened_tick int not null,
    opened_seq int not null,
    client_attempt_id varchar(100),
    answer text not null,
    status varchar(16) not null check (status in ('graded', 'skipped', 'grader_failed')),
    verdict attempt_verdict,
    feedback text,
    part_scores jsonb,
    missed_parts jsonb,
    classification text,
    fix_next text,
    created_at timestamptz not null default now(),
    primary key (run_id, moment_id)
);
create index if not exists idx_sim_run_reasoning_user on sim_run_reasoning (user_id, created_at);
create unique index if not exists sim_run_reasoning_client_attempt
    on sim_run_reasoning (user_id, client_attempt_id) where client_attempt_id is not null;

-- 8. attempts.sim_id -------------------------------------------------------------------

-- No foreign key, for the reasons 050 gives for lab_id (FAIL-480, FAIL-481).
-- Written only by lib/sims.ts finishRun, inside the transaction that reads
-- the sim; recordAttemptTx refuses a 'simtask' answer without its sim and
-- objective.
alter table attempts add column if not exists sim_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attempts_simtask_shape' and conrelid = 'attempts'::regclass) then
    alter table attempts add constraint attempts_simtask_shape check (
      (kind::text <> 'simtask' and sim_id is null)
      or (kind::text = 'simtask' and assessment_type = 'sim_run' and format = 'open')
    ) not valid;
  end if;
end $$;
create index if not exists idx_attempts_user_sim on attempts (user_id, sim_id) where sim_id is not null;

-- 9. RLS (as 026 / 052) ----------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['sims', 'sim_versions', 'sim_reviews', 'sim_runs', 'sim_run_commands', 'sim_run_reasoning'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on sims, sim_versions, sim_reviews, sim_runs, sim_run_commands, sim_run_reasoning from anon, authenticated;
  end if;
end $$;
