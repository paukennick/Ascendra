import { GENERAL_SAFETY, part, type SeedLabSet, numericPart } from "./types";
import { source } from "../sources";

// REQ-123 pilot: PMP (PMI Examination Content Outline, July 2026).
//
// Aligned to the July 2026 ECO's three domains (People 33%, Process 41%,
// Business Environment 26%) and tasks the exam scenario items ask a
// candidate to perform: manage conflict, engage stakeholders, plan
// communication, break down scope, prepare and analyse a schedule, measure
// project status, maintain the risk register, run change control and turn a
// realised risk into an issue.
//   https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/new-pmp-examination-content-outline-2026.pdf
// The 2026 ECO does not name earned value management; it asks for project
// metrics and analysis of schedule and financial variation, which is how
// the metrics lab is framed. Density ("hybrid"): 3 / 3 / 3.

export const PMP_LABS: SeedLabSet = {
  trackCode: "PMP",
  sources: [source("https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/new-pmp-examination-content-outline-2026.pdf", "exam_outline", "2026-11-07")],
  labs: [
    {
      slug: "team-conflict-case",
      objective:
        "Managing conflict: identifying its source, analyzing context, implementing an agreed resolution strategy, and maintaining ground rules that prevent recurrence",
      kind: "case",
      title: "Resolve a stalled design disagreement",
      brief:
        "You lead a hybrid project building a scheduling app. Two senior developers, Amara and Tomas, disagree about whether to use an off-the-shelf calendar component or build one. The disagreement has spilled into stand-ups and the sprint is at risk.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Other team members say they are waiting for the two of them to agree before starting their own work.",
          ask: "What do you do first?",
          parts: [
            part(
              "First action",
              "Meets the two developers (privately, promptly) to understand the source and context of the conflict before choosing a resolution, rather than deciding for them, escalating to the sponsor, or ignoring it.",
              "Talk with Amara and Tomas together, privately and soon, to understand what each is optimising for (time, maintainability, risk) and what the disagreement is really about before choosing how to resolve it."
            ),
            part(
              "Resolution approach",
              "Aims for collaborating/problem-solving: agree on objective decision criteria (for example cost, schedule impact, quality, maintainability) and evaluate both options against them.",
              "Collaborate: agree on the criteria that matter for the project (delivery date, licence cost, accessibility, long-term maintenance), compare both options against them and let the evidence decide."
            ),
          ],
        },
        {
          text: "They agree on criteria and choose the off-the-shelf component. Two sprints later, Tomas reopens the debate in a stand-up.",
          ask: "How do you stop the same conflict from recurring?",
          parts: [
            part(
              "Prevention",
              "Uses or creates team ground rules/a team charter (for example decisions are revisited only with new information, through an agreed forum) and records the decision with its rationale.",
              "Point to the team charter's ground rule that a settled decision is reopened only with new information and in the agreed forum (for example the retrospective), and make sure the decision and its rationale are logged where everyone can see them."
            ),
            part(
              "Conversation with Tomas",
              "Follows up one-to-one with Tomas to find out whether there is new information or an unaddressed concern, rather than shutting him down publicly.",
              "Speak with Tomas one-to-one: if he has new information, bring it to the agreed forum; if not, acknowledge his concern and hold the team to the decision."
            ),
          ],
        },
      ],
    },
    {
      slug: "stakeholder-engagement-plan",
      objective:
        "Engaging stakeholders: identifying and analyzing them, tailoring communication to their needs, and executing a stakeholder engagement plan",
      kind: "build",
      title: "Analyse stakeholders and plan their engagement",
      brief:
        "Your project replaces a regional hospital group's staff rostering system. Stakeholders: (1) the chief operating officer, who funds it and has final say but rarely asks about it; (2) ward managers, who will use it daily and fear losing their spreadsheets; (3) the payroll team, who need its data but have little influence over its design; (4) the IT security lead, who can block go-live and is currently unaware of the project.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Produce the stakeholder analysis and engagement actions.",
          parts: [
            part(
              "Power/interest classification",
              "Places each stakeholder on a power/interest grid with a sensible strategy: COO keep satisfied (high power, lower interest); ward managers manage closely (high interest, meaningful influence); payroll keep informed; IT security lead high power currently unaware -> engage early.",
              "COO: high power, low interest -> keep satisfied. Ward managers: high interest and real influence on adoption -> manage closely. Payroll: high interest, low power -> keep informed. IT security lead: high power, currently low awareness -> bring in early and treat as manage closely."
            ),
            part(
              "Tailored communication",
              "Gives at least two tailored communication choices (format, frequency, content) that fit specific stakeholders, e.g. a short decision-focused monthly summary for the COO and hands-on demos for ward managers.",
              "COO: a one-page monthly status with decisions needed. Ward managers: fortnightly demos and a sandbox to try their rosters. Payroll: interface specification and test data. Security lead: architecture walkthrough and review sign-off dates."
            ),
            part(
              "Engagement gap and action",
              "Identifies a current vs desired engagement level for a resistant or unaware stakeholder (unaware, resistant, neutral, supportive, leading) and an action to close the gap.",
              "Ward managers: currently resistant, desired supportive -> involve two of them as champions in design workshops and show how spreadsheet data will be imported. Security lead: unaware -> supportive, via an early review meeting."
            ),
          ],
        },
      ],
    },
    {
      slug: "communication-plan-distributed-team",
      objective:
        "Planning and managing project communication: defining a communication strategy, establishing feedback loops, and producing reports aligned to sponsor/stakeholder expectations",
      kind: "build",
      title: "Write a communication plan for a distributed team",
      brief:
        "A 12-person team spread over three time zones (UTC-5, UTC+1 and UTC+8) is delivering a customer portal. The sponsor wants to know only whether the launch date is at risk and what decisions she needs to make. Team members say they learn about changes late and that meetings always fall in someone's night.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the key entries of the communication plan.",
          parts: [
            part(
              "Sponsor reporting",
              "Defines sponsor communication focused on schedule risk and decisions (for example a short weekly or fortnightly status with RAG status, top risks and decisions needed), not detailed task lists.",
              "Fortnightly one-page status to the sponsor: launch-date confidence (RAG), top three risks with owners, and decisions needed by a date; escalation by message if a threshold is crossed."
            ),
            part(
              "Team communication across time zones",
              "Uses asynchronous channels as the default (shared written updates, recorded demos, a single source of truth for changes) and rotates or limits live meetings so no region always takes the night slot.",
              "Daily written async stand-up in the team channel; one short live meeting a week whose time rotates across regions; demos recorded; all change decisions posted in one change log the team watches."
            ),
            part(
              "Feedback loop",
              "Builds a way to check the plan is working (for example a retrospective question, a short pulse survey, or confirming understanding of key changes) and adjust it.",
              "Ask in each retrospective whether people heard about changes in time and adjust channels or timing; for major changes, ask each lead to confirm receipt."
            ),
          ],
        },
      ],
    },
    {
      slug: "wbs-training-portal",
      objective: "Developing and managing project scope: defining it, gaining stakeholder agreement, and decomposing it",
      kind: "build",
      title: "Break down the scope of a training portal",
      brief:
        "You are planning a project to deliver an internal training portal for 3,000 employees: a web portal, 10 launch courses converted from slide decks, single sign-on with the company directory, completion reports for managers, and a trained support team. Out of scope: building new course content from scratch.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Produce the top of the work breakdown structure and one work-package description.",
          parts: [
            part(
              "Level-1 deliverables",
              "Lists deliverable-oriented (noun) elements that together cover the whole stated scope -- portal, converted courses, SSO integration, reporting, support readiness, plus project management -- not a list of activities or phases only.",
              "1 Project management; 2 Training portal (configured platform); 3 Launch courses (10 converted); 4 SSO integration; 5 Manager completion reports; 6 Support readiness (trained support team, knowledge base)."
            ),
            part(
              "Decomposition",
              "Decomposes one level-1 element into lower-level deliverables down to work packages that can be estimated and assigned, without adding out-of-scope work.",
              "3 Launch courses -> 3.1 Course conversion standard; 3.2 Converted courses 1-10 (each a work package: storyboard, build, accessibility check); 3.3 Course QA sign-off."
            ),
            part(
              "100% rule",
              "States the 100% rule: the WBS includes all of the scope and only the scope, and each level's children add up to their parent (so new course content stays out).",
              "The WBS holds 100% of the agreed scope and nothing more; the children of each element add up exactly to it. New course content is out of scope, so it appears nowhere."
            ),
            part(
              "WBS dictionary entry",
              "Writes a dictionary entry for one work package with a description, acceptance criteria, an owner and an estimate or due date.",
              "3.2.4 Converted course 4 (Data protection basics): convert the 40-slide deck into an interactive module; acceptance: passes the accessibility checklist and the SME signs off content; owner: L&D designer; estimate: 6 days."
            ),
          ],
        },
      ],
    },
    {
      slug: "critical-path-and-float",
      objective:
        "Planning and managing schedule: selecting a development-approach-appropriate estimating method, baselining the schedule, and analyzing schedule variance",
      kind: "build",
      title: "Find the critical path and the effect of delays",
      brief:
        "Activities (duration in days, predecessors): A 3 (none); B 4 (A); C 2 (A); D 5 (B); E 3 (C); F 2 (D and E). All links are finish-to-start and the project starts on day 0.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Analyse the network.",
          parts: [
            part("Critical path and duration", "Identifies A-B-D-F as the critical path with a project duration of 14 days (the other path A-C-E-F is 10 days).", "Paths: A-B-D-F = 3+4+5+2 = 14 days; A-C-E-F = 3+2+3+2 = 10 days. Critical path A-B-D-F, project duration 14 days."),
            numericPart("Float on C (days)", "Total float of 4 days for activity C (early start 3, late start 7). Met at exactly 4.", "C: early start 3, early finish 5; late finish 9 (E must finish by 12 for F), late start 7. Total float = 7 - 3 = 4 days.", { answer: 4, tolerance: 0, unit: "days" }),
            part("D slips 2 days", "States that D is on the critical path, so the project finishes 2 days late (day 16) unless recovered.", "D is critical with zero float, so the finish moves from day 14 to day 16 unless the team crashes or fast-tracks later work."),
            part("C slips 3 days", "States that the project end date does not move because C has 4 days of float, leaving 1 day of float on that path.", "No change to the finish date: C has 4 days of float, so a 3-day slip leaves 1 day on the A-C-E-F path."),
          ],
        },
      ],
    },
    {
      slug: "project-metrics-cost-schedule",
      objective:
        "Evaluating project status: developing project metrics, ensuring artifacts are created and kept accessible, and communicating status",
      kind: "build",
      title: "Measure cost and schedule performance",
      brief:
        "A predictive project has a budget at completion (BAC) of $200,000. At the week-10 status date the planned value (PV) is $80,000, the earned value (EV) is $60,000 and the actual cost (AC) is $75,000. The sponsor asks for a one-line forecast and what you will do.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the metrics and interpret them.",
          parts: [
            part("Variances", "CV = EV - AC = -$15,000 and SV = EV - PV = -$20,000, both read as unfavourable.", "CV = 60,000 - 75,000 = -$15,000 (over budget). SV = 60,000 - 80,000 = -$20,000 (behind schedule)."),
            part("Indices", "CPI = EV / AC = 0.80 and SPI = EV / PV = 0.75, both below 1.", "CPI = 60,000 / 75,000 = 0.80; SPI = 60,000 / 80,000 = 0.75 -- getting 80 cents of value per dollar and doing 75% of the planned work."),
            numericPart("Forecast EAC", "EAC = BAC / CPI = 200,000 / 0.80 = $250,000, assuming current cost performance continues. Met within $1.", "If cost performance continues: EAC = 200,000 / 0.80 = $250,000; ETC = 250,000 - 75,000 = $175,000; VAC = 200,000 - 250,000 = -$50,000.", { answer: 250000, tolerance: 1, unit: "USD" }),
            part("Status and action", "Reports the project as over budget and behind schedule and proposes a sensible next step (root-cause analysis of the variance, corrective actions, and a change request if baselines must change), not simply 'work harder'.", "Over budget and behind schedule. Find the cause (estimates, scope creep, productivity), agree corrective actions with the team, and if the baseline can't be recovered, raise a change request with the revised forecast for the sponsor's decision."),
          ],
        },
      ],
    },
    {
      slug: "risk-register-entries",
      objective:
        "Planning and managing risk: identifying and analyzing risks, maintaining a risk register, and executing a risk management plan",
      kind: "build",
      title: "Write risk register entries",
      brief:
        "Your project moves a company's payroll to a new cloud provider before the tax year ends in four months. Facts: the vendor's data-migration tool has never been used with your payroll system; the only engineer who knows the old system's custom tax rules is retiring in two months; and a new data-protection regulation may require extra controls if it passes next month.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write a complete register entry for one of these risks.",
          parts: [
            part("Risk statement", "Writes the risk in cause-risk-effect form (because of..., ...may happen, leading to...), not as a vague worry or as an issue that has already happened.", "Because the only engineer who knows the custom tax rules retires in two months, those rules may be migrated incorrectly, leading to payroll errors and missing the tax-year deadline."),
            part("Analysis", "Rates probability and impact on a stated scale and gives a score or priority with a short justification.", "Probability: high (0.7) -- retirement date is fixed and documentation is thin. Impact: very high (0.8) on schedule and compliance. Score 0.56 -> top priority."),
            part("Response and owner", "Chooses a fitting threat response (avoid, mitigate, transfer, escalate or accept) with concrete actions and a named owner.", "Mitigate: pair a second engineer with the retiring expert now, record each rule with test cases, and run parallel payroll for one cycle. Owner: payroll systems lead."),
            part("Trigger and contingency", "Names an early-warning trigger and a contingency plan to use if the risk occurs.", "Trigger: by week 4 fewer than 80% of tax rules documented with passing tests. Contingency: contract the retired engineer for a fixed number of hours and extend the parallel run."),
          ],
        },
      ],
    },
    {
      slug: "change-control-case",
      objective:
        "Managing and controlling changes: executing a change control process, communicating proposed-change status, and updating documentation to reflect approved changes",
      kind: "case",
      title: "Handle a scope change requested in the corridor",
      brief:
        "You manage a predictive project delivering a customer self-service portal with a baselined scope, schedule and budget and a change control board (CCB) chaired by the sponsor.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "A senior sales director asks one of your developers directly to add live chat to the portal \"since you're building it anyway\". The developer mentions it to you before starting.",
          ask: "What do you do?",
          parts: [
            part(
              "Response",
              "Does not let the work start unapproved; asks the director to submit a change request (or raises one with them) through the integrated change control process.",
              "Thank the developer and keep the work out of the sprint for now. Meet the director, capture the request in a change request and take it through the agreed change control process."
            ),
            part(
              "Impact analysis",
              "Analyses the change's impact on scope, schedule, cost, quality and risk before it goes to the decision-maker.",
              "Assess what live chat adds to scope, how long it takes, what it costs, what it does to quality, risk and other requirements, and what options exist (now, later release, not at all)."
            ),
          ],
        },
        {
          text: "The analysis shows live chat adds three weeks and $20,000. The CCB approves it with the extra budget and a new launch date.",
          ask: "What do you update and who do you tell?",
          parts: [
            part(
              "Updates",
              "Updates the affected baselines and documents (scope statement/WBS, schedule baseline, cost baseline, and related plans, registers and requirements) and the change log.",
              "Update the scope baseline (scope statement, WBS and dictionary), the schedule and cost baselines, the requirements documentation, the risk register for new risks, and the change log with the decision."
            ),
            part(
              "Communication",
              "Communicates the decision and new baseline to the team and affected stakeholders (including the sales director).",
              "Tell the team and stakeholders, including the sales director, what was approved, the new launch date and budget, through the channels in the communication plan."
            ),
          ],
        },
      ],
    },
    {
      slug: "risk-becomes-issue",
      objective:
        "Removing impediments and managing issues: evaluating impact, prioritizing, applying an intervention strategy, and recognizing when a risk becomes an issue",
      kind: "case",
      title: "Act when a planned-for risk happens",
      brief:
        "Your register lists the risk that the hardware vendor delivers servers late, with a contingency plan: use temporary cloud capacity for up to six weeks, funded from the contingency reserve. The trigger is a vendor confirmation slipping past 1 March.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "On 2 March the vendor confirms delivery will be five weeks late.",
          ask: "What has changed, and what do you do now?",
          parts: [
            part(
              "Risk to issue",
              "Recognises the risk has occurred and is now an issue: logs it in the issue log with an owner and updates the risk register.",
              "The risk has happened, so it is now an issue: record it in the issue log with an owner and due date, and update the risk register entry (risk occurred, response triggered)."
            ),
            part(
              "Planned response",
              "Implements the agreed contingency plan (temporary cloud capacity using the contingency reserve) rather than inventing a new response or waiting.",
              "Execute the contingency plan: provision the temporary cloud capacity now and draw on the contingency reserve as planned."
            ),
          ],
        },
        {
          text: "The cloud capacity works, but the security team says it needs an extra review that will take two weeks.",
          ask: "How do you handle this new problem?",
          parts: [
            part(
              "Secondary risk",
              "Identifies the security review delay as a secondary risk/issue arising from the response, assesses its impact and plans a response.",
              "This is a secondary risk created by our response. Assess its effect on the schedule, then respond -- for example start the review now in parallel, or limit the cloud setup to pre-approved services so the review is shorter."
            ),
            part(
              "Communication and learning",
              "Communicates the status to stakeholders and records lessons learned (for example adding security review lead time to future contingency plans).",
              "Update the sponsor and team on the new dates, and record the lesson that contingency plans which change infrastructure must include security review time."
            ),
          ],
        },
      ],
    },
  ],
};
