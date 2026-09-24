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

export const COMPTIA_TRACKS: SeedTrack[] = [
  APLUS_CORE1_TRACK,
  APLUS_CORE2_TRACK,
  NETWORKPLUS_TRACK,
];
