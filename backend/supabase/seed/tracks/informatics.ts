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
// The first objectives in each unit (75 in all) were written in our own
// words from the topics each domain's description names. The source carries
// "Republication Not Permitted", so nothing is copied from it.
//
// Deepened 2026-10-31. The CAHIIM/AMIA text states each domain in one
// paragraph, so the objectives appended after the original ones in each unit
// (each marked with a source key in a trailing comment) add the concrete
// material accredited programs teach under that domain: standards,
// terminologies, privacy and information-blocking law, decision support,
// analytics, implementation and evaluation. Every appended objective is
// paraphrased from a source below that was actually read; course lists were
// used only as a signal of what programs teach, never copied. The domains
// remain the frame: each item sits under the F1-F10 definition it fits best.
// APPEND-ONLY: the live database matches objectives by position, so never
// reorder or remove; add new items only at the end of a unit's array.
//
// Version-specific facts are kept here, not in objective text, because they
// change: FHIR R5 (v5.0.0) was the current core release when read; SMART App
// Launch v2.2.0 and CDS Hooks v2.0.1 are both R4-based. USCDI has
// versions v1 through v8 listed. 45 CFR Part 171 listed ten information-
// blocking exceptions (preventing harm, privacy, security, infeasibility,
// health IT performance, protecting care access, manner, fees, licensing,
// TEFCA manner). HTI-5 (ONC, "Health Data, Technology, and
// Interoperability: ONC Deregulatory Actions To Unleash Prosperity", final
// rule, Federal Register document 2026-21943, published 2026-10-28,
// released 2026-10-26; read in full from federalregister.gov) removes the
// source-attribute support, source-attribute access/modification and
// intervention risk-management requirements of 45 CFR 170.315(b)(11)
// (the HTI-1 "model card" provisions), effective 2026-12-28, and retires
// the old CDS criterion 170.315(a)(9). It amends Parts 170 and 172 only:
// the proposed information-blocking changes were not finalized, so Part
// 171's ten exceptions above still stand. No objective rests on the
// removed requirements; the CDS objective (F4) teaches design, not
// certification rules.
//
// Sources (all accessed 2026-10-31). NC = NonCommercial licence, SA =
// ShareAlike; no ND (NoDerivatives) licence was used.
// Open textbooks:
//   T1  Handbook of eHealth Evaluation: An Evidence-based Approach. Lau F,
//       Kuziemsky C (eds). University of Victoria, 2016 (NCBI Bookshelf
//       NBK481590, 2017). CC BY-NC 4.0 (NC).
//       https://www.ncbi.nlm.nih.gov/books/NBK481590/ ; full PDF via
//       https://dspace.library.uvic.ca/handle/1828/7814
//   T2  Fundamentals of Clinical Data Science. Kubben P, Dumontier M, Dekker A
//       (eds). Springer, 2019 (NCBI Bookshelf NBK543527). CC BY 4.0.
//       https://www.ncbi.nlm.nih.gov/books/NBK543527/ ; PDF via
//       https://library.oapen.org/handle/20.500.12657/22918
//   T3  The Book of OHDSI. Observational Health Data Sciences and
//       Informatics, 2021-01-11 build. CC0 1.0.
//       https://ohdsi.github.io/TheBookOfOhdsi/
//   T4  Nursing Informatics, Communication, and Collaboration. Garner-Jones
//       LK. Utah Education Network Pressbooks, 2025. CC BY-NC-SA 4.0 (NC, SA).
//       https://uen.pressbooks.pub/nursinginformaticsandcommunicationessentials/
// Primary references:
//   P1  HL7 FHIR specification v5.0.0 (R5): overview, summary, RESTful API,
//       exchange approaches pages. HL7 International, 2023. CC0 1.0.
//       https://hl7.org/fhir/
//   P2  SMART App Launch IG v2.2.0 (HL7 International; the page read states
//       no licence of its own beyond CC0 for the HL7 terminology content it
//       uses) and CDS Hooks v2.0.1 (HL7 and Boston Children's Hospital,
//       CC BY 4.0).
//       https://hl7.org/fhir/smart-app-launch/ ; https://cds-hooks.hl7.org/
//   P3  HL7 product briefs: Version 2 Product Suite; CDA Release 2. HL7
//       International, copyright (not openly licensed; used for facts only).
//       https://www.hl7.org/implement/standards/product_brief.cfm?product_id=185
//       https://www.hl7.org/implement/standards/product_brief.cfm?product_id=7
//   P4  45 CFR Part 164 Subparts C (Security), D (Breach Notification) and
//       E (Privacy), current eCFR text. US government, public domain.
//       https://www.ecfr.gov/current/title-45/part-164
//       (HHS's own HIPAA guidance pages refused automated access, so the
//       regulation text itself was used.)
//   P5  45 CFR Part 171 (Information Blocking), current eCFR text. Public
//       domain. https://www.ecfr.gov/current/title-45/part-171
//   P6  ASTP/ONC (HealthIT.gov): Information Blocking; USCDI; TEFCA; Clinical
//       Decision Support; 2025 SAFER Guides; Change Management in EHR
//       Implementation Primer v2.0 (2016). Public domain.
//       https://www.healthit.gov/topic/information-blocking
//       https://www.healthit.gov/isp/united-states-core-data-interoperability-uscdi
//       https://www.healthit.gov/topic/interoperability/policy/trusted-exchange-framework-and-common-agreement-tefca
//       https://www.healthit.gov/topic/safety/clinical-decision-support
//       https://www.healthit.gov/topic/safety/safer-guides
//       https://healthit.gov/wp-content/uploads/2026/01/change-management-ehr-implemention.pdf
//   P7  NLM pages: SNOMED CT, LOINC, RxNorm overview, UMLS. Public domain.
//       https://www.nlm.nih.gov/healthit/snomedct/index.html
//       https://www.nlm.nih.gov/research/umls/loinc_main.html
//       https://www.nlm.nih.gov/research/umls/rxnorm/overview.html
//       https://www.nlm.nih.gov/research/umls/index.html
//   P8  CMS ICD-10 codes page; CMS/ASTP eCQI Resource Center (eCQMs, eCQM
//       Basics 101, Oct 2024). Public domain.
//       https://www.cms.gov/medicare/coding-billing/icd-10-codes
//       https://ecqi.healthit.gov/ecqms
//   P9  CDC: National Syndromic Surveillance Program; electronic case
//       reporting; immunization information systems. Public domain.
//       https://www.cdc.gov/nssp/php/about/index.html
//       https://www.cdc.gov/ecr/php/about/index.html
//       https://www.cdc.gov/iis/about/index.html
//   P10 AHRQ Workflow Assessment for Health IT Toolkit. Public domain.
//       https://digital.ahrq.gov/health-it-tools-and-resources/evaluation-resources/workflow-assessment-health-it-toolkit
// Curriculum signals (published course lists; topics only, not copied):
//   C1  University of Illinois Chicago, MS Health Informatics (CAHIIM).
//       https://healthinformatics.uic.edu/online-programs/master-of-science-in-health-informatics-mshi/
//   C2  Adelphi University, MS Healthcare Informatics (CAHIIM).
//       https://online.adelphi.edu/healthcare-informatics/ms-in-healthcare-informatics/curriculum/
//   C3  University of Cincinnati, Master of Health Informatics (CAHIIM).
//       https://www.online.uc.edu/degrees-programs/bachelors-required/masters/health-informatics.html
//   C4  Johns Hopkins University, Health Informatics Specialization (Coursera).
//       https://www.coursera.org/specializations/health-informatics
//   C5  Georgia Tech CS 6440 Intro to Health Informatics syllabus, Spring 2026.
//       https://omscs.gatech.edu/sites/default/files/documents/Syllabi/CS%206440%202026-1.pdf
//   C6  Georgia Tech "Health Informatics on FHIR" courses (edX/Coursera),
//       lesson lists via Class Central.
//       https://www.classcentral.com/course/health-informatics-the-georgia-institute-of-techn-13542
//       https://www.classcentral.com/course/health-informatics-the-georgia-institute-of-techn-13543
//   C7  Udemy, "Health Data and Electronic Health Records (EHR) for Beginners".
//       https://www.udemy.com/course/electronic-health-records/
// Added by the 2026-10-31 source audit (accessed 2026-10-31):
//   T5  Secondary Analysis of Electronic Health Records. MIT Critical Data
//       (eds). Springer, 2016. CC BY-NC 4.0 (NC). Chapter 11 (Data
//       Preparation): relational databases, schemas, keys and SQL queries.
//       https://link.springer.com/book/10.1007/978-3-319-43742-2
//   P11 OMOP Common Data Model specification, current version CDM v5.5,
//       OHDSI (the body that maintains the standard). Licence not stated
//       on the site or the GitHub repository; facts only, no text.
//       https://ohdsi.github.io/CommonDataModel/
//   P12 AHRQ Workflow Assessment for Health IT Toolkit: Project Planning
//       and Management tools (critical path, Gantt and PERT charts,
//       strategic planning, SWOT, balanced scorecard), and its EHR
//       Implementation Checklist (Lumetra/IFQHC, 2006: project team, scope
//       document, schedule, roles, change and issue management, testing,
//       contingency and go-live planning). Public domain.
//       https://digital.ahrq.gov/health-it-tools-and-resources/evaluation-resources/workflow-assessment-health-it-toolkit/all-workflow-tools/project
//       https://digital.ahrq.gov/sites/default/files/docs/workflowtoolkit/ehr_implementation_checklist.pdf
// Added by the 2026-11-02 mitigation pass (accessed 2026-11-02):
//   T6  Health Information Systems: Technological and Management
//       Perspectives. Winter A, Ammenwerth E, Haux R, Marschollek M,
//       Steiner B, Jahn F. Springer, 3rd ed., 2023. CC BY 4.0. Section
//       3.4.11 defines a data warehouse system as collecting information
//       from other application systems for analysis, presentation,
//       hospital management and clinical research.
//       https://www.ncbi.nlm.nih.gov/books/NBK602584/
//   P13 Consumer Health Information Seeking: A Report to the Board of
//       Scientific Counselors. Tse T, Gemoets D, Rosemblat G. US National
//       Library of Medicine, Lister Hill National Center for Biomedical
//       Communications, 2004. Public domain. Its government research
//       framework models information seeking as iterative need, access and
//       evaluation shaped by the seeker, task, source, channel and context.
//       https://lhncbc.nlm.nih.gov/LHC-publications/PDF/tr2004003.pdf
//
// Source tiers (docs/source-reliability-standard.md; audit 2026-10-31).
// Tier 2 criteria: 1 credentialed authors, 2 stated review, 3 publisher,
// 4 date (theory and frameworks may be older than 5 years), 5 no
// commercial interest.
//   - CAHIIM curriculum and standards PDFs; AMIA competencies (Valenta et
//     al., JAMIA 2018): Tier 1 (accreditor and the document it cites).
//   - P1-P3 (HL7 FHIR, SMART, CDS Hooks, V2, CDA): Tier 1 (standards body,
//     for its own standards). P4-P10 and P12 (eCFR, HealthIT.gov, NLM,
//     CMS, CDC, AHRQ): Tier 1 (government). P11 (OMOP CDM site): Tier 1
//     for the OMOP CDM only. P13 (NLM/LHNCBC): Tier 1 (government).
//   - T1 Handbook of eHealth Evaluation: Tier 2, criterion 2 borderline --
//     passed on editorial review by its named editors (Lau PhD, Kuziemsky
//     PhD) and a named copy editor; the book states no external peer
//     review. Criteria 1, 3 (University of Victoria; NCBI Bookshelf),
//     4 (2016; evaluation methods are frameworks) and 5 met.
//   - T2 Fundamentals of Clinical Data Science: Tier 2. Criteria 1 (named
//     PhD/MD editors and chapter authors), 3 (Springer), 4 (2019; methods
//     and frameworks) and 5 met. Criterion 2 passed on the publisher: no
//     review statement was found in the book, but the standard names
//     Springer open-access books as meeting the bar.
//   - T3 Book of OHDSI: NOT Tier 2 -- fails criterion 2 (no stated review;
//     a community-written living book) and criterion 1 (chapter leads
//     named without credentials). It no longer supports any objective on
//     its own; its objectives also cite T1, T2, T5, P7 or P11.
//   - T4 Nursing Informatics, Communication, and Collaboration (UEN): Tier
//     2, all five met -- author Garner-Jones DNP, MSN-Ed, CNE, NPD-BC;
//     named content experts and peer reviewers in the preface (Bottelberghe
//     MSN RN, Randles EdD MSN RN, Martiz Wheeler PhD and others; the one
//     informatics specialist, Hightower NI-BC, is marked "pending
//     review"); Weber State University, published 2025-08-25. The preface
//     says generative AI drafted chapter conclusions only; the objectives
//     resting on T4 were checked against chapter body text (ch5 portals
//     and online health information, ch6 documentation burden, ch12
//     TeamSTEPPS and SBAR).
//   - T5 Secondary Analysis of EHRs: Tier 2. Criterion 1 rests on the
//     named clinician and scientist chapter authors (the editor is the
//     group MIT Critical Data); 3 (Springer), 4 (2016; database concepts
//     are methods, not clinical facts) and 5 met. Criterion 2 passed on
//     the same Springer basis as T2; no review statement was found.
//   - T6 Health Information Systems: Tier 2. Criteria 1 (six named medical
//     informatics authors at Leipzig University, UMIT TIROL, Hannover
//     Medical School and peer institutions), 3 (Springer and NCBI
//     Bookshelf), 4 (2023) and 5 met. Criterion 2 passed on the same
//     Springer open-access-book basis as T2 and T5.
//   - C1-C7: curriculum signals only; never sufficient support.
//
// Where the sources disagreed, and what we did (checked against Tier 1,
// 2026-10-31):
//   - Decision-support "model card" disclosures: HTI-1-era material
//     describes source-attribute transparency for predictive decision
//     support as a certification requirement. Resolved by ONC, HTI-5 final
//     rule, 2026 (above): removed effective 2026-12-28. No objective states
//     the requirement.
//   - Information blocking: commentary on the HTI-5 proposal described
//     information-blocking changes. Resolved by the same final rule: not
//     finalized; 45 CFR Part 171 as read is current.
//   - No other disagreement between sources was found in this file.
//   - The audit initially removed data warehouses and models of health
//     information behaviour because the course catalogues were insufficient
//     support. The 2026-11-02 mitigation restored them as new append-only
//     objectives after finding T6 and P13 respectively; no live objective
//     was reworded or moved.

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
        "Primary and secondary use of health data: the same records serving direct care and also quality improvement, surveillance, planning and research", // T1 ch16
        "Observational data sources -- electronic health records, insurance claims and registries -- what each was collected for and what it tends to miss", // T3 ch4; T2 ch1
        "How clinical systems feed public health: syndromic surveillance, electronic case reporting and immunization information systems, and what each tells health departments", // P9; C6
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
        "Structured versus unstructured clinical data, and why free-text notes are harder to search, count and reuse", // T4 ch6; T2 ch1; C7
        "Relational databases, data modelling and SQL: tables linked by primary and foreign keys, and queries that join them to pull data on many patients", // T5 ch11; C2 HIN 680; C3 IS 7031
        "Natural language processing and text mining: pulling usable facts out of clinical notes", // T2 ch1; C2 HIN 620; C3 HI 7020
        "Data warehouses: bringing information from operational clinical and administrative systems together for analysis, reporting, hospital management and clinical research", // T6 3.4.11
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
        "The HIPAA Privacy Rule: who it covers (covered entities and business associates), what protected health information is, and which uses and disclosures it allows", // P4 Part 164 Subpart E; T4 ch7; C2 HIN 660
        "The HIPAA breach notification rule as strengthened by HITECH: what counts as a breach, how risk is assessed and who must be notified", // P4 Part 164 Subpart D; T4 ch7
        "The 21st Century Cures Act's information-blocking rules: which actors they apply to, what counts as interference with access to electronic health information, and why exceptions exist", // P5; P6
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
        "HL7 Version 2 messaging: the long-established, widely implemented standard for passing clinical data between a central patient care system and departmental systems", // P3; C6; C7
        "Clinical Document Architecture: exchanging whole clinical documents such as discharge summaries, and the properties that make something a document", // P3; C6
        "FHIR resources: small, reusable building blocks that reference each other and can be written as JSON or XML", // P1 overview, summary; C5
        "FHIR exchange patterns: the RESTful API for reading, searching, creating and updating resources, and when documents, messages, subscriptions or operations fit better", // P1 http, exchanging
        "Profiles, extensions and implementation guides: tailoring a base standard to a country, a programme or a use case", // P1 overview, summary
        "SMART on FHIR: how apps launched from an EHR, or running as back-end services, are authorised with OAuth 2.0 scopes", // P2; C5; C7
        "CDS Hooks: calling an outside decision-support service at set points in the clinician's workflow and showing its advice as cards", // P2; P1 exchanging
        "Health information exchange: organisations and networks that move records between providers, including nationwide trust frameworks such as TEFCA", // T4 ch6; P6
        "Core data sets for exchange: what the US Core Data for Interoperability defines and why it is versioned", // P6
        "SNOMED CT: the clinical terminology designated for detailed clinical documentation and exchange in US systems, and how NLM distributes it", // P7; C6
        "LOINC: identifying laboratory tests and other clinical observations so results mean the same thing everywhere", // P7; C6
        "RxNorm: normalised drug names and identifiers that let pharmacy and drug terminologies talk to each other", // P7; C6
        "ICD-10-CM and ICD-10-PCS as classifications for diagnoses and inpatient procedures, and how a classification differs from a clinical terminology", // P8; C6; C7
        "The UMLS and terminology mapping: linking equivalent concepts across different vocabularies", // P7; T3 ch5
        "Common data models such as OMOP: reshaping data from many sources into one structure and vocabulary so the same analysis runs everywhere", // P11; T3 ch4-5; C5; C7
        "Data quality dimensions -- correctness, completeness, concordance, plausibility and currency -- and how to check data against them", // T1 ch16; T3 ch15
        "Data stewardship and governance: assigning responsibility for health data and making it findable, accessible, interoperable and reusable (FAIR)", // T2 ch4; C3 HI 7072
        "HIPAA Security Rule safeguards in system design: risk analysis plus administrative, physical and technical controls such as access control, audit logs, integrity checks and transmission security", // P4 Part 164 Subpart C; C1 BHIS 517; C3 HI 7030
        "De-identification: removing listed identifiers versus expert statistical determination, and the re-identification risk that remains", // P4 164.514
        "Clinical decision support design: types of intervention (alerts, order sets, templates, reference information) and the knowledge, patient data and logic each needs", // P6 CDS page; T2 ch11; T4 ch6; C2 HIN 603
        "Clinical prediction and machine learning models: development, internal and external validation, discrimination and calibration", // T2 ch8-10; C1 BHIS 542
        "Electronic clinical quality measures: how measure logic, value sets and EHR data are combined to calculate and report a quality score", // P8 eCQI
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
        "Usability defined: how effectively, efficiently and satisfyingly specified users can reach their goals in a given context, and how learnable the system is", // T1 ch19; T4 ch6
        "Usability evaluation methods: expert inspection such as heuristic evaluation and cognitive walkthrough, and user testing with think-aloud protocols", // T1 ch11; C2 HIN 681
        "Usability and safety as properties of the whole socio-technical system, and unintended consequences such as workarounds", // T1 ch19
        "Alert fatigue: why too many or poorly targeted alerts get overridden, and how to make alerts worth reading", // T2 ch11; T4 ch6
        "Workflow analysis and process mapping: documenting how work happens before health IT changes it", // P10; C3 HI 7040
        "Documentation burden: how EHR documentation affects clinician time, burnout and the patient encounter", // T4 ch6
        "EHR safety practices: reliable patient identification, planning for downtime and closing the loop on test results", // P6 SAFER Guides
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
        "Mobile health, wearables and remote patient monitoring for self-management, and how to judge an app's quality, privacy and safety", // T4 ch2, ch5, ch7; C2 HIN 630
        "Patient portals and personal health records: what patients can see and do, and what limits their use", // T4 ch5, ch7
        "Consumer health informatics: how the internet, social media and apps change how patients seek and use health information, and how to guide them to reliable sources", // T4 ch5; C1 BHIS 528; C2 HIN 690
        "Health-information-behaviour models: examining how needs, people, tasks, sources, channels and context shape the iterative process of seeking, accessing and evaluating health information", // P13
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
        "The EHR implementation life cycle: selecting a vendor, building a project plan, training staff, going live and sustaining the change", // P6 change-management primer
        "Health IT project management: the project team, scope document, schedule tools such as Gantt charts and the critical path, issue tracking, testing and contingency planning", // P12; P6 change-management primer; C3 HI 7050; C1 BHIS 543; C4 course 2
        "Systems analysis and design for a health IT project: gathering user requirements, modelling, building and validating against those requirements", // C1 BHIS 520; T2 ch11
        "Evaluation frameworks for eHealth: system, information and service quality, use, user satisfaction and net benefits", // T1 ch2
        "Clinical adoption at the micro, meso and macro levels: how people, organisations and wider policy and funding shape whether a system is used", // T1 ch3
        "Choosing an evaluation design: formative versus summative, and comparative, descriptive, correlational, survey or qualitative studies", // T1 ch8, ch10-13; C1 BHIS 504
        "Economic evaluation of eHealth: cost-benefit, cost-effectiveness, cost-utility and return-on-investment analyses", // T1 ch5, ch14; T2 ch14
        "Process improvement with Lean, Six Sigma and process mining of system event logs", // T2 ch13
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
        "Individuals' rights over their health information: access, amendment, an accounting of disclosures and the notice of privacy practices", // P4 164.520-164.528
        "Minimum necessary: limiting each use or disclosure of health data to what the task actually requires", // P4 164.502(b)
        "When withholding data is and is not justified: weighing privacy, security, harm-prevention and feasibility exceptions against the duty to share", // P5 171.201-171.204
        "Informed consent and data reuse: what people must be told about how their data will be used, shared and protected", // T2 ch4
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
        "TeamSTEPPS as an evidence-based framework for team communication, role clarity and safety", // T4 ch12
        "Structured communication and handoff tools such as SBAR, and why a handoff needs acknowledgement and a chance to ask questions", // T4 ch12
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
        "Kotter's change model applied to health IT: creating a climate for change, engaging the organisation, and implementing and sustaining the change", // P6 change-management primer
        "Strategic planning for health IT and digital health: setting a future-state vision and priorities, SWOT analysis, and choosing a vendor that fits the organisation's goals", // P12; P6 change-management primer; C3 HI 7060; C1 BHIS 538; C4 course 2
      ],
    },
  ],
};
