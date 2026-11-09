-- REQ-164: a home for the Linux Foundation / CNCF container and Kubernetes
-- certifications (CKA, CKAD, CKS, KCNA, KCSA and the wider CNCF project
-- exams) and for container tooling courses that are not tied to an exam.
--
-- Same reasoning as migration 019: a vendor ecosystem with enough real
-- tracks to browse by gets its own top-level category rather than being
-- filed under a generic IT bucket. Kubernetes is a distinct ecosystem from
-- AWS/Azure/GCP (its exams are vendor-neutral and hands-on), so it does not
-- belong inside any one cloud's category.
--
-- Three subcategories from the start: the exam-aligned CNCF certifications;
-- container tooling (Docker, Compose, registries) that follows the
-- technology rather than an exam blueprint -- the same split the
-- Development category makes between certification-aligned and
-- technology-aligned content; and Red Hat's Podman and OpenShift exams
-- (EX188, EX280), which are vendor exams on a Kubernetes distribution.

insert into education_categories (slug, name, description, default_freshness_model, sort_order) values
('cloud-native-certifications','Cloud Native & Kubernetes','Kubernetes and cloud native certification exam preparation from the Linux Foundation and CNCF, plus container tooling.','certification_aligned',20)
on conflict (slug) do update set
  name=excluded.name, description=excluded.description,
  default_freshness_model=excluded.default_freshness_model, sort_order=excluded.sort_order,
  updated_at=now();

with seed(category_slug, slug, name, freshness_model, sort_order) as (values
('cloud-native-certifications','cncf-certifications','Linux Foundation & CNCF Certifications','certification_aligned',1),
('cloud-native-certifications','container-tooling','Containers & Docker','technology_aligned',2),
('cloud-native-certifications','red-hat-openshift','Red Hat Containers & OpenShift','certification_aligned',3)
)
insert into education_subcategories(category_id, slug, name, freshness_model, sort_order)
select c.id, s.slug, s.name, s.freshness_model::content_freshness_model, s.sort_order
from seed s join education_categories c on c.slug=s.category_slug
on conflict (category_id, slug) do update set
  name=excluded.name, freshness_model=excluded.freshness_model,
  sort_order=excluded.sort_order, updated_at=now();
