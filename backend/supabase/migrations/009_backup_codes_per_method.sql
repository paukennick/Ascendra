-- Backup codes become per-method: TOTP and email-code MFA each get their own
-- independently generated/invalidated set of 10, instead of one shared pool
-- for the account. Enabling a method always issues that method's own codes;
-- disabling or regenerating one method's codes never touches the other's.
-- A valid unused code from either method still works at login time (see
-- /api/auth/mfa/verify) -- this only changes how codes are scoped for
-- generation/invalidation, not which ones are accepted while signing in.
-- Existing rows (all issued by the TOTP flow, the only method that existed
-- before 008_email_mfa.sql) backfill as 'totp'. Additive only.

alter table mfa_backup_codes
    add column if not exists method varchar(10) not null default 'totp'
        check (method in ('totp', 'email'));
