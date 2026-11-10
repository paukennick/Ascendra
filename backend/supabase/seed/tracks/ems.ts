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
// Titles and descriptions (REQ-174, Nick's approval 2026-11-09, REQ-097
// pattern): NREMT's trademark page (nremt.org/about/Trademarks, read
// 2026-11-09) says its marks must not be the name or main identifier of a
// course, allows describing a product as "preparation for the National
// Registry EMT Certification Examination", and asks prep providers to say
// they are independently developed, not affiliated or endorsed, and to
// attribute the marks. So each title is "Prep for the National Registry
// <level> Exam" and each description ends with that statement. Track codes
// and objective order are unchanged, so mastery mapping does not move.
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
  title: "Prep for the National Registry EMT Exam",
  description:
    "Preparation for the National Registry EMT Certification Examination, built on the published EMT test plan in force since April 7 2025: scene size-up and safety, primary and secondary assessment, patient treatment and transport, and operations, weighted as the exam weights them, with pediatric care throughout. Independently developed exam prep; not affiliated with or endorsed by the National Registry. National Registry of Emergency Medical Technicians and NREMT are trademarks of the National Registry of Emergency Medical Technicians.",
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
  title: "Prep for the National Registry Emergency Medical Responder Exam",
  description:
    "Preparation for the National Registry Emergency Medical Responder (EMR) Certification Examination, built on the published EMR test plan in force since April 7 2025: the same five domains as the EMT exam at EMR scope -- make the scene safe, find and treat immediate life threats, and hand over to the transporting crew. Independently developed exam prep; not affiliated with or endorsed by the National Registry. National Registry of Emergency Medical Technicians and NREMT are trademarks of the National Registry of Emergency Medical Technicians.",
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

export const EMS_TRACKS: readonly SeedTrack[] = [NREMT_EMT_TRACK, NREMT_EMR_TRACK];
