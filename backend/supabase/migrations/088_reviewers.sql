-- REQ-331 (Nick, 2026-11-17 17:52 PT: "Build it into the app. I also want the
-- ability to label a user as a reviewer giving them the access and features
-- needed."): reviewers, and the feedback they send.
--
-- 1. A reviewer is an owner-granted access grant (account_access, 056) with a
--    reviewer mark. The grant already gives everything a reviewer needs --
--    every course with no plan counts (lib/entitlements.ts), full AI in the AI
--    pilot (lib/ai-access.ts aiUserKind 'granted') within the global daily
--    ceiling -- so the mark rides on it rather than inventing a second access
--    path. The 18+ gates (REQ-259/327) are independent of access and still
--    apply. New columns:
--      reviewer_at           when the address was marked (null = not a reviewer)
--      reviewer_by           the owner who marked it (set null if that account goes)
--      reviewer_areas        the course categories they review (category slugs)
--      reviewer_note         the owner's note about the reviewer
--      reviewer_added_access true when marking CREATED the grant, so unmarking
--                            ends it; false when the address already had
--                            unrestricted access, so unmarking keeps that
--    A waiting grant (no verified account yet) carries the mark too, and it
--    applies once the address signs up, like the grant itself.
--    account_access_events gains two actions, reviewer_on and reviewer_off.
--    Its action check (056, unnamed, so Postgres named it
--    account_access_events_action_check) is restated under the SAME name,
--    NOT VALID then validated (FAIL-1720 rule).
--
-- 2. reviewer_feedback: what a reviewer sends with the in-app form. One row per
--    submission; the reviewer can edit their own rows. Optional links to the
--    course and the sim it is about (set null if either is deleted, so the
--    feedback survives a reseed that drops an item). Only owners read other
--    people's rows (the owner-only Reviewer feedback screen). Deleted with the
--    account (cascade) and in the account export (lib/account-export.ts).
--    Indexes led by each foreign key (FAIL-393).
--
-- Personal data: reviewer status and areas are new account data, and the
-- feedback is user content (a name and role as the reviewer typed them,
-- ratings, comments, follow-up consent). The Privacy Policy 2026-11-19 and
-- docs/legal/data-inventory.md say so.
--
-- ORDER. Apply BEFORE the backend that reads it: accessFor (every gated
-- request with billing on, and /api/auth/me) selects the reviewer columns, and
-- /api/health probes them (lib/schema-status.ts). The earlier backend never
-- reads them, so applying early is safe.
--
-- LOCKING. Columns with constant defaults on a small table (catalog-only), one
-- check restated NOT VALID then validated, one new table. lock_timeout 5 s.
--
-- ROLLBACK (deploy the earlier backend first; it never reads any of this):
--   drop table if exists reviewer_feedback;
--   update account_access set revoked_at = now() where reviewer_added_access and revoked_at is null;
--   delete from account_access_events where action in ('reviewer_on', 'reviewer_off');
--   alter table account_access_events drop constraint account_access_events_action_check;
--   alter table account_access_events add constraint account_access_events_action_check
--     check (action in ('grant', 'change', 'revoke', 'claim', 'ceiling_reached'));
--   alter table account_access drop column if exists reviewer_at, drop column if exists reviewer_by,
--     drop column if exists reviewer_areas, drop column if exists reviewer_note,
--     drop column if exists reviewer_added_access;
-- The update keeps a grant that existed only for reviewing from outliving it.
-- docs/deploy-runbook-integration.md lists it with the other down paths.
--
-- Safe to run twice: if not exists, guarded DO blocks.

set local lock_timeout = '5s';

-- 1. The reviewer mark ------------------------------------------------------------

alter table account_access add column if not exists reviewer_at timestamptz;
alter table account_access add column if not exists reviewer_by uuid references app_users(id) on delete set null;
alter table account_access add column if not exists reviewer_areas text[] not null default '{}';
alter table account_access add column if not exists reviewer_note text;
alter table account_access add column if not exists reviewer_added_access boolean not null default false;

create index if not exists account_access_reviewer_by_idx on account_access (reviewer_by) where reviewer_by is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'account_access_reviewer_088') then
    alter table account_access add constraint account_access_reviewer_088
      check (cardinality(reviewer_areas) <= 20
             and (reviewer_note is null or length(reviewer_note) <= 500)
             and (reviewer_at is not null or (cardinality(reviewer_areas) = 0 and reviewer_note is null and not reviewer_added_access))) not valid;
  end if;
end $$;
alter table account_access validate constraint account_access_reviewer_088;

comment on column account_access.reviewer_at is
  'REQ-331: when the owner marked this address as a reviewer (null = not a reviewer). The grant gives the access; the mark gives the reviewer feedback form.';
comment on column account_access.reviewer_added_access is
  'REQ-331: true when marking created this grant, so unmarking ends it; false when the address already had unrestricted access, which unmarking keeps.';

-- The audit trail's actions: restated under the name Postgres gave 056's inline check.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'account_access_events_action_check'
       and pg_get_constraintdef(oid) like '%reviewer_on%'
  ) then
    alter table account_access_events drop constraint if exists account_access_events_action_check;
    alter table account_access_events add constraint account_access_events_action_check
      check (action in ('grant', 'change', 'revoke', 'claim', 'ceiling_reached', 'reviewer_on', 'reviewer_off')) not valid;
  end if;
end $$;
alter table account_access_events validate constraint account_access_events_action_check;

-- 2. Reviewer feedback ------------------------------------------------------------

create table if not exists reviewer_feedback (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid references subject_tracks(id) on delete set null,
    sim_id uuid references sims(id) on delete set null,
    reviewer_name text,
    reviewer_role varchar(20),
    reviewer_role_other text,
    areas text[] not null default '{}',
    tried text[] not null default '{}',
    rating_accuracy smallint,
    rating_sim_realism smallint,
    rating_sensitive smallint,
    rating_usefulness smallint,
    rating_ease smallint,
    wrong_or_outdated text,
    sims_realistic text,
    heavy_topics text,
    missing text,
    other_comments text,
    recommend varchar(5),
    follow_up boolean,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists reviewer_feedback_user_idx on reviewer_feedback (user_id, created_at desc);
create index if not exists reviewer_feedback_track_idx on reviewer_feedback (track_id) where track_id is not null;
create index if not exists reviewer_feedback_sim_idx on reviewer_feedback (sim_id) where sim_id is not null;
create index if not exists reviewer_feedback_created_idx on reviewer_feedback (created_at desc, id desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reviewer_feedback_fields_088') then
    alter table reviewer_feedback add constraint reviewer_feedback_fields_088 check (
      (reviewer_name is null or length(reviewer_name) <= 120)
      and (reviewer_role is null or reviewer_role in ('lpc', 'lcsw', 'lmsw', 'psychologist', 'lmft', 'rn', 'student', 'other'))
      and (reviewer_role_other is null or length(reviewer_role_other) <= 120)
      and cardinality(areas) <= 20
      and tried <@ array['lessons', 'practice', 'exam', 'sims', 'tutor']::text[]
      and (rating_accuracy is null or rating_accuracy between 1 and 5)
      and (rating_sim_realism is null or rating_sim_realism between 1 and 5)
      and (rating_sensitive is null or rating_sensitive between 1 and 5)
      and (rating_usefulness is null or rating_usefulness between 1 and 5)
      and (rating_ease is null or rating_ease between 1 and 5)
      and (wrong_or_outdated is null or length(wrong_or_outdated) <= 5000)
      and (sims_realistic is null or length(sims_realistic) <= 5000)
      and (heavy_topics is null or length(heavy_topics) <= 5000)
      and (missing is null or length(missing) <= 5000)
      and (other_comments is null or length(other_comments) <= 5000)
      and (recommend is null or recommend in ('yes', 'maybe', 'no'))
    );
  end if;
end $$;

comment on table reviewer_feedback is
  'REQ-331: feedback a reviewer sends with the in-app form. Their own rows only; owners read all of it. Deleted with the account; in the account export.';

-- Supabase Data API lock-out, as 026, 052 and 060 did for every table before.
alter table reviewer_feedback enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on reviewer_feedback from anon, authenticated;
  end if;
end $$;

-- REQ-207: grant the least-privilege runtime role what it needs on the new table.
select app_runtime_sync();
