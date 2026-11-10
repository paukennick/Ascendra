// REQ-142: what each clinical and fitness lab's own values rest on.
//
// The lab sets cite the exam outline the labs are aligned to (CCRN handbook,
// NCLEX test plan, NASM blueprint). That says a topic belongs on the exam; it
// does not say a blood-pressure limit, a dose or a target is right. Here every
// NCLEX, CCRN, fitness (NASM, ACE, ACSM, NCCPT, NSCA) and physical therapy
// (NPTE, DPT, ABPTS) lab either names the guideline (or the certifying body's
// own material) its values rest on, or says why it names none. The fitness
// and PT entries were added 2026-11-09 (content audit). lib/labs.test.ts requires one or the other for every lab, so a new lab
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
import { ACOG_PB183, ADA_HYPOGLYCEMIA, CDC_EBP, CDC_HAND_HYGIENE, CDC_TBP, ENDOCRINE_INPATIENT_2022, ISMP_ABBREVIATIONS, NCSBN_ANA_DELEGATION } from "./nursing-sources";

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
// bicarbonate >=18 mmol/L, "the anion gap should not be used as a criterion";
// it "may still have some utility" only where ketone measurement is
// unavailable. Re-read 2026-11-09 in the Diabetologia copy on PMC
// (PMC11343900, DOI 10.1007/s00125-024-06183-8) when dka-case was corrected
// to these values.
const HYPERGLYCEMIC_CRISES_2024 = source("https://doi.org/10.2337/dci24-0032", "clinical_guideline", "2026-11-09");
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

// --- Fitness (REQ-142 extended 2026-11-09) ------------------------------------
// Each is a source the lab file's own header already names, with the date its
// author read it (2026-11-07) unless re-read on 2026-11-09. Every DOI below
// was confirmed on 2026-11-09 (Crossref) to be the paper the header names.
const FIT_CHECKED = "2026-11-07";
const fitRef = (url: string) => source(url, "reference", FIT_CHECKED);
const fitGuideline = (url: string) => source(url, "clinical_guideline", FIT_CHECKED);
// Riebe et al., ACSM preparticipation screening (Med Sci Sports Exerc 2015):
// the algorithm; moderate = 40-59% HRR, RPE 12-13; vigorous = 60% HRR or more.
const ACSM_SCREENING_2015 = fitRef("https://doi.org/10.1249/MSS.0000000000000664");
// Garber et al., ACSM position stand (Med Sci Sports Exerc 2011): aerobic and
// resistance FITT for healthy adults (60-70% 1RM, 8-12 reps, 2-4 sets, 48 h).
const ACSM_POSITION_2011 = fitRef("https://doi.org/10.1249/MSS.0b013e318213fefb");
// ACSM's GETP 12th edition notice (exam basis from 2025); the test-termination
// criteria the abnormal-response lab uses are GETP's, from the ACC/AHA list.
const ACSM_GETP12 = fitGuideline("https://acsm.org/certification-exam-2025-getp12/");
// Piercy et al., Physical Activity Guidelines for Americans, 2nd ed. (JAMA
// 2018): 150-300 min moderate or 75-150 min vigorous, strength 2+ days.
const PAG_2018 = fitGuideline("https://doi.org/10.1001/jama.2018.14854");
// 2025 AHA/ACC high blood pressure guideline categories (news release the lab
// sets cite): elevated 120-129/<80; stage 1 130-139 or 80-89; stage 2 140+/90+.
const AHA_BP_2025 = fitGuideline("https://www.eurekalert.org/news-releases/1094543");
const ACE_IFT = fitRef(
  "https://www.acefitness.org/continuing-education/certified/february-2021/7780/how-to-design-body-weight-training-workouts-using-the-ace-integrated-fitness-training-model/"
);
const ACOG_CO804 = fitGuideline(
  "https://read.qxmd.com/read/32217980/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period-acog-committee-opinion-number-804"
);
// NATA position statement, exertional heat illnesses (Casa et al., J Athl
// Train 2015;50:986). The lab sets' old nata.org PDF link answered 404 on
// 2026-11-09, so the DOI is cited instead.
const NATA_HEAT_2015 = fitGuideline("https://doi.org/10.4085/1062-6050-50.9.07");
const DRI_AMDR = fitGuideline(
  "https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-macronutrients-dietary-reference-intakes-tables-2005.html"
);
const FDA_PERCENT_DV = fitRef("https://www.fda.gov/food/nutrition-facts-label/lows-and-highs-percent-daily-value-nutrition-facts-label");
const CDC_BMI = fitGuideline("https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html");
const NSCA_LOAD_CHART = fitRef("https://dxpprod.nsca.com/contentassets/61d813865e264c6e852cadfe247eae52/nsca_training_load_chart.pdf");
// DoD HPRC summary of NSCA loads by goal (strength 85%+ for 6 or fewer;
// hypertrophy 67-85% for 6-12; endurance under 67% for 12 or more).
const HPRC_LOADS = fitRef("https://www.hprc-online.org/articles/one-rep-max-for-strength");
const NSCA_PTQ_REST = fitRef(
  "https://www.nsca.com/contentassets/fb8a7be6eb174934bb8844703c4de4cc/ptq-10.1.3-how-to-manipulate-rest-intervals-to-maixmize-strength-training-effectiveness.pdf"
);
// 2023 IOC consensus on REDs (Mountjoy et al., Br J Sports Med 2023).
const IOC_REDS_2023 = fitRef("https://doi.org/10.1136/bjsports-2023-106994");
const AHA_CPR_2025 = fitGuideline(
  "https://www.vumc.org/resuscitation-program/sites/default/files/public_files/BLS/Heartsaver/Heartsaver-CPR-AED-Summary-High-Quality-CPR%20Components-2025-Guidelines.pdf"
);
const NSCA_BASICS = fitRef("https://www.nsca.com/uploadedFiles/NSCA/Resources/PDF/Publications/basics_of_strength_and_conditioning_manual.pdf");
// Haddad et al., session-RPE method (Front Neurosci 2017).
const SESSION_RPE = fitRef("https://www.frontiersin.org/articles/10.3389/fnins.2017.00612/full");
// OpenStax Anatomy and Physiology 2e, 10.3: creatine phosphate supplies
// "approximately 15 seconds" -- the one phosphagen convention the fitness labs
// use (read 2026-11-09).
const OPENSTAX_MUSCLE_ENERGY = source(
  "https://openstax.org/books/anatomy-and-physiology-2e/pages/10-3-muscle-fiber-contraction-and-relaxation",
  "reference",
  "2026-11-09"
);

// --- Physical therapy (REQ-142 extended 2026-11-09) ---------------------------
// Sources each PT lab file's header names, dated by when its author read them
// (2026-11-07, or 2026-11-04 for the track's StatPearls and CPG pass). Every
// DOI was confirmed on 2026-11-09 (Crossref) to be the named paper; three
// values were re-read in the abstracts that day (Tilson 0.16 m/s, Grindem 51%
// per month to 9 months, Walenkamp PRWE 11.5). StatPearls chapters have no
// per-chapter NBK numbers on file (the track header says why), so they are
// cited as the StatPearls book.
const PT_CHECKED = "2026-11-07";
const ptRef = (url: string) => source(url, "reference", PT_CHECKED);
const ptGuideline = (url: string) => source(url, "clinical_guideline", PT_CHECKED);
const doi = (d: string) => `https://doi.org/${d}`;
const STATPEARLS = source("https://www.ncbi.nlm.nih.gov/books/NBK430685/", "reference", "2026-11-04");
const GOLD_2026 = ptGuideline("https://goldcopd.org/2026-gold-report/");
const FLETCHER_2013 = ptGuideline(doi("10.1161/CIR.0b013e31829b5b44"));
const HODGSON_2014 = ptRef(doi("10.1186/s13054-014-0658-y"));
const ATS_PULM_REHAB_2023 = ptGuideline(doi("10.1164/rccm.202306-1066ST"));
const PAD_2024 = ptGuideline(doi("10.1161/CIR.0000000000001251"));
const CAT_MCID = ptRef(doi("10.1016/S2213-2600(14)70001-3"));
const SGRQ_MCID = ptRef(doi("10.1081/COPD-200050513"));
const FIELD_WALK_2014 = ptRef(doi("10.1183/09031936.00150314"));
const SEPSIS3 = ptRef(doi("10.1001/jama.2016.0287"));
const EWGSOP2 = ptGuideline(doi("10.1093/ageing/afy169"));
const WORLD_FALLS_2022 = ptGuideline(doi("10.1093/ageing/afac205"));
const ORTHOSTATIC_2011 = ptRef(doi("10.1007/s10286-011-0119-5"));
const CAM_1990 = ptRef(doi("10.7326/0003-4819-113-12-941"));
const FOUR_AT_2014 = ptRef(doi("10.1093/ageing/afu021"));
const FRIED_2001 = ptRef(doi("10.1093/gerona/56.3.m146"));
const PERERA_2006 = ptRef(doi("10.1111/j.1532-5415.2006.00701.x"));
const BERG_MDC_2009 = ptRef(doi("10.2340/16501977-0337"));
const FGA_2010 = ptRef(doi("10.2522/ptj.20090069"));
const WHO_ACTIVITY_2020 = ptGuideline(doi("10.1136/bjsports-2020-102955"));
const NSCA_OLDER_ADULTS_2019 = ptRef(doi("10.1519/JSC.0000000000003230"));
const HIP_FRACTURE_CPG_2021 = ptGuideline(doi("10.2519/jospt.2021.0301"));
const BEERS_2023 = ptGuideline(doi("10.1111/jgs.18372"));
const APPELBAUM_2007 = ptRef(doi("10.1056/NEJMcp074045"));
const PVA_AD = ptGuideline("https://pva.org/wp-content/uploads/2021/09/CPG_Autonomic-Dysreflexia_2025_digital_03.26-.pdf");
const LOCOMOTOR_CPG_2020 = ptGuideline(doi("10.1097/NPT.0000000000000303"));
const TILSON_2010 = ptRef(doi("10.2522/ptj.20090079"));
const KLEIM_2008 = ptRef(doi("10.1044/1092-4388(2008/018)"));
const HINTS_2009 = ptRef(doi("10.1161/STROKEAHA.109.551234"));
const STROKE_REHAB_2016 = ptGuideline(doi("10.1161/STR.0000000000000098"));
const CORE_MEASURES_CPG_2018 = ptGuideline(doi("10.1097/NPT.0000000000000229"));
const PARKINSON_CPG_2022 = ptGuideline(doi("10.1093/ptj/pzab302"));
const VESTIBULAR_CPG_2022 = ptGuideline(doi("10.1097/NPT.0000000000000382"));
const OTTAWA_ANKLE_1993 = ptRef(doi("10.1001/jama.269.9.1127"));
const CANADIAN_CSPINE_2001 = ptRef(doi("10.1001/jama.286.15.1841"));
const RED_FLAGS_2013 = ptRef(doi("10.1136/bmj.f7095"));
const NECK_PAIN_CPG_2017 = ptGuideline(doi("10.2519/jospt.2017.0302"));
const LBP_CPG_2021 = ptGuideline(doi("10.2519/jospt.2021.0304"));
const START_BACK_2008 = ptRef(doi("10.1002/art.23563"));
const GRINDEM_2016 = ptRef(doi("10.1136/bjsports-2016-096031"));
const FAAM_2005 = ptRef(doi("10.1177/107110070502601113"));
const PRWE_MCID_2015 = ptRef(doi("10.1007/s11999-015-4376-9"));
const ANKLE_SPRAIN_CPG_2021 = ptGuideline(doi("10.2519/jospt.2021.0302"));
const TKA_CPG_2026 = ptGuideline(doi("10.1093/ptj/pzag058"));
const ODI_NPRS_2008 = ptRef(doi("10.1097/BRS.0b013e31815e3a10"));
const LEFS_1999 = ptRef("https://pubmed.ncbi.nlm.nih.gov/10201543/");
const HF_EXERCISE_2024 = ptRef(doi("10.1007/s10741-023-10310-9"));
const FALL_RISK_CPG_2025 = ptGuideline(doi("10.1519/JPT.0000000000000454"));
const BCRL_CPG_2020 = ptGuideline(doi("10.1093/ptj/pzaa087"));
const DFU_CPG_2025 = ptGuideline(doi("10.1093/ptj/pzae171"));
const NPIAP_2016 = ptGuideline(doi("10.1097/WON.0000000000000281"));
const IWGDF_IDSA_2023 = ptGuideline(doi("10.1093/cid/ciad527"));
const CMS_BPM_CH15 = ptRef("https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/bp102c15.pdf");
const BERG_SRALAB = ptRef("https://www.sralab.org/sites/default/files/downloads/2023-03/Berg%20Balance%20Scale.INFOGRAPHIC.pdf");
const AAOS_ACL_2023 = ptGuideline(doi("10.5435/JAAOS-D-22-01020"));
// Oncology (pt-abpts-oncology.ts header tags).
const ONC_SAFETY_MALTSER = ptRef("https://pmc.ncbi.nlm.nih.gov/articles/PMC5627359");
const LYMPHEDEMA_DX_CPG_2017 = ptGuideline(doi("10.1093/ptj/pzx050"));
const CRF_CPG_2022 = ptGuideline(doi("10.1093/ptj/pzac120"));
const ACSM_CANCER_2019 = ptGuideline(doi("10.1249/MSS.0000000000002116"));
const FACIT_MCID = ptRef("https://jpro.springeropen.com/counter/pdf/10.1186/s41687-023-00609-4.pdf");
const NICE_MSCC = ptGuideline(
  "https://www.nice.org.uk/guidance/QS56/chapter/quality-statement-3-imaging-for-adults-with-suspected-metastatic-spinal-cord-compression"
);
const ISL_STAGING = ptGuideline("https://www.eurolymphology.org/international-guidelines-on-lymphedema-and-lymphatic-desorders/3");
const ASCO_CIPN_2020 = ptGuideline("https://ace.asco.org/guidelines/9541");
// Pediatrics (pt-abpts-pediatrics.ts header tags).
const CDC_9_MONTHS = ptGuideline("https://cdc.gov/act-early/digital-online-checklist/9-months.html");
const CP_EARLY_DETECTION = ptRef("https://arpi.unipi.it/retrieve/e0d6c92f-7191-fcf8-e053-d805fe0aa794/jcm-08-01879.pdf");
const GMFCS_ER = ptRef("https://depts.washington.edu/dbpeds/Screening%20Tools/GMFCS-ER.pdf");
const AACPDM_HIP = ptGuideline("https://www.Aacpdm.org/UserFiles/file/hip-surveillance-care-pathway.pdf");
const SHUNT_COMPLICATIONS = ptRef("https://www.hydroassoc.org/complications-of-shunt-systems/");
const TORTICOLLIS_CPG_2018 = ptGuideline("https://pmc.ncbi.nlm.nih.gov/articles/PMC8568067");
const IDEA_PART_C_TRANSITION = ptRef("https://sites.ed.gov/idea/idea-files/policy-letter-march-17-2023-to-nix/");
const DMD_CARE = ptRef("https://www.parentprojectmd.org/care/care-guidelines/by-area/care-for-muscles");
const GMFM_MCID = ptRef("https://pmc.ncbi.nlm.nih.gov/articles/PMC2990955");
const COPM_CHANGE = ptRef("https://blogs.elon.edu/ptkids/2022/08/30/canadian-occupational-performance-measure-comp-article-summary-2/");
// Pelvic health. NG123 rec. 1.7.5 (supervised PFMT for at least 16 weeks for
// symptomatic POP-Q stage 1-2 prolapse) re-read on NICE's page 2026-11-09.
const NICE_NG123 = source("https://www.nice.org.uk/Guidance/NG123/chapter/recommendations", "clinical_guideline", "2026-11-09");
const NICE_PFMT = ptGuideline("https://www.nice.org.uk/guidance/QS77/chapter/quality-statement-4-supervised-pelvic-floor-muscle-training");

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
    // Implies thresholds: a pre-breakfast glucose of 142 is "acceptable" in
    // hospital (100-180 mg/dL) and SpO2 89% is below target (94-98%).
    "pn-who-needs-the-rn-now": [ENDOCRINE_INPATIENT_2022, BTS_OXYGEN],
    "pn-assign-or-not": [NCSBN_ANA_DELEGATION],
    "pn-precautions-four-residents": [CDC_TBP, CDC_EBP, CDC_HAND_HYGIENE],
    "pn-fall-found-on-floor": { none: NO_VALUE },
    // Implies the hemorrhage line: ongoing bleeding with signs of hypovolemia.
    "pn-postpartum-boggy-fundus": [ACOG_PB183],
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
  NASMCPT: {
    "energy-systems-by-activity": [OPENSTAX_MUSCLE_ENERGY],
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
  // REQ-142 extended 2026-11-09 (content audit M4): the five further fitness
  // courses. Sources are the ones each lab file's header names.
  ACECPT: {
    "ace-clearance-insulin-case": [ACSM_SCREENING_2015],
    "ace-five-movement-screen": { none: "Reads movement compensations in ACE's five primary movements; the rep count is the client's own." },
    "ace-ift-phase-placement": [ACE_IFT],
    "ace-multi-setting-week": { none: "Adapts one programme across settings; no threshold or dose." },
    "ace-hip-hinge-cueing": { none: "Coaching cues for a hip hinge; no threshold or dose." },
    "ace-lapse-sdoh-case": { none: "A behaviour-change conversation (ACE ABC approach); the session lengths are the client's plan." },
    "ace-reassessment-progression": [ACE_IFT],
    "ace-pregnancy-modification-case": [ACOG_CO804],
    "ace-park-bootcamp-risk-case": [NATA_HEAT_2015],
  },
  ACSMCPT: {
    "acsm-screening-algorithm-case": [ACSM_SCREENING_2015, AHA_BP_2025],
    "acsm-fitt-vp-karvonen": [ACSM_SCREENING_2015, ACSM_POSITION_2011],
    "acsm-resistance-prescription": [ACSM_POSITION_2011],
    "acsm-abnormal-response-case": [ACSM_GETP12],
    "acsm-plateau-communication-case": { none: CASE_DATA },
    "acsm-guidelines-education": [PAG_2018],
    "acsm-collaboration-confidentiality-case": { none: NO_VALUE },
  },
  NCCPTCPT: {
    "nccpt-explain-physiology": [HPRC_LOADS],
    "nccpt-food-log-review": [DRI_AMDR],
    "nccpt-label-trend-supplement-case": [FDA_PERCENT_DV],
    "nccpt-basic-assessment-battery": [AHA_BP_2025, CDC_BMI],
    "nccpt-reassessment-interpretation": { none: CASE_DATA },
    "nccpt-linear-vs-undulating": { none: "Compares periodization models; the rep ranges are example programmes, not a threshold." },
    "nccpt-arthritis-case": { none: "Programme emphasis and pain-guided dosing for knee osteoarthritis; no threshold or dose." },
    "nccpt-checkpoints-bent-row": { none: "Kinetic-chain checkpoints on one exercise; no threshold or dose." },
    "nccpt-progress-overtraining-case": { none: CASE_DATA },
    "nccpt-in-home-incident-case": { none: NO_VALUE },
  },
  NSCACPT: {
    "nsca-cpt-assessment-battery": [CDC_BMI],
    "nsca-cpt-reds-wellness-case": [IOC_REDS_2023],
    "nsca-cpt-periodized-plan": { none: "A periodized plan whose weeks and loads are this client's example, not a threshold." },
    "nsca-cpt-session-variables": [NSCA_LOAD_CHART, HPRC_LOADS, NSCA_PTQ_REST],
    "nsca-cpt-hypertension-case": [AHA_BP_2025],
    "nsca-cpt-db-bench-pulldown-technique": { none: "Technique faults and spotting; no threshold or dose." },
    "nsca-cpt-plyometric-landing": { none: "Landing technique and regression; the box heights are the case's own." },
    "nsca-cpt-rower-intensity": [ACSM_SCREENING_2015],
    "nsca-cpt-facility-walkthrough": { none: NO_VALUE },
    "nsca-cpt-cardiac-arrest-case": [AHA_CPR_2025],
  },
  NSCACSCS: {
    "cscs-biomechanics-exercise-selection": { none: "Exercise selection from the force-velocity curve; no threshold or dose." },
    "cscs-energy-system-conditioning": [OPENSTAX_MUSCLE_ENERGY, NSCA_BASICS],
    "cscs-travel-recovery-case": [SESSION_RPE],
    "cscs-arousal-mental-skills-case": { none: NO_VALUE },
    "cscs-supplement-question": { none: "Names the FDA's position on supplements (DSHEA) and third-party testing; no threshold or dose." },
    "cscs-volleyball-needs-analysis": { none: "A needs analysis; the tests named carry no cut-off." },
    "cscs-off-to-in-season-periodization": [NSCA_LOAD_CHART, HPRC_LOADS],
    "cscs-power-clean-squat-spotting": { none: "Technique faults and spotting; no threshold or dose." },
    "cscs-ramp-warm-up-pnf": { none: "PNF hold-relax timings follow the NSCA textbook (Essentials, paywalled); no open source was found this pass (not verified)." },
    "cscs-testing-day-plan": { none: "Test selection and order; no threshold or dose." },
    "cscs-interpret-and-communicate-case": { none: CASE_DATA },
    "cscs-heat-and-rhabdo-case": [NATA_HEAT_2015],
  },
  // REQ-142 extended 2026-11-09 (PT audit Minor 10): every PT lab on master.
  ABPTSCCS: {
    "ccs-mobility-protocol-consult": [HODGSON_2014],
    "ccs-heart-failure-self-management-teaching": { none: "Teach-back plan; the weight-gain threshold is left to the heart-failure team and the walking start is this patient's plan." },
    "ccs-appraise-a-trial": { none: "Appraisal arithmetic on the fictional trial's own results." },
    "ccs-apply-pulmonary-rehab-guideline": [ATS_PULM_REHAB_2023],
    "ccs-three-rhythm-strips": [FLETCHER_2013],
    "ccs-icu-mobility-screen": [HODGSON_2014],
    "ccs-interpret-the-chart-data": [BTS_OXYGEN, GOLD_2026],
    "ccs-when-to-stop-in-phase-two": [FLETCHER_2013, HF_EXERCISE_2024],
    "ccs-what-limits-her-walking": [FIELD_WALK_2014, BTS_OXYGEN],
    "ccs-prognosis-three-patients": [ATS_PULM_REHAB_2023, BTS_OXYGEN],
    "ccs-phase-two-prescription-with-icd": [FLETCHER_2013],
    "ccs-pulmonary-rehab-gold-3": [GOLD_2026, ATS_PULM_REHAB_2023, BTS_OXYGEN],
    "ccs-did-rehab-work-outcomes": [FIELD_WALK_2014, CAT_MCID, SGRQ_MCID, GOLD_2026],
    "ccs-claudication-supervised-exercise": [PAD_2024],
  },
  ABPTSGCS: {
    "gcs-medication-list-and-falls": [BEERS_2023, ORTHOSTATIC_2011, WORLD_FALLS_2022],
    "gcs-ewgsop2-pathway": [EWGSOP2, NSCA_OLDER_ADULTS_2019],
    "gcs-refusing-discharge-destination": [APPELBAUM_2007],
    "gcs-choose-the-measures": [PERERA_2006],
    "gcs-multifactorial-falls-assessment": [WORLD_FALLS_2022, BERG_MDC_2009, ORTHOSTATIC_2011],
    "gcs-post-op-day-2-confusion": [CAM_1990, FOUR_AT_2014],
    "gcs-vitals-before-exercise-multimorbid": [ORTHOSTATIC_2011],
    "gcs-hip-fracture-prognosis": [FRIED_2001, HIP_FRACTURE_CPG_2021, WORLD_FALLS_2022],
    "gcs-when-to-stop-and-refer": [SEPSIS3, ORTHOSTATIC_2011],
    "gcs-exercise-prescription-frail": [NSCA_OLDER_ADULTS_2019, WHO_ACTIVITY_2020, WORLD_FALLS_2022],
    "gcs-design-falls-prevention-programme": [WORLD_FALLS_2022],
    "gcs-did-she-really-improve": [PERERA_2006, BERG_MDC_2009],
  },
  ABPTSNCS: {
    "ncs-localize-three-lesions": { none: "Localises lesions from the examination findings; no threshold or dose." },
    "ncs-plasticity-principles-to-plan": [KLEIM_2008],
    "ncs-which-setting-after-the-stroke": [STROKE_REHAB_2016],
    "ncs-acute-vertigo-triage": [HINTS_2009, VESTIBULAR_CPG_2022],
    "ncs-isncsci-classification": [STATPEARLS],
    "ncs-autonomic-dysreflexia-in-the-gym": [PVA_AD],
    "ncs-walking-training-chronic-stroke": [LOCOMOTOR_CPG_2020, TILSON_2010],
    "ncs-parkinson-progression": [PARKINSON_CPG_2022, ORTHOSTATIC_2011],
    "ncs-core-measures-discharge-decision": [CORE_MEASURES_CPG_2018, BERG_MDC_2009, TILSON_2010, FGA_2010],
  },
  ABPTSOCS: {
    "ocs-back-pain-that-is-not-mechanical": [RED_FLAGS_2013, LBP_CPG_2021],
    "ocs-who-needs-imaging-today": [OTTAWA_ANKLE_1993, CANADIAN_CSPINE_2001],
    "ocs-medication-review-before-loading": [STATPEARLS],
    "ocs-prognosis-conversation-and-referrer-note": [START_BACK_2008, LBP_CPG_2021],
    "ocs-neck-pain-after-minor-trauma": [CANADIAN_CSPINE_2001, NECK_PAIN_CPG_2017],
    "ocs-lumbar-radicular-pain-then-a-new-symptom": [LBP_CPG_2021, STATPEARLS],
    "ocs-neurogenic-or-vascular-claudication": [STATPEARLS],
    "ocs-shoulder-dislocation-two-ages": [STATPEARLS],
    "ocs-distal-radius-fracture-and-hand-numbness": [PRWE_MCID_2015],
    "ocs-acl-return-to-sport-decision": [GRINDEM_2016],
    "ocs-lateral-ankle-sprain-plan": [FAAM_2005, ANKLE_SPRAIN_CPG_2021, OTTAWA_ANKLE_1993],
  },
  ABPTSONC: {
    "onc-lab-values-exercise-clearance": [ONC_SAFETY_MALTSER],
    "onc-prospective-surveillance-plan": [BCRL_CPG_2020, LYMPHEDEMA_DX_CPG_2017],
    "onc-fatigue-screen-and-assess": [CRF_CPG_2022, FACIT_MCID],
    "onc-new-back-pain-prostate-cancer": [NICE_MSCC],
    "onc-limb-volume-from-circumferences": [LYMPHEDEMA_DX_CPG_2017],
    "onc-bone-metastasis-fracture-risk": [ONC_SAFETY_MALTSER],
    "onc-exercise-prescription-during-chemo": [ACSM_CANCER_2019],
    "onc-cdt-phase-one-to-home": [BCRL_CPG_2020, ISL_STAGING],
    "onc-cipn-falls-case": [ASCO_CIPN_2020],
    "onc-outcome-set-for-two-patients": [FACIT_MCID, CRF_CPG_2022, LYMPHEDEMA_DX_CPG_2017],
  },
  ABPTSPCS: {
    "pcs-nine-month-milestone-review": [CDC_9_MONTHS],
    "pcs-duchenne-recognition-and-plan": [DMD_CARE],
    "pcs-part-c-to-part-b-transition": [IDEA_PART_C_TRANSITION],
    "pcs-teacher-and-aide-program": { none: "The 36-inch clear path is the usual accessible-route width; not sourced this pass (not verified)." },
    "pcs-standardized-tool-selection": { none: "Matches standardized tools to purpose and age; no threshold or dose." },
    "pcs-early-cp-detection-preterm": [CP_EARLY_DETECTION, AACPDM_HIP],
    "pcs-classify-cp-and-explain": [GMFCS_ER],
    "pcs-hips-and-shunt-referral-case": [AACPDM_HIP, SHUNT_COMPLICATIONS],
    "pcs-torticollis-first-visit-to-discharge": [TORTICOLLIS_CPG_2018],
    "pcs-mobility-and-orthotic-decisions": { none: "Mobility, seating and orthotic decisions; no threshold or dose." },
    "pcs-outcomes-across-icf-levels": [GMFM_MCID, COPM_CHANGE],
  },
  ABPTSPWCS: {
    "pwcs-classify-incontinence-types": [STATPEARLS],
    "pwcs-pregnancy-screening-and-referral": [STATPEARLS],
    "pwcs-stress-incontinence-program": [NICE_PFMT],
    "pwcs-prolapse-conservative-management": [NICE_NG123],
    "pwcs-trauma-informed-internal-exam": { none: NO_VALUE },
  },
  ABPTSSCS: {
    "scs-runner-triad-recognition": [STATPEARLS],
    "scs-apophyseal-injuries-triage": [STATPEARLS],
    "scs-preparticipation-cardiac-history": [STATPEARLS],
    "scs-sideline-concussion-case": [STATPEARLS],
    "scs-bone-stress-site-triage": [STATPEARLS],
    "scs-return-to-sport-test-battery": { none: "Limb symmetry arithmetic on the athlete's own values; no symmetry cut-off is asserted as a standard." },
    "scs-collapse-in-the-heat": [STATPEARLS],
    "scs-acl-criterion-based-phases": [AAOS_ACL_2023],
    "scs-acl-prevention-program-design": [AAOS_ACL_2023],
    "scs-outcome-measures-for-two-athletes": { none: "Chooses outcome measures; no threshold quoted." },
  },
  ABPTSWMS: {
    "wms-npwt-candidate-selection": [STATPEARLS],
    "wms-healing-barriers-plan": [STATPEARLS],
    "wms-stage-four-pressure-injuries": [NPIAP_2016, STATPEARLS],
    "wms-leg-ulcer-etiology-triage": [STATPEARLS],
    "wms-exercise-with-active-plantar-ulcer": [DFU_CPG_2025],
    "wms-wound-note-and-consult": [NPIAP_2016],
    "wms-abi-three-patients": [STATPEARLS],
    "wms-measure-and-track-a-wound": { none: "Area arithmetic on the wound's own measurements; no healing benchmark is asserted." },
    "wms-dfu-healing-prognosis": [STATPEARLS, DFU_CPG_2025],
    "wms-ulcer-that-needs-a-biopsy": [STATPEARLS],
    "wms-compression-decision-venous-ulcer": [STATPEARLS],
    "wms-debride-and-dress-three-wounds": [STATPEARLS],
  },
  DPT: {
    "dpt-calf-pain-differential": { none: "Differential reasoning for calf pain; no scoring threshold (the Wells score is not used)." },
    "dpt-heart-failure-implications": [HF_EXERCISE_2024],
    "dpt-suspected-elder-abuse": { none: NO_VALUE },
    "dpt-informed-consent-withdrawal": { none: NO_VALUE },
    "dpt-appraise-rct-mcid": [ODI_NPRS_2008],
    "dpt-motivational-interviewing-adherence": { none: NO_VALUE },
    "dpt-systems-review-decisions": { none: NO_VALUE },
    "dpt-direct-access-neck-trauma": [CANADIAN_CSPINE_2001],
    "dpt-icf-evaluation-write-up": { none: NO_VALUE },
    "dpt-direct-pta-care": [CMS_BPM_CH15],
    "dpt-chronic-lbp-pain-plan": [ODI_NPRS_2008, LBP_CPG_2021],
    "dpt-subacute-stroke-monitor-adjust": [TILSON_2010],
    "dpt-qi-falls-pdsa": { none: "Quality-improvement arithmetic on the clinic's own counts." },
    "dpt-safety-incident-response": { none: NO_VALUE },
  },
  NPTEPT: {
    "pt-back-pain-malignancy-red-flags": [LBP_CPG_2021],
    "pt-lbp-centralization-progression": [LBP_CPG_2021, ODI_NPRS_2008],
    "pt-tka-plan-dvt-discharge": [TKA_CPG_2026, LEFS_1999],
    "pt-chronic-stroke-locomotor": [LOCOMOTOR_CPG_2020, PERERA_2006],
    "pt-autonomic-dysreflexia-session": [PVA_AD],
    "pt-parkinson-plan-of-care": [PARKINSON_CPG_2022],
    "pt-hf-stop-criteria": [HF_EXERCISE_2024],
    "pt-copd-spo2-dyspnea": { none: "The SpO2 range is the fictional physician's order and the flow and dyspnea numbers are the case's plan, not a standard." },
    "pt-classify-four-wounds": [NPIAP_2016],
    "pt-dfu-infection-then-closure": [DFU_CPG_2025, IWGDF_IDSA_2023],
    // The NPTE-PT header names no orthostatic source; the GCS set's consensus
    // definition (20/10 mm Hg within 3 minutes) is the one the lab applies.
    "pt-competing-systems-orthostatic": [ORTHOSTATIC_2011],
    "pt-bcrl-staging-cdt": [BCRL_CPG_2020],
    "pt-falls-screen-and-dose": [FALL_RISK_CPG_2025],
    "pt-choose-and-fit-devices": { none: "Device-fitting landmarks (two finger-widths, about 30 degrees of elbow flexion) are long-standing teaching values; no guideline found that sets them (not verified)." },
    "pt-hypoglycemia-mid-session": [ADA_HYPOGLYCEMIA],
    "pt-modality-screen": { none: "Applies modality contraindications; no dose quoted." },
    "pt-shoulder-pain-gallbladder": { none: NO_VALUE },
    "pt-medicare-plan-of-care": [CMS_BPM_CH15],
    "pt-classify-incontinence": { none: "Classifies incontinence types from the history; no threshold or dose." },
    "pt-likelihood-ratio-calc": { none: "2x2 arithmetic on the fictional study's counts." },
  },
  NPTEPTA: {
    "pta-back-pain-new-red-flag": { none: "Recognise and report a new red flag; no threshold or dose." },
    "pta-tka-within-plan": [TKA_CPG_2026],
    "pta-soap-note": { none: CASE_DATA },
    "pta-autonomic-dysreflexia": [PVA_AD],
    "pta-new-stroke-signs": { none: "Stroke warning signs are named qualitatively; the times are the case's own." },
    "pta-parkinson-session": [PARKINSON_CPG_2022],
    "pta-vitals-hold-and-stop": [HF_EXERCISE_2024],
    "pta-copd-intensity-band": { none: "The SpO2 range and oxygen flow are the physician's order and the PT's plan in the case, not a standard." },
    "pta-crutch-gait-training": { none: "Crutch-fitting landmarks are long-standing teaching values; no guideline found that sets them (not verified)." },
    "pta-guarding-controlled-fall": { none: NO_VALUE },
    "pta-venous-ulcer-infection": { none: NO_VALUE },
    "pta-hypoglycemia-response": [ADA_HYPOGLYCEMIA],
    "pta-tens-screen": { none: "Applies TENS contraindications; no dose quoted." },
    "pta-heart-failure-weight-gain": [HF_EXERCISE_2024],
    "pta-cdt-cellulitis-hold": [BCRL_CPG_2020],
    "pta-scope-three-requests": [CMS_BPM_CH15],
    "pta-gi-bleed-signs": { none: NO_VALUE },
    "pta-pelvic-floor-coaching": { none: "Hold times follow the PT's plan in the case, not a standard." },
    "pta-berg-administer-report": [BERG_SRALAB],
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
