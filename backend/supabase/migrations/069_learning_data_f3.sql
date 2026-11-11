-- REQ-204 (batch F3, learning-data correctness). Number 069 assigned by the lead.
--
-- WHAT IS ADDED
--   1. item_holdbacks.scope_user_id (FAIL-882). A held-back lesson used to
--      start a six hour cooldown for the whole objective, whoever's request
--      produced it, so one learner's failed regenerate locked every learner
--      out. A holdback from a learner's own regenerate now carries that
--      learner's id; the cooldown reads it (lib/lesson-generation.ts
--      recentlyHeldBack). Null means a shared (first) generation, which is
--      what every row written before this migration was.
--      On delete cascade: the row is generated content logged for review, not
--      learner input, so it goes with the account. The column is not named
--      user_id on purpose: lib/integration-guard.dbtest.ts treats every
--      user_id table as learner data to export or exclude, and this is
--      neither. The partial index leads with the column (FAIL-393: account
--      deletion otherwise scans the table per row).
--   2. review_schedule_enrol() no longer enrols a retired objective (FAIL-890).
--      Any writer of mastery (a recompute, an old attempt voided and
--      recounted) could put a retired objective into a learner's review
--      schedule. The readers filter retired objectives, so it did no harm
--      there, but the row sat in the schedule and came back if the objective
--      was un-retired. Same rule as lib/progress-sql.ts isActive(): retired
--      once retired_at has passed, on the objective or its unit.
--
-- LOCKING. lock_timeout 5 s like 067. ADD COLUMN with no default is a catalog
-- change; the foreign key takes a brief SHARE ROW EXCLUSIVE lock on app_users
-- and validates against an empty column. The index is on a small table (one
-- row per held-back generation). CREATE OR REPLACE FUNCTION takes no table
-- lock.
--
-- ROLLBACK. The previous backend never names scope_user_id and keeps working
-- on this schema; it applies the cooldown per objective, as before. The old
-- trigger body is 037_review_loop.sql's.
--
-- Safe to run twice: IF NOT EXISTS and CREATE OR REPLACE.

set local lock_timeout = '5s';

-- 1. Holdback scope --------------------------------------------------------------------

alter table item_holdbacks add column if not exists scope_user_id uuid references app_users(id) on delete cascade;
comment on column item_holdbacks.scope_user_id is
  'REQ-204: the learner whose own regenerate was held back; null for a shared (first) generation. The six hour cooldown reads it.';
create index if not exists idx_item_holdbacks_scope_user on item_holdbacks (scope_user_id) where scope_user_id is not null;

-- 2. Enrolment skips retired objectives ------------------------------------------------

create or replace function review_schedule_enrol() returns trigger language plpgsql as $$
begin
  if new.user_id is not null and new.objective_id is not null
     and new.status in ('Guided', 'Independent', 'Transfer-ready')
     and exists (select 1 from objectives o join course_units cu on cu.id = o.unit_id
                  where o.id = new.objective_id
                    and (o.retired_at is null or o.retired_at > now())
                    and (cu.retired_at is null or cu.retired_at > now())) then
    insert into review_schedule (user_id, objective_id, due_on)
    values (new.user_id, new.objective_id, (now() at time zone 'UTC')::date + 1)
    on conflict (user_id, objective_id) do nothing;
  end if;
  return new;
end $$;
