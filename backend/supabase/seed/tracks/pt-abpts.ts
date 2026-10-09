// ABPTS board-certified clinical specialist certifications (Strand 3 of
// docs/catalog-backlog.md, REQ-081). Ten specialties, each a separate
// proctored examination with its own published content outline on
// ABPTS's own site (specialization.apta.org), every one fetched and read
// on 2026-10-08 -- not a third-party summary.
//
// Modeling: a real, proctored, scored vendor examination that the body
// never gives an exam code -- the same shape as Google Cloud's
// certifications, so credential_basis 'vendor_exam_unpublished_code'
// (migration 016/017) and examCode left unset rather than invented.
//
// What ABPTS publishes for every specialty (exam-development and exam-
// resources pages): approximately 200 four-option multiple-choice items,
// standalone or case-based, delivered by PSI in four 50-question blocks of
// up to 90 minutes each; scaled scoring, criterion-referenced, passing
// score 500. Eligibility (minimum-requirements page): a current
// unrestricted US PT licence plus either 2,000 hours of direct patient
// care in the specialty within the last 10 years (500 of them in the last
// 3) or completion of an ABPTRFE-accredited residency within 10 years,
// plus per-specialty extras noted on each track.
//
// Weights below are the outline's own percentages. Where an outline gives
// learning-domain percentages AND a separate body-region or condition
// table (Orthopaedics, Pelvic & Women's Health, Cardiovascular &
// Pulmonary), the learning domains are the weighted units and the
// region/condition table is folded into objectives, since only one axis
// can carry the weight.
//
// Not built: Primary Care -- approved by the APTA House of Delegates in
// 2025, but its own page says the first exam "is expected to be
// administered in 2028 or 2029" and the DSP is "Coming Soon". Nothing to
// author yet; see the BLOCKED note in docs/catalog-backlog.md.
//
// Objectives are written in our own words from each outline's domains and
// condition lists -- deliberately not copied.

import type { SeedTrack } from "../data";

const ABPTS_PROVIDER = {
  providerSlug: "abpts",
  providerName: "American Board of Physical Therapy Specialties",
  providerUrl: "https://specialization.apta.org/",
  subcategorySlug: "physical-therapy",
  credentialType: "specialist_certification",
} as const;

const VERIFIED_AT = "2026-10-08T00:00:00Z";
const PT_DISCLAIMER_KEY = "pt-clinical-content";

const EXAM_FORMAT =
  "Approximately 200 four-option multiple-choice items, standalone or tied to case scenarios, delivered at PSI test centers in four 50-question blocks of up to 90 minutes each";
const PASSING = "Scaled score of 500; criterion-referenced standard set by ABPTS from a PSI standard-setting study.";
const DURATION = 360;

const BASE_ELIGIBILITY =
  "Current, unrestricted US physical therapist licence, plus either 2,000 hours of direct patient care in the specialty within the last 10 years (at least 500 within the last 3) or an ABPTRFE-accredited residency in the specialty completed within the last 10 years.";

function abptsCredential(params: {
  slug: string;
  name: string;
  url: string;
  outlineUrl: string;
  extraEligibility?: string;
}) {
  return {
    ...ABPTS_PROVIDER,
    credentialSlug: params.slug,
    credentialName: params.name,
    credentialUrl: params.url,
    basis: "vendor_exam_unpublished_code" as const,
    status: "active" as const,
    officialObjectivesUrl: params.outlineUrl,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: params.extraEligibility
      ? `${BASE_ELIGIBILITY} ${params.extraEligibility}`
      : BASE_ELIGIBILITY,
    durationMinutes: DURATION,
    questionFormat: EXAM_FORMAT,
    passingScorePolicy: PASSING,
  };
}

const COMMON = {
  trackType: "certification" as const,
  subcategorySlug: "physical-therapy",
  freshnessModel: "certification_aligned" as const,
  sourceVerifiedAt: VERIFIED_AT,
  requiresAcknowledgement: true,
  disclaimerKey: PT_DISCLAIMER_KEY,
  disclaimerVersion: 1,
};

// ---------------------------------------------------------------------------
// Orthopaedics. The newest outline of the ten: revalidation study 2022-2025,
// implemented in the 2026 Description of Specialty Practice. First exam
// 1989; 25,306 certified as of July 2026. Credential stated on-page as
// "Board-Certified Clinical Specialist in Orthopaedic Physical Therapy
// (OCS)". Note the 2027-cycle eligibility change the page flags: the 2,000
// hours must be subdivided by body region from that cycle on.
// ---------------------------------------------------------------------------
export const ABPTS_OCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSOCS",
  title: "Orthopaedic Clinical Specialist (OCS) Coach",
  description:
    "ABPTS board certification in orthopaedic physical therapy, on the 2026 outline: 30% specialty knowledge, 60% patient management, and a body-region table that puts the lumbar spine, shoulder and knee at the top.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/orthopaedics/specialist-certification-examination-outline-orthopaedics",
  credential: abptsCredential({
    slug: "orthopaedic-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Orthopaedic Physical Therapy (OCS)",
    url: "https://specialization.apta.org/become-a-specialist/orthopaedics",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/orthopaedics/specialist-certification-examination-outline-orthopaedics",
    extraEligibility:
      "From the 2027 exam cycle the 2,000 hours must be subdivided by body region, and observational or mentored hours under an OCS may substitute for part of them.",
  }),
  units: [
    {
      title: "Knowledge for specialty practice",
      weight: 30,
      gate: "Explain the tissue-level mechanism and healing timeline behind an orthopaedic presentation, and the exam, imaging and pharmacology facts that change management.",
      objectives: [
        "Regional anatomy and arthrokinematics of the spine, pelvis and extremities at a specialist level",
        "Tissue healing, load tolerance and the mechanobiology behind progression decisions",
        "Pain science applied to persistent musculoskeletal pain and its influence on examination and intervention",
        "Diagnostic imaging in orthopaedics: what each modality shows and when findings matter clinically",
        "Pharmacology relevant to orthopaedic patients: analgesics, corticosteroids, anticoagulants and their exercise implications",
        "Medical screening and differential diagnosis for red flags masquerading as musculoskeletal pain",
      ],
    },
    {
      title: "Clinical reasoning, professionalism, communication, education and systems-based practice",
      weight: 10,
      gate: "Defend a management decision with the evidence, the patient's values and the system constraints -- all three, named explicitly.",
      objectives: [
        "Clinical reasoning frameworks for orthopaedic diagnosis and treatment selection",
        "Professionalism and ethical practice in a specialist role",
        "Communication with patients, referrers and the care team about prognosis and expectations",
        "Education of patients, students and colleagues in orthopaedic practice",
        "Systems-based practice: payment, access and care pathways affecting orthopaedic management",
      ],
    },
    {
      title: "Patient management: spine, pelvis and craniomandibular region",
      // The 60% patient-management domain split by the body-region table's
      // own proportions (spine group 46%, upper extremity 21%, lower
      // extremity 33% of the regions) -> 28 / 13 / 19.
      weight: 28,
      gate: "For a spinal presentation, classify it, select the examination that confirms it, and name the intervention and progression the classification calls for.",
      objectives: [
        "Lumbar spine (19% of the body-region table): classification, examination, manual therapy, exercise and prognosis",
        "Cervical spine (12%): examination including vascular and ligamentous screening, treatment-based classification and intervention",
        "Thoracic spine and ribs (6%): examination, manipulation and exercise, and the visceral referral patterns to rule out",
        "Pelvic girdle, sacroiliac joint, coccyx and abdomen (6%): examination and management",
        "Head, maxillofacial and craniomandibular conditions (3%): temporomandibular examination and treatment",
      ],
    },
    {
      title: "Patient management: upper extremity",
      weight: 13,
      gate: "Given a shoulder, elbow or hand complaint, name the structure, the test that implicates it, and the staged intervention.",
      objectives: [
        "Shoulder and shoulder girdle (14%): rotator cuff, instability, adhesive capsulitis and post-surgical management",
        "Arm and elbow (4%): tendinopathy, instability and fracture rehabilitation",
        "Forearm, wrist and hand (3%): fracture, tendon and nerve conditions and their rehabilitation",
      ],
    },
    {
      title: "Patient management: lower extremity",
      weight: 19,
      gate: "Given a hip, knee or ankle presentation, differentiate the competing diagnoses and set the criteria for progression and return to activity.",
      objectives: [
        "Hip (10%): femoroacetabular, labral, osteoarthritic and post-arthroplasty management",
        "Thigh and knee (14%): ligament, meniscal, patellofemoral and post-surgical rehabilitation with return-to-activity criteria",
        "Leg, ankle and foot (9%): ankle sprain, Achilles and plantar conditions, fracture and tendinopathy management",
        "Outcome measures and prognosis across lower-extremity conditions",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Geriatrics. Outline gives knowledge areas (15%) and practice
// expectations (85%) with a long "not limited to" condition list. ~200
// items. No extra eligibility.
// ---------------------------------------------------------------------------
export const ABPTS_GCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSGCS",
  title: "Geriatric Clinical Specialist Coach",
  description:
    "ABPTS board certification in geriatric physical therapy: examination (25%) and intervention (25%) for the older adult, with the multisystem conditions -- falls, sarcopenia, dementia, fractures, heart failure -- the outline names.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/geriatrics/specialist-certification-examination-outline-geriatrics",
  credential: abptsCredential({
    slug: "geriatric-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Geriatric Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/geriatrics",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/geriatrics/specialist-certification-examination-outline-geriatrics",
  }),
  units: [
    {
      title: "Knowledge areas: foundation, clinical and behavioral sciences",
      weight: 15,
      gate: "Separate normal ageing from pathology in a presentation, and name the behavioral factor most likely to decide adherence.",
      objectives: [
        "Physiology of ageing across systems and how it changes normal values, exercise response and healing",
        "Clinical sciences of the common geriatric conditions: osteoporosis, osteoarthritis, heart failure, COPD, diabetes, dementia and Parkinson disease",
        "Behavioral sciences: cognition, depression, motivation and caregiver dynamics in older adults",
        "Pharmacology in older adults: polypharmacy, fall-risk medications and exercise interactions",
      ],
    },
    {
      title: "Professional roles and responsibilities",
      weight: 15,
      gate: "Describe the geriatric specialist's role in advocacy, interprofessional care and evidence appraisal with a concrete scenario.",
      objectives: [
        "Advocacy, ethics and consent with older adults, including capacity and surrogate decision-making",
        "Interprofessional and team-based care across acute, post-acute, home and community settings",
        "Evidence-based practice and outcome measurement in geriatric rehabilitation",
        "Education of patients, families, caregivers and staff",
      ],
    },
    {
      title: "Examination",
      weight: 25,
      gate: "Select the standardized measures that answer a specific clinical question for an older adult, and interpret them against age-referenced norms.",
      objectives: [
        "Fall-risk and balance examination with standardized measures and their cut-off scores",
        "Strength, power and sarcopenia/dynapenia assessment",
        "Gait and mobility examination, including assistive-device and community-ambulation thresholds",
        "Cognitive, mental-health and delirium screening within the physical therapy examination",
        "Cardiopulmonary and vital-sign examination in frail and multimorbid older adults",
        "Examination of pain, integumentary status, continence and nutrition as they bear on function",
      ],
    },
    {
      title: "Evaluation, diagnosis and prognosis",
      weight: 15,
      gate: "From examination findings in a multimorbid older adult, state the primary movement problem, the prognosis and the thing most likely to derail it.",
      objectives: [
        "Integrating multisystem findings into a movement-system diagnosis",
        "Prognosis in frailty, failure to thrive, post-hospitalization deconditioning and after hip or pelvic fracture",
        "Differentiating neurologic, musculoskeletal and cardiopulmonary contributors to mobility loss",
        "Recognizing conditions requiring medical referral: sepsis, dehydration, electrolyte imbalance and acute cardiac events",
      ],
    },
    {
      title: "Intervention",
      weight: 25,
      gate: "Prescribe an intervention with dose and progression for an older adult, and justify why it is safe given the comorbidities present.",
      objectives: [
        "Exercise prescription for strength, power and endurance in older adults, including dosing for frailty",
        "Fall-prevention and balance intervention programs with evidence-based components",
        "Rehabilitation after fracture, arthroplasty and amputation in older adults",
        "Neurologic rehabilitation in stroke, Parkinson disease, dementia and vestibular disorders",
        "Cardiopulmonary rehabilitation in heart failure, COPD and peripheral vascular disease",
        "Integumentary management: pressure injuries, skin tears and vascular and neuropathic wounds",
      ],
    },
    {
      title: "Outcomes",
      weight: 5,
      gate: "Choose an outcome measure that will detect meaningful change for this patient and state the minimal clinically important difference.",
      objectives: [
        "Selecting and interpreting outcome measures across impairment, activity and participation in older adults",
        "Using outcomes to justify continuation, discharge or a change in setting",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Neurology. Learning-domain weights (15/5/5/5/5/5/60) plus a condition
// table by body system. No extra eligibility.
// ---------------------------------------------------------------------------
export const ABPTS_NCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSNCS",
  title: "Neurologic Clinical Specialist Coach",
  description:
    "ABPTS board certification in neurologic physical therapy: 60% patient management across stroke, spinal cord injury, brain injury, Parkinson disease, multiple sclerosis, vestibular and balance disorders, with the knowledge, reasoning and systems domains the outline weights around it.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/neurology/specialist-certification-examination-outline-neurology",
  credential: abptsCredential({
    slug: "neurologic-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Neurologic Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/neurology",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/neurology/specialist-certification-examination-outline-neurology",
  }),
  units: [
    {
      title: "Knowledge for specialty practice",
      weight: 15,
      gate: "Localize a lesion from the presentation and explain the neuroplasticity principle that governs the recovery you expect.",
      objectives: [
        "Neuroanatomy and lesion localization: cortical, subcortical, brainstem, cerebellar, spinal and peripheral patterns",
        "Neuroplasticity and motor learning principles that drive intervention design",
        "Pathophysiology and medical management of stroke, aneurysm and arteriovenous malformation",
        "Pathophysiology of degenerative and inflammatory conditions: Parkinson disease, multiple sclerosis, ALS, Guillain-Barre syndrome, dementias",
        "Neuropharmacology and its effects on movement, fatigue and cognition",
      ],
    },
    {
      title: "Clinical reasoning, professionalism, communication, education and systems-based practice",
      weight: 25,
      gate: "Explain a prognosis and plan to a patient and family in plain language, and name the system constraint that shapes the setting of care.",
      objectives: [
        "Clinical reasoning across the continuum of neurologic care from ICU to community",
        "Professionalism and ethics in neurologic practice, including goals-of-care conversations",
        "Communication with patients with aphasia, cognitive impairment and their caregivers",
        "Education of patients, caregivers, students and interprofessional colleagues",
        "Systems-based practice: level-of-care decisions, payer rules and transitions between settings",
      ],
    },
    {
      title: "Patient management: examination, evaluation, diagnosis and prognosis",
      weight: 30,
      gate: "Choose the standardized measures that answer a specific question for a neurologic patient, and turn the results into a prognosis with a timeline.",
      objectives: [
        "Standardized examination of balance, gait, coordination, tone, sensation and cognition with cut-off scores",
        "Vestibular examination: oculomotor, positional and functional testing and differentiating peripheral from central causes",
        "Examination of the patient with spinal cord injury, including neurological level and ASIA classification",
        "Evaluation and diagnosis in movement disorders, cerebellar disorders, functional movement disorders and polyneuropathy",
        "Prognosis after stroke, traumatic and non-traumatic brain injury and spinal cord injury",
        "Recognizing medical instability and emergencies: autonomic dysreflexia, raised intracranial pressure, new neurologic signs",
      ],
    },
    {
      title: "Patient management: intervention and outcomes",
      weight: 30,
      gate: "Design a task-specific intervention with dose and progression for a stated neurologic diagnosis and stage, and state the outcome measure that will show it worked.",
      objectives: [
        "Task-specific training and neuroplasticity-based intervention for stroke and brain injury",
        "Gait training, orthotic and assistive-technology decisions in neurologic populations",
        "Vestibular rehabilitation and fall-prevention programs",
        "Intervention in progressive conditions: Parkinson disease, multiple sclerosis, ALS and dementia, including fatigue and exercise dosing",
        "Management after spinal cord injury: respiratory care, pressure-injury prevention, mobility and wheelchair seating",
        "Selecting outcome measures and using them to guide discharge and transition of care",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Cardiovascular & Pulmonary. Outline is case-history based with a
// diagnosis frequency distribution (60% frequently-seen, 30% occasionally,
// 10% rarely) and rank-ordered diagnosis lists. The page's own content
// rows sum to 85% under a stated total of 100% -- carried as published
// rather than padded; the app normalises weights, so readiness is
// unaffected. The frequency-distribution unit is deliberately unweighted. First exam 1985; 632
// certified as of July 2026. Extra eligibility: current AHA ACLS plus a
// data analysis project or case report.
// ---------------------------------------------------------------------------
export const ABPTS_CCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSCCS",
  title: "Cardiovascular & Pulmonary Clinical Specialist Coach",
  description:
    "ABPTS board certification in cardiovascular and pulmonary physical therapy: case-history examination weighted toward evaluation (30%), with the outline's own frequently-, occasionally- and rarely-seen diagnoses.",
  sourceUrl: "https://specialization.apta.org/become-a-specialist/cardiovascular-pulmonary/exam-outline",
  credential: abptsCredential({
    slug: "cardiovascular-pulmonary-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Cardiovascular and Pulmonary Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/cardiovascular-pulmonary",
    outlineUrl: "https://specialization.apta.org/become-a-specialist/cardiovascular-pulmonary/exam-outline",
    extraEligibility:
      "Also requires current Advanced Cardiac Life Support certification from the American Heart Association, plus one data analysis project (within 10 years) or one case report on a patient seen within the last 3 years.",
  }),
  units: [
    {
      title: "Professional behaviors, leadership, education, administration and consultation",
      weight: 5,
      gate: "Describe the specialist's consulting role on a cardiac or pulmonary unit with a concrete example.",
      objectives: [
        "Leadership, consultation and program administration in cardiopulmonary rehabilitation",
        "Education of patients, families and interprofessional staff about activity, risk and self-management",
      ],
    },
    {
      title: "Evidence-based clinical practice and critical inquiry",
      weight: 10,
      gate: "Appraise a cardiopulmonary rehabilitation study and state what it justifies in practice.",
      objectives: [
        "Critical inquiry principles and methods applied to cardiopulmonary rehabilitation evidence",
        "Clinical practice guidelines for cardiac and pulmonary rehabilitation and their limits",
      ],
    },
    {
      title: "Examination",
      weight: 15,
      gate: "From a case history, select the examination that establishes exercise safety and the physiologic limit to activity.",
      objectives: [
        "History and chart review: cardiac and pulmonary diagnoses, procedures, devices, labs and medications that change the plan",
        "Vital signs, ECG rhythm recognition and hemodynamic monitoring during examination",
        "Pulmonary examination: breath sounds, breathing pattern, cough and airway clearance assessment",
        "Exercise and functional testing: six-minute walk, submaximal and symptom-limited testing and when each is appropriate",
        "Examination of the patient with lines, drains, ventilators, pacemakers, defibrillators and ventricular assist devices",
      ],
    },
    {
      title: "Evaluation",
      weight: 30,
      gate: "Interpret the full data set -- rhythm, hemodynamics, gases, imaging, labs -- for a frequently-seen diagnosis and decide whether to proceed, modify or stop.",
      objectives: [
        "Interpreting ECG, arterial blood gases, pulmonary function tests, chest imaging and laboratory values",
        "Evaluating exercise responses in coronary disease, heart failure, dysrhythmia, hypertension and peripheral vascular disease",
        "Evaluating the post-procedure patient: angioplasty, bypass graft, valve replacement, pacemaker and defibrillator, transplant and assist devices",
        "Evaluating pulmonary presentations: COPD, asthma, pneumonia, atelectasis, effusion, respiratory failure, pulmonary embolism and post-operative complications",
        "Evaluating occasionally- and rarely-seen diagnoses: cystic fibrosis, lung transplant, congenital defects, ECMO, aortic repair and pericarditis",
        "Recognizing decompensation and emergencies that require stopping activity or escalating care",
      ],
    },
    {
      title: "Diagnosis and prognosis",
      weight: 5,
      gate: "State the physical therapy diagnosis and a realistic prognosis for a cardiopulmonary case, with the factor most likely to limit it.",
      objectives: [
        "Movement-system diagnosis in cardiovascular and pulmonary disease",
        "Prognosis across acute, inpatient rehabilitation, outpatient and home settings",
      ],
    },
    {
      title: "Plan of care and interventions",
      weight: 15,
      gate: "Write an exercise prescription with intensity, monitoring parameters and stop criteria for a specific cardiac or pulmonary diagnosis.",
      objectives: [
        "Exercise prescription and progression in cardiac rehabilitation phases",
        "Pulmonary rehabilitation: airway clearance, breathing retraining, inspiratory muscle training and oxygen titration",
        "Early mobilization in the ICU, including patients on mechanical ventilation and circulatory support",
        "Risk-factor modification and self-management education",
      ],
    },
    {
      title: "Outcomes",
      weight: 5,
      gate: "Select the outcome measure that will show change for a cardiopulmonary patient and state what change is meaningful.",
      objectives: [
        "Outcome measures for exercise capacity, dyspnea, quality of life and participation",
        "Using outcomes to guide discharge and transition between rehabilitation phases",
      ],
    },
    {
      title: "Diagnosis frequency distribution",
      gate: "Name which category -- frequently, occasionally or rarely seen -- a given diagnosis sits in, and why that changes how much exam attention it earns.",
      objectives: [
        "Frequently-seen diagnoses (60% of items): coronary and peripheral atherosclerosis, heart failure, hypertension, dysrhythmia, myocardial infarction, pulmonary edema, COPD, pneumonia, atelectasis and respiratory failure",
        "Occasionally-seen diagnoses (30%): aortic repair, ventricular assist devices, heart transplant, cystic fibrosis, lung resection and transplant, bronchiolitis and sarcoidosis",
        "Rarely-seen diagnoses (10%): congenital heart defects, ECMO, lymphedema, tuberculosis, bronchopulmonary dysplasia and heart-lung transplant",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Pediatrics. Knowledge 16%, professional roles 16%, patient management
// 68%; ~200 items; long illustrative condition list including NICU/PICU and
// school settings. No extra eligibility.
// ---------------------------------------------------------------------------
export const ABPTS_PCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSPCS",
  title: "Pediatric Clinical Specialist Coach",
  description:
    "ABPTS board certification in pediatric physical therapy: examination, evaluation and intervention (20% each) across cerebral palsy, developmental disabilities, congenital and genetic conditions, from the NICU to the school setting.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/pediatrics/specialist-certification-examination-outline-pediatrics",
  credential: abptsCredential({
    slug: "pediatric-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Pediatric Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/pediatrics",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/pediatrics/specialist-certification-examination-outline-pediatrics",
  }),
  units: [
    {
      title: "Knowledge areas: foundation, clinical, behavioral sciences and critical inquiry",
      weight: 16,
      gate: "Explain a developmental finding in terms of typical development, the pathology that alters it, and the family context that shapes intervention.",
      objectives: [
        "Typical motor, cognitive and social development from infancy through adolescence and the variability within it",
        "Clinical sciences of pediatric conditions: cerebral palsy, spina bifida, muscular dystrophy, Down syndrome, cystic fibrosis, congenital heart disease, juvenile arthritis",
        "Behavioral sciences: family-centered care, child and adolescent motivation, and the impact of disability on participation",
        "Critical inquiry: appraising pediatric evidence and using standardized developmental measures correctly",
      ],
    },
    {
      title: "Professional roles and responsibilities",
      weight: 16,
      gate: "Describe the pediatric specialist's role under early-intervention and special-education law with a concrete scenario.",
      objectives: [
        "Professional behaviors and core values in pediatric practice",
        "Leadership, administration and consultation in early intervention, school-based and medical settings",
        "Education of families, teachers and interprofessional colleagues",
        "Evidence-based practice and the pediatric physical therapist's contribution to research",
        "Legal and policy frameworks: IDEA early intervention and school-based services",
      ],
    },
    {
      title: "Examination",
      weight: 20,
      gate: "Select age-appropriate, standardized tests and measures for a stated child and setting, and justify the choice.",
      objectives: [
        "Standardized developmental and functional measures across ages, including norm-referenced versus criterion-referenced tools",
        "Examination of tone, reflexes, posture, gait and musculoskeletal alignment in children",
        "Examination of fitness, participation and activity in typically developing children and those with lifelong disability",
        "Examination in special settings: neonatal intensive care, pediatric intensive care, burn unit, early intervention and school",
      ],
    },
    {
      title: "Evaluation, diagnosis and prognosis",
      weight: 20,
      gate: "Integrate findings into a diagnosis and prognosis for a child, stating the classification level and what the family can expect.",
      objectives: [
        "Classification systems in cerebral palsy and their prognostic meaning",
        "Differentiating musculoskeletal, neuromuscular, cardiopulmonary and genetic contributors to a child's presentation",
        "Prognosis in developmental coordination disorder, developmental disability, autism spectrum disorder and acquired brain injury",
        "Recognizing conditions requiring medical referral: hip displacement, scoliosis progression, shunt malfunction, cardiorespiratory decline",
      ],
    },
    {
      title: "Intervention",
      weight: 20,
      gate: "Design a family-centered, participation-focused intervention with dose and progression for a stated pediatric condition and setting.",
      objectives: [
        "Motor learning and task-specific training in children with neuromuscular conditions",
        "Orthotic, assistive-technology, seating and mobility decisions across the lifespan of disability",
        "Intervention for musculoskeletal conditions: torticollis and plagiocephaly, scoliosis, fractures, sports injuries and limb deficiency",
        "Cardiopulmonary and fitness intervention in children with congenital heart disease, cystic fibrosis, asthma and obesity",
        "Intervention in the NICU and PICU and in early-intervention and school environments",
      ],
    },
    {
      title: "Outcomes",
      weight: 8,
      gate: "Choose an outcome measure that captures participation for a child and state what change would matter to the family.",
      objectives: [
        "Outcome measures at the body-function, activity and participation levels in pediatrics",
        "Using outcomes to set goals in IEPs and individualized family service plans",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Sports. Five domains (20/5/30/35/10) with named sub-areas. Extra
// eligibility: in-person CPR, emergency-management training, and 100
// athletic venue coverage hours (50 in contact sports).
// ---------------------------------------------------------------------------
export const ABPTS_SCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSSCS",
  title: "Sports Clinical Specialist Coach",
  description:
    "ABPTS board certification in sports physical therapy: clinical intervention (35%) and assessment (30%) for athletes, plus emergency management, injury prevention, performance and the sports science behind it.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/sports/specialist-certification-examination-outline-sports",
  credential: abptsCredential({
    slug: "sports-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Sports Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/sports",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/sports/specialist-certification-examination-outline-sports",
    extraEligibility:
      "Also requires current in-person CPR certification (AHA BLS Healthcare Provider or Red Cross CPR for the Professional Rescuer), evidence of acute injury and illness management training to First Responder or ECC standards, and 100 hours of athletic venue coverage within the last 10 years, at least 50 in contact sports.",
  }),
  units: [
    {
      title: "Knowledge areas",
      weight: 20,
      gate: "Explain the sports-science and medical-condition knowledge behind a return-to-play decision, not just the protocol.",
      objectives: [
        "Anatomy, physiology, normal movement science and clinical science applied to athletic populations",
        "Medical and surgical conditions in athletes, including concussion, cardiac screening findings and overtraining",
        "Sports science and wellness: periodization, energy systems, recovery and load monitoring",
        "Scope of practice and principles of teaching and learning in sports settings",
      ],
    },
    {
      title: "Professional roles and responsibilities",
      weight: 5,
      gate: "Describe the sports specialist's consultation and evidence roles within a team's medical staff.",
      objectives: [
        "Consultation and education with athletes, coaches, parents and medical staff",
        "Critical inquiry for evidence-based sports practice",
        "Administration of sports medicine services and event coverage",
      ],
    },
    {
      title: "Patient and client assessment",
      weight: 30,
      gate: "For an athletic injury, perform the examination that establishes the diagnosis and the functional tests that decide readiness to return.",
      objectives: [
        "Clinical examination and evaluation of sport-specific injuries of the spine and extremities",
        "On-field and sideline assessment, including concussion evaluation",
        "Diagnosis and prognosis for ligament, tendon, muscle, bone-stress and cartilage injuries",
        "Functional and performance testing used in return-to-sport decisions",
      ],
    },
    {
      title: "Patient and client clinical intervention",
      weight: 35,
      gate: "Design a rehabilitation and return-to-activity progression with objective criteria for each phase, and state the emergency plan for the venue.",
      objectives: [
        "Rehabilitation and return-to-activity progression with criterion-based phases",
        "Injury prevention programs and the epidemiology that justifies them",
        "Emergency management and athlete safety: spine-injury management, sudden cardiac arrest, heat illness and the emergency action plan",
        "Sports performance and enhancement: strength, power, speed and agility training",
        "Nutrition, fluids, supplements, ergogenic aids and drugs: what affects performance and recovery and the rules around them",
        "Non-emergency medical conditions in athletes: skin, respiratory, gastrointestinal and the female athlete triad / relative energy deficiency in sport",
      ],
    },
    {
      title: "Patient outcomes",
      weight: 10,
      gate: "Select an outcome measure that captures sport-specific function and interpret the change it shows.",
      objectives: [
        "Patient-reported and performance-based outcome measures for athletes",
        "Using outcomes to inform return-to-play clearance and re-injury risk",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Oncology. Approved 2016, first exam 2019, 281 certified as of July 2026.
// Knowledge 15%, professional roles 16%, patient management 69%. Extra
// eligibility: one case report (patient seen within 3 years).
// ---------------------------------------------------------------------------
export const ABPTS_ONC_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSONC",
  title: "Oncologic Clinical Specialist Coach",
  description:
    "ABPTS board certification in oncologic physical therapy: intervention and instruction (27%) and examination (23%) for people living with and beyond cancer, across treatment effects, lymphedema, fatigue and survivorship.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/oncology/specialist-certification-examination-outline-oncology",
  credential: abptsCredential({
    slug: "oncologic-clinical-specialist",
    name: "Board-Certified Clinical Specialist in Oncologic Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/oncology",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/oncology/specialist-certification-examination-outline-oncology",
    extraEligibility: "Also requires one case report on a patient seen within the last 3 years.",
  }),
  units: [
    {
      title: "Knowledge areas: foundation, behavioral and clinical sciences",
      weight: 15,
      gate: "Explain how a specific cancer treatment produces the impairment in front of you, and the precaution it creates for exercise.",
      objectives: [
        "Cancer biology, staging and the natural history of common cancers",
        "Effects of surgery, chemotherapy, radiation, hormonal and immunotherapy on the musculoskeletal, neurologic, cardiopulmonary and integumentary systems",
        "Behavioral sciences: distress, fear of recurrence, body image and family dynamics in cancer care",
        "Laboratory values, bone metastasis and other precautions that govern exercise safety in oncology",
      ],
    },
    {
      title: "Professional roles, responsibilities and values",
      weight: 16,
      gate: "Describe the oncology specialist's role in advocacy, consultation and evidence-based practice across the cancer continuum.",
      objectives: [
        "Professional behavior, development and communication in oncology settings, including palliative and end-of-life care",
        "Social responsibility, leadership, education and advocacy for rehabilitation access in cancer care",
        "Administration and consultation within cancer programs",
        "Evidence-based practice in oncology rehabilitation",
      ],
    },
    {
      title: "Examination and reexamination",
      weight: 23,
      gate: "Select the examination that establishes safety to proceed and quantifies the impairment for a patient at a stated point in treatment.",
      objectives: [
        "Screening for red flags: metastatic disease, spinal cord compression, deep vein thrombosis, febrile neutropenia",
        "Examination of cancer-related fatigue, chemotherapy-induced peripheral neuropathy and cognitive change",
        "Lymphedema examination, limb volume measurement and staging",
        "Examination of shoulder, trunk and pelvic function after breast, head and neck, thoracic and pelvic cancer treatment",
        "Cardiopulmonary and functional examination for exercise prescription during and after treatment",
      ],
    },
    {
      title: "Evaluation, diagnosis and prognosis",
      weight: 14,
      gate: "State the movement diagnosis and a prognosis for a patient at a given stage of treatment or survivorship, naming what limits it.",
      objectives: [
        "Integrating oncologic history, treatment phase and comorbidities into a movement-system diagnosis",
        "Prognosis during active treatment, in survivorship and in advanced disease",
        "Differentiating treatment-related impairment from disease progression and other causes",
      ],
    },
    {
      title: "Intervention and instruction",
      weight: 27,
      gate: "Prescribe exercise with dose and precautions for a specific cancer, treatment and lab picture, and state the instruction the patient needs.",
      objectives: [
        "Exercise prescription during and after treatment, including dosing with low blood counts, bone metastasis and cardiotoxicity",
        "Complete decongestive therapy and long-term management of lymphedema",
        "Management of cancer-related fatigue, neuropathy, pain and radiation fibrosis",
        "Rehabilitation after breast, head and neck, thoracic, abdominal and pelvic cancer surgery",
        "Prehabilitation, palliative rehabilitation and patient and caregiver instruction",
      ],
    },
    {
      title: "Outcomes",
      weight: 5,
      gate: "Choose an outcome measure appropriate to this patient's treatment stage and state what change is meaningful.",
      objectives: [
        "Outcome measures for fatigue, function, lymphedema and quality of life in oncology",
        "Using outcomes across the cancer continuum to guide the plan and communicate with the oncology team",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Clinical Electrophysiology. The only outline that publishes item counts
// per area (200 total). Extra eligibility: documented learning experiences
// with a board-certified PT or physician, three patient reports, and a log
// of the 500 most recent electrodiagnostic examinations.
// ---------------------------------------------------------------------------
export const ABPTS_ECS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSECS",
  title: "Clinical Electrophysiologic Specialist Coach",
  description:
    "ABPTS board certification in clinical electrophysiologic physical therapy: electrodiagnostic tests and measures (15%) and the evaluation of normal and abnormal electrophysiologic findings (25%), on the outline's own 200-item blueprint.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/clinical-electrophysiology/specialist-certification-examination-outline-clinical-electrophysiology",
  credential: abptsCredential({
    slug: "clinical-electrophysiologic-specialist",
    name: "Board-Certified Clinical Specialist in Clinical Electrophysiologic Physical Therapy",
    url: "https://specialization.apta.org/become-a-specialist/clinical-electrophysiology",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/clinical-electrophysiology/specialist-certification-examination-outline-clinical-electrophysiology",
    extraEligibility:
      "Also requires one to three documented learning experiences with a board-certified PT or physician within 10 years with an oversight letter, three patient reports (radiculopathy, peripheral nerve entrapment, polyneuropathy), and a log of the 500 most recently completed electrodiagnostic examinations within the last 10 years.",
  }),
  units: [
    {
      title: "Anatomy, neuroscience and physiology",
      rangeLabel: "42 of 200 items",
      weight: 21,
      gate: "Trace a nerve from root to muscle and predict which studies change, and how, when a lesion sits at a named point.",
      objectives: [
        "Peripheral nerve anatomy: roots, plexus, named nerves and the muscles each supplies",
        "Neuroscience of axonal conduction, demyelination and the neuromuscular junction",
        "Physiology of the motor unit, membrane potentials and the basis of evoked responses",
      ],
    },
    {
      title: "Clinical sciences, critical inquiry and professional roles",
      rangeLabel: "38 of 200 items",
      weight: 19,
      gate: "Explain the clinical science behind an electrodiagnostic referral and the standards governing how the study is performed and reported.",
      objectives: [
        "Clinical sciences of entrapment neuropathy, radiculopathy, polyneuropathy, motor neuron disease, myopathy and neuromuscular junction disorders",
        "Critical inquiry: reference values, sensitivity and specificity of electrodiagnostic tests",
        "Professional roles and responsibilities: scope, safety, infection control and reporting standards in electrodiagnosis",
      ],
    },
    {
      title: "Examination: history, systems review and tests and measures",
      rangeLabel: "40 of 200 items",
      weight: 20,
      gate: "Plan an electrodiagnostic study for a referral question: which nerves, which muscles, which techniques, and why.",
      objectives: [
        "History, systems review and reexamination that focus an electrodiagnostic study",
        "Nerve conduction studies: motor, sensory, late responses and repetitive stimulation technique",
        "Needle electromyography technique and muscle selection for a stated question",
        "Somatosensory and other evoked potentials and their indications",
      ],
    },
    {
      title: "Evaluation: normal and abnormal electrophysiologic characteristics",
      rangeLabel: "50 of 200 items",
      weight: 25,
      gate: "Read a set of nerve conduction and EMG findings, say whether each is normal, and localize and characterize the lesion the abnormalities describe.",
      objectives: [
        "Normal electrophysiologic values and the technical and physiologic factors that alter them",
        "Interpreting abnormal findings: axonal versus demyelinating, focal versus diffuse, acute versus chronic",
        "Patterns in carpal tunnel and cubital tunnel syndrome, radiculopathy, polyneuropathy, motor neuron disease, myopathy and myasthenia gravis",
      ],
    },
    {
      title: "Diagnosis, prognosis and interventions",
      rangeLabel: "30 of 200 items",
      weight: 15,
      gate: "Write the electrodiagnostic impression, state the prognosis it implies, and the communication and instruction the patient and referrer need.",
      objectives: [
        "Formulating the electrodiagnostic diagnosis and the differential it supports",
        "Prognosis from the severity and chronicity of electrophysiologic findings",
        "Coordination, communication and documentation of the study and its results",
        "Patient and client-related instruction following electrodiagnostic evaluation",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Pelvic and Women's Health. Formerly "Women's Health" -- formal title
// change September 2025, credential now "Board-Certified Pelvic & Women's
// Health Clinical Specialist (PWCS)". Approved 2006, first exam 2009, 1,005
// certified as of July 2026. ~200 items. Extra eligibility: one case
// reflection (patient seen within 3 years).
//
// The outline's section II sub-items sum to 96% against a stated 55%
// section total -- a discrepancy in ABPTS's own page, noted here rather
// than corrected. Units carry the three section totals (20/55/25) and the
// condition table is folded into the management objectives.
// ---------------------------------------------------------------------------
export const ABPTS_PWCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSPWCS",
  title: "Pelvic & Women's Health Clinical Specialist (PWCS) Coach",
  description:
    "ABPTS board certification in pelvic and women's health physical therapy (renamed from Women's Health in September 2025): patient and client management across pelvic floor dysfunction, urinary and bowel dysfunction, pregnancy and postpartum, lymphedema and sexual dysfunction.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/pelvic-womens-health/specialist-certification-examination-outline-womens-health",
  credential: abptsCredential({
    slug: "pelvic-womens-health-clinical-specialist",
    name: "Board-Certified Pelvic & Women's Health Clinical Specialist (PWCS)",
    url: "https://specialization.apta.org/become-a-specialist/pelvic-womens-health",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/pelvic-womens-health/specialist-certification-examination-outline-womens-health",
    extraEligibility:
      "Also requires one case reflection demonstrating specialty practice, based on a patient seen within the last 3 years.",
  }),
  units: [
    {
      title: "Knowledge areas: foundation, clinical and behavioral sciences",
      weight: 20,
      gate: "Explain the pelvic anatomy, hormonal physiology or psychosocial factor behind a presentation, not just the symptom.",
      objectives: [
        "Pelvic floor, abdominal wall and lumbopelvic anatomy and neurophysiology",
        "Physiology of pregnancy, postpartum, menopause and hormonal change and their musculoskeletal effects",
        "Clinical sciences of pelvic organ prolapse, chronic pelvic pain, endometriosis, interstitial cystitis, osteoporosis and fibromyalgia",
        "Behavioral sciences: trauma-informed care, sexual health and the psychosocial dimensions of pelvic conditions",
      ],
    },
    {
      title: "Patient and client management",
      weight: 55,
      gate: "Screen a pelvic health referral for conditions outside PT scope, then examine, diagnose and treat the pelvic floor or pregnancy-related problem with a specific, dosed intervention.",
      objectives: [
        "Screening for medical conditions requiring referral in pelvic and women's health, the outline's largest single area",
        "Internal and external pelvic floor examination, musculoskeletal examination and evaluation",
        "Diagnosis and prognosis in pelvic floor dysfunction and pain (26% of conditions): prolapse, chronic pelvic pain, endometriosis, cystitis",
        "Musculoskeletal dysfunction (26%): osteoporosis, fibromyalgia, pelvic girdle pain and post-surgical dysfunction",
        "Urinary dysfunction (15%): incontinence, retention and urgency, including bladder training and pelvic floor muscle training",
        "Pregnancy and postpartum (12%): musculoskeletal dysfunction, high-risk pregnancy precautions and return to activity",
        "Bowel dysfunction (5%), lymphedema (5%) and sexual dysfunction (5%): examination and intervention",
        "Other conditions (6%): cardiovascular, hormonal, oncologic, autoimmune and neurologic conditions in pelvic health practice",
        "Procedural interventions, coordination, communication, documentation and outcome measurement",
      ],
    },
    {
      title: "Professional practice expectations",
      weight: 25,
      gate: "Apply evidence, cultural humility and advocacy to a pelvic health scenario, naming the specific professional expectation involved.",
      objectives: [
        "Critical inquiry, clinical decision-making and evidence-based practice in pelvic health (the largest professional area at 8%)",
        "Communication, individual and cultural differences and trauma-informed professional behavior",
        "Education, leadership, social responsibility and advocacy for pelvic health access",
        "Administration and consultation in pelvic and women's health services",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Wound Management. The newest specialty: approved 2019, first exam 2022,
// 38 certified as of July 2026. Knowledge areas 32%, professional roles
// 5%, patient management 63%. Extra eligibility: one case report plus
// current CPR.
// ---------------------------------------------------------------------------
export const ABPTS_WMS_TRACK: SeedTrack = {
  ...COMMON,
  code: "ABPTSWMS",
  title: "Wound Management Clinical Specialist Coach",
  description:
    "ABPTS board certification in wound management physical therapy: wound clinical sciences, examination, evaluation and diagnosis (12-13% each) and interventions (14%) for pressure, vascular, neuropathic, surgical and burn wounds.",
  sourceUrl:
    "https://specialization.apta.org/become-a-specialist/wound-management/specialist-certification-examination-outline-wound-management",
  credential: abptsCredential({
    slug: "wound-management-clinical-specialist",
    name: "Board-Certified Wound Management Clinical Specialist",
    url: "https://specialization.apta.org/become-a-specialist/wound-management",
    outlineUrl:
      "https://specialization.apta.org/become-a-specialist/wound-management/specialist-certification-examination-outline-wound-management",
    extraEligibility:
      "Also requires one case report on a patient seen within the last 3 years and current CPR certification (AHA BLS or Red Cross Professional Rescuer).",
  }),
  units: [
    {
      title: "Foundation sciences: biological and physical",
      weight: 10,
      gate: "Explain the phase of healing a wound is in from its appearance, and the physical or biological factor stalling it.",
      objectives: [
        "Skin anatomy and the phases of wound healing",
        "Physiology of perfusion, oxygenation, edema and infection as they govern healing",
        "Physical agents in wound care: electrical stimulation, ultrasound, negative-pressure wound therapy and their mechanisms",
      ],
    },
    {
      title: "Behavioral sciences",
      weight: 5,
      gate: "Identify the behavioral or social factor most likely to decide whether this wound heals, and what to do about it.",
      objectives: [
        "Adherence, self-management and caregiver capacity in wound care",
        "Nutrition, smoking, mental health and social determinants affecting healing",
      ],
    },
    {
      title: "Wound management clinical sciences",
      weight: 12,
      gate: "Differentiate the etiology of a wound from its history, location and appearance, and name the comorbidity driving it.",
      objectives: [
        "Pressure injuries: etiology, staging and risk assessment",
        "Arterial, venous and mixed vascular wounds and lymphedema-related skin change",
        "Neuropathic and diabetic foot wounds, including offloading principles",
        "Surgical, traumatic and burn wounds and atypical wounds requiring referral",
        "Infection, biofilm, osteomyelitis and the laboratory and imaging findings that identify them",
      ],
    },
    {
      title: "Clinical inquiry for evidence-based practice and professional roles",
      weight: 10,
      gate: "Appraise wound-care evidence and describe the specialist's role in the interprofessional wound team.",
      objectives: [
        "Critical appraisal of wound-care evidence and guidelines",
        "Professional roles: consultation, documentation, regulatory requirements and interprofessional wound care",
      ],
    },
    {
      title: "Examination and evaluation",
      weight: 25,
      gate: "Measure and describe a wound completely, examine the perfusion and sensation around it, and interpret what the findings mean for healing potential.",
      objectives: [
        "Wound measurement, tissue type, exudate, periwound and photography standards",
        "Vascular examination: pulses, ankle-brachial index, toe pressures and capillary refill",
        "Sensory, pressure-mapping, nutritional and mobility examination relevant to wound risk",
        "Evaluating healing trajectory and the factors predicting non-healing",
      ],
    },
    {
      title: "Diagnosis and prognosis",
      weight: 18,
      gate: "State the wound diagnosis and a realistic healing prognosis with timeline, and what would change it.",
      objectives: [
        "Diagnosis by etiology and the differential among vascular, pressure, neuropathic and atypical wounds",
        "Prognosis and expected healing timelines by wound type and comorbidity",
        "Recognizing wounds requiring surgical, vascular or oncologic referral",
      ],
    },
    {
      title: "Interventions and outcomes",
      weight: 20,
      gate: "Select the debridement method, dressing, offloading and adjunct for a specific wound, and the outcome measure that will show it is healing.",
      objectives: [
        "Debridement methods: selective and non-selective, indications and contraindications",
        "Dressing selection matched to wound characteristics and moisture balance",
        "Compression therapy, offloading, positioning and support surfaces",
        "Adjunctive modalities and when the evidence supports them",
        "Outcome measurement: healing rate, wound area reduction and patient-reported outcomes",
      ],
    },
  ],
};

export const ABPTS_TRACKS: SeedTrack[] = [
  ABPTS_OCS_TRACK,
  ABPTS_GCS_TRACK,
  ABPTS_NCS_TRACK,
  ABPTS_CCS_TRACK,
  ABPTS_PCS_TRACK,
  ABPTS_SCS_TRACK,
  ABPTS_ONC_TRACK,
  ABPTS_ECS_TRACK,
  ABPTS_PWCS_TRACK,
  ABPTS_WMS_TRACK,
];
