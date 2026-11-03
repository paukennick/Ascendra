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
