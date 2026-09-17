-- Email address changes. The new address lives on the token row itself
-- (not a `pending_email` column on app_users) so a stale/abandoned request
-- can't collide with a later one -- confirming just reads whatever address
-- that specific token was issued for. Additive only.

create table if not exists email_change_tokens (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    new_email varchar(255) not null,
    token_hash text not null unique,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz default now()
);
create index if not exists idx_ect_user on email_change_tokens(user_id);
