// CompTIA certification tracks beyond the five already hand-authored directly
// into data.ts (Security+, Linux+, CySA+, PenTest+, SecurityX). This file
// follows the AWS/Azure/GCP pattern instead -- a `credential` block per track
// so each one carries its own vendor/exam/taxonomy metadata -- rather than
// data.ts's older, untagged style, since that's the current standard for any
// cert added from here on (see docs/catalog-backlog.md, "CompTIA remainder").
//
// Every domain name, weight, and sub-topic below was read on 2026-09-24
// directly from CompTIA's own certification pages at
// comptia.org/en-us/certifications/<slug> -- not from training data, which
// for A+ would have been stale: training data's A+ pairing (220-1101/1102)
// was retired and replaced by 220-1201/220-1202 (V15, launched March 25,
// 2025) before this was written. Objectives are paraphrased from each page's
// domain sub-topics, not copied, the same rule AWS/Azure/GCP's tracks followed.

import type { SeedTrack } from "../data";

const COMPTIA_PROVIDER = {
  providerSlug: "comptia",
  providerName: "CompTIA",
  providerUrl: "https://www.comptia.org/certifications",
  subcategorySlug: "comptia-certifications",
  credentialType: "certification",
} as const;

const VERIFIED_AT = "2026-09-24T00:00:00Z";
// Second verification pass, 2026-09-26: the four tracks below (AutoOps+,
// CloudNetX, SecAI+, DataAI) were newly discovered while re-checking
// comptia.org/en-us/certifications/ for anything docs/catalog-backlog.md's
// original CompTIA-remainder roster missed. Domain/objective text for
// CloudNetX, SecAI+, and DataAI came from CompTIA's own PDF exam-objectives
// documents (fetched and text-extracted with pymupdf, not typed from
// memory); AutoOps+'s came from the "exam objectives summary" block
// embedded directly in its comptia.org page's HTML (no separate PDF found
// live yet for AT0-001). Two more candidates found the same pass were not
// built: SecOT+ (SOT-001) is still pre-order only, launching 2026-12-01;
// DataSys+ is mid-transition (current V1/DS0-001 is due to retire
// "sometime in 2026" per its own page, V2/DS0-002 doesn't launch until
// 2026-10-13) -- same ambiguous-version shape as Azure's DP-420 rename,
// so deferred rather than guessed at, per that precedent. Revisit DataSys+
// after 2026-10-13 and SecOT+ after 2026-12-01.
const VERIFIED_AT_20260926 = "2026-09-26T00:00:00Z";

// ---------------------------------------------------------------------------
// CompTIA A+ Core 1 (220-1201, V15). Confirmed still a two-exam certification
// as of this fetch -- A+ requires both Core 1 and Core 2, from the same
// version, no mixing. Modeled as two tracks sharing one credential
// (credentialSlug "a-plus") but two distinct credential_exams rows, since
// subject_tracks.credential_exam_id points at exactly one exam per track and
// a learner sits each exam separately.
//
// 90 minutes, max 90 questions (multiple choice, drag-and-drop,
// performance-based), passing score 675/900. Launched 2025-03-25, estimated
// retirement ~2028. Recommended experience: 12 months hands-on in an IT
// support specialist role. Domains: 13% / 23% / 25% / 11% / 28%.
// ---------------------------------------------------------------------------
export const APLUS_CORE1_TRACK: SeedTrack = {
  code: "APLUS_CORE1",
  title: "A+ Core 1 Coach",
  description:
    "CompTIA A+ Core 1 (220-1201) exam prep across 5 weighted domains -- mobile devices, networking, hardware, virtualization/cloud, and hardware/network troubleshooting.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/a/core-1-v15/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...COMPTIA_PROVIDER,
    credentialSlug: "a-plus",
    credentialName: "CompTIA A+",
    credentialUrl: "https://www.comptia.org/certifications/a",
    examCode: "220-1201",
    examRevision: "V15",
    basis: "vendor_exam",
    status: "active",
    effectiveDate: "2025-03-25",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/a/core-1-v15/",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "12 months of hands-on experience in an IT support specialist job role.",
    durationMinutes: 90,
    questionFormat: "Maximum 90 questions; multiple choice (single/multiple response), drag-and-drop, and performance-based",
    passingScorePolicy: "675 on a scale of 100-900.",
  },
  units: [
    {
      title: "Mobile Devices",
      weight: 13,
      gate: "Given a malfunctioning laptop or mobile device, correctly identify the failing component or setting and describe the fix, without guessing at internals you haven't actually opened.",
      objectives: [
        "Installing and replacing laptop hardware: battery, keyboard, touchpad, and internal wireless card",
        "Upgrading laptop internal components: SODIMM RAM and M.2/NVMe storage, respecting compatibility",
        "Configuring mobile device accessories and ports: USB-C/Lightning, Bluetooth pairing, NFC, and docking stations",
        "Configuring mobile device network connectivity: Wi-Fi, cellular data, Bluetooth tethering/hotspot, and airplane mode",
        "Syncing a mobile device to a computer or cloud account and applying mobile device management (MDM) profiles",
        "Troubleshooting common mobile device hardware issues: short battery life, overheating, and unresponsive digitizers",
        "Troubleshooting common mobile OS and app issues: app crashes, high resource use, and failed synchronization",
      ],
    },
    {
      title: "Networking",
      weight: 23,
      gate: "Given a small office/home office scenario, configure the router, choose the right cable/connector, and diagnose a connectivity complaint using command-line tools and physical testers, not guesswork.",
      objectives: [
        "Common networking ports and protocols, and matching TCP/UDP port numbers to the service that uses them",
        "Networking hardware roles: switches, routers, access points, and patch panels",
        "Wireless standards and encryption: 802.11 generations, frequency bands, and WPA2/WPA3",
        "Configuring a SOHO network: static vs. DHCP addressing, NAT, firewall rules, and port forwarding",
        "Configuring and troubleshooting VPN, VLAN, and QoS settings on a SOHO router",
        "Comparing internet connection types: cable, DSL, fiber, satellite, and cellular",
        "Using networking tools to troubleshoot connectivity: cable tester, crimper, Wi-Fi analyzer, and punchdown tool",
        "Interpreting command-line network diagnostics: ipconfig/ifconfig, ping, tracert, and nslookup",
      ],
    },
    {
      title: "Hardware",
      weight: 25,
      gate: "Given a PC build or upgrade request, select compatible components (motherboard, CPU, RAM, storage, power supply) and install them correctly, explaining any compatibility constraint that ruled out an alternative.",
      objectives: [
        "Identifying and installing common cables and connectors: HDMI, DisplayPort, USB-A/C, RJ-45, and SATA",
        "Installing and configuring motherboards, CPUs, and add-on cards, matching socket and chipset compatibility",
        "Selecting and installing RAM by type and compatibility: DDR4/DDR5 and single- vs. dual-channel configurations",
        "Installing and configuring storage devices: SATA and NVMe SSDs, HDDs, and RAID levels by use case",
        "Selecting a power supply by wattage and connector type, and choosing appropriate cooling for a build",
        "Installing and maintaining peripheral devices: printers, scanners, and multifunction devices",
        "Comparing laser, inkjet, thermal, and impact printer technologies and their routine maintenance",
      ],
    },
    {
      title: "Virtualization and Cloud Computing",
      weight: 11,
      gate: "Given a workload description, say whether it belongs on a local VM or in the cloud, which cloud service model fits it, and why the near-miss alternative doesn't.",
      objectives: [
        "Cloud service models -- IaaS, PaaS, and SaaS -- and matching a scenario to the right one",
        "Cloud deployment models: public, private, hybrid, and community cloud",
        "Common cloud characteristics: rapid elasticity, resource pooling, metered utilization, and file synchronization",
        "Client-side virtualization concepts: the purpose of a VM and type 1 vs. type 2 hypervisors",
        "Configuring and troubleshooting resource allocation for a client-side virtual machine",
      ],
    },
    {
      title: "Hardware and Network Troubleshooting",
      weight: 28,
      gate: "Given symptoms of a broken PC or network link, apply the standard troubleshooting methodology end to end -- identify, theorize, test, plan, implement, verify, document -- rather than jumping straight to a fix.",
      objectives: [
        "Applying a consistent troubleshooting methodology: identify the problem, establish a theory, test it, plan and implement a solution, verify, and document",
        "Troubleshooting common PC hardware symptoms: no power, POST failures, overheating, and unusual noise",
        "Troubleshooting common video and display issues",
        "Troubleshooting common storage issues: read/write failures, degraded performance, and RAID or boot failures",
        "Troubleshooting motherboard, CPU, and power issues using diagnostic tools and POST error codes",
        "Troubleshooting wired and wireless network problems: intermittent connectivity, slow transfer speeds, and limited connectivity",
        "Using hardware and network troubleshooting tools: multimeter, loopback plug, cable tester, and POST card",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA A+ Core 2 (220-1202, V15). Same credential as Core 1 (shared
// credentialSlug "a-plus"), separate exam row -- see the Core 1 comment above
// for why these are modeled as two tracks.
//
// 90 minutes, max 90 questions, passing score 700/900 (higher than Core 1's
// 675). Launched 2025-03-25, estimated retirement ~2028. Domains:
// 28% / 28% / 23% / 21%.
// ---------------------------------------------------------------------------
export const APLUS_CORE2_TRACK: SeedTrack = {
  code: "APLUS_CORE2",
  title: "A+ Core 2 Coach",
  description:
    "CompTIA A+ Core 2 (220-1202) exam prep across 4 weighted domains -- operating systems, security, software troubleshooting, and operational procedures.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/a/core-2-v15/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...COMPTIA_PROVIDER,
    credentialSlug: "a-plus",
    credentialName: "CompTIA A+",
    credentialUrl: "https://www.comptia.org/certifications/a",
    examCode: "220-1202",
    examRevision: "V15",
    basis: "vendor_exam",
    status: "active",
    effectiveDate: "2025-03-25",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/a/core-2-v15/",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "12 months of hands-on experience in an IT support specialist job role.",
    durationMinutes: 90,
    questionFormat: "Maximum 90 questions; multiple choice (single/multiple response), drag-and-drop, and performance-based",
    passingScorePolicy: "700 on a scale of 100-900.",
  },
  units: [
    {
      title: "Operating Systems",
      weight: 28,
      gate: "Given a Windows, macOS, or Linux system, use the correct native tool to diagnose or change system state -- not just click around a GUI hoping to find the setting.",
      objectives: [
        "Common OS types and their purposes: Windows, macOS, Linux, ChromeOS, iOS/iPadOS, and Android",
        "Windows administrative tools: Task Manager, Disk Management, Control Panel, Settings app, and MMC snap-ins",
        "Using the Windows command line and PowerShell for common administrative tasks",
        "Configuring Windows networking: workgroup vs. domain membership, network shares, and printer sharing",
        "Comparing Windows editions and performing OS installations or upgrades, in-place vs. clean",
        "Configuring and troubleshooting Windows Update, backup, and system restore",
        "Identifying macOS and Linux features, file systems, best practices, and common commands",
      ],
    },
    {
      title: "Security",
      weight: 28,
      gate: "Given a workstation or SOHO network to harden, apply the specific physical, logical, and OS-level controls that actually address the threat model -- not a generic 'enable security' pass.",
      objectives: [
        "Physical security controls: badge readers, biometrics, mantraps, and cable locks",
        "Logical security concepts: least privilege, multifactor authentication, ACLs, and encryption",
        "Wireless security protocols and authentication: WPA2, WPA3, RADIUS, and 802.1X",
        "Detecting, removing, and preventing malware: viruses, ransomware, trojans, keyloggers, and rootkits",
        "Common social-engineering attacks: phishing, shoulder surfing, tailgating, and impersonation",
        "SOHO network and workstation security best practices: password policies, account management, and firewall rules",
        "Securing mobile and embedded devices: screen locks, remote wipe, and full-device encryption",
        "Configuring Windows security settings: Windows Defender/Firewall, BitLocker, and User Account Control",
      ],
    },
    {
      title: "Software Troubleshooting",
      weight: 23,
      gate: "Given a compromised or malfunctioning system, follow the correct malware-removal sequence and OS troubleshooting steps in order, not just delete the first suspicious file found.",
      objectives: [
        "Troubleshooting common Windows problems: slow performance, application crashes, boot failures, and blue screen errors",
        "Troubleshooting common PC security symptoms: browser redirection, unwanted pop-ups, and rogue antivirus",
        "Best-practice malware removal procedure: quarantine, disable System Restore, remediate, re-enable, and educate the user",
        "Troubleshooting common mobile OS and app issues: signal loss, failed app loads, and failed synchronization",
        "Troubleshooting common mobile security issues: unauthorized data access, unexpected data usage, and unauthorized location tracking",
      ],
    },
    {
      title: "Operational Procedures",
      weight: 21,
      gate: "Given a change to make on a live system, follow documentation, change-management, and safety procedure correctly -- explaining why skipping any one step is a real risk, not paperwork.",
      objectives: [
        "Documentation best practices: knowledge base articles, ticketing systems, and asset management",
        "Change-management best practices: purpose and scope of change, risk analysis, and a backout plan",
        "Workstation backup and recovery: full, incremental, and differential backups, and testing restores",
        "Safety procedures: ESD mats and straps, proper equipment grounding, and safe disposal",
        "Environmental controls and disposal: SDS handling and battery/toner disposal",
        "Privacy, licensing, and policy concepts: chain of custody, software licensing, and handling PII/PHI",
        "Professional communication techniques when dealing with customers and coworkers",
        "Basic scripting concepts and use cases: batch files, Python, PowerShell, and remote-access technologies",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA Network+ (N10-009, V9). Confirmed current and active as of this
// fetch, not beta -- training data's exam code is not stale here (V9 has
// been current since 2024-06-20), unlike A+'s pairing.
//
// 90 minutes, up to 90 questions (multiple choice and performance-based),
// passing score 720/900. Launched 2024-06-20, estimated retirement ~2027.
// Recommended experience: CompTIA A+ plus 9-12 months as a junior network
// admin or support tech. Domains: 23% / 20% / 19% / 14% / 24%.
// ---------------------------------------------------------------------------
export const NETWORKPLUS_TRACK: SeedTrack = {
  code: "NETWORKPLUS",
  title: "Network+ Coach",
  description:
    "CompTIA Network+ (N10-009) exam prep across 5 weighted domains -- networking concepts, implementation, operations, security, and troubleshooting.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/network/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...COMPTIA_PROVIDER,
    credentialSlug: "network-plus",
    credentialName: "CompTIA Network+",
    credentialUrl: "https://www.comptia.org/certifications/network",
    examCode: "N10-009",
    examRevision: "V9",
    basis: "vendor_exam",
    status: "active",
    effectiveDate: "2024-06-20",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/network/",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "CompTIA A+ certification recommended, plus 9-12 months of hands-on experience as a junior network administrator or support technician.",
    durationMinutes: 90,
    questionFormat: "Maximum 90 questions; multiple choice and performance-based",
    passingScorePolicy: "720 on a scale of 100-900.",
  },
  units: [
    {
      title: "Networking Concepts",
      weight: 23,
      gate: "Given a network diagram or a described topology, name the OSI layer, appliance, and address type actually in play -- not a generic 'it's networking' answer.",
      objectives: [
        "The OSI model layers, from physical through application, and which device or protocol operates at each",
        "Networking appliance roles: routers, switches, firewalls, IDS/IPS, load balancers, proxies, NAS, and SAN",
        "Cloud networking concepts: NFV, VPCs, network security groups, and cloud deployment/service models",
        "Common ports and protocols: FTP, SSH, DNS, DHCP, HTTP/S, SNMP, LDAP, RDP, and SIP",
        "Traffic types: unicast, multicast, anycast, and broadcast",
        "Transmission media: wireless standards and wired cable types by use case",
        "Transceivers and connectors: SC, LC, ST, MPO, RJ11, RJ45, F-type, and BNC",
        "Network topologies: mesh, star, spine-and-leaf, and three-tier designs",
        "IPv4 addressing: public vs. private ranges, subnetting, and address classes",
      ],
    },
    {
      title: "Network Implementation",
      weight: 20,
      gate: "Given a routing, switching, or wireless requirement, configure the specific technology that satisfies it and explain why a near-miss alternative would not.",
      objectives: [
        "Routing technologies: static vs. dynamic routing, NAT, PAT, and first-hop redundancy protocols (FHRP, VIP)",
        "Switching technologies: VLANs, spanning tree, MTU, and jumbo frames",
        "Wireless device configuration: channels, SSIDs, encryption, authentication, and antenna types",
        "Physical installation considerations: power redundancy and environmental controls",
      ],
    },
    {
      title: "Network Operations",
      weight: 19,
      gate: "Given an ongoing network to run, produce or update the specific documentation, monitoring, or recovery artifact the situation calls for -- not a vague 'monitor it' answer.",
      objectives: [
        "Documentation practices: network diagrams, rack layouts, asset inventory, IPAM, and SLAs",
        "Life-cycle management: end-of-life, end-of-support, and decommissioning procedures",
        "Change and configuration management processes",
        "Network monitoring: SNMP, flow data, packet capture, and log aggregation",
        "Disaster recovery concepts: RPO, RTO, MTTR, MTBF, and site types",
        "Network services: DHCP, SLAAC, DNS, NTP, PTP, and NTS",
        "Remote access and management methods: VPNs, SSH, GUI, API, and console access",
      ],
    },
    {
      title: "Network Security",
      weight: 14,
      gate: "Given a network to harden or an incident to classify, apply the specific security control or terminology that matches the threat -- not a generic 'lock it down' response.",
      objectives: [
        "Logical security concepts: encryption, PKI, IAM, MFA, SSO, RADIUS, and RBAC",
        "Physical security controls: cameras and locks",
        "Deception technologies: honeypots and honeynets",
        "Core security terminology: risk, vulnerability, exploit, threat, and the CIA triad",
        "Audits and compliance: PCI DSS, GDPR, and data locality requirements",
        "Network segmentation: IoT, SCADA, ICS, guest, and BYOD networks",
        "Common attack types: DoS/DDoS, VLAN hopping, and ARP/DNS poisoning",
        "Security features: NAC, ACLs, content filtering, and screened subnets",
      ],
    },
    {
      title: "Network Troubleshooting",
      weight: 24,
      gate: "Given symptoms of a broken network link or service, apply the troubleshooting methodology in order and name the specific tool that isolates the fault -- not jump straight to a guess.",
      objectives: [
        "Applying a consistent troubleshooting methodology from problem identification through documentation",
        "Diagnosing cabling and physical interface issues",
        "Diagnosing network service issues: switching, routing, and address pool exhaustion",
        "Diagnosing performance issues: congestion, latency, packet loss, and wireless interference",
        "Using troubleshooting tools and protocols: protocol analyzers, CLI tools, cable testers, and Wi-Fi analyzers",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA Cloud+ (CV0-004, V4). Confirmed current and active as of this
// fetch, not beta.
//
// 90 minutes, up to 90 questions (multiple choice and performance-based),
// passing score 750/900. Launched 2024-09-24, estimated retirement ~2027.
// Recommended experience: 2-3 years hands-on as a systems administrator or
// cloud engineer. Domains: 23% / 19% / 19% / 17% / 12% / 10%.
// ---------------------------------------------------------------------------
export const CLOUDPLUS_TRACK: SeedTrack = {
  code: "CLOUDPLUS",
  title: "Cloud+ Coach",
  description:
    "CompTIA Cloud+ (CV0-004) exam prep across 6 weighted domains -- cloud architecture, deployment, security, operations, troubleshooting, and DevOps fundamentals.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/cloud/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...COMPTIA_PROVIDER,
    credentialSlug: "cloud-plus",
    credentialName: "CompTIA Cloud+",
    credentialUrl: "https://www.comptia.org/certifications/cloud",
    examCode: "CV0-004",
    examRevision: "V4",
    basis: "vendor_exam",
    status: "active",
    effectiveDate: "2024-09-24",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/cloud/",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "2-3 years of hands-on experience as a systems administrator or cloud engineer.",
    durationMinutes: 90,
    questionFormat: "Maximum 90 questions; multiple choice and performance-based",
    passingScorePolicy: "750 on a scale of 100-900.",
  },
  units: [
    {
      title: "Cloud Architecture",
      weight: 23,
      gate: "Given a workload description, recommend the specific cloud model, networking approach, and resource-optimization move that fits it -- not a generic 'move it to the cloud' answer.",
      objectives: [
        "Comparing public, private, hybrid, and multi-cloud deployment models against a business need",
        "The role of virtualization technologies in a cloud environment",
        "Cloud networking: VPNs and virtual network design",
        "The role of containerization in cloud environments",
        "Managing containers with orchestration techniques",
        "Database concepts as used by cloud applications",
        "Optimizing cloud resources for performance and cost efficiency",
        "Billing management and usage-cost considerations",
      ],
    },
    {
      title: "Deployment",
      weight: 19,
      gate: "Given a workload to move to the cloud, plan and execute the migration -- analyzing requirements, provisioning resources, and automating the build -- rather than clicking through the console ad hoc.",
      objectives: [
        "Analyzing system requirements ahead of a workload migration",
        "Implementing infrastructure as code (IaC) techniques for automation",
        "Planning and executing workload migrations to a cloud environment",
        "Provisioning and configuring cloud resources effectively",
      ],
    },
    {
      title: "Security",
      weight: 19,
      gate: "Given a cloud environment to secure, apply the specific control -- IAM, container hardening, or a named compliance standard -- that matches the risk, not a generic 'add security' answer.",
      objectives: [
        "Identifying and addressing vulnerabilities in cloud environments",
        "Implementing identity and access management (IAM) to control resource access",
        "Safeguarding containerized applications and resources",
        "Ensuring compliance with standards such as PCI DSS, SOC 2, and ISO 27001",
        "Deploying security controls to protect cloud environments",
      ],
    },
    {
      title: "Operations",
      weight: 17,
      gate: "Given a cloud resource already in production, manage its lifecycle and monitor it -- scaling, updating, backing up, and observing it -- rather than treating deployment as the finish line.",
      objectives: [
        "Managing the lifecycle of cloud resources, including scaling and updates",
        "Implementing backup and recovery strategies to ensure data integrity",
        "Monitoring and analyzing cloud environments for performance optimization",
      ],
    },
    {
      title: "Troubleshooting",
      weight: 12,
      gate: "Given a broken cloud deployment, diagnose the specific fault -- connectivity, a leaked credential, a misconfiguration, or a disrupted service -- rather than guessing at a fix.",
      objectives: [
        "Diagnosing and resolving deployment problems",
        "Troubleshooting network connectivity issues in cloud environments",
        "Addressing security incidents such as leaked credentials and privilege escalation",
        "Resolving service disruptions in DNS, DHCP, and NTP",
        "Identifying and fixing cloud misconfigurations",
      ],
    },
    {
      title: "DevOps Fundamentals",
      weight: 10,
      gate: "Given a repetitive cloud operations task, automate it with the right tool -- source control, a CI/CD pipeline, or an orchestration tool like Kubernetes/Ansible/Jenkins -- rather than doing it by hand again.",
      objectives: [
        "Using automation tools to streamline cloud operations",
        "Managing code with source control techniques",
        "Building and managing CI/CD pipelines",
        "Integrating systems for seamless cloud operations",
        "Working with common DevOps tools: Kubernetes, Ansible, and Jenkins",
        "Event-driven architectures in cloud applications",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA Data+ (DA0-002, V2). Confirmed current and active as of this
// fetch, not beta -- a very recent revision (launched 2025-10-14), so
// training data's exam code was almost certainly already stale here.
//
// 90 minutes, up to 90 questions (multiple choice and performance-based),
// passing score 675/900. Estimated retirement ~2028. Recommended
// experience: 18-24 months in a data-analyst-like role, with exposure to
// databases, analytical tools, basic statistics, and data visualization.
// Domains: 20% / 22% / 24% / 20% / 14%.
// ---------------------------------------------------------------------------
export const DATAPLUS_TRACK: SeedTrack = {
  code: "DATAPLUS",
  title: "Data+ Coach",
  description:
    "CompTIA Data+ (DA0-002) exam prep across 5 weighted domains -- data concepts and environments, acquisition and preparation, analysis, visualization and reporting, and governance.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/data/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...COMPTIA_PROVIDER,
    credentialSlug: "data-plus",
    credentialName: "CompTIA Data+",
    credentialUrl: "https://www.comptia.org/certifications/data",
    examCode: "DA0-002",
    examRevision: "V2",
    basis: "vendor_exam",
    status: "active",
    effectiveDate: "2025-10-14",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/data/",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "18-24 months in a data-analyst-like role, with exposure to databases, analytical tools, basic statistics, and data visualization.",
    durationMinutes: 90,
    questionFormat: "Maximum 90 questions; multiple choice and performance-based",
    passingScorePolicy: "675 on a scale of 100-900.",
  },
  units: [
    {
      title: "Data Concepts and Environments",
      weight: 20,
      gate: "Given a dataset and its storage environment, name the specific database type, infrastructure, and tooling in play -- not a generic 'it's data' answer.",
      objectives: [
        "Data concepts: database types, data structures, file extensions, and data types",
        "Data sources: databases, APIs, website data, files, logs, and repositories",
        "Infrastructure: cloud, on-premise, storage, and containerization",
        "Data tools: coding environments, BI software, and analysis platforms",
        "AI concepts: identifying AI models, natural language processing, and robotic process automation",
      ],
    },
    {
      title: "Data Acquisition and Preparation",
      weight: 22,
      gate: "Given a raw, messy dataset, apply the specific exploration and transformation step that fixes it -- finding the missing values or duplicates before cleansing and merging -- not jump straight to analysis.",
      objectives: [
        "Acquisition methods: data integration and queries to gather and combine data",
        "Exploration: finding missing values, duplication, redundancy, and outliers",
        "Transformation: cleansing, merging, parsing, and formatting data",
      ],
    },
    {
      title: "Data Analysis",
      weight: 24,
      gate: "Given a dataset and an audience, choose the specific statistical method and communication approach that fits both -- not a one-size-fits-all summary.",
      objectives: [
        "Selecting communication methods appropriate to different audiences",
        "Applying basic statistical techniques to data",
        "Using tools and resources to troubleshoot data analysis problems",
      ],
    },
    {
      title: "Visualization and Reporting",
      weight: 20,
      gate: "Given analysis results, choose the specific chart, table, or dashboard element that best conveys them, and validate the finished report before shipping it.",
      objectives: [
        "Choosing visuals: charts, maps, tables, and design elements",
        "Producing reports: dashboards and summaries using appropriate methods",
        "Applying validation and review to catch reporting issues",
      ],
    },
    {
      title: "Data Governance",
      weight: 14,
      gate: "Given a dataset that needs to be managed responsibly, apply the specific governance control -- documentation, a retention rule, an access control, or a quality check -- rather than a vague 'handle it carefully' answer.",
      objectives: [
        "Management practices: documentation, versioning, and data lineage",
        "Compliance: retention, audits, and regulations",
        "Privacy strategies: access control, encryption, and masking",
        "Quality assurance: profiling, monitoring, and testing data quality",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA Server+ (SK0-005, V5). Launch date 2021-05-18 is well past
// CompTIA's usual ~3-year retirement window, so this was checked carefully
// rather than assumed current: confirmed live 2026-09-24 -- no retirement
// banner, no successor version mentioned, still purchasable/schedulable via
// Pearson VUE. Simply a certification CompTIA has not yet revised.
//
// 90 minutes, up to 90 questions (multiple choice and performance-based),
// passing score 750/900. Recommended experience: CompTIA A+ or equivalent
// knowledge, plus 2 years hands-on in a server environment.
// Domains: 18% / 30% / 24% / 28%.
// ---------------------------------------------------------------------------
export const SERVERPLUS_TRACK: SeedTrack = {
  code: "SERVERPLUS",
  title: "Server+ Coach",
  description:
    "CompTIA Server+ (SK0-005) exam prep across 4 weighted domains -- server hardware installation and management, server administration, security and disaster recovery, and troubleshooting.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/server/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...COMPTIA_PROVIDER,
    credentialSlug: "server-plus",
    credentialName: "CompTIA Server+",
    credentialUrl: "https://www.comptia.org/certifications/server",
    examCode: "SK0-005",
    examRevision: "V5",
    basis: "vendor_exam",
    status: "active",
    effectiveDate: "2021-05-18",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/server/",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "CompTIA A+ certification or equivalent knowledge, plus 2 years of hands-on experience in a server environment.",
    durationMinutes: 90,
    questionFormat: "Maximum 90 questions; multiple choice and performance-based",
    passingScorePolicy: "750 on a scale of 100-900.",
  },
  units: [
    {
      title: "Server Hardware Installation and Management",
      weight: 18,
      gate: "Given a physical server to rack and provision, install it correctly -- power, cooling, cabling, and the right RAID level for the workload -- and maintain it with the right out-of-band tool, not a guess.",
      objectives: [
        "Installing physical hardware: racking, cabling, power, and cooling management",
        "Deploying and managing storage: RAID levels, shared storage, and capacity planning",
        "Performing hardware maintenance: out-of-band management, firmware upgrades, and hot-swappable components",
      ],
    },
    {
      title: "Server Administration",
      weight: 30,
      gate: "Given a server to bring into production, install the OS, configure its network services, and set up the specific high-availability or virtualization approach the workload needs -- not a default, unconfigured build.",
      objectives: [
        "Installing server operating systems: partition types, file systems, and installation methods",
        "Configuring network services: IP addressing, DNS, DHCP, and VLANs",
        "Managing server functions: roles, monitoring, data migration, and performance metrics",
        "High availability: clustering, load balancing, and failover processes",
        "Virtualization: host vs. guest, resource allocation, and cloud models",
        "Scripting basics: loops, variables, and common server tasks",
        "Asset management: documentation, lifecycle management, and secure storage",
      ],
    },
    {
      title: "Security and Disaster Recovery",
      weight: 24,
      gate: "Given a server to secure or retire, apply the specific control -- encryption, MFA, hardening, or proper media destruction -- that matches the requirement, not a generic 'lock it down' answer.",
      objectives: [
        "Data security: encryption, retention policies, and lifecycle management",
        "Physical security: access controls, environmental controls, and biometric systems",
        "Identity and access management: user accounts, MFA, and permissions",
        "Mitigation strategies: malware prevention, DLP, and SIEM",
        "Server hardening: OS updates, disabling unused services, and host security",
        "Decommissioning: media destruction, recycling, and asset management",
      ],
    },
    {
      title: "Troubleshooting",
      weight: 28,
      gate: "Given a failing server, isolate the fault to hardware, software, or network before acting, and validate that a disaster-recovery plan actually works rather than assuming it does.",
      objectives: [
        "Troubleshooting hardware: power issues, storage failures, and connectivity problems",
        "Troubleshooting software: OS errors, application issues, and patching failures",
        "Troubleshooting network issues: latency, misconfigurations, and security breaches",
        "Disaster recovery: backup strategies, recovery testing, and failover validation",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA Project+ (PK0-005, V5). Launched 2022-11-08 -- past the usual
// ~3-year window, checked the same way as Server+: confirmed live
// 2026-09-24, no retirement banner, no successor version mentioned.
//
// 90 minutes, up to 90 questions (multiple choice and performance-based),
// passing score 710/900. Recommended experience: 6-12 months hands-on
// managing projects in a tech environment. Domains: 33% / 30% / 19% / 18%.
// ---------------------------------------------------------------------------
export const PROJECTPLUS_TRACK: SeedTrack = {
  code: "PROJECTPLUS",
  title: "Project+ Coach",
  description:
    "CompTIA Project+ (PK0-005) exam prep across 4 weighted domains -- project management concepts, project life cycle phases, tools and documentation, and the basics of IT governance.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/project/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...COMPTIA_PROVIDER,
    credentialSlug: "project-plus",
    credentialName: "CompTIA Project+",
    credentialUrl: "https://www.comptia.org/certifications/project",
    examCode: "PK0-005",
    examRevision: "V5",
    basis: "vendor_exam",
    status: "active",
    effectiveDate: "2022-11-08",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/project/",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "6-12 months of hands-on experience managing projects in a technology environment.",
    durationMinutes: 90,
    questionFormat: "Maximum 90 questions; multiple choice and performance-based",
    passingScorePolicy: "710 on a scale of 100-900.",
  },
  units: [
    {
      title: "Project Management Concepts",
      weight: 33,
      gate: "Given a project scenario, apply the specific concept it calls for -- agile vs. waterfall, a change-control step, a risk response -- rather than generic project-management advice.",
      objectives: [
        "Project characteristics and methodologies",
        "Agile vs. waterfall approaches",
        "Change control processes",
        "Risk management",
        "Issue management",
        "Schedule management",
        "Quality and performance management",
        "Communication management",
        "Meeting management",
        "Team and resource management",
        "Procurement and vendor selection",
      ],
    },
    {
      title: "Project Life Cycle Phases",
      weight: 30,
      gate: "Given a project at a given stage, name the phase it's in and the artifact that phase produces -- from discovery through closing -- not a generic 'plan then execute' answer.",
      objectives: [
        "Discovery phase artifacts",
        "Project initiation",
        "Project planning",
        "Project execution",
        "Project closing",
      ],
    },
    {
      title: "Tools and Documentation",
      weight: 19,
      gate: "Given a project status to communicate, pick the specific tool or chart that fits -- a quality chart, a productivity tool -- rather than defaulting to a status email.",
      objectives: [
        "Common project management tools",
        "Productivity tools",
        "Quality and performance charts",
      ],
    },
    {
      title: "Basics of IT Governance",
      weight: 18,
      gate: "Given an IT project with compliance or ESG implications, apply the specific governance concept -- information security, privacy compliance, or IT-specific change control -- that applies.",
      objectives: [
        "Environmental, social, and governance (ESG) considerations",
        "Information security basics for project managers",
        "Compliance and privacy requirements",
        "IT concepts relevant to project management",
        "Change control specific to IT and software projects",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA Tech+ (FC0-U71, V6) -- the backlog listed this item as "ITF+", but
// ITF+ (FC0-U61) was renamed and relaunched as Tech+ on 2024-07-16; ITF+ no
// longer appears anywhere in CompTIA's current catalog. Confirmed via
// CompTIA's own support article (help.comptia.org, "Tech+ FC0-U71 vs.
// FC0-U71-CE") rather than assumed from the name change alone. A second
// exam code, FC0-U71-CE, covers the same content under a 5-year renewal
// model instead of good-for-life -- this track teaches the objectives both
// codes share, credentialed under FC0-U71.
//
// 60 minutes, up to 70 questions, passing score 650/900. Launched
// 2024-07-16. No prior experience required. Domains: 13% / 24% / 18% / 13%
// / 13% / 19%.
// ---------------------------------------------------------------------------
export const TECHPLUS_TRACK: SeedTrack = {
  code: "TECHPLUS",
  title: "Tech+ Coach",
  description:
    "CompTIA Tech+ (FC0-U71) exam prep across 6 weighted domains -- tech concepts and terminology, infrastructure, applications software, software development concepts, data and database fundamentals, and security. Tech+ is CompTIA's 2024 relaunch of ITF+ (IT Fundamentals+).",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/tech/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...COMPTIA_PROVIDER,
    credentialSlug: "tech-plus",
    credentialName: "CompTIA Tech+",
    credentialUrl: "https://www.comptia.org/certifications/tech",
    examCode: "FC0-U71",
    examRevision: "V6",
    basis: "vendor_exam",
    status: "active",
    effectiveDate: "2024-07-16",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/tech/",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "No prior experience required.",
    durationMinutes: 60,
    questionFormat: "Maximum 70 questions; multiple choice",
    passingScorePolicy: "650 on a scale of 100-900.",
  },
  units: [
    {
      title: "Tech Concepts and Terminology",
      weight: 13,
      gate: "Given a computing scenario, name the specific notational system, unit of measure, or troubleshooting step it calls for -- not a vague 'it's a computer thing' answer.",
      objectives: [
        "Computing basics: input, processing, output, and storage",
        "Notational systems: binary, hexadecimal, decimal, and octal",
        "Units of measure: storage (bit, byte, KB, GB, TB), speed (MHz, GHz), and throughput (bps, Mbps, Gbps)",
        "Troubleshooting methodology: identifying problems, testing theories, implementing solutions, and documenting findings",
      ],
    },
    {
      title: "Infrastructure",
      weight: 24,
      gate: "Given a device or network to set up, identify the specific component, interface, or deployment model involved -- not a generic 'plug it in' answer.",
      objectives: [
        "Computing devices: smartphones, tablets, laptops, servers, IoT devices, and gaming consoles",
        "Internal components: motherboard, CPU, RAM, storage (HDD, SSD, NVMe), NIC, and GPU",
        "Storage types: volatile vs. non-volatile, local, network, and cloud storage",
        "Peripheral setup: printers, scanners, monitors, and driver installation",
        "Device interfaces: USB, HDMI, Ethernet, Bluetooth, and NFC",
        "Virtualization and cloud: hypervisors, SaaS, PaaS, IaaS, hybrid, and on-premises models",
        "Networking basics: LAN vs. WAN, IP/MAC addresses, routers, switches, and firewalls",
        "Wireless networks: 802.11 standards, speed, and interference considerations",
      ],
    },
    {
      title: "Applications Software",
      weight: 18,
      gate: "Given a software task, name the specific OS component, application type, or browser feature that handles it -- not a generic 'use an app' answer.",
      objectives: [
        "Operating systems: mobile, desktop, server, and embedded",
        "OS components: file systems (NTFS, FAT32), interfaces (GUI, command line), utilities, and drivers",
        "Software types: productivity tools, collaboration apps, web browsers, and remote support",
        "Web browser features: private browsing, add-ons, password management, and cache clearing",
        "Artificial intelligence basics: chatbots, assistants, and generative AI content prediction",
      ],
    },
    {
      title: "Software Development Concepts",
      weight: 13,
      gate: "Given a coding problem, identify the specific data type, programming concept, or organizational technique it needs -- not a vague 'write some code' answer.",
      objectives: [
        "Programming languages: interpreted, compiled, scripting, markup, and assembly",
        "Data types: char, strings, numbers (integers, floats), and Boolean",
        "Programming concepts: variables, constants, arrays, functions, and objects",
        "Organizational techniques: pseudocode, flowcharts, object-oriented methods, branching, and looping",
      ],
    },
    {
      title: "Data and Database Fundamentals",
      weight: 13,
      gate: "Given a dataset, name the specific database concept -- relational vs. non-relational, a key type, a query -- or the specific backup approach it calls for.",
      objectives: [
        "The value of data: data-driven decisions, reporting, and monetization",
        "Database concepts: relational vs. non-relational, tables, rows, fields, and primary/foreign keys",
        "Database use: queries, reports, scalability, and cloud vs. local storage",
        "Backup concepts: file system backups and local vs. other storage targets",
      ],
    },
    {
      title: "Security",
      weight: 19,
      gate: "Given a device or account to protect, apply the specific control -- a password practice, encryption in the right state, or a named security concept -- rather than a generic 'be secure' answer.",
      objectives: [
        "Security concepts: confidentiality, integrity, availability, authentication, and authorization",
        "Device security: anti-malware, firewalls, patching, physical security, and safe browsing",
        "Password practices: length, complexity, privacy, reuse, and password managers",
        "Encryption: data at rest, data in transit, HTTPS, VPNs, and mobile devices",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA AutoOps+ (AT0-001, V1). Confirmed current and live: launched
// 2026-06-02, not beta. Domain/objective text is CompTIA's own "exam
// objectives summary" embedded in its comptia.org page -- no separate PDF
// was found live for this exam yet, unlike the tracks below.
export const AUTOOPSPLUS_TRACK: SeedTrack = {
  code: "AUTOOPSPLUS",
  title: "AutoOps+ Coach",
  description:
    "CompTIA AutoOps+ (AT0-001) exam prep across 4 weighted domains -- automation coding concepts, system configuration, continuous integration, and continuous delivery.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/autoops/",
  sourceVerifiedAt: VERIFIED_AT_20260926,
  credential: {
    ...COMPTIA_PROVIDER,
    credentialSlug: "autoops-plus",
    credentialName: "CompTIA AutoOps+",
    credentialUrl: "https://www.comptia.org/certifications/autoops",
    examCode: "AT0-001",
    examRevision: "V1",
    basis: "vendor_exam",
    status: "active",
    effectiveDate: "2026-06-02",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/autoops/",
    lastVendorVerifiedAt: VERIFIED_AT_20260926,
    recommendedExperience:
      "2-3 years in a core IT operations role (network, cloud, or systems administrator); CompTIA Network+, Linux+, Cloud+, or Server+ recommended.",
    durationMinutes: 60,
    questionFormat: "Maximum 60 questions; multiple choice and performance-based",
    passingScorePolicy: "600 on a scale of 100-900.",
  },
  units: [
    {
      title: "Automation Coding Concepts",
      weight: 31,
      gate: "Given an automation script or a Git workflow to fix, name the specific coding, IaC, or source-control concept at fault -- not a generic 'the code is broken' answer.",
      objectives: [
        "Writing, testing, and maintaining automation scripts using variables, functions, and loops",
        "Source control practices: Git remote/local operations, branching strategies, and semantic versioning",
        "Infrastructure-as-code principles: reusability, immutability, idempotency, and declarative vs. imperative approaches",
        "Troubleshooting the code life cycle: syntax errors, runtime errors, and merge conflicts",
      ],
    },
    {
      title: "System Configuration",
      weight: 25,
      gate: "Given a drifted or misconfigured system, apply the specific configuration-management or REST API fix the scenario calls for -- not a vague 'redeploy it' answer.",
      objectives: [
        "Configuration management techniques: drift detection, remediation, and state management",
        "Automation approaches compared: remote vs. local, declarative vs. imperative, and push vs. pull methods",
        "REST API operations: create, read, update, and delete (CRUD) using APIs and associated tools",
        "Troubleshooting configuration issues: API communication failures, certificate problems, and configuration-file syntax errors",
      ],
    },
    {
      title: "Continuous Integration",
      weight: 24,
      gate: "Given a CI pipeline definition or failure, identify the specific secrets-management, artifact-management, or workflow-orchestration concept responsible.",
      objectives: [
        "CI environment factors: secrets management, artifact management, and task runners",
        "CI workflow management: orchestration, dependency handling, and automated rollback techniques",
        "Configuring basic automation pipelines: hooks, triggers, and pipeline definitions in tools such as Jenkins or GitHub Actions",
      ],
    },
    {
      title: "Continuous Delivery",
      weight: 20,
      gate: "Given a release requirement or a provider-connection risk, choose the specific delivery strategy or IAM control that fits -- not a generic 'ship it carefully' answer.",
      objectives: [
        "Continuous delivery techniques: canary, blue-green, rolling, and in-place deployment strategies",
        "Application service-level concepts: SLOs, SLAs, uptime, MTTR, and feedback loops",
        "Securing connections to providers: CLI, SDK, and IAM configuration for automated delivery pipelines",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA CloudNetX (CNX-001, V1). Confirmed current: launched 2025-02-18,
// not beta or retired. Domain/objective text sourced from CompTIA's own
// "Exam Objectives Version 1.2" PDF (fetched and text-extracted with
// pymupdf), not a third-party paraphrase.
export const CLOUDNETX_TRACK: SeedTrack = {
  code: "CLOUDNETX",
  title: "CloudNetX Coach",
  description:
    "CompTIA CloudNetX (CNX-001) exam prep across 4 weighted domains -- hybrid network architecture design, network security, operations/monitoring/performance, and troubleshooting.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/cloudnetx/",
  sourceVerifiedAt: VERIFIED_AT_20260926,
  credential: {
    ...COMPTIA_PROVIDER,
    credentialSlug: "cloudnetx",
    credentialName: "CompTIA CloudNetX",
    credentialUrl: "https://www.comptia.org/certifications/cloudnetx",
    examCode: "CNX-001",
    examRevision: "V1",
    basis: "vendor_exam",
    status: "active",
    effectiveDate: "2025-02-18",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/cloudnetx/",
    lastVendorVerifiedAt: VERIFIED_AT_20260926,
    recommendedExperience:
      "Minimum 10 years of IT experience, including 5 years in a network architect role with hybrid cloud environment experience; CompTIA Network+, Security+, and Cloud+ or equivalent experience recommended.",
    durationMinutes: 165,
    questionFormat: "Maximum 90 questions; multiple choice and performance-based",
    passingScorePolicy: "Pass/fail only; no scaled score.",
  },
  units: [
    {
      title: "Network Architecture Design",
      weight: 31,
      gate: "Given a hybrid on-prem/cloud design requirement, select the specific topology, connectivity method, or availability technology it calls for -- not a generic 'use redundancy' answer.",
      objectives: [
        "Core networking concepts applied to design: the OSI model, IPv4/IPv6 addressing and subnetting, NAT, routing and DNS protocols, and container networking",
        "Network architectures and topologies: mesh, star, hub-and-spoke, spine-and-leaf, trust zones, traffic-flow direction, and VLAN/VXLAN/GENEVE segmentation",
        "Hybrid connectivity solutions: MPLS, SD-WAN, cellular, satellite, dark fiber, public-cloud interconnects (ExpressRoute, Direct Connect), and site-to-site/point-to-site VPNs",
        "Availability technologies: load-balancing methods, active-active/active-passive high availability, link aggregation, autoscaling, regions/availability zones, and CDNs",
        "Physical campus installation factors: power distribution and backup, environmental controls, fire suppression, and physical access controls",
        "Campus wired network components: Layer 2 vs. Layer 3 devices, PoE, the three-tier hierarchy, IDF/MDF cabling, and spanning tree",
        "Campus wireless network components: access-point placement and antenna types, Wi-Fi standards and frequencies, SSIDs, and BLE/NFC/LoRaWAN",
        "Architecture documentation artifacts: requirements analysis, network diagrams, runbooks, baselines, reference architectures, and the CMDB",
      ],
    },
    {
      title: "Network Security",
      weight: 28,
      gate: "Given a described threat, vulnerability, or access requirement, apply the specific control, Zero Trust principle, or IAM mechanism that closes it -- not a generic 'add a firewall rule' answer.",
      objectives: [
        "Common cloud and network threats, vulnerabilities, and mitigations: DDoS, on-path attacks, BGP hijacking, zero-days, and patch/vulnerability management programs",
        "Security technologies: next-gen and cloud-native firewalls, WAFs, IPS/IDS, TLS inspection, and network access control",
        "Access control configuration: firewall and NACL rules, security-group inbound/outbound rules, geolocation and URL filtering, and DLP",
        "Zero Trust architecture principles: microsegmentation, SASE/SSE, CASB, identity as the perimeter, device trust, and least privilege",
        "Identity and access management: SSO/federation (SAML, OAuth 2.0, OIDC), MFA, PAM, RBAC/ABAC, PKI, and just-in-time provisioning",
        "Wireless security methods: WPA2/WPA3 encryption, PSK/PSK-enterprise authentication, captive portals, and MAC filtering",
        "Appliance-hardening techniques: patch management, default-credential management, disabling unneeded services and ports, and log management",
      ],
    },
    {
      title: "Network Operations, Monitoring, and Performance",
      weight: 16,
      gate: "Given an operational or monitoring requirement, name the specific risk-management, telemetry, or automation practice it calls for -- not a generic 'keep an eye on it' answer.",
      objectives: [
        "Operating and maintaining a network environment: risk management, business-continuity metrics (MTTR, MTBF, RPO/RTO), disaster recovery, SLAs/SLOs, and network cost management",
        "Monitoring and performance tools: traffic analysis, centralized log collection and SIEM, SNMP, QoS, alerting, telemetry, and dashboards",
        "Automation and scripting to administer a hybrid cloud environment: infrastructure as code, version control, CI/CD and GitOps pipelines, and desired-state configuration",
      ],
    },
    {
      title: "Network Troubleshooting",
      weight: 25,
      gate: "Given symptoms and tool output, walk the CompTIA troubleshooting methodology to the specific connectivity, performance, or security root cause -- not a guess at the fix.",
      objectives: [
        "The network troubleshooting methodology: identify the problem, establish and test a theory, plan and implement a solution, verify, and document",
        "Appropriate tools and commands for diagnosis: Wireshark, Nmap, Iperf, tcpdump, dig, mtr, and traceroute",
        "Analyzing tool and command output to resolve issues",
        "Troubleshooting connectivity issues: DNS failures, asymmetric routing, duplicate IP/MAC addresses, DHCP issues, IPSec and BGP problems, and routing loops",
        "Troubleshooting network performance issues: latency, packet loss, MTU/fragmentation, hairpinning, broadcast storms, and bandwidth bottlenecks",
        "Troubleshooting Wi-Fi performance issues: signal interference and loss, band-steering, channel overlap, and roaming/sticky-client problems",
        "Troubleshooting access and security issues: misconfigured rules, DoS conditions, authentication failures, and certificate problems",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA SecAI+ (CY0-001, V1). Confirmed current: launched 2026-02-17,
// CompTIA's first AI-security certification. Domain/objective text sourced
// from CompTIA's own "Exam Objectives Document Version 2.0" PDF (fetched
// and text-extracted with pymupdf). Duration/question-count/passing-score
// came from comptia.org's certification page rather than the objectives
// PDF, since the PDF still listed those fields as "TBD".
export const SECAIPLUS_TRACK: SeedTrack = {
  code: "SECAIPLUS",
  title: "SecAI+ Coach",
  description:
    "CompTIA SecAI+ (CY0-001) exam prep across 4 weighted domains -- basic AI concepts for cybersecurity, securing AI systems, AI-assisted security, and AI governance/risk/compliance.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/secai/",
  sourceVerifiedAt: VERIFIED_AT_20260926,
  credential: {
    ...COMPTIA_PROVIDER,
    credentialSlug: "secai-plus",
    credentialName: "CompTIA SecAI+",
    credentialUrl: "https://www.comptia.org/certifications/secai",
    examCode: "CY0-001",
    examRevision: "V1",
    basis: "vendor_exam",
    status: "active",
    effectiveDate: "2026-02-17",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/secai/",
    lastVendorVerifiedAt: VERIFIED_AT_20260926,
    recommendedExperience:
      "3-4 years of IT experience and approximately 2 years of hands-on cybersecurity experience.",
    durationMinutes: 60,
    questionFormat: "Maximum 60 questions; multiple choice and performance-based",
    passingScorePolicy: "600 on a scale of 100-900.",
  },
  units: [
    {
      title: "Basic AI Concepts Related to Cybersecurity",
      weight: 17,
      gate: "Given an AI system description, name the specific model type, training technique, or life-cycle stage in play -- not a generic 'it's AI' answer.",
      objectives: [
        "AI types and techniques used in cybersecurity: generative AI, machine learning, deep learning, NLP (LLMs, SLMs, GANs), model training techniques, and prompt engineering (system/user prompts, zero/one/multi-shot)",
        "The importance of data security in relation to AI: data processing and lineage, data types, watermarking, and retrieval-augmented generation (vector storage, embeddings)",
        "The importance of security throughout the AI life cycle: business use-case alignment, data collection trustworthiness, model development through deployment and monitoring, and human-centric design (human-in-the-loop, oversight, validation)",
      ],
    },
    {
      title: "Securing AI Systems",
      weight: 40,
      gate: "Given an AI deployment scenario, apply the specific model, gateway, access, or data control that mitigates the described risk -- not a generic 'add guardrails' answer.",
      objectives: [
        "AI threat-modeling frameworks: the OWASP LLM and ML Security Top 10, the MIT AI Risk Repository, and MITRE ATLAS",
        "Security controls for AI systems: model controls and guardrails, gateway controls (prompt firewalls, rate/token limits, input quotas), and guardrail testing and validation",
        "Access controls for AI systems: model access, data access, agent access, and network/API access",
        "Data security controls for AI systems: encryption in transit/at rest/in use, and data safety practices (anonymization, classification, redaction, masking, minimization)",
        "Monitoring and auditing AI systems: prompt and log monitoring, AI cost monitoring, and auditing for hallucinations, accuracy, and bias",
        "Analyzing evidence of AI-specific attacks and applying compensating controls: prompt injection, model/data poisoning, jailbreaking, model inversion and theft, and AI supply-chain attacks",
      ],
    },
    {
      title: "AI-assisted Security",
      weight: 24,
      gate: "Given a security task, name the specific AI-enabled tool, use case, or automation the scenario calls for -- and separately, the specific attack vector AI enables against it.",
      objectives: [
        "Using AI-enabled tools to facilitate security tasks: IDE/browser/CLI plug-ins, chatbots, MCP servers, and use cases like vulnerability analysis and automated penetration testing",
        "How AI enables or enhances attack vectors: deepfake impersonation and disinformation, adversarial networks, automated reconnaissance, and automated attack generation",
        "Using AI to automate security tasks: low-code/no-code scripting, AI-assisted change management, AI agents, and CI/CD security scanning",
      ],
    },
    {
      title: "AI Governance, Risk, and Compliance",
      weight: 19,
      gate: "Given an organizational AI initiative, name the specific governance structure, responsible-AI principle, or compliance framework it must satisfy -- not a generic 'follow policy' answer.",
      objectives: [
        "Organizational governance structures that support AI: AI centers of excellence, AI policies and procedures, and AI-related roles (AI architect, MLOps engineer, AI governance engineer, AI risk analyst)",
        "Principles and risks of responsible AI use: transparency, explainability, accountability, and risks such as bias introduction, accidental data leakage, IP exposure, and shadow AI",
        "The impact of compliance on AI business use and development: the EU AI Act, OECD standards, ISO AI standards, the NIST AI Risk Management Framework, and data sovereignty",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA DataAI (DY0-001, V1, formerly branded DataX). Confirmed current:
// launched 2024-07-25, not beta or retired. Domain/objective text sourced
// from CompTIA's own "Exam Objectives Version 5.0" PDF (fetched and
// text-extracted with pymupdf) -- the PDF still carries the DataX name and
// a 2023 copyright line predating the DataAI rebrand, but its exam number
// (DY0-001), domains, and weights match comptia.org's current DataAI page.
export const DATAAI_TRACK: SeedTrack = {
  code: "DATAAI",
  title: "DataAI Coach",
  description:
    "CompTIA DataAI (DY0-001, formerly DataX) exam prep across 5 weighted domains -- mathematics and statistics, modeling/analysis/outcomes, machine learning, operations and processes, and specialized data-science applications.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/dataai/",
  sourceVerifiedAt: VERIFIED_AT_20260926,
  credential: {
    ...COMPTIA_PROVIDER,
    credentialSlug: "dataai",
    credentialName: "CompTIA DataAI",
    credentialUrl: "https://www.comptia.org/certifications/dataai",
    examCode: "DY0-001",
    examRevision: "V1",
    basis: "vendor_exam",
    status: "active",
    effectiveDate: "2024-07-25",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/dataai/",
    lastVendorVerifiedAt: VERIFIED_AT_20260926,
    recommendedExperience: "A minimum of 5 years of hands-on experience as a data scientist.",
    durationMinutes: 165,
    questionFormat: "Maximum 90 questions; multiple choice and performance-based",
    passingScorePolicy: "Pass/fail only; no scaled score.",
  },
  units: [
    {
      title: "Mathematics and Statistics",
      weight: 17,
      gate: "Given a dataset or model-evaluation question, apply the specific statistical test, distribution, or linear-algebra concept it calls for -- not a generic 'run the numbers' answer.",
      objectives: [
        "Statistical methods and concepts: t-tests, chi-squared tests, ANOVA, hypothesis testing, regression performance metrics (R2, RMSE), and confusion-matrix metrics (precision, recall, F1, MCC)",
        "Probability and synthetic modeling concepts: normal/uniform/Poisson/binomial distributions, skewness and kurtosis, heteroskedasticity, Monte Carlo simulation, bootstrapping, and Bayes' rule",
        "The importance of linear algebra and calculus: matrix rank and eigenvalues, matrix operations, distance metrics (Euclidean, Manhattan, cosine), partial derivatives, and the chain rule",
        "Temporal models compared and contrasted: time series (AR, MA, ARIMA), survival analysis, and causal inference (DAGs, difference-in-differences, A/B testing, RCTs)",
      ],
    },
    {
      title: "Modeling, Analysis, and Outcomes",
      weight: 24,
      gate: "Given experiment results or a stakeholder audience, choose the specific EDA method, diagnostic check, or communication format the situation calls for -- not a generic 'analyze the data' answer.",
      objectives: [
        "Exploratory data analysis methods: univariate and multivariate analysis, and chart selection (scatter, box-and-whisker, heat map, Q-Q plot) by data type",
        "Analyzing common data issues: sparse data, non-linearity, non-stationarity, seasonality, and remediation via one-hot encoding, scaling, geocoding, or synthetic data",
        "Conducting the model design iteration process: design constraints, model selection, literature review, hyperparameter tuning, and experiment tracking",
        "Analyzing experiment and testing results to justify a final model recommendation: performance evaluation, diagnostic plots, benchmarking, and requirements validation",
        "Translating and communicating results: choosing visualizations and reports for executive, domain, and peer audiences while avoiding deceptive charting and ensuring accessibility",
        "The importance of data model and code documentation: data dictionaries, metadata, and change descriptions",
      ],
    },
    {
      title: "Machine Learning",
      weight: 24,
      gate: "Given a modeling problem, select the specific supervised, tree-based, deep-learning, or unsupervised technique it calls for -- not a generic 'train a model' answer.",
      objectives: [
        "Foundational machine-learning concepts: loss functions, the bias-variance tradeoff, class-imbalance mitigations (SMOTE, oversampling), regularization, cross-validation, ensemble models, and model drift",
        "Statistical supervised machine-learning concepts: linear and logistic regression variants (ridge, LASSO, elastic net), discriminant analysis, association rules, and naive Bayes",
        "Tree-based supervised machine-learning concepts: decision trees, random forest, boosting (XGBoost), and bootstrap aggregation",
        "Deep-learning and neural-network architecture: activation functions, layer types, backpropagation, CNNs, RNNs/LSTMs, GANs, and frameworks (PyTorch, TensorFlow/Keras)",
        "Unsupervised machine-learning concepts: k-means clustering, hierarchical and density-based (DBSCAN) clustering, dimensionality reduction (PCA, t-SNE, UMAP), and k-nearest neighbors",
      ],
    },
    {
      title: "Operations and Processes",
      weight: 22,
      gate: "Given a data-science team's workflow, name the specific ingestion, wrangling, life-cycle, or MLOps practice it's missing -- not a generic 'improve the pipeline' answer.",
      objectives: [
        "The role of data science in business functions: compliance, privacy (PII), KPIs, and translating business needs into solutions",
        "The process and purpose of obtaining different types of data: generated and synthetic data, sampling rationale, and commercial/public data licensing",
        "Data ingestion and storage concepts: GPU/TPU infrastructure, file formats (CSV, JSON, Parquet), and data orchestration and automation",
        "Data-wrangling techniques: merging and combining datasets, date/time standardization, and winsorization",
        "The data science life cycle and workflow models: CRISP-DM, version control, and clean-code practices",
        "DevOps and MLOps concepts: CI/CD pipelines, model deployment, container orchestration, and performance monitoring",
        "Data science deployment environments compared and contrasted: on-premises, cloud, hybrid, and edge",
      ],
    },
    {
      title: "Specialized Applications of Data Science",
      weight: 13,
      gate: "Given a specialized data-science problem, name the specific optimization, NLP, computer-vision, or other technique it calls for -- not a generic 'apply AI' answer.",
      objectives: [
        "Optimization concepts compared and contrasted: constrained vs. unconstrained optimization, and multi-armed bandit problems",
        "Natural language processing concepts: tokenization, word embeddings, TF-IDF, topic modeling, and NLP applications (sentiment analysis, NER, text generation)",
        "Computer vision concepts: optical character recognition, object detection and tracking, and data augmentation",
        "The purpose of other specialized applications: graph analysis, reinforcement learning, fraud and anomaly detection, and signal processing",
      ],
    },
  ],
};

export const COMPTIA_TRACKS: SeedTrack[] = [
  APLUS_CORE1_TRACK,
  APLUS_CORE2_TRACK,
  NETWORKPLUS_TRACK,
  CLOUDPLUS_TRACK,
  DATAPLUS_TRACK,
  SERVERPLUS_TRACK,
  PROJECTPLUS_TRACK,
  TECHPLUS_TRACK,
  AUTOOPSPLUS_TRACK,
  CLOUDNETX_TRACK,
  SECAIPLUS_TRACK,
  DATAAI_TRACK,
];
