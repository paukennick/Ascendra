import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-123 pilot: AACN CCRN (Adult), plus one case each for CCRN (Pediatric)
// and CCRN (Neonatal) to show the pattern carries over.
//
// Aligned to the AACN CCRN Adult test plan: Clinical Judgment 80%
// (Cardiovascular 13%, Respiratory 12%, Endocrine/Hematology/
// Gastrointestinal/Renal-Genitourinary/Integumentary 21%, Musculoskeletal/
// Neurological/Behavioral-Psychosocial 18%, Multisystem 16%) and
// Professional Caring and Ethical Practice 20% (the AACN Synergy Model).
//   https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en
//   https://www.aacn.org/-/media/aacn-website/education/online-courses/adult-ccrn-certification-review/adult-ccrn-review-course-syllabus.pdf
// Density ("hybrid"): 2 per domain = 12 for Adult. Pediatric and Neonatal
// get ONE case each here, below their planned density (12 each): a
// demonstration that the case format fits them, not their full pilot.
//
// SAFETY: every patient is fictional; exam practice, not clinical guidance.
// Thresholds quoted are long-standing guideline values (for example the
// potassium check before an insulin infusion in DKA, the blood-pressure
// limit before IV thrombolysis, MAP 65 in septic shock); local protocols
// differ, and every lab is needs_expert_review until a critical-care nurse
// educator approves it (docs/labs.md).

const CCRN_SOURCES = [
  "https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en",
  "https://www.aacn.org/-/media/aacn-website/education/online-courses/adult-ccrn-certification-review/adult-ccrn-review-course-syllabus.pdf",
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

export const CCRNPEDS_LABS: SeedLabSet = {
  trackCode: "CCRNPEDS",
  sources: CCRN_SOURCES.slice(0, 1),
  labs: [
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
  ],
};

export const CCRNNEO_LABS: SeedLabSet = {
  trackCode: "CCRNNEO",
  sources: CCRN_SOURCES.slice(0, 1),
  labs: [
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
  ],
};
