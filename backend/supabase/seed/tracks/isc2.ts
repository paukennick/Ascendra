// REQ-270 (Nick, 2026-11-14): ISC2's Certified in Cybersecurity (CC) and
// CISSP, the first two courses of the non-CompTIA security wave (REQ-270
// to REQ-274: ISC2 here, ISACA CISM in tracks/isaca.ts, EC-Council CEH in
// tracks/eccouncil.ts). Built to the CompTIA security courses' shape
// (CYSAPLUS, SECPLUS: a certification track per exam, weighted domains, a
// gate per unit, objectives naming the outline's terms in our own words) with
// the newer dated unit sources and outline headings of the NBCC courses
// (REQ-235).
//
// What was read, and when (all 2026-11-14, on ISC2's own site unless marked):
//   - CC exam outline page, https://www.isc2.org/certifications/cc/cc-certification-exam-outline
//     ("EFFECTIVE DATE: SEPTEMBER 1, 2026"; five domain headings, no weights
//     on the page) and the English PDF it links,
//     EXAMS-CC_Exam_Outline-English-Revised-01-2026-Final.pdf (footer
//     "v01/2026", "Effective Date: September 1, 2026"), read in full as text:
//     five domains at average weights 24 / 17.3 / 20 / 21.3 / 17.3 (printed
//     "Total: 100%", but the five numbers add to 99.9), CAT for every
//     language, 2 hours, 100-125 items, "Multiple choice and advanced item
//     types", passing grade 700 out of 1000, Pearson VUE. The previous
//     outline (effective 2025-10-01: Security Principles 26, BC/DR and
//     Incident Response 10, Access Controls 22, Network Security 24, Security
//     Operations 18) was also read and is NOT what this course teaches.
//     ISC2's article "What's New for Entry-Level Cybersecurity" (2026-08-06,
//     https://www.isc2.org/insights/2026/08/inside-the-updated-isc2-cc-exam)
//     gives no figures; it says the update "emphasizes governance, cloud
//     security, threat intelligence and more".
//   - CISSP exam outline page, https://www.isc2.org/certifications/cissp/cissp-certification-exam-outline,
//     which shows the outline "Effective Date: April 15, 2024" and says
//     "Effective April 15, 2027, the CISSP exam will be based on a new exam
//     outline". Both PDFs it links were read in full as text:
//       * CISSP-Exam-Outline-April-2024-English.pdf (footer "v9/2024"): the
//         CURRENT outline this course teaches -- eight domains at average
//         weights 16 / 10 / 13 / 13 / 13 / 12 / 13 / 10; CAT; 3 hours;
//         100-150 items; "Multiple choice and advanced innovative items";
//         700 out of 1000.
//       * 2027/EXAMS-CISSP-Exam-Outline-English-RB-Revised-1016-ENU-2.pdf
//         ("Effective Date: April 15, 2027"): Domain 1 renamed "Security
//         Governance and Risk Management", weights 13.6 / 12 / 12.8 / 12.8 /
//         13.6 / 11.2 / 12.8 / 11.2, "Ethics in Artificial Intelligence (AI)"
//         added under 1.1, and the waiver line "Only one year of experience
//         can be waived". Not taught yet: the 2027 units are a successor
//         version (REQ-102, retire-and-append) to be built before 2027-04-15,
//         so contentReviewDueAt is 2027-01-15 and every source is rechecked by
//         then. Whether to add the 2027 units now, side by side as CYSAPLUS
//         did for CS0-004, is a decision for Nick (a learner starting a
//         typical 3-6 month plan today may sit after 2027-04-15).
//   - ISC2's CAT pages, https://www.isc2.org/certifications/cissp/cissp-cat
//     and https://www.isc2.org/certifications/computerized-adaptive-testing
//     (the same FAQ text): every item starts below the passing standard and
//     each next item is chosen so the candidate has about a 50% chance of
//     answering it; at least 100 items, at most 125 (CC) or 150 (CISSP);
//     each exam includes 25 unscored pretest items as part of the minimum;
//     no item review (an answer cannot be changed once finalized); the
//     confidence-interval rule (after 100 items the exam ends when the
//     ability estimate excludes the pass point with 95% confidence), then
//     the maximum-length rule, then the run-out-of-time rule; a candidate who
//     has not answered 75 operational and 25 pretest items when time runs
//     out fails; no numeric score is reported, and failing candidates get
//     per-domain proficiency (below, near, above); the exam is compensatory;
//     retakes after 30, then 60, then 90 test-free days, at most 4 attempts
//     in 12 months; breaks are unlimited but count toward the time.
//
// Trademarks: ISC2's copyright page
// (https://www.isc2.org/policies-procedures/copyright-information, read
// 2026-11-14) lists "ISC2, CISSP, ... CC, and CBK" as registered marks of
// ISC2, Inc., says use of the marks and logos "is authorized for certified
// individuals ONLY", and that "Unauthorized use of the ISC2 marks is strictly
// prohibited" (re-read 2026-11-16). REQ-309 (Nick: "LIMIT TRADEMARKS"):
// titles and descriptions name neither ISC2 nor its marks, and the notice is
// generic (backend/lib/catalog-trademarks.test.ts). Not legal advice.
//
// Objectives are our own wording; the units' `outline` lines carry ISC2's
// numbered headings and the short terms under them (headings only; the
// outlines are copyrighted).

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";

// CC: a six-month review like the CompTIA courses (CYSAPLUS: verified
// 2026-11-07, due 2027-05-07); no announced change to the 2026-09-01 outline.
const CC_REVIEW_DUE_AT = "2027-05-14T00:00:00Z";
const CC_RECHECK = "2027-05-14";
// CISSP: before the 2027-04-15 outline, with three months to build it.
const CISSP_REVIEW_DUE_AT = "2027-01-15T00:00:00Z";
const CISSP_RECHECK = "2027-01-15";

const ISC2 = {
  providerSlug: "isc2",
  providerName: "ISC2",
  providerUrl: "https://www.isc2.org/",
  // IT & Software > IT Certifications (migration 007). No vendor category
  // exists for ISC2, ISACA or EC-Council; a dedicated security category would
  // need a migration (a decision for Nick).
  subcategorySlug: "it-certifications",
  credentialType: "certification",
} as const;

export const CC_OUTLINE_URL =
  "https://edge.sitecorecloud.io/internationf173-xmc4e73-prodbc0f-9660/media/Project/ISC2/Main/Media/documents/exam-outlines/2026/EXAMS-CC_Exam_Outline-English-Revised-01-2026-Final.pdf";
export const CC_PAGE_URL = "https://www.isc2.org/certifications/cc/cc-certification-exam-outline";
export const CISSP_OUTLINE_URL =
  "https://edge.sitecorecloud.io/internationf173-xmc4e73-prodbc0f-9660/media/Project/ISC2/Main/Media/documents/exam-outlines/CISSP-Exam-Outline-April-2024-English.pdf";
export const CISSP_2027_OUTLINE_URL =
  "https://edge.sitecorecloud.io/internationf173-xmc4e73-prodbc0f-9660/media/Project/ISC2/Main/Media/documents/exam-outlines/2027/EXAMS-CISSP-Exam-Outline-English-RB-Revised-1016-ENU-2.pdf";
export const CISSP_PAGE_URL = "https://www.isc2.org/certifications/cissp/cissp-certification-exam-outline";
const CAT_URL = "https://www.isc2.org/certifications/cissp/cissp-cat";

const src = (title: string, url: string, kind: UnitSource["kind"], recheckBy: string, extra: Partial<UnitSource> = {}): UnitSource => ({
  title,
  ...source(url, kind, CHECKED, recheckBy),
  ...extra,
});

// ---------------------------------------------------------------------------
// ISC2 Certified in Cybersecurity (CC), outline effective 2026-09-01
// ---------------------------------------------------------------------------
const CC_OUTLINE: Record<1 | 2 | 3 | 4 | 5, string[]> = {
  1: [
    "1.1 Understand cybersecurity concepts: confidentiality; integrity; availability; authentication, authorization, accounting (AAA); non-repudiation; privacy",
    "1.2 Understand risk management concepts: risk management lifecycle; risk management processes",
    "1.3 Understand governance concepts: regulations and laws; frameworks and guidelines; policies, standards (e.g., ISO, Center for Internet Security), procedures",
    "1.4 Understand cybersecurity controls: technical controls; administrative controls; physical controls",
    "1.5 Maintain professional and ethical conduct: professional code of conduct; due care and due diligence; the certifying body's code of ethics",
  ],
  2: [
    "2.1 Plan Governance, Risk, and Compliance (GRC): purpose; importance; frameworks and tools",
    "2.2 Understand redundancy: Business Continuity (BC); Disaster Recovery (DR)",
    "2.3 Understand security awareness: organizational culture (e.g., importance of security, security leadership); concepts (e.g., social engineering, password protection, phishing)",
    "2.4 Measure cybersecurity effectiveness: key metrics, Key Risk Indicators (KRI); dashboards, score cards, reports",
  ],
  3: [
    "3.1 Understand identity life cycle management: roles definition; provision; review; deprovision; frameworks and tools",
    "3.2 Understand logical access controls: Principle of Least Privilege (PoLP); Separation of Duties (SoD); access control models",
  ],
  4: [
    "4.1 Understand network security: concepts (e.g., OSI model, TCP/IP model, IPv4, IPv6, VPN); firewalls (e.g., ports, applications); wireless (e.g., Wi-Fi, Bluetooth); embedded systems (e.g., ICS), IoT",
    "4.2 Understand network security architecture: comprehending network segmentation (e.g., firewall zones, VLAN, micro-segmentation); Defense in Depth; Zero Trust (ZT)",
    "4.3 Understand cloud security: characteristics (e.g., broad network access, rapid elasticity, measured service, on-demand self-service, resource pooling); service models; deployment models; shared security model (e.g., roles and responsibilities)",
  ],
  5: [
    "5.1 Understand data security: data handling (e.g., classification, labeling, masking, and sanitization); encryption (e.g., symmetric, asymmetric, hashing, quantum resistant cryptography)",
    "5.2 Understand security operations: logging and monitoring security events; security event triage (e.g., incident use cases, prioritization, correlation); threat actors (e.g., types, motivations); cyber threat intelligence; threat frameworks",
    "5.3 Understand Incident Response (IR): data handling policy implementing Incident Response Plan (IRP); IR exercises (e.g., testing, tabletop)",
    "5.4 Understand asset protection: asset lifecycle management (e.g., End Of Life (EOL) software and devices); configuration and change management",
    "5.5 Understand security testing: security readiness testing (e.g., blue teaming, purple teaming, red teaming); application testing (e.g., vulnerability scanning, static analysis, dynamic analysis, threat modeling); physical penetration testing (e.g., phishing, tailgating, impersonation)",
  ],
};
const CC_DOMAIN_TITLES = {
  1: "Security Principles",
  2: "Security Governance",
  3: "Identity And Access Management (IAM) Concepts",
  4: "Networking and Cloud Security Concepts",
  5: "Security Operations and Incident Response",
} as const;

export const CC_FORMAT_KEY_VALUES = [
  "outline effective September 1, 2026 (footer v01/2026); five domains at average weights 24 / 17.3 / 20 / 21.3 / 17.3 percent",
  "Computerized Adaptive Testing (CAT) in every language; 2 hours; 100-125 items; multiple choice and advanced item types",
  "passing grade 700 out of 1000 points; the certifying body reports pass or fail, not a numeric score, and gives failing candidates per-domain proficiency",
  "each CAT exam includes 25 unscored pretest items; a candidate must answer at least 75 operational and 25 pretest items to receive a result",
  "no item review: once an answer is finalized it cannot be changed",
  "no work experience or degree is required; the certifying body recommends basic IT knowledge",
];

const ccOutline = (d: 1 | 2 | 3 | 4 | 5): UnitSource =>
  src(`ISC2, CC Certification Exam Outline (effective 2026-09-01), Domain ${d}: ${CC_DOMAIN_TITLES[d]}`, CC_OUTLINE_URL, "exam_outline", CC_RECHECK, {
    outline: [...CC_OUTLINE[d]],
  });

export const ISC2_SOURCES = {
  ccFormat: src("ISC2, CC exam outline (CAT examination information) and the CAT FAQ", CC_PAGE_URL, "exam_outline", CC_RECHECK, {
    keyValues: CC_FORMAT_KEY_VALUES,
  }),
  cisspFormat: src("ISC2, CISSP exam outline (CAT examination information, effective 2024-04-15) and the CISSP CAT FAQ", CAT_URL, "exam_outline", CISSP_RECHECK, {
    keyValues: [
      "outline effective April 15, 2024 (footer v9/2024); eight domains at average weights 16 / 10 / 13 / 13 / 13 / 12 / 13 / 10 percent",
      "CAT in English, Chinese, German, Japanese and Spanish; 3 hours maximum; 100-150 items; multiple choice and advanced innovative items",
      "passing grade 700 out of 1000; the certifying body reports pass or fail only, with per-domain proficiency (below, near, above) for failing candidates; the exam is compensatory",
      "25 unscored pretest items in every exam; each next item is chosen so the candidate has about a 50% chance of answering it",
      "after 100 items the exam ends when the ability estimate is above or below the passing standard with 95% confidence; otherwise at 150 items or when time runs out",
      "no item review: a finalized answer cannot be changed",
      "retakes after 30, then 60, then 90 test-free days; at most 4 attempts in 12 months",
      "a new outline takes effect April 15, 2027 (Domain 1 becomes Security Governance and Risk Management; weights 13.6 / 12 / 12.8 / 12.8 / 13.6 / 11.2 / 12.8 / 11.2); teach the 2024 outline until then",
    ],
  }),
  cissp2027: src("ISC2, CISSP Certification Exam Outline effective April 15, 2027 (not yet taught)", CISSP_2027_OUTLINE_URL, "exam_outline", CISSP_RECHECK),
} as const;

export const ISC2CC_TRACK: SeedTrack = {
  code: "ISC2CC",
  title: "Prep for an entry-level cybersecurity certification exam",
  description:
    "Entry-level preparation for a cybersecurity certification exam on the outline effective September 1, 2026: security principles, governance, identity and access management, networking and cloud security, and security operations with incident response, weighted as the exam weights them, with practice for the adaptive (CAT) format. Independently developed exam prep; not affiliated with or endorsed by the organization that owns or administers this exam.",
  trackType: "certification",
  subcategorySlug: ISC2.subcategorySlug,
  freshnessModel: "certification_aligned",
  sourceUrl: CC_PAGE_URL,
  // Set last (verify-common.md), after every unit was compared with the
  // outline read on 2026-11-14.
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: CC_REVIEW_DUE_AT,
  credential: {
    ...ISC2,
    credentialSlug: "certified-in-cybersecurity",
    credentialName: "ISC2 Certified in Cybersecurity (CC)",
    credentialUrl: "https://www.isc2.org/certifications/cc",
    basis: "vendor_exam_unpublished_code",
    examRevision: "CC exam outline effective 2026-09-01 (v01/2026)",
    objectivesRevision: "Five domains, headings 1.1-1.5 / 2.1-2.4 / 3.1-3.2 / 4.1-4.3 / 5.1-5.5",
    versionNote:
      "ISC2 publishes no exam code; the outline is identified by its effective date (September 1, 2026) and the PDF footer v01/2026. It replaced the outline effective October 1, 2025.",
    status: "active",
    effectiveDate: "2026-09-01",
    officialObjectivesUrl: CC_OUTLINE_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "No specific prerequisites: no cybersecurity work experience or degree is required, and the certifying body recommends basic information technology knowledge.",
    durationMinutes: 120,
    questionFormat:
      "Computerized Adaptive Testing (CAT): 100-125 items in up to 2 hours, multiple choice and advanced item types, at a Pearson VUE testing center. Every exam includes 25 unscored pretest items you cannot tell apart, and items cannot be reviewed or changed once answered. (The exam outline effective 2026-09-01 and the adaptive testing FAQ, read 2026-11-14.)",
    passingScorePolicy:
      "700 out of 1000 points. The certifying body reports pass or fail rather than a score; failing candidates see their proficiency per domain. You must answer at least 75 scored and 25 pretest items within the time to receive a result. Retakes after 30, 60, then 90 test-free days, at most 4 attempts in 12 months.",
    publishedWeightsNote:
      "ISC2 prints the CC average weights as 24, 17.3, 20, 21.3 and 17.3 percent with 'Total: 100%'; the five numbers add to 99.9, kept exactly as printed (outline effective 2026-09-01).",
  },
  units: [
    {
      title: CC_DOMAIN_TITLES[1],
      rangeLabel: "24% of the exam (average weight)",
      weight: 24,
      gate: "Given a short workplace scenario, name the security property at stake (confidentiality, integrity, availability, authentication, non-repudiation or privacy), assess the risk against the organization's tolerance, choose a treatment and a mix of technical, administrative and physical controls, and say which canon of the certifying body's code of ethics applies to the people involved.",
      sources: [ccOutline(1), ISC2_SOURCES.ccFormat],
      objectives: [
        // 1.1
        "Apply confidentiality, integrity and availability to decide which property a control protects or an incident harms",
        "Distinguish authentication, authorization and accounting (AAA), and choose authentication factors and multi-factor authentication for a system",
        "Explain non-repudiation and privacy, and how digital signatures, audit logs and data minimization support them",
        // 1.2
        "Walk through the risk management lifecycle: identify, assess, treat (avoid, mitigate, transfer, accept) and monitor risk",
        "Assess a risk by its likelihood and impact against the organization's risk tolerance, and choose a treatment",
        // 1.3
        "Distinguish laws and regulations, frameworks and guidelines, and an organization's policies, standards and procedures, including how ISO and CIS publications are used",
        // 1.4
        "Classify controls as technical, administrative or physical, and select a combination of them for a given risk",
        // 1.5
        "Apply the certifying body's code of ethics canons, due care and due diligence to a workplace dilemma",
      ],
    },
    {
      title: CC_DOMAIN_TITLES[2],
      rangeLabel: "17.3% of the exam (average weight)",
      weight: 17.3,
      gate: "Given a small organization, plan how governance, risk and compliance fit together, set recovery objectives and the redundancy that meets them, design an awareness effort that reaches the culture and not only the slides, and choose the metrics and key risk indicators you would report to leadership.",
      sources: [ccOutline(2), ISC2_SOURCES.ccFormat],
      objectives: [
        // 2.1
        "Plan governance, risk and compliance (GRC): its purpose, why it matters, and the frameworks and tools that support it",
        // 2.2
        "Distinguish business continuity from disaster recovery, and interpret recovery objectives -- recovery time objective (RTO), recovery point objective (RPO) and maximum tolerable downtime -- for a system",
        "Design redundancy for a service: backups, alternate sites and failover matched to its recovery objectives",
        // 2.3
        "Build a security culture: leadership support, and awareness of social engineering, phishing and password protection",
        // 2.4
        "Choose key metrics and key risk indicators (KRIs) to measure cybersecurity effectiveness, and present them through dashboards, scorecards and reports",
      ],
    },
    {
      title: CC_DOMAIN_TITLES[3],
      rangeLabel: "20% of the exam (average weight)",
      weight: 20,
      gate: "Given a joiner, a mover and a leaver, take each identity through role definition, provisioning, review and deprovisioning; apply least privilege and separation of duties to their requests; and choose the access control model that fits the organization.",
      sources: [ccOutline(3), ISC2_SOURCES.ccFormat],
      objectives: [
        // 3.1
        "Manage the identity life cycle: define roles, provision, review and deprovision access",
        "Use identity frameworks and tools -- directories, single sign-on, federation and identity governance -- to automate the identity life cycle",
        // 3.2
        "Apply the principle of least privilege and separation of duties to an access request",
        "Compare access control models -- discretionary (DAC), mandatory (MAC), role-based (RBAC), rule-based and attribute-based (ABAC) -- and choose one for a scenario",
        "Recognize access risks: privilege creep, orphaned accounts, and shared and service accounts",
      ],
    },
    {
      title: CC_DOMAIN_TITLES[4],
      rangeLabel: "21.3% of the exam (average weight)",
      weight: 21.3,
      gate: "Given a small network diagram with a cloud service in it, place each device and flow on the OSI and TCP/IP models, write the firewall rules and segments that contain it, show where zero trust and defense in depth apply, and assign each security task to the customer or the cloud provider.",
      sources: [ccOutline(4), ISC2_SOURCES.ccFormat],
      objectives: [
        // 4.1
        "Explain the OSI and TCP/IP models, IPv4 and IPv6 addressing, and common ports and protocols",
        "Configure firewall rules by port and application, and explain how a virtual private network (VPN) protects traffic",
        "Secure wireless networks (Wi-Fi, Bluetooth) and embedded systems such as industrial control systems (ICS) and Internet of Things (IoT) devices",
        // 4.2
        "Design network segmentation with firewall zones, VLANs and micro-segmentation, and layer controls for defense in depth",
        "Apply zero trust: verify every request explicitly, grant least privilege, and assume breach",
        // 4.3
        "Describe the five essential cloud characteristics: on-demand self-service, broad network access, resource pooling, rapid elasticity and measured service",
        "Choose a cloud service model (IaaS, PaaS, SaaS) and deployment model (public, private, community, hybrid), and assign security responsibilities under the shared responsibility model",
      ],
    },
    {
      title: CC_DOMAIN_TITLES[5],
      rangeLabel: "17.3% of the exam (average weight)",
      weight: 17.3,
      gate: "Given a burst of security events, triage them by use case and priority, decide which is an incident, follow the incident response plan's first steps, protect the data involved with the right handling and encryption, and say which kind of security test would have found the weakness first.",
      sources: [ccOutline(5), ISC2_SOURCES.ccFormat],
      objectives: [
        // 5.1
        "Classify, label, mask and sanitize data through its life, and choose a sanitization method for storage media",
        "Choose encryption for a need: symmetric, asymmetric, hashing, and quantum-resistant algorithms",
        // 5.2
        "Monitor and log security events, and triage them by incident use case, priority and correlation",
        "Recognize threat actor types and motivations, and use cyber threat intelligence and threat frameworks such as MITRE ATT&CK",
        // 5.3
        "Implement an incident response plan and test it with exercises such as tabletops",
        // 5.4
        "Protect assets through their life cycle, including end-of-life software and devices, with configuration and change management",
        // 5.5
        "Compare security testing: red, blue and purple teaming; vulnerability scanning, static and dynamic analysis and threat modeling; and physical tests such as phishing, tailgating and impersonation",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CISSP, outline effective 2024-04-15
// ---------------------------------------------------------------------------
const CISSP_OUTLINE: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, string[]> = {
  1: [
    "1.1 Understand, adhere to, and promote professional ethics: the certifying body's code of professional ethics; organizational code of ethics",
    "1.2 Understand and apply security concepts: confidentiality, integrity, and availability, authenticity, and nonrepudiation (5 Pillars of Information Security)",
    "1.3 Evaluate and apply security governance principles: alignment of the security function to business strategy, goals, mission, and objectives; organizational processes; organizational roles and responsibilities; security control frameworks (e.g., ISO, NIST, COBIT, SABSA, PCI, FedRAMP); due care/due diligence",
    "1.4 Understand legal, regulatory, and compliance issues that pertain to information security in a holistic context: cybercrimes and data breaches; licensing and intellectual property requirements; import/export controls; transborder data flow; issues related to privacy (e.g., GDPR, California Consumer Privacy Act, Personal Information Protection Law, Protection of Personal Information Act); contractual, legal, industry standards, and regulatory requirements",
    "1.5 Understand requirements for investigation types (i.e., administrative, criminal, civil, regulatory, industry standards)",
    "1.6 Develop, document, and implement security policy, standards, procedures, and guidelines",
    "1.7 Identify, analyze, assess, prioritize, and implement Business Continuity (BC) requirements: business impact analysis (BIA); external dependencies",
    "1.8 Contribute to and enforce personnel security policies and procedures: candidate screening and hiring; employment agreements and policy driven requirements; onboarding, transfers, and termination processes; vendor, consultant, and contractor agreements and controls",
    "1.9 Understand and apply risk management concepts: threat and vulnerability identification; risk analysis, assessment, and scope; risk response and treatment (e.g., cybersecurity insurance); applicable types of controls; control assessments; continuous monitoring and measurement; reporting; continuous improvement; risk frameworks",
    "1.10 Understand and apply threat modeling concepts and methodologies",
    "1.11 Apply supply chain risk management (SCRM) concepts: risks associated with the acquisition of products and services from suppliers and providers (e.g., product tampering, counterfeits, implants); risk mitigations (e.g., third-party assessment and monitoring, minimum security requirements, service level requirements, silicon root of trust, physically unclonable function, software bill of materials)",
    "1.12 Establish and maintain a security awareness, education, and training program: methods and techniques; periodic content reviews to include emerging technologies and trends; program effectiveness evaluation",
  ],
  2: [
    "2.1 Identify and classify information and assets: data classification; asset classification",
    "2.2 Establish information and asset handling requirements",
    "2.3 Provision information and assets securely: information and asset ownership; asset inventory (e.g., tangible, intangible); asset management",
    "2.4 Manage data lifecycle: data roles (i.e., owners, controllers, custodians, processors, users/subjects); data collection; data location; data maintenance; data retention; data remanence; data destruction",
    "2.5 Ensure appropriate asset retention (e.g., End of Life (EOL), End of Support)",
    "2.6 Determine data security controls and compliance requirements: data states (e.g., in use, in transit, at rest); scoping and tailoring; standards selection; data protection methods (e.g., DRM, DLP, CASB)",
  ],
  3: [
    "3.1 Research, implement and manage engineering processes using secure design principles: threat modeling; least privilege; defense in depth; secure defaults; fail securely; segregation of duties; keep it simple and small; zero trust or trust but verify; privacy by design; shared responsibility; secure access service edge",
    "3.2 Understand the fundamental concepts of security models (e.g., Biba, Star Model, Bell-LaPadula)",
    "3.3 Select controls based upon systems security requirements",
    "3.4 Understand security capabilities of Information Systems (IS) (e.g., memory protection, Trusted Platform Module (TPM), encryption/decryption)",
    "3.5 Assess and mitigate the vulnerabilities of security architectures, designs, and solution elements: client-based, server-based, database, cryptographic, ICS, cloud-based, distributed, IoT, microservices, containerization, serverless, embedded, high-performance computing, edge computing, virtualized systems",
    "3.6 Select and determine cryptographic solutions: cryptographic life cycle; cryptographic methods (e.g., symmetric, asymmetric, elliptic curves, quantum); public key infrastructure (PKI); key management practices; digital signatures and digital certificates",
    "3.7 Understand methods of cryptanalytic attacks: brute force; ciphertext only; known plaintext; frequency analysis; chosen ciphertext; implementation attacks; side-channel; fault injection; timing; man-in-the-middle (MITM); pass the hash; Kerberos exploitation; ransomware",
    "3.8 Apply security principles to site and facility design",
    "3.9 Design site and facility security controls: wiring closets/intermediate distribution facilities; server rooms/data centers; media storage facilities; evidence storage; restricted and work area security; utilities and HVAC; environmental issues; fire prevention, detection, and suppression; power",
    "3.10 Manage the information system lifecycle: stakeholders needs and requirements; requirements analysis; architectural design; development/implementation; integration; verification and validation; transition/deployment; operations and maintenance/sustainment; retirement/disposal",
  ],
  4: [
    "4.1 Apply secure design principles in network architectures: OSI and TCP/IP models; IPv4 and IPv6; secure protocols (e.g., IPSec, SSH, SSL/TLS); multilayer protocols; converged protocols; transport architecture; performance metrics; traffic flows (north-south, east-west); physical segmentation; logical segmentation; micro-segmentation; edge networks; wireless networks; cellular/mobile networks; content distribution networks; software defined networks; virtual private cloud; monitoring and management",
    "4.2 Secure network components: operation of infrastructure; transmission media; Network Access Control (NAC) systems; endpoint security",
    "4.3 Implement secure communication channels according to design: voice, video, and collaboration; remote access; data communications; third-party connectivity",
  ],
  5: [
    "5.1 Control physical and logical access to assets: information; systems; devices; facilities; applications; services",
    "5.2 Design identification and authentication strategy (e.g., people, devices, and services): groups and roles; AAA (e.g., MFA, password-less authentication); session management; registration, proofing, and establishment of identity; Federated Identity Management (FIM); credential management systems; single sign-on (SSO); Just-In-Time",
    "5.3 Federated identity with a third-party service: on-premises; cloud; hybrid",
    "5.4 Implement and manage authorization mechanisms: RBAC; rule-based access control; MAC; DAC; ABAC; risk-based access control; access policy enforcement (e.g., policy decision point, policy enforcement point)",
    "5.5 Manage the identity and access provisioning lifecycle: account access review; provisioning and deprovisioning; role definition and transition; privilege escalation; service accounts management",
    "5.6 Implement authentication systems",
  ],
  6: [
    "6.1 Design and validate assessment, test, and audit strategies: internal; external; third-party; location (e.g., on-premise, cloud, hybrid)",
    "6.2 Conduct security control testing: vulnerability assessment; penetration testing (e.g., red, blue, and/or purple team exercises); log reviews; synthetic transactions/benchmarks; code review and testing; misuse case testing; coverage analysis; interface testing; breach attack simulations; compliance checks",
    "6.3 Collect security process data (e.g., technical and administrative): account management; management review and approval; key performance and risk indicators; backup verification data; training and awareness; disaster recovery (DR) and Business Continuity (BC)",
    "6.4 Analyze test output and generate report: remediation; exception handling; ethical disclosure",
    "6.5 Conduct or facilitate security audits: internal; external; third-party; location",
  ],
  7: [
    "7.1 Understand and comply with investigations: evidence collection and handling; reporting and documentation; investigative techniques; digital forensics tools, tactics, and procedures; artifacts",
    "7.2 Conduct logging and monitoring activities: intrusion detection and prevention (IDPS); SIEM; continuous monitoring and tuning; egress monitoring; log management; threat intelligence; UEBA",
    "7.3 Perform configuration management (CM) (e.g., provisioning, baselining, automation)",
    "7.4 Apply foundational security operations concepts: need-to-know/least privilege; segregation of duties and responsibilities; privileged account management; job rotation; service-level agreements",
    "7.5 Apply resource protection: media management; media protection techniques; data at rest/data in transit",
    "7.6 Conduct incident management: detection; response; mitigation; reporting; recovery; remediation; lessons learned",
    "7.7 Operate and maintain detection and preventative measures: firewalls; IDS and IPS; whitelisting/blacklisting; third-party provided security services; sandboxing; honeypots/honeynets; anti-malware; machine learning and AI based tools",
    "7.8 Implement and support patch and vulnerability management",
    "7.9 Understand and participate in change management processes",
    "7.10 Implement recovery strategies: backup storage strategies; recovery site strategies; multiple processing sites; system resilience, high availability, QoS, and fault tolerance",
    "7.11 Implement disaster recovery (DR) processes: response; personnel; communications; assessment; restoration; training and awareness; lessons learned",
    "7.12 Test disaster recovery plans (DRP): read-through/tabletop; walkthrough; simulation; parallel; full interruption; communications",
    "7.13 Participate in Business Continuity (BC) planning and exercises",
    "7.14 Implement and manage physical security: perimeter security controls; internal security controls",
    "7.15 Address personnel safety and security concerns: travel; security training and awareness (e.g., insider threat, social media impacts, 2FA fatigue); emergency management; duress",
  ],
  8: [
    "8.1 Understand and integrate security in the Software Development Life Cycle (SDLC): development methodologies; maturity models (e.g., CMM, SAMM); operation and maintenance; change management; integrated product team",
    "8.2 Identify and apply security controls in software development ecosystems: programming languages; libraries; tool sets; IDE; runtime; CI/CD; software configuration management; code repositories; application security testing (e.g., SAST, DAST, software composition analysis, IAST)",
    "8.3 Assess the effectiveness of software security: auditing and logging of changes; risk analysis and mitigation",
    "8.4 Assess security impact of acquired software: COTS; open source; third-party; managed services; cloud services",
    "8.5 Define and apply secure coding guidelines and standards: security weaknesses and vulnerabilities at the source-code level; security of APIs; secure coding practices; software-defined security",
  ],
};
const CISSP_DOMAIN_TITLES = {
  1: "Security and Risk Management",
  2: "Asset Security",
  3: "Security Architecture and Engineering",
  4: "Communication and Network Security",
  5: "Identity and Access Management (IAM)",
  6: "Security Assessment and Testing",
  7: "Security Operations",
  8: "Software Development Security",
} as const;
type CisspDomain = keyof typeof CISSP_DOMAIN_TITLES;

const cisspOutline = (d: CisspDomain): UnitSource =>
  src(`ISC2, CISSP Certification Exam Outline (effective 2024-04-15), Domain ${d}: ${CISSP_DOMAIN_TITLES[d]}`, CISSP_OUTLINE_URL, "exam_outline", CISSP_RECHECK, {
    outline: [...CISSP_OUTLINE[d]],
  });
const cisspSources = (d: CisspDomain): UnitSource[] => [cisspOutline(d), ISC2_SOURCES.cisspFormat, ISC2_SOURCES.cissp2027];

const CISSP_WEIGHTS: Record<CisspDomain, number> = { 1: 16, 2: 10, 3: 13, 4: 13, 5: 13, 6: 12, 7: 13, 8: 10 };
const cisspUnit = (d: CisspDomain, gate: string, objectives: string[]) => ({
  title: CISSP_DOMAIN_TITLES[d],
  rangeLabel: `${CISSP_WEIGHTS[d]}% of the exam (average weight)`,
  weight: CISSP_WEIGHTS[d],
  gate,
  sources: cisspSources(d),
  objectives,
});

export const CISSP_TRACK: SeedTrack = {
  code: "CISSP",
  title: "Prep for an advanced information security professional certification exam",
  description:
    "Preparation for an advanced information security professional certification exam on the outline effective April 15, 2024: all eight domains weighted as the exam weights them, taught from a manager's and architect's view of risk, with practice for the adaptive (CAT) format. The outline is replaced on April 15, 2027; this course is reviewed before then. Independently developed exam prep; not affiliated with or endorsed by the organization that owns or administers this exam.",
  trackType: "certification",
  subcategorySlug: ISC2.subcategorySlug,
  freshnessModel: "certification_aligned",
  sourceUrl: CISSP_PAGE_URL,
  // Set last (verify-common.md), after every unit was compared with the
  // outline read on 2026-11-14.
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: CISSP_REVIEW_DUE_AT,
  credential: {
    ...ISC2,
    credentialSlug: "cissp",
    credentialName: "Certified Information Systems Security Professional (CISSP)",
    credentialUrl: "https://www.isc2.org/certifications/cissp",
    basis: "vendor_exam_unpublished_code",
    examRevision: "CISSP exam outline effective 2024-04-15 (v9/2024)",
    objectivesRevision: "Eight domains, numbered headings 1.1-1.12 through 8.1-8.5",
    versionNote:
      "ISC2 publishes no exam code; the outline is identified by its effective date (April 15, 2024) and the PDF footer v9/2024. A new outline takes effect April 15, 2027; this course teaches the current one and is due for review by 2027-01-15.",
    status: "active",
    effectiveDate: "2024-04-15",
    officialObjectivesUrl: CISSP_OUTLINE_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Five years of cumulative, full-time experience in two or more of the eight domains; a relevant bachelor's or master's degree, or a credential on the certifying body's approved list, can satisfy one year. Part-time work and internships can count. Passing without the experience makes you an associate of the certifying body, with six years to earn it.",
    durationMinutes: 180,
    questionFormat:
      "Computerized Adaptive Testing (CAT) in English: 100-150 items in up to 3 hours, multiple choice and advanced innovative items, at authorized Pearson VUE centers. Every exam includes 25 unscored pretest items; each next item is chosen so you have about a 50% chance of answering it, and answers cannot be reviewed or changed once finalized. (The exam outline effective 2024-04-15 and the adaptive testing FAQ, read 2026-11-14.)",
    passingScorePolicy:
      "700 out of 1000 points. The exam ends after 100 items once your ability estimate is above or below the passing standard with 95% confidence, otherwise at 150 items or when time runs out; the certifying body reports pass or fail only, with per-domain proficiency for failing candidates. Retakes after 30, 60, then 90 test-free days, at most 4 attempts in 12 months.",
  },
  units: [
    cisspUnit(
      1,
      "Given a business decision with security consequences -- an acquisition, a new privacy law, a supplier, a cut budget -- frame it in the organization's goals, name the laws, frameworks and ethics in play, quantify or rank the risk, choose a treatment the business can own, and say what you would tell the board.",
      [
        // 1.1
        "Apply the certifying body's code of professional ethics and an organizational code of ethics to a professional dilemma",
        // 1.2
        "Apply the five pillars -- confidentiality, integrity, availability, authenticity and nonrepudiation -- to a business need",
        // 1.3
        "Evaluate security governance: alignment with business strategy and mission, organizational processes such as acquisitions and divestitures, roles and responsibilities, control frameworks (ISO, NIST, COBIT, SABSA, PCI, FedRAMP), and due care and due diligence",
        // 1.4
        "Analyze legal, regulatory and compliance issues: cybercrime and data breaches, licensing and intellectual property, import/export controls, transborder data flow, and privacy laws such as the GDPR and the California Consumer Privacy Act",
        // 1.5
        "Distinguish administrative, criminal, civil, regulatory and industry-standard investigations and the evidence each requires",
        // 1.6
        "Develop, document and implement security policy, standards, procedures and guidelines",
        // 1.7
        "Prioritize business continuity requirements from a business impact analysis, including external dependencies",
        // 1.8
        "Apply personnel security: candidate screening, employment agreements, onboarding, transfers and termination, and vendor, consultant and contractor controls",
        // 1.9
        "Assess and treat risk: threat and vulnerability identification, qualitative and quantitative risk analysis, risk response including cyber insurance, control types and assessments, monitoring, reporting and risk frameworks",
        "Calculate quantitative risk with asset value, exposure factor, single loss expectancy (SLE), annualized rate of occurrence (ARO) and annualized loss expectancy (ALE), and judge whether a control is worth its cost",
        // 1.10
        "Apply threat modeling methodologies such as STRIDE, PASTA and attack trees",
        // 1.11
        "Manage supply chain risk: tampering, counterfeits and implants, and mitigations such as third-party assessment, minimum security requirements, silicon root of trust, physically unclonable functions and software bills of materials",
        // 1.12
        "Establish and evaluate a security awareness, education and training program, including phishing exercises, security champions, gamification and reviews for emerging technology",
      ]
    ),
    cisspUnit(
      2,
      "Given a data set and the systems it lives on, classify it, name its owner, controller, custodian and processor, set handling and retention rules through to destruction, and choose the controls for it at rest, in transit and in use.",
      [
        // 2.1
        "Classify information and assets by value and sensitivity",
        // 2.2
        "Establish information and asset handling requirements: marking, storage, transmission and access",
        // 2.3
        "Provision information and assets securely: ownership, inventory of tangible and intangible assets, and asset management",
        // 2.4
        "Manage the data life cycle and data roles -- owners, controllers, custodians, processors, users and subjects -- from collection and location through maintenance, retention, remanence and destruction",
        // 2.5
        "Ensure appropriate asset retention, including end-of-life and end-of-support assets",
        // 2.6
        "Determine data security controls for data at rest, in transit and in use: scoping and tailoring, standards selection, and digital rights management (DRM), data loss prevention (DLP) and cloud access security brokers (CASB)",
      ]
    ),
    cisspUnit(
      3,
      "Given a system design, find where it breaks a secure design principle, pick the security model and controls its requirements call for, choose the cryptography and key management it needs and the attacks they must resist, and design the physical protections for where it runs.",
      [
        // 3.1
        "Apply secure design principles: threat modeling, least privilege, defense in depth, secure defaults, fail securely, separation of duties, keep it simple, zero trust, privacy by design, shared responsibility and secure access service edge",
        // 3.2
        "Interpret security models such as Bell-LaPadula (confidentiality) and Biba (integrity), including their star properties",
        // 3.3, 3.4
        "Select controls from a system's security requirements, and explain information system security capabilities such as memory protection, the Trusted Platform Module and encryption",
        // 3.5
        "Assess and mitigate vulnerabilities in client, server, database, cryptographic, industrial control, cloud, distributed, IoT, microservice, container, serverless, embedded, high-performance, edge and virtualized systems",
        // 3.6
        "Select cryptographic solutions: the cryptographic life cycle, symmetric, asymmetric, elliptic-curve and quantum methods, public key infrastructure, key management, and digital signatures and certificates",
        // 3.7
        "Recognize cryptanalytic attacks: brute force, ciphertext-only, known-plaintext, frequency analysis, chosen-ciphertext, implementation, side-channel, fault injection, timing, man-in-the-middle, pass the hash, Kerberos exploitation and ransomware",
        // 3.8, 3.9
        "Design site and facility security: wiring closets, server rooms and data centers, media and evidence storage, restricted work areas, utilities and HVAC, environmental threats, fire prevention, detection and suppression, and power",
        // 3.10
        "Manage the information system life cycle from stakeholder requirements through design, development, integration, verification and validation, deployment, operations and retirement",
      ]
    ),
    cisspUnit(
      4,
      "Given a network that must carry voice, remote access and a partner connection, place its protocols on the OSI and TCP/IP models, choose secure protocols and segmentation for its north-south and east-west traffic, secure its components and wireless and cloud edges, and say what you would monitor.",
      [
        // 4.1
        "Apply secure design principles to network architecture: the OSI and TCP/IP models, IPv4 and IPv6, secure protocols (IPsec, SSH, TLS), and multilayer and converged protocols",
        "Design network segmentation -- physical, logical (VLANs, VPNs, virtual routing and forwarding) and micro-segmentation -- and control north-south and east-west traffic",
        "Secure wireless, cellular, edge, content distribution, software-defined and virtual private cloud networks, and monitor them for performance and faults",
        // 4.2
        "Secure network components: infrastructure operation, transmission media, network access control and endpoint security",
        // 4.3
        "Implement secure communication channels for voice, video and collaboration, remote access, data communications and third-party connectivity",
      ]
    ),
    cisspUnit(
      5,
      "Given a workforce, customers and services that need access, design the identification and authentication strategy, choose the authorization model and where policy is decided and enforced, federate with a partner, and run the provisioning life cycle so access stays least-privilege.",
      [
        // 5.1
        "Control physical and logical access to information, systems, devices, facilities, applications and services",
        // 5.2
        "Design an identification and authentication strategy: groups and roles, AAA with multi-factor and passwordless authentication, session management, registration and identity proofing, federated identity, credential management, single sign-on and just-in-time access",
        // 5.3
        "Implement federated identity with a third-party service on premises, in the cloud and in hybrid environments",
        // 5.4
        "Choose and implement authorization mechanisms: role-based, rule-based, mandatory, discretionary, attribute-based and risk-based access control, with policy decision and enforcement points",
        // 5.5
        "Manage the identity and access provisioning life cycle: access reviews, provisioning and deprovisioning, role transitions, privilege escalation and service accounts",
        // 5.6
        "Implement authentication systems such as Kerberos, SAML, OpenID Connect and OAuth-based authorization",
      ]
    ),
    cisspUnit(
      6,
      "Given a system about to go live, design the assessment and audit strategy, select the tests that fit each risk, decide which process data proves controls keep working, and turn findings into a report with remediation, exceptions and responsible disclosure.",
      [
        // 6.1
        "Design and validate assessment, test and audit strategies: internal, external and third-party, on premises, in the cloud and hybrid",
        // 6.2
        "Select security control tests: vulnerability assessment, penetration testing with red, blue and purple teams, log reviews, synthetic transactions, code review, misuse case testing, coverage analysis, interface testing, breach attack simulation and compliance checks",
        // 6.3
        "Collect security process data: account management, management review and approval, key performance and risk indicators, backup verification, training and awareness, and disaster recovery and business continuity data",
        // 6.4
        "Analyze test output and write the report: remediation, exception handling and ethical disclosure",
        // 6.5
        "Conduct or facilitate internal, external and third-party security audits",
      ]
    ),
    cisspUnit(
      7,
      "Given an incident that turns into an outage, run detection, response and evidence handling, decide what the monitoring should have caught, choose the recovery site and backup strategy that meets the business's recovery objectives, and plan how the disaster recovery plan will be tested.",
      [
        // 7.1
        "Support investigations: evidence collection and handling, reporting, investigative techniques, digital forensics tools and artifacts",
        // 7.2
        "Monitor with intrusion detection and prevention, SIEM, continuous monitoring and tuning, egress monitoring, log management, threat intelligence and user and entity behavior analytics",
        // 7.3, 7.4
        "Apply configuration management and foundational operations concepts: need-to-know and least privilege, separation of duties, privileged account management, job rotation and service-level agreements",
        // 7.5
        "Protect resources: media management and protection, and data at rest and in transit",
        // 7.6
        "Manage incidents through detection, response, mitigation, reporting, recovery, remediation and lessons learned",
        // 7.7
        "Operate detective and preventive measures: firewalls, IDS and IPS, allow and deny lists, third-party security services, sandboxing, honeypots, anti-malware and AI-based tools",
        // 7.8, 7.9
        "Implement patch and vulnerability management and take part in change management",
        // 7.10
        "Implement recovery strategies: backup storage, hot, warm and cold recovery sites, multiple processing sites, high availability and fault tolerance",
        // 7.11, 7.12
        "Implement disaster recovery processes and test the plan with read-throughs, walkthroughs, simulations, parallel tests and full interruption tests",
        // 7.13
        "Participate in business continuity planning and exercises",
        // 7.14, 7.15
        "Implement physical security and address personnel safety: travel, insider threat and social media awareness, emergency management and duress",
      ]
    ),
    cisspUnit(
      8,
      "Given a product team's pipeline and the software it buys, place security in each SDLC phase, choose the tests and controls for its tools, code and dependencies, assess what acquired and cloud software brings in, and set the secure coding standards the team will be held to.",
      [
        // 8.1
        "Integrate security into the software development life cycle across Agile, Waterfall, DevOps, DevSecOps and scaled agile, using maturity models such as CMM and SAMM, change management and integrated product teams",
        // 8.2
        "Apply security controls in development ecosystems: languages, libraries, tool sets, IDEs, runtimes, CI/CD, configuration management, code repositories, and SAST, DAST, software composition analysis and IAST",
        // 8.3
        "Assess the effectiveness of software security through change auditing and logging and risk analysis",
        // 8.4
        "Assess the security impact of acquired software: commercial off-the-shelf, open source, third-party, managed services and cloud services",
        // 8.5
        "Define and apply secure coding guidelines: source-level weaknesses, API security, secure coding practices and software-defined security",
      ]
    ),
  ],
};

export const ISC2_TRACKS: readonly SeedTrack[] = [ISC2CC_TRACK, CISSP_TRACK];
