import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-171: PfMP (PMI Portfolio Management Professional).
//
// Aligned to the PfMP Examination Content Outline's five domains: Strategic
// Alignment 25%, Governance 20%, Portfolio Performance 25%, Portfolio Risk
// Management 15%, Communications Management 15%. pmi.org's PfMP page, read
// 2026-11-09, still offers the exam (170 questions, 240 minutes) with these
// weights and announces no new outline; the outline PDF (c)2013 was read on
// 2026-11-08 for the track (REQ-142).
// Density ("hybrid"): 3 / 2 / 2 / 2 / 2 = 11 labs (7 build, 4 case).
// Every number in a rubric is worked in its model answer.

const CHECKED = "2026-11-09";

export const PFMP_LABS: SeedLabSet = {
  trackCode: "PFMP",
  sources: [
    source("https://www.pmi.org/certifications/portfolio-management-pfmp", "exam_outline", CHECKED),
    source(
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/portfolio-management-professional-exam-outline.pdf",
      "exam_outline",
      "2026-11-08"
    ),
  ],
  labs: [
    // Strategic Alignment (3)
    {
      slug: "pfmp-prioritization-criteria-scoring",
      objective: "Ranking strategic priorities with key stakeholders using qualitative and quantitative analysis",
      kind: "build",
      title: "Score and rank five proposals",
      brief:
        "Meridian Foods (fictional) has $10M of capital this year. Agreed criteria and weights: strategic fit 40%, financial return 30%, risk (higher score = lower risk) 20%, regulatory need 10%. Scores (1-5) for each proposal, in the order fit / return / risk / regulatory, with cost: P1 new snack line 5/4/2/1, $4M. P2 plant automation 3/5/4/1, $3M. P3 food-safety tracing 3/2/4/5, $2M. P4 e-commerce site 4/3/3/1, $3M. P5 office refurbishment 1/1/5/1, $1M. Food-safety tracing becomes legally required next year.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the weighted scores, rank the proposals and recommend what to fund within $10M.",
          parts: [
            part(
              "Weighted scores",
              "P1 = 5x0.4+4x0.3+2x0.2+1x0.1 = 3.7; P2 = 1.2+1.5+0.8+0.1 = 3.6; P3 = 1.2+0.6+0.8+0.5 = 3.1; P4 = 1.6+0.9+0.6+0.1 = 3.2; P5 = 0.4+0.3+1.0+0.1 = 1.8.",
              "P1 3.7; P2 3.6; P4 3.2; P3 3.1; P5 1.8 (e.g. P1 = 2.0 + 1.2 + 0.4 + 0.1)."
            ),
            part(
              "Recommendation",
              "Treats P3 as mandatory because of the legal requirement (funded regardless of rank), then funds by rank within the remaining budget: P3 $2M + P1 $4M + P2 $3M = $9M; P4 ($3M) doesn't fit; P5 not funded.",
              "Fund P3 first as a legal must-do ($2M), then P1 ($4M) and P2 ($3M): $9M total. P4 would take spending to $12M, so it waits for next cycle or a smaller first phase ($1M fits). P5 isn't funded."
            ),
            part(
              "Stakeholder check",
              "Notes the ranking is a decision aid to discuss with stakeholders and runs a quick sensitivity (e.g. would raising return's weight change the order?).",
              "Present the ranking to the investment committee as input, not the answer. Sensitivity: with return at 40% and fit at 30%, P2 (3.8) overtakes P1 (3.6); the funded set doesn't change."
            ),
          ],
        },
      ],
    },
    {
      slug: "pfmp-what-if-scenarios-case",
      objective: "Creating and evaluating what-if portfolio scenarios (options analysis, risk analysis, SWOT, financial analysis)",
      kind: "case",
      title: "Two portfolio scenarios under a budget cut",
      brief:
        "Meridian Foods' (fictional) approved portfolio is P3 food-safety tracing ($2M, legally required), P1 snack line ($4M, NPV $6M), P2 plant automation ($3M, NPV $5M), total $9M.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Mid-year, the board cuts capital by $2M. Two scenarios are proposed: A -- drop P2 (saves $3M); B -- phase P1, spending $2M now and $2M next year (NPV falls to $4.5M because launch slips).",
          ask: "Compare the scenarios financially and recommend one.",
          parts: [
            part(
              "Financial comparison",
              "A: spend $6M, portfolio NPV $6M (P1) plus P3's compliance value; B: spend $7M this year, NPV $4.5M + $5M = $9.5M. B keeps more value but spends $7M, which is within the new $7M limit.",
              "New budget $7M. A spends $6M and keeps NPV $6M. B spends $2M (P1 phase 1) + $3M + $2M = $7M and keeps NPV $4.5M + $5M = $9.5M. B is within budget and keeps $3.5M more NPV."
            ),
            part(
              "Risk view",
              "Notes B's risks (launch delay lets competitors in, phasing raises cost) and A's (losing automation savings), and recommends B with a risk response.",
              "Recommend B. Risks: a competitor could launch first (watch market, keep the option to accelerate if funds return), and phasing may add cost (cap it in the business case)."
            ),
          ],
        },
        {
          text: "The regulator brings forward the tracing deadline by six months, which needs an extra $1M for P3 this year.",
          ask: "How does this change your scenario?",
          parts: [
            part(
              "Re-balance",
              "Funds P3's extra $1M first as mandatory, then re-balances (e.g. phase P2 or reduce P1 phase 1) to stay within $7M, and takes the decision to governance.",
              "P3 rises to $3M. With $7M: P3 $3M + P2 $3M + P1 phase 1 $1M = $7M, or defer part of P2. Take both options with their NPV impact to the investment committee."
            ),
          ],
        },
      ],
    },
    {
      slug: "pfmp-portfolio-roadmap",
      objective: "Building a high-level portfolio roadmap with key stakeholders that reflects sequencing, dependencies, and strategic alignment",
      kind: "build",
      title: "Sequence a portfolio roadmap",
      brief:
        "Tidewater Insurance (fictional) approved: a new customer data platform (CDP, 12 months), a claims self-service portal (9 months; needs the CDP's customer data), a pricing analytics program (6 months; needs the CDP), a mandatory regulatory reporting upgrade (6 months, due within 10 months), and a broker app (8 months; independent). Only two large delivery teams are available at a time.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Draft the roadmap and explain the sequencing.",
          parts: [
            part(
              "Sequence",
              "Starts the regulatory upgrade and the CDP first (deadline and the key dependency), then pricing analytics and the claims portal after the CDP, with the broker app placed where capacity allows.",
              "Team 1: regulatory upgrade months 1-6 (inside the 10-month deadline), then broker app months 7-14, then pricing analytics months 15-20. Team 2: CDP months 1-12, then claims portal months 13-21 (CDP data available from month 13). Never more than two streams at once; everything is done by month 21."
            ),
            part(
              "Dependencies and capacity",
              "Shows the dependencies (portal and analytics on CDP) and respects the two-team limit, noting where the plan uses a third team or overlaps if it does.",
              "Portal and analytics both wait for the CDP. In months 13-14 team 1 is still on the broker app, so only one CDP-dependent program can start in month 13 (the portal, on team 2) and analytics waits for team 1 in month 15. The broker app can't finish by month 12: team 1 is on the regulatory upgrade until month 6 and the app takes 8 months."
            ),
            part(
              "Alignment",
              "Links each roadmap item to a strategic goal and notes the roadmap will be reviewed with stakeholders and updated as priorities change.",
              "Regulatory -> compliance; CDP -> data-driven strategy (enabler); portal -> customer experience; analytics -> profitable growth; broker app -> distribution. Reviewed quarterly with the portfolio board."
            ),
          ],
        },
      ],
    },

    // Governance (2)
    {
      slug: "pfmp-governance-model",
      objective: "Defining a governance model: structure (steering committees, governance boards), policies, decision rights, and responsibilities",
      kind: "build",
      title: "Design the portfolio governance model",
      brief:
        "Brightline Utilities (fictional) runs about 60 projects and 4 programs worth $120M a year. Today the CEO approves every project over $50k personally, and business units start smaller projects without telling anyone. Projects regularly compete for the same engineers.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Define the governance structure, decision rights and key policies.",
          parts: [
            part(
              "Structure",
              "Creates a portfolio governance board (executives) supported by a portfolio management office, with program boards for the programs.",
              "Portfolio board: CEO (chair), COO, CFO, business unit heads -- meets monthly. Portfolio management office: analysis, reporting and the pipeline. Program boards for each of the four programs."
            ),
            part(
              "Decision rights",
              "Defines tiered decision rights by value/risk (e.g. under $250k business unit with PMO registration, $250k-$2M portfolio board, over $2M CEO/board) so the CEO isn't approving everything.",
              "All work registered with the PMO. Under $250k: business unit head approves, if within its allocation. $250k-$2M: portfolio board. Over $2M or high risk: portfolio board recommends, CEO approves."
            ),
            part(
              "Policies",
              "Sets policies for intake (no work starts unregistered), prioritisation using agreed criteria, resource allocation for shared engineers, and periodic review/termination of components.",
              "Intake: nothing starts without PMO registration and a short business case. Prioritisation: scored against agreed criteria each quarter. Shared engineers allocated by the portfolio board by priority. Quarterly review can pause or stop components."
            ),
          ],
        },
      ],
    },
    {
      slug: "pfmp-portfolio-decision-approval-case",
      objective: "Making and obtaining approval for portfolio decisions (components, plans, budget, roadmap) through the defined governance model",
      kind: "case",
      title: "Stop or continue an underperforming project",
      brief:
        "At Brightline Utilities (fictional), the portfolio board's policy says components are reviewed quarterly against their business case and may be stopped if the expected value falls below cost.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The 'Smart Meter Analytics' project has spent $3M of a $5M budget. The new estimate to complete is $4M (total $7M), and expected benefits have dropped from $9M to $5M because a regulator-mandated tool now provides similar data. Its sponsor wants to continue.",
          ask: "What does the analysis show, and what do you recommend?",
          parts: [
            part(
              "Analysis",
              "Treats the $3M spent as sunk and compares the remaining cost ($4M) with the remaining benefit ($5M), and notes overlap with the mandated tool; considers redirecting the $4M elsewhere.",
              "The $3M already spent is sunk. Going forward: $4M more cost for $5M of benefit -- a small net gain of $1M, and part of the benefit overlaps the mandated tool. Compare with what $4M would earn on the next project in the pipeline."
            ),
            part(
              "Recommendation",
              "Recommends a decision based on forward-looking value (continue reduced scope, or stop and reallocate) and states it goes to the portfolio board, not decided by the sponsor or the analyst.",
              "Recommend reducing scope to the features the mandated tool doesn't provide, or stopping if the board's next-ranked project returns more than $1M on $4M. Present both options to the portfolio board for the decision."
            ),
          ],
        },
        {
          text: "The board decides to stop the project. The sponsor is unhappy and asks whether the team can 'finish quietly' using operations budget.",
          ask: "How do you respond?",
          parts: [
            part(
              "Governance",
              "Declines, explaining that the decision binds and that using other budgets would bypass governance; offers a route (a new proposal through intake) and ensures closure, lessons learned and reallocation of resources.",
              "No: the board's decision stands and moving the work to an operations budget would bypass the governance model. If something has changed, the sponsor can submit a new proposal through intake. Meanwhile close the project, capture lessons and release the team."
            ),
          ],
        },
      ],
    },

    // Portfolio Performance (2)
    {
      slug: "pfmp-resource-supply-demand",
      objective: "Analyzing and optimizing resource allocation/reallocation (people, tools, technology, finance) via supply/demand analysis",
      kind: "build",
      title: "Balance engineer demand across the portfolio",
      brief:
        "Brightline Utilities (fictional) has 40 network engineers. Next quarter's demand from approved components (in engineer FTE): Grid Upgrade (priority 1) 18, Outage App (priority 2) 10, Substation Refresh (priority 3) 12, Fibre Rollout (priority 4) 8. Operations also needs 5 engineers for emergency response, which is non-negotiable.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Do the supply/demand analysis and propose an allocation.",
          parts: [
            part(
              "Gap",
              "Calculates demand 18+10+12+8+5 = 53 against supply 40, a shortfall of 13 FTE.",
              "Demand = 18 + 10 + 12 + 8 + 5 = 53; supply 40; gap 13 FTE."
            ),
            part(
              "Allocation",
              "Allocates by priority after the non-negotiable 5: Grid 18, Outage App 10, Substation 7 of 12, Fibre 0 -- totalling 40, and states the effect on each component.",
              "Operations 5, Grid Upgrade 18, Outage App 10 = 33; 7 left for Substation Refresh (of 12, so it slows by roughly 40%); Fibre Rollout gets none and is paused one quarter."
            ),
            part(
              "Options and decision",
              "Proposes ways to close the gap (contractors, re-phasing, skills sharing), notes cost/schedule effects on lower-priority components, and takes the trade-off to the portfolio board.",
              "Options: hire 5 contract engineers for Substation, re-phase Fibre to next quarter, or train 3 technicians for simpler tasks. Present the allocation and options with their cost and schedule impact to the portfolio board for decision."
            ),
          ],
        },
      ],
    },
    {
      slug: "pfmp-escalate-issue-case",
      objective: "Managing and escalating issues to appropriate decision-makers for timely resolution",
      kind: "case",
      title: "A supplier failure that hits three projects",
      brief:
        "In Tidewater Insurance's (fictional) portfolio, a cloud hosting supplier used by three projects has announced it will close its regional data centre in 60 days.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Each project manager is handling it separately; one has started talking to a new supplier.",
          ask: "Why is this a portfolio issue, and what do you do?",
          parts: [
            part(
              "Portfolio-level issue",
              "Recognises it affects multiple components, may need a common solution and contract decision, and exceeds individual project authority, so the portfolio office coordinates and escalates.",
              "It hits three components at once, needs one supplier decision rather than three, and may change budgets and the roadmap -- beyond any single project's authority. The portfolio office takes ownership and logs it as a portfolio issue."
            ),
            part(
              "Immediate actions",
              "Pauses separate negotiations, gathers impact from all three projects, and escalates to the right decision-maker per the escalation thresholds with options and a deadline.",
              "Ask project managers to pause separate supplier talks; collect each project's impact within a week; present options (migrate to another region of the same supplier, or a new supplier) to the portfolio board with a decision date well before day 60."
            ),
          ],
        },
        {
          text: "The board chooses migration to the supplier's other region, costing $400k across the projects and delaying one by a month.",
          ask: "What follows the decision?",
          parts: [
            part(
              "Follow-through",
              "Updates budgets, roadmap and risk register, communicates the decision to stakeholders, assigns an owner and tracks the migration to closure.",
              "Release $400k from the portfolio reserve, update the roadmap for the one-month delay, record the decision, assign a migration lead, tell affected stakeholders, and track weekly until migration is complete."
            ),
          ],
        },
      ],
    },

    // Portfolio Risk Management (2)
    {
      slug: "pfmp-dependency-analysis",
      objective: "Performing dependency analysis to identify and monitor risks across interdependent portfolio components",
      kind: "build",
      title: "Find the portfolio's single points of failure",
      brief:
        "Tidewater Insurance's (fictional) portfolio: the customer data platform (CDP) feeds the claims portal, pricing analytics and the broker app. The broker app also depends on a partner API owned by an external broker network. The regulatory reporting upgrade and the CDP share the same small data-engineering team of six.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Analyse the dependencies and write the resulting portfolio risks and monitoring.",
          parts: [
            part(
              "Dependency map",
              "Identifies the CDP as the critical hub (three dependants), the shared data-engineering team as a resource dependency, and the partner API as an external dependency.",
              "CDP -> portal, analytics, broker app (hub); data-engineering team -> CDP and regulatory upgrade (shared resource); partner API -> broker app (external)."
            ),
            part(
              "Portfolio risks",
              "Writes risks that arise from dependencies (CDP delay cascades to three components; team overload delays the mandatory regulatory work; partner API changes break the broker app).",
              "A CDP slip would delay three components and their benefits. Overloading the shared team could miss the regulatory deadline (compliance risk). A change to the partner API could stop the broker app."
            ),
            part(
              "Monitoring",
              "Sets leading indicators and owners (CDP milestone tracking, team utilisation, partner change notices) reviewed at portfolio level.",
              "Track CDP milestones weekly at the portfolio office; watch data-team utilisation (flag above 90%); agree change-notice terms with the partner network. Review these indicators monthly at the portfolio board."
            ),
          ],
        },
      ],
    },
    {
      slug: "pfmp-management-reserve",
      objective: "Recommending and obtaining approval for a portfolio management reserve based on aggregate risk exposure",
      kind: "build",
      title: "Size the portfolio reserve",
      brief:
        "Meridian Foods' (fictional) portfolio risk register lists portfolio-level threats not covered by component contingencies: R1 ingredient price spike, probability 30%, impact $2.0M; R2 regulatory change to labelling, 20%, $1.5M; R3 key supplier failure, 10%, $3.0M; R4 IT platform delay, 40%, $0.5M. There is also an opportunity O1: a government grant, 25%, worth $0.8M.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the aggregate exposure and recommend a reserve.",
          parts: [
            part(
              "Expected values",
              "R1 0.6M, R2 0.3M, R3 0.3M, R4 0.2M = 1.4M threats; O1 0.2M; net 1.2M.",
              "R1 0.3 x 2.0 = 0.6M; R2 0.2 x 1.5 = 0.3M; R3 0.1 x 3.0 = 0.3M; R4 0.4 x 0.5 = 0.2M; threats 1.4M. O1 0.25 x 0.8 = 0.2M. Net exposure 1.2M."
            ),
            part(
              "Recommendation",
              "Recommends a reserve based on the expected value (about $1.2-1.4M) and explains whether to count the opportunity, noting a single large risk (R3, $3M) would exceed it and how that is handled (risk tolerance, mitigation, or escalation).",
              "Recommend about $1.4M (not counting the grant until it's confirmed). It won't cover R3 fully if it occurs ($3M), so mitigate R3 with a second supplier and agree with the board that a supplier failure would be escalated for additional funding."
            ),
            part(
              "Approval and control",
              "Takes the reserve to the portfolio governance board for approval and sets rules for drawing on it and reviewing it as risks change.",
              "Present to the portfolio board; drawdowns approved by the board on evidence the risk occurred; recalculate quarterly as risks close or change."
            ),
          ],
        },
      ],
    },

    // Communications Management (2)
    {
      slug: "pfmp-aggregate-communication-plan",
      objective: "Creating an aggregate communication strategy and plan: methods, recipients, vehicles, timelines, and frequency",
      kind: "build",
      title: "Write the portfolio communication plan",
      brief:
        "Brightline Utilities' (fictional) portfolio of 60 projects and 4 programs reports through 64 separate status reports each month. Executives say they can't see the overall picture; business unit heads complain they learn about decisions affecting them from rumours; the regulator requires a quarterly update on safety-related investments.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the aggregate communication plan.",
          parts: [
            part(
              "Audiences and content",
              "Defines content per audience: executives (aggregate dashboard: strategic alignment, value, risk, top issues), business unit heads (decisions and impacts on their units), regulator (safety investment progress), component managers (decisions and priorities).",
              "Executives: one-page portfolio dashboard (value delivered, spend vs plan, top 5 risks and decisions needed). Business unit heads: decisions and resource changes affecting them. Regulator: safety-investment progress. Project/program managers: priority changes and board decisions."
            ),
            part(
              "Methods, vehicles and frequency",
              "Specifies methods and timing for each (monthly dashboard and board meeting, decision notices within 2 days, quarterly regulator report, intranet portfolio page).",
              "Monthly dashboard before the board; board decisions emailed to affected business unit heads within 2 working days; quarterly formal report to the regulator; a portfolio intranet page updated monthly."
            ),
            part(
              "Feeding the aggregate",
              "Replaces 64 different reports with a standard component status template that rolls up automatically.",
              "Every component submits the same short template (milestones, cost, risks, benefits) by the 5th of the month; the PMO rolls it up into the dashboard."
            ),
          ],
        },
      ],
    },
    {
      slug: "pfmp-communication-gap-case",
      objective: "Maintaining the communication plan by evaluating capabilities and closing identified gaps",
      kind: "case",
      title: "Nobody reads the dashboard",
      brief:
        "Three months after Brightline Utilities (fictional) launched its portfolio dashboard, the PMO checks how communication is working.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Data: the dashboard email is opened by 4 of 9 executives; two business unit heads say they still learn of decisions late; the regulator praised the quarterly report.",
          ask: "How do you evaluate the gaps?",
          parts: [
            part(
              "Evaluation",
              "Uses the data plus feedback (short interviews or survey) to find why executives don't open it and why decision notices are late, separating content, channel and timing problems.",
              "Interview the five executives who don't open it (content? format? timing?) and check the decision log against notice dates to see where the delay happens. The regulator report works -- keep it."
            ),
          ],
        },
        {
          text: "Executives say the dashboard is too long and arrives after they've already met; notices are late because the PMO waits for minutes to be signed off.",
          ask: "What do you change?",
          parts: [
            part(
              "Fixes",
              "Shortens the dashboard to decision-relevant items, sends it 2 days before the board, and issues decision notices from the meeting's action log without waiting for minutes; then measures again.",
              "Cut the dashboard to one page focused on decisions needed; send it two days before the board; send decision notices the day after the meeting from the agreed action log. Re-check open rates and business unit feedback next quarter."
            ),
          ],
        },
      ],
    },
  ],
};
