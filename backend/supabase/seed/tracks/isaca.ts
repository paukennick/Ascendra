// REQ-272 (Nick, 2026-11-14): ISACA CISM, part of the non-CompTIA security
// wave (REQ-270 to REQ-274; header of tracks/isc2.ts). Same shape as the
// CompTIA security courses, with dated unit sources and outline headings.
//
// What was read, and when (all 2026-11-14, on isaca.org):
//   - CISM exam content outline page,
//     https://www.isaca.org/credentialing/cism/cism-exam-content-outline
//     (fetched as HTML and read in full as text): 150 questions, four job
//     practice domains at 18 / 20 / 33 / 29 percent, each split into an A
//     and a B part with subtopic headings, and the list of supporting tasks.
//     These are the NEW weights: the 2022 outline was 17 / 20 / 33 / 30.
//   - ISACA press release, 2026-09-10, "ISACA Updates CISM Exam Content
//     Outline, Factoring in Today's Technologies, Security Responsibilities"
//     (https://www.isaca.org/about-us/newsroom/press-releases/2026/isaca-updates-cism-exam-content-outline-factoring-in-todays-technologies-security-responsibilities,
//     first read through a summarizing fetch, then re-read as the raw page
//     text the same day): the updated exam "will be available on 3 November
//     2026"; "The four CISM domains will remain the same"; Domain 1 18,
//     Domain 2 20, Domain 3 33, Domain 4 29 percent (agreeing with the
//     outline page); "greater emphasis on information security strategy and
//     program development"; "two new content areas: enterprise architecture
//     and information security architecture".
//   - ISACA Certification Exam Candidate Guide (2026 PDF,
//     https://www.isaca.org/-/media/files/isacadp/project/isaca/certification/exam-candidate-guides/2026/exam-candidate-guide.pdf,
//     read as text): CISM is 4 hours (240 minutes), 150 multiple-choice
//     questions; five or more years of information security management
//     experience, with waivers for at most two years; domains 18 / 20 / 33 /
//     29 (agreeing with the outline page); scores are scaled 200-800, 450 or
//     higher passes, 800 is all correct; scored plus unscored pretest items;
//     domain results are informational only; delivered at PSI centers or
//     remotely proctored; candidates have 5 years from passing to apply.
//
// Trademarks: ISACA's intellectual property page
// (https://www.isaca.org/about-us/intellectual-property-and-licensing, read
// 2026-11-14) says ISACA "administers, maintains and enforces Intellectual
// Property Guidelines" and sends permission questions to IPinfo@isaca.org; it
// names no rule for third-party prep. The outline page marks the name as
// "Certified Information Security Manager® (CISM®)". Descriptive title and an
// independence notice (REQ-194 pattern); the use is a decision for Nick.
// Not legal advice.
//
// Objectives are our own wording; each unit's `outline` carries ISACA's
// part (A/B) and subtopic headings, and the supporting tasks are carried on
// the domain they most belong to (ISACA lists the tasks once for the whole
// exam, not per domain; that split is our judgment).

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
const REVIEW_DUE_AT = "2027-05-14T00:00:00Z";
const RECHECK = "2027-05-14";

export const CISM_OUTLINE_URL = "https://www.isaca.org/credentialing/cism/cism-exam-content-outline";
const GUIDE_URL =
  "https://www.isaca.org/-/media/files/isacadp/project/isaca/certification/exam-candidate-guides/2026/exam-candidate-guide.pdf";
const PRESS_URL =
  "https://www.isaca.org/about-us/newsroom/press-releases/2026/isaca-updates-cism-exam-content-outline-factoring-in-todays-technologies-security-responsibilities";

const src = (title: string, url: string, kind: UnitSource["kind"], extra: Partial<UnitSource> = {}): UnitSource => ({
  title,
  ...source(url, kind, CHECKED, RECHECK),
  ...extra,
});

const CISM_OUTLINE = {
  1: [
    "A. Enterprise Governance: Organizational Purpose and Culture; Legal, Regulatory, and Contractual Requirements; Organizational Structures, Roles, and Responsibilities",
    "B. Information Security Strategy: Information Security Strategy Development; Enterprise Architecture; Information Governance Frameworks and Standards; Strategic Planning (e.g., budgets, resources, business case)",
    "Task: Identify internal and external influences to the organization that impact the information security strategy.",
    "Task: Establish and/or maintain an information security strategy in alignment with organizational goals and objectives.",
    "Task: Establish and/or maintain an information security governance framework.",
    "Task: Integrate information security governance into organizational governance.",
    "Task: Develop business cases to support initiatives and investments in information security.",
    "Task: Gain ongoing commitment from senior leadership and other stakeholders to support the implementation of the information security strategy.",
    "Task: Define, communicate, and monitor information security responsibilities and accountability throughout the organization.",
    "Task: Establish and maintain a regulatory landscape (e.g., legal, regulatory, compliance).",
  ],
  2: [
    "A. Information Security Risk Identification and Assessment: Emerging Risk and Threat Landscape; Vulnerability and Control Deficiency Analysis; Risk Assessment and Analysis",
    "B. Information Security Risk Response: Risk Treatment/Risk Response Options; Risk and Control Ownership; Risk Monitoring and Reporting",
    "Task: Monitor technology landscape to identify potential impacts from emerging technologies.",
    "Task: Participate in and/or oversee the information security risk management life cycle.",
    "Task: Participate in and/or oversee the vulnerability management process.",
    "Task: Participate in and/or oversee threat management process (e.g., intelligence and modeling).",
    "Task: Identify, recommend, or implement appropriate risk treatment and response options to manage risk to acceptable levels based on organizational risk appetite.",
    "Task: Determine whether information security controls are appropriate and effectively manage risk to an acceptable level.",
    "Task: Facilitate the integration of information security risk management into business and IT processes.",
    "Task: Monitor for internal and external factors that may require reassessment of risk.",
    "Task: Establish and maintain a security exception process (e.g., noncompliance and changes in information risk).",
  ],
  3: [
    "A. Information Security Program Development: Information Security Architecture; Information Security Program Resources (e.g., people, process, technologies); Information Security Industry Standards and Frameworks; Information Security Policies, Standards, Procedures, and Guidelines; Information Asset Identification and Classification; Information Security Control Design and Selection; Information Security Program Metrics Development",
    "B. Information Security Program Management: Information Security Control Implementation and Integrations; Information Security Control Testing and Evaluation; Information Security Awareness and Training; Management of External Services (e.g., suppliers, third parties, nth parties); Information Security Program Metrics, Communications, and Reporting",
    "Task: Establish, communicate, and maintain information security policies to guide the development of standards, procedures, and guidelines.",
    "Task: Evaluate information to report on the activities, trends, and overall effectiveness of the information security program to senior leadership and other stakeholders.",
    "Task: Evaluate and report information security metrics.",
    "Task: Establish and/or maintain the information security program in alignment with the information security strategy.",
    "Task: Align the information security program with operational objectives of other business functions.",
    "Task: Integrate information security into operational functions of respective business units.",
    "Task: Ensure alignment of security architecture to enterprise architecture.",
    "Task: Update security architecture in accordance with changes to technology landscape.",
    "Task: Establish and maintain information security processes and resources to execute the information security program.",
    "Task: Establish, communicate, and maintain organizational information security standards, guidelines, procedures, and other documentation.",
    "Task: Establish, promote, and maintain an information security awareness training program.",
    "Task: Integrate information security requirements into organizational processes.",
    "Task: Integrate information security requirements into contracts and activities of external parties.",
    "Task: Monitor external parties' adherence to established security requirements and address security concerns.",
    "Task: Define and monitor management and operational metrics specific to the information security program.",
    "Task: Establish and/or maintain a process for information asset identification and classification.",
  ],
  4: [
    "A. Incident Management Readiness: Incident Response Plan; Business Impact Analysis (BIA); Business Continuity Plan (BCP); Disaster Recovery Plan (DRP); Incident Classification/Categorization; Incident Management Training, Testing, and Evaluation",
    "B. Incident Management Operations: Incident Management Tools and Techniques; Incident Investigation and Evaluation; Incident Containment Methods; Incident Response Communications (e.g., reporting, notification, escalation); Incident Eradication and Recovery; Post-incident Review Practices",
    "Task: Establish and/or maintain an incident response plan, in alignment with the business continuity plan and disaster recovery plan.",
    "Task: Establish and maintain an information security incident classification and categorization process.",
    "Task: Develop and implement processes to ensure the timely identification of information security incidents.",
    "Task: Establish and maintain processes to investigate and document information security incidents in accordance with legal and regulatory requirements.",
    "Task: Establish and maintain incident handling process (e.g., SOAR, playbooks, UEBA), including containment, notification, escalation, eradication, and recovery.",
    "Task: Organize, train, equip, and assign responsibilities to information security incident response teams.",
    "Task: Contribute to incident communication plans and processes for internal and external parties.",
    "Task: Test and review incident management plans (e.g., table-top, simulation exercises, and walk-through) at planned intervals.",
    "Task: Conduct post-incident reviews to facilitate continuous improvement, including root-cause analysis, lessons learned, corrective actions, and reassessment of risk.",
  ],
} as const;
const CISM_DOMAIN_TITLES = {
  1: "Information Security Governance",
  2: "Information Security Risk Management",
  3: "Information Security Program",
  4: "Incident Management",
} as const;
type CismDomain = keyof typeof CISM_DOMAIN_TITLES;
const CISM_WEIGHTS: Record<CismDomain, number> = { 1: 18, 2: 20, 3: 33, 4: 29 };

export const CISM_SOURCES = {
  format: src("ISACA, Certification Exam Candidate Guide (2026) and CISM exam content outline page", GUIDE_URL, "exam_outline", {
    keyValues: [
      "150 multiple-choice questions in 4 hours (240 minutes); PSI test centers or remote proctoring",
      "four domains at 18 / 20 / 33 / 29 percent (outline used from 2026-11-03; the 2022 outline was 17 / 20 / 33 / 30)",
      "scaled score 200-800; 450 or higher passes; 800 means every scored question was right; domain results are informational only",
      "exams include unscored pretest items that do not count toward the score",
      "certification needs five years of information security management experience (waivers for at most two years), applied for within 5 years of passing",
    ],
  }),
  update2026: src("ISACA press release (2026-09-10): updated CISM exam available 2026-11-03", PRESS_URL, "reference", {
    keyValues: [
      "the updated exam is available from 2026-11-03; the four domains are unchanged and select content shifts between them",
      "new content areas: enterprise architecture and information security architecture; more emphasis on strategy and program development",
    ],
  }),
} as const;

const cismOutline = (d: CismDomain): UnitSource =>
  src(`ISACA, CISM Exam Content Outline (exam from 2026-11-03), Domain ${d}: ${CISM_DOMAIN_TITLES[d]}`, CISM_OUTLINE_URL, "exam_outline", {
    outline: [...CISM_OUTLINE[d]],
  });

const cismUnit = (d: CismDomain, gate: string, objectives: string[]) => ({
  title: CISM_DOMAIN_TITLES[d],
  rangeLabel: `${CISM_WEIGHTS[d]}% of the exam`,
  weight: CISM_WEIGHTS[d],
  gate,
  sources: [cismOutline(d), CISM_SOURCES.format, CISM_SOURCES.update2026],
  objectives,
});

export const CISM_TRACK: SeedTrack = {
  code: "CISM",
  title: "Prep for an information security management certification exam",
  description:
    "Preparation for an information security management certification exam on the content outline used from November 3, 2026: information security governance, risk management, the security program and incident management, weighted 18/20/33/29 as the exam weights them, answered the way a security manager answers -- business first. Independently developed exam prep; not affiliated with or endorsed by the organization that owns or administers this exam.",
  trackType: "certification",
  subcategorySlug: "it-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: CISM_OUTLINE_URL,
  // Set last (verify-common.md), after every unit was compared with the
  // outline read on 2026-11-14.
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  credential: {
    providerSlug: "isaca",
    providerName: "ISACA",
    providerUrl: "https://www.isaca.org/",
    subcategorySlug: "it-certifications",
    credentialType: "certification",
    credentialSlug: "cism",
    credentialName: "Certified Information Security Manager (CISM)",
    credentialUrl: "https://www.isaca.org/credentialing/cism",
    basis: "vendor_exam_unpublished_code",
    examRevision: "CISM exam content outline, exam available from 2026-11-03",
    objectivesRevision: "Four domains, each with an A and a B part, and the supporting tasks",
    versionNote:
      "ISACA publishes no exam code or outline version number; the current outline is the one ISACA's 2026-09-10 press release says is used for exams from 2026-11-03 (weights 18/20/33/29, replacing 17/20/33/30).",
    status: "active",
    effectiveDate: "2026-11-03",
    officialObjectivesUrl: CISM_OUTLINE_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "To be certified after passing: five or more years of information security management experience, with waivers available for at most two years, applied for within five years of passing.",
    durationMinutes: 240,
    questionFormat:
      "150 multiple-choice questions in 4 hours (240 minutes), at a PSI testing center or remotely proctored. Scored and unscored pretest items are mixed. (ISACA Exam Candidate Guide, 2026; CISM exam content outline page, read 2026-11-14.)",
    passingScorePolicy:
      "Scaled score from 200 to 800; 450 or higher passes, and 800 means every scored question was answered correctly. Domain-level results are informational only; the result is based on the total.",
  },
  units: [
    cismUnit(
      1,
      "Given an organization's purpose, culture, legal obligations and structure, build an information security strategy from where it is to where it must be, pick the governance framework that fits, and make the business case that wins senior leadership's commitment.",
      [
        // 1A
        "Analyze an organization's purpose and culture and how they shape its information security",
        "Evaluate the legal, regulatory and contractual requirements that bind the organization",
        "Define organizational structures, roles and responsibilities for information security, from the board and steering committee to the CISO and risk owners",
        // 1B
        "Develop an information security strategy aligned with organizational goals, from current state to desired state",
        "Align information security with the enterprise architecture",
        "Select information governance frameworks and standards such as COBIT, ISO/IEC 27001 and the NIST Cybersecurity Framework",
        "Build a business case, budget and resource plan that gains senior leadership's commitment",
      ]
    ),
    cismUnit(
      2,
      "Given a risk register and a changing threat landscape, assess a new risk against the organization's appetite, choose a treatment and an owner, decide whether a requested exception is acceptable, and report the change with key risk indicators.",
      [
        // 2A
        "Monitor the emerging risk and threat landscape and assess the effect of new technologies",
        "Analyze vulnerabilities and control deficiencies",
        "Assess and analyze information security risk against the organization's risk appetite and tolerance",
        // 2B
        "Choose a risk treatment -- mitigate, transfer, avoid or accept -- based on risk appetite",
        "Assign risk and control ownership and run a security exception process",
        "Monitor and report risk with key risk indicators and a risk register",
      ]
    ),
    cismUnit(
      3,
      "Given a strategy, design the security program that delivers it -- architecture, resources, policies, classification, controls and metrics -- then implement and test the controls, manage suppliers and third parties against contract requirements, and report the program's effectiveness to leadership.",
      [
        // 3A
        "Design an information security architecture that supports the program and stays aligned with enterprise architecture",
        "Manage program resources: people, process and technology",
        "Apply industry standards and frameworks to the security program",
        "Develop information security policies and the standards, procedures and guidelines under them",
        "Develop an information asset identification and classification process",
        "Design and select information security controls",
        "Develop program metrics that show whether the program meets its objectives",
        // 3B
        "Implement security controls and integrate them into business processes",
        "Test and evaluate security controls",
        "Manage a security awareness and training program",
        "Manage external services -- suppliers, third parties and nth parties -- through contract requirements and monitoring",
        "Communicate and report program metrics to senior leadership and other stakeholders",
      ]
    ),
    cismUnit(
      4,
      "Given an incident at a business with a continuity plan, classify it, decide who to notify and when, choose containment that respects the business impact analysis, run investigation, eradication and recovery, and lead a post-incident review that changes the plan.",
      [
        // 4A
        "Develop an incident response plan aligned with the business continuity and disaster recovery plans",
        "Use a business impact analysis to prioritize recovery and set recovery time and recovery point objectives",
        "Develop business continuity and disaster recovery plans",
        "Design an incident classification and categorization scheme by severity and type",
        "Train, test and evaluate incident management with tabletop, walk-through and simulation exercises",
        // 4B
        "Select incident management tools and techniques such as SIEM, SOAR, playbooks and UEBA",
        "Investigate and evaluate incidents, documenting them in line with legal and regulatory requirements",
        "Choose incident containment methods",
        "Manage incident response communications: reporting, notification and escalation",
        "Eradicate the cause of an incident and recover operations",
        "Conduct post-incident reviews: root cause analysis, lessons learned, corrective actions and reassessment of risk",
      ]
    ),
  ],
};

export const ISACA_TRACKS: readonly SeedTrack[] = [CISM_TRACK];
