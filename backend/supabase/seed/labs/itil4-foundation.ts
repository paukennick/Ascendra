import { GENERAL_SAFETY, matchPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-280: ITIL 4 Foundation (PeopleCert). Aligned to the ITIL 4 Foundation
// candidate syllabus v1.4 (September 2019) as reproduced in an accredited
// training organization's workbook (PeopleCert's own syllabus is not public;
// tracks/pm-frameworks.ts header) and PeopleCert's exam page, read
// 2026-11-14. Rechecked before PeopleCert's planned 2027-12-31 ITIL 4 sunset.
// Density (hybrid, syllabus marks 5/6/2/1/2/7/17 of 40): 2 / 2 / 1 / 1 / 1 /
// 2 / 3 = 12 labs. Foundation questions test recall and understanding, so
// the labs ask learners to recognize and explain, using ITIL's own terms.

const CHECKED = "2026-11-14";
const RECHECK = "2027-06-01";

export const ITIL4FND_LABS: SeedLabSet = {
  trackCode: "ITIL4FND",
  sources: [
    source("https://www.peoplecert.org/browse-certifications/it-governance-and-service-management/ITIL-1/itil-4-foundation-2565", "exam_outline", CHECKED, RECHECK),
    source("https://sii.pl/wp-content/uploads/2022/03/Training-material-ITIL-Fn.pdf", "exam_outline", CHECKED, RECHECK),
    source("https://www.peoplecert.org/help-and-support/faq-itil", "reference", CHECKED, RECHECK),
  ],
  labs: [
    // Key Concepts of Service Management (2)
    {
      slug: "itil-utility-or-warranty",
      objective: "Distinguishing utility (fit for purpose) from warranty (fit for use) in a service description",
      kind: "build",
      title: "Sort a service description into utility and warranty",
      brief:
        "The fictional Meadowbrook University IT department describes its new video-lecture service in seven statements.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the statements that describe warranty (fit for use), then explain why a service needs both.",
          parts: [
            selectPart(
              "Warranty statements",
              "Selecting the four warranty statements and nothing else is met; three of them is partly there.",
              "Warranty is about how well the service performs: availability (99.5% in term), capacity (2,000 simultaneous viewers), security (sign-in with university accounts) and continuity (restored within four hours). Recording, captioning and slide sync are utility -- what the service does.",
              {
                lines: [
                  "Lecturers can record a lecture from any classroom",
                  "The service is available 99.5% of the time during term",
                  "Recordings get automatic captions",
                  "Up to 2,000 students can watch at the same time",
                  "Only signed-in university accounts can view recordings",
                  "Slides are synchronized with the video",
                  "After a failure the service is restored within four hours",
                ],
                correct: [1, 3, 4, 6],
                display: "list",
              }
            ),
            part(
              "Why both",
              "Explains utility (what it does) without warranty (how well) or the reverse does not create value; the consumer needs both.",
              "Utility without warranty is a service that does the right thing but is unavailable or unsafe; warranty without utility is reliable but useless. Value needs both."
            ),
          ],
        },
      ],
    },
    {
      slug: "itil-customer-user-sponsor",
      objective: "Telling apart the customer, the user and the sponsor of a service in a scenario",
      kind: "build",
      title: "Who is who in a service relationship",
      brief:
        "Harborview Hospital (fictional) buys a cloud payroll service. The finance director approved the budget; the HR manager set the requirements and agreed the outcomes; 1,200 staff check their payslips in it; the vendor runs it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each party to its ITIL role, then explain why the difference matters to the provider.",
          parts: [
            matchPart(
              "Party to role",
              "All four correct is met; two or three is partly there.",
              "The finance director authorizes the budget: sponsor. The HR manager defines requirements and takes responsibility for outcomes: customer. The staff use the service: users. The vendor provides it: service provider.",
              {
                left: ["The finance director", "The HR manager", "The 1,200 staff", "The payroll vendor"],
                right: ["Sponsor", "Customer", "User", "Service provider", "Supplier's supplier"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Why it matters",
              "Explains the roles have different needs and expectations (cost, outcomes, usability), so the provider must manage each relationship.",
              "Each role wants something different -- the sponsor cost and value for money, the customer the outcomes, users an easy experience -- so the provider has to understand and manage all three."
            ),
          ],
        },
      ],
    },

    // The ITIL Guiding Principles (2)
    {
      slug: "itil-principle-for-scenario",
      objective: "Choosing the principle a scenario most calls for",
      kind: "build",
      title: "Which guiding principle?",
      brief:
        "The fictional Clearwater Water Utility's service management office faces five situations.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each situation to the guiding principle it most calls for.",
          parts: [
            matchPart(
              "Situation to principle",
              "All five correct is met; three or four is partly there.",
              "Replacing a working process from scratch ignores start where you are. A six-month big-bang rollout calls for progress iteratively with feedback. An approval form with 14 fields nobody reads calls for keep it simple and practical. Automating a broken manual process calls for optimize and automate (optimize first). A change that ignored the service desk calls for think and work holistically.",
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
          ],
        },
      ],
    },
    {
      slug: "itil-optimize-before-automate",
      objective: "Applying optimize and automate, and why optimizing comes before automating",
      kind: "case",
      title: "Automating password resets",
      brief:
        "The fictional Sterling Foods service desk spends 30% of its time on password resets. A manager wants a bot to automate the current eight-step manual procedure exactly as it is.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You review the procedure: three steps are approvals nobody can explain, and one re-enters data already in the HR system.",
          ask: "How does optimize and automate apply before building the bot?",
          parts: [
            part(
              "Optimize first",
              "Simplifies the procedure first (remove unexplained approvals, reuse HR data), because automating a wasteful process makes waste faster.",
              "Simplify first: remove the unexplained approvals and the duplicate data entry. Automating the procedure as it is would just make the waste run faster."
            ),
            part(
              "Then automate",
              "Automates the simplified, standard procedure (e.g. self-service reset with identity verification) and keeps people for exceptions.",
              "Then automate the simplified version as a self-service reset with identity checks, leaving people to handle the exceptions."
            ),
          ],
        },
        {
          text: "The manager asks how to know it worked.",
          ask: "Which other guiding principles help here?",
          parts: [
            part(
              "Other principles",
              "Links to at least one other principle, e.g. focus on value (measure user wait time and desk time saved), progress iteratively with feedback (pilot with one department).",
              "Focus on value -- measure how long users wait and how much desk time is freed -- and progress iteratively with feedback by piloting with one department first."
            ),
          ],
        },
      ],
    },

    // The Four Dimensions (1)
    {
      slug: "itil-neglected-dimension",
      objective: "Analyzing a failed change for the dimension that was neglected",
      kind: "case",
      title: "The new ticketing tool nobody uses",
      brief:
        "The fictional Granada Council bought a modern ticketing tool. The technology works, but six weeks after go-live most staff still email the service desk.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Interviews show staff were never trained, the desk's team structure did not change, and the old email routing still exists alongside the new workflows.",
          ask: "Which dimensions were neglected?",
          parts: [
            part(
              "Dimensions",
              "Names organizations and people (training, roles, culture) and value streams and processes (workflows not redesigned, old route left open), contrasted with information and technology, which was addressed.",
              "Organizations and people -- no training, no change to roles or culture -- and value streams and processes -- the old email route still runs alongside the new workflow. Only information and technology got attention."
            ),
          ],
        },
        {
          text: "The tool vendor also offers a support contract the council did not take.",
          ask: "What about the fourth dimension, and what would a holistic approach have done?",
          parts: [
            part(
              "Partners and suppliers",
              "Considers the partners and suppliers dimension (vendor support, contract) and proposes balanced planning across all four dimensions.",
              "Partners and suppliers: decide on vendor support deliberately. A holistic plan would have covered all four dimensions together -- training and roles, redesigned workflows with the old route closed, the tool, and the supplier arrangement."
            ),
          ],
        },
      ],
    },

    // The Service Value System (1)
    {
      slug: "itil-svs-flow",
      objective: "Explaining how opportunity and demand enter the service value system and value comes out",
      kind: "build",
      title: "Trace a request through the service value system",
      brief:
        "Customers of the fictional Lantern Bank want to open accounts on their phones, and the bank sees a chance to win younger customers.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the inputs, the components that act on them, and the output.",
          parts: [
            part(
              "Inputs",
              "Identifies demand (customers wanting mobile account opening) and opportunity (winning younger customers) as the inputs.",
              "Demand: customers asking to open accounts on their phones. Opportunity: the chance to win younger customers."
            ),
            part(
              "Components",
              "Names the SVS components acting on them: guiding principles, governance, the service value chain, practices and continual improvement.",
              "The guiding principles and governance direct the work, the service value chain's activities turn the demand into a service using the practices, and continual improvement runs throughout."
            ),
            part(
              "Output",
              "States the output is value for the organization, its customers and other stakeholders.",
              "Value: a mobile account-opening service that customers use and that brings the bank new customers."
            ),
          ],
        },
      ],
    },

    // The Service Value Chain (1)
    {
      slug: "itil-value-stream-laptop",
      objective: "Mapping a value stream for a user request through the value chain",
      kind: "build",
      title: "A new starter needs a laptop",
      brief:
        "At the fictional Fairmont Architects, a new starter's manager asks IT for a laptop. The laptop must be bought, configured and handed over before day one.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Put the value chain activities in the order this value stream uses them, then name one practice that supports it.",
          parts: [
            orderPart(
              "Value stream",
              "The order engage, obtain/build, deliver and support, then improve -- with the request coming in first -- is met; one item out of place is partly there.",
              "The manager's request comes in through engage; the laptop is bought and configured in obtain/build; it is handed over and supported in deliver and support; feedback goes to improve.",
              [
                "Engage: the manager's request is received and understood",
                "Obtain/build: the laptop is bought and configured",
                "Deliver and support: the laptop is handed over and the starter is supported",
                "Improve: feedback on the request is used to improve it",
              ]
            ),
            part(
              "Supporting practice",
              "Names a fitting practice such as service request management, service desk, IT asset management or supplier management and its role.",
              "Service request management handles the request with a standard workflow; IT asset management records the laptop."
            ),
          ],
        },
      ],
    },

    // Purpose and Key Terms of 15 Practices (2)
    {
      slug: "itil-practice-purpose-match",
      objective: "Matching a scenario to the practice whose purpose it serves",
      kind: "build",
      title: "Which practice is this?",
      brief:
        "Six activities from a week at the fictional Northwind Shipping IT department.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each activity to the ITIL practice whose purpose it serves.",
          parts: [
            matchPart(
              "Activity to practice",
              "All six correct is met; four or five is partly there.",
              "Tracking the location and cost of laptops is IT asset management; alerts from server monitoring are monitoring and event management; moving a tested build into production is deployment management; making new features available to users is release management; keeping accurate records of how services are configured is service configuration management; managing the contract with the cloud host is supplier management.",
              {
                left: [
                  "Recording the location, cost and lifecycle of 400 laptops",
                  "Observing a server's CPU and raising an alert when it passes a threshold",
                  "Moving a tested build into the live environment",
                  "Making a new feature available for users to use",
                  "Keeping accurate records of how the CRM service is built from its components",
                  "Reviewing the cloud host's performance against its contract",
                ],
                right: [
                  "IT asset management",
                  "Monitoring and event management",
                  "Deployment management",
                  "Release management",
                  "Service configuration management",
                  "Supplier management",
                  "Relationship management",
                ],
                pairs: [0, 1, 2, 3, 4, 5],
              }
            ),
          ],
        },
      ],
    },
    {
      slug: "itil-incident-problem-terms",
      objective: "Defining IT asset, event, configuration item, change, incident, problem and known error",
      kind: "build",
      title: "Incident, problem or known error?",
      brief:
        "The fictional Copperfield Clinic's service desk logged these items yesterday.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the items that are incidents (an unplanned interruption or reduction in quality of a service), then explain how a problem and a known error differ.",
          parts: [
            selectPart(
              "Incidents",
              "Selecting the three incidents and nothing else is met; two of them is partly there.",
              "Incidents: the booking system down for the front desk, slow X-ray image loading for radiology, and a doctor's printer failing. The firewall upgrade request is a change; the cause of repeated outages is a problem; a disk crossing 70% is an event.",
              {
                lines: [
                  "Front-desk staff cannot open the booking system",
                  "Radiology reports X-ray images loading much more slowly than usual",
                  "A request to upgrade the firewall next weekend",
                  "Investigation into why the booking system has failed three times this month",
                  "A server disk passing 70% full, logged automatically",
                  "Dr. Ahmed's printer stops working during clinic",
                ],
                correct: [0, 1, 5],
                display: "list",
              }
            ),
            part(
              "Problem vs known error",
              "Explains a problem is a cause, or potential cause, of one or more incidents, and a known error is a problem that has been analyzed but not resolved.",
              "A problem is the cause, or potential cause, of incidents -- here, why the booking system keeps failing. Once it has been analyzed but not yet fixed, it is a known error, often with a documented workaround."
            ),
          ],
        },
      ],
    },

    // Seven ITIL Practices in Detail (3)
    {
      slug: "itil-continual-improvement-model",
      objective: "Applying the continual improvement model step by step to an improvement initiative",
      kind: "build",
      title: "Improve first-time fix rates",
      brief:
        "The fictional Silverlake Insurance service desk resolves only 55% of contacts on first contact; the business wants better.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Put the continual improvement model's questions in order, then say what you would do at 'Where are we now?'.",
          parts: [
            orderPart(
              "Model steps",
              "All seven steps in order is met; one out of place is partly there.",
              "What is the vision? Where are we now? Where do we want to be? How do we get there? Take action. Did we get there? How do we keep the momentum going?",
              [
                "What is the vision?",
                "Where are we now?",
                "Where do we want to be?",
                "How do we get there?",
                "Take action",
                "Did we get there?",
                "How do we keep the momentum going?",
              ]
            ),
            part(
              "Where are we now",
              "Describes an objective baseline: measure the current first-contact resolution, contact types, causes of escalation, from data and users' experience.",
              "Baseline the current state with data: 55% first-contact resolution, which contact types escalate and why, plus what users and agents say. Without a baseline you cannot tell later whether you got there."
            ),
          ],
        },
      ],
    },
    {
      slug: "itil-change-types",
      objective: "Explaining change enablement: standard, normal and emergency changes and the change authority",
      kind: "build",
      title: "Classify the changes",
      brief:
        "Three changes are waiting at the fictional Brookside Retail IT department.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each change to its type, then explain who authorizes each type.",
          parts: [
            matchPart(
              "Change to type",
              "All three correct is met; two is partly there.",
              "A routine, low-risk, pre-authorized task (adding a user to a standard group) is a standard change. A security patch for a flaw attackers are exploiting today is an emergency change. Migrating the e-commerce database is a normal change, scheduled, assessed and authorized. None of them is an incident or a service request.",
              {
                left: [
                  "Adding a new employee to a standard email distribution group, done the same way 50 times a month",
                  "Patching a payment server against a flaw attackers are exploiting today",
                  "Migrating the e-commerce database to a new cluster next quarter",
                ],
                right: ["Standard change", "Emergency change", "Normal change", "Incident", "Service request"],
                pairs: [0, 1, 2],
              }
            ),
            part(
              "Authorization",
              "Standard changes are pre-authorized (low risk, well understood); normal changes are authorized by the appropriate change authority per the change model; emergency changes are expedited with a separate change authority where needed.",
              "Standard changes are pre-authorized and just carried out. Normal changes go to the change authority that fits their risk under the change model. Emergency changes are assessed and authorized as fast as possible, often by a separate change authority set up for emergencies."
            ),
          ],
        },
      ],
    },
    {
      slug: "itil-problem-lifecycle",
      objective: "Managing problems through problem identification, problem control and error control, with workarounds and known errors",
      kind: "case",
      title: "The email outage every Monday",
      brief:
        "For four Mondays running, the fictional Pemberton Law firm's email has been unavailable for about an hour at 9 a.m.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Each Monday the service desk logs and resolves an incident by restarting the mail server.",
          ask: "What is the problem management activity here, and how does it differ from what the desk is doing?",
          parts: [
            part(
              "Identification",
              "Identifies a problem from the trend of recurring incidents (problem identification) and distinguishes it from incident management, which restores service.",
              "Problem identification: four similar incidents form a trend, so a problem is logged. Incident management restores service quickly; problem management looks for the cause so it stops happening."
            ),
          ],
        },
        {
          text: "Analysis shows a weekly backup job overloads the server at 9 a.m. A permanent fix needs new storage next quarter.",
          ask: "Name the phase and the records you would create now.",
          parts: [
            part(
              "Problem control",
              "Names problem control (analysis, workaround) leading to a known error record with a documented workaround (e.g. move the backup to 2 a.m.).",
              "This is problem control: the cause is found and a workaround -- moving the backup to 2 a.m. -- is documented. The problem becomes a known error, recorded with the workaround so the desk can use it."
            ),
          ],
        },
        {
          text: "Next quarter the storage arrives.",
          ask: "What happens in error control?",
          parts: [
            part(
              "Error control",
              "Describes error control managing the known error: raising a change to implement the permanent fix, re-assessing the workaround, and closing after confirmation.",
              "Error control manages the known error: a change is raised to install the storage, the fix is confirmed, the workaround is retired and the known error and problem are closed."
            ),
          ],
        },
      ],
    },
  ],
};
