import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { NREMT_AEMT_PLAN, NREMT_ALS_FAQ, NREMT_EXAM_CONTENT, SCOPE_OF_PRACTICE_2019 } from "./ems-sources";

// REQ-182: NREMT Advanced EMT (AEMT Examination Specifications, from
// 2024-07-01).
//
// Density (hybrid, DEFAULT_LAB_POLICY) over the six domains at their
// range-midpoint weights 11/13/9/27/8/33: 2/2/1/3/1/3 = 12 (11 case,
// 1 build).
//
// SCOPE is the point of this set (National EMS Scope of Practice Model 2019,
// Change Notices 1.0 and 2.0). The AEMT adds to EMT scope: supraglottic
// airways, waveform capnography, IV and IO access, non-medicated IV fluids,
// sublingual nitroglycerin, and IV medications limited to analgesia,
// antiemetics, dextrose, epinephrine, glucagon and naloxone (plus what the
// state adds). Benzodiazepines, antiarrhythmics, steroids, magnesium,
// intubation, needle decompression, pacing and cardioversion are NOT AEMT
// scope: those cases ask the learner to recognise the need and bring in a
// paramedic. Values come from ems-sources.ts (read 2026-11-09); which lab
// rests on which is in value-sources.ts. All labs are needs_expert_review.

export const NREMTAEMT_LABS: SeedLabSet = {
  trackCode: "NREMTAEMT",
  sources: [NREMT_AEMT_PLAN, NREMT_EXAM_CONTENT, NREMT_ALS_FAQ, SCOPE_OF_PRACTICE_2019],
  labs: [
    // ---- Airway, Respiration & Ventilation (2) ----
    {
      slug: "aemt-sga-after-drowning",
      objective: "Decide when a supraglottic airway is indicated, place it, and confirm it with waveform capnography",
      kind: "case",
      title: "Pulled from the lake",
      brief:
        "Fictional call. Lifeguards pulled a 22-year-old man from a lake after about 3 minutes under water. He has a weak carotid pulse at 54 but is not breathing. You and your AEMT partner carry a BVM, oxygen, oral and nasal airways, suction, supraglottic airways and waveform capnography. A paramedic unit is 15 minutes out.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He has a pulse but no breathing; water and vomit are in his mouth.",
          ask: "What do you do first?",
          parts: [
            part(
              "Airway and ventilation",
              "Suctions the airway, opens it, inserts an adjunct and ventilates with BVM and oxygen at about 1 breath every 6 seconds (respiratory arrest with a pulse), starting CPR if the pulse is lost.",
              "Suction, open the airway, an oral airway, and BVM ventilation with oxygen -- one breath every 6 seconds -- ready to start CPR if his pulse goes."
            ),
          ],
        },
        {
          text: "Despite two-person BVM with an oral airway, his chest barely rises and SpO2 stays at 80%; he keeps regurgitating.",
          ask: "Is a supraglottic airway indicated now, and how do you confirm it?",
          parts: [
            part(
              "Indication",
              "Places a supraglottic airway because BVM ventilation is failing to oxygenate despite optimized technique, and the patient has no gag reflex.",
              "Yes -- two-person BVM isn't oxygenating him and he has no gag. A supraglottic airway."
            ),
            part(
              "Confirmation",
              "Confirms with continuous waveform capnography (a sustained, consistent waveform), chest rise and breath sounds, and keeps monitoring EtCO2 throughout.",
              "Confirm with a steady capnography waveform on every breath, chest rise and breath sounds -- and leave capnography on."
            ),
          ],
        },
        {
          text: "Through the SGA: chest rises, SpO2 climbs to 94%, EtCO2 50 mm Hg, pulse 96. The paramedic unit arrives.",
          ask: "How do you set the ventilation rate, and what is your handoff?",
          parts: [
            part(
              "Ventilation",
              "Keeps a measured rate (about 10/min) and adjusts toward an EtCO2 of 35-40 mm Hg, avoiding hyperventilation, with oxygen titrated to 94-98%.",
              "About 10 breaths a minute, adjusting toward an EtCO2 of 35 to 40 and saturation of 94 to 98."
            ),
            part(
              "Handoff",
              "Reports submersion time, initial findings, BVM failure, SGA type, size and time, confirmation method and current EtCO2, SpO2 and pulse.",
              "'Submerged about 3 minutes, pulse 54 and apneic. BVM failed with regurgitation; SGA placed 11:42, confirmed by waveform capnography. Now SpO2 94, EtCO2 50, pulse 96.'"
            ),
          ],
        },
      ],
    },
    {
      slug: "aemt-asthma-nebs-cpap",
      objective: "Manage asthma and COPD exacerbations with nebulized bronchodilators and CPAP within AEMT scope",
      kind: "case",
      title: "Tight chest after the cold run",
      brief:
        "Fictional call. A 27-year-old woman with asthma is wheezing, speaking in short phrases and using her neck muscles. Her own inhaler has not helped. Pulse 122, respirations 30, SpO2 90%, EtCO2 38 mm Hg with a shark-fin waveform. Your AEMT unit carries albuterol, ipratropium, CPAP and IV supplies; steroids and magnesium are paramedic medications in your system.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She is alert and frightened.",
          ask: "What do you give first, and at what dose?",
          parts: [
            part(
              "Bronchodilators",
              "Gives nebulized albuterol 5 mg with ipratropium 0.5 mg (repeat albuterol as needed for ongoing distress), and oxygen to SpO2 94-98%.",
              "Albuterol 5 mg with ipratropium 0.5 mg nebulized, repeated as needed; oxygen to 94-98%."
            ),
            part(
              "Paramedic support",
              "Requests a paramedic intercept for steroids and magnesium because she has severe bronchospasm and these are outside AEMT scope here.",
              "Request a paramedic for steroids and magnesium -- not ours to give."
            ),
          ],
        },
        {
          text: "After two nebulizers her wheeze is quieter but she is tiring: respirations 34, SpO2 89%, EtCO2 now 52 mm Hg and rising.",
          ask: "Analyze the change and decide what to do.",
          parts: [
            part(
              "Analysis",
              "Recognizes that a quieter chest with rising EtCO2 and falling saturation means worsening air movement and fatigue -- impending respiratory failure -- not improvement.",
              "Quieter wheeze with a rising CO2 is a bad sign: she's tiring and moving less air."
            ),
            part(
              "Action",
              "Applies CPAP with bronchodilator in-line if she can tolerate it and protect her airway, prepares to assist ventilation with BVM at a slow rate if she deteriorates, and expedites the paramedic intercept or transport.",
              "CPAP with the neb in-line, BVM ready at a slow rate if she gets drowsy, and hurry the paramedic or go."
            ),
          ],
        },
      ],
    },

    // ---- Cardiology & Resuscitation (2) ----
    {
      slug: "aemt-arrest-io-epinephrine",
      objective: "Manage cardiac arrest at AEMT level: high-quality CPR, AED, supraglottic airway and IV or IO epinephrine",
      kind: "case",
      title: "Asystole on the bathroom floor",
      brief:
        "Fictional call. A 70-year-old woman was found unresponsive and pulseless on her bathroom floor by her husband, who started CPR. You are an AEMT crew of two with an engine of three EMTs; paramedics are 12 minutes away. The AED reports no shock advised.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "CPR is under way with BVM ventilation at 30:2.",
          ask: "What is your priority for the AEMT skills you bring?",
          parts: [
            part(
              "Priorities",
              "Keeps high-quality CPR with minimal interruptions as the priority, then obtains IV or IO access and gives epinephrine 1 mg as soon as feasible because the rhythm is non-shockable.",
              "CPR stays first. Then IO access and epinephrine 1 mg as soon as we can, because it's a non-shockable rhythm."
            ),
          ],
        },
        {
          text: "The IO is in at 07:14 and the first epinephrine given. BVM ventilation is becoming difficult.",
          ask: "What do you do with the airway, and how does CPR change?",
          parts: [
            part(
              "SGA",
              "Places a supraglottic airway without pausing compressions for long, confirms with waveform capnography, then gives continuous compressions with 1 breath every 6 seconds.",
              "SGA in with minimal pause, confirmed by capnography; then continuous compressions with a breath every 6 seconds."
            ),
            part(
              "Repeat epinephrine",
              "Repeats epinephrine 1 mg every 3-5 minutes and analyses the rhythm every 2 minutes with the AED.",
              "Epinephrine every 3 to 5 minutes and an AED rhythm check every 2 minutes."
            ),
          ],
        },
        {
          text: "The paramedics arrive at 07:22.",
          ask: "What is your handoff?",
          parts: [
            part(
              "Handoff",
              "Reports downtime and bystander CPR, rhythm checks (no shock advised), IO site and time, epinephrine doses and times, SGA and EtCO2.",
              "'Found down, husband's CPR from about 06:58. AED no shock at every check. Left tibial IO 07:14. Epinephrine 1 mg at 07:15 and 07:19. SGA 07:17, EtCO2 12.'"
            ),
          ],
        },
      ],
    },
    {
      slug: "aemt-nitro-or-not",
      objective: "Recognize when a nitrate is contraindicated or risky: hypotension, a marginal blood pressure and recent phosphodiesterase-inhibitor use",
      kind: "case",
      title: "Chest pressure and a low pressure",
      brief:
        "Fictional call. A 58-year-old man has crushing chest pressure for 30 minutes. He is pale and sweaty. Pulse 58, BP 92/60, respirations 18, SpO2 96%. The transmitted 12-lead is read by the hospital as an inferior STEMI. Your AEMT protocol allows aspirin, sublingual nitroglycerin, IV access and fluid boluses.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He asks for 'one of those tablets under the tongue'.",
          ask: "Do you give nitroglycerin? Explain.",
          parts: [
            part(
              "Decision",
              "Withholds nitroglycerin because his SBP is below the protocol threshold (100 mm Hg), and a nitrate could drop his pressure further; gives aspirin (chewed, 162-325 mg) if not contraindicated.",
              "No -- his systolic is 92, under 100, and nitro could crash his pressure. He gets chewed aspirin instead."
            ),
          ],
        },
        {
          text: "IV access is in. His BP falls to 84/56, lungs are clear.",
          ask: "What do you do within AEMT scope, and where does he go?",
          parts: [
            part(
              "Hypotension",
              "Gives a cautious isotonic fluid bolus with clear lungs, reassessing lung sounds and pressure after it, and requests a paramedic for anything beyond AEMT scope.",
              "A small fluid bolus with his clear lungs, rechecking his lungs and pressure after it; a paramedic intercept if he keeps dropping."
            ),
            part(
              "Destination",
              "Transports to the PCI-capable center that has activated its cath lab, with STEMI notification, symptom-onset time and treatments given.",
              "Straight to the PCI center with a STEMI alert: onset 30 minutes before arrival, aspirin given, nitro withheld for hypotension."
            ),
          ],
        },
      ],
    },

    // ---- Trauma (1) ----
    {
      slug: "aemt-pelvic-fracture-shock",
      objective: "Resuscitate hemorrhagic shock with hemorrhage control and IV fluids to a target blood pressure",
      kind: "case",
      title: "Pinned against a loading dock",
      brief:
        "Fictional call. A 45-year-old warehouse worker was crushed between a truck and a loading dock. He is pale, anxious and complains of severe pelvic pain. Pulse 128, BP 84/56, respirations 26, SpO2 95%. No external bleeding. The Level I trauma center is 25 minutes away.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Pelvic exam shows pain on gentle compression; you do not rock the pelvis.",
          ask: "What do you suspect, and what are your first actions?",
          parts: [
            part(
              "Impression and stabilization",
              "Suspects pelvic fracture with internal hemorrhage and hemorrhagic shock; applies a pelvic binder over the greater trochanters, avoids repeated pelvic manipulation, and moves with minimal log-rolling.",
              "Pelvic fracture bleeding inside -- he's in shock. Pelvic binder over the hips, no more pelvic exams, and move him carefully."
            ),
            part(
              "Destination",
              "Recognizes red field-triage criteria (suspected pelvic fracture, HR greater than SBP) and transports to the highest-level trauma center, establishing IV access en route.",
              "Suspected pelvic fracture and a pulse higher than his systolic: red criteria. Level I trauma center, IVs on the way."
            ),
          ],
        },
        {
          text: "En route you have two large-bore IVs. BP 82/54.",
          ask: "How much fluid, and to what target?",
          parts: [
            part(
              "Fluids",
              "Gives 500 mL isotonic boluses and reassesses after each, aiming for SBP about 90 mm Hg (a radial pulse and alert mentation), not normal pressure; contacts medical direction if shock persists after 2 L.",
              "500 mL bolus, recheck, repeat as needed -- aiming for a systolic around 90 with a radial pulse and him talking, not a normal pressure."
            ),
            part(
              "Beyond scope",
              "Recognizes that blood products and tranexamic acid, which may help, are not AEMT medications, and requests a paramedic intercept or air medical if it will not delay arrival at the trauma center.",
              "TXA and blood would help but aren't ours; a paramedic or air intercept only if it doesn't slow us down."
            ),
          ],
        },
      ],
    },

    // ---- Medical/Obstetrics/Gynecology (3) ----
    {
      slug: "aemt-hypoglycemia-d10",
      objective: "Treat hypoglycemia in a patient who cannot swallow with IV dextrose or IM glucagon",
      kind: "case",
      title: "Unresponsive at the desk",
      brief:
        "Fictional call. A 50-year-old man with type 1 diabetes is unresponsive at his desk, snoring, with a gag reflex. Glucose 32 mg/dL. Pulse 104, BP 140/86, respirations 14, SpO2 96%. Your AEMT unit carries D10, glucagon and IV supplies.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He cannot swallow.",
          ask: "Why not oral glucose, and what do you give?",
          parts: [
            part(
              "Route",
              "Rules out oral glucose because he cannot protect his airway or swallow, and gives IV dextrose -- D10 in increments -- until mental status improves, up to 25 g.",
              "Nothing by mouth -- he can't swallow. D10 IV in increments, up to 25 g, until he wakes."
            ),
          ],
        },
        {
          text: "Three IV attempts fail.",
          ask: "What now?",
          parts: [
            part(
              "Alternative",
              "Gives glucagon 1 mg IM (or IN) when IV access cannot be established, protects the airway on his side, and rechecks glucose.",
              "Glucagon 1 mg IM, keep him on his side, and recheck his glucose."
            ),
          ],
        },
        {
          text: "Twenty minutes later he is awake, glucose 118 mg/dL, and says he will eat lunch and go back to work.",
          ask: "Can he be released, and what would you need?",
          parts: [
            part(
              "Release criteria",
              "States the conditions for release without transport: repeat glucose above 80 mg/dL, insulin (not a long-acting sulfonylurea), normal mentation with no focal signs, can eat now, a reliable adult stays, he refuses with capacity and the crew agrees; otherwise transport.",
              "Only if: glucose over 80, he's on insulin not a sulfonylurea, fully normal with no deficits, eats now, a responsible adult stays with him, and he has capacity -- otherwise he comes with us."
            ),
          ],
        },
      ],
    },
    {
      slug: "aemt-anaphylaxis-hypotension",
      objective: "Treat anaphylaxis with IM epinephrine and IV fluids for hypotension",
      kind: "case",
      title: "A bee sting at the picnic",
      brief:
        "Fictional call. A 40-year-old woman (70 kg) was stung by a bee 10 minutes ago. She has widespread hives, throat tightness, wheeze, and is dizzy. Pulse 128, BP 76/44, respirations 28, SpO2 93%. Your AEMT unit carries epinephrine 1 mg/mL, IV fluids, albuterol and oxygen.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She is still talking but anxious.",
          ask: "What is the first drug, dose, route and site?",
          parts: [
            part(
              "Epinephrine",
              "Gives epinephrine 1 mg/mL 0.3 mg IM into the anterolateral thigh first, without waiting for IV access.",
              "Epinephrine 0.3 mg IM, 1 mg/mL, into the outer thigh -- first, before the IV."
            ),
          ],
        },
        {
          text: "Five minutes later: BP 80/50, still wheezing.",
          ask: "What do you add?",
          parts: [
            part(
              "Repeat and fluids",
              "Repeats IM epinephrine (every 5-15 minutes for persistent hypoperfusion), gives a rapid isotonic fluid bolus of 20 mL/kg (about 1.4 L) IV, and nebulized albuterol for the wheeze.",
              "A second 0.3 mg IM, a 20 mL/kg fluid bolus -- about 1.4 liters -- run in fast, and albuterol for the wheeze."
            ),
            part(
              "Escalation",
              "Requests a paramedic for an epinephrine infusion if hypotension persists despite repeated IM doses and fluids.",
              "If she stays hypotensive after that, a paramedic for an epinephrine drip."
            ),
          ],
        },
      ],
    },
    {
      slug: "aemt-iv-naloxone-titration",
      objective: "Titrate IV naloxone to breathing in an opioid overdose",
      kind: "case",
      title: "Breathing, barely",
      brief:
        "Fictional call. A 33-year-old man is found in a park, unresponsive, breathing 4 times a minute, SpO2 78%, pinpoint pupils. Friends say he used fentanyl. Your AEMT unit carries naloxone for IV, IM and IN use.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The scene is safe.",
          ask: "What comes before naloxone?",
          parts: [
            part(
              "Ventilate first",
              "Opens the airway and ventilates with BVM and oxygen before naloxone, using capnography to monitor ventilation.",
              "Airway and BVM with oxygen first, capnography on."
            ),
          ],
        },
        {
          text: "After a minute of ventilation, SpO2 is 94%. IV access is in.",
          ask: "How do you give naloxone, and what is the end point?",
          parts: [
            part(
              "Titration",
              "Gives small IV doses of naloxone titrated to adequate spontaneous breathing (not full wakefulness), within the adult initial range of 0.4-2 mg, repeating as needed.",
              "Small IV doses -- starting low, 0.4 mg -- repeated until he breathes adequately on his own, not until he's wide awake."
            ),
            part(
              "Why titrate",
              "Explains that a large dose can cause abrupt withdrawal, vomiting and agitation, which endanger the airway and the crew.",
              "A big dose can throw him into withdrawal -- vomiting, agitation -- which risks his airway and our safety."
            ),
          ],
        },
        {
          text: "He breathes 14/min and is drowsy but rousable.",
          ask: "Why must he still be watched closely?",
          parts: [
            part(
              "Recurrence",
              "Notes that naloxone can wear off before a long-acting or high-potency opioid, so respiratory depression can return; monitors EtCO2 and breathing and recommends transport.",
              "The naloxone can wear off before the fentanyl does, so his breathing can slow again. Capnography stays on and he should come in."
            ),
          ],
        },
      ],
    },

    // ---- EMS Operations (1) ----
    {
      slug: "aemt-intercept-handoff",
      objective: "Hand over care to a paramedic intercept with a structured report that includes every medication given",
      kind: "build",
      title: "Hand over to the paramedic intercept",
      brief:
        "Fictional call. You are an AEMT. 16:02 contact with a 64-year-old woman with sudden shortness of breath and wheeze, history of COPD, no allergies. 16:04 pulse 118, BP 150/90, respirations 32, SpO2 86%, EtCO2 48 mm Hg. 16:06 albuterol 5 mg with ipratropium 0.5 mg nebulized. 16:12 IV 18 g left forearm, saline lock. 16:14 CPAP started. 16:16 albuterol 5 mg repeated in-line. 16:20 pulse 106, BP 142/86, respirations 24, SpO2 92%, EtCO2 44 mm Hg. The paramedic unit meets you at 16:22.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the handoff in four parts: patient and problem, history, interventions with times, and current status and trend.",
          parts: [
            part(
              "Patient and problem",
              "Opens with age, sex and the main problem in one sentence.",
              "64-year-old woman with a COPD exacerbation."
            ),
            part(
              "History",
              "Gives onset, relevant history and allergies.",
              "Sudden shortness of breath and wheeze; known COPD; no allergies."
            ),
            part(
              "Interventions",
              "Lists every medication with dose, route and time, plus the IV site and gauge and CPAP start time.",
              "Albuterol 5 mg with ipratropium 0.5 mg neb at 16:06; 18 g IV left forearm, saline lock, at 16:12; CPAP at 16:14; albuterol 5 mg in-line at 16:16."
            ),
            part(
              "Status and trend",
              "Gives both sets of vital signs with times, including EtCO2, and says whether she is improving.",
              "16:04 P 118, BP 150/90, R 32, SpO2 86, EtCO2 48; 16:20 P 106, BP 142/86, R 24, SpO2 92, EtCO2 44 -- improving on CPAP."
            ),
          ],
        },
      ],
    },

    // ---- Clinical Judgment (3) ----
    {
      slug: "aemt-ams-fever-hypotension",
      objective: "Analyze cues to choose among competing hypotheses in a patient with altered mental status",
      kind: "case",
      title: "Confused, hot and low",
      brief:
        "Fictional call. An 82-year-old woman from home is newly confused, per her daughter, after two days of burning urination. Temperature 39.1 C, pulse 118, BP 86/50, respirations 26, SpO2 93%, glucose 142 mg/dL. Stroke scale: no focal deficit. She takes no anticoagulant and has not fallen.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Her daughter wonders whether it is a stroke.",
          ask: "Rank your hypotheses and say which cues support each.",
          parts: [
            part(
              "Hypotheses",
              "Ranks sepsis (likely urinary source) first from fever, tachycardia, tachypnea, hypotension and new confusion; considers stroke less likely (no focal deficit, glucose normal), and other causes such as dehydration.",
              "Sepsis from a urinary infection first: fever, fast pulse and breathing, low pressure, new confusion. Stroke is less likely -- no focal signs and a normal glucose."
            ),
          ],
        },
        {
          text: "IV access is in; lungs are clear.",
          ask: "What do you do, and what do you watch for?",
          parts: [
            part(
              "Action",
              "Gives isotonic fluid boluses early with frequent reassessment of pressure, mental status and lung sounds, oxygen to 94-98%, and sepsis pre-notification to the hospital.",
              "Fluid boluses now, rechecking her pressure, mental status and lungs after each; oxygen to 94-98%; a sepsis alert to the hospital."
            ),
          ],
        },
        {
          text: "After 1 L: BP 96/58, pulse 108, still confused; new fine crackles at both bases.",
          ask: "Evaluate: what do you change?",
          parts: [
            part(
              "Re-evaluate",
              "Recognizes partial response and new crackles as possible fluid overload, pauses further boluses, reassesses breathing and SpO2, and requests a paramedic or expedites transport for vasopressor-level care.",
              "She's a little better, but new crackles mean I stop the fluid, watch her breathing, and get her to definitive care fast -- she may need vasopressors I can't give."
            ),
          ],
        },
      ],
    },
    {
      slug: "aemt-ectopic-shock",
      objective: "Apply the clinical judgment steps to a patient with abdominal pain and signs of shock",
      kind: "case",
      title: "Abdominal pain and fainting",
      brief:
        "Fictional call. A 26-year-old woman fainted at work after sudden, severe lower abdominal pain on the left. Her last period was about seven weeks ago. She is pale and clammy. Pulse 124, BP 88/56, respirations 22, SpO2 98%. She has some shoulder-tip pain.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She asks if it could just be a bad period.",
          ask: "What is your leading hypothesis and why?",
          parts: [
            part(
              "Hypothesis",
              "Identifies a ruptured ectopic pregnancy with hemorrhagic shock as the leading hypothesis (missed period, sudden one-sided pain, syncope, shoulder-tip pain from blood under the diaphragm, shock signs).",
              "A ruptured ectopic pregnancy bleeding into her abdomen: missed period, sudden one-sided pain, fainting, shoulder-tip pain and shock."
            ),
          ],
        },
        {
          text: "IV access is in.",
          ask: "What actions do you take within AEMT scope?",
          parts: [
            part(
              "Actions",
              "Lays her flat, keeps her warm, gives oxygen as needed, gives fluid boluses to a modest blood-pressure target (radial pulse, mentation) rather than normal pressure, and transports rapidly to a hospital with emergency gynecologic surgery, with pre-notification.",
              "Flat, warm, fluid boluses to keep a radial pulse and her talking -- not a normal pressure -- and go fast to a hospital that can operate, called ahead."
            ),
          ],
        },
        {
          text: "En route her pulse rises to 138 and she becomes drowsy.",
          ask: "Evaluate and communicate: what do you do and say?",
          parts: [
            part(
              "Evaluate and report",
              "Recognizes worsening shock, gives a further bolus per protocol, prepares to support the airway, and updates the hospital with the deterioration so surgery is ready.",
              "She's worse: another bolus, airway ready, and a radio update -- 'possible ruptured ectopic, pulse 138, now drowsy, ETA 6 minutes, need surgery ready.'"
            ),
          ],
        },
      ],
    },
    {
      slug: "aemt-tension-pneumo-intercept",
      objective: "Generate solutions within AEMT scope and decide when a paramedic intercept is needed",
      kind: "case",
      title: "Stab wound and a failing chest",
      brief:
        "Fictional call. A 30-year-old man was stabbed in the right chest. You cover the wound with a vented chest seal. Minutes later he is agitated and very short of breath. Pulse 136, BP 78/50, respirations 36, SpO2 84%; breath sounds are absent on the right and his neck veins are distended. The trauma center is 15 minutes away; a paramedic unit can meet you in 5 minutes.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The chest seal is in place.",
          ask: "What is happening, and what can you do about it yourself?",
          parts: [
            part(
              "Recognition",
              "Recognizes tension pneumothorax (absent breath sounds, distended neck veins, hypotension, hypoxia).",
              "Tension pneumothorax on the right."
            ),
            part(
              "Within scope",
              "Burps or briefly lifts the chest seal to release trapped air, gives high-flow oxygen and assists ventilation if needed, and recognizes that needle decompression is paramedic scope, not AEMT scope.",
              "Lift the edge of the chest seal to let the air out, high-flow oxygen, assist his breathing if he tires. Needle decompression isn't in my scope."
            ),
          ],
        },
        {
          text: "Lifting the seal brings a brief rush of air and his SpO2 rises to 90%, then falls again.",
          ask: "Do you wait for the paramedic intercept or go?",
          parts: [
            part(
              "Decision",
              "Begins transport immediately and meets the paramedic unit en route (rendezvous) rather than waiting on scene, because the intercept can be gained without delaying the trauma center and the patient needs decompression and surgery.",
              "Go now and rendezvous with the paramedics on the way -- that gets him decompressed sooner without holding him on scene."
            ),
            part(
              "Handoff to paramedic",
              "Gives mechanism, findings pointing to tension pneumothorax, chest seal management and response, vital signs trend and the need for immediate decompression.",
              "'Right chest stab, vented seal, now absent right breath sounds, JVD, BP 78/50, SpO2 84. Burping the seal helped briefly. He needs decompression now.'"
            ),
          ],
        },
      ],
    },
  ],
};
