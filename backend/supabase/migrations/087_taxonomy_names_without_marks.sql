-- REQ-318 (Nick, 2026-11-16): category and subcategory names that were built
-- on an exam body's mark ("AWS Certifications", "CompTIA Certifications",
-- "PMI Certifications" ...) become descriptive names that follow each body's
-- policy row in backend/lib/catalog-trademarks.test.ts (REQ-309, policies
-- read 2026-11-16):
--   - "nominative" bodies (AWS, Microsoft, Google, CompTIA, PMI, the Linux
--     Foundation / CNCF, Red Hat, Docker): the name is descriptive and the
--     body may follow in plain text, as a track label: "Cloud Certifications
--     (AWS track)". AWS, Microsoft, CompTIA, PMI and the Linux Foundation
--     permit truthful plain-text reference but not their mark as (part of)
--     a product's name, so the mark is never the head of the name.
--   - "unstated" bodies (NCSBN): read conservatively, no mark at all
--     ("NCLEX Preparation" becomes "Nursing Licensure Exam Preparation").
-- Kubernetes is a Linux Foundation mark, so the category "Cloud Native &
-- Kubernetes" becomes "Cloud Native and Containers". The two technology
-- subcategories named only "Microsoft" and "Google" (office productivity,
-- migration 007; no course uses them) become "Productivity Suites (... track)".
--
-- Slugs are unchanged, so the seed (which resolves subcategories by slug),
-- links, the billing plan map (lib/billing-config.ts, category slugs) and the
-- 18+ gate (category slugs) are untouched. Names are display text and model
-- prompt context only; no code depends on them, so there is no schema-status
-- probe (a missing 087 must not turn /api/health red).
--
-- Idempotent: plain updates by slug to fixed values; running it twice, or on
-- a database missing a row, changes nothing more. Earlier migrations (013,
-- 019, 057) still carry the old names in their upserts, and replaying one of
-- them after this file would bring an old name back; re-apply 087 after any
-- such replay.
--
-- Rollback: set the names back from migrations 007, 013, 019 and 057 (same
-- slugs). Nothing learner-owned changes.

update education_categories c
   set name = v.name, updated_at = now()
  from (values
    ('aws-certifications', 'Cloud Certifications (AWS track)'),
    ('azure-certifications', 'Cloud Certifications (Microsoft Azure track)'),
    ('gcp-certifications', 'Cloud Certifications (Google Cloud track)'),
    ('comptia-certifications', 'Vendor-Neutral IT Certifications (CompTIA track)'),
    ('cloud-native-certifications', 'Cloud Native and Containers')
  ) as v(slug, name)
 where c.slug = v.slug and c.name is distinct from v.name;

-- The Healthcare & Nursing description named NCLEX (NCSBN, "unstated").
update education_categories
   set description = 'Nursing licensure and degrees, licensure exam preparation, specialty certifications, allied health, and healthcare administration.',
       updated_at = now()
 where slug = 'healthcare-nursing'
   and description is distinct from 'Nursing licensure and degrees, licensure exam preparation, specialty certifications, allied health, and healthcare administration.';

update education_subcategories s
   set name = v.name, updated_at = now()
  from (values
    ('aws-certifications', 'aws-certifications', 'Cloud Certifications (AWS track)'),
    ('azure-certifications', 'azure-certifications', 'Cloud Certifications (Microsoft Azure track)'),
    ('gcp-certifications', 'gcp-certifications', 'Cloud Certifications (Google Cloud track)'),
    ('comptia-certifications', 'comptia-certifications', 'Vendor-Neutral IT Certifications (CompTIA track)'),
    ('project-management-certifications', 'pmi-certifications', 'Project, Program and Portfolio Certifications (PMI track)'),
    ('cloud-native-certifications', 'cncf-certifications', 'Cloud Native Certifications (Linux Foundation and CNCF track)'),
    ('cloud-native-certifications', 'container-tooling', 'Container Tooling'),
    ('cloud-native-certifications', 'red-hat-openshift', 'Container Platform Certifications (Red Hat track)'),
    ('healthcare-nursing', 'nclex-preparation', 'Nursing Licensure Exam Preparation'),
    ('office-productivity', 'microsoft', 'Productivity Suites (Microsoft track)'),
    ('office-productivity', 'google', 'Productivity Suites (Google track)')
  ) as v(category_slug, slug, name)
  join education_categories c on c.slug = v.category_slug
 where s.category_id = c.id and s.slug = v.slug and s.name is distinct from v.name;
