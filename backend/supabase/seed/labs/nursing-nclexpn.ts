import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { ADA_HYPOGLYCEMIA, CDC_EBP, CDC_HAND_HYGIENE, CDC_TBP, ISMP_ABBREVIATIONS, NCSBN_ANA_DELEGATION, NCSBN_PN_2026 } from "./nursing-sources";

// REQ-148: NCLEX-PN (NCSBN 2026 PN Test Plan, effective April 2026).
//
// Aligned to the PN plan's Client Needs (Coordinated Care, Safety and
// Infection Prevention and Control, Health Promotion and Maintenance,
// Psychosocial Integrity, Basic Care and Comfort, Pharmacological Therapies,
// Reduction of Risk Potential, Physiological Adaptation) and to the NCSBN
// Clinical Judgment Measurement Model the case items are built on. Density
// ("hybrid", DEFAULT_LAB_POLICY): 2/2/1/2/2/2/2/1 = 14 (8 case, 6 build).
//
// SCOPE is the point of this set. The PN collects data (the RN assesses),
// reinforces teaching (the RN plans it), contributes to the plan of care, and
// reports what needs RN or provider judgment. Every rubric that touches an
// unstable client, a new order or a decision asks for the report to the RN;
// none asks the PN to assess, diagnose, plan teaching or titrate. Assignment
// to assistive personnel is framed "where your state allows" (NCSBN/ANA
// delegation guidelines, 2019).
//
// Values quoted come from the sources in nursing-sources.ts, read 2026-11-07:
// hypoglycemia 15 g / recheck in 15 minutes and level thresholds (ADA);
// precautions (CDC transmission-based precautions, enhanced barrier
// precautions, hand hygiene); "U" for units and trailing/leading zeros
// (ISMP 2024). Every number in a calculation is given in the brief and every
// medication is fictional. All labs are needs_expert_review; a nurse educator
// reads each before it is approved (docs/labs.md).

export const NCLEXPN_LABS: SeedLabSet = {
  trackCode: "NCLEXPN",
  sources: [NCSBN_PN_2026, NCSBN_ANA_DELEGATION, CDC_TBP, CDC_EBP, CDC_HAND_HYGIENE, ISMP_ABBREVIATIONS, ADA_HYPOGLYCEMIA],
  labs: [
    // ---- Coordinated Care (2) ----
    {
      slug: "pn-who-needs-the-rn-now",
      objective: "Recognising the client whose condition requires immediate RN or provider involvement",
      kind: "case",
      title: "Four clients, one RN down the hall",
      brief:
        "You are the LPN on a medical unit, working with an assistive personnel (AP) under the charge RN. Your four fictional clients at 08:00: (1) a client with pneumonia, day 3, who at 06:00 had SpO2 95% on 2 L/min nasal cannula, respiratory rate 18 and was alert -- the AP now reports SpO2 89% and that the client 'seems muddled'; (2) a client with type 2 diabetes asking for breakfast, fingerstick glucose 142 mg/dL; (3) a client after a knee arthroscopy yesterday reporting pain 4/10, due for an oral analgesic at 09:00; (4) a client with heart failure whose weight is unchanged from yesterday and who wants help to the shower.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Report from the AP has just finished. Nothing else has changed.",
          ask: "Which client do you go to first, and which cues tell you that?",
          parts: [
            part(
              "First client",
              "Chooses client 1 (pneumonia) first.",
              "Client 1, the client with pneumonia."
            ),
            part(
              "Cues",
              "Names the change from that client's own earlier data -- SpO2 falling from 95% to 89% on the same oxygen and new confusion -- as signs of worsening oxygenation in an unstable client, and contrasts the other three as stable or expected.",
              "Client 1 has changed from their own 06:00 baseline: SpO2 down from 95 to 89% on the same oxygen and newly confused, which can mean worsening oxygenation. The glucose of 142 is acceptable before breakfast, the knee pain is expected and the analgesic isn't due yet, and the heart-failure client is stable."
            ),
          ],
        },
        {
          text: "At the bedside client 1 is restless, respiratory rate 28 /min, SpO2 88% on 2 L/min, crackles you can hear in the right base, temperature 38.6 degrees C. The nasal cannula is in place and connected.",
          ask: "What do you do in the next few minutes, staying inside the LPN role?",
          parts: [
            part(
              "Immediate actions within scope",
              "Stays with the client or keeps them under observation, raises the head of the bed, checks the oxygen equipment, and collects focused data (vital signs, SpO2, level of consciousness); does not independently change the plan of care beyond a standing order or protocol.",
              "Sit the client upright, check the cannula and flow meter, recheck vital signs and SpO2 and note level of consciousness. I can increase oxygen only if a standing order or protocol says so; otherwise I don't change the treatment myself."
            ),
            part(
              "Report to the RN",
              "Reports to the RN immediately (not at end of round) in an organised format such as SBAR, with the trend from 06:00, and asks the RN to come and assess; the RN then contacts the provider.",
              "Call the charge RN now: 'Client 1 with pneumonia: SpO2 has dropped from 95 to 88% on 2 litres, respiratory rate 28, temperature 38.6, new confusion and right basal crackles. I'm concerned their breathing is getting worse. Can you come and assess now?'"
            ),
          ],
        },
        {
          text: "The RN is at the bedside and phoning the provider. Your other three clients still need care, and the AP is free.",
          ask: "What do you give the AP, and what stays with you?",
          parts: [
            part(
              "Tasks for the AP",
              "Assigns the AP routine, predictable tasks on stable clients within the AP's training (for example helping the heart-failure client to shower, getting the diabetes client's breakfast) with clear directions on what to report and when, where state law and policy allow the LPN to assign.",
              "Where our state and policy allow: AP helps client 4 shower (with a shower chair, reporting any shortness of breath or dizziness straight away) and sets up client 2's breakfast, telling me if they don't eat most of it."
            ),
            part(
              "What stays with the LPN",
              "Keeps medication administration (the 09:00 oral analgesic after collecting pain data) and further data collection on client 1 for the RN; does not hand the AP anything needing nursing judgment.",
              "I give client 3's oral analgesic at 09:00 after checking pain and sedation, recheck client 1's vital signs for the RN, and check client 2's glucose plan. Nothing needing judgment goes to the AP."
            ),
          ],
        },
        {
          text: "Forty minutes later the provider has seen client 1, a chest x-ray is done and oxygen has been increased by order. SpO2 is now 93%, respiratory rate 22 and the client knows where they are.",
          ask: "How do you evaluate and pass this on?",
          parts: [
            part(
              "Evaluate and report",
              "Compares the new data with the earlier values to judge improvement, continues monitoring at the ordered frequency, reports the response to the RN and documents objectively.",
              "SpO2, breathing rate and orientation are all better than at 08:00, so the change is helping. I keep checking at the ordered frequency, tell the RN the new values and document the times, values and who was told."
            ),
          ],
        },
      ],
    },
    {
      slug: "pn-assign-or-not",
      objective: "Assignment and delegation as they apply to the PN, including delegation to assistive personnel",
      kind: "build",
      title: "Sort the task list: AP, LPN or RN",
      brief:
        "You are an LPN in a fictional long-term care facility in a state whose nurse practice act allows LPNs to assign tasks to assistive personnel. The RN supervisor is on site. Tasks for the afternoon: (a) a newly admitted resident needs an admission assessment and care plan; (b) a stable resident needs vital signs at 14:00 and 18:00; (c) a resident with a stage 2 pressure injury needs a dressing change as ordered; (d) a resident who has just returned from hospital needs their discharge teaching about a new anticoagulant started; (e) a resident with dementia needs help with toileting every 2 hours; (f) a stable resident needs a scheduled oral medication; (g) a stable resident needs to be weighed before breakfast.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the assignment plan.",
          parts: [
            part(
              "Tasks for the AP",
              "Assigns the routine, standardised tasks on stable residents to the AP: vital signs on the stable resident (b), toileting help (e) and the weight (g).",
              "AP: vital signs at 14:00 and 18:00 on the stable resident, toileting help every 2 hours for the resident with dementia, and the morning weight."
            ),
            part(
              "Tasks for the LPN",
              "Keeps tasks within LPN scope that need licensed skill: the ordered dressing change (c) and giving the oral medication (f); notes that the LPN can reinforce, but not initiate, the anticoagulant teaching.",
              "Me: the ordered pressure-injury dressing change and the oral medication. I can reinforce the anticoagulant teaching once the RN has done it."
            ),
            part(
              "Tasks for the RN",
              "Sends to the RN the admission assessment and care plan (a) and the initial discharge teaching on the new anticoagulant (d), because initial assessment, care planning and initial teaching need RN judgment.",
              "RN: the admission assessment and care plan, and the first teaching about the new anticoagulant -- both need RN assessment and judgment. I can collect admission data to help."
            ),
            part(
              "Directions and follow-up",
              "Gives the AP specific directions (times, what values or changes to report and how fast) and follows up on completion, recognising the delegating/assigning nurse stays accountable and cannot pass on nursing judgment.",
              "Tell the AP exactly when, and to report at once a blood pressure or pulse outside the ranges I give, a resident who seems different, pain, or a weight change of more than the amount on the care plan. I check back after each task -- I stay accountable for the care I assign."
            ),
          ],
        },
      ],
    },
    // ---- Safety and Infection Prevention and Control (2) ----
    {
      slug: "pn-precautions-four-residents",
      objective: "Transmission-based precautions: airborne, droplet, contact",
      kind: "build",
      title: "Precautions for four residents",
      brief:
        "In a fictional skilled nursing facility you are told about four residents today: (A) suspected measles, fever and a spreading rash; (B) confirmed influenza; (C) MRSA in a leg wound whose drainage can no longer be contained by the dressing; (D) a resident with an indwelling urinary catheter and no known infection. One staff member on the shift is not immune to measles. The facility has one airborne infection isolation room.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each resident, name the precautions, the room and what staff wear.",
          parts: [
            part(
              "Resident A (measles)",
              "Airborne precautions in the airborne infection isolation room with the door closed, fit-tested N95 or higher respirator, resident masked if they must leave; keeps the non-immune staff member out of the room when immune staff are available.",
              "Airborne precautions in the AIIR, door closed; staff wear a fit-tested N95; the resident wears a mask for any necessary trip out; the staff member who isn't immune does not go in -- immune staff care for this resident."
            ),
            part(
              "Resident B (influenza)",
              "Droplet precautions: a single room if possible, staff put on a mask on entering the room, resident masked and following cough etiquette if they leave.",
              "Droplet precautions in a single room; mask on as I enter the room; the resident wears a mask and covers coughs outside the room."
            ),
            part(
              "Resident C (MRSA, uncontained drainage)",
              "Contact precautions (not only enhanced barrier precautions) because drainage cannot be contained: gown and gloves for any contact, dedicated or disinfected equipment, resident stays in the room except for medically necessary care.",
              "Contact precautions because the drainage can't be contained: gown and gloves on entry, a dedicated blood pressure cuff and thermometer, and the resident stays in the room except for necessary care."
            ),
            part(
              "Resident D (indwelling catheter)",
              "Enhanced barrier precautions: gown and gloves for high-contact care such as catheter care, bathing, transfers and toileting; the resident is not confined and can join activities; hand hygiene throughout.",
              "Enhanced barrier precautions: gown and gloves for high-contact care -- catheter care, bathing, dressing, transfers -- but the resident can leave the room and join activities. Hand hygiene before and after, gloves never replace it."
            ),
          ],
        },
      ],
    },
    {
      slug: "pn-fall-found-on-floor",
      objective: "Accident, error and injury prevention",
      kind: "case",
      title: "A resident found on the floor",
      brief:
        "On a fictional rehabilitation unit you find an 84-year-old client sitting on the floor beside the bed at 03:00. The client takes an anticoagulant and was admitted after a hip fracture repair 6 days ago. The bed alarm is switched off.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The client says, 'I'm fine, just help me up.' They are holding the back of their head.",
          ask: "What do you do before anyone moves the client?",
          parts: [
            part(
              "Before moving",
              "Does not lift the client straight away; calls for help (the RN) and stays; collects focused data first: level of consciousness, vital signs, pain, obvious injury including the head and the operated hip, and range of movement as able.",
              "Don't get them up yet. Call for the RN and stay with the client. Check level of consciousness and orientation, vital signs, where it hurts, the back of the head, the operated hip and leg length and rotation, and whether they can move their limbs."
            ),
            part(
              "Why the head matters here",
              "Recognises that a head strike in a client on an anticoagulant raises the risk of intracranial bleeding, so it must be reported to the RN and provider even if the client seems well.",
              "They hit their head and take an anticoagulant, so a bleed inside the skull is possible even if they look fine now. The RN and provider need to know straight away."
            ),
          ],
        },
        {
          text: "The RN assesses the client, finds no fracture signs, and with a lift device the team returns the client to bed. The provider orders neurological checks at set intervals.",
          ask: "What do you do for the rest of the shift?",
          parts: [
            part(
              "Monitoring",
              "Performs the ordered neurological checks (level of consciousness, pupils, movement and sensation, vital signs) at the ordered intervals and reports any change to the RN at once (for example new drowsiness, headache, vomiting, unequal pupils).",
              "Neuro checks at the ordered times -- alertness, orientation, pupils, limb strength, vital signs -- and report any new drowsiness, headache, vomiting or pupil change to the RN immediately."
            ),
            part(
              "Prevent another fall",
              "Puts prevention measures in place: bed low and locked, alarm back on, call light and personal items within reach, non-slip footwear, toileting schedule, lighting; reports the switched-off alarm.",
              "Bed low and locked, alarm turned back on and checked, call light and water within reach, non-slip socks, offer the toilet regularly, a night light on. Note that the alarm was off."
            ),
          ],
        },
        {
          text: "Morning. The charge RN asks you to complete the paperwork.",
          ask: "What do you document, and where?",
          parts: [
            part(
              "Incident report and chart",
              "Completes the facility incident (event) report with objective facts, and documents in the medical record the facts, data collected, who was notified and care given -- without writing in the chart that an incident report was filed.",
              "Incident report: time found, position, what the client said, that the alarm was off, data collected, who was told and when. In the chart: the same objective facts, the neuro checks and notifications. I don't mention the incident report in the chart."
            ),
          ],
        },
      ],
    },
    // ---- Health Promotion and Maintenance (1) ----
    {
      slug: "pn-postpartum-boggy-fundus",
      objective: "Postpartum care, including signs of hemorrhage and infection",
      kind: "case",
      title: "Two hours after a vaginal birth",
      brief:
        "On a fictional postpartum unit you care for a 31-year-old client who gave birth vaginally 2 hours ago to her third baby; labour was long. The RN has asked you to do the postpartum checks on this stable client and report.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The fundus is soft, 2 cm above the umbilicus and pushed to the right. The pad has been soaked in 30 minutes. The client has not voided since the birth.",
          ask: "What do these findings suggest, and what do you do?",
          parts: [
            part(
              "Interpretation",
              "Recognises a boggy, displaced fundus with heavy bleeding as uterine atony, likely made worse by a full bladder, and a risk of postpartum hemorrhage (multiparity and long labour add to the risk).",
              "A soft fundus above the umbilicus and off to the right with a pad soaked in 30 minutes points to a uterus that isn't contracting -- probably made worse by a full bladder -- and the start of a possible hemorrhage."
            ),
            part(
              "Actions",
              "Massages the fundus as trained and per facility policy, helps the client empty her bladder, reports to the RN promptly, and keeps collecting data (vital signs, pad count or weight).",
              "Massage the fundus gently until firm, as I'm trained to and policy allows; help her void; tell the RN straight away; check vital signs and weigh or count pads."
            ),
          ],
        },
        {
          text: "Ten minutes later the fundus is firm at the umbilicus after she voided 450 mL, but bleeding continues: another pad soaked in 15 minutes. Heart rate 112 /min, blood pressure 94/58 mm Hg (it was 118/72). She says she feels faint.",
          ask: "What now?",
          parts: [
            part(
              "Recognise and escalate",
              "Recognises ongoing bleeding with rising heart rate and falling blood pressure as possible hemorrhage and early shock, calls the RN to the bedside immediately (or activates the emergency response per policy), and stays with the client.",
              "Bleeding hasn't stopped and her pulse is up and pressure down -- she may be hemorrhaging and going into shock. I call the RN to come now (or pull the emergency call) and stay with her."
            ),
            part(
              "Supportive care within scope",
              "Lays the client flat or per protocol, keeps the IV access patent if present, prepares equipment the team will need, and keeps measuring blood loss and vital signs for the RN.",
              "Lay her flat, check the IV line is running, get the hemorrhage cart and supplies ready for the team, and keep weighing pads and taking vital signs to report."
            ),
          ],
        },
      ],
    },
    // ---- Psychosocial Integrity (2) ----
    {
      slug: "pn-alcohol-withdrawal",
      objective: "Recognising signs of withdrawal or toxicity and reporting them",
      kind: "case",
      title: "Day two after admission",
      brief:
        "A fictional 52-year-old was admitted 40 hours ago for a leg infection. On admission the client reported drinking 'a few beers' daily. The RN has asked you to collect withdrawal-scale data every 4 hours using the unit's alcohol-withdrawal protocol, which has standing orders for medication based on the score.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At 10:00 the client has a hand tremor, is sweating, says they feel anxious and nauseated, and asks why there are 'bugs on the wall'. Pulse 112 /min, blood pressure 158/96 mm Hg.",
          ask: "What do these findings suggest, and what do you do?",
          parts: [
            part(
              "Interpretation",
              "Recognises signs of alcohol withdrawal (tremor, sweating, anxiety, nausea, tachycardia, hypertension, visual hallucinations) at the expected time after the last drink.",
              "Tremor, sweating, anxiety, nausea, a fast pulse, high blood pressure and seeing bugs that aren't there are signs of alcohol withdrawal, which fits the timing since admission."
            ),
            part(
              "Actions",
              "Scores the withdrawal scale per protocol, gives the standing-order medication only as the protocol directs, reports the findings and score to the RN promptly, and puts safety measures in place (seizure precautions, calm low-stimulus room, close observation).",
              "Score the scale as the protocol says, give medication only as the standing order directs, tell the RN the score and findings now, and set up seizure precautions, a quiet, well-lit room and frequent checks."
            ),
          ],
        },
        {
          text: "At 11:30 the client has a generalised tonic-clonic seizure in bed.",
          ask: "What do you do during and after the seizure?",
          parts: [
            part(
              "During",
              "Stays with the client, calls for help, protects from injury (side rails padded/clear area, nothing in the mouth, no restraint), turns to the side when possible to keep the airway clear, and times the seizure.",
              "Stay, call for help, move objects away and protect the head, put nothing in the mouth and don't hold them down; turn onto their side as soon as I can and time the seizure."
            ),
            part(
              "After",
              "Keeps the client on their side, checks airway, breathing and SpO2, provides oxygen and suction per protocol, collects data on level of consciousness and injuries, reports to the RN and provider, and documents what was observed.",
              "Side-lying, check the airway, breathing and oxygen saturation, suction or oxygen per protocol, check alertness and any injury, report to the RN and provider, and document the time, length and what the seizure looked like."
            ),
          ],
        },
      ],
    },
    {
      slug: "pn-therapeutic-responses",
      objective: "Therapeutic communication technique, and what makes a response non-therapeutic",
      kind: "build",
      title: "Rewrite three responses",
      brief:
        "A fictional 46-year-old client learned this morning that their biopsy shows cancer. The RN and provider have discussed the results and plan. When you bring the client's medication, the client says, 'I keep thinking I'm going to die and leave my kids.' Three staff members have answered similar statements before: (1) 'Don't worry, the doctors here are excellent.' (2) 'Why would you think that? Lots of people survive.' (3) 'Let's get your medicine taken first.'",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name what is wrong with each response and write a therapeutic one.",
          parts: [
            part(
              "Response 1",
              "Identifies false reassurance, which dismisses the feeling and closes the conversation.",
              "False reassurance: it brushes the fear aside and tells the client not to talk about it."
            ),
            part(
              "Response 2",
              "Identifies asking 'why' (which can sound judgmental and put the client on the defensive) and disagreeing/minimising the concern.",
              "Asking 'why' makes the client justify the feeling, and 'lots of people survive' disagrees with and minimises it."
            ),
            part(
              "Response 3",
              "Identifies changing the subject to a task, which signals the nurse doesn't want to hear it.",
              "Changing the subject to the medicine tells the client their fear isn't welcome."
            ),
            part(
              "A therapeutic response",
              "Writes a response that acknowledges the feeling and invites the client to say more (reflection, open-ended question or offering self), and notes that new questions about prognosis or a change in mood are passed to the RN.",
              "'You're frightened about leaving your children. Tell me more about what's going through your mind.' Then sit, listen and allow silence. Questions about the prognosis, or a sign the client feels hopeless, I pass to the RN."
            ),
          ],
        },
      ],
    },
    // ---- Basic Care and Comfort (2) ----
    {
      slug: "pn-pain-data-dementia",
      objective: "Collecting data about pain and reporting it",
      kind: "build",
      title: "Pain data for a resident who can't rate it",
      brief:
        "A fictional 88-year-old resident with advanced dementia in long-term care fell yesterday without a fracture. Today the resident grimaces and moans when turned, pulls their right arm in close, refuses lunch and strikes out during dressing, which is new. The resident cannot use a 0-10 scale. As-needed acetaminophen is ordered; the care plan asks the nurse to report pain that is new or not relieved.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan how you collect and report the pain data.",
          parts: [
            part(
              "Choosing a tool",
              "Uses a behavioural pain scale validated for people with advanced dementia (for example PAINAD) rather than a numeric scale, and uses the same tool each time so scores can be compared.",
              "Use a behavioural tool built for advanced dementia, such as PAINAD -- breathing, vocalisation, facial expression, body language, consolability -- and use the same tool every time."
            ),
            part(
              "Data to collect",
              "Collects the behaviours seen (grimace, moaning, guarding the right arm, striking out, refusing food), when they occur (with movement), vital signs, and looks at the right arm for swelling, bruising or deformity; asks family or regular staff what is usual for the resident.",
              "Note grimacing and moaning on turning, guarding of the right arm, new striking out and refusing lunch; check vital signs; look at the arm for swelling, bruising or deformity; ask the regular aides and family how this compares with usual."
            ),
            part(
              "Act and report",
              "Gives the ordered as-needed analgesic if the parameters are met, uses comfort measures, re-scores after the expected onset time, and reports to the RN that pain is new after a fall and is centred on the right arm, so the RN can assess and contact the provider.",
              "Give the acetaminophen as ordered and reposition gently with the arm supported, re-score after it should have worked, and tell the RN this is new pain after a fall, focused on the right arm -- it may need imaging, which the RN and provider decide."
            ),
          ],
        },
      ],
    },
    {
      slug: "pn-immobility-dvt-pe",
      objective: "Mobility and immobility, and the complications of immobility",
      kind: "case",
      title: "A sore calf on day four",
      brief:
        "A fictional 67-year-old has been on bed rest for 4 days after a pelvic fracture managed without surgery. Orders include sequential compression devices, an anticoagulant injection daily, and help to sit in a chair twice a day.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "During morning care the client mentions their left calf aches. The left calf looks larger than the right, and is warm and tender. The compression device was found off overnight.",
          ask: "What do you think may be happening, and what do you do?",
          parts: [
            part(
              "Hypothesis",
              "Recognises the signs of a possible deep vein thrombosis (unilateral swelling, warmth, tenderness) linked to immobility and the device being off.",
              "One-sided calf swelling, warmth and tenderness after days of bed rest -- with the compression device off -- could be a deep vein thrombosis."
            ),
            part(
              "Actions",
              "Does not massage the leg or apply the compression device to that leg until told, keeps the client in bed, measures and compares calf size if trained, and reports to the RN promptly so the provider can be told.",
              "Don't rub the leg and don't put the compression sleeve back on that leg until the RN or provider says so; keep the client resting; compare both calves; report to the RN now."
            ),
          ],
        },
        {
          text: "While you wait for the RN, the client suddenly becomes short of breath, has sharp chest pain on breathing in, and is anxious. Heart rate 124 /min, respiratory rate 30 /min, SpO2 86% on room air.",
          ask: "What do you do?",
          parts: [
            part(
              "Recognise",
              "Recognises a possible pulmonary embolism (sudden dyspnea, pleuritic chest pain, tachycardia, low SpO2) as a medical emergency.",
              "Sudden breathlessness, sharp chest pain on breathing, a fast pulse and low oxygen after a possible DVT could be a pulmonary embolism -- an emergency."
            ),
            part(
              "Act",
              "Calls for emergency help (rapid response/RN) without leaving, sits the client upright, starts oxygen per protocol or standing order, stays and monitors vital signs, and prepares for the team.",
              "Call the rapid response team and the RN from the bedside, sit the client up, start oxygen as the protocol allows, stay and keep checking vital signs and SpO2, and have the chart and equipment ready."
            ),
          ],
        },
      ],
    },
    // ---- Pharmacological Therapies (2) ----
    {
      slug: "pn-dosage-calculations",
      objective: "Performing dosage calculations accurately",
      kind: "build",
      title: "Four calculations before the medication pass",
      brief:
        "Every medication here is fictional and every number you need is given. (1) Ordered: Medication K 0.25 mg by mouth; available: 0.125 mg tablets. (2) Ordered: Medication L 60 mg intramuscularly; available: 80 mg per 2 mL. (3) Ordered: 250 mL of IV fluid over 2 hours on a pump. (4) Ordered: Medication M 15 mg/kg by mouth for a child weighing 44 lb; available: oral suspension 100 mg per 5 mL (use 1 kg = 2.2 lb).",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate each one and show the setup. Round mL to the tenth.",
          parts: [
            part("Tablets", "Gets 2 tablets (0.25 / 0.125).", "0.25 mg / 0.125 mg = 2 tablets."),
            part("Intramuscular volume", "Gets 1.5 mL (60 / 80 x 2).", "60 mg / 80 mg x 2 mL = 1.5 mL."),
            part("Pump rate", "Gets 125 mL/h (250 / 2).", "250 mL / 2 h = 125 mL/h."),
            part(
              "Weight-based suspension",
              "Converts 44 lb to 20 kg, gets a dose of 300 mg (15 x 20) and a volume of 15 mL (300 / 100 x 5).",
              "44 / 2.2 = 20 kg; 15 mg/kg x 20 kg = 300 mg; 300 mg / 100 mg x 5 mL = 15 mL."
            ),
          ],
        },
      ],
    },
    {
      slug: "pn-medication-rights-case",
      objective: "The rights of medication administration, applied rather than recited",
      kind: "case",
      title: "The medication pass that needed a second look",
      brief:
        "You are the LPN giving 09:00 medications on a fictional medical unit. One of your clients, a 74-year-old with type 2 diabetes and a documented allergy to a fictional antibiotic 'Medication P', has these handwritten-and-transcribed entries to check against the original orders: insulin glargine '10U' at bedtime; 'Medication R 5.0 mg daily'; and a new order for 'Medication P-XR' started overnight.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You are reading the orders before preparing anything.",
          ask: "Which entries do you stop on, and what do you do about each?",
          parts: [
            part(
              "Error-prone notation",
              "Flags '10U' (U can be read as 0 or 4, giving 100 or 104 units) and '5.0 mg' (a trailing zero can be read as 50 mg) as error-prone, and gets them clarified and rewritten as '10 units' and '5 mg' per policy rather than guessing.",
              "'10U' could be read as 100 units -- it must say '10 units'. '5.0 mg' could be read as 50 mg -- it must be '5 mg'. I get both clarified and corrected through the prescriber or pharmacy per policy before giving anything."
            ),
            part(
              "Allergy conflict",
              "Recognises that the new order may be a formulation of the drug the client is allergic to, holds it, and reports to the RN and prescriber before any dose.",
              "Medication P-XR looks like an extended-release form of Medication P, which the client is allergic to. I hold it and tell the RN and the prescriber before any dose is given."
            ),
          ],
        },
        {
          text: "The orders are corrected and the allergy order is cancelled. As you hand over Medication R the client says, 'That's not my usual white pill -- this one's yellow.'",
          ask: "What do you do?",
          parts: [
            part(
              "Respond to the client",
              "Stops and does not give the tablet; rechecks the medication against the order and label (right drug, dose, client by two identifiers), checks with pharmacy if needed, and explains this to the client.",
              "Stop -- don't give it. Recheck the label, dose and order and the client's two identifiers, ask pharmacy whether the manufacturer changed, and tell the client what I find before giving anything."
            ),
          ],
        },
        {
          text: "Pharmacy confirms the yellow tablet was dispensed for the client in the next bed. You had not given it. You notice the same mix-up may have happened yesterday, when another nurse gave the 09:00 dose.",
          ask: "What do you do about yesterday?",
          parts: [
            part(
              "Report and protect",
              "Reports the near miss and the possible error from yesterday to the RN/charge nurse promptly so the client can be assessed and the provider informed, completes an incident report per policy, and does not cover it up or confront the colleague instead of reporting.",
              "Tell the charge RN now so the client can be assessed and the provider informed about a possible wrong dose yesterday, and file an incident report about both the near miss and the possible error. Reporting honestly is what lets harm be caught."
            ),
          ],
        },
      ],
    },
    // ---- Reduction of Risk Potential (2) ----
    {
      slug: "pn-hypoglycemia-case",
      objective: "Signs of hypoglycemia and hyperglycemia",
      kind: "case",
      title: "Shaky before lunch",
      brief:
        "A fictional 63-year-old with type 2 diabetes received rapid-acting insulin with breakfast at 08:00 but ate only a few bites. The unit's hypoglycemia protocol (a standing order) tells the nurse how to treat a low glucose in a client who can swallow, and who to call.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At 10:30 the client is shaky, sweaty, pale and irritable. Fingerstick glucose is 58 mg/dL. The client is alert and can swallow.",
          ask: "What does the glucose mean, and what do you do?",
          parts: [
            part(
              "Interpretation",
              "Identifies hypoglycemia (below 70 mg/dL; 58 is level 1, at or above 54) with typical adrenergic signs, linked to insulin with little food eaten.",
              "58 mg/dL is hypoglycemia -- below 70 (level 1, since it's not below 54) -- with shakiness and sweating, from insulin given with almost no breakfast."
            ),
            part(
              "Treatment",
              "Gives about 15 g of fast-acting carbohydrate by mouth per protocol (for example glucose tablets or juice in the amount the protocol lists), rechecks glucose in 15 minutes, repeats if still low, and reports to the RN.",
              "Give 15 g of fast carbohydrate, such as glucose tablets or the amount of juice the protocol lists, recheck the glucose in 15 minutes and repeat if it is still low; tell the RN."
            ),
          ],
        },
        {
          text: "Fifteen minutes later glucose is 64 mg/dL. You repeat the treatment. At 11:10 the client is drowsy, does not answer clearly and cannot safely swallow.",
          ask: "What do you do now?",
          parts: [
            part(
              "Escalate",
              "Does not give anything by mouth; calls for the RN/rapid response immediately; per protocol prepares for glucagon or IV dextrose given by the person whose scope and orders allow; positions on the side and protects the airway.",
              "Nothing by mouth now -- they could choke. Call the RN and rapid response at once, turn the client onto their side, and get the glucagon or IV dextrose the protocol names ready for whoever the order and scope allow to give it."
            ),
          ],
        },
        {
          text: "After treatment the client is alert, glucose 132 mg/dL, and lunch has arrived.",
          ask: "How do you follow up?",
          parts: [
            part(
              "Follow-up",
              "Encourages the meal or a snack with carbohydrate and protein to prevent a recurrence, rechecks glucose per protocol, documents the episode and treatment, reports to the RN so the insulin plan can be reviewed, and reinforces teaching on not skipping meals after rapid-acting insulin.",
              "Make sure they eat lunch, recheck the glucose as the protocol says, document the lows and treatment, and tell the RN so the provider can review the insulin. Reinforce that rapid-acting insulin needs a meal soon after."
            ),
          ],
        },
      ],
    },
    {
      slug: "pn-trends-against-baseline",
      objective: "Comparing current data against the client's baseline",
      kind: "build",
      title: "Which number is a change?",
      brief:
        "You are collecting 16:00 vital signs on three fictional clients and comparing them with their own baselines from the record. (A) Client with COPD: baseline SpO2 88-90% on 1 L/min, respiratory rate 20; now SpO2 89%, respiratory rate 20, talking in full sentences. (B) Client with chronic hypertension on medication: baseline blood pressure 148/88 mm Hg; now 96/60 mm Hg, pulse 104 /min, client dizzy on standing; was started on a new diuretic yesterday. (C) Client 1 day after surgery: baseline temperature 37.0 degrees C, urine output 50-60 mL/h; now temperature 37.4 degrees C, urine output 15 mL/h for the last 2 hours.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Interpret each set against the baseline and write what you report.",
          parts: [
            part(
              "Client A",
              "Recognises the values as at the client's own baseline (stable), so no urgent report, while continuing routine monitoring.",
              "SpO2 89% and respiratory rate 20 are this client's usual with COPD, and they are speaking in full sentences -- stable, keep monitoring."
            ),
            part(
              "Client B",
              "Recognises a large fall from baseline blood pressure with tachycardia and dizziness after a new diuretic as possible hypotension from fluid loss, a fall risk, and a change to report promptly; keeps the client safe (sit or lie down, help with mobility).",
              "A drop from 148/88 to 96/60 with a pulse of 104 and dizziness, a day after starting a diuretic, may be fluid loss or a drug effect -- a real change. Keep the client in bed or seated with help to stand, and report it now."
            ),
            part(
              "Client C",
              "Recognises urine output well below the client's baseline (and below an expected minimum) after surgery as a change to report promptly (possible fluid deficit, retention or kidney problem), and checks for a full bladder and catheter kinks if present; notes the small temperature rise to report but not as the main concern.",
              "15 mL/h for 2 hours is far below this client's 50-60 mL/h after surgery -- report it now. I'll check for a full bladder or a kinked catheter first. The temperature of 37.4 is a small rise worth mentioning."
            ),
            part(
              "Report",
              "Reports clients B and C to the RN promptly in a structured way (for example SBAR) with the baseline and current values, and documents all three.",
              "To the RN: 'Client B: BP 96/60 from a baseline of 148/88, pulse 104, dizzy on standing, new diuretic yesterday. Client C: urine output 15 mL/h for 2 hours against a usual 50-60, no catheter kink, bladder not distended, temperature 37.4.' Then document all three."
            ),
          ],
        },
      ],
    },
    // ---- Physiological Adaptation (1) ----
    {
      slug: "pn-anaphylaxis-first-dose",
      objective: "Medical emergencies and the PN's immediate response",
      kind: "case",
      title: "Ten minutes after the first dose",
      brief:
        "A fictional 38-year-old received the first dose of a new oral antibiotic ('Medication S') at 14:00 for cellulitis. No allergies were known. The unit has an anaphylaxis protocol with standing orders.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At 14:10 the client says their throat feels tight. You see hives on the chest and neck, the lips are swelling, and you hear wheezing. Blood pressure 88/50 mm Hg, pulse 128 /min.",
          ask: "What is happening, and what do you do first?",
          parts: [
            part(
              "Recognise",
              "Recognises anaphylaxis (skin signs plus airway swelling, wheeze and hypotension soon after a new drug) as a life-threatening emergency.",
              "Hives, lip swelling, a tight throat, wheeze and low blood pressure minutes after a new drug is anaphylaxis -- life threatening."
            ),
            part(
              "First actions",
              "Calls for emergency help (rapid response) and stays; follows the anaphylaxis protocol, in which intramuscular epinephrine is the first drug, given by the nurse the protocol and scope allow; positions the client (lying with legs raised, or sitting if breathing is easier), starts oxygen per protocol.",
              "Shout for help and call rapid response; stay with the client. Under the protocol, epinephrine intramuscularly is the first drug -- get it given now by whoever the protocol and scope allow. Lay the client flat with legs up unless sitting helps the breathing, and start oxygen."
            ),
          ],
        },
        {
          text: "The team has arrived and treatment is under way. Twenty minutes later the client's breathing has eased and blood pressure is 112/70 mm Hg.",
          ask: "What do you do next?",
          parts: [
            part(
              "Afterwards",
              "Keeps monitoring for a recurrence (biphasic reaction) and reports any change, records the allergy in the record and on the client's allergy band per policy, documents the events, and reports the reaction through the facility's adverse-drug-event process.",
              "Keep checking vital signs and breathing -- the reaction can come back -- and report any change. Add Medication S to the allergy list and band, document what happened and when, and file the adverse drug event report."
            ),
          ],
        },
      ],
    },
  ],
};
