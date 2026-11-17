// REQ-273 (Nick, 2026-11-14): EC-Council Certified Ethical Hacker (CEH),
// part of the non-CompTIA security wave (REQ-270 to REQ-274; header of
// tracks/isc2.ts). Same shape as PENTESTPLUS: an offensive-security course
// whose every lab is framed as authorized testing in a lab you own.
//
// What was read, and when (all 2026-11-14, on EC-Council's own sites):
//   - CEH certification page, https://cert.eccouncil.org/certified-ethical-hacker.html
//     (fetched as HTML, read as text): exam 312-50 at the ECC Exam Centre
//     and Pearson VUE; 4 hours; 125 questions; multiple choice; cut scores
//     set per exam form "can range from 60% to 85%"; eligibility through
//     official training, or two years of information security work
//     experience with an application (USD 100 fee). Links "Blue Print" to
//     the PDF below.
//   - CEH Exam Blueprint v5.0, https://cert.eccouncil.org/wp-content/uploads/2024/04/CEH-Exam-Blueprint-v5.pdf
//     (read in full as text): 9 domains, 20 sub-domains with their topic
//     headings and question counts (7 / 21 / 19 / 30 / 18 / 6 / 12 / 6 / 6 =
//     125) and weights 6 / 17 / 15 / 24 / 14 / 5 / 10 / 5 / 5, which add to
//     101 as printed (each is the question count over 125, rounded). The
//     blueprint names no CEH version.
//   - CEH v13 course page, https://www.eccouncil.org/train-certify/certified-ethical-hacker-ceh/
//     (read as text): "Currently on Version 13"; "Structured across 20
//     learning modules" (the blueprint's 20 sub-domains), with AI-driven
//     ethical hacking added to module 1's topics; the knowledge exam is "a
//     4-hour exam with 125 multiple-choice questions"; versions are released
//     "every 12-18 months". So this course teaches v13 on blueprint v5.0, and
//     its review is due in three months (2027-02-14) rather than six, because
//     a v14 could be announced at any time.
//   - EC-Council trademark list, https://www.eccouncil.org/legal/trademarks/
//     (first read through a summarizing fetch, then re-read as the raw page
//     text the same day): "CEH®" and "Certified Ethical
//     Hacker®" are registered trademarks of EC-Council; "no rights or
//     licenses are granted or implied without EC-Council's prior written
//     permission". Descriptive title and an independence notice (REQ-194
//     pattern); the use is a decision for Nick. Not legal advice.
//
// Objectives are our own wording; each unit's `outline` carries the
// blueprint's sub-domain names and topic headings (headings only).
// Defensive framing as PENTESTPLUS: objectives pair each attack with its
// detection or countermeasure, and labs never target systems the learner
// does not own or have written permission to test.

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
const REVIEW_DUE_AT = "2027-02-14T00:00:00Z";
const RECHECK = "2027-02-14";

export const CEH_BLUEPRINT_URL = "https://cert.eccouncil.org/wp-content/uploads/2024/04/CEH-Exam-Blueprint-v5.pdf";
export const CEH_CERT_URL = "https://cert.eccouncil.org/certified-ethical-hacker.html";
const CEH_COURSE_URL = "https://www.eccouncil.org/train-certify/certified-ethical-hacker-ceh/";

const src = (title: string, url: string, kind: UnitSource["kind"], extra: Partial<UnitSource> = {}): UnitSource => ({
  title,
  ...source(url, kind, CHECKED, RECHECK),
  ...extra,
});

const CEH_OUTLINE: Record<number, string[]> = {
  1: [
    "Introduction to Ethical Hacking: Information Security Overview; Hacking Methodologies and Frameworks; Hacking Concepts; Ethical Hacking Concepts; Information Security Controls; Information Security Laws and Standards",
  ],
  2: [
    "Footprinting and Reconnaissance: Footprinting Concepts; Footprinting Methodology; Footprinting through Search Engines; Footprinting through Web Services; Footprinting through Social Networking Sites; Website Footprinting; Email Footprinting; Whois Footprinting; DNS Footprinting; Network Footprinting; Footprinting through Social Engineering; Footprinting Tools; Footprinting Countermeasures",
    "Scanning Networks: Network Scanning Concepts; Scanning Tools; Host Discovery; Port and Service Discovery; OS Discovery (Banner Grabbing/OS Fingerprinting); Scanning Beyond IDS and Firewall; Network Scanning Countermeasures",
    "Enumeration: Enumeration Concepts; NetBIOS Enumeration; SNMP Enumeration; LDAP Enumeration; NTP and NFS Enumeration; SMTP and DNS Enumeration; Other Enumeration Techniques (IPsec, VoIP, RPC, Unix/Linux, Telnet, FTP, TFTP, SMB, IPv6, and BGP enumeration); Enumeration Countermeasures",
  ],
  3: [
    "Vulnerability Analysis: Vulnerability Assessment Concepts; Vulnerability Classification and Assessment Types; Vulnerability Assessment Tools; Vulnerability Assessment Reports",
    "System Hacking: System Hacking Concepts; Gaining Access; Password Cracking; Vulnerability Exploitation; Escalating Privileges; Maintaining Access; Executing Applications; Hiding Files; Establishing Persistence; Clearing Logs",
    "Malware Threats: Malware Concepts; APT Concepts; Trojan Concepts; Virus and Worm Concepts; Fileless Malware Concepts; Malware Analysis; Malware Countermeasures; Anti-Malware Software",
  ],
  4: [
    "Sniffing: Sniffing Concepts; Sniffing Technique: MAC Attacks; Sniffing Technique: DHCP Attacks; Sniffing Technique: ARP Poisoning; Sniffing Technique: Spoofing Attacks; Sniffing Technique: DNS Poisoning; Sniffing Tools; Sniffing Countermeasures; Sniffing Detection Techniques",
    "Social Engineering: Social Engineering Concepts; Social Engineering Techniques; Insider Threats; Impersonation on Social Networking Sites; Identity Theft; Social Engineering Countermeasures",
    "Denial-of-Service: DoS/DDoS Concepts; Botnets; DoS/DDoS Attack Techniques; DDoS Case Study; DoS/DDoS Attack Countermeasures; DoS/DDoS Protection Tools",
    "Session Hijacking: Session Hijacking Concepts; Application-Level Session Hijacking; Network-Level Session Hijacking; Session Hijacking Tools; Session Hijacking Countermeasures",
    "Evading IDS, Firewalls, and Honeypots: IDS, IPS, Firewall, and Honeypot Concepts; IDS, IPS, Firewall, and Honeypot Solutions; Evading IDS; Evading Firewalls; Evading NAC and Endpoint Security; IDS/Firewall Evading Tools; Detecting Honeypots; IDS/Firewall Evasion Countermeasures",
  ],
  5: [
    "Hacking Web Servers: Web Server Concepts; Web Server Attacks; Web Server Attack Methodology; Web Server Attack Countermeasures; Patch Management",
    "Hacking Web Applications: Web App Concepts; Web App Threats; Web App Hacking Methodology; Footprint Web Infrastructure; Analyze Web Applications; Bypass Client-Side Controls; Attack Authentication Mechanism; Attack Authorization Schemes; Attack Access Controls; Attack Session Management Mechanism; Perform Injection/Input Validation Attacks; Attack Application Logic Flaws; Attack Shared Environments; Attack Database Connectivity; Attack Web App Client; Attack Web Services; Web API, Webhooks, and Web Shell; Web App Security",
    "SQL Injection: SQL Injection Concepts; Types of SQL Injection; SQL Injection Methodology; SQL Injection Tools; Evasion Techniques; SQL Injection Countermeasures",
  ],
  6: [
    "Hacking Wireless Networks: Wireless Concepts; Wireless Encryption; Wireless Threats; Wireless Hacking Methodology; Wireless Hacking Tools; Bluetooth Hacking; Wireless Attack Countermeasures; Wireless Security Tools",
  ],
  7: [
    "Hacking Mobile Platforms: Mobile Platform Attack Vectors; Hacking Android OS; Hacking iOS; Mobile Device Management; Mobile Security Guidelines and Tools",
    "IoT and OT Hacking: IoT Concepts; IoT Attacks; IoT Hacking Methodology; IoT Attack Countermeasures; OT Concepts; OT Attacks; OT Hacking Methodology; OT Attack Countermeasures",
  ],
  8: [
    "Cloud Computing: Cloud Computing Concepts; Container Technology; Serverless Computing; Cloud Computing Threats; Cloud Hacking; Cloud Security",
  ],
  9: [
    "Cryptography: Cryptography Concepts; Encryption Algorithms; Cryptography Tools; Public Key Infrastructure (PKI); Email Encryption; Disk Encryption; Cryptanalysis; Cryptography Attack Countermeasures",
  ],
};

const CEH_DOMAINS: { title: string; weight: number; questions: number }[] = [
  { title: "Information Security and Ethical Hacking Overview", weight: 6, questions: 7 },
  { title: "Reconnaissance Techniques", weight: 17, questions: 21 },
  { title: "System Hacking Phases and Attack Techniques", weight: 15, questions: 19 },
  { title: "Network and Perimeter Hacking", weight: 24, questions: 30 },
  { title: "Web Application Hacking", weight: 14, questions: 18 },
  { title: "Wireless Network Hacking", weight: 5, questions: 6 },
  { title: "Mobile Platform, IoT, and OT Hacking", weight: 10, questions: 12 },
  { title: "Cloud Computing", weight: 5, questions: 6 },
  { title: "Cryptography", weight: 5, questions: 6 },
];
export const CEH_DOMAIN_QUESTIONS = CEH_DOMAINS.map((d) => d.questions);

export const CEH_SOURCES = {
  format: src("EC-Council, CEH certification page (exam 312-50) and CEH v13 course page", CEH_CERT_URL, "exam_outline", {
    keyValues: [
      "125 multiple-choice questions in 4 hours, through the certifying body's own exam portal (remote proctoring) or Pearson VUE",
      "the certifying body sets a cut score per exam form; passing scores range from 60% to 85% depending on the form",
      "the certification is currently on version 13 (20 learning modules, AI-driven ethical hacking added); versions are released every 12-18 months",
      "an optional practical exam is a separate 6-hour exam of 20 challenges in the certifying body's cyber range; passing both earns a master-level designation",
      "eligibility: the certifying body's official training, or two years of information security work experience and an approved application (USD 100 fee)",
    ],
  }),
  course: src("EC-Council, Certified Ethical Hacker v13 course page (module outline)", CEH_COURSE_URL, "reference"),
} as const;

const cehOutline = (d: number): UnitSource =>
  src(
    `EC-Council, CEH Exam Blueprint v5.0, Domain ${d}: ${CEH_DOMAINS[d - 1].title} (${CEH_DOMAINS[d - 1].questions} of 125 questions)`,
    CEH_BLUEPRINT_URL,
    "exam_outline",
    { outline: [...CEH_OUTLINE[d]] }
  );

const cehUnit = (d: number, gate: string, objectives: string[], extra: UnitSource[] = []) => ({
  title: CEH_DOMAINS[d - 1].title,
  rangeLabel: `${CEH_DOMAINS[d - 1].weight}% of the exam (${CEH_DOMAINS[d - 1].questions} of 125 questions)`,
  weight: CEH_DOMAINS[d - 1].weight,
  gate,
  sources: [cehOutline(d), CEH_SOURCES.format, ...extra],
  objectives,
});

export const CEH_TRACK: SeedTrack = {
  code: "CEH",
  title: "Exam Prep for CEH® (312-50)",
  description:
    "Preparation for an ethical hacking knowledge certification exam: the blueprint's nine domains from reconnaissance and system hacking to web, wireless, mobile, IoT, OT, cloud and cryptography, weighted as the exam weights them, each attack paired with how defenders detect and stop it. Every lab is authorized testing in a lab you own. Independently developed exam prep; not affiliated with or endorsed by the organization that owns or administers this exam.",
  trackType: "certification",
  subcategorySlug: "it-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: CEH_CERT_URL,
  // Set last (verify-common.md), after every unit was compared with the
  // outline read on 2026-11-14.
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  credential: {
    providerSlug: "ec-council",
    providerName: "EC-Council",
    providerUrl: "https://www.eccouncil.org/",
    subcategorySlug: "it-certifications",
    credentialType: "certification",
    credentialSlug: "certified-ethical-hacker",
    credentialName: "Certified Ethical Hacker (CEH)",
    credentialUrl: CEH_CERT_URL,
    basis: "vendor_exam",
    examCode: "312-50",
    examRevision: "CEH v13; Exam Blueprint v5.0",
    objectivesRevision: "CEH Exam Blueprint v5.0: 9 domains, 20 sub-domains",
    status: "active",
    officialObjectivesUrl: CEH_BLUEPRINT_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "The certifying body's official training, or at least two years of work experience in information security with an approved eligibility application (USD 100, non-refundable).",
    durationMinutes: 240,
    questionFormat:
      "125 multiple-choice questions in 4 hours, fixed length (every candidate answers the same number of questions), through the certifying body's own exam portal with remote proctoring, or at Pearson VUE. (The certification page and the exam blueprint v5.0, read 2026-11-14.) A 6-hour, 20-challenge practical exam is separate.",
    passingScorePolicy:
      "The certifying body sets the cut score per exam form from each question's rated difficulty; depending on the form, passing ranges from 60% to 85%.",
    publishedWeightsNote:
      "EC-Council's CEH Exam Blueprint v5.0 prints domain weights 6, 17, 15, 24, 14, 5, 10, 5 and 5 percent, which add to 101: each is the domain's question count over 125 (7, 21, 19, 30, 18, 6, 12, 6, 6), rounded. Kept exactly as printed.",
  },
  units: [
    cehUnit(
      1,
      "Given a request to test an organization, say what makes the work ethical hacking rather than an attack -- written authorization, scope and rules of engagement -- place the planned steps on a five-phase ethical hacking methodology, the Cyber Kill Chain and MITRE ATT&CK, and name the laws and standards the client must meet.",
      [
        "Explain the elements of information security, the classes of attacks and the classes of hackers",
        "Apply hacking methodologies and frameworks -- a five-phase ethical hacking methodology, the Cyber Kill Chain and MITRE ATT&CK -- to plan an engagement",
        "Distinguish ethical hacking from attacking: written authorization, scope, rules of engagement and reporting",
        "Map information security controls, laws and standards -- PCI DSS, HIPAA, SOX and the GDPR -- to an organization",
        "Evaluate AI-driven tools in ethical hacking: where they speed up the work and where their output must be checked",
      ],
      [CEH_SOURCES.course]
    ),
    cehUnit(
      2,
      "Given an authorized target in your own lab, plan passive then active reconnaissance, read the scan and enumeration output to find what is exposed and what it reveals, and name the countermeasure that would have shown the tester less.",
      [
        // Footprinting
        "Plan passive footprinting with search engines, web services, social networking sites and people search services",
        "Analyze website, email header, WHOIS, DNS and network footprinting results",
        "Recommend footprinting countermeasures that reduce what an organization exposes",
        // Scanning
        "Choose network scanning techniques: host discovery, port and service discovery, OS fingerprinting and banner grabbing",
        "Interpret scan output, including scans that try to get past IDS and firewalls, and recommend scanning countermeasures",
        // Enumeration
        "Analyze enumeration of NetBIOS, SNMP, LDAP, NTP, NFS, SMTP and DNS, and of SMB, RPC and other services, and recommend enumeration countermeasures",
      ]
    ),
    cehUnit(
      3,
      "Given a vulnerability report and a host in your own lab, prioritize what to exploit and why, trace the system hacking phases from access to clearing logs, recognize the malware an attacker would leave, and name the detection or control that breaks each phase.",
      [
        // Vulnerability analysis
        "Interpret vulnerability assessment types, scoring systems such as CVSS, assessment tools and reports",
        // System hacking
        "Analyze the system hacking phases: gaining access, password cracking, exploitation, privilege escalation, maintaining access, executing applications, hiding files, persistence and clearing logs",
        "Recommend defenses against password attacks, privilege escalation and log tampering",
        // Malware
        "Recognize malware: advanced persistent threats, trojans, viruses and worms, ransomware and fileless malware",
        "Analyze malware with static and dynamic analysis, and choose malware countermeasures and anti-malware software",
      ]
    ),
    cehUnit(
      4,
      "Given a switched network, a help desk and an internet-facing service, recognize sniffing, social engineering, denial-of-service and session hijacking attacks from their traces, judge which perimeter controls an attacker would try to evade and how, and choose the detection and countermeasure for each. Heaviest domain on the exam.",
      [
        // Sniffing
        "Recognize sniffing attacks -- MAC flooding, DHCP starvation, ARP poisoning, spoofing and DNS poisoning -- and choose detection techniques and countermeasures",
        // Social engineering
        "Recognize social engineering techniques, insider threats, impersonation on social networking sites and identity theft, and design countermeasures",
        // DoS
        "Analyze DoS and DDoS attacks and botnets, and select DoS/DDoS protection",
        // Session hijacking
        "Analyze application-level and network-level session hijacking and choose countermeasures",
        // Evasion
        "Evaluate IDS, IPS, firewall and honeypot solutions and the techniques used to evade them and NAC and endpoint security, with evasion countermeasures",
      ]
    ),
    cehUnit(
      5,
      "Given a web server and application in your own lab, follow the web server and web application hacking methodologies to find the weak point -- authentication, authorization, session, input handling, logic or APIs -- show how SQL injection would work against it, and fix it.",
      [
        // Web servers
        "Analyze web server attacks and the web server attack methodology, and apply patch management and hardening",
        // Web apps
        "Analyze web application threats with the web application hacking methodology: authentication, authorization, access control, sessions, input validation, logic flaws, and web APIs, webhooks and web shells",
        // SQLi
        "Recognize SQL injection types -- in-band, blind (inferential) and out-of-band -- and the SQL injection methodology and evasion techniques",
        "Implement SQL injection countermeasures such as parameterized queries, input validation and least-privilege database accounts",
      ]
    ),
    cehUnit(
      6,
      "Given a wireless survey of your own lab, identify each network's encryption and its weakness, recognize wireless and Bluetooth attacks, and choose the configuration and monitoring that stop them.",
      [
        "Explain wireless concepts and encryption: WEP, WPA, WPA2 and WPA3",
        "Analyze wireless threats, the wireless hacking methodology and Bluetooth attacks, and secure wireless networks with countermeasures and security tools",
      ]
    ),
    cehUnit(
      7,
      "Given a fleet of phones, smart devices and a plant floor, name the attack vector each is exposed to, follow the IoT and OT hacking methodologies at a safe level of detail, and choose the device management, segmentation and monitoring that protect them.",
      [
        "Analyze mobile attack vectors against Android and iOS, and apply mobile device management and mobile security guidelines",
        "Analyze IoT attacks and the IoT hacking methodology, and choose IoT countermeasures",
        "Analyze OT concepts and attacks -- industrial control systems, SCADA and PLCs -- and choose OT countermeasures",
      ]
    ),
    cehUnit(
      8,
      "Given a cloud account running containers and serverless functions, recognize where an attacker gets in, from a stolen key to an exposed bucket or container, and apply the cloud security controls that close it.",
      [
        "Explain cloud computing concepts, container technology and serverless computing",
        "Analyze cloud threats and cloud hacking techniques, and apply cloud security controls",
      ]
    ),
    cehUnit(
      9,
      "Given data to protect at rest, in mail and in transit, choose the algorithm, key length and PKI to protect it, recognize the cryptanalytic attack that would break a weak choice, and name the countermeasure.",
      [
        "Explain cryptography concepts and encryption algorithms: symmetric, asymmetric and hashing",
        "Apply public key infrastructure, email encryption and disk encryption",
        "Recognize cryptanalysis and cryptographic attacks, and choose countermeasures",
      ]
    ),
  ],
};

export const ECCOUNCIL_TRACKS: readonly SeedTrack[] = [CEH_TRACK];
