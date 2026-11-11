-- REQ-224 (batch EPPP-A, Nick 2026-11-10): the Mental Health category and the
-- per-account 18+ mature-content confirmation that its courses require.
--
-- 1. TAXONOMY. A top-level "Mental Health" category (slug 'mental-health')
--    for the licensure exams of the mental health professions: psychology
--    (EPPP, the Washington psychology jurisprudence exam), counseling (NCE,
--    NCMHCE) and social work (ASWB Clinical). A category of its own, not a
--    subcategory of Healthcare & Nursing (013) or of Health & Fitness, because
--    the mature-content gate below is keyed on the category: everything under
--    it is gated, nothing else is. The old wellness subcategory
--    'health-fitness/mental-health' (007) is a different thing and is left as
--    it is; subcategory slugs must be unique across categories (the seed
--    resolves them by slug), so the new ones are named by profession.
--    The app treats this category as clinical (lib/labs.ts labFamilySql,
--    lib/lab-grading.ts): its labs and sims need the study notice, get the
--    clinical safety framing and the 3x study pace by default.
--
-- 2. mature_content_confirmations: one row per account, category and notice
--    version -- "I am 18 or older and want to see frank clinical material"
--    (lib/mature-content.ts holds the version, mobile/src/lib/matureContent.ts
--    the text). confirmed_at is the timestamp, notice_version which text was
--    shown, min_age the age confirmed (18), source where it was asked
--    ('intake', 'catalog' or 'course'). A repeat keeps the first row (on
--    conflict do nothing). No date of birth is collected.
--    Deleted with the account (on delete cascade) and in the account export
--    (lib/account-export.ts). Primary key led by user_id (FAIL-393).
--
-- WHY a table and not legal_acceptances: the confirmation is scoped to a
-- category (the next mature category would be a second row, not a second
-- document type), and it records an age, which a legal document row has no
-- column for.
--
-- ORDER. Apply BEFORE the backend that reads it: the gate
-- (lib/auth/requireAcknowledgement.ts) reads the table on every mental-health
-- course request, and /api/health probes it (lib/schema-status.ts). The seed
-- needs the 'psychology-licensure' subcategory for the EPPP course. The code
-- before this migration never reads either, so applying early is safe.
--
-- LOCKING. Two upserts into small taxonomy tables and one new table: no
-- rewrite of anything existing. lock_timeout 5 s like 070.
--
-- ROLLBACK (nothing learner-owned except confirmations):
--   drop table if exists mature_content_confirmations;
--   -- delete the mental health courses first (subject_tracks points here):
--   delete from education_subcategories where category_id = (select id from education_categories where slug = 'mental-health');
--   delete from education_categories where slug = 'mental-health';
-- docs/deploy-runbook-integration.md lists it with the other down paths.
--
-- Safe to run twice: on conflict upserts, if not exists, guarded DO blocks.

set local lock_timeout = '5s';

-- 1. Taxonomy -------------------------------------------------------------------

insert into education_categories (slug, name, description, default_freshness_model, sort_order) values
('mental-health','Mental Health','Licensure exam preparation for psychologists, counselors and social workers. Includes frank clinical material behind an 18+ content notice.','certification_aligned',21)
on conflict (slug) do update set
  name=excluded.name, description=excluded.description,
  default_freshness_model=excluded.default_freshness_model, sort_order=excluded.sort_order,
  updated_at=now();

with seed(category_slug, slug, name, freshness_model, sort_order) as (values
('mental-health','psychology-licensure','Psychology Licensure','certification_aligned',1),
('mental-health','counseling-licensure','Counseling Licensure','certification_aligned',2),
('mental-health','social-work-licensure','Social Work Licensure','certification_aligned',3)
)
insert into education_subcategories(category_id, slug, name, freshness_model, sort_order)
select c.id, s.slug, s.name, s.freshness_model::content_freshness_model, s.sort_order
from seed s join education_categories c on c.slug=s.category_slug
on conflict (category_id, slug) do update set
  name=excluded.name, freshness_model=excluded.freshness_model,
  sort_order=excluded.sort_order, updated_at=now();

-- 2. The 18+ confirmation --------------------------------------------------------

create table if not exists mature_content_confirmations (
    user_id uuid not null references app_users(id) on delete cascade,
    category_slug varchar(80) not null,
    notice_version varchar(20) not null,
    min_age smallint not null default 18,
    source varchar(20) not null default 'course',
    confirmed_at timestamptz not null default now(),
    primary key (user_id, category_slug, notice_version)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'mature_content_confirmations_category_077') then
    alter table mature_content_confirmations add constraint mature_content_confirmations_category_077
      check (category_slug in ('mental-health'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'mature_content_confirmations_min_age_077') then
    alter table mature_content_confirmations add constraint mature_content_confirmations_min_age_077
      check (min_age >= 18);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'mature_content_confirmations_source_077') then
    alter table mature_content_confirmations add constraint mature_content_confirmations_source_077
      check (source in ('intake', 'catalog', 'course'));
  end if;
end $$;

comment on table mature_content_confirmations is
  'REQ-224: per-account 18+ confirmation for a mature-content category (mental-health), per notice version. No date of birth is stored. Deleted with the account; in the account export.';

-- Supabase Data API lock-out, as 026, 052 and 060 did for every table before.
alter table mature_content_confirmations enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on mature_content_confirmations from anon, authenticated;
  end if;
end $$;

-- REQ-207: grant the least-privilege runtime role what it needs on the new table.
select app_runtime_sync();
