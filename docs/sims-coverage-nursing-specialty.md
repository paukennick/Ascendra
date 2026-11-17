# Nursing specialty and FNP sims: coverage map (REQ-279)

Generated 2026-11-16 for Nick's instruction of 2026-11-14 for the new
nursing courses (REQ-275 to REQ-278): build a bedside sim for every objective
that fits the selection rule (time matters, cues to read, choices with
consequences, or competing priorities), each with golden paths, dated
guideline sources and the engine rules. It is built the same way as
`docs/sims-coverage-clinical.md` (REQ-296).

## How the map was made

- **Fitting** is the generator's keyword screen (`lib/sim/generator/selection.ts`,
  docs/sims.md 12.2): a title that matches at least two of the four criteria.
  It reads titles only, so it is a shortlist, not a judgement: some fitting
  titles are recall (for example USPSTF screening intervals, the cost of
  medicines) and would be labs, not sims. No title was screened out by hand
  in this pass.
- **Main** means a sim names the objective as its `objective` (mastery
  evidence); **secondary** means it is in `secondaryObjectives` (analytics
  only, docs/sims.md 9.4).
- Counts are of active objectives in the seeded catalog (`courseObjectives`),
  read from the repository.

## Summary

All five courses had no sims before this work. Eight sims now cover eight
fitting objectives as their main objective; **123 fitting objectives have no
sim yet** (the instruction asks for all of them; see "What is left").

| Course | Objectives | Fitting | Fitting, a sim's main objective | Fitting, named by a sim at all | Sims |
|---|---|---|---|---|---|
| CMSRN | 65 | 25 | 2 | 4 | 2 |
| CEN | 115 | 34 | 2 | 2 | 2 |
| PCCN | 155 | 44 | 2 | 3 | 2 |
| FNPAANP | 33 | 14 | 1 | 2 | 1 |
| FNPANCC | 43 | 14 | 1 | 1 | 1 |

The FNP sims sit on titles both FNP courses share; each sim is registered to
one course (the red-flag case to FNPAANP, the hypoglycemia case to FNPANCC),
so each course shows one.

## What is left

The remaining fitting objectives are listed below with no sim. Building all
of them is far beyond one builder session (each sim is a hand-built model,
sources, five to seven golden paths and a lint pass). Candidates that fit the
bedside screen best, by course, in the order I would build them next:

- **PCCN:** hyperkalemia on the ECG; status epilepticus; compartment syndrome;
  opioid-induced respiratory depression with capnography; atrial
  fibrillation with a rapid ventricular response; tension pneumothorax or a
  dislodged chest tube; heparin-induced thrombocytopenia; hypertensive
  emergency titration.
- **CEN:** anaphylaxis; acute asthma with impending failure; ruptured ectopic
  pregnancy; upper GI bleeding; neurogenic shock; rising intracranial
  pressure; aortic dissection; burns (airway first, then size).
- **CMSRN:** transfusion reaction; opioid oversedation; restraint as a last
  resort; rapid response on early warning signs; moderate sedation.
- **FNP:** atypical presentation in an older adult (falls or delirium as
  infection; AANPCB); suicide risk in primary care (this needs the
  session screen and the mental health rules, not bedside); adverse drug
  effects and deprescribing.

Several of these repeat a sim another course already has (the NCLEX-RN
transfusion reaction, the ADN-RN PCA oversedation, the CCRN Adult status
epilepticus). A decision for Nick: build a course-specific version, or name
the existing sim as covering the objective (which today needs the sim's
course to match).

## Fitting objectives, course by course

### CMSRN

| Unit | Fitting objective | Criteria | Sim (main) | Sim (secondary) |
|---|---|---|---|---|
| Patient/Care Management | Apply the nursing process -- assess, diagnose, plan, implement, evaluate -- to a changing med-surg patient | cues, choices |  |  |
| Patient/Care Management | Apply safety protocols for skin, falls, restraint, hourly rounding and suicide risk | time, choices, priorities |  |  |
| Patient/Care Management | Recognize patient, drug, environment and equipment risk factors for harm | cues, priorities |  |  |
| Patient/Care Management | Administer medications safely, including IV therapy, and recognize interactions and adverse reactions | cues, choices |  |  |
| Patient/Care Management | Consider the cost of medications to the patient when planning discharge | choices, priorities |  |  |
| Patient/Care Management | Manage acute and chronic pain with multimodal pharmacological and non-drug measures, and set realistic expectations with the patient | time, choices |  |  |
| Patient/Care Management | Apply pre- and post-procedure standards: consent, timeout and monitoring | time, cues, choices, priorities |  |  |
| Patient/Care Management | Monitor a patient during and after moderate sedation within the nurse's scope | time, cues |  |  |
| Patient/Care Management | Assess nutritional needs and choose enteral or parenteral feeding with the dietitian and speech therapist | cues, choices |  |  |
| Patient/Care Management | Recognize early postoperative hemorrhage from a rising heart rate, falling urine output and restlessness before the blood pressure falls, and escalate | time, cues | postop-hemorrhage-early-signs |  |
| Patient/Care Management | Apply a restrictive transfusion threshold and monitor a transfusion closely from the start, stopping at once for a suspected reaction | cues, choices |  |  |
| Patient/Care Management | Use restraint only after less restrictive measures fail, on a time-limited order that is never PRN, with ongoing monitoring | time, cues |  |  |
| Patient/Care Management | Recognize opioid-induced oversedation with a sedation scale before respiratory depression, and respond | cues, choices |  |  |
| Holistic Patient Care | Respond to a grievance or a request for a second opinion, and recover the patient's trust | time, choices |  |  |
| Holistic Patient Care | Assess health literacy and choose a teaching method that fits | cues, choices |  |  |
| Elements of Interprofessional Care | Use the clinical judgment model -- recognize cues, analyze, prioritize hypotheses, generate solutions, act, evaluate -- to individualize care | cues, priorities |  |  |
| Elements of Interprofessional Care | Identify patients at risk of readmission and the social drivers of health behind it | cues, priorities |  |  |
| Professional Concepts | Prioritize a patient assignment and recognize which patient to see first | cues, priorities |  | delegation-morning-assignment |
| Professional Concepts | Call the rapid response team on early warning signs of deterioration | time, cues |  | postop-hemorrhage-early-signs |
| Professional Concepts | Practice within the state scope of practice and the ANA Code of Ethics for Nurses (2025 revision) | time, priorities |  |  |
| Professional Concepts | Protect patients' rights, privacy and informed consent | choices, priorities |  |  |
| Nursing Teamwork and Collaboration | Delegate tasks to assistive personnel and LPNs using the five rights, keeping assessment and evaluation with the RN | cues, priorities | delegation-morning-assignment |  |
| Nursing Teamwork and Collaboration | Assess a team's learning needs and plan education to meet them | cues, choices |  |  |
| Nursing Teamwork and Collaboration | Manage conflict between team members constructively | choices, priorities |  |  |
| Nursing Teamwork and Collaboration | Respond to an internal or external disaster within the hospital incident command structure | time, choices |  |  |

### CEN

| Unit | Fitting objective | Criteria | Sim (main) | Sim (secondary) |
|---|---|---|---|---|
| Cardiovascular Emergencies | Recognize acute coronary syndrome at triage and get a 12-lead ECG read without delay | time, cues |  |  |
| Cardiovascular Emergencies | Prioritize early ACS care: aspirin, nitroglycerin with blood-pressure precautions, oxygen only for hypoxemia, and rapid reperfusion for STEMI | time, priorities |  |  |
| Cardiovascular Emergencies | Recognize aortic dissection and ruptured aneurysm from sudden tearing pain, pulse or pressure differences and shock | time, cues |  |  |
| Cardiovascular Emergencies | Identify and treat stable and unstable tachycardias and bradycardias | time, cues, choices |  |  |
| Cardiovascular Emergencies | Assess acute arterial occlusion and deep vein thrombosis in a limb | time, cues |  |  |
| Cardiovascular Emergencies | Tell cardiogenic from obstructive shock and anticipate the treatment each needs | time, choices |  |  |
| Respiratory Emergencies | Manage an acute asthma attack and recognize the signs of impending respiratory failure | time, cues, choices |  |  |
| Respiratory Emergencies | Manage a COPD exacerbation with controlled oxygen and early noninvasive ventilation | time, choices |  |  |
| Respiratory Emergencies | Recognize inhalation injury and airway burns that need early airway protection | time, cues, choices |  |  |
| Respiratory Emergencies | Recognize tension pneumothorax as a clinical diagnosis treated before imaging | cues, choices |  |  |
| Neurological Emergencies | Recognize rising intracranial pressure from a falling level of consciousness, then pupil changes and Cushing's triad | time, cues |  |  |
| Neurological Emergencies | Transient ischemic attack and the risk of early stroke | time, priorities |  |  |
| Neurological Emergencies | Recognize neurogenic shock -- hypotension with bradycardia after spinal cord injury | time, cues |  |  |
| Gastrointestinal Emergencies | Manage upper and lower GI bleeding with large-bore access and blood | time, choices |  |  |
| Gastrointestinal Emergencies | Recognize variceal bleeding in cirrhosis and anticipate vasoactive drugs, antibiotics and endoscopy | time, cues |  |  |
| Genitourinary, Gynecology, and Obstetrical Emergencies | Recognize testicular torsion and priapism as time-critical | time, cues |  |  |
| Genitourinary, Gynecology, and Obstetrical Emergencies | Recognize ruptured ectopic pregnancy in any patient of childbearing age with pain, bleeding or shock | time, cues |  |  |
| Genitourinary, Gynecology, and Obstetrical Emergencies | Trauma in pregnancy: left uterine displacement and early fetal monitoring | time, cues |  |  |
| Mental Health Emergencies | Screen for suicide and homicide risk, and keep a patient at risk safe in the department | time, cues, priorities |  |  |
| Mental Health Emergencies | Assess an intentional overdose: the substance, the amount, the time and co-ingestions | time, cues |  |  |
| Medical Emergencies | Treat anaphylaxis with intramuscular epinephrine first, then airway, fluids and adjuncts | choices, priorities |  |  |
| Medical Emergencies | Recognize hyperkalemia, hyponatremia and other electrolyte emergencies and their treatment | time, cues, choices |  |  |
| Medical Emergencies | Recognize fever in an immunocompromised or neutropenic patient as an emergency | time, cues |  |  |
| Medical Emergencies | Recognize sepsis at triage and start cultures, antimicrobials and fluid within the first hour | time, cues, priorities | triage-sepsis-first-hour |  |
| Medical Emergencies | Recognize and treat alcohol and opioid withdrawal | cues, choices |  |  |
| Musculoskeletal and Wound Emergencies | Recognize high-pressure injection injuries as surgical emergencies despite a small wound | time, cues |  |  |
| Head, Eye, Ear, Nose, Throat Emergencies | Recognize acute angle-closure glaucoma, central retinal artery occlusion and retinal detachment as sight-threatening | time, cues |  |  |
| Head, Eye, Ear, Nose, Throat Emergencies | Control epistaxis and recognize a posterior bleed | time, cues |  |  |
| Head, Eye, Ear, Nose, Throat Emergencies | Recognize epiglottitis and peritonsillar abscess as threats to the airway | time, cues |  |  |
| Environment and Toxicology Emergencies, and Communicable Diseases | Assess a burn: airway and inhalation injury first, then size by percentage of body surface and depth | cues, priorities |  |  |
| Environment and Toxicology Emergencies, and Communicable Diseases | Recognize heat stroke and cool rapidly; rewarm hypothermia safely | time, cues |  |  |
| Professional Issues | Assign ESI levels to a waiting room of patients and re-triage when vital signs or symptoms change | time, cues | waiting-room-esi-retriage | triage-sepsis-first-hour |
| Professional Issues | Apply EMTALA: a medical screening examination for everyone who asks, stabilization, and appropriate transfer | cues, choices |  |  |
| Professional Issues | Obtain consent for treatment, and treat under implied consent in an emergency | time, choices, priorities |  |  |

### PCCN

| Unit | Fitting objective | Criteria | Sim (main) | Sim (secondary) |
|---|---|---|---|---|
| Cardiovascular | Dissecting or ruptured aneurysm: recognition and the first actions | cues, priorities |  |  |
| Cardiovascular | Care before and after diagnostic and interventional cardiac or vascular catheterization, including sheaths and arterial closure devices | cues, choices |  |  |
| Cardiovascular | Cardiogenic shock recognized on a progressive care unit and escalated | time, cues |  |  |
| Cardiovascular | Identify, interpret and respond to dysrhythmias on continuous monitoring | cues, choices |  |  |
| Cardiovascular | Monitor QTc intervals and ST segments, and select monitoring leads for the patient's disease | cues, choices |  |  |
| Cardiovascular | Manage arterial lines, central venous pressure and non-invasive hemodynamic monitoring | cues, choices |  |  |
| Cardiovascular | Lower blood pressure in a hypertensive emergency gradually with titrated IV agents under close monitoring, because an abrupt fall can injure the organs at risk | time, cues, choices, priorities |  |  |
| Cardiovascular | Differentiate unstable angina, NSTEMI and STEMI using symptoms, the 12-lead ECG and serial troponin results | time, cues |  |  |
| Cardiovascular | Recognize ST elevation and new arrhythmias on telemetry as emergencies to escalate at once | time, cues |  |  |
| Cardiovascular | Recognize retroperitoneal bleeding after femoral catheterization from back or flank pain, falling blood pressure and a rising heart rate, and act before the hemoglobin result | time, cues | femoral-access-retroperitoneal-bleed |  |
| Cardiovascular | Assess the access site and the limb beyond it after catheterization -- hematoma, pulses, color, warmth, sensation -- and apply firm pressure above the puncture for bleeding | time, cues, choices |  | femoral-access-retroperitoneal-bleed |
| Cardiovascular | Recognize atrial fibrillation with a rapid ventricular response, weigh rate control, rhythm control and anticoagulation, and monitor for hypotension during IV rate control | time, cues |  |  |
| Cardiovascular | Recognize cardiac tamponade from hypotension, muffled heart sounds, jugular venous distension and pulsus paradoxus, and escalate for drainage | time, cues |  |  |
| Respiratory | Manage a COPD exacerbation with titrated oxygen and noninvasive ventilation, and recognize when it is failing | cues, choices | copd-exacerbation-niv |  |
| Respiratory | Recognize opioid-induced respiratory depression with sedation scales and capnography before the oxygen saturation falls | time, cues |  |  |
| Respiratory | Recognize tension pneumothorax and a dislodged or disconnected chest tube as emergencies, and know the immediate response | time, cues |  |  |
| Respiratory | Recognize pulmonary embolism from sudden dyspnea, pleuritic pain and tachycardia, and monitor anticoagulation for bleeding | time, cues |  |  |
| Endocrine | Hypoglycemia: prevention, recognition and treatment | cues, choices |  |  |
| Endocrine | Recognize thyroid storm and myxedema coma as emergencies | time, cues |  |  |
| Hematology/Immunology/Oncology | Lupus, Guillain-Barre syndrome, ALS and multiple sclerosis in the acutely ill adult | time, priorities |  |  |
| Hematology/Immunology/Oncology | Administer blood products and monitor the response | cues, choices |  |  |
| Hematology/Immunology/Oncology | Recognize and respond to oncologic emergencies | time, cues, choices |  |  |
| Hematology/Immunology/Oncology | Apply a restrictive transfusion threshold (hemoglobin 7 g/dL for most stable adults, 8 with preexisting cardiovascular disease) and transfuse sooner for active bleeding or symptoms | time, cues, choices |  |  |
| Hematology/Immunology/Oncology | Recognize heparin-induced thrombocytopenia from a falling platelet count on heparin, stop all heparin and anticipate a non-heparin anticoagulant | time, cues |  |  |
| Hematology/Immunology/Oncology | Monitor Guillain-Barre syndrome for ascending weakness and falling breathing capacity | time, cues |  |  |
| Neurology | Keep blood pressure below 185/110 mm Hg before IV thrombolysis and below 180/105 mm Hg for at least 24 hours after, monitoring neurologically for bleeding | time, cues |  |  |
| Neurology | Treat a seizure lasting 5 minutes or more as status epilepticus: protect the airway, check glucose, give a benzodiazepine first | choices, priorities |  |  |
| Neurology | Recognize a falling level of consciousness as the earliest sign of rising intracranial pressure, and pupil changes and Cushing's triad as late ones | time, cues |  |  |
| Gastrointestinal | Manage hepatic encephalopathy with lactulose and rifaximin while keeping nutrition adequate | choices, priorities |  |  |
| Renal | Apply the KDIGO definition of acute kidney injury: creatinine up 0.3 mg/dL within 48 hours, or 1.5 times baseline within 7 days, or urine below 0.5 mL/kg/h for 6 hours | time, choices |  |  |
| Renal | Assess a fistula or graft for thrill and bruit and protect the access arm | cues, choices |  |  |
| Musculoskeletal | Initiate and monitor early mobility | time, cues, choices |  |  |
| Musculoskeletal | Recognize compartment syndrome from pain out of proportion and pain on passive stretch, remove constricting dressings, keep the limb at heart level and escalate at once | time, cues |  |  |
| Musculoskeletal | Assess fall risk on admission and after any change, and apply the prevention plan it calls for | time, cues, choices, priorities |  |  |
| Multisystem | Screen for sepsis and recognize septic, anaphylactic and hypovolemic shock | time, cues |  |  |
| Multisystem | Administer procedural sedation medications and monitor the response | cues, choices |  |  |
| Multisystem | Recognize urgent situations and procedural or surgical complications, and initiate interventions | time, cues, choices |  |  |
| Multisystem | Administer medications and monitor for the expected and adverse response | cues, choices |  |  |
| Multisystem | Treat anaphylaxis with intramuscular epinephrine first, then support airway and circulation | choices, priorities |  |  |
| Multisystem | Recognize rhabdomyolysis from muscle pain, dark urine and a high CK, and give early IV fluid while watching potassium and kidney function | time, cues, priorities |  |  |
| Multisystem | Assess pain with a validated scale and reassess after every intervention | cues, choices |  |  |
| Behavioral/Psychosocial | Assess and manage a patient with suicidal ideation | time, cues, choices |  |  |
| Behavioral/Psychosocial | De-escalate first, use restraint only as a last resort on a time-limited order, and know the 1-hour face-to-face evaluation and 4-hour adult order limit for violent behavior | time, cues, priorities |  |  |
| Advocacy, Caring Practices, Response to Diversity, Facilitation of Learning | Support informed consent and advance directives, and recognize when a patient lacks decision-making capacity | cues, priorities |  |  |

### FNPAANP

| Unit | Fitting objective | Criteria | Sim (main) | Sim (secondary) |
|---|---|---|---|---|
| Assess | Choose and perform a focused or complete physical examination, including developmental, functional and cognitive screens | cues, choices |  |  |
| Assess | Order, perform and interpret screening and diagnostic tests, including when a test will not change management | cues, choices |  |  |
| Assess | Apply current USPSTF cancer screening ages and intervals for colorectal, breast and cervical cancer | cues, choices |  |  |
| Assess | Assess older adults for falls, cognition, function, polypharmacy and frailty | time, cues |  |  |
| Assess | Assess risk from genetics, behavior, sexual history, substance use and social drivers of health | cues, priorities |  |  |
| Diagnose | Build and prioritize a differential diagnosis from history, examination and test results, ruling out the dangerous causes first | cues, priorities |  |  |
| Diagnose | Recognize red flags that need emergency referral: chest pain, stroke symptoms, sepsis, an acute abdomen, ectopic pregnancy and suicidal intent | time, cues | clinic-severe-bp-stroke-signs |  |
| Diagnose | Recognize atypical presentations in older adults, such as delirium or falls as the first sign of infection | time, cues, priorities |  |  |
| Plan | Decide on statin therapy for primary prevention by age, risk factors and 10-year cardiovascular risk | choices, priorities |  |  |
| Plan | Screen for depression and anxiety, assess suicide risk, and start treatment or refer | time, cues, choices, priorities |  |  |
| Evaluate | Monitor treatment response and adverse effects, and modify the plan by patient outcomes | cues, choices |  |  |
| Evaluate | Evaluate blood pressure, A1C, lipid and symptom control against targets and intensify or simplify treatment | cues, choices |  | clinic-severe-bp-stroke-signs |
| Evaluate | Recognize hypoglycemia from diabetes treatment and adjust the regimen to prevent it | cues, choices |  |  |
| Evaluate | Use patient-reported outcomes and adherence barriers to evaluate a plan | cues, choices |  |  |

### FNPANCC

| Unit | Fitting objective | Criteria | Sim (main) | Sim (secondary) |
|---|---|---|---|---|
| Assessment | Choose and perform a focused or complete physical examination, including developmental, functional and cognitive screens | cues, choices |  |  |
| Assessment | Apply current USPSTF cancer screening ages and intervals for colorectal, breast and cervical cancer | cues, choices |  |  |
| Assessment | Assess older adults for falls, cognition, function, polypharmacy and frailty | time, cues |  |  |
| Assessment | Assess genetic, behavioral, sexual, lifestyle, cultural and social risk | cues, priorities |  |  |
| Diagnosis | Build and prioritize a differential diagnosis from history, examination and test results, ruling out the dangerous causes first | cues, priorities |  |  |
| Diagnosis | Recognize red flags that need emergency referral: chest pain, stroke symptoms, sepsis, an acute abdomen, ectopic pregnancy and suicidal intent | time, cues |  |  |
| Diagnosis | Select the diagnostic test that will change management, and interpret its result | cues, choices |  |  |
| Planning | Decide on statin therapy for primary prevention by age, risk factors and 10-year cardiovascular risk | choices, priorities |  |  |
| Implementation | Protect confidentiality and apply HIPAA, accessibility and consent rules in practice | choices, priorities |  |  |
| Implementation | Manage resources for access, coordination and cost-effectiveness | choices, priorities |  |  |
| Implementation | Screen for depression and anxiety, assess suicide risk, and start treatment or refer | time, cues, choices, priorities |  |  |
| Evaluation | Monitor treatment response and adverse effects, and modify the plan by patient outcomes | cues, choices |  |  |
| Evaluation | Recognize hypoglycemia from diabetes treatment and adjust the regimen to prevent it | cues, choices | clinic-sulfonylurea-hypoglycemia |  |
| Evaluation | Apply justice, consent, guardianship and bioethics principles to treatment decisions | choices, priorities |  |  |

## REQ-323 progress (2026-11-17)

Nick approved bands on 2026-11-16 (docs/sims.md 22.28), which settles the
decision above: an existing sim on another course now covers a fitting
objective by a band registered to this course. Nine bands this round
(docs/sims.md 22.32), each a fitting objective's main sim:

- **CMSRN** (3): the transfusion threshold and stopping for a reaction
  (NCLEX-RN transfusion case); opioid oversedation on a sedation scale (ADN-RN
  PCA case); the nursing process for a changing med-surg patient (NCLEX-RN
  deterioration case).
- **PCCN** (3): urgent procedural or surgical complications (CMSRN bleeding
  case); sepsis screening and shock (CCRN Adult sepsis case); status
  epilepticus (CCRN Adult case, set on a neuroscience progressive care unit).
- **FNPAANP and FNPANCC** (1 each): each FNP course now has both FNP cases,
  the stroke red flags and the sulfonylurea hypoglycemia.
- **NCLEX-RN** (1): prioritizing hypotheses as data arrive (PCCN femoral
  access bleed).

That leaves 115 of the 123 fitting objectives above without a main sim
(CMSRN 20, CEN 32, PCCN 39, FNPAANP 12, FNPANCC 12, counted from the table
above less this round's bands). Not banded, and why: the CCRN Adult tension
pneumothorax case to PCCN or CEN (a ventilated ICU patient after a line,
not a progressive care or emergency department patient); the NCLEX-PN
anaphylaxis case to CEN, PCCN or CCRN (the LPN scope and a subacute unit);
the NCLEX-RN hyperkalemia and CIWA cases to CEN (inpatient medical units).
Next new bedside cases, in order: CEN anaphylaxis, acute asthma and a
ruptured ectopic pregnancy; PCCN atrial fibrillation with a rapid
ventricular response, hyperkalemia on the ECG and opioid depression with
capnography; CMSRN restraint as a last resort.
