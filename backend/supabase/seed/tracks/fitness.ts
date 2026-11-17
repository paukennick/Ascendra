// Fitness certification tracks (Strand 4 of docs/catalog-backlog.md,
// REQ-085). Five certifying bodies, six credentials, every one read on
// 2026-10-08 from the body's own current document -- not a prep-site
// summary (those disagree with each other and several still carry
// superseded blueprints):
//
// - NASM-CPT: NASM Candidate Handbook, "Updated 9/2025", Appendix A
//   (domains validated by the 2019 Job Analysis Study).
// - ACE-CPT: ACE Personal Trainer Exam Content Outline PDF (2022 role
//   delineation study; in effect since August 21, 2023 per ACE's own
//   announcement, next review on ACE's five-year cycle).
// - ACSM-CPT: ACSM Certified Personal Trainer Exam Content Outline PDF,
//   "Effective July 10, 2025" (2024 job task analysis; the PDF's domain
//   table is titled "2021 ACSM-CPT Performance Domains").
// - NSCA CSCS and NSCA-CPT: the detailed content outlines from NSCA's 2025
//   job task analyses, "New Detailed Content Outline (DCO) Date Effective:
//   July 1, 2025" (NSCA JTA summaries, re-read 2026-11-09), reproduced in
//   the NSCA Certification Handbook, Appendices F and H. (Corrected
//   2026-11-09: the track had used July 1, 2026; the outlines took effect
//   July 1, 2025, as the lab headers already said.)
// - ISSA: ISSA's NCCA-accredited exam is the NCCPT-CPT, run by its
//   subsidiary NCCPT; NCCPT Certification Programs Candidate Handbook,
//   Appendix 2 (2020 Job Analysis Study). ISSA's own open-book course exam
//   is not NCCA-accredited and is not what this track models.
//
// Modeling: real proctored exams, none with a vendor exam code, so
// credential_basis 'vendor_exam_unpublished_code' with examCode unset,
// exactly as Google Cloud and ABPTS are handled. All sit in the existing
// Health & Fitness / Fitness subcategory (migration 007) with freshness
// overridden to certification_aligned on the track.
//
// REQ-114 (Audit 3 M7): every fitness track now carries a disclaimer gate
// (disclaimerKey "fitness-content"; since REQ-165 it needs the study notice)
// and the prompts' exam-prep safety framing (lib/prompts.ts domainFraming,
// category health-fitness). These are not clinical credentials, but the
// tracks teach exercise for special populations, screening and nutrition,
// and a learner acting on a wrong generated detail can hurt themselves or a
// client. The gate was previously left off on purpose; this reverses that.
//
// Objectives are written in our own words from each outline's domains and
// task statements -- deliberately not copied.

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const VERIFIED_AT = "2026-10-08T00:00:00Z";
const SUB = "fitness";

export const FITNESS_DISCLAIMER_KEY = "fitness-content";

const COMMON = {
  trackType: "certification" as const,
  subcategorySlug: SUB,
  freshnessModel: "certification_aligned" as const,
  sourceVerifiedAt: VERIFIED_AT,
  requiresAcknowledgement: true,
  disclaimerKey: FITNESS_DISCLAIMER_KEY,
  disclaimerVersion: 1,
};

// ---------------------------------------------------------------------------
// NASM-CPT
// ---------------------------------------------------------------------------
export const NASM_CPT_TRACK: SeedTrack = {
  ...COMMON,
  code: "NASMCPT",
  title: "Prep for a personal trainer certification exam (exercise technique focus)",
  description:
    "NASM's NCCA-accredited personal trainer exam on its current six-domain blueprint: exercise technique and training instruction (24%), program design (20%), assessment (16%), sciences and nutrition, client relations, and professional responsibility.",
  sourceUrl: "https://www.nasm.org/certified-personal-trainer/exam-information",
  credential: {
    providerSlug: "nasm",
    providerName: "National Academy of Sports Medicine",
    providerUrl: "https://www.nasm.org/",
    subcategorySlug: SUB,
    credentialSlug: "nasm-cpt",
    credentialName: "NASM Certified Personal Trainer (NASM-CPT)",
    credentialType: "certification",
    credentialUrl: "https://www.nasm.org/certified-personal-trainer",
    basis: "vendor_exam_unpublished_code",
    examRevision: "CPT 7 blueprint (2019 Job Analysis Study; handbook updated Sept 2025)",
    status: "active",
    officialObjectivesUrl:
      "https://2494739.fs1.hubspotusercontent-na1.net/hubfs/2494739/NASM%20Website/Web%20Resources/NASM%20Candidate%20Handbook%20.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "High school diploma or GED plus current CPR and AED certification before the exam. No prior fitness certification or degree required. Recertify every two years with 2.0 CEUs.",
    durationMinutes: 120,
    questionFormat: "120 four-option multiple-choice questions (100 scored, 20 unscored pretest), closed book, proctored by PSI in person or by remote proctor; must be taken within 180 days of purchase",
    passingScorePolicy: "Scaled score of 70 or higher (0-100 scale), criterion-referenced cut score set by modified Angoff.",
  },
  units: [
    {
      title: "Basic and applied sciences and nutritional concepts",
      weight: 15,
      gate: "Explain the physiology behind a training response -- which system adapts, how, and what that means for the next session.",
      objectives: [
        "Structures and functions of the nervous, muscular, skeletal, cardiorespiratory and endocrine systems",
        "Exercise physiology: how each system responds and adapts to acute and chronic exercise",
        "Bioenergetics and metabolism: energy systems and their role across intensities and durations",
        "Human movement science: planes of motion, muscle actions, the kinetic chain and length-tension relationships",
        "Nutrition fundamentals: macronutrients, micronutrients, hydration and energy balance",
        "Supplements and label reading, and the trainer's scope when discussing them",
        "Factors that influence weight management physiology: thermodynamics, sleep, hormones, medications and metabolism",
      ],
    },
    {
      title: "Client relations and behavioral coaching",
      weight: 15,
      gate: "Turn a client's vague wish into a measurable goal and name the behavior-change technique you'd use when they stall.",
      objectives: [
        "Building and maintaining the professional client-trainer relationship: rapport, active listening and communication strategies",
        "Setting and re-evaluating realistic short- and long-term goals with the client from assessment outcomes",
        "Behavior-change models and motivational techniques that sustain adherence",
        "Facilitating lifestyle change and handling lapses without losing the client",
      ],
    },
    {
      title: "Assessment",
      weight: 16,
      gate: "Choose the right assessment for a client, run it safely, and say what a specific result changes in their program.",
      objectives: [
        "Preparticipation screening, health history and when to refer to a medical professional",
        "Static and dynamic postural assessments and the movement compensations they reveal",
        "Performance assessments: cardiorespiratory, strength, power, flexibility and body composition",
        "Interpreting assessment results against norms and the client's goals",
        "Reassessment criteria: time elapsed, plateaus, changed goals or health status",
      ],
    },
    {
      title: "Program design",
      weight: 20,
      gate: "Write a client-specific program with phase, acute variables and progression, and justify every choice from the assessment.",
      objectives: [
        "The OPT model's phases and how a client moves between stabilization, strength and power",
        "Designing flexibility, core, balance and reactive (plyometric) components from assessment results",
        "Designing resistance and cardiorespiratory training with appropriate acute variables",
        "Speed, agility and quickness training and where it fits",
        "Modifying programs for modality, environment and equipment constraints",
        "Program design considerations for special populations: youth, older adults, prenatal, clinical and obese clients",
      ],
    },
    {
      title: "Exercise technique and training instruction",
      weight: 24,
      gate: "Spot a technique fault on a named exercise, explain the kinetic-chain cause, and give the cue or regression that fixes it.",
      objectives: [
        "Instructing and demonstrating proper technique across flexibility, core, balance, plyometric, SAQ, resistance and cardio exercises",
        "Observing and analyzing movement to identify compensations and faults",
        "Correcting technique with verbal, visual and kinesthetic cues and kinetic-chain checkpoints",
        "Regressions and progressions matched to the client's ability",
        "Spotting, safety and equipment use during instruction",
      ],
    },
    {
      title: "Professional development and responsibility",
      weight: 10,
      gate: "Name the scope-of-practice line in a client scenario and the right referral or action.",
      objectives: [
        "Scope of practice and when to refer to other health professionals",
        "Professional conduct, ethics and the code of professional conduct",
        "Legal and risk-management basics: liability, documentation, emergency response",
        "Business fundamentals: marketing, sales and client retention for personal trainers",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// ACE-CPT
// ---------------------------------------------------------------------------
export const ACE_CPT_TRACK: SeedTrack = {
  ...COMMON,
  code: "ACECPT",
  title: "Prep for a personal trainer certification exam (client onboarding focus)",
  description:
    "ACE's NCCA-accredited personal trainer exam on its 2022 role delineation study: client onboarding and assessments (23%), program design and implementation (31%), program modification and progression (27%), and risk management, professional conduct and ethical business practices (19%).",
  sourceUrl: "https://contentcdn.eacefitness.com/assets/certification/pdfs/CPT-Exam-Content-Outline.pdf",
  credential: {
    providerSlug: "ace",
    providerName: "American Council on Exercise",
    providerUrl: "https://www.acefitness.org/",
    subcategorySlug: SUB,
    credentialSlug: "ace-cpt",
    credentialName: "ACE Certified Personal Trainer",
    credentialType: "certification",
    credentialUrl: "https://www.acefitness.org/fitness-certifications/personal-trainer-certification/",
    basis: "vendor_exam_unpublished_code",
    examRevision: "2022 role delineation study outline, in effect since August 21, 2023 (14 tasks in four domains)",
    status: "active",
    effectiveDate: "2023-08-21",
    officialObjectivesUrl: "https://contentcdn.eacefitness.com/assets/certification/pdfs/CPT-Exam-Content-Outline.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "At least 18 years old with a high school diploma or equivalent and current CPR/AED certification with a live skills component. ACE revises the outline on a five-year cycle.",
    durationMinutes: 180,
    questionFormat: "150 multiple-choice questions (125 scored, 25 unscored) in three hours, computer-based and proctored",
    passingScorePolicy: "Scaled score of 500 or higher.",
  },
  units: [
    {
      title: "Client onboarding and assessments",
      weight: 23,
      gate: "From an intake interview and screening, decide whether the client needs medical clearance, what to assess first, and why.",
      objectives: [
        "Gathering health, medical, exercise and lifestyle information through questionnaires and interviews, in person or virtually",
        "Identifying the need for medical clearance or referral using PAR-Q+ and ACSM preparticipation guidelines",
        "Assessing readiness for behavior change and exercise attitudes, and setting goals with SMART and GROW frameworks",
        "Evaluating foundational movement patterns (bend-and-lift, single-leg, push, pull, rotation) through observation",
        "Selecting and conducting baseline fitness assessments matched to the client's goals and health status",
        "Dietary preferences, population-specific and condition-specific exercise considerations, and common medication effects",
      ],
    },
    {
      title: "Program design and implementation",
      weight: 31,
      gate: "Design a personalized program from a stated assessment and goal, and show the exercise selection and instruction that implements it.",
      objectives: [
        "Establishing functional, health, fitness and performance goals from interview and assessment data",
        "Applying exercise principles (specificity, overload, progression) to design personalized cardiorespiratory, muscular and movement programs",
        "ACE's Integrated Fitness Training model: functional, movement and load/speed training and cardiorespiratory training by intensity zones",
        "Selecting exercises and equipment and integrating them across settings: virtual, in-home, in-club and public spaces",
        "Instructing safe technique and equipment use with verbal, visual and kinesthetic cues",
        "Leveraging technology in program implementation and monitoring",
      ],
    },
    {
      title: "Program modification and progression",
      weight: 27,
      gate: "Given a client who has stalled or lapsed, name the cause, the conversation, and the specific program change.",
      objectives: [
        "Facilitating adherence through positive experiences, self-efficacy and rapport",
        "Recognizing and responding to lapses: barriers, social determinants of health and behavior-change models",
        "Routinely evaluating program effectiveness through observation, feedback and reassessment",
        "Progressing and regressing exercises and acute variables in response to results and client status",
        "Modifying programs for special populations and changing health conditions",
      ],
    },
    {
      title: "Risk management, professional conduct and ethical business practices",
      weight: 19,
      gate: "Identify the liability or ethical issue in a training scenario and the standard, law or practice that governs it.",
      objectives: [
        "Risk-management strategies across settings in line with recognized standards, guidelines, laws and regulations (CDC, ACSM, OSHA, HIPAA and others)",
        "Emergency response within scope of practice, incident documentation and facility safety",
        "Staying current with industry standards, scope of practice and continuing education",
        "Ethical business practices: contracts, pricing, marketing, confidentiality and professional boundaries",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// ACSM-CPT
// ---------------------------------------------------------------------------
export const ACSM_CPT_TRACK: SeedTrack = {
  ...COMMON,
  code: "ACSMCPT",
  title: "Prep for a personal trainer certification exam (exercise programming focus)",
  description:
    "ACSM's NCCA-accredited personal trainer exam on the outline effective July 10, 2025: initial client consultation and assessment (25%), exercise programming and implementation (43%), exercise leadership and client education (22%), and legal and professional responsibilities (10%).",
  sourceUrl: "https://acsm.org/wp-content/uploads/2024/12/ACSM-Certified-Personal-Trainer-Exam-Content-Outline.pdf",
  credential: {
    providerSlug: "acsm",
    providerName: "American College of Sports Medicine",
    providerUrl: "https://acsm.org/",
    subcategorySlug: SUB,
    credentialSlug: "acsm-cpt",
    credentialName: "ACSM Certified Personal Trainer (ACSM-CPT)",
    credentialType: "certification",
    credentialUrl: "https://acsm.org/certification/get-certified/personal-trainer/",
    basis: "vendor_exam_unpublished_code",
    examRevision: "2024 JTA (outline table titled 2021 ACSM-CPT Performance Domains), effective July 10, 2025",
    status: "active",
    effectiveDate: "2025-07-10",
    officialObjectivesUrl: "https://acsm.org/wp-content/uploads/2024/12/ACSM-Certified-Personal-Trainer-Exam-Content-Outline.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "At least 18 years old with a high school diploma or equivalent and current adult CPR/AED certification with a hands-on component. Certification is valid for three years.",
    durationMinutes: 150,
    questionFormat: "135 items (120 scored, 15 unscored pretest) in 150 minutes, written at recall, application and synthesis levels",
    passingScorePolicy: "Scaled score on a 200-800 scale; 550 required to pass.",
  },
  units: [
    {
      title: "Initial client consultation and assessment",
      weight: 25,
      gate: "Work through a preparticipation case: identify risk factors, decide on clearance, pick the assessments, and set behavioral goals.",
      objectives: [
        "Preparing the client for the initial consultation: paperwork, health history, informed consent and trainer-client agreement",
        "Interviewing to gather health, medical and exercise history and establish trust",
        "Identifying cardiovascular, metabolic and renal risk factors, signs and symptoms, and the need for medical clearance",
        "Relative and absolute contraindications to exercise testing and participation",
        "Behavior-change theories and strategies: setting S.M.A.R.T.S. goals and supporting adherence",
        "Assessing health- and skill-related fitness components to establish baselines, with the anatomy and terminology behind them",
      ],
    },
    {
      title: "Exercise programming and implementation",
      weight: 43,
      gate: "Write an initial FITT prescription for a described client, demonstrate the exercises, and state how you'll monitor and progress it.",
      objectives: [
        "Risks and benefits of exercise for healthy adults, older adults, youth, pregnant clients and medically cleared chronic-disease clients",
        "Selecting exercises and modalities by training age, goals and functional capacity, applying specificity and progression",
        "Interval, continuous and circuit cardiorespiratory programming and the recommendations for health versus performance",
        "Resistance training methods: periodization, repetition maximum testing, sets, loads and rest",
        "Determining initial Frequency, Intensity, Time and Type, including target heart rate by heart-rate reserve and RPE",
        "Demonstrating and teaching exercises safely: biomechanics, Valsalva risk, spotting and learning styles",
        "Monitoring technique and response, recognizing abnormal responses and criteria for stopping exercise",
        "Recommending progressions and modifications for special populations and stable medical conditions",
      ],
    },
    {
      title: "Exercise leadership and client education",
      weight: 22,
      gate: "Show how you'd keep a specific client adherent and educated through a plateau, using communication rather than more volume.",
      objectives: [
        "Optimizing adherence through effective communication, feedback and motivational strategies",
        "Educating clients on physical activity guidelines, healthy eating basics and self-monitoring within scope",
        "Building engagement across in-person and virtual delivery",
      ],
    },
    {
      title: "Legal and professional responsibilities",
      weight: 10,
      gate: "Name the professional obligation at stake in a scenario -- scope, referral, confidentiality or emergency response -- and act on it.",
      objectives: [
        "Collaborating and referring with health care and allied health professionals",
        "Scope of practice, ACSM's code of ethics and confidentiality",
        "Risk management, emergency procedures and documentation in the training setting",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// NSCA CSCS
// ---------------------------------------------------------------------------
export const NSCA_CSCS_TRACK: SeedTrack = {
  ...COMMON,
  code: "NSCACSCS",
  title: "Prep for a strength and conditioning specialist certification exam",
  description:
    "NSCA's CSCS on the detailed content outline from the 2025 job task analysis, effective July 1, 2025: two separately passed sections -- Scientific Foundations (exercise science, sport psychology, nutrition) and Practical/Applied (program design, exercise technique, program implementation, organization and administration).",
  sourceUrl: "https://www.nsca.com/globalassets/certification/certification-pdfs/nsca-certification-handbook.pdf",
  credential: {
    providerSlug: "nsca",
    providerName: "National Strength and Conditioning Association",
    providerUrl: "https://www.nsca.com/",
    subcategorySlug: SUB,
    credentialSlug: "nsca-cscs",
    credentialName: "Certified Strength and Conditioning Specialist (CSCS)",
    credentialType: "certification",
    credentialUrl: "https://www.nsca.com/certification/cscs/",
    basis: "vendor_exam_unpublished_code",
    examRevision: "2025 JTA detailed content outline, effective July 1, 2025 (Handbook Appendix F)",
    status: "active",
    effectiveDate: "2025-07-01",
    officialObjectivesUrl: "https://www.nsca.com/globalassets/certification/certification-pdfs/nsca-certification-handbook.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "A bachelor's degree or higher from an accredited institution (or enrollment as a college senior), or a degree in physical therapy or chiropractic medicine, plus current CPR/AED certification. NSCA targets a change for 2030 requiring a bachelor's degree from a CASCE-accredited program; the current degree requirement stays in place until December 31, 2029.",
    durationMinutes: 240,
    questionFormat: "Two sections: Scientific Foundations, 1.5 hours, 80 scored + 15 unscored; Practical/Applied, 2.5 hours, 110 scored + 15 unscored with 30-40 video or image items. First-time candidates sit both; a failed section is retaken alone within one year",
    passingScorePolicy: "Scaled score of 70 on each section, set by modified Angoff.",
  },
  units: [
    {
      title: "Scientific Foundations: exercise science",
      rangeLabel: "48 of 80 scored items in Section 1",
      weight: 25,
      gate: "Explain a training adaptation down to the muscle, nerve, hormone or energy system responsible, and how it differs by biological age, training age and sex.",
      objectives: [
        "Muscle anatomy and physiology: fiber types, sliding filament theory and muscle actions",
        "Neuromuscular anatomy and physiology: motor units, spindles, Golgi tendon organs and recruitment patterns",
        "Biomechanics of exercise selection and execution: planes, kinetics, lever systems and force-velocity and force-time curves",
        "Bioenergetics and metabolism: energy systems and manipulating training variables to target them",
        "Neuroendocrine physiology and hormonal responses to training",
        "Cardiopulmonary anatomy, physiology and responses to exercise",
        "Physiological adaptations to resistance training and conditioning",
        "Integrated physiology: performance planning, fatigue, recovery, sleep, travel and restoration",
        "Scientific literacy: reading research and applying PICOT-style questions to practice",
      ],
    },
    {
      title: "Scientific Foundations: sport psychology",
      rangeLabel: "20 of 80 scored items in Section 1",
      weight: 10,
      gate: "Pick the motivational or mental-skills technique that fits a described athlete, and recognize when a concern needs a referral.",
      objectives: [
        "Motivational theories, mental skills (arousal regulation, attentional control, imagery, self-talk) and confidence building",
        "Coach-athlete relationships, team dynamics, cohesion and leadership",
        "Athlete mental health and wellness: setbacks, identity, anxiety, depression and disordered eating, and when to refer",
      ],
    },
    {
      title: "Scientific Foundations: nutrition",
      rangeLabel: "12 of 80 scored items in Section 1",
      weight: 7,
      gate: "Give a scope-appropriate nutrition recommendation for a stated performance goal and say what would need a dietitian.",
      objectives: [
        "Nutrition topics within scope of practice and when to refer",
        "Nutritional factors for endurance, hypertrophy, strength and power: hydration, energy balance, macronutrient timing and quality",
        "Supplement efficacy and safety, third-party testing, and the impact of alcohol and drugs",
        "Evidence-based versus fad approaches to altering body composition",
      ],
    },
    {
      title: "Practical/Applied: program design",
      rangeLabel: "44 of 110 scored items in Section 2",
      weight: 23,
      gate: "From a needs analysis for a named sport and athlete, produce the program: exercises, order, intensities, volumes, rest, progression and periodization.",
      objectives: [
        "Conducting a needs analysis: sport movement, physiological and injury analysis, athlete history and benchmark testing",
        "Selecting training methods and modes for muscular endurance, hypertrophy, strength, power and energy-system development",
        "Exercise selection for the training period, injury-risk reduction and available facility and staff",
        "Exercise order based on session goals and mechanical and metabolic interference",
        "Assigning mechanical and metabolic load: percent 1RM, RM loads, RPE and Karvonen",
        "Training volume, work-to-rest periods, recovery and unloading across the microcycle and macrocycle",
        "Exercise progression and periodization strategies: linear and nonlinear, off-season to in-season",
        "Programming during injury, reconditioning and return to play with the interdisciplinary team",
      ],
    },
    {
      title: "Practical/Applied: exercise technique",
      rangeLabel: "28 of 110 scored items in Section 2",
      weight: 15,
      gate: "Watch a lift and name the fault, the cue and the safety protocol -- for free weights, machines and alternative implements alike.",
      objectives: [
        "Teaching and evaluating movement preparation: soft tissue work, mobility, PNF, CNS preparation and dynamic stretching",
        "Teaching and evaluating free-weight technique: barbells, dumbbells and kettlebells, including spotting and set-up",
        "Teaching and evaluating machine and alternative-equipment technique: sleds, logs, tires, flywheels, ropes, sandbags, medicine balls and bands",
        "Assessing, cueing and modifying technique based on arousal, focus, competency and safety",
        "Plyometric, speed, agility and conditioning technique",
      ],
    },
    {
      title: "Practical/Applied: program implementation",
      rangeLabel: "22 of 110 scored items in Section 2",
      weight: 12,
      gate: "Run a session and a testing day: define roles, coach with the right cues, collect valid data, and communicate the results.",
      objectives: [
        "Coaching athletes through training sessions: preparation, roles, motor-learning cues, observation, feedback and debrief",
        "Selecting evidence-based tests and monitoring protocols, including readiness measures such as HRV",
        "Administering testing and monitoring: data collection, warm-up, rest between trials and athlete readiness",
        "Evaluating, interpreting and communicating assessment results and adjusting the program",
      ],
    },
    {
      title: "Practical/Applied: organization and administration",
      rangeLabel: "16 of 110 scored items in Section 2",
      weight: 8,
      gate: "Spot the facility, scope or safety problem in a scenario and the policy or action that addresses it.",
      objectives: [
        "Scope of practice, NSCA codes and policies, collaboration with allied health and when to refer",
        "Facility operation policies: cleaning, maintenance, rules, staffing, scheduling and emergency procedures",
        "Risk, standard of care and liability in the strength and conditioning facility",
        "Recognizing and responding to unsafe training: overuse, overtraining and temperature-induced illness",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// NSCA-CPT (found in the same handbook while sourcing CSCS; not on the
// original roster but the same body, same document, same sourcing pass).
// ---------------------------------------------------------------------------
export const NSCA_CPT_TRACK: SeedTrack = {
  ...COMMON,
  code: "NSCACPT",
  title: "Prep for a personal trainer certification exam (program execution focus)",
  description:
    "NSCA's NCCA-accredited personal trainer exam on the detailed content outline from the 2025 job task analysis, effective July 1, 2025: client consultation and assessment (23%), program planning (29%), program execution (36%), and safety, emergency procedures and legal issues (12%).",
  sourceUrl: "https://www.nsca.com/globalassets/certification/certification-pdfs/nsca-certification-handbook.pdf",
  credential: {
    providerSlug: "nsca",
    providerName: "National Strength and Conditioning Association",
    providerUrl: "https://www.nsca.com/",
    subcategorySlug: SUB,
    credentialSlug: "nsca-cpt",
    credentialName: "NSCA Certified Personal Trainer (NSCA-CPT)",
    credentialType: "certification",
    credentialUrl: "https://www.nsca.com/certification/nsca-cpt/",
    basis: "vendor_exam_unpublished_code",
    examRevision: "2025 JTA detailed content outline, effective July 1, 2025 (Handbook Appendix H)",
    status: "active",
    effectiveDate: "2025-07-01",
    officialObjectivesUrl: "https://www.nsca.com/globalassets/certification/certification-pdfs/nsca-certification-handbook.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "At least 18 years old with a high school diploma or equivalent and current CPR/AED certification.",
    durationMinutes: 180,
    questionFormat: "140 scored and 15 unscored multiple-choice items in three hours, 25-35 of them video or image based",
    passingScorePolicy: "Scaled score of 70, set by modified Angoff.",
  },
  units: [
    {
      title: "Client consultation and assessment",
      weight: 23,
      gate: "Take a client from first conversation to a baseline you can plan from, including the wellbeing review and any referral it triggers.",
      objectives: [
        "Initial interview, health screening, informed consent and goal setting with key performance indicators",
        "Fitness and performance evaluation: selecting, conducting and interpreting assessments",
        "Scheduling and conducting reevaluation and reassessment",
        "Basic wellness review within scope: nutrition, sleep, stress and mental health, and recognizing RED-S and disordered eating",
        "Referring to and collaborating with health care professionals from evaluation results",
      ],
    },
    {
      title: "Program planning",
      weight: 29,
      gate: "Plan a periodized client program with format, FITT, order, tempo and progression, and adapt it for a stated special-population need.",
      objectives: [
        "Creating macro-, meso- and microcycle plans targeting client goals",
        "Session format, length, warm-up, modality selection and recovery procedures",
        "Exercise order, FITT, work-to-rest ratio and tempo by contraction phase",
        "Progressing variables over time and modifying from reassessment results",
        "Special populations: recognizing conditions, contraindications and modifying within medical recommendations",
      ],
    },
    {
      title: "Program execution",
      weight: 36,
      gate: "Coach a session: cue the exercise, evaluate technique across every modality, and adjust in the moment.",
      objectives: [
        "Exercise instruction: motivational coaching techniques, explaining purpose and teaching general safety guidelines",
        "Evaluating technique on machine resistance and free-weight exercises",
        "Evaluating flexibility, mobility, calisthenic and body-weight exercises",
        "Evaluating sport-specific and performance activities: plyometrics, sprinting, agility and reaction drills",
        "Cardiovascular machine use and monitoring intensity during execution",
      ],
    },
    {
      title: "Safety, emergency procedures and legal issues",
      weight: 12,
      gate: "Identify the safety or legal exposure in a scenario and the procedure that controls it.",
      objectives: [
        "Facility and equipment safety, environment checks and client monitoring",
        "Emergency action plans, CPR/AED use and incident documentation",
        "Scope of practice, professional standards, liability and legal responsibilities",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// ISSA (NCCPT-CPT, the NCCA-accredited exam)
// ---------------------------------------------------------------------------
export const ISSA_NCCPT_CPT_TRACK: SeedTrack = {
  ...COMMON,
  code: "NCCPTCPT",
  title: "Prep for a personal trainer certification exam (applied science focus)",
  description:
    "The NCCA-accredited personal trainer exam behind ISSA's certification, administered by its subsidiary NCCPT, on the 2020 job analysis outline: applied science (25%), program design and implementation (25%), intake and ongoing evaluation (15%), exercise selection and instruction (15%), nutrition (10%) and professional practice (10%).",
  sourceUrl: "https://nccpt.issaonline.com/pages/exam-information",
  credential: {
    providerSlug: "nccpt",
    providerName: "National Council for Certified Personal Trainers (ISSA)",
    providerUrl: "https://nccpt.issaonline.com/",
    subcategorySlug: SUB,
    credentialSlug: "nccpt-cpt",
    credentialName: "NCCPT Certified Personal Trainer (NCCPT-CPT)",
    credentialType: "certification",
    credentialUrl: "https://nccpt.issaonline.com/pages/exam-information",
    basis: "vendor_exam_unpublished_code",
    examRevision: "2020 Job Analysis Study outline (NCCPT Candidate Handbook, Appendix 2)",
    status: "active",
    officialObjectivesUrl:
      "https://assets.ctfassets.net/qw8ps43tg2ux/7KxejJj5WXgNhleXZrzZo4/c789e3aa043335ceb9641ad2d2accf81/nccpt-candidate-handbook.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "At least 18 years old with a valid CPR certification (physical card or certificate; digital certificates are not accepted) and government photo ID. Recertify every two years. ISSA's own open-book course exam is a separate, non-NCCA credential.",
    durationMinutes: 120,
    questionFormat: "140 four-option multiple-choice items (125 scored, 15 pretest) in two hours, closed book, at a Prometric test center or by remote proctoring",
    passingScorePolicy: "Scaled score; criterion-referenced cut set by modified Angoff.",
  },
  units: [
    {
      title: "Applied science: anatomy, kinesiology and physiology",
      weight: 25,
      gate: "Name the muscles, joint actions and energy system behind a given exercise and explain the physiological response it produces.",
      objectives: [
        "Muscular, nervous and skeletal systems and how they work together to produce movement",
        "Functional anatomy: primary and secondary movers, anatomical locations, joint types and major kinetic chains",
        "Kinesiology: range of motion, angles and levers in exercise",
        "Energy systems, fuel use, BMR versus TDEE, and aerobic versus anaerobic training",
        "Exercise physiology: acute responses, chronic adaptations, sliding filament theory, size principle and fiber types",
      ],
    },
    {
      title: "Nutrition",
      weight: 10,
      gate: "Review a client's dietary habits and give scope-appropriate guidance on a current diet trend or supplement question.",
      objectives: [
        "Basic dietary guidelines, macronutrients and micronutrients",
        "Assessing a client's dietary habits, shortfalls and caloric intake relative to needs",
        "Educating on food labels, portion size, diet trends, supplements and ergogenic aids",
      ],
    },
    {
      title: "Intake and ongoing evaluation",
      weight: 15,
      gate: "Collect the right documentation, run a basic assessment battery, and interpret it against the client's goals and the general population.",
      objectives: [
        "Collecting and reviewing medical release, medical history and liability documentation",
        "Conducting basic postural, performance, movement, strength, cardiovascular, flexibility and body-composition assessments",
        "Interpreting results against goals and norms, initial versus ongoing",
      ],
    },
    {
      title: "Program design and implementation",
      weight: 25,
      gate: "Design a balanced program for a stated goal using the right periodization and acute variables, then adapt it for a special population.",
      objectives: [
        "Applying training principles to goals: hypertrophy, cardiovascular endurance and body-composition change; general adaptation syndrome",
        "Undulating versus linear periodization",
        "Designing balanced functional programs with injury-prevention protocols: warm-up, cool-down, stretching and foam rolling",
        "Manipulating intensity, volume, frequency, repetition range, sets, rest, time under tension and tempo",
        "Implementing and adjusting programs, with regressions and progressions matched to ability",
        "Modifications for special populations: prenatal, youth, arthritic and hypertensive clients",
      ],
    },
    {
      title: "Exercise selection, technique and training instruction",
      weight: 15,
      gate: "Correct a client's form with cues at the kinetic-chain checkpoints and monitor progress with more than the scale.",
      objectives: [
        "Educating on technique and form with coaching cues",
        "Correcting technique at kinetic-chain checkpoints and addressing muscular imbalance and posture",
        "Monitoring client progress with multiple measures and recognizing over-training",
      ],
    },
    {
      title: "Professional practice and responsibility",
      weight: 10,
      gate: "Identify the professional, ethical, legal or safety obligation in a scenario and the right action.",
      objectives: [
        "Professional conduct, referral to other professionals and technology trends in client communication",
        "Ethical boundaries and codes of conduct",
        "Liability insurance, contracts and cancellation policies",
        "Marketing, selling and retaining personal-training clients",
        "Trainer and client safety: risk indicators, incident reports, emergency protocols and emergency tools",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// NASM Certified Nutrition Coach (REQ-281, Nick 2026-11-14)
//
// What was read, and when (all 2026-11-14):
//   - NASM's CNC course page (nasm.org/products/single-complex/
//     nasm-certified-nutrition-coach/CNC301K): an online, open-book exam of
//     100 multiple-choice questions, 90 minutes, 70% to pass, up to three
//     attempts, within one year of purchase; no prerequisites; renew every
//     two years with 1.9 NASM CEUs. Four course sections, each with NASM's
//     own one-paragraph description (quoted below as outline headings only):
//     Professional Practice; Nutrition Science; Behavior Change Strategies;
//     Practical Nutrition Coaching. The FAQ draws the scope line: a coach
//     helps clients apply evidence-based nutrition to everyday habits,
//     "within a coaching scope of practice", and refers to a registered
//     dietitian nutritionist (RDN) for medical nutrition assessment or
//     treatment; an RDN is licensed to provide medical nutrition therapy.
//     NASM publishes no exam content outline, weights or candidate handbook
//     for the CNC and the page names no accrediting body, so the unit
//     weights are our study emphasis (domainWeights "study_emphasis") and the
//     credential is not described as accredited. A chapter list exists only
//     on third-party sites and was not used.
//   - Dietary Guidelines for Americans, 2025-2030 (released 2026-01-07; the
//     PDF at cdn.realfood.gov/DGA.pdf): protein 1.2-1.6 g per kg of body
//     weight per day; saturated fat not over 10% of daily calories; sodium
//     under 2,300 mg a day from age 14; no amount of added sugars is
//     recommended, and one meal should hold no more than 10 g; consume less
//     alcohol.
//   - National Academies DRI summary tables (NCBI Bookshelf NBK56068, linked
//     from NIH ODS): AMDR carbohydrate 45-65%, fat 20-35%, protein 10-35% of
//     energy; protein RDA 0.8 g/kg (56 g men, 46 g women, 19-30); fiber AI 38 g
//     men, 25 g women (19-30); total water AI 3.7 L men, 2.7 L women.
//   - FDA, Questions and Answers on Dietary Supplements (updated 2026-08-27):
//     FDA does not approve supplements before they are marketed; structure/
//     function claims are allowed with the "not evaluated by the FDA ... not
//     intended to diagnose, treat, cure, or prevent any disease" disclaimer;
//     a disease claim makes the product a drug.
//   - Washington, RCW 18.138.020: no one may represent themselves as a
//     certified dietitian or certified nutritionist (or C.D., C.N.) unless
//     certified. Title protection only was read; whether other states
//     restrict practice is not covered and the course says to check locally.
// ---------------------------------------------------------------------------
const CNC_CHECKED = "2026-11-14";
const CNC_VERIFIED_AT = "2026-11-14T00:00:00Z";
const CNC_URL = "https://www.nasm.org/products/single-complex/nasm-certified-nutrition-coach/CNC301K";
const cncSrc = (title: string, url: string, kind: UnitSource["kind"], extra: Partial<UnitSource> = {}): UnitSource => ({
  title,
  ...source(url, kind, CNC_CHECKED),
  ...extra,
});
const cncSection = (heading: string, description: string): UnitSource =>
  cncSrc("NASM Certified Nutrition Coach course sections", CNC_URL, "exam_outline", { outline: [heading, description] });

export const CNC_SOURCES = {
  format: cncSrc("NASM Certified Nutrition Coach: exam and scope (course page and FAQ)", CNC_URL, "exam_outline", {
    keyValues: [
      "online, open-book exam: 100 multiple-choice questions, 90 minutes, 70% to pass, up to three attempts, within one year of purchase",
      "no prerequisites; renew every two years with 1.9 NASM CEUs",
      "a nutrition coach works within a coaching scope of practice and refers to a registered dietitian nutritionist (RDN) for medical nutrition assessment or treatment; medical nutrition therapy is the RDN's",
    ],
  }),
  dga: cncSrc("Dietary Guidelines for Americans, 2025-2030 (HHS and USDA, released 2026-01-07)", "https://cdn.realfood.gov/DGA.pdf", "reference", {
    keyValues: [
      "protein: 1.2-1.6 g per kg of body weight per day (the DRI RDA of 0.8 g/kg is the minimum to meet needs; the two are different measures)",
      "saturated fat: not over 10% of total daily calories",
      "sodium: under 2,300 mg a day from age 14; highly active people may need more to offset sweat losses",
      "added sugars: none is recommended; one meal should contain no more than 10 g",
      "alcohol: consume less for better health; some people should not drink at all",
    ],
  }),
  dri: cncSrc("National Academies Dietary Reference Intakes, summary tables (NCBI Bookshelf NBK56068)", "https://www.ncbi.nlm.nih.gov/books/NBK56068/table/summarytables.t5/?report=objectonly", "reference", {
    keyValues: [
      "AMDR for adults: carbohydrate 45-65%, fat 20-35%, protein 10-35% of energy",
      "protein RDA 0.8 g/kg (56 g a day for men and 46 g for women aged 19-30)",
      "fiber AI (19-30): 38 g a day for men, 25 g for women; carbohydrate RDA 130 g a day",
      "total water AI (19-30): 3.7 L a day for men, 2.7 L for women, from all beverages and foods",
      "energy: 4 kcal per gram of carbohydrate and of protein, 9 of fat, 7 of alcohol (Atwater factors)",
    ],
  }),
  fda: cncSrc("FDA, Questions and Answers on Dietary Supplements (updated 2026-08-27)", "https://www.fda.gov/food/information-consumers-using-dietary-supplements/questions-and-answers-dietary-supplements", "reference", {
    keyValues: [
      "FDA does not approve dietary supplements before they are marketed; the manufacturer is responsible for safety and labeling",
      "structure/function claims are allowed with the disclaimer that FDA has not evaluated the statement and the product is not intended to diagnose, treat, cure or prevent any disease",
      "a product promoted to treat, prevent or cure a disease is regulated as a drug",
    ],
  }),
  wa: cncSrc("Washington RCW 18.138.020: certification required for the titles certified dietitian and certified nutritionist", "https://app.leg.wa.gov/rcw/default.aspx?cite=18.138.020", "reference", {
    keyValues: ["in Washington only certified people may call themselves a certified dietitian or certified nutritionist (or C.D., C.N.); rules differ by state, so check where you coach"],
  }),
} as const;

// REQ-282: the objectives the two coaching-session sims are registered to
// (lib/sim/documents.ts CNC_OBJECTIVES names the same titles; a test compares).
export const NASMCNC_SIM_OBJECTIVES = {
  referral:
    "Recognizing when to refer to a registered dietitian nutritionist or physician: a diagnosed condition, a suspected eating disorder, pregnancy or breastfeeding needs beyond general guidance, or medications affected by diet",
  supplement: "Evaluating a supplement: how it is regulated, third-party testing, and when it is a question for a clinician",
} as const;

export const NASM_CNC_TRACK: SeedTrack = {
  ...COMMON,
  code: "NASMCNC",
  title: "Prep for a nutrition coaching certification exam",
  description:
    "Preparation for NASM's Certified Nutrition Coach exam across its four course sections -- professional practice, nutrition science, behavior change strategies and practical nutrition coaching -- with the current Dietary Guidelines and Dietary Reference Intakes. Stays inside a coach's scope: general, evidence-based guidance and habit coaching, with referral to a registered dietitian nutritionist or physician for medical nutrition therapy, diagnosed conditions and suspected eating disorders. NASM publishes no exam weights, so the unit weights are our study emphasis. Independently developed exam prep; not affiliated with or endorsed by NASM.",
  sourceUrl: CNC_URL,
  sourceVerifiedAt: CNC_VERIFIED_AT,
  contentReviewDueAt: "2027-11-14T00:00:00Z",
  credential: {
    domainWeights: "study_emphasis", // REQ-220: NASM publishes no CNC exam outline or weights
    providerSlug: "nasm",
    providerName: "National Academy of Sports Medicine",
    providerUrl: "https://www.nasm.org/",
    subcategorySlug: SUB,
    credentialSlug: "nasm-cnc",
    credentialName: "NASM Certified Nutrition Coach (NASM-CNC)",
    credentialType: "certification",
    credentialUrl: CNC_URL,
    basis: "vendor_exam_unpublished_code",
    examRevision: "NASM-CNC course exam (four course sections), read 2026-11-14",
    versionNote:
      "NASM prints no version, exam outline or weights for the CNC; the course's four sections were read on NASM's product page on 2026-11-14.",
    status: "active",
    officialObjectivesUrl: CNC_URL,
    lastVendorVerifiedAt: CNC_VERIFIED_AT,
    recommendedExperience: "None required. Recertify every two years with 1.9 NASM CEUs.",
    durationMinutes: 90,
    questionFormat: "100 multiple-choice questions, online and open book, 90 minutes; up to three attempts within one year of purchase.",
    passingScorePolicy: "70% or higher.",
  },
  units: [
    {
      title: "Professional Practice and Scope",
      weight: 20,
      gate: "Given a client's request, say whether it is coaching or medical nutrition therapy, what you can do, and when and how you refer -- and judge whether a nutrition claim is backed by good evidence.",
      sources: [
        cncSection("Section 1: Professional Practice", "Build the foundation for ethical, evidence-based nutrition coaching. Understand the role and scope of a Nutrition Coach, apply credible research, and follow professional standards that build client trust."),
        CNC_SOURCES.format,
        CNC_SOURCES.wa,
      ],
      objectives: [
        "Defining a nutrition coach's scope: habit coaching and general, evidence-based guidance, never diagnosing or providing medical nutrition therapy",
        "Recognizing when to refer to a registered dietitian nutritionist or physician: a diagnosed condition, a suspected eating disorder, pregnancy or breastfeeding needs beyond general guidance, or medications affected by diet",
        "Checking the title and practice rules where you coach, such as Washington's protected titles certified dietitian and certified nutritionist",
        "Evaluating nutrition research: study designs, the strength of evidence and red flags in a headline claim",
        "Following professional standards: confidentiality, honest marketing and records",
        "Explaining how culture, preference, budget and access shape what a client eats",
      ],
    },
    {
      title: "Nutrition Science",
      weight: 35,
      gate: "Given a client's day of eating, estimate its energy and macronutrients, compare them with the current reference values, and explain the science in words the client can use.",
      sources: [
        cncSection("Section 2: Nutrition Science", "Build a strong foundation in the science of nutrition. Explore macronutrients, micronutrients, hydration, energy balance, metabolism, nutrient timing, and supplementation, then learn to translate the science into guidance clients can use."),
        CNC_SOURCES.dri,
        CNC_SOURCES.dga,
        CNC_SOURCES.fda,
      ],
      objectives: [
        "Explaining energy balance and the parts of total daily energy expenditure, and why intake estimates are approximate",
        "Calculating calories from macronutrient grams with 4, 4, 9 and 7 kcal per gram",
        "Explaining protein quality and needs, from the 0.8 g/kg RDA to the higher targets for active adults",
        "Explaining carbohydrates -- sugars, starch and fiber -- and how much fiber adults need",
        "Explaining dietary fats: saturated, unsaturated and trans fats and the essential fatty acids",
        "Explaining alcohol's energy and its effects on recovery and body composition",
        "Explaining vitamins and minerals, deficiency, excess and upper limits",
        "Planning hydration from total water needs, sweat losses and sodium",
        "Explaining nutrient timing around training and what the evidence does and does not support",
        "Evaluating a supplement: how it is regulated, third-party testing, and when it is a question for a clinician",
      ],
    },
    {
      title: "Behavior Change Strategies",
      weight: 20,
      gate: "Given a client who keeps stalling, find the barrier, use motivational interviewing to draw out their own reasons, and set one small behavior goal they can track.",
      sources: [
        cncSection("Section 3: Behavior Change Strategies", "Learn how to turn nutrition knowledge into lasting behavior change. Identify client barriers, use motivational interviewing, set meaningful goals, track progress, and personalize strategies that help clients build sustainable habits."),
      ],
      objectives: [
        "Identifying a client's barriers and readiness to change with the stages-of-change model",
        "Using motivational interviewing: open questions, affirmations, reflections and summaries",
        "Setting SMART goals and choosing behavior goals over outcome goals",
        "Tracking progress with measures beyond the scale",
        "Building habits with cues, small steps and changes to the environment, and planning for lapses",
        "Personalizing strategies to a client's preferences and daily life",
      ],
    },
    {
      title: "Practical Nutrition Coaching",
      weight: 25,
      gate: "Given a client's goal and food record, read the labels that matter, compare eating patterns that could fit, and build a food-first plan inside the coaching scope.",
      sources: [
        cncSection("Section 4: Practical Nutrition Coaching", "Put nutrition science into action with real-world coaching skills. Assess dietary intake, interpret food and supplement labels, navigate popular diets and everyday eating situations, and build personalized nutrition recommendations."),
        CNC_SOURCES.dga,
        CNC_SOURCES.fda,
      ],
      objectives: [
        "Assessing dietary intake with food records, 24-hour recalls and food frequency questionnaires, and knowing their limits",
        "Reading a Nutrition Facts label: serving size, percent Daily Value and added sugars",
        "Reading a Supplement Facts label and spotting claims a supplement may not lawfully make",
        "Comparing popular eating patterns -- Mediterranean, plant-based, low-carbohydrate and time-restricted eating -- against a client's goals and preferences",
        "Coaching everyday eating situations: eating out, travel, social events and a tight budget",
        "Building a personalized, food-first nutrition plan within the coaching scope",
        "Coaching weight management with a modest energy deficit, and recognizing when weight change is a referral question",
      ],
    },
  ],
};

export const FITNESS_TRACKS: SeedTrack[] = [
  NASM_CPT_TRACK,
  ACE_CPT_TRACK,
  ACSM_CPT_TRACK,
  NSCA_CSCS_TRACK,
  NSCA_CPT_TRACK,
  ISSA_NCCPT_CPT_TRACK,
  // REQ-281: NASM Certified Nutrition Coach.
  NASM_CNC_TRACK,
];
