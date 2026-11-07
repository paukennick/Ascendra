-- Release 2026-11-07, step 1 of the runbook: baseline the migration ledger.
--
-- Production's schema_migrations only lists 023-027: 001-022 were pasted
-- into the Supabase SQL editor before the runner existed and were never
-- recorded. `npm run migrate -- --all` applies every file the ledger has
-- not seen, so without this it would try to run 001-022 again. This records
-- them as applied -- but only if the database really has the schema through
-- 024 (its last objects are probed first) and B's 027, and does nothing
-- otherwise (an error stops it before any insert).
--
-- Safe to run twice; on a database that already lists them it changes
-- nothing. Run over the direct connection:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/release-2026-11-07-baseline-ledger.sql

do $$
begin
  if to_regclass('public.course_favorites') is null
     or to_regclass('public.subject_tracks_catalog_code_unique') is null
     or not exists (select 1 from education_subcategories where slug = 'health-informatics')
     or to_regclass('public.legal_acceptances') is null then
    raise exception 'Not baselining: this database lacks objects from 023/024/027. Apply those first (npm run migrate -- <file>).';
  end if;
end $$;

create table if not exists schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);

insert into schema_migrations (filename) values
  ('001_init.sql'),
  ('002_auth.sql'),
  ('003_mfa_oauth.sql'),
  ('004_profile.sql'),
  ('005_favorites.sql'),
  ('006_email_change.sql'),
  ('007_education_taxonomy.sql'),
  ('008_email_mfa.sql'),
  ('009_backup_codes_per_method.sql'),
  ('010_mfa_disable_confirmation.sql'),
  ('011_support_requests.sql'),
  ('012_track_acknowledgements.sql'),
  ('013_healthcare_nursing_taxonomy.sql'),
  ('014_credential_non_exam_basis.sql'),
  ('015_content_format.sql'),
  ('016_vendor_exam_unpublished_code_enum.sql'),
  ('017_vendor_exam_unpublished_code_constraint.sql'),
  ('018_content_review_findings.sql'),
  ('019_certification_vendor_categories.sql'),
  ('020_physical_therapy_taxonomy.sql'),
  ('021_widen_classification_columns.sql'),
  ('022_track_progress_vs_mastery.sql'),
  ('023_shared_catalog.sql'),
  ('024_health_informatics_taxonomy.sql'),
  ('025_lesson_choice_feedback.sql'),
  ('026_enable_rls.sql'),
  ('027_legal_acceptances_and_content_reports.sql')
on conflict (filename) do nothing;
