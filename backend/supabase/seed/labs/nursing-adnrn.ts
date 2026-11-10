import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { CHEMM_START, DKA_CONSENSUS_2024, ISMP_HIGH_ALERT, NCSBN_ANA_DELEGATION, NCSBN_RN_2026, NICHD_FHR, SCIRE_AD, SSC_ADULT_2026 } from "./nursing-sources";

// REQ-148: Associate Degree Nursing (RN) program course.
//
// A program curriculum whose outcome is the NCLEX-RN, so the labs are aligned
// to the NCSBN 2026 RN Test Plan and the Clinical Judgment Measurement Model
// (recognize cues, analyze cues, prioritize hypotheses, generate solutions,
// take action, evaluate outcomes). Unit weights are Ascendra's own judgment
// (seed/tracks/nursing.ts). Density ("hybrid"): 2 per unit = 12 (8 case,
// 4 build). The scenarios do not repeat the NCLEX-RN pilot set.
//
// RN scope: assessment, nursing judgment, delegation with retained
// accountability (NCSBN/ANA 2019), escalation to the provider, and care
// "per order / per protocol" where facilities differ.
//
// Values quoted come from nursing-sources.ts, read 2026-11-07:
//   - Sepsis: Surviving Sepsis Campaign adult guidelines 2026, which kept
//     the 2021 values (antimicrobials ideally within 1 hour; at least 30 mL/kg crystalloid in 3 hours for hypoperfusion, a
//     suggestion; MAP 65 mm Hg; lactate).
//   - DKA: the 2024 hyperglycemic crises consensus -- insulin postponed until
//     potassium is above 3.5 mmol/L (the CCRN Adult dka-case agrees since
//     2026-11-09).
//   - Fetal heart rate: NICHD definitions (baseline 110-160 bpm, moderate
//     variability 6-25 bpm, Category III).
//   - START triage (CHEMM, HHS): walking, breathing, respiratory rate over 30,
//     radial pulse, obeys commands.
//   - Autonomic dysreflexia: SCIRE's evidence summary of the Consortium for
//     Spinal Cord Medicine/PVA guidance (injury at T6 or above; overfull
//     bladder or bowel the commonest trigger; sit upright, loosen clothing,
//     recheck blood pressure every few minutes, find and remove the cause).
// The stroke lab deliberately quotes no blood-pressure limit; the rubric asks
// for "the limit the protocol sets". The 2026 AHA/ASA thresholds (below
// 185/110 mm Hg before IV thrombolysis) have since been read and are recorded
// in value-sources.ts (AIS_2026, checked 2026-11-08).
// Calculations use fictional drugs with every number given. All
// needs_expert_review (docs/labs.md).

export const ADNRN_LABS: SeedLabSet = {
  trackCode: "ADNRN",
  sources: [NCSBN_RN_2026, NCSBN_ANA_DELEGATION, SSC_ADULT_2026, DKA_CONSENSUS_2024, NICHD_FHR, CHEMM_START, ISMP_HIGH_ALERT, SCIRE_AD],
  labs: [
    // ---- Professional nursing foundations (2) ----
    {
      slug: "adn-five-rights-delegation",
      objective: "Delegation and supervision: the five rights applied",
      kind: "build",
      title: "A morning with an LPN and an AP",
      brief:
        "You are the RN on a fictional medical-surgical unit with an LPN and an assistive personnel (AP). Your state allows LPNs to give oral, subcutaneous and IM medications and do sterile dressing changes, but not IV push medications or initial assessments. Tasks this morning: (a) admit a client arriving from the emergency department with a GI bleed; (b) give a stable client's scheduled subcutaneous enoxaparin; (c) ambulate a stable client 2 days after knee replacement who has walked twice already without problems; (d) teach a client newly started on insulin how to self-inject; (e) change a stable client's sterile abdominal dressing; (f) collect a stable client's 24-hour urine; (g) give IV push furosemide to a client with heart failure.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Delegate or assign each task and explain how you apply the five rights.",
          parts: [
            part(
              "To the AP",
              "Gives the AP routine tasks on stable clients within AP training: ambulating the stable post-op client (c) and the 24-hour urine collection (f).",
              "AP: walk the stable knee-replacement client, and keep the 24-hour urine collection going."
            ),
            part(
              "To the LPN",
              "Gives the LPN stable, predictable tasks within LPN scope here: the subcutaneous enoxaparin (b) and the sterile dressing change (e).",
              "LPN: the subcutaneous enoxaparin and the sterile dressing change on the stable client."
            ),
            part(
              "Kept by the RN",
              "Keeps the admission/initial assessment of the GI-bleed client (a), the initial insulin teaching (d) and the IV push furosemide (g), because they require RN assessment, judgment or scope.",
              "Me: the GI-bleed admission (unstable, needs RN assessment), the first insulin teaching, and the IV push furosemide."
            ),
            part(
              "Five rights",
              "Applies the five rights explicitly: right task, right circumstance (stable clients), right person (competence checked), right directions and communication (specific, two-way, what to report and when) and right supervision and evaluation (follow-up), noting the RN keeps accountability and cannot delegate nursing judgment.",
              "Right task and circumstance: routine tasks on stable clients only. Right person: I confirm each has done it before. Right directions: 'Walk Mr. Lee to the end of the hall with his walker; stop and call me if he's dizzy, short of breath or his pain is above 5.' Right supervision: I check back after each task. I stay accountable, and judgment stays with me."
            ),
          ],
        },
      ],
    },
    {
      slug: "adn-error-disclosure-just-culture",
      objective: "Patient safety, error disclosure and just culture",
      kind: "case",
      title: "The dose was ten times too high",
      brief:
        "You are an RN on a fictional medical unit. At 10:00 you gave a client a fictional oral sedative, 'Medication V'. Ordered: 0.5 mg. At 10:40, documenting, you realise you gave 5 mg: the unit stocks 0.5 mg and 5 mg tablets in similar packaging in adjacent bins, and you did not scan the barcode because the scanner was broken.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The client is drowsy but rousable; respiratory rate 12 /min, SpO2 94% on room air.",
          ask: "What do you do first?",
          parts: [
            part(
              "Client safety first",
              "Assesses the client immediately and monitors closely (level of consciousness, respiratory rate and depth, SpO2, vital signs), stays or arranges close observation, notifies the provider at once for orders (including any reversal agent per order), and calls for rapid response if breathing worsens.",
              "Go to the client now: level of consciousness, breathing rate and depth, SpO2, vital signs. Tell the provider immediately for orders, keep the client under close observation, and call rapid response if breathing slows further."
            ),
            part(
              "Report",
              "Tells the charge nurse and completes the facility's event report promptly, describing facts without blame.",
              "Tell the charge nurse and file an event report today -- the facts, the times, the drug, the dose, and the broken scanner and look-alike bins."
            ),
          ],
        },
        {
          text: "The client recovers fully by 15:00. The provider and charge nurse plan to talk with the client and family.",
          ask: "How should the disclosure go?",
          parts: [
            part(
              "Disclosure",
              "Supports honest, timely disclosure per facility policy: what happened, the effects and what was done, an apology, and what will be done to prevent it, in plain language, without speculation or blame.",
              "Per our policy, with the provider: tell the client plainly that they were given more of the sedative than ordered, how it affected them and what we did, say we're sorry, and explain the steps being taken so it doesn't happen again."
            ),
          ],
        },
        {
          text: "The nurse manager reviews the event using a just culture approach.",
          ask: "How would a just culture classify this, and what should change?",
          parts: [
            part(
              "Classification",
              "Classifies the behaviour as at-risk behaviour (drifting from the barcode-scanning safeguard when it was unavailable) within a flawed system (look-alike packaging stored side by side, broken scanner), not reckless behaviour, so the response is coaching plus system fixes rather than punishment.",
              "Picking the wrong tablet was a human error made more likely by the system; giving it without a scan was at-risk behaviour (a workaround that felt safe), not reckless. Just culture says: coach the nurse and fix the system, don't punish."
            ),
            part(
              "System fixes",
              "Names strong, system-level fixes over education alone, such as separating or differentiating look-alike stock, a reliable scanner process or a second check when scanning is down, and reporting look-alike packaging.",
              "Separate the two strengths into different bins with clear labels or stock only one strength, fix the scanners and require a second nurse to check when scanning is down, and report the look-alike packaging to pharmacy and the manufacturer."
            ),
          ],
        },
      ],
    },
    // ---- Health assessment and the sciences underneath practice (2) ----
    {
      slug: "adn-three-blood-gases",
      objective: "Acid-base interpretation from a blood gas",
      kind: "build",
      title: "Interpret three blood gases",
      brief:
        "Use these reference ranges: pH 7.35-7.45, PaCO2 35-45 mm Hg, HCO3- 22-26 mEq/L. Three fictional clients: (A) a client anxious and breathing fast after a panic episode: pH 7.51, PaCO2 29, HCO3- 24. (B) a client with type 1 diabetes and ketones: pH 7.21, PaCO2 24, HCO3- 11. (C) a client with chronic COPD, stable at home: pH 7.37, PaCO2 56, HCO3- 32.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Interpret each gas and name a nursing priority.",
          parts: [
            part(
              "Client A",
              "Interprets uncompensated (acute) respiratory alkalosis: pH high, PaCO2 low, HCO3- normal; priority is calming, slowing the breathing and finding the cause.",
              "pH 7.51 is alkalotic; PaCO2 29 is low, so it's respiratory; HCO3- is normal, so not compensated: acute respiratory alkalosis from hyperventilation. Calm the client, coach slow breathing and look for the cause."
            ),
            part(
              "Client B",
              "Interprets metabolic acidosis (pH low, HCO3- low) with partial respiratory compensation (PaCO2 low, pH still abnormal), consistent with DKA; priority is reporting and the DKA treatment per protocol.",
              "pH 7.21 is acidotic and HCO3- 11 is low, so metabolic acidosis; PaCO2 24 is low because the lungs are blowing off CO2 -- partial compensation, since the pH is still abnormal. Fits DKA: report and start the DKA protocol."
            ),
            part(
              "Client C",
              "Interprets fully compensated respiratory acidosis (pH within range on the acid side, PaCO2 high, HCO3- high) typical of chronic CO2 retention; priority is comparing with baseline and giving oxygen to the prescribed target, watching for rising CO2.",
              "pH 7.37 is normal but on the acid side; PaCO2 56 is high and HCO3- 32 is high -- compensated respiratory acidosis, usual for chronic COPD. Compare with the client's baseline and keep oxygen to the prescribed target."
            ),
          ],
        },
      ],
    },
    {
      slug: "adn-asthma-silent-chest",
      objective: "Respiratory assessment and breath sounds",
      kind: "case",
      title: "When the wheezing stops",
      brief:
        "A fictional 24-year-old with asthma is admitted from the emergency department after nebulised bronchodilators. Orders: oxygen to keep SpO2 within the prescribed target, a short-acting bronchodilator by nebuliser every 4 hours and as needed, systemic corticosteroid, and call the provider for worsening respiratory status.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "On admission: speaking in full sentences, respiratory rate 22 /min, SpO2 95% on 2 L/min, expiratory wheezes in all lung fields.",
          ask: "What does your assessment show and what do you plan?",
          parts: [
            part(
              "Assessment",
              "Describes expiratory wheezes as narrowed airways and the client as currently stable (full sentences, acceptable SpO2), and plans focused reassessment (breath sounds, work of breathing, speech, SpO2, peak flow if used) at intervals and after each treatment.",
              "Wheezes on breathing out mean narrowed airways; full sentences and SpO2 95% mean the client is stable for now. I'll reassess breath sounds, effort, speech and SpO2 regularly and after every treatment."
            ),
          ],
        },
        {
          text: "Three hours later: respiratory rate 32 /min, using neck muscles, speaking one or two words at a time, SpO2 88% on 2 L/min. You can barely hear any breath sounds or wheeze. The client is becoming drowsy.",
          ask: "What do these findings mean and what do you do?",
          parts: [
            part(
              "Interpret",
              "Recognises that diminished or absent breath sounds with increasing distress and drowsiness (a 'silent chest') mean very little air is moving and the client is tiring toward respiratory failure -- worse, not better, despite the wheeze disappearing.",
              "The wheeze has gone because almost no air is moving -- a silent chest. With rising effort, one-word speech, low SpO2 and drowsiness, the client is tiring and heading for respiratory failure."
            ),
            part(
              "Act",
              "Calls the rapid response/provider immediately, stays, sits the client upright, increases oxygen per order/protocol, gives the as-needed bronchodilator as ordered, and prepares for possible intubation (airway equipment, ABG).",
              "Call rapid response and the provider now and stay. Sit the client upright, increase oxygen per protocol, give the as-needed nebuliser as ordered, and get airway equipment and an ABG ready -- this client may need intubation."
            ),
          ],
        },
        {
          text: "After treatment by the team, the client is alert, speaking in sentences, respiratory rate 22 /min, SpO2 94%, and wheezes are heard again throughout.",
          ask: "How do you read this change?",
          parts: [
            part(
              "Evaluate",
              "Recognises that the return of wheezing with better speech, SpO2 and alertness reflects improved air movement (improvement), and continues close reassessment.",
              "Wheezes are back because air is moving again -- with better speech, oxygen and alertness, that's improvement. I keep reassessing closely."
            ),
          ],
        },
      ],
    },
    // ---- Medical-surgical nursing I (2) ----
    {
      slug: "adn-sepsis-first-hour",
      objective: "Sepsis recognition and the first hour of response",
      kind: "case",
      title: "The first hour",
      brief:
        "A fictional 68-year-old weighing 70 kg is 2 days after a bowel resection. At 06:00 vital signs were temperature 37.4 degrees C, heart rate 90, respiratory rate 18, blood pressure 124/72 mm Hg (MAP 89).",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At 10:00: temperature 39.0 degrees C, heart rate 122, respiratory rate 26, blood pressure 88/50 mm Hg (MAP 63), new confusion, cool mottled knees, abdominal pain worse than this morning.",
          ask: "What is your leading hypothesis and what do you do?",
          parts: [
            part(
              "Hypothesis",
              "Prioritises sepsis with hypoperfusion (possible septic shock), likely from an abdominal source such as an anastomotic leak, over less urgent explanations, citing fever, tachycardia, tachypnea, hypotension (MAP below 65), confusion and mottling.",
              "Sepsis with poor perfusion, maybe septic shock, likely from the abdomen (an anastomotic leak): fever, fast pulse and breathing, MAP 63, new confusion and mottled skin."
            ),
            part(
              "Escalate",
              "Calls the rapid response/provider immediately with SBAR and starts the facility's sepsis protocol.",
              "Call rapid response and the surgeon now with SBAR, and start the sepsis protocol."
            ),
          ],
        },
        {
          text: "The provider orders blood cultures, lactate, broad-spectrum IV antibiotics, and 30 mL/kg of IV crystalloid.",
          ask: "Order your actions for the first hour and calculate the fluid.",
          parts: [
            part(
              "Sequence",
              "Draws blood cultures (and lactate) before antibiotics but does not let them delay antibiotics, gives antimicrobials as soon as possible, ideally within 1 hour of recognition, and starts the fluid bolus promptly, with large-bore IV access.",
              "Get large-bore IV access; draw blood cultures and lactate first, then give the antibiotic straight away -- aim for within an hour of recognising sepsis, and never let cultures hold it up -- and start the fluid bolus at the same time."
            ),
            part(
              "Fluid volume",
              "Calculates 2,100 mL (30 mL/kg x 70 kg).",
              "30 mL/kg x 70 kg = 2,100 mL."
            ),
            part(
              "Monitor during fluids",
              "Monitors for response and for fluid overload during the bolus (blood pressure/MAP, heart rate, urine output, mental status, lung sounds and work of breathing, SpO2).",
              "Watch MAP, heart rate, urine output and mental status for improvement, and lung sounds, breathing and SpO2 for fluid overload."
            ),
          ],
        },
        {
          text: "After the full bolus, MAP is 58 mm Hg and lactate is 4.2 mmol/L. Urine output is 15 mL in the last hour.",
          ask: "What does this tell you and what do you anticipate?",
          parts: [
            part(
              "Evaluate and anticipate",
              "Recognises persistent hypotension despite fluids with high lactate and low urine output as septic shock not responding to fluid, and anticipates vasopressors to an initial MAP target of 65 mm Hg (with central or appropriate access per protocol), ICU transfer, repeat lactate, and source control (surgical review).",
              "The MAP is still below 65 after fluids, with a high lactate and little urine: septic shock not responding to fluid. Expect a vasopressor infusion to an initial MAP goal of 65, transfer to ICU, a repeat lactate and an urgent surgical review for the source."
            ),
          ],
        },
      ],
    },
    {
      slug: "adn-dka-potassium-first",
      objective: "Diabetes mellitus and the acute crises DKA and HHS",
      kind: "case",
      title: "Potassium before insulin",
      brief:
        "A fictional 19-year-old with type 1 diabetes is admitted to a step-down unit after 2 days of vomiting and missed insulin. Glucose 486 mg/dL, pH 7.14, bicarbonate 9 mmol/L, beta-hydroxybutyrate high, potassium 3.2 mmol/L (lab reference 3.5-5.0), heart rate 124, deep rapid breathing, dry mucous membranes. The unit's DKA protocol and the provider's orders include IV fluids, potassium replacement, and an insulin infusion.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Fluids have started. The insulin infusion bag has arrived from pharmacy.",
          ask: "Do you start the insulin infusion now? Explain.",
          parts: [
            part(
              "Decision",
              "Does not start insulin yet: with potassium 3.2 mmol/L (below 3.5), insulin is postponed and potassium is replaced first per protocol, with cardiac monitoring, and the provider is informed.",
              "No. Potassium is 3.2 -- below 3.5 mmol/L, the level the current consensus uses to postpone insulin. Replace potassium first as the protocol orders, put the client on a cardiac monitor, and confirm with the provider."
            ),
            part(
              "Why",
              "Explains that insulin drives potassium into cells, so starting it with a low potassium can cause dangerous hypokalemia and dysrhythmias.",
              "Insulin moves potassium into the cells; starting it now could drop the potassium further and trigger dangerous heart rhythms."
            ),
          ],
        },
        {
          text: "Two hours later potassium is 4.1 mmol/L. The insulin infusion is running per protocol. Four hours after that glucose is 240 mg/dL, but pH is 7.24 and bicarbonate 13 mmol/L.",
          ask: "What do you expect to change in the treatment, and what do you monitor?",
          parts: [
            part(
              "Anticipate",
              "Anticipates adding dextrose to the IV fluids as glucose falls (per protocol) so the insulin infusion can continue until the ketoacidosis resolves, rather than stopping insulin because glucose is lower.",
              "Glucose is coming down but the acidosis isn't fixed. Expect dextrose to be added to the fluids per protocol so insulin can keep running until the ketoacidosis clears -- not stopping the insulin because the glucose looks better."
            ),
            part(
              "Monitor",
              "Monitors glucose hourly (or per protocol), potassium and other electrolytes regularly, acid-base values and ketones, fluid balance and urine output, neurological status, and the cardiac rhythm; treats insulin as a high-alert drug with double checks per policy.",
              "Hourly glucose, potassium and electrolytes every few hours, pH/bicarbonate and ketones, intake and output, mental status and the cardiac monitor. Insulin is high-alert, so rate changes are double-checked."
            ),
          ],
        },
        {
          text: "The acidosis has resolved and the client is eating. The provider orders subcutaneous basal insulin.",
          ask: "What is the key safety step in the transition?",
          parts: [
            part(
              "Transition",
              "Gives the subcutaneous basal insulin before stopping the IV insulin infusion, overlapping them for the time the protocol sets, to prevent rebound hyperglycemia and recurrent ketoacidosis.",
              "Give the subcutaneous basal insulin first and keep the IV infusion running for the overlap time the protocol sets before stopping it, so the client doesn't slip back into DKA."
            ),
          ],
        },
      ],
    },
    // ---- Medical-surgical nursing II and complex care (2) ----
    {
      slug: "adn-stroke-alert",
      objective: "Stroke: ischemic and hemorrhagic, and time-critical response",
      kind: "case",
      title: "Stroke alert on the unit",
      brief:
        "A fictional 69-year-old with atrial fibrillation is on a medical unit after a hip fracture repair. The nurse saw the client normal at 13:10 when giving medications. At 13:55 the client's daughter calls you: her mother's words are jumbled and her right arm is weak.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You find right facial droop, right arm drift, and expressive aphasia. The client is awake.",
          ask: "What do you do in the first minutes?",
          parts: [
            part(
              "Activate and time",
              "Activates the stroke alert/rapid response immediately, records the last-known-well time as 13:10 (not 13:55), and notifies the provider.",
              "Call the stroke alert now. Last known well is 13:10, when the nurse saw her normal -- not 13:55. Notify the provider."
            ),
            part(
              "Rapid assessment",
              "Checks airway, breathing and circulation and vital signs, checks blood glucose (hypoglycemia can mimic stroke), performs a neurological assessment or stroke scale per protocol, keeps the client NPO until a swallow screen, and prepares for urgent brain imaging; gathers anticoagulant information.",
              "ABCs and vital signs, a fingerstick glucose, a stroke scale per protocol, nothing by mouth until a swallow screen, get her ready for an urgent CT, and find out when her anticoagulant was last given."
            ),
          ],
        },
        {
          text: "The CT shows no bleeding. The stroke team is considering thrombolysis. Blood pressure is 196/108 mm Hg.",
          ask: "What does the nurse need to do about the blood pressure and the decision?",
          parts: [
            part(
              "Blood pressure",
              "Recognises that blood pressure must be below the limit the thrombolysis protocol sets before and after treatment, reports the reading, and gives antihypertensives as ordered with frequent rechecks.",
              "The protocol sets a blood-pressure limit for thrombolysis and this is likely above it. Report it, give the ordered antihypertensive and recheck often until it's within the protocol's limit."
            ),
            part(
              "Information for the decision",
              "Gives the team the information that affects eligibility: last-known-well time, recent surgery, anticoagulant use and timing, glucose, and any bleeding risk.",
              "Make sure the team knows: last known well 13:10, hip surgery 2 days ago, the anticoagulant and when it was last given, and her glucose -- all affect whether thrombolysis is safe."
            ),
          ],
        },
        {
          text: "The team decides against thrombolysis because of the recent surgery, and the client is transferred for a thrombectomy evaluation. Before transfer the client becomes drowsier.",
          ask: "What do you do?",
          parts: [
            part(
              "Reassess and report",
              "Repeats the neurological assessment, compares with the baseline stroke scale, reports the decline to the stroke team immediately, protects the airway, and hands off with the times and findings.",
              "Repeat the neuro check and compare with the first one, tell the stroke team straight away, position to protect the airway, and give a handoff with the times, scores and medications."
            ),
          ],
        },
      ],
    },
    {
      slug: "adn-autonomic-dysreflexia",
      objective: "Spinal cord injury and autonomic dysreflexia",
      kind: "case",
      title: "A pounding headache at T4",
      brief:
        "A fictional 31-year-old with a complete spinal cord injury at T4 from a fall 6 months ago is admitted for a pressure injury. Baseline blood pressure is about 100/62 mm Hg. An indwelling urinary catheter is in place.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The client calls: a sudden pounding headache, flushed and sweaty above the chest, a blocked nose. Blood pressure 182/104 mm Hg, heart rate 52 /min. The client is lying flat.",
          ask: "What is happening and what do you do first?",
          parts: [
            part(
              "Recognise",
              "Recognises autonomic dysreflexia (injury at T6 or above, sudden severe hypertension from baseline, bradycardia, headache, flushing and sweating above the injury) as an emergency triggered by a noxious stimulus below the injury.",
              "Autonomic dysreflexia: an injury above T6 with a sudden jump in blood pressure from a baseline near 100/62, a slow pulse, pounding headache, and flushing and sweating above the injury -- an emergency triggered by something irritating below the injury."
            ),
            part(
              "First actions",
              "Sits the client upright and lowers the legs, loosens tight clothing and devices, monitors blood pressure every few minutes, and stays with the client while calling for help.",
              "Sit the client straight up with legs down, loosen anything tight (clothes, binder, compression stockings), check blood pressure every few minutes, and stay, calling for help."
            ),
          ],
        },
        {
          text: "You find the urinary catheter tubing kinked under the client's leg and the bag nearly empty.",
          ask: "What do you do now?",
          parts: [
            part(
              "Remove the trigger",
              "Unkinks the tubing and checks the catheter drains (an overfull bladder or bowel is the most common trigger); if it does not drain, follows protocol to irrigate or replace the catheter; if blood pressure stays high, checks the bowel per protocol and notifies the provider for antihypertensive orders.",
              "Straighten the tubing and check that urine flows -- an overfull bladder or bowel is the most common trigger. If it doesn't drain, irrigate or change the catheter per protocol. If the pressure stays high, check for a full bowel per protocol and get the provider for medication orders."
            ),
          ],
        },
        {
          text: "Urine drains 900 mL. Ten minutes later the headache is easing, blood pressure 124/76 mm Hg, heart rate 70.",
          ask: "How do you follow up?",
          parts: [
            part(
              "Evaluate and prevent",
              "Continues monitoring blood pressure for a period because it can rise again, documents the episode and trigger, notifies the provider, and prevents recurrence (catheter positioning, bladder and bowel programme, skin checks, teaching the client and family to recognise and act).",
              "Keep checking blood pressure for a while -- it can come back -- document what happened and the cause, tell the provider, and prevent it: keep tubing free, follow the bladder and bowel programme, check the skin, and review with the client what to do if it happens again."
            ),
          ],
        },
      ],
    },
    // ---- Maternal-newborn and pediatric nursing (2) ----
    {
      slug: "adn-late-decelerations",
      objective: "Fetal heart rate patterns and the response each demands",
      kind: "case",
      title: "A tracing that changes during oxytocin",
      brief:
        "A fictional 29-year-old at 40 weeks is in labour on an oxytocin infusion for augmentation. Earlier tracing: baseline 135 bpm, moderate variability, accelerations, no decelerations.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Now: contractions every 1.5 minutes lasting 90 seconds; baseline 150 bpm; minimal variability; a gradual drop in fetal heart rate that begins after the peak of each contraction and returns after it ends, with each of the last five contractions.",
          ask: "Interpret the tracing.",
          parts: [
            part(
              "Interpretation",
              "Identifies recurrent late decelerations with minimal variability and contractions that are too frequent (tachysystole), as a Category II (indeterminate) tracing suggesting reduced uteroplacental perfusion that needs prompt intervention.",
              "Recurrent late decelerations (gradual, nadir after the contraction peak) with minimal variability, and contractions coming too often -- a Category II tracing pointing to poor placental blood flow. It needs action now."
            ),
          ],
        },
        {
          text: "You are at the bedside.",
          ask: "What do you do?",
          parts: [
            part(
              "Intrauterine resuscitation",
              "Stops (or reduces per protocol) the oxytocin, repositions the client to a lateral position, gives an IV fluid bolus per order, assesses maternal vital signs (including for hypotension), and considers other measures per protocol.",
              "Stop the oxytocin, turn her onto her side, give the IV fluid bolus as ordered, and check her blood pressure and pulse. Other measures as the unit protocol directs."
            ),
            part(
              "Communicate",
              "Notifies the provider promptly with the tracing findings and actions taken and documents times.",
              "Tell the provider now: late decelerations with every contraction, minimal variability, tachysystole; oxytocin off, left side, bolus running. Document the times."
            ),
          ],
        },
        {
          text: "Twenty minutes later: variability is absent and late decelerations continue with every contraction.",
          ask: "What does this mean and what happens next?",
          parts: [
            part(
              "Category III",
              "Recognises absent variability with recurrent late decelerations as Category III (abnormal), requiring immediate provider evaluation and preparation for expedited birth if the pattern does not resolve.",
              "Absent variability with recurrent late decelerations is Category III. The provider must come now, and the team prepares for an expedited birth, likely a caesarean, if it doesn't resolve."
            ),
          ],
        },
      ],
    },
    {
      slug: "adn-pediatric-dose-and-fluids",
      objective: "Pediatric dosage, fluid and airway differences",
      kind: "build",
      title: "A toddler's dose and fluids",
      brief:
        "A fictional 2-year-old weighing 12 kg is admitted with dehydration from gastroenteritis. Every number you need is given and the drug is fictional. (1) Ordered: Medication W 90 mg IV every 8 hours; reference safe dose 20-30 mg/kg/day divided every 8 hours; available 50 mg/mL. (2) The unit calculates 24-hour maintenance fluid with the 100/50/20 method: 100 mL/kg for the first 10 kg, 50 mL/kg for the next 10 kg, 20 mL/kg for each kg above 20. (3) The child's toy is a small plastic car the parents brought.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Check the dose, work out the fluids, and name one airway safety point.",
          parts: [
            part(
              "Dose check",
              "Calculates the safe range 240-360 mg/day = 80-120 mg per dose, so 90 mg is safe; volume 1.8 mL (90 / 50).",
              "20 x 12 = 240 and 30 x 12 = 360 mg/day; / 3 = 80-120 mg per dose. 90 mg is within range. 90 / 50 = 1.8 mL."
            ),
            part(
              "Maintenance fluid",
              "Calculates 1,100 mL/day (1,000 + 100) and about 46 mL/h (1,100 / 24 = 45.8).",
              "First 10 kg: 10 x 100 = 1,000 mL; next 2 kg: 2 x 50 = 100 mL; total 1,100 mL a day = 45.8, about 46 mL/h."
            ),
            part(
              "Airway difference",
              "Names a pediatric airway difference that matters here, such as the narrow airway that obstructs easily (small objects are a choking hazard -- check the toy for small parts), a relatively large tongue, or the need to keep the child upright when vomiting.",
              "A toddler's airway is narrow and blocks easily: check the toy car for small parts that could come off, and keep the child upright or on their side when vomiting."
            ),
          ],
        },
      ],
    },
    // ---- Mental health, community and leadership (2) ----
    {
      slug: "adn-least-restrictive-restraint",
      objective: "Seclusion, restraint and the least restrictive principle",
      kind: "case",
      title: "Escalation on the inpatient psychiatric unit",
      brief:
        "On a fictional inpatient psychiatric unit, a 34-year-old client admitted with mania has been pacing and shouting in the hallway for 20 minutes, accusing staff of stealing their phone (it is locked in their belongings, per unit policy).",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Other clients are gathering and watching. The client is not threatening anyone yet.",
          ask: "What do you do?",
          parts: [
            part(
              "De-escalation",
              "Uses de-escalation first: approaches calmly with another staff member nearby, keeps a safe distance and an exit, speaks slowly and simply, acknowledges the feeling, offers choices (a quieter room, checking the phone together, an as-needed medication offered per order), and reduces stimulation by moving other clients away.",
              "Approach calmly with a colleague nearby, keep my distance and a clear exit, speak slowly: 'You're worried about your phone. Let's check it together in the office.' Offer a quiet room or the as-needed medication the client can choose to take, and move the other clients away."
            ),
          ],
        },
        {
          text: "The client throws a chair, then advances on a peer with a raised fist. Staff cannot stop the danger by other means.",
          ask: "What is now justified, and how is it done safely?",
          parts: [
            part(
              "Justification and order",
              "Explains that restraint or seclusion is used only when there is imminent danger to the client or others and less restrictive measures have failed, as an emergency measure under an order from a provider authorised by facility policy and regulation (obtained immediately), for the shortest time.",
              "Only now -- with imminent danger and de-escalation failed -- is restraint or seclusion justified, as an emergency measure with an order from an authorised provider straight away, and only for as long as the danger lasts."
            ),
            part(
              "Doing it safely",
              "Uses a trained team, explains to the client what is happening and why, uses the least restrictive method, avoids positions that restrict breathing (no prone pressure on the back or neck), and never uses it as punishment or for staff convenience.",
              "A trained team does it, telling the client what we're doing and why; use the least restrictive method; never put weight on the back or neck or hold the client face down; never as punishment."
            ),
          ],
        },
        {
          text: "The client is in a seclusion room and calmer after 25 minutes.",
          ask: "How do you monitor and end it?",
          parts: [
            part(
              "Monitor and release",
              "Monitors continuously and checks physical and psychological status, vital signs, hydration, toileting and injury at the intervals law and policy require; ends seclusion as soon as release criteria are met (not when the order expires); debriefs with the client and the team; documents behaviour, alternatives tried, monitoring and release.",
              "Watch continuously and check vital signs, injury, fluids, toileting and how the client is feeling at the intervals policy and regulation set; end it as soon as the client is calm and safe, not when the order runs out; debrief with the client and the team; and document what happened, what we tried first, the checks and the release time."
            ),
          ],
        },
      ],
    },
    {
      slug: "adn-start-triage",
      objective: "Disaster preparedness and triage",
      kind: "build",
      title: "Triage five victims with START",
      brief:
        "A fictional bus crash brings several victims to the roadside where you are the first nurse on scene, before EMS arrives. Use START adult triage (walking; breathing; respiratory rate above or below 30; radial pulse; obeys simple commands). (A) Walks over to you with a cut forearm. (B) Lying down, breathing 34 /min. (C) Lying down, breathing 20 /min, no radial pulse. (D) Lying down, breathing 18 /min, radial pulse present, cannot follow simple commands. (E) Lying down, breathing 22 /min, radial pulse present, follows commands, with an obviously deformed thigh.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Assign each victim a START category and give the reason.",
          parts: [
            part("Victim A", "Minor (green): able to walk.", "Green, minor -- they can walk."),
            part("Victim B", "Immediate (red): respiratory rate above 30.", "Red, immediate -- breathing faster than 30."),
            part("Victim C", "Immediate (red): no radial pulse (poor perfusion); control any bleeding.", "Red, immediate -- no radial pulse, so perfusion is poor; stop any major bleeding I see."),
            part("Victim D", "Immediate (red): cannot follow simple commands.", "Red, immediate -- can't follow simple commands."),
            part(
              "Victim E",
              "Delayed (yellow): breathing under 30, radial pulse present and follows commands, despite the serious-looking injury; explains that START sorts by physiology, not by how bad the injury looks.",
              "Yellow, delayed -- breathing under 30, radial pulse present, obeys commands. The thigh looks bad, but START sorts by breathing, perfusion and mental status, so others go first."
            ),
          ],
        },
      ],
    },
  ],
};
