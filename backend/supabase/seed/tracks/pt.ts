// Physical therapy tracks: the two NPTE licensure examinations
// (Strand 3 of docs/catalog-backlog.md). Different shape from the
// vendor-cert tracks elsewhere in this repo -- these are state licensure
// exams, same modeling as nursing's NCLEX tracks (migration 014's
// regulatory_licensure basis), not a proctored vendor certification with an
// exam code a private company sells.
//
// Every domain name and item-count range below was read on 2026-09-27
// directly from FSBPT's own NPTE Candidate Handbook (Version 2025.02, the
// current cycle since the June 2022 practice analysis took effect January
// 2024) -- not a summary of it. FSBPT publishes item-count ranges per
// domain, not percentages (unlike NCSBN's NCLEX test plans) -- weight below
// carries each range's midpoint as a percentage of that exam's scored-item
// total, same technique nursing.ts already established for NCLEX's ranges;
// rangeLabel keeps FSBPT's own published range so the learner sees what the
// vendor actually promises, not just our derived number.
//
// Objectives are written in our own words from the content outline's body
// systems and process areas -- deliberately not copied, same rule the
// nursing tracks follow.
//
// Both tracks set requiresAcknowledgement: physical therapy content acted
// on in practice has patient-safety consequences, same as nursing.
//
// Corrected 2026-11-09 (content audit): each rangeLabel's denominator is the
// scored-item total FSBPT's 2024 content outlines print ("TOTAL 180" for
// NPTE-PT, "TOTAL 140" for NPTE-PTA, re-read that day), not the full form
// with pretest items (225 and 180); the ranges and weights are unchanged.
// The SpO2 objective now reads 94-98% (88-92% with a hypercapnia risk), per
// the BTS 2017 emergency oxygen guideline.
//
// Deepened 2026-11-04 under docs/source-reliability-standard.md (adopted
// 2026-10-31). New objectives sit at the END of existing units only, each
// group after an "Added 2026-11-04" marker and each line with an inline
// source tag. No unit, weight, rangeLabel, gate or earlier objective was
// touched and no unit was added, because the seed matches by unit and
// position and FSBPT's item ranges fix the weights.
//
// Scope versus depth: FSBPT's 2024 content outlines decide whether a topic
// belongs on each exam; guidelines and textbooks supply the depth. NPTE-PTA
// objectives follow the PTA outline (its own columns: data collection,
// conditions that affect treatment, interventions) and use PTA verbs --
// carry out within the plan of care, collect data, monitor, report, hold
// and consult the PT -- per CAPTE PTA elements 7D1-7D3 and CMS Benefit
// Policy Manual ch. 15 sec. 230.1, which bars PTAs from evaluation,
// clinical judgments and designing maintenance programs.
//
// Inline tag key: FSBPT-PT pN / FSBPT-PTA pN = page of the 2024 content
// outline; CAPTE-PTA 7Dn = PTA required element; CMS-BPM15 n = Medicare
// Benefit Policy Manual ch. 15 section; CFR 410.60 = 42 CFR 410.60;
// APTA-SEC = Standards of Ethical Conduct for the PTA; CPG-xxx = guideline
// below; SP-xxx = StatPearls chapter below; AP n.n = OpenStax Anatomy and
// Physiology 2e section.
//
// Tier 1 (credentialing body, regulator, government, professional-society
// guideline), all accessed 2026-11-04:
// - FSBPT, "NPTE-PT Test Content Outline, effective January 2024" (bullets
//   edition) and "NPTE-PTA Test Content Outline, effective January 2024"
//   (bullets edition); the with-rubrics editions (PT v1.1 2023-08-25, PTA
//   v1.2 2023-09-28) were also read and carry the same bullets.
//   https://www.fsbpt.org/Portals/0/documents/free-resources/2024-PT-Test-Content-Outline-Bullets.pdf
//   https://www.fsbpt.org/Portals/0/documents/free-resources/2024-PTA-Test-Content-Outline-Bullets.pdf
//   Copyright FSBPT. Used for scope only; no outline wording reproduced.
//   NPTE Candidate Handbook, Version 2025.02 (Appendix A tables), re-read.
// - CAPTE, "Standards and Required Elements for Accreditation of Physical
//   Therapist Assistant Education Programs" (text updated through
//   2026-07-28), Standard 7. Copyright 2026 APTA, all rights reserved; scope
//   only.
//   https://www.capteonline.org/globalassets/capte-docs/2024-capte-pta-standards-required-elements.pdf
// - CMS, Medicare Benefit Policy Manual, ch. 15, Rev. 13889 (issued
//   2026-07-30): sec. 220.1.2 (plan of care, Rev. 255), 220.1.3
//   (certification), 220.2 (maintenance programs), 220.3 (progress reports,
//   treatment and discharge notes), 230.1 (practice of PT, PTAs; Rev. 179,
//   effective 2014-01-07). Public domain.
//   https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/bp102c15.pdf
// - eCFR, 42 CFR 410.60 (outpatient PT; last amended 89 FR 98556,
//   2024-12-09), read through the eCFR versioner API at 2026-10-30. Public
//   domain. https://www.ecfr.gov/current/title-42/section-410.60
// - APTA, "Standards of Ethical Conduct for the Physical Therapist
//   Assistant", HOD S06-20-31-26. Copyright 2020 APTA; scope only.
//   https://www.apta.org/siteassets/pdfs/policies/standardsofethicalconductptahods06-20-31-26-.pdf
// - APTA clinical practice guidelines, open access through Europe PMC
//   (full-text XML), each read in full:
//   CPG-TKA  Physical therapist management of total knee arthroplasty:
//            revision 2026. APTA. Phys Ther 106 (2026-07-27),
//            doi:10.1093/ptj/pzag058, PMC13403188. CC BY-NC 4.0.
//   CPG-FALL Physical therapy management of fall risk in community-dwelling
//            older adults. APTA-Geriatrics. J Geriatr Phys Ther 48 (2025),
//            doi:10.1519/JPT.0000000000000454, PMC12533762. CC BY-NC-ND 4.0.
//   CPG-DFU  Diabetic foot ulcer beyond wound closure. APTA Academy of
//            Clinical Electrophysiology and Wound Management. Phys Ther 105
//            (2025), doi:10.1093/ptj/pzae171, PMC11962593. CC BY-NC 4.0.
//   CPG-TELE Telerehabilitation in physical therapist practice. APTA. Phys
//            Ther 104 (2024), doi:10.1093/ptj/pzae045, PMC11140266. CC BY-NC.
//   CPG-OSTEO Physical therapist management of patients with suspected or
//            confirmed osteoporosis. APTA Academy of Geriatric PT. J Geriatr
//            Phys Ther 44 (2022), doi:10.1519/JPT.0000000000000346,
//            PMC8983944. CC BY-NC-ND 4.0.
//   CPG-VEST Vestibular rehabilitation for peripheral vestibular
//            hypofunction: updated CPG. APTA Academy of Neurologic PT. J
//            Neurol Phys Ther 46 (2022), doi:10.1097/NPT.0000000000000382,
//            PMC8920012. CC BY-NC-ND 4.0.
//   CPG-PD   Physical therapist management of Parkinson disease. APTA. Phys
//            Ther 102 (2021-12-28), doi:10.1093/ptj/pzab302, PMC9046970.
//            CC BY-NC 4.0.
//   CPG-BCRL Interventions for breast cancer-related lymphedema. APTA
//            Academy of Oncologic PT. Phys Ther 100 (2020),
//            doi:10.1093/ptj/pzaa087, PMC7412854. CC BY-NC 4.0. Six years
//            old; no revision found (APTA Oncology lists a newer
//            cancer-related lymphedema CPG as "in review"), so treated as
//            current.
//   CPG-COM  A core set of outcome measures for adults with neurologic
//            conditions undergoing rehabilitation. APTA Academy of
//            Neurologic PT. J Neurol Phys Ther 42 (2018),
//            doi:10.1097/NPT.0000000000000229, PMC6023606. CC BY-NC-ND 4.0.
//            APTA's CPG page (checked 2026-11-04) still lists it as current
//            with "an update ... in progress".
//
// Tier 2 (graded against the five criteria: 1 credentialed authors, 2
// stated review, 3 identifiable publisher, 4 dated within 5 years for
// clinical content, 5 no commercial interest):
// - StatPearls (StatPearls Publishing, on NCBI Bookshelf, NBK430685),
//   CC BY-NC-ND 4.0. Meets all five: named authors with affiliations and
//   per-author conflict-of-interest statements, editorial and peer review,
//   NCBI Bookshelf, per-chapter update dates (all chapters below updated
//   2022-08 or later, inside the 5-year window), and the standard names it
//   as meeting the bar. Author degrees are not carried in the Bookshelf
//   XML, only names and affiliations. NCBI's web pages returned a
//   reCAPTCHA wall, so chapters were read from NCBI's bulk open-access
//   archive (ftp.ncbi.nlm.nih.gov/pub/litarch, StatPearls package dated
//   2026-10-25), accessed 2026-11-04. Chapters cited (tag, title, last
//   updated, Bookshelf ID):
//   (* Bookshelf ID lookup failed; StatPearls article number given.)
// - OpenStax, "Anatomy and Physiology 2e", Betts, Young et al., Rice
//   University, 2022 (published 2022-04-20). CC BY 4.0.
//   https://openstax.org/details/books/anatomy-and-physiology-2e
//   Accessed 2026-11-04. All five met: senior authors J. Gordon Betts
//   (Tyler Junior College) and Kelly A. Young (California State
//   University, Long Beach) with named contributing authors and reviewers;
//   non-profit university publisher; foundational science, so the 5-year
//   clinical limit does not bind. Sections cited: .
//
// Sources tried and not used:
// - NCBI Bookshelf web pages (reCAPTCHA); read from the FTP archive instead.
// - JOSPT guideline pages (HTTP 403), so no JOSPT orthopaedic CPG is cited.
// - CDC infection-control pages (HTTP 403); hand hygiene and airborne
//   precautions come from StatPearls only, and no CDC numbers are used.
// - ADA Standards of Care in Diabetes (HTTP 403); see the glucose entry
//   below.
// - APTA glenohumeral OA CPG (2023) and the 2017 upper-quadrant
//   lymphedema diagnosis CPG were downloaded but not needed.
// - Physiopedia was not used.
//
// Where sources disagreed, and what we did (checked 2026-11-04):
// - PTA supervision, resolved 2026-11-06 (Nick): 42 CFR 410.60(c)(2), read
//   on eCFR 2026-11-06, says a PTA may work under the general supervision
//   of a PT in private practice (CY2025 fee-schedule rule, effective
//   2025-01-01). The Benefit Policy Manual ch. 15 still prints the old
//   direct-supervision wording (sec. 230.4, not 230.1); the regulation
//   governs, so the objective names general supervision plus the note
//   that state law, payers or facilities may be stricter.
// - FSBPT's own documents differ on two outline totals: the 2025.02
//   Candidate Handbook prints Musculoskeletal as 45-54 items and the
//   Interventions column total as 45-58, while the 2024 content-outline
//   PDFs print 44-54 and 47-58. Both are FSBPT (Tier 1). The existing
//   rangeLabel "45-54" (then "of 225 items") and weight were left untouched
//   (append-only); flagged for Nick.
//   Decided 2026-11-06 (Nick): keep 45-54, because the 2025.02 handbook is
//   newer than the 2024 outline.
// - PTA supervision in private practice: CMS Benefit Policy Manual sec.
//   230.1 (Rev. 179, 2014) says private practice requires direct
//   supervision of PTAs, while 42 CFR 410.60(c) as amended through
//   2024-12-09 allows general supervision by a PT in private practice. Two
//   Tier 1 sources conflict, so no objective names a supervision level for
//   a setting; the objective states the principle (follow the setting,
//   payer and state rules, and the strictest when they differ). Flagged.
// - Berg Balance Scale fall-risk cut-off: the 2025 APTA-Geriatrics falls
//   CPG (Tier 1) uses under 50 for community-dwelling older adults;
//   StatPearls "Berg Balance Testing" gives under 45 (and under 51 with a
//   fall history). We followed the CPG and name it; the PTA Berg objective
//   carries no cut-off.
// - 6-minute walk test meaningful change: StatPearls "Six-Minute Walk
//   Test" gives 30 m (citing the ATS technical standard, not opened) and
//   also 14.0-30.5 m from a systematic review across cardiopulmonary
//   conditions. No Tier 1 source opened settles it, so no objective names
//   a meaningful-change figure.
// - Exercise glucose thresholds: StatPearls "Diabetes and Exercise" gives
//   fast-acting carbohydrate below 100 mg/dL and avoiding vigorous
//   exercise above 250 mg/dL. The ADA standard could not be opened to
//   confirm the upper figure, which is known to be handled differently
//   across guidelines, so the 250 mg/dL figure was left out. The 100 mg/dL
//   figure and the hypoglycemia definition (under 70 mg/dL, StatPearls
//   "Hypoglycemia") were cross-checked against the other files held and no
//   conflict was found.
// - Numbers resting on one source, with no conflict found in the other
//   files held: orthostatic hypotension (20/10 mm Hg within 3 min), 6MWT
//   30 m course, pulmonary rehab Borg 4-6 or RPE 12-14, SpO2 targets 92-98% and 88-92%, polypharmacy at 5 or more
//   drugs, chronic pain beyond 3 months, crutch fit (2 finger widths, ~30
//   degrees elbow flexion), wheelchair 1 inch thigh clearance, hip
//   precautions (90 degrees flexion), falls exercise dose (150 min to 3
//   h/week for 6-12 months), DFU offloading (~3 months), Medicare timing (30 days, 90
//   days, 10 treatment days).

import type { SeedTrack } from "../data";
import { DPT_TRACK } from "./pt-dpt";
import { ABPTS_TRACKS } from "./pt-abpts";

const FSBPT_PROVIDER = {
  providerSlug: "fsbpt",
  providerName: "Federation of State Boards of Physical Therapy",
  providerUrl: "https://www.fsbpt.org/",
  subcategorySlug: "physical-therapy",
  credentialType: "licensure_examination",
} as const;

const VERIFIED_AT = "2026-09-27T00:00:00Z";

const PT_DISCLAIMER_KEY = "pt-clinical-content";

// ---------------------------------------------------------------------------
// NPTE-PT -- the entry-level physical therapist licensure examination.
// Required in every US state/territory to practice as a PT; taken after
// graduating a CAPTE-accredited (or equivalent) DPT program.
//
// 225 items total (180 scored, 45 unscored pretest), computer-based,
// multiple choice. Body-system domains are further split three ways within
// each system (Foundations / Evaluation-Diagnosis-Prognosis /
// Interventions), but FSBPT's own published breakdown is per-system, not
// per-split, so that's what's modeled here.
// ---------------------------------------------------------------------------
export const NPTE_PT_TRACK: SeedTrack = {
  code: "NPTEPT",
  title: "NPTE-PT Coach",
  description:
    "The physical therapist licensure examination, built on FSBPT's current NPTE-PT Test Content Outline: 14 body-system and non-system domains, weighted by the exam's own published item-count ranges.",
  trackType: "certification",
  subcategorySlug: "physical-therapy",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.fsbpt.org/Free-Resources/NPTE-Candidate-Handbook/Content-Outline",
  sourceVerifiedAt: VERIFIED_AT,
  requiresAcknowledgement: true,
  disclaimerKey: PT_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    ...FSBPT_PROVIDER,
    credentialSlug: "npte-pt",
    credentialName: "National Physical Therapy Examination (NPTE-PT)",
    credentialUrl: "https://www.fsbpt.org/Secondary-Pages/Exam-Candidates/National-Exam-NPTE",
    basis: "regulatory_licensure",
    examCode: "NPTE-PT",
    examRevision: "Version 2025.02 (current since the January 2024 practice-analysis update)",
    standardName: "NPTE-PT Test Content Outline",
    standardRevision: "2025.02",
    status: "active",
    effectiveDate: "2024-01-01",
    officialObjectivesUrl:
      "https://www.fsbpt.org/Portals/0/documents/free-resources/NPTE_Candidate_Handbook.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Graduation from a CAPTE-accredited (or equivalent) Doctor of Physical Therapy program. The exam assumes entry-level practice.",
    durationMinutes: 300,
    questionFormat: "225 items (180 scored, 45 unscored pretest); multiple choice, computer-based",
    passingScorePolicy: "Scaled score of 600 on a 200-800 scale.",
  },
  units: [
    {
      title: "Musculoskeletal System",
      rangeLabel: "45-54 of 180 scored items",
      weight: 27,
      gate: "Given a musculoskeletal presentation, name the specific structure, special test, or intervention it calls for -- not a generic 'treat the joint' answer.",
      objectives: [
        "Differentiating musculoskeletal pathologies by history, mechanism of injury, and pattern of symptoms",
        "Selecting and interpreting orthopedic special tests for a given joint complaint",
        "Applying manual therapy and therapeutic exercise appropriate to tissue healing stage and irritability",
        "Prognosticating recovery timelines and functional outcomes for common musculoskeletal conditions",
        "Recognizing red flags that require referral rather than continued PT management",
        "Selecting outcome measures appropriate to a musculoskeletal condition and functional goal",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Teach total hip arthroplasty precautions by surgical approach: after a posterior approach avoid hip flexion past 90 degrees, adduction and internal rotation; after an anterior approach avoid extension with external rotation", // SP-HIPPREC
        "Plan total knee arthroplasty rehab as the 2026 APTA guideline does: passive, active-assisted and active range of motion rather than continuous passive motion, progressive strengthening, and daily quadriceps NMES started early", // CPG-TKA
        "Advise long-duration exercise to slow bone loss in postmenopausal women with osteoporosis: static weight-bearing such as single-leg standing for the hip, plus walking, tai chi or progressive resistance training", // CPG-OSTEO
        "Use repeated-movement testing in low back pain with referred symptoms to look for centralization and a directional preference, and let the direction that centralizes symptoms guide the exercise chosen", // SP-MCKENZIE
        "Screen low back pain for red-flag features that call for imaging or referral -- possible infection, malignancy, fracture, or compression of the spinal cord or cauda equina -- and otherwise encourage activity as tolerated", // SP-LBP
      ],
    },
    {
      title: "Neuromuscular and Nervous Systems",
      rangeLabel: "39-48 of 180 scored items",
      weight: 24,
      gate: "Given a neurological presentation, localize the lesion and name the specific intervention it calls for -- not a generic 'improve function' answer.",
      objectives: [
        "Differentiating upper motor neuron from lower motor neuron presentations",
        "Applying standardized neurological outcome measures (balance, gait, coordination) and interpreting results",
        "Selecting motor-learning and neuroplasticity-based interventions matched to the stage of recovery",
        "Managing common neurological diagnoses: stroke, spinal cord injury, traumatic brain injury, and peripheral neuropathy",
        "Recognizing signs of neurological decline or emergency (e.g., cauda equina, increasing ICP) that require immediate referral",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Tell upper motor neuron signs (hyperreflexia, spasticity, poor dexterity) from lower motor neuron signs (atrophy, fasciculations, flaccid tone), and recognise that ALS shows both together", // SP-ALS; AP 16.4
        "Recognize autonomic dysreflexia when the spinal cord lesion is at T6 or higher -- a sudden severe headache with a blood pressure surge -- sit the patient up with legs down, loosen anything tight, and look for a trigger such as a full bladder or bowel", // SP-AD
        "Document spinal cord injury level and completeness with the ISNCSCI examination from ASIA and ISCoS, and recognize central cord syndrome by arm weakness greater than leg weakness", // SP-SCI
        "Offer supervised vestibular therapy for unilateral or bilateral peripheral vestibular hypofunction using gaze-stabilization and balance exercise, and do not rely on saccadic or smooth-pursuit drills for gaze stability", // CPG-VEST
        "Apply the strong Parkinson disease recommendations: moderate- to high-intensity aerobic exercise, balance training, gait training, and external cueing to reduce freezing of gait", // CPG-PD
        "Use the neurologic core outcome set -- Berg Balance Scale, Activities-specific Balance Confidence Scale, Functional Gait Assessment, 10 Meter Walk Test, 6-Minute Walk Test, 5 Times Sit-to-Stand -- and agree with the patient how results shape the plan", // CPG-COM
      ],
    },
    {
      title: "Cardiovascular and Pulmonary Systems",
      rangeLabel: "22-27 of 180 scored items",
      weight: 14,
      gate: "Given a patient's vital signs and history, determine whether it is safe to proceed with an intervention and what to modify -- not a generic 'monitor vitals' answer.",
      objectives: [
        "Interpreting vital signs, ECG basics, and exercise-response patterns to determine exercise safety",
        "Applying activity-progression guidelines for cardiac and pulmonary rehabilitation",
        "Recognizing signs of cardiopulmonary decompensation that require stopping treatment or emergency response",
        "Selecting airway clearance and breathing-retraining techniques for pulmonary conditions",
        "Interpreting oxygen saturation, RPE, and dyspnea scales during activity",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Check for orthostatic hypotension -- a drop of at least 20 mm Hg systolic or 10 mm Hg diastolic within 3 minutes of standing -- before progressing upright activity, including after high spinal cord injury", // SP-OH; SP-AD
        "Run a 6-minute walk test on a flat 30 m course with a pulse oximeter, a dyspnea scale such as Borg, and emergency equipment such as a defibrillator within reach", // SP-6MWT
        "Set pulmonary rehabilitation endurance training by symptoms: dyspnea of about 4 to 6 on the Borg scale, or perceived exertion rated 12 to 14, marks moderate to high intensity", // SP-PULMREHAB
        "Choose airway clearance for mucus-heavy disease such as cystic fibrosis or COPD (postural drainage, percussion, vibration), and after surgery pair incentive spirometry with deep breathing, coughing and early mobilization", // SP-PDV; SP-IS
        "Monitor SpO2 against the right target: 94% to 98% for most patients, but 88% to 92% for those at risk of hypercapnic respiratory failure, where excess oxygen can harm", // SP-O2
      ],
    },
    {
      title: "Integumentary System",
      rangeLabel: "8-11 of 180 scored items",
      weight: 5,
      gate: "Given a wound presentation, classify it correctly and select the specific dressing or intervention it calls for -- not a generic 'clean and cover' answer.",
      objectives: [
        "Classifying wounds by etiology and staging pressure injuries correctly",
        "Selecting wound care interventions and dressings matched to wound characteristics",
        "Recognizing signs of infection or non-healing that require referral",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Stage pressure injuries (stages 1 to 4, deep tissue, unstageable) and record size, tunneling, undermining, drainage and eschar, remembering deep tissue injury can sit under intact skin", // SP-PI; SP-WOUNDASSESS
        "Classify burn depth: superficial burns involve only epidermis; partial-thickness burns reach the dermis and are red, blistered and very painful; full-thickness burns may be painless and white, brown or charred", // SP-BURNS
        "After a diabetic foot ulcer closes, keep offloading moderate to maximal for about the first 3 months, then reload standing and walking gradually and bring back normal shoes on a wear schedule", // CPG-DFU
      ],
    },
    {
      title: "System Interactions",
      rangeLabel: "8-10 of 180 scored items",
      weight: 5,
      gate: "Given a patient with comorbid conditions across systems, determine how one system's status changes the plan for another -- not a generic 'treat each problem separately' answer.",
      objectives: [
        "Recognizing how a comorbidity in one body system changes precautions or intervention selection for another",
        "Prioritizing a plan of care when multiple systems present competing demands",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Flag polypharmacy (taking 5 or more medications regularly) in older adults as a risk for falls and frailty, and weigh its effect on physical therapy management", // SP-POLYPHARM; FSBPT-PT p10
        "Recognize chronic pain as pain lasting more than 3 months and manage it with a multimodal plan, since psychological and social dimensions shape it as much as tissue findings", // SP-CHRONICPAIN; FSBPT-PT p10
        "Recognize complex regional pain syndrome, diagnosed clinically with the Budapest criteria after other causes are excluded, and the place of physical therapy in its interprofessional care", // SP-CRPS
      ],
    },
    {
      title: "Lymphatic System",
      rangeLabel: "4-7 of 180 scored items",
      weight: 3,
      gate: "Given a lymphedema presentation, select the specific stage-appropriate intervention it calls for -- not a generic 'reduce swelling' answer.",
      objectives: [
        "Staging lymphedema and selecting complete decongestive therapy components appropriately",
        "Recognizing contraindications to compression and manual lymphatic drainage",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Stage lymphedema with the International Society of Lymphology scale, from stage 0 (latent, subclinical) to stage III (non-pitting swelling with fibrosis and skin thickening), and match treatment to the stage", // SP-LYMPH
        "For breast cancer-related lymphedema, treat early (ISL stage I) swelling with a fitted compression garment, exercise and education first, add CDT if that fails, and use CDT to reduce volume in stages II and III", // CPG-BCRL
      ],
    },
    {
      title: "Safety and Protection",
      rangeLabel: "5-7 of 180 scored items",
      weight: 3,
      gate: "Given a patient-safety scenario, name the specific fall-prevention or infection-control step it calls for -- not a generic 'be careful' answer.",
      objectives: [
        "Applying fall-risk screening tools and environmental/equipment modifications",
        "Applying infection-control precautions (standard, contact, droplet, airborne) correctly to a scenario",
        "Selecting the correct guarding technique and assistive device for a patient's functional level",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Screen community-dwelling older adults with the fall-risk cut-offs in the 2025 APTA-Geriatrics guideline: TUG over 11 s, 5 times sit-to-stand over 12 s, single-limb stance under 6.5 s, Berg under 50, gait speed under 1.0 m/s", // CPG-FALL
        "Prescribe fall-prevention exercise with a minimum weekly dose of 150 minutes to 3 hours, kept up for 6 to 12 months, built around progressive, challenging balance training, with tailored education and a home-hazard assessment for those at high risk", // CPG-FALL
        "Recognize signs of physical, sexual or psychological abuse and neglect, including financial exploitation of older adults, and act on the clinician's mandated-reporter duty for suspected child abuse", // FSBPT-PT p11; SP-ELDERABUSE; SP-CHILDABUSE
      ],
    },
    {
      title: "Equipment, Devices, and Technologies",
      rangeLabel: "5-6 of 180 scored items",
      weight: 3,
      gate: "Given a mobility or functional deficit, select the specific assistive device or orthosis it calls for -- not a generic 'give them a cane' answer.",
      objectives: [
        "Selecting and fitting assistive devices (canes, walkers, crutches) to a patient's impairment and gait pattern",
        "Selecting orthoses and prosthetic components appropriate to a presentation",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Fit axillary crutches with the pad about 2 finger widths (2 inches) under the armpit and the grip set for about 30 degrees of elbow flexion, and teach the patient not to rest the armpit on the pad", // SP-CRUTCH
        "Prepare a residual limb for prosthetic fit by controlling postoperative edema and aiming for a tapered, conical shape, and know where microprocessor-controlled prosthetic devices fit in prosthetic choice", // SP-LEAMP; FSBPT-PT p10
      ],
    },
    {
      title: "Metabolic and Endocrine Systems",
      rangeLabel: "4-6 of 180 scored items",
      weight: 3,
      gate: "Given a metabolic or endocrine complication (e.g., hypoglycemia, diabetic neuropathy), determine the specific exercise modification it calls for.",
      objectives: [
        "Recognizing signs of hypo/hyperglycemia during activity and responding appropriately",
        "Modifying exercise prescription for patients with diabetes, obesity, or other metabolic conditions",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "In diabetes, check glucose before, during and after exercise; give fast-acting carbohydrate if it falls below 100 mg/dL, and know hypoglycemia is usually defined as under 70 mg/dL", // SP-DMEX; SP-HYPOGLY
        "Use extra caution or supervision for exercise when diabetes comes with symptomatic coronary artery disease, proliferative retinopathy or severe neuropathy", // SP-DMEX
      ],
    },
    {
      title: "Therapeutic Modalities",
      rangeLabel: "4-6 of 180 scored items",
      weight: 3,
      gate: "Given a tissue condition, select the specific modality and parameters it calls for -- not a generic 'apply heat or ice' answer.",
      objectives: [
        "Selecting thermal, electrical, and mechanical modalities matched to tissue state and treatment goal",
        "Applying contraindications and precautions for each modality correctly",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Screen before TENS: avoid stimulation near implanted cardiac devices, over the carotid sinus or front of the neck, over the pregnant abdomen or low back unless obstetrics directs, and over broken, infected or insensate skin", // SP-TENS
        "Do not use therapeutic ultrasound diathermy over ischemic tissue, active infection, malignancy, a fracture, the spine or the eye", // SP-US
        "After total knee arthroplasty, use cryotherapy and elevation to limit early swelling, and avoid routine compression dressings, CPM or manual lymphatic drainage for that purpose", // CPG-TKA
      ],
    },
    {
      title: "Gastrointestinal System",
      rangeLabel: "3-6 of 180 scored items",
      weight: 3,
      gate: "Given a GI-related complaint during a PT session, determine whether it's benign or requires referral.",
      objectives: [
        "Recognizing GI signs/symptoms that may indicate a condition outside the scope of PT management",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Recognize abdominal findings that point away from musculoskeletal pain and toward referral, such as McBurney point tenderness, Rovsing sign or psoas sign in appendicitis and Murphy sign in cholecystitis", // FSBPT-PT p7; SP-APPY; SP-CHOLE
      ],
    },
    {
      title: "Professional Responsibilities",
      rangeLabel: "4-5 of 180 scored items",
      weight: 3,
      gate: "Given a professional or ethical scenario, apply the specific standard of practice or documentation requirement it calls for.",
      objectives: [
        "Applying the APTA Code of Ethics and standards of practice to a scenario",
        "Documenting care appropriately for legal, billing, and continuity-of-care purposes",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Write a plan of care that meets Medicare's minimum -- diagnoses, long-term goals, and what services, how much, how often and for how long -- with measurable goals tied to functional impairments", // CMS-BPM15 220.1.2
        "Meet Medicare timing rules: certification of the plan dated within 30 days of first treatment, certification intervals of 90 calendar days or less, and a progress report at least every 10 treatment days", // CMS-BPM15 220.1.3; CMS-BPM15 220.3
        "Offer telerehabilitation or hybrid care when it suits the patient, knowing the 2024 APTA guideline finds it at least equal to in-person care for acceptability and satisfaction, and work to reduce barriers to access", // CPG-TELE; FSBPT-PT p12
      ],
    },
    {
      title: "Genitourinary System",
      rangeLabel: "2-5 of 180 scored items",
      weight: 2,
      gate: "Given a genitourinary-related complaint, determine whether it's within PT scope or requires referral.",
      objectives: [
        "Recognizing genitourinary signs/symptoms relevant to pelvic-health or systemic screening",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Tell apart stress, urge, mixed, overflow and functional urinary incontinence, because management differs, and know pelvic floor exercise and biofeedback are among the options", // SP-UI; FSBPT-PT p8
      ],
    },
    {
      title: "Research and Evidence-Based Practice",
      rangeLabel: "3-5 of 180 scored items",
      weight: 2,
      gate: "Given a research study or outcome measure, interpret its validity/reliability and apply it to clinical decision-making -- not a generic 'evidence matters' answer.",
      objectives: [
        "Interpreting study design, validity, and reliability to judge whether evidence applies to a patient",
        "Selecting and interpreting standardized outcome measures appropriately",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Interpret a clinical test's likelihood ratios, predictive values, and sensitivity and specificity, knowing that sensitivity and specificity tend to trade off against each other", // SP-DTA; FSBPT-PT p12
        "Read p values and confidence intervals, tell a Type I error from a Type II error, and judge clinical significance separately from statistical significance", // SP-HYPTEST; SP-STATSIG
        "Match study design to the question: case-control studies for risk factors, cohort studies following groups by exposure over time, cross-sectional studies with no follow-up, and place each on the hierarchy of evidence", // SP-EPIDESIGN; SP-EBM
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// NPTE-PTA -- the entry-level physical therapist assistant licensure
// examination. Distinct exam from NPTE-PT, not a shorter version of it --
// PTAs work under a PT's direction and are not tested on independent
// evaluation/diagnosis/prognosis the way NPTE-PT's three-way split within
// each system implies for PTs, which is why FSBPT publishes a separate
// content outline rather than a subset of the PT one.
//
// 180 items total (140 scored, 40 unscored pretest), computer-based,
// multiple choice, administered in 4 sections of 45 items.
// ---------------------------------------------------------------------------
export const NPTE_PTA_TRACK: SeedTrack = {
  code: "NPTEPTA",
  title: "NPTE-PTA Coach",
  description:
    "The physical therapist assistant licensure examination, built on FSBPT's current NPTE-PTA Test Content Outline: 14 body-system and non-system domains, weighted by the exam's own published item-count ranges.",
  trackType: "certification",
  subcategorySlug: "physical-therapy",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.fsbpt.org/Free-Resources/NPTE-Candidate-Handbook/Content-Outline",
  sourceVerifiedAt: VERIFIED_AT,
  requiresAcknowledgement: true,
  disclaimerKey: PT_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    ...FSBPT_PROVIDER,
    credentialSlug: "npte-pta",
    credentialName: "National Physical Therapy Examination (NPTE-PTA)",
    credentialUrl: "https://www.fsbpt.org/Secondary-Pages/Exam-Candidates/National-Exam-NPTE",
    basis: "regulatory_licensure",
    examCode: "NPTE-PTA",
    examRevision: "Version 2025.02 (current since the January 2024 practice-analysis update)",
    standardName: "NPTE-PTA Test Content Outline",
    standardRevision: "2025.02",
    status: "active",
    effectiveDate: "2024-01-01",
    officialObjectivesUrl:
      "https://www.fsbpt.org/Portals/0/documents/free-resources/NPTE_Candidate_Handbook.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Graduation from a CAPTE-accredited (or equivalent) Physical Therapist Assistant program. The exam assumes entry-level practice under a supervising PT's direction.",
    durationMinutes: 240,
    questionFormat: "180 items (140 scored, 40 unscored pretest) in 4 sections of 45; multiple choice, computer-based",
    passingScorePolicy: "Scaled score of 600 on a 200-800 scale.",
  },
  units: [
    {
      title: "Musculoskeletal System",
      rangeLabel: "31-40 of 140 scored items",
      weight: 26,
      gate: "Given a musculoskeletal treatment session, apply the specific intervention or precaution a PTA carries out under the plan of care -- not a generic 'do the exercises' answer.",
      objectives: [
        "Implementing therapeutic exercise and manual therapy per a PT's established plan of care",
        "Recognizing when a patient's response to treatment requires reporting back to the supervising PT",
        "Applying joint-protection and tissue-healing precautions during intervention",
        "Documenting musculoskeletal treatment sessions and progress toward established goals",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Carry out the hip precautions in the plan of care after a posterior-approach total hip arthroplasty -- no flexion past 90 degrees, no crossing the legs, no twisting -- and train the patient with sock aids, reachers and raised seats", // SP-HIPPREC
        "Deliver range-of-motion and progressive strengthening exercise after total knee arthroplasty as the PT has planned, aware the guideline advises against continuous passive motion and routine bracing", // CPG-TKA; CAPTE-PTA 7D3
        "Distinguish isotonic, isometric and isokinetic resistance exercise and carry each out within the parameters the supervising PT has set", // SP-THEREX; CAPTE-PTA 7D3
        "Report to the supervising PT any new red-flag feature in a patient with back pain, such as signs of cauda equina or cord compression, infection, fracture or malignancy, before continuing treatment", // SP-LBP; CAPTE-PTA 7D1
      ],
    },
    {
      title: "Neuromuscular and Nervous Systems",
      rangeLabel: "27-35 of 140 scored items",
      weight: 22,
      gate: "Given a neurological patient during a treatment session, apply the specific motor-learning technique or safety precaution it calls for.",
      objectives: [
        "Implementing balance, gait, and coordination interventions per an established plan of care",
        "Recognizing neurological changes during a session that require immediate PT or medical notification",
        "Applying appropriate guarding and facilitation techniques for patients with neurological impairments",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Watch for autonomic dysreflexia in patients with spinal cord injury at or above T6: with sudden severe headache and raised blood pressure, sit them up with legs down, loosen tight clothing, check bladder and bowel, and get help", // SP-AD
        "Implement the Parkinson disease interventions in the plan of care -- gait training, balance training and external cueing for freezing of gait -- and report changes in response to the PT", // CPG-PD; CAPTE-PTA 7D3
        "Carry out the balance and gaze-stabilization exercises a PT prescribes for vestibular hypofunction, in clinic and as a home program, and report symptom changes", // CPG-VEST
        "Collect reflex and tone data the plan calls for, recognizing flaccid tone as a lower motor neuron sign and spasticity with hyperreflexia as upper motor neuron signs", // AP 16.4; SP-ALS; CAPTE-PTA 7D2
      ],
    },
    {
      title: "Cardiovascular and Pulmonary Systems",
      rangeLabel: "20-27 of 140 scored items",
      weight: 17,
      gate: "Given a patient's vital signs during activity, determine whether to continue, modify, or stop the session -- not a generic 'watch the numbers' answer.",
      objectives: [
        "Monitoring vital signs and activity tolerance during a treatment session and responding to abnormal findings",
        "Implementing cardiac and pulmonary rehabilitation activities within established parameters",
        "Recognizing signs of cardiopulmonary distress that require stopping treatment and notifying the supervising PT",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Take blood pressure lying and after standing and report orthostatic hypotension -- a drop of at least 20 mm Hg systolic or 10 mm Hg diastolic within 3 minutes -- to the supervising PT", // SP-OH; CAPTE-PTA 7D2
        "Administer the 6-minute walk test by protocol on a 30 m course with a pulse oximeter and Borg scale, and report distance and symptoms to the PT", // SP-6MWT; CAPTE-PTA 7D2
        "Keep pulmonary rehabilitation endurance work in the intensity band the plan sets, often dyspnea of 4 to 6 on the Borg scale or perceived exertion rated 12 to 14, and report readings outside it", // SP-PULMREHAB
        "Perform the airway clearance the plan directs -- postural drainage, percussion and vibration -- and coach incentive spirometry with deep breathing and coughing after surgery", // SP-PDV; SP-IS
      ],
    },
    {
      title: "Equipment, Devices, and Technologies",
      rangeLabel: "8-10 of 140 scored items",
      weight: 6,
      gate: "Given a patient using an assistive device, apply the specific fitting-check or gait-training step it calls for.",
      objectives: [
        "Implementing gait training with assistive devices per an established plan of care",
        "Checking assistive-device fit and function during use",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Check axillary crutch fit: pad about 2 finger widths (2 inches) under the armpit, grip at about 30 degrees of elbow flexion, and no resting of the armpit on the pad", // SP-CRUTCH
        "Check wheelchair fit during use, including 1 inch of clearance from each thigh to the armrest and a pelvis positioned in slight anterior tilt", // SP-WC
      ],
    },
    {
      title: "Safety and Protection",
      rangeLabel: "6-8 of 140 scored items",
      weight: 5,
      gate: "Given a patient-safety scenario during a session, apply the specific fall-prevention or infection-control step it calls for.",
      objectives: [
        "Applying fall-prevention techniques and correct guarding during functional activities",
        "Applying infection-control precautions correctly during patient care",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Deliver the fall-prevention exercise a PT prescribes -- progressive, challenging balance training at a minimum weekly dose of 150 minutes to 3 hours -- and reinforce the tailored education and home-hazard advice", // CPG-FALL
        "Use soap and water when hands are visibly soiled and an alcohol-based hand rub otherwise, and wear a fit-tested N95 respirator to enter an airborne isolation (negative pressure) room", // SP-HANDHYG; SP-AIRBORNE
      ],
    },
    {
      title: "Integumentary System",
      rangeLabel: "3-8 of 140 scored items",
      weight: 4,
      gate: "Given a wound-care task delegated by a PT, apply the specific dressing or precaution it calls for.",
      objectives: [
        "Implementing wound-care interventions per an established plan of care",
        "Recognizing signs of wound infection or non-healing that require PT notification",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Observe and report possible pressure injury, including deep tissue injury that can develop under intact skin over a bony prominence", // SP-PI
        "Measure and record wound size, undermining, tunneling and drainage as part of data collection, and report changes to the PT", // SP-WOUNDASSESS; CAPTE-PTA 7D2
      ],
    },
    {
      title: "Metabolic and Endocrine Systems",
      rangeLabel: "4-6 of 140 scored items",
      weight: 4,
      gate: "Given a metabolic complication during activity (e.g., hypoglycemia), apply the specific response it calls for.",
      objectives: [
        "Recognizing and responding to signs of hypo/hyperglycemia during a treatment session",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Check glucose around exercise in patients with diabetes as the plan directs: give fast-acting carbohydrate if it falls below 100 mg/dL, and tell the PT", // SP-DMEX
      ],
    },
    {
      title: "Therapeutic Modalities",
      rangeLabel: "5-7 of 140 scored items",
      weight: 4,
      gate: "Given a modality ordered by a PT, apply the specific parameters and precautions it calls for -- not a generic 'apply heat or ice' answer.",
      objectives: [
        "Applying thermal, electrical, and mechanical modalities per an established plan of care",
        "Recognizing contraindications and precautions for each modality",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Before applying TENS, confirm there is no implanted cardiac device near the site, no placement over the carotid sinus, front of the neck or a pregnant abdomen, and no broken, infected or insensate skin", // SP-TENS
        "Recognize contraindications to therapeutic ultrasound diathermy -- ischemic tissue, active infection, malignancy, a fracture, the spine or the eye -- and hold it and consult the PT if one is present", // SP-US; CAPTE-PTA 7D1
      ],
    },
    {
      title: "System Interactions",
      rangeLabel: "5-7 of 140 scored items",
      weight: 4,
      gate: "Given a patient with comorbid conditions, recognize when a change in one system requires modifying the current session.",
      objectives: [
        "Recognizing how a comorbidity changes precautions during an intervention already underway",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Notice polypharmacy (5 or more regular medications) in an older patient and report it to the PT as a fall and frailty risk", // SP-POLYPHARM
      ],
    },
    {
      title: "Lymphatic System",
      rangeLabel: "2-6 of 140 scored items",
      weight: 3,
      gate: "Given a lymphedema patient's session, apply the specific compression or positioning precaution it calls for.",
      objectives: [
        "Implementing complete decongestive therapy components per an established plan of care",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Apply the compression garment or bandaging and exercise that the PT's lymphedema plan sets for the patient's ISL stage, and report changes in swelling", // CPG-BCRL; SP-LYMPH
      ],
    },
    {
      title: "Professional Responsibilities",
      rangeLabel: "2-4 of 140 scored items",
      weight: 2,
      gate: "Given a professional or supervisory scenario, apply the specific scope-of-practice or documentation requirement it calls for.",
      objectives: [
        "Applying the PTA's scope of practice and supervision requirements to a scenario",
        "Documenting care appropriately within a PTA's role",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Know what Medicare does not allow a PTA to do -- evaluate or assess, make clinical judgments, or develop and furnish skilled maintenance programs -- and work under the supervising PT's direction", // CMS-BPM15 230.1
        "Record progress objectively, for example the distance walked and level of assistance, leaving judgments about why progress did or did not happen to the PT, and change goals only at the PT's direction", // CMS-BPM15 220.3
        "Know that since 2025 Medicare lets a PT in private practice supervise a PTA under general supervision (the PT need not be on site), that state law, other payers or the facility may require closer supervision, and that the Standards of Ethical Conduct still require deciding jointly with the PT", // CFR 410.60(c)(2); APTA-SEC
      ],
    },
    {
      title: "Gastrointestinal System",
      rangeLabel: "0-4 of 140 scored items",
      weight: 1,
      gate: "Given a GI-related complaint during a session, determine whether to continue treatment or notify the supervising PT.",
      objectives: [
        "Recognizing GI signs/symptoms during a session that require PT notification",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Support reflux management in the plan with positioning such as raising the head of the bed and advice to avoid meals in the 3 hours before bed", // SP-GERD; FSBPT-PTA p7
      ],
    },
    {
      title: "Genitourinary System",
      rangeLabel: "0-4 of 140 scored items",
      weight: 1,
      gate: "Given a genitourinary-related complaint during a session, determine whether to continue treatment or notify the supervising PT.",
      objectives: [
        "Recognizing genitourinary signs/symptoms during a session that require PT notification",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Coach pelvic floor muscle (Kegel) exercises and bladder programs that the plan of care includes, and report concerns to the PT", // SP-KEGEL; FSBPT-PTA p8
      ],
    },
    {
      title: "Research and Evidence-Based Practice",
      rangeLabel: "1-3 of 140 scored items",
      weight: 1,
      gate: "Given an outcome measure used in a session, apply it and interpret the result correctly.",
      objectives: [
        "Administering standardized outcome measures correctly and reporting results to the supervising PT",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Give the Berg Balance Scale's 14 tasks with their standard instructions and 0 to 4 scoring (maximum 56), and report the total to the PT rather than interpreting fall risk independently", // SP-BERG; CMS-BPM15 220.3
      ],
    },
  ],
};

// REQ-081: the DPT degree pathway and the ten ABPTS specialist
// certifications live in their own files; seeded through this same list.
export const PT_TRACKS: SeedTrack[] = [NPTE_PT_TRACK, NPTE_PTA_TRACK, DPT_TRACK, ...ABPTS_TRACKS];
