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
//   "Effective July 10, 2025" (2024 performance domains).
// - NSCA CSCS and NSCA-CPT: NSCA Certification Handbook "Effective July 1,
//   2026", Appendices F and H (detailed content outlines).
// - ISSA: ISSA's NCCA-accredited exam is the NCCPT-CPT, run by its
//   subsidiary NCCPT; NCCPT Certification Programs Candidate Handbook,
//   Appendix 2 (2020 Job Analysis Study). ISSA's own open-book course exam
//   is not NCCA-accredited and is not what this track models.
//
// Modeling: real proctored exams, none with a vendor exam code, so
// credential_basis 'vendor_exam_unpublished_code' with examCode unset,
// exactly as Google Cloud and ABPTS are handled. All sit in the existing
// Health & Fitness / Fitness subcategory (migration 007) with freshness
// overridden to certification_aligned on the track. No disclaimer gate:
// these are fitness-professional credentials, not clinical ones.
//
// Objectives are written in our own words from each outline's domains and
// task statements -- deliberately not copied.

import type { SeedTrack } from "../data";

const VERIFIED_AT = "2026-10-08T00:00:00Z";
const SUB = "fitness";

const COMMON = {
  trackType: "certification" as const,
  subcategorySlug: SUB,
  freshnessModel: "certification_aligned" as const,
  sourceVerifiedAt: VERIFIED_AT,
};

// ---------------------------------------------------------------------------
// NASM-CPT
// ---------------------------------------------------------------------------
export const NASM_CPT_TRACK: SeedTrack = {
  ...COMMON,
  code: "NASMCPT",
  title: "NASM Certified Personal Trainer (NASM-CPT) Coach",
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
  title: "ACE Certified Personal Trainer Coach",
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
  title: "ACSM Certified Personal Trainer (ACSM-CPT) Coach",
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
    examRevision: "2024 performance domains, effective July 10, 2025",
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
      title: "Exercise leadership, client education and engagement",
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
  title: "NSCA Certified Strength and Conditioning Specialist (CSCS) Coach",
  description:
    "NSCA's CSCS on the detailed content outline in the handbook effective July 1, 2026: two separately passed sections -- Scientific Foundations (exercise science, sport psychology, nutrition) and Practical/Applied (program design, exercise technique, program implementation, organization and administration).",
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
    examRevision: "NSCA Certification Handbook effective July 1, 2026 (Appendix F detailed content outline)",
    status: "active",
    effectiveDate: "2026-07-01",
    officialObjectivesUrl: "https://www.nsca.com/globalassets/certification/certification-pdfs/nsca-certification-handbook.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "A bachelor's degree or higher from an accredited institution (or enrollment as a college senior), or a degree in physical therapy or chiropractic medicine, plus current CPR/AED certification. From January 1, 2030, US candidates must hold a bachelor's degree from a CASCE-accredited program.",
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
  title: "NSCA Certified Personal Trainer (NSCA-CPT) Coach",
  description:
    "NSCA's NCCA-accredited personal trainer exam on the handbook effective July 1, 2026: client consultation and assessment (23%), program planning (29%), program execution (36%), and safety, emergency procedures and legal issues (12%).",
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
    examRevision: "NSCA Certification Handbook effective July 1, 2026 (Appendix H detailed content outline)",
    status: "active",
    effectiveDate: "2026-07-01",
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
  title: "ISSA / NCCPT Certified Personal Trainer (NCCPT-CPT) Coach",
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

export const FITNESS_TRACKS: SeedTrack[] = [
  NASM_CPT_TRACK,
  ACE_CPT_TRACK,
  ACSM_CPT_TRACK,
  NSCA_CSCS_TRACK,
  NSCA_CPT_TRACK,
  ISSA_NCCPT_CPT_TRACK,
];
