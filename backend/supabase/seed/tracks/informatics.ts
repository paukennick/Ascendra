// Master of Science in Health Informatics pathway. A degree structure, not
// an exam -- same shape as the DPT and BSN degree tracks.
//
// Structured on the ten Foundational Domains (F1-F10) that CAHIIM requires
// every accredited HI master's curriculum to build on. Read 2026-10-31 from
// the primary documents, not a summary:
//   - CAHIIM's master's curriculum requirements PDF, which is the AMIA
//     Accreditation Committee's "AMIA 2017 Core Competencies for Health
//     Informatics Education at the Masters Degree Level" (approved by the
//     AMIA Board December 2016).
//   - The same competencies as published in JAMIA (Valenta et al., 2018,
//     approved by the AMIA Board May 7, 2018; PMC7647152). The domain
//     names, descriptions and knowledge/skills/attitude statements match the
//     CAHIIM PDF. One wording difference: CAHIIM's copy names the fifth
//     application area "population informatics" / "population health" where
//     the paper says "public health informatics" / "public health". CAHIIM's
//     wording is used here because its document is the one accreditation
//     cites.
//   - CAHIIM's master's standards PDF (titled "2023 Master of Health
//     Informatics Standards"; CAHIIM's web page labels the same link "2022").
//     Standard 12 (Program Specific Curriculum Assessment) is what requires
//     the curriculum to build on the AMIA competencies; the other standards
//     govern the program (faculty, budget, advisory board), not the learner.
//
// No newer revision of the domains was found: CAHIIM's health informatics
// page still links the AMIA 2017 document as its curriculum requirements.
//
// The paper says graduates should arrive with working knowledge of F1-F3
// (Health, Information Science and Technology, Social and Behavioral
// Science), so those three domains carry only a knowledge statement; F4-F10
// carry knowledge, skills and attitudes. The units keep that distinction:
// F1-F3 gates ask the learner to explain, F4-F10 gates ask them to do.
//
// No percentage weights: CAHIIM accredits programs and publishes no exam
// blueprint, and the paper says the relative weight of each competency is
// left to each program's focus. Units are unweighted and in the standard's
// F1-F10 order, like the DPT track.
//
// Objectives are written in our own words from the topics each domain's
// description names. The source carries "Republication Not Permitted", so
// nothing is copied from it, and nothing is added that it does not name
// (no specific standards bodies, code sets or laws).

import type { SeedTrack } from "../data";

const CAHIIM_PROVIDER = {
  providerSlug: "cahiim",
  providerName: "Commission on Accreditation for Health Informatics and Information Management Education",
  providerUrl: "https://www.cahiim.org/",
  // Best existing fit in the healthcare-nursing category. A dedicated
  // "health-informatics" subcategory does not exist yet.
  subcategorySlug: "health-informatics", // migration 024
  credentialType: "degree",
} as const;

const VERIFIED_AT = "2026-10-31T00:00:00Z";
const CURRICULUM_URL = "https://www.cahiim.org/wp-content/uploads/sites/2/2024/08/hi-ms-curriculum.pdf";

export const MS_HEALTH_INFORMATICS_TRACK: SeedTrack = {
  code: "MSHI",
  title: "MS Health Informatics Coach",
  description:
    "The applied health informatics master's curriculum as CAHIIM accredits it: the ten AMIA foundational domains, from the health, information and social sciences the field draws on through systems design, human factors, professionalism, interprofessional practice and leadership.",
  trackType: "graduate",
  subcategorySlug: CAHIIM_PROVIDER.subcategorySlug,
  freshnessModel: "academic_foundational",
  sourceUrl: "https://www.cahiim.org/accreditation/health-informatics/",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: "2027-10-31T00:00:00Z",
  credential: {
    ...CAHIIM_PROVIDER,
    credentialSlug: "master-of-science-in-health-informatics",
    credentialName: "Master of Science in Health Informatics (CAHIIM-accredited program)",
    credentialUrl: "https://www.cahiim.org/accreditation/health-informatics/",
    basis: "accreditation_standard",
    standardName:
      "AMIA 2017 Core Competencies for Applied Health Informatics Education at the Master's Degree Level (CAHIIM HI master's curriculum requirements)",
    standardRevision: "AMIA 2017 foundational domains F1-F10; CAHIIM 2023 master's standards",
    status: "active",
    officialObjectivesUrl: CURRICULUM_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "A bachelor's degree; CAHIIM notes students arrive from varied backgrounds such as engineering, computer science and healthcare. The AMIA competencies assume working knowledge of health, information science and social and behavioral science on entry.",
    questionFormat: "Program coursework, projects and any required practicum or capstone, assessed against program competencies mapped to the AMIA foundational domains",
    passingScorePolicy: "Set by the program; CAHIIM accredits programs and publishes no exam",
  },
  units: [
    {
      title: "Health (F1)",
      gate: "For a given informatics problem, name the health science it sits in and explain that field's goals, the data it produces and uses, and the challenge an informatics solution would have to respect.",
      objectives: [
        "The five informatics application areas -- translational bioinformatics, clinical research informatics, clinical informatics, consumer health informatics and population informatics -- and what separates them",
        "Clinical informatics across medicine, nursing, pharmacy and dentistry: informatics in the delivery of care",
        "Population informatics: surveillance, prevention, preparedness and health promotion",
        "Translational bioinformatics and clinical research informatics: turning biomedical and genomic data into new knowledge and better care",
        "Human biology and genomics as health sciences: their methods and the data they generate",
        "Clinical and translational science: how evidence moves from the laboratory to practice",
        "Healthcare delivery, personal health and population health: their history, goals and current challenges",
      ],
    },
    {
      title: "Information Science and Technology (F2)",
      gate: "Explain, in plain terms, which information science concepts and tools a given health data problem calls for and why.",
      objectives: [
        "The life cycle of data, information and knowledge: acquiring, storing, representing, organising, processing, transferring and merging",
        "Analysing, reporting and visualising data so it supports a decision",
        "Information retrieval: how systems find relevant information and how well they do it",
        "Ontologies and knowledge representation: structuring meaning so machines can use it",
        "Business intelligence and analytics concepts",
        "Basic computer science and information systems terminology, including what programming involves",
        "User interface design concepts",
        "Information security principles: protecting data and knowledge from unauthorised access",
        "Assessing users' information needs before choosing a tool",
      ],
    },
    {
      title: "Social and Behavioral Science (F3)",
      gate: "Explain how a named social, behavioural, economic or legal theory predicts the way individuals, groups or organisations will respond to a health information system.",
      objectives: [
        "Social and behavioural theories that describe human action and interaction, and what they predict",
        "Psychological and cognitive science models of how people take in and act on information",
        "Management and organisational theory as it applies to health organisations",
        "Economic theories and models relevant to health and health information",
        "Legal and regulatory frameworks as forces that shape health information behaviour",
        "Analysing effects at three levels: the individual, the social group and society",
        "Using these theories to reduce health-damaging behaviour and promote health and psychosocial well-being",
      ],
    },
    {
      title: "Health Information Science and Technology (F4)",
      gate: "Design a solution to a specific health information problem -- choosing the methods, tools and standards -- and state its limitations and which stakeholders it serves least well.",
      objectives: [
        "Methods and tools for collecting, organising, representing and sharing biomedical and health data",
        "Integrating, governing and learning from health data and knowledge across informatics domains",
        "Health data standards and why they matter to a system design",
        "Integration and interoperability: getting separate systems to exchange and use information",
        "Protecting health information within system design",
        "Systems design and development for health information problems",
        "Computational and systems thinking: decomposing a health information problem into a solvable design",
        "Choosing among candidate methods and tools for a specific problem, given the application area",
        "Weighing the advantages and limitations of a technology solution and the needs and context of different stakeholders",
      ],
    },
    {
      title: "Human Factors and Socio-technical Systems (F5)",
      gate: "Evaluate a health IT system or design against its users' workflow and cognition, identify where it will fail them, and propose a design change grounded in a named human factors or socio-technical principle.",
      objectives: [
        "The socio-technical view: people and organisations as the ultimate users of health information technology",
        "How physical, social, cognitive and psychological behaviour interacts with information technology",
        "Human factors engineering principles applied to health information systems",
        "Understanding users' needs, workflows and practices in their organisational, social and physical context",
        "Applying social and behavioural theory and human factors to system design and implementation",
        "Evaluating a system's design with users, not just for them",
        "Respecting the user's role throughout design and deployment",
      ],
    },
    {
      title: "Social and Behavioral Aspects of Health (F6)",
      gate: "Choose a behaviour-change theory or model for a defined patient or population health problem, apply it to design or critique an intervention, and say what data would show it working.",
      objectives: [
        "Theories and models that explain and change individual and population health behaviour",
        "Social determinants of health and how they shape health problems and outcomes",
        "Patient-generated data: what it is and how it informs analysis of health problems",
        "How a health problem affects daily activities, and practical approaches to managing it",
        "Health literacy and informed decision making",
        "Patient engagement and patient activation",
        "Self-management of health and healthcare, and patterns of healthcare utilisation",
        "Behavioural factors such as nutrition, physical activity and substance use, and how genotype and phenotype can influence behaviour",
        "Organisational network analysis and precision, individualised care as topics within this domain",
      ],
    },
    {
      title: "Social, Behavioral, and Information Science and Technology Applied to Health (F7)",
      gate: "Plan the design, implementation and evaluation of a health informatics solution end to end, drawing on social, business, human factors, behavioural and information science together, and justify each choice.",
      objectives: [
        "Integrating social, business, human factors, behavioural and information sciences in one approach",
        "Designing health informatics solutions with theories, models and tools from these fields combined",
        "Implementing health informatics solutions alongside clinical and business processes",
        "Evaluating health informatics solutions and their impact",
        "How technology and process change affect outcomes at every level: molecular and biological, healthcare and organisational, social and population",
        "Recognising how these disciplines interrelate rather than treating any one in isolation",
      ],
    },
    {
      title: "Professionalism (F8)",
      gate: "Given an informatics practice dilemma -- typically privacy, security or access to health data -- identify the ethical principle at stake, the informatician's responsibility to each party, and the professional action it requires.",
      objectives: [
        "Professional ethical principles in health informatics, including those in AMIA's Code of Ethics",
        "The informatician's responsibilities to the profession, to employers and to the stakeholders of the solutions they build",
        "Preserving the confidentiality, privacy and security of patient and other health data",
        "Balancing data protection against appropriate stakeholder access",
        "Professional practice that puts the discipline's ethics and values into action",
        "Maintaining knowledge and technical skills through lifelong learning and professional development",
        "Information literacy as a professional habit",
      ],
    },
    {
      title: "Interprofessional Collaborative Practice (F9)",
      gate: "For a health informatics project, map who the professions and stakeholders are (patients included), what each contributes, and how the team will communicate and divide the work.",
      objectives: [
        "Scope of practice and roles of the health professions and other stakeholders, including patients",
        "Values and ethics of interprofessional work: honesty, integrity, trust and respect",
        "Interprofessional communication that is responsive and responsible",
        "Relationship-building across professions",
        "Teamwork and team science: drawing on each member's strengths and assigning roles and methods",
        "Team dynamics in solving complex health and health information problems",
        "Mutual respect, shared values and understanding one's own role within the team",
      ],
    },
    {
      title: "Leadership (F10)",
      gate: "Set out a vision for a health informatics initiative, the priorities and decisions it needs, and how you would lead people -- and follow well -- to deliver it through change.",
      objectives: [
        "What leadership is: an interactive process whose output is vision, guidance and direction",
        "Characteristics of a credible leader: honesty, competence, the ability to inspire and to communicate a vision",
        "Setting goals and priorities and making decisions",
        "Leading change and acting as a change agent",
        "Stewardship and developing followers and future leaders",
        "Followership: the capacity to actively follow a leader",
        "Using leadership and followership methods and tools to motivate others toward a health informatics vision",
      ],
    },
  ],
};
