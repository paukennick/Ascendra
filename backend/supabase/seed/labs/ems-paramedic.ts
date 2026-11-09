import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { NREMT_ALS_FAQ, NREMT_EXAM_CONTENT, NREMT_PARAMEDIC_PLAN, SCOPE_OF_PRACTICE_2019 } from "./ems-sources";

// REQ-175: NREMT Paramedic (Paramedic Examination Specifications, from
// 2024-07-01).
//
// Density (hybrid, DEFAULT_LAB_POLICY) over the six domains at their
// range-midpoint weights 10/12/8/26/10/36: 2/2/1/2/2/3 = 12 (10 case,
// 2 build). The three Clinical Judgment cases are written around the six
// steps the test plan names (recognize cues, analyze cues, define
// hypothesis, generate solutions, take action, evaluation).
//
// Doses and thresholds are the NASEMSO National Model EMS Clinical
// Guidelines v3.0 (2022) and the AHA 2025 adult ALS guideline, read
// 2026-11-09 (ems-sources.ts); which lab rests on which is in
// value-sources.ts. Local protocols vary in agents and doses; where they do,
// the brief says what the fictional agency carries. All labs are
// needs_expert_review until an EMS clinical reviewer reads them.

export const NREMTPARAMEDIC_LABS: SeedLabSet = {
  trackCode: "NREMTPARAMEDIC",
  sources: [NREMT_PARAMEDIC_PLAN, NREMT_EXAM_CONTENT, NREMT_ALS_FAQ, SCOPE_OF_PRACTICE_2019],
  labs: [
    // ---- Airway, Respiration & Ventilation (2) ----
    {
      slug: "medic-flash-pulmonary-edema",
      objective: "Manage acute pulmonary edema with CPAP and nitrates, dosing nitroglycerin to blood pressure",
      kind: "case",
      title: "Drowning on dry land at 3 a.m.",
      brief:
        "Fictional call. A 68-year-old man with heart failure woke unable to breathe. He is sitting bolt upright, speaking two words at a time, with pink frothy sputum and crackles to the apices. Pulse 118, BP 194/108, respirations 34, SpO2 84% on room air, EtCO2 32 mm Hg by nasal cannula capnography. No phosphodiesterase-inhibitor use. Your agency carries CPAP, sublingual nitroglycerin 0.4 mg tablets and IV nitroglycerin.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The 12-lead shows sinus tachycardia without ST elevation.",
          ask: "What is your working impression, and what are your first two treatments?",
          parts: [
            part(
              "Impression",
              "Identifies acute cardiogenic pulmonary edema (sympathetic crashing pattern) from the history, frothy sputum, crackles, hypoxaemia and severe hypertension.",
              "Acute cardiogenic pulmonary edema with severe hypertension."
            ),
            part(
              "CPAP",
              "Starts CPAP early for severe distress with adequate mental status, titrating oxygen to SpO2 94-98%.",
              "CPAP now, oxygen titrated to 94-98%."
            ),
            part(
              "Nitroglycerin",
              "Gives nitroglycerin at the higher sublingual dose because SBP is 160 or more (0.8 mg, repeating every 5 minutes while SBP stays above 100), or starts IV nitroglycerin titrated to blood pressure.",
              "With his SBP over 160, nitroglycerin 0.8 mg sublingual, repeated every 5 minutes as long as his SBP stays above 100 -- or an IV nitro infusion titrated to pressure."
            ),
          ],
        },
        {
          text: "Ten minutes later: SpO2 93%, respirations 26, BP 150/90, speaking short sentences.",
          ask: "Is the treatment working, and what do you change?",
          parts: [
            part(
              "Evaluate",
              "Judges that he is improving on objective measures (saturation, rate, speech, pressure) and continues CPAP and nitrate therapy, now at 0.4 mg because SBP is below 160, reassessing pressure before each dose.",
              "Yes -- better saturation, slower breathing, full sentences. Keep CPAP, drop to 0.4 mg now his SBP is under 160, and check the pressure before each dose."
            ),
          ],
        },
        {
          text: "At the hospital doors his BP is 96/60 after the last dose and he is drowsier.",
          ask: "What do you do, and what goes in your handoff?",
          parts: [
            part(
              "Respond",
              "Stops nitrates for SBP below 100, reassesses mental status and ventilation (rising EtCO2, tolerance of CPAP), and prepares to assist ventilation with BVM if mental status falls further.",
              "No more nitro below 100 systolic. Check his EtCO2 and whether he's still protecting his airway on CPAP; BVM ready if he gets sleepier."
            ),
            part(
              "Handoff",
              "Reports presentation, CPAP start and settings, every nitroglycerin dose with time and route, the vital-sign trend and the new drowsiness with hypotension.",
              "'68-year-old, flash pulmonary edema. CPAP from 03:12. Nitro 0.8 mg SL at 03:14 and 03:19, 0.4 mg at 03:25. SpO2 84 to 93, BP 194 to 150, now 96/60 and drowsier -- nitro stopped.'"
            ),
          ],
        },
      ],
    },
    {
      slug: "medic-capnography-four-waveforms",
      objective: "Interpret waveform capnography: tube placement, hypoventilation, bronchospasm and return of circulation",
      kind: "build",
      title: "Read four capnograms",
      brief:
        "Fictional patients, each with a continuous waveform capnography description.\n(1) Just intubated: no waveform at all after six breaths; you hear gurgling over the epigastrium.\n(2) Post-seizure adult breathing 6/min on nasal capnography: tall square waveforms, EtCO2 62 mm Hg.\n(3) Wheezing asthmatic on nasal capnography: a slanted 'shark-fin' upstroke, EtCO2 48 mm Hg and rising.\n(4) Intubated adult in cardiac arrest during compressions: EtCO2 has been 14 mm Hg and abruptly rises to 42 mm Hg.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each patient, give what the capnogram means and the action it calls for.",
          parts: [
            part(
              "Patient 1",
              "Recognises no exhaled CO2 after intubation as an esophageal tube (or no circulation), and removes the tube and reoxygenates with BVM.",
              "Flat line plus epigastric gurgling: the tube is in the esophagus. Pull it, ventilate with the BVM and reoxygenate."
            ),
            part(
              "Patient 2",
              "Recognises hypoventilation with CO2 retention (high EtCO2, slow rate), and supports ventilation and looks for the cause.",
              "Hypoventilation: EtCO2 62 at 6 breaths a minute. Assist ventilation with the BVM and look for why -- post-ictal, drugs given."
            ),
            part(
              "Patient 3",
              "Recognises the shark-fin waveform as obstructed exhalation (bronchospasm) and a rising EtCO2 as tiring and CO2 retention, and escalates bronchodilator therapy and prepares for ventilatory support.",
              "Shark fin is bronchospasm, and a rising EtCO2 means he's tiring. More bronchodilator, magnesium, and get ready to support his breathing."
            ),
            part(
              "Patient 4",
              "Recognises an abrupt rise in EtCO2 during CPR as a likely return of spontaneous circulation and checks rhythm and pulse at the next opportunity.",
              "A sudden jump from 14 to 42 during CPR suggests ROSC -- check rhythm and pulse at the next pause."
            ),
          ],
        },
      ],
    },

    // ---- Cardiology & Resuscitation (2) ----
    {
      slug: "medic-refractory-vf",
      objective: "Manage cardiac arrest with shockable and non-shockable rhythms: defibrillation, epinephrine timing and antiarrhythmics",
      kind: "case",
      title: "VF in the hardware store",
      brief:
        "Fictional call. A 60-year-old man collapsed at a hardware store; a bystander has done CPR for 6 minutes. You arrive with an EMT partner and an engine company of three EMTs. The monitor shows ventricular fibrillation. Your agency carries epinephrine 1 mg/10 mL, amiodarone and lidocaine.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Pads are on; the rhythm is VF.",
          ask: "What do you do first, and how do you organise the team?",
          parts: [
            part(
              "Defibrillate",
              "Defibrillates promptly, with compressions continuing while the defibrillator charges and resuming immediately after the shock, minimising pre- and post-shock pauses.",
              "Charge while compressions continue, clear, shock, and straight back on the chest."
            ),
            part(
              "Team roles",
              "Assigns roles (compressor rotation about every 2 minutes, airway, IV/IO and medications, monitor and timekeeper) and uses closed-loop communication.",
              "Two firefighters rotate on compressions every 2 minutes, one does BVM, my partner gets IO access, I run the monitor and the clock."
            ),
          ],
        },
        {
          text: "Two minutes later it is still VF. IO access is in.",
          ask: "When does epinephrine go in, and what dose?",
          parts: [
            part(
              "Epinephrine timing",
              "Shocks again, then gives epinephrine 1 mg IV/IO after initial defibrillation attempts have failed (in a shockable rhythm epinephrine follows the early shocks), repeating every 3-5 minutes.",
              "Shock again; now that the first shocks haven't worked, epinephrine 1 mg IO, then every 3 to 5 minutes."
            ),
          ],
        },
        {
          text: "After the third shock, VF persists.",
          ask: "What do you add, and what tells you circulation may have returned?",
          parts: [
            part(
              "Antiarrhythmic",
              "Gives amiodarone 300 mg IV/IO (5 mg/kg, max 300) or lidocaine 1 mg/kg for VF that persists after shocks and a vasopressor, while continuing CPR and defibrillation.",
              "Amiodarone 300 mg IO -- or lidocaine 1 mg/kg if that's what we carry -- and keep shocking every 2 minutes for VF."
            ),
            part(
              "ROSC cue",
              "Uses waveform capnography: an abrupt rise in EtCO2 during compressions may indicate ROSC, prompting a rhythm and pulse check.",
              "If his EtCO2 suddenly jumps, that's likely ROSC -- rhythm and pulse check."
            ),
          ],
        },
      ],
    },
    {
      slug: "medic-symptomatic-bradycardia",
      objective: "Manage symptomatic bradycardia with atropine, vasopressors and transcutaneous pacing",
      kind: "case",
      title: "Dizzy and grey at the bus stop",
      brief:
        "Fictional call. A 74-year-old woman is sitting at a bus stop, pale, sweaty and dizzy, and nearly fainted. Pulse 34, BP 74/40, respirations 20, SpO2 95%. The monitor shows third-degree AV block with a wide ventricular escape. She is confused about the date.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "IV access is in.",
          ask: "Is she unstable, and what is your first drug and dose?",
          parts: [
            part(
              "Instability",
              "Identifies symptomatic bradycardia with hemodynamic instability (hypotension, altered mental status, diaphoresis).",
              "Yes -- rate 34 with hypotension, confusion and sweating: unstable bradycardia."
            ),
            part(
              "Atropine",
              "Gives atropine 1 mg IV (repeatable every 3-5 minutes to 3 mg), while preparing pacing because atropine often fails in high-grade block with a wide escape.",
              "Atropine 1 mg IV, repeatable to 3 mg, and the pacing pads go on now because it may not work in third-degree block."
            ),
          ],
        },
        {
          text: "After atropine her rate is unchanged and BP is 70/38.",
          ask: "What next?",
          parts: [
            part(
              "Pacing or vasopressor",
              "Starts transcutaneous pacing with sedation or analgesia as she tolerates, confirming electrical and mechanical capture, and/or starts epinephrine (infusion or push-dose) titrated to MAP above 65.",
              "Transcutaneous pacing, rate set around 60 and output up until I get capture, confirmed by a pulse that matches; analgesia for comfort. If pacing doesn't hold her, push-dose or infusion epinephrine to a MAP over 65."
            ),
          ],
        },
        {
          text: "With pacing at full capture her BP is 102/60 and she is oriented.",
          ask: "What is your handoff?",
          parts: [
            part(
              "Handoff",
              "Reports the rhythm, presentation, atropine dose and time, pacing settings and capture, analgesia, and the response.",
              "'74-year-old, complete heart block, rate 34, BP 74/40, confused. Atropine 1 mg at 10:12, no effect. Paced from 10:16, rate 60, capture at 80 mA; fentanyl for comfort. Now BP 102/60, oriented.'"
            ),
          ],
        },
      ],
    },

    // ---- Trauma (1) ----
    {
      slug: "medic-tbi-motorcycle",
      objective: "Manage traumatic brain injury: prevent hypoxia and hypotension and avoid hyperventilation",
      kind: "case",
      title: "Helmet cracked, GCS falling",
      brief:
        "Fictional call. A 30-year-old motorcyclist hit a guardrail. His helmet is cracked. GCS is 7 (E2 V2 M3), pupils equal, snoring respirations 10/min, SpO2 86%, pulse 104, BP 106/70. The Level I trauma centre is 20 minutes away by ground.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Manual cervical stabilisation is in place.",
          ask: "What are your airway and breathing priorities, and what targets do you aim for?",
          parts: [
            part(
              "Oxygenation first",
              "Opens the airway (jaw thrust, adjunct), oxygenates and assists ventilation with the BVM to reverse hypoxia before any advanced airway; uses an advanced airway only if BVM fails to oxygenate, with continuous waveform capnography.",
              "Jaw thrust, airway adjuncts, BVM with oxygen to get his saturation up. An advanced airway only if I can't oxygenate him with the BVM, and then with continuous capnography."
            ),
            part(
              "Ventilation target",
              "Targets EtCO2 35-45 mm Hg (about 40) and avoids hyperventilation, because low CO2 constricts cerebral vessels and worsens ischaemia.",
              "EtCO2 around 40, between 35 and 45 -- no hyperventilating him."
            ),
          ],
        },
        {
          text: "En route his BP falls to 98/60.",
          ask: "What do you do about the blood pressure, and why?",
          parts: [
            part(
              "Prevent hypotension",
              "Gives isotonic fluid boluses to keep SBP at or above 110 mm Hg in an adult with head injury, and looks for another source of bleeding, because hypotension worsens brain injury.",
              "Fluid bolus to get his systolic back to 110 or more -- one episode of hypotension worsens his brain injury -- and I look for bleeding elsewhere."
            ),
          ],
        },
        {
          text: "His left pupil is now dilated and he extends both arms to pain.",
          ask: "Does anything change in ventilation, and what do you tell the trauma team?",
          parts: [
            part(
              "Herniation",
              "Recognises signs of herniation and allows modest, brief hyperventilation to an EtCO2 no lower than 30 mm Hg per protocol, while keeping oxygenation and blood pressure targets.",
              "Signs of herniation: brief, modest hyperventilation, EtCO2 not below 30, still guarding his oxygen and pressure."
            ),
            part(
              "Report",
              "Reports mechanism, GCS trend with components, pupils, lowest SpO2 and SBP, airway used, EtCO2 targets and fluids.",
              "'Motorcycle versus guardrail, GCS 7 down to 5, left pupil blown, extensor posturing. Lowest SpO2 86, lowest SBP 98 -- bolused to 112. BVM ventilation, EtCO2 targeted 40, now 32 for herniation.'"
            ),
          ],
        },
      ],
    },

    // ---- Medical/Obstetrics/Gynecology (2) ----
    {
      slug: "medic-status-epilepticus",
      objective: "Manage status epilepticus with benzodiazepines by the right route, and look for its cause",
      kind: "case",
      title: "Still seizing when you walk in",
      brief:
        "Fictional call. A 35-year-old woman with epilepsy has been seizing for 8 minutes, per her partner, without waking between seizures. She weighs about 60 kg. You have no IV yet. Your agency carries midazolam for IM, IN and IV use.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She is in generalised tonic-clonic activity; her jaw is clenched and SpO2 reads 88%.",
          ask: "What do you give, by what route, and why that route?",
          parts: [
            part(
              "Benzodiazepine",
              "Treats seizure activity over 5 minutes as status epilepticus and gives midazolam IM 10 mg (0.2 mg/kg, max 10 mg) without waiting for IV access, because IM or IN is preferred when there is no line.",
              "Status epilepticus. Midazolam 10 mg IM now -- no IV yet, and IM is preferred over chasing a line in a seizing patient."
            ),
            part(
              "Airway",
              "Supports the airway with positioning, suction and oxygen, using adjuncts and BVM as needed, without forcing anything between the teeth.",
              "Turn her on her side, suction, oxygen, nasal airway; nothing between her teeth."
            ),
          ],
        },
        {
          text: "The seizure stops 3 minutes later. She is unresponsive, breathing 10/min, SpO2 94% on oxygen.",
          ask: "What do you check next?",
          parts: [
            part(
              "Cause and monitoring",
              "Checks blood glucose (treats if under 60 mg/dL), looks for trauma, toxins, pregnancy and fever as causes, and monitors breathing closely for benzodiazepine-related respiratory depression.",
              "Glucose, a look for head injury, ask about medication changes, alcohol and pregnancy, and watch her breathing closely after the midazolam."
            ),
          ],
        },
        {
          text: "Ten minutes later she seizes again. Her partner says she also got a rectal dose of diazepam from him before you arrived.",
          ask: "Do you give another dose, and what do you weigh?",
          parts: [
            part(
              "Second dose",
              "Recognises she has now had two benzodiazepine doses, so a further dose carries high risk of airway compromise; weighs treating the recurrent seizure against that risk, prepares airway support, and consults medical direction per protocol.",
              "She's had two doses already counting her partner's. Another dose risks her airway, so I get the BVM ready and call medical control before giving more."
            ),
          ],
        },
      ],
    },
    {
      slug: "medic-eclampsia-seizure",
      objective: "Manage pre-eclampsia and eclampsia with magnesium and blood-pressure control",
      kind: "case",
      title: "Headache at 36 weeks",
      brief:
        "Fictional call. A 24-year-old woman, 36 weeks pregnant, has had a severe headache and blurred vision since this morning. BP 172/114, pulse 96, respirations 20, SpO2 98%. Her ankles and face are swollen. Your agency carries magnesium sulfate, labetalol and midazolam.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She is alert and anxious.",
          ask: "What do you suspect, and what do you do before transport?",
          parts: [
            part(
              "Impression",
              "Identifies pre-eclampsia with severe features (SBP above 160 or DBP above 110 with headache and visual change) after 20 weeks.",
              "Pre-eclampsia with severe features: BP 172/114 with headache and blurred vision at 36 weeks."
            ),
            part(
              "Actions",
              "Positions her on her left side, establishes IV access, starts seizure prophylaxis with magnesium per protocol, minimises stimulation, and notifies an obstetric-capable hospital.",
              "Left lateral, IV, magnesium for seizure prophylaxis per protocol, keep the lights and noise down, and pre-alert the obstetric unit."
            ),
          ],
        },
        {
          text: "In the ambulance she has a generalised seizure.",
          ask: "What is your first-line drug and dose?",
          parts: [
            part(
              "Magnesium",
              "Gives magnesium sulfate as first line for an eclamptic seizure (6 g IV over 5-10 minutes, or 8 g IM if no IV), using a benzodiazepine only for seizure that continues despite magnesium.",
              "Magnesium sulfate 6 g IV over 5 to 10 minutes. A benzodiazepine only if she keeps seizing after magnesium."
            ),
            part(
              "Supportive care",
              "Protects the airway, gives oxygen, keeps her on her left side, and watches for magnesium toxicity (falling respirations, loss of reflexes, hypotension).",
              "Airway, oxygen, left side, and watch her breathing and reflexes for magnesium toxicity."
            ),
          ],
        },
        {
          text: "The seizure stops. BP is now 178/116.",
          ask: "What blood-pressure goal do you aim for, and why not lower?",
          parts: [
            part(
              "BP goal",
              "Treats the severe hypertension per protocol (for example labetalol) aiming for roughly 140/90, explaining that lowering further risks uterine perfusion and the fetus while severe hypertension risks maternal stroke.",
              "Labetalol per protocol, aiming for about 140/90 -- low enough to cut her stroke risk, not so low that we starve the baby of blood flow."
            ),
          ],
        },
      ],
    },

    // ---- EMS Operations (2) ----
    {
      slug: "medic-polst-nursing-home",
      objective: "Apply consent, refusal, capacity and advance directives such as POLST in the field",
      kind: "case",
      title: "The paperwork at the bedside",
      brief:
        "Fictional call. At a nursing home, staff found an 88-year-old resident unresponsive and pulseless; they started CPR 2 minutes ago. A nurse hands you a signed POLST form from her chart marked 'Do Not Attempt Resuscitation' with 'Comfort-focused treatment'. Her son, on speakerphone, shouts, 'Do everything!'",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The form is signed by the resident's physician and by the resident, dated last year.",
          ask: "What do you do about the CPR in progress?",
          parts: [
            part(
              "Honour the order",
              "Verifies the POLST is a valid, signed, actionable medical order for this patient and, under protocol, stops resuscitation because it directs no CPR; a family member's verbal objection does not override a valid order the patient made.",
              "Check it's her form, signed and valid. It is a medical order for no CPR, so we stop. Her son's wish doesn't override her own valid order."
            ),
            part(
              "When in doubt",
              "States that if the form's validity or identity is in doubt, resuscitation continues and online medical direction is contacted.",
              "If I weren't sure the form was valid or hers, I'd keep going and call medical control."
            ),
          ],
        },
        {
          text: "Her son arrives 10 minutes later, distressed.",
          ask: "How do you speak to him, and what do you document?",
          parts: [
            part(
              "Family",
              "Explains with compassion and plain words that his mother had made this decision with her doctor, that the team followed her wishes, and offers support (chaplain, staying with her).",
              "'I'm very sorry. Your mother made this choice with her doctor, and we followed it. Would you like to sit with her? I can call the chaplain.'"
            ),
            part(
              "Documentation",
              "Documents the findings, the times CPR started and stopped, the POLST details (type, date, signatures), any medical direction contact and the conversation with family.",
              "Times of arrest found, CPR start and stop, the POLST -- DNAR, comfort-focused, signed by her and her physician, dated -- and my conversation with her son."
            ),
          ],
        },
      ],
    },
    {
      slug: "medic-medication-error-report",
      objective: "Recognise and report a medication error, and protect the patient",
      kind: "build",
      title: "The wrong concentration",
      brief:
        "Fictional event. During a call for a 40-year-old man with anaphylaxis, your partner drew up epinephrine from the 0.1 mg/mL (cardiac) syringe instead of the 1 mg/mL vial and gave 0.3 mL IM at 14:05 -- 0.03 mg instead of the intended 0.3 mg. You noticed at 14:09. The patient still has wheezing and hives, BP 96/60.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write what you do in three parts: protect the patient now, tell the people who need to know, and report the event.",
          parts: [
            part(
              "Patient first",
              "Corrects the treatment at once: gives the intended dose of 1 mg/mL epinephrine 0.3 mg IM in the anterolateral thigh, reassesses, and continues anaphylaxis care.",
              "Give the correct dose now -- 0.3 mg of 1 mg/mL epinephrine IM in the thigh -- and reassess his breathing and pressure."
            ),
            part(
              "Disclosure",
              "Tells the receiving clinician (and the patient, per agency policy) what was given, the intended dose, and the correction, factually and without blame.",
              "Tell the receiving physician: 'He got 0.03 mg IM at 14:05 by error, then the correct 0.3 mg at 14:10.' And tell the patient honestly what happened."
            ),
            part(
              "Report",
              "Documents the facts in the patient care report without speculation and files the agency's incident or safety report so the system cause (look-alike concentrations) can be fixed.",
              "Record both doses with times in the PCR as facts, and file the agency safety report noting the two concentrations stored side by side."
            ),
          ],
        },
      ],
    },

    // ---- Clinical Judgment (3) ----
    {
      slug: "medic-unstable-svt",
      objective: "Generate and prioritise solutions, then take action and evaluate the response for an unstable tachycardia",
      kind: "case",
      title: "A racing heart and a falling pressure",
      brief:
        "Fictional call. A 52-year-old woman has had palpitations for an hour. She is pale and diaphoretic and says she feels faint. Pulse 210, BP 78/50, respirations 24, SpO2 95%. The monitor shows a regular narrow-complex tachycardia. Your agency carries adenosine, diltiazem, midazolam and fentanyl.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She is answering questions slowly.",
          ask: "Recognise and analyse the cues: is she stable or unstable, and what is the rhythm?",
          parts: [
            part(
              "Cues",
              "Identifies a regular narrow-complex tachycardia (likely SVT) with instability: hypotension, signs of shock and altered mental status.",
              "Regular narrow complex at 210, likely SVT, and she's unstable: BP 78, faint, slow to answer."
            ),
          ],
        },
        {
          text: "Your partner suggests trying adenosine first because 'it's only SVT'.",
          ask: "Generate the options, choose one and say why.",
          parts: [
            part(
              "Decision",
              "Chooses synchronized cardioversion for the unstable patient (per manufacturer energy), with sedation or analgesia if she is responsive and it will not delay care; explains adenosine and vagal manoeuvres are for the stable patient.",
              "Synchronized cardioversion -- she's unstable. Quick sedation if it won't delay the shock. Adenosine and vagal manoeuvres are for a stable patient."
            ),
            part(
              "Safety",
              "Confirms the sync marker on each QRS before discharging and re-enables sync for any repeat shock.",
              "Sync is on and marking every QRS before I shock, and I check it's still on for any repeat."
            ),
          ],
        },
        {
          text: "After the shock: sinus rhythm at 96, BP 112/70, she is alert.",
          ask: "Evaluate: what do you do now?",
          parts: [
            part(
              "Evaluate and continue",
              "Reassesses vital signs and mental status, acquires a 12-lead, keeps pads on in case of recurrence, monitors for sedation effects, and transports.",
              "Repeat vitals, a 12-lead, pads stay on in case it comes back, watch her breathing after the sedation, and transport."
            ),
          ],
        },
      ],
    },
    {
      slug: "medic-croup-at-night",
      objective: "Apply the clinical judgment steps to a child in respiratory distress",
      kind: "case",
      title: "A barking cough at midnight",
      brief:
        "Fictional call. A 2-year-old boy (12 kg) has had a cold for two days and woke with a barking cough. He has stridor while sitting quietly on his mother's lap, suprasternal retractions, respirations 40, SpO2 94%, and is alert. Your agency carries nebulised epinephrine (1 mg/mL) and oral and IV dexamethasone.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He has no drooling and can swallow; no choking episode was seen.",
          ask: "What is your leading hypothesis and what else did you consider?",
          parts: [
            part(
              "Hypotheses",
              "Identifies croup (viral prodrome, barking cough, stridor) and weighs foreign body (no choking episode), epiglottitis (no drooling, can swallow) and anaphylaxis (no exposure or rash).",
              "Croup: cold, barking cough, stridor. Foreign body is less likely with no choking, epiglottitis with no drooling, anaphylaxis with no exposure or rash."
            ),
          ],
        },
        {
          text: "The stridor is present at rest.",
          ask: "What actions do you take, and how do you keep him calm?",
          parts: [
            part(
              "Treatment",
              "Gives nebulised epinephrine (5 mL of 1 mg/mL) for stridor at rest and dexamethasone 0.6 mg/kg orally (7.2 mg here, maximum 16 mg); notes humidified mist is not indicated.",
              "Nebulised epinephrine, 5 mL of 1 mg/mL, and dexamethasone 0.6 mg/kg by mouth -- about 7 mg. Mist doesn't help."
            ),
            part(
              "Keep him calm",
              "Keeps him on his mother's lap in a position of comfort, avoids distressing procedures (no IV unless needed), and lets the parent hold the mask.",
              "He stays on mum's lap, she holds the mask near his face, and I don't put an IV in unless he needs it."
            ),
          ],
        },
        {
          text: "Twenty minutes later the stridor at rest is gone and he is playing.",
          ask: "Evaluate: does he still need transport?",
          parts: [
            part(
              "Evaluate",
              "Transports to definitive care because he received inhaled epinephrine, whose effect can wear off with return of stridor; no routine lights and siren.",
              "Yes -- after inhaled epinephrine the stridor can come back as it wears off. Transport, without lights and siren."
            ),
          ],
        },
      ],
    },
    {
      slug: "medic-ams-differential",
      objective: "Apply the clinical judgment steps to altered mental status with several possible causes",
      kind: "case",
      title: "Found on the kitchen floor",
      brief:
        "Fictional call. A neighbour found a 66-year-old man on his kitchen floor, last seen normal yesterday evening. He mumbles and does not follow commands, moves all limbs, and has an empty insulin pen, several beer cans and a bruise on his forehead nearby. Pulse 100, BP 162/90, respirations 14, SpO2 95%, temperature normal, pupils equal and reactive.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Your partner says, 'He's drunk.'",
          ask: "List your hypotheses and the first tests that separate them.",
          parts: [
            part(
              "Hypotheses",
              "Keeps several hypotheses open: hypoglycemia (insulin), head injury (bruise, fall, possible anticoagulant), stroke, intoxication, and others (sepsis, overdose).",
              "Hypoglycemia from the insulin, a head bleed from the fall, stroke, alcohol, and less likely sepsis or an overdose."
            ),
            part(
              "First tests",
              "Checks blood glucose immediately, a stroke scale and GCS, looks for head injury and medications (anticoagulants), and obtains a 12-lead.",
              "Glucose now, GCS and a stroke scale, look for injuries and his medication list, and a 12-lead."
            ),
          ],
        },
        {
          text: "Glucose is 38 mg/dL. IV access is in.",
          ask: "What do you give, and how do you dose it?",
          parts: [
            part(
              "Dextrose",
              "Gives IV dextrose, preferring D10 in increments, until mental status improves or the field maximum (25 g) is reached; glucagon IM/IN only if no IV.",
              "D10 IV in increments, rechecking, up to 25 g total until he wakes up."
            ),
          ],
        },
        {
          text: "After 25 g of dextrose, glucose is 140 mg/dL, but he is still confused and now has a right-sided weakness he did not have before.",
          ask: "Evaluate: what does this mean, and what do you do?",
          parts: [
            part(
              "Re-evaluate",
              "Recognises that a persisting deficit after correcting glucose means hypoglycemia was not the whole story; re-examines for stroke or intracranial bleeding (fall with head strike), fixes last known well as yesterday evening, and chooses a destination with stroke and neurosurgical capability with early notification.",
              "Corrected sugar but still confused with new right-sided weakness: this could be a stroke or a bleed from the fall. Last known well is last evening, so a stroke centre with neurosurgery, called ahead."
            ),
            part(
              "Handoff",
              "Reports the initial findings, glucose before and after with dextrose given, the new deficit and time noticed, the head injury and last-known-well time.",
              "'66-year-old found down, last known well yesterday evening. Glucose 38, D10 25 g IV, now 140. Still confused with new right-sided weakness since 08:20. Forehead bruise.'"
            ),
          ],
        },
      ],
    },
  ],
};
