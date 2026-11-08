import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-123 pilot: AACN CCRN (Adult); REQ-124 completed the CCRN (Pediatric)
// and CCRN (Neonatal) pilots (12 labs each, below).
//
// Aligned to the AACN CCRN Adult test plan: Clinical Judgment 80%
// (Cardiovascular 13%, Respiratory 12%, Endocrine/Hematology/
// Gastrointestinal/Renal-Genitourinary/Integumentary 21%, Musculoskeletal/
// Neurological/Behavioral-Psychosocial 18%, Multisystem 16%) and
// Professional Caring and Ethical Practice 20% (the AACN Synergy Model).
//   https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en
//   https://www.aacn.org/-/media/aacn-website/education/online-courses/adult-ccrn-certification-review/adult-ccrn-review-course-syllabus.pdf
// Density ("hybrid"): 2 per domain = 12 for Adult, and 12 each for
// Pediatric and Neonatal (REQ-124).
//
// SAFETY: every patient is fictional; exam practice, not clinical guidance.
// Thresholds quoted are long-standing guideline values (for example the
// potassium check before an insulin infusion in DKA, the blood-pressure
// limit before IV thrombolysis, MAP 65 in septic shock); local protocols
// differ, and every lab is needs_expert_review until a critical-care nurse
// educator approves it (docs/labs.md).

const CCRN_SOURCES = [
  source("https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en", "exam_outline", "2026-11-07"),
  source("https://www.aacn.org/-/media/aacn-website/education/online-courses/adult-ccrn-certification-review/adult-ccrn-review-course-syllabus.pdf", "reference", "2026-11-07"),
];

export const CCRNADULT_LABS: SeedLabSet = {
  trackCode: "CCRNADULT",
  sources: CCRN_SOURCES,
  labs: [
    {
      slug: "post-cabg-tamponade",
      objective: "Care of the patient after cardiac surgery",
      kind: "case",
      title: "Four hours after bypass surgery",
      brief:
        "A fictional 64-year-old is in the ICU four hours after coronary artery bypass grafting, with mediastinal chest tubes, a pulmonary artery catheter and epicardial pacing wires. For the first three hours chest tube drainage was 80-120 mL per hour.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Over the last 30 minutes chest tube drainage has stopped. Heart rate has risen from 88 to 122 /min, blood pressure fallen from 118/70 to 86/62 mm Hg, and the right atrial pressure and pulmonary artery occlusion pressure have both risen and are now nearly equal. Heart sounds are muffled.",
          ask: "What is the most likely problem, and what do you do?",
          parts: [
            part(
              "Problem",
              "Identifies cardiac tamponade, citing the sudden stop in drainage with hypotension, tachycardia, narrowing pulse pressure, rising and equalising filling pressures and muffled heart sounds.",
              "Cardiac tamponade: drainage suddenly stopped (blood is collecting around the heart), with hypotension, tachycardia, a narrowing pulse pressure, rising and equalising RA and PAOP pressures and muffled heart sounds."
            ),
            part(
              "Actions",
              "Notifies the surgeon immediately, checks chest tube patency per unit protocol, supports the patient (volume per orders) and prepares for emergency re-exploration or pericardial drainage.",
              "Call the surgeon now; check the chest tubes for clots and kinks per protocol; give fluid as ordered to support preload; prepare for emergency resternotomy or pericardial drainage at the bedside."
            ),
          ],
        },
        {
          text: "After re-exploration the patient returns with a cardiac index of 1.8 L/min/m2, PAOP 20 mm Hg and cool extremities.",
          ask: "Interpret the numbers and say what therapy you anticipate.",
          parts: [
            part(
              "Interpretation",
              "Recognises low cardiac output (cardiac index below about 2.2) with high filling pressure, i.e. a pump (contractility) problem rather than low volume.",
              "Cardiac index 1.8 is low and PAOP 20 is high with poor perfusion: low output from weak pumping, not hypovolemia."
            ),
            part(
              "Therapy",
              "Anticipates inotropic support (and afterload reduction or mechanical support if needed) rather than more fluid, with close monitoring.",
              "Expect an inotrope per orders, possibly afterload reduction or mechanical circulatory support if output stays low; avoid further fluid loading; trend CI, SvO2, lactate and urine output."
            ),
          ],
        },
      ],
    },
    {
      slug: "shock-hemodynamic-profiles",
      objective: "Monitoring hemodynamic status, non-invasive and invasive, and recognising instability from the numbers and the patient",
      kind: "build",
      title: "Read three hemodynamic profiles",
      brief:
        "Three fictional ICU patients have pulmonary artery catheter readings. Patient 1: cardiac output low, PAOP high, systemic vascular resistance high. Patient 2: cardiac output low, PAOP low, SVR high. Patient 3: cardiac output normal to high, PAOP low, SVR low, warm skin.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the shock state each profile fits and the first class of therapy.",
          parts: [
            part("Patient 1", "Cardiogenic shock; inotropic support (with afterload reduction or mechanical support as indicated), avoiding fluid loading.", "Cardiogenic shock: the pump is failing. Inotropes, afterload reduction or mechanical support as ordered; no fluid loading."),
            part("Patient 2", "Hypovolemic shock; restore volume (fluids or blood, depending on the cause) and treat the source of loss.", "Hypovolemic shock: replace volume -- crystalloid or blood depending on the cause -- and stop the loss."),
            part("Patient 3", "Distributive shock (for example septic); fluids plus a vasopressor to restore vascular tone, and treat the cause.", "Distributive (for example septic) shock: fluid resuscitation and a vasopressor to restore tone; find and treat the cause (antibiotics, source control)."),
          ],
        },
      ],
    },
    {
      slug: "ards-ventilator-case",
      objective: "Mechanical ventilation: settings, the patient's response, and what to change when it is not working",
      kind: "case",
      title: "A ventilated patient with ARDS",
      brief:
        "A fictional 50-year-old with pneumonia-related ARDS is on volume-control ventilation: tidal volume 6 mL/kg of predicted body weight, PEEP 10 cm H2O, FiO2 0.60, rate 20 /min.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Arterial blood gas: pH 7.28, PaCO2 55 mm Hg, HCO3- 25 mEq/L, PaO2 62 mm Hg.",
          ask: "Interpret the gas and the oxygenation.",
          parts: [
            part(
              "Acid-base",
              "Identifies acute (uncompensated) respiratory acidosis.",
              "pH 7.28 low, PaCO2 55 high, HCO3- normal: acute respiratory acidosis, not compensated."
            ),
            part(
              "Oxygenation",
              "Calculates P/F ratio about 103 (62 / 0.60) and places it in the moderate ARDS range (100-200), and explains why the team keeps low tidal volumes (accepting some hypercapnia) and adjusts rate or PEEP/FiO2 instead of raising tidal volume.",
              "P/F = 62 / 0.60 = about 103: moderate ARDS. Keep lung-protective low tidal volumes; manage CO2 by adjusting rate within limits and accept some hypercapnia rather than increasing tidal volume; improve oxygenation with PEEP and FiO2 per protocol."
            ),
          ],
        },
        {
          text: "The high-pressure alarm sounds repeatedly. Plateau pressure is now 33 cm H2O.",
          ask: "What do you check and why does the plateau matter?",
          parts: [
            part(
              "Causes to check",
              "Checks the patient first: secretions (suction), biting or kinked tube, bronchospasm, patient-ventilator dyssynchrony, and pneumothorax.",
              "Look at the patient, not just the alarm: secretions needing suction, a bitten or kinked tube, bronchospasm, the patient fighting the ventilator, or a pneumothorax."
            ),
            part(
              "Plateau",
              "States the lung-protective target of plateau pressure 30 cm H2O or less, so 33 needs the team to act (for example lower tidal volume per protocol).",
              "Plateau above 30 cm H2O means alveolar overdistension risk; report it so tidal volume can be reduced per the lung-protective protocol."
            ),
          ],
        },
        {
          text: "Suddenly SpO2 falls to 78%, breath sounds are absent on the right, the trachea deviates to the left and blood pressure drops to 74/40 mm Hg.",
          ask: "What is happening and what do you do?",
          parts: [
            part(
              "Recognition",
              "Recognises a tension pneumothorax on the right.",
              "A right tension pneumothorax: absent breath sounds on the right, trachea pushed away, falling SpO2 and blood pressure."
            ),
            part(
              "Action",
              "Calls for immediate help, ventilates with 100% oxygen (bag via the tube if needed) and prepares for emergency needle decompression and chest tube insertion by the provider.",
              "Call for emergency help now; give 100% oxygen and bag-ventilate if needed; prepare for immediate needle decompression and a chest tube."
            ),
          ],
        },
      ],
    },
    {
      slug: "choose-respiratory-support",
      objective: "Noninvasive positive pressure ventilation (BiPAP, CPAP, high-flow nasal cannula) and its limits",
      kind: "build",
      title: "Choose the level of respiratory support",
      brief:
        "Three fictional patients. (A) Alert patient with a COPD exacerbation, pH 7.29, PaCO2 62 mm Hg, able to protect the airway. (B) Alert patient with pneumonia, SpO2 88% on a non-rebreather, respiratory rate 30, PaCO2 34 mm Hg, no hypercapnia. (C) Patient with a decreasing level of consciousness who is vomiting, with hypercapnic respiratory failure.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose support for each and say what would make you escalate.",
          parts: [
            part("Patient A", "Chooses BiPAP (NIPPV) for hypercapnic COPD exacerbation in an alert patient.", "BiPAP: bilevel pressure supports ventilation and helps clear CO2 in an alert COPD patient."),
            part("Patient B", "Chooses high-flow nasal cannula (or CPAP) for hypoxemic respiratory failure without hypercapnia.", "High-flow nasal cannula: high, humidified FiO2 with a little PEEP for hypoxemia without CO2 retention."),
            part("Patient C", "Rules out NIPPV (cannot protect airway, decreased consciousness, vomiting -- aspiration risk) and prepares for intubation.", "No mask ventilation: decreasing consciousness and vomiting mean the airway is not protected. Prepare for intubation."),
            part("Escalation trigger", "Names signs NIPPV is failing (no improvement in pH/PaCO2 or work of breathing within the first hours, worsening mental status, intolerance) as reasons to escalate to intubation.", "If pH, CO2 and work of breathing do not improve within the first hour or two, or the patient becomes drowsy or can't tolerate the mask, escalate to intubation."),
          ],
        },
      ],
    },
    {
      slug: "dka-case",
      objective: "Diabetic ketoacidosis (DKA)",
      kind: "case",
      title: "Treating diabetic ketoacidosis",
      brief:
        "A fictional 24-year-old with type 1 diabetes arrives after two days of vomiting. Glucose 520 mg/dL, pH 7.12, HCO3- 10 mEq/L, anion gap 24, potassium 3.1 mEq/L, heart rate 124 /min, dry mucous membranes.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The team is about to start treatment.",
          ask: "What comes first, and why does the potassium matter before insulin?",
          parts: [
            part(
              "Fluids first",
              "Starts isotonic fluid resuscitation first for the volume deficit.",
              "Start isotonic IV fluid resuscitation per orders -- the patient is severely volume-depleted."
            ),
            part(
              "Potassium before insulin",
              "Explains that insulin moves potassium into cells, so with potassium below about 3.3 mEq/L the insulin infusion is held and potassium is replaced first, with cardiac monitoring.",
              "Insulin drives potassium into the cells; at 3.1 mEq/L starting insulin could cause dangerous hypokalemia and dysrhythmias. Replace potassium first (guidelines hold insulin below about 3.3) with cardiac monitoring, then start the insulin infusion."
            ),
          ],
        },
        {
          text: "Four hours into the insulin infusion: glucose 230 mg/dL, anion gap 16, potassium 4.0 mEq/L.",
          ask: "What changes now?",
          parts: [
            part(
              "Dextrose and insulin",
              "Adds dextrose to the IV fluids as glucose falls to about 200-250 mg/dL and continues the insulin infusion until the ketoacidosis resolves (anion gap closed), rather than stopping insulin because glucose is lower.",
              "Add dextrose to the fluids so glucose doesn't fall too far, and keep the insulin infusion running until the anion gap closes -- the gap, not the glucose, shows the acidosis is resolving."
            ),
          ],
        },
        {
          text: "Next morning the gap has closed, the patient is eating and the team plans to stop the infusion.",
          ask: "How is the infusion stopped safely?",
          parts: [
            part(
              "Transition",
              "Gives subcutaneous basal insulin before stopping the infusion, with an overlap (commonly 1-2 hours), to prevent rebound ketoacidosis.",
              "Give subcutaneous basal insulin and keep the infusion running for an overlap (commonly 1-2 hours) before stopping it, so there is no gap in insulin and DKA doesn't return."
            ),
          ],
        },
      ],
    },
    {
      slug: "trali-vs-taco",
      objective: "Transfusion reactions such as TRALI and TACO",
      kind: "build",
      title: "Tell TRALI from TACO",
      brief:
        "Two fictional patients develop shortness of breath during or soon after a transfusion. Patient 1 (with heart failure) has blood pressure 168/96 mm Hg, jugular venous distension and crackles, and improved after a diuretic last time. Patient 2 has blood pressure 88/50 mm Hg, fever, bilateral infiltrates on chest X-ray and no signs of fluid overload.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name each reaction and the nursing actions.",
          parts: [
            part("Patient 1", "Identifies transfusion-associated circulatory overload (TACO) from hypertension, JVD, crackles and a heart failure history.", "TACO: volume overload -- hypertension, JVD, crackles, heart failure history; it responds to diuresis."),
            part("Patient 2", "Identifies transfusion-related acute lung injury (TRALI) from hypotension, fever and non-cardiogenic pulmonary edema without overload.", "TRALI: non-cardiogenic lung injury -- hypotension, fever, bilateral infiltrates without fluid overload; diuretics don't help."),
            part("Actions for both", "Stops the transfusion, supports oxygenation/ventilation, notifies the provider and blood bank, and anticipates a diuretic for TACO but supportive care (not diuretics) for TRALI.", "Stop the transfusion, keep IV access, give oxygen and support breathing as needed, notify the provider and blood bank; expect a diuretic for TACO and supportive care -- possibly ventilation -- for TRALI."),
          ],
        },
      ],
    },
    {
      slug: "acute-ischemic-stroke-case",
      objective: "Stroke, hemorrhagic and ischemic, and neuroendovascular interventions such as coiling and thrombectomy",
      kind: "case",
      title: "A stroke alert in the ICU",
      brief:
        "A fictional 70-year-old ICU patient recovering from pneumonia suddenly cannot move the left arm and has slurred speech. They were last seen normal 40 minutes ago.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You have just found the patient.",
          ask: "What do you do first?",
          parts: [
            part(
              "Immediate steps",
              "Activates the stroke alert/team, notes the last-known-well time, checks blood glucose, assesses with a stroke scale (for example NIHSS) and prepares for emergent non-contrast head CT.",
              "Call the stroke alert, record last known well, check a fingerstick glucose, do a quick NIHSS, and get the patient ready for an emergent non-contrast head CT."
            ),
          ],
        },
        {
          text: "CT shows no hemorrhage. The team plans IV thrombolysis. Blood pressure is 196/104 mm Hg.",
          ask: "What must happen before the thrombolytic is given?",
          parts: [
            part(
              "Blood pressure",
              "Lowers blood pressure to below 185/110 mm Hg per protocol before thrombolysis (and keeps it below 180/105 afterwards).",
              "Lower the pressure below 185/110 mm Hg with the ordered agent before the thrombolytic is given, then keep it below 180/105 afterwards per protocol."
            ),
          ],
        },
        {
          text: "Forty minutes after the thrombolytic, the patient complains of a severe headache, vomits, and the stroke scale score worsens.",
          ask: "What do you suspect and what do you do?",
          parts: [
            part(
              "Suspicion",
              "Suspects intracranial hemorrhage after thrombolysis.",
              "Intracranial hemorrhage, a complication of thrombolysis."
            ),
            part(
              "Actions",
              "Stops the thrombolytic infusion if still running, notifies the provider immediately and prepares for an emergent CT, monitoring neuro status and airway.",
              "Stop any thrombolytic still infusing, notify the provider now, prepare for an emergent CT and possible reversal treatment, and keep close neuro and airway checks."
            ),
          ],
        },
      ],
    },
    {
      slug: "delirium-cam-icu",
      objective: "Delirium, and using behavioral assessment tools for delirium, alcohol withdrawal and mental status",
      kind: "build",
      title: "Screen for delirium and plan prevention",
      brief:
        "A fictional 76-year-old on day 3 after abdominal surgery was calm and oriented yesterday. Tonight they are drowsy but rousable to voice (RASS -1), cannot keep track of a simple attention task, and give rambling answers. They received a benzodiazepine for sleep last night and the room lights and monitors stay on all night.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Apply a delirium screen and plan the response.",
          parts: [
            part("Screen result", "Applies CAM-ICU features: acute change or fluctuating course, plus inattention, plus altered level of consciousness (RASS not 0) or disorganised thinking -> CAM-ICU positive (delirium).", "Acute change from yesterday (feature 1), inattention (feature 2), and altered level of consciousness (RASS -1) with disorganised thinking -> CAM-ICU positive: delirium."),
            part("Report and look for causes", "Reports to the provider and looks for causes (infection, hypoxia, pain, metabolic changes, medications such as benzodiazepines).", "Report the positive screen and look for causes -- infection, hypoxia, pain, electrolytes or glucose, urinary retention and the benzodiazepine."),
            part("Non-drug prevention", "Uses a bundle approach: minimise deliriogenic sedatives (especially benzodiazepines), protect sleep (lights and noise down at night), reorientation, glasses/hearing aids, early mobility and family involvement.", "Ask to avoid benzodiazepines; dim lights and quiet alarms at night and cluster care; reorient often; glasses and hearing aids on; mobilise early; involve family."),
          ],
        },
      ],
    },
    {
      slug: "sepsis-escalation-case",
      objective: "Early sepsis identification and sepsis management",
      kind: "case",
      title: "Recognise and escalate sepsis",
      brief:
        "A fictional 58-year-old is on day 3 after bowel surgery in the step-down area of the ICU.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Temperature 38.9 degrees C, heart rate 118 /min, respiratory rate 26 /min, blood pressure 98/60 mm Hg, new confusion. The abdomen is more tender than this morning.",
          ask: "What do you suspect and what is your first response?",
          parts: [
            part(
              "Recognition",
              "Suspects sepsis (suspected infection with signs of organ dysfunction such as altered mentation, tachypnea, low blood pressure), possibly from an abdominal source.",
              "Sepsis from a likely abdominal source: infection is suspected and there are signs of organ dysfunction -- new confusion, fast breathing, low blood pressure."
            ),
            part(
              "First response",
              "Escalates immediately (rapid response/provider) and starts the sepsis bundle per protocol: lactate, blood cultures before antibiotics, broad-spectrum antibiotics promptly, and fluid resuscitation for hypotension or high lactate.",
              "Call the provider/rapid response now; start the sepsis bundle: measure lactate, draw blood cultures before antibiotics, give broad-spectrum antibiotics quickly, and start fluid resuscitation as ordered."
            ),
          ],
        },
        {
          text: "After 30 mL/kg of crystalloid the mean arterial pressure is 58 mm Hg and lactate is 4.6 mmol/L.",
          ask: "What does this mean and what is next?",
          parts: [
            part(
              "Septic shock",
              "Recognises septic shock (needs vasopressors to keep MAP 65 or more despite fluids, with raised lactate) and anticipates norepinephrine as the first-line vasopressor, titrated to MAP 65 or more.",
              "Septic shock: hypotension despite fluids with a high lactate. Expect norepinephrine first, titrated to a MAP of 65 mm Hg or more, ideally through a central line."
            ),
            part(
              "Source and reassessment",
              "Anticipates source control (for example imaging and return to theatre for a possible anastomotic leak) and repeat lactate and frequent reassessment (MAP, urine output, mental status).",
              "Ask about source control -- imaging and possible surgery for a leak -- repeat the lactate, and reassess MAP, urine output and mental status often."
            ),
          ],
        },
      ],
    },
    {
      slug: "multi-patient-priorities",
      objective: "Assessing, evaluating and prioritising data by the patient's immediate condition and anticipated needs",
      kind: "build",
      title: "Prioritise a three-patient ICU assignment",
      brief:
        "At 07:30 you take three fictional ICU patients. (1) A patient on a norepinephrine infusion whose MAP has drifted from 68 to 61 mm Hg over the last hour. (2) A patient extubated yesterday, now on 2 L/min nasal cannula, SpO2 95%, asking for breakfast before the swallow evaluation scheduled for 10:00. (3) A patient with a GI bleed who received two units of blood overnight, hemoglobin stable, due for a repeat level at 08:00.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write your order of priority and plan.",
          parts: [
            part("First patient", "Sees patient 1 first because the MAP is below the usual target of 65 and falling on a vasopressor -- an active instability.", "Patient 1 first: MAP 61 and falling on norepinephrine is below the usual 65 target -- check the line and infusion, assess perfusion, titrate per protocol and tell the provider."),
            part("Safety for patient 2", "Keeps patient 2 nil by mouth until the swallow evaluation (aspiration risk after extubation) and explains why.", "Patient 2 stays nil by mouth until the 10:00 swallow evaluation -- recently extubated patients are at risk of aspiration; offer mouth care and explain the reason."),
            part("Patient 3 and reassessment", "Ensures the 08:00 hemoglobin is drawn and reviewed, monitors for rebleeding signs, and states when each patient will be reassessed.", "Draw the 08:00 hemoglobin and review it; watch for rebleeding (tachycardia, hypotension, melena); reassess patient 1 every few minutes until stable, and the others within the hour."),
          ],
        },
      ],
    },
    {
      slug: "sbar-escalation-advocacy",
      objective: "Advocacy: representing the concerns of the patient, family and nursing staff",
      kind: "build",
      title: "Escalate a concern the provider dismissed",
      brief:
        "At 02:00 a fictional patient two days after a pulmonary lobectomy has a respiratory rate of 30 /min (was 18), SpO2 89% on 4 L/min (was 95% on 2 L/min), heart rate 112 /min and new anxiety. You called the on-call provider at 01:30, who said \"just give the as-needed anxiolytic\" and did not come to assess.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write how you escalate.",
          parts: [
            part("SBAR", "Writes a clear SBAR call stating the concern directly: the worsening trend, the likely seriousness, and a specific request (come and assess now, imaging/ABG orders).", "S: patient deteriorating. B: two days post-lobectomy. A: RR 18 -> 30, SpO2 95% on 2 L -> 89% on 4 L, HR 112 and anxious -- I'm concerned about a respiratory complication, not anxiety. R: please come and assess now; can we get an ABG and chest X-ray?"),
            part("Chain of command", "If the concern is still not addressed, escalates through the chain of command (charge nurse, rapid response team, attending/supervisor) rather than accepting the plan or waiting.", "If the provider still won't come, involve the charge nurse and call the rapid response team, then the attending or supervisor -- the patient's safety comes before the hierarchy."),
            part("Documentation", "Documents the assessment, calls, responses and escalation factually and promptly.", "Document the findings, the times and content of each call, the responses and the escalation, factually."),
          ],
        },
      ],
    },
    {
      slug: "advance-directive-conflict",
      objective: "Moral agency: identifying ethical and clinical concerns and helping resolve them",
      kind: "case",
      title: "The family disagrees with the advance directive",
      brief:
        "A fictional 81-year-old with end-stage lung disease is intubated after a sudden decline. Their advance directive, signed two years ago, says they do not want prolonged mechanical ventilation or CPR. Their son, the named health care proxy, is at the bedside; their daughter, who arrived from abroad, demands that \"everything be done\".",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The daughter tells you she will sue if you \"let her mother die\".",
          ask: "What do you do?",
          parts: [
            part(
              "Advocacy",
              "Advocates for the patient's documented wishes: verifies the directive is in the record and who the legal decision-maker is (the proxy), and shares the conflict with the team.",
              "Confirm the advance directive is in the chart and that the son is the legal proxy, and tell the attending and charge nurse about the conflict -- my role is to represent the patient's own wishes."
            ),
            part(
              "Supporting the family",
              "Responds to the daughter with empathy (acknowledging fear and grief) without arguing, and requests a family meeting with the team (and palliative care).",
              "Acknowledge her distress -- \"You love your mother and this is a lot to take in\" -- without arguing, and ask the team to set up a family meeting with palliative care."
            ),
          ],
        },
        {
          text: "At the family meeting the disagreement continues and the team is unsure how to proceed.",
          ask: "What resource helps resolve this?",
          parts: [
            part(
              "Ethics consultation",
              "Requests an ethics consultation (ethics committee) to help resolve the conflict, while continuing compassionate care and documentation.",
              "Request an ethics consultation; meanwhile keep the patient comfortable, keep everyone informed and document the meetings and decisions."
            ),
          ],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CCRN (Pediatric) -- the full pilot set (REQ-124, Nick 2026-11-07, decision
// 13): 12 labs, option (d) hybrid unit by unit -- 2 in each of the six units
// (lib/labs.test.ts checks it against unitPlan). Each lab names one of the
// track's objectives, which paraphrase the patient-care problems and
// Testable Nursing Actions of AACN's Pediatric CCRN test plan (exams on and
// after November 19, 2025; CCRN Exam Handbook, PDF p.21-24, as read for the
// track on 2026-10-31 -- supabase/seed/tracks/ccrn-peds-neo.ts). Category
// weights 11/13/25/15/17 + 20 cross-checked on 2026-11-07 against
// open-exam-prep.com's Pediatric CCRN test-plan summary (the AACN PDF itself
// was not reachable from that session).
//   https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en
//   https://www.aacn.org/certification/get-certified/ccrn-peds
//   https://open-exam-prep.com/study-guides/ccrn-pediatric/introduction/test-plan-study-strategy
// Clinical values are long-standing, widely taught ones (PALS doses for
// SVT, the DI / SIADH / cerebral salt wasting pattern, the FLACC / FACES /
// numeric pain scales by age). Where practice differs the rubric asks for
// "per protocol / per order". Every patient is fictional; exam practice, not
// clinical guidance. All needs_expert_review until a pediatric critical-care
// nurse educator approves each one.
// ---------------------------------------------------------------------------

const CCRNPEDS_SOURCES = [
  source("https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en", "exam_outline", "2026-11-07"),
  source("https://www.aacn.org/certification/get-certified/ccrn-peds", "exam_outline", "2026-11-07"),
];

export const CCRNPEDS_LABS: SeedLabSet = {
  trackCode: "CCRNPEDS",
  sources: CCRNPEDS_SOURCES,
  labs: [
    // Cardiovascular (2)
    {
      slug: "peds-hypercyanotic-spell-case",
      objective: "Recognize and manage congenital cardiac malformations, including cyanotic spells and pre- and post-repair physiology",
      kind: "case",
      title: "A toddler turns blue while crying",
      brief:
        "A fictional 14-month-old with unrepaired tetralogy of Fallot is in the pediatric ICU awaiting surgery. Baseline SpO2 is 82-86% on room air. After a blood draw the child starts crying hard and won't settle.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "SpO2 falls to 58%, the child is deeply cyanotic, breathing fast and deep, and the systolic murmur you heard this morning has become much softer.",
          ask: "What is happening, and what do you do first?",
          parts: [
            part(
              "Recognition",
              "Identifies a hypercyanotic (\"tet\") spell: more blood shunting right to left past the narrowed pulmonary outflow, which is why the murmur gets softer as less blood crosses it.",
              "A hypercyanotic (tet) spell: right-to-left shunting has increased because flow out to the lungs has dropped, so less blood crosses the narrowed outflow tract and the murmur softens."
            ),
            part(
              "First actions",
              "Calms the child (parent holds them), places them knee-to-chest to raise systemic resistance, gives oxygen, and calls for help.",
              "Keep the child calm, ideally in a parent's arms; bring the knees to the chest to raise systemic vascular resistance and push blood toward the lungs; give oxygen; call the provider at once."
            ),
          ],
        },
        {
          text: "After two minutes in the knee-chest position with oxygen, SpO2 is still 62%.",
          ask: "What do you anticipate next?",
          parts: [
            part(
              "Next treatments",
              "Anticipates ordered treatments that ease the spell: morphine (calms and relaxes the outflow tract), an IV fluid bolus to support preload, and a vasopressor such as phenylephrine to raise systemic resistance; prepares for escalation if it continues.",
              "Expect morphine to calm the child and the breathing, an isotonic fluid bolus, and phenylephrine to raise systemic vascular resistance, all per order; prepare for sedation and airway support if the spell doesn't break."
            ),
            part(
              "Afterwards",
              "Plans to tell the cardiology/surgical team because a spell can bring surgery forward, and to prevent triggers (dehydration, distress, avoidable procedures clustered).",
              "Report the spell to cardiology and the surgeons, since spells often move the repair earlier; prevent triggers by keeping the child hydrated and calm and clustering painful procedures."
            ),
          ],
        },
      ],
    },
    {
      slug: "peds-svt-infant",
      objective: "Identify, interpret and respond to dysrhythmias and conduction system defects such as prolonged QT and Wolff-Parkinson-White, using a 12-lead ECG where indicated",
      kind: "build",
      title: "Plan the response to an infant's fast rhythm",
      brief:
        "A fictional 3-month-old (5 kg) on the monitor suddenly has a narrow-QRS regular rhythm at 280 /min with no visible P waves and no beat-to-beat variation. The infant is pale and fussy but has a capillary refill of 2 seconds, a palpable brachial pulse and a normal blood pressure. An IV is in place.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write your interpretation and plan.",
          parts: [
            part(
              "Rhythm",
              "Interprets supraventricular tachycardia (narrow QRS, rate above about 220 in an infant, abrupt onset, fixed rate, no P waves) rather than sinus tachycardia, and notes the infant is still perfusing.",
              "Supraventricular tachycardia: narrow complexes at 280 with no P waves and no variation, starting abruptly -- too fast and too fixed for sinus tachycardia. The infant is still perfusing, so this is stable SVT."
            ),
            part(
              "First steps",
              "Calls for help, gets a 12-lead ECG if it doesn't delay treatment, and tries a vagal manoeuvre suited to an infant (ice water to the face, without blocking the airway).",
              "Call the provider and team, record a 12-lead if it can be done quickly, and try a vagal manoeuvre: a bag of ice water over the face for a few seconds, keeping the airway clear."
            ),
            part(
              "If it continues",
              "Anticipates adenosine by rapid IV push followed at once by a rapid flush, per order (PALS first dose 0.1 mg/kg), with continuous ECG recording; and synchronised cardioversion (0.5-1 J/kg) with sedation if the infant becomes unstable or adenosine fails.",
              "Prepare adenosine 0.1 mg/kg (0.5 mg here) as ordered, given as a rapid push close to the hub with an immediate rapid saline flush while recording the rhythm; if it fails or the infant becomes poorly perfused, prepare for synchronised cardioversion at 0.5-1 J/kg with sedation."
            ),
          ],
        },
      ],
    },
    // Respiratory (2)
    {
      slug: "peds-status-asthmaticus-case",
      objective: "Manage status asthmaticus and pulmonary hypertension",
      kind: "case",
      title: "An asthma attack that is getting quieter",
      brief:
        "A fictional 9-year-old with asthma is admitted to the pediatric ICU on continuous nebulised albuterol and IV corticosteroids. On arrival there are loud wheezes throughout, the child speaks in short phrases, and SpO2 is 92% on a face mask.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "An hour later the child is drowsy, speaks one word at a time, and the chest is much quieter on auscultation. SpO2 is 89%. A blood gas shows PaCO2 46 mm Hg (it was 30 on admission).",
          ask: "Is the child getting better or worse, and why?",
          parts: [
            part(
              "Interpretation",
              "Recognises deterioration toward respiratory failure: a quieter chest with less air movement (not improvement), drowsiness, and a PaCO2 that has risen to normal-to-high in a child who should be blowing it off are signs of fatigue.",
              "Worse. A quiet chest means little air is moving, drowsiness and a rising PaCO2 (30 to 46) show the child is tiring -- a 'normal' CO2 in a breathless asthmatic is an ominous sign of impending respiratory failure."
            ),
            part(
              "Escalation",
              "Escalates immediately and anticipates additional therapy per orders (for example IV magnesium sulfate, ipratropium, and other bronchodilators) while preparing for airway support.",
              "Call the provider and senior team now; expect added therapy as ordered -- IV magnesium, ipratropium, possibly IV bronchodilators -- and get airway equipment, suction and a team ready for intubation or non-invasive support."
            ),
          ],
        },
        {
          text: "The team decides to intubate. After intubation the child is hard to ventilate and the blood pressure falls.",
          ask: "What do you watch for on the ventilator, and why?",
          parts: [
            part(
              "Air trapping",
              "Explains the risk of air trapping (breath stacking/auto-PEEP) with severe obstruction, which raises intrathoracic pressure and lowers venous return and blood pressure, and the risk of pneumothorax; supports a slow rate with a long expiratory time per the team's settings.",
              "Air trapping: with narrowed airways each breath may not fully empty, so pressure builds up in the chest, cutting venous return (low blood pressure) and risking a pneumothorax. Expect a low rate and long expiratory time; watch peak and plateau pressures, breath sounds and chest rise, and tell the team at once if pressure or blood pressure changes."
            ),
          ],
        },
      ],
    },
    {
      slug: "peds-intubated-deterioration-dope",
      objective: "Manage artificial airways (endotracheal tube, tracheostomy, LMA) and support rapid sequence intubation",
      kind: "build",
      title: "A ventilated child suddenly desaturates",
      brief:
        "A fictional 6-year-old intubated with a cuffed tube for pneumonia is turned for skin care. Within a minute SpO2 falls from 96% to 78%, the heart rate rises, and the ventilator alarms for high pressure.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write how you work out the cause and what you do.",
          parts: [
            part(
              "Systematic check",
              "Uses a systematic approach for an acutely deteriorating intubated patient (the DOPE mnemonic: Displacement, Obstruction, Pneumothorax, Equipment failure).",
              "Work through DOPE: Displacement of the tube, Obstruction of the tube, Pneumothorax, Equipment failure."
            ),
            part(
              "Checks for each",
              "Names how to check each: tube depth at the lip and end-tidal CO2/colour change and chest rise for displacement; suction catheter passage for obstruction; unequal breath sounds/chest rise, tracheal shift and falling blood pressure for pneumothorax; ventilator, circuit and oxygen supply for equipment.",
              "Displacement: check the tube marking at the lip, look for an end-tidal CO2 trace and equal chest rise. Obstruction: pass a suction catheter. Pneumothorax: listen for unequal breath sounds, look for uneven chest rise, a shifted trachea and falling blood pressure. Equipment: check circuit connections, the oxygen supply and the ventilator."
            ),
            part(
              "Immediate action",
              "Disconnects from the ventilator and hand-ventilates with 100% oxygen while calling for help, which separates equipment problems from patient problems; prepares for re-intubation or needle decompression as directed.",
              "Call for help, take the child off the ventilator and bag with 100% oxygen while checking -- if bagging fixes it, the ventilator or circuit was the problem; prepare for re-intubation or needle decompression as the team directs."
            ),
          ],
        },
      ],
    },
    // Endocrine, Hematology/Immunology, GI, Renal/GU, Integumentary (2)
    {
      slug: "peds-dka-cerebral-edema-case",
      objective: "Manage diabetes mellitus, diabetic ketoacidosis, hyperglycemia and hypoglycemia",
      kind: "case",
      title: "Watch the brain in pediatric DKA",
      brief:
        "A fictional 11-year-old with new type 1 diabetes arrives in the pediatric ICU in diabetic ketoacidosis: glucose 520 mg/dL, pH 7.05, bicarbonate 6 mmol/L, potassium 5.0 mmol/L. Deep, rapid breathing; drowsy but answering questions.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The admission orders include fluids and an insulin infusion.",
          ask: "What does safe early management include, and what do you monitor?",
          parts: [
            part(
              "Treatment",
              "Gives fluids at the ordered (measured, not aggressive) rate; starts a continuous low-dose insulin infusion without a bolus per protocol; adds potassium to the fluids once urine output and the potassium level allow; adds dextrose as glucose falls.",
              "Give fluids exactly as ordered -- measured, not rapid boluses unless in shock; start the insulin infusion (commonly 0.05-0.1 units/kg/hour, no bolus) per protocol; add potassium to fluids once the child is passing urine and the level allows, since insulin drives potassium into cells; add dextrose as glucose falls so insulin can continue."
            ),
            part(
              "Monitoring",
              "Monitors glucose hourly, electrolytes and blood gases regularly, fluid balance, and neurological status at least hourly because cerebral edema is the leading serious complication in children.",
              "Hourly glucose, regular electrolytes and blood gases, strict fluid intake and output, and hourly neurological checks -- cerebral edema is the most dangerous complication of DKA in children."
            ),
          ],
        },
        {
          text: "Six hours in, the child complains of a worsening headache, vomits again, the heart rate has fallen from 120 to 64 /min and blood pressure has risen. The child is now hard to rouse.",
          ask: "What do you suspect and what do you do?",
          parts: [
            part(
              "Recognition",
              "Suspects cerebral edema from the headache, recurrent vomiting, slowing heart rate with rising blood pressure and falling level of consciousness.",
              "Cerebral edema: new headache, vomiting again, a heart rate that has dropped with a rising blood pressure, and a falling level of consciousness."
            ),
            part(
              "Actions",
              "Calls the provider immediately; raises the head of the bed and keeps the head midline; anticipates hyperosmolar therapy (mannitol or hypertonic saline) per order and a reduced fluid rate; protects the airway and prepares for imaging once stable.",
              "Call the provider now; head of the bed up, head midline; prepare mannitol or hypertonic saline as ordered and expect the fluid rate to be reduced; support the airway; imaging only once treatment has started and the child is stable enough."
            ),
          ],
        },
      ],
    },
    {
      slug: "peds-di-siadh-csw",
      objective: "Distinguish and manage diabetes insipidus, SIADH and cerebral salt wasting",
      kind: "build",
      title: "Three sodium problems after neurosurgery",
      brief:
        "Three fictional children are in the pediatric ICU after brain surgery. Child A: urine output 8 mL/kg/hour, urine specific gravity 1.002, serum sodium 152 mmol/L. Child B: urine output 0.4 mL/kg/hour, concentrated urine, serum sodium 126 mmol/L, weight up and no signs of dehydration. Child C: urine output 5 mL/kg/hour, high urine sodium, serum sodium 127 mmol/L, dry mucous membranes and a rising heart rate.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name each child's problem and the main treatment you anticipate.",
          parts: [
            part(
              "Child A",
              "Identifies diabetes insipidus (lack of ADH: large volumes of dilute urine, high serum sodium) and anticipates replacing losses and desmopressin per order, with close sodium and fluid monitoring.",
              "Diabetes insipidus: too little ADH, so large volumes of very dilute urine and a high sodium. Expect desmopressin and replacement of urine losses as ordered, with frequent sodium checks and strict intake and output."
            ),
            part(
              "Child B",
              "Identifies SIADH (too much ADH: low urine output, concentrated urine, low sodium, euvolemic or fluid overloaded) and anticipates fluid restriction per order.",
              "SIADH: too much ADH, so the body holds water -- little, concentrated urine, a low sodium and weight gain without dehydration. Expect fluid restriction as ordered and close sodium monitoring."
            ),
            part(
              "Child C",
              "Identifies cerebral salt wasting (kidneys losing sodium and water: high urine output, low sodium, signs of dehydration) and anticipates replacing volume and sodium (isotonic or hypertonic saline per order), not fluid restriction.",
              "Cerebral salt wasting: sodium and water are both being lost -- lots of urine, a low sodium, and the child is getting dry. Expect volume and sodium replacement with saline as ordered; restricting fluid would make it worse."
            ),
            part(
              "Safety",
              "Notes that correcting sodium too fast is dangerous and that frequent neurological checks and seizure precautions are needed while sodium is abnormal.",
              "Change sodium only at the ordered rate (too fast can injure the brain), check it often, and keep up neurological checks and seizure precautions while it is abnormal."
            ),
          ],
        },
      ],
    },
    // Musculoskeletal, Neurological, Behavioral/Psychosocial (2)
    {
      slug: "peds-tbi-icp-case",
      objective: "Manage traumatic brain injury, intracranial hemorrhage, stroke and space-occupying lesions using neuroprotective protocols",
      kind: "case",
      title: "Protect an injured brain",
      brief:
        "A fictional 7-year-old with a severe traumatic brain injury after a fall is intubated, sedated and has an intracranial pressure (ICP) monitor. ICP is 18 mm Hg.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You are planning the next few hours of care.",
          ask: "What neuroprotective measures do you keep in place?",
          parts: [
            part(
              "Position and environment",
              "Keeps the head of the bed raised (about 30 degrees) with the head midline and nothing tight around the neck, and clusters care to limit stimulation.",
              "Head of bed about 30 degrees, head and neck midline, ties and collars not compressing the neck veins; cluster care and keep the room calm."
            ),
            part(
              "Physiology targets",
              "Avoids the secondary injuries: hypoxia, hypotension (to protect cerebral perfusion pressure), high or very low CO2 (keeps it in the ordered normal range), fever, high or low glucose; keeps sedation and pain relief adequate and watches for seizures.",
              "Prevent secondary injury: no hypoxia, no low blood pressure (cerebral perfusion pressure depends on it), CO2 kept in the ordered normal range, temperature normal, glucose normal; adequate sedation and analgesia; watch for and treat seizures per order."
            ),
          ],
        },
        {
          text: "ICP suddenly rises to 35 mm Hg and stays there. The heart rate falls to 58 /min, blood pressure rises to 142/60 mm Hg, and the left pupil is now larger and slow to react.",
          ask: "What is happening and what do you do?",
          parts: [
            part(
              "Recognition",
              "Recognises signs of impending herniation: sustained high ICP, Cushing's triad (bradycardia, hypertension with a widening pulse pressure, irregular breathing) and a new unilateral dilated pupil.",
              "Impending brain herniation: ICP high and sustained, Cushing's signs (slow heart rate, rising blood pressure with a wide pulse pressure) and a new sluggish, dilated left pupil."
            ),
            part(
              "Emergency response",
              "Calls the provider/neurosurgeon at once; anticipates hyperosmolar therapy (hypertonic saline or mannitol) and deeper sedation per order; brief hyperventilation only as a temporary bridge if ordered; prepares for urgent imaging or surgery.",
              "Emergency call to the provider and neurosurgery; prepare hypertonic saline or mannitol and extra sedation as ordered; brief hyperventilation only if ordered, as a bridge to definitive treatment; get ready for urgent CT or theatre."
            ),
          ],
        },
      ],
    },
    {
      slug: "peds-maltreatment-recognition",
      objective: "Recognize and act on abuse, neglect and maltreatment",
      kind: "build",
      title: "An infant's injuries don't fit the story",
      brief:
        "A fictional 4-month-old is admitted to the pediatric ICU with a skull fracture and a subdural hematoma. The caregiver says the infant rolled off a sofa. On assessment you also find bruises of different colours on the upper arms and a torn frenulum. This lab touches on child maltreatment; it's fine to skip it if the topic is hard for you.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write what concerns you and what you do about it.",
          parts: [
            part(
              "Red flags",
              "Names the warning signs: injuries that don't fit the child's development (a 4-month-old is not yet mobile enough for most such falls) or the story, bruising in a non-mobile infant, bruises of different ages, and a torn frenulum.",
              "The injuries don't match the story or the baby's development; a 4-month-old who doesn't cruise shouldn't bruise; bruises of different colours suggest different times; a torn frenulum in an infant is a recognised sign of possible abuse."
            ),
            part(
              "Duty to report",
              "States that nurses are mandated reporters who report a reasonable suspicion (not proof) to child protective services per state law and facility policy, and involves the child protection team/social work and the provider.",
              "Report the suspicion -- proof isn't needed -- to child protective services as state law and policy require, and involve the provider, social work and the child protection team."
            ),
            part(
              "Documentation and conduct",
              "Documents objectively (exact quotes of explanations, measured descriptions of injuries, body map or photographs per policy), keeps the infant safe, and does not accuse or confront the caregiver.",
              "Write down the caregiver's explanation in their own words, describe and measure each injury, use a body map or photographs per policy; keep the infant safe and stay professional and non-accusatory with the family -- investigating is not the nurse's role."
            ),
          ],
        },
      ],
    },
    // Multisystem (2)
    {
      slug: "pediatric-septic-shock-case",
      objective: "Identify sepsis early and late, and manage SIRS, multi-organ dysfunction and shock states (distributive, hypovolemic, obstructive)",
      kind: "case",
      title: "A child whose blood pressure is still normal",
      brief:
        "A fictional 4-year-old (16 kg) is admitted to the pediatric ICU with fever for two days. Heart rate 170 /min, respiratory rate 40 /min, capillary refill 4 seconds, cool hands and feet, lethargic. Blood pressure 94/58 mm Hg.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The parents say \"the blood pressure is fine, so it can't be that bad\".",
          ask: "How unstable is this child and what do you do?",
          parts: [
            part(
              "Recognition",
              "Recognises compensated septic shock: tachycardia, delayed capillary refill, cool extremities and lethargy, and that hypotension is a late sign in children.",
              "This is compensated shock: fast heart rate, slow capillary refill, cool extremities and lethargy. Children keep their blood pressure until late, so a normal reading doesn't mean the child is safe."
            ),
            part(
              "First actions",
              "Escalates immediately; obtains IV or intraosseous access; gives isotonic fluid boluses (commonly 10-20 mL/kg) per orders while reassessing for fluid overload (crackles, hepatomegaly); draws cultures and gives antibiotics promptly.",
              "Call the team now; get IV access (or intraosseous if IV fails); give isotonic boluses of 10-20 mL/kg as ordered, reassessing after each for crackles or an enlarging liver; draw cultures and give antibiotics without delay."
            ),
          ],
        },
        {
          text: "After 40 mL/kg of fluid the child is still tachycardic with poor perfusion, and crackles are now heard at both bases.",
          ask: "What comes next?",
          parts: [
            part(
              "Fluid-refractory shock",
              "Stops further boluses because of fluid overload signs and anticipates a vasoactive infusion per protocol (for example epinephrine or norepinephrine), plus ongoing monitoring.",
              "Shock that hasn't responded to fluid, now with signs of overload: no more boluses; expect a vasoactive infusion per protocol and continuous monitoring of perfusion, blood pressure and urine output."
            ),
          ],
        },
      ],
    },
    {
      slug: "peds-pain-scales-by-age",
      objective: "Assess pain in a developmentally appropriate way and manage acute and chronic pain with medications and non-pharmacologic measures",
      kind: "build",
      title: "Choose the right pain scale for three children",
      brief:
        "Three fictional children are in the pediatric ICU after surgery: a 2-year-old who cries and draws up the legs, a 5-year-old who says \"it hurts\" but can't describe how much, and a 12-year-old who can talk about the pain clearly.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a pain assessment approach for each child and add comfort measures.",
          parts: [
            part(
              "2-year-old",
              "Uses an observational/behavioural tool for a preverbal child, such as FLACC (Face, Legs, Activity, Cry, Consolability), with parent input.",
              "An observational scale such as FLACC -- Face, Legs, Activity, Cry, Consolability -- with the parents' view of how the child usually behaves."
            ),
            part(
              "5-year-old",
              "Uses a self-report faces scale suited to young children (for example Wong-Baker FACES), explained in simple words.",
              "A faces scale such as Wong-Baker FACES, explained simply: point to the face that shows how much it hurts."
            ),
            part(
              "12-year-old",
              "Uses a numeric rating scale (0-10) and asks about location and quality.",
              "A 0-10 numeric scale, plus where it hurts and what it feels like."
            ),
            part(
              "Comfort and reassessment",
              "Adds developmentally suited non-drug measures (parent presence, positioning, distraction, comfort items) alongside ordered analgesia, and reassesses after each intervention using the same scale.",
              "Give ordered analgesia and add non-drug comfort: parents close, comfortable positioning, distraction suited to age (bubbles, a tablet, music), comfort objects; reassess with the same scale after each intervention."
            ),
          ],
        },
      ],
    },
    // Professional Caring & Ethical Practice (2)
    {
      slug: "peds-asthma-discharge-teaching",
      objective: "Facilitation of learning: teach families, nursing staff and team members, formally and informally, adjusting to developmental level, literacy and readiness to learn",
      kind: "build",
      title: "Teach a family before an asthma discharge",
      brief:
        "A fictional 6-year-old is going home after status asthmaticus. The parent works nights, is tired, and mentions reading is hard. The child will use an inhaler with a spacer and has a written asthma action plan.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan the teaching.",
          parts: [
            part(
              "Readiness and literacy",
              "Assesses readiness (chooses a time the parent is rested and present, asks what they already know and worry about) and adapts to literacy (plain spoken language, pictures, short steps, a professional interpreter if needed).",
              "Pick a time when the parent is rested and can focus; ask what they already know and what worries them; use plain spoken words, pictures and one step at a time rather than relying on written leaflets."
            ),
            part(
              "Hands-on method",
              "Demonstrates inhaler-with-spacer technique and has the parent and child show it back, and uses teach-back for the action plan (what each zone means and when to seek emergency help).",
              "Show the inhaler and spacer step by step, then have the parent and the child do it back; use teach-back for the action plan: \"Tell me what you'd do if...\" for the green, yellow and red zones, including when to call emergency services."
            ),
            part(
              "Involving the child",
              "Involves the child at their developmental level (simple words, letting them hold the spacer, praise) and plans follow-up.",
              "Give the 6-year-old a real job -- holding the spacer, counting breaths -- with simple words and praise; arrange follow-up with the primary care team."
            ),
          ],
        },
      ],
    },
    {
      slug: "peds-family-presence-resuscitation",
      objective: "Advocacy and moral agency: act on behalf of critically ill children, their families and colleagues, and help identify and resolve ethical and clinical concerns, within and outside the clinical setting",
      kind: "case",
      title: "Parents at the bedside during a resuscitation",
      brief:
        "A fictional 3-year-old in the pediatric ICU goes into cardiac arrest and the team starts CPR. The parents are just outside the curtain and ask to come in.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "A team member says, \"Get them out of here, they'll be in the way.\" Your unit's policy offers family presence during resuscitation with a staff member supporting them.",
          ask: "What do you do?",
          parts: [
            part(
              "Advocacy",
              "Advocates for offering family presence, consistent with policy and AACN's practice guidance supporting it, with a designated staff member to support the parents and explain what is happening, and the option to step out.",
              "Speak up for the parents: our policy, and AACN's guidance, support offering family presence. Ask the leader to agree, and arrange for one staff member to stay with the parents, explain what they see and help them step out if they want to."
            ),
            part(
              "Keeping it safe",
              "Prepares the parents briefly (what they will see, where to stand) and keeps the team's space clear; the support person can take them out if their presence interferes with care.",
              "Before they come in: a short, honest explanation of what they'll see and where to stand; keep the resuscitation space clear; the support person can guide them out if needed."
            ),
          ],
        },
        {
          text: "The child has a return of spontaneous circulation. Later the colleague who objected seems upset and says, \"I just didn't want them to see that.\"",
          ask: "How do you respond to your colleague?",
          parts: [
            part(
              "Colleague support",
              "Acknowledges the colleague's concern and possible moral distress, offers a debrief (team or one-to-one) and support resources, and treats the disagreement as something to learn from rather than to blame.",
              "Acknowledge that they were trying to protect the family and that resuscitations are hard; suggest the team debrief and point to support resources; talk it through without blame so the team agrees how to handle family presence next time."
            ),
          ],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CCRN (Neonatal) -- the full pilot set (REQ-124, Nick 2026-11-07, decision
// 13): 12 labs, option (d) hybrid unit by unit -- 2 in each of the six units.
// Objectives paraphrase the patient-care problems and Testable Nursing
// Actions of AACN's Neonatal CCRN test plan (exams on and after November 12,
// 2025; CCRN Exam Handbook, PDF p.27-30, as read for the track on
// 2026-10-31). Category weights 10/15/20/13/20 + 20 cross-checked on
// 2026-11-07 against open-exam-prep.com's Neonatal CCRN summary (the AACN
// PDF itself was not reachable from that session).
//   https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en
//   https://www.aacn.org/certification/get-certified/ccrn-neo
//   https://open-exam-prep.com/study-guides/ccrn-neonatal/introduction/exam-facts
// Clinical values are long-standing teaching values (pre- vs post-ductal
// saturation, the 6-hour window and 33.5 degree C target of therapeutic
// hypothermia for HIE, prostaglandin E1's apnea risk, the Eat, Sleep,
// Console approach). Where units differ the rubric asks for "per protocol".
// Every infant and family is fictional; exam practice, not clinical
// guidance. All needs_expert_review until a neonatal critical-care nurse
// educator approves each one.
// ---------------------------------------------------------------------------

const CCRNNEO_SOURCES = [
  source("https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en", "exam_outline", "2026-11-07"),
  source("https://www.aacn.org/certification/get-certified/ccrn-neo", "exam_outline", "2026-11-07"),
];

export const CCRNNEO_LABS: SeedLabSet = {
  trackCode: "CCRNNEO",
  sources: CCRNNEO_SOURCES,
  labs: [
    // Cardiovascular (2)
    {
      slug: "neo-pphn-case",
      objective: "Explain normal fetal circulation and the transition to extrauterine life, and recognize when it fails (PDA, PFO, PPHN)",
      kind: "case",
      title: "A term baby whose feet are bluer than the hands",
      brief:
        "A fictional term newborn born through meconium-stained fluid is admitted to the NICU on a ventilator with 100% oxygen. The right-hand (pre-ductal) SpO2 is 94% and the foot (post-ductal) SpO2 is 78%.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The baby becomes desaturated with every handling and suctioning.",
          ask: "What does the saturation difference tell you, and how do you care for this baby?",
          parts: [
            part(
              "Physiology",
              "Explains that high pulmonary vascular resistance persists after birth (persistent pulmonary hypertension of the newborn), so blood shunts right to left through the ductus arteriosus (and foramen ovale), giving a lower post-ductal than pre-ductal saturation.",
              "Persistent pulmonary hypertension of the newborn: the lungs' blood vessels have stayed constricted as before birth, so blood bypasses the lungs right to left through the ductus (and foramen ovale). Blood to the right hand leaves before the ductus, blood to the feet after it -- hence 94% versus 78%."
            ),
            part(
              "Nursing care",
              "Minimises stimulation (clustered care, quiet, minimal handling, suction only when needed), supports oxygenation and ventilation per orders, avoids acidosis and hypothermia, supports blood pressure, and gives ordered sedation/analgesia.",
              "Minimal handling: cluster care, keep the room quiet and dim, suction only when needed; support oxygenation and ventilation as ordered; keep the baby warm and avoid acidosis; support blood pressure as ordered; give sedation and pain relief as prescribed."
            ),
          ],
        },
        {
          text: "Inhaled nitric oxide is started and the oxygenation improves over the next day.",
          ask: "What do you monitor, and what matters when it is weaned?",
          parts: [
            part(
              "On nitric oxide",
              "Monitors pre- and post-ductal saturations and oxygenation, methemoglobin levels, and the delivery system; weans gradually per protocol and never stops it abruptly because of rebound pulmonary hypertension.",
              "Watch pre- and post-ductal saturations and blood gases, check methemoglobin levels as ordered, and keep the delivery circuit intact (manual bagging must also deliver it). Wean slowly per protocol -- stopping suddenly can cause rebound pulmonary hypertension."
            ),
          ],
        },
      ],
    },
    {
      slug: "neo-ductal-dependent-lesion",
      objective: "Recognize and care for neonates with congenital heart defects and acquired cardiac conditions",
      kind: "build",
      title: "A newborn collapses on day three",
      brief:
        "A fictional 3-day-old who went home well is brought back grey, breathing fast, with weak femoral pulses, cool legs and poor feeding. Right-arm blood pressure is 82/50 mm Hg and leg blood pressure 50/30 mm Hg.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write what you suspect and how you would care for the baby.",
          parts: [
            part(
              "Recognition",
              "Suspects a ductal-dependent systemic heart lesion (for example coarctation of the aorta or hypoplastic left heart) presenting as the ductus arteriosus closes, from shock with weak femoral pulses and an arm-leg pressure difference.",
              "A heart defect that depended on the ductus for blood to the body, such as coarctation of the aorta: as the ductus closed in the first days, the baby went into shock -- weak femoral pulses, cool legs and higher arm than leg pressures."
            ),
            part(
              "Medicine",
              "Anticipates prostaglandin E1 (alprostadil) infusion per order to reopen/keep open the ductus, and knows its key adverse effect, apnea (plus fever, flushing, low blood pressure), so prepares to support breathing.",
              "Expect a prostaglandin E1 (alprostadil) infusion to reopen the ductus; its key side effect is apnea, so have bag-mask and intubation equipment ready, and watch for fever, flushing and low blood pressure."
            ),
            part(
              "Assessment and support",
              "Monitors four-limb blood pressures and pre- and post-ductal saturations, perfusion, urine output and lactate/acid-base; supports the baby (IV access, glucose, temperature) and arranges cardiology review and echocardiography.",
              "Measure blood pressure in all four limbs and pre- and post-ductal saturations; follow perfusion, urine output and blood gases or lactate; secure IV access, check glucose, keep the baby warm, and get cardiology and an echocardiogram."
            ),
          ],
        },
      ],
    },
    // Respiratory (2)
    {
      slug: "neo-preterm-rds-case",
      objective: "Recognize and manage respiratory distress syndrome, transient tachypnea of the newborn and failed respiratory transition (surfactant deficiency, secondary apnea)",
      kind: "case",
      title: "A preterm baby working hard to breathe",
      brief:
        "A fictional baby born at 29 weeks is admitted to the NICU at 20 minutes of age, grunting, with nasal flaring and chest retractions, on CPAP of 6 cm H2O.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Over two hours the oxygen needed to keep saturation in the target range rises from 30% to 50%. The chest X-ray shows a ground-glass pattern with air bronchograms.",
          ask: "What is the likely problem, and what do you anticipate?",
          parts: [
            part(
              "Problem",
              "Identifies respiratory distress syndrome from surfactant deficiency in a preterm infant (grunting, retractions, rising oxygen need, ground-glass X-ray).",
              "Respiratory distress syndrome: a 29-week baby without enough surfactant, so the alveoli collapse -- grunting, retractions, a rising oxygen need and a ground-glass X-ray."
            ),
            part(
              "Next treatment",
              "Anticipates surfactant replacement per unit protocol (given via an endotracheal tube or a thin catheter) because the oxygen need has passed the unit's threshold, and prepares equipment and positioning.",
              "Expect surfactant now that the oxygen need has passed the unit's threshold, given per protocol through a breathing tube or a thin catheter; prepare the equipment, the dose and the team."
            ),
          ],
        },
        {
          text: "Shortly after surfactant the chest is moving much more and SpO2 is 99% on 45% oxygen.",
          ask: "What do you do now, and why?",
          parts: [
            part(
              "After surfactant",
              "Recognises that lung compliance improves quickly after surfactant, so oxygen and pressures need weaning promptly (avoiding hyperoxia and overdistension, which can cause air leaks such as pneumothorax), avoids routine suctioning soon after the dose per protocol, and tells the team.",
              "The lungs have opened up quickly: wean oxygen promptly to bring saturation back into the preterm target range and ask about pressures, to avoid too much oxygen and overinflation (which can cause a pneumothorax). Don't suction soon after the dose unless needed, per protocol, and keep the team informed."
            ),
          ],
        },
      ],
    },
    {
      slug: "neo-pneumothorax-chest-tube",
      objective: "Recognize pleural space abnormalities (pneumothorax, hemothorax, empyema, effusions), and manage chest tubes and thoracentesis",
      kind: "build",
      title: "Sudden collapse on the ventilator",
      brief:
        "A fictional 32-week preterm baby on conventional ventilation suddenly has SpO2 70%, bradycardia, a falling blood pressure, and breath sounds that are much quieter on the right. Transillumination of the right chest glows brightly.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write what you suspect, the immediate response and the chest-tube care afterwards.",
          parts: [
            part(
              "Recognition",
              "Identifies a tension pneumothorax on the right (sudden deterioration on a ventilator, unequal breath sounds, bright transillumination, cardiovascular compromise).",
              "A right-sided (likely tension) pneumothorax: sudden collapse on the ventilator, quiet breath sounds on the right, bright transillumination and a failing circulation."
            ),
            part(
              "Immediate response",
              "Calls for help at once, supports ventilation with oxygen per order, and prepares for emergency needle aspiration followed by chest tube insertion.",
              "Call the provider now, support breathing and oxygenation as ordered, and set up for emergency needle aspiration, followed by a chest tube."
            ),
            part(
              "Chest tube care",
              "Secures the tube and drainage system below chest level, checks for bubbling (air leak), fluctuation and drainage, keeps tubing free of loops and kinks, monitors breathing, saturation and the dressing site, and follows unit policy on stripping/milking (generally not routine).",
              "Secure the tube, keep the drainage system below the chest, check for bubbling (an ongoing air leak), swinging and drainage amount, keep tubing free of kinks and dependent loops, watch breathing, saturations and the dressing, and don't strip the tube unless policy says so."
            ),
          ],
        },
      ],
    },
    // Endocrine, Hematology/Immunology, GI, Renal/GU, Integumentary (2)
    {
      slug: "neo-nec-case",
      objective: "Recognize and manage necrotizing enterocolitis, gastroesophageal reflux and hepatic failure (portal hypertension, biliary atresia, cholestasis), including peritoneal drains",
      kind: "case",
      title: "Feeding trouble in a growing preterm baby",
      brief:
        "A fictional baby born at 30 weeks is 10 days old and on increasing enteral feeds. Today the abdomen is distended, there are green (bilious) gastric aspirates, there is blood in the stool, and the baby has had three apneas.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The provider is on the way.",
          ask: "What do you suspect, and what do you do now?",
          parts: [
            part(
              "Recognition",
              "Suspects necrotizing enterocolitis in a preterm infant on feeds (distension, bilious aspirates, bloody stools, apnea/temperature instability).",
              "Necrotizing enterocolitis: a preterm baby on increasing feeds with a distended abdomen, green aspirates, blood in the stool and apneas."
            ),
            part(
              "Actions",
              "Stops feeds, decompresses the stomach with a gastric tube on low intermittent suction per order, measures abdominal girth, supports breathing and circulation, and anticipates an abdominal X-ray, labs and cultures, IV antibiotics and parenteral nutrition per order.",
              "Stop feeds; place a gastric tube to low intermittent suction as ordered; measure the abdominal girth; support breathing and circulation; expect an abdominal X-ray, blood tests and cultures, IV antibiotics and parenteral nutrition."
            ),
          ],
        },
        {
          text: "A repeat X-ray six hours later shows free air in the abdomen, and the abdomen is now discoloured.",
          ask: "What does this mean and what follows?",
          parts: [
            part(
              "Perforation",
              "Recognises bowel perforation needing urgent surgical review (laparotomy or a peritoneal drain), and keeps up resuscitation, pain relief and family updates.",
              "Free air means the bowel has perforated: urgent surgical review for an operation or a peritoneal drain; keep supporting the circulation, give pain relief as ordered, and keep the family informed."
            ),
          ],
        },
      ],
    },
    {
      slug: "neo-abo-hemolytic-jaundice",
      objective: "Recognize hemolytic disease of the newborn from Rh and ABO incompatibility",
      kind: "build",
      title: "Jaundice at 18 hours",
      brief:
        "A fictional term baby is yellow at 18 hours of age. The mother's blood group is O positive, the baby's is A positive, and the direct antiglobulin (Coombs) test is positive. The bilirubin is rising toward the phototherapy line for the baby's age and risk.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write why this is happening and how you care for the baby.",
          parts: [
            part(
              "Why",
              "Explains ABO hemolytic disease (maternal anti-A antibodies from a group O mother crossing the placenta and breaking down the baby's group A red cells), and that jaundice in the first 24 hours is never treated as normal.",
              "ABO incompatibility: the group O mother's anti-A antibodies have crossed the placenta and are breaking down the baby's group A red cells, releasing bilirubin. Jaundice in the first 24 hours is always looked into, never assumed to be normal."
            ),
            part(
              "Phototherapy care",
              "Gives phototherapy per order with maximum skin exposure (diaper only), eye protection, temperature and hydration monitoring, regular repositioning, and bilirubin measured by blood per protocol (skin colour is unreliable under the lights).",
              "Phototherapy as ordered: as much skin exposed as possible, eyes shielded, temperature and feeding/hydration watched, regular turning, no lotions; follow bilirubin with blood tests per protocol because skin colour can't be trusted under the lights."
            ),
            part(
              "Escalation",
              "Watches for signs of acute bilirubin encephalopathy (lethargy, poor feeding, high-pitched cry, abnormal tone or arching) and a rapid rise, and escalates for intensive phototherapy, IV immunoglobulin or exchange transfusion per order.",
              "Report at once a fast rise or signs of bilirubin affecting the brain -- sleepiness, poor feeding, a high-pitched cry, floppiness or arching -- since the baby may need intensive phototherapy, IV immunoglobulin or an exchange transfusion."
            ),
          ],
        },
      ],
    },
    // Musculoskeletal, Neurological, Behavioral/Psychosocial (2)
    {
      slug: "neo-hie-cooling-case",
      objective: "Recognize ischemic insult (stroke, periventricular leukomalacia, HIE) and manage therapeutic hypothermia",
      kind: "case",
      title: "Cooling a baby after a hard birth",
      brief:
        "A fictional baby born at 39 weeks after a placental abruption needed resuscitation, has an Apgar score of 3 at 10 minutes and a cord pH of 6.9. At 2 hours of age the baby is lethargic, floppy and has a weak suck.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The team is deciding whether to start therapeutic hypothermia.",
          ask: "Does this baby fit, and why does timing matter?",
          parts: [
            part(
              "Fits the criteria",
              "Recognises hypoxic-ischemic encephalopathy in a baby of 36 weeks or more with evidence of a perinatal hypoxic event (low Apgar, need for resuscitation, severe acidosis) and moderate to severe encephalopathy, which are the usual cooling criteria per protocol.",
              "Yes, per the usual protocol: 36 weeks or more, a hypoxic event around birth (Apgar 3 at 10 minutes, resuscitation, cord pH 6.9) and moderate encephalopathy (lethargy, floppiness, weak suck)."
            ),
            part(
              "Timing",
              "States that cooling should start within 6 hours of birth, and that until then overheating is avoided (for example radiant warmer off per protocol) while the baby is monitored.",
              "Cooling works only if it starts within 6 hours of birth, so act quickly; until then avoid overheating -- turn off the radiant warmer per protocol and monitor temperature closely."
            ),
          ],
        },
        {
          text: "Cooling is started with a servo-controlled blanket. Twelve hours in, the heart rate is 88 /min and the baby has rhythmic jerking of the right arm.",
          ask: "What do you monitor during cooling, and what do you make of these findings?",
          parts: [
            part(
              "Monitoring",
              "Keeps continuous core temperature at the protocol target (commonly 33.5 degrees C) for the set duration (usually 72 hours, then slow rewarming); monitors skin, blood pressure, glucose, electrolytes, coagulation and urine output, and pain/stress.",
              "Continuous core temperature at the protocol target -- commonly 33.5 degrees C for 72 hours, then slow rewarming; check skin for fat necrosis and pressure areas; watch blood pressure, glucose, electrolytes, clotting and urine output; assess and treat discomfort."
            ),
            part(
              "Findings",
              "Recognises sinus bradycardia as an expected effect of cooling (report if it falls further or perfusion worsens) and the jerking as a likely seizure needing EEG/aEEG confirmation and treatment per order.",
              "A heart rate around 80-90 is expected while cooled; report it if it drops further or perfusion worsens. The rhythmic jerking is likely a seizure: tell the provider, confirm with EEG or aEEG, and give anticonvulsants as ordered."
            ),
          ],
        },
      ],
    },
    {
      slug: "neo-pain-assessment-comfort",
      objective: "Recognize state dysregulation (stress, pain, agitation) and manage pain and sedation with pharmacologic and non-pharmacologic measures",
      kind: "build",
      title: "Plan comfort for a heel stick",
      brief:
        "A fictional baby born at 31 weeks, now 5 days old, needs a heel-stick blood test. The baby grimaces, frowns, and has falling saturation during handling. The mother is visiting.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write how you assess and manage this baby's pain.",
          parts: [
            part(
              "Assessment",
              "Uses a validated neonatal pain tool suited to gestational age per unit protocol (for example PIPP-R, N-PASS or NIPS), before, during and after the procedure.",
              "Score pain with the unit's validated neonatal tool -- for example PIPP-R or N-PASS, which allow for gestational age -- before, during and after the heel stick."
            ),
            part(
              "Non-drug measures",
              "Uses non-pharmacologic measures: oral sucrose per protocol, non-nutritive sucking, facilitated tucking or swaddling, skin-to-skin or breastfeeding with the mother, and clustering care to limit painful handling.",
              "Offer oral sucrose per protocol with non-nutritive sucking, facilitated tucking or swaddling, and ask the mother if she'd like to hold the baby skin-to-skin (or breastfeed) during the test; cluster care so the baby is handled less often."
            ),
            part(
              "Afterwards",
              "Reassesses after the procedure, lets the baby recover before further handling, and escalates for medication per order if pain scores stay high.",
              "Reassess with the same tool afterwards, give the baby time to settle before anything else, and ask about medication if the scores stay high."
            ),
          ],
        },
      ],
    },
    // Multisystem (2)
    {
      slug: "infant-of-diabetic-mother-hypoglycemia",
      objective: "Recognize and manage hyperbilirubinemia, hydrops fetalis and the infant of a diabetic mother",
      kind: "case",
      title: "The first hours of an infant of a diabetic mother",
      brief:
        "A fictional term newborn weighing 4.5 kg is admitted for observation. The mother has poorly controlled diabetes in pregnancy.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The infant is one hour old, pink and feeding poorly.",
          ask: "What risk are you watching for, and why?",
          parts: [
            part(
              "Risk and mechanism",
              "Identifies neonatal hypoglycemia as the key early risk because fetal hyperinsulinism (from maternal hyperglycemia) continues after the maternal glucose supply stops at birth.",
              "Hypoglycemia: the baby made extra insulin in response to the mother's high glucose, and after birth that insulin keeps working while the glucose supply has stopped."
            ),
            part(
              "Monitoring",
              "Plans early and repeated glucose checks per unit protocol, and early feeding.",
              "Check blood glucose early and repeatedly per the unit's protocol and start feeds early."
            ),
          ],
        },
        {
          text: "At two hours the infant is jittery with a weak cry and a poor suck, and the glucose is below the unit's treatment threshold.",
          ask: "What do you do?",
          parts: [
            part(
              "Treatment",
              "Recognises symptomatic hypoglycemia and escalates for IV dextrose per protocol rather than relying on oral feeding alone, then rechecks glucose.",
              "Symptomatic hypoglycemia: notify the provider and give IV dextrose as ordered by protocol -- a symptomatic baby shouldn't rely on feeding alone -- then recheck the glucose soon after."
            ),
            part(
              "Other checks",
              "Also watches for other complications of an infant of a diabetic mother (for example respiratory distress, polycythemia/hyperbilirubinemia, hypocalcemia).",
              "Watch for the other problems these infants have: breathing difficulty, polycythemia and jaundice, and low calcium."
            ),
          ],
        },
      ],
    },
    {
      slug: "neo-opioid-withdrawal-esc",
      objective: "Care for neonates with toxin or drug exposure, including withdrawal from maternal or iatrogenic substances and fetal alcohol spectrum disorder",
      kind: "build",
      title: "Care for a baby withdrawing from opioids",
      brief:
        "A fictional term baby, 2 days old, was exposed to opioids before birth. The baby has a high-pitched cry, tremors, sneezing and loose stools, takes only small feeds, and sleeps for less than an hour at a time. The mother is in recovery and wants to help care for the baby.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write how you assess and care for this baby and support the mother.",
          parts: [
            part(
              "Assessment",
              "Recognises neonatal opioid withdrawal and assesses it with the unit's approach (for example the Eat, Sleep, Console function-based assessment: can the baby feed well, sleep at least an hour, and be consoled within about 10 minutes), or a scoring tool per protocol.",
              "Neonatal opioid withdrawal. Assess with the unit's approach -- for example Eat, Sleep, Console: is the baby feeding well, sleeping an hour or more, and settling within about 10 minutes with help -- or the unit's scoring tool."
            ),
            part(
              "Non-drug care first",
              "Uses non-pharmacologic care as first line: a quiet, dim, low-stimulation environment, swaddling, holding/skin-to-skin, small frequent feeds, rooming-in, with the parent as the main comforter; medication per protocol if function doesn't improve.",
              "Start with non-drug care: quiet and dim surroundings, swaddling, skin-to-skin and holding, small frequent feeds, keeping the baby with the mother; medication per protocol only if the baby still can't eat, sleep or be consoled."
            ),
            part(
              "Supporting the mother",
              "Communicates without judgment, involves the mother as the baby's primary carer, supports breastfeeding when it is safe per policy, and connects her with support services.",
              "Talk without judgment, treat the mother as the baby's main comforter, support breastfeeding if it's safe under the unit's policy, and link her with social work and recovery support."
            ),
          ],
        },
      ],
    },
    // Professional Caring & Ethical Practice (2)
    {
      slug: "neo-discharge-teaching-interpreter",
      objective: "Facilitation of learning: teach families, nursing staff and team members, formally and informally, adjusting to developmental level, literacy and readiness to learn",
      kind: "build",
      title: "Teach safe sleep through an interpreter",
      brief:
        "A fictional family is taking their former 33-week preterm baby home next week. The parents' first language is not English, and an older sibling offers to translate. The parents also plan to have the baby sleep in their bed.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan the teaching.",
          parts: [
            part(
              "Interpreter",
              "Uses a professional medical interpreter, not a family member (especially not a child), for accuracy and privacy.",
              "Book a professional medical interpreter in person or by video; a family member -- especially a child -- shouldn't interpret health teaching."
            ),
            part(
              "Readiness and method",
              "Times teaching for when the parents are rested and ready, spreads it over several sessions before discharge, demonstrates and has them show back, and uses teach-back to check understanding.",
              "Teach across several sessions before discharge when both parents are rested; demonstrate, then have them show you, and use teach-back in their own words to confirm understanding."
            ),
            part(
              "Safe sleep content",
              "Teaches safe sleep respectfully (baby Alone, on their Back, in a Crib or bassinet with a firm flat surface, room-sharing without bed-sharing, no soft bedding, smoke-free) and explores the family's reasons and cultural practices to find a safe plan with them.",
              "Explain the ABCs of safe sleep -- Alone, on the Back, in a Crib or bassinet on a firm, flat surface -- room-sharing without bed-sharing, no pillows or soft bedding, smoke-free; ask why they want the baby close and agree a safe way, such as a bassinet next to their bed."
            ),
          ],
        },
      ],
    },
    {
      slug: "neo-kangaroo-care-ventilated",
      objective: "Caring practices: create a compassionate, therapeutic environment through vigilance, engagement and responsiveness, promoting comfort and preventing unnecessary suffering for critically ill neonates and their families",
      kind: "case",
      title: "A parent asks to hold a baby on a ventilator",
      brief:
        "A fictional baby born at 27 weeks, now 2 weeks old and stable on conventional ventilation, has not yet been held. The father asks, \"Can I hold her today?\" A colleague says ventilated babies can't be held.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Your unit's policy allows skin-to-skin care for stable ventilated infants with a planned transfer.",
          ask: "How do you respond?",
          parts: [
            part(
              "Respond to the parent",
              "Takes the request seriously, explains the benefits of skin-to-skin (stability, temperature, bonding) and checks the baby against the unit's stability criteria with the team.",
              "Thank him for asking -- skin-to-skin helps babies' breathing, heart rate, temperature and bonding. Check her against the unit's criteria for stable ventilated babies and agree it with the team and respiratory therapist."
            ),
            part(
              "Safe transfer plan",
              "Plans a safe transfer: two staff (one dedicated to the airway), tube secured, monitoring throughout, the parent seated and prepared, and a time when the baby is settled.",
              "Plan the move: two staff with one holding the tube and circuit, tube taped securely, monitors on, the father seated comfortably and told what to expect, at a time when she is settled between cares."
            ),
          ],
        },
        {
          text: "Twenty minutes into skin-to-skin, saturation dips briefly to 84% and then recovers as the baby settles. The father looks frightened.",
          ask: "What do you do?",
          parts: [
            part(
              "Respond and reassure",
              "Assesses calmly (tube position, chest movement, positioning) before deciding to return the baby, intervenes if the dip persists, and explains to the father what is happening, recognising the experience as positive for him and the baby when stable.",
              "Check tube position, chest rise and her position on his chest calmly; if she recovers and stays stable, stay close and let the cuddle continue, returning her if the dip persists. Tell him what you're checking and that he's doing it right -- this time matters for both of them."
            ),
          ],
        },
      ],
    },
  ],
};
