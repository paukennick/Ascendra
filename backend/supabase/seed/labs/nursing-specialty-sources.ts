// REQ-275..278 (2026-11-14): what each CMSRN, CEN, PCCN and FNP lab's own
// values rest on (REQ-142), merged into VALUE_SOURCES (value-sources.ts).
// Each source records the day it was read; "carried" ones were read by an
// earlier course on the date they carry and were not re-read here.
import { source, type SourceRef } from "../sources";

const R = "2026-11-14";
const g = (url: string, checkedAt = R, recheckBy?: string): SourceRef => source(url, "clinical_guideline", checkedAt, recheckBy);

// Read 2026-11-14.
export const SSC_ADULT_2026 = g(
  "https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026"
);
export const AIS_2026_TOP = g("https://professional.heart.org/en/science-news/2026-guideline-for-the-early-management-of-patients-with-acute-ischemic-stroke/top-things-to-know");
export const HTN_2025_TOP = g("https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline/top-things-to-know");
export const KDIGO_AKI_2012 = g("https://kdigo.org/wp-content/uploads/2016/10/KDIGO-2012-AKI-Guideline-English.pdf", R, "2027-05-14");
export const AABB_RBC_2023 = g("https://pubmed.ncbi.nlm.nih.gov/37824153/");
export const CFR_482_13 = g("https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-482/subpart-B/section-482.13");
export const CFR_489_24 = g("https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-489/subpart-B/section-489.24");
export const ESI_V5 = g("https://media.emscimprovement.center/documents/Emergency_Severity_Index_Handbook.pdf");
export const NRP_2025 = g("https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/neonatal-resuscitation");
// Anaphylaxis practice parameter 2020 (Shaker et al., J Allergy Clin Immunol
// 2020), read through the CCJM 2022 summary (Weller and Hsieh): 1 mg/mL,
// 0.01 mg/kg IM mid-outer thigh, max 0.5 mg adult, 0.3 mg child.
export const ANAPHYLAXIS_2020 = g("https://www.ccjm.org/content/89/2/106");
export const USPSTF_CRC_2021 = g("https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/colorectal-cancer-screening");
export const USPSTF_BREAST_2024 = g("https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening");
export const USPSTF_CERVICAL_2018 = g("https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/cervical-cancer-screening", R, "2027-05-14");
export const USPSTF_STATIN_2022 = g("https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/statin-use-in-adults-preventive-medication");
export const USPSTF_DIABETES_2021 = g("https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/screening-for-prediabetes-and-type-2-diabetes");
export const USPSTF_OSTEOPOROSIS_2025 = g("https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/osteoporosis-screening");
export const USPSTF_HTN_2021 = g("https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/hypertension-in-adults-screening");
// GINA 2026 (May 2026), read through The Limbic's report (2026-06-09); GINA's
// own page (read 2026-11-14) dates the executive summary 2026-10-23.
// ANA news release on the 2025 Code of Ethics revision.
export const ANA_CODE_2025 = source("https://www.nursingworld.org/news/news-releases/2025/code-of-ethics-for-nurses/", "reference", R);
export const GINA_2026 = g("https://ginasthma.org/reports/");

// Carried from the repo's earlier readings (dates as read then).
export const HYPERGLYCEMIC_CRISES_2024 = g("https://doi.org/10.2337/dci24-0032", "2026-11-11");
export const BTS_OXYGEN = g("https://www.brit-thoracic.org.uk/clinical-resources/guidelines/emergency-oxygen/", "2026-11-08");
export const ADA_HYPOGLYCEMIA = g("https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-hcp-5-27-25.pdf", "2026-11-07");
export const ACOG_PB222 = g("https://kansaspqc.kdhe.ks.gov/acog-gestation-htn-and-preeclampsia-practice-bulletin", "2026-11-07");
export const NCSBN_ANA_DELEGATION = g(
  "https://www.nursingworld.org/globalassets/practiceandpolicy/nursing-excellence/ana-position-statements/nursing-practice/ana-ncsbn-joint-statement-on-delegation.pdf",
  "2026-11-07"
);
export const CDC_TBP = g("https://www.cdc.gov/infection-control/hcp/basics/transmission-based-precautions.html", "2026-11-07");
export const ISMP_ABBREVIATIONS = g("https://online.ecri.org/hubfs/ISMP/Resources/ISMP_ErrorProneAbbreviation_List.pdf", "2026-11-07");

const NO_VALUE = "Quotes no clinical threshold, dose or target (recognition, priorities, communication or ethics).";
const CASE_DATA = "Its numbers are the fictional patient's own readings or arithmetic on them, not a threshold or dose the lab teaches.";

export const NURSING_SPECIALTY_VALUE_SOURCES: Record<string, Record<string, SourceRef[] | { none: string }>> = {
  PCCN: {
    "pccn-femoral-access-bleed": { none: CASE_DATA },
    "pccn-rhythm-and-qtc": { none: "Calculates Bazett's QTc from the case's own intervals and names risks; quotes no guideline threshold." },
    "pccn-copd-niv-case": [BTS_OXYGEN],
    "pccn-oxygen-device-match": [BTS_OXYGEN],
    "pccn-insulin-infusion-transition": [HYPERGLYCEMIC_CRISES_2024],
    "pccn-hit-platelets": { none: "Names the HIT pattern (a fall of more than half, days 5-10) as recognition, with no dose; the drug is named without a dose." },
    "pccn-new-deficit-stroke": [AIS_2026_TOP],
    "pccn-delirium-vs-dementia": { none: "Applies the CAM features; no threshold or dose." },
    "pccn-upper-gi-bleed": [AABB_RBC_2023],
    "pccn-aki-hyperkalemia": [KDIGO_AKI_2012],
    "pccn-compartment-syndrome": { none: NO_VALUE },
    "pccn-sepsis-screen": [SSC_ADULT_2026],
    "pccn-wound-and-device-infections": { none: NO_VALUE },
    "pccn-agitation-restraint": [CFR_482_13],
    "pccn-interpreter-and-consent": { none: NO_VALUE },
    "pccn-teach-back-discharge": { none: "Leaves the weight-gain threshold to the patient's own team; quotes no number." },
    "pccn-sbar-chain-of-command": { none: CASE_DATA },
    "pccn-evidence-practice-change": { none: "Names quality measures (rates per 1,000 catheter days) without a target value." },
  },
  CEN: {
    "cen-chest-pain-stemi": { none: "Names ACS care and the nitrate-PDE-5 inhibitor contraindication without a dose or time target." },
    "cen-shock-cardiogenic-obstructive": { none: "Classifies shock states and their definitive treatments; no threshold or dose." },
    "cen-tension-pneumothorax": { none: CASE_DATA },
    "cen-croup-severity": { none: "Names croup treatments without doses; severity is described from the findings, not a score." },
    "cen-stroke-pathway": [AIS_2026_TOP],
    "cen-neurogenic-vs-hypovolemic": { none: CASE_DATA },
    "cen-variceal-bleed": { none: "Names drug classes and the sequence of care without doses." },
    "cen-intussusception": { none: NO_VALUE },
    "cen-ectopic-and-neonate": [NRP_2025],
    "cen-suicide-risk-safety": { none: "State hold laws vary; the lab names none and quotes no threshold." },
    "cen-psychosis-medical-mimic": { none: CASE_DATA },
    "cen-anaphylaxis-epinephrine": [ANAPHYLAXIS_2020],
    "cen-sepsis-triage": [SSC_ADULT_2026, ESI_V5],
    "cen-injection-injury": { none: NO_VALUE },
    "cen-chemical-eye-burn": { none: "Irrigates to a near-neutral pH as the endpoint; quotes no numeric pH or volume." },
    "cen-carbon-monoxide-cyanide": { none: "Names criteria for discussing hyperbaric oxygen qualitatively; the lactate is the case's own reading." },
    "cen-esi-waiting-room": [ESI_V5],
  },
  CMSRN: {
    "cmsrn-postop-hemorrhage": { none: CASE_DATA },
    "cmsrn-hypoglycemia-protocol": [ADA_HYPOGLYCEMIA],
    "cmsrn-restraint-alternatives": [CFR_482_13],
    "cmsrn-code-status-conversation": { none: NO_VALUE },
    "cmsrn-health-literacy-teaching": { none: "Teaches warfarin safety without a dose or INR target." },
    "cmsrn-medication-reconciliation": { none: "Its doses are the fictional patient's list, not doses the lab teaches." },
    "cmsrn-readmission-risk": { none: NO_VALUE },
    "cmsrn-who-first": { none: CASE_DATA },
    "cmsrn-moral-distress": [ANA_CODE_2025],
    "cmsrn-delegation-five-rights": [NCSBN_ANA_DELEGATION],
    "cmsrn-disaster-surge": { none: NO_VALUE },
  },
  FNPAANP: {
    "fnpaanp-screening-visit": [USPSTF_CRC_2021, USPSTF_BREAST_2024, USPSTF_CERVICAL_2018],
    "fnpaanp-bp-confirm": [HTN_2025_TOP, USPSTF_HTN_2021],
    "fnpaanp-older-adult-falls": { none: CASE_DATA },
    "fnpaanp-chest-pain-red-flags": { none: "Names emergency referral and aspirin without a dose or time target." },
    "fnpaanp-cough-differential": { none: NO_VALUE },
    "fnpaanp-atypical-older-adult": { none: NO_VALUE },
    "fnpaanp-statin-decision": [USPSTF_STATIN_2022],
    "fnpaanp-asthma-step": [GINA_2026],
    "fnpaanp-hypoglycemia-adjust": [ADA_HYPOGLYCEMIA],
    "fnpaanp-deprescribe": { none: "Names an interaction and its management without doses or drug levels." },
  },
  FNPANCC: {
    "fnpancc-osteoporosis-screening": [USPSTF_OSTEOPOROSIS_2025, USPSTF_DIABETES_2021, USPSTF_HTN_2021],
    "fnpancc-adolescent-risk": { none: "State confidentiality rules vary; the lab quotes no threshold or score cut-off." },
    "fnpancc-red-flag-headache": { none: NO_VALUE },
    "fnpancc-tsh-interpretation": { none: "Interprets directions (high or low) without reference ranges." },
    "fnpancc-diabetes-agent-choice": { none: "Names drug classes and their benefits without doses or targets." },
    "fnpancc-appraise-study": { none: CASE_DATA },
    "fnpancc-mandatory-reporting": { none: "Reporting rules vary by state; the lab names none and quotes no time limit." },
    "fnpancc-ai-documentation": { none: "Its doses are the fictional note's errors, not doses the lab teaches." },
    "fnpancc-antibiotic-stewardship": { none: "Describes features that make bacterial sinusitis likely without a day count or dose." },
    "fnpancc-monitor-adverse": { none: NO_VALUE },
    "fnpancc-capacity-guardianship": { none: NO_VALUE },
  },
};
