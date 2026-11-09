import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-159: CompTIA Security+ SY0-701 (V7) -- verifiable labs beside the
// course's existing self-reported labs.
//
// Aligned to the SY0-701 exam objectives, five domains (General Security
// Concepts 12%, Threats/Vulnerabilities/Mitigations 22%, Security
// Architecture 18%, Security Operations 28%, Security Program Management
// and Oversight 20%); exam page read 2026-11-07 (English SY0-701 retires
// 2027-06-11): https://www.comptia.org/en-us/certifications/security/v7/
// Density (docs/labs.md, policy "hybrid"): 2 / 1 / 2 / 3 / 2 = 10.
//
// Standards cited in the rubrics, each checked against the publisher's page
// on 2026-11-07:
//   - NIST SP 800-61r3 (April 2025) incident response as a CSF 2.0 Community
//     Profile: preparation is Govern/Identify/Protect, the response is
//     Detect/Respond/Recover, lessons feed Identify-Improvement (ID.IM);
//     RS.MI-01 containment, RS.MI-02 eradication, RC.RP-03/-05 integrity
//     checks, RC.RP-06 after-action report.
//     https://csrc.nist.gov/pubs/sp/800/61/r3/final
//   - CVSS v4.0 (FIRST): bands None 0 / Low 0.1-3.9 / Medium 4.0-6.9 / High
//     7.0-8.9 / Critical 9.0-10.0; scores below computed with FIRST's
//     reference calculator. https://www.first.org/cvss/v4.0/specification-document
//   - EPSS = probability a CVE is exploited in the wild in 30 days; CISA KEV
//     = reliable evidence of active exploitation (BOD 22-01).
//     https://www.first.org/epss/  https://www.cisa.gov/known-exploited-vulnerabilities
//   - NIST SP 800-63B-4 (July 2025) passwords: 15-char minimum for
//     single-factor, no composition rules, no periodic change, blocklist.
//   - ATT&CK Enterprise v20 technique IDs.
//
// Fictional organisations; IPs from documentation ranges (192.0.2.0/24,
// 198.51.100.0/24, 203.0.113.0/24) and RFC 1918; domains use .example.
// Every lab is needs_expert_review.

export const SECPLUS_LABS: SeedLabSet = {
  trackCode: "SECPLUS",
  sources: [
    source("https://www.comptia.org/en-us/certifications/security/v7/", "exam_outline", "2026-11-07"),
    source("https://csrc.nist.gov/pubs/sp/800/61/r3/final", "reference", "2026-11-07"),
    source("https://www.first.org/cvss/v4.0/specification-document", "reference", "2026-11-07"),
    source("https://www.first.org/epss/", "reference", "2026-11-07"),
    source("https://www.cisa.gov/known-exploited-vulnerabilities", "reference", "2026-11-07"),
  ],
  labs: [
    // ----- Domain 1: General Security Concepts (2)
    {
      slug: "rbac-role-design-clinic",
      objective: "Access control models: DAC, MAC, RBAC, ABAC, and least privilege",
      kind: "build",
      title: "Design the roles for a clinic's records system",
      brief:
        "Harbourview Family Clinic (fictional) is replacing per-user permissions in its patient-records system with role-based access control. Staff: 4 physicians, 6 nurses, 3 front-desk receptionists, 1 billing clerk, 1 IT administrator and a part-time external auditor who visits quarterly. Physicians and nurses read and update clinical notes and prescriptions; nurses do not sign prescriptions. Receptionists schedule appointments and see names, contact details and insurance status but no clinical notes. Billing needs procedure codes and insurance details, not notes. The IT administrator maintains the system but must not read records in normal work. The auditor needs read-only access to access logs and a sample of records, only while on site. Today everyone shares the receptionist's login when the front desk is busy.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the access-control design: the roles and what each may do, how exceptions are handled, and why RBAC rather than the other models.",
          parts: [
            part(
              "Role matrix",
              "Defines at least five distinct roles and gives each only the permissions the brief needs: nurses cannot sign prescriptions, receptionists and billing cannot read clinical notes, the auditor is read-only.",
              "Physician: read/write clinical notes, write and sign prescriptions, schedule. Nurse: read/write notes, enter but not sign prescriptions, schedule. Receptionist: scheduling and demographics/insurance status only; no notes. Billing: procedure codes and insurance details; no notes. Auditor: read-only on access logs and a defined record sample. IT Administrator: configuration, user/role management, backups -- no clinical data in normal use."
            ),
            part(
              "Administrator and auditor controls",
              "Separates the administrator's system rights from data access (a logged break-glass path reviewed afterwards) and time-boxes the auditor's access (enabled for the visit, or an account with an expiry).",
              "The administrator role manages the system but holds no clinical-record permission; an emergency break-glass account requires a reason, alerts the practice manager and is reviewed after use. The auditor account is enabled only for the quarterly visit (or expires), is read-only, and its use is logged."
            ),
            part(
              "Ending shared logins",
              "Names the shared receptionist login as the problem (no accountability, no least privilege) and replaces it with individual accounts mapped to roles, so the audit trail names a person.",
              "Shared logins break accountability and hand everyone the receptionist's rights. Each person gets their own account in the right role; the audit log then shows who did what, and a leaver is removed without changing a shared password."
            ),
            part(
              "Why RBAC here",
              "Explains RBAC fits because permissions follow stable job functions; contrasts DAC (owners grant ad hoc, hard to audit), MAC (labels/clearances, too rigid) and ABAC (attribute rules, possible later for on-site-only or shift conditions).",
              "RBAC: a few stable job functions map cleanly to permission sets that are easy to review. DAC let any record owner grant access, which caused the sprawl. MAC's labels and clearances suit classified environments, not a clinic. ABAC could later add conditions (auditor only from the clinic network, in hours) but is more than needed to start."
            ),
          ],
        },
      ],
    },
    {
      slug: "pki-internal-services-plan",
      objective: "PKI basics: certificates, certificate authorities, chains of trust, revocation (CRL/OCSP)",
      kind: "build",
      title: "Plan certificates for an internal web service",
      brief:
        "Meridian Logistics (fictional) runs an internal dispatch web application, dispatch.corp.meridian.example, used from 400 company laptops and 40 warehouse scanners. It serves a self-signed certificate; staff click through browser warnings daily, and last month a laptop on hotel Wi-Fi was redirected to a look-alike page without anyone noticing the certificate had changed. The company has an internal Windows certificate authority nobody has maintained in two years, and also owns the public domain meridian.example. The security lead asks for a certificate plan that stops the warnings, makes a swapped certificate detectable, and copes with a private key being stolen.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the certificate plan.",
          parts: [
            part(
              "Who issues and how trust is established",
              "Chooses an issuer and makes its chain trusted on every device (revive the internal CA as an offline root plus online issuing CA and push the root via management, or use a public CA for a public-DNS name). Explains trust comes from the client holding the root, not from the server certificate itself.",
              "Rebuild the internal PKI as two tiers: an offline root CA that only signs an online issuing CA. Push the root certificate to all laptops and scanners through device management (Group Policy / MDM). Clients trust the dispatch certificate because they can chain it to a root they already hold -- which a self-signed certificate never offers. A public CA would also work for a name under meridian.example that resolves internally."
            ),
            part(
              "The server certificate",
              "Specifies a certificate from a CSR generated on the server (private key never leaves it), with the exact hostname in the Subject Alternative Name, short validity (about a year or less) and renewal before expiry.",
              "Generate the key pair and CSR on the dispatch server; the issuing CA signs a certificate carrying dispatch.corp.meridian.example in the SAN, valid 12 months (shorter is better), renewed automatically about 30 days before expiry so nobody clicks through a new warning."
            ),
            part(
              "Revocation",
              "Explains a stolen key is handled by revoking at the CA and publishing status via CRL and/or OCSP (OCSP stapling preferred), notes clients must reach the CRL/OCSP location, and that short validity limits a cached revoked certificate.",
              "If the private key is stolen, revoke the certificate at the issuing CA, reissue from a fresh key, and publish the revocation: a CRL at a reachable internal URL and OCSP, with the server stapling the OCSP response so every client sees a current 'good'. Short validity means even a client that never checks revocation is exposed only until expiry."
            ),
            part(
              "Why the hotel-Wi-Fi swap goes unnoticed today",
              "Explains that with a self-signed certificate the warning is normal, so an on-path attacker's self-signed certificate looks the same; with a trusted chain a swapped certificate fails validation and the browser blocks it.",
              "Today every visit shows a warning, so an attacker's certificate on hotel Wi-Fi is indistinguishable and staff click through. Once the real certificate chains to a trusted root, an attacker's certificate will not chain (or will not match the name), the browser hard-fails, and 'never click through' becomes a rule staff can keep."
            ),
          ],
        },
      ],
    },
    // ----- Domain 2: Threats, Vulnerabilities, and Mitigations (1)
    {
      slug: "ioc-triage-auth-and-mail-logs",
      objective: "Indicators of compromise and threat-hunting fundamentals",
      kind: "case",
      title: "Triage a suspected account compromise from logs",
      brief:
        "You are a SOC analyst at Cobalt Ridge Credit Union (fictional), which uses a cloud identity provider for staff email. A member-services manager, j.alvarez, reports that colleagues received 'odd' emails apparently from her. You review logs to decide whether the account is compromised. The identity provider's sign-in log for the last day shows, from one external address (203.0.113.44) between 02:14 and 02:21 UTC, a single failed sign-in for each of 216 different staff usernames, then one successful sign-in to j.alvarez over a legacy IMAP connection with no multi-factor prompt. A later 08:03 UTC sign-in for j.alvarez came from the usual office address and passed a multi-factor push.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "That sign-in pattern is all you have for the first step.",
          ask: "Name the technique in the sign-in log, the indicators that identify it, and why the 02:21 sign-in succeeded.",
          parts: [
            part(
              "Technique and indicators",
              "Identifies password spraying (one source trying many accounts once each, staying under lockout thresholds) rather than brute force against one account; may cite ATT&CK T1110.003.",
              "Password spraying (ATT&CK T1110.003): a single source address tried 216 distinct accounts once each over about seven minutes, staying under any per-account lockout threshold. Brute force would instead hit one account many times; the breadth and the single attempt per user are the tell."
            ),
            part(
              "Why that sign-in succeeded and what the indicators of compromise are",
              "Attributes the success to a reused/weak password reached over legacy IMAP that bypassed MFA, and lists IOCs: the external source address, the legacy-auth sign-in with no MFA, the impossible gap between the 02:21 and 08:03 sources.",
              "The 02:21 sign-in used legacy IMAP authentication, which does not prompt for the push factor, so a guessed password was enough. IOCs so far: the external source 203.0.113.44, a legacy-auth session with mfa=none, and two sign-ins from very different locations hours apart (impossible travel for the same account)."
            ),
          ],
        },
        {
          text: "You confirm the account is compromised. The mailbox audit shows that shortly after the 02:21 sign-in, an inbox rule was created to file messages containing 'invoice' or 'payment' into an unread folder, and an external forwarding address was set on the mailbox. The mail gateway shows about 38 messages sent from the account to finance contacts at member businesses, each with a PDF attachment and a subject about updated remittance details.",
          ask: "What do you contain first, and what is the attacker trying to achieve?",
          parts: [
            part(
              "Containment actions",
              "Disables the session and credential first: revoke the account's active sessions/tokens, reset the password, then remove the malicious inbox rule and forwarding address and block the legacy-auth protocol for the user.",
              "Revoke j.alvarez's active sessions and tokens and force a password reset so the attacker loses access immediately; then delete the inbox rule and the external forwarding address, and disable legacy IMAP/POP for the account (and ideally tenant-wide). Preserve the mailbox audit and gateway logs first."
            ),
            part(
              "Attacker objective",
              "Reads the inbox rule, forwarding and outbound messages as business email compromise / invoice fraud: hide replies and push fraudulent payment-redirection messages to the victim's contacts.",
              "This is business email compromise aimed at invoice/payment-redirection fraud: the inbox rule hides banking and invoice replies from the real user, the forwarding exfiltrates correspondence, and the 38 look-alike 'updated remittance details' messages try to get member businesses to send payments to the attacker's account."
            ),
          ],
        },
        {
          text: "Containment is done. Leadership asks what to tell the 31 member businesses and how to stop this class of attack.",
          ask: "Give the notification and the two most effective preventive controls.",
          parts: [
            part(
              "Notification",
              "Notifies the 31 contacted businesses out of band (phone or a channel not the compromised mailbox) to disregard the remittance messages and verify any banking-detail change by a known phone number, and preserves evidence for any fraud follow-up.",
              "Contact the 31 businesses by phone or another trusted channel -- not a reply from the mailbox -- telling them to ignore the 'updated remittance details' emails and to confirm any payment-detail change by a number they already hold. Keep the logs and messages in case money moved and law enforcement is involved."
            ),
            part(
              "Preventive controls",
              "Names phishing-resistant or at least enforced MFA plus disabling legacy authentication as the controls that would have stopped the spray's success, and may add a block on auto-forwarding to external addresses and impossible-travel alerting.",
              "Enforce MFA for everyone and disable legacy authentication protocols, which together would have blocked the spray's single-factor success. Add a tenant rule blocking automatic external forwarding and a conditional-access / impossible-travel alert so a sign-in like 02:21 is challenged or flagged."
            ),
          ],
        },
      ],
    },
    // ----- Domain 3: Security Architecture (2)
    {
      slug: "zero-trust-segmentation-review",
      objective: "Defense-in-depth, network segmentation, and Zero Trust concepts",
      kind: "build",
      title: "Find the missing segmentation control in a flat network",
      brief:
        "Lakeside Manufacturing (fictional) has one flat /16 network. On it sit office laptops, the HR and finance servers, a plant-floor historian that talks to programmable logic controllers, and a guest Wi-Fi SSID that bridges onto the same subnet. Any device can reach any other on any port. A recent tabletop exercise asked: if one laptop is compromised by a phishing email, what stops the attacker reaching the finance server or the plant floor? The answer was 'nothing'. The security lead wants a segmentation and Zero Trust plan grounded in NIST SP 800-207, not a product purchase.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the segmentation and access controls.",
          parts: [
            part(
              "Segments",
              "Splits the flat network into separate segments/VLANs by trust and function -- at least user endpoints, HR/finance servers, plant-floor/OT, and guest -- and gets guest Wi-Fi off the internal subnet entirely.",
              "Create separate segments: user endpoints, a server segment for HR/finance (or one each), an isolated OT segment for the historian and PLCs, and a guest network with no path to any internal segment. Guest Wi-Fi goes straight to the internet through its own VLAN."
            ),
            part(
              "Between-segment rules",
              "Places a firewall (or equivalent policy enforcement) between segments defaulting to deny, allowing only the specific flows the business needs, and singles out the OT segment as the most restricted (only the historian's known protocol/port, no general access).",
              "Default-deny between segments; permit only required flows -- user subnet to finance app on its port, the historian's one protocol to the PLCs. Nothing routes into the OT segment except the defined historian traffic, and the OT segment initiates no internet connections."
            ),
            part(
              "Zero Trust elements (SP 800-207)",
              "Applies Zero Trust tenets: per-session access decided by dynamic policy at a policy decision/enforcement point, authenticate and authorize each request (not trust by network location), and monitor device posture -- so a compromised laptop still cannot reach finance without passing policy.",
              "Per NIST SP 800-207: treat each resource request as untrusted regardless of network location, authenticate and authorize per session at a policy decision point enforced by a policy enforcement point in front of finance and OT, and factor device health into the decision. A phished laptop then still faces an identity-and-posture check before it can reach the finance server."
            ),
            part(
              "What the attack now hits",
              "Explains how the design limits blast radius: the compromised laptop is confined to its segment, lateral movement to finance or OT is denied by default and would require passing policy, and the guest bridge is gone.",
              "The compromised laptop can talk only within the user segment; reaching finance or OT needs a flow that default-deny blocks and that Zero Trust policy would challenge. The guest-to-internal bridge, the easiest path in, no longer exists. Blast radius shrinks from the whole /16 to one segment."
            ),
          ],
        },
      ],
    },
    {
      slug: "ha-design-from-rto-rpo",
      objective: "High availability and resilience design: redundancy, failover, and capacity planning",
      kind: "build",
      title: "Design resilience to meet an RTO and RPO",
      brief:
        "Northwind Billing (fictional) runs a customer portal and its billing database in one data-centre rack: one web server, one database server, one internet circuit, one power feed. The business sets a recovery time objective (RTO) of 2 hours and a recovery point objective (RPO) of 15 minutes for the billing service, and asks for the least-cost design that meets both. Nightly backups to tape currently take about 10 hours to restore and lose up to a day of data.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the resilience design and show it meets the targets.",
          parts: [
            part(
              "Removing single points of failure",
              "Adds redundancy at each tier the brief names as single: two or more web servers behind a load balancer, a database with a replica/standby, and redundant power and network paths.",
              "At least two web servers behind a load balancer with health checks; a database primary with a synchronous or near-synchronous standby; a second internet circuit and a second power feed (or UPS plus generator). No tier is left as one of one."
            ),
            part(
              "Meeting the RPO",
              "Explains that a 15-minute RPO rules out nightly tape and needs frequent replication or log shipping (continuous or at most every 15 minutes), so at failover at most 15 minutes of data is lost.",
              "A 15-minute RPO means data can be no more than 15 minutes old at failover. Nightly tape loses up to a day, so replace it for this target with database replication (streaming/log shipping, continuous or every few minutes). Tape backups still run for longer retention and ransomware recovery, but they are not what meets the RPO."
            ),
            part(
              "Meeting the RTO",
              "Explains a 2-hour RTO needs failover faster than a 10-hour tape restore: an already-running or warm standby that is promoted, with the load balancer or DNS moving traffic, tested to confirm it fits inside 2 hours.",
              "A 2-hour RTO rules out a 10-hour tape rebuild. Keep a warm standby (database replica ready to promote, standby web capacity) so recovery is a promotion plus a traffic switch at the load balancer or DNS, not a rebuild. Measure a real failover drill against the 2 hours."
            ),
            part(
              "Capacity and proof",
              "Checks the standby has enough capacity to carry full load and plans a scheduled failover test that measures actual recovery time and data loss against the 2-hour / 15-minute targets.",
              "Size the standby for full production load, not a fraction, or the RTO is met but the service is overwhelmed. Run a scheduled failover test, time it against 2 hours and measure data loss against 15 minutes; a target you have not tested is a guess."
            ),
          ],
        },
      ],
    },
    // ----- Domain 4: Security Operations (3)
    {
      slug: "ir-lifecycle-ransomware",
      objective: "Incident response process and the NIST incident response lifecycle",
      kind: "case",
      title: "Run a ransomware incident by the NIST lifecycle",
      brief:
        "You coordinate incident response at Granite Peak Outfitters (fictional), a retailer. At 07:50 an EDR alert fires: a file server is encrypting files rapidly and dropping a ransom note in each folder. Staff report shared drives are inaccessible. You will work the incident using NIST SP 800-61r3 (the CSF 2.0 Community Profile). Point-of-sale and the e-commerce site are on a separate network and so far unaffected.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The EDR console shows the encryption process is running on one file server (FS-03) and that the same account logged into two other servers overnight.",
          ask: "What do you do in the first 30 minutes, and under which part of the lifecycle?",
          parts: [
            part(
              "Containment",
              "Contains first (RS.MI-01): isolate FS-03 from the network, disable or reset the implicated account, and move to check the two other servers -- before eradication or restore.",
              "Contain (Respond, RS.MI-01): isolate FS-03 from the network immediately (EDR network-contain or pull its link) to stop the spread, disable the account used on the other servers and reset its credentials, and flag FS-01/FS-02 for inspection. Containment comes before cleanup."
            ),
            part(
              "Detection and analysis, not a reflex wipe",
              "Preserves evidence and scopes the incident (which hosts, the entry point, the account) rather than reimaging at once; records a timeline.",
              "In parallel, analyse (Detect/Respond): capture volatile data and the EDR timeline before wiping, identify how the account was obtained and which hosts it touched, and start an incident timeline. Reimaging FS-03 now would destroy the evidence needed to find the entry point."
            ),
          ],
        },
        {
          text: "Analysis shows the account was a service account with a weak password, used from a workstation that opened a malicious attachment two days earlier. FS-03, FS-01 and that workstation are affected; backups are intact and offline.",
          ask: "Describe eradication and recovery.",
          parts: [
            part(
              "Eradication",
              "Eradicates (RS.MI-02): remove the malware/persistence from all three affected hosts (reimage rather than clean), reset the service account and any credentials it could have exposed, and remediate the entry point.",
              "Eradicate (RS.MI-02): reimage FS-03, FS-01 and the workstation rather than trusting a clean-up, rotate the service-account password and any credentials exposed on those hosts, and close the entry point (block the sender/attachment type, patch what was exploited)."
            ),
            part(
              "Recovery with integrity checks",
              "Recovers from the offline backups, verifying the restoration assets and the restored systems for integrity before and after (RC.RP-03, RC.RP-05), and restores in priority order.",
              "Recover (RC.RP): restore from the offline backups, checking the backups for indicators of compromise before use (RC.RP-03) and verifying restored systems are clean before returning them to production (RC.RP-05). Bring the most-needed shares back first and confirm normal operation."
            ),
          ],
        },
        {
          text: "Services are restored. Leadership wants the close-out.",
          ask: "What closes the incident, and what feeds back into preparation?",
          parts: [
            part(
              "After-action report",
              "Declares recovery complete against criteria and writes an after-action report documenting the incident, the actions taken and lessons learned (RC.RP-06).",
              "Declare the end of recovery against defined criteria and write an after-action report (RC.RP-06): what happened, the timeline, the response and recovery actions, and the lessons learned."
            ),
            part(
              "Lessons into improvement",
              "Feeds lessons into continuous improvement (Identify-Improvement, ID.IM): fixes that prevent a repeat -- MFA/strong passwords on service accounts, attachment filtering, faster isolation -- rather than treating the case as closed and forgotten.",
              "Per SP 800-61r3 the lessons feed the Identify-Improvement category (ID.IM): give service accounts strong credentials and least privilege, tighten attachment filtering and user training, and shorten time-to-isolate. These update the preparation controls so the next similar attempt is contained faster or prevented."
            ),
          ],
        },
      ],
    },
    {
      slug: "vuln-prioritization-cvss-epss-kev",
      objective: "Vulnerability management: scanning, CVSS scoring, and remediation prioritization",
      kind: "build",
      title: "Prioritise four scan findings with CVSS, EPSS and KEV",
      brief:
        "You run vulnerability management at Fairwind Insurance (fictional). This week's authenticated scan returns four findings. The maintenance window is small, so you must rank them and justify the order using severity, real-world exploitation and asset context -- not CVSS alone.\n\n(1) Internet-facing VPN gateway: unauthenticated remote code execution. CVSS v4.0 9.3 Critical. EPSS 0.93 (94th percentile). Listed in CISA KEV.\n(2) Internal HR database server: SQL injection reachable only by an authenticated internal user. CVSS v4.0 8.6 High. EPSS 0.04. Not in KEV.\n(3) Office printers: an information-disclosure flaw leaking device config. CVSS v4.0 6.9 Medium. EPSS 0.01. Not in KEV.\n(4) Public marketing website (static, no customer data): reflected cross-site scripting. CVSS v4.0 6.9 Medium. EPSS 0.6 (90th percentile). Not in KEV.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Rank the four and justify the order; explain what each score contributes.",
          parts: [
            part(
              "Ranking",
              "Ranks finding 1 first. Places the KEV/high-EPSS internet-facing RCE clearly ahead of the rest, and justifies not fixing strictly by CVSS number (so finding 2's 8.6 is not automatically second).",
              "Order: 1, then 4, then 2, then 3 (reasonable analysts may swap 2 and 4 with justification, but 1 is unambiguously first and 3 last). Finding 1 is fixed in the window no matter what else waits."
            ),
            part(
              "What each metric contributes",
              "Explains CVSS as severity if exploited, EPSS as the probability of exploitation in the wild in the next 30 days, and KEV as confirmed active exploitation -- and that KEV plus high EPSS on an internet-facing asset is why finding 1 outranks a higher-CVSS internal one.",
              "CVSS rates how bad exploitation would be; EPSS estimates the chance it is exploited in the wild in the next 30 days; KEV means CISA has reliable evidence it is already being exploited. Finding 1 is critical, almost certainly being exploited (KEV, EPSS 0.93) and exposed to the internet, so it beats finding 2 even though 2's path is only internal and authenticated."
            ),
            part(
              "Asset context",
              "Uses exposure and data sensitivity: internet-facing and sensitive-data assets outrank an internal printer; notes finding 4's higher EPSS is tempered by the site holding no sensitive data, and finding 2's sensitive data is tempered by needing authenticated internal access.",
              "Context moves the ranking: finding 1 is internet-facing; finding 4 has a real exploitation signal (EPSS 0.6) but the site is static with no customer data, so impact is limited; finding 2 touches sensitive HR data but needs an authenticated internal user, lowering likelihood; finding 3 is a low-severity internal printer leak. Severity alone would misrank these."
            ),
            part(
              "Handling the rest",
              "Gives the lower items a plan rather than ignoring them: schedule within policy SLAs, and a compensating control where patching waits (for example WAF/input-filtering for the XSS, network restriction for the SQLi).",
              "The unfixed items get dated remediation within the policy's SLA for their severity, not silence. Until then, apply compensating controls: input filtering or a WAF rule for the XSS, tighter network/account restriction and monitoring for the SQL injection, and a firmware update cycle for the printers."
            ),
          ],
        },
      ],
    },
    {
      slug: "forensics-order-of-volatility",
      objective: "Digital forensics basics: chain of custody, order of volatility, legal holds",
      kind: "build",
      title: "Collect evidence from a suspect laptop in the right order",
      brief:
        "An employee at Sterling & Rowe (fictional) is suspected of exfiltrating documents before resigning. Legal has issued a litigation hold. The employee's laptop is powered on at their desk, logged in, with a USB drive plugged in and a VPN session active. You are the responder asked to collect evidence that could be used in a later civil case.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the evidence-collection plan.",
          parts: [
            part(
              "Order of volatility",
              "Collects most-volatile first: memory/running state and active network connections before powering down, then disk; explains that pulling power first would lose RAM, the VPN session and open artifacts.",
              "Follow order of volatility: capture volatile data first -- a memory image and the list of running processes, logged-in sessions and active network/VPN connections -- then image the disk and the USB drive. Powering off first would destroy RAM contents, the live VPN session and anything only in memory."
            ),
            part(
              "Forensic imaging and integrity",
              "Images disks with a write-blocker to a forensic copy and hashes each image so integrity can be shown later; works from the copy, not the original.",
              "Image the laptop disk and the USB drive to forensic copies using a hardware write-blocker so the originals are unchanged, and compute a cryptographic hash of each image at acquisition. All analysis runs on verified copies; re-hashing later proves nothing changed."
            ),
            part(
              "Chain of custody",
              "Keeps a chain-of-custody record: who collected each item, when, where it was stored, and every transfer, with the originals in secure storage.",
              "Start a chain-of-custody form per item -- what it is, who seized it, date/time, and every handover and storage location -- and secure the originals (sealed, access-controlled). A gap in custody is how good evidence gets excluded."
            ),
            part(
              "Legal hold",
              "Honours the litigation hold: preserve relevant data and suspend any routine deletion/retention that would destroy it; collect without tipping off or altering scope beyond the hold.",
              "The litigation hold means normal deletion and retention policies are suspended for anything potentially relevant -- the laptop image, the USB, the employee's mailbox and file-share activity -- and must be preserved until legal releases the hold. Document that the hold was applied."
            ),
          ],
        },
      ],
    },
    // ----- Domain 5: Security Program Management and Oversight (2)
    {
      slug: "quantitative-risk-ale",
      objective: "Risk assessment: qualitative vs quantitative analysis (ALE, SLE, ARO)",
      kind: "build",
      title: "Do the risk math on a laptop-theft control",
      brief:
        "Cedar Hollow Health Partners (fictional) has 500 field laptops. Last year 20 were lost or stolen. On an unencrypted laptop, a lost device that held regulated patient data costs the organisation about $30,000 on average once breach notification, credit monitoring and investigation are counted; roughly 1 in 4 lost laptops actually held such data at the time. Full-disk encryption costs about $25 per laptop per year to license and manage and makes a lost-but-encrypted device a non-reportable loss (data unreadable). You must show leadership the numbers.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Compute the single loss expectancy, annualised rate of occurrence and annualised loss expectancy for the data-breach risk, then decide whether the control is worth it.",
          parts: [
            part(
              "SLE",
              "Computes a single loss expectancy of $30,000 (the cost of one loss that exposed regulated data), or equivalently reasons about the per-incident cost; states the figure clearly.",
              "SLE = the loss from one realised event = $30,000 (the breach-notification and response cost of one lost laptop that held regulated data)."
            ),
            part(
              "ARO",
              "Derives the annualised rate of occurrence of a data-exposing loss: 20 losses a year times the 1-in-4 chance the device held regulated data = 5 data-breach events per year.",
              "ARO = 20 lost laptops per year x 1/4 that held regulated data = 5 data-breach events per year."
            ),
            part(
              "ALE and the decision",
              "Computes ALE = SLE x ARO = $30,000 x 5 = $150,000 per year, compares it to the control cost of 500 x $25 = $12,500 per year, and recommends encryption because it removes ~$150,000 of expected annual loss for $12,500.",
              "ALE = SLE x ARO = $30,000 x 5 = $150,000 per year. Full-disk encryption costs 500 x $25 = $12,500 per year and makes an encrypted loss non-reportable, so it removes essentially all of that $150,000 expected annual loss for $12,500 -- about a 12:1 return. Encrypt the fleet; this is a clear mitigate decision."
            ),
            part(
              "Quantitative vs qualitative",
              "Notes the limits: the inputs are estimates, ALE smooths a rare-but-large event, and a qualitative view (regulatory and reputational harm) supports the same decision -- so the number guides, it does not replace judgment.",
              "The figures are estimates (the $30,000 and the 1-in-4 are averages), and ALE averages away the fact that one bad breach could cost far more. A qualitative assessment -- regulatory penalties and reputational damage from a health-data breach -- points the same way, so both methods back encrypting the fleet."
            ),
          ],
        },
      ],
    },
    {
      slug: "third-party-saas-risk-review",
      objective: "Third-party and supply-chain risk management",
      kind: "build",
      title: "Assess a SaaS vendor before onboarding",
      brief:
        "Beacon Mutual (fictional) wants to adopt a cloud SaaS tool that will store customer names, addresses and policy numbers. A business unit has already started a free trial and uploaded a spreadsheet of real customer records to evaluate it. You are asked to run a third-party risk assessment before any contract is signed. The vendor is a 15-person startup; its website shows a trust page but no named certifications.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the third-party risk assessment and the immediate action.",
          parts: [
            part(
              "Stop the data exposure now",
              "Flags the uploaded real customer data in an unvetted trial as the immediate risk and has it removed/deleted and confirmed, before the assessment proceeds.",
              "First, the business unit uploaded real customer records to an unassessed vendor -- that is a live third-party exposure. Have the data removed and deletion confirmed in writing, and use synthetic or masked data for any trial until the vendor is approved."
            ),
            part(
              "Evidence to request",
              "Lists concrete due-diligence evidence: a recognised audit/attestation (SOC 2 Type II or ISO/IEC 27001), a penetration-test summary, data-handling and subprocessor details, breach-notification commitments, and encryption of data in transit and at rest.",
              "Request a SOC 2 Type II report or ISO/IEC 27001 certificate, a recent penetration-test summary, a list of subprocessors and data locations, their breach-notification timeline, and confirmation that customer data is encrypted in transit and at rest. A 'trust page' with no evidence is not an attestation."
            ),
            part(
              "Contract controls",
              "Names contractual protections: a data processing agreement defining permitted use, a right-to-audit or evidence-on-request clause, breach-notification obligations, and secure return/deletion of data at termination.",
              "Bake controls into the contract/DPA: the vendor may process the data only for the service, must notify breaches within a set time, grants a right to audit or supply ongoing evidence, and must return or securely delete the data at the end of the agreement."
            ),
            part(
              "Risk decision and residual risk",
              "Ties approval to the evidence and startup risk (concentration/viability), proposing a risk-based decision -- approve with conditions, limit the data, or decline -- and names residual risk that remains after controls.",
              "Decide on the evidence: if the vendor can show a clean SOC 2 / ISO 27001 and sign the DPA, approve, possibly limiting the data stored given a 15-person startup's viability and concentration risk; if it cannot, restrict to non-sensitive data or decline. State the residual risk (reliance on a small vendor, trust in their controls between audits) so leadership accepts it knowingly."
            ),
          ],
        },
      ],
    },
  ],
};
