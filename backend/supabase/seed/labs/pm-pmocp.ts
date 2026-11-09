import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-171: PMI-PMOCP (PMI PMO Certified Professional).
//
// Aligned to the January 2025 ECO (V2) six domains: Organizational
// Development and Alignment 16%, PMO Strategic Elements 18%, PMO Design and
// Structuring 18%, PMO Operation and Performance 15%, PMO Enhancement and
// Effectiveness 18%, People 15%. pmi.org's PMI-PMOCP page, read 2026-11-09,
// still offers the exam (120 questions, 165 minutes) with these weights and
// announces no change; the ECO PDF was read for the track on 2026-09-27.
// Density ("hybrid"): 2 per domain = 12 labs (8 build, 4 case).

const CHECKED = "2026-11-09";

export const PMIPMOCP_LABS: SeedLabSet = {
  trackCode: "PMIPMOCP",
  sources: [
    source("https://www.pmi.org/certifications/pmo-certified-professional-pmi-pmocp", "exam_outline", CHECKED),
    source(
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/pmi-pmocp-exam-content-outline_2025-1.pdf",
      "exam_outline",
      "2026-09-27"
    ),
  ],
  labs: [
    // Organizational Development and Alignment (2)
    {
      slug: "pmocp-maturity-roadmap",
      objective:
        "Driving OPM maturity: running a maturity assessment against an established model, building a roadmap, and using KPIs to track progress",
      kind: "build",
      title: "Turn a maturity assessment into a roadmap",
      brief:
        "Ashcombe Logistics (fictional) ran a project management maturity assessment on a five-level model. Results by area: project initiation 3, planning 2, risk management 1, benefits tracking 1, resource management 2, governance 3. The CEO wants 'level 3 everywhere in two years'. The PMO has four staff.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Build a two-year roadmap and the KPIs that show progress.",
          parts: [
            part(
              "Priorities",
              "Prioritises the weakest areas with the most business impact (risk and benefits at level 1, then planning and resources) rather than spreading effort evenly, and sequences so each step builds on the previous.",
              "Year 1: risk management 1 -> 2 (register, scales, monthly reviews) and benefits tracking 1 -> 2 (benefit owner and measures in every business case); planning 2 -> 3 (standard schedule templates). Year 2: risk and benefits to 3, resource management 2 -> 3."
            ),
            part(
              "Realism",
              "Checks the plan against PMO capacity (four staff) and change capacity of the organisation, and says what's needed if the CEO's target isn't achievable without more resource.",
              "With four staff, two areas at a time is realistic. Level 3 in every area in two years needs either an extra coach or accepting that resource management reaches 3 in year 3; put that choice to the CEO."
            ),
            part(
              "KPIs",
              "Defines measurable KPIs per area (e.g. % projects with an up-to-date risk register, % business cases with measured benefits) and a reassessment date.",
              "% of projects with risk register reviewed in last 30 days (target 90%); % of closed projects reporting benefits against baseline (target 75%); % schedules on the standard template; reassess maturity at month 12 and 24."
            ),
          ],
        },
      ],
    },
    {
      slug: "pmocp-competency-framework-case",
      objective:
        "Elevating organizational project management (OPM): assessing current competencies, building a tailored competency framework, and pairing mentoring with performance-management integration",
      kind: "case",
      title: "Project managers by accident",
      brief:
        "At Fairhaven Water (fictional), 30 engineers manage projects alongside their technical roles. None has formal PM training; project outcomes vary widely.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The COO asks the PMO to 'fix PM capability'.",
          ask: "How do you assess current competency and design the framework?",
          parts: [
            part(
              "Assessment",
              "Uses a mix of self-assessment, manager assessment and evidence (project results, documents) against defined competency areas, not training attendance alone.",
              "Define competency areas (planning, risk, stakeholder, commercial, leadership), then combine self-assessment, line-manager rating and review of two recent projects per engineer."
            ),
            part(
              "Framework",
              "Builds a tailored framework with proficiency levels linked to project complexity (e.g. small/medium/complex), so expectations differ by role.",
              "Three levels: Foundation (projects under $250k), Practitioner (up to $2M), Lead (complex, multi-stakeholder). Each level lists behaviours and evidence for each competency."
            ),
          ],
        },
        {
          text: "After six months, engineers have attended training but managers still don't see better plans, and engineers say PM work 'doesn't count' in their annual reviews.",
          ask: "What do you change?",
          parts: [
            part(
              "Mentoring and performance integration",
              "Pairs engineers with experienced mentors on live projects and integrates PM competencies and objectives into performance reviews so they are recognised and expected.",
              "Assign each engineer a mentor from the Lead group for monthly reviews of a live project, and add PM objectives and competency level to annual performance reviews and promotion criteria."
            ),
          ],
        },
      ],
    },

    // PMO Strategic Elements (2)
    {
      slug: "pmocp-pmo-charter",
      objective: "Stewarding the PMO mandate: defining scope and authority, drafting a PMO charter, and securing executive sponsorship",
      kind: "build",
      title: "Draft the PMO charter",
      brief:
        "Kestrel Housing Association (fictional) is creating its first PMO to support 25 capital and IT projects. The board wants better visibility of spend and delivery; project managers fear 'bureaucracy'; the finance director has agreed to sponsor it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the key sections of the PMO charter.",
          parts: [
            part(
              "Purpose and scope",
              "States the PMO's purpose linked to the board's need, which projects it covers, and its services (reporting, standards, support) -- and what it won't do.",
              "Purpose: give the board reliable visibility of spend and delivery and help projects succeed. Scope: all capital and IT projects over $100k. Services: portfolio reporting, light-touch standards, PM coaching. Not in scope: running projects."
            ),
            part(
              "Authority and sponsor",
              "Defines the PMO's authority (e.g. set reporting standards, escalate to the sponsor, advise on prioritisation) and the executive sponsor's role.",
              "Authority: set minimum reporting standards, request information, escalate concerns to the finance director, advise the investment committee. Sponsor: finance director, who champions the PMO and resolves escalations."
            ),
            part(
              "Measures and review",
              "Includes success measures and a review date, plus how project managers' concerns will be addressed (e.g. minimal standards, feedback).",
              "Measures: monthly portfolio report on time, % projects reporting accurately, PM satisfaction with PMO support. Review the charter after 12 months. Standards kept to the minimum needed, reviewed with PMs quarterly."
            ),
          ],
        },
      ],
    },
    {
      slug: "pmocp-governance-framework",
      objective:
        "Establishing and maintaining PMO governance: building a governance framework, reporting structures, and communication channels that adapt as needs change",
      kind: "build",
      title: "Design the PMO's governance and reporting",
      brief:
        "Kestrel Housing Association's (fictional) new PMO covers 25 projects. The investment committee meets quarterly, the executive team monthly. Two projects are high-profile with tenants. Project managers today send updates in any format, whenever they choose.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the governance framework and reporting structure.",
          parts: [
            part(
              "Decision bodies",
              "Defines who decides what (investment committee: approvals/funding; executive team: priorities and escalations; project boards for large projects) and how the PMO supports each.",
              "Investment committee: approve new projects and budget changes over $250k. Executive team: monthly priorities and escalations. Project boards for the two high-profile projects. The PMO prepares papers and tracks decisions."
            ),
            part(
              "Reporting",
              "Sets a standard report, frequency and flow (projects -> PMO -> executive/committee), with escalation outside the cycle for defined triggers.",
              "Each project submits a one-page status by the 3rd working day of the month; the PMO consolidates for the executive team; quarterly summary to the committee. Triggers (cost overrun over 10%, delay over 1 month, tenant safety issue) are escalated immediately."
            ),
            part(
              "Adapting",
              "Includes a review mechanism to adapt the framework (e.g. annual review, feedback from users) as the portfolio changes.",
              "Review the framework every 6 months with the sponsor and project managers, and adjust thresholds or report content as needs change."
            ),
          ],
        },
      ],
    },

    // PMO Design and Structuring (2)
    {
      slug: "pmocp-customer-personas",
      objective: "Managing potential and current PMO customers: identifying and categorizing them, and building personas for their differing needs",
      kind: "build",
      title: "Write personas for the PMO's customers",
      brief:
        "Granite Insurance's (fictional) PMO serves: the executive team (want a quick overview), 15 experienced project managers (want tools, not oversight), 20 business staff who run small projects occasionally (want simple templates and help), and finance (want accurate forecasts monthly).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Categorise the customers and write a short persona for three of them.",
          parts: [
            part(
              "Categories",
              "Groups customers by relationship (e.g. governance/decision-makers, delivery practitioners, occasional project leads, control functions) and by how much influence and need they have.",
              "Decision-makers (executive team), practitioners (experienced PMs), occasional project leads (business staff), control functions (finance)."
            ),
            part(
              "Personas",
              "Writes three personas with goals, pain points and what they value from the PMO, specific enough to drive service design.",
              "'Exec Erin': 10 minutes a month for project matters, wants red flags and decisions needed. 'Practitioner Paul': runs 3 complex projects, hates duplicate reporting, wants a good schedule tool and peer support. 'Occasional Olu': runs one small project a year, unsure where to start, wants a simple template and someone to ask."
            ),
            part(
              "Implications",
              "Draws a service implication from each persona.",
              "Erin: one-page exception dashboard. Paul: reporting pulled from his tools, a community of practice. Olu: a starter kit and drop-in clinic."
            ),
          ],
        },
      ],
    },
    {
      slug: "pmocp-service-catalog-sla",
      objective: "Designing and implementing PMO services: a needs assessment, a service catalog, and an SLA framework for each offering",
      kind: "build",
      title: "Write the PMO service catalog with SLAs",
      brief:
        "Granite Insurance's (fictional) PMO, with five staff, has decided from its needs assessment to offer: portfolio reporting, project start-up support, schedule and risk health checks, and PM training. Customers complain today that they don't know what the PMO does or how fast it responds.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write catalog entries with SLAs for three services.",
          parts: [
            part(
              "Catalog entries",
              "For three services gives a description, who can request it, how to request it, and what the customer gets.",
              "Portfolio reporting: monthly dashboard for executives, automatic. Start-up support: for any new project over $100k, request via the PMO form; customer gets a kickoff workshop, charter and plan templates. Health check: on request or triggered by status red; customer gets a 2-page report with recommendations."
            ),
            part(
              "SLAs",
              "Sets measurable service levels (response and delivery times, quality measures) that the PMO's capacity can meet.",
              "Dashboard published by the 8th working day each month. Start-up: first contact in 2 working days, kickoff within 10. Health check: report within 5 working days of receiving documents."
            ),
            part(
              "Monitoring",
              "States how SLA performance and customer satisfaction are measured and reviewed.",
              "Track SLA met % per service monthly and a short customer survey after each start-up and health check; review quarterly with the sponsor."
            ),
          ],
        },
      ],
    },

    // PMO Operation and Performance (2)
    {
      slug: "pmocp-onboarding-case",
      objective: "Onboarding new PMO service customers: a structured onboarding process, documentation, and a support system during ramp-up",
      kind: "case",
      title: "Onboarding a business unit that never used the PMO",
      brief:
        "Granite Insurance's (fictional) claims division, with 8 active projects, has just been brought under the PMO's scope. Its director is sceptical.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You plan the onboarding.",
          ask: "What does the structured onboarding include?",
          parts: [
            part(
              "Onboarding steps",
              "Includes a kickoff with the director to agree expectations, a review of the 8 projects' current state, introduction to services and reporting with documentation, and a named PMO contact.",
              "Kickoff with the claims director to agree goals and what changes; quick review of the 8 projects; a short guide to PMO services and the monthly report; a named PMO partner for the division."
            ),
            part(
              "Ramp-up support",
              "Provides support during ramp-up (e.g. help completing first reports, a lighter first cycle, office hours) and a check-in point.",
              "PMO partner helps each PM complete the first two monthly reports; weekly drop-in sessions for the first 6 weeks; review with the director after 2 months."
            ),
          ],
        },
        {
          text: "After the first month, three PMs haven't submitted reports and the director says the template 'asks for things we don't track'.",
          ask: "How do you respond?",
          parts: [
            part(
              "Response",
              "Listens and adapts: reviews which fields are essential vs optional for this division, agrees a minimum report, helps the three PMs directly, and escalates only if non-compliance continues after support.",
              "Meet the director and PMs to go through the template, keep the essential fields (milestones, cost, risks) and make the others optional for now; sit with the three PMs to complete reports. Escalate only if reports still don't come after this help."
            ),
          ],
        },
      ],
    },
    {
      slug: "pmocp-resource-capacity-plan",
      objective:
        "Managing PMO resources: a resource management plan, a skills matrix, and capacity planning for both internal staff and external contractors",
      kind: "build",
      title: "Plan the PMO's capacity for next year",
      brief:
        "Granite Insurance's (fictional) PMO has 5 staff (each about 200 productive days a year). Next year's committed demand: portfolio reporting 220 days, start-up support for an expected 30 projects at 8 days each, health checks 40 at 5 days each, training 120 days. Only 2 staff can deliver training; only 1 knows the schedule-analysis tool used in health checks.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Work out capacity versus demand and write the resource plan.",
          parts: [
            part(
              "Capacity and demand",
              "Demand = 220 + 240 + 200 + 120 = 780 days; capacity 5 x 200 = 1,000 days; overall surplus 220 days.",
              "Demand: 220 + (30 x 8 = 240) + (40 x 5 = 200) + 120 = 780 days. Capacity: 5 x 200 = 1,000. Overall 220 days spare."
            ),
            part(
              "Skills constraints",
              "Uses a skills matrix to show bottlenecks despite the surplus: health checks need 200 days of a skill only one person (200 days) has, leaving no slack; training (120 days) across 2 people is fine; proposes cross-training or a contractor.",
              "Skills matrix: the one tool expert would need all 200 of his days for health checks -- no slack and a single point of failure. Cross-train two others in the tool in Q1, and keep a contractor on call for peaks. Training (120 days) across two trainers fits."
            ),
            part(
              "Use of surplus and review",
              "Plans how to use spare capacity (e.g. improvement work, buffer for unplanned requests) and reviews the plan quarterly against actual demand.",
              "Hold about 100 days as buffer for unplanned requests and use the rest for the maturity roadmap work; compare actual vs planned demand each quarter."
            ),
          ],
        },
      ],
    },

    // PMO Enhancement and Effectiveness (2)
    {
      slug: "pmocp-kpi-dashboard",
      objective: "Optimizing PMO service performance: KPIs, a performance measurement system, and a real-time dashboard",
      kind: "build",
      title: "Choose KPIs that show whether the PMO helps",
      brief:
        "Ashcombe Logistics' (fictional) PMO currently reports one KPI: 'number of reports produced'. The sponsor asks whether the PMO is making any difference. The PMO offers reporting, start-up support, health checks and training.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Define KPIs and the measurement system for the PMO.",
          parts: [
            part(
              "KPI set",
              "Defines a balanced set: service delivery (SLA met %), customer (satisfaction), and outcome KPIs linked to project performance (e.g. % projects on time/budget, forecast accuracy), not just activity counts.",
              "Delivery: SLA met % per service. Customer: satisfaction score after each service. Outcomes: % of projects delivered within 10% of baseline cost and schedule; forecast accuracy (actual vs forecast at month 3); % of health-check recommendations implemented."
            ),
            part(
              "Measurement system",
              "Says where each KPI's data comes from, how often it's measured, targets and owners, and how a dashboard presents trends.",
              "Data from the PPM tool and post-service surveys; monthly; targets set from a 3-month baseline; each KPI has a PMO owner; dashboard shows 12-month trends with red/amber/green against target."
            ),
            part(
              "Causation caveat",
              "Notes that project outcomes have many causes, so the PMO should compare (e.g. projects that used services vs not, before vs after) rather than claim full credit.",
              "Compare projects that had start-up support with those that didn't, and before/after trends -- the PMO is one influence on outcomes, not the only one."
            ),
          ],
        },
      ],
    },
    {
      slug: "pmocp-value-benchmark-case",
      objective: "Optimizing PMO value: metrics that quantify contribution to organizational success, and benchmarking against industry standards",
      kind: "case",
      title: "The PMO faces a budget cut",
      brief:
        "Ashcombe Logistics' (fictional) PMO costs $600,000 a year. The CFO proposes cutting it by half.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The sponsor asks you to make the case for the PMO's value in two weeks.",
          ask: "What value evidence do you gather?",
          parts: [
            part(
              "Value metrics",
              "Quantifies contribution in business terms (e.g. cost avoided by stopping failing projects, reduced overruns compared with baseline years, faster decisions), with sources.",
              "Examples: two failing projects stopped after health checks, avoiding about $1.2M of further spend; average cost overrun down from 18% to 9% on a $20M annual portfolio (about $1.8M); decisions on escalations in 5 days instead of 20."
            ),
            part(
              "Benchmark",
              "Compares PMO cost and outcomes with industry or peer benchmarks (with stated sources and caveats) to show whether it is efficient.",
              "Compare PMO cost as a % of portfolio spend ($0.6M / $20M = 3%) and delivery outcomes against peer organisations or published surveys, stating the source and that comparisons are approximate."
            ),
          ],
        },
        {
          text: "The CFO accepts some value but still wants a 20% saving.",
          ask: "How do you respond?",
          parts: [
            part(
              "Options",
              "Offers options showing which services would be reduced and the value at risk for each, and recommends the one that loses least value.",
              "Options for $120k: (a) stop classroom training and move to e-learning, low value loss; (b) cut health checks by half, risking fewer early project stops. Recommend (a) and show the expected value impact of each."
            ),
          ],
        },
      ],
    },

    // People (2)
    {
      slug: "pmocp-negotiation-case",
      objective:
        "Fostering customer-centricity and interpersonal relationships: collaboration, effective communication, negotiation, and stakeholder management",
      kind: "case",
      title: "Negotiate a reporting standard with a resistant director",
      brief:
        "At Fairhaven Water (fictional), the operations director refuses to have her 12 projects follow the PMO's monthly reporting standard, saying it wastes her engineers' time. The executive team wants all projects reported consistently.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You meet the director.",
          ask: "How do you approach the conversation?",
          parts: [
            part(
              "Interests",
              "Explores her underlying interests (engineers' time, maybe fear of scrutiny) with open questions rather than restating the rule, and shares the PMO's interest (consistent visibility for the executive team).",
              "Ask what takes her engineers the time and what she needs from reporting herself; explain the executive team needs one comparable view, not more paperwork."
            ),
            part(
              "Options",
              "Proposes options that meet both interests (e.g. PMO extracts data from her existing tracker, a shorter report for small projects, a trial period).",
              "Offer to pull the data from her team's existing tracker so engineers don't re-type it, a 5-field version for her small projects, and a three-month trial reviewed together."
            ),
          ],
        },
        {
          text: "She agrees to the trial. After three months reporting is complete for 10 of 12 projects, and she says it helped her spot two problems early.",
          ask: "What do you do next?",
          parts: [
            part(
              "Follow-through",
              "Acknowledges her and the team's effort, fixes the two remaining gaps together, and uses the success story (with permission) to help other divisions.",
              "Thank her and the engineers, work with the two remaining project leads, and with her permission share her 'spotted two problems early' example with other directors."
            ),
          ],
        },
      ],
    },
    {
      slug: "pmocp-data-informed-decision",
      objective: "Enabling a value-driven mindset: data-informed decision-making, strategic thinking, and driving innovation",
      kind: "build",
      title: "Use data to recommend where the PMO invests next",
      brief:
        "Granite Insurance's (fictional) PMO has data from 40 closed projects. Projects that had a start-up workshop: 18 of 22 finished within 10% of budget. Projects without one: 7 of 18. Health checks were done on 10 projects; 6 of them then recovered to green. The PMO can fund one new initiative next year: (A) mandatory start-up workshops for all projects over $100k, or (B) an AI tool to draft status reports.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Analyse the data and recommend an initiative.",
          parts: [
            part(
              "Analysis",
              "Calculates 18/22 = 82% vs 7/18 = 39% within budget, and notes the difference may partly reflect which projects chose a workshop (selection bias), so it's suggestive, not proof.",
              "With workshop: 18/22 = 82% within budget; without: 7/18 = 39%. A big difference, but teams that asked for workshops may already have been better organised, so it suggests rather than proves the effect."
            ),
            part(
              "Recommendation",
              "Recommends an option tied to strategic value (likely A, with a measurement plan to test the effect), and explains why B is weaker on current evidence (no data on value, saves time rather than improving outcomes) or proposes a small pilot of B.",
              "Recommend A: it targets project outcomes, and the data, even with its limits, points to value. Measure it properly (compare cohorts before and after). Pilot B with a few PMs to gather evidence before investing."
            ),
          ],
        },
      ],
    },
  ],
};
