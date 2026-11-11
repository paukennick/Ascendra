import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-151: ABPTS Neurologic Clinical Specialist labs.
//
// Aligned to the ABPTS neurology examination outline: knowledge 15%,
// clinical reasoning / professionalism / communication / education /
// systems 25%, patient management -- examination, evaluation, diagnosis
// and prognosis 30%, intervention and outcomes 30%. Density follows the
// adopted hybrid plan unit by unit: 2 / 1 / 3 / 3 = 9 labs (5 build,
// 4 case).
//
// Every patient, family and facility is fictional; exam practice, not
// clinical guidance. Thresholds quoted were checked on 2026-11-07:
//   - Consortium for Spinal Cord Medicine (Paralyzed Veterans of America),
//     "Evaluation and Management of Autonomic Dysreflexia and Other
//     Autonomic Dysfunctions", 2020 edition, read from pva.org: adults have
//     AD when systolic BP is more than 20 mm Hg above baseline (children
//     15); injuries at or above T6; sit up and lower the legs, loosen
//     clothing and devices, check the bladder first then bowel; drug
//     treatment when systolic BP is 150 mm Hg or higher in adults; monitor
//     at least 2 hours after resolution.
//   - Hornby 2020, ANPT locomotor CPG, JNPT doi:10.1097/NPT.0000000000000303
//     (for ambulatory people more than 6 months after stroke, incomplete
//     SCI or brain injury: walking training at moderate to high intensity or
//     virtual-reality-based training recommended; body-weight-supported
//     treadmill training, robotic-assisted training and sitting/standing
//     balance training without VR should not be performed for walking
//     speed or distance).
//   - Tilson 2010, Phys Ther doi:10.2522/ptj.20090079 (MCID for comfortable
//     gait speed 0.16 m/s, 20-60 days after stroke, mRS anchor).
//   - Donoghue & Stokes 2009, Berg MDC (4 / 5 / 7 / 5 points by baseline).
//   - Wrisley & Kumar 2010, FGA 22/30 cut-off for fall risk.
//   - Kleim & Jones 2008, J Speech Lang Hear Res
//     doi:10.1044/1092-4388(2008/018) (ten principles of experience-
//     dependent plasticity).
//   - Kattah 2009, HINTS, Stroke (record doi:10.1161/STROKEAHA.109.551234):
//     head impulse, nystagmus, test of skew; a normal head impulse,
//     direction-changing nystagmus or skew deviation points to a central
//     cause.
//   - Winstein 2016, AHA/ASA Guidelines for Adult Stroke Rehabilitation
//     and Recovery, Stroke doi:10.1161/STR.0000000000000098 (record
//     verified; the recommendation favouring inpatient rehabilitation
//     facility care over skilled nursing for eligible survivors is cited
//     from the guideline but its text was not re-read on the day).
//   - CORE-CPG (Moore 2018), PD-CPG (Osborne 2022), VEST-CPG (Hall 2022),
//     SP-SCI, SP-AD, SP-BPPV, SP-CER, SP-MS, SP-GBS as cited in
//     seed/tracks/pt-abpts.ts (ISNCSCI/AIS definitions per SP-SCI and the
//     ASIA International Standards; the ASIA site refused automated access
//     on the day, so the AIS wording is the long-standing standard
//     reproduced in the StatPearls chapter).
// Not used because unverified on the day: Perry's 0.4 / 0.8 m/s community
// ambulation bands (the 0.8 m/s figure is used only as the WFG falls-risk
// threshold), stroke-specific 6MWT MCIDs, CMS's 3-hour IRF rule as a
// number.

export const ABPTSNCS_LABS: SeedLabSet = {
  trackCode: "ABPTSNCS",
  sources: [
    source("https://specialization.apta.org/become-a-specialist/neurology/specialist-certification-examination-outline-neurology", "exam_outline", "2026-11-07"),
    source("https://specialization.apta.org/become-a-specialist/neurology", "exam_outline", "2026-11-07"),
  ],
  labs: [
    // ------------------------------------------------------------------
    // Unit 1: Knowledge for specialty practice (2)
    // ------------------------------------------------------------------
    {
      slug: "ncs-localize-three-lesions",
      objective: "Neuroanatomy and lesion localization: cortical, subcortical, brainstem, cerebellar, spinal and peripheral patterns",
      kind: "build",
      title: "Localize three lesions from the bedside",
      brief:
        "Three fictional patients on an acute neurology ward. Patient 1: sudden right face and arm weakness worse than the leg, right-sided sensory loss, non-fluent speech with intact comprehension, eyes deviate to the left. Patient 2: sudden vertigo, hoarse voice and difficulty swallowing, loss of pain and temperature on the LEFT face and the RIGHT arm and leg, left-sided limb ataxia, left ptosis and a small left pupil; strength is normal. Patient 3: after a stab wound to the back, right leg weakness with brisk right knee and ankle reflexes and an upgoing right toe, loss of vibration and position sense in the right leg, and loss of pain and temperature in the LEFT leg from about the waist down. Fictional patients; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each patient name the lesion site (side and structure or vascular territory) and explain which findings localize it.",
          parts: [
            part(
              "Patient 1",
              "Localizes a left cerebral hemisphere lesion in the middle cerebral artery territory (left frontal-parietal cortex): contralateral face and arm more than leg weakness and sensory loss (MCA somatotopy), expressive (Broca-type) aphasia placing it in the dominant hemisphere, and gaze deviation toward the lesion.",
              "Left middle cerebral artery territory (dominant frontal-parietal cortex): face and arm weaker than the leg is the MCA pattern, the non-fluent aphasia with preserved comprehension is a Broca-type lesion in the dominant hemisphere, and the eyes deviate toward the side of a cortical lesion."
            ),
            part(
              "Patient 2",
              "Localizes a left lateral medullary (Wallenberg) syndrome, usually from vertebral or posterior inferior cerebellar artery occlusion: crossed sensory loss (ipsilateral face, contralateral body), ipsilateral Horner syndrome, ipsilateral cerebellar ataxia, vertigo and bulbar signs (dysphagia, hoarseness) with spared corticospinal tracts.",
              "Left lateral medulla (Wallenberg syndrome, typically vertebral or PICA territory): the crossed pattern -- left face and right body pain/temperature loss -- is the medullary signature; add left Horner (ptosis, miosis), left limb ataxia from the inferior cerebellar peduncle, vertigo from the vestibular nuclei and hoarseness and dysphagia from the nucleus ambiguus, with motor pathways spared because the lesion is lateral."
            ),
            part(
              "Patient 3",
              "Localizes a right-sided spinal cord hemisection (Brown-Sequard) in the thoracic cord: ipsilateral upper motor neuron weakness and ipsilateral dorsal column loss (vibration and proprioception) with contralateral spinothalamic loss (pain and temperature) a level or two below the lesion; places the level roughly at the low thoracic cord from the sensory level near the waist.",
              "Right thoracic cord hemisection (Brown-Sequard): the corticospinal and dorsal column tracts have already crossed, so right leg weakness with upper motor neuron signs and right-sided vibration/position loss are ipsilateral to the lesion, while the spinothalamic tract crosses within a few segments of entry, so pain and temperature are lost on the LEFT below the lesion. A sensory level at the waist puts it around the low thoracic cord."
            ),
          ],
        },
      ],
    },
    {
      slug: "ncs-plasticity-principles-to-plan",
      objective: "Neuroplasticity and motor learning principles that drive intervention design",
      kind: "build",
      title: "Turn plasticity principles into a session plan",
      brief:
        "A fictional 58-year-old woman is 4 weeks after a left MCA stroke in an inpatient rehabilitation unit. She has moderate right arm paresis (can grasp and release a cup with effort, no fine finger movement), walks 20 m with a cane and supervision at 0.45 m/s, and her goal is to return to her job as a florist. She tires after about 20 minutes of concentrated work, is motivated, and tends to use her left hand for everything. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design a 60-minute session for her arm and walking, showing which experience-dependent plasticity principles and motor-learning variables each design choice applies.",
          parts: [
            part(
              "Task selection and salience",
              "Chooses tasks that are meaningful and specific to her goals (for example handling stems, wrapping, cutting tape, carrying a bucket while walking), explicitly applying specificity and salience, and 'use it or lose it / use it and improve it' by constraining or discouraging compensation with the left hand during practice.",
              "Build the arm practice around florist tasks -- picking up stems of different thicknesses, trimming with scissors, taping and wrapping -- so the practice is specific to her goal and matters to her (specificity, salience). Ask her to keep the left hand in her lap or on the table during these blocks so the right hand is used and improved rather than lost to compensation."
            ),
            part(
              "Dose, intensity and progression",
              "Plans high repetition counts with the arm and walking practice at a challenging intensity (repetition matters, intensity matters), scheduled in blocks that respect her fatigue (time matters: distributed practice with rests), and progresses difficulty so the task stays just beyond current ability; includes aerobic-intensity walking practice as task-specific training for gait.",
              "Aim for hundreds of reaches and grasps in the session, counted, in 15-minute blocks with 3-minute rests to match her 20-minute attention window (distributed practice). Keep each task just hard enough that she succeeds about 70-80% of the time and bump difficulty when she does better -- smaller stems, higher shelves. Walking: 20 minutes of over-ground and treadmill walking pushed to a 'somewhat hard' effort with speed and surface changes rather than slow, safe laps -- repetition and intensity drive the change."
            ),
            part(
              "Practice structure and feedback",
              "Chooses motor-learning variables deliberately: variable and random-order practice across tasks once the skill is partly acquired (to aid transference), reduced and summary extrinsic feedback with knowledge of results more than knowledge of performance, an external focus of attention, and the avoidance of interference from practicing compensatory patterns.",
              "Start each new task blocked, then mix the three florist tasks in random order so learning transfers to the shop floor. Give feedback after every third or fourth attempt, mostly about the result ('the stem is in the vase') rather than her elbow angle, and cue externally ('reach for the ribbon'). Do not drill a trunk-lean compensation for reach -- that pattern would interfere with recovering the arm."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 2: Clinical reasoning, professionalism, communication... (1)
    // ------------------------------------------------------------------
    {
      slug: "ncs-which-setting-after-the-stroke",
      objective: "Systems-based practice: level-of-care decisions, payer rules and transitions between settings",
      kind: "build",
      title: "Which setting after the stroke, and how to argue for it",
      brief:
        "A fictional 71-year-old man is on day 4 after a right MCA ischemic stroke in an acute hospital. He has left hemiparesis (sits unsupported, stands with moderate assistance of one, takes a few steps with maximal assistance), left neglect that is improving, mild dysphagia on a modified diet, and intact communication. Before the stroke he lived with his wife in a single-story home and was independent. He is medically stable; his wife is willing and able to help at home after rehabilitation. The case manager says the insurer 'is leaning toward a skilled nursing facility' and asks for your recommendation and justification. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give your recommended level of care with the justification a payer reviewer needs, what you will document to support it, and what you will tell the patient and his wife.",
          parts: [
            part(
              "Recommendation and justification",
              "Recommends an inpatient rehabilitation facility (IRF) over a skilled nursing facility, justifying it with: he can participate in and benefit from intensive, interdisciplinary rehabilitation (improving neglect, intact communication, medical stability, high prior function), he needs at least two therapy disciplines (PT, OT, and speech for dysphagia), ongoing physician oversight, and a realistic goal of discharge home with his wife; notes that guidelines favor IRF-level care for eligible stroke survivors.",
              "Recommend an inpatient rehabilitation facility. He meets the case: medically stable, able to tolerate and benefit from intensive therapy (neglect already improving, communication intact, motivated, high pre-stroke function), needs PT, OT and speech-language pathology together, needs rehabilitation physician and nursing oversight (dysphagia, blood pressure, skin), and has a realistic discharge home with an able spouse in a single-level house. Stroke rehabilitation guidance favors IRF-level care over a skilled nursing facility for survivors who qualify, because of the intensity and coordination it provides."
            ),
            part(
              "Documentation",
              "Documents in the language reviewers look for: measurable current function (assist levels, distance, balance and transfer scores), the specific impairments and their expected trajectory, measurable short-term goals with timeframes, the need for the intensity the IRF provides and the ability to tolerate it, the interdisciplinary needs, a safe discharge plan, and prior level of function.",
              "Chart the objective picture: sits unsupported, sit-to-stand moderate assist of one, 3 m with maximal assist and a hemi-walker, left neglect improving day over day, modified-diet dysphagia. State prior function (independent, community ambulator), measurable 2-week goals (stand with supervision, walk 15 m with minimal assist, transfers with his wife's help) and the need for daily multidisciplinary therapy he can tolerate. Record the discharge plan: home with spouse, single level, equipment needs."
            ),
            part(
              "Communication with patient and family",
              "Explains the options and recommendation honestly in plain language, including what each setting offers and that the payer makes the final coverage decision, prepares them for an appeal if needed, sets realistic expectations about recovery and his wife's role, and ensures their preferences are heard.",
              "Tell them plainly: 'We are recommending a rehabilitation hospital because you can work hard and we think you will get home sooner and safer with daily intensive therapy; a nursing facility gives less therapy. Your insurer decides what it will pay for, and if it says no we can appeal with your record of progress.' Ask what matters most to them, explain his wife will be trained before discharge, and set expectations that recovery continues for months after any facility."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 3: Examination, evaluation, diagnosis and prognosis (3)
    // ------------------------------------------------------------------
    {
      slug: "ncs-acute-vertigo-triage",
      objective: "Vestibular examination: oculomotor, positional and functional testing and differentiating peripheral from central causes",
      kind: "case",
      title: "Acute continuous vertigo: central or peripheral?",
      brief:
        "A fictional 64-year-old man with hypertension and diabetes is seen by direct access with 36 hours of continuous vertigo, nausea and unsteadiness. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He has spontaneous horizontal nystagmus. Oculomotor examination: the head impulse test is NORMAL (no corrective saccade) to both sides; the nystagmus beats to the right in right gaze and to the LEFT in left gaze; on alternate cover test the left eye drifts vertically and corrects. He cannot stand without support. No limb weakness, no dysarthria, normal finger-nose.",
          ask: "Interpret the oculomotor findings and decide what happens now.",
          parts: [
            part(
              "Interpretation",
              "Applies HINTS: in acute vestibular syndrome a normal head impulse test, direction-changing (gaze-evoked) nystagmus and skew deviation (vertical misalignment on cover test) are each central signs; all three here point to a posterior-circulation stroke rather than vestibular neuritis, and notes that absent limb weakness or dysarthria does not exclude cerebellar stroke.",
              "This is a central HINTS pattern. In acute continuous vertigo a peripheral lesion gives an abnormal head impulse (a catch-up saccade), nystagmus that beats one way in every gaze position and no skew. He has a normal head impulse, nystagmus that changes direction with gaze and a vertical skew -- three central signs. Normal strength and finger-nose do not rule out a cerebellar or brainstem stroke."
            ),
            part(
              "Action",
              "Treats it as a stroke emergency: no vestibular rehabilitation or repositioning maneuvers, immediate emergency referral (emergency services) with a clear handover of the findings and time of onset, and keeps the patient safe from falls while waiting.",
              "Stop the examination and call emergency services: 64-year-old with vascular risk factors, 36 hours of acute vestibular syndrome and a central HINTS exam needs urgent stroke evaluation and imaging. Hand over the three findings and the onset time, keep him seated or lying with someone beside him, and do not attempt repositioning or exercises."
            ),
          ],
        },
        {
          text: "Imaging shows a small left cerebellar infarct; he is treated and returns to you 3 weeks later from the stroke unit. He now has brief episodes of spinning when he rolls onto his right side in bed, lasting under a minute. Right Dix-Hallpike: after a few seconds' delay, upbeating torsional nystagmus toward the right (lower) ear lasting about 20 seconds, with vertigo, fatiguing on repetition. Left Dix-Hallpike negative. Head impulse remains normal; no new central signs.",
          ask: "What is the new problem and what is your treatment and progression plan?",
          parts: [
            part(
              "Diagnosis",
              "Diagnoses right posterior canal benign paroxysmal positional vertigo (canalithiasis) from the characteristic latency, brief duration, upbeat-torsional nystagmus toward the dependent ear and fatigability, distinguishing it from the earlier central event and noting that BPPV can follow a period of immobility or coexist with central disease.",
              "Right posterior canal BPPV, canalithiasis type: positional vertigo under a minute, a positive right Dix-Hallpike with a short latency, upbeating torsional nystagmus toward the right ear, fatiguing with repetition. It is a new peripheral problem on top of the recovered cerebellar stroke -- common after bed rest -- not a recurrence of the central event."
            ),
            part(
              "Treatment and progression",
              "Treats with a canalith repositioning maneuver (Epley or Semont) for the right posterior canal as first-line care, re-tests, repeats if needed, gives post-maneuver advice without unnecessary restrictions, and plans vestibular/balance rehabilitation for residual imbalance from the cerebellar infarct, with precautions given the recent stroke and a check that nothing has changed centrally.",
              "Perform a right Epley (or Semont) maneuver now, re-test, and repeat at the next visit if still positive; vestibular suppressant medicines are not effective treatment for BPPV. Then address the residual unsteadiness from the cerebellar infarct with a balance and gait program (standing with narrowing base, head turns while walking, dynamic tasks) and reassess the central examination at each visit."
            ),
          ],
        },
      ],
    },
    {
      slug: "ncs-isncsci-classification",
      objective: "Examination of the patient with spinal cord injury, including neurological level and ASIA classification",
      kind: "build",
      title: "Classify a spinal cord injury from the ISNCSCI findings",
      brief:
        "A fictional 29-year-old man is 10 days after a traumatic cervical spinal cord injury. ISNCSCI examination: light touch and pin prick are normal (2) through C6 bilaterally, impaired (1) at C7 and C8, and absent (0) from T1 downward on both sides, with S4-5 light touch and pin prick absent. Key muscles: elbow flexors 5/5, wrist extensors 5/5, elbow extensors 3/5, finger flexors 1/5, finger abductors 0/5 bilaterally; all lower-limb key muscles 0/5. No voluntary anal contraction; deep anal pressure is NOT present. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Determine the sensory and motor levels, the neurological level of injury, completeness and ASIA Impairment Scale grade, and state what the classification means for early rehabilitation planning.",
          parts: [
            part(
              "Levels",
              "Determines the sensory level as C6 bilaterally (the most caudal dermatome with normal light touch and pin prick) and the motor level as C7 bilaterally (elbow extensors grade 3 with all key muscles above graded 5), so the neurological level of injury is C6 (the most rostral of the sensory and motor levels), explaining the rule that a key muscle graded 3 or more counts as the level when the muscles above are normal.",
              "Sensory level: C6 on both sides (last dermatome normal to both light touch and pin prick). Motor level: C7 on both sides (elbow extensors are 3/5, which counts because every key muscle above it is 5/5). The neurological level of injury is the more rostral of the two: C6."
            ),
            part(
              "Completeness and AIS grade",
              "Classifies the injury as complete, AIS A, because there is no sacral sparing: S4-5 light touch and pin prick absent, no deep anal pressure and no voluntary anal contraction; notes the zones of partial preservation (sensory to C8, motor to C8 because the C8 finger flexors are 1/5) that are recorded only in complete injuries.",
              "No sacral sparing -- S4-5 sensation absent, no deep anal pressure, no voluntary anal contraction -- so the injury is complete: AIS A. Because it is complete, record the zones of partial preservation: sensory to C8 and motor to C8 on both sides (the finger flexors, C8, still have a flicker at 1/5)."
            ),
            part(
              "What it means for planning",
              "Translates the classification into early rehabilitation priorities for a C6 AIS A tetraplegia: expected functional potential (wrist extension for tenodesis grasp, independence with adapted equipment for many tasks, transfers possibly with a board, manual wheelchair on level surfaces), high priority on respiratory care, skin and pressure injury prevention, bladder and bowel programs, orthostatic tolerance, and autonomic dysreflexia education because the lesion is above T6, while recognizing that early neurological change can still occur and the exam is repeated.",
              "C6 AIS A tetraplegia: he has wrist extension, so tenodesis grasp is the key skill to protect (do not over-stretch the finger flexors); realistic goals include feeding and grooming with adaptive equipment, pressure relief, transfers with a slide board, and a manual wheelchair with modified rims on level ground. Early priorities: respiratory muscle training and secretion clearance, skin checks and pressure relief schedule, bladder and bowel programs, graded sitting for orthostatic tolerance, and autonomic dysreflexia education for him and his family because the lesion is above T6. Repeat the ISNCSCI, since early change is still possible."
            ),
          ],
        },
      ],
    },
    {
      slug: "ncs-autonomic-dysreflexia-in-the-gym",
      objective: "Recognizing medical instability and emergencies: autonomic dysreflexia, raised intracranial pressure, new neurologic signs",
      kind: "case",
      title: "A pounding headache in the rehab gym",
      brief:
        "A fictional 34-year-old woman with a T4 AIS A spinal cord injury (3 months ago) is doing wheelchair skills in the rehabilitation gym. Her usual blood pressure is about 98/60 mm Hg. She has an indwelling urinary catheter. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She suddenly reports a pounding headache and blurred vision. Her face is flushed and sweaty above the chest, her arms have goose bumps, and her heart rate is 52. Blood pressure measured immediately: 152/96 mm Hg.",
          ask: "What is happening and what do you do, in order, in the first minutes?",
          parts: [
            part(
              "Recognition",
              "Recognizes autonomic dysreflexia: a lesion at or above T6, systolic blood pressure more than 20 mm Hg above her baseline (152 versus about 98), pounding headache, flushing and sweating above the lesion, piloerection and bradycardia; treats it as a medical emergency because of the risk of stroke and seizure.",
              "Autonomic dysreflexia. She is at T4 (above T6), her systolic pressure has jumped more than 20 mm Hg over her baseline of about 98, and she has the classic signs: pounding headache, blurred vision, flushing and sweating above the lesion, goose bumps and a slow heart rate. For her, 152/96 is a hypertensive emergency."
            ),
            part(
              "Immediate actions",
              "Acts in the guideline sequence: keep her sitting upright and lower the legs, loosen tight clothing and constrictive devices (binder, straps, stockings), check blood pressure every few minutes, look for the bladder trigger first -- check the catheter and tubing for kinks or blockage and drainage -- then bowel and skin, call for nursing/medical help immediately, and does not lay her flat.",
              "Keep her upright in the chair and drop her legs; loosen her chest strap, abdominal binder, leg straps and anything tight. Call for the nurse and physician now. Check BP and pulse every 1-2 minutes. Bladder first: look for a kinked or blocked catheter and whether urine is draining; if the tubing is kinked, straighten it; the nurse will flush or replace a blocked catheter. If BP stays up, the team checks for bowel impaction and skin problems (pressure area, ingrown nail, tight shoe)."
            ),
          ],
        },
        {
          text: "The nurse finds the catheter tubing kinked under the wheelchair cushion and frees it; 400 mL drains. Over the next 4 minutes blood pressure falls to 118/74 and the headache eases, then to 104/64. She feels tired and slightly light-headed.",
          ask: "What happens for the rest of her day, and what do you teach her and the team?",
          parts: [
            part(
              "Follow-up today",
              "Continues monitoring for at least 2 hours for recurrence or rebound hypotension (she is now near baseline and light-headed), ends the gym session, documents the episode (trigger, peak BP, times, actions, resolution), and informs the physician; confirms no pharmacological treatment was needed because systolic pressure fell below 150 once the trigger was removed.",
              "The episode resolved once the trigger went, with no need for medication because the systolic never stayed at or above 150 after the catheter drained. Stop the session, keep her under observation with BP checks for at least 2 hours watching for a second rise or for hypotension (she is already light-headed near baseline), document everything -- time, symptoms, peak 152/96, actions, resolution -- and let the physician know."
            ),
            part(
              "Education",
              "Teaches the patient, family and gym staff: her personal early-warning signs, the common triggers (bladder distension most often, then bowel, skin, tight clothing, pressure, sexual activity, procedures), the self-management sequence (sit up, loosen, check catheter), carrying an AD wallet card listing her baseline BP, and when to seek emergency care (symptoms not resolving, systolic BP at or above 150 or rising despite removing triggers).",
              "Teach her and her family her own warning signs, that a full bladder is by far the most common trigger, then bowel, skin and tight clothing, and the sequence: sit up, loosen, check the catheter and tubing, check BP. Give her an autonomic dysreflexia wallet card with her baseline BP of 98/60. Tell the gym team to check cushion placement over tubing before every session. Emergency care if symptoms do not settle or systolic BP reaches 150 or keeps climbing after the triggers are removed."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 4: Intervention and outcomes (3)
    // ------------------------------------------------------------------
    {
      slug: "ncs-walking-training-chronic-stroke",
      objective: "Task-specific training and neuroplasticity-based intervention for stroke and brain injury",
      kind: "build",
      title: "Walking training for a chronic stroke survivor, by the guideline",
      brief:
        "A fictional 66-year-old man is 14 months after a left MCA stroke. He walks independently with a cane and an ankle-foot orthosis at 0.62 m/s, covers 240 m in 6 minutes, and wants to walk with his grandchildren at the zoo. He has hypertension controlled on medication and no cardiac history; his physician has cleared him for exercise with heart-rate monitoring. He has been receiving 'balance exercises' and body-weight-supported treadmill walking at a slow pace for 3 months with no change in speed. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the new plan of care using the ANPT locomotor clinical practice guideline: what you will do, what you will stop doing and why, and how you will dose and progress it safely.",
          parts: [
            part(
              "What to do",
              "Prescribes task-specific walking training at moderate to high cardiovascular intensity (over-ground and treadmill at speeds and inclines that push effort, with heart-rate monitoring) and/or virtual-reality-based walking training, as the CPG's strong recommendations for ambulatory people more than 6 months after stroke, with large amounts of stepping practice per session.",
              "Switch to what the locomotor CPG recommends strongly for someone more than 6 months out: lots of actual walking practice at moderate to high intensity -- treadmill and over-ground walking at speeds and inclines that get him breathing hard (monitored against his heart-rate reserve and RPE), with variable surfaces, speed changes, turns and step-overs that look like a zoo visit -- plus virtual-reality-based walking training if available. Count his steps and minutes at intensity each session."
            ),
            part(
              "What to stop and why",
              "Stops low-intensity body-weight-supported treadmill training and static/dynamic balance exercise as the primary intervention for walking speed and distance, because the CPG's strong evidence says these should not be performed for that goal in this population, while keeping balance work only as a secondary or safety component.",
              "Stop the slow body-weight-supported treadmill walking and the balance drills as the main program: the CPG says, with strong evidence, that body-weight-supported treadmill training, robotic-assisted training and sitting or standing balance training without virtual reality should not be performed to improve walking speed or distance in people more than 6 months after stroke -- which matches his 3 months without change. Balance work stays only as a small safety add-on."
            ),
            part(
              "Dose, progression and safety",
              "Specifies dose (several sessions a week, substantial walking time per session at target intensity), progression rules (raise speed, incline, task complexity or reduce support as he adapts), safety monitoring (blood pressure before and after, heart rate and RPE during, stop criteria, harness or guarding for high-speed treadmill work, AFO and cane adjustments as speed improves) and reassessment of gait speed and 6MWT with the 0.16 m/s MCID in mind.",
              "Three sessions a week, 30-40 minutes of walking at target intensity each, for 8-12 weeks. Progress by increasing speed and incline first, then task complexity (dual tasks, crowds, uneven ground) and reducing cane use when safe. Check blood pressure before and after, monitor heart rate and RPE throughout, use a harness for fast treadmill bouts, and reassess his AFO as he speeds up. Re-test 10 m walk and 6MWT every 4 weeks; a gain of 0.16 m/s or more is clinically meaningful."
            ),
          ],
        },
      ],
    },
    {
      slug: "ncs-parkinson-progression",
      objective: "Intervention in progressive conditions: Parkinson disease, multiple sclerosis, ALS and dementia, including fatigue and exercise dosing",
      kind: "case",
      title: "Parkinson disease: prescribing now and adapting later",
      brief:
        "A fictional 68-year-old woman with Parkinson disease (Hoehn and Yahr stage 2, diagnosed 4 years ago) is referred for an exercise program. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She has mild bilateral bradykinesia and rigidity, no falls, walks 1.1 m/s, has a Mini-BESTest of 24/28, and reports she has stopped her twice-weekly gym classes because she 'does not know what is safe'. Cognition is intact. Her medications are stable and she has no orthostatic symptoms.",
          ask: "Prescribe her program for the next 3 months using the APTA Parkinson disease guideline.",
          parts: [
            part(
              "Program components",
              "Prescribes the guideline's strongly recommended components: moderate- to high-intensity aerobic exercise, progressive resistance training and balance training, plus gait and task-specific training and community-based exercise with behavior-change strategies to keep her active, framed within an integrated care approach.",
              "All three strong recommendations: aerobic exercise at moderate to high intensity (brisk treadmill walking or cycling 3 times a week, progressing to 30-40 minutes), progressive resistance training twice a week for legs, trunk and arms, and balance training (dynamic, multi-directional stepping, dual-task) 2-3 times a week, with gait training using big amplitude steps. Get her back into community classes -- boxing, dance or Tai Chi-type groups -- and use goal-setting and self-monitoring so it sticks."
            ),
            part(
              "Dosing, education and monitoring",
              "Dosing with intensity targets (heart-rate reserve or RPE for aerobic work, progressive load for resistance), education that exercise is safe and part of treatment and about medication timing relative to sessions ('on' time), monitoring for fatigue, orthostatic symptoms and falls, and reassessment with gait speed and balance measures at 3 months.",
              "Aerobic effort at 'somewhat hard to hard' (RPE 13-16 or the matching heart-rate reserve), resistance loads that make 8-12 reps hard, progressed every 1-2 weeks. Tell her plainly that exercise is treatment and safe for her, schedule sessions in her medication 'on' window, and watch for fatigue, light-headedness and near-falls. Re-measure gait speed, Mini-BESTest and a 6-minute walk at 3 months."
            ),
          ],
        },
        {
          text: "Two years later she returns (Hoehn and Yahr stage 3). She now has freezing of gait in doorways and when turning, two falls in 6 months, a gait speed of 0.7 m/s, and her blood pressure falls 28 mm Hg systolic on standing with light-headedness (new since a medication change). She still wants to exercise.",
          ask: "Adapt the program to the new problems.",
          parts: [
            part(
              "Freezing and falls",
              "Adds external cueing (visual lines, auditory metronome, attentional strategies) for freezing of gait and task-specific practice of turning and doorway transitions, continues balance and resistance training with falls precautions, and considers cycling over treadmill walking for aerobic work given freezing and fall risk, as the guideline suggests.",
              "Add external cues: floor lines at the kitchen doorway, a metronome or counting for turns, and 'stop, stand tall, shift weight, big step' as her freeze strategy, practiced in real doorways and turning tasks. Keep progressive resistance and balance training with a spotter or rail. For aerobic work move from treadmill to a stationary or recumbent bike, which the guideline says to consider for people with freezing or high fall risk."
            ),
            part(
              "Orthostatic hypotension",
              "Recognizes orthostatic hypotension (a 28 mm Hg systolic drop with symptoms, a fall of 20 mm Hg systolic or 10 diastolic within 3 minutes meets the definition), refers back to the physician for medication review, and adapts sessions: staged position changes, avoid prolonged standing immediately after exercise, hydration per physician advice, compression garments if prescribed, and monitor blood pressure before and after sessions.",
              "A 28 mm Hg systolic fall with light-headedness is orthostatic hypotension (the definition is 20 systolic or 10 diastolic within 3 minutes) -- send the physician the numbers and the timing with the medication change. In sessions: sit before standing, pause and count to 20, ankle pumps, no long standing right after exercise, check BP before and after, and ask about compression stockings and fluid advice from her physician."
            ),
          ],
        },
      ],
    },
    {
      slug: "ncs-core-measures-discharge-decision",
      objective: "Selecting outcome measures and using them to guide discharge and transition of care",
      kind: "build",
      title: "Reading the core measures at the discharge meeting",
      brief:
        "A fictional 59-year-old woman is 7 weeks after a right pontine stroke in an inpatient rehabilitation unit. Admission to today: Berg Balance Scale 31 to 42; 10 m walk test (comfortable) 0.38 to 0.61 m/s; 6-minute walk 95 to 190 m; Functional Gait Assessment 9 to 19 of 30; Activities-specific Balance Confidence scale 35% to 58%; five-times sit-to-stand 24 to 14 s. She walks 150 m with a cane and supervision, and her husband works days. The team meeting must decide between discharge home with outpatient therapy and a further 2 weeks. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Interpret the core-measure changes against published values, state what they say about her readiness and remaining risk, and make a recommendation with the plan for the next setting.",
          parts: [
            part(
              "Interpretation",
              "Interprets each change against published figures: Berg +11 from a baseline in the 25-34 band exceeds the 7-point MDC, so a true change; 10 m walk +0.23 m/s exceeds the 0.16 m/s stroke MCID; 6MWT doubled; FGA 19 is a real gain but remains below the 22/30 fall-risk cut-off; ABC 58% shows balance confidence is still limited; five-times sit-to-stand much faster, consistent with strength gains.",
              "Berg 31 to 42: for a start in the 25-34 band the MDC is 7 points, so +11 is real. Comfortable gait speed +0.23 m/s beats the 0.16 m/s stroke MCID. 6MWT 95 to 190 m is doubled endurance. FGA 9 to 19 is a solid gain but 19 is still under the 22/30 cut-off that classifies fall risk. ABC 58% says she does not yet trust her balance. Sit-to-stand 24 to 14 s shows the legs are stronger."
            ),
            part(
              "Readiness and risk",
              "Concludes she has made clinically meaningful progress and is approaching household/limited community mobility, but remaining fall risk (FGA below cut-off, low confidence, supervision still needed for walking, husband away during the day) is the specific barrier to safe discharge, and identifies what would mitigate it.",
              "She is clearly improving at a meaningful rate, but she still needs supervision to walk, her FGA says she is at fall risk, and her confidence is low -- and she would be alone for 8 hours a day. The risk is a fall at home in the first weeks, not a lack of progress."
            ),
            part(
              "Recommendation and plan",
              "Makes a defensible recommendation either way with mitigation: for example discharge home with intensive outpatient or home-based therapy only if daytime supervision or a safe routine can be arranged (equipment, home assessment, husband trained, emergency plan), or a short, goal-specific extension (independence in household ambulation, FGA above the fall-risk cut-off) with continued measurement; names the measures to carry into the next setting.",
              "Recommend a short, goal-specific extension of up to 2 weeks with explicit targets -- independent household walking with the cane, FGA of 22 or more, ABC trending up -- and a home visit to set up equipment and a daytime safety routine, then home with outpatient therapy. If the payer declines, discharge home is defensible only with a trained husband, a morning carer or neighbor check, a bedside commode and no stairs alone. Either way, carry the same core measures (10 m walk, 6MWT, Berg, FGA, ABC, 5xSTS) into the next setting so progress is measured against today."
            ),
          ],
        },
      ],
    },
  ],
};
