import { source } from "../sources";

// REQ-174: the sources behind the NREMT (National Registry of Emergency
// Medical Technicians) tracks and lab sets. Each was opened on 2026-11-09 and
// the values it backs were read in the document itself (checkedAt below);
// what each backs is listed so a reviewer can re-check a value at its source.
const CHECKED = "2026-11-09";

// --- Exam outlines (NREMT) ----------------------------------------------------

// NREMT handbook "Examination Content": every level's domains and percentage
// ranges, pilot-item counts, and links to the four test plans below.
export const NREMT_EXAM_CONTENT = source("https://nremt.org/Handbooks/Certification-Examinations/Examinations-Content", "exam_outline", CHECKED);
// NREMT "EMR and EMT Certification Examinations": the updated BLS exams went
// live 2025-04-07 (last day of the prior exams 2025-04-04); computer adaptive;
// technology-enhanced items (build list, drag-and-drop, options box); the
// psychomotor process for EMRs and EMTs is unchanged and set by each state.
export const NREMT_BLS_EXAMS = source("https://nremt.org/Pages/Examinations/EMR-and-EMT-Certification-Examinations", "exam_outline", CHECKED);
// National Registry EMT Examination Specifications (2023 Basic Level Support
// Practice Analysis): five domains 15-19 / 39-43 / 5-9 / 20-24 / 10-14%,
// their job tasks, CAT, 2 hours, 70-120 items, 10 unscored pilot items, five
// item types, dichotomous scoring, standard-setting study.
export const NREMT_EMT_PLAN = source("https://nremt.org/getmedia/4cb170ab-35fa-4ec0-a76c-634847005bc4/EMT-Test-Plan_Public", "exam_outline", CHECKED);
// National Registry EMR Examination Specifications: same five domains at
// 19-23 / 37-41 / 4-8 / 20-24 / 10-14%, CAT, 1 h 45 min, 90-110 items, 30
// unscored pilot items.
export const NREMT_EMR_PLAN = source("https://nremt.org/getmedia/4657d30a-a955-43af-aa8f-a92388f0d9f4/EMR-Test-Plan_Public", "exam_outline", CHECKED);
// National Registry Paramedic Examination Specifications (2019 National EMS
// Practice Analysis and 2021 Addendum), administered from 2024-07-01: six
// domains 8-12 / 10-14 / 6-10 / 24-28 / 8-12 / 34-38% (Clinical Judgment the
// last: communication, leadership and the six steps recognize cues, analyze
// cues, define hypothesis, generate solutions, take action, evaluation); the
// separate psychomotor exam discontinued and its content embedded in the
// cognitive exam; CAT, 3.5 hours, 110-150 items, 20 unscored pilot items,
// Pearson VUE centres; item types add graphical (incl. ECG strips) and
// scenario-based.
export const NREMT_PARAMEDIC_PLAN = source("https://www.nremt.org/getmedia/1f27af23-e889-4edc-8041-55d1854d66ed/Paramedic-Test-Plan_1July2024", "exam_outline", CHECKED);
// National Registry AEMT Examination Specifications, from 2024-07-01: the
// same six domains at 9-13 / 11-15 / 7-11 / 25-29 / 6-10 / 31-35%;
// fixed-length linear computer-based test, 135 items in 3 hours, 35
// unscored pilot items; graphical items include capnography strips.
export const NREMT_AEMT_PLAN = source("https://www.nremt.org/getmedia/ae90d9db-c974-49e1-a43b-f1dddd4ea365/AEMT-Test-Plan_Public_final", "exam_outline", CHECKED);
// NREMT ALS FAQ (March 2024): PATTs ended 2024-06-30; from 2024-07-01
// candidates take the new AEMT or Paramedic exam, one exam covering cognitive
// and psychomotor content.
export const NREMT_ALS_FAQ = source("https://nremt.org/getmedia/864ba0fa-adb2-49fe-9d9e-85cfe57e550a/ALS_FAQ_3-4-24c.pdf", "exam_outline", CHECKED);
// NREMT "EMT Full Education Program" pathway: a state-approved EMT course
// meeting the National EMS Education Standards completed within 2 years, a
// state-approved BLS skills competency, exam passes valid 24 months.
export const NREMT_EMT_PATHWAY = source("https://nremt.org/Document/EMT-Full-Education-Program", "reference", CHECKED);

// --- Scope of practice ----------------------------------------------------------

// National EMS Scope of Practice Model 2019, including Change Notices 1.0 and
// 2.0 (NHTSA DOT HS 813 151, August 2021). ems.gov refused automated access
// (403); read in the Minnesota EMSRB copy of the same report. No newer model
// was found on 2026-11-09. Skill and medication tables by level (EMR / EMT /
// AEMT / Paramedic): EMR has oral airway, BVM, nasal cannula and
// non-rebreather oxygen, suction, CPR and AED, direct pressure, tourniquet and
// wound packing, cervical collar and manual stabilisation, emergency moves,
// assisted (uncomplicated) delivery, naloxone intranasal or auto-injector and
// chemical-antidote auto-injectors -- but no pulse oximetry, no glucose
// monitoring, no agency epinephrine auto-injector, no oral glucose or aspirin
// and no patient transport. EMT adds nasal airway, CPAP, pulse oximetry, all
// oxygen masks, 12-lead acquisition and transmission (not interpretation),
// mechanical CPR, long board, seated SMR, traction splint, restraint, glucose
// monitoring, agency epinephrine auto-injector, inhaled beta agonist, oral
// aspirin for suspected ischemic chest pain, oral glucose, OTC analgesics,
// sublingual nitroglycerin limited to the patient's own prescription, and
// patient transport. Supraglottic airways and waveform capnography are AEMT
// and above nationally (some states allow them for EMTs).
export const SCOPE_OF_PRACTICE_2019 = source(
  "https://mn.gov/oems/assets/National_EMS_Scope_of_Practice_Model_2021_%20%28002%29_tcm1221-744908.pdf",
  "reference",
  CHECKED
);

// --- Clinical guidelines ----------------------------------------------------------

const guideline = (url: string) => source(url, "clinical_guideline", CHECKED);

// AHA 2025 Guidelines for CPR and ECC, Part 7: Adult Basic Life Support
// (Circulation 2025;152(suppl 2):S448-S478). Read on cpr.heart.org: rate
// 100-120/min; depth at least 2 in (5 cm), avoiding more than 6 cm; full
// recoil; shortest possible pre- and post-shock pauses; 30:2 before an
// advanced airway; pulse check no more than 10 s; CPR until an AED is applied;
// 1 breath every 6 s for respiratory arrest with a pulse; severe adult FBAO:
// repeated cycles of 5 back blows then 5 abdominal thrusts.
export const AHA_2025_ADULT_BLS = guideline("https://doi.org/10.1161/CIR.0000000000001369");
// AHA/AAP 2025 Part 6: Pediatric Basic Life Support. Read on cpr.heart.org:
// depth at least one third of the chest's AP diameter, about 1.5 in (4 cm)
// infant and 2 in (5 cm) child; 100-120/min; 30:2 single rescuer, 15:2 two
// rescuers; infant 1-hand (heel of one hand) or 2-thumb encircling technique;
// rescue breathing 1 breath every 2-3 s (20-30/min); infant FBAO 5 back
// blows alternating with 5 chest thrusts (no abdominal thrusts); child FBAO 5
// back blows alternating with 5 abdominal thrusts.
// AHA 2025 Part 9: Adult Advanced Life Support (DOI 10.1161/CIR.0000000000001376).
// Read on cpr.heart.org: epinephrine 1 mg every 3-5 min; as soon as feasible
// for a non-shockable rhythm, after initial defibrillation attempts fail for
// a shockable one; amiodarone or lidocaine may be considered for VF/pVT
// unresponsive to defibrillation; vasopressin offers no advantage; an abrupt
// rise in EtCO2 may signal ROSC; 1 breath every 6 s with an advanced airway.
export const AHA_2025_ADULT_ALS = guideline("https://doi.org/10.1161/CIR.0000000000001376");
export const AHA_2025_PEDIATRIC_BLS = guideline("https://doi.org/10.1161/CIR.0000000000001370");
// National Guideline for the Field Triage of Injured Patients 2021 (ACS-COT
// with partners; released 2022). Read in ACS's two-page handout: red criteria
// (high risk) -- penetrating injury to head, neck, torso or proximal
// extremities; suspected pelvic fracture; amputation proximal to wrist or
// ankle; active bleeding needing a tourniquet or wound packing; motor GCS <6;
// RR <10 or >29; room-air SpO2 <90%; SBP <90 or HR > SBP at age 10-64, SBP
// <110 or HR > SBP at 65 and over, SBP < 70 + 2 x age at 0-9 -- go to the
// highest-level trauma center available. Yellow criteria (moderate risk) --
// high-risk crash, fall from more than 10 feet, pedestrian thrown or run over;
// EMS judgment: anticoagulant use, low-level falls with significant head
// impact at 65 and over, pregnancy over 20 weeks -- go to a trauma center
// (need not be the highest level).
export const ACS_FIELD_TRIAGE_2021 = guideline("https://www.facs.org/media/2zdltley/field-triage-handout-vfinal-revise.pdf");
// NASEMSO National Model EMS Clinical Guidelines, Version 3.0 (March 2022),
// still the current version on NASEMSO's page on 2026-11-09. The NASEMSO site
// refused the PDF (403); read in full in the copy Iowa HHS hosts
// (https://hhs.iowa.gov/media/198/download). Values used:
//   chest pain/ACS -- 12-lead within 10 minutes of contact; oxygen only if
//     dyspneic, hypoxemic or in heart failure, target SpO2 94-98%; chewable
//     non-enteric aspirin 162-325 mg; nitroglycerin 0.4 mg SL every 3-5 min if
//     SBP >100, never after a phosphodiesterase inhibitor; STEMI notification.
//   hypoglycemia -- treat at 60 mg/dL or less; oral glucose 25 g adult,
//     0.5-1 g/kg child, only with a patent airway and able to swallow;
//     release only if repeat glucose >80 mg/dL and the other listed
//     conditions (no sulfonylurea, normal mentation, can eat, adult stays).
//   stroke -- last known well and its source; validated prehospital stroke
//     scale; glucose check (treat only below 60 mg/dL); oxygen to 94-98%;
//     early notification incl. suspected LVO; do not treat hypertension.
//   anaphylaxis -- epinephrine 1 mg/mL IM anterolateral thigh, 0.3 mg at 25
//     kg or more, 0.15 mg under 25 kg; repeat every 5-15 min if hypoperfusion
//     persists.
//   external hemorrhage -- direct pressure, then commercial tourniquet 2-3 in
//     proximal to the wound, not over a joint, tightened until bleeding stops
//     and the distal pulse is gone; second tourniquet above the first; pack
//     junctional wounds; mark the time; never loosen for pain.
//   patient refusals -- capacity (alert, oriented, understands risks, not
//     impaired by illness, injury, drugs or alcohol; suicidal intent excludes
//     it); explain risks; contact medical direction when in doubt; document.
//   opioid overdose -- airway, oxygen and BVM ventilation before naloxone;
//     titrate naloxone to breathing, not to full wakefulness.
//   MCI -- a locally agreed triage process (SALT, START/JumpSTART);
//     immediate / delayed / minimal / expectant / dead; life-saving
//     interventions first; re-triage.
//   heat stroke -- usually above 104 F (40 C) with altered mental status;
//     active cooling, cold-water immersion fastest.
//   ALS (Paramedic/AEMT labs) -- airway: SpO2 94-98%, waveform EtCO2 for
//     significant distress and every advanced airway, ventilated EtCO2 35-40
//     mmHg without lung disease; respiratory distress: albuterol 5 mg with
//     ipratropium 0.5 mg, magnesium 40 mg/kg (max 2 g) for severe
//     bronchospasm, CPAP, nitroglycerin 0.4 mg SL (0.8 mg if SBP >=160) for
//     pulmonary edema; bradycardia: atropine 1 mg IV every 3-5 min (max 3
//     mg), then epinephrine infusion or push-dose, or pacing; tachycardia:
//     unstable -> synchronized cardioversion, stable SVT -> vagal manoeuvres
//     then adenosine 6 mg then 12 mg; cardiac arrest: epinephrine early for
//     non-shockable rhythms, amiodarone 300 mg or lidocaine 1 mg/kg for
//     refractory VF/pVT; termination: asystole/slow wide PEA, no ROSC at 20
//     min and EtCO2 <20 mmHg, with medical direction; seizures: >5 min or
//     recurrent, midazolam 10 mg IM (0.2 mg/kg) without IV, check glucose;
//     eclampsia: magnesium 4-6 g IV (or 8 g IM), goal BP about 140/90; head
//     injury: avoid hypoxia, SBP >=110, EtCO2 35-45, no hyperventilation;
//     trauma: SBP <90 or HR >120 -> 500 mL boluses to SBP 90 / radial pulse,
//     TXA within 3 h; hypoglycemia: D10 preferred, max 25 g IV, glucagon 1 mg
//     IM/IN without IV access; anaphylaxis with hypoperfusion: 20 mL/kg
//     isotonic fluid; croup: nebulised epinephrine for stridor at rest,
//     dexamethasone 0.6 mg/kg (max 16 mg).
//   childbirth -- support the head, check for a nuchal cord, no routine
//     suction, clamp and cut after 1 minute, dry, warm and stimulate.
export const NASEMSO_MODEL_GUIDELINES_V3 = guideline("https://nasemso.org/?p=223");
