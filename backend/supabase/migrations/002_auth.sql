-- Auth: password login, sessions/refresh tokens, email verification, password
-- reset, and a generic auth-event log used for rate limiting/lockout.
-- Run this whole file once in the Supabase SQL editor, the same way as
-- 001_init.sql. Additive only -- the existing seeded app_users row and every
-- existing table/view/index are untouched.
--
-- MFA (TOTP/email codes/backup codes/login_challenges) and OAuth
-- (oauth_accounts) are deliberately left for a follow-up migration; this file
-- only adds what password-based auth needs.

alter table app_users
    add column if not exists password_hash text,
    add column if not exists email_verified_at timestamptz,
    add column if not exists failed_login_count int not null default 0,
    add column if not exists locked_until timestamptz,
    add column if not exists last_login_at timestamptz;

-- ---------------------------------------------------------------------------
-- Email verification links, sent at registration. token_hash is sha256 of the
-- raw token -- the raw value only ever exists in the emailed link, never
-- stored.
-- ---------------------------------------------------------------------------
create table if not exists email_verification_tokens (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    token_hash text not null unique,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz default now()
);
create index if not exists idx_evt_user on email_verification_tokens(user_id);

-- ---------------------------------------------------------------------------
-- Password reset links. Same token_hash convention as above.
-- ---------------------------------------------------------------------------
create table if not exists password_reset_tokens (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    token_hash text not null unique,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    requested_ip varchar(64),
    created_at timestamptz default now()
);
create index if not exists idx_prt_user on password_reset_tokens(user_id);

-- ---------------------------------------------------------------------------
-- Refresh tokens double as the session/device table -- one row per logged-in
-- device. Only token_hash (sha256 of the opaque random refresh token) is
-- stored, never the raw value. Rotated on every /api/auth/refresh call:
-- the old row is marked revoked_at + replaced_by_id, a new row (same
-- family_id) is inserted. Presenting an already-revoked token is a reuse/
-- theft signal -- the caller should revoke every row in that family.
-- ---------------------------------------------------------------------------
create table if not exists refresh_tokens (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    family_id uuid not null,
    token_hash text not null unique,
    replaced_by_id uuid references refresh_tokens(id) on delete set null,
    device_label varchar(255),
    user_agent text,
    ip varchar(64),
    created_at timestamptz default now(),
    last_used_at timestamptz default now(),
    expires_at timestamptz not null,
    revoked_at timestamptz
);
create index if not exists idx_rt_user on refresh_tokens(user_id);
create index if not exists idx_rt_family on refresh_tokens(family_id);

-- ---------------------------------------------------------------------------
-- Generic auth audit log. Register attempts, login successes/failures,
-- password-reset requests, etc. each write one row here. Rate limiting reads
-- this table (count of rows for an event_type + identifier in a time window)
-- instead of needing a separate cache/Redis layer.
-- ---------------------------------------------------------------------------
create table if not exists auth_events (
    id uuid primary key default uuid_generate_v4(),
    event_type varchar(50) not null,
    identifier varchar(255) not null,
    user_id uuid references app_users(id) on delete set null,
    ip varchar(64),
    created_at timestamptz default now()
);
create index if not exists idx_auth_events_lookup on auth_events(event_type, identifier, created_at);
