# Catalog build backlog

Shared checkpoint between Claude Code sessions and the autonomous
overnight builder agent (`agent_...`, see `docs/catalog-review-agent.md`
for the sibling quarterly-review agent's pattern -- this is a different
agent, built for authoring, not reviewing). Read this file first each
session/firing: pick the first `[ ]` item in the first strand that has
one, build it, check it off in the same commit that adds it.

**Order is fixed** (confirmed by Nick 2026-09-24): CompTIA-remainder →
PM certs → PT certs → fitness certs → Udemy/Coursera taxonomy gaps.

**Sourcing rule applies to every item below, no exceptions:** fetch the
certifying body's own current page before authoring anything -- never
trust this file's cert code, exam count, or status as already verified.
Items here are a checklist to verify, not a confirmed roster (the GCP
strand's roster was wrong in several places until each cert was checked
directly -- same discipline applies here). If a cert turns out
retired/renamed/beta, correct this file and move on to the next item
rather than guessing.

**If a course's authoritative source can't be found, isn't public, or is
ambiguous:** stop on that one item, write why in this file next to it
under a `BLOCKED:` note, and move to the next item. Do not fabricate
content to fill a sourcing gap -- standing rule from
[[course-catalog-expansion]] applies here unchanged.

**Udemy/Coursera sourcing split (confirmed 2026-09-24):** for CompTIA/PM/PT/
fitness certs below, a named certifying body (CompTIA, PMI, state PT boards,
NASM/ACE/ACSM/NSCA, etc.) is still the primary source, the same as AWS/
Azure/GCP. Udemy and Coursera are a secondary structuring input there.
For the taxonomy-gap strand specifically, Udemy/Coursera syllabi become the
primary structuring input (no single certifying body exists for those
categories) -- paraphrase and derive, never reproduce their text.

---

## Strand 1: CompTIA remainder

Already built (do not duplicate): Security+ (SY0-701), Linux+ (XK0-006),
CySA+ (CS0-003), PenTest+ (PT0-003), SecurityX (CAS-005) -- all in
`backend/supabase/seed/data.ts`.

Candidates below are unverified -- confirm each against
`certification.comptia.org` before building; exam codes are from training
data and may be stale the same way AWS's were:

- [ ] A+ (currently two exams, Core 1 + Core 2 -- confirm still split)
- [ ] Network+
- [ ] Cloud+
- [ ] Data+
- [ ] Server+
- [ ] Project+
- [ ] Cloud Essentials+
- [ ] ITF+ (IT Fundamentals) -- confirm not superseded/retired
- [ ] CTT+ (Certified Technical Trainer) -- confirm still offered
- [ ] Any other current CompTIA cert not listed above, found while checking the vendor's own certification page

## Strand 2: PM certifications

Primary body: PMI (pmi.org), unless a cert below belongs to a different
body -- confirm ownership per item, don't assume all are PMI's.

- [ ] CAPM (Certified Associate in Project Management)
- [ ] PMP (Project Management Professional)
- [ ] PMI-ACP (Agile Certified Practitioner)
- [ ] PgMP (Program Management Professional)
- [ ] PfMP (Portfolio Management Professional)
- [ ] PMI-RMP (Risk Management Professional)
- [ ] PMI-SP (Scheduling Professional)
- [ ] Disciplined Agile certifications (DASM/DASSM or current equivalents) -- confirm current PMI DA branding
- [ ] Any other current PMI credential found while checking pmi.org's own certification list

## Strand 3: PT (physical therapy) certifications

Different shape from the above: licensure-based, not vendor-exam-based
(same `credential_basis` modeling as nursing -- `accreditation_standard`/
`regulatory_licensure`, see migration `014`). Primary authorities: APTA
(apta.org), FSBPT (fsbpt.org) for the NPTE, and ABPTS for specialty
board certification.

- [ ] DPT entry-to-practice pathway + NPTE licensure exam structure
- [ ] ABPTS specialist certifications (e.g., orthopedic, neurologic, sports, pediatric, geriatric, cardiovascular & pulmonary -- confirm current full list on abpts.org)
- [ ] PTA (Physical Therapist Assistant) pathway + its own NPTE-PTA exam

## Strand 4: Fitness certifications

Primary bodies vary by cert -- confirm per item, these are different
organizations, not one vendor:

- [ ] NASM-CPT (National Academy of Sports Medicine)
- [ ] ACE-CPT (American Council on Exercise)
- [ ] ACSM-CPT (American College of Sports Medicine)
- [ ] NSCA-CSCS (Certified Strength and Conditioning Specialist)
- [ ] ISSA-CPT (International Sports Sciences Association)
- [ ] Any other widely-recognized current fitness certification found while researching the above

## Strand 5: Udemy/Coursera taxonomy gaps

Not yet scoped to specific courses -- identify gaps first (categories/
subcategories in `docs/education-taxonomy.md` that are thin or empty),
cross-reference against well-established Udemy/Coursera course topics in
that space, then add specific items to this list before building any of
them. Do not build directly from this placeholder line.

---

## Session log

Each session/firing appends one line here on completion (or on stopping
for a `BLOCKED:` item), so progress is visible without reading full git
history: `YYYY-MM-DD HH:MM UTC -- <item> -- <result: seeded live / PR
opened #N / blocked, see note above>`.
