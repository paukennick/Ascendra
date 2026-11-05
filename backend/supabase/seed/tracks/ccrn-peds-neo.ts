// AACN CCRN (Pediatric) and CCRN (Neonatal): the direct-care acute/critical
// care nursing certifications for nurses caring for critically ill children
// and neonates. The Adult exam lives in ccrn.ts; these two share its source
// and exam format but each has its own published test plan.
//
// Source: AACN Certification Corporation, "CCRN Exam Handbook - Direct
// Care", July 2026 (handbook URL below), read on 2026-10-31 -- the PDF
// itself, each test-plan page rendered and checked by eye, not a summary.
//   - Exam facts (PDF p.7-8): 3 hours; 150 multiple-choice items, 125
//     scored and 25 unscored pretest; passing point set by a modified
//     Angoff study, criterion-referenced. Eligible hours must be with the
//     population the exam covers.
//   - AACN Synergy Model nurse competencies: PDF p.14 (handbook p.9).
//   - Pediatric test plan: PDF p.21-22 (handbook p.16-17); its Testable
//     Nursing Actions: PDF p.23-24 (handbook p.18-19).
//   - Neonatal test plan: PDF p.27-28 (handbook p.22-23); its Testable
//     Nursing Actions: PDF p.29-30 (handbook p.24-25).
//
// Two things the handbook itself prints that look odd, kept as printed:
//   - The Pediatric plan says it "applies to exams taken on and after
//     November 19, 2025"; the Adult and Neonatal plans say November 12,
//     2025. Possibly a typo, but the printed date is what the Pediatric
//     credential carries.
//   - Category weights do not add up to the 80% Clinical Judgment total:
//     Pediatric 11+13+25+15+17 = 81, Neonatal 10+15+20+13+20 = 78. AACN
//     notes on both plans that "the sum of these percentages may not equal
//     100 due to rounding". Weights below are exactly as printed; nothing
//     is rescaled.
//
// Modeling: one unit per published category, weight as printed. AACN never
// gives these exams a code, so credential basis is
// 'vendor_exam_unpublished_code' and examCode is left unset.
//
// Objectives are our own learner-facing paraphrase of each category's
// patient-care problems, with that system's Testable Nursing Actions folded
// in. Neither plan lists testable actions for Endocrine or Musculoskeletal,
// so those objectives come from the problem lists alone. The "General"
// testable actions are not tied to a body system; placing them in the
// Multisystem unit is our judgment, not AACN's -- with one exception: the
// Neonatal General action on caring for families with equity, diversity
// and inclusion in mind sits with the family-care objectives in
// Behavioral/Psychosocial, next to the plan's own diverse-families action. The Professional Caring &
// Ethical Practice unit is built from the seven Synergy nurse competencies
// AACN lists under it, one objective each (plus three population-specific
// additions per track from 2026-10-31, appended after the seven).
//
// Fees deliberately omitted -- they change and differ for AACN members.

//
// Depth added 2026-10-31 from open textbooks (all accessed 2026-10-31).
// The AACN handbook remains the only source of scope: every objective
// added after the "Added 2026-10-31" marker in a unit sits under a problem
// or testable nursing action AACN lists for that population and unit. The
// textbooks supply depth only (pathophysiology, assessment, priorities,
// drugs, complications). Every added objective is our own wording; we took
// topic structure and facts from these books, never their text. Doses and
// numeric thresholds are left out of objective text unless the sources
// agreed.
//   - OpenStax, "Medical-Surgical Nursing", Rice University, 1st ed.
//     (first published 2024; PDF (c)2026), CC BY-NC-SA 4.0 -- NC/SA:
//     topic structure only, no text. LibreTexts' mirror labels it CC BY
//     4.0; the publisher's own copyright page says CC BY-NC-SA 4.0 and
//     that is the licence recorded here.
//     https://openstax.org/details/books/medical-surgical-nursing
//   - OpenStax, "Pharmacology for Nurses", Rice University, 1st ed.
//     (2024), CC BY-NC-SA 4.0 -- NC/SA: topic structure only, no text.
//     https://openstax.org/details/books/pharmacology
//   - OpenStax, "Maternal-Newborn Nursing", Rice University, 1st ed.
//     (2024), CC BY-NC-SA 4.0 -- NC/SA: topic structure only, no text.
//     https://openstax.org/details/books/maternal-newborn-nursing
//   - Open RN / WisTech Open (Chippewa Valley Technical College),
//     "Nursing Health Promotion", Ernstmeyer & Christman (eds.), 2025,
//     CC BY 4.0. https://wtcs.pressbooks.pub/healthpromo/
//   - StatPearls (StatPearls Publishing, NCBI Bookshelf, 2025-2026
//     editions), CC BY-NC-ND 4.0 -- NC/ND: topic structure and facts
//     only, never text; some objectives rest on StatPearls alone.
//     Chapters (NBK id):
//     Pediatric DKA 470282; Diabetes Insipidus 470458; SIADH 507777;
//     Cerebral Salt Wasting 534855; Sickle Cell Crisis 526064; Sickle Cell
//     Anemia 482164; Immune Thrombocytopenia 562282; Tumor Lysis Syndrome
//     518985; Exchange Transfusion 563179; Hemolytic Uremic Syndrome
//     556038; Child Intussusception 431078; Midgut Malrotation 560888;
//     Hirschsprung Disease 562142; Necrotizing Enterocolitis 513357;
//     Pediatric Dehydration 436022; Pediatric Fluid Management 560540;
//     Pediatric Bronchiolitis 519506; Status Asthmaticus 526070;
//     Bronchopulmonary Dysplasia 539879; Tetralogy of Fallot 513288;
//     Kawasaki Disease 537163; Patent Ductus Arteriosus 430758; Pediatric
//     Head Trauma 537029; Pediatric Spine Trauma 442027; Status Epilepticus
//     430686; Child Abuse and Neglect (Nursing) 568689; Septic Shock 430939;
//     Drowning 430833; Acetaminophen Toxicity 441917; Opioid Toxicity
//     470415; ECMO in Children 572104; Pediatric Procedural Sedation 572100;
//     Parkland Formula 537190; Transient Tachypnea of Newborn 537354;
//     Neonatal RDS 560779; Meconium Aspiration 557425; PPHN 585100; Infant
//     Apnea 441969; Congenital Diaphragmatic Hernia 556076; Neonatal
//     Hypoglycemia 537105; Neonatal Jaundice 532930; Neonatal Sepsis 531478;
//     Therapeutic Hypothermia for Neonatal HIE 567714; Periventricular and
//     Intraventricular Hemorrhage 538310; Neonatal Seizures 609108;
//     Retinopathy of Prematurity 562319; Neonatal Abstinence Syndrome
//     551498; Gastroschisis 557894; Omphalocele 519010.
//   No openly licensed pediatric critical-care nursing textbook could be
//   found (the one OER-listed title, Curley & Moloney-Harmon, is a
//   commercial Saunders book). Pediatric depth therefore comes from Open RN
//   Nursing Health Promotion's pediatric chapters plus StatPearls, and
//   adult Medical-Surgical content was not carried over. A few Pediatric
//   objectives (status asthmaticus ventilation/magnesium/heliox, septic
//   shock, toxic ingestion, burn resuscitation) rest on StatPearls chapters
//   that are not child-specific; they state principles, not adult doses.
//
// Source tiers (docs/source-reliability-standard.md; audit 2026-10-31).
// Tier 2 criteria: 1 credentialed authors, 2 stated review, 3 publisher,
// 4 date (clinical: within 5 years), 5 no commercial interest.
//   - AACN CCRN Exam Handbook (July 2026): Tier 1 (credentialing body).
//   - OpenStax Medical-Surgical Nursing, Pharmacology for Nurses,
//     Maternal-Newborn Nursing: Tier 2, all five met (named senior
//     authors with nursing/pharmacy doctorates, named reviewers, Rice
//     University, 2024, non-profit).
//   - Open RN Nursing Health Promotion: Tier 2, all five met (editors
//     Ernstmeyer MSN RN and Christman DNP RN, named peer reviewers,
//     Chippewa Valley Technical College / WTCS, 2025, non-profit).
//   - StatPearls: Tier 2, all five met (licence above). Every chapter listed above was
//     checked on PubMed for its last update; all fall within 5 years
//     (oldest here: SIADH 507777, updated 2023-03-06, which fails
//     criterion 4 after 2028-03-06; oldest in either CCRN file: Thyroid
//     Storm, 2022-10-06). Sampled chapters on
//     statpearls.com name physician authors (MD/DO/MBBS) and one
//     physician assistant, with no-conflict
//     disclosures; the publisher's editorial policy states internal,
//     external and anonymous peer review. StatPearls Publishing also sells
//     exam prep; the chapters are not marketing, and the standard names
//     StatPearls as qualifying. Septic Shock 430939 (2023-06-12) is
//     current but predates the 2026 SSC paediatric guideline, which
//     overrides it below.
//   - Tier 1 guidelines added by the audit, all accessed 2026-10-31.
//     Unless a licence is given, each is copyright and used for facts
//     only; no text is reproduced.
//     G1 AAP, "Clinical Practice Guideline: The Diagnosis, Management,
//        and Prevention of Bronchiolitis", Pediatrics 2014;134:e1474
//        (Ralston et al.), doi:10.1542/peds.2014-2742; read from the
//        publisher's PDF as hosted by Stanford Children's Health. No newer AAP version was
//        found on PubMed; AAP guidelines lapse after 5 years unless
//        reaffirmed and no reaffirmation notice was found, so G2 is used
//        alongside it.
//     G2 Australasian Bronchiolitis Guideline: 2025 Update (PREDICT
//        network, J Paediatr Child Health 2025, doi:10.1111/jpc.70144;
//        https://pmc.ncbi.nlm.nih.gov/articles/PMC12397848/).
//     G3 ILAE Task Force on Neonatal Seizures, "Treatment of seizures in
//        the neonate: Guidelines and consensus-based recommendations",
//        Epilepsia 2023;64:2550-2570 (Pressler et al.),
//        doi:10.1111/epi.17745. CC BY-NC-ND 4.0 (facts only).
//     G4 Canadian Paediatric Society, "Acute management of croup in the
//        emergency department" (updated 2026-03-06),
//        https://cps.ca/en/documents/position/acute-management-of-croup
//     G5 Surviving Sepsis Campaign, "International Guidelines for the
//        Management of Sepsis and Septic Shock in Children 2026",
//        Intensive Care Med 2026;52:937-983 (Weiss et al.),
//        doi:10.1007/s00134-026-08360-2 (ESICM/SCCM).
//     G6 FDA-approved labelling for Lanoxin (digoxin) injection, DailyMed
//        set 9ec84cac-6ecc-43dc-8006-6ccc029e2707 (Nov 2025), public
//        domain. https://dailymed.nlm.nih.gov/
//     G7 CDC, "Clinical Overview of Group B Strep" (reviewed 2025-03-13),
//        https://www.cdc.gov/group-b-strep/hcp/clinical-overview/index.html,
//        public domain; AAP clinical reports on early-onset
//        bacterial sepsis, Pediatrics 2018;142:e20182894 and e20182896
//        (Puopolo et al.; abstracts only -- full text refused access).
//
// Where the sources disagreed, and what we did (checked against Tier 1,
// 2026-10-31):
//   - Neonatal seizures first-line drug: Maternal-Newborn Nursing 25.4
//     (levetiracetam increasingly popular) versus StatPearls (phenobarbital).
//     Resolved by ILAE, Treatment of seizures in the neonate, 2023 (G3):
//     phenobarbital first line whatever the cause, unless a channelopathy
//     is likely. Maternal-Newborn Nursing is overruled. Neonatal objective
//     3/15 now names phenobarbital.
//   - Neonatal sepsis onset windows: Maternal-Newborn Nursing 25.4 gives
//     overlapping windows. Unresolved: the Tier 1 sources define onset for
//     different scopes -- CDC (G7) splits GBS disease at 7 days (late
//     onset to 89 days), while the AAP 2018 reports frame early-onset
//     bacterial sepsis around the first 72 hours (seen in secondary
//     summaries; the full text was not readable). No day cut-off is
//     written into any objective.
//   - Bronchiolitis drugs: Health Promotion 15.11 (steroids and
//     bronchodilators may be given) versus StatPearls (no steroids or
//     racemic epinephrine; albuterol trial). Resolved by AAP, Bronchiolitis
//     guideline, 2014 (G1) with PREDICT 2025 (G2): no albuterol, no
//     epinephrine, no systemic corticosteroids. The earlier choice to
//     follow StatPearls was only partly right -- AAP 2014 explicitly drops
//     the albuterol trial. G2 allows considering steroid plus adrenaline
//     in severe disease needing ICU care (conditional), so Paediatric
//     objective 1/11 now says these drugs are not recommended for routine
//     use rather than never.
//   - Bronchiolitis oxygen target: Health Promotion 15.10 (above 90%)
//     versus StatPearls (treat below 92%). Partly resolved: G1 and G2
//     agree on 90% for otherwise healthy infants, but G2 uses 92% for
//     infants under 6 weeks or with an underlying condition, and G1
//     excludes most children with underlying disease from its management
//     sections -- exactly the PICU population. No number is written in;
//     objective 1/11 states the principle (persistent low saturation, not
//     work of breathing alone).
//   - Digoxin and potassium: Health Promotion 17.5's table (hyperkalemia
//     contributes) versus its text (low potassium and magnesium do).
//     Resolved by the FDA Lanoxin label (G6): hypokalemia, hypomagnesemia
//     and hypercalcemia predispose to toxicity; hyperkalemia is a result
//     of severe overdose. The existing Paediatric objective 0/16 already
//     matches; no edit.
//   - Croup severity: Health Promotion 15.8 (stridor means severe) versus
//     its own Westley table. Resolved by Canadian Paediatric Society,
//     Acute management of croup, updated 2026 (G4): stridor easily heard
//     at rest marks moderate croup; severity is judged clinically in four
//     grades, and the CPS notes research scores have not been shown to
//     improve care. Objective 1/13 now follows the CPS grading instead of
//     naming the Westley score as the tool.
//   - Paediatric septic shock vasoactive choice by "warm" versus "cold"
//     shock (StatPearls Septic Shock): checked against SSC paediatric 2026
//     (G5). Overruled: the SSC finds insufficient evidence to prefer
//     epinephrine or norepinephrine first line, its 2020 edition advised
//     against classing shock as warm or cold from bedside signs alone, and
//     it suggests starting vasoactives peripherally rather than waiting for
//     central access. It recommends antimicrobials ideally within 1 hour
//     in suspected septic shock. Objective 4/15 now follows it.

import type { SeedTrack, SeedUnit } from "../data";

const HANDBOOK_URL =
  "https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en";

const VERIFIED_AT = "2026-10-31T00:00:00Z";
const REVIEW_DUE_AT = "2027-10-31T00:00:00Z";

// Same wording key as every other nursing track (mobile/src/content/disclaimers.ts).
const NURSING_DISCLAIMER_KEY = "nursing-clinical-content";

const AACN_CERT_PROVIDER = {
  providerSlug: "aacn-certification-corp",
  providerName: "AACN Certification Corporation",
  providerUrl: "https://www.aacn.org/certification",
  subcategorySlug: "nursing-specialty-certifications",
  credentialType: "specialist_certification",
} as const;

const EXAM_FORMAT =
  "150 multiple-choice items (125 scored, 25 unscored pretest items) in 3 hours; 80% Clinical Judgment, 20% Professional Caring & Ethical Practice, organized around the AACN Synergy Model for Patient Care";
const PASSING =
  "Criterion-referenced: the passing point is set by a modified Angoff study of subject-matter experts, not by comparison with other candidates.";
const DURATION = 180;

function eligibility(population: "pediatric" | "neonatal"): string {
  return (
    "Current, unencumbered US RN or APRN licence, plus either 1,750 hours of direct care of acutely/critically ill patients in the previous 2 years (875 of them in the most recent year) " +
    `or 2,000 hours in the previous 5 years (144 of them in the most recent year). Hours must be with ${population} patients.`
  );
}

function aacnCredential(params: {
  slug: string;
  name: string;
  url: string;
  population: "pediatric" | "neonatal";
  revision: string;
  effectiveDate: string;
}) {
  return {
    ...AACN_CERT_PROVIDER,
    credentialSlug: params.slug,
    credentialName: params.name,
    credentialUrl: params.url,
    basis: "vendor_exam_unpublished_code" as const,
    examRevision: params.revision,
    objectivesRevision: params.revision,
    status: "active" as const,
    effectiveDate: params.effectiveDate,
    officialObjectivesUrl: HANDBOOK_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: eligibility(params.population),
    durationMinutes: DURATION,
    questionFormat: EXAM_FORMAT,
    passingScorePolicy: PASSING,
  };
}

const COMMON = {
  trackType: "certification" as const,
  subcategorySlug: "nursing-specialty-certifications",
  freshnessModel: "certification_aligned" as const,
  sourceUrl: HANDBOOK_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: NURSING_DISCLAIMER_KEY,
  disclaimerVersion: 1,
};

// Professional Caring & Ethical Practice (20%) -- identical on both plans:
// the seven Synergy nurse competencies other than Clinical Judgment, which
// is the other 80%. Definitions from PDF p.14; population-specific framing
// added per track.
function professionalCaringUnit(
  patients: string,
  family: string,
  extra: string[] = [],
): SeedUnit {
  return {
    title: "Professional Caring & Ethical Practice",
    weight: 20,
    gate: `Given a scenario involving ${patients} and their ${family}, name which Synergy competency the situation calls for and choose the nursing action that best fits it.`,
    objectives: [
      `Advocacy and moral agency: act on behalf of ${patients}, their ${family} and colleagues, and help identify and resolve ethical and clinical concerns, within and outside the clinical setting`,
      `Caring practices: create a compassionate, therapeutic environment through vigilance, engagement and responsiveness, promoting comfort and preventing unnecessary suffering for ${patients} and their ${family}`,
      "Clinical inquiry: question and evaluate practice, and bring evidence-based practice, research and experiential knowledge into changes at the bedside",
      `Collaboration: work with ${family}, the interprofessional team and the community so each person's contribution moves care toward realistic goals`,
      `Facilitation of learning: teach ${family}, nursing staff and team members, formally and informally, adjusting to developmental level, literacy and readiness to learn`,
      "Response to diversity: recognize, value and build into care differences in culture, spirituality, gender, race, ethnicity, lifestyle, socioeconomic status, age and values",
      "Systems thinking: use knowledge of the care system to secure resources, navigate transitions and transfers, and manage care within and across healthcare and non-healthcare systems",
      // Population-specific additions (2026-10-31) go after the shared seven.
      ...extra,
    ],
  };
}

// Added 2026-10-31: depth from open textbooks (sources in file header).
const PEDS_PROFESSIONAL_EXTRA: string[] = [
    "Teach families of critically ill children with short, repeated, plain-language explanations backed by written materials",
    "Assess caregivers' readiness to learn and their preferred learning method before teaching, and confirm skills with return demonstration",
    "Respect cultural and religious beliefs that shape how families respond to a child's illness and hospitalisation",
  ];

const NEO_PROFESSIONAL_EXTRA: string[] = [
    "Keep NICU parents informed and involved in care decisions, and give them space to ask questions and voice feelings",
    "Teach parents medication and feeding skills for home with return demonstration and written instructions",
    "Respect cultural and religious views that shape how families respond to a newborn's congenital condition",
  ];

// ---------------------------------------------------------------------------
// CCRN (Pediatric). Test plan PDF p.21-22, testable actions PDF p.23-24.
// Printed effective date: exams on and after November 19, 2025.
// Clinical Judgment categories: 11 / 13 / 25 / 15 / 17 (sum 81, see header).
// ---------------------------------------------------------------------------
export const CCRN_PEDIATRIC_TRACK: SeedTrack = {
  ...COMMON,
  code: "CCRNPEDS",
  title: "CCRN (Pediatric) Critical Care Coach",
  description:
    "AACN's direct-care certification for nurses caring for acutely and critically ill children, on the test plan in force from November 2025: five clinical-judgment categories weighted as AACN weights them, plus the Synergy Model's professional caring and ethical practice.",
  credential: aacnCredential({
    slug: "ccrn-pediatric",
    name: "CCRN (Pediatric)",
    url: "https://www.aacn.org/certification/get-certified/ccrn-peds",
    population: "pediatric",
    revision: "Pediatric CCRN Test Plan 2025-11-19 (Handbook July 2026)",
    effectiveDate: "2025-11-19",
  }),
  units: [
    {
      title: "Cardiovascular",
      weight: 11,
      gate: "Given a child's rhythm strip, hemodynamic values and history, identify the cardiac problem, judge how unstable the child is, and choose the next nursing action.",
      objectives: [
        "Recognize and manage congenital cardiac malformations, including cyanotic spells and pre- and post-repair physiology",
        "Care for children before and after cardiac surgery, cardiac transplant, and cardiac or vascular catheterization",
        "Identify and manage cardiac infection and inflammatory disease, cardiomyopathies and heart failure",
        "Recognize cardiogenic shock and hypertensive crisis, and anticipate their treatment",
        "Identify, interpret and respond to dysrhythmias and conduction system defects such as prolonged QT and Wolff-Parkinson-White, using a 12-lead ECG where indicated",
        "Recognize indications for and support cardioversion (pharmacologic, non-pharmacologic, electrical), defibrillation and temporary pacing",
        "Monitor hemodynamic status with invasive lines (arterial, central venous pressure) and near-infrared spectroscopy, and recognize signs of instability",
        "Care for children with vascular occlusions and those supported by a ventricular assist device",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Explain how left-to-right shunts (PDA, ASD, VSD) overload the pulmonary circulation and can lead to heart failure and pulmonary hypertension",
        "Explain why right-to-left shunting in cyanotic defects barely responds to supplemental oxygen, and the risks of chronic hypoxemia such as polycythemia, thrombosis and stroke",
        "Respond to a hypercyanotic (tet) spell: calm the child, knee-chest position, oxygen, and anticipate morphine, a fluid bolus and a vasoconstrictor such as phenylephrine",
        "Describe the components and surgical repair of tetralogy of Fallot, and monitor after repair for effusions, bleeding and junctional ectopic tachycardia",
        "Keep the ductus open with a continuous prostaglandin E1 infusion in ductal-dependent lesions, and know why NSAIDs that close the ductus are contraindicated in them",
        "Explain why transposition of the great arteries depends on mixing (and is corrected by arterial switch) while hypoplastic left heart syndrome depends on the ductus for systemic flow and needs staged single-ventricle surgery",
        "Recognise coarctation of the aorta from weaker leg pulses and lower leg than arm blood pressures, and manage postoperative hypertension",
        "Recognise heart failure in infants -- poor feeding, sweating with feeds, tachypnea, poor weight gain -- and treat bradycardia, apnea and lethargy as signs of imminent collapse",
        "Give digoxin safely to infants: double-check the weight-based dose, count the apical pulse for a full minute and hold for bradycardia, and watch for toxicity, especially with low potassium or magnesium",
        "Monitor children on diuretics and ACE inhibitors for electrolyte loss, kidney function and hypotension",
        "Explain why most calcium channel blockers are avoided in infants with heart failure",
        "Give oxygen cautiously to children with left-to-right shunts, because it lowers pulmonary vascular resistance and can worsen pulmonary congestion",
        "Reduce the energy cost of feeding in infants with heart disease: upright position, time-limited feeds, high-calorie feeds and gavage when needed",
        "Recognise Kawasaki disease, give IVIG and aspirin as ordered, and know that coronary artery aneurysm is the complication treatment aims to prevent",
        "Recognise thrombosis risk in congenital heart disease and treat sudden loss of a systemic-to-pulmonary shunt as an emergency",
      ],
    },
    {
      title: "Respiratory",
      weight: 13,
      gate: "Given a child's work of breathing, blood gas and ventilator data, name the respiratory problem and choose the airway, ventilation or therapy step that comes next.",
      objectives: [
        "Recognize and manage acute respiratory failure, acute respiratory infection and ARDS",
        "Manage status asthmaticus and pulmonary hypertension",
        "Care for children with chronic respiratory failure and chronic pulmonary conditions",
        "Recognize airway malformations, and thoracic and airway trauma such as rib fracture, lung contusion and tracheal perforation",
        "Recognize acute pulmonary embolus and care for children after thoracic surgery",
        "Manage artificial airways (endotracheal tube, tracheostomy, LMA) and support rapid sequence intubation",
        "Manage non-invasive ventilation (BiPAP, CPAP, high-flow nasal cannula), conventional invasive ventilation, and non-conventional modes such as high-frequency and jet ventilation",
        "Assess for and prevent complications of mechanical ventilation",
        "Manage chest tubes, prone positioning and therapeutic gases (oxygen, nitric oxide, heliox, CO2)",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Assess respiration in infants and children: count for a full minute, compare with age-specific normal rates, and remember that infants breathe mainly through the nose",
        "Recognise respiratory distress in children -- retractions, nasal flaring, grunting, tachypnea, falling saturation -- and the dehydration that often accompanies it",
        "Manage bronchiolitis with supportive care -- suctioning before feeds, hydration, oxygen only for low saturation that persists, not for laboured breathing on its own -- recognising that albuterol, epinephrine and systemic corticosteroids are not recommended for routine use",
        "Watch young or premature infants with RSV for apnea, and support passive immunisation of high-risk infants",
        "Grade croup severity clinically as mild, moderate, severe or impending respiratory failure, treating obvious stridor while the child is calm as at least moderate disease that needs treatment and closer watching",
        "Care for a child with suspected epiglottitis: keep them calm in a position of comfort, never examine the throat, keep emergency airway equipment at the bedside, and secure the airway with expert help",
        "Manage pediatric status asthmaticus with frequent or continuous bronchodilator, early systemic corticosteroid and IV magnesium, and recognise fatigue and rising PaCO2 as signs of impending failure",
        "Recognise pertussis in infants, who may present with apnea, cyanosis and bradycardia rather than a whoop, and keep isolation precautions",
        "Support children with cystic fibrosis through pulmonary exacerbations with airway clearance, antibiotics and nutrition",
        "Care for children with bronchopulmonary dysplasia as a chronic lung condition with high calorie needs and a risk of pulmonary hypertension",
        "Treat pulmonary hypertension with inhaled nitric oxide as a selective pulmonary vasodilator and with oral or IV pulmonary vasodilators, watching for systemic hypotension",
        "Explain how heliox lowers airway resistance and work of breathing in airway obstruction",
        "When a child with severe asthma is ventilated, allow a long expiratory time to limit air trapping and watch for barotrauma",
        "Distinguish aspiration, community-acquired, healthcare-associated and ventilator-associated pneumonia in children",
        "Support antiviral treatment of influenza and COVID-19 in children, and escalate respiratory support from high-flow to CPAP to intubation as distress worsens",
      ],
    },
    {
      title: "Endocrine, Hematology/Immunology, GI, Renal/GU, Integumentary",
      weight: 25,
      gate: "Given a critically ill child's labs, fluid balance and presentation, identify the endocrine, blood, gut, kidney or skin problem and choose the nursing action that addresses it.",
      objectives: [
        "Manage diabetes mellitus, diabetic ketoacidosis, hyperglycemia and hypoglycemia",
        "Distinguish and manage diabetes insipidus, SIADH and cerebral salt wasting",
        "Recognize and manage anemia, sickle cell crisis, immune deficiencies and myelosuppression (thrombocytopenia, neutropenia)",
        "Recognize coagulopathies (ITP, DIC, HIT) and oncologic complications such as tumor lysis syndrome",
        "Care for children after bone marrow transplant",
        "Administer blood and blood products, recognize transfusion reactions (TRALI, TACO), and support plasmapheresis, exchange transfusion or leukocyte depletion",
        "Recognize and manage abdominal compartment syndrome, abdominal trauma, acute GI hemorrhage, peritonitis, and bowel infarction, obstruction or perforation",
        "Care for children with GI abnormalities, after GI surgery, with hepatic disease or failure, and after liver transplant; recognize necrotizing enterocolitis",
        "Manage malnutrition, malabsorption and inadequate intake, including enteral and parenteral nutrition, enteral tubes, GI drains and intra-abdominal pressure monitoring",
        "Recognize and manage acute kidney injury, chronic kidney disease, hemolytic uremic syndrome and life-threatening electrolyte imbalances",
        "Care for children after kidney transplant and those requiring hemodialysis, CRRT or peritoneal dialysis",
        "Prevent and manage IV infiltration and extravasation, pressure injury, skin failure, wounds and surgical site infection",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Apply the biochemical criteria for pediatric DKA (hyperglycemia, venous acidosis or low bicarbonate, and ketosis) and grade its severity by the acidosis",
        "Resuscitate a child in DKA with isotonic fluid first, replace the remaining deficit gradually, then start a weight-based continuous insulin infusion without a bolus",
        "Add dextrose to IV fluids as glucose falls during DKA treatment, and overlap subcutaneous insulin before stopping the infusion",
        "Monitor potassium and phosphate during DKA treatment, because insulin drives both into cells",
        "Recognise cerebral edema in DKA -- headache, falling heart rate, rising blood pressure, declining consciousness, new incontinence -- and treat with mannitol or hypertonic saline without waiting for a CT",
        "Teach families sick-day rules and the early warning signs of DKA, which is often the first presentation of type 1 diabetes in young children",
        "Tell diabetes insipidus, SIADH and cerebral salt wasting apart in a child after brain injury by urine output, serum sodium and volume status",
        "Give desmopressin for central diabetes insipidus and monitor for hyponatremia from water retention",
        "Treat sickle cell pain crisis with rapid analgesia, parenteral opioids and PCA when needed, recognising hand-foot swelling (dactylitis) in young children",
        "Recognise acute splenic sequestration (sudden enlarging spleen and a sharp hemoglobin fall) and acute chest syndrome as life-threatening sickle cell complications",
        "Protect children with sickle cell disease from overwhelming infection by encapsulated bacteria, and treat fever as urgent",
        "Apply bleeding precautions in immune thrombocytopenia, recognising that very low platelet counts carry the highest risk of serious bleeding",
        "Prevent tumor lysis syndrome in children starting cancer therapy with IV hydration, uric-acid-lowering drugs and frequent electrolyte checks",
        "Monitor exchange transfusion for hypocalcemia and hypoglycemia from citrate, transfusion reactions and circulatory overload",
        "Recognise intussusception -- intermittent severe pain with legs drawn up, vomiting, red-currant-jelly stool -- and prepare for imaging and enema reduction, watching for perforation",
        "Treat bilious vomiting in an infant as possible malrotation with volvulus: decompress the stomach, give fluids and antibiotics, and escalate urgently for surgery",
        "Grade dehydration in children as mild, moderate or severe, use oral rehydration for mild-to-moderate cases and IV isotonic fluid for severe ones, and treat hypotension as a late sign",
        "Recognise Hirschsprung-associated enterocolitis as the most dangerous complication of Hirschsprung disease",
        "Recognise necrotizing enterocolitis -- feeding intolerance, abdominal distension, bloody stool -- and start NPO, gastric decompression, IV antibiotics and serial x-rays",
        "Recognise post-diarrheal hemolytic uremic syndrome (hemolytic anemia, low platelets, kidney injury) and give supportive care, avoiding antibiotics and antimotility drugs and giving platelets sparingly",
      ],
    },
    {
      title: "Musculoskeletal, Neurological, Behavioral/Psychosocial",
      weight: 15,
      gate: "Given a child's neurologic or behavioral presentation, identify the problem, choose the protective or monitoring measure it needs, and respond safely to any behavioral emergency.",
      objectives: [
        "Recognize compartment syndrome, musculoskeletal trauma and rhabdomyolysis",
        "Manage traumatic brain injury, intracranial hemorrhage, stroke and space-occupying lesions using neuroprotective protocols",
        "Care for children with acute spinal cord injury or after spinal fusion, applying spinal precautions",
        "Recognize and manage seizure disorders, with seizure precautions",
        "Care for children with hydrocephalus, congenital neurological abnormalities, neuromuscular disorders, encephalopathy and neurologic infection",
        "Care for children after neurosurgery, including ICP monitoring and ventricular drains",
        "Recognize delirium and withdrawal through behavioral assessment",
        "Understand brain death determination and the nurse's role in assessment",
        "Recognize and act on abuse, neglect and maltreatment",
        "Support children with mood disorders, depression, anxiety, suicidal ideation or behavior, and medical non-adherence",
        "Respond to behavioral emergencies with de-escalation and nonviolent crisis intervention, and manage restraints when indicated",
        "Recognize and reduce post-intensive care syndrome in children and families",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Score consciousness with the pediatric Glasgow Coma Scale, using its age-adjusted verbal responses for infants and young children",
        "In pediatric traumatic brain injury, prevent hypoxia and hypotension, target normal CO2 rather than routine hyperventilation, and secure the airway when the child cannot protect it",
        "Stabilise a child with spinal trauma with spinal immobilisation, and monitor for spinal shock, neurogenic shock, respiratory compromise and pressure injury",
        "Treat a seizure lasting 5 minutes or more in a child as status epilepticus: airway, glucose check, weight-based benzodiazepine, then second-line drugs",
        "Recognise meningococcal disease -- fever, stiff neck, altered mental status, a spreading petechial rash, a bulging fontanel in infants -- and give antibiotics without delay",
        "Recognise signs of physical abuse, including patterned bruising, immersion burns and injuries that do not fit the history, and know that suspected abuse in very young children calls for a skeletal survey",
        "Report suspected child abuse or neglect as a mandated reporter, documenting objectively",
        "Recognise the phases of separation anxiety in hospitalised young children (protest, despair, detachment) and reduce anxiety with routines, comfort objects and parental presence",
        "Recognise regression and stranger anxiety as stress responses to illness, and adapt care to the child's developmental level",
      ],
    },
    {
      title: "Multisystem",
      weight: 17,
      gate: "Given a deteriorating child with problems in more than one system, recognize the pattern (sepsis, shock, MODS, toxic exposure), act first on what threatens life, and call for help appropriately.",
      objectives: [
        "Identify sepsis early and late, and manage SIRS, multi-organ dysfunction and shock states (distributive, hypovolemic, obstructive)",
        "Interpret acid-base and blood gas results and anticipate interventions, including fluid and electrolyte replacement",
        "Care for children with burns, thermal injury or exposure, submersion injury, and toxic ingestion, inhalation or exposure",
        "Assess pain in a developmentally appropriate way and manage acute and chronic pain with medications and non-pharmacologic measures",
        "Provide palliative and end-of-life care, and manage tissue and organ donors",
        "Prevent and manage healthcare-acquired conditions and infections",
        "Manage children on ECMO and those requiring progressive mobility",
        "Recognize clinical deterioration, intervene, and seek help; conduct a comprehensive physical and psychosocial assessment and provide family-centered care",
        "Evaluate diagnostic and laboratory results and anticipate the interventions they point to",
        "Administer and monitor medications safely, including polypharmacy, sedation and procedural sedation",
        "Provide pre-, intra- and post-procedural and perioperative care, vascular access care, and temperature monitoring and regulation",
        "Manage monitor alarms by protocol and patient condition, and apply bone-fracture prevention and complementary or non-pharmacologic interventions",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Judge a child's vital signs (heart rate, breathing rate, blood pressure) against norms for age, remembering that hypotension is a late sign of shock in children",
        "Choose a pain tool by developmental stage (NIPS, FLACC, FACES or a numeric scale) and recognise behavioral signs of pain in infants and toddlers",
        "Calculate and verify weight-based doses (mg/kg or body surface area), measure with the smallest suitable syringe, and have high-alert doses double-checked",
        "Manage pediatric septic shock: antibiotics ideally within the first hour, fluid boluses reassessed after each, and epinephrine or norepinephrine (neither preferred first line), which may be started through a peripheral line rather than waiting for central access",
        "Give fluid boluses to children repeatedly while reassessing perfusion and urine output, and stop at signs of fluid overload",
        "Watch dehydrated or acutely ill children for hypo- or hypernatremia and hypoglycemia",
        "Recognise dehydration in infants: sunken fontanel, fewer wet diapers, dry mucous membranes and tachycardia",
        "After a drowning, give rescue breaths before chest compressions because hypoxia drives the injury, and watch for ARDS and hypoxic brain injury",
        "Manage acetaminophen and opioid ingestions with timed levels and N-acetylcysteine, or naloxone with continued monitoring",
        "Support children on ECMO for respiratory or cardiac failure, monitoring for bleeding and circuit complications",
        "Monitor children during procedural sedation for agent-specific adverse effects, and keep sedation no longer than the procedure needs",
        "Involve parents in assessment and care, including keeping them present for exams, as a core of family-centered pediatric critical care",
        "Use a burn resuscitation formula only as a starting estimate, adjusting to the child's response to avoid both under- and over-resuscitation",
      ],
    },
    professionalCaringUnit("critically ill children", "families", PEDS_PROFESSIONAL_EXTRA),
  ],
};

// ---------------------------------------------------------------------------
// CCRN (Neonatal). Test plan PDF p.27-28, testable actions PDF p.29-30.
// Effective for exams on and after November 12, 2025.
// Clinical Judgment categories: 10 / 15 / 20 / 13 / 20 (sum 78, see header).
// ---------------------------------------------------------------------------
export const CCRN_NEONATAL_TRACK: SeedTrack = {
  ...COMMON,
  code: "CCRNNEO",
  title: "CCRN (Neonatal) Critical Care Coach",
  description:
    "AACN's direct-care certification for nurses caring for acutely and critically ill neonates, on the test plan in force from November 12, 2025: five clinical-judgment categories weighted as AACN weights them, plus the Synergy Model's professional caring and ethical practice.",
  credential: aacnCredential({
    slug: "ccrn-neonatal",
    name: "CCRN (Neonatal)",
    url: "https://www.aacn.org/certification/get-certified/ccrn-neo",
    population: "neonatal",
    revision: "Neonatal CCRN Test Plan 2025-11-12 (Handbook July 2026)",
    effectiveDate: "2025-11-12",
  }),
  units: [
    {
      title: "Cardiovascular",
      weight: 10,
      gate: "Given a neonate's rhythm, perfusion and hemodynamic data, explain where the transition from fetal circulation has gone wrong or which defect is present, and choose the next nursing action.",
      objectives: [
        "Explain normal fetal circulation and the transition to extrauterine life, and recognize when it fails (PDA, PFO, PPHN)",
        "Recognize and care for neonates with congenital heart defects and acquired cardiac conditions",
        "Recognize signs of hemodynamic instability and cardiac tamponade",
        "Recognize and manage heart failure (high output, congestive, secondary)",
        "Identify, interpret and monitor dysrhythmias, and support pharmacologic and mechanical cardioversion",
        "Use non-invasive and invasive hemodynamic monitoring",
        "Manage patent ductus arteriosus and care for neonates after cardiac surgery",
        "Manage vascular access: peripheral IVs, UVC, UAC, midlines, PICCs, tunneled and non-tunneled lines",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Trace fetal circulation through the placenta, ductus venosus, foramen ovale and ductus arteriosus",
        "Explain how the first breaths lower pulmonary vascular resistance and raise left atrial pressure, closing the foramen ovale and constricting the ductus",
        "Recognise a symptomatic PDA in a preterm infant -- continuous murmur, bounding pulses, wide pulse pressure, worsening respiratory status -- and support fluid restriction and drug closure",
        "Monitor infants receiving NSAIDs or acetaminophen to close the ductus for kidney injury, bleeding, low platelets and NEC",
        "Keep the ductus open with a prostaglandin E1 infusion in ductal-dependent heart lesions until surgery",
        "Classify congenital heart defects as cyanotic or acyanotic and by their effect on pulmonary blood flow",
        "Perform and interpret critical congenital heart disease screening with paired preductal and postductal saturations",
        "Name maternal and genetic risk factors for congenital heart disease, such as maternal diabetes and chromosomal syndromes",
        "Recognise heart failure in the newborn -- tachypnea, feeding difficulty, sweating with feeds, hepatomegaly -- and treat bradycardia and apnea as signs of collapse",
        "Give digoxin to neonates safely: double-check the dose, count the apical pulse for a full minute, and hold for bradycardia",
        "Explain why transposition of the great arteries depends on mixing through the foramen ovale or a septal defect, and hypoplastic left heart syndrome on the ductus for systemic flow, after birth",
        "Monitor infants during therapeutic hypothermia for bradycardia, hypotension and QT prolongation",
        "Weigh infants with heart disease daily in grams, record intake and output, and keep a neutral thermal environment to limit cardiac workload",
        "Read a significant difference between preductal and postductal saturation as a sign of right-to-left ductal shunting",
      ],
    },
    {
      title: "Respiratory",
      weight: 15,
      gate: "Given a neonate's gestational age, work of breathing and blood gas, identify the respiratory problem and choose the right level of respiratory support and next step.",
      objectives: [
        "Recognize and manage respiratory distress syndrome, transient tachypnea of the newborn and failed respiratory transition (surfactant deficiency, secondary apnea)",
        "Manage apnea of prematurity and acute respiratory distress or failure",
        "Recognize aspiration (meconium, secretions, milk, gastric contents) and respiratory infection (bacterial, viral, fungal)",
        "Care for neonates with chronic lung disease/BPD and pulmonary interstitial emphysema",
        "Recognize congenital respiratory anomalies (CDH, TEF-EA, choanal atresia, tracheal malacia/stenosis/atresia, CPAM, chylothorax) and care for neonates after respiratory surgery",
        "Recognize pleural space abnormalities (pneumothorax, hemothorax, empyema, effusions), and manage chest tubes and thoracentesis",
        "Recognize pulmonary hemorrhage and pulmonary hypertension, including PPHN",
        "Interpret blood gas results and manage respiratory monitoring (SpO2, SvO2, ETCO2)",
        "Manage airways (endotracheal tube, LMA, tracheostomy) and the medications and monitoring for rapid sequence intubation",
        "Manage non-invasive support (CPAP, NIPPV, high-flow nasal cannula), conventional and high-frequency ventilation, and therapeutic gases, and prevent complications of respiratory support",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Recognise respiratory distress syndrome from surfactant deficiency -- tachypnea, grunting, flaring, retractions, cyanosis -- and expect it to worsen over the first days before improving",
        "Explain how antenatal corticosteroids, exogenous surfactant, CPAP and caffeine change the course of RDS, and assist with surfactant given through the endotracheal tube",
        "Watch ventilated preterm infants for air leaks (pneumothorax, pulmonary interstitial emphysema) and for the IVH, PDA and BPD associated with RDS",
        "Recognise transient tachypnea of the newborn from retained lung fluid, know its risk factors, and support it while sepsis is ruled out",
        "Manage meconium aspiration with standard resuscitation rather than routine tracheal suctioning, and watch for PPHN, air leak and hypoxic-ischemic encephalopathy",
        "Explain how PPHN causes right-to-left shunting through the PDA and foramen ovale, name its causes, and anticipate inhaled nitric oxide, cardiovascular support and ECMO",
        "Define apnea of prematurity, tell it apart from periodic breathing, and treat it with caffeine and CPAP",
        "Define bronchopulmonary dysplasia by oxygen need at 36 weeks' corrected age, and support growth nutrition, diuretics, bronchodilators, RSV prophylaxis and monitoring for pulmonary hypertension",
        "Recognise congenital diaphragmatic hernia -- respiratory distress, scaphoid abdomen, reduced breath sounds -- and anticipate pulmonary hypoplasia and pulmonary hypertension",
        "Recognise esophageal atresia with tracheoesophageal fistula (coughing, choking and cyanosis with feeds, a tube that will not pass), keep the infant NPO, and protect against aspiration",
        "Lead neonatal resuscitation steps: warm, dry and stimulate, start positive-pressure ventilation for apnea or a low heart rate, and use heart-rate rise as the main sign of effective ventilation",
        "Rule out pneumonia and sepsis in neonatal respiratory distress, because both can mimic other conditions",
        "Explain why outdated PPHN treatments such as induced alkalosis are no longer used",
      ],
    },
    {
      title: "Endocrine, Hematology/Immunology, GI, Renal/GU, Integumentary",
      weight: 20,
      gate: "Given a neonate's labs, feeding history and skin and abdominal findings, identify the endocrine, blood, gut, kidney or skin problem and choose the nursing action that fits the infant's gestational age.",
      objectives: [
        "Recognize and manage disorders of glucose homeostasis (hypo- and hyperglycemia), calcium homeostasis, and glucose, protein and fat metabolism",
        "Recognize adrenal and thyroid disorders in the neonate",
        "Recognize blood cell disorders (anemias, polycythemia, sickle cell disease, leukopenia) and coagulopathies (DIC, thrombocytopenia, hemorrhagic disease of the newborn, factor deficiencies)",
        "Recognize hemolytic disease of the newborn from Rh and ABO incompatibility",
        "Administer blood products, apply blood conservation techniques, and care for neonates with congenital hematologic or immunologic abnormalities",
        "Recognize congenital and acquired GI abnormalities (omphalocele, gastroschisis, malrotation/volvulus, imperforate anus, Hirschsprung disease, intussusception, pyloric stenosis, atresias) and provide surgical care",
        "Recognize and manage necrotizing enterocolitis, gastroesophageal reflux and hepatic failure (portal hypertension, biliary atresia, cholestasis), including peritoneal drains",
        "Manage feeding intolerance, malabsorption and feeding difficulties with enteral and parenteral nutrition, gastric and post-pyloric tubes, lactation support and the transition to oral feeding",
        "Recognize congenital and acquired renal and GU conditions (hypospadias, polycystic kidney disease, hydronephrosis, bladder exstrophy, posterior urethral valves, ambiguous genitalia, AKI, CKD), renal infections and surgical care",
        "Manage fluid and electrolytes for neonates with renal problems and support diagnostic procedures such as renal biopsy and ultrasound",
        "Protect skin integrity by gestational age: transepidermal water loss, humidity, bathing, adhesives, diaper dermatitis and skin infection",
        "Recognize congenital skin abnormalities (epidermolysis bullosa, skin tags, hemangiomas) and manage infiltration/extravasation and wounds with wound VACs, pressure-reduction surfaces and ostomy devices",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Name the risk factors for neonatal hypoglycemia (infant of a diabetic mother, small or large for gestational age, prematurity, cold stress) and screen at-risk infants, since many have no symptoms",
        "Recognise neonatal hypoglycemia (jitteriness, poor feeding, lethargy, apnea, seizures), start early feeding, and give IV dextrose when needed",
        "Anticipate the problems of the infant of a diabetic mother: macrosomia and birth injury, hypoglycemia, hypocalcemia, hypomagnesemia, hyperbilirubinemia, RDS and congenital anomalies",
        "Identify hemolytic disease from Rh or ABO incompatibility with a direct antiglobulin (Coombs) test, and prepare for exchange transfusion when phototherapy is not enough",
        "Monitor exchange transfusion for hypocalcemia, hypoglycemia, dysrhythmia and infection",
        "Recognise NEC -- feeding intolerance, distension, bilious vomiting, bloody stool, pneumatosis on x-ray -- and start NPO, gastric decompression, parenteral nutrition, antibiotics and serial x-rays",
        "Explain why human milk lowers NEC risk, and anticipate short bowel, strictures and parenteral-nutrition liver disease after NEC",
        "Tell gastroschisis (no covering sac) from omphalocele (sac, often with other anomalies), protect exposed bowel, and manage heat and fluid loss before closure",
        "Treat bilious vomiting in a newborn as possible malrotation with volvulus and escalate for urgent surgery",
        "Suspect Hirschsprung disease when meconium is not passed within 48 hours, and watch for enterocolitis",
        "Support feeding in infants with cleft lip or palate using positioning and special nipples or feeders",
        "Manage fluid balance in preterm infants, whose thin skin and radiant warmers increase water loss, using daily weights and diaper weights to detect dehydration or overload",
        "Prevent central line infection in infants on long-term parenteral nutrition",
        "Protect fragile preterm skin with gentle handling, soft linens and moisture barriers",
      ],
    },
    {
      title: "Musculoskeletal, Neurological, Behavioral/Psychosocial",
      weight: 13,
      gate: "Given a neonate's neurologic findings or a family under strain, identify the problem, choose the neuroprotective or supportive action, and respond safely if behavior escalates.",
      objectives: [
        "Recognize acquired musculoskeletal conditions (osteopenia, fractures, brachial plexus injury, infection) and congenital ones (craniofacial, limb, muscle, spine, osteogenesis imperfecta)",
        "Recognize congenital neurological abnormalities (AV malformation, myelomeningocele, encephalocele, hydrocephalus) and care for neonates after neurosurgery, including ICP monitoring and ventricular drains",
        "Recognize extracranial, intracranial and intraventricular hemorrhage and neurologic infection",
        "Recognize ischemic insult (stroke, periventricular leukomalacia, HIE) and manage therapeutic hypothermia",
        "Recognize and manage neonatal seizures",
        "Recognize state dysregulation (stress, pain, agitation) and manage pain and sedation with pharmacologic and non-pharmacologic measures",
        "Implement neuroprotective and neurodevelopment-promoting strategies",
        "Support families facing altered family systems (engagement, resource limits, caregiver confidence, PTSD, postpartum mood disorder) and families in crisis (grief, poor coping, escalation, obstruction of care)",
        "Recognize and act on abuse, neglect and maltreatment",
        "Care for diverse families (cultural, spiritual, LGBTQ+) with equity and inclusion, address communication and language barriers, and recognize social determinants of health",
        "Facilitate progressive family involvement and trauma-informed care, and respond to behavioral emergencies with de-escalation and nonviolent crisis intervention",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Tell caput succedaneum (crosses sutures) from cephalohematoma (does not) and other extracranial birth injuries, and name the delivery risk factors",
        "Recognise that intraventricular hemorrhage in very preterm infants is often silent, support head ultrasound screening, and reduce risk with antenatal steroids and delayed cord clamping",
        "Monitor head circumference and fontanel after IVH to catch post-hemorrhagic ventricular dilation and hydrocephalus",
        "Assess hypoxic-ischemic encephalopathy with a Sarnat exam, and start therapeutic hypothermia within the first hours of life when the infant qualifies",
        "Recognise subtle neonatal seizures (lip smacking, eye deviation, apnea), support EEG confirmation, look for treatable causes such as hypoglycemia, hypocalcemia and infection, and expect phenobarbital as the first-line antiseizure drug",
        "Consider meningitis in a neonate with seizures or a bulging fontanel",
        "Assess pain in neonates, including preterm infants who are more sensitive to it, with a validated tool such as NIPS, and treat it during procedures",
        "Lower NICU stress with developmental care: dim light, low noise, clustered care and skin-to-skin contact",
        "Support bonding when a newborn has a congenital or genetic condition, addressing parental anxiety and guilt",
        "Support families through neonatal death with bereavement care, including recognising siblings' grief",
        "Check perfusion and skin under serial casts for clubfoot, and explain the treatment plan to parents",
        "Recognise craniofacial conditions such as microcephaly and craniosynostosis and their effect on brain growth",
      ],
    },
    {
      title: "Multisystem",
      weight: 20,
      gate: "Given a neonate with problems across several systems, recognize the pattern (sepsis, shock, exposure, genetic syndrome, maternal complication), act first on what threatens life, and call for help appropriately.",
      objectives: [
        "Identify and manage early- and late-onset sepsis, multi-organ failure and shock states (hypovolemic, septic, cardiogenic, obstructive)",
        "Manage acid-base and fluid/electrolyte imbalance",
        "Promote thermoregulation based on gestational age",
        "Recognize and manage hyperbilirubinemia, hydrops fetalis and the infant of a diabetic mother",
        "Recognize birth trauma and the effects of life-threatening maternal/fetal complications (eclampsia, HELLP, maternal-fetal transfusion, placental abruption, placenta previa)",
        "Recognize genetic conditions (metabolic disorders, syndromes such as Turner, Noonan, Beckwith-Wiedemann, Prader-Willi, Angelman and CHARGE, trisomies 13, 18 and 21) and sequences (VACTERL, Pierre Robin), and their impact on postnatal care",
        "Care for neonates with toxin or drug exposure, including withdrawal from maternal or iatrogenic substances and fetal alcohol spectrum disorder",
        "Recognize indications for advanced therapies (ECMO, CRRT, dialysis, therapeutic hypothermia) and follow their protocols",
        "Prevent healthcare-acquired conditions (CAUTI, CLABSI, VAE, HAPI, PIVIE, MDRO) and keep neonates safe (transport, security, safe sleep, safe handling, infection prevention)",
        "Explain how developmental physiology at each gestational age shapes postnatal care and assessment",
        "Recognize sensory impairment (retinopathy of prematurity, glaucoma, congenital hearing loss), growth and developmental delay, and follow newborn screening protocols (car seat, metabolic, hearing, critical congenital heart disease)",
        "Assess and monitor by gestational age, anticipate evolving deterioration and emergencies, act, and seek help; interpret diagnostic results",
        "Dose and manage enteral, oral and parenteral medications by gestational age and weight; manage equipment; provide developmental and perioperative/procedural care",
        "Provide palliative, end-of-life and bereavement care for terminal conditions",
        // Added 2026-10-31: depth from open textbooks (sources in file header).
        "Name maternal, neonatal and treatment-related risk factors for neonatal sepsis, and recognise its subtle signs, including hypothermia rather than fever",
        "Obtain adequate-volume blood cultures and give empiric ampicillin with an aminoglycoside promptly, knowing cephalosporins alone miss Listeria",
        "Prevent the four routes of neonatal heat loss (evaporation, conduction, convection, radiation), knowing newborns produce heat from brown fat rather than shivering",
        "Explain how cold stress causes hypoglycemia, acidosis and hypoxemia, and rewarm using skin-to-skin contact, radiant warmers or incubators",
        "Tell physiologic from pathologic jaundice, treating jaundice in the first 24 hours as pathologic, and know the risk factors for severe hyperbilirubinemia",
        "Start phototherapy by plotting the hour-specific bilirubin against thresholds set by gestational age and the infant's neurotoxicity risks, and recognise acute bilirubin encephalopathy before it becomes kernicterus",
        "Anticipate the conditions associated with trisomy 21, such as congenital heart disease and thyroid disease",
        "Recognise the features of trisomies 13 and 18 and support families choosing between comfort care and full intervention",
        "Recognise Turner syndrome in the newborn (lymphedema, webbed neck, cardiac and renal anomalies)",
        "Screen an infant with one VACTERL anomaly for the others",
        "Recognise fetal alcohol spectrum disorder and arrange early supportive and developmental services",
        "Score neonatal withdrawal with a tool such as the Finnegan scale, start with non-drug care (rooming in, swaddling, low stimulation), and add medication when scores call for it",
        "Classify preterm infants by gestational age and link each organ system's immaturity to its complications",
        "Support retinopathy of prematurity screening for at-risk infants and keep oxygen saturation within ordered targets, because excess oxygen contributes to ROP",
        "Complete newborn screening (blood spot, hearing, critical congenital heart disease) at the right time and follow up abnormal results",
        "Teach safe sleep (on the back, firm flat mattress, nothing soft in the crib, room-sharing) and rear-facing car seats",
        "Keep infants secure with matched identification bands and security alarms",
        "Calculate neonatal drug doses by weight, with independent double-checks, because small errors are magnified in tiny patients",
      ],
    },
    professionalCaringUnit("critically ill neonates", "families", NEO_PROFESSIONAL_EXTRA),
  ],
};

export const CCRN_PEDS_NEO_TRACKS: SeedTrack[] = [CCRN_PEDIATRIC_TRACK, CCRN_NEONATAL_TRACK];
