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

import type { SeedTrack } from "../data";

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
      rangeLabel: "45-54 of 225 items",
      weight: 27,
      gate: "Given a musculoskeletal presentation, name the specific structure, special test, or intervention it calls for -- not a generic 'treat the joint' answer.",
      objectives: [
        "Differentiating musculoskeletal pathologies by history, mechanism of injury, and pattern of symptoms",
        "Selecting and interpreting orthopedic special tests for a given joint complaint",
        "Applying manual therapy and therapeutic exercise appropriate to tissue healing stage and irritability",
        "Prognosticating recovery timelines and functional outcomes for common musculoskeletal conditions",
        "Recognizing red flags that require referral rather than continued PT management",
        "Selecting outcome measures appropriate to a musculoskeletal condition and functional goal",
      ],
    },
    {
      title: "Neuromuscular and Nervous Systems",
      rangeLabel: "39-48 of 225 items",
      weight: 24,
      gate: "Given a neurological presentation, localize the lesion and name the specific intervention it calls for -- not a generic 'improve function' answer.",
      objectives: [
        "Differentiating upper motor neuron from lower motor neuron presentations",
        "Applying standardized neurological outcome measures (balance, gait, coordination) and interpreting results",
        "Selecting motor-learning and neuroplasticity-based interventions matched to the stage of recovery",
        "Managing common neurological diagnoses: stroke, spinal cord injury, traumatic brain injury, and peripheral neuropathy",
        "Recognizing signs of neurological decline or emergency (e.g., cauda equina, increasing ICP) that require immediate referral",
      ],
    },
    {
      title: "Cardiovascular and Pulmonary Systems",
      rangeLabel: "22-27 of 225 items",
      weight: 14,
      gate: "Given a patient's vital signs and history, determine whether it is safe to proceed with an intervention and what to modify -- not a generic 'monitor vitals' answer.",
      objectives: [
        "Interpreting vital signs, ECG basics, and exercise-response patterns to determine exercise safety",
        "Applying activity-progression guidelines for cardiac and pulmonary rehabilitation",
        "Recognizing signs of cardiopulmonary decompensation that require stopping treatment or emergency response",
        "Selecting airway clearance and breathing-retraining techniques for pulmonary conditions",
        "Interpreting oxygen saturation, RPE, and dyspnea scales during activity",
      ],
    },
    {
      title: "Integumentary System",
      rangeLabel: "8-11 of 225 items",
      weight: 5,
      gate: "Given a wound presentation, classify it correctly and select the specific dressing or intervention it calls for -- not a generic 'clean and cover' answer.",
      objectives: [
        "Classifying wounds by etiology and staging pressure injuries correctly",
        "Selecting wound care interventions and dressings matched to wound characteristics",
        "Recognizing signs of infection or non-healing that require referral",
      ],
    },
    {
      title: "System Interactions",
      rangeLabel: "8-10 of 225 items",
      weight: 5,
      gate: "Given a patient with comorbid conditions across systems, determine how one system's status changes the plan for another -- not a generic 'treat each problem separately' answer.",
      objectives: [
        "Recognizing how a comorbidity in one body system changes precautions or intervention selection for another",
        "Prioritizing a plan of care when multiple systems present competing demands",
      ],
    },
    {
      title: "Lymphatic System",
      rangeLabel: "4-7 of 225 items",
      weight: 3,
      gate: "Given a lymphedema presentation, select the specific stage-appropriate intervention it calls for -- not a generic 'reduce swelling' answer.",
      objectives: [
        "Staging lymphedema and selecting complete decongestive therapy components appropriately",
        "Recognizing contraindications to compression and manual lymphatic drainage",
      ],
    },
    {
      title: "Safety and Protection",
      rangeLabel: "5-7 of 225 items",
      weight: 3,
      gate: "Given a patient-safety scenario, name the specific fall-prevention or infection-control step it calls for -- not a generic 'be careful' answer.",
      objectives: [
        "Applying fall-risk screening tools and environmental/equipment modifications",
        "Applying infection-control precautions (standard, contact, droplet, airborne) correctly to a scenario",
        "Selecting the correct guarding technique and assistive device for a patient's functional level",
      ],
    },
    {
      title: "Equipment, Devices, and Technologies",
      rangeLabel: "5-6 of 225 items",
      weight: 3,
      gate: "Given a mobility or functional deficit, select the specific assistive device or orthosis it calls for -- not a generic 'give them a cane' answer.",
      objectives: [
        "Selecting and fitting assistive devices (canes, walkers, crutches) to a patient's impairment and gait pattern",
        "Selecting orthoses and prosthetic components appropriate to a presentation",
      ],
    },
    {
      title: "Metabolic and Endocrine Systems",
      rangeLabel: "4-6 of 225 items",
      weight: 3,
      gate: "Given a metabolic or endocrine complication (e.g., hypoglycemia, diabetic neuropathy), determine the specific exercise modification it calls for.",
      objectives: [
        "Recognizing signs of hypo/hyperglycemia during activity and responding appropriately",
        "Modifying exercise prescription for patients with diabetes, obesity, or other metabolic conditions",
      ],
    },
    {
      title: "Therapeutic Modalities",
      rangeLabel: "4-6 of 225 items",
      weight: 3,
      gate: "Given a tissue condition, select the specific modality and parameters it calls for -- not a generic 'apply heat or ice' answer.",
      objectives: [
        "Selecting thermal, electrical, and mechanical modalities matched to tissue state and treatment goal",
        "Applying contraindications and precautions for each modality correctly",
      ],
    },
    {
      title: "Gastrointestinal System",
      rangeLabel: "3-6 of 225 items",
      weight: 3,
      gate: "Given a GI-related complaint during a PT session, determine whether it's benign or requires referral.",
      objectives: [
        "Recognizing GI signs/symptoms that may indicate a condition outside the scope of PT management",
      ],
    },
    {
      title: "Professional Responsibilities",
      rangeLabel: "4-5 of 225 items",
      weight: 3,
      gate: "Given a professional or ethical scenario, apply the specific standard of practice or documentation requirement it calls for.",
      objectives: [
        "Applying the APTA Code of Ethics and standards of practice to a scenario",
        "Documenting care appropriately for legal, billing, and continuity-of-care purposes",
      ],
    },
    {
      title: "Genitourinary System",
      rangeLabel: "2-5 of 225 items",
      weight: 2,
      gate: "Given a genitourinary-related complaint, determine whether it's within PT scope or requires referral.",
      objectives: [
        "Recognizing genitourinary signs/symptoms relevant to pelvic-health or systemic screening",
      ],
    },
    {
      title: "Research and Evidence-Based Practice",
      rangeLabel: "3-5 of 225 items",
      weight: 2,
      gate: "Given a research study or outcome measure, interpret its validity/reliability and apply it to clinical decision-making -- not a generic 'evidence matters' answer.",
      objectives: [
        "Interpreting study design, validity, and reliability to judge whether evidence applies to a patient",
        "Selecting and interpreting standardized outcome measures appropriately",
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
      rangeLabel: "31-40 of 180 items",
      weight: 26,
      gate: "Given a musculoskeletal treatment session, apply the specific intervention or precaution a PTA carries out under the plan of care -- not a generic 'do the exercises' answer.",
      objectives: [
        "Implementing therapeutic exercise and manual therapy per a PT's established plan of care",
        "Recognizing when a patient's response to treatment requires reporting back to the supervising PT",
        "Applying joint-protection and tissue-healing precautions during intervention",
        "Documenting musculoskeletal treatment sessions and progress toward established goals",
      ],
    },
    {
      title: "Neuromuscular and Nervous Systems",
      rangeLabel: "27-35 of 180 items",
      weight: 22,
      gate: "Given a neurological patient during a treatment session, apply the specific motor-learning technique or safety precaution it calls for.",
      objectives: [
        "Implementing balance, gait, and coordination interventions per an established plan of care",
        "Recognizing neurological changes during a session that require immediate PT or medical notification",
        "Applying appropriate guarding and facilitation techniques for patients with neurological impairments",
      ],
    },
    {
      title: "Cardiovascular and Pulmonary Systems",
      rangeLabel: "20-27 of 180 items",
      weight: 17,
      gate: "Given a patient's vital signs during activity, determine whether to continue, modify, or stop the session -- not a generic 'watch the numbers' answer.",
      objectives: [
        "Monitoring vital signs and activity tolerance during a treatment session and responding to abnormal findings",
        "Implementing cardiac and pulmonary rehabilitation activities within established parameters",
        "Recognizing signs of cardiopulmonary distress that require stopping treatment and notifying the supervising PT",
      ],
    },
    {
      title: "Equipment, Devices, and Technologies",
      rangeLabel: "8-10 of 180 items",
      weight: 6,
      gate: "Given a patient using an assistive device, apply the specific fitting-check or gait-training step it calls for.",
      objectives: [
        "Implementing gait training with assistive devices per an established plan of care",
        "Checking assistive-device fit and function during use",
      ],
    },
    {
      title: "Safety and Protection",
      rangeLabel: "6-8 of 180 items",
      weight: 5,
      gate: "Given a patient-safety scenario during a session, apply the specific fall-prevention or infection-control step it calls for.",
      objectives: [
        "Applying fall-prevention techniques and correct guarding during functional activities",
        "Applying infection-control precautions correctly during patient care",
      ],
    },
    {
      title: "Integumentary System",
      rangeLabel: "3-8 of 180 items",
      weight: 4,
      gate: "Given a wound-care task delegated by a PT, apply the specific dressing or precaution it calls for.",
      objectives: [
        "Implementing wound-care interventions per an established plan of care",
        "Recognizing signs of wound infection or non-healing that require PT notification",
      ],
    },
    {
      title: "Metabolic and Endocrine Systems",
      rangeLabel: "4-6 of 180 items",
      weight: 4,
      gate: "Given a metabolic complication during activity (e.g., hypoglycemia), apply the specific response it calls for.",
      objectives: [
        "Recognizing and responding to signs of hypo/hyperglycemia during a treatment session",
      ],
    },
    {
      title: "Therapeutic Modalities",
      rangeLabel: "5-7 of 180 items",
      weight: 4,
      gate: "Given a modality ordered by a PT, apply the specific parameters and precautions it calls for -- not a generic 'apply heat or ice' answer.",
      objectives: [
        "Applying thermal, electrical, and mechanical modalities per an established plan of care",
        "Recognizing contraindications and precautions for each modality",
      ],
    },
    {
      title: "System Interactions",
      rangeLabel: "5-7 of 180 items",
      weight: 4,
      gate: "Given a patient with comorbid conditions, recognize when a change in one system requires modifying the current session.",
      objectives: [
        "Recognizing how a comorbidity changes precautions during an intervention already underway",
      ],
    },
    {
      title: "Lymphatic System",
      rangeLabel: "2-6 of 180 items",
      weight: 3,
      gate: "Given a lymphedema patient's session, apply the specific compression or positioning precaution it calls for.",
      objectives: [
        "Implementing complete decongestive therapy components per an established plan of care",
      ],
    },
    {
      title: "Professional Responsibilities",
      rangeLabel: "2-4 of 180 items",
      weight: 2,
      gate: "Given a professional or supervisory scenario, apply the specific scope-of-practice or documentation requirement it calls for.",
      objectives: [
        "Applying the PTA's scope of practice and supervision requirements to a scenario",
        "Documenting care appropriately within a PTA's role",
      ],
    },
    {
      title: "Gastrointestinal System",
      rangeLabel: "0-4 of 180 items",
      weight: 1,
      gate: "Given a GI-related complaint during a session, determine whether to continue treatment or notify the supervising PT.",
      objectives: [
        "Recognizing GI signs/symptoms during a session that require PT notification",
      ],
    },
    {
      title: "Genitourinary System",
      rangeLabel: "0-4 of 180 items",
      weight: 1,
      gate: "Given a genitourinary-related complaint during a session, determine whether to continue treatment or notify the supervising PT.",
      objectives: [
        "Recognizing genitourinary signs/symptoms during a session that require PT notification",
      ],
    },
    {
      title: "Research and Evidence-Based Practice",
      rangeLabel: "1-3 of 180 items",
      weight: 1,
      gate: "Given an outcome measure used in a session, apply it and interpret the result correctly.",
      objectives: [
        "Administering standardized outcome measures correctly and reporting results to the supervising PT",
      ],
    },
  ],
};

export const PT_TRACKS: SeedTrack[] = [NPTE_PT_TRACK, NPTE_PTA_TRACK];
