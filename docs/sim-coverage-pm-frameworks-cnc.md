# Sim coverage: Scrum (PSM I, CSM), ITIL 4 Foundation, ASQ CSSGB and NASM-CNC (REQ-282)

Nick, 2026-11-14: sims for these courses follow coverage, not a count. Every
objective that fits the selection rule (time matters, cues to read, choices
with consequences, or competing priorities) gets a sim on an existing screen;
where a family needs a screen that does not exist, the screen is proposed
here with the sims it would unlock, and nothing is built for it.

## What was built

| Course | Slug | Screen | Objective (exact title) |
|---|---|---|---|
| NASMCNC | `cnc-crash-diet-request` | client session (`session@1`) | Recognizing when to refer to a registered dietitian nutritionist or physician: ... |
| NASMCNC | `cnc-greens-powder-warfarin` | client session (`session@1`) | Evaluating a supplement: how it is regulated, third-party testing, and when it is a question for a clinician |

Both use the `clinical-session` profile unchanged (harm = a required
protective step not taken: here the referral a coach's scope requires), are
learner-paced (`turns`), engine 1.2 with an explicit `endingOrder`, one
written-reasoning moment, one unscored prediction, 4 critical criteria, and
golden paths (7 and 6) that reach every ending but `time_up`, score every
criterion both met and missed, and include a Good, a Mediocre and a Bad run
(`npm run sim:golden -- steps cnc-crash-diet|cnc-greens-warfarin`; checked by
`lib/sim/cnc-session.test.ts`). Sources (read 2026-11-14): NASM's CNC page
(scope and RDN referral), NIMH "Eating Disorders: What You Need to Know"
(revised 2024), NIH ODS vitamin K fact sheet (updated 2026-10-22) and
"Dietary Supplements: What You Need to Know" (updated 2023-01-04), FDA's
dietary supplement Q&A (updated 2026-08-27). No engine or renderer change.

Why the session screen fits a coaching conversation: it shows one client,
how they present, gauges read in words, what the coach knows and the record;
the actions are questions, responses, advice and a referral. The fitness
family's planned **client trainer** (docs/sims.md 20) is for coaching across
weeks, which a single session cannot show.

## Not built on an existing screen yet

S-C1 (motivational interviewing with an ambivalent client) and S-C2 (a food
record that does not add up) are now one case on the client trainer,
`cnc-ambivalent-food-record` (REQ-314, docs/sims.md 22.27), with the MI,
stages-of-change and under-reporting sources read on 2026-11-16. S-C2's
objective is a secondary objective of that case.

## Proposed screens

**Project dashboard, Sprint mode** (PSM I and CSM; the project dashboard is
already planned for the PM family in docs/sims.md 20). Day-by-day Sprint
clock, the Product Goal, Sprint Goal and Definition of Done, the Sprint
Backlog as a board, a burn-down, and the people (Developers, Product Owner,
stakeholders, a manager) as gauges read in words; events by timer (the Daily
Scrum, a stakeholder request, a blocked dependency, the Review). Profile: a
new `scrum` profile or the `project` profile with Scrum thresholds, because
the `project` profile is earned value (CPI/SPI), which the Scrum Guide does
not use; that choice needs Nick. Unlocks P-S1 to P-S16 below (16 sims serving
23 objectives in each course).

**Service operations desk** (ITIL 4 Foundation; would also serve CompTIA A+
help-desk cases). A queue of incidents and requests with impact, urgency and
SLA clocks, a change calendar with a change authority, problem and known-error
records, and a service-level view of user satisfaction against technical
metrics. Unlocks P-I1 to P-I5 (14 objectives). ITIL 4 Foundation is a 40-item
recall exam, so these would be practice for the seven practices, not exam
items.

**Process and data console** (ASQ CSSGB; overlaps the planned data and code
console in docs/sims.md 20). A process line producing data by subgroup, a
control chart and capability read-outs, a measurement system study, and a
DMAIC project tracker; tampering and late reaction both cost. Unlocks P-Q1 to
P-Q8 (25 objectives).

**Client trainer** (built in REQ-314 as `trainer@1`, docs/sims.md 22.27; T-C1
and T-C2 are still to author). Weeks of
coaching: adherence, lapses, measures beyond the scale, eating out and travel.
Unlocks T-C1 and T-C2 for NASM-CNC (7 objectives).

## Coverage by objective

Objectives marked "No" are recall or explanation (definitions, purposes,
calculations without a decision); the lessons and labs cover them.

### PSMI

| Unit | Objective | Fits the rule? | Sim |
|---|---|---|---|
| Scrum Theory, Empiricism and Values | Explaining empiricism and lean thinking as the foundations Scrum is built on | No: recall or explanation; lessons and labs cover it | none |
| Scrum Theory, Empiricism and Values | Applying the three pillars -- transparency, inspection and adaptation -- to spot where a team has stopped inspecting or adapting | Yes: cues to read: a team that stopped inspecting | Proposed screen: P-S1 Sprint with hidden problems |
| Scrum Theory, Empiricism and Values | Recognizing the five Scrum values in a team's behavior and what happens when they erode | Yes: cues to read: behavior that erodes a value | Proposed screen: P-S1 Sprint with hidden problems |
| Scrum Theory, Empiricism and Values | Distinguishing Scrum as a lightweight framework from a full methodology, and what a team may add to it but not remove | No: recall or explanation; lessons and labs cover it | none |
| Scrum Theory, Empiricism and Values | Explaining how an iterative, incremental approach controls risk and improves predictability | No: recall or explanation; lessons and labs cover it | none |
| Scrum Theory, Empiricism and Values | Relating Scrum to the values and principles of the Manifesto for Agile Software Development | No: recall or explanation; lessons and labs cover it | none |
| The Scrum Team and Its Accountabilities | Describing the Scrum Team as one cross-functional, self-managing unit with no sub-teams or hierarchies | No: recall or explanation; lessons and labs cover it | none |
| The Scrum Team and Its Accountabilities | Assigning the Developers' accountabilities: the Sprint Backlog, quality through the Definition of Done, and adapting their plan each day | No: recall or explanation; lessons and labs cover it | none |
| The Scrum Team and Its Accountabilities | Assigning the Product Owner's accountabilities for value and the Product Backlog, and why the Product Owner is one person | No: recall or explanation; lessons and labs cover it | none |
| The Scrum Team and Its Accountabilities | Assigning the Scrum Master's accountabilities to the team, the Product Owner and the organization | No: recall or explanation; lessons and labs cover it | none |
| The Scrum Team and Its Accountabilities | Deciding who stays accountable when the Product Owner delegates Product Backlog work | Yes: choices with consequences | Proposed screen: P-S2 The Product Owner delegates |
| The Scrum Team and Its Accountabilities | Organizing several Scrum Teams on one product around one Product Backlog, one Product Owner and one Product Goal | Yes: competing priorities across teams | Proposed screen: P-S3 Three teams, one product |
| Scrum Events | Explaining the Sprint as the container for every other event, with a fixed length of one month or less | No: recall or explanation; lessons and labs cover it | none |
| Scrum Events | Running Sprint Planning that answers why, what and how within its timebox | Yes: timebox; choices with consequences | Proposed screen: P-S4 Sprint Planning under a timebox |
| Scrum Events | Running a Daily Scrum as the Developers' planning event rather than a status report | Yes: timebox; cues (status-report drift) | Proposed screen: P-S5 The Daily Scrum turns into a status meeting |
| Scrum Events | Running a Sprint Review as a working session with stakeholders that can change the Product Backlog | Yes: stakeholder pressure; consequences for the backlog | Proposed screen: P-S6 A Sprint Review with an unhappy stakeholder |
| Scrum Events | Running a Sprint Retrospective that finds the most helpful improvements for the next Sprint | Yes: choices with consequences in later Sprints | Proposed screen: P-S7 Retrospective that sticks |
| Scrum Events | Deciding what happens when a Sprint Goal becomes obsolete, and who may cancel a Sprint | Yes: time matters; competing priorities | Proposed screen: P-S8 The market moves mid-Sprint |
| Scrum Events | Treating Product Backlog refinement as an ongoing activity rather than an event | No: recall or explanation; lessons and labs cover it | none |
| Scrum Events | Choosing a Sprint length from risk, the need for feedback and the cost of planning | No: recall or explanation; lessons and labs cover it | none |
| Scrum Artifacts, Commitments and Done | Linking each artifact to its commitment: the Product Goal, the Sprint Goal and the Definition of Done | No: recall or explanation; lessons and labs cover it | none |
| Scrum Artifacts, Commitments and Done | Managing the Product Backlog as an emergent, ordered list and judging when an item is ready for selection | Yes: competing priorities | Proposed screen: P-S13 Ordering the backlog under pressure |
| Scrum Artifacts, Commitments and Done | Adapting the Sprint Backlog during the Sprint without endangering the Sprint Goal | Yes: competing priorities: new work against the Sprint Goal | Proposed screen: P-S8 The market moves mid-Sprint |
| Scrum Artifacts, Commitments and Done | Creating more than one Increment in a Sprint and releasing before the Sprint Review | Yes: time matters: release before the Review | Proposed screen: P-S9 Not Done on the last day |
| Scrum Artifacts, Commitments and Done | Writing and evolving a Definition of Done, including organizational standards and teams that share one | No: recall or explanation; lessons and labs cover it | none |
| Scrum Artifacts, Commitments and Done | Deciding what happens to work that does not meet the Definition of Done when the Sprint ends | Yes: time matters (Sprint end); pressure to show it | Proposed screen: P-S9 Not Done on the last day |
| Developing People and Teams | Supporting a self-managing team: when the Scrum Master steps in and when the team decides | Yes: choices with consequences: step in or not | Proposed screen: P-S10 Conflict in a self-managing team |
| Developing People and Teams | Choosing between facilitating, teaching, mentoring and coaching for a given situation | Yes: cues to read; choices with consequences | Proposed screen: P-S10 Conflict in a self-managing team |
| Developing People and Teams | Facilitating a team decision so every voice is heard and the decision stays the team's | Yes: competing priorities in the room | Proposed screen: P-S10 Conflict in a self-managing team |
| Developing People and Teams | Causing the removal of impediments to the team's progress without solving everything for them | Yes: time matters; competing priorities | Proposed screen: P-S12 An impediment outside the team |
| Developing People and Teams | Recognizing Scrum anti-patterns -- the Scrum Master as task assigner, a status-report Daily Scrum, a stabilization Sprint -- and responding to them | Yes: cues to read | Proposed screen: P-S1 Sprint with hidden problems |
| Developing People and Teams | Leading the organization's Scrum adoption: training, coaching and helping stakeholders work with the team | Yes: competing priorities with management | Proposed screen: P-S16 A manager wants a status report |
| Managing Products with Agility | Ordering the Product Backlog to maximize value, and measuring value by outcomes rather than output | Yes: competing priorities: value against requests | Proposed screen: P-S13 Ordering the backlog under pressure |
| Managing Products with Agility | Forecasting and release planning from empirical data such as burn-down charts, cumulative flow and past throughput, and knowing their limits | Yes: cues to read in throughput data; consequences of a promise | Proposed screen: P-S14 A release date from real data |
| Managing Products with Agility | Engaging stakeholders and customers through the Sprint Review and the Product Owner without taking the plan from the Developers | Yes: competing priorities | Proposed screen: P-S6 A Sprint Review with an unhappy stakeholder |
| Managing Products with Agility | Defining a Product Goal and using it to decide what not to build | No: recall or explanation; lessons and labs cover it | none |
| Managing Products with Agility | Managing technical debt and its effect on transparency and future value | Yes: delayed consequences; competing priorities | Proposed screen: P-S15 Debt that slows every Sprint |

PSMI: 37 objectives, 23 fit the rule, 0 covered by a built sim.

### CSM

| Unit | Objective | Fits the rule? | Sim |
|---|---|---|---|
| Scrum Theory and Values | Explaining empiricism and lean thinking as the foundations Scrum is built on | No: recall or explanation; lessons and labs cover it | none |
| Scrum Theory and Values | Applying the three pillars -- transparency, inspection and adaptation -- to spot where a team has stopped inspecting or adapting | Yes: cues to read: a team that stopped inspecting | Proposed screen: P-S1 Sprint with hidden problems |
| Scrum Theory and Values | Recognizing the five Scrum values in a team's behavior and what happens when they erode | Yes: cues to read: behavior that erodes a value | Proposed screen: P-S1 Sprint with hidden problems |
| Scrum Theory and Values | Distinguishing Scrum as a lightweight framework from a full methodology, and what a team may add to it but not remove | No: recall or explanation; lessons and labs cover it | none |
| Scrum Theory and Values | Explaining how an iterative, incremental approach controls risk and improves predictability | No: recall or explanation; lessons and labs cover it | none |
| Scrum Theory and Values | Relating Scrum to the values and principles of the Manifesto for Agile Software Development | No: recall or explanation; lessons and labs cover it | none |
| Scrum Theory and Values | Describing what goes wrong when Scrum is only partly put in place | No: recall or explanation; lessons and labs cover it | none |
| The Scrum Team | Describing the Scrum Team as one cross-functional, self-managing unit with no sub-teams or hierarchies | No: recall or explanation; lessons and labs cover it | none |
| The Scrum Team | Assigning the Developers' accountabilities: the Sprint Backlog, quality through the Definition of Done, and adapting their plan each day | No: recall or explanation; lessons and labs cover it | none |
| The Scrum Team | Assigning the Product Owner's accountabilities for value and the Product Backlog, and why the Product Owner is one person | No: recall or explanation; lessons and labs cover it | none |
| The Scrum Team | Assigning the Scrum Master's accountabilities to the team, the Product Owner and the organization | No: recall or explanation; lessons and labs cover it | none |
| The Scrum Team | Deciding who stays accountable when the Product Owner delegates Product Backlog work | Yes: choices with consequences | Proposed screen: P-S2 The Product Owner delegates |
| The Scrum Team | Organizing several Scrum Teams on one product around one Product Backlog, one Product Owner and one Product Goal | Yes: competing priorities across teams | Proposed screen: P-S3 Three teams, one product |
| The Scrum Team | Explaining how the Product Owner keeps authority over the Product Backlog while working with the Developers and stakeholders | No: recall or explanation; lessons and labs cover it | none |
| Scrum Events and Activities | Explaining the Sprint as the container for every other event, with a fixed length of one month or less | No: recall or explanation; lessons and labs cover it | none |
| Scrum Events and Activities | Running Sprint Planning that answers why, what and how within its timebox | Yes: timebox; choices with consequences | Proposed screen: P-S4 Sprint Planning under a timebox |
| Scrum Events and Activities | Running a Daily Scrum as the Developers' planning event rather than a status report | Yes: timebox; cues (status-report drift) | Proposed screen: P-S5 The Daily Scrum turns into a status meeting |
| Scrum Events and Activities | Running a Sprint Review as a working session with stakeholders that can change the Product Backlog | Yes: stakeholder pressure; consequences for the backlog | Proposed screen: P-S6 A Sprint Review with an unhappy stakeholder |
| Scrum Events and Activities | Running a Sprint Retrospective that finds the most helpful improvements for the next Sprint | Yes: choices with consequences in later Sprints | Proposed screen: P-S7 Retrospective that sticks |
| Scrum Events and Activities | Deciding what happens when a Sprint Goal becomes obsolete, and who may cancel a Sprint | Yes: time matters; competing priorities | Proposed screen: P-S8 The market moves mid-Sprint |
| Scrum Events and Activities | Treating Product Backlog refinement as an ongoing activity rather than an event | No: recall or explanation; lessons and labs cover it | none |
| Scrum Events and Activities | Choosing a Sprint length from risk, the need for feedback and the cost of planning | No: recall or explanation; lessons and labs cover it | none |
| Scrum Events and Activities | Explaining why timeboxes help, and what skipping the Sprint Retrospective costs | No: recall or explanation; lessons and labs cover it | none |
| Scrum Events and Activities | Comparing the Daily Scrum with a status meeting and why its constraints serve the Developers | No: recall or explanation; lessons and labs cover it | none |
| Scrum Artifacts and Commitments | Linking each artifact to its commitment: the Product Goal, the Sprint Goal and the Definition of Done | No: recall or explanation; lessons and labs cover it | none |
| Scrum Artifacts and Commitments | Managing the Product Backlog as an emergent, ordered list and judging when an item is ready for selection | Yes: competing priorities | Proposed screen: P-S13 Ordering the backlog under pressure |
| Scrum Artifacts and Commitments | Adapting the Sprint Backlog during the Sprint without endangering the Sprint Goal | Yes: competing priorities: new work against the Sprint Goal | Proposed screen: P-S8 The market moves mid-Sprint |
| Scrum Artifacts and Commitments | Creating more than one Increment in a Sprint and releasing before the Sprint Review | Yes: time matters: release before the Review | Proposed screen: P-S9 Not Done on the last day |
| Scrum Artifacts and Commitments | Writing and evolving a Definition of Done, including organizational standards and teams that share one | No: recall or explanation; lessons and labs cover it | none |
| Scrum Artifacts and Commitments | Deciding what happens to work that does not meet the Definition of Done when the Sprint ends | Yes: time matters (Sprint end); pressure to show it | Proposed screen: P-S9 Not Done on the last day |
| Scrum Artifacts and Commitments | Explaining why the Sprint Goal stays fixed during the Sprint while the Sprint Backlog can change | No: recall or explanation; lessons and labs cover it | none |
| Scrum Master Core Competencies | Recognizing situations where facilitation serves the team or the organization | No: recall or explanation; lessons and labs cover it | none |
| Scrum Master Core Competencies | Facilitating group decisions with techniques such as fist of five, dot voting and a decision rule agreed in advance | Yes: competing priorities in the room | Proposed screen: P-S10 Conflict in a self-managing team |
| Scrum Master Core Competencies | Choosing between facilitating, teaching, mentoring and coaching for a given situation | Yes: cues to read; choices with consequences | Proposed screen: P-S10 Conflict in a self-managing team |
| Scrum Master Core Competencies | Facilitating a Scrum event so it reaches its purpose within its timebox | Yes: timebox | Proposed screen: P-S4 Sprint Planning under a timebox |
| Scrum Master Core Competencies | Coaching with questions so a team member finds their own answer | Yes: cues to read in a one-to-one conversation | Proposed screen: P-S11 Coaching a developer one to one |
| Scrum Master Core Competencies | Teaching Scrum to a new stakeholder in plain terms | Yes: cues to read | Proposed screen: P-S16 A manager wants a status report |
| Service to the Team, Product Owner and Organization | Leading the Scrum Team as a servant leader in concrete situations | Yes: choices with consequences | Proposed screen: P-S10 Conflict in a self-managing team |
| Service to the Team, Product Owner and Organization | Explaining how technical debt builds up and what it does to the team's ability to deliver | No: recall or explanation; lessons and labs cover it | none |
| Service to the Team, Product Owner and Organization | Choosing development practices that keep each Increment high quality: test automation, continuous integration, pairing and refactoring | Yes: delayed consequences | Proposed screen: P-S15 Debt that slows every Sprint |
| Service to the Team, Product Owner and Organization | Supporting the Product Owner with backlog techniques and stakeholder collaboration | Yes: competing priorities: stakeholders against value | Proposed screen: P-S13 Ordering the backlog under pressure |
| Service to the Team, Product Owner and Organization | Identifying organizational impediments that block Scrum Teams | Yes: cues to read | Proposed screen: P-S12 An impediment outside the team |
| Service to the Team, Product Owner and Organization | Applying a technique to resolve an impediment, and deciding when the team should solve it themselves | Yes: time matters; competing priorities | Proposed screen: P-S12 An impediment outside the team |
| Service to the Team, Product Owner and Organization | Explaining the organizational design changes Scrum brings, and why Scrum has no project manager | No: recall or explanation; lessons and labs cover it | none |

CSM: 44 objectives, 23 fit the rule, 0 covered by a built sim.

### ITIL4FND

| Unit | Objective | Fits the rule? | Sim |
|---|---|---|---|
| Key Concepts of Service Management | Telling apart the customer, the user and the sponsor of a service in a scenario | No: recall or explanation; lessons and labs cover it | none |
| Key Concepts of Service Management | Explaining value co-creation: how value, outcomes, outputs, costs and risks relate in a service | No: recall or explanation; lessons and labs cover it | none |
| Key Concepts of Service Management | Distinguishing utility (fit for purpose) from warranty (fit for use) in a service description | No: recall or explanation; lessons and labs cover it | none |
| Key Concepts of Service Management | Describing a service offering as goods, access to resources and service actions | No: recall or explanation; lessons and labs cover it | none |
| Key Concepts of Service Management | Explaining service relationships: service provision, service consumption and service relationship management | No: recall or explanation; lessons and labs cover it | none |
| Key Concepts of Service Management | Identifying which costs and risks a service removes from, or adds to, the consumer | No: recall or explanation; lessons and labs cover it | none |
| The ITIL Guiding Principles | Applying focus on value and start where you are to an improvement initiative | Yes: choices with consequences | Proposed screen: P-I4 An improvement initiative that stalls |
| The ITIL Guiding Principles | Applying progress iteratively with feedback and collaborate and promote visibility | Yes: choices with consequences | Proposed screen: P-I4 An improvement initiative that stalls |
| The ITIL Guiding Principles | Applying think and work holistically and keep it simple and practical | Yes: choices with consequences | Proposed screen: P-I4 An improvement initiative that stalls |
| The ITIL Guiding Principles | Applying optimize and automate, and why optimizing comes before automating | Yes: choices with consequences | Proposed screen: P-I4 An improvement initiative that stalls |
| The ITIL Guiding Principles | Explaining how the guiding principles interact and why they are used together | No: recall or explanation; lessons and labs cover it | none |
| The ITIL Guiding Principles | Choosing the principle a scenario most calls for | Yes: choices with consequences | Proposed screen: P-I4 An improvement initiative that stalls |
| The Four Dimensions of Service Management | Describing the organizations and people dimension: structures, roles, culture and competencies | No: recall or explanation; lessons and labs cover it | none |
| The Four Dimensions of Service Management | Describing the information and technology dimension a service depends on | No: recall or explanation; lessons and labs cover it | none |
| The Four Dimensions of Service Management | Describing the partners and suppliers dimension and sourcing decisions | No: recall or explanation; lessons and labs cover it | none |
| The Four Dimensions of Service Management | Describing the value streams and processes dimension | No: recall or explanation; lessons and labs cover it | none |
| The Four Dimensions of Service Management | Explaining how external factors -- political, economic, social, technological, legal and environmental -- act on all four dimensions | No: recall or explanation; lessons and labs cover it | none |
| The Four Dimensions of Service Management | Analyzing a failed change for the dimension that was neglected | Yes: cues to read | Proposed screen: P-I2 The emergency change |
| The ITIL Service Value System | Describing the components of the service value system: guiding principles, governance, the service value chain, practices and continual improvement | No: recall or explanation; lessons and labs cover it | none |
| The ITIL Service Value System | Explaining how opportunity and demand enter the service value system and value comes out | No: recall or explanation; lessons and labs cover it | none |
| The ITIL Service Value System | Explaining governance's role in directing and controlling the organization | No: recall or explanation; lessons and labs cover it | none |
| The ITIL Service Value System | Explaining how the service value system breaks down organizational silos | No: recall or explanation; lessons and labs cover it | none |
| The Service Value Chain | Describing the purpose of each value chain activity | No: recall or explanation; lessons and labs cover it | none |
| The Service Value Chain | Explaining how value chain activities combine into value streams | No: recall or explanation; lessons and labs cover it | none |
| The Service Value Chain | Mapping a value stream for a user request through the value chain | Yes: time matters: request to fulfillment | Proposed screen: P-I3 A request that bounces between teams |
| The Service Value Chain | Explaining how one practice contributes to several value chain activities | No: recall or explanation; lessons and labs cover it | none |
| Purpose and Key Terms of 15 ITIL Practices | Recalling the purpose of information security management, relationship management and supplier management | No: recall or explanation; lessons and labs cover it | none |
| Purpose and Key Terms of 15 ITIL Practices | Recalling the purpose of IT asset management, monitoring and event management, and service configuration management | No: recall or explanation; lessons and labs cover it | none |
| Purpose and Key Terms of 15 ITIL Practices | Recalling the purpose of release management and deployment management, and telling them apart | No: recall or explanation; lessons and labs cover it | none |
| Purpose and Key Terms of 15 ITIL Practices | Recalling the purpose of the seven practices studied in depth | No: recall or explanation; lessons and labs cover it | none |
| Purpose and Key Terms of 15 ITIL Practices | Defining IT asset, event, configuration item, change, incident, problem and known error | No: recall or explanation; lessons and labs cover it | none |
| Purpose and Key Terms of 15 ITIL Practices | Matching a scenario to the practice whose purpose it serves | Yes: cues to read | Proposed screen: P-I1 Monday-morning service desk |
| Seven ITIL Practices in Detail | Applying the continual improvement model step by step to an improvement initiative | Yes: choices with consequences over weeks | Proposed screen: P-I4 An improvement initiative that stalls |
| Seven ITIL Practices in Detail | Using a continual improvement register and explaining who owns continual improvement | No: recall or explanation; lessons and labs cover it | none |
| Seven ITIL Practices in Detail | Explaining change enablement: standard, normal and emergency changes and the change authority | Yes: time matters; risk against speed | Proposed screen: P-I2 The emergency change |
| Seven ITIL Practices in Detail | Managing incidents: prioritization, swarming, escalation and the link to the service desk | Yes: time matters (SLA clocks); competing priorities | Proposed screen: P-I1 Monday-morning service desk |
| Seven ITIL Practices in Detail | Managing problems through problem identification, problem control and error control, with workarounds and known errors | Yes: cues to read: repeat incidents | Proposed screen: P-I1 Monday-morning service desk |
| Seven ITIL Practices in Detail | Handling service requests with predefined, standardized workflows | Yes: time matters | Proposed screen: P-I3 A request that bounces between teams |
| Seven ITIL Practices in Detail | Designing a service desk's channels and skills and its part in the user's experience | No: recall or explanation; lessons and labs cover it | none |
| Seven ITIL Practices in Detail | Setting service levels with customers and measuring them by experience, not only technical metrics | Yes: competing priorities: green dashboard, unhappy users | Proposed screen: P-I5 Watermelon SLAs |

ITIL4FND: 40 objectives, 14 fit the rule, 0 covered by a built sim.

### CSSGB

| Unit | Objective | Fits the rule? | Sim |
|---|---|---|---|
| Six Sigma and the Organization | Explaining why organizations use Six Sigma and its roots in Shewhart, Deming, Juran and Ishikawa | No: recall or explanation; lessons and labs cover it | none |
| Six Sigma and the Organization | Linking a Six Sigma project to organizational goals with SMART goals and key performance indicators | No: recall or explanation; lessons and labs cover it | none |
| Six Sigma and the Organization | Applying lean concepts: flow, takt time, just-in-time, the theory of constraints and going to the gemba | Yes: time matters: takt and flow | Proposed screen: P-Q6 Waste on the floor |
| Six Sigma and the Organization | Using value stream mapping to separate value-added steps from waste | Yes: cues to read | Proposed screen: P-Q6 Waste on the floor |
| Six Sigma and the Organization | Distinguishing DMAIC from the design roadmaps DMADV and IDOV | No: recall or explanation; lessons and labs cover it | none |
| Six Sigma and the Organization | Building a basic FMEA and calculating and interpreting risk priority numbers | Yes: competing priorities: which failure mode first | Proposed screen: P-Q1 A DMAIC project on a real line |
| Six Sigma and the Organization | Distinguishing a design FMEA from a process FMEA | No: recall or explanation; lessons and labs cover it | none |
| Define Phase | Deciding whether a problem suits DMAIC or another problem-solving method | Yes: choices with consequences | Proposed screen: P-Q1 A DMAIC project on a real line |
| Define Phase | Mapping a process with SIPOC and naming its owners and stakeholders | No: recall or explanation; lessons and labs cover it | none |
| Define Phase | Turning voice-of-the-customer data into critical-to-quality requirements with a CTQ tree, the Kano model and QFD | No: recall or explanation; lessons and labs cover it | none |
| Define Phase | Writing a project charter: problem statement, scope, primary and consequential metrics, plan and risks | Yes: choices with consequences (scope creep later) | Proposed screen: P-Q1 A DMAIC project on a real line |
| Define Phase | Choosing among the management and planning tools for a situation | No: recall or explanation; lessons and labs cover it | none |
| Define Phase | Calculating process performance metrics: defects per unit, defects per million opportunities, rolled throughput yield and the cost of poor quality | No: recall or explanation; lessons and labs cover it | none |
| Define Phase | Leading a team through its stages, defining roles with a RACI chart, and using brainstorming, nominal group technique and multivoting | Yes: cues to read; consequences | Proposed screen: P-Q1 A DMAIC project on a real line |
| Define Phase | Comparing competitive, collaborative and best-practice benchmarking | No: recall or explanation; lessons and labs cover it | none |
| Measure Phase | Developing process maps and checking written procedures against how the work is really done | No: recall or explanation; lessons and labs cover it | none |
| Measure Phase | Applying basic probability: independent and mutually exclusive events, permutations and combinations | No: recall or explanation; lessons and labs cover it | none |
| Measure Phase | Explaining the central limit theorem and why it matters for confidence intervals and control charts | No: recall or explanation; lessons and labs cover it | none |
| Measure Phase | Choosing a distribution: normal, binomial, Poisson, chi-square, Student's t or F | No: recall or explanation; lessons and labs cover it | none |
| Measure Phase | Classifying data and measurement scales and writing a data collection plan with sampling and data checks | Yes: choices with consequences | Proposed screen: P-Q2 Is the gauge lying? |
| Measure Phase | Calculating and interpreting descriptive statistics and graphs: histograms, box plots, scatter diagrams and normal probability plots | No: recall or explanation; lessons and labs cover it | none |
| Measure Phase | Evaluating a measurement system with gauge R&R, bias, linearity and percent agreement | Yes: cues to read in data; consequence: decisions on bad data | Proposed screen: P-Q2 Is the gauge lying? |
| Measure Phase | Calculating Cp, Cpk, Pp and Ppk and the sigma level, and allowing for the shift between short- and long-term data | Yes: cues to read: an unstable process | Proposed screen: P-Q3 Capability on an unstable process |
| Analyze Phase | Using multi-vari studies to separate positional, cyclical and temporal variation | Yes: cues to read | Proposed screen: P-Q4 Root cause hunt |
| Analyze Phase | Calculating correlation and simple linear regression, and telling correlation from causation | Yes: cues to read: correlation or cause | Proposed screen: P-Q4 Root cause hunt |
| Analyze Phase | Setting up a hypothesis test: hypotheses, significance level, power, type I and type II errors and sample size | Yes: choices with consequences (errors) | Proposed screen: P-Q4 Root cause hunt |
| Analyze Phase | Choosing and interpreting tests for means, variances and proportions: t-tests, the F-test, ANOVA and chi-square | Yes: choices with consequences | Proposed screen: P-Q4 Root cause hunt |
| Analyze Phase | Distinguishing statistical significance from practical significance | Yes: competing priorities | Proposed screen: P-Q4 Root cause hunt |
| Analyze Phase | Analyzing gaps between current and future performance | No: recall or explanation; lessons and labs cover it | none |
| Analyze Phase | Finding root causes with cause-and-effect diagrams, 5 Whys, relational matrices and fault tree analysis | Yes: cues to read | Proposed screen: P-Q4 Root cause hunt |
| Improve Phase | Defining design of experiments terms: factors, levels, responses, treatments, blocking, randomization and replication | No: recall or explanation; lessons and labs cover it | none |
| Improve Phase | Interpreting main effects and interaction plots | Yes: cues to read | Proposed screen: P-Q5 A pilot that has to work |
| Improve Phase | Planning implementation with proofs of concept, pilots, simulations and try-storming | Yes: time matters; risk against speed | Proposed screen: P-Q5 A pilot that has to work |
| Improve Phase | Eliminating waste with pull systems, kanban, 5S, standard work and poka-yoke | Yes: time matters: flow and queues | Proposed screen: P-Q6 Waste on the floor |
| Improve Phase | Reducing cycle time with continuous flow and setup reduction (SMED) | Yes: time matters | Proposed screen: P-Q6 Waste on the floor |
| Improve Phase | Distinguishing kaizen from a kaizen blitz and choosing between them | No: recall or explanation; lessons and labs cover it | none |
| Control Phase | Explaining the aims of SPC and telling common-cause from special-cause variation | Yes: cues to read: special cause or noise; tampering costs | Proposed screen: P-Q7 Control chart on shift |
| Control Phase | Using rational subgrouping | Yes: choices with consequences | Proposed screen: P-Q7 Control chart on shift |
| Control Phase | Selecting and interpreting a control chart: X-bar and R, X-bar and s, individuals and moving range, median, p, np, c and u | Yes: cues to read; time matters | Proposed screen: P-Q7 Control chart on shift |
| Control Phase | Developing a control plan with the document control and training that sustain it | Yes: delayed consequences: the gain slips | Proposed screen: P-Q8 Holding the gain |
| Control Phase | Distinguishing first-, second- and third-party audits | No: recall or explanation; lessons and labs cover it | none |
| Control Phase | Applying plan-do-check-act to sustain and extend a gain | Yes: delayed consequences | Proposed screen: P-Q8 Holding the gain |
| Control Phase | Using total productive maintenance and the visual factory (andon, jidoka) to hold the improved process | Yes: time matters: a stop on the line | Proposed screen: P-Q8 Holding the gain |

CSSGB: 43 objectives, 25 fit the rule, 0 covered by a built sim.

### NASMCNC

| Unit | Objective | Fits the rule? | Sim |
|---|---|---|---|
| Professional Practice and Scope | Defining a nutrition coach's scope: habit coaching and general, evidence-based guidance, never diagnosing or providing medical nutrition therapy | Yes: choices with consequences | Built: `cnc-crash-diet-request` (scope criterion) |
| Professional Practice and Scope | Recognizing when to refer to a registered dietitian nutritionist or physician: a diagnosed condition, a suspected eating disorder, pregnancy or breastfeeding needs beyond general guidance, or medications affected by diet | Yes: cues to read; a protective step with consequences | Built: `cnc-crash-diet-request` |
| Professional Practice and Scope | Checking the title and practice rules where you coach, such as Washington's protected titles certified dietitian and certified nutritionist | No: recall or explanation; lessons and labs cover it | none |
| Professional Practice and Scope | Evaluating nutrition research: study designs, the strength of evidence and red flags in a headline claim | No: recall or explanation; lessons and labs cover it | none |
| Professional Practice and Scope | Following professional standards: confidentiality, honest marketing and records | No: recall or explanation; lessons and labs cover it | none |
| Professional Practice and Scope | Explaining how culture, preference, budget and access shape what a client eats | Yes: cues to read | Proposed screen (client trainer): T-C2 Travel, holidays and a tight budget |
| Nutrition Science | Explaining energy balance and the parts of total daily energy expenditure, and why intake estimates are approximate | No: recall or explanation; lessons and labs cover it | none |
| Nutrition Science | Calculating calories from macronutrient grams with 4, 4, 9 and 7 kcal per gram | No: recall or explanation; lessons and labs cover it | none |
| Nutrition Science | Explaining protein quality and needs, from the 0.8 g/kg RDA to the higher targets for active adults | No: recall or explanation; lessons and labs cover it | none |
| Nutrition Science | Explaining carbohydrates -- sugars, starch and fiber -- and how much fiber adults need | No: recall or explanation; lessons and labs cover it | none |
| Nutrition Science | Explaining dietary fats: saturated, unsaturated and trans fats and the essential fatty acids | No: recall or explanation; lessons and labs cover it | none |
| Nutrition Science | Explaining alcohol's energy and its effects on recovery and body composition | No: recall or explanation; lessons and labs cover it | none |
| Nutrition Science | Explaining vitamins and minerals, deficiency, excess and upper limits | No: recall or explanation; lessons and labs cover it | none |
| Nutrition Science | Planning hydration from total water needs, sweat losses and sodium | No: recall or explanation; lessons and labs cover it | none |
| Nutrition Science | Explaining nutrient timing around training and what the evidence does and does not support | No: recall or explanation; lessons and labs cover it | none |
| Nutrition Science | Evaluating a supplement: how it is regulated, third-party testing, and when it is a question for a clinician | Yes: cues to read (intake form, label); a protective step | Built: `cnc-greens-powder-warfarin` |
| Behavior Change Strategies | Identifying a client's barriers and readiness to change with the stages-of-change model | Yes: cues to read | Secondary: `cnc-ambivalent-food-record` (client trainer, REQ-314) |
| Behavior Change Strategies | Using motivational interviewing: open questions, affirmations, reflections and summaries | Yes: cues to read; choices change the client's state | Built: `cnc-ambivalent-food-record` (client trainer, REQ-314) |
| Behavior Change Strategies | Setting SMART goals and choosing behavior goals over outcome goals | Yes: choices with consequences | Built: `cnc-greens-powder-warfarin` (goal criterion) |
| Behavior Change Strategies | Tracking progress with measures beyond the scale | Yes: delayed consequences over weeks | Proposed screen (client trainer): T-C1 Twelve weeks of coaching |
| Behavior Change Strategies | Building habits with cues, small steps and changes to the environment, and planning for lapses | Yes: delayed consequences: lapses | Proposed screen (client trainer): T-C1 Twelve weeks of coaching |
| Behavior Change Strategies | Personalizing strategies to a client's preferences and daily life | Yes: choices with consequences over weeks | Proposed screen (client trainer): T-C1 Twelve weeks of coaching |
| Practical Nutrition Coaching | Assessing dietary intake with food records, 24-hour recalls and food frequency questionnaires, and knowing their limits | Yes: cues to read: under-reporting | Secondary: `cnc-ambivalent-food-record` (client trainer, REQ-314) |
| Practical Nutrition Coaching | Reading a Nutrition Facts label: serving size, percent Daily Value and added sugars | No: recall or explanation; lessons and labs cover it | none |
| Practical Nutrition Coaching | Reading a Supplement Facts label and spotting claims a supplement may not lawfully make | Yes: cues to read | Built: `cnc-greens-powder-warfarin` (label criterion) |
| Practical Nutrition Coaching | Comparing popular eating patterns -- Mediterranean, plant-based, low-carbohydrate and time-restricted eating -- against a client's goals and preferences | No: recall or explanation; lessons and labs cover it | none |
| Practical Nutrition Coaching | Coaching everyday eating situations: eating out, travel, social events and a tight budget | Yes: competing priorities: budget, travel, social | Proposed screen (client trainer): T-C2 Travel, holidays and a tight budget |
| Practical Nutrition Coaching | Building a personalized, food-first nutrition plan within the coaching scope | Yes: choices with consequences over weeks | Proposed screen (client trainer): T-C1 Twelve weeks of coaching |
| Practical Nutrition Coaching | Coaching weight management with a modest energy deficit, and recognizing when weight change is a referral question | Yes: delayed consequences; cues for referral | Proposed screen (client trainer): T-C1 Twelve weeks of coaching |

NASMCNC: 29 objectives, 15 fit the rule; 5 were covered by a built sim before REQ-314, which adds one built (motivational interviewing) and two secondary (stages of change, food records).
