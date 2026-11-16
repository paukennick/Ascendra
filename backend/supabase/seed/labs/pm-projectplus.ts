import { GENERAL_SAFETY, part, type SeedLabSet, numericPart, matchPart, selectPart, orderPart } from "./types";
import { source } from "../sources";

// REQ-150: CompTIA Project+ (PK0-005, V5). Still the live exam when checked
// on 2026-11-07: comptia.org lists PK0-005 (launched 8 November 2022) with
// no retirement date or successor named.
//
// Aligned to the PK0-005 exam objectives' four domains (Project Management
// Concepts 33%, Project Life Cycle Phases 30%, Tools and Documentation 19%,
// Basics of IT and Governance 18%) and their action verbs: perform risk
// management activities (negative and positive risk strategies);
// apply schedule development (dependency types, critical path, revised
// baseline vs rebaseline); compare quality and performance concepts
// (testing types, SLAs, cost and schedule variance); plan the project;
// use project tools and analyse charts (burndown); explain information
// security concepts; and apply basic IT concepts (environments, change
// windows, rollback) to a deployment.
//   https://www.comptia.org/en-us/certifications/project/
//   https://partners.comptia.org/docs/default-source/resources/projectplus-exam-comparison-guide-004-005
// Density ("hybrid"): 3 / 1 / 1 / 2. The PK0-005 objectives name cost and
// schedule variance but not the wider earned value formulas, so the
// quality lab uses only CV and SV. Every number is worked in the model
// answer.

export const PROJECTPLUS_LABS: SeedLabSet = {
  trackCode: "PROJECTPLUS",
  sources: [
    source("https://www.comptia.org/en-us/certifications/project/", "exam_outline", "2026-11-07"),
    source("https://partners.comptia.org/docs/default-source/resources/projectplus-exam-comparison-guide-004-005", "exam_outline", "2026-11-07"),
  ],
  labs: [
    {
      slug: "projectplus-risk-responses",
      objective: "Risk management",
      kind: "build",
      title: "Analyze and respond to risks on an office move",
      brief:
        "Northlight Accountancy is moving its 80 staff and server room to a new office over one weekend in three months. Known risks: (1) the internet provider may not activate the new building's fiber line in time; (2) the old servers are end-of-life and may fail when moved; (3) the landlord may offer an extra floor at a discount if the move happens a month early; (4) a major cybersecurity event could hit while systems are being reconnected.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Analyze the risks and plan responses.",
          parts: [
            part(
              "Qualitative analysis",
              "Rates each risk's probability and impact (for example high/medium/low or 1-5) with a brief reason, and identifies which need the most attention (likely 1 and 2).",
              "(1) Fiber not ready: probability medium, impact high (no internet on Monday). (2) Servers fail in transit: probability medium (end-of-life), impact high. (3) Discounted extra floor: probability low, impact medium (positive). (4) Cyber event during reconnection: probability low, impact high. Priorities: 1 and 2."
            ),
            part(
              "Negative-risk responses",
              "Gives an appropriate strategy name and action for at least two threats from avoid, mitigate, transfer or accept (for example mitigate 1 with an early order and a 4G/5G backup; avoid or transfer 2 by migrating to new hardware or cloud, or insuring the move).",
              "(1) Mitigate: confirm the fiber order now with weekly check-ins and arrange 5G routers as a fallback. (2) Avoid: migrate services to new servers before the move so the old ones aren't relied on; or transfer the physical move to a specialist mover with insurance. (4) Mitigate: keep firewall rules and MFA in place and monitor during reconnection."
            ),
            part(
              "Positive-risk response",
              "Names a positive-risk strategy for the extra floor (exploit, enhance, share or accept) with an action.",
              "(3) Enhance: tell the landlord we could move early if the floor is offered by a set date, and check whether our plan could support an earlier move; if the cost is wrong, accept it and take no action."
            ),
            part(
              "Contingency and ownership",
              "Gives a contingency/fallback plan for at least one risk with a trigger, and names a risk owner or escalation point.",
              "Contingency for (1): if the provider hasn't confirmed an activation date two weeks before the move, switch to the 5G routers for the first week. Owner: IT manager; escalation to the office manager if the fiber date slips."
            ),
          ],
        },
      ],
    },
    {
      slug: "projectplus-schedule-dependencies",
      objective: "Schedule management",
      kind: "build",
      title: "Sequence the work and manage the baseline",
      brief:
        "Riverbend Dental is installing a new practice-management system. Activities (duration in days, predecessors): A Order hardware 3 (none); B Install software 5 (A); C Train staff 4 (A); D Go live 2 (B and C). Notes: software can't be installed until the hardware arrives; the practice manager prefers training to start after ordering, though it could start earlier; go-live needs the vendor's support team to be available.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Analyze the schedule and how to manage changes to it.",
          parts: [
            matchPart("Dependency types", "A -> B is mandatory (hard logic), A -> C is discretionary (soft logic, a preference) and the vendor support for go-live is external. All three right is met; two is partly there.", "A -> B: mandatory (hard logic) -- you can't install without hardware. A -> C: discretionary (soft logic) -- a preference that could change. Vendor support for go-live: an external dependency outside the team's control.", { leftHeading: "Dependency", rightHeading: "Type", left: ["A Order hardware -> B Install software", "A Order hardware -> C Train staff", "D Go live needs the vendor's support team"], right: ["Mandatory (hard logic)", "Discretionary (soft logic)", "External"], pairs: [0, 1, 2] }),
            part(
              "Critical path",
              "Calculates A-B-D = 10 days (critical) and A-C-D = 9 days, so C has 1 day of float.",
              "A-B-D = 3 + 5 + 2 = 10 days; A-C-D = 3 + 4 + 2 = 9 days. Critical path A-B-D, 10 days. C has 1 day of float."
            ),
            part(
              "Using the soft logic",
              "Recognizes that because A->C is discretionary, training could start earlier (in parallel with A) to add float or protect the schedule, but this does not shorten the project since C is not critical.",
              "Since training only has a preferred link to ordering, it could start on day 0. That gives C more float but doesn't shorten the project, because the critical path runs through B."
            ),
            part(
              "Revised baseline vs rebaseline",
              "Distinguishes a revised baseline (an approved change to part of the baseline, such as an approved scope change, keeping history) from a rebaseline (replacing the baseline wholesale when it no longer reflects reality), and says both go through change control.",
              "A revised baseline updates the approved schedule for an approved change -- for example adding a 2-day data migration -- while keeping the history. A rebaseline replaces the whole baseline when the original is no longer realistic. Both need approval through change control."
            ),
          ],
        },
      ],
    },
    {
      slug: "projectplus-quality-performance-case",
      objective: "Quality and performance management",
      kind: "case",
      title: "Manage quality and performance before go-live",
      brief:
        "Bayview Hotels is launching a new online booking engine, built by a supplier under a contract with a service-level agreement (SLA) of 99.9% monthly availability.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Two weeks before launch, the supplier says the code is \"tested\". You learn they ran unit tests only. Peak booking traffic is expected on the day the summer sale opens.",
          ask: "Which testing is still needed before launch?",
          parts: [
            part(
              "Testing types",
              "Names at least three relevant test types beyond unit testing with their purpose: regression, performance/stress (for the sale-day peak), user acceptance testing, and possibly smoke testing after deployment.",
              "Regression testing to check existing features still work; performance and stress testing at and beyond the sale-day peak; user acceptance testing by hotel staff against the business requirements; and a smoke test right after deployment."
            ),
            part(
              "Verification vs validation",
              "Explains verification (built to specification) vs validation (meets the business's actual need), and links UAT to validation.",
              "Verification checks the engine was built to the spec (unit, regression tests). Validation checks it meets the hotels' real needs -- that's what UAT with staff provides."
            ),
          ],
        },
        {
          text: "At the status date the project's planned value is $50,000, the earned value is $45,000 and the actual cost is $52,000. In the first month live, the booking engine was unavailable for 90 minutes.",
          ask: "Report cost, schedule and SLA performance.",
          parts: [
            part(
              "Cost and schedule variance",
              "Calculates CV = EV - AC = 45,000 - 52,000 = -$7,000 (over budget) and SV = EV - PV = 45,000 - 50,000 = -$5,000 (behind schedule).",
              "CV = 45,000 - 52,000 = -$7,000: over budget. SV = 45,000 - 50,000 = -$5,000: behind schedule."
            ),
            part(
              "SLA check",
              "Calculates allowed downtime for 99.9% in a 30-day month (43,200 minutes x 0.001 = 43.2 minutes) and concludes 90 minutes breaches the SLA (about 99.79% availability), so the contract's remedy applies.",
              "A 30-day month has 30 x 24 x 60 = 43,200 minutes; 0.1% of that is 43.2 minutes allowed. 90 minutes down gives (43,200 - 90) / 43,200 = 99.79%, so the SLA was breached; apply the contract remedy and ask the supplier for a root-cause report."
            ),
          ],
        },
      ],
    },
    {
      slug: "projectplus-project-planning-raci",
      objective: "Project planning",
      kind: "build",
      title: "Plan a laptop refresh project",
      brief:
        "Cedarline Insurance is replacing 300 staff laptops in eight weeks with a $420,000 budget. Roles: the IT director (sponsor), you (project manager), a desktop-support team of four technicians, the security team, a hardware vendor delivering in two batches, and department heads who must release staff for a one-hour swap. Old laptops must be securely wiped before disposal.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Produce the key planning artifacts.",
          parts: [
            part(
              "Planning artifacts",
              "Names the main planning-phase artifacts appropriate here (for example WBS, schedule, budget/cost baseline, RACI, communication plan, risk register, procurement/vendor plan) and what one of them contains for this project.",
              "WBS, schedule with the two delivery batches, cost baseline of $420,000, RACI, communication plan, risk register and the vendor delivery agreement. The schedule: build and test the standard image (weeks 1-2), batch 1 swaps (weeks 3-5), batch 2 swaps (weeks 6-8), disposal at the end."
            ),
            part(
              "RACI",
              "Builds a RACI for at least three activities with one Accountable each and sensible assignments (for example image build: R technicians, A PM, C security; secure wipe: R technicians, A security or PM; staff scheduling: R department heads, A PM).",
              "Build laptop image: R technicians, A PM, C security, I sponsor. Schedule staff swaps: R department heads, A PM, I staff. Swap laptops: R technicians, A PM. Securely wipe old laptops: R technicians, A security team lead, I sponsor."
            ),
            part(
              "Capacity check",
              "Checks the plan is feasible with simple arithmetic (for example 300 swaps over about 6 swap weeks = 50 a week; with 4 technicians that is about 12.5 each a week, or 2.5 a day) and notes a constraint or risk.",
              "300 laptops over 6 swap weeks = 50 a week. With 4 technicians that's 12.5 each a week, or 2.5 a day -- feasible at one hour each, leaving time for support. Risk: if batch 2 arrives late, 150 swaps would be squeezed into fewer weeks."
            ),
          ],
        },
      ],
    },
    {
      slug: "projectplus-tools-burndown",
      objective: "Common project management tools",
      kind: "build",
      title: "Choose the tools and read the burndown",
      brief:
        "Fairmont Logistics' team is building a driver app in two-week (10 working day) sprints. It uses a task board, a burndown chart and a Gantt chart for the wider rollout. In the current sprint the team committed to 60 story points; at the end of day 6, 40 points remain. Senior managers want a single view of how the app fits with the warehouse and training work.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Advise on the tools and interpret the burndown.",
          parts: [
            part(
              "Right tool for each need",
              "Matches tools to needs: the task/Kanban board for the team's daily work; the burndown for sprint progress; a Gantt chart (or roadmap) for senior managers' cross-team timeline with dependencies and milestones.",
              "Team daily work: the task board (to do, in progress, done). Sprint progress: the burndown. Senior managers: a Gantt chart showing the app, warehouse and training work with dependencies and milestones."
            ),
            numericPart("Points behind the ideal line", "Ideal burn is 60 / 10 = 6 points a day, so 24 points should remain after day 6; 40 remain, so the team is 16 points behind. Met at exactly 16.", "Ideal burn = 60 / 10 = 6 points a day, so 60 - 36 = 24 points should remain after day 6. Actual is 40, so the team is 16 points behind.", { answer: 16, tolerance: 0, unit: "points" }),
            part(
              "Forecast and action",
              "Forecasts at the current rate (20 points in 6 days = about 3.3 a day; 4 days left gives about 13 more, leaving about 27 unfinished) and proposes an action (discuss at stand-up, agree with the product owner which items to drop, look for blockers).",
              "Rate so far = 20 / 6 = 3.3 points a day; in 4 days that's about 13 more, leaving about 27 points unfinished. Raise it at stand-up, check for blockers, and agree with the product owner which lowest-priority items to drop from the sprint."
            ),
          ],
        },
      ],
    },
    {
      slug: "projectplus-information-security-case",
      objective: "Information security basics for project managers",
      kind: "case",
      title: "Keep a project's data and access secure",
      brief:
        "You manage Granite Health Insurance's project to move its claims archive to a new document-management system. The archive contains members' personal data and is classified \"confidential\". A contracting firm will do the data migration.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The contractor's lead asks for administrator accounts for all eight contractors, a shared password so they can \"work quickly\", and permission to copy the archive to their laptops to test scripts at home.",
          ask: "How do you respond?",
          parts: [
            part(
              "Access",
              "Applies least privilege and need-to-know (only the accounts and permissions each person needs, individually named, no shared password) and requires multifactor authentication and controlled remote access.",
              "No shared password and no blanket admin rights. Each contractor gets a named account with only the permissions their task needs, protected by multifactor authentication, and reaches our systems only through the approved remote-access gateway."
            ),
            part(
              "Data handling",
              "Refuses copying confidential data to personal/unmanaged devices; offers a controlled alternative (masked or synthetic test data, or a secure test environment) consistent with data classification and corporate policy.",
              "Confidential member data can't be copied to laptops or taken home. They can test scripts on masked or synthetic data in our secure test environment, and run the real migration only in the controlled production window."
            ),
          ],
        },
        {
          text: "Security policy also requires background screening for anyone with access to member data. Two of the contractors haven't been screened, and the migration window is in three weeks.",
          ask: "What do you do?",
          parts: [
            part(
              "Screening",
              "Does not grant those two access until screening is complete; requests screening now or asks for already-screened replacements; records it as a risk/issue with an owner.",
              "Those two get no access to member data until screening is complete. Ask the contractor to start screening today or substitute screened staff, and log it as a schedule risk with the contractor lead as owner."
            ),
            part(
              "Communication",
              "Informs the sponsor/security team and the contractor of the requirement and its possible schedule impact, and plans around it (for example the screened six start first).",
              "Tell the sponsor and the security team about the gap and its possible effect on the window, and plan the work so the six screened contractors do the data-touching tasks first."
            ),
          ],
        },
      ],
    },
    {
      slug: "projectplus-deployment-it-concepts",
      objective: "IT concepts relevant to project management",
      kind: "build",
      title: "Plan a software deployment the IT way",
      brief:
        "Harrow Valley Schools is upgrading its student-information system across 12 schools. The vendor supplies a database upgrade and a new web application. Schools are open 08:00-16:00 on weekdays; parents use the web portal in the evenings. IT has development, test and production environments, a change advisory board (CAB) that meets on Tuesdays, and a change freeze during exam weeks.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan the deployment.",
          parts: [
            part(
              "Environments",
              "Describes moving the release through development -> test (with UAT by school staff) -> production, not straight to production.",
              "The vendor installs it in development first, then in test where school office staff run UAT with copies of real-format test data; only after sign-off is it promoted to production."
            ),
            part(
              "Change approval and window",
              "Submits the change to the CAB, avoids the exam-week freeze, and picks a maintenance window outside school hours and parents' evening use (for example a Saturday morning), communicating the downtime.",
              "Submit the change to the Tuesday CAB with the plan and risk assessment. Schedule it outside exam weeks, in a Saturday 06:00-10:00 window when schools are closed and parent use is lowest, and notify schools and parents a week ahead."
            ),
            part(
              "Rollback (backout) plan",
              "Includes a full backup before the change, a go/no-go checkpoint, defined criteria for rolling back, and the steps and time needed to restore.",
              "Full database backup and snapshot before starting. Go/no-go at 09:00: if smoke tests on login, timetable and grades fail, restore the backup and the old application (about 45 minutes, tested in the test environment beforehand) and reschedule."
            ),
            part(
              "Post-deployment",
              "Plans post-deployment checks and support (smoke tests, monitoring, hypercare or warranty period with the vendor, user communications).",
              "Smoke test immediately; monitor errors and performance; staff a support line on Monday morning; agree a two-week warranty period with the vendor for defect fixes."
            ),
          ],
        },
      ],
    },
    // REQ-295 (2026-11-14): density fill to 3 / 3 / 2 / 2. Concepts from
    // the Project+ objectives the set cites; values are the fictional
    // project's own.
    {
      slug: "projectplus-charter-review",
      objective: "Project initiation",
      kind: "build",
      title: "Review a draft project charter",
      brief:
        "Ashdown Veterinary Group (fictional) is starting a project to move its six clinics to a new appointment-booking system. The draft charter says:\n\n1. Purpose: replace the paper diary and phone-only booking with online booking.\n2. Sponsor: the operations director, who funds the project and approves the charter.\n3. Scope: everything needed for a better client experience.\n4. Success: clients like it.\n5. High-level milestones: vendor chosen by February, pilot clinic live in April, all clinics by July.\n6. Budget: to be decided later by whoever is free.\n7. Project manager: named, with authority to assign the project team's work.\n8. Key risk: clinics' internet connections may be unreliable.",
      safetyNote: GENERAL_SAFETY,
      noValueSource: "Reviews the fictional draft charter in the brief; quotes no outside value.",
      steps: [
        {
          text: "",
          ask: "Tap the charter lines that need rewriting, then rewrite them.",
          parts: [
            selectPart(
              "Lines that need rewriting",
              "Met: exactly 3 (scope with no boundary), 4 (success that cannot be measured) and 6 (no budget and no owner). (Right picks minus wrong picks) of at least two is partly there.",
              "A charter authorizes the project, so it must bound it. 'Everything needed for a better client experience' sets no limit and invites scope creep. 'Clients like it' cannot be measured, so nobody can say the project succeeded. A budget 'decided later by whoever is free' gives no funding authority and no owner. The purpose, sponsor, milestones, PM authority and the first risk are what a charter should say.",
              {
                display: "list",
                lines: ["1. Purpose: replace the paper diary and phone-only booking with online booking", "2. Sponsor: the operations director, who funds and approves", "3. Scope: everything needed for a better client experience", "4. Success: clients like it", "5. Milestones: vendor by February, pilot in April, all clinics by July", "6. Budget: to be decided later by whoever is free", "7. Project manager: named, with authority to assign team work", "8. Key risk: clinics' internet may be unreliable"],
                correct: [2, 3, 5],
              }
            ),
            part(
              "Rewritten lines",
              "Scope: in-scope and out-of-scope items (e.g. in: online booking, staff diary, reminders, data migration for six clinics; out: billing, medical records, telephone system). Success: measurable criteria with targets and dates (e.g. a share of bookings made online within three months of go-live, phone booking time reduced, no lost appointments in migration). Budget: a high-level amount or range approved by the sponsor, with who controls it and the change process for exceeding it.",
              "3. Scope: In -- online booking for the six clinics, the staff appointment diary, automatic reminders, moving future appointments from the paper diaries, staff training. Out -- billing, clinical records, replacing the phone system.\n4. Success: by three months after the last clinic goes live, at least 40% of appointments booked online; average time on booking calls down by a quarter; zero appointments lost in the migration; within the approved budget. (Targets agreed with the sponsor -- these are examples.)\n6. Budget: a summary budget or range approved by the operations director, held by the project manager, with any overrun beyond an agreed tolerance going to the sponsor through change control."
            ),
          ],
        },
      ],
    },
    {
      slug: "projectplus-closing-sequence",
      objective: "Project closing",
      kind: "build",
      title: "Close the booking-system project properly",
      brief:
        "Ashdown Veterinary Group's (fictional) booking system is live in all six clinics. The vendor's last invoice is still open, two contractors are booked until month end, the shared project folder is a mess, and the sponsor wants to 'just call it done' so the team can start the next project.",
      safetyNote: GENERAL_SAFETY,
      noValueSource: "Applies project-closing practice to the fictional project; quotes no outside value.",
      steps: [
        {
          text: "",
          ask: "Put the closing activities in order, then explain what is lost if the sponsor skips closing.",
          parts: [
            orderPart(
              "Closing order",
              "Met: exactly -- confirm deliverables are accepted (sign-off); hand over to operations support; close the vendor contract and settle the final invoice; release contractors and team members; hold the lessons-learned session; archive the project records; issue the closing report. Up to two single moves from that is partly there.",
              "Acceptance comes first, because everything else assumes the work is done. Operations must own the system before the project team leaves. Contracts are closed once deliverables are accepted (the final invoice is paid against acceptance). People are released after handover. Lessons are gathered while people are still available, then records are archived, and the closing report summarizes it all for the sponsor.",
              ["Confirm deliverables are accepted, with sign-off", "Hand over to operations support", "Close the vendor contract and settle the final invoice", "Release contractors and team members", "Hold the lessons-learned session", "Archive the project records", "Issue the closing report to the sponsor"]
            ),
            part(
              "What skipping closing loses",
              "Without formal acceptance, disputes over 'done' and open defects; without handover, nobody owns support; the open contract can be paid wrongly or left exposed (warranty, final deliverables, contractors billing unneeded days); no lessons learned for the next project; lost records needed for audits and the next phase; resources not formally released and benefits not tracked. Closing is short when planned.",
              "Skip it and: nobody has formally accepted the system, so open defects become arguments; support has no clear owner when a clinic calls; the vendor invoice is paid without checking every deliverable and the warranty terms, and the two contractors bill days nobody needs; the lessons from six roll-outs are lost just before the next project; the documents an auditor or the next phase will need are scattered; and the benefits (online bookings, call time) are never measured against the charter. Closing a project like this takes days, not weeks, and the next project starts with fewer surprises."
            ),
          ],
        },
      ],
    },
    {
      slug: "projectplus-quality-charts",
      objective: "Quality and performance charts",
      kind: "build",
      title: "Choose the chart for each quality question",
      brief:
        "Ashdown Veterinary Group's (fictional) project team logged 120 booking-system support tickets in the first month. The steering group asks five questions:\n\nA. Which few ticket categories cause most of the tickets?\nB. Is the daily ticket count stable, or is something out of control?\nC. How are ticket resolution times spread out -- mostly quick, or a long tail?\nD. Does the number of tickets rise with the number of new staff trained that day?\nE. What possible causes sit behind 'double-booked appointments'?",
      safetyNote: GENERAL_SAFETY,
      noValueSource: "Classifies quality charts for the fictional ticket data; quotes no outside value.",
      steps: [
        {
          text: "",
          ask: "Match each question to its chart, then explain how to read the Pareto chart for A.",
          parts: [
            matchPart(
              "Chart for each question",
              "Met: all five right -- A Pareto chart; B control chart; C histogram; D scatter diagram; E cause-and-effect (fishbone) diagram. Four right is partly there.",
              "A Pareto chart sorts categories by count with a cumulative line, showing the vital few. A control chart plots a measure over time against control limits to separate normal variation from special causes. A histogram shows the shape of a distribution. A scatter diagram shows whether two variables move together. A fishbone diagram organizes possible causes of one effect. A Gantt chart is a schedule tool, not a quality chart.",
              {
                leftHeading: "Question",
                rightHeading: "Chart",
                left: ["A: the few categories causing most tickets", "B: is the daily count stable", "C: the spread of resolution times", "D: tickets vs staff trained that day", "E: possible causes of double bookings"],
                right: ["Pareto chart", "Control chart", "Histogram", "Scatter diagram", "Cause-and-effect (fishbone) diagram", "Gantt chart"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Reading the Pareto chart",
              "Bars sorted from most to fewest tickets per category with a cumulative-percentage line; read across from about 80% on the line to find the few categories that account for most tickets and target those first (the 80/20 idea is a heuristic, not a law); categories should be meaningful and 'other' kept small; recheck after fixes to see whether the order changes.",
              "The categories are sorted left to right from most to fewest tickets, and a line climbs to 100% showing the running total. Read where the line passes roughly 80%: the bars to the left of that point are the few categories driving most of the 120 tickets, so fixes there pay off most. The 80/20 split is a rule of thumb, not a law -- the chart may show 3 categories making 60%, and that is still the answer. Keep the categories specific (a big 'other' bar hides the cause), and redraw the chart after the fixes to see what rises to the top next."
            ),
          ],
        },
      ],
    },
  ],
};
