// REQ-103: the Security+ V8 (SY0-801) and CySA+ V4 (CS0-004) courses must
// name every term CompTIA lists under each official objective. Pure data
// test -- it reads the seed modules, no database.
//
// The term lists below were transcribed from CompTIA's exam objectives
// documents (both "Exam Objectives Document Version 2.0"):
//   SY0-801: https://lecbyo.files.cmp.optimizely.com/download/77f3bd3223ac11f180820e495f189928
//   CS0-004: https://lecbyo.files.cmp.optimizely.com/download/68b1eae88e5011f08868a275d699e612
// keyed by official objective number. Each term must appear (case-
// insensitively) in the objectives of the unit for that domain, so a later
// edit that drops a term from the course fails here. A term is written the
// way the PDF prints it unless the PDF's own expansion is spelled out in the
// course text instead (noted inline).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import type { SeedTrack } from "../supabase/seed/data";

const SECPLUS_V8_TERMS: Record<string, string[]> = {
  "1.1": [
    "Defense in depth", "Confidentiality, integrity, and availability (CIA)", "Authentication, authorization, accounting (AAA)",
    "Non-repudiation", "Zero Trust principles", "Least privilege",
    "Technical/logical", "Managerial/administrative", "Physical/environmental", "Operational",
    "Preventive", "Deterring", "Corrective", "Detective", "Compensating", "Directive",
  ],
  "1.2": [
    "Change advisory board (CAB)", "Approval process", "Ownership", "Stakeholders", "Impact analysis", "Test results",
    "Backout planning", "Fail forward", "Maintenance window", "Standard operating procedures (SOPs)",
    "Allow lists/deny lists", "Restricted activities", "Downtime", "Service restart", "Application restart",
    "Legacy applications", "Dependencies", "Updating diagrams", "Updating policies/procedures", "Version control",
  ],
  "1.3": [
    "Public key infrastructure (PKI)", "Public key", "Private key", "Key escrow",
    "Certificate authorities", "Certificate revocation lists (CRLs)", "Online Certificate Status Protocol (OCSP)",
    "Self-signed", "Third-party", "Root of trust", "Certificate signing request (CSR) generation", "Wildcard",
    "Protocols", "Symmetric", "Asymmetric", "Level", "Full disk", "Partition", "File", "Volume", "Database", "Record",
    "Transport/communication", "Key exchange", "Algorithms", "Key length",
    "Digital signatures", "Salting", "Tools", "Obfuscation", "Hashing algorithms",
  ],
  "2.1": [
    "Threat feeds", "Likelihood", "Impact", "Intelligence sources", "Life cycle",
    "Common Vulnerability Scoring System (CVSS)", "Prioritization", "Vulnerability types", "Common Vulnerabilities and Exposures (CVE)",
  ],
  "2.2": [
    "Crime syndicate/organized crime", "Terrorist", "Unskilled attacker", "Hacktivist", "Insider", "Accidental/unintentional",
    "Competitor", "State-sponsored",
    "Financial", "Influence", "Intellectual property", "Notoriety", "Espionage", "Fear/chaos", "Extortion",
    "General curiosity", "Revenge", "Ideological", "Political", "Ethical",
    "Internal/external", "Resources/funding", "Level of sophistication/capability",
  ],
  "2.3": [
    "Advanced persistent threat (APT)", "Email", "Short Message Service (SMS)", "Rich Communication Services (RCS)",
    "Instant messaging", "Collaboration tools", "Quick response (QR) codes", "Embedded content",
    "CAPTCHA", // the PDF spells out "Completely Automated Public Turing test..."; the course uses the acronym
    "Embedded macros", "Rich Text Format (RTF) documents", "Portable Document Formats (PDFs)",
    "Extensions", "JavaScript", "Password managers", "Cookies", "Session tokens",
    "Infrastructure devices", "Virtualized devices", "Session keys",
    "Remote desktop", "Virtual Network Computing (VNC)", "Virtual private network (VPN)",
    "Mobile devices", "Workstations", "Servers", "Tablets", "Trusted devices", "Built-in tools", "Living-off-the-land tools",
    "Supply chain-based", "Third-party providers", "Managed service providers", "Logistic providers", "Software as a service (SaaS)",
    "Malicious Universal Serial Bus (USB)", "Impersonation", "Contractor", "Visitor", "Biometric", "Watering hole",
    "Internet of Things (IoT)", "Cameras", "Sensors", "Printers", "Operational technology (OT)",
    "Lock and key", "Access vestibule", "Access passes", "Bluetooth", "Radio frequency (RF)", "Near-field communications (NFC)",
  ],
  "2.4": [
    "Unsupported products", "Unpatched systems", "Obsolete systems", "Unmanaged systems", "Ports and services",
    "Race conditions", "Time-of-check (TOC)", "Time-of-use (TOU)", "Malicious update", "Hardcoded secrets",
    "Unsafe exception handling", "Operating system (OS)-based", "Virtualization", "Zero-day", "Cryptographic vulnerabilities",
    "Unmanaged/stale credentials", "Rogue devices", "Shadow IT", "Wireless and low-powered communications",
    "Large language models (LLMs)", "Identity providers", "Mobile devices", "Misconfiguration", "Public repositories",
    "Public object storage",
  ],
  "2.5": [
    "Ransomware", "Trojan", "Worm", "Spyware", "Adware", "Virus", "Rootkit", "Keylogger", "Logic bomb", "Fileless malware",
    "Tailgating", "Shoulder surfing", "Skimming", "Forced entry",
    "Distributed denial of service (DDoS)", "Protocol downgrade", "Rogue", "Sniffing", "Spoofing", "On-path",
    "Domain Name System (DNS) attacks", "Cache poisoning",
    "Smishing", "Vishing", "Phishing", "Whaling", "Spear phishing", "Quishing", "Impersonation", "Deepfake",
    "Hash", "Internet Protocol (IP) address", "Domain", "Malicious processes", "File system artifacts", "Timestamp",
    "Log manipulation", "Excessive resource consumption", "Plaintext strings", "Account lockout", "Impossible travel",
    "Concurrent sessions",
    "Injection", "Buffer overflow", "Replay", "Privilege escalation", "Forgery", "Directory traversal",
    "Password spraying", "Brute force", "User enumeration", "Multifactor authentication (MFA) bypass",
  ],
  "2.6": [
    "Model manipulation", "Poisoning", "Prompt injection", "Data loss", "Bias", "Explainability", "Hallucinations",
    "Jailbreaking", "Evasion", "Privacy", "Ethical considerations", "Session hijacking", "Code execution",
  ],
  "3.1": [
    "Cloud", "Serverless", "Multicloud", "Deployment models", "Hybrid", "Private", "Public", "Community",
    "Infrastructure as Code (IaC)", "OT", "On-premises infrastructure", "Air-gapped network", "Microservices",
    "Logical segmentation", "Physical segmentation",
    "Availability", "Resilience", "Proprietary vs. open source", "Usability", "Responsibility", "Compute",
    "Power requirements", "Ease of recovery",
    "Data sovereignty", "Data classification", "Cost", "Ownership", "Environmental requirements", "Scalability", "Risk",
  ],
  "3.2": [
    "Device placement", "Security zones", "Attack surface", "Diversity",
    "Zero Trust architecture", "User authentication", "Device management", "Health", "Inventory", "Application access control",
    "Virtual private network (VPN)", "Remote access", "Tunneling", "User management", "User access", "Least privilege",
    "End-to-end encrypted messaging", "Out-of-band management", "File transfer", "Security Service Edge (SSE)",
    "Group Managed Service Accounts (gMSAs)", "Least privilege access accounts", "Privilege creep", "Failure modes",
  ],
  "3.3": [
    "Structured", "Unstructured", "Data at rest", "Data in use", "Data in transit",
    "Sensitive", "Secret", "Critical", "Confidential", "Public", "Top secret", "Restricted",
    "Masking", "Hashing", "Filtering", "Tokenization", "Encryption", "Data transpose", "Deidentification", "Obfuscation",
    "Data owner", "Data custodian", "Data steward", "Data operator", "Data controller", "Data subprocessor",
    "Endpoints", "Marking and labeling", "Geofencing", "Data location", "Data placement",
    "Creation", "Management", "Distribution", "Retention", "Disposal",
    "Standards", "Health data", "Personal information", "Financial", "Child/minor data", "Intellectual property", "Legal data",
  ],
  "3.4": [
    "Hot", "Cold", "Warm", "Environmental", "Platform diversity", "Vendor platform", "Hardware", "Virtualization",
    "Load balancing", "Clustering", "Autoscaling", "High availability", "Multicloud systems", "Power",
    "Uninterruptible power supply (UPS)", "Redundant power supply (RPS)", "Power generator", "Surge protector",
    "Storage", "Backups", "Retention", "Immutability", "Scope", "Restoration testing",
    "Failover", "Simulation", "Parallel processing", "Disaster recovery", "Business continuity", "Capacity planning",
    "Recovery time objective (RTO)", "Recovery point objective (RPO)", "Mean time to repair (MTTR)",
    "Mean time between failures (MTBF)",
  ],
  "4.1": [
    "Segmentation", "Access controls", "Hardening", "Sandboxing", "Honeypot", "Honeynet", "Honeyfile", "Honeytoken",
    "Canary account", "Monitoring/alerting", "Mobile device management (MDM)", "Application control", "Allow lists",
    "Block lists", "NIDS", "NIPS", "HIDS", "HIPS", "Wireless intrusion prevention system (WIPS)",
    "Rate-limiting requests", "Web application firewall (WAF)", "Rule-based", "Unified threat management (UTM)",
    "Layer 4/Layer 7", "Content filter", "Data loss prevention (DLP)", "Agent-based", "Centralized proxy",
    "Endpoint detection and response (EDR)", "Extended detection and response (XDR)", "Antivirus",
    "Network access control", "Captive portals", "802.1X", "Endpoint posture/compliance", "Repositories",
    "Secrets scanning", "Input validation", "Secure cookies", "Static code analysis", "Code signing",
    "Domain-based Message Authentication, Reporting, and Conformance (DMARC)", "Sender Policy Framework (SPF)",
    "DomainKeys Identified Mail (DKIM)", "Brand Indicators for Message Identification (BIMI)",
    "Operating systems security", "Group Policy", "Security-enhanced Linux (SELinux)",
  ],
  "4.2": [
    "Hardware", "Software", "Data", "Asset management life cycle", "Planning/scoping", "Acquisition/procurement process",
    "Assignment/accounting", "Monitoring/asset tracking", "Disposal/decommissioning",
  ],
  "4.3": [
    "Scanning", "Internet Protocol Address Management (IPAM)", "Cloud security posture management (CSPM)",
    "Source code review", "Severity assessment", "Penetration test report review", "Remediation", "Verification",
    "Internal", "External", "Bounty program", "Responsible disclosure policies",
  ],
  "4.4": [
    "Systems", "Application", "Infrastructure", "Log aggregation", "Alerting", "Scanning", "Archiving", "Reporting",
    "Alert tuning", "Benchmarks", "Agents/agentless", "Security information and event management (SIEM)", "Antivirus",
    "DLP", "Vulnerability scanners", "Orchestration", "Packet analyzer", "NetFlow",
    "Simple Network Management Protocol (SNMP)", "syslog", "Security Content Automation Protocol (SCAP)",
    "Automated alerts", "Port mirroring", "Dashboards", "Network management systems",
  ],
  "4.5": [
    "Provisioning/deprovisioning user accounts", "Permissions assignments and implications", "Identity proofing",
    "Federation", "Single sign-on (SSO)", "Security Assertions Markup Language (SAML)",
    "Lightweight Directory Access Protocol (LDAP)", "Open authorization (OAuth)",
    "User", "Privileged", "Global", "Local", "Service", "Third-party", "Emergency access",
    "Hard token", "Soft token", "Biometrics", "One-time password (OTP)", "Backup code",
    "Rule-based", "Role-based", "Time-based", "Mandatory", "Discretionary", "Just-in-time",
    "Authentication", "Policies", "Logical/technical", "Administrative/business", "Access review",
    "Passkey", "Password managers", "Passwordless", "Password best practices", "Length", "Complexity", "Reuse",
    "Expiration", "Age", "Compromised credential monitoring", "Account auditing", "Policy report",
  ],
  "4.6": [
    "User provisioning", "Resource provisioning", "Desired state management", "Anomaly detection", "Ticket management",
    "Guardrails", "Automation logic", "Process engineering", "Complexity", "Financial", "Process risks", "Deployment",
    "Agentic", "Chatbot", "Predictive analysis", "AI-augmented baselines",
    "Efficiency/time saving", "Enforcing baselines", "Continuous improvements", "Productivity improvements",
    "Reduced downtime", "Increased proactivity", "SecOps",
    "Continuous integration and continuous deployment (CI/CD)", "Workflows", "Automation", "Integrations",
  ],
  "4.7": [
    "Preparation", "Training", "Testing", "Tabletop exercises", "Playbooks", "Simulation", "Roles",
    "Identification", "Detection", "Internal advisory", "External advisory", "Threat hunting",
    "Investigation", "Digital forensics", "Chain of custody", "E-discovery", "Preservation",
    "Containment", "Quarantine/isolation", "Negotiation", "Eradication/recovery",
    "Notification/external reporting", "Stakeholders", "Customers", "Law enforcement", "Mandatory",
    "Lessons learned", "Root cause analysis", "Post-incident reporting (PIR)",
  ],
  "4.8": [
    "Access and accounting", "Logical", "Physical", "Device", "Server", "Application", "Authentication",
    "Communication", "Audit", "Endpoint", "Network", "Metadata",
    "Vulnerability scans", "Automated reports", "NetFlow/Internet Protocol Flow Information Export (IPFIX)",
    "Surveillance footage", "Security tools", "Dashboards", "Packet captures",
    "File/log integrity", "System image", "Memory dump", "Bit-level copy", "Snapshot",
    "Human Resources (HR)", "Accounts", "Legal", "Log-parsing techniques",
  ],
  "5.1": [
    "Guidelines", "Benchmarks", "Advisories", "Implementation guides", "Reference architecture",
    "Standards", "Baselines", "Passwords", "Physical security", "Request for comments (RFC)", "Encryption",
    "Procedures", "Standard operating procedure (SOP)", "Runbooks", "Business continuity", "Disaster recovery",
    "Bring your own device (BYOD)", "Acceptable use policy (AUP)", "Clean desk", "Information security",
    "Incident response", "Data classification and retention", "Access control", "Data disposal",
    "Vulnerability disclosure", "Privacy",
  ],
  "5.2": [
    "Risk identification", "Asset identification", "Stakeholder ownership", "Risk assessment", "Scoring", "Categorization",
    "Risk analysis", "Impact", "Likelihood/probability", "Owner", "Current mitigations", "Qualitative vs. quantitative",
    "Risk register", "Communication", "Reviews", "Risk treatment", "Transferring", "Accepting", "Avoiding", "Mitigating",
    "Business impact analysis", "Risk appetite", "Residual risk", "Stakeholder involvement", "Management oversight",
    "Regulatory", "Legal", "Single loss expectancy (SLE)", "Annualized loss expectancy (ALE)",
    "Annualized rate of occurrence (ARO)",
  ],
  "5.3": [
    "Request for proposal (RFP)", "Request for information (RFI)", "Request for quote (RFQ)", "Expression of interest (EOI)",
    "Due diligence", "Conflict of interest",
    "Service-level agreement (SLA)", "Service-level objective (SLO)", "Memorandum of understanding (MOU)",
    "Memorandum of agreement (MOA)", "Non-disclosure agreement (NDA)", "Master services agreement (MSA)",
    "Statement of work (SOW)",
    "Right to audit", "Service-level monitoring", "Vendor registry", "Vendor assessment", "Compliance attestation",
    "Penetration testing",
    "Staffing limitations", "Resource availability", "Environment", "Legal and regulatory factors", "Geography/jurisdiction",
    "Financial/return on investment (ROI)", "Vendor lock-in", "Assurance mechanisms", "Rules of engagement",
  ],
  "5.4": [
    "Compliance training", "Data handling", "Anti-money laundering/counter-terrorism financing (AML/CTF)", "Anti-bribery",
    "Compliance monitoring", "Attestations", "Acknowledgments", // the PDF prints "Acknowledgements"; the course is in US spelling (REQ-220)
    "Reputational damage", "Financial", "Legal", "Contractual", "Sanctions", "Loss of license",
    "Right to be forgotten", "Opt-in or opt-out", "Data correction", "Processing restrictions", "Processing prevention",
    "Controller vs. processor", "Ownership", "Legal hold", "Legal orders", "Data retention requirements",
  ],
  "5.5": [
    "Sampling", "Questionnaires/surveys", "Interviews", "Assertion", "Reference sources", "MITRE ATT&CK",
    "Cyber Kill Chain", "Diamond Model of Intrusion Analysis", "Audit charter", "Frequency", "Gap analysis",
    "Internal", "Compliance", "Audit committee", "Self-assessments", "External", "Examinations", "Assessments",
    "Regulatory", "Independent third-party audits", "Benchmarking",
    "Known environment", "Unknown environment", "Partially known environment", "Physical", "Offensive", "Defensive",
    "Integrated", "Reconnaissance", "Passive", "Active",
    "Industry-based standards", "International standards", "Region-specific standards", "Functional testing",
    "Behavioral testing",
  ],
  "5.6": [
    "Initial/onboarding", "Ongoing", "Targeted", "Corrective",
    "Learning management system (LMS)", "Self-service portals", "One-to-one", "One-to-many",
    "Metrics", "Managerial reports", "Personnel behavior risk scoring",
    "Social engineering", "Emerging security topics", "Password and credential management",
    "Remote work/teleworking/hybrid", "BYOD", "Business email compromise (BEC)", "Removable media and cables",
    "Situational awareness", "Operational security",
  ],
};

const CYSA_V4_TERMS: Record<string, string[]> = {
  "1.1": [
    "Ingestion", "Configuration", "Integrity and security", "Time synchronization", "Retention",
    "System hardening", "File structure", "Critical files", "System processes",
    "Cloud native", "Virtualization", "Containerization", "Application programming interfaces (APIs)",
    "Mobile", "Endpoint",
    "Zero Trust Network Architecture (ZTNA)", "Secure access service edge (SASE)", "Hybrid cloud",
    "Identity and access management (IAM)", "Privileged access management (PAM)",
    "Authentication and authorization methods", "Secrets management",
    "Encryption techniques", "Data protection concepts", "Critical infrastructure concepts",
    "Operational technology (OT)", "Industrial control system (ICS)", "Supervisory control and data acquisition (SCADA)",
  ],
  "1.2": [
    "Rogue devices", "Enumeration", "Anomalous activity", "Activity on unexpected ports",
    "Resource consumption", "Unauthorized software", "Suspicious or rogue processes",
    "Living Off the Land Binaries (LOLBins) and Scripts", "File system changes", "Data exfiltration",
    "Unauthorized configuration", "Service disruption", "Resource compromise", "Typosquatting", "URL shorteners",
    "IAM account compromise", "Unauthorized access", "Impossible travel", "Business email compromise (BEC)",
  ],
  "1.3": [
    "Decoding/parsing", "CyberChef", "Packet analysis", "Wireshark", "tcpdump", "Snort", "Suricata", "Zeek",
    "Log analysis", "Security information and event management (SIEM)", "Threat-intelligence platforms",
    "Open Threat Exchange (OTX)", "Malware Information Sharing Platform (MISP)", "Open Cyber Threat Intelligence (OpenCTI)",
    "Endpoint security", "Endpoint detection and response (EDR) and extended detection and response (XDR)",
    "Mobile device management (MDM)", "Domain and IP reputation", "WHOIS", "AbuseIPDB",
    "Geolocation by IP Address (GEO-IP)", "File analysis", "Strings", "VirusTotal", "Yet another recursive acronym (YARA)",
    "Sandboxing", "Joe Sandbox", "Cuckoo Sandbox", "Pattern recognition", "Regular expressions",
    "Interpreting suspicious commands", "Email analysis", "MXToolbox",
    "User and entity behavior analysis (UEBA)", "Open User and Entity Behavior Analytics (OpenUBA)",
    "JSON", "XML", "YAML", "EVTX", "Python", "PowerShell", "Shell script",
  ],
  "1.4": [
    "Advanced persistent threat (APT)", "Insider threat", "Tactics, techniques, and procedures (TTPs)", "Heat maps",
    "Pyramid of Pain", "MITRE ATT&CK", "Attribution", "Timeliness", "Relevance", "Accuracy",
    "Open-source intelligence (OSINT)", "Closed-source intelligence", "Threat intelligence sharing",
    "Indicator of compromise (IoC)", "Collection", "Analysis", "Application/usage", "Atomic", "Behavioral",
    "Threat modeling",
    // The PDF prints STRIDE's expansion first; the course names STRIDE and spells it out.
    "STRIDE", "spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege",
    "Threat mapping", "Cyber deception",
  ],
  "1.5": [
    "Standardize processes", "Manage and facilitate team coordination", "Playbook/runbook creation",
    "Streamline operations", "Automation and orchestration", "Security orchestration, automation, and response (SOAR)",
    "Infrastructure as code (IaC)", "Data enrichment", "Rule/alert tuning", "Dashboard creation",
    "Technology and tool integration", "APIs", "Webhooks", "Plug-ins",
  ],
  "1.6": [
    "Hallucinations", "Data exposure", "Model poisoning", "Malicious prompts", "Governance",
    "Legal or regulatory compliance", "AI usage policies", "Comparing artifacts", "Analyzing log files",
    "Document creation", "Incident investigation", "Event correlation", "Automation and orchestration",
  ],
  "2.1": [
    "Asset inventory", "Scheduling", "Operations", "Performance", "Sensitivity levels", "Segmentation",
    "Regulatory requirements", "Internal vs. external", "Agent vs. agentless", "Credentialed vs. non-credentialed",
    "Passive vs. active", "Discovery", "Mapping scans", "Device fingerprinting", "Security baseline scanning",
    "Payment Card Industry Data Security Standard (PCI DSS)", "Center for Internet Security (CIS) benchmarks",
    "International Organization for Standardization (ISO) 27000 series",
  ],
  "2.2": [
    "Network scanning and mapping", "Angry IP Scanner", "Masscan", "Multipurpose tools", "Nmap",
    "Metasploit Framework (MSF)", "Maltego", "Recon-ng", "Web application scanners", "Burp Suite",
    "Zed Attack Proxy (ZAP)", "Nikto", "Vulnerability scanners", "Nessus", "Nuclei",
    "Open Vulnerability Assessment Scanner (OpenVAS)", "Cloud infrastructure assessment tools", "ScoutSuite", "Prowler",
    "Trivy", "Checkov", "Breach attack simulation (BAS)", "Atomic Red Team", "Caldera",
  ],
  "2.3": [
    "Exploitability", "Active exploitation/threat intelligence", "Asset value", "Impact", "Patch/remediation availability",
    "True/false positives", "True/false negatives", "Common Vulnerability Scoring System (CVSS) metrics",
    // The PDF prints "First Exploitability Prediction Scoring System (EPSS)"; FIRST's model is the
    // Exploit Prediction Scoring System, which is what the course names.
    "Exploit Prediction Scoring System (EPSS)",
    "Internal", "External", "Isolated", "Attack surface management", "Secure coding best practices",
    "Patching and configuration management", "Exceptions", "Compensating controls", "Validation of remediation",
  ],
  "2.4": [
    "Administrative", "Technical", "Physical", "Preventative", "Detective", "Responsive", "Corrective",
    "Risk appetite", "Residual risk", "Inherent risk", "Accept", "Transfer", "Avoid", "Mitigate",
    "Policies, governance, and service-level objectives (SLOs)", "Static application security testing (SAST)",
    "Dynamic application security testing (DAST)", "Software Assurance Maturity Model (SAMM)", "Supply chain",
    "Software composition analysis (SCA)", "Software bill of materials (SBOM)",
  ],
  "3.1": ["Cyber Kill Chain", "Diamond Model of Intrusion Analysis", "MITRE ATT&CK"],
  "3.2": ["Preparation", "Detection", "Analysis", "Containment", "Eradication", "Recovery", "Post-incident"],
  "3.3": [
    "Developing plans", "Incident response plan", "Communication plan", "Creating playbooks", "Defining roles",
    "Performing training", "Tabletop", "Simulation", "Log collection", "Log correlation",
    "Log augmentation and enrichment", "Alerts and notifications", "Triage", "Establishment of a timeline",
    "Determining severity and impact", "Prioritization", "Evidence gathering", "Chain of custody",
    "Data integrity validation", "Preservation", "Legal hold", "Isolating affected targets", "Escalation",
    "Remediation and verification", "Release from isolation", "Performing restoration", "Root cause analysis (RCA)",
    "Corrective action development",
  ],
  "4.1": [
    "Vulnerability scan reports", "Compliance findings", "Risk scorecards", "Action plans", "Escalation", "Dependencies",
    "Inhibitors to remediation", "Contractual agreements", "Organizational governance", "Business process interruption",
    "Degrading functionality", "Legacy systems", "Proprietary systems", "Patch availability",
    "Stakeholder identification and communication", "Metrics and key performance indicators (KPIs)", "Trends",
    "Top risks", "Service-level agreement (SLA)",
  ],
  "4.2": [
    "Incident declaration and escalation", "Executive summary", "Communication plan", "Stakeholder identification",
    "Legal team", "Public relations", "Regulatory reporting agencies", "Law enforcement", "Customers",
    "Operational security awareness", "Communication channels", "Post-incident reporting", "After action report",
    "Lessons learned", "Root cause analysis", "Shift/incident handover", "Internal threat intelligence report",
    "Tailored to organization/environment", "Metrics and KPIs", "Alert volume", "False-positive rate",
    "True-positive rate", "Mean time to close", "Mean time to detect", "Mean time to respond",
    "Mean time to remediate", "Phishing campaign click rate",
  ],
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

function missingTerms(track: SeedTrack, terms: Record<string, string[]>): string[] {
  const units = activeUnits(track);
  const missing: string[] = [];
  for (const [objective, list] of Object.entries(terms)) {
    const domain = Number(objective.split(".")[0]);
    const unit = units[domain - 1];
    const text = norm(unit.objectives.join(" | "));
    for (const term of list) if (!text.includes(norm(term))) missing.push(`${objective} ${unit.title}: ${term}`);
  }
  return missing;
}

const track = (code: string) => {
  const t = CATALOG_TRACKS.find((x) => x.code === code);
  assert.ok(t, `${code} not in CATALOG_TRACKS`);
  return t;
};

describe("Security+ V8 (SY0-801) course -- REQ-103", () => {
  const v8 = track("SECPLUSV8");

  test("is a parallel course: SECPLUS still teaches SY0-701, unretired", () => {
    const v7 = track("SECPLUS");
    assert.equal(v7.credential?.examCode, "SY0-701");
    assert.equal(v7.credential?.retirementDate, "2027-06-11");
    assert.ok(v7.units.every((u) => !u.retiredAt));
    assert.ok(
      CATALOG_TRACKS.indexOf(v7) < CATALOG_TRACKS.indexOf(v8),
      "SECPLUS must seed before SECPLUSV8 so the SY0-701 row exists to be superseded"
    );
  });

  test("credential block matches the SY0-801 exam page and objectives PDF", () => {
    const c = v8.credential!;
    assert.equal(c.examCode, "SY0-801");
    assert.equal(c.effectiveDate, "2026-11-17");
    assert.equal(c.durationMinutes, 90);
    assert.match(c.questionFormat ?? "", /Maximum 90 questions; multiple choice and performance-based/);
    assert.match(c.passingScorePolicy ?? "", /^750 on a scale of 100-900/);
    assert.deepEqual(c.supersedes, { examCode: "SY0-701", lastExamDate: "2027-06-11" });
    assert.equal(c.credentialSlug, track("SECPLUS").credential?.credentialSlug, "same credential, new exam version");
  });

  test("five official domains with weights 16/24/19/27/14", () => {
    assert.deepEqual(
      activeUnits(v8).map((u) => [u.title, u.weight]),
      [
        ["General Security Concepts", 16],
        ["Threats, Vulnerabilities, and Attacks", 24],
        ["Security Architecture", 19],
        ["Security Operations", 27],
        ["Security Program Management and Oversight", 14],
      ]
    );
  });

  test("objectives name every term in the official sub-objectives", () => {
    assert.deepEqual(missingTerms(v8, SECPLUS_V8_TERMS), []);
  });
});

describe("CySA+ CS0-003 -> CS0-004 (REQ-103)", () => {
  const cysa = track("CYSAPLUS");

  test("teaches CS0-004 and records that it supersedes CS0-003", () => {
    const c = cysa.credential!;
    assert.equal(c.examCode, "CS0-004");
    assert.equal(c.effectiveDate, "2026-06-23");
    assert.equal(c.durationMinutes, 165);
    assert.match(c.questionFormat ?? "", /Maximum 85 questions; multiple choice and performance-based/);
    assert.deepEqual(c.supersedes, { examCode: "CS0-003", lastExamDate: "2026-12-22" });
  });

  test("keeps the four CS0-003 units at sort_order 0-3 with their objectives unchanged, retired after 2026-12-22", () => {
    // Positions are row identity: these must not move, and their objective
    // text must not change, or learners' mastery on them would be re-pointed.
    const v3 = cysa.units.slice(0, 4);
    assert.deepEqual(
      v3.map((u) => [u.title, u.weight, u.objectives.length]),
      [
        ["Security Operations (CS0-003)", 33, 7],
        ["Vulnerability Management (CS0-003)", 30, 6],
        ["Incident Response and Management (CS0-003)", 20, 5],
        ["Reporting and Communication (CS0-003)", 17, 4],
      ]
    );
    assert.equal(v3[0].objectives[0], "SIEM fundamentals: log aggregation, correlation rules, alert triage");
    assert.equal(v3[3].objectives[3], "Compliance and regulatory reporting considerations");
    for (const u of v3) assert.ok(u.retiredAt && u.retiredAt > "2026-12-22T23:59:59Z", `${u.title} retires too early`);
  });

  test("the four CS0-004 domains follow, weighted 34/26/24/16", () => {
    const active = activeUnits(cysa);
    assert.deepEqual(
      active.map((u) => [u.title, u.weight]),
      [
        ["Security Operations", 34],
        ["Vulnerability Management", 26],
        ["Incident Response and Management", 24],
        ["Reporting and Communication", 16],
      ]
    );
    assert.deepEqual(cysa.units.slice(4), active);
  });

  test("objectives name every term in the official sub-objectives", () => {
    assert.deepEqual(missingTerms(cysa, CYSA_V4_TERMS), []);
  });
});

describe("REQ-103 course structure", () => {
  for (const code of ["SECPLUSV8", "CYSAPLUS"]) {
    test(`${code}: every active unit has objectives and a gate; labs line up with objectives`, () => {
      for (const u of activeUnits(track(code))) {
        assert.ok(u.objectives.length > 0, `${u.title}: no objectives`);
        assert.ok((u.gate ?? "").length > 40, `${u.title}: no gate`);
        if (u.labs) assert.equal(u.labs.length, u.objectives.length, `${u.title}: labs not parallel to objectives`);
        assert.equal(new Set(u.objectives).size, u.objectives.length, `${u.title}: duplicate objective`);
      }
    });
  }
});
