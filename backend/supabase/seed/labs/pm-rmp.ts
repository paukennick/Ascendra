import { GENERAL_SAFETY, part, type SeedLabSet, numericPart, orderPart } from "./types";
import { source } from "../sources";

// REQ-150: PMI-RMP (PMI Risk Management Professional; ECO "updated January
// 2023", served by PMI as risk-management-exam-outline_updated-2024.pdf --
// the current outline when checked on 2026-11-07).
//
// Aligned to the ECO's five domains (Risk Strategy and Planning 22%, Risk
// Identification 23%, Risk Analysis 23%, Risk Response 13%, Monitor and
// Close Risks 19%) and the enablers an RMP item asks a candidate to apply:
// write a risk management strategy and plan (scales, thresholds, RBS,
// RACI), run identification exercises and assumption analysis, validate a
// register, score and prioritise qualitatively, compute expected monetary
// value through a decision tree, test a response's cost-effectiveness,
// implement a contingency plan and handle secondary and residual risk,
// reconcile the contingency reserve against open exposure, and report the
// overall risk level from Monte Carlo results.
//   https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/risk-management-exam-outline_updated-2024.pdf
// Density ("hybrid"): 2 / 3 / 2 / 2 / 2. Every number in a rubric is
// worked in its model answer (EMV = probability x impact; costs as
// positive, opportunities as negative cost).

export const PMIRMP_LABS: SeedLabSet = {
  trackCode: "PMIRMP",
  sources: [source("https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/risk-management-exam-outline_updated-2024.pdf", "exam_outline", "2026-11-07")],
  labs: [
    {
      slug: "rmp-risk-strategy-scales-thresholds",
      objective: "Establishing a risk management strategy: processes, templates, metrics, and risk categories",
      kind: "build",
      title: "Set the scales, thresholds and categories",
      brief:
        "Ironbridge Water is starting a $2,000,000, 18-month project to replace the telemetry at 60 pumping stations. The sponsor has said she wants to hear about any risk that could cost more than 6% of the budget or delay commissioning by more than a month; the regulator will fine the company if telemetry outages exceed 24 hours. There is no corporate risk template.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the core of the risk management strategy.",
          parts: [
            part(
              "Probability and impact scales",
              "Defines a probability scale and an impact scale (for example 1-5) with concrete definitions tied to this project (cost as % or $ of the $2M budget, schedule in weeks, and a regulatory/outage dimension), so two people would score a risk the same way.",
              "Probability 1-5: <10%, 10-30%, 31-50%, 51-70%, >70%. Impact 1-5 on cost: <1% (<$20k), 1-3% ($20-60k), 3-6% ($60-120k), 6-10% ($120-200k), >10% (>$200k); on schedule: <1 wk, 1-2 wks, 2-4 wks, 1-2 months, >2 months; regulatory: 5 if an outage could exceed 24 hours. The highest dimension sets the impact score."
            ),
            part(
              "Scoring and thresholds",
              "Defines a score (for example P x I) and thresholds that link to the sponsor's stated tolerance (more than 6% cost or one month delay -> escalate), with who acts at each level.",
              "Score = P x I (1-25). 15-25 or any impact of 4-5 (>6% cost, >1 month, or the outage limit): report to the sponsor within 2 days. 8-14: managed by the project manager and reviewed fortnightly. 1-7: watch list, reviewed monthly."
            ),
            part(
              "Risk categories",
              "Gives a set of categories suited to the project (for example a risk breakdown structure with technical, external, organisational and project-management branches with relevant sub-categories such as suppliers, regulation, site access).",
              "RBS level 1: Technical (telemetry hardware, communications network, integration with SCADA); External (suppliers, regulator, weather, site access); Organisational (operations staff availability, funding); Project management (estimates, planning, communication)."
            ),
            part(
              "Process and metrics",
              "States the risk process cadence (identification, analysis, response planning, monitoring at defined intervals) and at least one metric to judge whether risk management is working (for example number of high risks open, % of responses on time, reserve used vs remaining exposure).",
              "Identify at kickoff and at every stage gate; review the register fortnightly at the project meeting; monthly report to the sponsor. Metrics: open high risks, % of response actions completed on time, and contingency reserve used against remaining risk exposure."
            ),
          ],
        },
      ],
    },
    {
      slug: "rmp-risk-management-plan-rbs-raci",
      objective:
        "Documenting a risk management plan: roles/responsibilities (RACI), a risk breakdown structure (RBS), and a risk communication plan",
      kind: "build",
      title: "Document the roles and communication in the risk plan",
      brief:
        "Kingfisher Airports is upgrading its baggage-handling software over 12 months. People involved: the sponsor (operations director), the project manager, a risk analyst, the IT supplier's delivery lead, the airport safety manager, and the airline operators' committee, which must be told about anything that could disrupt flights. Risks will be identified in workshops, entered in a register, and reviewed monthly by a risk review board.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the roles, structure and communication sections of the risk management plan.",
          parts: [
            part(
              "RACI",
              "Builds a RACI for at least three risk activities (for example identify, analyse, plan responses, approve reserve use, monitor) with exactly one Accountable per activity and sensible R/C/I assignments for the named roles.",
              "Identify risks: R project manager, risk analyst, supplier lead; A project manager; C safety manager; I sponsor. Quantitative analysis: R risk analyst; A project manager; C supplier lead. Approve contingency reserve use: R project manager; A sponsor; C risk review board. Report to airlines: R project manager; A sponsor; I airline operators' committee."
            ),
            part(
              "Risk breakdown structure",
              "Gives an RBS with at least three level-1 categories and two level-2 sub-categories under one of them, relevant to the project (for example Technical > software integration, data migration; External > airlines, regulator).",
              "1 Technical: 1.1 software defects, 1.2 integration with conveyors and scanners, 1.3 data migration. 2 External: 2.1 airline schedules and peak season, 2.2 regulator and safety approvals, 2.3 supplier performance. 3 Organisational: 3.1 staff training, 3.2 operations availability for cutover. 4 Project management: 4.1 estimating, 4.2 planning."
            ),
            part(
              "Risk communication plan",
              "Specifies for at least two audiences what risk information they get, how and how often (for example monthly board review of top risks and reserve; airline committee notified of flight-disrupting risks within an agreed time), including escalation.",
              "Risk review board: monthly, top-10 risks, trend and reserve status. Sponsor: monthly summary, plus within 48 hours for any risk scoring high. Airline operators' committee: briefed at its monthly meeting and notified within 24 hours of any risk that could disrupt flights. Team: register open to all, reviewed at weekly meetings."
            ),
          ],
        },
      ],
    },
    {
      slug: "rmp-identification-workshop-case",
      objective: "Conducting risk identification exercises: interviews, focus groups, SME input, and document/telemetry analysis",
      kind: "case",
      title: "Run risk identification for a hospital move",
      brief:
        "You are the risk lead for Ravensmoor Health Trust's project to move its pathology laboratory into a new building over a single weekend in nine months. The lab processes about 3,000 samples a day.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The project manager asks you to plan the first round of risk identification.",
          ask: "Which techniques do you use, with whom?",
          parts: [
            part(
              "Techniques and participants",
              "Chooses at least two complementary techniques matched to sources (for example SME interviews with lab managers and IT, a facilitated workshop or focus group with lab staff, document analysis of past moves/lessons learned and equipment manuals, checklists or a prompt list from the RBS).",
              "Interview the lab manager, biomedical engineering and IT one-to-one (they hold specialist knowledge); run a facilitated workshop with senior scientists and logistics using an RBS prompt list; and analyse lessons learned from the trust's last department move and the analysers' relocation manuals."
            ),
            part(
              "Well-formed risk statements",
              "Writes at least two risks in cause-event-effect form, specific to the scenario (for example analyser recalibration, IT links, sample transport).",
              "Because the analysers must be recalibrated after moving, revalidation may take longer than the weekend, causing a backlog of urgent samples on Monday. Because the new building's network link to the hospital system is new, results may not transmit, delaying clinicians' access to results."
            ),
          ],
        },
        {
          text: "Data from the analysers' service logs (telemetry) shows that two of the six main analysers had unplanned faults after their last service visits, each taking 2-3 days to fix. Lab staff in the focus group also mention that the new building's lifts have not yet been load-tested.",
          ask: "How do these findings change the risk list?",
          parts: [
            part(
              "New and updated risks",
              "Adds risks from the new data (analyser faults after being moved/serviced; lifts not certified for heavy equipment) in proper form and notes they came from telemetry/document analysis and the focus group.",
              "New: because two analysers had faults after past service visits, the move may trigger faults taking 2-3 days to fix, leaving the lab short of capacity. New: because the lifts are not yet load-tested, heavy analysers may not be movable on the weekend, delaying the move. Sources: service-log analysis and the focus group."
            ),
            part(
              "Next step",
              "Validates the new risks with the relevant SMEs/owners and enters them in the register with an owner for analysis, rather than jumping straight to a response.",
              "Confirm both with the biomedical engineering lead and the estates manager, assign owners, and add them to the register ready for qualitative analysis at the next review."
            ),
          ],
        },
      ],
    },
    {
      slug: "rmp-assumption-constraint-analysis",
      objective:
        "Examining assumption and constraint analyses, and recognizing cascading effects between assumptions/constraints and project objectives",
      kind: "build",
      title: "Turn shaky assumptions into risks",
      brief:
        "Copperfield Retail is opening an online store in a new country in six months. The assumption log says: (A1) the payment provider will be certified in the new country by month 3; (A2) the existing warehouse can handle 30% more orders; (A3) product descriptions can be machine-translated. Constraints: (C1) launch must be before the national shopping festival in month 6; (C2) the budget is fixed at $900,000. Recent facts: the payment provider's certification in a neighbouring country took 7 months; warehouse picking is already at 95% capacity at peak.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Analyse the assumptions and constraints.",
          parts: [
            part(
              "Assumption validity",
              "Tests each assumption for how likely it is to be false and how much it would matter, identifying A1 and A2 as weak given the facts (7-month certification elsewhere; 95% capacity) and A3 as needing a check (quality/legal labelling).",
              "A1: weak -- certification took 7 months next door, so month 3 is doubtful; high impact on launch. A2: weak -- picking is at 95% at peak, so 30% more volume won't fit; high impact. A3: plausible but unverified -- product safety text may need professional translation; medium impact."
            ),
            part(
              "Risks from assumptions",
              "Converts at least the two weak assumptions into risk statements in cause-event-effect form and adds them to the register.",
              "Because the payment provider may not be certified by month 3, payments may not be live for launch, delaying go-live past the festival. Because the warehouse is near capacity, peak orders may exceed picking capacity, causing late deliveries and lost sales."
            ),
            part(
              "Cascading effects",
              "Traces how one failed assumption cascades through the constraints to objectives (for example A1 false -> launch misses month 6 constraint C1 -> lost festival revenue; workarounds like a second payment provider strain C2 budget).",
              "If A1 fails, launch slips past the festival (C1), the main revenue objective is missed, and adding a second payment provider to recover would cost money from the fixed $900,000 (C2), squeezing other work. A2 failing would push up costs (temporary warehouse staff) against the same fixed budget."
            ),
            part(
              "Actions",
              "Proposes actions to validate or protect against the weak assumptions (for example confirm the certification timeline with the provider now, assess a backup provider, run a warehouse capacity study/3PL option) with owners.",
              "Payments lead: get a written certification plan from the provider within two weeks and price a backup provider. Operations lead: run a peak-capacity study and get a quote from a third-party logistics firm. Content lead: check which descriptions legally need human translation."
            ),
          ],
        },
      ],
    },
    {
      slug: "rmp-validate-risk-register",
      objective:
        "Developing a risk register: validating identified risks, assessing probability/impact/urgency, and classifying threats vs. opportunities",
      kind: "build",
      title: "Clean up a draft risk register",
      brief:
        "A junior analyst at Thornbury Engineering drafted five register entries for a factory-automation project: (1) \"The robot supplier delivered the wrong grippers last week.\" (2) \"Risk: budget.\" (3) \"Because the new conveyor vendor is offering a launch discount until March, we may be able to buy the spare conveyor 20% cheaper, reducing cost.\" (4) \"Because the union has not yet been consulted on the new shift pattern, it may object, delaying commissioning by up to six weeks.\" (5) \"Inexperienced team.\"",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Validate and fix the entries.",
          parts: [
            part(
              "Not risks",
              "Identifies entry 1 as an issue (it has already happened) to move to the issue log, and entries 2 and 5 as too vague (a category or a cause, not a risk event) that need rewriting.",
              "(1) is an issue, not a risk -- it has happened, so it goes to the issue log with an owner. (2) is a category, not a risk. (5) is a cause or condition, not an uncertain event with an effect."
            ),
            part(
              "Rewritten entries",
              "Rewrites 2 and 5 as specific cause-event-effect risks plausible for the scenario.",
              "(5) Because most of the team has not commissioned this robot model before, programming may take longer than estimated, delaying the line start by two to three weeks. (2) Because the steel price is volatile, the frame costs may rise above the estimate, overrunning the budget by up to 5%."
            ),
            part(
              "Threat or opportunity",
              "Classifies entry 3 as an opportunity (positive risk) and 4 as a threat, and names an opportunity response for 3 (exploit, enhance or share) and a threat response for 4.",
              "(3) Opportunity: enhance or exploit it by placing the spare-conveyor order before March. (4) Threat: mitigate by consulting the union now on the shift pattern."
            ),
            part(
              "Urgency",
              "Assesses urgency (how soon a response is needed) for at least entries 3 and 4, noting both need action soon (March deadline; consultation lead time before commissioning), and says urgency affects priority alongside P x I.",
              "Both are urgent: the discount ends in March, and union consultation needs weeks before commissioning. Urgency raises their priority even if their P x I scores match lower-urgency risks."
            ),
          ],
        },
      ],
    },
    {
      slug: "rmp-qualitative-matrix-prioritise",
      objective: "Performing qualitative analysis: classifying risks in an RBS, applying risk matrices, and prioritizing by impact/urgency",
      kind: "build",
      title: "Score and prioritise risks on a matrix",
      brief:
        "Marlow Stadium's roof-replacement project uses 1-5 scales and Score = P x I, with High = 15-25, Medium = 8-14, Low = 1-7. Risks: R1 crane hire unavailable in the summer window (P 3, I 5; trigger point in 4 months); R2 minor rework of steel connections (P 4, I 2); R3 asbestos found in the old roof (P 2, I 4); R4 the local planning authority adds noise-hour restrictions (P 5, I 3; decision due in 2 weeks); R5 a total structural failure during lifting (P 1, I 5).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Score, categorise and prioritise the risks.",
          parts: [
            part(
              "Scores and bands",
              "Calculates R1 = 15 (High), R2 = 8 (Medium), R3 = 8 (Medium), R4 = 15 (High), R5 = 5 (Low).",
              "R1 3 x 5 = 15 High; R2 4 x 2 = 8 Medium; R3 2 x 4 = 8 Medium; R4 5 x 3 = 15 High; R5 1 x 5 = 5 Low."
            ),
            part(
              "RBS categories",
              "Places each risk in a sensible RBS category (for example R1 external/supplier or resources; R2 technical/quality; R3 technical/site conditions; R4 external/regulatory; R5 technical/safety).",
              "R1 External > suppliers; R2 Technical > quality and design; R3 Technical > site conditions; R4 External > regulatory; R5 Technical > structural and safety."
            ),
            orderPart("Priority order", "Highest priority first: R4, R1, R3, R2, R5. R4 before R1 (same score of 15, but the planning decision is due in 2 weeks); R3 before R2 (same score of 8, higher impact). One risk out of place is partly there.", "1 R4 (High, decision in 2 weeks); 2 R1 (High, 4 months to trigger); 3 R3 (Medium, higher impact than R2); 4 R2 (Medium); 5 R5 (Low score, but catastrophic impact -- it stays on the register under the lifting plan's safety controls, not ignored).", ["R4 noise-hour restrictions", "R1 crane hire unavailable", "R3 asbestos in the old roof", "R2 rework of steel connections", "R5 structural failure during lifting"]),
            part(
              "Limits of the matrix",
              "Notes a limitation of P x I scoring (ordinal scales, equal scores hiding different profiles, low-probability/high-impact risks) and what to do (urgency, quantitative analysis for the top risks), including that R5's low score does not mean it can be dropped (catastrophic impact).",
              "Equal scores can hide very different risks (R2 and R3 both score 8), and ordinal scales can't be multiplied precisely. Use urgency and impact as tie-breakers, and quantify the top risks (EMV or schedule simulation) before committing reserve. R5 scores low but its impact is catastrophic, so it stays on the register under safety controls."
            ),
          ],
        },
      ],
    },
    {
      slug: "rmp-decision-tree-emv",
      objective: "Performing quantitative analysis: sensitivity analysis (Monte Carlo, decision trees, expected monetary value) and risk weighting",
      kind: "build",
      title: "Choose between build and buy with a decision tree",
      brief:
        "Elmstead Bank must choose how to deliver a fraud-scoring module. Option A, build in-house: $400,000, with a 30% chance of a $150,000 overrun (otherwise no overrun). Option B, buy a vendor product: $450,000, with a 10% chance of an $80,000 integration problem, and a 20% chance of a $50,000 vendor rebate if the bank becomes a reference customer. The events within each option are independent.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Analyse the decision.",
          parts: [
            numericPart("Expected cost of A", "Expected cost of A = 400,000 + 0.3 x 150,000 = $445,000. Met within $1.", "Expected cost of A = 400,000 + (0.3 x 150,000) = 400,000 + 45,000 = $445,000.", { answer: 445000, tolerance: 1, unit: "USD" }),
            numericPart("Expected cost of B", "Expected cost of B = 450,000 + 0.1 x 80,000 - 0.2 x 50,000 = $448,000, the rebate being an opportunity that reduces cost. Met within $1.", "Expected cost of B = 450,000 + (0.1 x 80,000) - (0.2 x 50,000) = 450,000 + 8,000 - 10,000 = $448,000.", { answer: 448000, tolerance: 1, unit: "USD" }),
            part(
              "Decision and risk attitude",
              "States that A has the lower expected cost by $3,000, but compares worst cases (A $550,000; B $530,000) and notes that a risk-averse organisation might still choose B; the difference is small relative to the uncertainty.",
              "On EMV, choose A: $445,000 against $448,000, $3,000 less. But A's worst case is 400,000 + 150,000 = $550,000 and B's is 450,000 + 80,000 = $530,000, so a risk-averse bank could reasonably choose B. The gap is small enough that the bank's risk appetite should decide."
            ),
            part(
              "Sensitivity",
              "Finds the break-even overrun probability for A: 400,000 + p x 150,000 = 448,000, so p = 0.32; above 32% option B becomes cheaper on expected value.",
              "Break-even: 400,000 + 150,000p = 448,000, so p = 48,000 / 150,000 = 0.32. If the chance of overrun on A is above 32% rather than 30%, B is the cheaper option -- the decision is sensitive to that estimate, so it's worth validating."
            ),
          ],
        },
      ],
    },
    {
      slug: "rmp-response-cost-effectiveness",
      objective:
        "Planning risk response: choosing a strategy (avoid/accept/mitigate/enhance/contingency) and assigning time-bound actions with owners",
      kind: "build",
      title: "Plan cost-effective responses for a threat and an opportunity",
      brief:
        "Halewood Rail is resignalling a branch line. Threat T1: the signalling software fails safety assessment first time, probability 0.4, impact $250,000 of rework and delay. A pre-assessment review by an independent assessor costs $30,000 and would cut the probability to 0.1. Opportunity O1: a track possession booked by another project could be shared, probability 0.3, saving $120,000. Assigning a coordinator to negotiate early costs $10,000 and would raise the probability to 0.5.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan the responses.",
          parts: [
            part(
              "Threat response worth it?",
              "Calculates T1's EMV before (0.4 x 250,000 = $100,000) and after (0.1 x 250,000 = $25,000), adds the response cost (25,000 + 30,000 = $55,000), and concludes mitigation saves $45,000 in expected terms.",
              "Before: 0.4 x 250,000 = $100,000 expected. After mitigation: 0.1 x 250,000 = $25,000, plus the $30,000 review = $55,000. Mitigation saves 100,000 - 55,000 = $45,000 expected, so do it."
            ),
            part(
              "Opportunity response worth it?",
              "Calculates O1's EMV before (0.3 x 120,000 = $36,000) and after enhancing (0.5 x 120,000 = $60,000 - $10,000 = $50,000 net), concluding enhance adds $14,000 expected value.",
              "Before: 0.3 x 120,000 = $36,000. Enhanced: 0.5 x 120,000 = $60,000, less the $10,000 coordinator = $50,000 net. That is $14,000 better, so enhance."
            ),
            part(
              "Strategies, owners and dates",
              "Names the strategies (mitigate for T1, enhance for O1) and gives each action an owner and a due date, plus a trigger or contingency for the residual threat.",
              "T1 mitigate: commission the independent pre-assessment; owner signalling design manager; complete by end of month 3. O1 enhance: appoint a coordinator to agree the shared possession; owner planning lead; agreement by week 6. Residual T1 (0.1): contingency of one extra assessment cycle, triggered if the pre-assessment raises more than five major findings."
            ),
          ],
        },
      ],
    },
    {
      slug: "rmp-implement-response-secondary-case",
      objective:
        "Implementing risk response: executing response and contingency plans, and evaluating secondary/residual risks that result",
      kind: "case",
      title: "Execute a contingency plan and handle what follows",
      brief:
        "Southgate Events is building temporary stands for an outdoor festival in eight weeks. The register lists the threat that heavy rain softens the ground so the cranes can't operate. Contingency plan: lay temporary ground-protection mats (cost $40,000 from the contingency reserve), triggered if more than 50 mm of rain falls in any week of the build.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "In week 2 of the build, 70 mm of rain falls and the crane operator reports the ground is too soft.",
          ask: "What do you do?",
          parts: [
            part(
              "Execute the plan",
              "Recognises the trigger has been met and executes the agreed contingency plan (order and lay the mats, draw $40,000 from the contingency reserve) without re-debating the response; logs the realised risk as an issue.",
              "The trigger (more than 50 mm in a week) is met, so execute the contingency plan: order the mats, release $40,000 from the contingency reserve as approved, and log it in the issue log with an owner; update the risk register to show the risk occurred."
            ),
            part(
              "Communicate",
              "Informs the stakeholders named in the risk plan (sponsor, crane contractor, site team) of the trigger, the action and its cost.",
              "Tell the sponsor, the crane contractor and the site team that the contingency plan is active, the cost drawn from reserve, and the expected effect on the schedule."
            ),
          ],
        },
        {
          text: "The mats work, but the delivery lorries now have to use a single access road while the mats are laid, and the local council warns that blocking it at rush hour breaks the event's traffic permit. After the mats, there is still some chance that very heavy rain (over 100 mm in a week) would exceed what the mats can support.",
          ask: "Evaluate what the response has created and left behind.",
          parts: [
            part(
              "Secondary risk",
              "Identifies the traffic-permit breach as a secondary risk (arising from implementing the response), analyses it and plans a response (for example schedule deliveries outside rush hour, agree a plan with the council), with an owner.",
              "Secondary risk: because deliveries now use one access road, rush-hour blocking may breach the traffic permit, risking fines or a stop order. Response: schedule deliveries outside 07:00-09:00 and 16:00-18:00 and agree a traffic plan with the council. Owner: logistics manager."
            ),
            part(
              "Residual risk",
              "Identifies the remaining chance of over-100 mm rain as residual risk, documents it, and decides how to handle it (accept with monitoring and a fallback, or further response).",
              "Residual risk: rain over 100 mm in a week could exceed the mats' capacity. Record it, accept it with daily weather monitoring, and agree a fallback: pause crane lifts and use the schedule float until the ground recovers."
            ),
          ],
        },
      ],
    },
    {
      slug: "rmp-reserve-variance-analysis",
      objective:
        "Gathering and analyzing performance data: reconciling reports against risk-relevant work packages and running variance analysis",
      kind: "build",
      title: "Reconcile the contingency reserve",
      brief:
        "Seacrest Hospital's IT migration has a contingency reserve of $180,000. Two risks have occurred: data-cleansing overrun ($55,000 drawn) and extra licence costs ($40,000 drawn). Four risks remain open with these expected monetary values: network upgrade delay $40,000; interface rework $25,000; staff backfill $18,000; vendor penalty clause $12,000. A risk with an EMV of $30,000 (\"old system cannot export archive data\") passed its last trigger date unrealised last week but is still in the register.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Reconcile the reserve and report.",
          parts: [
            numericPart("Reserve remaining", "Drawn 55,000 + 40,000 = $95,000, so 180,000 - 95,000 = $85,000 remains. Met within $1.", "Drawn: 55,000 + 40,000 = $95,000. Remaining: 180,000 - 95,000 = $85,000.", { answer: 85000, tolerance: 1, unit: "USD" }),
            numericPart("Shortfall against open exposure", "Open exposure, without the expired risk, is 40,000 + 25,000 + 18,000 + 12,000 = $95,000, so the reserve is $10,000 short (95,000 - 85,000). Met within $1.", "Open exposure: 40,000 + 25,000 + 18,000 + 12,000 = $95,000. Against $85,000 remaining, the reserve is $10,000 short.", { answer: 10000, tolerance: 1, unit: "USD" }),
            part(
              "Expired risk",
              "Closes the expired $30,000 risk (its trigger date passed) and explains that leaving it open would overstate exposure (it would show $125,000 against $85,000).",
              "Close the archive-export risk: its window has passed. Left open it would make exposure $125,000 against $85,000 remaining and overstate the shortfall."
            ),
            part(
              "Action",
              "Recommends a response to the $10,000 gap (for example re-examine responses to cut the larger EMVs, accept the gap with the sponsor's agreement, or request additional reserve through change control) and reports it to the sponsor.",
              "Report the $10,000 gap to the sponsor with options: strengthen the response to the network-upgrade risk (the largest EMV) to cut its exposure, or request a $10,000 reserve increase through change control; recommend the first, since it addresses the cause."
            ),
          ],
        },
      ],
    },
    {
      slug: "rmp-overall-risk-monte-carlo-case",
      objective: "Monitoring overall project risk level and communicating it to stakeholders through tailored reporting",
      kind: "case",
      title: "Report overall schedule risk from simulation results",
      brief:
        "Fernhill University is building a new student-records system. The deterministic schedule (no risk allowance) finishes on 30 June. The sponsor needs a go-live date she can promise the university council with at least 80% confidence.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "A Monte Carlo simulation of the risk-loaded schedule gives: probability of finishing by 30 June 12%; P50 14 July; P80 4 August; P95 25 August. The top schedule driver is data migration testing.",
          ask: "What do you tell the sponsor?",
          parts: [
            part(
              "Interpretation",
              "Explains that 30 June has only a 12% chance, that 4 August is the date with 80% confidence (P80), and the schedule contingency needed is 35 days (30 June to 4 August).",
              "30 June has only a 12% chance of being met. The P80 date is 4 August, so to promise a date with 80% confidence she needs 35 days of schedule contingency beyond 30 June (31 days to 31 July plus 4)."
            ),
            part(
              "Tailored message",
              "Gives a short, decision-focused message for the sponsor and council (recommend 4 August or later, explain the main driver, and what could improve it) rather than raw simulation detail.",
              "\"Promise 4 August, not 30 June. We have an 80% chance of meeting 4 August and only 12% of meeting 30 June. The biggest driver is data-migration testing; we're working on responses that could bring the date earlier, and we'll update you monthly.\""
            ),
          ],
        },
        {
          text: "One month later, after a second migration test environment was added, the simulation is rerun: P50 8 July, P80 25 July. Two new risks about vendor staffing appeared in the register this month.",
          ask: "How has the overall risk level changed, and how do you communicate it?",
          parts: [
            part(
              "Trend",
              "States that overall schedule risk has reduced (P80 moved from 4 August to 25 July, 10 days earlier; P50 from 14 July to 8 July), attributes it to the response, and notes the new vendor-staffing risks must be included in the next run.",
              "Overall risk is lower: P80 moved 10 days earlier, from 4 August to 25 July, and P50 from 14 July to 8 July, because the extra test environment reduced the migration driver. The new vendor-staffing risks need adding to the model before next month's run."
            ),
            part(
              "Communication",
              "Recommends keeping the promised date unchanged for now (or adopting the new P80 only after the new risks are modelled) and shows the trend to stakeholders, for example as a chart of P50/P80 over time.",
              "Keep the 4 August commitment for now and report the improving trend with a simple chart of P50 and P80 by month. Once the vendor risks are modelled, the sponsor can decide whether to bring the date forward."
            ),
          ],
        },
      ],
    },
  ],
};
