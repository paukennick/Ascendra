-- Turning off the LAST remaining MFA method (the point at which the account
-- drops back to password-only) now needs an emailed confirmation code in
-- addition to the password /api/auth/mfa/disable and
-- /api/auth/mfa/email/disable already required -- a stolen, already-unlocked
-- device plus a phished password shouldn't be enough on its own to strip
-- 2FA off the account. Turning off one method while the other stays on does
-- NOT need this (the account still has 2FA either way), so this is
-- deliberately separate from, and narrower than, mfa_enabled itself.
-- Same pending/prove-then-commit shape as the other *_pending_* columns.
-- Additive only.

alter table app_users
    add column if not exists mfa_disable_confirmation_code_hash text,
    add column if not exists mfa_disable_confirmation_expires_at timestamptz,
    -- Which method the issued code authorizes disabling -- a code requested
    -- while turning off TOTP can't be replayed to turn off email MFA instead.
    add column if not exists mfa_disable_confirmation_method varchar(10)
        check (mfa_disable_confirmation_method in ('totp', 'email'));
