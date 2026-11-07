-- REQ-122: paid tiers and payments, built but OFF behind BILLING_ENABLED.
--
-- 1. entitlements: what each learner has paid for (or been given). One row
--    per subscription or grant: the tier (plus / pro), where it came from
--    (revenuecat for the App Store and Google Play, stripe for the web, grant
--    for a comp Nick gives by hand), the product and plan, when access ends,
--    and its status. A learner's tier is the highest tier among rows that
--    still give access (lib/entitlements.ts). last_event_at is the provider
--    time of the newest event applied, so an older event that arrives late
--    can never undo a newer one.
-- 2. billing_events: every webhook event received, once. The unique
--    (provider, event_id) makes a redelivered event a no-op. Stores the event
--    type, ids, times and the outcome -- never card details (neither provider
--    sends them) and never the full payload.
-- 3. free_course_choice: the one course a Free learner studies. Set
--    automatically by the first course they open, switchable by them
--    (once a week by default).
-- 4. allowance_uses: one row per counted use of a metered allowance (coach
--    message, lesson regenerate, mock exam, a Free learner's graded typed
--    answer), counted over a rolling window. A use that fails before the
--    model answers is removed again.
--
-- Purely additive: four new tables, nothing existing is altered. While
-- BILLING_ENABLED is off the code never reads or writes them. Safe to run
-- twice.

set local lock_timeout = '5s';

-- 1. Entitlements ---------------------------------------------------------------

create table if not exists entitlements (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    tier text not null check (tier in ('plus', 'pro')),
    source text not null check (source in ('revenuecat', 'stripe', 'grant')),
    -- revenuecat: the original transaction id; stripe: the subscription id;
    -- grant: a generated id. Unique per source so a provider's events always
    -- land on the same row.
    external_id text not null,
    product_id text,
    -- monthly / quarterly / yearly, or null (a grant, or an unknown product)
    plan text check (plan is null or plan in ('monthly', 'quarterly', 'yearly')),
    -- active: renewing. canceled: auto-renew off, access to period_end.
    -- billing_issue: a payment failed, access to period_end while the store
    -- retries. expired / refunded / revoked: no access.
    status text not null check (status in ('active', 'canceled', 'billing_issue', 'expired', 'refunded', 'revoked')),
    -- null = no end (a grant without an expiry)
    period_end timestamptz,
    store text,
    -- stripe: the customer id (refunds and the billing portal find the row by it)
    customer_ref text,
    last_event_at timestamptz,
    last_event_id text,
    -- grants: why (shown to nobody but the operator)
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (source, external_id)
);

-- FAIL-393 rule: an index led by the new foreign key's column.
create index if not exists entitlements_user_idx on entitlements (user_id, status);
create index if not exists entitlements_customer_idx on entitlements (customer_ref) where customer_ref is not null;

-- 2. Billing events log -----------------------------------------------------------

create table if not exists billing_events (
    id bigint generated always as identity primary key,
    provider text not null check (provider in ('revenuecat', 'stripe', 'grant')),
    event_id text not null,
    event_type text not null,
    -- kept (set null) when the account is deleted: the record that a payment
    -- event happened stays for accounting, with no link to the person.
    user_id uuid references app_users(id) on delete set null,
    occurred_at timestamptz,
    received_at timestamptz not null default now(),
    -- applied / stale (older than what is stored) / ignored (an event type we
    -- only log) / unmatched (no learner or row to apply it to)
    outcome text not null,
    detail jsonb not null default '{}'::jsonb,
    unique (provider, event_id)
);

create index if not exists billing_events_user_idx on billing_events (user_id) where user_id is not null;

-- 3. Free course choice --------------------------------------------------------

create table if not exists free_course_choice (
    user_id uuid primary key references app_users(id) on delete cascade,
    track_id uuid not null references subject_tracks(id) on delete cascade,
    -- auto: set by the first course opened (can be switched at once, one time);
    -- learner: chosen in the app (switchable again after the switch interval)
    chosen_by text not null check (chosen_by in ('auto', 'learner')),
    chosen_at timestamptz not null default now()
);

create index if not exists free_course_choice_track_idx on free_course_choice (track_id);

-- 4. Allowance uses ---------------------------------------------------------------

create table if not exists allowance_uses (
    id bigint generated always as identity primary key,
    user_id uuid not null references app_users(id) on delete cascade,
    kind text not null check (kind in ('coach_message', 'regeneration', 'mock_exam', 'graded_answer')),
    used_at timestamptz not null default now()
);

create index if not exists allowance_uses_user_kind_idx on allowance_uses (user_id, kind, used_at);
