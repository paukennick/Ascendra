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

- [x] A+ (confirmed still two exams: Core 1 220-1201 + Core 2 220-1202, both V15, launched 2025-03-25 -- built as two tracks, APLUS_CORE1 and APLUS_CORE2, sharing one `a-plus` credential row)
- [x] Network+ (confirmed current: N10-009, V9, launched 2024-06-20, not beta -- built as a single track, NETWORKPLUS)
- [x] Cloud+ (confirmed current: CV0-004, V4, launched 2024-09-24, not beta -- built as a single track, CLOUDPLUS)
- [x] Data+ (confirmed current: DA0-002, V2, launched 2025-10-14, not beta -- built as a single track, DATAPLUS)
- [x] Server+ (confirmed current: SK0-005, V5, launched 2021-05-18 -- older revision but checked for a retirement banner/successor, found none, still purchasable -- built as a single track, SERVERPLUS)
- [x] Project+ (confirmed current: PK0-005, V5, launched 2022-11-08, no retirement banner/successor -- built as a single track, PROJECTPLUS)
- [ ] Cloud Essentials+ -- BLOCKED: no longer a proctored vendor exam. CompTIA's current catalog lists it as "Cloud Essentials+ CompCert" (comptia.org/en-us/certifications/cloud-essentials/), a self-paced ~8-hour course ending in a "CompCert assessment" that awards a downloadable Competency Certificate -- no exam code, no duration, no passing score, no proctoring found anywhere on the page. None of this repo's four credential_basis values (vendor_exam, accreditation_standard, regulatory_licensure, vendor_exam_unpublished_code) represent a non-proctored competency certificate, so building this as a certification track would mean fabricating exam mechanics that don't exist. Needs a product/schema decision (new content_format or credential_basis for CompCert-style badges) before this can be built -- flagging for Nick rather than guessing.
- [x] ITF+ (IT Fundamentals) -- confirmed superseded: ITF+ (FC0-U61) was renamed and relaunched as CompTIA Tech+ (FC0-U71, V6, launched 2024-07-16); ITF+ no longer appears in CompTIA's catalog. Built under the current name, TECHPLUS.
- [x] CTT+ (Certified Technical Trainer) -- confirmed retired 2023-03-31 (last exam window TK0-201/TK0-202/TK0-203, final grading completed 2023-12-31); comptia.org/en-us/certifications/ctt/ now 404s and CTT+ no longer appears anywhere in CompTIA's current catalog nav. CompTIA has stated no plans to replace it. Not built -- nothing to build, this is a genuine retirement, not a rename.
- [x] AutoOps+ (confirmed current: AT0-001, V1, launched 2026-06-02, not beta -- built single track, AUTOOPSPLUS. Domain text is CompTIA's own on-page objectives summary; no separate PDF found live yet for this exam.)
- [x] CloudNetX (confirmed current: CNX-001, V1, launched 2025-02-18, not beta -- built single track, CLOUDNETX. Sourced from CompTIA's own "Exam Objectives Version 1.2" PDF.)
- [x] SecAI+ (confirmed current: CY0-001, V1, launched 2026-02-17, not beta -- built single track, SECAIPLUS. Sourced from CompTIA's own "Exam Objectives Document Version 2.0" PDF; that PDF still listed duration/question-count/passing-score as "TBD" so those three came from comptia.org's certification page instead.)
- [x] DataAI (confirmed current: DY0-001, V1, launched 2024-07-25, not beta -- built single track, DATAAI. Sourced from CompTIA's own "Exam Objectives Version 5.0" PDF, which still carries the pre-rebrand "DataX" name and a 2023 copyright line -- exam number/domains/weights match comptia.org's current DataAI page, so the name lag didn't block building it.)
- [ ] SecOT+ -- BLOCKED (not a sourcing gap, a timing one): still pre-order only per comptia.org, exam SOT-001 V1 launches 2026-12-01. Revisit after that date.
- [ ] DataSys+ -- BLOCKED: mid-transition, same ambiguous-version shape as Azure's DP-420 rename (see [[azure-catalog-progress]]). Currently-sold version is V1 (DS0-001, launched 2023), but its own page says it's "estimated" to retire "in 2026"; V2 (DS0-002, 6 domains, weights already published) doesn't launch until 2026-10-13. Building V1 now risks redoing this within weeks; building V2 now would ship an exam nobody can sit yet. Deferring rather than guessing, per the DP-420 precedent. Revisit after 2026-10-13.
- [ ] Cisco Networking Pro, Client Pro, CyberDefense Pro, Ethical Hacker Pro, Hybrid Server Pro I: Core, Hybrid Server Pro II: Advanced, Security Pro -- BLOCKED, same reason as Cloud Essentials+ above: each checked individually 2026-09-26 and each is a TestOut-branded "CompCert" competency assessment (performance-based tasks in a simulated environment, no CompTIA-style exam code), not a proctored certification exam with a published objectives blueprint. Same product/schema decision needed before any of these can be built.
- [ ] AI Agent/Customer Support/Essentials/Marketing/Sales/Fundamentals/Help Desk/Prompting Essentials, Business Essentials, Copilot 365 Essentials, Digital Literacy Pro, Soft Skills Essentials, Data Analysis Essentials, Project Management Essentials, Essentials All Access, Microsoft Excel/Office/Word Pro, Library Suite -- CONFIRMED 2026-09-26, same CompCert bucket as Cloud Essentials+/the Pro-tier items: fetched comptia.org's current certifications nav directly (not inferred from "Career Builder" grouping alone) and every one of these listed as a self-paced course ending in an embedded, non-proctored competency assessment -- no exam code, no external proctoring. Individually spot-checked two of the more substantial-looking ones to be sure the nav categorization held up rather than trusting it alone: Project Management Essentials (comptia.org/en-us/certifications/project-management-essentials/ -- "a 30-minute competency assessment... CompTIA Competency Certificate (CompCert)") and AI Essentials (comptia.org/en-us/certifications/ai-essentials/ -- CompTIA's own instructors' forum: "No 'exam voucher' is available for a CompCert course as there is no external exam"). BLOCKED on the same product/schema decision as the rest of the CompCert bucket -- not building any of these until that decision is made.

## Strand 2: PM certifications

Primary body: PMI (pmi.org), unless a cert below belongs to a different
body -- confirm ownership per item, don't assume all are PMI's.

- [x] CAPM (Certified Associate in Project Management) -- confirmed current: 2023 ECO update, still in effect, no rename/retirement found. Entry-level, no experience required (HS diploma/GED + 23 contact hours of PM education). Built single track, CAPM (`backend/supabase/seed/tracks/pm.ts`).
- [x] PMP (Project Management Professional) -- confirmed current, but training data would have been stale here: PMI replaced the ECO in **July 2026**, rebalancing domain weights (People 33% / Process 41% / Business Environment 26%, down from the 2021 ECO's 42/50/8) and consolidating 35 tasks to 26. The old pmi.org PDF URL now serves the new document, not the 2021 one. Built single track, PMP.
- [x] PMI-ACP (Agile Certified Practitioner) -- confirmed current, another stale-training-data trap avoided: PMI replaced the ECO in **March 2026** (itself a modernization of a November 2024 outline), reframing 4 domains around "Enterprise Agility" -- Mindset 28%, Leadership 25%, Product 19%, Delivery 28%. Built single track, PMIACP.
- [x] PgMP (Program Management Professional) -- confirmed current: March 2024 ECO (minor lexicon-alignment update), no newer revision found. 5 domains: Strategic Program Alignment 15%, Program Life Cycle Management 44%, Benefits Management 11%, Stakeholder Engagement 16%, Governance 14%. Built single track, PGMP.
- [x] PfMP (Portfolio Management Professional) -- confirmed current despite the source PDF's own 2013 copyright line: cross-checked its domain weights (25/20/25/15/15) and item-count split (150 scored + 20 pretest = 170) against multiple independent 2026-dated third-party sources, all matching exactly -- same "old file, still the live one" shape as CompTIA Server+'s precedent, verified rather than assumed. Built single track, PFMP.
- [x] PMI-RMP (Risk Management Professional) -- confirmed current: January 2023 ECO, no newer revision found. 5 domains: Risk Strategy and Planning 22%, Risk Identification 23%, Risk Analysis 23%, Risk Response 13%, Monitor and Close Risks 19%. Built single track, PMIRMP.
- [x] PMI-SP (Scheduling Professional) -- confirmed current despite a 2012-copyright source PDF, same cross-check as PfMP (170-item split matches current sources exactly). 5 domains: Schedule Strategy 14%, Schedule Planning and Development 31%, Schedule Monitoring and Controlling 35%, Schedule Closeout 6%, Stakeholder Communications Management 14%. Built single track, PMISP.
- [x] Disciplined Agile certifications -- CORRECTED 2026-09-26: DASM/DASSM (plus DAC and DAVSC) are **retired**, not just renamed. PMI stopped ATP delivery of those courses 2025-05-31 and the last exam sitting was 2025-11-30; existing holders keep their credential, but nothing in this exact shape can be built going forward. CHECKED 2026-09-27: their replacements, **Disciplined Agile Foundations** (replaces DASM, launched 2025-04-29) and **Disciplined Agile Leadership** (merges DAVSC + DAC, available Q4 2025), are both confirmed completion badges, not proctored certifications -- each awards "a Credly digital badge and certificate of completion" on passing an embedded course assessment, explicitly "rather than a traditional PMI certification" (pmvision.ca, corroborating PMI's own Credly badge page). Same CompCert-shaped gap as Strand 1's blocked batch -- BLOCKED on the same product/schema decision, not built.
- [x] Any other current PMI credential found while checking pmi.org's own certification list -- found 2026-09-26, none on the original roster above: **PMI-CP** (Construction Professional), **PMI-PMOCP** (PMO Certified Professional), **PMI-PBA** (Professional in Business Analysis), **PMI-CPMAI** (Certified Professional in Managing AI), **CSPP** (Certified Sustainable Project Professional). All five checked and built 2026-09-27: PMI-CP (Feb 2024 ECO, 4 domains, built-environment/construction focus, not general PM), PMI-PMOCP (Jan 2025 ECO V2, 6 domains, running a PMO rather than a project), PMI-PBA (old 2013 source file but cross-checked current -- 200-question split matches independent 2026 sources exactly, 5 domains), PMI-CPMAI (Sept 2025 ECO, 5 domains, no experience requirement at all -- only gate is PMI's own prep course, born from PMI's 2024 acquisition of Cognilytica), CSPP (genuinely fresh March 2026 ECO, joint PMI/GPM credential replacing GPM-b, two eligibility pathways with different domain counts -- modeled on the Certified Practitioner path's 5 domains). All five built as single tracks in `backend/supabase/seed/tracks/pm.ts`.

## Strand 3: PT (physical therapy) certifications

Different shape from the above: licensure-based, not vendor-exam-based
(same `credential_basis` modeling as nursing -- `accreditation_standard`/
`regulatory_licensure`, see migration `014`). Primary authorities: APTA
(apta.org), FSBPT (fsbpt.org) for the NPTE, and ABPTS for specialty
board certification.

- [x] NPTE licensure exam structure -- BUILT 2026-09-27, both PT and PTA exams: confirmed current against FSBPT's own NPTE Candidate Handbook (Version 2025.02, current since the June 2022 practice analysis took effect January 2024, no newer cycle found). Domain structure and item-count ranges (not percentages -- FSBPT publishes ranges, unlike NCSBN's NCLEX percentages) read directly from the handbook's content outline tables, not a third-party summary (one WebSearch summary had the two tables' totals swapped relative to the source; caught by reading the PDF directly). NPTE-PT: 225 items (180 scored/45 pretest), 14 domains, built as NPTEPT. NPTE-PTA: a genuinely separate exam, not a shorter NPTE-PT -- PTAs aren't tested on independent evaluation/diagnosis/prognosis -- 180 items (140 scored/40 pretest), 14 domains, built as NPTEPTA. Both in `backend/supabase/seed/tracks/pt.ts`, new `physical-therapy` subcategory under the existing Healthcare & Nursing category (migration 020, same reasoning as migration 013: a regulated licensure credential, not a fitness/wellness topic). Both carry `requiresAcknowledgement` with a new `pt-clinical-content` disclaimer, same pattern as nursing.
- [x] DPT entry-to-practice pathway -- BUILT 2026-10-08 from CAPTE's own 2024 "Standards and Required Elements for Accreditation of Physical Therapist Education Programs" PDF (adopted Oct 31, 2023; text updated through July 28, 2026), read directly with pymupdf. Structured on Standard 7: 7A foundational/clinical sciences, 7B ethics and leadership, 7C lifelong learning, and 7D1-7D25 practice expectations grouped the way CAPTE groups them (examination; evaluation/diagnosis/prognosis/plan of care; interventions and management; health care activities and community health; practice management). No weights -- CAPTE accredits programs, it publishes no exam blueprint -- so units are unweighted like the nursing degree tracks. Built as DPT in `backend/supabase/seed/tracks/pt-dpt.ts`, basis accreditation_standard, provider CAPTE. Original note follows for the record: NOT YET DONE. This is the academic degree-program structure (CAPTE accreditation standards for DPT curricula), distinct from the NPTE-PT exam it feeds into -- same shape as nursing's degree-ladder tracks (ADN/BSN/etc.), not a licensure exam itself. Needs its own research pass against CAPTE's standards, not attempted this session.
- [x] ABPTS specialist certifications -- ALL TEN BUILT 2026-10-08 (`backend/supabase/seed/tracks/pt-abpts.ts`), each from its own exam content outline on specialization.apta.org fetched individually: Orthopaedics (new 2026 DSP from the 2022-2025 revalidation; learning domains + body-region table), Geriatrics, Neurology, Cardiovascular & Pulmonary (case-history exam with a 60/30/10 frequently/occasionally/rarely diagnosis distribution; its own rows sum to 85% under a stated 100%, carried as published), Pediatrics, Sports, Oncology, Clinical Electrophysiology (the only outline publishing item counts: 200), Pelvic & Women's Health (RENAMED from Women's Health in September 2025, credential now PWCS -- a stale-training-data trap; its section II sub-items sum to 96% against a stated 55%, noted not corrected), Wound Management (newest, first exam 2022). Modeled as vendor_exam_unpublished_code (real proctored exams, no exam code -- same as GCP). Shared exam facts from ABPTS's exam-development and exam-resources pages: ~200 four-option MC items in four 50-question blocks of up to 90 minutes, scaled passing score 500. Eligibility from the minimum-requirements page: unrestricted US licence + 2,000 specialty hours in 10 years (500 in the last 3) or an accredited residency, plus per-specialty extras recorded on each track. Credential abbreviations only where the specialty's own page states one (OCS, PWCS). FOUND while checking: an eleventh specialty, **Primary Care**, approved by the APTA House of Delegates in 2025 -- BLOCKED on timing: its page says the first exam "is expected to be administered in 2028 or 2029" and the DSP is "Coming Soon"; nothing to author yet. Original note follows for the record: roster CONFIRMED 2026-09-27, none built yet. Current list is **10** specialties, not the 6 this file originally guessed at: Cardiovascular and Pulmonary, Clinical Electrophysiology, Geriatrics, Neurology, Oncology, Orthopaedics, Pediatrics, Sports, Women's Health, and Wound Management (the newest, first administered 2022). Source: specialization.apta.org (ABPTS's own site) and Texas's PT board's pre-approved specialty-exam list, cross-checked. Each specialty publishes its own separate exam content outline (own PDF, own domains) -- this is 10 more full sourcing-and-build passes, not one, so deferred as its own dedicated work item rather than started without the same care the NPTE tracks got.

## Strand 4: Fitness certifications

Primary bodies vary by cert -- confirm per item, these are different
organizations, not one vendor:

- [x] NASM-CPT -- BUILT 2026-10-08 from NASM's own Candidate Handbook (Updated 9/2025), Appendix A: six domains validated by the 2019 Job Analysis Study, 15/15/16/20/24/10; 120 items (100 scored), 2 hours, scaled 70. Prep sites disagree wildly on these numbers (three different splits found), which is exactly why the handbook was the only source used. NASMCPT in `backend/supabase/seed/tracks/fitness.ts`.
- [x] ACE-CPT -- BUILT 2026-10-08 from ACE's own Exam Content Outline PDF (2022 role delineation study, 14 tasks in 4 domains, 23/31/27/19; in effect since 2023-08-21 per ACE's announcement). ACECPT.
- [x] ACSM-CPT -- BUILT 2026-10-08 from ACSM's own outline PDF, 'Effective July 10, 2025': 25/43/22/10, 135 items (120 scored), 150 minutes. Older prep sites still show 25/45/20/10 and 150 items -- superseded. ACSMCPT.
- [x] NSCA-CSCS -- BUILT 2026-10-08 from the NSCA Certification Handbook 'Effective July 1, 2026', Appendix F: two sections passed separately (Scientific Foundations 80 scored: exercise science 60%/sport psychology 25%/nutrition 15%; Practical/Applied 110 scored: program design 40%/exercise technique 25%/program implementation 20%/organization & administration 15%). The older outline with a 'Testing and Evaluation' domain is superseded. Bachelor's degree + CPR/AED; CASCE-accredited degree required from 2030-01-01. NSCACSCS.
- [x] NSCA-CPT -- not on the original roster; same body, same handbook (Appendix H), built in the same pass: 23/29/36/12, 140 scored + 15, 3 hours. NSCACPT.
- [x] ISSA-CPT -- BUILT 2026-10-08 as the NCCA-accredited NCCPT-CPT (ISSA's subsidiary NCCPT runs the accredited exam; ISSA's own open-book course exam is DEAC-only and not what was modeled). Source: NCCPT Certification Programs Candidate Handbook, Appendix 2 (2020 Job Analysis Study): 25/10/15/25/15/10, 140 items (125 scored), 2 hours, Prometric. NCCPTCPT.
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

2026-09-24 09:40 UTC -- A+ (Core 1 + Core 2) -- seeded live, in-session by Claude Code rather than the (still-blocked) overnight builder agent.
2026-09-24 21:23 UTC -- Network+ -- seeded live, in-session by Claude Code rather than the (still-blocked) overnight builder agent.
2026-09-24 21:57 UTC -- Cloud+ -- seeded live, in-session by Claude Code.
2026-09-24 22:12 UTC -- Data+ -- seeded live, in-session by Claude Code.
2026-09-24 22:27 UTC -- Server+ -- seeded live, in-session by Claude Code.
2026-09-24 22:42 UTC -- Project+ -- seeded live, in-session by Claude Code.
2026-09-24 22:48 UTC -- Cloud Essentials+ -- BLOCKED, see note above; not built. Moving on to ITF+.
2026-09-24 23:00 UTC -- ITF+ -- confirmed renamed to Tech+ (FC0-U71); seeded live as TECHPLUS, in-session by Claude Code.
2026-09-24 23:01 UTC -- CTT+ -- confirmed retired 2023-03-31, no replacement; not built. Original CompTIA-remainder roster now fully worked through -- see catch-all item above for newly-discovered candidates (AutoOps+, CloudNetX, DataSys+, SecAI+, SecOT+, and several Essentials-tier items) before moving to Strand 2.
2026-09-26 -- AutoOps+, CloudNetX, SecAI+, DataAI -- all four seeded live, in-session by Claude Code (catalog now 54 tracks). SecOT+ and DataSys+ BLOCKED on timing (see notes above); Cisco Networking Pro/Client Pro/CyberDefense Pro/Ethical Hacker Pro/Hybrid Server Pro Core+Advanced/Security Pro BLOCKED on the same CompCert schema gap as Cloud Essentials+; a further batch of Essentials-tier items found on the same nav sweep still needs individual checking, not yet BLOCKED by inference. CompTIA-remainder strand now fully closed out (nothing left unblocked to check) -- next up is Strand 2 (PM certifications).
2026-09-26 -- Remaining Essentials-tier batch (AI Agent/Customer Support/Marketing/Sales/Fundamentals/Help Desk/Prompting Essentials, Business Essentials, Copilot 365 Essentials, Digital Literacy Pro, Soft Skills Essentials, Data Analysis Essentials, Project Management Essentials, Essentials All Access, Microsoft Excel/Office/Word Pro, Library Suite) -- checked individually against comptia.org's own cert nav plus two spot-checks; confirmed CompCert (non-proctored), BLOCKED on the same schema decision as Cloud Essentials+. Nothing left unblocked anywhere in Strand 1. Moving to Strand 2 (PM certifications), starting with CAPM and PMP.
2026-09-26 -- CAPM, PMP, PMI-ACP, PgMP, PfMP, PMI-RMP, PMI-SP -- all seven of the original Strand 2 roster's proctored/vendor-exam items built and seeded live, in-session by Claude Code (`backend/supabase/seed/tracks/pm.ts`, catalog growing to 67 tracks). Two of these caught real stale-training-data traps rather than just confirming continuity: PMP's ECO was replaced in July 2026 (People/Process/Business Environment rebalanced to 33/41/26, 35 tasks consolidated to 26) and PMI-ACP's in March 2026 (reframed around "Enterprise Agility"). Also found and corrected against the original roster: Disciplined Agile's DASM/DASSM/DAC/DAVSC are retired (last exam 2025-11-30), replaced by Disciplined Agile Foundations/Leadership -- not yet checked for CompCert vs. certification shape; and five PMI credentials missing from the original roster entirely -- PMI-CP, PMI-PMOCP, PMI-PBA, PMI-CPMAI, CSPP -- none built yet. Next up: check Disciplined Agile Foundations/Leadership and the five newly-found credentials, then Strand 3 (PT certifications).
2026-09-27 -- Disciplined Agile Foundations/Leadership checked and confirmed BLOCKED (completion badges, not certifications); PMI-CP, PMI-PMOCP, PMI-PBA, PMI-CPMAI, CSPP all built and seeded live (catalog 67 -> 72). **Strand 2 fully closed out at 12 PM tracks.** Moved to Strand 3 (PT certifications): NPTE-PT and NPTE-PTA both confirmed current against FSBPT's own Candidate Handbook and built as NPTEPT/NPTEPTA (new `physical-therapy` subcategory, migration 020, under the existing Healthcare & Nursing category -- same reasoning as nursing's own migration 013, not a new top-level category). ABPTS's current 10-specialty roster confirmed (Cardiovascular and Pulmonary, Clinical Electrophysiology, Geriatrics, Neurology, Oncology, Orthopaedics, Pediatrics, Sports, Women's Health, Wound Management -- the placeholder list this file started with was missing four of these) but none built -- each specialty has its own separate exam content outline, so that's 10 more sourcing-and-build passes, deferred as its own dedicated work rather than rushed. DPT entry-to-practice pathway (the academic degree structure, not an exam) also not yet started. Next up: DPT pathway, then the ABPTS specialties, one at a time with the same sourcing rigor as everything else in this file, before moving to Strand 4 (fitness certifications).
2026-10-08 -- DPT pathway + all ten ABPTS specialist certifications -- built and seeded live, in-session by Claude Code (catalog 73 -> 84 tracks, counted live after seeding). Primary Care (approved 2025, first exam expected 2028/2029, no DSP yet) BLOCKED on timing. **Strand 3 fully closed out at 13 PT tracks.** Next up: Strand 4 (fitness certifications), starting with NASM-CPT.
2026-10-08 -- Strand 4 (fitness): NASM-CPT, ACE-CPT, ACSM-CPT, NSCA-CSCS, NSCA-CPT, NCCPT-CPT (ISSA) -- all six built and seeded live, in-session by Claude Code, every one from the certifying body's own current handbook or outline PDF (catalog 84 -> 90). **Strand 4 closed.** Also 2026-10-08: the catalog became SHARED (REQ-082) -- seeded tracks now have user_id null and every account sees them; the seed no longer copies the catalog per user. Next: Strand 5 (Udemy/Coursera taxonomy gaps).
2026-10-31 -- Requested directly by Nick, outside the strand order: CCRN Adult, Pediatric and Neonatal (AACN Certification Corporation, CCRN Exam Handbook - Direct Care, July 2026; test plans effective 2025-11-12, Pediatric 2025-11-19 as printed; basis vendor_exam_unpublished_code; subcategory nursing-specialty-certifications) and MS Health Informatics (CAHIIM master's curriculum requirements = AMIA 2017 core competencies F1-F10, CAHIIM 2023 master's standards; basis accreditation_standard; new subcategory health-informatics, migration 024). Built by background agents, reviewed and seeded in-session by Claude Code (catalog 90 -> 94). Traps: CAHIIM's curriculum PDF lives under /wp-content/uploads/sites/2/ (the path without sites/2 404s); AACN's credential pages are /ccrn-peds and /ccrn-neo, not /ccrn-pediatric or /ccrn-neonatal; Peds/Neo printed weights sum to 101 and 98. Unsourced clinical examples the agents added were stripped so every example is AACN's own.
