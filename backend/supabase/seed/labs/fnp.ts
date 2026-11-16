import { CLINICAL_SAFETY, part, orderPart, matchPart, selectPart, numericPart, type SeedLabSet } from "./types";
import { source } from "../sources";
import { AANP_FNP_URL, ANCC_FNP_TCO_URL, FNP_SIM_OBJECTIVES } from "../tracks/fnp";

// REQ-278: the two FNP courses' authored labs.
//
// AANPCB 2024 FNP blueprint (candidate portal, read 2026-11-14): 3/3/2/2 = 10.
// ANCC FNP-BC TCO effective 2026-10-30 (read 2026-11-14): 2/2/2/3/2 = 11.
// One lab per objective (hybrid density). Every patient is fictional; exam
// practice, not clinical guidance. No drug doses are taught. Value sources
// per lab are in nursing-specialty-sources.ts.

export const FNPAANP_LABS: SeedLabSet = {
  trackCode: "FNPAANP",
  sources: [source(AANP_FNP_URL, "exam_outline", "2026-11-14")],
  labs: [
    // ------------------------------------------------------------ Assess (32%) -- 3
    {
      slug: "fnpaanp-screening-visit",
      objective: "Apply current USPSTF cancer screening ages and intervals for colorectal, breast and cervical cancer",
      kind: "build",
      title: "Which screenings are due at this visit?",
      brief:
        "A fictional 46-year-old woman comes for a wellness visit. She has never had colon cancer screening or a mammogram. Her last cervical cytology was normal four years ago and she has never had HPV testing. She has a cervix, no symptoms and no family history of cancer.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the screenings to offer today, and explain one you did not choose.",
          parts: [
            selectPart(
              "Offer today",
              "Selects colorectal screening (ages 45-49, grade B), a mammogram (biennial from 40), and cervical screening (cytology was 4 years ago, past the 3-year interval; hrHPV or cotesting every 5 years is an option at 30-65); leaves out a lung CT and a PSA.",
              "Colorectal screening starts at 45; biennial mammography from 40 to 74; her cytology is overdue at 4 years, and at 46 she may switch to hrHPV testing or cotesting every 5 years. Lung CT needs a smoking history and PSA does not apply.",
              {
                lines: ["Colorectal cancer screening", "Screening mammogram", "Cervical cancer screening", "Low-dose chest CT", "PSA test"],
                correct: [0, 1, 2],
                display: "list",
              }
            ),
            part(
              "One not chosen",
              "Explains why a test was left out (for example lung CT needs an age and smoking-history criterion she does not meet; PSA screening is for men).",
              "Low-dose CT is for adults with a significant smoking history in the eligible age range; she has none. PSA screening concerns men."
            ),
          ],
        },
      ],
    },
    {
      slug: "fnpaanp-bp-confirm",
      objective: "Classify blood pressure by the 2025 categories and confirm a diagnosis with readings outside the clinic",
      kind: "case",
      title: "A high reading at a sports physical",
      brief: "A fictional 38-year-old man has a blood pressure of 142/88 mm Hg at a work physical. He has no diabetes, kidney disease or cardiovascular disease.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "A repeat after 5 minutes seated with a correct cuff is 138/86 mm Hg.",
          ask: "How do you classify it and what is the next step before diagnosing hypertension?",
          parts: [
            part(
              "Classify and confirm",
              "Classifies the office reading as stage 1 range (130-139 or 80-89) and arranges home or ambulatory measurements to confirm before diagnosing or treating, noting white-coat hypertension.",
              "138/86 is in the stage 1 range. Confirm with readings outside the clinic (home monitoring with a validated cuff, or ambulatory monitoring) before labeling him hypertensive; white-coat hypertension is common."
            ),
          ],
        },
        {
          text: "His home average over a week is 136/84 mm Hg. His 10-year PREVENT risk is 4%.",
          ask: "Does he start medication now?",
          parts: [
            part(
              "Decision",
              "States stage 1 with risk below 7.5% and no CVD, diabetes or CKD: lifestyle change first for 3-6 months, starting medication if the average stays at or above 130/80; target below 130/80.",
              "Not yet: stage 1 with a PREVENT risk under 7.5% and no high-risk condition means a 3-6 month lifestyle trial (sodium, activity, weight, alcohol), then medication if still at or above 130/80. Target below 130/80."
            ),
          ],
        },
      ],
    },
    {
      slug: "fnpaanp-older-adult-falls",
      objective: "Assess older adults for falls, cognition, function, polypharmacy and frailty",
      kind: "case",
      title: "Two falls in three months",
      brief:
        "A fictional 81-year-old woman comes with her son after a second fall in three months. She takes lisinopril, amlodipine, a sleeping pill at night, an over-the-counter antihistamine for allergies, and oxybutynin for bladder urgency.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "She fell getting up at night to use the bathroom. She reports dizziness on standing.",
          ask: "What do you assess?",
          parts: [
            part(
              "Assessment",
              "Assesses orthostatic blood pressure, gait and balance (for example Timed Up and Go), vision, feet and footwear, cognition, home hazards, and a medication review for fall-risk drugs.",
              "Orthostatic BP and pulse, a gait and balance test such as Timed Up and Go, vision, feet and shoes, a brief cognitive screen, nighttime toileting and home hazards, and a full medication review."
            ),
          ],
        },
        {
          text: "Her blood pressure drops 24 mm Hg systolic on standing.",
          ask: "Which medications contribute, and what do you change?",
          parts: [
            selectPart(
              "Fall-risk medications",
              "Selects the sleeping pill, the antihistamine and oxybutynin (sedating and anticholinergic, Beers-type risks) and the antihypertensives given the orthostatic drop.",
              "The hypnotic and the first-generation antihistamine sedate; oxybutynin and the antihistamine are anticholinergic; two antihypertensives with an orthostatic drop add to the fall risk.",
              {
                lines: ["Sleeping pill at night", "Over-the-counter antihistamine", "Oxybutynin", "Lisinopril and amlodipine", "Calcium with vitamin D"],
                correct: [0, 1, 2, 3],
                display: "list",
              }
            ),
            part(
              "Plan",
              "Proposes tapering or stopping the sedating and anticholinergic drugs with non-drug alternatives, reviewing blood pressure targets and doses, physical therapy for strength and balance, home safety, and follow-up.",
              "Taper the hypnotic and stop the antihistamine (offer non-sedating options), reconsider oxybutynin (bladder training or another agent), review the antihypertensive doses against her standing pressure, refer to physical therapy for strength and balance, and arrange a home safety check."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------------------ Diagnose (26.5%) -- 3
    {
      slug: "fnpaanp-chest-pain-red-flags",
      objective: FNP_SIM_OBJECTIVES.chestPain,
      kind: "case",
      title: "Chest tightness at a walk-in visit",
      brief: "A fictional 57-year-old man with diabetes and a smoking history walks into a primary care clinic with 40 minutes of chest tightness and nausea. He thinks it is indigestion.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He is sweaty. BP 152/94 mm Hg, HR 98 /min. The clinic has an ECG machine.",
          ask: "What do you do, in order?",
          parts: [
            orderPart(
              "Sequence",
              "Order: call emergency medical services, obtain a 12-lead ECG, give aspirin if no contraindication, monitor and stay with him until transfer, then communicate with the receiving hospital.",
              "Treat it as possible ACS: call 911 first (do not send him by car), ECG while waiting, aspirin unless contraindicated, stay and monitor, and hand over with the ECG.",
              ["Call emergency medical services", "Obtain a 12-lead ECG", "Give aspirin if no contraindication", "Monitor him until EMS arrives", "Hand over to EMS and the receiving hospital"]
            ),
            part(
              "Why not outpatient workup",
              "Explains that ongoing chest pain with diaphoresis and risk factors is a possible acute coronary syndrome that needs emergency evaluation, and that a normal ECG does not exclude it.",
              "Ongoing symptoms with sweating in a man with diabetes and smoking risk could be an MI; he needs serial ECGs and troponins in an emergency department. A normal clinic ECG does not rule it out."
            ),
          ],
        },
        {
          text: "He asks if his son can just drive him.",
          ask: "Answer him.",
          parts: [
            part(
              "Answer",
              "Explains that EMS can treat arrhythmias and alert the hospital en route, which a private car cannot.",
              "\"If this is a heart attack, your heart rhythm can become dangerous on the way. The ambulance crew can treat that and alert the hospital so they're ready. Please let them take you.\""
            ),
          ],
        },
      ],
    },
    {
      slug: "fnpaanp-cough-differential",
      objective: "Build and prioritize a differential diagnosis from history, examination and test results, ruling out the dangerous causes first",
      kind: "case",
      title: "Three weeks of cough",
      brief: "A fictional 44-year-old woman has had a cough for three weeks after a cold. She is a nonsmoker, recently started lisinopril, and has heartburn at night.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "No fever, weight loss, night sweats or hemoptysis. Lungs clear. SpO2 98%.",
          ask: "Build a differential and say what you rule out first.",
          parts: [
            part(
              "Differential",
              "Lists post-viral cough, ACE-inhibitor cough, reflux, upper airway cough syndrome and asthma, and screens for dangerous causes (pneumonia, tuberculosis exposure, malignancy, pulmonary embolism, heart failure) by red flags.",
              "Likely: post-infectious cough, ACE-inhibitor cough, reflux, postnasal drip, cough-variant asthma. Dangerous causes to screen by history and exam: pneumonia, TB exposure, cancer, PE and heart failure -- none suggested here."
            ),
            part(
              "Next step",
              "Proposes a reasonable trial (for example switching the ACE inhibitor to another antihypertensive) and a chest x-ray if it becomes chronic or red flags appear.",
              "Change lisinopril to a non-ACE-inhibitor agent and reassess in 4 weeks (ACE cough can take weeks to settle). Image if it becomes chronic or any red flag appears."
            ),
          ],
        },
        {
          text: "At follow-up she reports wheeze at night and with cold air.",
          ask: "How does this change your thinking?",
          parts: [
            part(
              "Revised",
              "Moves asthma up the differential and plans spirometry with bronchodilator testing.",
              "Nocturnal and cold-triggered wheeze point to asthma: arrange spirometry with bronchodilator responsiveness to confirm before treating long term."
            ),
          ],
        },
      ],
    },
    {
      slug: "fnpaanp-atypical-older-adult",
      objective: "Recognize atypical presentations in older adults, such as delirium or falls as the first sign of infection",
      kind: "build",
      title: "\"She's just not herself\"",
      brief:
        "A fictional 86-year-old woman's daughter calls because her mother has been sleepy and muddled for a day and fell this morning. No fever was measured. She has had a new urinary catheter since a recent hospital stay.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain why this is concerning and what you would do.",
          parts: [
            part(
              "Why",
              "Explains that older adults often present with infection, MI or other illness as delirium, falls or functional decline without fever, and that the catheter is a source.",
              "Older adults often show serious illness as new confusion, a fall or decline, without fever or localized symptoms. With a catheter, urinary infection and sepsis are high on the list; dehydration, drugs and MI are others."
            ),
            part(
              "Action",
              "Arranges same-day evaluation (or emergency referral if unstable), with vital signs, a delirium screen, a medication review, urinalysis and culture from a new catheter, and labs.",
              "See her today -- or send to the emergency department if vital signs are abnormal or she cannot be assessed safely. Check vital signs, screen for delirium, review medications, culture urine from a freshly replaced catheter, and order basic labs."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------------------ Plan (26.5%) -- 2
    {
      slug: "fnpaanp-statin-decision",
      objective: "Decide on statin therapy for primary prevention by age, risk factors and 10-year cardiovascular risk",
      kind: "build",
      title: "Statin or not? Three patients",
      brief:
        "Three fictional adults without cardiovascular disease. A: 52, with hypertension, 10-year risk 12%. B: 61, a smoker, 10-year risk 8.5%. C: 79, no risk factors beyond age, not on a statin.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each to the USPSTF recommendation, and describe the conversation for B.",
          parts: [
            matchPart(
              "Patient to recommendation",
              "A: prescribe a statin (B grade, 10% or more with a risk factor); B: selectively offer after shared decision-making (C, 7.5% to under 10%); C: insufficient evidence to start (I, 76 and older).",
              "USPSTF 2022: ages 40-75 with a risk factor and 10-year risk of 10% or more, recommend (B); 7.5% to under 10%, selectively offer (C); 76 and older, insufficient evidence (I).",
              {
                left: ["Patient A", "Patient B", "Patient C"],
                right: ["Recommend a statin (B)", "Selectively offer after shared decision-making (C)", "Insufficient evidence to start (I)", "Recommend against (D)"],
                pairs: [0, 1, 2],
                leftHeading: "Patient",
                rightHeading: "USPSTF",
              }
            ),
            part(
              "Shared decision with B",
              "Describes discussing the modest absolute benefit and the harms, his values, and smoking cessation as the bigger risk reduction.",
              "Explain the small but real absolute benefit at his risk, the possible side effects and daily pill, and what matters to him. Make stopping smoking the headline: it lowers his risk more than a statin."
            ),
          ],
        },
      ],
    },
    {
      slug: "fnpaanp-asthma-step",
      objective: "Step asthma care by GINA, preferring as-needed ICS-formoterol over SABA-only treatment",
      kind: "case",
      title: "Using the rescue inhaler most days",
      brief: "A fictional 24-year-old woman with asthma uses an albuterol inhaler alone, four or five days a week, and wakes with cough twice a week.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Her technique is good. She has had one course of oral steroids this year.",
          ask: "What do you change and why?",
          parts: [
            part(
              "Change",
              "Explains that SABA-only treatment leaves airway inflammation untreated and raises the risk of severe attacks, and moves her to an inhaled-corticosteroid-containing regimen -- low-dose ICS-formoterol as needed and for maintenance as her control requires (GINA Track 1).",
              "Albuterol alone treats symptoms but not inflammation, and frequent use signals poor control and higher risk. Move her to ICS-formoterol (GINA Track 1): as her reliever and, with symptoms this frequent, as maintenance too."
            ),
          ],
        },
        {
          text: "She asks why she can't just keep albuterol \"since it works.\"",
          ask: "Explain in plain words and plan follow-up.",
          parts: [
            part(
              "Explanation and follow-up",
              "Explains the difference between quick relief and treating the underlying swelling, gives an action plan, and plans review in a few weeks to assess control and adherence.",
              "\"Albuterol opens your airways for a few hours but doesn't calm the swelling underneath, which is what causes bad attacks. The new inhaler does both.\" Give a written action plan and book a review to check control (sooner if worse)."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------------------ Evaluate (15%) -- 2
    {
      slug: "fnpaanp-hypoglycemia-adjust",
      objective: "Recognize hypoglycemia from diabetes treatment and adjust the regimen to prevent it",
      kind: "case",
      title: "Shaky afternoons on a new diabetes regimen",
      brief: "A fictional 74-year-old man with type 2 diabetes and kidney disease was started on glipizide three months ago in addition to metformin. His A1C is now 6.3%.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He reports sweaty, shaky spells most afternoons that improve with juice. His meter shows readings of 62 and 51 mg/dL.",
          ask: "Interpret the readings and decide what to change.",
          parts: [
            part(
              "Interpret",
              "Identifies level 1 (62) and level 2 (51, below 54) hypoglycemia from a sulfonylurea in an older adult with kidney disease, and an A1C below what is safe for him.",
              "62 is level 1 and 51 is level 2 hypoglycemia. Glipizide, older age and kidney disease all raise risk; an A1C of 6.3% is tighter than an older adult on a hypoglycemic drug needs."
            ),
            part(
              "Adjust",
              "Stops or reduces the sulfonylurea, relaxes the A1C goal individually, considers an agent with low hypoglycemia risk and kidney or cardiac benefit, reviews metformin dosing for kidney function, and teaches hypoglycemia treatment (15 g and recheck in 15 minutes).",
              "Stop glipizide (or reduce it), individualize a less strict A1C goal, consider an SGLT2 inhibitor or GLP-1 RA if appropriate for his kidneys and heart, check metformin is dosed for his eGFR, and teach the 15-15 rule and carrying glucose."
            ),
          ],
        },
        {
          text: "Four weeks later his readings are 110-180 mg/dL with no lows.",
          ask: "How do you evaluate the change?",
          parts: [
            part(
              "Evaluate",
              "Judges the plan effective (no hypoglycemia, acceptable range), plans an A1C recheck at the usual interval and continued monitoring of kidney function.",
              "Working: no lows and readings in a reasonable range. Recheck A1C at the usual interval, keep monitoring kidney function, and ask about lows at every visit."
            ),
          ],
        },
      ],
    },
    {
      slug: "fnpaanp-deprescribe",
      objective: "Recognize adverse drug effects and interactions, and deprescribe when harm outweighs benefit",
      kind: "build",
      title: "A new tremor and confusion",
      brief:
        "A fictional 70-year-old woman on lithium for bipolar disorder for 20 years was started on hydrochlorothiazide and ibuprofen by different clinicians last month. She now has a coarse tremor, diarrhea and new confusion.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "What is the likely problem, what do you do now, and what do you change?",
          parts: [
            part(
              "Problem",
              "Recognizes probable lithium toxicity from interactions (thiazide and NSAID reduce lithium clearance), especially with age-related kidney decline.",
              "Lithium toxicity: thiazides and NSAIDs both raise lithium levels by reducing renal clearance. Coarse tremor, GI upset and confusion fit."
            ),
            part(
              "Now",
              "Refers urgently to the emergency department for a lithium level, kidney function and monitoring because confusion signals moderate to severe toxicity.",
              "Send her to the emergency department today for a lithium level, electrolytes and kidney function, and monitoring; confusion means this is not an office problem."
            ),
            part(
              "Change",
              "Stops the NSAID and thiazide, coordinates with the prescriber of lithium, reconciles all medicines, and documents the interaction to prevent recurrence.",
              "Stop ibuprofen (use acetaminophen) and the thiazide (choose another antihypertensive), coordinate with her psychiatric prescriber, reconcile one medication list, and flag the interaction in her record."
            ),
          ],
        },
      ],
    },
  ],
};

export const FNPANCC_LABS: SeedLabSet = {
  trackCode: "FNPANCC",
  sources: [source(ANCC_FNP_TCO_URL, "exam_outline", "2026-11-14")],
  labs: [
    // ------------------------------------------------------------ Assessment (17%) -- 2
    {
      slug: "fnpancc-osteoporosis-screening",
      objective: "Screen for hypertension, prediabetes and type 2 diabetes, and osteoporosis in the right populations",
      kind: "build",
      title: "Who should be screened?",
      brief:
        "Four fictional adults at annual visits. A: a 66-year-old woman, never screened for osteoporosis. B: a 52-year-old postmenopausal woman, a smoker who takes long-term prednisone. C: a 40-year-old man with a BMI of 31. D: a 29-year-old woman with a BMI of 23 and normal office blood pressure.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each patient to the screening the USPSTF supports, and explain one.",
          parts: [
            matchPart(
              "Patient to screening",
              "A: osteoporosis screening (women 65+); B: osteoporosis screening (postmenopausal under 65 at increased risk); C: prediabetes and type 2 diabetes screening (35-70 with overweight or obesity); D: blood pressure screening only (all adults 18+).",
              "USPSTF: bone density for women 65 and older and for younger postmenopausal women at increased risk (smoking, glucocorticoids); glucose screening at 35-70 with BMI 25 or more; blood pressure for every adult.",
              {
                left: ["Patient A", "Patient B", "Patient C", "Patient D"],
                right: ["Osteoporosis screening (age)", "Osteoporosis screening (risk)", "Prediabetes and diabetes screening", "Blood pressure screening only"],
                pairs: [0, 1, 2, 3],
                leftHeading: "Patient",
                rightHeading: "Screening",
              }
            ),
            part(
              "Explain one",
              "Explains a choice with the population criterion (for example B's smoking and glucocorticoid use put her at increased risk under 65).",
              "Patient B is under 65 but postmenopausal with two risk factors (smoking and long-term glucocorticoids), so the USPSTF's increased-risk recommendation applies."
            ),
          ],
        },
      ],
    },
    {
      slug: "fnpancc-adolescent-risk",
      objective: "Assess genetic, behavioral, sexual, lifestyle, cultural and social risk",
      kind: "case",
      title: "A sports physical for a 16-year-old",
      brief: "A fictional 16-year-old comes with a parent for a sports physical. He is quiet and answers in single words while the parent is in the room.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The parent asks to stay for the whole visit.",
          ask: "How do you structure the visit to assess risk?",
          parts: [
            part(
              "Confidential time",
              "Explains confidentiality and its limits to both, spends part of the visit alone with the adolescent, and uses a structured psychosocial history (home, education, activities, drugs, sexuality, suicide and safety).",
              "Explain to both that part of every teen visit is private and what stays confidential (and the exceptions: risk of serious harm). Then, alone with him, use a structured psychosocial interview: home, school, activities, drugs and alcohol, sexuality, mood and suicide, and safety."
            ),
          ],
        },
        {
          text: "Alone, he says he vapes daily, has felt down for two months, and sometimes thinks it would be easier not to wake up.",
          ask: "What do you do next?",
          parts: [
            part(
              "Next",
              "Asks directly about suicidal intent and plan and access to means, screens for depression with a validated tool, explains that safety concerns must be shared, involves the parent with his knowledge, and arranges same-day safety planning or emergency evaluation by risk; addresses vaping with motivational interviewing.",
              "Ask about intent, a plan, past attempts and access to guns or pills; use a depression screen (such as a PHQ-A). Explain that because of the safety concern you will involve his parent, and do it with him. Same-day safety planning and urgent mental health referral, or emergency evaluation if risk is high. Address vaping with motivational interviewing later."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------------------ Diagnosis (17%) -- 2
    {
      slug: "fnpancc-red-flag-headache",
      objective: "Recognize red flags that need emergency referral: chest pain, stroke symptoms, sepsis, an acute abdomen, ectopic pregnancy and suicidal intent",
      kind: "build",
      title: "Which headaches need the emergency department?",
      brief: "Five fictional adults call the clinic with a headache.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the ones to send for emergency evaluation today, and name the condition you fear for one.",
          parts: [
            selectPart(
              "Emergency today",
              "Selects the thunderclap headache, headache with fever and stiff neck, the new headache with arm weakness, and the headache after a fall on a blood thinner; leaves the typical tension-type headache.",
              "Thunderclap (subarachnoid hemorrhage), fever and neck stiffness (meningitis), a focal deficit (stroke), and head injury on anticoagulation (intracranial bleed) all need emergency evaluation. A familiar band-like headache without red flags can be seen routinely.",
              {
                lines: [
                  "Worst headache of her life, peaking within a minute",
                  "Headache with fever, stiff neck and a rash",
                  "New headache with weakness of the right arm",
                  "Headache after a fall, taking apixaban",
                  "Band-like headache at the end of the workday, like her usual ones",
                ],
                correct: [0, 1, 2, 3],
                display: "list",
              }
            ),
            part(
              "Feared condition",
              "Names the feared diagnosis for one selected patient and why it is time-critical.",
              "The thunderclap headache: subarachnoid hemorrhage from an aneurysm, which can rebleed; she needs CT and, if negative, further testing today."
            ),
          ],
        },
      ],
    },
    {
      slug: "fnpancc-tsh-interpretation",
      objective: "Select the diagnostic test that will change management, and interpret its result",
      kind: "case",
      title: "Tired, cold and gaining weight",
      brief: "A fictional 49-year-old woman reports fatigue, feeling cold, constipation and weight gain over six months.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Her examination shows dry skin and slow reflex relaxation.",
          ask: "What is the first test and why that one?",
          parts: [
            part(
              "First test",
              "Chooses TSH as the initial test for suspected primary hypothyroidism, with free T4 if abnormal, explaining TSH is the most sensitive first test.",
              "A TSH: it is the most sensitive single test for primary thyroid disease; add free T4 if the TSH is abnormal."
            ),
          ],
        },
        {
          text: "TSH is high and free T4 low.",
          ask: "Interpret the result and name one condition that can mislead.",
          parts: [
            part(
              "Interpretation",
              "Interprets a high TSH with low free T4 as overt primary hypothyroidism (most often Hashimoto thyroiditis), and names a pitfall (for example recovery from nonthyroidal illness, biotin interference, or central hypothyroidism where TSH is not high).",
              "Overt primary hypothyroidism, most often autoimmune (Hashimoto). Pitfalls: TSH can be misleading during recovery from acute illness, biotin supplements interfere with some assays, and in central (pituitary) hypothyroidism TSH is low or normal."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------------------ Planning (19%) -- 2
    {
      slug: "fnpancc-diabetes-agent-choice",
      objective: "Manage type 2 diabetes with lifestyle, metformin and agents chosen for cardiovascular, heart failure and kidney benefit",
      kind: "case",
      title: "Adding to metformin after a heart attack",
      brief: "A fictional 63-year-old man with type 2 diabetes had a myocardial infarction last year. He takes metformin. His A1C is 7.9%. He also has heart failure with reduced ejection fraction.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He asks for \"whatever brings my sugar down fastest.\"",
          ask: "What class do you prefer to add, and why?",
          parts: [
            part(
              "Choice",
              "Prefers an SGLT2 inhibitor (heart failure and cardiovascular benefit) and/or a GLP-1 receptor agonist (atherosclerotic cardiovascular benefit), chosen for organ protection independent of A1C, over a sulfonylurea.",
              "Add an SGLT2 inhibitor for his heart failure (and kidney and cardiovascular benefit); a GLP-1 receptor agonist is also favored for his established atherosclerotic disease. These are chosen for protecting his heart, not just for the A1C."
            ),
          ],
        },
        {
          text: "He asks what to watch for on the SGLT2 inhibitor.",
          ask: "What do you teach?",
          parts: [
            part(
              "Teaching",
              "Teaches genital hygiene and yeast infection signs, hydration and sick-day rules (holding it when unable to eat or drink), and recognizing euglycemic ketoacidosis symptoms.",
              "Keep the genital area clean and report itching or discharge; stay hydrated; on sick days when you can't eat or drink, hold it and call; seek care for nausea, vomiting, abdominal pain or unusual tiredness even if your sugar is normal (a rare ketoacidosis)."
            ),
          ],
        },
      ],
    },
    {
      slug: "fnpancc-appraise-study",
      objective: "Appraise research design, results and applicability before changing practice",
      kind: "build",
      title: "Should this study change your practice?",
      brief:
        "A fictional drug company representative shows you a 12-week randomized trial of 180 adults: a new supplement lowered LDL cholesterol by 8% versus placebo (p = 0.04). No cardiovascular outcomes were measured, participants were 30-45 years old, and the trial was funded by the manufacturer.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Appraise the study's design, results and applicability, and decide.",
          parts: [
            part(
              "Appraisal",
              "Notes the strengths (randomized, placebo-controlled) and limits (short, small, surrogate outcome only, young population unlike the target patients, industry funding, a modest effect), and concludes it does not justify changing practice.",
              "Randomized and controlled, but short, small, and measuring LDL only -- a surrogate, not heart attacks or deaths. Participants were younger than the people who would use it, the funder sells it, and an 8% change is modest. Not enough to recommend it over statins with outcome evidence."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------------------ Implementation (33%) -- 3
    {
      slug: "fnpancc-mandatory-reporting",
      objective: "Report reportable diseases and suspected abuse as the law requires",
      kind: "case",
      title: "A bruise pattern and a positive test",
      brief: "A fictional 3-year-old is brought by her mother's partner for a \"rash.\" You find bruises on the ears, neck and buttocks in different stages of healing. The explanation is that she \"falls a lot.\"",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The partner becomes impatient and wants to leave.",
          ask: "What makes this suspicious, and what is your duty?",
          parts: [
            part(
              "Suspicion",
              "Identifies concerning features: bruising in protected areas (ears, neck, buttocks) in a toddler, multiple stages of healing, and an explanation that does not fit.",
              "Bruises on the ears, neck and buttocks are rarely accidental; several ages of bruising and a vague 'falls a lot' explanation raise concern for physical abuse."
            ),
            part(
              "Duty",
              "States the NP is a mandatory reporter who must report reasonable suspicion to child protective services (proof is not required), ensures the child's immediate safety (emergency department or police if in danger), documents objectively, and does not confront or investigate.",
              "Report the suspicion to child protective services now as state law requires; you don't need proof. If she is in immediate danger, involve law enforcement or send her to the emergency department. Document exact findings and quotes objectively. Don't accuse or investigate yourself."
            ),
          ],
        },
        {
          text: "Later that week an adult patient's syphilis test is positive.",
          ask: "What reporting and follow-up does this need?",
          parts: [
            part(
              "Reportable disease",
              "Treats it, reports it to the local or state health department as a notifiable disease under state rules, and arranges partner notification and follow-up testing.",
              "Syphilis is nationally notifiable: report it to the health department under your state's rules, treat, arrange partner notification (often with the health department) and follow-up serologic testing, and offer HIV testing."
            ),
          ],
        },
      ],
    },
    {
      slug: "fnpancc-ai-documentation",
      objective: "Use AI tools, voice recognition and the electronic record responsibly, checking what they produce",
      kind: "build",
      title: "Review an AI-drafted visit note",
      brief:
        "A fictional clinic uses an ambient AI scribe. After a visit with a 58-year-old man for knee pain, it drafts the note below. In the visit he said he takes no blood thinners, you examined only the right knee, and you prescribed nothing.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the lines you must correct before signing, and explain your responsibility.",
          parts: [
            selectPart(
              "Lines to correct",
              "Selects the line saying he takes warfarin, the bilateral knee examination, and the prescription for naproxen; leaves the accurate history and plan lines.",
              "The scribe invented warfarin, documented an exam of both knees that did not happen, and added a prescription never given. Each would mislead later clinicians or misrepresent billing.",
              {
                header: "AI-drafted note",
                lines: [
                  "Right knee pain for 3 weeks after gardening",
                  "Medications: warfarin 5 mg daily",
                  "Exam: both knees with full range of motion, no effusion",
                  "Plan: ice, activity modification, physical therapy referral",
                  "Prescribed naproxen 500 mg twice daily",
                ],
                correct: [1, 2, 4],
                display: "table",
              }
            ),
            part(
              "Responsibility",
              "States that the signing clinician is responsible for the accuracy of the record whatever tool drafted it, must review and correct before signing, and should report repeated tool errors and follow the organization's consent and privacy policy for the tool.",
              "Your signature makes the note yours. Read every AI-drafted note, correct it before signing, tell the patient when ambient recording is used per policy, and report repeated errors to the organization so the tool can be fixed."
            ),
          ],
        },
      ],
    },
    {
      slug: "fnpancc-antibiotic-stewardship",
      objective: "Treat common infections -- pharyngitis, otitis media, sinusitis, urinary tract infection, pneumonia -- with stewardship, including when not to prescribe",
      kind: "case",
      title: "\"I always get a Z-Pak\"",
      brief: "A fictional 35-year-old woman has had nasal congestion, sore throat and cough for 4 days. No fever. She asks for azithromycin because \"it always works.\"",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Examination: clear rhinorrhea, mild pharyngeal redness, clear lungs.",
          ask: "Do you prescribe an antibiotic? Explain your reasoning.",
          parts: [
            part(
              "Decision",
              "Declines an antibiotic: a 4-day viral upper respiratory infection does not benefit, and antibiotics carry side effects and resistance; distinguishes the features that would change the decision (symptoms persisting without improvement well past a cold's usual course, a severe onset with high fever, or worsening after initial improvement).",
              "No antibiotic: this is a viral upper respiratory infection. Antibiotics would not shorten it but can cause diarrhea, allergic reactions and resistance. Bacterial sinusitis becomes more likely when symptoms persist without improvement well past a cold's usual course, start severely with high fever, or worsen after first improving."
            ),
          ],
        },
        {
          text: "She is disappointed and says she has a work trip in two days.",
          ask: "How do you keep her trust?",
          parts: [
            part(
              "Communication",
              "Validates her concern, explains briefly, offers symptom relief and a clear plan for when to return (or a delayed-prescription approach where appropriate), using shared decision-making.",
              "Acknowledge how miserable she feels and the trip pressure; explain why the antibiotic won't help; recommend symptom measures (saline, analgesics, rest) and tell her exactly when to call back. A safety-net plan, not a dismissal."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------------------ Evaluation (13%) -- 2
    {
      slug: "fnpancc-monitor-adverse",
      objective: "Monitor drug therapy for adverse effects and interactions, and deprescribe when harm outweighs benefit",
      kind: "case",
      title: "Muscle aches on a statin",
      brief: "A fictional 66-year-old woman started atorvastatin three months ago after a stroke. She reports aching thighs and wants to stop it.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "No weakness or dark urine. She recently started clarithromycin for bronchitis.",
          ask: "How do you evaluate this?",
          parts: [
            part(
              "Evaluate",
              "Assesses for serious myopathy (weakness, dark urine, CK), identifies the interaction (clarithromycin raises atorvastatin levels), and weighs the high benefit of a statin after stroke against the symptoms.",
              "Ask about weakness and dark urine and check a CK if concerned. Clarithromycin inhibits atorvastatin's metabolism, raising levels and myopathy risk. After a stroke the statin's benefit is high, so the goal is to keep her on one if possible."
            ),
          ],
        },
        {
          text: "CK is normal. The antibiotic course ends tomorrow.",
          ask: "What is the plan?",
          parts: [
            part(
              "Plan",
              "Pauses the statin briefly or continues after the antibiotic, then rechallenges or switches dose or agent, and reassesses symptoms, using shared decision-making rather than permanent discontinuation.",
              "Hold the statin until the antibiotic is finished and the aches settle, then restart (or try a lower dose or another statin) and reassess. Explain why stopping for good would leave her at higher risk of another stroke."
            ),
          ],
        },
      ],
    },
    {
      slug: "fnpancc-capacity-guardianship",
      objective: "Apply justice, consent, guardianship and bioethics principles to treatment decisions",
      kind: "case",
      title: "Declining dialysis referral",
      brief: "A fictional 78-year-old man with advancing kidney disease declines referral for dialysis planning. His daughter says he has \"memory problems\" and asks you to override him.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He can explain his kidney disease, what dialysis involves, what may happen without it, and that he values time at home over longer life.",
          ask: "Does he have capacity for this decision?",
          parts: [
            part(
              "Capacity",
              "Assesses decision-specific capacity (understanding, appreciation, reasoning, expressing a choice), concludes he has it here despite memory problems, and respects his autonomy.",
              "Capacity is decision-specific: he understands the information, appreciates it applies to him, reasons with it against his values, and states a consistent choice. A memory diagnosis does not remove that. He can decline."
            ),
          ],
        },
        {
          text: "The daughter asks whether she can become his guardian to make the decision.",
          ask: "How do you respond?",
          parts: [
            part(
              "Response",
              "Explains that guardianship is a court process for people who lack capacity and is not a way to override a capable person's choice; offers a family meeting, advance care planning, a health care power of attorney he chooses, and palliative or conservative kidney care.",
              "Guardianship is decided by a court only when someone cannot make decisions; it isn't a way to change a capable person's choice. Offer a family meeting, help him name a health care agent for the future, record his wishes in an advance directive, and refer to palliative care for conservative kidney management."
            ),
          ],
        },
      ],
    },
  ],
};
