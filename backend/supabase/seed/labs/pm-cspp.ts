import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-171: CSPP (PMI & GPM Certified Sustainable Project Professional).
//
// Aligned to the CSPP Examination Content Outline V2 (cover "March 2026",
// running title "February 2026"), re-read 2026-11-09 in the PDF on pmi.org:
// Certified Practitioner pathway weights Foundations 18%, PRiSM life cycle
// 18%, P5 Standard and impact analysis 36%, Sustainability Management Plan
// 18%, ESG reporting / governance / communications 11% (printed total 101,
// kept as printed; the Non-Certified pathway's sixth domain is not tested
// for Certified Practitioners). The track models the Certified Practitioner
// pathway.
// Density ("hybrid"): 2 / 2 / 3 / 2 / 1 = 10 labs (6 build, 4 case).
// The labs apply the P5 lenses (People, Planet, Prosperity, Product,
// Process) and PRiSM vocabulary as the outline names them; framework names
// (UN SDGs, GRI, ISSB/IFRS S1-S2) are used only for what they are, without
// quoting their text.

const CHECKED = "2026-11-09";

export const CSPP_LABS: SeedLabSet = {
  trackCode: "CSPP",
  sources: [
    source("https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/cspp/cspp-exam-content-outline_2026.pdf", "exam_outline", CHECKED),
    source("https://www.pmi.org/certifications/sustainability-cspp", "exam_outline", "2026-09-27"),
  ],
  labs: [
    // Foundations (2)
    {
      slug: "cspp-triple-bottom-line",
      objective: "Explaining the Triple Bottom Line: People, Planet, and Prosperity considerations",
      kind: "build",
      title: "Assess a warehouse project on the triple bottom line",
      brief:
        "Greyling Logistics (fictional) plans a new 40,000 m2 distribution warehouse on farmland near a small town. It will create 300 jobs, mostly shift work; it adds about 200 truck movements a day on a rural road past a primary school; the design includes rooftop solar covering about 60% of its electricity; the business case shows 14% return on investment.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Assess the project against People, Planet and Prosperity, naming a positive and a negative impact for each and one improvement.",
          parts: [
            part(
              "People",
              "Positive: 300 local jobs; negative: safety and noise from truck traffic near the school, shift-work conditions; improvement: e.g. a bypass route or timed deliveries, fair shift patterns.",
              "Positive: 300 jobs in a small town. Negative: 200 trucks a day past a primary school, plus night-shift effects on workers. Improvement: route trucks away from the school or ban deliveries at school times, and set fair, predictable shifts."
            ),
            part(
              "Planet",
              "Positive: rooftop solar; negative: loss of farmland/habitat and transport emissions; improvement: e.g. biodiversity net gain, electric yard vehicles, rail connection study.",
              "Positive: solar meets about 60% of power. Negative: farmland and habitat lost, plus truck emissions. Improvement: on-site habitat creation and electric yard trucks with charging."
            ),
            part(
              "Prosperity",
              "Positive: 14% ROI and local economic activity; negative: risks such as road upkeep costs for the council or competition for local labour; improvement: local supplier and hiring commitments.",
              "Positive: 14% return and local spending. Negative: road wear costs fall on the council and local employers may lose staff. Improvement: contribute to road maintenance and commit to local suppliers and training."
            ),
          ],
        },
      ],
    },
    {
      slug: "cspp-resilience-regeneration-case",
      objective:
        "Defining sustainability, regeneration, and resilience in project environments: reducing negative environmental impact and designing projects to withstand or recover from extreme events",
      kind: "case",
      title: "A riverside community centre",
      brief:
        "A fictional town council is designing a community centre on a riverside site that flooded twice in the last 20 years.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The architect's concept meets energy-efficiency standards but places the main hall and electrical plant at ground level.",
          ask: "Distinguish sustainability from resilience here, and what design changes improve resilience?",
          parts: [
            part(
              "Concepts",
              "Explains sustainability (reducing negative impact over the life cycle, e.g. energy, materials) vs resilience (ability to withstand and recover from shocks like floods), noting the concept addresses the first but not the second.",
              "The design is sustainable in reducing energy use, but not resilient: a flood would knock out the electrical plant and the hall, and recovery would be slow and costly."
            ),
            part(
              "Resilience changes",
              "Raises critical plant above flood level, uses flood-tolerant ground-floor materials, plans quick recovery (drainage, removable fittings), and considers an emergency-shelter role.",
              "Put electrical plant on the first floor or a raised plinth, use flood-tolerant finishes and removable fittings on the ground floor, add drainage so it can be cleaned and reopened quickly, and consider using the upper floor as an emergency shelter."
            ),
          ],
        },
        {
          text: "A local group asks whether the project could leave the riverbank better than it found it.",
          ask: "How would a regenerative approach change the project?",
          parts: [
            part(
              "Regeneration",
              "Describes regeneration as going beyond reducing harm to restoring systems (e.g. restoring the riverbank habitat, natural flood management, involving the community), with a measure.",
              "Regenerative design aims for net positive impact: restore native riverbank planting and a wetland area that also stores floodwater, involve local volunteers, and measure habitat area and species counts before and after."
            ),
          ],
        },
      ],
    },

    // PRiSM (2)
    {
      slug: "cspp-prism-phase-application",
      objective:
        "Applying PRiSM life cycle phases to a scenario: staffing, deliverables, risk/opportunity management, cost/finance, and scheduling",
      kind: "build",
      title: "Apply PRiSM to a school refurbishment",
      brief:
        "A fictional school trust is refurbishing a 1970s school building over 18 months. It wants lower energy bills, healthier classrooms and minimal waste. The project manager is applying PRiSM (Projects integrating Sustainable Methods).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe how sustainability shows up in the project's staffing, deliverables, risks and opportunities, cost and schedule.",
          parts: [
            part(
              "Staffing and deliverables",
              "Adds sustainability roles or competencies (e.g. a sustainability lead, contractors with waste-management capability) and sustainability deliverables (e.g. a sustainability management plan, P5 impact analysis, waste plan, energy targets).",
              "Appoint a sustainability lead and require contractor waste-management competence. Deliverables include a sustainability management plan, a P5 impact analysis, a site waste plan and energy and air-quality targets for classrooms."
            ),
            part(
              "Risks and opportunities",
              "Identifies sustainability risks (asbestos in a 1970s building, disrupting lessons) and opportunities (reusing materials, solar, ventilation upgrades) in the register.",
              "Risks: asbestos removal delays, dust and noise during term. Opportunities: reuse sound internal walls and fittings, add heat-recovery ventilation and solar panels."
            ),
            part(
              "Cost and schedule",
              "Uses life-cycle costing (higher upfront, lower running costs) and schedules noisy or hazardous work in holidays.",
              "Compare options on life-cycle cost, not just capital: heat-recovery ventilation costs more now but lowers bills. Schedule asbestos removal and noisy work in school holidays."
            ),
          ],
        },
      ],
    },
    {
      slug: "cspp-sustainable-procurement-case",
      objective:
        "Determining PRiSM's supporting processes: stakeholder engagement practices, estimation, team development, sustainable procurement, and performance monitoring",
      kind: "case",
      title: "Sustainable procurement for furniture",
      brief:
        "The same fictional school trust must buy furniture for 30 classrooms. The cheapest bid is 15% below the others.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The finance officer wants to accept the cheapest bid.",
          ask: "What sustainable procurement criteria should the evaluation include?",
          parts: [
            part(
              "Criteria",
              "Includes life-cycle cost (durability, repairability), material sourcing (certified timber, recycled content), supplier labour practices, take-back at end of life, and delivery emissions, weighted alongside price.",
              "Evaluate on whole-life cost (warranty, repairable parts), certified or recycled materials, the supplier's labour standards, a take-back scheme, and delivery distance -- with price as one weighted criterion, not the only one."
            ),
          ],
        },
        {
          text: "The cheapest supplier's furniture has a 2-year warranty versus 10 years from the second-cheapest, and it can't show where its timber comes from.",
          ask: "What do you recommend and how do you monitor the contract?",
          parts: [
            part(
              "Recommendation and monitoring",
              "Recommends the bid with better whole-life value and traceable materials (with the reasoning) and sets contract KPIs (delivery, defects, take-back, evidence of sourcing) reviewed during the contract.",
              "Recommend the second bid: furniture lasting 10 years instead of needing replacement after a few years is cheaper over its life, and its timber is traceable. Contract KPIs: on-time delivery, defect rate, sourcing certificates, and take-back of old furniture, reviewed quarterly."
            ),
          ],
        },
      ],
    },

    // P5 (3)
    {
      slug: "cspp-p5-impact-analysis",
      objective: "Performing a P5 Impact Analysis: Product lenses (lifespan, servicing) and Process lenses (efficiency, effectiveness, fairness)",
      kind: "build",
      title: "Run Product and Process lenses on a software project",
      brief:
        "Fernhill Health Trust (fictional) is building a patient-booking app. Choices under discussion: build it for the latest phones only (faster delivery) or support phones up to 6 years old; host on servers in a data centre that runs on grid power or on a cloud region with a high renewable share; the team works with daily stand-ups and long overtime near releases.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Apply the Product and Process lenses and recommend changes.",
          parts: [
            part(
              "Product: lifespan and servicing",
              "Considers lifespan and servicing of the product: supporting older phones extends device life and inclusion; a maintainable design and update plan extend the app's useful life.",
              "Support phones up to 6 years old so patients aren't pushed to buy new devices and older patients aren't excluded; design for easy maintenance and plan updates so the app lasts."
            ),
            part(
              "Process: efficiency and effectiveness",
              "Considers process efficiency (e.g. hosting energy, efficient code, testing practices) and effectiveness (does the process deliver the needed outcome).",
              "Host in the cloud region with the higher renewable share and keep images and data transfer small. Test with real patients early so the app actually reduces missed appointments."
            ),
            part(
              "Process: fairness",
              "Identifies fairness in the process (overtime and workload for the team, accessible design for users) and proposes a change.",
              "Long overtime near releases is unfair and unsustainable: plan smaller, regular releases. Include accessibility testing so the app works for people with disabilities."
            ),
          ],
        },
      ],
    },
    {
      slug: "cspp-people-impacts-case",
      objective:
        "Evaluating People impacts: labor practices and decent work, community/customer concerns, human rights considerations, and ethical behavior (anti-corruption, greenwashing)",
      kind: "case",
      title: "A solar farm's supply chain and claims",
      brief:
        "You manage a fictional 50 MW solar farm project for Brightfield Energy.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "A news report says the lowest-cost panel supplier may use materials linked to forced labour. The supplier offers a 'local facilitation payment' to speed customs clearance.",
          ask: "What People impacts are at stake, and what do you do?",
          parts: [
            part(
              "Human rights and labour",
              "Treats possible forced labour as a serious human rights risk: requests supply-chain traceability and independent audits, and is prepared to choose another supplier.",
              "Possible forced labour in the supply chain is a human rights issue: ask for traceability to the raw material and independent audit evidence, and switch supplier if it can't be shown to be clean."
            ),
            part(
              "Anti-corruption",
              "Refuses the facilitation payment as a bribery risk and reports it per company policy.",
              "Refuse the payment -- it's a bribery risk -- and report it to the compliance team."
            ),
          ],
        },
        {
          text: "Marketing wants the project brochure to say the farm is 'carbon-free and 100% ethical'.",
          ask: "How do you respond?",
          parts: [
            part(
              "Greenwashing",
              "Identifies the claim as greenwashing (unsupported absolute claims; panels have embodied emissions; supply-chain issues unresolved) and proposes accurate, evidenced wording.",
              "That's greenwashing: the panels have manufacturing emissions and the supply-chain question is open. Use accurate wording such as 'will generate about X MWh of renewable electricity a year; we are auditing our supply chain against forced-labour risks', with evidence."
            ),
          ],
        },
      ],
    },
    {
      slug: "cspp-materiality-assessment",
      objective: "Identifying the role of materiality in ESG disclosures and sustainability reports",
      kind: "build",
      title: "Decide which sustainability topics are material",
      brief:
        "Brightfield Energy (fictional) is preparing its first sustainability report. Candidate topics: greenhouse gas emissions, land use and biodiversity at solar sites, supply-chain labour practices, employee health and safety, office recycling, community benefit funds, and board diversity. Investors mainly ask about climate risk; local communities mainly ask about land and benefits.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain materiality and prioritise the topics.",
          parts: [
            part(
              "Concept",
              "Explains materiality as deciding which topics are significant enough to report, and the two perspectives: impact on people and planet (impact materiality) and impact on the company's finances (financial materiality) -- together, double materiality.",
              "Materiality decides which topics matter enough to report. Impact materiality: the company's effects on people and environment. Financial materiality: how sustainability issues affect the company's value. Considering both is double materiality."
            ),
            part(
              "Prioritisation",
              "Ranks topics using both perspectives and stakeholder input (e.g. emissions/climate risk, land and biodiversity, supply-chain labour, health and safety high; community funds medium; office recycling low), with reasons.",
              "High: emissions and climate risk (investor and financial impact), land use and biodiversity (main local impact), supply-chain labour (serious human rights risk), health and safety (construction sites). Medium: community benefit funds, board diversity. Low: office recycling (small impact)."
            ),
            part(
              "Process",
              "Describes how the assessment is done and kept credible (stakeholder engagement, documented method, periodic review, link to the reporting standard used).",
              "Survey investors, communities and staff; score topics on both dimensions; document the method; review yearly; disclose the method in the report under the chosen standard (for example GRI)."
            ),
          ],
        },
      ],
    },

    // Sustainability Management Plan (2)
    {
      slug: "cspp-pm-role-smp",
      objective:
        "Identifying the project manager's role and responsibilities in implementing a Sustainability Management Plan, including systems-thinking concepts and distinguishing PM/sponsor/PMO roles",
      kind: "build",
      title: "Who does what in the sustainability plan",
      brief:
        "Fernhill Health Trust (fictional) is building a new outpatient clinic. Its sustainability management plan sets targets for energy, waste, local hiring and accessible design. The sponsor is the trust's estates director; the trust's PMO sets standards for all projects.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Define the roles of the project manager, sponsor and PMO, and show a systems-thinking view.",
          parts: [
            part(
              "Roles",
              "PM: integrates the plan into the project plan, tracks targets, manages trade-offs and reports; sponsor: owns the sustainability objectives, provides resources and resolves escalations; PMO: sets standards/templates, consolidates reporting across projects and builds capability.",
              "Project manager: builds the targets into scope, schedule and procurement, tracks and reports them, and manages trade-offs. Sponsor (estates director): owns the objectives and the business case, funds them, decides escalated trade-offs. PMO: provides templates and standards, rolls up sustainability reporting across projects, trains PMs."
            ),
            part(
              "Systems thinking",
              "Shows how decisions interact across the system (e.g. clinic location affects patient travel emissions and access; a choice that cuts construction cost may raise running costs), not just within the project boundary.",
              "Look beyond the building: siting near public transport cuts patient and staff travel emissions and improves access; cheaper glazing lowers capital cost but raises heating bills for 40 years; local hiring supports the community the clinic serves."
            ),
          ],
        },
      ],
    },
    {
      slug: "cspp-impact-thresholds",
      objective: "Assessing sustainability impact thresholds: organizational thresholds, value-chain impact, and regulatory compliance consequences",
      kind: "build",
      title: "Set the escalation thresholds for sustainability impacts",
      brief:
        "Greyling Logistics' (fictional) warehouse project has these organisational commitments: reduce operational emissions 40% by 2030; zero tolerance for modern slavery in suppliers; comply with local environmental permits. The project's design changes keep arriving, some of which affect emissions or suppliers.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Define thresholds that tell the project manager when a sustainability impact must be escalated.",
          parts: [
            part(
              "Organisational thresholds",
              "Links thresholds to the stated commitments, e.g. any design change increasing expected annual emissions by more than an agreed % goes to the sponsor.",
              "Any change that increases expected annual operational emissions by more than 5% of the design estimate goes to the sponsor; anything that would put the 40% target out of reach goes to the executive."
            ),
            part(
              "Value chain",
              "Covers supplier and value-chain impacts (any credible modern-slavery concern is escalated immediately and the supplier suspended pending review).",
              "Any credible modern-slavery allegation about a supplier or subcontractor: escalate the same day to the sponsor and compliance, and pause new orders pending review (zero tolerance)."
            ),
            part(
              "Regulatory",
              "Treats any risk of breaching an environmental permit as an immediate escalation with a stop-work option, noting legal consequences.",
              "Any activity that may breach the environmental permit (e.g. drainage discharge) is stopped and escalated immediately to the sponsor and the environmental manager, since breaches carry fines and possible prosecution."
            ),
          ],
        },
      ],
    },

    // ESG reporting, governance, communications (1)
    {
      slug: "cspp-sustainability-communications-case",
      objective:
        "Identifying types of sustainability-related communications and their purpose: building trust, increasing transparency, and avoiding greenwashing",
      kind: "case",
      title: "Communicating a missed sustainability target",
      brief:
        "Fernhill Health Trust's (fictional) clinic project promised a 90% construction-waste recycling rate. At completion the measured rate is 72% because a supplier's recycling contract fell through for three months.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The communications team suggests the press release say 'built to the highest sustainability standards' and leave out the waste figure.",
          ask: "What do you advise?",
          parts: [
            part(
              "Transparency",
              "Advises against the vague claim (greenwashing risk) and recommends reporting the actual figure, the reason and what was learned, which builds more trust than omission.",
              "Don't use 'highest standards' -- it's vague and could be seen as greenwashing. State the result honestly: 72% recycled against a 90% target, why it was missed, and what changes next time. Honest reporting builds trust."
            ),
          ],
        },
        {
          text: "The board asks how sustainability results should be communicated on future projects.",
          ask: "Recommend the types of communication and their purpose.",
          parts: [
            part(
              "Communication types",
              "Lists appropriate types (regular internal progress reports, stakeholder updates, a project sustainability report feeding the organisation's ESG disclosures, public statements backed by evidence) with purposes and a rule that claims are specific and verifiable.",
              "Monthly internal sustainability dashboard (steer the project); quarterly updates to community and staff (trust); a project sustainability report at closure that feeds the trust's annual ESG disclosures (transparency). Public claims must be specific, measured and backed by evidence."
            ),
          ],
        },
      ],
    },
  ],
};
