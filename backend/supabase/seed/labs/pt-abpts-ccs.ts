import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-151: ABPTS Cardiovascular & Pulmonary Clinical Specialist labs.
//
// Aligned to the ABPTS cardiovascular and pulmonary examination outline
// (professional behaviors 5%, evidence-based practice 10%, examination
// 15%, evaluation 30%, diagnosis/prognosis 5%, plan of care 15%, outcomes
// 5%, plus the unweighted diagnosis-frequency unit). Density follows the
// adopted hybrid plan unit by unit: 2 / 2 / 2 / 2 / 2 / 2 / 1 / 1 = 14 labs
// (10 build, 4 case). The frequency-distribution unit's lab is a case on
// one of the frequently-seen diagnoses its objective names.
//
// Every patient, unit and team is fictional; exam practice, not clinical
// guidance. Thresholds quoted were checked on 2026-11-07:
//   - BTS Guideline for oxygen use in adults in healthcare and emergency
//     settings (2017), summary for hospital use, brit-thoracic.org.uk:
//     target SpO2 94-98% for most acutely ill patients; 88-92% for those at
//     risk of hypercapnic respiratory failure (e.g. COPD).
//   - GOLD 2026 report (goldcopd.org, v1.3 Dec 2025): post-bronchodilator
//     FEV1/FVC below 0.7 confirms airflow obstruction; severity graded on
//     post-bronchodilator FEV1 % predicted (GOLD 1-4 bands as in the GOLD
//     2025 report: 80% or more, 50-79%, 30-49%, under 30%); mMRC 2 or more
//     and CAT 10 or more mark "more breathlessness/symptoms".
//   - Fletcher 2013, AHA Exercise Standards for Testing and Training,
//     Circulation doi:10.1161/CIR.0b013e31829b5b44: absolute indications
//     to stop (ST elevation over 1.0 mm in leads without prior Q waves,
//     SBP fall over 10 mm Hg with increasing workload plus other ischemia
//     evidence, moderate-to-severe angina, CNS symptoms, poor perfusion,
//     sustained VT or high-grade block, monitoring failure, patient
//     request); relative (ST depression over 2 mm, SBP fall over 10 mm Hg
//     without ischemia, SBP over 250 or DBP over 115, other arrhythmias,
//     BBB mimicking VT); training intensity 40-80% heart rate reserve or
//     VO2 reserve, RPE 11-16.
//   - Hodgson 2014, safety criteria for active mobilization of mechanically
//     ventilated adults, Crit Care doi:10.1186/s13054-014-0658-y: FiO2
//     under 0.6, SpO2 over 90% and respiratory rate under 30/min described
//     as safe for in- and out-of-bed mobilisation absent other
//     contraindications; endotracheal tube not a contraindication;
//     vasoactive drugs not an absolute contraindication (rising dose is a
//     caution; no consensus dose threshold).
//   - Rochester 2023, ATS pulmonary rehabilitation guideline, AJRCCM
//     doi:10.1164/rccm.202306-1066ST: strong for stable COPD, COPD after
//     hospitalisation (evidence from programmes starting within 3 weeks of
//     discharge), ILD and telerehabilitation as an alternative; conditional
//     for pulmonary hypertension and maintenance programmes.
//   - 2024 ACC/AHA multisociety PAD guideline (Gornik et al., acc.org key
//     points): supervised exercise therapy or a structured community-based
//     programme, Class 1, Level A; the 2016 guideline's parameters (at
//     least 30-45 minutes, at least 3 times a week, at least 12 weeks).
//   - Kon 2014, CAT MCID 2 points, Lancet Respir Med
//     doi:10.1016/S2213-2600(14)70001-3; Jones 2005, SGRQ MCID 4 units,
//     COPD doi:10.1081/COPD-200050513; Holland 2014 ERS/ATS field walking
//     tests technical standard, Eur Respir J doi:10.1183/09031936.00150314
//     and SP-6MWT (30 m minimal important difference).
//   - Singer 2016 Sepsis-3 (qSOFA), SP-ABG, SP-PFT, SP-COPD, SP-HF, SP-CR,
//     SP-PR, SP-ATEL, SP-LVAD, SP-CABG, SP-O2 as cited in
//     seed/tracks/pt-abpts.ts.
// Not used because unverified on the day: a numeric heart-rate margin below
// an ICD detection rate, the timing of resistance training after MI or
// CABG (the rubrics say "when cleared by the cardiology/surgical team"),
// heart-failure daily weight-gain thresholds (the HF team's threshold),
// numeric haemoglobin or platelet exercise cut-offs (facility protocol).

export const ABPTSCCS_LABS: SeedLabSet = {
  trackCode: "ABPTSCCS",
  sources: [
    source("https://specialization.apta.org/become-a-specialist/cardiovascular-pulmonary/exam-outline", "exam_outline", "2026-11-07"),
    source("https://specialization.apta.org/become-a-specialist/cardiovascular-pulmonary", "exam_outline", "2026-11-07"),
  ],
  labs: [
    // ------------------------------------------------------------------
    // Unit 1: Professional behaviors, leadership, education... (2)
    // ------------------------------------------------------------------
    {
      slug: "ccs-mobility-protocol-consult",
      objective: "Leadership, consultation and program administration in cardiopulmonary rehabilitation",
      kind: "build",
      title: "Consult: a mobility protocol for the cardiac surgery unit",
      brief:
        "A fictional hospital's cardiac surgery unit asks you, as the cardiopulmonary clinical specialist, to lead a nurse-driven early mobility protocol for patients after coronary bypass and valve surgery. Current state: mobility starts only when a therapist is available (often postoperative day 2), there is no agreed screening, and nurses are unsure what is safe with chest tubes, pacing wires and sternotomy. The unit manager wants a one-page protocol, roles and a way to show it works within 6 months. Fictional organization; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the consultation deliverable: the protocol's safety screen and progression, the roles and training plan, and the metrics and governance you will use to show it works.",
          parts: [
            part(
              "Safety screen and progression",
              "Writes a screen with physiological criteria agreed with the surgical and nursing leads (for example stable rhythm and hemodynamics without rising vasoactive support, acceptable SpO2 and respiratory rate on the current oxygen, no active bleeding or unexplained chest-tube output change, pain controlled, alert and able to follow commands) with explicit stop criteria, and a staged progression (sit on edge of bed, stand, chair, walk in room, walk corridor) that handles chest tubes, pacing wires and sternal precautions per the surgeon's protocol.",
              "A one-page screen the nurse checks before each stage: rhythm stable and heart rate within the agreed range, no rising inotrope or vasopressor dose, blood pressure within the surgeon's limits, SpO2 at or above the ordered target on current oxygen with respiratory rate under 30, chest tube output not newly increasing, no active bleeding, pain controlled, awake and following commands. Stop criteria on the same page (new arrhythmia, SBP fall, SpO2 below target, chest pain, dizziness, patient request). Progression: dangle, stand at bedside, chair, room walking, corridor walking -- with chest tubes carried below the chest, pacing wires secured, and the surgeon's sternal precautions written on the sheet."
            ),
            part(
              "Roles and training",
              "Defines roles (nurses initiate and progress within the protocol; therapists assess complex patients, those who screen out and those not progressing; surgeons/intensivists own exclusions), plans competency-based training with return demonstration, a champion on each shift, and a clear escalation route.",
              "Nurses start and advance mobility within the screen from postoperative day 0-1; therapy sees anyone who screens out twice, has a complication, or is not progressing by day 2, plus everyone before discharge for the walking plan; surgeons set patient-specific exclusions in the order set. Training: a 1-hour session plus a return demonstration on chest-tube and line management, two nurse champions per shift, and a single escalation phone line to therapy."
            ),
            part(
              "Metrics and governance",
              "Chooses process and outcome metrics with baselines (time to first mobilization, percentage mobilized by day 1, corridor walking by day 3, adverse events during mobility, pulmonary complications, length of stay, discharge destination), a monthly audit and feedback cycle, and a plan to revise the protocol with the interprofessional group.",
              "Baseline now, then monthly: hours from ICU discharge to first stand, percentage out of bed by postoperative day 1 and walking the corridor by day 3, mobility-related adverse events (falls, line dislodgement, arrhythmia requiring treatment), postoperative pneumonia/atelectasis rate, length of stay and discharge home versus facility. Review the dashboard at a monthly unit meeting with nursing, surgery and therapy, and revise the sheet every quarter."
            ),
          ],
        },
      ],
    },
    {
      slug: "ccs-heart-failure-self-management-teaching",
      objective: "Education of patients, families and interprofessional staff about activity, risk and self-management",
      kind: "build",
      title: "Teach-back plan for heart failure self-management",
      brief:
        "A fictional 72-year-old man with heart failure with reduced ejection fraction is 3 days from discharge after his second admission this year for fluid overload. He has low health literacy, lives with his wife, and has been told to 'watch his weight and salt' but cannot say what that means. The heart-failure nurse has set his dry weight and the daily weight-gain threshold at which he should call; cardiology has cleared him for a walking program and cardiac rehabilitation referral. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the teaching plan: the content prioritized for him and his wife, how you will teach and check understanding, and how you will coordinate it with the team.",
          parts: [
            part(
              "Prioritized content",
              "Prioritizes the self-management actions that prevent readmission: daily morning weight on the same scale with the team's threshold for calling (and what to do), recognizing worsening symptoms (breathlessness, orthopnea, swelling, reduced exercise tolerance), sodium and fluid guidance in concrete terms, medication adherence, a safe graded walking plan with symptom-based limits, and when to call emergency services.",
              "Three things first: (1) weigh every morning after the toilet, before breakfast, on the same scale, write it down, and call the heart-failure nurse at the gain she set -- or sooner for swelling, needing more pillows, or breathlessness doing usual things; (2) take the medicines as listed, do not skip the water tablet; (3) walk every day, starting at 5-10 minutes at a 'can talk' pace, adding a few minutes when it feels easy, stopping for chest pain, dizziness or breathlessness worse than usual. Then salt in plain words (no added salt, read labels, avoid tinned soups and processed meats) and the emergency list: chest pain, severe breathlessness, fainting -- call emergency services."
            ),
            part(
              "Teaching method",
              "Uses health-literacy-appropriate methods: plain language, chunk-and-check, teach-back ('show me how you will weigh yourself and what number means you call'), involves the wife, provides a one-page large-print weight log with the call threshold written in, demonstrates the scale, and repeats on a second day before discharge.",
              "Teach in small chunks and use teach-back each time: ask him to show me the morning weighing routine and tell me in his own words the number that means 'call'. Have his wife present and give her the same cards. One large-print page: the weight log with his dry weight and the call threshold filled in, the symptom pictures, the walking plan, and the two phone numbers. Practice once today and again tomorrow, and send the same page to his primary care practice."
            ),
            part(
              "Coordination",
              "Coordinates with the interprofessional team: confirms the thresholds and medicines with the heart-failure nurse and pharmacist, documents what was taught and his teach-back performance, hands over to cardiac rehabilitation and home health or primary care, and arranges a follow-up call.",
              "Check the dry weight, call threshold and medication list with the heart-failure nurse and pharmacist before I teach so everyone says the same thing. Document the content and his teach-back result in the chart. Send the cardiac rehabilitation referral and the teaching sheet with the discharge summary, and arrange a follow-up phone call at 48-72 hours to repeat the key questions."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 2: Evidence-based practice and critical inquiry (2)
    // ------------------------------------------------------------------
    {
      slug: "ccs-appraise-a-trial",
      objective: "Critical inquiry principles and methods applied to cardiopulmonary rehabilitation evidence",
      kind: "build",
      title: "Appraise a trial before you change the program",
      brief:
        "A fictional journal abstract: 'Randomized trial of high-intensity interval training (HIIT) versus moderate continuous training (MCT) in 180 patients after myocardial infarction in a single center. Allocation by alternating admission date; outcome assessors not blinded. Primary outcome: change in peak VO2 at 12 weeks, HIIT +4.1 mL/kg/min versus MCT +2.6 (p = 0.01). Secondary: hospital readmission at 6 months, HIIT 15% versus MCT 20% (p = 0.38). Twenty-two HIIT and 9 MCT participants dropped out and were excluded from analysis. Quality of life (MacNew) improved by 0.3 points in both groups.' Your program director wants to switch everyone to HIIT. Fictional study; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Appraise the trial: its main threats to validity, what the numbers actually mean (including a number needed to treat for readmission and whether differences are clinically meaningful), and your recommendation to the director.",
          parts: [
            part(
              "Validity",
              "Identifies the threats: quasi-randomization by alternating dates (predictable allocation, selection bias), no assessor blinding for an effort-dependent outcome (peak VO2), differential dropout (22 versus 9) with per-protocol rather than intention-to-treat analysis (biasing toward HIIT if those who could not tolerate it left), single center limiting generalisability, and a secondary outcome underpowered for events.",
              "Allocation by alternating admission date is not random -- staff can predict the next group, so selection bias is likely. Peak VO2 depends on effort and encouragement and the assessors were not blinded. Dropout was lopsided (22 HIIT versus 9 MCT) and the dropouts were excluded, so the HIIT result reflects the people who tolerated HIIT, not everyone assigned to it -- the analysis should have been intention-to-treat. Single center, and the readmission comparison is a secondary outcome with too few events to settle anything."
            ),
            part(
              "What the numbers mean",
              "Calculates the readmission absolute risk reduction (20% - 15% = 5 percentage points) and NNT (1 / 0.05 = 20) while noting it is not statistically significant, so the confidence interval includes no effect; judges the peak VO2 difference (1.5 mL/kg/min) as modest and of uncertain clinical meaning given the biases; notes the quality-of-life change was identical and small.",
              "Readmission: 20% minus 15% is an absolute risk reduction of 5 percentage points, so an NNT of 20 -- but p = 0.38 means the interval comfortably includes zero or harm, so it is not evidence of benefit. Peak VO2: a 1.5 mL/kg/min extra gain is real in physiology terms but modest, and the unblinded, per-protocol design could produce that much on its own. Quality of life did not differ at all."
            ),
            part(
              "Recommendation",
              "Recommends against wholesale change on this trial alone: offer HIIT as an option for appropriately screened, motivated patients within the existing program, keep MCT as the default, look to higher-quality trials and guidelines, and monitor local outcomes and safety if HIIT is introduced.",
              "Do not switch everyone. This trial cannot carry that decision. Keep moderate continuous training as the default, offer interval training to screened, stable patients who prefer it, and judge it on the better-designed trials and the cardiac rehabilitation guidelines. If we add HIIT, we track our own completion rates, adverse events and fitness gains and review in 6 months."
            ),
          ],
        },
      ],
    },
    {
      slug: "ccs-apply-pulmonary-rehab-guideline",
      objective: "Clinical practice guidelines for cardiac and pulmonary rehabilitation and their limits",
      kind: "build",
      title: "Who gets pulmonary rehabilitation, and how?",
      brief:
        "A fictional regional pulmonary rehabilitation program has a waiting list and limited places. Four fictional referrals arrive: (A) a 68-year-old with stable COPD, mMRC 3, who has never done rehabilitation; (B) a 74-year-old discharged 10 days ago after a COPD exacerbation; (C) a 61-year-old with idiopathic pulmonary fibrosis on home oxygen; (D) a 55-year-old with group 1 pulmonary arterial hypertension, stable on therapy, referred by her specialist. A fifth patient (E) lives 2 hours away and asks whether a home-based program would be as good. Fictional patients; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Using the 2023 ATS pulmonary rehabilitation guideline, decide who is offered a place and with what priority, answer patient E, and state the guideline's limits for these decisions.",
          parts: [
            part(
              "Who and why",
              "Applies the guideline: strong recommendations for pulmonary rehabilitation in stable COPD (A), after hospitalization for a COPD exacerbation (B -- with the evidence base from programs started within about 3 weeks of discharge, so B is time-critical), and in interstitial lung disease (C); a conditional recommendation for pulmonary hypertension (D), so D is offered a place in coordination with her specialist but is lower priority if places are rationed.",
              "All four qualify. Patient B first: the recommendation after a COPD hospitalization is strong and the trials started rehabilitation within about 3 weeks of discharge, so he must start now. Patients A (stable COPD) and C (interstitial lung disease) are also strong recommendations and go next. Patient D (pulmonary hypertension) is a conditional recommendation on low-certainty evidence -- offer her a place with her specialist's agreement and a tailored program, but if we must ration, she is behind A, B and C."
            ),
            part(
              "Patient E",
              "Answers with the guideline's strong recommendation that stable patients be offered the choice of center-based rehabilitation or telerehabilitation as an alternative, and explains the practical requirements (safety assessment, equipment, monitoring) and that telerehabilitation is an alternative rather than a replacement.",
              "Yes, there is an evidence-based option: the guideline strongly recommends offering stable patients a choice between center-based rehabilitation and telerehabilitation. We would do an in-person assessment first (exercise test, oxygen needs), set her up with a home exercise kit and oximeter, and supervise by video with the same education content -- an alternative to coming in, not a lesser program."
            ),
            part(
              "Limits",
              "States the guideline's limits: it addresses whether to offer rehabilitation, not the exact exercise prescription for each person; evidence certainty is moderate to low; it says little about the most severe or unstable patients; and maintenance programs have only a conditional recommendation, so local decisions still require clinical judgment, resources and patient preference.",
              "The guideline tells us who should be offered rehabilitation, not how to dose each person's training or oxygen -- that is our assessment. Certainty is moderate at best and low for pulmonary hypertension and for maintenance programs (conditional: supervised maintenance or usual care). It does not cover unstable or very severe patients, and the telerehabilitation evidence comes from stable patients, so clinical judgment, our resources and what each patient wants still decide."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 3: Examination (2)
    // ------------------------------------------------------------------
    {
      slug: "ccs-three-rhythm-strips",
      objective: "Vital signs, ECG rhythm recognition and hemodynamic monitoring during examination",
      kind: "build",
      title: "Three monitor readings before a session",
      brief:
        "On a fictional telemetry ward you check the monitor before treating three fictional patients. Patient 1: 4 days after a valve replacement; the strip shows an irregularly irregular rhythm with no visible P waves and narrow QRS complexes at about 138 per minute; yesterday he was in sinus rhythm at 80; blood pressure 102/64, he feels 'fluttery'. Patient 2: 2 days after an uncomplicated myocardial infarction; sinus rhythm at 72 with occasional isolated wide, early beats followed by a pause (about 3 per minute), blood pressure 124/76, asymptomatic. Patient 3: in heart failure; during the walk you planned the monitor shows a run of 8 wide-complex beats at about 170 per minute that stops on its own, he looks pale and says he feels faint; blood pressure 88/50. Fictional patients; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each patient, name the rhythm, say whether you proceed, modify or stop and escalate, and give the reasoning that makes your decision safe.",
          parts: [
            part(
              "Patient 1",
              "Identifies new-onset atrial fibrillation with a rapid ventricular response (irregularly irregular, no P waves, narrow QRS, about 138/min) after cardiac surgery, and decides not to proceed with exercise: notify the nurse and medical team now because the rhythm is new, fast and symptomatic with a lower blood pressure; may continue only gentle bed-level activity if the team agrees after rate control.",
              "New atrial fibrillation with a rapid ventricular response -- irregularly irregular, no P waves, narrow QRS at about 138, new since yesterday, symptomatic, with BP down to 102/64. Do not mobilize; tell the nurse and the surgical/medical team now. Postoperative AF is common but needs rate control and an anticoagulation decision before he exercises; revisit once the rate is controlled and the team clears him."
            ),
            part(
              "Patient 2",
              "Identifies occasional isolated premature ventricular complexes in sinus rhythm after a myocardial infarction, asymptomatic with stable blood pressure, and proceeds with the planned session while monitoring for increasing frequency, couplets/runs or symptoms, which would stop the session and prompt reporting.",
              "Sinus rhythm with occasional isolated PVCs (wide, early beats with a compensatory pause), about 3 a minute, asymptomatic and hemodynamically fine. Proceed with the planned low-level session, watch the monitor and him: more frequent PVCs, couplets, a run, or symptoms would stop the session and be reported."
            ),
            part(
              "Patient 3",
              "Identifies a run of non-sustained ventricular tachycardia (8 wide-complex beats at about 170) with symptoms and hypotension, stops the activity immediately, sits/lies the patient down, calls for help and the medical team, stays with him, monitors, and documents; recognizes this as an absolute indication to stop exercise.",
              "An 8-beat run of ventricular tachycardia with pallor, near-fainting and BP 88/50. Stop now, get him sitting or lying down, call for the nurse and physician immediately (rapid response if he deteriorates), stay with him on the monitor, recheck BP, and document the strip and times. Symptomatic VT with hypotension is an absolute reason to stop and escalate, not something to 'walk off'."
            ),
          ],
        },
      ],
    },
    {
      slug: "ccs-icu-mobility-screen",
      objective: "Examination of the patient with lines, drains, ventilators, pacemakers, defibrillators and ventricular assist devices",
      kind: "case",
      title: "Is she safe to mobilize this morning?",
      brief:
        "A fictional 54-year-old woman is on day 5 in intensive care with pneumonia and sepsis, intubated and ventilated. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Morning review: pressure-support ventilation, FiO2 0.40, PEEP 8 cm H2O, SpO2 95%, respiratory rate 22. Noradrenaline infusion at a low dose, unchanged for 18 hours; MAP 74 mm Hg; heart rate 96 sinus. RASS 0, follows commands, nods to 'do you want to sit up?'. Lines: right internal jugular central line, left radial arterial line, urinary catheter, nasogastric tube. No femoral lines. Temperature 37.6 C. Lactate normal this morning.",
          ask: "Decide whether and how far you mobilize her today, naming the criteria you used.",
          parts: [
            part(
              "Decision and criteria",
              "Applies consensus safety criteria for mobilizing ventilated patients: the endotracheal tube is not a contraindication; FiO2 under 0.6, SpO2 above 90% and respiratory rate under 30 are within the described safe range; a stable low-dose vasopressor is not an absolute contraindication (a rising dose would be the caution), MAP is adequate, she is alert and cooperative (RASS 0) -- so active mobilization is appropriate today with the team's agreement.",
              "Yes, mobilize. Respiratory: FiO2 0.40 (under 0.6), SpO2 95% (above 90%), RR 22 (under 30) -- all in the range the consensus describes as safe for in- and out-of-bed activity; being intubated is not a reason to stay in bed. Cardiovascular: noradrenaline at a low, stable dose for 18 hours with MAP 74 is a caution to discuss with the ICU team, not a stop -- a rising dose would be. Neurological: RASS 0 and following commands. Lines are all non-femoral and can be secured."
            ),
            part(
              "How far and how",
              "Plans a staged progression within the session: sitting on the edge of the bed, then standing with a frame or two assistants, then marching on the spot or a chair transfer, with pre-briefing of the ICU nurse and respiratory therapist, airway and line security (one person owns the tube and ventilator tubing, lines checked for length), continuous monitoring, and agreed stop criteria (SpO2 below 88-90% not recovering, new arrhythmia, MAP fall, distress or RASS change, airway concern).",
              "Plan: sit on the edge of the bed, then stand with two people and a frame, and if she is steady, step to the chair; no corridor today. Before starting: nurse and respiratory therapist present, one person dedicated to the airway and ventilator tubing, lines and drains secured with slack, suction ready. Monitor continuously and stop for SpO2 falling below 90% and not recovering with rest, a new arrhythmia, MAP falling or noradrenaline needing to go up, distress, drowsiness or any airway concern."
            ),
          ],
        },
        {
          text: "On standing, heart rate rises to 128, SpO2 falls to 86% and does not recover after 60 seconds of standing rest, respiratory rate is 36 and she looks frightened; MAP is 78.",
          ask: "What do you do now and what do you record and plan?",
          parts: [
            part(
              "Immediate action",
              "Stops the activity and returns her to bed or a supported sitting position, allows recovery with the respiratory therapist adjusting oxygen or support per orders, reassesses vital signs until they return toward baseline, reassures her, and informs the team; does not push on because the desaturation did not recover with rest and the respiratory rate exceeds the safe range.",
              "Stop and sit her back on the bed with support, then lie her back if needed. The respiratory therapist increases FiO2 or support per the orders while she recovers; recheck SpO2, heart rate and RR every minute until they return toward baseline. Reassure her and explain what happened. Tell the nurse and intensivist: she desaturated to 86% without recovery on standing rest with RR 36."
            ),
            part(
              "Record and plan",
              "Documents the attempt, the vital-sign response and recovery time, plans the next session at a lower level (bed-level exercise, sitting on the edge of the bed) with pre-oxygenation and ventilator support adjustments agreed with the team, and discusses with the team whether her readiness criteria need revising; frames the event as useful information rather than failure.",
              "Chart exactly what happened: stood at 09:40, HR 96 to 128, SpO2 95% to 86% not recovering in 60 seconds, RR 36, MAP stable at 78, returned to bed, recovered by 09:47 with FiO2 increased. Plan for tomorrow: edge-of-bed sitting and seated marching with pre-oxygenation and a temporary support increase agreed with the team, and standing only if seated activity holds SpO2 above 90%. Raise it on the ward round so the team can look at her lungs and fluid status."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 4: Evaluation (2)
    // ------------------------------------------------------------------
    {
      slug: "ccs-interpret-the-chart-data",
      objective: "Interpreting ECG, arterial blood gases, pulmonary function tests, chest imaging and laboratory values",
      kind: "build",
      title: "Interpret the chart before the first session",
      brief:
        "A fictional 69-year-old man with COPD was admitted 3 days ago with an exacerbation and is referred for mobility and airway clearance. Chart data this morning: arterial blood gas on 2 L/min nasal oxygen -- pH 7.33, PaCO2 58 mm Hg, HCO3- 30 mEq/L, PaO2 64 mm Hg, SpO2 90%. Spirometry from clinic 2 months ago: post-bronchodilator FEV1/FVC 0.56, FEV1 42% predicted. Laboratory: potassium 3.0 mEq/L (reference 3.5-5.0), hemoglobin 13.1 g/dL, white cell count mildly raised and falling. Chest radiograph: hyperinflated lungs, flattened diaphragms, patchy right lower lobe opacity. ECG: sinus tachycardia 104, no acute changes. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Interpret each data set, say what it changes about today's session, and name anything that must be raised with the team before you start.",
          parts: [
            part(
              "Blood gas and oxygen",
              "Interprets a respiratory acidosis with partial metabolic (renal) compensation -- low pH, high PaCO2, raised bicarbonate -- consistent with acute-on-chronic hypercapnic respiratory failure in COPD, mild hypoxemia; notes that the target saturation for someone at risk of hypercapnia is 88-92%, so SpO2 90% is on target and oxygen should not be turned up to 'normal' values during exercise without orders.",
              "pH 7.33 with PaCO2 58 is a respiratory acidosis; bicarbonate 30 shows the kidneys have partly compensated, so this is acute-on-chronic CO2 retention in a chronic retainer. PaO2 64 with SpO2 90% is mild hypoxemia but sits inside the 88-92% target for someone at risk of hypercapnic respiratory failure -- so I keep him at 88-92% during activity and do not chase higher numbers by turning up the oxygen without an order."
            ),
            part(
              "Spirometry, imaging and ECG",
              "Classifies the spirometry as airflow obstruction (post-bronchodilator FEV1/FVC below 0.70) with FEV1 42% predicted in the GOLD 3 (severe) band, relates the radiograph (hyperinflation plus a right lower lobe opacity -- pneumonia or atelectasis) to the need for airway clearance and positioning, and reads the ECG as sinus tachycardia without acute change, likely from hypoxemia, infection and bronchodilators.",
              "FEV1/FVC 0.56 confirms obstruction and FEV1 42% predicted is GOLD 3, severe COPD. The film shows the chronic hyperinflation plus a right lower lobe opacity -- infection or collapse -- which argues for airway clearance (active cycle of breathing, positioning favoring the right lower lobe, early mobility) rather than just a walk. Sinus tachycardia at 104 with no acute ischemic change fits infection, hypoxemia and nebulized bronchodilators."
            ),
            part(
              "Laboratory flags",
              "Identifies hypokalemia (3.0 mEq/L, below the reference range) as an arrhythmia risk that should be raised with the team before exertion, notes hemoglobin is adequate, and the falling white count suggests the infection is responding; defers vigorous exercise until potassium is addressed per the team.",
              "Potassium 3.0 is below the reference range -- hypokalemia raises arrhythmia risk during exertion, so I would call the team before anything strenuous and expect replacement; today becomes breathing and airway clearance, sitting out and a short monitored walk only if the team is happy. Hemoglobin 13.1 is fine. A falling white count means the antibiotics are working."
            ),
          ],
        },
      ],
    },
    {
      slug: "ccs-when-to-stop-in-phase-two",
      objective: "Recognizing decompensation and emergencies that require stopping activity or escalating care",
      kind: "case",
      title: "Two sessions in phase II that should not go ahead",
      brief:
        "A fictional 66-year-old woman with heart failure with reduced ejection fraction (ejection fraction 30%) and prior myocardial infarction attends outpatient (phase II) cardiac rehabilitation. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At check-in: weight 71.8 kg versus 69.2 kg six days ago; she slept propped on three pillows, her ankles are swollen, and she is more breathless walking from the car. Resting heart rate 92, blood pressure 108/70, SpO2 95%, fine crackles at both lung bases.",
          ask: "What is happening and what do you do about today's session?",
          parts: [
            part(
              "Interpretation",
              "Recognizes probable decompensated heart failure: a 2.6 kg weight gain in six days with new orthopnea, peripheral edema, worsening exertional dyspnea and bibasal crackles, and judges that exercise is contraindicated today whatever the exact weight threshold her heart-failure team set.",
              "She is decompensating: 2.6 kg up in six days, three-pillow orthopnea, swollen ankles, worse breathlessness and crackles at both bases. Acute decompensated heart failure is a contraindication to exercise -- today's session does not happen."
            ),
            part(
              "Action",
              "Holds the session, contacts the heart-failure team or cardiologist the same day with the specific findings so medication (diuretic) can be adjusted, gives safety-net advice (emergency services for breathlessness at rest, chest pain or fainting), documents, and sets a re-screen before she next exercises.",
              "No exercise. Call her heart-failure nurse or cardiologist now with the numbers -- weight, orthopnea, edema, crackles, vitals -- so they can adjust her diuretic today. Tell her to call emergency services for breathlessness at rest, chest pain or fainting, document everything, and plan to re-screen her weight, symptoms and chest before she restarts."
            ),
          ],
        },
        {
          text: "Two weeks later, back at her dry weight, she is 12 minutes into treadmill walking at her prescribed intensity when she reports a tight pressure across her chest (3 on a 4-point angina scale) and light-headedness. Telemetry shows 2.5 mm of horizontal ST depression in the lateral leads; blood pressure has fallen from 132/78 at minute 8 to 112/70 at minute 12 although the workload was increased.",
          ask: "Interpret the findings and act.",
          parts: [
            part(
              "Interpretation",
              "Recognizes exercise-induced ischemia with a hypotensive response: moderate-to-severe angina with ischemic ST depression over 2 mm and a systolic fall of more than 10 mm Hg despite increasing workload with other evidence of ischemia -- which meets absolute indications to stop exercise under the AHA standards.",
              "Moderate-to-severe angina plus 2.5 mm horizontal ST depression plus a systolic fall of 20 mm Hg while the workload went up: that is ischemia with a failing blood pressure response. Each of those is an indication to stop; the SBP fall with other ischemic evidence and the moderate-to-severe angina are absolute indications."
            ),
            part(
              "Action",
              "Stops the treadmill immediately with a supported stop (not an abrupt collapse), sits her down, continues monitoring (ECG, blood pressure, symptoms), administers oxygen and nitroglycerin only per standing orders/protocol, activates the program's emergency plan and calls the physician/emergency services if symptoms do not resolve promptly with rest, stays with her, and documents and reports the event; she does not resume until cardiology has reviewed her.",
              "Stop the treadmill now, hold her as it slows, sit her in the chair and keep the ECG and BP cycling. Follow the program's standing orders -- oxygen and nitroglycerin if the protocol allows -- and call the supervising physician immediately; if the chest pressure or ST changes do not settle within a few minutes of rest or she worsens, call emergency services. Stay with her, record the strip, BP trend and times, and she does not exercise again until cardiology has seen her."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 5: Diagnosis and prognosis (2)
    // ------------------------------------------------------------------
    {
      slug: "ccs-what-limits-her-walking",
      objective: "Movement-system diagnosis in cardiovascular and pulmonary disease",
      kind: "build",
      title: "What limits her walking: lungs, heart or legs?",
      brief:
        "A fictional 63-year-old woman with COPD (FEV1 48% predicted) and treated hypertension is assessed for pulmonary rehabilitation. Six-minute walk test: 310 m; she stopped once for 20 seconds. During the test SpO2 fell from 95% to 87% by minute 3 and stayed there; heart rate rose from 84 to 118 (her predicted maximum is about 157); respiratory rate reached 34; she rated dyspnea 7/10 and leg fatigue 3/10 at the end; blood pressure rose appropriately; no chest pain, no arrhythmia. Pursed-lip breathing appeared from minute 2. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the physical therapy diagnosis: the primary system limiting activity with the evidence, the ICF-framed statement, and what it means for the plan of care.",
          parts: [
            part(
              "Limiting system",
              "Identifies a ventilatory/gas-exchange limitation as primary: exercise-induced desaturation (a fall of more than 4% to 87%), very high respiratory rate and dyspnea score with pursed-lip breathing, while the cardiovascular response is submaximal (heart rate well below predicted maximum, appropriate blood pressure, no ischemic signs) and leg fatigue is low, so neither cardiac nor peripheral muscle limits came first.",
              "Her lungs stop her, not her heart or legs: SpO2 fell 8 points to 87% by minute 3 (a drop over 4% is clinically significant), respiratory rate hit 34 with pursed-lip breathing and dyspnea 7/10, while her heart rate only reached 118 of a predicted 157 with a normal blood pressure response and leg fatigue of 3/10. Ventilatory limitation with exertional desaturation is the primary problem."
            ),
            part(
              "ICF statement",
              "Writes an ICF-framed diagnosis: impairments (airflow obstruction, dynamic hyperinflation, exertional hypoxemia, dyspnea), activity limitation (reduced walking distance, 310 m with a rest), participation restriction (whatever she reports), with personal and environmental factors, in a movement-system frame rather than a medical label alone.",
              "Activity limitation in walking endurance (310 m in 6 minutes with one rest) and participation restriction in community and household tasks, due to impaired ventilation and gas exchange (severe airflow obstruction, dynamic hyperinflation and exertional desaturation to 87%) producing dyspnea out of proportion to cardiovascular load; with deconditioning as a secondary contributor and anxiety about breathlessness as a personal factor."
            ),
            part(
              "Implications for the plan",
              "Links the diagnosis to the plan: discuss ambulatory/exercise oxygen assessment with the physician (she desaturates below the usual target range), interval training so she can accumulate work despite ventilatory limits, breathing retraining (pursed-lip breathing, pacing), inspiratory muscle training as indicated, lower-limb strengthening to reduce ventilatory demand per task, and monitored progression with SpO2 and dyspnea as the dosing signals.",
              "Plan follows the diagnosis: ask the physician about an exercise oxygen assessment because she drops to 87% and would need a prescribed target during training; build endurance with interval training (work-rest bouts let her do more total work than continuous walking); teach pursed-lip breathing and pacing; add lower-limb strengthening so each task costs less ventilation; and dose progression by SpO2 and the dyspnea scale rather than heart rate."
            ),
          ],
        },
      ],
    },
    {
      slug: "ccs-prognosis-three-patients",
      objective: "Prognosis across acute, inpatient rehabilitation, outpatient and home settings",
      kind: "build",
      title: "Set the prognosis and setting for three cardiopulmonary patients",
      brief:
        "Three fictional patients are ready to leave the acute hospital. Patient A: 58-year-old, uncomplicated coronary bypass grafting, walking 200 m independently on day 5, lives with a partner, keen to return to office work. Patient B: 71-year-old after 23 days in intensive care for ARDS, with intensive-care-unit-acquired weakness (MRC sum score 40/60), able to sit on the edge of the bed with help and stand for 30 seconds with two assistants, lives alone. Patient C: 76-year-old after a COPD exacerbation, GOLD 3, walking 80 m with a frame and SpO2 maintained at 90% on 2 L/min, lives with a daughter, has never had pulmonary rehabilitation. Fictional patients; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each patient, give the realistic prognosis with the factors that drive it, the recommended next setting and program, and the one factor most likely to limit the outcome.",
          parts: [
            part(
              "Patient A",
              "Gives a good prognosis for full functional recovery and return to work over weeks to months, recommends home with early enrollment in outpatient (phase II) cardiac rehabilitation and a graded home walking program within sternal precautions set by the surgeon, and names the main limiter (for example non-attendance at rehabilitation, mood, or sternal healing complications).",
              "Patient A: excellent prognosis -- independent at 200 m on day 5, young, supported, motivated. Home with a progressive walking program inside the surgeon's sternal precautions and enrollment in phase II cardiac rehabilitation as soon as the program accepts him; office work within weeks as the surgeon allows. The thing most likely to limit him is not turning up to rehabilitation, so the referral goes before he leaves."
            ),
            part(
              "Patient B",
              "Gives a guarded, slow prognosis typical of post-intensive-care syndrome with ICU-acquired weakness (recovery over months, with possible long-term weakness, cognitive and psychological sequelae), recommends inpatient rehabilitation (he cannot be alone and needs daily multidisciplinary therapy), and identifies the key limiter (severity of weakness, nutrition, cognition/mood, or living alone).",
              "Patient B: guarded. ICU-acquired weakness with an MRC score of 40/60 after three weeks of critical illness recovers over months, not weeks, and post-intensive-care syndrome often adds fatigue, memory and mood problems. He cannot stand without two people and lives alone, so inpatient rehabilitation with daily PT, OT and nutrition input, then home with services. The biggest limiter is the depth of his weakness combined with having no one at home."
            ),
            part(
              "Patient C",
              "Gives a fair prognosis with a high risk of readmission, recommends home with her daughter plus referral to pulmonary rehabilitation to start within about 3 weeks of discharge (the strongly recommended, time-sensitive intervention after a COPD hospitalization), an oxygen plan per the physician (her SpO2 target is 88-92%), home exercise in the interim, and names the limiter (readmission from another exacerbation, oxygen access, or frailty).",
              "Patient C: fair, with a real readmission risk. Home with her daughter and a frame, but the decisive step is pulmonary rehabilitation starting within about 3 weeks of discharge -- the strong recommendation after a COPD hospitalization -- with a simple daily walking plan until it starts and her oxygen prescription kept to the 88-92% target set by the physician. What is most likely to derail her is another exacerbation before rehabilitation begins."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 6: Plan of care and interventions (2)
    // ------------------------------------------------------------------
    {
      slug: "ccs-phase-two-prescription-with-icd",
      objective: "Exercise prescription and progression in cardiac rehabilitation phases",
      kind: "build",
      title: "A phase II prescription for a patient with an ICD",
      brief:
        "A fictional 62-year-old man starts outpatient cardiac rehabilitation 4 weeks after an anterior myocardial infarction treated with a stent; his ejection fraction is 32% and he received an implantable cardioverter-defibrillator (ICD) 10 days ago. He takes a beta-blocker. Entry symptom-limited exercise test: peak heart rate 126, resting 60, no ischemia or arrhythmia, stopped for leg fatigue at an RPE of 17. The device clinic has given you his ICD's programmed detection rate and asked that his exercise heart rate stay safely below it. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write his aerobic prescription (with the numbers), the resistance training plan, and the ICD- and device-specific precautions.",
          parts: [
            part(
              "Aerobic prescription",
              "Prescribes using heart rate reserve from the actual test (peak 126, rest 60, reserve 66): 40-80% of reserve gives roughly 86-113 beats per minute, starting at the lower end and progressing, cross-checked with RPE 11-16 because the beta-blocker blunts heart rate; sets frequency (3 or more sessions a week), duration (building to 30-60 minutes with warm-up and cool-down), and progression rules.",
              "Heart-rate reserve from his own test: 126 - 60 = 66. 40-80% of reserve is 60 + 26 to 60 + 53, so about 86-113 bpm; start at 86-95 (RPE 11-13) and progress toward 100-113 (RPE up to 15-16) over weeks, using RPE and the talk test alongside heart rate because he is beta-blocked. Three supervised sessions a week plus home walking, 20 minutes building to 40-60 with a 5-10 minute warm-up and cool-down; add 5 minutes or a small intensity step each week he tolerates well."
            ),
            part(
              "Resistance training",
              "Adds resistance training only when cleared by the cardiology/device team and the ICD incision has healed, starting light (an RPE anchor, 1 set of 10-15 repetitions for major muscle groups, 2-3 days a week, no breath-holding), with upper-body and arm movements on the device side limited initially per the device clinic's instructions.",
              "Resistance training starts when cardiology and the device clinic clear it and the pocket has healed: 2-3 days a week, 8-10 exercises for the major muscle groups, 1 set of 10-15 reps at a light-to-moderate RPE, breathing out on effort and no Valsalva, progressing load slowly. Keep the left arm below shoulder height and avoid heavy pulling on the device side for the period the device clinic specifies."
            ),
            part(
              "ICD precautions",
              "Keeps peak exercise heart rate below the programmed detection rate by the margin the device clinic specified, uses the device-clinic number explicitly in the prescription, avoids high-intensity bursts that could cross it, monitors rhythm during sessions, has a plan for a shock (stop, sit, assess, call the physician; emergency services for repeated shocks or loss of consciousness), and protects the pocket from direct pressure and equipment straps.",
              "Write the device clinic's detection rate on his prescription and cap his training heart rate well below it by the margin they set -- the upper training number above is only used if it still sits under that cap. No sprints or intervals that could spike the rate across it. Telemetry in the early sessions. If he gets a shock: stop, sit, check he is alert, record what he was doing, call the physician; call emergency services for more than one shock or if he loses consciousness. No chest straps over the pocket and no contact or heavy pressure on it."
            ),
          ],
        },
      ],
    },
    {
      slug: "ccs-pulmonary-rehab-gold-3",
      objective: "Pulmonary rehabilitation: airway clearance, breathing retraining, inspiratory muscle training and oxygen titration",
      kind: "case",
      title: "Building a pulmonary rehabilitation plan for severe COPD",
      brief:
        "A fictional 70-year-old man with GOLD 3 COPD and chronic hypercapnia (resting PaCO2 52 mm Hg) starts pulmonary rehabilitation. He has a chronic productive cough, uses 2 L/min oxygen at home at rest, and his physician's exercise oxygen order says 'titrate to keep SpO2 88-92%'. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Assessment: 6-minute walk 280 m on 2 L/min with SpO2 falling to 84% at minute 4 and recovering to 90% with rest; dyspnea 8/10 at the end; he cannot sustain more than 3 minutes of continuous cycling at the target intensity. Maximal inspiratory pressure is reduced. He produces about a tablespoon of sputum each morning and says it is hard to clear.",
          ask: "Write his first 4 weeks: the exercise structure, oxygen handling and breathing and airway components.",
          parts: [
            part(
              "Exercise structure",
              "Chooses interval training for endurance because he cannot sustain continuous work (for example 1-2 minute work bouts at target intensity with equal or longer recovery, accumulating 20-30 minutes), plus progressive lower- and upper-limb resistance training, as the combination with the most benefit; sets progression by increasing work bout length or intensity.",
              "Interval training: 1-minute bouts at his target intensity with 1-2 minute easy recoveries, 8-10 bouts, building toward 2-minute bouts and 25-30 minutes total by week 4, because he cannot hold continuous work for more than 3 minutes. Add lower-limb strengthening (sit-to-stand, leg press, step-ups) and upper-limb work 2-3 times a week -- endurance plus resistance gives the biggest gains."
            ),
            part(
              "Oxygen handling",
              "Follows the physician's order and the hypercapnic target: titrate supplemental oxygen during exercise to keep SpO2 88-92%, increase flow during exertion only within the prescribed range and reduce it in recovery, monitor for signs of CO2 retention (drowsiness, headache, confusion), and report if the ordered range cannot be held.",
              "He desaturates to 84% on 2 L/min, so during exercise turn the flow up within the physician's order to hold 88-92%, then back down in recovery -- never aim for higher saturations because of his chronic hypercapnia. Watch for drowsiness, headache or confusion during and after sessions (CO2 retention) and tell the physician if the 88-92% range cannot be kept at the ordered flow."
            ),
            part(
              "Breathing and airway clearance",
              "Adds breathing retraining (pursed-lip breathing and pacing with exercise, forward-lean recovery positions), a daily airway clearance routine for his productive cough (for example active cycle of breathing technique or a positive expiratory pressure device, timed before exercise), and inspiratory muscle training with a threshold device at an individually set load progressed over weeks given the reduced maximal inspiratory pressure.",
              "Teach pursed-lip breathing timed to his cycling and forward-lean recovery positions. Set a daily morning airway clearance routine -- the active cycle of breathing technique or an oscillating PEP device -- done before he exercises so he starts clear. Start threshold inspiratory muscle training at a load set from his measured MIP, 2 sessions a day, progressed as it gets easy, and re-measure MIP at 4 weeks."
            ),
          ],
        },
        {
          text: "Week 5: he has an increase in sputum volume and purulence over 2 days, more breathlessness at rest, and his resting SpO2 on 2 L/min is 86%; temperature 37.9 C; he is alert and oriented.",
          ask: "What is this and what do you do with his rehabilitation this week?",
          parts: [
            part(
              "Recognition",
              "Recognizes a probable acute exacerbation of COPD (increased sputum volume and purulence, increased dyspnea, low-grade fever, resting SpO2 below his target range) and that exercise training is held until he is assessed and treated.",
              "An acute exacerbation: two days of more and greener sputum, breathlessness at rest, a low-grade temperature and resting SpO2 of 86% -- below his 88-92% target even at rest. No exercise training today."
            ),
            part(
              "Action",
              "Contacts his physician the same day for assessment and treatment (and emergency services if he deteriorates -- confusion, drowsiness, severe breathlessness), supports airway clearance within his tolerance, checks oxygen is at the ordered flow with the hypercapnic target in mind, gives safety-net advice, and plans to resume rehabilitation at a reduced level once he is treated and stable, because continuing the program after an exacerbation is strongly recommended.",
              "Call his physician today for assessment and treatment of the exacerbation; check his oxygen is at the ordered flow and do not push it up to 'normal' because he retains CO2. Help him with gentle airway clearance if he can manage it. Tell him and his family to call emergency services for drowsiness, confusion or severe breathlessness. Once treated and stable, bring him straight back at a lower starting level -- rehabilitation after an exacerbation is one of the strongest recommendations we have."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 7: Outcomes (1)
    // ------------------------------------------------------------------
    {
      slug: "ccs-did-rehab-work-outcomes",
      objective: "Outcome measures for exercise capacity, dyspnea, quality of life and participation",
      kind: "build",
      title: "Did eight weeks of pulmonary rehabilitation work?",
      brief:
        "A fictional 67-year-old woman with COPD completed 8 weeks of pulmonary rehabilitation. Before and after: 6-minute walk 320 to 362 m (two tests each time, best used); COPD Assessment Test (CAT) 24 to 21; St George's Respiratory Questionnaire total 58 to 52; mMRC dyspnea grade 3 to 2; she has returned to her weekly choir and gardening. The program coordinator asks you to summarize her outcome for the annual report and to decide what to recommend to her next. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Interpret each change against its published minimal important difference, categorize the measures by what they capture, and write the recommendation for what comes next.",
          parts: [
            part(
              "Changes against MIDs",
              "Interprets: 6MWT +42 m exceeds the 30 m minimal important difference; CAT -3 exceeds its MCID of 2 points; SGRQ -6 units exceeds its MCID of 4 units; mMRC improved one grade (from 'more breathless' category 3 to 2, still at the 'more symptoms' threshold used in GOLD assessment); all point to clinically meaningful improvement.",
              "6MWT +42 m: beyond the 30 m minimal important difference. CAT 24 to 21: a 3-point fall, beyond the 2-point MCID. SGRQ 58 to 52: a 6-unit fall, beyond the 4-unit MCID. mMRC 3 to 2: one grade better, though grade 2 is still the GOLD threshold for 'more breathlessness'. Every measure moved by more than its noise -- a clinically meaningful result."
            ),
            part(
              "What each measure captures",
              "Categorizes: 6MWT as exercise capacity (functional performance), mMRC as dyspnoea/symptom severity, CAT as symptom burden/health status, SGRQ as disease-specific health-related quality of life, and choir and gardening as participation, noting that no single measure covers all domains.",
              "Exercise capacity: the 6-minute walk. Dyspnea: mMRC. Symptom burden and health status: CAT. Disease-specific quality of life: SGRQ. Participation: back to choir and gardening -- the outcome she cares about, which none of the scores measure directly. Reporting all four plus her own goals is the honest picture."
            ),
            part(
              "Recommendation",
              "Recommends a maintenance plan after the program (the guideline's conditional recommendation leaves supervised maintenance or usual care both reasonable, so it is tailored to her): a continued home or community exercise routine, options such as a maintenance class or telerehabilitation, re-referral after any hospitalization, and periodic re-measurement; summarizes her result for the report in one or two lines with the MIDs.",
              "Report line: 'Clinically meaningful improvement in exercise capacity (+42 m, MID 30), symptoms (CAT -3, MCID 2), quality of life (SGRQ -6, MCID 4) and dyspnea (mMRC 3 to 2); returned to choir and gardening.' Next: the maintenance evidence is only conditional, so tailor it -- a written home program of walking and strengthening 3-5 days a week, the community maintenance class if she wants supervision, re-referral to rehabilitation after any exacerbation admission, and repeat the 6MWT and CAT at 6 and 12 months."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------------------------
    // Unit 8: Diagnosis frequency distribution (1): a case on a
    // frequently-seen diagnosis the objective names (peripheral
    // atherosclerosis).
    // ------------------------------------------------------------------
    {
      slug: "ccs-claudication-supervised-exercise",
      objective: "Frequently-seen diagnoses (60% of items): coronary and peripheral atherosclerosis, heart failure, hypertension, dysrhythmia, myocardial infarction, pulmonary edema, COPD, pneumonia, atelectasis and respiratory failure",
      kind: "case",
      title: "Supervised exercise for intermittent claudication",
      brief:
        "A fictional 69-year-old man with peripheral artery disease is referred for supervised exercise therapy. Fictional patient; exam practice, not clinical guidance.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "He has bilateral calf claudication after about 120 m on the flat, relieved within 2-3 minutes of standing still; ankle-brachial index 0.62 on the right and 0.70 on the left; he also has coronary artery disease (stent 3 years ago, no angina), type 2 diabetes with mild sensory neuropathy, and still smokes. He takes a statin and an antiplatelet. His physician has cleared him for exercise.",
          ask: "Write the supervised exercise prescription with its parameters and the reasoning, and the safety and foot-care precautions specific to him.",
          parts: [
            part(
              "Prescription",
              "Prescribes guideline-based supervised exercise therapy (Class 1 recommendation): treadmill or track walking to moderate-to-severe claudication pain, rest until it resolves, repeat, for sessions of at least 30-45 minutes, at least 3 times a week, for at least 12 weeks, progressing speed or grade as claudication distance improves; may add a structured community-based program afterwards.",
              "Supervised exercise therapy, the Class 1 treatment for claudication: treadmill walking at a speed and grade that brings on moderate-to-severe calf pain within 3-5 minutes, stop and rest standing or seated until it goes, walk again, and repeat for at least 30-45 minutes of walking per session, 3 times a week for at least 12 weeks. When he reaches 8-10 minutes before pain, raise the grade or speed. Afterwards, a structured community-based walking program to keep the gains."
            ),
            part(
              "Reasoning",
              "Explains why walking to pain is appropriate in claudication (ischemic muscle pain that resolves with rest is the training stimulus, not a danger signal, in the absence of rest pain or tissue loss), while noting the cardiac history means standard cardiac monitoring applies (claudication patients have high coronary risk) and that the ABIs confirm moderate PAD.",
              "Claudication pain is the training stimulus: it is reversible ischemic muscle pain, not tissue damage, so walking into it and recovering repeatedly improves walking distance -- unlike rest pain, ulcers or gangrene, which would stop the program. His ABIs (0.62 and 0.70) confirm moderate disease. Because PAD travels with coronary disease and he has a stent, we monitor heart rate, blood pressure and symptoms as in cardiac rehabilitation and stop for angina or an abnormal pressure response."
            ),
            part(
              "Precautions",
              "Adds person-specific precautions: daily foot inspection and proper footwear because of diabetic neuropathy and PAD (reduced sensation plus poor perfusion raise ulcer risk), report any foot wound or new rest pain immediately, glucose management around sessions, smoking cessation support as a core part of care, and stop criteria for cardiac symptoms.",
              "Feet first: with neuropathy and PAD he may not feel a blister that will not heal, so inspect his feet before and after every session, use well-fitting shoes and seamless socks, and treat any wound or new rest pain as urgent to the physician. Check how his glucose behaves around sessions. Refer him to smoking cessation -- it is treatment for his arteries, not an add-on. Stop for chest pain, dizziness or an abnormal blood pressure response, as in cardiac rehabilitation."
            ),
          ],
        },
        {
          text: "At 12 weeks his pain-free walking distance has risen from 120 m to 310 m and maximal walking distance from 250 m to 540 m; he has cut down to 3 cigarettes a day. He asks whether he can stop coming and whether a home program is enough, and mentions a small blister on his right heel from new shoes last week that 'has not changed'.",
          ask: "Respond to both the question and the blister.",
          parts: [
            part(
              "Transition plan",
              "Recognizes substantial, meaningful improvement in both distances, supports transition to a structured community- or home-based program that keeps the same walk-rest structure and dose (several sessions a week), with periodic review, and continues to support smoking cessation; explains that gains are lost if he stops walking.",
              "He has more than doubled both distances -- a real response. He can move to a structured home or community program: the same walk-to-pain, rest, repeat pattern for 30-45 minutes, at least 3 days a week, with a log and a check-in at 3 and 6 months, because the benefit disappears if he stops. And three cigarettes a day is progress worth building on -- keep the cessation support going."
            ),
            part(
              "The blister",
              "Treats a heel blister that has not healed in a week in a person with diabetes, neuropathy and PAD as a potential diabetic foot ulcer: inspect it, stop walking on it until assessed, arrange prompt review by the physician or foot/wound team (the same day or next day), document, and reinforce footwear and daily inspection.",
              "A heel blister that has not changed in a week on a foot with neuropathy and an ABI of 0.62 is a wound that may not heal on its own. Look at it now, offload it, no treadmill on that foot until it has been seen, and get him to the physician or wound/foot clinic within a day. Document the size and appearance, and go back over footwear and daily foot checks with him."
            ),
          ],
        },
      ],
    },
  ],
};
