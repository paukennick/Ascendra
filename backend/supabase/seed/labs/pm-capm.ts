import { GENERAL_SAFETY, part, type SeedLabSet, numericPart, matchPart } from "./types";
import { source } from "../sources";

// REQ-150: CAPM (PMI Certified Associate in Project Management, 2023 Exam
// Update -- still the current ECO when checked on 2026-11-07).
//
// Aligned to the ECO's four domains (Project Management Fundamentals and
// Core Concepts 36%, Predictive Plan-Based Methodologies 17%, Agile
// Frameworks/Methodologies 20%, Business Analysis Frameworks 27%) and to
// the enablers a CAPM item asks a candidate to apply: tell an issue from a
// risk, assumption and constraint and critique scope; apply the Code of
// Ethics; size resources and use the risk and stakeholder registers; apply
// the critical path method and calculate schedule variance; build a WBS;
// translate a WBS into iterations; interpret success criteria and
// prioritise; apply a product roadmap; match a requirements-gathering
// technique; judge delivery readiness from a traceability matrix.
//   https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/capm-exam-content-outline-english.pdf
// Density ("hybrid"): 3 / 2 / 2 / 3. Every number in a rubric is worked in
// its model answer. Pitched at associate level: the vocabulary of the ECO
// and the PMBOK Guide, no experience assumed.

export const CAPM_LABS: SeedLabSet = {
  trackCode: "CAPM",
  sources: [source("https://www.pmi.org/-/media/pmi/documents/public/pdf/certifications/capm-exam-content-outline-english.pdf", "exam_outline", "2026-11-07")],
  labs: [
    {
      slug: "capm-issue-risk-assumption-scope",
      objective:
        "Telling apart an issue, a risk, an assumption, and a constraint, and reviewing a project scope statement for gaps",
      kind: "build",
      title: "Sort the kickoff notes and critique the scope statement",
      brief:
        "You are the project coordinator for Larchfield Library Services, which is moving its five branches to self-service book kiosks. From the kickoff meeting notes: (1) \"The budget is fixed at $240,000 by the council.\" (2) \"The kiosk vendor may not get import clearance in time for the March pilot.\" (3) \"We are counting on branch Wi-Fi being strong enough for the kiosks.\" (4) \"Branch 3's network cabling failed its inspection last week and must be replaced before anything is installed there.\" The draft scope statement reads: \"Install self-service kiosks at the branches and make sure staff are happy with them.\"",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify the four notes and critique the scope statement.",
          parts: [
            part(
              "Classification",
              "Classifies (1) as a constraint, (2) as a risk (uncertain, future), (3) as an assumption (believed true without proof), and (4) as an issue (it has already happened and needs action), with a short reason for at least two of them.",
              "(1) Constraint -- a fixed limit the project must work within. (2) Risk -- an uncertain future event that would affect the March pilot if it happens. (3) Assumption -- something we are treating as true without having checked it. (4) Issue -- it has already happened (the cabling failed) and must be resolved now."
            ),
            part(
              "What to do with each",
              "Puts each in the right place: the constraint in the scope statement/charter, the risk in the risk register with an owner, the assumption in the assumption log with a plan to validate it (for example a Wi-Fi survey), and the issue in the issue log with an owner and due date.",
              "Record the budget as a constraint in the charter and scope statement; log the import-clearance risk in the risk register with an owner and response; log the Wi-Fi belief in the assumption log and validate it with a site survey (if it proves false it becomes a risk or issue); log the cabling in the issue log with an owner and a fix-by date before Branch 3's install."
            ),
            part(
              "Scope statement gaps",
              "Identifies at least three gaps: no count or list of branches/kiosks (deliverables), no measurable acceptance criteria (\"staff are happy\" is not measurable), and no exclusions, assumptions or constraints; may also note missing training, data migration or timeline.",
              "It does not say how many kiosks go to which of the five branches, what \"install\" includes (configuration, integration with the library system, staff training), or what is out of scope. \"Staff are happy\" cannot be accepted or rejected. It also omits the $240,000 constraint and the Wi-Fi assumption."
            ),
            part(
              "Rewritten scope statement",
              "Rewrites the statement with specific deliverables and at least one measurable acceptance criterion, and names at least one exclusion.",
              "Deliver and configure 10 self-service kiosks (2 per branch at 5 branches), integrated with the library management system, with 2 hours of training for every circulation staff member. Acceptance: each kiosk completes 50 test check-outs and returns without error, and 90% of trained staff pass the kiosk checklist. Out of scope: replacing branch furniture or self-service payment."
            ),
          ],
        },
      ],
    },
    {
      slug: "capm-code-of-ethics-case",
      objective:
        "Applying the PMI Code of Ethics and Professional Conduct to a scenario, and explaining a project's role as a vehicle for organizational change",
      kind: "case",
      title: "Hold to the Code of Ethics under pressure",
      brief:
        "You are a junior project manager at Tidewater Logistics, running a project that replaces the warehouse scanning system. The project exists so that the company can change how it picks orders: fewer mispicks and same-day dispatch. Two vendors are bidding to supply the handheld scanners, and you sit on the evaluation panel.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "One of the bidding vendors invites you to a weekend at a golf resort, all expenses paid, \"to get to know the team\". Your company's policy limits gifts to items worth under $50.",
          ask: "What do you do, and which value of the PMI Code of Ethics applies?",
          parts: [
            part(
              "Action",
              "Declines the invitation, discloses the offer to the appropriate person (manager, procurement or panel chair), and follows company policy; does not accept on condition of staying impartial.",
              "Decline politely and tell the panel chair and procurement about the offer, in writing, as the gift policy requires. I keep the evaluation based only on the published criteria."
            ),
            part(
              "Code value",
              "Names fairness (avoiding conflicts of interest and favouritism, impartial decisions) and may also cite responsibility (following organizational policy) or honesty.",
              "Fairness: I must make decisions impartially and disclose any real or potential conflict of interest. It also touches responsibility, since I must follow my organization's policies."
            ),
          ],
        },
        {
          text: "At the next steering meeting your manager asks you to report the project as \"green\" because the sponsor is under pressure. In fact, testing found that 1 in 20 scans uploads to the wrong order, and go-live is three weeks away.",
          ask: "How do you respond?",
          parts: [
            part(
              "Response",
              "Reports the true status (amber or red, with the defect rate and its effect on go-live) rather than misrepresenting it; raises the concern with the manager first and offers a recovery option.",
              "I talk to my manager before the meeting: I can't report green when 5% of scans hit the wrong order. I report amber/red with the facts, the impact on the go-live date, and a recovery option (fix and retest, or a phased go-live), so the sponsor can decide."
            ),
            part(
              "Code value and why it matters",
              "Names honesty (truthful, accurate reporting, not deceiving stakeholders) and explains that hiding the defect would undermine the change the project exists to deliver (fewer mispicks).",
              "Honesty: we provide accurate information in a timely way. The project's purpose is fewer mispicks; going live with a 5% wrong-order rate would make picking worse, so a false green would defeat the change the organization is paying for."
            ),
          ],
        },
      ],
    },
    {
      slug: "capm-size-resources-registers",
      objective:
        "Distinguishing a milestone from a task duration, sizing the number and type of resources a project needs, and using a risk register and a stakeholder register in a given situation",
      kind: "build",
      title: "Size the test team and use the registers",
      brief:
        "Brookvale Credit Union is testing its new online-banking app. The test plan contains 1,200 hours of test execution that must finish within 6 weeks. Each tester works 40 hours a week but spends 25% of that time in meetings and on other work. The plan has an item \"User acceptance testing complete -- 14 June\". The member-services manager, Dana, has high influence over go-live and has said she will not sign off unless branch staff try the app first. The risk register already lists \"test devices may arrive late\" with a probability of 0.3.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Work out the team size and record what the registers need.",
          parts: [
            part(
              "Number of testers",
              "Calculates productive hours per tester (40 x 0.75 = 30 a week, x 6 weeks = 180) and the team size (1,200 / 180 = 6.67, rounded up to 7 testers), showing the working.",
              "Productive time per tester: 40 x 0.75 = 30 hours a week; over 6 weeks 30 x 6 = 180 hours. Testers needed: 1,200 / 180 = 6.67, so 7 testers (always round up; 6 would provide only 1,080 hours)."
            ),
            part(
              "Milestone or duration",
              "States that \"UAT complete -- 14 June\" is a milestone (a significant point with zero duration) and that the 6 weeks of test execution is a task/activity duration.",
              "\"UAT complete -- 14 June\" is a milestone: a point in time with zero duration. The 6 weeks of test execution is an activity with a duration that leads up to it."
            ),
            part(
              "Stakeholder register entry",
              "Records Dana in the stakeholder register with her role, influence/interest, expectation (branch staff try the app before go-live) and an engagement approach.",
              "Dana -- member-services manager. Influence: high (go-live sign-off). Interest: high. Expectation: branch staff must trial the app before go-live. Engagement: invite three branch staff into UAT and show Dana the results weekly."
            ),
            part(
              "Risk register update",
              "Adds or updates a risk entry with cause/event/effect, an owner and a response (for example ordering devices early or using emulators), and links it to the schedule.",
              "Risk: because test devices may arrive late (P 0.3), device testing may start late, delaying the 14 June milestone. Owner: test lead. Response (mitigate): order now and start on emulators and existing staff phones, so only device-specific tests wait for delivery."
            ),
          ],
        },
      ],
    },
    {
      slug: "capm-critical-path-schedule-variance",
      objective: "Applying the critical path method and calculating schedule variance",
      kind: "build",
      title: "Find the critical path and the schedule variance",
      brief:
        "Harbour Point Clinic is fitting out a new reception area. Activities (duration in days, predecessors): A Design 4 (none); B Order furniture 6 (A); C Strip old fit-out 3 (A); D Rewire 5 (C); E Install 2 (B and D); F Inspect 3 (E). All links are finish-to-start and the work starts on day 0. At the week-2 status date the planned value is $48,000 and the earned value is $42,000.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Analyze the network and the status.",
          parts: [
            part(
              "Critical path and duration",
              "Lists both paths with totals (A-B-E-F = 15 days; A-C-D-E-F = 17 days) and identifies A-C-D-E-F as the critical path with a duration of 17 days.",
              "A-B-E-F = 4 + 6 + 2 + 3 = 15 days. A-C-D-E-F = 4 + 3 + 5 + 2 + 3 = 17 days. The critical path is A-C-D-E-F and the project takes 17 days."
            ),
            numericPart("Float on B (days)", "Total float of 2 days for B (early start 4, early finish 10; late finish 12, late start 6). Met at exactly 2.", "Forward pass: B starts day 4 and finishes day 10. Backward pass: F must start by 14, so E must finish by 14 and start by 12; B must finish by 12, so it can start as late as 6. Float = 6 - 4 = 2 days.", { answer: 2, tolerance: 0, unit: "days" }),
            part(
              "Delay to B",
              "States that a 3-day slip on B uses its 2 days of float and delays the project by 1 day (to day 18), making B critical.",
              "B's 3-day slip is 1 day more than its 2 days of float, so the project finishes on day 18 instead of 17, and A-B-E-F becomes the critical path."
            ),
            part(
              "Schedule variance",
              "Calculates SV = EV - PV = 42,000 - 48,000 = -$6,000 and interprets it as behind schedule (SPI = 0.875 is optional).",
              "SV = EV - PV = 42,000 - 48,000 = -$6,000: less work has been done than planned by this date, so the project is behind schedule (SPI = 42,000 / 48,000 = 0.875)."
            ),
          ],
        },
      ],
    },
    {
      slug: "capm-wbs-work-packages",
      objective: "Building a work breakdown structure (WBS) and defining its work packages",
      kind: "build",
      title: "Build a WBS for a staff-onboarding portal",
      brief:
        "Meridian Home Insurance wants a staff-onboarding portal. In scope: a portal site, an e-signature integration for contracts, five onboarding e-learning modules adapted from existing material, a manager checklist dashboard, and training for the HR team. Out of scope: payroll changes and new learning content written from scratch. The project uses a predictive approach.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Draft the WBS and define one work package.",
          parts: [
            part(
              "Level-1 elements",
              "Gives deliverable-based (noun) elements covering all of the stated scope -- portal, e-signature integration, e-learning modules, manager dashboard, HR training -- plus project management, and nothing out of scope.",
              "1 Project management; 2 Onboarding portal site; 3 E-signature integration; 4 E-learning modules (5 adapted); 5 Manager checklist dashboard; 6 HR team training."
            ),
            part(
              "Decomposition to work packages",
              "Breaks one element down to work packages small enough to estimate and assign (for example the five modules as separate packages), staying within scope.",
              "4 E-learning modules -> 4.1 Module template; 4.2 Module 1 Welcome; 4.3 Module 2 Policies; 4.4 Module 3 Systems access; 4.5 Module 4 Health and safety; 4.6 Module 5 Benefits; 4.7 Module review and sign-off."
            ),
            part(
              "Work package definition",
              "Defines one work package with what it produces, acceptance criteria, an owner, and an estimate (effort or duration and/or cost).",
              "4.4 Module 3 Systems access: adapt the existing 30-slide deck into a 20-minute interactive module. Acceptance: IT security approves the content and it passes the accessibility checklist. Owner: learning designer. Estimate: 5 days, $3,000."
            ),
            part(
              "Scope check",
              "Applies the 100% rule (all and only the scope) and states where the excluded items stay out (no payroll or new-content packages).",
              "The WBS holds 100% of the agreed scope and nothing more, so there is no payroll work package and no package for writing new content; the five modules are adaptations only."
            ),
          ],
        },
      ],
    },
    {
      slug: "capm-wbs-to-iterations",
      objective:
        "Planning project iterations: distinguishing logical iteration units, weighing their pros and cons, and translating a WBS into an adaptive iteration",
      kind: "build",
      title: "Turn a WBS into an iteration plan",
      brief:
        "Fernway Council's parking-permit app was first planned predictively. The WBS has three deliverables: 1 Permit application (12 stories, 54 points); 2 Payments (8 stories, 40 points); 3 Permit renewals and reminders (9 stories, 38 points). The team is moving to two-week iterations. Its velocity over the last three iterations was 20, 24 and 22 points. The product owner wants residents to be able to apply and pay as early as possible.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Translate the WBS into an iteration plan.",
          parts: [
            part(
              "From WBS to backlog",
              "Turns the WBS deliverables into a prioritized product backlog of user stories (or features/epics), ordered by value rather than by WBS number, with application and payment stories first.",
              "Each WBS deliverable becomes an epic and its work becomes user stories in one product backlog, ordered by value: the thinnest apply-and-pay path first (apply for a permit, pay by card), then the rest of application and payment, then renewals and reminders."
            ),
            part(
              "Number of iterations",
              "Calculates total points (54 + 40 + 38 = 132), average velocity ((20 + 24 + 22) / 3 = 22) and iterations (132 / 22 = 6), i.e. about 12 weeks, stating it is a forecast.",
              "Total = 54 + 40 + 38 = 132 points. Average velocity = (20 + 24 + 22) / 3 = 22 points. 132 / 22 = 6 iterations, about 12 weeks at two weeks each -- a forecast to revisit as velocity changes."
            ),
            part(
              "Iteration goals",
              "Gives goals for the first two or three iterations that each deliver a usable increment (for example iteration 1: a resident can apply and pay for a basic permit), not \"finish WBS 1\".",
              "Iteration 1: a resident can apply for a standard permit and pay by card (thin slice across WBS 1 and 2). Iteration 2: permits for visitors and second cars, payment receipts. Iteration 3: remaining application rules and refunds."
            ),
            part(
              "Pros and cons of this iteration unit",
              "Names at least one benefit (early value and feedback, regular inspection) and one drawback or risk (for example integration or regulatory work that doesn't fit neatly, overhead of ceremonies) of fixed two-week iterations.",
              "Pro: residents can use apply-and-pay after two weeks and we get feedback every iteration. Con: work like the payment provider's security review may not fit into one iteration and needs planning ahead; each iteration also carries planning and review overhead."
            ),
          ],
        },
      ],
    },
    {
      slug: "capm-success-criteria-prioritise-case",
      objective:
        "Preparing and executing task-management steps: interpreting success criteria and prioritizing tasks in an adaptive project",
      kind: "case",
      title: "Interpret done and prioritize mid-iteration",
      brief:
        "You support a Scrum team at Ottercreek Outdoor Gear building a store-locator feature. The team's definition of done: code reviewed, automated tests passing, deployed to the test environment. The story \"As a shopper, I want to find stores within 10 km so I can check stock nearby\" has acceptance criteria: shows stores within 10 km sorted by distance; shows each store's opening hours; works on mobile.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "At the iteration review a developer says the story is done: the code is reviewed, tests pass and it is in the test environment. When you try it, stores are listed within 10 km and sorted correctly, but opening hours are missing.",
          ask: "Is the story done? Explain using the success criteria.",
          parts: [
            part(
              "Done or not",
              "States it is not done: it meets the definition of done (quality checks) but fails one acceptance criterion (opening hours), and both must be met.",
              "Not done. It meets the definition of done, which applies to every story, but not this story's acceptance criteria -- opening hours are missing. A story is done only when both are met."
            ),
            part(
              "What happens to it",
              "Says the story is not counted toward velocity or shown as complete; the remaining work returns to the product backlog for the product owner to prioritize.",
              "It isn't demonstrated as complete or counted in velocity. The unfinished story goes back to the product backlog and the product owner decides when the opening-hours work is done."
            ),
          ],
        },
        {
          text: "Next iteration, the product owner must choose two of these for the remaining capacity: (a) finish opening hours on the store locator; (b) a holiday-sale banner the marketing director wants by Friday; (c) fixing a checkout bug that makes 3% of payments fail; (d) refactoring the search code, which the team says will speed up future work.",
          ask: "Which two would you recommend, and why?",
          parts: [
            part(
              "Recommendation",
              "Puts the checkout defect (c) first because it loses revenue now, and chooses a second item with a value-based reason (for example a, finishing a nearly complete valuable story, or b if the deadline is truly fixed), acknowledging that the product owner decides.",
              "First (c): 3% of payments failing costs money every day. Second (a): it is nearly done and completes a feature shoppers can use. I'd raise the banner deadline with the marketing director and the product owner, who makes the final call."
            ),
            part(
              "How the decision is made",
              "Explains that the product owner prioritizes the backlog by value (with input from stakeholders and the team on cost, risk and dependencies), and that technical work like refactoring is weighed on its value too, not ignored.",
              "The product owner orders the backlog by business value, informed by stakeholders and the team's estimates and risks. Refactoring (d) stays visible in the backlog; the team should explain its value so it can be scheduled soon."
            ),
          ],
        },
      ],
    },
    {
      slug: "capm-product-roadmap-releases",
      objective: "Applying and interpreting a product roadmap, including which components map to which release",
      kind: "build",
      title: "Map features onto a product roadmap",
      brief:
        "Kestrel Fitness Studios is building a member app. Features: (1) class timetable; (2) book a class (needs 1 and 3); (3) member login; (4) pay for a class pack (needs 3); (5) waiting list for full classes (needs 2); (6) personal workout history (needs 3). The business needs members to be able to book classes before the January rush, eight weeks away. The team can deliver about three features per four-week release.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Lay out the first two releases of the roadmap.",
          parts: [
            part(
              "Release 1",
              "Puts member login (3), class timetable (1) and booking (2) in release 1, respecting dependencies so booking is usable before January.",
              "Release 1 (weeks 1-4): member login (3), class timetable (1), book a class (2). Booking depends on both, so all three ship together, in time for January."
            ),
            part(
              "Release 2",
              "Places the remaining features in a sensible order after their dependencies (for example payment and waiting list in release 2, workout history later or in release 2), within the capacity of about three features.",
              "Release 2 (weeks 5-8): pay for a class pack (4), waiting list (5), workout history (6). Each depends only on features already in release 1."
            ),
            part(
              "Roadmap purpose",
              "Explains that a roadmap shows the planned sequence of releases toward the product vision and is updated as priorities and feedback change, not a fixed commitment of dates and scope.",
              "The roadmap communicates the intended order of releases toward the goal (booking before January) so stakeholders can plan; it is reviewed after each release and changed as feedback and priorities change."
            ),
          ],
        },
      ],
    },
    {
      slug: "capm-requirements-technique-match",
      objective:
        "Matching a requirements-gathering technique to a scenario: user stories, use cases, stakeholder interviews, surveys, workshops, and lessons learned",
      kind: "build",
      title: "Choose the right requirements-gathering technique",
      brief:
        "Juniper Water Utility is replacing its customer billing portal. Four situations: (A) 40,000 customers use the portal and the team wants to know which features they value most; (B) the finance director, billing manager and customer-service lead disagree about how refunds should work; (C) the previous portal project went badly over budget two years ago and its documents are in the archive; (D) the developers need to understand, step by step, how a customer disputes a bill, including what happens when evidence is missing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a technique for each situation and justify it.",
          parts: [
            matchPart("Technique for each situation", "Matches A to a survey, B to a facilitated workshop, C to lessons learned and document analysis, and D to a use case. Every pair right is met; at least half is partly there.", "A (40,000 customers) -> survey. B (three leaders disagree on refunds) -> facilitated workshop. C (the earlier project's archive) -> lessons learned and document analysis. D (step-by-step dispute, with exceptions) -> use case. Benchmarking fits none of these.", { leftHeading: "Situation", rightHeading: "Technique", left: ["A: 40,000 customers, which features they value", "B: three leaders disagree on refunds", "C: the earlier portal project's archived documents", "D: step by step, how a customer disputes a bill"], right: ["Survey (questionnaire)", "Facilitated requirements workshop", "Lessons learned and document analysis", "Use case with exception flows", "Benchmarking against other utilities"], pairs: [0, 1, 2, 3] }),
            part("Why each fits", "Gives a reason for each choice: a survey reaches many people cheaply with countable results (A); a workshop gets the conflicting stakeholders to agree together (B); lessons learned reuse what went wrong before (C); a use case shows each step including what happens when evidence is missing (D).", "A: a survey reaches thousands of customers at low cost and gives numbers we can rank. B: a facilitated workshop lets the three hear each other and agree the refund rules together; short interviews beforehand can surface each position. C: the earlier project's lessons learned and archive show what caused the overrun and which requirements were missed. D: a use case \"Dispute a bill\" sets out the main flow and an exception flow for missing evidence."),
          ],
        },
      ],
    },
    {
      slug: "capm-traceability-delivery-readiness-case",
      objective:
        "Validating requirements through delivery: defining acceptance criteria and judging delivery readiness against a traceability matrix or backlog",
      kind: "case",
      title: "Decide if the release is ready using the traceability matrix",
      brief:
        "Sandpiper Veterinary Group's new appointment-booking system is due to go live on Monday. You keep the requirements traceability matrix (RTM), which links each requirement to its source, design item and test cases.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Requirement R7 reads: \"The system shall send appointment reminders.\" It has no acceptance criteria and no linked test case.",
          ask: "Write acceptance criteria for R7.",
          parts: [
            part(
              "Acceptance criteria",
              "Writes at least two specific, testable criteria (for example timing, channel, content, opt-out) that a tester could pass or fail.",
              "Given a booked appointment, a reminder is sent by SMS and email 24 hours before it; the reminder shows the pet's name, clinic, date and time; clients who opted out receive none; a failed SMS is retried once and logged."
            ),
            part(
              "Traceability",
              "Says the criteria are linked to test cases in the RTM so the requirement can be verified, and that R7's source/owner should confirm them.",
              "Add test cases for each criterion and link them to R7 in the RTM, and ask R7's source (the practice manager) to confirm the criteria."
            ),
          ],
        },
        {
          text: "On Friday the RTM shows 40 requirements: 36 passed testing, 2 failed (R12: double-booking of the same vet slot is possible; R19: the clinic logo is the old one), and 2 (R7, R30) have tests written but not yet run.",
          ask: "Is the release ready? What do you recommend?",
          parts: [
            part(
              "Readiness judgment",
              "Calculates or notes that 36 of 40 (90%) passed and judges the release not ready while R12 (a serious functional defect) is unresolved and R7/R30 are untested; recognizes that R19 is minor.",
              "Not yet: 36 of 40 requirements (90%) are verified, but R12 allows double-booking, which breaks the core purpose, and R7 and R30 have not been tested. R19 (old logo) is cosmetic."
            ),
            part(
              "Recommendation",
              "Recommends fixing and retesting R12 and running the R7/R30 tests before go-live (or a decision by the product owner/sponsor to defer with a documented workaround), and accepting R19 as a known minor defect if the owner agrees.",
              "Fix and retest R12, run the R7 and R30 tests over the weekend, and go live only if they pass; otherwise ask the sponsor to move go-live. Log R19 as a known minor defect for the next release, with the owner's agreement."
            ),
          ],
        },
      ],
    },
  ],
};
