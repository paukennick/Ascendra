import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { NREMT_BLS_EXAMS, NREMT_EMT_PLAN, NREMT_EXAM_CONTENT, SCOPE_OF_PRACTICE_2019 } from "./ems-sources";

// REQ-174: NREMT EMT (EMT Examination Specifications, live 2025-04-07).
//
// Density (hybrid, DEFAULT_LAB_POLICY) over the five domains at their
// range-midpoint weights 17/41/7/22/12: 2/3/1/2/2 = 10 (8 case, 2 build).
//
// SCOPE is EMT scope from the National EMS Scope of Practice Model 2019 (with
// Change Notices 1.0 and 2.0): the EMT gives oral aspirin and oral glucose,
// an agency epinephrine auto-injector, naloxone and inhaled bronchodilators,
// assists with the patient's OWN nitroglycerin only, acquires and transmits a
// 12-lead but does not interpret it, and has no IV access, supraglottic
// airway or capnography nationally. Every rubric that reaches a decision
// outside that scope asks for ALS or medical direction instead. States vary:
// the briefs say "your protocols allow" where a state may differ.
//
// Each case is built as an unfolding call: the scene, the assessment, a
// treatment decision within scope, then a handoff or reassessment. Values
// quoted come from the guidelines in ems-sources.ts (read 2026-11-09); which
// lab rests on which is in value-sources.ts. All labs are needs_expert_review
// until an EMS clinical reviewer reads them (docs/labs.md).

export const NREMTEMT_LABS: SeedLabSet = {
  trackCode: "NREMTEMT",
  sources: [NREMT_EMT_PLAN, NREMT_EXAM_CONTENT, NREMT_BLS_EXAMS, SCOPE_OF_PRACTICE_2019],
  labs: [
    // ---- Scene Size-up and Safety (2) ----
    {
      slug: "emt-mci-minibus-rollover",
      objective: "Triage multiple patients with a mass-casualty triage system such as SALT or START, giving life-saving interventions first",
      kind: "case",
      title: "Minibus on its side, two EMTs on scene",
      brief:
        "Fictional call. You and your partner, both EMTs, are first on scene at a rural road where a minibus has rolled onto its side. Fire is 15 minutes out, the next ambulance 25. The driver has turned the engine off and there is no fuel smell or smoke. You count about nine people: several walking around the bus, some sitting on the verge, and at least two lying still. Your agency triages mass-casualty incidents with SALT (Sort, Assess, Lifesaving interventions, Treatment/Transport).",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You have parked upstream with lights on and confirmed the bus is stable on its side.",
          ask: "What do you do before touching any patient, and how do you start sorting?",
          parts: [
            part(
              "Before patient care",
              "Declares a mass-casualty incident to dispatch with the location, approximate number of patients and the resources needed (more ambulances, fire, ALS, possibly air medical), and decides who triages and who treats.",
              "Radio: 'Declaring an MCI, minibus rollover, about nine patients, at least two critical. Request four more ambulances, ALS, fire for extrication, and put air medical on standby.' I take triage; my partner treats immediate patients."
            ),
            part(
              "Global sort",
              "Uses a global sort: asks everyone who can walk to move to a named spot (assessed last), then asks those who cannot walk to wave or follow a command (assessed second), and goes first to those who are still or have an obvious life threat.",
              "'If you can walk, go to the gate by the white car.' Then 'If you can hear me, wave an arm.' The two who lie still and don't respond are assessed first, then the wavers, then the walkers."
            ),
          ],
        },
        {
          text: "First still patient: an adult man with bright red blood pumping from a deep wound on his upper arm; he is breathing 24/min and has a radial pulse. Second: a woman who is not breathing; you open her airway and she still does not breathe.",
          ask: "What life-saving interventions do you do, and how do you categorize each patient?",
          parts: [
            part(
              "The bleeding man",
              "Applies a tourniquet above the arm wound (or has a walking bystander hold direct pressure) as a quick life-saving intervention, then categorizes him immediate because he needed a life-saving intervention and has a major hemorrhage.",
              "A tourniquet 2 to 3 inches above the wound, tightened until the bleeding stops -- seconds, not minutes. He is immediate."
            ),
            part(
              "The apneic woman",
              "Opens the airway once; with no breathing after airway opening, categorizes her dead/expectant and moves on without starting CPR, explaining that in an MCI resources go to those who can be saved (SALT allows two rescue breaths first for a child).",
              "After one airway-opening attempt she still isn't breathing, so she is dead under SALT. I tag her and move on; CPR would take both of us away from savable patients."
            ),
          ],
        },
        {
          text: "The first two extra ambulances arrive. Among the patients you have triaged: the man with the arm tourniquet (immediate), a teenager breathing 34/min with chest pain after hitting a seat (immediate), a woman with a deformed wrist who walked (minimal), and an older man sitting up, alert, with a scalp cut and back pain (delayed).",
          ask: "In what order do these patients leave the scene, and what do you keep doing?",
          parts: [
            part(
              "Transport order",
              "Sends the immediate patients first (the teenager with respiratory distress after chest trauma and the man with the tourniquet), then delayed, then minimal; gives the reason (need for surgery or hospital-level care for life threats).",
              "The two immediates go first -- the teenager and the tourniquet patient -- to the trauma center. The delayed older man next, the wrist injury last."
            ),
            part(
              "Ongoing",
              "Re-triages patients who are waiting, because their condition can change, and hands triage counts and categories to the arriving command.",
              "I keep re-triaging the waiting patients and give command a count by category: two immediate, one delayed, five minimal, one dead."
            ),
          ],
        },
      ],
    },
    {
      slug: "emt-field-triage-destinations",
      objective: "Apply the national field triage guideline to choose a destination for an injured patient",
      kind: "build",
      title: "Three injured patients, three destination calls",
      brief:
        "Fictional patients, all in a region with a Level I trauma center 30 minutes away, a Level III trauma center 15 minutes away and a community hospital (not a trauma center) 5 minutes away. Use the 2021 National Guideline for the Field Triage of Injured Patients.\n(1) A 34-year-old cyclist hit by a car, alert, pulse 128, blood pressure 96/60, open deformed lower leg with bleeding controlled by a tourniquet.\n(2) A 72-year-old who tripped on a rug, hit her head, takes an anticoagulant, is alert and has normal vital signs (pulse 84, BP 148/82).\n(3) A 25-year-old driver in a crash with 14 inches of intrusion at his seat, alert, normal vital signs, complaining of a sore neck.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each patient, give the triage category (red, yellow or neither), the criterion that puts them there and the destination.",
          parts: [
            part(
              "Patient 1",
              "Red: active bleeding that needed a tourniquet, and a heart rate higher than the systolic pressure (128 > 96) at age 10-64 -- either alone is enough; goes to the highest-level trauma center available, the Level I.",
              "Red. Bleeding that needed a tourniquet is a red criterion, and his pulse of 128 is higher than his systolic pressure of 96, another red one. Level I trauma center."
            ),
            part(
              "Patient 2",
              "Yellow, by EMS judgment: anticoagulant use and a low-level fall with a significant head impact at 65 or older; preferentially to a trauma center, which need not be the highest level -- the Level III is appropriate.",
              "Yellow: an older adult on an anticoagulant who fell and struck her head. A trauma center, not necessarily Level I -- the Level III."
            ),
            part(
              "Patient 3",
              "Yellow by mechanism: intrusion over 12 inches at the occupant site is a high-risk crash; no red criteria; a trauma center, need not be the highest level.",
              "Yellow: intrusion of more than 12 inches at his seat is a high-risk crash. Level III trauma center."
            ),
          ],
        },
      ],
    },

    // ---- Primary Assessment (3) ----
    {
      slug: "emt-arrest-in-a-restroom",
      objective: "Recognize cardiac arrest and begin high-quality CPR with early AED use",
      kind: "case",
      title: "Collapsed in a gas-station restroom",
      brief:
        "Fictional call. You and an EMT partner are sent to a gas station where staff found a man in his 30s on the restroom floor. A syringe lies beside him. The scene is otherwise safe. He does not respond to voice or a firm shoulder squeeze, his lips are blue, and he makes an occasional gasp. Your ambulance carries an AED, a bag-valve mask with oxygen, oral and nasal airways, and intranasal naloxone.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You check for breathing and a carotid pulse together: occasional gasps only, and you cannot feel a pulse in 10 seconds.",
          ask: "What do you and your partner do in the first minute?",
          parts: [
            part(
              "Recognition",
              "Recognizes that occasional gasping is not normal breathing and, with no pulse found in no more than 10 seconds, treats this as cardiac arrest.",
              "Gasps are agonal breathing, not breathing. No pulse within 10 seconds: he's in cardiac arrest."
            ),
            part(
              "CPR and AED",
              "Starts compressions at once (100-120/min, at least 2 inches / 5 cm, full recoil, minimal interruptions) while the partner applies the AED as soon as it is available, with 30:2 bag-valve-mask ventilation before an advanced airway.",
              "I start compressions -- 100 to 120 a minute, at least 2 inches deep, letting the chest come all the way up. My partner gets the AED pads on straight away, then ventilates 2 breaths after every 30 compressions with the BVM and oxygen."
            ),
          ],
        },
        {
          text: "The AED advises a shock. After the shock and two more minutes of CPR it advises no shock. Your partner asks whether to give naloxone now.",
          ask: "How do you handle the shock, and what is the place of naloxone in this arrest?",
          parts: [
            part(
              "Shock",
              "Clears everyone, delivers the shock and resumes compressions immediately, keeping the pre- and post-shock pauses as short as possible, without a pulse check straight after the shock.",
              "'Clear' -- shock -- straight back on the chest. No pulse check right after the shock; the AED re-analyses after two minutes."
            ),
            part(
              "Naloxone",
              "States that CPR, defibrillation and ventilation come first and must not be delayed or interrupted for naloxone; naloxone may be given (intranasally, within protocol) as an add-on in a suspected opioid-associated arrest, but it does not replace CPR.",
              "High-quality CPR and ventilation are what matter. If we have a free pair of hands, intranasal naloxone is reasonable in a suspected opioid arrest, but it never interrupts compressions."
            ),
          ],
        },
        {
          text: "ALS arrives as the man begins to move and breathe; he now has a strong carotid pulse but breathes only 6 times a minute with snoring sounds.",
          ask: "What do you do for him now, and what do you tell the paramedic?",
          parts: [
            part(
              "Post-arrest care within scope",
              "Opens the airway (jaw thrust or head tilt-chin lift, airway adjunct), ventilates with the BVM at about 1 breath every 6 seconds with oxygen because breathing is inadequate, and stays ready to restart CPR.",
              "Jaw thrust and a nasal airway for the snoring, and I assist his breathing with the BVM -- one breath every 6 seconds -- with oxygen. Pads stay on."
            ),
            part(
              "Handoff",
              "Gives a concise handoff: found unresponsive with a syringe, agonal breathing and pulseless, CPR start time, one shock with times, naloxone if given (dose, route, time), now a pulse with inadequate breathing being assisted.",
              "'Male in his 30s, found down with a syringe, pulseless with agonal breaths. CPR from 14:02, one AED shock at 14:04, intranasal naloxone at 14:07. Pulse back at 14:09, breathing 6 a minute, I'm bagging him with oxygen.'"
            ),
          ],
        },
      ],
    },
    {
      slug: "emt-chest-pain-own-nitro",
      objective:
        "Recognize a possible acute coronary syndrome, including atypical presentations, and decide on aspirin, 12-lead acquisition and destination within EMT scope",
      kind: "case",
      title: "Indigestion that is not getting better",
      brief:
        "Fictional call. A 62-year-old woman with diabetes called because of 'indigestion' and nausea for 40 minutes, with pressure in her upper abdomen and jaw. She is pale and sweaty. Pulse 96, blood pressure 138/84, respirations 20, SpO2 97% on room air. She has nitroglycerin tablets prescribed to her, and no allergies. You are a BLS crew whose protocols allow aspirin, assisting with the patient's own nitroglycerin, and 12-lead acquisition and transmission.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She tells you she has never had indigestion feel like this before.",
          ask: "What do you suspect, and why does it matter that she is a woman with diabetes?",
          parts: [
            part(
              "Working impression",
              "Suspects acute coronary syndrome from the pressure, jaw discomfort, nausea, pallor and sweating, and treats it as such until proved otherwise.",
              "This could be a heart attack: pressure, jaw discomfort, nausea, pale and sweaty, and it's new for her."
            ),
            part(
              "Atypical presentation",
              "Notes that women, people with diabetes and older adults more often present without classic chest pain (epigastric discomfort, nausea, fatigue, shortness of breath), so 'indigestion' must not lower suspicion.",
              "Women and people with diabetes often don't have classic crushing chest pain -- 'indigestion' is a common way an MI shows up in them."
            ),
          ],
        },
        {
          text: "She has not taken aspirin today and has no bleeding history or aspirin allergy. She asks for oxygen because 'it always helps'.",
          ask: "What do you do in the next 10 minutes?",
          parts: [
            part(
              "12-lead",
              "Acquires and transmits a 12-lead ECG within 10 minutes of patient contact (acquisition only; interpretation is by the receiving physician or ALS).",
              "I get a 12-lead within 10 minutes of reaching her and transmit it to the hospital -- I don't read it myself."
            ),
            part(
              "Aspirin",
              "Gives chewable, non-enteric-coated aspirin (162-325 mg, within protocol) after checking for allergy and contraindications.",
              "Chewable aspirin, 162 to 325 mg per our protocol -- she chews it."
            ),
            part(
              "Oxygen",
              "Withholds supplemental oxygen because her SpO2 is 97% and she is not short of breath; oxygen is given only for dyspnea, hypoxemia or heart failure, to a target of 94-98%.",
              "Her saturation is 97% and she isn't short of breath, so no oxygen -- I'll start it if she drops below 94% or becomes breathless."
            ),
          ],
        },
        {
          text: "The hospital calls back: the 12-lead shows a STEMI and the cath lab is being activated. She asks whether she can take one of her nitroglycerin tablets. Repeat BP 132/80. She took sildenafil yesterday evening.",
          ask: "Do you assist with her nitroglycerin, and where does she go?",
          parts: [
            part(
              "Nitroglycerin",
              "Does not assist with nitroglycerin because she took a phosphodiesterase inhibitor (sildenafil) within the window that contraindicates nitrates, despite an adequate blood pressure; explains the risk of severe hypotension.",
              "No -- sildenafil yesterday evening means nitroglycerin could drop her blood pressure dangerously, even though it's 132 now."
            ),
            part(
              "Destination and handoff",
              "Transports to the PCI-capable hospital that activated its cath lab (or meets ALS per system), with a handoff giving symptom-onset time, 12-lead time, aspirin dose and time, and the sildenafil.",
              "Straight to the PCI center. Handoff: onset 40 minutes before our arrival, 12-lead at 10:14 showing STEMI, aspirin 324 mg at 10:16, nitro withheld for sildenafil last night."
            ),
          ],
        },
      ],
    },
    {
      slug: "emt-stroke-woke-with-symptoms",
      objective:
        "Recognize a possible stroke with a validated prehospital stroke scale, fix the last-known-well time, and choose a stroke-capable destination",
      kind: "case",
      title: "Slurred speech at the breakfast table",
      brief:
        "Fictional call at 08:30. A 70-year-old man's daughter found him at breakfast with slurred speech and a right-sided facial droop; he cannot lift his right arm. He went to bed at 22:00 apparently well, and his wife says he was up at 05:30 to use the bathroom and spoke to her normally. He takes an anticoagulant. Pulse 88 irregular, BP 186/100, respirations 18, SpO2 96% on room air. Your region has a primary stroke center 10 minutes away and a thrombectomy-capable center 35 minutes away; your protocol uses a stroke severity scale to flag possible large-vessel occlusion.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The daughter says, 'He must have had the stroke in his sleep, so it started at 10 last night.'",
          ask: "What is his last-known-well time, and what else do you check before deciding where to go?",
          parts: [
            part(
              "Last known well",
              "Sets last known well at 05:30, when he was last seen normal by his wife (not 22:00, and not 08:30 when found), and records the source of that time.",
              "Last known well is 05:30, from his wife -- he spoke normally then. Not bedtime and not when he was found."
            ),
            part(
              "Checks",
              "Checks blood glucose (hypoglycemia mimics stroke; treat only if below 60 mg/dL), performs a validated stroke scale, and notes the anticoagulant.",
              "Blood glucose to rule out hypoglycemia, a full stroke scale, and I note his anticoagulant for the hospital."
            ),
          ],
        },
        {
          text: "Glucose 132 mg/dL. His stroke severity score is positive for a possible large-vessel occlusion. His daughter asks you to bring his blood pressure down.",
          ask: "Do you treat the blood pressure or give oxygen, and which hospital do you choose?",
          parts: [
            part(
              "Blood pressure and oxygen",
              "Does not treat the hypertension in the field; withholds oxygen at 96% (target 94-98%), giving it only if saturation falls below that.",
              "We don't lower blood pressure in a suspected stroke in the field. His saturation is 96%, so no oxygen unless it drops below 94."
            ),
            part(
              "Destination",
              "With a positive LVO screen and last known well about 3 hours ago (well within the 24-hour window for thrombectomy eligibility), chooses the thrombectomy-capable center per the local stroke plan, or states the plan's rule if it says otherwise, and gives early pre-notification.",
              "Positive LVO screen and last known well 3 hours ago: the thrombectomy-capable center, per our stroke plan, with a stroke alert called ahead."
            ),
          ],
        },
        {
          text: "En route he becomes harder to rouse and vomits once.",
          ask: "What do you do, and what goes in your radio report?",
          parts: [
            part(
              "Airway",
              "Protects the airway: positions on his side or raises the head of the stretcher, suctions, reassesses mental status and vital signs, and prepares to ventilate.",
              "Turn him onto his side, suction, and keep the head of the stretcher up; reassess his level of consciousness and vitals."
            ),
            part(
              "Report",
              "Reports age, deficits, stroke scale result, last known well 05:30 with source, glucose, anticoagulant, vital signs and the new decline in consciousness and vomiting, with ETA.",
              "'70-year-old male, right facial droop and arm weakness, slurred speech, LVO screen positive. Last known well 05:30 per wife. Glucose 132. On an anticoagulant. BP 186/100. Now harder to rouse, vomited once. ETA 20 minutes.'"
            ),
          ],
        },
      ],
    },

    // ---- Secondary Assessment (1) ----
    {
      slug: "emt-hypoglycemia-reassessment",
      objective: "Recognize hypoglycemia on reassessment of a patient with altered mental status and treat it within EMT scope",
      kind: "case",
      title: "Confused at the office party",
      brief:
        "Fictional call. A 45-year-old man is confused and sweaty at a workplace party. A colleague says he 'had a few drinks' and takes insulin. He is awake, answers slowly, can swallow and holds his own airway. Pulse 104, BP 132/80, respirations 16, SpO2 98%. Your BLS protocol allows glucose checks and oral glucose.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "His colleague insists, 'He's just drunk.'",
          ask: "Why not accept that explanation, and what do you check?",
          parts: [
            part(
              "Reasoning",
              "Rejects alcohol as the explanation until other causes are excluded, because hypoglycemia (he takes insulin), head injury, hypoxia and stroke can all look like intoxication.",
              "Alcohol can hide hypoglycemia, and he's on insulin. Confused and sweaty is low blood sugar until proved otherwise."
            ),
            part(
              "Checks",
              "Checks blood glucose, looks for a head injury and other causes, and asks about the timing of his last insulin and food.",
              "Blood glucose now, a quick head check for injury, and when he last took insulin and ate."
            ),
          ],
        },
        {
          text: "Glucose is 48 mg/dL. He can still swallow on command.",
          ask: "What do you give, and how do you reassess?",
          parts: [
            part(
              "Treatment",
              "Gives oral glucose (adult 25 g) because the glucose is 60 mg/dL or less and he has a patent airway and can swallow; would not give anything by mouth if he could not.",
              "Oral glucose, 25 g, because he is below 60 and can still swallow safely."
            ),
            part(
              "Reassessment",
              "Rechecks glucose and mental status after treatment and compares with baseline; calls ALS for IV dextrose or IM/IN glucagon if he cannot swallow or does not improve.",
              "Recheck his glucose and mental status after he has had time to absorb it. If he gets worse or can't swallow, ALS for IV dextrose or glucagon."
            ),
          ],
        },
        {
          text: "Twenty minutes later he is fully alert, glucose 92 mg/dL, and wants to go home. He tells you he also takes glipizide.",
          ask: "Can he be released without transport, and why?",
          parts: [
            part(
              "Decision",
              "Recommends transport because he takes a sulfonylurea (glipizide), which can cause recurrent hypoglycemia; release without transport requires, among other things, no long-acting oral sulfonylurea.",
              "No -- glipizide can drop his sugar again for hours. He should come with us."
            ),
            part(
              "If he still refuses",
              "If he has capacity and still refuses, explains the specific risks, involves medical direction per protocol, makes sure a responsible adult stays with him and that he eats, and documents the discussion.",
              "If he still says no and has capacity: explain the risk of another low, call medical control, make sure someone stays with him and he eats, and document it all."
            ),
          ],
        },
      ],
    },

    // ---- Patient Treatment and Transport (2) ----
    {
      slug: "emt-chainsaw-thigh-bleed",
      objective: "Control life-threatening external bleeding with direct pressure, a tourniquet or wound packing",
      kind: "case",
      title: "Chainsaw kickback",
      brief:
        "Fictional call. A 52-year-old man cutting firewood has a deep wound on his front mid-thigh from a chainsaw. Blood is pooling on the ground and soaking through the towel his neighbor is holding. He is pale and anxious. Pulse 122, BP 104/70, respirations 24. The nearest trauma center is 25 minutes away.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The chainsaw is off and the scene is safe.",
          ask: "What is the first thing you do, and how?",
          parts: [
            part(
              "Priority",
              "Treats the life-threatening bleeding before airway and breathing assessment, because it is the immediate threat to life.",
              "Stop the bleeding first -- it will kill him before anything else."
            ),
            part(
              "Tourniquet",
              "Applies a commercial tourniquet on the thigh 2-3 inches above the wound (not over a joint), tightened until the bleeding stops and the distal pulse is gone, after direct pressure fails or as the first step for clearly life-threatening limb bleeding.",
              "Commercial tourniquet on bare skin 2 to 3 inches above the wound, cranked until the bleeding stops and I can't feel a pulse in his foot."
            ),
          ],
        },
        {
          text: "The bleeding slows but continues. He shouts that the tourniquet hurts and asks you to loosen it.",
          ask: "What do you do about the continued bleeding and the pain?",
          parts: [
            part(
              "Continued bleeding",
              "Tightens the first tourniquet further and, if still bleeding, places a second tourniquet directly above the first (side by side on the thigh).",
              "Tighten it more; if it still bleeds, a second tourniquet just above the first."
            ),
            part(
              "Pain",
              "Does not loosen the tourniquet; explains that the pain means it is working and requests ALS for pain management.",
              "I won't loosen it -- the pain means it's working. I'll ask ALS to meet us for pain relief."
            ),
          ],
        },
        {
          text: "Bleeding is now controlled. Pulse 128, BP 92/64, skin cool and clammy.",
          ask: "How do you manage him during transport, and what is in your handoff about the tourniquet?",
          parts: [
            part(
              "Shock care and destination",
              "Treats for shock (lies him flat, keeps him warm, oxygen if hypoxic), keeps the tourniquet visible and uncovered, reassesses for renewed bleeding at every move, and transports to the trauma center (bleeding needing a tourniquet is a red field-triage criterion).",
              "Flat, blankets, monitor for bleeding at every move, tourniquet left uncovered, rapid transport to the trauma center."
            ),
            part(
              "Handoff",
              "States the tourniquet time marked on the patient and in the report, the second tourniquet if used, and the vital-sign trend.",
              "'Tourniquet on at 15:42, second one at 15:45, both marked on his leg. Pulse up from 122 to 128, BP down from 104 to 92.'"
            ),
          ],
        },
      ],
    },
    {
      slug: "emt-peanut-anaphylaxis-child",
      objective: "Treat anaphylaxis with intramuscular epinephrine at the weight-appropriate dose and reassess for a repeat dose",
      kind: "case",
      title: "Hives and a hoarse voice at a birthday party",
      brief:
        "Fictional call. A 6-year-old girl weighing about 20 kg ate a cookie with peanuts 10 minutes ago. She has hives on her chest and face, a hoarse voice, and is breathing fast with audible wheeze. She vomited once. Her heart rate is 140, respirations 36, and capillary refill 3 seconds. Your ambulance carries agency epinephrine auto-injectors (0.15 mg and 0.3 mg), oxygen and nebulized bronchodilator.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Her mother says she has never had a reaction this bad.",
          ask: "Is this anaphylaxis, and what is the first drug, dose and site?",
          parts: [
            part(
              "Recognition",
              "Identifies anaphylaxis: skin involvement plus airway (hoarse voice), breathing (wheeze, tachypnea) and gastrointestinal (vomiting) signs after a likely allergen.",
              "Yes -- hives plus a hoarse voice, wheeze and vomiting after peanuts. That's anaphylaxis."
            ),
            part(
              "Epinephrine",
              "Gives intramuscular epinephrine first, 0.15 mg (the under-25-kg dose) into the anterolateral thigh, without delay for other drugs.",
              "Epinephrine first: the 0.15 mg auto-injector, because she's under 25 kg, into the outer thigh."
            ),
          ],
        },
        {
          text: "Five minutes later her wheeze is a little better, but her heart rate is 150, capillary refill 4 seconds and she is drowsy.",
          ask: "What do you do now?",
          parts: [
            part(
              "Repeat dose",
              "Gives a second 0.15 mg IM epinephrine because signs of hypoperfusion persist (repeat every 5-15 minutes is allowed), and gives oxygen.",
              "A second 0.15 mg dose -- she's still poorly perfused -- plus oxygen."
            ),
            part(
              "Position and support",
              "Lays her flat (or on her side if vomiting) rather than sitting her up while she is poorly perfused, requests ALS for IV fluids, and transports without delay.",
              "Lay her down, ALS for IV fluids and further epinephrine, and get moving."
            ),
          ],
        },
        {
          text: "ALS meets you en route. She is more alert, heart rate 132.",
          ask: "What is the handoff?",
          parts: [
            part(
              "Handoff",
              "Gives age and weight, allergen and time, the system findings, both epinephrine doses with times and route, the response and current vital signs.",
              "'6-year-old, about 20 kg, peanut exposure at 13:05. Hives, hoarse voice, wheeze, vomiting, poor perfusion. Epinephrine 0.15 mg IM thigh at 13:17 and 13:22. Now more alert, heart rate 132, cap refill 3 seconds.'"
            ),
          ],
        },
      ],
    },

    // ---- Operations (2) ----
    {
      slug: "emt-pcr-narrative",
      objective: "Write a complete, accurate and objective patient care report narrative",
      kind: "build",
      title: "Write the narrative for a fall call",
      brief:
        "Fictional call. 09:12 dispatched to a fall at a home; 09:20 on scene. An 81-year-old woman was found by her son on the kitchen floor, alert and oriented, saying she slipped on spilled water; she denies dizziness, chest pain or hitting her head, and says she was down 'a few minutes'. She takes a blood-pressure tablet; no anticoagulant. Pain 6/10 in the right hip; the right leg is shortened and externally rotated. Pulse 92, BP 150/88, respirations 18, SpO2 97%. Distal pulse, movement and sensation present in the right foot. You moved her with a scoop stretcher, padded the leg, and transported at 09:41 to the community hospital, arriving at 09:52. Your partner called ahead.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the patient care report narrative in three parts: what you found, what you did, and the transfer of care.",
          parts: [
            part(
              "Findings",
              "Records the chief complaint, history in the patient's own words where relevant, pertinent negatives (no dizziness, chest pain or head strike, no anticoagulant), objective findings and vital signs with times, and no opinions or abbreviations a reader could misread.",
              "81 y/o F found by son on kitchen floor. Pt states she slipped on water; denies dizziness, chest pain, LOC or striking head; down approx. 'a few minutes' per pt. Meds: antihypertensive; denies anticoagulants. A&O x4. C/O R hip pain 6/10. R leg shortened and externally rotated. Distal pulse, motor, sensation intact R foot. 09:24 P 92, BP 150/88, R 18, SpO2 97% RA."
            ),
            part(
              "Care given",
              "Records each intervention with its time and the patient's response, including a reassessment of distal pulse, movement and sensation after moving.",
              "Pt moved by scoop stretcher with R leg padded and supported in position found. Distal PMS rechecked after move: intact. 09:38 P 90, BP 146/86, pain 5/10."
            ),
            part(
              "Transfer of care",
              "Records transport times, destination, condition on arrival, to whom care was handed (role) and that a verbal report was given.",
              "Transported 09:41 to community hospital, arrived 09:52. Pt condition unchanged. Care and verbal report given to receiving RN at 09:55."
            ),
          ],
        },
      ],
    },
    {
      slug: "emt-refusal-after-crash",
      objective: "Assess decision-making capacity when a patient refuses care, explain the risks, involve medical direction and document the refusal",
      kind: "case",
      title: "\"I'm fine, I just want to go home\"",
      brief:
        "Fictional call. A 28-year-old driver was in a moderate rear-end crash. He is walking around his car, says his neck is a bit stiff, and wants to refuse care and transport. He smells of alcohol and admits to 'two beers'. Pulse 90, BP 128/78, respirations 16.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He is alert and knows the date and where he is, but repeats the same question twice and seems not to remember your answer.",
          ask: "Does he have the capacity to refuse, and how do you decide?",
          parts: [
            part(
              "Capacity",
              "Assesses capacity: alert and oriented, able to understand the situation and the risks of refusing, and not significantly impaired by illness, injury, alcohol or drugs; concludes that capacity is doubtful because of alcohol and possible head injury (repetitive questioning).",
              "He's oriented, but alcohol plus repeating himself -- maybe a head injury -- means I can't be sure he understands the risks. His capacity is in doubt."
            ),
          ],
        },
        {
          text: "He says, 'I'm leaving, you can't stop me,' and walks towards the road.",
          ask: "What do you do?",
          parts: [
            part(
              "Actions",
              "Contacts medical direction because capacity is in doubt, keeps trying to persuade him with clear explanation of the risks (neck injury, head injury), requests law enforcement if he becomes a danger, and does not put the crew at risk by restraining him without support.",
              "Call medical control now. Keep talking to him -- explain that a neck or head injury may not show yet. Ask police to attend; we won't physically wrestle him on our own."
            ),
          ],
        },
        {
          text: "Twenty minutes later he is calmer, no longer repeats himself, answers every question appropriately and explains back the risks in his own words. Medical direction agrees that he may refuse.",
          ask: "What do you do before you leave, and what do you document?",
          parts: [
            part(
              "Before leaving",
              "Explains the risks again, tells him he can call EMS back at any time, gives specific warning signs (worse neck pain, numbness, vomiting, confusion), ensures someone sober will be with him, and offers whatever care he consents to.",
              "Explain the risks again, give him the warning signs to call back for, and make sure a sober friend takes him home."
            ),
            part(
              "Documentation",
              "Documents the assessment and vital signs, the capacity findings at each point with times, the risks explained and his understanding in his own words, the medical direction contact, the refusal signature or witness, and the advice to call back.",
              "PCR: findings and vitals, why capacity was doubtful at 21:10 and present at 21:30, the risks I explained and how he explained them back, medical control's name and time, his signature with a witness, and that he was told to call back."
            ),
          ],
        },
      ],
    },
  ],
};
