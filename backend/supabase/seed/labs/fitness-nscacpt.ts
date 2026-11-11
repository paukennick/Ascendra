import { FITNESS_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-149: NSCA Certified Personal Trainer (NSCACPT), authored to the depth
// of the NASM-CPT pilot (REQ-123) in the NSCA's own terms: periodized
// macro-, meso- and microcycles, FITT with work-to-rest ratio and tempo,
// loads from repetition maximums (the NSCA training load chart), technique
// evaluation and spotting across modalities, and safety and emergency
// procedures.
//
// Outline: NSCA-CPT detailed content outline from the 2025 job task analysis,
// "New Detailed Content Outline (DCO) Date Effective: July 1, 2025" (Client
// Consultation and Assessment 32 items, about 23%; Program Planning 41, 29%;
// Program Execution 50, 36%; Safety, Emergency Procedures and Legal Issues
// 17, 12%; 140 scored), read in NSCA's JTA summary on 2026-11-09 -- it
// replaces the nsca.com exam-description page, which the 2026-11-09 content
// audit found stale -- and reproduced in the NSCA Certification Handbook (the seed
// track's outline URL). Density ("hybrid"): 2/3/3/2 = 10.
//
// Values and where they were checked (2026-11-07):
//   - NSCA training load chart (adapted from Landers 1984, NSCA 2012): 1RM =
//     100%, 2 reps 95%, 3 93%, 4 90%, 5 87%, 6 85%, 7 83%, 8 80%, 9 77%,
//     10 75%, 12 70%.
//   - Load by goal, as the NSCA recommends (summarised by the DoD Human
//     Performance Resource Center): strength at least 85% 1RM for 6 or fewer
//     reps; hypertrophy 67-85% for 6-12; muscular endurance under 67% for
//     12 or more.
//   - Rest between sets for strength-focused core lifts: about 2-5 minutes
//     (NSCA Personal Training Quarterly 10.1, Mortara 2023).
//   - Adult BMI categories: CDC (25 to <30 overweight, 30 or more obesity).
//   - REDs: 2023 IOC consensus statement (low energy availability at its core;
//     REDs CAT2 for clinicians).
//   - Adult CPR: 2025 AHA guidelines (100-120 compressions a minute, at least
//     2 inches deep, full recoil, interruptions under 10 seconds, 30:2 for
//     trained rescuers giving breaths, AED as soon as available).
//
// SAFETY: every client is fictional; nothing here is exercise, nutrition or
// medical advice, and no lab asks the learner to program for their own
// clients. Screening, referral and scope of practice come first. Marked for
// expert review like every authored lab (docs/labs.md).

export const NSCACPT_LABS: SeedLabSet = {
  trackCode: "NSCACPT",
  // REQ-142: dated by the backfill rule (the day git history shows the line
  // added, 2026-11-07, REQ-149), not re-checked in the REQ-142 pass. kind sets
  // the re-check: exam outlines and references 12 months, guidelines 6.
  sources: [
    source("https://www.nsca.com/globalassets/certification/certification-pdfs/nsca-certified-personal-trainer-job-task-analysis-summary-2025", "exam_outline", "2026-11-09"),
    source("https://www.nsca.com/globalassets/certification/certification-pdfs/nsca-certification-handbook.pdf", "exam_outline", "2026-11-07"),
    source("https://dxpprod.nsca.com/contentassets/61d813865e264c6e852cadfe247eae52/nsca_training_load_chart.pdf", "reference", "2026-11-07"),
    source("https://www.hprc-online.org/articles/one-rep-max-for-strength", "reference", "2026-11-07"),
    source("https://www.nsca.com/contentassets/fb8a7be6eb174934bb8844703c4de4cc/ptq-10.1.3-how-to-manipulate-rest-intervals-to-maixmize-strength-training-effectiveness.pdf", "reference", "2026-11-07"),
    source("https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html", "clinical_guideline", "2026-11-07"),
    source("https://pubmed.ncbi.nlm.nih.gov/37752011/", "reference", "2026-11-07"),
    source("https://www.vumc.org/resuscitation-program/sites/default/files/public_files/BLS/Heartsaver/Heartsaver-CPR-AED-Summary-High-Quality-CPR%20Components-2025-Guidelines.pdf", "clinical_guideline", "2026-11-07"),
  ],
  labs: [
    // -----------------------------------------------------------------------
    // Client consultation and assessment (23%): 2
    // -----------------------------------------------------------------------
    {
      slug: "nsca-cpt-assessment-battery",
      objective: "Fitness and performance evaluation: selecting, conducting and interpreting assessments",
      kind: "build",
      title: "Choose, order and read an assessment battery",
      brief:
        "A fictional 42-year-old client, Ade, screened and cleared, wants to \"get leaner and stronger and run with my kids\". Height 1.78 m, weight 92 kg, waist 101 cm. No injuries. You have one 60-minute session for a baseline, with a scale, tape measure, stopwatch, a 400 m track outside, a push-up mat and a sit-and-reach box.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the battery, its order, and how you'll read the first results.",
          parts: [
            part(
              "Tests matched to goals",
              "Selects valid, practical tests for each goal: body composition (for example BMI, waist circumference), muscular endurance or strength (for example push-up test), cardiorespiratory fitness (for example a timed walk or run), and flexibility.",
              "Body composition: BMI and waist circumference. Muscular endurance: push-up test. Cardiorespiratory: 1.5-mile run or 1-mile walk test on the track. Flexibility: sit-and-reach."
            ),
            part(
              "Order and conditions",
              "Orders tests so earlier ones don't fatigue later ones (resting and body measures first, the most fatiguing cardiorespiratory test last or on another day), with a warm-up and standard instructions.",
              "Resting heart rate and blood pressure, height, weight, waist; warm-up; sit-and-reach; push-up test; rest; then the track test last. Same instructions and order at every reassessment."
            ),
            part(
              "Interpret BMI and waist",
              "Calculates BMI about 29.0 (overweight range, 25 to under 30), notes BMI is a screening measure, and uses waist circumference and other measures alongside it.",
              "BMI = 92 / 1.78^2 = 29.0, in the overweight range. BMI is only a screen, so I'll track waist and performance as well."
            ),
            part(
              "Using the baseline",
              "Explains that results are compared with norms and, more importantly, with the client's own later results, and links them to goal setting.",
              "Compare with age norms to set context, but mostly with Ade's own reassessments every 8-12 weeks; each result becomes a measurable goal."
            ),
          ],
        },
      ],
    },
    {
      slug: "nsca-cpt-reds-wellness-case",
      objective: "Basic wellness review within scope: nutrition, sleep, stress and mental health, and recognizing RED-S and disordered eating",
      kind: "case",
      title: "A runner who is under-fueling",
      brief:
        "A fictional 26-year-old client, Mia, is training for a half marathon, running five days a week and lifting with you twice. She has lost 6 kg in three months without trying to, says she is \"always tired\", and her pace has slowed.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "In a wellness check-in Mia mentions she has not had a period for four months, eats \"as clean as possible\" and skips meals on rest days to \"stay light\". She had a foot stress fracture last year.",
          ask: "What do you recognize, and what do you do?",
          parts: [
            part(
              "Recognize the pattern",
              "Recognizes possible low energy availability and Relative Energy Deficiency in Sport (REDs), with possible disordered eating, from the cluster of signs (missed periods, unintended weight loss, fatigue, declining performance, stress fracture history, restriction), without diagnosing.",
              "Missed periods, weight loss, fatigue, slower times, a past stress fracture and restricting food together suggest low energy availability and possible REDs -- I can't diagnose it, but I can't ignore it."
            ),
            part(
              "Refer",
              "Refers to a physician promptly and suggests a registered dietitian (and a mental health professional if disordered eating is a concern), as a team, with her consent.",
              "Encourage Mia to see her physician soon, and suggest a registered dietitian experienced with athletes -- and a counselor if she wants support around food -- working together."
            ),
          ],
        },
        {
          text: "Mia agrees to see her physician but asks you just to give her a meal plan instead.",
          ask: "How do you respond, and what happens to her training meanwhile?",
          parts: [
            part(
              "Scope and communication",
              "Declines to write a meal plan, responds supportively and without judgment about her eating or body, and keeps the focus on health and performance.",
              "\"A meal plan isn't something I can safely write -- that's for the dietitian. I care about you running well and staying healthy, and getting the right support is part of that.\""
            ),
            part(
              "Training changes",
              "Reduces training load (for example volume and intensity) until medically reviewed and follows the physician's guidance on return, rather than continuing to push half-marathon training.",
              "Cut back the running and keep lifting light and technique-focused until her physician says how to proceed; the race plan can wait."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Program planning (29%): 3
    // -----------------------------------------------------------------------
    {
      slug: "nsca-cpt-periodized-plan",
      objective: "Creating macro-, meso- and microcycle plans targeting client goals",
      kind: "build",
      title: "Periodize a 16-week plan for a hiking trip",
      brief:
        "A fictional 50-year-old client, Rosa, screened and cleared, has trained with machines for a year. In 16 weeks she will hike six days in the mountains carrying a 10 kg pack, about 15 km a day with long climbs and descents. She can train three days a week with you and walk on two more days.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the macrocycle, mesocycles and a sample microcycle.",
          parts: [
            part(
              "Macrocycle and mesocycles",
              "Divides the 16 weeks into logical mesocycles that move from general to specific (for example general strength and endurance, then strength and loaded hiking, then specific preparation), ending with a taper before the trip.",
              "Weeks 1-5: general strength and aerobic base. Weeks 6-10: heavier lower-body strength, step-ups and loaded walks. Weeks 11-14: trip-specific -- long hikes with the pack, downhill work. Weeks 15-16: taper."
            ),
            part(
              "Recovery weeks",
              "Builds in planned lower-load weeks (for example every third or fourth week) and a taper with reduced volume before the trip.",
              "A lighter week at weeks 5, 10 and 14; the last 10 days cut volume by about half while keeping some intensity."
            ),
            part(
              "Sample microcycle",
              "Gives one week with sensible distribution of resistance training, aerobic and specific work, including rest days, matched to her mesocycle.",
              "Week 7: Mon -- strength (split squat, step-up, Romanian deadlift, row, carry). Tue -- 60-minute walk. Wed -- strength + core. Thu -- rest. Fri -- strength. Sat -- 2-hour hike with 6 kg pack. Sun -- rest."
            ),
            part(
              "Specificity and progression",
              "Explains how the plan becomes more specific to the trip (pack weight, distance, terrain, eccentric downhill strength) and progresses gradually.",
              "Pack weight rises from 4 to 10 kg and hike length from 1 to 4 hours by week 13; step-downs and downhill walking prepare her for the descents."
            ),
          ],
        },
      ],
    },
    {
      slug: "nsca-cpt-session-variables",
      objective: "Exercise order, FITT, work-to-rest ratio and tempo by contraction phase",
      kind: "build",
      title: "Write a session: order, loads, rest and tempo",
      brief:
        "A fictional 37-year-old client, Ben, screened and cleared, has trained consistently for two years and wants to get stronger. Recent tests: back squat 5RM 87 kg; dumbbell bench press 10RM 30 kg per hand. Today's session includes: back squat, dumbbell bench press, seated cable row, box jump, triceps pushdown and plank.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the session with exercise order, loads, sets and reps, rest and tempo.",
          parts: [
            part(
              "Exercise order",
              "Orders power before strength and multi-joint before single-joint exercises (box jump, back squat, bench press, row, triceps pushdown, plank last) and says why.",
              "Box jump first (power, while fresh), then back squat, dumbbell bench press, seated row, triceps pushdown, plank -- most demanding and multi-joint first, assistance and core last."
            ),
            part(
              "Squat load",
              "Estimates the 1RM from the 5RM using the NSCA chart (5 reps = 87%, so about 100 kg) and sets a strength load of at least 85% for 6 or fewer reps.",
              "5RM 87 kg = 87% of 1RM, so 1RM is about 100 kg. Strength: 4 sets x 5 at 85% = 85 kg."
            ),
            part(
              "Rest and work-to-rest",
              "Prescribes longer rest for strength sets (about 2-5 minutes) and full recovery between low-volume box jumps, and shorter rest for the assistance and core work.",
              "Box jumps 3 x 3, about 2 minutes' rest; squats about 3 minutes; bench and row about 2 minutes; pushdown and plank about 60 seconds."
            ),
            part(
              "Tempo",
              "Writes tempo by contraction phase with a stated notation (for example eccentric-pause-concentric) appropriate to strength (controlled eccentric, forceful concentric).",
              "Tempo written eccentric/pause/concentric: squat and bench 3/1/1 -- three-second lowering, one-second pause, drive up as fast as control allows."
            ),
          ],
        },
      ],
    },
    {
      slug: "nsca-cpt-hypertension-case",
      objective: "Special populations: recognizing conditions, contraindications and modifying within medical recommendations",
      kind: "case",
      title: "A client with hypertension",
      brief:
        "A fictional 58-year-old client, Walter, has high blood pressure controlled with medication and has written clearance from his physician for moderate exercise. He has strength-trained with you for two months.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Walter's physician has asked you to keep exercise moderate and avoid heavy straining.",
          ask: "How do you set up his sessions within the medical recommendations?",
          parts: [
            part(
              "Resistance training adjustments",
              "Uses moderate loads and higher repetitions, continuous breathing (no Valsalva or breath-holding), and avoids sustained heavy isometric straining, within the physician's limits.",
              "Moderate loads for 10-15 reps, exhale on every effort, no breath-holding or long heavy holds, and nothing beyond what his physician cleared."
            ),
            part(
              "Monitoring and cool-down",
              "Checks resting blood pressure before sessions as agreed, uses RPE (heart-rate response may be altered by some blood pressure medications), and includes a gradual cool-down because some medications can cause low blood pressure after exercise.",
              "Check his blood pressure before each session, use RPE as well as heart rate, and finish with a gradual cool-down -- some blood pressure medicines can make him light-headed after exercise or on standing quickly."
            ),
          ],
        },
        {
          text: "One morning Walter arrives with a severe headache and blurred vision. His seated blood pressure, rechecked after rest, is 185/115 mm Hg.",
          ask: "What do you do?",
          parts: [
            part(
              "Don't exercise; get medical help",
              "Does not exercise him; recognizes very high blood pressure with symptoms (severe headache, vision change) as needing urgent medical evaluation and activates emergency services per the facility's plan, staying with him.",
              "No exercise today. A very high reading with a severe headache and blurred vision needs urgent medical care: call emergency services under our plan and stay with him."
            ),
            part(
              "Afterwards",
              "Documents the readings and actions, and resumes training only with updated clearance from his physician.",
              "Record the readings and what we did; restart only when his physician has reviewed him and updated his clearance."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Program execution (36%): 3
    // -----------------------------------------------------------------------
    {
      slug: "nsca-cpt-db-bench-pulldown-technique",
      objective: "Evaluating technique on machine resistance and free-weight exercises",
      kind: "build",
      title: "Evaluate a dumbbell bench press and a lat pulldown",
      brief:
        "A fictional client, cleared and pain-free, performs two exercises. Dumbbell bench press: the feet lift off the floor, the dumbbells drift toward the face at the bottom, and the elbows flare to 90 degrees from the torso. Lat pulldown: the client leans far back, pulls the bar behind the neck and lets the bar fly up on the way back.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the faults, the corrections and how you spot the bench press.",
          parts: [
            part(
              "Bench press set-up and faults",
              "Corrects the set-up (five points of contact: head, upper back and buttocks on the bench, both feet flat on the floor), keeps dumbbells over the chest/lower chest and forearms vertical, and elbows tucked moderately rather than flared.",
              "Head, shoulders and buttocks on the bench and both feet flat; lower the dumbbells toward the chest with forearms vertical and elbows angled slightly in, not flared to 90 degrees."
            ),
            part(
              "Spotting the dumbbell bench",
              "Spots dumbbell exercises close to the wrists rather than the elbows or upper arms, communicates with the client about the number of reps and help, and stays alert through the set.",
              "Spot at the wrists, not the elbows, so the dumbbell can't drop onto the face or chest; agree on the rep count and a signal for help before the set."
            ),
            part(
              "Lat pulldown corrections",
              "Corrects the pulldown: bar pulled in front to the upper chest (not behind the neck), only a slight backward lean, and a controlled return (eccentric) rather than letting the weight stack fly up.",
              "Pull the bar to the upper chest in front with a slight lean back; control the bar all the way up so the stack doesn't crash."
            ),
          ],
        },
      ],
    },
    {
      slug: "nsca-cpt-plyometric-landing",
      objective: "Evaluating sport-specific and performance activities: plyometrics, sprinting, agility and reaction drills",
      kind: "build",
      title: "Coach plyometric landings",
      brief:
        "A fictional 30-year-old recreational soccer player, screened and cleared with no injuries, wants to jump higher. In a first set of box jumps onto a 60 cm box the client lands with stiff knees, the knees cave inward, and they jump down from the box between reps. They have strength-trained for a year.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the faults, the landing technique you coach, and a progression.",
          parts: [
            part(
              "Faults and risk",
              "Identifies stiff landing and knee valgus as faults that raise injury risk, and that jumping down from the box adds landing stress the drill doesn't need.",
              "Stiff knees and knees caving in on landing load the knee poorly; stepping down rather than jumping down removes extra landing stress."
            ),
            part(
              "Landing technique",
              "Coaches a soft, quiet landing with hips back and knees bent, knees tracking over the toes, weight through the mid-foot, and holding (sticking) the landing.",
              "\"Land quietly, hips back, knees over toes, and freeze.\" Land in an athletic position on the mid-foot and stick it for a second."
            ),
            part(
              "Regression and progression",
              "Regresses to lower boxes or jump-and-stick drills until landings are consistent, then progresses from low- to higher-intensity drills (box height, then countermovement jumps, then more complex or reactive jumps) with low, quality-focused volume and full rest.",
              "Lower to a 30 cm box and practice squat jumps that stick the landing; when every landing is clean, raise the box, then add countermovement and single-leg jumps. Keep reps low with full rest."
            ),
          ],
        },
      ],
    },
    {
      slug: "nsca-cpt-rower-intensity",
      objective: "Cardiovascular machine use and monitoring intensity during execution",
      kind: "build",
      title: "Set up the rower and monitor intensity",
      brief:
        "A fictional 45-year-old client, apparently healthy and cleared, new to the rowing machine, will do a 20-minute moderate session. Resting heart rate 65 bpm; the facility uses 220 - age for predicted maximal heart rate. On the first strokes the client pulls with the arms first, the back rounds, and the seat shoots back before the handle moves.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the set-up, technique cues and how you'll monitor intensity.",
          parts: [
            part(
              "Set-up",
              "Covers foot strap position across the ball of the foot, a moderate damper setting for a beginner, and checking the monitor shows time and stroke rate.",
              "Strap across the widest part of the foot, damper around the middle setting, monitor set to show time, stroke rate and pace."
            ),
            part(
              "Drive sequence cues",
              "Teaches the drive sequence legs, then body swing, then arms, and the reverse on the recovery, with a tall, neutral spine.",
              "\"Legs, body, arms\" on the drive and \"arms, body, legs\" on the way back; sit tall with a long back -- push with the legs before the arms bend."
            ),
            part(
              "Target heart rate",
              "Calculates predicted HRmax 175 bpm, HRR 110 bpm, and a moderate range such as 40-59% HRR (about 109-130 bpm), showing the working.",
              "HRmax = 220 - 45 = 175; HRR = 175 - 65 = 110. 40%: 44 + 65 = 109; 59%: 65 + 65 = 130. Target about 109-130 bpm."
            ),
            part(
              "Other monitoring",
              "Uses RPE or the talk test alongside heart rate and watches technique and symptoms throughout, stopping if warning signs appear.",
              "Check RPE (about 12-13 of 20) and that they can speak in short sentences; watch form as they tire and stop for dizziness, chest discomfort or unusual breathlessness."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Safety, emergency procedures and legal issues (12%): 2
    // -----------------------------------------------------------------------
    {
      slug: "nsca-cpt-facility-walkthrough",
      objective: "Facility and equipment safety, environment checks and client monitoring",
      kind: "build",
      title: "Opening walkthrough of a studio",
      brief:
        "You open a fictional personal training studio at 6 a.m. On your walkthrough you find: a cable on the lat pulldown is frayed near the pulley; two kettlebells are on the floor in the walkway; the room is 29 °C with high humidity because the air conditioning failed overnight; the AED's status light is flashing red; and the first-aid kit is missing gloves.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write what you do about each finding before the first client arrives.",
          parts: [
            part(
              "Equipment",
              "Takes the lat pulldown out of service (signed and reported for repair, not used until fixed) and clears the walkway, returning equipment to storage.",
              "Tag the lat pulldown \"out of service\", log it for repair and keep it unused until fixed; put the kettlebells back on the rack to clear the walkway."
            ),
            part(
              "Environment",
              "Addresses the heat and humidity (reporting the AC fault, fans, lowering session intensity, water, or moving or rescheduling sessions) and monitors clients for heat stress.",
              "Report the AC fault, open windows and run fans, lower today's intensity, keep water out, and watch clients for signs of heat stress -- reschedule hard sessions if it doesn't cool."
            ),
            part(
              "Emergency equipment",
              "Treats the AED fault as urgent (follows the manufacturer's instructions, for example battery or pads, reports it, and arranges a working AED or tells staff where the nearest one is) and restocks the first-aid kit.",
              "Check the AED per the manufacturer's guide (battery, pads), report it, and until it's fixed make sure staff know where the nearest working AED is; restock gloves today."
            ),
            part(
              "Documentation",
              "Records the inspection, faults and actions in a log so there is a record of reasonable care.",
              "Write each finding, the action and the time in the facility safety log."
            ),
          ],
        },
      ],
    },
    {
      slug: "nsca-cpt-cardiac-arrest-case",
      objective: "Emergency action plans, CPR/AED use and incident documentation",
      kind: "case",
      title: "A client collapses",
      brief:
        "In a fictional gym, a 61-year-old client, Hal, collapses during a rest between sets. You are trained in CPR/AED and a colleague is nearby. The facility has a written emergency action plan and an AED by the front desk.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Hal does not respond when you tap him and shout, and he is not breathing normally (only occasional gasps).",
          ask: "What do you do in the first minute?",
          parts: [
            part(
              "Activate the plan",
              "Recognizes cardiac arrest (unresponsive, no normal breathing; gasping is not normal), sends the colleague to call emergency services and bring the AED per the EAP.",
              "Unresponsive with only gasps means cardiac arrest. \"Sam -- call emergency services and bring the AED!\""
            ),
            part(
              "Start CPR",
              "Starts high-quality chest compressions immediately: hard and fast in the center of the chest at 100-120 a minute, at least 2 inches deep, full recoil, minimal interruptions (with breaths at 30:2 if trained and willing).",
              "Start compressions now: center of the chest, at least 2 inches deep, 100-120 a minute, letting the chest fully recoil and keeping pauses under 10 seconds; 30 compressions to 2 breaths since I'm trained."
            ),
          ],
        },
        {
          text: "The AED arrives.",
          ask: "How do you use it?",
          parts: [
            part(
              "AED use",
              "Turns the AED on and follows its prompts, applies pads to the bare chest, makes sure nobody touches the person during analysis and shock, and resumes compressions immediately after a shock or no-shock prompt.",
              "Turn it on and follow the voice prompts; pads on the bare chest; \"Everyone clear\" for analysis and the shock; then straight back to compressions."
            ),
          ],
        },
        {
          text: "Emergency responders take over and transport Hal to hospital.",
          ask: "What do you do afterwards?",
          parts: [
            part(
              "Documentation and follow-up",
              "Completes an incident report promptly with factual times and actions, notifies the manager per policy, keeps the client's information confidential, and restocks and checks the AED.",
              "Write an objective incident report with times and actions while it's fresh, notify the manager, share details only with those who need them, and replace the AED pads and check it's ready."
            ),
            part(
              "Review",
              "Reviews the emergency action plan afterwards (what worked, what to improve) and supports staff involved.",
              "Debrief with the team, update the EAP if anything slowed us down, and check in with the staff involved."
            ),
          ],
        },
      ],
    },
  ],
};
