-- Give each certification vendor its own top-level category, instead of
-- lumping AWS/Azure/GCP/CompTIA (44 tracks combined as of this migration)
-- into the single 'it-certifications' subcategory under the generic
-- 'IT & Software' category from migration 007. That subcategory was a
-- reasonable placeholder when the catalog had a handful of certs; at 44
-- tracks it renders as one undifferentiated wall of cards with nothing to
-- browse by. Same precedent as migration 013's 'healthcare-nursing': a
-- vendor/domain with enough real tracks to need its own home gets a
-- fourteenth-and-up top-level category rather than staying nested.
--
-- Project Management certifications get the same treatment: 'business' ->
-- 'project-management' was one subcategory among fifteen (Sales, HR, Real
-- Estate, etc.) for what is now a 7-track PMI-sourced strand of its own.
--
-- Each new category gets exactly one matching subcategory for now (not
-- split further by certification level, e.g. AWS Foundational/Associate/
-- Professional/Specialty) -- this is a first pass at fixing the
-- one-category-holds-everything problem, not a final answer; splitting
-- further by level is a natural follow-up once a vendor's own section
-- itself gets crowded.
--
-- The old 'business' -> 'project-management' subcategory row is left in
-- place, just unreferenced by any track from this migration on -- deleting
-- it isn't safe without knowing every possible future referrer, and an
-- unused taxonomy row costs nothing.

insert into education_categories (slug, name, description, default_freshness_model, sort_order) values
('aws-certifications','AWS Certifications','Amazon Web Services certification exam preparation, from Cloud Practitioner through Professional and Specialty.','certification_aligned',15),
('azure-certifications','Microsoft Azure Certifications','Microsoft Azure certification exam preparation, from Fundamentals through Expert and Specialty.','certification_aligned',16),
('gcp-certifications','Google Cloud Certifications','Google Cloud certification exam preparation, from Foundational through Professional.','certification_aligned',17),
('comptia-certifications','CompTIA Certifications','CompTIA vendor-neutral IT certification exam preparation, across all tiers.','certification_aligned',18),
('project-management-certifications','Project Management Certifications','PMI and other project, program, and portfolio management certification exam preparation.','certification_aligned',19)
on conflict (slug) do update set
  name=excluded.name, description=excluded.description,
  default_freshness_model=excluded.default_freshness_model, sort_order=excluded.sort_order,
  updated_at=now();

with seed(category_slug, slug, name, freshness_model, sort_order) as (values
('aws-certifications','aws-certifications','AWS Certifications','certification_aligned',1),
('azure-certifications','azure-certifications','Microsoft Azure Certifications','certification_aligned',1),
('gcp-certifications','gcp-certifications','Google Cloud Certifications','certification_aligned',1),
('comptia-certifications','comptia-certifications','CompTIA Certifications','certification_aligned',1),
('project-management-certifications','pmi-certifications','PMI Certifications','certification_aligned',1)
)
insert into education_subcategories(category_id, slug, name, freshness_model, sort_order)
select c.id, s.slug, s.name, s.freshness_model::content_freshness_model, s.sort_order
from seed s join education_categories c on c.slug=s.category_slug
on conflict (category_id, slug) do update set
  name=excluded.name, freshness_model=excluded.freshness_model,
  sort_order=excluded.sort_order, updated_at=now();

-- The nine tracks that predate migration 007's taxonomy entirely
-- (backend/supabase/seed/data.ts) have never had a subcategory_id at all --
-- they show up in the app's "Other" bucket today. Five of them are CompTIA
-- certs and belong in the new comptia-certifications subcategory just like
-- every track in comptia.ts; the rest get a home in the existing
-- Development category rather than staying uncategorized. This update runs
-- by code so it's a no-op (0 rows) if those tracks don't exist yet in a
-- given environment, rather than failing.
update subject_tracks st
set subcategory_id = es.id
from education_subcategories es
join education_categories ec on ec.id = es.category_id
where ec.slug = 'comptia-certifications' and es.slug = 'comptia-certifications'
  and st.code in ('SECPLUS', 'LINUXPLUS', 'CYSAPLUS', 'PENTESTPLUS', 'SECURITYX');

update subject_tracks st
set subcategory_id = es.id
from education_subcategories es
join education_categories ec on ec.id = es.category_id
where ec.slug = 'development' and es.slug = 'programming-languages'
  and st.code in ('PYTHON', 'JAVASCRIPT');

update subject_tracks st
set subcategory_id = es.id
from education_subcategories es
join education_categories ec on ec.id = es.category_id
where ec.slug = 'development' and es.slug = 'software-engineering'
  and st.code in ('MSCS', 'CMPCBS');
