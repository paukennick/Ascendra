import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-123 pilot: NCLEX-RN (NCSBN 2026 RN Test Plan, effective April 2026).
//
// Aligned to the 2026 test plan's Client Needs categories (Management of
// Care 15-21%, Safety and Infection Prevention and Control 10-16%, Health
// Promotion and Maintenance 6-12%, Psychosocial Integrity 6-12%, Basic Care
// and Comfort 6-12%, Pharmacological and Parenteral Therapies 13-19%,
// Reduction of Risk Potential 9-15%, Physiological Adaptation 11-17%) and to
// the NCSBN Clinical Judgment Measurement Model the exam's case studies are
// built on (recognize cues, analyze cues, prioritize hypotheses, generate
// solutions, take action, evaluate outcomes). The test plan lists handoff of
// care and medication calculations by name.
//   https://www.ncsbn.org/public-files/2026_RN_Test%20Plan_English-F.pdf
// Density ("hybrid"): 2/2/2/1/1/2/2/2 = 14. Unfolding cases follow the CJMM
// order: recognise and prioritise, act, re-assess.
//
// SAFETY: every client is fictional; this is practice for the exam, not
// clinical guidance. Facts are kept to widely taught fundamentals; where
// practice varies by facility (restraint check intervals, oxygen targets),
// the rubric asks for "per protocol/order" rather than one number. All of it
// is needs_expert_review and is not served in production until a nurse
// educator approves it (docs/labs.md).

export const NCLEXRN_LABS: SeedLabSet = {
  trackCode: "NCLEXRN",
  sources: [source("https://www.ncsbn.org/public-files/2026_RN_Test%20Plan_English-F.pdf", "exam_outline", "2026-11-07")],
  labs: [
    {
      slug: "who-first-post-op-bleeding",
      objective: "Unstable versus stable: recognising which client is actually deteriorating",
      kind: "case",
      title: "Start of shift: who do you see first?",
      brief:
        "You are the RN on a surgical unit at the start of a day shift, working with an LPN and an assistive personnel (AP). Your four fictional clients: (1) a client 1 day after hip replacement reporting pain 6/10, due for an as-needed oral analgesic; (2) a client with COPD, SpO2 89% on 2 L/min nasal cannula, which the night nurse says is their usual level, resting comfortably; (3) a client 2 hours after abdominal surgery whose heart rate has risen from 88 to 118 /min and blood pressure fallen from 128/76 to 96/58 mm Hg, and who is restless; (4) a client with type 2 diabetes asking when discharge teaching will start.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Handoff has just finished. All four clients have call lights within reach.",
          ask: "Which client do you assess first, and what in the data drives that choice?",
          parts: [
            part(
              "Priority client",
              "Chooses client 3 (2 hours post-op) first.",
              "Client 3, the client 2 hours after abdominal surgery."
            ),
            part(
              "Cues and hypothesis",
              "Names the trend (rising heart rate, falling blood pressure, new restlessness) as signs of possible hemorrhage/hypovolemic shock in an unstable client, contrasting it with the others being stable or at their baseline.",
              "Tachycardia rising, blood pressure falling and new restlessness two hours after surgery are early signs of bleeding and hypovolemic shock -- an unstable, changing client. The COPD client is at their usual SpO2 and comfortable; pain and teaching can wait briefly."
            ),
          ],
        },
        {
          text: "At the bedside the client is pale, cool and clammy, the abdominal dressing is saturated with bright red blood, and blood pressure is now 88/54 mm Hg.",
          ask: "What do you do now?",
          parts: [
            part(
              "Immediate actions",
              "Stays with the client and calls for help (rapid response team/surgeon) without leaving; reinforces the dressing and applies pressure as appropriate; maintains/ensures IV access and prepares for fluid or blood replacement per order; monitors vital signs frequently.",
              "Stay with the client and summon help (rapid response, notify the surgeon) using the call system; reinforce the dressing; check the IV is patent and be ready to give fluids or blood as ordered; give oxygen per protocol; recheck vital signs every few minutes."
            ),
            part(
              "Communication",
              "Reports to the surgeon in an organised format (for example SBAR) with the trend in vital signs and the dressing finding.",
              "SBAR to the surgeon: S -- post-op client bleeding, hypotensive; B -- abdominal surgery 2 hours ago; A -- HR 118 and rising, BP 88/54, dressing saturated, cool and clammy, likely hemorrhage; R -- come now, orders for fluids/blood and labs."
            ),
          ],
        },
        {
          text: "The surgeon is on the way. Your other three clients still need care.",
          ask: "What do you assign to the LPN and the AP?",
          parts: [
            part(
              "Delegation to the LPN",
              "Assigns the LPN stable, predictable care within LPN scope, such as giving the scheduled/as-needed oral analgesic to the stable post-hip-replacement client and monitoring the stable COPD client.",
              "LPN: give the as-needed oral analgesic to the hip-replacement client after checking the pain assessment, and check on the COPD client."
            ),
            part(
              "What stays with the RN",
              "Keeps assessment of the unstable client and discharge teaching with the RN; gives the AP only tasks like vital signs on stable clients or helping with mobility/hygiene, with clear direction on what to report.",
              "The unstable client and the diabetes discharge teaching stay with me. AP: routine vital signs on the stable clients and help with hygiene, reporting any value outside the ranges I give them right away."
            ),
          ],
        },
      ],
    },
    {
      slug: "sbar-handoff",
      objective: "Giving and receiving handoff of care on assigned clients",
      kind: "build",
      title: "Give an SBAR handoff",
      brief:
        "At the end of your shift you hand off a fictional client: a 68-year-old admitted yesterday with community-acquired pneumonia. History: heart failure. Today the temperature fell from 38.9 to 37.8 degrees C; oxygen was increased from 2 to 4 L/min nasal cannula at 15:00 to keep SpO2 at 92% or above; IV antibiotics are due at 22:00; intake 1,800 mL and output 900 mL this shift; fine crackles that were in the right base are now heard in both bases. The provider has not been told about the crackles.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the handoff in SBAR form.",
          parts: [
            part("Situation", "States who the client is and the current concern in one or two sentences (increasing oxygen need with new bilateral crackles).", "68-year-old with pneumonia whose oxygen need rose this afternoon (now 4 L/min to keep SpO2 at 92% or above) and who now has crackles in both bases."),
            part("Background", "Gives the relevant history: admission for pneumonia, history of heart failure, IV antibiotics due at 22:00, temperature trend.", "Admitted yesterday with community-acquired pneumonia; history of heart failure; IV antibiotics next due 22:00; fever improving (38.9 to 37.8 degrees C)."),
            part("Assessment", "Interprets the data: positive fluid balance plus new bilateral crackles and higher oxygen need in a client with heart failure suggests fluid overload / worsening respiratory status that needs follow-up.", "Intake exceeds output by 900 mL and crackles have spread to both bases with a rising oxygen need -- I'm concerned about fluid overload with heart failure, not only the pneumonia."),
            part("Recommendation", "Recommends a clear next step: notify the provider now about the crackles and oxygen change (if not done, do it before leaving), continue close respiratory monitoring, and track intake/output and daily weight.", "Notify the provider tonight about the crackles and oxygen need; monitor respiratory status and SpO2 closely; keep strict intake and output and check the daily weight; give the 22:00 antibiotic."),
          ],
        },
      ],
    },
    {
      slug: "match-transmission-precautions",
      objective: "Transmission-based precautions matched to the mode: airborne, droplet, contact",
      kind: "build",
      title: "Match precautions to three admissions",
      brief:
        "Three fictional clients are being admitted at once: (A) a client with suspected pulmonary tuberculosis, cough and night sweats; (B) a client with confirmed seasonal influenza; (C) a client with Clostridioides difficile diarrhea. One airborne infection isolation room and two single rooms are free.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each client, name the precautions, the room and the protective equipment.",
          parts: [
            part("Client A (tuberculosis)", "Airborne precautions: the airborne infection isolation (negative-pressure) room, door closed, and a fit-tested N95 (or higher) respirator for staff; client wears a surgical mask when transported.", "Airborne precautions in the airborne infection isolation room with the door closed; staff wear a fit-tested N95 respirator; the client wears a surgical mask if they must leave the room."),
            part("Client B (influenza)", "Droplet precautions: a single room, staff wear a surgical/procedure mask for close contact, client masks for transport.", "Droplet precautions in a single room; staff wear a surgical mask when close to the client; the client wears a mask outside the room."),
            part("Client C (C. difficile)", "Contact precautions: single room, gown and gloves on entry, dedicated equipment, and hand hygiene with soap and water because alcohol-based rub does not kill spores; sporicidal cleaning.", "Contact precautions in a single room; gown and gloves to enter; dedicated equipment such as a stethoscope; wash hands with soap and water (alcohol rub doesn't remove spores); clean with a sporicidal agent."),
          ],
        },
      ],
    },
    {
      slug: "restraint-alternatives-case",
      objective: "Restraints and safety devices: assessing appropriateness of the type used",
      kind: "case",
      title: "An older client pulling at the IV at night",
      brief:
        "A fictional 82-year-old admitted for a urinary tract infection becomes confused at 02:00, pulling at the IV line and trying to get out of bed. The client's daughter asks you to \"tie them down so they don't fall\".",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The client is alone and has no restraint order.",
          ask: "What do you do before any restraint is considered?",
          parts: [
            part(
              "Assess the cause",
              "Assesses for causes of the new confusion (for example delirium from infection, hypoxia, pain, need to void, low blood glucose, medications) and reports an acute change.",
              "Assess why the client is confused now: oxygen saturation, pain, full bladder, blood glucose, temperature, new medications. Acute confusion may be delirium and is reported to the provider."
            ),
            part(
              "Least restrictive alternatives",
              "Uses least-restrictive measures first: reorientation, bed in low position with alarm, toileting, cover/secure the IV site, a family member or sitter, calm environment, frequent rounding.",
              "Reorient calmly; bed low and locked with a bed alarm; offer toileting; cover the IV with a sleeve; invite the daughter to stay or request a sitter; reduce noise and light; check in often."
            ),
          ],
        },
        {
          text: "Alternatives have failed: the client pulls out the IV and tries to climb over the rail. The provider assesses the client and orders soft wrist restraints for a limited time.",
          ask: "How do you apply and monitor the restraints safely?",
          parts: [
            part(
              "Applying",
              "Uses the least restrictive device ordered, secures ties to the bed frame (not the side rail) with a quick-release knot, and leaves room for circulation (about two fingers).",
              "Apply the soft wrist restraints with room for two fingers, tie them to the bed frame -- not the side rail -- with quick-release knots, and keep the call light within reach."
            ),
            part(
              "Monitoring",
              "Monitors circulation, skin, comfort, hydration, toileting and need for continued use at the intervals in facility policy, releases for range of motion, renews the time-limited order as required (never a standing as-needed order), and documents.",
              "Check circulation, skin, comfort, fluids and toileting at the intervals facility policy sets; release one limb at a time for range of motion; reassess whether the restraint is still needed and remove it as soon as it is not; document each check and the order's time limit."
            ),
          ],
        },
      ],
    },
    {
      slug: "naegele-edd",
      objective: "Calculating the expected delivery date",
      kind: "build",
      title: "Calculate the due date and gestational age",
      brief:
        "A fictional client at her first prenatal visit on 2 June 2026 reports that her last menstrual period began on 10 March 2026. Her cycles are regular, about 28 days.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Work out the dates.",
          parts: [
            part("Expected date of delivery", "Uses Naegele's rule (first day of LMP minus 3 months plus 7 days plus 1 year) to reach 17 December 2026, showing the steps.", "10 March 2026 - 3 months = 10 December 2025; + 7 days = 17 December 2025; + 1 year = 17 December 2026."),
            part("Gestational age today", "Calculates 84 days from 10 March to 2 June = 12 weeks 0 days, and places it in the first trimester.", "10 March to 2 June: 21 + 30 + 31 + 2 = 84 days = 12 weeks 0 days -- first trimester."),
            part("Assumption", "States the rule assumes a regular 28-day cycle with ovulation around day 14, so irregular cycles or uncertain dates need ultrasound dating.", "Naegele's rule assumes a regular 28-day cycle; with irregular cycles or an uncertain LMP, an early ultrasound gives the better estimate."),
          ],
        },
      ],
    },
    {
      slug: "teach-back-glucose-monitoring",
      objective: "Evaluating whether the client understood the health promotion behaviour taught",
      kind: "build",
      title: "Teach and check understanding of glucose self-monitoring",
      brief:
        "A fictional 59-year-old newly diagnosed with type 2 diabetes is going home with a blood glucose meter. Their first language is not the language of the hospital, they wear reading glasses they left at home, and they say they are worried about \"getting it wrong\".",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan the teaching and how you will know it worked.",
          parts: [
            part("Readiness and barriers", "Addresses the barriers before teaching: a professional interpreter (not family), getting the glasses or large-print material, and acknowledging the anxiety.", "Book a professional medical interpreter, ask a relative to bring the glasses (or use large-print, picture-based material), and acknowledge the worry -- anxiety blocks learning."),
            part("Method", "Uses demonstration with return demonstration in small steps, with plain language and written/pictorial instructions in the client's language.", "Demonstrate each step -- wash hands, insert strip, lance the side of the fingertip, apply blood, read and record -- then have the client do it, a few steps at a time."),
            part("Evaluation", "Evaluates with teach-back and return demonstration (the client shows and explains in their own words, including what to do with a high or low reading), and re-teaches gaps.", "Ask the client to check their own glucose in front of you and explain what they would do with a low or high reading, in their own words; re-teach any step they miss."),
          ],
        },
      ],
    },
    {
      slug: "suicide-risk-case",
      objective: "Identifying the client in crisis and applying crisis intervention technique",
      kind: "case",
      title: "A client says \"it doesn't matter anymore\"",
      brief:
        "A fictional 45-year-old on a medical unit after a car crash learned yesterday that their spouse died in the same crash. During morning care the client says quietly, \"It doesn't matter anymore. Nothing does.\"",
      safetyNote: `${CLINICAL_SAFETY} If this topic affects you personally, please reach out to someone you trust or a local crisis line.`,
      steps: [
        {
          text: "The client avoids eye contact and has eaten nothing since yesterday.",
          ask: "How do you respond?",
          parts: [
            part(
              "Therapeutic response",
              "Uses therapeutic communication (for example reflecting the statement and inviting the client to say more) rather than reassurance, changing the subject, or false cheerfulness.",
              "\"You said nothing matters anymore. Tell me more about what you're feeling.\" Then listen and allow silence."
            ),
            part(
              "Direct question",
              "Asks directly and clearly about thoughts of suicide or self-harm, knowing that asking does not plant the idea.",
              "\"Are you having thoughts of ending your life?\" -- asking directly does not increase the risk and tells the client it is safe to answer."
            ),
          ],
        },
        {
          text: "The client says yes, and that they have been saving the sleeping tablets they were given.",
          ask: "What do you do now?",
          parts: [
            part(
              "Safety",
              "Does not leave the client alone; arranges continuous one-to-one observation per policy; removes the saved tablets and other means of harm.",
              "Stay with the client and arrange continuous one-to-one observation; remove the saved tablets and anything else that could be used for self-harm."
            ),
            part(
              "Escalation",
              "Notifies the provider and follows the facility's suicide-risk protocol (risk assessment, mental health/crisis consult), and documents the client's words.",
              "Notify the provider immediately and start the facility's suicide-risk protocol, including a mental health consult; document the client's exact words and the actions taken."
            ),
          ],
        },
      ],
    },
    {
      slug: "pressure-injury-prevention",
      objective: "Skin assessment and maintaining skin and tissue integrity",
      kind: "build",
      title: "Write a pressure injury prevention plan",
      brief:
        "A fictional 79-year-old has been bed-bound for five days after a stroke with right-sided weakness. They are incontinent of urine at times, eat about a third of each meal, and their Braden score is 12. There is a 3 cm area of non-blanchable redness over the sacrum with intact skin.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Interpret the findings and write the plan.",
          parts: [
            part("Interpretation", "Identifies the sacral area as a stage 1 pressure injury (non-blanchable erythema of intact skin) and the Braden score of 12 as high risk.", "Non-blanchable redness on intact skin is a stage 1 pressure injury; a Braden score of 12 means high risk for more breakdown."),
            part("Pressure redistribution", "Repositions on a regular schedule (commonly at least every 2 hours, per policy), avoids positioning on the reddened area, uses a pressure-redistributing support surface and offloads heels.", "Turn at least every 2 hours (per policy), keep off the sacrum (30-degree lateral tilt), use a pressure-redistributing mattress, float the heels, limit head-of-bed elevation when safe."),
            part("Moisture and nutrition", "Manages incontinence promptly with gentle cleansing and a barrier product, and addresses poor intake (dietitian referral, protein and fluid intake monitoring).", "Check and clean promptly after incontinence, use a barrier cream, avoid excess layers under the client; request a dietitian review, record intake, and offer protein-rich foods and fluids."),
            part("Reassessment", "Reassesses skin and Braden score regularly (per policy) and documents, escalating if the area worsens.", "Inspect the skin each shift and with every turn, repeat the Braden score per policy, document size and appearance, and report any worsening."),
          ],
        },
      ],
    },
    {
      slug: "dosage-calculations",
      objective: "Performing the calculations medication administration requires",
      kind: "build",
      title: "Four medication calculations",
      brief:
        "All medications here are fictional ('Medication A' and so on) and every number you need is given. (1) Ordered: Medication A 375 mg by mouth; available: oral solution 250 mg per 5 mL. (2) Ordered: 1,000 mL of IV fluid over 8 hours on an infusion pump. (3) Ordered: 500 mL over 4 hours by gravity with tubing that delivers 15 drops per mL. (4) Ordered: Medication D 10 mg/kg for a child who weighs 22 lb (use 1 kg = 2.2 lb).",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate each one, showing your setup. Round mL to the tenth and drops to the whole drop.",
          parts: [
            part("Oral solution", "Gets 7.5 mL (375 / 250 x 5).", "375 mg / 250 mg x 5 mL = 7.5 mL."),
            part("Pump rate", "Gets 125 mL/hour (1,000 / 8).", "1,000 mL / 8 h = 125 mL/h."),
            part("Gravity drip rate", "Gets 31 drops per minute (500 mL x 15 gtt/mL / 240 min = 31.25, rounded to 31).", "500 mL x 15 gtt/mL / 240 min = 31.25 -> 31 gtt/min."),
            part("Weight-based dose", "Converts 22 lb to 10 kg and gets 100 mg (10 mg/kg x 10 kg).", "22 lb / 2.2 = 10 kg; 10 mg/kg x 10 kg = 100 mg."),
          ],
        },
      ],
    },
    {
      slug: "transfusion-reaction-case",
      objective: "Administering blood products and evaluating the response",
      kind: "case",
      title: "A transfusion that goes wrong",
      brief:
        "A fictional client with anemia after surgery has an order for one unit of packed red blood cells. Consent is on the chart and the unit has arrived from the blood bank.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You are about to start the transfusion.",
          ask: "What do you check before you hang it?",
          parts: [
            part(
              "Verification",
              "Verifies the client and blood product at the bedside with a second qualified person per policy (two identifiers, blood bank numbers, ABO/Rh compatibility, expiry) and confirms consent.",
              "At the bedside, with a second qualified person, match the client's two identifiers and wristband to the unit's label and blood bank form, check ABO/Rh compatibility, unit number and expiry, and confirm consent."
            ),
            part(
              "Set-up and baseline",
              "Takes baseline vital signs, uses a blood administration set primed with 0.9% sodium chloride (no other IV solutions or medications), and starts slowly with close observation during the first 15 minutes.",
              "Baseline vital signs; blood tubing with a filter primed with 0.9% sodium chloride only; start slowly and stay with the client for the first 15 minutes."
            ),
          ],
        },
        {
          text: "Fifteen minutes in, the client has chills, a temperature rise of 1.5 degrees C, low back pain and a blood pressure drop from 124/78 to 98/60 mm Hg.",
          ask: "What do you do?",
          parts: [
            part(
              "Immediate actions",
              "Stops the transfusion immediately, keeps the IV access open with 0.9% sodium chloride through new tubing, stays with the client and monitors vital signs.",
              "Stop the transfusion now; disconnect the blood tubing and keep the line open with 0.9% sodium chloride through new tubing; stay with the client and recheck vital signs often."
            ),
            part(
              "Notify and report",
              "Notifies the provider and the blood bank, recognising a possible acute hemolytic reaction.",
              "These signs fit a possible acute hemolytic reaction: notify the provider and the blood bank immediately and follow the transfusion-reaction protocol."
            ),
          ],
        },
        {
          text: "The client is stable with treatment. The blood bank asks for your follow-up.",
          ask: "What do you send and document?",
          parts: [
            part(
              "Follow-up",
              "Returns the blood bag and tubing to the blood bank, collects the specimens the protocol requires (for example blood and urine samples), and documents the reaction, actions and times.",
              "Send the bag and tubing to the blood bank, collect the blood and urine specimens the protocol asks for, and document the reaction, times, vital signs, actions and who was notified."
            ),
          ],
        },
      ],
    },
    {
      slug: "femoral-site-after-catheterization",
      objective: "Abnormal peripheral pulses after a procedure",
      kind: "case",
      title: "After a cardiac catheterization",
      brief:
        "A fictional client returned two hours ago from a cardiac catheterization through the right femoral artery. Orders: bed rest with the right leg straight, vital signs and site and distal pulse checks per protocol.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The client says the groin feels warm and wet.",
          ask: "What do you do?",
          parts: [
            part(
              "Bleeding response",
              "Checks the site and, for bleeding, applies firm direct manual pressure just above the puncture site and calls for help, keeping the leg straight.",
              "Look at the site; if it is bleeding, apply firm manual pressure just above the puncture site, call for help, keep the leg straight and check vital signs."
            ),
          ],
        },
        {
          text: "Bleeding has stopped with pressure. On your next check the right foot is cooler and paler than the left and the right pedal pulse is weaker than before.",
          ask: "What does this mean and what do you do?",
          parts: [
            part(
              "Interpretation",
              "Recognises reduced arterial perfusion to the right leg (for example thrombus or compression) as a possible emergency, comparing with the other leg and baseline.",
              "A cooler, paler foot with a weaker pulse than before and than the other side means arterial blood flow is reduced -- a possible clot or occlusion."
            ),
            part(
              "Action",
              "Assesses the neurovascular status (pain, pallor, pulse, sensation, movement, temperature, capillary refill), notifies the provider immediately and keeps monitoring.",
              "Do a full neurovascular check (pain, pallor, pulses including with Doppler if needed, sensation, movement, temperature, capillary refill), notify the provider immediately and keep checking often."
            ),
          ],
        },
      ],
    },
    {
      slug: "hypokalemia-before-digoxin",
      objective: "Comparing client laboratory values against normal values",
      kind: "build",
      title: "Read the labs before the morning medications",
      brief:
        "A fictional client with heart failure takes furosemide and digoxin each morning. This morning's results: potassium 2.9 mEq/L (reference 3.5-5.0), sodium 138 mEq/L (135-145), creatinine 1.0 mg/dL (0.6-1.2). The client says their legs feel weak and their heart \"skips\". Apical pulse 64 and irregular.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Interpret the results and decide what you do before giving the medications.",
          parts: [
            part("Abnormal value", "Identifies potassium 2.9 mEq/L as low (hypokalemia) and the other values as within range.", "Potassium 2.9 mEq/L is below the 3.5-5.0 range: hypokalemia. Sodium and creatinine are normal."),
            part("Why it matters here", "Links low potassium to the loop diuretic as a likely cause and explains that hypokalemia increases the risk of digoxin toxicity and dysrhythmias.", "Furosemide wastes potassium, and low potassium increases the risk of digoxin toxicity and of dysrhythmias -- which fits the irregular pulse and the 'skipping'."),
            part("Action", "Holds the doses as appropriate and notifies the provider before giving them, reporting the potassium, symptoms and pulse; anticipates potassium replacement and cardiac monitoring.", "Hold the furosemide and digoxin and contact the provider before giving them, reporting the potassium, weakness and irregular pulse; expect potassium replacement orders and cardiac monitoring, and follow the order given."),
          ],
        },
      ],
    },
    {
      slug: "copd-exacerbation-abg",
      objective: "Managing the client with impaired ventilation or oxygenation",
      kind: "case",
      title: "A COPD exacerbation that keeps changing",
      brief:
        "A fictional 71-year-old with COPD is admitted short of breath after a chest infection. Usual SpO2 is 88-92% on room air at home.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "On arrival: respiratory rate 28 /min, SpO2 84% on room air, using accessory muscles, able to speak in short phrases.",
          ask: "What do you do first?",
          parts: [
            part(
              "First actions",
              "Positions upright (high Fowler's or leaning forward), starts controlled oxygen per order/protocol titrated to the client's prescribed target range (often 88-92% in COPD with CO2 retention risk), and notifies the provider.",
              "Sit the client upright, start controlled oxygen as ordered and titrate to the prescribed target (commonly 88-92% for this client), and inform the provider."
            ),
          ],
        },
        {
          text: "An arterial blood gas on oxygen shows pH 7.30, PaCO2 58 mm Hg, HCO3- 26 mEq/L, PaO2 62 mm Hg.",
          ask: "Interpret the gas.",
          parts: [
            part(
              "ABG interpretation",
              "Interprets acidosis (pH below 7.35) of respiratory origin (PaCO2 above 45) with HCO3- in normal range, so uncompensated (acute) respiratory acidosis.",
              "pH 7.30 is acidotic; PaCO2 58 is high, so the cause is respiratory; HCO3- 26 is normal, so not yet compensated -- acute (uncompensated) respiratory acidosis."
            ),
          ],
        },
        {
          text: "The client is started on BiPAP. An hour later they are hard to rouse and the respiratory rate has fallen to 10 /min.",
          ask: "What do you think is happening and what do you do?",
          parts: [
            part(
              "Hypothesis",
              "Recognises worsening hypercapnia (CO2 narcosis/respiratory failure) as the likely cause of the decreased level of consciousness.",
              "Rising CO2 (worsening hypercapnic respiratory failure) is the likely cause of the drowsiness and slow breathing."
            ),
            part(
              "Escalation",
              "Escalates immediately (rapid response/provider), checks airway and that the BiPAP is working, and anticipates a repeat ABG and possible intubation.",
              "Call the rapid response team/provider now; check the airway, mask fit and settings; expect a repeat ABG and preparation for possible intubation."
            ),
          ],
        },
      ],
    },
    {
      slug: "increased-icp-case",
      objective: "Caring for the client with increased intracranial pressure",
      kind: "case",
      title: "Watching for rising intracranial pressure",
      brief:
        "A fictional 30-year-old is admitted for observation after a fall with a head injury. Glasgow Coma Scale 15 on arrival; pupils equal and reactive; blood pressure 126/78 mm Hg, pulse 82 /min.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "You are setting up the room and the observation plan.",
          ask: "How do you position and monitor this client to reduce and detect raised ICP?",
          parts: [
            part(
              "Positioning and care",
              "Raises the head of the bed about 30 degrees with the head and neck in midline, avoids extreme hip flexion, keeps the environment calm and avoids activities that raise ICP (such as straining or clustered care).",
              "Head of bed at about 30 degrees, head and neck midline, avoid extreme hip flexion, keep the room calm and space out care so pressure isn't driven up."
            ),
            part(
              "Neuro checks",
              "Plans frequent neurological checks (level of consciousness/GCS, pupils, motor response, vital signs) and notes that a change in level of consciousness is the earliest sign.",
              "Regular neuro checks per protocol -- GCS, pupils, limb strength, vital signs; a change in level of consciousness is the earliest sign of rising ICP."
            ),
          ],
        },
        {
          text: "Three hours later the client is drowsy and confused (GCS 13) and the right pupil is slower to react.",
          ask: "What do you do?",
          parts: [
            part(
              "Action",
              "Recognises the decline as a possible rise in ICP and notifies the provider immediately, increasing the frequency of neuro checks.",
              "This decline may mean rising ICP: notify the provider immediately and increase neuro checks while staying close."
            ),
          ],
        },
        {
          text: "While you wait, blood pressure is 172/70 mm Hg, pulse 52 /min and breathing irregular.",
          ask: "What is this pattern and what do you do?",
          parts: [
            part(
              "Recognition",
              "Names Cushing's triad (rising systolic pressure with widening pulse pressure, bradycardia, irregular respirations) as a late sign of dangerously high ICP.",
              "Rising systolic pressure with widening pulse pressure, a falling pulse and irregular breathing is Cushing's triad -- a late sign of very high ICP and impending herniation."
            ),
            part(
              "Emergency response",
              "Treats it as an emergency: calls the rapid response/emergency team, supports airway and breathing, and prepares for urgent interventions per orders.",
              "Call the rapid response or emergency team now, maintain the airway and breathing, and prepare for urgent treatment the team orders."
            ),
          ],
        },
      ],
    },
  ],
};
