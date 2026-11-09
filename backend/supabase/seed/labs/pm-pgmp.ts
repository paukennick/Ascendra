import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-171: PgMP (PMI Program Management Professional).
//
// Aligned to the PgMP ECO's five domains as the seed track carries them
// (March 2024 ECO): Strategic Program Alignment 15%, Program Life Cycle
// Management 44%, Benefits Management 11%, Stakeholder Engagement 16%,
// Governance 14%. pmi.org's PgMP page, read 2026-11-09, still offers the
// exam (170 questions, 240 minutes) with the same weights and announces no
// new ECO; the ECO PDF itself answered "not on allowlist" to this session.
// (The page summary named the 11% domain "Business Alignment"; every other
// source, including the track, names it Benefits Management, so the track
// name is kept.)
// Density ("hybrid"): 2 / 3 / 2 / 2 / 2 = 11 labs (7 build, 4 case).
// Every number in a rubric is worked in its model answer.

const CHECKED = "2026-11-09";

export const PGMP_LABS: SeedLabSet = {
  trackCode: "PGMP",
  sources: [
    source("https://www.pmi.org/certifications/program-management-pgmp", "exam_outline", CHECKED),
    source("https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/pgmp-exam-content-outline.pdf", "exam_outline", "2026-09-27"),
  ],
  labs: [
    // Strategic Program Alignment (2)
    {
      slug: "pgmp-business-case-alignment",
      objective: "Developing and evaluating the program's business case: feasibility, readiness, and strategic alignment",
      kind: "build",
      title: "Test a business case against the strategy",
      brief:
        "Northgate Rail (fictional) has a three-year strategy: cut passenger delays by 30%, move 40% of ticket sales to digital, and hold operating costs flat. A program proposal, 'Smart Stations', asks for $24M over three years for digital ticket gates, real-time information screens and a new staff rostering system. Its business case lists benefits as 'modern stations, happier customers'. The IT department is already running two large projects and has no spare architects for 12 months.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Evaluate the business case for strategic alignment, feasibility and readiness, and say what must change before approval.",
          parts: [
            part(
              "Strategic alignment",
              "Maps each component to a named strategic objective (gates and digital sales to the 40% digital goal; real-time information to delay perception/reduction only if linked to operations; rostering to flat costs) and flags that the stated benefits are not tied to the strategy's measures.",
              "Digital gates -> 40% digital sales; rostering -> flat operating costs; information screens help customers but don't cut delays by themselves. 'Modern stations, happier customers' is not a strategic measure -- the case must state benefits as digital-sales share, delay minutes and cost."
            ),
            part(
              "Feasibility and readiness",
              "Identifies the IT capacity constraint as a readiness risk and proposes a response (phasing, external architects, sequencing components) with its effect on timing or cost.",
              "Readiness gap: no architects for 12 months. Options: phase the program so rostering (a packaged system) starts first, or buy external architect capacity; either changes the timeline or the $24M estimate and must be in the case."
            ),
            part(
              "Conditions for approval",
              "Lists specific changes: measurable benefits with baselines and targets, a phased roadmap with costs per phase, the resource plan, and key risks, before the case goes to the sponsor.",
              "Before approval: baseline and target for each benefit (e.g. digital share 18% -> 40%), cost and timing per phase, the IT resourcing decision, and the top risks with owners."
            ),
          ],
        },
      ],
    },
    {
      slug: "pgmp-charter-approval-case",
      objective: "Obtaining organizational leadership approval via a program charter (high-level costs, milestones, benefits)",
      kind: "case",
      title: "Get a program charter through the executive board",
      brief:
        "You are the program manager for Bayfield Council's (fictional) 'Digital Services' program: moving 20 paper processes online over two years for an estimated $6M, expected to save 45,000 staff hours a year.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The sponsor asks for a draft charter to take to the executive board next week.",
          ask: "What do you put in the charter?",
          parts: [
            part(
              "Content",
              "Includes the program's purpose tied to strategy, high-level scope (and exclusions), the $6M estimate with confidence, key milestones, expected benefits with measures, assumptions/constraints, major risks, governance (sponsor, board) and the program manager's authority.",
              "Purpose (council strategy: digital by default); scope: 20 processes, excluding back-office system replacement; $6M (rough order of magnitude, -25%/+50%); milestones: first 5 processes in 6 months, all 20 by month 24; benefit: 45,000 staff hours a year by year 3; key risks; sponsor, program board and PM authority."
            ),
          ],
        },
        {
          text: "At the board, the finance director says the 45,000-hour saving is 'not cash' and asks how it will be realised. Another director wants two extra processes added.",
          ask: "How do you respond to each?",
          parts: [
            part(
              "Benefit realisation",
              "Explains how hours convert to value (for example vacancies not refilled, redeployment to backlog work) with an owner in operations, and offers to add that to the charter's benefits section.",
              "Agree the hours are not cash unless acted on: the benefit owner (head of customer services) commits to not refilling about 20 posts as people leave and redeploying the rest. Add that conversion and its owner to the charter."
            ),
            part(
              "Scope request",
              "Doesn't accept the addition on the spot; notes it for impact analysis (cost, schedule, benefits) through the governance process after the charter is approved, or adds it explicitly with revised figures.",
              "Record the two processes as a proposed change, assess their cost, time and benefit, and bring them to the program board -- rather than changing the charter's figures in the meeting."
            ),
          ],
        },
      ],
    },

    // Program Life Cycle Management (3)
    {
      slug: "pgmp-integrated-plan",
      objective: "Establishing an integrated program management plan (schedule, quality, risk, communication, resources) across constituent projects",
      kind: "build",
      title: "Integrate three projects into one program plan",
      brief:
        "Halden Hospital's (fictional) 'New Wing' program has three projects: Construction (18 months), Equipment (fit-out can start only after construction handover), and Staffing (recruit and train 120 staff, needing 6 months before opening). The same commissioning engineer is needed by Construction for its final 2 months and by Equipment for its first 2 months. Each project has its own risk register and reports monthly in its own format.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the key parts of the integrated program management plan.",
          parts: [
            part(
              "Integrated schedule",
              "Shows the inter-project dependencies (construction handover -> equipment fit-out; staffing finishing before opening) as program milestones, and plans staffing backward from the opening date.",
              "Program milestones: construction handover (month 18) -> equipment fit-out (months 19-22) -> opening (month 23). Staffing starts recruitment by month 17 so training (6 months) ends before opening."
            ),
            part(
              "Shared resource",
              "Resolves the commissioning engineer conflict at program level (sequence, backfill or second engineer) rather than leaving the projects to compete.",
              "The engineer's last 2 months on construction overlap equipment's first 2. The program resources a second engineer for equipment's start, or shifts equipment's first tasks to work that doesn't need commissioning."
            ),
            part(
              "Risk and reporting",
              "Sets up a program risk register that rolls up and escalates project risks over agreed thresholds, and a common reporting format and cadence.",
              "Program risk register reviewed monthly; projects escalate any risk that threatens a program milestone or exceeds $250k impact. One reporting template (milestones, RAG, risks, issues, benefits) for all three projects."
            ),
          ],
        },
      ],
    },
    {
      slug: "pgmp-variance-corrective-action-case",
      objective: "Analyzing cost/schedule/quality/risk variances against planned values and updating plans with corrective actions",
      kind: "case",
      title: "Read the program's performance and act",
      brief:
        "Program 'Clearwater' (fictional) has three projects. At month 9 of 24: Project A planned value $4.0M, earned value $3.6M, actual cost $4.5M; Project B PV $2.0M, EV $2.2M, AC $2.0M; Project C PV $3.0M, EV $2.4M, AC $2.4M.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The steering committee wants to know where the program stands.",
          ask: "Calculate the variances and indices for each project and the program.",
          parts: [
            part(
              "Project figures",
              "A: CV -0.9M, SV -0.4M, CPI 0.80, SPI 0.90. B: CV +0.2M, SV +0.2M, CPI 1.10, SPI 1.10. C: CV 0, SV -0.6M, CPI 1.00, SPI 0.80.",
              "A: CV = 3.6 - 4.5 = -0.9M; SV = 3.6 - 4.0 = -0.4M; CPI 0.80; SPI 0.90. B: CV +0.2M; SV +0.2M; CPI 1.10; SPI 1.10. C: CV 0; SV -0.6M; CPI 1.00; SPI 0.80."
            ),
            part(
              "Program view",
              "Program PV 9.0M, EV 8.2M, AC 8.9M: CV -0.7M, SV -0.8M, CPI about 0.92, SPI about 0.91; notes that the total hides A's cost problem and C's schedule problem.",
              "Program: CV = 8.2 - 8.9 = -0.7M, SV = 8.2 - 9.0 = -0.8M, CPI 0.92, SPI 0.91. The roll-up looks moderate but hides two different problems: A is over cost, C is behind schedule."
            ),
          ],
        },
        {
          text: "A's overrun comes from rework after a design change; C is late because a supplier delivered late, and C's output is needed by a program milestone in month 12.",
          ask: "What corrective actions do you take at program level?",
          parts: [
            part(
              "Actions",
              "For A: root cause, change control for the design, and a revised estimate (e.g. EAC); for C: recovery options to protect the month-12 milestone (fast-tracking, crashing, supplier escalation) and impact on dependent projects; updates plans and reports through governance.",
              "A: stop further rework by freezing the design through change control and re-estimate (EAC = BAC / CPI if the trend continues). C: escalate with the supplier, add resources or overlap tasks to recover the 0.6M of work before month 12, and tell dependent projects. Update the program plan and report both to the steering committee."
            ),
          ],
        },
      ],
    },
    {
      slug: "pgmp-program-closure",
      objective: "Conducting program closure: approving constituent-project closeout, transition to operations, and archiving lessons learned",
      kind: "build",
      title: "Write the program closure checklist",
      brief:
        "The 'Unified Payroll' program at Kestrel Group (fictional) has delivered its last project: five country payrolls now run on one system. Two of the five project teams have already disbanded; one country's tax module still has an open defect with a workaround. Operations will run the system from next month.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the closure steps the program manager must complete.",
          parts: [
            part(
              "Project closeout",
              "Confirms each constituent project's closure against its acceptance criteria and handles the open defect explicitly (accepted with workaround and owner, or kept open as a transferred item).",
              "Check each project's closure report and acceptance sign-off. The open tax defect is transferred to operations with the workaround, an owner and a fix date, and recorded as an accepted exception."
            ),
            part(
              "Transition to operations",
              "Completes a formal handover: support model, documentation, training, contracts transferred, and the benefit owner accepting responsibility for ongoing benefits.",
              "Operations signs the transition: support model live, run books and documentation handed over, staff trained, supplier contracts moved to operations, and the payroll director accepts ownership of the remaining benefits."
            ),
            part(
              "Lessons and archive",
              "Collects lessons learned (including from the disbanded teams) and archives program records, then releases resources and obtains governance approval to close.",
              "Run a lessons-learned session, contacting the two disbanded teams' leads; archive plans, decisions, risks and benefits records; release remaining staff; ask the program board to approve closure."
            ),
          ],
        },
      ],
    },

    // Benefits Management (2)
    {
      slug: "pgmp-benefits-realization-plan",
      objective: "Developing a benefits realization plan and its measurement criteria, then baselining and communicating it to sponsors",
      kind: "build",
      title: "Write the benefits realization plan",
      brief:
        "Riverton Bank's (fictional) 'Faster Lending' program will introduce online applications, automated credit checks and a new underwriting workflow. Leadership expects decisions in 2 days instead of 9, 15% more approved loans from the same staff, and fewer customer complaints. Nobody has measured current complaint levels.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the core of the benefits realization plan.",
          parts: [
            part(
              "Benefits and measures",
              "Lists each benefit with a measure, baseline, target, timing and owner, and flags that the complaint baseline must be measured before it can be a target.",
              "Decision time: median days from application to decision, baseline 9, target 2 by 6 months after launch, owner head of lending. Approvals per underwriter per month: baseline from last 6 months, target +15% by month 9. Complaints: measure the baseline for 3 months first, then set the target."
            ),
            part(
              "Dependencies",
              "Links each benefit to the program outputs that enable it, so it's clear which project delay would put a benefit at risk.",
              "Decision time depends on automated credit checks and the new workflow; productivity on the workflow plus training; complaints on online applications and faster decisions."
            ),
            part(
              "Baseline and communication",
              "Gets the sponsor to approve the plan as a baseline and sets a reporting rhythm (e.g. quarterly benefits report to the program board) and how changes are controlled.",
              "Sponsor signs the plan as the benefits baseline; benefits reported quarterly to the program board; any change to a target goes through program change control."
            ),
          ],
        },
      ],
    },
    {
      slug: "pgmp-benefits-variance-case",
      objective: "Monitoring benefit metrics (forecasting, variance analysis, what-if scenarios) and taking corrective action to protect realization",
      kind: "case",
      title: "A benefit falling short after launch",
      brief:
        "Six months after Riverton Bank's (fictional) new lending workflow went live, the median decision time has dropped from 9 days to 4, against a target of 2.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Data shows 70% of applications are decided in 1 day, but 30% go to manual review and take about 9 days.",
          ask: "What do you analyse, and how do you forecast where this benefit will end up?",
          parts: [
            part(
              "Analysis",
              "Recognises the median hides two populations, identifies manual review as the cause, and investigates why 30% are referred (rules too strict, data missing).",
              "The average hides a split: automated cases are fast, the 30% sent to manual review are as slow as before. Find out why they're referred -- for example missing income documents or overly strict rules."
            ),
            part(
              "Forecast",
              "Explains that without action the measure will stay near the current level because the manual path hasn't changed, and does a what-if (e.g. referral rate cut to 10%).",
              "Without change the median stays around 4 days. What-if: if better document upload cuts referrals to 10%, most cases finish in a day and the median approaches the 2-day target."
            ),
          ],
        },
        {
          text: "Analysis shows most referrals are for missing payslips, which the online form doesn't ask for.",
          ask: "What corrective action do you take, and through what process?",
          parts: [
            part(
              "Corrective action",
              "Proposes a change (require payslip upload, automated income verification) as a change request with cost and benefit impact, approved by governance, with the benefits register updated and monitoring continued.",
              "Raise a change to add payslip upload and an income-verification check to the form, with its cost and forecast effect on decision time; after board approval, update the benefits register and track the referral rate monthly."
            ),
          ],
        },
      ],
    },

    // Stakeholder Engagement (2)
    {
      slug: "pgmp-stakeholder-matrix",
      objective: "Identifying sponsors/steering committee members and building a stakeholder matrix documenting each one's position on the program",
      kind: "build",
      title: "Map the stakeholders of a merger program",
      brief:
        "Two fictional regional water companies, Aldermere and Brookvale, are merging their customer service operations in an 18-month program. Stakeholders: the group CEO (sponsor), the two customer service directors (Aldermere's supportive; Brookvale's openly worried about job losses), the unions, the regulator (must approve service standards), the IT director (stretched), and 600 front-line staff.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Build the stakeholder matrix and name the steering committee.",
          parts: [
            part(
              "Matrix",
              "For each stakeholder records interest, influence/power, current and desired position (e.g. resistant, neutral, supportive) and what they need.",
              "CEO: high power, supportive -> leading. Aldermere director: high, supportive. Brookvale director: high, resistant -> neutral or supportive, needs job-impact plan. Unions: high, resistant -> neutral, need consultation. Regulator: high, neutral, needs evidence standards hold. IT director: high, neutral, needs capacity. Staff: high interest, low individual power, anxious -> informed and involved."
            ),
            part(
              "Steering committee",
              "Proposes a steering committee with the sponsor and the people who own resources or decisions (both directors, IT director, HR/finance), and states the regulator and unions engage through separate channels rather than as members.",
              "Steering committee: CEO (chair), both customer service directors, IT director, HR and finance directors. The regulator and unions are engaged through formal consultation and reporting, not committee membership."
            ),
            part(
              "Engagement priorities",
              "Names the first actions for the highest-risk stakeholders (Brookvale director, unions).",
              "Meet the Brookvale director early to co-design the workforce plan; open formal consultation with the unions before any announcement."
            ),
          ],
        },
      ],
    },
    {
      slug: "pgmp-stakeholder-risk-incorporation",
      objective: "Evaluating stakeholder-identified risks and incorporating them into the program risk management plan",
      kind: "build",
      title: "Turn stakeholder concerns into program risks",
      brief:
        "During consultation on the Aldermere-Brookvale (fictional) customer service merger, stakeholders raised: (1) the regulator warns that if call-answer times worsen during migration it could impose penalties; (2) unions say staff may leave early if job security isn't clear, taking expertise; (3) the IT director says the two billing systems use different customer IDs.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write these as program risks with analysis, owners and responses.",
          parts: [
            part(
              "Risk statements",
              "Writes each in cause-event-effect form with the stakeholder as source.",
              "1 Because migration diverts staff, call-answer times may exceed the regulatory standard, leading to penalties (source: regulator). 2 Because job security is unclear, experienced staff may leave early, reducing service quality (unions). 3 Because the billing systems use different customer IDs, data may be mismatched during merger, causing billing errors (IT)."
            ),
            part(
              "Assessment and owners",
              "Assesses probability and impact for each with a rationale and assigns an owner at the right level.",
              "1 Medium probability, high impact -- owner: customer service directors. 2 High probability, high impact -- owner: HR director. 3 High probability, medium impact -- owner: IT director."
            ),
            part(
              "Responses",
              "Gives a specific response per risk and how it will be monitored and reported back to the stakeholder who raised it.",
              "1 Mitigate: phased migration with temporary staff and a weekly answer-time dashboard shared with the regulator. 2 Mitigate: publish the workforce plan and retention payments for key roles, track attrition monthly. 3 Mitigate: build a customer ID mapping table and reconcile before each cut-over."
            ),
          ],
        },
      ],
    },

    // Governance (2)
    {
      slug: "pgmp-stage-gate-review-case",
      objective: "Obtaining authorization through stage-gate reviews to proceed to the next program phase",
      kind: "case",
      title: "Run the gate into the delivery phase",
      brief:
        "Ironwood Defence Systems' (fictional) 'Next-Gen Radar' program finishes its definition phase. Gate criteria (agreed in the governance plan): approved benefits plan, integrated schedule with less than 10% unfunded scope, all high risks with owners and responses, and supplier contracts signed for long-lead items.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Status before the gate: benefits plan approved; schedule complete with 18% of scope unfunded; two high risks have owners but no responses; one of three long-lead contracts is unsigned pending a legal review due in 3 weeks.",
          ask: "What do you recommend to the gate review board?",
          parts: [
            part(
              "Assessment",
              "Compares status with each criterion and identifies which are met and not met (unfunded scope 18% > 10%; risk responses missing; one contract unsigned).",
              "Met: benefits plan. Not met: unfunded scope 18% vs 10% limit; two high risks lack responses; one long-lead contract unsigned."
            ),
            part(
              "Recommendation",
              "Recommends a conditional go or a hold with specific conditions and dates (fund or descope to below 10%, complete risk responses, sign the contract), rather than a plain go.",
              "Recommend a conditional approval: proceed only with work that doesn't depend on the unsigned contract, with conditions -- unfunded scope below 10% within 4 weeks, risk responses within 2 weeks, contract signed after legal review -- and a follow-up check by the board."
            ),
          ],
        },
        {
          text: "The board approves conditionally. Four weeks later the unfunded scope is down to 12% and the contract is signed.",
          ask: "What happens now?",
          parts: [
            part(
              "Follow-through",
              "Reports the partial completion to the board and asks for a decision (further time, descoping options, or acceptance of the risk) rather than proceeding as if fully approved; records the decision.",
              "Report that one condition is still unmet (12% vs 10%), present options -- descope 2% of lower-priority features or extend by 2 weeks -- and get the board's decision recorded before releasing further funds."
            ),
          ],
        },
      ],
    },
    {
      slug: "pgmp-escalation-policy",
      objective: "Establishing escalation policies so risks are handled at the appropriate organizational level",
      kind: "build",
      title: "Write a program escalation policy",
      brief:
        "The 'City Mobility' program at Larkfield Council (fictional) has five projects with budgets of $2-8M each, a program contingency reserve of $3M, and a program board meeting monthly. Last quarter a project manager spent two weeks trying to resolve a $600k supplier dispute on his own before anyone at program level heard about it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the escalation policy.",
          parts: [
            part(
              "Thresholds by level",
              "Defines escalation thresholds by level (project -> program manager -> program board -> sponsor/executive) using measurable triggers (cost, schedule, benefit, reputation or safety).",
              "Project manager handles issues under $100k and under 2 weeks' slip. Program manager: $100k-$500k, up to 1 month, or any cross-project impact. Program board: over $500k, over 1 month, any use of program contingency, or any threat to a benefit. Sponsor: anything over $1.5M, safety or political/reputational risk."
            ),
            part(
              "Timing and route",
              "Sets time limits for raising issues (e.g. within 2 working days of identification) and the route/format, so issues don't sit at project level.",
              "Raise within 2 working days of identifying an issue that meets a threshold, using the issue log and a direct call to the next level; urgent items don't wait for the monthly board."
            ),
            part(
              "Applying it",
              "Applies the policy to the $600k supplier dispute (it should have gone to the program board within 2 days) and says how compliance will be checked.",
              "The $600k dispute exceeds $500k, so it should have gone to the program board within 2 days. Compliance: the program office reviews the issue log weekly and the board sees aging escalations."
            ),
          ],
        },
      ],
    },
  ],
};
