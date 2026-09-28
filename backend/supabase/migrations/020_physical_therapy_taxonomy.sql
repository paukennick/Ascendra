-- Physical therapy subcategory, under the existing Healthcare & Nursing
-- category (migration 013) rather than a new top-level category. Nursing
-- got its own category because consumer-wellness categories like Health &
-- Fitness misrepresented a regulated licensure credential; that reasoning
-- carries straight over to PT licensure, and Healthcare & Nursing already
-- named allied health as a home it had nowhere else to put -- physical
-- therapy is exactly that, not a distinct ecosystem the way AWS/Azure/GCP
-- are distinct from each other (migration 019's reasoning for giving those
-- vendors their own categories doesn't apply here).

with seed(category_slug, slug, name, freshness_model, sort_order) as (values
('healthcare-nursing','physical-therapy','Physical Therapy','certification_aligned',11)
)
insert into education_subcategories(category_id, slug, name, freshness_model, sort_order)
select c.id, s.slug, s.name, s.freshness_model::content_freshness_model, s.sort_order
from seed s join education_categories c on c.slug=s.category_slug
on conflict (category_id, slug) do update set
  name=excluded.name, freshness_model=excluded.freshness_model,
  sort_order=excluded.sort_order, updated_at=now();
