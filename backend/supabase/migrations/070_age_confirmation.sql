-- REQ-205 (Nick, 2026-11-09): the minimum age to create an account is 16. Sign-up
-- (email and first-time Google) asks for a neutral "I am 16 or older"
-- confirmation, the server refuses a sign-up without it, and this records it.
-- No date of birth is collected or stored.
--
-- age_confirmed_at   when the person confirmed, at account creation.
-- age_confirmed_min  the minimum age they confirmed (16), so a later change of
--                    the minimum can tell who confirmed what.
--
-- Both are null for accounts made before this release: they were not asked.
-- They agree to the Terms (which now state the minimum) in the one combined
-- re-accept, and that agreement is recorded in legal_acceptances.
--
-- Nullable, no default: catalog-only change, no table rewrite, nothing
-- backfilled. Apply BEFORE the backend deploy: sign-up and the export read the
-- columns and /api/health probes them. Safe to run twice. Down:
-- `alter table app_users drop column if exists age_confirmed_at, drop column
-- if exists age_confirmed_min;` (the old code ignores them).

set local lock_timeout = '5s';

alter table app_users add column if not exists age_confirmed_at timestamptz;
alter table app_users add column if not exists age_confirmed_min smallint;

comment on column app_users.age_confirmed_at is
  'REQ-205: when the person confirmed they are at least age_confirmed_min years old at sign-up. Null for accounts made before 2026-11-10. No date of birth is stored.';
