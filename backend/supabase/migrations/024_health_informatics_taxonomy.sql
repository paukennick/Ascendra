-- Health Informatics subcategory, under the existing Healthcare & Nursing
-- category (migration 013), for the MS Health Informatics degree pathway
-- (REQ-086). The closest existing home, Healthcare Administration, is about
-- running health organisations; informatics is its own accredited discipline
-- (CAHIIM accredits it separately from health information management), so it
-- gets its own subcategory rather than being filed under a near miss.

with seed(category_slug, slug, name, freshness_model, sort_order) as (values
('healthcare-nursing','health-informatics','Health Informatics','academic_foundational',12)
)
insert into education_subcategories(category_id, slug, name, freshness_model, sort_order)
select c.id, s.slug, s.name, s.freshness_model::content_freshness_model, s.sort_order
from seed s join education_categories c on c.slug=s.category_slug
on conflict (category_id, slug) do update set
  name=excluded.name, freshness_model=excluded.freshness_model,
  sort_order=excluded.sort_order, updated_at=now();
