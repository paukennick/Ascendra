import { CLINICAL_SAFETY, part, orderPart, matchPart, selectPart, numericPart, type SeedLabSet } from "./types";
import { source } from "../sources";
import { CEN_OUTLINE_URL, CEN_SIM_OBJECTIVES } from "../tracks/cen";

// REQ-276: Prep for the Certified Emergency Nurse (CEN) Exam, authored labs.
//
// Aligned to BCEN's CEN Examination Content Outline effective July 2026
// (read 2026-11-14), as seeded in seed/tracks/cen.ts. Density ("hybrid"):
// 2/2/2/2/1/2/2/1/1/1/1 = 17, one lab per objective. Every patient is
// fictional; exam practice, not clinical guidance. Value sources per lab are
// in nursing-specialty-sources.ts (REQ-142).

export const CEN_LABS: SeedLabSet = {
  trackCode: "CEN",
  sources: [source(CEN_OUTLINE_URL, "exam_outline", "2026-11-14")],
  labs: [
    // ------------------------------------------------- Cardiovascular (18 items) -- 2
    {
      slug: "cen-chest-pain-stemi",
      objective: "Recognize acute coronary syndrome at triage and get a 12-lead ECG read without delay",
      kind: "case",
      title: "Indigestion that is not indigestion",
      brief:
        "A fictional 62-year-old woman with diabetes walks into triage at 03:10 with an hour of \"heartburn\", nausea and fatigue. She is pale and sweaty. BP 148/90 mm Hg, HR 96 /min, SpO2 97%.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The waiting room is full and the triage nurse beside you suggests antacid and a seat.",
          ask: "What do you do first, and why is this presentation easy to miss?",
          parts: [
            part(
              "First action",
              "Treats it as possible ACS: brings her straight to a monitored bed, obtains a 12-lead ECG immediately and has it read by the emergency physician at once, rather than giving antacid and waiting.",
              "Possible ACS: straight back to a monitored bed, a 12-lead ECG now, shown to the emergency physician immediately. Antacid and a chair risk missing an infarction."
            ),
            part(
              "Why it is missed",
              "Explains that women, older adults and people with diabetes often present with atypical symptoms (epigastric discomfort, nausea, fatigue, dyspnea) rather than classic chest pain.",
              "Women, older adults and people with diabetes often have 'atypical' ACS: epigastric burning, nausea, fatigue or breathlessness instead of crushing chest pain."
            ),
          ],
        },
        {
          text: "The ECG shows ST elevation in II, III and aVF. BP is now 98/60 mm Hg. She took sildenafil yesterday.",
          ask: "What do you anticipate, and what do you avoid?",
          parts: [
            part(
              "Anticipate",
              "Activates the STEMI pathway for emergency reperfusion, gives aspirin as ordered, places IV access and continuous monitoring with defibrillator pads, and obtains a right-sided ECG for inferior MI.",
              "Inferior STEMI: activate the cath lab or STEMI team, chewable aspirin as ordered, IV access, monitoring with pads on, and a right-sided ECG (V4R) to look for right ventricular involvement."
            ),
            part(
              "Avoid",
              "Avoids nitroglycerin because of the recent PDE-5 inhibitor, the low blood pressure and possible right ventricular infarction (preload dependent).",
              "No nitroglycerin: sildenafil in the last day, a BP under 100 and possible RV infarction all make a nitrate dangerous. Hypotension in RV infarction is treated with fluid as ordered."
            ),
          ],
        },
      ],
    },
    {
      slug: "cen-shock-cardiogenic-obstructive",
      objective: "Tell cardiogenic from obstructive shock and anticipate the treatment each needs",
      kind: "build",
      title: "Sort four shocked patients",
      brief:
        "Four fictional patients arrive in shock within an hour. Patient A: crushing chest pain, crackles to the apices, cool skin. Patient B: stabbed in the left chest, distended neck veins, muffled heart sounds. Patient C: ventilated after a motor vehicle crash, sudden hypotension, absent breath sounds on the right, trachea deviated left. Patient D: postpartum day 5, sudden dyspnea and syncope, clear lungs, distended neck veins.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each patient to the cause and the definitive treatment, and explain one.",
          parts: [
            matchPart(
              "Patient to treatment",
              "A cardiogenic shock, emergency reperfusion with inotrope or vasopressor support; B tamponade, pericardiocentesis or thoracotomy; C tension pneumothorax, needle or finger decompression; D massive pulmonary embolism, thrombolysis or embolectomy.",
              "A is pump failure from an infarction. B, C and D are obstructive: the heart cannot fill (tamponade, tension) or the right ventricle cannot empty (massive PE). Each obstruction has to be relieved, not just given fluid.",
              {
                left: ["Patient A", "Patient B", "Patient C", "Patient D"],
                right: [
                  "Reperfusion with inotrope or vasopressor support",
                  "Pericardial decompression",
                  "Pleural decompression",
                  "Thrombolysis or embolectomy",
                  "Large-volume crystalloid alone",
                ],
                pairs: [0, 1, 2, 3],
                leftHeading: "Patient",
                rightHeading: "Definitive treatment",
              }
            ),
            part(
              "Explain one",
              "Explains for one patient how the findings point to the mechanism (for example, distended neck veins with clear lungs point to right-sided obstruction rather than left ventricular failure).",
              "Patient D: distended neck veins mean the right heart is backed up; clear lungs mean the left heart is not the problem. Sudden dyspnea and syncope after delivery point to a massive PE obstructing right ventricular outflow."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------- Respiratory (17 items) -- 2
    {
      slug: "cen-tension-pneumothorax",
      objective: "Recognize tension pneumothorax as a clinical diagnosis treated before imaging",
      kind: "case",
      title: "A motorcyclist who gets worse on the ventilator",
      brief: "A fictional 27-year-old motorcyclist with right rib fractures is intubated in the trauma bay. Initial BP 118/72 mm Hg.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Ten minutes later: BP 74/40 mm Hg, HR 138 /min, SpO2 82%, peak airway pressures alarming high, absent breath sounds on the right, neck veins distended.",
          ask: "What is happening and what is done before the chest x-ray?",
          parts: [
            part(
              "Recognition",
              "Names tension pneumothorax, made worse by positive-pressure ventilation, as a clinical diagnosis.",
              "Tension pneumothorax: hypotension, hypoxia, high airway pressures, absent breath sounds on one side and distended neck veins after chest trauma and intubation."
            ),
            part(
              "Action",
              "Calls for immediate decompression (needle or finger thoracostomy) by the provider without waiting for imaging, prepares a chest tube, and supports ventilation with 100% oxygen.",
              "Decompress now -- needle or finger thoracostomy -- then a chest tube. Do not send for an x-ray first. Ventilate with 100% oxygen and have the chest tube set ready."
            ),
          ],
        },
        {
          text: "After decompression and a chest tube, 1,600 mL of blood drains at once.",
          ask: "What does this mean?",
          parts: [
            part(
              "Hemothorax",
              "Recognizes a massive hemothorax that usually needs surgery, and anticipates massive transfusion and the operating room.",
              "A large immediate output of blood means massive hemothorax; expect massive transfusion and a call for thoracotomy. Monitor ongoing chest tube output hourly."
            ),
          ],
        },
      ],
    },
    {
      slug: "cen-croup-severity",
      objective: "Assess croup severity in a child and anticipate steroids and nebulized epinephrine for stridor at rest",
      kind: "case",
      title: "A barking cough at midnight",
      brief: "A fictional 2-year-old is brought in at midnight with a barking cough and a hoarse cry after two days of a runny nose. He is clinging to his mother.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At rest you hear stridor. He has suprasternal and intercostal retractions, SpO2 95% on room air, and is alert.",
          ask: "How severe is this and what do you anticipate? How do you examine him?",
          parts: [
            part(
              "Severity and treatment",
              "Classifies it as moderate croup (stridor at rest with retractions, alert) and anticipates oral or IM dexamethasone plus nebulized epinephrine, with observation afterward for rebound.",
              "Stridor at rest with retractions in an alert child is moderate croup: a corticosteroid (dexamethasone) and nebulized epinephrine, then observe for a few hours because epinephrine wears off."
            ),
            part(
              "Approach",
              "Keeps him calm on the parent's lap, avoids agitating procedures (throat examination, unnecessary blood draws), and watches for fatigue, falling consciousness or rising work of breathing.",
              "Keep him on mom's lap, minimize distress, no tongue depressor; agitation worsens obstruction. Watch for tiring, drowsiness or quiet chest -- signs of impending failure."
            ),
          ],
        },
        {
          text: "Three hours after nebulized epinephrine the stridor at rest has returned.",
          ask: "What now?",
          parts: [
            part(
              "Rebound",
              "Recognizes recurrence after epinephrine, anticipates a repeat dose and admission rather than discharge.",
              "Stridor at rest returning after epinephrine means he cannot go home: repeat nebulized epinephrine as ordered and plan admission."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------- Neurological (17 items) -- 2
    {
      slug: "cen-stroke-pathway",
      objective: "Run an acute stroke pathway: last known well, glucose, NIHSS, imaging and thrombolysis eligibility",
      kind: "case",
      title: "Woke up unable to speak",
      brief:
        "A fictional 70-year-old man is brought in at 07:15. His wife found him awake at 06:45 unable to speak and with a weak right arm. He went to bed normal at 23:00 and got up to use the bathroom, speaking normally, at 03:30.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "BP 192/108 mm Hg, glucose 132 mg/dL. NIHSS 14.",
          ask: "What is his last known well time, and what does that mean for treatment?",
          parts: [
            part(
              "Last known well",
              "States 03:30 (when last seen normal), not 23:00 or 06:45, so onset is about 3 h 45 min before arrival.",
              "Last known well is 03:30, the last time he was seen at baseline. At 07:15 that is 3 hours 45 minutes."
            ),
            part(
              "Implication",
              "Explains that he is close to the end of the standard 4.5-hour IV thrombolysis window, so imaging and decisions must be immediate, and that a severe deficit suggests large-vessel occlusion needing a thrombectomy assessment.",
              "Within 4.5 hours, but barely: CT and the thrombolysis decision now. An NIHSS of 14 raises concern for a large-vessel occlusion, so vessel imaging and thrombectomy assessment go alongside."
            ),
          ],
        },
        {
          text: "The team decides on IV thrombolysis.",
          ask: "What do you need to do about his blood pressure?",
          parts: [
            part(
              "Blood pressure",
              "Lowers BP below 185/110 mm Hg before the drug with a titratable IV agent as ordered, then keeps it below 180/105 for at least 24 hours, with frequent neurological checks.",
              "His 192/108 must be below 185/110 before thrombolysis: give the ordered IV agent and recheck. After the drug keep below 180/105 for 24 hours, checking neuro status and BP frequently."
            ),
          ],
        },
      ],
    },
    {
      slug: "cen-neurogenic-vs-hypovolemic",
      objective: "Recognize neurogenic shock -- hypotension with bradycardia after spinal cord injury",
      kind: "build",
      title: "Two hypotensive trauma patients",
      brief:
        "Two fictional patients from the same rollover crash. Patient 1: BP 78/44 mm Hg, HR 52 /min, warm pink legs, no movement or sensation below the nipples. Patient 2: BP 80/50 mm Hg, HR 134 /min, cool clammy skin, tender distended abdomen.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain each shock state and its first treatment, and the trap in patient 1.",
          parts: [
            part(
              "Patient 1",
              "Identifies neurogenic shock from a high thoracic or cervical cord injury (loss of sympathetic tone: hypotension, bradycardia, warm skin), treated with fluid then vasopressors and atropine for bradycardia, with spinal motion restriction.",
              "Neurogenic shock: the cord injury removed sympathetic tone, so vessels dilate and the heart slows -- low BP, slow pulse, warm skin. Fluids, then vasopressors; atropine for symptomatic bradycardia; keep the spine aligned."
            ),
            part(
              "Patient 2",
              "Identifies hemorrhagic (hypovolemic) shock from an abdominal bleed, treated with blood products and surgical control.",
              "Hemorrhagic shock: tachycardia, cool clammy skin and a distended abdomen. Blood products (massive transfusion as needed) and surgery."
            ),
            part(
              "The trap",
              "Explains that a spinal cord injury does not exclude bleeding, and that the lack of tachycardia can mask hemorrhage, so patient 1 still needs a search for blood loss.",
              "Never assume hypotension in a cord-injured patient is neurogenic: bleeding has to be ruled out, and the cord injury hides the tachycardia that would normally warn you."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------- Gastrointestinal (14 items) -- 2
    {
      slug: "cen-variceal-bleed",
      objective: "Recognize variceal bleeding in cirrhosis and anticipate vasoactive drugs, antibiotics and endoscopy",
      kind: "case",
      title: "Vomiting blood with a swollen abdomen",
      brief:
        "A fictional 54-year-old man with alcohol-related cirrhosis arrives vomiting bright red blood. He has ascites and jaundice. BP 86/52 mm Hg, HR 124 /min, drowsy.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He vomits again in the triage room.",
          ask: "Put the first actions in order.",
          parts: [
            orderPart(
              "First actions",
              "Order: protect the airway (position, suction, call for airway management); two large-bore IVs; blood products; vasoactive drug and antibiotics as ordered; endoscopy.",
              "Airway first in a drowsy man vomiting blood; then access and blood; then the drugs that lower portal pressure and prevent infection; then endoscopy for band ligation.",
              [
                "Position and suction, and call for airway protection",
                "Place two large-bore IVs",
                "Start blood products as ordered",
                "Give the ordered vasoactive drug and antibiotic",
                "Prepare for urgent endoscopy",
              ]
            ),
            part(
              "Why antibiotics",
              "Explains that antibiotics in cirrhosis with GI bleeding reduce infection, rebleeding and death.",
              "People with cirrhosis who bleed are prone to bacterial infection (including spontaneous bacterial peritonitis), which raises rebleeding and death; prophylactic antibiotics are standard."
            ),
          ],
        },
        {
          text: "After two units of red cells he is more confused and asterixis is present.",
          ask: "What may be contributing and what do you anticipate?",
          parts: [
            part(
              "Encephalopathy",
              "Recognizes hepatic encephalopathy, precipitated by the protein load of blood in the gut, and anticipates lactulose and airway vigilance.",
              "Blood in the gut is a protein load that can precipitate hepatic encephalopathy. Expect lactulose once the airway is safe, and reassess his ability to protect his airway."
            ),
          ],
        },
      ],
    },
    {
      slug: "cen-intussusception",
      objective: "Recognize intussusception in a young child with episodic pain and lethargy",
      kind: "case",
      title: "An infant who screams then sleeps",
      brief:
        "A fictional 9-month-old is brought in for episodes of inconsolable crying with legs drawn up, every 15-20 minutes, and vomiting. Between episodes she is unusually sleepy.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "In the department she passes a stool with blood and mucus.",
          ask: "What do you suspect and what do you anticipate?",
          parts: [
            part(
              "Suspicion",
              "Suspects intussusception from intermittent colicky pain, vomiting, lethargy between episodes and bloody mucus stool, noting the stool is a late sign.",
              "Intussusception: episodic colicky pain with drawn-up legs, vomiting and lethargy between episodes in an infant; bloody mucus ('currant jelly') stool is a late sign of bowel compromise."
            ),
            part(
              "Anticipate",
              "Anticipates ultrasound, IV access and fluids, NPO, and an air or contrast enema reduction with surgical backup.",
              "Abdominal ultrasound, IV access and fluid, nothing by mouth, and an enema reduction with the surgeon informed in case it fails or the bowel has perforated."
            ),
          ],
        },
        {
          text: "After the enema her abdomen becomes rigid and distended and she is grunting.",
          ask: "What do you do?",
          parts: [
            part(
              "Perforation",
              "Recognizes possible perforation, calls for immediate surgical evaluation, supports breathing and circulation, and prepares for surgery.",
              "A rigid distended abdomen after reduction suggests perforation: call the surgeon now, support airway and circulation, keep NPO and prepare for theatre."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------- GU / Gyn / OB (10 items) -- 1
    {
      slug: "cen-ectopic-and-neonate",
      objective: "Recognize ruptured ectopic pregnancy in any patient of childbearing age with pain, bleeding or shock",
      kind: "case",
      title: "Fainting at work with pelvic pain",
      brief:
        "A fictional 28-year-old woman fainted at work. She has left lower abdominal pain and right shoulder pain. Her last period was about seven weeks ago and she was not trying to conceive.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "BP 84/50 mm Hg, HR 128 /min, pale. Abdomen tender with guarding.",
          ask: "What do you suspect and what do you do?",
          parts: [
            part(
              "Suspicion",
              "Suspects ruptured ectopic pregnancy with intra-abdominal bleeding (shoulder-tip pain from diaphragmatic irritation) and hemorrhagic shock.",
              "Ruptured ectopic pregnancy: missed period, unilateral pelvic pain, shoulder-tip pain from blood under the diaphragm, and shock."
            ),
            part(
              "Actions",
              "Two large-bore IVs, type and crossmatch, a pregnancy test, blood products, bedside ultrasound, and immediate gynecology for surgery; Rh status checked.",
              "Two large-bore IVs, type and cross, urine or serum hCG, blood as ordered, FAST or pelvic ultrasound, and gynecology now for the operating room. Check Rh status for anti-D."
            ),
          ],
        },
        {
          text: "Later that shift, a woman delivers precipitously in triage. The baby is limp and not breathing after drying and stimulation; heart rate 80 /min.",
          ask: "What is the next step, and which ventilation rates are acceptable?",
          parts: [
            selectPart(
              "Acceptable ventilation rates",
              "Selects 40 and 60 breaths per minute (inside the 30-60 range) and leaves out 20 and 100.",
              "Positive-pressure ventilation runs at 30-60 inflations per minute (AHA/AAP 2025): 40 and 60 are inside the range; 20 is too slow and 100 too fast.",
              { lines: ["20 per minute", "40 per minute", "60 per minute", "100 per minute"], correct: [1, 2], display: "list" }
            ),
            part(
              "Next step",
              "Starts positive-pressure ventilation with a bag and mask (room air for a term baby), checks chest rise and heart rate, and starts compressions only if the heart rate stays below 60 after 30 seconds of effective ventilation.",
              "Bag-mask ventilation now, starting with room air for a term baby, watching for chest rise and a rising heart rate. Compressions (3:1) only if the heart rate stays below 60 after 30 seconds of effective ventilation."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------- Mental Health (13 items) -- 2
    {
      slug: "cen-suicide-risk-safety",
      objective: "Screen for suicide and homicide risk, and keep a patient at risk safe in the department",
      kind: "case",
      title: "A patient who \"just wants to sleep forever\"",
      brief:
        "A fictional 34-year-old man presents with a wrist laceration he says was an accident. At triage he tells you he \"just wants to sleep forever.\" He arrived alone.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He agrees to answer questions.",
          ask: "What do you ask and how do you keep him safe while he waits?",
          parts: [
            part(
              "Screening",
              "Asks directly about suicidal thoughts, a plan, intent, access to means, past attempts and protective factors, using a validated screening tool where the department uses one; also asks about thoughts of harming others.",
              "Ask plainly: \"Are you thinking of killing yourself? Do you have a plan? Have you done anything to prepare? Do you have access to guns or pills? Have you tried before?\" and about thoughts of harming anyone else. Asking does not plant the idea."
            ),
            part(
              "Safety",
              "Places him in a safe room or under constant observation, removes belongings that could be used for harm, does not leave him alone, and informs the provider; treats the laceration.",
              "Room him in a ligature-resistant or safe room with constant observation, search and remove belongings and sharps per policy, keep him in sight, tell the provider, and treat the wound."
            ),
          ],
        },
        {
          text: "He becomes angry and says he wants to leave.",
          ask: "How do you respond?",
          parts: [
            part(
              "Response",
              "Uses calm de-escalation, listens, explains why staying matters, and involves the provider about capacity and a hold under state law; does not physically stop him without the authority and staffing to do so safely.",
              "Stay calm, acknowledge his anger, and explain you are worried about his safety. Get the provider at once to assess capacity and whether a legal hold applies in your state; involve security for safety, never alone."
            ),
          ],
        },
      ],
    },
    {
      slug: "cen-psychosis-medical-mimic",
      objective: "Acute psychosis and the medical conditions that mimic it",
      kind: "build",
      title: "Which of these needs a medical workup first?",
      brief:
        "A fictional 67-year-old woman with no psychiatric history is brought by her son for seeing insects on the walls since last night and being frightened. Her vital signs and history are listed below.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the findings that point to a medical cause and say what you would check.",
          parts: [
            selectPart(
              "Findings pointing to a medical cause",
              "Selects new onset after age 60 with no history, fever, fluctuating attention, visual hallucinations, and the new medication; leaves out her worry about her son's job.",
              "New psychosis in an older adult without a history, fluctuating attention, visual (rather than auditory) hallucinations, a fever and a new drug all point to delirium from a medical cause.",
              {
                lines: [
                  "First episode at age 67, no psychiatric history",
                  "Temperature 38.4 C",
                  "Attention comes and goes during the interview",
                  "Sees insects (visual hallucinations)",
                  "Started an anticholinergic bladder drug last week",
                  "Worried about her son's new job",
                ],
                correct: [0, 1, 2, 3, 4],
                display: "list",
              }
            ),
            part(
              "Workup",
              "Names glucose, oxygen saturation, infection screen (urine, chest), electrolytes and sodium, medication review, and neurological assessment, before attributing it to a psychiatric illness.",
              "Glucose, SpO2, urine and chest for infection, electrolytes including sodium and calcium, a medication review (stop the anticholinergic if possible), and a neurological exam; treat it as delirium until proved otherwise."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------- Medical (15 items) -- 2
    {
      slug: "cen-anaphylaxis-epinephrine",
      objective: "Treat anaphylaxis with intramuscular epinephrine first, then airway, fluids and adjuncts",
      kind: "case",
      title: "Hives and wheeze after a bee sting",
      brief: "A fictional 40-year-old man weighing 82 kg arrives 15 minutes after a bee sting with hives, wheeze, a hoarse voice and lightheadedness.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "BP 86/50 mm Hg, HR 124 /min, SpO2 91%.",
          ask: "What is the first drug, the dose, route and site?",
          parts: [
            numericPart(
              "Epinephrine dose (mg)",
              "0.5 mg (0.01 mg/kg is 0.82 mg, capped at the adult maximum of 0.5 mg).",
              "0.01 mg/kg x 82 kg = 0.82 mg, above the 0.5 mg adult maximum, so 0.5 mg of 1 mg/mL.",
              { answer: 0.5, tolerance: 0.01, unit: "mg" }
            ),
            part(
              "Route and the rest",
              "Intramuscular into the mid-outer thigh, without delay for antihistamines; then lie him flat with legs raised (or sitting if breathing is worse lying), high-flow oxygen, IV fluid for hypotension, and repeat epinephrine if not improving; antihistamines and steroids are adjuncts only.",
              "IM into the mid-outer thigh now. Then position (supine with legs raised unless it worsens breathing), oxygen, IV crystalloid for hypotension, and repeat epinephrine if he does not improve. Antihistamines treat hives, not shock or airway swelling."
            ),
          ],
        },
        {
          text: "After two doses he improves and asks to go home.",
          ask: "What do you tell him?",
          parts: [
            part(
              "Observation and discharge",
              "Explains observation for a biphasic reaction (longer after severe reactions or repeat doses), and at discharge an epinephrine auto-injector prescription with teaching, an action plan and allergy referral.",
              "He needs a period of observation because symptoms can return, especially after a severe reaction needing two doses. At discharge: auto-injectors with hands-on teaching, an action plan, and referral to an allergist."
            ),
          ],
        },
      ],
    },
    {
      slug: "cen-sepsis-triage",
      objective: CEN_SIM_OBJECTIVES.sepsis,
      kind: "case",
      title: "Confusion and fever from a nursing home",
      brief: "A fictional 82-year-old woman (60 kg) is sent from her nursing home for confusion. Her daughter says she was chatting yesterday.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Temp 38.6 C, HR 112 /min, RR 24 /min, BP 92/54 mm Hg, SpO2 94%. Cloudy urine in her catheter bag.",
          ask: "What triage level and what first-hour actions?",
          parts: [
            part(
              "Triage",
              "Assigns ESI level 2 (high-risk situation and new confusion; danger-zone vital signs) and brings her straight back.",
              "ESI 2: new confusion and a high-risk picture with abnormal vital signs (HR above 100, RR above 20). Straight to a bed."
            ),
            part(
              "First hour",
              "Cultures (blood, and urine from a new catheter) without delaying antimicrobials, antimicrobials ideally within 1 hour, lactate, crystalloid for hypotension or high lactate (up to about 30 mL/kg, 1,800 mL, reassessing), and escalation if MAP stays below 65.",
              "Blood cultures and a urine sample from a freshly replaced catheter, antimicrobials within the hour, lactate, crystalloid bolus with reassessment after each portion (30 mL/kg is 1,800 mL for 60 kg), and vasopressors if MAP stays under 65."
            ),
          ],
        },
        {
          text: "After 1 L her lungs crackle and SpO2 is 89%; MAP is 60.",
          ask: "What changes?",
          parts: [
            part(
              "Change",
              "Stops further boluses, raises oxygen, and anticipates norepinephrine and admission to intensive care.",
              "She is not tolerating more fluid: stop the bolus, give oxygen, and prepare for norepinephrine (peripheral initially if needed per policy) and ICU admission."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------- Musculoskeletal and Wound (11 items) -- 1
    {
      slug: "cen-injection-injury",
      objective: "Recognize high-pressure injection injuries as surgical emergencies despite a small wound",
      kind: "case",
      title: "A pinhole wound from a paint gun",
      brief: "A fictional 38-year-old painter caught his index finger with an airless paint sprayer two hours ago. There is a tiny puncture wound. He wants a bandage and to get back to work.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "His finger is now swollen and pale, and pain is increasing.",
          ask: "How urgent is this and why?",
          parts: [
            part(
              "Urgency",
              "Recognizes a high-pressure injection injury as a surgical emergency: the small entry hides material spread along tissue planes, causing ischemia, chemical injury and infection, with a high amputation risk if surgery is delayed.",
              "This is an emergency, not a minor wound. Paint forced under high pressure spreads along the tendon sheaths; swelling and pallor mean vascular compromise. Delay raises the risk of losing the finger."
            ),
            part(
              "Actions",
              "Calls hand surgery immediately, elevates and splints, gives analgesia (avoiding a digital block that adds pressure), tetanus status and antibiotics as ordered, imaging, and keeps him NPO.",
              "Hand surgeon now; splint and elevate; IV analgesia as ordered (no digital block); update tetanus; antibiotics as ordered; x-ray; NPO for theatre."
            ),
          ],
        },
        {
          text: "He says he can't afford time off and will come back if it gets worse.",
          ask: "How do you respond?",
          parts: [
            part(
              "Informed refusal",
              "Explains the specific risk (loss of the finger or hand function) plainly, explores his concern, involves the provider for an informed-refusal discussion if he still declines, and documents it.",
              "Explain plainly that waiting could cost him the finger, and ask what worries him most about staying. If he still wants to leave, the provider has the informed-refusal conversation, and it is documented."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------- HEENT (10 items) -- 1
    {
      slug: "cen-chemical-eye-burn",
      objective: "Irrigate a chemical eye burn immediately and continuously before any other assessment",
      kind: "case",
      title: "Drain cleaner in the eye",
      brief: "A fictional 45-year-old man splashed drain cleaner (an alkali) into his right eye five minutes before arriving. He is holding the eye shut in pain.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The triage nurse starts to check his visual acuity.",
          ask: "What should happen first and why?",
          parts: [
            part(
              "First",
              "Starts copious irrigation immediately, before visual acuity or full assessment, with a topical anesthetic and lid retraction as ordered, because alkali penetrates and keeps damaging tissue.",
              "Irrigate now, before checking acuity. Alkalis penetrate the eye and damage continues until they are washed out. Topical anesthetic and lid retraction (or an irrigating lens) as ordered."
            ),
            part(
              "Endpoint",
              "Continues until the pH returns to neutral on testing after a wait, sweeps the fornices, and then checks acuity and arranges ophthalmology.",
              "Keep irrigating until the tear-film pH is near neutral when rechecked after a short pause, sweep under the lids for particles, then check acuity and call ophthalmology."
            ),
          ],
        },
        {
          text: "His coworker asks whether acids or alkalis are worse for the eye.",
          ask: "Answer him in plain words.",
          parts: [
            part(
              "Teaching",
              "Explains that alkalis are generally worse because they penetrate deeper, while acids tend to coagulate the surface and limit their own spread.",
              "\"Drain cleaner is an alkali; those soak deeper into the eye and keep burning, so they're usually worse. Acids tend to make a crust on the surface that slows them down.\""
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------- Environment, Toxicology, Communicable (13 items) -- 1
    {
      slug: "cen-carbon-monoxide-cyanide",
      objective: "Recognize carbon monoxide poisoning despite a normal pulse oximeter reading, and give high-flow oxygen",
      kind: "case",
      title: "A family with headaches on a cold morning",
      brief: "A fictional family of four arrives in January with headache, nausea and dizziness. They have been running a generator in the garage since a power cut. The father is confused.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The father's SpO2 reads 99% on room air.",
          ask: "Is the 99% reassuring? What do you do?",
          parts: [
            part(
              "Pulse oximetry",
              "Explains that standard pulse oximetry cannot tell carboxyhemoglobin from oxyhemoglobin, so a normal reading does not exclude CO poisoning; a co-oximetry level is needed.",
              "No. A standard pulse oximeter reads carboxyhemoglobin as oxygenated hemoglobin, so it shows a falsely normal value. Measure COHb by co-oximetry."
            ),
            part(
              "Treatment",
              "Gives 100% oxygen by non-rebreather to all of them immediately, monitors the confused father's ECG and neurological status, and anticipates discussion of hyperbaric oxygen for severe cases (confusion, syncope, pregnancy, very high levels).",
              "100% oxygen by non-rebreather for everyone now. The father's confusion makes him severe: cardiac monitoring, an ECG and troponin, and a call about hyperbaric oxygen."
            ),
          ],
        },
        {
          text: "A neighbor is brought in from a house fire, soot around his nose, hypotensive, with a lactate of 11 mmol/L.",
          ask: "What poisoning do you also suspect?",
          parts: [
            part(
              "Cyanide",
              "Suspects cyanide poisoning from burning plastics in smoke inhalation (shock and severe lactic acidosis), and anticipates the antidote (hydroxocobalamin) alongside oxygen and airway protection.",
              "Smoke from burning synthetics releases cyanide; hypotension with a very high lactate points to it. Expect hydroxocobalamin as well as 100% oxygen and early airway protection for the soot and possible inhalation burn."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------- Professional Issues (12 items) -- 1
    {
      slug: "cen-esi-waiting-room",
      objective: CEN_SIM_OBJECTIVES.triage,
      kind: "build",
      title: "Triage five patients with ESI version 5",
      brief:
        "Five fictional adults arrive within ten minutes. 1: a 30-year-old with an ankle sprain, normal vital signs, needs an x-ray. 2: a 55-year-old with crushing chest pain and diaphoresis. 3: a 22-year-old with a sore throat, normal vital signs, no tests needed. 4: a 68-year-old with abdominal pain who needs labs, imaging and IV fluids; HR 88, RR 18, SpO2 97%. 5: a 50-year-old who is unresponsive and apneic.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Assign each an ESI level, and say what would make you re-triage patient 4.",
          parts: [
            matchPart(
              "Patient to ESI level",
              "5 is level 1 (immediate life-saving intervention); 2 is level 2 (high-risk); 4 is level 3 (many resources, vital signs not high-risk); 1 is level 4 (one resource); 3 is level 5 (no resources).",
              "Apneic: needs life-saving intervention now (1). Chest pain with diaphoresis: high-risk, should not wait (2). Abdominal pain needing labs, imaging and IV fluids: two or more resources (3). Sprain needing an x-ray: one resource (4). Sore throat needing no tests: none (5).",
              {
                left: ["Patient 5 (unresponsive, apneic)", "Patient 2 (chest pain, diaphoresis)", "Patient 4 (abdominal pain, many resources)", "Patient 1 (ankle sprain, x-ray)", "Patient 3 (sore throat, no tests)"],
                right: ["ESI 1", "ESI 2", "ESI 3", "ESI 4", "ESI 5"],
                pairs: [0, 1, 2, 3, 4],
                leftHeading: "Patient",
                rightHeading: "Level",
              }
            ),
            part(
              "Re-triage",
              "Names ESI version 5 high-risk adult vital signs (HR above 100, RR above 20, SpO2 below 92%) or new high-risk features (severe pain, confusion) as reasons to reconsider level 2, and re-triage on any change while waiting.",
              "If patient 4's heart rate climbs above 100, breathing above 20, or SpO2 falls below 92% -- or pain becomes severe or she becomes confused -- reconsider level 2. Reassess anyone waiting when something changes."
            ),
          ],
        },
      ],
    },
  ],
};
