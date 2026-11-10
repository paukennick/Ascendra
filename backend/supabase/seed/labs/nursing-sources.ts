import { source } from "../sources";

// REQ-148: the sources behind the nursing lab sets (NCLEX-PN, LPN/VN, CNA,
// ADN-RN, BSN-RN). Each URL was opened and the value it backs was read on the
// page itself on 2026-11-07 (checkedAt below). Each is a dated source record
// (REQ-142, seed/sources.ts) with checkedAt 2026-11-07.
//
// What each one backs, so a reviewer can re-check a value at its source:
//
//   NCSBN_PN_2026 / NCSBN_RN_2026 -- the 2026 test plans (effective April
//     2026): Client Needs ranges, the six clinical judgment steps (recognize
//     cues, analyze cues, prioritize hypotheses, generate solutions, take
//     action, evaluate outcomes), PN activity statements "Assign client care
//     and/or related tasks (e.g., assistive personnel or LPN/VN)", "Perform
//     calculations needed for medication administration", "Monitor transfusion
//     of blood product", "Perform focused data collection based on client
//     condition", "Reinforce education to client regarding medications"; RN
//     "Delegate and supervise care of client provided by others" and
//     "Prioritize the delivery of client care based on acuity".
//   NCSBN_ANA_DELEGATION -- the 2019 National Guidelines for Nursing
//     Delegation: five rights (task, circumstance, person, directions and
//     communication, supervision and evaluation); the delegating nurse keeps
//     accountability; nursing judgment cannot be delegated; an LPN/VN
//     delegates only where the state allows.
//   CDC_HAND_HYGIENE -- alcohol-based rub preferred unless hands are visibly
//     soiled; soap and water when visibly soiled, before eating, after the
//     restroom and in C. difficile or norovirus outbreaks; gloves never
//     replace hand hygiene; change gloves between patients and from a soiled
//     to a clean body site.
//   CDC_TBP -- contact (gown and gloves for any contact; dedicated or
//     disinfected equipment), droplet (mask on entry; mask the patient for
//     transport), airborne (AIIR; fit-tested N95 or higher; susceptible staff
//     kept out of measles/varicella rooms when immune staff are available).
//   CDC_EBP -- enhanced barrier precautions in nursing homes: residents with
//     an MDRO, a wound or an indwelling device; gown and gloves for
//     high-contact care (dressing, bathing, transfers, hygiene, linen, toileting,
//     device and wound care); contact precautions instead for uncontained
//     drainage or diarrhoea, outbreaks, and C. difficile, norovirus, scabies.
//   CDC_PPE_SEQUENCE -- CDC donning order gown, mask/respirator,
//     goggles/face shield, gloves; doffing gown and gloves together, then eye
//     protection, then mask, hand hygiene after all PPE is off.
//   ISMP_ABBREVIATIONS -- ISMP List of Error-Prone Abbreviations (2024): "U"
//     for units mistaken for 0 or 4 (write "units"); no trailing zero; always a
//     leading zero; "QD" (write "daily"); "MS" (write the drug name).
//   ISMP_HIGH_ALERT -- ISMP high-alert medications, acute care (current list
//     is 2024). The 2024 landing page does not reproduce the categories; the
//     2018 list's text was read instead and names "insulin, subcutaneous and
//     IV", anticoagulants (warfarin, heparins) and opioids. The labs only say
//     insulin and anticoagulants are high-alert; a reviewer should confirm
//     against the 2024 PDF.
//   ADA_HYPOGLYCEMIA -- level 1 below 70 mg/dL, level 2 below 54 mg/dL;
//     15 g of fast-acting carbohydrate and recheck in 15 minutes; glucagon
//     when the person cannot take carbohydrate by mouth.
//   DKA_CONSENSUS_2024 -- the 2024 hyperglycemic crises consensus as
//     summarised in Cleveland Clinic Journal of Medicine: insulin is postponed
//     until potassium is above 3.5 mmol/L.
//   SSC_ADULT_2026 -- Surviving Sepsis Campaign adult guidelines 2026 (Crit
//     Care Med, published 2026-03-23, DOI 10.1097/CCM.0000000000007075),
//     which replaced SSC 2021; read on SCCM's page 2026-11-09:
//     antimicrobials immediately, ideally within 1 hour of recognition, for
//     possible, probable or definite septic shock and for probable or
//     definite sepsis without shock (within 3 hours after rapid
//     investigation for possible sepsis without shock); at least 30 mL/kg
//     crystalloid in the first 3 hours (suggestion); initial MAP target
//     65 mm Hg; measure lactate (suggestion); norepinephrine first line. The
//     values the labs quote are the same as in 2021.
//   ACOG_PB222 -- gestational hypertension 140/90 mm Hg or higher; severe
//     range 160 systolic or 110 diastolic; severe-feature symptoms
//     (headache, visual disturbances, right upper quadrant/epigastric pain).
//   NICHD_FHR -- baseline 110-160 bpm, moderate variability 6-25 bpm, late
//     deceleration definition, Category I/II/III.
//   AHA_BLS_2025 -- adult severe foreign-body airway obstruction: repeated
//     cycles of 5 back blows then 5 abdominal thrusts until relieved or the
//     person becomes unresponsive; activate the emergency response system.
//   CFR_483_12 -- nursing-home residents free from restraints imposed for
//     discipline or convenience; alleged abuse, neglect, exploitation,
//     mistreatment reported immediately, not later than 2 hours if abuse or
//     serious bodily injury, otherwise not later than 24 hours.
//   CFR_483_152 -- the federal nurse aide training standard the CNA course
//     is built on.
//   CHEMM_START -- START adult triage: walking, spontaneous breathing,
//     respiratory rate above or below 30, radial pulse, obeys commands;
//     minor/delayed/immediate/expectant.
//   AHRQ_TEAMSTEPPS -- CUS ("I am concerned / uncomfortable / this is a
//     safety issue") and the two-challenge rule.
//   AACN_ESSENTIALS -- the 2021 Essentials' ten domains the BSN course
//     follows.
//   ACOG_PB183 -- ACOG Practice Bulletin 183, Postpartum Hemorrhage (2017,
//     DOI 10.1097/AOG.0000000000002351; no replacement found 2026-11-09):
//     cumulative blood loss of 1,000 mL or more, or blood loss with signs or
//     symptoms of hypovolemia, within 24 hours of birth; rising rates driven
//     by atony. Read 2026-11-09 on the Oklahoma Perinatal Quality Improvement
//     Collaborative's summary page (the full bulletin needs access).
//   ENDOCRINE_INPATIENT_2022 -- Endocrine Society guideline, hyperglycemia in
//     hospitalized adults in non-critical care (J Clin Endocrinol Metab 2022;
//     107:2101, DOI 10.1210/clinem/dgac278): target glucose 100-180 mg/dL.
//     Read 2026-11-09 in the CCJM summary (Lundholm and Morey-Vargas, CCJM
//     2023;90:615), which says ADA's hospital standards are consistent; the
//     ADA hospital section itself could not be read (PMC answered a
//     browser check).

export const NCSBN_PN_2026 = source("https://nclex.com/files/2026_PN_Test%20Plan-F.pdf", "exam_outline", "2026-11-07");
export const NCSBN_RN_2026 = source("https://www.ncsbn.org/public-files/2026_RN_Test%20Plan_English-F.pdf", "exam_outline", "2026-11-07");
export const NCSBN_ANA_DELEGATION =
  source("https://www.nursingworld.org/globalassets/practiceandpolicy/nursing-excellence/ana-position-statements/nursing-practice/ana-ncsbn-joint-statement-on-delegation.pdf", "clinical_guideline", "2026-11-07");
export const CDC_HAND_HYGIENE = source("https://www.cdc.gov/clean-hands/hcp/clinical-safety/index.html", "clinical_guideline", "2026-11-07");
export const CDC_TBP = source("https://www.cdc.gov/infection-control/hcp/basics/transmission-based-precautions.html", "clinical_guideline", "2026-11-07");
export const CDC_EBP = source("https://www.cdc.gov/long-term-care-facilities/hcp/prevent-mdro/ppe.html", "clinical_guideline", "2026-11-07");
export const CDC_PPE_SEQUENCE = source("https://www.miemss.org/home/Portals/0/Docs/Infectious_Diseases/Poster-CDC-Donning-and-Doffing-PPE-20200305.2p.pdf", "clinical_guideline", "2026-11-07");
export const ISMP_ABBREVIATIONS = source("https://online.ecri.org/hubfs/ISMP/Resources/ISMP_ErrorProneAbbreviation_List.pdf", "clinical_guideline", "2026-11-07");
export const ISMP_HIGH_ALERT = source("https://home.ecri.org/blogs/ismp-resources/high-alert-medications-in-acute-care-settings", "clinical_guideline", "2026-11-07");
export const ADA_HYPOGLYCEMIA = source("https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-hcp-5-27-25.pdf", "clinical_guideline", "2026-11-07");
export const DKA_CONSENSUS_2024 = source("https://www.ccjm.org/content/92/3/152", "clinical_guideline", "2026-11-07");
export const SSC_ADULT_2026 = source(
  "https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026",
  "clinical_guideline",
  "2026-11-09"
);
// ACOG Practice Bulletin No. 222 (June 2020), as hosted by the Kansas Perinatal Quality Collaborative (KDHE).
export const ACOG_PB222 = source("https://kansaspqc.kdhe.ks.gov/acog-gestation-htn-and-preeclampsia-practice-bulletin", "clinical_guideline", "2026-11-07");
export const NICHD_FHR = source("https://ncc-efm.org/filz/NICHD_Reference_from_CCPR.pdf", "clinical_guideline", "2026-11-07");
export const AHA_BLS_2025 = source("https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support", "clinical_guideline", "2026-11-07");
export const CFR_483_12 = source("https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.12", "reference", "2026-11-07");
export const CFR_483_152 = source("https://www.ecfr.gov/current/title-42/section-483.152", "reference", "2026-11-07");
export const CHEMM_START = source("https://chemm.hhs.gov/startalgotext.htm", "clinical_guideline", "2026-11-07");
export const AHRQ_TEAMSTEPPS = source("https://www.ahrq.gov/patient-safety/settings/labor-delivery/perinatal-care/modules/teamwork/implement-slides.html", "reference", "2026-11-07");
// SCIRE Project evidence summary of autonomic dysreflexia (2025), citing the Consortium for Spinal Cord Medicine and PVA guidelines.
export const SCIRE_AD = source("https://scireproject.com/wp-content/uploads/2025/06/AD-Executive-Summary-ES.pdf", "clinical_guideline", "2026-11-07");
export const ACOG_PB183 = source("https://doi.org/10.1097/AOG.0000000000002351", "clinical_guideline", "2026-11-09");
export const ENDOCRINE_INPATIENT_2022 = source("https://doi.org/10.1210/clinem/dgac278", "clinical_guideline", "2026-11-09");
export const AACN_ESSENTIALS = source("https://www.aacnnursing.org/Portals/0/PDFs/Essentials/Essentials-Executive-Summary.pdf", "reference", "2026-11-07");
