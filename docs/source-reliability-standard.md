# Source reliability standard for course objectives

Adopted 2026-10-31. Applies to every objective added to a course in
`backend/supabase/seed/tracks/`, starting with the nursing courses.

Open licences, including non-commercial ones (CC BY-NC, CC BY-NC-SA,
CC BY-NC-ND), are accepted when the source meets the standard below. We take
topics and facts from sources and write every objective in our own words;
no source text is copied.

## Source tiers

**Tier 1: authoritative.** These settle disagreements.
- The credentialing body's own published documents: exam test plans,
  handbooks, accreditation standards (for example AACN, NCSBN, CAHIIM).
- Government agencies and regulations: CDC, CMS, FDA, NIH/NLM, ONC
  (HealthIT.gov), HHS, eCFR.
- Standards bodies, for the standards they publish (for example HL7 for FHIR).
- Current clinical practice guidelines from a recognised professional
  society (for example AAP, AHA, SCCM / Surviving Sepsis, ILAE, ADA, KDIGO,
  ACOG, NRP).

**Tier 2: reliable references.** These can support an objective on their own.
A source qualifies only if it meets every one of these criteria:
1. Named authors or editors whose credentials fit the subject.
2. Stated editorial or peer review, or named reviewers.
3. An identifiable publisher: a university, an established academic or open
   publisher, a government-funded open-textbook programme, or NCBI Bookshelf.
4. A date. For clinical content, published or updated within the last
   5 years. Older is acceptable for theory and frameworks only.
5. No commercial interest in the topic. Not a vendor's or test-prep
   company's marketing material.

Examples that meet the bar: OpenStax and Open RN nursing texts, StatPearls
(peer-reviewed, dated, author-credentialed), and Springer open-access books.

**Not acceptable as the only support for an objective:**
- test-prep sites
- blogs
- Wikipedia
- AI-generated content
- forum posts
- vendor marketing

Published course catalogues and syllabi (universities, Coursera, Udemy)
can show that a topic belongs in a curriculum. They cannot support a factual
or clinical claim, and an objective needs at least one Tier 1 or Tier 2
source as well.

## When sources disagree

1. Check the point against the current Tier 1 guideline or regulation and
   follow it. Record the guideline (body, title, year) in the file header.
2. If no Tier 1 source covers it, or two Tier 1 sources conflict, leave the
   disputed number, drug or cut-off out of the objective. State the
   principle instead, and record the dispute in the file header.
3. Never resolve a disagreement by picking the source we prefer, or from
   memory.

## Recording

Each course file's header lists every source with title, publisher,
edition or year, URL, licence and access date, and records which tier it
falls in. Disagreements and how they were resolved are listed in the same
header.

## Re-checking (REQ-142)

Sources go stale: outlines are revised, guidelines updated, cloud limits
and prices changed. Each course's exam outline is dated in its seed track
(the credential block's `lastVendorVerifiedAt`, and `sourceVerifiedAt` /
`contentReviewDueAt`), and each authored lab's sources carry a checked date
and a re-check date (`backend/supabase/seed/sources.ts`). Default re-check:
12 months after the check for exam outlines and references, 6 months for
clinical guidelines and cloud prices or service limits; set `recheckBy`
earlier when the publisher has announced a change. `npm run currency:report`
(from `backend/`, no network) lists everything overdue or due within 60 days
by course, plus the courses that record no outline or no outline version.
It is a to-do list, not a gate: stale content keeps being served until a
person re-checks it and updates the date.

What to record (2026-11-08):

- **Outline version.** The version the course's objectives follow, as the
  publisher prints it: an exam code (SAA-C03), Microsoft's "Skills measured
  as of" date, a Google guide's version or date, a PMI outline's copyright
  year, an ABPTS Description of Specialty Practice edition. Put it in the
  credential block's `objectivesRevision` (not `examRevision`: that is part of
  the exam row's identity, and changing it would add a second exam row on the
  next production seed). When the publisher prints none, say so in
  `versionNote`; the report lists those with the reason instead of as
  missing. When the live outline is newer than the course, record the older
  version the objectives follow, leave the verified date at the last full
  read, and set `contentReviewDueAt` to the change date (DP-300, Google
  Cloud DevOps).
- **A review date only moves forward through the seed** (REQ-244,
  FAIL-1540, FAIL-1541). The seed writes `sourceVerifiedAt` and
  `contentReviewDueAt` with `coalesce`: a value can be set but never
  cleared. When a re-check ends a review, set a later `contentReviewDueAt`
  (by default the check date plus 12 months); never delete the line. A
  deleted line leaves the old date in the database and the course shows
  "Review due" for good, as DP-300 (2026-10-27) and Google Cloud DevOps
  (2026-11-23) would have after the 2026-11-09 audit removed theirs. A
  course whose stored date was removed is pinned in
  `backend/lib/course-verification-req244.test.ts` (`STORED_REVIEW_DUE`) so
  it keeps a later one; add a course there if its line is ever removed or
  moved earlier.
- **A course with no exam** records `curriculum` on its seed track: the
  language's official reference, the school's published degree plan, or
  `self_defined` for a syllabus the course writes itself.
- **A clinical or fitness lab's values.** The set's `sources` say a topic is on
  the exam; they do not make a blood-pressure limit or a dose right. Each
  nursing (NCLEX, CCRN), fitness (NASM, ACE, ACSM, NCCPT, NSCA) and physical
  therapy (NPTE, DPT, ABPTS) lab names the guideline its values rest on, or
  says why it names none, in `backend/supabase/seed/labs/value-sources.ts`
  (`labs.test.ts` enforces it for every one of those track codes; NCLEX and
  CCRN sources must be `kind: "clinical_guideline"`, so the 6-month re-check
  applies). Check the
  guideline's own publisher page, never a summary. When a lab disagrees with
  the current guideline, do not edit the lab to match: report it for the
  clinical reviewer, because the reviewed wording and the rubric move together.
