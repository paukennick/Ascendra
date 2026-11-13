// REQ-239 (wave 2): the NBCC counseling licensure exams, the second and third
// courses of the mental health wave (REQ-224 put the EPPP first). Both live
// under the Mental Health category's counseling-licensure subcategory
// (migration 077), so the 18+ mature-content confirmation applies to them
// through the category (lib/mature-content.ts), with no code change.
//
// What was read, and when (all 2026-11-11, in NBCC's own documents unless
// marked otherwise):
//   - NBCC, "Content Outline: The National Counselor Examination (NCE)"
//     (https://www.nbcc.org/assets/exam/nce_content_outline.pdf; PDF dated
//     2023-03-24, copyright 2023). Six domains at 12 / 12 / 29 / 9 / 30 / 8
//     percent of the 160 scored items (19 / 19 / 47 / 14 / 48 / 13), from the
//     job analysis finalized June 2019; the knowledge, skills and tasks under
//     each domain (lettered A, B, C ...); alignment to the eight CACREP
//     common core areas. 200 multiple-choice items, 160 scored and 40
//     unscored, 3 hours 45 minutes.
//   - NBCC, NCE Candidate Handbook for State Licensure (revised 2024-09-24,
//     https://www.nbcc.org/assets/exam/handbooks/nce.pdf): 200 questions,
//     non-sectioned, answer choices A-D; 225 minutes of testing inside a
//     255-minute session with one 15-minute break after question 100; each
//     of the 160 scored items is one point; the cut score is set by a
//     modified Angoff method and equated per form, so it varies slightly by
//     form and is given on the score report; a candidate who fails may retest
//     after 30 days. nbcc.org/nce (read 2026-11-11) repeats "200 questions,
//     160 of which are scored".
//   - NBCC, "Content Outline: The National Clinical Mental Health Counseling
//     Examination (NCMHCE)" (https://www.nbcc.org/assets/exam/ncmhce_content_outline.pdf;
//     revised 2025-10-08). The same six domain titles and lettered tasks as
//     the NCE, weighted 15 / 25 / 0 / 15 / 30 / 15: "Areas of Clinical Focus"
//     is evaluated through the diagnoses and case scenarios on each form, not
//     at the item level (the outline's footnote). Format: 11 case studies,
//     one of them unscored; each case is one narrative in three sections (an
//     initial intake summary and two counseling sessions), each section
//     followed by multiple-choice questions, 9-15 per case, four options and
//     one correct answer, most at application level or higher; 130-150
//     items, 100 scored, one point each; 255 minutes. The cut score comes
//     from standard setting and is equated across forms.
//   - NBCC, NCMHCE Candidate Handbook for State Licensure (PDF dated
//     2025-11-20): 225 minutes of testing in a 255-minute session, one
//     15-minute break after the fifth case study; retest after 30 days.
//   - NBCC, NCE and NCMHCE "Examination Specifications, Effective July 1,
//     2027" (cce-global.org/Assets/exams/NCE_exam_spec_2027.pdf and
//     NCMHCE_exam_spec_2027.pdf, copyright 2026). From 2027-07-01 both exams
//     move to a new blueprint from the 2024-2025 work analysis (six NEW
//     domains: Professional Development & Counselor Self-Awareness 15, Intake
//     & Assessment 18, Treatment Planning & Continuity of Care 15, Provision
//     of Counseling Interventions 20, Indirect Client Care 12, Legal & Ethical
//     Compliance 20), scaled scores 100-500 with 360 passing; the NCE becomes
//     170 items with three options each (30 field-test), the NCMHCE 10 case
//     studies, 225 minutes each. So these courses teach the CURRENT outlines,
//     every source is rechecked by 2027-04-01 and contentReviewDueAt is
//     2027-04-01: a successor version (REQ-102: units appended, the current
//     ones retired in place) has to be built before 2027-07-01. nbcc.org's
//     NCMHCE page says "This page will be updated as more information about
//     the new examination becomes available" and gives no transition dates
//     beyond the specification's effective date.
//   - Washington: WAC 246-809-240 (read 2026-11-11 at app.leg.wa.gov): a
//     mental health counselor applicant must pass an NBCC examination; the
//     NCE or the NCMHCE meets the requirement, and the Department of Health
//     accepts NBCC's passing score.
//   - ACA Code of Ethics (2014), the PDF at counseling.org, read 2026-11-11.
//     counseling.org/resources/ethics (read 2026-11-11) says the 2014 Code
//     "remains the current version" until a revised code is adopted by the
//     Board; NBCC's newsletter (2026-01-30) expected adoption at ACA's fall
//     2026 meeting, and nothing adopted was found. Recheck by 2027-02-01.
//   - DSM-5-TR (American Psychiatric Association, 2022) is the current
//     edition per psychiatry.org (as recorded for the EPPP, read 2026-11-10).
//     The manual was not read; objectives name it and never reproduce
//     criteria text. The PTSD criteria counts below were read on the VA
//     National Center for PTSD page (updated 2026-09-28), which says the
//     criteria "remained unchanged in DSM-5-TR (2022)"; the substance use
//     disorder severity counts on NIAAA's DSM-5 comparison page (updated
//     April 2021; DSM-5, not DSM-5-TR -- that the counts carried over into
//     DSM-5-TR is our inference, not read in the manual).
//
// Outline statements: each unit carries its domain's lettered tasks as
// `outline` (REQ-235), so the lesson writer and the fact-checker work from
// NBCC's own headings. They are short task headings only, as the Security+
// unit sources carry CompTIA's; the objectives are our own wording and copy
// no NBCC description text.
//
// Five objectives have exact titles because the client-session sims attach
// to them by title (lib/sim/documents.ts, NBCC_OBJECTIVES):
//   NCE    "Manage boundaries and multiple relationships under the ACA Code of Ethics"
//          (Professional Practice and Ethics: C, D, P, V)
//          "Screen for substance use and match the client to a level of care"
//          (Intake, Assessment, and Diagnosis: H, M, P)
//   NCMHCE "Conduct an intake and reach a DSM-5-TR diagnosis in a counseling case"
//          (Intake, Assessment, and Diagnosis: A, B, E, F, G)
//          "Assess suicide risk and build a safety plan in a counseling session"
//          (Intake, Assessment, and Diagnosis: S; Counseling Skills V)
//          "Build a trauma-informed treatment plan with the client"
//          (Treatment Planning: A, B, C, D, L; Intake O)
//
// Modeling: as the EPPP -- NBCC administers the exams states require for
// counselor licensure, so credential_basis 'regulatory_licensure' with the
// exam's own name as its code. requiresAcknowledgement (the study notice) as
// for every clinical course; the mature-content gate is keyed on the category.
//
// Trademarks: NBCC's documents mark both names (NCE®, NCMHCE®). The titles
// follow the EPPP's "Prep for the ..." pattern and the descriptions carry an
// independence statement.

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-11";
const VERIFIED_AT = "2026-11-11T00:00:00Z";
// Before NBCC's 2027-07-01 blueprint change (header).
const REVIEW_DUE_AT = "2027-04-01T00:00:00Z";
const RECHECK = "2027-04-01";

const NCE_OUTLINE_URL = "https://www.nbcc.org/assets/exam/nce_content_outline.pdf";
const NCMHCE_OUTLINE_URL = "https://www.nbcc.org/assets/exam/ncmhce_content_outline.pdf";

// REQ-165: the key only marks the course as gated (the study notice); the
// same key the EPPP uses.
const MENTAL_HEALTH_DISCLAIMER_KEY = "mental-health-clinical-content";

const src = (title: string, url: string, kind: UnitSource["kind"], recheckBy?: string, extra: Partial<UnitSource> = {}): UnitSource => ({
  title,
  ...source(url, kind, CHECKED, recheckBy),
  ...extra,
});

// The domains' lettered tasks, as printed in both outlines (the NCMHCE's
// wording differs from the NCE's in a few headings, noted where it does).
const OUTLINE = {
  ethics: [
    "A. Assess your (the counselor) competency to work with a specific client",
    "B. Understand statistical concepts and methods in research",
    "C. Practice legal and ethical counseling",
    "D. Clarify counselor-client roles",
    "E. Discuss client's rights and responsibilities",
    "F. Discuss limits of confidentiality",
    "G. Explain counselor agency policies",
    "H. Review payment, fees, and insurance benefits",
    "I. Explain counseling processes, procedures, risks, and benefits",
    "J. Explain uses and limits of social media",
    "K. Inform clients about the legal aspects of counseling",
    "L. Obtain informed consent",
    "M. Discuss confidentiality as it applies to electronic communication",
    "N. Establish group rules, expectations, and termination criteria",
    "O. Assess competency to provide informed consent",
    "P. Monitor the therapeutic relationship and build trust as needed",
    "Q. Review client records",
    "R. Provide adequate accommodations for clients with disabilities",
    "S. Provide information to third parties",
    "T. Provide referral sources if counseling services are inadequate/inappropriate",
    "U. Advocate for professional and client issues",
    "V. Seek supervision/consultation (NCMHCE: Supervision)",
    "W. Create and maintain documentation appropriate for each aspect of the counseling process",
    "X. Awareness and practice of self-care",
  ],
  intake: [
    "A. Conduct a biopsychosocial interview",
    "B. Conduct a diagnostic interview",
    "C. Conduct cultural formulation interview",
    "D. Conduct an initial interview",
    "E. Determine diagnosis",
    "F. Perform a Mental Status Exam (MSE)",
    "G. Consider co-occurring diagnoses",
    "H. Determine level of care needed",
    "I. Determine the appropriate modality of treatment",
    "J. Assess the presenting problem and level of distress",
    "K. Evaluate an individual's level of mental health functioning",
    "L. Screen clients for appropriate services",
    "M. Select, use, and interpret appropriate assessment instruments",
    "N. Use formal and informal observations",
    "O. Assess for trauma",
    "P. Assess substance use",
    "Q. Obtain client self-reports",
    "R. Evaluate interactional dynamics",
    "S. Conduct ongoing assessment for at-risk behaviors (i.e., suicide, homicide, self/other injury, and relationship violence)",
    "T. Use pre-test and post-test measures to assess outcomes",
    "U. Evaluate counseling effectiveness",
  ],
  focus: [
    "A. Adjustment related to physical loss/injury/medical condition (NCMHCE: illness)",
    "B. Aging/geriatric concerns",
    "C. Behavioral problems",
    "D. Bullying",
    "E. Caregiving concerns",
    "F. Cultural adjustments",
    "G. End-of-life issues",
    "H. Fear and panic",
    "I. Financial issues",
    "J. Gender identity development",
    "K. Grief/loss",
    "L. Hopelessness/depression",
    "M. Loneliness/attachment",
    "N. Hyper/hypo mental focus",
    "O. Intellectual functioning issues",
    "P. Insomnia/sleep issues",
    "Q. Maladaptive eating behaviors",
    "R. Remarriage/recommitment",
    "S. Developmental processes/tasks/issues",
    "T. Obsessive thoughts/behaviors",
    "U. Occupation and career development",
    "V. Physical issues related to anxiety",
    "W. Physical issues related to depression",
    "X. Physical/emotional issues related to trauma",
    "Y. Process addictions (pornography, gambling)",
    "Z. Racism/discrimination/oppression",
    "AA. Religious values conflict",
    "AB. Retirement concerns",
    "AC. Ruminating and/or intrusive thoughts",
    "AD. Separation from primary caregivers",
    "AE. Sexual functioning concerns",
    "AF. Sleeping habits",
    "AG. Spiritual/existential concerns",
    "AH. Stress management",
    "AI. Substance use/addiction issues",
    "AJ. Suicidal thoughts/behaviors",
    "AK. Terminal illness issues",
    "AL. Visual/auditory hallucinations",
    "AM. Worry and anxiety",
    "AN. Adoption issues",
    "AO. Blended family issues",
    "AP. Child abuse-related concerns",
    "AQ. Child development issues",
    "AR. Dating/relationship problems",
    "AS. Divorce",
    "AT. Family abuse/violence (e.g., physical, sexual, emotional)",
    "AU. Interpersonal partner violence concerns",
    "AV. Marital/partner communication problems",
    "AW. Parenting/co-parenting conflicts",
    "AX. Emotional dysregulation",
  ],
  planning: [
    "A. Collaborate with client to establish treatment goals and objectives",
    "B. Establish short- and long-term counseling goals consistent with clients' diagnoses",
    "C. Identify barriers affecting client goal attainment",
    "D. Identify strengths that improve the likelihood of goal attainment",
    "E. Refer to different levels of treatment (e.g., outpatient, inpatient, residential, etc.)",
    "F. Refer to others for concurrent treatment",
    "G. Guide treatment planning",
    "H. Discuss termination process and issues",
    "I. Discuss transitions in group membership",
    "J. Follow-up after discharge",
    "K. Use assessment instrument results to facilitate client decision making",
    "L. Review and revise the treatment plan",
    "M. Engage clients in review of progress toward treatment goals",
    "N. Collaborate with other providers and client support systems (documentation and report writing)",
    "O. Discuss with clients the integration and maintenance of therapeutic progress",
    "P. Educate client to the value of treatment plan compliance",
  ],
  skills: [
    "A. Align intervention with client's developmental level",
    "B. Align intervention with counseling modality (individual, couple, family, or group)",
    "C. Align intervention with client population (e.g., veterans, minorities, disenfranchised, disabled)",
    "D. Implement individual counseling in relation to a plan of treatment",
    "E. Establish therapeutic alliance",
    "F. Apply theory-based counseling intervention(s)",
    "G. Address addiction issues",
    "H. Address cultural considerations",
    "I. Address family composition and cultural considerations",
    "J. Evaluate and explain systemic patterns of interaction",
    "K. Explore family member interaction",
    "L. Explore religious and spiritual values",
    "M. Guide clients in the development of skills or strategies for dealing with their problems",
    "N. Help clients develop support systems",
    "O. Help facilitate clients' motivation to make the changes they desire",
    "P. Improve interactional patterns",
    "Q. Provide crisis intervention",
    "R. Educate client about transference and defense mechanisms",
    "S. Facilitate trust and safety",
    "T. Build communication skills",
    "U. Develop conflict resolution strategies",
    "V. Develop safety plans",
    "W. Facilitate systemic change",
    "X. Provide distance counseling or telemental health",
    "Y. Provide education resources (e.g., stress management, assertiveness training, divorce adjustment)",
    "Z. Provide psychoeducation for client",
    "AA. Summarize",
    "AB. Reframe/redirect",
    "AC. Facilitate empathic responses",
    "AD. Use self-disclosure",
    "AE. Use constructive confrontation",
    "AF. Facilitate awareness of here-and-now interactions",
    "AG. Facilitate resolution of interpersonal conflict",
    "AH. Use linking and blocking in a group context",
    "AI. Management of leader-member dynamics",
    "AJ. Model giving and receiving of feedback",
    "AK. Address impact of extended families",
    "AL. Contain and manage intense feelings",
    "AM. Explore the influence of family of origin patterns and themes",
    "AN. Address the impact of social support network",
    "AO. Use \"structured\" activities",
    "AP. Promote and encourage interactions among group members",
    "AQ. Promote and encourage interactions with the group leader",
    "AR. Use psychoeducation as a part of the group process",
    "AS. Explain phases in the group process",
    "AT. Identify and discuss group themes and patterns",
    "AU. Create intervention based on the stage of group development",
    "AV. Challenge harmful group member behaviors",
    "AW. Address the potential interaction of members outside of the group",
  ],
  attributes: [
    "A. Awareness of self and impact on clients",
    "B. Genuineness",
    "C. Congruence",
    "D. Demonstrate knowledge of and sensitivity to gender orientation and gender issues",
    "E. Demonstrate knowledge of and sensitivity to multicultural issues",
    "F. Demonstrate conflict tolerance and resolution",
    "G. Empathic attunement",
    "H. Empathic responding",
    "I. Foster the emergence of group therapeutic factors",
    "J. Non-judgmental stance",
    "K. Positive regard",
    "L. Respect and acceptance for diversity",
    "M. Use foundational listening, attending, and reflecting skills",
  ],
} as const;

const DOMAIN_NUMBER = { ethics: 1, intake: 2, focus: 3, planning: 4, skills: 5, attributes: 6 } as const;
type Domain = keyof typeof OUTLINE;

const nceOutline = (d: Domain): UnitSource =>
  src(`NBCC, NCE Content Outline (2023), Domain ${DOMAIN_NUMBER[d]}`, NCE_OUTLINE_URL, "exam_outline", RECHECK, { outline: [...OUTLINE[d]] });
const ncmhceOutline = (d: Domain): UnitSource =>
  src(`NBCC, NCMHCE Content Outline (revised 2025-10-08), Domain ${DOMAIN_NUMBER[d]}`, NCMHCE_OUTLINE_URL, "exam_outline", RECHECK, { outline: [...OUTLINE[d]] });

export const NBCC_SOURCES = {
  ncmhceFormat: src("NBCC, NCMHCE Content Outline (revised 2025-10-08), examination format and case studies", NCMHCE_OUTLINE_URL, "exam_outline", RECHECK, {
    keyValues: [
      "11 case studies, one of them unscored; 130-150 multiple-choice items, of which 100 are scored, one point each",
      "each case study is one narrative in three sections -- an initial intake summary and two counseling sessions -- each followed by multiple-choice questions; 9-15 questions per case, four options, one correct answer, most at application level or higher",
      "Areas of Clinical Focus has no item-level weight: it is evaluated through the diagnoses and case scenarios on each form",
      "255 minutes in all (225 minutes of testing, one 15-minute break after the fifth case study)",
      "from 2027-07-01 a new blueprint applies (10 case studies, scaled score 100-500, 360 passing); teach the current format until then",
    ],
  }),
  nceFormat: src("NBCC, NCE Content Outline (2023) and NCE Candidate Handbook (revised 2024-09-24), examination form", NCE_OUTLINE_URL, "exam_outline", RECHECK, {
    keyValues: [
      "200 multiple-choice items, 160 scored and 40 unscored field-test items mixed in; answer choices A-D",
      "225 minutes of testing in a 255-minute session, one 15-minute break after question 100",
      "the cut score is set by a modified Angoff method and equated per form; it can differ slightly between forms",
      "from 2027-07-01 a new blueprint applies (170 items with three options, scaled score 100-500, 360 passing); teach the current form until then",
    ],
  }),
  spec2027: src("NBCC, NCE and NCMHCE Examination Specifications, effective July 1, 2027", "https://www.cce-global.org/Assets/exams/NCE_exam_spec_2027.pdf", "exam_outline", RECHECK),
  acaCode: src("ACA Code of Ethics (2014), current per counseling.org (a revision is pending Board adoption)", "https://www.counseling.org/docs/default-source/default-document-library/ethics/2014-aca-code-of-ethics.pdf", "reference", "2027-02-01", {
    keyValues: [
      "A.5.c: sexual and/or romantic relationships with former clients, their romantic partners or family members are prohibited for 5 years after the last professional contact",
      "A.5.e: no personal virtual relationship (social media) with a current client",
      "A.6.b-c: before extending a boundary (a ceremony, buying a client's service), weigh risks and benefits, take precautions (informed consent, consultation, supervision, documentation) and document the rationale beforehand when feasible",
      "A.10.f: whether to accept a gift weighs the relationship, its monetary value, the client's motivation and the counselor's own",
      "B.2.a: confidentiality does not apply when disclosure is required to protect clients or identified others from serious and foreseeable harm or the law requires it; consult when in doubt",
    ],
  }),
  // Not re-read in this batch: the EPPP batch read it on 2026-11-10.
  dsm: {
    title: "American Psychiatric Association, DSM-5-TR (2022), current edition per psychiatry.org",
    ...source("https://www.psychiatry.org/Patients-Families/What-is-the-DSM", "reference", "2026-11-10"),
  },
  ptsd: src("VA National Center for PTSD, PTSD and DSM-5 (updated 2026-09-28)", "https://www.ptsd.va.gov/professional/treat/essentials/dsm5_ptsd.asp", "clinical_guideline", undefined, {
    keyValues: [
      "PTSD requires at least 1 intrusion, 1 avoidance, 2 negative cognition and mood, and 2 arousal and reactivity symptoms, lasting more than one month; the criteria are unchanged in DSM-5-TR",
    ],
  }),
  sud: src("NIAAA, Alcohol Use Disorder: A Comparison Between DSM-IV and DSM-5 (updated April 2021)", "https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/alcohol-use-disorder-comparison-between-dsm", "reference", undefined, {
    keyValues: ["11 criteria within the same 12 months; mild 2-3, moderate 4-5, severe 6 or more (DSM-5; assumed unchanged in DSM-5-TR, not read in the manual)"],
  }),
  waRule: src("Washington WAC 246-809-240: mental health counselor examination (NCE or NCMHCE, NBCC's passing score)", "https://app.leg.wa.gov/wac/default.aspx?cite=246-809-240", "reference"),
} as const;

const S = NBCC_SOURCES;

const DESCRIPTION_TAIL =
  "Includes frank clinical material (suicide risk, abuse, substance use, trauma) where the exam tests it, behind an 18+ content notice. Independently developed exam prep; not affiliated with or endorsed by the National Board for Certified Counselors (NBCC).";

const nbccCredential = (o: {
  slug: string;
  name: string;
  code: string;
  url: string;
  outlineUrl: string;
  revision: string;
  objectivesRevision: string;
  versionNote: string;
  format: string;
  passing: string;
  publishedWeightsNote?: string;
}): SeedTrack["credential"] => ({
  providerSlug: "nbcc",
  providerName: "National Board for Certified Counselors",
  providerUrl: "https://www.nbcc.org/",
  subcategorySlug: "counseling-licensure",
  credentialType: "licensure_examination",
  credentialSlug: o.slug,
  credentialName: o.name,
  credentialUrl: o.url,
  basis: "regulatory_licensure",
  examCode: o.code,
  examRevision: o.revision,
  standardName: `${o.code} content outline`,
  standardRevision: o.revision,
  objectivesRevision: o.objectivesRevision,
  versionNote: o.versionNote,
  status: "active",
  officialObjectivesUrl: o.outlineUrl,
  lastVendorVerifiedAt: VERIFIED_AT,
  recommendedExperience:
    "Eligibility is decided by the counseling licensing board where you apply, which approves you to test (a test authorization window of up to six months); NBCC's minimally qualified candidate has graduated from, or is well advanced in, a counseling graduate program accredited by CACREP or housed in an institutionally accredited university. In Washington, a mental health counselor applicant must pass the NCE or the NCMHCE, and the Department of Health accepts NBCC's passing score (WAC 246-809-240). Check which exam your state requires.",
  durationMinutes: 255,
  questionFormat: o.format,
  passingScorePolicy: o.passing,
  ...(o.publishedWeightsNote ? { publishedWeightsNote: o.publishedWeightsNote } : {}),
});

const NCE_VERSION_NOTE =
  "NBCC prints no version number; the content outline is the 2023 document (job analysis finalized June 2019). NBCC's specifications for a new blueprint take effect 2027-07-01; this course teaches the current outline and is due for review by 2027-04-01.";
const NCMHCE_VERSION_NOTE =
  "NBCC prints no version number; the content outline was revised 2025-10-08 (job analysis finalized June 2019, blueprint finalized 2021). NBCC's specifications for a new blueprint take effect 2027-07-01; this course teaches the current outline and is due for review by 2027-04-01.";

// ---------------------------------------------------------------------------
// Objectives shared by both courses (the outlines have the same six domains
// and the same tasks; the courses differ in weights and format). Each array
// is one domain, in the domain's order; comments name the outline letters.
// ---------------------------------------------------------------------------
export const NCE_SIM_OBJECTIVES = {
  boundaries: "Manage boundaries and multiple relationships under the ACA Code of Ethics",
  substance: "Screen for substance use and match the client to a level of care",
} as const;
export const NCMHCE_SIM_OBJECTIVES = {
  intake: "Conduct an intake and reach a DSM-5-TR diagnosis in a counseling case",
  suicide: "Assess suicide risk and build a safety plan in a counseling session",
  trauma: "Build a trauma-informed treatment plan with the client",
} as const;

const ETHICS = [
  // C, K
  "Apply the ACA Code of Ethics (2014) and the law to a counseling decision, and work through an ethical decision-making model when they conflict",
  // L, I, E, O
  "Obtain informed consent: the counseling process, risks and benefits, rights and responsibilities, and the client's capacity to consent",
  // F, M, S
  "Explain the limits of confidentiality, including electronic communication and release of information to third parties",
  // A, T
  "Assess your competence to work with a client and refer when services would be inadequate or inappropriate",
  // D, J, G, H
  "Clarify roles, agency policies, fees and insurance, and the uses and limits of social media at the start of counseling",
  // N
  "Set group rules, expectations and termination criteria",
  // R, U
  "Provide accommodations for clients with disabilities and advocate for clients and the profession",
  // V, X
  "Use supervision and consultation, and recognize and manage your own impairment through self-care",
  // W, Q
  "Create and maintain records appropriate to each stage of counseling, and review existing client records",
  // B
  "Interpret basic research and statistics -- reliability, validity, significance and effect size -- to judge evidence for practice",
];

const INTAKE = [
  // A, D
  "Conduct a biopsychosocial and initial interview that gathers the presenting problem, history and context",
  // C
  "Use the cultural formulation interview to understand the client's own explanation of the problem",
  // F, N
  "Perform and record a mental status examination from formal and informal observation",
  // B, E, G
  "Make a differential diagnosis with DSM-5-TR, including co-occurring disorders and medical rule-outs",
  // M, Q, T, U
  "Select, administer and interpret screening and outcome instruments, and use them to evaluate counseling effectiveness",
  // O
  "Assess for trauma and its effects without retraumatizing the client",
  // H, I, L
  "Determine the level of care and treatment modality a client needs",
  // R, J, K
  "Evaluate distress, functioning and interactional dynamics in individuals, couples and families",
];

const FOCUS = [
  // L, AJ, AC
  "Recognize depression, hopelessness and ruminative thinking and the risk they carry",
  // H, V, AM, T
  "Recognize anxiety, panic and obsessive-compulsive presentations and their physical effects",
  // X, AP, AT, AU
  "Recognize the effects of trauma, child abuse and family or partner violence",
  // AI, Y
  "Recognize substance use and process addictions and how they co-occur with other concerns",
  // K, G, AK, A
  "Assess grief, loss, terminal illness and adjustment to medical conditions",
  // S, AQ, AD, B, AB
  "Identify developmental tasks and issues across the lifespan, from separation in childhood to aging and retirement",
  // AR, AS, AV, AW, AO, R, AN
  "Assess couple and family concerns: communication, divorce, co-parenting, blended families and adoption",
  // F, J, Z, AA, AG
  "Assess cultural adjustment, gender identity development, discrimination and religious or spiritual concerns",
  // P, AF, Q, AE
  "Recognize sleep problems, maladaptive eating and sexual functioning concerns",
  // AL, N, O, AX
  "Recognize hallucinations, problems of focus, intellectual disability and emotional dysregulation, and when to refer",
  // C, D, E, I, M, U, AH
  "Assess behavior problems, bullying, caregiving and financial stress, loneliness and career concerns",
];

const PLANNING = [
  // A, B
  "Write measurable short- and long-term goals with the client that fit the diagnosis",
  // C, D
  "Identify barriers and strengths that affect goal attainment",
  // E, F, N
  "Refer to other levels of care or concurrent treatment and coordinate with other providers",
  // L, M, K
  "Review progress with the client and revise the treatment plan using assessment results",
  // H, I, J, O
  "Plan termination, transitions and follow-up, and help the client maintain progress",
  // P, G
  "Educate the client about the plan and address ambivalence about following it",
];

const SKILLS = [
  // E, S, AC
  "Establish a therapeutic alliance through trust, safety and empathic responding",
  // F, D
  "Apply theory-based interventions -- cognitive-behavioral, person-centered, solution-focused and others -- within a treatment plan",
  // A, B, C, H, I
  "Align interventions with development, modality, population and culture",
  // O, G
  "Use motivational interviewing to help a client resolve ambivalence about change",
  // Q, AL
  "Provide crisis intervention and contain intense feelings",
  // V
  "Develop a collaborative safety plan with a client at risk",
  // M, T, U, Y, Z
  "Teach coping, communication and conflict-resolution skills and provide psychoeducation",
  // AA, AB, AE, AD, AF, R
  "Use summarizing, reframing, confrontation, self-disclosure and immediacy appropriately",
  // J, K, P, W, AK, AM, AN, N
  "Assess and change family and systemic patterns, including family of origin and support networks",
  // L
  "Explore religious and spiritual values when they bear on the client's concerns",
  // AH, AI, AJ, AP, AQ, AR, AV, AW
  "Lead a group: linking and blocking, feedback, member interaction and harmful member behaviors",
  // AS, AT, AU, I
  "Choose group interventions for the stage of group development and its themes",
  // X
  "Provide telemental health and distance counseling safely and ethically",
];

const ATTRIBUTES = [
  // A
  "Recognize your own values and reactions and their impact on a client, including countertransference",
  // B, C, K, J
  "Show genuineness, congruence, positive regard and a nonjudgmental stance",
  // G, H, M
  "Respond with empathic attunement using foundational listening, attending and reflecting skills",
  // D, E, L
  "Demonstrate cultural humility and sensitivity to gender, sexual orientation and diversity",
  // F
  "Tolerate conflict in the counseling relationship and work it through",
  // I
  "Foster the therapeutic factors that make groups work",
];

const unitWith = (base: string[], extra: string[]): string[] => [...base, ...extra];

export const NCE_TRACK: SeedTrack = {
  code: "NCE",
  title: "Prep for the NCE",
  description: `Preparation for the National Counselor Examination: NBCC's six domains, from professional practice and ethics to counseling skills and interventions, weighted as the exam weights them, with the eight CACREP core areas the questions align to. ${DESCRIPTION_TAIL} NCE is a registered trademark of NBCC.`,
  trackType: "certification",
  subcategorySlug: "counseling-licensure",
  freshnessModel: "certification_aligned",
  sourceUrl: NCE_OUTLINE_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: MENTAL_HEALTH_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: nbccCredential({
    slug: "nce",
    name: "National Counselor Examination (NCE)",
    code: "NCE",
    url: "https://www.nbcc.org/nce",
    outlineUrl: NCE_OUTLINE_URL,
    revision: "NCE content outline (2023; job analysis June 2019)",
    objectivesRevision: "Six domains, tasks lettered A-X / A-U / A-AX / A-P / A-AW / A-M",
    versionNote: NCE_VERSION_NOTE,
    format:
      "200 multiple-choice items with four answer choices, of which 160 are scored and 40 are unscored field-test items you cannot tell apart, in one non-sectioned exam: 225 minutes of testing in a 255-minute session, with one 15-minute break after question 100. Computer-based at Pearson VUE or online (OnVUE). (NBCC NCE content outline, 2023; candidate handbook, revised 2024-09-24.) A new blueprint with 170 three-option items takes effect 2027-07-01.",
    passing:
      "Each scored item is one point (160 in all). NBCC sets the cut score with a modified Angoff method and equates it across forms, so it can differ slightly from form to form; your score report shows it. A candidate who does not pass may retest after 30 days, within the state board's limits. From 2027-07-01 scores are scaled 100-500 with 360 passing.",
  }),
  units: [
    {
      title: "Professional Practice and Ethics",
      rangeLabel: "12% of the exam",
      weight: 12,
      gate: "Given a fictional ethical or legal dilemma, name the ACA Code standards and laws in play, work through a decision model, and choose the action that protects the client, including what you say about consent, confidentiality and roles.",
      sources: [nceOutline("ethics"), S.acaCode, S.waRule],
      objectives: unitWith(ETHICS, [NCE_SIM_OBJECTIVES.boundaries]),
    },
    {
      title: "Intake, Assessment, and Diagnosis",
      rangeLabel: "12% of the exam",
      weight: 12,
      gate: "Given a fictional intake, gather the history, run a mental status exam and the right screens, reach and defend a DSM-5-TR differential diagnosis, assess risk, and recommend a level of care.",
      sources: [nceOutline("intake"), S.dsm, S.sud],
      objectives: unitWith(INTAKE, [
        // S
        "Assess risk of suicide, homicide, self-injury and relationship violence at intake and throughout counseling",
        NCE_SIM_OBJECTIVES.substance,
      ]),
    },
    {
      title: "Areas of Clinical Focus",
      rangeLabel: "29% of the exam",
      weight: 29,
      gate: "Given a fictional client's presenting concern from the outline's list -- grief, panic, trauma, a family conflict, substance use, a sleep or eating problem -- recognize what it is, what else it could be, and the counseling approach that fits.",
      sources: [nceOutline("focus"), S.dsm, S.ptsd],
      objectives: FOCUS,
    },
    {
      title: "Treatment Planning",
      rangeLabel: "9% of the exam",
      weight: 9,
      gate: "Given a fictional case, write a treatment plan with the client -- measurable goals, strengths, barriers, referrals and a review point -- and plan the termination.",
      sources: [nceOutline("planning")],
      objectives: PLANNING,
    },
    {
      title: "Counseling Skills and Interventions",
      rangeLabel: "30% of the exam",
      weight: 30,
      gate: "Given a fictional session, choose and deliver the response or intervention that fits the client, the modality and the stage of counseling or of the group, and justify it with theory.",
      sources: [nceOutline("skills")],
      objectives: SKILLS,
    },
    {
      title: "Core Counseling Attributes",
      rangeLabel: "8% of the exam",
      weight: 8,
      gate: "Given a fictional exchange, recognize what the counselor's response shows about empathy, genuineness, cultural humility and self-awareness, and give a better response.",
      sources: [nceOutline("attributes"), S.acaCode],
      objectives: ATTRIBUTES,
    },
  ],
};

export const NCMHCE_TRACK: SeedTrack = {
  code: "NCMHCE",
  title: "Prep for the NCMHCE",
  description: `Preparation for the National Clinical Mental Health Counseling Examination: clinical case studies, each an intake summary and two counseling sessions, testing NBCC's domains from intake, assessment and diagnosis to counseling skills and interventions, weighted as the exam weights them. ${DESCRIPTION_TAIL} NCMHCE is a registered trademark of NBCC.`,
  trackType: "certification",
  subcategorySlug: "counseling-licensure",
  freshnessModel: "certification_aligned",
  sourceUrl: NCMHCE_OUTLINE_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: MENTAL_HEALTH_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: nbccCredential({
    slug: "ncmhce",
    name: "National Clinical Mental Health Counseling Examination (NCMHCE)",
    code: "NCMHCE",
    url: "https://www.nbcc.org/exams/ncmhce",
    outlineUrl: NCMHCE_OUTLINE_URL,
    revision: "NCMHCE content outline (revised 2025-10-08; blueprint 2021)",
    objectivesRevision: "Six domains, tasks lettered A-X / A-U / A-AX / A-P / A-AW / A-M",
    versionNote: NCMHCE_VERSION_NOTE,
    format:
      "11 clinical case studies, one of them unscored. Each case is one narrative told in three sections -- an initial intake summary and two later counseling sessions -- and each section is followed by multiple-choice questions about it: 9 to 15 per case, each with four options and one correct answer, most asking you to apply or evaluate rather than recall. 130-150 items in all, 100 scored. 225 minutes of testing in a 255-minute session, with one 15-minute break after the fifth case. (NBCC NCMHCE content outline, revised 2025-10-08; candidate handbook, 2025.) From 2027-07-01 the exam has 10 case studies.",
    passing:
      "Each of the 100 scored items is one point. NBCC sets the cut score by standard setting and equates it across forms, so it can differ slightly from form to form. A candidate who does not pass may retest after 30 days, within the state board's approval window. From 2027-07-01 scores are scaled 100-500 with 360 passing.",
  }),
  units: [
    {
      title: "Professional Practice and Ethics",
      rangeLabel: "15% of the exam",
      weight: 15,
      gate: "Given a fictional case, spot the ethical and legal issue in the narrative -- consent, confidentiality, competence, roles, records -- and choose what the counselor does next under the ACA Code of Ethics and the law.",
      sources: [ncmhceOutline("ethics"), S.acaCode, S.waRule, S.ncmhceFormat],
      objectives: ETHICS,
    },
    {
      title: "Intake, Assessment, and Diagnosis",
      rangeLabel: "25% of the exam",
      weight: 25,
      gate: "Given a fictional intake summary, decide what else to ask, which screens to use, the DSM-5-TR diagnosis and its differentials, the risk, and the level of care, and defend each choice from the narrative.",
      sources: [ncmhceOutline("intake"), S.dsm, S.ptsd, S.sud, S.ncmhceFormat],
      objectives: unitWith(INTAKE, [NCMHCE_SIM_OBJECTIVES.intake, NCMHCE_SIM_OBJECTIVES.suicide]),
    },
    {
      title: "Areas of Clinical Focus",
      rangeLabel: "Assessed through the case studies, not item by item",
      weight: 0,
      gate: "Given a fictional case narrative, name the main clinical concern from the outline's list and how it changes the assessment, diagnosis and plan the questions will ask about.",
      sources: [ncmhceOutline("focus"), S.dsm, S.ptsd, S.ncmhceFormat],
      objectives: FOCUS,
    },
    {
      title: "Treatment Planning",
      rangeLabel: "15% of the exam",
      weight: 15,
      gate: "Given a fictional case, build the treatment plan with the client from the intake, then revise it at the next session from what changed.",
      sources: [ncmhceOutline("planning"), S.ncmhceFormat],
      objectives: unitWith(PLANNING, [NCMHCE_SIM_OBJECTIVES.trauma]),
    },
    {
      title: "Counseling Skills and Interventions",
      rangeLabel: "30% of the exam",
      weight: 30,
      gate: "Given a fictional counseling session from a case, choose the intervention that fits the client's diagnosis, stage of change and culture, and say what you expect it to do.",
      sources: [ncmhceOutline("skills"), S.ncmhceFormat],
      objectives: SKILLS,
    },
    {
      title: "Core Counseling Attributes",
      rangeLabel: "15% of the exam",
      weight: 15,
      gate: "Given a fictional session, recognize the counselor's reactions and stance and choose the response that shows empathy, genuineness and cultural humility.",
      sources: [ncmhceOutline("attributes"), S.acaCode, S.ncmhceFormat],
      objectives: ATTRIBUTES,
    },
  ],
};

export const NBCC_TRACKS: readonly SeedTrack[] = [NCE_TRACK, NCMHCE_TRACK];
