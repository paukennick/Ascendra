import { FITNESS_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-149: ISSA / NCCPT Certified Personal Trainer (NCCPTCPT), authored to
// the depth of the NASM-CPT pilot (REQ-123) on the NCCPT outline's own terms:
// applied science explained to a client, dietary review and education within
// scope, intake documentation and assessment, linear versus undulating
// periodization and the general adaptation syndrome, kinetic-chain
// checkpoints, multi-measure progress tracking and over-training, and trainer
// and client safety.
//
// Outline: NCCPT Candidate Handbook, Appendix 2 (2020 job analysis): Applied
// Science 25%, Nutrition 10%, Intake and Ongoing Evaluation 15%, Program
// Design and Implementation 25%, Exercise Selection, Technique and Training
// Instruction 15%, Professional Practice and Responsibility 10% (the seed
// track's outline). The handbook PDF and NCCPT's exam page could not be
// fetched from this session on 2026-11-07, so the outline is as recorded in
// the seed track; no newer job analysis was found in search.
// Density ("hybrid"): 1/2/2/2/2/1 = 10.
//
// Values and where they were checked (2026-11-07):
//   - Acceptable Macronutrient Distribution Ranges for adults (Institute of
//     Medicine DRIs, Health Canada tables): carbohydrate 45-65%, protein
//     10-35%, fat 20-35% of energy; protein RDA 0.8 g/kg/day.
//   - Adult BMI categories: CDC. Blood pressure categories: 2025 AHA/ACC
//     guideline (normal under 120/80; elevated 120-129 and under 80; stage 1
//     130-139 or 80-89; stage 2 140+ or 90+).
//   - Physical Activity Guidelines for Americans, 2nd ed. (2018).
//   - %DV on the Nutrition Facts label: 5% DV or less per serving is low,
//     20% DV or more is high; added sugars DV is 50 g (FDA, "Lows and highs:
//     percent Daily Value on the Nutrition Facts label").
//   - Supplements are not reviewed by the FDA for safety and effectiveness
//     before sale (DSHEA).
//
// SAFETY: every client is fictional; nothing here is exercise, nutrition or
// medical advice, and no lab asks the learner to program for their own
// clients. Screening, referral and scope of practice come first. Marked for
// expert review like every authored lab (docs/labs.md).

export const NCCPTCPT_LABS: SeedLabSet = {
  trackCode: "NCCPTCPT",
  // REQ-142: dated by the backfill rule (the day git history shows the line
  // added, 2026-11-07, REQ-149), not re-checked in the REQ-142 pass. kind sets
  // the re-check: exam outlines and references 12 months, guidelines 6.
  sources: [
    source("https://assets.ctfassets.net/qw8ps43tg2ux/7KxejJj5WXgNhleXZrzZo4/c789e3aa043335ceb9641ad2d2accf81/nccpt-candidate-handbook.pdf", "exam_outline", "2026-11-07"),
    source("https://nccpt.issaonline.com/pages/exam-information", "exam_outline", "2026-11-07"),
    source("https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-macronutrients-dietary-reference-intakes-tables-2005.html", "clinical_guideline", "2026-11-07"),
    source("https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html", "clinical_guideline", "2026-11-07"),
    source("https://www.eurekalert.org/news-releases/1094543", "reference", "2026-11-07"),
    source("https://stacks.cdc.gov/view/cdc/121857", "reference", "2026-11-07"),
    source("https://www.fda.gov/food/nutrition-facts-label/lows-and-highs-percent-daily-value-nutrition-facts-label", "reference", "2026-11-07"),
  ],
  labs: [
    // -----------------------------------------------------------------------
    // Applied science (25%): 1
    // -----------------------------------------------------------------------
    {
      slug: "nccpt-explain-physiology",
      objective: "Exercise physiology: acute responses, chronic adaptations, sliding filament theory, size principle and fiber types",
      kind: "build",
      title: "Explain the physiology to a client",
      brief:
        "A fictional 44-year-old client, cleared to exercise, is three weeks into strength training. They ask: \"Why does my heart pound during sets?\", \"Why am I already lifting more when my muscles don't look bigger?\" and \"My friend says light weights only tone and heavy weights bulk -- which should I use?\"",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Answer the three questions accurately in plain language.",
          parts: [
            part(
              "Acute response",
              "Explains acute responses to exercise: heart rate and stroke volume rise to increase cardiac output and deliver oxygen, and systolic blood pressure rises with effort.",
              "During a set your muscles need more oxygen, so your heart beats faster and pumps more blood per beat; your systolic blood pressure rises too. It settles after the set."
            ),
            part(
              "Early strength gains",
              "Explains that early strength gains are mainly neural (better recruitment and coordination of motor units), with muscle growth (hypertrophy) contributing more after several weeks.",
              "The first weeks of gains are mostly your nervous system getting better at recruiting and coordinating muscle; visible muscle growth usually comes after several more weeks."
            ),
            part(
              "Size principle",
              "Explains the size principle: motor units are recruited from smaller (slow-twitch, type I) to larger (fast-twitch, type II) as force demand rises, so heavier loads (or light loads taken close to fatigue) recruit the larger units.",
              "Muscles recruit small, fatigue-resistant fibres first and bring in the larger fast-twitch fibres as the effort gets harder -- heavy weights, or lighter ones taken close to failure."
            ),
            part(
              "Myth correction",
              "Corrects the \"toning vs bulking\" myth (muscle can't be \"toned\" separately; size depends on training volume, effort, nutrition and genetics) and links load choice to the client's goal.",
              "There's no separate \"toning\": muscles either get stronger and bigger or they don't, depending on effort, volume, food and genetics. For your goal, moderate-to-heavy weights for 6-12 reps work well."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Nutrition (10%): 2
    // -----------------------------------------------------------------------
    {
      slug: "nccpt-food-log-review",
      objective: "Assessing a client's dietary habits, shortfalls and caloric intake relative to needs",
      kind: "build",
      title: "Review a three-day food log",
      brief:
        "A fictional 35-year-old client, 70 kg, apparently healthy, shares a three-day food log. Average daily intake: 2,400 kcal; 330 g carbohydrate, 60 g protein, 93 g fat; fruit and vegetables about one serving a day; most calories from takeaway meals and sweetened drinks. The client's registered dietitian estimated their daily energy needs at about 2,200 kcal. The client wants to lose body fat.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Assess the log against general guidelines and say what you'll do within scope.",
          parts: [
            part(
              "Energy balance",
              "Notes intake (2,400 kcal) is about 200 kcal above the estimated need (2,200), i.e. a surplus that works against fat loss.",
              "About 2,400 kcal a day against an estimated 2,200 -- a surplus of roughly 200 kcal a day, which won't support fat loss."
            ),
            part(
              "Macronutrient split",
              "Calculates the percentages (carbohydrate about 55%, protein 10%, fat 35%) and compares them with the AMDRs (45-65%, 10-35%, 20-35%): all within range, but protein at the bottom and fat at the top; protein 60 g is just above the RDA of 0.8 g/kg (56 g).",
              "Carbs 330 x 4 = 1,320 kcal (55%); protein 60 x 4 = 240 (10%); fat 93 x 9 = 837 (35%). All inside the AMDRs, but protein is at the low end and fat at the top; 60 g protein is just above the 56 g RDA for 70 kg."
            ),
            part(
              "Shortfalls",
              "Identifies quality shortfalls: very low fruit and vegetable intake (and so fibre and micronutrients), frequent takeaway and sugar-sweetened drinks.",
              "Only about one serving of fruit and vegetables a day, lots of takeaway and sweetened drinks -- likely low in fibre and several vitamins and minerals."
            ),
            part(
              "Within scope",
              "Gives general, guideline-based suggestions (for example swap sweetened drinks for water, add vegetables, include protein foods at meals) and refers back to the registered dietitian for any individual plan or calorie target.",
              "General tips: water instead of sweetened drinks, a vegetable at each meal, a protein food at every meal. Any specific calorie target or meal plan stays with your dietitian."
            ),
          ],
        },
      ],
    },
    {
      slug: "nccpt-label-trend-supplement-case",
      objective: "Educating on food labels, portion size, diet trends, supplements and ergogenic aids",
      kind: "case",
      title: "Labels, a diet trend and a fat burner",
      brief:
        "A fictional 29-year-old client, apparently healthy, wants to lose weight before a holiday and has been reading a lot online.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "The client shows a granola label: serving size 1/2 cup (55 g), 240 kcal per serving, 2 servings per container, 12 g added sugars (24% Daily Value). They usually eat the whole container for breakfast.",
          ask: "Explain the label to the client.",
          parts: [
            part(
              "Serving size and portions",
              "Explains that eating the whole container is two servings: 480 kcal and 24 g added sugars (about 48% of the Daily Value).",
              "The numbers are for half a cup; the whole container is two servings -- 480 kcal and 24 g added sugars, about half the day's Daily Value."
            ),
            part(
              "Using % Daily Value",
              "Explains %DV as a quick guide (5% or less is low, 20% or more is high per serving) and suggests a practical portion change.",
              "As a rule of thumb, 5% DV or less is low and 20% or more is high per serving -- so this is high in added sugars. Try one serving with yogurt and fruit."
            ),
          ],
        },
        {
          text: "The client wants to try a very-low-carbohydrate (keto) diet a friend lost weight on.",
          ask: "How do you respond?",
          parts: [
            part(
              "Balanced, in-scope response",
              "Gives balanced general information (weight loss on any diet depends mainly on a sustained energy deficit; restrictive diets can be hard to maintain and may not suit everyone) without prescribing or forbidding the diet, and refers to a registered dietitian or physician for individual advice.",
              "Many diets work through eating less overall; very-low-carb diets can be hard to stick with and aren't right for everyone. A registered dietitian can help you decide -- I'll support your training either way."
            ),
          ],
        },
        {
          text: "The client also asks whether to buy an online \"thermogenic fat burner\" with a proprietary stimulant blend.",
          ask: "What do you tell the client?",
          parts: [
            part(
              "Supplement safety",
              "Does not recommend it; explains supplements aren't reviewed by the FDA for safety and effectiveness before sale, proprietary stimulant blends can carry risks (for example heart rate and blood pressure effects, interactions), and refers to a physician or pharmacist before use.",
              "I can't recommend it. Supplements aren't checked for safety or effectiveness before they're sold, and stimulant blends can raise heart rate and blood pressure or interact with medicines. Please ask your doctor or pharmacist first."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Intake and ongoing evaluation (15%): 2
    // -----------------------------------------------------------------------
    {
      slug: "nccpt-basic-assessment-battery",
      objective: "Conducting basic postural, performance, movement, strength, cardiovascular, flexibility and body-composition assessments",
      kind: "build",
      title: "Run a first assessment session",
      brief:
        "A fictional 48-year-old new client, Grace, has a signed medical release, health history, informed consent and liability waiver on file, and her physician cleared her for exercise. She wants to \"get stronger and less stiff\". You have 50 minutes, a scale, tape, a blood pressure cuff, a step and metronome, and a mat.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan the assessment and interpret the resting measures.",
          parts: [
            part(
              "Documentation check",
              "Confirms the intake documents are complete before testing (medical release, health history, informed consent, waiver) and checks for any limits in the release.",
              "Check every form is signed and dated and read the physician's release for any limits before we test anything."
            ),
            part(
              "Battery",
              "Includes at least one appropriate test in each area: posture (static observation at kinetic-chain checkpoints), movement (for example overhead squat), strength or muscular endurance (for example push-up or chair stand), cardiovascular (for example a step test), flexibility (for example sit-and-reach), body composition (for example waist and BMI).",
              "Static posture at the checkpoints; overhead squat; modified push-up test; 3-minute step test; sit-and-reach; weight, BMI and waist."
            ),
            part(
              "Order",
              "Orders resting measures first and the most fatiguing tests later, with a warm-up before performance tests.",
              "Resting heart rate and blood pressure, height, weight, waist, posture; then the overhead squat; warm-up; sit-and-reach and push-ups; step test last."
            ),
            part(
              "Interpret resting blood pressure",
              "Classifies a resting reading of 128/78 mm Hg as elevated (120-129 systolic and under 80 diastolic) under current categories, without diagnosing, and suggests sharing it with her physician.",
              "Her resting 128/78 is in the elevated category (systolic 120-129 with diastolic under 80). I'll note it and suggest she mention it to her doctor; it doesn't stop today's session."
            ),
          ],
        },
      ],
    },
    {
      slug: "nccpt-reassessment-interpretation",
      objective: "Interpreting results against goals and norms, initial versus ongoing",
      kind: "build",
      title: "Twelve weeks later: read the reassessment",
      brief:
        "A fictional 48-year-old client, Grace, is reassessed after 12 weeks. Initial -> now: weight 74 -> 74 kg; waist 92 -> 87 cm; push-ups (modified) 8 -> 17; 3-minute step test recovery heart rate 128 -> 112 bpm; sit-and-reach 18 -> 24 cm. Grace is upset that \"the scale hasn't moved\".",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Interpret the results and explain them to Grace.",
          parts: [
            part(
              "Interpretation",
              "Interprets each change correctly: smaller waist with stable weight suggests improved body composition; more push-ups means better muscular endurance; lower recovery heart rate means better cardiovascular fitness; better sit-and-reach means improved flexibility.",
              "Waist down 5 cm at the same weight suggests less fat and more muscle; push-ups doubled; recovery heart rate 16 bpm lower means a fitter heart; 6 cm more reach."
            ),
            part(
              "Norms versus own baseline",
              "Explains that comparing with her own initial results matters most for progress, while norms only give context, and uses both appropriately.",
              "Norms tell us roughly where you sit for your age, but what matters is you against you -- and you've improved on every measure but the scale."
            ),
            part(
              "Communicating to Grace",
              "Reframes the scale using the other measures, celebrates progress, and agrees updated goals.",
              "\"The scale can't show you trading fat for muscle -- your waist, strength and fitness all show it. Let's set the next 12-week goals around those.\""
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Program design and implementation (25%): 2
    // -----------------------------------------------------------------------
    {
      slug: "nccpt-linear-vs-undulating",
      objective: "Undulating versus linear periodization",
      kind: "build",
      title: "Linear for one client, undulating for another",
      brief:
        "Two fictional clients, both cleared to exercise, train three days a week for the next 12 weeks. Client A, 30, is a beginner who has just learned the main lifts and wants general strength. Client B, 36, has trained consistently for three years, has plateaued on a fixed 3 x 10 routine, and wants to get stronger and add some muscle.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write a periodization plan for each and explain the choice.",
          parts: [
            part(
              "Client A: linear",
              "Gives a linear plan: blocks in which volume falls and intensity rises over the 12 weeks (for example higher reps and lighter loads, then moderate, then lower reps and heavier loads), with a lighter week between blocks.",
              "Weeks 1-4: 2-3 x 12-15, light-moderate. Weeks 5-8: 3 x 8-10, moderate. Weeks 9-12: 3-4 x 5-6, heavier. A lighter week after each block."
            ),
            part(
              "Client B: undulating",
              "Gives an undulating (nonlinear) plan in which load and reps vary within the week (for example heavy, moderate and light/higher-rep days), progressing over the cycle.",
              "Daily undulating: Monday heavy 4 x 4-6, Wednesday hypertrophy 3 x 8-12, Friday lighter, faster 3 x 3-5 power/technique work. Load rises a little each week; week 12 lighter."
            ),
            part(
              "Why each fits",
              "Explains a beginner progresses well with a simple linear plan, while a trained client who has adapted to one stimulus benefits from more frequent variation.",
              "A beginner adapts to almost anything, so a simple linear plan is easy to follow and progress. Client B has adapted to 3 x 10, so changing the stimulus within the week breaks the plateau."
            ),
            part(
              "General adaptation syndrome",
              "Links the plan to the general adaptation syndrome (alarm, resistance, exhaustion): planned variation and recovery weeks avoid the exhaustion stage.",
              "GAS: new stress causes alarm, the body adapts in resistance, and without recovery you slide into exhaustion; planned lighter weeks keep both clients adapting."
            ),
          ],
        },
      ],
    },
    {
      slug: "nccpt-arthritis-case",
      objective: "Modifications for special populations: prenatal, youth, arthritic and hypertensive clients",
      kind: "case",
      title: "A client with knee osteoarthritis",
      brief:
        "A fictional 67-year-old client, Frank, has knee osteoarthritis in both knees and is cleared by his physician for exercise. He wants to keep walking his dog for an hour and get up from low chairs more easily.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Frank says his knees are stiff in the morning and ache after long walks, but he has no swelling today.",
          ask: "What does his first program emphasize?",
          parts: [
            part(
              "Program emphasis",
              "Emphasizes low-impact aerobic activity, lower-body strength (especially quadriceps and hips), range of motion and functional movements like sit-to-stand, starting light and progressing gradually.",
              "Low-impact cardio (cycling, walking in shorter bouts), strength for quads and hips (sit-to-stand from a raised seat, step-ups, bridges), and gentle range-of-motion work."
            ),
            part(
              "Pain and timing",
              "Uses pain to guide the dose (mild, short-lived discomfort may be acceptable; pain that is sharp or lingers means reduce), schedules sessions when stiffness is lower, and includes a longer warm-up.",
              "A longer warm-up, sessions later in the day when he's less stiff, and keep discomfort mild and short-lived -- if pain is sharp or lasts into the next day, we reduce the load."
            ),
          ],
        },
        {
          text: "Three weeks in, Frank arrives with his right knee swollen, warm and more painful than usual after a long hike.",
          ask: "What do you do?",
          parts: [
            part(
              "Flare-up response",
              "Recognizes a flare, reduces or avoids loading the affected knee (for example upper-body or non-weight-bearing work, gentle range of motion), and suggests he contact his physician if it doesn't settle or he has other concerns; does not diagnose or treat.",
              "Today we skip leg loading -- upper body and gentle range of motion only. If the swelling and warmth don't settle in a few days, or get worse, he should see his doctor."
            ),
            part(
              "Prevention",
              "Adjusts the plan to prevent future flares (for example building walking and hiking distance gradually) and documents the change.",
              "Build hike length gradually from his usual walks, and note the flare and changes in his file."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Exercise selection, technique and training instruction (15%): 2
    // -----------------------------------------------------------------------
    {
      slug: "nccpt-checkpoints-bent-row",
      objective: "Correcting technique at kinetic-chain checkpoints and addressing muscular imbalance and posture",
      kind: "build",
      title: "Checkpoints on a bent-over row",
      brief:
        "A fictional 39-year-old desk worker, cleared to exercise, performs a dumbbell bent-over row. You see: feet narrow and turned out, knees locked, lower back rounded, shoulders rounded forward and shrugging, and the head craned up to watch the mirror. In standing posture the client has rounded shoulders and a forward head.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Correct the row checkpoint by checkpoint and address the posture.",
          parts: [
            part(
              "Lower checkpoints",
              "Corrects feet (about hip width, pointing forward), knees (slightly bent, not locked) and hips (hinge back with a neutral lower back).",
              "Feet hip-width and facing forward; soft knees; push the hips back so the lower back stays flat."
            ),
            part(
              "Upper checkpoints",
              "Corrects shoulders (pulled back and down, no shrug) and head (neutral, in line with the spine, eyes on the floor ahead).",
              "Shoulders down and back before you pull; keep your neck long -- eyes on the floor a little ahead, not on the mirror."
            ),
            part(
              "Posture and imbalance",
              "Links the rounded-shoulder, forward-head posture to a likely imbalance (tight chest/anterior shoulder, weak upper-back retractors and deep neck flexors) and adds stretching and strengthening to address it, without diagnosing.",
              "Rounded shoulders and forward head suggest tight chest muscles and weak upper-back and deep neck muscles: stretch the chest, strengthen rows, face pulls and chin tucks."
            ),
            part(
              "Teaching method",
              "Uses a clear cueing method (demonstrate, one or two cues at a time, check, then progress) and a regression if needed (for example a chest-supported row).",
              "Demonstrate, then give one cue per set; if the back still rounds, switch to a chest-supported row until the hinge is solid."
            ),
          ],
        },
      ],
    },
    {
      slug: "nccpt-progress-overtraining-case",
      objective: "Monitoring client progress with multiple measures and recognizing over-training",
      kind: "case",
      title: "More is not always better",
      brief:
        "A fictional 33-year-old client, Leo, apparently healthy, trains with you twice a week and, without telling you, has added daily high-intensity classes for the past six weeks to \"speed things up\".",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Leo's lifts have dropped about 10% over three weeks. He reports poor sleep, a resting heart rate on his watch about 8 beats a minute above his usual, sore muscles that don't recover, frequent colds and low motivation.",
          ask: "What do you recognize and what do you do?",
          parts: [
            part(
              "Recognize the pattern",
              "Recognizes signs consistent with overreaching or over-training (performance decline, raised resting heart rate, poor sleep, persistent soreness, frequent illness, mood changes) from too much training with too little recovery.",
              "Falling strength, a higher resting heart rate, poor sleep, lingering soreness, frequent colds and low mood together point to overreaching -- possibly over-training -- from training daily without recovery."
            ),
            part(
              "Action",
              "Reduces total training load (for example cuts the extra classes, a lighter week), prioritizes sleep and recovery, and suggests seeing a physician if symptoms persist or illness is frequent.",
              "Drop the daily classes, take a lighter week, focus on sleep and regular meals; if he still feels run down after a couple of weeks or keeps getting ill, he should see his doctor."
            ),
          ],
        },
        {
          text: "Leo says, \"But I want results faster.\"",
          ask: "How do you track progress with him from now on?",
          parts: [
            part(
              "Multiple measures",
              "Agrees several measures beyond the scale or one lift (for example strength, resting heart rate trend, sleep and energy ratings, measurements, session RPE) reviewed together on a schedule.",
              "We'll track key lifts, morning resting heart rate, a 1-10 sleep and energy rating, waist measurement and how hard sessions feel, and review them every two weeks."
            ),
            part(
              "Education",
              "Explains that adaptation happens during recovery, so planned rest is part of getting results.",
              "Your body gets fitter while it recovers, not during the workout itself -- the rest days are part of the plan, not a break from it."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Professional practice and responsibility (10%): 1
    // -----------------------------------------------------------------------
    {
      slug: "nccpt-in-home-incident-case",
      objective: "Trainer and client safety: risk indicators, incident reports, emergency protocols and emergency tools",
      kind: "case",
      title: "An in-home session goes wrong",
      brief:
        "You train a fictional 55-year-old client, June, in her home once a week. She is cleared to exercise. The session includes step-ups on a portable aerobic step in her living room.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Before the first in-home session you plan your own and June's safety.",
          ask: "What do you set up?",
          parts: [
            part(
              "Environment and emergency tools",
              "Checks the space for hazards (rugs, clutter, furniture edges, slippery floors, pets), confirms a phone, the home address for dispatch, a first-aid kit, and where the nearest AED is (if any), and keeps emergency contacts on hand.",
              "Clear a space, remove loose rugs, check the floor isn't slippery and pets are elsewhere; I carry a phone and first-aid kit, keep June's emergency contact and home address ready, and know whether there's an AED nearby."
            ),
            part(
              "Trainer safety",
              "Includes personal safety measures (someone knows the trainer's location and schedule, check-in afterwards, leaving if a situation feels unsafe).",
              "My office has my schedule and June's address; I check in after each session and leave if anything feels unsafe."
            ),
          ],
        },
        {
          text: "In week three June misses the edge of the step, rolls her ankle and falls. She is alert, didn't hit her head, but can't put weight on the ankle and it is swelling.",
          ask: "What do you do?",
          parts: [
            part(
              "Immediate care within scope",
              "Stops the session, keeps her still and comfortable, does not diagnose or try to move the joint, gives basic first aid (for example rest, ice wrapped in a cloth, elevation), and arranges medical evaluation (calling emergency services if she can't bear weight safely or symptoms are severe).",
              "Stop, keep June seated with the ankle raised and a wrapped ice pack on it; I don't try to move or diagnose it. Because she can't bear weight, I help arrange medical care -- calling emergency services if needed -- and stay with her."
            ),
            part(
              "Incident report and follow-up",
              "Completes a factual incident report promptly (time, what happened, actions, witnesses), informs the employer or insurer per policy, follows up with the client, and requires clearance before resuming lower-body work.",
              "Write an objective incident report that day, notify my insurer or employer as required, check on June the next day, and resume leg work only after she's been cleared."
            ),
          ],
        },
      ],
    },
  ],
};
