-- REQ-093: record which Terms and Privacy Policy versions each user agreed
-- to, and let learners report a problem with a specific lesson.
--
-- Before this, the sign-up checkbox was never sent to the server, so there
-- was no record that anyone agreed to anything. Each acceptance is its own
-- row (never overwritten), so the history of what a user agreed to, and
-- when, survives later policy changes. Deleted with the account.

create table if not exists legal_acceptances (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    document varchar(20) not null check (document in ('terms', 'privacy')),
    version varchar(20) not null,
    accepted_at timestamptz not null default now(),
    unique (user_id, document, version)
);
create index if not exists idx_legal_acceptances_user on legal_acceptances(user_id);
alter table legal_acceptances enable row level security;

-- "Report a problem" on a lesson: a support request tied to the exact
-- objective and lesson step, so a reviewer can find and fix it.
alter table support_requests drop constraint if exists support_requests_kind_check;
alter table support_requests
  add constraint support_requests_kind_check
  check (kind in ('ticket', 'course_request', 'content_report'));
alter table support_requests
  add column if not exists objective_id uuid references objectives(id) on delete set null,
  add column if not exists lesson_stage varchar(20);

-- Migration 026 revoked the public API's default privileges, so new tables
-- are already locked; repeated here so this file is safe on its own.
revoke all on legal_acceptances from anon, authenticated;
