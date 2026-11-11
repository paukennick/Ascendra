import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-147: NPTE-PT (FSBPT, physical therapist licensure examination).
//
// Aligned to FSBPT's NPTE-PT Test Content Outline in effect since January
// 2024 (still current on FSBPT's NPTE content page, checked 2026-11-07; the
// NPTE Candidate Handbook is still Version 2025.02) and to the course's
// units in seed/tracks/pt.ts, which carry FSBPT's item ranges.
// Density ("hybrid", the content test checks it): 3/3/2/2 for the four
// heaviest systems, then 1 for each of the other ten domains = 20 labs
// (7 build, 13 case). Case labs walk the patient-management model the exam
// tests: examination, evaluation, diagnosis, prognosis, intervention, then
// progression, discharge or referral.
//
// SAFETY: every patient is fictional; this is practice for the exam, not
// clinical guidance. Where practice varies by facility (hold parameters,
// oxygen orders, who is called first), the rubric asks for "per order / per
// facility protocol" instead of one number, and fixed numbers that a
// scenario needs are given in the case as the fictional order or plan. All
// of it is needs_expert_review until a licensed physical therapist educator
// approves it (docs/labs.md).
//
// Values quoted as standards, and where each was verified on 2026-11-07
// (full text read through NCBI E-utilities or the publisher's PDF; abstract
// where noted):
// - LBP CPG: George SZ et al. Interventions for the management of acute and
//   chronic low back pain: revision 2021. JOSPT 2021;51(11):CPG1-CPG60.
//   doi:10.2519/jospt.2021.0304 (PMC10508241). Repeated movements toward
//   centralization for acute LBP with referred leg pain; MDT "can"/"may" be
//   used; education must not raise threat or rely on bed rest.
// - ODI minimal important change 10 points (0-100) or 30% from baseline;
//   NPRS 2 points: Ostelo RW et al. Spine 2008;33(1):90-94,
//   doi:10.1097/BRS.0b013e31815e3a10 (abstract).
// - TKA CPG: Bove AM et al. Clinical practice guideline for physical
//   therapist management of total knee arthroplasty: revision 2026. Phys
//   Ther 2026, doi:10.1093/ptj/pzag058 (PMC13403188): no CPM for primary
//   uncomplicated TKA; P/AA/AROM; NMES to the quadriceps at least daily,
//   early, at the highest tolerable intensity; progressive strengthening
//   early; motor function training; cryotherapy and elevation; no routine
//   MLD, compression dressings or CPM for swelling.
// - LEFS minimal clinically important difference 9 points: Binkley JM et al.
//   Phys Ther 1999;79(4):371-383, PMID 10201543 (abstract).
// - Locomotor CPG: Hornby TG et al. J Neurol Phys Ther 2020;44(1):49-100,
//   doi:10.1097/NPT.0000000000000303 (abstract): walking training at
//   moderate to high intensity (strong) for ambulatory people more than 6
//   months after stroke; body weight-supported treadmill, robotic training
//   and balance training without virtual reality should not be used to
//   improve walking speed or distance.
// - Gait speed: small meaningful change about 0.05 m/s, substantial about
//   0.10 m/s (Perera S et al. J Am Geriatr Soc 2006;54(5):743-749,
//   doi:10.1111/j.1532-5415.2006.00701.x, abstract; older adults and
//   subacute stroke survivors).
// - Autonomic dysreflexia: Consortium for Spinal Cord Medicine (PVA),
//   Evaluation and Management of Autonomic Dysreflexia and Other Autonomic
//   Dysfunctions, 2020 (PVA PDF, 2025 printing): systolic BP more than 20
//   mm Hg above baseline in adults; sit up and lower the legs; loosen
//   clothing and devices; BP and pulse every 1-2 minutes; check the urinary
//   system first; afterwards watch for hypotension.
// - Parkinson disease CPG: Osborne JA et al. Phys Ther 2022;102(4):pzab302,
//   doi:10.1093/ptj/pzab302 (PMC9046970): aerobic, resistance, balance,
//   gait, task-specific training, external cueing, community exercise and
//   behaviour change; moderate intensity mostly 60-75% and high 75-85% of
//   maximum heart rate in the trials.
// - Exercise screening and stopping criteria: Taylor JL, Myers J,
//   Bonikowske AR. Practical guidelines for exercise prescription in
//   patients with chronic heart failure. Heart Fail Rev 2024,
//   doi:10.1007/s10741-023-10310-9 (PMC10847087), Tables 1-2 adapted from
//   ACSM's Guidelines for Exercise Testing and Prescription, 11th ed.: stop
//   for angina, SBP >= 250 or DBP >= 115 mm Hg, a fall in SBP of more than
//   10 mm Hg with increasing workload, signs of poor perfusion; weight gain
//   of 1.8 kg (4 lb) or more over 1-3 days is a relative contraindication.
//   ACSM's own site returned HTTP 403, so the ACSM values are cited through
//   this peer-reviewed table.
// - Hypoglycemia: ADA, Hypoglycemia guidelines for health care
//   professionals (based on the Standards of Care; PDF dated 2025-05-27):
//   level 1 below 70 mg/dL, level 2 below 54 mg/dL, level 3 altered status
//   needing help; 15 g fast-acting carbohydrate, recheck in 15 minutes,
//   repeat until resolved; glucagon if the person cannot take it by mouth.
//   ADA Standards of Care in Diabetes-2026 section 6, doi:10.2337/dc26-S006.
// - Falls CPG: Kirk-Sanchez N et al. J Geriatr Phys Ther 2025;48(2),
//   doi:10.1519/JPT.0000000000000454 (PMC12533762): Berg < 50, TUG > 11 s,
//   single-leg stance < 6.5 s, 5 times sit-to-stand > 12 s, gait speed
//   < 1.0 m/s; exercise at least 150 minutes to 3 hours a week for 6 to 12
//   months with progressive, challenging balance training.
// - BCRL CPG: Davies C et al. Phys Ther 2020;100(7):1163-1179,
//   doi:10.1093/ptj/pzaa087 (PMC7412854): ISL stage I -> fitted compression
//   garment, exercise and education first; CDT for moderate and late stages.
// - DFU CPG: Phys Ther 2025;105(3):pzae171, doi:10.1093/ptj/pzae171
//   (PMC11962593): after closure, titrate reloading with moderate to maximal
//   offloading especially for the first 3 months and a shoe wear schedule.
// - Pressure injury stages: NPIAP 2016 (Edsberg LE et al. J Wound Ostomy
//   Continence Nurs 2016;43(6):585-597, doi:10.1097/WON.0000000000000281).
// - Diabetes-related foot infection: IWGDF/IDSA 2023, Clin Infect Dis
//   2023, doi:10.1093/cid/ciad527 (signs named qualitatively only).
// - Medicare plan of care, certification and progress reports: CMS Medicare
//   Benefit Policy Manual ch. 15 (Rev. 13889, issued 2026-07-30), sec.
//   220.1.2, 220.1.3, 220.3, read from the CMS PDF on 2026-11-07.
// Values NOT used because they could not be verified on an official page
// today: an SpO2 target range as a guideline figure (oxygen targets appear
// only as the fictional physician's order), the Wells DVT point scores, and
// resting blood-pressure exercise limits outside heart failure.

export const NPTEPT_LABS: SeedLabSet = {
  trackCode: "NPTEPT",
  sources: [
    source("https://www.fsbpt.org/Portals/0/documents/free-resources/2024-PT-Test-Content-Outline-Bullets.pdf", "exam_outline", "2026-11-07"),
    source("https://www.fsbpt.org/Free-Resources/NPTE-Development/NPTE-Content", "exam_outline", "2026-11-07"),
    source("https://doi.org/10.2519/jospt.2021.0304", "reference", "2026-11-07"),
    source("https://doi.org/10.1093/ptj/pzag058", "reference", "2026-11-07"),
    source("https://doi.org/10.1097/NPT.0000000000000303", "reference", "2026-11-07"),
    source("https://doi.org/10.1093/ptj/pzab302", "reference", "2026-11-07"),
    source("https://doi.org/10.1519/JPT.0000000000000454", "reference", "2026-11-07"),
    source("https://doi.org/10.1093/ptj/pzaa087", "reference", "2026-11-07"),
    source("https://doi.org/10.1093/ptj/pzae171", "reference", "2026-11-07"),
    source("https://doi.org/10.1007/s10741-023-10310-9", "reference", "2026-11-07"),
    source("https://pva.org/wp-content/uploads/2021/09/CPG_Autonomic-Dysreflexia_2025_digital_03.26-.pdf", "reference", "2026-11-07"),
    source("https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-hcp-5-27-25.pdf", "reference", "2026-11-07"),
    source("https://doi.org/10.1097/BRS.0b013e31815e3a10", "reference", "2026-11-07"),
    source("https://pubmed.ncbi.nlm.nih.gov/10201543/", "reference", "2026-11-07"),
    source("https://doi.org/10.1111/j.1532-5415.2006.00701.x", "reference", "2026-11-07"),
    source("https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/bp102c15.pdf", "reference", "2026-11-07"),
  ],
  labs: [
    // ---------------------------------------------------------------- Musculoskeletal (3)
    {
      slug: "pt-back-pain-malignancy-red-flags",
      objective: "Recognizing red flags that require referral rather than continued PT management",
      kind: "case",
      title: "Direct access: back pain that doesn't behave mechanically",
      brief:
        "A fictional 64-year-old retired electrician books a direct-access physical therapy visit for mid and low back pain that began 6 weeks ago without an injury. He was treated for prostate cancer 4 years ago and says he is \"all clear\". He has lost 6 kg in the last 2 months without trying, and the pain wakes him most nights and doesn't ease with any position. He wants \"some exercises and maybe a massage\".",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "History only so far: no fever, no bladder or bowel change, no leg weakness reported. Pain is 7/10, constant, and unchanged by sitting, standing or lying.",
          ask: "Which findings are red flags, what condition worries you most, and what do you check before deciding?",
          parts: [
            part(
              "Red flags",
              "Names at least three of: history of cancer, unexplained weight loss, constant/night pain not eased by position or rest, age over 50, no mechanical pattern; explains that together they raise suspicion of a serious (non-musculoskeletal) cause.",
              "Previous prostate cancer, 6 kg unexplained weight loss, constant pain that wakes him and doesn't change with position, age 64, and no mechanical behavior. Together they point away from simple mechanical back pain."
            ),
            part(
              "Leading concern",
              "Identifies possible spinal metastasis (malignancy) as the main concern, and notes metastatic spinal cord compression as the complication to screen for.",
              "Spinal metastasis from his prostate cancer, with the risk of spinal cord compression."
            ),
            part(
              "Focused screen",
              "Plans a brief, targeted examination that includes vital signs and a neurological screen (lower-limb strength, sensation, reflexes, gait, and upper motor neuron signs) plus questions on bladder/bowel and saddle sensation, without provocative treatment.",
              "Vital signs including temperature; lower-limb myotomes, dermatomes and reflexes, plus Babinski/clonus and gait; ask again about saddle numbness, bladder and bowel. No manipulation or vigorous testing."
            ),
          ],
        },
        {
          text: "Vitals are normal. Neurological screen is normal. Percussion over T10 reproduces sharp pain. He says he'd rather not \"bother the doctor\" and asks you to start treatment today.",
          ask: "What do you decide, and how do you handle the referral and his request?",
          parts: [
            part(
              "Decision",
              "Does not continue physical therapy management for now; refers him to his physician/oncologist promptly (same week or sooner per local pathway), and gives emergency advice (go to emergency care at once if leg weakness, numbness, saddle anesthesia or bladder/bowel change appear).",
              "Refer promptly to his oncologist or primary care physician for medical work-up before any PT treatment. Safety-net: if he develops leg weakness, numbness, saddle numbness, or bladder or bowel change, he goes to the emergency department immediately."
            ),
            part(
              "Communication",
              "Explains the reason to the patient honestly without diagnosing cancer, and sends the physician a written summary of the red flags and findings; documents the referral and the advice given.",
              "Tell him the pattern isn't typical of a muscle or joint problem and needs his doctor to check it first, without claiming a diagnosis. Send his physician a written note listing the history, weight loss, night pain and T10 percussion tenderness, and document the referral and safety-net advice."
            ),
          ],
        },
      ],
    },
    {
      slug: "pt-lbp-centralization-progression",
      objective:
        "Use repeated-movement testing in low back pain with referred symptoms to look for centralization and a directional preference, and let the direction that centralizes symptoms guide the exercise chosen",
      kind: "case",
      title: "Acute low back pain with thigh pain: test, treat, progress",
      brief:
        "A fictional 38-year-old warehouse supervisor has had low back pain for 10 days after a day of lifting boxes, with pain into the right buttock and back of the thigh, not below the knee. Red-flag screening is negative and the neurological screen is normal. Oswestry Disability Index (ODI) is 44%; pain is 7/10 on the numeric pain rating scale (NPRS). Sitting makes it worse; walking eases it.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "In standing, 10 repeated flexions make the thigh pain spread further down the thigh. Ten repeated extensions in lying move the pain from the thigh up to the right side of the low back, and it stays there afterwards; lumbar extension range improves.",
          ask: "Interpret the repeated-movement findings and state the classification that guides treatment.",
          parts: [
            part(
              "Interpretation",
              "Identifies flexion as peripheralizing and repeated extension as centralizing (pain retreating toward the spine and staying), with improved mechanics, i.e. an extension directional preference.",
              "Repeated flexion peripheralizes (pain spreads distally); repeated extension in lying centralizes it to the back and the change lasts, with better extension range -- a directional preference for extension."
            ),
            part(
              "Classification and prognosis",
              "Classifies acute LBP with related (referred) lower-extremity pain and centralization/directional preference (e.g. MDT derangement or TBC 'specific exercise' group), and states that centralization is a favorable prognostic sign.",
              "Acute low back pain with referred leg pain that centralizes with extension -- a directional-preference (specific exercise) subgroup. Centralization is a favorable prognostic sign."
            ),
          ],
        },
        {
          text: "You plan the first two weeks.",
          ask: "Write the core of the intervention plan and the education you give.",
          parts: [
            part(
              "Exercise",
              "Prescribes repeated extension exercise in the centralizing direction (e.g. prone press-ups) at a stated frequency through the day, with the rule that symptoms should centralize or stay central and not peripheralize; links this to the 2021 LBP CPG recommendation on repeated movements toward centralization.",
              "Prone press-ups, about 10 repetitions every 2-3 waking hours, plus standing extension when sitting has been prolonged. Rule: keep doing it if pain centralizes or stays in the back; stop and tell me if it spreads down the leg. The 2021 LBP CPG supports repeated movements toward centralization for acute LBP with referred leg pain."
            ),
            part(
              "Education",
              "Gives active, reassuring education: favorable prognosis, staying active and returning to normal or modified work, avoiding bed rest and avoiding threatening pathoanatomical explanations; addresses sitting (breaks, lumbar support).",
              "Back pain like this usually settles well; staying active and keeping working with modified lifting helps more than rest. No bed rest. Break up sitting every 20-30 minutes and use a lumbar roll. I avoid scary structural explanations."
            ),
          ],
        },
        {
          text: "Visit 5, three weeks in: pain is now only in the central low back and 3/10; ODI has fallen from 44% to 24%. He wants to return to full lifting duties next month.",
          ask: "Is the change meaningful, and how do you progress the plan toward discharge?",
          parts: [
            part(
              "Meaningful change",
              "Calculates the ODI change (20 points, about 45% from baseline) and NPRS change (4 points) and judges both above the minimal important change (ODI 10 points or 30%; NPRS 2 points).",
              "ODI 44% to 24% is 20 points (45% of baseline) and NPRS 7 to 3 is 4 points -- both beyond the minimal important change of about 10 ODI points or 30%, and 2 NPRS points."
            ),
            part(
              "Progression",
              "Progresses from symptom-guided extension to restoring function: trunk strengthening/endurance and graded lifting practice specific to his job, monitoring that symptoms stay central; keeps the extension exercise as a self-management tool for flare-ups.",
              "Add trunk strengthening and endurance work and graded, job-specific lifting practice, building load each week while symptoms stay central. Keep the press-ups as his flare-up tool."
            ),
            part(
              "Discharge plan",
              "Sets a functional discharge criterion (e.g. lifting his job's loads with no peripheralization), a self-management home program, and return advice (come back or seek care if leg pain or neurological symptoms return).",
              "Discharge when he lifts his job's heaviest boxes with good form and no leg symptoms, with a written home program and the advice to return if pain spreads into the leg again or any numbness or weakness appears."
            ),
          ],
        },
      ],
    },
    {
      slug: "pt-tka-plan-dvt-discharge",
      objective:
        "Plan total knee arthroplasty rehab as the 2026 APTA guideline does: passive, active-assisted and active range of motion rather than continuous passive motion, progressive strengthening, and daily quadriceps NMES started early",
      kind: "case",
      title: "Outpatient care after a total knee replacement",
      brief:
        "A fictional 69-year-old retired teacher is 10 days after a primary, uncomplicated right total knee arthroplasty and starts outpatient physical therapy. Knee range of motion is 8 to 85 degrees, there is a 10-degree quadriceps lag on straight-leg raise, moderate swelling, and he walks with a rolling walker. His Lower Extremity Functional Scale (LEFS) score is 24 (higher is better). He asks whether he should rent a continuous passive motion (CPM) machine.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "There are no wound concerns and no signs of infection. His goal is to walk his dog 1 km and garden.",
          ask: "Write the main components of your plan of care and answer his CPM question.",
          parts: [
            part(
              "Range of motion and swelling",
              "Uses passive, active-assisted and active ROM exercise for both extension and flexion (not CPM), and cryotherapy with elevation for swelling; does not rely on routine compression dressings or manual lymphatic drainage.",
              "Passive, active-assisted and active ROM for flexion and especially extension (heel props, wall slides, bike rocking). Cryotherapy and elevation for swelling."
            ),
            part(
              "Strength and NMES",
              "Includes quadriceps NMES at least daily, started early at the highest tolerable intensity, plus progressive strengthening started early (e.g. open and closed chain, progressed by load) and motor function/balance and gait training.",
              "Daily quadriceps NMES at the highest intensity he tolerates, alongside progressive strengthening (quad sets to sit-to-stand, step-ups, leg press) increased by load each week, plus balance and gait training to wean the walker."
            ),
            part(
              "CPM answer",
              "Advises against CPM for a primary uncomplicated TKA because the guideline recommends not using it (no meaningful benefit), explains the active ROM plan instead, and respects his preferences in the discussion.",
              "The 2026 APTA guideline advises against CPM after an uncomplicated knee replacement because it doesn't improve the outcome; your own active exercises do the job. It's your choice, but I'd not spend money on one."
            ),
          ],
        },
        {
          text: "Week 3: he reports new aching in the right calf. The calf is visibly swollen compared with the left, warm and tender along the back; he has no chest pain or shortness of breath.",
          ask: "What do you do with today's session?",
          parts: [
            part(
              "Recognise",
              "Recognizes signs consistent with possible deep vein thrombosis (unilateral calf swelling, warmth, tenderness after recent surgery).",
              "Unilateral calf swelling, warmth and tenderness three weeks after knee replacement could be a deep vein thrombosis."
            ),
            part(
              "Act",
              "Holds exercise and manual treatment of the leg, contacts the surgeon/physician the same day for urgent medical evaluation per protocol, and instructs him to call emergency services if chest pain or sudden breathlessness occur; documents.",
              "Stop the session -- no exercise, massage or compression on that leg. Call the surgeon's office now for same-day evaluation, and tell him to call emergency services if he gets chest pain or sudden shortness of breath. Document findings and the call."
            ),
          ],
        },
        {
          text: "Ultrasound ruled out a DVT. Eight weeks after surgery: ROM is 0 to 118 degrees, no quadriceps lag, he walks 1 km without a device, and his LEFS is 52.",
          ask: "Interpret the outcome and decide what happens next.",
          parts: [
            part(
              "Interpret LEFS",
              "Calculates a 28-point LEFS gain and judges it well above the minimal clinically important difference of 9 points.",
              "LEFS rose 28 points (24 to 52), far more than the 9-point minimal clinically important difference."
            ),
            part(
              "Next step",
              "Plans discharge or tapering once goals are met (or near met), with a progressive home/community strengthening and activity program, and documents a discharge summary with outcome measures; may continue briefly only if a measurable functional goal (e.g. gardening tasks, stairs) still needs skilled care.",
              "His walking goal is met. Taper to a final visit or two for gardening tasks (kneeling, lifting), then discharge with a progressive home strengthening program and advice to stay active, documenting ROM, LEFS and walking distance."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Neuromuscular and Nervous (3)
    {
      slug: "pt-chronic-stroke-locomotor",
      objective: "Managing common neurological diagnoses: stroke, spinal cord injury, traumatic brain injury, and peripheral neuropathy",
      kind: "case",
      title: "Nine months after a stroke: getting faster walking",
      brief:
        "A fictional 58-year-old bus dispatcher had a left middle cerebral artery stroke 9 months ago. She walks independently with a single-point cane, comfortable gait speed 0.45 m/s on the 10-meter walk test, and wants to walk to the bus stop and back to work part-time. She takes a beta-blocker. Her physician has cleared her for aerobic exercise.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You have 2 sessions a week for 8 weeks. The clinic has a treadmill with a harness, a robotic gait trainer, foam balance pads and a hallway.",
          ask: "Which locomotor intervention do you choose and how do you dose and monitor it?",
          parts: [
            part(
              "Intervention",
              "Chooses walking (locomotor) training at moderate to high intensity -- overground and/or treadmill -- with large amounts of stepping practice, citing the locomotor CPG for people more than 6 months after stroke.",
              "Moderate- to high-intensity walking training on the treadmill and overground, aiming for as many steps as possible each session, as the locomotor CPG strongly recommends after the 6-month point."
            ),
            part(
              "What to avoid",
              "States that body weight-supported treadmill training, robotic-assisted gait training and balance training without virtual reality should not be used to improve walking speed or distance in this group.",
              "Not the robotic trainer, body weight-supported treadmill work, or foam-pad balance training as the main way to speed up walking -- the CPG advises against them for that goal."
            ),
            part(
              "Dosing with a beta-blocker",
              "Recognizes the beta-blocker blunts heart-rate response, so uses perceived exertion (and/or a heart-rate range from a measured response) to set intensity, and monitors BP, symptoms and safety (guarding/harness for falls).",
              "Because the beta-blocker blunts her heart rate, I set intensity mainly by rating of perceived exertion, with heart rate and blood pressure checked before, during and after, and a harness or close guarding at higher speeds."
            ),
          ],
        },
        {
          text: "After 8 weeks her comfortable gait speed is 0.63 m/s and she walks to the bus stop without stopping.",
          ask: "Interpret the change and set the next goal or plan.",
          parts: [
            part(
              "Interpretation",
              "Calculates +0.18 m/s and judges it beyond the commonly cited substantial meaningful change (about 0.10 m/s).",
              "Gait speed rose 0.18 m/s (0.45 to 0.63), above the roughly 0.10 m/s usually treated as a substantial meaningful change."
            ),
            part(
              "Next step",
              "Sets a measurable next goal tied to participation (e.g. community distances/return to work) and a plan to keep high-intensity walking practice going (home/community program), or plans discharge with a maintenance program if goals are met.",
              "Next goal: walk 500 m to her workplace from the bus within 4 weeks; continue the intensity-based walking program 3 times a week, moving it to a community walking routine she can keep up after discharge."
            ),
          ],
        },
      ],
    },
    {
      slug: "pt-autonomic-dysreflexia-session",
      objective:
        "Recognize autonomic dysreflexia when the spinal cord lesion is at T6 or higher -- a sudden severe headache with a blood pressure surge -- sit the patient up with legs down, loosen anything tight, and look for a trigger such as a full bladder or bowel",
      kind: "case",
      title: "A pounding headache on the mat",
      brief:
        "A fictional 27-year-old with a complete T4 spinal cord injury from a fall 5 months ago is in inpatient rehabilitation. His usual blood pressure is about 100/64 mm Hg. He uses an indwelling catheter with a leg bag and wears an abdominal binder. You are working on mat transfers, with him lying supine.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He suddenly reports a pounding headache. His face is flushed and sweaty above the level of injury; his skin below is pale. Blood pressure is 172/98 mm Hg, heart rate 54 /min.",
          ask: "What is happening and what do you do in the first minutes?",
          parts: [
            part(
              "Recognition",
              "Identifies autonomic dysreflexia: lesion above T6, systolic BP more than 20 mm Hg above his baseline with headache, flushing/sweating above the lesion and relative bradycardia; treats it as a medical emergency.",
              "Autonomic dysreflexia -- T4 lesion, systolic up about 70 mm Hg from his baseline, pounding headache, flushing and sweating above the injury, slow pulse. It's an emergency."
            ),
            part(
              "Immediate actions",
              "Sits him up and lowers the legs, loosens clothing and devices (abdominal binder, leg-bag straps), monitors BP and pulse every 1-2 minutes, calls for help (nurse/physician) per protocol, and stays with him.",
              "Sit him up straight with legs down, loosen the binder and leg-bag straps and anything tight, recheck BP and pulse every 1-2 minutes, and call the nurse and physician now without leaving him."
            ),
            part(
              "Find the trigger",
              "Checks the urinary system first (catheter and tubing kinks, full leg bag), then other noxious stimuli (bowel, skin pressure, tight clothing).",
              "Start with the bladder: follow the catheter and tubing for kinks, check whether the leg bag is full. Then skin pressure points, tight clothing, and bowel."
            ),
          ],
        },
        {
          text: "The catheter tubing is kinked under his thigh. Once it is straightened, 600 mL of urine drains, his headache eases and BP falls to 118/70 mm Hg over 10 minutes.",
          ask: "What do you monitor and document now, and what changes for future sessions?",
          parts: [
            part(
              "After the episode",
              "Keeps monitoring BP for a period afterwards, including for hypotension after the trigger is removed, before resuming upright activity; hands over to nursing.",
              "Keep checking BP every few minutes until stable, watching for a drop now the trigger is gone, and only then decide with nursing whether to resume. Hand over to the nurse."
            ),
            part(
              "Documentation and prevention",
              "Documents signs, BP readings, trigger, actions and response; plans prevention (check catheter/tubing and bag before positioning, avoid tight straps) and teaches him and caregivers to recognize and direct care for AD.",
              "Document symptoms, BP trend, the kinked tubing, actions and recovery. Before each session check the catheter, tubing and bag; teach him to recognize the signs and tell staff what to do, and suggest a wallet card."
            ),
          ],
        },
      ],
    },
    {
      slug: "pt-parkinson-plan-of-care",
      objective:
        "Apply the strong Parkinson disease recommendations: moderate- to high-intensity aerobic exercise, balance training, gait training, and external cueing to reduce freezing of gait",
      kind: "build",
      title: "Write the intervention plan for Parkinson disease",
      brief:
        "A fictional 66-year-old retired accountant with Parkinson disease (Hoehn and Yahr stage 2.5, diagnosed 5 years ago) has slowed walking with short steps, occasional freezing in doorways and when turning, and one near-fall this month. He is physically able and medically cleared for vigorous exercise; his measured resting heart rate is 70 /min and his age-predicted maximum heart rate is 154 /min. He wants to keep playing golf.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the intervention section of his plan of care.",
          parts: [
            part(
              "Aerobic exercise",
              "Prescribes moderate- to high-intensity aerobic exercise (e.g. treadmill or cycling) with an intensity target -- for example about 60-85% of maximum heart rate, i.e. roughly 92-131 /min from 154 -- plus frequency and duration.",
              "Treadmill walking or cycling 3 times a week, 30-40 minutes, at moderate to high intensity: about 60-85% of his maximum heart rate (roughly 92-131 /min), working toward the upper part as tolerated."
            ),
            part(
              "Balance and gait",
              "Includes progressive, challenging balance training and gait training (e.g. long-step walking, turning practice, dual-task), named as strong CPG recommendations.",
              "Balance training that keeps getting harder (narrow base, reaching, perturbations, dual-task) and gait training for step length and turning practice in the patterns where he freezes."
            ),
            part(
              "Cueing for freezing",
              "Uses external cues (auditory such as a metronome, visual such as floor lines, or attentional strategies) for freezing of gait, practiced in doorways and turns.",
              "External cues for freezing: metronome beats set slightly above his comfortable cadence and visual lines on the floor at doorways; practice wide arc turns with a counting strategy."
            ),
            part(
              "Strength and behavior change",
              "Adds progressive resistance training and behaviour-change/community exercise strategies (goal setting, golf-related tasks, a community program) to keep activity up long term.",
              "Progressive resistance training twice a week (legs, trunk, rotation for golf); agree weekly activity goals with him and link him to a community exercise class he'll keep going to."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Cardiovascular and Pulmonary (2)
    {
      slug: "pt-hf-stop-criteria",
      objective: "Recognizing signs of cardiopulmonary decompensation that require stopping treatment or emergency response",
      kind: "case",
      title: "Heart failure on the ward: start, stop or call?",
      brief:
        "A fictional 72-year-old retired mail carrier with chronic heart failure (reduced ejection fraction) was admitted 4 days ago with an exacerbation and is now on oral diuretics. The plan is progressive ambulation before discharge home. Yesterday he walked 60 m with a rolling walker; resting blood pressure was 124/72 mm Hg and heart rate 78 /min.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Before today's session: he says he couldn't lie flat last night and used three pillows. The chart shows his weight is up 2.0 kg since yesterday. He has new ankle swelling and is breathless talking in full sentences at rest.",
          ask: "Do you start the walk? Explain and say what you do.",
          parts: [
            part(
              "Decision",
              "Does not progress exercise today; recognizes signs of worsening heart failure (weight gain of 1.8 kg/4 lb or more over 1-3 days, orthopnea, new edema, dyspnea at rest) as reasons to hold or limit exercise.",
              "No walk today. A 2 kg gain overnight (above the 1.8 kg / 4 lb in 1-3 days flag), new orthopnea, new ankle edema and breathlessness at rest are signs his heart failure is worsening."
            ),
            part(
              "Action",
              "Reports the findings to the nurse and physician promptly, documents them, and limits activity to what the team approves (e.g. positioning, gentle bed-level activity) until he is reassessed.",
              "Tell the nurse and the physician now with the weight, orthopnea and edema, document it, and keep him to bed or chair level until the team reviews his diuretics."
            ),
          ],
        },
        {
          text: "Two days later the team clears him. Resting BP 128/74 mm Hg, HR 80. At 3 minutes of walking at a slightly faster pace his systolic BP is 112 mm Hg, he looks pale and sweaty and says his chest feels \"tight\".",
          ask: "What do you do, and why?",
          parts: [
            part(
              "Stop criteria",
              "Stops immediately, citing a fall in systolic BP of more than 10 mm Hg with increasing workload plus chest discomfort and poor perfusion signs (pallor, diaphoresis) as stopping criteria.",
              "Stop now: systolic BP has fallen 16 mm Hg as the workload increased, and he has chest tightness, pallor and sweating -- all reasons to end exercise."
            ),
            part(
              "Emergency response",
              "Sits or lies him down safely, stays with him, calls for help/activates the rapid response per protocol (chest symptoms), repeats vital signs and SpO2, and is ready to start basic life support if he becomes unresponsive.",
              "Sit him in the chair, call for the nurse and activate the rapid response team for chest pain, recheck BP, HR and SpO2 every couple of minutes, and stay ready to start CPR if he becomes unresponsive."
            ),
          ],
        },
        {
          text: "The team finds new ischemic changes on his ECG and changes his medication. He is cleared again 3 days later.",
          ask: "How do you set and monitor his next sessions?",
          parts: [
            part(
              "Restart plan",
              "Restarts at a lower intensity (e.g. short bouts, RPE about 11-12) with vital signs before, during and after, progressing duration before intensity, and keeps the stopping criteria (angina, SBP fall over 10 mm Hg with work, SBP 250 or DBP 115 mm Hg or above, signs of poor perfusion) explicit in the plan.",
              "Short walks of 2-3 minutes with rests at an RPE of about 11-12, checking BP, HR, SpO2 and symptoms before, during and after; lengthen bouts before raising pace. Stop for chest symptoms, a systolic drop of more than 10 mm Hg with work, BP of 250/115 or higher, or pallor or dizziness."
            ),
          ],
        },
      ],
    },
    {
      slug: "pt-copd-spo2-dyspnea",
      objective: "Interpreting oxygen saturation, RPE, and dyspnea scales during activity",
      kind: "case",
      title: "COPD on the treadmill: reading the numbers",
      brief:
        "A fictional 67-year-old former welder with COPD starts outpatient pulmonary rehabilitation. His pulmonologist's order: supplemental oxygen 2 L/min by nasal cannula during exercise, titrate to keep SpO2 88-92%, up to 4 L/min. The plan targets dyspnea of 4-6 on the Borg CR10 scale during endurance work.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At minute 4 of treadmill walking on 2 L/min: SpO2 85% with a good pleth waveform, dyspnea 7/10, RPE 15, HR 118 /min; he is using accessory muscles but can still speak in short phrases.",
          ask: "Interpret the readings and say what you do now.",
          parts: [
            part(
              "Interpretation",
              "Identifies SpO2 below the ordered range (with a reliable signal) and dyspnea above the target band, i.e. exercise intensity currently too high for the prescription.",
              "SpO2 85% is below his ordered 88-92% and the waveform says the reading is real; dyspnea 7 is above the 4-6 target -- he is working harder than prescribed."
            ),
            part(
              "Response",
              "Reduces or stops the workload, coaches pursed-lip breathing and recovery position, titrates oxygen within the order (e.g. up toward 3-4 L/min) and rechecks; escalates to the physician if SpO2 doesn't recover or symptoms are severe.",
              "Stop the belt, have him rest leaning forward and use pursed-lip breathing, increase oxygen within the order to 3 L/min and recheck SpO2 and dyspnea; if he doesn't recover into range or looks worse, call the physician."
            ),
          ],
        },
        {
          text: "On 3 L/min, after 2 minutes' rest, SpO2 is 90% and dyspnea 4/10. He wants to keep exercising.",
          ask: "How do you structure the rest of today's and future endurance sessions?",
          parts: [
            part(
              "Session structure",
              "Uses interval training (bouts of work with rest) or a lower continuous speed so that dyspnea stays about 4-6 and SpO2 in the ordered range, monitoring both through the session.",
              "Switch to intervals -- 2 minutes walking, 1 minute rest -- at a speed that keeps dyspnea 4-6 and SpO2 88-92% on 3 L/min, checking both every bout."
            ),
            part(
              "Progression and reporting",
              "Progresses by time first, then speed/grade, guided by the dyspnea target; documents oxygen flow used and readings and informs the pulmonologist that exercise oxygen needs were higher than the starting order.",
              "Lengthen the work bouts session by session, then add speed or grade when he stays in the target. Document the flow rates and readings and let the pulmonologist know he needed 3 L/min to stay in range."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Integumentary (2)
    {
      slug: "pt-classify-four-wounds",
      objective: "Classifying wounds by etiology and staging pressure injuries correctly",
      kind: "build",
      title: "Classify four wounds and name what changes the plan",
      brief:
        "On a wound clinic list are four fictional patients. (A) 71-year-old: shallow, irregular wound above the medial malleolus with heavy drainage, brown discoloration of the surrounding skin and leg edema that is worse at the end of the day; pedal pulses present. (B) 78-year-old smoker: small round wound with a pale base on the lateral side of the fifth toe; shiny hairless skin, absent pedal pulses; pain worse lying with the legs up, better hanging over the bed. (C) 59-year-old with diabetes: wound under the first metatarsal head surrounded by callus; cannot feel a monofilament on the foot. (D) 84-year-old bed-bound: sacral wound with full-thickness skin loss; subcutaneous fat and granulation tissue are visible across the whole base; no bone, tendon or muscle visible; no slough or eschar.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each wound, name the type (or stage) and one management implication that follows from it.",
          parts: [
            part("Wound A", "Venous (insufficiency) ulcer; implication: compression therapy (after arterial status is confirmed adequate) and elevation.", "Venous leg ulcer -- medial gaiter area, heavy exudate, hemosiderin staining, edema. Compression (once arterial supply is confirmed adequate) and elevation."),
            part("Wound B", "Arterial (ischemic) ulcer; implication: no compression and no debridement of dry ischemic tissue until vascular assessment; refer for vascular evaluation.", "Arterial ulcer -- distal, punched-out, pale base, absent pulses, rest pain eased by dependency. Avoid compression and refer for vascular assessment before any debridement."),
            part("Wound C", "Neuropathic (diabetic) plantar ulcer; implication: offloading (e.g. total contact cast or offloading device) and callus management, plus foot protection education.", "Neuropathic diabetic ulcer at a pressure point under callus, loss of protective sensation. Offload it (total contact cast or removable walker) and manage the callus."),
            part("Wound D", "Stage 3 pressure injury (full-thickness skin loss with visible fat, no fascia/muscle/tendon/bone, base visible so it is stageable); implication: pressure redistribution/repositioning plus moist wound care.", "Stage 3 pressure injury: full-thickness loss with fat visible, nothing deeper, base fully visible. Pressure redistribution surface and repositioning, with moist wound healing."),
          ],
        },
      ],
    },
    {
      slug: "pt-dfu-infection-then-closure",
      objective: "Recognizing signs of infection or non-healing that require referral",
      kind: "case",
      title: "A diabetic foot ulcer that changes",
      brief:
        "A fictional 61-year-old with type 2 diabetes and peripheral neuropathy is seen twice a week for a plantar ulcer under the second metatarsal head, offloaded in a removable walker boot. Over the last 3 weeks the wound had been getting smaller.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Today the redness around the wound has spread across the forefoot, the foot is warm and swollen, there is cloudy, foul-smelling drainage, and he has a temperature of 38.4 degrees C. He says his blood glucose readings have been unusually high this week.",
          ask: "What do these findings mean and what do you do?",
          parts: [
            part(
              "Interpretation",
              "Recognizes signs of a diabetes-related foot infection (spreading erythema, warmth, swelling, purulent drainage, malodor) with systemic signs (fever, rising glucose), so it may be moderate-to-severe.",
              "Spreading redness, warmth, swelling and purulent, smelly drainage mean the ulcer is infected; fever and high glucose suggest it is spreading or systemic."
            ),
            part(
              "Action",
              "Refers the same day for urgent medical evaluation (physician/emergency per protocol) for antibiotics and imaging; does not continue routine wound care as the only response; documents the findings.",
              "Same-day referral to his physician or the emergency department for assessment, antibiotics and imaging for possible deep infection; dress the wound, document measurements and findings, and call ahead."
            ),
          ],
        },
        {
          text: "After antibiotics and further care the ulcer has now closed. He asks if he can \"go back to normal shoes and walking\" this week.",
          ask: "How do you manage the weeks after closure?",
          parts: [
            part(
              "After closure",
              "Explains the high risk of re-ulceration and keeps moderate to maximal offloading, especially for about the first 3 months, while gradually titrating reloading (standing, walking) and returning to shoe wear on a wear schedule, per the DFU CPG.",
              "Newly closed skin breaks down easily. Keep him in the offloading boot most of the time for about the first 3 months, building standing and walking a little at a time, and bring back footwear on a wear schedule."
            ),
            part(
              "Monitoring and footwear",
              "Includes daily foot inspection (and temperature/skin checks), appropriate therapeutic footwear/insoles, and a plan to stop and report if redness, warmth or a blister appears.",
              "Daily foot checks with a mirror for redness, warmth or blistering, therapeutic shoes with custom insoles before normal shoes, and stop and call if any of those appear."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- System Interactions (1)
    {
      slug: "pt-competing-systems-orthostatic",
      objective: "Prioritizing a plan of care when multiple systems present competing demands",
      kind: "case",
      title: "Parkinson disease, osteoporosis and a dizzy stand",
      brief:
        "A fictional 76-year-old with Parkinson disease, osteoporosis with a healed T11 vertebral compression fracture, and type 2 diabetes is referred for balance and endurance training after two falls at home. She takes carbidopa-levodopa, an antihypertensive, metformin and a sleeping tablet.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "First visit: lying blood pressure 132/78 mm Hg, HR 72. After 2 minutes standing: 104/70 mm Hg, HR 78, and she feels lightheaded.",
          ask: "Which systems interact here, and what do you prioritize first?",
          parts: [
            part(
              "Interactions",
              "Identifies symptomatic orthostatic hypotension (possibly from Parkinson-related autonomic dysfunction and/or medications) interacting with fall risk, osteoporosis fracture risk and possibly glucose; and the sedative as a fall risk.",
              "A 28 mm Hg systolic drop with lightheadedness on standing -- orthostatic hypotension, likely from PD autonomic changes plus her antihypertensive and levodopa. With osteoporosis, any fall risks another fracture; the sleeping tablet adds fall risk."
            ),
            part(
              "Priority",
              "Prioritizes safety: reports the orthostatic hypotension and medication list to the physician for review, and teaches immediate strategies (slow staged rising, ankle pumps before standing, hydration as allowed) before progressing upright training.",
              "First, safety: tell her physician about the orthostatic drop and her medicines (antihypertensive, sleeping tablet) for review, and teach staged rising -- sit a minute, ankle pumps, then stand holding support."
            ),
          ],
        },
        {
          text: "Her physician lowers the antihypertensive dose. Two weeks later her standing BP holds steady and she has no lightheadedness.",
          ask: "Write the plan's key modifications across the systems.",
          parts: [
            part(
              "Exercise choices",
              "Includes progressive balance and gait training, aerobic and resistance training suited to PD, while avoiding loaded or end-range spinal flexion and twisting because of osteoporosis, and emphasizing extensor strengthening.",
              "Balance and gait training with cueing, aerobic walking or cycling, and resistance work with spinal extensor strengthening; avoid loaded spinal flexion and twisting (sit-ups, toe-touches)."
            ),
            part(
              "Monitoring",
              "Builds in BP checks with position changes at each visit, glucose awareness (diabetes with exercise), and timing of sessions relative to levodopa doses.",
              "Check lying and standing BP each visit, ask about glucose and hypoglycemia symptoms, and schedule sessions when her levodopa is working."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Lymphatic (1)
    {
      slug: "pt-bcrl-staging-cdt",
      objective:
        "For breast cancer-related lymphedema, treat early (ISL stage I) swelling with a fitted compression garment, exercise and education first, add CDT if that fails, and use CDT to reduce volume in stages II and III",
      kind: "case",
      title: "Arm swelling after breast cancer surgery",
      brief:
        "A fictional 52-year-old office manager had a left mastectomy with axillary lymph node dissection 5 months ago and finished radiation 6 weeks ago. She reports a heavy left arm and her rings feel tight. The swelling pits with pressure and goes down overnight with the arm elevated; the skin is soft with no fibrosis.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Arm circumference measurements confirm a modest increase on the left compared with the right. There are no signs of infection or blood clot.",
          ask: "Stage the lymphedema and choose first-line treatment.",
          parts: [
            part(
              "Stage",
              "ISL stage I: pitting edema that reduces with elevation, no fibrosis.",
              "ISL stage I -- early, pitting swelling that subsides with elevation and no fibrosis."
            ),
            part(
              "First-line treatment",
              "Individually fitted compression garment, an exercise program (aerobic and gradual resistance), and education (skin care, signs to report), as the BCRL CPG recommends first for early lymphedema.",
              "A fitted compression sleeve (and gauntlet if the hand swells), a gradually progressed aerobic and resistance exercise program, and education on skin care and what to report."
            ),
          ],
        },
        {
          text: "Eight weeks later the swelling has increased despite good garment use. It no longer goes down overnight; pitting is present and the tissue feels firmer.",
          ask: "What do you change?",
          parts: [
            part(
              "Reclassify and escalate",
              "Recognizes progression (stage II: no longer reduces with elevation) and moves to complete decongestive therapy.",
              "It's progressed to stage II -- no longer reduced by elevation. Escalate to complete decongestive therapy."
            ),
            part(
              "CDT components",
              "Describes CDT phase I (manual lymphatic drainage, multilayer short-stretch compression bandaging, exercise in bandages, skin care) then phase II self-management (fitted garment, self-MLD, exercise, night compression if indicated).",
              "Phase I: MLD, multilayer short-stretch bandaging, exercise with the bandages on, and skin care several times a week until volume plateaus. Phase II: a newly fitted garment, self-MLD, exercise and night compression as needed."
            ),
          ],
        },
        {
          text: "In week 2 of CDT she arrives with the arm red, hot and painful, and a temperature of 38.6 degrees C.",
          ask: "What do you do?",
          parts: [
            part(
              "Hold and refer",
              "Recognizes probable cellulitis, holds MLD and compression bandaging, and refers her urgently to her physician for antibiotics; resumes CDT only when cleared.",
              "This looks like cellulitis: no MLD or bandaging today; send her urgently to her physician for antibiotics, and restart CDT only when the infection is treated and she is cleared."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Safety and Protection (1)
    {
      slug: "pt-falls-screen-and-dose",
      objective:
        "Screen community-dwelling older adults with the fall-risk cut-offs in the 2025 APTA-Geriatrics guideline: TUG over 11 s, 5 times sit-to-stand over 12 s, single-limb stance under 6.5 s, Berg under 50, gait speed under 1.0 m/s",
      kind: "case",
      title: "One fall, five tests, one plan",
      brief:
        "A fictional 79-year-old retired librarian who lives alone fell once in her kitchen 2 months ago without injury. She now avoids the bus. She takes 7 regular medications, including a sleeping tablet. Her primary care physician refers her to physical therapy for falls prevention.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Results: Timed Up and Go 14 s; 5 times sit-to-stand 15 s; single-limb stance (eyes open) 4 s; Berg Balance Scale 46; self-selected gait speed 0.82 m/s.",
          ask: "Interpret the results against the guideline cut-offs.",
          parts: [
            part(
              "Interpretation",
              "Compares each result with the cut-off (TUG over 11 s, 5xSTS over 12 s, SLS under 6.5 s, Berg under 50, gait speed under 1.0 m/s), notes all five are in the risk range, and with the fall history, fear of falling and polypharmacy/psychoactive medication concludes high fall risk.",
              "Every test is past the guideline cut-off: TUG 14 (over 11), 5xSTS 15 (over 12), single-limb stance 4 (under 6.5), Berg 46 (under 50), gait speed 0.82 (under 1.0). With a fall, fear of falling and a sedative, she's at high fall risk."
            ),
          ],
        },
        {
          text: "She agrees to a program but says she can manage only \"a bit of exercise now and then\".",
          ask: "Write the core of the plan and how you'll make the dose achievable.",
          parts: [
            part(
              "Exercise dose",
              "Prescribes exercise at least 150 minutes to 3 hours per week, kept up for 6 to 12 months, built around progressive, challenging balance training (plus strength), per the 2025 falls CPG.",
              "At least 150 minutes to 3 hours a week of exercise for 6-12 months, centered on balance training that keeps getting harder, plus leg strengthening."
            ),
            part(
              "Multifactorial parts",
              "Includes a home-hazard assessment and modifications, education, and referral back to the physician/pharmacist for medication review (psychoactive drug, polypharmacy); may add vision or footwear checks.",
              "Home-hazard assessment (kitchen, bathroom, lighting), tailored education on safe moving and getting up from a fall, and a request to her physician or pharmacist to review the sleeping tablet and her 7 medications."
            ),
            part(
              "Making it achievable",
              "Uses shared goal setting and behavior-change strategies (short bouts spread through the day, a written home program, a community or group class, tracking), with the bus as a meaningful goal.",
              "Agree the bus trip as the goal, break the dose into 10-15 minute home sessions most days plus a twice-weekly group class, and give her a simple log to track it."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Equipment, Devices, and Technologies (1)
    {
      slug: "pt-choose-and-fit-devices",
      objective: "Selecting and fitting assistive devices (canes, walkers, crutches) to a patient's impairment and gait pattern",
      kind: "build",
      title: "Choose and fit a device for three patients",
      brief:
        "Three fictional patients need a device today. (A) A 24-year-old athlete, non-weight-bearing on the right after ankle fracture fixation, with good balance and upper-body strength. (B) A 70-year-old with left hemiparesis after a stroke who walks with mild unsteadiness and needs a little support; the left arm cannot grip. (C) An 83-year-old with generalized weakness and poor balance who is weight-bearing as tolerated on both legs and gets breathless quickly.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each patient give the device, the gait pattern and the key fitting points.",
          parts: [
            part("Patient A", "Axillary crutches (or forearm crutches) with a 3-point non-weight-bearing gait; fit the axillary pad about 2 finger-widths below the armpit and the hand grips for slight elbow flexion (about 30 degrees), weight on the hands not the armpits; stairs up with the good leg, down with the crutches.", "Axillary crutches, 3-point non-weight-bearing gait. Pad about 2 finger-widths below the armpit, grips at about 30 degrees of elbow flexion, weight through the hands. Stairs: up with the good leg, down with the crutches."),
            part("Patient B", "A cane (quad or single-point) or hemi-walker held in the right (unaffected) hand, advanced with the left (affected) leg; handle at about wrist crease/greater trochanter height with slight elbow flexion.", "A small-base quad cane in the right hand, moved forward with the left leg (cane and affected leg together, then the right leg). Handle at wrist-crease height with slight elbow bend."),
            part("Patient C", "A rolling (front-wheeled or four-wheeled with seat) walker for bilateral support and balance, with a seat for rests if breathless; handles at wrist crease height with slight elbow flexion; step-through pattern inside the frame.", "A four-wheeled walker with a seat and brakes, so she can rest when breathless; handles at wrist-crease height with slight elbow bend; walk inside the frame, not pushing it ahead."),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Metabolic and Endocrine (1)
    {
      slug: "pt-hypoglycemia-mid-session",
      objective: "Recognizing signs of hypo/hyperglycemia during activity and responding appropriately",
      kind: "case",
      title: "Shaky and sweaty halfway through",
      brief:
        "A fictional 54-year-old bus driver with type 2 diabetes treated with insulin is in outpatient rehabilitation after a rotator cuff repair, doing a supervised aerobic and strengthening session. He skipped lunch today because he was running late.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Twenty minutes into the session he becomes shaky, sweaty and irritable, and has trouble following instructions. His meter reads 58 mg/dL. He is awake and able to swallow.",
          ask: "Interpret and act.",
          parts: [
            part(
              "Interpretation",
              "Identifies hypoglycemia (level 1: below 70 and at or above 54 mg/dL) with symptoms, provoked by insulin, exercise and a skipped meal.",
              "Symptomatic hypoglycemia -- 58 mg/dL is level 1 (under 70, at or above 54), from insulin plus exercise plus a skipped lunch."
            ),
            part(
              "Treatment",
              "Stops exercise, has him sit, gives about 15 g of fast-acting carbohydrate (e.g. glucose tablets or juice), rechecks after 15 minutes and repeats if still low; calls for emergency help (glucagon per protocol) if he can't swallow safely or becomes unresponsive.",
              "Stop, sit him down, give 15 g of fast-acting carbohydrate (glucose tablets, gel or juice) and recheck in 15 minutes, repeating until normal. If he can't swallow or loses consciousness, call emergency services and use glucagon per protocol."
            ),
          ],
        },
        {
          text: "Fifteen minutes later his glucose is 66 mg/dL; after a second 15 g it is 104 mg/dL and he feels better.",
          ask: "What about the rest of the session and future sessions?",
          parts: [
            part(
              "Rest of today",
              "Does not resume vigorous exercise today (or only light activity after recovery and food); makes sure he eats; does not let him drive until fully recovered; documents and informs his physician/diabetes provider.",
              "No more aerobic work today; he eats a snack with carbohydrate and protein, stays until recovered, and doesn't drive until fully himself. Document it and let his physician know."
            ),
            part(
              "Prevention",
              "Plans prevention: check glucose before (and during longer) sessions, schedule after meals, keep fast-acting carbohydrate on hand, and ask his prescriber about insulin adjustments for exercise days.",
              "Check glucose before each session, book sessions after a meal, keep glucose tablets in the gym, and ask his prescriber whether insulin should be adjusted on exercise days."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Therapeutic Modalities (1)
    {
      slug: "pt-modality-screen",
      objective: "Applying contraindications and precautions for each modality correctly",
      kind: "build",
      title: "Screen four modality plans",
      brief:
        "A new graduate has drafted modality plans for four fictional patients and asks you to check them. (A) TENS over the lumbar spine for a 31-year-old who is 24 weeks pregnant with low back pain. (B) Continuous therapeutic ultrasound over the anterior tibia for a runner with a suspected tibial stress fracture. (C) A moist hot pack on the lower leg of a 66-year-old with diabetic peripheral neuropathy who cannot feel a monofilament there. (D) TENS on the upper trapezius and front of the neck for a 70-year-old with a pacemaker.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each plan, say whether it is safe and what you would change.",
          parts: [
            part("Plan A", "Not as written: TENS over the low back or abdomen in pregnancy is avoided unless obstetric care directs it; choose other pain management (exercise, positioning, support) or consult the obstetric provider.", "Don't apply TENS over the low back or abdomen in pregnancy unless her obstetric provider directs it; use exercise, positioning and a support belt instead."),
            part("Plan B", "Not safe: therapeutic ultrasound over a (suspected) fracture is contraindicated; refer/confirm the diagnosis and use relative rest and load management.", "No ultrasound over a suspected fracture. Get the stress fracture confirmed and manage with relative rest and graded loading."),
            part("Plan C", "Precaution/avoid: impaired sensation means she can't report overheating, so avoid superficial heat on insensate skin or use another approach with very close monitoring per policy.", "Avoid the hot pack on skin she can't feel -- she can't tell you if it burns. Use exercise or a different approach."),
            part("Plan D", "Not safe: avoid stimulation near an implanted cardiac device and over the anterior neck/carotid sinus; choose another approach or consult the cardiologist.", "No TENS near the pacemaker or over the front of the neck and carotid sinus; use other interventions or check with the cardiologist."),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Gastrointestinal (1)
    {
      slug: "pt-shoulder-pain-gallbladder",
      objective: "Recognizing GI signs/symptoms that may indicate a condition outside the scope of PT management",
      kind: "case",
      title: "Right shoulder pain after dinner",
      brief:
        "A fictional 47-year-old restaurant manager books a direct-access visit for right shoulder-blade and shoulder-tip pain for 3 weeks. The pain comes in episodes lasting a couple of hours, usually in the evening after a large or fatty meal, and sometimes with nausea. She cannot link it to any activity.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Shoulder and cervical examination: full, pain-free active and passive range, strength normal, no special test reproduces her pain.",
          ask: "What does the pattern suggest, and what else do you screen?",
          parts: [
            part(
              "Pattern",
              "Notes the pain is not reproduced by musculoskeletal testing and is linked to meals and nausea, suggesting a visceral source referring to the right shoulder (e.g. gallbladder).",
              "Normal shoulder and neck testing with meal-linked episodes and nausea suggests visceral referred pain -- the gallbladder refers to the right shoulder and scapula."
            ),
            part(
              "Screen",
              "Screens with vital signs (temperature), questions about jaundice, stool/urine color, fever and abdominal pain, and palpation of the right upper quadrant (e.g. Murphy sign).",
              "Temperature and vital signs; ask about fever, yellow skin or eyes, dark urine or pale stools, and abdominal pain; palpate the right upper quadrant and check Murphy sign."
            ),
          ],
        },
        {
          text: "Temperature 37.9 degrees C. Right upper quadrant tenderness with a positive Murphy sign.",
          ask: "What do you do?",
          parts: [
            part(
              "Refer",
              "Refers her to a physician promptly (same day given fever and positive Murphy sign) rather than treating the shoulder, with advice to seek emergency care if pain becomes severe or persistent, or jaundice or high fever appear.",
              "Refer her to her physician today -- this looks like possible gallbladder disease, not a shoulder problem. Go to the emergency department if the pain becomes severe or constant, or with high fever or yellowing."
            ),
            part(
              "Document",
              "Documents the negative musculoskeletal findings, the positive screening findings and the referral, and sends a summary to the physician.",
              "Document that shoulder testing was negative, the fever and positive Murphy sign, and the referral, and send the physician a short summary."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Professional Responsibilities (1)
    {
      slug: "pt-medicare-plan-of-care",
      objective:
        "Write a plan of care that meets Medicare's minimum -- diagnoses, long-term goals, and what services, how much, how often and for how long -- with measurable goals tied to functional impairments",
      kind: "build",
      title: "Write a Medicare-ready plan of care",
      brief:
        "A fictional 74-year-old retired bus mechanic with right knee osteoarthritis is evaluated on 3 March in an outpatient clinic and covered by Medicare Part B. Findings: knee flexion 0-105 degrees, quadriceps 4-/5, pain 6/10 on stairs, gait speed 0.85 m/s, needs a handrail and a step-to pattern on stairs, and cannot walk more than 10 minutes. He wants to walk 30 minutes with his wife and climb the 12 stairs to his flat step-over-step.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the plan of care's required elements and the timing rules that follow.",
          parts: [
            part("Diagnoses", "States the medical diagnosis (right knee osteoarthritis) and a physical therapy diagnosis/impairments that link to function.", "Medical: primary osteoarthritis, right knee. PT: right knee pain with reduced range and quadriceps weakness limiting gait endurance and stair climbing."),
            part("Long-term goals", "Writes at least two measurable, time-bound functional goals linked to the impairments (e.g. walk 30 minutes; climb 12 stairs step-over-step with one rail and pain at or below a stated level).", "In 8 weeks: (1) walk 30 minutes continuously on level ground with pain no more than 3/10; (2) climb 12 stairs step-over-step with one handrail."),
            part("Type, amount, frequency, duration", "Specifies the services (e.g. therapeutic exercise, gait/stair training, manual therapy, education), the amount (e.g. sessions or minutes), frequency (e.g. 2x/week) and duration (e.g. 8 weeks).", "Therapeutic exercise, gait and stair training, manual therapy and home program education; 45-minute sessions, 2 times a week for 8 weeks."),
            part("Timing rules", "States that the plan is certified (signed) by the physician/NPP within 30 days of the first treatment, recertified at least every 90 calendar days, and that a progress report is written at least every 10 treatment days.", "Send the plan for physician or NPP certification within 30 days of the first treatment; certification lasts at most 90 calendar days; and write a progress report at least once every 10 treatment days."),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Genitourinary (1)
    {
      slug: "pt-classify-incontinence",
      objective:
        "Tell apart stress, urge, mixed, overflow and functional urinary incontinence, because management differs, and know pelvic floor exercise and biofeedback are among the options",
      kind: "build",
      title: "Sort four people with incontinence",
      brief:
        "A pelvic-health clinic has four fictional new patients. (A) 44-year-old runner, three vaginal deliveries, leaks small amounts when she coughs, sneezes or jumps. (B) 68-year-old with a sudden strong need to go and leaks before reaching the toilet, going 12 times a day. (C) 76-year-old man with diabetes and an enlarged prostate who dribbles constantly, has a weak stream and feels he never fully empties. (D) 85-year-old with knee osteoarthritis and mild dementia, continent when helped but who leaks because she can't get to and undress in time at night.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each and name the management direction.",
          parts: [
            part("Patient A", "Stress urinary incontinence; pelvic floor muscle training (with biofeedback if needed) and strategies such as a pre-contraction before coughing.", "Stress incontinence -- pelvic floor muscle training, with biofeedback if she can't find the contraction, and 'the knack' (contract before a cough or jump)."),
            part("Patient B", "Urge incontinence (overactive bladder); bladder training/urge suppression, pelvic floor contraction to inhibit urgency, fluid and bladder-irritant advice.", "Urge incontinence -- bladder diary and timed voiding with gradually longer intervals, urge suppression with quick pelvic floor contractions, and advice on caffeine and fluids."),
            part("Patient C", "Overflow incontinence (incomplete emptying/obstruction or poor detrusor function); refer to a physician/urologist rather than starting pelvic floor strengthening.", "Overflow incontinence from incomplete emptying -- refer to his physician or a urologist for assessment of retention; pelvic floor strengthening isn't the answer."),
            part("Patient D", "Functional incontinence; address mobility and environment (bedside commode, easy clothing, lighting, prompted toileting), with caregiver involvement.", "Functional incontinence -- a bedside commode, clothing that's easy to undress, night lighting and a prompted toileting schedule with her carers, plus mobility work."),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Research and Evidence-Based Practice (1)
    {
      slug: "pt-likelihood-ratio-calc",
      objective:
        "Interpret a clinical test's likelihood ratios, predictive values, and sensitivity and specificity, knowing that sensitivity and specificity tend to trade off against each other",
      kind: "build",
      title: "From a 2x2 table to a post-test probability",
      brief:
        "A fictional study tested a new clinical test for lumbar nerve root compression in 200 patients against MRI and clinical consensus as the reference standard. 50 patients had the condition. Of these, 40 tested positive. Of the 150 without it, 30 tested positive.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Work out the test statistics and apply them.",
          parts: [
            part("Sensitivity and specificity", "Sensitivity 40/50 = 0.80; specificity 120/150 = 0.80, showing the working.", "TP 40, FN 10, FP 30, TN 120. Sensitivity = 40/50 = 0.80; specificity = 120/150 = 0.80."),
            part("Predictive values", "PPV 40/70 = 0.57; NPV 120/130 = 0.92; notes predictive values depend on prevalence (25% here).", "PPV = 40/70 = 0.57; NPV = 120/130 = 0.92. These depend on the 25% prevalence in this sample."),
            part("Likelihood ratios", "LR+ = 0.80/0.20 = 4.0; LR- = 0.20/0.80 = 0.25.", "LR+ = sensitivity/(1 - specificity) = 0.80/0.20 = 4.0; LR- = (1 - sensitivity)/specificity = 0.20/0.80 = 0.25."),
            part("Post-test probability", "For a patient with 10% pre-test probability: pre-test odds 0.11; positive -> odds 0.44 -> about 31%; negative -> odds 0.028 -> about 3%; interprets that a negative result helps rule out, a positive moves probability moderately.", "Pre-test odds = 0.10/0.90 = 0.111. Positive: 0.111 x 4 = 0.444 -> 0.444/1.444 = 31%. Negative: 0.111 x 0.25 = 0.028 -> about 3%. A negative result makes the condition unlikely; a positive one raises it to about a third, so it needs confirming."),
          ],
        },
      ],
    },
  ],
};
