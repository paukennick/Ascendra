import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { ACOG_PB222, CDC_HAND_HYGIENE, ISMP_ABBREVIATIONS, ISMP_HIGH_ALERT, NCSBN_ANA_DELEGATION, NCSBN_PN_2026, SSC_2021 } from "./nursing-sources";

// REQ-148: Practical Nursing (LPN/LVN) program course.
//
// The course is a program curriculum, not an exam blueprint: its unit
// weights are Ascendra's own study-emphasis judgment (seed/tracks/nursing.ts),
// and the outcome it prepares for is the NCLEX-PN, so the NCSBN 2026 PN Test
// Plan is the outline these labs are aligned to. Density ("hybrid"): 2 per
// unit = 12 (7 case, 5 build). The scenarios do not repeat the NCLEX-PN set.
//
// SCOPE: data collection rather than assessment, care within the RN's plan,
// reinforcing (not initiating) teaching, and reporting to the RN. Where scope
// varies by state (IV therapy, assigning to assistive personnel), the rubric
// says "where your state and facility allow".
//
// Values quoted come from nursing-sources.ts, read 2026-11-07: ISMP "U" for
// units and high-alert status of insulin; ACOG Practice Bulletin 222 for the
// 140/90 mm Hg threshold in pregnancy; Surviving Sepsis Campaign 2021 for
// antimicrobials within an hour (the PN's part is the specimen and the
// report, not the order). Every calculation gives its numbers and uses a
// fictional drug. All needs_expert_review (docs/labs.md).

export const LPNVN_LABS: SeedLabSet = {
  trackCode: "LPNVN",
  sources: [NCSBN_PN_2026, NCSBN_ANA_DELEGATION, ISMP_ABBREVIATIONS, ISMP_HIGH_ALERT, ACOG_PB222, SSC_2021, CDC_HAND_HYGIENE],
  labs: [
    // ---- Foundations of practical nursing (2) ----
    {
      slug: "lpn-float-assignment",
      objective: "Accepting, refusing and clarifying an assignment",
      kind: "build",
      title: "Floated to a new unit",
      brief:
        "You are an LPN in a fictional hospital, floated from a medical unit to a step-down cardiac unit for the evening. Your state's nurse practice act and the hospital's policy do not allow LPNs to give IV push medications, titrate continuous IV infusions, or perform admission assessments. The charge RN gives you five clients: (1) a stable client 2 days after a myocardial infarction, oral medications only; (2) a client on a heparin infusion that is titrated every 6 hours by protocol; (3) a new admission arriving in 30 minutes; (4) a stable client awaiting discharge tomorrow; (5) a client with a chest tube in place, whose drainage system you have never managed.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Decide what you accept, what you clarify and how you say so.",
          parts: [
            part(
              "Accept",
              "Accepts the stable clients whose care is within LPN scope and competence (1 and 4), including oral medications, data collection and reinforcing the RN's teaching.",
              "I accept clients 1 and 4: stable, oral medications, data collection, and reinforcing the discharge teaching the RN has done."
            ),
            part(
              "Clarify or decline",
              "Identifies that heparin titration (2) and the admission assessment (3) are outside LPN scope here, so the RN must keep those parts (the LPN can help with data collection); and that chest-tube care (5) is outside current competence, so the LPN asks for orientation/supervision or a different assignment rather than guessing.",
              "Client 2: I can collect data but the heparin titration stays with an RN. Client 3: I can take vital signs and collect admission data, but the RN does the admission assessment. Client 5: I haven't managed a chest-tube drainage system, so I ask for a review with the RN or a different client -- I don't accept care I'm not competent to give."
            ),
            part(
              "How to say it",
              "Raises the concerns with the charge RN promptly and respectfully before starting, says what they can and cannot do and offers alternatives, and uses the chain of command if the concern is not resolved.",
              "Straight away, to the charge RN: 'I'm glad to help. I can take clients 1 and 4 fully and collect data on 2 and 3, but heparin titration and admission assessments aren't in my scope, and I haven't been checked off on chest tubes. Could an RN keep those parts, or could I swap client 5?' If it isn't resolved, I go to the nursing supervisor."
            ),
            part(
              "Record",
              "Documents the care actually given within scope and, if the facility requires, the concern raised and its outcome (for example a staffing or assignment-concern form), not a refusal to care for the clients.",
              "I document the care I give, and if the assignment issue isn't settled I complete the hospital's assignment-concern form -- I don't walk away from the clients."
            ),
          ],
        },
      ],
    },
    {
      slug: "lpn-data-collection-not-assessment",
      objective: "Data collection versus assessment, and why the distinction is legal, not semantic",
      kind: "case",
      title: "Admission day in long-term care",
      brief:
        "In a fictional nursing facility, a 79-year-old resident is admitted from hospital after pneumonia. The RN supervisor asks you to start the admission while she finishes another resident's care: 'Get the data and I'll come and do the assessment.'",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You start the admission paperwork with the resident.",
          ask: "What do you collect, and what do you leave for the RN?",
          parts: [
            part(
              "Data you collect",
              "Collects data: vital signs and SpO2, height and weight, allergies, medication list from the discharge summary for reconciliation by the RN/provider, skin inspection, mobility and fall risk screen per the facility tool, and what the resident and family report.",
              "Vital signs and SpO2, weight and height, allergies, the medication list from the discharge papers, a skin check, how they move and the fall-risk tool, and what the resident and daughter tell me."
            ),
            part(
              "Left for the RN",
              "Leaves the comprehensive admission assessment, the interpretation of the data into nursing problems, and the care plan to the RN, because they require RN judgment and are outside LPN scope.",
              "The admission assessment, deciding what the problems are and writing the care plan are the RN's -- I contribute the data."
            ),
          ],
        },
        {
          text: "Partway through, the resident says their chest 'feels heavy' and they are short of breath. Pulse 118 /min and irregular, blood pressure 98/60 mm Hg, respiratory rate 26, SpO2 89% on room air.",
          ask: "What do you do?",
          parts: [
            part(
              "Focused data and report",
              "Stops the paperwork, stays with the resident, sits them upright, collects focused data (pain description, onset, vital signs, SpO2), applies oxygen if a standing order or protocol allows, and calls the RN to come immediately, using SBAR.",
              "Stop the forms, sit the resident up and stay. Ask about the chest heaviness -- when it started, where, how bad -- and recheck vital signs. Oxygen only if a standing order allows. Call the RN now: 'New resident, chest heaviness and breathlessness, pulse 118 irregular, BP 98/60, SpO2 89% on air. Please come now.'"
            ),
            part(
              "Emergency response",
              "Recognises a possible cardiac or respiratory emergency and activates the facility's emergency response (911/EMS per policy) if the RN directs or the resident deteriorates, checking the resident's code status.",
              "This could be a heart or lung emergency. If the RN says so or the resident gets worse, call 911 per policy, check the code status, and get the transfer paperwork ready."
            ),
          ],
        },
        {
          text: "The RN arrives. Later the RN, very busy, asks you to 'just write up the care plan for the new resident -- you know what they need.'",
          ask: "How do you answer?",
          parts: [
            part(
              "Respond within scope",
              "Explains that care planning from an assessment is an RN responsibility under the nurse practice act, offers to contribute the data and suggestions for the RN to review, and does not author the plan alone.",
              "'I can't write the care plan -- that's an RN responsibility in our state. I can give you all my data and suggest interventions so you can review and sign it.'"
            ),
          ],
        },
      ],
    },
    // ---- Anatomy, physiology and basic pathophysiology (2) ----
    {
      slug: "lpn-hf-exacerbation",
      objective: "How an acute illness differs from an exacerbation of a chronic one",
      kind: "case",
      title: "Heart failure, a bad week",
      brief:
        "A fictional 72-year-old with long-standing heart failure lives in assisted living and sees you at a clinic where you work under the RN and provider. The provider's standing order for this client says: report a weight gain of more than 1 kg in a day or 2 kg in a week, new shortness of breath, or swelling above the ankles.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The client's usual weight is 78 kg. Today it is 80.5 kg; three days ago it was 78.2 kg. They sleep on three pillows now instead of one, and their ankles and lower legs are swollen. They had ham and canned soup over the weekend.",
          ask: "What do you make of this, and what do you do?",
          parts: [
            part(
              "Interpretation",
              "Recognises an exacerbation of chronic heart failure (fluid retention: 2.3 kg gain in 3 days, orthopnea, edema) rather than a new illness, with a likely trigger (high-sodium food), and that it meets the order's reporting criteria.",
              "This is the chronic heart failure getting worse -- fluid building up: 2.3 kg in 3 days, needing more pillows to breathe, swollen legs -- probably triggered by salty food. It meets the provider's report criteria."
            ),
            part(
              "Action",
              "Collects focused data (vital signs, SpO2, lung sounds as trained, edema grade, medication adherence) and reports to the RN/provider the same day with the numbers.",
              "Check vital signs, SpO2, listen to the lungs if I'm trained to, grade the edema, ask about missed medications, and report today to the RN and provider with the weights and findings."
            ),
          ],
        },
        {
          text: "The provider increases the diuretic and asks for daily weights reported by phone. The client asks you why the weight matters so much.",
          ask: "What do you reinforce?",
          parts: [
            part(
              "Reinforce teaching",
              "Reinforces the teaching already given: weigh every morning at the same time, after voiding, same scale and clothing, write it down, report gains as the provider set; limit sodium (examples of hidden salt); take the diuretic as ordered; report breathlessness or needing more pillows.",
              "Weigh every morning after using the toilet, same scale and similar clothes, and write it down -- a quick gain is usually fluid, not fat. Call if it rises by the amounts the provider gave you, or if you're more breathless. Watch for hidden salt in canned soup and ham, and take the water pill as prescribed."
            ),
          ],
        },
      ],
    },
    {
      slug: "lpn-fluid-deficit",
      objective: "Fluid, electrolyte and acid-base balance in plain terms",
      kind: "build",
      title: "Two days of vomiting and diarrhoea",
      brief:
        "A fictional 81-year-old resident in long-term care has had vomiting and watery diarrhoea for two days. Data: pulse 106 /min, blood pressure 102/64 mm Hg lying and 86/54 mm Hg sitting with dizziness; mouth dry; urine output small and dark; weight down 1.8 kg since last week; new confusion. Lab results the provider ordered: potassium 3.1 mEq/L (lab reference 3.5-5.0), sodium 146 mEq/L (reference 135-145).",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Interpret the data and say what you do.",
          parts: [
            part(
              "Fluid status",
              "Identifies fluid volume deficit (dehydration) from GI losses, citing tachycardia, low and orthostatic blood pressure, dry mouth, dark low urine, weight loss and confusion.",
              "Fluid volume deficit: fast pulse, blood pressure dropping when sitting up, dry mouth, small dark urine, a 1.8 kg weight loss and new confusion -- from two days of vomiting and diarrhoea."
            ),
            part(
              "Electrolytes",
              "Identifies low potassium (3.1, below 3.5) from GI losses, with risks of weakness and heart rhythm problems, and the high sodium as consistent with water loss.",
              "Potassium 3.1 is low (lost in diarrhoea and vomit) and can cause weakness and heart rhythm problems; sodium 146 is a little high, which fits losing more water than salt."
            ),
            part(
              "Safety and data",
              "Puts fall precautions in place (orthostatic dizziness), monitors intake and output and weight, offers fluids as ordered, uses contact precautions and soap-and-water hand hygiene per facility policy for suspected infectious diarrhoea.",
              "Fall precautions -- help to sit and stand slowly; strict intake and output and daily weight; offer the fluids the plan allows; contact precautions and soap-and-water hand washing until an infectious cause is ruled out."
            ),
            part(
              "Report",
              "Reports the data and abnormal labs to the RN/provider promptly for orders (replacement, fluids), rather than treating independently.",
              "Report to the RN and provider now with the vital signs, orthostatic drop, confusion and the potassium and sodium so they can order fluids and potassium replacement."
            ),
          ],
        },
      ],
    },
    // ---- Fundamental nursing skills (2) ----
    {
      slug: "lpn-sterile-field-breaches",
      objective: "Sterile technique and maintaining a sterile field",
      kind: "build",
      title: "Spot the breaks in sterile technique",
      brief:
        "A fictional student LPN is inserting an indwelling urinary catheter, ordered by the provider, for a client who cannot void after surgery, with you supervising. You observe: (1) she opens the kit and places it on the client's bed below the level of her waist; (2) after putting on sterile gloves she pushes her hair back from her face; (3) she sets the lubricated catheter down on the sterile drape, then reaches across the open field for the antiseptic swabs; (4) the catheter tip touches the client's thigh on the first attempt and she continues to insert it.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each observation, name the break and the correction, and say why it matters.",
          parts: [
            part("Observation 1", "Identifies that sterile items must stay above waist level and in view; the field should be on a clean surface at waist height (for example the overbed table).", "Sterile items below the waist are considered contaminated. Set the kit on the overbed table at waist height, in view."),
            part("Observation 2", "Identifies that touching hair contaminates the sterile gloves, so the gloves must be changed before continuing.", "Touching her hair contaminated the gloves -- she must stop and put on new sterile gloves."),
            part("Observation 3", "Identifies that reaching across a sterile field contaminates it; items should be arranged so no reaching across is needed.", "Reaching over the field contaminates it; arrange the swabs and catheter so she never reaches across."),
            part(
              "Observation 4 and why",
              "Identifies that a catheter that touches a non-sterile surface is contaminated and must be replaced with a new sterile one, and explains that breaks in technique raise the risk of catheter-associated urinary tract infection.",
              "A catheter that touched the thigh is no longer sterile: stop and use a new sterile catheter. Each break raises the chance of a catheter-associated urinary tract infection, which is common and often preventable."
            ),
          ],
        },
      ],
    },
    {
      slug: "lpn-iv-site-over-days",
      objective: "Intravenous site monitoring and maintenance within scope",
      kind: "case",
      title: "One IV site, three days",
      brief:
        "A fictional 58-year-old has a peripheral IV in the left forearm with a continuous infusion of 0.9% sodium chloride at 75 mL/h on a pump. In your state and facility, LPNs may monitor peripheral IV sites, stop an infusion and remove a peripheral catheter; the RN starts new lines.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Day 1, 14:00: the pump alarms 'occlusion downstream'. The skin around the site is swollen, cool, pale and tight, and the client says it feels tight.",
          ask: "What is this, and what do you do?",
          parts: [
            part(
              "Recognise",
              "Identifies infiltration (IV fluid in the surrounding tissue: swelling, coolness, pallor, tightness).",
              "Infiltration -- the fluid is going into the tissue around the vein."
            ),
            part(
              "Act",
              "Stops the infusion, removes the catheter per policy, elevates the arm, applies a compress per policy, measures and documents the area, does not flush or restart in that site, and reports to the RN so a new line can be placed.",
              "Stop the infusion, take the catheter out per policy, raise the arm, apply the compress the policy calls for, measure and document the swelling, and tell the RN so a new IV can be started elsewhere."
            ),
          ],
        },
        {
          text: "Day 3: the RN started a new line in the right forearm. Now the vein above the site is red, warm and tender, with a hard cord about 4 cm long. Temperature 37.2 degrees C.",
          ask: "What is it now, and what do you do?",
          parts: [
            part(
              "Recognise",
              "Identifies phlebitis (inflammation of the vein: redness, warmth, tenderness, a palpable cord along the vein).",
              "Phlebitis -- the vein itself is inflamed: red, warm, tender with a hard cord."
            ),
            part(
              "Act and prevent",
              "Stops the infusion and removes the catheter per policy, applies a compress per policy, grades/documents using the facility's phlebitis scale, reports to the RN, and watches for signs of infection (pus, fever); notes prevention (securing the catheter, aseptic access, hand hygiene before handling).",
              "Stop it and remove the catheter per policy, apply a compress, grade it with the unit's phlebitis scale and document, report to the RN, and watch for pus or fever. Prevention: secure the catheter well and clean hands and the hub every time the line is accessed."
            ),
          ],
        },
      ],
    },
    // ---- Pharmacology and medication administration (2) ----
    {
      slug: "lpn-pediatric-safe-dose",
      objective: "Calculating pediatric and weight-based doses",
      kind: "build",
      title: "Is this pediatric dose safe?",
      brief:
        "In a fictional pediatric clinic you are checking an order before giving it. All numbers are given and the drug is fictional. The child weighs 39.6 lb (use 1 kg = 2.2 lb). Ordered: Medication T 250 mg by mouth every 8 hours. Drug reference: safe range 20-40 mg/kg/day divided every 8 hours. Available: oral suspension 125 mg per 5 mL.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Work it through and decide what you do.",
          parts: [
            part("Weight", "Converts 39.6 lb to 18 kg.", "39.6 / 2.2 = 18 kg."),
            part(
              "Safe range",
              "Calculates 360-720 mg/day (20 x 18 to 40 x 18), which is 120-240 mg per dose every 8 hours.",
              "20 x 18 = 360 mg/day and 40 x 18 = 720 mg/day; divided by 3 doses: 120-240 mg per dose."
            ),
            part(
              "Is the order safe?",
              "Recognises that 250 mg per dose (750 mg/day) is above the safe range, so the dose is not given and the order is clarified with the prescriber (through the RN per policy).",
              "250 mg per dose (750 mg a day) is above the 240 mg per dose maximum. I don't give it; I hold it and get the order clarified with the prescriber, telling the RN."
            ),
            part(
              "Volume if corrected",
              "Shows the setup for the volume of a corrected dose within the safe range (dose / 125 mg x 5 mL, for example 225 mg = 9 mL or 200 mg = 8 mL) and measures it with an oral syringe.",
              "If the prescriber changes it to, say, 225 mg: 225 / 125 x 5 = 9 mL, measured in an oral syringe -- not a kitchen spoon or a cup."
            ),
          ],
        },
      ],
    },
    {
      slug: "lpn-sliding-scale-insulin",
      objective: "Insulin administration and sliding scale orders",
      kind: "case",
      title: "Lunchtime sliding scale",
      brief:
        "A fictional 66-year-old with type 2 diabetes has this order, written in full: 'Insulin lispro subcutaneously before meals by correction scale: glucose 151-200 mg/dL: 2 units; 201-250: 4 units; 251-300: 6 units; 301-350: 8 units; above 350 or below 70: call provider.' Your facility treats insulin as a high-alert medication and requires an independent double check by a second nurse before any insulin dose.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At 11:45, before lunch, the fingerstick glucose is 268 mg/dL. Lunch trays are arriving.",
          ask: "What dose do you give, and how?",
          parts: [
            part(
              "Dose",
              "Reads 268 in the 251-300 band and gets 6 units.",
              "268 mg/dL falls in 251-300: 6 units of insulin lispro."
            ),
            part(
              "Safe preparation and giving",
              "Uses an insulin syringe or pen, has a second nurse independently check the drug, dose and client per policy (insulin is high-alert), confirms the meal is there because lispro acts quickly, gives subcutaneously rotating sites, and documents writing 'units' in full.",
              "Draw up or dial 6 units with an insulin syringe or pen, have a second nurse check it independently (high-alert drug), make sure the tray is in front of the client since lispro works fast, inject subcutaneously in a rotated site, and document '6 units' -- never 'U'."
            ),
          ],
        },
        {
          text: "Twenty minutes after the dose the client says they feel sick and pushes the tray away, having eaten almost nothing.",
          ask: "What do you do?",
          parts: [
            part(
              "Anticipate and act",
              "Recognises the risk of hypoglycemia when rapid-acting insulin has been given without food, offers an alternative carbohydrate per the plan, monitors for signs of hypoglycemia and rechecks glucose per protocol, and reports to the RN/provider (nausea and not eating after insulin).",
              "With fast insulin on board and no food, a low is likely. Offer something they can manage (juice, crackers) per the plan, watch for shakiness, sweating or confusion, recheck the glucose per protocol, and tell the RN so the provider knows about the nausea and missed meal."
            ),
          ],
        },
        {
          text: "At supper the transcribed MAR entry reads 'lispro per scale -- 4U if 201-250'. The glucose is 215 mg/dL.",
          ask: "What do you notice before giving?",
          parts: [
            part(
              "Error-prone notation",
              "Recognises '4U' as error-prone (U can be read as 0 or 4: 40 or 44 units), checks the dose against the original order (4 units), gives only after the double check, and reports the transcription so it is corrected to 'units'.",
              "'4U' could be read as 40 units. Check the original order (4 units for 201-250), give 4 units after the second-nurse check, and report the MAR entry so it's rewritten as '4 units'."
            ),
          ],
        },
      ],
    },
    // ---- Medical-surgical nursing across the lifespan (2) ----
    {
      slug: "lpn-early-sepsis",
      objective: "Infection, sepsis and recognising early deterioration",
      kind: "case",
      title: "Is it just a UTI?",
      brief:
        "A fictional 77-year-old in a rehabilitation unit has an indwelling urinary catheter after a hip fracture repair. Yesterday: temperature 37.1 degrees C, pulse 84, respiratory rate 16, blood pressure 132/78 mm Hg, alert and oriented.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At 07:00: temperature 38.7 degrees C, pulse 118, respiratory rate 24, blood pressure 98/58 mm Hg, confused about where they are. Urine in the bag is cloudy and dark, 20 mL in the last hour.",
          ask: "What do you think is going on, and what do you do?",
          parts: [
            part(
              "Recognise",
              "Recognises a possible sepsis picture (fever, tachycardia, fast breathing, low blood pressure, new confusion, low urine output) likely from a urinary source, as an early deterioration and an emergency, not 'just a UTI'.",
              "Fever, fast pulse and breathing, low blood pressure, new confusion and little urine, with a catheter -- this could be sepsis from a urinary infection. That's an emergency."
            ),
            part(
              "Report",
              "Reports to the RN immediately in SBAR form with the change from yesterday, and expects the RN to start the facility's sepsis protocol and call the provider (or rapid response).",
              "Call the RN now: 'Client in room 4 with a catheter: temperature 38.7, pulse 118, respirations 24, BP 98/58 -- yesterday 132/78 -- newly confused, 20 mL dark cloudy urine in an hour. I think this could be sepsis.'"
            ),
          ],
        },
        {
          text: "The provider orders blood cultures, a urine culture from the catheter port, a lactate, IV fluids and an IV antibiotic. The RN tells you the sepsis guideline aims to start antimicrobials within an hour of recognition.",
          ask: "How do you help, staying within your scope?",
          parts: [
            part(
              "Within LPN scope",
              "Collects the urine specimen aseptically from the sampling port (not the bag), helps get specimens and supplies ready so cultures are drawn before the antibiotic without delaying it, keeps vital signs and urine output under close watch, and reports changes; leaves IV antibiotic and fluid administration to whoever state scope and policy allow.",
              "Collect the urine from the catheter's sampling port with clean technique -- never from the bag -- get the culture bottles and supplies ready so cultures go first without holding up the antibiotic, and take vital signs and hourly urine output, reporting changes. The IV antibiotic and fluids go to whoever our state and policy allow."
            ),
            part(
              "Evaluate",
              "Watches whether the response is improving (blood pressure, heart rate, mental status, urine output) and reports worsening at once.",
              "Over the next hours I compare blood pressure, pulse, confusion and urine output with the 07:00 values and tell the RN straight away if any are getting worse."
            ),
          ],
        },
      ],
    },
    {
      slug: "lpn-stroke-at-breakfast",
      objective: "Stroke care and rehabilitation support",
      kind: "case",
      title: "A new droop at breakfast",
      brief:
        "In a fictional long-term care facility, a 70-year-old resident with atrial fibrillation was well at 06:30 when the aide helped them dress. At 07:40 you find the resident at breakfast with a drooping right side of the face, slurred speech and a weak right arm, coffee spilling from their mouth.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The RN is in the building. The resident is awake and frightened.",
          ask: "What do you do in the first minutes?",
          parts: [
            part(
              "Recognise and call",
              "Recognises signs of a possible stroke as a time-critical emergency, calls for the RN and activates emergency services per policy without delay.",
              "Facial droop, slurred speech and arm weakness are stroke signs -- every minute counts. Call the RN and get 911 called per policy now."
            ),
            part(
              "Last known well",
              "Identifies the last-known-well time as 06:30 (when the resident was last seen normal), not 07:40 when found, and passes it on.",
              "Last known well is 06:30, when the aide saw them normal -- not 07:40. I give that time to the RN and paramedics."
            ),
            part(
              "Safety",
              "Stops all food, fluid and oral medications (aspiration risk), checks blood glucose per protocol (low glucose can mimic stroke), positions for airway safety, stays and checks vital signs, and gathers the medication list (including the anticoagulant) for the transfer.",
              "Nothing more by mouth -- they may not swallow safely. Check the glucose per protocol, keep the head up and the airway clear, stay and take vital signs, and get the medication list, including any blood thinner, ready for transfer."
            ),
          ],
        },
        {
          text: "Two weeks later the resident is back from hospital with right-sided weakness. The care plan says thickened liquids as ordered by the speech-language pathologist, and help with eating.",
          ask: "How do you help them eat safely?",
          parts: [
            part(
              "Safe eating",
              "Follows the swallow plan: sits the resident fully upright, gives the ordered texture and thickened liquids, small bites placed on the stronger (left) side, checks for food pocketed on the weak side, allows time, keeps upright afterwards, and reports coughing, a wet voice or chest symptoms.",
              "Sit them fully upright, serve the ordered textures and thickened drinks, put small bites in the left (stronger) side, check the right cheek for pocketed food, go slowly, keep them upright afterwards, and report coughing, a gurgly voice or a fever."
            ),
          ],
        },
      ],
    },
    // ---- Maternal, newborn, pediatric and mental health nursing (2) ----
    {
      slug: "lpn-pregnancy-danger-signs",
      objective: "Danger signs in pregnancy that must be reported",
      kind: "build",
      title: "A phone call at 33 weeks",
      brief:
        "You are an LPN in a fictional obstetric clinic. A 26-year-old client, 33 weeks pregnant with her first baby, comes in without an appointment. She has had a headache for a day that acetaminophen did not help, sees 'flashing spots', and her face and hands have swollen. Blood pressure 154/100 mm Hg; repeated after rest 152/98 mm Hg. At her last visit two weeks ago it was 118/74 mm Hg. She says the baby is moving less than usual today.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Interpret the findings and write what you do and report.",
          parts: [
            part(
              "Blood pressure",
              "Identifies blood pressure of 140/90 mm Hg or higher (new after 20 weeks) as elevated and reportable in pregnancy, and notes that 160 systolic or 110 diastolic would be severe range.",
              "152/98 is above the 140/90 threshold and new since her last visit -- reportable now. It isn't yet in the severe range (160 systolic or 110 diastolic), but the symptoms make it urgent."
            ),
            part(
              "Other danger signs",
              "Names the persistent headache not relieved by medication, visual disturbances, sudden swelling of the face and hands, and decreased fetal movement as danger signs (possible preeclampsia with severe features and fetal compromise).",
              "A headache that won't go with medication, flashing spots, sudden swelling of face and hands, and less fetal movement are all danger signs -- together they suggest preeclampsia and need urgent evaluation."
            ),
            part(
              "Report and safety",
              "Reports to the RN/provider immediately (not at the end of clinic), keeps the client resting with someone checking on her, and prepares for same-day evaluation or transfer to labour and delivery per protocol.",
              "Tell the RN and provider immediately; keep her lying on her side resting with someone nearby; get her ready for same-day assessment or transfer to labour and delivery as the provider directs."
            ),
            part(
              "What not to do",
              "Does not send the client home with reassurance or advise her to 'rest and see', and does not interpret or treat independently.",
              "I don't tell her it's normal swelling or to go home and rest -- that's for the provider to decide after seeing her."
            ),
          ],
        },
      ],
    },
    {
      slug: "lpn-suicide-risk-ltc",
      objective: "Anxiety, depression and suicide risk recognition",
      kind: "case",
      title: "A resident giving things away",
      brief:
        "A fictional 76-year-old widower moved into a nursing facility a month ago after a stroke left him unable to live alone. Staff have noticed he is eating less and staying in his room. Today he gives his watch to a nursing assistant 'because I won't need it'.",
      safetyNote: `${CLINICAL_SAFETY} If this topic affects you personally, please reach out to someone you trust or a local crisis line.`,
      steps: [
        {
          text: "The nursing assistant tells you about the watch.",
          ask: "What do these cues suggest, and what do you do first?",
          parts: [
            part(
              "Cues",
              "Recognises warning signs of depression and possible suicide risk: recent losses (spouse, independence, home), withdrawal, poor intake, and giving away possessions.",
              "Big losses -- his wife, his independence and his home -- plus withdrawing, eating less and giving away his watch with 'I won't need it' are warning signs of depression and possible suicide risk."
            ),
            part(
              "Talk with him",
              "Goes to the resident, uses therapeutic communication, and asks directly whether he is thinking of ending his life (asking does not plant the idea).",
              "Sit with him: 'You gave away your watch and said you won't need it. I'm worried about you. Are you thinking about killing yourself?' Asking directly doesn't put the idea there."
            ),
          ],
        },
        {
          text: "He says yes; he has been thinking of taking all the pills he can find. His roommate's medications are on the bedside table.",
          ask: "What do you do now?",
          parts: [
            part(
              "Keep him safe",
              "Does not leave him alone, removes accessible medications and other means of harm, and has someone stay with him continuously per policy.",
              "Stay with him, or have a staff member stay with him at all times; remove the roommate's medications and anything else he could use to harm himself."
            ),
            part(
              "Escalate and document",
              "Reports immediately to the RN, who follows the facility's suicide-risk protocol and contacts the provider for urgent mental health evaluation; documents his exact words and actions taken.",
              "Tell the RN at once so the suicide-risk protocol starts and the provider arranges urgent mental health evaluation. Document his exact words, what I saw and what was done."
            ),
          ],
        },
      ],
    },
  ],
};
