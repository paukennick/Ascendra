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

import type { SeedTrack } from "../data";

const VERIFIED_AT = "2026-10-31T00:00:00Z";
const REVIEW_DUE_AT = "2027-10-31T00:00:00Z";

const HANDBOOK_URL =
  "https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en";

// Shared with every nursing track; wording lives in
// mobile/src/content/disclaimers.ts.
const NURSING_DISCLAIMER_KEY = "nursing-clinical-content";

// ---------------------------------------------------------------------------
// CCRN (Adult) -- Adult CCRN Test Plan, exams on and after 2025-11-12.
// 3 hours, 150 multiple-choice items (125 scored, 25 unscored pretest).
// Category weights: 13 / 12 / 21 / 18 / 16 / 20.
// ---------------------------------------------------------------------------
export const CCRN_ADULT_TRACK: SeedTrack = {
  code: "CCRNADULT",
  title: "CCRN (Adult) Critical Care Coach",
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
      "Current, unencumbered US RN or APRN licence, plus either 1,750 hours of direct care of acutely/critically ill patients in the previous 2 years (875 of them in the most recent year) or at least 2,000 such hours over the previous 5 years (144 of them in the most recent year). Hours must be with the adult population, and most must focus on critically ill patients.",
    durationMinutes: 180,
    questionFormat:
      "150 multiple-choice items in 3 hours: 125 scored and 25 unscored pretest items. 80% Clinical Judgment, 20% Professional Caring & Ethical Practice, organised by the AACN Synergy Model for Patient Care.",
    passingScorePolicy:
      "Criterion-referenced: the cut score is set by the modified Angoff method, with a Score Evaluation Committee of subject matter experts rating each item under a psychometrician's guidance, approved by AACN Certification Corporation. Each candidate is measured against that standard, not against other candidates.",
  },
  units: [
    {
      title: "Cardiovascular",
      weight: 13,
      gate: "Given a critically ill adult's rhythm strip, hemodynamic numbers and bedside findings, name the cardiovascular problem, spot falling cardiac output early, and choose the nursing priority and the device or procedure care it calls for.",
      objectives: [
        "Recognising early signs of decreased cardiac output before frank shock",
        "Monitoring hemodynamic status, non-invasive and invasive, and recognising instability from the numbers and the patient",
        "Identifying, interpreting and responding to cardiac rhythms and dysrhythmias",
        "Conduction system defects such as prolonged QT and Wolff-Parkinson-White, and caring for a patient on temporary pacing",
        "Acute coronary syndrome: recognition, priorities and post-event care",
        "Heart failure: acute decompensation, fluid overload and the medications that treat it",
        "Cardiomyopathy and its critical-care complications",
        "Cardiogenic shock and caring for patients on mechanical circulatory support devices",
        "Cardiac tamponade: recognising it and caring for the patient through pericardiocentesis",
        "Cardiac infection and inflammatory diseases",
        "Structural heart defects, acquired and congenital, including valvular disease",
        "Hypertensive crisis: recognising end-organ risk and controlled blood-pressure lowering",
        "Aortic aneurysm, dissection and rupture, thoracic and abdominal",
        "Cardiac trauma",
        "Care of the patient after cardiac surgery",
        "Cardiac and vascular catheterization and endovascular procedures: before, during and after",
        "Vascular disorders such as arterial and venous stenosis",
        "Vascular interventions such as stents, fem-pop bypass and carotid endarterectomy, and their complications",
      ],
    },
    {
      title: "Respiratory",
      weight: 12,
      gate: "Given a deteriorating adult's breathing, gases and ventilator or oxygen settings, identify the respiratory problem, choose the right level of support, and prevent or catch the complications that support brings.",
      objectives: [
        "Acute respiratory failure: recognising it and escalating support in time",
        "Oxygen therapy delivery devices and choosing between them",
        "Noninvasive positive pressure ventilation (BiPAP, CPAP, high-flow nasal cannula) and its limits",
        "Airway management and rapid sequence intubation",
        "Mechanical ventilation: settings, the patient's response, and what to change when it is not working",
        "Preventing and recognising complications of mechanical ventilation and NIPPV",
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
      ],
    },
    {
      title: "Endocrine, Hematology/Immunology, GI, Renal/GU, Integumentary",
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
      ],
    },
    {
      title: "Musculoskeletal, Neurological, Behavioral/Psychosocial",
      weight: 18,
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
      ],
    },
    {
      title: "Multisystem",
      weight: 16,
      gate: "Given a critically ill adult whose problem crosses organ systems, prioritise the assessment data, recognise the emergency and its trajectory (sepsis, shock, MODS), and manage the cross-cutting care -- fluids, pain, sedation, devices, medications, end of life.",
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
        "Toxic ingestion, inhalation and exposure: recognising and managing toxin and drug exposure",
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
        "Assessing, evaluating and prioritising data by the patient's immediate condition and anticipated needs",
        "Evaluating the patient's response to interventions",
        "Recognising emergencies, initiating interventions and seeking assistance",
        "Managing device alarms by the change in the patient's condition, not the alarm alone",
        "Safe medication administration and monitoring, including polypharmacy",
        "Capnography (ETCO2) and what it tells you",
        "Vascular access: indications and management",
        "Pre- and post-operative care and procedural care",
        "Safe intrahospital transport of the critically ill",
        "Complementary, alternative and non-pharmacologic interventions",
        "Patient- and family-centred care",
      ],
    },
    {
      title: "Professional Caring & Ethical Practice",
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
        "Changing practice through evidence-based practice, research utilisation and experiential knowledge",
        // D. Collaboration
        "Collaboration: working with patients, families and the interdisciplinary team toward realistic goals",
        "Encouraging each person's contribution within and across disciplines",
        // E. Facilitation of Learning
        "Facilitating learning for patients and families, formally and informally",
        "Facilitating learning for nursing staff, the wider team and the community",
        // F. Response to Diversity
        "Response to diversity: recognising and incorporating cultural, spiritual, age, lifestyle, socioeconomic and value differences into care",
        // G. Systems Thinking
        "Systems thinking: managing the environmental and system resources available to the patient, family and staff",
        "Navigating care within and across healthcare and non-healthcare systems",
      ],
    },
  ],
};

export const CCRN_TRACKS: SeedTrack[] = [CCRN_ADULT_TRACK];
