import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-159: CompTIA SecurityX CAS-005 (V5, formerly CASP+) -- verifiable
// enterprise-architecture labs beside the course's existing self-reported
// labs.
//
// Aligned to the CAS-005 objectives, four domains: Governance, Risk,
// Compliance 20%; Security Architecture 27%; Security Engineering 31%;
// Security Operations 22%. Exam page read 2026-11-07 (launched 2024-12-17,
// pass/fail, no scaled score): https://www.comptia.org/en-us/certifications/securityx/
// Density (docs/labs.md, policy "hybrid"): 2 / 3 / 3 / 2 = 10. The course
// is enterprise architecture and engineering, so the labs are design and
// decision work.
//
// Standards cited (each checked against the publisher 2026-11-07):
//   - NIST SP 800-207 Zero Trust Architecture (tenets; policy decision
//     point / policy enforcement point). https://csrc.nist.gov/pubs/sp/800/207/final
//   - NIST post-quantum standards FIPS 203 (ML-KEM) and FIPS 204 (ML-DSA),
//     both published 2024-08-13. https://csrc.nist.gov/pubs/fips/203/final
//   - NIST SP 800-61r3 (April 2025) incident response (CSF 2.0 profile).
//   - CVSS v4.0 / EPSS / CISA KEV for prioritisation at scale.
//   - OWASP, SAST/DAST/SBOM/SCA for the secure SDLC.
//
// Fictional enterprises throughout; domains use .example. Every lab is
// needs_expert_review.

export const SECURITYX_LABS: SeedLabSet = {
  trackCode: "SECURITYX",
  sources: [
    source("https://www.comptia.org/en-us/certifications/securityx/", "exam_outline", "2026-11-07"),
    source("https://csrc.nist.gov/pubs/sp/800/207/final", "reference", "2026-11-07"),
    source("https://csrc.nist.gov/pubs/fips/203/final", "reference", "2026-11-07"),
    source("https://csrc.nist.gov/pubs/sp/800/61/r3/final", "reference", "2026-11-07"),
    source("https://www.first.org/epss/", "reference", "2026-11-07"),
  ],
  labs: [
    // ----- Domain 1: Governance, Risk, Compliance (2)
    {
      slug: "multi-jurisdiction-risk-treatment",
      objective: "Enterprise risk management frameworks and risk treatment strategies",
      kind: "build",
      title: "Design a risk treatment plan across jurisdictions",
      brief:
        "Atlas Health Group (fictional) operates in the US (handling health records), the EU (handling personal data of EU residents), and runs card payments globally. A single new customer-analytics platform will process all three data types in one cloud environment. The CISO wants an enterprise risk treatment plan that satisfies the overlapping regimes without building three separate systems.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the risk and compliance treatment for the shared platform.",
          parts: [
            part(
              "Map obligations to data types",
              "Maps each regime to the data it governs (US health data, EU personal data, global cardholder data) and identifies the strictest applicable control per dimension so one platform can satisfy all.",
              "Map obligations: health records invoke HIPAA-style safeguards, EU-resident personal data invokes GDPR (lawful basis, data-subject rights, transfer rules), cardholder data invokes PCI DSS (segmentation, encryption, scope minimisation). For each control dimension, apply the strictest requirement across regimes so the single platform meets all rather than the weakest."
            ),
            part(
              "Reduce scope",
              "Uses data minimisation, segmentation and tokenization to shrink what each regime touches (e.g. tokenize card data so most of the platform is out of PCI scope; isolate health data) rather than applying every control everywhere.",
              "Shrink scope: tokenize cardholder data so the bulk of the analytics platform never holds live card numbers and falls out of PCI scope; segment and encrypt health records; minimise and pseudonymise EU personal data. Scope reduction lowers both risk and audit burden on one system."
            ),
            part(
              "Risk treatment choices",
              "Applies the four treatments (mitigate, transfer, avoid, accept) to concrete residual risks, with the data owner accepting documented residual risk and governance oversight.",
              "Treat residual risks explicitly: mitigate with the shared controls above, transfer some financial exposure via cyber-insurance, avoid processing data the business case does not need (do not collect it), and have risk owners formally accept documented residual risk under governance oversight -- recorded in the risk register."
            ),
            part(
              "Cross-border transfer and residual risk",
              "Addresses data sovereignty / cross-border transfer (EU data location and transfer mechanism) and names residual risk the board must accept.",
              "Address data sovereignty: keep EU personal data in-region or use a valid transfer mechanism, and document where each data type physically resides. State the residual risk -- concentration of three regulated data types in one environment -- so leadership accepts it knowingly, with monitoring and periodic re-assessment."
            ),
          ],
        },
      ],
    },
    {
      slug: "enterprise-bcdr-tiering",
      objective: "Business continuity and disaster recovery at an enterprise architecture level",
      kind: "build",
      title: "Tier an enterprise BC/DR plan by business impact",
      brief:
        "Bancroft Manufacturing (fictional) runs 40 business applications across two data centres and a cloud region. Leadership wants resilience 'for everything', but the budget cannot fund hot standby for 40 systems. A business impact analysis (BIA) has rated each application's criticality. You must design an enterprise BC/DR approach that spends where it matters.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the tiered BC/DR approach.",
          parts: [
            part(
              "Drive tiers from the BIA",
              "Uses the BIA to assign applications to recovery tiers with RTO/RPO targets per tier, rather than one resilience level for all 40.",
              "Group the 40 applications into recovery tiers from the BIA: a small set of mission-critical systems with aggressive RTO/RPO (e.g. the order and plant-control systems), a middle tier with moderate targets, and a low tier that can be recovered from backup over days. Let impact, not uniformity, set the spend."
            ),
            part(
              "Match strategy to tier",
              "Matches DR strategy to each tier (hot/warm standby or multi-region for the top, pilot-light/backup-restore for lower tiers), explaining the cost/recovery trade-off.",
              "Match strategy to tier: hot or warm standby (or multi-region active) for the critical few where minutes matter; pilot-light or warm standby for the middle; backup-and-restore for the low tier. Each step down trades slower recovery for much lower cost, which is why tiering beats hot standby for all 40."
            ),
            part(
              "Dependencies",
              "Accounts for inter-application and shared-service dependencies (a critical app that depends on a 'low tier' database must pull that dependency up), so tiers are consistent end to end.",
              "Map dependencies: a tier-1 application that relies on a shared database or identity service means that dependency must be recovered at tier-1 speed too, or the critical app cannot actually come back. Reconcile tiers across the dependency chain, not per app in isolation."
            ),
            part(
              "Testing and governance",
              "Includes regular DR testing (failover drills measuring real RTO/RPO) and governance to keep tiers current as the business changes.",
              "Test it: scheduled failover and restoration drills that measure actual RTO/RPO against targets for at least the critical tier, and a governance process that re-rates applications as the business changes. An untested BC/DR plan is an assumption, not a capability."
            ),
          ],
        },
      ],
    },
    // ----- Domain 2: Security Architecture (3)
    {
      slug: "zero-trust-enterprise-redesign",
      objective: "Enterprise security architecture and Zero Trust design principles",
      kind: "build",
      title: "Redesign a perimeter architecture around Zero Trust",
      brief:
        "Pinnacle Insurance (fictional) relies on a VPN-and-perimeter model: once on the corporate network or VPN, users and devices reach most internal applications freely. After an incident where one phished laptop reached dozens of internal systems, the board funds a Zero Trust redesign grounded in NIST SP 800-207. Staff are now hybrid, and several applications are SaaS.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the Zero Trust architecture and defend the key trade-offs.",
          parts: [
            part(
              "Per-request policy enforcement",
              "Replaces implicit network trust with per-request authentication/authorization at a policy decision point enforced by a policy enforcement point in front of each application (SP 800-207), independent of network location.",
              "Per NIST SP 800-207, stop trusting the network: every access request to an application is evaluated per session by a policy decision point and enforced by a policy enforcement point in front of the resource, regardless of whether the user is in the office, on VPN or remote. Being 'on the network' grants nothing."
            ),
            part(
              "Identity and device signals",
              "Bases access decisions on strong identity (MFA/phishing-resistant) plus device posture (health, managed state) and least privilege, so a phished laptop still fails the posture/identity check.",
              "Access decisions use strong, phishing-resistant identity (MFA/passkeys) and device-posture signals (managed, patched, healthy), combined with least-privilege authorization per application. A compromised laptop then still cannot reach finance or claims systems without passing identity and posture, limiting blast radius to what that one session is entitled to."
            ),
            part(
              "Microsegmentation",
              "Adds microsegmentation so east-west movement between internal systems is denied by default, directly addressing the 'one laptop reached dozens' failure.",
              "Microsegment internal systems so lateral (east-west) traffic is default-deny and allowed only for defined flows. This is the direct fix for the incident: a foothold on one system can no longer freely reach dozens of others."
            ),
            part(
              "SaaS and the trade-offs",
              "Extends Zero Trust to SaaS (via SSO/identity broker and conditional access, since there is no network perimeter to a SaaS app) and names the trade-offs (user experience, policy-engine as a critical dependency, phased rollout).",
              "Bring SaaS under the same policy via SSO/identity brokering and conditional access, since there is no network path to wrap. Trade-offs to own: the policy engine becomes a critical, highly available dependency; overly strict policies hurt user experience and get bypassed; so roll out in phases, monitor, and keep a tested fallback. Zero Trust is a programme, not a product."
            ),
          ],
        },
      ],
    },
    {
      slug: "enterprise-iam-architecture",
      objective: "Identity and access management architecture at enterprise scale",
      kind: "build",
      title: "Architect IAM for a multi-company enterprise",
      brief:
        "Kestrel Holdings (fictional) has grown by acquisition and now runs four subsidiaries, each with its own directory, plus dozens of SaaS apps and some legacy on-prem systems. Users have multiple accounts, joiners wait days for access, leavers keep access for weeks, and auditors cannot answer 'who can access what'. You must design the enterprise IAM architecture.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the enterprise IAM architecture.",
          parts: [
            part(
              "Single authoritative identity and federation",
              "Establishes one authoritative identity source (or identity fabric) and federates the subsidiary directories and SaaS via standards (SAML/OIDC) so a person has one identity, with SSO.",
              "Create one authoritative identity per person (an identity provider / identity fabric) and federate the four subsidiary directories and the SaaS apps to it with SAML/OIDC, delivering SSO. One identity replaces the scattered multiple accounts and gives a single place to see and control access."
            ),
            part(
              "Lifecycle automation",
              "Automates joiner/mover/leaver provisioning and deprovisioning from an authoritative HR source so access is granted on day one and revoked immediately on departure.",
              "Drive provisioning and deprovisioning from HR as the authoritative source: automated joiner/mover/leaver workflows grant the right access on day one and revoke it immediately on departure, fixing both the multi-day onboarding wait and the weeks-long leaver exposure."
            ),
            part(
              "Access model and governance",
              "Uses role-based (and attribute-based where needed) access with periodic access reviews/certification so auditors can answer 'who can access what' and least privilege is maintained.",
              "Model access with roles (RBAC), using attributes (ABAC) for finer conditions, and run periodic access certification/reviews. That gives auditors a clear 'who can access what', enforces least privilege, and catches privilege creep from the acquisitions."
            ),
            part(
              "Privileged access and legacy",
              "Adds privileged access management (vaulting, just-in-time, session monitoring) for admin accounts and a plan for legacy systems that cannot federate (gateways/proxies or compensating controls).",
              "Put privileged accounts under PAM: vault credentials, grant admin rights just-in-time with approval, and monitor sessions. For legacy systems that cannot federate, front them with an access gateway/proxy or apply compensating controls and tighter monitoring until they can be retired."
            ),
          ],
        },
      ],
    },
    {
      slug: "data-security-architecture-lifecycle",
      objective: "Data security architecture: classification, protection, and lifecycle",
      kind: "build",
      title: "Architect data protection across the data lifecycle",
      brief:
        "Rowan Financial (fictional) holds customer PII, financial records and internal documents with no consistent classification or protection scheme. Data is copied freely into spreadsheets, shared drives and a data lake. Leadership wants a data security architecture covering classification through disposal, so protection matches sensitivity across its lifecycle.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the data security architecture.",
          parts: [
            part(
              "Classification",
              "Defines a classification scheme (e.g. public / internal / confidential / restricted) with criteria and ownership, so protection can be driven by label.",
              "Define a classification scheme -- for example Public, Internal, Confidential, Restricted -- with clear criteria and a data owner per category. Classification is the foundation: protection, access and retention all key off the label, so PII and financial records are Restricted/Confidential and get the strongest controls."
            ),
            part(
              "Protection matched to state",
              "Specifies controls per data state (at rest, in transit, in use): encryption at rest and in transit, tokenization/masking for sensitive fields, and access controls, matched to classification.",
              "Protect by state and label: encrypt Restricted/Confidential data at rest and in transit, tokenize or mask sensitive fields (card/account numbers) especially in the data lake and spreadsheets, and enforce least-privilege access. The control strength follows the classification, not a one-size approach."
            ),
            part(
              "Preventing uncontrolled copies",
              "Addresses the sprawl: DLP and governance to control copying PII into spreadsheets/shared drives, and governed access to the data lake, so classification survives movement.",
              "Stop uncontrolled spread: deploy data loss prevention to detect and block Restricted data being copied to uncontrolled spreadsheets or external shares, govern the data lake with cataloguing and access controls, and label data so its classification and protection travel with it rather than being lost on copy."
            ),
            part(
              "Lifecycle: retention and disposal",
              "Covers the full lifecycle including retention schedules and secure disposal, so data is not kept past need and is destroyed securely, with legal-hold handling.",
              "Manage the whole lifecycle: retention schedules so data is kept only as long as needed (and required), secure disposal/cryptographic erasure at end of life, and legal-hold handling that suspends disposal when required. Data minimisation reduces both risk and cost -- what you do not keep cannot be breached."
            ),
          ],
        },
      ],
    },
    // ----- Domain 3: Security Engineering (3)
    {
      slug: "applied-crypto-and-pqc",
      objective: "Advanced cryptographic concepts and applied cryptography design",
      kind: "build",
      title: "Design cryptography for a long-lived data system",
      brief:
        "Halcyon Archive (fictional) stores legal and medical records that must stay confidential for 25+ years, plus a public API secured with TLS. The security architect asks for a cryptographic design covering data at rest, data in transit, key management, and the long-term 'harvest now, decrypt later' quantum concern, referencing current NIST standards.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the cryptographic architecture.",
          parts: [
            part(
              "At rest and in transit",
              "Specifies strong symmetric encryption at rest (e.g. AES-256) and TLS with modern cipher suites in transit, with per-object/field keys where appropriate.",
              "Encrypt data at rest with a strong symmetric algorithm (AES-256) using per-dataset or per-field keys so a single key loss is contained, and secure the API in transit with TLS 1.2+/1.3 using modern, forward-secret cipher suites. Match algorithm strength to a 25-year confidentiality horizon."
            ),
            part(
              "Key management",
              "Centres the design on key management: generation, storage (HSM/KMS), rotation, separation of duties and key escrow/recovery for long-lived data, noting crypto fails at key management, not the algorithm.",
              "Key management is the crux: generate and store keys in an HSM or managed KMS, enforce rotation and separation of duties, and -- because this data outlives staff and systems -- plan key escrow/recovery and re-encryption so a 25-year-old record is still recoverable. Most cryptographic failures are key-management failures, not broken algorithms."
            ),
            part(
              "Harvest-now-decrypt-later and PQC",
              "Addresses the quantum risk for long-lived data: adversaries can capture ciphertext now and decrypt later, so plan migration to NIST post-quantum standards (ML-KEM / FIPS 203 for key establishment, ML-DSA / FIPS 204 for signatures), likely in hybrid mode.",
              "For 25-year confidentiality the 'harvest now, decrypt later' threat is real: an adversary can store today's TLS/archived ciphertext and decrypt it once a quantum computer exists. Plan migration to NIST's post-quantum standards -- ML-KEM (FIPS 203) for key establishment and ML-DSA (FIPS 204) for signatures, both finalised 2024-08-13 -- deployed in hybrid (classical + PQC) mode during transition so long-lived secrets are protected now."
            ),
            part(
              "Crypto-agility",
              "Builds in crypto-agility so algorithms can be swapped as standards evolve, rather than hard-coding one algorithm into the archive.",
              "Design for crypto-agility: abstract the algorithm and key choices so they can be replaced without re-architecting, and plan periodic re-encryption. Over a 25-year life the algorithms will change at least once; the system must be able to move without a rebuild."
            ),
          ],
        },
      ],
    },
    {
      slug: "devsecops-pipeline-controls",
      objective: "Secure software development lifecycle and DevSecOps integration",
      kind: "build",
      title: "Embed security into a CI/CD pipeline",
      brief:
        "Vireo Software (fictional) ships a SaaS product with daily deploys. Security is a manual pen test once a year, and vulnerabilities reach production routinely. Leadership wants security built into the SDLC and CI/CD pipeline without stopping daily delivery. You must design the DevSecOps controls and where each sits.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the DevSecOps controls across the pipeline.",
          parts: [
            part(
              "Shift-left code and dependency checks",
              "Places SAST and SCA/SBOM early in the pipeline (on commit/PR) so code flaws and vulnerable dependencies are caught before merge, not in an annual test.",
              "Shift left: run static application security testing (SAST) on commits/pull requests to catch code flaws, and software composition analysis (SCA) with an SBOM to flag vulnerable and licence-risky dependencies before merge. Finding issues at the keyboard is far cheaper than finding them in a yearly pen test."
            ),
            part(
              "Build and pre-deploy checks",
              "Adds secrets scanning, container/image scanning and DAST against a staging build, with policy gates that fail the build on serious findings.",
              "In the build and pre-deploy stages: scan for hardcoded secrets, scan container images for known vulnerabilities, and run dynamic testing (DAST) against a staging deploy. Gate the pipeline so a critical finding fails the build -- security checks that only warn get ignored."
            ),
            part(
              "Keeping delivery fast",
              "Tunes gates to avoid blocking daily delivery on noise: risk-based thresholds, fast incremental scans, triage of findings, and breaking the build only on high-confidence serious issues.",
              "Keep daily delivery moving: use incremental/fast scans, set risk-based gate thresholds (block on confirmed criticals, triage the rest into backlog with SLAs), and tune out false positives so developers trust the gate. A pipeline that cries wolf gets bypassed, which is worse than no gate."
            ),
            part(
              "Runtime and feedback loop",
              "Closes the loop with runtime protection/monitoring and feeding production findings back into the backlog, plus periodic deeper testing -- defence in depth across the lifecycle.",
              "Add runtime monitoring/protection and feed production vulnerability findings back into the development backlog, and keep periodic deeper manual testing for logic flaws the tools miss. The annual pen test becomes one layer in a continuous process, not the only check."
            ),
          ],
        },
      ],
    },
    {
      slug: "secure-b2b-integration",
      objective: "Secure system and application integration across enterprise boundaries",
      kind: "build",
      title: "Secure an integration across an enterprise boundary",
      brief:
        "Cedarpoint Bank (fictional) must integrate with a third-party loan-origination partner: the partner's systems will call Cedarpoint's API to submit applications and retrieve decisions, exchanging customer financial data. You must design the secure integration across the organisational boundary -- authentication, data protection, authorization and monitoring.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the secure cross-boundary integration.",
          parts: [
            part(
              "Strong mutual authentication",
              "Specifies strong service-to-service authentication (mutual TLS and/or signed tokens/OAuth client credentials), not a shared static API key, so each side proves its identity.",
              "Authenticate both ends strongly: mutual TLS between the partner and the API and/or OAuth 2.0 client-credentials with short-lived signed tokens, rather than a single static shared API key. Each request must prove it comes from the authorised partner service."
            ),
            part(
              "Data protection and minimisation",
              "Protects the financial data in transit (TLS) and limits exposure (only the necessary fields, encryption, no sensitive data in URLs/logs), honouring data minimisation across the boundary.",
              "Protect the data: TLS for everything crossing the boundary, send only the fields the partner needs (data minimisation), keep sensitive values out of URLs and logs, and define retention on both sides. The partner should never receive more customer data than the loan decision requires."
            ),
            part(
              "Authorization and scoping",
              "Scopes the partner's access to only the specific endpoints/operations it needs (least privilege at the API), with per-partner authorization so a compromised partner cannot reach everything.",
              "Authorize narrowly: the partner's credentials are scoped to only the submit-application and retrieve-decision operations, nothing else, enforced server-side per request. If the partner is compromised, least-privilege scoping limits what the attacker can reach through that trust relationship."
            ),
            part(
              "Monitoring and the agreement",
              "Adds rate limiting, input validation, logging/monitoring of the integration, and ties it to a contract/DPA (SLA, breach notification, right to audit) governing the third party.",
              "Operationally: validate all input, rate-limit the partner, and log/monitor the integration for anomalies (volume spikes, unusual queries). Back it with an agreement -- a DPA/SLA covering data handling, breach notification and a right to audit -- because a secure integration still depends on the partner's own security, which must be governed, not assumed."
            ),
          ],
        },
      ],
    },
    // ----- Domain 4: Security Operations (2)
    {
      slug: "enterprise-ir-leadership",
      objective: "Incident response leadership across complex, multi-team environments",
      kind: "case",
      title: "Lead a cross-team enterprise incident",
      brief:
        "You are the incident commander at Stonebridge Retail (fictional). A ransomware-style intrusion is unfolding across the corporate network; point-of-sale appears affected in some stores. Multiple teams are involved: SOC, infrastructure, the store operations team, legal, communications, and an external forensics firm. You coordinate the response per NIST SP 800-61r3 while keeping teams aligned.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The SOC wants to pull every affected system offline immediately; store operations objects that taking POS down loses the trading day; legal asks about notification duties. Everyone is messaging at once.",
          ask: "How do you lead the first phase: structure, decision, and communication?",
          parts: [
            part(
              "Command structure and roles",
              "Establishes incident command: a single incident commander (you), clear roles per team, one coordination channel, and a decision cadence -- so the response is coordinated, not everyone acting at once.",
              "Set up incident command: you are the single decision-maker, with defined roles -- SOC does detection/containment, infrastructure executes isolation, store ops advises on business impact, legal/comms handle obligations, forensics preserves evidence. One coordination channel and a regular update cadence replace the all-at-once messaging."
            ),
            part(
              "Balancing containment against business impact",
              "Makes a risk-based containment decision weighing SOC's isolate-everything against store ops' trading loss -- e.g. contain confirmed-affected systems and segment POS rather than a blanket shutdown -- as a commander's call informed by both.",
              "Decide containment on risk, not the loudest voice: isolate confirmed-affected systems and segment the POS network to stop spread, rather than a blanket shutdown that needlessly loses the trading day where stores are unaffected -- or a full POS shutdown if spread to POS is confirmed. The commander weighs security and business impact together and owns the call."
            ),
          ],
        },
        {
          text: "Containment is holding. Forensics confirms customer payment data may have been accessed in affected stores. Media are starting to ask questions.",
          ask: "How do you manage notification, communication and the move toward recovery?",
          parts: [
            part(
              "Notification and external communication",
              "Coordinates legal and comms for required breach notifications (customers, regulators, card brands as applicable) and consistent external messaging, driven by legal timelines -- not ad hoc statements.",
              "Have legal determine notification obligations (customers, regulators, card networks) and timelines given confirmed payment-data exposure, and route all external messaging through communications so it is consistent and does not outrun the facts. No team improvises a public statement."
            ),
            part(
              "Coordinated recovery and lessons",
              "Moves to coordinated recovery (verified-clean restoration in priority order across teams) and plans the post-incident review feeding lessons into preparation (SP 800-61r3 improvement).",
              "Drive recovery in a coordinated way: restore verified-clean systems in business-priority order with forensics clearing each, bring stores back as POS is confirmed safe, and then run a post-incident review. Per SP 800-61r3, feed the lessons (segmentation gaps, detection delay, coordination friction) into preparation so the enterprise is readier next time."
            ),
          ],
        },
      ],
    },
    {
      slug: "enterprise-vuln-management-scale",
      objective: "Vulnerability management at enterprise scale",
      kind: "build",
      title: "Operate vulnerability management across a large estate",
      brief:
        "Monarch Logistics (fictional) scans 20,000 assets weekly and drowns in findings -- hundreds of thousands of open items, no clear priority, and remediation teams ignoring the reports. You must design an enterprise vulnerability-management programme that turns scan data into effective, prioritised action.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the enterprise vulnerability-management programme.",
          parts: [
            part(
              "Risk-based prioritisation at scale",
              "Replaces raw CVSS counts with risk-based prioritisation combining severity, exploitation signal (EPSS/KEV) and asset context (exposure, business criticality) so teams fix the few that matter.",
              "Prioritise by risk, not volume: combine CVSS severity with exploitation signal (EPSS probability, CISA KEV active-exploitation) and asset context (internet-facing, business-critical, data sensitivity). Of hundreds of thousands of findings, this surfaces the few thousand that actually matter, which is what makes remediation teams engage."
            ),
            part(
              "Asset inventory and ownership",
              "Grounds the programme in an accurate asset inventory with clear owners, so each finding routes to someone accountable rather than a report nobody owns.",
              "Base it on an accurate, owned asset inventory: every asset has a remediation owner, so a prioritised finding becomes a ticket to an accountable team, not a line in a report nobody reads. Unknown and unowned assets are themselves a top finding."
            ),
            part(
              "SLAs and governance",
              "Sets remediation SLAs by risk tier, tracks against them, and reports metrics to leadership so the programme is governed and measurable.",
              "Set remediation SLAs by risk tier (e.g. KEV/internet-facing criticals in days, lower risk in weeks/cycles), track compliance, and report trend metrics (open criticals, mean time to remediate, SLA adherence) to leadership. Governance and visibility drive the behaviour change raw scan output never achieved."
            ),
            part(
              "Compensating controls and verification",
              "Handles what cannot be patched quickly (compensating controls, documented exceptions) and verifies fixes (re-scan), closing the loop at scale.",
              "For what cannot be patched in SLA, apply compensating controls (segmentation, virtual patching, monitoring) under documented, time-boxed exceptions, and verify every remediation by re-scan. At enterprise scale the programme must prove risk is actually going down, not just that tickets closed."
            ),
          ],
        },
      ],
    },
  ],
};
