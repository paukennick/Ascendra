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
// AACN lists under it, one objective each.
//
// Fees deliberately omitted -- they change and differ for AACN members.

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
function professionalCaringUnit(patients: string, family: string): SeedUnit {
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
    ],
  };
}

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
      ],
    },
    professionalCaringUnit("critically ill children", "families"),
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
      ],
    },
    professionalCaringUnit("critically ill neonates", "families"),
  ],
};

export const CCRN_PEDS_NEO_TRACKS: SeedTrack[] = [CCRN_PEDIATRIC_TRACK, CCRN_NEONATAL_TRACK];
