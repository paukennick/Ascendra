// Nursing tracks: the licensure ladder and the NCLEX examinations.
//
// Every category name, percentage and content area below was read on
// 2026-09-18 from the source each track cites -- for the NCLEX tracks, the
// NCSBN test plan PDF itself, not a summary of it. Two things that older
// notes and general training data get wrong, corrected here:
//
//   - The 2026 RN plan renames the subcategory "Safety and Infection
//     Control" to "Safety and Infection Prevention and Control".
//   - The published percentages are ranges (Management of Care is 15-21%),
//     but NCSBN also prints exact planning midpoints in the distribution
//     chart. Those midpoints are what `weight` carries, because they sum to
//     100; the published range is kept in `rangeLabel` so the learner sees
//     what the vendor actually promises.
//
// Objectives are written in our own words from the test plan's content
// areas. They are deliberately not copied: NCSBN grants reproduction to
// boards of nursing and nonprofit education programs only, and prohibits
// commercial use, so the structure (which is fact) is followed while the
// phrasing is ours.
//
// Every track here sets requiresAcknowledgement. Nursing content acted on in
// practice has patient-safety consequences, so migration 012's gate applies:
// the learner accepts a course-specific disclaimer, recorded against their
// account, before any lesson is taught.

import type { SeedTrack, UnitSource } from "../data";

// REQ-235 (batch H wave 1): each CNA unit names the curriculum line of 42
// CFR 483.152(b) it is built on, as the regulation prints it (federal text,
// public domain, so quoted in full), read through the eCFR versioner API on
// 2026-11-11 (as of 2026-11-01). Residents' rights also carries the abuse
// reporting deadlines of 42 CFR 483.12(c)(1), read the same way and day.
// The writer and the fact-checker get both (lib/current-facts.ts).
const CFR_483_152 = "https://www.ecfr.gov/current/title-42/section-483.152";
const cna152 = (para: string, outline: string[], keyValues?: string[]): UnitSource => ({
  title: `42 CFR 483.152(${para}), requirements for approval of a nurse aide training and competency evaluation program`,
  url: CFR_483_152,
  kind: "reference",
  checkedAt: "2026-11-11",
  outline,
  ...(keyValues ? { keyValues } : {}),
});
export const CNA_UNIT_SOURCES: Record<string, UnitSource[]> = {
  "Before resident contact": [
    cna152(
      "b)(1",
      [
        "At least a total of 16 hours of training in the following areas prior to any direct contact with a resident: communication and interpersonal skills; infection control; safety/emergency procedures, including the Heimlich maneuver; promoting residents' independence; and respecting residents' rights.",
      ],
      [
        "a state-approved program is no less than 75 clock hours of training, including at least 16 hours of supervised practical training under the direct supervision of an RN or LPN (483.152(a)); states may require more",
        "students do not perform any services for which they have not trained and been found proficient by the instructor",
      ]
    ),
  ],
  "Basic nursing skills": [
    cna152("b)(2", [
      "Basic nursing skills: taking and recording vital signs; measuring and recording height and weight; caring for the residents' environment; recognizing abnormal changes in body functioning and the importance of reporting such changes to a supervisor; and caring for residents when death is imminent.",
    ]),
  ],
  "Personal care skills": [
    cna152("b)(3", [
      "Personal care skills, including, but not limited to: bathing; grooming, including mouth care; dressing; toileting; assisting with eating and hydration; proper feeding techniques; skin care; and transfers, positioning, and turning.",
    ]),
  ],
  "Mental health and social service needs": [
    cna152("b)(4", [
      "Mental health and social service needs: modifying aide's behavior in response to residents' behavior; awareness of developmental tasks associated with the aging process; how to respond to resident behavior; allowing the resident to make personal choices, providing and reinforcing other behavior consistent with the resident's dignity; and using the resident's family as a source of emotional support.",
    ]),
  ],
  "Care of cognitively impaired residents": [
    cna152("b)(5", [
      "Care of cognitively impaired residents: techniques for addressing the unique needs and behaviors of individual with dementia (Alzheimer's and others); communicating with cognitively impaired residents; understanding the behavior of cognitively impaired residents; appropriate responses to the behavior of cognitively impaired residents; and methods of reducing the effects of cognitive impairments.",
    ]),
  ],
  "Basic restorative services": [
    cna152("b)(6", [
      "Basic restorative services: training the resident in self care according to the resident's abilities; use of assistive devices in transferring, ambulation, eating, and dressing; maintenance of range of motion; proper turning and positioning in bed and chair; bowel and bladder training; and care and use of prosthetic and orthotic devices.",
    ]),
  ],
  "Residents' rights": [
    cna152("b)(7", [
      "Residents' rights: providing privacy and maintenance of confidentiality; promoting the residents' right to make personal choices to accommodate their needs; giving assistance in resolving grievances and disputes; providing needed assistance in getting to and participating in resident and family groups and other activities; maintaining care and security of residents' personal possessions; promoting the resident's right to be free from abuse, mistreatment, and neglect and the need to report any instances of such treatment to appropriate facility staff; and avoiding the need for restraints in accordance with current professional standards.",
    ]),
    {
      title: "42 CFR 483.12(c)(1), reporting alleged violations",
      url: "https://www.ecfr.gov/current/title-42/section-483.12",
      kind: "reference",
      checkedAt: "2026-11-11",
      keyValues: [
        "the facility reports alleged abuse, neglect, exploitation or mistreatment immediately, but not later than 2 hours after the allegation is made if it involves abuse or serious bodily injury, and not later than 24 hours otherwise; the aide's duty (483.152(b)(7)) is to report any instance to the appropriate facility staff",
      ],
    },
  ],
};

const NCSBN_PROVIDER = {
  providerSlug: "ncsbn",
  providerName: "National Council of State Boards of Nursing",
  providerUrl: "https://www.ncsbn.org/",
  subcategorySlug: "nclex-preparation",
  credentialType: "licensure_examination",
} as const;

const VERIFIED_AT = "2026-09-18T00:00:00Z";

// The disclaimer key every nursing track carries. REQ-165: it only marks the
// course as gated (it needs the study notice, mobile/src/lib/studyNotice.ts);
// no per-course text is shown any more.
const NURSING_DISCLAIMER_KEY = "nursing-clinical-content";

// ---------------------------------------------------------------------------
// Corrected 2026-11-09 (content audit; reworded in place, order unchanged so
// mastery is kept): clozapine no longer has a REMS (FDA, effective
// 2025-06-13; ANC monitoring per labelling); ventricular tachycardia is three
// or more ventricular beats in a row (StatPearls NBK532954); a sentinel event
// includes severe temporary harm (Joint Commission); newborn apnea is a pause
// of 20 seconds or more, or shorter with bradycardia, cyanosis or pallor;
// hypoglycaemia examples follow CDC's fast-carbohydrate list (no graham
// crackers -- fat slows absorption).
//
// ---------------------------------------------------------------------------
// Depth added 2026-11-02: sources, tiers and disagreements (all six tracks).
//
// What changed: new objectives were appended to the END of existing units
// only, each after an "Added 2026-11-02" marker and each with an inline
// source comment. No unit, weight, rangeLabel, gate or earlier objective was
// touched, and no unit was added: on the NCLEX tracks a new unit would need a
// weight outside NCSBN's published midpoints, and on the other four it would
// force a re-balance. Clinical-judgment content from the test plans'
// Integrated Processes sits in Management of Care / Coordinated Care (our
// placement, not NCSBN's).
//
// Scope versus depth (same split as ccrn.ts): the scope source decides
// whether a topic belongs; textbooks supply depth only.
//   NCLEXRN, ADNRN -- 2026 NCLEX-RN Test Plan.  NCLEXPN, LPNVN -- 2026
//   NCLEX-PN Test Plan.  CNA -- 42 CFR 483.152(b) plus 483.10, 483.12, 483.24,
//   483.25.  BSNRN -- AACN Essentials, 2026 edition, Level 1 sub-competencies.
// PN and CNA objectives use the PN and aide verbs (collect data, reinforce,
// report; observe and report) and were screened for RN-only actions.
//
// Inline tag key: RNTP/PNTP pN = test plan PDF page; DEL = NCSBN-ANA
// delegation guidelines; CFR 483.x = 42 CFR section; CDC-HH/-SP/-TBP/-EBP =
// CDC pages below; ESS n.n = Essentials competency; FN, CNS, MS, PHARM, MN,
// PMH, POP n.n = OpenStax book and section; HP n.n = Open RN Health Promotion.
//
// Tier 1 (credentialing body, regulation, government agency):
//   - NCSBN, "2026 NCLEX-RN Test Plan" (effective 2026-04-01).
//     https://www.ncsbn.org/public-files/2026_RN_Test%20Plan_English-F.pdf
//     Accessed 2026-11-02. Read: Integrated Processes and clinical judgment
//     steps (p.8 of the PDF), Client Needs activity statements (pp.11-18).
//   - NCSBN, "2026 NCLEX-PN Test Plan" (effective 2026-04-01).
//     https://www.ncsbn.org/public-files/2026_PN_Test%20Plan-F.pdf
//     Accessed 2026-11-02. Read: pp.10-18 (concepts and activity statements).
//   - NCSBN and ANA, "National Guidelines for Nursing Delegation", effective
//     2019-04-29 (replaces the 2010 joint statement; date read from the PDF).
//     https://www.ncsbn.org/public-files/NGND-PosPaper_06.pdf  Accessed
//     2026-11-02. Older than five years; used as the body's current guidance
//     on delegation, which is policy rather than clinical fact. We did not
//     search for a later edition beyond this URL.
//   - eCFR, 42 CFR 483.10 (resident rights), 483.12 (freedom from abuse,
//     neglect and exploitation), 483.24 (quality of life), 483.25 (quality of
//     care), 483.152 (nurse aide training). Title 42 up to date as of
//     2026-10-30; read through the eCFR versioner API, accessed 2026-11-02.
//     https://www.ecfr.gov/current/title-42/part-483  Public domain.
//   - CDC (public domain). cdc.gov refused direct download (HTTP 403), so
//     each page's main text was read in a browser; page dates as shown on
//     the pages. Accessed 2026-11-02.
//       Hand Hygiene for Healthcare Workers (clinical safety), 2024-02-27,
//         https://www.cdc.gov/clean-hands/hcp/clinical-safety/index.html
//       Standard Precautions for All Patient Care, 2024-04-03,
//         https://www.cdc.gov/infection-control/hcp/basics/standard-precautions.html
//       Transmission-Based Precautions, 2024-04-03,
//         https://www.cdc.gov/infection-control/hcp/basics/transmission-based-precautions.html
//       PPE in Nursing Homes to Prevent MDRO Spread (Enhanced Barrier
//         Precautions), 2024-04-02,
//         https://www.cdc.gov/long-term-care-facilities/hcp/prevent-mdro/PPE.html
//   - AACN, "The Essentials: Core Competencies for Professional Nursing
//     Education", approved 2021-04-06, updated April 2026 (2026 edition).
//     https://www.aacnnursing.org/Portals/0/PDFs/Publications/Essentials-2026.pdf
//     Accessed 2026-11-02. Copyright AACN, all rights reserved; its terms
//     bar reproduction and derivative works without permission. Used for
//     scope only (which Level 1 competencies a domain covers); no text
//     reproduced, every objective in our own words.
//
// Tier 2 (graded against the five criteria in
// docs/source-reliability-standard.md: 1 credentialed authors, 2 stated
// review, 3 publisher, 4 date, 5 no commercial interest). All OpenStax books
// are Rice University, CC BY-NC-SA 4.0 (NC/SA: facts and topic structure
// only, no text), first published 2024, PDF copyright 2026; front matter read
// for authors and reviewers.
//   - OpenStax, "Fundamentals of Nursing" (2024).
//     https://openstax.org/details/books/fundamentals-nursing  Accessed
//     2026-11-02. All five met: senior authors Christy Bowen DNP RN, Lindsay
//     Draper DNP CNE, Heather Moore DNP RN; named reviewers; Rice; 2024;
//     non-profit.
//   - OpenStax, "Clinical Nursing Skills" (2024).
//     https://openstax.org/details/books/clinical-nursing-skills  PDF
//     downloaded 2026-10-31, read 2026-11-02. All five met: senior author
//     Christy Bowen DNP RN, named contributing authors and reviewers.
//   - OpenStax, "Psychiatric-Mental Health Nursing" (2024).
//     https://openstax.org/details/books/psychiatric-mental-health  Accessed
//     2026-11-02. All five met: senior authors Rebecca Puchkors (BS, MS in
//     Nursing, Baylor University faculty), Jeanne Saunders (psychiatric-
//     mental health certified, 40+ years in nursing), David Sharp; named
//     reviewers.
//   - OpenStax, "Population Health for Nurses" (2024).
//     https://openstax.org/details/books/population-health  Accessed
//     2026-11-02. All five met: senior authors Jessica Ochs DNP FNP, Sherry
//     L. Roper PhD, Susan M. Schwartz; named reviewers.
//   - OpenStax "Medical-Surgical Nursing", "Pharmacology for Nurses",
//     "Maternal-Newborn Nursing" (2024): Tier 2, graded in ccrn.ts; PDFs
//     downloaded 2026-10-31, read again 2026-11-02.
//   - Open RN / WisTech Open, "Nursing Health Promotion", Ernstmeyer &
//     Christman (eds.), 2025, CC BY 4.0: Tier 2, graded in ccrn.ts. Pediatric
//     chapters (14.5, 15.8-15.10, 16.9, 16.10, 16.13, 17.5) were saved on
//     2026-10-31 and read again 2026-11-02.
//     https://wtcs.pressbooks.pub/healthpromo/
//
// Sources tried and not used: the Open RN "Nursing Assistant" and other
// wtcs.pressbooks.pub books refused automated download (HTTP 403, and the
// Internet Archive lookup returned 429), so CNA depth comes from CDC,
// 42 CFR 483 and the OpenStax texts above. StatPearls and OpenStax
// "Nutrition for Nurses" were not needed and are not cited.
//
// Where sources disagreed, and what we did (checked 2026-11-02):
//   - Interval between eye drops: Clinical Nursing Skills 14.1 says wait at
//     least 5-10 minutes before a second drop; Clinical Nursing Skills 14.5
//     says 5 minutes and Pharmacology for Nurses 38.1 at least 2. No Tier 1
//     source was found for a general rule (it varies by product label). The
//     number is left out; the objectives state the principle: wait so the
//     first drop is not washed out.
//   - Distance of a subcutaneous injection from the umbilicus: Clinical
//     Nursing Skills 12.5 says at least 1 inch (2.5 cm); Pharmacology for
//     Nurses 2.3 says at least 2 inches. No Tier 1 source checked; the number is
//     left out and the objectives say "well away from the umbilicus".
//   - Route for parenteral nutrition: Pharmacology for Nurses 5.3 says TPN
//     goes through a central venous catheter; Medical-Surgical Nursing 19.3
//     says it may run centrally or peripherally, with a central line the
//     most likely route. No Tier 1 source was checked. The objective states
//     the principle only: concentrated dextrose irritates small veins, so a
//     central line, confirmed by chest x-ray, is the usual route.
//   - Normal serum bicarbonate: Fundamentals 20.2 gives about 22-29 mmol/L,
//     while Medical-Surgical Nursing uses 22 mEq/L as its acidosis cut-off.
//     Not settled by a Tier 1 source here, so no bicarbonate range appears;
//     the ABG objectives name only pH 7.35-7.45 and PaCO2 35-45 mm Hg, on
//     which both books agree.
//   - Ear irrigation versus ear drops: Clinical Nursing Skills 14.2 says ear
//     drops go in at room temperature, and its worked example irrigates with
//     warm water. These are different procedures, but to avoid teaching a
//     temperature we could not pin down, the irrigation objective names no
//     temperature.
//   - The 2026 NCLEX-PN Test Plan (Tier 1) lists "Monitor transfusion of
//     blood product", "Maintain central venous catheter", "Assist in
//     preparing client for insertion of a central venous access device" and
//     "Administer intravenous piggyback (secondary) medications". The older
//     comment above NCLEX_PN_TRACK says blood products and central venous
//     access are absent from the PN plan. We followed the 2026 plan for the
//     new PN and LPN/VN objectives and left the earlier comment and
//     objectives untouched; the PN's actual scope remains set by each state.
//     TPN does not appear in the 2026 PN plan and is not added.
//   - Numbers that rest on one source and were cross-checked against the
//     other books on file without finding a conflict: serum potassium above
//     5.1 mEq/L (Fundamentals 20.1, also Medical-Surgical Nursing); digoxin
//     held for an adult apical rate below 60 (Pharmacology 17.6; the Open RN
//     text gives 100 for infants, a different population); post-void residual
//     under 50 mL (Clinical Nursing Skills 19.4, Nutrition for Nurses 15.1);
//     fetal heart rate baseline 110-160 bpm; gestational diabetes screening
//     at 24-28 weeks; vastus lateralis under 18 months; severe neutropenia
//     below 500; postpartum fever above 100.4 F. Lithium's target level
//     (Pharmacology 13.3) was not checked against the FDA label and is left
//     out. Postpartum haemorrhage (1,000 mL within 24 hours) is ACOG's 2017
//     definition as cited by Maternal-Newborn Nursing 21.2; ACOG itself was
//     not opened.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// NCLEX-RN (2026 Test Plan, effective April 1 2026 through March 31 2029)
// Computerized adaptive, variable length. Clinical judgment is measured by
// 18 case study items (three item sets) plus roughly 10% stand-alone items.
// Client Needs midpoints: 18 / 13 / 9 / 9 / 9 / 16 / 12 / 14.
// ---------------------------------------------------------------------------
export const NCLEX_RN_TRACK: SeedTrack = {
  code: "NCLEXRN",
  // REQ-263 (Nick, 2026-11-13): level-aware lessons switched on once its Key terms were written.
  levelFlow: true,
  title: "Prep for the NCLEX-RN Exam",
  description:
    "The registered nurse licensure examination, built on the 2026 NCSBN test plan: the four Client Needs categories and their eight subcategories, weighted as the exam weights them, with clinical judgment treated as the thing being tested rather than a topic to revise.",
  trackType: "certification",
  subcategorySlug: "nclex-preparation",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.ncsbn.org/public-files/2026_RN_Test%20Plan_English-F.pdf",
  sourceVerifiedAt: VERIFIED_AT,
  requiresAcknowledgement: true,
  disclaimerKey: NURSING_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    ...NCSBN_PROVIDER,
    credentialSlug: "nclex-rn",
    credentialName: "NCLEX-RN Examination",
    credentialUrl: "https://www.ncsbn.org/exams/testplans.page",
    basis: "regulatory_licensure",
    examCode: "NCLEX-RN",
    examRevision: "2026 Test Plan",
    standardName: "NCLEX-RN Test Plan",
    standardRevision: "2026",
    status: "active",
    effectiveDate: "2026-04-01",
    retirementDate: "2029-03-31",
    officialObjectivesUrl:
      "https://www.ncsbn.org/public-files/2026_RN_Test%20Plan_English-F.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Completion of a state-approved registered nursing program. The plan assumes entry-level practice: the candidate is being measured against what a newly licensed RN must do safely, not against experienced practice.",
    questionFormat:
      "Computerized adaptive, variable length; includes 18 clinical judgment case study items (three item sets) and approximately 10% stand-alone clinical judgment items; item types include multiple choice, multiple response, and other formats",
    passingScorePolicy:
      "Pass/fail against a standard set by NCSBN rather than a percentage score; decided by the 95% confidence interval rule, the maximum-length rule, or the run-out-of-time rule",
  },
  units: [
    {
      title: "Management of Care",
      rangeLabel: "15-21% of the exam",
      weight: 18,
      gate: "Given a shift of assigned clients, decide who is seen first and what goes to whom -- and defend the delegation against scope of practice, not against convenience.",
      objectives: [
        "Prioritizing by acuity rather than by who asked first",
        "Airway, breathing, circulation as a prioritization frame, and where it stops helping",
        "Unstable versus stable: recognizing which client is actually deteriorating",
        "Assignment and delegation are different acts with different accountability",
        "Matching a task to the competency of an LPN/VN, assistive personnel, or another RN",
        "The five rights of delegation: task, circumstance, person, direction, supervision",
        "What can never be delegated: assessment, evaluation, teaching, unstable clients",
        "Supervising delegated care and evaluating the outcome rather than assuming it",
        "Giving and receiving handoff of care on assigned clients",
        "Safe admission, transfer and discharge procedures",
        "Continuity of care across settings and shifts",
        "Advance directives: living will, health care proxy, durable power of attorney for health care",
        "Integrating an advance directive into the plan of care rather than filing it",
        "Assessing what the client actually understands about self-determination",
        "Acting as client advocate when the client's decision is not the family's preference",
        "Choosing the right advocacy resource: social work, chain of command, interpreter",
        "Supporting unbiased treatment and equal access to care across culture, ethnicity, sexual orientation and gender identity",
        "Client rights, and the nurse's duty to educate clients and staff about them",
        "Informed consent: the nurse verifies it, the provider obtains it",
        "Confirming the client received education and consented before a procedure",
        "Confidentiality and information security, including disclosure through social media",
        "Receiving, verifying and implementing provider orders",
        "Documenting with approved terminology, accurately and in time to be useful",
        "Accessing client records within facility regulation",
        "Legal issues that reach the nurse: refusal of treatment, client valuables, interpreter services",
        "Mandatory reporting: abuse, neglect, communicable disease",
        "Recognizing ethical dilemmas and reporting them",
        "Practicing within the nurses' code of ethics and the legal scope of practice",
        "Recognizing the limits of one's own competence and using resources",
        "Collaborating with the multidisciplinary team: physical therapy, nutrition, social work",
        "Case management for a client with chronic or complex needs",
        "Assessing the need for a referral and obtaining the order it requires",
        "Community resources: respite care, social services, shelters",
        "Performance and quality improvement: what the activity is and how the nurse participates",
        "Evaluating what a quality improvement measure actually changed",
        "Managing conflict among clients and staff",
        "Organizing a workload so time is spent where acuity is",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Work a case through the six clinical judgment steps the test plan names -- recognize cues, analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes -- and say which step a given question is testing", // RNTP p8; MS 4.2
        "Prioritize hypotheses by asking which explanation is most likely, which is most serious, and which must be treated first, then revisit the ranking as new data arrive", // MS 4.2; FN 43.1
        "Write outcomes in SMART form with a time frame, set with the client's input where possible, so that evaluation has something concrete to compare against", // MS 4.4
        "Evaluate outcomes by comparing what happened with what was expected, and revise the plan when the goal is not met rather than repeating the same interventions", // MS 4.5; FN 43.1
        "Account for context in clinical judgment: time pressure, task complexity, prior experience and the client's cultural, psychological and spiritual factors all shape the decision", // MS 4.2; MS 4.3
        "Know the licensed nurse cannot delegate clinical reasoning, nursing judgment or critical decision making, and keeps overall accountability for the client even after delegating a task", // DEL
        "Distinguish assignment from delegation: assignment hands routine care within a person's authorized scope or basic training; delegation hands a specific activity beyond their traditional role, after competence is validated", // DEL; FN 15.4
        "Apply the right circumstance: delegate only for a stable client, and require the delegatee to report any change so the nurse can reassess whether delegation is still safe", // DEL
        "Give delegation directions that state what data to collect, how and by when to report, and make clear the delegatee may not change the activity without first consulting the nurse", // DEL
        "Know that handing care of a client to another RN, or an LPN/VN to another LPN/VN, is a handoff, not delegation, and that state law decides whether an LPN/VN may delegate to assistive personnel", // DEL
        "Know the nurse's part in informed consent: confirm the signer is of legal age, competent and acting voluntarily, and escalate when the client does not understand the procedure, its risks or alternatives", // FN 16.3
        "Recognize when someone else gives consent -- parents, guardians or court-appointed decision-makers -- and when consent is implied in an emergency", // FN 16.3
        "Know that a nurse who knows consent was not properly obtained and does not tell the provider or a supervisor can be held liable, and that treating without consent may be battery", // FN 16.3
        "Name the ethical principles behind practice -- autonomy, beneficence, nonmaleficence, justice, fidelity and veracity -- and identify which ones conflict in a dilemma", // FN 16.2
        "Distinguish a living will and a named healthcare proxy from a POLST, which is a portable medical order that guides care in the last stage of life", // FN 36.4
        "Protect health information by logging off after each use, guarding the screen, keeping conversations private, and accessing only the minimum information the job requires", // FN 9.3
        "Identify the parts of a malpractice claim -- a duty owed, a breach of that duty, and harm caused by the breach -- and how documentation of the standard of care is used to judge it", // FN 16.3; FN 16.2
        "Discharge a client safely: review medications and follow-up, and confirm the client has the knowledge, supplies and support to manage at home", // FN 8.3
        "Use the PDSA cycle in quality improvement: plan a change, try it, study the result, then act on what was learned and run the cycle again until the change works", // FN 15.3
        "Know that a sentinel event is a patient safety event, such as a fall, that leads to death, permanent harm or severe temporary harm -- not harm from the illness itself -- and that its investigation uses root cause analysis to find system causes", // FN 15.3; FN 9.1
        "Recognize leadership styles -- autocratic for a code, democratic for a unit protocol change, laissez-faire for experienced self-directed staff -- and when each fits", // FN 18.1
        "Advocate for a client through the chain of command when concerns go unanswered, as part of the nurse's professional duty", // FN 16.4; FN 16.3
        "Run an organized, thorough admission, because what is learned at admission sets the course of care and an admission can turn emergent if the client becomes unstable", // FN 8.1
        "Give a transfer report focused on what the receiving team most needs, since every transfer point is a chance for crucial information to be lost", // FN 8.2
        "Use a care transition model -- communication, client and caregiver teaching, medication reconciliation, timely follow-up -- to prevent avoidable readmission", // POP 30.2; POP 30.1
        "Know the roles of the interprofessional team members, each bound by their own state scope of practice, and use referrals to connect clients to them", // FN 15.6; CNS 2.4
        "Know that delegation decisions start at the organization, which sets policies on what may be delegated, to whom and under what circumstances", // DEL
      ],
    },
    {
      title: "Safety and Infection Prevention and Control",
      rangeLabel: "10-16% of the exam",
      weight: 13,
      gate: "Given a client, a room and a diagnosis, name the precautions required and the hazards present -- and act on the error you would rather not report.",
      objectives: [
        "Principles of infection prevention: hand hygiene, aseptic technique, isolation, sterile technique",
        "Standard precautions as the floor that applies to every client",
        "Transmission-based precautions matched to the mode: airborne, droplet, contact",
        "Enhanced barrier precautions and when they apply",
        "Setting up and maintaining a sterile field",
        "Evaluating whether aseptic technique was actually performed correctly",
        "Protecting the immunocompromised client",
        "Communicable disease: modes of transmission and correct reporting procedure",
        "Educating client and staff on infection prevention measures",
        "Correct client identification before any care is given",
        "Assessing the client for allergies and acting on what is found",
        "Factors that raise accident and injury risk: age, developmental stage, mental status, lifestyle",
        "Deficits that impede safety: visual, hearing, sensory and perceptual",
        "Seizure precautions for the at-risk client",
        "Room assignment decisions for the cognitively impaired client",
        "Verifying that a treatment order is appropriate as well as accurate",
        "Home safety assessment: lighting, handrails, kitchen and fire hazards",
        "Infant and child car seat use",
        "Ergonomic principles and body mechanics when providing care",
        "Assessing balance and transfer ability before planning mobility care",
        "Safe use of equipment, and removing malfunctioning equipment from the care area",
        "Handling biohazardous, flammable and infectious materials",
        "Safe implementation of internal radiation therapy",
        "Restraints and safety devices: assessing appropriateness of the type used",
        "Following the legal and facility requirements that attach to restraint use",
        "Monitoring and evaluating the client's response to a restraint",
        "Acknowledging and documenting practice errors and near misses",
        "Incident, event and variance reporting, and evaluating the response to it",
        "Reporting, intervening in or escalating unsafe staff practice",
        "Emergency response: nursing roles in disaster planning and drills",
        "Deciding which clients can be discharged in a disaster situation",
        "Security plans: newborn security, controlled access, violence, environmental",
        "Triage and evacuation principles",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Name the six links in the chain of infection -- agent, reservoir, portal of exit, mode of transmission, portal of entry, susceptible host -- and choose the action that breaks each link", // FN 10.1
        "Keep a sterile field sterile: hands and sterile items stay above the waist and in view, never reach across the field, and treat anything below the waist as contaminated", // FN 10.3
        "Know when to use soap and water instead of alcohol rub: visibly soiled hands, after using the restroom, before eating, and during C. difficile or norovirus outbreaks", // CDC-HH; CNS 6.2
        "Choose transmission-based precautions: gown and gloves on entry for contact; a mask on entry for droplet; a fit-tested N95 in an airborne infection isolation room for airborne", // CDC-TBP
        "Limit transport of an isolated client to medically necessary trips, with a mask on a client on droplet or airborne precautions and infected areas covered for contact precautions", // CDC-TBP
        "Keep susceptible staff out of the rooms of clients with known or suspected measles, chickenpox or disseminated zoster when immune staff are available", // CDC-TBP
        "Apply enhanced barrier precautions in long-term care: gown and gloves for high-contact care of residents with MDROs, wounds or indwelling devices, without confining them to the room", // CDC-EBP
        "Know when contact precautions replace enhanced barrier precautions: uncontained diarrhea or drainage, an outbreak, a public health directive, or C. difficile, norovirus or scabies", // CDC-EBP
        "Name the elements of standard precautions, including respiratory hygiene, cleaning and disinfecting shared equipment, safe handling of linen and safe injection practices", // CDC-SP
        "Prevent falls in older adults with a fall risk assessment, medication review and attention to the drugs, such as opioids, that raise fall risk", // FN 41.4; FN 9.1
        "Recognize the forms of abuse a client may disclose and follow state and facility reporting rules, including adult and child protective services and police where required", // FN 9.2
        "Know that workplace violence is a major occupational hazard in health care, and that nurses face a high risk of injury and infectious exposure", // FN 9.2; FN 9.1
        "Triage with the ABCDE sequence -- airway, breathing, circulation, disability, exposure -- assessing the airway first whatever the underlying cause", // MS 33.1
        "Know the phases of disaster response, starting with mitigation that reduces the risk and impact of future disasters before one occurs", // MS 34.4
        "Prevent medication errors through the safety checks in four groups: identify the client correctly, check the order for errors, keep the environment safe, and monitor for adverse reactions", // CNS 11.1
        "Recognize oncologic emergencies the nurse must report at once, such as tumor lysis syndrome with its high potassium, high phosphate and low calcium", // MS 31.3
        "Screen every client for intimate partner violence and know that pregnancy raises the risk of physical abuse and of serious maternal and newborn complications", // MN 9.2; FN 9.2
        "Manage aggression with the least restrictive measure that is safe, treat an emergency medication order as an interim step, and stay with the client afterwards to monitor its effect", // PMH 11.2
        "Wear the correct PPE as the best protection against chemical, drug and infectious exposure, and know the follow-up steps when an exposure happens", // MS 33.3
        "Recognize biological disasters -- outbreaks, pandemics and bioterrorism -- and apply epidemiology and public health principles to triage and care", // MS 34.2
        "Keep electronic health information confidential, accurate and available, and spot and respond to a security breach", // FN 9.3
        "Clean and disinfect equipment used for a client on contact precautions before another client uses it, or keep dedicated equipment such as a blood pressure cuff", // CDC-TBP
        "Know when to clean hands: before touching a client, before an aseptic task, after body fluid exposure, after touching the client or their surroundings, and right after removing gloves", // CDC-HH
      ],
    },
    {
      title: "Health Promotion and Maintenance",
      rangeLabel: "6-12% of the exam",
      weight: 9,
      gate: "Given a client at any age, say what is expected for that stage, what screening is due, and what the teaching should target.",
      objectives: [
        "Expected age-related change, and the client's reaction to it",
        "Care and education from birth through 2 years",
        "Care and education for ages 3 through 17",
        "Care and education for the adult client aged 18 to 64",
        "Care and education for the adult client aged 65 and over",
        "Developmental stages and the transitions between them",
        "Prenatal care and education",
        "Assessing psychosocial response to pregnancy: support, perception, coping",
        "Calculating the expected delivery date",
        "Fetal heart rate at routine prenatal examinations",
        "Care of the antepartum client and the client in labor",
        "Postpartum care, and assessing for hemorrhage and infection",
        "Newborn care and education",
        "Comprehensive health assessment versus targeted screening",
        "Targeted screening: vision, nutrition, depression",
        "Health history and risk assessment, including family and genetic history",
        "Interviewing technique when taking a health history",
        "Choosing physical assessment equipment and technique appropriate to the client",
        "Disease prevention and health maintenance recommendations",
        "Community health education and participation in it",
        "High-risk behaviors: identifying them and teaching prevention and treatment",
        "Lifestyle choices, including sexuality, contraception and family planning",
        "Contraindications to a chosen contraceptive method",
        "Recognizing the socially or environmentally isolated client",
        "Alternative and homeopathic practices the client is already using",
        "Assessing readiness to learn, learning preference, and barriers to learning",
        "Minimizing communication barriers so teaching actually lands",
        "Self-care capacity in the home environment, and planning care around it",
        "Evaluating whether the client understood the health promotion behavior taught",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Tell the five levels of prevention apart -- primordial, primary, secondary, tertiary, quaternary -- and place immunization and lifestyle teaching in primary prevention and screening in secondary prevention", // POP 2.5
        "Name Erikson's psychosocial stages in order from trust versus mistrust onward, and recognize how an unresolved early stage can show up later in a client's behavior", // FN 38.2
        "Plan teaching for each learning domain -- cognitive for knowledge, affective for attitudes and feelings, psychomotor for skills -- and match the method to the domain", // FN 17.2
        "Evaluate learning with objective evidence -- return demonstration, the client explaining in their own words, or a checklist -- rather than accepting nods and smiles as understanding", // FN 17.4
        "Estimate the due date from the first day of the last menstrual period with Naegele's rule, or by ultrasound, and note maternal age at either end of the range as a risk factor", // MN 11.1
        "Know the second-trimester milestones of routine prenatal care: anatomy ultrasound, gestational diabetes screening at 24 to 28 weeks, quickening, and visits every 4 weeks", // MN 11.3
        "Report blood pressure readings that need follow-up in pregnancy: 140/90 mm Hg or higher before 20 weeks suggests preexisting hypertension, and any elevation after 20 weeks needs investigation", // MN 11.3
        "Assess the postpartum fundus and bladder: a boggy uterus displaced above the umbilicus and to one side often means a full bladder, so help the client empty it and massage the fundus", // MN 20.3
        "Describe the expected change in lochia from rubra in the first days after birth through serosa to alba, and teach the client what to expect at home", // MN 20.3
        "Recognize postpartum hemorrhage -- cumulative blood loss of 1,000 mL or more within 24 hours of birth, by either route -- measure blood loss quantitatively, and activate the hemorrhage team", // MN 21.2
        "Score the Apgar at 1 and 5 minutes on heart rate, respiratory effort, reflex irritability, muscle tone and color, and repeat at 10 minutes when the 5-minute score is below 7", // MN 22.1
        "Support early newborn care: skin-to-skin contact for the stable baby, delaying the first bath to protect temperature and blood sugar, and infant security banding", // MN 24.1
        "Teach parents the newborn warning signs that need urgent care, such as a pause in breathing of 20 seconds or more, or any shorter pause with blue color, paleness or a slow heart rate, and safe sleep and car seat use", // MN 24.3
        "Use the comprehensive geriatric assessment areas -- ADLs, IADLs, mental health, fall risk, pain, polypharmacy, nutrition, senses and care preferences -- to target health promotion for an older adult", // FN 41.4
        "Recognize that preeclampsia, gestational hypertension and gestational diabetes are conditions of pregnancy itself and are diagnosed during prenatal care", // MN 12.2
        "Take a sexual health history with the 5 Ps -- partners, practices, protection from STIs, past history of STIs, and pregnancy intention -- in a respectful, non-judgemental way", // MN 7.1
        "Choose contraception through shared decision making, using the reproductive history to find what matters to the person and any contraindications", // MN 5.1
        "Give anticipatory guidance before, during and after pregnancy, and know the factors linked to rising infertility, such as delayed childbearing, obesity, smoking, alcohol and STIs", // FN 39.3
        "Explain natural passive immunity -- antibodies passed across the placenta and in breast milk -- and how it differs from immunity from vaccination", // PHARM 6.2
        "Know which diseases childhood vaccines prevent, and that adults are advised vaccines such as influenza, pneumococcal, shingles and COVID-19 depending on age, health and risk", // PHARM 6.2
        "Place cancer prevention on the prevention levels: HPV and hepatitis B vaccination as primary prevention, and mammograms, colonoscopy and Pap or HPV cotesting as secondary prevention", // MS 31.2
        "Assess older adults for fall risk, linked to osteoporosis, loss of muscle mass, dizziness, poor mobility, weakness and vision impairment", // FN 41.3
        "Plan health promotion for older adults around dementia, cancer, diabetes and depression, the chronic illnesses that are most frequent and most expensive in later life", // FN 41.3
        "Explain the reasons for genetic testing -- inherited conditions, diagnosis from symptoms, carrier status, cancer screening or treatment -- and support informed decisions about it", // MS 30.3
      ],
    },
    {
      title: "Psychosocial Integrity",
      rangeLabel: "6-12% of the exam",
      weight: 9,
      gate: "Given a client in distress, choose the response that opens the conversation rather than closing it -- and recognize when distress has become a safety problem.",
      objectives: [
        "Therapeutic communication technique, and what makes a response non-therapeutic",
        "Encouraging the client to put feelings into words",
        "Allowing silence and time rather than filling it",
        "Assessing verbal and nonverbal communication needs",
        "Recognizing nonverbal cues to physical and psychological stress",
        "Evaluating whether communication with the client was effective",
        "Assessing for abuse or neglect, and reporting or escalating it",
        "Risk factors for domestic, child, elder and sexual abuse",
        "Providing a safe environment for the abused or neglected client",
        "Assessing the potential for violence and using safety precautions",
        "Identifying the client in crisis and applying crisis intervention technique",
        "Coping mechanisms, and evaluating constructive use of defense mechanisms",
        "Adapting to temporary and permanent role change",
        "Supporting the client with an unexpected altered body image",
        "Substance use disorder: assessing for misuse, dependency and withdrawal",
        "Managing withdrawal and toxicity symptoms",
        "Non-substance dependencies such as gambling",
        "Signs and symptoms of acute and chronic mental illness",
        "Impaired cognition: memory loss, poor hygiene, altered judgment",
        "Alterations in mood, judgment, cognition and reasoning",
        "Behavioral intervention and helping the client regain self-control",
        "Orienting the client to reality, and providing reality-based diversion",
        "Sensory and perceptual alterations, and strategies for the client experiencing them",
        "Grief and loss, including anticipatory grieving",
        "Expected reactions to grief, and resources for bereavement",
        "End-of-life needs: fear, loss of control, financial concern, role change",
        "Psychosocial support for the family and caregiver at end of life",
        "Cultural practice and belief incorporated into the plan of care",
        "Religious and spiritual influences, including conflict between belief and treatment",
        "Family dynamics, stressors and barriers to family functioning",
        "Support systems, and involving the client in decisions about care",
        "Stress management technique, and evaluating the client's use of it",
        "Promoting and maintaining a therapeutic environment",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Avoid the common blocks to therapeutic communication: challenging, probing, changing the subject, false reassurance, disagreeing, judging, rejecting or minimizing the client's concern", // PMH 3.1
        "Restate and clarify what the client says to check understanding, and use self-reflection to keep improving your own therapeutic communication", // PMH 3.1
        "Assess suicide risk directly when ideation is present, including lethality: whether there is a detailed plan, access to means, past attempts, current mental state and social support", // PMH 16.3
        "Know that suicidal ideation ranges from fleeting passive thoughts to a detailed plan with timing and method, and that depression and substance use are its most common drivers", // PMH 16.3
        "Monitor lithium closely: it has a narrow safety margin, so changes in sodium balance and drugs such as diuretics, NSAIDs and ACE inhibitors can push the level into toxicity", // PHARM 13.3
        "Watch for hypothyroidism in a client on long-term lithium, because lithium suppresses thyroid hormone synthesis and release", // PHARM 13.3
        "Recognize extrapyramidal effects of first-generation antipsychotics -- pseudoparkinsonism, dystonia, akathisia and tardive dyskinesia -- and report them promptly", // PHARM 13.2
        "Recognize neuroleptic malignant syndrome as a rare but potentially fatal reaction to antipsychotics that needs immediate escalation", // PHARM 13.2
        "Know that clozapine is reserved for schizophrenia that has not responded to other drugs and needs absolute neutrophil count monitoring as its labeling directs (the FDA ended the clozapine REMS program in June 2025)", // PHARM 13.2
        "Separate an MAOI from other serotonergic antidepressants by the required washout, because combining them risks serotonin syndrome", // PHARM 13.1
        "Screen for alcohol withdrawal on admission and use the CIWA-Ar scale to judge the need for medically supervised withdrawal management", // PMH 19.2
        "Recognize alcohol overdose -- confusion, difficulty staying conscious, vomiting, seizures, slow breathing and heart rate, low temperature -- and the added risk when combined with opioids or sedatives", // PMH 19.2
        "Recognize anorexia nervosa by severe restriction and very low body weight, with an adult BMI under 18.5 as the usual marker", // PMH 20.2
        "Give trauma-informed care built on safety, trust and collaboration, and avoid care that makes a client feel as unsafe as when the trauma happened", // PMH 6.5
        "Support a grieving client to express grief in their own way, including anger, and offer listening without judgment", // FN 36.1
        "Recognize the physical side of grief -- fatigue, chest tightness, breathlessness, palpitations -- and the behaviors that signal a client is struggling, such as withdrawal or avoiding reminders", // FN 36.1
        "Recognize a manic episode -- high energy, grandiose delusions, little need for sleep, racing thoughts, rapid speech and reckless behavior -- and the depressive episodes that alternate with it in bipolar disorder", // PMH 16.4
        "Distinguish generalized anxiety disorder, persistent excessive worry that interferes with daily life, from expected worry, and recognize its physical and behavioral signs", // PMH 17.2
        "Recognize the core symptoms of schizophrenia -- delusions, hallucinations, disorganized speech or behavior, and negative symptoms -- and psychosis as a loss of contact with reality", // PMH 15.1
        "Support clients with borderline personality disorder through clear, consistent boundaries, and know that dialectical behavior therapy is the gold-standard treatment", // PMH 18.3
        "Know the client rights that protect mental health clients, including HIPAA confidentiality and the HIPAA notice describing how health information is shared", // PMH 10.1
        "Assess spiritual beliefs and needs, recognizing how they may differ from your own, and draw on them as a source of comfort and resilience during illness", // FN 35.2
        "Recognize the mental health conditions that follow trauma, such as PTSD, and the ways trauma shapes a client's behavior and trust", // PMH 17.4; PMH 6.5
        "Assess for every form of abuse -- physical, emotional, psychological, verbal, sexual and financial -- and recognize neglect, the failure to care properly, as abuse too", // CNS 20.3
        "Know that nurses are often first to see signs of anger, abuse and violence, and that abuse occurs in homes and in institutions such as hospitals and nursing homes", // PMH 9.3
        "Recognize opioid use disorder, which can begin with legitimate pain treatment, and its consequences such as financial trouble", // PMH 19.4
      ],
    },
    {
      title: "Basic Care and Comfort",
      rangeLabel: "6-12% of the exam",
      weight: 9,
      gate: "Given a client who cannot fully care for themselves, provide the assistance the deficit actually calls for while keeping dignity intact.",
      objectives: [
        "Assessing performance of activities of daily living and assisting where needed",
        "Maintaining dignity and privacy during personal care",
        "Personal hygiene for the dependent client",
        "Assistive devices: prosthetic limbs, hearing aids, eating utensils",
        "Compensating for a physical or sensory impairment",
        "Applying, maintaining and removing orthopedic devices",
        "Mobility and immobility, and the complications immobility causes",
        "Measures that promote circulation: range of motion, positioning, mobilization",
        "Skin assessment and maintaining skin and tissue integrity",
        "Nutrition and oral hydration, and evaluating nutritional status",
        "Providing nutrition through tube feedings",
        "Evaluating intake and output and acting on the imbalance",
        "Bowel and bladder elimination, and managing an alteration in either",
        "Performing irrigations of bladder, ear or eye",
        "Rest and sleep: assessing the pattern and intervening on it",
        "Assessing for pain and acting on the assessment",
        "Nonpharmacological comfort measures",
        "Complementary therapies: potential benefit and contraindication",
        "Postmortem care",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Use PQRSTU to take a pain history -- what provokes or relieves it, its quality, region and radiation, severity, timing and treatment, and how it affects the client", // FN 30.4
        "Choose a pain scale that fits the client's cognitive and developmental level, with the 0-10 numeric scale for clients who can self-report", // FN 30.4
        "Offer nonpharmacological pain relief -- relaxation, music, breathing, distraction, guided imagery, massage -- and know the conditions in which massage needs caution", // FN 30.5
        "Teach sleep hygiene: a consistent bedtime routine and cutting caffeine and alcohol in the hours before bed", // FN 28.4
        "Stage pressure injuries: stage 1 is intact skin with nonblanchable redness, which may look darker or lighter rather than red on darkly pigmented skin", // MS 28.3
        "Know that a wound covered by slough or eschar is unstageable until it is debrided, when it will prove to be stage 3 or 4, and that devices can cause their own pressure injuries", // MS 28.3
        "Recognize urinary retention, including after anesthesia and with opioids or an enlarged prostate, and act on the incomplete emptying it causes", // FN 26.4
        "Prevent constipation by tackling its causes -- inactivity, dehydration, low fiber, opioids and diuretics -- and use the Bristol stool chart to describe stool", // FN 27.4
        "Match diet teaching to the condition: a consistent carbohydrate diet for diabetes, low-fat low-sodium eating for heart disease, and modified textures for dysphagia", // FN 21.3
        "Recognize that loss of basic ADLs such as bathing, feeding and dressing sharply raises the chance of nursing home admission, and plan support that preserves them", // FN 22.3
        "Care for a client in a cast, brace, sling or traction, and watch for pressure injury or skin infection from a cast that is too tight", // CNS 9.5
        "Prevent sensory overload in hospital -- crowding, noise, bright lights, strong smells -- and recognize its signs: irritability, agitation, anxiety and fatigue", // FN 29.2
        "Use the TIME principles to prepare a wound bed -- tissue, infection or inflammation, moisture balance, edges -- and choose a dressing that fits the wound at that stage", // MS 28.5
        "Tell venous leg ulcers -- medial lower leg, irregular, heavily draining -- from arterial wounds, and know arterial wound care centers on moist healing", // MS 28.5
        "Give oral care to a dependent client, more often when NPO or mouth breathing, with the head of the bed raised 30 to 45 degrees and suction available to prevent aspiration", // CNS 7.3
        "Store dentures in a labeled, closed cup when not worn, and handle them as the client's property", // CNS 7.3
        "Follow the speech-language pathologist's texture recommendations for a client with dysphagia to reduce aspiration risk", // FN 21.3
        "Position the feet to prevent foot drop in a client on prolonged bed rest", // CNS 9.4
        "Know when a gait belt is contraindicated -- recent chest, back or abdominal surgery, a G tube, hernia, abdominal aneurysm, severe cardiac or respiratory conditions", // CNS 9.3
      ],
    },
    {
      title: "Pharmacological and Parenteral Therapies",
      rangeLabel: "13-19% of the exam",
      weight: 16,
      gate: "Given an order, a client and a calculation, give the medication safely -- or refuse to, for a reason you can name.",
      objectives: [
        "The rights of medication administration, applied rather than recited",
        "Reviewing contraindications, allergies, lab results and interactions before giving",
        "Evaluating whether the medication order is appropriate and accurate for this client",
        "Performing the calculations medication administration requires",
        "Administering and documenting medications by common routes",
        "Administering and documenting medications by parenteral routes",
        "Mixing medications from two vials",
        "Titrating a dose against assessment and ordered parameters",
        "High-risk medications and the extra handling they require",
        "Controlled substances within regulatory guidelines",
        "Safe storage and safe disposal of medication",
        "Medication reconciliation and the nurse's part in it",
        "Expected actions and outcomes of a prescribed medication",
        "Evaluating the client's response to a medication over time",
        "Adverse effects, side effects, contraindications and interactions distinguished",
        "Recognizing an allergic reaction to a medication",
        "Incompatibilities among a client's prescribed medications",
        "Notifying the provider, and documenting what was observed and done",
        "Teaching the client which effects warrant a call to the provider",
        "Pharmacological pain management, including p.r.n. decision-making",
        "Pain medication appropriate to age and diagnosis, including pregnancy and older adults",
        "Evaluating and documenting response to pain medication",
        "Peripheral intravenous therapy: vein selection and site maintenance",
        "Preparing the client for venous access device insertion",
        "Monitoring an infusion pump, including patient-controlled analgesia",
        "Central venous access devices: access, maintenance and client teaching",
        "Blood and blood products: identification, consent and crossmatch verification",
        "Venous access adequate for blood product administration",
        "Administering blood products and evaluating the response",
        "Total parenteral nutrition: administration and client teaching",
        "TPN complications: hyperglycemia, fluid imbalance, infection",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Read anticoagulant monitoring: a higher aPTT, INR or anti-Xa level means blood that clots more slowly and a client more prone to bleeding", // PHARM 20.2
        "Teach a client on warfarin to keep vitamin K intake consistent rather than avoid it, because a sudden drop in leafy greens can over-anticoagulate them", // PHARM 20.2
        "Know the insulin profile -- onset, peak and duration -- and watch most closely for hypoglycemia when the insulin is peaking", // PHARM 28.2
        "Treat hypoglycemia in a conscious client with a fast carbohydrate such as glucose tablets, orange juice or hard candy", // PHARM 28.2
        "Monitor digoxin for toxicity -- anorexia, nausea, vomiting, visual changes and dysrhythmias -- and remember low potassium and magnesium increase the risk", // PHARM 19.6
        "Recognize the serious adverse effects of ACE inhibitors, including angioedema and a dry nonproductive cough", // PHARM 18.2
        "Report a medication error honestly and promptly, because early disclosure may allow an intervention that prevents harm", // PHARM 3.2
        "Before a transfusion, verify the order, check for any premedication and relevant labs, ask about past reactions, and confirm a working IV with blood tubing and normal saline ready", // CNS 13.4
        "Collect only one unit of blood from the bank at a time, and verify client identity, order, consent, blood type and compatibility at the bedside before starting", // CNS 13.4
        "Tell transfusion reactions apart: febrile nonhemolytic is most common, allergic reactions are often mild, acute hemolytic reactions come from ABO mismatch, and circulatory overload from excess volume", // MS 16.7
        "Recognize fluid volume overload during IV therapy -- rising blood pressure and respiratory rate, falling saturation, edema and crackles -- and act on it", // CNS 13.3
        "Stop the infusion, remove the catheter, document and notify the provider when an IV site is painful, red, swollen, warm, cool or leaking", // CNS 13.3
        "Know that concentrated parenteral nutrition irritates small veins, which is why it usually runs through a central line whose position is confirmed by chest x-ray before use", // PHARM 5.3; MS 19.3
        "Monitor vancomycin by renal function and serum drug levels, because it is cleared entirely by the kidneys, and know that the oral form treats C. difficile colitis", // PHARM 7.2
        "Monitor phenytoin with serum levels, drawing a trough just before the next dose, and teach that long-term use can cause gum overgrowth and osteoporosis", // PHARM 12.1
        "Choose an intramuscular site by age and volume: deltoid, vastus lateralis or ventrogluteal for adults and children over 18 months, and vastus lateralis for infants under 18 months", // CNS 12.6
        "Give subcutaneous injections in small volumes, usually 1 mL or less, in the abdomen well away from the umbilicus, the outer upper arm, anterior thigh or upper back", // CNS 12.5
        "Give sublingual and buccal medications correctly: not swallowed, chewed or taken with water, and not given while the client is eating, drinking or smoking", // CNS 12.1
        "Know that first-pass metabolism in the liver can reduce the bioavailability of an oral drug before it reaches the systemic circulation", // PHARM 2.2
        "Calculate pediatric doses carefully, often in mg/kg or by body surface area, and measure them with the smallest syringe that holds the dose", // PHARM 1.4
        "Teach a client on corticosteroids not to stop them abruptly because of the risk of adrenal insufficiency, and to report signs of infection; monitor potassium, sleep and weight", // PHARM 25.2
        "Use albuterol, a short-acting beta-2 agonist, as the rescue inhaler for acute bronchospasm, and teach that long-acting salmeterol is for maintenance only", // PHARM 25.1
        "Withhold bulk-forming laxatives when a client may have appendicitis, a bowel obstruction or ileus", // PHARM 30.3
        "Monitor opioid therapy with the NARCS U adverse effects in mind -- nausea, addiction, respiratory depression, constipation, sedation, urinary retention -- and treat respiratory depression with naloxone", // PHARM 14.3
        "Expect constipation in nearly every client on long-term opioids, and plan a bowel regimen with laxatives, softeners or fiber", // PHARM 14.3
        "Know that ultra-rapid CYP2D6 metabolizers can turn codeine into too much morphine, risking life-threatening respiratory depression", // PHARM 14.3
        "Give epinephrine first in anaphylaxis, ask the alert client to report any change in breathing or status, and add nebulized albuterol if the airway does not fully open", // PHARM 22.3
        "Instil eye drops into the lower conjunctival sac, press the inner canthus, and wait between drops so the first is not washed out", // CNS 14.1
        "Give ear medications at room temperature to avoid vertigo, dizziness and nausea", // CNS 14.2
      ],
    },
    {
      title: "Reduction of Risk Potential",
      rangeLabel: "9-15% of the exam",
      weight: 12,
      gate: "Given a client before or after a procedure, name the complication most likely to develop and the finding that would announce it.",
      objectives: [
        "Assessing and responding to changes and trends in vital signs",
        "Applying pathophysiology when measuring and interpreting vital signs",
        "Comparing client laboratory values against normal values",
        "Monitoring laboratory values and notifying the provider about results",
        "Obtaining blood specimens, and specimens other than blood",
        "Teaching the client the purpose and procedure of an ordered test",
        "Caring for the client undergoing diagnostic testing",
        "Comparing diagnostic findings against pretest results",
        "Testing within the nurse's scope: ECG, point-of-care testing, fetal monitoring",
        "Monitoring maternal and fetal diagnostic tests",
        "Potential for aspiration: feeding tube, sedation, swallowing difficulty",
        "Potential for skin breakdown: immobility, nutrition, incontinence",
        "Risk of insufficient vascular perfusion",
        "Comparing current data against the client's own baseline",
        "Monitoring output for change from baseline",
        "Focused and system-specific assessment",
        "Abnormal peripheral pulses after a procedure",
        "Abnormal neurologic status: consciousness, muscle strength, mobility",
        "Peripheral edema, and signs of hypo- or hyperglycemia",
        "Factors that delay wound healing",
        "Risk assessment for falls, sensory impairment, mobility and skin integrity",
        "Recognizing a trend in the client's condition and intervening on it",
        "Abnormal response following a diagnostic test or procedure",
        "Monitoring for signs of bleeding",
        "Positioning to prevent complications after a procedure",
        "Inserting, maintaining and removing a nasogastric or oral gastrointestinal tube",
        "Inserting, maintaining and removing a urinary catheter",
        "Inserting, maintaining and removing a peripheral intravenous line",
        "Maintaining tube patency, including chest tubes and decompression tubes",
        "Maintaining a percutaneous feeding tube",
        "Devices that promote venous return: antiembolism stockings, compression devices",
        "Intervening on circulatory complications: hemorrhage, embolus, shock",
        "Preventing aspiration, including verifying tube placement",
        "Preventing neurologic complications such as footdrop and numbness",
        "Recovery from local, regional and general anesthesia",
        "Preoperative care, and preoperative and postoperative teaching",
        "Managing the client before, during and after moderate sedation",
        "Monitoring therapeutic devices: chest tube, drains, continuous bladder irrigation",
        "Moving a client with a musculoskeletal condition without further injury",
        "Evaluating the client's response to a procedure or treatment",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Interpret arterial blood gases using the normal ranges -- pH 7.35 to 7.45 and PaCO2 35 to 45 mm Hg -- and name acidosis or alkalosis and whether the cause is respiratory or metabolic", // FN 20.2; MS 10.4
        "Apply a tourniquet tight enough to fill the veins but not stop arterial flow, release it as soon as blood flows, and label the specimen at the bedside", // CNS 10.4
        "Before surgery, confirm the client understands the procedure, risks and benefits, and that consent is signed before any medication that could impair decision-making", // MS 25.2
        "Prevent postoperative atelectasis and pneumonia with incentive spirometry and saturation monitoring, and inspect the incision for infection", // MS 27.3
        "Watch the postoperative client for DVT and pulmonary embolism, ileus and urinary retention, which immobility and surgery make more likely", // MS 27.3
        "Prioritize airway management and postoperative nausea and vomiting in the postanesthesia care unit, and give a clear handover from the surgical team", // MS 27.1
        "Palpate around a chest tube site, or a recently removed one, for crepitus that signals an air leak", // CNS 23.2
        "Recognize the cues of fluid imbalance -- changes in weight, urine output and skin turgor -- and track daily weights and intake and output closely in both fluid deficit and fluid excess", // FN 20.3
        "Correct sodium at the ordered rate, because changing serum sodium too quickly shifts water into or out of brain cells with life-threatening results", // MS 10.3; MS 21.4
        "Calculate pulse pressure and recognize a narrowed or widened value as a finding that needs follow-up", // CNS 15.7
        "Calculate ventricular rate from a 6-second strip by counting QRS complexes and multiplying by ten", // MS 12.2
        "Recognize premature ventricular contractions, unifocal or multifocal, and that three or more in a row is a run of ventricular tachycardia", // MS 12.2
        "Know that an arteriovenous fistula for long-term hemodialysis takes months to mature, so a temporary dialysis catheter is often used first", // MS 20.7
        "Work with respiratory therapy and the provider to set oxygen saturation targets in an acute respiratory exacerbation, and monitor saturation and oxygen needs", // MS 11.4
        "Know that benign prostatic hyperplasia affects over half of men aged 51 to 60 and 70 percent of men over 60, can lead to UTI and kidney stones, and that a hard prostate nodule raises concern for cancer", // MS 20.4
        "Measure post-void residual by bladder scan or straight catheter, expecting under 50 mL, or up to about 100 mL in older adults", // CNS 19.4
        "Prevent catheter-associated urinary tract infection, a common and largely preventable complication that lengthens stays and raises mortality", // CNS 19.4
      ],
    },
    {
      title: "Physiological Adaptation",
      rangeLabel: "11-17% of the exam",
      weight: 14,
      gate: "Given a client whose condition is changing, connect the pathophysiology to the finding in front of you and act at the right moment.",
      objectives: [
        "General principles of pathophysiology: injury and repair, immunity, cellular structure",
        "Identifying the pathophysiology behind an acute or chronic condition",
        "Assessing the client's adaptation to illness or health alteration",
        "Fluid and electrolyte imbalance: recognizing the signs and symptoms",
        "Managing the client with a fluid or electrolyte imbalance",
        "Evaluating the response to correction of an imbalance",
        "Decreased cardiac output: diminished pulses, hypotension",
        "Cardiac rhythm strip abnormalities and what they signify",
        "Hemodynamic values and intervening on abnormal ones",
        "Managing care of the client on telemetry or with a pacing device",
        "Monitoring and maintaining arterial lines",
        "Hemodialysis, continuous renal replacement therapy and peritoneal dialysis",
        "Managing the client with impaired ventilation or oxygenation",
        "Monitoring and caring for the client on a ventilator",
        "Performing suctioning, and providing pulmonary hygiene",
        "Wound care, dressing change, and monitoring wounds for infection",
        "Managing drainage devices, including negative pressure wound therapy",
        "Ostomy care and client education",
        "Removing sutures or staples",
        "Postoperative care and evaluating the response to surgery",
        "Caring for the client with increased intracranial pressure",
        "Internal monitoring devices: intracranial pressure, intrauterine pressure",
        "Care of the client who has had a seizure",
        "Infectious disease: signs, symptoms and incubation periods",
        "Evaluating response to treatment for an infectious disease",
        "Adverse effects of radiation therapy and interventions for them",
        "Implementing and monitoring phototherapy",
        "Maintaining the client's optimal temperature",
        "Complications of pregnancy, labor and delivery: eclampsia, hemorrhage, precipitous labor",
        "Signs of potential prenatal complications",
        "Assisting with invasive procedures: central line, thoracentesis, bronchoscopy",
        "Medical emergencies: applying pathophysiology under time pressure",
        "Emergency care procedures, including wound dehiscence",
        "Identifying client data that must be reported immediately",
        "Notifying the provider about an unexpected response or emergency",
        "Unexpected adverse response to therapy, and recognizing complications early",
        "Evaluating achievement of the client's treatment goals",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Identify hyperkalemia -- serum potassium above 5.1 mEq/L -- by irritability, cramping, diarrhea and peaked T waves, and know it can progress to dysrhythmia and cardiac arrest", // FN 20.1
        "Recognize hyponatremia by headache, confusion, nausea, seizures and coma", // FN 20.1
        "Recognize Cushing's triad -- widening pulse pressure, bradycardia and irregular breathing -- as a sign of increased intracranial pressure, alongside headache, vomiting and a falling level of consciousness", // MS 17.1
        "For a suspected stroke, find out when the client was last known well, because the clot-dissolving drug tPA is time-sensitive, and use the NIH Stroke Scale for severity", // MS 15.2
        "Know the common seizure triggers -- high fever, tumor, stroke, head injury, infection, hypoglycemia and alcohol -- so you can anticipate seizures and protect the client", // MS 17.5
        "Prioritize respiratory distress and falling oxygenation in pneumonia: monitor vital signs, give oxygen and prepare the client for imaging", // MS 11.7
        "Recognize heart failure: lower-extremity edema graded 0 to 4+, weight gain, cough, orthopnea and basal crackles, with respiratory distress signaling pulmonary edema", // MS 12.3
        "Prioritize airway, then breathing, circulation with fluid resuscitation, and temperature in a burn, and watch for infection, hypovolemia, hypothermia and sepsis", // MS 14.2
        "Interpret the fetal heart rate baseline: 110 to 160 bpm with moderate variability reassures, and the first response to an abnormal tracing is repositioning, or stopping oxytocin if it is infusing", // MN 16.4
        "Know that magnesium sulfate is used in pregnancy for fetal neuroprotection and preterm labor, and that hypertensive disorders of pregnancy can progress to HELLP syndrome and eclampsia", // MN 12.2
        "Protect the client with neutropenia from infection: know that severe neutropenia means neutrophils below 500 per microliter, and that infection may show only as fever, sore throat or mouth ulcers", // MS 16.5
        "Perform frequent neurovascular checks on a fractured limb to catch compartment syndrome, and suspect fat embolism when breathlessness, chest pain or neurological change follows a long-bone fracture", // MS 13.3
        "Recognize portal hypertension complications of cirrhosis -- varices, ascites and hepatic encephalopathy -- and the role of paracentesis for ascites", // MS 19.6
        "Recognize distributive shock, where low blood pressure comes from vasodilation rather than volume loss, and report a falling blood pressure with a rising heart rate promptly", // MS 23.4
        "Recognize the warning signs of immunodeficiency -- opportunistic or persistent infections despite treatment -- and teach measures that reduce infection risk, including antiretroviral adherence in HIV", // MS 29.3
        "Recognize the warning signs after brain or spinal cord injury -- headache, visual change, seizures, slurred speech, weakness, ear or nose drainage, loss of bowel or bladder control -- and changes in vital signs", // MS 17.9
        "Tell DKA from HHS: DKA is acute with a low mortality rate, while HHS develops slowly, over weeks, with a much higher mortality rate", // MS 21.2
        "Watch for hypoglycemia and low potassium, common side effects of diabetes medications, whose aim is blood glucose in range and an individual A1C target often set around 7 percent", // MS 21.2
        "Treat thyroid storm -- fever, tachycardia, agitation, confusion, vomiting, diarrhea -- as an emergency needing immediate care and treatment of the cause", // MS 21.3
        "Recognize hypothyroidism by low metabolic rate, weight gain, cold extremities, constipation and slowed thinking, and Graves' disease as the most common cause of hyperthyroidism", // MS 21.3
        "Know Addison's disease reduces cortisol and aldosterone, so low blood glucose can follow from the loss of cortisol", // MS 21.5
        "Recognize anaphylaxis -- flushing, angioedema, urticaria, bronchoconstriction, hypotension -- after exposure to foods, stings, latex or medications", // MS 24.7
        "Recognize appendicitis -- right lower quadrant or periumbilical pain and a positive Rovsing sign -- and that perforation can cause peritonitis, sepsis and septic shock", // MS 19.5
        "Know that Guillain-Barre syndrome is an autoimmune attack on the peripheral nerves, often following a respiratory or diarrheal illness, that can cause temporary paralysis and is occasionally fatal", // MS 17.2
        "Treat suspected bacterial meningitis as the most dangerous form of meningitis, one that can kill", // MS 17.2
        "Recognize multiple sclerosis, a chronic neurological disease that usually first appears between ages 20 and 40, with coordination problems, slurred speech and cognitive changes", // MS 17.3
        "Recognize intermittent claudication, leg pain on walking, as a sign of peripheral arterial disease, and tell arterial from venous disease", // MS 12.7
        "Prioritize airway clearance and respiratory status in cystic fibrosis, monitoring cough, lung sounds and vital signs for exacerbation", // MS 11.9
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// NCLEX-PN (2026 Test Plan, effective April 1 2026 through March 31 2029)
// Client Needs midpoints: 21 / 13 / 9 / 12 / 10 / 13 / 12 / 10.
//
// Not a smaller NCLEX-RN. The PN plan differs in ways that are scope of
// practice rather than difficulty, and the differences are the point:
//   - "Coordinated Care", not "Management of Care". The PN contributes to
//     care coordination under supervision rather than owning it.
//   - "Data Collection", not "Assessment". The RN assesses; the PN collects
//     data and reports it. Blurring this teaches practice that is outside
//     the licence.
//   - "Pharmacological Therapies", not "Pharmacological and Parenteral
//     Therapies". Corrected 2026-11-04 against the 2026 PN plan's activity
//     statements: the PN plan does list monitoring blood-product
//     transfusions, giving IV piggyback medications and maintaining a central
//     venous catheter (Reduction of Risk Potential). What it leaves out is
//     the RN's ownership of those therapies, so PN objectives on them say
//     "where state scope and facility policy allow". Total parenteral
//     nutrition is not named in the PN plan.
//   - Psychosocial Integrity is weighted higher on the PN exam (12%) than on
//     the RN exam (9%).
// ---------------------------------------------------------------------------
export const NCLEX_PN_TRACK: SeedTrack = {
  code: "NCLEXPN",
  // REQ-263 (Nick, 2026-11-13): level-aware lessons switched on once its Key terms were written.
  levelFlow: true,
  title: "Prep for the NCLEX-PN Exam",
  description:
    "The practical and vocational nurse licensure examination, built on the 2026 NCSBN test plan. Weighted as the exam weights it, and scoped as the license is scoped -- what the PN collects, reports and contributes, rather than what the RN decides.",
  trackType: "certification",
  subcategorySlug: "nclex-preparation",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.ncsbn.org/public-files/2026_PN_Test%20Plan-F.pdf",
  sourceVerifiedAt: VERIFIED_AT,
  requiresAcknowledgement: true,
  disclaimerKey: NURSING_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    ...NCSBN_PROVIDER,
    credentialSlug: "nclex-pn",
    credentialName: "NCLEX-PN Examination",
    credentialUrl: "https://www.ncsbn.org/exams/testplans.page",
    basis: "regulatory_licensure",
    examCode: "NCLEX-PN",
    examRevision: "2026 Test Plan",
    standardName: "NCLEX-PN Test Plan",
    standardRevision: "2026",
    status: "active",
    effectiveDate: "2026-04-01",
    retirementDate: "2029-03-31",
    officialObjectivesUrl:
      "https://www.ncsbn.org/public-files/2026_PN_Test%20Plan-F.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Completion of a state-approved practical or vocational nursing program. Measured against what a newly licensed PN/VN must do safely under the direction of an RN or provider.",
    questionFormat:
      "Computerized adaptive, variable length; includes clinical judgment items alongside multiple choice, multiple response and other formats",
    passingScorePolicy:
      "Pass/fail against a standard set by NCSBN rather than a percentage score; decided by the 95% confidence interval rule, the maximum-length rule, or the run-out-of-time rule",
  },
  units: [
    {
      title: "Coordinated Care",
      rangeLabel: "18-24% of the exam",
      weight: 21,
      gate: "Given a shift and a set of clients, act inside the PN scope: know what you may accept, what you must pass to the RN, and what you report rather than decide.",
      objectives: [
        "What the practical nurse license permits, and where it stops",
        "Accepting an assignment, and declining one that exceeds scope or competence",
        "Assignment and delegation as they apply to the PN, including delegation to assistive personnel",
        "Reporting to the registered nurse: what must be escalated rather than handled",
        "Establishing priorities among assigned clients",
        "Recognizing the client whose condition requires immediate RN or provider involvement",
        "Contributing to the plan of care rather than authoring it",
        "Continuity of care and handoff of assigned clients",
        "Admission, transfer and discharge procedures",
        "Advance directives, and the client's right to self-determination",
        "Acting as client advocate within the PN role",
        "Client rights, and educating clients and staff about them",
        "Informed consent: what the PN may and may not do in the process",
        "Confidentiality and information security, including social media disclosure",
        "Ethical practice and recognizing an ethical dilemma",
        "Legal rights and responsibilities, including refusal of treatment",
        "Mandatory reporting: abuse, neglect, communicable disease",
        "Documenting accurately, completely and in approved terminology",
        "Information technology and appropriate access to client records",
        "Receiving and verifying provider orders within scope",
        "Collaborating with the interdisciplinary team",
        "The referral process and the PN's part in it",
        "Resource management and cost-conscious care",
        "Performance and quality improvement participation",
        "Concepts of management and supervision as they apply to the PN",
        "Recognizing the limits of one's own competence and using resources",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Contribute to the six clinical judgment steps -- recognize and analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes -- within the PN role, reporting findings that need RN or provider judgment", // PNTP p10; MS 4.2
        "Use data from several credible sources -- the record, the client, the family, the team -- when making a clinical decision", // PNTP p11; MS 4.3
        "Assign care to assistive personnel or another LPN/VN where your state allows, giving clear directions on what to report and when, and checking the outcome", // PNTP p11; DEL
        "Know that a licensed nurse who delegates keeps accountability for the client and cannot delegate nursing judgment, and that state law decides whether an LPN/VN may delegate to assistive personnel", // DEL
        "Accept a delegated task only if it is within your scope and you are competent, and ask clarifying questions before you begin", // DEL
        "Monitor the work of assistive personnel and intervene or report when care is unsafe or incomplete", // PNTP p11; DEL
        "Provide information about advance directives, and know the difference between a living will, a named healthcare proxy and a POLST", // PNTP p11; FN 36.4
        "Know your part in the consent process: you may witness the signature and confirm consent was obtained, and you report when the client seems not to understand or is being pressured", // PNTP p11; FN 16.3
        "Know the ethical principles that guide practice -- autonomy, beneficence, nonmaleficence, justice, fidelity and veracity", // FN 16.2
        "Know that treating without consent can be battery, and that a breach of the duty of care that causes harm is the basis of a negligence claim", // FN 16.3
        "Protect privacy: log off after each use, keep screens from view, keep conversations private, and access only the minimum information the job requires", // FN 9.3
        "Organize and prioritize care by client need, using airway, breathing and circulation and Maslow's hierarchy to decide what comes first", // PNTP p11; MS 4.3
        "Give a clear handoff, using a structured tool such as SBAR -- situation, background, assessment, recommendation -- when reporting a concern", // MN 20.1
        "Rank the possible explanations for a client's cues by how likely and how serious each is, and take the most urgent to the RN or provider", // MS 4.2
        "Know that a sentinel event, such as a fall that causes death or permanent disability, is investigated by root cause analysis aimed at system causes, which is why prompt incident reports matter", // FN 15.3
        "Know that a nurse who knows consent was not properly obtained and does not speak up can be held liable", // FN 16.3
        "Give a transfer report built around what the receiving team needs, since every handoff can drop crucial information", // FN 8.2
        "Contribute to an organized admission, because the data gathered then shape the course of care and a stable admission can turn urgent", // FN 8.1
        "Name what makes a care transition safe -- clear communication, client and caregiver teaching, medication reconciliation, timely follow-up -- and how it prevents readmission", // POP 30.2
        "Move up the chain of command when a concern about an order is not resolved", // MS 5.4; FN 16.3
      ],
    },
    {
      title: "Safety and Infection Prevention and Control",
      rangeLabel: "10-16% of the exam",
      weight: 13,
      gate: "Given a client and an environment, apply the right precautions and use the least restrictive option that keeps the client safe.",
      objectives: [
        "Principles of infection prevention: hand hygiene, aseptic and sterile technique",
        "Standard precautions applied to every client",
        "Transmission-based precautions: airborne, droplet, contact",
        "Surgical asepsis and maintaining a sterile field",
        "Caring for the immunocompromised client",
        "Communicable disease reporting procedure",
        "Educating client and staff on infection prevention",
        "Correct client identification before care",
        "Client allergies: collecting the data and acting on it",
        "Accident, error and injury prevention",
        "Factors raising injury risk: age, developmental stage, mental status",
        "Deficits that impede safety: visual, hearing, sensory",
        "Seizure precautions",
        "Home safety, including fire and environmental hazards",
        "Ergonomic principles and safe client handling",
        "Safe use of equipment and removing faulty equipment from use",
        "Handling hazardous and infectious materials",
        "Least restrictive restraints and safety devices: choosing the least restrictive option",
        "Legal and facility requirements attached to restraint use",
        "Monitoring and evaluating the client in restraints",
        "Incident, event and variance reporting",
        "Acknowledging and documenting errors and near misses",
        "Emergency response plans and participation in drills",
        "Security plans: newborn security, controlled access, violence",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Break the chain of infection -- agent, reservoir, portal of exit, mode of transmission, portal of entry, susceptible host -- by knowing which action interrupts which link", // FN 10.1
        "Clean your hands at the right moments, use soap and water when hands are visibly soiled and in C. difficile or norovirus outbreaks, and never treat gloves as a substitute", // CDC-HH
        "Use the right precautions: gown and gloves on entry for contact, a mask on entry for droplet, and a fit-tested N95 with the door closed for airborne", // CDC-TBP
        "Apply enhanced barrier precautions for residents with MDROs, wounds or indwelling devices in long-term care, wearing gown and gloves for high-contact care", // CDC-EBP
        "Keep a sterile field sterile: sterile items stay above the waist and in view, and you never reach across the field", // FN 10.3
        "Use transfer devices -- gait or transfer belt, slide board, mechanical lift -- correctly, and know when a gait belt is contraindicated", // PNTP p12; CNS 9.3
        "Use the least restrictive restraint or seclusion for the shortest time, and document ongoing need", // PNTP p12; PMH 11.2
        "Identify and address unsafe conditions in health care and home settings, including fall hazards for older adults and medications such as opioids that raise fall risk", // PNTP p12; FN 41.4; FN 9.1
        "Know that workplace violence is a real occupational hazard and report incidents through the proper channels", // FN 9.2
        "Keep susceptible staff, including yourself if not immune, out of the rooms of clients with known or suspected measles, chickenpox or disseminated zoster when immune staff are available", // CDC-TBP
        "Use dedicated equipment for a client on contact precautions, or clean and disinfect shared items such as a blood pressure cuff before the next client", // CDC-TBP
        "Limit trips out of the room for an isolated client to those medically necessary, with a mask on the client for droplet or airborne precautions", // CDC-TBP
        "Know when contact precautions replace enhanced barrier precautions: uncontained diarrhea or drainage, outbreaks, public health direction, and C. difficile, norovirus or scabies", // CDC-EBP
        "Wear the right PPE as the best protection against chemical, drug and infectious exposure, and know the follow-up steps when an exposure happens", // MS 33.3
        "Screen clients for intimate partner violence and know that pregnancy raises the risk of physical abuse", // MN 9.2
        "Keep electronic health information confidential, accurate and available, and report a suspected security breach", // FN 9.3
      ],
    },
    {
      title: "Health Promotion and Maintenance",
      rangeLabel: "6-12% of the exam",
      weight: 9,
      gate: "Given a client at any life stage, collect the right data, recognize what is expected for that stage, and reinforce the teaching.",
      objectives: [
        "Data collection technique, and how it differs from assessment",
        "Collecting a health history and reporting the findings",
        "Choosing the right technique and equipment for the client's age",
        "Expected age-related changes across the lifespan",
        "Developmental stages and the transitions between them",
        "Care of the newborn, infant and toddler",
        "Care of the preschool, school-age and adolescent client",
        "Care of the adult client",
        "Care of the older adult client",
        "Antepartum care and data collection",
        "Care of the client in labor",
        "Postpartum care, including signs of hemorrhage and infection",
        "Newborn care and feeding",
        "Health promotion and disease prevention teaching",
        "Reinforcing teaching the RN has planned",
        "High-risk behaviors and teaching about them",
        "Lifestyle choices, including family planning and sexuality",
        "Self-care capacity and managing care in the home",
        "Community resources available to the client",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Compare a child's developmental milestones with what is expected for age, and report delays", // PNTP p13; FN 38.2
        "Know Erikson's stages from trust versus mistrust onward, and how an unmet stage can affect later behavior", // FN 38.2
        "Identify clients who need required or voluntary immunizations, and know that immunization is primary prevention while screening is secondary prevention", // PNTP p13; POP 2.5
        "Identify barriers to communication and to learning, and check learning with a return demonstration or the client's own explanation rather than a nod", // PNTP p13; FN 17.4
        "Assist with care of the antepartum client and know when blood pressure readings in pregnancy must be reported", // PNTP p13; MN 11.3
        "Assist with monitoring a client in labor, reporting the frequency, duration and strength of contractions and the fetal heart rate as directed", // PNTP p13; MN 18.1; MN 16.4
        "Monitor the recovery of a stable postpartum client: report a temperature above 100.4 F (38 C), and check the fundus, bladder and lochia", // PNTP p13; MN 20.1; MN 20.3
        "Know that a boggy, displaced fundus after birth often means a full bladder, and help the client empty it", // MN 20.3
        "Recognize postpartum hemorrhage as blood loss of 1,000 mL or more within 24 hours of birth, and report heavy bleeding at once", // MN 21.2
        "Reinforce newborn care teaching, including safe sleep, car seat use and the warning signs that need urgent care", // MN 24.3
        "Support early skin-to-skin contact for a stable newborn and the delayed first bath that protects temperature and blood sugar", // MN 24.1
        "Explain how the due date is estimated from the first day of the last menstrual period with Naegele's rule, or by ultrasound", // MN 11.1
        "Know the routine second-trimester checks, including gestational diabetes screening at 24 to 28 weeks and visits every 4 weeks", // MN 11.3
        "Know the five Apgar signs -- heart rate, breathing effort, reflex irritability, muscle tone, color -- scored at 1 and 5 minutes", // MN 22.1
        "Reinforce teaching in all three learning domains: knowledge, attitudes and feelings, and hands-on skills", // FN 17.2
        "Reinforce relief measures for morning sickness: small frequent snacks, fluids apart from meals, ginger and plain dry foods", // MN 10.3
        "Know that HPV and hepatitis B vaccines prevent some cancers, while mammograms, colonoscopy and cervical screening catch cancer early", // MS 31.2
        "Collect data on fall risk in older adults, linked to bone and muscle loss, dizziness, poor mobility, weakness and poor vision", // FN 41.3
      ],
    },
    {
      title: "Psychosocial Integrity",
      rangeLabel: "9-15% of the exam",
      weight: 12,
      gate: "Given a client in distress, respond therapeutically, and recognize when distress has become a safety problem to escalate.",
      objectives: [
        "Therapeutic communication technique, and what makes a response non-therapeutic",
        "Encouraging the client to express feelings",
        "Recognizing nonverbal cues to distress",
        "Abuse or neglect: recognizing it, reporting it, escalating it",
        "Risk factors for domestic, child and elder abuse",
        "Recognizing the potential for violence and using safety precautions",
        "Crisis intervention within the PN role",
        "Coping mechanisms and adaptation to role change",
        "Supporting the client with an altered body image",
        "Substance use disorder, dependency and withdrawal",
        "Recognizing signs of withdrawal or toxicity and reporting them",
        "Non-substance dependencies",
        "Mental health concepts and recognizing acute and chronic mental illness",
        "Impaired cognition: memory loss, altered judgment, poor hygiene",
        "Behavioral management technique",
        "Orienting the client to reality",
        "Sensory and perceptual alterations",
        "Grief, loss and anticipatory grieving",
        "End-of-life care concepts and comfort at end of life",
        "Supporting the family and caregiver",
        "Cultural awareness and incorporating cultural practice into care",
        "Religious and spiritual influences on health",
        "Support systems and involving them in care",
        "Stress management technique",
        "Maintaining a therapeutic environment",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Avoid blocks to therapeutic communication: false reassurance, changing the subject, judging, disagreeing or minimizing the client's concern", // PNTP p14; PMH 3.1
        "Collect data on the client's potential for violence to self or others, and report warning signs immediately", // PNTP p14; PMH 16.3
        "Know the risk factors a suicide lethality assessment looks for -- a detailed plan, access to means, past attempts -- and report any suicidal statement to the RN at once", // PMH 16.3
        "Identify the signs of substance misuse, substance use disorder, withdrawal and overdose, including alcohol overdose and the added risk with opioids or sedatives", // PNTP p14; PMH 19.2
        "Know that the CIWA-Ar scale is used to monitor alcohol withdrawal, and report rising scores", // PMH 19.2
        "Explore the reasons a client is not following the treatment plan, including beliefs, stigma and culture", // PNTP p14; PMH 3.2
        "Take part in client group sessions, knowing that groups offer belonging, shared learning and the chance to give and receive support", // PNTP p14; PMH 5.2
        "Take part in reminiscence therapy, validation therapy and reality orientation for cognitively impaired clients", // PNTP p14; FN 29.1; PMH 24.2
        "Assist in the care of a cognitively impaired client: speak calmly with simple questions, and avoid reorienting when it only causes distress", // PNTP p14; PMH 14.3
        "Recognize that delirium starts suddenly and fluctuates and may signal a serious illness, and report a sudden change in mental status", // PMH 14.2
        "Help de-escalate an angry or agitated client, and stay with or near the client after an emergency medication to monitor its effect", // PNTP p14; PMH 11.2
        "Recognize a manic episode -- high energy, grandiosity, little sleep, racing thoughts -- in bipolar disorder", // PMH 16.4
        "Recognize hallucinations, delusions and disorganized speech as signs of psychosis", // PMH 15.1
        "Support a grieving client in expressing grief, including anger, and recognize the physical symptoms grief can cause", // FN 36.1
        "Recognize the signs that death is near -- cool, mottled skin, irregular or noisy breathing with pauses, less eating and drinking -- and remember the dying client may still hear and feel touch", // PNTP p14; FN 36.2
        "Give trauma-informed care that builds safety and trust and avoids re-traumatizing the client", // PMH 6.5
        "Recognize generalized anxiety disorder, persistent excessive worry that disrupts daily life, and its physical signs such as restlessness, fatigue and poor sleep", // PMH 17.2
        "Support a client with borderline personality disorder through clear, consistent boundaries", // PMH 18.3
        "Recognize the very low body weight of anorexia nervosa, with an adult BMI under 18.5 the usual marker, and report it", // PMH 20.2
        "Recognize every form of abuse -- physical, emotional, verbal, sexual, financial -- and neglect, and report it", // CNS 20.3
        "Recognize that opioid use disorder can start with legitimate pain treatment", // PMH 19.4
        "Report signs of neuroleptic malignant syndrome, a rare but potentially fatal reaction to antipsychotics", // PHARM 13.2
      ],
    },
    {
      title: "Basic Care and Comfort",
      rangeLabel: "7-13% of the exam",
      weight: 10,
      gate: "Given a client who cannot fully care for themselves, provide the assistance the deficit calls for while keeping dignity intact.",
      objectives: [
        "Activities of daily living and assisting where the client cannot",
        "Maintaining dignity and privacy during personal care",
        "Personal hygiene, including oral and perineal care",
        "Assistive devices and prostheses",
        "Compensating for a physical or sensory impairment",
        "Mobility and immobility, and the complications of immobility",
        "Positioning, range of motion and promoting circulation",
        "Safe transfer and ambulation",
        "Skin care and maintaining tissue integrity",
        "Nutrition and oral hydration",
        "Assisting with feeding, and tube feeding within scope",
        "Monitoring and recording intake and output",
        "Bowel and bladder elimination",
        "Catheter care and ostomy care",
        "Performing irrigations within scope",
        "Rest and sleep patterns",
        "Collecting data about pain and reporting it",
        "Nonpharmacological comfort interventions",
        "Postmortem care",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Evaluate pain with a standardized rating scale suited to the client's cognitive and developmental level", // PNTP p15; FN 30.4
        "Use the PQRSTU questions to collect data about pain", // FN 30.4
        "Provide nonpharmacological pain relief such as imagery, massage, music and repositioning", // PNTP p15; FN 30.5
        "Promote sleep and rest with good sleep hygiene, including cutting caffeine and alcohol before bedtime", // PNTP p15; FN 28.4
        "Identify a stage 1 pressure injury as intact skin with nonblanchable redness, which may look darker or lighter on darkly pigmented skin, and report it", // MS 28.3
        "Prevent pressure injury by repositioning, floating heels and reducing friction and shear", // CNS 9.4
        "Care for an immobilized client, including a client in a cast, watching for skin injury from a tight cast", // PNTP p15; CNS 9.5
        "Provide postmortem care gently and with privacy, and prepare the body and room for the family", // PNTP p15; FN 36.4
        "Prevent sensory overload from noise, crowding, bright light and strong smells, and recognize irritability, agitation and anxiety as its signs", // FN 29.2
        "Serve the food texture the speech-language pathologist recommended for a client with dysphagia, to lower aspiration risk", // FN 21.3
        "Support a consistent carbohydrate diet for clients with diabetes and low-fat, low-sodium eating for heart disease", // FN 21.3
        "Prevent constipation by addressing inactivity, dehydration, low fiber intake and drugs such as opioids and diuretics", // FN 27.4; PHARM 14.3
        "Give oral care to a dependent client more often when NPO or mouth breathing, with the head of the bed raised to prevent aspiration", // CNS 7.3
        "Position the feet to prevent foot drop in a client on long bed rest", // CNS 9.4
        "Tell a venous leg ulcer -- medial lower leg, irregular, heavy drainage -- from an arterial wound, and report changes in either", // MS 28.5
      ],
    },
    {
      title: "Pharmacological Therapies",
      rangeLabel: "10-16% of the exam",
      weight: 13,
      gate: "Given an order and a client, give the medication safely within the PN scope -- or stop and report the reason you cannot.",
      objectives: [
        "The rights of medication administration, applied rather than recited",
        "Checking contraindications, allergies and interactions before giving",
        "Performing dosage calculations accurately",
        "Converting between units of measurement",
        "Administering medication by oral and topical routes",
        "Administering medication by intramuscular, subcutaneous and intradermal routes",
        "Routes and procedures that fall outside the PN scope in most jurisdictions",
        "Documenting medication administration",
        "Expected actions and therapeutic outcomes",
        "Side effects, adverse effects, contraindications and interactions distinguished",
        "Recognizing an allergic reaction and responding to it",
        "Reporting adverse effects to the registered nurse or provider",
        "Monitoring the client's response to a medication",
        "Pharmacological pain management and p.r.n. decisions within scope",
        "Evaluating and documenting the response to pain medication",
        "Controlled substances: handling, counting and documentation",
        "Safe storage and disposal of medication",
        "Maintaining an intravenous site and recognizing infiltration or phlebitis",
        "Reinforcing medication teaching with the client",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Keep the client's medication list current at every transition, including herbal and over-the-counter products, because medication reconciliation is a core part of safe care transitions", // PNTP p16; POP 30.2
        "Calculate and monitor IV flow rates, and perform the calculations medication administration requires", // PNTP p16; CNS 11.2
        "Instil eye drops into the lower conjunctival sac, not onto the eye, press on the inner canthus, and wait between drops so the first is not washed out", // CNS 14.1
        "Give ear drops at room temperature to avoid dizziness, vertigo and nausea", // CNS 14.2
        "Clean a nebulizer after each use and disinfect it at least once a week, and know a nebulizer helps clients who have difficulty coordinating their breathing with an inhaler", // CNS 14.4
        "Choose an intramuscular site by age: deltoid, vastus lateralis or ventrogluteal for adults, and vastus lateralis for infants under 18 months", // CNS 12.6
        "Give subcutaneous injections in small volumes, usually 1 mL or less, well away from the umbilicus when using the abdomen", // CNS 12.5
        "Give sublingual medication under the tongue without water, chewing or swallowing", // CNS 12.1
        "Give secondary (piggyback) IV medications only where state scope and facility policy allow, and stop the infusion and report a site that is painful, red, swollen or leaking", // PNTP p16; CNS 13.3
        "Monitor a client with a PCA pump, epidural or nerve catheter for the opioid effects that matter most -- sedation, respiratory depression, nausea, constipation, urinary retention -- and report respiratory depression at once", // PNTP p16; PHARM 14.3
        "Monitor a client receiving a blood transfusion where state scope and facility policy allow, and if a reaction is suspected stop it immediately and notify the RN and provider", // PNTP p16; CNS 13.4
        "Teach a client on warfarin to keep vitamin K intake consistent, and know a higher INR means a greater bleeding risk", // PHARM 20.2
        "Watch for hypoglycemia when insulin peaks, and treat a conscious client with fast carbohydrate such as orange juice or hard candy", // PHARM 28.2
        "Take an apical pulse before digoxin and withhold and report it below 60 beats per minute, and report signs of toxicity -- nausea, vomiting, visual changes, dysrhythmias", // PHARM 19.6; PHARM 17.6
        "Report signs of lithium toxicity and know that diuretics, NSAIDs and ACE inhibitors can raise lithium levels", // PHARM 13.3
        "Report extrapyramidal symptoms from antipsychotics -- tremor, rigidity, dystonia, restlessness, tardive dyskinesia", // PHARM 13.2
        "Know that epinephrine is the first drug in anaphylaxis, and ask an alert client to report any change in breathing afterwards", // PHARM 22.3
        "Reinforce that corticosteroids must not be stopped suddenly because of the risk of adrenal insufficiency, and report signs of infection", // PHARM 25.2
        "Know albuterol is the short-acting rescue inhaler and salmeterol is for maintenance only", // PHARM 25.1
        "Know vancomycin is cleared by the kidneys, so renal function and drug levels are monitored", // PHARM 7.2
        "Know phenytoin levels are drawn as a trough just before the next dose, and that long-term use can cause gum overgrowth", // PHARM 12.1
        "Report a dry cough or facial swelling in a client on an ACE inhibitor, since angioedema is a serious adverse effect", // PHARM 18.2
      ],
    },
    {
      title: "Reduction of Risk Potential",
      rangeLabel: "9-15% of the exam",
      weight: 12,
      gate: "Given a client before or after a procedure, collect the data that would show a complication developing, and report it in time.",
      objectives: [
        "Collecting vital signs and recognizing changes and trends",
        "Reporting an abnormal vital sign rather than acting alone on it",
        "Comparing laboratory values against normal values",
        "Monitoring laboratory results and reporting them",
        "Collecting blood and non-blood specimens",
        "Preparing the client for a diagnostic test",
        "Caring for the client during and after diagnostic testing",
        "Testing within the PN scope, including point-of-care testing",
        "Potential for aspiration and preventing it",
        "Potential for skin breakdown and preventing it",
        "Risk of insufficient vascular perfusion",
        "Comparing current data against the client's baseline",
        "Monitoring output for change from baseline",
        "Focused data collection on a body system",
        "Recognizing abnormal neurologic status",
        "Recognizing peripheral edema and abnormal pulses",
        "Signs of hypoglycemia and hyperglycemia",
        "Factors that delay wound healing",
        "Risk assessment for falls and mobility",
        "Therapeutic procedures and the PN's role in them",
        "Care before and after surgery, and reinforcing preoperative teaching",
        "Recovery from anesthesia and what to watch for",
        "Maintaining tubes and drains, including patency",
        "Devices that promote venous return",
        "Preventing neurologic complications of immobility",
        "Evaluating and reporting the client's response to a procedure",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Check for urinary retention by bladder scan, ultrasound or palpation, and know that a post-void residual under 50 mL is expected, rising to about 100 mL in older adults", // PNTP p17; FN 26.4
        "Insert, maintain and remove a urinary catheter, and know that catheter-associated urinary tract infection is common, often preventable and raises length of stay and risk of death", // PNTP p17; CNS 19.4
        "Perform venipuncture: a tourniquet tight enough to fill the veins but released as soon as blood flows, and specimens labeled at the bedside", // PNTP p17; CNS 10.4
        "Read a monitor strip at a basic level: count the QRS complexes in 6 seconds and multiply by ten for the rate, and report premature ventricular beats and any run of them", // PNTP p18; MS 12.2
        "Maintain a central venous catheter where state scope and facility policy allow, knowing its position is confirmed by chest x-ray, which also rules out a pneumothorax before use", // PNTP p17; MS 19.3
        "Assist with care before surgery, including confirming that consent is signed before any sedating medication", // PNTP p17; MS 25.2
        "Watch the postoperative client for atelectasis, DVT, ileus and urinary retention, and encourage incentive spirometry", // MS 27.3
        "Know the normal ABG ranges -- pH 7.35 to 7.45, PaCO2 35 to 45 mm Hg -- and report values outside them", // FN 20.2
        "Identify signs and symptoms of a potential prenatal complication and report them", // PNTP p17; MN 12.2
        "Watch the cues of fluid imbalance -- weight change, urine output, skin turgor -- with daily weights and intake and output", // FN 20.3
        "Calculate pulse pressure and report a narrowed or widened value", // CNS 15.7
        "Avoid false readings: a blood pressure cuff too large reads low and too small reads high, and a recent hot or cold drink or smoking skews an oral temperature", // FN 7.2
        "Know that benign prostatic hyperplasia is common in older men and can cause urinary retention, UTI and kidney stones", // MS 20.4
        "Report signs of postoperative DVT or pulmonary embolism, which immobility and surgery make more likely", // MS 27.3
      ],
    },
    {
      title: "Physiological Adaptation",
      rangeLabel: "7-13% of the exam",
      weight: 10,
      gate: "Given a client whose condition is changing, connect basic pathophysiology to what you are seeing and escalate at the right moment.",
      objectives: [
        "Basic pathophysiology: injury and repair, immunity, cellular structure",
        "Connecting a chronic condition to the findings it produces",
        "Alterations in body systems and the care they require",
        "Fluid and electrolyte imbalance: recognizing and reporting it",
        "Caring for the client with a fluid or electrolyte imbalance",
        "Monitoring the client with impaired oxygenation",
        "Oxygen therapy and airway care within scope",
        "Performing suctioning",
        "Caring for the client with a tracheostomy",
        "Wound care and dressing changes",
        "Monitoring wounds for signs of infection",
        "Managing drainage devices",
        "Ostomy care and reinforcing client teaching",
        "Postoperative care and recognizing complications",
        "Infectious disease: signs, symptoms and incubation periods",
        "Caring for the client receiving radiation or chemotherapy",
        "Maintaining the client's optimal temperature",
        "Complications of pregnancy and delivery to recognize and report",
        "Medical emergencies and the PN's immediate response",
        "Identifying client data that must be reported immediately",
        "Unexpected response to therapy, and recognizing complications early",
        "Reporting a change in condition to the registered nurse or provider",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Care for a client on dialysis: know that an arteriovenous fistula for hemodialysis takes months to mature, so a temporary catheter is often used first, and that peritoneal dialysis leaves dialysate in the abdomen for hours", // PNTP p18; MS 20.7
        "Recognize high potassium -- above 5.1 mEq/L -- by cramping, diarrhea and peaked T waves, and report it as a risk for dysrhythmia", // FN 20.1
        "Recognize low sodium by headache, confusion, nausea and seizures", // FN 20.1
        "Recognize and report signs of rising intracranial pressure: headache, vomiting, falling level of consciousness, and Cushing's triad", // MS 17.1
        "Recognize heart failure signs -- edema, weight gain, orthopnea, crackles -- and report respiratory distress at once", // MS 12.3
        "Recognize the signs of fluid volume overload during IV therapy and stop and report", // CNS 13.3
        "Report a fever, sore throat or mouth ulcers in a client with neutropenia, since these may be the only signs of infection", // MS 16.5
        "Perform neurovascular checks on a fractured limb and report signs of compartment syndrome or fat embolism", // MS 13.3
        "Tell DKA from HHS: DKA is acute with low mortality, while HHS develops over weeks with a much higher mortality rate", // MS 21.2
        "Recognize thyroid storm as an emergency and hypothyroidism by weight gain, cold extremities, constipation and slowed thinking", // MS 21.3
        "Recognize appendicitis by right lower quadrant or periumbilical pain, and report it because perforation can cause peritonitis and sepsis", // MS 19.5
        "Recognize anaphylaxis -- flushing, hives, swelling, wheeze, low blood pressure -- after foods, stings, latex or drugs, and call for help at once", // MS 24.7
        "Prioritize airway, breathing and circulation in a burn, and watch for infection, hypothermia and sepsis", // MS 14.2
        "Recognize meningococcal meningitis -- stiff neck, fever, altered mental status -- as a medical emergency", // HP 16.13
        "Recognize intermittent claudication, leg pain on walking, as a sign of peripheral arterial disease", // MS 12.7
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// A note on unit weights for the tracks below.
//
// On the NCLEX tracks above, `weight` is a vendor fact: NCSBN publishes those
// percentages and the exam is built to them. Nothing below has an equivalent.
// Federal regulation sets a 75-hour floor for nurse aide training without
// apportioning it, and the AACN Essentials define domains without weighting
// them. So the weights on these four tracks are our own judgment about study
// emphasis, and must not be presented to a learner as an exam blueprint.
// REQ-220 (FAIL-1136): each credential says so (domainWeights:
// "study_emphasis"), the seed leaves exam_domains unweighted, and readiness,
// the progress screen and the prompts then treat the course as unweighted.
// ---------------------------------------------------------------------------

const CMS_PROVIDER = {
  providerSlug: "cms",
  providerName: "Centers for Medicare & Medicaid Services",
  providerUrl: "https://www.cms.gov/",
  subcategorySlug: "nursing-licensure",
  credentialType: "certification",
} as const;

const AACN_PROVIDER = {
  providerSlug: "aacn-nursing",
  providerName: "American Association of Colleges of Nursing",
  providerUrl: "https://www.aacnnursing.org/",
  subcategorySlug: "nursing-degrees",
  credentialType: "degree",
} as const;

// ---------------------------------------------------------------------------
// Certified Nursing Assistant.
//
// The federal floor is 42 CFR 483.152: at least 75 clock hours, of which at
// least 16 must be supervised practical training, and at least 16 hours must
// cover the paragraph (b)(1) topics BEFORE any contact with a resident. The
// seven content areas below are the ones the regulation enumerates.
//
// States may and do require more than the federal floor, and the competency
// evaluation itself is state-administered, which is why this credential is
// recorded as regulatory licensure against a standard rather than an exam.
// ---------------------------------------------------------------------------
export const CNA_TRACK: SeedTrack = {
  code: "CNA",
  // REQ-258 (Nick, 2026-11-12): level-aware lessons switched on once its Key terms were written.
  levelFlow: true,
  title: "Certified Nursing Assistant Coach",
  description:
    "Nurse aide training built on the federal requirements at 42 CFR 483.152 -- the sixteen hours that must come before you ever touch a resident, then basic nursing and personal care skills, cognition, restorative services and residents' rights.",
  trackType: "certification",
  subcategorySlug: "nursing-licensure",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.ecfr.gov/current/title-42/section-483.152",
  sourceVerifiedAt: VERIFIED_AT,
  requiresAcknowledgement: true,
  disclaimerKey: NURSING_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    domainWeights: "study_emphasis", // REQ-220: see the note on unit weights above
    ...CMS_PROVIDER,
    credentialSlug: "certified-nursing-assistant",
    credentialName: "Certified Nursing Assistant (Nurse Aide)",
    credentialUrl: "https://www.ecfr.gov/current/title-42/section-483.152",
    basis: "regulatory_licensure",
    standardName: "42 CFR 483.152 -- Requirements for approval of a nurse aide training and competency evaluation program",
    standardRevision: "Current as of 2026-09-18",
    status: "active",
    officialObjectivesUrl: "https://www.ecfr.gov/current/title-42/section-483.152",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "No prior healthcare experience assumed. Certification requires completing a state-approved program and passing a state competency evaluation; your state may require more than the 75-hour federal minimum.",
    questionFormat:
      "State-administered competency evaluation, typically a written or oral examination plus a skills demonstration",
    passingScorePolicy:
      "Set by each state's nurse aide registry, not federally; both the knowledge and skills portions must be passed",
  },
  units: [
    {
      title: "Before resident contact",
      rangeLabel: "At least 16 hours, federally required first",
      weight: 18,
      // REQ-220 (FAIL-1141): the lesson writer and fact-checker get this
      // value, so a lesson on "the Heimlich maneuver" teaches the same
      // sequence as the CNA choking lab (seed/labs/nursing-cna.ts), not the
      // older abdominal-thrusts-only rule. Value as recorded in
      // seed/labs/ems-sources.ts (AHA_2025_ADULT_BLS, read on cpr.heart.org).
      sources: [
        ...CNA_UNIT_SOURCES["Before resident contact"],
        {
          title: "AHA 2025 Guidelines for CPR and ECC, Part 7: Adult Basic Life Support (Circulation 2025;152(suppl 2):S448-S478)",
          url: "https://doi.org/10.1161/CIR.0000000000001369",
          kind: "clinical_guideline",
          // REQ-235 (G5 follow-up): re-read 2026-11-11 on AHA's guideline
          // page (cpr.heart.org, Part 7, sections 10.1-10.2): unchanged; the
          // unresponsive-victim steps added.
          checkedAt: "2026-11-11",
          keyValues: [
            "severe foreign-body airway obstruction in a responsive adult: repeated cycles of 5 back blows, then 5 abdominal thrusts, until the object comes out or the person becomes unresponsive",
            "if the adult becomes unresponsive: start CPR beginning with chest compressions and activate the emergency response system; remove a visible object when opening the airway for breaths; no blind finger sweeps",
          ],
        },
      ],
      gate: "Demonstrate the five things federal law says you must know before you are allowed near a resident at all.",
      objectives: [
        "Why this block exists: federal law bars resident contact until it is complete",
        "Communication and interpersonal skills with residents",
        "Communicating with families and with the care team",
        "Infection control: hand hygiene as the single highest-value habit",
        "Standard precautions and personal protective equipment",
        "Safety and emergency procedures",
        "The Heimlich maneuver, named explicitly in the regulation",
        "Recognizing an emergency and summoning help correctly",
        "Promoting residents' independence rather than doing for them",
        "Respecting residents' rights in everyday interaction",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Clean your hands at each of the moments that matter: before touching a resident, before a clean or aseptic task, when moving from a soiled body site to a clean one, after touching the resident or their surroundings, after contact with body fluids, and right after taking gloves off", // CDC-HH
        "Choose alcohol hand rub as the default, and switch to soap and water when hands are visibly soiled, after using the restroom, before eating, and during C. difficile or norovirus outbreaks", // CDC-HH; CNS 6.2
        "Treat gloves as an addition to hand hygiene, never a substitute: clean hands before putting gloves on and after taking them off, and change gloves between residents, when they tear or are soiled, and before leaving the room", // CDC-HH
        "Name the parts of standard precautions that apply to every resident: hand hygiene, PPE when exposure is expected, cough etiquette, cleaning shared equipment, careful handling of linen, and safe handling of sharps", // CDC-SP
        "Follow the sign on the door: gown and gloves for contact precautions, a mask on entry for droplet precautions, and a fit-tested N95 respirator with the door kept closed for airborne precautions", // CDC-TBP
        "Clean and disinfect shared equipment such as a blood pressure cuff before it is used on another resident, and use dedicated equipment for a resident on contact precautions", // CDC-TBP; CDC-SP
        "Apply enhanced barrier precautions in a nursing home: wear gown and gloves for high-contact care such as bathing, dressing, transfers, toileting, linen changes and device or wound care for residents with an MDRO, a wound or an indwelling device", // CDC-EBP
        "Tell enhanced barrier precautions from contact precautions: the resident is not confined to the room and can join group activities, and gown and gloves are worn for high-contact care rather than on every entry", // CDC-EBP
        "Know that nursing home staff must start CPR and other basic life support for a resident in need until emergency services take over, unless the resident's physician orders or advance directive say otherwise", // CFR 483.24
        "Support respiratory hygiene and cough etiquette, and help a resident on droplet or airborne precautions wear a mask when leaving the room for a medically necessary trip", // CDC-SP; CDC-TBP
      ],
    },
    {
      title: "Basic nursing skills",
      sources: CNA_UNIT_SOURCES["Basic nursing skills"],
      rangeLabel: "42 CFR 483.152(b)(2)",
      weight: 18,
      gate: "Take an accurate set of measurements, notice when something has changed, and report it to the nurse without editorializing.",
      objectives: [
        "Taking and recording temperature, pulse, respiration and blood pressure",
        "Recognizing a measurement that falls outside the expected range",
        "Measuring and recording height and weight",
        "Caring for the resident's environment: bed, unit, call light within reach",
        "Bed making, occupied and unoccupied",
        "Recognizing abnormal changes in body functioning",
        "Reporting changes to the nurse: what, when and in what words",
        "Observation versus interpretation, and why the aide reports the first",
        "Caring for residents when death is imminent",
        "Supporting the family of a dying resident",
        "Documenting care accurately and within scope",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Avoid a false oral temperature: wait if the resident has just had a hot or cold drink, chewed gum or smoked, and report a reading that does not fit how the resident looks", // FN 7.2
        "Choose a blood pressure cuff that fits: one that is too large reads falsely low and one that is too small reads falsely high, and the bladder should sit over the brachial artery", // FN 7.2
        "Measure and record intake and output accurately, and tell the nurse when a resident drinks or passes much less than usual", // FN 26.4; CNS 19.2
        "Recognize the changes that can signal death is near -- cool hands and feet, mottled or pale skin, irregular or noisy breathing with pauses, less eating and drinking -- and report them to the nurse", // FN 36.2
        "Keep talking to and touching a dying resident gently, because a person near death may still hear and feel even when they cannot respond", // FN 36.2
        "Help the nurse with care of the body after death, as the nurse and facility direct: handle the body gently, preserve privacy, replace soiled linen, clean soiled areas and tidy the room so the family can say goodbye", // FN 36.4
        "Respect the resident's and family's cultural and religious wishes about care at and after death, and pass any request you cannot meet to the nurse", // FN 36.4
        "Report pain a resident shows or describes, because the facility must manage pain in line with professional standards, the care plan and the resident's goals", // CFR 483.25
      ],
    },
    {
      title: "Personal care skills",
      sources: CNA_UNIT_SOURCES["Personal care skills"],
      rangeLabel: "42 CFR 483.152(b)(3)",
      weight: 20,
      gate: "Provide personal care that is clean, safe and unhurried, and that leaves the resident's dignity intact.",
      objectives: [
        "Bathing: bed bath, shower and tub, and water temperature safety",
        "Grooming, including mouth care and denture care",
        "Hair and nail care within scope",
        "Shaving safely",
        "Dressing, including a resident with a weak or affected side",
        "Toileting, bedpan and urinal use",
        "Incontinence care and protecting skin",
        "Assisting with eating and hydration",
        "Proper feeding techniques and reducing aspiration risk",
        "Recognizing and reporting poor intake",
        "Skin care and recognizing early pressure injury",
        "Transfers, positioning and turning",
        "Using a gait belt and a mechanical lift safely",
        "Protecting the resident's privacy throughout personal care",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Keep the resident covered during a bath, exposing only the area being washed, with the door or curtain closed", // FN 25.3
        "Give perineal care regularly and after incontinence, because the warm, moist perineal area breeds bacteria that cause urinary infection, odor and skin breakdown", // CNS 7.1
        "Give mouth care to a resident who cannot do it alone, more often for a resident who takes nothing by mouth or breathes through the mouth, and raise the head of the bed to lower the risk of aspiration", // CNS 7.1; CNS 7.3
        "Handle dentures as the resident's personal property: clean them daily with a denture brush and store them in a labeled, covered cup when they are not being worn", // CNS 7.1; CNS 7.3
        "Keep nails clean and trimmed with clean tools, which prevents infection and scratching injuries, and follow facility policy on which residents' nails you may trim", // CNS 7.1
        "Use a gait belt for an unsteady resident unless it is contraindicated, for example after recent chest, back or abdominal surgery, with a gastrostomy (G) tube, hernia or abdominal aneurysm, or severe heart or breathing problems", // CNS 9.3
        "Use a mechanical lift only as trained: lock the wheels, use the correct sling, and work with a second caregiver as most facilities and manufacturers require", // CNS 9.3
        "Reposition a bed-bound resident to relieve pressure, using pillows and wedges for alignment, floating the heels, and lifting rather than dragging to avoid friction and shear", // CNS 9.4
        "Know that pressure injury can start within hours in a resident who cannot move, so turning on schedule is prevention, not comfort alone", // CNS 9.4; CFR 483.25
        "Help a resident with swallowing difficulty eat safely by serving the texture the care team ordered, and report any new trouble swallowing to the nurse", // FN 21.3; FN 23.3
      ],
    },
    {
      title: "Mental health and social service needs",
      sources: CNA_UNIT_SOURCES["Mental health and social service needs"],
      rangeLabel: "42 CFR 483.152(b)(4)",
      weight: 13,
      gate: "Respond to a resident's behavior by changing your own approach first, rather than managing the resident.",
      objectives: [
        "Modifying your own behavior in response to a resident's behavior",
        "Developmental tasks associated with the aging process",
        "Responding to behavior without escalating it",
        "Allowing residents to make their own choices",
        "Behavior that maintains and enhances the resident's dignity",
        "Using the resident's family as a source of emotional support",
        "Recognizing depression and withdrawal, and reporting it",
        "Cultural and religious practices that shape daily care",
        "Sexuality and the older adult resident",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Know that depression in older adults is common, often preventable, and easily mistaken for normal aging, especially after a loss of function or independence, and report the changes you see", // PMH 24.2
        "Support a resident's right to choose their own schedule, including when they sleep and wake, and the activities they take part in", // CFR 483.10
        "Encourage residents to join activities that match their interests, alone or in groups, because activities support physical, mental and social wellbeing", // CFR 483.24
        "Give trauma-informed care: learn and avoid what may trigger distress in a resident who has survived trauma, and respect their cultural background and preferences", // CFR 483.25
        "Support reminiscence by inviting a resident to talk about their life story, which can help older adults come to terms with change", // PMH 24.2
        "Support each resident's right to interact with the community and take part in social, religious and community activities inside and outside the facility", // CFR 483.10
      ],
    },
    {
      title: "Care of cognitively impaired residents",
      sources: CNA_UNIT_SOURCES["Care of cognitively impaired residents"],
      rangeLabel: "42 CFR 483.152(b)(5)",
      weight: 13,
      gate: "Meet a resident with dementia where they are: reduce the demand, not the person.",
      objectives: [
        "Needs and behaviors of residents with dementia, Alzheimer's and other causes",
        "Communicating with a cognitively impaired resident",
        "Understanding behavior as communication rather than defiance",
        "Appropriate responses to behavior, including agitation and resistance",
        "Methods of reducing the effects of cognitive impairment",
        "Consistent routine, orientation cues and a calm environment",
        "Wandering and exit-seeking: keeping a resident safe without restraint",
        "Sundowning and adjusting the approach late in the day",
        "Supporting the family of a resident with dementia",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Tell delirium from dementia: delirium starts suddenly, over hours to days, comes and goes, and may signal a dangerous illness, so a sudden change in confusion must be reported at once", // PMH 14.2; PMH 24.4
        "Speak to a resident with dementia calmly, using simple questions, and keep the daily routine predictable", // PMH 14.3
        "Go along with a confused resident's sense of time and place when reorienting them would only cause distress", // PMH 14.3
        "Watch for late-afternoon and evening confusion and agitation (sundowning), and help by keeping the resident active and exposed to daylight during the day", // FN 41.3
        "Recognize that dementia can bring agitation, anxiety, withdrawal and changes in behavior and language, and report new or worsening changes to the nurse", // PMH 14.3
      ],
    },
    {
      title: "Basic restorative services",
      sources: CNA_UNIT_SOURCES["Basic restorative services"],
      rangeLabel: "42 CFR 483.152(b)(6)",
      weight: 10,
      gate: "Help a resident keep or regain function, matching the help to what they can still do for themselves.",
      objectives: [
        "Teaching self-care according to the resident's own ability",
        "Assistive devices for transferring, ambulation, eating and dressing",
        "Maintaining range of motion, active and passive",
        "Proper turning and positioning in bed and in a chair",
        "Bowel and bladder training",
        "Care and use of prosthetic and orthotic devices",
        "Ambulation with a walker, cane or crutches",
        "Recognizing when a device fits poorly or is unsafe",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Know the goal set by federal rules: a resident's ability to bathe, dress, groom, move, use the toilet, eat and communicate should not decline unless the decline could not be avoided", // CFR 483.24
        "Prevent loss of range of motion in residents who have full movement, and help residents with limited movement keep or regain it", // CFR 483.25
        "Help a continent resident stay continent with timely help to the toilet, and support a resident who is incontinent to regain as much control as possible", // CFR 483.25
        "Position the feet to prevent foot drop in a resident who lies in bed for long periods, because gravity pulls the feet into a pointed position that can damage the muscles", // CNS 9.4
        "Make sure a resident's glasses, hearing aid and other assistive devices are clean, working and in use", // CFR 483.25; FN 25.3
        "Help a resident wear and use a prosthesis as the care plan directs", // CFR 483.25
        "Know that bed rails need alternatives tried first and an entrapment check before use, and never add or raise a rail on your own", // CFR 483.25
        "Help a resident who cannot manage daily care alone to keep good nutrition, grooming and personal and oral hygiene", // CFR 483.24
      ],
    },
    {
      title: "Residents' rights",
      sources: CNA_UNIT_SOURCES["Residents' rights"],
      rangeLabel: "42 CFR 483.152(b)(7)",
      weight: 8,
      gate: "Name what a resident is entitled to, and what you must do the moment you suspect it has been violated.",
      objectives: [
        "Providing privacy and maintaining confidentiality",
        "Supporting each resident's right to make personal choices",
        "Assisting in resolving grievances and disputes",
        "Helping residents take part in resident and family groups and activities",
        "Care and security of residents' personal possessions",
        "Freedom from abuse, mistreatment and neglect",
        "Recognizing abuse and neglect, including neglect by omission",
        "Reporting a suspected violation to the right facility staff, promptly",
        "Avoiding the need for restraints in line with current professional standards",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Never use a physical or chemical restraint for discipline or staff convenience; a restraint may be used only to treat a medical symptom, the least restrictive way, for the shortest time", // CFR 483.12; CFR 483.10
        "Report suspected abuse, neglect, exploitation or theft of a resident's property at once: federal rules set a 2-hour limit when there is abuse or serious injury and 24 hours otherwise", // CFR 483.12
        "Know that a finding of abuse, neglect or theft on the state nurse aide registry bars a person from working in a nursing home", // CFR 483.12
        "Protect privacy in personal care, visits, phone calls and mail; deliver mail promptly and unopened", // CFR 483.10
        "Respect a resident's right to keep and use personal belongings, including clothing and furnishings, as space and safety allow", // CFR 483.10
        "Support a resident's right to receive visitors of their choosing at times of their choosing, and to refuse visitors", // CFR 483.10
        "Support a resident's right to refuse treatment, and pass the refusal to the nurse rather than pressuring the resident", // CFR 483.10
        "Help a resident raise a complaint without fear of reprisal: residents may complain orally, in writing or anonymously, and the facility must try to resolve it promptly", // CFR 483.10
        "Know that a resident must get written notice and a reason before a room or roommate change, and has the right to keep secure and confidential records", // CFR 483.10
        "Know that federal rules require facilities to prevent retaliation against staff who report a reasonable suspicion of a crime against a resident", // CFR 483.12
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Practical / vocational nursing program.
//
// Distinct from the NCLEX-PN track above: that one prepares for the
// examination, this one is the program that precedes it. The content
// authority is the same NCSBN plan (it defines what entry-level PN practice
// is) plus the scope of practice each state's nurse practice act sets.
// ---------------------------------------------------------------------------
export const LPN_TRACK: SeedTrack = {
  code: "LPNVN",
  title: "Practical Nursing (LPN/LVN) Coach",
  description:
    "The practical nursing program from the beginning: foundations, the skills you are licensed to perform, the medical-surgical body of knowledge, and the scope question that sits under all of it -- what the PN does, and what the PN reports.",
  trackType: "certification",
  subcategorySlug: "nursing-licensure",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.ncsbn.org/public-files/2026_PN_Test%20Plan-F.pdf",
  sourceVerifiedAt: VERIFIED_AT,
  requiresAcknowledgement: true,
  disclaimerKey: NURSING_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    domainWeights: "study_emphasis", // REQ-220: see the note on unit weights above
    ...NCSBN_PROVIDER,
    subcategorySlug: "nursing-licensure",
    credentialSlug: "practical-nurse-licence",
    credentialName: "Licensed Practical / Vocational Nurse",
    credentialUrl: "https://www.ncsbn.org/nursing-regulation/licensure.page",
    basis: "regulatory_licensure",
    standardName: "State-approved practical nursing program and nurse practice act, with NCLEX-PN as the licensure examination",
    standardRevision: "2026",
    status: "active",
    officialObjectivesUrl: "https://www.ncsbn.org/public-files/2026_PN_Test%20Plan-F.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Entry point for the program itself; no prior nursing education assumed. Licensure requires graduating a state-approved program and passing NCLEX-PN.",
    questionFormat: "Program coursework and clinical evaluation; licensure is by NCLEX-PN",
    passingScorePolicy: "Set by the program and the state board of nursing",
  },
  units: [
    {
      title: "Foundations of practical nursing",
      weight: 16,
      gate: "Say what the practical nurse license authorizes, and route a situation correctly when it sits outside that line.",
      objectives: [
        "The practical nurse role within the healthcare team",
        "Scope of practice, and why it is set by your state's nurse practice act",
        "Data collection versus assessment, and why the distinction is legal, not semantic",
        "Working under the direction of an RN or provider",
        "Accepting, refusing and clarifying an assignment",
        "The nursing process and the PN's contribution to each stage",
        "Documentation standards and legal record-keeping",
        "Confidentiality and privacy obligations",
        "Professional boundaries with residents, patients and families",
        "Ethical principles applied to everyday practice",
        "Delegation to unlicensed assistive personnel",
        "Communication with the interdisciplinary team",
        "Therapeutic communication with patients and families",
        "Cultural humility in care delivery",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Know how delegation works for the PN: the delegating nurse stays accountable, nursing judgment cannot be delegated, and state law decides whether an LPN/VN may delegate to assistive personnel", // DEL
        "Tell assignment from delegation: assignment covers routine care within someone's scope or basic training, delegation hands over a specific task beyond their usual role after competence is checked", // DEL
        "Accept a delegated task only when it is within your scope and competence, ask clarifying questions, and report changes in the client's condition to the delegating nurse", // DEL
        "Contribute to each step of clinical judgment -- recognize and analyze cues, prioritize hypotheses, generate solutions, take action, evaluate outcomes -- and report what needs RN judgment", // PNTP p10; MS 4.2
        "Know the nurse's part in informed consent: witness the signature, confirm the signer is of age, competent and acting freely, and report when understanding is lacking", // FN 16.3
        "Name the ethical principles behind practice -- autonomy, beneficence, nonmaleficence, justice, fidelity and veracity", // FN 16.2
        "Know that negligence is a breach of the duty of care that harms the client, and that treating without consent may be battery", // FN 16.3
        "Protect health information under HIPAA: log off, guard the screen, keep conversations private and access only the minimum necessary", // FN 9.3
        "Avoid the common blocks to therapeutic communication, such as false reassurance, judging, disagreeing or changing the subject", // PMH 3.1
        "Use SBAR -- situation, background, assessment, recommendation -- when reporting a concern to the RN or provider", // MN 20.1
        "Advocate for clients and support their self-advocacy, moving up the chain of command when a concern about an order is not resolved", // FN 16.4; FN 16.3; PNTP p11
        "Know the advance directives -- living will, healthcare proxy, POLST -- and provide information about them", // FN 36.4; PNTP p11
      ],
    },
    {
      title: "Anatomy, physiology and basic pathophysiology",
      weight: 18,
      gate: "Connect a body system's normal function to the findings that appear when it fails.",
      objectives: [
        "Cell structure, tissue types and homeostasis",
        "Integumentary system: structure, function and common alterations",
        "Musculoskeletal system and common injuries and conditions",
        "Cardiovascular system: circulation, perfusion and common disease",
        "Respiratory system: ventilation, oxygenation and common disease",
        "Gastrointestinal system: digestion, absorption and elimination",
        "Renal and urinary systems, and fluid balance",
        "Endocrine system and the conditions that follow its disruption",
        "Nervous system: central, peripheral and autonomic",
        "Immune system, inflammation and the response to infection",
        "Reproductive systems across the lifespan",
        "Fluid, electrolyte and acid-base balance in plain terms",
        "How an acute illness differs from an exacerbation of a chronic one",
        "Medical terminology: roots, prefixes and suffixes",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Name the three layers of the skin -- epidermis, dermis and subcutaneous tissue -- and the skin's role as a barrier against heat, light, infection and injury", // FN 24.1
        "Explain gas exchange across the thin alveolar-capillary membrane, and how ventilation and perfusion together deliver oxygen", // FN 19.1
        "Explain cardiac output and stroke volume, and the three factors that set stroke volume: preload, contractility and afterload", // FN 19.2
        "Describe normal sinus rhythm: the impulse starts in the SA node, reaches the AV node in 0.12 seconds or less, at 60 to 100 beats per minute", // FN 19.2
        "Describe body fluid compartments -- about two-thirds intracellular and one-third extracellular -- and edema as the main sign of excess extracellular fluid", // FN 20.1
        "Explain the kidney's roles in removing urea, creatinine and uric acid and in producing erythropoietin for red blood cell production", // FN 26.2
        "Know the normal arterial pH range of 7.35 to 7.45, and that below it is acidosis and above it alkalosis", // FN 20.2
        "Distinguish the central from the peripheral nervous system and what each does", // FN 23.1
        "Tell acute inflammation, a helpful short-term response, from chronic inflammation, which can deplete the body over weeks or years", // MS 8.6
        "Distinguish innate immunity, the always-on first line of defense including skin and certain white cells, from adaptive immunity that targets a specific pathogen", // PHARM 6.1
        "Explain how osteoporosis develops when bone resorption outpaces remodeling, and why osteopenia comes first", // MS 13.1
        "Know the forms of dementia (major neurocognitive disorder) -- Alzheimer disease, Lewy body and vascular dementia", // MS 17.4
        "Distinguish type 1 from type 2 diabetes, with type 2 making up about 95 percent of cases and beginning with insulin resistance", // MS 21.2
      ],
    },
    {
      title: "Fundamental nursing skills",
      weight: 20,
      gate: "Perform the core skills safely, in order, and know the observation each one is meant to produce.",
      objectives: [
        "Hand hygiene, standard precautions and isolation technique",
        "Sterile technique and maintaining a sterile field",
        "Vital signs: taking them, and interpreting a change",
        "Height, weight and intake and output measurement",
        "Head-to-toe data collection",
        "Positioning, transferring and safe patient handling",
        "Range of motion and mobility assistance",
        "Personal hygiene and skin care",
        "Pressure injury prevention and staging awareness",
        "Wound care and dressing changes",
        "Specimen collection: urine, stool, sputum and blood",
        "Urinary catheter insertion and care",
        "Enteral feeding and tube care",
        "Ostomy care",
        "Oxygen delivery devices and airway care",
        "Suctioning technique",
        "Intravenous site monitoring and maintenance within scope",
        "Nutrition, diet types and assisting with meals",
        "Pain data collection and nonpharmacological comfort measures",
        "End-of-life and postmortem care",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Take an accurate oral temperature: wait after hot or cold drinks, gum or smoking", // FN 7.2
        "Choose the right blood pressure cuff: too large reads falsely low, too small reads falsely high", // FN 7.2
        "Calculate pulse pressure and report a narrowed or widened value", // CNS 15.7
        "Use PQRSTU to collect pain data and choose a pain scale to fit the client's level", // FN 30.4
        "Instil eye drops into the lower conjunctival sac, press on the inner canthus, and wait between drops so the first is not washed out", // CNS 14.1
        "Give ear drops at room temperature to avoid dizziness, vertigo and nausea", // CNS 14.2
        "Check for urinary retention with a bladder scan and know the expected post-void residual: under 50 mL, or up to about 100 mL in older adults", // CNS 19.4
        "Prevent catheter-associated urinary tract infection, which is common and often preventable", // CNS 19.4
        "Apply a tourniquet correctly for venipuncture, release it as soon as blood flows, and label specimens at the bedside", // CNS 10.4
        "Stage a pressure injury: stage 1 is intact skin with nonblanchable redness, which may look darker or lighter on darkly pigmented skin", // MS 28.3
        "Know that a wound covered in slough or eschar is unstageable until debrided", // MS 28.3
        "Use a gait belt correctly and know when it is contraindicated, and work with a second caregiver when using a mechanical lift", // CNS 9.3
        "Keep a sterile field sterile: items above the waist and in view, never reaching across", // FN 10.3
        "Use enhanced barrier precautions in long-term care for residents with MDROs, wounds or indwelling devices", // CDC-EBP
        "Prevent sensory overload -- noise, crowding, bright lights, strong smells -- and recognize irritability, agitation and anxiety as its signs", // FN 29.2
      ],
    },
    {
      title: "Pharmacology and medication administration",
      weight: 18,
      gate: "Give a medication safely: right checks, right calculation, right route, and a clear reason to stop if anything does not line up.",
      objectives: [
        "Drug classifications and how a class predicts an effect",
        "Generic and trade names, and why the generic is safer to learn",
        "Pharmacokinetics in practical terms: absorption to excretion",
        "The rights of medication administration",
        "Dosage calculation and unit conversion",
        "Calculating pediatric and weight-based doses",
        "Oral, topical and transdermal administration",
        "Intramuscular, subcutaneous and intradermal injection technique",
        "Site selection and rotation",
        "Insulin administration and sliding scale orders",
        "Routes outside the PN scope in most jurisdictions",
        "Controlled substances: handling, counting and documentation",
        "Recognizing side effects and adverse reactions",
        "Allergic and anaphylactic reactions",
        "Drug interactions, including food and herbal products",
        "High-alert medications and the extra checks they need",
        "Medication reconciliation and reinforcing medication teaching",
        "Documenting administration and refusal",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Know first-pass metabolism: the liver can reduce how much of an oral drug reaches the systemic circulation", // PHARM 2.2
        "Tell generic from brand names, and know biosimilars differ from generics because they are made from living organisms", // PHARM 1.2
        "Choose IM sites by age, and use the vastus lateralis for infants under 18 months", // CNS 12.6
        "Give subcutaneous injections in small volumes, usually 1 mL or less, well away from the umbilicus when using the abdomen", // CNS 12.5
        "Give sublingual and buccal medications correctly, without water, chewing or swallowing", // CNS 12.1
        "Measure pediatric doses with the smallest syringe that holds the dose, after a careful mg/kg calculation", // PHARM 1.4
        "Know insulin onset, peak and duration, and watch most closely for hypoglycemia at peak", // PHARM 28.2
        "Take an apical pulse before digoxin and withhold and report it below 60 beats per minute", // PHARM 17.6; PHARM 19.6
        "Teach a client on warfarin to keep vitamin K intake consistent, and know a higher INR means higher bleeding risk", // PHARM 20.2
        "Teach clients on corticosteroids not to stop them suddenly because of the risk of adrenal insufficiency", // PHARM 25.2
        "Know albuterol is a rescue bronchodilator and salmeterol is for maintenance only", // PHARM 25.1
        "Report lithium toxicity and know diuretics, NSAIDs and ACE inhibitors can raise lithium levels", // PHARM 13.3
        "Report a medication error honestly and promptly so harm can be prevented", // PHARM 3.2
        "Monitor a transfusion where state scope and facility policy allow, and stop it and notify the RN and provider at once if a reaction is suspected", // PNTP p16; CNS 13.4
      ],
    },
    {
      title: "Medical-surgical nursing across the lifespan",
      weight: 18,
      gate: "Care for an adult with a common chronic or acute condition, and notice the complication before it announces itself.",
      objectives: [
        "Caring for the patient with hypertension and heart failure",
        "Angina, myocardial infarction and post-event care",
        "Peripheral vascular disease and venous insufficiency",
        "COPD and asthma management",
        "Pneumonia, influenza and tuberculosis precautions",
        "Diabetes mellitus: monitoring, hypo- and hyperglycemia",
        "Diabetic foot care and long-term complications",
        "Thyroid disorders",
        "Stroke care and rehabilitation support",
        "Seizure care and precautions",
        "Dementia and delirium distinguished",
        "Arthritis, osteoporosis and fracture care",
        "Post-surgical care and complication watch",
        "Cancer care, chemotherapy and radiation side effects",
        "Renal failure and dialysis support",
        "Gastrointestinal disorders and ostomy patients",
        "Infection, sepsis and recognizing early deterioration",
        "Care of the older adult and polypharmacy",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Recognize heart failure: edema graded 0 to 4+, weight gain, orthopnea and crackles, and report respiratory distress at once", // MS 12.3
        "Recognize hyperkalemia by cramping, diarrhea and peaked T waves, and hyponatremia by headache, confusion and seizures", // FN 20.1
        "Recognize stroke as an emergency: find out when the client was last known well, because treatment is time-sensitive", // MS 15.2; MS 15.3
        "Know that hemorrhagic stroke is most often caused by hypertension and that anticoagulants raise the risk", // MS 15.3
        "Recognize rising intracranial pressure: headache, vomiting, falling level of consciousness and Cushing's triad", // MS 17.1
        "Care for an ostomy, knowing that ileostomy and ascending-colon output is watery while descending-colon output is more formed", // MS 19.7
        "Prioritize breathing in pneumonia: monitor vital signs and oxygen saturation, give oxygen as ordered, and report distress", // MS 11.7
        "Protect a client with neutropenia, in whom fever, sore throat or mouth ulcers may be the only signs of infection", // MS 16.5
        "Do neurovascular checks after a fracture and report signs of compartment syndrome or fat embolism", // MS 13.3
        "Watch the postoperative client for atelectasis, DVT, ileus and urinary retention, and encourage incentive spirometry", // MS 27.3
        "Recognize the complications of cirrhosis -- varices, ascites and hepatic encephalopathy", // MS 19.6
        "Recognize appendicitis by right lower quadrant or periumbilical pain and report it, since perforation can lead to peritonitis and sepsis", // MS 19.5
        "Recognize thyroid storm -- fever, tachycardia, agitation, confusion, vomiting -- as a medical emergency to report at once", // MS 21.3
      ],
    },
    {
      title: "Maternal, newborn, pediatric and mental health nursing",
      weight: 10,
      gate: "Adjust care to the patient in front of you -- a laboring mother, a toddler, an adolescent in crisis -- rather than applying the adult default.",
      objectives: [
        "Antepartum care and common discomforts of pregnancy",
        "Danger signs in pregnancy that must be reported",
        "Care of the client in labor and delivery",
        "Postpartum care and hemorrhage recognition",
        "Newborn care, feeding and normal findings",
        "Growth and development milestones by age",
        "Pediatric vital sign and dosage differences",
        "Common childhood illnesses and immunization schedules",
        "Communicating with a child and with the parent",
        "Child abuse recognition and mandatory reporting",
        "Mental health conditions commonly encountered",
        "Anxiety, depression and suicide risk recognition",
        "Substance use, withdrawal and overdose recognition",
        "De-escalation and therapeutic environment",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Teach relief for morning sickness: small frequent snacks, separating fluids from meals, ginger, dry crackers and avoiding greasy or spicy food", // MN 10.3
        "Report decreased fetal movement, which can reflect low maternal blood sugar or poor placental perfusion, and vaginal bleeding in pregnancy", // MN 11.4
        "Report blood pressure of 140/90 mm Hg or higher in pregnancy, and know preeclampsia can progress to HELLP syndrome and eclampsia", // MN 11.3; MN 12.2
        "Check the postpartum fundus, bladder and lochia, and report a temperature above 100.4 F (38 C)", // MN 20.1; MN 20.3
        "Recognize postpartum hemorrhage as blood loss of 1,000 mL or more within 24 hours, and report heavy bleeding at once", // MN 21.2
        "Know the Apgar score is taken at 1 and 5 minutes and repeated at 10 minutes when the 5-minute score is below 7", // MN 22.1
        "Recognize suicide risk factors -- a plan, access to means, previous attempts -- and report any suicidal statement immediately", // PMH 16.3
        "Recognize mania and psychosis, and the extrapyramidal side effects of first-generation antipsychotics", // PMH 16.4; PMH 15.1; PHARM 13.2
        "Use the CIWA-Ar scale for alcohol withdrawal, and know that alcohol with opioids or sedatives raises overdose risk", // PMH 19.2
        "Give trauma-informed care that builds safety and trust and avoids re-traumatizing the client", // PMH 6.5
        "Reinforce newborn care teaching, including safe sleep, car seats and the warning signs such as a breathing pause of 20 seconds or more, or a shorter pause with blue color or paleness", // MN 24.3
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Associate Degree in Nursing (prelicensure RN).
//
// The content target is entry-level registered nurse practice, which NCSBN
// defines in the RN test plan; the degree itself is awarded by an accredited
// program. Both are recorded: the standard is the program accreditation, the
// examination the graduate sits is NCLEX-RN.
// ---------------------------------------------------------------------------
export const ADN_TRACK: SeedTrack = {
  code: "ADNRN",
  title: "Associate Degree Nursing (RN) Coach",
  description:
    "The prelicensure RN program: the sciences underneath practice, the full nursing process with the RN's own assessment authority, medical-surgical depth, and the specialty rotations -- aimed at entry-level RN practice as NCSBN defines it.",
  trackType: "graduate",
  subcategorySlug: "nursing-degrees",
  freshnessModel: "academic_foundational",
  sourceUrl: "https://www.ncsbn.org/public-files/2026_RN_Test%20Plan_English-F.pdf",
  sourceVerifiedAt: VERIFIED_AT,
  requiresAcknowledgement: true,
  disclaimerKey: NURSING_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    domainWeights: "study_emphasis", // REQ-220: see the note on unit weights above
    ...NCSBN_PROVIDER,
    subcategorySlug: "nursing-degrees",
    credentialSlug: "associate-degree-nursing",
    credentialName: "Associate Degree in Nursing (Registered Nurse)",
    credentialUrl: "https://www.ncsbn.org/nursing-regulation/licensure.page",
    basis: "accreditation_standard",
    standardName: "Accredited prelicensure RN program, with NCLEX-RN as the licensure examination",
    standardRevision: "2026",
    status: "active",
    officialObjectivesUrl: "https://www.ncsbn.org/public-files/2026_RN_Test%20Plan_English-F.pdf",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Program prerequisites usually include anatomy and physiology, microbiology and college-level mathematics. Licensure requires graduating an approved program and passing NCLEX-RN.",
    questionFormat: "Program coursework, clinical evaluation and standardized progression testing",
    passingScorePolicy: "Set by the program; licensure is by NCLEX-RN",
  },
  units: [
    {
      title: "Professional nursing foundations",
      weight: 14,
      gate: "Act as the nurse who owns the assessment: gather it, interpret it, and be accountable for the judgment that follows.",
      objectives: [
        "The registered nurse role and its accountability",
        "Scope of practice and the state nurse practice act",
        "The nursing process: assessment, diagnosis, planning, implementation, evaluation",
        "Nursing assessment as an RN act, distinct from data collection",
        "Formulating a nursing diagnosis from assessment findings",
        "Setting measurable, client-centered outcomes",
        "Clinical judgment and the steps that make it a process rather than instinct",
        "Prioritization frameworks and their limits",
        "Delegation and supervision: the five rights applied",
        "Legal and ethical accountability, including negligence and malpractice",
        "Informed consent and the nurse's distinct role in it",
        "Documentation, reporting and handoff communication",
        "Evidence-based practice and reading a clinical guideline",
        "Patient safety, error disclosure and just culture",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Name the four NANDA-I categories of nursing diagnosis -- problem-focused, risk, health promotion, syndrome -- and the four parts of a problem-focused diagnosis: label, definition, defining characteristics, related factors", // FN 13.3
        "Base a risk diagnosis on clinical judgment about the client's individual vulnerability, before any problem has appeared", // FN 13.3
        "Map the nursing process onto the six clinical judgment steps, and use evaluation to decide whether the plan continues, changes or ends", // MS 4.2; MS 4.5; FN 43.1
        "Document changes promptly and objectively, because timely, accurate records are the cues the team uses to act", // FN 14.5
        "Frame a clinical question with PICOT and place the answer in the hierarchy of evidence, with recent high-quality systematic reviews at the top", // FN 15.1
        "Apply the five rights of delegation, keeping in mind that the RN retains accountability and cannot delegate nursing judgment or an unstable client", // DEL; FN 15.4
        "Know the RN's part in informed consent and the consequences of proceeding without it: liability for the nurse and possible battery", // FN 16.3
        "Use the ethical principles -- autonomy, beneficence, nonmaleficence, justice, fidelity, veracity -- to analyze a dilemma", // FN 16.2
        "Know that a sentinel event, such as a fall that leads to death or permanent disability, triggers root cause analysis aimed at system causes", // FN 15.3
        "Move up the chain of command when a provider insists on an order the nurse believes is unsafe", // MS 5.4; FN 16.3
        "Run an organized, thorough admission, because it sets the course of care and an admission can turn emergent if the client becomes unstable", // FN 8.1
        "Give a transfer report focused on what the receiving team needs, since each transfer point risks losing crucial information", // FN 8.2
      ],
    },
    {
      title: "Health assessment and the sciences underneath practice",
      weight: 16,
      gate: "Perform a full assessment and explain each abnormal finding by the physiology that produced it.",
      objectives: [
        "Health history taking and interviewing technique",
        "Inspection, palpation, percussion and auscultation",
        "Cardiovascular assessment and heart sounds",
        "Respiratory assessment and breath sounds",
        "Abdominal assessment and bowel sounds",
        "Neurological assessment, including level of consciousness",
        "Musculoskeletal and integumentary assessment",
        "Assessment across the lifespan and adjusting technique by age",
        "Cell injury, inflammation and repair",
        "Immunity, hypersensitivity and autoimmunity",
        "Fluid, electrolyte and acid-base regulation",
        "Acid-base interpretation from a blood gas",
        "Microbiology: organisms, transmission and antimicrobial action",
        "Laboratory value interpretation and trending",
        "Pharmacokinetics and pharmacodynamics",
        "Nutrition and its role in healing",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Auscultate the lungs systematically and tell normal breath sounds from abnormal ones: fine or coarse crackles, rhonchi, wheezes, stridor and friction rubs", // CNS 23.3
        "Trace the heart's conduction from the SA node through the AV node, bundle branches and Purkinje fibers, and know what defines normal sinus rhythm", // CNS 24.1; FN 19.2
        "Describe stroke volume and its three determinants -- preload, contractility, afterload -- and how cardiac output follows", // FN 19.2
        "Explain gas exchange across the alveolar-capillary membrane and how ventilation and perfusion work together", // FN 19.1
        "Know body fluid distribution -- about two-thirds intracellular, one-third extracellular -- and why edema signals excess extracellular fluid", // FN 20.1
        "Interpret blood gases with pH 7.35 to 7.45 and PaCO2 35 to 45 mm Hg, and identify respiratory or metabolic acidosis or alkalosis", // FN 20.2; MS 10.4
        "Distinguish innate from adaptive immunity, and antibody-mediated from cell-mediated responses", // PHARM 6.1
        "Explain first-pass metabolism and bioavailability, and how the liver and kidneys shape a drug's effect", // PHARM 2.2
        "Know the kidneys clear urea and creatinine, which serve as markers of kidney function, and produce erythropoietin", // FN 26.2
        "Know that the history for a young child comes mainly from the caregiver, and offer adolescents private time to discuss their health", // HP 14.5
        "Use the comprehensive geriatric assessment areas -- function, cognition, mood, falls, pain, polypharmacy, nutrition, senses -- for older adults", // FN 41.4
        "Calculate ventricular rate from a 6-second strip by counting QRS complexes and multiplying by ten", // MS 12.2
        "Recognize premature ventricular contractions and know that three or more in a row is a run of ventricular tachycardia", // MS 12.2
      ],
    },
    {
      title: "Medical-surgical nursing I",
      weight: 20,
      gate: "Manage an adult with a common condition and anticipate the complication that condition tends to produce.",
      objectives: [
        "Hypertension, heart failure and cardiomyopathy",
        "Coronary artery disease, angina and myocardial infarction",
        "Dysrhythmia recognition and nursing response",
        "Shock: recognizing type, stage and urgency",
        "Peripheral arterial and venous disease",
        "COPD, asthma and respiratory failure",
        "Pneumonia, tuberculosis and pulmonary embolism",
        "Chest tubes, oxygen therapy and mechanical ventilation basics",
        "Acute and chronic kidney disease",
        "Dialysis: hemodialysis and peritoneal",
        "Fluid volume deficit and overload",
        "Diabetes mellitus and the acute crises DKA and HHS",
        "Thyroid, adrenal and pituitary disorders",
        "Perioperative nursing: before, during and after",
        "Wound healing, dehiscence and infection",
        "Pain management, including the opioid-tolerant patient",
        "Sepsis recognition and the first hour of response",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Distinguish type 1 from type 2 diabetes: type 2 makes up about 95 percent of cases and begins with insulin resistance linked to obesity and inactivity", // MS 21.2
        "Know the insulin profile -- onset, peak, duration -- and treat hypoglycemia in a conscious client with a fast-acting carbohydrate", // PHARM 28.2
        "Recognize heart failure findings -- graded edema, weight gain, orthopnea, crackles -- and pulmonary edema as an emergency", // MS 12.3
        "Monitor digoxin: take an apical pulse and withhold below 60, and watch for toxicity, which low potassium and magnesium make more likely", // PHARM 17.6; PHARM 19.6
        "Recognize ACE inhibitor adverse effects, including angioedema and a dry cough", // PHARM 18.2
        "Teach warfarin safety: consistent vitamin K intake and INR monitoring, with a higher INR meaning higher bleeding risk", // PHARM 20.2
        "Prioritize respiratory distress in pneumonia and know COPD is the biggest risk factor for hospitalization with pneumonia", // MS 11.7
        "Use albuterol as the rescue inhaler and salmeterol for maintenance only, and teach clients not to stop corticosteroids abruptly", // PHARM 25.1; PHARM 25.2
        "Before surgery, confirm consent is signed before sedating drugs; after surgery, prevent atelectasis with incentive spirometry and watch for DVT, ileus and urinary retention", // MS 25.2; MS 27.3
        "Stage pressure injuries correctly, including stage 1 on darkly pigmented skin, unstageable wounds and device-related injuries", // MS 28.3
        "Recognize hyperkalemia above 5.1 mEq/L with peaked T waves, and know its common causes: kidney failure, acidosis, potassium-sparing diuretics and supplements", // FN 20.1
        "Correct sodium at the ordered pace, since a rapid change can cause cerebral edema or brain damage", // MS 10.3; MS 21.4
        "Tell DKA from HHS: DKA is acute with low mortality, while HHS develops over weeks and has a much higher mortality rate", // MS 21.2
        "Treat thyroid storm as an emergency, and recognize hypothyroidism by low metabolic rate, weight gain, cold extremities and constipation", // MS 21.3
        "Know Addison's disease reduces cortisol and aldosterone, and that low cortisol can cause low blood glucose", // MS 21.5
      ],
    },
    {
      title: "Medical-surgical nursing II and complex care",
      weight: 18,
      gate: "Care for a patient whose systems are failing together, and decide what to act on first.",
      objectives: [
        "Stroke: ischemic and hemorrhagic, and time-critical response",
        "Increased intracranial pressure",
        "Seizure disorders and status epilepticus",
        "Spinal cord injury and autonomic dysreflexia",
        "Neurodegenerative disease: Parkinson's, multiple sclerosis, ALS",
        "Dementia and delirium distinguished in practice",
        "Gastrointestinal bleeding and liver failure",
        "Pancreatitis and biliary disease",
        "Inflammatory bowel disease and ostomy management",
        "Cancer: treatment modalities and their toxicities",
        "Neutropenic precautions and oncologic emergencies",
        "Hematologic disorders: anemia, clotting and transfusion reaction",
        "Blood product administration and the reaction protocol",
        "Burns: depth, fluid resuscitation and infection risk",
        "Trauma and emergency triage",
        "Musculoskeletal trauma, traction and compartment syndrome",
        "Palliative and end-of-life care",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Find the last-known-well time for suspected stroke because tPA is time-sensitive, and score severity with the NIH Stroke Scale", // MS 15.2
        "Distinguish intracerebral from subarachnoid hemorrhage and know hypertension and anticoagulants raise the risk of intracerebral bleeding", // MS 15.3
        "Recognize Cushing's triad and the other signs of increased intracranial pressure", // MS 17.1
        "Classify neutropenia by severity, with severe neutropenia below 500 cells per microliter, and protect the client from infection", // MS 16.5
        "Recognize tumor lysis syndrome and its electrolyte pattern -- high potassium, phosphate and uric acid with low calcium", // MS 31.3
        "Tell transfusion reactions apart and stop the transfusion and notify the provider at once when a reaction is suspected", // MS 16.7; CNS 13.4
        "Recognize cirrhosis complications -- portal hypertension, varices, ascites, hepatic encephalopathy -- and the role of paracentesis", // MS 19.6
        "Prioritize airway, breathing, then circulation and fluid resuscitation in burns, and watch for infection, hypothermia and sepsis", // MS 14.2
        "Perform neurovascular checks after a fracture and recognize compartment syndrome and fat embolism", // MS 13.3
        "Distinguish palliative care, which aims to relieve symptoms, pain and stress rather than to cure, from hospice care for those expected to live fewer than six months", // MS 32.1; MS 32.2
        "Support the dying client and family through hospice's interdisciplinary team, including the chaplain's role before and after death", // MS 32.2
        "Recognize appendicitis with a positive Rovsing sign, and peritonitis after perforation as a route to sepsis", // MS 19.5
        "Recognize Guillain-Barre syndrome, an autoimmune attack on peripheral nerves that can cause temporary paralysis", // MS 17.2
      ],
    },
    {
      title: "Maternal-newborn and pediatric nursing",
      weight: 16,
      gate: "Care for two patients at once during pregnancy and birth, and scale everything to the child in front of you.",
      objectives: [
        "Antepartum assessment and fetal surveillance",
        "Common complications of pregnancy: preeclampsia, gestational diabetes, placenta previa",
        "Labor stages and nursing care through each",
        "Fetal heart rate patterns and the response each demands",
        "Analgesia and anesthesia in labor",
        "Operative birth and cesarean care",
        "Postpartum assessment and hemorrhage management",
        "Postpartum mood disorders",
        "Newborn transition, assessment and Apgar scoring",
        "Newborn feeding, jaundice and thermoregulation",
        "High-risk newborn care",
        "Growth and development across childhood and adolescence",
        "Pediatric dosage, fluid and airway differences",
        "Congenital and acquired cardiac conditions in children",
        "Pediatric respiratory illness: bronchiolitis, croup, epiglottitis",
        "Childhood cancers and chronic illness support",
        "Immunization schedules and parental questions about them",
        "Child abuse recognition and mandatory reporting",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Estimate the due date with Naegele's rule, and know the routine second-trimester screens, including gestational diabetes testing at 24 to 28 weeks", // MN 11.1; MN 11.3
        "Interpret the fetal heart rate baseline -- 110 to 160 bpm with moderate variability -- and respond to an abnormal tracing by repositioning or stopping oxytocin", // MN 16.4
        "Recognize postpartum hemorrhage at 1,000 mL within 24 hours, measure blood loss quantitatively, and assess fundal tone and bladder", // MN 21.2; MN 20.3
        "Score the Apgar at 1 and 5 minutes, repeating at 10 minutes when the 5-minute score is below 7", // MN 22.1
        "Recognize bronchiolitis, usually from RSV, as most severe in infants, with priorities of symptom relief, preventing complications and controlling spread", // HP 15.10
        "Recognize croup, usually from parainfluenza virus in children aged 6 months to 3 years, with airway swelling often worse at night", // HP 15.8
        "Treat epiglottitis as an airway emergency: a child's floppy epiglottis can block the airway quickly, and the Hib vaccine has made it less common", // HP 15.9
        "Tell a simple febrile seizure, a single seizure under 15 minutes, from a complex one, which lasts longer or recurs within 24 hours", // HP 16.10
        "Recognize meningococcal meningitis as a medical emergency, with stiff neck, fever and altered mental status as its classic signs", // HP 16.13
        "Spot subtle signs of a congenital heart defect in an infant: feeding difficulty, sweating or bluish color with feeds, fast breathing at rest and poor weight gain", // HP 17.5
        "Distinguish acute diarrhea in children, under two weeks and usually infectious, from chronic diarrhea, and watch for dehydration", // HP 16.9
        "Adapt the pediatric exam: let infants and toddlers with stranger anxiety sit with a caregiver, and try a different approach with an uncooperative older child", // HP 14.5
      ],
    },
    {
      title: "Mental health, community and leadership",
      weight: 16,
      gate: "Move competently outside the hospital: the psychiatric unit, the community, and the charge nurse's decisions.",
      objectives: [
        "Therapeutic use of self and therapeutic communication",
        "Mental status examination",
        "Anxiety disorders and panic",
        "Mood disorders: depression and bipolar disorder",
        "Suicide risk assessment and safety planning",
        "Schizophrenia and psychotic disorders",
        "Personality disorders and consistent team response",
        "Eating disorders",
        "Substance use disorders, withdrawal and overdose",
        "Psychotropic medications and their serious adverse effects",
        "Crisis intervention and de-escalation",
        "Seclusion, restraint and the least restrictive principle",
        "Community and public health nursing roles",
        "Epidemiology, screening and herd immunity in practical terms",
        "Social determinants of health and how they present at the bedside",
        "Care coordination, discharge planning and transitions of care",
        "Leadership, conflict resolution and the charge nurse role",
        "Quality improvement and nurse-sensitive indicators",
        "Disaster preparedness and triage",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Assess suicide lethality: a detailed plan, access to means, prior attempts, current mental state and social support", // PMH 16.3
        "Monitor lithium's narrow safety margin and the drugs that raise its level, and watch for lithium-induced hypothyroidism", // PHARM 13.3
        "Recognize extrapyramidal symptoms and neuroleptic malignant syndrome with antipsychotics, and know clozapine needs absolute neutrophil count monitoring as its labeling directs (the FDA REMS program ended in June 2025)", // PHARM 13.2
        "Use the CIWA-Ar scale for alcohol withdrawal and recognize alcohol overdose", // PMH 19.2
        "Provide trauma-informed care grounded in safety, trust and collaboration", // PMH 6.5
        "Use the least restrictive measure for aggression and treat emergency medication orders as interim steps", // PMH 11.2
        "Know the five levels of prevention and place immunization in primary and screening in secondary prevention", // POP 2.5
        "Explain economic stability as a social determinant of health: steady income and access to housing, food, transport, child care and insurance", // POP 8.1
        "Support safe care transitions through accurate information transfer, client and family education and follow-up that prevents readmission", // POP 30.1
        "Use democratic, autocratic or laissez-faire leadership as the situation demands, and the PDSA cycle for quality improvement", // FN 18.1; FN 15.3
        "Recognize intimate partner violence and know pregnancy raises the risk of physical abuse", // MN 9.2
        "Recognize opioid use disorder, which can begin with legitimate pain treatment, and its social consequences", // PMH 19.4
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Bachelor of Science in Nursing.
//
// Structured on the ten Domains of the AACN Essentials. Note the edition:
// the Essentials were revised in 2026, and the revision matters here --
// the featured concept that was "Diversity, Equity, and Inclusion" in the
// 2021 edition is "Access, Connection, and Engagement" in the 2026 one.
// Anything written from memory would have the old list.
// Unit titles renamed 2026-11-06 (REQ-099, Nick): each unit still covers
// one Essentials Domain in AACN's order (marked on each title line), but
// the titles use common nursing-course names instead of AACN's own domain
// names, because AACN's terms bar derivative works without permission.
// ---------------------------------------------------------------------------
export const BSN_TRACK: SeedTrack = {
  code: "BSNRN",
  title: "BSN Nursing Coach",
  description:
    "Baccalaureate nursing organized the way the discipline organizes itself: the ten Domains of the AACN Essentials, from knowledge for nursing practice through systems, informatics and professional formation.",
  trackType: "graduate",
  subcategorySlug: "nursing-degrees",
  freshnessModel: "academic_foundational",
  sourceUrl: "https://www.aacnnursing.org/essentials",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: "2027-09-18T00:00:00Z",
  requiresAcknowledgement: true,
  disclaimerKey: NURSING_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    domainWeights: "study_emphasis", // REQ-220: see the note on unit weights above
    ...AACN_PROVIDER,
    credentialSlug: "bachelor-of-science-in-nursing",
    credentialName: "Bachelor of Science in Nursing",
    credentialUrl: "https://www.aacnnursing.org/essentials",
    basis: "accreditation_standard",
    standardName: "The Essentials: Core Competencies for Professional Nursing Education",
    standardRevision: "2026 edition",
    status: "active",
    officialObjectivesUrl: "https://www.aacnnursing.org/essentials",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Entry-level (Essentials Level 1) competencies for professional nursing education. Suits a prelicensure BSN student or an RN completing a BSN.",
    questionFormat: "Competency-based program assessment against the Essentials sub-competencies",
    passingScorePolicy: "Set by the program and its accreditor; licensure is by NCLEX-RN",
  },
  units: [
    {
      title: "Nursing Science and Theory", // AACN Essentials Domain 1
      weight: 11,
      gate: "Use disciplinary knowledge and knowledge from other fields together, and say which one you are leaning on.",
      objectives: [
        "Nursing as a discipline with its own body of knowledge",
        "Ways of knowing in nursing, and what each contributes",
        "Nursing theory and its use in framing practice",
        "Knowledge from the liberal arts applied to care",
        "Natural and social sciences underpinning nursing practice",
        "Translating evidence into a practice decision",
        "Clinical judgment as the product of knowledge plus reasoning",
        "Innovation in nursing practice and where it comes from",
        "Systems thinking applied to a clinical problem",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Use the clinical judgment model's layers and six cognitive steps as one structured way to show how nursing knowledge becomes a clinical decision", // ESS 1.3; FN 43.1
        "Use Erikson's psychosocial and Piaget's cognitive theories to frame care across the lifespan", // FN 38.2
        "Apply the socio-ecological model to see a client within nested individual, relationship, community and policy contexts", // POP 10.3
        "Use health behavior theories -- the health belief model, the stages of change and social cognitive theory -- to explain why clients do or do not change", // POP 15.3
        "Identify the five stages of change -- precontemplation, contemplation, preparation, action and maintenance -- and match the intervention to the stage", // POP 15.3
        "Explain the theory-practice gap and how evidence-based practice closes it by joining research evidence, clinical expertise and the person's values", // MS 1.4
        "Use ABCs and Maslow's hierarchy to sort many cues into the problems that come first", // MS 4.3
        "Distinguish acute inflammation, a helpful response, from chronic inflammation that drains the body over time", // MS 8.6
      ],
    },
    {
      title: "Patient- and Family-Centered Care", // AACN Essentials Domain 2
      weight: 14,
      gate: "Build care around the person and the people who matter to them, not around the diagnosis.",
      objectives: [
        "Person-centered care as holistic and individualized",
        "Establishing a caring relationship and presence",
        "Communicating effectively across difference",
        "Compassionate care: noticing vulnerability and responding to it",
        "Assessment as the foundation of individualized care",
        "Diagnosing, planning and evaluating with the person, not for them",
        "Coordinating care across settings and disciplines",
        "Family and important others as part of the unit of care",
        "Developmentally appropriate care across the lifespan",
        "Respecting dignity, preference and self-determination",
        "Cultural humility and responsiveness",
        "Managing pain and symptoms as a person experiences them",
        "Advocating for the person within the system",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Turn assessment data into a prioritized problem list, writing each problem as a NANDA-I diagnosis -- problem-focused, risk, health promotion or syndrome -- with the person's preferences in view", // ESS 2.4; FN 13.3
        "Set SMART outcomes with a time frame together with the person, and anticipate expected, unexpected and adverse outcomes when planning", // ESS 2.5; MS 4.4
        "Use teaching materials suited to the person's health literacy, and confirm learning through return demonstration or teach-back rather than nods", // ESS 2.2; FN 17.4
        "Plan teaching across cognitive, affective and psychomotor domains, and assess readiness to learn first", // FN 17.2
        "Use shared decision making, such as AHRQ's five-step SHARE approach, so the person's values shape the plan", // FN 15.2
        "Reassess and modify the plan of care when outcomes fall short, and recognize when standard practice needs to change for an individual", // ESS 2.7; MS 4.5
        "Give trauma-informed care that builds safety, trust and collaboration", // PMH 6.5
        "Use the comprehensive geriatric assessment areas -- function, cognition, mood, falls, pain, polypharmacy, nutrition, senses, care preferences -- to individualize care", // FN 41.4
        "Help the person record their wishes in a living will or name a healthcare proxy, and know a POLST guides care in the last stage of life", // FN 36.4
        "Support grief as the person experiences it, including anger and the physical symptoms grief can bring", // FN 36.1
        "Assess spiritual needs, recognizing they may differ from your own, and draw on them as a source of comfort", // FN 35.2
        "Distinguish palliative care, which aims to relieve symptoms, pain and stress rather than to cure, from hospice care for those expected to live fewer than six months", // MS 32.1; MS 32.2
      ],
    },
    {
      title: "Community and Public Health Nursing", // AACN Essentials Domain 3
      weight: 11,
      gate: "Move from one patient to a population, and name the partnership that would actually shift the outcome.",
      objectives: [
        "Population health across the prevention-to-management continuum",
        "Epidemiology and describing disease in a population",
        "Social determinants of health and their measurable effect",
        "Health equity and access, connection and engagement",
        "Community assessment and asset mapping",
        "Partnerships with public health, government, industry and community",
        "Health promotion and disease prevention at population scale",
        "Emergency preparedness and disaster response",
        "Environmental health and its clinical consequences",
        "Global health and cross-border health threats",
        "Health policy and how nurses influence it",
        "Advocacy for policy that improves population outcomes",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Use epidemiological measures -- rates, proportions, incidence, prevalence, case-fatality and attack rates -- to compare disease frequency across groups, places and times", // POP 12.5
        "Apply the epidemiological triad: disease arises from the interaction of a susceptible host, an agent and the environment", // POP 12.3
        "Classify agents of disease as physical, chemical, nutritional, psychosocial or biological", // POP 12.3
        "Tell experimental studies, the randomized gold standard, from observational ones such as case-control and cohort studies", // POP 12.4
        "Know the three core functions of public health -- assessment, policy development, assurance -- and how the 10 Essential Public Health Services put them into practice", // POP 2.4
        "Take part in a community health assessment and use the nursing process to form a community diagnosis and plan of care", // POP 17.4; ESS 3.1
        "Know the phases of the disaster management cycle and the nurse's role in prevention, preparation, response and recovery", // POP 32.4; ESS 3.6
        "Explain how climate change, through extreme weather and environmental shifts, affects population health", // POP 14.4; ESS 3.6
        "Explain economic stability as a social determinant of health and its effect on access to housing, food and care", // POP 8.1
        "Use the five levels of prevention -- primordial, primary, secondary, tertiary, quaternary -- to plan population interventions", // POP 2.5
        "Place cancer control on the prevention levels: HPV and hepatitis B vaccination as primary, mammography, colonoscopy and cervical screening as secondary", // MS 31.2
        "Define health disparities as avoidable gaps in illness, injury, violence and opportunity carried by socially disadvantaged groups", // POP 9.1
        "Use a staged model of policy development: define the problem clearly first, then bring it to the people with power to change the policy", // POP 34.3
        "Recognize intimate partner violence as a population health problem, with higher risk in pregnancy and serious maternal and newborn consequences", // MN 9.2
      ],
    },
    {
      title: "Evidence-Based Practice and Nursing Research", // AACN Essentials Domain 4
      weight: 9,
      gate: "Read the evidence critically, and be able to say why a study should or should not change what you do.",
      objectives: [
        "The generation and synthesis of nursing knowledge",
        "Research process and design fundamentals",
        "Quantitative and qualitative approaches and what each answers",
        "Appraising evidence quality and level",
        "Statistical literacy sufficient to read a results table",
        "Translating research into practice change",
        "Evidence-based practice models",
        "Ethical conduct of research and human subject protection",
        "Disseminating findings to clinical and lay audiences",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Write a clinical question in PICOT form and place evidence within a hierarchy, with recent high-quality systematic reviews at the top", // FN 15.1; ESS 4.2
        "Appraise each piece of evidence for quality before using it, after first understanding the levels of evidence", // POP 11.3; ESS 4.2
        "Check a study for informed consent, human rights protections and IRB approval in its methods or front and back matter, and treat their absence as a sign it may not have been conducted ethically", // ESS 4.3; FN 15.1
        "Use an evidence-based practice model, such as the Johns Hopkins model with its own evidence-rating scale, to structure a project", // FN 15.1
        "Prefer recent high-quality systematic reviews when answering a practice question, and check how a study was funded when judging it", // FN 15.1
        "Rate evidence with a named model's scale, such as the Johns Hopkins high, good and low ratings", // FN 15.1
      ],
    },
    {
      title: "Patient Safety and Quality Improvement", // AACN Essentials Domain 5
      weight: 11,
      gate: "Treat an error as a system signal: find the condition that allowed it, not the person who met it.",
      objectives: [
        "A culture of safety and psychological safety in teams",
        "Just culture, and distinguishing error from recklessness",
        "Human factors and error-producing conditions",
        "Root cause analysis and failure modes analysis",
        "Quality improvement methods and measurement",
        "Nurse-sensitive indicators and outcome data",
        "Standardization, checklists and reducing variation",
        "Reporting near misses and adverse events",
        "Disclosure to patients and families after harm",
        "Minimizing risk of harm to patients and to providers",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Use the PDSA cycle repeatedly, revising the plan from what was learned until the change succeeds", // FN 15.3; ESS 5.1
        "Recognize a sentinel event and use root cause analysis to find the system factors behind an error, such as similar-looking drug labels or vague orders", // FN 15.3; FN 9.1
        "Use Lean thinking to remove unnecessary steps from a care process", // FN 15.3
        "Know the main occupational hazards nurses face, including workplace violence, injury and infectious exposure, and contribute to a safe work environment", // ESS 5.3; FN 9.2; FN 9.1
        "Report medication errors honestly and promptly, since early disclosure may prevent harm", // PHARM 3.2
        "Report questionable, unethical or impaired practice through established channels even when retaliation is feared; state nurses associations can advise", // MS 5.2
        "Know that nurses and pharmacists intercept many medication-ordering errors, and use the four groups of safety checks: identity, order, environment, adverse reactions", // CNS 11.1
        "Treat catheter-associated urinary tract infection as a largely preventable harm that lengthens stays and raises mortality", // CNS 19.4
      ],
    },
    {
      title: "Teamwork and Interprofessional Collaboration", // AACN Essentials Domain 6
      weight: 9,
      gate: "Work with other professions as colleagues with distinct expertise, and communicate across that difference under pressure.",
      objectives: [
        "Interprofessional communication and structured handoff",
        "Roles and scopes of other health professions",
        "Team dynamics and shared decision making",
        "Conflict engagement and resolution within teams",
        "Speaking up across a hierarchy when safety requires it",
        "Shared accountability for patient outcomes",
        "Partnering with patients and families as team members",
        "Interprofessional education and reflective team practice",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Use SBAR to give concise, structured information at handoffs and transfers", // FN 15.2; MN 20.1
        "Delegate to team members by role and competence, keeping accountability for the delegated task", // ESS 6.2; FN 18.3; DEL
        "Explain the benefits of a collaborative, interprofessional care model: better quality, lower cost and more convenience for the client", // MS 1.2
        "Practice cultural humility within the team: reflect on your own values and biases, stay open to other perspectives, and notice how bias shapes interactions", // ESS 6.4; POP 23.1
        "Use constructive communication to manage conflict, drawing on approaches leaders use to resolve team tension", // ESS 6.4; FN 18.2
        "Know each interprofessional team member's role and that each works within their own state scope of practice", // FN 15.6
        "Know that delegation is first set by organizational policy naming which tasks can go to which staff and in what situations", // DEL
        "Use referrals to connect the person to the right team member or specialist", // CNS 2.4
      ],
    },
    {
      title: "Health Care Systems, Policy and Finance", // AACN Essentials Domain 7
      weight: 9,
      gate: "Explain how the system pays for, staffs and constrains the care you give, and where the leverage sits.",
      objectives: [
        "Healthcare delivery system structure and financing",
        "Payment models and their effect on care decisions",
        "Cost, value and stewardship of resources",
        "Care coordination across the continuum",
        "Transitions of care and the risks they carry",
        "Regulatory bodies, accreditation and their influence",
        "Organizational structure, culture and change",
        "Staffing, workload and their relationship to outcomes",
        "Risk management and legal exposure",
        "Advocating for system-level change",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Describe a clinical microsystem -- a focused type of care, a defined population, skilled staff and supporting technology -- inside the larger health system", // MS 1.6; ESS 7.1
        "Know the main public funding sources, such as Medicare and Medicaid with its waiver programs, and how they shape long-term and in-home care", // MS 1.5
        "Know how scope of practice sets the legal limits of what a nurse may do", // MS 1.3
        "Explain why care transition models arose with the move from fee-for-service toward client-centered care: to prevent miscommunication, poor follow-up and readmissions", // POP 30.2
        "Distinguish primary, secondary and tertiary levels of care by complexity, and how people move between them over a lifetime", // FN 3.1
        "Use care coordination -- information transfer, teaching, follow-up -- to close gaps between settings and prevent adverse events", // POP 30.1
      ],
    },
    {
      title: "Nursing Informatics and Health Technology", // AACN Essentials Domain 8
      weight: 9,
      gate: "Use the record and the technology as clinical instruments, including knowing how they mislead.",
      objectives: [
        "Information and communication technology in nursing practice",
        "Electronic health records and structured documentation",
        "Clinical decision support and alert fatigue",
        "Data, information, knowledge and wisdom as a progression",
        "Standardized terminology in nursing documentation",
        "Data privacy, security and regulatory obligation",
        "Telehealth and remote monitoring",
        "Evaluating a digital health tool before trusting it",
        "Artificial intelligence in clinical tools, and its failure modes",
        "Using data to drive quality improvement",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Know how electronic health records support care coordination, client participation and quality", // CNS 4.3
        "Keep electronic health information confidential, accurate and available to those who need it, and spot and respond to a security breach", // FN 9.3
        "Know that telehealth, home monitoring and the EHR are the most impactful recent technologies, and how they can cut cost and widen access", // POP 5.3
        "Know the four steps of data collection -- subjective data, objective data, validation, documentation -- and keep personal bias out of what is recorded", // CNS 4.2
        "Know nursing informatics uses information and technology to make care more efficient, effective and safe", // MS 1.7
      ],
    },
    {
      title: "Professional Nursing: Ethics and Standards", // AACN Essentials Domain 9
      weight: 9,
      gate: "Hold the standards of the profession when it is inconvenient, and know where they come from.",
      objectives: [
        "Professional identity formation in nursing",
        "The nursing code of ethics applied to real conflict",
        "Ethical decision-making frameworks",
        "Moral distress, moral courage and moral resilience",
        "Accountability for one's own practice and competence",
        "Professional comportment and civility",
        "Nursing's social contract with the public",
        "Regulation, licensure and professional standards",
        "Stewardship and advocacy as professional obligations",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Know the nurse's roles -- caregiver, decision-maker, collaborator, communicator, advocate and educator -- within the profession's standards", // MS 1.3
        "Describe nurse advocacy by its features -- protecting, informing, valuing, mediating, and championing social justice", // POP 33.1
        "Build a therapeutic relationship by conveying respect, clarifying and restating what the person says, and avoiding blocks such as false reassurance, judging or minimizing", // ESS 9.2; PMH 3.1
        "Know the ethical principles that guide nursing -- autonomy, beneficence, nonmaleficence, justice, fidelity, veracity", // FN 16.2
        "Comply with laws, policies and regulations, including the duties around informed consent", // ESS 9.4; FN 16.3
        "Know certification is voluntary recognition in a specialty, a step beyond licensure", // FN 18.4
        "Know how the law reaches nurses: civil malpractice claims, failure to obtain consent as negligence, and Good Samaritan protection", // FN 16.3
      ],
    },
    {
      title: "Nursing Leadership and Professional Growth", // AACN Essentials Domain 10
      weight: 8,
      gate: "Build the practice you can sustain: self-awareness, lifelong learning, leadership, and the honesty to seek feedback.",
      objectives: [
        "Self-awareness and reflective practice",
        "Lifelong learning and continuing competence",
        "Seeking, receiving and acting on feedback",
        "Emotional intelligence in clinical relationships",
        "Resilience, wellbeing and burnout prevention",
        "Managing the personal cost of clinical work",
        "Leadership development at every level of practice",
        "Mentorship, precepting and being mentored",
        "Career planning and specialty progression",
        "Contributing to the advancement of the profession",
        // Added 2026-11-02: depth from open textbooks and Tier 1 sources (see the source header above NCLEX_RN_TRACK).
        "Compare leadership styles -- autocratic, democratic, laissez-faire -- and when each serves the team", // FN 18.1; ESS 10.3
        "Use guided reflection, such as a structured reflective cycle, to improve practice", // ESS 10.2; PMH 3.1
        "Know that nurse managers coordinate care, delegate and support staff's professional development", // FN 18.3
        "Know the certifications and degrees that prepare nurses for leadership and management roles", // FN 18.4
        "Use feedback and self-reflection to keep developing your therapeutic communication", // PMH 3.1
      ],
    },
  ],
};

export const NURSING_TRACKS: SeedTrack[] = [
  NCLEX_RN_TRACK,
  NCLEX_PN_TRACK,
  CNA_TRACK,
  LPN_TRACK,
  ADN_TRACK,
  BSN_TRACK,
];
