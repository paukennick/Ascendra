-- REQ-280: homes for the Scrum and Six Sigma courses under Project Management
-- Certifications (migration 019), beside 'pmi-certifications'. Scrum.org's
-- PSM I and Scrum Alliance's CSM go in 'agile-scrum-certifications'; ASQ's
-- Six Sigma Green Belt in 'quality-six-sigma-certifications'. Putting them in
-- 'pmi-certifications' would label them PMI courses, which they are not.
-- Being in the project-management-certifications category puts them on the
-- PM plan (lib/billing-config.ts EDUCATION_CATEGORY_PLAN) with no code change.
-- (ITIL 4 Foundation uses the existing it-software / it-certifications row.)
--
-- Rollback (nothing learner-owned): delete the PSMI, CSM and CSSGB tracks
-- first (their subject_tracks rows point at these subcategories), then
--   delete from education_subcategories
--    where slug in ('agile-scrum-certifications', 'quality-six-sigma-certifications');
-- docs/deploy-runbook-integration.md lists it with the other down paths.

with seed(category_slug, slug, name, freshness_model, sort_order) as (values
('project-management-certifications','agile-scrum-certifications','Agile and Scrum Certifications','certification_aligned',2),
('project-management-certifications','quality-six-sigma-certifications','Quality and Six Sigma Certifications','certification_aligned',3)
)
insert into education_subcategories(category_id, slug, name, freshness_model, sort_order)
select c.id, s.slug, s.name, s.freshness_model::content_freshness_model, s.sort_order
from seed s join education_categories c on c.slug=s.category_slug
on conflict (category_id, slug) do update set
  name=excluded.name, freshness_model=excluded.freshness_model,
  sort_order=excluded.sort_order, updated_at=now();
