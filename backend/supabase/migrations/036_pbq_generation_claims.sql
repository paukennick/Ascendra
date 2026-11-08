-- REQ-107: PBQ scenarios per learner.
--
-- GET /api/pbq?unitId= now serves a scenario the learner has not attempted,
-- and generates one only when every visible scenario for the unit has been
-- attempted. Generating takes several seconds, so two requests from the same
-- learner for the same unit (a double tap, two devices, a retry after a slow
-- response) would both find nothing unseen and both generate. This table is
-- a short-lived lease, one row per (learner, unit), taken before generating:
-- the holder generates, everyone else waits for it to be released and then
-- serves what it stored. Same shape and rules as lesson_generation_claims
-- (migration 027c): takeover only after the lease expires, heartbeat while
-- generating, release by the holder's own token.
--
-- A database lease rather than pg_advisory_xact_lock because the model call
-- runs outside any transaction: holding a transaction (and a pooled
-- connection) open across it would trip idle_in_transaction_session_timeout
-- and let five waiting requests exhaust the five-connection pool.
--
-- Additive only. lib/schema-status.ts probes the table.

create table if not exists pbq_generation_claims (
    user_id uuid not null references app_users(id) on delete cascade,
    unit_id uuid not null references course_units(id) on delete cascade,
    claim_token uuid not null,
    claimed_at timestamptz not null default now(),
    primary key (user_id, unit_id)
);
