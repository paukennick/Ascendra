-- REQ-262 (levels phase 2, part 2; Nick 2026-11-12 and 2026-11-13): the
-- "Explain first / Example first" lesson order, as a comfort setting AND an
-- A/B test that is on from day one (there are no learners yet).
--
-- learner_teach_order: one row per learner.
--   assigned_order  the arm the learner was randomly given the first time a
--                   lesson asked, 'explain_first' or 'example_first'. Never
--                   changes afterwards, so analysis can always ask "what was
--                   this learner assigned" (intent to treat).
--   teach_order     the order in effect now. Equal to assigned_order until the
--                   learner chooses one in Settings.
--   chosen_at       null while the learner has not chosen; set (and the
--                   choice written to teach_order) when they do, so analysis
--                   can tell an assigned order from a chosen one. A learner
--                   who picks the order they were assigned still counts as
--                   having chosen.
--   assigned_at     when the row was created.
-- The lesson reorders cards it already has (the worked example moves to the
-- front); nothing about the content, the solo check or the mastery rules
-- changes. Lesson events carry the order and whether it was assigned or
-- chosen (learner_events.detail keys `order` and `order_source`, built by
-- lib/learner-level-rules.ts lessonEventDetail); no new event name, so
-- learner_events' checks are untouched.
--
-- The table is led by user_id (its primary key; FAIL-393), deleted with the
-- account (on delete cascade), in the account export (lib/account-export.ts)
-- and in docs/legal/data-inventory.md. Randomness is per learner, not per
-- course: one order for every course.
--
-- ORDER. Apply BEFORE the backend that reads it: GET /api/account/teach-order
-- and the lesson screen read and write the table, and /api/health probes it
-- (lib/schema-status.ts). The code before this migration never reads it; a
-- lesson screen whose request fails shows the standard order.
--
-- LOCKING. One new table, no change to an existing one; no lock_timeout
-- worry beyond the usual 5 s.
--
-- ROLLBACK (deploy the earlier backend first):
--   drop table if exists learner_teach_order;
-- Lesson events already written keep their `order` and `order_source`
-- detail keys; nothing reads them but the results query
-- (docs/teach-order-test.md).
--
-- Safe to run twice: if not exists.

set local lock_timeout = '5s';

create table if not exists learner_teach_order (
    user_id uuid primary key references app_users(id) on delete cascade,
    assigned_order text not null check (assigned_order in ('explain_first', 'example_first')),
    teach_order text not null check (teach_order in ('explain_first', 'example_first')),
    chosen_at timestamptz,
    assigned_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Supabase Data API lock-out, as 026, 052, 060, 077 and 078 did: RLS on,
-- nothing for anon/authenticated. app_runtime_sync() below gives the app's
-- role its policy and grants.
alter table learner_teach_order enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on learner_teach_order from anon, authenticated;
  end if;
end $$;

select app_runtime_sync();
