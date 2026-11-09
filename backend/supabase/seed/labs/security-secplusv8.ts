import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-159: CompTIA Security+ SY0-801 (V8) -- verifiable labs beside the
// course's existing self-reported labs.
//
// Aligned to the SY0-801 exam objectives (Document Version 2.0), five
// domains: General Security Concepts 16%, Threats/Vulnerabilities/Attacks
// 24%, Security Architecture 19%, Security Operations 27%, Security Program
// Management and Oversight 14%. Exam page and objectives PDF read
// 2026-11-07 (launch 2026-11-17):
//   https://www.comptia.org/en-us/certifications/security/v8/
//   https://lecbyo.files.cmp.optimizely.com/download/77f3bd3223ac11f180820e495f189928
// Density (docs/labs.md, policy "hybrid"): 2 / 2 / 2 / 3 / 2 = 11. Labs lean
// into V8's new AI objectives (prompt-injection/jailbreak threats, AI in
// SecOps) alongside the enduring skills.
//
// Standards cited (each checked against the publisher on 2026-11-07):
//   - CVSS v4.0 (FIRST): base metrics, Threat metric E (X scored as A),
//     bands None 0 / Low 0.1-3.9 / Medium 4.0-6.9 / High 7.0-8.9 /
//     Critical 9.0-10.0. Scores computed with FIRST's reference calculator.
//     https://www.first.org/cvss/v4.0/specification-document
//   - NIST SP 800-63B-4 (July 2025) passwords: 15-char minimum for
//     single-factor, 8 within MFA, no composition rules, no periodic change,
//     blocklist screening, hash with a slow salted algorithm.
//     https://csrc.nist.gov/pubs/sp/800/63/b/4/final
//   - OWASP Top 10 for LLM Applications 2025 (LLM01 Prompt Injection, LLM02
//     Sensitive Information Disclosure, LLM06 Excessive Agency, ...).
//     https://genai.owasp.org/llm-top10/
//   - MITRE ATLAS (AML.T0051 LLM Prompt Injection, AML.T0054 LLM Jailbreak).
//     https://atlas.mitre.org/
//   - SPF/DKIM/DMARC (RFC 7208, 6376, 7489). ATT&CK Enterprise v20 IDs.
//   - Cyber Kill Chain (Lockheed Martin), Diamond Model, MITRE ATT&CK.
//
// Fictional organisations; IPs from documentation ranges; domains use
// .example. Every lab is needs_expert_review.

export const SECPLUSV8_LABS: SeedLabSet = {
  trackCode: "SECPLUSV8",
  sources: [
    source("https://www.comptia.org/en-us/certifications/security/v8/", "exam_outline", "2026-11-07"),
    source("https://lecbyo.files.cmp.optimizely.com/download/77f3bd3223ac11f180820e495f189928", "reference", "2026-11-07"),
    source("https://www.first.org/cvss/v4.0/specification-document", "reference", "2026-11-07"),
    source("https://csrc.nist.gov/pubs/sp/800/63/b/4/final", "reference", "2026-11-07"),
    source("https://genai.owasp.org/llm-top10/", "reference", "2026-11-07"),
    source("https://atlas.mitre.org/", "reference", "2026-11-07"),
  ],
  labs: [
    // ----- Domain 1: General Security Concepts (2)
    {
      slug: "change-request-patch-server",
      objective:
        "Given a change request, run the business process: change advisory board (CAB) approval process, ownership, stakeholders, impact analysis, test results, backout planning, fail forward, maintenance window, standard operating procedures (SOPs)",
      kind: "build",
      title: "Write a change request to patch a production server",
      brief:
        "At Tidewater Retail (fictional) a critical vulnerability must be patched on the production order-database server, DB-PROD-01, which the e-commerce site depends on. An engineer wants to apply the patch this afternoon during business hours 'because it's urgent'. You must turn this into a proper change request for the change advisory board (CAB).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the change request.",
          parts: [
            part(
              "Ownership, stakeholders, approval",
              "Names a change owner, the stakeholders to notify (e-commerce/business, DBA, on-call), and that the CAB must approve before implementation rather than an engineer patching ad hoc.",
              "Change owner: the database administrator. Stakeholders: e-commerce business owner, application team, on-call lead, customer support. The CAB reviews and approves before any change; an urgent patch can go through an emergency change process, but it is still authorised and recorded, not applied on a whim."
            ),
            part(
              "Impact analysis and maintenance window",
              "Does an impact analysis (what depends on DB-PROD-01, downtime/service restart expected, affected customers) and schedules a maintenance window rather than patching live in business hours.",
              "Impact analysis: the e-commerce site cannot take orders while the database restarts, so the change causes a short outage and must run in a low-traffic maintenance window (e.g. 02:00-03:00), not during business hours. Note dependencies and whether a service/application restart is required."
            ),
            part(
              "Test results",
              "Requires the patch be validated in a test/staging environment first and the results attached to the request.",
              "Attach test results: the patch applied to a staging copy of DB-PROD-01 without breaking the application, with regression checks on order flow, before it touches production."
            ),
            part(
              "Backout and documentation",
              "Includes a backout plan (snapshot/backup and how to roll back) and, where rollback is impractical, a fail-forward plan; and states the documentation to update afterward (diagram/CMDB, SOP, version control).",
              "Backout plan: take a verified backup/snapshot before patching and document how to restore if the server fails to come up; where a rollback is not feasible, define a fail-forward fix. After the change, update the configuration records/diagram, the patch SOP and version control so the next person has an accurate picture."
            ),
          ],
        },
      ],
    },
    {
      slug: "password-storage-hashing",
      objective: "Digital signatures, salting, obfuscation, hashing algorithms, and the cryptographic tools that implement them",
      kind: "build",
      title: "Fix how an app stores passwords",
      brief:
        "A developer at Juniper Apps (fictional) stored user passwords as unsalted SHA-256 hashes 'because SHA-256 is strong'. A code review flags it. You must explain the weakness and specify how passwords should be stored, with reference to current NIST guidance (SP 800-63B).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the weakness and specify the correct password storage.",
          parts: [
            part(
              "Why unsalted fast hashes fail",
              "Explains that SHA-256 is fast, so attackers can try billions of guesses per second, and that without a per-user salt identical passwords share a hash and precomputed (rainbow) tables apply.",
              "SHA-256 is a fast general-purpose hash, so a stolen database can be attacked at billions of guesses per second with wordlists. With no salt, two users with the same password get the same hash, and precomputed rainbow tables crack common passwords instantly."
            ),
            part(
              "Salt",
              "Specifies a unique random salt per password, stored alongside the hash, so equal passwords differ and rainbow tables do not apply.",
              "Generate a unique random salt per user, store it with the hash; now identical passwords produce different stored values and an attacker must attack each one separately, defeating rainbow tables."
            ),
            part(
              "Slow, purpose-built algorithm",
              "Replaces the fast hash with a slow password-hashing function (bcrypt, scrypt or Argon2) with a tuned work factor, so each guess is expensive.",
              "Use a slow, memory-hard password hashing function -- Argon2id, scrypt or bcrypt -- with a work factor tuned so one hash takes a noticeable fraction of a second. That makes mass guessing of a stolen database impractical. (These salt internally, but the principle is the same.)"
            ),
            part(
              "Policy per NIST SP 800-63B",
              "Cites current NIST password rules: a minimum length (15 characters for a single-factor password), screen against a blocklist of known/compromised passwords, and do not force periodic change or composition rules; change only on evidence of compromise.",
              "Per NIST SP 800-63B-4 (2025): require at least 15 characters for a password used as a single factor, screen new passwords against a blocklist of common/compromised values, and do NOT impose composition rules or periodic expiry -- force a change only when there is evidence the password is compromised."
            ),
          ],
        },
      ],
    },
    // ----- Domain 2: Threats, Vulnerabilities, and Attacks (2)
    {
      slug: "cvss4-score-a-finding",
      objective:
        "Vulnerability characteristics: scoring with the Common Vulnerability Scoring System (CVSS), prioritization, vulnerability types, and Common Vulnerabilities and Exposures (CVE) identifiers",
      kind: "build",
      title: "Score a vulnerability with CVSS v4.0",
      brief:
        "A CVE affects the web admin console of a device deployed at Rampart Systems (fictional). Facts, confirmed by the vendor advisory: an unauthenticated attacker who can reach the console over the network can run commands as root on the device with a single crafted request (no user interaction, no special preconditions). The device itself is fully compromised; the flaw does not, by itself, give access to other systems. A working exploit has been published. You must produce a CVSS v4.0 Base and Base+Threat score and the vector.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the CVSS v4.0 base metric values with a one-line reason each, the resulting Base score and severity, and how the published exploit changes the Base+Threat score.",
          parts: [
            part(
              "Exploitability metrics",
              "Sets Attack Vector: Network, Attack Complexity: Low, Attack Requirements: None, Privileges Required: None, User Interaction: None, each with a correct justification from the brief.",
              "AV:N (reachable over the network), AC:L (a single crafted request, no special conditions), AT:N (no prerequisite target conditions), PR:N (unauthenticated), UI:N (no user interaction). Vector so far: AV:N/AC:L/AT:N/PR:N/UI:N."
            ),
            part(
              "Impact metrics",
              "Sets Vulnerable System impact VC:H/VI:H/VA:H (device fully compromised) and Subsequent System impact SC:N/SI:N/SA:N (does not reach other systems on its own).",
              "On the vulnerable system: VC:H/VI:H/VA:H (root on the device = full confidentiality, integrity and availability loss). Subsequent system: SC:N/SI:N/SA:N (the flaw alone does not compromise other systems). Full vector: CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N."
            ),
            part(
              "Base score and severity",
              "States the CVSS v4.0 Base score is 9.3 (Critical) for that vector, matching the FIRST calculator and the bands (Critical 9.0-10.0).",
              "That vector scores 9.3, which is Critical (9.0-10.0 band). An unauthenticated network RCE with full impact is at the top of the scale."
            ),
            part(
              "Threat metric",
              "Explains the Exploit Maturity (E) metric: a published exploit sets E:Attacked, and that the default E:X (Not Defined) is already treated as the worst case (Attacked), so here Base and Base+Threat are both 9.3; a value like E:U (Unreported) would lower it.",
              "The published working exploit sets Exploit Maturity E:A (Attacked). Note CVSS v4.0 treats the default E:X as equivalent to E:A (worst case) when scoring, so the Base+Threat score is also 9.3 here. If no exploitation were known (E:U, Unreported) the Base+Threat score would drop below the base -- the threat metric can only lower, never raise, the base."
            ),
          ],
        },
      ],
    },
    {
      slug: "llm-prompt-injection-triage",
      objective: "AI prompt and runtime threats: prompt injection, jailbreaking, hallucinations, session hijacking, code execution",
      kind: "case",
      title: "Investigate a prompt-injection incident in an AI assistant",
      brief:
        "Solace Software (fictional) built an internal AI assistant that answers staff questions and can call two tools: a document-search tool over the company wiki and an email-send tool. A support engineer reports the assistant emailed a summary of an internal salary document to an outside address after they asked it to 'summarise the latest HR policy page'. You investigate using the OWASP Top 10 for LLM Applications and MITRE ATLAS as references. No real salary data is reproduced here.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The assistant's trace shows it retrieved a wiki page that, buried in its text, contained instructions addressed to the AI telling it to find the salary document and email it to an external address. The assistant followed those instructions.",
          ask: "Name the attack class and why it worked.",
          parts: [
            part(
              "Attack class",
              "Identifies indirect prompt injection (instructions hidden in retrieved content that the model treats as commands), mapping to OWASP LLM01 Prompt Injection and/or MITRE ATLAS AML.T0051 (indirect).",
              "Indirect prompt injection: attacker-controlled text inside a retrieved document was interpreted by the model as instructions. This is OWASP LLM01:2025 Prompt Injection and MITRE ATLAS AML.T0051 (LLM Prompt Injection, indirect variant). The model cannot tell data from commands when both arrive as text."
            ),
            part(
              "Why it reached email",
              "Explains the model had an email tool with excessive agency and no human confirmation, so an injected instruction became a real external send (OWASP LLM06 Excessive Agency, LLM02 Sensitive Information Disclosure).",
              "The assistant held an email-send capability it could invoke autonomously (OWASP LLM06 Excessive Agency), so an injected instruction turned straight into a real action, and it could read the salary document and disclose it (LLM02 Sensitive Information Disclosure). Nothing confined the tool or asked a human to confirm an external send."
            ),
          ],
        },
        {
          text: "Leadership wants this class of attack prevented, not just this instance.",
          ask: "Give the controls across the tool permissions, the data boundary, and output handling.",
          parts: [
            part(
              "Least-privilege tools and confirmation",
              "Reduces the agent's agency: remove or scope the email tool (no arbitrary external recipients), and require human confirmation for actions with side effects such as sending mail externally.",
              "Apply least privilege to tools: the assistant should not be able to email arbitrary external addresses; restrict recipients to an allow-list or remove the send capability, and require explicit human approval before any external action. High-impact tool calls get a human in the loop."
            ),
            part(
              "Data and retrieval boundary",
              "Limits what the assistant can retrieve (the salary document should not be in its index, or access-controlled by the asking user), and treats retrieved content as untrusted data, not instructions.",
              "Scope the knowledge source: sensitive HR documents should not be in the assistant's searchable index, or retrieval should respect the requesting user's permissions. Retrieved content is untrusted input and must not be able to redirect the assistant's goals."
            ),
            part(
              "Guardrails and monitoring",
              "Adds input/output guardrails (filter or flag instructions in retrieved content, scan outputs for sensitive data) and logs/monitors tool use so an anomalous external send is caught.",
              "Add guardrails that detect and neutralise instruction-like text in retrieved documents and that screen outputs for sensitive data before sending, and log every tool call so an external email of an HR document raises an alert. Defence in depth, since no single filter is perfect against injection."
            ),
          ],
        },
      ],
    },
    // ----- Domain 3: Security Architecture (2)
    {
      slug: "network-zones-fail-modes",
      objective:
        "Given a network diagram, apply infrastructure considerations: device placement, security zones, attack surface, diversity, and failure modes (fail-open versus fail-closed)",
      kind: "build",
      title: "Place security controls and choose their failure modes",
      brief:
        "Arclight Media (fictional) is drawing its network. Components: an internet edge, a public-facing web application, an internal application tier, a database with customer records, a next-generation firewall, an intrusion prevention system (IPS) inline at the edge, and a badge-controlled door to the server room. The architect asks you to place the controls into zones and decide, for two of them, whether they should fail open or fail closed if the device itself fails.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Lay out the zones and the control placement and decide the failure modes.",
          parts: [
            part(
              "Zones and placement",
              "Puts the web app in a DMZ/perimeter zone, the app and database in internal zones (database most protected), with the firewall between zones and the IPS inline at the edge; keeps the database off any direct internet path.",
              "Edge -> NGFW -> DMZ (public web app) -> internal app zone -> data zone (database). The IPS sits inline at the internet edge inspecting inbound traffic; the firewall enforces zone-to-zone rules; the database is in the innermost zone with no direct internet route, reachable only from the app tier."
            ),
            part(
              "Attack surface and diversity",
              "Minimises attack surface (only the web app exposed, admin interfaces off the internet) and may note defense diversity (not relying on one vendor/one control to catch everything).",
              "Only the web application is internet-exposed; management interfaces are on an internal/out-of-band path. Reducing exposed services shrinks the attack surface, and layering different control types (firewall plus IPS plus segmentation) means one bypass does not defeat everything."
            ),
            part(
              "IPS failure mode",
              "Reasons about the inline IPS: fail-open preserves availability but lets traffic through uninspected; fail-closed blocks traffic to keep inspection mandatory. States the trade-off and a defensible choice for the context.",
              "An inline IPS that fails open keeps the site up but stops inspecting (security gap); failing closed blocks traffic until it recovers (availability hit). For a public revenue site many choose fail-open on the IPS with alerting so an inspection outage does not take the business offline, accepting a brief inspection gap -- but the choice must be deliberate and documented."
            ),
            part(
              "Badge-door failure mode",
              "Reasons about the server-room door: life-safety usually requires fail-open (people can exit) on egress, while security wants fail-secure on entry; names the safety-vs-security trade-off.",
              "The badge door must not trap people: egress should fail-safe (unlock) for life safety, even though entry security would prefer fail-secure (stay locked). Resolve it so people can always get out while entry stays controlled -- here safety outranks security, the opposite default from the IPS."
            ),
          ],
        },
      ],
    },
    {
      slug: "recovery-metrics-availability",
      objective: "Recovery metrics: recovery time objective (RTO), recovery point objective (RPO), mean time to repair (MTTR), mean time between failures (MTBF)",
      kind: "build",
      title: "Compute availability and reason about recovery metrics",
      brief:
        "A payment-processing service at Keystone Pay (fictional) runs on a server whose mean time between failures (MTBF) is 10,000 hours and whose mean time to repair (MTTR) is 4 hours. The business has set a recovery time objective (RTO) of 2 hours and a recovery point objective (RPO) of 5 minutes. You are asked to compute the server's inherent availability and explain what the metrics do and do not tell you.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Compute availability and interpret each metric against the targets.",
          parts: [
            part(
              "Availability",
              "Computes inherent availability = MTBF / (MTBF + MTTR) = 10,000 / 10,004 ≈ 0.9996 (about 99.96%), with the formula shown.",
              "Availability = MTBF / (MTBF + MTTR) = 10,000 / (10,000 + 4) = 0.99960 ≈ 99.96%. That is the fraction of time the single server is expected to be up given how often it fails and how long repairs take."
            ),
            part(
              "MTTR vs the RTO",
              "Explains that a 4-hour MTTR exceeds the 2-hour RTO, so repairing the failed server in place cannot meet the RTO -- a standby/failover is needed, not just faster repair.",
              "The 4-hour MTTR is longer than the 2-hour RTO, so waiting to repair this server breaches the RTO. Meeting a 2-hour RTO needs redundancy -- a standby that can take over in under 2 hours -- rather than relying on repairing the one server."
            ),
            part(
              "Why the metrics say nothing about RPO",
              "Explains that MTBF/MTTR describe failure and repair of the hardware, not how much data is lost; the RPO depends on backup/replication frequency, which these metrics do not capture.",
              "MTBF and MTTR are about how often the server fails and how long it takes to fix -- availability, not data loss. The 5-minute RPO is about how much data you can afford to lose, which depends entirely on how often you back up or replicate (here, at least every 5 minutes). Nothing in MTBF/MTTR tells you the RPO."
            ),
            part(
              "What extra information an RPO needs",
              "States the missing input to state an RPO: the backup/replication interval (and recovery-point integrity), independent of the availability figures.",
              "To state the achievable RPO you need the replication or backup cadence and that restore points are intact -- for a 5-minute RPO, continuous or <=5-minute replication of the payment data. That is a separate design decision from the server's availability."
            ),
          ],
        },
      ],
    },
    // ----- Domain 4: Security Operations (3)
    {
      slug: "email-auth-spf-dkim-dmarc",
      objective: "Email security: Domain-based Message Authentication, Reporting, and Conformance (DMARC), Sender Policy Framework (SPF), DomainKeys Identified Mail (DKIM), Brand Indicators for Message Identification (BIMI)",
      kind: "build",
      title: "Stop spoofing of a company's domain with SPF, DKIM, DMARC",
      brief:
        "Attackers are sending invoice-fraud emails that appear to come from billing@northgate.example (fictional). Northgate's DNS has no SPF, DKIM or DMARC records. The company sends legitimate mail from Google Workspace and from a marketing platform. You must specify the records to publish and how they work together, and the safe rollout.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Specify the email-authentication records and the rollout.",
          parts: [
            part(
              "SPF",
              "Publishes an SPF TXT record listing the authorised sending sources (Google Workspace include, the marketing platform include) ending in a fail/softfail; explains SPF authorises sending servers for the envelope domain.",
              "Publish one SPF TXT record naming every legitimate source, e.g. v=spf1 include:_spf.google.com include:<marketing-platform> -all. SPF lets receivers check the sending server is authorised for the domain; -all tells them to reject other sources. (One SPF record only; keep DNS lookups under 10.)"
            ),
            part(
              "DKIM",
              "Enables DKIM signing at each sender and publishes the published public keys as DNS records, so receivers verify the message was signed by the domain and not altered.",
              "Turn on DKIM at Google Workspace and the marketing platform and publish each provider's public key as a selector record (selector._domainkey.northgate.example). DKIM adds a cryptographic signature receivers verify, proving the message is from the domain and unmodified in transit."
            ),
            part(
              "DMARC",
              "Publishes a DMARC record that tells receivers what to do when SPF/DKIM alignment fails and where to send reports; explains DMARC ties the visible From domain to SPF/DKIM via alignment.",
              "Publish _dmarc.northgate.example: v=DMARC1; p=reject; rua=mailto:dmarc@northgate.example; ... DMARC checks that the From: domain aligns with a passing SPF or DKIM result and tells receivers to reject (or quarantine) mail that fails, with aggregate reports to the rua address. This is what actually blocks look-alike From: spoofing."
            ),
            part(
              "Safe rollout",
              "Rolls DMARC out gradually: start at p=none to gather reports and confirm all legitimate senders pass, then move to quarantine and finally reject, to avoid breaking real mail.",
              "Start DMARC at p=none and read the aggregate reports until every legitimate source (Workspace, marketing platform) passes SPF or DKIM with alignment; then raise to p=quarantine, then p=reject. Going straight to reject risks dropping real mail from a sender you forgot. (BIMI, a brand logo, can come later and generally requires DMARC enforcement first.)"
            ),
          ],
        },
      ],
    },
    {
      slug: "password-policy-80063b",
      objective:
        "Password concepts: passkey, password managers, passwordless, and password best practices -- length, complexity, reuse, expiration, age, compromised credential monitoring, account auditing, policy report",
      kind: "build",
      title: "Modernise a password policy to current guidance",
      brief:
        "Fieldstone University (fictional) IT runs this policy: passwords are exactly 8 characters, must include upper, lower, number and symbol, expire every 60 days, and cannot be written down. Helpdesk is flooded with reset calls, and users cycle Password1!, Password2!, and so on. Leadership asks you to modernise the policy in line with current NIST guidance (SP 800-63B) and to improve real-world security.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the revised password policy and justify each change against NIST SP 800-63B.",
          parts: [
            part(
              "Length over complexity",
              "Raises the minimum length (NIST: 15 characters for single-factor) and drops mandatory composition rules, encouraging passphrases.",
              "Set a minimum of at least 15 characters for a password used as a single factor and allow long passphrases (permit well over 15), and drop the forced upper/lower/number/symbol rule. NIST SP 800-63B-4 removes composition requirements because they push users to predictable patterns; length is what resists guessing."
            ),
            part(
              "No forced periodic expiry",
              "Removes the 60-day expiry, changing passwords only on evidence of compromise -- which is why Password1!/Password2! cycling happens.",
              "Stop forcing periodic change; require a change only on evidence of compromise. Mandatory 60-day rotation is exactly what drives the Password1!/Password2! pattern and the reset calls, and NIST now advises against it."
            ),
            part(
              "Blocklist and compromised-credential monitoring",
              "Screens new passwords against a blocklist of common and known-breached passwords and monitors for compromised credentials.",
              "Screen every new or changed password against a blocklist of common, expected and known-breached passwords (reject matches), and monitor credentials against breach feeds so a compromised one forces a reset. This catches the weak choices that length alone does not."
            ),
            part(
              "Password managers and passwordless",
              "Allows (encourages) password managers -- so 'cannot be written down' is replaced by secure storage -- and moves toward MFA and passwordless/passkeys for stronger authentication.",
              "Permit and encourage password managers (the 'never write it down' rule blocks the thing that enables unique strong passwords), and roll out MFA and passwordless/passkey sign-in where possible, which resists phishing and reuse far better than any password rule."
            ),
          ],
        },
      ],
    },
    {
      slug: "soar-automation-guardrails",
      objective:
        "Given a scenario, choose use cases of automation and scripting: user provisioning, resource provisioning, desired state management, anomaly detection, ticket management",
      kind: "build",
      title: "Automate alert response with the right guardrails",
      brief:
        "A small SOC at Cascade Freight (fictional) is overwhelmed by repetitive work. Three candidate automations: (1) auto-create and enrich a ticket for every EDR alert; (2) automatically disable a user account when a 'malware confirmed' alert fires on their device; (3) automatically provision new-hire accounts from the HR system. The SOC lead wants to know which to automate and what guardrails each needs.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Recommend which to automate and the guardrails for each.",
          parts: [
            part(
              "Low-risk automation",
              "Recommends automating ticket creation and enrichment fully -- it has no destructive side effect and saves analyst time (ticket management, data enrichment).",
              "Automate ticket creation and enrichment fully: it is read-only toward production (pulls context, opens a ticket) with no destructive action, so it is the safe, high-value place to start -- it cuts toil without risk."
            ),
            part(
              "Destructive automation and its guardrails",
              "Treats auto-disabling an account as higher-risk: allow it only on high-confidence triggers, with guardrails -- scope limits, an exclusion list for critical accounts, logging, and an easy rollback -- or a human approval step.",
              "Auto-disabling an account can lock out the wrong person on a false positive, so gate it: trigger only on high-confidence detections, exclude critical/service accounts, log every action, make re-enable one click, and consider a human approval for anything outside a narrow scope. The guardrail is as important as the automation."
            ),
            part(
              "Provisioning automation",
              "Supports automating new-hire provisioning from the HR system (desired-state/user provisioning) with approvals and correct least-privilege role mapping so it does not over-grant.",
              "Automate new-hire provisioning from HR as the source of truth (desired-state management), but map each role to a least-privilege permission set and keep an approval/review step, so automation does not silently over-grant access at scale."
            ),
            part(
              "General automation considerations",
              "Names cross-cutting guardrails: test in a safe environment, fail safe, log and alert on automated actions, and keep a human in the loop for high-impact steps.",
              "Across all three: test automations before production, make them fail safe (do nothing rather than the wrong thing on ambiguous input), log and alert on every automated action, and keep a human in the loop for high-impact or irreversible steps. Automation scales mistakes as fast as work."
            ),
          ],
        },
      ],
    },
    // ----- Domain 5: Security Program Management and Oversight (2)
    {
      slug: "map-breach-to-frameworks",
      objective:
        "Audit data gathering: sampling, questionnaires/surveys, interviews, assertion, and reference sources -- MITRE ATT&CK, Cyber Kill Chain, Diamond Model of Intrusion Analysis",
      kind: "build",
      title: "Map an intrusion to three analysis frameworks",
      brief:
        "An after-action review at Vantage Credit (fictional) describes a breach: a finance employee opened a malicious attachment (a macro-laden document); the macro ran a PowerShell downloader that fetched a remote access tool; the attacker used stolen domain credentials to reach a file server over SMB and copied data to an external cloud storage account. You must describe this using the Cyber Kill Chain, the Diamond Model, and MITRE ATT&CK so the report speaks a common language.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Map the intrusion onto the three frameworks.",
          parts: [
            part(
              "Cyber Kill Chain",
              "Places the described steps onto Kill Chain phases: delivery (the attachment), exploitation/installation (macro -> PowerShell -> RAT), command and control (the RAT), actions on objectives (credentialed access and data copy to cloud).",
              "Delivery: the malicious attachment to the finance user. Exploitation and Installation: the macro runs, PowerShell downloads and installs the remote access tool. Command & Control: the RAT beacons out. Actions on Objectives: using stolen credentials to reach the file server over SMB and exfiltrate data to external cloud storage."
            ),
            part(
              "Diamond Model",
              "Fills the Diamond's four vertices: adversary (the unknown attacker), capability (macro/PowerShell downloader, RAT, use of SMB), infrastructure (the download server, external cloud storage), victim (Vantage Credit's finance user and file server).",
              "Adversary: the external attacker. Capability: the macro document, the PowerShell downloader, the RAT, hands-on-keyboard use of SMB. Infrastructure: the server hosting the RAT download and the external cloud-storage account used for exfiltration. Victim: the finance employee and the file server at Vantage Credit."
            ),
            part(
              "MITRE ATT&CK techniques",
              "Names ATT&CK techniques for the key steps (e.g. T1566.001 Spearphishing Attachment, T1204.002 Malicious File, T1059.001 PowerShell, T1078 Valid Accounts, T1021.002 SMB/Windows Admin Shares, T1567.002 Exfiltration to Cloud Storage); reasonable close matches are fine.",
              "Spearphishing Attachment (T1566.001) and User Execution: Malicious File (T1204.002); Command and Scripting Interpreter: PowerShell (T1059.001); Ingress Tool Transfer (T1105) for the RAT; Valid Accounts (T1078) for the stolen credentials; Remote Services: SMB/Windows Admin Shares (T1021.002); Exfiltration to Cloud Storage (T1567.002)."
            ),
            part(
              "Why a common language helps",
              "Explains the value: a shared framework lets detection, hunting and reporting line up, highlights detection gaps per stage, and communicates risk to leadership consistently.",
              "Mapping to shared frameworks lets the SOC check it has a detection at each stage (gaps become visible), lets hunters pivot on techniques other reports use, and gives leadership and auditors a consistent vocabulary rather than a one-off story."
            ),
          ],
        },
      ],
    },
    {
      slug: "risk-register-and-treatment",
      objective: "Risk register (communication, reviews) and risk treatment: transferring, accepting, avoiding, mitigating",
      kind: "build",
      title: "Build a risk register and choose treatments",
      brief:
        "Harborlight Logistics (fictional) has no risk register. Three risks are on the table: (1) a legacy warehouse application runs on an unsupported operating system that can no longer be patched but is critical to shipping; (2) laptops are unencrypted and some hold customer data; (3) the company has no cyber-insurance for a ransomware event. You must start a risk register and recommend a treatment for each using the four options: mitigate, transfer, avoid, accept.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the register entries and the treatment choices.",
          parts: [
            part(
              "Register structure",
              "Defines the register fields per risk: description, owner, likelihood, impact, current mitigations, chosen treatment, and review date -- not just a list of risks.",
              "Each entry: risk description, risk owner, likelihood, impact (or a combined rating), current controls, chosen treatment and residual risk, and a review date. The register is a living document reviewed on a schedule and when things change, and communicated to the owners."
            ),
            part(
              "Legacy OS treatment",
              "Chooses a treatment for the unpatchable critical app that is realistic: mitigate with compensating controls (isolate/segment it, restrict access, monitor) since it cannot be simply removed; avoid (replace) as the longer-term goal.",
              "Mitigate now with compensating controls: isolate the legacy system on its own segment, restrict access to only what shipping needs, and monitor it closely, since it cannot be patched and cannot be turned off. Plan to avoid the risk longer-term by replacing or re-platforming the application."
            ),
            part(
              "Unencrypted laptops treatment",
              "Chooses mitigate -- deploy full-disk encryption -- as a cheap, decisive control for the laptop-data risk.",
              "Mitigate: deploy full-disk encryption across the laptop fleet. It is low-cost and turns a lost laptop from a reportable data breach into a non-event, so it is a clear mitigate rather than accept."
            ),
            part(
              "Insurance treatment and the role of accept",
              "Identifies cyber-insurance as risk transfer, notes it does not replace controls, and explains that 'accept' is a valid, documented choice for residual risk the owner signs off -- not a synonym for ignoring it.",
              "Buying cyber-insurance is risk transfer -- it moves financial impact to the insurer but does not stop the attack, so it complements controls rather than replacing them. Whatever risk remains after mitigation and transfer is residual risk that the risk owner formally accepts and records; accepting is a deliberate, signed-off decision, not doing nothing."
            ),
          ],
        },
      ],
    },
  ],
};
