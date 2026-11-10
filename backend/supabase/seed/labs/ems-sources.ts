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
//   childbirth -- support the head, check for a nuchal cord, no routine
//     suction, clamp and cut after 1 minute, dry, warm and stimulate.
export const NASEMSO_MODEL_GUIDELINES_V3 = guideline("https://nasemso.org/?p=223");
