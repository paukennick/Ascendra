-- MFA (TOTP + backup codes) and OAuth account linking, exactly what
-- 002_auth.sql's header comment deliberately deferred. Run this whole file
-- once in the Supabase SQL editor, same as the previous two. Additive only.

alter table app_users
    add column if not exists mfa_enabled boolean not null default false,
    -- Confirmed, active secret -- only set once the user has proven they can
    -- generate a valid code from it (see /api/auth/mfa/enable). Encrypted at
    -- rest with AES-256-GCM (see lib/auth/crypto.ts) since, unlike a
    -- password, this can't just be hashed -- verification needs the raw
    -- secret back.
    add column if not exists totp_secret_enc text,
    -- Set by /api/auth/mfa/setup, cleared by /api/auth/mfa/enable (moved into
    -- totp_secret_enc) or left to expire -- lets a user re-scan a QR code
    -- without ever landing in a half-enabled state.
    add column if not exists totp_pending_secret_enc text,
    add column if not exists totp_pending_expires_at timestamptz;

-- ---------------------------------------------------------------------------
-- One-time backup codes, issued 10 at a time whenever MFA is enabled or
-- regenerated. Only a bcrypt hash of each code is ever stored -- same
-- pattern as app_users.password_hash. Each row is consumed (used_at set)
-- at most once.
-- ---------------------------------------------------------------------------
create table if not exists mfa_backup_codes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    code_hash text not null,
    used_at timestamptz,
    created_at timestamptz default now()
);
create index if not exists idx_mfa_backup_codes_user on mfa_backup_codes(user_id);

-- ---------------------------------------------------------------------------
-- Bridges the two-step MFA login flow: /api/auth/login verifies the password
-- and, if mfa_enabled, inserts one of these instead of issuing tokens
-- directly. The raw challenge_token goes to the client; only its sha256 hash
-- is stored, same convention as refresh_tokens/email_verification_tokens.
-- /api/auth/mfa/verify trades a valid (unexpired, unconsumed) challenge plus
-- a correct TOTP or backup code for real access+refresh tokens.
-- ---------------------------------------------------------------------------
create table if not exists login_challenges (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    challenge_token_hash text not null unique,
    device_label varchar(255),
    user_agent text,
    ip varchar(64),
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz default now()
);
create index if not exists idx_login_challenges_user on login_challenges(user_id);

-- ---------------------------------------------------------------------------
-- Links a third-party identity (Google, ...) to an app_users row. A user can
-- have both a password and one or more oauth_accounts rows -- signing in
-- with Google when an account with that email already exists (password or
-- another provider) links to the existing row rather than creating a
-- duplicate, as long as the provider confirms the email is verified.
-- ---------------------------------------------------------------------------
create table if not exists oauth_accounts (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    provider varchar(50) not null,
    provider_account_id varchar(255) not null,
    email varchar(255),
    created_at timestamptz default now(),
    unique (provider, provider_account_id)
);
create index if not exists idx_oauth_accounts_user on oauth_accounts(user_id);
