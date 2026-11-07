-- REQ-116 (audit 3, security): access-token revocation, re-authentication
-- for email change and MFA changes, the email-change cancel link, the
-- pre-registration squatting fix, and indexes for the auth_events purge.
--
-- Additive only: new nullable or defaulted columns (no table rewrite on
-- Postgres 11+, ACCESS EXCLUSIVE for an instant) and two indexes on
-- auth_events. Nothing here touches mastery. Safe to run twice.
--
-- What each object is for (code that reads it in brackets):
--
-- app_users.token_version: every access token carries the version it was
--   signed under; requireUser compares it with one primary-key lookup.
--   Bumped by logout-all, password change and reset, enabling MFA, an email
--   change, and the verification link that clears a squatted password
--   (lib/auth/requireUser.ts, lib/auth/sessionControl.ts). Tokens signed
--   before this migration carry no version and count as 0, so nobody is
--   signed out by the deploy.
-- app_users.totp_pending_reauth_at: when MFA is already on, a new
--   authenticator secret can only be started after re-authentication; the
--   enable step refuses a pending secret that was started without it
--   (app/api/auth/mfa/setup, app/api/auth/mfa/enable).
-- email_change_tokens.cancel_token_hash / token_version / cancelled_at: the
--   old address is alerted when the change is requested, with a link that
--   cancels it; the confirmation re-checks that nothing (cancel, password
--   change, logout-all) happened in between (lib/auth/emailTokens.ts).
-- email_verification_tokens.set_password: a verification link sent because
--   someone tried to register an address that already had an unverified
--   account. Following it clears the password the first registrant chose
--   and hands the inbox owner a set-password link (lib/auth/emailTokens.ts).
-- auth_events indexes: the account-deletion purge (by user id) and the
--   90-day retention purge (by created_at) would otherwise scan the table
--   (lib/auth/retention.ts).

set local lock_timeout = '5s';

alter table app_users add column if not exists token_version integer not null default 0;
alter table app_users add column if not exists totp_pending_reauth_at timestamptz;

alter table email_change_tokens add column if not exists cancel_token_hash text;
alter table email_change_tokens add column if not exists token_version integer;
alter table email_change_tokens add column if not exists cancelled_at timestamptz;
create unique index if not exists email_change_tokens_cancel_hash_unique
  on email_change_tokens (cancel_token_hash) where cancel_token_hash is not null;

alter table email_verification_tokens add column if not exists set_password boolean not null default false;

create index if not exists idx_auth_events_user on auth_events (user_id) where user_id is not null;
create index if not exists idx_auth_events_created on auth_events (created_at);
