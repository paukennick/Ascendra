import { GENERAL_SAFETY, matchPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";
import { CISM_OUTLINE_URL } from "../tracks/isaca";

// REQ-272: ISACA CISM, exam content outline used from 2026-11-03 (read
// 2026-11-14). Four domains at 18 / 20 / 33 / 29. Density (docs/labs.md,
// policy "hybrid"): 2 / 2 / 3 / 3 = 10, one lab per objective.
//
// CISM is a manager's exam: the model answers put business objectives,
// risk appetite and governance before technology, and the security manager
// advises while the business owner decides. Fictional organizations. Every
// lab is needs_expert_review.

const CHECKED = "2026-11-14";
const RECHECK = "2027-05-14";

export const CISM_LABS: SeedLabSet = {
  trackCode: "CISM",
  sources: [
    source(CISM_OUTLINE_URL, "exam_outline", CHECKED, RECHECK),
    source("https://www.isaca.org/-/media/files/isacadp/project/isaca/certification/exam-candidate-guides/2026/exam-candidate-guide.pdf", "exam_outline", CHECKED, RECHECK),
  ],
  labs: [
    // ----- Domain 1: Information Security Governance (2)
    {
      slug: "cism-strategy-gap",
      objective: "Develop an information security strategy aligned with organizational goals, from current state to desired state",
      kind: "case",
      title: "Build a strategy from the business's goals, not the tool list",
      brief:
        "You are the new information security manager at Alder Home Health (fictional), which plans to triple its patient numbers in two years by launching a telehealth service. The board's goals: grow safely, keep regulators satisfied, and avoid any outage that stops nurses seeing patients.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Your predecessor's 'strategy' is a list of 14 tools to buy.",
          ask: "What is wrong with that as a strategy, and where do you start?",
          parts: [
            part(
              "What is wrong",
              "A tool list is not a strategy: it is not tied to business objectives, risk or a desired state, and gives leadership no way to judge priorities or success.",
              "A shopping list is not a strategy. It says nothing about which business goals it serves, which risks it reduces, what 'done' looks like, or why tool 3 matters more than tool 11, so the board cannot judge it or fund it sensibly."
            ),
            part(
              "Where to start",
              "Starts from the business: the growth and telehealth objectives, risk appetite, legal/regulatory requirements and culture; then assesses the current state against a desired state (e.g., using a framework or maturity model) and identifies the gap.",
              "Start with the business: the telehealth growth plan, the board's risk appetite, the regulations for patient data, and how the organization works. Then assess the current state of security against a desired state that supports those goals -- a framework or maturity model gives the yardstick -- and the gap between them becomes the strategy's work."
            ),
          ],
        },
        {
          text: "The gap analysis shows: no business continuity plan for clinical systems, identity managed by hand, and patient data spread across unmanaged laptops.",
          ask: "Turn the gaps into a strategic roadmap the board will recognize.",
          parts: [
            part(
              "Roadmap tied to goals",
              "Ties each initiative to a board goal (continuity -> no outage stops nurses; identity and data protection -> grow safely and satisfy regulators), sequences by risk and dependency, and sets measurable outcomes and owners.",
              "Express each initiative in the board's terms: a continuity and recovery plan for clinical systems (so no outage stops nurses seeing patients); automated identity and access management (so new staff and new telehealth users scale safely); bringing patient data onto managed, encrypted devices (to satisfy regulators). Order them by risk and dependency -- identity first, because telehealth depends on it -- and give each a measurable outcome and a business owner."
            ),
          ],
        },
      ],
    },
    {
      slug: "cism-business-case",
      objective: "Build a business case, budget and resource plan that gains senior leadership's commitment",
      kind: "build",
      title: "Pick what belongs in a security business case",
      brief:
        "You need the executive committee of Fernleigh Distribution (fictional) to fund a privileged access management program. The CFO has said she reads the first page and decides.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select what belongs on the first page, then write its opening sentence.",
          parts: [
            selectPart(
              "First page",
              "Selects the business problem and risk in business terms, the options including doing nothing, cost and expected benefit/risk reduction, and the alignment to strategy and the decision requested. Selecting those four is met; three is partly there; selecting technical feature lists or vendor marketing lowers the score.",
              "A first page that wins commitment states the business problem and its risk in money and operations, compares the options (including doing nothing), gives the cost against the expected risk reduction, and shows how it supports the strategy and exactly what decision is wanted. Product feature lists, vendor quadrant charts and the architecture diagram belong in an appendix, if anywhere.",
              {
                display: "list",
                lines: [
                  "The business problem and its risk, in money and operational terms",
                  "A comparison of options, including doing nothing",
                  "The product's full feature list",
                  "Cost against the expected reduction in risk",
                  "A vendor's analyst-ranking chart",
                  "How it supports the strategy, and the decision requested",
                  "The detailed network architecture diagram",
                ],
                correct: [0, 1, 3, 5],
              }
            ),
            part(
              "Opening sentence",
              "An opening that states the business risk and the ask in plain business language, without jargon.",
              "For example: 'Forty administrators can change any system in the company with passwords that never expire; one stolen password could halt shipping for days, and we ask the committee to approve $240,000 over two years to put that access under control.'"
            ),
          ],
        },
      ],
    },

    // ----- Domain 2: Information Security Risk Management (2)
    {
      slug: "cism-risk-treatment-appetite",
      objective: "Choose a risk treatment -- mitigate, transfer, avoid or accept -- based on risk appetite",
      kind: "build",
      title: "Choose a treatment for each risk against the appetite",
      brief:
        "The board of Marlow Specialty Foods (fictional) has a low appetite for risks to food safety and customer data, and a moderate appetite for risks to internal efficiency. You have four assessed risks to treat.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each risk to the treatment that best fits the board's appetite, then say who decides to accept a risk.",
          parts: [
            matchPart(
              "Treatment",
              "Legacy e-commerce plug-in nobody supports, little revenue -> avoid (retire it); ransomware on the plant's recipe control system -> mitigate; large-scale card data breach costs -> transfer part through insurance (alongside controls); a slow internal wiki with a minor outage risk -> accept. All four right is met; three is partly there.",
              "Retiring an unsupported plug-in that earns little removes the risk entirely -- avoid. Ransomware on the recipe control system touches food safety, where the appetite is low, so reduce it with controls -- mitigate. The financial cost of a card breach can be partly transferred through insurance, though controls are still needed because insurance does not restore trust. A minor, low-impact risk to an internal wiki sits within a moderate appetite -- accept, formally.",
              {
                leftHeading: "Risk",
                rightHeading: "Treatment",
                left: [
                  "Unsupported e-commerce plug-in that brings in little revenue",
                  "Ransomware reaching the plant's recipe control system",
                  "Financial cost of a large card-data breach",
                  "Occasional outage of the slow internal wiki",
                ],
                right: ["Avoid", "Mitigate", "Transfer", "Accept"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Who accepts",
              "The business risk owner with the authority (per the governance structure) accepts the risk, documented in the risk register; the security manager advises but does not accept on the business's behalf.",
              "The business owner of the risk, at the level the governance structure gives authority for that size of risk, accepts it and the decision is recorded in the risk register with a review date. The security manager advises and documents; it is not the security manager's risk to accept."
            ),
          ],
        },
      ],
    },
    {
      slug: "cism-exception-process",
      objective: "Assign risk and control ownership and run a security exception process",
      kind: "case",
      title: "Handle a request for a security exception",
      brief:
        "Policy at Ridgeway Engineering (fictional) requires multi-factor authentication for all remote access. The head of field services asks for an exception: 60 technicians use rugged tablets that cannot run the authenticator app, and the replacement tablets arrive in nine months.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The request arrives by email to you, asking for your approval today.",
          ask: "How do you process it, and who approves?",
          parts: [
            part(
              "Process",
              "Runs it through the exception process: documents the risk and business justification, assesses the risk, identifies compensating controls, sets an expiry (nine months), and records it in the register for review.",
              "Put it through the exception process: record the business need and the risk created, assess it, agree compensating controls, set an expiry that matches the tablet replacement, and enter it in the risk register so it is reviewed and does not become permanent."
            ),
            part(
              "Who approves",
              "The accountable business/risk owner (e.g., the head of field services' executive, per the authority matrix) approves and owns the residual risk; security advises.",
              "The business owner accountable for field services -- at the level the authority matrix sets -- approves and owns the residual risk. The security manager recommends and records; signing it off personally would put the risk in the wrong place."
            ),
          ],
        },
        {
          text: "The assessment shows the tablets reach only the work-order system, through the corporate VPN.",
          ask: "Propose compensating controls for the nine months.",
          parts: [
            part(
              "Compensating controls",
              "Restricts the tablets' access to the work-order system only; device certificates or managed-device checks; strong unique passwords; monitoring and alerts on unusual sign-ins; and a firm end date.",
              "Limit the tablets' VPN profile to the work-order system and nothing else; require a device certificate so only the company's tablets can connect; enforce long unique passwords; alert on sign-ins at odd hours or from unexpected places; and hold the end date when the new tablets arrive."
            ),
          ],
        },
      ],
    },

    // ----- Domain 3: Information Security Program (3)
    {
      slug: "cism-architecture-alignment",
      objective: "Design an information security architecture that supports the program and stays aligned with enterprise architecture",
      kind: "case",
      title: "Keep security architecture in step with the enterprise architecture",
      brief:
        "Whitcombe Insurance (fictional) has an enterprise architecture roadmap: move from its own data center to a public cloud over 18 months and replace the claims system with a SaaS product. The security architecture is still built around the data center's perimeter firewall.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The enterprise architects did not invite security to their design board.",
          ask: "Why does that matter, and what do you change in governance?",
          parts: [
            part(
              "Why it matters",
              "Security architecture must follow the enterprise architecture; if security is absent, the cloud and SaaS designs will be made without security requirements and the perimeter-based controls will no longer cover where data lives.",
              "When the enterprise moves to cloud and SaaS, a perimeter-firewall security architecture stops covering where the data and users are. If security is not at the design table, the new designs will be finished before anyone asks how identity, data protection and logging work there, and fixing that later costs far more."
            ),
            part(
              "Governance change",
              "Gets security a standing role in the architecture review board/design governance, with security requirements and patterns as an input to every design.",
              "Ask for a standing seat on the architecture design board and make security requirements an input to every design decision, backed by security architecture patterns (for cloud accounts, SaaS onboarding, identity) the architects can reuse."
            ),
          ],
        },
        {
          text: "You now redesign the security architecture for the target state.",
          ask: "Name the main shifts in the security architecture.",
          parts: [
            part(
              "Architecture shifts",
              "From network perimeter to identity-centric/zero trust controls; data protection that follows the data (classification, encryption, SaaS/CASB controls); shared responsibility mapped per cloud and SaaS service; centralized logging and monitoring across cloud and SaaS.",
              "Move from the network perimeter to identity as the main control (single sign-on, strong authentication, conditional access -- a zero trust approach); protect data where it goes (classification, encryption, controls on the SaaS claims product); map the shared responsibility for each cloud and SaaS service so no duty falls between provider and company; and bring cloud and SaaS logs into central monitoring."
            ),
          ],
        },
      ],
    },
    {
      slug: "cism-program-metrics",
      objective: "Develop program metrics that show whether the program meets its objectives",
      kind: "build",
      title: "Choose metrics that show the program is working",
      brief:
        "The security program at Corbin Logistics (fictional) has three objectives for the year: reduce the chance of a ransomware outage, keep third-party risk under control, and make staff harder to phish. The steering committee wants a quarterly report.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the metrics that show progress against the objectives, then say how you would present them.",
          parts: [
            selectPart(
              "Objective-linked metrics",
              "Selects: percent of critical systems with tested offline backups; percent of critical suppliers assessed within the last year; phishing-simulation report rate and click rate trend; mean time to patch critical internet-facing flaws. Selecting all four is met; three is partly there; picking raw activity counts lowers the score.",
              "Each chosen metric maps to an objective and can show improvement: tested offline backups and patch speed on internet-facing systems (ransomware outage), suppliers assessed on time (third-party risk), and the phishing simulation report and click rates (staff resilience). Counts of blocked emails, antivirus definitions pushed or meetings held measure activity -- they can go up or down without the objectives moving.",
              {
                display: "list",
                lines: [
                  "Percent of critical systems with tested offline backups",
                  "Number of emails blocked by the spam filter",
                  "Percent of critical suppliers assessed in the last 12 months",
                  "Antivirus definition updates pushed",
                  "Phishing simulation report rate and click rate, trended",
                  "Security meetings held",
                  "Mean time to patch critical internet-facing vulnerabilities",
                ],
                correct: [0, 2, 4, 6],
              }
            ),
            part(
              "Presentation",
              "Presents each metric against its objective with a target, trend and a short 'so what' and decision needed; plain business language; detail in an appendix.",
              "One line per objective: the metric, its target, the trend over the last quarters, and a sentence on what it means and any decision needed ('supplier assessments are at 60% against a 90% target; we need procurement to make assessment a contract condition'). Technical detail goes in an appendix."
            ),
          ],
        },
      ],
    },
    {
      slug: "cism-third-party-oversight",
      objective: "Manage external services -- suppliers, third parties and nth parties -- through contract requirements and monitoring",
      kind: "case",
      title: "Manage a supplier and its supplier",
      brief:
        "Pemberton Retail (fictional) is signing a payroll processing provider. The provider stores data with a cloud hosting company and sends printing to a mailing house -- Pemberton's fourth parties.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Procurement sends you the draft contract the day before signing; it has no security terms.",
          ask: "What security requirements do you put in the contract?",
          parts: [
            part(
              "Contract terms",
              "Includes: security requirements/standards to meet, right to audit or independent assurance reports, breach notification within a set time, data location and return/deletion at exit, and obligations that flow down to subcontractors with disclosure of who they are.",
              "Name the security standard the provider must meet; require independent assurance (an audit report) or a right to audit; require breach notification within an agreed number of hours; fix where data may be stored and how it is returned and deleted at the end; and require the same obligations to flow down to subcontractors, with the provider listing them and telling Pemberton before adding new ones."
            ),
            part(
              "Process fix",
              "Raises that security must be engaged at the start of procurement (risk-tiered third-party assessment before selection), not the day before signing.",
              "Also fix the process: a supplier that will hold employee payroll data should be risk-assessed before it is chosen, so security needs to be part of procurement from the start, with the depth of review set by the supplier's risk tier."
            ),
          ],
        },
        {
          text: "A year later the mailing house (a fourth party) suffers a breach that exposes payslips.",
          ask: "What do you do, and what does the program change?",
          parts: [
            part(
              "Response",
              "Works through the payroll provider (the contracting party) under the notification and flow-down terms to get scope; activates Pemberton's incident process including legal/privacy for notifications; holds the provider accountable for its subcontractor.",
              "Go through the payroll provider, which is contractually responsible for its subcontractor: get the scope (which employees, what data, when) under the notification and flow-down clauses, and run Pemberton's incident process, with legal and privacy deciding on notifications to employees and regulators."
            ),
            part(
              "Program change",
              "Adds ongoing monitoring of critical suppliers and their key subcontractors (annual reassessment, assurance reports, notification of subcontractor changes), not just a one-time onboarding check.",
              "Move from one-time onboarding checks to ongoing monitoring of critical suppliers and the subcontractors that touch Pemberton's data: annual reassessment, fresh assurance reports, and a requirement to be told before subcontractors change."
            ),
          ],
        },
      ],
    },

    // ----- Domain 4: Incident Management (3)
    {
      slug: "cism-bia-priorities",
      objective: "Use a business impact analysis to prioritize recovery and set recovery time and recovery point objectives",
      kind: "build",
      title: "Set recovery priorities from a business impact analysis",
      brief:
        "A business impact analysis at Hollis Freight (fictional) found these impacts if each system were down: dispatch (trucks stop within 2 hours; contract penalties start at 4 hours), customer billing (invoices can wait 5 days), the HR portal (can wait 2 weeks), and fleet telematics (safety reporting is legally required within 24 hours).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Put the systems in recovery order, then set a reasonable RTO for dispatch and explain what sets its RPO.",
          parts: [
            orderPart(
              "Recovery order",
              "Dispatch first (operations stop in hours, penalties at 4 hours); telematics second (legal reporting within 24 hours); billing third (5 days); HR portal last (2 weeks). This order is met.",
              "Dispatch stops the business within hours, so it comes first. Telematics carries a legal obligation within 24 hours. Billing can wait five days, and the HR portal two weeks. The business impact, not the system's technical importance or who shouts loudest, sets the order.",
              ["Dispatch", "Fleet telematics", "Customer billing", "HR portal"]
            ),
            part(
              "Dispatch RTO and RPO",
              "Sets an RTO under the point of serious harm -- within about 2 hours, certainly before 4 -- and explains the RPO is set by how much dispatch data the business can lose or re-enter (e.g., minutes of assignments), which drives replication frequency; both are agreed with the business owner.",
              "Dispatch's RTO should be inside the 2-hour point where trucks stop -- certainly well before contract penalties at 4 hours. Its RPO comes from how much dispatch data the business can afford to lose or re-key: if losing more than a few minutes of assignments causes chaos, the RPO is minutes, which means near-continuous replication. The business owner agrees both; security and IT design to them."
            ),
          ],
        },
      ],
    },
    {
      slug: "cism-containment-choice",
      objective: "Choose incident containment methods",
      kind: "case",
      title: "Choose containment that the business can live with",
      brief:
        "At 10:00 on a Monday, the SOC at Tamsin Pharmaceuticals (fictional) confirms an attacker on the order-processing server, which handles all customer orders. The server is beaconing to an outside address and the attacker has a valid admin account.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The IT director wants to power the server off immediately. The sales director says shutting it down stops every order.",
          ask: "Lay out the containment options and recommend one.",
          parts: [
            part(
              "Options",
              "Names options with trade-offs: power off (stops attacker but loses volatile evidence and stops orders); network isolation (keeps memory, stops orders); targeted containment (block the outside address, disable the compromised account, restrict the server's connections) that keeps orders flowing with closer monitoring; and failover to a clean standby if one exists.",
              "Powering off stops the attacker but destroys memory evidence and halts orders. Full network isolation keeps evidence but also halts orders. Targeted containment -- block the outbound address, disable the compromised admin account, restrict the server to only the connections orders need -- keeps business running under close watch. Failing over to a clean standby, if one exists, does both."
            ),
            part(
              "Recommendation",
              "Recommends containment consistent with the BIA and incident plan and the risk owner's decision: e.g., targeted containment plus evidence capture first, escalating to isolation if the attacker persists; decision made with the business owner, not unilaterally.",
              "Capture memory and key logs, then apply targeted containment at once (block the address, disable the account, cut unneeded connections) and watch closely; if the attacker shows any sign of remaining, isolate. The choice is made with the business owner under the incident plan, weighing the BIA's order-processing impact against the risk of data loss -- not by IT or sales alone."
            ),
          ],
        },
        {
          text: "Two hours later the attacker tries a second admin account from the same address.",
          ask: "What does that tell you, and what changes?",
          parts: [
            part(
              "Escalate containment",
              "Shows the attacker still has credentials and scope is wider; escalates to isolation or failover, resets all privileged credentials, and widens the investigation.",
              "The attacker holds more than one credential, so the targeted containment is not enough and the scope is wider than one account. Isolate the server or fail over now, reset every privileged credential, and widen the investigation to find how the accounts were obtained."
            ),
          ],
        },
      ],
    },
    {
      slug: "cism-incident-communications",
      objective: "Manage incident response communications: reporting, notification and escalation",
      kind: "case",
      title: "Run the communications for a data breach",
      brief:
        "Halcyon Travel (fictional) confirms that an attacker downloaded the names, passport numbers and travel dates of 12,000 customers. The incident response plan names a communications lead, legal counsel and an executive incident sponsor.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "A developer posts in a company-wide chat channel that 'we got hacked, passports leaked'.",
          ask: "What goes wrong, and how should internal communication work?",
          parts: [
            part(
              "Internal communication",
              "Uncontrolled internal disclosure risks leaks, inaccurate statements and tipping off the attacker; communication should go through the plan's channels on a need-to-know basis, possibly out-of-band, with one source of truth.",
              "An open post spreads unverified claims, can leak to the press before customers or regulators are told, and may tip off an attacker watching internal channels. Internal updates should go through the plan's defined channels to the people who need them, on an out-of-band channel if systems may be compromised, with one owner of the facts."
            ),
          ],
        },
        {
          text: "The CEO wants to say nothing publicly until the investigation is finished in six weeks.",
          ask: "Advise on notification and escalation.",
          parts: [
            part(
              "Notification",
              "Advises that notification decisions follow legal and regulatory requirements in each jurisdiction (counsel determines deadlines, which may be short), and that waiting six weeks may breach them; affected customers need timely, accurate notice to protect themselves.",
              "Waiting six weeks may break notification laws: legal counsel must confirm the deadlines for each jurisdiction where customers live, and some are short. Customers whose passport numbers leaked also need timely notice so they can protect themselves. The investigation does not have to be complete to notify; what is known can be shared and updated."
            ),
            orderPart(
              "Escalation path",
              "Incident handler; incident manager; executive incident sponsor (with legal and communications); board as the plan requires. In this order is met.",
              "Escalation follows the plan: the incident handler escalates to the incident manager, who brings in the executive incident sponsor together with legal and communications; the board is informed as the plan and governance require for an incident of this size.",
              ["Incident handler", "Incident manager", "Executive incident sponsor, with legal and communications", "Board of directors"]
            ),
          ],
        },
      ],
    },
  ],
};
