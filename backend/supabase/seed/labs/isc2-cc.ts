import { GENERAL_SAFETY, matchPart, orderPart, part, selectPart, numericPart, type SeedLabSet } from "./types";
import { source } from "../sources";
import { CC_OUTLINE_URL, CC_PAGE_URL } from "../tracks/isc2";

// REQ-271: ISC2 Certified in Cybersecurity (CC), outline effective
// 2026-09-01 (read 2026-11-14). Five domains at average weights 24 / 17.3 /
// 20 / 21.3 / 17.3. Density (docs/labs.md, policy "hybrid"): 3 / 2 / 2 / 2 /
// 2 = 11, one lab per objective.
//
// Entry level: the labs ask for judgment a junior analyst is expected to
// show, not tool skill. Fictional organizations; IP addresses are from the
// documentation ranges (RFC 5737) and private ranges (RFC 1918), domains
// end in .example. The ISC2 Code of Ethics canons were read on
// https://www.isc2.org/ethics on 2026-11-14; ISC2's page states the four
// canons and no priority order between them, so no lab claims one. Every
// lab is needs_expert_review.

const CHECKED = "2026-11-14";
const RECHECK = "2027-05-14";
const ETHICS = source("https://www.isc2.org/ethics", "reference", CHECKED, RECHECK);

export const ISC2CC_LABS: SeedLabSet = {
  trackCode: "ISC2CC",
  sources: [source(CC_OUTLINE_URL, "exam_outline", CHECKED, RECHECK), source(CC_PAGE_URL, "exam_outline", CHECKED, RECHECK)],
  labs: [
    // ----- Domain 1: Security Principles (3)
    {
      slug: "cc-cia-which-property",
      objective: "Apply confidentiality, integrity and availability to decide which property a control protects or an incident harms",
      kind: "build",
      title: "Match each event to the security property it harms",
      brief:
        "You are a new analyst at Harbor Dental Group (fictional), a chain of six clinics. Your lead hands you three events from last month's report and asks which property of information assurance each one harmed.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each event to the property it harmed most directly, then say what single control would have helped most for one of them.",
          parts: [
            matchPart(
              "Property harmed",
              "Patient list to the wrong address -> confidentiality; supplier bank details changed -> integrity; scheduling server encrypted and unusable -> availability. All three right is met; two is partly there.",
              "(1) A patient list emailed to the wrong outside address is a confidentiality failure: information reached someone not authorized to see it. (2) A former employee changing a supplier's bank details is an integrity failure: data was modified without authorization. (3) Ransomware that leaves the scheduling server unusable for a day is an availability failure: authorized people could not use it. Non-repudiation and authentication are related services, but neither is the property these events harmed. (Ransomware that also steals data would add confidentiality; this report says only that it encrypted.)",
              {
                leftHeading: "Event",
                rightHeading: "Property",
                left: [
                  "(1) Patient list emailed to the wrong outside address",
                  "(2) A former employee changed a supplier's bank details in the system",
                  "(3) Ransomware left the scheduling server unusable for a day",
                ],
                right: ["Confidentiality", "Integrity", "Availability", "Non-repudiation", "Authentication"],
                pairs: [0, 1, 2],
              }
            ),
            part(
              "One control",
              "Names one fitting control for one event and ties it to the property: e.g., a data loss prevention check or recipient warning on outbound email (confidentiality), deprovisioning on departure plus a second approver for bank-detail changes (integrity), or offline backups with a tested restore (availability).",
              "Any one, tied to its property: warn on or block patient data sent to outside addresses (confidentiality); remove access the day someone leaves and require a second person to approve bank-detail changes (integrity); keep offline or immutable backups and test restores so ransomware costs hours, not a day (availability)."
            ),
          ],
        },
      ],
    },
    {
      slug: "cc-risk-likelihood-impact",
      objective: "Assess a risk by its likelihood and impact against the organization's risk tolerance, and choose a treatment",
      kind: "case",
      title: "Rate a risk and choose how to treat it",
      brief:
        "Lakeview Library (fictional) runs a public Wi-Fi network and a staff network on the same flat network. Its risk matrix rates likelihood and impact from 1 (low) to 5 (high) and multiplies them; leadership's stated tolerance is that any risk scoring above 12 must be treated, not accepted.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The IT volunteer rates the risk that a patron on public Wi-Fi reaches the staff file server: likelihood 4 (the server is visible from the public network and patrons often scan), impact 4 (staff and patron records are on it).",
          ask: "Score the risk on the library's matrix and say whether it is inside tolerance.",
          parts: [
            numericPart(
              "Risk score",
              "Likelihood times impact on the library's matrix: 16. Met at exactly 16.",
              "4 x 4 = 16. That is above the tolerance of 12, so leadership has said this risk must be treated, not accepted.",
              { answer: 16, tolerance: 0 }
            ),
            part(
              "Inside tolerance?",
              "Says 16 is above the stated tolerance of 12, so the risk cannot simply be accepted.",
              "No. 16 exceeds 12, so by the library's own rule this risk needs a treatment."
            ),
          ],
        },
        {
          text: "The director offers three options: (a) accept it, since the library has never had a breach; (b) buy cyber insurance; (c) put public Wi-Fi on its own network segment that cannot reach staff systems, for a modest cost.",
          ask: "Name the treatment each option is, and recommend one.",
          parts: [
            matchPart(
              "Treatment type",
              "(a) accept, (b) transfer, (c) mitigate. All three right is met.",
              "(a) Accepting it is risk acceptance -- not allowed here because the score is above tolerance. (b) Insurance is risk transfer: it moves some of the financial loss, not the chance of records being exposed. (c) Separating the networks is mitigation: it lowers the likelihood. Avoiding the risk would mean not offering public Wi-Fi at all.",
              {
                leftHeading: "Option",
                rightHeading: "Treatment",
                left: ["(a) Accept it", "(b) Buy cyber insurance", "(c) Segment public Wi-Fi from staff systems"],
                right: ["Acceptance", "Transfer", "Mitigation", "Avoidance"],
                pairs: [0, 1, 2],
              }
            ),
            part(
              "Recommendation",
              "Recommends (c) segmentation because it lowers likelihood at modest cost and brings the risk within tolerance; may add insurance as a complement for residual risk; rejects acceptance because the score exceeds tolerance.",
              "Segment the networks (c). It cuts the likelihood sharply, so the residual risk should fall inside the tolerance of 12, at modest cost. Insurance can sit on top for what is left, but on its own it leaves the records just as exposed. Acceptance is ruled out by the library's own threshold, and a clean history is not evidence that the risk is low."
            ),
          ],
        },
      ],
    },
    {
      slug: "cc-code-of-ethics-dilemma",
      objective: "Apply the ISC2 Code of Ethics canons, due care and due diligence to a workplace dilemma",
      kind: "case",
      title: "Use the certifying body's code of ethics on a workplace dilemma",
      brief:
        "You are a junior security analyst at Brightwater Logistics (fictional) and hold this entry-level certification. Use the four canons of the certifying body's code of ethics as it publishes them: (I) protect society, the common good, necessary public trust and confidence, and the infrastructure; (II) act honorably, honestly, justly, responsibly, and legally; (III) provide diligent and competent service to principals; (IV) advance and protect the profession.",
      safetyNote: GENERAL_SAFETY,
      sources: [ETHICS],
      steps: [
        {
          text: "Your manager asks you to sign off a vendor's security questionnaire saying all laptops are encrypted. You know 40 of 300 laptops are not, and the contract is worth a lot to the company.",
          ask: "Which canons apply, and what do you do?",
          parts: [
            part(
              "Canons in play",
              "Names Canon II (honesty: signing a false statement) as the core, and Canon III (diligent, competent service to the employer, which does not include deceiving a customer); may add Canon I (public trust) because the customer relies on the answer.",
              "Canon II is the heart of it: signing a statement you know is false is dishonest. Canon III asks for diligent and competent service to your principal, which does not stretch to misrepresenting controls to a customer. Canon I is touched too: the customer's trust, and the data they will hand over, depend on the answer being true."
            ),
            part(
              "What you do",
              "Declines to sign the false statement; tells the manager the actual state (40 of 300 unencrypted) and proposes an honest answer, e.g. the true figure with a dated plan to encrypt the rest; escalates through proper channels if pressed.",
              "Do not sign it as written. Tell your manager the facts and offer an honest answer the business can still use: '260 of 300 laptops are encrypted; the remaining 40 will be done by a set date.' If you are pressed to sign the false version, escalate through the company's proper channel (security leadership, compliance or ethics line)."
            ),
          ],
        },
        {
          text: "A week later the manager agrees to the honest answer and asks you to plan the encryption of the 40 laptops.",
          ask: "Explain how due diligence and due care each show up in this work.",
          parts: [
            part(
              "Due diligence",
              "Due diligence: the investigation and planning -- finding which 40 laptops, why they were missed, and choosing and verifying the encryption approach.",
              "Due diligence is doing the homework: identifying exactly which laptops are unencrypted and why they were missed, checking the encryption tool works with them, and planning the rollout and how you will verify it."
            ),
            part(
              "Due care",
              "Due care: actually carrying out and maintaining the protection a reasonable person would -- encrypting the laptops, verifying, and keeping new laptops encrypted (e.g., a build standard and monitoring).",
              "Due care is acting on it as a reasonable professional would: encrypting the 40 laptops, confirming each one, and keeping it that way -- encryption in the standard build and a report that flags any laptop that drifts."
            ),
          ],
        },
      ],
    },

    // ----- Domain 2: Security Governance (2)
    {
      slug: "cc-rto-rpo-redundancy",
      objective:
        "Distinguish business continuity from disaster recovery, and interpret recovery objectives -- recovery time objective (RTO), recovery point objective (RPO) and maximum tolerable downtime -- for a system",
      kind: "case",
      title: "Read recovery objectives and check a backup plan against them",
      brief:
        "Greenfield Pharmacy (fictional) runs its prescription system on one server. After a business impact analysis, the owner set its maximum tolerable downtime at 8 hours, its recovery time objective (RTO) at 4 hours and its recovery point objective (RPO) at 1 hour.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The current plan: a full backup to an external drive every night at 23:00, stored in the same back office as the server. A restore from that drive takes about 3 hours.",
          ask: "Explain what the RPO and RTO mean here and whether the current plan meets each.",
          parts: [
            part(
              "RPO",
              "RPO 1 hour = at most one hour of prescription data may be lost; a nightly backup can lose up to about 24 hours, so the plan fails the RPO.",
              "The RPO says the pharmacy can lose at most one hour of data. With one backup a night, a failure at 22:30 loses almost a full day of prescriptions, so the plan does not meet the RPO."
            ),
            part(
              "RTO",
              "RTO 4 hours = the system must be working again within 4 hours; a 3-hour restore fits only if the drive survives and replacement hardware is ready -- the drive sits next to the server, so a fire or theft takes both.",
              "The RTO says the system must be back within 4 hours. A 3-hour restore fits on paper, but only if the drive survives and a replacement server is at hand. The drive is in the same room, so the same fire, flood or theft that kills the server takes the backup too, and then there is no recovery at all."
            ),
          ],
        },
        {
          text: "The owner asks how business continuity and disaster recovery differ and what you would change.",
          ask: "Distinguish BC from DR for this pharmacy and propose changes.",
          parts: [
            part(
              "BC vs DR",
              "Business continuity keeps the pharmacy serving patients during the disruption (e.g., a paper or alternate process to fill urgent prescriptions); disaster recovery restores the IT system and its data.",
              "Business continuity is how the pharmacy keeps serving patients while the system is down -- for example a paper process for urgent prescriptions and a way to check patient allergies. Disaster recovery is getting the prescription system and its data back. DR is one part of the wider BC plan."
            ),
            part(
              "Changes",
              "Backups at least hourly (or continuous replication) to meet the 1-hour RPO; a copy stored off-site or in the cloud; restore tested against the 4-hour RTO; a plan for replacement hardware or a standby system.",
              "Back up at least hourly (or replicate continuously) so no more than an hour is lost; keep a copy off-site or in the cloud so one event cannot take both; arrange replacement hardware or a standby system; and test a full restore on a schedule to prove it finishes inside 4 hours, well under the 8-hour maximum tolerable downtime."
            ),
          ],
        },
      ],
    },
    {
      slug: "cc-metrics-and-kris",
      objective: "Choose key metrics and key risk indicators (KRIs) to measure cybersecurity effectiveness, and present them through dashboards, scorecards and reports",
      kind: "build",
      title: "Pick the indicators for a leadership scorecard",
      brief:
        "Your manager at Westbrook Credit Union (fictional) wants a one-page quarterly security scorecard for the board. You have a list of candidate figures and need to pick the ones that tell the board whether risk is rising, not just how busy the team was.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the figures that work as key risk indicators for the board, then explain one you rejected.",
          parts: [
            selectPart(
              "Key risk indicators",
              "Selects the indicators that signal rising risk against a threshold: critical patches overdue past policy, percent of staff who clicked the phishing test, privileged accounts without MFA, days since last successful restore test. Selecting all four is met; three is partly there; selecting activity counts lowers the score.",
              "Good KRIs move before harm does and have a threshold: critical patches overdue past the 14-day policy, the phishing click rate, privileged accounts without multi-factor authentication, and days since the last restore test passed. 'Firewall rules reviewed', 'number of alerts' and 'tickets closed' measure activity, and a high or low number does not by itself say whether risk went up.",
              {
                display: "list",
                lines: [
                  "Critical patches overdue past the 14-day policy",
                  "Number of alerts the SIEM raised",
                  "Percent of staff who clicked this quarter's phishing test",
                  "Tickets closed by the security team",
                  "Privileged accounts without multi-factor authentication",
                  "Firewall rules reviewed this quarter",
                  "Days since the last successful backup restore test",
                ],
                correct: [0, 2, 4, 6],
              }
            ),
            part(
              "A rejected figure",
              "Explains why one activity count (e.g., number of alerts or tickets closed) is a poor board KRI: it can rise or fall for reasons unrelated to risk and has no threshold that triggers action.",
              "Number of SIEM alerts: it rises when a rule is noisy and falls when monitoring breaks, so a board cannot tell good from bad. It belongs on the team's operational dashboard, not on the board's scorecard."
            ),
          ],
        },
      ],
    },

    // ----- Domain 3: IAM Concepts (2)
    {
      slug: "cc-joiner-mover-leaver",
      objective: "Manage the identity life cycle: define roles, provision, review and deprovision access",
      kind: "case",
      title: "Take a joiner, a mover and a leaver through the identity life cycle",
      brief:
        "Pinecrest Clinic (fictional) uses roles in its directory: Front Desk, Nurse, Billing and IT Admin. You handle access requests.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Joiner: Sam starts Monday as Front Desk. Mover: Ana moves from Billing to Front Desk the same day. Leaver: Lee, an IT Admin, resigns effective Friday 17:00.",
          ask: "Say what you do for each person.",
          parts: [
            part(
              "Joiner",
              "Provisions Sam with the Front Desk role only, from an approved request, ready by the start date -- nothing copied from another person's account.",
              "Create Sam's account from an approved request and give it the Front Desk role only, ready for Monday. Do not clone another employee's account, which copies their extra access."
            ),
            part(
              "Mover",
              "Adds Front Desk and REMOVES Billing for Ana (avoiding privilege creep), with any short overlap approved and time-limited.",
              "Give Ana Front Desk and take Billing away. Leaving Billing on is privilege creep: she would gather access from every job she has held. If she needs a day of overlap to hand over, approve it with an end date."
            ),
            part(
              "Leaver",
              "Disables Lee's accounts at 17:00 Friday (privileged access first), revokes sessions, tokens and keys, changes any shared credentials Lee knew, and keeps the account for records before deletion per policy.",
              "At 17:00 Friday disable Lee's accounts, starting with the IT Admin access; end active sessions and revoke tokens and keys; change any shared or service passwords Lee knew; collect devices and badges. Keep the disabled account for the retention period before deleting it."
            ),
          ],
        },
        {
          text: "In the quarterly access review you find an account 'temp-billing2' that no one claims and which logged in last week.",
          ask: "What is this, and what do you do?",
          parts: [
            part(
              "What it is",
              "An orphaned account (no owner), which is a risk because nobody would notice its misuse; a recent login makes it urgent.",
              "An orphaned account: it has no owner, so nobody would notice if it were misused. A login last week by an account nobody claims is a warning sign, not just untidiness."
            ),
            part(
              "Action",
              "Disables it, checks what it did at last login, reports it to security as a possible incident, and fixes the process gap (e.g., every account needs a named owner and an end date).",
              "Disable it now, look at what it did on that login, and raise it with security as a possible incident. Then close the gap: every account, temporary ones included, gets a named owner and an expiry date, and the review flags any without them."
            ),
          ],
        },
      ],
    },
    {
      slug: "cc-access-control-models",
      objective:
        "Compare access control models -- discretionary (DAC), mandatory (MAC), role-based (RBAC), rule-based and attribute-based (ABAC) -- and choose one for a scenario",
      kind: "build",
      title: "Match each organization to the access control model it describes",
      brief:
        "Four fictional organizations describe how they decide who can open a file or system. Name the access control model each one is using.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each description to its model, then say which model fits a growing company that wants access to follow job function.",
          parts: [
            matchPart(
              "Model",
              "Owner decides -> DAC; labels and clearances enforced by the system -> MAC; job role -> RBAC; attributes such as department, device and time -> ABAC; ordered allow/deny rules for everyone -> rule-based. All five right is met; three or four is partly there.",
              "(1) The file's owner shares it with whoever they choose -> discretionary access control (DAC). (2) Users get clearances, files get classification labels, and the system enforces the match -> mandatory access control (MAC). (3) Access comes from the job role -> role-based (RBAC). (4) Access depends on attributes such as department, device health and time of day -> attribute-based (ABAC). (5) An ordered list of allow and deny rules applies to everyone -> rule-based access control.",
              {
                leftHeading: "How access is decided",
                rightHeading: "Model",
                left: [
                  "(1) The file's owner shares it with anyone they choose",
                  "(2) Clearances and classification labels, enforced by the system",
                  "(3) Access comes with the job role",
                  "(4) Department, device health and time of day decide",
                  "(5) An ordered list of allow and deny rules applies to everyone",
                ],
                right: ["DAC", "MAC", "RBAC", "ABAC", "Rule-based"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Choose for a growing company",
              "Chooses RBAC for job-function access (permissions managed per role, easy joiner/mover/leaver handling), possibly with ABAC conditions later; explains why DAC does not scale and MAC is too rigid for most businesses.",
              "Role-based access control. Permissions are set once per role, so a new hire or a move is one role change, and reviews ask 'should this role have this?'. DAC leaves every file owner to decide, which does not scale or audit well; MAC suits classified government data and is too rigid for most businesses. ABAC conditions (device, location) can be layered on later."
            ),
          ],
        },
      ],
    },

    // ----- Domain 4: Networking and Cloud Security Concepts (2)
    {
      slug: "cc-firewall-rule-review",
      objective: "Configure firewall rules by port and application, and explain how a virtual private network (VPN) protects traffic",
      kind: "build",
      title: "Find the risky rules in a small office firewall",
      brief:
        "Oakridge Accounting (fictional) has a web server at 192.0.2.10 that customers reach over HTTPS, an internal file server at 10.0.0.20, and staff who work from home. The firewall rules below are read top to bottom; the first match wins. The office intends: customers reach the website over HTTPS only; staff reach the file server only through the VPN.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the rules that break the office's intent, then explain how the VPN protects staff traffic.",
          parts: [
            selectPart(
              "Rules that break the intent",
              "Selects the rules that expose more than intended: plain HTTP to the web server, RDP from anywhere to the file server, and SMB from anywhere to the file server. Selecting those three is met; two is partly there; selecting the HTTPS, VPN, VPN-to-SMB or final deny rule lowers the score.",
              "Rule 2 allows plain HTTP (port 80) to the web server; the intent is HTTPS only (redirecting 80 to 443 is common, but then the rule should exist only for that). Rule 4 opens Remote Desktop (TCP 3389) to the internet -- one of the most attacked services. Rule 6 opens SMB file sharing (TCP 445) to anyone; file access should only come through the VPN, which rule 5 already allows. Rules 1, 3, 5 and 7 match the intent.",
              {
                display: "table",
                header: "#  Source          Destination      Port/App        Action",
                lines: [
                  "1  any             192.0.2.10       TCP 443 HTTPS   allow",
                  "2  any             192.0.2.10       TCP 80 HTTP     allow",
                  "3  any             VPN gateway      UDP 1194 VPN    allow",
                  "4  any             10.0.0.20        TCP 3389 RDP    allow",
                  "5  VPN clients     10.0.0.20        TCP 445 SMB     allow",
                  "6  any             10.0.0.20        TCP 445 SMB     allow",
                  "7  any             any              any             deny",
                ],
                correct: [1, 3, 5],
              }
            ),
            part(
              "How the VPN protects traffic",
              "Explains that the VPN authenticates the staff member and encrypts traffic in a tunnel across the internet, so file traffic is not exposed on the public network and the file server is reachable only by authenticated VPN clients.",
              "The VPN makes the staff member authenticate before anything else, then carries their traffic in an encrypted tunnel across the internet. Someone watching the home or coffee-shop network sees only encrypted VPN packets, and the file server never needs to be reachable from the internet -- only from VPN clients."
            ),
          ],
        },
      ],
    },
    {
      slug: "cc-shared-responsibility",
      objective:
        "Choose a cloud service model (IaaS, PaaS, SaaS) and deployment model (public, private, community, hybrid), and assign security responsibilities under the shared responsibility model",
      kind: "build",
      title: "Assign security tasks under the shared responsibility model",
      brief:
        "Riverside Tutoring (fictional) runs three things in the public cloud: virtual machines for its booking app (IaaS), a managed database service (PaaS), and a hosted email and office suite (SaaS). The owner wants to know who secures what.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Assign each task to the party responsible, then name the task that always stays with the customer.",
          parts: [
            matchPart(
              "Who is responsible",
              "Physical data center security -> provider (all models); patching the VM's operating system in IaaS -> customer; patching the managed database engine in PaaS -> provider; deciding who can read the SaaS mailboxes -> customer. All four right is met; three is partly there.",
              "Physical security of the data centers is always the provider's. In IaaS the customer runs the guest operating system, so patching the VM's OS is the customer's. In PaaS the provider runs the database engine, so patching it is the provider's. In SaaS the customer still decides who in the organization can read which mailbox -- identities and access are the customer's in every model.",
              {
                leftHeading: "Task",
                rightHeading: "Responsible party",
                left: [
                  "Physical security of the data centers",
                  "Patching the operating system on the IaaS virtual machines",
                  "Patching the managed database engine (PaaS)",
                  "Deciding which staff can read which SaaS mailboxes",
                ],
                right: ["Cloud provider, in every model", "Customer: it runs the guest operating system", "Cloud provider: it runs the database engine", "Customer, in every model"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Always the customer's",
              "Names data and identity/access (who can access the data, how accounts are protected, data classification) as the customer's responsibility in every service model.",
              "The customer always owns its data and who can reach it: classifying the data, managing user accounts, turning on multi-factor authentication and setting permissions. No service model hands that to the provider."
            ),
          ],
        },
      ],
    },

    // ----- Domain 5: Security Operations and Incident Response (2)
    {
      slug: "cc-event-triage",
      objective: "Monitor and log security events, and triage them by incident use case, priority and correlation",
      kind: "case",
      title: "Triage a morning's security events",
      brief:
        "You start the morning shift at Northpoint Insurance (fictional). The monitoring tool has raised these events overnight (times UTC).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Overnight events:\n02:10 Antivirus quarantined a known adware file on a kiosk PC\n02:41 30 failed logins for j.chen from 203.0.113.44, then a successful login\n02:43 j.chen's mailbox created a rule forwarding all mail to an outside address\n03:05 Printer PRN-3 low toner\n04:20 Scheduled vulnerability scan finished",
          ask: "Select the events that belong to one incident and put them first in your queue.",
          parts: [
            selectPart(
              "Correlated events",
              "Selects the failed-then-successful login and the forwarding rule: together they match the account-compromise use case. Selecting both is met; one is partly there; selecting the adware, toner or scan lowers the score.",
              "The 30 failures followed by a success from one outside address, and two minutes later a new rule forwarding all of j.chen's mail outside, correlate into one story: a guessed password and an attacker setting up to read mail. The adware was already quarantined, the toner is not security, and the scan finishing is expected.",
              {
                display: "log",
                lines: [
                  "02:10 Antivirus quarantined known adware on kiosk PC",
                  "02:41 30 failed logins for j.chen from 203.0.113.44, then success",
                  "02:43 j.chen mailbox rule forwards all mail to outside address",
                  "03:05 Printer PRN-3 low toner",
                  "04:20 Scheduled vulnerability scan finished",
                ],
                correct: [1, 2],
              }
            ),
          ],
        },
        {
          text: "Your lead agrees it looks like a compromised account and asks for your first actions before handing it to the incident response team.",
          ask: "What do you do first, and why that order?",
          parts: [
            part(
              "First actions",
              "Contain the account (disable or reset the password and end sessions), remove the forwarding rule after recording it, preserve the logs, and escalate under the incident response plan.",
              "Record the forwarding rule and the login details first, then contain: reset j.chen's password and sign out every session (or disable the account), and remove the rule. Preserve the sign-in and mailbox logs, and escalate to the incident response team under the plan, noting what mail may already have been forwarded."
            ),
            part(
              "Why",
              "Explains that containment stops ongoing data loss quickly while preserving evidence keeps the facts the investigation needs; deleting the rule before recording it destroys evidence.",
              "Every minute the rule stays, more mail leaves, so containment comes fast; but deleting the rule before recording it would throw away the evidence of where the mail went and since when."
            ),
          ],
        },
      ],
    },
    {
      slug: "cc-incident-response-plan",
      objective: "Implement an incident response plan and test it with exercises such as tabletops",
      kind: "build",
      title: "Order an incident response plan and plan a tabletop",
      brief:
        "Meadowbrook Schools (fictional) is writing its first incident response plan. The draft lists the phases out of order, and the district wants to test the plan before the school year without touching live systems.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Put the incident response phases in order, then outline the exercise.",
          parts: [
            orderPart(
              "Phase order",
              "Preparation; detection and analysis; containment; eradication; recovery; post-incident lessons learned. All in order is met; one pair swapped is partly there.",
              "Preparation (the plan, the team, the tools) comes before any incident. Then detection and analysis (is it an incident, how big), containment (stop the spread), eradication (remove the cause), recovery (restore and watch), and post-incident lessons learned that feed back into preparation.",
              ["Preparation", "Detection and analysis", "Containment", "Eradication", "Recovery", "Post-incident lessons learned"]
            ),
            part(
              "Tabletop exercise",
              "Describes a discussion-based tabletop: key roles in a room walking through a realistic scenario (e.g., ransomware on the student records system) step by step against the plan, no live systems touched, with gaps recorded and the plan updated afterward.",
              "Run a tabletop: gather the people the plan names (IT, the principal, communications, legal, the district office), give them a realistic scenario -- ransomware on the student records system on the first day of term -- and walk through it hour by hour against the plan. Nothing live is touched. A facilitator records every gap (who calls the parents? where are the offline contact lists?), and the plan is updated afterward."
            ),
          ],
        },
      ],
    },
  ],
};
