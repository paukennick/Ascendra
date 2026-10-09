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

import type { SeedTrack } from "../data";

const CAPTE_PROVIDER = {
  providerSlug: "capte",
  providerName: "Commission on Accreditation in Physical Therapy Education",
  providerUrl: "https://www.capteonline.org/",
  subcategorySlug: "physical-therapy",
  credentialType: "accredited_degree",
} as const;

const VERIFIED_AT = "2026-10-08T00:00:00Z";
const PT_DISCLAIMER_KEY = "pt-clinical-content";

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
        "Diagnostic imaging: reading the report and recognising what a PT should and should not infer from it",
        "Pharmacology: drug classes that alter exercise response, balance, cognition and healing",
        "Nutrition and its influence on recovery, tissue healing and performance",
        "Pain science and the lived pain experience, including central sensitisation and persistent pain",
        "Psychosocial aspects of health and disability, including behaviour change and adherence",
      ],
    },
    {
      title: "Ethics, values, service and leadership (7B)",
      gate: "Given a practice dilemma, name the principle of the APTA Code of Ethics or Core Value at stake and the action it requires.",
      objectives: [
        "The APTA Code of Ethics and Core Values for the physical therapist and physical therapist assistant, applied to real practice decisions",
        "Service and leadership: advocacy, community collaboration and responding to health care disparity",
        "Practising within the legal framework of the jurisdiction, including the state practice act and relevant federal requirements",
        "Professional responsibility: integrity, accountability and the duty to report",
      ],
    },
    {
      title: "Lifelong learning, education and health care disparities (7C)",
      gate: "Read a study abstract and state what it does and does not justify changing in a plan of care.",
      objectives: [
        "Evidence-informed practice: forming a clinical question and locating the best available evidence",
        "Interpreting statistical evidence: effect sizes, confidence intervals, minimal clinically important difference and study design limits",
        "Clinical reasoning and decision making as an explicit, defensible process",
        "Scholarly inquiry and the physical therapist's role in generating evidence",
        "Teaching and learning principles for educating patients, caregivers and other health professionals",
        "Health care disparities and the social determinants of health as they shape access, adherence and outcomes",
      ],
    },
    {
      title: "Examination and screening (7D1)",
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
      ],
    },
    {
      title: "Evaluation, diagnosis, prognosis and plan of care (7D2-7D9)",
      gate: "From a set of examination findings, write the ICF-structured problem list, the PT diagnosis, a prognosis with a timeline, and a plan of care that names who does what.",
      objectives: [
        "Evaluating examination data to make clinical judgments about impairments, activity limitations and participation restrictions",
        "Describing a patient's problems using the International Classification of Functioning, Disability and Health (ICF)",
        "Determining a physical therapy diagnosis that guides management",
        "Determining a prognosis with patient goals, expected outcomes, available resources (including payment sources) and expected time to achieve them",
        "Establishing a safe and effective plan of care in collaboration with the patient, caregivers, payers and other professionals",
        "Determining and supervising the components of care that may be directed to a physical therapist assistant: team-based care, patient needs, the PTA's competence, jurisdictional law, payer and facility policy",
        "Determining and supervising activities that may be directed to unlicensed support personnel",
        "Creating a discontinuation-of-care plan that optimises success after the episode ends",
      ],
    },
    {
      title: "Interventions and management of the delivery of care (7D10-7D16)",
      gate: "Given a condition and stage, select the specific intervention and dose, state how you will know it is working, and document it the way the jurisdiction requires.",
      objectives: [
        "Selecting and performing interventions for cardiovascular and pulmonary conditions to achieve patient goals",
        "Selecting and performing interventions for neurological and musculoskeletal conditions",
        "Selecting and performing interventions for integumentary, lymphatic and metabolic conditions",
        "Interventions across human development and for pain and the pain experience",
        "Monitoring and adjusting the plan of care to optimise health outcomes",
        "Assessing outcomes with appropriate standardised tests and measures at the impairment, activity and participation levels",
        "Educating others with teaching methods matched to the learner, including clinical education of students, with cultural humility and attention to social determinants of health",
        "Managing the delivery of care consistent with the practice environment's policies, including environmental emergencies",
        "Documentation that follows the practice act, the setting and regulatory requirements",
        "Participating in the case management process",
      ],
    },
    {
      title: "Health care activities and community health (7D17-7D22)",
      gate: "Describe how a physical therapist contributes to quality improvement, interprofessional care and population health -- with a concrete example, not a slogan.",
      objectives: [
        "Participating in ongoing assessment and improvement of the quality of services",
        "Patient-centred interprofessional collaborative practice",
        "Using health informatics in the health care environment",
        "Assessing care delivery with the principles of Health Systems Science, including the impact of policy and payment",
        "Physical therapy services informed by cultural humility across primary, secondary and tertiary prevention, health promotion and wellness",
        "Promoting health equity: reducing health disparities and considering social determinants of health in the plan of care",
      ],
    },
    {
      title: "Practice management (7D23-7D25)",
      gate: "Identify a safety, billing or regulatory risk in a practice scenario and the specific action that addresses it.",
      objectives: [
        "Assessing, documenting and minimising safety risks for patients and providers, including facility safety policies",
        "Participating in the financial management of the practice, including accurate billing and payment for services",
        "Practice management activities: marketing, public relations, regulatory and legal requirements, risk management, staffing and continuous quality improvement",
      ],
    },
  ],
};
