-- Widen credential_exams to cover qualifications that are not vendor exams.
--
-- Migration 007 modelled one shape: a vendor publishes an exam with a code,
-- a blueprint URL and a revision, and we track when we last verified it.
-- That fits AWS and CompTIA exactly. It does not fit the nursing ladder.
--
-- A Certified Nursing Assistant credential is a state-approved training
-- program plus a competency evaluation, with requirements set by each state
-- board under federal minimums -- there is no single exam code. A BSN is an
-- accredited degree whose content authority is a standards document (the
-- AACN Essentials), revised on its own cadence. Both still need exactly what
-- credential_exams exists to give: a named authority, a revision, a source
-- URL, and a verification date that freshness reporting can act on.
--
-- So rather than inventing fake exam codes, exam_code becomes optional and
-- the row records what kind of authority it is describing.
--
-- The table keeps its name. "Exam" is now the common case rather than the
-- only case, and renaming it would churn every reference for a word.

do $$ begin
  create type credential_basis as enum ('vendor_exam', 'accreditation_standard', 'regulatory_licensure');
exception
  when duplicate_object then null;
end $$;

alter table credential_exams
    alter column exam_code drop not null,
    add column if not exists basis credential_basis not null default 'vendor_exam',
    -- The governing document when there is no exam blueprint: "AACN
    -- Essentials", "42 CFR 483.152", a state nurse practice act.
    add column if not exists standard_name varchar(255),
    -- That document's own version or year, kept separate from exam_revision
    -- so a standards revision is not mistaken for an exam version change.
    add column if not exists standard_revision varchar(100);

-- Every row must be identifiable by something. A vendor exam is identified by
-- its code; an accreditation or licensure row by the standard it follows.
alter table credential_exams
    drop constraint if exists credential_exams_identified;
alter table credential_exams
    add constraint credential_exams_identified
    check (exam_code is not null or standard_name is not null);

-- The original unique(credential_id, exam_code, exam_revision) stops working
-- once exam_code can be null, because NULLs compare as distinct and a re-run
-- would insert a duplicate every time. Replace it with an expression index
-- that treats absent values as the empty string, which is also what lets the
-- seed script stay idempotent for these rows.
alter table credential_exams
    drop constraint if exists credential_exams_credential_id_exam_code_exam_revision_key;

create unique index if not exists idx_credential_exams_identity
    on credential_exams (
        credential_id,
        coalesce(exam_code, ''),
        coalesce(exam_revision, ''),
        coalesce(standard_name, '')
    );
