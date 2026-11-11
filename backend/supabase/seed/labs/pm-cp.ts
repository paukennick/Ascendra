import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-171: PMI-CP (PMI Construction Professional in Built Environment
// Projects).
//
// Aligned to the PMI-CP ECO's four domains: Contracts Management 50%,
// Stakeholder Engagement 30%, Strategy and Scope Management 15%, Project
// Governance 5%. pmi.org's PMI-CP page, read 2026-11-09, still offers the
// exam with these weights and announces no change; the ECO (February 2024)
// was read for the track on 2026-09-27.
// Density ("hybrid"): 3 / 3 / 2 / 1 = 9 labs (7 build, 2 case).
// Every number in a rubric is worked in its model answer. Contract types,
// claims and delivery methods are described generically, not by any one
// standard form's clause numbers.

const CHECKED = "2026-11-09";

export const PMICP_LABS: SeedLabSet = {
  trackCode: "PMICP",
  sources: [
    source("https://www.pmi.org/certifications/construction", "exam_outline", CHECKED),
    source("https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/pmicp-exam-content-outline.pdf", "exam_outline", "2026-09-27"),
  ],
  labs: [
    // Contracts Management (3)
    {
      slug: "cp-change-order-vs-claim-case",
      objective:
        "Managing the claims process: distinguishing change/variation orders from claims, using lessons learned to spot problematic patterns, and applying dispute-resolution techniques",
      kind: "case",
      title: "Variation or claim on a school build",
      brief:
        "You manage the owner's side of a fictional $28M school build (lump-sum contract) for Eastvale Education Trust. The contract lets the owner instruct variations, valued at agreed rates, and requires the contractor to notify any claim within 28 days of becoming aware of it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Item 1: the trust asks for 40 extra classroom sockets; the contractor quotes $18,000 using the contract rates. Item 2: the contractor writes that ground conditions were worse than the site investigation showed and asks for $420,000 and 6 weeks; it found the problem 7 weeks ago.",
          ask: "Classify each item and say how it should be handled.",
          parts: [
            part(
              "Item 1",
              "A change/variation order: owner-instructed scope change, priced on contract rates, approved through the change process and issued as a formal order before work.",
              "A variation: the owner changed the scope. Check the quote against contract rates, approve it through change control and issue a written variation order before the work is done."
            ),
            part(
              "Item 2",
              "A claim: the contractor seeks extra time and money for an event it says entitles it under the contract; it must be assessed on entitlement (contract allocation of ground risk, what the site investigation showed) and on notice -- 7 weeks exceeds the 28-day notice requirement, which may affect entitlement.",
              "A claim: the contractor asserts an entitlement for unforeseen ground conditions. Assess (a) entitlement -- who carries ground risk under this contract and whether the conditions differ from the site investigation; (b) notice -- it gave notice after 7 weeks, beyond the 28 days required, which may limit its claim; (c) quantum and delay, with records."
            ),
          ],
        },
        {
          text: "Your review finds partial entitlement: some ground was worse than reported, but the contractor's program also slipped for its own reasons. The contractor threatens formal proceedings.",
          ask: "How do you try to resolve the dispute?",
          parts: [
            part(
              "Resolution route",
              "Uses negotiation first on the evidence (separate the owner-risk delay from contractor delay), then the contract's tiered steps (senior-level meeting, mediation, adjudication or a dispute board) before arbitration or litigation, keeping records and continuing the work.",
              "Meet with the evidence: offer the time and cost for the owner-risk portion only (for example 3 of 6 weeks). If that fails, follow the contract's escalation ladder -- senior executives, then mediation or adjudication -- before arbitration. Keep the works going and records complete."
            ),
            part(
              "Lessons learned",
              "Records the pattern (late notice, ground-risk claims) for future contracts, e.g. better site investigation, clearer risk allocation, or early-warning meetings.",
              "Lesson: invest in fuller ground investigation and hold monthly early-warning meetings so issues are raised within the notice period."
            ),
          ],
        },
      ],
    },
    {
      slug: "cp-delivery-method-selection",
      objective:
        "Recognizing how contract type and delivery method selection affect claims frequency, and using early-intervention points to reach resolution",
      kind: "build",
      title: "Choose a delivery method for a hospital extension",
      brief:
        "Whitmore Health (fictional) needs a 60-bed extension to an operating hospital. Design is 20% complete; the hospital must stay open throughout; the board wants cost certainty early but expects many clinical design changes; it has a small in-house construction team. Last time, a design-bid-build lump-sum contract on a similar job led to 140 change orders and three major claims.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Recommend a delivery method and contract approach, and the early-intervention points that reduce claims.",
          parts: [
            part(
              "Diagnosis of the past",
              "Explains why design-bid-build lump sum with incomplete design and many changes generates change orders and claims (contractor priced a design that kept changing; adversarial roles).",
              "A lump-sum price on a design that then changed 140 times guaranteed variations and disputes over what was in the original price; the contractor had no say in the design."
            ),
            part(
              "Recommended method",
              "Recommends a collaborative method suited to early contractor input and changing design (e.g. construction management at risk / early contractor involvement with a guaranteed maximum price set once design matures, or integrated project delivery), and explains the trade-off with early cost certainty.",
              "Construction manager at risk (or early contractor involvement): the contractor joins at 20% design, advises on phasing around the live hospital, and agrees a guaranteed maximum price when design is about 60-70% complete. The board gets cost certainty later than with lump sum but with far fewer surprises."
            ),
            part(
              "Early intervention points",
              "Names specific early-intervention mechanisms: design freeze points with clinical sign-off, early-warning notices and risk-reduction meetings, a standing dispute board or regular senior reviews.",
              "Clinical design sign-off at fixed freeze points; early-warning notices with fortnightly risk-reduction meetings; a standing dispute avoidance board meeting quarterly."
            ),
          ],
        },
      ],
    },
    {
      slug: "cp-interface-management-plan",
      objective:
        "Implementing interface management: planning interface points (IPs) across packages, classifying interfaces on mega projects, and applying industry-leading frameworks",
      kind: "build",
      title: "Plan the interfaces between three packages",
      brief:
        "A fictional light-rail project has three packages let to different contractors: civils (track bed, bridges, stations' structure), systems (signaling, power, communications) and stations fit-out (platform screens, lifts, ticketing). The systems contractor needs cable ducts cast into the civils structures; the station fit-out needs power from systems and finished platforms from civils.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the interface management plan's key content.",
          parts: [
            part(
              "Interface points",
              "Identifies specific interface points between packages (ducts and embedded items civils-systems; power supply systems-fit-out; platform handover civils-fit-out) with a giving and receiving party and a need date.",
              "IP-01 cable ducts in bridges and platforms: civils gives, systems receives, needed before concrete pours. IP-02 station power supply: systems gives, fit-out receives, before lift testing. IP-03 finished platforms: civils gives, fit-out receives, by handover date."
            ),
            part(
              "Classification",
              "Classifies interfaces (e.g. physical, functional, contractual, organizational; or internal/external) and by criticality.",
              "IP-01 physical, critical (missed ducts mean breaking out concrete). IP-02 functional, critical to commissioning. IP-03 physical/contractual, critical to the opening date."
            ),
            part(
              "Management process",
              "Sets an interface register, interface agreements with owners and dates, regular interface meetings, and escalation of unresolved interface issues.",
              "An interface register owned by the client's interface manager, signed interface agreements with responsibilities and dates, fortnightly interface meetings with all three contractors, and escalation to the project board for anything unresolved in two weeks."
            ),
          ],
        },
      ],
    },

    // Stakeholder Engagement (3)
    {
      slug: "cp-big-room-cbm",
      objective:
        "Using communication tools: PMIS, a central communication platform, Obeya/Big Room practices (and their common pitfalls), and Commitment-based Management (CbM)",
      kind: "build",
      title: "Set up a Big Room and commitment-based planning",
      brief:
        "On a fictional $90M research lab project, designers, the general contractor and eight trade partners work in separate offices. Requests for information take an average of 12 days; trades often arrive to find areas not ready. The owner has agreed to fund a co-located 'Big Room'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe how you set up the Big Room and commitment-based management, and the pitfalls to avoid.",
          parts: [
            part(
              "Big Room setup",
              "Describes co-location of key decision-makers, visual management (schedule, constraints, decisions), a regular cadence and a PMIS/central platform as the single source of truth.",
              "Designers, GC and trade foremen co-located three days a week; walls show the pull-plan, constraint log and decision log; the PMIS holds the official RFIs, drawings and decisions."
            ),
            part(
              "Commitment-based management",
              "Explains CbM: clear requests, reliable promises from the people doing the work, tracking whether commitments are kept (e.g. percent plan complete) and learning from misses.",
              "Each week trades make specific promises ('drywall level 2 east by Thursday') to the person who needs the work, recorded on the board. Track percent plan complete (promises kept / made) and discuss the reasons for misses."
            ),
            part(
              "Pitfalls",
              "Names at least two common pitfalls (Big Room becomes a status-reporting meeting; decision-makers don't attend; information not captured in the PMIS; promises made by people who can't commit).",
              "Pitfalls: it turns into long status meetings instead of solving problems; people without authority attend; decisions made on the wall never reach the PMIS; supervisors promise work their crews can't deliver."
            ),
          ],
        },
      ],
    },
    {
      slug: "cp-stakeholder-buy-in-messaging",
      objective: "Preventing communication issues: building stakeholder buy-in at project outset and crafting audience-tailored messaging",
      kind: "build",
      title: "Tailor messages for a bridge closure",
      brief:
        "A fictional city will close the Harbor Street bridge for 9 months to rebuild it. Stakeholders: 40 local shops worried about lost trade, a hospital whose ambulances use the bridge, commuters, the city council (sponsor), and residents living next to the site who face night work twice a month.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan early buy-in and write the key message for each group.",
          parts: [
            part(
              "Early buy-in",
              "Engages high-impact groups before the closure is finalized (meetings with shop owners and the hospital, a residents' forum), and uses their input in the plan.",
              "Before finalizing, meet the business association and hospital emergency managers, and hold a residents' forum; use their input to set diversion routes, signage and night-work limits."
            ),
            part(
              "Tailored messages",
              "Writes distinct messages addressing each group's concern (shops: access and support; hospital: emergency routes; commuters: diversions and timing; residents: night-work dates and noise limits; council: progress against the plan).",
              "Shops: 'Footpaths and your entrances stay open; free parking on Mill Road and a shop-local campaign.' Hospital: 'Agreed emergency route via Quay Bridge with signal priority, tested before closure.' Commuters: 'Closed 1 March-30 November; use Quay Bridge or the shuttle bus.' Residents: 'Night work two nights a month, dates posted 2 weeks ahead, noise monitored.' Council: monthly progress and complaints report."
            ),
          ],
        },
      ],
    },
    {
      slug: "cp-cultural-stakeholders-case",
      objective: "Managing stakeholders effectively: identifying and assessing stakeholders, and recognizing cultural factors that affect communication",
      kind: "case",
      title: "A multinational team that doesn't speak up",
      brief:
        "You lead a fictional airport terminal project with a design team from one country, a contractor from another, and local subcontractors. Progress meetings are run in English.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "In meetings, the contractor's engineers agree to every date, but the dates are then missed. Local subcontractor foremen rarely speak.",
          ask: "What cultural factors might be at work, and how do you assess them?",
          parts: [
            part(
              "Cultural factors",
              "Identifies possible factors (high power distance -- reluctance to disagree with senior people; 'yes' meaning 'I heard you'; language confidence) without stereotyping, and plans to check them through one-to-one conversations.",
              "Possible: engineers may find it hard to say no to the client in public, 'yes' may mean 'understood' rather than 'committed', and foremen may lack confidence in English. Check through private conversations rather than assuming."
            ),
          ],
        },
        {
          text: "One-to-one, the contractor's engineers say they don't feel able to contradict the client in front of their managers; foremen say documents are hard to follow.",
          ask: "What do you change?",
          parts: [
            part(
              "Changes",
              "Changes how commitments are gathered (privately or in small groups, ask 'what would stop this?'), adds translated or visual materials and interpreters for foremen, and checks understanding by asking people to explain plans back.",
              "Collect date commitments in small working sessions, asking 'what could stop you meeting this?'; provide key documents in the foremen's language with visuals and an interpreter at meetings; ask teams to explain back the plan rather than only agreeing."
            ),
          ],
        },
      ],
    },

    // Strategy and Scope Management (2)
    {
      slug: "cp-change-order-process",
      objective:
        "Building and managing a change-order process: timing it appropriately in the project lifecycle and designing agile processes for rapid change orders",
      kind: "build",
      title: "Design a fast change-order process",
      brief:
        "A fictional fit-out of 12 floors of offices for Larchmont Bank is in construction. Change orders currently take 5 weeks to approve, while crews wait or work at risk. Most changes are small (under $25,000); a few are large (over $250,000). The bank's head of property has authority up to $100,000.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the change-order process.",
          parts: [
            part(
              "Tiered approval",
              "Sets tiers by value with matching authority and target times (e.g. under $25k approved by the owner's project manager within 3 days; $25k-$100k head of property within 1 week; over $100k steering committee).",
              "Under $25k: owner's PM approves within 3 working days. $25k-$100k: head of property within 1 week. Over $100k: steering committee, at a weekly slot."
            ),
            part(
              "Speed mechanisms",
              "Adds mechanisms for speed: pre-agreed unit rates, a not-to-exceed instruction to start urgent work while pricing is finalized, and a weekly change review.",
              "Pre-agreed unit rates for common items; for urgent changes a written instruction to proceed with a not-to-exceed amount, priced within 10 days; a weekly change review meeting."
            ),
            part(
              "Lifecycle timing",
              "Notes that changes are cheapest early (design) and adds a design freeze/user sign-off before each floor's construction to cut late changes; tracks change metrics.",
              "Freeze each floor's layout with the bank's users before construction starts on it; changes after freeze need the head of property's approval. Track count, value and approval time monthly."
            ),
          ],
        },
      ],
    },
    {
      slug: "cp-value-engineering",
      objective:
        "Applying scope-management tools and techniques (value engineering, cost-benefit analysis) to identify and close scope gaps",
      kind: "build",
      title: "Value-engineer a community center over budget",
      brief:
        "A fictional community centre's pre-tender estimate is $8.6M against a budget of $8.0M. The brief's must-haves: a sports hall, 4 meeting rooms, accessible changing places and a 50-year design life. Options identified: (A) switch the hall's curtain wall to brick with windows, saving $350,000; (B) cut meeting rooms from 4 to 3, saving $200,000; (C) change roof from standing-seam metal to single-ply membrane, saving $280,000 but needing replacement after about 25 years at an estimated $400,000; (D) reduce site landscaping, saving $120,000.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Evaluate the options and recommend a package that closes the $600,000 gap.",
          parts: [
            part(
              "Evaluate against function",
              "Rejects B (breaks a must-have) and questions C (saves now but adds a $400,000 replacement within the 50-year life, so whole-life value is poor); accepts A and D as keeping required function.",
              "B removes a must-have room -- reject. C saves $280,000 now but needs a $400,000 replacement within the 50-year design life, so it costs more over the building's life -- reject or treat as last resort. A and D keep all required functions."
            ),
            part(
              "Package",
              "A + D = $470,000, leaving $130,000; proposes how to close the rest (further VE, contingency review, or owner decision) and documents the trade-off.",
              "A + D save $350,000 + $120,000 = $470,000, leaving $130,000. Close it with further VE on finishes or services, or ask the owner to accept $8.13M or C with its whole-life cost explained."
            ),
          ],
        },
      ],
    },

    // Project Governance (1)
    {
      slug: "cp-governance-model",
      objective: "Implementing governance models that drive project outcomes on built-environment projects",
      kind: "build",
      title: "Set up governance for a public-private hospital project",
      brief:
        "A fictional regional health authority is delivering a $400M hospital with a construction joint venture. Problems on its last project: decisions sat for weeks because nobody knew who could approve them, the design team reported to the contractor rather than the client, and the board only heard about a 6-month delay when it was already certain.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Define the governance structure and practices.",
          parts: [
            part(
              "Structure and decision rights",
              "Sets a sponsor and project board, an owner's project director with defined authority, a joint client-contractor leadership team, and a delegation-of-authority matrix for decisions by value and type.",
              "Sponsor (authority CEO) and project board monthly; owner's project director approves up to $2M; joint leadership team (client and JV directors) weekly; a delegation matrix says who approves design changes, variations and claims at each value."
            ),
            part(
              "Reporting and assurance",
              "Requires leading indicators (forecast completion, float consumed, risk trends) reported monthly with thresholds that trigger board escalation, plus independent assurance reviews at key stages.",
              "Monthly report with forecast completion date, float used and top risks; any forecast slip over 4 weeks goes to the board immediately; independent gateway reviews at design completion and before commissioning."
            ),
          ],
        },
      ],
    },
  ],
};
