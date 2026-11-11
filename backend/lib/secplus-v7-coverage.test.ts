// REQ-220 (FAIL-1130): the Security+ V7 (SY0-701) course must name every
// official sub-objective's listed topics, in the unit for that domain, so
// readiness cannot say "ready" for a domain with whole sub-objectives
// missing. Pure data test -- it reads the seed modules, no database.
//
// Terms transcribed on 2026-11-10 from "CompTIA Security+ SY0-701
// Certification Exam: Exam Objectives Version 5.0" (Copyright 2023
// CompTIA). CompTIA serves the English PDF behind a form on
// https://www.comptia.org/en-us/certifications/security/v7/ (which states
// SY0-701: max 90 questions, multiple-choice and performance-based, 90
// minutes; English retires 2027-06-11); the copy read was the unaltered
// CompTIA PDF republished at
// https://laurelridgeworkforce.com/wp-content/uploads/2025/01/CompTIA-Security-SY0-701-Exam-Objectives-1.pdf
//
// Granularity: every top-level bullet of each sub-objective, plus the
// second-level items the 2026-11-11 audit (H7) found missing. Each term must
// appear (case-insensitively) in the active objectives of the unit for that
// domain. Where the PDF's wording is awkward for a learner the course may
// use an equivalent; those are noted inline.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { LAB_SETS } from "../supabase/seed/labs";

const SECPLUS_V7_TERMS: Record<string, string[]> = {
  "1.1": [
    "technical", "managerial", "operational", "physical",
    "preventive", "deterrent", "detective", "corrective", "compensating", "directive",
  ],
  "1.2": [
    "CIA", "non-repudiation", "AAA", "authenticating people", "authenticating systems", "authorization models",
    "gap analysis", "Zero Trust", "control plane", "adaptive identity", "threat scope reduction",
    "policy-driven access control", "policy administrator", "policy engine", "data plane", "implicit trust zones",
    "policy enforcement point",
    "physical security", "bollards", "access control vestibule", "fencing", "video surveillance", "security guard",
    "access badge", "lighting", "sensors", "infrared", "pressure", "microwave", "ultrasonic",
    "deception and disruption", "honeypot", "honeynet", "honeyfile", "honeytoken",
  ],
  "1.3": [
    "change management", "approval process", "ownership", "stakeholders", "impact analysis", "test results",
    "backout plan", "maintenance window", "standard operating procedure",
    "allow lists/deny lists", "restricted activities", "downtime", "service restart", "application restart",
    "legacy applications", "dependencies", "updating diagrams", "updating policies/procedures", "version control",
  ],
  "1.4": [
    "public key infrastructure", "key escrow", "full-disk", "partition", "volume", "database", "record",
    "transport/communication", "asymmetric", "symmetric", "key exchange", "algorithms", "key length",
    "Trusted Platform Module (TPM)", "hardware security module (HSM)", "key management system", "secure enclave",
    "obfuscation", "steganography", "tokenization", "data masking", "hashing", "salting", "digital signatures",
    "key stretching", "blockchain", "open public ledger",
    "certificate authorities", "CRL", "OCSP", "self-signed", "third-party", "root of trust",
    "certificate signing request (CSR)", "wildcard",
  ],
  "2.1": [
    "nation-state", "unskilled attacker", "hacktivist", "insider threat", "organized crime", "shadow IT",
    "internal/external", "resources/funding", "level of sophistication",
    "data exfiltration", "espionage", "service disruption", "blackmail", "financial gain",
    "philosophical/political beliefs", "ethical", "revenge", "disruption/chaos", "war",
  ],
  "2.2": [
    "message-based", "image-based", "file-based", "voice call", "removable device", "vulnerable software",
    "client-based vs. agentless", "unsupported systems and applications", "unsecure networks", "open service ports",
    "default credentials", "supply chain", "managed service providers", "vendors", "suppliers",
    "phishing", "vishing", "smishing", "misinformation/disinformation", "impersonation", "business email compromise",
    "pretexting", "watering hole", "brand impersonation", "typosquatting",
  ],
  "2.3": [
    "memory injection", "buffer overflow", "race conditions", "time-of-check (TOC)", "time-of-use (TOU)",
    "malicious update", "operating system (OS)-based", "SQL injection (SQLi)", // the PDF spells out "Structured Query Language injection"
    "cross-site scripting (XSS)", "firmware", "end-of-life", "legacy", "VM escape", "resource reuse",
    "cloud-specific", "cryptographic", "misconfiguration", "side loading", "jailbreaking", "zero-day",
  ],
  "2.4": [
    "ransomware", "trojan", "worm", "spyware", "bloatware", "virus", "keylogger", "logic bomb", "rootkit",
    "brute force", "RFID cloning", "environmental",
    "DDoS", "amplified", "reflected", "DNS attacks", "wireless", "on-path", "credential replay", "malicious code",
    "injection", "replay", "privilege escalation", "forgery", "directory traversal",
    "downgrade", "collision", "birthday", "spraying",
    "account lockout", "concurrent session usage", "blocked content", "impossible travel", "resource consumption",
    "resource inaccessibility", "out-of-cycle logging", "published/documented", "missing logs",
  ],
  "2.5": [
    "segmentation", "access control list (ACL)", "permissions", "application allow list", "isolation", "patching",
    "encryption", "monitoring", "least privilege", "configuration enforcement", "decommissioning",
    "hardening", "endpoint protection", "host-based firewall", "host-based intrusion prevention system (HIPS)",
    "disabling ports/protocols", "default password changes", "removal of unnecessary software",
  ],
  "3.1": [
    "responsibility matrix", "hybrid considerations", "third-party vendors", "infrastructure as code (IaC)",
    "serverless", "microservices", "physical isolation", "air-gapped", "logical segmentation",
    "software-defined networking (SDN)", "on-premises", "centralized vs. decentralized", "containerization",
    "virtualization", "IoT", "ICS/SCADA", "real-time operating system (RTOS)", "embedded systems", "high availability",
    "availability", "resilience", "cost", "responsiveness", "scalability", "ease of deployment", "risk transference",
    "ease of recovery", "patch availability", "inability to patch", "power", "compute",
  ],
  "3.2": [
    "device placement", "security zones", "attack surface", "connectivity", "fail-open", "fail-closed",
    "active vs. passive", "inline vs. tap/monitor", "jump server", "proxy server", "IPS/IDS", "load balancer",
    "sensors", "port security", "802.1X", "Extensible Authentication Protocol (EAP)",
    "web application firewall (WAF)", "unified threat management (UTM)", "next-generation firewall (NGFW)",
    "layer 4/layer 7", "VPN", "remote access", "tunneling", "TLS", "IPSec", "SD-WAN", "SASE",
    "selection of effective controls",
  ],
  "3.3": [
    "regulated", "trade secret", "intellectual property", "legal information", "financial information",
    "human- and non-human-readable", "sensitive", "confidential", "public", "restricted", "private", "critical",
    "data at rest", "data in transit", "data in use", "data sovereignty", "geolocation",
    "geographic restrictions", "encryption", "hashing", "masking", "tokenization", "obfuscation", "segmentation",
    "permission restrictions",
  ],
  "3.4": [
    "load balancing vs. clustering", "hot", "cold", "warm", "geographic dispersion", "platform diversity",
    "multi-cloud", "continuity of operations", "capacity planning", "people", "technology", "infrastructure",
    "tabletop exercises", "fail over", "simulation", "parallel processing",
    "onsite/offsite", "frequency", "encryption", "snapshots", "recovery", "replication", "journaling",
    "generators", "uninterruptible power supply (UPS)",
  ],
  "4.1": [
    "secure baselines", "establish", "deploy", "maintain",
    "mobile devices", "workstations", "switches", "routers", "cloud infrastructure", "servers", "ICS/SCADA",
    "embedded systems", "RTOS", "IoT devices",
    "wireless devices", "site surveys", "heat maps",
    "mobile device management (MDM)", "bring your own device (BYOD)", "corporate-owned, personally enabled (COPE)",
    "choose your own device (CYOD)", "cellular", "Wi-Fi", "Bluetooth",
    "WPA3", "RADIUS", "cryptographic protocols", "authentication protocols",
    "input validation", "secure cookies", "static code analysis", "code signing", "sandboxing", "monitoring",
  ],
  "4.2": [
    "acquisition/procurement", "assignment/accounting", "ownership", "classification",
    "monitoring/asset tracking", "inventory", "enumeration",
    "disposal/decommissioning", "sanitization", "destruction", "certification", "data retention",
  ],
  "4.3": [
    "vulnerability scan", "static analysis", "dynamic analysis", "package monitoring", "threat feed",
    "open-source intelligence (OSINT)", "proprietary/third-party", "information-sharing organization", "dark web",
    "penetration testing", "responsible disclosure program", "bug bounty", "system/process audit",
    "false positive", "false negative", "CVSS", "CVE", "vulnerability classification", "exposure factor",
    "environmental variables", "industry/organizational impact", "risk tolerance",
    "patching", "insurance", "segmentation", "compensating controls", "exceptions and exemptions",
    "rescanning", "audit", "verification", "reporting",
  ],
  "4.4": [
    "systems", "applications", "infrastructure",
    "log aggregation", "alerting", "scanning", "reporting", "archiving", "quarantine", "alert tuning",
    "Security Content Automation Protocol (SCAP)", "benchmarks", "agents/agentless", "SIEM", "antivirus",
    "data loss prevention (DLP)", "SNMP traps", "NetFlow", "vulnerability scanners",
  ],
  "4.5": [
    "firewall", "rules", "access lists", "ports/protocols", "screened subnets", "IDS/IPS", "trends", "signatures",
    "web filter", "agent-based", "centralized proxy", "URL scanning", "content categorization", "block rules",
    "reputation", "Group Policy", "SELinux", "protocol selection", "port selection", "transport method",
    "DNS filtering", "DMARC", "DKIM", "SPF", "gateway", "file integrity monitoring", "DLP",
    "network access control (NAC)", "EDR", "XDR", "user behavior analytics",
  ],
  "4.6": [
    "provisioning/de-provisioning", "permission assignments", "identity proofing", "federation",
    "single sign-on (SSO)", "LDAP", "OAuth", "SAML", "interoperability", "attestation",
    "mandatory", "discretionary", "role-based", "rule-based", "attribute-based", "time-of-day restrictions",
    "least privilege", "multifactor authentication", "biometrics", "hard/soft authentication tokens",
    "security keys", "something you know", "something you have", "something you are", "somewhere you are",
    "password best practices", "length", "complexity", "reuse", "expiration", "age",
    "password managers", "passwordless", "privileged access management", "just-in-time permissions",
    "password vaulting", "ephemeral credentials",
  ],
  "4.7": [
    "user provisioning", "resource provisioning", "guard rails", "security groups", "ticket creation", "escalation",
    "enabling/disabling services and access", "continuous integration and testing",
    "application programming interfaces (APIs)",
    "efficiency/time saving", "enforcing baselines", "standard infrastructure configurations",
    "scaling in a secure manner", "employee retention", "reaction time", "workforce multiplier",
    "complexity", "cost", "single point of failure", "technical debt", "ongoing supportability",
  ],
  "4.8": [
    "preparation", "detection", "analysis", "containment", "eradication", "recovery", "lessons learned",
    "training", "tabletop exercise", "simulation", "root cause analysis", "threat hunting", "digital forensics",
    "legal hold", "chain of custody", "acquisition", "reporting", "preservation", "e-discovery",
  ],
  "4.9": [
    "firewall logs", "application logs", "endpoint logs", "OS-specific security logs", "IPS/IDS logs",
    "network logs", "metadata", "vulnerability scans", "automated reports", "dashboards", "packet captures",
  ],
  "5.1": [
    "guidelines", "policies", "acceptable use policy (AUP)", "information security policies", "business continuity",
    "disaster recovery", "incident response", "software development lifecycle (SDLC)", "change management",
    "standards", "password", "access control", "physical security", "encryption",
    "procedures", "onboarding/offboarding", "playbooks",
    "regulatory", "legal", "industry", "local/regional", "national", "global", "monitoring and revision",
    "boards", "committees", "government entities", "centralized/decentralized",
    "owners", "controllers", "processors", "custodians/stewards",
  ],
  "5.2": [
    "risk identification", "ad hoc", "recurring", "one-time", "continuous",
    "qualitative", "quantitative", "single loss expectancy (SLE)", "annualized loss expectancy (ALE)",
    "annualized rate of occurrence (ARO)", "probability", "likelihood", "exposure factor", "impact",
    "risk register", "key risk indicators", "risk owners", "risk threshold", "risk tolerance", "risk appetite",
    "expansionary", "conservative", "neutral", "transfer", "accept", "exemption", "exception", "avoid", "mitigate",
    "risk reporting", "business impact analysis", "recovery time objective (RTO)", "recovery point objective (RPO)",
    "mean time to repair (MTTR)", "mean time between failures (MTBF)",
  ],
  "5.3": [
    "vendor assessment", "penetration testing", "right-to-audit clause", "evidence of internal audits",
    "independent assessments", "supply chain analysis", "vendor selection", "due diligence", "conflict of interest",
    "service-level agreement (SLA)", "memorandum of agreement (MOA)", "memorandum of understanding (MOU)",
    "master service agreement (MSA)", "work order (WO)/statement of work (SOW)", "non-disclosure agreement (NDA)",
    "business partners agreement (BPA)", "vendor monitoring", "questionnaires", "rules of engagement",
  ],
  "5.4": [
    "compliance reporting", "internal", "external", "fines", "sanctions", "reputational damage", "loss of license",
    "contractual impacts", "due diligence/care", "attestation and acknowledgment", "automation",
    "privacy", "data subject", "controller vs. processor", "data inventory and retention", "right to be forgotten",
  ],
  "5.5": [
    "attestation", "internal audit", "audit committee", "self-assessments", "external audit", "regulatory",
    "examinations", "independent third-party audit",
    "penetration testing", "physical", "offensive", "defensive", "integrated", "known environment",
    "partially known environment", "unknown environment", "reconnaissance", "passive", "active",
  ],
  "5.6": [
    "phishing campaigns", "recognizing a phishing attempt", "responding to reported suspicious messages",
    "anomalous behavior recognition", "risky", "unexpected", "unintentional",
    "policy/handbooks", "situational awareness", "insider threat", "password management",
    "removable media and cables", "social engineering", "operational security", "hybrid/remote work environments",
    "reporting and monitoring", "initial", "recurring", "development", "execution",
  ],
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

function secplus() {
  const t = CATALOG_TRACKS.find((x) => x.code === "SECPLUS");
  assert.ok(t, "SECPLUS not in CATALOG_TRACKS");
  return t;
}

export function missingSecplusV7Terms(): string[] {
  const units = activeUnits(secplus());
  const missing: string[] = [];
  for (const [objective, list] of Object.entries(SECPLUS_V7_TERMS)) {
    const unit = units[Number(objective.split(".")[0]) - 1];
    const text = norm(unit.objectives.join(" | "));
    for (const term of list) if (!text.includes(norm(term))) missing.push(`${objective} ${unit.title}: ${term}`);
  }
  return missing;
}

describe("Security+ V7 (SY0-701) coverage -- REQ-220", () => {
  test("the term table lists every official sub-objective, 1.1-5.6", () => {
    assert.deepEqual(Object.keys(SECPLUS_V7_TERMS), [
      "1.1", "1.2", "1.3", "1.4",
      "2.1", "2.2", "2.3", "2.4", "2.5",
      "3.1", "3.2", "3.3", "3.4",
      "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9",
      "5.1", "5.2", "5.3", "5.4", "5.5", "5.6",
    ]);
  });

  test("five official domains with weights 12/22/18/28/20", () => {
    assert.deepEqual(
      activeUnits(secplus()).map((u) => [u.title, u.weight]),
      [
        ["General Security Concepts", 12],
        ["Threats, Vulnerabilities, and Mitigations", 22],
        ["Security Architecture", 18],
        ["Security Operations", 28],
        ["Security Program Management and Oversight", 20],
      ]
    );
  });

  test("objectives name every topic in the official sub-objectives (FAIL-1130)", () => {
    assert.deepEqual(missingSecplusV7Terms(), []);
  });

  test("objectives are only appended or retired: the original lines keep their positions and wording", () => {
    // Positions are row identity (seed-lib matches objectives by sort_order);
    // a changed line would re-point learners' mastery to a different topic.
    const u = secplus().units;
    assert.equal(u[0].objectives[0], "CIA triad, non-repudiation, and the AAA security model");
    assert.equal(u[0].objectives[6], "Security policies, governance basics, and change management fundamentals");
    assert.equal(u[1].objectives[7], "Mitigation techniques and secure coding concepts: hardening, segmentation, input validation, patch management");
    assert.equal(u[2].objectives[4], "Identity and access management strategy in architecture: federation, privileged access management, just-in-time access");
    assert.equal(u[3].objectives[7], "Security tools in operation: firewalls, IDS/IPS, EDR, and DLP");
    assert.equal(u[4].objectives[5], "Security metrics, KPIs, and reporting to leadership");
  });

  test("every active unit has labs parallel to its objectives and no duplicate lines", () => {
    for (const u of secplus().units) {
      if (u.labs) assert.equal(u.labs.length, u.objectives.length, `${u.title}: labs not parallel`);
      if (u.objectiveRetiredAt) assert.equal(u.objectiveRetiredAt.length, u.objectives.length, `${u.title}: retiredAt not parallel`);
      assert.equal(new Set(u.objectives).size, u.objectives.length, `${u.title}: duplicate objective`);
    }
  });
});

describe("Security+ V7 incident-response lab -- REQ-220", () => {
  test("leads with the SY0-701 4.8 step names, NIST only as a mapping (FAIL-1132)", () => {
    const lab = LAB_SETS.find((s) => s.trackCode === "SECPLUS")?.labs.find((l) => l.slug === "ir-lifecycle-ransomware");
    assert.ok(lab);
    assert.doesNotMatch(lab.title, /NIST/);
    const brief = lab.brief.toLowerCase();
    const steps = ["preparation", "detection", "analysis", "containment", "eradication", "recovery", "lessons learned"];
    let at = -1;
    for (const step of steps) {
      const i = brief.indexOf(step, at + 1);
      assert.ok(i > at, `brief names "${step}" in order`);
      at = i;
    }
    assert.ok(brief.indexOf("lessons learned") < brief.indexOf("nist"), "the exam's steps come before NIST");
    // Every model answer that cites a NIST ID labels it as NIST, after the step name.
    for (const p of lab.steps.flatMap((s) => s.parts)) {
      if (/\b(RS|RC|ID)\.[A-Z]{2}/.test(p.modelAnswer)) assert.match(p.modelAnswer, /^(Containment|Eradication|Recovery|Declare|Lessons learned)[^]*NIST/, p.modelAnswer.slice(0, 60));
    }
  });
});
