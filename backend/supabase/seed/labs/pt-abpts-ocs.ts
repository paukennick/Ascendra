import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-151: ABPTS Orthopaedic Clinical Specialist (OCS) labs.
//
// Aligned to the ABPTS orthopaedics examination outline (2026 Description
// of Specialty Practice): knowledge 30%, clinical reasoning and systems 10%,
// patient management 60% split by the body-region table (spine group,
// upper extremity, lower extremity). Density follows the adopted hybrid
// plan unit by unit: 3 / 1 / 3 / 2 / 2 = 11 labs (6 build, 5 case).
//
// Every patient, clinic and referrer is fictional; exam practice, not
// clinical guidance. Specialist-level depth: differential diagnosis and
// referral, examination selection, CPG-based intervention and progression,
// and outcome measures with their published MCIDs. Clinical thresholds in
// the labs were checked on 2026-11-07 against the sources below (publisher
// abstracts via Europe PMC, official guideline documents where open):
//   - Stiell 1993, Ottawa ankle rules refinement/validation, JAMA
//     doi:10.1001/jama.269.9.1127 (100% sensitive; rule elements per the
//     Ottawa Hospital Research Institute rule).
//   - Stiell 2001, Canadian C-Spine Rule, JAMA doi:10.1001/jama.286.15.1841
//     (high-risk: age 65+, dangerous mechanism, extremity paresthesias;
//     low-risk factors allow ROM testing; active rotation 45 degrees).
//   - Downie 2013, red flags for malignancy and fracture, BMJ
//     doi:10.1136/bmj.f7095 (history of malignancy is the red flag with the
//     highest post-test probability for spinal malignancy, 33%).
//   - Rushton et al., IFOMPT International Framework for Examination of the
//     Cervical Region (2020): positional premanipulative tests removed;
//     cranial nerve examination and blood pressure emphasised; "unlike any
//     other" head/neck pain as a warning feature.
//   - Blanpied 2017, Neck Pain: Revision 2017 CPG, JOSPT
//     doi:10.2519/jospt.2017.0302 (treatment-based categories).
//   - George 2021, Low Back Pain: Revision 2021 CPG, JOSPT
//     doi:10.2519/jospt.2021.0304.
//   - Hill 2008, STarT Back Screening Tool, Arthritis Rheum
//     doi:10.1002/art.23563 (9 items; 0-3 low risk; psychosocial subscale
//     4-5 high risk; the rest medium).
//   - Laslett 2005, SIJ provocation tests, Man Ther
//     doi:10.1016/j.math.2005.01.003 (3+ of 6 positive: Sn 94%, Sp 78%).
//   - Grindem 2016, Delaware-Oslo ACL cohort, Br J Sports Med
//     doi:10.1136/bjsports-2016-096031 (reinjury rate fell 51% per month of
//     delayed return to level I sport until 9 months; quadriceps LSI under
//     90% associated with reinjury; passing all criteria: 84% lower rate).
//   - Martin 2005, FAAM validity, Foot Ankle Int
//     doi:10.1177/107110070502601113 (MCID 8 ADL, 9 Sports).
//   - Walenkamp 2015, PRWE MCID in distal radius fracture, CORR
//     doi:10.1007/s11999-015-4376-9 (MCID 11.5 points).
//   - Martin 2021, Lateral Ankle Ligament Sprains Revision 2021 CPG, JOSPT
//     doi:10.2519/jospt.2021.0302.
//   - APTA TKA CPG 2026 and StatPearls chapters already cited in
//     seed/tracks/pt-abpts.ts (SP-LBP, SP-LSS, SP-CRAD, SP-CMY, SP-VAD,
//     SP-ACL, SP-ANK, SP-CTS, SP-PATHFX).
// Not used because they could not be verified on the day: an ABI normal
// range (the track records the disagreement); specific NDI and ODI MCIDs
// (several published values) -- the rubrics ask for "the published MCID"
// as a concept and accept any sourced figure.

export const ABPTSOCS_LABS: SeedLabSet = {
  trackCode: "ABPTSOCS",
  sources: [
    source("https://specialization.apta.org/become-a-specialist/orthopaedics/specialist-certification-examination-outline-orthopaedics", "exam_outline", "2026-11-07"),
    source("https://specialization.apta.org/become-a-specialist/orthopaedics", "exam_outline", "2026-11-07"),
  ],
  labs: [
    // ------------------------------------------------------------------
    // Unit 1: Knowledge for specialty practice (3)
    // ------------------------------------------------------------------
    {
      slug: "ocs-back-pain-that-is-not-mechanical",
      objective: "Medical screening and differential diagnosis for red flags masquerading as musculoskeletal pain",
      kind: "case",
      title: "Back pain that is not behaving mechanically",
      brief:
        "A fictional 68-year-old man is referred by direct access to an outpatient orthopedic clinic for 'mechanical low back pain', 7 weeks' duration. He describes a deep, constant thoracolumbar ache that is now waking him at 3 a.m. and is not eased by lying down or changing position. He has lost about 5 kg without trying. Past history: prostate cancer treated with radiotherapy 4 years ago, 'in remission'. No bladder or bowel change, no saddle numbness, no leg weakness. He took paracetamol with little effect and has had no imaging. This is exam practice with a fictional patient, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "On examination: lumbar flexion and extension both reproduce a deep ache without a clear directional preference; repeated movements neither centralize nor peripheralize anything. Percussion over T12-L2 is tender. Neurological screen (L2-S1 myotomes, dermatomes, reflexes) is normal. Straight leg raise is negative. Gait is normal.",
          ask: "What is your working hypothesis about the pain source, and what do you do with this referral today?",
          parts: [
            part(
              "Hypothesis and red flags",
              "States that the presentation is more consistent with a non-mechanical (possible neoplastic) cause than with mechanical low back pain, and names the specific red flags: history of malignancy (the strongest single predictor of spinal malignancy), unexplained weight loss, age over 50, constant pain not relieved by rest or position, night pain, and failure to improve over more than a month.",
              "This does not look mechanical. The strongest flag is his history of prostate cancer (the red flag with the highest post-test probability for spinal malignancy); add unexplained weight loss, age over 50, constant pain unrelieved by rest or position, night waking, and 7 weeks without improvement. Working hypothesis: possible metastatic disease of the thoracolumbar spine until proven otherwise."
            ),
            part(
              "Action today",
              "Refers the patient back to the physician (or oncology) the same day for medical evaluation and imaging, communicates the specific findings in writing, and does not begin manual therapy or loaded exercise until the cause is clarified; explains the plan to the patient without alarming or minimizing.",
              "Call the referring physician/his oncology team today and send a written summary of the red flags and exam findings asking for urgent medical review and imaging. Hold off on manipulation and loaded exercise. Tell him plainly that his pattern needs a medical check before physiotherapy continues, and arrange to stay involved once the work-up is done."
            ),
          ],
        },
        {
          text: "Two weeks later MRI shows a lytic metastasis in the L2 vertebral body occupying about 40% of the body with the posterior cortex intact, and a smaller lesion at T11. Oncology has started hormonal therapy and radiotherapy is planned. The oncologist asks whether he can keep seeing you for his deconditioning and stiffness, and what precautions you would put in place.",
          ask: "Write your plan for continuing care with the precautions that follow from the imaging.",
          parts: [
            part(
              "Precautions",
              "Names a pathologic fracture risk and sets precautions accordingly: no spinal manipulation or high-velocity thrust at or near the involved levels, no heavy or sudden axial or flexion-compression loading, avoids end-range loaded flexion/rotation, and asks oncology/orthopaedics about spinal stability and any bracing or load limits before progressing; monitors for new or escalating pain, neurological change or signs of cord compression as reasons to stop and refer.",
              "Treat L2 as at risk of pathologic fracture: no spinal manipulation or thrust techniques near T11-L2, no heavy lifting or sudden axial compression, avoid loaded end-range flexion and rotation. Ask the oncology/orthopaedic team to confirm stability and whether a brace or a load limit applies. Stop and refer immediately for new escalating pain, any leg weakness, numbness, gait change, or bladder/bowel symptoms (possible cord compression)."
            ),
            part(
              "What you can still do",
              "Offers appropriate care within those limits: pain-free mobility and gentle range of motion, walking and low-impact aerobic conditioning, hip and lower-limb strengthening in supported positions, posture and transfer training, energy conservation and falls-risk reduction, with clear coordination with oncology.",
              "Plenty is still safe and useful: a graded walking program, supported hip and leg strengthening (for example sit-to-stand, step-ups within comfort), gentle thoracic and hip mobility without spinal end-range loading, transfer and lifting technique, balance work and falls prevention, and fatigue management around his radiotherapy. Keep oncology informed and reassess every visit."
            ),
          ],
        },
      ],
    },
    {
      slug: "ocs-who-needs-imaging-today",
      objective: "Diagnostic imaging in orthopedics: what each modality shows and when findings matter clinically",
      kind: "build",
      title: "Three referrals: who needs imaging today?",
      brief:
        "You run a fictional direct-access orthopedic clinic. Three fictional patients arrive the same afternoon. Patient A: a 24-year-old who inverted her ankle playing netball 2 hours ago; she has lateral malleolar swelling, is tender along the posterior edge of the distal 6 cm of the fibula, and could not take four steps either at the time or now. Patient B: a 34-year-old rear-ended at low speed yesterday, now with neck pain; she was ambulatory at the scene, has no midline tenderness, no extremity paresthesias, no dangerous mechanism, and can actively rotate her neck 45 degrees each way. Patient C: a 45-year-old with 5 weeks of non-radiating low back pain, no trauma, no red flags, a normal neurological screen, and a strong wish for 'a scan to see what is wrong'. Fictional patients; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each patient, decide whether imaging is indicated now, name the rule or guidance you used, and say which modality (if any) answers the clinical question.",
          parts: [
            part(
              "Patient A (ankle)",
              "Applies the Ottawa Ankle Rules and concludes radiographs of the ankle are indicated because of posterior distal fibula bone tenderness plus inability to bear weight for four steps; names plain radiographs (ankle series) as the modality; mentions managing the acute injury (protection, elevation) pending the film.",
              "Ottawa Ankle Rules: malleolar-zone pain with bone tenderness along the posterior edge of the distal fibula and inability to take four steps both immediately and now -- she meets the rule, so an ankle radiograph series is indicated today. Protect and elevate the ankle and refer for plain films before loading it."
            ),
            part(
              "Patient B (neck)",
              "Applies the Canadian C-Spine Rule: no high-risk factor (under 65, no dangerous mechanism, no paresthesias), a low-risk factor present (simple rear-end collision, ambulatory, no midline tenderness) that allows range-of-motion testing, and active rotation of 45 degrees both ways -- so no radiography is indicated; proceeds with examination and management.",
              "Canadian C-Spine Rule: no high-risk factor (age under 65, simple rear-end collision is not a dangerous mechanism, no extremity paresthesias); low-risk factors present (simple rear-end collision, ambulatory, no midline tenderness) so it is safe to test rotation; she rotates 45 degrees each way. No imaging needed; examine and treat the neck pain."
            ),
            part(
              "Patient C (low back)",
              "States that imaging is not indicated for low back pain without red flags or neurological deficit within the first weeks, because degenerative findings are common in people without symptoms and do not change management; explains this to the patient respectfully and offers an evidence-based plan with reassessment criteria that would trigger imaging later.",
              "No imaging now: there are no red flags and no neurological deficit, and routine imaging in non-specific low back pain does not change management -- disc degeneration shows up in most adults over 50 with or without pain, so a scan tends to label rather than help. Explain this plainly, start active care, and agree what would change the decision (new neurological signs, red flags, no improvement after a reasonable trial)."
            ),
          ],
        },
      ],
    },
    {
      slug: "ocs-medication-review-before-loading",
      objective: "Pharmacology relevant to orthopedic patients: analgesics, corticosteroids, anticoagulants and their exercise implications",
      kind: "build",
      title: "Medication review before you load the tendon",
      brief:
        "A fictional 61-year-old woman is referred 3 weeks after an uncomplicated total knee arthroplasty for progressive strengthening. Her medication list: apixaban (a direct oral anticoagulant, prescribed for 5 weeks after surgery), prednisolone 10 mg daily for the last 18 months for polymyalgia rheumatica, and a 10-day course of ciprofloxacin (a fluoroquinolone antibiotic) that finished 4 days ago for a urinary infection. She also had a corticosteroid injection into the opposite (non-operated) knee 10 days ago and mentions new posterior heel soreness on the operated side after walking more. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the medication-related part of your evaluation: for each drug, what it changes about how you examine, load and monitor her, and anything you need to communicate to the prescriber.",
          parts: [
            part(
              "Anticoagulant",
              "Recognizes that apixaban raises bleeding and bruising risk (so deep soft-tissue techniques and aggressive end-range forcing are moderated and haemarthrosis/haematoma watched for) while also indicating that DVT remains a concern to screen for (calf pain, swelling, warmth) and that signs of bleeding (unexplained bruising, melena, hematuria) are reported to the prescriber.",
              "Apixaban: she bruises and bleeds more easily, so avoid aggressive soft-tissue work or forced end-range stretching of the knee and watch for a swelling, warm, tense joint (hemarthrosis) or large hematomas. She is anticoagulated for a reason: still screen each visit for calf pain, swelling and warmth (DVT) and send any unexplained bruising, black stools or blood in urine to the prescriber."
            ),
            part(
              "Fluoroquinolone and heel pain",
              "Links the recent fluoroquinolone course (which carries a regulatory boxed warning for tendinitis and tendon rupture, with higher risk in people over 60 and on corticosteroids) to the new Achilles-region pain; holds heavy or eccentric calf loading and plyometrics, examines the Achilles for tendinopathy or partial rupture, and communicates with the prescriber.",
              "Ciprofloxacin plus age over 60 plus long-term prednisolone is the classic high-risk combination for fluoroquinolone-associated tendinopathy and rupture (a boxed warning). Her new posterior heel pain is the Achilles until proven otherwise: examine for tenderness, thickening, a gap and calf-squeeze response, stop heavy calf and eccentric loading and plyometrics for now, offload and tell the prescriber today."
            ),
            part(
              "Long-term corticosteroid and the injected knee",
              "Notes that long-term systemic corticosteroids raise fracture risk (osteoporosis), impair tendon and skin integrity and healing and blunt pain feedback, so progression is more conservative and falls prevention matters; respects the recent intra-articular injection on the other knee by avoiding high-load work on that joint for the period the injector advised and watching for post-injection flare or infection signs.",
              "Eighteen months of prednisolone means lower bone density and more fragile tendons and skin: progress resistance in smaller steps, avoid high-impact loading, add balance and falls prevention, and check her bone-health plan with the prescriber. For the injected knee, keep loading light for the period the injecting clinician set and watch for a hot, swollen joint or fever (post-injection flare versus infection), which goes straight back to them."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 2: Clinical reasoning, professionalism, communication... (1)
    // ------------------------------------------------------------------
    {
      slug: "ocs-prognosis-conversation-and-referrer-note",
      objective: "Communication with patients, referrers and the care team about prognosis and expectations",
      kind: "build",
      title: "A prognosis conversation and the note that goes with it",
      brief:
        "A fictional 42-year-old warehouse worker is 6 weeks into his third episode of low back pain in 2 years, off work for 3 weeks. STarT Back Screening Tool: total 7 of 9, psychosocial subscale 5 of 5 (high risk). He believes his 'disc has slipped out', is afraid that bending will make it worse, and his GP has asked you for an opinion and whether an MRI should be ordered. Examination: no red flags, normal neurological screen, flexion limited and painful with a directional preference for extension that centralizes his buttock pain, and marked guarding. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write (1) what you will say to him about his prognosis and plan, in plain language, (2) your note back to the GP, and (3) your answer to the MRI question.",
          parts: [
            part(
              "Prognosis conversation",
              "Gives an honest, non-catastrophizing prognosis in plain language: recurrent episodes and high psychosocial scores (fear, catastrophizing, low mood) raise the chance of persistent disabling pain, so the plan deliberately targets those factors; reframes the 'slipped disc' belief, explains that the spine is strong and that his back can tolerate graded movement, sets expectations (improvement over weeks with active care, flare-ups are normal), and ties the plan to a work-return goal.",
              "Something like: 'Your back is strong and nothing has slipped out of place. The reason this episode is dragging on is less about damage and more about how much it has frightened you and taken you out of work -- those are the things we can change. Most people in your position improve over the next few weeks with movement-based treatment, and flare-ups along the way are normal, not a sign of harm. We will start with the extension movements that already ease your leg pain, build up bending and lifting step by step, and plan your return to the warehouse with your employer.'"
            ),
            part(
              "Note to the GP",
              "Writes a concise referrer note: clinical impression (recurrent non-specific low back pain with a directional preference, high STarT Back risk), absence of red flags and neurological deficit, plan (stratified care: active, exercise-based treatment with a psychologically informed approach and graded return to work), expected timeline and review points, and what would prompt re-referral.",
              "Impression: recurrent non-specific low back pain, 6 weeks, extension directional preference with centralization, no red flags, neurological screen normal. STarT Back high risk (7/9, psychosocial 5/5) with fear-avoidance and belief in a 'slipped disc'. Plan: stratified, psychologically informed physiotherapy -- education and reassurance, directional-preference exercise progressing to graded loading and lifting, and a graded return-to-work plan with his employer; review at 3 and 6 weeks. Will re-refer for any red flag, new neurological deficit, or failure to progress by 6 weeks."
            ),
            part(
              "The MRI question",
              "Advises against MRI now: no red flags or progressive neurological deficit, and findings would be unlikely to change management while risking reinforcing his fear with incidental degenerative findings; states what would change that advice.",
              "I would not image now. With no red flags and a normal neurological exam, an MRI will not change what we do, and age-related findings on it are likely to feed his belief that something is damaged. If he develops progressive weakness, bladder or bowel change, or fails to improve after a proper trial of active care, we should revisit imaging together."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 3: Spine, pelvis and craniomandibular (3)
    // ------------------------------------------------------------------
    {
      slug: "ocs-neck-pain-after-minor-trauma",
      objective: "Cervical spine (12%): examination including vascular and ligamentous screening, treatment-based classification and intervention",
      kind: "case",
      title: "Neck pain and headache after a minor trauma",
      brief:
        "A fictional 38-year-old woman presents 5 days after a low-speed collision with neck pain and a new headache. She wants 'her neck cracked' because that helped a friend. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "History: right-sided neck pain radiating to the occiput, a dull headache that began 2 days after the collision, no dizziness, no visual disturbance, no facial numbness, no difficulty speaking or swallowing, no unsteadiness. She says the headache is 'like my usual tension headaches, just more of it'. She is a smoker; blood pressure today 148/94 mm Hg (she does not know her usual). No arm symptoms. She was ambulatory at the scene and the emergency department applied the Canadian C-Spine Rule and did not image.",
          ask: "Before any manual therapy, what screening do you complete and document, and what in this history changes your plan?",
          parts: [
            part(
              "Vascular screening",
              "Applies the IFOMPT cervical framework: takes a vascular-focused history (headache or neck pain 'unlike any other', recent trauma, dizziness, visual disturbance, facial paresthesia, dysphagia/dysarthria, unsteadiness), examines cranial nerves and the neurological system, records blood pressure and interprets the raised reading as a risk factor needing medical follow-up, and notes that positional (premanipulative) tests are no longer recommended because they do not predict risk.",
              "Use the IFOMPT framework. Ask specifically about dissection features: a new head or neck pain 'unlike any other', dizziness, visual change, facial numbness, speech or swallowing difficulty, unsteadiness or weakness -- she denies these and describes a familiar tension-type headache. Examine cranial nerves and the upper motor neuron screen. Record BP: 148/94 with smoking and recent trauma is a risk factor pattern, so refer the hypertension to her GP; premanipulative positional testing adds nothing and is not recommended."
            ),
            part(
              "Ligamentous and bony screening",
              "Checks upper cervical ligamentous integrity and instability signs given the trauma mechanism (for example alar ligament and transverse ligament tests, Sharp-Purser, and symptoms such as lump-in-throat, metallic taste, bilateral paresthesia, drop attacks), confirms the C-spine rule was applied, and states that any positive instability finding is a contraindication to manipulation and a referral.",
              "She had the Canadian C-Spine Rule applied and cleared. Because of the trauma, still screen craniovertebral ligaments and instability symptoms (Sharp-Purser and alar/transverse ligament stress tests; ask about a lump in the throat, metallic taste, lip or bilateral hand paresthesia, drop attacks). Any positive finding means no manipulation and a medical referral for imaging."
            ),
          ],
        },
        {
          text: "Screening is negative apart from the blood pressure, which you refer to her GP. Examination: pain and restriction of right rotation and extension, reproduced by segmental mobility testing at C2-3 and C5-6; the headache is reproduced with sustained pressure on the right C2-3 and eased with sustained traction; deep neck flexor endurance is poor; no arm symptoms; neurological exam normal. Neck Disability Index 20 of 50.",
          ask: "Classify her presentation and write the first two weeks of intervention.",
          parts: [
            part(
              "Classification",
              "Classifies her in the Neck Pain CPG framework as neck pain with headache (cervicogenic) with mobility deficits in the acute/subacute stage, and justifies it with the unilateral neck pain, headache reproduced by upper cervical provocation and relieved by traction, and segmental restriction.",
              "Neck pain with headache (cervicogenic headache) plus neck pain with mobility deficits, acute/subacute stage: unilateral neck pain and headache reproduced by sustained pressure at right C2-3 and eased by traction, with segmental mobility loss at C2-3 and C5-6 and no radicular signs."
            ),
            part(
              "Intervention plan",
              "Plans CPG-consistent care: cervical mobilization or manipulation (upper cervical and thoracic as indicated, with consent and within the negative screening), combined with exercise -- deep neck flexor and scapulothoracic strengthening, mobility and sustained self-stretches -- active education and encouragement to stay active, and a review of the plan with reassessment of pain, ROM and NDI at two weeks.",
              "Weeks 1-2: upper cervical (C2-3) and mid-cervical mobilization, thoracic manipulation if she consents and screening stays clear, each session paired with exercise -- craniocervical flexion endurance, scapular strengthening, active rotation and extension mobility and a sustained C1-2 self-stretch -- plus advice to stay active and keep working. Reassess rotation, headache frequency and the NDI at two weeks, and expect to add progressive strengthening from week three."
            ),
          ],
        },
        {
          text: "At 6 weeks: headache down from daily to twice a week, right rotation nearly full, Neck Disability Index 8 of 50 (from 20).",
          ask: "Interpret the change and decide what happens next.",
          parts: [
            part(
              "Interpretation",
              "States that a 12-point (24 percentage-point) fall on the NDI exceeds the published minimal clinically important difference for the NDI (whichever sourced figure the learner uses, it is well below 12 points), so the change is clinically meaningful, and ties it to the headache frequency and rotation gains.",
              "A drop from 20 to 8 (12 points, 24 percentage points) is well beyond the published NDI MCID, so this is real clinically important improvement, matching the headache falling from daily to twice a week and near-full rotation."
            ),
            part(
              "Next step",
              "Moves toward discharge: transitions to an independent strengthening and mobility program, plans a last review or a self-management check-in, confirms the GP is following up the blood pressure, and gives clear criteria for returning.",
              "Progress to discharge: hand over an independent program (deep neck flexor and scapular strengthening, mobility, posture breaks), confirm the GP has taken on the blood pressure, and book one final review or a check-in call. Tell her to come back early for new or different headache, dizziness, visual or speech symptoms, or arm symptoms."
            ),
          ],
        },
      ],
    },
    {
      slug: "ocs-lumbar-radicular-pain-then-a-new-symptom",
      objective: "Lumbar spine (19% of the body-region table): classification, examination, manual therapy, exercise and prognosis",
      kind: "case",
      title: "Lumbar radicular pain, then a new symptom",
      brief:
        "A fictional 46-year-old man has 10 days of low back pain radiating to the right calf after lifting a planter. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Examination: right calf pain to the lateral foot, worse sitting and bending; repeated extension in standing and prone centralizes the calf pain to the buttock and then to the back; flexion peripheralizes it. Right ankle plantarflexion is 4/5, right Achilles reflex diminished, light touch reduced on the lateral foot. Straight leg raise positive at 40 degrees on the right. No bladder or bowel change, no saddle numbness, left leg normal.",
          ask: "Classify the presentation, state the likely level, and write the first week's management.",
          parts: [
            part(
              "Classification and level",
              "Classifies as low back pain with radiating (radicular) pain showing centralization with extension -- directional preference extension -- and localizes the root to S1 (lateral foot sensation, Achilles reflex, plantarflexion weakness); notes the deficit is mild and stable, which allows conservative care with monitoring.",
              "Acute low back pain with related (radicular) leg pain, extension directional preference: repeated extension centralizes, flexion peripheralizes. Signs point to the right S1 root (lateral foot, diminished Achilles reflex, 4/5 plantarflexion, positive SLR at 40 degrees). A mild, stable deficit can be managed conservatively with close monitoring."
            ),
            part(
              "First week",
              "Prescribes CPG-consistent care: repeated extension/directional-preference exercise frequently through the day with monitoring for centralization, advice to stay active and avoid prolonged sitting/flexion loading in the acute phase, education about expected recovery, optional manual therapy, and explicit neurological re-check each visit with written red-flag advice (progressive weakness, bladder or bowel change, saddle numbness).",
              "Repeated prone extensions many times a day as long as the calf pain keeps centralizing; walking and staying active; limit long sitting and loaded bending for now; honest education that most radicular episodes improve over weeks. Recheck strength, reflex and sensation each visit. Give written safety-net advice: come to the emergency department for new bladder or bowel trouble, saddle numbness, or worsening leg weakness."
            ),
          ],
        },
        {
          text: "At the third visit (day 17) he reports that since yesterday he has had difficulty starting his urine stream and 'has not felt' the toilet paper when wiping. Back pain is slightly better; the left leg now feels 'heavy' too.",
          ask: "What is this, and what do you do right now?",
          parts: [
            part(
              "Recognition",
              "Recognizes possible cauda equina syndrome: new urinary retention/hesitancy, saddle (perianal) sensory loss and new bilateral leg symptoms, and states it is a surgical emergency regardless of improving back pain.",
              "This is possible cauda equina syndrome: new urinary hesitancy/retention, saddle anesthesia and new bilateral leg involvement. It does not matter that his back feels better -- this is a surgical emergency."
            ),
            part(
              "Action",
              "Stops treatment and arranges immediate emergency assessment (emergency department now, with urgent MRI), documents the findings and times, speaks to the emergency team or physician directly, and does not delay for further physiotherapy testing; explains the urgency to the patient clearly and kindly.",
              "Stop the session. Send him to the emergency department now for urgent assessment and MRI -- call ahead and speak to the team, note the time symptoms began and your findings, and make sure he has transport. Explain that nerves to the bladder and bowel may be compressed and that acting today protects them."
            ),
          ],
        },
        {
          text: "He has an emergency discectomy at L5-S1 for a large central disc herniation. Six weeks after surgery he returns: bladder function has recovered, saddle sensation is nearly normal, right plantarflexion is 4/5, he is walking 30 minutes, and the surgeon has cleared him for progressive rehabilitation. Oswestry Disability Index 30%.",
          ask: "Set his rehabilitation plan and the outcome measures you will track to discharge.",
          parts: [
            part(
              "Plan",
              "Plans progressive, graded loading within surgical guidance: walking progression, hip and trunk strengthening, calf strengthening for the S1 deficit, graded flexion and lifting re-education, return-to-work planning, and avoidance of fear-driven over-protection; coordinates with the surgeon for any restrictions.",
              "Graded loading from week 6 within the surgeon's limits: build walking to daily brisk sessions, hip and trunk strengthening, specific calf strengthening and single-leg heel raises for the right S1 weakness, progressive bending and lifting re-education, then work-task simulation for his return. Keep him confident and moving rather than protective."
            ),
            part(
              "Outcome measures",
              "Tracks the ODI with its published MCID (any sourced value accepted) and a patient-specific functional measure, plus plantarflexion strength/heel-raise repetitions and sensation, and defines discharge criteria.",
              "Track the Oswestry (30% now; look for change beyond its published MCID), a Patient-Specific Functional Scale for his own goals, single-leg heel-raise count side to side and the S1 sensory map. Discharge when he lifts and works without symptom flare, heel-raise symmetry is close to the left, and ODI has fallen meaningfully."
            ),
          ],
        },
      ],
    },
    {
      slug: "ocs-neurogenic-or-vascular-claudication",
      objective: "Recognize lumbar spinal stenosis: neurogenic claudication, relief with forward flexion (the shopping-cart sign) and stairs that feel easier going up than coming down",
      kind: "build",
      title: "Neurogenic or vascular claudication?",
      brief:
        "A fictional 72-year-old man reports bilateral buttock and calf 'heaviness' that comes on after walking about 150 meters and stops him. He is a former smoker with hypertension. He says he can push a shopping trolley around a supermarket for 40 minutes without trouble, finds cycling easy, and notices that walking downhill or down stairs is worse than going up. Standing still does not help much; sitting for a few minutes does. Lumbar extension in standing for 30 seconds reproduces the leg heaviness; flexion relieves it. Pedal pulses are palpable but weak bilaterally; feet are warm with normal hair and skin. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write your differential, the examination findings that separate the two main causes, and the management plan including referral.",
          parts: [
            part(
              "Differential and the discriminating features",
              "Names neurogenic claudication from lumbar spinal stenosis as the leading diagnosis and vascular (intermittent) claudication from peripheral artery disease as the key alternative; explains the discriminators -- posture dependence (relief with flexion/sitting, worse with extension and downhill, the shopping-cart sign, cycling tolerated) points to neurogenic, while vascular claudication is relieved by standing still regardless of posture and reproduced by any muscular work including cycling -- and notes the two can coexist in a 72-year-old former smoker.",
              "Leading diagnosis: neurogenic claudication from lumbar spinal stenosis -- symptoms depend on posture, not just effort: flexion over a trolley and cycling are fine, extension and downhill walking are worse, and he needs to sit (not just stand) to recover. Vascular claudication would ease simply by standing still and would come on with cycling too. With his age, smoking history and weak pulses, both could coexist, so the vascular question is not closed."
            ),
            part(
              "Vascular work-up",
              "Recognizes that weak pedal pulses in a former smoker with hypertension warrant a vascular assessment (ankle-brachial index and medical review for peripheral artery disease) via the physician, and that a diagnosis of stenosis does not exclude PAD; adds a check for other mimics (hip osteoarthritis, neuropathy).",
              "Weak pedal pulses in a 72-year-old ex-smoker with hypertension mean PAD needs ruling in or out: ask his physician for an ankle-brachial index and vascular review. Also screen the hips (OA can mimic buttock claudication) and sensation (neuropathy), because stenosis and PAD commonly travel together."
            ),
            part(
              "Management",
              "Writes a stenosis-appropriate plan: flexion-biased exercise and positioning, hip and trunk strengthening, cycling or body-weight-supported/inclined treadmill walking for conditioning, manual therapy as tolerated, pacing with a walking program that uses flexion rest breaks, education, and clear referral criteria (progressive neurological deficit, bladder or bowel change, or vascular findings).",
              "For the stenosis: flexion-biased mobility and positioning, hip flexor and hamstring flexibility, hip and trunk strengthening, cycling for cardiovascular fitness and a graded walking program with planned sitting or flexion breaks, with the treadmill set to an incline if he tolerates it better. Educate him that the condition is manageable and that fitness protects him. Refer urgently for progressive weakness, falls, or bladder/bowel change, and to the vascular pathway if the ABI is abnormal."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 4: Upper extremity (2)
    // ------------------------------------------------------------------
    {
      slug: "ocs-shoulder-dislocation-two-ages",
      objective: "Shoulder and shoulder girdle (14%): rotator cuff, instability, adhesive capsulitis and post-surgical management",
      kind: "case",
      title: "A first-time dislocation at 19 and at 62",
      brief:
        "Two fictional patients each sustained a first-time traumatic anterior shoulder dislocation, reduced in the emergency department 10 days ago, with radiographs reported as 'no fracture'. Fictional patients; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Patient 1 is a 19-year-old rugby player. Examination: sling removed, elevation 150 degrees, apprehension at 90 degrees abduction and external rotation relieved by a relocation test, external rotation strength 5/5, deltoid sensation normal, no cuff weakness.",
          ask: "What is your assessment, what do you tell him about his future risk, and what is the plan for the next 6 weeks?",
          parts: [
            part(
              "Assessment and risk",
              "Identifies anterior instability after a first traumatic dislocation in a young contact athlete with intact cuff and axillary nerve, and explains honestly that recurrence risk is high in this age and sport profile, so a surgical opinion (stabilization) is a reasonable discussion alongside rehabilitation.",
              "Traumatic anterior instability with a positive apprehension/relocation sign, cuff and axillary nerve intact. At 19 in a collision sport his recurrence risk is high, so he should hear both options now: a dedicated rehabilitation program and an orthopedic opinion about stabilization surgery."
            ),
            part(
              "Six-week plan",
              "Writes a staged plan: early protected motion avoiding the provocative abduction-external-rotation range, progressive rotator cuff and scapular stabilizer strengthening, proprioceptive and closed-chain work, then return-to-sport criteria (symmetrical strength, no apprehension, sport-specific loading) with a realistic timeline and advice on contact.",
              "Weeks 1-2: protected active motion short of the apprehension range, isometric cuff and scapular work. Weeks 3-6: progressive cuff (especially external rotation and subscapularis) and periscapular strengthening, closed-chain and perturbation work, gradually into abduction-external rotation. No contact until strength is near-symmetrical, apprehension is gone and he passes sport-specific tests -- and the surgical conversation happens in parallel."
            ),
          ],
        },
        {
          text: "Patient 2 is a 62-year-old gardener. Examination: cannot actively elevate beyond 70 degrees although passive elevation reaches 140 degrees with pain; external rotation strength 3/5 with a positive external rotation lag sign; sensation over the lateral deltoid is reduced and deltoid contraction is weak; no apprehension.",
          ask: "What do these findings mean, and what do you do?",
          parts: [
            part(
              "Interpretation",
              "Recognizes that in an older patient a dislocation commonly tears the rotator cuff rather than the labrum, and that the active-passive gap with a positive lag sign suggests a significant cuff tear (likely supraspinatus/infraspinatus), while reduced deltoid sensation and weakness point to an axillary nerve injury.",
              "At 62 the weak link is the cuff, not the labrum: a big active-passive gap and a positive external rotation lag sign suggest a substantial posterosuperior cuff tear. Reduced lateral deltoid sensation with deltoid weakness means the axillary nerve was injured in the dislocation."
            ),
            part(
              "Action",
              "Refers promptly to orthopedics for imaging (ultrasound or MRI) because an acute traumatic cuff tear in an active patient is time-sensitive for repair, documents and communicates the axillary nerve findings (and asks about electrodiagnostic follow-up if they persist), and in the meantime maintains passive and assisted range, scapular work and pain management without heavy loading.",
              "Contact the orthopedic team this week for imaging (ultrasound or MRI): an acute traumatic cuff tear is time-sensitive if repair is being considered, and the axillary nerve findings need documenting and monitoring (nerve conduction studies if not recovering). Meanwhile: passive and assisted elevation, scapular setting, gentle isometrics, pain management, no heavy loading."
            ),
          ],
        },
      ],
    },
    {
      slug: "ocs-distal-radius-fracture-and-hand-numbness",
      objective: "Forearm, wrist and hand (3%): fracture, tendon and nerve conditions and their rehabilitation",
      kind: "build",
      title: "After a distal radius fracture: stiffness and night-time numbness",
      brief:
        "A fictional 58-year-old woman is referred 7 weeks after volar plate fixation of a distal radius fracture; the surgeon's note says 'full active and passive motion, progressive strengthening as tolerated, no restrictions'. Wrist extension 35 degrees, flexion 30 degrees, supination 50 degrees, grip 12 kg versus 28 kg on the other side. She also reports numbness and tingling in the thumb, index and middle fingers that wakes her at night and improves when she shakes her hand; the little finger is unaffected. Patient-Rated Wrist Evaluation score 62 of 100. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write your evaluation: the rehabilitation plan for the fracture, what the numbness most likely is and how you confirm and manage it, and how you will measure change.",
          parts: [
            part(
              "Fracture rehabilitation",
              "Plans progressive rehabilitation consistent with the surgeon's clearance: active and passive mobility for extension, flexion and forearm rotation (including end-range holds and joint mobilization as tolerated), scar and edema management, graded grip and forearm strengthening, functional task practice, with monitoring for tendon irritation over the plate and complex regional pain signs.",
              "With no restrictions at 7 weeks: daily active and passive wrist extension/flexion and supination with sustained end-range holds, wrist and radioulnar joint mobilization as tolerated, scar and swelling care, then graded grip and forearm strengthening (putty, light weights, functional tasks like jar opening). Watch for flexor tendon irritation over the volar plate and for disproportionate pain, swelling or color change (CRPS) that should go back to the surgeon."
            ),
            part(
              "The numbness",
              "Identifies carpal tunnel syndrome (median neuropathy at the wrist) as the most likely cause -- night numbness in the thumb, index and middle fingers relieved by shaking, little finger spared, after a distal radius fracture -- confirms with provocative tests (for example Phalen, Tinel at the carpal tunnel, carpal compression), examines thenar strength and two-point discrimination, screens the cervical spine (C6 radiculopathy) as a differential, and manages with night splinting in neutral, nerve-gliding and activity modification while informing the surgeon, with escalation (electrodiagnosis, surgical opinion) for weakness, thenar wasting or constant numbness.",
              "Classic carpal tunnel syndrome after a distal radius fracture: nocturnal paresthesia in the median distribution eased by the flick maneuver, little finger spared. Confirm with Phalen, Tinel at the carpal tunnel and carpal compression, check thenar (APB) strength and two-point discrimination, and screen C6 radiculopathy. Start a neutral wrist splint at night, median nerve gliding and activity changes, and tell the surgeon. Constant numbness, thenar weakness or wasting means electrodiagnostic testing and a surgical opinion."
            ),
            part(
              "Measuring change",
              "Chooses the PRWE as the primary patient-reported measure and interprets change against its published MCID of 11.5 points in distal radius fracture, plus goniometry and dynamometer grip compared with the other side, and sets discharge targets.",
              "Primary measure: the PRWE (62 now); a fall of more than 11.5 points is a clinically important improvement in distal radius fracture patients. Add wrist/forearm goniometry and grip dynamometry as a percentage of the other hand, and set targets such as grip above 80% of the left and PRWE under 20 for discharge."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 5: Lower extremity (2)
    // ------------------------------------------------------------------
    {
      slug: "ocs-acl-return-to-sport-decision",
      objective: "Thigh and knee (14%): ligament, meniscal, patellofemoral and post-surgical rehabilitation with return-to-activity criteria",
      kind: "case",
      title: "Clearing a footballer to return after ACL reconstruction",
      brief:
        "A fictional 21-year-old semi-professional footballer had a hamstring-graft ACL reconstruction. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At 12 weeks: full extension, flexion 130 degrees, trace effusion after training, quadriceps limb symmetry index on isokinetic testing 68%, hop testing not yet performed. He asks to start straight-line running this week.",
          ask: "Decide whether he can start running and what criteria you use, and set the next phase.",
          parts: [
            part(
              "Running decision",
              "Uses criteria rather than time alone: full extension, no reactive effusion, a quadriceps symmetry index that meets the program's pre-running threshold (his 68% does not, whatever threshold is used) and good single-leg control before running; so delays running, or allows only a very gradual walk-jog start once effusion and strength criteria are met, and explains why.",
              "Not quite yet. He has the motion, but a quadriceps index of 68% and a knee that still swells after training say the quads are not ready to absorb impact. Set the gate as no reactive effusion, a quadriceps index at the program's pre-running threshold, and clean single-leg squat control; then begin a graded walk-jog progression. Re-test in 2 weeks."
            ),
            part(
              "Next phase",
              "Plans the strength and neuromuscular phase: progressive quadriceps and hamstring strengthening (open- and closed-chain within graft considerations), single-leg power and landing mechanics, trunk and hip control, and effusion monitoring as a progression brake.",
              "Weeks 12-16: heavy progressive quadriceps work (leg press, knee extension in the mid range, split squats), hamstring strengthening respecting the graft donor site, single-leg balance and landing mechanics with valgus control, hip and trunk strength. Any effusion the next morning is the signal to back off."
            ),
          ],
        },
        {
          text: "At 9 months he has trained with the squad for 6 weeks. Test battery: quadriceps isokinetic strength index 92%, single hop 94%, crossover hop 91%, triple hop 93%, 6 m timed hop 95%, hamstring index 88%, ACL-Return to Sport after Injury (ACL-RSI) score 48 of 100. Knee is quiet. The coach wants him in Saturday's match.",
          ask: "Make the return-to-sport decision with your reasoning.",
          parts: [
            part(
              "Reasoning",
              "Weighs the evidence: time since surgery (at least 9 months -- reinjury rates fell about 51% for each month of delayed return up to 9 months in the Delaware-Oslo cohort), strength and hop symmetry at or above 90% (quadriceps symmetry below 90% was associated with reinjury), hamstring index just below 90%, and a low psychological readiness score (ACL-RSI 48) -- so he meets most physical criteria but is not fully ready.",
              "He clears the main bars: 9 months post-op (the Delaware-Oslo data showed reinjury risk falling 51% per month until 9 months), quadriceps and all hop tests above 90% symmetry. Two gaps: hamstring index 88% (just under) and an ACL-RSI of 48 -- he does not feel ready, and low psychological readiness is linked with not returning or re-injuring."
            ),
            part(
              "Decision",
              "Makes a shared decision with a graded plan rather than a binary yes: continue full training including contact, address the hamstring deficit and fear with targeted loading and graded exposure, and set a short re-test (for example 2-4 weeks) with explicit criteria before competitive match play; communicates this to the coach and surgeon.",
              "Not Saturday. Keep him in full training including contact drills, push hamstring strength above 90%, use graded exposure and video of his own cutting to build confidence, and re-test in 2-4 weeks including the ACL-RSI. Agree the plan with him, the coach and the surgeon so the message is consistent."
            ),
          ],
        },
      ],
    },
    {
      slug: "ocs-lateral-ankle-sprain-plan",
      objective: "Leg, ankle and foot (9%): ankle sprain, Achilles and plantar conditions, fracture and tendinopathy management",
      kind: "build",
      title: "Lateral ankle sprain: from day 3 to return to play",
      brief:
        "A fictional 27-year-old recreational basketball player sprained her right ankle landing on an opponent's foot 3 days ago. Radiographs (ordered because she could not bear weight for four steps at the time) were negative. Now: lateral swelling, tenderness over the anterior talofibular ligament, a positive anterior drawer with a soft end-feel, negative squeeze and external rotation tests, she can walk with a limp. Foot and Ankle Ability Measure: ADL 55%, Sports 20%. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write your diagnosis and grade, the plan from now to return to basketball with the criteria that gate each stage, and how you will measure recovery.",
          parts: [
            part(
              "Diagnosis",
              "Diagnoses a lateral ankle sprain involving the anterior talofibular ligament, moderate (grade II) based on laxity with a soft end-feel and functional loss, and notes that negative squeeze and external rotation tests make a syndesmotic (high ankle) sprain unlikely; the earlier Ottawa criteria appropriately led to radiographs, which were negative.",
              "Grade II lateral ankle sprain of the ATFL: laxity on anterior drawer with a soft end-feel, swelling and an antalgic gait, but she can walk. Negative squeeze and external rotation tests argue against a syndesmotic injury, and the Ottawa rules were correctly applied with negative films."
            ),
            part(
              "Staged plan and criteria",
              "Plans CPG-consistent early functional rehabilitation rather than immobilization: protected weight-bearing with external support, early active range of motion and progressive loading, manual therapy as indicated for pain and dorsiflexion, then balance and neuromuscular training (a key component for preventing recurrence), progressing to hopping, cutting and sport-specific drills; gates each stage on criteria such as pain-free walking, symmetrical dorsiflexion, single-leg balance and hop symmetry.",
              "Early functional rehab, not a cast: a lace-up brace with weight-bearing as tolerated, active ROM and cryotherapy from now, manual therapy for pain and dorsiflexion as needed. Gate 1 (pain-free walking, swelling settling): calf and peroneal strengthening and single-leg balance. Gate 2 (symmetrical dorsiflexion, 30-second single-leg stance on firm and foam): hopping, landing and change of direction. Gate 3 (hop tests above 90% of the left, no apprehension cutting): sport-specific drills then full practice with the brace for the first weeks back."
            ),
            part(
              "Measuring recovery",
              "Uses the FAAM ADL and Sports subscales interpreted against their MCIDs (8 and 9 points) and objective markers (dorsiflexion lunge symmetry, single-leg balance, hop tests), and defines return-to-play and discharge thresholds.",
              "Repeat the FAAM every two weeks: changes of at least 8 points (ADL) and 9 points (Sports) are clinically important. Track the weight-bearing lunge for dorsiflexion, single-leg balance time and hop-test symmetry. Return to play when FAAM Sports is in the 90s, hop symmetry is above 90% and she is cutting without apprehension."
            ),
          ],
        },
      ],
    },
  ],
};
