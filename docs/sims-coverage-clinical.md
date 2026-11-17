# Clinical sims: coverage map (REQ-296)

Generated 2026-11-14 for Nick's instruction of that day ("Build more sims, no
need to limit number, build what covers the material"). It maps every
existing clinical course against his selection rule (2026-11-10): a sim fits
a sub-objective when time matters, there are cues to read, choices have
consequences, or priorities compete.

## How the map was made

- **Fitting** is the generator's keyword screen (`lib/sim/generator/selection.ts`,
  docs/sims.md 12.2): an objective title that matches at least two of the four
  criteria. It reads titles only, so it is a shortlist, not a judgement. It
  misses objectives whose titles are short (several existing sims sit on titles
  the screen does not pass) and passes some recall-only titles. Where a title
  was read by hand and judged recall-only, it is listed under "Screened out by
  hand" and left out of the counts.
- **Covered** means an existing sim names the objective: as its `objective`
  (the run counts toward mastery on it) or in `secondaryObjectives` (recorded
  for analytics only, docs/sims.md 9.4). Both are shown, because only the first
  earns mastery evidence.
- Counts are of active objectives in the seeded catalog (`courseObjectives`), read
  from the repository, not a database.

## Summary

Before = master at cb4d18a2 (before REQ-296); after = this branch, both waves (2026-11-14 and 2026-11-16). Columns: fitting objectives;
fitting objectives that are a sim's main objective; fitting objectives a sim
names at all (main or secondary); sims on the course.

### Nursing

| Course | Fitting | Main, before | Main, after | Any, before | Any, after | Sims before | Sims after |
|---|---|---|---|---|---|---|---|
| **NCLEXRN** | 111 | 1 | 3 | 3 | 15 | 2 | 4 |
| **NCLEXPN** | 44 | 0 | 2 | 2 | 8 | 2 | 4 |
| **CNA** | 7 | 1 | 2 | 3 | 4 | 2 | 3 |
| ADNRN | 31 | 2 | 2 | 2 | 2 | 2 | 2 |
| BSNRN | 23 | 2 | 2 | 3 | 3 | 2 | 2 |
| LPNVN | 24 | 2 | 2 | 2 | 2 | 2 | 2 |
| **CCRNADULT** | 81 | 2 | 3 | 5 | 7 | 5 | 6 |
| CCRNPEDS | 54 | 2 | 2 | 7 | 7 | 2 | 2 |
| CCRNNEO | 46 | 1 | 1 | 4 | 4 | 2 | 2 |

### EMS

| Course | Fitting | Main, before | Main, after | Any, before | Any, after | Sims before | Sims after |
|---|---|---|---|---|---|---|---|
| NREMTEMR | 16 | 1 | 1 | 3 | 3 | 2 | 2 |
| NREMTEMT | 31 | 1 | 1 | 4 | 4 | 2 | 2 |
| NREMTAEMT | 20 | 0 | 0 | 4 | 4 | 2 | 2 |
| NREMTPARAMEDIC | 29 | 2 | 2 | 4 | 4 | 2 | 2 |

### Physical therapy

| Course | Fitting | Main, before | Main, after | Any, before | Any, after | Sims before | Sims after |
|---|---|---|---|---|---|---|---|
| **DPT** | 15 | 0 | 2 | 4 | 9 | 3 | 5 |
| **PTPREREQ** | 2 | 0 | 1 | 0 | 1 | 0 | 1 |
| NPTEPT | 32 | 0 | 0 | 0 | 0 | 0 | 0 |
| NPTEPTA | 20 | 0 | 0 | 0 | 0 | 0 | 0 |
| ABPTSCCS | 16 | 0 | 0 | 0 | 0 | 0 | 0 |
| ABPTSECS | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| ABPTSGCS | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| ABPTSNCS | 13 | 0 | 0 | 0 | 0 | 0 | 0 |
| ABPTSOCS | 11 | 0 | 0 | 0 | 0 | 0 | 0 |
| ABPTSONC | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| ABPTSPCS | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| ABPTSPWCS | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| ABPTSSCS | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| ABPTSWMS | 7 | 0 | 0 | 0 | 0 | 0 | 0 |

### Mental health

| Course | Fitting | Main, before | Main, after | Any, before | Any, after | Sims before | Sims after |
|---|---|---|---|---|---|---|---|
| NCE | 11 | 1 | 1 | 1 | 1 | 2 | 2 |
| NCMHCE | 11 | 2 | 2 | 2 | 2 | 3 | 3 |
| EPPP | 26 | 3 | 3 | 3 | 3 | 3 | 3 |

Launch courses are in bold.

## Per course

Each fitting objective, in course order, with the sim that covers it. `main`:
the sim's objective; `secondary`: named in its secondary objectives; `none`: no
sim yet. Sims whose objective the screen does not pass are listed after the
course's fitting objectives.

### NCLEXRN

- Unstable versus stable: recognizing which client is actually deteriorating (main: med-surg-deterioration-sbar)
- What can never be delegated: assessment, evaluation, teaching, unstable clients (secondary: med-surg-deterioration-sbar)
- Supervising delegated care and evaluating the outcome rather than assuming it (none)
- Legal issues that reach the nurse: refusal of treatment, client valuables, interpreter services (none)
- Recognizing ethical dilemmas and reporting them (none)
- Practicing within the nurses' code of ethics and the legal scope of practice (none)
- Managing conflict among clients and staff (none)
- Work a case through the six clinical judgment steps the test plan names -- recognize cues, analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes -- and say which step a given question is testing (none)
- Prioritize hypotheses by asking which explanation is most likely, which is most serious, and which must be treated first, then revisit the ranking as new data arrive (none)
- Write outcomes in SMART form with a time frame, set with the client's input where possible, so that evaluation has something concrete to compare against (none)
- Evaluate outcomes by comparing what happened with what was expected, and revise the plan when the goal is not met rather than repeating the same interventions (none)
- Distinguish assignment from delegation: assignment hands routine care within a person's authorized scope or basic training; delegation hands a specific activity beyond their traditional role, after competence is validated (none)
- Apply the right circumstance: delegate only for a stable client, and require the delegatee to report any change so the nurse can reassess whether delegation is still safe (none)
- Know that handing care of a client to another RN, or an LPN/VN to another LPN/VN, is a handoff, not delegation, and that state law decides whether an LPN/VN may delegate to assistive personnel (none)
- Know the nurse's part in informed consent: confirm the signer is of legal age, competent and acting voluntarily, and escalate when the client does not understand the procedure, its risks or alternatives (none)
- Recognize when someone else gives consent -- parents, guardians or court-appointed decision-makers -- and when consent is implied in an emergency (none)
- Know that a nurse who knows consent was not properly obtained and does not tell the provider or a supervisor can be held liable, and that treating without consent may be battery (none)
- Name the ethical principles behind practice -- autonomy, beneficence, nonmaleficence, justice, fidelity and veracity -- and identify which ones conflict in a dilemma (none)
- Protect health information by logging off after each use, guarding the screen, keeping conversations private, and accessing only the minimum information the job requires (none)
- Identify the parts of a malpractice claim -- a duty owed, a breach of that duty, and harm caused by the breach -- and how documentation of the standard of care is used to judge it (none)
- Know that a sentinel event is a patient safety event, such as a fall, that leads to death, permanent harm or severe temporary harm -- not harm from the illness itself -- and that its investigation uses root cause analysis to find system causes (none)
- Home safety assessment: lighting, handrails, kitchen and fire hazards (none)
- Assessing balance and transfer ability before planning mobility care (none)
- Restraints and safety devices: assessing appropriateness of the type used (none)
- Incident, event and variance reporting, and evaluating the response to it (none)
- Reporting, intervening in or escalating unsafe staff practice (none)
- Emergency response: nursing roles in disaster planning and drills (none)
- Prevent falls in older adults with a fall risk assessment, medication review and attention to the drugs, such as opioids, that raise fall risk (none)
- Recognize the forms of abuse a client may disclose and follow state and facility reporting rules, including adult and child protective services and police where required (none)
- Triage with the ABCDE sequence -- airway, breathing, circulation, disability, exposure -- assessing the airway first whatever the underlying cause (none)
- Know the phases of disaster response, starting with mitigation that reduces the risk and impact of future disasters before one occurs (none)
- Prevent medication errors through the safety checks in four groups: identify the client correctly, check the order for errors, keep the environment safe, and monitor for adverse reactions (secondary: hyperkalemia-critical-value)
- Recognize oncologic emergencies the nurse must report at once, such as tumor lysis syndrome with its high potassium, high phosphate and low calcium (none)
- Screen every client for intimate partner violence and know that pregnancy raises the risk of physical abuse and of serious maternal and newborn complications (none)
- Manage aggression with the least restrictive measure that is safe, treat an emergency medication order as an interim step, and stay with the client afterwards to monitor its effect (none)
- Recognize biological disasters -- outbreaks, pandemics and bioterrorism -- and apply epidemiology and public health principles to triage and care (none)
- Keep electronic health information confidential, accurate and available, and spot and respond to a security breach (none)
- Postpartum care, and assessing for hemorrhage and infection (secondary: postpartum-hemorrhage-atony)
- Comprehensive health assessment versus targeted screening (none)
- Health history and risk assessment, including family and genetic history (none)
- High-risk behaviors: identifying them and teaching prevention and treatment (none)
- Name Erikson's psychosocial stages in order from trust versus mistrust onward, and recognize how an unresolved early stage can show up later in a client's behavior (none)
- Recognize postpartum hemorrhage -- cumulative blood loss of 1,000 mL or more within 24 hours of birth, by either route -- measure blood loss quantitatively, and activate the hemorrhage team (main: postpartum-hemorrhage-atony)
- Support early newborn care: skin-to-skin contact for the stable baby, delaying the first bath to protect temperature and blood sugar, and infant security banding (none)
- Teach parents the newborn warning signs that need urgent care, such as a pause in breathing of 20 seconds or more, or any shorter pause with blue color, paleness or a slow heart rate, and safe sleep and car seat use (none)
- Use the comprehensive geriatric assessment areas -- ADLs, IADLs, mental health, fall risk, pain, polypharmacy, nutrition, senses and care preferences -- to target health promotion for an older adult (none)
- Assess older adults for fall risk, linked to osteoporosis, loss of muscle mass, dizziness, poor mobility, weakness and vision impairment (none)
- Explain the reasons for genetic testing -- inherited conditions, diagnosis from symptoms, carrier status, cancer screening or treatment -- and support informed decisions about it (none)
- Assessing for abuse or neglect, and reporting or escalating it (none)
- Assessing the potential for violence and using safety precautions (none)
- Identifying the client in crisis and applying crisis intervention technique (none)
- Managing withdrawal and toxicity symptoms (none)
- Signs and symptoms of acute and chronic mental illness (none)
- Religious and spiritual influences, including conflict between belief and treatment (none)
- Stress management technique, and evaluating the client's use of it (none)
- Assess suicide risk directly when ideation is present, including lethality: whether there is a detailed plan, access to means, past attempts, current mental state and social support (none)
- Know that suicidal ideation ranges from fleeting passive thoughts to a detailed plan with timing and method, and that depression and substance use are its most common drivers (none)
- Monitor lithium closely: it has a narrow safety margin, so changes in sodium balance and drugs such as diuretics, NSAIDs and ACE inhibitors can push the level into toxicity (none)
- Recognize extrapyramidal effects of first-generation antipsychotics -- pseudoparkinsonism, dystonia, akathisia and tardive dyskinesia -- and report them promptly (none)
- Recognize neuroleptic malignant syndrome as a rare but potentially fatal reaction to antipsychotics that needs immediate escalation (none)
- Know that clozapine is reserved for schizophrenia that has not responded to other drugs and needs absolute neutrophil count monitoring as its labeling directs (the FDA ended the clozapine REMS program in June 2025) (none)
- Screen for alcohol withdrawal on admission and use the CIWA-Ar scale to judge the need for medically supervised withdrawal management (none)
- Recognize alcohol overdose -- confusion, difficulty staying conscious, vomiting, seizures, slow breathing and heart rate, low temperature -- and the added risk when combined with opioids or sedatives (none)
- Recognize a manic episode -- high energy, grandiose delusions, little need for sleep, racing thoughts, rapid speech and reckless behavior -- and the depressive episodes that alternate with it in bipolar disorder (none)
- Know the client rights that protect mental health clients, including HIPAA confidentiality and the HIPAA notice describing how health information is shared (none)
- Know that nurses are often first to see signs of anger, abuse and violence, and that abuse occurs in homes and in institutions such as hospitals and nursing homes (none)
- Recognize opioid use disorder, which can begin with legitimate pain treatment, and its consequences such as financial trouble (none)
- Rest and sleep: assessing the pattern and intervening on it (none)
- Recognize that loss of basic ADLs such as bathing, feeding and dressing sharply raises the chance of nursing home admission, and plan support that preserves them (none)
- Use the TIME principles to prepare a wound bed -- tissue, infection or inflammation, moisture balance, edges -- and choose a dressing that fits the wound at that stage (none)
- Titrating a dose against assessment and ordered parameters (none)
- Evaluating the client's response to a medication over time (secondary: hyperkalemia-critical-value)
- Administering blood products and evaluating the response (none)
- Read anticoagulant monitoring: a higher aPTT, INR or anti-Xa level means blood that clots more slowly and a client more prone to bleeding (none)
- Monitor digoxin for toxicity -- anorexia, nausea, vomiting, visual changes and dysrhythmias -- and remember low potassium and magnesium increase the risk (none)
- Report a medication error honestly and promptly, because early disclosure may allow an intervention that prevents harm (none)
- Collect only one unit of blood from the bank at a time, and verify client identity, order, consent, blood type and compatibility at the bedside before starting (secondary: post-op-transfusion-reaction)
- Recognize fluid volume overload during IV therapy -- rising blood pressure and respiratory rate, falling saturation, edema and crackles -- and act on it (none)
- Monitor vancomycin by renal function and serum drug levels, because it is cleared entirely by the kidneys, and know that the oral form treats C. difficile colitis (none)
- Teach a client on corticosteroids not to stop them abruptly because of the risk of adrenal insufficiency, and to report signs of infection; monitor potassium, sleep and weight (none)
- Monitor opioid therapy with the NARCS U adverse effects in mind -- nausea, addiction, respiratory depression, constipation, sedation, urinary retention -- and treat respiratory depression with naloxone (none)
- Know that ultra-rapid CYP2D6 metabolizers can turn codeine into too much morphine, risking life-threatening respiratory depression (none)
- Assessing and responding to changes and trends in vital signs (secondary: postpartum-hemorrhage-atony)
- Applying pathophysiology when measuring and interpreting vital signs (none)
- Testing within the nurse's scope: ECG, point-of-care testing, fetal monitoring (secondary: hyperkalemia-critical-value)
- Risk assessment for falls, sensory impairment, mobility and skin integrity (none)
- Recognizing a trend in the client's condition and intervening on it (secondary: postpartum-hemorrhage-atony)
- Monitoring for signs of bleeding (secondary: postpartum-hemorrhage-atony)
- Intervening on circulatory complications: hemorrhage, embolus, shock (secondary: postpartum-hemorrhage-atony)
- Evaluating the client's response to a procedure or treatment (none)
- Prioritize airway management and postoperative nausea and vomiting in the postanesthesia care unit, and give a clear handover from the surgical team (none)
- Work with respiratory therapy and the provider to set oxygen saturation targets in an acute respiratory exacerbation, and monitor saturation and oxygen needs (none)
- Identifying the pathophysiology behind an acute or chronic condition (none)
- Evaluating response to treatment for an infectious disease (none)
- Implementing and monitoring phototherapy (none)
- Medical emergencies: applying pathophysiology under time pressure (secondary: hyperkalemia-critical-value)
- Unexpected adverse response to therapy, and recognizing complications early (secondary: hyperkalemia-critical-value)
- Evaluating achievement of the client's treatment goals (none)
- Identify hyperkalemia -- serum potassium above 5.1 mEq/L -- by irritability, cramping, diarrhea and peaked T waves, and know it can progress to dysrhythmia and cardiac arrest (main: hyperkalemia-critical-value)
- Recognize Cushing's triad -- widening pulse pressure, bradycardia and irregular breathing -- as a sign of increased intracranial pressure, alongside headache, vomiting and a falling level of consciousness (none)
- Know the common seizure triggers -- high fever, tumor, stroke, head injury, infection, hypoglycemia and alcohol -- so you can anticipate seizures and protect the client (none)
- Prioritize respiratory distress and falling oxygenation in pneumonia: monitor vital signs, give oxygen and prepare the client for imaging (none)
- Prioritize airway, then breathing, circulation with fluid resuscitation, and temperature in a burn, and watch for infection, hypovolemia, hypothermia and sepsis (none)
- Interpret the fetal heart rate baseline: 110 to 160 bpm with moderate variability reassures, and the first response to an abnormal tracing is repositioning, or stopping oxytocin if it is infusing (none)
- Recognize distributive shock, where low blood pressure comes from vasodilation rather than volume loss, and report a falling blood pressure with a rising heart rate promptly (none)
- Recognize the warning signs of immunodeficiency -- opportunistic or persistent infections despite treatment -- and teach measures that reduce infection risk, including antiretroviral adherence in HIV (none)
- Tell DKA from HHS: DKA is acute with a low mortality rate, while HHS develops slowly, over weeks, with a much higher mortality rate (none)
- Treat thyroid storm -- fever, tachycardia, agitation, confusion, vomiting, diarrhea -- as an emergency needing immediate care and treatment of the cause (none)
- Recognize appendicitis -- right lower quadrant or periumbilical pain and a positive Rovsing sign -- and that perforation can cause peritonitis, sepsis and septic shock (none)
- Recognize multiple sclerosis, a chronic neurological disease that usually first appears between ages 20 and 40, with coordination problems, slurred speech and cognitive changes (none)
- Prioritize airway clearance and respiratory status in cystic fibrosis, monitoring cough, lung sounds and vital signs for exacerbation (none)

Sims on objectives the screen does not pass:

- post-op-transfusion-reaction: Tell transfusion reactions apart: febrile nonhemolytic is most common, allergic reactions are often mild, acute hemolytic reactions come from ABO mismatch, and circulatory overload from excess volume

### NCLEXPN

- Assignment and delegation as they apply to the PN, including delegation to assistive personnel (none)
- Ethical practice and recognizing an ethical dilemma (none)
- Resource management and cost-conscious care (none)
- Contribute to the six clinical judgment steps -- recognize and analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes -- within the PN role, reporting findings that need RN or provider judgment (secondary: ltc-change-in-condition, postpartum-check-boggy-fundus)
- Know that a licensed nurse who delegates keeps accountability for the client and cannot delegate nursing judgment, and that state law decides whether an LPN/VN may delegate to assistive personnel (none)
- Accept a delegated task only if it is within your scope and you are competent, and ask clarifying questions before you begin (none)
- Monitor the work of assistive personnel and intervene or report when care is unsafe or incomplete (none)
- Know that treating without consent can be battery, and that a breach of the duty of care that causes harm is the basis of a negligence claim (none)
- Protect privacy: log off after each use, keep screens from view, keep conversations private, and access only the minimum information the job requires (none)
- Organize and prioritize care by client need, using airway, breathing and circulation and Maslow's hierarchy to decide what comes first (secondary: first-dose-anaphylaxis)
- Rank the possible explanations for a client's cues by how likely and how serious each is, and take the most urgent to the RN or provider (none)
- Know that a sentinel event, such as a fall that causes death or permanent disability, is investigated by root cause analysis aimed at system causes, which is why prompt incident reports matter (secondary: med-pass-error-caught)
- Emergency response plans and participation in drills (none)
- Identify and address unsafe conditions in health care and home settings, including fall hazards for older adults and medications such as opioids that raise fall risk (none)
- Screen clients for intimate partner violence and know that pregnancy raises the risk of physical abuse (none)
- Postpartum care, including signs of hemorrhage and infection (secondary: postpartum-check-boggy-fundus)
- Identify clients who need required or voluntary immunizations, and know that immunization is primary prevention while screening is secondary prevention (none)
- Monitor the recovery of a stable postpartum client: report a temperature above 100.4 F (38 C), and check the fundus, bladder and lochia (main: postpartum-check-boggy-fundus)
- Recognize postpartum hemorrhage as blood loss of 1,000 mL or more within 24 hours of birth, and report heavy bleeding at once (secondary: postpartum-check-boggy-fundus)
- Reinforce newborn care teaching, including safe sleep, car seat use and the warning signs that need urgent care (none)
- Support early skin-to-skin contact for a stable newborn and the delayed first bath that protects temperature and blood sugar (none)
- Know that HPV and hepatitis B vaccines prevent some cancers, while mammograms, colonoscopy and cervical screening catch cancer early (none)
- Collect data on fall risk in older adults, linked to bone and muscle loss, dizziness, poor mobility, weakness and poor vision (none)
- Abuse or neglect: recognizing it, reporting it, escalating it (none)
- Recognizing the potential for violence and using safety precautions (none)
- Crisis intervention within the PN role (none)
- Mental health concepts and recognizing acute and chronic mental illness (none)
- Know the risk factors a suicide lethality assessment looks for -- a detailed plan, access to means, past attempts -- and report any suicidal statement to the RN at once (none)
- Identify the signs of substance misuse, substance use disorder, withdrawal and overdose, including alcohol overdose and the added risk with opioids or sedatives (none)
- Help de-escalate an angry or agitated client, and stay with or near the client after an emergency medication to monitor its effect (none)
- Recognize that opioid use disorder can start with legitimate pain treatment (none)
- Recognizing an allergic reaction and responding to it (main: first-dose-anaphylaxis)
- Pharmacological pain management and p.r.n. decisions within scope (none)
- Teach a client on warfarin to keep vitamin K intake consistent, and know a higher INR means a greater bleeding risk (none)
- Reinforce that corticosteroids must not be stopped suddenly because of the risk of adrenal insufficiency, and report signs of infection (none)
- Risk assessment for falls and mobility (none)
- Unexpected response to therapy, and recognizing complications early (secondary: first-dose-anaphylaxis)
- Recognize high potassium -- above 5.1 mEq/L -- by cramping, diarrhea and peaked T waves, and report it as a risk for dysrhythmia (none)
- Recognize and report signs of rising intracranial pressure: headache, vomiting, falling level of consciousness, and Cushing's triad (none)
- Tell DKA from HHS: DKA is acute with low mortality, while HHS develops over weeks with a much higher mortality rate (none)
- Recognize thyroid storm as an emergency and hypothyroidism by weight gain, cold extremities, constipation and slowed thinking (none)
- Recognize appendicitis by right lower quadrant or periumbilical pain, and report it because perforation can cause peritonitis and sepsis (none)
- Prioritize airway, breathing and circulation in a burn, and watch for infection, hypothermia and sepsis (none)
- Recognize meningococcal meningitis -- stiff neck, fever, altered mental status -- as a medical emergency (none)

Sims on objectives the screen does not pass:

- ltc-change-in-condition: Recognizing the client whose condition requires immediate RN or provider involvement
- med-pass-error-caught: The rights of medication administration, applied rather than recited

### CNA

- Safety and emergency procedures (main: resident-found-on-floor)
- Recognizing an emergency and summoning help correctly (secondary: resident-chokes-at-lunch, resident-found-on-floor, evening-vitals-out-of-range)
- Recognizing a measurement that falls outside the expected range (main: evening-vitals-out-of-range)
- Observation versus interpretation, and why the aide reports the first (secondary: resident-found-on-floor, evening-vitals-out-of-range)
- Skin care and recognizing early pressure injury (none)
- Responding to behavior without escalating it (none)
- Never use a physical or chemical restraint for discipline or staff convenience; a restraint may be used only to treat a medical symptom, the least restrictive way, for the shortest time (none)

Sims on objectives the screen does not pass:

- resident-chokes-at-lunch: The Heimlich maneuver, named explicitly in the regulation

### ADNRN

- The nursing process: assessment, diagnosis, planning, implementation, evaluation (none)
- Name the four NANDA-I categories of nursing diagnosis -- problem-focused, risk, health promotion, syndrome -- and the four parts of a problem-focused diagnosis: label, definition, defining characteristics, related factors (none)
- Base a risk diagnosis on clinical judgment about the client's individual vulnerability, before any problem has appeared (none)
- Map the nursing process onto the six clinical judgment steps, and use evaluation to decide whether the plan continues, changes or ends (main: pca-oversedation-naloxone)
- Document changes promptly and objectively, because timely, accurate records are the cues the team uses to act (none)
- Apply the five rights of delegation, keeping in mind that the RN retains accountability and cannot delegate nursing judgment or an unstable client (none)
- Use the comprehensive geriatric assessment areas -- function, cognition, mood, falls, pain, polypharmacy, nutrition, senses -- for older adults (none)
- Shock: recognizing type, stage and urgency (none)
- Sepsis recognition and the first hour of response (none)
- Recognize heart failure findings -- graded edema, weight gain, orthopnea, crackles -- and pulmonary edema as an emergency (main: heart-failure-pulmonary-edema)
- Teach warfarin safety: consistent vitamin K intake and INR monitoring, with a higher INR meaning higher bleeding risk (none)
- Tell DKA from HHS: DKA is acute with low mortality, while HHS develops over weeks and has a much higher mortality rate (none)
- Treat thyroid storm as an emergency, and recognize hypothyroidism by low metabolic rate, weight gain, cold extremities and constipation (none)
- Burns: depth, fluid resuscitation and infection risk (none)
- Distinguish intracerebral from subarachnoid hemorrhage and know hypertension and anticoagulants raise the risk of intracerebral bleeding (none)
- Prioritize airway, breathing, then circulation and fluid resuscitation in burns, and watch for infection, hypothermia and sepsis (none)
- Recognize appendicitis with a positive Rovsing sign, and peritonitis after perforation as a route to sepsis (none)
- Postpartum assessment and hemorrhage management (none)
- Interpret the fetal heart rate baseline -- 110 to 160 bpm with moderate variability -- and respond to an abnormal tracing by repositioning or stopping oxytocin (none)
- Recognize postpartum hemorrhage at 1,000 mL within 24 hours, measure blood loss quantitatively, and assess fundal tone and bladder (none)
- Recognize bronchiolitis, usually from RSV, as most severe in infants, with priorities of symptom relief, preventing complications and controlling spread (none)
- Treat epiglottitis as an airway emergency: a child's floppy epiglottis can block the airway quickly, and the Hib vaccine has made it less common (none)
- Recognize meningococcal meningitis as a medical emergency, with stiff neck, fever and altered mental status as its classic signs (none)
- Suicide risk assessment and safety planning (none)
- Crisis intervention and de-escalation (none)
- Assess suicide lethality: a detailed plan, access to means, prior attempts, current mental state and social support (none)
- Monitor lithium's narrow safety margin and the drugs that raise its level, and watch for lithium-induced hypothyroidism (none)
- Use the CIWA-Ar scale for alcohol withdrawal and recognize alcohol overdose (none)
- Use the least restrictive measure for aggression and treat emergency medication orders as interim steps (none)
- Recognize intimate partner violence and know pregnancy raises the risk of physical abuse (none)
- Recognize opioid use disorder, which can begin with legitimate pain treatment, and its social consequences (none)

### BSNRN

- Apply the socio-ecological model to see a client within nested individual, relationship, community and policy contexts (none)
- Identify the five stages of change -- precontemplation, contemplation, preparation, action and maintenance -- and match the intervention to the stage (none)
- Use ABCs and Maslow's hierarchy to sort many cues into the problems that come first (none)
- Diagnosing, planning and evaluating with the person, not for them (none)
- Managing pain and symptoms as a person experiences them (none)
- Turn assessment data into a prioritized problem list, writing each problem as a NANDA-I diagnosis -- problem-focused, risk, health promotion or syndrome -- with the person's preferences in view (none)
- Set SMART outcomes with a time frame together with the person, and anticipate expected, unexpected and adverse outcomes when planning (none)
- Plan teaching across cognitive, affective and psychomotor domains, and assess readiness to learn first (none)
- Reassess and modify the plan of care when outcomes fall short, and recognize when standard practice needs to change for an individual (none)
- Use the comprehensive geriatric assessment areas -- function, cognition, mood, falls, pain, polypharmacy, nutrition, senses, care preferences -- to individualize care (none)
- Take part in a community health assessment and use the nursing process to form a community diagnosis and plan of care (main: assisted-living-norovirus-outbreak)
- Know the phases of the disaster management cycle and the nurse's role in prevention, preparation, response and recovery (none)
- Recognize intimate partner violence as a population health problem, with higher risk in pregnancy and serious maternal and newborn consequences (none)
- Ethical conduct of research and human subject protection (none)
- Check a study for informed consent, human rights protections and IRB approval in its methods or front and back matter, and treat their absence as a sign it may not have been conducted ethically (none)
- Conflict engagement and resolution within teams (secondary: charge-nurse-short-staffed-shift)
- Use constructive communication to manage conflict, drawing on approaches leaders use to resolve team tension (none)
- Risk management and legal exposure (none)
- Keep electronic health information confidential, accurate and available to those who need it, and spot and respond to a security breach (none)
- Know that telehealth, home monitoring and the EHR are the most impactful recent technologies, and how they can cut cost and widen access (none)
- Know how the law reaches nurses: civil malpractice claims, failure to obtain consent as negligence, and Good Samaritan protection (none)
- Managing the personal cost of clinical work (none)
- Know that nurse managers coordinate care, delegate and support staff's professional development (main: charge-nurse-short-staffed-shift)

### LPNVN

- Data collection versus assessment, and why the distinction is legal, not semantic (none)
- Know how delegation works for the PN: the delegating nurse stays accountable, nursing judgment cannot be delegated, and state law decides whether an LPN/VN may delegate to assistive personnel (none)
- Tell assignment from delegation: assignment covers routine care within someone's scope or basic training, delegation hands over a specific task beyond their usual role after competence is checked (none)
- Accept a delegated task only when it is within your scope and competence, ask clarifying questions, and report changes in the client's condition to the delegating nurse (none)
- Contribute to each step of clinical judgment -- recognize and analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes -- and report what needs RN judgment (main: ltc-insulin-hypoglycemia; secondary: ltc-pressure-injury-infection)
- Know that negligence is a breach of the duty of care that harms the client, and that treating without consent may be battery (none)
- Protect health information under HIPAA: log off, guard the screen, keep conversations private and access only the minimum necessary (none)
- Intravenous site monitoring and maintenance within scope (none)
- Teach a client on warfarin to keep vitamin K intake consistent, and know a higher INR means higher bleeding risk (none)
- Infection, sepsis and recognizing early deterioration (main: ltc-pressure-injury-infection)
- Recognize stroke as an emergency: find out when the client was last known well, because treatment is time-sensitive (none)
- Know that hemorrhagic stroke is most often caused by hypertension and that anticoagulants raise the risk (none)
- Recognize rising intracranial pressure: headache, vomiting, falling level of consciousness and Cushing's triad (none)
- Prioritize breathing in pneumonia: monitor vital signs and oxygen saturation, give oxygen as ordered, and report distress (none)
- Protect a client with neutropenia, in whom fever, sore throat or mouth ulcers may be the only signs of infection (none)
- Recognize appendicitis by right lower quadrant or periumbilical pain and report it, since perforation can lead to peritonitis and sepsis (none)
- Recognize thyroid storm -- fever, tachycardia, agitation, confusion, vomiting -- as a medical emergency to report at once (none)
- Postpartum care and hemorrhage recognition (none)
- Anxiety, depression and suicide risk recognition (none)
- Substance use, withdrawal and overdose recognition (none)
- Recognize postpartum hemorrhage as blood loss of 1,000 mL or more within 24 hours, and report heavy bleeding at once (none)
- Recognize suicide risk factors -- a plan, access to means, previous attempts -- and report any suicidal statement immediately (none)
- Recognize mania and psychosis, and the extrapyramidal side effects of first-generation antipsychotics (none)
- Use the CIWA-Ar scale for alcohol withdrawal, and know that alcohol with opioids or sedatives raises overdose risk (none)

### CCRNADULT

- Recognizing early signs of decreased cardiac output before frank shock (none)
- Identifying, interpreting and responding to cardiac rhythms and dysrhythmias (none)
- Acute coronary syndrome: recognition, priorities and post-event care (none)
- Heart failure: acute decompensation, fluid overload and the medications that treat it (none)
- Hypertensive crisis: recognizing end-organ risk and controlled blood-pressure lowering (none)
- Tell first-degree, Mobitz I, Mobitz II and third-degree AV block apart, and anticipate atropine, transcutaneous pacing or a permanent pacemaker for the unstable patient (none)
- Differentiate unstable angina, NSTEMI and STEMI using symptoms, 12-lead ECG changes and serial troponin results (none)
- Prioritize early acute coronary syndrome care: aspirin, nitroglycerin with blood-pressure precautions, oxygen to target, telemetry, and rapid reperfusion for STEMI (none)
- Recognize cardiogenic shock -- hypotension, pulmonary congestion and poor perfusion despite tachycardia -- and anticipate inotropes, vasopressors and treatment of the cause such as revascularization (none)
- Explain intra-aortic balloon pump counterpulsation and monitor for bleeding, limb ischemia and device complications (none)
- Recognize cardiac tamponade from hypotension, pulsus paradoxus and signs of obstructive shock, support the patient with fluids and vasoactive drugs as temporizing measures, and avoid positive-pressure ventilation where possible until drainage (none)
- Recognize acute aortic dissection from sudden severe pain and blood-pressure or pulse differences, and prioritize analgesia, arterial-line monitoring and controlled heart-rate and blood-pressure lowering before surgery (none)
- Tell a hypertensive emergency (blood pressure above 180/120 mm Hg with acute organ damage) from severe hypertension without organ damage, and in an emergency lower blood pressure gradually with titrated IV agents under continuous monitoring, because an abrupt fall can injure the organs it is meant to protect (none)
- Recognize infective endocarditis and its complications, including acute valve failure and embolic stroke (none)
- Treat acute aortic dissection as the exception to generic gradual blood-pressure lowering: begin urgent anti-impulse therapy with analgesia, arterial-line monitoring and IV beta blockade first, targeting systolic pressure below 120 mm Hg or the lowest pressure that preserves end-organ perfusion and a heart rate of 60-80 bpm while urgent imaging and specialist evaluation determine definitive management (none)
- Distinguish definitive management of acute aortic dissection: type A needs emergency surgical consultation and immediate repair, while uncomplicated type B begins with medical therapy and needs intervention when rupture, malperfusion, extension, enlargement, intractable pain or uncontrolled hypertension makes it complicated (none)
- Acute respiratory failure: recognizing it and escalating support in time (none)
- Airway management and rapid sequence intubation (none)
- Apply the diagnostic criteria for ARDS (acute onset, bilateral noncardiac infiltrates, low PaO2/FiO2 ratio) and name its direct and indirect causes (none)
- Manage status asthmaticus: repeated or continuous inhaled short-acting beta-agonist, early systemic corticosteroid, inhaled anticholinergic and IV magnesium, and treat fatigue, a normalizing or rising PaCO2 and altered mentation as signs of impending respiratory failure (none)
- In a COPD exacerbation, titrate oxygen and follow blood gases for CO2 retention, recognizing pursed-lip breathing and tripod positioning as cues of distress (none)
- Recognize acute pulmonary embolism -- sudden dyspnea, pleuritic chest pain, tachycardia, hemoptysis -- and anticipate D-dimer, imaging, anticoagulation and, when massive, thrombolysis (none)
- Recognize tension pneumothorax (hypotension, tracheal deviation, cyanosis) as an emergency that is treated before imaging (none)
- Respond to chest-drain emergencies, including a dislodged tube or an open chest wound, with a three-sided occlusive dressing while help arrives (none)
- Give ventilated patients stress-ulcer and venous-thromboembolism prophylaxis, and monitor corticosteroid-treated patients for hyperglycemia and infection (none)
- Assess and treat pain in intubated patients alongside sedation, using behavioral pain tools when the patient cannot self-report (none)
- Coagulopathies such as ITP, DIC and HIT, and managing bleeding and clotting disorders (none)
- Acute kidney injury (AKI) and acute tubular necrosis (ATN), including identifying nephrotoxic agents (none)
- IV infiltration: recognition and treatment (none)
- Manage a hyperglycemic crisis in order: isotonic fluid resuscitation first, then a continuous IV regular insulin infusion, dextrose added as glucose falls, and overlapping subcutaneous insulin before the infusion stops (secondary: dka-first-six-hours)
- Recognize diabetes insipidus from large volumes of dilute urine and rising sodium, give desmopressin, and watch for hyponatremia once treatment starts (none)
- Recognize adrenal crisis -- hypotension, hyponatremia, hyperkalemia, hypoglycemia -- including after abrupt steroid withdrawal, and give IV fluids and hydrocortisone without delay (none)
- Recognize DIC from its laboratory pattern -- prolonged clotting times, low fibrinogen, falling platelets -- treat the trigger, and give blood components for bleeding (none)
- Recognize heparin-induced thrombocytopenia from a falling platelet count on heparin, stop all heparin, anticipate a non-heparin anticoagulant, and flag the patient against future heparin (none)
- Apply bleeding precautions for severe thrombocytopenia such as ITP, recognizing that serious bleeding risk rises sharply at very low platelet counts (none)
- Grade neutropenia by count, protect the patient from infection, and treat fever in neutropenia as an emergency (none)
- Verify blood products before transfusion, monitor most closely in the first 15 minutes, and stop the transfusion at once if a reaction is suspected (none)
- Differentiate acute hemolytic, febrile non-hemolytic, allergic and anaphylactic reactions, TRALI and TACO by their signs and timing (none)
- In acute upper GI bleeding, place two large-bore IVs, restore volume and blood pressure, protect the airway in massive hematemesis, and read a high BUN-to-creatinine ratio as a clue to an upper source (none)
- Explain how portal hypertension causes varices, ascites and hepatorenal syndrome, and support the patient through variceal bleeding treatment including TIPS (none)
- Manage hepatic encephalopathy with lactulose and rifaximin, maintain nutrition without protein restriction, and recognize cerebral edema risk in severe encephalopathy from acute liver failure (none)
- Diagnose acute pancreatitis from characteristic pain, a marked rise in amylase or lipase, and imaging, and monitor for its local and systemic complications (none)
- Recognize acute mesenteric ischemia in a patient with vascular risk factors and severe abdominal pain, and prepare for bowel rest, decompression, fluids, antibiotics and urgent intervention (none)
- Measure intra-abdominal pressure in at-risk patients because examination cannot detect abdominal compartment syndrome, and recognize its effects on kidneys, lungs and heart (none)
- Classify acute kidney injury as prerenal, intrarenal or postrenal from its cause, and read creatinine and GFR trends as markers of falling kidney function (none)
- Protect kidney function by recognizing nephrotoxic drugs and contrast media and keeping perfusion adequate (none)
- Manage CRRT: understand dose and net fluid removal, and monitor for filter clotting, bleeding, line infection and electrolyte disturbances (none)
- Compartment syndrome: early recognition and management (none)
- Stroke, hemorrhagic and ischemic, and neuroendovascular interventions such as coiling and thrombectomy (main: acute-ischemic-stroke-lvo)
- Anti-social behavior, aggression and violence, and responding to behavioral emergencies with de-escalation and nonviolent crisis intervention (none)
- Recognize acute compartment syndrome from pain out of proportion, pain on passive stretch and a tense compartment, then remove constricting dressings, keep the limb at heart level, support blood pressure and escalate for fasciotomy (none)
- Apply the Monro-Kellie doctrine to explain rising intracranial pressure, recognizing a falling level of consciousness as the earliest sign and Cushing's triad, pupil changes and posturing as late ones (none)
- In ischemic stroke, establish the last-known-well time, score deficits with the NIHSS, and screen for thrombolytic contraindications (secondary: acute-ischemic-stroke-lvo)
- In subarachnoid hemorrhage, recognize thunderclap headache, then monitor for rebleeding, vasospasm, hydrocephalus and seizures after the aneurysm is secured (none)
- Recognize neurogenic shock after spinal cord injury -- hypotension with bradycardia from lost sympathetic tone rather than lost volume -- and anticipate vasopressor support (none)
- Recognize autonomic dysreflexia in injuries at or above T6 (sudden severe hypertension, headache) and look first for a distended bladder or bowel (none)
- Treat a seizure lasting 5 minutes or more as status epilepticus: support the airway, check glucose, give a benzodiazepine first, then escalate (main: status-epilepticus-after-craniotomy)
- Monitor patients on levetiracetam for its adverse effects, including mood change and suicidal ideation (none)
- Recognize bacterial meningitis as an emergency and give antibiotics without delay while monitoring for raised intracranial pressure and septic shock (none)
- Prevent post-intensive care syndrome with the ABCDEF bundle: pain control, paired awakening and breathing trials, light sedation, delirium management, early mobility and family engagement (none)
- Early sepsis identification and sepsis management (main: sepsis-to-septic-shock)
- Managing fluid and electrolyte balance and imbalances (none)
- Thermoregulation, temperature monitoring and regulation devices, and malignant hyperthermia risk (none)
- Toxic ingestion, inhalation and exposure: recognizing and managing toxin and drug exposure (none)
- Pain: assessment and management (none)
- Sedation: indications, monitoring and safe management (none)
- Assessing, evaluating and prioritizing data by the patient's immediate condition and anticipated needs (none)
- Evaluating the patient's response to interventions (none)
- Recognizing emergencies, initiating interventions and seeking assistance (secondary: status-epilepticus-after-craniotomy)
- Managing device alarms by the change in the patient's condition, not the alarm alone (none)
- Explain how sepsis produces vasodilation, capillary leak and rising lactate, and recognize the early signs before hypotension (none)
- Deliver early sepsis care: blood cultures, broad-spectrum antibiotics ideally within the first hour in shock or probable sepsis (after a rapid assessment when sepsis is only possible), source control, crystalloid resuscitation and vasopressors to a mean arterial pressure target (secondary: sepsis-to-septic-shock)
- Treat anaphylactic shock with epinephrine first, on continuous cardiac monitoring (none)
- Monitor ECMO for bleeding (the most common serious complication), clotting, infection and limb ischemia (none)
- Deliver targeted temperature management after cardiac arrest, rewarm slowly, and monitor for seizures and the effects of cooling (none)
- Recognize rhabdomyolysis (muscle pain, weakness, dark urine, high CK) and give early, aggressive IV fluids, watching for kidney injury, hyperkalemia, compartment syndrome and DIC (none)
- Prioritize burn care: airway and inhalation injury first, then circulation, sizing the burn by rule of nines and using a resuscitation formula only as a starting guide (none)
- Manage acetaminophen overdose: establish the time of ingestion, check a level timed to the nomogram, give N-acetylcysteine early, and watch for liver and kidney failure (none)
- Manage opioid toxicity with airway support and naloxone, and keep monitoring because sedation can return after naloxone wears off (none)
- Recognize placental abruption (abrupt, intense abdominal pain, sometimes with dark vaginal bleeding) and severe preeclampsia progressing toward eclampsia or HELLP syndrome (none)
- Moral agency: identifying ethical and clinical concerns and helping resolve them (none)

Sims on objectives the screen does not pass:

- tamponade-after-cabg: Care of the patient after cardiac surgery
- dka-first-six-hours: Diabetic ketoacidosis (DKA)
- bleeding-after-whipple: Trace shock through its compensated, decompensated and irreversible stages, and link vital-sign changes to the body's compensation

### CCRNPEDS

- Recognize and manage congenital cardiac malformations, including cyanotic spells and pre- and post-repair physiology (none)
- Identify and manage cardiac infection and inflammatory disease, cardiomyopathies and heart failure (none)
- Recognize cardiogenic shock and hypertensive crisis, and anticipate their treatment (none)
- Identify, interpret and respond to dysrhythmias and conduction system defects such as prolonged QT and Wolff-Parkinson-White, using a 12-lead ECG where indicated (none)
- Explain why right-to-left shunting in cyanotic defects barely responds to supplemental oxygen, and the risks of chronic hypoxemia such as polycythemia, thrombosis and stroke (none)
- Describe the components and surgical repair of tetralogy of Fallot, and monitor after repair for effusions, bleeding and junctional ectopic tachycardia (none)
- Recognize coarctation of the aorta from weaker leg pulses and lower leg than arm blood pressures, and manage postoperative hypertension (none)
- Recognize heart failure in infants -- poor feeding, sweating with feeds, tachypnea, poor weight gain -- and treat bradycardia, apnea and lethargy as signs of imminent collapse (none)
- Reduce the energy cost of feeding in infants with heart disease: upright position, time-limited feeds, high-calorie feeds and gavage when needed (none)
- Recognize Kawasaki disease, give IVIG and aspirin as ordered, and know that coronary artery aneurysm is the complication treatment aims to prevent (none)
- Recognize thrombosis risk in congenital heart disease and treat sudden loss of a systemic-to-pulmonary shunt as an emergency (none)
- Recognize and manage acute respiratory failure, acute respiratory infection and ARDS (none)
- Recognize acute pulmonary embolus and care for children after thoracic surgery (none)
- Manage artificial airways (endotracheal tube, tracheostomy, LMA) and support rapid sequence intubation (none)
- Recognize respiratory distress in children -- retractions, nasal flaring, grunting, tachypnea, falling saturation -- and the dehydration that often accompanies it (none)
- Manage bronchiolitis with supportive care -- suctioning before feeds, hydration, oxygen only for low saturation that persists, not for labored breathing on its own -- recognizing that albuterol, epinephrine and systemic corticosteroids are not recommended for routine use (none)
- Grade croup severity clinically as mild, moderate, severe or impending respiratory failure, treating obvious stridor while the child is calm as at least moderate disease that needs treatment and closer watching (none)
- Manage pediatric status asthmaticus with frequent or continuous bronchodilator, early systemic corticosteroid and IV magnesium, and recognize fatigue and rising PaCO2 as signs of impending failure (none)
- Support antiviral treatment of influenza and COVID-19 in children, and escalate respiratory support from high-flow to CPAP to intubation as distress worsens (none)
- Recognize and manage anemia, sickle cell crisis, immune deficiencies and myelosuppression (thrombocytopenia, neutropenia) (none)
- Administer blood and blood products, recognize transfusion reactions (TRALI, TACO), and support plasmapheresis, exchange transfusion or leukocyte depletion (none)
- Recognize and manage abdominal compartment syndrome, abdominal trauma, acute GI hemorrhage, peritonitis, and bowel infarction, obstruction or perforation (none)
- Manage malnutrition, malabsorption and inadequate intake, including enteral and parenteral nutrition, enteral tubes, GI drains and intra-abdominal pressure monitoring (none)
- Recognize and manage acute kidney injury, chronic kidney disease, hemolytic uremic syndrome and life-threatening electrolyte imbalances (none)
- Resuscitate a child in DKA with isotonic fluid first, replace the remaining deficit gradually, then start a weight-based continuous insulin infusion without a bolus (secondary: pediatric-dka-cerebral-edema)
- Add dextrose to IV fluids as glucose falls during DKA treatment, and overlap subcutaneous insulin before stopping the infusion (secondary: pediatric-dka-cerebral-edema)
- Monitor potassium and phosphate during DKA treatment, because insulin drives both into cells (secondary: pediatric-dka-cerebral-edema)
- Recognize cerebral edema in DKA -- headache, falling heart rate, rising blood pressure, declining consciousness, new incontinence -- and treat with mannitol or hypertonic saline without waiting for a CT (main: pediatric-dka-cerebral-edema)
- Teach families sick-day rules and the early warning signs of DKA, which is often the first presentation of type 1 diabetes in young children (none)
- Treat sickle cell pain crisis with rapid analgesia, parenteral opioids and PCA when needed, recognizing hand-foot swelling (dactylitis) in young children (none)
- Recognize acute splenic sequestration (sudden enlarging spleen and a sharp hemoglobin fall) and acute chest syndrome as life-threatening sickle cell complications (none)
- Protect children with sickle cell disease from overwhelming infection by encapsulated bacteria, and treat fever as urgent (none)
- Apply bleeding precautions in immune thrombocytopenia, recognizing that very low platelet counts carry the highest risk of serious bleeding (none)
- Treat bilious vomiting in an infant as possible malrotation with volvulus: decompress the stomach, give fluids and antibiotics, and escalate urgently for surgery (none)
- Manage traumatic brain injury, intracranial hemorrhage, stroke and space-occupying lesions using neuroprotective protocols (none)
- Care for children with acute spinal cord injury or after spinal fusion, applying spinal precautions (none)
- Recognize and manage seizure disorders, with seizure precautions (none)
- Respond to behavioral emergencies with de-escalation and nonviolent crisis intervention, and manage restraints when indicated (none)
- Stabilize a child with spinal trauma with spinal immobilization, and monitor for spinal shock, neurogenic shock, respiratory compromise and pressure injury (none)
- Identify sepsis early and late, and manage SIRS, multi-organ dysfunction and shock states (distributive, hypovolemic, obstructive) (none)
- Interpret acid-base and blood gas results and anticipate interventions, including fluid and electrolyte replacement (none)
- Assess pain in a developmentally appropriate way and manage acute and chronic pain with medications and non-pharmacologic measures (none)
- Recognize clinical deterioration, intervene, and seek help; conduct a comprehensive physical and psychosocial assessment and provide family-centered care (none)
- Evaluate diagnostic and laboratory results and anticipate the interventions they point to (none)
- Administer and monitor medications safely, including polypharmacy, sedation and procedural sedation (none)
- Manage monitor alarms by protocol and patient condition, and apply bone-fracture prevention and complementary or non-pharmacologic interventions (none)
- Judge a child's vital signs (heart rate, breathing rate, blood pressure) against norms for age, remembering that hypotension is a late sign of shock in children (secondary: pediatric-septic-shock-fluids)
- Choose a pain tool by developmental stage (NIPS, FLACC, FACES or a numeric scale) and recognize behavioral signs of pain in infants and toddlers (none)
- Manage pediatric septic shock: antibiotics ideally within the first hour, fluid boluses reassessed after each, and epinephrine or norepinephrine (neither preferred first line), which may be started through a peripheral line rather than waiting for central access (main: pediatric-septic-shock-fluids)
- Give fluid boluses to children repeatedly while reassessing perfusion and urine output, and stop at signs of fluid overload (secondary: pediatric-septic-shock-fluids)
- Manage acetaminophen and opioid ingestions with timed levels and N-acetylcysteine, or naloxone with continued monitoring (none)
- Support children on ECMO for respiratory or cardiac failure, monitoring for bleeding and circuit complications (none)
- Advocacy and moral agency: act on behalf of critically ill children, their families and colleagues, and help identify and resolve ethical and clinical concerns, within and outside the clinical setting (none)
- Systems thinking: use knowledge of the care system to secure resources, navigate transitions and transfers, and manage care within and across healthcare and non-healthcare systems (none)

### CCRNNEO

- Recognize and manage heart failure (high output, congestive, secondary) (none)
- Monitor infants receiving NSAIDs or acetaminophen to close the ductus for kidney injury, bleeding, low platelets and NEC (none)
- Recognize heart failure in the newborn -- tachypnea, feeding difficulty, sweating with feeds, hepatomegaly -- and treat bradycardia and apnea as signs of collapse (none)
- Recognize and manage respiratory distress syndrome, transient tachypnea of the newborn and failed respiratory transition (surfactant deficiency, secondary apnea) (none)
- Manage apnea of prematurity and acute respiratory distress or failure (none)
- Recognize pleural space abnormalities (pneumothorax, hemothorax, empyema, effusions), and manage chest tubes and thoracentesis (none)
- Recognize pulmonary hemorrhage and pulmonary hypertension, including PPHN (none)
- Interpret blood gas results and manage respiratory monitoring (SpO2, SvO2, ETCO2) (none)
- Manage airways (endotracheal tube, LMA, tracheostomy) and the medications and monitoring for rapid sequence intubation (none)
- Recognize respiratory distress syndrome from surfactant deficiency -- tachypnea, grunting, flaring, retractions, cyanosis -- and expect it to worsen over the first days before improving (secondary: neonatal-rds-escalating-support)
- Recognize transient tachypnea of the newborn from retained lung fluid, know its risk factors, and support it while sepsis is ruled out (none)
- Manage meconium aspiration with standard resuscitation rather than routine tracheal suctioning, and watch for PPHN, air leak and hypoxic-ischemic encephalopathy (none)
- Recognize esophageal atresia with tracheoesophageal fistula (coughing, choking and cyanosis with feeds, a tube that will not pass), keep the infant NPO, and protect against aspiration (none)
- Recognize and manage disorders of glucose homeostasis (hypo- and hyperglycemia), calcium homeostasis, and glucose, protein and fat metabolism (none)
- Recognize blood cell disorders (anemias, polycythemia, sickle cell disease, leukopenia) and coagulopathies (DIC, thrombocytopenia, hemorrhagic disease of the newborn, factor deficiencies) (none)
- Recognize and manage necrotizing enterocolitis, gastroesophageal reflux and hepatic failure (portal hypertension, biliary atresia, cholestasis), including peritoneal drains (none)
- Manage fluid and electrolytes for neonates with renal problems and support diagnostic procedures such as renal biopsy and ultrasound (none)
- Recognize congenital skin abnormalities (epidermolysis bullosa, skin tags, hemangiomas) and manage infiltration/extravasation and wounds with wound VACs, pressure-reduction surfaces and ostomy devices (none)
- Name the risk factors for neonatal hypoglycemia (infant of a diabetic mother, small or large for gestational age, prematurity, cold stress) and screen at-risk infants, since many have no symptoms (none)
- Recognize neonatal hypoglycemia (jitteriness, poor feeding, lethargy, apnea, seizures), start early feeding, and give IV dextrose when needed (secondary: neonatal-sepsis-hypoglycemia)
- Treat bilious vomiting in a newborn as possible malrotation with volvulus and escalate for urgent surgery (none)
- Manage fluid balance in preterm infants, whose thin skin and radiant warmers increase water loss, using daily weights and diaper weights to detect dehydration or overload (none)
- Recognize extracranial, intracranial and intraventricular hemorrhage and neurologic infection (none)
- Recognize ischemic insult (stroke, periventricular leukomalacia, HIE) and manage therapeutic hypothermia (none)
- Recognize and manage neonatal seizures (none)
- Recognize state dysregulation (stress, pain, agitation) and manage pain and sedation with pharmacologic and non-pharmacologic measures (none)
- Facilitate progressive family involvement and trauma-informed care, and respond to behavioral emergencies with de-escalation and nonviolent crisis intervention (none)
- Recognize that intraventricular hemorrhage in very preterm infants is often silent, support head ultrasound screening, and reduce risk with antenatal steroids and delayed cord clamping (none)
- Monitor head circumference and fontanel after IVH to catch post-hemorrhagic ventricular dilation and hydrocephalus (none)
- Assess hypoxic-ischemic encephalopathy with a Sarnat exam, and start therapeutic hypothermia within the first hours of life when the infant qualifies (none)
- Recognize subtle neonatal seizures (lip smacking, eye deviation, apnea), support EEG confirmation, look for treatable causes such as hypoglycemia, hypocalcemia and infection, and expect phenobarbital as the first-line antiseizure drug (none)
- Assess pain in neonates, including preterm infants who are more sensitive to it, with a validated tool such as NIPS, and treat it during procedures (none)
- Identify and manage early- and late-onset sepsis, multi-organ failure and shock states (hypovolemic, septic, cardiogenic, obstructive) (none)
- Recognize and manage hyperbilirubinemia, hydrops fetalis and the infant of a diabetic mother (none)
- Recognize birth trauma and the effects of life-threatening maternal/fetal complications (eclampsia, HELLP, maternal-fetal transfusion, placental abruption, placenta previa) (none)
- Recognize genetic conditions (metabolic disorders, syndromes such as Turner, Noonan, Beckwith-Wiedemann, Prader-Willi, Angelman and CHARGE, trisomies 13, 18 and 21) and sequences (VACTERL, Pierre Robin), and their impact on postnatal care (none)
- Assess and monitor by gestational age, anticipate evolving deterioration and emergencies, act, and seek help; interpret diagnostic results (none)
- Name maternal, neonatal and treatment-related risk factors for neonatal sepsis, and recognize its subtle signs, including hypothermia rather than fever (main: neonatal-sepsis-hypoglycemia)
- Tell physiologic from pathologic jaundice, treating jaundice in the first 24 hours as pathologic, and know the risk factors for severe hyperbilirubinemia (none)
- Start phototherapy by plotting the hour-specific bilirubin against thresholds set by gestational age and the infant's neurotoxicity risks, and recognize acute bilirubin encephalopathy before it becomes kernicterus (none)
- Recognize the features of trisomies 13 and 18 and support families choosing between comfort care and full intervention (none)
- Recognize fetal alcohol spectrum disorder and arrange early supportive and developmental services (none)
- Support retinopathy of prematurity screening for at-risk infants and keep oxygen saturation within ordered targets, because excess oxygen contributes to ROP (secondary: neonatal-rds-escalating-support)
- Complete newborn screening (blood spot, hearing, critical congenital heart disease) at the right time and follow up abnormal results (none)
- Advocacy and moral agency: act on behalf of critically ill neonates, their families and colleagues, and help identify and resolve ethical and clinical concerns, within and outside the clinical setting (none)
- Systems thinking: use knowledge of the care system to secure resources, navigate transitions and transfers, and manage care within and across healthcare and non-healthcare systems (none)

Sims on objectives the screen does not pass:

- neonatal-rds-escalating-support: Manage non-invasive support (CPAP, NIPPV, high-flow nasal cannula), conventional and high-frequency ventilation, and therapeutic gases, and prevent complications of respiratory support

### NREMTEMR

- Recognize scene hazards and decide whether to enter, wait or withdraw (secondary: thigh-bleed-tourniquet)
- Decide which resources to request early -- a transporting ambulance, ALS, fire, law enforcement, hazmat -- and say why (secondary: unresponsive-adult-cpr-aed)
- Triage multiple patients with a mass-casualty triage system as the first responder on scene (none)
- Recognize an electrical or hazardous-materials hazard and keep yourself and bystanders out of danger until trained responders arrive (none)
- Protect the patient and bystanders at a traffic incident (none)
- Recognize a crime scene and preserve evidence while giving care (none)
- Recognize cardiac arrest and perform high-quality CPR with an AED (main: unresponsive-adult-cpr-aed)
- Recognize suspected opioid overdose, ventilate, and give naloxone within EMR scope (none)
- Assess circulation: pulse, skin signs and major bleeding (none)
- Recognize the early signs of shock (none)
- Identify life threats and decide when the patient needs rapid transport by the arriving EMS crew (none)
- Recognize the signs of stroke with a prehospital stroke scale and note when the patient was last known well (none)
- Recognize when an older adult's fall needs trauma-center evaluation, such as a head strike while taking an anticoagulant (none)
- Recognize heat stroke from altered mental status and hot skin, and begin active cooling (none)
- Recognize a likely diabetic emergency from the history and findings, and report it to the transporting crew (none)
- Apply implied consent for a patient who cannot consent, and recognize when a patient lacks the capacity to refuse (none)

Sims on objectives the screen does not pass:

- thigh-bleed-tourniquet: Control life-threatening external bleeding with direct pressure, a tourniquet or wound packing

### NREMTEMT

- Recognize scene hazards -- traffic, fire, electricity, hazardous materials, violence, unstable structures -- and decide whether the scene is safe to enter (none)
- Decide which additional resources to request early -- ALS, fire, law enforcement, hazmat, air medical -- and justify the request (none)
- Triage multiple patients with a mass-casualty triage system such as SALT or START, giving life-saving interventions first (none)
- Apply the national field triage guideline to choose a destination for an injured patient (none)
- Recognize a hazardous-materials incident, keep a safe distance, and wait for trained responders to make the scene safe (none)
- Protect the patient, bystanders and crew at a traffic incident (none)
- Recognize a crime scene and preserve evidence while giving care (none)
- Recognize inadequate breathing from rate, depth, effort, sounds and skin color, and decide when to ventilate with a bag-valve mask (none)
- Assess circulation: pulse, skin color, temperature and moisture, capillary refill in children, and major bleeding (none)
- Recognize cardiac arrest and begin high-quality CPR with early AED use (none)
- Recognize suspected opioid overdose and support ventilation before giving naloxone (none)
- Recognize shock from its early signs -- rising pulse, delayed capillary refill, anxiety, cool clammy skin -- before blood pressure falls (none)
- Identify the chief complaint and immediate life threats, and decide on rapid treatment, rapid transport or more resources (none)
- Recognize a possible acute coronary syndrome, including atypical presentations, and decide on aspirin, 12-lead acquisition and destination within EMT scope (none)
- Recognize a possible stroke with a validated prehospital stroke scale, fix the last-known-well time, and choose a stroke-capable destination (main: stroke-scale-destination)
- Recognize respiratory distress versus respiratory failure in infants and children using the pediatric assessment triangle (none)
- Assess an injured patient with life-threatening bleeding controlled first, then airway, breathing and circulation (none)
- Recognize altered mental status and check the causes an EMT can find: hypoxia, hypoglycemia, overdose, stroke and head injury (secondary: stroke-scale-destination)
- Perform a rapid full-body trauma assessment for deformities, contusions, abrasions, punctures, burns, tenderness, lacerations and swelling (none)
- Reassess at intervals matched to the patient's stability, compare with the baseline, and change treatment when findings change (none)
- Recognize hypoglycemia on reassessment of a patient with altered mental status and treat it within EMT scope (none)
- Recognize history findings that change urgency or destination, such as anticoagulant use after a fall or pregnancy after an injury (none)
- Manage shock: position, keep warm, give oxygen if needed and transport rapidly (none)
- Apply spinal motion restriction selectively, based on assessment findings rather than mechanism alone (none)
- Administer or assist with medications within EMT scope -- oxygen, oral glucose, aspirin, epinephrine auto-injector, naloxone, inhaled bronchodilator, the patient's own nitroglycerin -- checking the rights of medication administration (secondary: anaphylaxis-epinephrine)
- Assist an uncomplicated delivery and care for the newborn, and recognize complicated deliveries that need rapid transport (none)
- Manage environmental emergencies: active cooling for heat stroke, rewarming for hypothermia, and resuscitation after drowning (none)
- Choose the transport destination -- trauma, stroke, STEMI or pediatric-capable center -- and decide when lights and siren are justified (secondary: stroke-scale-destination)
- Assess decision-making capacity when a patient refuses care, explain the risks, involve medical direction and document the refusal (none)
- Apply consent, confidentiality and the duty to act, and avoid abandonment and negligence (none)
- Protect responder well-being: stress, fatigue, critical incident exposure, and when to seek help (none)

Sims on objectives the screen does not pass:

- anaphylaxis-epinephrine: Treat anaphylaxis with intramuscular epinephrine at the weight-appropriate dose and reassess for a repeat dose

### NREMTAEMT

- Manage asthma and COPD exacerbations with nebulized bronchodilators and CPAP within AEMT scope (none)
- Apply CPAP for respiratory distress and recognize when it is failing (none)
- Manage cardiac arrest at AEMT level: high-quality CPR, AED, supraglottic airway and IV or IO epinephrine (none)
- Manage suspected acute coronary syndrome with aspirin, nitroglycerin and 12-lead acquisition within AEMT scope (none)
- Recognize when a nitrate is contraindicated or risky: hypotension, a marginal blood pressure and recent phosphodiesterase-inhibitor use (none)
- Recognize unstable bradycardia and tachycardia and request paramedic care for pacing or cardioversion (none)
- Recognize heart failure and cardiogenic shock and avoid fluid overload (none)
- Apply the field triage guideline to choose a destination for an injured patient (secondary: hemorrhagic-shock-fluids)
- Titrate IV naloxone to breathing in an opioid overdose (none)
- Recognize a seizure that needs a benzodiazepine and support the patient within AEMT scope until paramedics arrive (none)
- Recognize a stroke and choose the destination by last-known-well time and severity (none)
- Recognize sepsis and start IV fluids early (none)
- Assist with childbirth and manage postpartum bleeding (none)
- Recognize a ruptured ectopic pregnancy and treat the shock (none)
- Manage behavioral emergencies safely (none)
- Apply consent, refusal and capacity in the field (secondary: hypoglycemia-iv-dextrose)
- Analyze cues to choose among competing hypotheses in a patient with altered mental status (secondary: hypoglycemia-iv-dextrose)
- Generate solutions within AEMT scope and decide when a paramedic intercept is needed (none)
- Evaluate the response to a fluid bolus or medication and change the plan (secondary: hypoglycemia-iv-dextrose, hemorrhagic-shock-fluids)
- Apply the clinical judgment steps to a patient with abdominal pain and signs of shock (none)

Sims on objectives the screen does not pass:

- hemorrhagic-shock-fluids: Resuscitate hemorrhagic shock with hemorrhage control and IV fluids to a target blood pressure
- hypoglycemia-iv-dextrose: Treat hypoglycemia in a patient who cannot swallow with IV dextrose or IM glucagon

### NREMTPARAMEDIC

- Manage acute pulmonary edema with CPAP and nitrates, dosing nitroglycerin to blood pressure (none)
- Manage severe bronchospasm with bronchodilators, steroids and magnesium, and recognize impending respiratory failure (none)
- Manage a tracheostomy emergency: obstruction, dislodgement and bleeding (none)
- Assess and manage respiratory distress in infants and children, including croup and bronchiolitis (main: infant-respiratory-failure)
- Manage cardiac arrest with shockable and non-shockable rhythms: defibrillation, epinephrine timing and antiarrhythmics (none)
- Manage symptomatic bradycardia with atropine, vasopressors and transcutaneous pacing (none)
- Manage tachycardia with a pulse: decide stable or unstable, then vagal maneuvers, adenosine, rate control or synchronized cardioversion (none)
- Manage a STEMI: aspirin, nitrates within their limits, analgesia and destination for reperfusion (main: inferior-stemi-cath-alert)
- Decide with medical direction when to terminate resuscitation, and support the family (none)
- Recognize cardiogenic shock and avoid treatments that worsen it (secondary: inferior-stemi-cath-alert)
- Recognize and manage pediatric cardiac arrest and bradycardia with poor perfusion (secondary: infant-respiratory-failure)
- Recognize acute aortic dissection and other non-coronary causes of chest pain (none)
- Recognize traumatic cardiac arrest and treat its reversible causes (none)
- Manage crush injury and the risks of releasing a crushed limb (none)
- Assess and manage the injured pregnant patient and the injured child (none)
- Apply the field triage guideline to choose a destination for an injured patient (none)
- Manage hypoglycemia and hyperglycemic emergencies, including dextrose and glucagon dosing (none)
- Manage suspected stroke: time last known well, stroke scale, glucose and destination (none)
- Recognize sepsis and septic shock and begin fluids early (none)
- Manage childbirth, complicated deliveries and postpartum hemorrhage (none)
- Manage a behavioral emergency and severe agitation safely for patient and crew (none)
- Recognize abdominal emergencies, including ruptured ectopic pregnancy and aneurysm (none)
- Manage environmental emergencies: heat stroke, hypothermia and drowning (none)
- Apply consent, refusal, capacity and advance directives such as POLST in the field (none)
- Recognize and report a medication error, and protect the patient (none)
- Run the first-arriving role at a mass-casualty incident within the incident command system (none)
- Analyze cues to choose among competing hypotheses in an undifferentiated patient (none)
- Generate and prioritize solutions, then take action and evaluate the response for an unstable tachycardia (none)
- Evaluate the response to treatment and change the plan when the patient does not improve (none)

### DPT

- Informed consent as an ongoing conversation about the nature, risks, benefits and alternatives of an intervention, which the patient may refuse or withdraw at any time (none)
- The clinician's duty as a mandated reporter of suspected child abuse, and recognizing physical, psychological, financial and neglect forms of elder abuse (none)
- Assessing growth and development, pain, psychosocial and mental-health aspects within the examination (none)
- Administer and score the Berg Balance Scale (14 tasks scored 0 to 4, maximum 56), and use the total to judge fall risk and the likely need for an assistive device (none)
- Screen older adults for fall risk with the 2025 APTA-Geriatrics measures and cut-offs (TUG over 11 s, 5 times sit-to-stand over 12 s, single-limb stance under 6.5 s, Berg under 50, gait speed under 1.0 m/s) (secondary: stroke-balance-fall-risk)
- Select from the neurologic core outcome set -- Berg Balance Scale, ABC Scale, Functional Gait Assessment, 10 Meter Walk Test, 6-Minute Walk Test and 5 Times Sit-to-Stand -- for adults in neurologic rehabilitation (secondary: stroke-balance-fall-risk)
- Coordination and gait examination: the Romberg test with eyes closed for proprioception versus station with eyes open, and cerebellar ataxia as a cause of abnormal findings (main: dizziness-central-red-flags)
- Measure orthostatic vital signs, recognizing orthostatic hypotension as a fall of at least 20 mm Hg systolic or 10 mm Hg diastolic within 3 minutes of standing (secondary: stroke-balance-fall-risk, parkinson-freezing-session)
- Determining a physical therapy diagnosis that guides management (secondary: dizziness-central-red-flags)
- Monitoring and adjusting the plan of care to optimize health outcomes (secondary: icu-early-mobility, parkinson-freezing-session)
- Managing the delivery of care consistent with the practice environment's policies, including environmental emergencies (none)
- Vestibular rehabilitation: supervised therapy for unilateral and bilateral hypofunction, gaze-stabilization doses from the guideline, and stopping when goals are met, symptoms resolve or progress plateaus (secondary: dizziness-central-red-flags)
- Parkinson disease management: aerobic exercise at moderate to high intensity, balance and gait training, external cueing for freezing, and behavior-change approaches to raise physical activity (main: parkinson-freezing-session)
- Fall-prevention exercise for older adults: a minimum weekly dose of 150 minutes to 3 hours over 6 to 12 months with progressive, challenging balance training, inside a multifactorial program (none)
- Assessing, documenting and minimizing safety risks for patients and providers, including facility safety policies (secondary: parkinson-freezing-session)

Sims on objectives the screen does not pass:

- icu-early-mobility: Selecting and performing interventions for cardiovascular and pulmonary conditions to achieve patient goals
- stroke-balance-fall-risk: Selecting and performing interventions for neurological and musculoskeletal conditions
- tka-gait-dvt-red-flag: Total knee arthroplasty rehabilitation per the 2026 APTA guideline: range-of-motion work instead of continuous passive motion, progressive strengthening, motor function training, and early daily quadriceps NMES

Screened out by hand (recall only, no time, cue or consequence in the task):

- APTA's Code of Ethics for the Physical Therapy Profession (effective 2026-01-01, one code for PTs and PTAs): the ethical principles of autonomy, beneficence, nonmaleficence, justice, veracity and fidelity, and the nine Ethical Commitments -- respect, integrity, accountability, maintaining professional relationships, compassion and trust, responsible business and organizational practices, direction and supervision, professional expertise, and societal responsibility -- with their enforceable Standards of Conduct (administrative or recall; no clinical screen carries it)
- Interpreting statistical evidence: effect sizes, confidence intervals, minimal clinically important difference and study design limits (administrative or recall; no clinical screen carries it)
- Write a plan of care that meets Medicare's minimum contents -- diagnoses, long-term goals, and what services, how much, how often and for how long -- signed and dated by the clinician who set it (administrative or recall; no clinical screen carries it)
- Get the plan certified by a physician or NPP within 30 days of the first treatment, and recertify within certification intervals of 90 calendar days or less (administrative or recall; no clinical screen carries it)
- What a PTA may not do under Medicare -- evaluate or assess, make clinical judgments, or establish the maintenance program -- and that since 2021 the PT may delegate furnishing a maintenance program the PT established to a PTA when clinically appropriate, as for rehabilitative care (administrative or recall; no clinical screen carries it)
- Document progress reports at least every 10 treatment days for Medicare, with objective measures compared over time to show the need for continued skilled care (administrative or recall; no clinical screen carries it)
- Quality improvement foundations: Donabedian's work on evaluating quality of care and the plan-do-study-act cycle for testing changes (administrative or recall; no clinical screen carries it)
- Identifying and reducing patient, clinician and organizational barriers to telerehabilitation, and discussing with the patient whether it is cost-effective for them (administrative or recall; no clinical screen carries it)
- Practice management activities: marketing, public relations, regulatory and legal requirements, risk management, staffing and continuous quality improvement (administrative or recall; no clinical screen carries it)
- OSHA's Bloodborne Pathogens Standard for staff safety: an exposure control plan, staff training, engineering controls and safer work practices, and hepatitis B vaccination for at-risk workers (administrative or recall; no clinical screen carries it)

### PTPREREQ

- Apply the tissue repair sequence (inflammation with its four cardinal signs, then granulation tissue as new vessels grow, then scar or regenerated tissue) to a described wound or sprain (none)
- Calculate pulse pressure and mean arterial pressure from a blood pressure reading, and interpret a narrow pulse pressure as a sign of low stroke volume (main: cycle-test-falling-pressure)

Screened out by hand (recall only, no time, cue or consequence in the task):

- Identify the six synovial joint types (plane, hinge, pivot, condyloid, saddle, ball-and-socket) with an example of each and the motions each allows (recall of structure; nothing changes over time)
- Identify the knee's stabilizing structures (anterior and posterior cruciate ligaments, medial and lateral collateral ligaments, medial and lateral menisci) and the motion each resists (recall of structure; nothing changes over time)
- Interpret a description of motor unit size (a few fibers per neuron in the eye muscles, many in a large postural muscle) and decide which arrangement allows finer control of force (recall of structure; nothing changes over time)
- Sequence the conduction system (SA node, AV node, AV bundle, bundle branches, Purkinje fibers) and match the P wave, QRS complex and T wave to the events they record (recall of structure; nothing changes over time)

### NPTEPT

- Selecting and interpreting orthopedic special tests for a given joint complaint (none)
- Recognizing red flags that require referral rather than continued PT management (none)
- Plan total knee arthroplasty rehab as the 2026 APTA guideline does: passive, active-assisted and active range of motion rather than continuous passive motion, progressive strengthening, and daily quadriceps NMES started early (none)
- Applying standardized neurological outcome measures (balance, gait, coordination) and interpreting results (none)
- Selecting motor-learning and neuroplasticity-based interventions matched to the stage of recovery (none)
- Managing common neurological diagnoses: stroke, spinal cord injury, traumatic brain injury, and peripheral neuropathy (none)
- Recognizing signs of neurological decline or emergency (e.g., cauda equina, increasing ICP) that require immediate referral (none)
- Offer supervised vestibular therapy for unilateral or bilateral peripheral vestibular hypofunction using gaze-stabilization and balance exercise, and do not rely on saccadic or smooth-pursuit drills for gaze stability (none)
- Apply the strong Parkinson disease recommendations: moderate- to high-intensity aerobic exercise, balance training, gait training, and external cueing to reduce freezing of gait (none)
- Use the neurologic core outcome set -- Berg Balance Scale, Activities-specific Balance Confidence Scale, Functional Gait Assessment, 10 Meter Walk Test, 6-Minute Walk Test, 5 Times Sit-to-Stand -- and agree with the patient how results shape the plan (none)
- Interpreting vital signs, ECG basics, and exercise-response patterns to determine exercise safety (none)
- Recognizing signs of cardiopulmonary decompensation that require stopping treatment or emergency response (none)
- Choose airway clearance for mucus-heavy disease such as cystic fibrosis or COPD (postural drainage, percussion, vibration), and after surgery pair incentive spirometry with deep breathing, coughing and early mobilization (none)
- Monitor SpO2 against the right target: 94% to 98% for most patients, but 88% to 92% for those at risk of hypercapnic respiratory failure, where excess oxygen can harm (none)
- Recognizing how a comorbidity in one body system changes precautions or intervention selection for another (none)
- Prioritizing a plan of care when multiple systems present competing demands (none)
- Flag polypharmacy (taking 5 or more medications regularly) in older adults as a risk for falls and frailty, and weigh its effect on physical therapy management (none)
- Recognize chronic pain as pain lasting more than 3 months and manage it with a multimodal plan, since psychological and social dimensions shape it as much as tissue findings (none)
- For breast cancer-related lymphedema, treat early (ISL stage I) swelling with a fitted compression garment, exercise and education first, add CDT if that fails, and use CDT to reduce volume in stages II and III (none)
- Applying fall-risk screening tools and environmental/equipment modifications (none)
- Screen community-dwelling older adults with the fall-risk cut-offs in the 2025 APTA-Geriatrics guideline: TUG over 11 s, 5 times sit-to-stand over 12 s, single-limb stance under 6.5 s, Berg under 50, gait speed under 1.0 m/s (none)
- Prescribe fall-prevention exercise with a minimum weekly dose of 150 minutes to 3 hours, kept up for 6 to 12 months, built around progressive, challenging balance training, with tailored education and a home-hazard assessment for those at high risk (none)
- Recognize signs of physical, sexual or psychological abuse and neglect, including financial exploitation of older adults, and act on the clinician's mandated-reporter duty for suspected child abuse (none)
- Recognizing signs of hypo/hyperglycemia during activity and responding appropriately (none)
- Recognizing GI signs/symptoms that may indicate a condition outside the scope of PT management (none)
- Applying the APTA Code of Ethics and standards of practice to a scenario (none)
- Write a plan of care that meets Medicare's minimum -- diagnoses, long-term goals, and what services, how much, how often and for how long -- with measurable goals tied to functional impairments (none)
- Meet Medicare timing rules: certification of the plan dated within 30 days of first treatment, certification intervals of 90 calendar days or less, and a progress report at least every 10 treatment days (none)
- Interpreting study design, validity, and reliability to judge whether evidence applies to a patient (none)
- Selecting and interpreting standardized outcome measures appropriately (none)
- Interpret a clinical test's likelihood ratios, predictive values, and sensitivity and specificity, knowing that sensitivity and specificity tend to trade off against each other (none)
- Match study design to the question: case-control studies for risk factors, cohort studies following groups by exposure over time, cross-sectional studies with no follow-up, and place each on the hierarchy of evidence (none)

### NPTEPTA

- Recognizing when a patient's response to treatment requires reporting back to the supervising PT (none)
- Report to the supervising PT any new red-flag feature in a patient with back pain, such as signs of cauda equina or cord compression, infection, fracture or malignancy, before continuing treatment (none)
- Implementing balance, gait, and coordination interventions per an established plan of care (none)
- Implement the Parkinson disease interventions in the plan of care -- gait training, balance training and external cueing for freezing of gait -- and report changes in response to the PT (none)
- Carry out the balance and gaze-stabilization exercises a PT prescribes for vestibular hypofunction, in clinic and as a home program, and report symptom changes (none)
- Collect reflex and tone data the plan calls for, recognizing flaccid tone as a lower motor neuron sign and spasticity with hyperreflexia as upper motor neuron signs (none)
- Monitoring vital signs and activity tolerance during a treatment session and responding to abnormal findings (none)
- Implementing cardiac and pulmonary rehabilitation activities within established parameters (none)
- Recognizing signs of cardiopulmonary distress that require stopping treatment and notifying the supervising PT (none)
- Administer the 6-minute walk test by protocol on a 30 m course with a pulse oximeter and Borg scale, and report distance and symptoms to the PT (none)
- Keep pulmonary rehabilitation endurance work in the intensity band the plan sets, often dyspnea of 4 to 6 on the Borg scale or perceived exertion rated 12 to 14, and report readings outside it (none)
- Applying fall-prevention techniques and correct guarding during functional activities (none)
- Deliver the fall-prevention exercise a PT prescribes -- progressive, challenging balance training at a minimum weekly dose of 150 minutes to 3 hours -- and reinforce the tailored education and home-hazard advice (none)
- Recognizing and responding to signs of hypo/hyperglycemia during a treatment session (none)
- Check glucose around exercise in patients with diabetes as the plan directs: give fast-acting carbohydrate if it falls below 100 mg/dL, and tell the PT (none)
- Recognizing how a comorbidity changes precautions during an intervention already underway (none)
- Notice polypharmacy (5 or more regular medications) in an older patient and report it to the PT as a fall and frailty risk (none)
- Know what Medicare does not allow a PTA to do -- evaluate or assess, make clinical judgments, or establish the maintenance program -- that since 2021 the PT may delegate furnishing a maintenance program the PT established to the PTA when clinically appropriate, and work under the supervising PT's direction (none)
- Know that since 2025 Medicare lets a PT in private practice supervise a PTA under general supervision (the PT need not be on site), that state law, other payers or the facility may require closer supervision, and that APTA's Code of Ethics (2026) still has the PTA work under the PT's direction and supervision and tell the PT when the patient's status calls for a change to the plan of care (none)
- Give the Berg Balance Scale's 14 tasks with their standard instructions and 0 to 4 scoring (maximum 56), and report the total to the PT rather than interpreting fall risk independently (none)

### ABPTSCCS

- Education of patients, families and interprofessional staff about activity, risk and self-management (none)
- Teach risk-factor work that runs through every rehab phase: managing medical conditions, nutrition, smoking cessation, stress reduction and psychosocial support (none)
- Apply the ERS/ATS technical standard when interpreting 6-minute walk results: a 30 m change is the smallest difference that counts as clinically meaningful (none)
- History and chart review: cardiac and pulmonary diagnoses, procedures, devices, labs and medications that change the plan (none)
- Screen before a 6-minute walk: acute coronary syndrome in the past 30 days is the one established absolute contraindication; uncontrolled hypertension and resting heart rate over 120 bpm are relative ones (none)
- Screen for deep vein thrombosis risk with Virchow's triad (vessel wall damage, flow stasis, hypercoagulability) and know clinical probability is scored with the Wells system before D-dimer and ultrasound (none)
- Recognizing decompensation and emergencies that require stopping activity or escalating care (none)
- Interpret arterial blood gases against normal pH (7.35-7.45) and PaCO2 (35-45 mm Hg), and decide whether the problem is respiratory or metabolic and whether it is compensated (none)
- Recognize exercise-induced desaturation on a walk test (a fall in SpO2 of more than 4% is clinically significant; desaturation below 80% is the commonest reason to stop) (none)
- Evaluate the patient with a left ventricular assist device, a bridge to transplant or destination therapy, for its main complications: thrombosis, bleeding, driveline infection and right heart failure (none)
- Risk-factor modification and self-management education (none)
- Screen for contraindications to exercise in cardiac rehab: unstable angina, acute decompensated heart failure, complex ventricular arrhythmias, severe pulmonary hypertension, intracavitary thrombus, severe or symptomatic aortic stenosis (none)
- Titrate supplemental oxygen to target saturations: 94% to 98% for most patients, 88% to 92% for those at risk of hypercapnic respiratory failure, such as COPD (none)
- Prevent and treat postoperative atelectasis (usually within 72 hours of general anesthesia) with deep breathing, early walking, incentive spirometry, an acapella device, chest physiotherapy and good pain control (none)
- Protect the femoral insertion site for an intra-aortic balloon pump: don't flex the leg, and know walking isn't possible while a femoral device is in place (none)
- Include airway clearance in cystic fibrosis care, alongside nutrition and infection control, recognizing CFTR modulators now treat the underlying protein defect (none)

### ABPTSECS

- Explain what each nerve conduction measure reflects: SNAP amplitude tracks the number of sensory axons, while CMAP amplitude reflects motor axons, muscle and the neuromuscular junction together (none)
- Screen before testing: avoid studies over open skin infection, burns, recent grafts or casts; defer or limit needle EMG with platelets below 50,000; treat lymphedema as no contraindication to needle EMG, weighing the risk against what the study adds; and avoid testing with external temporary pacemakers (none)
- Lower bleeding risk in needle EMG for patients on anticoagulants or with bleeding tendencies: use the smallest-gauge needle, limit needle insertions, and skip deep muscles that can't be compressed or that lie near large vessels (none)
- Interpreting abnormal findings: axonal versus demyelinating, focal versus diffuse, acute versus chronic (none)
- Recognize demyelinating patterns on nerve conduction studies: prolonged distal latencies, slowed conduction velocity, temporal dispersion and conduction block, with prolonged F-wave and H-reflex latencies (none)
- Recognize myopathic needle EMG: early (rapid) recruitment and polyphasic units, with spontaneous fibrillations, positive sharp waves, complex repetitive discharges or 'dive bomber' myotonic discharges in some disorders (none)

### ABPTSGCS

- Pharmacology in older adults: polypharmacy, fall-risk medications and exercise interactions (none)
- Recognize delirium as an acute, fluctuating disturbance of attention, awareness and cognition, in hyperactive, hypoactive or mixed forms; the quiet hypoactive form is the one most often missed (none)
- Treat polypharmacy (regular use of 5 or more medicines) as a risk factor in older adults, linked to falls, frailty, disability and death (none)
- Recognize the five forms of elder abuse (physical, emotional, sexual, financial, neglect) and who is most at risk: people reliant on carers, living in institutional settings or under financial strain (none)
- Ask every older adult in contact with care, at least yearly, whether they have fallen in the past 12 months and about each fall's circumstances and consequences (opportunistic case-finding) (none)
- Include the caregiver's view as well as the patient's when building a falls-prevention plan for someone with cognitive impairment, which improves adherence and outcomes (none)
- Support structured, person-centered medication review and deprescribing of fall-risk-increasing drugs as a key falls intervention, and check fall history before such drugs are prescribed (none)
- Fall-risk and balance examination with standardized measures and their cut-off scores (none)
- Cognitive, mental-health and delirium screening within the physical therapy examination (none)
- Stratify falls risk with gait speed (below 0.8 m/s flags risk), or the Timed Up and Go (over 15 seconds) as a less consistent alternative (none)
- Class an older adult as high falls risk if a fall came with injury, 2 or more falls in 12 months, frailty, a lie of an hour or more without getting up, or suspected loss of consciousness (none)
- Measure orthostatic hypotension correctly: blood pressure after at least 5 minutes supine, then on standing; a fall of 20 mm Hg systolic or 10 mm Hg diastolic within 3 minutes is diagnostic (none)
- Screen for sarcopenia with the SARC-F (strength, walking help, rising from a chair, stairs, falls; 0 to 10), treating a score of 4 or more as the trigger for fuller assessment (none)
- Include fear of falling (Falls Efficacy Scale or short FES-I), vision, footwear and walking-aid fit in a multifactorial falls assessment (none)
- Recognizing conditions requiring medical referral: sepsis, dehydration, electrolyte imbalance and acute cardiac events (none)
- Class one non-severe fall with no gait or balance problem as low risk (education and exercise), and one with gait or balance problems as intermediate risk (strength and balance exercise) (none)
- Treat all older adults in care homes and hospitals as high falls risk and offer a standard comprehensive assessment and multidomain interventions (none)
- Fall-prevention and balance intervention programs with evidence-based components (none)
- Dose falls-prevention exercise around balance and functional work (such as sit-to-stand and stepping), three or more times a week, individualized and progressed for at least 12 weeks, adding Tai Chi or progressive resistance training where feasible (none)
- After hip fracture, prescribe individualized progressive exercise for standing up, balance, walking and stairs, begun as an inpatient and continued at home; after stroke, target balance, strength and walking (none)
- Offer people with early to mid-stage Parkinson disease and little or no cognitive impairment an individualized program that includes balance and resistance training (none)
- Selecting and interpreting outcome measures across impairment, activity and participation in older adults (none)

### ABPTSNCS

- Pathophysiology and medical management of stroke, aneurysm and arteriovenous malformation (none)
- Recognize cerebellar dysfunction (ataxia, dysmetria, nystagmus, dysarthria, imbalance and gait disorder) and causes of bilateral involvement such as multiple sclerosis and posterior circulation stroke (none)
- Know relapsing-remitting multiple sclerosis is the first course in about 85% of patients, and that fatigue, spasticity, pain, bladder problems and depression are common symptom targets (none)
- Deliver Parkinson disease care within an integrated care approach, use behavior-change strategies to raise activity, and know telerehabilitation may be used to improve balance (none)
- Recognizing medical instability and emergencies: autonomic dysreflexia, raised intracranial pressure, new neurologic signs (none)
- Use the core outcome set for adults with neurologic conditions: Berg Balance Scale, Functional Gait Assessment, ABC Scale, 10 meter Walk Test, 6-Minute Walk Test, and 5 Times Sit-to-Stand for transfers (none)
- Task-specific training and neuroplasticity-based intervention for stroke and brain injury (none)
- Intervention in progressive conditions: Parkinson disease, multiple sclerosis, ALS and dementia, including fatigue and exercise dosing (none)
- Dose gaze stabilization: at least 3 times a day for 12 minutes total in acute unilateral loss; 3 to 5 times a day for at least 20 minutes for 4 to 6 weeks in chronic loss; 20 to 40 minutes for about 5 to 7 weeks in bilateral loss (none)
- Add static and dynamic balance exercise for at least 20 minutes a day for 4 to 6 weeks in chronic unilateral hypofunction, and stop therapy when goals are met, symptoms resolve, function normalizes or progress plateaus (none)
- Treat BPPV with repositioning maneuvers such as Epley or Semont as first-line care, knowing vestibular suppressant medicines are not effective treatment (none)
- Use external cueing for freezing of gait, plus gait training and task-specific training, in Parkinson disease; consider cycling over treadmill walking for people at high fall risk or with freezing (none)
- Manage autonomic dysreflexia as an emergency: find and remove the trigger, often by irrigating or changing a blocked Foley catheter, and check for bowel impaction, tight clothing or skin injury (none)

### ABPTSOCS

- Classify low back pain by duration (acute under 6 weeks, chronic beyond 12 weeks) and explain why routine imaging is held back: disc degeneration shows up in more than 80% of adults over 50, with or without symptoms (none)
- Clinical reasoning frameworks for orthopedic diagnosis and treatment selection (none)
- Plan knee arthroplasty rehab through shared decision-making, weighing patient preference against out-of-pocket cost, limits on covered visits and transport barriers when choosing setting and format (none)
- Cervical spine (12%): examination including vascular and ligamentous screening, treatment-based classification and intervention (none)
- Screen low back pain for red flags: prior cancer or unexplained weight loss; infection risk such as recent spinal procedures, intravenous drug use, immunosuppression or fever; fracture risk such as trauma, long-term corticosteroids, osteoporosis or age over 70 (none)
- Treat new urinary retention, bowel dysfunction, saddle anesthesia or new bilateral leg weakness as possible cauda equina syndrome, a surgical emergency needing immediate referral (none)
- Recognize cervical radiculopathy: one-sided arm pain in a root distribution, C7 in over half of cases and C6 in about a quarter, a positive Spurling test as one of the most specific signs; most acute cases settle within 8 to 12 weeks (none)
- Screen acute neck pain with headache for vertebral artery dissection, which can follow minor trauma or neck manipulation and progress to posterior-circulation stroke (none)
- Manage lateral ankle sprain: inversion loads the anterior talofibular ligament; high ankle (syndesmotic) sprains carry more morbidity; favor early functional rehab and progressive balance and neuromuscular training over long immobilization (none)
- After knee arthroplasty, start progressive strength training early in the postacute period, add balance and gait retraining, and use NMES for quadriceps activation deficits, except with demand-type pacemakers, active cancer or deep vein thrombosis (none)
- Recognize plantar fasciitis: degeneration at the plantar fascia origin on the medial calcaneal tuberosity, with sharp heel pain worst on the first steps out of bed (none)

### ABPTSONC

- Treat new back pain in anyone with a cancer history as possible metastatic cord compression: back pain is the presenting symptom in 80 to 95%, often constant, worse at night and with coughing or sneezing (none)
- Escalate cord compression signs right away: bilateral leg symptoms, patchy weakness, multi-dermatome sensory loss, urinary retention or incontinence, fecal incontinence and gait change (none)
- Recognize febrile neutropenia (temperature of 38.3 C once or 38 C sustained for an hour, with ANC below 500 or expected to fall below 500 within 48 hours) as an emergency; ANC below 100 is profound (none)
- Know thrombocytopenia starts below 150,000/uL and the mild band (100,000-150,000) is usually symptom-free, while the link between count and bleeding risk is not settled (none)
- Investigate self-reported swelling, heaviness or numbness in anyone at risk of upper-quadrant lymphedema, and use the Norman Questionnaire or Morbidity Screening Tool if a questionnaire helps (none)
- Screen for trismus after head and neck cancer treatment (seen in 38% to 42% of patients), and flag atypical features such as opening under 15 mm, no clicking history or lymphadenopathy for referral (none)
- Integrating oncologic history, treatment phase and comorbidities into a movement-system diagnosis (none)
- Start supervised, individualized progressive resistance training at least 1 month after breast cancer surgery, add aerobic exercise, and monitor tolerance at least weekly at first (none)
- Track lymphedema outcomes by monitoring volume changes during follow-up, using the same measurement method at every time point (none)

### ABPTSPCS

- Leadership, administration and consultation in early intervention, school-based and medical settings (none)
- Legal and policy frameworks: IDEA early intervention and school-based services (none)
- Connect families to early intervention programs, which provide evaluations and link them to services such as service coordination, social work and home visits (none)
- Examination in special settings: neonatal intensive care, pediatric intensive care, burn unit, early intervention and school (none)
- Support early detection of cerebral palsy with standardized tools such as the General Movements Assessment (under 5 months) and the Hammersmith Infant Neurological Exam (2 to 24 months), alongside MRI (none)
- Screen infant hips with the Ortolani and Barlow tests and watch for limited abduction, uneven gluteal folds and leg-length difference; breech position is the biggest risk factor for hip dysplasia (none)
- Suspect slipped capital femoral epiphysis in a pre-teen or teen with hip, thigh or knee pain and a limp, since knee-only pain often delays diagnosis; obesity is the single biggest risk factor (none)
- Recognize Legg-Calve-Perthes disease (avascular necrosis of the femoral head, boys 3 to 5 times more often) by limp, hip, groin or knee pain and lost abduction and internal rotation, staged through necrosis to healing (none)
- Intervention in the NICU and PICU and in early-intervention and school environments (none)
- Know infant hip dysplasia management may include an abduction splint such as the Pavlik harness, set by the orthopedic surgeon, and that screening aims to diagnose before 6 months (none)

### ABPTSPWCS

- Recognize urge incontinence (frequency, urgency, nocturia) from detrusor overactivity or from neurological disease, for example stroke, Parkinson disease or multiple sclerosis (none)
- Treat dyspareunia as a team, with pelvic floor physical therapy alongside education, lubricants, hormone therapy and psychosocial care, using graduated vaginal dilators to assess tolerance (none)
- Prescribe exercise in pregnancy (about 150 minutes a week of moderate activity, checked with the talk test), avoiding the supine position, contact sports, fall-risk sports and altitude changes such as scuba diving (none)
- Stop exercise in pregnancy for warning signs (painful contractions, vaginal bleeding, dyspnea, dizziness, headache, chest or calf pain) and respect absolute contraindications such as placenta previa, preterm labor and preeclampsia (none)
- Assess diastasis recti, treating an inter-rectus distance over 2 cm at the midline as abnormal, and discuss options from conservative exercise programs to surgery (none)

### ABPTSSCS

- Sports science and wellness: periodization, energy systems, recovery and load monitoring (none)
- Explain the female athlete triad as low energy availability (intake that falls short of what training burns, with or without an eating disorder) combined with menstrual disorder and reduced bone mineral density (none)
- Recognize stress fractures as overload injuries, 0.7% to 20% of sports medicine clinic injuries; flag high-risk sites (femoral neck, anterior tibia, tarsal navicular, talus, sesamoids, 5th metatarsal) where non-union risk is high (none)
- Recognize medial tibial stress syndrome as repetitive-loading pain along the tibial border that sits at the early end of a continuum that can progress to tibial stress fracture (none)
- Emergency management and athlete safety: spine-injury management, sudden cardiac arrest, heat illness and the emergency action plan (none)
- Recognize exertional heat stroke (core temperature usually above 40 C with CNS dysfunction such as confusion, ataxia or seizures), cool by ice-water immersion, and track rectal temperature, stopping at 38 to 39 C (none)
- Treat a collapse from commotio cordis as a ventricular fibrillation arrest: reported survival has risen in recent years with better recognition and early treatment (none)
- Manage concussion with relative rest for the first 24 to 48 hours, then a stepwise return to activity with monitoring; no return to play until a medical provider clears the athlete (none)
- After infectious mononucleosis, counsel on splenic rupture risk (splenomegaly in about half) and hold contact sports until at least 4 weeks after symptom onset, once recovery is clinically complete (none)
- After ACL reconstruction, don't use functional knee braces routinely, and know AAOS prefers reconstruction over repair and early surgery when indicated, as cartilage and meniscal damage risk rises within 3 months (none)

### ABPTSWMS

- Pressure injuries: etiology, staging and risk assessment (none)
- Apply the physical therapy diabetic foot ulcer guideline: prescribe exercise that keeps cardiovascular and muscular fitness while minimizing weight bearing, adding an assistive device when it helps balance and unloading (none)
- Assess risk with the Braden scale's six areas (sensory perception, moisture, activity, mobility, nutrition, friction and shear), plus nutrition, hydration, cognition and mobility (none)
- Use toe-brachial index and pedal Doppler waveforms with the ABI when vessels may be calcified, and treat ankle pressure below 50 mm Hg or ABI below 0.5 as a sign of poor healing and higher amputation risk (none)
- Dressing selection matched to wound characteristics and moisture balance (none)
- Use high compression to knee height as the core venous ulcer treatment, drop to 20 mm Hg or less while waiting for vascular testing, and avoid it with arterial occlusion, ABPI under 0.5, heart failure or thrombosis (none)
- Use a silicone foam dressing for a moisture-balanced, non-infected pressure injury, and plan repositioning around the person's risk factors (malnutrition, anemia, age, cognition, sensation) instead of a fixed turning schedule (none)

### NCE

- Apply the ACA Code of Ethics (2014) and the law to a counseling decision, and work through an ethical decision-making model when they conflict (none)
- Use supervision and consultation, and recognize and manage your own impairment through self-care (none)
- Manage boundaries and multiple relationships under the ACA Code of Ethics (main: nce-boundary-dual-relationship)
- Select, administer and interpret screening and outcome instruments, and use them to evaluate counseling effectiveness (none)
- Assess risk of suicide, homicide, self-injury and relationship violence at intake and throughout counseling (none)
- Recognize depression, hopelessness and ruminative thinking and the risk they carry (none)
- Review progress with the client and revise the treatment plan using assessment results (none)
- Establish a therapeutic alliance through trust, safety and empathic responding (none)
- Apply theory-based interventions -- cognitive-behavioral, person-centered, solution-focused and others -- within a treatment plan (none)
- Provide crisis intervention and contain intense feelings (none)
- Develop a collaborative safety plan with a client at risk (none)

Sims on objectives the screen does not pass:

- nce-substance-use-screen: Screen for substance use and match the client to a level of care

### NCMHCE

- Apply the ACA Code of Ethics (2014) and the law to a counseling decision, and work through an ethical decision-making model when they conflict (none)
- Use supervision and consultation, and recognize and manage your own impairment through self-care (none)
- Select, administer and interpret screening and outcome instruments, and use them to evaluate counseling effectiveness (none)
- Conduct an intake and reach a DSM-5-TR diagnosis in a counseling case (main: ncmhce-intake-ptsd-alcohol)
- Assess suicide risk and build a safety plan in a counseling session (main: ncmhce-suicide-safety-plan)
- Recognize depression, hopelessness and ruminative thinking and the risk they carry (none)
- Review progress with the client and revise the treatment plan using assessment results (none)
- Establish a therapeutic alliance through trust, safety and empathic responding (none)
- Apply theory-based interventions -- cognitive-behavioral, person-centered, solution-focused and others -- within a treatment plan (none)
- Provide crisis intervention and contain intense feelings (none)
- Develop a collaborative safety plan with a client at risk (none)

Sims on objectives the screen does not pass:

- ncmhce-trauma-treatment-plan: Build a trauma-informed treatment plan with the client

### EPPP

- Recognize the effects of substances of abuse and of alternative or complementary agents, including intoxication, withdrawal and interaction risks (none)
- Explain twin, adoption and family designs and heritability, and what genetic findings can and cannot say about a disorder or an individual (none)
- Compare theories of intelligence -- general ability, hierarchical and multiple-factor models, triarchic and multiple-intelligences views -- and how each shapes assessment (none)
- Apply classical conditioning: acquisition, extinction, spontaneous recovery, generalization and discrimination (none)
- Identify risk and protective factors -- nutrition, poverty, adverse childhood experiences, social support -- and explain resilience (none)
- Conduct a diagnostic intake using DSM-5-TR criteria (main: diagnostic-intake-mood)
- Assess suicide risk and plan safety in a clinical interview (main: suicide-risk-safety-plan)
- Assess risk of violence toward others, and know what a risk estimate can and cannot predict (none)
- Select commonly used intelligence, achievement, personality, neuropsychological and symptom measures and judge their fit for diverse populations (none)
- Select and adapt assessments for disability, culture and language, including accommodations and working with interpreters (none)
- Evaluate technology in assessment -- computerized and remote administration, scoring software -- for validity, security and cost (none)
- Apply crisis intervention principles to stabilize a client in acute distress and connect them to the right level of care (none)
- Deliver telepsychology appropriately: competence, consent, privacy, emergencies and practice across jurisdictions (none)
- Apply health promotion, risk reduction and resilience approaches, including motivational interviewing and health behavior models (none)
- Choose sampling and data-collection methods and recognize sampling bias (none)
- Interpret statistical power, Type I and II errors, effect size, and clinical versus statistical significance (none)
- Plan a program evaluation: needs assessment, formative and summative evaluation and cost-benefit analysis (none)
- Apply the APA Ethics Code's General Principles and enforceable Standards (2002, amended 2010 and 2016), and know how other codes such as the Canadian code compare (none)
- Apply duty-to-warn and duty-to-protect obligations (main: duty-to-protect-threat)
- Protect confidentiality and privilege and know their limits, including mandated reporting of abuse (none)
- Identify and manage multiple relationships, conflicts of interest and boundary issues (none)
- Maintain competence through continuing professional development, and recognize and respond to impairment (none)
- Identify emerging social, legal, ethical and policy issues that affect practice (none)
- Apply ethical standards to research: consent, deception and debriefing, review boards and data integrity (none)
- Apply ethical standards to supervision and training (none)
- Apply ethical standards to technology-assisted services and social media (none)


## REQ-315 progress (2026-11-16)

Nick approved building every fitting objective, launch courses first, with
bands where another course's sim already teaches it (docs/sims.md 22.28).
The tables above are the REQ-296 counts and were not recomputed; this
section lists what REQ-315 added as a main objective.

- **NCLEXRN** (+8): six bands (supervising delegated care; monitoring for
  bleeding; fluid volume overload during IV therapy; opioid therapy and
  naloxone; oxygen saturation targets; distributive shock) the alcohol
  withdrawal case (CIWA-Ar screening) and the oxytocin tachysystole case
  (fetal heart rate interpretation).
- **NCLEXPN** (+3): two bands (the six clinical judgment steps in the PN
  role; ranking explanations and taking the most urgent to the RN) and the
  head-strike case (rising intracranial pressure).
- **CCRNADULT** (+5): four bands (COPD and CO2 retention; transfusion
  reactions; opioid toxicity; heart failure) and the tension pneumothorax
  case.
- **CNA** (+1): the sundowning case (responding to behavior without
  escalating it; the restraint objective as secondary).
- **NPTEPT** (+5): the five DPT sessions as bands.
- **NCE** (+1), **NCMHCE** (+1): one band each.
- **DPT, PTPREREQ**: nothing new (no fitting objective left that an
  existing PT screen case could carry without new authoring).

Still to build, in the approved order: the rest of the launch courses'
fitting objectives that no sim has as its main objective (fitting minus
main, REQ-296 and REQ-315 together: NCLEX-RN 100 of 111, NCLEX-PN 39 of 44,
CCRN Adult 73 of 81, CNA 4 of 7, NPTE-PT 27 of 32, NCE 9 of 11, NCMHCE 8
of 11, DPT 13 of 15, PTPREREQ 1 of 2; many of these are already secondary
objectives of a sim); nursing specialty and FNP (docs/sims-coverage-nursing-specialty.md,
123 open); the ABPTS courses (none yet); ASWB and the remaining mental
health objectives (docs/sims-coverage-mental-health-wave.md).

## REQ-323 round 2 (2026-11-17)

Launch courses, new main objectives (docs/sims.md 22.32, "Round 2"):
**NCLEXRN** +2 bands (Cushing's triad with a falling level of
consciousness, from the emergency head injury case; assessing whether a
restraint is appropriate, from the med-surg delirium case); **NCLEXPN** +1
case (high potassium reported as a risk of dysrhythmia, in a skilled
nursing facility); **CCRNADULT** +1 case (heparin-induced thrombocytopenia).
**NPTEPTA** +1 case (red flags in back pain reported to the supervising PT,
Musculoskeletal). Counted again from the seeded catalog: NCLEX-RN 97,
NCLEX-PN 38 and CCRN Adult 72 fitting objectives are no sim's main
objective (secondary-only included).

## REQ-325 round 3 (2026-11-17)

Launch courses, new main objectives (docs/sims.md 22.33): **CCRNADULT**
+14 cases (8 in Endocrine, Hematology/Immunology, GI, Renal/GU,
Integumentary; 4 in Musculoskeletal, Neurological, Behavioral/Psychosocial;
2 in Multisystem), **NCLEXRN** +7 cases (Management of Care,
Pharmacological and Parenteral Therapies x3, Physiological Adaptation,
Safety and Infection Prevention, Reduction of Risk Potential), **NCLEXPN**
+3 cases (Coordinated Care, Pharmacological Therapies, Physiological
Adaptation). Counted again from the seeded catalog: CCRN Adult 58,
NCLEX-RN 90 and NCLEX-PN 35 fitting objectives are no sim's main objective
(secondary-only included). The next candidates and the objectives that
don't fit a bedside case are listed in 22.33.
