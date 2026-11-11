// Doctor of Physical Therapy entry-to-practice pathway (Strand 3 of
// docs/catalog-backlog.md, REQ-081). The academic degree structure that
// feeds the NPTE-PT licensure exam in pt.ts -- same shape as nursing's
// ADN/BSN degree-ladder tracks, not an exam itself.
//
// Structured directly on CAPTE's own "Standards and Required Elements for
// Accreditation of Physical Therapist Education Programs" -- the 2024
// standards (adopted Oct. 31, 2023; final text updated through July 28,
// 2026), read from CAPTE's PDF on 2026-10-08, not a summary. Standard 7
// (Curriculum) is the part that describes what a DPT program must teach:
// 7A (foundational and clinical sciences), 7B (ethics, values, service,
// leadership), 7C (lifelong learning, education, health care disparities)
// and 7D1-7D25 (the practice expectations every graduate must meet). The
// units below follow CAPTE's own grouping of 7D: Examination; Evaluation,
// Diagnosis, Prognosis and Plan of Care; Intervention and Management of
// Care; Health Care Activities and Community Health; Practice Management.
//
// No percentage weights: CAPTE accredits programs, it does not publish an
// exam blueprint. Units are unweighted and ordered the way the standard
// orders them, like the nursing degree tracks.
//
// Objectives are written in our own words from the standard's required
// elements -- deliberately not copied.
//
// Deepened 2026-11-04 under docs/source-reliability-standard.md (adopted
// 2026-10-31). New objectives sit at the END of existing units only, each
// group after an "Added 2026-11-04" marker and each line with an inline
// source tag. No unit, gate or earlier objective was touched and no unit
// was added, because the seed matches by unit and position.
//
// Scope versus depth: CAPTE's PT standard (7A-7D25) decides what belongs
// in each unit; guidelines, regulation and textbooks supply the depth. The
// DPT is the evaluating, diagnosing, plan-setting clinician, so these
// objectives may use those verbs (the PTA course in pt.ts does not).
//
// Inline tag key: CAPTE-PT 7xn = PT required element; CMS-BPM15 n =
// Medicare Benefit Policy Manual ch. 15 section; CFR 410.60 = 42 CFR
// 410.60; APTA-COE = APTA Code of Ethics for the Physical Therapy Profession (2026); MM12071 = CMS MLN Matters MM12071;
// FSBPT-PT pN = page of the 2024 NPTE-PT content outline; CPG-xxx =
// guideline below; SP-xxx = StatPearls chapter below; AP n.n = OpenStax
// Anatomy and Physiology 2e section.
//
// Tier 1, all accessed 2026-11-04:
// - CAPTE, "Standards and Required Elements for Accreditation of Physical
//   Therapist Education Programs" (adopted 2023-10-31, text updated through
//   2026-07-28), Standard 7 re-read from the PDF named in sourceUrl.
//   Copyright 2026 APTA, all rights reserved; scope only, no wording
//   reproduced.
// - FSBPT, "NPTE-PT Test Content Outline, effective January 2024" (bullets
//   edition), page 10, for the system-interactions scope.
//   https://www.fsbpt.org/Portals/0/documents/free-resources/2024-PT-Test-Content-Outline-Bullets.pdf
// - APTA, "Code of Ethics for the Physical Therapy Profession", adopted by
//   the House of Delegates 2025-07-14, effective 2026-01-01; one code for
//   PTs and PTAs, replacing the Code of Ethics for the Physical Therapist
//   (HOD S06-20-28-25) and the Standards of Ethical Conduct for the PTA.
//   Read 2026-11-10 (REQ-220): six ethical principles, nine Ethical
//   Commitments with Standards of Conduct; pro bono is aspirational
//   example 9.E. Scope only.
//   https://www.apta.org/siteassets/pdfs/policies/apta-code-ethics-physical-therapy-profession.pdf
//   https://www.apta.org/article/2026/01/02/new-code-of-ethics-for-the-physical-therapy-profession
// - CMS, MLN Matters MM12071 (effective 2021-01-01): a PT may delegate
//   furnishing maintenance therapy to a PTA, as clinically appropriate.
//   Read 2026-11-10 (REQ-220).
//   https://www.hhs.gov/guidance/sites/default/files/hhs-guidance-documents/MM12071.pdf
// - CMS, Medicare Benefit Policy Manual, ch. 15, Rev. 13889 (issued
//   2026-07-30), sec. 220.1.2, 220.1.3, 220.2, 220.3, 230.1. Public domain.
//   https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/bp102c15.pdf
// - eCFR, 42 CFR 410.60 (last amended 89 FR 98556, 2024-12-09), read
//   through the eCFR versioner API at 2026-10-30. Public domain.
// - APTA clinical practice guidelines, open access through Europe PMC; full
//   citations, licences and currency notes are in the pt.ts header:
//   CPG-TKA (2026), CPG-FALL (2025), CPG-DFU (2025), CPG-TELE (2024),
//   CPG-OSTEO (2022), CPG-VEST (2022), CPG-PD (2021), CPG-BCRL (2020, no
//   revision found), CPG-COM (2018, APTA says an update is in progress).
//
// Tier 2 (graded against the five criteria: 1 credentialed authors, 2
// stated review, 3 identifiable publisher, 4 dated within 5 years for
// clinical content, 5 no commercial interest):
// - StatPearls (StatPearls Publishing, NCBI Bookshelf NBK430685),
//   CC BY-NC-ND 4.0: all five met, graded in full in the pt.ts header;
//   read from NCBI's bulk open-access archive (package dated 2026-10-25),
//   accessed 2026-11-04. Chapters cited (tag, title, last updated,
//   Bookshelf ID):
//   (* Bookshelf ID lookup failed; StatPearls article number given.)
// - OpenStax, "Anatomy and Physiology 2e", Betts, Young et al., Rice
//   University, 2022, CC BY 4.0: all five met, graded in the pt.ts header;
//   foundational science, so the 5-year clinical limit does not bind.
//   https://openstax.org/details/books/anatomy-and-physiology-2e
//   Accessed 2026-11-04. Sections cited: .
//
// Where sources disagreed, and what we did (checked 2026-11-04):
// - PTA supervision, resolved 2026-11-06 (Nick): 42 CFR 410.60(c)(2), read
//   on eCFR 2026-11-06, says a PTA may work under the general supervision
//   of a PT in private practice (CY2025 fee-schedule rule, effective
//   2025-01-01). The Benefit Policy Manual ch. 15 still prints the old
//   direct-supervision wording (sec. 230.4, not 230.1); the regulation
//   governs, so the objective names general supervision plus the note
//   that state law, payers or facilities may be stricter.
// - PTA supervision in private practice: CMS manual sec. 230.1 (Rev. 179,
//   2014) says direct supervision; 42 CFR 410.60(c) as amended through
//   2024-12-09 allows general supervision. Two Tier 1 sources conflict, so
//   the objective names no level and states the principle (apply the
//   strictest rule that governs the setting, payer and state). Flagged
//   for Nick.
// - Berg fall-risk cut-off: the 2025 APTA-Geriatrics CPG (Tier 1) uses
//   under 50; StatPearls gives under 45. The fall-screening objective
//   follows the CPG; the Berg scoring objective names no cut-off.
// - Numbers resting on one source, with no conflict found in the other
//   files held: sarcomere length-tension 80-120% (AP 10.4), Berg 14 items
//   scored 0-4 out of 56, orthostatic hypotension 20/10 mm Hg within 3
//   min, Medicare timing (30 days, 90 days, 10 treatment days, 4-6 day
//   short episodes), PTA claims paid at 85 percent with a 10 percent
//   threshold (42 CFR 410.60(a)(4)), falls exercise dose (150 min to 3 h/week
//   for 6-12 months) and DFU offloading as in pt.ts.

import type { SeedTrack, UnitSource } from "../data";

// REQ-235 (batch H wave 1): dated unit sources. Every unit names the CAPTE
// standard elements it is scoped on (element numbers only: the standard is
// APTA's copyright, see above; re-read 2026-11-04 per this header). Ethics
// and practice management carry key values read on 2026-11-11: the APTA
// Code of Ethics PDF, 42 CFR 410.60 through the eCFR versioner API (as of
// 2026-11-01), and APTA's "Skilled Maintenance Therapy Under Medicare" page.
const CAPTE_PT_PDF = "https://www.capteonline.org/globalassets/capte-docs/2024-capte-pt-standards-required-elements.pdf";
const capte = (elements: string): UnitSource => ({
  title: `CAPTE Standards and Required Elements for PT programs (2024; text updated through 2026-07-28), required elements ${elements}`,
  url: CAPTE_PT_PDF,
  kind: "reference",
  checkedAt: "2026-11-04",
});
const APTA_COE: UnitSource = {
  title: "APTA Code of Ethics for the Physical Therapy Profession (effective 2026-01-01; one code for PTs and PTAs)",
  url: "https://www.apta.org/siteassets/pdfs/policies/apta-code-ethics-physical-therapy-profession.pdf",
  kind: "reference",
  checkedAt: "2026-11-11",
  keyValues: [
    "six ethical principles: autonomy, beneficence, nonmaleficence, justice, veracity, fidelity",
    "nine Ethical Commitments: Respect, Integrity, Accountability, Maintaining Professional Relationships, Compassion and Trust, Responsible Business and Organizational Practices, Direction and Supervision, Professional Expertise, Societal Responsibility; the Standards of Conduct under them are what APTA enforces",
    "pro bono service is aspirational (9.E: 'shall strive to provide'), not an enforceable duty",
  ],
};
const MEDICARE_PTA: UnitSource[] = [
  {
    title: "42 CFR 410.60, outpatient physical therapy services (eCFR)",
    url: "https://www.ecfr.gov/current/title-42/section-410.60",
    kind: "reference",
    checkedAt: "2026-11-11",
    keyValues: [
      "a PTA may work under the general supervision of a PT in private practice (410.60(c)(2)); state law, payers or the facility may be stricter",
      "services furnished in whole or in part by a PTA carry the modifier and, from 2022-01-01, are paid at 85 percent; 'in part' means the PTA's separate minutes exceed 10 percent of the service's total minutes",
    ],
  },
  {
    title: "APTA, Skilled Maintenance Therapy Under Medicare (citing the CY 2021 Physician Fee Schedule final rule)",
    url: "https://www.apta.org/your-practice/payment/medicare-payment/coverage-issues/skilled-maintenance-therapy-under-medicare",
    kind: "reference",
    checkedAt: "2026-11-11",
    keyValues: [
      "since 2021-01-01 a PT may delegate furnishing skilled maintenance therapy to a PTA under Medicare Part B; establishing or designing the maintenance program still takes the therapist's skills",
    ],
  },
];
export const DPT_UNIT_SOURCES: Record<string, UnitSource[]> = {
  "Foundational sciences for physical therapist practice (7A)": [capte("7A")],
  "Ethics, values, service and leadership (7B)": [capte("7B"), APTA_COE],
  "Lifelong learning, education and health care disparities (7C)": [capte("7C")],
  "Examination and screening (7D1)": [capte("7D1")],
  "Evaluation, diagnosis, prognosis and plan of care (7D2-7D9)": [capte("7D2-7D9")],
  "Interventions and management of the delivery of care (7D10-7D16)": [capte("7D10-7D16")],
  "Health care activities and community health (7D17-7D22)": [capte("7D17-7D22")],
  "Practice management (7D23-7D25)": [capte("7D23-7D25"), ...MEDICARE_PTA],
};

const CAPTE_PROVIDER = {
  providerSlug: "capte",
  providerName: "Commission on Accreditation in Physical Therapy Education",
  providerUrl: "https://www.capteonline.org/",
  subcategorySlug: "physical-therapy",
  credentialType: "accredited_degree",
} as const;

const VERIFIED_AT = "2026-10-08T00:00:00Z";
const PT_DISCLAIMER_KEY = "pt-clinical-content";

// REQ-220: superseded or wrong lines retired in place (ids and history kept);
// their replacements are appended to the same unit.
const PT_REQ220_RETIRED_AT = "2026-11-10T00:00:00Z";

export const DPT_TRACK: SeedTrack = {
  code: "DPT",
  title: "Doctor of Physical Therapy (DPT) Coach",
  description:
    "The entry-level DPT curriculum as CAPTE's 2024 accreditation standards define it: the foundational and clinical sciences, professional values and lifelong learning, and the 25 practice expectations (examination through practice management) every graduate must meet before sitting the NPTE-PT.",
  trackType: "graduate",
  subcategorySlug: "physical-therapy",
  freshnessModel: "academic_foundational",
  sourceUrl: "https://www.capteonline.org/globalassets/capte-docs/2024-capte-pt-standards-required-elements.pdf",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: "2027-10-08T00:00:00Z",
  requiresAcknowledgement: true,
  disclaimerKey: PT_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    ...CAPTE_PROVIDER,
    credentialSlug: "doctor-of-physical-therapy",
    credentialName: "Doctor of Physical Therapy (CAPTE-accredited program)",
    credentialUrl: "https://www.capteonline.org/",
    basis: "accreditation_standard",
    standardName: "CAPTE Standards and Required Elements for Accreditation of Physical Therapist Education Programs",
    standardRevision: "2024 standards (adopted October 31, 2023; text updated through July 28, 2026)",
    status: "active",
    effectiveDate: "2025-01-01",
    officialObjectivesUrl:
      "https://www.capteonline.org/globalassets/capte-docs/2024-capte-pt-standards-required-elements.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "A bachelor's degree with program prerequisites (typically anatomy and physiology, biology, chemistry, physics, psychology and statistics) and documented observation hours. Licensure requires graduating a CAPTE-accredited program and passing the NPTE-PT.",
    questionFormat: "Program coursework, practical examinations and full-time clinical education experiences",
    passingScorePolicy: "Set by the program; licensure is by NPTE-PT",
  },
  units: [
    {
      title: "Foundational sciences for physical therapist practice (7A)",
      sources: DPT_UNIT_SOURCES["Foundational sciences for physical therapist practice (7A)"],
      gate: "Trace a symptom to the tissue, system or movement mechanism producing it -- not a generic 'it hurts because it is injured' answer.",
      objectives: [
        "Anatomy, physiology and pathology of the cardiovascular, pulmonary, musculoskeletal, neuromuscular, integumentary and lymphatic systems across the life span",
        "Anatomy, physiology and pathology of the endocrine, metabolic, gastrointestinal, genitourinary and renal systems as they bear on physical therapy",
        "Body-system interactions: how dysfunction in one system changes examination findings and tolerance in another",
        "Differential diagnosis: distinguishing conditions appropriate for physical therapy from those requiring referral",
        "Medical and surgical conditions commonly seen in physical therapy and their implications for the plan of care",
        "Genetics and genetic conditions relevant to movement and rehabilitation",
        "Exercise science: energy systems, training principles and physiological responses to exercise",
        "Biomechanics and kinesiology: forces, levers, joint mechanics and normal movement analysis",
        "Neuroscience, motor control and motor learning as the basis for movement retraining",
        "Diagnostic imaging: reading the report and recognizing what a PT should and should not infer from it",
        "Pharmacology: drug classes that alter exercise response, balance, cognition and healing",
        "Nutrition and its influence on recovery, tissue healing and performance",
        "Pain science and the lived pain experience, including central sensitization and persistent pain",
        "Psychosocial aspects of health and disability, including behavior change and adherence",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Hematologic, hepatic and biliary, and immune system anatomy, physiology and pathology, which CAPTE's 2024 standard also names alongside the cardiopulmonary, musculoskeletal and other core systems", // CAPTE-PT 7A
        "The four cardinal signs of inflammation -- heat, redness, pain and swelling -- and loss of function as a possible fifth, when tissue is injured", // AP 4.6
        "Fracture healing in sequence: fracture hematoma, internal and external callus, cartilage replaced by trabecular bone, then remodeling; and mechanical stress as the stimulus for bone deposition", // AP 6.5; AP 6.6
        "Skeletal muscle fiber types -- slow oxidative, fast oxidative and fast glycolytic -- and how each produces ATP and how quickly it fatigues", // AP 10.5
        "The length-tension relationship: peak sarcomere tension develops between about 80 and 120 percent of resting length", // AP 10.4
        "Hypertrophy, atrophy and age-related sarcopenia as changes in the structural protein of existing muscle fibers rather than the number of cells", // AP 10.6
        "Muscle roles in a movement -- prime mover (agonist), antagonist, synergist and fixator -- and the body as a lever system with bones as levers, joints as fulcrums and muscle as the effort", // AP 11.1
        "Planes of motion (flexion and extension in the sagittal plane) and the six synovial joint types: ball-and-socket, hinge, pivot, saddle, condyloid and plane", // AP 9.5; AP 9.4
        "Cardiac output as stroke volume times heart rate, and the heart rate rise that drives most of the increase in cardiac output during acute aerobic exercise", // AP 19.4; SP-AEROBIC
        "Breathing mechanics: the diaphragm and intercostal muscles create the pressure changes that move air, while the lungs themselves stay passive", // AP 22.3
        "The lymphatic system's role in returning excess interstitial fluid to the bloodstream and the lymph nodes' role in filtering and immune staging, as the basis for lymphedema care", // AP 21.1
        "The four hypersensitivity types and how autoimmune disease breaks immune self-tolerance, as background for autoimmune conditions seen in rehabilitation", // AP 21.6; FSBPT-PT p10
        // REQ-220 (FAIL-1137): replaces the sarcopenia line, which said ageing changes only the protein of existing fibres; OpenStax A&P 2e 10.6 says ageing fibres die. // AP 10.6
        "Hypertrophy and atrophy as structural protein added to or lost from existing muscle fibers (no new cells form), and age-related sarcopenia, in which muscle fibers also die and are replaced by connective and adipose tissue",
      ],
      objectiveRetiredAt: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, PT_REQ220_RETIRED_AT, null, null, null, null, null, null, null],
    },
    {
      title: "Ethics, values, service and leadership (7B)",
      sources: DPT_UNIT_SOURCES["Ethics, values, service and leadership (7B)"],
      gate: "Given a practice dilemma, name the ethical principle or Ethical Commitment of APTA's Code of Ethics for the Physical Therapy Profession at stake and the Standard of Conduct or action it requires.",
      objectives: [
        "The APTA Code of Ethics and Core Values for the physical therapist and physical therapist assistant, applied to real practice decisions",
        "Service and leadership: advocacy, community collaboration and responding to health care disparity",
        "Practicing within the legal framework of the jurisdiction, including the state practice act and relevant federal requirements",
        "Professional responsibility: integrity, accountability and the duty to report",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "The eight principles of the APTA Code of Ethics and the core values they draw on: integrity, compassion and caring, accountability, duty, altruism, excellence, collaboration and social responsibility", // APTA-COE
        "The ethical duty to give pro bono physical therapy, or back organizations meeting the health needs of uninsured, underinsured or economically disadvantaged people", // APTA-COE
        "Informed consent as an ongoing conversation about the nature, risks, benefits and alternatives of an intervention, which the patient may refuse or withdraw at any time", // SP-CONSENT
        "HIPAA obligations for protected health information, including the Privacy Rule, Security Rule and breach notification requirements", // SP-HIPAA
        "The clinician's duty as a mandated reporter of suspected child abuse, and recognizing physical, psychological, financial and neglect forms of elder abuse", // SP-CHILDABUSE; SP-ELDERABUSE
        // REQ-220 (FAIL-1133): the 2020 Code's eight principles were superseded on 2026-01-01. // APTA-COE
        "APTA's Code of Ethics for the Physical Therapy Profession (effective 2026-01-01, one code for PTs and PTAs): the ethical principles of autonomy, beneficence, nonmaleficence, justice, veracity and fidelity, and the nine Ethical Commitments -- respect, integrity, accountability, maintaining professional relationships, compassion and trust, responsible business and organizational practices, direction and supervision, professional expertise, and societal responsibility -- with their enforceable Standards of Conduct",
      ],
      objectiveRetiredAt: [null, null, null, null, PT_REQ220_RETIRED_AT, null, null, null, null, null],
    },
    {
      title: "Lifelong learning, education and health care disparities (7C)",
      sources: DPT_UNIT_SOURCES["Lifelong learning, education and health care disparities (7C)"],
      gate: "Read a study abstract and state what it does and does not justify changing in a plan of care.",
      objectives: [
        "Evidence-informed practice: forming a clinical question and locating the best available evidence",
        "Interpreting statistical evidence: effect sizes, confidence intervals, minimal clinically important difference and study design limits",
        "Clinical reasoning and decision making as an explicit, defensible process",
        "Scholarly inquiry and the physical therapist's role in generating evidence",
        "Teaching and learning principles for educating patients, caregivers and other health professionals",
        "Health care disparities and the social determinants of health as they shape access, adherence and outcomes",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Evidence-based practice as three elements together -- the best research evidence, the clinician's expertise, and what the patient values and prefers -- plus judging whether a study's population matches the patient", // SP-EBM; CAPTE-PT 7C1
        "Diagnostic accuracy statistics: sensitivity, specificity, positive and negative predictive values and likelihood ratios, and why sensitivity and specificity tend to move in opposite directions", // SP-DTA
        "Hypothesis testing: what a p value and a confidence interval do and do not tell you, Type I and Type II errors, and the gap between statistical and clinical significance", // SP-HYPTEST; SP-STATSIG
        "Study designs and what each can show: case-control, cohort and cross-sectional studies, randomized trials, and systematic reviews and meta-analyses at the top of the evidence hierarchy", // SP-EPIDESIGN; SP-EBM
        "Motivational interviewing for behavior change: open-ended questions, empathy, and working through the patient's ambivalence instead of directing them", // SP-MI; CAPTE-PT 7C2
        "Culturally competent care that meets patients' cultural, social and religious needs, supported by training and by policies that lower barriers to care", // SP-CULTURE; CAPTE-PT 7C3
      ],
    },
    {
      title: "Examination and screening (7D1)",
      sources: DPT_UNIT_SOURCES["Examination and screening (7D1)"],
      gate: "For a presenting complaint, select the systems review items and tests and measures that rule in or out the plausible sources -- and say when the patient needs someone else.",
      objectives: [
        "Taking a comprehensive subjective examination: history, health record review and the questions that change the plan",
        "Performing a systems review and deciding what it means to proceed, modify or refer",
        "Selecting and administering age-appropriate tests and measures for the cardiovascular and pulmonary systems",
        "Selecting and administering tests and measures for the neurological and musculoskeletal systems",
        "Selecting and administering tests and measures for the integumentary and lymphatic systems",
        "Assessing growth and development, pain, psychosocial and mental-health aspects within the examination",
        "Determining when a patient needs further examination, consultation or referral to another professional",
        "Providing physical therapist services through direct access, including the screening that makes it safe",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Administer and score the Berg Balance Scale (14 tasks scored 0 to 4, maximum 56), and use the total to judge fall risk and the likely need for an assistive device", // SP-BERG
        "Screen older adults for fall risk with the 2025 APTA-Geriatrics measures and cut-offs (TUG over 11 s, 5 times sit-to-stand over 12 s, single-limb stance under 6.5 s, Berg under 50, gait speed under 1.0 m/s)", // CPG-FALL
        "Select from the neurologic core outcome set -- Berg Balance Scale, ABC Scale, Functional Gait Assessment, 10 Meter Walk Test, 6-Minute Walk Test and 5 Times Sit-to-Stand -- for adults in neurologic rehabilitation", // CPG-COM
        "Grade deep tendon reflexes on the NINDS scale from 0 (absent) upward, giving more weight to a side-to-side difference than to symmetric findings in an otherwise well patient", // SP-DTR
        "Coordination and gait examination: the Romberg test with eyes closed for proprioception versus station with eyes open, and cerebellar ataxia as a cause of abnormal findings", // AP 16.5
        "Measure orthostatic vital signs, recognizing orthostatic hypotension as a fall of at least 20 mm Hg systolic or 10 mm Hg diastolic within 3 minutes of standing", // SP-OH
        "Screen the abdomen for signs that need medical referral, such as McBurney point tenderness, Rovsing sign or psoas sign in appendicitis and Murphy sign in cholecystitis", // SP-APPY; SP-CHOLE; FSBPT-PT p7
      ],
    },
    {
      title: "Evaluation, diagnosis, prognosis and plan of care (7D2-7D9)",
      sources: DPT_UNIT_SOURCES["Evaluation, diagnosis, prognosis and plan of care (7D2-7D9)"],
      gate: "From a set of examination findings, write the ICF-structured problem list, the PT diagnosis, a prognosis with a timeline, and a plan of care that names who does what.",
      objectives: [
        "Evaluating examination data to make clinical judgments about impairments, activity limitations and participation restrictions",
        "Describing a patient's problems using the International Classification of Functioning, Disability and Health (ICF)",
        "Determining a physical therapy diagnosis that guides management",
        "Determining a prognosis with patient goals, expected outcomes, available resources (including payment sources) and expected time to achieve them",
        "Establishing a safe and effective plan of care in collaboration with the patient, caregivers, payers and other professionals",
        "Determining and supervising the components of care that may be directed to a physical therapist assistant: team-based care, patient needs, the PTA's competence, jurisdictional law, payer and facility policy",
        "Determining and supervising activities that may be directed to unlicensed support personnel",
        "Creating a discontinuation-of-care plan that optimizes success after the episode ends",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Write a plan of care that meets Medicare's minimum contents -- diagnoses, long-term goals, and what services, how much, how often and for how long -- signed and dated by the clinician who set it", // CMS-BPM15 220.1.2
        "Set measurable long-term goals for the episode and short-term goals to track progress, knowing they may be the same when the episode is expected to last only 4 to 6 treatment days", // CMS-BPM15 220.1.2
        "Get the plan certified by a physician or NPP within 30 days of the first treatment, and recertify within certification intervals of 90 calendar days or less", // CMS-BPM15 220.1.3
        "What a PTA may not do under Medicare -- evaluate or assess, make clinical judgments, or develop and deliver skilled maintenance programs -- when deciding which care to direct to an assistant", // CMS-BPM15 230.1; CAPTE-PT 7D7
        "PTA supervision rules: since 2025 Medicare allows general supervision of a PTA by a PT in private practice, but state law, other payers or facility policy may require closer supervision, and the PT stays responsible for the care", // CFR 410.60(c)(2); CAPTE-PT 7D7
        "Design a maintenance program when a patient's skilled need is to maintain function or slow decline rather than to improve, which Medicare covers when it needs a therapist's skill", // CMS-BPM15 220.2
        "Write a discharge note covering care since the last progress report, as the final record that the whole episode was medically necessary", // CMS-BPM15 220.3; CAPTE-PT 7D9
        // REQ-220 (FAIL-1134): replaces the pre-2021 rule that a PTA could not deliver skilled maintenance programs (CMS MLN Matters MM12071, effective 2021-01-01). // MM12071; CMS-BPM15 230.1; CAPTE-PT 7D7
        "What a PTA may not do under Medicare -- evaluate or assess, make clinical judgments, or establish the maintenance program -- and that since 2021 the PT may delegate furnishing a maintenance program the PT established to a PTA when clinically appropriate, as for rehabilitative care",
      ],
      objectiveRetiredAt: [null, null, null, null, null, null, null, null, null, null, null, PT_REQ220_RETIRED_AT, null, null, null, null],
    },
    {
      title: "Interventions and management of the delivery of care (7D10-7D16)",
      sources: DPT_UNIT_SOURCES["Interventions and management of the delivery of care (7D10-7D16)"],
      gate: "Given a condition and stage, select the specific intervention and dose, state how you will know it is working, and document it the way the jurisdiction requires.",
      objectives: [
        "Selecting and performing interventions for cardiovascular and pulmonary conditions to achieve patient goals",
        "Selecting and performing interventions for neurological and musculoskeletal conditions",
        "Selecting and performing interventions for integumentary, lymphatic and metabolic conditions",
        "Interventions across human development and for pain and the pain experience",
        "Monitoring and adjusting the plan of care to optimize health outcomes",
        "Assessing outcomes with appropriate standardized tests and measures at the impairment, activity and participation levels",
        "Educating others with teaching methods matched to the learner, including clinical education of students, with cultural humility and attention to social determinants of health",
        "Managing the delivery of care consistent with the practice environment's policies, including environmental emergencies",
        "Documentation that follows the practice act, the setting and regulatory requirements",
        "Participating in the case management process",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Total knee arthroplasty rehabilitation per the 2026 APTA guideline: range-of-motion work instead of continuous passive motion, progressive strengthening, motor function training, and early daily quadriceps NMES", // CPG-TKA
        "Vestibular rehabilitation: supervised therapy for unilateral and bilateral hypofunction, gaze-stabilization doses from the guideline, and stopping when goals are met, symptoms resolve or progress plateaus", // CPG-VEST
        "Parkinson disease management: aerobic exercise at moderate to high intensity, balance and gait training, external cueing for freezing, and behavior-change approaches to raise physical activity", // CPG-PD
        "Breast cancer-related lymphedema care by ISL stage: compression garment, exercise and education for early stage I, complete decongestive therapy when that fails and for stages II and III", // CPG-BCRL
        "After diabetic foot ulcer closure, prescribe a gradual return to loading with moderate to maximal offloading for about 3 months and a footwear wear schedule, alongside aerobic and resistance training", // CPG-DFU
        "Exercise to slow bone loss in osteoporosis: long-duration weight-bearing and progressive resistance programs for postmenopausal women, per the APTA geriatric osteoporosis guideline", // CPG-OSTEO
        "Fall-prevention exercise for older adults: a minimum weekly dose of 150 minutes to 3 hours over 6 to 12 months with progressive, challenging balance training, inside a multifactorial program", // CPG-FALL
        "Document progress reports at least every 10 treatment days for Medicare, with objective measures compared over time to show the need for continued skilled care", // CMS-BPM15 220.3
      ],
    },
    {
      title: "Health care activities and community health (7D17-7D22)",
      sources: DPT_UNIT_SOURCES["Health care activities and community health (7D17-7D22)"],
      gate: "Describe how a physical therapist contributes to quality improvement, interprofessional care and population health -- with a concrete example, not a slogan.",
      objectives: [
        "Participating in ongoing assessment and improvement of the quality of services",
        "Patient-centered interprofessional collaborative practice",
        "Using health informatics in the health care environment",
        "Assessing care delivery with the principles of Health Systems Science, including the impact of policy and payment",
        "Physical therapy services informed by cultural humility across primary, secondary and tertiary prevention, health promotion and wellness",
        "Promoting health equity: reducing health disparities and considering social determinants of health in the plan of care",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "Quality improvement foundations: Donabedian's work on evaluating quality of care and the plan-do-study-act cycle for testing changes", // SP-QI
        "The three types of telehealth -- synchronous, asynchronous and remote monitoring -- and when telerehabilitation or hybrid care is a reasonable alternative to in-person sessions", // SP-TELEHEALTH; CPG-TELE
        "Identifying and reducing patient, clinician and organizational barriers to telerehabilitation, and discussing with the patient whether it is cost-effective for them", // CPG-TELE
      ],
    },
    {
      title: "Practice management (7D23-7D25)",
      sources: DPT_UNIT_SOURCES["Practice management (7D23-7D25)"],
      gate: "Identify a safety, billing or regulatory risk in a practice scenario and the specific action that addresses it.",
      objectives: [
        "Assessing, documenting and minimizing safety risks for patients and providers, including facility safety policies",
        "Participating in the financial management of the practice, including accurate billing and payment for services",
        "Practice management activities: marketing, public relations, regulatory and legal requirements, risk management, staffing and continuous quality improvement",
        // Added 2026-11-04: depth from open textbooks and Tier 1 sources (see source header at top of file).
        "OSHA's Bloodborne Pathogens Standard for staff safety: an exposure control plan, staff training, engineering controls and safer work practices, and hepatitis B vaccination for at-risk workers", // SP-OSHA
        "Infection control for patient and staff safety: alcohol-based rub as the default hand hygiene, soap and water when hands are visibly soiled, and fit-tested N95 use for airborne precautions", // SP-HANDHYG; SP-AIRBORNE
        "Accurate Medicare billing when a PTA helps deliver care: claims need the PTA modifier and are paid at 85 percent, with a 10 percent threshold for when a shared timed unit counts as PTA-furnished", // CFR 410.60
      ],
    },
  ],
};
