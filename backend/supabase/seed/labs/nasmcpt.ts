import { FITNESS_SAFETY, part, selectPart, orderPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-123 pilot: NASM Certified Personal Trainer (NASM-CPT, 7th edition).
//
// Aligned to the NASM-CPT exam blueprint's six domains (Basic and Applied
// Sciences and Nutritional Concepts 15%, Assessment 16%, Program Design 20%,
// Exercise Technique and Training Instruction 24%, Client Relations and
// Behavioral Coaching 15%, Professional Development and Responsibility 10%)
// and the Optimum Performance Training (OPT) model the exam is written
// around.
//   https://www.nasm.org/content/dam/nasm/docs/nasmlibraries/pdf/cpt7-nasm-exam-blueprint.pdf
//   (the old /docs/pdf/ link now lands on NASM's home page; this one is
//   linked from NASM's exam-information page and was read 2026-11-09:
//   "UPDATED: 2.10.2021", 2019 Job Analysis Study, 15/15/16/20/24/10%)
//   NASM candidate handbook (seed credential officialObjectivesUrl)
// Density ("hybrid"): 2/2/2/2/2/1 = 11.
//
// SAFETY: every client is fictional; nothing here is exercise, nutrition or
// medical advice, and no lab asks the learner to program for their own
// clients. Screening, referral and scope of practice come first. The
// overhead-squat muscle lists follow NASM's own published tables and are
// marked for expert review like every pilot lab (docs/labs.md).

export const NASMCPT_LABS: SeedLabSet = {
  trackCode: "NASMCPT",
  sources: [
    source("https://www.nasm.org/content/dam/nasm/docs/nasmlibraries/pdf/cpt7-nasm-exam-blueprint.pdf", "exam_outline", "2026-11-09"),
    source("https://www.nasm.org/certified-personal-trainer/exam-information", "exam_outline", "2026-11-07"),
  ],
  labs: [
    {
      slug: "energy-systems-by-activity",
      objective: "Bioenergetics and metabolism: energy systems and their role across intensities and durations",
      kind: "build",
      title: "Match the energy system to the activity",
      brief:
        "A fictional client's training week includes (1) 8-second hill sprints at maximal effort, (2) 60-second hard rowing intervals, and (3) a 40-minute steady jog at a conversational pace.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the main energy system for each and what it means for rest between efforts.",
          parts: [
            part("8-second sprints", "Names the ATP-PC (phosphagen) system as primary for maximal efforts of up to about 15 seconds.", "ATP-PC (phosphagen) system: stored ATP and creatine phosphate supply maximal effort for about the first 15 seconds."),
            part("60-second intervals", "Names anaerobic glycolysis (the glycolytic system) as primary for hard efforts of roughly 30 seconds to 2 minutes.", "Anaerobic glycolysis: the main supplier for hard efforts lasting from about 30 seconds to 2 minutes."),
            part("40-minute jog", "Names the oxidative (aerobic) system as primary for sustained lower-intensity work.", "The oxidative (aerobic) system: long, steady, lower-intensity work."),
            part("Rest implication", "Explains that maximal short efforts need relatively long rest to restore phosphocreatine (around several minutes for full recovery), while aerobic work needs little or none.", "Maximal sprints need long rest between efforts so phosphocreatine can be restored (full recovery takes a few minutes); the steady jog needs no rest intervals."),
          ],
        },
      ],
    },
    {
      slug: "macronutrient-label-math",
      objective: "Nutrition fundamentals: macronutrients, micronutrients, hydration and energy balance",
      kind: "build",
      title: "Read a label and stay in scope",
      brief:
        "A fictional client shows you a snack bar label: 30 g carbohydrate, 20 g protein, 10 g fat per bar. They ask how many calories it has, what share comes from protein, and whether you can write them a 1,200-calorie daily meal plan.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Answer the client's three questions.",
          parts: [
            part("Calories", "Uses 4 kcal/g for carbohydrate and protein and 9 kcal/g for fat to get 290 kcal.", "30 x 4 = 120 + 20 x 4 = 80 + 10 x 9 = 90 -> 290 kcal per bar."),
            part("Protein share", "Gets about 28% (80 / 290).", "80 / 290 = about 28% of the bar's calories come from protein."),
            part("Meal plan request", "Declines to write a specific meal plan as outside a personal trainer's scope, offers general evidence-based guidance (for example public dietary guidelines), and refers to a registered dietitian.", "Writing a specific calorie-set meal plan is outside a trainer's scope. I can share general healthy-eating guidance and refer you to a registered dietitian for an individual plan."),
          ],
        },
      ],
    },
    {
      slug: "smart-goals-from-a-wish",
      objective: "Setting and re-evaluating realistic short- and long-term goals with the client from assessment outcomes",
      kind: "build",
      title: "Turn a vague wish into SMART goals",
      brief:
        "A fictional 41-year-old client says, \"I want to get in shape for my daughter's wedding in five months.\" Their assessment shows they walk about 3,000 steps a day, can hold a plank for 20 seconds with good form, and report low energy in the afternoons. They can train three days a week.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the goals and how you will track them.",
          parts: [
            part("Long-term goal", "Writes one long-term goal that is specific, measurable, attainable, relevant and time-bound, built from the assessment rather than an arbitrary weight number.", "By the wedding in 20 weeks, train three times a week and average 7,000 steps a day, and hold a 60-second plank with good form."),
            part("Short-term goals", "Writes at least two short-term (for example 2-4 week) goals that step toward it, including at least one process (behavior) goal.", "Weeks 1-4: complete 3 sessions a week and add a 10-minute walk after lunch on 5 days (about 4,500 steps a day). By week 4: plank 30 seconds with good form."),
            part("Tracking and review", "Names how progress is measured (step counts, plank time, session attendance, energy rating) and when goals are reviewed and adjusted with the client.", "Track steps from the client's phone, sessions completed and a weekly 1-10 afternoon energy rating; reassess plank time every 4 weeks and adjust the goals together."),
          ],
        },
      ],
    },
    {
      slug: "adherence-lapse-case",
      objective: "Behavior-change models and motivational techniques that sustain adherence",
      kind: "case",
      title: "A client who stopped coming",
      brief:
        "A fictional client trained consistently twice a week for four months, then missed three weeks after starting a new job. They message: \"Sorry, I've fallen off the wagon. Maybe this just isn't for me.\"",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "You arrange a short call.",
          ask: "How do you open the conversation and where is the client in the stages of change?",
          parts: [
            part(
              "Stage of change",
              "Recognizes a lapse/relapse from the action stage (or maintenance) in the transtheoretical model, not a client who was never ready.",
              "They were in the action stage for four months and have lapsed with the job change -- a normal part of change, not proof they're unsuited."
            ),
            part(
              "Opening",
              "Responds without judgment and uses motivational interviewing: open questions, reflective listening, affirming past success.",
              "\"Four months of consistent training is a real achievement. What's changed with the new job?\" -- then reflect back what they say."
            ),
          ],
        },
        {
          text: "The client says time is the barrier: long commutes and late meetings.",
          ask: "What do you agree together?",
          parts: [
            part(
              "Problem solving",
              "Adjusts the plan to the barrier with the client (for example shorter sessions, home or lunchtime workouts, a set day and time), using specific implementation intentions.",
              "Together set two 30-minute sessions a week at fixed times the client chooses, plus a 15-minute home routine; plan exactly when and where ('Tuesday 07:00 before work')."
            ),
            part(
              "Re-evaluating goals",
              "Re-sets realistic short-term goals so the restart is winnable, and plans a check-in.",
              "Make the next two weeks' goal simply attending both short sessions; check in at the end of week 2 and adjust."
            ),
          ],
        },
      ],
    },
    {
      slug: "overhead-squat-interpretation",
      objective: "Static and dynamic postural assessments and the movement compensations they reveal",
      kind: "build",
      title: "Interpret an overhead squat assessment",
      brief:
        "In an overhead squat assessment (anterior view), a fictional client's feet turn out and their knees move inward as they descend. Lateral view shows no other compensations. The client has no pain and has been cleared to exercise.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Interpret the compensations and plan the corrective approach.",
          parts: [
            part("Knees move inward: likely overactive", "Names the commonly listed overactive muscles for knee valgus in NASM's model: the adductor complex and tensor fascia latae (also biceps femoris short head, vastus lateralis).", "Adductor complex, tensor fascia latae, biceps femoris (short head) and vastus lateralis."),
            part("Knees move inward: likely underactive", "Names gluteus medius and gluteus maximus (and vastus medialis oblique) as likely underactive.", "Gluteus medius, gluteus maximus and vastus medialis oblique."),
            part("Feet turn out", "Names likely overactive soleus/lateral gastrocnemius (and biceps femoris short head) and underactive medial gastrocnemius/medial hamstrings (and related muscles).", "Overactive: soleus, lateral gastrocnemius, biceps femoris (short head). Underactive: medial gastrocnemius, medial hamstrings, gracilis, sartorius, popliteus."),
            part("Corrective sequence", "Orders the corrective continuum: inhibit (self-myofascial techniques), lengthen (static stretching), activate (isolated strengthening), integrate (total-body movement), with one example for this client.", "Inhibit: foam roll the adductors and calves. Lengthen: static stretch adductors and calves. Activate: side-lying hip abduction and glute bridges. Integrate: ball wall squats with knees tracking over the toes."),
          ],
        },
      ],
    },
    {
      slug: "refer-out-screening-case",
      objective: "Preparticipation screening, health history and when to refer to a medical professional",
      kind: "case",
      title: "A screening answer that changes everything",
      brief:
        "A fictional 52-year-old new client, inactive for years, completes a preparticipation questionnaire (PAR-Q+) before the first session.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "The client answers yes to having felt pain in the chest during physical activity in the past month.",
          ask: "What do you do?",
          parts: [
            part(
              "Decision",
              "Does not start exercise testing or training; refers the client to their physician (or other qualified health professional) for evaluation and clearance before any exercise.",
              "Stop before any testing or training and refer the client to their physician for evaluation; we start only with medical clearance."
            ),
            part(
              "Communication",
              "Explains the reason respectfully, without diagnosing, and documents the screening and referral.",
              "Explain that the answer needs a doctor's review before we exercise -- not a diagnosis, just safe practice -- and record the questionnaire and referral."
            ),
          ],
        },
        {
          text: "The client returns with written clearance. The note says they now take a beta-blocker for high blood pressure.",
          ask: "How does that change how you monitor intensity?",
          parts: [
            part(
              "Intensity monitoring",
              "Explains that beta-blockers blunt heart rate response, so heart-rate-based zones are unreliable; uses rating of perceived exertion or the talk test instead, and follows any physician limits.",
              "Beta-blockers lower the heart rate response, so heart-rate zones would mislead us. Use rating of perceived exertion and the talk test, and stay within any limits the physician set."
            ),
          ],
        },
        {
          text: "In week three, during a moderate circuit, the client stops and says they feel dizzy with tightness in the chest.",
          ask: "What do you do?",
          parts: [
            part(
              "Emergency response",
              "Stops the exercise, has the client sit or lie down safely, activates emergency medical services per the emergency action plan, stays with the client, and is ready to perform CPR/use an AED if needed.",
              "Stop the session, help the client sit or lie down, call emergency services following the facility's emergency action plan, stay with them, and be ready to start CPR and use the AED if they become unresponsive."
            ),
            part(
              "Afterwards",
              "Documents the incident and does not resume training without new medical clearance.",
              "Complete an incident report and don't resume training until the client has fresh medical clearance."
            ),
          ],
        },
      ],
    },
    {
      slug: "phase-one-program",
      objective: "Designing resistance and cardiorespiratory training with appropriate acute variables",
      kind: "build",
      title: "Design a first program in the OPT model",
      brief:
        "A fictional 35-year-old office worker, cleared to exercise with no medical conditions, has not trained in years and wants to \"feel stronger and lose some fat\". Overhead squat assessment: arms fall forward. They can train three days a week for 60 minutes.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the program's phase, variables, exercises and progression.",
          parts: [
            part("Phase", "Chooses Phase 1, Stabilization Endurance, and justifies it from the client's deconditioning and the compensation.", "Phase 1, Stabilization Endurance: a deconditioned beginner with a movement compensation first needs stability, endurance and better posture."),
            part("Acute variables", "Gives stabilization-endurance variables: about 1-3 sets of 12-20 reps, slow controlled tempo (for example 4/2/1), short rest (up to about 90 seconds), low to moderate intensity.", "1-3 sets of 12-20 reps, slow tempo (4/2/1), 0-90 seconds rest, light load."),
            part("Exercise selection", "Selects stabilization-level exercises in a controlled but proprioceptively challenging environment, including ones that address arms falling forward (for example standing cable rows, ball cobra, floor bridges, single-leg balance).", "Floor bridge, ball wall squat, standing cable row, ball cobra, push-up on a bench, single-leg balance reach; plus flexibility work for the latissimus dorsi and pectorals."),
            part("Progression", "Progresses by proprioception and form before load, and moves to Phase 2 after roughly four weeks when technique and stability criteria are met.", "Progress from stable to less stable surfaces as form holds, then add load; reassess after about four weeks and move to Phase 2 (Strength Endurance) when stability and technique are solid."),
          ],
        },
      ],
    },
    {
      slug: "older-adult-balance-program",
      objective: "Program design considerations for special populations: youth, older adults, prenatal, clinical and obese clients",
      kind: "build",
      title: "Adapt a program for an older adult",
      brief:
        "A fictional 72-year-old client has been cleared by their physician for exercise. They had one fall last winter, walk without an aid, and want to keep gardening and playing with their grandchildren. They feel unsteady when turning quickly.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the key elements of the program.",
          parts: [
            part("Emphasis", "Prioritizes balance, functional strength and stabilization (Phase 1 of OPT) with progression at a pace the client tolerates.", "Stabilization-focused training (Phase 1) centered on balance, leg strength and everyday movements like getting up from a chair and turning."),
            part("Balance work and progression", "Names at least two balance exercises with a safe progression (support -> less support -> unstable/dynamic) and a nearby support or spotter.", "Two-leg stance near a counter -> tandem stance -> single-leg stance with fingertip support -> single-leg reach; walking with head turns later. Always near something to hold and with me alongside."),
            part("Safety and monitoring", "Covers environment (clear floor, stable support, non-slip surface), monitoring with RPE/talk test, and watching for dizziness or new symptoms and referral if they occur.", "Clear, non-slip space with a sturdy chair or rail within reach; monitor effort with the talk test or RPE; stop and refer if dizziness, chest symptoms or new pain appear."),
          ],
        },
      ],
    },
    {
      slug: "cue-knee-valgus-squat",
      objective: "Correcting technique with verbal, visual and kinesthetic cues and kinetic-chain checkpoints",
      kind: "build",
      title: "Coach a squat whose knees cave in",
      brief:
        "During a goblet squat a fictional client's knees move inward as they rise, and their heels lift slightly at the bottom. They have no pain.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write how you correct the movement.",
          parts: [
            part("Checkpoint", "Names the kinetic-chain checkpoints involved (feet straight and flat, knees in line with the second and third toes) and states which are off.", "Feet and ankles: heels lifting; knees: moving inward instead of tracking over the second and third toes."),
            part("Verbal and visual cues", "Gives a short, external-focus verbal cue and a visual cue (for example a demonstration or mirror).", "\"Push the floor apart with your feet and keep your knees over your toes\"; demonstrate, then let them watch the knee line in the mirror."),
            part("Kinesthetic cue", "Uses a tactile/kinesthetic cue such as a light mini-band above the knees or a hand guiding the knee line.", "A light mini-band just above the knees gives them something to push out against."),
            part("Regression", "Regresses the exercise (less depth, lighter load, box/ball wall squat) until the pattern is clean, then progresses.", "Reduce depth and load -- for example a ball wall squat or squat to a box -- until the knees track well for a full set, then progress again."),
          ],
        },
      ],
    },
    {
      slug: "push-up-progressions",
      objective: "Regressions and progressions matched to the client's ability",
      kind: "build",
      title: "Regress and progress a push-up",
      brief:
        "Two fictional clients: Client A cannot keep the hips level for a full floor push-up and their low back sags after three reps. Client B performs 20 floor push-ups with good form and finds them easy.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a regression for A, a progression for B, and the rule you use.",
          parts: [
            part("Regression for Client A", "Chooses an easier variation that keeps a neutral spine (incline push-up on a bench or wall, or from the knees) and states the form standard.", "Incline push-up with hands on a bench (or a wall), keeping a straight line from head to heels; lower the incline as control improves."),
            part("Progression for Client B", "Progresses appropriately, for example by adding stability demand (hands or feet on a stability ball) or load, in line with the OPT phase.", "Feet or hands on a stability ball, then a single-leg push-up, or add load once the instability is mastered."),
            part("Progression rule", "States a rule: progress only when form is consistent for the prescribed reps, moving from stable to unstable and simple to complex.", "Progress only when every rep is clean for the target reps, moving stable to unstable, slow to fast and simple to complex."),
          ],
        },
      ],
    },
    {
      slug: "scope-of-practice-case",
      objective: "Scope of practice and when to refer to other health professionals",
      kind: "case",
      title: "Where the trainer's job ends",
      brief: "A fictional client of six months trusts you and asks for help with more than training.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "The client says their knee has had a sharp pain during lunges for two weeks and asks what is wrong with it.",
          ask: "What do you do?",
          parts: [
            part(
              "Response",
              "Does not diagnose; stops or modifies exercises that cause pain and refers the client to a licensed health professional (physician or physical therapist).",
              "I can't diagnose pain. Let's remove lunges and anything that hurts, and I'd like you to see your doctor or a physical therapist before we load that knee again."
            ),
          ],
        },
        {
          text: "The client also asks you to recommend a supplement a friend says \"burns fat\".",
          ask: "How do you answer?",
          parts: [
            part(
              "Supplement question",
              "Does not recommend or prescribe the supplement; gives general information about evidence and safety, and refers to a registered dietitian or physician.",
              "I don't recommend supplements; that's for your doctor or a registered dietitian, who can check it against your health and any medications."
            ),
          ],
        },
        {
          text: "The client is cleared by a physical therapist with a list of exercises to avoid for six weeks.",
          ask: "What do you do with that information?",
          parts: [
            part(
              "Working within the plan",
              "Follows the professional's restrictions, documents them, communicates with the client (and the therapist with consent) and adjusts the program.",
              "File the restrictions in the client's record, remove the listed exercises for six weeks, and, with the client's consent, keep the therapist updated on progress."
            ),
          ],
        },
      ],
    },
    // REQ-295 (2026-11-14): density fill, Professional development and
    // responsibility (10%) gets its second lab. Values read 2026-11-14:
    // 2025 AHA adult BLS guideline (Circulation 2025;152(suppl 2):S448-S478):
    // a lay rescuer treats an unresponsive adult who is not breathing
    // normally (only gasping) as cardiac arrest without a pulse check,
    // activates the emergency response then starts CPR at once, compresses
    // 100-120/min to at least 2 in (5 cm) but not more than 2.4 in (6 cm),
    // and continues CPR until an AED is applied. AHA Go Red for Women
    // warning-signs sheet: chest pain or discomfort; nausea or vomiting; jaw,
    // neck or back pain; arm or shoulder pain; shortness of breath; feeling
    // very tired, lightheaded or faint -- "Call 911 right away" for one or
    // more.
    {
      slug: "emergency-on-the-gym-floor",
      objective: "Legal and risk-management basics: liability, documentation, emergency response",
      kind: "case",
      title: "Chest pressure mid-session, then a collapse",
      brief:
        "You are a fictional certified personal trainer at Maple Court Fitness (fictional), which has an AED by the front desk and a written emergency plan. Your 9:00 client, Mr. Haddad, a fictional 58-year-old, cleared his health screening in March and has trained with you twice a week since.",
      safetyNote: FITNESS_SAFETY,
      sources: [
        source("https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support", "clinical_guideline", "2026-11-14"),
        source("https://www.goredforwomen.org/-/media/Files/Health-Topics/Heart-Attack/Heart-Attack-warning-signs-infographic.pdf", "clinical_guideline", "2026-11-14"),
      ],
      steps: [
        {
          text: "Ten minutes into a moderate treadmill walk he slows down and says: 'I've got a pressure in my chest, it's going into my left arm, and I feel a bit sick.' He is pale and sweating more than usual. He adds that his knees are fine today and he slept badly.",
          ask: "Tap what he said or showed that means stop and call 911, then say exactly what you do.",
          parts: [
            selectPart(
              "Signs that mean stop and call 911",
              "Met: exactly the four warning signs -- chest pressure, pain spreading into the left arm, feeling sick, and pale and sweating. (Right picks minus wrong picks) of at least two is partly there.",
              "Chest pressure, pain going into the arm, nausea and being pale and sweaty are heart attack warning signs; the AHA says to call 911 right away for one or more of them. His knees being fine and a poor night's sleep are not warning signs and do not change what you do.",
              {
                display: "list",
                lines: ["Pressure in his chest", "It's going into his left arm", "He feels a bit sick", "Pale and sweating more than usual", "His knees are fine today", "He slept badly last night"],
                correct: [0, 1, 2, 3],
              }
            ),
            part(
              "What you do",
              "Stops the treadmill safely and has him sit or lie down; calls 911 (or has a named person call) right away and does not drive him or let him drive; sends someone for the AED and to meet EMS; stays with him and watches his breathing and responsiveness; does not diagnose, give medication or advise on it, or let him 'walk it off'. Follows the facility's emergency plan.",
              "Stop the belt, help him off and have him sit or lie down where he is. Point at a named person: 'You -- call 911, say a 58-year-old man has chest pressure going into his arm, and bring the AED from the front desk.' Do not drive him anywhere and do not let him drive himself. Stay with him, keep him still and calm, and watch his breathing and whether he answers you. Giving medicine or advice about it is not a trainer's role; tell the dispatcher what he says and follow their instructions and the gym's emergency plan."
            ),
          ],
        },
        {
          text: "Before EMS arrives he slumps sideways. He does not answer when you tap him and shout his name, and he is making only occasional gasping breaths. The colleague who called 911 is coming back with the AED.",
          ask: "Put your actions in order, then say how you do the compressions.",
          parts: [
            orderPart(
              "Order of actions",
              "Met: exactly -- make sure the area is safe; confirm he is unresponsive and not breathing normally; shout for help and make sure 911 knows he has collapsed and the AED is coming; start chest compressions; turn on the AED as soon as it arrives and follow its prompts; keep going until EMS takes over or he starts breathing normally. One item out of place is partly there.",
              "Safety first (treadmill off, space to work), then recognize arrest: unresponsive and only gasping counts as not breathing normally, and a lay rescuer does not need a pulse check. Activate help, then start CPR at once. The AED goes on as soon as it is there, and CPR continues until it is applied and whenever it says to. Stop only when EMS takes over or he clearly starts breathing normally.",
              [
                "Make sure the area is safe (belt stopped, space to work)",
                "Confirm he is unresponsive and not breathing normally (only gasping)",
                "Shout for help; make sure 911 knows he has collapsed and the AED is coming",
                "Start chest compressions",
                "Turn on the AED as soon as it arrives and follow its prompts",
                "Continue until EMS takes over or he starts breathing normally",
              ]
            ),
            part(
              "How you do the compressions",
              "States: hands in the center of the chest on the lower half of the breastbone, at 100-120 per minute, at least 2 inches (5 cm) deep but not more than 2.4 inches (6 cm), letting the chest fully recoil, minimal pauses; gasping is not normal breathing, so it does not stop CPR; pauses only for the AED's analysis or shock; swaps with another trained person when tiring so compressions stay deep.",
              "Heel of one hand in the center of the chest on the lower half of the breastbone, other hand on top, arms straight. Push hard and fast: 100 to 120 a minute, at least 2 inches (5 cm) deep but not more than 2.4 inches (6 cm), and let the chest come all the way back up each time. Keep pauses as short as possible -- only when the AED analyzes or shocks. Occasional gasps are not normal breathing, so they do not mean stop. If another trained person is there, swap before you tire, so the compressions stay deep."
            ),
          ],
        },
        {
          text: "EMS takes over, shocks once with their monitor and leaves for the hospital with a pulse. Your manager asks for the incident report today. A colleague's draft contains these lines.",
          ask: "Tap the lines that do not belong in an incident report, then say what the report should contain.",
          parts: [
            selectPart(
              "Lines that do not belong",
              "Met: exactly the guess at a diagnosis, the line blaming his bad night, and the line saying the trainer did everything perfectly. (Right picks minus wrong picks) of at least two is partly there.",
              "An incident report records what was seen and done, with times. 'Probably had a heart attack' is a diagnosis a trainer cannot make; 'it was because he slept badly' is a guess about the cause; 'staff did everything perfectly' is a judgment, not a fact, and has no place in a factual record that may be read in a legal review.",
              {
                display: "list",
                lines: [
                  "09:10 Client reported chest pressure spreading to the left arm and nausea on the treadmill; exercise stopped",
                  "09:11 911 called by front-desk staff; AED requested",
                  "Client probably had a heart attack",
                  "09:14 Client unresponsive with gasping breaths; CPR started",
                  "It happened because he slept badly",
                  "09:16 AED applied; prompts followed",
                  "Staff did everything perfectly",
                  "09:21 EMS arrived and took over care",
                ],
                correct: [2, 4, 6],
              }
            ),
            part(
              "What the report contains",
              "Facts only, written promptly: date, times, place, who was present, the client's own words, what was observed, each action taken and by whom (stop, 911, AED, CPR start time, AED use), when EMS arrived and the handover; signed by the writer. No diagnosis, cause or blame; no opinions about fault. Kept per the facility's policy, shared only with those who need it (privacy); the trainer also reports to the manager and follows the emergency plan's review, and does not post or discuss it publicly.",
              "Write it today, in plain facts: date and place; who was there; what Mr. Haddad said in his own words and what you saw; every action with its time and who did it (exercise stopped 09:10, 911 at 09:11, CPR from 09:14, AED on at 09:16, EMS at 09:21 and the handover). Sign and date it. Leave out diagnoses, guesses about why and any verdict on how staff did. Hand it to the manager under the gym's policy and keep it private -- it holds his health details and is not something for social media. Then take part in the review of how the emergency plan worked, including restocking the AED pads."
            ),
          ],
        },
      ],
    },
  ],
};
