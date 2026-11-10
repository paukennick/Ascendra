import { FITNESS_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-149: NSCA Certified Strength and Conditioning Specialist (NSCACSCS),
// authored to the depth of the NASM-CPT pilot (REQ-123) for the CSCS's
// athlete-facing scope: needs analysis, periodization and load assignment,
// testing and monitoring, technique and spotting, movement preparation,
// sport psychology, nutrition and supplements within scope, and unsafe
// training conditions.
//
// Outline: CSCS detailed content outline (DCO) effective July 1, 2025, in the
// NSCA Certification Handbook (seed track outline URL). Scientific
// Foundations: Exercise Sciences 48 items, Sport Psychology 20, Nutrition 12
// (80 scored); Practical/Applied: Program Design 44, Exercise Technique 28,
// Program Implementation 22, Organization and Administration 16 (110
// scored). Checked 2026-11-07 against the NSCA's CSCS job task analysis
// summary (2025). The current text is Essentials of Strength Training and
// Conditioning, 5th edition (Human Kinetics, 2026).
// Density ("hybrid"): 3/1/1/2/2/2/1 = 12.
//
// Values and where they were checked (2026-11-07):
//   - NSCA training load chart (adapted from Landers 1984, NSCA 2012): 1RM =
//     100%, 2 reps 95%, 3 93%, 4 90%, 5 87%, 6 85%, 7 83%, 8 80%, 9 77%,
//     10 75%, 12 70%.
//   - Load by goal (NSCA, summarised by the DoD Human Performance Resource
//     Center): strength at least 85% 1RM for 6 or fewer reps; hypertrophy
//     67-85% for 6-12; muscular endurance under 67% for 12 or more.
//   - Energy systems by duration of all-out work: phosphagen (stored ATP and
//     creatine phosphate) for about the first 15 s (OpenStax Anatomy and
//     Physiology 2e, 10.3, read 2026-11-09 -- the one convention the fitness
//     labs use), fast glycolysis from there to about 2-3 min, oxidative
//     beyond about 3 min (NSCA Basics of Strength and Conditioning Manual).
//   - Session RPE (Foster et al. 2001): CR-10 rating x session minutes =
//     training load in arbitrary units (Haddad et al., Front Neurosci 2017).
//   - Exertional heat stroke: NATA position statement -- core temperature
//     above 40.5 °C (105 °F) with central nervous system dysfunction; rectal
//     temperature is the only accurate field measure; cold-water immersion,
//     "cool first, transport second", to below about 39 °C (102.5 °F) within
//     30 minutes; acclimatization over 7-14 days.
//   - REDs, supplements: 2023 IOC REDs consensus; the FDA does not review
//     supplements for safety and effectiveness before sale (DSHEA).
//
// SAFETY: every athlete is fictional; nothing here is exercise, nutrition or
// medical advice, and no lab asks the learner to program for their own
// athletes. Scope of practice and referral to the sports medicine team come
// first. Marked for expert review like every authored lab (docs/labs.md).

export const NSCACSCS_LABS: SeedLabSet = {
  trackCode: "NSCACSCS",
  // REQ-142: dated by the backfill rule (the day git history shows the line
  // added, 2026-11-07, REQ-149), not re-checked in the REQ-142 pass. kind sets
  // the re-check: exam outlines and references 12 months, guidelines 6.
  sources: [
    source("https://www.nsca.com/globalassets/certification/certification-pdfs/nsca-certification-handbook.pdf", "exam_outline", "2026-11-07"),
    source("https://www.nsca.com/globalassets/certification/certification-pdfs/certified-strength-and-conditioning-specialist-job-task-analysis-summary-2025", "exam_outline", "2026-11-07"),
    source("https://dxpprod.nsca.com/contentassets/61d813865e264c6e852cadfe247eae52/nsca_training_load_chart.pdf", "reference", "2026-11-07"),
    source("https://www.hprc-online.org/articles/one-rep-max-for-strength", "reference", "2026-11-07"),
    source("https://www.nsca.com/uploadedFiles/NSCA/Resources/PDF/Publications/basics_of_strength_and_conditioning_manual.pdf", "reference", "2026-11-07"),
    source("https://www.frontiersin.org/articles/10.3389/fnins.2017.00612/full", "reference", "2026-11-07"),
    source("https://doi.org/10.4085/1062-6050-50.9.07", "clinical_guideline", "2026-11-09"),
    source("https://pubmed.ncbi.nlm.nih.gov/37752011/", "reference", "2026-11-07"),
  ],
  labs: [
    // -----------------------------------------------------------------------
    // Scientific Foundations: exercise science: 3
    // -----------------------------------------------------------------------
    {
      slug: "cscs-biomechanics-exercise-selection",
      objective: "Biomechanics of exercise selection and execution: planes, kinetics, lever systems and force-velocity and force-time curves",
      kind: "build",
      title: "Pick exercises from the force-velocity curve",
      brief:
        "A fictional 20-year-old collegiate sprinter has a strong back squat (2.0 x body mass) but a slow start out of the blocks, and testing shows a low rate of force development. The coach also asks why the athlete's dumbbell lateral raise feels so much harder with straight arms than with bent elbows.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Answer the coach using biomechanics.",
          parts: [
            part(
              "Force-velocity and force-time",
              "Explains that high maximal strength sits at the high-force, low-velocity end of the curve, while the start needs force produced quickly (rate of force development, early on the force-time curve), so training should add higher-velocity and ballistic work.",
              "The squat trains the high-force, low-velocity end. A block start gives only a fraction of a second, so what matters is how fast force rises -- RFD on the force-time curve. The athlete needs more fast, ballistic work."
            ),
            part(
              "Exercise selection",
              "Chooses exercises that target velocity and RFD and transfer to the start (for example loaded jumps, weightlifting derivatives, sled sprints, short sprints from a three-point start), with a reason for each.",
              "Jump squats at light loads and hang power cleans (force at higher velocity), heavy sled pushes over 10 m (horizontal force), and 10 m starts from blocks (specificity)."
            ),
            part(
              "Planes of motion",
              "Identifies the sprint start as mainly sagittal-plane movement and the lateral raise as frontal-plane abduction.",
              "The start is mainly sagittal-plane hip and knee extension; the lateral raise is shoulder abduction in the frontal plane."
            ),
            part(
              "Lever and moment arm",
              "Explains that straight arms lengthen the resistance moment arm (the load sits farther from the shoulder joint), raising the torque the shoulder abductors must produce; the shoulder works as a third-class lever.",
              "Straightening the arm moves the dumbbell farther from the shoulder, lengthening the resistance moment arm, so the torque the deltoid must overcome rises. The shoulder works as a third-class lever with a short muscle moment arm."
            ),
          ],
        },
      ],
    },
    {
      slug: "cscs-energy-system-conditioning",
      objective: "Bioenergetics and metabolism: energy systems and manipulating training variables to target them",
      kind: "build",
      title: "Conditioning for a court sport",
      brief:
        "A fictional women's college basketball team is six weeks from the season. Game analysis shows repeated all-out efforts of 3-6 seconds (sprints, jumps, cuts) separated by lower-intensity movement and stoppages, over about 40 minutes of play. The coach wants two conditioning sessions a week alongside strength training.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the conditioning and explain the energy-system reasoning.",
          parts: [
            part(
              "Energy-system demands",
              "Identifies the phosphagen system as the main supplier of the short all-out efforts, with glycolysis contributing in longer or repeated bouts, and the oxidative system supporting recovery between efforts over the game.",
              "Short 3-6 s bursts are phosphagen-driven; repeated bouts with short recovery pull in fast glycolysis; the oxidative system restores phosphocreatine between efforts across 40 minutes."
            ),
            part(
              "Repeated-sprint session",
              "Designs short maximal efforts with rest long enough to keep quality high (a long rest relative to work), with a stated number of reps and sets.",
              "Session A: 3 sets of 6 x 5-second court sprints with changes of direction, about 25-30 seconds' walk-back recovery, 3 minutes between sets -- stop a set if speed drops off clearly."
            ),
            part(
              "Longer-interval session",
              "Designs a session with longer efforts and shorter relative rest to develop glycolytic capacity and the aerobic recovery that supports repeated efforts.",
              "Session B: 6-8 x 30-second shuttle runs at hard pace with 60-90 seconds' recovery, building the ability to recover between repeated efforts."
            ),
            part(
              "Progression and fit with strength work",
              "Progresses gradually (for example more reps or shorter recovery over the weeks), and schedules conditioning so it doesn't compromise strength or power sessions.",
              "Add a rep or trim recovery slightly each week; run conditioning after strength sessions or on separate days, never before heavy lower-body work."
            ),
          ],
        },
      ],
    },
    {
      slug: "cscs-travel-recovery-case",
      objective: "Integrated physiology: performance planning, fatigue, recovery, sleep, travel and restoration",
      kind: "case",
      title: "Back-to-back away games",
      brief:
        "A fictional professional soccer squad plays away on Saturday after flying east across six time zones on Wednesday, then plays again at home on Tuesday. You monitor training with session RPE (CR-10 rating x minutes) and a morning wellness questionnaire.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Monday's 75-minute session was rated 6 by most players. Thursday's planned session is 90 minutes.",
          ask: "Calculate Monday's load and plan the week around travel.",
          parts: [
            part(
              "Session-RPE load",
              "Calculates 6 x 75 = 450 arbitrary units for Monday and explains the method (rating about the whole session, collected after it, times duration).",
              "Session RPE load = 6 x 75 = 450 AU: the player's overall CR-10 rating of the session, taken after it, times its minutes."
            ),
            part(
              "Travel plan",
              "Plans for eastward jet lag: shifting sleep and light exposure toward destination time where practical, a lighter, shorter Thursday session after arrival, hydration and movement on the flight.",
              "Thursday: cut to a 45-60-minute lighter session in local daylight; shift sleep and meals toward local time from arrival; on the flight drink regularly, move about and try to sleep on destination time."
            ),
          ],
        },
        {
          text: "On Friday several players report poor sleep and heavy legs; two report wellness scores well below their own usual range.",
          ask: "What do you do with this information?",
          parts: [
            part(
              "Individual decisions",
              "Compares each player with their own baseline rather than the squad average, reduces load for the flagged players, and discusses them with the coach and medical staff.",
              "Judge each player against their own normal; give the two flagged players a reduced session and talk to the coach and medical team about them before Saturday."
            ),
            part(
              "Recovery priorities",
              "Prioritizes sleep opportunity, nutrition and hydration, and low-intensity recovery over adding training.",
              "Protect sleep (quiet rooms, consistent bedtime on local time, naps kept short), regular meals and fluids, and an easy activation session -- no extra conditioning."
            ),
          ],
        },
        {
          text: "After Saturday's game the squad has two days before Tuesday's home game.",
          ask: "Plan the two days.",
          parts: [
            part(
              "Between-game microcycle",
              "Plans recovery on the first day (low-intensity activity, restoration) and a short, sharp, low-volume session on the second, avoiding heavy or high-volume work before the game.",
              "Sunday: recovery -- light bike, mobility, restoration, starters off feet. Monday: short session with brief high-speed exposure and set plays, low volume. No heavy lifting until after Tuesday."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Scientific Foundations: sport psychology: 1
    // -----------------------------------------------------------------------
    {
      slug: "cscs-arousal-mental-skills-case",
      objective: "Motivational theories, mental skills (arousal regulation, attentional control, imagery, self-talk) and confidence building",
      kind: "case",
      title: "Nerves on testing day",
      brief:
        "A fictional 19-year-old weightlifter performs well in training but misses lifts at competitions. Before attempts the athlete says their heart is pounding, their mind races with \"don't miss, don't miss\", and they rush to the bar.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "The athlete asks you for help before a competition in three weeks.",
          ask: "Explain what is happening and choose techniques.",
          parts: [
            part(
              "Arousal and performance",
              "Explains the athlete is likely over-aroused for a complex skill (inverted-U or individual zone of optimal functioning), and that the negative self-talk shifts attention away from the task.",
              "On the inverted-U, arousal is past this athlete's optimum for a technical lift; the \"don't miss\" thoughts pull attention from the cues that make the lift work."
            ),
            part(
              "Arousal regulation",
              "Chooses a calming technique suited to over-arousal (for example slow diaphragmatic breathing or a short relaxation routine) and practises it in training first.",
              "Two slow breaths with a long exhale before approaching the bar, practised in every heavy training session for three weeks."
            ),
            part(
              "Self-talk and attention",
              "Replaces negative self-talk with short, task-focused cue words and builds a consistent pre-lift routine.",
              "Swap \"don't miss\" for a cue like \"patient off the floor\"; same routine every lift: chalk, breathe, cue, set, lift."
            ),
          ],
        },
        {
          text: "Two weeks later the athlete mentions they have barely slept for weeks, feel hopeless outside training and have lost interest in things they used to enjoy.",
          ask: "What do you do?",
          parts: [
            part(
              "Refer",
              "Recognizes possible mental health concerns beyond performance anxiety and the coach's scope, responds with care, and refers to a qualified mental health professional or sports medicine team per the program's policy (urgently, via crisis services, if there is any risk of self-harm).",
              "That sounds hard, and it's beyond what I can help with as your coach. I'd like to connect you with our sports medicine team and a mental health professional; if you ever feel unsafe, we'll get you urgent help right away."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Scientific Foundations: nutrition: 1
    // -----------------------------------------------------------------------
    {
      slug: "cscs-supplement-question",
      objective: "Supplement efficacy and safety, third-party testing, and the impact of alcohol and drugs",
      kind: "build",
      title: "An athlete's supplement question",
      brief:
        "A fictional drug-tested college rower shows you a \"pre-workout\" with a proprietary blend listing caffeine, a stimulant you don't recognize and \"natural extracts\", bought online. They also ask whether creatine works, and mention teammates \"recover with a few beers\" after hard sessions.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Answer the athlete within your scope.",
          parts: [
            part(
              "Risk of the product",
              "Explains supplements aren't reviewed by the FDA for safety and effectiveness before sale, proprietary blends hide amounts, unknown stimulants may be banned or unsafe, and a drug-tested athlete is responsible for anything in their body.",
              "Supplements aren't approved for safety or effectiveness before they're sold, the blend hides doses, and that unknown stimulant could be unsafe or banned. In a tested sport you're responsible for whatever's in it."
            ),
            part(
              "Third-party testing and referral",
              "Recommends only third-party tested products certified for sport (for example NSF Certified for Sport or Informed Sport), checking the governing body's banned list, and referring to the team's sports dietitian or physician.",
              "If you use anything, choose products certified for sport by a third party, check them against your governing body's banned list, and run it past our sports dietitian first."
            ),
            part(
              "Creatine",
              "States creatine monohydrate is among the best-supported supplements for repeated high-intensity and strength work, while keeping specific dosing to the dietitian or physician.",
              "Creatine monohydrate has strong evidence for strength and repeated high-intensity work; the dietitian can advise whether it suits you and how to take it."
            ),
            part(
              "Alcohol",
              "Explains alcohol after training impairs recovery (for example rehydration, sleep quality, muscle protein synthesis) and that underage drinking also breaks law and team policy.",
              "Alcohol after hard sessions works against recovery -- poorer sleep, slower rehydration and reduced muscle repair -- and for under-21s it's illegal and against team rules."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Practical/Applied: program design: 2
    // -----------------------------------------------------------------------
    {
      slug: "cscs-volleyball-needs-analysis",
      objective: "Conducting a needs analysis: sport movement, physiological and injury analysis, athlete history and benchmark testing",
      kind: "build",
      title: "Needs analysis: a volleyball middle blocker",
      brief:
        "You are preparing the off-season program for a fictional 21-year-old collegiate women's volleyball middle blocker. She has three years of supervised strength training, sprained her right ankle twice last season and reports occasional patellar tendon soreness. The off-season is 12 weeks.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the needs analysis.",
          parts: [
            part(
              "Movement analysis",
              "Describes the sport's key movements and muscle actions (repeated vertical jumps and landings, short lateral shuffles and crossover steps, arm swing and blocking overhead) and the planes and velocities involved.",
              "Repeated countermovement and approach jumps, landing on one or two legs, short lateral shuffles and crossovers along the net, overhead blocking and an explosive arm swing -- mostly fast, stretch-shortening actions."
            ),
            part(
              "Physiological analysis",
              "Identifies priorities: power and reactive strength, maximal lower-body strength as a base, short-burst (phosphagen) energy with recovery between rallies.",
              "Priorities: lower-body power and reactive strength, built on maximal strength; anaerobic, short-burst conditioning with enough aerobic fitness to recover between rallies."
            ),
            part(
              "Injury analysis and history",
              "Uses common injury sites (ankle, knee/patellar tendon, shoulder, low back) and her history to set injury-risk reduction priorities, coordinated with the athletic trainer.",
              "Ankle sprains and patellar tendon soreness for this position and this athlete: landing mechanics, ankle balance and strength, progressive tendon loading, shoulder work -- all agreed with the athletic trainer."
            ),
            part(
              "Benchmark tests",
              "Chooses valid, reliable tests linked to the needs (for example countermovement or approach jump, a lower-body strength test suitable to her training age, a change-of-direction test) and says when they are done.",
              "Countermovement and approach jump on a jump mat, 3RM trap-bar deadlift (three years' training), and a lateral change-of-direction test, at the start and end of the 12 weeks."
            ),
          ],
        },
      ],
    },
    {
      slug: "cscs-off-to-in-season-periodization",
      objective: "Exercise progression and periodization strategies: linear and nonlinear, off-season to in-season",
      kind: "build",
      title: "Periodize from off-season to in-season",
      brief:
        "A fictional collegiate soccer midfielder, three years' strength training, has a back squat 1RM of 140 kg. You have a 12-week off-season before preseason, then a 14-week competitive season with matches most Saturdays.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the plan's phases, loads and in-season approach.",
          parts: [
            part(
              "Off-season sequence",
              "Sequences off-season mesocycles from higher-volume work (hypertrophy/strength endurance) to strength to power, with a recovery week between blocks.",
              "Weeks 1-4 hypertrophy and strength endurance; week 5 unload; weeks 6-9 maximal strength; week 10 unload; weeks 11-12 power and speed, into preseason."
            ),
            part(
              "Loads from the 1RM",
              "Assigns loads consistent with each goal: hypertrophy about 67-85% 1RM for 6-12 reps (for example 95-115 kg for 8-10), strength at least 85% for 6 or fewer reps (at least about 119 kg).",
              "Hypertrophy: 4 x 8 at about 72% (about 100 kg). Strength: 4 x 4 at 87-90% (about 122-126 kg). Power: light jump squats and hang cleans for 3 reps, moving fast."
            ),
            part(
              "In-season approach",
              "Uses a lower-volume maintenance approach in season (for example 1-2 short sessions a week, heavy but few sets, timed away from matches), possibly nonlinear/undulating within the week.",
              "In season: two 30-40-minute sessions a week -- a heavier, low-volume day early in the week (2-3 x 3 at 85%+) and a lighter power day; nothing heavy within 48 hours of a match."
            ),
            part(
              "Linear vs nonlinear",
              "Explains the difference (linear: intensity rises and volume falls across blocks; nonlinear/undulating: intensity and volume vary within the week) and why each fits its phase.",
              "Linear in the off-season builds one quality at a time; undulating in season lets heavy and light days fit around matches and changing fatigue."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Practical/Applied: exercise technique: 2
    // -----------------------------------------------------------------------
    {
      slug: "cscs-power-clean-squat-spotting",
      objective: "Teaching and evaluating free-weight technique: barbells, dumbbells and kettlebells, including spotting and set-up",
      kind: "build",
      title: "Fix a power clean; spot a squat",
      brief:
        "A fictional 18-year-old football player, cleared and pain-free, learning the power clean: from the floor the hips rise faster than the shoulders, the elbows bend early to \"arm\" the bar up, and the bar swings away from the body. Later in the session he works up to heavy back squats in a power rack.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the corrections and the squat spotting plan.",
          parts: [
            part(
              "First pull",
              "Corrects the first pull: start position with shoulders over or slightly ahead of the bar, back flat, and hips and shoulders rising together until the bar passes the knees.",
              "Set up with shoulders over the bar and a flat back; push the floor away so hips and shoulders rise together until the bar clears the knees."
            ),
            part(
              "Second pull and bar path",
              "Keeps arms straight until the explosive hip and knee extension (triple extension) is complete, with the bar kept close to the body.",
              "Long arms until you've jumped -- the shrug and pull-under come after full hip, knee and ankle extension; keep the bar brushing the thighs."
            ),
            part(
              "Teaching progression",
              "Regresses with a part-to-whole progression (for example from the hang above the knee, or clean pulls) before returning to the floor.",
              "Back to hang power cleans from mid-thigh, then clean pulls from the floor, then the full lift once the pull sequence is right."
            ),
            part(
              "Spotting the back squat",
              "Sets the rack safety bars just below the bottom position and uses a spotter (or two, one at each end of the bar, for heavy loads) behind the athlete, agreeing communication before the set; does not spot power exercises like the clean.",
              "Safety bars just below his bottom position; for heavy sets, two spotters at the ends of the bar (or one directly behind), agreeing reps and signals first. No spotting on the clean -- he drops the bar forward and steps back."
            ),
          ],
        },
      ],
    },
    {
      slug: "cscs-ramp-warm-up-pnf",
      objective: "Teaching and evaluating movement preparation: soft tissue work, mobility, PNF, CNS preparation and dynamic stretching",
      kind: "build",
      title: "Build a warm-up and a PNF routine",
      brief:
        "A fictional high-school sprint group trains at 4 p.m. before a speed session of 6 x 30 m flying sprints. Several athletes have tight hamstrings, and their coach wants a warm-up of about 15 minutes and a flexibility routine after training.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the warm-up and the post-session flexibility routine.",
          parts: [
            part(
              "Raise and mobilize",
              "Starts with low-intensity activity that raises temperature and heart rate, then dynamic mobility drills through the ranges the sprint needs, with optional brief soft tissue work.",
              "3-4 minutes of easy jogging and skipping; optional 1-2 minutes of foam rolling; then walking lunges with reach, leg swings, A-skips and walking hamstring sweeps."
            ),
            part(
              "Activate and potentiate",
              "Finishes with progressively faster, sprint-specific drills and accelerations to prepare the nervous system for maximal speed, without fatiguing the athletes.",
              "Glute bridges and band walks briefly; then build-ups at 60%, 75% and 90% over 30 m, and two short accelerations -- full recovery before the first flying sprint."
            ),
            part(
              "Where static stretching goes",
              "Places longer static stretching after the session (or keeps any pre-session static holds short) to avoid reducing power before sprints.",
              "No long static stretches before the sprints; save them for after the session."
            ),
            part(
              "PNF routine",
              "Describes a PNF technique correctly (for example hold-relax: passive pre-stretch, isometric contraction of the hamstrings against the partner, relax, then a further passive stretch) with partner safety cues.",
              "Hold-relax with a partner: passive hamstring stretch for 10 seconds; athlete pushes against the partner for 6 seconds without movement; relax and the partner eases into a deeper stretch for 30 seconds. Gentle pressure, never to pain."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Practical/Applied: program implementation: 2
    // -----------------------------------------------------------------------
    {
      slug: "cscs-testing-day-plan",
      objective: "Selecting evidence-based tests and monitoring protocols, including readiness measures such as HRV",
      kind: "build",
      title: "Plan a testing day and a readiness check",
      brief:
        "A fictional women's college soccer team (24 athletes, two coaches, one sports scientist) will be tested at the start of preseason. The head coach wants to know: jump power, linear speed, change of direction, maximal lower-body strength and aerobic fitness. She also asks whether to start daily heart-rate variability (HRV) monitoring.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the tests, order the day and advise on HRV.",
          parts: [
            part(
              "Test selection",
              "Chooses a valid, reliable test for each quality appropriate to the athletes (for example countermovement jump, 10 and 30 m sprint, pro-agility or 505, a strength test matched to training age, an intermittent field test for aerobic fitness) and justifies it.",
              "CMJ on a jump mat; 10 and 30 m sprint with timing gates; 505 change-of-direction; 3RM trap-bar deadlift (familiar lift); Yo-Yo Intermittent Recovery Test level 1 for soccer-specific aerobic fitness."
            ),
            part(
              "Test order",
              "Orders tests from least to most fatiguing (non-fatiguing and power tests first, sprint and change-of-direction before strength, the fatiguing aerobic test last or on another day) with a standard warm-up and rest between trials.",
              "Day 1: warm-up, CMJ, sprints, 505, then the 3RM with full rest between trials. Day 2: Yo-Yo test after the same warm-up -- it's too fatiguing to come before anything else."
            ),
            part(
              "Reliability and staffing",
              "Standardizes conditions (same time of day, surface, instructions, warm-up), assigns roles to the staff, and records data consistently.",
              "Same surface, time and instructions for every athlete; the sports scientist runs gates and the jump mat, one coach the 3RM, one coach records into one sheet."
            ),
            part(
              "HRV advice",
              "Explains HRV is most useful tracked against each athlete's own baseline over time (consistent morning measurement, rolling averages), combined with other measures, and that the team should start only if it can collect it consistently and act on it.",
              "HRV is useful when each athlete measures the same way each morning and we compare with her own rolling baseline alongside wellness scores and session RPE. Start only if we can collect it consistently and know how we'll act on it."
            ),
          ],
        },
      ],
    },
    {
      slug: "cscs-interpret-and-communicate-case",
      objective: "Evaluating, interpreting and communicating assessment results and adjusting the program",
      kind: "case",
      title: "What the numbers say midseason",
      brief:
        "A fictional college basketball team does a countermovement jump (CMJ) test every Monday. One starter's CMJ has averaged 52 cm in preseason (typical week-to-week variation about 1.5 cm). The coach wants a one-line answer: \"Is she OK?\"",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "This Monday her CMJ is 46 cm. Her session-RPE load for the last week was much higher than her usual week, after two overtime games.",
          ask: "Interpret the result.",
          parts: [
            part(
              "Meaningful change",
              "Recognizes a 6 cm drop (about 12%) is well beyond her typical variation and likely meaningful, consistent with accumulated fatigue after a heavy week, while noting a single test can mislead.",
              "46 cm is 6 cm (about 12%) below her normal -- four times her usual week-to-week variation -- and fits the heavy overtime week. One test isn't proof, so I'd check how she feels too."
            ),
            part(
              "Program adjustment",
              "Adjusts training (reduces volume and intensity this week, prioritizes recovery) and plans a recheck.",
              "Cut her lifting volume this week, skip extra conditioning, and retest Thursday."
            ),
          ],
        },
        {
          text: "The coach asks for the answer in one sentence for the staff meeting.",
          ask: "Write what you tell the coach.",
          parts: [
            part(
              "Clear communication",
              "Gives a plain-language summary with the result, what it likely means, what is changing and when it will be rechecked, without jargon or overstating certainty.",
              "\"Her jump is down about 12% after the overtime week, which points to fatigue, so I'm lightening her lifting this week and will recheck Thursday.\""
            ),
          ],
        },
        {
          text: "Thursday's CMJ is 51 cm; she reports feeling fresh.",
          ask: "What do you do now?",
          parts: [
            part(
              "Respond to the recheck",
              "Recognizes she has returned near her normal range and resumes the planned program, and notes the lesson for future heavy weeks.",
              "51 cm is back within her normal range, so she returns to the full plan; after future overtime weeks we'll plan a lighter Monday in advance."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Practical/Applied: organization and administration: 1
    // -----------------------------------------------------------------------
    {
      slug: "cscs-heat-and-rhabdo-case",
      objective: "Recognizing and responding to unsafe training: overuse, overtraining and temperature-induced illness",
      kind: "case",
      title: "Unsafe training: heat and a punishment workout",
      brief:
        "It is the first week of a fictional college football preseason in August. The athletic trainer is on site. The temperature is high and humid, and many athletes arrived after a summer of little training.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "An assistant coach wants full-equipment, full-length practices from day one.",
          ask: "What do you recommend?",
          parts: [
            part(
              "Heat acclimatization",
              "Recommends a gradual heat acclimatization period (about 7-14 days) with progressive increases in practice length, intensity and equipment, plus scheduled rest and water breaks matched to conditions.",
              "Acclimatize over about 7-14 days: shorter practices in helmets only at first, adding equipment and duration gradually, with planned rest and water breaks and work-to-rest adjusted for the heat."
            ),
          ],
        },
        {
          text: "During the third practice an athlete stumbles, is confused and can't answer simple questions. His skin is hot.",
          ask: "What do you do?",
          parts: [
            part(
              "Recognize and activate",
              "Recognizes possible exertional heat stroke (central nervous system dysfunction during exercise in heat), stops his activity, and activates the emergency action plan with the athletic trainer immediately.",
              "Confusion during hot-weather exercise is exertional heat stroke until proven otherwise: stop him and activate the EAP with the athletic trainer now."
            ),
            part(
              "Cool first, transport second",
              "Supports the medical team's whole-body cold-water immersion as soon as possible (cool first, transport second), with the athletic trainer measuring core (rectal) temperature and directing care.",
              "Help the athletic trainer get him into the cold-water tub straight away -- cool first, transport second; the trainer measures his core temperature rectally and directs care, and EMS transports after cooling."
            ),
          ],
        },
        {
          text: "The next day the head coach orders 200 extra squat jumps for a group who were late, after a summer of little training.",
          ask: "What do you say and why?",
          parts: [
            part(
              "Exertional rhabdomyolysis risk",
              "Raises the risk of exertional rhabdomyolysis and overuse from a sudden, novel, high-volume eccentric workload in deconditioned athletes, and refuses to use exercise as punishment.",
              "A sudden 200 squat jumps in deconditioned athletes in the heat risks exertional rhabdomyolysis and overuse injury; exercise shouldn't be used as punishment."
            ),
            part(
              "Professional action",
              "Proposes a safe alternative discipline, documents the concern, and escalates through the chain of command and sports medicine staff if the order stands, following the standard of care.",
              "Offer a non-exercise consequence, record the concern in writing, and take it to the head athletic trainer and athletics director if he insists -- the standard of care comes first."
            ),
          ],
        },
      ],
    },
  ],
};
