# Ascendra education taxonomy and freshness model

Ascendra uses the taxonomy for navigation and classification, not as a substitute for curriculum records. The database contains all 13 primary categories and their subcategories.

## Freshness models

- `certification_aligned`: vendor credentials, licensure, and exam preparation. Content is tied to a provider, credential, exam code, objective revision, lifecycle status, effective/retirement dates, and an official vendor source.
- `technology_aligned`: software, tools, platforms, technical workflows, and fast-changing market practices. Content records the relevant technology/version, source, verification date, and next review date.
- `academic_foundational`: stable academic or practical foundations. Content records its curriculum standard or source, last review, and next pedagogical review.

The subcategory selects the default model. An individual track may override it when the actual course posture differs. For example, Project Management defaults to certification-aligned because many tracks target PMP or CAPM, while a university project-management survey course may override that default to academic-foundational.

## Publication rules

Non-draft certification exams cannot be stored without both an official objectives URL and a vendor-verification timestamp. Exam lifecycle states are `draft`, `active`, `transitioning`, `beta`, `retired`, and `archived`.

The `view_content_freshness` view reports each course as `unverified`, `review_due`, or `current`. A course is never labeled current merely because its title matches a current technology or credential.

## API

Authenticated clients can call `GET /api/taxonomy`. The response contains ordered categories, ordered subcategories, and the freshness model assigned to each subcategory.
