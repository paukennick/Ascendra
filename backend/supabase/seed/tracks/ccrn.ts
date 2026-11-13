// AACN CCRN (Adult) critical-care nursing specialty certification.
//
// Every category, percentage and patient-care problem below was read on
// 2026-10-31 from the AACN Certification Corporation's own "CCRN Exam
// Handbook - Direct Care" (July 2026 edition), not from a summary of it:
// the Adult CCRN Test Plan on handbook pp.10-11, its Testable Nursing
// Actions on pp.12-13, the Synergy Model competency definitions on p.9,
// exam facts on p.2 and eligibility on p.3 (printed page numbers; PDF pages
// are five higher: 15-18, 14, 7, 8). The test plan "applies to exams
// taken on and after November 12, 2025".
//
// Modeling: a real, proctored, scored examination whose body publishes no
// exam code -- the same shape as ABPTS's specialist exams (pt-abpts.ts), so
// credential_basis 'vendor_exam_unpublished_code' with examCode left unset
// rather than invented. "CCRN" is the credential name, not an exam code.
//
// Weights: exactly the six published categories, at the published
// percentages (13 / 12 / 21 / 18 / 16 / 20, summing to 100). Clinical
// Judgment is the first five (80%); Professional Caring & Ethical Practice
// is the sixth (20%). The two combined categories -- Endocrine/Heme/GI/
// Renal/Integumentary (21%) and Musculoskeletal/Neuro/Behavioral (18%) --
// are deliberately NOT split into per-system units: AACN publishes no
// sub-weights, and backend/lib/prompts.ts tells the learner each unit's
// share of the exam, so any split would put invented numbers in front of
// them. Objectives inside those units are ordered by body system instead.
// Likewise the seven Professional Caring sub-areas carry no sub-weights.
//
// Objectives are our own learner-facing wording, built from each system's
// listed patient-care problems with that system's Testable Nursing Actions
// folded in. Every example is AACN's own; where the plan names only a
// category, the objective names only the category. Placement judgment calls (ours, not AACN's):
//   - The handbook lists a "General" group of testable actions with no
//     category. They sit in the Multisystem unit, as the cross-cutting unit.
//   - The intra-abdominal pressure monitoring action is listed under
//     Multisystem by AACN and is kept there, although abdominal compartment
//     syndrome itself sits in the GI section.
//   - Endocrine has no testable nursing actions in the handbook; its
//     objectives come from the problem list alone.
//   - "Biliary atresia" appears among the adult plan's hepatic examples,
//     although it is a paediatric condition. It is kept, as published.
//
// Medication names: AACN is moving its exams to generic names only, so any
// generated lesson should prefer generic names.
//
// requiresAcknowledgement is set for the same reason as every nursing
// track: acting on wrong critical-care content has patient-safety
// consequences, so migration 012's disclaimer gate applies.

//
// Depth added 2026-10-31 from open textbooks (all accessed 2026-10-31).
// The AACN handbook remains the only source of scope: every objective
// added after the "Added 2026-10-31" marker in a unit sits under a problem
// or testable nursing action AACN lists for that population and unit. The
// textbooks supply depth only (pathophysiology, assessment, priorities,
// drugs, complications). Every added objective is our own wording; we took
// topic structure and facts from these books, never their text. Doses and
// numeric thresholds are left out of objective text unless the sources
// agreed.
//   - OpenStax, "Medical-Surgical Nursing", Rice University, 1st ed.
//     (first published 2024; PDF (c)2026), CC BY-NC-SA 4.0 -- NC/SA:
//     topic structure only, no text. LibreTexts' mirror labels it CC BY
//     4.0; the publisher's own copyright page says CC BY-NC-SA 4.0 and
//     that is the licence recorded here.
//     https://openstax.org/details/books/medical-surgical-nursing
//   - OpenStax, "Pharmacology for Nurses", Rice University, 1st ed.
//     (2024), CC BY-NC-SA 4.0 -- NC/SA: topic structure only, no text.
//     https://openstax.org/details/books/pharmacology
//   - OpenStax, "Maternal-Newborn Nursing", Rice University, 1st ed.
//     (2024), CC BY-NC-SA 4.0 -- NC/SA: topic structure only, no text.
//     https://openstax.org/details/books/maternal-newborn-nursing
//   - Open RN / WisTech Open (Chippewa Valley Technical College),
//     "Nursing Health Promotion", Ernstmeyer & Christman (eds.), 2025,
//     CC BY 4.0. https://wtcs.pressbooks.pub/healthpromo/
//   - StatPearls (StatPearls Publishing, NCBI Bookshelf, 2025-2026
//     editions), CC BY-NC-ND 4.0 -- NC/ND: topic structure and facts
//     only, never text; some objectives rest on StatPearls alone.
//     Chapters (NBK id):
//     Cardiac Tamponade 431090; Aortic Dissection 441963; Hypertensive
//     Crisis 507701; Infective Endocarditis 557641; Cardiogenic Shock 482255;
//     Intra-Aortic Balloon Pump 542233; Status Asthmaticus 526070;
//     Ventilator-Associated Pneumonia 507711; Ventilator Complications
//     560535; Hyperosmolar Hyperglycemic Syndrome 482142; Pediatric DKA
//     470282 (insulin/potassium principles); Diabetes Insipidus 470458;
//     SIADH 507777; Cerebral Salt Wasting 534855; Adrenal Crisis 499968;
//     Thyroid Storm 448095; Myxedema Coma 545193; DIC 441834; Immune
//     Thrombocytopenia 562282; Tumor Lysis Syndrome 518985; Noninfectious
//     Transfusion Complications 574536; Exchange Transfusion 563179; Upper
//     GI Bleeding 470300; Hepatic Encephalopathy 430869; Acute Pancreatitis
//     482468; Bowel Ischemia 554527; Abdominal Compartment Syndrome 430932;
//     CRRT 556028; Acute Compartment Syndrome 448124; Subarachnoid
//     Hemorrhage 441958; Autonomic Dysreflexia 482434; Status Epilepticus
//     430686; Brain Death 538159; ICU Delirium 559280; Alcohol Withdrawal
//     441882; Postintensive Care Syndrome 558964; Septic Shock 430939; ECMO
//     in Adults 576426; Hypoxic-Ischemic Encephalopathy 539833; Targeted
//     Temperature Management 556124; Malignant Hyperthermia 430828;
//     Rhabdomyolysis 448168; Parkland Formula 537190; Drowning 430833;
//     Acetaminophen Toxicity 441917; Opioid Toxicity 470415.
//
// Source tiers (docs/source-reliability-standard.md; audit 2026-10-31).
// Tier 2 criteria: 1 credentialed authors, 2 stated review, 3 publisher,
// 4 date (clinical: within 5 years), 5 no commercial interest.
//   - AACN CCRN Exam Handbook (July 2026): Tier 1 (credentialing body).
//   - OpenStax Medical-Surgical Nursing, Pharmacology for Nurses,
//     Maternal-Newborn Nursing: Tier 2, all five met (named senior
//     authors with nursing/pharmacy doctorates, named reviewers in front
//     matter, Rice University, 2024, non-profit).
//   - Open RN Nursing Health Promotion: Tier 2, all five met (editors
//     Ernstmeyer MSN RN and Christman DNP RN, named peer reviewers,
//     Chippewa Valley Technical College / WTCS, 2025, non-profit).
//   - StatPearls: Tier 2, all five met. Every cited chapter's last update
//     was read from PubMed (all 81 across both CCRN files) and is within
//     5 years; the oldest is Thyroid Storm 448095, updated 2022-10-06, so it
//     fails criterion 4 after 2027-10-06 -- before REVIEW_DUE_AT. 12
//     chapters were sampled on statpearls.com: authors are physicians (MD,
//     DO, MBBS) plus one certified physician assistant (Acute Compartment
//     Syndrome), each with a no-relevant-financial-relationship disclosure;
//     the
//     publisher's editorial policy states internal, external and anonymous
//     peer review and a 3-year minimum review cycle. Note: StatPearls
//     Publishing also sells exam prep; the chapters themselves are not
//     marketing, and the standard names StatPearls as qualifying.
//     Thyroid Storm's chapter supports one objective with MS 21.3, so that
//     objective keeps a Tier 2 source when the chapter ages out.
//   - Tier 1 guidelines added by the audit (accessed 2026-10-31 and
//     2026-11-02; copyright, used for facts only, no text reproduced):
//     AHA/ACC et al.
//     2025 high blood pressure guideline (Circulation,
//     doi:10.1161/CIR.0000000000001356); Surviving Sepsis Campaign adult
//     guidelines 2026 (ESICM/SCCM, doi:10.1007/s00134-026-08361-1); and
//     2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic
//     Disease (Circulation, doi:10.1161/CIR.0000000000001106).
//
// Where the sources disagreed, and what we did (checked against Tier 1,
// 2026-10-31):
//   - CVP normal range: Medical-Surgical Nursing gives two (2-6 mm Hg in
//     Table 35.2, 8-12 mm Hg in 23.1). Unresolved: one search found no
//     Tier 1 normal range; the SSC adult 2026 guideline (rec. 49) suggests
//     dynamic measures over static ones such as CVP to guide fluids, and
//     8-12 mm Hg was the retired SSC 2012 resuscitation target, not a
//     normal range. No number is written into any objective; the
//     objectives teach the reasoning instead.
//   - Hypertensive urgency cut-off: Medical-Surgical Nursing 160/90 versus
//     StatPearls 180/120. Resolved by AHA/ACC et al., "2025 Guideline for
//     the Prevention, Detection, Evaluation and Management of High Blood
//     Pressure in Adults" (Circulation, 2025-08-14,
//     doi:10.1161/CIR.0000000000001356; read via the AHA's own "Top things
//     to know" page, https://professional.heart.org/en/science-news/
//     2025-high-blood-pressure-guideline/top-things-to-know, and Updates in
//     the 2025 AHA/ACC Hypertension Guideline, PMC12995957; the full text
//     refused automated access). Above 180/120 mm Hg is the line; with
//     acute organ damage it is an emergency treated in hospital with IV
//     agents, without it the guideline drops "urgency" for "severe
//     hypertension" managed with oral drugs. Objective 0/36 now names the
//     180/120 line and the distinction. Lowering-rate targets were not
//     read in the primary text and stay out.
//   - Aortic dissection is the exception to generic gradual reduction in
//     hypertensive emergency. AACN's Adult CCRN plan explicitly tests
//     aortic aneurysm, dissection and rupture. The 2022 ACC/AHA aortic
//     disease guideline calls for immediate anti-impulse therapy in an ICU
//     with an arterial line, IV beta blockade first, SBP below 120 mm Hg or
//     the lowest pressure that preserves end-organ perfusion, and heart
//     rate 60-80 bpm. It also distinguishes emergency surgical management
//     for type A from initial medical therapy for uncomplicated type B.
//     These are new append-only objectives at the end of unit 0; objective
//     0/36 remains the general rule and no live objective was reworded or
//     moved.
//   - MAP for cerebral perfusion: not a disagreement -- a figure from one
//     source (Medical-Surgical Nursing 35.4, 70-90 mm Hg). Not checked
//     against a Tier 1 guideline. The number stays out; the objective
//     stays at "high enough to protect the brain".
//   - Not a source disagreement, but checked: objective 4/39's "antibiotics
//     within the first hour". Surviving Sepsis Campaign, "International
//     Guidelines for Management of Sepsis and Septic Shock 2026" (Intensive
//     Care Med / Crit Care Med, 2026, doi:10.1007/s00134-026-08361-1) keeps
//     the 1-hour target for possible, probable or definite septic shock and
//     probable or definite sepsis, but suggests rapid assessment and
//     antibiotics within 3 hours when sepsis without shock is only
//     possible. Objective 4/39 now says so; MAP target 65 mm Hg is that
//     guideline's initial target but was left out as before.

import type { SeedTrack, UnitSource } from "../data";

// REQ-235 (batch H wave 1): dated key values for the units that had none.
// Respiratory and endocrine values were read on 2026-11-11 (the ARDS
// guideline in ATS's own PDF; the hyperglycemic-crises consensus through the
// Cleveland Clinic Journal of Medicine's 2025 summary of it, since the
// Diabetes Care full text refused automated access). The cardiovascular
// values are carried from the audit recorded in this file's header (read
// 2026-10-31, not re-read in this batch), dated as read.
export const CCRN_ADULT_UNIT_SOURCES: Record<string, UnitSource[]> = {
  // The test plan itself (handbook pp.10-13), read 2026-10-31 per the header.
  "Professional Caring & Ethical Practice": [
    {
      title: "AACN CCRN Exam Handbook - Direct Care (July 2026), Adult CCRN Test Plan (exams on and after 2025-11-12) and Synergy Model competencies",
      url: "https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en",
      kind: "exam_outline",
      checkedAt: "2026-10-31",
    },
  ],
  Cardiovascular: [
    {
      title: "2022 ACC/AHA Guideline for the Diagnosis and Management of Aortic Disease (Circulation, doi:10.1161/CIR.0000000000001106)",
      url: "https://doi.org/10.1161/CIR.0000000000001106",
      kind: "clinical_guideline",
      checkedAt: "2026-10-31",
      keyValues: [
        "acute aortic dissection: immediate IV beta blockade first; systolic BP below 120 mm Hg (or the lowest that preserves end-organ perfusion) and heart rate 60-80 bpm; type A goes to emergency surgery, uncomplicated type B starts with medical therapy",
      ],
    },
    {
      title: "2025 AHA/ACC et al. Guideline for the Prevention, Detection, Evaluation and Management of High Blood Pressure in Adults (Circulation, doi:10.1161/CIR.0000000000001356)",
      url: "https://doi.org/10.1161/CIR.0000000000001356",
      kind: "clinical_guideline",
      checkedAt: "2026-10-31",
      keyValues: [
        "above 180/120 mm Hg with acute target-organ damage is a hypertensive emergency (hospital, IV agents); without it the guideline says severe hypertension, managed with oral drugs, not 'urgency'",
      ],
    },
  ],
  Respiratory: [
    {
      title: "ATS/ESICM/SCCM Clinical Practice Guideline: Mechanical Ventilation in Adult Patients with ARDS (Am J Respir Crit Care Med 2017)",
      url: "https://www.thoracic.org/statements/resources/cc/ards-guidelines.pdf",
      kind: "clinical_guideline",
      checkedAt: "2026-11-11",
      keyValues: [
        "all ARDS: lower tidal volumes, 4-8 mL/kg predicted body weight, and plateau pressure below 30 cm H2O (strong recommendation)",
        "severe ARDS: prone positioning for more than 12 hours a day (strong recommendation)",
      ],
    },
  ],
  "Endocrine, Hematology/Immunology, GI, Renal/GU, Integumentary": [
    {
      title: "Hyperglycemic Crises in Adults With Diabetes: A Consensus Report (Diabetes Care 2024;47(8):1257-1275, doi:10.2337/dci24-0032)",
      url: "https://doi.org/10.2337/dci24-0032",
      kind: "clinical_guideline",
      checkedAt: "2026-11-11",
      keyValues: [
        "DKA: glucose 200 mg/dL or more or known diabetes; beta-hydroxybutyrate 3.0 mmol/L or more (or urine ketones 2+ or more); pH below 7.3 and/or bicarbonate below 18 mmol/L",
        "HHS: glucose 600 mg/dL or more; calculated effective serum osmolality above 300 mOsm/kg (or total above 320); beta-hydroxybutyrate below 3.0 mmol/L; pH 7.3 or more and bicarbonate 15 mmol/L or more",
      ],
    },
  ],
};

const VERIFIED_AT = "2026-10-31T00:00:00Z";
const REVIEW_DUE_AT = "2027-10-31T00:00:00Z";

const HANDBOOK_URL =
  "https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en";

// Shared with every nursing track. REQ-165: the key only marks the course
// as gated (it needs the study notice, mobile/src/lib/studyNotice.ts); no
// per-course text is shown any more.
const NURSING_DISCLAIMER_KEY = "nursing-clinical-content";

// ---------------------------------------------------------------------------
// CCRN (Adult) -- Adult CCRN Test Plan, exams on and after 2025-11-12.
// 3 hours, 150 multiple-choice items (125 scored, 25 unscored pretest).
// Category weights: 13 / 12 / 21 / 18 / 16 / 20.
// ---------------------------------------------------------------------------
// REQ-220: a line using a retired term is retired in place (id and history
// kept) and its replacement appended to the same unit.
const CCRN_REQ220_RETIRED_AT = "2026-11-10T00:00:00Z";

export const CCRN_ADULT_TRACK: SeedTrack = {
  code: "CCRNADULT",
  // REQ-257 (Nick, 2026-11-12): level-aware lessons switched on once its Key terms were written.
  levelFlow: true,
  title: "Prep for the CCRN (Adult) Exam",
  description:
    "AACN's adult critical-care nursing specialty certification, built on the Adult CCRN Test Plan in force since November 12 2025: five body-system clinical judgment categories (80%) and Professional Caring & Ethical Practice through the Synergy Model's nurse competencies (20%), weighted as the exam weights them.",
  trackType: "certification",
  subcategorySlug: "nursing-specialty-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: HANDBOOK_URL,
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
    credentialSlug: "ccrn-adult",
    credentialName: "CCRN (Adult)",
    credentialUrl: "https://www.aacn.org/certification/get-certified/ccrn-adult",
    basis: "vendor_exam_unpublished_code",
    examRevision: "Adult CCRN Test Plan, effective 2025-11-12",
    objectivesRevision: "Adult CCRN Test Plan 2025-11-12 (Handbook July 2026)",
    status: "active",
    effectiveDate: "2025-11-12",
    officialObjectivesUrl: HANDBOOK_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Current, unencumbered US RN or APRN license, plus either 1,750 hours of direct care of acutely/critically ill patients in the previous 2 years (875 of them in the most recent year) or at least 2,000 such hours over the previous 5 years (144 of them in the most recent year). Hours must be with the adult population, and most must focus on critically ill patients.",
    durationMinutes: 180,
    questionFormat:
      "150 multiple-choice items in 3 hours: 125 scored and 25 unscored pretest items. 80% Clinical Judgment, 20% Professional Caring & Ethical Practice, organized by the AACN Synergy Model for Patient Care.",
    passingScorePolicy:
      "Criterion-referenced: the cut score is set by the modified Angoff method, with a Score Evaluation Committee of subject matter experts rating each item under a psychometrician's guidance, approved by AACN Certification Corporation. Each candidate is measured against that standard, not against other candidates.",
  },
  units: [
    {
      title: "Cardiovascular",
      sources: CCRN_ADULT_UNIT_SOURCES["Cardiovascular"],
      weight: 13,
      gate: "Given a critically ill adult's rhythm strip, hemodynamic numbers and bedside findings, name the cardiovascular problem, spot falling cardiac output early, and choose the nursing priority and the device or procedure care it calls for.",
      objectives: [
        "Recognizing early signs of decreased cardiac output before frank shock",
        "Monitoring hemodynamic status, non-invasive and invasive, and recognizing instability from the numbers and the patient",
        "Identifying, interpreting and responding to cardiac rhythms and dysrhythmias",
        "Conduction system defects such as prolonged QT and Wolff-Parkinson-White, and caring for a patient on temporary pacing",
        "Acute coronary syndrome: recognition, priorities and post-event care",
        "Heart failure: acute decompensation, fluid overload and the medications that treat it",
        "Cardiomyopathy and its critical-care complications",
        "Cardiogenic shock and caring for patients on mechanical circulatory support devices",
        "Cardiac tamponade: recognizing it and caring for the patient through pericardiocentesis",
        "Cardiac infection and inflammatory diseases",
        "Structural heart defects, acquired and congenital, including valvular disease",
        "Hypertensive crisis: recognizing end-organ risk and controlled blood-pressure lowering",
        "Aortic aneurysm, dissection and rupture, thoracic and abdominal",
        "Cardiac trauma",
        "Care of the patient after cardiac surgery",
        "Cardiac and vascular catheterization and endovascular procedures: before, during and after",
        "Vascular disorders such as arterial and venous stenosis",
        "Vascular interventions such as stents, fem-pop bypass and carotid endarterectomy, and their complications",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Explain how heart rate, preload, afterload and contractility set cardiac output, and predict which of them a given drug or device changes",
        "Interpret pulmonary artery catheter readings -- right atrial/central venous pressure, wedge pressure, cardiac output and index, systemic vascular resistance -- to tell a volume problem from a pump or vascular-tone problem",
        "Maintain an arterial line safely and check the insertion site and the limb beyond it for bleeding and loss of perfusion",
        "Titrate vasopressor and inotrope infusions to the ordered hemodynamic targets, preferring central access and watching for extravasation, tachycardia and ventricular ectopy",
        "Compare beta-blockers, calcium channel blockers and nitrates by their hemodynamic effect, and name the heart-rate and blood-pressure findings that should prompt holding or reducing a dose",
        "Measure PR, QRS and QT intervals and calculate heart rate from a rhythm strip",
        "Tell first-degree, Mobitz I, Mobitz II and third-degree AV block apart, and anticipate atropine, transcutaneous pacing or a permanent pacemaker for the unstable patient",
        "Recognize atrial fibrillation and flutter, weigh rate control, rhythm control and anticoagulation, and prepare a patient safely for synchronized cardioversion",
        "Distinguish ventricular tachycardia with and without a pulse, ventricular fibrillation and asystole, and the immediate response each requires",
        "Differentiate unstable angina, NSTEMI and STEMI using symptoms, 12-lead ECG changes and serial troponin results",
        "Prioritize early acute coronary syndrome care: aspirin, nitroglycerin with blood-pressure precautions, oxygen to target, telemetry, and rapid reperfusion for STEMI",
        "Care for a patient after coronary angiography or PCI: watch the access site for bleeding, check distal pulses and keep activity restrictions",
        "Distinguish left- from right-sided heart failure, and systolic from diastolic dysfunction, by their assessment findings",
        "Judge decongestion in heart failure from daily weights, intake and output, lung sounds and BNP trends, and monitor potassium and creatinine during diuresis",
        "Recognize cardiogenic shock -- hypotension, pulmonary congestion and poor perfusion despite tachycardia -- and anticipate inotropes, vasopressors and treatment of the cause such as revascularization",
        "Explain intra-aortic balloon pump counterpulsation and monitor for bleeding, limb ischemia and device complications",
        "Recognize cardiac tamponade from hypotension, pulsus paradoxus and signs of obstructive shock, support the patient with fluids and vasoactive drugs as temporizing measures, and avoid positive-pressure ventilation where possible until drainage",
        "Recognize acute aortic dissection from sudden severe pain and blood-pressure or pulse differences, and prioritize analgesia, arterial-line monitoring and controlled heart-rate and blood-pressure lowering before surgery",
        "Tell a hypertensive emergency (blood pressure above 180/120 mm Hg with acute organ damage) from severe hypertension without organ damage, and in an emergency lower blood pressure gradually with titrated IV agents under continuous monitoring, because an abrupt fall can injure the organs it is meant to protect",
        "Recognize infective endocarditis and its complications, including acute valve failure and embolic stroke",
        "Assess carotid and abdominal aortic disease without causing harm -- no occluding a diseased carotid, no firm palpation of a pulsatile mass -- and recognize the signs of aneurysm rupture",
        "Treat acute aortic dissection as the exception to generic gradual blood-pressure lowering: begin urgent anti-impulse therapy with analgesia, arterial-line monitoring and IV beta blockade first, targeting systolic pressure below 120 mm Hg or the lowest pressure that preserves end-organ perfusion and a heart rate of 60-80 bpm while urgent imaging and specialist evaluation determine definitive management",
        "Distinguish definitive management of acute aortic dissection: type A needs emergency surgical consultation and immediate repair, while uncomplicated type B begins with medical therapy and needs intervention when rupture, malperfusion, extension, enlargement, intractable pain or uncontrolled hypertension makes it complicated",
      ],
    },
    {
      title: "Respiratory",
      sources: CCRN_ADULT_UNIT_SOURCES["Respiratory"],
      weight: 12,
      gate: "Given a deteriorating adult's breathing, gases and ventilator or oxygen settings, identify the respiratory problem, choose the right level of support, and prevent or catch the complications that support brings.",
      objectives: [
        "Acute respiratory failure: recognizing it and escalating support in time",
        "Oxygen therapy delivery devices and choosing between them",
        "Noninvasive positive pressure ventilation (BiPAP, CPAP, high-flow nasal cannula) and its limits",
        "Airway management and rapid sequence intubation",
        "Mechanical ventilation: settings, the patient's response, and what to change when it is not working",
        "Preventing and recognizing complications of mechanical ventilation and NIPPV",
        "Tracheostomy care and tracheostomy emergencies",
        "Respiratory monitoring devices: SpO2, SvO2 and ETCO2",
        "Acute respiratory distress syndrome (ARDS), including prone positioning",
        "Acute pulmonary edema",
        "Acute pulmonary embolus",
        "Acute respiratory infection such as pneumonia",
        "Acute exacerbations of chronic conditions: COPD, asthma, bronchitis, emphysema",
        "Status asthmaticus",
        "Pulmonary hypertension",
        "Therapeutic gases: oxygen, nitric oxide, heliox and CO2",
        "Pulmonary hemorrhage",
        "Pleural space abnormalities (pneumothorax, hemothorax, empyema, pleural effusion), chest tubes and thoracentesis",
        "Thoracic and airway trauma such as fractured ribs, lung contusion and tracheal perforation",
        "Care of the patient after thoracic surgery",
        "Caring for a patient undergoing bronchoscopy",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Distinguish hypoxemic from hypercapnic respiratory failure by blood gas and by cause",
        "Interpret arterial blood gases step by step -- pH, PaCO2, bicarbonate, base excess -- and identify whether compensation is present",
        "Apply the diagnostic criteria for ARDS (acute onset, bilateral noncardiac infiltrates, low PaO2/FiO2 ratio) and name its direct and indirect causes",
        "Explain why prone positioning improves oxygenation in ARDS and keep the patient safe while prone",
        "Confirm and maintain endotracheal tube position using breath sounds, end-tidal CO2, chest x-ray and the depth marking, and act at once on suspected displacement",
        "Apply each element of a ventilator-associated pneumonia prevention bundle and explain why it works",
        "Recognize ventilator-associated pneumonia from new infiltrates, fever, purulent secretions and worsening gas exchange, and obtain lower-airway cultures before empiric antibiotics",
        "Pair daily sedation interruption with spontaneous breathing trials, and recognize when a patient is ready for, or failing, liberation from the ventilator",
        "Recognize complications of intubation and positive-pressure ventilation, including airway trauma, tube obstruction, barotrauma, auto-PEEP and hemodynamic compromise",
        "Manage status asthmaticus: repeated or continuous inhaled short-acting beta-agonist, early systemic corticosteroid, inhaled anticholinergic and IV magnesium, and treat fatigue, a normalizing or rising PaCO2 and altered mentation as signs of impending respiratory failure",
        "When a patient with severe asthma is ventilated, allow a long expiratory time to limit air trapping and watch for auto-PEEP, hypotension and pneumothorax",
        "In a COPD exacerbation, titrate oxygen and follow blood gases for CO2 retention, recognizing pursed-lip breathing and tripod positioning as cues of distress",
        "Recognize acute pulmonary embolism -- sudden dyspnea, pleuritic chest pain, tachycardia, hemoptysis -- and anticipate D-dimer, imaging, anticoagulation and, when massive, thrombolysis",
        "Recognize tension pneumothorax (hypotension, tracheal deviation, cyanosis) as an emergency that is treated before imaging",
        "Respond to chest-drain emergencies, including a dislodged tube or an open chest wound, with a three-sided occlusive dressing while help arrives",
        "Classify pneumonia as community-acquired, healthcare-associated, ventilator-associated or aspiration, and reduce aspiration risk in the critically ill",
        "Support a patient with pulmonary hemorrhage through bronchoscopic control of bleeding (vasoconstrictors, tamponade, iced-saline lavage)",
        "Give ventilated patients stress-ulcer and venous-thromboembolism prophylaxis, and monitor corticosteroid-treated patients for hyperglycemia and infection",
        "Assess and treat pain in intubated patients alongside sedation, using behavioral pain tools when the patient cannot self-report",
        // REQ-220 (FAIL-1139): replaces the retired HCAP category (Kalil et al., IDSA/ATS HAP/VAP guideline, Clin Infect Dis 2016;63(5):e61-e111).
        "Classify pneumonia as community-acquired, hospital-acquired (HAP), ventilator-associated (VAP) or aspiration -- the 2016 IDSA/ATS guideline retired the 'healthcare-associated pneumonia' category -- and reduce aspiration risk in the critically ill",
      ],
      objectiveRetiredAt: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, CCRN_REQ220_RETIRED_AT, null, null, null, null],
    },
    {
      title: "Endocrine, Hematology/Immunology, GI, Renal/GU, Integumentary",
      sources: CCRN_ADULT_UNIT_SOURCES["Endocrine, Hematology/Immunology, GI, Renal/GU, Integumentary"],
      weight: 21,
      gate: "Given a critically ill adult with a metabolic, blood, abdominal, kidney or skin problem, identify it from labs and findings, pick the priority intervention, and manage the therapy it needs -- insulin, blood products, nutrition, dialysis or wound devices.",
      objectives: [
        // Endocrine
        "Diabetes mellitus types 1 and 2, and hyperglycemia in the critically ill",
        "Diabetic ketoacidosis (DKA)",
        "Hyperosmolar hyperglycemic state (HHS), and telling it apart from DKA",
        "Diabetes insipidus (DI)",
        "Syndrome of inappropriate antidiuretic hormone secretion (SIADH), and telling it apart from DI",
        "Adrenal insufficiency",
        "Thyroid disorders",
        // Hematology and immunology
        "Anemia and other blood dyscrasias",
        "Coagulopathies such as ITP, DIC and HIT, and managing bleeding and clotting disorders",
        "Myelosuppression: thrombocytopenia and neutropenia",
        "Oncologic complications such as tumor lysis syndrome",
        "Autoimmune disorders such as lupus, myasthenia gravis and Guillain-Barre syndrome",
        "Transfusion of blood products, exchange transfusion and massive transfusion",
        "Transfusion reactions such as TRALI and TACO",
        // Gastrointestinal
        "Acute GI hemorrhage, and caring for the patient through EGD",
        "Hepatic failure and coma: portal hypertension, cirrhosis, esophageal varices, fulminant hepatitis, biliary atresia",
        "Liver disease in the critically ill",
        "Pancreatitis",
        "Bowel infarction, obstruction and perforation, including mesenteric ischemia and adhesions",
        "Peritonitis",
        "Abdominal compartment syndrome",
        "Acute abdominal trauma",
        "Care after GI surgery such as Whipple, esophagectomy and bowel resection",
        "Malnutrition and malabsorption, and the barriers to adequate nutrition and fluid (chewing or swallowing difficulty, altered hunger and thirst, inability to self-feed)",
        "Enteral and parenteral nutrition, enteral tubes, feeding and supplementation",
        "Gastrointestinal drains",
        // Renal and genitourinary
        "Acute kidney injury (AKI) and acute tubular necrosis (ATN), including identifying nephrotoxic agents",
        "Chronic kidney disease (CKD) in the critically ill",
        "Kidney infections and urosepsis",
        "Renal replacement therapy: hemodialysis, CRRT and peritoneal dialysis -- when it is indicated and how to manage it",
        // Integumentary
        "Pressure injury: prevention, recognition and pressure-reduction surfaces",
        "Skin failure, including perfusion injuries",
        "Wounds and wound therapy devices: wound VACs, ostomy and fecal management devices",
        "IV infiltration: recognition and treatment",
        "Cellulitis",
        "Necrotizing fasciitis",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Compare DKA and HHS by speed of onset, glucose level, ketones, osmolality and degree of dehydration",
        "Manage a hyperglycemic crisis in order: isotonic fluid resuscitation first, then a continuous IV regular insulin infusion, dextrose added as glucose falls, and overlapping subcutaneous insulin before the infusion stops",
        "Monitor potassium closely during insulin therapy, because insulin and correction of acidosis shift potassium into cells and can cause dangerous hypokalemia",
        "Prevent and treat hypoglycemia in critically ill patients receiving insulin",
        "Recognize diabetes insipidus from large volumes of dilute urine and rising sodium, give desmopressin, and watch for hyponatremia once treatment starts",
        "Recognize SIADH from hyponatremia with water retention, restrict fluids, reserve hypertonic saline for severe symptoms, and keep seizure precautions",
        "Tell SIADH apart from cerebral salt wasting after brain injury by volume status, because one needs fluid restriction and the other needs fluid and sodium replacement",
        "Recognize adrenal crisis -- hypotension, hyponatremia, hyperkalemia, hypoglycemia -- including after abrupt steroid withdrawal, and give IV fluids and hydrocortisone without delay",
        "Recognize thyroid storm (high fever, tachycardia, agitation or delirium) and anticipate beta-blockade, drugs that block thyroid hormone synthesis and release, cooling and ICU monitoring",
        "Recognize myxedema coma (hypothermia, altered mental status, hypoventilation) and prepare for airway support and ICU care",
        "Recognize DIC from its laboratory pattern -- prolonged clotting times, low fibrinogen, falling platelets -- treat the trigger, and give blood components for bleeding",
        "Recognize heparin-induced thrombocytopenia from a falling platelet count on heparin, stop all heparin, anticipate a non-heparin anticoagulant, and flag the patient against future heparin",
        "Apply bleeding precautions for severe thrombocytopenia such as ITP, recognizing that serious bleeding risk rises sharply at very low platelet counts",
        "Grade neutropenia by count, protect the patient from infection, and treat fever in neutropenia as an emergency",
        "Anticipate tumor lysis syndrome (hyperkalemia, hyperphosphatemia, hypocalcemia, hyperuricemia, kidney injury) and prevent it with IV hydration, uric-acid-lowering drugs and frequent laboratory checks",
        "Monitor GBS and myasthenia gravis for respiratory muscle weakness, recognizing that ascending or bulbar weakness can lead to ventilatory failure",
        "Verify blood products before transfusion, monitor most closely in the first 15 minutes, and stop the transfusion at once if a reaction is suspected",
        "Differentiate acute hemolytic, febrile non-hemolytic, allergic and anaphylactic reactions, TRALI and TACO by their signs and timing",
        "Watch for complications of large-volume or exchange transfusion, including citrate-related hypocalcemia and circulatory overload",
        "In acute upper GI bleeding, place two large-bore IVs, restore volume and blood pressure, protect the airway in massive hematemesis, and read a high BUN-to-creatinine ratio as a clue to an upper source",
        "Explain how portal hypertension causes varices, ascites and hepatorenal syndrome, and support the patient through variceal bleeding treatment including TIPS",
        "Manage hepatic encephalopathy with lactulose and rifaximin, maintain nutrition without protein restriction, and recognize cerebral edema risk in severe encephalopathy from acute liver failure",
        "Diagnose acute pancreatitis from characteristic pain, a marked rise in amylase or lipase, and imaging, and monitor for its local and systemic complications",
        "Recognize acute mesenteric ischemia in a patient with vascular risk factors and severe abdominal pain, and prepare for bowel rest, decompression, fluids, antibiotics and urgent intervention",
        "Measure intra-abdominal pressure in at-risk patients because examination cannot detect abdominal compartment syndrome, and recognize its effects on kidneys, lungs and heart",
        "Recognize bowel obstruction and paralytic ileus, and the signs that obstruction has compromised blood supply to the bowel",
        "Give parenteral nutrition safely: central access, strict rate control, glucose monitoring, and line infection prevention",
        "Classify acute kidney injury as prerenal, intrarenal or postrenal from its cause, and read creatinine and GFR trends as markers of falling kidney function",
        "Protect kidney function by recognizing nephrotoxic drugs and contrast media and keeping perfusion adequate",
        "Place patients with hyperkalemia on continuous telemetry and recognize the causes of hyperkalemia in kidney injury",
        "Manage CRRT: understand dose and net fluid removal, and monitor for filter clotting, bleeding, line infection and electrolyte disturbances",
        "Stage pressure injuries, including how stage 1 injury looks on darker skin, and name the ICU-specific risks (edema, vasopressors, immobility, devices)",
      ],
    },
    {
      title: "Musculoskeletal, Neurological, Behavioral/Psychosocial",
      weight: 18,
      // REQ-220 (FAIL-1141): as recorded in seed/labs/value-sources.ts
      // (AIS_2026, read in the guideline PDF).
      sources: [
        {
          title: "AHA/ASA 2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke (Stroke, 2026)",
          url: "https://professional.heart.org/en/guidelines-statements/2026-guideline-for-the-early-management-of-patients-with-acute-ischemic-strokestr0000000000000513",
          kind: "clinical_guideline",
          // REQ-235 (G5 follow-up), re-checked 2026-11-11: the guideline is
          // Prabhakaran et al., Stroke, online 2026-01-26,
          // doi:10.1161/STR.0000000000000513 (PubMed 41582814), replacing the
          // 2018 guideline and 2019 update. The full text refused automated
          // access; 185/110 and 180/105 were confirmed through the UIC Drug
          // Information Group's summary of it (April 2026), and the <140 mm Hg
          // line from AHA's own "Top Things to Know" page. Unchanged values.
          checkedAt: "2026-11-11",
          keyValues: [
            "blood pressure below 185/110 mm Hg before IV thrombolysis, and below 180/105 mm Hg for at least 24 hours after it",
            "intensive systolic lowering to below 140 mm Hg is not recommended after reperfusion, even when reperfusion is complete",
          ],
        },
      ],
      gate: "Given a critically ill adult with an injury, a change in neurological status or a behavioral crisis, identify the cause, pick the protective or monitoring intervention it needs, and keep the patient and staff safe.",
      objectives: [
        // Musculoskeletal
        "Compartment syndrome: early recognition and management",
        "Fractures and musculoskeletal trauma",
        "Muscular deconditioning and early mobility in the ICU",
        // Neurological
        "Stroke, hemorrhagic and ischemic, and neuroendovascular interventions such as coiling and thrombectomy",
        "Neurovascular abnormalities",
        "Traumatic brain injury (epidural, subdural, concussion, non-accidental trauma), and ICP monitoring and ventricular drains",
        "Space-occupying lesions such as brain tumors and cysts",
        "Hydrocephalus",
        "Care after neurosurgical procedures such as craniotomy, craniectomy and aneurysm clipping",
        "Acute spinal cord injury and spinal precautions",
        "Neurogenic shock",
        "Care after spinal surgery",
        "Seizure disorders, seizure precautions and continuous EEG monitoring",
        "Encephalopathy",
        "Neurologic infectious disease: viral, bacterial and fungal",
        "Neuromuscular disorders such as ALS and neuromyopathies",
        "Neurological storming",
        "Brain death",
        "Swallow evaluation before oral intake",
        // Behavioral and psychosocial
        "Delirium, and using behavioral assessment tools for delirium, alcohol withdrawal and mental status",
        "Agitation",
        "Anti-social behavior, aggression and violence, and responding to behavioral emergencies with de-escalation and nonviolent crisis intervention",
        "Substance use disorder in the critically ill",
        "Self-harm and suicidal ideation or behavior",
        "Mood disorders, depression and anxiety",
        "Post-traumatic stress disorder (PTSD)",
        "Post-intensive care syndrome (PICS)",
        "Medical non-adherence",
        "Conducting behavioral therapeutic interventions",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Recognize acute compartment syndrome from pain out of proportion, pain on passive stretch and a tense compartment, then remove constricting dressings, keep the limb at heart level, support blood pressure and escalate for fasciotomy",
        "Apply the Monro-Kellie doctrine to explain rising intracranial pressure, recognizing a falling level of consciousness as the earliest sign and Cushing's triad, pupil changes and posturing as late ones",
        "Calculate cerebral perfusion pressure and keep mean arterial pressure and oxygenation high enough to protect the brain",
        "Lower intracranial pressure with nursing measures -- head of bed raised, head midline, hips not flexed, low stimulation, clustered care -- and with osmotic therapy, sedation and CSF drainage as ordered",
        "Monitor osmotic therapy with mannitol or hypertonic saline for dehydration, electrolyte shifts, hypotension and rebound edema",
        "In ischemic stroke, establish the last-known-well time, score deficits with the NIHSS, and screen for thrombolytic contraindications",
        "In subarachnoid hemorrhage, recognize thunderclap headache, then monitor for rebleeding, vasospasm, hydrocephalus and seizures after the aneurysm is secured",
        "Recognize neurogenic shock after spinal cord injury -- hypotension with bradycardia from lost sympathetic tone rather than lost volume -- and anticipate vasopressor support",
        "Recognize autonomic dysreflexia in injuries at or above T6 (sudden severe hypertension, headache) and look first for a distended bladder or bowel",
        "Move patients with spinal injury using log-roll technique and keep the spine aligned",
        "Treat a seizure lasting 5 minutes or more as status epilepticus: support the airway, check glucose, give a benzodiazepine first, then escalate",
        "Monitor patients on levetiracetam for its adverse effects, including mood change and suicidal ideation",
        "Recognize bacterial meningitis as an emergency and give antibiotics without delay while monitoring for raised intracranial pressure and septic shock",
        "Confirm the prerequisites for brain death determination -- a known cause of coma, no confounding drugs, hypothermia or metabolic disturbance -- and know the conditions that mimic it",
        "Screen for delirium with CAM-ICU after a RASS sedation score, recognizing that deeply sedated or comatose patients cannot be assessed",
        "Score alcohol withdrawal with CIWA-Ar, anticipate symptoms peaking around the third day, and give symptom-triggered benzodiazepines",
        "Use person-first, non-stigmatizing language about substance use disorder, and anticipate withdrawal when use stops abruptly",
        "Prevent post-intensive care syndrome with the ABCDEF bundle: pain control, paired awakening and breathing trials, light sedation, delirium management, early mobility and family engagement",
      ],
    },
    {
      title: "Multisystem",
      weight: 16,
      // REQ-220 (FAIL-1141): key values the lesson writer and fact-checker
      // are given, as recorded in seed/labs/value-sources.ts (SSC_ADULT_2026,
      // read on the SCCM page 2026-11-08) and in the header above (the
      // antibiotic timing, objective 4/39).
      sources: [
        {
          title: "Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2026 (adults)",
          url: "https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026",
          kind: "clinical_guideline",
          // REQ-235 (G5 follow-up), re-read on the SCCM page 2026-11-11
          // (Prescott et al., Crit Care Med 2026, doi:10.1097/CCM.0000000000007075,
          // co-published in Intensive Care Med). One wording fixed: the
          // guideline says blood cultures "as soon as possible and ideally
          // before" antimicrobials, not strictly before; the 3-hour window
          // runs from when sepsis was first suspected. Numbers unchanged.
          checkedAt: "2026-11-11",
          keyValues: [
            "initial MAP target 65 mm Hg (60-65 suggested from age 65)",
            "at least 30 mL/kg IV crystalloid within the first 3 hours for sepsis-induced hypoperfusion or septic shock (a conditional suggestion)",
            "norepinephrine as the first-line vasopressor",
            "blood cultures as soon as possible and ideally before antimicrobials (do not delay the antimicrobials for them); antimicrobials immediately, ideally within 1 hour, for possible, probable or definite septic shock and for probable or definite sepsis; within 3 hours of first suspicion, after rapid assessment, when sepsis without shock is only possible",
          ],
        },
      ],
      gate: "Given a critically ill adult whose problem crosses organ systems, prioritize the assessment data, recognize the emergency and its trajectory (sepsis, shock, MODS), and manage the cross-cutting care -- fluids, pain, sedation, devices, medications, end of life.",
      objectives: [
        "Early sepsis identification and sepsis management",
        "Systemic inflammatory response syndrome (SIRS)",
        "Shock states, including distributive and obstructive shock",
        "Multi-organ dysfunction syndrome (MODS)",
        "Extracorporeal membrane oxygenation (ECMO)",
        "Acid-base imbalance",
        "Managing fluid and electrolyte balance and imbalances",
        "Rhabdomyolysis",
        "Anoxic injury and targeted temperature management",
        "Thermoregulation, temperature monitoring and regulation devices, and malignant hyperthermia risk",
        "Burns",
        "Submersion injuries (near-drowning)",
        "Toxic ingestion, inhalation and exposure: recognizing and managing toxin and drug exposure",
        "Healthcare-associated infections and the strategies that prevent them",
        "Infectious diseases in the critically ill",
        "Comorbidity in patients with a transplant history",
        "Obesity-related complications",
        "Failure to thrive",
        "Life-threatening maternal/fetal complications such as eclampsia, HELLP syndrome and placental abruption",
        "Intra-abdominal pressure monitoring",
        "Pain: assessment and management",
        "Sedation: indications, monitoring and safe management",
        "Sleep disruption, including sensory overload",
        "Palliative care and end-of-life care",
        "Organ donation",
        // AACN's "General" testable nursing actions -- placed here by us.
        "Assessing, evaluating and prioritizing data by the patient's immediate condition and anticipated needs",
        "Evaluating the patient's response to interventions",
        "Recognizing emergencies, initiating interventions and seeking assistance",
        "Managing device alarms by the change in the patient's condition, not the alarm alone",
        "Safe medication administration and monitoring, including polypharmacy",
        "Capnography (ETCO2) and what it tells you",
        "Vascular access: indications and management",
        "Pre- and post-operative care and procedural care",
        "Safe intrahospital transport of the critically ill",
        "Complementary, alternative and non-pharmacologic interventions",
        "Patient- and family-centered care",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Trace shock through its compensated, decompensated and irreversible stages, and link vital-sign changes to the body's compensation",
        "Distinguish absolute from relative hypovolemia and name their common causes",
        "Explain how sepsis produces vasodilation, capillary leak and rising lactate, and recognize the early signs before hypotension",
        "Deliver early sepsis care: blood cultures, broad-spectrum antibiotics ideally within the first hour in shock or probable sepsis (after a rapid assessment when sepsis is only possible), source control, crystalloid resuscitation and vasopressors to a mean arterial pressure target",
        "Use organ-dysfunction scores such as SOFA and APACHE II to track severity and risk",
        "Treat anaphylactic shock with epinephrine first, on continuous cardiac monitoring",
        "Monitor ECMO for bleeding (the most common serious complication), clotting, infection and limb ischemia",
        "Deliver targeted temperature management after cardiac arrest, rewarm slowly, and monitor for seizures and the effects of cooling",
        "Respond to malignant hyperthermia: stop the trigger, give dantrolene immediately, cool, correct acidosis and hyperkalemia, and protect the kidneys with urine flow",
        "Recognize rhabdomyolysis (muscle pain, weakness, dark urine, high CK) and give early, aggressive IV fluids, watching for kidney injury, hyperkalemia, compartment syndrome and DIC",
        "Prioritize burn care: airway and inhalation injury first, then circulation, sizing the burn by rule of nines and using a resuscitation formula only as a starting guide",
        "After drowning, prioritize oxygenation and ventilation because hypoxia drives the injury, and watch for ARDS, pneumonia and hypoxic brain injury",
        "Manage acetaminophen overdose: establish the time of ingestion, check a level timed to the nomogram, give N-acetylcysteine early, and watch for liver and kidney failure",
        "Manage opioid toxicity with airway support and naloxone, and keep monitoring because sedation can return after naloxone wears off",
        "Link each invasive device to its healthcare-associated infection (CLABSI, CAUTI, VAP) and apply contact precautions for C. difficile",
        "Assess pain in patients who cannot speak with the CPOT or Behavioral Pain Scale",
        "Choose isotonic, hypotonic or hypertonic IV fluids by the fluid shift each causes",
        "Recognize the causes and signs of hypo- and hyperkalemia and monitor affected patients on telemetry",
        "Recognize placental abruption (abrupt, intense abdominal pain, sometimes with dark vaginal bleeding) and severe preeclampsia progressing toward eclampsia or HELLP syndrome",
        "Support advance directives and durable power of attorney decisions, including withholding or withdrawing life-sustaining treatment",
      ],
    },
    {
      title: "Professional Caring & Ethical Practice",
      sources: CCRN_ADULT_UNIT_SOURCES["Professional Caring & Ethical Practice"],
      weight: 20,
      gate: "Given a critical-care situation with an ethical, family, team or system dimension, choose the nursing response that fits the Synergy Model -- advocating, teaching, collaborating or navigating the system as the patient's needs require.",
      objectives: [
        "The AACN Synergy Model: matching the nurse's competencies to the patient's characteristics and needs",
        // A. Advocacy/Moral Agency
        "Advocacy: representing the concerns of the patient, family and nursing staff",
        "Moral agency: identifying ethical and clinical concerns and helping resolve them",
        // B. Caring Practices
        "Caring practices: creating a compassionate, therapeutic environment that promotes comfort and prevents unnecessary suffering",
        "Vigilance, engagement and responsiveness toward patients, families and colleagues",
        // C. Clinical Inquiry
        "Clinical inquiry: questioning and evaluating current practice",
        "Changing practice through evidence-based practice, research utilization and experiential knowledge",
        // D. Collaboration
        "Collaboration: working with patients, families and the interdisciplinary team toward realistic goals",
        "Encouraging each person's contribution within and across disciplines",
        // E. Facilitation of Learning
        "Facilitating learning for patients and families, formally and informally",
        "Facilitating learning for nursing staff, the wider team and the community",
        // F. Response to Diversity
        "Response to diversity: recognizing and incorporating cultural, spiritual, age, lifestyle, socioeconomic and value differences into care",
        // G. Systems Thinking
        "Systems thinking: managing the environmental and system resources available to the patient, family and staff",
        "Navigating care within and across healthcare and non-healthcare systems",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Hand off and escalate concerns using a structured format such as ISBAR",
        "Respect patient autonomy and informed consent, and bring ethical dilemmas to the whole care team for discussion",
        "Use certified medical interpreters, not family or untrained staff, when patient and clinician do not share a language",
        "Confirm learning with teach-back and return demonstration",
        "Use quality-improvement data and evidence-based practice to change unit practice",
      ],
    },
  ],
};

export const CCRN_TRACKS: SeedTrack[] = [CCRN_ADULT_TRACK];
