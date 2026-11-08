import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-150: PMI-ACP (PMI Agile Certified Practitioner; ECO dated November
// 2024 on its cover, "March 2026" in its running headers -- the current
// outline when checked on 2026-11-07).
//
// Aligned to the ECO's four domains (Mindset 28%, Leadership 25%, Product
// 19%, Delivery 28%) and the tasks an ACP scenario item asks a candidate to
// perform: classify complexity (Cynefin, Stacey) and fit practices; run an
// early experiment; build transparency with information radiators; find a
// root cause; read a conflict's level; refine and size the backlog; define
// and confirm value; forecast from agile metrics; optimise flow by limiting
// WIP (Little's Law); and map a value stream to find waste.
//   https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/agile-certified-exam-outline.pdf
// Density ("hybrid"): 3 / 2 / 2 / 3. Every number in a rubric is worked in
// its model answer. WSJF follows the SAFe formula (cost of delay = business
// value + time criticality + risk reduction/opportunity enablement, divided
// by job size); the conflict levels are Speed Leas' five levels, both
// standard in agile practice references.

export const PMIACP_LABS: SeedLabSet = {
  trackCode: "PMIACP",
  sources: ["https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/agile-certified-exam-outline.pdf"],
  labs: [
    {
      slug: "acp-cynefin-practice-fit",
      objective:
        "Embracing the agile mindset: applying agile values and principles, classifying a scenario's complexity (Cynefin, the Stacey Matrix, complex adaptive systems), and choosing agile practices to fit",
      kind: "build",
      title: "Classify the work and fit the practices to it",
      brief:
        "Bluefin Insurance's digital team has three pieces of work. (1) Renewing 400 expiring TLS certificates using a runbook the team has followed every year. (2) Moving the claims database to a new server; the steps are known to the database specialists but have many interdependencies to analyse. (3) Building a first-ever chatbot for claims questions; nobody knows which questions customers will ask or how they will react to it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each piece of work and choose how to approach it.",
          parts: [
            part(
              "Cynefin classification",
              "Classifies (1) as clear/simple (obvious), (2) as complicated, and (3) as complex, with the cause-and-effect reasoning for each (known; knowable through analysis/expertise; only clear in hindsight).",
              "(1) Clear: cause and effect are obvious and the runbook is best practice. (2) Complicated: the answer can be found by experts through analysis. (3) Complex: cause and effect are only visible in hindsight; requirements and the technology response are both uncertain."
            ),
            part(
              "Approach for each",
              "Matches an approach: (1) follow the standard procedure (sense-categorise-respond; a checklist or predictive plan is fine); (2) expert analysis and planning (sense-analyse-respond); (3) probe-sense-respond with small safe-to-fail experiments in short iterations.",
              "(1) Follow the runbook with a checklist -- no need for iterations. (2) Have the specialists analyse dependencies and plan the cutover; a plan-based approach suits it. (3) Run short iterations with small experiments (probe, sense, respond): release a narrow chatbot to a few customers and adapt."
            ),
            part(
              "Agile principle",
              "Links the chatbot approach to an agile value or principle (for example responding to change over following a plan, customer collaboration, delivering working software frequently) and explains that agile is not needed everywhere.",
              "Responding to change over following a plan: for the chatbot we learn what customers need only by delivering something and getting feedback. Agile practices pay off where uncertainty is high; the certificate renewal doesn't need them."
            ),
          ],
        },
      ],
    },
    {
      slug: "acp-experiment-early-case",
      objective:
        "Experimenting early: building a thin increment to validate a solution or market need, and creating an environment that rewards learning",
      kind: "case",
      title: "Validate a feature with an early experiment",
      brief:
        "Pinewood Cinemas wants to add \"order snacks to your seat\" to its ticketing app. Building the full feature (kitchen screens, seat delivery, payments) would take the team about four months.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The product owner asks how the team could learn whether customers want the feature before committing four months to it.",
          ask: "Design the experiment.",
          parts: [
            part(
              "Hypothesis and measure",
              "States a falsifiable hypothesis with a measurable success threshold (for example at least 5% of customers who see the option will tap it) set before the test.",
              "Hypothesis: at least 5% of customers who buy tickets in the app will tap \"order snacks to your seat\". We decide the 5% threshold before we start."
            ),
            part(
              "Thin increment",
              "Proposes a minimal increment or test (fake-door button, concierge/manual trial at one cinema, MVP) that can be built in days or weeks, not the full feature.",
              "Add a button to the app at one cinema for two weeks. Tapping it shows \"Coming soon -- want us to tell you?\" (a fake-door test), and on two evenings staff take snack orders by hand to test the service itself."
            ),
          ],
        },
        {
          text: "After two weeks, 2,000 customers saw the button and 64 tapped it. Of those who tapped, 70% asked to be told when it launches. On the hand-run evenings, deliveries took 18 minutes on average and customers complained about missing the start of the film.",
          ask: "Interpret the results and decide what to do next.",
          parts: [
            part(
              "Result against the hypothesis",
              "Calculates the tap rate (64 / 2,000 = 3.2%) and concludes it is below the 5% threshold, so the hypothesis is not supported as stated.",
              "Tap rate = 64 / 2,000 = 3.2%, below our 5% threshold, so the hypothesis is not supported; interest exists among a small group (70% of tappers want updates)."
            ),
            part(
              "Pivot or persevere",
              "Makes a reasoned decision -- pivot (for example pre-order snacks for collection before the film) or run a refined experiment -- based on both the data and the delivery-time finding, rather than building the full feature.",
              "Don't build the four-month feature. Pivot to a cheaper test: pre-order snacks in the app and collect them at a fast-track counter, which also avoids the 18-minute delivery problem. Set a new threshold and run it for two weeks."
            ),
            part(
              "Learning environment",
              "Treats the failed hypothesis as useful learning (shares it openly, no blame) and notes how this is shared with stakeholders.",
              "Share the results at the review as a success of the experiment: we learned cheaply what would have cost four months. Record it so other teams can reuse the finding."
            ),
          ],
        },
      ],
    },
    {
      slug: "acp-information-radiator-transparency",
      objective:
        "Building transparency: making status, risks, and impediments visible to everyone (information radiators), and defining communication strategies for co-located and distributed teams alike",
      kind: "build",
      title: "Design information radiators for a split team",
      brief:
        "Saltmarsh Analytics has an eight-person agile team: five work together in one office and three work remotely in another country, four hours ahead. Remote members say they find out about blocked work and new risks days late. Stakeholders keep emailing the product owner to ask how the release is going. The office has a large physical board that only the office staff can see.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design how status, risks and impediments will be made visible.",
          parts: [
            part(
              "Radiators to use",
              "Names at least two information radiators (for example a digital task/Kanban board, a burnup or burndown chart, an impediment/risk board) and what each shows.",
              "A shared digital Kanban board with WIP limits and a \"blocked\" flag on cards; a release burnup chart showing completed points against total scope; and an impediment and risk board with owner and date for each item."
            ),
            part(
              "Equal access for distributed members",
              "Makes the digital radiator the single source of truth that everyone (co-located and remote) uses, replacing or mirroring the physical board, so no group gets information late.",
              "Retire the physical board (or mirror it) so the digital board is the one source of truth; the office team updates it in real time, so remote members see blocks the moment they are flagged."
            ),
            part(
              "Communication strategy",
              "Sets a cadence that works across the time difference (for example a stand-up in the overlapping hours, async written updates) and a way to raise new blockers immediately.",
              "Daily stand-up at the start of the office day, which is mid-afternoon for the remote members and inside both groups' working hours; a team channel where anyone flags a blocker immediately; written stand-up notes for anyone absent."
            ),
            part(
              "Stakeholder visibility",
              "Gives stakeholders self-service access to the radiators (for example a read-only link to the burnup and board, or a sprint review invite) so they no longer need to ask the product owner.",
              "Share a read-only dashboard link with the burnup and top risks, and invite stakeholders to the sprint review, so they can see progress themselves without emailing the product owner."
            ),
          ],
        },
      ],
    },
    {
      slug: "acp-root-cause-escaped-defects-case",
      objective:
        "Facilitating problem resolution: investigating root cause (e.g., root-cause analysis, Ishikawa diagrams) and choosing the resolution strategy that adds the most value",
      kind: "case",
      title: "Find the root cause of escaped defects",
      brief:
        "Cobalt Rail Tickets' team has had customers report bugs after each of the last three releases. The team lead wants to \"add a week of manual testing before every release\".",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You facilitate a retrospective focused on the escaped defects. Of the 15 escaped defects, 11 involved discount-code rules; the rules live in a spreadsheet that the marketing team edits, and developers copy the rules into code by hand.",
          ask: "How do you run the root-cause analysis?",
          parts: [
            part(
              "Technique",
              "Uses a structured root-cause technique (five whys and/or an Ishikawa/fishbone diagram with categories) with the team, rather than jumping to the team lead's solution.",
              "Draw a fishbone diagram with the team (people, process, tools, information) for \"discount bugs reach customers\", then ask five whys on the biggest branch."
            ),
            part(
              "Likely root cause",
              "Identifies the hand-copying of rules from an uncontrolled spreadsheet (no single source of truth and no automated check against it) as the probable root cause, not just \"not enough testing\".",
              "Why do discount bugs escape? The code doesn't match the rules. Why? Developers copy the spreadsheet by hand. Why? There is no shared, versioned source of rules and no automated test against it. That is the root cause; more manual testing would only catch some symptoms."
            ),
          ],
        },
        {
          text: "The team proposes three fixes: (a) a week of manual testing before each release; (b) marketing and developers write the discount rules together as executable acceptance tests (specification by example); (c) move the rules into a configuration file that marketing edits through a validated form, with automated tests.",
          ask: "Which do you choose, and how will you know it worked?",
          parts: [
            part(
              "Strategy chosen",
              "Chooses the option(s) that remove the root cause and add the most value (b and/or c) over the one that adds delay (a), with a reason.",
              "Start with (b): it fixes the misunderstanding at its source and gives automated tests that run on every build. Then move to (c) as the longer-term fix. (a) delays every release by a week and still relies on people catching mismatches."
            ),
            part(
              "Measure of success",
              "Defines a metric and time frame to check the fix (for example escaped discount defects per release falls to zero or near zero over the next three releases) and reviews it in a later retrospective.",
              "Track escaped discount defects per release; the target is zero over the next three releases. Review it at each retrospective and revisit the root cause if they continue."
            ),
          ],
        },
      ],
    },
    {
      slug: "acp-conflict-level-case",
      objective:
        "Facilitating conflict management: identifying a conflict's root cause and level, and promoting a collaborative resolution approach",
      kind: "case",
      title: "Read the level of a team conflict",
      brief:
        "In a Scrum team at Larkspur Health Apps, the two testers, Femi and Grace, disagree about whether automated UI tests should be written during or after the sprint.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "In refinement, both explain their reasons calmly and suggest trying each approach on one story. Language is specific and about the work.",
          ask: "What level is the conflict, and how do you respond?",
          parts: [
            part(
              "Level",
              "Identifies level 1, a problem to solve (Speed Leas' levels), from the open, fact-based, collaborative language.",
              "Level 1, a problem to solve: they share information openly and focus on the problem, not each other."
            ),
            part(
              "Response",
              "Lets the team resolve it collaboratively (supports their experiment, facilitates lightly) rather than imposing a solution.",
              "Encourage their experiment and let the team own it -- agree on how they will compare the two approaches and review it at the retrospective."
            ),
          ],
        },
        {
          text: "Three sprints later, the experiment was never finished. Femi now says in stand-ups that \"some people\" are slowing the team down, and other team members have started taking sides. Grace has stopped speaking in refinement.",
          ask: "What level is it now, and what do you do?",
          parts: [
            part(
              "New level",
              "Identifies an escalation to level 3, a contest (taking sides, personal attacks, distorted language, win/lose framing), possibly heading toward level 4.",
              "It has escalated to level 3, a contest: people are taking sides, the language is personal (\"some people\") and it is about winning rather than solving."
            ),
            part(
              "Intervention",
              "Intervenes more actively: talks with each person privately, then facilitates a joint conversation that separates people from the problem, re-establishes working agreements, and returns to objective criteria; safeguards psychological safety for Grace.",
              "Meet Femi and Grace one-to-one to hear each side, then facilitate a conversation between them focused on interests and facts. Revisit the team's working agreement on respectful language, make it safe for Grace to speak, and agree how to decide (finish the experiment with measures, and accept the result)."
            ),
          ],
        },
      ],
    },
    {
      slug: "acp-backlog-refinement-wsjf",
      objective:
        "Refining the product backlog: clarifying and prioritizing items with customers/stakeholders, decomposing large items, and sizing work collectively",
      kind: "build",
      title: "Split, size and order the backlog",
      brief:
        "Heronsgate Garden Centres' online-shop team is refining its backlog. One epic reads: \"As a customer I want a complete loyalty programme.\" Four other items are ready to order, scored on a modified Fibonacci scale: (A) gift cards -- business value 8, time criticality 5, risk reduction/opportunity enablement 3, job size 8; (B) click-and-collect slots for the spring rush -- 5, 8, 2, size 3; (C) a new product search -- 13, 3, 5, size 13; (D) payment provider upgrade before the old API is switched off -- 3, 2, 8, size 5.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Decompose the epic and order the four items.",
          parts: [
            part(
              "Split the epic",
              "Splits the loyalty epic into at least three smaller, valuable user stories (vertical slices, each independently testable -- INVEST), not technical layers.",
              "1) As a customer I can join the loyalty scheme at checkout. 2) As a member I earn 1 point per pound spent and see my balance. 3) As a member I can redeem 500 points for a 5-pound voucher. Each is a thin slice a customer can use."
            ),
            part(
              "WSJF calculation",
              "Calculates cost of delay (BV + TC + RR/OE) and WSJF (CoD / job size): A 16/8 = 2.0; B 15/3 = 5.0; C 21/13 = 1.6; D 13/5 = 2.6, and orders B, D, A, C.",
              "Cost of delay: A 8 + 5 + 3 = 16; B 5 + 8 + 2 = 15; C 13 + 3 + 5 = 21; D 3 + 2 + 8 = 13. WSJF = CoD / size: A 16/8 = 2.0; B 15/3 = 5.0; C 21/13 = 1.6; D 13/5 = 2.6. Order: B, D, A, C."
            ),
            part(
              "Interpretation",
              "Explains why C ranks last despite the highest value (large job size), and that the product owner may adjust the order with stakeholders (for example D's hard deadline) after the calculation.",
              "C has the highest cost of delay but is the biggest job, so smaller items deliver value sooner. D's external deadline is real, so the product owner confirms with stakeholders that the order still meets it -- WSJF informs the decision rather than making it."
            ),
            part(
              "Sizing collectively",
              "Describes the whole team sizing items together with a relative technique (for example planning poker with discussion of outliers), not one person estimating.",
              "The developers size together with planning poker: everyone reveals at once, the highest and lowest explain their reasoning, and they re-vote until they converge."
            ),
          ],
        },
      ],
    },
    {
      slug: "acp-define-confirm-value",
      objective:
        "Managing value delivery: defining what value looks like (success criteria, sustainability, security, compliance) and confirming targeted results were actually achieved",
      kind: "build",
      title: "Define value and check whether it was delivered",
      brief:
        "Wrenfield Housing Association released online repair requests three months ago. The goal was to reduce phone calls to the repairs line and get repairs booked faster. Before the release, the repairs line took 6,000 calls a month and the average time from report to booked appointment was 5 days. Last month: 4,200 calls and 4 days. Tenants' personal data is involved, and the association must meet its data-protection obligations.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Define what value means for this product and evaluate the results.",
          parts: [
            part(
              "Success criteria",
              "Defines measurable success criteria that include business outcomes (for example call volume and time to booking with targets) and at least one non-functional dimension the ECO names (security/privacy, compliance or sustainability).",
              "Outcomes: calls to the repairs line down 40% within three months; time to booked appointment 2 days or less; tenant satisfaction with reporting at least 4 out of 5. Non-functional: no personal-data incidents, and the data-protection impact assessment approved before launch."
            ),
            part(
              "Results calculated",
              "Calculates the call reduction ((6,000 - 4,200) / 6,000 = 30%) and the booking-time change (5 to 4 days, a 20% improvement), and compares them with the stated targets.",
              "Calls fell from 6,000 to 4,200: (6,000 - 4,200) / 6,000 = 30%, short of the 40% target. Time to booking fell from 5 to 4 days (20% faster), short of the 2-day target."
            ),
            part(
              "What to do next",
              "Treats value as not yet fully achieved and proposes evidence-driven next steps (find out why tenants still call, prioritise backlog items that move the outcome metric), rather than declaring success because features shipped.",
              "Features shipped but the targeted outcomes are only partly achieved. Analyse why people still phone (for example, can't upload photos or don't get a booking confirmation), add the items that address it to the top of the backlog, and re-measure next month."
            ),
          ],
        },
      ],
    },
    {
      slug: "acp-metrics-burnup-forecast",
      objective:
        "Managing agile metrics: choosing metrics appropriate to the audience, radiating them visibly, and using the insights to drive decisions",
      kind: "build",
      title: "Forecast the release from a burnup",
      brief:
        "Tamarind Payroll's team is building a self-service payslip portal. The release backlog is 210 points; 84 are done. Velocity over the last four sprints: 18, 22, 20 and 24 points (two-week sprints). In each of the last two sprints the product owner added about 10 points of new scope. The sponsor asks: \"Will we finish in 12 weeks?\" A manager has suggested ranking the team's developers by individual points completed.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Answer the sponsor and advise on the metrics.",
          parts: [
            part(
              "Forecast",
              "Calculates remaining work (210 - 84 = 126), average velocity ((18 + 22 + 20 + 24) / 4 = 21) and sprints (126 / 21 = 6, i.e. 12 weeks), and gives a range from the lowest and highest velocities (126 / 24 = 5.25 -> 6 sprints; 126 / 18 = 7 sprints).",
              "Remaining = 210 - 84 = 126 points. Average velocity = (18 + 22 + 20 + 24) / 4 = 21. 126 / 21 = 6 sprints = 12 weeks. Range: at 24 points, 126 / 24 = 5.25, so 6 sprints; at 18 points, 126 / 18 = 7 sprints (14 weeks)."
            ),
            part(
              "Scope growth",
              "Points out that scope is still growing (about 10 points a sprint) and that, if it continues, the effective progress is about 11 points per sprint (21 - 10), so 12 weeks is unlikely; recommends showing it on a burnup (which shows scope changes) rather than a burndown.",
              "Scope has grown by about 10 points per sprint. If that continues, net progress is only about 21 - 10 = 11 points a sprint, and 126 points would take about 11.5 sprints. A burnup chart shows the scope line rising as well as the work done, so the sponsor can see why."
            ),
            part(
              "Answer to the sponsor",
              "Gives a clear, honest answer with the condition (12 weeks only if scope stops growing; otherwise later) and offers a decision (fix the scope, or accept a later date or reduced scope).",
              "Twelve weeks is possible only if no more scope is added -- even then, at our lowest velocity it is 14 weeks. If new items keep coming at the current rate it will take far longer. Decision needed: freeze the release scope or move new items to the next release."
            ),
            part(
              "Metric misuse",
              "Rejects ranking individuals by points (velocity is a team planning measure; individual comparison inflates estimates and harms collaboration) and suggests metrics fit for the audience.",
              "Don't rank people by points: story points are relative team estimates, and comparing individuals leads to inflated estimates and less helping. For the sponsor, show the release burnup; for the team, cycle time and blocked items help them improve."
            ),
          ],
        },
      ],
    },
    {
      slug: "acp-value-stream-waste",
      objective:
        "Recognizing and eliminating waste: visualizing end-to-end flow to spot value-added vs. non-value-added work, then prioritizing waste reduction",
      kind: "build",
      title: "Map the value stream and find the waste",
      brief:
        "At Driftwood Software, a customer's feature request goes through these steps (working days). Intake: 0.5 day of work, then waits 4 days for analysis. Analysis: 1 day of work, then waits 6 days for a developer. Build: 3 days of work, then waits 3 days for the test environment. Test: 1 day of work, then waits 5 days for the monthly release window. Release: 0.5 day of work.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Analyse the value stream.",
          parts: [
            part(
              "Lead time and value-added time",
              "Calculates value-added (process) time 0.5 + 1 + 3 + 1 + 0.5 = 6 days, waiting time 4 + 6 + 3 + 5 = 18 days, and total lead time 24 days.",
              "Value-added time = 0.5 + 1 + 3 + 1 + 0.5 = 6 days. Waiting = 4 + 6 + 3 + 5 = 18 days. Lead time = 6 + 18 = 24 days."
            ),
            part(
              "Process cycle efficiency",
              "Calculates flow (process cycle) efficiency = 6 / 24 = 25% and explains that 75% of the lead time is waiting (non-value-added).",
              "Efficiency = value-added time / lead time = 6 / 24 = 25%. Three-quarters of the time, the request is waiting rather than being worked on."
            ),
            part(
              "Wastes named",
              "Names at least two wastes with their place in the stream, using lean terms (for example waiting/queues before build and release, partially done work, handoffs, delays from batching into a monthly release).",
              "Waiting: 6 days queued for a developer and 5 days for the release window. Partially done work: tested features sitting undeployed. Handoffs between intake, analysis, build and test add queues."
            ),
            part(
              "Priority for improvement",
              "Prioritises the biggest or most leverageable delays (for example the 6-day queue for developers, by limiting WIP/pulling work, and the 5-day release wait, by releasing more often with automation) and states the expected effect on lead time.",
              "First, release more often (automated deployment, weekly or on demand) to remove most of the 5-day wait. Second, limit work in progress so developers pull from analysis as capacity frees up, cutting the 6-day queue. Removing those two waits would take lead time from 24 days toward 13."
            ),
          ],
        },
      ],
    },
    {
      slug: "acp-optimize-flow-wip-case",
      objective:
        "Optimizing flow: limiting work in progress at every level, shielding the team from interruptions, and using metrics to keep improving flow",
      kind: "case",
      title: "Shorten cycle time by limiting work in progress",
      brief:
        "Ashbury Council's digital team runs a Kanban system for website changes. On average there are 24 items in progress and the team finishes 8 items a week. Requesters complain that changes take \"forever\".",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The service manager wants the average change to take no more than 1.5 weeks from start to finish, without adding staff.",
          ask: "What does flow theory say, and what do you change?",
          parts: [
            part(
              "Current cycle time",
              "Applies Little's Law (average cycle time = average WIP / average throughput = 24 / 8 = 3 weeks).",
              "Little's Law: cycle time = WIP / throughput = 24 / 8 = 3 weeks on average."
            ),
            part(
              "WIP needed",
              "Calculates that at the same throughput a 1.5-week cycle time needs average WIP of 8 x 1.5 = 12 items, and proposes explicit WIP limits per column to get there.",
              "For 1.5 weeks at 8 items a week, WIP must fall to 8 x 1.5 = 12 items. Set explicit WIP limits per column (for example 4 in build, 3 in review, 3 in test, 2 ready to release) and stop starting new work until something finishes."
            ),
          ],
        },
        {
          text: "Two weeks after the WIP limits, items pile up in Review: three items sit there waiting for the single content approver, while developers keep being pulled away by urgent requests from councillors sent directly to them.",
          ask: "How do you improve the flow now?",
          parts: [
            part(
              "Bottleneck",
              "Identifies Review (the single approver) as the bottleneck and proposes swarming or a structural fix (for example developers help prepare reviews, a second trained approver, smaller items) rather than raising the WIP limit.",
              "Review is the constraint. Developers who hit their WIP limit help the approver (pre-checking content, pairing on reviews), we train a second approver, and we split items smaller so reviews are quicker. We don't raise the WIP limit to hide the queue."
            ),
            part(
              "Shielding from interruptions",
              "Shields the team by routing urgent requests through one intake point (for example the product owner or an expedite lane with its own limit of one) instead of directly to developers.",
              "All councillor requests go through the product owner; a genuinely urgent one uses an expedite lane limited to one item at a time, so developers aren't interrupted mid-task."
            ),
            part(
              "Measure",
              "Names flow metrics to watch (cycle time, throughput, WIP, a cumulative flow diagram) and reviews them regularly to confirm improvement.",
              "Track cycle time, throughput and the cumulative flow diagram each week; the Review band narrowing and cycle time trending toward 1.5 weeks shows the change worked."
            ),
          ],
        },
      ],
    },
  ],
};
