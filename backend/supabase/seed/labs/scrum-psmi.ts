import { GENERAL_SAFETY, matchPart, numericPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-280: PSM I (Scrum.org). Built on the Scrum Guide (November 2020) and
// Scrum.org's PSM I focus areas, both read 2026-11-14. Timeboxes and rules
// quoted here are the Guide's (one-month Sprint maxima). Density (hybrid,
// study-emphasis weights 15/15/20/20/10/20): 2 per unit = 12 labs.

const CHECKED = "2026-11-14";

export const PSMI_LABS: SeedLabSet = {
  trackCode: "PSMI",
  sources: [
    source("https://www.scrum.org/assessments/professional-scrum-master-i-certification", "exam_outline", CHECKED),
    source("https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf", "reference", CHECKED),
  ],
  labs: [
    // Scrum Theory, Empiricism and Values (2)
    {
      slug: "psm-pillars-hidden-work",
      objective:
        "Applying the three pillars -- transparency, inspection and adaptation -- to spot where a team has stopped inspecting or adapting",
      kind: "case",
      title: "The board that always looks green",
      brief:
        "Lumen Freight (fictional) runs one Scrum Team on its shipment-tracking app. For three Sprints the Sprint Review has shown every item as complete, yet support tickets about the features shown keep rising.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You find that items are marked complete when the code is merged; testing and the release happen 'later, when there is time'. The Definition of Done says only 'code reviewed and merged'.",
          ask: "Which empirical pillar is failing first, and what does that do to the other two?",
          parts: [
            part(
              "The failing pillar",
              "Names transparency: the Increment's real state is hidden because 'complete' does not mean usable, so the artifact misleads.",
              "Transparency. 'Complete' only means merged, so the Increment looks done when it is not usable, and nobody can see the gap."
            ),
            part(
              "Knock-on effect",
              "Explains that inspection of a non-transparent artifact is misleading and so adaptation is made on false information (wasteful or wrong decisions).",
              "Inspection at the Sprint Review is of a misleading artifact, so the decisions made there -- the adaptation -- rest on false information. The rising tickets are the cost."
            ),
          ],
        },
        {
          text: "The Developers say tightening Done would slow them down and make the Sprint Review look worse.",
          ask: "What do you, as Scrum Master, do?",
          parts: [
            part(
              "Action",
              "Helps the team strengthen the Definition of Done (tested, integrated, releasable) and accepts that fewer items will be Done; frames a worse-looking review as more honest, not worse work.",
              "Coach the team to raise the Definition of Done to tested, integrated and releasable. Fewer items will be Done at first, and that is the point: the Sprint Review will finally show the real state, so the Product Owner and stakeholders can adapt."
            ),
            part(
              "Undone work",
              "States that items not meeting the new Definition of Done are not shown as Done and return to the Product Backlog.",
              "Anything that does not meet the Definition of Done is not part of the Increment and is not presented as Done; it goes back to the Product Backlog for the Product Owner to order."
            ),
          ],
        },
      ],
    },
    {
      slug: "psm-values-in-behavior",
      objective: "Recognizing the five Scrum values in a team's behavior and what happens when they erode",
      kind: "build",
      title: "Name the value behind the behavior",
      brief:
        "You are observing a fictional Scrum Team at Harbor Tiles for a Sprint. You note five moments. Match each to the Scrum value it most clearly shows.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each behavior to the value, then say what you would expect to see if the courage value eroded.",
          parts: [
            matchPart(
              "Behavior to value",
              "All five pairs correct is met; three or four is partly there.",
              "Raising a risk in the Daily Scrum is courage; declining an urgent side request to protect the Sprint Goal is focus; showing unfinished work honestly is openness; the team keeping its Sprint Goal promise is commitment; trusting a colleague's different approach is respect.",
              {
                left: [
                  "A developer says in the Daily Scrum that her estimate was wrong and the item is at risk",
                  "The team declines a manager's side request that would derail the Sprint Goal",
                  "The team shows stakeholders an item that is half built and says so",
                  "The team works together to reach the Sprint Goal they set",
                  "A tester accepts a colleague's different approach to automation and learns from it",
                ],
                right: ["Courage", "Focus", "Openness", "Commitment", "Respect"],
                pairs: [0, 1, 2, 3, 4],
                leftHeading: "Behavior",
                rightHeading: "Scrum value",
              }
            ),
            part(
              "When courage erodes",
              "Describes concrete signs (problems hidden until late, nobody challenges unrealistic plans, silent retrospectives) and links them to weaker transparency.",
              "Problems surface late or not at all, nobody challenges an unrealistic forecast, and retrospectives go quiet. Without courage, transparency fails first, and inspection and adaptation follow."
            ),
          ],
        },
      ],
    },

    // The Scrum Team and Its Accountabilities (2)
    {
      slug: "psm-who-is-accountable",
      objective: "Assigning the Product Owner's accountabilities for value and the Product Backlog, and why the Product Owner is one person",
      kind: "build",
      title: "Whose call is it?",
      brief:
        "At the fictional Copperleaf Bank, people keep asking who decides what. List the accountability for each decision under the 2020 Scrum Guide.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each decision to the accountable party, then explain why a committee of three managers cannot be the Product Owner.",
          parts: [
            matchPart(
              "Decision to accountability",
              "All four correct is met; two or three is partly there.",
              "Ordering the Product Backlog is the Product Owner's; the plan for turning items into a Done Increment (the Sprint Backlog) is the Developers'; the Scrum Team's effectiveness is the Scrum Master's; creating a valuable, useful Increment every Sprint belongs to the whole Scrum Team. A project sponsor is not a Scrum accountability.",
              {
                left: [
                  "The order of the Product Backlog",
                  "The plan for turning the selected items into a Done Increment",
                  "The Scrum Team's effectiveness",
                  "Creating a valuable, useful Increment every Sprint",
                ],
                right: ["Product Owner", "Developers", "Scrum Master", "The whole Scrum Team", "The project sponsor"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "One person",
              "Explains the Product Owner is one person so one view of value decides ordering and the team gets clear decisions; others may influence through the Product Owner and decisions are visible in the backlog.",
              "The Product Owner is one person, not a committee, so there is one accountable view of value and the Developers get clear, fast decisions. The three managers can feed their needs in through the Product Owner, and the Product Owner's decisions are visible in the content and order of the Product Backlog."
            ),
          ],
        },
      ],
    },
    {
      slug: "psm-scaling-one-product",
      objective: "Organizing several Scrum Teams on one product around one Product Backlog, one Product Owner and one Product Goal",
      kind: "case",
      title: "Three teams, one checkout",
      brief:
        "Tidewater Market (fictional) is growing its online checkout from one Scrum Team to three. A manager proposes each team gets its own Product Owner and backlog 'to keep things simple'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The three teams will all change the same checkout product.",
          ask: "Respond to the proposal using the Scrum Guide.",
          parts: [
            part(
              "Structure",
              "States the teams share one Product Goal, one Product Backlog and one Product Owner because it is one product.",
              "It is one product, so the three teams share one Product Goal, one Product Backlog and one Product Owner. Three backlogs would split one view of value into three competing ones."
            ),
            part(
              "Done",
              "States the teams share one Definition of Done so their work integrates into one Increment.",
              "They also need one shared Definition of Done, so all three teams' work integrates into one usable Increment."
            ),
          ],
        },
        {
          text: "Two Sprints in, the teams' work conflicts at integration and the Product Owner is overloaded.",
          ask: "What can change without breaking the Scrum Guide?",
          parts: [
            part(
              "Options",
              "Proposes options such as integrating continuously, coordinating through refinement and shared events, and the Product Owner delegating backlog work while remaining accountable.",
              "Integrate continuously instead of at the end, refine together so dependencies show early, and let the Product Owner delegate some backlog work to others while staying accountable for it."
            ),
          ],
        },
      ],
    },

    // Scrum Events (2)
    {
      slug: "psm-sprint-event-sequence",
      objective: "Explaining the Sprint as the container for every other event, with a fixed length of one month or less",
      kind: "build",
      title: "Put a Sprint in order",
      brief:
        "A new hire at the fictional Pinecrest Clinic IT team asks how a two-week Sprint runs. Put the events in order and state the limits that apply.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Order the events inside one Sprint, then give the Guide's maximum timeboxes for a one-month Sprint and what happens after the last event.",
          parts: [
            orderPart(
              "Event order",
              "The four events in the Guide's order is met; one item out of place is partly there.",
              "Sprint Planning starts the Sprint; the Daily Scrum happens every working day; the Sprint Review is the second-to-last event; the Sprint Retrospective concludes the Sprint.",
              ["Sprint Planning", "Daily Scrum (every working day)", "Sprint Review", "Sprint Retrospective"]
            ),
            part(
              "Timeboxes",
              "Sprint Planning at most 8 hours, Daily Scrum 15 minutes, Sprint Review at most 4 hours, Sprint Retrospective at most 3 hours (for a one-month Sprint; shorter Sprints usually shorter).",
              "For a one-month Sprint: Sprint Planning up to 8 hours, the Daily Scrum 15 minutes, the Sprint Review up to 4 hours, the Sprint Retrospective up to 3 hours. For a two-week Sprint they are usually shorter; the Daily Scrum stays 15 minutes."
            ),
            part(
              "Between Sprints",
              "States a new Sprint starts immediately after the previous one concludes (no gap, no 'Sprint zero' between).",
              "Nothing: the next Sprint starts immediately after the previous one ends."
            ),
          ],
        },
      ],
    },
    {
      slug: "psm-obsolete-sprint-goal",
      objective: "Deciding what happens when a Sprint Goal becomes obsolete, and who may cancel a Sprint",
      kind: "case",
      title: "The regulation changed mid-Sprint",
      brief:
        "A fictional payments team at Orchard Pay is halfway through a Sprint whose goal is to launch a new card-on-file flow.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "A regulator announces the flow's design will no longer be allowed from next month. The head of sales tells the developers to stop and switch to another feature.",
          ask: "Who can cancel the Sprint, and on what grounds?",
          parts: [
            part(
              "Authority",
              "States only the Product Owner can cancel a Sprint; the head of sales cannot direct the Developers.",
              "Only the Product Owner has the authority to cancel a Sprint. The head of sales should take the news to the Product Owner, not redirect the Developers."
            ),
            part(
              "Grounds",
              "States a Sprint may be cancelled when the Sprint Goal becomes obsolete, which this news makes likely.",
              "A Sprint can be cancelled if its Sprint Goal becomes obsolete. A ban on the design makes this goal obsolete, so cancellation is a reasonable call for the Product Owner."
            ),
          ],
        },
        {
          text: "The Product Owner cancels the Sprint.",
          ask: "What happens next?",
          parts: [
            part(
              "Next steps",
              "Reviews any Done work (it may still be releasable), returns undone items to the Product Backlog, and starts a new Sprint with Sprint Planning.",
              "Look at what is Done -- it may still be useful -- return undone items to the Product Backlog for re-ordering, and start a new Sprint with Sprint Planning around a new Sprint Goal."
            ),
          ],
        },
      ],
    },

    // Scrum Artifacts, Commitments and Done (2)
    {
      slug: "psm-artifact-commitments",
      objective: "Linking each artifact to its commitment: the Product Goal, the Sprint Goal and the Definition of Done",
      kind: "build",
      title: "Artifacts and their commitments",
      brief:
        "A fictional team at Brightwater Energy keeps mixing up goals and backlogs. Sort it out for them.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each artifact to its commitment, then say what each commitment is for.",
          parts: [
            matchPart(
              "Artifact to commitment",
              "All three correct is met; any distractor chosen or one wrong is partly there.",
              "Product Backlog -> Product Goal; Sprint Backlog -> Sprint Goal; Increment -> Definition of Done. A velocity target and a release date are not Scrum commitments.",
              {
                left: ["Product Backlog", "Sprint Backlog", "Increment"],
                right: ["Product Goal", "Sprint Goal", "Definition of Done", "Velocity target", "Release date"],
                pairs: [0, 1, 2],
              }
            ),
            part(
              "Purpose",
              "Explains the commitments give each artifact a focus to measure progress against and reinforce transparency and empiricism.",
              "Each commitment gives its artifact something to measure progress against -- the long-term objective, the single objective for the Sprint, and the quality bar for usable work -- which keeps the artifacts transparent."
            ),
          ],
        },
      ],
    },
    {
      slug: "psm-undone-at-sprint-end",
      objective: "Deciding what happens to work that does not meet the Definition of Done when the Sprint ends",
      kind: "case",
      title: "Ninety percent done",
      brief:
        "On the last day of a Sprint at the fictional Saltmarsh Games, one of five items fails the regression suite that the Definition of Done requires.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The developer suggests showing it at the Sprint Review as 'done except tests' and extending the Sprint by two days.",
          ask: "Answer both suggestions.",
          parts: [
            part(
              "Showing it",
              "Rejects presenting it as Done: work not meeting the Definition of Done cannot be part of the Increment or presented at the Sprint Review.",
              "It is not Done, so it is not part of the Increment and is not presented as Done at the Sprint Review."
            ),
            part(
              "Extending",
              "Rejects extending: Sprints are a fixed length; the item returns to the Product Backlog.",
              "Sprints are fixed length, so no extension. The item goes back to the Product Backlog for the Product Owner to order, probably near the top."
            ),
          ],
        },
        {
          text: "The team's retrospective finds tests are always run on the last day.",
          ask: "What improvement would you expect them to try?",
          parts: [
            part(
              "Improvement",
              "Proposes testing continuously through the Sprint (automation, testing as items are built), possibly added to the Sprint Backlog as an improvement.",
              "Run the regression suite continuously as items are finished rather than on the last day, and add that improvement to the next Sprint Backlog."
            ),
          ],
        },
      ],
    },

    // Developing People and Teams (2)
    {
      slug: "psm-stance-for-situation",
      objective: "Choosing between facilitating, teaching, mentoring and coaching for a given situation",
      kind: "build",
      title: "Pick the stance",
      brief:
        "As Scrum Master for a fictional team at Granite Labs, you face four situations this week.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each situation to the stance that fits best, and justify one choice.",
          parts: [
            matchPart(
              "Situation to stance",
              "All four correct is met; two or three is partly there.",
              "A new stakeholder who has never heard of Scrum needs teaching; a heated planning discussion needs facilitating; a developer who wants to grow into a Scrum Master role benefits from mentoring; a team member stuck deciding how to handle a conflict is best coached with questions.",
              {
                left: [
                  "A new stakeholder asks what a Sprint Review is for",
                  "Sprint Planning has stalled in an argument between two developers",
                  "A developer wants to learn the Scrum Master role from your experience",
                  "A team member is unsure how to raise a conflict with a colleague",
                ],
                right: ["Teaching", "Facilitating", "Mentoring", "Coaching"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Justify one",
              "Explains one choice by the difference between the stances (e.g. coaching draws out the person's own answer rather than giving yours).",
              "Coaching fits the conflict: asking questions helps the team member find an approach they own, where telling them what to do would make them depend on you."
            ),
          ],
        },
      ],
    },
    {
      slug: "psm-spot-anti-patterns",
      objective:
        "Recognizing Scrum anti-patterns -- the Scrum Master as task assigner, a status-report Daily Scrum, a stabilization Sprint -- and responding to them",
      kind: "build",
      title: "Find the anti-patterns",
      brief:
        "You join the fictional Riverbend Insurance team and read their working agreement. Some lines contradict the Scrum Guide.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the lines that contradict the Scrum Guide, then say how you would address the first one you would tackle.",
          parts: [
            selectPart(
              "Lines that contradict Scrum",
              "Selecting the four contradicting lines and nothing else is met; three of them is partly there.",
              "Contradicting: the Scrum Master assigning tasks (the Developers own the Sprint Backlog), the Daily Scrum as a report to the manager (it is the Developers' planning event), a stabilization Sprint every fourth Sprint (every Sprint delivers a Done Increment), and the Product Owner role shared by two people (one person). The others are fine.",
              {
                lines: [
                  "Sprints are two weeks long",
                  "The Scrum Master assigns tasks to developers each morning",
                  "The Daily Scrum is a report to the department manager",
                  "Every fourth Sprint is a stabilization Sprint to fix bugs",
                  "The Product Backlog is refined throughout the Sprint",
                  "The Product Owner role is shared by two business analysts",
                  "Stakeholders are invited to the Sprint Review",
                ],
                correct: [1, 2, 3, 5],
                display: "list",
              }
            ),
            part(
              "Response",
              "Picks one and describes a respectful, teaching or coaching response (e.g. explain the Daily Scrum's purpose, invite the manager to the Sprint Review instead, let Developers plan their own day).",
              "Start with the Daily Scrum: explain it is the Developers' 15-minute planning event, offer the manager the Sprint Review as the place to see progress, and step back so the Developers run it themselves."
            ),
          ],
        },
      ],
    },

    // Managing Products with Agility (2)
    {
      slug: "psm-empirical-forecast",
      objective:
        "Forecasting and release planning from empirical data such as burn-down charts, cumulative flow and past throughput, and knowing their limits",
      kind: "build",
      title: "Forecast a release from throughput",
      brief:
        "The fictional Northgate Library app team has 96 Product Backlog items left for its next release. Over the last five Sprints it finished 14, 18, 15, 17 and 16 items that met the Definition of Done.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Forecast how many Sprints the release needs at the average throughput, and say what the forecast cannot promise.",
          parts: [
            numericPart(
              "Sprints at average throughput",
              "Average throughput is 16 items per Sprint (80 / 5), so 96 / 16 = 6 Sprints. Met at 6.",
              "Average = (14 + 18 + 15 + 17 + 16) / 5 = 80 / 5 = 16 items per Sprint. 96 / 16 = 6 Sprints.",
              { answer: 6, tolerance: 0, unit: "Sprints" }
            ),
            part(
              "Range and limits",
              "Gives a range from the slowest and fastest Sprints (96/14 about 7, 96/18 about 6) and explains the forecast assumes the backlog and team stay the same, so it is updated each Sprint and is not a commitment.",
              "Using the slowest and fastest Sprints, the release takes about 6 to 7 Sprints. The forecast assumes the backlog and team do not change, which they will; it is re-forecast every Sprint and is a forecast, not a promise."
            ),
          ],
        },
      ],
    },
    {
      slug: "psm-order-for-value",
      objective: "Ordering the Product Backlog to maximize value, and measuring value by outcomes rather than output",
      kind: "case",
      title: "Everyone wants to be first",
      brief:
        "The Product Owner of the fictional Crestline Fitness booking app has a Product Goal: halve the number of members who abandon a class booking.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Three requests arrive: marketing wants a referral program; operations wants a one-tap rebooking button (data shows 40% of abandons happen on the rebooking screen); the CEO wants a dark mode.",
          ask: "Order the three items and explain how.",
          parts: [
            part(
              "Order",
              "Puts rebooking first because it serves the Product Goal with evidence; places the others after, explaining the Product Goal guides ordering.",
              "Rebooking first: it targets the Product Goal and the data says it is where abandons happen. Referral and dark mode come later because they do not serve this goal."
            ),
            part(
              "Handling the CEO",
              "Keeps the decision with the Product Owner, shows the reasoning transparently and invites the CEO to the Sprint Review.",
              "The Product Owner makes the call and shows the reasoning openly in the backlog; the CEO is welcome to discuss it at the Sprint Review."
            ),
          ],
        },
        {
          text: "The rebooking button ships. The team reports '12 story points delivered'.",
          ask: "How should the Product Owner judge whether it worked?",
          parts: [
            part(
              "Outcome measure",
              "Measures the outcome (abandonment rate before and after) rather than output (points, items), and uses it to decide what next.",
              "By the outcome: compare the abandonment rate before and after the release. Story points show output, not value; the abandonment data tells the Product Owner whether to keep going or change course."
            ),
          ],
        },
      ],
    },
  ],
};
