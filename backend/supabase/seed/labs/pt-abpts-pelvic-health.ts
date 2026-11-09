import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-152: ABPTS Pelvic & Women's Health Clinical Specialist (ABPTSPWCS),
// authored labs.
//
// Aligned to the ABPTS pelvic and women's health examination outline
// (knowledge 20%, patient and client management 55%, professional practice
// 25%; seed/tracks/pt-abpts.ts). Density (hybrid, docs/labs.md): 1/3/1 = 5.
// The management unit carries three labs: screening for referral (the
// outline's largest single area), urinary dysfunction, and prolapse.
//
// Sources checked 2026-11-07:
//   OUTLINE   ABPTS, Specialist Certification Examination Outline: Pelvic
//             and Women's Health
//             https://specialization.apta.org/become-a-specialist/pelvic-womens-health/specialist-certification-examination-outline-womens-health
//   NICE-PFMT NICE QS77 quality statement 4 (sourced to NG123 rec. 1.4.4 and
//             NG210 rec. 1.6.14): women with stress or mixed urinary
//             incontinence are offered a supervised pelvic floor muscle
//             training programme of at least 3 months as first-line
//             treatment, alongside bladder training for mixed incontinence;
//             the supervising clinician assesses the woman's ability to
//             contract and relax the pelvic floor.
//             https://www.nice.org.uk/guidance/QS77/chapter/quality-statement-4-supervised-pelvic-floor-muscle-training
//             The NG123 programme detail (at least 8 contractions, 3 times a
//             day) was confirmed only through a CPD summary of NG123 today,
//             not the NICE page itself, so the rubrics ask for a dosed,
//             progressive programme rather than that exact count.
//             https://www.pharmacymagazine.co.uk/cpd-modules/update-on-incontinence/behavioural-changes-and-physical-therapies-811591
// Values from the track's own objectives (urinary incontinence types,
// pregnancy exercise warning signs and absolute contraindications, the
// cough stress test, POP-Q / Baden-Walker as the staging systems, pessary as
// a conservative option, Kegel teaching points) were verified there on
// 2026-11-04 against the StatPearls chapters tagged in
// seed/tracks/pt-abpts.ts (SP-UI, SP-SUI, SP-PREG, SP-POP, SP-KEG).
//
// SAFETY: every patient is fictional; exam practice, not clinical guidance.
// Internal examination is described only at the level of consent, scope and
// process. All needs_expert_review until a board-certified pelvic health
// physical therapist approves it (docs/labs.md).

export const ABPTSPWCS_LABS: SeedLabSet = {
  trackCode: "ABPTSPWCS",
  sources: [source("https://specialization.apta.org/become-a-specialist/pelvic-womens-health/specialist-certification-examination-outline-womens-health", "exam_outline", "2026-11-07")],
  labs: [
    // ----------------------------------------------------------------- Knowledge (1)
    {
      slug: "pwcs-classify-incontinence-types",
      objective: "Name the five main types of urinary incontinence (stress, urge, mixed, overflow, functional) and the leakage pattern of each, such as stress leakage with coughing, sneezing, laughing or straining",
      kind: "build",
      title: "Classify three women's leakage from the history",
      brief:
        "Three fictional women attend a pelvic health clinic in one afternoon. Ms A, 38, two vaginal births, leaks a small spurt when she sneezes, runs or lifts her toddler; she never feels a sudden need to go. Ms B, 64, describes an overwhelming urge that gives her seconds to reach the toilet, leaks on the way several times a day, and gets up three times a night; she also leaks a little when she coughs hard. Ms C, 81, lives with advanced knee osteoarthritis and mild dementia; she is aware of needing to void, but by the time she has stood up with her frame and reached the bathroom she has wet herself. None reports pain, blood in the urine or a feeling of incomplete emptying.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each woman's incontinence, name the pattern that decides it, and say what the classification does to the first-line plan.",
          parts: [
            part(
              "Ms A",
              "Classifies stress urinary incontinence from leakage with raised abdominal pressure (sneezing, running, lifting) and no urgency, and sets first-line care as pelvic floor muscle assessment and training with lifestyle advice.",
              "Stress urinary incontinence: leakage only with coughing, sneezing, running and lifting, no urgency. First line is pelvic floor muscle assessment and a supervised training programme, with lifestyle advice (constipation, weight, bladder irritants) and a cough stress test to document the leak."
            ),
            part(
              "Ms B",
              "Classifies mixed incontinence with urgency predominant (urgency, frequency, nocturia with urge leakage, plus some stress leakage), and sets first line as bladder training with urge-suppression strategies alongside pelvic floor muscle training, with screening for neurological or medical causes of a new overactive bladder.",
              "Mixed incontinence, urge-predominant: urgency with urge leakage, daytime frequency and nocturia, plus a stress component when coughing. First line is bladder training with urge-suppression techniques and pelvic floor muscle training together, a bladder diary, review of fluids and irritants, and a screen for medical or neurological causes of new detrusor overactivity."
            ),
            part(
              "Ms C",
              "Classifies functional incontinence (intact sensation but mobility and cognitive barriers prevent reaching the toilet in time) and sets first line on access and timing -- mobility aids and toileting routine, environment, caregiver input -- rather than pelvic floor training alone.",
              "Functional incontinence: she feels the need to void but cannot get to the toilet in time because of her knees, the frame and her memory. First line targets access and timing: a commode or bedside urinal, clothing that opens quickly, prompted or scheduled voiding with the caregiver, a clear path and night lighting, and work on sit-to-stand and gait speed; pelvic floor training alone will not fix this."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Patient and client management (3)
    {
      slug: "pwcs-pregnancy-screening-and-referral",
      objective: "Screening for medical conditions requiring referral in pelvic and women's health, the outline's largest single area",
      kind: "case",
      title: "Pelvic girdle pain at 30 weeks, and a change at the third visit",
      brief:
        "A fictional 31-year-old woman in her first pregnancy, now 30 weeks, is referred for posterior pelvic girdle pain that limits walking and turning in bed. Her pregnancy has been uncomplicated; blood pressure at her last antenatal visit was 118/72. She wants to keep walking and swimming. She is otherwise well and has no bleeding, contractions or breathlessness.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Examination reproduces her pain with single-leg stance and the posterior pelvic pain provocation test; lumbar movements are full; neurological screen is normal. She asks how much exercise is safe and what should make her stop.",
          ask: "Set the exercise plan and the stop rules.",
          parts: [
            part(
              "Exercise plan",
              "Supports continued moderate activity in pregnancy (about 150 minutes a week of moderate intensity, checked with the talk test), swimming and walking as tolerated within pain limits, a pelvic support belt and stabilisation exercises for the pelvic girdle pain, avoiding prolonged supine lying, contact sports and fall-risk activities.",
              "Keep going: about 150 minutes a week of moderate activity judged by the talk test, split as swimming and shorter walks within pain tolerance; add pelvic girdle stabilisation work and a trial of a pelvic support belt; sleep and exercise avoiding long periods flat on her back; no contact sports, fall-risk activities or breath-hold diving."
            ),
            part(
              "Stop rules",
              "Lists the warning signs that stop exercise and need prompt medical contact: painful regular contractions, vaginal bleeding, breathlessness before or out of proportion to exertion, dizziness or faintness, headache, chest pain, and calf pain or swelling.",
              "Stop and call her maternity team for: regular painful contractions, any vaginal bleeding, breathlessness that starts before exertion or is out of proportion to it, dizziness or feeling faint, headache, chest pain, or calf pain or one-sided swelling."
            ),
          ],
        },
        {
          text: "At the third visit, at 33 weeks, she mentions a headache for two days that paracetamol has not shifted, \"flashing lights\" in her vision yesterday, and that her rings and shoes feel tight. Her blood pressure in your clinic is 152/98.",
          ask: "What do you do?",
          parts: [
            part(
              "Recognition",
              "Recognises features of possible preeclampsia (new persistent headache, visual disturbance, new swelling and a clearly raised blood pressure in the third trimester) as a medical emergency outside physical therapy scope, and that preeclampsia is an absolute contraindication to exercise.",
              "Persistent headache, visual disturbance, new swelling and a blood pressure that has jumped from 118/72 to 152/98 at 33 weeks are the picture of preeclampsia -- an obstetric emergency, not a therapy problem. Preeclampsia is also an absolute contraindication to exercise."
            ),
            part(
              "Action",
              "Stops the session, arranges same-day urgent obstetric assessment (calls the maternity unit / sends her to be seen now), does not treat or reassure, documents findings and the time, and defers any further exercise until cleared by the obstetric team.",
              "No treatment today. I call her maternity unit while she is with me and arrange for her to be assessed now -- today, not at her next appointment -- and make sure she has someone to take her. I document the symptoms, the reading and the time, and hold all exercise until the obstetric team clears her and tells me what has changed."
            ),
          ],
        },
      ],
    },
    {
      slug: "pwcs-stress-incontinence-program",
      objective: "Urinary dysfunction (15%): incontinence, retention and urgency, including bladder training and pelvic floor muscle training",
      kind: "case",
      title: "Stress incontinence after a second birth",
      brief:
        "A fictional 34-year-old woman, five months after her second vaginal delivery (forceps, 3.9 kg baby), leaks urine when she coughs, sneezes and tries to run; she has stopped running and avoids trampolines with her older child. No urgency, no nocturia, no pain, no constipation. She has consented to an internal pelvic floor examination after a trauma-informed discussion.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Examination: a visible leak on a standing cough stress test with a comfortably full bladder; on internal assessment she produces a weak lift with poor endurance (holds about 3 seconds), substitutes with gluteal and abdominal bracing, and relaxes fully between attempts; no prolapse beyond the hymen on strain.",
          ask: "Write the diagnosis and the first-line programme.",
          parts: [
            part(
              "Diagnosis",
              "States stress urinary incontinence confirmed by a positive cough stress test, with an underactive pelvic floor (weak, short hold, substitution) as the impairment, and notes the risk factors (forceps, larger baby) and that relaxation is intact.",
              "Stress urinary incontinence, confirmed on the cough stress test, driven by an underactive pelvic floor: weak contraction, about a 3-second hold, accessory bracing with glutes and abdominals, with normal relaxation. Forceps delivery and a 3.9 kg baby are the risk factors."
            ),
            part(
              "Programme",
              "Prescribes supervised pelvic floor muscle training for at least 3 months as first line: teaches a correct isolated contraction (no gluteal/abdominal substitution, breathe normally), dosed and progressive contractions mixing holds and quick contractions toward a daily routine, with biofeedback or a perineometer if she cannot find or hold the contraction, functional 'knack' bracing before coughs and sneezes, lifestyle advice, and scheduled reviews.",
              "A supervised pelvic floor muscle training programme of at least 3 months: first a correct, isolated contraction -- lift without squeezing the buttocks, abdominals or holding her breath, confirmed by palpation -- then a daily routine of sustained holds building from 3 toward 10 seconds and quick contractions, progressed each review; the 'knack' (contract before a cough, sneeze or lift); biofeedback or a perineometer if she loses the contraction; avoid constipation and bladder irritants. Review at 4-6 weeks and at the end of the programme."
            ),
          ],
        },
        {
          text: "At 12 weeks she holds 8-10 seconds for 10 repetitions without substitution and the cough stress test is dry standing. She asks when she can run again and whether she has to do these exercises forever.",
          ask: "Plan the return to running and the long-term programme.",
          parts: [
            part(
              "Return to running",
              "Progresses impact gradually with criteria: starts with walk-jog intervals once strength and endurance goals are met and the cough test is dry, adds single-leg loading and hopping tests before running, uses the knack and breathing with impact, and sets leakage as the signal to step back a level.",
              "Build impact in steps: brisk walking, then walk-jog intervals, then continuous running, moving up only while dry; before each step she passes hops and single-leg hops without leaking and shows good pelvic floor timing with breath. Any leak means hold that level for a week or two, not stop."
            ),
            part(
              "Long-term",
              "Explains that gains are kept only with continued training: a maintenance dose (fewer sessions a week, folded into daily routines), reassessment if symptoms return or with the next pregnancy or menopause, and what would prompt referral (new urgency, pain, prolapse symptoms, failure to improve).",
              "The muscles stay strong only if used: a maintenance routine of a few sets most days built into daily habits (for example at traffic lights or when feeding the baby). She comes back if leaking returns, before and after any future pregnancy, and around menopause. New urgency, pain, a bulge sensation or no further progress are reasons to refer on."
            ),
          ],
        },
      ],
    },
    {
      slug: "pwcs-prolapse-conservative-management",
      objective: "Stage pelvic organ prolapse with the POP-Q system or Baden-Walker grading, and offer pelvic floor muscle training or a pessary as conservative options",
      kind: "case",
      title: "A bulge that is worse by evening",
      brief:
        "A fictional 58-year-old postmenopausal woman, three vaginal births, describes a feeling of \"something coming down\" and a vaginal bulge that is worse at the end of the day and after gardening, with a sense of incomplete bladder emptying. No bleeding, no pelvic pain, no urinary tract infections. She wants to avoid surgery if she can and has consented to an internal examination.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "On examination you see an anterior vaginal wall bulge that descends to, but not beyond, the hymen on maximal strain; pelvic floor contraction is present but weak with fair coordination; there is no bleeding or atypical tissue.",
          ask: "Record the finding in a recognised system and set the conservative plan.",
          parts: [
            part(
              "Staging and documentation",
              "Documents the prolapse with a recognised system -- the POP-Q (points measured in centimetres relative to the hymen, with total vaginal length, genital hiatus and perineal body) or Baden-Walker grading -- names the anterior compartment, records that the leading edge reaches the hymen, and notes that staging is repeated the same way at follow-up.",
              "Record it as an anterior compartment prolapse using the POP-Q: the leading anterior point measured relative to the hymen (here at the hymen, 0 cm) alongside the other points, total vaginal length, genital hiatus and perineal body, so the stage can be repeated identically at review. Baden-Walker grading is the simpler alternative if the clinic uses it."
            ),
            part(
              "Conservative plan",
              "Offers supervised pelvic floor muscle training over months (NICE: at least 4 months for symptomatic prolapse) with reviews, symptom-based strategies (bulge worse with gardening: load management, defecation and lifting technique, avoid constipation), and discusses a pessary as a conservative option through the appropriate provider, with surgery as the later option she wishes to avoid.",
              "A supervised pelvic floor muscle training programme over at least 4 months with reviews, aiming at strength, endurance and the pre-load 'knack' before lifting and straining; manage the loads that provoke the bulge (gardening posture, lifting technique, no straining -- treat constipation); and discuss a pessary fitted by her gynaecology or trained pelvic health provider as a conservative support, especially for long gardening days. Surgery stays the later option."
            ),
          ],
        },
        {
          text: "At four months her symptom score has improved and she is gardening with a pessary on long days, but she now mentions a small amount of vaginal bleeding after using the pessary last week.",
          ask: "What do you do with this new information?",
          parts: [
            part(
              "Action",
              "Treats postmenopausal vaginal bleeding as a red flag requiring prompt medical review (gynaecology/pessary provider) before continuing pessary use, rather than attributing it to the pessary without examination; keeps pelvic floor training going.",
              "Postmenopausal bleeding needs medical review, even if the pessary is the likely cause (erosion or irritation). I ask her to stop using the pessary and see her gynaecologist or pessary clinic promptly for examination; pelvic floor training continues meanwhile."
            ),
            part(
              "Communication",
              "Communicates without alarm and documents: explains why bleeding after menopause is always checked, coordinates with the pessary provider about fit and vaginal tissue health (for example local estrogen is the provider's decision), and records the symptom, the advice and the date.",
              "I explain that bleeding after menopause is always checked and is usually something simple, write to the pessary provider about fit and tissue health (local estrogen is their call), and document what she reported, what I advised and when. We re-stage at her next visit."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Professional practice (1)
    {
      slug: "pwcs-trauma-informed-internal-exam",
      objective: "Communication, individual and cultural differences and trauma-informed professional behavior",
      kind: "build",
      title: "Set up a trauma-informed first pelvic floor examination",
      brief:
        "A fictional 29-year-old woman is referred for dyspareunia and pelvic pain. On her intake form she ticked \"yes\" to a history of sexual assault and wrote \"please don't ask me details\". English is her second language; she declined an interpreter but asks that her sister can stay. She is visibly anxious in the waiting room. You expect that an internal pelvic floor examination will eventually be useful, but nothing requires it today.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write how you will run this first visit: consent and choice, the examination decision, the environment and communication, and documentation.",
          parts: [
            part(
              "Consent and choice",
              "Describes informed, ongoing consent led by the patient: explains what an internal examination is and is not, that it is optional and can be deferred or stopped at any moment with an agreed signal, offers alternatives (external observation, self-assessment, no exam today), does not ask for details of the trauma, and confirms consent at each step.",
              "I start by saying I will not ask about what happened and that she controls the pace. I explain what a pelvic floor examination involves, that we do not need it today, that she can choose external observation only, a later date, or nothing, and that she can stop at any moment with a word or a raised hand. Consent is asked again before every step, not once at the start."
            ),
            part(
              "Examination decision today",
              "Decides not to perform an internal examination at this visit because it is not required and trust is not yet built; uses history, education and external or non-invasive assessment, and plans the internal examination only when she chooses it, with the option of her sister present and the therapist of her preferred gender.",
              "No internal exam today. I take the history she is comfortable giving, explain the pelvic floor and pain mechanisms with a model, and assess breathing, posture, hip and abdominal wall function externally. When she wants an internal assessment we schedule it with her sister present if she chooses, with a chaperone offered, and with a clinician of the gender she prefers."
            ),
            part(
              "Environment and communication",
              "Adapts the environment and language: private room, door control, gown and draping that keep her covered, predictable narration before each touch, plain language checked for understanding given her second language, honouring the sister's presence, and watching for signs of dissociation or distress with a plan to pause.",
              "A private room with the door locked from inside, her sister seated where she can see her, a gown and drape so nothing is uncovered unexpectedly, and me narrating before any touch. I use plain words, check understanding by asking her to tell me the plan back, and offer the interpreter again for the consent conversation. If she goes quiet or distant we stop, breathe, and she decides what happens next."
            ),
            part(
              "Documentation",
              "Documents the disclosure minimally and respectfully (history of trauma, no details, patient's stated preferences), the consent discussion and her choices, and the plan, so that the next clinician does not re-ask; flags the chart appropriately without stigmatising language.",
              "The note records 'history of sexual trauma disclosed; patient asks not to discuss details', her preferences (sister present, clinician gender, signal to stop), that internal examination was offered and deferred by her choice, and the plan. Nothing more about the trauma is written, and the chart is flagged so she is never asked to repeat it."
            ),
          ],
        },
      ],
    },
  ],
};
