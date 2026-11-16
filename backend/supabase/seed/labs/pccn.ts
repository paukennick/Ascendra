import { CLINICAL_SAFETY, part, orderPart, matchPart, selectPart, numericPart, type SeedLabSet } from "./types";
import { source } from "../sources";
import { PCCN_HANDBOOK_URL, PCCN_SIM_OBJECTIVES } from "../tracks/pccn";

// REQ-277: Prep for the PCCN Exam, authored labs.
//
// Aligned to the PCCN Test Plan (exams on and after 2024-02-06; handbook
// July 2026, read 2026-11-14), as seeded in seed/tracks/pccn.ts. Density
// (docs/labs.md, "hybrid"): one lab per unit plus six by weight, at most
// three per unit -- 2/2/1/1/2/1/1/1/2/1/2/2 = 18, one lab per objective.
// Every patient is fictional; this is exam practice, not clinical guidance.
// Each lab's values rest on the sources in value-sources.ts (REQ-142), or the
// entry says why it names none.

export const PCCN_LABS: SeedLabSet = {
  trackCode: "PCCN",
  sources: [source(PCCN_HANDBOOK_URL, "exam_outline", "2026-11-14")],
  labs: [
    // ---------------------------------------------------------------- Cardiovascular (20%) -- 2
    {
      slug: "pccn-femoral-access-bleed",
      objective: PCCN_SIM_OBJECTIVES.accessBleed,
      kind: "case",
      title: "Back pain three hours after a femoral catheterization",
      brief:
        "A fictional 71-year-old woman is on a progressive care unit three hours after a diagnostic catheterization through the right femoral artery, with a closure device. She takes apixaban at home (held before the procedure) and received heparin during the case. Admission vital signs: BP 132/74 mm Hg, HR 78 /min.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She now reports a dull ache in her lower back and right flank. BP 104/62 mm Hg, HR 102 /min, skin cool. The groin dressing is dry and there is no visible hematoma. Distal pulses are present.",
          ask: "What do you suspect, and what do you do before any lab result returns?",
          parts: [
            part(
              "Suspicion",
              "Names retroperitoneal bleeding from the femoral access, citing back or flank pain with falling blood pressure and rising heart rate after anticoagulation, and notes that a dry groin does not rule it out.",
              "Retroperitoneal hemorrhage: blood tracks behind the peritoneum from a high or back-wall femoral puncture, so the groin can look clean. Back or flank pain plus a falling BP and rising HR after heparin is the classic picture."
            ),
            part(
              "First actions",
              "Calls the provider or rapid response at once, keeps her flat, ensures large-bore IV access and starts fluid per orders, increases vital-sign frequency, sends a type and screen with a hemoglobin, and anticipates imaging and reversal decisions; does not wait for the hemoglobin.",
              "Escalate now (provider and rapid response per policy). Keep her flat, check two large-bore IVs, start fluid as ordered, vital signs every 5-15 minutes, send CBC and type and screen, and prepare for CT and possible transfusion. The hemoglobin lags behind the bleed, so act on the trend."
            ),
          ],
        },
        {
          text: "Twenty minutes later BP is 92/58 mm Hg and HR 112 /min after 500 mL of crystalloid. Hemoglobin returns 9.1 g/dL (11.8 g/dL this morning).",
          ask: "How do you read the hemoglobin and what do you hand off?",
          parts: [
            part(
              "Reading the hemoglobin",
              "Explains that the drop of nearly 3 g/dL is significant and still understates the loss because hemoglobin falls only as fluid dilutes the blood; the hemodynamic trend matters more than the number.",
              "A fall from 11.8 to 9.1 is large, and early in a bleed hemoglobin understates loss until fluid shifts in. The persistent hypotension and tachycardia after fluid say she is still bleeding."
            ),
            part(
              "SBAR",
              "Gives a concise SBAR naming the procedure, anticoagulation, the vital-sign trend, the response to fluid and the hemoglobin, and asks for a bedside evaluation, imaging and blood.",
              "S: post-cath patient with suspected retroperitoneal bleed, hypotensive and tachycardic. B: right femoral access 3 h ago, heparin in the lab, home apixaban. A: BP 92/58, HR 112 despite 500 mL, Hgb 11.8 to 9.1, back and flank pain. R: please come now; I'd like CT, blood products ready and guidance on anticoagulation reversal."
            ),
          ],
        },
      ],
    },
    {
      slug: "pccn-rhythm-and-qtc",
      objective: "Monitor QTc intervals and ST segments, and select monitoring leads for the patient's disease",
      kind: "build",
      title: "Calculate a QTc and choose the monitoring leads",
      brief:
        "A fictional 58-year-old man on telemetry is receiving IV haloperidol for agitation and has a potassium of 3.2 mmol/L. His rhythm strip shows a regular rhythm with an R-R interval of 0.80 seconds and a measured QT of 0.44 seconds. A second fictional patient is admitted after an inferior myocardial infarction.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the corrected QT (Bazett), say what you do with the result, and choose leads for the second patient.",
          parts: [
            numericPart(
              "QTc (Bazett), in milliseconds",
              "QTc = QT / square root of R-R = 0.44 / 0.894 = about 492 ms (within 10 ms).",
              "QTc = 0.44 s / sqrt(0.80 s) = 0.44 / 0.894 = 0.492 s, about 492 ms.",
              { answer: 492, tolerance: 10, partialTolerance: 25, unit: "ms" }
            ),
            part(
              "Action",
              "Recognizes a prolonged QTc with two added risks (a QT-prolonging drug and hypokalemia), reports it, asks about holding or changing haloperidol, and anticipates potassium and magnesium replacement and torsades de pointes precautions.",
              "Around 490 ms is prolonged, and haloperidol plus low potassium raise the risk of torsades. Report it, ask whether haloperidol should be held or replaced, replace potassium and check magnesium as ordered, and keep him on continuous monitoring with the defibrillator nearby."
            ),
            part(
              "Leads after inferior MI",
              "Chooses leads that view the inferior wall (II, III or aVF) for ST monitoring, and keeps V1 for rhythm when the monitor allows.",
              "Monitor ST in an inferior lead (III or aVF, or II) to catch reinfarction, with V1 for arrhythmia diagnosis where the system offers a second lead."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Respiratory (14%) -- 2
    {
      slug: "pccn-copd-niv-case",
      objective: PCCN_SIM_OBJECTIVES.copdNiv,
      kind: "case",
      title: "A COPD exacerbation on a non-rebreather",
      brief:
        "A fictional 66-year-old man with COPD is admitted with three days of worsening breathlessness and green sputum. The emergency department placed him on a non-rebreather mask. He is drowsy but rousable.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "SpO2 99% on the non-rebreather. RR 28 /min, using accessory muscles. Arterial blood gas: pH 7.29, PaCO2 68 mm Hg, HCO3- 32 mEq/L, PaO2 140 mm Hg.",
          ask: "Interpret the gas and say what you change first.",
          parts: [
            part(
              "Gas",
              "Identifies acute-on-chronic respiratory acidosis: low pH, high PaCO2, raised bicarbonate showing earlier partial compensation, with hyperoxemia.",
              "pH 7.29 with PaCO2 68 is respiratory acidosis; the HCO3- of 32 shows chronic metabolic compensation that has been overwhelmed: acute-on-chronic hypercapnic failure. PaO2 140 is far more than he needs."
            ),
            part(
              "First change",
              "Titrates oxygen down to a controlled device to a target of 88-92% because excess oxygen worsens hypercapnia in at-risk patients, and escalates for noninvasive ventilation given pH below 7.35 with a high PaCO2.",
              "Switch to a controlled device (Venturi mask) aiming for SpO2 88-92%: uncontrolled high oxygen worsens CO2 retention. With pH under 7.35 and rising CO2, call for BiPAP now."
            ),
          ],
        },
        {
          text: "He is placed on BiPAP. One hour later: pH 7.25, PaCO2 76 mm Hg. He is harder to rouse and the mask is leaking at the cheeks.",
          ask: "What does this mean and what do you do?",
          parts: [
            part(
              "Meaning",
              "Recognizes noninvasive ventilation is failing (worsening acidosis and CO2, falling consciousness) and that a large leak may be contributing.",
              "Worsening pH and PaCO2 with more drowsiness after an hour means BiPAP is not working, partly because a leaking mask is not delivering pressure."
            ),
            part(
              "Action",
              "Refits the mask or changes interface, checks settings with the respiratory therapist, and escalates immediately for intensive care and possible intubation; reviews goals of care.",
              "Refit or change the mask with respiratory therapy, but do not wait: call the provider and rapid response for ICU transfer and possible intubation, and confirm his wishes about intubation if not already known."
            ),
          ],
        },
      ],
    },
    {
      slug: "pccn-oxygen-device-match",
      objective: "Choose between nasal cannula, Venturi mask, non-rebreather, high-flow nasal oxygen, CPAP and BiPAP",
      kind: "build",
      title: "Match each patient to an oxygen or ventilation device",
      brief:
        "Five fictional adults on a progressive care unit need oxygen or ventilatory support. Pick the best first device for each.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each patient to a device, and explain the one you found hardest.",
          parts: [
            matchPart(
              "Patient to device",
              "All five pairs right: COPD with a controlled need, Venturi; obstructive sleep apnea at night, CPAP; acute hypercapnic acidosis, BiPAP; mild hypoxemia, nasal cannula; severe hypoxemic pneumonia without hypercapnia, high-flow nasal oxygen.",
              "Venturi gives a fixed FiO2 for the COPD patient who needs a controlled target; CPAP splints the upper airway in OSA; BiPAP adds pressure support to blow off CO2; a nasal cannula is enough for mild hypoxemia; high-flow nasal oxygen delivers high FiO2 and some PEEP in hypoxemic failure.",
              {
                left: [
                  "COPD patient needing a precise SpO2 of 88-92%",
                  "Known obstructive sleep apnea, desaturating asleep",
                  "pH 7.30 and PaCO2 62 mm Hg in a COPD exacerbation",
                  "SpO2 91% on room air after surgery, comfortable",
                  "Pneumonia, SpO2 86% on 6 L nasal cannula, PaCO2 34 mm Hg",
                ],
                right: ["Venturi mask", "CPAP", "BiPAP", "Nasal cannula", "High-flow nasal oxygen", "Simple face mask"],
                pairs: [0, 1, 2, 3, 4],
                leftHeading: "Patient",
                rightHeading: "Device",
              }
            ),
            part(
              "Reasoning",
              "Explains one choice in terms of the physiology (oxygenation versus ventilation), and names one sign that would make the device inadequate.",
              "For example: the pneumonia patient's problem is oxygenation, not CO2, so high flow fits; rising work of breathing, SpO2 still under target on high FiO2, or a rising PaCO2 means escalation."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Endocrine (6%) -- 1
    {
      slug: "pccn-insulin-infusion-transition",
      objective: "Hold insulin until potassium is above 3.5 mmol/L, add dextrose as glucose falls, and overlap basal insulin before stopping an infusion",
      kind: "case",
      title: "Running and stopping an insulin infusion in DKA",
      brief:
        "A fictional 24-year-old woman with type 1 diabetes is transferred to progressive care on an IV regular insulin infusion for diabetic ketoacidosis.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "On arrival: glucose 238 mg/dL, potassium 3.3 mmol/L, pH 7.21, beta-hydroxybutyrate 4.1 mmol/L. The infusion is running and the IV fluid is 0.9% saline without dextrose.",
          ask: "What concerns you and what do you ask for?",
          parts: [
            part(
              "Potassium",
              "Recognizes potassium below 3.5 mmol/L as a reason to pause insulin and replace potassium first, because insulin drives potassium into cells and can cause dangerous hypokalemia.",
              "Potassium 3.3 is below 3.5: insulin should be held while potassium is replaced, then restarted, with cardiac monitoring."
            ),
            part(
              "Dextrose",
              "Notes glucose has fallen below 250 mg/dL while ketoacidosis persists, so dextrose should be added to the fluids to continue insulin safely until ketosis clears.",
              "Glucose under 250 with ongoing acidosis: add dextrose (for example 5-10%) so insulin can keep clearing ketones without hypoglycemia."
            ),
          ],
        },
        {
          text: "Next morning: pH 7.34, bicarbonate 20 mmol/L, beta-hydroxybutyrate 0.4 mmol/L. She is eating. The team plans to stop the infusion at noon.",
          ask: "Is DKA resolved, and how do you stop the infusion safely?",
          parts: [
            part(
              "Resolution",
              "States DKA is resolved by ketones below 0.6 mmol/L with pH at least 7.3 (or bicarbonate at least 18), not by the anion gap.",
              "Yes: beta-hydroxybutyrate 0.4 (below 0.6) with pH 7.34 meets the 2024 consensus resolution criteria."
            ),
            part(
              "Transition",
              "Gives subcutaneous basal insulin 1-2 hours before stopping the infusion and keeps checking glucose, so ketoacidosis does not rebound.",
              "Give the basal insulin dose 1-2 hours before the drip stops, start mealtime insulin, and keep point-of-care glucose checks; stopping the infusion without overlap lets ketosis return within hours."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Hematology/Immunology/Oncology (3%) -- 1
    {
      slug: "pccn-hit-platelets",
      objective: "Recognize heparin-induced thrombocytopenia from a falling platelet count on heparin, stop all heparin and anticipate a non-heparin anticoagulant",
      kind: "case",
      title: "A falling platelet count on day 7 of heparin",
      brief:
        "A fictional 63-year-old man is on a heparin infusion for a deep vein thrombosis after knee surgery. His platelet count was 240,000/mm3 on admission.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Day 7: platelets 104,000/mm3. His left calf is newly swollen and painful. The heparin flush on his PICC is also running.",
          ask: "What do you suspect, and what do you do?",
          parts: [
            part(
              "Suspicion",
              "Names heparin-induced thrombocytopenia: a fall of more than half from baseline, 5-10 days into heparin, with a new thrombosis.",
              "HIT: platelets fell by more than 50% (240 to 104) on day 7 of heparin, and he has a new clot. HIT is prothrombotic despite the low count."
            ),
            part(
              "Actions",
              "Stops all heparin including flushes and heparin-coated lines, notifies the provider, anticipates a non-heparin anticoagulant and HIT antibody testing, does not give platelets for prophylaxis, and flags the allergy.",
              "Stop the infusion AND the heparin flushes; tell the provider now; expect a non-heparin anticoagulant (such as argatroban) and HIT testing; avoid prophylactic platelet transfusion; record heparin as an allergy."
            ),
          ],
        },
        {
          text: "His wife asks why he needs another blood thinner if his platelets are low.",
          ask: "Explain it to her in plain words.",
          parts: [
            part(
              "Teaching",
              "Explains in plain language that the immune reaction to heparin makes platelets clump and form clots, so the count falls while clotting risk rises, and a different blood thinner protects against new clots.",
              "\"His body reacted to heparin by making antibodies that activate his platelets. They clump into clots, which uses them up, so the count drops even though he is clotting more. A different blood thinner that doesn't trigger the reaction stops new clots while it settles.\""
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Neurology (7%) -- 2
    {
      slug: "pccn-new-deficit-stroke",
      objective: "Establish the last-known-well time, check glucose and activate the stroke response for a new deficit",
      kind: "case",
      title: "New slurred speech on a cardiac unit",
      brief:
        "A fictional 77-year-old woman admitted for heart failure is found at 10:40 with slurred speech and a left facial droop. She was talking normally when her breakfast tray arrived at 08:30. She has atrial fibrillation and her apixaban was held yesterday for a planned procedure.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "BP 196/104 mm Hg, HR 92 irregular, glucose not yet checked.",
          ask: "Put your first actions in order.",
          parts: [
            orderPart(
              "First actions",
              "Order: activate the stroke response, check glucose, establish last known well, score the NIHSS, keep NPO pending a swallow screen.",
              "Activating the team first starts the clock-sensitive pathway; glucose rules out the commonest mimic; last known well (08:30, not 10:40) sets eligibility; the NIHSS documents the deficit; nothing by mouth until a swallow screen.",
              [
                "Activate the stroke response team",
                "Check point-of-care glucose",
                "Establish last known well as 08:30",
                "Score the NIH Stroke Scale",
                "Keep her NPO until a bedside swallow screen",
              ]
            ),
            part(
              "Why 08:30",
              "Explains that last known well is when she was last seen at baseline, not when the deficit was found.",
              "She was last seen normal at 08:30, so that is the onset time for treatment decisions, about two hours before discovery."
            ),
          ],
        },
        {
          text: "The team considers IV thrombolysis.",
          ask: "What blood pressure must be reached first, and what do you monitor afterward?",
          parts: [
            part(
              "Blood pressure",
              "States BP must be below 185/110 mm Hg before thrombolysis and kept below 180/105 mm Hg for at least 24 hours after, so 196/104 must be lowered first with a titratable agent.",
              "Below 185/110 before the drug; her 196/104 needs treatment first. After it, keep below 180/105 for at least 24 hours."
            ),
            part(
              "Monitoring",
              "Names frequent neurological checks and vital signs, and stopping the infusion and escalating for a new headache, vomiting, worsening deficit or angioedema.",
              "Frequent neuro checks and BP per protocol; stop the infusion and call at once for a sudden headache, nausea and vomiting, a worse NIHSS or angioedema, which suggest bleeding or a reaction."
            ),
          ],
        },
      ],
    },
    {
      slug: "pccn-delirium-vs-dementia",
      objective: "Tell delirium from dementia by onset and fluctuating attention",
      kind: "build",
      title: "Is it delirium, dementia or both?",
      brief:
        "A fictional 84-year-old man with known Alzheimer disease is on day 2 after a hip fracture repair. His daughter says he is \"not himself\": since last night he has been drowsy, then pulling at his IV, and he cannot follow a conversation. At home he recognizes her and follows simple routines.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Decide whether delirium is present, apply the CAM features, and list likely causes to look for.",
          parts: [
            part(
              "CAM",
              "Applies the CAM: acute onset and fluctuating course, inattention, plus disorganized thinking or altered level of consciousness; concludes delirium superimposed on dementia.",
              "Acute change since last night that fluctuates (drowsy then agitated), inattention (cannot follow a conversation), and an altered level of consciousness: CAM positive. This is delirium on top of his dementia."
            ),
            part(
              "Causes",
              "Lists common precipitants after hip surgery -- pain, opioids or anticholinergic drugs, infection (urine, lung, wound), hypoxia, urinary retention, constipation, electrolyte problems, sleep loss -- and says the provider is told.",
              "Look for pain and the drugs given for it, anticholinergics, infection, hypoxia, retention or constipation, sodium and glucose problems, dehydration and sleep loss. Report the new delirium; it is a medical change, not his baseline."
            ),
            part(
              "Non-drug care",
              "Names non-drug measures: reorientation, glasses and hearing aids, family presence, day-night routine, early mobility, avoiding restraints.",
              "Glasses and hearing aids on, daughter at the bedside, clocks and lights for day and night, early mobility, and no restraints."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Gastrointestinal (7%) -- 1
    {
      slug: "pccn-upper-gi-bleed",
      objective: "In acute GI bleeding, place large-bore access, restore volume, read a high BUN-to-creatinine ratio as a clue to an upper source, and watch for hemodynamic change",
      kind: "case",
      title: "Melena and dizziness in a patient on aspirin",
      brief:
        "A fictional 69-year-old man with coronary disease on aspirin and naproxen for knee pain is admitted with two days of black, tarry stools and dizziness on standing.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "BP 108/64 lying, 88/52 standing; HR 104. Hemoglobin 7.6 g/dL. BUN 48 mg/dL, creatinine 1.0 mg/dL.",
          ask: "What does the picture suggest, and what are your priorities?",
          parts: [
            part(
              "Interpretation",
              "Identifies an upper GI bleed (melena, NSAID and aspirin use, a high BUN-to-creatinine ratio from digested blood) with orthostatic hypovolemia.",
              "Melena with NSAIDs and aspirin points to a peptic ulcer; a BUN of 48 with creatinine 1.0 (ratio 48) supports an upper source. Orthostatic drop and tachycardia show significant volume loss."
            ),
            part(
              "Priorities",
              "Two large-bore IVs, crystalloid per orders, type and crossmatch, transfusion given his coronary disease (threshold around 8 g/dL), fall precautions, NPO for endoscopy, PPI per orders, and frequent vital signs.",
              "Two large-bore IVs and fluid; type and cross; with coronary disease a transfusion threshold of 8 g/dL applies, so expect blood now; NPO for endoscopy; IV PPI as ordered; bed rest with help to stand; vitals every 15-30 minutes."
            ),
          ],
        },
        {
          text: "After one unit of red cells, he vomits 300 mL of bright red blood. HR 122, BP 86/50.",
          ask: "What do you do now?",
          parts: [
            part(
              "Escalation",
              "Recognizes active rebleeding with shock, calls rapid response, protects the airway (side-lying, suction), speeds blood products and prepares for urgent endoscopy.",
              "This is active bleeding with shock: rapid response now, turn him on his side with suction ready, run blood as ordered (massive transfusion if the team activates it) and prepare for urgent endoscopy or ICU transfer."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Renal (4%) -- 1
    {
      slug: "pccn-aki-hyperkalemia",
      objective: "Apply the KDIGO definition of acute kidney injury: creatinine up 0.3 mg/dL within 48 hours, or 1.5 times baseline within 7 days, or urine below 0.5 mL/kg/h for 6 hours",
      kind: "case",
      title: "Rising creatinine after contrast and a new ACE inhibitor",
      brief:
        "A fictional 74-year-old man weighing 80 kg had a contrast CT two days ago and was started on lisinopril and spironolactone for heart failure. Baseline creatinine was 1.1 mg/dL.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Creatinine today 1.5 mg/dL. Urine output over the last 6 hours: 210 mL.",
          ask: "Does he meet the definition of AKI, and by which criteria?",
          parts: [
            numericPart(
              "Urine output (mL/kg/h)",
              "210 mL / 80 kg / 6 h = 0.44 mL/kg/h (within 0.02).",
              "210 / 80 / 6 = 0.44 mL/kg/h, below 0.5 for 6 hours.",
              { answer: 0.44, tolerance: 0.02, partialTolerance: 0.05, unit: "mL/kg/h" }
            ),
            part(
              "Definition",
              "States yes: creatinine rose 0.4 mg/dL within 48 hours (at least 0.3) and urine output is below 0.5 mL/kg/h for 6 hours; KDIGO stage 1.",
              "Yes on two criteria: creatinine up 0.4 mg/dL in 48 hours and urine under 0.5 mL/kg/h for 6 hours. Both are stage 1."
            ),
          ],
        },
        {
          text: "Potassium returns 6.4 mmol/L. The monitor shows peaked T waves.",
          ask: "What do you anticipate, in what order, and what about his medicines?",
          parts: [
            part(
              "Treatment",
              "Anticipates IV calcium first to stabilize the heart, then insulin with glucose (and possibly a beta-agonist) to shift potassium in, then removal (binders, diuretics or dialysis), with continuous monitoring and glucose checks.",
              "Calcium gluconate IV first to protect the myocardium (it does not lower potassium), then IV insulin with dextrose to shift potassium into cells, then removal; continuous ECG and glucose checks after insulin."
            ),
            part(
              "Medicines",
              "Asks for spironolactone and lisinopril to be held and reviews other nephrotoxins and potassium sources.",
              "Hold spironolactone and lisinopril (both raise potassium and the ACE inhibitor lowers filtration), avoid NSAIDs and potassium supplements, and review renally dosed drugs."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Musculoskeletal (2%) -- 1
    {
      slug: "pccn-compartment-syndrome",
      objective: "Recognize compartment syndrome from pain out of proportion and pain on passive stretch, remove constricting dressings, keep the limb at heart level and escalate at once",
      kind: "case",
      title: "Leg pain after a tibial fracture repair",
      brief:
        "A fictional 35-year-old man is on day 1 after fixation of a tibial fracture. His leg is in a padded splint and elevated on two pillows. He has had two doses of IV hydromorphone in the last hour.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He rates his pain 10/10 despite the opioid and screams when you gently extend his toes. The calf feels tense. Foot pulses are present.",
          ask: "What is happening, and what do you do?",
          parts: [
            part(
              "Recognition",
              "Names acute compartment syndrome from pain out of proportion to the injury, pain on passive stretch and a tense compartment, and notes that a present pulse does not rule it out.",
              "Acute compartment syndrome: pain beyond what the injury explains, worse on passive stretch, with a tense calf. Pulses disappear late, so their presence is not reassuring."
            ),
            part(
              "Actions",
              "Loosens the splint and dressings, lowers the leg to heart level (not elevated), notifies the surgeon immediately for compartment pressure measurement or fasciotomy, and keeps him NPO.",
              "Release the splint padding and dressing down to skin, bring the leg to heart level, call the surgeon now, and keep him NPO for possible fasciotomy. Elevation above the heart lowers perfusion pressure in the compartment."
            ),
          ],
        },
        {
          text: "The surgeon asks whether you could wait for the pain medicine to work before calling back.",
          ask: "How do you respond?",
          parts: [
            part(
              "Advocacy",
              "Respectfully declines to wait, restates the findings that make it time-critical, and uses the chain of command if the response is not timely.",
              "\"His pain is out of proportion and he has pain on passive stretch with a tense calf; I'm worried about compartment syndrome and muscle can die within hours. I need you to see him now.\" If that does not bring an assessment, escalate through the chain of command."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Multisystem (15%) -- 2
    {
      slug: "pccn-sepsis-screen",
      objective: "Deliver early sepsis care: cultures as soon as possible, antimicrobials ideally within 1 hour when shock or probable sepsis is present, lactate, crystalloid and escalation for a MAP target of 65 mm Hg",
      kind: "case",
      title: "A fever on day 3 after bowel surgery",
      brief:
        "A fictional 61-year-old woman (70 kg) is on day 3 after a bowel resection. She had been progressing well.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Temp 38.9 C, HR 118 /min, RR 26 /min, BP 94/50 mm Hg (MAP 65), new confusion. Abdomen more tender. Lactate 3.4 mmol/L.",
          ask: "What do you recognize, and what are the first-hour actions?",
          parts: [
            part(
              "Recognition",
              "Recognizes probable sepsis with organ dysfunction (hypotension, confusion, raised lactate) from a likely abdominal source such as an anastomotic leak.",
              "Probable sepsis with organ dysfunction: fever, tachycardia, tachypnea, borderline MAP, new confusion and lactate 3.4. The likeliest source is the abdomen (an anastomotic leak)."
            ),
            orderPart(
              "First-hour sequence",
              "Order: call rapid response and the surgeon; blood cultures; start antimicrobials within the hour; begin crystalloid for hypoperfusion; repeat lactate and reassess.",
              "Escalate first so orders come; cultures as soon as possible but never delaying antibiotics; antimicrobials ideally within 1 hour; crystalloid (up to about 30 mL/kg, 2,100 mL for 70 kg, reassessed as it goes); repeat lactate to judge response.",
              [
                "Call rapid response and the surgeon",
                "Draw blood cultures",
                "Give the ordered antimicrobials",
                "Start crystalloid for hypoperfusion",
                "Repeat the lactate and reassess",
              ]
            ),
          ],
        },
        {
          text: "After 2 L of crystalloid: BP 84/46 mm Hg (MAP 59), lactate 4.1 mmol/L, crackles at both bases.",
          ask: "What now?",
          parts: [
            part(
              "Escalation",
              "Recognizes septic shock persisting despite fluid and new signs of fluid overload, stops further boluses, and prepares for a vasopressor (norepinephrine first line) to a MAP of 65 in intensive care, with source control.",
              "This is septic shock not responding to fluid, now with crackles: stop more fluid, prepare for norepinephrine to MAP 65 and ICU transfer, and push for source control (imaging and surgery)."
            ),
          ],
        },
      ],
    },
    {
      slug: "pccn-wound-and-device-infections",
      objective: "Link each invasive device to its infection and remove devices as soon as they are no longer needed",
      kind: "build",
      title: "Audit one patient's devices for infection risk",
      brief:
        "A fictional 72-year-old man on day 6 after a pneumonia admission has a urinary catheter placed in the emergency department \"for accurate output\", a triple-lumen central line placed for vasopressors that stopped on day 2, a peripheral IV and a nasogastric tube that is no longer used. He is eating and walking to the chair.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the devices that should be questioned today, and say what infection each risks.",
          parts: [
            selectPart(
              "Devices to question today",
              "Selects the urinary catheter, the central line and the nasogastric tube; keeps the peripheral IV (still needed for IV antibiotics).",
              "The catheter's reason (output) is gone now he walks and the risk is CAUTI; the central line's reason (vasopressors) ended on day 2, risking CLABSI; the unused NG tube adds aspiration and sinusitis risk. The peripheral IV still carries his antibiotics.",
              {
                lines: ["Urinary catheter", "Triple-lumen central line", "Peripheral IV used for antibiotics", "Nasogastric tube"],
                correct: [0, 1, 3],
                display: "list",
              }
            ),
            part(
              "Linking device to infection",
              "Names CAUTI for the catheter, CLABSI for the central line, aspiration pneumonia or sinusitis for the NG tube, and says removal when no longer indicated is the strongest prevention.",
              "Catheter: CAUTI. Central line: CLABSI. NG tube: aspiration and sinusitis. Daily review of every device and removal once the indication ends prevents more infections than any dressing."
            ),
            part(
              "How you raise it",
              "Proposes raising each at rounds or by nurse-driven removal protocol where one exists, and documents the review.",
              "Bring each to the team at rounds (or remove the catheter under the unit's nurse-driven protocol if one exists) and document the daily line and catheter review."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Behavioral/Psychosocial (3%) -- 1
    {
      slug: "pccn-agitation-restraint",
      objective: "De-escalate first, use restraint only as a last resort on a time-limited order, and know the 1-hour face-to-face evaluation and 4-hour adult order limit for violent behavior",
      kind: "case",
      title: "An agitated patient swinging at staff",
      brief:
        "A fictional 45-year-old man admitted with pancreatitis is on day 2 of his stay. He drinks heavily and his last drink was about 48 hours ago. Tonight he is sweating, tremulous and shouting that someone is in the room.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He swings at the nursing assistant who tries to take his blood pressure. HR 128 /min, BP 168/98 mm Hg, Temp 38.2 C.",
          ask: "What is likely going on, and what do you try first?",
          parts: [
            part(
              "Likely cause",
              "Recognizes probable severe alcohol withdrawal (timing, tremor, sweating, hallucinations, autonomic hyperactivity) and screens for other causes (hypoglycemia, hypoxia, infection).",
              "About 48 hours after the last drink with tremor, sweating, hallucinations, tachycardia and fever: severe withdrawal, possibly heading to delirium tremens. Check glucose and oxygen and consider infection too."
            ),
            part(
              "First response",
              "Keeps staff safe (space, exit, help), uses calm verbal de-escalation, reduces stimulation, scores withdrawal with CIWA-Ar and gets withdrawal treatment ordered.",
              "Step back and call for help, keep an exit clear, speak calmly and simply, dim the room, and get the provider to order symptom-triggered benzodiazepines after a CIWA-Ar score. Treating the withdrawal is the real de-escalation."
            ),
          ],
        },
        {
          text: "Despite this he pulls out his IV and tries to hit staff again. The provider orders restraint for violent behavior.",
          ask: "What rules govern the order and the monitoring?",
          parts: [
            part(
              "Rules",
              "States the order cannot be PRN or standing, lasts at most 4 hours for an adult before renewal (up to 24 hours), needs a face-to-face evaluation within 1 hour, and requires continuous monitoring and release at the earliest safe time.",
              "Under 42 CFR 482.13: never PRN or standing; at most 4 hours per order for an adult, renewed up to 24 hours; a face-to-face evaluation within 1 hour; monitor continuously (circulation, skin, breathing, hydration, toileting) and remove as soon as he is safe."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Advocacy/Caring/Diversity/Learning (11%) -- 2
    {
      slug: "pccn-interpreter-and-consent",
      objective: "Use a qualified medical interpreter rather than family or untrained staff",
      kind: "case",
      title: "Consent through a teenage interpreter",
      brief:
        "A fictional 68-year-old woman who speaks Vietnamese is scheduled for a cardiac catheterization this afternoon. Her 15-year-old grandson has been interpreting for the team.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The cardiology fellow asks you to have her sign the consent with her grandson translating, because the phone interpreter line has a wait.",
          ask: "What do you do and why?",
          parts: [
            part(
              "Decision",
              "Declines to use the grandson for consent and gets a qualified medical interpreter (phone, video or in person), even with a wait, because a minor family member may omit or soften information and cannot give accurate informed consent communication.",
              "A qualified interpreter is needed for consent. A teenage relative may not know medical terms, may soften risks, and puts a child in an unfair position. Wait for the phone or video interpreter."
            ),
            part(
              "Advocacy",
              "Explains the reason to the fellow respectfully and offers to set up the interpreter so the schedule slips as little as possible.",
              "\"I can't witness a consent through her grandson; I'll get the video interpreter now and page you when they're on.\""
            ),
          ],
        },
        {
          text: "Through the interpreter she says she does not want the procedure if it means a blood transfusion, because of her faith.",
          ask: "How do you respond?",
          parts: [
            part(
              "Response",
              "Acknowledges her values without judgment, explores what she would and would not accept, informs the provider so the plan and consent reflect it, documents it, and involves blood-management or chaplain resources if available.",
              "Thank her for telling you, ask what she would accept (some patients accept certain fractions or cell salvage), tell the cardiologist so consent and planning reflect her wishes, document it clearly, and offer the chaplain or the hospital's bloodless-care service if there is one."
            ),
          ],
        },
      ],
    },
    {
      slug: "pccn-teach-back-discharge",
      objective: "Teach patients and families in plain language and confirm learning with teach-back",
      kind: "build",
      title: "Teach heart failure self-care with teach-back",
      brief:
        "A fictional 59-year-old man with new heart failure goes home tomorrow on furosemide. He left school at 14 and tells you he \"isn't a reader.\" His partner will help at home.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the teaching for daily weights and when to call, and the teach-back questions you would ask.",
          parts: [
            part(
              "Teaching",
              "Uses plain words, short chunks and a demonstration: weigh each morning after urinating, before breakfast, same scale and clothes, write it down; call for a gain above the threshold his team sets, more breathlessness, swelling or needing more pillows; includes the partner.",
              "\"Every morning, after you pee and before you eat, step on the same scale in the same clothes. Write the number on this chart. If it goes up by more than the number your team writes here, or you get more short of breath or your ankles swell, call us that day.\" Write his team's weight-gain threshold on the chart, practice once, and teach the partner too."
            ),
            part(
              "Teach-back",
              "Asks open questions that make him say or show it back (not 'Do you understand?'), and re-teaches anything missed.",
              "\"So I know I explained it well, can you tell me when you'll weigh yourself?\" \"What would you do if the scale went up past the number on your chart?\" \"Show me where you'll write it.\" If he misses a step, explain it a different way and ask again."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Collaboration/Systems/Inquiry (9%) -- 2
    {
      slug: "pccn-sbar-chain-of-command",
      objective: "Use the chain of command when a safety concern is not resolved",
      kind: "case",
      title: "A concern the on-call resident dismisses",
      brief:
        "At 02:00 a fictional 80-year-old woman, admitted with pneumonia, has a respiratory rate of 30 /min, SpO2 89% on 4 L, and new confusion. You page the resident, who says to \"turn up the oxygen and recheck in the morning.\"",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You increase the oxygen. Thirty minutes later RR is 32 /min, SpO2 90%, and she is harder to rouse.",
          ask: "Write what you say on the next call.",
          parts: [
            part(
              "SBAR",
              "Gives a crisp SBAR with the trend and a specific request (bedside evaluation now, blood gas), and states the concern plainly.",
              "S: Mrs. N in 412 is worsening; I am concerned she is in respiratory failure. B: 80, pneumonia day 2. A: RR 32, SpO2 90% on 6 L, harder to rouse, worse than 30 minutes ago despite more oxygen. R: I need you at the bedside now and I'd like a blood gas; if you can't come I will call the rapid response team."
            ),
          ],
        },
        {
          text: "The resident says they are busy and will come \"when they can.\"",
          ask: "What do you do next?",
          parts: [
            part(
              "Escalation",
              "Calls the rapid response team (any nurse may), notifies the charge nurse, escalates to the attending through the chain of command, and documents the times and responses factually.",
              "Call rapid response now (the criteria are met and no permission is needed), tell the charge nurse, and escalate to the attending if needed. Document each call, time and response factually."
            ),
          ],
        },
      ],
    },
    {
      slug: "pccn-evidence-practice-change",
      objective: "Question current practice and apply evidence and quality-improvement data to change it",
      kind: "build",
      title: "Plan a small test of change for CAUTI",
      brief:
        "Your fictional progressive care unit had six catheter-associated urinary tract infections last quarter, double the hospital's average. An audit shows many catheters stay in after their reason has ended.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan one Plan-Do-Study-Act cycle and say how you will know whether it worked.",
          parts: [
            part(
              "Plan and Do",
              "Proposes a specific, evidence-based change (for example a daily nurse-driven catheter-necessity check with removal criteria) tested small (one shift or one month), with staff input and the unit's leaders.",
              "Plan: a nurse-driven removal protocol, checked every morning against agreed indications, tested on day shift for four weeks with the charge nurse leading huddles. Do: run it and note problems."
            ),
            part(
              "Study and Act",
              "Names outcome (CAUTI rate per 1,000 catheter days), process (catheter days, percentage with a documented indication) and balancing measures (retention, reinsertions), compares them to baseline, and decides to adopt, adapt or abandon.",
              "Study: catheter days and device utilization, percentage with a documented indication, CAUTIs per 1,000 catheter days, and reinsertions or retention episodes as a balancing measure. Act: adopt, adapt or abandon based on what the numbers show, then spread."
            ),
          ],
        },
      ],
    },
  ],
};
