-- REQ-020: complete education taxonomy and version-aware content alignment.
-- Additive migration. Existing tracks, units, objectives, and learner progress remain intact.

do $$ begin
  create type content_freshness_model as enum (
    'certification_aligned',
    'technology_aligned',
    'academic_foundational'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type publication_status as enum (
    'draft', 'active', 'transitioning', 'beta', 'retired', 'archived'
  );
exception when duplicate_object then null;
end $$;

alter type track_type add value if not exists 'academic';
alter type track_type add value if not exists 'professional';
alter type track_type add value if not exists 'skills';

create table if not exists education_categories (
  id uuid primary key default uuid_generate_v4(),
  slug varchar(100) not null unique,
  name varchar(150) not null unique,
  description text,
  default_freshness_model content_freshness_model not null,
  sort_order int not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists education_subcategories (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references education_categories(id) on delete cascade,
  slug varchar(120) not null,
  name varchar(180) not null,
  description text,
  freshness_model content_freshness_model not null,
  sort_order int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category_id, slug),
  unique(category_id, sort_order)
);

create table if not exists credential_providers (
  id uuid primary key default uuid_generate_v4(),
  slug varchar(100) not null unique,
  name varchar(180) not null unique,
  official_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists credentials (
  id uuid primary key default uuid_generate_v4(),
  provider_id uuid not null references credential_providers(id) on delete restrict,
  subcategory_id uuid not null references education_subcategories(id) on delete restrict,
  slug varchar(160) not null,
  name varchar(255) not null,
  credential_type varchar(80) not null,
  status publication_status not null default 'draft',
  official_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id, slug)
);

create table if not exists credential_exams (
  id uuid primary key default uuid_generate_v4(),
  credential_id uuid not null references credentials(id) on delete cascade,
  exam_code varchar(100) not null,
  exam_revision varchar(100),
  objectives_revision varchar(100),
  status publication_status not null default 'draft',
  effective_date date,
  retirement_date date,
  last_vendor_verified_at timestamptz,
  official_objectives_url text,
  recommended_experience text,
  duration_minutes int check (duration_minutes is null or duration_minutes > 0),
  question_format text,
  passing_score_policy text,
  superseded_by_exam_id uuid references credential_exams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(credential_id, exam_code, exam_revision),
  check (retirement_date is null or effective_date is null or retirement_date >= effective_date),
  check (status = 'draft' or (official_objectives_url is not null and last_vendor_verified_at is not null))
);

create table if not exists exam_domains (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references credential_exams(id) on delete cascade,
  code varchar(50),
  name varchar(255) not null,
  weight_percent numeric(5,2) check (weight_percent is null or weight_percent between 0 and 100),
  sort_order int not null,
  unique(exam_id, sort_order)
);

create table if not exists exam_objectives (
  id uuid primary key default uuid_generate_v4(),
  domain_id uuid not null references exam_domains(id) on delete cascade,
  code varchar(80),
  statement text not null,
  sort_order int not null,
  unique(domain_id, sort_order)
);

alter table subject_tracks
  add column if not exists subcategory_id uuid references education_subcategories(id) on delete set null,
  add column if not exists freshness_model content_freshness_model,
  add column if not exists credential_exam_id uuid references credential_exams(id) on delete set null,
  add column if not exists technology_name varchar(180),
  add column if not exists technology_version varchar(100),
  add column if not exists curriculum_standard varchar(255),
  add column if not exists source_url text,
  add column if not exists source_verified_at timestamptz,
  add column if not exists content_review_due_at timestamptz;

create index if not exists idx_subcategories_category on education_subcategories(category_id, sort_order);
create index if not exists idx_credentials_provider on credentials(provider_id);
create index if not exists idx_exams_status on credential_exams(status, retirement_date);
create index if not exists idx_tracks_subcategory on subject_tracks(subcategory_id);
create index if not exists idx_tracks_review_due on subject_tracks(content_review_due_at);

insert into education_categories (slug, name, description, default_freshness_model, sort_order) values
('development','Development','Software creation, programming, data, testing, and development tooling.','technology_aligned',1),
('business','Business','Management, strategy, operations, law, people, commerce, and industry practice.','academic_foundational',2),
('finance-accounting','Finance & Accounting','Accounting, economics, finance, investing, tax, and financial credentials.','academic_foundational',3),
('it-software','IT & Software','IT certifications, infrastructure, security, hardware, and operating systems.','technology_aligned',4),
('office-productivity','Office Productivity','Productivity platforms and enterprise office software.','technology_aligned',5),
('personal-development','Personal Development','Personal effectiveness, relationships, wellbeing, creativity, and growth.','academic_foundational',6),
('design','Design','Visual, product, spatial, interactive, fashion, and digital design.','technology_aligned',7),
('marketing','Marketing','Marketing strategy, channels, analytics, content, advertising, and growth.','technology_aligned',8),
('lifestyle','Lifestyle','Practical interests, crafts, food, gaming, home, pets, and travel.','academic_foundational',9),
('photography-video','Photography & Video','Photography, imaging tools, commercial media, and video production.','technology_aligned',10),
('health-fitness','Health & Fitness','Fitness, health, sport, nutrition, mental health, safety, and movement.','academic_foundational',11),
('music','Music','Performance, production, theory, voice, technique, and music software.','academic_foundational',12),
('teaching-academics','Teaching & Academics','Academic disciplines, languages, teacher development, and test preparation.','academic_foundational',13)
on conflict (slug) do update set
  name=excluded.name, description=excluded.description,
  default_freshness_model=excluded.default_freshness_model, sort_order=excluded.sort_order,
  updated_at=now();

with seed(category_slug, slug, name, freshness_model, sort_order) as (values
('development','web-development','Web Development','technology_aligned',1),
('development','data-science','Data Science','technology_aligned',2),
('development','mobile-development','Mobile Development','technology_aligned',3),
('development','programming-languages','Programming Languages','technology_aligned',4),
('development','game-development','Game Development','technology_aligned',5),
('development','database-design-development','Database Design & Development','technology_aligned',6),
('development','software-testing','Software Testing','technology_aligned',7),
('development','software-engineering','Software Engineering','technology_aligned',8),
('development','software-development-tools','Software Development Tools','technology_aligned',9),
('development','no-code-development','No-Code Development','technology_aligned',10),
('business','entrepreneurship','Entrepreneurship','academic_foundational',1),
('business','communication','Communication','academic_foundational',2),
('business','management','Management','academic_foundational',3),
('business','sales','Sales','academic_foundational',4),
('business','business-strategy','Business Strategy','academic_foundational',5),
('business','operations','Operations','academic_foundational',6),
('business','project-management','Project Management','certification_aligned',7),
('business','business-law','Business Law','academic_foundational',8),
('business','business-analytics-intelligence','Business Analytics & Intelligence','technology_aligned',9),
('business','human-resources','Human Resources','academic_foundational',10),
('business','industry','Industry','academic_foundational',11),
('business','e-commerce','E-Commerce','technology_aligned',12),
('business','media','Media','technology_aligned',13),
('business','real-estate','Real Estate','academic_foundational',14),
('business','other-business','Other Business','academic_foundational',15),
('finance-accounting','accounting-bookkeeping','Accounting & Bookkeeping','academic_foundational',1),
('finance-accounting','compliance','Compliance','academic_foundational',2),
('finance-accounting','cryptocurrency-blockchain','Cryptocurrency & Blockchain','technology_aligned',3),
('finance-accounting','economics','Economics','academic_foundational',4),
('finance-accounting','finance','Finance','academic_foundational',5),
('finance-accounting','finance-certification-exam-prep','Finance Certification & Exam Prep','certification_aligned',6),
('finance-accounting','financial-modeling-analysis','Financial Modeling & Analysis','technology_aligned',7),
('finance-accounting','investing-trading','Investing & Trading','technology_aligned',8),
('finance-accounting','money-management-tools','Money Management Tools','technology_aligned',9),
('finance-accounting','taxes','Taxes','academic_foundational',10),
('finance-accounting','other-finance-accounting','Other Finance & Accounting','academic_foundational',11),
('it-software','it-certifications','IT Certifications','certification_aligned',1),
('it-software','network-security','Network & Security','technology_aligned',2),
('it-software','hardware','Hardware','technology_aligned',3),
('it-software','operating-systems-servers','Operating Systems & Servers','technology_aligned',4),
('it-software','other-it-software','Other IT & Software','technology_aligned',5),
('office-productivity','microsoft','Microsoft','technology_aligned',1),
('office-productivity','apple','Apple','technology_aligned',2),
('office-productivity','google','Google','technology_aligned',3),
('office-productivity','sap','SAP','technology_aligned',4),
('office-productivity','oracle','Oracle','technology_aligned',5),
('office-productivity','other-office-productivity','Other Office Productivity','technology_aligned',6),
('personal-development','personal-transformation','Personal Transformation','academic_foundational',1),
('personal-development','personal-productivity','Personal Productivity','academic_foundational',2),
('personal-development','leadership','Leadership','academic_foundational',3),
('personal-development','career-development','Career Development','academic_foundational',4),
('personal-development','parenting-relationships','Parenting & Relationships','academic_foundational',5),
('personal-development','happiness','Happiness','academic_foundational',6),
('personal-development','esoteric-practices','Esoteric Practices','academic_foundational',7),
('personal-development','religion-spirituality','Religion & Spirituality','academic_foundational',8),
('personal-development','personal-brand-building','Personal Brand Building','technology_aligned',9),
('personal-development','creativity','Creativity','academic_foundational',10),
('personal-development','influence','Influence','academic_foundational',11),
('personal-development','self-esteem-confidence','Self Esteem & Confidence','academic_foundational',12),
('personal-development','stress-management','Stress Management','academic_foundational',13),
('personal-development','memory-study-skills','Memory & Study Skills','academic_foundational',14),
('personal-development','motivation','Motivation','academic_foundational',15),
('personal-development','other-personal-development','Other Personal Development','academic_foundational',16),
('design','web-design','Web Design','technology_aligned',1),
('design','graphic-design-illustration','Graphic Design & Illustration','technology_aligned',2),
('design','design-tools','Design Tools','technology_aligned',3),
('design','user-experience-design','User Experience Design','technology_aligned',4),
('design','game-design','Game Design','technology_aligned',5),
('design','3d-animation','3D & Animation','technology_aligned',6),
('design','fashion-design','Fashion Design','academic_foundational',7),
('design','architectural-design','Architectural Design','technology_aligned',8),
('design','interior-design','Interior Design','academic_foundational',9),
('design','other-design','Other Design','technology_aligned',10),
('marketing','digital-marketing','Digital Marketing','technology_aligned',1),
('marketing','search-engine-optimization','Search Engine Optimization','technology_aligned',2),
('marketing','social-media-marketing','Social Media Marketing','technology_aligned',3),
('marketing','branding','Branding','academic_foundational',4),
('marketing','marketing-fundamentals','Marketing Fundamentals','academic_foundational',5),
('marketing','marketing-analytics-automation','Marketing Analytics & Automation','technology_aligned',6),
('marketing','public-relations','Public Relations','academic_foundational',7),
('marketing','paid-advertising','Paid Advertising','technology_aligned',8),
('marketing','video-mobile-marketing','Video & Mobile Marketing','technology_aligned',9),
('marketing','content-marketing','Content Marketing','technology_aligned',10),
('marketing','growth-hacking','Growth Hacking','technology_aligned',11),
('marketing','affiliate-marketing','Affiliate Marketing','technology_aligned',12),
('marketing','product-marketing','Product Marketing','technology_aligned',13),
('marketing','other-marketing','Other Marketing','technology_aligned',14),
('lifestyle','arts-crafts','Arts & Crafts','academic_foundational',1),
('lifestyle','beauty-makeup','Beauty & Makeup','academic_foundational',2),
('lifestyle','food-beverage','Food & Beverage','academic_foundational',3),
('lifestyle','gaming','Gaming','technology_aligned',4),
('lifestyle','home-improvement-gardening','Home Improvement & Gardening','academic_foundational',5),
('lifestyle','pet-care-training','Pet Care & Training','academic_foundational',6),
('lifestyle','travel','Travel','academic_foundational',7),
('lifestyle','other-lifestyle','Other Lifestyle','academic_foundational',8),
('photography-video','digital-photography','Digital Photography','technology_aligned',1),
('photography-video','photography','Photography','academic_foundational',2),
('photography-video','portrait-photography','Portrait Photography','academic_foundational',3),
('photography-video','photography-tools','Photography Tools','technology_aligned',4),
('photography-video','commercial-photography','Commercial Photography','technology_aligned',5),
('photography-video','video-design','Video Design','technology_aligned',6),
('photography-video','other-photography-video','Other Photography & Video','technology_aligned',7),
('health-fitness','fitness','Fitness','academic_foundational',1),
('health-fitness','general-health','General Health','academic_foundational',2),
('health-fitness','sports','Sports','academic_foundational',3),
('health-fitness','nutrition-diet','Nutrition & Diet','academic_foundational',4),
('health-fitness','yoga','Yoga','academic_foundational',5),
('health-fitness','mental-health','Mental Health','academic_foundational',6),
('health-fitness','martial-arts-self-defense','Martial Arts & Self Defense','academic_foundational',7),
('health-fitness','safety-first-aid','Safety & First Aid','certification_aligned',8),
('health-fitness','dance','Dance','academic_foundational',9),
('health-fitness','meditation','Meditation','academic_foundational',10),
('health-fitness','other-health-fitness','Other Health & Fitness','academic_foundational',11),
('music','instruments','Instruments','academic_foundational',1),
('music','music-production','Music Production','technology_aligned',2),
('music','music-fundamentals','Music Fundamentals','academic_foundational',3),
('music','vocal','Vocal','academic_foundational',4),
('music','music-techniques','Music Techniques','academic_foundational',5),
('music','music-software','Music Software','technology_aligned',6),
('music','other-music','Other Music','academic_foundational',7),
('teaching-academics','engineering','Engineering','academic_foundational',1),
('teaching-academics','humanities','Humanities','academic_foundational',2),
('teaching-academics','math','Math','academic_foundational',3),
('teaching-academics','science','Science','academic_foundational',4),
('teaching-academics','online-education','Online Education','technology_aligned',5),
('teaching-academics','social-science','Social Science','academic_foundational',6),
('teaching-academics','language-learning','Language Learning','academic_foundational',7),
('teaching-academics','teacher-training','Teacher Training','academic_foundational',8),
('teaching-academics','test-prep','Test Prep','certification_aligned',9),
('teaching-academics','other-teaching-academics','Other Teaching & Academics','academic_foundational',10)
)
insert into education_subcategories(category_id, slug, name, freshness_model, sort_order)
select c.id, s.slug, s.name, s.freshness_model::content_freshness_model, s.sort_order
from seed s join education_categories c on c.slug=s.category_slug
on conflict (category_id, slug) do update set
  name=excluded.name, freshness_model=excluded.freshness_model,
  sort_order=excluded.sort_order, updated_at=now();

create or replace view view_education_taxonomy as
select c.id category_id, c.slug category_slug, c.name category_name,
       c.sort_order category_sort_order, s.id subcategory_id,
       s.slug subcategory_slug, s.name subcategory_name,
       s.freshness_model, s.sort_order subcategory_sort_order
from education_categories c
join education_subcategories s on s.category_id=c.id
order by c.sort_order, s.sort_order;

create or replace view view_content_freshness as
select st.id track_id, st.code, st.title, st.freshness_model,
       st.source_verified_at, st.content_review_due_at,
       case
         when st.source_verified_at is null then 'unverified'
         when st.content_review_due_at is not null and st.content_review_due_at <= now() then 'review_due'
         else 'current'
       end freshness_status,
       ce.exam_code, ce.exam_revision, ce.status exam_status,
       ce.retirement_date, ce.last_vendor_verified_at
from subject_tracks st
left join credential_exams ce on ce.id=st.credential_exam_id;
