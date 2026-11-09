import { FITNESS_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-149: ACSM Certified Personal Trainer (ACSMCPT), authored to the depth
// of the NASM-CPT pilot (REQ-123) in ACSM's own framework: the
// preparticipation screening algorithm, FITT-VP prescription, heart-rate
// reserve (Karvonen) targets and RPE, S.M.A.R.T.S. goals, and the criteria
// for stopping exercise.
//
// Outline: ACSM-CPT exam content outline effective July 10, 2025 (Initial
// Client Consultation and Assessment 25%, Exercise Programming and
// Implementation 43%, Exercise Leadership and Client Education 22%, Legal and
// Professional Responsibilities 10%); the exams reflect ACSM's Guidelines for
// Exercise Testing and Prescription, 12th edition (GETP12), from that date.
// Both checked on acsm.org on 2026-11-07. Density ("hybrid"): 1/3/2/1 = 7.
//
// Values and where they were checked (2026-11-07):
//   - Screening algorithm and the definitions it uses: Riebe et al., "Updating
//     ACSM's recommendations for exercise preparticipation health screening",
//     Med Sci Sports Exerc 2015;47(11):2473-2479 (the GETP model). Regular
//     exercise = planned, structured activity at least 30 minutes at moderate
//     intensity on at least 3 days a week for at least the last 3 months.
//     Moderate = 40-59% heart-rate reserve (HRR), 3-5.9 METs, RPE 12-13 (6-20);
//     vigorous = 60% HRR or more, 6 METs or more, RPE 14 or more. CVD risk
//     factors alone (for example high blood pressure) no longer trigger
//     referral; known disease or signs/symptoms do.
//   - FITT for apparently healthy adults: Garber et al., ACSM position stand,
//     Med Sci Sports Exerc 2011;43(7):1334-1359 -- aerobic: moderate at least
//     5 days/week (30-60 min) or vigorous at least 3 days/week (20-60 min);
//     resistance: each major muscle group 2-3 days/week with 48 hours between
//     sessions, 60-70% 1RM for novice to intermediate (40-50% for older or
//     sedentary beginners), 8-12 reps, 2-4 sets, 2-3 minutes between sets.
//   - Physical Activity Guidelines for Americans, 2nd ed. (2018): adults
//     150-300 min moderate or 75-150 min vigorous aerobic activity a week plus
//     muscle-strengthening on 2 or more days (Piercy et al., JAMA 2018).
//   - Blood pressure categories: 2025 AHA/ACC high blood pressure guideline
//     (stage 1 = 130-139 systolic or 80-89 diastolic mm Hg).
//   - Stopping an exercise test: ACC/AHA indications, including a drop in
//     systolic blood pressure of more than 10 mm Hg from baseline despite an
//     increase in workload, signs of poor perfusion, increasing nervous-system
//     symptoms, and the participant's request to stop.
//
// SAFETY: every client is fictional; nothing here is exercise, nutrition or
// medical advice, and no lab asks the learner to program for their own
// clients. Screening, referral and scope of practice come first. Marked for
// expert review like every authored lab (docs/labs.md).

export const ACSMCPT_LABS: SeedLabSet = {
  trackCode: "ACSMCPT",
  // REQ-142: dated by the backfill rule (the day git history shows the line
  // added, 2026-11-07, REQ-149), not re-checked in the REQ-142 pass. kind sets
  // the re-check: exam outlines and references 12 months, guidelines 6.
  sources: [
    source("https://acsm.org/wp-content/uploads/2024/12/ACSM-Certified-Personal-Trainer-Exam-Content-Outline.pdf", "exam_outline", "2026-11-07"),
    source("https://acsm.org/acsm-certified-personal-trainer-exam-content-outline", "exam_outline", "2026-11-07"),
    source("https://acsm.org/certification-exam-2025-getp12/", "clinical_guideline", "2026-11-07"),
    source("https://digitalcommons.uri.edu/kinesiology_facpubs/180", "reference", "2026-11-07"),
    source("https://www.unm.edu/~lkravitz/Article%20folder/ACSMGuidelinesUNM.pdf", "reference", "2026-11-07"),
    source("https://stacks.cdc.gov/view/cdc/121857", "reference", "2026-11-07"),
    source("https://www.eurekalert.org/news-releases/1094543", "reference", "2026-11-07"),
  ],
  labs: [
    // -----------------------------------------------------------------------
    // Initial client consultation and assessment (25%): 1
    // -----------------------------------------------------------------------
    {
      slug: "acsm-screening-algorithm-case",
      objective: "Identifying cardiovascular, metabolic and renal risk factors, signs and symptoms, and the need for medical clearance",
      kind: "case",
      title: "Run the ACSM screening algorithm",
      brief:
        "A fictional 52-year-old new client, Marcus, walks about twice a week for 20 minutes and does nothing else. He smokes, his father had a heart attack at 50, and he takes medication for high blood pressure. He has no known heart, peripheral vascular, cerebrovascular, metabolic or renal disease. He wants to \"get fit and lose the belly\" with three sessions a week.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "On the health-history form Marcus reports no chest discomfort, no unusual breathlessness, no dizziness or fainting, no ankle swelling, no palpitations and no leg pain when walking.",
          ask: "Apply the ACSM preparticipation screening algorithm and state your decision.",
          parts: [
            part(
              "Exercise participation",
              "Classifies him as not participating in regular exercise, because he does not meet at least 30 minutes of planned moderate exercise on at least 3 days a week for the last 3 months.",
              "Not a regular exerciser: two 20-minute walks a week is short of 30 minutes of moderate exercise on 3 or more days a week for 3 months."
            ),
            part(
              "Disease and signs or symptoms",
              "States no known cardiovascular, metabolic or renal disease and no signs or symptoms; recognizes smoking, family history and hypertension as risk factors that do not on their own trigger clearance under the current algorithm.",
              "No known CV, metabolic or renal disease and no signs or symptoms. Smoking, family history and high blood pressure are risk factors -- they matter for programming and education, but they don't by themselves require clearance in the current model."
            ),
            part(
              "Decision",
              "Concludes medical clearance is not necessary; starts at light-to-moderate intensity and progresses gradually, and notes he should keep his physician involved in managing his blood pressure.",
              "Clearance not necessary. Start light to moderate (about 40-59% HRR, RPE 12-13) and progress gradually; encourage him to keep his doctor informed about his blood pressure."
            ),
          ],
        },
        {
          text: "At the first session his seated resting blood pressure, measured correctly after five minutes' rest, is 136/84 mm Hg, on his medication.",
          ask: "What does this reading mean for the session and what do you say to Marcus?",
          parts: [
            part(
              "Interpretation",
              "Places 136/84 in the stage 1 hypertension range (130-139 systolic or 80-89 diastolic) without diagnosing, and recognizes it as no reason on its own to stop a light-to-moderate session.",
              "136/84 falls in the stage 1 range on current categories. It's not a diagnosis from me and isn't a reason to cancel a light-to-moderate session."
            ),
            part(
              "Communication and programming",
              "Suggests he share his readings with his physician, explains the training plan supports blood pressure (regular aerobic and resistance exercise), and adds practical precautions (avoid breath-holding/Valsalva, gradual cool-down).",
              "\"Worth sharing these readings with your doctor. Regular aerobic and strength work helps blood pressure; we'll breathe through every lift and finish with a proper cool-down.\""
            ),
          ],
        },
        {
          text: "In week four Marcus says that on his brisk walks he now gets a burning cramp in both calves after a few minutes that goes away when he stops.",
          ask: "What do you do now, and how does it change the algorithm decision?",
          parts: [
            part(
              "Recognize the sign",
              "Recognizes leg pain on walking that is relieved by rest (claudication) as a sign or symptom suggestive of peripheral vascular disease, without diagnosing it.",
              "Calf burning that comes on with walking and eases with rest is a classic sign that could suggest a circulation problem -- I can't diagnose it, but it's a listed warning sign."
            ),
            part(
              "Algorithm and action",
              "Applies the algorithm: new signs or symptoms mean stopping the exercise program and getting medical clearance before continuing; refers to his physician and documents it.",
              "New signs or symptoms: pause the program and refer him to his physician for clearance before we continue; I document the report and the referral."
            ),
            part(
              "After clearance",
              "States that once cleared he resumes at light-to-moderate intensity, progressing as tolerated within any limits the physician gives.",
              "With clearance, restart at light-to-moderate intensity and progress as tolerated within the physician's limits."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Exercise programming and implementation (43%): 3
    // -----------------------------------------------------------------------
    {
      slug: "acsm-fitt-vp-karvonen",
      objective: "Determining initial Frequency, Intensity, Time and Type, including target heart rate by heart-rate reserve and RPE",
      kind: "build",
      title: "Write an initial aerobic FITT-VP",
      brief:
        "A fictional 40-year-old client, Elena, apparently healthy and screened with no clearance needed, has been inactive for a year. Resting heart rate 70 bpm (measured on three mornings). The facility uses 220 - age for predicted maximal heart rate. She likes cycling and walking and can exercise on most days.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write her initial aerobic prescription using the heart-rate reserve method and RPE.",
          parts: [
            part(
              "Target heart rate (HRR)",
              "Calculates predicted HRmax 180 bpm and HRR 110 bpm, and a moderate target range of about 114-135 bpm from 40-59% HRR (target = HRR x % + resting HR), showing the working.",
              "HRmax = 220 - 40 = 180. HRR = 180 - 70 = 110. 40%: 110 x 0.40 + 70 = 114 bpm. 59%: 110 x 0.59 + 70 = about 135 bpm. Target about 114-135 bpm."
            ),
            part(
              "RPE",
              "Pairs the heart-rate range with a matching RPE (about 12-13 on the 6-20 scale for moderate), and explains why RPE matters since predicted HRmax can be inaccurate.",
              "RPE about 12-13 (\"somewhat hard\") on the 6-20 scale; predicted maximal heart rate can be off by a fair margin, so RPE is a check on the number."
            ),
            part(
              "Frequency, time, type",
              "Gives frequency (moderate on at least 5 days a week, or fewer days if starting lower and building), time (building toward 30-60 minutes a day for about 150 minutes a week), and type (rhythmic, large-muscle activity such as cycling and walking).",
              "Type: cycling and brisk walking. Frequency: 5 days a week. Time: start with 20 minutes (in bouts if needed) and build to 30 minutes, reaching at least 150 minutes a week."
            ),
            part(
              "Volume and progression",
              "States weekly volume and a gradual progression (increase time before intensity, small steps every 1-2 weeks), and reassessment.",
              "Volume: start near 100 minutes a week and reach 150+. Progress time by about 5-10 minutes per session every week or two; only then nudge intensity toward the top of the range. Reassess in 6-8 weeks."
            ),
          ],
        },
      ],
    },
    {
      slug: "acsm-resistance-prescription",
      objective: "Resistance training methods: periodization, repetition maximum testing, sets, loads and rest",
      kind: "build",
      title: "Set loads from an RM test",
      brief:
        "A fictional 34-year-old client, Theo, apparently healthy and screened, is new to resistance training. After two weeks of learning technique, a supervised submaximal repetition-maximum test estimated his 1RM on the leg press at 140 kg and on the chest press machine at 60 kg. He wants general strength and can train three non-consecutive days a week.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write his starting resistance prescription and how it will progress.",
          parts: [
            part(
              "Loads",
              "Uses about 60-70% 1RM for a novice: about 84-98 kg on the leg press and 36-42 kg on the chest press, showing the calculation.",
              "Leg press: 140 x 0.60-0.70 = 84-98 kg. Chest press: 60 x 0.60-0.70 = 36-42 kg."
            ),
            part(
              "Reps, sets and rest",
              "Prescribes 8-12 repetitions, starting with 1-2 sets and building toward 2-4 sets, with about 2-3 minutes' rest between sets.",
              "8-12 reps; start with 2 sets and build toward 3-4 over the coming weeks; rest about 2-3 minutes between sets."
            ),
            part(
              "Frequency and exercise selection",
              "Trains each major muscle group 2-3 days a week with at least 48 hours between sessions for the same group, with a balanced set of multi-joint exercises.",
              "Three full-body days (for example Mon/Wed/Fri), at least 48 hours apart: leg press, chest press, seated row, Romanian deadlift, overhead press, plank."
            ),
            part(
              "Why submaximal testing and how to progress",
              "Explains why a submaximal RM test suits a novice (lower risk while technique is new), and progresses load when the top of the rep range is reached with good form (for example add load and drop back to the bottom of the range), with a later move to a simple periodized plan.",
              "A submaximal test avoids a true 1RM while technique is new. When he does 12 clean reps on all sets, add a small amount of load and drop back to 8 reps. After 8-12 weeks, vary volume and load across blocks."
            ),
          ],
        },
      ],
    },
    {
      slug: "acsm-abnormal-response-case",
      objective: "Monitoring technique and response, recognizing abnormal responses and criteria for stopping exercise",
      kind: "case",
      title: "Watch the response, not just the reps",
      brief:
        "A fictional 58-year-old client, Ruth, apparently healthy and cleared for moderate exercise, is in week three of a program that includes a leg press and a submaximal cycle-ergometer test you run with blood pressure checks at each stage.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "On the leg press Ruth's face reddens and she holds her breath through every rep.",
          ask: "What is happening and how do you correct it?",
          parts: [
            part(
              "Valsalva",
              "Identifies breath-holding against a closed airway (the Valsalva maneuver) and explains it can sharply raise blood pressure and should be avoided.",
              "She's performing a Valsalva maneuver -- holding her breath while straining -- which spikes blood pressure."
            ),
            part(
              "Correction",
              "Cues continuous breathing (exhale during the effort, inhale on the return) and adjusts the load if she can't breathe through it.",
              "\"Breathe out as you push, in as you lower.\" If she still strains, lighten the load until she can breathe through each rep."
            ),
          ],
        },
        {
          text: "During the cycle test, systolic blood pressure is 148 mm Hg at stage 2. At stage 3, with the workload increased, it reads 132 mm Hg on a repeated check. Ruth looks pale and says she feels light-headed.",
          ask: "What do you do?",
          parts: [
            part(
              "Stop the test",
              "Stops the test because systolic pressure fell by more than 10 mm Hg despite an increased workload and there are signs of poor perfusion (pallor) and light-headedness.",
              "Stop the test: a systolic drop of 16 mm Hg with a higher workload, plus pallor and light-headedness, are criteria for stopping."
            ),
            part(
              "Immediate care",
              "Lowers the workload to an active cool-down or helps her lie or sit down safely if she feels faint, keeps monitoring symptoms, heart rate and blood pressure, and activates emergency services if symptoms worsen or don't resolve.",
              "Drop to a very easy pedal or help her off to lie down if she feels faint; keep checking symptoms, heart rate and blood pressure; call emergency services if anything worsens or doesn't settle."
            ),
          ],
        },
        {
          text: "After ten minutes Ruth feels better and her readings return toward her resting values.",
          ask: "What happens next?",
          parts: [
            part(
              "Referral and documentation",
              "Documents the test, readings and symptoms, refers her to her physician before further vigorous testing or training, and doesn't diagnose a cause.",
              "Record every reading and symptom, and ask Ruth to see her physician before we test or train hard again; I don't guess at the cause."
            ),
            part(
              "Communication",
              "Explains calmly and honestly why the test was stopped without alarming her, and agrees how sessions will continue (for example only light activity or none until cleared).",
              "\"Your blood pressure dropped when it should have risen, so I stopped to be safe. Let's have your doctor look at it before we continue.\""
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Exercise leadership, client education and engagement (22%): 2
    // -----------------------------------------------------------------------
    {
      slug: "acsm-plateau-communication-case",
      objective: "Optimizing adherence through effective communication, feedback and motivational strategies",
      kind: "case",
      title: "A plateau, handled with conversation",
      brief:
        "A fictional client, Jordan, has trained three times a week for five months. Strength rose steadily for four months but has stalled for five weeks. Jordan says, \"Maybe I should just train every day. I'm clearly not working hard enough.\"",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Jordan is frustrated and has skipped two sessions this month.",
          ask: "How do you open the conversation?",
          parts: [
            part(
              "Listening first",
              "Uses open questions and reflective listening to understand the client's view before advising, and affirms progress made.",
              "\"You've gained a lot in five months -- what's made the last few weeks feel so frustrating?\" Then reflect back what Jordan says."
            ),
            part(
              "Reframe the plateau",
              "Explains plateaus as a normal response to a program that hasn't changed, and that more volume isn't automatically the answer (recovery matters).",
              "Plateaus are normal once the body adapts to the same program; adding more days without recovery often makes it worse."
            ),
          ],
        },
        {
          text: "Jordan mentions sleeping about five hours a night since a promotion and wanting to bench press their bodyweight \"someday\".",
          ask: "What do you agree together?",
          parts: [
            part(
              "S.M.A.R.T.S. goal",
              "Turns \"someday\" into a S.M.A.R.T.S. goal the client helps set (specific, measurable, attainable, relevant, time-bound and self-determined).",
              "Jordan's own goal: \"Bench 5 kg more than now for 5 reps within 8 weeks, training 3 days a week.\""
            ),
            part(
              "Program and recovery",
              "Changes the program variables (for example a new block of load and reps) instead of adding days, and gives general sleep and recovery education within scope.",
              "A new 4-week block with heavier, lower-rep work and one lighter week after; keep 3 days. General sleep tips, and suggest talking to a doctor if sleep stays poor."
            ),
            part(
              "Feedback and self-monitoring",
              "Sets up self-monitoring (a training log) and regular, specific feedback that highlights progress.",
              "Jordan logs every session in an app; I give specific feedback each week (\"bar speed is up\") and we review the log every two weeks."
            ),
          ],
        },
      ],
    },
    {
      slug: "acsm-guidelines-education",
      objective: "Educating clients on physical activity guidelines, healthy eating basics and self-monitoring within scope",
      kind: "build",
      title: "Educate a client within scope",
      brief:
        "A fictional 45-year-old client, Lin, apparently healthy and screened, trains with you once a week. Lin asks three things: \"How much exercise should I be doing on my own?\", \"Can you give me a diet to drop 10 kg?\" and \"How do I know I'm on track between sessions?\"",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Answer Lin's three questions.",
          parts: [
            part(
              "Physical activity guidelines",
              "Gives the adult guidelines: 150-300 minutes a week of moderate aerobic activity (or 75-150 vigorous, or a mix) plus muscle-strengthening on at least 2 days, and turns it into a weekly plan.",
              "Adults should aim for 150-300 minutes of moderate activity a week (or 75-150 vigorous) plus strength work on at least 2 days. For you: our session plus a second strength day and 30-minute brisk walks on 5 days."
            ),
            part(
              "Healthy eating within scope",
              "Declines to write an individual diet or calorie plan, gives general evidence-based healthy-eating information (for example national dietary guidelines), and refers to a registered dietitian for an individual plan.",
              "An individual diet is outside my scope. I can share general healthy-eating guidance from the national dietary guidelines, and I'd refer you to a registered dietitian for a personal plan."
            ),
            part(
              "Self-monitoring",
              "Suggests specific self-monitoring tools (for example a step count or activity log, session RPE, waist measurement, how clothes fit) and when to review them together.",
              "Log your walks and strength sessions (time and RPE), check daily steps, and measure your waist every 4 weeks; we'll look at it together each month."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Legal and professional responsibilities (10%): 1
    // -----------------------------------------------------------------------
    {
      slug: "acsm-collaboration-confidentiality-case",
      objective: "Collaborating and referring with health care and allied health professionals",
      kind: "case",
      title: "Working with the care team",
      brief:
        "A fictional 64-year-old client, Gwen, with knee osteoarthritis, has just been discharged from physical therapy and wants to keep exercising with you. She is cleared by her physician for exercise.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Gwen brings her physical therapist's discharge summary listing exercises to continue and movements to avoid for now.",
          ask: "How do you use it and work with the therapist?",
          parts: [
            part(
              "Follow the plan",
              "Builds on the therapist's continuing exercises, avoids the listed movements, and keeps the plan within the trainer's scope.",
              "Keep her prescribed exercises in the warm-up, leave out the movements on the avoid list, and build general strength and walking around them."
            ),
            part(
              "Communication with consent",
              "Gets Gwen's written consent before contacting the therapist, and agrees what will be shared and when.",
              "With Gwen's written consent, I'll send the therapist a short update after 6 weeks and ask any questions about progressing."
            ),
          ],
        },
        {
          text: "Gwen's adult son phones you and asks how his mother is doing and what her knee problem is.",
          ask: "How do you respond?",
          parts: [
            part(
              "Confidentiality",
              "Does not share health or training information without Gwen's consent, politely explains why, and suggests he ask his mother.",
              "\"I'm not able to share anything about a client without their permission. I'd suggest you ask your mother directly.\""
            ),
          ],
        },
        {
          text: "In week five Gwen mentions new numbness and tingling in both feet that started a few weeks ago.",
          ask: "What do you do?",
          parts: [
            part(
              "Referral",
              "Recognizes a new symptom outside the trainer's scope, does not guess a cause, and refers her to her physician promptly, documenting it.",
              "That's a new symptom I can't assess. Please see your physician soon; I'll note it in your file."
            ),
            part(
              "Program in the meantime",
              "Adjusts for safety while awaiting review (for example seated or supported balance work, footwear and surface checks) and continues only as the physician advises.",
              "Until she's seen, keep balance work supported, check her feet and footwear, and use stable surfaces; continue as her physician advises."
            ),
          ],
        },
      ],
    },
  ],
};
