import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-152: ABPTS Oncologic Clinical Specialist (ABPTSONC), authored labs.
//
// Aligned to the ABPTS oncology examination outline (knowledge 15%,
// professional roles 16%, examination 23%, evaluation/diagnosis/prognosis
// 14%, intervention 27%, outcomes 5%; seed/tracks/pt-abpts.ts). Density
// (hybrid, docs/labs.md): 1/2/2/1/3/1 = 10. Case labs carry the specialist
// reasoning the exam tests (screen for red flags, decide safety to proceed,
// progress or refer); build labs produce one artifact (a surveillance plan,
// an exercise prescription, a volume calculation).
//
// Sources checked 2026-11-07 (exam outline first; every value below names
// the source it rests on):
//   OUTLINE   ABPTS, Specialist Certification Examination Outline: Oncology
//             https://specialization.apta.org/become-a-specialist/oncology/specialist-certification-examination-outline-oncology
//   MALTSER   Maltser et al., "A Focused Review of Safety Considerations in
//             Cancer Rehabilitation", PM&R 2017 (PMC5627359): platelet,
//             hemoglobin and ANC tiers; Mirels score; Harrington criteria;
//             bone-metastasis precautions.
//             https://pmc.ncbi.nlm.nih.gov/articles/PMC5627359
//   BCRL-CPG  Davies et al., "Interventions for Breast Cancer-Related
//             Lymphedema", APTA Academy of Oncologic PT CPG, Phys Ther 2020
//             (PMC7412854): surveillance schedule, stage-based treatment,
//             exercise after surgery, home programme.
//             https://pmc.ncbi.nlm.nih.gov/articles/PMC7412854/
//   LYMDX-CPG Levenhagen et al., "Diagnosis of Upper Quadrant Lymphedema
//             Secondary to Cancer", APTA Oncology Section CPG, Phys Ther
//             2017: L-Dex >7.1 (no baseline) or +10 over baseline; volume
//             difference >=200 mL or ratio >1.04 rules in; same method each
//             time. https://guidelinecentral.com/guideline/8542
//   CRF-CPG   Fisher et al., "Screening and Assessment of Cancer-Related
//             Fatigue", Phys Ther 2022: A-rated screen EORTC QLQ-C30;
//             A-rated assessments Piper Fatigue Scale-Revised, FACIT-Fatigue,
//             PROMIS Fatigue-SF. https://ecommons.udayton.edu/dpt_fac_pub/110
//   ACSM-2019 Campbell et al., "Exercise Guidelines for Cancer Survivors",
//             Med Sci Sports Exerc 2019, doi:10.1249/MSS.0000000000002116,
//             with the prescription as restated in Schmitz et al., CA Cancer
//             J Clin 2019: moderate aerobic 3x/week about 30 min, resistance
//             2x/week 20-30 min, 8-15 reps, 2 sets, one exercise per major
//             muscle group; resistance training safe with or at risk of BCRL.
//             https://pure.psu.edu/en/publications/exercise-guidelines-for-cancer-survivors-consensus-statement-from/
//             https://escholarship.org/content/qt8n35z4tg/qt8n35z4tg.pdf
//   FACIT-F   Cella et al. 2002 (J Pain Symptom Manage) clinically important
//             difference of 3 points on FACIT-Fatigue, as cited in J Patient
//             Rep Outcomes 2023. https://jpro.springeropen.com/counter/pdf/10.1186/s41687-023-00609-4.pdf
//   NICE-MSCC NICE QS56 / NG234 (2023): features of spinal metastases and
//             cord compression; whole-spine MRI within 24 hours when
//             neurological symptoms or signs are present.
//             https://www.nice.org.uk/guidance/QS56/chapter/quality-statement-3-imaging-for-adults-with-suspected-metastatic-spinal-cord-compression
//   ISL       International Society of Lymphology consensus staging (0, I,
//             II, III) and severity by volume excess (<20%, 20-40%, >40%).
//             https://www.eurolymphology.org/international-guidelines-on-lymphedema-and-lymphatic-desorders/3
//   ASCO-CIPN ASCO 2020 CIPN guideline (Loprinzi et al.): no agent for
//             prevention; duloxetine the only treatment agent with evidence;
//             clinicians weigh delaying, reducing or stopping chemotherapy
//             for intolerable neuropathy or functional impairment.
//             https://ace.asco.org/guidelines/9541
// Values also present in the track's own objectives (febrile neutropenia
// temperatures and ANC bands, cord-compression presentation, Stemmer sign)
// were verified there on 2026-11-04 against the sources tagged in
// seed/tracks/pt-abpts.ts.
//
// SAFETY: every patient is fictional; exam practice, not clinical guidance.
// Thresholds are the published guideline values named above; facilities and
// oncology teams set their own, and the rubrics accept "per the oncology
// team's parameters" wherever practice varies. All needs_expert_review until
// a board-certified oncologic physical therapist approves it (docs/labs.md).

export const ABPTSONC_LABS: SeedLabSet = {
  trackCode: "ABPTSONC",
  sources: [source("https://specialization.apta.org/become-a-specialist/oncology/specialist-certification-examination-outline-oncology", "exam_outline", "2026-11-07")],
  labs: [
    // ----------------------------------------------------------------- Knowledge (1)
    {
      slug: "onc-lab-values-exercise-clearance",
      objective: "Laboratory values, bone metastasis and other precautions that govern exercise safety in oncology",
      kind: "build",
      title: "Clear or modify today's session from the morning labs",
      brief:
        "Three fictional inpatients on a hematology-oncology unit are on your list this morning. Patient A, 58, day 10 after induction chemotherapy for acute myeloid leukemia: platelets 24,000/uL, hemoglobin 8.9 g/dL, ANC 0.3 x 10^9/L, afebrile, no bruising. Patient B, 66, with multiple myeloma: platelets 62,000/uL, hemoglobin 10.8 g/dL, ANC 1.8 x 10^9/L, a known lytic lesion in the left femoral shaft with new pain on weight bearing. Patient C, 44, between cycles for lymphoma: platelets 135,000/uL, hemoglobin 11.6 g/dL, ANC 1.2 x 10^9/L, feels well. Each had a physician order for physical therapy yesterday.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each patient, write the session you will run (or hold) and the lab or lesion fact that decides it.",
          parts: [
            part(
              "Patient A",
              "Keeps activity to walking and light activities of daily living (no resistive or strenuous exercise) because platelets are below 30,000 and near 20,000; adds fall precautions; applies neutropenic precautions per facility policy for the ANC below 0.5; monitors symptoms and vital signs for the anemia; checks transfusion status and the team's parameters.",
              "Low-level session only: supervised walking and light ADL practice, no resistive or strenuous work, because platelets are 24,000 -- below the 30,000 band for moderate and resistive exercise and close to 20,000, where activity is walking and ADLs. Fall precautions (bleeding risk). ANC 0.3 means neutropenic precautions per unit policy and stopping for fatigue, dizziness or malaise. Hemoglobin 8.9 is anemic: baseline vital signs, symptom-limited pacing. Confirm the team's transfusion plan before progressing."
            ),
            part(
              "Patient B",
              "Allows progressive aerobic and resistive exercise from the platelet count (above 50,000) but protects the left femur: no manual muscle testing or progressive resistance through that limb, offload with an assistive device, treat new functional pain as a fracture warning and report it for imaging/orthopaedic review (Mirels or Harrington assessment) before weight-bearing progression.",
              "Blood counts allow progressive aerobic and resistance work (platelets 62,000, ANC normal), but the femoral lesion sets the limits: no manual muscle testing or resistive exercise through the left leg, protected weight bearing with a walker or crutches, and the new pain on loading is functional pain -- the best single predictor of pathological fracture -- so I hold lower-limb loading and ask the team for imaging and an orthopaedic fracture-risk assessment (Mirels score) today."
            ),
            part(
              "Patient C",
              "Proceeds with the planned individualized aerobic and resistance programme with symptom-based monitoring, noting mild thrombocytopenia (below 150,000) and mild neutropenia (ANC below 1.5) warrant symptom monitoring and infection precautions per facility rather than restriction.",
              "Proceed with the planned programme: moderate aerobic work and resistance training as tolerated. Platelets 135,000 are only mildly low (monitor for bleeding symptoms), ANC 1.2 is mild neutropenia (hand hygiene and facility precautions, screen for fever), hemoglobin 11.6 is near the anemia line, so use perceived exertion and watch symptoms."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Professional roles (2)
    {
      slug: "onc-prospective-surveillance-plan",
      objective: "Support prospective surveillance for breast cancer lymphedema: a preoperative baseline, then bioimpedance or volume checks every 3 months in year one and twice a year for up to 5 years",
      kind: "build",
      title: "Design a prospective surveillance pathway for a breast programme",
      brief:
        "A fictional regional cancer centre, Larkspur Breast Health, asks its oncologic physical therapist to write the lymphedema surveillance pathway for patients having axillary surgery. About 180 patients a year have sentinel node biopsy and 40 have axillary lymph node dissection; roughly half of each group also have regional radiation. The centre owns one bioimpedance spectroscopy device and tape measures; staff time is limited. The surgeons want to know when a patient should be referred for treatment and what that treatment would be, so that the pathway is not just a measurement schedule.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the pathway: schedule, measurement method, trigger for action, and the first-line response.",
          parts: [
            part(
              "Schedule",
              "Starts with a preoperative baseline, then measures every 3 months through the first postoperative year, then twice a year for up to 5 years, prioritising the higher-risk group (axillary dissection, especially with radiation) where capacity is limited.",
              "Baseline before surgery for everyone having axillary surgery. Then every 3 months for the first year and every 6 months to year 5 (the guideline's surveillance schedule). If staffing forces a choice, the dissection-plus-radiation group gets the full schedule first."
            ),
            part(
              "Measurement method",
              "Chooses bioimpedance (L-Dex) with a preoperative baseline and/or circumferential measures converted to volume, and insists on the same method at every visit because methods are not interchangeable.",
              "Bioimpedance spectroscopy against each patient's own baseline, with circumferences at fixed intervals converted to limb volume as the second method. Whichever is used at baseline is used at every follow-up; switching methods makes the trend meaningless."
            ),
            part(
              "Trigger",
              "Names a trigger consistent with the diagnostic guideline: an L-Dex rise of more than 10 above baseline (or above 7.1 with no baseline), or a volume difference of 200 mL or more or a ratio above 1.04, or patient-reported heaviness, tightness or swelling.",
              "Act on any of: L-Dex more than 10 points above the patient's baseline (or above 7.1 if no baseline was taken), inter-limb volume difference of 200 mL or more or a ratio above 1.04, or the patient reporting heaviness, tightness or swelling even when the numbers are under threshold."
            ),
            part(
              "First-line response",
              "Describes stage 0 / subclinical care per the CPG: education, self-massage and a fitted compression garment, with escalation to complete decongestive therapy if it persists or progresses, and that this is the referral to the physical therapist.",
              "Subclinical findings trigger a referral to physical therapy for education, self-massage, a fitted compression garment and a review of the exercise programme; if swelling persists or progresses on re-measurement, step up to complete decongestive therapy. Document and report back to the surgeon."
            ),
          ],
        },
      ],
    },
    {
      slug: "onc-fatigue-screen-and-assess",
      objective: "Use the cancer-related fatigue guideline's A-rated tools, such as the EORTC QLQ-C30 screen and the Piper, FACIT-Fatigue and PROMIS Fatigue-SF assessments, and pick consistent tools across survivorship care",
      kind: "build",
      title: "Choose the fatigue tools for a survivorship clinic",
      brief:
        "A fictional survivorship clinic sees three groups: patients mid-chemotherapy for colorectal cancer, patients one year past treatment for breast cancer returning to work, and patients with metastatic prostate cancer on long-term hormonal therapy. The clinic currently asks \"Are you tired?\" and records yes or no. The medical director wants a two-step approach -- a quick screen for everyone, a fuller assessment for those who screen positive -- using tools the APTA oncology fatigue guideline rates highest, and wants the same tools used at every visit so that change can be tracked.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the two-step fatigue measurement plan and the rule for tracking change.",
          parts: [
            part(
              "Screen",
              "Selects the EORTC QLQ-C30 (the guideline's A-rated screen) for all patients at every visit, and says why a yes/no question is not enough (no severity, no change detection).",
              "Every patient completes the EORTC QLQ-C30 at each visit; it is the only screen the guideline rates A. A yes/no question cannot show severity or change, so it cannot trigger or track care."
            ),
            part(
              "Assessment",
              "Picks one A-rated assessment -- FACIT-Fatigue, Piper Fatigue Scale-Revised or PROMIS Fatigue short form -- for patients who screen positive, with a reason tied to the population or burden (brevity for patients mid-chemotherapy, multidimensional detail where the cause is being worked up).",
              "Those who screen positive complete the FACIT-Fatigue (13 items, quick for patients mid-chemotherapy); where we need a multidimensional picture (behavioural, affective, sensory, cognitive) the Piper Fatigue Scale-Revised is the alternative, and PROMIS Fatigue-SF where the electronic record already uses PROMIS. All three are A-rated."
            ),
            part(
              "Tracking rule",
              "Fixes the same instrument across the continuum for each patient, and states that responsiveness evidence is limited so change is interpreted with a known clinically important difference (for example about 3 points on FACIT-Fatigue) and the clinical picture, not alone.",
              "Once a patient is assigned an assessment it is never swapped, so scores can be compared. For FACIT-Fatigue a change of about 3 points is the published clinically important difference; because the guideline notes the responsiveness evidence is still thin, a score change is read alongside function and the treatment phase, not on its own."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Examination (2)
    {
      slug: "onc-new-back-pain-prostate-cancer",
      objective: "Screening for red flags: metastatic disease, spinal cord compression, deep vein thrombosis, febrile neutropenia",
      kind: "case",
      title: "New back pain in a man with prostate cancer",
      brief:
        "A fictional 71-year-old man with prostate cancer treated with androgen deprivation therapy is referred to outpatient physical therapy for \"mechanical low back pain\" after lifting a suitcase three weeks ago. He has thoracolumbar pain rated 6/10 that is now constant, wakes him at night, and is worse when he coughs. He walks in unaided and has no leg symptoms at the first visit.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At the initial examination, lumbar flexion and extension both reproduce the pain; there is tenderness over T11-L1; lower-limb strength, sensation and reflexes are normal; he denies bladder or bowel change.",
          ask: "What is the differential and what do you do with this visit?",
          parts: [
            part(
              "Differential and reasoning",
              "Places spinal metastasis high on the differential because of the cancer history (prostate is a common source of bone metastasis) and the pain features -- constant, progressive, night pain disturbing sleep, worse with coughing, thoracolumbar tenderness -- rather than accepting a mechanical diagnosis.",
              "A cancer history plus constant, progressive pain that wakes him, is worse with coughing and is tender over the thoracolumbar junction fits spinal metastases, not a lifting strain. Prostate cancer commonly spreads to bone. Mechanical pain stays on the list but is not the working diagnosis."
            ),
            part(
              "Action today",
              "Does not start loading-based treatment; contacts the oncology or referring physician the same day for urgent evaluation and imaging (spinal metastases suspected without cord compression signs), documents the neurological baseline, and teaches him the warning signs that require emergency care.",
              "No manipulation or loading programme today. I call the oncologist/referrer the same day to report suspected spinal metastases and request urgent imaging; record today's normal neurological baseline so change is measurable; and tell him exactly which symptoms mean go to the emergency department (leg weakness or numbness, unsteady walking, bladder or bowel change)."
            ),
          ],
        },
        {
          text: "Four days later he phones: since yesterday his legs feel heavy and numb, he has stumbled twice on stairs, and this morning he could not start his urine stream.",
          ask: "What is happening and what must happen now?",
          parts: [
            part(
              "Recognition",
              "Identifies probable metastatic spinal cord compression from the new bilateral leg weakness and sensory change, gait disturbance and urinary retention, and treats it as an oncological emergency.",
              "This is metastatic spinal cord compression until proven otherwise: new bilateral leg heaviness and numbness, gait disturbance and urinary retention on top of thoracolumbar metastatic-type pain."
            ),
            part(
              "Action",
              "Directs him to emergency care now (not a clinic appointment), contacts the oncology team or the MSCC coordinator, and expects whole-spine MRI within 24 hours and spinal precautions (flat bed rest / log roll per the team) until stability is confirmed.",
              "Tell him to go to the emergency department now, by ambulance if he cannot walk safely, and call the oncology team / MSCC coordinator so they expect him. With neurological signs the guideline standard is whole-spine MRI within 24 hours; he should be kept flat with spinal precautions until the team says the spine is stable. Physical therapy resumes only on the team's instructions."
            ),
          ],
        },
      ],
    },
    {
      slug: "onc-limb-volume-from-circumferences",
      objective: "Calculate limb volume from circumferential measures: a difference of 200 mL or more, or a ratio over 1.04, helps rule lymphedema in but a smaller difference can't rule it out; use the same method every time",
      kind: "build",
      title: "Convert circumferences to limb volume and decide",
      brief:
        "A fictional 52-year-old woman, 14 months after right mastectomy with axillary dissection and radiation, reports her right forearm feels tight. No preoperative baseline exists. You take circumferences with a tape every 10 cm from the ulnar styloid toward the axilla, four segments per arm, each segment treated as a truncated cone: volume = h x (C1^2 + C1 x C2 + C2^2) / (12 x pi), with h = 10 cm and circumferences in cm, giving mL. Right arm: 17.0, 21.0, 25.0, 28.0, 30.0 cm. Left arm: 16.0, 19.5, 23.0, 26.0, 28.5 cm. She is right-hand dominant.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate both arm volumes, compare them against the guideline thresholds, and state what you conclude and record.",
          parts: [
            part(
              "Volumes",
              "Computes each arm's volume correctly within rounding: right about 1,939 mL (segments about 288, 422, 559, 670), left about 1,681 mL (segments about 252, 360, 478, 591).",
              "Right: 288.3 + 422.0 + 559.4 + 669.5 = about 1,939 mL. Left: 251.5 + 360.2 + 478.3 + 591.3 = about 1,681 mL."
            ),
            part(
              "Comparison to thresholds",
              "Finds a difference of about 258 mL and a ratio of about 1.15, both above the rule-in thresholds (200 mL or more; ratio above 1.04), and notes the excess (about 15%) sits in the ISL minimal (<20%) severity band.",
              "Difference 1,939 - 1,681 = about 258 mL, above the 200 mL threshold; ratio 1,939 / 1,681 = about 1.15, above 1.04. Both rule lymphedema in. The excess is 258 / 1,681 = about 15%, which the ISL severity grading calls minimal (under 20%)."
            ),
            part(
              "Conclusion and method note",
              "Concludes upper-extremity lymphedema is likely (with tightness and the risk history) and records the method, segment positions and landmarks so the same method is repeated; mentions that hand dominance can add a small normal asymmetry but not this much, and that without a baseline bioimpedance would use the 7.1 L-Dex cutpoint if used.",
              "Record: probable right upper-extremity lymphedema, ISL stage I-II to be confirmed on examination (pitting, elevation response), minimal severity by volume. Document landmarks, 10 cm intervals and the frustum formula so every follow-up uses the identical method -- methods are not interchangeable. Dominance explains only a small asymmetry, not 258 mL. If bioimpedance is added, with no baseline the cutpoint is an L-Dex above 7.1."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Evaluation, diagnosis, prognosis (1)
    {
      slug: "onc-bone-metastasis-fracture-risk",
      objective: "Weigh pathologic fracture risk in bone metastasis (about 8% of patients sustain one) and know impending or actual fractures usually get fixed surgically with chemotherapy or radiotherapy",
      kind: "case",
      title: "A femoral lesion and a goal of walking the dog",
      brief:
        "A fictional 63-year-old woman with metastatic breast cancer is referred to outpatient physical therapy for deconditioning. Imaging two weeks ago showed a lytic lesion in the right proximal femur (peritrochanteric region) measuring about half the bone's diameter; she has not seen orthopaedics. Her goal is to walk her dog 20 minutes a day. Her blood counts are acceptable for exercise.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She reports right hip and thigh pain of 3/10 at rest that rises to 7/10 when she walks or climbs stairs and eases with sitting. She walks in with an antalgic gait and no assistive device.",
          ask: "Estimate the fracture risk and decide what today's plan is.",
          parts: [
            part(
              "Risk estimate",
              "Scores or reasons through Mirels: peritrochanteric site (3), functional pain (3), lytic lesion (3), size about half the diameter (2) = about 11, well above the 9 that indicates prophylactic fixation; identifies functional pain as the strongest single predictor.",
              "Mirels: site peritrochanteric = 3, pain functional (mechanical, with weight bearing) = 3, lesion lytic = 3, size one-third to two-thirds of the diameter = 2. Total about 11 -- a score of 9 or more indicates prophylactic fixation. Functional pain alone is the best single predictor of pathological fracture, so this is an impending fracture until orthopaedics says otherwise."
            ),
            part(
              "Today's plan",
              "Does not progress gait or lower-limb loading; fits a walker or crutches to offload the right leg, no manual muscle testing or resistive exercise through the right hip, avoids twisting on the leg, and contacts the oncology team / orthopaedic oncology the same day for review of prophylactic fixation (and radiation as the team decides).",
              "No walking programme today. Fit a walker (or crutches) for protected weight bearing on the right, teach safe transfers that avoid pivoting on the leg, no manual muscle testing or resistive work through the right hip, and call the oncologist today to request urgent orthopaedic oncology review for prophylactic fixation. Upper-body and seated conditioning can continue. Tell her that increasing pain, a snap or inability to bear weight means emergency care."
            ),
          ],
        },
        {
          text: "She has an intramedullary nail placed, followed by a course of radiation to the hip. Six weeks after surgery the surgeon clears her for weight bearing as tolerated and writes \"PT -- progress to community ambulation\".",
          ask: "Write the progression toward her goal and the precautions that remain.",
          parts: [
            part(
              "Progression",
              "Progresses from the current device toward unaided walking using pain and gait quality as the criteria, builds walking duration gradually toward 20 minutes (for example in bouts), adds hip and knee strengthening within the surgeon's limits, and monitors for post-radiation skin and fatigue effects.",
              "Start with the walker over the first sessions, step down to a cane and then unaided as gait normalises without pain. Build walking in bouts (for example 3 x 7 minutes) toward one continuous 20-minute dog walk, adding closed-chain hip and knee strengthening within the surgeon's limits, and checking the irradiated skin and her fatigue each visit."
            ),
            part(
              "Precautions that remain",
              "Keeps metastatic-bone precautions beyond the fixed site: other lesions may exist, so no high-impact loading or heavy resistance, no manual muscle testing against a known lesion, watch for new functional pain anywhere and report it, and coordinate with the oncology team on systemic treatment and bone-health drugs.",
              "The nail protects that femur, not her skeleton. No jumping, running or heavy resistance; no manual muscle testing over known lesions; any new pain on loading elsewhere -- spine, pelvis, the other hip -- stops that activity and is reported for imaging. Keep the oncology team informed and ask about bone-modifying therapy."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Intervention and instruction (3)
    {
      slug: "onc-exercise-prescription-during-chemo",
      objective: "Exercise prescription during and after treatment, including dosing with low blood counts, bone metastasis and cardiotoxicity",
      kind: "build",
      title: "Write a FITT prescription for a patient mid-chemotherapy",
      brief:
        "A fictional 49-year-old woman is in cycle 3 of 6 of anthracycline-containing chemotherapy for stage II breast cancer after lumpectomy and sentinel node biopsy (surgery was 10 weeks ago). Her main complaint is fatigue that keeps her off work. Today's labs: platelets 148,000/uL, hemoglobin 10.9 g/dL, ANC 1.6 x 10^9/L. Resting heart rate 92, blood pressure 118/74. The oncologist asks for a supervised exercise programme and wants to know what you will monitor given the cardiotoxic regimen.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the prescription as frequency, intensity, time and type for both aerobic and resistance training, and the monitoring plan.",
          parts: [
            part(
              "Aerobic prescription",
              "Prescribes moderate-intensity aerobic exercise about 3 times a week for about 30 minutes (in bouts if needed), using perceived exertion or the talk test rather than a fixed heart-rate target because heart rate is unreliable during anthracycline treatment and anemia, consistent with the ACSM 2019 consensus dose for fatigue.",
              "Aerobic: 3 days a week, moderate intensity judged by perceived exertion (about 12-14 of 20) or the talk test, about 30 minutes a session, split into 10-minute bouts on low days; walking or stationary cycling. Heart-rate targets are avoided because anemia and the cardiotoxic regimen make heart rate unreliable."
            ),
            part(
              "Resistance prescription",
              "Prescribes resistance training 2 days a week, one exercise per major muscle group, about 8-15 repetitions for 2 sets, starting low and progressing slowly, noting that the surgery was over a month ago so resistance is appropriate and that supervised individualized resistance training is safe for a patient at risk of lymphedema.",
              "Resistance: 2 non-consecutive days a week, one exercise per major muscle group, 2 sets of 8-15 repetitions with small progressive increases, 20-30 minutes. Surgery was more than a month ago, so resistance work is appropriate; supervised, individualized resistance training is safe for someone at risk of lymphedema, and arm symptoms are checked each session."
            ),
            part(
              "Monitoring",
              "Monitors at least weekly at first: fatigue, perceived exertion, blood pressure and heart rate response, symptoms of cardiotoxicity (new dyspnea, orthopnea, oedema, palpitations, reduced tolerance) to report to oncology, blood counts before cycles (with the platelet/ANC/hemoglobin tiers), and arm swelling or heaviness; adjusts dose around infusion days.",
              "Weekly check-ins at first: fatigue score, exertion ratings, resting and exercise blood pressure and heart rate, and cardiotoxicity warning signs -- new breathlessness, orthopnea, ankle swelling, palpitations or a drop in tolerance -- which go straight to the oncologist. Review each cycle's labs: platelets stay above 50,000 for resistance work, symptom-based pacing if hemoglobin falls, neutropenic precautions if ANC drops below 0.5. Ask about arm heaviness or swelling. Lighter sessions in the days after infusion."
            ),
          ],
        },
      ],
    },
    {
      slug: "onc-cdt-phase-one-to-home",
      objective: "Complete decongestive therapy and long-term management of lymphedema",
      kind: "case",
      title: "From intensive decongestion to a home programme",
      brief:
        "A fictional 60-year-old woman has stage II left arm lymphedema three years after breast cancer treatment with axillary dissection and radiation. Her left arm is about 28% larger than the right, pits on pressure, and does not reduce overnight; the skin is intact. She lives alone, works as a cashier, and has good hand function. There is no sign of infection and no recurrence on recent oncology review.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She has had no treatment for the swelling before. Her insurance covers daily visits for three weeks.",
          ask: "Plan the intensive phase.",
          parts: [
            part(
              "Phase I plan",
              "Prescribes complete decongestive therapy for stage II: multilayer short-stretch compression bandaging and exercise as the key components, skin care, with manual lymphatic drainage (noting MLD may be shortened or omitted with similar long-term results), about 5 days a week for at least 3 weeks, measuring volume with one consistent method.",
              "Phase I CDT, daily for the three weeks: short-stretch multilayer bandaging worn between sessions, decongestive exercise in the bandages with diaphragmatic breathing and proximal-to-distal sequencing, meticulous skin care, and manual lymphatic drainage -- the guideline says MLD can be shortened or dropped with similar long-term volume results, so bandaging and exercise are the parts that cannot be cut. Volume by the same circumferential method at each week's end."
            ),
            part(
              "What stays off the plan",
              "Rejects kinesiotape as a replacement for bandaging in stage II, does not rely on acupuncture for volume, and defers garment fitting until volume plateaus.",
              "Kinesiotape cannot replace short-stretch bandaging at stage II; acupuncture has no evidence for volume; a compression garment is fitted only when the volume has plateaued, not now."
            ),
          ],
        },
        {
          text: "After three weeks the excess volume has fallen from about 28% to about 12% and has been stable for the last four days. Her visits end on Friday.",
          ask: "Write the home programme and the follow-up.",
          parts: [
            part(
              "Home programme",
              "Transitions to phase II per the CPG: an individually fitted daytime compression garment, self-MLD, nightly compression if indicated (bandaging or a night garment), continued exercise, skin care and infection awareness, with instruction tailored to her living alone and standing at a till.",
              "Fit a daytime garment now that volume is stable; teach self-MLD; night compression (self-bandaging or a night garment) because she is alone and the arm rebounds overnight; keep the exercise programme including during her shifts; skin care and a plan for any redness, heat or fever (possible cellulitis -- seek care same day)."
            ),
            part(
              "Follow-up",
              "Schedules volume monitoring with the same measurement method, re-fits the garment as the limb changes, and names escalation back to phase I if volume rises; considers intermittent pneumatic compression as a home-phase option.",
              "Review at 4-6 weeks then every few months, measuring volume the same way each time; replace garments when they lose compression; a sustained rise sends her back to a short course of bandaging. Intermittent pneumatic compression may be considered as a home adjunct if she struggles with self-care."
            ),
          ],
        },
      ],
    },
    {
      slug: "onc-cipn-falls-case",
      objective: "Management of cancer-related fatigue, neuropathy, pain and radiation fibrosis",
      kind: "case",
      title: "Numb feet, two falls, and chemotherapy still to come",
      brief:
        "A fictional 67-year-old man is in cycle 5 of oxaliplatin-based chemotherapy for colon cancer. He is referred for \"unsteadiness\". He reports numbness and tingling in both feet to the ankles for six weeks, trouble feeling the pedals when driving, and two falls in the dark at home. He has no back pain, no bladder or bowel change, and no weakness he is aware of.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Examination: reduced vibration sense at both great toes, reduced sensation to monofilament over both soles, intact proprioception at the ankles, ankle reflexes absent, strength 5/5 throughout, Romberg positive with eyes closed, slow tandem gait with two side-steps.",
          ask: "What is the diagnosis, how do you quantify it, and what do you tell the oncology team?",
          parts: [
            part(
              "Diagnosis and measures",
              "Identifies a length-dependent sensory peripheral neuropathy consistent with chemotherapy-induced peripheral neuropathy (oxaliplatin), confirms it is symmetrical and sensory with no cord-compression features, and quantifies with a standardised neuropathy scale plus balance and gait measures (for example a clinician-graded neuropathy score, Romberg/modified CTSIB, timed tandem or gait speed, a validated balance test) and a patient-reported neuropathy or function measure.",
              "A symmetric, length-dependent sensory neuropathy -- chemotherapy-induced from oxaliplatin -- with absent ankle reflexes and reduced vibration and protective sensation, no cord signs. Quantify with a graded neuropathy score (sensory symptoms and signs), the modified CTSIB and a timed balance measure, gait speed and tandem gait, and a patient-reported neuropathy/function questionnaire, so change can be shown."
            ),
            part(
              "Communication to oncology",
              "Reports the functional impact (falls, unsafe driving) to the oncologist promptly because the ASCO guideline asks clinicians to weigh delaying, reducing, substituting or stopping the neurotoxic agent for intolerable neuropathy or functional impairment; does not advise on medication beyond noting duloxetine is the one agent with evidence for painful CIPN, for the team to consider.",
              "Same-week message to the oncologist: new sensory neuropathy with two falls and impaired driving -- functional impairment that the ASCO guideline says should prompt a decision about delaying, reducing or stopping oxaliplatin. Drug decisions are theirs; I note that duloxetine is the only agent with guideline evidence for painful CIPN, and that nothing is recommended to prevent it."
            ),
          ],
        },
        {
          text: "The oncologist reduces the oxaliplatin dose and asks you to \"keep him on his feet\" through the remaining cycles. He is motivated and lives with his wife in a two-storey house.",
          ask: "Design the intervention and the safety plan.",
          parts: [
            part(
              "Intervention",
              "Prescribes progressive balance and sensorimotor training (static to dynamic, eyes open to closed, firm to compliant surfaces, dual-task), gait training with attention to foot clearance, lower-limb strengthening, and keeps aerobic conditioning for fatigue within lab and symptom limits.",
              "Balance training 2-3 times a week progressing from firm-surface stance to foam, eyes closed, head turns and stepping tasks, plus tandem and obstacle walking with cues for foot clearance; ankle and hip strengthening; continued moderate aerobic work for fatigue, scaled to each cycle's labs and symptoms."
            ),
            part(
              "Safety plan",
              "Addresses falls and skin: night lighting and clear paths, firm supportive shoes indoors, daily foot inspection because protective sensation is reduced, no barefoot walking, a stair rail check, a decision about driving referred to the physician, and clear instructions for new weakness or spreading symptoms.",
              "Night lights on the route to the bathroom and stairs, both rails checked, shoes indoors and never barefoot, daily foot checks for blisters or wounds he cannot feel, hot-water care, and a frank note to the physician about driving fitness. New weakness, spreading numbness above the knees or hand involvement is reported before the next cycle."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Outcomes (1)
    {
      slug: "onc-outcome-set-for-two-patients",
      objective: "Outcome measures for fatigue, function, lymphedema and quality of life in oncology",
      kind: "build",
      title: "Choose outcome measures and name meaningful change",
      brief:
        "Two fictional patients start care the same week. Patient 1: a 55-year-old woman with stage I right arm lymphedema after breast cancer treatment, FACIT-Fatigue 30/52, who wants to return to gardening. Patient 2: a 72-year-old man two months after a lobectomy for lung cancer, deconditioned, FACIT-Fatigue 22/52, who wants to walk to his grandson's school 800 m away. Your department asks every therapist to document one measure each for fatigue, function and quality of life (plus a condition-specific measure where relevant) at the start and at discharge, with the change that would count as meaningful.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the outcome set for each patient and the meaningful-change rule you will apply.",
          parts: [
            part(
              "Fatigue",
              "Keeps FACIT-Fatigue for both (an A-rated assessment already baselined), and names about 3 points as the published clinically important difference, read alongside the clinical picture because responsiveness evidence is limited.",
              "FACIT-Fatigue for both, re-administered at discharge; a rise of about 3 points is the published clinically important difference. Because the fatigue guideline notes limited responsiveness data, the number is interpreted with their function and treatment phase."
            ),
            part(
              "Function",
              "Chooses a performance measure matched to the goal -- a walk test (for example the six-minute walk test) for the lung-cancer patient, an upper-limb function measure for the gardener -- plus a patient-specific goal scale, stating that meaningful change comes from the measure's published responsiveness data or the patient's own goal.",
              "Patient 2: six-minute walk test, since his goal is an 800 m walk, plus a patient-specific functional scale rating the school walk. Patient 1: an upper-limb function questionnaire (for example the DASH or QuickDASH) and the same patient-specific scale for gardening tasks. Meaningful change is the measure's published minimal important change where one exists, and otherwise reaching the self-rated goal."
            ),
            part(
              "Lymphedema and quality of life",
              "For patient 1 tracks limb volume by the same method every time (circumferential volume or bioimpedance against baseline) and reports change in excess volume or ISL severity band; for quality of life uses a cancer-specific measure such as the EORTC QLQ-C30 or FACT family for both.",
              "Patient 1: arm volume by the identical circumferential method at every visit, reported as excess volume and percentage (minimal under 20%, moderate 20-40%, severe over 40%), and bioimpedance only if a baseline exists. Quality of life for both: the EORTC QLQ-C30 (it doubles as the fatigue screen) or the FACT questionnaire matched to the cancer, repeated at discharge."
            ),
          ],
        },
      ],
    },
  ],
};
