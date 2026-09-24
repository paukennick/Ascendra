# Ascendra education taxonomy and freshness model

Ascendra uses the taxonomy for navigation and classification, not as a substitute for curriculum records. The database contains all 14 primary categories (13 from REQ-020, plus Healthcare & Nursing from REQ-022) and their subcategories.

The home screen (`mobile/app/(app)/index.tsx`) groups a learner's courses by category, favorites pulled out on top, since `GET /api/courses` now joins each track's subcategory, category, and freshness status onto the row it returns (REQ-036). Each course card also shows a freshness badge -- Verified, Review due, or Unverified -- driven directly by the freshness status below.

Delivery format is a separate axis from this taxonomy and from `track_type`. `subject_tracks.content_format` (REQ-037) records what kind of thing a track is -- today only `full_course` exists, since every track is still a full guided course with units, objectives, mastery grading, PBQ, and chat -- so future formats (practice-exam-only tracks, flashcard decks, short readings) have somewhere to go without overloading `track_type`, which stays the pedigree/audience axis (graduate, certification, academic, professional, skills).

## Freshness models

- `certification_aligned`: vendor credentials, licensure, and exam preparation. Content is tied to a provider, credential, exam code, objective revision, lifecycle status, effective/retirement dates, and an official vendor source.
- `technology_aligned`: software, tools, platforms, technical workflows, and fast-changing market practices. Content records the relevant technology/version, source, verification date, and next review date.
- `academic_foundational`: stable academic or practical foundations. Content records its curriculum standard or source, last review, and next pedagogical review.

The subcategory selects the default model. An individual track may override it when the actual course posture differs. For example, Project Management defaults to certification-aligned because many tracks target PMP or CAPM, while a university project-management survey course may override that default to academic-foundational.

## Publication rules

Non-draft certification exams cannot be stored without both an official objectives URL and a vendor-verification timestamp. Exam lifecycle states are `draft`, `active`, `transitioning`, `beta`, `retired`, and `archived`.

A credential is identified by an `exam_code` (AWS, Azure), a `standard_name` (accreditation/licensure credentials with no exam at all -- nursing), or, since REQ-040, the `basis` value `vendor_exam_unpublished_code` alone -- for a real vendor exam whose vendor simply never publishes a code (Google Cloud). `credential_exams_identified` requires at least one of the three; no credential row can exist unidentified.

The `view_content_freshness` view reports each course as `unverified`, `review_due`, or `current`. A course is never labeled current merely because its title matches a current technology or credential. Since REQ-042, most of that reporting is kept current by an automated quarterly agent rather than only by manual re-authoring passes -- see [catalog-review-agent.md](catalog-review-agent.md).

## API

Authenticated clients can call `GET /api/taxonomy`. The response contains ordered categories, ordered subcategories, and the freshness model assigned to each subcategory.
