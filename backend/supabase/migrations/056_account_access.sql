-- REQ-144: unrestricted access. The owner (OWNER_EMAILS, a server setting,
-- not a row here) can give selected people unrestricted access: every plan
-- feature, no plan allowances, the AI safety ceiling instead of the daily
-- budget, and early access to switched-off features (lib/account-access.ts).
--
-- 1. account_access: one row per grant. Given to an email address. user_id
--    is the account it applies to: set at once when a verified account has
--    that address, otherwise null (pending) until an account with that
--    address is verified, when it is bound to that account for good (a later
--    email change does not move it). A grant ends at expires_at (null = no
--    end) or when revoked. Only 'unrestricted' exists; owners are never
--    stored, so they cannot be removed from the app.
-- 2. account_access_events: the audit trail -- who granted, changed,
--    revoked or claimed what and when, and when an unrestricted account hit
--    the AI safety ceiling. In the affected learner's account export.
--
-- Deleting an account deletes its grants and their events (on delete
-- cascade, like every other per-learner table). The granting owner is kept
-- as a nullable link (on delete set null).
--
-- Purely additive: two new tables, nothing existing is altered. Independent
-- of 055 (feature/content-currency): either order applies cleanly. Safe to
-- run twice.

set local lock_timeout = '5s';

create table if not exists account_access (
    id uuid primary key default uuid_generate_v4(),
    -- the address it was given to, lowercased
    email text not null check (email = lower(email) and length(email) between 3 and 320),
    user_id uuid references app_users(id) on delete cascade,
    level text not null default 'unrestricted' check (level in ('unrestricted')),
    granted_by uuid references app_users(id) on delete set null,
    granted_at timestamptz not null default now(),
    expires_at timestamptz,
    note text check (note is null or length(note) <= 500),
    -- when a pending grant was bound to the account that verified the address
    claimed_at timestamptz,
    revoked_at timestamptz,
    revoked_by uuid references app_users(id) on delete set null,
    updated_at timestamptz not null default now()
);

-- One live (not revoked) grant per address: granting again updates it.
create unique index if not exists account_access_live_email_unique on account_access (email) where revoked_at is null;
-- FAIL-393 rule: an index led by each new foreign key's column.
create index if not exists account_access_user_idx on account_access (user_id) where user_id is not null;
create index if not exists account_access_granted_by_idx on account_access (granted_by) where granted_by is not null;
create index if not exists account_access_revoked_by_idx on account_access (revoked_by) where revoked_by is not null;

create table if not exists account_access_events (
    id bigint generated always as identity primary key,
    access_id uuid references account_access(id) on delete cascade,
    -- the affected account, once known (a pending grant's events are bound
    -- with it when it is claimed)
    user_id uuid references app_users(id) on delete cascade,
    email text not null,
    action text not null check (action in ('grant', 'change', 'revoke', 'claim', 'ceiling_reached')),
    -- who did it: an owner's account (the app), or null with via = 'cli'
    actor_id uuid references app_users(id) on delete set null,
    via text not null check (via in ('app', 'cli', 'system')),
    detail jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists account_access_events_access_idx on account_access_events (access_id) where access_id is not null;
create index if not exists account_access_events_user_idx on account_access_events (user_id, created_at) where user_id is not null;
create index if not exists account_access_events_actor_idx on account_access_events (actor_id) where actor_id is not null;

-- Supabase Data API lock-out, as 026 and 052 did for every table before.
alter table account_access enable row level security;
alter table account_access_events enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on account_access, account_access_events from anon, authenticated;
    revoke all on sequence account_access_events_id_seq from anon, authenticated;
  end if;
end $$;
