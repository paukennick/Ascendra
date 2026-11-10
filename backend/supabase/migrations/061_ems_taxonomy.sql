-- REQ-174: a home for the National Registry of Emergency Medical Technicians
-- (NREMT) certification courses: Emergency Medical Responder, EMT, Advanced
-- EMT and Paramedic.
--
-- A subcategory under the existing Healthcare & Nursing category (migration
-- 013), not a new top-level category -- the same reasoning migration 020 gave
-- physical therapy. EMS certification is a regulated clinical credential
-- (states license EMS clinicians on it), so it belongs with nursing and PT,
-- not with a consumer wellness category; and four levels of one profession
-- are not a distinct ecosystem the way AWS/Azure/GCP are (migration 019).
-- Being under a healthcare-* category also makes its labs "clinical"
-- (lib/labs.ts labFamilySql), so they get the study notice and the clinical
-- safety framing.
--
-- Rollback (nothing learner-owned): delete the EMS tracks first (the seed's
-- subject_tracks rows point at this subcategory), then
--   delete from education_subcategories where slug = 'emergency-medical-services';
-- docs/deploy-runbook-integration.md lists it with the other down paths.

with seed(category_slug, slug, name, freshness_model, sort_order) as (values
('healthcare-nursing','emergency-medical-services','Emergency Medical Services (EMS)','certification_aligned',13)
)
insert into education_subcategories(category_id, slug, name, freshness_model, sort_order)
select c.id, s.slug, s.name, s.freshness_model::content_freshness_model, s.sort_order
from seed s join education_categories c on c.slug=s.category_slug
on conflict (category_id, slug) do update set
  name=excluded.name, freshness_model=excluded.freshness_model,
  sort_order=excluded.sort_order, updated_at=now();
