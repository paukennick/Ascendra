import { FITNESS_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-149: ACE Certified Personal Trainer (ACECPT), authored to the depth of
// the NASM-CPT pilot (REQ-123) but in ACE's own model and vocabulary: the
// ACE Integrated Fitness Training (ACE IFT) Model's muscular phases
// (Functional, Movement, Load/Speed Training) and cardiorespiratory phases
// (Base, Fitness, Performance Training, set by VT1 and VT2 and the talk
// test), the five primary movements, and the ACE Mover Method's ABC approach
// (Ask, Break down barriers, Collaborate).
//
// Outline: ACE CPT exam content outline from the 2022 role delineation study,
// in effect since August 21, 2023 (Client Onboarding and Assessments 23%,
// Program Design and Implementation 31%, Program Modification and
// Progression 27%, Risk Management, Professional Conduct and Ethical Business
// Practices 19%). Checked 2026-11-07 against ACE's announcement of the
// outline; ACE revises on a five-year cycle and no newer outline is announced.
// Density ("hybrid"): 2/3/3/1 = 9.
//
// Values and where they were checked (2026-11-07):
//   - ACSM preparticipation screening algorithm (exercise participation,
//     known cardiovascular/metabolic/renal disease, signs or symptoms,
//     desired intensity; risk-factor profiling no longer drives referral):
//     Riebe et al., Med Sci Sports Exerc 2015;47(11):2473-2479, the model in
//     ACSM's Guidelines for Exercise Testing and Prescription (GETP), 12th ed.
//   - ACE IFT phase names, the VT1/VT2 mapping and the talk-test markers:
//     ACE, "How to design body-weight training workouts using the ACE IFT
//     Model" (ACE Certified, Feb 2021).
//   - ACE ABC approach: ACE, "Implementing the ACE Mover Method using the ACE
//     ABC approach".
//   - Pregnancy: ACOG Committee Opinion 804 (2020) and the Physical Activity
//     Guidelines for Americans, 2nd ed. (at least 150 minutes a week of
//     moderate-intensity aerobic activity during pregnancy and postpartum).
//   - Exertional heat stroke: NATA position statement on exertional heat
//     illnesses (cold-water immersion, "cool first, transport second").
//
// SAFETY: every client is fictional; nothing here is exercise, nutrition or
// medical advice, and no lab asks the learner to program for their own
// clients. Screening, referral and scope of practice come first. Marked for
// expert review like every authored lab (docs/labs.md).

export const ACECPT_LABS: SeedLabSet = {
  trackCode: "ACECPT",
  // REQ-142: dated by the backfill rule (the day git history shows the line
  // added, 2026-11-07, REQ-149), not re-checked in the REQ-142 pass. kind sets
  // the re-check: exam outlines and references 12 months, guidelines 6.
  sources: [
    source("https://contentcdn.eacefitness.com/assets/certification/pdfs/CPT-Exam-Content-Outline.pdf", "exam_outline", "2026-11-07"),
    source("https://www.acefitness.org/about-ace/our-efforts/blog/8388/updated-exam-content-outline-for-ace-personal-trainer-certification/", "exam_outline", "2026-11-07"),
    source("https://www.acefitness.org/continuing-education/certified/february-2021/7780/how-to-design-body-weight-training-workouts-using-the-ace-integrated-fitness-training-model/", "reference", "2026-11-07"),
    source("https://www.acefitness.org/education-and-resources/professional/expert-articles/7531/implementing-the-ace-mover-method-using-the-ace-abc-approach", "reference", "2026-11-07"),
    source("https://digitalcommons.uri.edu/kinesiology_facpubs/180", "reference", "2026-11-07"),
    source("https://read.qxmd.com/read/32217980/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period-acog-committee-opinion-number-804", "clinical_guideline", "2026-11-07"),
    source("https://doi.org/10.4085/1062-6050-50.9.07", "clinical_guideline", "2026-11-09"),
  ],
  labs: [
    // -----------------------------------------------------------------------
    // Client onboarding and assessments (23%): 2
    // -----------------------------------------------------------------------
    {
      slug: "ace-clearance-insulin-case",
      objective: "Identifying the need for medical clearance or referral using PAR-Q+ and ACSM preparticipation guidelines",
      kind: "case",
      title: "Screening a new client who uses insulin",
      brief:
        "A fictional 46-year-old new client, Dana, has not exercised regularly for several years and wants to start training twice a week. On the intake paperwork Dana reports type 2 diabetes managed with insulin, and answers no to every question about chest discomfort, unusual shortness of breath, dizziness or fainting, ankle swelling, palpitations and leg pain when walking. Dana's goal is \"more energy and to stop feeling stiff\".",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Dana's PAR-Q+ has a yes for a chronic medical condition (diabetes). No signs or symptoms are reported.",
          ask: "Work through the ACSM preparticipation screening algorithm for Dana and state the decision.",
          parts: [
            part(
              "Algorithm inputs",
              "Names the algorithm's inputs for this client: not currently participating in regular exercise, known metabolic disease (diabetes), no signs or symptoms, and the intended intensity.",
              "Not a regular exerciser; known metabolic disease (type 2 diabetes); no signs or symptoms of cardiovascular, metabolic or renal disease; we plan light-to-moderate work."
            ),
            part(
              "Decision",
              "Concludes that medical clearance is recommended before starting, because the client is inactive and has known metabolic disease; does not start an exercise program first.",
              "Medical clearance is recommended before we begin: an inactive client with known metabolic disease is cleared first even without symptoms."
            ),
            part(
              "What happens after clearance",
              "States that after clearance the client starts at light-to-moderate intensity and progresses gradually as tolerated, following any limits the provider sets.",
              "Once cleared, start at light-to-moderate intensity and progress gradually as tolerated, within whatever limits the provider gives."
            ),
          ],
        },
        {
          text: "Dana returns with written clearance for light-to-moderate exercise. The note says to follow Dana's own glucose plan and to watch for low blood sugar, as insulin plus exercise can lower it.",
          ask: "Before the first session, what do you set up and agree with Dana?",
          parts: [
            part(
              "Within scope",
              "Follows the provider's plan rather than advising on insulin, doses or diet; asks Dana to bring their own glucose meter and fast-acting carbohydrate and to follow their own care plan for checks.",
              "I don't adjust insulin, food or doses -- that's Dana's care team. I'll ask Dana to bring their meter and a fast-acting carbohydrate and to check glucose as their plan says."
            ),
            part(
              "Recognizing low blood sugar",
              "Names common signs of hypoglycemia the trainer should watch for (for example shakiness, sweating, confusion, unusual hunger, irritability, dizziness) and agrees with the client to stop and report them.",
              "We agree Dana stops and tells me about shakiness, sweating, light-headedness, sudden hunger or feeling confused; I watch for the same."
            ),
            part(
              "Session set-up",
              "Plans a light-to-moderate first session with a gradual warm-up and cool-down, monitored with RPE or the talk test, and records the clearance and plan in the client file.",
              "Gentle warm-up, Base Training-level cardio Dana can talk comfortably through, simple movement work, an unhurried cool-down; I record the clearance letter and agreed plan."
            ),
          ],
        },
        {
          text: "In week two, halfway through a session, Dana stops, is sweating and shaky, and says they feel \"foggy\". Dana is awake and can talk and swallow.",
          ask: "What do you do?",
          parts: [
            part(
              "Immediate response",
              "Stops exercise, has the client sit, prompts them to follow their own care plan (check glucose if able, take their fast-acting carbohydrate), stays with them and keeps observing.",
              "Stop the session and sit Dana down; prompt Dana to follow their plan -- check glucose and take their fast-acting carbohydrate -- and stay with them."
            ),
            part(
              "Escalation",
              "Activates emergency services per the emergency action plan if symptoms worsen or don't improve, or if the client becomes confused, unresponsive or unable to swallow, and gives nothing by mouth in that case.",
              "If Dana doesn't improve, gets more confused or can't swallow safely, call emergency services under the facility's emergency plan and give nothing by mouth."
            ),
            part(
              "Afterwards",
              "Does not resume the session that day, documents the incident, and asks the client to tell their provider before the next session.",
              "No more exercise today; I write an incident report, and ask Dana to update their provider before we train again."
            ),
          ],
        },
      ],
    },
    {
      slug: "ace-five-movement-screen",
      objective: "Evaluating foundational movement patterns (bend-and-lift, single-leg, push, pull, rotation) through observation",
      kind: "build",
      title: "Read a five-movement observation",
      brief:
        "A fictional 33-year-old client, cleared to exercise and pain-free, completes your observation of ACE's five primary movements. Bend-and-lift (bodyweight squat): heels lift and the trunk leans well forward. Single-leg (step-up): the opposite hip drops and the knee drifts inward. Push (push-up): the low back sags after four reps. Pull (standing band row): the shoulders shrug toward the ears. Rotation (half-kneeling cable chop): good control. The client sits at a desk all day and wants to \"feel athletic again\".",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write up the observation and the first training decisions.",
          parts: [
            part(
              "Observations stated as findings",
              "Records what was seen for each pattern in neutral, observable terms and identifies which patterns need work (bend-and-lift, single-leg, push, pull) and which is acceptable (rotation).",
              "Bend-and-lift: heels rise, excessive forward lean. Single-leg: contralateral hip drop, knee moves inward. Push: lumbar sag after 4 reps. Pull: scapular elevation. Rotation: controlled -- no change needed."
            ),
            part(
              "Possible contributors, not a diagnosis",
              "Offers plausible contributors (for example limited ankle dorsiflexion, weak hip abductors, low core endurance, poor scapular control) framed as hypotheses to train, not a diagnosis, and says pain would mean referral.",
              "Possibly limited ankle mobility, weak hip abductors, low core endurance and poor scapular depression -- things to train and re-check, not a diagnosis. Pain would mean referring to a health professional."
            ),
            part(
              "ACE IFT phase",
              "Places the client in Functional Training (stability and mobility, core and posture) moving into Movement Training for the five patterns, before Load/Speed Training, and explains why.",
              "Start in Functional Training -- core endurance, hip and scapular stability, ankle and thoracic mobility -- and progress into Movement Training of the five patterns; Load/Speed Training waits until the patterns are controlled."
            ),
            part(
              "First exercises",
              "Gives at least one specific regression or drill for each of the four patterns that need work.",
              "Box squat to a comfortable depth with heels down; low step-up with mirror feedback on hip and knee; incline push-up with a straight body line; band row cueing \"shoulders down and back\"."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Program design and implementation (31%): 3
    // -----------------------------------------------------------------------
    {
      slug: "ace-ift-phase-placement",
      objective: "ACE's Integrated Fitness Training model: functional, movement and load/speed training and cardiorespiratory training by intensity zones",
      kind: "build",
      title: "Place a client in the ACE IFT Model",
      brief:
        "A fictional 29-year-old client, cleared to exercise, jogs twice a week but has never done resistance training. A VT1 talk test on the treadmill put VT1 at a heart rate of 152 beats per minute; no VT2 test has been done. A movement observation found good control in all five primary movements with light loads. The client wants to run a 10 km race in four months and \"get stronger\". They can train four days a week.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the client's ACE IFT placement and the first month's plan.",
          parts: [
            part(
              "Cardiorespiratory phase and intensity",
              "Places the client in Base Training moving to Fitness Training, with most work below VT1 (heart rate under 152 bpm, able to speak in full sentences) and intervals between VT1 and VT2 added as the aerobic base allows.",
              "Base Training to start Fitness Training: most runs below VT1 (under 152 bpm, can talk in full sentences); add short intervals above VT1 once the base is steady."
            ),
            part(
              "When to test VT2",
              "Says a VT2 assessment is needed before Performance Training (work at or above VT2), and is done once the client is ready for that higher-intensity work, not on day one.",
              "No Performance Training until a VT2 test sets the upper threshold; test VT2 once intervals between VT1 and VT2 are tolerated well."
            ),
            part(
              "Muscular phase",
              "Places the client in Movement Training (all five movements controlled) with progression toward Load/Speed Training, explaining that Functional Training is maintained in warm-ups.",
              "Movement Training: load the five primary movements progressively; keep core and mobility work in the warm-up; move into Load/Speed Training as technique holds under load."
            ),
            part(
              "Weekly layout",
              "Lays out four days that combine cardio and resistance sensibly for a 10 km goal (no two hard days back to back, at least one easy run, resistance on two days).",
              "Mon: strength (five movements) + easy run below VT1. Tue: easy run. Thu: strength + short VT1-VT2 intervals. Sat: longer easy run. Rest days between hard sessions."
            ),
          ],
        },
      ],
    },
    {
      slug: "ace-multi-setting-week",
      objective: "Selecting exercises and equipment and integrating them across settings: virtual, in-home, in-club and public spaces",
      kind: "build",
      title: "One program, four settings",
      brief:
        "A fictional client, cleared to exercise and in ACE IFT Movement Training, now travels for work every other week. Each week they can do one in-club session with you, one virtual session from a hotel room (a resistance band and their bodyweight only), and one session on their own in a public park near home. Their program centres on the five primary movements and moderate-intensity cardio.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design how the program carries across the settings.",
          parts: [
            part(
              "Same movement patterns everywhere",
              "Keeps the five primary movements in every setting, swapping equipment rather than goals (for example goblet squat in club, bodyweight squat or split squat in the hotel, step-ups on a park bench).",
              "Bend-and-lift: goblet squat (club), tempo bodyweight squat (hotel), bench squat (park). Single-leg: step-up / split squat / bench step-up. Push: dumbbell press / push-up / incline push-up on a bench. Pull: cable row / band row / band row on a post. Rotation: cable chop / band chop / walking lunge with rotation."
            ),
            part(
              "Virtual session",
              "Addresses the virtual setting's needs: checking the space and camera angle so technique is visible, clear verbal cues, and a plan if the connection drops.",
              "Before the call: a clear floor space and a camera angle that shows the whole body; I rely on precise verbal cues and demos; if the call drops, they finish the written session at an easy pace."
            ),
            part(
              "Public-space safety",
              "Covers public-space considerations: checking surfaces and equipment stability, weather and heat, visibility and personal safety, and carrying a phone.",
              "Check that the bench is stable and dry, choose shaded, well-lit spots, avoid the hottest hours, carry a phone and water, and stop if anything feels unsafe."
            ),
            part(
              "Progression across settings",
              "Explains how progression is tracked when load differs (for example reps, tempo, range of motion, RPE and a shared log).",
              "Progress hotel and park work by reps, slower tempo, single-leg versions and RPE; we log every session in one shared app so I can see the week."
            ),
          ],
        },
      ],
    },
    {
      slug: "ace-hip-hinge-cueing",
      objective: "Instructing safe technique and equipment use with verbal, visual and kinesthetic cues",
      kind: "build",
      title: "Teach a hip hinge",
      brief:
        "A fictional 38-year-old client, cleared to exercise, is learning the dumbbell Romanian deadlift. On the first attempts they bend mainly at the knees and round the upper back, and the dumbbells drift away from their thighs. They have no pain. They say they learn best by \"feeling it\".",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write your teaching sequence and cues.",
          parts: [
            part(
              "Explain and demonstrate",
              "Briefly explains the purpose (a hip-dominant bend-and-lift pattern) and demonstrates the movement from a side view, naming one or two key points only.",
              "\"This trains your hips to do the work when you pick things up.\" I demonstrate side-on: hips go back, back stays long, weights slide down the legs."
            ),
            part(
              "Verbal cues",
              "Gives short, specific verbal cues for the observed faults (hips back, soft knees, long spine, keep the weights close).",
              "\"Push your hips back to the wall, knees soft.\" \"Long spine, chest proud.\" \"Slide the weights down your thighs.\""
            ),
            part(
              "Kinesthetic cue",
              "Uses at least one kinesthetic or tactile method suited to a learner who learns by feel (for example a dowel along the spine with three points of contact, touching a wall with the hips, or a light touch with permission).",
              "A dowel along the back touching head, upper back and tailbone; then hinge back to touch a wall with the hips."
            ),
            part(
              "Regression and progression",
              "Regresses until the pattern is clean (dowel or bodyweight hinge, shorter range) and states when to progress (consistent form for the target reps, no pain).",
              "Start with the dowel hinge and a short range; return to light dumbbells when every rep is clean, then add load gradually."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Program modification and progression (27%): 3
    // -----------------------------------------------------------------------
    {
      slug: "ace-lapse-sdoh-case",
      objective: "Recognizing and responding to lapses: barriers, social determinants of health and behavior-change models",
      kind: "case",
      title: "A lapse with barriers outside the gym",
      brief:
        "A fictional client, Sam, trained with you twice a week for three months and was meeting their goals. For the past four weeks Sam has cancelled most sessions. Sam is a hospital cleaner whose shifts moved to nights, and the bus that reached the gym no longer runs at the times Sam is free.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Sam messages: \"I keep letting you down. I don't think I can keep this up.\"",
          ask: "How do you respond, using the ACE ABC approach?",
          parts: [
            part(
              "Ask",
              "Opens with non-judgmental, open-ended questions about what has changed and what Sam wants now, and affirms the progress already made.",
              "\"You built a real habit over three months -- that's still yours. What's changed since your shifts moved? What would feel doable right now?\""
            ),
            part(
              "Name the lapse",
              "Frames this as a lapse (a normal part of change) rather than failure, using a behavior-change model (for example a lapse from the action stage in the transtheoretical model).",
              "This is a lapse from the action stage, not the end -- most people have them, especially when life changes."
            ),
          ],
        },
        {
          text: "Sam says the problems are the night shifts, the bus, and that the gym fees feel hard to justify on fewer hours.",
          ask: "Break down the barriers and collaborate on a plan.",
          parts: [
            part(
              "Barriers as social determinants",
              "Recognizes the barriers as social determinants of health (work schedule, transportation, income) rather than motivation, and does not blame the client.",
              "These are real constraints -- shift work, transport and money -- not a lack of willpower."
            ),
            part(
              "Collaborative plan",
              "Builds a plan with the client that removes the barriers (for example home or virtual sessions with minimal equipment, sessions timed around the shift, a lower-cost option, short sessions), using the client's own ideas.",
              "Together: one short virtual session a week at a time Sam picks before a shift, a 20-minute band-and-bodyweight routine at home, and we look at a cheaper monthly option."
            ),
            part(
              "Next step and check-in",
              "Agrees one specific, small next action and a check-in date, and keeps the goal achievable to rebuild self-efficacy.",
              "Next step: do the home routine twice this week; we check in by message on Sunday and adjust."
            ),
          ],
        },
      ],
    },
    {
      slug: "ace-reassessment-progression",
      objective: "Progressing and regressing exercises and acute variables in response to results and client status",
      kind: "build",
      title: "Week 8 reassessment: progress and regress",
      brief:
        "A fictional client in ACE IFT Base Training and Movement Training, cleared to exercise, is reassessed after eight weeks. Results: steady 30-minute runs below VT1 now feel easy (talk test: full sentences throughout); goblet squat 3 x 12 at 12 kg with clean technique and RPE about 5 of 10; push-ups improved from 4 to 12 good reps. New today: the client says the front of their right knee aches during walking lunges (2 of 10, gone afterwards) but not during squats or step-ups.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the changes to the program and why.",
          parts: [
            part(
              "Cardiorespiratory progression",
              "Progresses to Fitness Training by adding work between VT1 and VT2 (for example short intervals) while keeping most volume below VT1, and progresses gradually.",
              "Move into Fitness Training: one session a week adds intervals above VT1 (for example 4 x 3 minutes speaking in short phrases), the rest stays below VT1."
            ),
            part(
              "Resistance progression",
              "Progresses one variable at a time for exercises that are clean and easy (for example load, then sets or complexity), toward Load/Speed Training, with a stated reason.",
              "Goblet squat to 16 kg for 3 x 10, keeping RPE about 6-7; push-ups to a slower tempo or feet on a low step; one variable at a time."
            ),
            part(
              "Regression for the knee",
              "Removes or regresses the painful exercise (for example reverse lunge, split squat with shorter range, or keeps pain-free step-ups), does not diagnose, and refers to a health professional if pain persists or worsens.",
              "Swap walking lunges for pain-free step-ups or a short-range split squat; no diagnosis -- if the ache persists or worsens, I'll refer to a physician or physical therapist."
            ),
            part(
              "Next reassessment",
              "Sets when and how the changes will be re-checked (for example talk test, RPE, reps, symptoms).",
              "Re-check in four weeks: talk test during intervals, RPE and reps on the key lifts, and whether the knee ache has gone."
            ),
          ],
        },
      ],
    },
    {
      slug: "ace-pregnancy-modification-case",
      objective: "Modifying programs for special populations and changing health conditions",
      kind: "case",
      title: "A client tells you she is pregnant",
      brief:
        "A fictional 31-year-old client, Priya, has trained with you for a year: three sessions a week of strength work in Load/Speed Training, hill intervals, and weekend trail running. She tells you she is eight weeks pregnant and wants to keep training.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "Priya has not yet spoken to her obstetric care provider about exercise.",
          ask: "What do you do before the next session?",
          parts: [
            part(
              "Clearance first",
              "Asks her to talk with her obstetric care provider about exercise and to share any limits, and waits for that before continuing the higher-intensity program, without giving medical advice.",
              "Congratulations -- before we continue the hard sessions, please check with your obstetric provider about exercise and bring back any limits they set."
            ),
            part(
              "General guidance within scope",
              "Notes that in an uncomplicated pregnancy guidance supports continuing activity (for example at least 150 minutes a week of moderate aerobic activity) as the provider advises, and that the program will be adjusted rather than stopped.",
              "Without complications, staying active is encouraged -- guidelines suggest at least 150 minutes a week of moderate activity -- so we'll adjust the plan with your provider's advice."
            ),
          ],
        },
        {
          text: "Her provider clears her for continued exercise with no complications noted.",
          ask: "How do you modify the program?",
          parts: [
            part(
              "Intensity and monitoring",
              "Monitors with RPE or the talk test rather than pushing maximal efforts, and keeps intensity at a level the provider agreed and the client tolerates.",
              "Use RPE and the talk test; keep intervals at an effort she can talk through in short phrases; no all-out efforts."
            ),
            part(
              "Activities to change",
              "Removes or modifies higher-risk activities: those with fall or abdominal-impact risk (for example technical trail running), long periods lying flat on the back, and exercise in hot, humid conditions; keeps strength work with sensible loads.",
              "Swap technical trails for even paths; replace supine exercises with inclined or side-lying versions as pregnancy progresses; avoid hot, humid conditions; keep strength work at moderate loads with good breathing."
            ),
            part(
              "Warning signs",
              "Lists warning signs that mean stop exercising and contact her provider (for example vaginal bleeding, regular painful contractions, fluid leaking, dizziness, chest pain, headache, calf pain or swelling, breathlessness before exertion).",
              "Stop and contact the provider for vaginal bleeding, regular painful contractions, fluid leaking, dizziness, chest pain, headache, calf pain or swelling, muscle weakness affecting balance, or breathlessness before starting."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Risk management, professional conduct and ethical business practices
    // (19%): 1
    // -----------------------------------------------------------------------
    {
      slug: "ace-park-bootcamp-risk-case",
      objective:
        "Risk-management strategies across settings in line with recognized standards, guidelines, laws and regulations (CDC, ACSM, OSHA, HIPAA and others)",
      kind: "case",
      title: "Risk management for an outdoor boot camp",
      brief:
        "You plan a fictional small-group boot camp for eight adults, all screened and cleared, on a public park lawn at 6 p.m. in summer. Equipment: cones, bands and kettlebells you bring in your car.",
      safetyNote: FITNESS_SAFETY,
      steps: [
        {
          text: "It is the week before the first session.",
          ask: "What do you put in place before the first session?",
          parts: [
            part(
              "Permission and paperwork",
              "Checks whether the park requires a permit, holds professional liability insurance, and has each participant complete screening, informed consent/waiver and emergency contacts.",
              "Check the city's permit rules for paid group sessions, confirm my liability insurance covers outdoor groups, and collect screening, informed consent and emergency contacts from everyone."
            ),
            part(
              "Emergency action plan",
              "Writes an emergency action plan for this site: exact location to give dispatch, nearest access point for an ambulance, a charged phone, first-aid kit, the nearest AED, and who does what.",
              "EAP for the park: the street address and lawn location for dispatch, where an ambulance can drive in, my charged phone, first-aid kit, the AED at the community centre 100 m away, and a participant assigned to meet responders."
            ),
            part(
              "Confidential information",
              "Keeps participants' health information confidential and securely stored, shares it only with consent or in an emergency, and does not discuss one person's conditions in front of the group.",
              "Health forms stay in a locked folder or encrypted app, never discussed in front of the group, and only shared with consent or with responders in an emergency."
            ),
          ],
        },
        {
          text: "On the day it is 33 °C (91 °F) and humid at 6 p.m. Twenty minutes in, one participant is confused and unsteady though still sweating heavily; another says they feel fine.",
          ask: "What do you do?",
          parts: [
            part(
              "Recognize and act",
              "Recognizes possible exertional heat stroke (confusion or other central nervous system change during exercise in heat), stops the session, calls emergency services under the EAP, and starts cooling immediately.",
              "Confusion in the heat could be exertional heat stroke: stop everyone, call emergency services under the EAP, and start cooling at once."
            ),
            part(
              "Cooling",
              "Starts the most aggressive cooling available (cold-water immersion is most effective; otherwise cold water and ice towels over the body, move to shade) while waiting for responders, and stays with the person.",
              "Move them to shade and start cooling -- cold-water immersion if possible; here, soak them with cold water and rotate ice towels -- and stay with them until responders take over."
            ),
            part(
              "The rest of the group and afterwards",
              "Ends the session for everyone, documents the incident, and changes future plans for heat (for example cooler times, shorter work, more rest and water, cancelling in high heat).",
              "End the session; write an incident report; in future, move sessions earlier, shorten the work, add water breaks, and cancel on very hot, humid days."
            ),
          ],
        },
      ],
    },
  ],
};
