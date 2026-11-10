-- REQ-197: service emails -- the exam change notice, the exam countdown and
-- the weekly progress digest (lib/service-emails.ts).
--
-- 1. email_preferences: one row per learner, only once they change a
--    switch in Settings > Email. No row means the defaults below: the two
--    service messages on, the digest OFF (it is opt-in). A signed
--    unsubscribe link writes the same row.
-- 2. service_email_log: one row per learner, kind and period ("this exam
--    change", "the 14-day mail for this exam date", "this ISO week"). The
--    unique key is the idempotency guard: a send first claims its row, so a
--    retried or overlapping cron run never mails the same thing twice. Only
--    a failed send is retried (at most 3 tries); a send that never reported
--    back stays 'sending' and is not retried (at most once, never twice).
--    No address, subject or body is stored.
--
-- Both are deleted with the account (on delete cascade) and are in the
-- account export. Purely additive: two new tables, nothing existing is
-- altered. Safe to run twice. Apply BEFORE the backend deploy:
-- /api/health probes both tables and Settings > Email reads the first.

set local lock_timeout = '5s';

create table if not exists email_preferences (
    user_id uuid primary key references app_users(id) on delete cascade,
    exam_changes boolean not null default true,
    exam_countdown boolean not null default true,
    weekly_digest boolean not null default false,
    updated_at timestamptz not null default now()
);

create table if not exists service_email_log (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    kind text not null check (kind in ('exam_change', 'exam_countdown', 'weekly_digest')),
    -- e.g. 'AWSSAP:2026-11-17', '<track id>:2026-12-01:d14', '2026-W46'
    period_key text not null check (length(period_key) between 1 and 120),
    status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
    attempts int not null default 1 check (attempts between 1 and 10),
    created_at timestamptz not null default now(),
    sent_at timestamptz
);

-- The idempotency key; it also leads with the foreign key's column (FAIL-393).
create unique index if not exists service_email_log_once on service_email_log (user_id, kind, period_key);
-- Retrying failed sends.
create index if not exists service_email_log_failed on service_email_log (kind, created_at) where status = 'failed';

-- Supabase Data API lock-out, as 026, 052, 056 and 058 did for every table.
alter table email_preferences enable row level security;
alter table service_email_log enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on email_preferences, service_email_log from anon, authenticated;
  end if;
end $$;
