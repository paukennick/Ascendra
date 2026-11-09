// REQ-174: National Registry of Emergency Medical Technicians (NREMT)
// cognitive certification exams -- EMT and Emergency Medical Responder (EMR).
//
// Every domain, percentage range, item count, time limit and item type below
// was read on 2026-11-09 in NREMT's own documents, not a prep-site summary:
//   - the handbook page "Examination Content" (all four levels' domains and
//     ranges, pilot counts, links to the test plans);
//   - "National Registry Emergency Medical Technician Examination
//     Specifications" and the EMR equivalent (the test plans, 2023 Basic
//     Level Support Practice Analysis);
//   - the "EMR and EMT Certification Examinations" page: the updated exams
//     went live 2025-04-07 (the PDFs say only "Spring 2025").
// Dated source records: seed/labs/ems-sources.ts.
//
// Modeling: a real, proctored certification exam whose body publishes no
// exam code, so credential_basis 'vendor_exam_unpublished_code' (same as
// CCRN and the ABPTS exams); "EMT" is the level, not a code.
//
// Weights: NREMT publishes ranges only (EMT Scene Size-up and Safety 15-19%)
// and, unlike NCSBN, no planning midpoints. `weight` carries the midpoint of
// each published range -- our derivation, stated here and in
// publishedWeightsNote -- and `rangeLabel` shows the published range. The EMT
// midpoints sum to 99, not 100; they are kept as derived rather than nudged,
// because any nudge would be a number NREMT never printed. The EMR midpoints
// sum to 100.
//
// Pediatrics: NREMT integrates pediatric items throughout every domain; there
// is no pediatric unit, so pediatric objectives sit in each unit.
//
// Objectives are our own learner-facing wording, built from each domain's
// job tasks in the test plan, with scope set by the National EMS Scope of
// Practice Model 2019 (Change Notices 1.0 and 2.0, 2021) and clinical content
// from the NASEMSO National Model EMS Clinical Guidelines v3.0 (2022), the
// AHA 2025 CPR and ECC guidelines (Parts 6 and 7) and the 2021 National
// Guideline for the Field Triage of Injured Patients. No objective copies
// test-plan text beyond short task names; no doses or thresholds are written
// into objective text -- the labs carry those, each with its source.
//
// Scope differs by level (Scope of Practice Model tables, read 2026-11-09):
// an EMR has no pulse oximetry, glucose monitoring, oral glucose, aspirin or
// agency epinephrine auto-injector and does not transport; an EMT has all of
// these, CPAP and 12-lead acquisition (not interpretation), and sublingual
// nitroglycerin only as the patient's own prescription. States can narrow or
// widen these; every objective says "within EMT/EMR scope" rather than
// assuming a state's protocol.
//
// requiresAcknowledgement: as for nursing and PT -- acting on wrong
// prehospital content has patient-safety consequences.

import type { SeedTrack } from "../data";

const VERIFIED_AT = "2026-11-09T00:00:00Z";
const REVIEW_DUE_AT = "2027-11-09T00:00:00Z";

// REQ-165: the key only marks the course as gated (the study notice).
const EMS_DISCLAIMER_KEY = "ems-clinical-content";

const NREMT_PROVIDER = {
  providerSlug: "nremt",
  providerName: "National Registry of Emergency Medical Technicians",
  providerUrl: "https://nremt.org/",
  subcategorySlug: "emergency-medical-services",
  credentialType: "certification",
} as const;

const EMT_PLAN_URL = "https://nremt.org/getmedia/4cb170ab-35fa-4ec0-a76c-634847005bc4/EMT-Test-Plan_Public";
const EMR_PLAN_URL = "https://nremt.org/getmedia/4657d30a-a955-43af-aa8f-a92388f0d9f4/EMR-Test-Plan_Public";
const BLS_EXAMS_URL = "https://nremt.org/Pages/Examinations/EMR-and-EMT-Certification-Examinations";

const BLS_ITEM_TYPES =
  "multiple choice (one of four), multiple response (two or three of five or six), options table, build list and drag-and-drop; every item scored right or wrong, no partial credit";
const NREMT_PASSING =
  "Criterion-referenced: the passing standard comes from a standard-setting study in which a psychometrician leads a national panel of EMS subject-matter experts, approved by the National Registry Board of Directors and applied to every candidate. The computer-adaptive exam ends when it can decide pass or fail with 95% confidence, or at the item or time limit.";

// ---------------------------------------------------------------------------
// EMT -- EMT Examination Specifications (2023 BLS Practice Analysis), live
// 2025-04-07. Computer adaptive, 2 hours, 70-120 items incl. 10 unscored
// pilot items. Ranges 15-19 / 39-43 / 5-9 / 20-24 / 10-14; midpoints
// 17 / 41 / 7 / 22 / 12 (sum 99).
// ---------------------------------------------------------------------------
export const NREMT_EMT_TRACK: SeedTrack = {
  code: "NREMTEMT",
  title: "NREMT EMT Coach",
  description:
    "The National Registry's EMT cognitive exam, built on its EMT test plan live since April 7 2025: scene size-up and safety, primary and secondary assessment, patient treatment and transport, and operations, weighted as the exam weights them, with pediatric care throughout.",
  trackType: "certification",
  subcategorySlug: "emergency-medical-services",
  freshnessModel: "certification_aligned",
  sourceUrl: EMT_PLAN_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: EMS_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    ...NREMT_PROVIDER,
    credentialSlug: "nremt-emt",
    credentialName: "National EMT Certification (NREMT)",
    credentialUrl: BLS_EXAMS_URL,
    basis: "vendor_exam_unpublished_code",
    examRevision: "EMT Examination Specifications (2023 Basic Level Support Practice Analysis), live 2025-04-07",
    objectivesRevision: "EMT Test Plan, 2023 BLS Practice Analysis",
    status: "active",
    effectiveDate: "2025-04-07",
    officialObjectivesUrl: EMT_PLAN_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "A state-approved EMT course that meets or exceeds the National EMS Education Standards, completed within the past two years, plus a state-approved BLS skills competency (NREMT's EMT pathway page). Psychomotor testing for EMTs is set by each state.",
    durationMinutes: 120,
    questionFormat: `Computer adaptive, 70-120 items in 2 hours, including 10 unscored pilot items; at a Pearson VUE centre or online (OnVUE). Item types: ${BLS_ITEM_TYPES}.`,
    passingScorePolicy: NREMT_PASSING,
    publishedWeightsNote:
      "NREMT publishes each domain as a range (15-19, 39-43, 5-9, 20-24, 10-14%) with no planning midpoints. The weights are the midpoints of those ranges, which sum to 99; kept as derived rather than adjusted to 100.",
  },
  units: [
    {
      title: "Scene Size-up and Safety",
      rangeLabel: "15-19% of the exam",
      weight: 17,
      gate: "Arriving at a fictional scene, plan from the dispatch information, name the hazards and the protection they call for, count the patients, call for the right resources early, and sort patients when they outnumber rescuers.",
      objectives: [
        "Plan the response from dispatch information before arrival: likely hazards, equipment and resources",
        "Recognise scene hazards -- traffic, fire, electricity, hazardous materials, violence, unstable structures -- and decide whether the scene is safe to enter",
        "Select personal protective equipment for the known and likely exposures on a call",
        "Apply standard precautions and decide when airborne, droplet or contact precautions are also needed",
        "Determine the number of patients and the mechanism of injury or nature of illness from the scene",
        "Decide which additional resources to request early -- ALS, fire, law enforcement, hazmat, air medical -- and justify the request",
        "Triage multiple patients with a mass-casualty triage system such as SALT or START, giving life-saving interventions first",
        "Apply the national field triage guideline to choose a destination for an injured patient",
        "Recognise a hazardous-materials incident, keep a safe distance, and wait for trained responders to make the scene safe",
        "Protect the patient, bystanders and crew at a traffic incident",
        "Recognise a crime scene and preserve evidence while giving care",
        "Recognise warning signs of violence from a patient or bystander and withdraw when the scene becomes unsafe",
      ],
    },
    {
      title: "Primary Assessment",
      rangeLabel: "39-43% of the exam",
      weight: 41,
      gate: "Given a fictional adult, child or infant, form a general impression, assess consciousness, airway, breathing and circulation, find the life threats and the chief complaint, and decide on rapid treatment, rapid transport or more resources.",
      objectives: [
        "Form a general impression and decide whether the patient looks sick or not sick",
        "Communicate with the patient and bystanders to build rapport and gather the chief complaint",
        "Assess level of consciousness with AVPU and the Glasgow Coma Scale",
        "Assess and open the airway with head tilt-chin lift or jaw thrust, choosing jaw thrust when spinal injury is suspected",
        "Recognise inadequate breathing from rate, depth, effort, sounds and skin colour, and decide when to ventilate with a bag-valve mask",
        "Assess circulation: pulse, skin colour, temperature and moisture, capillary refill in children, and major bleeding",
        "Recognise cardiac arrest and begin high-quality CPR with early AED use",
        "Recognise suspected opioid overdose and support ventilation before giving naloxone",
        "Recognise shock from its early signs -- rising pulse, delayed capillary refill, anxiety, cool clammy skin -- before blood pressure falls",
        "Identify the chief complaint and immediate life threats, and decide on rapid treatment, rapid transport or more resources",
        "Obtain baseline vital signs, pulse oximetry and blood glucose, and interpret them for the patient's age",
        "Recognise a possible acute coronary syndrome, including atypical presentations, and decide on aspirin, 12-lead acquisition and destination within EMT scope",
        "Recognise a possible stroke with a validated prehospital stroke scale, fix the last-known-well time, and choose a stroke-capable destination",
        "Recognise respiratory distress versus respiratory failure in infants and children using the pediatric assessment triangle",
        "Recognise anaphylaxis and tell it apart from a mild allergic reaction by airway, breathing and circulation findings",
        "Assess an injured patient with life-threatening bleeding controlled first, then airway, breathing and circulation",
        "Recognise altered mental status and check the causes an EMT can find: hypoxia, hypoglycemia, overdose, stroke and head injury",
      ],
    },
    {
      title: "Secondary Assessment",
      rangeLabel: "5-9% of the exam",
      weight: 7,
      gate: "After the primary assessment, take a focused history and physical exam that fits the complaint, then reassess, compare with the baseline and change the plan when the patient changes.",
      objectives: [
        "Take a focused history with SAMPLE and OPQRST",
        "Perform a rapid full-body trauma assessment for deformities, contusions, abrasions, punctures, burns, tenderness, lacerations and swelling",
        "Perform a focused medical exam guided by the chief complaint",
        "Reassess at intervals matched to the patient's stability, compare with the baseline, and change treatment when findings change",
        "Recognise hypoglycemia on reassessment of a patient with altered mental status and treat it within EMT scope",
        "Recognise history findings that change urgency or destination, such as anticoagulant use after a fall or pregnancy after an injury",
      ],
    },
    {
      title: "Patient Treatment and Transport",
      rangeLabel: "20-24% of the exam",
      weight: 22,
      gate: "Treat the fictional patient within EMT scope -- airway, breathing, circulation, motion restriction, medications, special populations -- choose the destination and mode of transport, and hand over clearly.",
      objectives: [
        "Choose an oxygen delivery device and titrate oxygen to the patient's saturation and condition",
        "Ventilate with a bag-valve mask at the right rate and volume, using correctly sized oral or nasal airways",
        "Apply CPAP for a patient in respiratory distress who meets the criteria and has no contraindication",
        "Control life-threatening external bleeding with direct pressure, a tourniquet or wound packing",
        "Manage shock: position, keep warm, give oxygen if needed and transport rapidly",
        "Apply spinal motion restriction selectively, based on assessment findings rather than mechanism alone",
        "Splint suspected fractures and dislocations, checking distal pulse, motor function and sensation before and after",
        "Administer or assist with medications within EMT scope -- oxygen, oral glucose, aspirin, epinephrine auto-injector, naloxone, inhaled bronchodilator, the patient's own nitroglycerin -- checking the rights of medication administration",
        "Treat anaphylaxis with intramuscular epinephrine at the weight-appropriate dose and reassess for a repeat dose",
        "Assist an uncomplicated delivery and care for the newborn, and recognise complicated deliveries that need rapid transport",
        "Manage environmental emergencies: active cooling for heat stroke, rewarming for hypothermia, and resuscitation after drowning",
        "Choose the transport destination -- trauma, stroke, STEMI or pediatric-capable centre -- and decide when lights and siren are justified",
        "Communicate a concise, organised handoff report to the receiving clinician",
      ],
    },
    {
      title: "Operations",
      rangeLabel: "10-14% of the exam",
      weight: 12,
      gate: "Keep the ambulance and its equipment, medications and supplies ready, document care so another clinician could follow it, handle refusals and consent lawfully, and look after your own and your crew's well-being.",
      objectives: [
        "Check that equipment works and is ready before each shift and after each call",
        "Keep medication and supply inventory sufficient and in date",
        "Write a complete, accurate and objective patient care report narrative",
        "Assess decision-making capacity when a patient refuses care, explain the risks, involve medical direction and document the refusal",
        "Apply consent, confidentiality and the duty to act, and avoid abandonment and negligence",
        "Recognise and report suspected abuse or neglect of a child or older adult as the law requires",
        "Protect responder well-being: stress, fatigue, critical incident exposure, and when to seek help",
        "Report and follow up an occupational exposure to blood or body fluids",
        "Lift and move patients safely using good body mechanics and the right device",
        "Drive an ambulance with due regard and use lights and siren only when the patient's condition justifies it",
        "Work with medical direction: online and offline control, standing orders and protocols",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// EMR -- EMR Examination Specifications (2023 BLS Practice Analysis), live
// 2025-04-07. Computer adaptive, 1 h 45 min, 90-110 items incl. 30 unscored
// pilot items. Ranges 19-23 / 37-41 / 4-8 / 20-24 / 10-14; midpoints
// 21 / 39 / 6 / 22 / 12 (sum 100, so no weights note).
// ---------------------------------------------------------------------------
export const NREMT_EMR_TRACK: SeedTrack = {
  code: "NREMTEMR",
  title: "NREMT Emergency Medical Responder Coach",
  description:
    "The National Registry's Emergency Medical Responder cognitive exam, built on its EMR test plan live since April 7 2025: the same five domains as the EMT exam at EMR scope -- make the scene safe, find and treat immediate life threats, and hand over to the transporting crew.",
  trackType: "certification",
  subcategorySlug: "emergency-medical-services",
  freshnessModel: "certification_aligned",
  sourceUrl: EMR_PLAN_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: EMS_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    ...NREMT_PROVIDER,
    credentialSlug: "nremt-emr",
    credentialName: "National EMR Certification (NREMT)",
    credentialUrl: BLS_EXAMS_URL,
    basis: "vendor_exam_unpublished_code",
    examRevision: "EMR Examination Specifications (2023 Basic Level Support Practice Analysis), live 2025-04-07",
    objectivesRevision: "EMR Test Plan, 2023 BLS Practice Analysis",
    status: "active",
    effectiveDate: "2025-04-07",
    officialObjectivesUrl: EMR_PLAN_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "A state-approved Emergency Medical Responder course. Psychomotor testing for EMRs is set by each state and did not change with the 2025 exam (NREMT's EMR and EMT examinations page).",
    durationMinutes: 105,
    questionFormat: `Computer adaptive, 90-110 items in 1 hour 45 minutes, including 30 unscored pilot items; at a Pearson VUE centre or online (OnVUE). Item types: ${BLS_ITEM_TYPES}.`,
    passingScorePolicy: NREMT_PASSING,
  },
  units: [
    {
      title: "Scene Size-up and Safety",
      rangeLabel: "19-23% of the exam",
      weight: 21,
      gate: "As the first responder at a fictional scene, decide whether it is safe, protect yourself and others, count the patients, call for transport and other help early, and sort patients when there are more than you can treat.",
      objectives: [
        "Plan the response from dispatch information and decide what to bring and whom to call",
        "Recognise scene hazards and decide whether to enter, wait or withdraw",
        "Select personal protective equipment and apply standard precautions",
        "Determine the number of patients and the mechanism of injury or nature of illness",
        "Decide which resources to request early -- a transporting ambulance, ALS, fire, law enforcement, hazmat -- and say why",
        "Triage multiple patients with a mass-casualty triage system as the first responder on scene",
        "Recognise an electrical or hazardous-materials hazard and keep yourself and bystanders out of danger until trained responders arrive",
        "Protect the patient and bystanders at a traffic incident",
        "Recognise a crime scene and preserve evidence while giving care",
      ],
    },
    {
      title: "Primary Assessment",
      rangeLabel: "37-41% of the exam",
      weight: 39,
      gate: "Given a fictional adult, child or infant, find and treat the immediate life threats within EMR scope -- airway, breathing, circulation, cardiac arrest, choking, overdose -- and decide how urgently the arriving crew must transport.",
      objectives: [
        "Form a general impression and decide whether the patient looks sick or not sick",
        "Assess responsiveness with AVPU",
        "Open the airway with head tilt-chin lift or jaw thrust and insert an oral airway in an unresponsive patient with no gag reflex",
        "Recognise inadequate breathing and ventilate with a bag-valve mask or barrier device",
        "Recognise cardiac arrest and perform high-quality CPR with an AED",
        "Relieve a severe foreign-body airway obstruction in an adult, child or infant",
        "Recognise suspected opioid overdose, ventilate, and give naloxone within EMR scope",
        "Assess circulation: pulse, skin signs and major bleeding",
        "Recognise the early signs of shock",
        "Identify life threats and decide when the patient needs rapid transport by the arriving EMS crew",
        "Measure baseline vital signs -- pulse, respirations and manual blood pressure -- and recognise abnormal values for age",
        "Recognise the signs of stroke with a prehospital stroke scale and note when the patient was last known well",
        "Recognise respiratory distress in infants and children",
      ],
    },
    {
      title: "Secondary Assessment",
      rangeLabel: "4-8% of the exam",
      weight: 6,
      gate: "Take a focused history and a head-to-toe exam, reassess, and notice what the history means for the patient's urgency and destination.",
      objectives: [
        "Take a focused history with SAMPLE and OPQRST",
        "Perform a head-to-toe secondary assessment of an injured patient",
        "Reassess vital signs and mental status and report changes to the arriving crew",
        "Recognise when an older adult's fall needs trauma-centre evaluation, such as a head strike while taking an anticoagulant",
        "Recognise heat stroke from altered mental status and hot skin, and begin active cooling",
        "Recognise a likely diabetic emergency from the history and findings, and report it to the transporting crew",
      ],
    },
    {
      title: "Patient Treatment and Transport",
      rangeLabel: "20-24% of the exam",
      weight: 22,
      gate: "Give the treatments an EMR may give -- oxygen, ventilation, bleeding control, stabilisation, emergency moves, an uncomplicated delivery -- and prepare the patient for the transporting crew.",
      objectives: [
        "Give oxygen by nasal cannula or non-rebreather mask when indicated",
        "Control life-threatening external bleeding with direct pressure, a tourniquet or wound packing",
        "Keep a patient in shock warm and positioned, and prepare for a rapid handover",
        "Apply manual spinal stabilisation and a cervical collar when indicated",
        "Stabilise a suspected fracture manually or with a splint, checking circulation, motor function and sensation",
        "Use an emergency move when the scene threatens the patient's life",
        "Assist an uncomplicated delivery and care for the newborn",
        "Use an auto-injector antidote for a chemical exposure within EMR scope",
        "Hand over care to the transporting crew with a concise report",
      ],
    },
    {
      title: "Operations",
      rangeLabel: "10-14% of the exam",
      weight: 12,
      gate: "Keep response equipment ready, give and record a clear handoff, handle consent lawfully, and look after your own well-being.",
      objectives: [
        "Check that response equipment works and is restocked",
        "Write a structured handoff report for the arriving EMS crew",
        "Apply implied consent for a patient who cannot consent, and recognise when a patient lacks the capacity to refuse",
        "Recognise and report suspected abuse or neglect as the law requires",
        "Protect responder well-being: stress, fatigue and follow-up after an exposure",
        "Lift and move patients safely using good body mechanics",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// REQ-182: the ALS exams (Paramedic, AEMT), administered from 2024-07-01 on
// the 2019 National EMS Practice Analysis and its 2021 Addendum. NREMT ended
// the separate psychomotor exam on 2024-06-30 and added a Clinical Judgment
// domain (communication, leadership, and recognize cues / analyze cues /
// define hypothesis / generate solutions / take action / evaluation). The
// four clinical domains each sample assessment, pathophysiology and
// management. The Clinical Judgment unit carries the cross-system cases that
// test the six steps; its objectives say so.
// ---------------------------------------------------------------------------
const PARAMEDIC_PLAN_URL = "https://www.nremt.org/getmedia/1f27af23-e889-4edc-8041-55d1854d66ed/Paramedic-Test-Plan_1July2024";
const AEMT_PLAN_URL = "https://www.nremt.org/getmedia/ae90d9db-c974-49e1-a43b-f1dddd4ea365/AEMT-Test-Plan_Public_final";
const EXAM_CONTENT_URL = "https://nremt.org/Handbooks/Certification-Examinations/Examinations-Content";
const ALS_ITEM_TYPES =
  "multiple choice, multiple response, build list, drag-and-drop, options box, graphical (charts, rhythm or capnography strips, images) and scenario-based sets; every item scored right or wrong, no partial credit";
const ALS_EXPERIENCE =
  "Completion of a state-approved program at the level. From July 1 2024 NREMT ended its separate ALS psychomotor exam: one certification exam now covers cognitive and psychomotor content (NREMT ALS FAQ, March 2024).";

// Paramedic: CAT, 3.5 h, 110-150 items incl. 20 unscored pilot items.
// Ranges 8-12 / 10-14 / 6-10 / 24-28 / 8-12 / 34-38; midpoints
// 10 / 12 / 8 / 26 / 10 / 36 (sum 102).
export const NREMT_PARAMEDIC_TRACK: SeedTrack = {
  code: "NREMTPARAMEDIC",
  title: "NREMT Paramedic Coach",
  description:
    "The National Registry's Paramedic certification exam, built on its test plan in force since July 1 2024: airway, cardiology and resuscitation, trauma, medical and obstetric emergencies, EMS operations, and the Clinical Judgment domain that replaced the separate skills exam, weighted as the exam weights them.",
  trackType: "certification",
  subcategorySlug: "emergency-medical-services",
  freshnessModel: "certification_aligned",
  sourceUrl: PARAMEDIC_PLAN_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: EMS_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    ...NREMT_PROVIDER,
    credentialSlug: "nremt-paramedic",
    credentialName: "National Paramedic Certification (NREMT)",
    credentialUrl: EXAM_CONTENT_URL,
    basis: "vendor_exam_unpublished_code",
    examRevision: "Paramedic Examination Specifications (2019 Practice Analysis, 2021 Addendum), from 2024-07-01",
    objectivesRevision: "Paramedic Test Plan, 1 July 2024",
    status: "active",
    effectiveDate: "2024-07-01",
    officialObjectivesUrl: PARAMEDIC_PLAN_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: ALS_EXPERIENCE,
    durationMinutes: 210,
    questionFormat: `Computer adaptive, 110-150 items in 3.5 hours, including 20 unscored pilot items, at Pearson VUE centres. Item types: ${ALS_ITEM_TYPES}.`,
    passingScorePolicy: NREMT_PASSING,
    publishedWeightsNote:
      "NREMT publishes each domain as a range (8-12, 10-14, 6-10, 24-28, 8-12, 34-38%) with no planning midpoints. The weights are the midpoints of those ranges, which sum to 102; kept as derived rather than adjusted to 100.",
  },
  units: [
    {
      title: "Airway, Respiration & Ventilation",
      rangeLabel: "8-12% of the exam",
      weight: 10,
      gate: "Given a fictional patient in respiratory distress or failure, assess oxygenation and ventilation with SpO2 and waveform capnography, choose the least invasive support that works, and escalate to an advanced airway only when it is needed.",
      objectives: [
        "Assess oxygenation and ventilation separately, using pulse oximetry and waveform capnography",
        "Interpret waveform capnography: tube placement, hypoventilation, bronchospasm and return of circulation",
        "Choose between oxygen, noninvasive ventilation, bag-valve-mask ventilation and an advanced airway, using the least invasive method that works",
        "Manage acute pulmonary edema with CPAP and nitrates, dosing nitroglycerin to blood pressure",
        "Manage severe bronchospasm with bronchodilators, steroids and magnesium, and recognise impending respiratory failure",
        "Plan for a difficult airway: preoxygenation, a backup supraglottic airway and a surgical airway as the last resort",
        "Confirm and continuously monitor an advanced airway with waveform capnography",
        "Ventilate an intubated patient at a rate and volume that avoid hyperventilation",
        "Recognise and decompress a tension pneumothorax",
        "Manage a tracheostomy emergency: obstruction, dislodgement and bleeding",
        "Assess and manage respiratory distress in infants and children, including croup and bronchiolitis",
      ],
    },
    {
      title: "Cardiology & Resuscitation",
      rangeLabel: "10-14% of the exam",
      weight: 12,
      gate: "Interpret the rhythm and 12-lead, decide whether the patient is stable, and run resuscitation and post-arrest care to current AHA guidance.",
      objectives: [
        "Interpret common rhythms on the monitor and identify STEMI on a 12-lead ECG",
        "Manage cardiac arrest with shockable and non-shockable rhythms: defibrillation, epinephrine timing and antiarrhythmics",
        "Manage symptomatic bradycardia with atropine, vasopressors and transcutaneous pacing",
        "Manage tachycardia with a pulse: decide stable or unstable, then vagal manoeuvres, adenosine, rate control or synchronized cardioversion",
        "Manage a STEMI: aspirin, nitrates within their limits, analgesia and destination for reperfusion",
        "Provide post-arrest care: oxygenation and ventilation targets, blood pressure support and a 12-lead",
        "Decide with medical direction when to terminate resuscitation, and support the family",
        "Recognise cardiogenic shock and avoid treatments that worsen it",
        "Recognise and manage pediatric cardiac arrest and bradycardia with poor perfusion",
        "Recognise acute aortic dissection and other non-coronary causes of chest pain",
      ],
    },
    {
      title: "Trauma",
      rangeLabel: "6-10% of the exam",
      weight: 8,
      gate: "Assess a fictional injured patient, control hemorrhage first, protect the brain from hypoxia and hypotension, resuscitate to the right targets and choose a trauma destination.",
      objectives: [
        "Control hemorrhage and resuscitate hemorrhagic shock to a target blood pressure, with tranexamic acid where protocol allows",
        "Manage traumatic brain injury: prevent hypoxia and hypotension and avoid hyperventilation",
        "Manage chest trauma: tension pneumothorax, open pneumothorax and flail chest",
        "Apply selective spinal motion restriction",
        "Estimate burn size and depth, and manage the airway and fluids in major burns",
        "Recognise traumatic cardiac arrest and treat its reversible causes",
        "Manage crush injury and the risks of releasing a crushed limb",
        "Assess and manage the injured pregnant patient and the injured child",
        "Apply the field triage guideline to choose a destination for an injured patient",
      ],
    },
    {
      title: "Medical/Obstetrics/Gynecology",
      rangeLabel: "24-28% of the exam",
      weight: 26,
      gate: "Assess fictional medical, obstetric and gynecologic emergencies, form a working diagnosis, and treat with paramedic-level medications at the right dose and route.",
      objectives: [
        "Manage status epilepticus with benzodiazepines by the right route, and look for its cause",
        "Manage hypoglycemia and hyperglycemic emergencies, including dextrose and glucagon dosing",
        "Manage anaphylaxis with epinephrine, fluids and adjuncts, including refractory hypotension",
        "Manage suspected stroke: time last known well, stroke scale, glucose and destination",
        "Recognise sepsis and septic shock and begin fluids early",
        "Manage opioid and other toxidromes, including naloxone titration and stimulant toxicity",
        "Manage pre-eclampsia and eclampsia with magnesium and blood-pressure control",
        "Manage childbirth, complicated deliveries and postpartum hemorrhage",
        "Resuscitate the newborn: warmth, airway, ventilation and when to start compressions",
        "Manage a behavioral emergency and severe agitation safely for patient and crew",
        "Manage pain with analgesics, choosing agents and doses safely",
        "Recognise abdominal emergencies, including ruptured ectopic pregnancy and aneurysm",
        "Manage environmental emergencies: heat stroke, hypothermia and drowning",
      ],
    },
    {
      title: "EMS Operations",
      rangeLabel: "8-12% of the exam",
      weight: 10,
      gate: "Lead a crew, communicate and document clearly, keep within legal and ethical limits, and run safe vehicle, equipment and incident operations.",
      objectives: [
        "Lead a resuscitation team: assign roles, use closed-loop communication and keep compressions continuous",
        "Write a patient care report that supports the clinical decisions made",
        "Apply consent, refusal, capacity and advance directives such as POLST in the field",
        "Recognise and report a medication error, and protect the patient",
        "Work within medical direction and protocols, and know when to call online medical control",
        "Run the first-arriving role at a mass-casualty incident within the incident command system",
        "Recognise hazardous-materials and rescue scenes, and keep the crew safe",
        "Maintain the ambulance, monitor and medications so they are ready for use",
        "Protect the crew's well-being after difficult calls",
      ],
    },
    {
      title: "Clinical Judgment",
      rangeLabel: "34-38% of the exam",
      weight: 36,
      gate: "Work through an unfolding fictional call: recognise and analyse cues, define a working hypothesis, generate and take actions, evaluate the response, and lead and communicate as the paramedic in charge.",
      objectives: [
        "Recognise cues that separate a sick patient from a stable one as a call unfolds",
        "Analyse cues to choose among competing hypotheses in an undifferentiated patient",
        "Generate and prioritise solutions, then take action and evaluate the response for an unstable tachycardia",
        "Evaluate the response to treatment and change the plan when the patient does not improve",
        "Apply the clinical judgment steps to a child in respiratory distress",
        "Apply the clinical judgment steps to altered mental status with several possible causes",
        "Communicate a structured handoff and lead the crew through a changing call",
      ],
    },
  ],
};

// AEMT: linear computer-based test, 135 items in 3 hours incl. 35 unscored
// pilot items. Ranges 9-13 / 11-15 / 7-11 / 25-29 / 6-10 / 31-35; midpoints
// 11 / 13 / 9 / 27 / 8 / 33 (sum 101). AEMT scope adds to EMT (Scope of
// Practice Model): supraglottic airways, waveform capnography, IV and IO
// access, non-medicated IV fluids, sublingual nitroglycerin, inhaled nitrous
// oxide, parenteral analgesia, and IV medications limited to analgesia,
// antiemetics, dextrose, epinephrine, glucagon and naloxone (and others the
// state defines). It does NOT include intubation, needle decompression,
// manual defibrillation, cardioversion, pacing, 12-lead interpretation or
// antiarrhythmics: the AEMT recognises those needs and calls ALS.
export const NREMT_AEMT_TRACK: SeedTrack = {
  code: "NREMTAEMT",
  title: "NREMT Advanced EMT Coach",
  description:
    "The National Registry's Advanced EMT certification exam, built on its test plan in force since July 1 2024: the same six domains as the Paramedic exam at AEMT scope -- supraglottic airways, capnography, IV and IO access and a limited set of IV medications -- including the Clinical Judgment domain.",
  trackType: "certification",
  subcategorySlug: "emergency-medical-services",
  freshnessModel: "certification_aligned",
  sourceUrl: AEMT_PLAN_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: EMS_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    ...NREMT_PROVIDER,
    credentialSlug: "nremt-aemt",
    credentialName: "National Advanced EMT Certification (NREMT)",
    credentialUrl: EXAM_CONTENT_URL,
    basis: "vendor_exam_unpublished_code",
    examRevision: "AEMT Examination Specifications (2019 Practice Analysis, 2021 Addendum), from 2024-07-01",
    objectivesRevision: "AEMT Test Plan, 1 July 2024",
    status: "active",
    effectiveDate: "2024-07-01",
    officialObjectivesUrl: AEMT_PLAN_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: ALS_EXPERIENCE,
    durationMinutes: 180,
    questionFormat: `Fixed-length linear computer-based test, 135 items in 3 hours, including 35 unscored pilot items, at Pearson VUE centres; an answer cannot be changed once submitted. Item types: ${ALS_ITEM_TYPES}.`,
    passingScorePolicy:
      "Criterion-referenced: the passing standard comes from a standard-setting study in which a psychometrician leads a national panel of EMS subject-matter experts, approved by the National Registry Board of Directors and applied to every candidate.",
    publishedWeightsNote:
      "NREMT publishes each domain as a range (9-13, 11-15, 7-11, 25-29, 6-10, 31-35%) with no planning midpoints. The weights are the midpoints of those ranges, which sum to 101; kept as derived rather than adjusted to 100.",
  },
  units: [
    {
      title: "Airway, Respiration & Ventilation",
      rangeLabel: "9-13% of the exam",
      weight: 11,
      gate: "Given a fictional patient who cannot breathe adequately, choose and escalate support within AEMT scope -- oxygen, CPAP, bag-valve mask, supraglottic airway -- and confirm it with waveform capnography.",
      objectives: [
        "Assess oxygenation and ventilation with pulse oximetry and waveform capnography",
        "Decide when a supraglottic airway is indicated, place it, and confirm it with waveform capnography",
        "Manage asthma and COPD exacerbations with nebulised bronchodilators and CPAP within AEMT scope",
        "Apply CPAP for respiratory distress and recognise when it is failing",
        "Ventilate with a bag-valve mask or through a supraglottic airway without hyperventilating",
        "Recognise a tension pneumothorax and call for paramedic decompression",
        "Assess and support infants and children in respiratory distress",
      ],
    },
    {
      title: "Cardiology & Resuscitation",
      rangeLabel: "11-15% of the exam",
      weight: 13,
      gate: "Run BLS and AEMT-level resuscitation -- AED, supraglottic airway, IV or IO epinephrine -- and manage chest pain within AEMT scope, calling paramedics for what lies beyond it.",
      objectives: [
        "Manage cardiac arrest at AEMT level: high-quality CPR, AED, supraglottic airway and IV or IO epinephrine",
        "Manage suspected acute coronary syndrome with aspirin, nitroglycerin and 12-lead acquisition within AEMT scope",
        "Recognise when a nitrate is contraindicated or risky: hypotension, a marginal blood pressure and recent phosphodiesterase-inhibitor use",
        "Recognise unstable bradycardia and tachycardia and request paramedic care for pacing or cardioversion",
        "Provide post-arrest care within AEMT scope: ventilation, oxygen and blood pressure",
        "Recognise heart failure and cardiogenic shock and avoid fluid overload",
      ],
    },
    {
      title: "Trauma",
      rangeLabel: "7-11% of the exam",
      weight: 9,
      gate: "Control bleeding, give IV fluids to the right targets, protect the injured brain, and get the patient to the right trauma centre.",
      objectives: [
        "Resuscitate hemorrhagic shock with hemorrhage control and IV fluids to a target blood pressure",
        "Protect the injured brain from hypoxia and hypotension",
        "Apply selective spinal motion restriction and splint injuries",
        "Manage burns: cool, cover, estimate size and keep the patient warm",
        "Apply the field triage guideline to choose a destination for an injured patient",
      ],
    },
    {
      title: "Medical/Obstetrics/Gynecology",
      rangeLabel: "25-29% of the exam",
      weight: 27,
      gate: "Assess fictional medical and obstetric emergencies and treat with the IV and IM medications an AEMT may give, recognising when the patient needs drugs or skills beyond AEMT scope.",
      objectives: [
        "Treat hypoglycemia in a patient who cannot swallow with IV dextrose or IM glucagon",
        "Treat anaphylaxis with IM epinephrine and IV fluids for hypotension",
        "Titrate IV naloxone to breathing in an opioid overdose",
        "Recognise a seizure that needs a benzodiazepine and support the patient within AEMT scope until paramedics arrive",
        "Recognise a stroke and choose the destination by last-known-well time and severity",
        "Give antiemetics and analgesics within AEMT scope and state protocol",
        "Recognise sepsis and start IV fluids early",
        "Assist with childbirth and manage postpartum bleeding",
        "Recognise a ruptured ectopic pregnancy and treat the shock",
        "Manage behavioral emergencies safely",
      ],
    },
    {
      title: "EMS Operations",
      rangeLabel: "6-10% of the exam",
      weight: 8,
      gate: "Communicate, document and hand over care to paramedics clearly, and work within protocol, law and safe operations.",
      objectives: [
        "Hand over care to a paramedic intercept with a structured report that includes every medication given",
        "Document IV access, fluids and medications so another clinician could repeat or continue them",
        "Apply consent, refusal and capacity in the field",
        "Maintain equipment, IV supplies and medications so they are ready and in date",
        "Work within medical direction, protocols and the limits of AEMT scope",
      ],
    },
    {
      title: "Clinical Judgment",
      rangeLabel: "31-35% of the exam",
      weight: 33,
      gate: "Work an unfolding fictional call through the clinical judgment steps -- recognise and analyse cues, define a hypothesis, generate solutions, take action, evaluate -- within AEMT scope, and know when to call paramedics.",
      objectives: [
        "Recognise cues that separate a sick patient from a stable one as a call unfolds",
        "Analyse cues to choose among competing hypotheses in a patient with altered mental status",
        "Generate solutions within AEMT scope and decide when a paramedic intercept is needed",
        "Evaluate the response to a fluid bolus or medication and change the plan",
        "Apply the clinical judgment steps to a patient with abdominal pain and signs of shock",
        "Communicate and lead a crew through a changing call",
      ],
    },
  ],
};

export const EMS_TRACKS: readonly SeedTrack[] = [NREMT_EMT_TRACK, NREMT_EMR_TRACK, NREMT_PARAMEDIC_TRACK, NREMT_AEMT_TRACK];
