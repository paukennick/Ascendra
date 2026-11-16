// REQ-278: Family Nurse Practitioner board certification, two courses.
//
// Decision: TWO courses, one per exam, not one course with exam-specific
// units. The two blueprints differ materially -- AANPCB tests four practice
// domains (Assess, Diagnose, Plan, Evaluate) across eight age bands in 135
// scored items and 3 hours; ANCC tests five nursing-process domains with
// Implementation at a third of the exam (legal and ethical practice, APRN
// scope and standards, documentation, information technology including AI,
// therapeutic communication) in 150 scored items and 3.5 hours -- and the
// closest existing patterns in the catalog (NBCC's NCE and NCMHCE in
// tracks/nbcc.ts; AACN's CCRN Adult, Pediatric and Neonatal) are one course
// per exam. One course with both blueprints' units would also break the
// weight model (a course's unit weights are one exam's blueprint) and
// readiness, which reports "% of the exam" per unit.
//
// What was read, and when (all 2026-11-14):
//   - AANPCB (the American Academy of Nurse Practitioners Certification
//     Board; its site now calls itself NPCB) FNP page,
//     https://candidateportal.aanpcert.org/certs/fnp (aanpcert.org/certs/fnp
//     redirects there): 150 questions, 135 scored and 15 pretest; the "2024
//     FNP EXAMINATION BLUEPRINT": Assess 43 items (32%), Diagnose 36
//     (26.5%), Plan 36 (26.5%), Evaluate 20 (15%); patient age Newborn 3,
//     Infant 4, Toddler 5, Child 6, Adolescent 12, Young Adult 30, Middle
//     Adult 35, Older Adult 40 (adolescent, young and middle adult include
//     prenatal); the domain tasks and the FNP knowledge areas.
//   - AANPCB "FNP Candidate Handbook" (updated 06/2026),
//     https://www.aanpcert.org/wp-content/uploads/FNP-Candidate-Handbook-06-04-2026.pdf
//     -- 3 hours; a passing score set by standard-setting methodology, not a
//     percentage; up to three attempts per calendar year; eligibility
//     (accredited graduate FNP program, three separate APRN core courses,
//     500 faculty-supervised direct patient care clinical hours, current RN
//     license). Its Appendix A rounds Diagnose and Plan to 27% (totaling
//     101) and, in this printing, leaves out one Diagnose task and repeats
//     the Plan tasks under Evaluate; the course uses the web page's
//     26.5/26.5 and its task lists, which are complete.
//   - ANCC, Family Nurse Practitioner (FNP-BC) Board Certification
//     Examination Test Content Outline, "Effective Date: October 30, 2026",
//     updated 2026-04-06,
//     https://www.nursingworld.org/globalassets/study-aids/family-nurse-practitioner-tco_04062026.pdf
//     -- 175 questions, 150 scored and 25 pretest; Assessment 26 (17%),
//     Diagnosis 25 (17%), Planning 29 (19%), Implementation 50 (33%),
//     Evaluation 20 (13%), "Total does not come to 100 because of rounding";
//     secondary classifications by body system, drug agent and eight age
//     groups. nursingworld.org's FNP page (same day): 3.5 hours for 175
//     questions; FNP-BC valid 5 years; eligibility (current RN license;
//     accredited FNP master's, post-graduate certificate or DNP; at least
//     500 faculty-supervised clinical hours; three APRN core courses).
//
// Clinical key values (read 2026-11-14 on the publisher's page unless
// marked): USPSTF colorectal (2021), breast (2024), cervical (2018; the page
// says an update is in progress), statin (2022), prediabetes and type 2
// diabetes (2021), osteoporosis (2025) and hypertension screening (2021);
// the 2025 AHA/ACC high blood pressure guideline (AHA "Top things to know");
// GINA 2026 (May 2026) read only through The Limbic's report (2026-06-09);
// ADA hypoglycemia carried from the nursing courses (2026-11-07).
// Not verified, left out: drug doses, immunization schedules (in flux in
// 2025-2026; no number is quoted), and diabetes diagnostic thresholds (the
// ADA 2026 Standards section could not be opened).

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
const REVIEW_DUE_AT = "2027-11-14T00:00:00Z";

export const AANP_FNP_URL = "https://candidateportal.aanpcert.org/certs/fnp";
const AANP_HANDBOOK_URL = "https://www.aanpcert.org/wp-content/uploads/FNP-Candidate-Handbook-06-04-2026.pdf";
export const ANCC_FNP_TCO_URL = "https://www.nursingworld.org/globalassets/study-aids/family-nurse-practitioner-tco_04062026.pdf";
const ANCC_FNP_PAGE_URL = "https://www.nursingworld.org/our-certifications/family-nurse-practitioner/";
const NURSING_DISCLAIMER_KEY = "nursing-clinical-content";

const outline = (title: string, url: string, lines: string[], keyValues?: string[]): UnitSource => ({
  title,
  ...source(url, "exam_outline", CHECKED),
  outline: lines,
  ...(keyValues ? { keyValues } : {}),
});
const guide = (title: string, url: string, keyValues: string[], checkedAt = CHECKED, recheckBy?: string): UnitSource => ({
  title,
  ...source(url, "clinical_guideline", checkedAt, recheckBy),
  keyValues,
});
const USPSTF = "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/";

const SCREENING = guide(
  "USPSTF recommendations (colorectal 2021, breast 2024, cervical 2018, prediabetes/type 2 diabetes 2021, osteoporosis 2025, hypertension 2021)",
  `${USPSTF}colorectal-cancer-screening`,
  [
    "colorectal cancer: screen ages 45-49 (B) and 50-75 (A); selectively 76-85 (C)",
    "breast cancer: biennial mammography ages 40-74 (B); insufficient evidence from 75 and for supplemental screening in dense breasts (I)",
    "cervical cancer (2018, update in progress): cytology every 3 years at 21-29; at 30-65 cytology every 3 years, hrHPV alone every 5, or cotesting every 5; none before 21, after 65 with adequate prior screening, or after hysterectomy with cervix removed for benign reasons",
    "prediabetes and type 2 diabetes: screen adults 35-70 with overweight (BMI >=25) or obesity (B)",
    "osteoporosis: screen women 65 and older, and postmenopausal women under 65 at increased risk (B); men insufficient evidence (I)",
    "hypertension: screen adults 18 and older with office measurement and confirm outside the clinic before treatment (A)",
  ]
);
const STATIN = guide(
  "USPSTF, Statin Use for the Primary Prevention of Cardiovascular Disease in Adults (2022)",
  `${USPSTF}statin-use-in-adults-preventive-medication`,
  ["ages 40-75 with at least one risk factor: statin for 10-year CVD risk >=10% (B); selectively offer at 7.5% to <10% (C); insufficient evidence from 76 (I)"]
);
const HTN = guide(
  "2025 AHA/ACC et al. Guideline for the Prevention, Detection, Evaluation and Management of High Blood Pressure in Adults (AHA 'Top things to know')",
  "https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know",
  [
    "normal <120/<80; elevated 120-129/<80; stage 1 130-139 or 80-89; stage 2 >=140 or >=90 mm Hg; target <130/80 for all adults",
    "start medication with lifestyle change at an average >=140/90; at >=130/80 with clinical CVD, prior stroke, diabetes, CKD or a 10-year PREVENT risk >=7.5%; otherwise after a 3-6 month lifestyle trial if still >=130/80",
    "severe hypertension >180/120 without acute target-organ damage is evaluated and treated as an outpatient",
  ]
);
const GINA = guide(
  "GINA 2026 Global Strategy for Asthma Management and Prevention (May 2026), read through The Limbic's report of 2026-06-09",
  "https://ginasthma.org/reports/",
  [
    "adults and adolescents: low-dose ICS-formoterol as needed (Track 1) remains the preferred reliever approach",
    "children 6-11: SABA-only treatment is no longer recommended; as-needed ICS-formoterol is an option",
  ],
  CHECKED,
  "2027-05-14"
);
const ADA_HYPO = guide(
  "American Diabetes Association, hypoglycemia (professional resource, 2025)",
  "https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-hcp-5-27-25.pdf",
  ["level 1 below 70 mg/dL; level 2 below 54 mg/dL; 15 g fast-acting carbohydrate and recheck in 15 minutes; glucagon if the person cannot take carbohydrate by mouth"],
  "2026-11-07"
);

// Clinical depth objectives both courses teach, in our own wording. The two
// exams test the same family practice across the lifespan through different
// frames, so the clinical lines are shared and each course places them under
// its own domains.
const D = {
  history: "Take a focused or comprehensive history and review of systems that fits the complaint and the patient's age",
  exam: "Choose and perform a focused or complete physical examination, including developmental, functional and cognitive screens",
  screenCancer: "Apply current USPSTF cancer screening ages and intervals for colorectal, breast and cervical cancer",
  screenCardiometabolic: "Screen for hypertension, prediabetes and type 2 diabetes, and osteoporosis in the right populations",
  bpCategory: "Classify blood pressure by the 2025 categories and confirm a diagnosis with readings outside the clinic",
  differential: "Build and prioritize a differential diagnosis from history, examination and test results, ruling out the dangerous causes first",
  redFlags: "Recognize red flags that need emergency referral: chest pain, stroke symptoms, sepsis, an acute abdomen, ectopic pregnancy and suicidal intent",
  pedsGrowth: "Assess growth and developmental milestones from newborn through adolescence and identify delays",
  prenatal: "Provide prenatal and preconception care in primary care and recognize complications that need referral",
  olderAdult: "Assess older adults for falls, cognition, function, polypharmacy and frailty",
  htnTreat: "Start antihypertensive treatment at the 2025 thresholds and treat to below 130/80 for most adults",
  statin: "Decide on statin therapy for primary prevention by age, risk factors and 10-year cardiovascular risk",
  diabetesTreat: "Manage type 2 diabetes with lifestyle, metformin and agents chosen for cardiovascular, heart failure and kidney benefit",
  asthma: "Step asthma care by GINA, preferring as-needed ICS-formoterol over SABA-only treatment",
  antibiotics: "Treat common infections -- pharyngitis, otitis media, sinusitis, urinary tract infection, pneumonia -- with stewardship, including when not to prescribe",
  depression: "Screen for depression and anxiety, assess suicide risk, and start treatment or refer",
  pharm: "Prescribe safely: interactions, contraindications, renal and hepatic dosing, pregnancy and lactation, and older adults' risks",
  education: "Counsel on health promotion, harm reduction and disease prevention using motivational interviewing and shared decision-making",
  referral: "Initiate interprofessional referrals and consultations, and coordinate transitions of care",
  monitor: "Monitor treatment response and adverse effects, and modify the plan by patient outcomes",
  hypoglycemiaFollow: "Recognize hypoglycemia from diabetes treatment and adjust the regimen to prevent it",
} as const;

export const FNP_SIM_OBJECTIVES = {
  chestPain: "Recognize red flags that need emergency referral: chest pain, stroke symptoms, sepsis, an acute abdomen, ectopic pregnancy and suicidal intent",
} as const;

// ---------------------------------------------------------------------------
// AANPCB FNP
// ---------------------------------------------------------------------------
const aanp = (domain: string, items: number, pct: string, lines: string[]): UnitSource =>
  outline(`AANPCB 2024 FNP Examination Blueprint, Domain ${domain} (${items} of 135 scored items, ${pct})`, AANP_FNP_URL, lines);

const AANP_KNOWLEDGE = [
  "Knowledge area: Health Assessment (diagnostic and therapeutic tests; specialized assessments, e.g., developmental, functional, psychological; health history; physical examination)",
  "Knowledge area: Pathophysiology (anatomy; physiology; pathophysiology; co-morbidities)",
  "Knowledge area: Therapeutics (pharmacologic; non-pharmacologic; integrative)",
  "Knowledge area: Evidence-Informed Practice (crisis management; diagnostic reasoning; health promotion, harm reduction, and disease prevention; healthcare economics; interprofessional practice; legal and ethical issues; patient and family education and counseling; principles of epidemiology, population health, and social drivers of health; procedures; transitions of care; cultural responsiveness; therapeutic communication; pain management)",
];
const AGE_BANDS = "patient age, scored items: Newborn 3 (2%), Infant 4 (3%), Toddler 5 (4%), Child 6 (4%), Adolescent 12 (9%), Young Adult 30 (22%), Middle Adult 35 (26%), Older Adult 40 (30%); adolescent, young adult and middle adult include prenatal";

export const FNPAANP_TRACK: SeedTrack = {
  code: "FNPAANP",
  title: "Prep for the AANPCB Family Nurse Practitioner (FNP) Exam",
  description:
    "The American Academy of Nurse Practitioners Certification Board's family nurse practitioner board exam, built on its 2024 FNP Examination Blueprint: assess, diagnose, plan and evaluate across the lifespan, weighted as the blueprint weights them. Independent exam prep; not affiliated with or endorsed by AANPCB (NPCB) or the American Association of Nurse Practitioners.",
  trackType: "certification",
  subcategorySlug: "advanced-practice-nursing",
  freshnessModel: "certification_aligned",
  sourceUrl: AANP_FNP_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: NURSING_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    providerSlug: "aanpcb",
    providerName: "American Academy of Nurse Practitioners Certification Board (AANPCB, now styled NPCB)",
    providerUrl: "https://www.aanpcert.org",
    subcategorySlug: "advanced-practice-nursing",
    credentialType: "advanced_practice_certification",
    credentialSlug: "aanpcb-fnp",
    credentialName: "Family Nurse Practitioner (AANPCB)",
    credentialUrl: AANP_FNP_URL,
    basis: "vendor_exam_unpublished_code",
    examRevision: "2024 FNP Examination Blueprint",
    objectivesRevision: "2024 FNP Examination Blueprint (candidate portal and Handbook updated 06/2026)",
    versionNote: "AANPCB labels the blueprint '2024' and publishes no day it took effect.",
    status: "active",
    officialObjectivesUrl: AANP_FNP_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Completion of an accredited graduate, postgraduate or doctoral FNP program with three separate graduate courses in advanced physical assessment, advanced pharmacology and advanced pathophysiology, at least 500 faculty-supervised direct patient care clinical hours, and a current, active US RN license (FNP Candidate Handbook, updated 06/2026).",
    durationMinutes: 180,
    questionFormat: "150 multiple-choice questions in 3 hours: 135 scored and 15 unscored pretest questions, spread across eight patient-age bands.",
    passingScorePolicy:
      "A passing score set by recognized standard-setting methodology; scores are not reported as a percentage correct. A preliminary pass/fail result is given at the end of the exam. Candidates may test up to three times per calendar year.",
  },
  units: [
    {
      title: "Assess",
      weight: 32,
      sources: [
        aanp("01 Assess", 43, "32%", [
          "Obtain elements of subjective patient information (e.g., chief complaint, history, review of systems)",
          "Perform appropriate physical examination (e.g., focused, complete)",
          "Order, perform, and interpret screening and diagnostic tests",
          ...AANP_KNOWLEDGE,
        ]),
        outline("AANPCB 2024 FNP Examination Blueprint, Domain II Patient Age", AANP_FNP_URL, ["Domain II - Patient Age (developmental parameters, not defined ages)"], [AGE_BANDS]),
        SCREENING,
      ],
      gate: "Given a patient of any age in family practice, gather the history, examination and screening or diagnostic tests the presentation and the evidence call for, and interpret them.",
      objectives: [
        D.history,
        D.exam,
        "Order, perform and interpret screening and diagnostic tests, including when a test will not change management",
        D.screenCancer,
        D.screenCardiometabolic,
        D.bpCategory,
        D.pedsGrowth,
        D.olderAdult,
        "Assess risk from genetics, behavior, sexual history, substance use and social drivers of health",
        "Interpret common laboratory panels -- CBC, metabolic panel, lipids, A1C, thyroid tests, urinalysis -- in the clinical context",
      ],
    },
    {
      title: "Diagnose",
      weight: 26.5,
      sources: [
        aanp("02 Diagnose", 36, "26.5%", [
          "Synthesize and analyze subjective and objective information to develop differential diagnoses",
          "Prioritize differential diagnoses and establish primary diagnosis",
          ...AANP_KNOWLEDGE,
        ]),
      ],
      gate: "Given a patient's history, findings and tests, build a differential, rule out what is dangerous, and commit to a primary diagnosis.",
      objectives: [
        D.differential,
        D.redFlags,
        "Differentiate the common causes of chest pain, abdominal pain, headache, dyspnea and back pain in primary care",
        "Diagnose common pediatric conditions: otitis media, bronchiolitis, viral rashes, failure to thrive and developmental delay",
        "Diagnose common women's and men's health conditions, including vaginitis, sexually transmitted infections, benign prostatic hyperplasia and pregnancy complications",
        "Diagnose common chronic conditions -- hypertension, diabetes, dyslipidemia, asthma, COPD, hypothyroidism, depression -- from criteria",
        "Recognize atypical presentations in older adults, such as delirium or falls as the first sign of infection",
      ],
    },
    {
      title: "Plan",
      weight: 26.5,
      sources: [
        aanp("03 Plan", 36, "26.5%", [
          "Establish a patient-centered, evidence-based plan of care",
          "Initiate interprofessional referrals or consultations",
          "Prescribe, order or administer pharmacologic and non-pharmacologic treatments",
          "Provide education, counseling, and health promotion strategies",
          ...AANP_KNOWLEDGE,
        ]),
        HTN,
        STATIN,
        GINA,
      ],
      gate: "Given a diagnosis and the patient's goals, write an evidence-based plan: treatment, prescriptions, referrals and the education that makes the plan work.",
      objectives: [
        "Build a patient-centered, evidence-based plan of care with the patient's goals, culture and resources",
        D.htnTreat,
        D.statin,
        D.diabetesTreat,
        D.asthma,
        D.antibiotics,
        D.depression,
        D.pharm,
        D.prenatal,
        D.education,
        D.referral,
      ],
    },
    {
      title: "Evaluate",
      weight: 15,
      sources: [
        aanp("04 Evaluate", 20, "15%", [
          "Evaluate effectiveness of plan of care",
          "Monitor and modify plan of care based on patient outcomes",
          ...AANP_KNOWLEDGE,
        ]),
        ADA_HYPO,
      ],
      gate: "Given a patient on a plan of care, judge whether it is working from outcomes, adverse effects and the patient's experience, and change it when it is not.",
      objectives: [
        D.monitor,
        "Evaluate blood pressure, A1C, lipid and symptom control against targets and intensify or simplify treatment",
        D.hypoglycemiaFollow,
        "Recognize adverse drug effects and interactions, and deprescribe when harm outweighs benefit",
        "Use patient-reported outcomes and adherence barriers to evaluate a plan",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// ANCC FNP-BC
// ---------------------------------------------------------------------------
const ancc = (domain: string, items: number, pct: string, lines: string[]): UnitSource =>
  outline(`ANCC FNP-BC Test Content Outline (effective 2026-10-30), ${domain} (${items} of 150 scored questions, ${pct})`, ANCC_FNP_TCO_URL, lines);

export const FNPANCC_TRACK: SeedTrack = {
  code: "FNPANCC",
  title: "Prep for the ANCC Family Nurse Practitioner (FNP-BC) Exam",
  description:
    "ANCC's family nurse practitioner board certification exam, built on the FNP-BC Test Content Outline effective October 30, 2026: assessment, diagnosis, planning, implementation and evaluation across the lifespan, weighted as ANCC weights them. Independent exam prep; not affiliated with or endorsed by the American Nurses Credentialing Center (ANCC).",
  trackType: "certification",
  subcategorySlug: "advanced-practice-nursing",
  freshnessModel: "certification_aligned",
  sourceUrl: ANCC_FNP_TCO_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: NURSING_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    providerSlug: "ancc",
    providerName: "American Nurses Credentialing Center (ANCC)",
    providerUrl: "https://www.nursingworld.org/our-certifications/",
    subcategorySlug: "advanced-practice-nursing",
    credentialType: "advanced_practice_certification",
    credentialSlug: "ancc-fnp-bc",
    credentialName: "Family Nurse Practitioner-Board Certified (FNP-BC)",
    credentialUrl: ANCC_FNP_PAGE_URL,
    basis: "vendor_exam_unpublished_code",
    examRevision: "FNP-BC Test Content Outline, effective 2026-10-30",
    objectivesRevision: "FNP-BC TCO effective 2026-10-30 (updated 2026-04-06)",
    status: "active",
    effectiveDate: "2026-10-30",
    officialObjectivesUrl: ANCC_FNP_TCO_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "A current, active RN license; an FNP master's, post-graduate certificate or DNP from a CCNE-, ACEN- or CNEA-accredited program with at least 500 faculty-supervised clinical hours; and three separate graduate APRN core courses in advanced physiology/pathophysiology, health assessment and pharmacology. The credential is valid for 5 years.",
    durationMinutes: 210,
    questionFormat:
      "175 questions in 3.5 hours: 150 scored and 25 unscored pretest questions, also classified by body system, drug agent and eight age groups.",
    passingScorePolicy: "Scored on the 150 scored questions only; pretest questions do not affect the score. ANCC's FNP page reports a 2025 pass rate of 82%.",
    publishedWeightsNote:
      "ANCC's printed percentages are 17/17/19/33/13, which total 99; the outline says the total does not come to 100 because of rounding (the item counts 26/25/29/50/20 total 150). Kept as printed.",
  },
  units: [
    {
      title: "Assessment",
      weight: 17,
      sources: [
        ancc("I. Assessment", 26, "17%", [
          "A. Knowledge 1. Evidence-based health promotion and screening of the population",
          "B. Skill 1. Comprehensive history and physical assessment",
          "B. Skill 2. Focused history and physical assessment",
          "B. Skill 3. Functional assessment (e.g., cognitive, developmental, physical capacity, family and caregiver roles)",
          "B. Skill 4. Risk assessment (e.g., genetic, behavioral, sexual, lifestyle, cultural, social determinants of health)",
        ]),
        SCREENING,
      ],
      gate: "Given a patient of any age, choose a comprehensive or focused assessment, the functional and risk assessments that matter, and the screening the population evidence supports.",
      objectives: [
        D.history,
        D.exam,
        D.screenCancer,
        D.screenCardiometabolic,
        D.bpCategory,
        D.pedsGrowth,
        D.olderAdult,
        "Assess genetic, behavioral, sexual, lifestyle, cultural and social risk",
        "Assess family and caregiver roles as part of a functional assessment",
      ],
    },
    {
      title: "Diagnosis",
      weight: 17,
      sources: [
        ancc("II. Diagnosis", 25, "17%", [
          "A. Knowledge 1. Pathogenesis and pathophysiology, clinical manifestations, and implications of disease states",
          "B. Skill 1. Selecting appropriate diagnostic test(s) and/or procedures",
          "B. Skill 2. Interpreting results of diagnostic test(s) and/or procedures",
          "B. Skill 3. Differentiating between normal and abnormal overall health",
          "B. Skill 4. Formulating differential diagnoses",
        ]),
      ],
      gate: "Given a presentation, link the pathophysiology to the findings, choose and interpret the right tests, and formulate a prioritized differential.",
      objectives: [
        D.differential,
        D.redFlags,
        "Explain the pathophysiology behind common primary-care conditions and their presentations",
        "Select the diagnostic test that will change management, and interpret its result",
        "Tell normal variation (growth, aging, pregnancy) from disease",
        "Interpret common laboratory panels and imaging in the clinical context",
      ],
    },
    {
      title: "Planning",
      weight: 19,
      sources: [
        ancc("III. Planning", 29, "19%", [
          "A. Knowledge 1. Age-appropriate primary, secondary, and tertiary prevention",
          "A. Knowledge 2. Anticipatory guidance (e.g., developmental, behavioral, disease progression, crisis management, end-of-life care)",
          "A. Knowledge 3. Evidence-based clinical guidelines and standards of care",
          "A. Knowledge 4. Pharmacotherapeutics, pharmacokinetics, pharmacodynamics, and pharmacogenetics",
          "B. Skill 1. Ethnically and culturally sensitive practice",
          "B. Skill 2. Evidence-based research appraisal (e.g., design, results, clinical applicability)",
        ]),
        HTN,
        STATIN,
        GINA,
      ],
      gate: "Given a diagnosis and a patient, plan prevention, anticipatory guidance and guideline-based treatment that fits the patient's culture and the evidence.",
      objectives: [
        "Plan primary, secondary and tertiary prevention for the patient's age",
        "Give anticipatory guidance for development, behavior, disease progression and end of life",
        D.htnTreat,
        D.statin,
        D.diabetesTreat,
        D.asthma,
        "Apply pharmacokinetics, pharmacodynamics and pharmacogenetics to drug choice and dosing",
        "Plan care that is ethnically and culturally sensitive",
        "Appraise research design, results and applicability before changing practice",
        D.prenatal,
      ],
    },
    {
      title: "Implementation",
      weight: 33,
      sources: [
        ancc("IV. Implementation", 50, "33%", [
          "A. Knowledge 1. Legal and ethical implications for healthcare (e.g., HIPAA, confidentiality, accessibility, technology)",
          "A. Knowledge 2. Regulatory guidelines (e.g., reportable diseases, abuse reporting)",
          "A. Knowledge 3. Scope and Standards for Advanced Practice Registered Nurses",
          "A. Knowledge 4. Responsible and ethical use of information technology (e.g., voice recognition software, artificial intelligence, electronic health recording)",
          "B. Skill 1. Comprehensive documentation",
          "B. Skill 2. Patient-specific education",
          "B. Skill 3. Resource management (e.g., accessibility, coordination, cost-effectiveness)",
          "B. Skill 4. Therapeutic communication (e.g., motivational interviewing, shared decision making)",
          "B. Skill 5. Non-pharmacologic intervention and treatment (e.g., procedures, splinting, biopsies, sutures, imaging)",
          "B. Skill 6. Pharmacotherapeutic intervention (e.g., interactions, contraindications)",
        ]),
      ],
      gate: "Given a plan to carry out, act within APRN scope and the law: prescribe and perform procedures safely, document, teach, communicate and use technology responsibly.",
      objectives: [
        "Protect confidentiality and apply HIPAA, accessibility and consent rules in practice",
        "Report reportable diseases and suspected abuse as the law requires",
        "Practice within the APRN scope and standards and the state's practice rules",
        "Use AI tools, voice recognition and the electronic record responsibly, checking what they produce",
        "Document comprehensively for care, communication, billing and legal protection",
        "Teach each patient what they need in a way they can use",
        "Manage resources for access, coordination and cost-effectiveness",
        D.education,
        "Perform and order procedures, splinting, biopsies, wound repair and imaging appropriately",
        D.pharm,
        D.antibiotics,
        D.depression,
        D.referral,
      ],
    },
    {
      title: "Evaluation",
      weight: 13,
      sources: [
        ancc("V. Evaluation", 20, "13%", [
          "A. Knowledge 1. Ethical and legal principles and issues for patients, populations, and systems (eg, justice, consent, guardianship, bioethics)",
          "A. Knowledge 2. Non-pharmacologic intervention and treatment outcomes (eg, monitoring, side/adverse effects, patient outcomes)",
          "A. Knowledge 3. Pharmacotherapeutic intervention and treatment outcomes (eg, monitoring, side/adverse effects, patient outcomes)",
          "B. Skill 1. Analyze clinical data and patient reported outcomes to assess treatment efficacy",
        ]),
        ADA_HYPO,
      ],
      gate: "Given a patient on treatment, analyze clinical data and patient-reported outcomes to judge efficacy and harm, and weigh the ethical and legal issues that shape the next step.",
      objectives: [
        D.monitor,
        D.hypoglycemiaFollow,
        "Monitor drug therapy for adverse effects and interactions, and deprescribe when harm outweighs benefit",
        "Analyze clinical data and patient-reported outcomes to judge whether treatment works",
        "Apply justice, consent, guardianship and bioethics principles to treatment decisions",
      ],
    },
  ],
};

export const FNP_TRACKS: SeedTrack[] = [FNPAANP_TRACK, FNPANCC_TRACK];
