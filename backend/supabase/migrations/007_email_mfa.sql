-- Email-code as a second MFA method, alongside the existing TOTP one from
-- 003_mfa_oauth.sql. A user can have either method on, both, or neither --
-- app_users.mfa_enabled (already read by /api/auth/login to decide whether
-- to issue a login_challenges row at all) now means "at least one method is
-- on" and is kept in sync by both methods' enable/disable routes rather than
-- being TOTP-only. Additive only.

alter table app_users
    add column if not exists email_mfa_enabled boolean not null default false,
    -- Same pending/prove-then-commit shape as totp_pending_secret_enc: set by
    -- /api/auth/mfa/email/setup, cleared by /api/auth/mfa/email/enable once a
    -- code sent to the user's own inbox is proven, or left to expire.
    add column if not exists email_mfa_pending_code_hash text,
    add column if not exists email_mfa_pending_expires_at timestamptz;

-- The code itself lives on the login_challenges row it was issued for (one
-- login attempt, one code), not a separate table -- mirrors how a TOTP code
-- never needed its own storage here either. Only a bcrypt hash is stored,
-- same convention as mfa_backup_codes.code_hash.
alter table login_challenges
    add column if not exists email_code_hash text,
    add column if not exists email_code_expires_at timestamptz;
