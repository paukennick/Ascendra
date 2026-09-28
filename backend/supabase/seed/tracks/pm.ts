// PM certification tracks -- Strand 2 of docs/catalog-backlog.md, opened
// 2026-09-26 right after the CompTIA-remainder strand closed out. Follows the
// AWS/Azure/GCP/CompTIA credential-block pattern (see comptia.ts's header for
// why that's the current standard, vs. data.ts's older untagged style).
//
// Primary body: PMI (pmi.org). Every domain/task below was read on
// 2026-09-26 directly from PMI's own current Examination Content Outline
// (ECO) PDFs -- not from training data, which would have been stale for PMP
// specifically: PMP's ECO was replaced in July 2026 (new 3-domain weights,
// consolidated to 26 tasks from the prior 35), and the old pmi.org PDF URL
// now serves the new document, not the 2021 one memory would expect. CAPM's
// ECO is the 2023 update, still current -- no rename/retirement found for it.
// Objectives below paraphrase each ECO's tasks/enablers, not copied verbatim
// (same copyright boundary AWS/Azure/GCP/CompTIA's tracks followed).
//
// PMI never publishes an exam code for any of its certifications (no
// CompTIA-style "PK0-005" equivalent) -- same shape as Google Cloud's
// certifications (REQ-040), so these use `vendor_exam_unpublished_code`
// rather than `vendor_exam`, and `examCode` stays unset.

import type { SeedTrack } from "../data";

const PMI_PROVIDER = {
  providerSlug: "pmi",
  providerName: "Project Management Institute (PMI)",
  providerUrl: "https://www.pmi.org/certifications",
  subcategorySlug: "pmi-certifications",
  credentialType: "certification",
} as const;

const VERIFIED_AT = "2026-09-26T00:00:00Z";
// Second pass, 2026-09-27: PMI-CP and the other credentials found while
// re-checking pmi.org's current certification list against the original
// Strand 2 roster (see docs/catalog-backlog.md).
const VERIFIED_AT_20260927 = "2026-09-27T00:00:00Z";

// ---------------------------------------------------------------------------
// CAPM -- Certified Associate in Project Management. Confirmed current: 2023
// ECO update, still in effect as of this fetch (pmi.org serves the same PDF
// unchanged). Entry-level credential, no professional experience required --
// high school diploma/GED plus 23 contact hours of project-management
// education.
//
// 150 questions (135 scored, 15 unscored pretest): multiple choice,
// drag-and-drop, hot spot, animation/comic-strip scenario questions. 3-hour
// allotted time, one 10-minute break after question 75. 1-year eligibility
// window, up to 3 attempts. Domains: 36% / 17% / 20% / 27%.
// ---------------------------------------------------------------------------
export const CAPM_TRACK: SeedTrack = {
  code: "CAPM",
  title: "CAPM Coach",
  description:
    "PMI Certified Associate in Project Management (CAPM) exam prep across 4 weighted domains -- PM fundamentals, predictive/plan-based methods, agile methods, and business analysis frameworks.",
  trackType: "certification",
  subcategorySlug: "pmi-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.pmi.org/certifications/certified-associate-capm",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...PMI_PROVIDER,
    credentialSlug: "capm",
    credentialName: "PMI Certified Associate in Project Management (CAPM)",
    credentialUrl: "https://www.pmi.org/certifications/certified-associate-capm",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    effectiveDate: "2023-01-01",
    objectivesRevision: "2023 Exam Update",
    officialObjectivesUrl:
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/capm-exam-content-outline-english.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "None required. High school diploma/GED (or global equivalent) plus 23 contact hours of project-management-specific education.",
    durationMinutes: 180,
    questionFormat:
      "150 questions (135 scored, 15 unscored pretest); multiple choice, drag-and-drop, hot spot, and animation/comic-strip scenario questions",
    passingScorePolicy: "Pass/fail against a criterion-referenced standard; PMI does not publish a numeric cut score.",
  },
  units: [
    {
      title: "Project Management Fundamentals and Core Concepts",
      weight: 36,
      gate: "Given a scenario, correctly place it against PM fundamentals -- project vs. program vs. portfolio, predictive vs. adaptive, a PM's role vs. a sponsor's -- rather than answering with generic project-management language.",
      objectives: [
        "Distinguishing a project from operations, a program, and a portfolio, and predictive from adaptive delivery approaches",
        "Telling apart an issue, a risk, an assumption, and a constraint, and reviewing a project scope statement for gaps",
        "Applying the PMI Code of Ethics and Professional Conduct to a scenario, and explaining a project's role as a vehicle for organizational change",
        "The purpose of cost, quality, risk, and schedule management within a project management plan, and the difference between that plan and a product management plan",
        "Distinguishing a milestone from a task duration, sizing the number and type of resources a project needs, and using a risk register and a stakeholder register in a given situation",
        "Explaining project closure and transition activities",
        "Comparing the roles and responsibilities of a project manager, a project sponsor, and the project team, and the range of roles a PM plays (initiator, negotiator, listener, coach, facilitator, working team member)",
        "The difference between leadership and management, and how emotional intelligence (EQ) affects project outcomes",
        "Following and executing a planned strategy or framework (e.g., for communication or risk), and explaining the benefit of project initiation and planning",
        "Evaluating meeting effectiveness and the purpose of common problem-solving formats: focus groups, stand-ups, and brainstorming sessions",
      ],
    },
    {
      title: "Predictive, Plan-Based Methodologies",
      weight: 17,
      gate: "Given a predictive/plan-based project scenario, apply the specific technique it calls for -- critical path, a schedule/cost variance calculation, a WBS decomposition -- rather than a generic 'waterfall' answer.",
      objectives: [
        "When a predictive, plan-based approach fits an organizational structure (virtual, colocated, matrix, hierarchical) better than an adaptive one",
        "The activities within each predictive process group, and distinguishing the components unique to a predictive project",
        "Applying the critical path method and calculating schedule variance",
        "Building a work breakdown structure (WBS) and defining its work packages",
        "Identifying the artifacts used to document and control a predictive, plan-based project",
        "Calculating cost and schedule variances from project control data",
      ],
    },
    {
      title: "Agile Frameworks and Methodologies",
      weight: 20,
      gate: "Given an adaptive/agile project scenario, apply the specific framework component it calls for -- an iteration boundary, a Scrum vs. Kanban distinction, a backlog artifact -- rather than a generic 'agile' answer.",
      objectives: [
        "When an adaptive approach fits better than a predictive one, including organizational-structure suitability and the organizational process assets/environmental factors that favor it",
        "Planning project iterations: distinguishing logical iteration units, weighing their pros and cons, and translating a WBS into an adaptive iteration",
        "Determining scope inputs, and why adaptive project tracking differs from predictive tracking",
        "Identifying the artifacts used to document and control an adaptive project",
        "Distinguishing the components of different adaptive methodologies: Scrum, Extreme Programming (XP), Scaled Agile Framework (SAFe), and Kanban",
        "Preparing and executing task-management steps: interpreting success criteria and prioritizing tasks in an adaptive project",
      ],
    },
    {
      title: "Business Analysis Frameworks",
      weight: 27,
      gate: "Given a requirements or stakeholder scenario, name the specific business-analysis role, tool, or artifact it calls for -- a requirements-gathering technique, a traceability-matrix use -- rather than a generic 'talk to stakeholders' answer.",
      objectives: [
        "Distinguishing business-analysis stakeholder roles: process owner, process manager, product manager, and product owner, and internal vs. external roles",
        "Why dedicated BA roles and responsibilities exist on a project team",
        "Recommending the right stakeholder communication channel or tool, and explaining why BA communication across teams matters",
        "Matching a requirements-gathering technique to a scenario: user stories, use cases, stakeholder interviews, surveys, workshops, and lessons learned",
        "Using a requirements traceability matrix or product backlog",
        "Applying and interpreting a product roadmap, including which components map to which release",
        "How the chosen project methodology (adaptive vs. predictive) shapes the business analyst's role",
        "Validating requirements through delivery: defining acceptance criteria and judging delivery readiness against a traceability matrix or backlog",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PMP -- Project Management Professional. Confirmed current: July 2026 ECO
// update (rebalanced 3-domain weights, consolidated to 26 tasks from the
// prior 35 -- see this file's header note on why the pre-2026 ECO would have
// been stale). Requires either a secondary credential + 5 years/60 months
// leading projects, or a bachelor's/GAC-accredited degree + 2-3 years leading
// projects (scaled by credential level), plus 35 hours of PM-specific
// training (waived if the candidate already holds an active CAPM).
//
// 180 questions (170 scored, 10 unscored pretest): multiple choice,
// multiple-response, drag-and-drop, matching, point-and-click, and new for
// this ECO, case/scenario and graphic-based questions. 240-minute allotted
// time, two 10-minute breaks. 1-year eligibility window, up to 3 attempts.
// Domains: People 33%, Process 41%, Business Environment 26%; ~40% of items
// are predictive-approach, ~60% adaptive/agile, spread across all domains
// rather than isolated to one.
// ---------------------------------------------------------------------------
export const PMP_TRACK: SeedTrack = {
  code: "PMP",
  title: "PMP Coach",
  description:
    "PMI Project Management Professional (PMP) exam prep across 3 weighted domains -- people, process, and business environment -- spanning predictive, agile, and hybrid ways of working.",
  trackType: "certification",
  subcategorySlug: "pmi-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.pmi.org/certifications/project-management-pmp",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...PMI_PROVIDER,
    credentialSlug: "pmp",
    credentialName: "PMI Project Management Professional (PMP)",
    credentialUrl: "https://www.pmi.org/certifications/project-management-pmp",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    effectiveDate: "2026-07-09",
    objectivesRevision: "July 2026 ECO Update",
    officialObjectivesUrl:
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/new-pmp-examination-content-outline-2026.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Secondary credential (HS diploma/GED-equivalent) + 60 months leading projects, or bachelor's/GAC-accredited degree + 24-36 months leading projects (scaled by credential level), all within the prior 10 years, plus 35 hours of PM-specific training (waived if the candidate holds an active CAPM).",
    durationMinutes: 240,
    questionFormat:
      "180 questions (170 scored, 10 unscored pretest); multiple choice, multiple response, drag-and-drop, matching, point-and-click, case/scenario, and graphic-based questions",
    passingScorePolicy: "Pass/fail against a criterion-referenced standard; PMI does not publish a numeric cut score.",
  },
  units: [
    {
      title: "People",
      weight: 33,
      gate: "Given a team or stakeholder scenario, apply the specific leadership or engagement technique it calls for -- a conflict-resolution step, a stakeholder-alignment tactic -- rather than generic 'soft skills' advice.",
      objectives: [
        "Developing and promoting a shared project vision, and diagnosing the root cause when a team's understanding of it diverges",
        "Managing conflict: identifying its source, analyzing context, implementing an agreed resolution strategy, and maintaining ground rules that prevent recurrence",
        "Leading a project team: setting team-level expectations, empowering the team, solving problems, representing the team's voice, and choosing an appropriate leadership style",
        "Engaging stakeholders: identifying and analyzing them, tailoring communication to their needs, and executing a stakeholder engagement plan",
        "Aligning and managing stakeholder expectations: categorizing stakeholders, facilitating alignment discussions, and monitoring internal/external customer satisfaction",
        "Supporting knowledge transfer: gathering critical project knowledge and fostering an environment where it's shared, not siloed",
        "Planning and managing project communication: defining a communication strategy, establishing feedback loops, and producing reports aligned to sponsor/stakeholder expectations",
      ],
    },
    {
      title: "Process",
      weight: 41,
      gate: "Given a delivery scenario, apply the specific process-management technique it calls for -- a scope decomposition, a schedule/cost control step, a procurement decision -- rather than a generic 'follow the plan' answer.",
      objectives: [
        "Developing and maintaining an integrated project management plan: assessing complexity, recommending a predictive/adaptive/hybrid approach, and estimating work effort",
        "Developing and managing project scope: defining it, gaining stakeholder agreement, and decomposing it",
        "Ensuring value-based delivery: identifying value components, prioritizing work by value and feedback, and verifying a benefits-tracking system is in place",
        "Planning and managing resources, procurement (including contract type selection and vendor performance evaluation), and project finances",
        "Planning and optimizing quality: gathering quality requirements, executing a quality management plan, and implementing continuous improvement",
        "Planning and managing schedule: selecting a development-approach-appropriate estimating method, baselining the schedule, and analyzing schedule variance",
        "Evaluating project status: developing project metrics, ensuring artifacts are created and kept accessible, and communicating status",
        "Managing project closure: obtaining stakeholder approval, validating transition readiness, and concluding closure activities (lessons learned, retrospectives, procurement/financial/resource closeout)",
      ],
    },
    {
      title: "Business Environment",
      weight: 26,
      gate: "Given an organizational or compliance scenario, apply the specific governance, risk, or change-management step it calls for -- an escalation path, a risk-response action -- rather than a generic 'manage the business side' answer.",
      objectives: [
        "Defining and establishing project governance: structure, rules, reporting, ethics, and escalation paths/thresholds",
        "Planning and managing project compliance: confirming requirements (security, health/safety, sustainability, regulatory), classifying categories, and analyzing noncompliance consequences",
        "Managing and controlling changes: executing a change control process, communicating proposed-change status, and updating documentation to reflect approved changes",
        "Removing impediments and managing issues: evaluating impact, prioritizing, applying an intervention strategy, and recognizing when a risk becomes an issue",
        "Planning and managing risk: identifying and analyzing risks, maintaining a risk register, and executing a risk management plan",
        "Driving continuous improvement: applying lessons learned and updating organizational process assets (OPAs)",
        "Supporting organizational change: assessing organizational culture and evaluating the impact of change on the project",
        "Evaluating external business-environment changes (regulatory, technological, geopolitical, market) and their impact on project scope or backlog",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PMI-ACP -- PMI Agile Certified Practitioner. Confirmed current: March 2026
// ECO, itself a modernization of a November 2024 outline -- training data's
// likely memory of an older 7-domain structure (Value-Driven Delivery,
// Stakeholder Engagement, etc.) is stale; the current outline is 4 domains
// reframed around Enterprise Agility. Eligibility: secondary diploma/GED +
// 21 hours of formal agile training, plus 2 years of agile experience in the
// past 5 (reducible via a GAC degree, an existing 3rd-party agile
// certification held 1+ year, or an active PMP).
//
// 120 questions (100 scored, 20 unscored pretest): multiple choice, multiple
// response, drag-and-drop, and exhibit-based items. 3-hour allotted time,
// one 10-minute break after item 60. 1-year eligibility window, up to 3
// attempts. Domains: Mindset 28%, Leadership 25%, Product 19%, Delivery 28%.
// ---------------------------------------------------------------------------
export const PMIACP_TRACK: SeedTrack = {
  code: "PMIACP",
  title: "PMI-ACP Coach",
  description:
    "PMI Agile Certified Practitioner (PMI-ACP) exam prep across 4 weighted domains -- agile mindset, leadership, product, and delivery -- reframed by PMI's 2026 update around Enterprise Agility.",
  trackType: "certification",
  subcategorySlug: "pmi-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.pmi.org/certifications/agile-acp",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...PMI_PROVIDER,
    credentialSlug: "pmi-acp",
    credentialName: "PMI Agile Certified Practitioner (PMI-ACP)",
    credentialUrl: "https://www.pmi.org/certifications/agile-acp",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    effectiveDate: "2026-03-01",
    objectivesRevision: "March 2026 ECO",
    officialObjectivesUrl:
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/agile-certified-exam-outline.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Secondary diploma/GED (or global equivalent) + 21 hours of formal agile training, plus 2 years of agile experience within the past 5 years (reducible via a GAC-accredited degree, a 3rd-party agile certification held 1+ year, or an active PMP).",
    durationMinutes: 180,
    questionFormat:
      "120 items (100 scored, 20 unscored pretest); multiple choice, multiple response, drag-and-drop, and exhibit-based items",
    passingScorePolicy: "Pass/fail against a criterion-referenced standard; PMI does not publish a numeric cut score.",
  },
  units: [
    {
      title: "Mindset",
      weight: 28,
      gate: "Given a team scenario, name the specific agile-mindset practice it calls for -- a complexity-classification tool, a psychological-safety move, a feedback-loop shortening technique -- rather than generic 'be agile' advice.",
      objectives: [
        "Experimenting early: building a thin increment to validate a solution or market need, and creating an environment that rewards learning",
        "Embracing the agile mindset: applying agile values and principles, classifying a scenario's complexity (Cynefin, the Stacey Matrix, complex adaptive systems), and choosing agile practices to fit",
        "Promoting a collaborative team environment: establishing a team vision and working agreements, forming a high-performing team, and using retrospective findings to improve it",
        "Building transparency: making status, risks, and impediments visible to everyone (information radiators), and defining communication strategies for co-located and distributed teams alike",
        "Fostering psychological safety: promoting a no-blame culture, encouraging dialogue over debate, and normalizing challenges to the status quo",
        "Shortening feedback loops: involving stakeholders from day one, and applying techniques like design thinking or lean startup to compress the loop",
        "Embracing change: responding to shifting requirements and priorities, and adapting the product based on new learning",
      ],
    },
    {
      title: "Leadership",
      weight: 25,
      gate: "Given a team-leadership scenario, apply the specific coaching, conflict-resolution, or knowledge-sharing move it calls for -- not generic 'be a servant leader' advice.",
      objectives: [
        "Empowering teams: building trust and transparent communication, coaching and mentoring, and applying emotional intelligence to resolve conflict and support the team",
        "Facilitating problem resolution: investigating root cause (e.g., root-cause analysis, Ishikawa diagrams) and choosing the resolution strategy that adds the most value",
        "Promoting knowledge sharing: creating an environment to capture and share lessons learned, and leveraging organizational knowledge from other initiatives",
        "Promoting the agile mindset and practices: building awareness of agile values and fostering a culture of continuous improvement",
        "Promoting a shared vision and purpose: ensuring the product stays aligned to organizational goals and continuously communicating why",
        "Facilitating conflict management: identifying a conflict's root cause and level, and promoting a collaborative resolution approach",
      ],
    },
    {
      title: "Product",
      weight: 19,
      gate: "Given a backlog or roadmap scenario, apply the specific product-management technique it calls for -- a backlog-refinement step, a value-delivery metric -- rather than generic 'talk to the customer' advice.",
      objectives: [
        "Refining the product backlog: clarifying and prioritizing items with customers/stakeholders, decomposing large items, and sizing work collectively",
        "Managing increments: aligning each increment to business priorities, defining increment goals, and demonstrating value through early feedback",
        "Visualizing work: choosing and educating the team on work-visualization techniques, and keeping shared status data current",
        "Managing value delivery: defining what value looks like (success criteria, sustainability, security, compliance) and confirming targeted results were actually achieved",
      ],
    },
    {
      title: "Delivery",
      weight: 28,
      gate: "Given a delivery scenario, apply the specific flow, risk, or waste-elimination technique it calls for -- a WIP limit, a risk-burndown step -- rather than generic 'ship faster' advice.",
      objectives: [
        "Seeking early feedback: delivering in small increments and collecting stakeholder feedback on a regular cadence, not just at the end",
        "Managing agile metrics: choosing metrics appropriate to the audience, radiating them visibly, and using the insights to drive decisions",
        "Managing impediments and risk: proactively identifying and prioritizing risks/impediments, and using lessons learned to avoid recurrence",
        "Recognizing and eliminating waste: visualizing end-to-end flow to spot value-added vs. non-value-added work, then prioritizing waste reduction",
        "Performing continuous improvement: using metrics and feedback to drive improvement actions, then evaluating whether they actually worked",
        "Actively engaging customers: identifying customer needs, validating deliverables against acceptance criteria, and encouraging direct customer-team collaboration",
        "Optimizing flow: limiting work in progress at every level, shielding the team from interruptions, and using metrics to keep improving flow",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PgMP -- Program Management Professional. Confirmed current: March 2024 ECO
// (a minor lexicon-alignment update to PMI's Standard for Program
// Management), no newer revision found. Distinct from PMP/PMI-ACP in shape:
// tasks are long-form paragraphs rather than short task+enabler bullets, so
// objectives below group and condense related tasks rather than listing all
// 72 individually. Senior credential -- requires either a secondary
// diploma/GED with 48 months of project management experience plus 84
// months of program management experience, or a bachelor's degree with 36
// months of project management experience plus 36 months of program
// management experience, all within the past 15 years, plus 21 hours of
// program-management-specific training.
//
// Multiple-choice exam; PMI's own ECO does not publish item count, duration,
// or passing score on the pages fetched -- left unset rather than guessed
// (matches this repo's rule that an unverified field stays out, not filled
// from memory).
// ---------------------------------------------------------------------------
export const PGMP_TRACK: SeedTrack = {
  code: "PGMP",
  title: "PgMP Coach",
  description:
    "PMI Program Management Professional (PgMP) exam prep across 5 weighted domains -- strategic alignment, program life cycle management, benefits management, stakeholder engagement, and governance.",
  trackType: "certification",
  subcategorySlug: "pmi-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.pmi.org/certifications/program-management-pgmp",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...PMI_PROVIDER,
    credentialSlug: "pgmp",
    credentialName: "PMI Program Management Professional (PgMP)",
    credentialUrl: "https://www.pmi.org/certifications/program-management-pgmp",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    effectiveDate: "2024-03-01",
    objectivesRevision: "March 2024 ECO",
    officialObjectivesUrl:
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/pgmp-exam-content-outline.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Secondary diploma/GED + 48 months project management experience + 84 months program management experience, or bachelor's degree + 36 months project management experience + 36 months program management experience -- all within the past 15 years, plus 21 hours of program-management-specific training.",
    questionFormat: "Multiple choice",
    passingScorePolicy: "Pass/fail against a criterion-referenced standard; PMI does not publish a numeric cut score.",
  },
  units: [
    {
      title: "Strategic Program Alignment",
      weight: 15,
      gate: "Given a program's business case, judge whether it's actually aligned to the organization's strategic plan and objectives -- not just whether it's well-documented.",
      objectives: [
        "Assessing initial program objectives, requirements, and risks against the organization's strategic plan, vision, and mission",
        "Building a high-level roadmap and preliminary estimates, then obtaining executive sponsor validation",
        "Developing and evaluating the program's business case: feasibility, readiness, and strategic alignment",
        "Quantifying expected benefits using market analysis and high-level cost-benefit analysis to define scope",
        "Weighing program objectives against regulatory, legal, and ethical constraints for stakeholder alignment",
        "Obtaining organizational leadership approval via a program charter (high-level costs, milestones, benefits)",
        "Identifying integration opportunities (human capital, facilities, finance, systems) across program and operational activities",
      ],
    },
    {
      title: "Program Life Cycle Management",
      weight: 44,
      gate: "Given a program in a specific life-cycle stage, name the artifact or control action it calls for -- a charter element, a WBS decomposition, a variance analysis -- not a generic 'manage the program' answer.",
      objectives: [
        "Developing a program charter (scope, assumptions, constraints, stakeholders, resource allocation) tied to the business case",
        "Translating strategic objectives into a program scope statement and roadmap, using historical data and a benefits realization plan",
        "Building a responsibility assignment matrix and a program WBS to assign roles, tasks, and deliverables",
        "Establishing an integrated program management plan (schedule, quality, risk, communication, resources) across constituent projects",
        "Setting standard measurement criteria (KPIs, success review points) to monitor and control the program",
        "Running a program kickoff and ongoing communication/feedback processes to capture lessons learned",
        "Executing program management plans and consolidating project-level data to monitor performance and communicate status",
        "Analyzing cost/schedule/quality/risk variances against planned values and updating plans with corrective actions",
        "Managing program-level issues and risk per the risk management plan to protect benefits realization",
        "Conducting program closure: approving constituent-project closeout, transition to operations, and archiving lessons learned",
      ],
    },
    {
      title: "Benefits Management",
      weight: 11,
      gate: "Given a program's benefits data, apply the specific realization or sustainment step it calls for -- updating the benefits register, running a corrective action -- not a generic 'track the benefits' answer.",
      objectives: [
        "Developing a benefits realization plan and its measurement criteria, then baselining and communicating it to sponsors",
        "Identifying synergies and efficiencies across the program life cycle and updating the benefits realization plan accordingly",
        "Building a sustainment plan (processes, metrics, tools) so benefits continue past program completion",
        "Monitoring benefit metrics (forecasting, variance analysis, what-if scenarios) and taking corrective action to protect realization",
        "Verifying constituent-project closure and transition meet or exceed benefit-realization criteria",
        "Maintaining a benefits register and developing an operations transition plan to guarantee sustainment",
      ],
    },
    {
      title: "Stakeholder Engagement",
      weight: 16,
      gate: "Given a stakeholder scenario, apply the specific engagement or negotiation technique it calls for -- a stakeholder analysis method, a risk incorporated from a stakeholder concern -- not generic 'communicate more' advice.",
      objectives: [
        "Identifying sponsors/steering committee members and building a stakeholder matrix documenting each one's position on the program",
        "Performing stakeholder analysis (historical data, interviews, formal agreements) to build a stakeholder engagement plan",
        "Negotiating stakeholder support and setting clear expectations and acceptance criteria (e.g., KPIs) for program benefits",
        "Evaluating stakeholder-identified risks and incorporating them into the program risk management plan",
        "Developing and fostering stakeholder relationships to improve communication and sustain support for the program",
      ],
    },
    {
      title: "Governance",
      weight: 14,
      gate: "Given a program decision point, name the specific governance mechanism it calls for -- a stage-gate review, an escalation policy -- not a generic 'get approval' answer.",
      objectives: [
        "Developing program management standards and structure (governance, tools, finance, reporting) using industry best practices",
        "Selecting a governance framework that conforms to organizational governance requirements",
        "Obtaining authorization through stage-gate reviews to proceed to the next program phase",
        "Regularly evaluating new and existing risks against strategic objectives and presenting updates to the governance board",
        "Establishing escalation policies so risks are handled at the appropriate organizational level",
        "Capturing and applying lessons learned to influence existing and future programs",
        "Monitoring the business environment and program functionality to keep benefits realization on track",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PfMP -- Portfolio Management Professional. Source PDF carries a 2013
// copyright line and its own page says "please always refer to the PMI
// website for the most current version" -- but current 2026 third-party
// exam-prep sources (cross-checked independently, not taken on faith)
// report the exact same domain weights (25/20/25/15/15), the exact same
// scored/pretest item split (150 scored + 20 pretest = 170 total) the 2013
// appendix describes, and the same 240-minute duration -- so unlike
// DataSys+/DP-420's ambiguous-version situations, this one has multiple
// independent, dated (2026) confirmations that the file, despite its age,
// is still the live current outline. PMI's senior-most credential --
// requires 96 months of professional business experience plus either 7
// years/10,500 hours (secondary/associate's degree) or 4 years/6,000 hours
// (bachelor's degree) of portfolio management experience, all within the
// past 15 years. Scored qualitatively (Above Target/Target/Below
// Target/Needs Improvement per domain), not a numeric passing score.
// ---------------------------------------------------------------------------
export const PFMP_TRACK: SeedTrack = {
  code: "PFMP",
  title: "PfMP Coach",
  description:
    "PMI Portfolio Management Professional (PfMP) exam prep across 5 weighted domains -- strategic alignment, governance, portfolio performance, portfolio risk management, and communications management.",
  trackType: "certification",
  subcategorySlug: "pmi-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.pmi.org/certifications/portfolio-management-pfmp",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...PMI_PROVIDER,
    credentialSlug: "pfmp",
    credentialName: "PMI Portfolio Management Professional (PfMP)",
    credentialUrl: "https://www.pmi.org/certifications/portfolio-management-pfmp",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    lastVendorVerifiedAt: VERIFIED_AT,
    officialObjectivesUrl:
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/portfolio-management-professional-exam-outline.pdf",
    recommendedExperience:
      "96 months of professional business experience, plus either 7 years/10,500 hours (secondary/associate's degree path) or 4 years/6,000 hours (bachelor's degree path) of portfolio management experience -- all within the past 15 years.",
    durationMinutes: 240,
    questionFormat: "170 questions (150 scored, 20 unscored pretest); multiple choice",
    passingScorePolicy:
      "Reported qualitatively per domain (Above Target/Target/Below Target/Needs Improvement); PMI does not publish a numeric cut score.",
  },
  units: [
    {
      title: "Strategic Alignment",
      weight: 25,
      gate: "Given a portfolio decision, tie it back to a specific organizational strategic goal or prioritization criterion -- not a generic 'align with strategy' answer.",
      objectives: [
        "Evaluating organizational strategic goals and objectives through document review, interviews, and information gathering",
        "Identifying prioritization criteria (legislative, dependencies, ROI, stakeholder expectations, strategic fit) as a decision-making basis",
        "Ranking strategic priorities with key stakeholders using qualitative and quantitative analysis",
        "Identifying existing and potential portfolio components from business plans/proposals to build portfolio scenarios",
        "Creating and evaluating what-if portfolio scenarios (options analysis, risk analysis, SWOT, financial analysis)",
        "Recommending a portfolio scenario and its components, with rationale, for governance decision-making",
        "Determining how a change in strategic goals impacts the portfolio and its components",
        "Building a high-level portfolio roadmap with key stakeholders that reflects sequencing, dependencies, and strategic alignment",
      ],
    },
    {
      title: "Governance",
      weight: 20,
      gate: "Given a portfolio decision point, name the specific governance mechanism it calls for -- a steering-committee approval, an escalation threshold -- not a generic 'get sign-off' answer.",
      objectives: [
        "Defining a governance model: structure (steering committees, governance boards), policies, decision rights, and responsibilities",
        "Establishing portfolio management standards and protocols using organizational assets and industry standards",
        "Defining or modifying portfolio processes: benefits realization, information management, risk, stakeholder engagement, and change management",
        "Building a portfolio management plan covering roles, escalation procedures, risk tolerances, thresholds, and prioritization model",
        "Making and obtaining approval for portfolio decisions (components, plans, budget, roadmap) through the defined governance model",
      ],
    },
    {
      title: "Portfolio Performance",
      weight: 25,
      gate: "Given portfolio performance data, apply the specific monitoring, balancing, or escalation step it calls for -- a resource-reallocation decision, an issue escalation -- not a generic 'track performance' answer.",
      objectives: [
        "Authorizing portfolio structure and activating components against supporting artifacts",
        "Collecting and consolidating key performance metrics defined by the portfolio governance model",
        "Monitoring portfolio performance on an ongoing basis via reports, dashboards, and auditing techniques",
        "Managing and escalating issues to appropriate decision-makers for timely resolution",
        "Managing portfolio changes with change-management techniques to protect strategic alignment",
        "Balancing and prioritizing portfolio components to optimize resource utilization against strategic objectives",
        "Analyzing and optimizing resource allocation/reallocation (people, tools, technology, finance) via supply/demand analysis",
        "Updating portfolio roadmaps and measuring aggregated performance against business/strategic goals",
        "Maintaining portfolio records (artifacts, approvals, prioritizations) for compliance with organizational and regulatory requirements",
      ],
    },
    {
      title: "Portfolio Risk Management",
      weight: 15,
      gate: "Given a portfolio-level risk scenario, apply the specific risk-response or reserve decision it calls for -- not a generic 'manage the risk' answer.",
      objectives: [
        "Determining acceptable portfolio risk levels based on organizational and stakeholder risk tolerance",
        "Developing a portfolio risk management plan aligned to governance risk guidelines",
        "Performing dependency analysis to identify and monitor risks across interdependent portfolio components",
        "Maintaining a portfolio-level risk register tied to strategic goals and escalated component risks",
        "Building stakeholder understanding and ownership of portfolio risks through communication",
        "Recommending and obtaining approval for a portfolio management reserve based on aggregate risk exposure",
      ],
    },
    {
      title: "Communications Management",
      weight: 15,
      gate: "Given a stakeholder communication scenario, apply the specific plan or verification step it calls for -- a communication-gap fix, an accuracy check -- not a generic 'communicate more' answer.",
      objectives: [
        "Analyzing internal and external stakeholders (meetings, interviews, surveys) to identify expectations and influence",
        "Creating an aggregate communication strategy and plan: methods, recipients, vehicles, timelines, and frequency",
        "Engaging stakeholders through oral and written communication to build awareness of the portfolio roadmap",
        "Maintaining the communication plan by evaluating capabilities and closing identified gaps",
        "Facilitating stakeholder understanding of portfolio management processes and protocols",
        "Verifying the accuracy, consistency, and completeness of portfolio communications against governance guidelines",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PMI-RMP -- Risk Management Professional. Confirmed current: January 2023
// ECO update, no newer revision found. Two eligibility paths: bachelor's
// degree + 3,000 hours/3 years of project risk management experience + 30
// contact hours of risk-specific training, or secondary diploma + 4,500
// hours/4 years + 40 contact hours -- all within the past 5 years (notably
// shorter than PMP/PgMP/PfMP's 15-year windows).
//
// 115 questions (100 scored, 15 unscored pretest): multiple choice and
// multiple-answer-select. 2.5-hour allotted time, one optional 10-minute
// break after ~58 questions. 1-year eligibility window, up to 3 attempts.
// Domains: Risk Strategy and Planning 22%, Risk Identification 23%, Risk
// Analysis 23%, Risk Response 13%, Monitor and Close Risks 19%.
// ---------------------------------------------------------------------------
export const PMIRMP_TRACK: SeedTrack = {
  code: "PMIRMP",
  title: "PMI-RMP Coach",
  description:
    "PMI Risk Management Professional (PMI-RMP) exam prep across 5 weighted domains -- risk strategy and planning, identification, analysis, response, and monitoring/closing risks.",
  trackType: "certification",
  subcategorySlug: "pmi-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.pmi.org/certifications/risk-management-rmp",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...PMI_PROVIDER,
    credentialSlug: "pmi-rmp",
    credentialName: "PMI Risk Management Professional (PMI-RMP)",
    credentialUrl: "https://www.pmi.org/certifications/risk-management-rmp",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    effectiveDate: "2023-01-01",
    objectivesRevision: "Updated January 2023",
    officialObjectivesUrl:
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/risk-management-exam-outline_updated-2024.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Bachelor's degree + 3,000 hours (3 years) of project risk management experience + 30 contact hours of risk-specific training, or secondary diploma + 4,500 hours (4 years) + 40 contact hours -- all within the past 5 years.",
    durationMinutes: 150,
    questionFormat: "115 questions (100 scored, 15 unscored pretest); multiple choice and multiple-answer-select",
    passingScorePolicy: "Pass/fail against a criterion-referenced standard; PMI does not publish a numeric cut score.",
  },
  units: [
    {
      title: "Risk Strategy and Planning",
      weight: 22,
      gate: "Given a project's early risk setup, name the specific planning artifact or threshold decision it calls for -- a risk breakdown structure, an agreed risk appetite -- not generic 'plan for risk' advice.",
      objectives: [
        "Performing preliminary document analysis: gathering industry benchmarks, lessons learned, and historical data relevant to the risk process",
        "Assessing the project environment for threats and opportunities: OPAs/EEFs, methodology fit (agile/waterfall/hybrid), and organizational risk culture",
        "Confirming risk thresholds against organizational risk appetite, and leading stakeholder conflict resolution when appetites disagree",
        "Establishing a risk management strategy: processes, templates, metrics, and risk categories",
        "Documenting a risk management plan: roles/responsibilities (RACI), a risk breakdown structure (RBS), and a risk communication plan",
        "Planning and leading risk management activities with stakeholders, including tailoring communication and coaching stakeholders in risk principles",
      ],
    },
    {
      title: "Risk Identification",
      weight: 23,
      gate: "Given raw project information, apply the specific identification technique it calls for -- an assumption/constraint analysis, a risk register entry -- not a generic 'find the risks' answer.",
      objectives: [
        "Conducting risk identification exercises: interviews, focus groups, SME input, and document/telemetry analysis",
        "Examining assumption and constraint analyses, and recognizing cascading effects between assumptions/constraints and project objectives",
        "Documenting risk triggers and thresholds based on context, including causes, timing, and consequences",
        "Developing a risk register: validating identified risks, assessing probability/impact/urgency, and classifying threats vs. opportunities",
      ],
    },
    {
      title: "Risk Analysis",
      weight: 23,
      gate: "Given risk data, apply the specific qualitative or quantitative technique it calls for -- a risk matrix, a Monte Carlo simulation -- not a generic 'analyze the risk' answer.",
      objectives: [
        "Performing qualitative analysis: classifying risks in an RBS, applying risk matrices, and prioritizing by impact/urgency",
        "Performing quantitative analysis: sensitivity analysis (Monte Carlo, decision trees, expected monetary value) and risk weighting",
        "Identifying threats and opportunities: assessing project complexity (SWOT, Ishikawa) and running impact analysis against project objectives",
      ],
    },
    {
      title: "Risk Response",
      weight: 13,
      gate: "Given an identified risk, apply the specific response strategy it calls for -- avoid, mitigate, enhance, accept -- and follow through on implementation, not just naming the strategy.",
      objectives: [
        "Planning risk response: choosing a strategy (avoid/accept/mitigate/enhance/contingency) and assigning time-bound actions with owners",
        "Assessing and communicating the effectiveness of a chosen response strategy (e.g., a risk burndown chart)",
        "Implementing risk response: executing response and contingency plans, and evaluating secondary/residual risks that result",
      ],
    },
    {
      title: "Monitor and Close Risks",
      weight: 19,
      gate: "Given ongoing project data, apply the specific monitoring or closure step it calls for -- a variance analysis, a residual-risk update -- not a generic 'keep watching' answer.",
      objectives: [
        "Gathering and analyzing performance data: reconciling reports against risk-relevant work packages and running variance analysis",
        "Monitoring residual and secondary risks resulting from implemented responses, and updating stakeholders on their impact",
        "Updating relevant project documents (risk register, lessons learned, change logs) and closing out expired risks",
        "Monitoring overall project risk level and communicating it to stakeholders through tailored reporting",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PMI-SP -- Scheduling Professional. Source PDF's own copyright is 2012, but
// the same file is still what pmi.org's official certification page links
// to today, and the 150-scored/20-pretest/170-total split its own appendix
// describes matches current (2026) third-party exam-prep sources exactly --
// same "old file, still live" shape as PfMP above, cross-checked rather than
// assumed. Two eligibility paths: secondary diploma + 40 months of
// scheduling experience + 40 hours of scheduling education, or a
// GAC-accredited bachelor's/postgraduate degree + 12 months + 30 hours --
// all within the past 5 years.
//
// 170 questions (150 scored, 20 unscored pretest); multiple choice. 3.5-hour
// allotted time. 1-year eligibility window, up to 3 attempts. Domains:
// Schedule Strategy 14%, Schedule Planning and Development 31%, Schedule
// Monitoring and Controlling 35%, Schedule Closeout 6%, Stakeholder
// Communications Management 14%.
// ---------------------------------------------------------------------------
export const PMISP_TRACK: SeedTrack = {
  code: "PMISP",
  title: "PMI-SP Coach",
  description:
    "PMI Scheduling Professional (PMI-SP) exam prep across 5 weighted domains -- schedule strategy, planning/development, monitoring/controlling, closeout, and stakeholder communications.",
  trackType: "certification",
  subcategorySlug: "pmi-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.pmi.org/certifications/scheduling-sp",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...PMI_PROVIDER,
    credentialSlug: "pmi-sp",
    credentialName: "PMI Scheduling Professional (PMI-SP)",
    credentialUrl: "https://www.pmi.org/certifications/scheduling-sp",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    officialObjectivesUrl:
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/scheduling-professional-exam-outline.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Secondary diploma + 40 months of project scheduling experience + 40 hours of scheduling education, or a GAC-accredited bachelor's/postgraduate degree + 12 months + 30 hours of scheduling education -- all within the past 5 years.",
    durationMinutes: 210,
    questionFormat: "170 questions (150 scored, 20 unscored pretest); multiple choice",
    passingScorePolicy: "Pass/fail against a criterion-referenced standard; PMI does not publish a numeric cut score.",
  },
  units: [
    {
      title: "Schedule Strategy",
      weight: 14,
      gate: "Given a new project's setup, name the specific scheduling-approach or configuration-management decision it calls for -- not a generic 'make a schedule' answer.",
      objectives: [
        "Establishing schedule configuration management policies (accessibility, storage, baseline/change control)",
        "Developing a schedule approach based on a project's unique characteristics, EEFs, and OPAs",
        "Setting scheduling policies and procedures: tool selection, activity granularity, EVM implementation, and approval requirements",
        "Integrating scheduling-related components into the broader project management plan (scope, cost, quality, risk, procurement)",
        "Communicating scheduling objectives, the scheduler's role, and scheduling procedures to the project team",
      ],
    },
    {
      title: "Schedule Planning and Development",
      weight: 31,
      gate: "Given a set of activities, apply the specific scheduling technique it calls for -- a WBS decomposition, a critical-path calculation, a resource-constrained adjustment -- not a generic 'build the schedule' answer.",
      objectives: [
        "Building a work breakdown structure (WBS), organizational breakdown structure (OBS), and control accounts",
        "Estimating activity durations using three-point, parametric, analogous, or PERT techniques",
        "Sequencing activities with dependencies, milestones, and constraints into a logical, dynamic schedule model",
        "Identifying critical and near-critical paths (Critical Path Method, Critical Chain, PERT, Monte Carlo simulation)",
        "Building a resource breakdown structure (RBS) and assigning resources to activities to produce a resource-constrained schedule",
        "Aligning the schedule to an integrated master plan (IMP) and analyzing major milestones against contract/SOW deadlines",
        "Performing schedule risk analysis (what-if scenarios, Monte Carlo simulation) to test whether milestones are achievable within risk tolerance",
        "Obtaining stakeholder consensus on an approved baseline schedule and establishing a Performance Measurement Baseline (PMB)",
      ],
    },
    {
      title: "Schedule Monitoring and Controlling",
      weight: 35,
      gate: "Given schedule status data, apply the specific control action it calls for -- a what-if reanalysis, a formal baseline change -- not a generic 'monitor progress' answer.",
      objectives: [
        "Collecting activity status at defined intervals via reports, meetings, and inspections to update the schedule model",
        "Performing schedule analyses to identify and report status, changes, impacts, and issues",
        "Identifying alternative execution options through what-if scenario analysis to optimize the schedule",
        "Incorporating approved risk-mitigation activities into the schedule under formal change control, establishing a new PMB",
        "Updating the schedule model and documenting baseline changes through formal change-control processes",
      ],
    },
    {
      title: "Schedule Closeout",
      weight: 6,
      gate: "Given a completed project, apply the specific closeout step it calls for -- an EVM variance calculation, a lessons-learned archive -- not a generic 'wrap up' answer.",
      objectives: [
        "Finalizing schedule activities and evaluating schedule performance against the original baseline",
        "Soliciting stakeholder feedback to identify lessons learned and develop scheduling best practices",
        "Updating organizational process assets with documented lessons learned",
        "Distributing final schedule reports (including EVM calculations and variance analysis) to stakeholders",
        "Archiving schedule files (model, management plan, status reports, change log) to satisfy contractual and forensic-analysis needs",
      ],
    },
    {
      title: "Stakeholder Communications Management",
      weight: 14,
      gate: "Given a schedule status scenario, apply the specific communication or escalation step it calls for -- a targeted stakeholder update, an issue elevation -- not a generic 'communicate the schedule' answer.",
      objectives: [
        "Developing and fostering stakeholder relationships consistent with the communication management plan",
        "Generating and maintaining schedule visibility with the project manager and stakeholders",
        "Providing verbal/written schedule status updates and corrective-action impacts to senior management and stakeholders",
        "Communicating schedule issues that could impact scope or the schedule management plan to relevant stakeholders",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PMI-CP -- Construction Professional. Not on the original Strand 2 roster --
// found 2026-09-26 while cross-checking pmi.org's current certification list
// against that roster. Confirmed current: February 2024 ECO, launched 2023,
// no newer revision found. Distinct focus from PMP/CAPM: built-environment
// and capital-project delivery specifically (contracts, interface
// management, claims), not general project management. Eligibility varies
// by education level -- bachelor's degree + 36 months, or secondary diploma
// + 60 months, of construction/built-environment project management
// experience within the past 10 years, per PMI's own page (third-party
// sources disagree on the secondary-path hour count specifically; the
// months figure is the one that corroborates consistently).
//
// PMI does not publish item count, duration, or passing score for this exam
// on the pages fetched -- left unset rather than guessed, same rule as
// PgMP/PfMP above.
// ---------------------------------------------------------------------------
export const PMICP_TRACK: SeedTrack = {
  code: "PMICP",
  title: "PMI-CP Coach",
  description:
    "PMI Construction Professional (PMI-CP) exam prep across 4 weighted domains -- contracts management, stakeholder engagement, strategy/scope management, and project governance for built-environment and capital projects.",
  trackType: "certification",
  subcategorySlug: "pmi-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.pmi.org/certifications/construction",
  sourceVerifiedAt: VERIFIED_AT_20260927,
  credential: {
    ...PMI_PROVIDER,
    credentialSlug: "pmi-cp",
    credentialName: "PMI Construction Professional (PMI-CP)",
    credentialUrl: "https://www.pmi.org/certifications/construction",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    effectiveDate: "2024-02-01",
    objectivesRevision: "February 2024 ECO",
    officialObjectivesUrl:
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/pmicp-exam-content-outline.pdf",
    lastVendorVerifiedAt: VERIFIED_AT_20260927,
    recommendedExperience:
      "Bachelor's degree + 36 months, or secondary diploma + 60 months, of construction/built-environment project management experience -- within the past 10 years.",
    questionFormat: "Multiple choice, computer-based (Pearson VUE test center or online proctored)",
    passingScorePolicy: "Pass/fail against a criterion-referenced standard; PMI does not publish a numeric cut score.",
  },
  units: [
    {
      title: "Contracts Management",
      weight: 50,
      gate: "Given a construction contract scenario, apply the specific delivery-method, claims, or interface-management technique it calls for -- not a generic 'manage the contract' answer.",
      objectives: [
        "Managing project risk throughout the contract lifecycle: recognizing positive risk, applying risk classifications, and prioritizing risk during Front End Planning",
        "Applying risk tools: Integrated Project Risk Assessment (IPRA), Monte Carlo simulation, probabilistic risk techniques, and risk registers",
        "Managing the claims process: distinguishing change/variation orders from claims, using lessons learned to spot problematic patterns, and applying dispute-resolution techniques",
        "Recognizing how contract type and delivery method selection affect claims frequency, and using early-intervention points to reach resolution",
        "Managing the full contract lifecycle from discovery to closeout, including Lean Integrated Project Delivery (IPD/IFOA) and advising senior stakeholders on delivery method fit",
        "Implementing interface management: planning interface points (IPs) across packages, classifying interfaces on mega projects, and applying industry-leading frameworks",
      ],
    },
    {
      title: "Stakeholder Engagement",
      weight: 30,
      gate: "Given a stakeholder communication breakdown, apply the specific tool or technique it calls for -- a PMIS update, an Obeya/Big Room practice -- not generic 'communicate better' advice.",
      objectives: [
        "Using communication tools: PMIS, a central communication platform, Obeya/Big Room practices (and their common pitfalls), and Commitment-based Management (CbM)",
        "Preventing communication issues: building stakeholder buy-in at project outset and crafting audience-tailored messaging",
        "Mitigating communication issues as they emerge: feedback loops that surface gaps, and action plans to resolve them",
        "Managing stakeholders effectively: identifying and assessing stakeholders, and recognizing cultural factors that affect communication",
      ],
    },
    {
      title: "Strategy and Scope Management",
      weight: 15,
      gate: "Given a scope-change scenario, apply the specific change-order or scope-management technique it calls for -- not a generic 'control scope' answer.",
      objectives: [
        "Defining scope focused on project outcomes and mission, and implementing scope revisions to mature project scope accurately",
        "Building and managing a change-order process: timing it appropriately in the project lifecycle and designing agile processes for rapid change orders",
        "Evaluating scope changes against core project outcomes, weighing the benefits and downfalls of technology-assisted scope/change-order management",
        "Applying scope-management tools and techniques (value engineering, cost-benefit analysis) to identify and close scope gaps",
      ],
    },
    {
      title: "Project Governance",
      weight: 5,
      gate: "Given a governance decision point, name the specific structure or practice it calls for -- not a generic 'follow governance' answer.",
      objectives: [
        "Implementing governance models that drive project outcomes on built-environment projects",
        "Setting up scope governance structures and practices specific to construction projects",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PMI-PMOCP -- PMO Certified Professional. Not on the original Strand 2
// roster -- found alongside PMI-CP. Confirmed current: January 2025 ECO
// (V2), no newer revision found. Focus is running a project management
// office as an internal value-delivery function, not managing individual
// projects. Eligibility: secondary diploma + 36 months of project-related
// experience within the past 8 years (waived entirely if the candidate
// already holds an active PMP) + 10 contact hours of PMO-specific
// education.
//
// 120 questions (100 scored, 20 unscored pretest): multiple choice and
// multiple-answer-select. 165-minute (2h45m) allotted time, one optional
// 10-minute break after the first 60 questions. 1-year eligibility window,
// up to 3 attempts. Domains: Organizational Development and Alignment 16%,
// PMO Strategic Elements 18%, PMO Design and Structuring 18%, PMO Operation
// and Performance 15%, PMO Enhancement and Effectiveness 18%, People 15%.
// ---------------------------------------------------------------------------
export const PMIPMOCP_TRACK: SeedTrack = {
  code: "PMIPMOCP",
  title: "PMI-PMOCP Coach",
  description:
    "PMI PMO Certified Professional (PMI-PMOCP) exam prep across 6 weighted domains -- organizational alignment, PMO strategy, design, operations, enhancement, and the people skills a PMO practitioner needs.",
  trackType: "certification",
  subcategorySlug: "pmi-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.pmi.org/certifications/pmo-certified-professional-pmi-pmocp",
  sourceVerifiedAt: VERIFIED_AT_20260927,
  credential: {
    ...PMI_PROVIDER,
    credentialSlug: "pmi-pmocp",
    credentialName: "PMI PMO Certified Professional (PMI-PMOCP)",
    credentialUrl: "https://www.pmi.org/certifications/pmo-certified-professional-pmi-pmocp",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    effectiveDate: "2025-01-01",
    objectivesRevision: "January 2025 ECO (V2)",
    officialObjectivesUrl:
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/pmi-pmocp-exam-content-outline_2025-1.pdf",
    lastVendorVerifiedAt: VERIFIED_AT_20260927,
    recommendedExperience:
      "Secondary diploma + 36 months of project-related experience within the past 8 years (waived if the candidate holds an active PMP) + 10 contact hours of PMO-specific education.",
    durationMinutes: 165,
    questionFormat: "120 questions (100 scored, 20 unscored pretest); multiple choice and multiple-answer-select",
    passingScorePolicy: "Pass/fail against a criterion-referenced standard; PMI does not publish a numeric cut score.",
  },
  units: [
    {
      title: "Organizational Development and Alignment",
      weight: 16,
      gate: "Given an organization's project-management maturity gap, name the specific competency-development or culture-shaping step it calls for -- not a generic 'improve PM practices' answer.",
      objectives: [
        "Elevating organizational project management (OPM): assessing current competencies, building a tailored competency framework, and pairing mentoring with performance-management integration",
        "Shaping OPM culture: assessing current culture's alignment to OPM principles and engaging leadership to champion the shift",
        "Driving OPM maturity: running a maturity assessment against an established model, building a roadmap, and using KPIs to track progress",
        "Cultivating OPM capabilities: identifying and prioritizing the capabilities the organization actually needs, then closing people/process/technology gaps",
      ],
    },
    {
      title: "PMO Strategic Elements",
      weight: 18,
      gate: "Given a PMO's founding or mandate question, name the specific strategic or governance artifact it calls for -- a charter, a governance framework -- not a generic 'set up the PMO' answer.",
      objectives: [
        "Architecting PMO strategy: assessing current state, defining vision/mission/objectives, and building an implementation roadmap with milestones",
        "Stewarding the PMO mandate: defining scope and authority, drafting a PMO charter, and securing executive sponsorship",
        "Establishing and maintaining PMO governance: building a governance framework, reporting structures, and communication channels that adapt as needs change",
      ],
    },
    {
      title: "PMO Design and Structuring",
      weight: 18,
      gate: "Given a PMO customer or service question, name the specific design step it calls for -- a customer persona, a service catalog entry -- not a generic 'serve stakeholders better' answer.",
      objectives: [
        "Managing potential and current PMO customers: identifying and categorizing them, and building personas for their differing needs",
        "Orchestrating solutions to customer needs: systematically capturing requirements and prioritizing them by strategic importance",
        "Articulating and evolving the PMO's value proposition: case studies, quantified impact, and messaging tailored per customer group",
        "Designing and implementing PMO services: a needs assessment, a service catalog, and an SLA framework for each offering",
      ],
    },
    {
      title: "PMO Operation and Performance",
      weight: 15,
      gate: "Given a PMO service in operation, name the specific delivery or resourcing step it calls for -- an onboarding process, a capacity-planning step -- not a generic 'run the PMO' answer.",
      objectives: [
        "Onboarding new PMO service customers: a structured onboarding process, documentation, and a support system during ramp-up",
        "Managing PMO services in production: phased rollout for high-impact services, clear delivery workflows, and escalation procedures",
        "Managing PMO resources: a resource management plan, a skills matrix, and capacity planning for both internal staff and external contractors",
      ],
    },
    {
      title: "PMO Enhancement and Effectiveness",
      weight: 18,
      gate: "Given a PMO performance question, name the specific measurement or improvement step it calls for -- a KPI dashboard, a maturity roadmap -- not a generic 'get better' answer.",
      objectives: [
        "Optimizing PMO service performance: KPIs, a performance measurement system, and a real-time dashboard",
        "Assessing and improving PMO services maturity: adopting a maturity model, running assessments, and building an advancement roadmap",
        "Assessing and improving PMO team competencies: a role-specific competency framework, individual development plans, and mentoring initiatives",
        "Optimizing PMO value: metrics that quantify contribution to organizational success, and benchmarking against industry standards",
      ],
    },
    {
      title: "People",
      weight: 15,
      gate: "Given a PMO practitioner's interpersonal or leadership scenario, name the specific skill it calls for -- negotiating, building resilience, applying business acumen -- not a generic 'be a good leader' answer.",
      objectives: [
        "Enabling a value-driven mindset: data-informed decision-making, strategic thinking, and driving innovation",
        "Fostering customer-centricity and interpersonal relationships: collaboration, effective communication, negotiation, and stakeholder management",
        "Elevating personal impact and effectiveness: accuracy, adaptability, integrity, objectivity, and time management",
        "Leveraging technical skills to deliver results: process optimization, project management, and risk response",
        "Shaping organizational direction: business acumen, cultural awareness, and influencing strategic direction",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PMI-PBA -- Professional in Business Analysis. Not on the original Strand 2
// roster -- found alongside PMI-CP/PMI-PMOCP. Source PDF carries a 2013
// copyright (2017 trademark footer) and its own page says "please always
// refer to the PMI website for the most current version" -- same
// old-file-still-current shape as PfMP/PMI-SP above, cross-checked rather
// than assumed: a current (2026) third-party source independently reports
// "200 questions," which matches this file's own appendix exactly
// (175 scored + 25 pretest = 200).
//
// Three eligibility paths: secondary diploma + 60 months of BA experience
// within 8 years + 35 contact hours; bachelor's degree + 36 months + 35
// hours; or a GAC-accredited bachelor's/postgraduate degree + 24 months.
//
// 200 questions (175 scored, 25 unscored pretest); multiple choice. Domains:
// Needs Assessment 18%, Planning 22%, Analysis 35%, Traceability and
// Monitoring 15%, Evaluation 10%.
// ---------------------------------------------------------------------------
export const PMIPBA_TRACK: SeedTrack = {
  code: "PMIPBA",
  title: "PMI-PBA Coach",
  description:
    "PMI Professional in Business Analysis (PMI-PBA) exam prep across 5 weighted domains -- needs assessment, planning, analysis, traceability/monitoring, and evaluation.",
  trackType: "certification",
  subcategorySlug: "pmi-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.pmi.org/certifications/business-analysis-pba",
  sourceVerifiedAt: VERIFIED_AT_20260927,
  credential: {
    ...PMI_PROVIDER,
    credentialSlug: "pmi-pba",
    credentialName: "PMI Professional in Business Analysis (PMI-PBA)",
    credentialUrl: "https://www.pmi.org/certifications/business-analysis-pba",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    officialObjectivesUrl:
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/professional-business-analysis-exam-outline.pdf",
    lastVendorVerifiedAt: VERIFIED_AT_20260927,
    recommendedExperience:
      "Secondary diploma + 60 months of business analysis experience within 8 years + 35 contact hours, or bachelor's degree + 36 months + 35 hours, or a GAC-accredited bachelor's/postgraduate degree + 24 months.",
    questionFormat: "200 questions (175 scored, 25 unscored pretest); multiple choice",
    passingScorePolicy: "Pass/fail against a criterion-referenced standard; PMI does not publish a numeric cut score.",
  },
  units: [
    {
      title: "Needs Assessment",
      weight: 18,
      gate: "Given a business problem statement, apply the specific needs-assessment technique it calls for -- a value-proposition analysis, a stakeholder identification pass -- not a generic 'understand the problem' answer.",
      objectives: [
        "Defining and reviewing a business problem or opportunity using problem/opportunity-analysis techniques to develop a solution scope statement",
        "Collecting and analyzing information from varied sources to determine an initiative's value proposition",
        "Collaborating on project goals and objectives, clarifying business needs and solution scope to align the product with organizational goals",
        "Identifying stakeholders by reviewing goals, objectives, and requirements to ensure the right parties are represented and informed",
        "Determining stakeholder values through elicitation techniques to establish a baseline for prioritizing requirements",
      ],
    },
    {
      title: "Planning",
      weight: 22,
      gate: "Given a project about to start requirements work, apply the specific planning artifact it calls for -- a traceability strategy, a change-control method -- not a generic 'make a plan' answer.",
      objectives: [
        "Reviewing the business case and project goals to establish context for business analysis activities",
        "Defining a requirements traceability strategy using traceability tools and techniques",
        "Developing a requirements management plan: stakeholders, roles/responsibilities, and elicitation/analysis/approval methods",
        "Selecting requirements change-control methods and standard protocols for incorporation into the change management plan",
        "Selecting document-control methods to establish standard requirements traceability and versioning",
        "Defining business metrics and acceptance criteria collaboratively with stakeholders",
      ],
    },
    {
      title: "Analysis",
      weight: 35,
      gate: "Given a set of raw stakeholder input, apply the specific elicitation, decomposition, or specification technique it calls for -- a dependency analysis, a use case, a prototype validation -- not a generic 'gather requirements' answer.",
      objectives: [
        "Eliciting or identifying requirements using individual and group elicitation techniques, capturing origin and rationale",
        "Analyzing, decomposing, and elaborating requirements: dependency analysis, interface analysis, and data/process modeling",
        "Evaluating product options and capabilities with decision-making and valuation techniques to accept, defer, or reject requirements",
        "Allocating accepted/deferred requirements against scope, schedule, budget, and resource constraints to create a requirements baseline",
        "Obtaining sign-off on the requirements baseline through decision-making techniques that build stakeholder consensus",
        "Writing requirements specifications (use cases, user stories, data/interface details) so they're measurable and actionable for development",
        "Validating requirements via documentation review, prototypes, and demos to confirm completeness and alignment with goals",
        "Elaborating detailed metrics and acceptance criteria used to evaluate whether the solution meets requirements",
      ],
    },
    {
      title: "Traceability and Monitoring",
      weight: 15,
      gate: "Given a requirement moving through its lifecycle, apply the specific tracking or change-impact step it calls for -- a traceability-artifact update, an impact assessment -- not a generic 'keep track of it' answer.",
      objectives: [
        "Tracking requirements using traceability artifacts/tools to provide evidence of delivery against what was stated",
        "Monitoring requirements throughout their lifecycle to ensure supporting artifacts (models, documentation, test cases) are produced and reviewed at each stage",
        "Updating and communicating a requirement's status as it moves through lifecycle states, recording changes in the traceability tool",
        "Communicating requirements status to the project manager and stakeholders: issues, conflicts, changes, risks, and overall status",
        "Managing requirement changes by assessing impact, dependencies, and risk against the change-control plan and requirements baseline",
      ],
    },
    {
      title: "Evaluation",
      weight: 10,
      gate: "Given a delivered solution, apply the specific validation or gap-analysis step it calls for -- a test-result review, a sign-off decision -- not a generic 'check if it works' answer.",
      objectives: [
        "Validating a solution's test results, reports, and evidence against requirements and acceptance criteria",
        "Analyzing and communicating identified gaps/deltas between solution scope, requirements, and what was actually built",
        "Obtaining stakeholder sign-off on the developed solution to proceed to deployment",
        "Evaluating the deployed solution against the original business case and value proposition",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PMI-CPMAI -- Certified Professional in Managing AI. Not on the original
// Strand 2 roster -- found alongside PMI-CP/PMI-PMOCP/PMI-PBA. Confirmed
// current: September 2025 ECO, born from PMI's September 2024 acquisition
// of Cognilytica (the CPMAI Methodology's original developer). A WebSearch
// summary claimed a "July 2026 case-study update" to this exam -- checked
// the actual PDF directly and found no such update anywhere in it, so
// disregarded that claim rather than propagating it; the September 2025
// document is what pmi.org currently serves.
//
// Shape is different from every other PM/Agile PMI cert here: **no minimum
// experience is required at all** -- the only eligibility gate is
// completing PMI's own "PMI-CPMAI Exam Prep Course" first (a mandatory
// training gate, not an hours-of-experience one), then scheduling via
// Pearson VUE.
//
// 120 questions (100 scored, 20 unscored pretest); no scheduled breaks.
// 160-minute (2h40m) allotted time. 1-year eligibility window, up to 3
// attempts. Domains: Support Responsible and Trustworthy AI Efforts 15%,
// Identify Business Needs and Solutions 26%, Identify Data Needs 26%,
// Manage AI Model Development and Evaluation 16%, Operationalize AI
// Solution 17%.
// ---------------------------------------------------------------------------
export const PMICPMAI_TRACK: SeedTrack = {
  code: "PMICPMAI",
  title: "PMI-CPMAI Coach",
  description:
    "PMI Certified Professional in Managing AI (PMI-CPMAI) exam prep across 5 weighted domains -- responsible AI, identifying business and data needs, model development/evaluation, and operationalizing AI solutions.",
  trackType: "certification",
  subcategorySlug: "pmi-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.pmi.org/certifications/ai-project-management-cpmai",
  sourceVerifiedAt: VERIFIED_AT_20260927,
  credential: {
    ...PMI_PROVIDER,
    credentialSlug: "pmi-cpmai",
    credentialName: "PMI Certified Professional in Managing AI (PMI-CPMAI)",
    credentialUrl: "https://www.pmi.org/certifications/ai-project-management-cpmai",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    effectiveDate: "2025-09-01",
    objectivesRevision: "September 2025 ECO",
    officialObjectivesUrl:
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/pmicpmai-exam-content-outline2025-updated.pdf",
    lastVendorVerifiedAt: VERIFIED_AT_20260927,
    recommendedExperience:
      "None required -- the only gate is completing PMI's own PMI-CPMAI Exam Prep Course first, then scheduling via Pearson VUE.",
    durationMinutes: 160,
    questionFormat: "120 questions (100 scored, 20 unscored pretest); no scheduled breaks",
    passingScorePolicy: "Pass/fail against a criterion-referenced standard; PMI does not publish a numeric cut score.",
  },
  units: [
    {
      title: "Support Responsible and Trustworthy AI Efforts",
      weight: 15,
      gate: "Given an AI project's governance question, name the specific responsible-AI practice it calls for -- a bias check, an explainability requirement -- not a generic 'be ethical' answer.",
      objectives: [
        "Overseeing a privacy and security plan: PII governance protocols, encryption/access controls for training data, and privacy impact assessments",
        "Managing AI/ML transparency: documenting model-selection rationale, data-source reporting, and explainability requirements for stakeholders",
        "Conducting bias checks across model, data, and algorithm: demographic representation analysis, fairness testing, and bias-mitigation techniques",
        "Monitoring regulatory and policy compliance: tracking evolving AI regulations and coordinating with legal/compliance teams on governance",
        "Managing accountability documentation and audit trails: version control for models/data/training processes and stakeholder approval records",
      ],
    },
    {
      title: "Identify Business Needs and Solutions",
      weight: 26,
      gate: "Given a proposed AI initiative, apply the specific feasibility, scoping, or ROI technique it calls for -- a risk assessment, a cost-benefit analysis -- not a generic 'build an AI solution' answer.",
      objectives: [
        "Identifying the problem to be solved: user personas, mapping business problems to AI patterns, and validating problem statements with SMEs",
        "Evaluating initial AI feasibility: technical viability, data availability/quality, computational resource requirements, and organizational readiness",
        "Conducting risk assessments across security, safety, and ethics: failure modes, cybersecurity vulnerabilities, and mitigation strategies",
        "Developing an AI project scope statement: boundaries, success criteria, and in-scope/out-of-scope functionality",
        "Determining ROI: expected benefits, total cost of ownership, and a cost-benefit analysis for stakeholder decision-making",
        "Managing adoption and integration risk: change-management requirements, user-resistance planning, and training strategies",
        "Drafting an AI solution: high-level architecture, data flow requirements, and model/algorithmic approach",
        "Defining success criteria (KPIs, performance thresholds) and supporting business-case creation with finance teams",
        "Identifying project resources: skill requirements, infrastructure needs, and gaps requiring outside contractors",
      ],
    },
    {
      title: "Identify Data Needs",
      weight: 26,
      gate: "Given an AI project's data pipeline, apply the specific sourcing, evaluation, or compliance step it calls for -- a data-quality assessment, a privacy check -- not a generic 'get good data' answer.",
      objectives: [
        "Defining required data: types, formats, volume, and quality standards mapped to business objectives",
        "Identifying data subject-matter experts, sources, and locations: internal databases, external providers, and legacy archives",
        "Coordinating AI workspace infrastructure: compute provisioning, secure development environments, and version control",
        "Gathering required data and checking privacy, compliance, and access rights (usage licensing, data protection regulations)",
        "Overseeing data evaluation: quality dimensions (accuracy, completeness, consistency), bias/gap analysis, and exploratory data analysis",
        "Determining whether available data meets solution needs, and conveying data readiness to leadership in business-relevant terms",
      ],
    },
    {
      title: "Manage AI Model Development and Evaluation",
      weight: 16,
      gate: "Given a model in development, apply the specific technique/QA step it calls for -- a hyperparameter-tuning decision, a go/no-go call -- not a generic 'train the model' answer.",
      objectives: [
        "Overseeing AI/ML model technique and algorithm selection: supervised/unsupervised/reinforcement learning tradeoffs against complexity and interpretability",
        "Overseeing model QA/QC: testing protocols, configuration management, and peer review of model design",
        "Managing AI/ML model training: scheduling, hyperparameter tuning, cross-validation, and experiment tracking",
        "Managing data transformation and preparation: cleaning, feature engineering, normalization, and reproducibility documentation",
        "Verifying data quality and readiness for training with a go/no-go decision, and verifying model readiness for operationalization",
      ],
    },
    {
      title: "Operationalize AI Solution",
      weight: 17,
      gate: "Given a model ready for production, apply the specific deployment or governance step it calls for -- a rollback plan, a drift-monitoring setup -- not a generic 'deploy it' answer.",
      objectives: [
        "Creating an AI solution deployment plan: strategy, timeline, infrastructure requirements, and rollback procedures",
        "Managing AI solution deployment: coordinating activities, validating production performance, and post-deployment verification",
        "Overseeing model governance: lifecycle management, versioning, and drift detection/monitoring",
        "Overseeing AI solution metrics: monitoring dashboards, KPI tracking, and performance-degradation alerting",
        "Preparing a final report and lessons learned, and managing the transition plan to operational/production support teams",
        "Overseeing an AI solution contingency plan: incident response, disaster recovery, and business-continuity procedures",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CSPP -- Certified Sustainable Project Professional. Not on the original
// Strand 2 roster -- found alongside the other four. Confirmed current and
// genuinely fresh for once: March 2026 ECO (V2), developed jointly by PMI
// and Green Project Management (GPM), replacing GPM's standalone GPM-b
// credential (new applicants can still sit GPM-b through 2026-12-31 during
// the transition). Aligned to the PMI-GPM P5 Standard for Sustainability in
// Project Management, not PMBOK.
//
// PMI splits this into two eligibility pathways with genuinely different
// exam shapes, not just different prerequisites: **Certified Practitioner**
// (already holds an active PMP/CAPM/PfMP/PgMP or equivalent, or a Master's
// in project/program management -- 12 hours of sustainability-specific
// education, 5 domains, 100 questions/120 minutes) vs. **Non-Certified
// Practitioner** (no qualifying credential -- secondary diploma + 20 hours
// of education, 6 domains including an extra "Project Management
// Considerations" domain covering PM fundamentals, 145 questions/175
// minutes). Modeled here on the Certified Practitioner path's domains and
// weights, since Ascendra's other PM tracks assume a learner already
// working from PMI's credential ladder -- noted explicitly below rather
// than silently picking one.
// ---------------------------------------------------------------------------
export const CSPP_TRACK: SeedTrack = {
  code: "CSPP",
  title: "CSPP Coach",
  description:
    "PMI & GPM Certified Sustainable Project Professional (CSPP) exam prep across 5 weighted domains -- sustainability foundations, the PRiSM life cycle, P5 impact analysis, sustainability management planning, and ESG reporting/governance. Modeled on the Certified Practitioner pathway (for candidates who already hold a qualifying PM credential); the Non-Certified Practitioner pathway adds a sixth domain and different weights for candidates without one.",
  trackType: "certification",
  subcategorySlug: "pmi-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.pmi.org/certifications/sustainability-cspp",
  sourceVerifiedAt: VERIFIED_AT_20260927,
  credential: {
    ...PMI_PROVIDER,
    credentialSlug: "cspp",
    credentialName: "PMI & GPM Certified Sustainable Project Professional (CSPP)",
    credentialUrl: "https://www.pmi.org/certifications/sustainability-cspp",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    effectiveDate: "2026-03-01",
    objectivesRevision: "March 2026 ECO (V2), Certified Practitioner pathway",
    officialObjectivesUrl:
      "https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/cspp/cspp-exam-content-outline_2026.pdf",
    lastVendorVerifiedAt: VERIFIED_AT_20260927,
    recommendedExperience:
      "Certified Practitioner pathway: an active qualifying PM credential (PMP, CAPM, PfMP, PgMP, or equivalent) or a Master's degree in project/program management, plus 12 hours of sustainability-specific education. (A separate Non-Certified Practitioner pathway exists for candidates without a qualifying credential -- secondary diploma + 20 hours of education, but a longer 6-domain exam.)",
    durationMinutes: 120,
    questionFormat: "100 questions (85 scored, 15 unscored pretest); multiple choice, computer-based",
    passingScorePolicy: "Pass/fail against a criterion-referenced standard; PMI does not publish a numeric cut score.",
  },
  units: [
    {
      title: "Foundations of Sustainable Project Work",
      weight: 18,
      gate: "Given a sustainability scenario, name the specific framework or standard it calls for -- the UN SDGs, GRI/SASB/TCFD reporting, the Triple Bottom Line -- not a generic 'be sustainable' answer.",
      objectives: [
        "Determining sustainability objectives: why organizations adopt sustainable practices and why individuals commit to them",
        "Explaining the Triple Bottom Line: People, Planet, and Prosperity considerations",
        "Recalling major global frameworks: the UN Sustainable Development Goals (SDGs) and the UN Global Compact's principles",
        "Identifying the role of sustainability reporting and ESG disclosures in project contexts: GRI, SASB, TCFD, and IFRS Sustainability Disclosure Standards, and how they differ from ESG disclosures",
        "Defining sustainability, regeneration, and resilience in project environments: reducing negative environmental impact and designing projects to withstand or recover from extreme events",
      ],
    },
    {
      title: "PRiSM (Projects Integrating Sustainable Methods) Life Cycle Approach",
      weight: 18,
      gate: "Given a project at a specific PRiSM life-cycle phase, name the specific deliverable or supporting process it calls for -- not a generic 'follow the life cycle' answer.",
      objectives: [
        "Identifying core PRiSM concepts and principles: how PRiSM relates to traditional project management, and the PRiSM Project Life Cycle's features and key deliverables",
        "Applying PRiSM life cycle phases to a scenario: staffing, deliverables, risk/opportunity management, cost/finance, and scheduling",
        "Determining PRiSM's supporting processes: stakeholder engagement practices, estimation, team development, sustainable procurement, and performance monitoring",
      ],
    },
    {
      title: "P5 Standard: Sustainability and Impact Analysis",
      weight: 36,
      gate: "Given a project scenario, apply the specific P5 lens (Product, Process, People, Planet, Prosperity) it calls for -- not a generic 'consider sustainability' answer.",
      objectives: [
        "Identifying P5 categories, subcategories, elements, perspectives, and lenses, and their impact on projects, programs, and portfolios",
        "Performing a P5 Impact Analysis: Product lenses (lifespan, servicing) and Process lenses (efficiency, effectiveness, fairness)",
        "Evaluating P5 Impact Analysis results: analysis mechanics, assigning items to elements, and project status reporting at closure",
        "Evaluating People impacts: labor practices and decent work, community/customer concerns, human rights considerations, and ethical behavior (anti-corruption, greenwashing)",
        "Evaluating Planet and Prosperity impacts: transport/consumption considerations, project feasibility (business case, social ROI), business agility, and market/economic stimulation",
        "Identifying the role of materiality in ESG disclosures and sustainability reports",
      ],
    },
    {
      title: "Developing a Sustainability Management Plan Based on Sustainability Standards",
      weight: 18,
      gate: "Given a Sustainability Management Plan scenario, name the specific standard, role, or threshold decision it calls for -- not a generic 'plan for sustainability' answer.",
      objectives: [
        "Evaluating aspects of a Sustainability Management Plan against a scenario: anti-bribery standards and supporting community/social-responsibility development",
        "Identifying the project manager's role and responsibilities in implementing a Sustainability Management Plan, including systems-thinking concepts and distinguishing PM/sponsor/PMO roles",
        "Assessing sustainability impact thresholds: organizational thresholds, value-chain impact, and regulatory compliance consequences",
        "Defining KPIs and managing sustainability concerns in procurement: supplier selection, contract types, and contract management",
      ],
    },
    {
      title: "ESG & Sustainability Reporting, Governance, and Project Communications",
      weight: 11,
      gate: "Given a sustainability-communications scenario, apply the specific reporting or governance step it calls for -- not a generic 'communicate transparently' answer.",
      objectives: [
        "Identifying types of sustainability-related communications and their purpose: building trust, increasing transparency, and avoiding greenwashing",
        "Explaining the link between project activities, ESG disclosures, and sustainability reporting, including the role of materiality",
        "Determining an appropriate governance framework for a given scenario: characteristics of good governance",
      ],
    },
  ],
};

export const PM_TRACKS: SeedTrack[] = [
  CAPM_TRACK,
  PMP_TRACK,
  PMIACP_TRACK,
  PGMP_TRACK,
  PFMP_TRACK,
  PMIRMP_TRACK,
  PMISP_TRACK,
  PMICP_TRACK,
  PMIPMOCP_TRACK,
  PMIPBA_TRACK,
  PMICPMAI_TRACK,
  CSPP_TRACK,
];
