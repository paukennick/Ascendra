import { GENERAL_SAFETY, matchPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-280: CSM (Scrum Alliance). Built on the Scrum Foundations and CSM
// Learning Objectives (January 2022) and the Scrum Guide (November 2020),
// read 2026-11-14. The Agile Manifesto's four values are quoted in their
// short form only. Density (hybrid, study-emphasis weights
// 14/15/27/21/6/17): 2 / 2 / 3 / 2 / 1 / 2 = 12 labs.

const CHECKED = "2026-11-14";

export const CSM_LABS: SeedLabSet = {
  trackCode: "CSM",
  sources: [
    source("https://www.scrumalliance.org/media/certifications/los/csm_learning_objectives_2022.pdf", "exam_outline", CHECKED),
    source("https://www.scrumalliance.org/media/certifications/los/scrum_foundations_learning_objectives_2022.pdf", "exam_outline", CHECKED),
    source("https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf", "reference", CHECKED),
  ],
  labs: [
    // Scrum Theory and Values (2)
    {
      slug: "csm-partial-scrum",
      objective: "Describing what goes wrong when Scrum is only partly put in place",
      kind: "case",
      title: "Scrum, minus the parts we didn't like",
      brief:
        "The fictional Kestrel Logistics IT group adopted Scrum a year ago but dropped the Sprint Retrospective ('we're too busy') and lets the business change Sprint scope at will.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Leadership says Scrum 'doesn't work here': delivery is unpredictable and the same problems recur.",
          ask: "Explain how the two changes produce those two symptoms.",
          parts: [
            part(
              "Recurring problems",
              "Links dropping the retrospective to losing the team's main point of inspecting and adapting how it works, so problems recur.",
              "Without the Sprint Retrospective the team never inspects how it works, so it never adapts; the same problems come back every Sprint."
            ),
            part(
              "Unpredictable delivery",
              "Links uncontrolled scope changes to losing the Sprint Goal's focus and any basis for forecasting.",
              "Changing scope at will removes the Sprint Goal's focus, so the team rarely finishes what it started and has no stable basis for forecasting."
            ),
          ],
        },
        {
          text: "The group asks whether it should drop Scrum altogether.",
          ask: "What do you advise first?",
          parts: [
            part(
              "Advice",
              "Advises restoring the missing elements (retrospective, protected Sprint Goal with changes through the Product Owner) before judging Scrum, noting partial Scrum is not Scrum.",
              "Restore the missing parts first: hold the retrospective every Sprint and route change requests through the Product Owner so the Sprint Goal is protected. Scrum's parts work together; judging it with parts missing is judging something else."
            ),
          ],
        },
      ],
    },
    {
      slug: "csm-manifesto-values",
      objective: "Relating Scrum to the values and principles of the Manifesto for Agile Software Development",
      kind: "build",
      title: "Where Scrum lives the Agile Manifesto",
      brief:
        "A fictional team lead at Fernhill Media asks how Scrum relates to the Agile Manifesto. Map each Manifesto value to the Scrum element that most directly puts it into practice.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each value to a Scrum element, then explain one pairing.",
          parts: [
            matchPart(
              "Value to Scrum element",
              "All four correct is met; two or three is partly there.",
              "Individuals and interactions: the Daily Scrum and a self-managing team. Working software: a Done Increment every Sprint. Customer collaboration: the Sprint Review with stakeholders. Responding to change: an emergent, re-ordered Product Backlog each Sprint.",
              {
                left: [
                  "Individuals and interactions over processes and tools",
                  "Working software over comprehensive documentation",
                  "Customer collaboration over contract negotiation",
                  "Responding to change over following a plan",
                ],
                right: [
                  "A self-managing team that plans together every day",
                  "A Done Increment every Sprint",
                  "The Sprint Review as a working session with stakeholders",
                  "An emergent Product Backlog re-ordered as we learn",
                  "A detailed project plan signed off up front",
                ],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Explain one",
              "Explains one pairing with how the Scrum element embodies the value.",
              "The Sprint Review lives customer collaboration: stakeholders inspect the real Increment with the team and help decide what comes next, rather than holding the team to a fixed contract."
            ),
          ],
        },
      ],
    },

    // The Scrum Team (2)
    {
      slug: "csm-po-authority",
      objective: "Explaining how the Product Owner keeps authority over the Product Backlog while working with the Developers and stakeholders",
      kind: "case",
      title: "The VP who edits the backlog",
      brief:
        "At the fictional Bluefield Health Portal, a vice president adds items to the top of the Product Backlog directly each week.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The Product Owner feels undermined; the Developers no longer know what matters most.",
          ask: "What does the Scrum Guide say about who orders the Product Backlog, and how should the VP's needs get in?",
          parts: [
            part(
              "Authority",
              "States the Product Owner is accountable for the Product Backlog and its order and the organization must respect the Product Owner's decisions.",
              "The Product Owner is accountable for the Product Backlog and its order, and the organization must respect those decisions for the Product Owner to succeed."
            ),
            part(
              "The VP's route",
              "Routes the VP's needs through the Product Owner (conversation, refinement, Sprint Review) rather than direct edits.",
              "The VP brings needs to the Product Owner, joins refinement or the Sprint Review, and the Product Owner decides where they go."
            ),
          ],
        },
        {
          text: "The Product Owner asks you, the Scrum Master, for help.",
          ask: "How do you support the Product Owner?",
          parts: [
            part(
              "Support",
              "Coaches the PO and helps the organization understand the role (e.g. a conversation with the VP, making ordering criteria transparent), without taking over the PO's decisions.",
              "Coach the Product Owner to make the ordering criteria visible and to meet the VP regularly, and help the VP understand the role. You support the Product Owner; you do not make the backlog decisions."
            ),
          ],
        },
      ],
    },
    {
      slug: "csm-cross-functional-team",
      objective: "Describing the Scrum Team as one cross-functional, self-managing unit with no sub-teams or hierarchies",
      kind: "build",
      title: "Redesign a team of hand-offs",
      brief:
        "The fictional Ridgeway Tax app has a 'Scrum Team' of 14: a design sub-team, a back-end sub-team, a test sub-team and a team lead who assigns work. Work waits days between sub-teams.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select what conflicts with the Scrum Guide and propose a structure that fits it, with three benefits.",
          parts: [
            selectPart(
              "What conflicts with the Guide",
              "Selecting the three conflicting features and nothing else is met; two of them is partly there.",
              "Sub-teams by skill, a lead who assigns work (a hierarchy inside the team) and a size of 14 (the Guide says typically 10 or fewer) conflict with one cross-functional, self-managing team. One Product Owner and one Product Backlog are fine.",
              {
                lines: [
                  "Separate design, back-end and test sub-teams",
                  "A team lead who assigns work to each person",
                  "14 people in the one team",
                  "One Product Owner for the product",
                  "One Product Backlog for the product",
                ],
                correct: [0, 1, 2],
                display: "list",
              }
            ),
            part(
              "New structure",
              "Proposes splitting into two cross-functional teams, each with all skills to create a Done Increment, sharing one Product Owner and Product Backlog.",
              "Split into two cross-functional teams of about seven, each able to design, build and test a Done Increment, both working from one Product Backlog with one Product Owner."
            ),
            part(
              "Benefits",
              "Lists at least three benefits such as fewer hand-offs and waits, shared ownership of quality, faster feedback, better communication in smaller teams.",
              "Fewer hand-offs and waits, shared ownership of quality, faster feedback, and better communication in smaller teams."
            ),
          ],
        },
      ],
    },

    // Scrum Events and Activities (3)
    {
      slug: "csm-perform-sprint-planning",
      objective: "Running Sprint Planning that answers why, what and how within its timebox",
      kind: "build",
      title: "Run a Sprint Planning",
      brief:
        "You facilitate Sprint Planning for a fictional two-week Sprint at Cobalt Courier. The Product Owner's top items concern letting customers reschedule a delivery.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Put the three topics of Sprint Planning in order, then draft a Sprint Goal and say who decides how much work is selected.",
          parts: [
            orderPart(
              "Planning flow",
              "The Guide's order (why, what, how) with the result last is met; one item out of place is partly there.",
              "Topic one: why is this Sprint valuable (the Sprint Goal). Topic two: what can be Done. Topic three: how the chosen work gets done. Together they form the Sprint Backlog.",
              [
                "Why is this Sprint valuable? (craft the Sprint Goal)",
                "What can be Done this Sprint? (Developers select items)",
                "How will the chosen work get done? (Developers plan the work)",
                "The Sprint Goal, selected items and plan form the Sprint Backlog",
              ]
            ),
            part(
              "Sprint Goal",
              "Writes a single, outcome-focused objective (e.g. customers can reschedule a delivery themselves) rather than a list of tasks.",
              "Customers can reschedule a delivery themselves in the app without calling support."
            ),
            part(
              "Who selects",
              "States the Developers select how many items they can complete, informed by past performance and capacity; the Product Owner clarifies.",
              "The Developers select how much they can complete, using their past performance and capacity; the Product Owner explains the items and their value."
            ),
          ],
        },
      ],
    },
    {
      slug: "csm-daily-scrum-vs-status",
      objective: "Comparing the Daily Scrum with a status meeting and why its constraints serve the Developers",
      kind: "case",
      title: "The 40-minute stand-up",
      brief:
        "At the fictional Amberline Retail, the Daily Scrum takes 40 minutes: each developer reports to the Scrum Master in turn while a manager takes notes.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Developers say the meeting is useless and want to skip it.",
          ask: "Give three ways this differs from a Daily Scrum.",
          parts: [
            part(
              "Differences",
              "Gives at least three: it is for the Developers to plan, not report; it is 15 minutes; it inspects progress toward the Sprint Goal and adapts the Sprint Backlog; the Scrum Master does not run it as a report.",
              "A Daily Scrum is the Developers' own 15-minute event; it inspects progress toward the Sprint Goal and adapts the plan for the next day; it is not a report to the Scrum Master or a manager."
            ),
          ],
        },
        {
          text: "The manager says he needs the updates.",
          ask: "How do you meet the manager's need and restore the event?",
          parts: [
            part(
              "Manager's need",
              "Offers transparency through the Sprint Backlog, information radiators and the Sprint Review, and asks the manager not to direct the Daily Scrum.",
              "Point the manager to the visible Sprint Backlog and the Sprint Review; the Daily Scrum belongs to the Developers."
            ),
            part(
              "Constraints",
              "Explains how the 15-minute timebox and same time and place reduce complexity and keep the focus on the plan.",
              "Keeping it to 15 minutes, at the same time and place each day, keeps it short and focused on the plan; detailed discussions happen afterward with the people who need them."
            ),
          ],
        },
      ],
    },
    {
      slug: "csm-perform-retrospective",
      objective: "Running a Sprint Retrospective that finds the most helpful improvements for the next Sprint",
      kind: "build",
      title: "Design a retrospective",
      brief:
        "A fictional team at Thornbury Analytics missed its Sprint Goal after a database migration ran long. Design their 90-minute retrospective for a two-week Sprint.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the agenda, what it must produce, and one risk you will watch for.",
          parts: [
            part(
              "Agenda",
              "Covers setting the stage, gathering data on individuals, interactions, processes, tools and the Definition of Done, finding insights or root causes, and deciding actions, inside the timebox.",
              "Set the stage (5 min), gather data on what happened with people, process, tools and Done (25 min), find causes of the migration overrun (30 min), decide improvements (20 min), close (10 min)."
            ),
            part(
              "Output",
              "States the team identifies the most helpful changes and may add them to the next Sprint Backlog.",
              "One or two of the most helpful improvements, owned by the team, which can go into the next Sprint Backlog."
            ),
            part(
              "Risk",
              "Names a facilitation risk (blame, dominant voices, too many actions) and how to handle it.",
              "Blame for the migration. Keep the focus on the system -- how the work was planned and tested -- and use silent writing so quieter people are heard."
            ),
          ],
        },
      ],
    },

    // Scrum Artifacts and Commitments (2)
    {
      slug: "csm-create-definition-of-done",
      objective: "Writing and evolving a Definition of Done, including organizational standards and teams that share one",
      kind: "build",
      title: "Write a first Definition of Done",
      brief:
        "A fictional new team at Wrenfield Council builds a resident-services web form. The council requires accessibility to WCAG and a security review for anything that stores personal data.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Draft the Definition of Done, say how the team would create it, and how it should change over time.",
          parts: [
            part(
              "Draft",
              "Lists checkable quality criteria including the organizational standards (accessibility, security review) and testing, integration and deployability.",
              "Code reviewed; automated tests pass; integrated into the main branch; meets WCAG accessibility checks; security review done for anything storing personal data; deployed to a production-like environment; user-facing text proofread."
            ),
            selectPart(
              "Not a Definition of Done item",
              "Selecting the two lines that are not quality criteria for the Increment and nothing else is met; one of them is partly there.",
              "A Definition of Done describes the quality an Increment must meet. 'Finished by Friday' is a deadline and 'the Product Owner likes it' is acceptance of value, not a quality standard. The others are checkable quality criteria.",
              {
                lines: [
                  "Automated tests pass",
                  "Meets the council's WCAG accessibility checks",
                  "Finished by Friday",
                  "Security review done for anything storing personal data",
                  "The Product Owner likes it",
                  "Deployed to a production-like environment",
                ],
                correct: [2, 4],
                display: "list",
              }
            ),
            part(
              "How created",
              "Describes the Scrum Team creating it together, starting from the organization's standards as the minimum.",
              "The Scrum Team writes it together in a workshop, starting from the council's standards, which are the minimum, and adds what they need for a usable Increment."
            ),
            part(
              "Evolving",
              "Explains it tightens over time as the team matures (e.g. after retrospectives) and that several teams on one product share it.",
              "It gets stronger over time as the team improves, usually through retrospectives, and if more teams join this product they share one Definition of Done."
            ),
          ],
        },
      ],
    },
    {
      slug: "csm-sprint-goal-fixed",
      objective: "Explaining why the Sprint Goal stays fixed during the Sprint while the Sprint Backlog can change",
      kind: "case",
      title: "New information mid-Sprint",
      brief:
        "A fictional Sprint at Larkspur Travel has the goal 'travelers can see live gate changes in the app'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Halfway through, the developers learn the airport feed sends gate data in a different format than planned. Two planned items no longer make sense; a new parsing item is needed.",
          ask: "Can the Sprint Backlog change? Can the Sprint Goal?",
          parts: [
            part(
              "Sprint Backlog",
              "States the Developers may change the Sprint Backlog as they learn, keeping the goal in view.",
              "Yes: the Sprint Backlog is the Developers' plan and they adapt it as they learn, swapping the two items for the parsing work."
            ),
            part(
              "Sprint Goal",
              "States the Sprint Goal does not change during the Sprint; it gives focus and flexibility in how it is achieved; scope is negotiated with the Product Owner if needed.",
              "No: the Sprint Goal stays fixed and gives the team focus. If the work turns out larger, the Developers negotiate scope with the Product Owner without changing the goal."
            ),
          ],
        },
        {
          text: "It becomes clear the goal cannot be met at all this Sprint.",
          ask: "What should happen?",
          parts: [
            part(
              "Response",
              "Developers collaborate with the Product Owner on scope; if the goal becomes obsolete only the PO may cancel; the retrospective examines what was learned.",
              "The Developers tell the Product Owner and negotiate what can still deliver value. If the goal has become obsolete, only the Product Owner may cancel the Sprint. Either way the retrospective looks at what was learned."
            ),
          ],
        },
      ],
    },

    // Scrum Master Core Competencies (1)
    {
      slug: "csm-group-decision-techniques",
      objective: "Facilitating group decisions with techniques such as fist of five, dot voting and a decision rule agreed in advance",
      kind: "build",
      title: "Three ways to decide together",
      brief:
        "The fictional Oakmere Bank team must choose between two test frameworks, and the discussion has gone in circles for two retrospectives.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe three facilitation techniques you could use and pick one for this case.",
          parts: [
            part(
              "Three techniques",
              "Describes three techniques correctly, e.g. fist of five (gauging support), dot voting (prioritizing options), agreeing a decision rule first (consensus, consent or a decider after consultation).",
              "Fist of five: everyone shows 0-5 fingers to show support, and low scores are discussed. Dot voting: each person places a few dots on options to prioritize. Agree the decision rule first: decide whether it will be consensus, consent or one person deciding after hearing everyone."
            ),
            part(
              "Choice",
              "Picks one and explains why it fits a circular two-option debate (e.g. agree the decision rule and a timebox, then a fist-of-five check).",
              "Agree the decision rule and a 30-minute timebox first, list the criteria, then check support with fist of five. The circling comes from no agreed way to decide, not from missing facts."
            ),
          ],
        },
      ],
    },

    // Service to the Team, Product Owner and Organization (2)
    {
      slug: "csm-resolve-impediment",
      objective: "Applying a technique to resolve an impediment, and deciding when the team should solve it themselves",
      kind: "case",
      title: "Waiting on the database team",
      brief:
        "The fictional Sandpiper Insurance Scrum Team waits three to five days every Sprint for a separate database team to approve schema changes.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The team raises it at the Daily Scrum again.",
          ask: "Is this an impediment for the team to solve or for the Scrum Master to help remove? Explain.",
          parts: [
            part(
              "Whose to solve",
              "Identifies it as an organizational impediment outside the team's control that the Scrum Master helps remove, while the team owns what it can change inside.",
              "It sits outside the team's authority -- another team's approval process -- so the Scrum Master helps remove it, while the team handles what it controls, such as submitting changes earlier."
            ),
          ],
        },
        {
          text: "You meet the database manager, who worries about unreviewed changes breaking production.",
          ask: "Apply one technique to resolve it.",
          parts: [
            part(
              "Technique",
              "Applies a concrete technique (e.g. root cause / 5 whys, inviting a database engineer into the team or a shared Definition of Done item, agreed standard changes) that addresses the manager's concern.",
              "Use 5 whys with both teams: the delay exists to protect production. Propose a database engineer joining refinement and a Definition of Done item for schema review, so review happens inside the Sprint without a hand-off."
            ),
            part(
              "Follow-up",
              "Makes the impediment and its effect transparent and checks the result in a later retrospective.",
              "Track the waiting time visibly, and review it at the next retrospective to see whether the change worked."
            ),
          ],
        },
      ],
    },
    {
      slug: "csm-quality-practices",
      objective: "Choosing development practices that keep each Increment high quality: test automation, continuous integration, pairing and refactoring",
      kind: "build",
      title: "Practices against technical debt",
      brief:
        "The fictional Ironwood Payroll team's Increments keep breaking older features, and each Sprint finishes less as debt grows.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each symptom to the practice that most directly addresses it, then explain what accumulating technical debt does to the team.",
          parts: [
            matchPart(
              "Symptom to practice",
              "All four correct is met; two or three is partly there.",
              "Old features breaking unnoticed: automated regression tests. Merge conflicts at the end of the Sprint: continuous integration. Knowledge held by one person: pairing. Code that is hard to change: refactoring.",
              {
                left: [
                  "Old features break and nobody notices until users complain",
                  "Big merge conflicts on the last day of the Sprint",
                  "Only one developer understands the tax module",
                  "Every change to the payslip code takes twice as long as it should",
                ],
                right: ["Automated regression tests", "Continuous integration", "Pair programming", "Refactoring", "A longer Sprint"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Impact of debt",
              "Explains debt slows delivery, makes the Increment's quality and forecasts less transparent, and compounds if not paid down each Sprint.",
              "Technical debt makes every change slower and riskier, hides the true state of the Increment, and compounds over time, so the team delivers less each Sprint unless it pays some down every Sprint."
            ),
          ],
        },
      ],
    },
  ],
};
