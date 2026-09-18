-- Healthcare & Nursing category.
--
-- The thirteen categories in migration 007 follow the consumer-marketplace
-- shape, where the nearest fit for nursing is Health & Fitness -- a category
-- whose subcategories are yoga, dance, nutrition and meditation. Licensure
-- and clinical credentials do not belong beside those: they are regulated
-- qualifications with statutory scopes of practice, and filing them under
-- consumer wellness misrepresents what the courses are.
--
-- So this is a fourteenth top-level category rather than a subcategory of an
-- existing one. It also gives allied health, medical coding and healthcare
-- administration a home, which the original taxonomy had nowhere to put.
--
-- Freshness models follow the same rule as the rest of the taxonomy:
-- certification_aligned where an external body publishes a blueprint with a
-- revision date (NCLEX test plans, specialty certification handbooks), and
-- academic_foundational where the content tracks accreditation standards and
-- degree curricula that change on a slower, less versioned cadence.

insert into education_categories (slug, name, description, default_freshness_model, sort_order) values
('healthcare-nursing','Healthcare & Nursing','Nursing licensure and degrees, NCLEX preparation, specialty certifications, allied health, and healthcare administration.','certification_aligned',14)
on conflict (slug) do update set
  name=excluded.name, description=excluded.description,
  default_freshness_model=excluded.default_freshness_model, sort_order=excluded.sort_order,
  updated_at=now();

with seed(category_slug, slug, name, freshness_model, sort_order) as (values
('healthcare-nursing','nursing-licensure','Nursing Licensure','certification_aligned',1),
('healthcare-nursing','nclex-preparation','NCLEX Preparation','certification_aligned',2),
('healthcare-nursing','nursing-degrees','Nursing Degree Programs','academic_foundational',3),
('healthcare-nursing','nursing-specialty-certifications','Nursing Specialty Certifications','certification_aligned',4),
('healthcare-nursing','advanced-practice-nursing','Advanced Practice Nursing','certification_aligned',5),
('healthcare-nursing','allied-health','Allied Health','certification_aligned',6),
('healthcare-nursing','medical-coding-billing','Medical Coding & Billing','certification_aligned',7),
('healthcare-nursing','healthcare-administration','Healthcare Administration','academic_foundational',8),
('healthcare-nursing','patient-care-fundamentals','Patient Care Fundamentals','academic_foundational',9),
('healthcare-nursing','other-healthcare-nursing','Other Healthcare & Nursing','academic_foundational',10)
)
insert into education_subcategories(category_id, slug, name, freshness_model, sort_order)
select c.id, s.slug, s.name, s.freshness_model::content_freshness_model, s.sort_order
from seed s join education_categories c on c.slug=s.category_slug
on conflict (category_id, slug) do update set
  name=excluded.name, freshness_model=excluded.freshness_model,
  sort_order=excluded.sort_order, updated_at=now();
