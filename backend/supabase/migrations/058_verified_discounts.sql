-- REQ-166: verified group discounts (military and veterans, first
-- responders, nurses, students; teachers configurable and off by default).
-- A learner proves they belong to a group with a third-party verification
-- provider (lib/discount-providers.ts); the published discount for that group
-- (lib/verified-discounts-config.ts) is then applied at checkout. Built and
-- off: nothing reads these tables unless BILLING_ENABLED and
-- VERIFIED_DISCOUNTS_ENABLED are on and a provider is configured.
--
-- 1. verified_discounts: ONLY the result of a verification -- which account,
--    which group, which provider, when, until when, and the provider's
--    opaque subject id (so one provider identity cannot be spread over many
--    Ascendra accounts). No documents, names, dates of birth, service or
--    licence numbers, or anything else the provider saw. One live row per
--    account and group; verifying again refreshes it. Deleted with the
--    account (on delete cascade) and in the account export.
-- 2. discount_offer_codes: the pool of App Store one-time offer codes Nick
--    uploads (npm run discounts:codes). A code is handed to at most one
--    verified learner (issued_to). Deleting that learner's account clears the
--    link (on delete set null) but keeps the code marked issued, so it is
--    never handed out twice. Issued codes are in the learner's export.
--
-- Purely additive: two new tables, nothing existing is altered. Safe to run
-- twice.

set local lock_timeout = '5s';

create table if not exists verified_discounts (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    -- a group id from lib/verified-discounts-config.ts (military, responder,
    -- nurse, student, teacher); the check keeps it to a plain identifier so a
    -- new group needs no migration
    group_id text not null check (group_id ~ '^[a-z][a-z0-9_]{1,39}$'),
    provider text not null check (provider ~ '^[a-z][a-z0-9_]{1,39}$'),
    -- the provider's opaque, stable id for the person (not an email or name)
    provider_subject text not null check (length(provider_subject) between 1 and 200),
    verified_at timestamptz not null default now(),
    expires_at timestamptz not null,
    updated_at timestamptz not null default now(),
    check (expires_at > verified_at)
);

-- One row per account and group: verifying again updates it.
create unique index if not exists verified_discounts_user_group_unique on verified_discounts (user_id, group_id);
-- One Ascendra account per provider identity and group.
create unique index if not exists verified_discounts_subject_unique on verified_discounts (provider, provider_subject, group_id);

create table if not exists discount_offer_codes (
    id uuid primary key default uuid_generate_v4(),
    store text not null check (store in ('app_store')),
    group_id text not null check (group_id ~ '^[a-z][a-z0-9_]{1,39}$'),
    -- the store product the offer belongs to, e.g. ascendra.pro.yearly
    product_id text not null check (length(product_id) between 1 and 200),
    code text not null check (length(code) between 1 and 64),
    -- when the store stops accepting the code (Apple: at most six months)
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    issued_to uuid references app_users(id) on delete set null,
    issued_at timestamptz,
    -- issued_to is set together with issued_at; after the learner's account
    -- is deleted issued_to is null and issued_at stays (the code is spent)
    check (issued_to is null or issued_at is not null)
);

create unique index if not exists discount_offer_codes_code_unique on discount_offer_codes (store, code);
-- FAIL-393 rule: an index led by each new foreign key's column.
create index if not exists discount_offer_codes_issued_to_idx on discount_offer_codes (issued_to) where issued_to is not null;
-- Finding the next free code for a group and product.
create index if not exists discount_offer_codes_free_idx on discount_offer_codes (store, group_id, product_id, expires_at) where issued_at is null;

-- Supabase Data API lock-out, as 026, 052 and 056 did for every table.
alter table verified_discounts enable row level security;
alter table discount_offer_codes enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on verified_discounts, discount_offer_codes from anon, authenticated;
  end if;
end $$;
