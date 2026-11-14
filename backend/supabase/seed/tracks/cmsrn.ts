// REQ-275: MSNCB Certified Medical-Surgical Registered Nurse (CMSRN) exam prep.
//
// What was read, and when (all 2026-11-14, on MSNCB's own site):
//   - msncb.org/CMSRN/Certification: the five domains and weights
//     (Patient/Care Management 32%, Holistic Patient Care 15%, Elements of
//     Interprofessional Care 17%, Professional Concepts 15%, Nursing Teamwork
//     and Collaboration 21%); 150 multiple-choice questions, 125 scored and
//     25 unscored pilot; 3 hours; a standard score of 95 to pass, "about 71%
//     correct", the raw score out of 125 converted for fairness across forms;
//     eligibility: an unencumbered, current RN license in the US, its
//     territories or Canada, and 2,000 practice hours in a medical-surgical
//     setting within three years (two years recommended); content validated
//     by a job task analysis at least every five years.
//   - "2023 CMSRN Exam Blueprint" (Appendix A, PDF created 2023-10-23),
//     https://www.msncb.org/Portals/1/CMSRN%20Materials/2023%20CMSRN%20Exam%20Blueprint.pdf
//     -- items per domain 40 / 19 / 21 / 19 / 26 = 125, "as of May 15, 2023",
//     and the subdomains with their numbered topics. Each unit's
//     exam_outline source carries the subdomain headings and topics as
//     printed (short headings only; the blueprint is MSNCB's); objectives are
//     our own wording.
//
// The blueprint is organized by nursing practice, not by disease: med-surg
// conditions are tested through these tasks. Clinical depth objectives (the
// "Depth" marker) apply the tasks to common med-surg situations, with their
// values from the dated sources below.
//
// Modeling: a proctored exam with no published exam code, credential_basis
// 'vendor_exam_unpublished_code'. MSNCB is the certifying board of the
// Academy of Medical-Surgical Nurses (AMSN).
//
// Clinical and professional key values (read 2026-11-14 unless marked):
//   - ANA, Code of Ethics for Nurses (2025 revision, released 2025-01-29;
//     ANA news release read 2026-11-14): a new tenth provision on global
//     health; the blueprint names the Code by title.
//   - 42 CFR 482.13(e) restraint and seclusion (eCFR, up to date as of
//     2026-07-16).
//   - Red Blood Cell Transfusion: 2023 AABB International Guidelines.
//   - Surviving Sepsis Campaign adult guidelines 2026 (SCCM page).
//   - Carried from the nursing courses' readings (2026-11-07): the 2019
//     NCSBN/ANA National Guidelines for Nursing Delegation (five rights),
//     CDC transmission-based precautions, ADA hypoglycemia levels and the
//     15-15 rule, and the ISMP list of error-prone abbreviations.

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
const REVIEW_DUE_AT = "2027-11-14T00:00:00Z";

export const CMSRN_BLUEPRINT_URL = "https://www.msncb.org/Portals/1/CMSRN%20Materials/2023%20CMSRN%20Exam%20Blueprint.pdf";
const CMSRN_PAGE_URL = "https://www.msncb.org/CMSRN/Certification";
const NURSING_DISCLAIMER_KEY = "nursing-clinical-content";

const bp = (domain: string, items: number, outline: string[]): UnitSource => ({
  title: `MSNCB 2023 CMSRN Exam Blueprint, ${domain} (${items} of 125 scored items)`,
  ...source(CMSRN_BLUEPRINT_URL, "exam_outline", CHECKED),
  outline,
});
const ref = (title: string, url: string, kind: UnitSource["kind"], keyValues: string[], checkedAt = CHECKED): UnitSource => ({
  title,
  ...source(url, kind, checkedAt),
  keyValues,
});

const DELEGATION = ref(
  "NCSBN and ANA, National Guidelines for Nursing Delegation (2019)",
  "https://www.nursingworld.org/globalassets/practiceandpolicy/nursing-excellence/ana-position-statements/nursing-practice/ana-ncsbn-joint-statement-on-delegation.pdf",
  "clinical_guideline",
  ["the five rights of delegation: right task, circumstance, person, directions and communication, and supervision and evaluation; the delegating nurse remains accountable, and nursing judgment (assessment, evaluation) is not delegated"],
  "2026-11-07"
);
const CDC_TBP = ref(
  "CDC, Transmission-Based Precautions",
  "https://www.cdc.gov/infection-control/hcp/basics/transmission-based-precautions.html",
  "clinical_guideline",
  ["contact: gown and gloves for any contact, dedicated equipment; droplet: a mask on entry; airborne: an airborne infection isolation room and a fit-tested N95 or higher respirator"],
  "2026-11-07"
);
const ADA_HYPO = ref(
  "American Diabetes Association, hypoglycemia (professional resource, 2025)",
  "https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-hcp-5-27-25.pdf",
  "clinical_guideline",
  ["level 1 hypoglycemia below 70 mg/dL, level 2 below 54 mg/dL; 15 g of fast-acting carbohydrate and recheck in 15 minutes; glucagon when the person cannot take carbohydrate by mouth"],
  "2026-11-07"
);
const ANA_CODE_2025 = ref(
  "ANA, Code of Ethics for Nurses (2025 revision), news release 2025-01-29",
  "https://www.nursingworld.org/news/news-releases/2025/code-of-ethics-for-nurses/",
  "reference",
  ["the Code was revised in 2025 (released 2025-01-29); the revision adds a tenth provision on nursing's role in global health and names nurses' self-care as part of the duty of care"]
);
const RESTRAINT = ref(
  "42 CFR 482.13(e), restraint or seclusion (eCFR, up to date as of 2026-07-16)",
  "https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-482/subpart-B/section-482.13",
  "clinical_guideline",
  [
    "restraint only when less restrictive measures have failed; never a standing or PRN order",
    "for violent or self-destructive behavior: at most 4 hours per order for adults, renewed up to 24 hours, and a face-to-face evaluation within 1 hour",
  ]
);
const AABB = ref(
  "Red Blood Cell Transfusion: 2023 AABB International Guidelines (JAMA 2023;330:1892)",
  "https://pubmed.ncbi.nlm.nih.gov/37824153/",
  "clinical_guideline",
  ["hemodynamically stable hospitalized adults: consider transfusion below hemoglobin 7 g/dL (8 for orthopedic surgery or preexisting cardiovascular disease)"]
);

export const CMSRN_SIM_OBJECTIVES = {
  postopBleed: "Recognize early postoperative hemorrhage from a rising heart rate, falling urine output and restlessness before the blood pressure falls, and escalate",
  delegation: "Delegate tasks to assistive personnel and LPNs using the five rights, keeping assessment and evaluation with the RN",
} as const;

export const CMSRN_TRACK: SeedTrack = {
  code: "CMSRN",
  title: "Prep for the Certified Medical-Surgical Registered Nurse (CMSRN) Exam",
  description:
    "MSNCB's medical-surgical nursing specialty certification, built on the 2023 CMSRN Exam Blueprint: patient and care management, holistic care, interprofessional care, professional concepts, and teamwork and collaboration, weighted as MSNCB weights them. Independent exam prep; not affiliated with or endorsed by the Medical-Surgical Nursing Certification Board (MSNCB).",
  trackType: "certification",
  subcategorySlug: "nursing-specialty-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: CMSRN_BLUEPRINT_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: NURSING_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    providerSlug: "msncb",
    providerName: "Medical-Surgical Nursing Certification Board (MSNCB)",
    providerUrl: "https://www.msncb.org",
    subcategorySlug: "nursing-specialty-certifications",
    credentialType: "specialist_certification",
    credentialSlug: "cmsrn",
    credentialName: "Certified Medical-Surgical Registered Nurse (CMSRN)",
    credentialUrl: CMSRN_PAGE_URL,
    basis: "vendor_exam_unpublished_code",
    examRevision: "2023 CMSRN Exam Blueprint (as of 2023-05-15)",
    objectivesRevision: "2023 CMSRN Exam Blueprint, Appendix A",
    status: "active",
    effectiveDate: "2023-05-15",
    officialObjectivesUrl: CMSRN_BLUEPRINT_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "An unencumbered, current RN license in the United States, its territories or Canada, and 2,000 practice hours in a medical-surgical setting within the past three years (as a clinical nurse, manager or educator); MSNCB recommends two full years of med-surg practice.",
    durationMinutes: 180,
    questionFormat: "150 multiple-choice questions in 3 hours: 125 scored and 25 unscored pilot questions.",
    passingScorePolicy:
      "A standard score of 95 passes, which MSNCB says is about 71% correct; the raw score out of 125 is converted to a standard score so forms can be compared fairly.",
  },
  units: [
    {
      title: "Patient/Care Management",
      weight: 32,
      sources: [
        bp("Patient/Care Management", 40, [
          "Patient Safety: nursing process; patient safety protocols (e.g., skin, falls, restraints, rounding, suicide); risk factors; patient safety culture (near miss reporting, just culture, speak up, high accountable organizations); care bundles; patient safety assessments and reporting (e.g., abuse, human trafficking, social determinants); risk assessment methods (RCA, FMEA, safety rounds, safety huddles)",
          "Infection Prevention: universal and transmission-based precautions; infection control practices and standards; current evidence-based practice for infection control and prevention; antimicrobial stewardship",
          "Medication Management: safe medication administration practices; patient medication education; polypharmacy; safe drug management and disposal; advanced access devices (ports, central lines, epidurals); financial implications to patients",
          "Pain Management: chronic and/or acute pain management (pharmacological, non-pharmacological, multimodal); patient pain management expectations; patient advocacy",
          "Non-Pharmacological Interventions: repositioning, heat or cold; complementary and alternative therapies",
          "Surgical/Procedural Nursing Management: pre- and post-procedural unit standards (consent, timeout, frequent monitoring); pertinent potential complications and management; scope of practice related to procedures (moderate/procedural sedation); supplies, instruments, and equipment",
          "Nutrition: individualized nutritional needs; nutrition administration modalities (enteral, parenteral); resources for alternate nutrition administration; indications for alternate nutrition administration",
        ]),
        CDC_TBP,
        RESTRAINT,
        ADA_HYPO,
        AABB,
      ],
      gate: "Given a medical-surgical patient's assessment, medications, devices and procedures, apply the nursing process to keep the patient safe: prevent harm and infection, manage pain and nutrition, and catch a complication early.",
      objectives: [
        "Apply the nursing process -- assess, diagnose, plan, implement, evaluate -- to a changing med-surg patient",
        "Apply safety protocols for skin, falls, restraint, hourly rounding and suicide risk",
        "Recognize patient, drug, environment and equipment risk factors for harm",
        "Report near misses and errors within a just culture, and speak up about unsafe care",
        "Implement care bundles and checklists, and explain why each element matters",
        "Screen for and report abuse, neglect and human trafficking, and address social needs",
        "Use root cause analysis, failure mode and effects analysis, safety rounds and huddles to reduce risk",
        "Select standard, contact, droplet or airborne precautions for the organism and the task",
        "Support antimicrobial stewardship: cultures before antibiotics where possible, the right duration, and de-escalation",
        "Administer medications safely, including IV therapy, and recognize interactions and adverse reactions",
        "Teach patients about their medications, and recognize polypharmacy in older adults",
        "Manage implanted ports, central lines and epidural catheters, and their complications",
        "Consider the cost of medications to the patient when planning discharge",
        "Manage acute and chronic pain with multimodal pharmacological and non-drug measures, and set realistic expectations with the patient",
        "Use repositioning, heat, cold and complementary therapies safely",
        "Apply pre- and post-procedure standards: consent, timeout and monitoring",
        "Monitor a patient during and after moderate sedation within the nurse's scope",
        "Assess nutritional needs and choose enteral or parenteral feeding with the dietitian and speech therapist",
        // Depth: common med-surg situations (sources above).
        CMSRN_SIM_OBJECTIVES.postopBleed,
        "Prevent and recognize postoperative complications: atelectasis, pneumonia, venous thromboembolism, ileus, urinary retention and wound infection",
        "Treat hypoglycemia with 15 g of fast-acting carbohydrate and a recheck in 15 minutes, or glucagon or IV dextrose when the patient cannot swallow",
        "Apply a restrictive transfusion threshold and monitor a transfusion closely from the start, stopping at once for a suspected reaction",
        "Use restraint only after less restrictive measures fail, on a time-limited order that is never PRN, with ongoing monitoring",
        "Recognize opioid-induced oversedation with a sedation scale before respiratory depression, and respond",
      ],
    },
    {
      title: "Holistic Patient Care",
      weight: 15,
      sources: [
        bp("Holistic Patient Care", 19, [
          "Patient-Centered Care: patient-centered care (active listening, communication preferences, family involvement, health goals); resources; patient advocacy; patient satisfaction management (grievances, second opinion, service recovery)",
          "Diversity and Inclusion: cultural and linguistic needs (sign, oral, and written languages); cultural and linguistic resources (translated materials, interpreter services); implicit bias",
          "Education of Patients and Families: health maintenance and disease prevention; health literacy; teaching methods",
          "Health Promotion: health promotion goals; resources available for patient/family; health information to meet patient needs",
          "Palliative/End-of-Life Care: resources (hospice, spiritual, cultural, physical); end-of-life preferences (advance directives, code status); post-mortem care; organ donation process; regulatory requirements for reporting death (e.g., coroner's case)",
        ]),
      ],
      gate: "Given a med-surg patient and family with their own goals, culture, language and literacy, plan care and teaching that fit them, through to the end of life.",
      objectives: [
        "Plan care around the patient's goals, communication preferences and family involvement",
        "Respond to a grievance or a request for a second opinion, and recover the patient's trust",
        "Use qualified interpreters, sign language services and translated materials",
        "Recognize implicit bias and how it can change care",
        "Assess health literacy and choose a teaching method that fits",
        "Confirm learning with teach-back",
        "Set health promotion goals with the patient and connect the family to resources",
        "Support end-of-life choices, advance directives and code status discussions",
        "Provide post-mortem care, refer for organ and tissue donation, and recognize a death that must be reported to the medical examiner",
        "Refer to palliative care and hospice, and meet spiritual and cultural needs at the end of life",
      ],
    },
    {
      title: "Elements of Interprofessional Care",
      weight: 17,
      sources: [
        bp("Elements of Interprofessional Care", 21, [
          "Nursing Process/Clinical Judgement Measurement Model: nursing process; strategies to individualize care",
          "Interprofessional Collaboration: role within the interdisciplinary team; interprofessional rounding; care coordination; collaborative problem solving",
          "Care Coordination and Transition Management: community resources; discharge planning, mobility, physical therapy; health history from multiple sources; discharge procedures (medication reconciliation); patient/family centered care; care coordination and transition; interprofessional roles; continuum of care; patients at risk for readmissions; social determinants of health; quality patient outcome measures",
          "Documentation: documentation of patient care; electronic health records; downtime procedures; coaching for documentation performance improvement",
          "Technology: technology, equipment use, and troubleshooting; technology trends in health care; nursing informatics",
        ]),
      ],
      gate: "Given a med-surg patient moving through the hospital and home, coordinate the team, the transition and the record so nothing is lost and readmission is less likely.",
      objectives: [
        "Use the clinical judgment model -- recognize cues, analyze, prioritize hypotheses, generate solutions, act, evaluate -- to individualize care",
        "Lead and contribute to interprofessional rounds and collaborative problem solving",
        "Plan discharge from admission with the team, the patient and community resources",
        "Reconcile medications at admission, transfer and discharge",
        "Identify patients at risk of readmission and the social drivers of health behind it",
        "Coordinate the transition to home, rehabilitation or long-term care",
        "Document care accurately in the electronic record and during downtime",
        "Troubleshoot equipment and technology, and use informatics to improve care",
        "Use quality outcome measures to judge whether care is working",
      ],
    },
    {
      title: "Professional Concepts",
      weight: 15,
      sources: [
        bp("Professional Concepts", 19, [
          "Communication: chain of command; communication skills; information sharing (SBAR, hand-off, closed-loop, check-back, read-back, huddle, verbal orders, bedside report, interdisciplinary); communication barriers; de-escalation techniques",
          "Critical Thinking: time management and prioritization of care; crisis situations and resources (rapid response team, deteriorating patients, early warning systems); crisis management; critical thinking",
          "Healthy Practice Environment: workplace safety; nurse resiliency and well-being; unintended consequences (moral distress, moral injury, compassion fatigue, burnout); resource allocation; peer accountability",
          "Scope of Practice and Ethics: scope of practice and code of ethics (Code of Ethics for Nurses with Interpretive Statements, Standard V of the AMSN Scope and Standards, local scope of practice); patients' rights and responsibilities; professional reporting and resources; policies, procedures, regulatory and licensure requirements, standards of practice, and laws",
          "Quality Management: evidence-based guidelines for nursing sensitive indicators; quality standards and policies; continuous quality and process improvement; nursing professional practice model; adverse event reporting; patient customer experience (surveys, value-based purchasing); service recovery; project development",
          "Evidence-Based Practice and Research: legislative and licensure requirements; evidence-based practice principles; research process",
        ]),
        ANA_CODE_2025,
      ],
      gate: "Given a communication, prioritization, ethics or quality situation on a med-surg unit, choose the professional response -- escalate, prioritize, speak up, report or improve -- that protects patients and staff.",
      objectives: [
        "Hand off and escalate with SBAR, closed-loop communication and read-back of verbal orders",
        "Use the chain of command when a concern is not resolved",
        "De-escalate an agitated patient or visitor with calm verbal techniques",
        "Prioritize a patient assignment and recognize which patient to see first",
        "Call the rapid response team on early warning signs of deterioration",
        "Recognize moral distress, compassion fatigue and burnout, and use resources for resilience",
        "Hold peers accountable and report unsafe practice through professional channels",
        "Practice within the state scope of practice and the ANA Code of Ethics for Nurses (2025 revision)",
        "Protect patients' rights, privacy and informed consent",
        "Use nursing-sensitive indicators and quality data to improve care",
        "Report adverse events and use patient experience data for service recovery",
        "Appraise evidence and apply it to practice through a structured process",
      ],
    },
    {
      title: "Nursing Teamwork and Collaboration",
      weight: 21,
      sources: [
        bp("Nursing Teamwork and Collaboration", 26, [
          "Delegation and Supervision: delegation and/or supervision practices; scope of practice (licensed and unlicensed team members); prioritization skills; budgetary considerations",
          "Career Development Relationships: professional engagement; mentoring and coaching resources; reflective practice; roles and responsibilities; coaching and learning theories; professional empowerment; orientation planning and preceptor best practices; career development resources",
          "Professional Development: professional nursing practice and individual competencies; professional behaviors; clinical judgement; peer review methods; educational needs assessment",
          "Leadership: regulatory and compliance standards; organizational structure; shared decision-making; nursing philosophy; leadership models; nursing care delivery systems; change management (ADKAR); recruitment and retention; employee engagement; staff advocacy; conflict management; financial stewardship",
          "Disaster Planning and Management: emergency procedures; hospital incident command structure",
        ]),
        DELEGATION,
      ],
      gate: "Given a med-surg team, an assignment, a new nurse to precept, a conflict or an emergency, delegate, lead and develop people within scope so patients stay safe.",
      objectives: [
        CMSRN_SIM_OBJECTIVES.delegation,
        "Match tasks to the scope of licensed and unlicensed team members",
        "Make staffing and supply decisions with patient safety and cost in mind",
        "Precept and orient a new nurse using adult learning principles",
        "Use reflective practice, mentoring and peer review to grow professionally",
        "Assess a team's learning needs and plan education to meet them",
        "Take part in shared decision-making and shared governance",
        "Lead a change on the unit using a change model such as ADKAR",
        "Manage conflict between team members constructively",
        "Respond to an internal or external disaster within the hospital incident command structure",
      ],
    },
  ],
};

export const CMSRN_TRACKS: SeedTrack[] = [CMSRN_TRACK];
