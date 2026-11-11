-- REQ-219 (fix batch G4, FAIL-1100..1129): account and security fixes that need
-- a column or a table. Number 075 assigned by the lead.
--
-- WHAT CHANGES
--   1. app_users.totp_last_step (bigint, null): the 30-second step of the last
--      authenticator code accepted for the account. A code is accepted only
--      for a step after it (RFC 6238 section 5.2), so a code that has been
--      typed once -- at sign-in, or to confirm it is you -- cannot be used
--      again inside its window by someone who watched it. Null = no code used
--      yet. Nothing reads it but lib/auth/mfa.ts.
--   2. inbound_email_events: one row per Resend webhook delivery (its
--      `svix-id`), so a replayed delivery of a message already forwarded to
--      the mailbox is answered and dropped, not forwarded twice. A signed
--      delivery stays valid for the signature's timestamp window and Resend
--      retries; without this, either forwards the same message again.
--      No learner data: the id is Svix's, there is no user_id. Rows older than
--      the one-time-token window (7 days, lib/retention.ts) are purged.
--   3. Repairs accounts the two-factor "turn off" race left half done:
--      mfa_enabled = true with neither an authenticator nor email codes. Such an
--      account was offered a sign-in code step that could never be passed.
--      (The routes now decide the last method under a row lock, and sign-in
--      treats the state as off.) Only rows in that exact state are touched.
--
-- WHY IT MATTERS
--   Without 1 a stolen-by-shoulder-surfing code works twice; without 2 a replay
--   forwards a stranger-visible message twice; without 3 the affected learner
--   is still shown "two-factor on" with no way to use it.
--
-- LOCKING. lock_timeout 5 s. Adding a nullable column with no default is a
-- catalog-only change; the repair is a single UPDATE on the few rows in that
-- state (indexed scan not needed: it touches only mfa_enabled rows).
--
-- ROLLBACK. Both objects are additive and unread by the previous backend.
-- Rolling back the code needs nothing here; a full removal is
--   alter table app_users drop column totp_last_step;  drop table inbound_email_events;
-- (the repair in 3 is not reversible and does not need to be).
--
-- Safe to run twice. Ends with app_runtime_sync() (REQ-207).

set local lock_timeout = '5s';

alter table app_users add column if not exists totp_last_step bigint;

create table if not exists inbound_email_events (
  svix_id text primary key check (length(svix_id) between 1 and 256),
  claimed_at timestamptz not null default now(),
  forwarded_at timestamptz
);
create index if not exists idx_inbound_email_events_claimed on inbound_email_events (claimed_at);
alter table inbound_email_events enable row level security;

update app_users
   set mfa_enabled = false
 where mfa_enabled
   and totp_secret_enc is null
   and not email_mfa_enabled;

select app_runtime_sync();
