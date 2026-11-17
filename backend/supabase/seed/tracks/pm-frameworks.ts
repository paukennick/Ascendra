// REQ-280 (Nick, 2026-11-14): Scrum, ITIL and Six Sigma courses, built
// beside the PMI tracks (pm.ts) in the shape the NBCC courses set (nbcc.ts):
// dated unit sources, the body's own outline headings as `outline`
// (REQ-235), key values the lesson writer and fact-checker are given
// (REQ-220), and objectives in our own words (the Nov 11 paraphrase rule).
//
// What was read, and when (all 2026-11-14, on the body's own site unless
// marked otherwise):
//   - The Scrum Guide, November 2020 (scrumguides.org, the US English PDF at
//     docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf). The revision history
//     page lists 2017 -> 2020 as the latest change set; nothing newer was
//     found. The Guide is CC BY-SA 4.0, so its section headings are quoted.
//   - Scrum.org, Professional Scrum Master I (PSM I) page: $200 per attempt,
//     80 questions (multiple choice, multiple answer, true/false), 60
//     minutes, 85% to pass, password valid for one attempt and does not
//     expire; English, Japanese, and Simplified Chinese through
//     scrum.org.cn. Focus areas (the Professional Scrum Competencies):
//     Understanding and Applying the Scrum Framework (Empiricism, Scrum
//     Values, Scrum Team, Events, Artifacts, Done); Developing People and
//     Teams (Self-Managing Teams, Facilitation, Coaching); Managing Products
//     with Agility (Forecasting & Release Planning, Product Value, Product
//     Backlog Management, Stakeholders & Customers). Scrum.org publishes NO
//     weights, so PSMI's unit weights are our study emphasis
//     (domainWeights: "study_emphasis", REQ-220).
//   - Scrum Alliance, Certified ScrumMaster page: 16 hours of training with
//     a Certified Scrum Trainer, then an online test of 50 multiple-choice
//     questions, 37 correct to pass, one hour, two attempts within 90 days
//     included in the course fee; renew every two years with SEUs. The CSM
//     Learning Objectives (PDF "Last Updated: January 2022", formatted
//     2/2024) and the Scrum Foundations Learning Objectives (same dates),
//     which a CSM offering must also cover. Both are based on the 2020 Scrum
//     Guide. The CSM is earned by attending the course and passing that test:
//     no weights are published, the course cannot be replaced by this one,
//     so CSM is modeled as preparation for the course test and the role,
//     its weights are study emphasis (roughly the share of learning
//     objectives per unit), and the description says the course is required.
//   - PeopleCert, ITIL 4 Foundation product page (40 multiple-choice
//     questions, 60 minutes, closed book, 65% to pass, 12 languages) and
//     PeopleCert's ITIL FAQ ("The current plan is to sunset all ITIL 4
//     modules on 31 December 2027"; ITIL 4 and ITIL (Version 5) "will run in
//     parallel for a period"). ITIL Foundation (Version 5) is already on
//     sale (same 40 questions / 60 minutes / 65%). PeopleCert's ITIL 4
//     Foundation candidate syllabus is NOT public: its learning outcomes,
//     assessment criteria and marks per criterion were read in an accredited
//     training organization's student workbook (ITIL 4 Foundation Student
//     Workbook ITI4-223 v1.46, 2022-01-28, sii.pl) that reproduces
//     "EN_ITIL4_FND_2019_CandidateSyll_v1.4" (September 2019). That is a copy,
//     not PeopleCert's own document, and a later syllabus version cannot be
//     ruled out, so ITIL4FND is left UNVERIFIED (no sourceVerifiedAt) until
//     Nick decides (report: accept the copy, supply the official syllabus, or
//     build ITIL Foundation (Version 5) instead).
//   - ASQ, Six Sigma Green Belt page and the CSSGB brochure with the 2022
//     Body of Knowledge (asq.org/cert/resource/pdf/certification/
//     cssgb-cert-insert.pdf, footer "2022 CSSGB BoK"): computer-delivered,
//     110 questions (100 scored, 10 unscored), 4.5-hour appointment with
//     4 hours 18 minutes of exam time, open book, English; three years of
//     work experience in the BoK, no educational waivers; $483 ($100 off for
//     members), retake $283. Section question counts 11 / 20 / 20 / 18 / 16 /
//     15 of the 100 scored. asq.org/cert/faq/passing-score: 550 of 750 points.
//     Why ASQ rather than IASSC or a training company's belt: ASQ publishes
//     a dated Body of Knowledge with question counts and cognitive levels,
//     requires work experience, and runs a proctored exam; that makes it the
//     one an employer can check and the one a course can be built to.
//
// Subcategories: Scrum (PSMI, CSM) and Six Sigma (CSSGB) sit in new rows
// under Project Management Certifications (migration 084), so they are on
// the PM plan; ITIL sits in IT & Software / IT Certifications (migration
// 007), so it is on the IT and cloud plan. Both choices are reported to Nick.
//
// Trademarks: Professional Scrum Master and PSM are Scrum.org's; Certified
// ScrumMaster and CSM are Scrum Alliance's; ITIL is PeopleCert's; CSSGB is
// ASQ's. Titles follow the "Prep for the ..." pattern (REQ-097) and every
// description carries an independence statement.

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
export const PM_FRAMEWORKS_VERIFIED_AT = "2026-11-14T00:00:00Z";
// A year on, the certification_aligned cycle (as EMS, DP-300).
const REVIEW_DUE_AT = "2027-11-14T00:00:00Z";
// ITIL: before PeopleCert's planned 2027-12-31 sunset of ITIL 4.
const ITIL_REVIEW_DUE_AT = "2027-06-01T00:00:00Z";

const src = (title: string, url: string, kind: UnitSource["kind"], recheckBy?: string, extra: Partial<UnitSource> = {}): UnitSource => ({
  title,
  ...source(url, kind, CHECKED, recheckBy),
  ...extra,
});

const SCRUM_GUIDE_URL = "https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf";
const PSM_URL = "https://www.scrum.org/assessments/professional-scrum-master-i-certification";
const CSM_URL = "https://www.scrumalliance.org/get-certified/scrum-master-track/certified-scrummaster";
const CSM_LO_URL = "https://www.scrumalliance.org/media/certifications/los/csm_learning_objectives_2022.pdf";
const SF_LO_URL = "https://www.scrumalliance.org/media/certifications/los/scrum_foundations_learning_objectives_2022.pdf";
const ITIL_URL = "https://www.peoplecert.org/browse-certifications/it-governance-and-service-management/ITIL-1/itil-4-foundation-2565";
const ITIL_FAQ_URL = "https://www.peoplecert.org/help-and-support/faq-itil";
// The accredited training organization's workbook that reproduces the
// syllabus (header).
const ITIL_SYLLABUS_COPY_URL = "https://sii.pl/wp-content/uploads/2022/03/Training-material-ITIL-Fn.pdf";
const CSSGB_URL = "https://www.asq.org/cert/six-sigma-green-belt";
const CSSGB_BOK_URL = "https://www.asq.org/cert/resource/pdf/certification/cssgb-cert-insert.pdf";

// ===========================================================================
// Scrum: the Scrum Guide (shared by PSM I and CSM)
// ===========================================================================

const guide = (sections: string[], keyValues: string[] = []): UnitSource =>
  src("The Scrum Guide (Schwaber and Sutherland, November 2020)", SCRUM_GUIDE_URL, "reference", undefined, {
    outline: sections,
    ...(keyValues.length ? { keyValues } : {}),
  });

const GUIDE_KEYS = {
  theory: [
    "Scrum rests on empiricism and lean thinking; its three empirical pillars are transparency, inspection and adaptation",
    "the five Scrum values are commitment, focus, openness, respect and courage",
    "Scrum is purposefully incomplete: it defines the parts required, and teams add practices inside it; changing its core design or leaving parts out hides problems and is not Scrum",
  ],
  team: [
    "one Scrum Team: one Scrum Master, one Product Owner and Developers, with no sub-teams or hierarchies; cross-functional and self-managing; typically 10 or fewer people",
    "three accountabilities: Developers, Product Owner, Scrum Master (the 2020 Guide says accountabilities, not roles)",
    "the Product Owner is one person, not a committee; others may do backlog work but the Product Owner remains accountable",
    "several Scrum Teams on one product share one Product Goal, one Product Backlog and one Product Owner",
  ],
  events: [
    "the Sprint is a fixed length of one month or less; a new Sprint starts immediately after the previous one",
    "Sprint Planning: at most 8 hours for a one-month Sprint; it answers why the Sprint is valuable, what can be Done and how",
    "the Daily Scrum is a 15-minute event for the Developers, at the same time and place every working day",
    "Sprint Review: at most 4 hours for a one-month Sprint; a working session, not a presentation",
    "Sprint Retrospective: at most 3 hours for a one-month Sprint; it concludes the Sprint",
    "only the Product Owner may cancel a Sprint, and only when the Sprint Goal becomes obsolete",
    "Product Backlog refinement is an ongoing activity, not an event",
  ],
  artifacts: [
    "Product Backlog -> Product Goal; Sprint Backlog -> Sprint Goal; Increment -> Definition of Done",
    "multiple Increments may be created within a Sprint and may be delivered before the Sprint Review; the Sprint Review should never be the only gate to releasing value",
    "work that does not meet the Definition of Done cannot be part of an Increment or presented at the Sprint Review; it returns to the Product Backlog",
    "an organizational Definition of Done is the minimum every team follows; several teams on one product share one Definition of Done",
  ],
};

// Objectives shared by PSM I and CSM, in the Guide's order.
const SCRUM_THEORY = [
  "Explaining empiricism and lean thinking as the foundations Scrum is built on",
  "Applying the three pillars -- transparency, inspection and adaptation -- to spot where a team has stopped inspecting or adapting",
  "Recognizing the five Scrum values in a team's behavior and what happens when they erode",
  "Distinguishing Scrum as a lightweight framework from a full methodology, and what a team may add to it but not remove",
  "Explaining how an iterative, incremental approach controls risk and improves predictability",
];

const SCRUM_TEAM = [
  "Describing the Scrum Team as one cross-functional, self-managing unit with no sub-teams or hierarchies",
  "Assigning the Developers' accountabilities: the Sprint Backlog, quality through the Definition of Done, and adapting their plan each day",
  "Assigning the Product Owner's accountabilities for value and the Product Backlog, and why the Product Owner is one person",
  "Assigning the Scrum Master's accountabilities to the team, the Product Owner and the organization",
  "Deciding who stays accountable when the Product Owner delegates Product Backlog work",
  "Organizing several Scrum Teams on one product around one Product Backlog, one Product Owner and one Product Goal",
];

const SCRUM_EVENTS = [
  "Explaining the Sprint as the container for every other event, with a fixed length of one month or less",
  "Running Sprint Planning that answers why, what and how within its timebox",
  "Running a Daily Scrum as the Developers' planning event rather than a status report",
  "Running a Sprint Review as a working session with stakeholders that can change the Product Backlog",
  "Running a Sprint Retrospective that finds the most helpful improvements for the next Sprint",
  "Deciding what happens when a Sprint Goal becomes obsolete, and who may cancel a Sprint",
  "Treating Product Backlog refinement as an ongoing activity rather than an event",
  "Choosing a Sprint length from risk, the need for feedback and the cost of planning",
];

const SCRUM_ARTIFACTS = [
  "Linking each artifact to its commitment: the Product Goal, the Sprint Goal and the Definition of Done",
  "Managing the Product Backlog as an emergent, ordered list and judging when an item is ready for selection",
  "Adapting the Sprint Backlog during the Sprint without endangering the Sprint Goal",
  "Creating more than one Increment in a Sprint and releasing before the Sprint Review",
  "Writing and evolving a Definition of Done, including organizational standards and teams that share one",
  "Deciding what happens to work that does not meet the Definition of Done when the Sprint ends",
];

const scrumOrg = (areas: string[]): UnitSource =>
  src("Scrum.org, Professional Scrum Master I: focus areas (Professional Scrum Competencies)", PSM_URL, "exam_outline", undefined, { outline: areas });

const PSM_FORMAT = src("Scrum.org, Professional Scrum Master I assessment", PSM_URL, "exam_outline", undefined, {
  keyValues: [
    "80 questions -- multiple choice, multiple answer and true/false -- in 60 minutes; 85% to pass",
    "$200 per attempt; each password is good for one attempt and does not expire",
    "the assessment tests Scrum as described in the Scrum Guide (2020)",
  ],
});

const ADD = (base: string[], extra: string[]) => [...base, ...extra];

export const PSMI_TRACK: SeedTrack = {
  code: "PSMI",
  title: "Prep for an entry-level Scrum Master assessment",
  description:
    "Preparation for Scrum.org's PSM I assessment, built on the 2020 Scrum Guide: empiricism and the Scrum values, the Scrum Team's accountabilities, the events, the artifacts and their commitments, then coaching self-managing teams and managing products with agility. Scrum.org publishes no domain weights, so the unit weights are our study emphasis. This course is not affiliated with Advanced Development Methods d/b/a Scrum.org (ADM) and does not constitute an endorsement of any product, service or point of view by ADM. Professional Scrum Master and PSM are trademarks and/or registered trademarks of Advanced Development Methods, Inc., d/b/a Scrum.org.",
  trackType: "certification",
  subcategorySlug: "agile-scrum-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: PSM_URL,
  sourceVerifiedAt: PM_FRAMEWORKS_VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  credential: {
    domainWeights: "study_emphasis", // REQ-220: Scrum.org publishes no weights
    providerSlug: "scrum-org",
    providerName: "Scrum.org",
    providerUrl: "https://www.scrum.org/",
    subcategorySlug: "agile-scrum-certifications",
    credentialSlug: "psm-i",
    credentialName: "Professional Scrum Master I (PSM I)",
    credentialType: "certification",
    credentialUrl: PSM_URL,
    basis: "vendor_exam_unpublished_code",
    status: "active",
    examRevision: "Scrum Guide 2020",
    objectivesRevision: "Professional Scrum Competencies (focus areas), read 2026-11-14",
    versionNote:
      "Scrum.org prints no version for the PSM I; it tests the Scrum Guide, whose current edition is November 2020 (scrumguides.org revision history, read 2026-11-14).",
    officialObjectivesUrl: PSM_URL,
    lastVendorVerifiedAt: PM_FRAMEWORKS_VERIFIED_AT,
    recommendedExperience:
      "None required: no course is mandatory. Scrum.org's own two-day courses are optional. The assessment is open to anyone who buys a password.",
    durationMinutes: 60,
    questionFormat:
      "80 questions (multiple choice, multiple answer and true/false) in 60 minutes, online; English, Japanese, and Simplified Chinese through scrum.org.cn. $200 per attempt; the password is good for one attempt and does not expire.",
    passingScorePolicy: "85% to pass. The certification does not expire and needs no renewal fee.",
  },
  units: [
    {
      title: "Scrum Theory, Empiricism and Values",
      weight: 15,
      gate: "Given a team's story, name which pillar or value is missing, what that hides, and the Scrum element that would bring it back -- not a generic 'be more agile'.",
      sources: [scrumOrg(["Understanding and Applying the Scrum Framework: Empiricism", "Understanding and Applying the Scrum Framework: Scrum Values"]), guide(["Scrum Definition", "Scrum Theory", "Transparency", "Inspection", "Adaptation", "Scrum Values"], GUIDE_KEYS.theory), PSM_FORMAT],
      objectives: ADD(SCRUM_THEORY, ["Relating Scrum to the values and principles of the Manifesto for Agile Software Development"]),
    },
    {
      title: "The Scrum Team and Its Accountabilities",
      weight: 15,
      gate: "Given a disputed decision, say whose accountability it is under the 2020 Guide and why, including when several teams work on one product.",
      sources: [scrumOrg(["Understanding and Applying the Scrum Framework: Scrum Team", "Developing People and Teams: Self-Managing Teams"]), guide(["Scrum Team", "Developers", "Product Owner", "Scrum Master"], GUIDE_KEYS.team)],
      objectives: SCRUM_TEAM,
    },
    {
      title: "Scrum Events",
      weight: 20,
      gate: "Given an event that is going wrong, state its purpose, who attends, its timebox, and the one change that brings it back to purpose.",
      sources: [scrumOrg(["Understanding and Applying the Scrum Framework: Events"]), guide(["Scrum Events", "The Sprint", "Sprint Planning", "Daily Scrum", "Sprint Review", "Sprint Retrospective"], GUIDE_KEYS.events)],
      objectives: SCRUM_EVENTS,
    },
    {
      title: "Scrum Artifacts, Commitments and Done",
      weight: 20,
      gate: "Given a backlog or an Increment, name the artifact's commitment and decide whether the work is Done, releasable, or goes back to the Product Backlog.",
      sources: [scrumOrg(["Understanding and Applying the Scrum Framework: Artifacts", "Understanding and Applying the Scrum Framework: Done"]), guide(["Scrum Artifacts", "Product Backlog", "Commitment: Product Goal", "Sprint Backlog", "Commitment: Sprint Goal", "Increment", "Commitment: Definition of Done"], GUIDE_KEYS.artifacts)],
      objectives: SCRUM_ARTIFACTS,
    },
    {
      title: "Developing People and Teams",
      weight: 10,
      gate: "Given a team that depends on its Scrum Master, choose whether to facilitate, teach, mentor or coach, and say what you do so the team owns the outcome.",
      sources: [scrumOrg(["Developing People and Teams: Self-Managing Teams", "Developing People and Teams: Facilitation", "Developing People and Teams: Coaching"]), guide(["Scrum Master"])],
      objectives: [
        "Supporting a self-managing team: when the Scrum Master steps in and when the team decides",
        "Choosing between facilitating, teaching, mentoring and coaching for a given situation",
        "Facilitating a team decision so every voice is heard and the decision stays the team's",
        "Causing the removal of impediments to the team's progress without solving everything for them",
        "Recognizing Scrum anti-patterns -- the Scrum Master as task assigner, a status-report Daily Scrum, a stabilization Sprint -- and responding to them",
        "Leading the organization's Scrum adoption: training, coaching and helping stakeholders work with the team",
      ],
    },
    {
      title: "Managing Products with Agility",
      weight: 20,
      gate: "Given a product with competing stakeholder requests, order the backlog toward the Product Goal, forecast honestly from empirical data, and say what you would show at the Sprint Review.",
      sources: [scrumOrg(["Managing Products with Agility: Forecasting & Release Planning", "Managing Products with Agility: Product Value", "Managing Products with Agility: Product Backlog Management", "Managing Products with Agility: Stakeholders & Customers"]), guide(["Product Owner", "Product Backlog", "Commitment: Product Goal", "Sprint Review"])],
      objectives: [
        "Ordering the Product Backlog to maximize value, and measuring value by outcomes rather than output",
        "Forecasting and release planning from empirical data such as burn-down charts, cumulative flow and past throughput, and knowing their limits",
        "Engaging stakeholders and customers through the Sprint Review and the Product Owner without taking the plan from the Developers",
        "Defining a Product Goal and using it to decide what not to build",
        "Managing technical debt and its effect on transparency and future value",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CSM: the Scrum Foundations and CSM learning objectives (Scrum Alliance)
// ---------------------------------------------------------------------------

const sfLo = (statements: string[]): UnitSource =>
  src("Scrum Alliance, Scrum Foundations Learning Objectives (January 2022)", SF_LO_URL, "exam_outline", undefined, { outline: statements });
const csmLo = (statements: string[]): UnitSource =>
  src("Scrum Alliance, Certified ScrumMaster Learning Objectives (January 2022)", CSM_LO_URL, "exam_outline", undefined, { outline: statements });

const CSM_FORMAT = src("Scrum Alliance, Certified ScrumMaster: how to earn it", CSM_URL, "exam_outline", undefined, {
  keyValues: [
    "a CSM course of 16 hours with a Certified Scrum Trainer is required; the test is taken online after it",
    "50 multiple-choice questions, 37 correct to pass, one hour; two attempts within 90 days are included in the course fee",
    "renew every two years with Scrum Education Units (SEUs)",
    "the learning objectives are based on the 2020 Scrum Guide, the Agile Manifesto and the Scrum Alliance values",
  ],
});

export const CSM_TRACK: SeedTrack = {
  code: "CSM",
  title: "Prep for a course-based Scrum Master certification test",
  description:
    "Preparation for Scrum Alliance's CSM test and the work behind it, built on Scrum Alliance's Scrum Foundations and CSM learning objectives and the 2020 Scrum Guide: Scrum theory, the team, the events, the artifacts and commitments, facilitation and coaching, and the Scrum Master's service to the team, the Product Owner and the organization. The CSM is earned by attending a 16-hour course with a Certified Scrum Trainer and then passing the test; this course helps you prepare and practice, and does not replace that course. Weights are our study emphasis. Independently developed; not affiliated with or endorsed by Scrum Alliance. Certified ScrumMaster and CSM are marks of Scrum Alliance, Inc.",
  trackType: "certification",
  subcategorySlug: "agile-scrum-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: CSM_URL,
  sourceVerifiedAt: PM_FRAMEWORKS_VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  credential: {
    domainWeights: "study_emphasis", // REQ-220: Scrum Alliance publishes no weights
    providerSlug: "scrum-alliance",
    providerName: "Scrum Alliance",
    providerUrl: "https://www.scrumalliance.org/",
    subcategorySlug: "agile-scrum-certifications",
    credentialSlug: "csm",
    credentialName: "Certified ScrumMaster (CSM)",
    credentialType: "certification",
    credentialUrl: CSM_URL,
    basis: "vendor_exam_unpublished_code",
    status: "active",
    examRevision: "CSM Learning Objectives, January 2022",
    objectivesRevision: "Scrum Foundations and CSM Learning Objectives, January 2022 (formatted 2/2024)",
    officialObjectivesUrl: CSM_LO_URL,
    lastVendorVerifiedAt: PM_FRAMEWORKS_VERIFIED_AT,
    recommendedExperience:
      "Attend a CSM course (16 hours of live training with a Certified Scrum Trainer, usually over 2-3 days); the course covers the Scrum Foundations and CSM learning objectives. The test is open only after the course.",
    durationMinutes: 60,
    questionFormat:
      "An online test after the course: 50 multiple-choice questions in one hour. Two attempts within 90 days of the course are included in the course fee.",
    passingScorePolicy: "37 of 50 correct. Renew every two years with Scrum Education Units (SEUs).",
  },
  units: [
    {
      title: "Scrum Theory and Values",
      weight: 14,
      gate: "Given a team's story, name which pillar or value is missing and what partial Scrum is costing them.",
      sources: [sfLo(["1.1 define scrum.", "1.2 list the five scrum values.", "1.3 define empiricism.", "1.4 list the three empirical scrum pillars.", "1.5 list at least three benefits of an iterative and incremental approach.", "1.6 describe at least two disadvantages that could occur if scrum is only partially implemented.", "1.7 describe how scrum is aligned with the values and principles of the Manifesto for Agile Software Development."]), guide(["Scrum Theory", "Scrum Values"], GUIDE_KEYS.theory), CSM_FORMAT],
      objectives: ADD(SCRUM_THEORY, [
        "Relating Scrum to the values and principles of the Manifesto for Agile Software Development",
        "Describing what goes wrong when Scrum is only partly put in place",
      ]),
    },
    {
      title: "The Scrum Team",
      weight: 15,
      gate: "Given a disputed decision, say whose accountability it is and why a single Product Owner keeps authority over the backlog while collaborating.",
      sources: [
        sfLo(["2.1 illustrate how the product owner, developers and scrum master interact to deliver increments within a sprint.", "2.2 identify at least three benefits of a cross-functional, self-managing scrum team."]),
        csmLo(["1.1 describe the responsibilities and accountabilities of the scrum team.", "1.2 describe the responsibilities and accountabilities of the scrum master.", "1.3 describe the responsibilities and accountabilities of the developers.", "1.4 describe the responsibilities and accountabilities of the product owner.", "1.5 discuss at least two reasons why the product owner is a single person and neither a group nor a committee.", "1.6 discuss how and why the product owner maintains authority over the product backlog while working collaboratively with developers and stakeholders."]),
        guide(["Scrum Team", "Developers", "Product Owner", "Scrum Master"], GUIDE_KEYS.team),
      ],
      objectives: ADD(SCRUM_TEAM, ["Explaining how the Product Owner keeps authority over the Product Backlog while working with the Developers and stakeholders"]),
    },
    {
      title: "Scrum Events and Activities",
      weight: 27,
      gate: "Given an event that is going wrong, state its purpose, participants and timebox, and how the team inspects and adapts there.",
      sources: [
        sfLo(["3.1 explain at least three benefits of using a timebox.", "3.2 define the purpose and maximum duration of a sprint.", "3.3 explain how to determine a suitable duration of a sprint.", "3.4 define sprint planning, daily scrum, sprint review and sprint retrospective, including their purpose, participants, sequence, and maximum recommended timebox.", "3.5 list at least three activities that may occur as part of product backlog refinement.", "3.6 repeat at least two reasons why the scrum team dedicates time for product backlog refinement."]),
        csmLo(["1.7 identify at least one example of how a scrum team could inspect and adapt to increase transparency at each of the scrum events.", "1.8 perform a sprint planning.", "1.9 perform a sprint review.", "1.10 perform a sprint retrospective.", "1.11 describe at least three possible effects of skipping the sprint retrospective.", "1.12 explain how developers conduct a daily scrum.", "1.13 discuss at least three ways the daily scrum differs from a status meeting and why the various constraints exist to support the developers.", "1.14 explain under what conditions a sprint could be terminated prematurely."]),
        guide(["Scrum Events", "The Sprint", "Sprint Planning", "Daily Scrum", "Sprint Review", "Sprint Retrospective"], GUIDE_KEYS.events),
      ],
      objectives: ADD(SCRUM_EVENTS, [
        "Explaining why timeboxes help, and what skipping the Sprint Retrospective costs",
        "Comparing the Daily Scrum with a status meeting and why its constraints serve the Developers",
      ]),
    },
    {
      title: "Scrum Artifacts and Commitments",
      weight: 21,
      gate: "Given a backlog or an Increment, name the artifact's commitment and decide whether the work is Done, and how the Definition of Done should change.",
      sources: [
        sfLo(["4.1 define the purpose of and at least three attributes of the product backlog, sprint backlog, and increment.", "4.2 explain why the product backlog is an emergent list of what is needed to improve the product.", "4.3 list at least three attributes of a product backlog item.", "4.4 discuss how the sprint backlog can be changed without endangering the sprint goal.", "4.5 explain how multiple increments may be created during a sprint.", "4.6 describe how the product goal, sprint goal and definition of done represent the commitments for the three artifacts of scrum.", "4.7 describe why the sprint goal does not change during a sprint.", "4.8 explain how the definition of done evolves over time.", "4.9 identify at least two reasons why multiple teams working on the same product backlog have a shared and consistent definition of done."]),
        csmLo(["1.15 explain at least three advantages of a strong definition of done.", "1.16 outline at least one way to create a definition of done."]),
        guide(["Scrum Artifacts", "Product Backlog", "Commitment: Product Goal", "Sprint Backlog", "Commitment: Sprint Goal", "Increment", "Commitment: Definition of Done"], GUIDE_KEYS.artifacts),
      ],
      objectives: ADD(SCRUM_ARTIFACTS, ["Explaining why the Sprint Goal stays fixed during the Sprint while the Sprint Backlog can change"]),
    },
    {
      title: "Scrum Master Core Competencies",
      weight: 6,
      gate: "Given a stuck discussion or a struggling team member, choose facilitation, teaching, mentoring or coaching and show the technique you would use.",
      sources: [csmLo(["2.1 describe at least three situations in which the scrum master could serve the needs of the scrum team or organization through facilitation.", "2.2 demonstrate at least three techniques for facilitating group decision making.", "2.3 discuss how facilitating, teaching, mentoring, and coaching are different."])],
      objectives: [
        "Recognizing situations where facilitation serves the team or the organization",
        "Facilitating group decisions with techniques such as fist of five, dot voting and a decision rule agreed in advance",
        "Choosing between facilitating, teaching, mentoring and coaching for a given situation",
        "Facilitating a Scrum event so it reaches its purpose within its timebox",
        "Coaching with questions so a team member finds their own answer",
        "Teaching Scrum to a new stakeholder in plain terms",
      ],
    },
    {
      title: "Service to the Team, Product Owner and Organization",
      weight: 17,
      gate: "Given an impediment or an organizational habit that blocks the team, decide what the Scrum Master does, what the team owns, and why Scrum has no project manager.",
      sources: [csmLo(["3.1 describe three scenarios where the scrum master acts as a leader for the scrum team.", "3.2 explain the impact of accumulating technical debt.", "3.3 list at least three development practices that could help their scrum team deliver a high-quality increment and reduce technical debt each sprint.", "3.4 explain at least three ways the scrum master could support the product owner.", "3.5 describe at least three organizational impediments that can affect scrum teams.", "3.6 discuss at least two ways that the scrum master assists the scrum team with impediments.", "3.7 apply at least one technique that could help resolve an impediment.", "3.8 summarize at least one organizational design change caused by adopting scrum.", "3.9 discuss why scrum does not have a project manager."]), guide(["Scrum Master"])],
      objectives: [
        "Leading the Scrum Team as a servant leader in concrete situations",
        "Explaining how technical debt builds up and what it does to the team's ability to deliver",
        "Choosing development practices that keep each Increment high quality: test automation, continuous integration, pairing and refactoring",
        "Supporting the Product Owner with backlog techniques and stakeholder collaboration",
        "Identifying organizational impediments that block Scrum Teams",
        "Applying a technique to resolve an impediment, and deciding when the team should solve it themselves",
        "Explaining the organizational design changes Scrum brings, and why Scrum has no project manager",
      ],
    },
  ],
};

// ===========================================================================
// ITIL 4 Foundation (PeopleCert)
// ===========================================================================

const itilSyllabus = (lo: string, criteria: string[]): UnitSource =>
  src(
    "ITIL 4 Foundation candidate syllabus v1.4 (September 2019), learning outcome and assessment criteria, as reproduced in an accredited training organization's student workbook (PeopleCert's own syllabus is not public)",
    ITIL_SYLLABUS_COPY_URL,
    "exam_outline",
    "2027-06-01",
    { outline: [lo, ...criteria] }
  );

const ITIL_FORMAT = src("PeopleCert, ITIL 4 Foundation exam and ITIL FAQ", ITIL_URL, "exam_outline", "2027-06-01", {
  keyValues: [
    "40 multiple-choice questions, 60 minutes, closed book, 65% to pass (26 of 40); 12 languages",
    "questions are at Bloom's levels 1 and 2 (recall and understanding); one mark each, no negative marking (syllabus copy)",
    "PeopleCert's FAQ: the current plan is to sunset all ITIL 4 modules on 2027-12-31; ITIL 4 and ITIL (Version 5) run in parallel until then",
    "renew every three years with 60 CPD points",
  ],
});

const ITIL_STRUCTURE = [
  "seven guiding principles: focus on value; start where you are; progress iteratively with feedback; collaborate and promote visibility; think and work holistically; keep it simple and practical; optimize and automate",
  "four dimensions: organizations and people; information and technology; partners and suppliers; value streams and processes",
  "six value chain activities: plan; improve; engage; design and transition; obtain/build; deliver and support",
];

export const ITIL4FND_TRACK: SeedTrack = {
  code: "ITIL4FND",
  title: "Prep for the ITIL 4 Foundation Exam",
  description:
    "Preparation for PeopleCert's ITIL 4 Foundation exam, weighted by the syllabus's marks: the key concepts of service management, the seven guiding principles, the four dimensions, the service value system and value chain, the purpose of 15 practices and seven of them in depth. PeopleCert plans to sunset ITIL 4 at the end of 2027 and already offers ITIL Foundation (Version 5). Independently developed exam prep; not affiliated with or endorsed by PeopleCert or Axelos. ITIL is a registered trademark of PeopleCert.",
  trackType: "certification",
  subcategorySlug: "it-certifications",
  freshnessModel: "certification_aligned",
  // No sourceUrl / sourceVerifiedAt: the syllabus was read only in a training
  // organization's copy (header), so the course shows as Unverified until
  // Nick decides. Set both together once the official syllabus is checked
  // (lib/content-currency.ts refuses a sourceUrl without a date).
  contentReviewDueAt: ITIL_REVIEW_DUE_AT,
  credential: {
    providerSlug: "peoplecert",
    providerName: "PeopleCert",
    providerUrl: "https://www.peoplecert.org/",
    subcategorySlug: "it-certifications",
    credentialSlug: "itil-4-foundation",
    credentialName: "ITIL 4 Foundation",
    credentialType: "certification",
    credentialUrl: ITIL_URL,
    basis: "vendor_exam_unpublished_code",
    status: "active",
    examRevision: "ITIL 4 Foundation (2019)",
    objectivesRevision: "Candidate syllabus v1.4, September 2019 (read in a training organization's copy)",
    versionNote:
      "PeopleCert's ITIL 4 Foundation syllabus is not public; v1.4 (September 2019) was read in an accredited training organization's workbook. PeopleCert's FAQ (read 2026-11-14) plans to sunset all ITIL 4 modules on 2027-12-31; the course is due for review by 2027-06-01.",
    officialObjectivesUrl: ITIL_URL,
    lastVendorVerifiedAt: "2026-11-14T00:00:00Z",
    recommendedExperience: "None required. Training with an accredited training organization is common but not mandatory.",
    durationMinutes: 60,
    questionFormat:
      "40 multiple-choice questions in 60 minutes, closed book, one mark each, no negative marking; questions test recall and understanding. Available in 12 languages (25% extra time when not taken in your first language, per the syllabus copy).",
    passingScorePolicy: "65%: 26 of 40 correct. Renew every three years with 60 CPD points.",
  },
  units: [
    {
      title: "Key Concepts of Service Management",
      rangeLabel: "5 of 40 marks",
      weight: 12.5,
      gate: "Given a service description, name the customer, user and sponsor, the utility and warranty, and the costs and risks the service takes away from or adds to the consumer.",
      sources: [itilSyllabus("1. Understand the key concepts of service management", ["1.1 Recall the definition of: service; utility; warranty; customer; user; service management; sponsor", "1.2 Describe the key concepts of creating value with services: cost; value; organization; outcome; output; risk; utility; warranty", "1.3 Describe the key concepts of service relationships: service offering; service relationship management; service provision; service consumption"]), ITIL_FORMAT],
      objectives: [
        "Telling apart the customer, the user and the sponsor of a service in a scenario",
        "Explaining value co-creation: how value, outcomes, outputs, costs and risks relate in a service",
        "Distinguishing utility (fit for purpose) from warranty (fit for use) in a service description",
        "Describing a service offering as goods, access to resources and service actions",
        "Explaining service relationships: service provision, service consumption and service relationship management",
        "Identifying which costs and risks a service removes from, or adds to, the consumer",
      ],
    },
    {
      title: "The ITIL Guiding Principles",
      rangeLabel: "6 of 40 marks",
      weight: 15,
      gate: "Given an improvement initiative, choose the guiding principle it most needs, explain how applying it changes the next step, and how the other principles bear on it.",
      sources: [itilSyllabus("2. Understand how the ITIL guiding principles can help an organization adopt and adapt service management", ["2.1 Describe the nature, use and interaction of the guiding principles", "2.2 Explain the use of the guiding principles: focus on value; start where you are; progress iteratively with feedback; collaborate and promote visibility; think and work holistically; keep it simple and practical; optimize and automate"]), src("ITIL 4 structure as listed in the syllabus", ITIL_SYLLABUS_COPY_URL, "exam_outline", "2027-06-01", { keyValues: ITIL_STRUCTURE.slice(0, 1) })],
      objectives: [
        "Applying focus on value and start where you are to an improvement initiative",
        "Applying progress iteratively with feedback and collaborate and promote visibility",
        "Applying think and work holistically and keep it simple and practical",
        "Applying optimize and automate, and why optimizing comes before automating",
        "Explaining how the guiding principles interact and why they are used together",
        "Choosing the principle a scenario most calls for",
      ],
    },
    {
      title: "The Four Dimensions of Service Management",
      rangeLabel: "2 of 40 marks",
      weight: 5,
      gate: "Given a service change that went wrong, say which of the four dimensions was neglected and what considering it would have changed.",
      sources: [itilSyllabus("3. Understand the four dimensions of service management", ["3.1 Describe the four dimensions of service management: organizations and people; information and technology; partners and suppliers; value streams and processes"]), src("ITIL 4 structure as listed in the syllabus", ITIL_SYLLABUS_COPY_URL, "exam_outline", "2027-06-01", { keyValues: ITIL_STRUCTURE.slice(1, 2) })],
      objectives: [
        "Describing the organizations and people dimension: structures, roles, culture and competencies",
        "Describing the information and technology dimension a service depends on",
        "Describing the partners and suppliers dimension and sourcing decisions",
        "Describing the value streams and processes dimension",
        "Explaining how external factors -- political, economic, social, technological, legal and environmental -- act on all four dimensions",
        "Analyzing a failed change for the dimension that was neglected",
      ],
    },
    {
      title: "The ITIL Service Value System",
      rangeLabel: "1 of 40 marks",
      weight: 2.5,
      gate: "Given an organization's demand and opportunity, trace how the service value system's components turn them into value.",
      sources: [itilSyllabus("4. Understand the purpose and components of the ITIL service value system", ["4.1 Describe the ITIL service value system"])],
      objectives: [
        "Describing the components of the service value system: guiding principles, governance, the service value chain, practices and continual improvement",
        "Explaining how opportunity and demand enter the service value system and value comes out",
        "Explaining governance's role in directing and controlling the organization",
        "Explaining how the service value system breaks down organizational silos",
      ],
    },
    {
      title: "The Service Value Chain",
      rangeLabel: "2 of 40 marks",
      weight: 5,
      gate: "Given a user request, map the value stream it follows through the value chain activities and name the practices each step uses.",
      sources: [itilSyllabus("5. Understand the activities of the service value chain, and how they interconnect", ["5.1 Describe the interconnected nature of the service value chain and how this supports value streams", "5.2 Describe the purpose of each value chain activity: plan; improve; engage; design and transition; obtain/build; deliver and support"]), src("ITIL 4 structure as listed in the syllabus", ITIL_SYLLABUS_COPY_URL, "exam_outline", "2027-06-01", { keyValues: ITIL_STRUCTURE.slice(2) })],
      objectives: [
        "Describing the purpose of each value chain activity",
        "Explaining how value chain activities combine into value streams",
        "Mapping a value stream for a user request through the value chain",
        "Explaining how one practice contributes to several value chain activities",
      ],
    },
    {
      title: "Purpose and Key Terms of 15 ITIL Practices",
      rangeLabel: "7 of 40 marks",
      weight: 17.5,
      gate: "Given a scenario, name the practice whose purpose it serves and the ITIL term for what happened -- an incident, a problem, a known error, an event or a change.",
      sources: [itilSyllabus("6. Know the purpose and key terms of 15 ITIL practices", ["6.1 Recall the purpose of the following ITIL practices: information security management; relationship management; supplier management; IT asset management; monitoring and event management; release management; service configuration management; deployment management; continual improvement; change enablement; incident management; problem management; service request management; service desk; service level management", "6.2 Recall definitions of the following ITIL terms: IT asset; event; configuration item; change; incident; problem; known error"])],
      objectives: [
        "Recalling the purpose of information security management, relationship management and supplier management",
        "Recalling the purpose of IT asset management, monitoring and event management, and service configuration management",
        "Recalling the purpose of release management and deployment management, and telling them apart",
        "Recalling the purpose of the seven practices studied in depth",
        "Defining IT asset, event, configuration item, change, incident, problem and known error",
        "Matching a scenario to the practice whose purpose it serves",
      ],
    },
    {
      title: "Seven ITIL Practices in Detail",
      rangeLabel: "17 of 40 marks",
      weight: 42.5,
      gate: "Given an operational scenario, explain how the right practice handles it -- the change type and authority, the incident priority and route, the problem phase, the request workflow, the service desk channel or the service level measure.",
      sources: [itilSyllabus("7. Understand 7 ITIL practices", ["7.1 Explain the following ITIL practices in detail, excluding how they fit within the service value chain: continual improvement, including the continual improvement model; change enablement; incident management; problem management; service request management; service desk; service level management"])],
      objectives: [
        "Applying the continual improvement model step by step to an improvement initiative",
        "Using a continual improvement register and explaining who owns continual improvement",
        "Explaining change enablement: standard, normal and emergency changes and the change authority",
        "Managing incidents: prioritization, swarming, escalation and the link to the service desk",
        "Managing problems through problem identification, problem control and error control, with workarounds and known errors",
        "Handling service requests with predefined, standardized workflows",
        "Designing a service desk's channels and skills and its part in the user's experience",
        "Setting service levels with customers and measuring them by experience, not only technical metrics",
      ],
    },
  ],
};

// ===========================================================================
// ASQ Certified Six Sigma Green Belt (2022 Body of Knowledge)
// ===========================================================================

const bok = (section: string, topics: string[]): UnitSource =>
  src("ASQ, Certified Six Sigma Green Belt Body of Knowledge (2022)", CSSGB_BOK_URL, "exam_outline", undefined, { outline: [section, ...topics] });

const CSSGB_FORMAT = src("ASQ, Six Sigma Green Belt certification: exam and passing score", CSSGB_URL, "exam_outline", undefined, {
  keyValues: [
    "computer-delivered: 110 questions, 100 scored and 10 unscored; 4.5-hour appointment, 4 hours 18 minutes of exam time; English",
    "open book: bring bound references",
    "550 of 750 points to pass (asq.org/cert/faq/passing-score)",
    "three years of work experience in the Body of Knowledge; no educational waivers",
    "questions per section: Overview 11, Define 20, Measure 20, Analyze 18, Improve 16, Control 15",
  ],
});

export const CSSGB_TRACK: SeedTrack = {
  code: "CSSGB",
  title: "Prep for a process improvement green belt certification exam",
  description:
    "Preparation for a process improvement green belt certification exam on the 2022 body of knowledge, weighted by its question counts: the method and the organization, then Define, Measure, Analyze, Improve and Control, with the statistics worked through -- capability indices, hypothesis tests, control charts and the yield and defect metrics. Independently developed exam prep; not affiliated with or endorsed by the organization that owns or administers this exam.",
  trackType: "certification",
  subcategorySlug: "quality-six-sigma-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: CSSGB_URL,
  sourceVerifiedAt: PM_FRAMEWORKS_VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  credential: {
    providerSlug: "asq",
    providerName: "ASQ (American Society for Quality)",
    providerUrl: "https://www.asq.org/",
    subcategorySlug: "quality-six-sigma-certifications",
    credentialSlug: "cssgb",
    credentialName: "ASQ Certified Six Sigma Green Belt (CSSGB)",
    credentialType: "certification",
    credentialUrl: CSSGB_URL,
    basis: "vendor_exam_unpublished_code",
    status: "active",
    examRevision: "2022 CSSGB Body of Knowledge",
    objectivesRevision: "2022 Body of Knowledge, six sections",
    officialObjectivesUrl: CSSGB_BOK_URL,
    lastVendorVerifiedAt: PM_FRAMEWORKS_VERIFIED_AT,
    recommendedExperience:
      "Three years of full-time, paid work experience in one or more areas of the Green Belt Body of Knowledge; ASQ grants no educational waivers.",
    durationMinutes: 258,
    questionFormat:
      "Computer-delivered (Prometric, or online with a remote proctor): 110 multiple-choice questions, 100 scored and 10 unscored, in 4 hours 18 minutes within a 4.5-hour appointment; open book with bound references; English. A 100-question, 4-hour paper exam is offered in Mandarin in some locations.",
    passingScorePolicy: "550 of 750 points, against a fixed standard rather than other candidates. Exam fee $483 ($100 less for members); retake $283.",
  },
  units: [
    {
      title: "Six Sigma and the Organization",
      rangeLabel: "11 of 100 scored questions",
      weight: 11,
      gate: "Given a business problem, connect a Six Sigma project to the organization's goals and metrics, name the lean waste it removes, and score its failure modes.",
      sources: [bok("I. Overview: Six Sigma and the Organization (11 Questions)", ["A. Six Sigma and Organizational Goals: 1. Value of Six Sigma; 2. Organizational goals and Six Sigma projects; 3. Organizational drivers and metrics", "B. Lean Principles in the Organization: 1. Lean concepts; 2. Value stream mapping", "C. Design for Six Sigma (DfSS) Methodologies: 1. Road maps for DfSS; 2. Basic failure mode and effects analysis (FMEA); 3. Design FMEA and process FMEA"]), CSSGB_FORMAT],
      objectives: [
        "Explaining why organizations use Six Sigma and its roots in Shewhart, Deming, Juran and Ishikawa",
        "Linking a Six Sigma project to organizational goals with SMART goals and key performance indicators",
        "Applying lean concepts: flow, takt time, just-in-time, the theory of constraints and going to the gemba",
        "Using value stream mapping to separate value-added steps from waste",
        "Distinguishing DMAIC from the design roadmaps DMADV and IDOV",
        "Building a basic FMEA and calculating and interpreting risk priority numbers",
        "Distinguishing a design FMEA from a process FMEA",
      ],
    },
    {
      title: "Define Phase",
      rangeLabel: "20 of 100 scored questions",
      weight: 20,
      gate: "Given a project request, decide whether DMAIC fits, then scope it with SIPOC and the voice of the customer, write the charter's problem statement and metrics, and calculate the baseline yield or defect rate.",
      sources: [bok("II. Define Phase (20 Questions)", ["A. Project Identification: 1. Project selection; 2. Process elements; 3. Benchmarking; 4. Process input and outputs; 5. Owners and stakeholders", "B. Voice of the Customer (VoC): 1. Customer identification; 2. Customer data; 3. Customer requirements", "C. Project Management Basics: 1. Project methodology; 2. Project charter; 3. Project scope; 4. Project metrics; 5. Project planning tools; 6. Project documentation; 7. Project risk analysis; 8. Project closure", "D. Management and Planning Tools", "E. Business Results for Projects: 1. Process performance; 2. Communication", "F. Team Dynamics and Performance: 1. Team stages and dynamics; 2. Team roles and responsibilities; 3. Team tools and decision-making concepts; 4. Team communication"])],
      objectives: [
        "Deciding whether a problem suits DMAIC or another problem-solving method",
        "Mapping a process with SIPOC and naming its owners and stakeholders",
        "Turning voice-of-the-customer data into critical-to-quality requirements with a CTQ tree, the Kano model and QFD",
        "Writing a project charter: problem statement, scope, primary and consequential metrics, plan and risks",
        "Choosing among the management and planning tools for a situation",
        "Calculating process performance metrics: defects per unit, defects per million opportunities, rolled throughput yield and the cost of poor quality",
        "Leading a team through its stages, defining roles with a RACI chart, and using brainstorming, nominal group technique and multivoting",
        "Comparing competitive, collaborative and best-practice benchmarking",
      ],
    },
    {
      title: "Measure Phase",
      rangeLabel: "20 of 100 scored questions",
      weight: 20,
      gate: "Given process data, check the measurement system, summarize the data with the right statistics and graphs, and calculate and interpret the process's capability.",
      sources: [bok("III. Measure Phase (20 Questions)", ["A. Process Analysis and Documentation", "B. Probability and Statistics: 1. Basic probability concepts; 2. Central limit theorem", "C. Statistical Distributions", "D. Collecting and Summarizing Data: 1. Types of data and measurement scales; 2. Sampling and data collection plans and methods; 3. Descriptive statistics; 4. Graphical methods", "E. Measurement System Analysis (MSA)", "F. Process and Performance Capability: 1. Process performance vs. process specifications; 2. Process capability studies; 3. Process capability (Cp, Cpk) and process performance (Pp, Ppk) indices; 4. Short-term vs. long-term capability and sigma shift"])],
      objectives: [
        "Developing process maps and checking written procedures against how the work is really done",
        "Applying basic probability: independent and mutually exclusive events, permutations and combinations",
        "Explaining the central limit theorem and why it matters for confidence intervals and control charts",
        "Choosing a distribution: normal, binomial, Poisson, chi-square, Student's t or F",
        "Classifying data and measurement scales and writing a data collection plan with sampling and data checks",
        "Calculating and interpreting descriptive statistics and graphs: histograms, box plots, scatter diagrams and normal probability plots",
        "Evaluating a measurement system with gauge R&R, bias, linearity and percent agreement",
        "Calculating Cp, Cpk, Pp and Ppk and the sigma level, and allowing for the shift between short- and long-term data",
      ],
    },
    {
      title: "Analyze Phase",
      rangeLabel: "18 of 100 scored questions",
      weight: 18,
      gate: "Given a suspected cause, choose and interpret the test or analysis that confirms it -- regression, a t-test, ANOVA, chi-square or a multi-vari study -- and say whether the effect matters in practice.",
      sources: [bok("IV. Analyze Phase (18 Questions)", ["A. Exploratory Data Analysis: 1. Multi-vari studies; 2. Correlation and linear regression", "B. Hypothesis Testing: 1. Basics; 2. Tests for means, variances, and proportions", "C. Additional Analysis Methods: 1. Gap analysis; 2. Root cause analysis"])],
      objectives: [
        "Using multi-vari studies to separate positional, cyclical and temporal variation",
        "Calculating correlation and simple linear regression, and telling correlation from causation",
        "Setting up a hypothesis test: hypotheses, significance level, power, type I and type II errors and sample size",
        "Choosing and interpreting tests for means, variances and proportions: t-tests, the F-test, ANOVA and chi-square",
        "Distinguishing statistical significance from practical significance",
        "Analyzing gaps between current and future performance",
        "Finding root causes with cause-and-effect diagrams, 5 Whys, relational matrices and fault tree analysis",
      ],
    },
    {
      title: "Improve Phase",
      rangeLabel: "16 of 100 scored questions",
      weight: 16,
      gate: "Given a confirmed cause, design a simple experiment or a lean change, read its effects plot, and plan a pilot before full rollout.",
      sources: [bok("V. Improve Phase (16 Questions)", ["A. Design of Experiments (DoE): 1. Basic terms; 2. DoE graphs and plots", "B. Implementation Planning", "C. Lean Tools: 1. Waste elimination; 2. Cycle-time reduction; 3. Kaizen and kaizen blitz"])],
      objectives: [
        "Defining design of experiments terms: factors, levels, responses, treatments, blocking, randomization and replication",
        "Interpreting main effects and interaction plots",
        "Planning implementation with proofs of concept, pilots, simulations and try-storming",
        "Eliminating waste with pull systems, kanban, 5S, standard work and poka-yoke",
        "Reducing cycle time with continuous flow and setup reduction (SMED)",
        "Distinguishing kaizen from a kaizen blitz and choosing between them",
      ],
    },
    {
      title: "Control Phase",
      rangeLabel: "15 of 100 scored questions",
      weight: 15,
      gate: "Given an improved process, choose the control chart for its data, read a chart for special causes, and write the control plan, training and audits that hold the gain.",
      sources: [bok("VI. Control Phase (15 Questions)", ["A. Statistical Process Control (SPC): 1. SPC basics; 2. Rational subgrouping; 3. Control charts", "B. Sustain Improvements: 1. Control plan; 2. Document control; 3. Training plans; 4. Audits; 5. Plan-do-check-act (PDCA)", "C. Lean Tools for Process Control: 1. Total productive maintenance (TPM); 2. Visual factory"])],
      objectives: [
        "Explaining the aims of SPC and telling common-cause from special-cause variation",
        "Using rational subgrouping",
        "Selecting and interpreting a control chart: X-bar and R, X-bar and s, individuals and moving range, median, p, np, c and u",
        "Developing a control plan with the document control and training that sustain it",
        "Distinguishing first-, second- and third-party audits",
        "Applying plan-do-check-act to sustain and extend a gain",
        "Using total productive maintenance and the visual factory (andon, jidoka) to hold the improved process",
      ],
    },
  ],
};

export const PM_FRAMEWORK_TRACKS: readonly SeedTrack[] = [PSMI_TRACK, CSM_TRACK, ITIL4FND_TRACK, CSSGB_TRACK];
