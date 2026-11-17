// REQ-276: BCEN Certified Emergency Nurse (CEN) exam prep.
//
// What was read, and when (all 2026-11-14, on BCEN's own site):
//   - BCEN, "Certified Emergency Nurse (CEN) Examination Content Outline",
//     effective July 2026 (copyright 2026), linked from bcen.org/cen/study-
//     and-prepare/ as the current "CEN Content Outline (PDF)":
//     https://bcen.org/wp-content/uploads/2026/03/BCEN-CEN-ECO-2025-effective-07-2026_FINAL.pdf
//     (an identical copy is also posted under /2025/12/). Eleven categories
//     with scored-item counts 18 / 17 / 17 / 14 / 10 / 13 / 15 / 11 / 10 / 13
//     / 12 = 150. The older outline effective 01-2022 is still on the site and
//     is superseded by this one.
//   - bcen.org/cen/faqs/: 175 items (150 scored, 25 unscored pretest); total
//     seat time 180 minutes; "candidates must answer 99 of the 150 scored
//     items correctly", a criterion (not curved) standard that "is subject to
//     change every few years"; retest after a 90-day wait.
//   - bcen.org/cen/eligibility/: a current, unencumbered RN license; BCEN
//     recommends two years in the specialty but does not require it.
//
// Weights: BCEN publishes item counts, not percentages. Each unit's weight is
// its count over 150 to two decimals (numeric(5,2)); the eleven sum to
// exactly 100.00, and each unit's rangeLabel states the published count.
//
// Modeling: a proctored exam with no published exam code ("CEN" is the
// credential), credential_basis 'vendor_exam_unpublished_code', as AACN's.
// Objectives are our own wording; each unit's exam_outline source carries
// BCEN's headings as printed (headings only -- the outline is copyrighted).
//
// Clinical key values (read 2026-11-14 unless marked):
//   - ENA, Emergency Severity Index Implementation Handbook, 5th edition
//     (version 5, 2023): decision points A-D and adult high-risk vital signs
//     (HR >100, RR >20, SpO2 <92%). Read in the handbook PDF.
//   - Surviving Sepsis Campaign adult guidelines 2026 (SCCM page).
//   - AHA/ASA 2026 acute ischemic stroke guideline (AHA "Top things to know";
//     the 185/110 and 180/105 limits read 2026-11-16 in the full guideline
//     text, section 4.3, COR 1; REQ-310).
//   - Anaphylaxis practice parameter 2020 (Shaker et al.), read through the
//     Cleveland Clinic Journal of Medicine summary (2022): epinephrine 1 mg/mL
//     0.01 mg/kg IM mid-outer thigh, max 0.5 mg adult and 0.3 mg child.
//   - AHA/AAP 2025 neonatal resuscitation (cpr.heart.org): PPV 30-60/min,
//     compressions below 60/min after 30 s of effective ventilation, 3:1.
//   - 42 CFR 489.24 (EMTALA), eCFR up to date as of 2026-10-22.
//   - ACOG Practice Bulletin 222 severe range (160/110), carried from the
//     nursing courses' 2026-11-07 reading.
// Not verified, left out: acetaminophen nomogram values (the 2023 consensus
// was read only through a news summary that does not give them), burn
// resuscitation formulas, TXA timing, door-to-ECG and door-to-needle times.

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
const REVIEW_DUE_AT = "2027-11-14T00:00:00Z";

export const CEN_OUTLINE_URL = "https://bcen.org/wp-content/uploads/2026/03/BCEN-CEN-ECO-2025-effective-07-2026_FINAL.pdf";
const NURSING_DISCLAIMER_KEY = "nursing-clinical-content";

const eco = (n: number, title: string, outline: string[]): UnitSource => ({
  title: `BCEN CEN Examination Content Outline (effective July 2026), category ${n}: ${title}`,
  ...source(CEN_OUTLINE_URL, "exam_outline", CHECKED),
  outline,
});
const guide = (title: string, url: string, keyValues: string[], checkedAt = CHECKED): UnitSource => ({
  title,
  ...source(url, "clinical_guideline", checkedAt),
  keyValues,
});

const ESI = guide(
  "ENA, Emergency Severity Index Implementation Handbook, 5th edition (version 5, 2023)",
  "https://media.emscimprovement.center/documents/Emergency_Severity_Index_Handbook.pdf",
  [
    "ESI decision points: A requires an immediate life-saving intervention (level 1); B high-risk situation, new confusion/lethargy/disorientation, or severe pain/distress (level 2); C how many different resources (none level 5, one level 4, many level 3); D high-risk vital signs prompt reconsidering level 2",
    "adult high-risk vital signs: heart rate >100, respiratory rate >20, SpO2 <92%",
  ]
);
const EMTALA = guide(
  "42 CFR 489.24, special responsibilities of Medicare hospitals in emergency cases (EMTALA), eCFR up to date as of 2026-10-22",
  "https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-489/subpart-B/section-489.24",
  [
    "an appropriate medical screening examination within the emergency department's capability for anyone who comes requesting care; then stabilizing treatment or an appropriate transfer",
    "an appropriate transfer: the receiving facility has space and qualified staff and has agreed to accept; records go with the patient; qualified personnel and equipment; for an unstabilized condition, the patient's written request or a physician's certification that benefits outweigh risks",
  ]
);
const SSC = guide(
  "Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2026 (adults)",
  "https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026",
  [
    "antimicrobials immediately, ideally within 1 hour, for possible, probable or definite septic shock and for probable or definite sepsis; within 3 hours after rapid assessment when sepsis without shock is only possible; blood cultures ideally before antimicrobials",
    "at least 30 mL/kg crystalloid in the first 3 hours for sepsis-induced hypoperfusion (conditional); initial MAP target 65 mm Hg; norepinephrine first line",
  ]
);
const ANAPHYLAXIS = guide(
  "Anaphylaxis practice parameter update 2020 (Shaker et al., J Allergy Clin Immunol 2020), as summarized in Cleve Clin J Med 2022;89:106",
  "https://www.ccjm.org/content/89/2/106",
  ["epinephrine first: 1 mg/mL solution, 0.01 mg/kg intramuscularly in the mid-outer thigh, maximum 0.5 mg in adults and 0.3 mg in children"]
);
const AIS = guide(
  "AHA/ASA 2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke (AHA 'Top things to know')",
  "https://professional.heart.org/en/science-news/2026-guideline-for-the-early-management-of-patients-with-acute-ischemic-stroke/top-things-to-know",
  [
    "IV thrombolysis (alteplase or tenecteplase) within 4.5 hours of onset; selected patients to 9 hours or unknown onset with advanced imaging",
    "blood pressure below 185/110 mm Hg before IV thrombolysis and below 180/105 mm Hg for at least 24 hours after (section 4.3, COR 1; full text read 2026-11-16)",
  ]
);
const NRP = guide(
  "AHA/AAP 2025 Guidelines: Neonatal Resuscitation (cpr.heart.org)",
  "https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/neonatal-resuscitation",
  [
    "positive-pressure ventilation at 30-60 inflations per minute",
    "chest compressions if the heart rate stays below 60/min despite 30 seconds of effective ventilation, 3 compressions to 1 breath",
    "room air may be reasonable to start for term and late-preterm (35 weeks or more) newborns needing support",
  ]
);
const ACOG = guide(
  "ACOG Practice Bulletin 222, Gestational Hypertension and Preeclampsia (2020)",
  "https://kansaspqc.kdhe.ks.gov/acog-gestation-htn-and-preeclampsia-practice-bulletin",
  ["severe-range blood pressure in pregnancy: systolic 160 mm Hg or more, or diastolic 110 mm Hg or more"],
  "2026-11-07"
);

export const CEN_SIM_OBJECTIVES = {
  triage: "Assign ESI levels to a waiting room of patients and re-triage when vital signs or symptoms change",
  sepsis: "Recognize sepsis at triage and start cultures, antimicrobials and fluid within the first hour",
} as const;

const label = (n: number) => `${n} of 150 scored items`;

export const CEN_TRACK: SeedTrack = {
  code: "CEN",
  title: "Exam Prep for CEN®",
  description:
    "An emergency nursing specialty certification, built on the examination content outline effective July 2026: ten clinical categories from cardiovascular to environment, toxicology and communicable disease, plus professional issues, weighted by the published item counts. Independently developed exam prep; not affiliated with or endorsed by the organization that owns or administers this exam.",
  trackType: "certification",
  subcategorySlug: "nursing-specialty-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: CEN_OUTLINE_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: NURSING_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    providerSlug: "bcen",
    providerName: "Board of Certification for Emergency Nursing (BCEN)",
    providerUrl: "https://bcen.org",
    subcategorySlug: "nursing-specialty-certifications",
    credentialType: "specialist_certification",
    credentialSlug: "cen",
    credentialName: "Certified Emergency Nurse (CEN)",
    credentialUrl: "https://bcen.org/cen/",
    basis: "vendor_exam_unpublished_code",
    examRevision: "CEN Examination Content Outline, effective July 2026",
    objectivesRevision: "CEN ECO effective 2026-07 (BCEN, copyright 2026)",
    status: "active",
    effectiveDate: "2026-07-01",
    versionNote: "BCEN dates the outline 'Effective July 2026' without a day; the first of the month is recorded.",
    officialObjectivesUrl: CEN_OUTLINE_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "A current, unencumbered RN license. BCEN recommends at least two years in emergency nursing before testing but does not require it.",
    durationMinutes: 180,
    questionFormat: "175 multiple-choice items in 180 minutes of seat time, fixed length (every candidate answers the same number of questions): 150 scored and 25 unscored pretest items.",
    passingScorePolicy:
      "Criterion-referenced, not curved: BCEN's FAQ (read 2026-11-14) says a candidate must answer 99 of the 150 scored items correctly, a standard BCEN reviews every few years. Retest after a 90-day wait.",
  },
  units: [
    {
      title: "Cardiovascular Emergencies",
      rangeLabel: label(18),
      weight: 12,
      sources: [
        eco(1, "Cardiovascular Emergencies", [
          "A. Acute coronary syndrome",
          "B. Aneurysm and dissection",
          "C. Cardiopulmonary arrest",
          "D. Dysrhythmias",
          "E. Endocarditis, Myocarditis, Pericarditis",
          "F. Heart failure",
          "G. Hypertension",
          "H. Pericardial tamponade",
          "I. Peripheral vascular disease (e.g., venous and arterial)",
          "J. Thromboembolic disease",
          "K. Cardiovascular trauma",
          "L. Cardiogenic shock and obstructive shock",
        ]),
      ],
      gate: "Given an emergency patient with chest pain, a rhythm change, a pulseless event or a cold limb, recognize the cardiovascular emergency, choose the first actions in order, and anticipate the definitive care.",
      objectives: [
        "Recognize acute coronary syndrome at triage and get a 12-lead ECG read without delay",
        "Prioritize early ACS care: aspirin, nitroglycerin with blood-pressure precautions, oxygen only for hypoxemia, and rapid reperfusion for STEMI",
        "Recognize aortic dissection and ruptured aneurysm from sudden tearing pain, pulse or pressure differences and shock",
        "Run a cardiac arrest: high-quality compressions, early defibrillation for shockable rhythms, epinephrine, and the reversible causes",
        "Identify and treat stable and unstable tachycardias and bradycardias",
        "Endocarditis, myocarditis and pericarditis in the emergency department",
        "Acute decompensated heart failure and flash pulmonary edema",
        "Tell a hypertensive emergency from severe hypertension without organ damage, and lower pressure in a controlled way",
        "Recognize pericardial tamponade from hypotension, distended neck veins, muffled heart sounds and pulsus paradoxus",
        "Assess acute arterial occlusion and deep vein thrombosis in a limb",
        "Recognize pulmonary embolism and other thromboembolic disease",
        "Blunt and penetrating cardiovascular trauma",
        "Tell cardiogenic from obstructive shock and anticipate the treatment each needs",
      ],
    },
    {
      title: "Respiratory Emergencies",
      rangeLabel: label(17),
      weight: 11.33,
      sources: [
        eco(2, "Respiratory Emergencies", [
          "A. Aspiration",
          "B. Asthma",
          "C. Chronic obstructive pulmonary disease",
          "D. Infections",
          "E. Inhalation injuries",
          "F. Obstruction",
          "G. Pleural effusion",
          "H. Pneumothorax",
          "I. Noncardiac pulmonary edema",
          "J. Pulmonary embolus",
          "K. Respiratory distress syndrome",
          "L. Respiratory trauma",
          "M. Pulmonary hypertension",
          "N. Croup",
        ]),
      ],
      gate: "Given an emergency patient struggling to breathe, find the cause, choose and escalate support, and recognize the airway or chest emergency that cannot wait.",
      objectives: [
        "Aspiration and its pneumonitis or pneumonia",
        "Manage an acute asthma attack and recognize the signs of impending respiratory failure",
        "Manage a COPD exacerbation with controlled oxygen and early noninvasive ventilation",
        "Pneumonia and other lower respiratory infections in the emergency department",
        "Recognize inhalation injury and airway burns that need early airway protection",
        "Relieve upper airway obstruction and foreign bodies",
        "Pleural effusion presenting with dyspnea",
        "Recognize tension pneumothorax as a clinical diagnosis treated before imaging",
        "Noncardiac pulmonary edema from causes such as opioids, high altitude or near-drowning",
        "Recognize pulmonary embolism and anticipate imaging and anticoagulation or thrombolysis",
        "Acute respiratory distress syndrome in the emergency department",
        "Assess chest trauma: rib fractures, flail chest, pulmonary contusion and hemothorax",
        "Pulmonary hypertension in the emergency patient",
        "Assess croup severity in a child and anticipate steroids and nebulized epinephrine for stridor at rest",
      ],
    },
    {
      title: "Neurological Emergencies",
      rangeLabel: label(17),
      weight: 11.33,
      sources: [
        eco(3, "Neurological Emergencies", [
          "A. Neurological disorders",
          "B. Headache",
          "C. Increased intracranial pressure",
          "D. Meningitis",
          "E. Seizure disorders",
          "F. Stroke",
          "G. Transient ischemic attack",
          "H. Head and spinal cord trauma",
          "I. Neurogenic shock",
        ]),
        AIS,
      ],
      gate: "Given an emergency patient with a headache, a seizure, a deficit or a head or spine injury, recognize the time-critical neurological emergency and start the right pathway.",
      objectives: [
        "Neurological disorders such as Guillain-Barre syndrome and myasthenic crisis that threaten the airway",
        "Recognize the dangerous headache: thunderclap onset, worst ever, fever and stiff neck, or a new deficit",
        "Recognize rising intracranial pressure from a falling level of consciousness, then pupil changes and Cushing's triad",
        "Recognize bacterial meningitis and give antibiotics without waiting for a lumbar puncture when it would delay them",
        "Treat a seizure lasting 5 minutes or more as status epilepticus",
        "Run an acute stroke pathway: last known well, glucose, NIHSS, imaging and thrombolysis eligibility",
        "Transient ischemic attack and the risk of early stroke",
        "Assess head and spinal cord injury with GCS and spinal motion restriction",
        "Recognize neurogenic shock -- hypotension with bradycardia after spinal cord injury",
      ],
    },
    {
      title: "Gastrointestinal Emergencies",
      rangeLabel: label(14),
      weight: 9.33,
      sources: [
        eco(4, "Gastrointestinal Emergencies", [
          "A. Appendicitis",
          "B. Peritonitis",
          "C. Bowel perforation",
          "D. Cyclic vomiting syndrome",
          "E. Bleeding",
          "F. Cholecystitis",
          "G. Cirrhosis",
          "H. Diverticulitis",
          "I. Esophageal varices",
          "J. Foreign bodies",
          "K. Hepatitis",
          "L. Intussusception",
          "M. Obstructions",
          "N. Pancreatitis",
          "O. Gastrointestinal trauma",
          "P. Gastrointestinal disorders",
        ]),
      ],
      gate: "Given an emergency patient with abdominal pain, vomiting or GI bleeding, separate the surgical and hemorrhagic emergencies from the rest and prioritize accordingly.",
      objectives: [
        "Recognize appendicitis, cholecystitis and diverticulitis from the history and examination",
        "Recognize peritonitis and bowel perforation from a rigid abdomen and free air",
        "Cyclic vomiting syndrome, including cannabis-associated hyperemesis",
        "Manage upper and lower GI bleeding with large-bore access and blood",
        "Recognize variceal bleeding in cirrhosis and anticipate vasoactive drugs, antibiotics and endoscopy",
        "Swallowed and inserted foreign bodies, including button batteries and magnets",
        "Hepatitis and acute liver injury",
        "Recognize intussusception in a young child with episodic pain and lethargy",
        "Bowel obstruction and its ischemic complications",
        "Acute pancreatitis in the emergency department",
        "Assess blunt and penetrating abdominal trauma, including the FAST examination",
      ],
    },
    {
      title: "Genitourinary, Gynecology, and Obstetrical Emergencies",
      rangeLabel: label(10),
      weight: 6.67,
      sources: [
        eco(5, "Genitourinary, Gynecology, and Obstetrical Emergencies", [
          "A. Genitourinary: 1. Genitourinary infections 2. Priapism 3. Renal calculi 4. Testicular torsion 5. Genitourinary trauma 6. Urinary retention 7. Renal failure",
          "B. Gynecology: 1. Dysfunctional uterine bleeding 2. Gynecological infections 3. Ovarian disorders 4. Sexual assault and battery 5. Gynecological trauma",
          "C. Obstetrical: 1. Abruptio placenta 2. Ectopic pregnancy 3. Emergent delivery 4. Hemorrhage 5. Hyperemesis gravidarum 6. Neonatal resuscitation 7. Placenta previa 8. Postpartum infection 9. Preeclampsia, eclampsia, and HELLP syndrome 10. Preterm labor 11. Threatened/spontaneous abortion 12. Obstetric trauma 13. Uterine rupture",
        ]),
        NRP,
        ACOG,
      ],
      gate: "Given an emergency patient with a genitourinary, gynecologic or obstetric problem, recognize what threatens life, fertility or the pregnancy, and act in time.",
      objectives: [
        "Urinary infection, urosepsis and urinary retention",
        "Recognize testicular torsion and priapism as time-critical",
        "Renal colic and an obstructed, infected kidney",
        "Genitourinary trauma and acute kidney failure in the emergency department",
        "Abnormal uterine bleeding, pelvic infections and ovarian torsion",
        "Care for a patient after sexual assault: safety, medical care, consent, evidence and support",
        "Recognize ruptured ectopic pregnancy in any patient of childbearing age with pain, bleeding or shock",
        "Prepare for and assist an emergency delivery",
        "Resuscitate a newborn: dry, warm, stimulate, ventilate, and compress only for a heart rate below 60",
        "Tell placental abruption, placenta previa and uterine rupture apart by pain and bleeding",
        "Recognize severe-range blood pressure and preeclampsia, eclampsia and HELLP, and anticipate magnesium sulfate",
        "Hyperemesis gravidarum, preterm labor, threatened or spontaneous abortion and postpartum infection",
        "Trauma in pregnancy: left uterine displacement and early fetal monitoring",
        "Postpartum hemorrhage in the emergency department",
      ],
    },
    {
      title: "Mental Health Emergencies",
      rangeLabel: label(13),
      weight: 8.67,
      sources: [
        eco(6, "Mental Health Emergencies", [
          "A. Aggressive and violent behavior",
          "B. Anxiety disorders",
          "C. Depressive disorders",
          "D. Homicidal and suicidal ideation",
          "E. Intentional overdose and ingestions",
          "F. Psychotic disorders",
          "G. Bipolar disorders",
        ]),
      ],
      gate: "Given an emergency patient in a mental health crisis, keep the patient and staff safe, screen for the medical cause and the risk, and choose the least restrictive response.",
      objectives: [
        "De-escalate aggressive and violent behavior, and use restraint only as a last resort",
        "Anxiety and panic, after ruling out a medical cause",
        "Depression in the emergency department",
        "Screen for suicide and homicide risk, and keep a patient at risk safe in the department",
        "Assess an intentional overdose: the substance, the amount, the time and co-ingestions",
        "Acute psychosis and the medical conditions that mimic it",
        "Mania and bipolar disorder in crisis",
      ],
    },
    {
      title: "Medical Emergencies",
      rangeLabel: label(15),
      weight: 10,
      sources: [
        eco(7, "Medical Emergencies", [
          "A. Allergic reactions and anaphylaxis",
          "B. Hematologic disorders",
          "C. Electrolyte and fluid imbalance",
          "D. Endocrine disorders",
          "E. Immunocompromise",
          "F. Sepsis",
          "G. Hypovolemic and distributive shock",
          "H. Substance use and abuse",
          "I. Withdrawal syndrome",
        ]),
        ANAPHYLAXIS,
        SSC,
      ],
      gate: "Given an emergency patient with a systemic medical problem -- an allergic reaction, a blood, fluid or endocrine disorder, an infection or a substance problem -- recognize the threat to life and start the right treatment first.",
      objectives: [
        "Treat anaphylaxis with intramuscular epinephrine first, then airway, fluids and adjuncts",
        "Sickle cell crisis, hemophilia and other hematologic emergencies",
        "Recognize hyperkalemia, hyponatremia and other electrolyte emergencies and their treatment",
        "Diabetic ketoacidosis, hypoglycemia, adrenal crisis and thyroid emergencies",
        "Recognize fever in an immunocompromised or neutropenic patient as an emergency",
        CEN_SIM_OBJECTIVES.sepsis,
        "Tell hypovolemic from distributive shock and anticipate fluids, blood or vasopressors",
        "Substance use and intoxication in the emergency department",
        "Recognize and treat alcohol and opioid withdrawal",
      ],
    },
    {
      title: "Musculoskeletal and Wound Emergencies",
      rangeLabel: label(11),
      weight: 7.33,
      sources: [
        eco(8, "Musculoskeletal and Wound Emergencies", [
          "A. Musculoskeletal: 1. Amputation 2. Compartment syndrome 3. Ligament tendon injuries 4. Fractures 5. Dislocations 6. Inflammatory conditions 7. Osteomyelitis",
          "B. Wound: 1. Avulsions and degloving injuries 2. Wound infections 3. Injection injuries 4. Lacerations 5. Penetrating injuries 6. Wound bleeding",
        ]),
      ],
      gate: "Given an emergency patient with a limb or soft-tissue injury, control bleeding, protect the limb's circulation and function, and recognize the injury that hides its severity.",
      objectives: [
        "Care for a traumatic amputation and preserve the amputated part",
        "Recognize compartment syndrome from pain out of proportion and pain on passive stretch",
        "Assess fractures and dislocations for neurovascular compromise and splint safely",
        "Ligament and tendon injuries, gout, septic joint and osteomyelitis",
        "Avulsions, degloving injuries, lacerations and wound infections",
        "Recognize high-pressure injection injuries as surgical emergencies despite a small wound",
        "Control wound bleeding with direct pressure, packing and a tourniquet",
        "Penetrating injuries and impaled objects",
      ],
    },
    {
      title: "Head, Eye, Ear, Nose, Throat Emergencies",
      rangeLabel: label(10),
      weight: 6.67,
      sources: [
        eco(9, "Head, Eye, Ear, Nose, Throat Emergencies", [
          "A. Head: 1. Facial nerve disorders 2. Maxillofacial infections 3. Maxillofacial trauma",
          "B. Eye: 1. Abrasions 2. Burns 3. Foreign bodies 4. Increased intraocular pressure 5. Ocular infections 6. Retinal artery occlusion 7. Retinal detachment 8. Ocular trauma 9. Ulcerations and keratitis",
          "C. Ear: 1. Acute vestibular dysfunction 2. Foreign bodies 3. Infections",
          "D. Nose: 1. Foreign bodies 2. Epistaxis",
          "E. Throat: 1. Epiglottitis 2. Peritonsillar abscess",
        ]),
      ],
      gate: "Given an emergency patient with a face, eye, ear, nose or throat problem, recognize what threatens the airway or sight and act first on that.",
      objectives: [
        "Facial nerve palsy, maxillofacial infections and facial fractures",
        "Irrigate a chemical eye burn immediately and continuously before any other assessment",
        "Corneal abrasions, ulcers, keratitis and eye foreign bodies",
        "Recognize acute angle-closure glaucoma, central retinal artery occlusion and retinal detachment as sight-threatening",
        "Penetrating and blunt eye trauma: shield, do not press, do not remove an impaled object",
        "Acute vertigo, ear infections and ear foreign bodies",
        "Control epistaxis and recognize a posterior bleed",
        "Recognize epiglottitis and peritonsillar abscess as threats to the airway",
      ],
    },
    {
      title: "Environment and Toxicology Emergencies, and Communicable Diseases",
      rangeLabel: label(13),
      weight: 8.67,
      sources: [
        eco(10, "Environment and Toxicology Emergencies, and Communicable Diseases", [
          "A. Environment: 1. Burns 2. Chemical exposure 3. Electrical injuries 4. Submersion injury 5. Temperature-related emergencies 6. Animal bites",
          "B. Toxicology: 1. Acids and alkalis 2. Carbon monoxide 3. Cyanide",
          "C. Communicable Diseases: 1. C. Difficile 2. Vaccine-preventable diseases (e.g., measles, mumps, rubella, pertussis, chicken pox, diphtheria) 3. Respiratory viruses 4. Multi-drug resistant organisms 5. Tuberculosis 6. Hemorrhagic fevers 7. Sexually transmitted infections",
        ]),
      ],
      gate: "Given an emergency patient harmed by heat, cold, water, electricity, chemicals, a bite or an infection others can catch, protect staff and other patients first and treat the exposure.",
      objectives: [
        "Assess a burn: airway and inhalation injury first, then size by percentage of body surface and depth",
        "Decontaminate a chemical exposure, and treat acid and alkali injuries",
        "Electrical and lightning injuries, including hidden deep tissue damage and arrhythmia",
        "Submersion injury: oxygenation and ventilation first",
        "Recognize heat stroke and cool rapidly; rewarm hypothermia safely",
        "Animal and human bites: wound care, infection risk and rabies and tetanus decisions",
        "Recognize carbon monoxide poisoning despite a normal pulse oximeter reading, and give high-flow oxygen",
        "Recognize cyanide poisoning in a smoke-inhalation patient and anticipate the antidote",
        "Choose isolation for measles, varicella, tuberculosis, pertussis, C. difficile, respiratory viruses and multidrug-resistant organisms",
        "Hemorrhagic fevers and sexually transmitted infections in the emergency department",
      ],
    },
    {
      title: "Professional Issues",
      rangeLabel: label(12),
      weight: 8,
      sources: [
        eco(11, "Professional Issues", [
          "A. Prioritization: 1. Triage 2. Mass casualty 3. Patient throughput",
          "B. Legal and ethical issues: 1. End-of-life and palliative care 2. Forensic evidence collection 3. Federal regulations 4. Patient consent for treatment 5. Continuity of care 6. Cultural humility 7. Abuse and neglect 8. Impaired nurse and drug diversion 9. Workplace violence",
        ]),
        ESI,
        EMTALA,
      ],
      gate: "Given a busy department, a legal or ethical dilemma or a safety threat, prioritize the patients, meet the legal duty and protect patients and staff.",
      objectives: [
        CEN_SIM_OBJECTIVES.triage,
        "Triage in a mass casualty incident and keep the department flowing",
        "Improve patient throughput: boarding, flow and handoffs",
        "End-of-life and palliative care in the emergency department",
        "Collect and preserve forensic evidence with chain of custody",
        "Apply EMTALA: a medical screening examination for everyone who asks, stabilization, and appropriate transfer",
        "Obtain consent for treatment, and treat under implied consent in an emergency",
        "Hand off and transfer patients safely for continuity of care",
        "Practice cultural humility with patients and families",
        "Recognize and report child, elder and intimate partner abuse and neglect",
        "Recognize an impaired colleague and drug diversion, and report through the right channels",
        "Prevent and respond to workplace violence",
      ],
    },
  ],
};

export const CEN_TRACKS: SeedTrack[] = [CEN_TRACK];
