import { GENERAL_SAFETY, matchPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";
import { ITIL5_PRODUCT_URL, ITIL5_SYLLABUS_COPY_URL } from "../tracks/pm-frameworks";

// REQ-308: ITIL Foundation (Version 5) (PeopleCert). Aligned to PeopleCert's
// syllabus v5.0 (February 2026) as reproduced in Van Haren's ITIL 5
// Foundation Courseware, and PeopleCert's exam page and ITIL FAQ, all read
// 2026-11-16 (tracks/pm-frameworks.ts, ITIL5FND header).
// Density (hybrid rule, weights 30/10/10/40/5/2.5/2.5): 3 / 2 / 2 / 3 / 1 /
// 1 / 1 = 13 labs. Foundation questions test recall and understanding, so
// the labs ask learners to recognize and explain, in ITIL's own terms, and
// stay away from detail the syllabus does not name.

const CHECKED = "2026-11-16";
const RECHECK = "2027-05-16";

export const ITIL5FND_LABS: SeedLabSet = {
  trackCode: "ITIL5FND",
  sources: [
    source(ITIL5_PRODUCT_URL, "exam_outline", CHECKED, RECHECK),
    source(ITIL5_SYLLABUS_COPY_URL, "exam_outline", CHECKED, RECHECK),
    source("https://peoplecert.org/help-and-support/faq-itil", "reference", CHECKED, RECHECK),
  ],
  labs: [
    // Key ITIL Terms and Definitions (3)
    {
      slug: "itil5-who-is-who",
      objective: "Identifying the service provider, service consumer, digital product vendor, sponsor, customer and user in a scenario",
      kind: "build",
      title: "Who is who around a cloud payroll service",
      brief:
        "The fictional Harborview Hospital uses a payroll service run by an outsourcing firm on software licensed from a payroll software company. The finance director approved the budget; the HR manager set the requirements and agreed the outcomes; 1,200 staff check their payslips in it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each party to its role, then explain why the provider has to treat the sponsor, customer and user differently.",
          parts: [
            matchPart(
              "Party to role",
              "All five correct is met; three or four is partly there.",
              "The finance director authorizes the budget: sponsor. The HR manager defines requirements and owns the outcomes: customer. The staff use the service: users. The outsourcing firm provides the service: service provider. The software company supplies the product the service runs on: digital product vendor.",
              {
                left: ["The finance director", "The HR manager", "The 1,200 staff", "The outsourcing firm", "The payroll software company"],
                right: ["Sponsor", "Customer", "User", "Service provider", "Digital product vendor", "Regulator"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Why it matters",
              "Explains that the roles want different things (budget and value for money, outcomes, an easy experience) and that the hospital as a whole is the service consumer.",
              "Together the three roles make up the service consumer, but each wants something different: the sponsor value for the money, the customer the outcomes it asked for, the users a service that is easy to use. A provider that satisfies only one of them puts the relationship at risk."
            ),
          ],
        },
      ],
    },
    {
      slug: "itil5-utility-warranty-ux-sustainability",
      objective: "Analyzing a service description for its utility, warranty, user experience and sustainability",
      kind: "build",
      title: "Read a service description four ways",
      brief:
        "The fictional Meadowbrook University IT department describes its new video-lecture service in eight statements.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the statements that describe warranty (how well the service performs), then sort the others into utility, user experience and sustainability.",
          parts: [
            selectPart(
              "Warranty statements",
              "Selecting the three warranty statements and nothing else is met; two of them is partly there.",
              "Warranty is about how well the service performs: availability (99.5% in term), capacity (2,000 simultaneous viewers) and restoration within four hours. Recording and captions are utility; the two-tap start and the clear error messages are user experience; the energy-saving storage tier is sustainability.",
              {
                lines: [
                  "Lecturers can record a lecture from any classroom",
                  "The service is available 99.5% of the time during term",
                  "Recordings get automatic captions",
                  "Up to 2,000 students can watch at the same time",
                  "Starting a recording takes two taps on the lectern screen",
                  "After a failure the service is restored within four hours",
                  "Old recordings move to a low-energy storage tier after a year",
                  "Error messages tell the lecturer what to do next",
                ],
                correct: [1, 3, 5],
                display: "list",
              }
            ),
            part(
              "The other three",
              "Names recording and captions as utility, the two-tap start and helpful errors as user experience, and the storage tier as sustainability, with a one-line reason for each.",
              "Utility is what the service does (recording, captions). User experience is how it feels to use (two taps, helpful messages). Sustainability is its effect on resources over time (moving old recordings to a low-energy tier)."
            ),
          ],
        },
      ],
    },
    {
      slug: "itil5-relationship-type",
      objective: "Choosing whether a service relationship is basic, cooperative or collaborative",
      kind: "build",
      title: "Basic, cooperative or collaborative?",
      brief:
        "The fictional Lantern Bank has three service relationships with outside providers.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each relationship to its type, then explain what changes as a relationship moves from basic to collaborative.",
          parts: [
            matchPart(
              "Relationship to type",
              "All three correct is met; two is partly there.",
              "Buying a standard email service on the provider's published terms is basic. A managed network service with some tailored targets agreed each year is cooperative. Co-designing a new mobile banking product with a partner that shares the goals and the results is collaborative.",
              {
                left: [
                  "A standard cloud email service bought on the provider's published terms",
                  "A managed network service with some targets tailored to the bank and reviewed each year",
                  "A partner that co-designs the bank's new mobile product and shares its goals and results",
                ],
                right: ["Basic", "Cooperative", "Collaborative"],
                pairs: [0, 1, 2],
              }
            ),
            part(
              "What changes",
              "Explains that tailoring, shared goals, trust and joint work increase from basic to collaborative, and so does the effort both sides put into the relationship.",
              "A basic relationship uses a standard offering with little tailoring. A cooperative one tailors part of the offering and agrees some outcomes. A collaborative one shares goals, risks and results and builds the service together, which takes more trust and more effort from both sides."
            ),
          ],
        },
      ],
    },

    // The Four Dimensions (2)
    {
      slug: "itil5-neglected-dimension",
      objective: "Analyzing a failed rollout for the dimension that was neglected",
      kind: "case",
      title: "The new ticketing tool nobody uses",
      brief:
        "The fictional Granada Council bought a modern ticketing tool. The technology works, but six weeks after go-live most staff still email the service desk.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Interviews show staff were never trained, the desk's team structure did not change, and the old email routing still exists beside the new workflows.",
          ask: "Which dimensions were neglected?",
          parts: [
            part(
              "Dimensions",
              "Names organizations and people (training, roles, culture) and value streams and processes (workflows not redesigned, old route left open), contrasted with information and technology, which was addressed.",
              "Organizations and people -- no training, no change to roles or culture -- and value streams and processes -- the old email route still runs beside the new workflow. Only information and technology got attention."
            ),
          ],
        },
        {
          text: "The tool vendor also offers a support contract the council did not take.",
          ask: "What about the fourth dimension, and what would a holistic approach have done?",
          parts: [
            part(
              "Partners and suppliers",
              "Considers the partners and suppliers dimension (vendor support, contract) and proposes planning across all four dimensions together.",
              "Partners and suppliers: decide on vendor support deliberately. A holistic plan would have covered all four dimensions together -- training and roles, redesigned workflows with the old route closed, the tool, and the supplier arrangement."
            ),
          ],
        },
      ],
    },
    {
      slug: "itil5-pestle-factors",
      objective: "Assessing how political, economic, social, technological, legal and environmental factors act on the dimensions",
      kind: "build",
      title: "Outside pressures on a delivery service",
      brief:
        "The fictional Sterling Foods runs an online grocery delivery service. Its service management team lists six pressures from outside the company.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each pressure to its PESTLE factor, then name one dimension it acts on and how.",
          parts: [
            matchPart(
              "Pressure to factor",
              "All six correct is met; four or five is partly there.",
              "A new data protection law is legal; a city's low-emission zone for vans is environmental; rising fuel prices are economic; customers expecting one-hour slots is social; a government subsidy for local suppliers is political; a new route-optimization API on the market is technological.",
              {
                left: [
                  "A new data protection law covering customer addresses",
                  "A city low-emission zone that older delivery vans may not enter",
                  "Fuel prices rise 20% in a year",
                  "Customers now expect one-hour delivery slots",
                  "The government subsidizes buying from local farms",
                  "A new route-optimization service becomes available",
                ],
                right: ["Legal", "Environmental", "Economic", "Social", "Political", "Technological"],
                pairs: [0, 1, 2, 3, 4, 5],
              }
            ),
            part(
              "Effect on a dimension",
              "Links one pressure to a dimension with a concrete effect, e.g. the data protection law on information and technology (how addresses are stored) or the subsidy on partners and suppliers (sourcing).",
              "For example, the data protection law acts on information and technology -- how customer addresses are stored and who can see them -- and the local-farm subsidy acts on partners and suppliers, changing who the company buys from."
            ),
          ],
        },
      ],
    },

    // The ITIL Product and Service Lifecycle (2)
    {
      slug: "itil5-lifecycle-activity-for-work",
      objective: "Recognizing which lifecycle activity a piece of work belongs to",
      kind: "build",
      title: "Which lifecycle activity is this?",
      brief:
        "The fictional Fairmont Architects is launching a client portal. Six pieces of work are on the team's board.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each piece of work to the lifecycle activity it belongs to.",
          parts: [
            matchPart(
              "Work to activity",
              "All six correct is met; four or five is partly there.",
              "Interviewing clients about what they need is discover. Sketching the portal's screens and service model is design. Buying a document-signing component is acquire. Writing and testing the portal's code is build. Moving it into live use with training and cutover is transition. Answering a client who cannot sign in is support.",
              {
                left: [
                  "Interviewing clients about what they struggle with today",
                  "Drafting the portal's screens and how the service will work",
                  "Buying a document-signing component from a vendor",
                  "Writing and testing the portal's code",
                  "Moving the portal into live use, with staff training and cutover",
                  "Helping a client who cannot sign in",
                ],
                right: ["Discover", "Design", "Acquire", "Build", "Transition", "Support", "Operate", "Deliver"],
                pairs: [0, 1, 2, 3, 4, 5],
              }
            ),
          ],
        },
      ],
    },
    {
      slug: "itil5-lifecycle-iterates",
      objective: "Planning how a new digital service moves through the lifecycle activities iteratively",
      kind: "case",
      title: "The portal that shipped in slices",
      brief:
        "The fictional Fairmont Architects plans to build its client portal in one pass: discover everything, design everything, build everything, then go live in nine months.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The team lead suggests releasing document sharing first and adding signing and billing later.",
          ask: "How do the lifecycle activities apply to this plan, and why is it allowed?",
          parts: [
            part(
              "Not a sequence",
              "States that the lifecycle activities are not sequential or linear and can be used iteratively, so each slice can go through discover, design, build, transition and support on its own.",
              "ITIL's lifecycle activities are not a fixed sequence: a team can discover, design, build and transition document sharing, then repeat the activities for signing and billing while document sharing is already being operated and supported."
            ),
          ],
        },
        {
          text: "Three weeks after document sharing goes live, support reports that clients cannot find shared files.",
          ask: "Which activities does that feedback send the team back to?",
          parts: [
            part(
              "Feedback loop",
              "Sends the feedback back to discover or design (and then build) for the next iteration, and links it to the guiding principle progress iteratively with feedback.",
              "Support's finding goes back into discover and design -- why clients cannot find files and how to change the screens -- and then build and transition again. That is progress iteratively with feedback in practice."
            ),
          ],
        },
      ],
    },

    // The ITIL Value System (3)
    {
      slug: "itil5-principle-for-scenario",
      objective: "Choosing the guiding principle a scenario most calls for, and explaining how the principles work together",
      kind: "build",
      title: "Which guiding principle?",
      brief:
        "The fictional Clearwater Water Utility's service management office faces five situations.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each situation to the guiding principle it most calls for, then explain why the principles are used together.",
          parts: [
            matchPart(
              "Situation to principle",
              "All five correct is met; three or four is partly there.",
              "Replacing a working process from scratch ignores start where you are. A six-month big-bang rollout calls for progress iteratively with feedback. A change form with 14 unused fields calls for keep it simple and practical. Scripting an inefficient manual process calls for optimize and automate (optimize first). A change that ignored the service desk calls for think and work holistically.",
              {
                left: [
                  "A consultant proposes discarding the existing incident process and designing a new one from nothing",
                  "A new tool is planned as a single six-month rollout with no checkpoints",
                  "The change form has 14 fields, most of which nobody uses",
                  "A team wants to script a manual process that is known to be inefficient",
                  "A network change went live without telling the service desk, which was flooded with calls",
                ],
                right: [
                  "Start where you are",
                  "Progress iteratively with feedback",
                  "Keep it simple and practical",
                  "Optimize and automate",
                  "Think and work holistically",
                  "Focus on value",
                ],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Together",
              "Explains that the principles interact and are applied together, e.g. starting where you are and keeping it simple support progressing iteratively, all aimed at value.",
              "The principles are not a checklist to pick one from: starting where you are and keeping it simple make it easier to progress iteratively, and all of them serve focus on value."
            ),
          ],
        },
      ],
    },
    {
      slug: "itil5-problem-error-known-error",
      objective: "Distinguishing a problem, an error and a known error in an operational scenario",
      kind: "build",
      title: "Problem, error or known error?",
      brief:
        "The fictional Lantern Bank's mobile app crashed for some users on five mornings this month. The operations team writes down what it knows.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each statement to the ITIL term it describes, then explain what turns a problem into a known error.",
          parts: [
            matchPart(
              "Statement to term",
              "All four correct is met; three is partly there.",
              "Each morning's crash for users is an incident. The unknown cause behind the repeated crashes is a problem. The flaw in the session cache code that causes them is an error. Once that cause is analyzed and recorded, with a workaround, but not yet fixed, the problem is a known error.",
              {
                left: [
                  "Users cannot open the app on Tuesday morning",
                  "Something is causing the app to crash on several mornings; nobody knows what yet",
                  "A flaw in the session cache code that clears too early",
                  "The cause has been analyzed and recorded with a workaround (restart the cache), but the fix is not deployed yet",
                ],
                right: ["Incident", "Problem", "Error", "Known error", "Event"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Problem to known error",
              "Explains that a problem becomes a known error once it has been analyzed but not yet resolved (the cause is understood and recorded, often with a workaround).",
              "A problem is the cause, or possible cause, of incidents. When it has been analyzed and the cause is understood but not yet removed, it is recorded as a known error, usually with a workaround so the service desk can restore service faster."
            ),
          ],
        },
      ],
    },
    {
      slug: "itil5-optimize-before-automate",
      objective: "Applying optimize and automate, and why optimizing comes before automating",
      kind: "case",
      title: "Automating password resets",
      brief:
        "The fictional Sterling Foods service desk spends 30% of its time on password resets. A manager wants an AI assistant to automate the current eight-step manual procedure exactly as it is.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You review the procedure: three steps are approvals nobody can explain, and one re-enters data already in the HR system.",
          ask: "How does optimize and automate apply before building the assistant?",
          parts: [
            part(
              "Optimize first",
              "Simplifies the procedure first (remove unexplained approvals, reuse HR data), because automating a wasteful process makes the waste faster.",
              "Simplify first: remove the unexplained approvals and the duplicate data entry. Automating the procedure as it is would just make the waste run faster."
            ),
            part(
              "Then automate",
              "Automates the simplified, standard procedure (e.g. self-service reset with identity verification) and keeps people for the exceptions.",
              "Then automate the simplified version as a self-service reset with identity checks, leaving people to handle the exceptions."
            ),
          ],
        },
        {
          text: "The manager asks how the team will know it worked.",
          ask: "Which other guiding principles help here?",
          parts: [
            part(
              "Other principles",
              "Links to at least one other principle, e.g. focus on value (measure user wait time and desk time saved) or progress iteratively with feedback (pilot with one department).",
              "Focus on value -- measure how long users wait and how much desk time is freed -- and progress iteratively with feedback by piloting with one department first."
            ),
          ],
        },
      ],
    },

    // Value Stream Identification, Mapping and Management (1)
    {
      slug: "itil5-read-value-stream-map",
      objective: "Interpreting the elements of a value stream map to find where work waits",
      kind: "build",
      title: "Where does the new laptop wait?",
      brief:
        "The fictional Fairmont Architects mapped how a new starter gets a laptop. The map shows five steps, each with its working time and the waiting time before it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the step where the work waits longest, then say whether this is a core or an enabling value stream and what value stream management would do next.",
          parts: [
            selectPart(
              "Longest wait",
              "Selecting the manager-approval step only is met.",
              "Work waits longest before the budget approval: 4 days of waiting for 10 minutes of work. The whole stream takes about 7 days, of which under a day is work.",
              {
                lines: [
                  "Request logged -- waits 0.5 days, then 15 minutes of work",
                  "Budget approval by the manager's manager -- waits 4 days, then 10 minutes of work",
                  "Laptop ordered from stock -- waits 1 day, then 30 minutes of work",
                  "Laptop configured -- waits 1 day, then 2 hours of work",
                  "Laptop handed over -- waits 0.5 days, then 20 minutes of work",
                ],
                correct: [1],
                display: "list",
              }
            ),
            part(
              "Core or enabling, and next step",
              "Calls it an enabling value stream (it supports staff, not the firm's clients directly) and has value stream management act on the long wait, e.g. pre-approving standard laptops, then measuring again.",
              "This is an enabling value stream: it equips staff rather than delivering value to the firm's clients directly. Value stream management would act on the biggest wait -- for example, pre-approve a standard laptop as part of hiring -- and then measure the flow again."
            ),
          ],
        },
      ],
    },

    // ITIL and AI (1)
    {
      slug: "itil5-ai-across-lifecycle",
      objective: "Identifying where AI can assist product and service development and automate work across lifecycle activities",
      kind: "build",
      title: "Where AI helps a service team",
      brief:
        "The fictional Meadowbrook University IT department lists five ways it plans to use AI.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each use to the lifecycle activity it mainly helps, then name one thing AI governance should ask before the chatbot goes live.",
          parts: [
            matchPart(
              "Use to activity",
              "All five correct is met; three or four is partly there.",
              "Summarizing student survey comments to find unmet needs helps discover. Drafting screen layouts from a short description helps design. Generating and testing code from a specification helps build. Spotting unusual patterns in monitoring data helps operate. A chatbot answering students' how-to questions helps support.",
              {
                left: [
                  "Summarizing 3,000 student survey comments to find unmet needs",
                  "Drafting screen layouts from a short description",
                  "Generating and testing code from a specification",
                  "Spotting unusual patterns in monitoring data",
                  "A chatbot answering students' how-to questions",
                ],
                right: ["Discover", "Design", "Build", "Operate", "Support", "Acquire"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "A governance question",
              "Names a governance concern such as accountability for the chatbot's answers, accuracy checks, privacy of student data, or when it hands over to a person.",
              "Who is accountable for the chatbot's answers and how they are checked; what student data it may see; and when it must hand the conversation to a person."
            ),
          ],
        },
      ],
    },

    // ITIL and Other Frameworks (1)
    {
      slug: "itil5-itil-and-devops",
      objective: "Explaining where ITIL and DevOps complement each other across the lifecycle",
      kind: "case",
      title: "The DevOps team and the change board",
      brief:
        "At the fictional Harborview Hospital, a DevOps team deploys the patient-portal code several times a day through an automated pipeline. The operations manager says ITIL means every change should wait for the weekly change board.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The pipeline runs automated tests on every change and can roll back in minutes.",
          ask: "Does ITIL require the weekly board here? Explain how ITIL and DevOps fit together.",
          parts: [
            part(
              "Complementary",
              "Explains that ITIL does not require one slow approval route; low-risk, well-tested pipeline changes can be pre-authorized, and ITIL adds the wider service view (support, users, value) that DevOps alone may not cover.",
              "No. ITIL and DevOps complement each other: the pipeline's automated tests and fast rollback let routine changes be pre-authorized, while ITIL brings the whole-service view -- support readiness, users, value and continual improvement -- across the lifecycle."
            ),
          ],
        },
        {
          text: "A change to how the portal stores patient consent is planned next month.",
          ask: "Should that change follow the same route?",
          parts: [
            part(
              "Risk decides",
              "Distinguishes the higher-risk change (patient consent data, legal exposure) and routes it through a fuller assessment with the right people, while routine pipeline changes stay fast.",
              "Probably not: it touches patient consent and legal duties, so it deserves a fuller assessment with the right people involved, even though routine pipeline changes stay fast. The route follows the risk, not the tool."
            ),
          ],
        },
      ],
    },
  ],
};
