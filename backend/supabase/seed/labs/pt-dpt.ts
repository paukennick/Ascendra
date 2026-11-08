import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-147: Doctor of Physical Therapy (DPT) entry-to-practice pathway.
//
// Aligned to CAPTE's "Standards and Required Elements for Accreditation of
// Physical Therapist Education Programs" (2024 standards; the PDF re-read
// on 2026-11-07 still says "Updated July 28, 2026", the latest update) and
// to the course's units in seed/tracks/pt-dpt.ts. The units have no
// weights (CAPTE accredits programs; it publishes no exam blueprint), so
// the hybrid plan's 6 extra labs are split evenly: 2/2/2/2/2/2/1/1 = 14
// labs (4 build, 10 case). The content test checks it unit by unit.
//
// The DPT is the evaluating, diagnosing, plan-setting clinician, so these
// labs ask for examination, evaluation, diagnosis, prognosis, plan,
// progression, discharge and referral decisions, and for the PT's side of
// directing and supervising a PTA.
//
// SAFETY: every patient is fictional; exam practice, not clinical guidance.
// All labs are needs_expert_review until a licensed physical therapist
// educator approves them (docs/labs.md). Distressing topic (suspected elder
// abuse) carries a support line in the brief.
//
// Values quoted as standards, verified 2026-11-07 (details in the
// pt-nptept.ts header unless given here):
// - Canadian C-Spine Rule: Stiell IG et al. JAMA 2001;286(15):1841-1848,
//   doi:10.1001/jama.286.15.1841 (abstract): high-risk factors (age 65 or
//   over, dangerous mechanism, paresthesias in the extremities), low-risk
//   factors (simple rear-end collision, sitting in the ED, ambulatory at any
//   time, delayed onset of neck pain, no midline tenderness), and active
//   rotation 45 degrees left and right.
// - Heart failure exercise screening and intensity: Taylor, Myers,
//   Bonikowske, Heart Fail Rev 2024 (adapted from ACSM GETP 11th ed.):
//   weight gain of 1.8 kg (3 lb) or more over 1-3 days is a relative
//   contraindication; without an exercise test (or with marked chronotropic
//   limitation) use RPE 11-14 and a heart rate 20-30 /min above rest.
// - ODI minimal important change 10 points or 30% (Ostelo 2008).
// - Gait speed MCID 0.16 m/s in subacute stroke, measured 20 to 60 days
//   after stroke: Tilson JK et al. Phys Ther 2010;90(2):196-208,
//   doi:10.2522/ptj.20090079 (abstract).
// - LBP CPG 2021 (George et al., JOSPT): active treatment, education not as
//   a stand-alone, no threat-raising pathoanatomical education, moderate-
//   to high-intensity exercise for chronic LBP without generalised pain.
// - PTA limits: CMS Medicare Benefit Policy Manual ch. 15 sec. 230.1
//   (Rev. 13889), read 2026-11-07.

export const DPT_LABS: SeedLabSet = {
  trackCode: "DPT",
  sources: [
    "https://www.capteonline.org/globalassets/capte-docs/2024-capte-pt-standards-required-elements.pdf",
    "https://www.fsbpt.org/Portals/0/documents/free-resources/2024-PT-Test-Content-Outline-Bullets.pdf",
    "https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/bp102c15.pdf",
    "https://doi.org/10.2519/jospt.2021.0304",
    "https://doi.org/10.1007/s10741-023-10310-9",
    "https://doi.org/10.1001/jama.286.15.1841",
    "https://doi.org/10.1097/BRS.0b013e31815e3a10",
    "https://doi.org/10.2522/ptj.20090079",
  ],
  labs: [
    // ---------------------------------------------------------------- Foundational sciences (7A) (2)
    {
      slug: "dpt-calf-pain-differential",
      objective: "Differential diagnosis: distinguishing conditions appropriate for physical therapy from those requiring referral",
      kind: "case",
      title: "Calf pain: muscle strain or something else?",
      brief:
        "A fictional 56-year-old sales manager books a direct-access visit for left calf pain for 4 days. He flew back from an 11-hour flight 6 days ago and also played tennis 5 days ago, where he \"felt something\" in the calf. He takes medication for high blood pressure and had knee surgery 5 weeks ago.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Findings: left calf circumference 3 cm larger than the right, pitting oedema at the ankle, warmth and diffuse tenderness along the deep veins of the calf, pain on walking. No chest pain or breathlessness.",
          ask: "What are your differential diagnoses, and what do you decide?",
          parts: [
            part(
              "Differential",
              "Lists deep vein thrombosis as the condition to rule out first (risk factors: recent long flight, recent surgery; signs: unilateral swelling, pitting oedema, warmth, deep-vein tenderness), alongside gastrocnemius/soleus strain and others (e.g. ruptured Baker cyst, cellulitis).",
              "DVT first -- recent surgery and a long flight, with one-sided swelling, pitting oedema, warmth and deep-vein tenderness. Also a calf muscle strain from tennis, a ruptured Baker cyst or cellulitis."
            ),
            part(
              "Decision",
              "Uses a clinical decision rule for DVT (e.g. Wells criteria) as part of the reasoning, concludes DVT is likely enough that it needs medical evaluation, refers the same day (urgent ultrasound/D-dimer via physician or emergency department) and does not start exercise or soft-tissue treatment of the calf; gives emergency advice for chest pain or breathlessness.",
              "His Wells-type risk picture makes DVT likely enough to need imaging. Same-day referral to his physician or the ED for assessment; no calf massage or exercise today; call 911 for chest pain or sudden breathlessness."
            ),
          ],
        },
        {
          text: "The physician reports a negative compression ultrasound and refers him back for a medial gastrocnemius strain.",
          ask: "What does your plan look like now?",
          parts: [
            part(
              "Plan for the strain",
              "Sets a staged plan for a calf strain: protect/relative rest early with pain-guided activity, progressive loading (isometric to isotonic heel raises, eccentric work), gait normalisation and a graded return to tennis with criteria.",
              "Pain-guided walking, gentle range, then progressive loading -- double- to single-leg heel raises, eccentric lowering, then hopping and court drills -- returning to tennis when single-leg heel raises and hopping match the other side."
            ),
            part(
              "Safety-net",
              "Keeps a safety-net: re-refer if swelling increases or chest symptoms appear, given the earlier risk factors.",
              "If the swelling grows or he gets chest pain or shortness of breath, he goes straight back to the physician or ED."
            ),
          ],
        },
      ],
    },
    {
      slug: "dpt-heart-failure-implications",
      objective: "Medical and surgical conditions commonly seen in physical therapy and their implications for the plan of care",
      kind: "case",
      title: "Heart failure and a beta-blocker: what changes in the plan",
      brief:
        "A fictional 74-year-old retired farmer with chronic heart failure (reduced ejection fraction, stable for 3 months) is referred for a home exercise program after a hospital stay. He takes a beta-blocker, a diuretic and an ACE inhibitor. He has not had an exercise test. Resting heart rate is 62 /min, BP 118/70 mm Hg.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You are designing the aerobic part of his plan.",
          ask: "How do his condition and medications change how you set and monitor intensity?",
          parts: [
            part(
              "Setting intensity",
              "Explains that the beta-blocker blunts heart-rate response and that age-predicted maximum heart rate formulas aren't valid here, so uses RPE about 11-14 (6-20 scale) and a heart rate about 20-30 /min above rest (here about 82-92 /min) in the absence of an exercise test, starting low and progressing duration first.",
              "Without an exercise test and on a beta-blocker, age-predicted formulas don't work. I'd use RPE 11-14 and a heart rate about 20-30 above rest (roughly 82-92 /min), starting with short bouts and building time before intensity."
            ),
            part(
              "Daily screening",
              "Builds in daily screening for decompensation: daily weights (flag a gain of 1.8 kg / 3 lb or more over 1-3 days), new oedema, orthopnea, worsening breathlessness or fatigue, and what to do if present (hold and contact the team).",
              "He weighs himself every morning; a gain of 1.8 kg (3 lb) or more in 1-3 days, new swelling, needing more pillows, or more breathlessness means no exercise that day and a call to his heart failure team."
            ),
            part(
              "Other drug effects",
              "Notes other medication implications: diuretic/ACE inhibitor -- dehydration and orthostatic hypotension (rise slowly, cool-down), and longer warm-up and cool-down.",
              "The diuretic and ACE inhibitor can cause dizziness on standing and dehydration -- longer warm-up and cool-down, rise slowly, and keep fluids as his team advises."
            ),
          ],
        },
        {
          text: "Three weeks later he reports his weight is up 2.2 kg over 2 days and his ankles are more swollen; he is not breathless at rest.",
          ask: "What do you do?",
          parts: [
            part(
              "Action",
              "Holds the exercise progression (and aerobic exercise) for now, contacts his physician/heart failure team the same day with the findings, and gives urgent-care advice for breathlessness at rest or chest pain; resumes when cleared.",
              "No exercise progression today. I call his heart failure team today about the 2.2 kg gain and swelling, and tell him to call 911 for breathlessness at rest or chest pain. We restart when he's cleared."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Ethics, values, service and leadership (7B) (2)
    {
      slug: "dpt-suspected-elder-abuse",
      objective: "Professional responsibility: integrity, accountability and the duty to report",
      kind: "case",
      title: "Home health: bruises that don't fit",
      brief:
        "This fictional case involves suspected abuse; if it touches something personal, support is available through local adult protective or crisis services. You are a home health PT treating a fictional 83-year-old with mild cognitive impairment after a hip fracture. Her nephew recently moved in and manages her money. On today's visit you see bruises on both upper arms in a grip pattern, some yellow-green and some purple; she seems withdrawn and looks at her nephew before answering. Her pain medication bottle, filled last week, is almost empty, and she says she hasn't been taking it.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The nephew leaves the room to take a phone call.",
          ask: "What do you do during the visit and right after?",
          parts: [
            part(
              "Assess safely",
              "Uses the moment to ask her privately, in a non-leading way, whether she feels safe and how she got the bruises, checks for immediate danger, and documents objective findings (location, pattern, colour/stages of bruises, her words in quotes, behaviour, medication count).",
              "Ask her privately and gently: \"Do you feel safe at home?\" and \"How did you get these bruises?\" Check whether she is in immediate danger. Document the bruise pattern and colours, her exact words, her behaviour and the near-empty bottle."
            ),
            part(
              "Report",
              "Recognises a legal duty to report suspected elder abuse/neglect/financial exploitation per state law (Adult Protective Services, or police/911 if in immediate danger), notifies the agency/supervisor per policy, and does not investigate or confront the nephew.",
              "Report the suspected physical abuse and possible drug diversion to Adult Protective Services today as state law requires (911 if she's in immediate danger), and tell my agency supervisor. I don't confront the nephew or investigate myself."
            ),
          ],
        },
        {
          text: "The nephew returns, sees you writing and says: \"You're not going to report anything, are you? That's private health information.\"",
          ask: "How do you respond?",
          parts: [
            part(
              "Response",
              "Stays calm and safe, does not promise confidentiality or argue, does not disclose the report details to him; knows HIPAA permits disclosures required by law (mandated reporting); leaves if feeling unsafe and follows agency safety procedures.",
              "\"I document what I see at every visit, as I'm required to.\" I don't promise not to report or discuss the details, and if I feel unsafe I end the visit and follow agency safety procedures. HIPAA allows disclosures that the law requires, like this one."
            ),
          ],
        },
      ],
    },
    {
      slug: "dpt-informed-consent-withdrawal",
      objective:
        "Informed consent as an ongoing conversation about the nature, risks, benefits and alternatives of an intervention, which the patient may refuse or withdraw at any time",
      kind: "case",
      title: "Consent for thrust manipulation",
      brief:
        "You are a PT treating a fictional 29-year-old graduate student with acute low back pain and a mobility deficit, no red flags and a normal neurological screen. You think lumbopelvic thrust manipulation could help reduce pain and disability, and the 2021 low back pain guideline supports thrust or non-thrust mobilisation for acute LBP. She has never had manual therapy.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You have finished the examination and want to propose the technique today.",
          ask: "What does your consent conversation cover?",
          parts: [
            part(
              "Elements",
              "Explains the nature of the procedure in plain language, expected benefits, material risks (e.g. temporary soreness; rare serious events), alternatives (non-thrust mobilisation, exercise, no treatment), and that she may refuse or stop at any time; checks understanding and obtains and documents consent.",
              "What it is (a quick, small-amplitude movement while lying on her side), likely benefit (short-term pain relief to help her move), risks (soreness for a day or two, rare serious problems), alternatives (gentler mobilisation, exercise only, or nothing), and that she can say no or stop at any point. Check she understands; document her consent."
            ),
          ],
        },
        {
          text: "She agrees. As you position her she tenses up and says, \"Actually, I don't think I want this.\"",
          ask: "What do you do?",
          parts: [
            part(
              "Withdrawal",
              "Stops immediately without pressure, respects the withdrawal, explores concerns only to inform her, offers the alternatives, and documents the withdrawal and the change of plan.",
              "Stop straight away -- \"That's fine, we won't do it.\" Ask if she'd like to say what worried her, offer gentle mobilisation or exercise instead, and document that she withdrew consent and what we did."
            ),
            part(
              "Ongoing consent",
              "States that consent is ongoing, so it is checked again for later interventions or if she reconsiders.",
              "Consent isn't a one-time signature; I'll check again before any new technique, or if she changes her mind later."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Lifelong learning (7C) (2)
    {
      slug: "dpt-appraise-rct-mcid",
      objective:
        "Interpreting statistical evidence: effect sizes, confidence intervals, minimal clinically important difference and study design limits",
      kind: "build",
      title: "Is a statistically significant result clinically important?",
      brief:
        "A fictional randomised trial of 120 adults with chronic low back pain compared 8 weeks of a new core program with usual physical therapy. Outcome: Oswestry Disability Index (0-100). Result at 8 weeks: mean between-group difference 4.0 points favouring the new program (95% confidence interval 1.2 to 6.8; p = 0.006). Outcome assessors were not blinded, 18% of participants dropped out, and there was no follow-up after 8 weeks. A fictional 45-year-old nurse you are treating for chronic LBP asks if she should switch.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Appraise the result and answer her.",
          parts: [
            part("Statistical significance", "States the difference is statistically significant (p < 0.05; the confidence interval excludes 0).", "Yes: p = 0.006 and the 95% CI (1.2 to 6.8) doesn't include zero, so chance alone is an unlikely explanation."),
            part("Clinical importance", "Compares with the ODI minimal important change (about 10 points) and notes the whole CI lies below it, so the average extra benefit is unlikely to be clinically important.", "The minimal important change for the ODI is about 10 points; even the top of the interval (6.8) is below that, so the average extra benefit is probably too small to matter to patients."),
            part("Design limits", "Names limits: unblinded assessors (detection bias), 18% dropout (attrition bias, check intention-to-treat), short follow-up (no long-term data).", "Unblinded assessors can bias results, an 18% dropout may skew them (was it intention-to-treat?), and no follow-up beyond 8 weeks says nothing about lasting benefit."),
            part("Answer to the patient", "Integrates evidence with her values and her current progress (evidence-based practice): no strong reason to switch on this trial alone; decision shared.", "This trial doesn't show a difference big enough to matter, so there's no strong reason to switch if your current program is working; if you prefer the new one, it's a reasonable choice -- let's decide together."),
          ],
        },
      ],
    },
    {
      slug: "dpt-motivational-interviewing-adherence",
      objective:
        "Motivational interviewing for behaviour change: open-ended questions, empathy, and working through the patient's ambivalence instead of directing them",
      kind: "case",
      title: "\"I just don't have time for the exercises\"",
      brief:
        "A fictional 61-year-old bakery owner with knee osteoarthritis has done her home exercises about once a week for a month. She says, \"I know I should do them, but I'm on my feet at the bakery from 4 a.m. and I just don't have time.\" Her goal at evaluation was to keep working without needing a knee replacement.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "This is your first response to her statement.",
          ask: "Write your opening response using motivational interviewing.",
          parts: [
            part(
              "Opening",
              "Uses empathy/reflective listening and an open question rather than advice or warning (no lecturing, no 'you need to'); reflects both sides of the ambivalence.",
              "\"Your days start at 4 a.m. and you're on your feet the whole time -- finding extra time feels impossible, and at the same time you want to keep that knee working for the bakery. What matters most to you about it?\""
            ),
          ],
        },
        {
          text: "She replies: \"I don't want surgery. My mother had both knees done and was off work for months. But I'm so tired at night.\"",
          ask: "How do you build on that?",
          parts: [
            part(
              "Evoke change talk",
              "Reflects and amplifies her change talk (not wanting surgery, staying at work), explores her own ideas for fitting exercise in, and asks permission before offering options.",
              "\"Staying at work and avoiding what your mother went through really matters to you.\" Then: \"What might work, given how tired you are at night?\" and \"Would it help if I shared what others in busy jobs have tried?\""
            ),
            part(
              "Shared plan",
              "Agrees a small, specific plan she chooses (e.g. 2 exercises during a mid-morning break), with her confidence rating and a follow-up check, rather than prescribing the full program.",
              "She picks two exercises to do during her 10 a.m. break, 5 days a week. I ask, \"How confident are you, 0-10?\" and we'll check next week what worked."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Examination and screening (7D1) (2)
    {
      slug: "dpt-systems-review-decisions",
      objective: "Performing a systems review and deciding what it means to proceed, modify or refer",
      kind: "case",
      title: "Shoulder referral, systems review surprises",
      brief:
        "A fictional 58-year-old carpenter is referred by his physician for right shoulder impingement-type pain for 2 months. He hasn't seen a physician for anything else in 5 years. The clinic's policy is to contact the referring physician the same day for a resting blood pressure at or above the facility's hold limit.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Systems review: resting BP 182/108 mm Hg on two readings 5 minutes apart (above the facility's hold limit), no headache, chest pain or visual change; on the back of his right shoulder an irregular dark mole with uneven colour that he says has grown over the last few months; neuromuscular and communication screens normal.",
          ask: "What do these findings mean for today's plan?",
          parts: [
            part(
              "Blood pressure",
              "Identifies markedly elevated BP above the facility hold limit; defers exercise that raises BP (or limits to gentle, low-intensity examination), screens for hypertensive emergency symptoms, and contacts the physician the same day per policy; escalates to emergency care if symptoms appear.",
              "BP above our hold limit on two readings: no resistance or vigorous exercise today, finish only gentle examination, check for headache, chest pain, vision change or neurological signs (none), and phone his physician today. If symptoms appear, emergency care."
            ),
            part(
              "Skin",
              "Recognises a changing, irregular, multicoloured mole as suspicious for melanoma (ABCDE features) and refers to the physician/dermatology, explaining without diagnosing.",
              "An irregular, multicoloured mole that is growing has ABCDE warning features -- refer to his physician or a dermatologist for assessment, telling him it should be checked, without naming a diagnosis."
            ),
          ],
        },
        {
          text: "His physician sees him that week, starts antihypertensive treatment and arranges a dermatology visit. BP is now 138/84 mm Hg.",
          ask: "How do you proceed with the shoulder?",
          parts: [
            part(
              "Proceed and monitor",
              "Proceeds with the shoulder examination and plan of care, monitoring BP at each visit (especially with resistance work and new medication effects such as dizziness), and follows up on the dermatology appointment.",
              "Complete the shoulder exam and start the plan, checking BP each visit and watching for dizziness on the new medication, and confirm he went to the dermatology appointment."
            ),
          ],
        },
      ],
    },
    {
      slug: "dpt-direct-access-neck-trauma",
      objective: "Providing physical therapist services through direct access, including the screening that makes it safe",
      kind: "case",
      title: "Direct access: neck pain after a car accident",
      brief:
        "A fictional 34-year-old graphic designer comes directly to your clinic with neck pain that started this morning, the day after her stopped car was hit from behind at low speed. She walked around at the scene and was not taken to hospital. She has no tingling in her arms or legs. She is alert and has not taken any sedating medication.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "There is no midline cervical tenderness. She can actively rotate her neck 50 degrees to the left and 55 degrees to the right.",
          ask: "Apply the Canadian C-Spine Rule and decide whether you can proceed.",
          parts: [
            part(
              "High-risk factors",
              "Checks the high-risk factors (age 65 or over, dangerous mechanism, paresthesias in the extremities) and finds none.",
              "No high-risk factor: she is 34, a low-speed rear-end collision isn't a dangerous mechanism, and no paresthesias."
            ),
            part(
              "Low-risk factors and rotation",
              "Finds low-risk factors present (simple rear-end collision, ambulatory, delayed onset of pain, no midline tenderness) allowing range-of-motion assessment, and active rotation of 45 degrees or more both ways, so radiography is not indicated and PT examination can continue.",
              "Low-risk factors are present (simple rear-end, walking at the scene, delayed onset, no midline tenderness), so I can test motion; she rotates more than 45 degrees each way. The rule says no imaging is needed -- I can continue."
            ),
          ],
        },
        {
          text: "Two visits later she reports new tingling in both hands and says her legs feel \"clumsy\".",
          ask: "What do you do?",
          parts: [
            part(
              "Re-screen and refer",
              "Recognises new bilateral upper-limb paresthesias and lower-limb clumsiness as possible spinal cord involvement (a red flag), stops treatment, performs a neurological screen including upper motor neuron signs, and refers urgently for medical evaluation and imaging; documents.",
              "Bilateral hand tingling and clumsy legs could mean the spinal cord is involved. Stop treatment, check reflexes, Hoffmann and Babinski signs and gait, and send her for urgent medical evaluation and imaging today; document it."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Evaluation, diagnosis, prognosis, plan of care (7D2-7D9) (2)
    {
      slug: "dpt-icf-evaluation-write-up",
      objective:
        "Evaluating examination data to make clinical judgments about impairments, activity limitations and participation restrictions",
      kind: "build",
      title: "Turn an examination into an evaluation",
      brief:
        "A fictional 67-year-old retired postal worker is 8 weeks after open reduction and internal fixation of a right bimalleolar ankle fracture, now weight-bearing as tolerated. Examination: ankle dorsiflexion 0 degrees (left 15), plantarflexion strength 3+/5, single-leg stance on the right 3 s, mild swelling; walks with a cane with a shortened step on the left; gait speed 0.75 m/s; cannot manage the 3 steps at her front door without a rail. She lives alone, volunteers at a library twice a week (bus ride and 400 m walk) and is anxious about falling again. No red flags.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the evaluation.",
          parts: [
            part("ICF problem list", "Classifies findings into body structure/function impairments (dorsiflexion, plantarflexion strength, balance, swelling), activity limitations (gait speed, stairs, single-leg stance), participation restrictions (library volunteering, bus use) and contextual factors (lives alone, fear of falling).", "Impairments: dorsiflexion 0 degrees, plantarflexor weakness 3+/5, poor right single-leg balance, swelling. Activity: slow gait (0.75 m/s) with a cane, can't do steps without a rail. Participation: not volunteering or using the bus. Context: lives alone, fear of falling."),
            part("PT diagnosis", "States a movement/impairment-based PT diagnosis linking the impairments to the activity limits (e.g. impaired gait and balance due to ankle mobility and plantarflexor deficits after fracture fixation).", "Impaired gait, balance and stair negotiation from restricted ankle dorsiflexion and plantarflexor weakness after right ankle ORIF."),
            part("Prognosis", "Gives a reasoned prognosis with a time frame, citing favourable (healed fixation, WBAT, motivated) and unfavourable factors (age, fear of falling, living alone).", "Good prognosis to walk without a device and manage stairs in about 8-10 weeks: fracture fixed and weight-bearing, motivated; slowed by age, fear of falling and living alone."),
            part("Goals", "Writes measurable, time-bound goals across activity and participation (e.g. gait speed, stairs without rail, return to volunteering by bus).", "In 4 weeks: climb her 3 front steps with one rail, step-over-step. In 8 weeks: walk 400 m without a device at 1.0 m/s or faster and take the bus to the library twice a week."),
          ],
        },
      ],
    },
    {
      slug: "dpt-direct-pta-care",
      objective:
        "Determining and supervising the components of care that may be directed to a physical therapist assistant: team-based care, patient needs, the PTA's competence, jurisdictional law, payer and facility policy",
      kind: "case",
      title: "What goes to the PTA?",
      brief:
        "You are the PT in a fictional hospital outpatient department with one experienced PTA. State law and facility policy allow PTAs to provide interventions under the plan of care with the PT on site. This morning: (A) a fictional new patient referred for low back pain; (B) a stable patient 4 weeks after total knee arthroplasty on a clear, progressing plan; (C) a patient after a stroke whose blood pressure response to exercise has been unpredictable this week and whose plan you changed yesterday.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You have 30 minutes before the clinic opens.",
          ask: "Which care do you direct to the PTA, and why?",
          parts: [
            part(
              "Decisions",
              "Keeps A's initial examination/evaluation with the PT; directs B's interventions to the PTA (stable, predictable, within the PTA's competence); keeps C with the PT (or at least the first session after the plan change) because of instability and the need for ongoing clinical judgment.",
              "A: I do the evaluation -- PTAs can't evaluate. B: the PTA, since he's stable and the plan is clear. C: I treat her myself today; her unstable BP response and new plan need my judgment."
            ),
            part(
              "Factors",
              "Names the factors weighed: patient acuity/stability and complexity, predictability of outcomes, the PTA's competence, jurisdictional law, payer rules (e.g. Medicare's PTA limits) and facility policy.",
              "Stability and complexity, how predictable the response is, the PTA's skills, state law, payer rules such as Medicare's limits on PTAs, and facility policy."
            ),
          ],
        },
        {
          text: "At the end of the week the PTA tells you patient B has reached 0-115 degrees and wants to stop coming, and asks if she should discharge him and write his home program.",
          ask: "How do you respond?",
          parts: [
            part(
              "PT responsibility",
              "Re-assesses B personally before discharge, writes the discharge summary and decides the home/maintenance program, while using the PTA's data and allowing the PTA to teach the program the PT designs.",
              "I'll see him myself to re-assess, decide on discharge and design his home program; she can teach it and her measurements go into my discharge summary."
            ),
            part(
              "Basis",
              "Cites that PTAs may not evaluate/assess, make clinical judgments or develop skilled maintenance programs (Medicare Benefit Policy Manual ch. 15 sec. 230.1) and that the PT remains responsible for the patient.",
              "Medicare's manual (ch. 15, 230.1) says PTAs may not evaluate, make clinical judgments or develop maintenance programs, and I stay responsible for his care."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Interventions and management (7D10-7D16) (2)
    {
      slug: "dpt-chronic-lbp-pain-plan",
      objective: "Interventions across human development and for pain and the pain experience",
      kind: "case",
      title: "Chronic back pain and fear of moving",
      brief:
        "A fictional 48-year-old forklift driver has had low back pain for 9 months, with no leg symptoms and no generalised pain elsewhere. Red-flag screen and neurological screen are negative. Oswestry Disability Index 46%. He has stopped lifting anything heavy because a previous provider told him his MRI showed \"a crumbling spine\", and he spends much of the day lying down. He wants to get back to work.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Examination shows reduced trunk endurance, guarded movement and high fear of movement on questioning.",
          ask: "Write the core of the plan, citing the 2021 LBP guideline.",
          parts: [
            part(
              "Exercise",
              "Prescribes active, progressive exercise -- trunk strengthening/endurance and general/aerobic exercise -- at moderate to high intensity (appropriate because he has chronic LBP without generalised pain), progressed by graded exposure to lifting.",
              "Progressive trunk strengthening and endurance plus aerobic exercise at moderate-to-high intensity -- fine for chronic LBP without widespread pain -- building to graded lifting practice for his job."
            ),
            part(
              "Education",
              "Uses active pain-science education combined with exercise (not as a stand-alone), reassuring about spine strength and favourable prognosis, encouraging activity and return to work, and avoiding threatening pathoanatomical explanations or bed rest.",
              "Explain that the spine is strong, that MRI changes are common and don't mean damage, and that pain can be turned up by fear and inactivity; encourage him to move more, not rest. Paired with exercise, never on its own."
            ),
          ],
        },
        {
          text: "After 6 weeks his ODI is 28% and he lifts 15 kg from floor to waist without fear. His job needs 25 kg.",
          ask: "Interpret the progress and plan the next phase.",
          parts: [
            part(
              "Interpretation",
              "Calculates an 18-point (about 39%) ODI improvement, above the minimal important change (10 points or 30%).",
              "ODI 46% to 28% is 18 points (39%), past the 10-point / 30% minimal important change."
            ),
            part(
              "Next phase",
              "Progresses work-specific graded loading toward 25 kg, plans return to work (possibly graded/modified duties with employer), and a long-term self-management/activity plan before discharge.",
              "Keep loading toward 25 kg with work-like lifts, agree a graded return to full duties with his employer, and set up a long-term exercise routine before discharge."
            ),
          ],
        },
      ],
    },
    {
      slug: "dpt-subacute-stroke-monitor-adjust",
      objective: "Monitoring and adjusting the plan of care to optimise health outcomes",
      kind: "case",
      title: "Gait speed after stroke: progress, plateau, plan",
      brief:
        "A fictional 63-year-old retired pharmacist had a right hemisphere ischaemic stroke 20 days ago and starts outpatient physical therapy 3 times a week. Comfortable gait speed on the 10-metre walk test is 0.22 m/s with a quad cane and minimal assistance. Her goal is to walk around her home and garden independently.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At day 50 after the stroke, her comfortable gait speed is 0.41 m/s.",
          ask: "Is this a meaningful change, and what do you do with the plan?",
          parts: [
            part(
              "Interpretation",
              "Calculates +0.19 m/s and compares with the MCID of 0.16 m/s for subacute stroke (Tilson 2010, 20-60 days after stroke) -- meaningful.",
              "Gait speed rose 0.19 m/s (0.22 to 0.41), more than the 0.16 m/s MCID for people 20-60 days after stroke -- a meaningful improvement."
            ),
            part(
              "Adjust",
              "Continues and progresses the effective approach (task-specific walking practice with increasing intensity/volume, reduced assistance), updates goals and documents the progress report.",
              "Keep the task-specific walking practice, push intensity and step volume, reduce assistance and cane reliance, update goals, and write the progress report with the new data."
            ),
          ],
        },
        {
          text: "Over the next 4 weeks her gait speed stays at 0.41-0.43 m/s and she reports low motivation; sessions have mostly been at low effort.",
          ask: "How do you respond to the plateau?",
          parts: [
            part(
              "Respond to plateau",
              "Re-examines for causes (impairments, medical changes, fatigue, mood/depression screen, adherence), and changes the plan -- e.g. increases walking practice intensity and amount, adds home/community walking with feedback, involves her in goal setting -- or refers (e.g. for mood) as needed.",
              "Re-examine: strength, endurance, medical changes and a depression screen. Raise walking-practice intensity and the number of steps, add a home walking plan with step-count feedback, set goals with her, and refer to her physician if the mood screen is positive."
            ),
            part(
              "Decide on continuing",
              "Sets a time-limited trial of the changed plan with a measurable criterion; if no meaningful change, plans discharge or transition to a maintenance/community program with documentation.",
              "Try the new plan for 3 weeks; if gait speed doesn't move meaningfully, discharge to a community walking program with a home plan and document why."
            ),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Health care activities and community health (7D17-7D22) (1)
    {
      slug: "dpt-qi-falls-pdsa",
      objective:
        "Quality improvement foundations: Donabedian's work on evaluating quality of care and the plan-do-study-act cycle for testing changes",
      kind: "build",
      title: "Plan a quality improvement cycle for in-clinic falls",
      brief:
        "A fictional outpatient clinic recorded 6 patient falls in its gym in the last 6 months, compared with 1 in the previous 6 months. Four happened during transfers to and from treatment tables when the patient was left briefly alone; none caused serious injury. You lead the quality improvement project.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the measures and the first test of change.",
          parts: [
            part("Donabedian measures", "Names at least one structure measure (e.g. height-adjustable tables, gait belts available), one process measure (e.g. % of high-risk patients screened and flagged, % of transfers with gait belt/staff present) and one outcome measure (falls per 1,000 visits).", "Structure: number of height-adjustable tables and gait belts at each station. Process: % of patients screened for fall risk and flagged, % of flagged transfers done with a gait belt and staff in place. Outcome: falls per 1,000 visits."),
            part("Plan", "States a specific change and prediction (e.g. a 'stay with flagged patients during transfers' rule plus a visual flag), who/where/when, and the data to collect.", "Plan: for 4 weeks, every patient with a positive fall screen gets a coloured wristband and is never left alone on or near a table; prediction: no table-related falls and 90% adherence. Track adherence on a daily checklist."),
            part("Do and Study", "Runs it on a small scale first, then compares the data with the prediction, including a balancing measure (e.g. waiting times, staff workload).", "Run it with one team for 4 weeks, then compare falls and adherence with the prediction, and watch a balancing measure -- session delays and staff overtime."),
            part("Act", "Decides to adopt, adapt or abandon based on the study and plans the next cycle/spread.", "If adherence is high and falls drop without big delays, adopt it and spread to all teams; if adherence is low, adapt (e.g. scheduling changes) and test again."),
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- Practice management (7D23-7D25) (1)
    {
      slug: "dpt-safety-incident-response",
      objective:
        "Assessing, documenting and minimising safety risks for patients and providers, including facility safety policies",
      kind: "build",
      title: "After a near-miss with a hot pack",
      brief:
        "In a fictional clinic, a fictional 71-year-old patient with diabetic peripheral neuropathy had a moist hot pack placed on her low back with too few towel layers and was left for 20 minutes. When it was removed she had a red, blanching area of skin with no blisters. A busy aide had set up the hot pack; there is no written heat-application procedure and the hydrocollator temperature log has not been filled in for 3 weeks.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the response: immediate care, documentation, root causes and prevention.",
          parts: [
            part("Immediate care and disclosure", "Assesses and cares for the skin (cool, protect, re-check), informs the patient honestly, notifies the supervisor and the patient's physician per policy, and monitors for delayed blistering.", "Remove heat, cool and protect the area, check sensation and skin and re-check before she leaves; tell her plainly what happened; notify the supervisor and her physician per policy; ask her to report any blisters."),
            part("Documentation", "Documents objective findings and care in the medical record (without blame or reference to the incident report) and completes a separate incident report per facility policy.", "Medical record: objective skin findings, treatment and communication. Separate incident report (not mentioned in the record) with times, people involved and the facts."),
            part("Root causes", "Identifies system causes, not just individual error: no written procedure, missed screening for impaired sensation, unchecked equipment temperature (log not kept), staffing/supervision of the aide, no timed checks.", "No written heat procedure, sensation not screened before heat, hydrocollator temperature not monitored, aide working without direction or checks, and nobody checking the skin during the 20 minutes."),
            part("Prevention", "Proposes specific system fixes: a written modality procedure with contraindication/sensation screening, required towel layers and skin checks at set intervals, temperature logging with an owner, aide training and supervision rules, and auditing.", "Written procedure: screen sensation and contraindications before any heat; standard towel layers; skin checks every 5 minutes; daily temperature log with a named owner; aide competency training and PT sign-off; monthly audit."),
          ],
        },
      ],
    },
  ],
};
