-- REQ-259 (Nick, 2026-11-13, "lighter version"): the 18+ confirmation for
-- mental health courses becomes one acknowledgement PER COURSE, with a date of
-- birth asked once per account. Builds on 077 (REQ-224) and 070 (REQ-205).
--
-- 1. app_users.date_of_birth (date) and date_of_birth_entered_at
--    (timestamptz): the date of birth the learner gave the FIRST time any 18+
--    prompt asked, and when. Nullable, no default: catalog-only change, no
--    rewrite, nothing backfilled (every existing account has none until it
--    meets an 18+ prompt). The server computes age from it in UTC date terms
--    (lib/date-of-birth.ts). Written once: the accept route updates it only
--    `where date_of_birth is null`, so the learner cannot change it through
--    the app; a wrong one is corrected by support (the learner is told to
--    write in). No trigger blocks an operator's update on purpose.
--    The CHECK (added NOT VALID, then validated, so the validation scan only
--    takes a share-update-exclusive lock) says: both columns set or both
--    null, and not before 1900. "Not in the future" is checked by the server
--    (a CHECK cannot use now() and stay valid under a restore).
--
-- 2. mature_course_acknowledgements: one row per account, course (track) and
--    notice version -- "I confirm the information I've given is true to the
--    best of my knowledge, and I'm 18 or older", for THAT course. attested_at
--    is the timestamp of the attestation (a row exists only when it was
--    given), notice_version which wording was shown, min_age the age
--    confirmed (18), source where it was asked ('intake' or 'course'). A
--    repeat keeps the first row (on conflict do nothing). Primary key led by
--    user_id (FAIL-393); track_id has its own index because deleting a course
--    cascades here. Deleted with the account (on delete cascade) and in the
--    account export (lib/account-export.ts).
--    Deleting a COURSE deletes its acknowledgements (on delete cascade);
--    courses are retired, not deleted, in normal operation.
--
--    077's mature_content_confirmations (per category) is left as it is, for
--    the record, and is no longer read by any gate: a category confirmation
--    does not count as a course acknowledgement, so everyone acknowledges
--    each mental health course once more.
--
-- ORDER. Apply BEFORE the backend that reads it: the gate
-- (lib/auth/requireAcknowledgement.ts, GET /api/courses/:id) reads the table
-- on every mental-health course request, and /api/health probes both
-- (lib/schema-status.ts). The code before this migration never reads either,
-- so applying early is safe. Needs 077.
--
-- LOCKING. Two nullable columns on app_users (catalog-only, brief ACCESS
-- EXCLUSIVE), one check added NOT VALID then validated, one new table.
-- lock_timeout 5 s like 070 and 077.
--
-- ROLLBACK (deploy the earlier backend first; it never reads any of this):
--   drop table if exists mature_course_acknowledgements;
--   alter table app_users drop constraint if exists app_users_date_of_birth_081,
--     drop column if exists date_of_birth, drop column if exists date_of_birth_entered_at;
-- docs/deploy-runbook-integration.md lists it with the other down paths. After
-- rolling back, mental health courses are gated by 077's category
-- confirmation again.
--
-- Safe to run twice: if not exists, guarded DO blocks.

set local lock_timeout = '5s';

-- 1. Date of birth ----------------------------------------------------------------

alter table app_users add column if not exists date_of_birth date;
alter table app_users add column if not exists date_of_birth_entered_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'app_users_date_of_birth_081') then
    alter table app_users add constraint app_users_date_of_birth_081
      check ((date_of_birth is null) = (date_of_birth_entered_at is null)
             and (date_of_birth is null or date_of_birth >= date '1900-01-01')) not valid;
  end if;
end $$;
alter table app_users validate constraint app_users_date_of_birth_081;

comment on column app_users.date_of_birth is
  'REQ-259: the date of birth the learner gave the first time an 18+ prompt (mental health courses) asked. Written once by POST /api/mature-content/accept; the learner cannot change it in the app. Age is computed from it in UTC date terms. In the account export; deleted with the account.';
comment on column app_users.date_of_birth_entered_at is
  'REQ-259: when date_of_birth was entered. Null exactly when date_of_birth is null.';

-- 2. The per-course acknowledgement -------------------------------------------------

create table if not exists mature_course_acknowledgements (
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid not null references subject_tracks(id) on delete cascade,
    notice_version varchar(20) not null,
    min_age smallint not null default 18,
    source varchar(20) not null default 'course',
    attested_at timestamptz not null default now(),
    primary key (user_id, track_id, notice_version)
);

create index if not exists mature_course_acknowledgements_track_081
    on mature_course_acknowledgements (track_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'mature_course_acknowledgements_min_age_081') then
    alter table mature_course_acknowledgements add constraint mature_course_acknowledgements_min_age_081
      check (min_age >= 18);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'mature_course_acknowledgements_source_081') then
    alter table mature_course_acknowledgements add constraint mature_course_acknowledgements_source_081
      check (source in ('intake', 'course'));
  end if;
end $$;

comment on table mature_course_acknowledgements is
  'REQ-259: per-account, per-course 18+ acknowledgement with the attestation ("the information I have given is true ... and I am 18 or older"): attested_at, notice_version, min_age, source. Replaces the per-category mature_content_confirmations (077) as the gate. Deleted with the account; in the account export.';

-- Supabase Data API lock-out, as 026, 052, 060 and 077 did for every table before.
alter table mature_course_acknowledgements enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on mature_course_acknowledgements from anon, authenticated;
  end if;
end $$;

-- REQ-207: grant the least-privilege runtime role what it needs on the new table.
select app_runtime_sync();
