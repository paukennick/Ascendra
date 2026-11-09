import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-152: ABPTS Wound Management Clinical Specialist (ABPTSWMS), authored
// labs.
//
// Aligned to the ABPTS wound management examination outline (foundation
// sciences 10%, behavioral sciences 5%, wound clinical sciences 12%,
// clinical inquiry and professional roles 10%, examination and evaluation
// 25%, diagnosis and prognosis 18%, interventions and outcomes 20%;
// seed/tracks/pt-abpts.ts). Density (hybrid, docs/labs.md):
// 1/1/2/2/2/2/2 = 12. Current classification systems are used throughout:
// NPIAP pressure injury staging (2016 definitions), the SVS WIfI threatened
// limb classification by name and structure, and etiology-based
// differentiation of leg ulcers.
//
// Sources checked 2026-11-07:
//   OUTLINE   ABPTS, Specialist Certification Examination Outline: Wound
//             Management
//             https://specialization.apta.org/become-a-specialist/wound-management/specialist-certification-examination-outline-wound-management
// Every clinical value in these labs is one the track's own objectives
// already carry, verified there on 2026-11-04 against the sources tagged in
// seed/tracks/pt-abpts.ts: NPIAP staging definitions, deep tissue pressure
// injury, unstageable and medical-device-related injury, Braden's six
// subscales, individualized repositioning and silicone foam dressings
// (SP-PI); venous and arterial ulcer features, about 20% of venous ulcers
// with coexisting arterial disease, high compression to knee height, 20 mm
// Hg or less while vascular testing is pending, no compression with ABPI
// under 0.5, heart failure or thrombosis, biopsy for atypical ulcers
// (SP-VLU); ABI method (highest ankle pressure over the higher brachial,
// both arms), falsely high readings in calcified vessels, toe-brachial index
// and Doppler waveforms, ankle pressure under 50 mm Hg or ABI under 0.5 as
// poor-healing signs, probe-to-bone, Charcot signs, total contact casting
// and 3 months of offloading after closure, WIfI's three components scored
// 0-3 and grouped into stages 1-4 (SP-PAD, SP-NIPAD, SP-DFU, DFU-CPG);
// NPWT at about 125 mm Hg, debride and treat infection first, not over
// malignancy, protect vessels and bowel, never directly over a fistula
// (SP-NPWT); debridement methods including autolytic as most conservative
// and larval therapy (SP-DEB); dressing selection by exudate (SP-DRESS);
// calciphylaxis and pyoderma gangrenosum with pathergy (SP-CALC, SP-PG);
// smoking's carbon monoxide effect and diabetes' effect on immunity
// (SP-IWH); and the APTA DFU guideline's exercise recommendations
// (DFU-CPG). No ABI normal range, compression pressure in mm Hg beyond the
// 20 mm Hg holding level, nutrition kcal/protein target or percentage-area-
// reduction benchmark is asserted, because none could be verified today
// (the web-search budget was exhausted) and the track itself records that
// its sources disagree on the ABI range.
//
// SAFETY: every patient is fictional; exam practice, not clinical guidance.
// Sharp debridement, compression and offloading are written as decisions
// within the physical therapist's scope and the team's orders. All
// needs_expert_review until a board-certified wound management physical
// therapist approves it (docs/labs.md).

export const ABPTSWMS_LABS: SeedLabSet = {
  trackCode: "ABPTSWMS",
  sources: [source("https://specialization.apta.org/become-a-specialist/wound-management/specialist-certification-examination-outline-wound-management", "exam_outline", "2026-11-07")],
  labs: [
    // ----------------------------------------------------------------- Foundation sciences (1)
    {
      slug: "wms-npwt-candidate-selection",
      objective: "Physical agents in wound care: electrical stimulation, ultrasound, negative-pressure wound therapy and their mechanisms",
      kind: "build",
      title: "Decide which wounds get negative pressure, and set it up safely",
      brief:
        "Three fictional inpatients are proposed for negative pressure wound therapy by the surgical team. Wound 1: a dehisced abdominal incision, 9 x 4 cm, 3 cm deep, 100% red granulation, moderate serous exudate, no odour, bowel not visible. Wound 2: a stage 4 sacral pressure injury, 7 x 6 cm, with 60% adherent yellow slough and 20% black eschar, foul odour, periwound erythema spreading 3 cm, temperature 38.4 degrees C this morning. Wound 3: a non-healing ulcer over the left shin in a 74-year-old, 4 x 3 cm, with raised, rolled, pearly borders and a 7-month history despite good care; a biopsy is pending.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each wound, say whether NPWT is appropriate now and why, and for any wound you accept, describe the set-up and the mechanism you are relying on.",
          parts: [
            part(
              "Wound 1",
              "Accepts NPWT: a clean, granulating dehisced wound with moderate exudate and no exposed bowel; describes the set-up (porous foam cut to the wound without overlapping intact skin, sealed drape, suction at about 125 mm Hg or per order, periwound protection) and the mechanism (improved perfusion, removal of exudate and edema, altered wound fluid, drawing edges together).",
              "Yes. Clean red granulation, moderate exudate, no exposed viscera -- the textbook candidate. Foam trimmed to the wound bed and not over intact skin, periwound protected, airtight drape, pressure about 125 mm Hg continuous or as ordered, canister checked for volume and colour. It works by improving local perfusion, pulling off exudate and edema, changing the wound fluid environment and contracting the wound."
            ),
            part(
              "Wound 2",
              "Defers NPWT: necrotic tissue (slough and eschar) and clinical signs of infection (fever, spreading erythema, odour) must be addressed first -- debridement and treatment of infection -- before negative pressure is applied, and the team is informed of the infection signs today.",
              "Not yet. Sixty percent slough, eschar, odour, spreading erythema and a fever mean infection and necrosis: the wound needs debridement and the infection treated before any negative pressure, and the medical team needs to know about the fever and cellulitis now. Re-evaluate for NPWT once the bed is clean and the infection is controlled."
            ),
            part(
              "Wound 3",
              "Refuses NPWT: a long-standing ulcer with raised, rolled, pearly borders is suspicious for malignancy and NPWT is not applied over a possible malignancy; waits for the biopsy and refers appropriately.",
              "No. Rolled, pearly, raised edges and seven months without healing are the picture of a skin cancer until the biopsy says otherwise, and negative pressure is never applied over a suspected malignancy. Hold all adjuncts, keep a simple protective dressing, and make sure the biopsy result reaches the right referral."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Behavioral sciences (1)
    {
      slug: "wms-healing-barriers-plan",
      objective: "Nutrition, smoking, mental health and social determinants affecting healing",
      kind: "build",
      title: "Write the plan for the factors that will decide whether this wound heals",
      brief:
        "A fictional 61-year-old man has a stage 3 pressure injury over the right ischial tuberosity, 5 x 4 cm, after a prolonged hospital stay. He has type 2 diabetes (recent HbA1c 9.8%), smokes 20 cigarettes a day, has lost 6 kg in three months and says he \"doesn't bother cooking since my wife died\". He uses a wheelchair, lives alone on the second floor without a lift, and his daughter visits weekly. He has a dressing plan and a pressure-redistribution cushion, but the wound has not changed in four weeks.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the plan for the non-wound factors, naming for each why it matters to healing and what you will do.",
          parts: [
            part(
              "Smoking",
              "Explains the mechanism (carbon monoxide binds hemoglobin far more tightly than oxygen -- about 200 times -- cutting oxygen delivery to the wound, plus vasoconstriction) and acts: brief advice, referral to a cessation programme / pharmacotherapy via the physician, and a frank link between the cigarettes and the stalled wound.",
              "Twenty cigarettes a day starve the wound of oxygen: carbon monoxide binds hemoglobin about 200 times more tightly than oxygen and nicotine constricts the vessels feeding the ischium. I tell him plainly that this is one reason nothing has changed in four weeks, offer the cessation service and ask his physician about nicotine replacement or other medication."
            ),
            part(
              "Nutrition and glycemic control",
              "Flags unintentional weight loss and poor intake as malnutrition risk needing a dietitian referral and a validated screen, without inventing calorie or protein targets; explains that diabetes impairs immune function at several steps of healing so infection risk is high, and coordinates HbA1c-driven management with the physician.",
              "Six kilograms lost and no cooking means he is probably not eating enough energy or protein to build tissue: dietitian referral this week with a nutrition screen, and practical fixes (meals delivered, his daughter batch-cooking). An HbA1c of 9.8% weakens his immune response at several points in healing and makes infection likely, so I ask the physician to review his diabetes plan and we track glucose alongside the wound."
            ),
            part(
              "Mental health and social situation",
              "Screens for depression and grief after bereavement, refers to primary care or mental health, and addresses social determinants that block healing: isolation and access (second floor, no lift), caregiver capacity (daughter weekly), pressure offloading routine he can actually do, community services or home health, and a realistic self-management plan.",
              "Grief and probable depression explain the not bothering, and they also stop him doing pressure relief and eating; I screen and refer to his primary care team. Living alone on a second floor without a lift isolates him and limits care, so I request home health nursing for dressings, social work for housing and meal services, and build an offloading schedule (timed pressure relief, time off the cushion in bed) that he and his daughter agree is doable."
            ),
            part(
              "Measuring whether it worked",
              "Sets a review with measurable markers: weight and intake, smoking status, glucose/HbA1c trend, mood screen, adherence to offloading, and wound measurements at fixed intervals so that a continued stall triggers re-evaluation.",
              "Re-check in two weeks and four: weight trend and dietitian plan started, cigarettes per day, glucose log, mood screen, offloading diary, and the wound traced and measured the same way each time. If the wound is still unchanged once these are moving, we re-examine the wound itself (infection, osteomyelitis, cushion fit) rather than wait."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Wound clinical sciences (2)
    {
      slug: "wms-stage-four-pressure-injuries",
      objective: "Stage pressure injuries using the NPIAP system: stage 1 non-blanchable redness on intact skin, stage 2 partial-thickness loss or blister, stage 3 full-thickness with fat visible, stage 4 exposed muscle, tendon, ligament or bone",
      kind: "build",
      title: "Stage four pressure injuries on one ward round",
      brief:
        "On a fictional skin round you examine four patients. Patient W: sacrum, 3 x 2 cm shallow open wound with a pink-red moist bed, no slough, no fat visible, after barrier cream is removed. Patient X: right heel, intact skin with a 4 x 3 cm area of deep purple discoloration that is boggy and painful. Patient Y: left ischial tuberosity, 5 x 4 cm full-thickness wound; the base is 100% covered by adherent tan slough so you cannot see what lies beneath. Patient Z: nasal bridge under a non-invasive ventilation mask, 1 x 1 cm full-thickness wound with cartilage visible at the base.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Stage each injury with the NPIAP system, give the defining feature, and name the one management step the stage or type makes essential.",
          parts: [
            part(
              "Patient W (sacrum)",
              "Stages as stage 2: partial-thickness skin loss with a viable pink-red moist bed, no slough and no fat visible; notes the barrier cream was correctly removed before assessment; management: protect from moisture and friction, offload, moisture-balanced dressing.",
              "Stage 2 pressure injury: partial-thickness loss with a pink, moist, viable bed and no slough or visible fat -- assessed after the barrier cream was wiped off, which is required to see the skin. Keep it offloaded, control moisture and friction, and use a dressing that keeps the bed moist but not macerated."
            ),
            part(
              "Patient X (heel)",
              "Classifies as deep tissue pressure injury: intact skin with persistent deep purple or maroon discoloration, boggy and painful; management: offload the heel completely (heel suspension), protect, monitor because it may evolve to reveal the true extent.",
              "Deep tissue pressure injury: intact skin, deep purple discoloration, boggy and painful. The damage is under the surface and may declare itself as a deep wound over days. Float the heel completely off the bed with a heel-suspension device and reassess daily."
            ),
            part(
              "Patient Y (ischium)",
              "Classifies as unstageable: full-thickness loss where the base is obscured by slough (or eschar) so depth cannot be determined; management: debridement to reveal the base and allow staging (while treating infection if present), noting the exception for stable dry eschar on heels is a matter for the team's protocol.",
              "Unstageable pressure injury: full-thickness, but slough hides the base so we cannot tell whether it is stage 3 or 4. The essential step is debridement so the depth can be seen and staged, with any infection addressed alongside; once the slough is gone it is restaged."
            ),
            part(
              "Patient Z (nasal bridge)",
              "Classifies as a medical device-related pressure injury, staged by the NPIAP system as stage 4 because cartilage is exposed, and names device management (refit or change the mask interface, protective dressing under the device, pressure relief schedule) as the essential step.",
              "A medical device-related pressure injury from the ventilation mask, staged as stage 4 because cartilage is exposed. The management that matters is the device: change or refit the interface, add a protective dressing under it, and schedule relief from the mask with the respiratory team."
            ),
          ],
        },
      ],
    },
    {
      slug: "wms-leg-ulcer-etiology-triage",
      objective: "Arterial, venous and mixed vascular wounds and lymphedema-related skin change",
      kind: "build",
      title: "Name the cause of three leg ulcers from history, site and appearance",
      brief:
        "Three fictional patients attend a leg ulcer clinic. Patient 1, 68, obese, long-standing varicose veins: a shallow, irregular, exuding ulcer over the medial gaiter area, surrounded by brown-orange staining, dermatitis and a hard, woody lower leg with an inverted-champagne-bottle shape; pedal pulses are present. Patient 2, 72, smoker with diabetes: a small, deep, punched-out, dry ulcer over the lateral malleolus with a pale base, hairless shiny skin, pain at night relieved by hanging the leg out of bed; pedal pulses not palpable. Patient 3, 55, with inflammatory bowel disease: a rapidly enlarging, very painful ulcer on the anterior shin with a violaceous, undermined border that started after a minor knock and has worsened after each dressing change with debridement.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each patient name the most likely etiology, the findings that decide it, and the one examination or action that must happen before treatment starts.",
          parts: [
            part(
              "Patient 1",
              "Identifies a venous leg ulcer from the gaiter-area location, shallow exuding wound, hemosiderin staining, stasis dermatitis and lipodermatosclerosis (woody, inverted champagne bottle), with risk factors of obesity and varicose veins; names ABI (and pulse examination) before compression because about 20% of venous ulcers have coexisting arterial disease.",
              "Venous leg ulcer: gaiter area, shallow and weeping, brown staining, eczema and lipodermatosclerosis with varicose veins and obesity behind it. Before any compression goes on she needs pulses and an ankle-brachial index, because roughly one in five venous ulcers has arterial disease too."
            ),
            part(
              "Patient 2",
              "Identifies an arterial (ischemic) ulcer from the punched-out, dry, pale, deep wound at a distal/lateral site, trophic skin changes, rest pain relieved by dependency and absent pulses, with smoking and diabetes as drivers; names vascular assessment (ABI, with toe-brachial index and Doppler waveforms because diabetes may make the ABI falsely high) and vascular referral before any debridement or compression.",
              "Arterial ulcer: punched-out, dry, pale and deep over the lateral malleolus, hairless shiny skin, night pain eased by dangling the foot, no palpable pulses, in a diabetic smoker. Before anything else: ABI, and because diabetes can calcify the vessels and falsely raise it, toe pressures and Doppler waveforms, then a vascular referral. No compression and no aggressive debridement of a dry ischemic ulcer until perfusion is known."
            ),
            part(
              "Patient 3",
              "Identifies probable pyoderma gangrenosum from the painful, rapidly enlarging ulcer with a violaceous undermined border in a patient with inflammatory bowel disease, worsening with trauma and debridement (pathergy); names stopping debridement and urgent dermatology/medical referral (biopsy and immunosuppressive treatment are the team's decisions) as the action before anything else.",
              "Pyoderma gangrenosum: inflammatory bowel disease, a very painful ulcer with a purple undermined edge that started after a knock and gets worse every time it is debrided -- that is pathergy. Stop debriding it today and refer urgently to dermatology; diagnosis and immunosuppression are theirs, gentle non-adherent dressings and pain control are ours."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Clinical inquiry and professional roles (2)
    {
      slug: "wms-exercise-with-active-plantar-ulcer",
      objective: "Apply the APTA diabetic foot ulcer guideline: prescribe exercise that keeps cardiovascular and muscular fitness while minimizing weight bearing, adding an assistive device when it helps balance and unloading",
      kind: "build",
      title: "Prescribe exercise for a man in a total contact cast",
      brief:
        "A fictional 58-year-old man with type 2 diabetes and peripheral neuropathy has a plantar forefoot ulcer under the second metatarsal head, 1.5 x 1.2 cm, no infection, with adequate perfusion on vascular testing. He has just been fitted with a total contact cast. He has a body mass index of 34, walks with a slightly unsteady gait, and until the ulcer he walked 30 minutes most days \"for my sugar\". He is worried that stopping walking will wreck his diabetes control and asks what he is allowed to do.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the exercise prescription for the casting period and the plan for after closure, following the APTA diabetic foot ulcer guideline.",
          parts: [
            part(
              "During casting",
              "Prescribes exercise that preserves cardiovascular and muscular fitness while minimising weight bearing on the ulcerated foot: seated or supine aerobic options (arm ergometry, seated cycling on the non-cast leg, chair-based circuits), resistance training for trunk, upper body and the uninvolved leg, and glucose monitoring around sessions; keeps plantar loading on the cast foot to essential walking only.",
              "He does not stop training -- he changes it. Aerobic work that does not load the cast foot: arm ergometer, seated circuits, single-leg cycling with the cast foot resting, 20-30 minutes most days at a moderate effort. Resistance work for upper body, trunk and the sound leg two or three times a week. He checks glucose before and after until we know his response. Walking in the cast is for getting to the bathroom and the car, not exercise."
            ),
            part(
              "Assistive device and balance",
              "Adds an assistive device (for example a walker or forearm crutches) because it helps balance and unloading given neuropathy and the cast, trains safe transfers and gait with it, and includes seated balance and strength work to reduce fall risk without loading the ulcer.",
              "He gets a walker (or forearm crutches if he manages them well) for every step in the cast: it steadies a neuropathic man on an uneven cast and takes load off the forefoot. Practise transfers and short-distance gait with it, and add seated and supported balance work so he is safer, not weaker, when the cast comes off."
            ),
            part(
              "After closure",
              "Plans a graded return: keep offloading for about the first 3 months after closure with a staged return to shoe wear, then progressive moderate-to-vigorous aerobic and resistance training (the guideline's strong recommendation for adults with diabetes who can exercise safely), with daily foot checks, appropriate footwear, and consideration of activity-monitor-based counselling to rebuild his daily steps gradually.",
              "Closure is not the finish line: protective footwear and continued offloading for about three months, with a written schedule for how many hours a day he wears shoes before building up. Then progressive moderate-to-vigorous aerobic and resistance training -- the guideline's strongest recommendation for adults with diabetes who can exercise safely -- and a step counter to rebuild walking in small weekly increments, with daily foot inspection and the right shoes and insoles for life."
            ),
          ],
        },
      ],
    },
    {
      slug: "wms-wound-note-and-consult",
      objective: "Professional roles: consultation, documentation, regulatory requirements and interprofessional wound care",
      kind: "build",
      title: "Write a wound note that stands up, and the consult that follows",
      brief:
        "You are the fictional wound management physical therapist consulted by a skilled nursing facility about a resident's sacral wound. The resident is an 84-year-old woman with dementia; her son holds health-care power of attorney and has consented to care and to photographs for the record. Your findings: sacral pressure injury, 6.2 x 4.5 cm by the clock method (12-to-6 by 3-to-9), 1.8 cm deep at 6 o'clock, 70% red granulation, 30% yellow adherent slough, 1.5 cm undermining from 3 to 5 o'clock, moderate serous exudate, no odour, periwound macerated 1 cm at the inferior edge, pain 4/10 at dressing change. The facility's last note says only \"sacral wound, dressing changed\".",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the examination entry as it should appear in the record, the consult communication to the physician and nursing team, and the regulatory and consent points you must cover.",
          parts: [
            part(
              "Documentation entry",
              "Writes a complete, reproducible entry: etiology and NPIAP stage (stage 3: full-thickness with slough but no exposed muscle/bone, undermining present), location, dimensions with method (clock face, length x width x depth), undermining with clock positions, tissue type percentages, exudate amount and type, odour, periwound condition, pain, dressing used, and a photograph reference with date, scale and consent.",
              "Sacral pressure injury, stage 3 (full thickness, granulation and slough, no exposed muscle or bone). 6.2 cm (12-6) x 4.5 cm (3-9) x 1.8 cm deep at 6 o'clock, clock method, patient left side-lying. Undermining 1.5 cm from 3 to 5 o'clock. Bed 70% red granulation, 30% adherent yellow slough. Moderate serous exudate, no odour. Periwound macerated 1 cm at inferior edge, otherwise intact. Pain 4/10 at dressing change. Photograph taken with ruler and date label, consent by POA on file. Dressing: as per plan below."
            ),
            part(
              "Consult communication",
              "Communicates the findings and recommendations in a structured form to the physician and nursing: stage and risk, the need for debridement of slough (method within scope and orders), moisture management for the macerated edge, a reassessment of the support surface and repositioning plan individualised to her risk factors, nutrition and continence review, pain management at dressing changes, and measurable follow-up with a date.",
              "To the physician and charge nurse, SBAR style: stage 3 sacral pressure injury with undermining and 30% slough, not previously staged or measured. Recommend: selective debridement of slough (conservative sharp within my scope with your order, or autolytic/enzymatic if you prefer), an absorbent dressing to control moisture and protect the macerated edge, a review of the mattress and cushion and an individualised repositioning plan built on her mobility, continence, nutrition and cognition rather than a fixed clock, dietitian review, analgesia before dressing changes. I will re-measure in one week and report."
            ),
            part(
              "Regulatory and consent points",
              "Covers consent through the legal decision-maker for treatment and photography, the resident's assent and dignity, privacy of images, the facility's reporting requirements for pressure injuries (staging and tracking in the required assessment system), scope-of-practice limits on debridement and the physician order, and that measurement method and staging must be consistent between clinicians so the record shows true change.",
              "Consent for treatment and photographs comes from the son as POA and is documented; I still explain each step to the resident and stop if she is distressed. Photographs are stored in the record, never on a personal device. The facility must record the injury's stage and progress in its required resident assessment and quality tracking, so I give them the stage and measurements in the format they report. Debridement happens within my scope under a physician order. Every clinician measures and stages the same way, or the chart cannot show whether she is healing."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Examination and evaluation (2)
    {
      slug: "wms-abi-three-patients",
      objective: "Measure the ankle-brachial index correctly: use the highest ankle systolic pressure over the higher brachial pressure, measuring both arms, and suspect falsely high values in calcified vessels (diabetes, CKD, old age)",
      kind: "build",
      title: "Calculate three ankle-brachial indices and act on them",
      brief:
        "Three fictional patients with leg ulcers have Doppler pressures taken after 10 minutes supine. Patient A (venous-looking ulcer, no diabetes): brachial right 128, left 136 mm Hg; right dorsalis pedis 92, posterior tibial 104 mm Hg. Patient B (lateral ankle ulcer, smoker): brachial right 148, left 142; left dorsalis pedis 68, posterior tibial not detectable. Patient C (plantar ulcer, type 2 diabetes and chronic kidney disease): brachial right 130, left 126; right dorsalis pedis 198, posterior tibial 190, with monophasic Doppler waveforms.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate each patient's ABI showing the numbers you chose and why, interpret it, and give the next step for each.",
          parts: [
            part(
              "Patient A",
              "Uses the highest ankle pressure (104) over the higher brachial pressure (136) = about 0.76; interprets as reduced, indicating arterial disease in a leg with a venous-looking ulcer (mixed disease); next step: vascular referral and no high compression -- at most a reduced level (20 mm Hg or less) while vascular testing is pending.",
              "ABI = 104 (the higher of 92 and 104) / 136 (the higher arm) = 0.76. Below normal: there is arterial disease alongside the venous picture -- a mixed ulcer. Refer to vascular. Do not apply high compression; while the vascular work-up is pending, nothing more than a light 20 mm Hg or less, and only if she tolerates it."
            ),
            part(
              "Patient B",
              "Calculates 68 / 148 = about 0.46 (noting the absent posterior tibial signal), interprets as severe arterial insufficiency with an ABI below 0.5 -- a poor-healing and limb-threat sign; next step: no compression at all, urgent vascular referral, protect the foot, no aggressive debridement.",
              "ABI = 68 / 148 = 0.46, and the posterior tibial signal cannot even be found. Under 0.5 means severe ischemia with poor healing potential and a threat to the limb. No compression, no sharp debridement of a dry ischemic wound, protect the foot from pressure and trauma, and an urgent vascular surgery referral today."
            ),
            part(
              "Patient C",
              "Calculates 198 / 130 = about 1.52 and recognises a falsely high, non-compressible result from calcified vessels in diabetes and chronic kidney disease, confirmed by monophasic waveforms suggesting disease; next step: toe-brachial index and toe pressures and waveform analysis (or TcPO2 / vascular lab), and treat the leg as possibly ischemic until proven otherwise.",
              "ABI = 198 / 130 = 1.52 -- the vessels are too calcified to compress, so the number is meaningless, and the monophasic waveforms say the flow is abnormal. Diabetes and kidney disease are exactly the setting for this. Measure toe pressures and a toe-brachial index, read the waveforms, and send to the vascular lab; until then assume the foot may be ischemic."
            ),
          ],
        },
      ],
    },
    {
      slug: "wms-measure-and-track-a-wound",
      objective: "Wound measurement, tissue type, exudate, periwound and photography standards",
      kind: "build",
      title: "Measure a venous ulcer, record it to standard, and compute the change",
      brief:
        "A fictional 70-year-old woman's venous leg ulcer over the right medial gaiter area was first measured four weeks ago at 4.2 cm (head-to-toe) x 3.1 cm (side-to-side), with 60% granulation and 40% slough, heavy serous exudate and a macerated periwound. Today, with the same position and method, it measures 3.0 x 2.4 cm, 90% granulation and 10% slough, moderate exudate, periwound intact with mild hemosiderin staining, no odour, pain 2/10. She has been in compression since the ABI was confirmed adequate.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Record today's findings to standard, calculate the area change since baseline, and state what the trajectory means for the plan.",
          parts: [
            part(
              "Standardised record",
              "Documents location and etiology, dimensions by the stated method (head-to-toe length x side-to-side width, same position), depth if any, tissue type percentages, exudate amount and type, periwound, odour, pain and the dressing/compression in use, plus a dated photograph with a ruler and the consistent method noted so follow-ups are comparable.",
              "Right medial gaiter venous leg ulcer. 3.0 cm (head-to-toe) x 2.4 cm (side-to-side), measured supine with the same landmarks as baseline, superficial with no depth to record. Bed 90% red granulation, 10% yellow slough. Moderate serous exudate. Periwound intact, mild hemosiderin staining, no maceration. No odour. Pain 2/10. In multilayer high compression since ABI was confirmed adequate. Photograph with ruler and date, same angle as baseline."
            ),
            part(
              "Area calculation",
              "Calculates area by length x width: baseline 4.2 x 3.1 = about 13.0 cm2, today 3.0 x 2.4 = 7.2 cm2, a reduction of about 5.8 cm2 or about 45% in four weeks, while noting length x width overestimates an irregular wound so the method must stay constant.",
              "Baseline 4.2 x 3.1 = 13.0 cm2. Today 3.0 x 2.4 = 7.2 cm2. Change: 5.8 cm2 smaller, 5.8 / 13.0 = about 45% reduction in four weeks. Length-times-width overstates an irregular ulcer, so the same method is used every time and only the trend is read."
            ),
            part(
              "Trajectory and plan",
              "Interprets the trajectory as healing (area down, slough down, exudate down, periwound improved) and continues the current compression and dressing plan with a stepped-down absorbency as exudate falls, keeps measuring at fixed intervals, and names the triggers to re-evaluate (area not shrinking at the next 4-week check, rising exudate, pain, odour or new slough).",
              "She is healing: smaller, cleaner, drier, periwound recovered. Continue compression; step the dressing down to a lighter absorbent as exudate falls; re-measure every visit and formally at the next four-week point. If the area stops shrinking, or exudate, pain, odour or slough increase, we re-examine for infection, the ABI, compression fit and her adherence rather than carry on."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Diagnosis and prognosis (2)
    {
      slug: "wms-dfu-healing-prognosis",
      objective: "Prognosis and expected healing timelines by wound type and comorbidity",
      kind: "case",
      title: "Will this foot ulcer heal? Reading perfusion, infection and bone",
      brief:
        "A fictional 66-year-old man with type 2 diabetes for 20 years, neuropathy and chronic kidney disease presents with a plantar ulcer under the first metatarsal head of the left foot, present for 10 weeks, 2.0 x 1.5 cm, 0.6 cm deep, with a pale base and minimal exudate. He has been wearing his usual trainers. There is no fever. He asks how long it will take to heal.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Vascular testing: left ankle pressure 44 mm Hg (ABI 0.34), toe pressure low with a flat waveform. Probe-to-bone test: the probe touches hard, gritty bone at the base. Mild erythema under 2 cm around the wound; no purulence.",
          ask: "Give your prognosis with the reasons, and name what must happen before any healing can be expected.",
          parts: [
            part(
              "Prognosis and reasons",
              "Gives a poor prognosis for healing without intervention: ankle pressure below 50 mm Hg and ABI below 0.5 are signs of poor healing potential and higher amputation risk, a positive probe-to-bone raises concern for osteomyelitis, the wound is deep and chronic in a neuropathic foot with ongoing loading, and CKD and long-standing diabetes add risk; frames this with the WIfI threatened-limb logic (wound, ischemia and foot infection each graded 0-3 into stages 1-4 to estimate one-year amputation risk and revascularisation benefit).",
              "Honestly: this will not heal as it is. An ankle pressure of 44 mm Hg and an ABI of 0.34 mean the foot cannot deliver the oxygen a wound needs and put him at higher risk of amputation; probe-to-bone is positive, so osteomyelitis is likely; the ulcer is deep, ten weeks old and still being walked on in trainers; kidney disease and twenty years of diabetes make it worse. In WIfI terms the wound, ischemia and infection grades each score on 0-3 and combine into a stage that estimates his one-year amputation risk and how much revascularisation would help -- and here the ischemia alone pushes him into a high stage."
            ),
            part(
              "What must happen first",
              "Refers urgently to vascular surgery for revascularisation assessment and to the medical/podiatric team for osteomyelitis work-up (imaging, possible bone biopsy, antibiotics as they decide), and starts offloading now; defers sharp debridement and anything that depends on perfusion until the vascular team has decided.",
              "Today: urgent vascular surgery referral -- perfusion decides everything else -- and a message to his physician about probable osteomyelitis for imaging and a bone sample. Offloading starts now, even before the vascular decision. No sharp debridement or adjuncts until vascular says what the foot can tolerate."
            ),
          ],
        },
        {
          text: "He has a successful endovascular revascularisation; ankle pressure rises to 96 mm Hg. Bone biopsy confirms osteomyelitis and he starts a prolonged course of antibiotics. The team asks you to take over offloading and healing management.",
          ask: "Set the plan and the revised prognosis, and what you will tell him about timelines.",
          parts: [
            part(
              "Plan",
              "Offloads with a non-removable knee-high device (total contact cast or rendered-irremovable walker) now that perfusion allows, with wound bed preparation (debridement as the bed now tolerates, moisture balance), infection monitoring with the team, foot checks of the other foot, and planning of footwear for after closure with offloading continued for about 3 months.",
              "Now that the foot has blood supply: a total contact cast (or a walker made non-removable) to take every step off the metatarsal head; debridement of non-viable tissue as the bed can now tolerate it; a dressing matched to the exudate; weekly checks for infection with the team while the antibiotics run; and watching the other foot, which has the same neuropathy. Start planning protective footwear now, because offloading continues for about three months after closure."
            ),
            part(
              "Revised prognosis and timeline message",
              "Gives a cautiously improved prognosis dependent on perfusion holding, infection clearing and strict offloading adherence, with reassessment of the healing trajectory at set intervals; tells him that chronic diabetic foot ulcers take weeks to months even when everything goes right, that a wound not shrinking by the next review means something is wrong, and that recurrence prevention is lifelong.",
              "Much better odds now, if the artery stays open, the bone infection clears and he stays in the cast. I tell him: deep diabetic ulcers heal over weeks to months when everything goes right; we measure every week and if it is not shrinking by the next review we look for the reason rather than wait. And once it closes, the foot stays at risk for life -- footwear, daily checks and regular reviews are permanent."
            ),
          ],
        },
      ],
    },
    {
      slug: "wms-ulcer-that-needs-a-biopsy",
      objective: "Recognizing wounds requiring surgical, vascular or oncologic referral",
      kind: "case",
      title: "A \"venous\" ulcer that has stopped behaving like one",
      brief:
        "A fictional 76-year-old woman has had a left lower-leg ulcer for 14 months. It was diagnosed as venous and treated with compression after an adequate ABI. It improved for a few months, then stalled, and for the last three months has slowly grown despite good adherence. The lesion is now 5 x 4 cm, with a raised, rolled border, an exuberant friable granulation-like base that bleeds easily, and no pain. There is no hemosiderin staining around it. She has never had a biopsy.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The ABI today is unchanged and adequate. The inguinal nodes are not enlarged. Nothing in her medications or nutrition has changed.",
          ask: "What do you suspect, and what is the next step?",
          parts: [
            part(
              "Suspicion",
              "Suspects a non-venous cause, specifically malignancy (for example squamous or basal cell carcinoma arising in a chronic wound, or another skin cancer), from the features: no improvement with standard care over months, growth, raised rolled borders, excessive friable granulation and absence of the typical venous surround; also considers other atypical causes (pyoderma gangrenosum, vasculitis) that likewise need tissue diagnosis.",
              "This no longer looks venous: 14 months, growing on good compression with adequate perfusion, a raised rolled edge, over-exuberant granulation that bleeds, and none of the usual staining. A skin cancer in a chronic wound is the first thing to exclude; pyoderma gangrenosum or vasculitis are also possible, and all of them need tissue, not another dressing."
            ),
            part(
              "Next step",
              "Refers promptly for biopsy (dermatology or surgery), explaining that biopsy is essential when an ulcer shows excessive granulation, raised borders or fails to improve with standard care; stops adjuncts that assume a venous ulcer, continues simple protective care, and documents the change and the referral.",
              "Prompt referral to dermatology or the surgical team for biopsy -- several edge-and-base samples, since a chronic ulcer with raised borders and no response to standard care is biopsied, full stop. Meanwhile a simple non-adherent dressing and gentle compression if tolerated, no negative pressure or growth-promoting adjuncts, and a clear note of the change in appearance and the date of referral."
            ),
          ],
        },
        {
          text: "The biopsy shows squamous cell carcinoma. The surgical oncology team plans wide excision with a skin graft and asks you to see her before and after surgery.",
          ask: "What is the physical therapist's role now?",
          parts: [
            part(
              "Before surgery",
              "Prepares the limb and the patient: optimises edema control and skin condition within the surgeon's instructions, teaches post-operative positioning and mobility expectations, screens function, falls risk and home support, and coordinates with the oncology team about staging and lymph node assessment that may change the plan.",
              "Before surgery I get the leg as quiet as the surgeon allows -- edema down, skin intact around the lesion -- and prepare her: what the graft will need (elevation, protected mobility), how she will get around at home in the first weeks, and her falls risk and support at home. I check with the oncology team whether node assessment or staging changes anything about the plan."
            ),
            part(
              "After surgery",
              "Manages the graft and donor sites with the team (protection, moisture, monitoring take and signs of infection), restores mobility and edema control with gradual compression when the surgeon permits, watches for recurrence and refers any new atypical change, and plans long-term skin surveillance and lower-limb care.",
              "Afterwards: protect the graft and donor site, monitor take and infection with the team, control edema and reintroduce compression only when the surgeon says the graft can bear it, restore walking and independence. Any new nodule, rolled edge or non-healing area at the site or elsewhere on the leg goes straight back to oncology, and she gets lifelong skin checks."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- Interventions and outcomes (2)
    {
      slug: "wms-compression-decision-venous-ulcer",
      objective: "Compression therapy, offloading, positioning and support surfaces",
      kind: "case",
      title: "Compression: how much, when, and when not",
      brief:
        "A fictional 69-year-old woman has a venous leg ulcer over the left medial gaiter area, 3.5 x 2.8 cm, moderate exudate, with edema to the knee and lipodermatosclerosis. She has well-controlled hypertension and no history of heart failure or clotting problems. Pedal pulses are palpable but the ABI has not yet been done; the vascular lab can see her in nine days.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She asks whether you can start compression today because the swelling and the weeping are ruining her shoes and her sleep.",
          ask: "Decide what compression, if any, she gets today and what changes after the vascular test.",
          parts: [
            part(
              "Today",
              "Does not start high compression before the ABI; offers at most a low-level compression (20 mm Hg or less) while vascular testing is pending, provided pulses are palpable and no arterial symptoms, with elevation, calf-muscle exercise and an absorbent dressing; explains why (about 20% of venous ulcers have arterial disease and compression on an ischemic leg can cause harm).",
              "Not high compression yet. Palpable pulses are reassuring but not proof -- about one in five venous ulcers has arterial disease too, and strong compression on an ischemic leg can cause necrosis. Until the ABI: a light wrap of 20 mm Hg or less if she tolerates it, legs up above heart level when sitting, heel-raise and ankle exercises, and an absorbent dressing. I'll try to bring the vascular appointment forward."
            ),
            part(
              "After an adequate ABI",
              "Starts high compression to knee height (multilayer or short-stretch system) as the core treatment, with exercise and elevation, dressing matched to exudate, skin care for the lipodermatosclerosis, and weekly review of fit, skin and wound measurements; lists the contraindications that would have stopped it (arterial occlusion, ABPI under 0.5, heart failure, thrombosis).",
              "With an adequate ABI: full high compression from toes to just below the knee -- a multilayer or short-stretch system renewed as exudate dictates -- as the main treatment, plus calf-pump exercise and elevation, an absorbent primary dressing and emollient for the skin. Weekly checks of fit, toes and wound size. The things that would have stopped me -- arterial occlusion, an ABPI under 0.5, heart failure or a thrombosis -- are all excluded."
            ),
          ],
        },
        {
          text: "Twelve weeks later the ulcer is healed. She asks whether she can \"stop all that bandaging now\".",
          ask: "Write the prevention plan.",
          parts: [
            part(
              "Lifelong compression",
              "Explains that healing is not cure: venous hypertension persists, so fitted compression hosiery worn daily for life (donned in the morning, replaced as it loses elasticity), with donning aids if needed and re-measurement as the leg changes, is the main prevention of recurrence.",
              "The bandages stop; compression does not. Her veins have not changed, so fitted compression stockings every day for life are what keep the ulcer closed -- on first thing in the morning, off at night, replaced when they lose their stretch, with a donning aid if her hands struggle, and re-measured if her legs change."
            ),
            part(
              "Skin, activity and surveillance",
              "Adds skin care and early self-inspection, calf-muscle exercise and walking, leg elevation, weight and comorbidity management, a referral question about venous intervention to the vascular team where appropriate, and a clear instruction to return at the first sign of skin breakdown.",
              "Daily moisturiser and a look at the gaiter skin every evening; walking and heel raises to keep the calf pump working; legs up when resting; weight and blood pressure under control. I ask the vascular team whether treating the underlying veins would reduce her risk. And any itch, redness or break in the skin is a same-week appointment, not a wait-and-see."
            ),
          ],
        },
      ],
    },
    {
      slug: "wms-debride-and-dress-three-wounds",
      objective: "Debridement methods: selective and non-selective, indications and contraindications",
      kind: "build",
      title: "Choose debridement and a dressing for three wounds",
      brief:
        "Three fictional wounds need a plan today. Wound A: a stage 3 sacral pressure injury in a 79-year-old on anticoagulants, 4 x 3 cm, 50% loosely adherent yellow slough and 50% granulation, moderate exudate, no infection, no pain. Wound B: a venous leg ulcer with 80% thick adherent slough and malodour, heavy exudate, periwound macerated, no systemic signs, perfusion adequate, in a patient who is needle-phobic and declines anything sharp. Wound C: a clean, granulating stage 3 pressure injury over the trochanter, 2 x 2 cm, low exudate, in a patient whose dressing is changed by a family member every three days.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each wound choose the debridement method (or none) with the reason and any contraindication you weighed, then the dressing that fits its moisture.",
          parts: [
            part(
              "Wound A",
              "Chooses selective, conservative debridement -- autolytic (the most conservative, takes days) and/or gentle conservative sharp of loose slough within scope and orders, weighing anticoagulation as a bleeding risk -- and a dressing for moderate exudate that supports autolysis (for example a hydrocolloid or foam, with a hydrogel only if the bed dries).",
              "Loose slough, no infection, no pain, but anticoagulated: lead with autolytic debridement -- the most conservative, working over days -- and lift only what comes away freely with conservative sharp technique under the order, stopping at any bleeding. A hydrocolloid or foam dressing holds the moisture that lets the body do the rest; it is changed when saturated, not daily."
            ),
            part(
              "Wound B",
              "Chooses a non-sharp but faster-than-autolytic option for thick slough with odour and heavy exudate -- enzymatic debridement or larval (biological) therapy with sterile Lucilia sericata larvae -- respecting the patient's refusal of sharp debridement, while managing odour and the macerated periwound and watching for infection; dressing: an alginate or highly absorbent foam for heavy exudate with periwound protection, plus compression as the venous plan allows.",
              "Thick adherent slough, odour, heavy exudate and a patient who refuses anything sharp: enzymatic debridement, or larval therapy with sterile Lucilia sericata larvae, both selective and both faster than waiting for autolysis. Culture or review if the odour and periwound erythema suggest infection. Dressing: an alginate or high-absorbency foam to cope with the exudate, a barrier film on the macerated skin, and the venous compression continues over it."
            ),
            part(
              "Wound C",
              "Chooses no debridement -- a clean granulating bed has nothing to remove and debridement would harm it -- and a dressing matched to low exudate and infrequent changes by a caregiver (for example a silicone foam or hydrocolloid that can stay in place for days, moist but not macerated), with offloading of the trochanter.",
              "Nothing to debride: this bed is clean red granulation and any debridement would set it back. It needs a dressing that keeps it moist without maceration and tolerates a three-day change by a family member -- a silicone foam or a thin hydrocolloid -- and the trochanter kept off the mattress with positioning so it can finish healing."
            ),
          ],
        },
      ],
    },
  ],
};
