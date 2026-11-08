import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-147: NPTE-PTA (FSBPT, physical therapist assistant licensure
// examination).
//
// Aligned to FSBPT's NPTE-PTA Test Content Outline in effect since January
// 2024 (still current on FSBPT's NPTE content page, checked 2026-11-07) and
// to the course's units in seed/tracks/pt.ts. Density ("hybrid", the
// content test checks it): 3/3/2 for the three heaviest systems, then 1 for
// each of the other eleven domains = 19 labs (6 build, 13 case).
//
// PTA SCOPE is built into every rubric. The PTA carries out and progresses
// interventions within the supervising PT's plan of care, collects data,
// monitors, holds treatment and consults the PT, and reports; the PTA does
// not perform the initial examination or evaluation, re-evaluate, change
// goals or the plan of care, interpret findings into a new diagnosis or
// prognosis, or discharge. CMS Medicare Benefit Policy Manual ch. 15 sec.
// 230.1 (Rev. 13889, issued 2026-07-30, read from the CMS PDF on
// 2026-11-07): "PTAs may not provide evaluative or assessment services, make
// clinical judgments or decisions; develop, manage, or furnish skilled
// maintenance program services; or take responsibility for the service."
// Rubrics therefore mark an answer down when the learner evaluates,
// re-plans or discharges on their own, and up when they hold, report and
// defer to the PT. Supervision levels are left to "state law and the
// setting's rules" because they differ (see the pt.ts header).
//
// SAFETY: every patient is fictional; exam practice, not clinical guidance.
// Numbers a scenario needs (hold parameters, oxygen orders, exercise doses)
// are given in the case as the PT's plan or the physician's order, not as a
// universal standard. All labs are needs_expert_review until a licensed PT
// or PTA educator approves them (docs/labs.md).
//
// Values quoted as standards, verified 2026-11-07 (details and DOIs in the
// pt-nptept.ts header): autonomic dysreflexia actions and the >20 mm Hg
// systolic rise (PVA Consortium for Spinal Cord Medicine, 2020); exercise
// stopping criteria and the 1.8 kg (3 lb) weight-gain flag in heart failure
// (Taylor, Myers, Bonikowske, Heart Fail Rev 2024, adapted from ACSM GETP
// 11th ed.); hypoglycemia levels and the 15 g / 15 minute rule (ADA
// hypoglycemia guide, Standards of Care); 2026 APTA TKA CPG (no CPM for
// primary uncomplicated TKA); Parkinson disease CPG (external cueing);
// BCRL CPG (CDT components); Berg Balance Scale 14 items scored 0-4,
// maximum 56 (Shirley Ryan AbilityLab Rehabilitation Measures infographic,
// sralab.org, read 2026-11-07); stroke warning signs are named
// qualitatively only.

export const NPTEPTA_LABS: SeedLabSet = {
  trackCode: "NPTEPTA",
  sources: [
    "https://www.fsbpt.org/Portals/0/documents/free-resources/2024-PTA-Test-Content-Outline-Bullets.pdf",
    "https://www.fsbpt.org/Free-Resources/NPTE-Development/NPTE-Content",
    "https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/bp102c15.pdf",
    "https://www.capteonline.org/globalassets/capte-docs/2024-capte-pta-standards-required-elements.pdf",
    "https://doi.org/10.1093/ptj/pzag058",
    "https://doi.org/10.1093/ptj/pzab302",
    "https://doi.org/10.1093/ptj/pzaa087",
    "https://doi.org/10.1007/s10741-023-10310-9",
    "https://pva.org/wp-content/uploads/2021/09/CPG_Autonomic-Dysreflexia_2025_digital_03.26-.pdf",
    "https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-hcp-5-27-25.pdf",
    "https://www.sralab.org/sites/default/files/downloads/2023-03/Berg%20Balance%20Scale.INFOGRAPHIC.pdf",
  ],
  labs: [
    // ---------------------------------------------------------------- Musculoskeletal (3)
    {
      slug: "pta-back-pain-new-red-flag",
      objective:
        "Report to the supervising PT any new red-flag feature in a patient with back pain, such as signs of cauda equina or cord compression, infection, fracture or malignancy, before continuing treatment",
      kind: "case",
      title: "Visit 6: something new with the back pain",
      brief:
        "You are the PTA treating a fictional 45-year-old landscaper for low back pain with right leg pain under the PT's plan of care: repeated extension exercises, walking program and trunk strengthening. The PT evaluated him 3 weeks ago; the supervising PT is in the building today.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Before starting, he mentions that since last night he has had numbness \"between my legs\" when he wipes, and trouble starting to urinate. His leg pain is now in both legs.",
          ask: "What do you do before any exercise?",
          parts: [
            part(
              "Recognise",
              "Recognises saddle numbness, new urinary difficulty and bilateral leg symptoms as red flags for possible cauda equina syndrome needing urgent medical attention.",
              "Saddle numbness, new trouble passing urine and symptoms in both legs are red flags for cauda equina syndrome -- a medical emergency."
            ),
            part(
              "Act within scope",
              "Does not start or continue the planned treatment, does not diagnose to the patient, and contacts the supervising PT immediately (and follows the facility's emergency pathway); keeps the patient at the clinic.",
              "No exercises today. I stop, keep him here, and get the supervising PT immediately; I tell him these symptoms need checking right away without naming a diagnosis."
            ),
          ],
        },
        {
          text: "The PT speaks with him, arranges transfer to the emergency department and calls his physician.",
          ask: "What do you document?",
          parts: [
            part(
              "Documentation",
              "Documents objectively: the patient's reported symptoms in his words with timing, that treatment was withheld, the time the PT was notified, and the PT's action -- without interpreting a diagnosis.",
              "S: reports numbness in the saddle area when wiping and difficulty starting urination since last evening; leg pain now bilateral. O/A: planned treatment not performed. Supervising PT notified at 09:12; PT assessed and arranged transfer to the ED. P: hold the plan of care until the PT re-evaluates."
            ),
          ],
        },
      ],
    },
    {
      slug: "pta-tka-within-plan",
      objective:
        "Deliver range-of-motion and progressive strengthening exercise after total knee arthroplasty as the PT has planned, aware the guideline advises against continuous passive motion and routine bracing",
      kind: "case",
      title: "Knee replacement: carry out the plan, spot the problem",
      brief:
        "You are the PTA seeing a fictional 70-year-old 2 weeks after a primary right total knee arthroplasty. The PT's plan: active-assisted and active knee range of motion, quadriceps NMES daily, progressive strengthening (progress sit-to-stand and step-ups by height or reps when pain stays at or below 4/10 and swelling doesn't increase next day), gait training to wean from a walker. Short-term goal: knee flexion to 100 degrees in 3 weeks.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Pain stayed 3/10 after last session and swelling has not increased. She asks whether she should rent a continuous passive motion machine \"because my neighbour had one\".",
          ask: "How do you run today's session and answer her question?",
          parts: [
            part(
              "Progress within the plan",
              "Progresses strengthening only within the PT's written criteria (e.g. raises step height or reps because pain and swelling criteria are met) and carries out the ROM, NMES and gait components; does not add new interventions outside the plan.",
              "Her criteria are met, so I raise the step-up height and add a set of sit-to-stands, and do AAROM/AROM, NMES and walker-to-cane gait practice as planned. Nothing new outside the plan."
            ),
            part(
              "CPM question",
              "Explains that current guidance doesn't recommend CPM after an uncomplicated knee replacement and her active exercises do the job, and passes the question to the PT if she wants to discuss further; doesn't change the plan.",
              "The current guideline doesn't recommend CPM after a straightforward knee replacement -- your active exercises work better. I'll let your PT know you asked, in case you'd like to talk it over."
            ),
          ],
        },
        {
          text: "Next visit: her right calf is swollen compared with the left, warm and tender; she has no chest pain or breathlessness.",
          ask: "What do you do?",
          parts: [
            part(
              "Hold and report",
              "Holds exercise and gait training, notifies the supervising PT right away so the physician can be contacted for urgent evaluation of possible DVT, tells her to call emergency services for chest pain or sudden breathlessness, and documents.",
              "I stop the session, notify the PT at once so the surgeon can be called for an urgent check for a blood clot, tell her to call 911 for chest pain or sudden shortness of breath, and document what I saw."
            ),
          ],
        },
        {
          text: "DVT was ruled out. Three weeks later her knee flexion is 104 degrees and she walks with a cane; her goals in the plan are met.",
          ask: "What is your role now?",
          parts: [
            part(
              "Report, don't re-plan",
              "Records the objective data and reports to the PT that the short-term goals appear met so the PT can re-evaluate, set new goals or discharge; does not write new goals or discharge the patient.",
              "I document flexion 104 degrees and cane gait distance and tell the PT her goals look met. The PT re-evaluates and decides new goals or discharge -- I don't."
            ),
          ],
        },
      ],
    },
    {
      slug: "pta-soap-note",
      objective: "Documenting musculoskeletal treatment sessions and progress toward established goals",
      kind: "build",
      title: "Write the PTA's SOAP note",
      brief:
        "You are the PTA. A fictional 52-year-old carpenter is 6 weeks after rotator cuff repair, seen under the PT's plan (goal: active shoulder flexion to 140 degrees in 4 weeks; lift a 2 kg tool to shelf height). Today: he reports pain 2/10 at rest and 5/10 reaching overhead and says he slept through the night for the first time. You performed active-assisted flexion with a wand 3 x 10, scapular stabilisation exercises 3 x 10, and active flexion; measured active flexion 118 degrees (last week 104). He completed everything; pain rose to 4/10 during wand work and returned to 2/10 after 5 minutes of rest.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the SOAP note.",
          parts: [
            part("Subjective", "Reports the patient's own report: pain at rest and overhead with ratings, the improved sleep.", "Reports pain 2/10 at rest, 5/10 reaching overhead; slept through the night for the first time since surgery."),
            part("Objective", "Records interventions with dosage and objective measures (active flexion 118 degrees, prior 104), and response measured during the session.", "AAROM flexion with wand 3 x 10, scapular stabilisation 3 x 10, AROM flexion. Active flexion 118 degrees (104 last week). Pain 4/10 during wand work, back to 2/10 after 5 min rest."),
            part("Assessment", "Describes response to treatment and progress toward the PT's established goals in objective terms (14 degrees gained, 22 to go toward 140), without a new diagnosis, prognosis or goal change.", "Tolerated session; pain settled with rest. Progressing toward flexion goal: +14 degrees this week, 22 degrees remaining to the 140-degree goal. Lifting goal not yet tested."),
            part("Plan", "Continues per the PT's plan of care, and notes anything for the PT (e.g. whether to start the lifting task when the plan allows); does not change frequency, goals or interventions.", "Continue per PT plan of care. Will review with the PT whether to begin the 2 kg shelf-lift task next session per the plan's progression."),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Neuromuscular and Nervous (3)
    {
      slug: "pta-autonomic-dysreflexia",
      objective:
        "Watch for autonomic dysreflexia in patients with spinal cord injury at or above T6: with sudden severe headache and raised blood pressure, sit them up with legs down, loosen tight clothing, check bladder and bowel, and get help",
      kind: "case",
      title: "Tetraplegia and a sudden headache",
      brief:
        "You are the PTA in an outpatient neuro clinic treating a fictional 34-year-old with a C6 spinal cord injury from 3 years ago, under the PT's plan (wheelchair skills, upper-limb strengthening, standing frame). His usual blood pressure is about 98/60 mm Hg. He uses an indwelling catheter with a leg bag and an abdominal binder.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "In the standing frame he says he has a sudden pounding headache and blurred vision. He is sweating and flushed above the chest. Blood pressure is 168/100 mm Hg.",
          ask: "What do you do?",
          parts: [
            part(
              "Recognise",
              "Recognises autonomic dysreflexia (lesion above T6; systolic BP more than 20 mm Hg above baseline with headache and flushing/sweating) as an emergency.",
              "Autonomic dysreflexia: C6 injury, systolic about 70 mm Hg above his usual, headache, flushing and sweating. Emergency."
            ),
            part(
              "Immediate actions",
              "Gets him to sitting upright with legs down (out of the frame to his chair), loosens the binder and leg-bag straps and any tight clothing, rechecks BP every 1-2 minutes, and calls for help (supervising PT and the facility's medical/emergency response) without leaving him; gives no medication.",
              "Out of the frame into his chair sitting upright, legs down; loosen the binder, leg-bag straps and tight clothing; BP every 1-2 minutes; shout for the PT and call the clinic's emergency response; I stay with him."
            ),
            part(
              "Trigger",
              "Checks the bladder drainage first (kinks, full bag, catheter position), then other triggers (bowel, pressure on skin, tight clothing).",
              "Check the catheter tubing for kinks and whether the leg bag is full first, then pressure points and tight clothing."
            ),
          ],
        },
        {
          text: "The leg bag is full and the tubing is kinked under the strap. After the PT empties the bag and straightens the tubing, his headache eases and BP falls to 112/70 mm Hg.",
          ask: "What do you do for the rest of the session and afterwards?",
          parts: [
            part(
              "Monitor and hand over",
              "Keeps monitoring BP until stable, including for a drop afterwards; ends or modifies the session as the PT directs; documents signs, readings, trigger, actions and times objectively; and helps with the patient's education as the PT directs.",
              "Keep checking BP until it's stable and watch for it dropping; no more standing today unless the PT says so; document symptoms, BP readings with times, the kinked tubing and what we did; reinforce his own AD plan as the PT directs."
            ),
          ],
        },
      ],
    },
    {
      slug: "pta-new-stroke-signs",
      objective: "Recognizing neurological changes during a session that require immediate PT or medical notification",
      kind: "case",
      title: "Mid-session change in speech",
      brief:
        "You are the PTA treating a fictional 71-year-old with Parkinson disease and high blood pressure for gait training under the PT's plan. At the start of the session at 10:05 he was chatting normally and walking with his usual pattern.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At 10:20 his speech is suddenly slurred, the right side of his mouth droops, and his right arm drifts down when he holds both arms out.",
          ask: "What is happening and what do you do?",
          parts: [
            part(
              "Recognise",
              "Recognises sudden facial droop, arm weakness and speech difficulty as warning signs of an acute stroke -- not part of his Parkinson disease.",
              "Sudden face droop, arm drift and slurred speech are stroke warning signs, different from his Parkinson symptoms."
            ),
            part(
              "Act",
              "Stops the session, sits/lies him safely, activates emergency services (911 or the facility's emergency response) immediately, notifies the supervising PT, notes the time last known well (10:05/10:20), monitors vital signs and airway, and gives nothing by mouth.",
              "Stop, get him seated or lying safely, call 911 / the emergency response now and notify the PT. Last known well about 10:20 (normal at 10:05). Stay with him, check vitals and breathing, nothing to eat or drink."
            ),
          ],
        },
        {
          text: "The ambulance team takes over. His wife arrives and asks you what happened and whether he had a stroke.",
          ask: "How do you respond and what do you document?",
          parts: [
            part(
              "Communication",
              "Describes what was observed and the actions taken without diagnosing; directs diagnostic questions to the medical team; documents observations, times, who was notified and the handover.",
              "\"During his session his speech and face changed suddenly, so we called an ambulance; the hospital team will assess what caused it.\" Document the signs, times (10:05 normal, 10:20 onset), 911 call, PT notified and handover to EMS."
            ),
          ],
        },
      ],
    },
    {
      slug: "pta-parkinson-session",
      objective:
        "Implement the Parkinson disease interventions in the plan of care -- gait training, balance training and external cueing for freezing of gait -- and report changes in response to the PT",
      kind: "build",
      title: "Run a Parkinson session from the plan",
      brief:
        "You are the PTA. The PT's plan of care for a fictional 68-year-old with Parkinson disease (Hoehn and Yahr 2.5, freezing at doorways): treadmill walking 20 minutes at a target heart rate of 100-120 /min; gait training for step length with external cues (metronome at 110 beats/min, floor lines); progressive balance training (narrow stance, reaching, turning); report freezing frequency and any falls. He has just had his levodopa dose and is in an \"on\" period.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe how you carry out the session and what you report.",
          parts: [
            part("Aerobic component", "Runs treadmill walking at the plan's target heart rate range (100-120 /min) with monitoring (HR, BP/symptoms) and safe guarding; does not change the target.", "Treadmill 20 minutes, adjusting speed to keep HR 100-120 /min, checking HR every few minutes and watching for dizziness; guard from the side with the safety clip on."),
            part("Cueing for freezing", "Uses the plan's external cues -- metronome at 110 beats/min and floor lines -- in doorway and turning practice, with appropriate guarding.", "Doorway and turning practice with the metronome at 110 beats/min and tape lines on the floor, wide arc turns, standing close to guard."),
            part("Balance", "Carries out progressive balance tasks within the plan (narrow stance, reaching, turns), progressing difficulty as the plan allows while guarding.", "Narrow-stance and tandem holds, reaching outside the base, and 180-degree turns near the counter, making each slightly harder as he succeeds, with a gait belt."),
            part("Report to the PT", "Reports objective data and changes: freezing episodes and where, any falls/near-falls, HR response, and anything new (e.g. orthostatic symptoms, decline), leaving re-planning to the PT.", "Tell the PT: 3 freezing episodes at the doorway without cues, none with the metronome; no falls; HR held 104-118; no dizziness. Anything new goes to the PT before the next session."),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Cardiovascular and Pulmonary (2)
    {
      slug: "pta-vitals-hold-and-stop",
      objective: "Monitoring vital signs and activity tolerance during a treatment session and responding to abnormal findings",
      kind: "case",
      title: "Blood pressure before and during the bike",
      brief:
        "You are the PTA seeing a fictional 66-year-old with heart failure and hypertension for strengthening and stationary cycling after a hip replacement. The PT's plan sets parameters: hold exercise and notify the PT if resting BP is 180/110 mm Hg or higher; stop exercise for chest discomfort, dizziness, a fall in systolic BP of more than 10 mm Hg as the workload rises, or BP of 250/115 mm Hg or higher.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Seated after 5 minutes' rest his BP is 186/104 mm Hg; repeated after another 5 minutes it is 184/102 mm Hg. He feels fine and wants to \"just do the bike\".",
          ask: "What do you do?",
          parts: [
            part(
              "Decision",
              "Recognises the reading meets the plan's hold parameter and holds exercise despite no symptoms; notifies the supervising PT (who decides on contacting the physician); checks for symptoms such as headache, chest pain or vision change and escalates urgently if present.",
              "Systolic 184 is over the plan's 180 hold limit on two readings, so no exercise today. I notify the PT, ask about headache, chest pain or vision changes, and get urgent help if any appear."
            ),
            part(
              "Document",
              "Documents both readings with times, position and cuff arm, the decision to hold, and the PT notification.",
              "186/104 at 14:05 and 184/102 at 14:10, seated, left arm; exercise held per plan parameters; supervising PT notified at 14:12."
            ),
          ],
        },
        {
          text: "Next visit, resting BP 138/82 mm Hg. On the bike, as you raise the resistance one level, his systolic BP goes from 154 to 140 mm Hg and he says he feels lightheaded.",
          ask: "What do you do?",
          parts: [
            part(
              "Stop and respond",
              "Stops the exercise because systolic BP fell more than 10 mm Hg with increased workload and he has symptoms; has him rest seated/lying safely, rechecks vitals, calls for help/emergency response if chest pain or worsening symptoms, notifies the PT, documents.",
              "Stop: a 14 mm Hg systolic drop as the load went up, with lightheadedness. Ease him off safely, sit or lie him down, recheck BP and HR, call for help if he gets chest pain or worse, notify the PT and document."
            ),
          ],
        },
      ],
    },
    {
      slug: "pta-copd-intensity-band",
      objective:
        "Keep pulmonary rehabilitation endurance work in the intensity band the plan sets, often dyspnea of 4 to 6 on the Borg scale or perceived exertion rated 12 to 14, and report readings outside it",
      kind: "case",
      title: "Keeping COPD walking in the band",
      brief:
        "You are the PTA in a pulmonary rehabilitation gym. A fictional 70-year-old with COPD has the PT's plan: walking intervals with dyspnea 4-6 on the Borg CR10 scale; physician's order for oxygen at 2 L/min during exercise, which may be titrated to keep SpO2 88-92%, maximum 4 L/min.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "After 5 minutes of walking at 2 L/min his SpO2 is 86% with a good waveform and his dyspnea is 7/10.",
          ask: "What do you do?",
          parts: [
            part(
              "Respond",
              "Stops or slows to rest, coaches pursed-lip breathing, titrates oxygen only within the physician's order (e.g. to 3 L/min) and rechecks; contacts the PT if SpO2 doesn't recover into range or symptoms are severe.",
              "Stop and rest him seated, coach pursed-lip breathing, raise oxygen within the order to 3 L/min and recheck. If SpO2 doesn't come back into 88-92% or he looks worse, get the PT."
            ),
            part(
              "Report",
              "Records readings and flow rates and reports to the PT that he went outside the plan's band, so the PT can decide on changes to the plan.",
              "Document SpO2, dyspnea, flow rates and recovery time, and tell the PT he went outside the band at the current pace."
            ),
          ],
        },
        {
          text: "On 3 L/min after rest: SpO2 90%, dyspnea 4/10. The plan allows shortening work bouts and lengthening rests to stay in the band.",
          ask: "How do you continue today's session?",
          parts: [
            part(
              "Adjust within the plan",
              "Continues with shorter work bouts and longer rests (as the plan allows) keeping dyspnea 4-6 and SpO2 in range, checking both each bout; doesn't change the plan's targets or the oxygen limits.",
              "Two-minute walks with 90-second rests, checking SpO2 and dyspnea after each, keeping dyspnea 4-6 and SpO2 88-92% on 3 L/min. Targets and oxygen limits stay as written."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Equipment, Devices, and Technologies (1)
    {
      slug: "pta-crutch-gait-training",
      objective: "Implementing gait training with assistive devices per an established plan of care",
      kind: "build",
      title: "Crutch training: level ground and stairs",
      brief:
        "You are the PTA. The PT's plan for a fictional 19-year-old student, non-weight-bearing on the left after ankle fracture fixation: gait training with axillary crutches on level surfaces and stairs, so he can manage the 14 stairs at his dormitory with one handrail.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe how you carry out the training.",
          parts: [
            part("Check fit", "Checks crutch fit before walking: pad about 2 finger-widths below the axilla, hand grips with elbow slightly flexed (about 30 degrees), and teaches weight through the hands, not the armpits.", "Pad about 2 finger-widths below the armpit, grips set so the elbow bends about 30 degrees, and he bears weight through his hands, not his armpits."),
            part("Level gait", "Teaches a 3-point non-weight-bearing pattern (crutches forward, swing the right leg through keeping the left foot off the floor) with guarding from the involved side using a gait belt.", "Crutches forward, then hop the right leg up to or through, keeping the left foot off the floor; I guard from behind on his left with a gait belt."),
            part("Stairs", "Up: good (right) leg first, then crutches; down: crutches first, then the good leg; with one rail, holds the rail and both crutches/one crutch technique as appropriate; guards from below on the stairs.", "Up with the good leg, then the crutches; down with the crutches, then the good leg. Using the rail with both crutches in the other hand; I stand below him going up and down."),
            part("Report", "Documents distance, assistance level and stair performance, and reports to the PT whether the stair goal has been met, without changing weight-bearing status.", "Document distance walked, level of assistance and the number of stairs managed, and tell the PT if he is ready for the dormitory stairs. Weight-bearing stays as ordered."),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Safety and Protection (1)
    {
      slug: "pta-guarding-controlled-fall",
      objective: "Applying fall-prevention techniques and correct guarding during functional activities",
      kind: "case",
      title: "Guarding a patient who starts to fall",
      brief:
        "You are the PTA practising sit-to-stand and short walks with a fictional 77-year-old with right hemiparesis after a stroke, under the PT's plan. She walks with a quad cane in her left hand and needs minimal assistance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You are about to walk with her across the gym.",
          ask: "How do you set up and guard?",
          parts: [
            part(
              "Guarding",
              "Uses a gait belt, stands slightly behind and to the weaker (right) side, one hand on the belt and one ready at the shoulder/trunk, with a clear path, proper footwear and a chair available.",
              "Gait belt on; I stand slightly behind her on the right (weaker) side, one hand on the belt, the other near her shoulder; clear path, non-slip shoes, and a chair nearby."
            ),
          ],
        },
        {
          text: "Halfway across, her right knee buckles and she starts to fall; you can't stop the fall.",
          ask: "What do you do during and after the fall?",
          parts: [
            part(
              "Controlled lowering",
              "Keeps hold of the belt, widens own base, draws her toward own body and guides her down to the floor (or onto a nearby surface), protecting her head, rather than trying to hold her up.",
              "Hold the belt, widen my stance, pull her close and slide her down my leg to the floor, protecting her head -- not trying to catch her full weight."
            ),
            part(
              "After the fall",
              "Does not get her up immediately: checks for injury and vital signs, calls for help, notifies the supervising PT (and nursing/medical per policy), uses safe lifting with help, and completes an incident report per facility policy as well as objective documentation.",
              "Keep her lying, check for pain, injury and vitals, call for help and notify the PT; get her up with help and proper technique only once she's checked. Write an incident report per policy and document the facts."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Integumentary (1)
    {
      slug: "pta-venous-ulcer-infection",
      objective: "Recognizing signs of wound infection or non-healing that require PT notification",
      kind: "case",
      title: "Dressing change day: the wound looks different",
      brief:
        "You are the PTA providing wound care under the PT's plan for a fictional 74-year-old with a venous leg ulcer: cleanse, foam dressing, multilayer compression, measure weekly. Last week the wound measured 4.0 x 3.0 cm with light serous drainage.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Today the redness extends well beyond the wound edge, the skin is hot and swollen, drainage is thick and green with an odour, the wound measures 4.6 x 3.5 cm, and he says it hurts much more. His temperature is 38.2 degrees C.",
          ask: "What do you do?",
          parts: [
            part(
              "Recognise",
              "Recognises signs of wound infection/possible cellulitis (spreading redness, heat, swelling, purulent malodorous drainage, increased pain and size) with fever.",
              "Spreading redness, heat, swelling, thick green smelly drainage, more pain, a bigger wound and a fever -- signs of infection, possibly spreading."
            ),
            part(
              "Within scope",
              "Notifies the supervising PT promptly (so the PT can re-assess and contact the physician), holds compression and any interventions the PT hasn't confirmed, applies a protective dressing as directed, and documents objective measurements and signs.",
              "Notify the PT now so they can assess and call his physician; hold the compression until the PT says otherwise; cover the wound with a clean dressing as directed; record the measurements, drainage, temperature and his pain."
            ),
          ],
        },
        {
          text: "The PT re-assesses and his physician starts antibiotics. The PT changes the plan to hold compression for 3 days.",
          ask: "What do you do at the next visit?",
          parts: [
            part(
              "Follow the updated plan",
              "Carries out the PT's updated plan (no compression until the PT resumes it), re-measures and monitors for worsening or improvement, and reports to the PT; doesn't restart compression on own judgment.",
              "Follow the new plan: dressing change without compression, re-measure and check redness, warmth and temperature, and report to the PT. Compression restarts only when the PT says."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Metabolic and Endocrine (1)
    {
      slug: "pta-hypoglycemia-response",
      objective: "Recognizing and responding to signs of hypo/hyperglycemia during a treatment session",
      kind: "case",
      title: "A low during the session",
      brief:
        "You are the PTA treating a fictional 61-year-old with type 1 diabetes on insulin for knee strengthening and walking under the PT's plan. The plan says: check glucose before exercise and keep fast-acting carbohydrate in the gym.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Fifteen minutes into walking she becomes pale, sweaty and confused, and her hands are shaking. Her meter reads 52 mg/dL. She can still swallow.",
          ask: "Interpret and respond.",
          parts: [
            part(
              "Interpret",
              "Identifies symptomatic hypoglycemia, level 2 (below 54 mg/dL).",
              "Hypoglycemia -- 52 mg/dL is level 2 (under 54), with symptoms."
            ),
            part(
              "Respond",
              "Stops exercise, sits her down, gives about 15 g of fast-acting carbohydrate, rechecks in 15 minutes and repeats if still low; calls emergency services (glucagon per protocol) if she can't swallow or becomes unresponsive; notifies the PT.",
              "Stop, sit her down, give 15 g of glucose (tablets or juice), recheck in 15 minutes and repeat if still low. If she can't swallow or becomes unresponsive, call 911 and follow the glucagon protocol. Let the PT know."
            ),
          ],
        },
        {
          text: "After two treatments her glucose is 98 mg/dL and she feels well. She wants to finish the walking.",
          ask: "What do you do about the rest of the session?",
          parts: [
            part(
              "Rest of the session",
              "Does not resume the planned exercise today without the PT's agreement; ensures she eats, observes until recovered, documents the event and readings, and reports to the PT (who may contact her physician and adjust the plan).",
              "No more walking today unless the PT agrees; she eats a snack and stays until fully recovered. Document times, readings and treatment, and report to the PT, who decides on any plan changes and on telling her physician."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Therapeutic Modalities (1)
    {
      slug: "pta-tens-screen",
      objective:
        "Before applying TENS, confirm there is no implanted cardiac device near the site, no placement over the carotid sinus, front of the neck or a pregnant abdomen, and no broken, infected or insensate skin",
      kind: "build",
      title: "TENS on today's list: go or hold?",
      brief:
        "You are the PTA. The PT's plans include TENS for three fictional patients today. (A) A 45-year-old with chronic low back pain; intact skin and normal sensation over the lumbar area; no implanted devices; not pregnant. (B) A 72-year-old with neck pain, electrodes planned over the anterior and lateral neck; you notice a pacemaker scar below the left clavicle. (C) A 58-year-old with knee pain; the skin over the planned electrode site has an open, weeping abrasion from a fall yesterday.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each patient, decide go or hold, and say what you do.",
          parts: [
            part("Patient A", "Proceeds as planned after confirming the screen (skin, sensation, devices, pregnancy) and checks skin after treatment; documents parameters and response.", "Go: screen confirmed clear, apply TENS as the PT's plan sets, check skin afterwards and document parameters and response."),
            part("Patient B", "Holds: placement over the front of the neck/carotid sinus and near an implanted cardiac device are contraindicated; consults the PT before any TENS; does not change the electrode plan on own judgment.", "Hold: electrodes over the front of the neck and near a pacemaker aren't safe. I check with the PT before any TENS; the PT decides on another approach."),
            part("Patient C", "Holds TENS over broken skin; notifies the PT, who decides whether to relocate electrodes or use another intervention; documents and reports the new wound.", "Hold: no electrodes on open skin. Tell the PT about the abrasion, who decides on another site or intervention, and document it."),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- System Interactions (1)
    {
      slug: "pta-heart-failure-weight-gain",
      objective: "Recognizing how a comorbidity changes precautions during an intervention already underway",
      kind: "case",
      title: "Shoulder rehab with heart failure",
      brief:
        "You are the PTA treating a fictional 69-year-old after shoulder surgery under the PT's plan: shoulder exercises plus 15 minutes of treadmill walking for general conditioning. She also has chronic heart failure, weighs herself daily, and brings her log to each session.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Her log shows her weight rose 2.3 kg over the last 2 days. Her ankles are more swollen and she needed an extra pillow last night to breathe comfortably.",
          ask: "What do you do with today's session?",
          parts: [
            part(
              "Recognise",
              "Recognises signs of worsening heart failure (weight gain of 1.8 kg/3 lb or more over 1-3 days, increased oedema, orthopnea).",
              "A 2.3 kg gain in 2 days (over the 1.8 kg / 3 lb flag), more ankle swelling and needing an extra pillow suggest her heart failure is worsening."
            ),
            part(
              "Act within scope",
              "Holds the aerobic portion (and anything the PT hasn't cleared), checks vital signs and symptoms, notifies the supervising PT promptly so the physician can be contacted, and escalates urgently if breathless at rest or chest pain; documents.",
              "Hold the treadmill today, check BP, HR, SpO2 and symptoms, and tell the PT now so her physician can be called; if she is breathless at rest or has chest pain, call for emergency help. Document."
            ),
          ],
        },
        {
          text: "Her physician adjusts her diuretic; a week later her weight is back to baseline and the PT clears her to continue the plan with an added instruction: stop and report if she becomes breathless lying flat.",
          ask: "How do you adapt the shoulder exercises today?",
          parts: [
            part(
              "Adapt within the plan",
              "Performs exercises in positions she tolerates (e.g. semi-reclined or seated rather than flat supine), monitors breathing and vitals, resumes the conditioning as cleared, and reports any recurrence to the PT.",
              "Do the shoulder exercises seated or semi-reclined rather than flat on her back, watch her breathing and vitals, resume the treadmill as cleared, and report any new breathlessness lying down to the PT."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Lymphatic (1)
    {
      slug: "pta-cdt-cellulitis-hold",
      objective: "Implementing complete decongestive therapy components per an established plan of care",
      kind: "case",
      title: "CDT week 2",
      brief:
        "You are the PTA delivering phase I complete decongestive therapy under the PT's plan for a fictional 57-year-old with stage II lymphedema of the right arm after breast cancer treatment: manual lymphatic drainage, multilayer short-stretch bandaging, exercise in bandages and skin care, 5 days a week.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Today's skin check is normal and she reports no new pain.",
          ask: "Describe how you carry out today's session.",
          parts: [
            part(
              "CDT session",
              "Carries out each component as planned: skin inspection and care, manual lymphatic drainage in the planned sequence (clearing proximal areas first), multilayer short-stretch bandaging with graded pressure, and the planned exercises with bandages on; measures as the plan directs.",
              "Inspect and moisturise the skin, MLD clearing the trunk and proximal areas before the arm, then multilayer short-stretch bandaging firmer at the hand than near the shoulder, and her exercise routine in the bandages. Measure circumferences as the plan says."
            ),
          ],
        },
        {
          text: "The next day her arm is red, hot and painful under the bandages, and her temperature is 38.5 degrees C.",
          ask: "What do you do?",
          parts: [
            part(
              "Hold and report",
              "Recognises probable infection (cellulitis), holds MLD and bandaging, notifies the supervising PT immediately so she can be referred urgently to her physician, and documents the findings.",
              "This looks like cellulitis: no MLD or bandaging today. Notify the PT immediately so she's sent to her physician urgently, and document the redness, heat, pain and temperature."
            ),
            part(
              "Restart",
              "States that CDT resumes only when the PT updates the plan after medical treatment.",
              "CDT restarts only when the PT updates the plan after she's treated."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Professional Responsibilities (1)
    {
      slug: "pta-scope-three-requests",
      objective: "Applying the PTA's scope of practice and supervision requirements to a scenario",
      kind: "case",
      title: "Three requests in one morning",
      brief:
        "You are a PTA in a fictional outpatient clinic; every patient here is fictional. Your supervising PT is at a team meeting across town this morning and reachable by phone. The clinic follows state law and payer rules on supervision.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The front desk asks you to \"just do the initial evaluation\" for a new walk-in with neck pain so the schedule doesn't fall behind.",
          ask: "How do you respond?",
          parts: [
            part(
              "Initial evaluation",
              "Declines: the initial examination/evaluation is the PT's responsibility and a PTA may not evaluate; offers to help (gather paperwork, take vital signs if allowed, reschedule) and contacts the PT.",
              "I can't do the evaluation -- examining and evaluating a new patient is the PT's job, not a PTA's. I'll call the PT and help reschedule or get the intake forms done."
            ),
          ],
        },
        {
          text: "Next, a patient you've treated for 3 weeks says her exercises are \"boring and not working\" and asks you to switch her to a different program and cut visits to once a week.",
          ask: "What do you do?",
          parts: [
            part(
              "Plan changes",
              "Does not change the plan of care, frequency or goals; may vary exercises only within the PT's plan; collects objective data on her progress and communicates the request to the PT for re-evaluation.",
              "I can vary exercises within the plan, but changing her program or visit frequency is the PT's decision. I'll record her progress measures and ask the PT to re-evaluate."
            ),
          ],
        },
        {
          text: "A third patient has met every goal on his plan and asks to be discharged today.",
          ask: "What is your role?",
          parts: [
            part(
              "Discharge",
              "Does not discharge; reports goal attainment with objective data to the PT, who performs the discharge evaluation/summary; may contribute data the PT requests.",
              "Discharge is the PT's call. I'll report that his goals appear met with today's measurements, and the PT completes the discharge assessment and summary."
            ),
            part(
              "Why",
              "Explains the basis: PTAs work under the PT's direction and may not evaluate, make clinical judgments or change the plan (e.g. Medicare Benefit Policy Manual ch. 15 sec. 230.1, state practice acts, APTA standards), whatever the scheduling pressure.",
              "PTAs act under the PT's direction and may not evaluate, make clinical judgments or change the plan -- Medicare's manual says so, as do state practice acts and APTA's standards."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Gastrointestinal (1)
    {
      slug: "pta-gi-bleed-signs",
      objective: "Recognizing GI signs/symptoms during a session that require PT notification",
      kind: "case",
      title: "Back pain, painkillers and dark stools",
      brief:
        "You are the PTA treating a fictional 63-year-old for chronic low back pain under the PT's plan. He has been taking an over-the-counter anti-inflammatory several times a day for 6 weeks.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He mentions burning pain in the upper abdomen and that his stools have been black and sticky for 3 days.",
          ask: "What do you do?",
          parts: [
            part(
              "Recognise",
              "Recognises black, tarry stools with upper abdominal pain and long-term NSAID use as possible upper GI bleeding needing medical evaluation.",
              "Black, tarry stools, upper abdominal burning and weeks of anti-inflammatories could mean bleeding in the stomach -- he needs medical assessment."
            ),
            part(
              "Act",
              "Notifies the supervising PT promptly (who arranges urgent medical referral), checks vital signs, and does not continue vigorous exercise until the PT decides; documents objectively.",
              "Tell the PT right away so he's referred urgently to his physician, check his vitals, hold the exercise until the PT decides, and document what he told me."
            ),
          ],
        },
        {
          text: "While you wait, he stands up and says he feels faint; he looks pale and his heart rate is 112 /min.",
          ask: "What now?",
          parts: [
            part(
              "Emergency",
              "Lies or sits him down safely, activates emergency services/the facility's emergency response, stays with him, monitors vitals, and informs the PT.",
              "Lie him down, call 911 / the emergency response, stay with him and keep checking vitals, and update the PT."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Genitourinary (1)
    {
      slug: "pta-pelvic-floor-coaching",
      objective:
        "Coach pelvic floor muscle (Kegel) exercises and bladder programs that the plan of care includes, and report concerns to the PT",
      kind: "build",
      title: "Coach the pelvic floor program in the plan",
      brief:
        "You are the PTA. The PT has evaluated a fictional 49-year-old teacher with stress urinary incontinence. The plan of care: pelvic floor muscle contractions, 10 slow holds of 5 seconds with 10 seconds' rest, 3 times a day, progressing to 10-second holds when she completes all sets easily; a quick contraction before coughing or lifting; and a 3-day bladder diary.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe how you coach the program and what you report.",
          parts: [
            part("Teaching the contraction", "Cues a correct contraction (squeeze and lift as if stopping wind/urine flow, then fully relax) and avoids substitutions (no breath holding, buttock or thigh squeezing, bearing down); uses the plan's dose.", "\"Squeeze and lift as if stopping gas, hold 5 seconds, then let go fully and rest 10.\" Keep breathing, keep buttocks and thighs relaxed, no pushing down. 10 holds, 3 times a day."),
            part("Functional use", "Teaches the quick pre-contraction before coughing, sneezing or lifting ('the knack') and how to fit practice into her day.", "Squeeze just before a cough, sneeze or lifting a box; link the sets to daily routines like after brushing teeth."),
            part("Progress and diary", "Progresses to 10-second holds only per the plan's criterion, and explains how to complete the bladder diary (times, volumes/leaks, fluids).", "Move to 10-second holds once she does all sets easily, as the plan says. Diary: record drinks, toilet trips and any leaks with what she was doing, for 3 days."),
            part("Report to the PT", "Reports progress objectively and any concerns outside the plan -- e.g. blood in the urine, pain, inability to contract, urinary retention or new urgency -- to the PT.", "Report to the PT how many holds she manages and her diary results, and straight away if she has blood in her urine, pain, can't empty her bladder or can't find the contraction."),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Research and Evidence-Based Practice (1)
    {
      slug: "pta-berg-administer-report",
      objective:
        "Give the Berg Balance Scale's 14 tasks with their standard instructions and 0 to 4 scoring (maximum 56), and report the total to the PT rather than interpreting fall risk independently",
      kind: "build",
      title: "Score and report a Berg Balance Scale",
      brief:
        "You are the PTA. The PT asks you to administer the Berg Balance Scale to a fictional 80-year-old as part of data collection before her progress report. Item scores: sitting to standing 4; standing unsupported 4; sitting unsupported 4; standing to sitting 3; transfers 3; standing with eyes closed 3; standing with feet together 3; reaching forward 2; picking up an object 3; turning to look behind 3; turning 360 degrees 2; alternate foot on stool 2; tandem stance 1; standing on one leg 1.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Administer, score and report.",
          parts: [
            part("Standard administration", "Uses the standard instructions and equipment for each of the 14 items, scores each 0-4 on the lowest criterion met, demonstrates as allowed, and guards closely with a gait belt.", "Give each of the 14 tasks with the standard wording and set-up (stopwatch, ruler, step, chairs), demonstrate as the test allows, score each 0-4 at the lowest level she meets, and guard with a gait belt."),
            part("Total score", "Adds the items correctly to 38 out of 56.", "4+4+4+3+3+3+3+2+3+3+2+2+1+1 = 38 out of 56."),
            part("Report, don't interpret", "Reports the total and item scores (and any safety observations) to the PT without independently declaring a fall-risk category or changing the plan; the PT interprets.", "Report 38/56 with the item scores and that tandem and single-leg stance needed the most help. The PT interprets her fall risk and decides any plan changes."),
          ],
        },
      ],
    },
  ],
};
