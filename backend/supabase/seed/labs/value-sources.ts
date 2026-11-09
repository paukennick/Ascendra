// REQ-142: what each clinical and fitness lab's own values rest on.
//
// The lab sets cite the exam outline the labs are aligned to (CCRN handbook,
// NCLEX test plan, NASM blueprint). That says a topic belongs on the exam; it
// does not say a blood-pressure limit, a dose or a target is right. Here every
// NCLEX-RN, CCRN and NASM-CPT lab either names the guideline (or the
// certifying body's own material) its values rest on, or says why it names
// none. lib/labs.test.ts requires one or the other for every lab, so a new lab
// cannot quote a value without that decision.
//
// Kept apart from the lab files on purpose: nothing here changes what a lab
// says or its content hash, so attaching a source never sends an approved lab
// back to needs_expert_review. labs.sources stores these URLs after the set's.
//
// Every guideline below was checked on 2026-11-08 against the publisher's own
// page or record (SCCM, AHA, ADA/EASD, ATS, AAP, ISPAD, BTS, AABB, NPIAP/EPUAP,
// NASM). Where the full text was not reachable, the note says so and the value
// is listed as not verified in PR #44. Where a lab's wording disagrees with
// the current guideline, the lab was NOT changed: the disagreement is listed
// in PR #44 for the clinical reviewer (docs/labs.md), with the guideline link.

import { source, type SourceRef } from "../sources";
import type { SeedLabSet } from "./types";
import {
  ACS_FIELD_TRIAGE_2021,
  AHA_2025_ADULT_ALS,
  AHA_2025_ADULT_BLS,
  AHA_2025_PEDIATRIC_BLS,
  NASEMSO_MODEL_GUIDELINES_V3,
  SCOPE_OF_PRACTICE_2019,
} from "./ems-sources";
import { ADA_HYPOGLYCEMIA, CDC_EBP, CDC_HAND_HYGIENE, CDC_TBP, ISMP_ABBREVIATIONS, NCSBN_ANA_DELEGATION } from "./nursing-sources";

const CHECKED = "2026-11-08";
const guideline = (url: string) => source(url, "clinical_guideline", CHECKED);

// --- Guidelines ---------------------------------------------------------------

// Surviving Sepsis Campaign adult guidelines 2026 (Crit Care Med, published
// 2026-03-23, DOI 10.1097/CCM.0000000000007075). SCCM page: initial MAP target
// 65 mm Hg (60-65 suggested from age 65), at least 30 mL/kg crystalloid in 3 h
// for hypoperfusion, norepinephrine first line, cultures before antimicrobials,
// antimicrobials within 1 h for shock.
const SSC_ADULT_2026 = guideline(
  "https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026"
);
// Surviving Sepsis Campaign children 2026 (Pediatr Crit Care Med, 2026-03-23,
// DOI 10.1097/PCC.0000000000003927). SCCM page: 10-20 mL/kg per bolus, up to
// 40-60 mL/kg in the first hour with intensive care, stop for fluid overload;
// no preference between epinephrine and norepinephrine.
const SSC_CHILDREN_2026 = guideline(
  "https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-the-management-of-sepsis-and-septic-shock-in"
);
// AHA/ASA 2026 Guideline for the Early Management of Patients With Acute
// Ischemic Stroke (Stroke, 2026-01-26, DOI 10.1161/STR.0000000000000513).
// Recommendations 5 and 7: SBP <185 and DBP <110 mm Hg before IVT; <180/105
// for at least 24 h after. Read in the guideline PDF (ahajournals.org full
// text answered 403; read from a copy of the same PDF, "Downloaded from
// ahajournals.org").
const AIS_2026 = guideline(
  "https://professional.heart.org/en/guidelines-statements/2026-guideline-for-the-early-management-of-patients-with-acute-ischemic-strokestr0000000000000513"
);
// Hyperglycemic Crises in Adults With Diabetes: A Consensus Report (ADA,
// EASD, JBDS, AACE, DTS; Diabetes Care 2024;47:1257, DOI 10.2337/dci24-0032,
// published simultaneously in Diabetologia). Read in the Diabetologia text:
// delay insulin until potassium is >3.5 mmol/L; add 5-10% dextrose when
// glucose falls below 250 mg/dL; basal insulin at least 1-2 h before stopping
// the IV infusion; resolution = ketones <0.6 mmol/L and venous pH >=7.3 or
// bicarbonate >=18 mmol/L, "the anion gap should not be used as a criterion".
const HYPERGLYCEMIC_CRISES_2024 = guideline("https://doi.org/10.2337/dci24-0032");
// ATS/ESICM/SCCM clinical practice guideline: mechanical ventilation in adult
// ARDS (Am J Respir Crit Care Med 2017, DOI 10.1164/rccm.201703-0548ST):
// tidal volume 4-8 mL/kg predicted body weight and plateau pressure <30 cm H2O.
// The 2024 ATS update (DOI 10.1164/rccm.202311-2011ST) changes corticosteroids,
// ECMO, neuromuscular blockade and PEEP, not these. Berlin Definition (JAMA
// 2012, DOI 10.1001/jama.2012.5669): moderate ARDS is PaO2/FiO2 100-200.
const ARDS_VENTILATION_2017 = guideline("https://doi.org/10.1164/rccm.201703-0548ST");
const ARDS_UPDATE_2024 = guideline("https://doi.org/10.1164/rccm.202311-2011ST");
const ARDS_BERLIN_2012 = guideline("https://doi.org/10.1001/jama.2012.5669");
// STS expert consensus for resuscitation after cardiac surgery (Ann Thorac
// Surg 2017, DOI 10.1016/j.athoracsur.2016.10.033): tamponade and bleeding
// need emergency resternotomy. AHA scientific statement on cardiogenic shock
// (Circulation 2017, DOI 10.1161/CIR.0000000000000525) for the low-output
// picture; its cardiac index threshold (the lab's "below about 2.2") was not
// readable (full text 403) and is listed as not verified.
const STS_RESUSCITATION_2017 = guideline("https://doi.org/10.1016/j.athoracsur.2016.10.033");
const AHA_CARDIOGENIC_SHOCK_2017 = guideline("https://doi.org/10.1161/CIR.0000000000000525");
// AHA/AAP 2025 Guidelines, Part 8: Pediatric Advanced Life Support
// (Circulation 2025, DOI 10.1161/CIR.0000000000001368). Full text 403; the
// SVT values (adenosine 0.1 mg/kg, max 6 mg; synchronized cardioversion
// 0.5-1 J/kg then 2 J/kg) match the American Red Cross 2025 PALS card.
const PALS_2025 = guideline("https://doi.org/10.1161/CIR.0000000000001368");
// ISPAD Clinical Practice Consensus Guidelines 2022: DKA and HHS (Pediatr
// Diabetes 2022, DOI 10.1111/pedi.13406), still ISPAD's current DKA chapter on
// ispad.org (the 2024 set did not replace it). Full text not reachable: the
// 0.05-0.1 units/kg/h infusion is listed as not verified.
const ISPAD_DKA_2022 = guideline("https://doi.org/10.1111/pedi.13406");
// Brain Trauma Foundation pediatric severe TBI guidelines, 3rd ed. (Pediatr
// Crit Care Med 2019, DOI 10.1097/PCC.0000000000001735): hyperosmolar therapy,
// hyperventilation only as a temporary measure. It does not set a head-of-bed
// angle; the lab's "about 30 degrees" is nursing practice.
const BTF_PEDIATRIC_TBI_2019 = guideline("https://doi.org/10.1097/PCC.0000000000001735");
// AAP clinical report, Therapeutic Hypothermia for Neonatal Hypoxic-Ischemic
// Encephalopathy (Pediatrics 2026, DOI 10.1542/peds.2025-073627): 33.5-34.5 C,
// started within 6 h of birth, for 72 h, at >=36 0/7 weeks. AHA/AAP 2025
// Part 5: Neonatal Resuscitation (DOI 10.1161/CIR.0000000000001367).
const AAP_HYPOTHERMIA_HIE_2026 = guideline("https://doi.org/10.1542/peds.2025-073627");
const NEONATAL_RESUSCITATION_2025 = guideline("https://doi.org/10.1161/CIR.0000000000001367");
// AAP Clinical Practice Guideline Revision: Hyperbilirubinemia in the Newborn
// Infant >=35 Weeks (Pediatrics 2022, DOI 10.1542/peds.2022-058859).
const AAP_HYPERBILIRUBINEMIA_2022 = guideline("https://doi.org/10.1542/peds.2022-058859");
// AAP clinical report, Neonatal Opioid Withdrawal Syndrome (Pediatrics 2020,
// DOI 10.1542/peds.2020-029074). The Eat, Sleep, Console figures in the lab
// (sleeps an hour, consoled within about 10 minutes) were not found in what
// could be read and are listed as not verified.
const AAP_NOWS_2020 = guideline("https://doi.org/10.1542/peds.2020-029074");
// BTS guideline for oxygen use in healthcare and emergency settings (Thorax
// 2017); BTS page: target 88-92% for known COPD or other risk of hypercapnic
// respiratory failure, 94-98% otherwise.
const BTS_OXYGEN = guideline("https://www.brit-thoracic.org.uk/clinical-resources/guidelines/emergency-oxygen/");
// AABB Circular of Information for the Use of Human Blood and Blood
// Components (June 2024): only 0.9% sodium chloride in the same tubing; start
// slowly with observation. It does not name the "first 15 minutes".
const AABB_CIRCULAR_2024 = guideline("https://www.aabb.org/news-resources/resources/circular-of-information");
// International Guideline for the Prevention and Treatment of Pressure
// Ulcers/Injuries, 4th edition (2026; EPUAP, NPIAP, PPPIA). The online
// guideline needs access; the Braden bands and the 2-hour interval in the lab
// are listed as not verified.
const PRESSURE_INJURY_GUIDELINE_2026 = guideline("https://www.internationalguideline.com/");
// NASM's own OPT model page: Phase 1 Stabilization Endurance at 12-20
// repetitions, slower tempo, lower load. Sets, the 4/2/1 tempo and 0-90 s rest
// are the CPT 7 textbook's and are not on the page.
const NASM_OPT_MODEL = source("https://www.nasm.org/certified-personal-trainer/the-opt-model", "reference", CHECKED);

// --- Per lab ------------------------------------------------------------------

type ValueSources = Record<string, SourceRef[] | { none: string }>;

const NO_VALUE = "Quotes no clinical threshold, dose or target (recognition, priorities, communication or ethics).";
const CASE_DATA = "Its numbers are the fictional patient's own readings, not a threshold or dose the lab teaches.";

export const VALUE_SOURCES: Record<string, ValueSources> = {
  CCRNADULT: {
    "post-cabg-tamponade": [STS_RESUSCITATION_2017, AHA_CARDIOGENIC_SHOCK_2017],
    "shock-hemodynamic-profiles": { none: "Classifies shock states from directions (high/low), with no threshold or dose." },
    "ards-ventilator-case": [ARDS_VENTILATION_2017, ARDS_UPDATE_2024, ARDS_BERLIN_2012],
    "choose-respiratory-support": { none: "Chooses a level of support; the only number is a general 'first hour or two' to reassess." },
    "dka-case": [HYPERGLYCEMIC_CRISES_2024],
    "trali-vs-taco": { none: NO_VALUE },
    "acute-ischemic-stroke-case": [AIS_2026],
    "delirium-cam-icu": { none: "Applies the CAM-ICU features; no threshold or dose." },
    "sepsis-escalation-case": [SSC_ADULT_2026],
    "multi-patient-priorities": [SSC_ADULT_2026],
    "sbar-escalation-advocacy": { none: CASE_DATA },
    "advance-directive-conflict": { none: NO_VALUE },
  },
  CCRNPEDS: {
    "peds-hypercyanotic-spell-case": { none: "Names treatments without doses." },
    "peds-svt-infant": [PALS_2025],
    "peds-status-asthmaticus-case": { none: "Names treatments (magnesium, ipratropium) without doses." },
    "peds-intubated-deterioration-dope": { none: NO_VALUE },
    "peds-dka-cerebral-edema-case": [ISPAD_DKA_2022],
    "peds-di-siadh-csw": { none: CASE_DATA },
    "peds-tbi-icp-case": [BTF_PEDIATRIC_TBI_2019],
    "peds-maltreatment-recognition": { none: NO_VALUE },
    "pediatric-septic-shock-case": [SSC_CHILDREN_2026],
    "peds-pain-scales-by-age": { none: "Matches validated pain scales to age; no threshold or dose." },
    "peds-asthma-discharge-teaching": { none: NO_VALUE },
    "peds-family-presence-resuscitation": { none: NO_VALUE },
  },
  CCRNNEO: {
    "neo-pphn-case": { none: CASE_DATA },
    "neo-ductal-dependent-lesion": { none: "Names prostaglandin E1 and its adverse effects without a dose." },
    "neo-preterm-rds-case": { none: "Defers the oxygen threshold for surfactant and the saturation target to unit protocol." },
    "neo-pneumothorax-chest-tube": { none: NO_VALUE },
    "neo-nec-case": { none: NO_VALUE },
    "neo-abo-hemolytic-jaundice": [AAP_HYPERBILIRUBINEMIA_2022],
    "neo-hie-cooling-case": [AAP_HYPOTHERMIA_HIE_2026, NEONATAL_RESUSCITATION_2025],
    "neo-pain-assessment-comfort": { none: NO_VALUE },
    "infant-of-diabetic-mother-hypoglycemia": { none: "Defers the glucose treatment threshold to the unit's protocol." },
    "neo-opioid-withdrawal-esc": [AAP_NOWS_2020],
    "neo-discharge-teaching-interpreter": { none: "Safe-sleep teaching with no threshold or dose (not sourced this pass)." },
    "neo-kangaroo-care-ventilated": { none: CASE_DATA },
  },
  NCLEXRN: {
    "who-first-post-op-bleeding": { none: CASE_DATA },
    "sbar-handoff": { none: CASE_DATA },
    "match-transmission-precautions": { none: "Matches precaution types; no threshold or dose (not sourced this pass)." },
    "restraint-alternatives-case": { none: NO_VALUE },
    "naegele-edd": { none: "A dating calculation (Naegele's rule), not a clinical threshold." },
    "teach-back-glucose-monitoring": { none: NO_VALUE },
    "suicide-risk-case": { none: NO_VALUE },
    "pressure-injury-prevention": [PRESSURE_INJURY_GUIDELINE_2026],
    "dosage-calculations": { none: "Fictional medications; the arithmetic is the content." },
    "transfusion-reaction-case": [AABB_CIRCULAR_2024],
    "femoral-site-after-catheterization": { none: NO_VALUE },
    "hypokalemia-before-digoxin": { none: "The potassium range is the case's own laboratory reference range." },
    "copd-exacerbation-abg": [BTS_OXYGEN],
    "increased-icp-case": { none: "Head of bed about 30 degrees is nursing practice; no guideline found that sets it." },
  },
  // REQ-148: NCLEX-PN. Its sources live in nursing-sources.ts (checked
  // 2026-11-07 by the nursing labs' author); each lab below names the ones its
  // values rest on, as that file's header and the lab set's header describe.
  NCLEXPN: {
    "pn-who-needs-the-rn-now": { none: CASE_DATA },
    "pn-assign-or-not": [NCSBN_ANA_DELEGATION],
    "pn-precautions-four-residents": [CDC_TBP, CDC_EBP, CDC_HAND_HYGIENE],
    "pn-fall-found-on-floor": { none: NO_VALUE },
    "pn-postpartum-boggy-fundus": { none: CASE_DATA },
    "pn-alcohol-withdrawal": { none: CASE_DATA },
    "pn-therapeutic-responses": { none: NO_VALUE },
    "pn-pain-data-dementia": { none: NO_VALUE },
    "pn-immobility-dvt-pe": { none: CASE_DATA },
    "pn-dosage-calculations": { none: "Fictional medications; the arithmetic is the content." },
    "pn-medication-rights-case": [ISMP_ABBREVIATIONS],
    "pn-hypoglycemia-case": [ADA_HYPOGLYCEMIA],
    "pn-trends-against-baseline": { none: CASE_DATA },
    "pn-anaphylaxis-first-dose": { none: "Names intramuscular epinephrine as the first drug without a dose; the other numbers are the client's own readings." },
  },
  // REQ-174: NREMT EMT. Sources in ems-sources.ts (read 2026-11-09). The
  // Scope of Practice Model is a "reference" (12-month re-check) and backs
  // what the EMT may do; the clinical values rest on clinical guidelines.
  NREMTEMT: {
    "emt-mci-minibus-rollover": [NASEMSO_MODEL_GUIDELINES_V3],
    "emt-field-triage-destinations": [ACS_FIELD_TRIAGE_2021],
    "emt-arrest-in-a-restroom": [AHA_2025_ADULT_BLS, NASEMSO_MODEL_GUIDELINES_V3],
    "emt-chest-pain-own-nitro": [NASEMSO_MODEL_GUIDELINES_V3, SCOPE_OF_PRACTICE_2019],
    "emt-stroke-woke-with-symptoms": [NASEMSO_MODEL_GUIDELINES_V3],
    "emt-hypoglycemia-reassessment": [NASEMSO_MODEL_GUIDELINES_V3, SCOPE_OF_PRACTICE_2019],
    "emt-chainsaw-thigh-bleed": [NASEMSO_MODEL_GUIDELINES_V3, ACS_FIELD_TRIAGE_2021],
    "emt-peanut-anaphylaxis-child": [NASEMSO_MODEL_GUIDELINES_V3, SCOPE_OF_PRACTICE_2019],
    "emt-pcr-narrative": { none: CASE_DATA },
    "emt-refusal-after-crash": [NASEMSO_MODEL_GUIDELINES_V3],
  },
  // REQ-174: NREMT EMR, sources as for NREMTEMT.
  NREMTEMR: {
    "emr-mci-grandstand-collapse": [NASEMSO_MODEL_GUIDELINES_V3],
    "emr-wires-down-crash": { none: "Quotes no clinical threshold or dose; electrical-hazard practice not sourced this pass (listed for the EMS reviewer)." },
    "emr-arrest-at-the-gym": [AHA_2025_ADULT_BLS],
    "emr-choking-infant": [AHA_2025_PEDIATRIC_BLS],
    "emr-opioid-naloxone-intranasal": [NASEMSO_MODEL_GUIDELINES_V3, SCOPE_OF_PRACTICE_2019],
    "emr-older-fall-anticoagulant": [ACS_FIELD_TRIAGE_2021],
    "emr-heat-stroke-runner": [NASEMSO_MODEL_GUIDELINES_V3],
    "emr-glass-door-forearm": [NASEMSO_MODEL_GUIDELINES_V3],
    "emr-precipitous-delivery": [NASEMSO_MODEL_GUIDELINES_V3, SCOPE_OF_PRACTICE_2019],
    "emr-handoff-to-crew": { none: CASE_DATA },
    "emr-injured-child-no-parent": [NASEMSO_MODEL_GUIDELINES_V3],
  },
  // REQ-182: NREMT Paramedic and AEMT, sources as for NREMTEMT.
  NREMTPARAMEDIC: {
    "medic-flash-pulmonary-edema": [NASEMSO_MODEL_GUIDELINES_V3],
    "medic-capnography-four-waveforms": [NASEMSO_MODEL_GUIDELINES_V3, AHA_2025_ADULT_ALS],
    "medic-refractory-vf": [AHA_2025_ADULT_ALS, NASEMSO_MODEL_GUIDELINES_V3],
    "medic-symptomatic-bradycardia": [NASEMSO_MODEL_GUIDELINES_V3],
    "medic-tbi-motorcycle": [NASEMSO_MODEL_GUIDELINES_V3],
    "medic-status-epilepticus": [NASEMSO_MODEL_GUIDELINES_V3],
    "medic-eclampsia-seizure": [NASEMSO_MODEL_GUIDELINES_V3],
    "medic-polst-nursing-home": [NASEMSO_MODEL_GUIDELINES_V3],
    "medic-medication-error-report": [NASEMSO_MODEL_GUIDELINES_V3],
    "medic-unstable-svt": [NASEMSO_MODEL_GUIDELINES_V3],
    "medic-croup-at-night": [NASEMSO_MODEL_GUIDELINES_V3],
    "medic-ams-differential": [NASEMSO_MODEL_GUIDELINES_V3],
  },
  NREMTAEMT: {
    "aemt-sga-after-drowning": [NASEMSO_MODEL_GUIDELINES_V3, AHA_2025_ADULT_BLS, SCOPE_OF_PRACTICE_2019],
    "aemt-asthma-nebs-cpap": [NASEMSO_MODEL_GUIDELINES_V3, SCOPE_OF_PRACTICE_2019],
    "aemt-arrest-io-epinephrine": [AHA_2025_ADULT_ALS, NASEMSO_MODEL_GUIDELINES_V3, SCOPE_OF_PRACTICE_2019],
    "aemt-nitro-or-not": [NASEMSO_MODEL_GUIDELINES_V3, SCOPE_OF_PRACTICE_2019],
    "aemt-pelvic-fracture-shock": [NASEMSO_MODEL_GUIDELINES_V3, ACS_FIELD_TRIAGE_2021, SCOPE_OF_PRACTICE_2019],
    "aemt-hypoglycemia-d10": [NASEMSO_MODEL_GUIDELINES_V3],
    "aemt-anaphylaxis-hypotension": [NASEMSO_MODEL_GUIDELINES_V3],
    "aemt-iv-naloxone-titration": [NASEMSO_MODEL_GUIDELINES_V3],
    "aemt-intercept-handoff": { none: CASE_DATA },
    "aemt-ams-fever-hypotension": [NASEMSO_MODEL_GUIDELINES_V3],
    "aemt-ectopic-shock": [NASEMSO_MODEL_GUIDELINES_V3],
    "aemt-tension-pneumo-intercept": [NASEMSO_MODEL_GUIDELINES_V3, SCOPE_OF_PRACTICE_2019],
  },
  NASMCPT: {
    "energy-systems-by-activity": { none: "Energy-system durations follow the NASM CPT 7 textbook; no official NASM page states them (not verified)." },
    "macronutrient-label-math": { none: "4/4/9 kcal per gram (Atwater factors); the official source (21 CFR 101.9) was not reachable this pass." },
    "smart-goals-from-a-wish": { none: CASE_DATA },
    "adherence-lapse-case": { none: CASE_DATA },
    "overhead-squat-interpretation": { none: "Muscle lists from NASM's overhead squat tables; no number quoted." },
    "refer-out-screening-case": { none: NO_VALUE },
    "phase-one-program": [NASM_OPT_MODEL],
    "older-adult-balance-program": { none: NO_VALUE },
    "cue-knee-valgus-squat": { none: NO_VALUE },
    "push-up-progressions": { none: NO_VALUE },
    "scope-of-practice-case": { none: NO_VALUE },
  },
};

// The set with each lab's value sources (or its reason for none) attached.
// Throws on a slug that is not in the set, so a renamed lab cannot silently
// drop its sources.
export function withValueSources(set: SeedLabSet): SeedLabSet {
  const map = VALUE_SOURCES[set.trackCode];
  if (!map) return set;
  const slugs = new Set(set.labs.map((l) => l.slug));
  for (const slug of Object.keys(map)) {
    if (!slugs.has(slug)) throw new Error(`value-sources: ${set.trackCode} has no lab "${slug}"`);
  }
  return {
    ...set,
    labs: set.labs.map((lab) => {
      const v = map[lab.slug];
      if (!v) return lab;
      return Array.isArray(v) ? { ...lab, sources: [...(lab.sources ?? []), ...v] } : { ...lab, noValueSource: v.none };
    }),
  };
}
