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
  subcategorySlug: "it-certifications",
  credentialType: "certification",
} as const;

const VERIFIED_AT = "2026-09-24T00:00:00Z";

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
  subcategorySlug: "it-certifications",
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
  subcategorySlug: "it-certifications",
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
  subcategorySlug: "it-certifications",
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
  subcategorySlug: "it-certifications",
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
  subcategorySlug: "it-certifications",
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
  subcategorySlug: "it-certifications",
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
  subcategorySlug: "it-certifications",
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

export const COMPTIA_TRACKS: SeedTrack[] = [
  APLUS_CORE1_TRACK,
  APLUS_CORE2_TRACK,
  NETWORKPLUS_TRACK,
  CLOUDPLUS_TRACK,
  DATAPLUS_TRACK,
  SERVERPLUS_TRACK,
  PROJECTPLUS_TRACK,
];
