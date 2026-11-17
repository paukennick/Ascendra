// REQ-277: AACN PCCN progressive care nursing specialty certification,
// built the way the CCRN (Adult) course is (seed/tracks/ccrn.ts): same body,
// same Synergy Model framing, same credential shape, objectives built from
// AACN's patient-care problems with the Testable Nursing Actions folded in,
// then depth objectives in our own wording.
//
// What was read, and when (2026-11-14, in AACN's own document):
//   - AACN Certification Corporation, "PCCN Exam Handbook - Direct Care"
//     (July 2026 edition; PDF created 2026-06-17),
//     https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/pccnexamhandbook.pdf?la=en
//     The PCCN Test Plan "applies to exams taken on and after February 6,
//     2024" (handbook pp.10-13). Clinical Judgment 80%: Cardiovascular 20,
//     Respiratory 14, Endocrine 6, Hematology/Immunology/Oncology 3,
//     Neurology 7, Gastrointestinal 7, Renal 4, Musculoskeletal 2,
//     Multisystem 15, Behavioral/Psychosocial 3. Professional Caring and
//     Ethical Practice 20%: Advocacy/Caring Practices/Response to
//     Diversity/Facilitation of Learning 11, Collaboration/Systems
//     Thinking/Clinical Inquiry 9. AACN prints "The sum of these percentages
//     is not 100 due to rounding" (they total 101), kept as printed.
//     Exam: 3 hours, 150 multiple-choice items, 125 scored and 25 unscored;
//     adult patients only; modified Angoff cut score (p.2). Eligibility
//     (p.1): current unencumbered US RN or APRN license and either 1,750
//     hours of direct care of acutely/critically ill patients in the previous
//     two years (875 in the most recent year) or 2,000 hours in five years
//     (144 in the most recent year). AACN is moving to generic drug names.
//
// Modeling: as CCRN (Adult) -- a proctored exam with no published exam code,
// credential_basis 'vendor_exam_unpublished_code'. Unlike the CCRN plan,
// the PCCN plan weights every body system on its own, so each system is its
// own unit (no combined units), and the two Professional Caring groups are
// two units at AACN's 11% and 9%. AACN publishes no sub-weights inside them.
//
// Objectives: each unit begins with AACN's patient-care problems and
// testable actions in our own learner-facing words; the `outline` on each
// unit's exam_outline source carries AACN's headings as printed (headings
// only, copyrighted). Depth objectives after the "Depth" marker are our own
// wording from the clinical sources below; doses are left out of objective
// text.
//
// Clinical key values (each read on the day its source records):
//   - 2025 AHA/ACC et al. high blood pressure guideline, AHA "Top things to
//     know" page re-read 2026-11-14: categories, the <130/80 target, severe
//     hypertension >180/120 without acute organ damage managed as an
//     outpatient. The hypertensive-emergency line is as recorded by the CCRN
//     course (2026-10-31).
//   - Surviving Sepsis Campaign adult guidelines 2026, SCCM page re-read
//     2026-11-14.
//   - AHA/ASA 2026 acute ischemic stroke guideline: the AHA "Top things to
//     know" page re-read 2026-11-14 (4.5-hour window; no intensive lowering
//     below 140 after reperfusion). The 185/110 and 180/105 limits are carried
//     from the CCRN course's 2026-11-11 reading (a summary, the full text
//     refused access) and dated as read then.
//   - Hyperglycemic crises consensus 2024 (DKA/HHS criteria): carried from the
//     CCRN course's 2026-11-11 reading.
//   - KDIGO 2012 AKI guideline PDF, read 2026-11-14 (definition and stages;
//     kdigo.org shows a 2026 AKI/AKD guideline in public-review draft, not
//     final -- recheck by 2027-05-14).
//   - Red Blood Cell Transfusion: 2023 AABB International Guidelines (JAMA
//     2023;330:1892), PubMed abstract read 2026-11-14.
//   - BTS emergency oxygen guideline (88-92% when at risk of hypercapnia),
//     carried from value-sources.ts (read 2026-11-08). GOLD 2026's key-changes
//     PDF (read 2026-11-14) revises the exacerbation chapter but its excerpt
//     gives no saturation target, so none is attributed to GOLD.
//   - 42 CFR 482.13(e) restraint rules, eCFR read 2026-11-14.
// Not verified, left out: ACS door-to-device times (the 2025 ACC/AHA ACS
// guideline pages refused automated access); CIWA-Ar and COWS cut-offs.

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
const REVIEW_DUE_AT = "2027-11-14T00:00:00Z";

export const PCCN_HANDBOOK_URL =
  "https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/pccnexamhandbook.pdf?la=en";

const NURSING_DISCLAIMER_KEY = "nursing-clinical-content";

const plan = (area: string, outline: string[]): UnitSource => ({
  title: `AACN PCCN Exam Handbook - Direct Care (July 2026), PCCN Test Plan (exams on and after 2024-02-06): ${area}`,
  ...source(PCCN_HANDBOOK_URL, "exam_outline", CHECKED),
  outline,
});
const guide = (title: string, url: string, checkedAt: string, keyValues: string[], recheckBy?: string): UnitSource => ({
  title,
  ...source(url, "clinical_guideline", checkedAt, recheckBy),
  keyValues,
});

const HTN_2025 = guide(
  "2025 AHA/ACC et al. Guideline for the Prevention, Detection, Evaluation and Management of High Blood Pressure in Adults (AHA 'Top things to know')",
  "https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know",
  CHECKED,
  [
    "categories: normal <120/<80; elevated 120-129/<80; stage 1 130-139 or 80-89; stage 2 >=140 or >=90 mm Hg; treatment target <130/80 for most adults",
    "severe hypertension is >180/120 mm Hg WITHOUT acute target-organ damage and is managed as an outpatient with oral drugs; with acute organ damage it is a hypertensive emergency treated in hospital with IV agents",
  ]
);
const SSC_2026 = guide(
  "Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2026 (adults)",
  "https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026",
  CHECKED,
  [
    "initial MAP target 65 mm Hg (60-65 suggested from age 65); norepinephrine first line",
    "at least 30 mL/kg IV crystalloid in the first 3 hours for sepsis-induced hypoperfusion or septic shock (conditional), individualized and reassessed",
    "antimicrobials immediately, ideally within 1 hour, for possible, probable or definite septic shock and for probable or definite sepsis; within 3 hours of first suspicion after rapid assessment when sepsis without shock is only possible; blood cultures as soon as possible and ideally before antimicrobials",
    "measure lactate; use serial lactate to guide resuscitation rather than giving fluid until it normalizes",
  ]
);
const AIS_2026 = guide(
  "AHA/ASA 2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke (Stroke, doi:10.1161/STR.0000000000000513)",
  "https://professional.heart.org/en/science-news/2026-guideline-for-the-early-management-of-patients-with-acute-ischemic-stroke/top-things-to-know",
  CHECKED,
  [
    "IV thrombolysis (alteplase or tenecteplase) within 4.5 hours of onset; selected patients to 9 hours or unknown onset with advanced imaging",
    "blood pressure below 185/110 mm Hg before IV thrombolysis and below 180/105 mm Hg for at least 24 hours after (as read 2026-11-11 through a summary)",
    "intensive systolic lowering below 140 mm Hg after reperfusion is not recommended",
  ]
);
const HYPERGLYCEMIC_CRISES = guide(
  "Hyperglycemic Crises in Adults With Diabetes: A Consensus Report (Diabetes Care 2024;47:1257, doi:10.2337/dci24-0032)",
  "https://doi.org/10.2337/dci24-0032",
  "2026-11-11",
  [
    "DKA: glucose >=200 mg/dL or known diabetes; beta-hydroxybutyrate >=3.0 mmol/L; pH <7.3 and/or bicarbonate <18 mmol/L",
    "HHS: glucose >=600 mg/dL; effective osmolality >300 mOsm/kg; beta-hydroxybutyrate <3.0 mmol/L; pH >=7.3 and bicarbonate >=15 mmol/L",
    "insulin waits until potassium is above 3.5 mmol/L; add dextrose when glucose falls below 250 mg/dL",
  ]
);
const KDIGO_AKI = guide(
  "KDIGO 2012 Clinical Practice Guideline for Acute Kidney Injury (Kidney Int Suppl 2012;2:1)",
  "https://kdigo.org/wp-content/uploads/2016/10/KDIGO-2012-AKI-Guideline-English.pdf",
  CHECKED,
  [
    "AKI: creatinine up by >=0.3 mg/dL within 48 hours, or to >=1.5 times baseline within the prior 7 days, or urine output <0.5 mL/kg/h for 6 hours",
    "stage 3 includes creatinine >=3 times baseline or >=4.0 mg/dL, starting renal replacement therapy, urine <0.3 mL/kg/h for 24 hours or anuria for 12 hours",
  ],
  "2027-05-14"
);
const AABB_RBC_2023 = guide(
  "Red Blood Cell Transfusion: 2023 AABB International Guidelines (JAMA 2023;330(19):1892-1902, doi:10.1001/jama.2023.12914)",
  "https://pubmed.ncbi.nlm.nih.gov/37824153/",
  CHECKED,
  ["hemodynamically stable hospitalized adults: consider transfusion below hemoglobin 7 g/dL (7.5 for cardiac surgery; 8 for orthopedic surgery or preexisting cardiovascular disease)"]
);
const BTS_OXYGEN = guide(
  "BTS guideline for oxygen use in healthcare and emergency settings",
  "https://www.brit-thoracic.org.uk/clinical-resources/guidelines/emergency-oxygen/",
  "2026-11-08",
  ["target SpO2 88-92% for known COPD or other risk of hypercapnic respiratory failure; 94-98% for most others"]
);
const CFR_RESTRAINT = guide(
  "42 CFR 482.13(e) Condition of participation: patient's rights, restraint or seclusion (eCFR)",
  "https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-482/subpart-B/section-482.13",
  CHECKED,
  [
    "never a standing or PRN order; for violent or self-destructive behavior each order lasts at most 4 hours for adults (2 for ages 9-17, 1 under 9), renewed up to 24 hours",
    "face-to-face evaluation within 1 hour of starting restraint or seclusion for violent or self-destructive behavior",
  ]
);

// The two exact titles the bedside sims attach to (lib/sim/documents.ts).
export const PCCN_SIM_OBJECTIVES = {
  accessBleed: "Recognize retroperitoneal bleeding after femoral catheterization from back or flank pain, falling blood pressure and a rising heart rate, and act before the hemoglobin result",
  copdNiv: "Manage a COPD exacerbation with titrated oxygen and noninvasive ventilation, and recognize when it is failing",
} as const;

export const PCCN_TRACK: SeedTrack = {
  code: "PCCN",
  title: "Prep for a progressive care nursing certification exam",
  description:
    "AACN's progressive care nursing specialty certification for nurses caring for acutely ill adults, built on the PCCN Test Plan in force since February 6 2024: ten body-system clinical judgment categories (80%) and Professional Caring & Ethical Practice through the Synergy Model (20%), weighted as AACN weights them. Independent exam prep; not affiliated with or endorsed by AACN Certification Corporation.",
  trackType: "certification",
  subcategorySlug: "nursing-specialty-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: PCCN_HANDBOOK_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: NURSING_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    providerSlug: "aacn-certification-corp",
    providerName: "AACN Certification Corporation",
    providerUrl: "https://www.aacn.org/certification",
    subcategorySlug: "nursing-specialty-certifications",
    credentialType: "specialist_certification",
    credentialSlug: "pccn",
    credentialName: "PCCN",
    credentialUrl: "https://www.aacn.org/certification/get-certified/pccn",
    basis: "vendor_exam_unpublished_code",
    examRevision: "PCCN Test Plan, effective 2024-02-06",
    objectivesRevision: "PCCN Test Plan 2024-02-06 (Handbook July 2026)",
    status: "active",
    effectiveDate: "2024-02-06",
    officialObjectivesUrl: PCCN_HANDBOOK_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Current, unencumbered US RN or APRN license, plus either 1,750 hours of direct care of acutely/critically ill adults in the previous 2 years (875 of them in the most recent year) or at least 2,000 such hours over the previous 5 years (144 of them in the most recent year).",
    durationMinutes: 180,
    questionFormat:
      "150 multiple-choice items in 3 hours: 125 scored and 25 unscored. Adult patients only. 80% Clinical Judgment, 20% Professional Caring & Ethical Practice, organized by the AACN Synergy Model for Patient Care.",
    passingScorePolicy:
      "Criterion-referenced: the cut score is set by the modified Angoff method and approved by AACN Certification Corporation; each candidate is measured against that standard, not against other candidates.",
    publishedWeightsNote:
      "AACN's printed category percentages total 101 (20/14/6/3/7/7/4/2/15/3 and 11/9); the handbook says the sum is not 100 because of rounding. Kept as printed.",
  },
  units: [
    {
      title: "Cardiovascular",
      weight: 20,
      sources: [
        plan("1A Cardiovascular and its Testable Nursing Actions", [
          "Acute coronary syndromes (NSTEMI, STEMI, unstable angina)",
          "Acute inflammatory disease (e.g., myocarditis, endocarditis, pericarditis)",
          "Aneurysms (dissecting or ruptured)",
          "Cardiac surgery (e.g., post ICU care)",
          "Cardiac tamponade",
          "Cardiac/vascular catheterization (diagnostic, interventional)",
          "Cardiogenic shock",
          "Cardiomyopathies (dilated, hypertrophic, restrictive, Takotsubo)",
          "Dysrhythmias",
          "Heart failure (acute exacerbations, chronic)",
          "Hypertension (uncontrolled)",
          "Hypertensive crisis",
          "Structural heart procedures (e.g., TAVR, mitral clip)",
          "Valvular heart disease",
          "Vascular disease",
          "Testable actions: identify, interpret and monitor dysrhythmias, QTc intervals, ST segments; manage arterial lines, CVP, non-invasive hemodynamic monitoring; manage patients requiring ablation, arterial closure devices, sheaths, cardiac catheterization, cardioversion, defibrillation, pacemakers, pericardial drain, PCI, TEE, ventricular assist devices; select leads for cardiac monitoring",
        ]),
        HTN_2025,
      ],
      gate: "Given a moderately stable adult on telemetry with new symptoms, rhythm changes or a recent procedure, recognize the cardiovascular problem early, choose the nursing priority, and manage the monitoring, device or procedure care it needs.",
      objectives: [
        "Acute coronary syndromes -- unstable angina, NSTEMI and STEMI -- and the care that follows them on a progressive care unit",
        "Myocarditis, endocarditis and pericarditis in the acutely ill adult",
        "Dissecting or ruptured aneurysm: recognition and the first actions",
        "Care of the adult stepped down from intensive care after cardiac surgery",
        "Cardiac tamponade, including after a procedure or surgery",
        "Care before and after diagnostic and interventional cardiac or vascular catheterization, including sheaths and arterial closure devices",
        "Cardiogenic shock recognized on a progressive care unit and escalated",
        "Dilated, hypertrophic, restrictive and Takotsubo cardiomyopathy and how each changes nursing care",
        "Identify, interpret and respond to dysrhythmias on continuous monitoring",
        "Monitor QTc intervals and ST segments, and select monitoring leads for the patient's disease",
        "Heart failure: acute exacerbation with pulmonary edema, and chronic heart failure",
        "Uncontrolled hypertension and hypertensive crisis",
        "Care after structural heart procedures such as TAVR and transcatheter mitral repair",
        "Valvular heart disease and vascular disease in the acutely ill adult",
        "Manage arterial lines, central venous pressure and non-invasive hemodynamic monitoring",
        "Care for patients undergoing ablation, cardioversion, defibrillation and transesophageal echocardiography",
        "Care for patients with single-chamber, dual-chamber and biventricular pacemakers, pericardial drains and ventricular assist devices",
        // Depth (our wording; sources in the header).
        "Tell elevated blood pressure, stage 1 and stage 2 hypertension apart by the 2025 categories, and tell a hypertensive emergency (above 180/120 mm Hg with acute organ damage) from severe hypertension without it",
        "Lower blood pressure in a hypertensive emergency gradually with titrated IV agents under close monitoring, because an abrupt fall can injure the organs at risk",
        "Differentiate unstable angina, NSTEMI and STEMI using symptoms, the 12-lead ECG and serial troponin results",
        "Recognize ST elevation and new arrhythmias on telemetry as emergencies to escalate at once",
        PCCN_SIM_OBJECTIVES.accessBleed,
        "Assess the access site and the limb beyond it after catheterization -- hematoma, pulses, color, warmth, sensation -- and apply firm pressure above the puncture for bleeding",
        "Recognize atrial fibrillation with a rapid ventricular response, weigh rate control, rhythm control and anticoagulation, and monitor for hypotension during IV rate control",
        "Recognize a prolonging QTc and the drugs and electrolyte disturbances that cause it, and anticipate torsades de pointes",
        "Recognize pacemaker failure to capture, failure to sense and oversensing on the monitor",
        "Judge decongestion in heart failure from daily weights, intake and output, lung sounds and symptoms, and monitor potassium and creatinine during diuresis",
        "Teach the heart failure patient daily weights, sodium and fluid guidance, medication adherence and the symptoms that need a call",
        "Recognize cardiac tamponade from hypotension, muffled heart sounds, jugular venous distension and pulsus paradoxus, and escalate for drainage",
      ],
    },
    {
      title: "Respiratory",
      weight: 14,
      sources: [
        plan("2A Respiratory and its Testable Nursing Actions", [
          "Acute respiratory distress syndrome (ARDS)",
          "Asthma (severe)",
          "COPD exacerbation",
          "Minimally-invasive thoracic surgery (e.g., VATS)",
          "Sleep apnea (obstructive, central)",
          "Pleural space complications (e.g., pneumothorax, hemothorax, pleural effusion, empyema, chylothorax)",
          "Pulmonary embolism",
          "Pulmonary fibrosis",
          "Pulmonary hypertension",
          "Connective tissue disorders (e.g., sarcoidosis)",
          "Respiratory depression (e.g., medication-induced, decreased-LOC induced)",
          "Respiratory failure (acute, chronic, failure to wean)",
          "Respiratory infections (e.g., pneumonia)",
          "Thoracic surgery (e.g., pneumonectomy, lobectomy)",
          "Testable actions: interpret blood gases (ABG, VBG); maintain airway; manage patients in the prone position; manage mechanical ventilation (stable, home, chronic vents); manage non-invasive O2 or ventilation (BiPAP, CPAP, face masks, high-flow, nasal cannula, non-rebreather, venti-masks); manage respiratory monitoring (continuous SpO2, end-tidal CO2); tracheostomy tubes; chest tubes; pulmonary artery hypertension; monitor pre- and post-bronchoscopy, chest tube insertion, thoracentesis; recognize respiratory complications",
        ]),
        BTS_OXYGEN,
      ],
      gate: "Given an adult whose breathing, gases or oxygen needs are changing, identify the respiratory problem, choose and adjust the support, and catch the complication before it becomes a rapid response.",
      objectives: [
        "ARDS in the patient who leaves or avoids the intensive care unit",
        "Severe asthma and COPD exacerbations",
        "Care after minimally invasive and open thoracic surgery",
        "Obstructive and central sleep apnea in the hospitalized adult",
        "Pneumothorax, hemothorax, pleural effusion, empyema and chylothorax",
        "Pulmonary embolism: recognition and anticoagulation care",
        "Pulmonary fibrosis, pulmonary hypertension and sarcoidosis",
        "Respiratory depression from medication or a falling level of consciousness",
        "Acute and chronic respiratory failure, and failure to wean",
        "Pneumonia and other respiratory infections",
        "Interpret arterial and venous blood gases",
        "Choose between nasal cannula, Venturi mask, non-rebreather, high-flow nasal oxygen, CPAP and BiPAP",
        "Manage stable, home and chronic mechanical ventilation and tracheostomy tubes",
        "Manage chest tubes and care for patients before and after chest tube insertion, thoracentesis and bronchoscopy",
        "Use continuous pulse oximetry and capnography to monitor ventilation",
        // Depth.
        "Interpret a blood gas step by step -- pH, PaCO2, bicarbonate -- and say whether compensation is present",
        "Target SpO2 88-92% when a patient is at risk of hypercapnic respiratory failure and 94-98% for most others",
        PCCN_SIM_OBJECTIVES.copdNiv,
        "Recognize opioid-induced respiratory depression with sedation scales and capnography before the oxygen saturation falls",
        "Recognize tension pneumothorax and a dislodged or disconnected chest tube as emergencies, and know the immediate response",
        "Recognize pulmonary embolism from sudden dyspnea, pleuritic pain and tachycardia, and monitor anticoagulation for bleeding",
        "Clear a blocked or dislodged tracheostomy following the emergency steps, and keep the right equipment at the bedside",
      ],
    },
    {
      title: "Endocrine",
      weight: 6,
      sources: [
        plan("3A Endocrine and its Testable Nursing Actions", [
          "Diabetes mellitus",
          "Diabetic ketoacidosis",
          "Hyperosmolar hyperglycemic state (HHS)",
          "Syndrome of inappropriate antidiuretic hormone secretion (SIADH)",
          "Diabetes insipidus",
          "Hyperglycemia",
          "Hypoglycemia",
          "Thyroid disorders",
          "Testable action: manage and titrate insulin infusions",
        ]),
        HYPERGLYCEMIC_CRISES,
      ],
      gate: "Given an acutely ill adult with a glucose, sodium or thyroid problem, identify it from the labs and the bedside, and manage the insulin, fluid or monitoring it needs safely.",
      objectives: [
        "Diabetes mellitus and hyperglycemia in the acutely ill adult",
        "Diabetic ketoacidosis and hyperosmolar hyperglycemic state",
        "SIADH and diabetes insipidus",
        "Hypoglycemia: prevention, recognition and treatment",
        "Thyroid disorders in the acutely ill adult",
        "Manage and titrate insulin infusions",
        // Depth.
        "Tell DKA from HHS by glucose, ketones, pH, bicarbonate and osmolality",
        "Hold insulin until potassium is above 3.5 mmol/L, add dextrose as glucose falls, and overlap basal insulin before stopping an infusion",
        "Tell SIADH from diabetes insipidus by urine output, serum sodium and urine concentration, and anticipate fluid restriction or desmopressin",
        "Recognize thyroid storm and myxedema coma as emergencies",
      ],
    },
    {
      title: "Hematology/Immunology/Oncology",
      weight: 3,
      sources: [
        plan("3B Hematology/Immunology/Oncology and its Testable Nursing Actions", [
          "Anemia",
          "Coagulopathies: medication induced (e.g., Coumadin, platelet inhibitors, heparin [HIT])",
          "Autoimmune disorders (e.g., lupus, Guillain-Barre syndrome, ALS, multiple sclerosis)",
          "Testable actions: administer blood products and monitor response; manage patients requiring plasmapheresis; manage patients who would refuse blood products; manage patients with oncological emergencies",
        ]),
        AABB_RBC_2023,
      ],
      gate: "Given an adult with anemia, a drug-induced bleeding or clotting problem, an autoimmune crisis or an oncologic emergency, choose the safe nursing response and the monitoring it needs.",
      objectives: [
        "Anemia in the acutely ill adult",
        "Medication-induced coagulopathy from warfarin, platelet inhibitors and heparin, including HIT",
        "Lupus, Guillain-Barre syndrome, ALS and multiple sclerosis in the acutely ill adult",
        "Administer blood products and monitor the response",
        "Care for patients receiving plasmapheresis",
        "Care for a patient who declines blood products",
        "Recognize and respond to oncologic emergencies",
        // Depth.
        "Apply a restrictive transfusion threshold (hemoglobin 7 g/dL for most stable adults, 8 with preexisting cardiovascular disease) and transfuse sooner for active bleeding or symptoms",
        "Recognize heparin-induced thrombocytopenia from a falling platelet count on heparin, stop all heparin and anticipate a non-heparin anticoagulant",
        "Monitor Guillain-Barre syndrome for ascending weakness and falling breathing capacity",
      ],
    },
    {
      title: "Neurology",
      weight: 7,
      sources: [
        plan("3C Neurology and its Testable Nursing Actions", [
          "Encephalopathy (e.g., hypoxic ischemic, metabolic, infectious, hepatic)",
          "Seizure disorders",
          "Stroke",
          "Traumatic brain injury (TBI)",
          "Space-occupying lesions (e.g., brain tumors, subdural hematomas, abscesses)",
          "Altered mental status",
          "Delirium",
          "Dementia",
          "Testable actions: manage neuro tubes and drains; manage patients undergoing EEG monitoring; manage pre- and post-surgical procedures; perform bedside screening for dysphagia; use the NIH Stroke Scale (NIHSS)",
        ]),
        AIS_2026,
      ],
      gate: "Given an adult with a new change in neurological status, find the cause worth acting on now, score it with the right tool, and protect the airway, the brain and the patient.",
      objectives: [
        "Hypoxic-ischemic, metabolic, infectious and hepatic encephalopathy",
        "Seizure disorders, seizure precautions and EEG monitoring",
        "Stroke and transient deficits on a progressive care unit",
        "Traumatic brain injury and space-occupying lesions such as tumors, subdural hematomas and abscesses",
        "Altered mental status, delirium and dementia",
        "Manage neurological tubes and drains and care before and after neurosurgical procedures",
        "Perform a bedside dysphagia screen before anything by mouth",
        "Score deficits with the NIH Stroke Scale",
        // Depth.
        "Establish the last-known-well time, check glucose and activate the stroke response for a new deficit",
        "Keep blood pressure below 185/110 mm Hg before IV thrombolysis and below 180/105 mm Hg for at least 24 hours after, monitoring neurologically for bleeding",
        "Treat a seizure lasting 5 minutes or more as status epilepticus: protect the airway, check glucose, give a benzodiazepine first",
        "Recognize a falling level of consciousness as the earliest sign of rising intracranial pressure, and pupil changes and Cushing's triad as late ones",
        "Tell delirium from dementia by onset and fluctuating attention",
      ],
    },
    {
      title: "Gastrointestinal",
      weight: 7,
      sources: [
        plan("3D Gastrointestinal and its Testable Nursing Actions", [
          "GI motility disorders (e.g., obstruction, ileus, diabetic gastroparesis)",
          "GI bleed (lower, upper)",
          "GI infections (e.g., C. difficile)",
          "GI surgeries (e.g., resections, esophagogastrostomy)",
          "Bariatric surgery",
          "Hepatic disorders (e.g., cirrhosis, hepatitis, portal hypertension)",
          "Ischemic bowel",
          "Malnutrition (e.g., failure to thrive, malabsorption disorders)",
          "Pancreatitis",
          "Testable actions: manage and recognize implications of bariatric surgery; manage patients pre- and post-procedure (e.g., EGD, colonoscopy); fecal containment devices; tubes and drains; recognize indications for and complications of enteral and parenteral nutrition",
        ]),
        AABB_RBC_2023,
      ],
      gate: "Given an adult with abdominal pain, bleeding, a motility or liver problem or a nutrition need, prioritize the assessment and the intervention, and catch the complication early.",
      objectives: [
        "Bowel obstruction, ileus and diabetic gastroparesis",
        "Upper and lower GI bleeding",
        "C. difficile and other GI infections",
        "Care after GI resections, esophagogastrostomy and bariatric surgery",
        "Cirrhosis, hepatitis and portal hypertension",
        "Mesenteric ischemia and ischemic bowel in the patient with vascular disease",
        "Malnutrition, failure to thrive and malabsorption",
        "Acute pancreatitis and its complications",
        "Care before and after EGD and colonoscopy",
        "Manage GI tubes, drains and fecal containment devices",
        "Recognize the indications for and complications of enteral and parenteral nutrition",
        // Depth.
        "In acute GI bleeding, place large-bore access, restore volume, read a high BUN-to-creatinine ratio as a clue to an upper source, and watch for hemodynamic change",
        "Recognize an anastomotic leak after bariatric surgery from persistent tachycardia, fever and abdominal pain",
        "Manage hepatic encephalopathy with lactulose and rifaximin while keeping nutrition adequate",
        "Use contact precautions and soap-and-water hand hygiene for C. difficile",
      ],
    },
    {
      title: "Renal",
      weight: 4,
      sources: [
        plan("3E Renal and its Testable Nursing Actions", [
          "Acute kidney injury (AKI)",
          "Chronic kidney disease (CKD)",
          "Electrolyte imbalances",
          "End-stage renal disease (ESRD)",
          "Testable actions: identify medications that can be removed during dialysis; identify nephrotoxic medications; initiate renal protective measures for nephrotoxic procedures; manage patients pre- and post-hemodialysis; manage patients with peritoneal dialysis",
        ]),
        KDIGO_AKI,
      ],
      gate: "Given an adult with falling kidney function or a dangerous electrolyte, recognize it from the numbers and the patient, protect the kidneys, and care for the patient around dialysis.",
      objectives: [
        "Acute kidney injury, chronic kidney disease and end-stage renal disease in the acutely ill adult",
        "Electrolyte imbalances and their bedside signs",
        "Identify nephrotoxic medications and medications removed by dialysis",
        "Protect the kidneys before and after contrast and other nephrotoxic procedures",
        "Care for patients before and after hemodialysis and on peritoneal dialysis",
        // Depth.
        "Apply the KDIGO definition of acute kidney injury: creatinine up 0.3 mg/dL within 48 hours, or 1.5 times baseline within 7 days, or urine below 0.5 mL/kg/h for 6 hours",
        "Recognize hyperkalemia on the ECG and anticipate calcium, insulin with glucose and potassium removal",
        "Assess a fistula or graft for thrill and bruit and protect the access arm",
      ],
    },
    {
      title: "Musculoskeletal",
      weight: 2,
      sources: [
        plan("4A Musculoskeletal and its Testable Nursing Action", [
          "Functional issues (e.g., immobility, falls, gait disorders)",
          "Compartment syndrome",
          "Testable action: initiate and monitor early mobility measures",
        ]),
      ],
      gate: "Given an acutely ill adult at risk from immobility, a fall or a swollen limb, choose the protective action and the mobility plan that keeps the patient safe.",
      objectives: [
        "Immobility, falls and gait disorders in the acutely ill adult",
        "Acute compartment syndrome after fractures, surgery or crush injury",
        "Initiate and monitor early mobility",
        // Depth.
        "Recognize compartment syndrome from pain out of proportion and pain on passive stretch, remove constricting dressings, keep the limb at heart level and escalate at once",
        "Assess fall risk on admission and after any change, and apply the prevention plan it calls for",
      ],
    },
    {
      title: "Multisystem",
      weight: 15,
      sources: [
        plan("4B Multisystem and its Testable Nursing Actions", [
          "End-of-life",
          "Healthcare-acquired infections (CAUTI, CLABSI, SSI, hospital-acquired pneumonia)",
          "Infectious diseases (influenza; multi-drug resistant organisms, e.g., MRSA, VRE, CRE, ESBL)",
          "Pain (acute and chronic)",
          "Palliative care",
          "Pandemic management",
          "Pressure injuries",
          "Rhabdomyolysis",
          "Sepsis",
          "Shock states (anaphylactic, hypovolemic)",
          "Toxic ingestion/inhalation/drug overdose",
          "Wounds (e.g., infectious, surgical, trauma)",
          "Alcohol withdrawal syndrome",
          "Substance withdrawal",
          "Testable actions: administer medications for procedural sedation and monitor response; differentiate types of wounds, pressure injuries; manage complex wounds (fistulas, drains, vacuum-assisted closure); manage patients with hypertonic solution; manage patients with infections; screen for SIRS, sepsis, severe sepsis",
          "General testable actions: administer medications and monitor for expected and adverse response; anticipate therapeutic regimens; incorporate complementary and nonpharmacologic interventions; monitor diagnostic test results; perform a pertinent assessment; provide health promotion; provide patient and family education; recognize procedural and surgical complications; recognize urgent situations and initiate interventions",
        ]),
        SSC_2026,
      ],
      gate: "Given an adult whose problem crosses systems -- infection, shock, pain, a wound, a withdrawal or the end of life -- recognize the trajectory, act on the urgent part, and manage the cross-cutting care.",
      objectives: [
        "End-of-life and palliative care on a progressive care unit",
        "CAUTI, CLABSI, surgical site infection and hospital-acquired pneumonia: prevention and recognition",
        "Influenza, multidrug-resistant organisms and pandemic management",
        "Acute and chronic pain",
        "Pressure injuries and infectious, surgical and traumatic wounds",
        "Rhabdomyolysis after immobility, crush, exertion or drugs",
        "Screen for sepsis and recognize septic, anaphylactic and hypovolemic shock",
        "Toxic ingestion, inhalation and drug overdose",
        "Alcohol and other substance withdrawal",
        "Administer procedural sedation medications and monitor the response",
        "Manage complex wounds with fistulas, drains and vacuum-assisted closure",
        "Manage patients receiving hypertonic solutions",
        "Recognize urgent situations and procedural or surgical complications, and initiate interventions",
        "Administer medications and monitor for the expected and adverse response",
        // Depth.
        "Deliver early sepsis care: cultures as soon as possible, antimicrobials ideally within 1 hour when shock or probable sepsis is present, lactate, crystalloid and escalation for a MAP target of 65 mm Hg",
        "Treat anaphylaxis with intramuscular epinephrine first, then support airway and circulation",
        "Recognize rhabdomyolysis from muscle pain, dark urine and a high CK, and give early IV fluid while watching potassium and kidney function",
        "Stage pressure injuries, including stage 1 on darker skin, and apply prevention for immobile and device-dependent patients",
        "Link each invasive device to its infection and remove devices as soon as they are no longer needed",
        "Assess pain with a validated scale and reassess after every intervention",
      ],
    },
    {
      title: "Behavioral/Psychosocial",
      weight: 3,
      sources: [
        plan("4C Behavioral/Psychosocial and its Testable Nursing Actions", [
          "Disruptive behaviors, aggression, violence",
          "Psychological disorders (anxiety, depression)",
          "Substance use disorder",
          "Testable actions: assess and manage patients with suicidal ideation; screen patients using a delirium assessment tool (e.g., CAM); use withdrawal assessment tools (e.g., CIWA, COWS)",
        ]),
        CFR_RESTRAINT,
      ],
      gate: "Given an acutely ill adult who is agitated, withdrawing, despairing or at risk of harm, choose the screening tool and the least restrictive response that keeps everyone safe.",
      objectives: [
        "Disruptive behavior, aggression and violence",
        "Anxiety and depression in the acutely ill adult",
        "Substance use disorder in the hospitalized adult",
        "Assess and manage a patient with suicidal ideation",
        "Screen for delirium with the CAM",
        "Score withdrawal with CIWA-Ar and COWS",
        // Depth.
        "De-escalate first, use restraint only as a last resort on a time-limited order, and know the 1-hour face-to-face evaluation and 4-hour adult order limit for violent behavior",
        "Use person-first, non-stigmatizing language about substance use",
      ],
    },
    {
      title: "Advocacy, Caring Practices, Response to Diversity, Facilitation of Learning",
      weight: 11,
      sources: [
        plan("II Professional Caring and Ethical Practice: 5A-5D (11%)", [
          "5A Advocacy / Moral Agency",
          "5B Caring Practices",
          "5C Response to Diversity",
          "5D Facilitation of Learning",
        ]),
      ],
      gate: "Given a progressive care situation with an ethical, cultural or teaching dimension, choose the nursing response the Synergy Model asks for -- advocating, caring, respecting difference or teaching.",
      objectives: [
        "The AACN Synergy Model: matching the nurse's competencies to the patient's characteristics",
        "Advocate for the patient's and family's wishes and raise ethical concerns through the right channels",
        "Create a compassionate, safe environment that prevents unnecessary suffering",
        "Incorporate cultural, spiritual, language, age and lifestyle differences into the plan of care",
        "Use a qualified medical interpreter rather than family or untrained staff",
        "Teach patients and families in plain language and confirm learning with teach-back",
        "Plan discharge teaching that fits the patient's literacy, readiness and goals",
        "Support informed consent and advance directives, and recognize when a patient lacks decision-making capacity",
      ],
    },
    {
      title: "Collaboration, Systems Thinking, Clinical Inquiry",
      weight: 9,
      sources: [
        plan("II Professional Caring and Ethical Practice: 6A-6C (9%)", ["6A Collaboration", "6B Systems Thinking", "6C Clinical Inquiry"]),
      ],
      gate: "Given a team, system or evidence question on a progressive care unit, choose the collaborative, system-aware or evidence-based response that best serves the patient.",
      objectives: [
        "Collaborate with the patient, family and interprofessional team toward realistic goals",
        "Hand off and escalate concerns with a structured format such as SBAR",
        "Use the chain of command when a safety concern is not resolved",
        "Navigate transitions between intensive care, progressive care and home",
        "Manage unit and system resources for the patient and family",
        "Question current practice and apply evidence and quality-improvement data to change it",
        "Evaluate a practice change with measures that show whether it helped",
      ],
    },
  ],
};

export const PCCN_TRACKS: SeedTrack[] = [PCCN_TRACK];
