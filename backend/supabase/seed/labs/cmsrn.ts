import { CLINICAL_SAFETY, part, orderPart, matchPart, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";
import { CMSRN_BLUEPRINT_URL, CMSRN_SIM_OBJECTIVES } from "../tracks/cmsrn";

// REQ-275: Prep for the CMSRN Exam, authored labs.
//
// Aligned to MSNCB's 2023 CMSRN Exam Blueprint (read 2026-11-14), as seeded
// in seed/tracks/cmsrn.ts. Density ("hybrid"): 3/2/2/2/2 = 11, one lab per
// objective. Every patient and colleague is fictional; exam practice, not
// clinical guidance. Value sources per lab are in nursing-specialty-sources.ts.

export const CMSRN_LABS: SeedLabSet = {
  trackCode: "CMSRN",
  sources: [source(CMSRN_BLUEPRINT_URL, "exam_outline", "2026-11-14")],
  labs: [
    // ------------------------------------------------ Patient/Care Management (32%) -- 3
    {
      slug: "cmsrn-postop-hemorrhage",
      objective: CMSRN_SIM_OBJECTIVES.postopBleed,
      kind: "case",
      title: "Restless four hours after a hip replacement",
      brief:
        "A fictional 76-year-old woman returned to the surgical unit at 14:00 after a total hip replacement. She takes aspirin and a beta-blocker at home. At 14:30: BP 128/72 mm Hg, HR 74 /min, urine 60 mL in the last hour.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At 18:00 she is restless and asking to get up. BP 118/70 mm Hg, HR 92 /min, urine 20 mL in the last hour, the hip dressing has a 6 cm stain, and the thigh looks fuller than the other side.",
          ask: "Which findings worry you, and why is the blood pressure not reassuring?",
          parts: [
            selectPart(
              "Worrying findings",
              "Selects the rising heart rate, the falling urine output, the restlessness and the swollen thigh; the stain alone is not decisive.",
              "A heart rate up from 74 to 92 (despite a beta-blocker), urine down to 20 mL/h, new restlessness and a fuller thigh together suggest bleeding into the thigh. A small dressing stain is expected and can hide a bleed going inward.",
              {
                lines: [
                  "Heart rate 74 to 92 /min",
                  "Urine 20 mL in the last hour",
                  "New restlessness",
                  "Thigh fuller than the other side",
                  "BP 118/70 mm Hg",
                ],
                correct: [0, 1, 2, 3],
                display: "list",
              }
            ),
            part(
              "Why the blood pressure misleads",
              "Explains that compensation (vasoconstriction, tachycardia) keeps blood pressure near normal until significant volume is lost, and that the beta-blocker blunts the tachycardia, so a fall in BP is a late sign.",
              "The body holds BP up by tightening vessels and speeding the heart until a large volume is lost; her beta-blocker hides part of the heart-rate rise. A falling BP is late."
            ),
          ],
        },
        {
          text: "You recheck in 10 minutes: HR 104 /min, BP 106/64 mm Hg, she is pale.",
          ask: "Write your SBAR and say what you do while you wait.",
          parts: [
            part(
              "SBAR and actions",
              "Gives an SBAR with the trends and a specific request (bedside evaluation, CBC, type and screen, fluid), and meanwhile keeps her in bed, checks IV access, increases monitoring and marks the thigh's outline; calls rapid response if the response is slow or she worsens.",
              "S: post-op hip patient I think is bleeding. B: hip replacement at 14:00, on aspirin and a beta-blocker. A: HR 74 to 104, BP 128/72 to 106/64, urine 20 mL/h, restless and pale, swelling thigh. R: please assess now; I'd like a CBC, type and screen and a fluid order. Meanwhile: keep her in bed, check the IV, vitals every 15 minutes, mark the thigh, and call rapid response if she worsens or no one comes."
            ),
          ],
        },
      ],
    },
    {
      slug: "cmsrn-hypoglycemia-protocol",
      objective: "Treat hypoglycemia with 15 g of fast-acting carbohydrate and a recheck in 15 minutes, or glucagon or IV dextrose when the patient cannot swallow",
      kind: "case",
      title: "Sweaty and confused before lunch",
      brief:
        "A fictional 64-year-old man with type 2 diabetes is NPO since midnight for a colonoscopy that has been delayed. He received his usual morning insulin glargine and his scheduled lispro was given at 08:00 before the delay was known.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At 11:20 he is sweaty and shaky but alert and able to swallow. Point-of-care glucose 58 mg/dL.",
          ask: "What do you do, and what level of hypoglycemia is this?",
          parts: [
            part(
              "Treatment",
              "Gives 15 g of fast-acting carbohydrate by mouth (clear juice or glucose tablets, acceptable while NPO for a procedure per policy and with the provider informed), rechecks in 15 minutes and repeats if still below 70; names it level 1 (below 70, not below 54).",
              "Level 1 (54-69 mg/dL). Give 15 g of fast-acting carbohydrate he can swallow (glucose tablets or clear juice, per policy for NPO patients), recheck in 15 minutes and repeat if still under 70. Tell the provider and the endoscopy team."
            ),
          ],
        },
        {
          text: "At 11:40 he is confused and cannot follow instructions. Glucose 46 mg/dL. He has an IV.",
          ask: "What now, and what caused this?",
          parts: [
            part(
              "Treatment",
              "Treats level 2 hypoglycemia with impaired swallowing by IV dextrose per protocol (or glucagon if no IV), nothing by mouth, rechecks, and calls the provider.",
              "Below 54 with confusion: nothing by mouth (aspiration risk). Give IV dextrose per protocol now (glucagon if there were no IV), recheck in 15 minutes, and call the provider."
            ),
            part(
              "Cause and prevention",
              "Identifies rapid-acting insulin given while NPO as the cause, and proposes holding or adjusting prandial insulin when a patient is NPO, with a dextrose infusion if the fast is prolonged, and reporting the event.",
              "Mealtime lispro given to a fasting patient. Prandial insulin should be held when he is not eating; basal may need a reduction; a dextrose-containing infusion may be ordered while he waits. Report it through the safety system."
            ),
          ],
        },
      ],
    },
    {
      slug: "cmsrn-restraint-alternatives",
      objective: "Use restraint only after less restrictive measures fail, on a time-limited order that is never PRN, with ongoing monitoring",
      kind: "build",
      title: "A patient pulling at his catheter",
      brief:
        "A fictional 81-year-old man with dementia and a urinary tract infection keeps reaching for his urinary catheter and IV at night. The night nurse asks for a PRN order for wrist restraints \"in case he gets worse.\"",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Put the approaches in the order you would try them, and explain the problem with the request.",
          parts: [
            orderPart(
              "Least restrictive first",
              "Order: remove the reason (does he still need the catheter and IV?), address pain, toileting and comfort, then cover and secure lines out of sight, then a sitter or family presence and frequent rounding, and only then a time-limited restraint order if he is in danger.",
              "Start by asking whether the devices are still needed; then meet the needs behind the behavior; then hide and secure lines; then increase supervision. Restraint is last, for danger only.",
              [
                "Ask the provider whether the catheter and IV are still needed",
                "Check pain, toileting, thirst and comfort",
                "Secure and cover lines (sleeve, abdominal binder over the catheter tubing)",
                "Arrange a sitter or family presence and frequent rounding",
                "Request a time-limited restraint order if he is in imminent danger",
              ]
            ),
            part(
              "The PRN request",
              "States restraint orders can never be PRN or standing, must follow failed less restrictive measures, are time-limited and require ongoing monitoring and documentation, and that restraints raise risks (falls, injury, delirium).",
              "Restraint orders may never be written PRN or as standing orders (42 CFR 482.13); they follow failed alternatives, are time-limited, and need monitoring and documentation each time. Restraints also worsen delirium and cause injuries."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Holistic Patient Care (15%) -- 2
    {
      slug: "cmsrn-code-status-conversation",
      objective: "Support end-of-life choices, advance directives and code status discussions",
      kind: "case",
      title: "A daughter who wants \"everything done\"",
      brief:
        "A fictional 88-year-old woman with advanced heart failure and kidney disease is admitted for the third time this year. She has an advance directive stating she does not want CPR or a breathing tube. She is alert and able to make decisions.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Her daughter arrives from out of state and tells you, away from the bedside, that the hospital must \"do everything\" for her mother.",
          ask: "How do you respond to the daughter?",
          parts: [
            part(
              "Response",
              "Listens and acknowledges the daughter's fear and love, explains respectfully that her mother can decide for herself while she has capacity and has stated her wishes, and offers a family meeting with the provider and palliative care.",
              "\"It's clear how much you love her. Right now your mom can make her own decisions, and she has told us what she wants. Would it help to sit down together with her, her doctor and the palliative care team so you can hear it from her and ask your questions?\""
            ),
          ],
        },
        {
          text: "At the meeting the mother confirms her wishes. The DNR order is not yet in the chart.",
          ask: "What do you make sure happens?",
          parts: [
            part(
              "Making it real",
              "Ensures the provider writes the code status order, the advance directive is in the record, the code status is communicated at handoff and on the patient's identification per policy, and a palliative or hospice referral is offered; notes DNR does not mean no care.",
              "The provider enters the DNR order; a copy of the directive goes in the record; code status is part of every handoff and visible per policy; palliative care and hospice options are offered. Make clear to the family that DNR is not 'do not treat': symptoms, comfort and other treatments continue."
            ),
          ],
        },
      ],
    },
    {
      slug: "cmsrn-health-literacy-teaching",
      objective: "Assess health literacy and choose a teaching method that fits",
      kind: "build",
      title: "Teach warfarin to a patient who struggles with print",
      brief:
        "A fictional 67-year-old man is going home on warfarin after a deep vein thrombosis. He tells you he left school early and \"lets his wife handle the paperwork.\" English is his second language; his first language is Spanish.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan the teaching: who, how, what, and how you'll know it worked.",
          parts: [
            part(
              "Method",
              "Uses a qualified Spanish interpreter (or teaches in Spanish if qualified), includes his wife with his permission, uses plain words, pictures and demonstration, limits to a few key messages, and gives Spanish materials at a suitable reading level.",
              "Use a qualified medical interpreter, include his wife if he agrees, keep to three or four key points, use pictures and the actual pill and calendar, and give Spanish-language handouts written in plain language."
            ),
            part(
              "Content",
              "Covers taking the dose at the same time daily, INR blood tests, bleeding signs to report, consistent vitamin K intake, checking with the provider before new medicines or supplements, and telling every clinician he takes warfarin.",
              "Same time every day; keep every INR appointment; call for bleeding (black stool, blood in urine, unusual bruising, nosebleeds that won't stop); keep green vegetables consistent rather than avoiding them; ask before any new medicine, including over-the-counter pain relievers and herbs; tell every provider and dentist."
            ),
            part(
              "Confirming",
              "Uses teach-back and return demonstration through the interpreter, and re-teaches any missed point.",
              "Through the interpreter: \"So I know I explained it well, tell me what you'll do if your stool turns black.\" Have him fill the pill organizer. Re-teach anything he misses and check again."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Elements of Interprofessional Care (17%) -- 2
    {
      slug: "cmsrn-medication-reconciliation",
      objective: "Reconcile medications at admission, transfer and discharge",
      kind: "build",
      title: "Find the discrepancies at discharge",
      brief:
        "A fictional 72-year-old woman admitted for pneumonia is going home. Her home list (from her pharmacy and her pill bottles) and the discharge list are below. During the stay her metoprolol was changed to a lower dose for low blood pressure; the team says it should stay lower at home.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the discharge lines that need clarifying with the provider before she leaves, and say why.",
          parts: [
            selectPart(
              "Lines to clarify",
              "Selects the duplicate metoprolol (home dose still listed beside the new lower dose), the missing home apixaban (omitted without explanation), and the IV antibiotic still listed for home; leaves the deliberately changed metoprolol dose and the oral antibiotic course.",
              "Two metoprolol doses would give her both; apixaban was on her home list and disappeared without a documented reason; an IV antibiotic cannot continue at home without a plan. The lower metoprolol dose and the oral antibiotic are intended.",
              {
                header: "Discharge medication list",
                lines: [
                  "Metoprolol succinate 25 mg daily (new, lower dose)",
                  "Metoprolol succinate 100 mg daily (home dose)",
                  "Amoxicillin-clavulanate by mouth twice daily for 3 more days",
                  "Ceftriaxone 1 g IV daily",
                  "Atorvastatin 40 mg nightly",
                  "(Apixaban 5 mg twice daily on home list -- not on discharge list)",
                ],
                correct: [1, 3, 5],
                display: "table",
              }
            ),
            part(
              "Why it matters",
              "Explains that discrepancies at transitions are a leading cause of adverse drug events and readmission, and that the nurse clarifies with the prescriber, updates the list and teaches the patient what changed and why.",
              "Most medication errors after discharge come from unreconciled changes at transitions. Clarify each with the prescriber, give her one accurate list, and teach what stopped, what changed and what is new, and why."
            ),
          ],
        },
      ],
    },
    {
      slug: "cmsrn-readmission-risk",
      objective: "Identify patients at risk of readmission and the social drivers of health behind it",
      kind: "case",
      title: "A third heart failure admission in three months",
      brief:
        "A fictional 58-year-old man with heart failure is admitted for the third time in three months with fluid overload. He lives alone, works nights stocking shelves, and takes the bus to appointments.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He tells you he stopped his furosemide because he \"can't be running to the bathroom on the bus,\" and he eats instant noodles most nights.",
          ask: "What drives his readmissions, and who do you bring in?",
          parts: [
            part(
              "Drivers",
              "Identifies the practical barrier to diuretic timing, high-sodium affordable food, transportation, living alone and night work as social drivers, beyond 'non-adherence'.",
              "Not simple non-adherence: diuretic timing clashes with his bus and work, cheap food is high in sodium, he has transport barriers and no one at home."
            ),
            part(
              "Team",
              "Brings in the provider or pharmacist to adjust diuretic timing, a dietitian for affordable low-sodium choices, a case manager or social worker for transport, food and follow-up resources, and arranges early follow-up or a heart failure clinic or home visit.",
              "Pharmacist and provider: can the diuretic be timed for when he is home? Dietitian: low-sodium foods he can afford. Social work or case management: transport, food assistance, a scale if he lacks one. A follow-up appointment within days, ideally a heart failure clinic or home visit."
            ),
          ],
        },
        {
          text: "On the day of discharge he says he'll \"try his best.\"",
          ask: "How do you check he's ready?",
          parts: [
            part(
              "Readiness",
              "Uses teach-back on weights, symptoms, the new diuretic timing and when to call; confirms he has his medicines, a scale and the follow-up appointment and transport.",
              "Teach-back on the plan (when to take the diuretic, daily weight, symptoms that need a call), and confirm practical readiness: medicines in hand, a scale at home, the follow-up date and how he'll get there."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Professional Concepts (15%) -- 2
    {
      slug: "cmsrn-who-first",
      objective: "Prioritize a patient assignment and recognize which patient to see first",
      kind: "build",
      title: "Start of shift: who first?",
      brief:
        "Four fictional patients after report. A: day 1 after bowel surgery, new chest pain and SpO2 88%. B: stable diabetic due for 08:00 insulin, glucose 210 mg/dL. C: pneumonia, requests pain medicine for pleuritic pain rated 6/10, SpO2 95%. D: going home today, asking about discharge paperwork.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Order the patients, and say what you delegate or defer.",
          parts: [
            orderPart(
              "Order",
              "A, then C, then B, then D.",
              "A has a possible pulmonary embolism (airway, breathing, circulation problem now). C needs pain relief that affects breathing. B's insulin is time-sensitive but stable. D can wait.",
              ["Patient A", "Patient C", "Patient B", "Patient D"]
            ),
            part(
              "Delegate and defer",
              "Keeps assessment of A and C with the RN, calls rapid response or the provider for A, may delegate vital signs on stable patients to assistive personnel, and asks the charge nurse for help if A will take a long time.",
              "Go to A now and escalate (rapid response or provider). Ask assistive personnel for vital signs on B and D. Ask the charge nurse or a colleague to give B's insulin and C's analgesia on time if A takes you away."
            ),
          ],
        },
      ],
    },
    {
      slug: "cmsrn-moral-distress",
      objective: "Recognize moral distress, compassion fatigue and burnout, and use resources for resilience",
      kind: "case",
      title: "Short-staffed for the fourth week",
      brief:
        "A fictional med-surg nurse, Dana, has worked short-staffed for four weeks. She tells a colleague she feels she is \"giving bad care on purpose\" because she cannot turn her patients or answer call lights in time, and she dreads coming to work.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Dana says she has stopped speaking up because \"nothing changes.\"",
          ask: "What is Dana describing, and what can she and her colleague do?",
          parts: [
            part(
              "Naming it",
              "Distinguishes moral distress (knowing the right action but being constrained from it) from compassion fatigue and burnout, and recognizes signs of burnout (dread, cynicism, withdrawal).",
              "Moral distress: she knows what good care is but staffing stops her providing it. The dread and 'nothing changes' suggest burnout developing. These are system problems, not personal failings."
            ),
            part(
              "Action",
              "Suggests documenting and reporting unsafe staffing through the proper channels (safe-staffing or assignment objection forms, the charge nurse and manager, shared governance), using ethics consultation or support resources, and self-care and peer support; notes the 2025 ANA Code names nurses' self-care as part of the duty of care.",
              "Raise staffing formally (assignment objection or unsafe-staffing report, manager, shared governance council), use the ethics service or employee assistance, and lean on peers. The ANA Code's 2025 revision treats a nurse's own well-being as part of the duty to patients, so looking after herself is not selfish."
            ),
          ],
        },
        {
          text: "Dana's manager asks what would help most.",
          ask: "Suggest two system-level changes.",
          parts: [
            part(
              "System changes",
              "Proposes realistic system changes (for example, adjusting staffing or skill mix to acuity, protected breaks, debriefs, recruitment and retention steps, involving staff in decisions) rather than individual resilience training alone.",
              "Staff to acuity (float pool, skill-mix review), protected breaks, regular debriefs, and staff involvement in decisions through shared governance. Resilience classes alone don't fix a staffing gap."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Nursing Teamwork and Collaboration (21%) -- 2
    {
      slug: "cmsrn-delegation-five-rights",
      objective: CMSRN_SIM_OBJECTIVES.delegation,
      kind: "build",
      title: "What can be delegated, and to whom?",
      brief:
        "A fictional RN on a med-surg unit works with an LPN and a nursing assistant. Their state allows LPNs to give oral and subcutaneous medications and reinforce teaching. Five tasks need doing in the next hour.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each task to who should do it, and explain the five rights for one delegation.",
          parts: [
            matchPart(
              "Task to team member",
              "Admission assessment, RN; first teaching on a new insulin pen, RN; scheduled oral medications for a stable patient, LPN; vital signs and ambulation for a stable patient, assistant; reinforcing discharge teaching already given, LPN.",
              "Initial assessment and initial teaching need RN judgment. A stable patient's scheduled oral medications and reinforcing teaching fit LPN scope here. Routine vital signs and ambulation of a stable patient fit the assistant.",
              {
                left: [
                  "Admission assessment of a new patient",
                  "First teaching on a new insulin pen",
                  "Scheduled oral medications for a stable patient",
                  "Vital signs and a walk for a stable patient",
                  "Reinforcing discharge teaching the RN already gave",
                ],
                right: ["RN", "RN (teaching)", "LPN", "Nursing assistant", "LPN (reinforce)"],
                pairs: [0, 1, 2, 3, 4],
                leftHeading: "Task",
                rightHeading: "Who",
              }
            ),
            part(
              "Five rights",
              "Applies the five rights (task, circumstance, person, directions and communication, supervision and evaluation) to one delegation, including what to report back and the RN keeping accountability.",
              "Delegating the walk: right task (routine, predictable), right circumstance (stable patient), right person (assistant competent in ambulation), right directions (walk to the doorway and back with the walker; stop and call me if he's dizzy, short of breath or his pulse is over the limit I give you), right supervision (I check how it went and evaluate him). I remain accountable."
            ),
          ],
        },
      ],
    },
    {
      slug: "cmsrn-disaster-surge",
      objective: "Respond to an internal or external disaster within the hospital incident command structure",
      kind: "case",
      title: "A mass casualty alert at 15:00",
      brief:
        "A fictional hospital activates its emergency operations plan after a bus crash. The med-surg charge nurse is told the unit must open six beds within an hour for transfers from the emergency department.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "The unit is full. Two patients are awaiting discharge paperwork, one is waiting for a ride, and one stable patient could go to the discharge lounge.",
          ask: "How does the charge nurse create capacity, and who does she report to?",
          parts: [
            part(
              "Capacity",
              "Expedites safe discharges (finishing paperwork, discharge lounge, rides), identifies stable patients who could move, requests extra staff through the labor pool, and works within the incident command structure, reporting to the assigned section or unit leader rather than freelancing.",
              "Finish the two discharges now, move the patient waiting for a ride and the stable patient to the discharge lounge, ask the house supervisor or labor pool for staff, and report bed status through the incident command chain (the unit leader reporting to operations or planning)."
            ),
          ],
        },
        {
          text: "A nurse from another unit arrives to help but has never worked med-surg.",
          ask: "How is she best used?",
          parts: [
            part(
              "Using help",
              "Assigns tasks within her competence (vital signs, admissions with support, a buddy system) rather than a full independent assignment, and orients her to essentials.",
              "Pair her with an experienced med-surg nurse (team nursing): she takes vital signs, helps with admissions and patient transport, while the experienced nurse keeps assessment and the complex patients. A two-minute orientation to the unit's emergency equipment."
            ),
          ],
        },
      ],
    },
  ],
};
