// REQ-224 (batch EPPP-A, Nick 2026-11-10): the first course of the mental
// health wave (NCE, NCMHCE, ASWB Clinical, EPPP and a Washington psychology
// jurisprudence course; EPPP first). Lives under the Mental Health category
// (migration 077), whose courses sit behind the 18+ mature-content
// confirmation (lib/mature-content.ts).
//
// What was read, and when (all 2026-11-10, in ASPPB's and the boards' own
// documents unless marked otherwise):
//   - ASPPB, "Examination for Professional Practice in Psychology (EPPP)
//     Content Areas" (https://asppb.net/?p=235; page metadata last updated
//     2026-02-11). The eight Part 1-Knowledge domains and their weights
//     (10 / 13 / 11 / 12 / 16 / 15 / 7 / 16, summing to 100) and knowledge
//     statements KN1-KN71. Every unit below is one domain at its published
//     weight; every objective sits under one or more of that domain's
//     knowledge statements (the KN numbers are in the comments). The page
//     prints no version or effective date.
//   - ASPPB, "EPPP Candidate Handbook" (May 2024 edition, the PDF at
//     asppb.net/wp-content/uploads/EPPP-Candidate-Handbook.pdf): Part 1 is
//     225 items, 175 scored and 50 unscored pretest, four options with one
//     correct answer (p.6), 4 hours 15 minutes (p.12); scaled scores
//     200-800, ASPPB recommends 500 for independent practice and 450 for
//     supervised practice, each board sets its own standard (pp.15-16).
//     Corroborated by the Oregon Board of Psychology's EPPP FAQ (rev.
//     07/2025): 225 questions, 50 unscored, 4 h 15 min. NOT READ: ASPPB's
//     handbook page now links an "integrated EPPP" handbook dated October
//     2026, which the fetch tool could not open; if it changes the Part 1
//     figures, this file is out of date.
//   - ASPPB, "Future EPPP Content Areas" (https://asppb.net/?p=2243) and
//     the EPPP exam page: the integrated EPPP (one exam, six domains)
//     replaces Parts 1 and 2 in the fourth quarter of 2027 (no day given);
//     candidates who have not passed a part by then may retake it through
//     2028-03-31, and from 2028-04-01 the integrated exam is the only one.
//     So contentReviewDueAt is 2027-06-01, well before the switch, and the
//     credential's retirementDate is 2028-03-31, the last day anyone can sit
//     Part 1. A Part 1 learner who tests in 2026-2027 is exactly who this
//     course serves.
//   - Washington: WAC 246-924-070 as amended by WSR 25-15-068 (filed
//     2025-07-14, effective 2025-08-14): the applicant must "complete and
//     pass the Examination of Professional Practice of Psychology (EPPP)"
//     with "a scaled score of at least 500". The rule does not mention Part
//     2-Skills, and the Department of Health's psychologist licensing page
//     (read 2026-11-10) does not either. A prep provider's list (AATBS,
//     undated) names D.C., Newfoundland and Labrador and Prince Edward
//     Island as the jurisdictions requiring Part 2, not Washington.
//     Inference, not verified against a primary list: Washington requires
//     Part 1 only. The jurisdiction's own board is the authority, and
//     questionFormat says so.
//   - APA, "Ethical Principles of Psychologists and Code of Conduct"
//     (https://www.apa.org/ethics/code): adopted 2002-08-21, effective
//     2003-06-01, amended 2010 (effective 2010-06-01) and 2016 (effective
//     2017-01-01). APA's Ethics Code Task Force page (updated July 2026)
//     says a revision is in review, with comment review expected to finish
//     in late 2026 or early 2027; no new code has been adopted. Recheck by
//     2027-05-01.
//   - DSM-5-TR (American Psychiatric Association, 2022), the current
//     edition per psychiatry.org's "What is the DSM?" (physician-reviewed
//     April 2025). The manual itself is copyrighted and was not read here;
//     objectives name it and teach how to use criteria, never reproduce
//     criteria text.
//
// Objectives are our own wording, built from the knowledge statements; no
// ASPPB text is copied beyond short domain names. No dose, cut score or
// prevalence figure is written into an objective; the lessons carry those,
// each with its source.
//
// Three objectives have exact titles because the clinical sims (built in a
// parallel batch) attach to them by title:
//   "Assess suicide risk and plan safety in a clinical interview" and
//   "Conduct a diagnostic intake using DSM-5-TR criteria" (Assessment and
//   Diagnosis: KN31 interviews, KN33 differential diagnosis, KN36
//   classification), and "Apply duty-to-warn and duty-to-protect
//   obligations" (Ethical, Legal and Professional Issues: KN63, KN64, KN68).
//
// Modeling: ASPPB is a licensing-board association and the EPPP is the exam
// boards require for licensure, so credential_basis 'regulatory_licensure'
// with the exam's own name as its code ("EPPP Part 1"), as the NCLEX tracks
// do. requiresAcknowledgement (the study notice) as for every clinical
// course; the mature-content gate is separate and keyed on the category.
//
// Trademarks: the asppb.net EPPP page shows "EPPP" with a registered mark.
// No ASPPB trademark guideline for prep providers was found (searched
// 2026-11-10), so the title follows Nick's "Prep for the ..." pattern and
// the description carries the same independence statement the NREMT
// courses use.

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-10";
const VERIFIED_AT = "2026-11-10T00:00:00Z";
const REVIEW_DUE_AT = "2027-06-01T00:00:00Z";

const CONTENT_AREAS_URL = "https://asppb.net/?p=235";
const HANDBOOK_URL = "https://asppb.net/wp-content/uploads/EPPP-Candidate-Handbook.pdf";

// REQ-165: the key only marks the course as gated (the study notice).
const MENTAL_HEALTH_DISCLAIMER_KEY = "mental-health-clinical-content";

const src = (title: string, url: string, kind: UnitSource["kind"], recheckBy?: string): UnitSource => ({
  title,
  ...source(url, kind, CHECKED, recheckBy),
});

export const EPPP_SOURCES = {
  contentAreas: src(
    "ASPPB, EPPP Content Areas (Part 1-Knowledge domains and weights; page updated 2026-02-11)",
    CONTENT_AREAS_URL,
    "exam_outline",
    // ASPPB switches to the integrated EPPP in Q4 2027.
    "2027-06-01"
  ),
  handbook: src("ASPPB, EPPP Candidate Handbook (May 2024 edition)", HANDBOOK_URL, "exam_outline", "2027-06-01"),
  apaCode: src(
    "APA, Ethical Principles of Psychologists and Code of Conduct (2002, amended 2010 and 2016, effective 2017-01-01)",
    "https://www.apa.org/ethics/code",
    "reference",
    // A revision is in review (APA Ethics Code Task Force, July 2026).
    "2027-05-01"
  ),
  apaTaskForce: src("APA, Ethics Code Task Force (revision status, updated July 2026)", "https://www.apa.org/ethics/task-force", "reference", "2027-05-01"),
  dsm: src(
    "American Psychiatric Association, DSM-5-TR (2022), current edition per psychiatry.org",
    "https://www.psychiatry.org/Patients-Families/What-is-the-DSM",
    "reference"
  ),
  waRule: src(
    "Washington WAC 246-924-070 as amended by WSR 25-15-068 (effective 2025-08-14): EPPP, scaled score 500",
    "https://lawfilesext.leg.wa.gov/law/wsrpdf/2025/15/25-15-068.pdf",
    "reference"
  ),
} as const;

const S = EPPP_SOURCES;

export const EPPP_TRACK: SeedTrack = {
  code: "EPPP",
  title: "Prep for the EPPP",
  description:
    "Preparation for the Examination for Professional Practice in Psychology, Part 1-Knowledge: ASPPB's eight content areas, from biological bases of behavior to ethical, legal and professional issues, weighted as the exam weights them. Includes frank clinical material (suicide risk, abuse, violence) where the exam tests it, behind an 18+ content notice. Independently developed exam prep; not affiliated with or endorsed by the Association of State and Provincial Psychology Boards (ASPPB). EPPP is a registered trademark of ASPPB.",
  trackType: "certification",
  subcategorySlug: "psychology-licensure",
  freshnessModel: "certification_aligned",
  sourceUrl: CONTENT_AREAS_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: MENTAL_HEALTH_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    providerSlug: "asppb",
    providerName: "Association of State and Provincial Psychology Boards",
    providerUrl: "https://asppb.net/",
    subcategorySlug: "psychology-licensure",
    credentialType: "licensure_examination",
    credentialSlug: "eppp-part-1",
    credentialName: "Examination for Professional Practice in Psychology (EPPP), Part 1-Knowledge",
    credentialUrl: "https://asppb.net/exams/asppb-examination-for-professional-psychology-eppp/",
    basis: "regulatory_licensure",
    examCode: "EPPP Part 1",
    examRevision: "Part 1-Knowledge content areas (ASPPB page updated 2026-02-11)",
    standardName: "EPPP Part 1-Knowledge content areas",
    standardRevision: "ASPPB content areas page, updated 2026-02-11",
    objectivesRevision: "KN1-KN71, eight domains",
    versionNote:
      "ASPPB prints no version or effective date on the content areas page; the page's last-updated date (2026-02-11) is recorded instead. Part 1 is replaced by the integrated EPPP in Q4 2027 (retakes to 2028-03-31).",
    status: "active",
    retirementDate: "2028-03-31",
    officialObjectivesUrl: CONTENT_AREAS_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Eligibility is decided by the psychology licensing board where you apply, which authorizes you to test (in Washington, the Department of Health after its credentialing review). Every ASPPB jurisdiction requires Part 1; a few also require Part 2-Skills, which can only be taken after passing Part 1. Washington's rule (WAC 246-924-070, effective 2025-08-14) requires the EPPP with a scaled score of at least 500 and does not mention Part 2; confirm with your board.",
    durationMinutes: 255,
    questionFormat:
      "225 multiple-choice items in 4 hours 15 minutes, of which 175 are scored and 50 are unscored pretest items you cannot tell apart; each item has four options and one correct answer. Computer-based at Pearson VUE. (ASPPB EPPP Candidate Handbook, May 2024.)",
    passingScorePolicy:
      "Scaled scores run from 200 to 800. ASPPB recommends 500 for independent practice and 450 for supervised practice; each jurisdiction sets its own passing standard. Washington requires a scaled score of at least 500 (WAC 246-924-070).",
  },
  units: [
    {
      title: "Biological Bases of Behavior",
      rangeLabel: "10% of the exam",
      weight: 10,
      gate: "Given a fictional client's symptoms, medications and test results, explain the likely biological contributors, what each medication does and risks, and what a scan or lab result can and cannot tell you.",
      sources: [S.contentAreas],
      objectives: [
        // KN1
        "Explain how neurotransmitter systems, brain structures and genetics contribute to perception, cognition, personality and mood in health and disease",
        "Relate common deficits -- aphasias, neglect, amnesia, executive dysfunction -- to the brain regions and lateralization usually involved",
        "Explain the stress response through the HPA axis and autonomic nervous system and how chronic stress affects health and behavior",
        // KN2
        "Describe the major psychotropic drug classes -- antidepressants, antipsychotics, mood stabilizers, anxiolytics and hypnotics, stimulants -- by mechanism, main uses and key adverse effects",
        "Recognize the effects of substances of abuse and of alternative or complementary agents, including intoxication, withdrawal and interaction risks",
        // KN3
        "Compare the evidence for medication, psychotherapy and combined treatment for common disorders as major trials and practice guidelines report it",
        // KN4
        "Explain twin, adoption and family designs and heritability, and what genetic findings can and cannot say about a disorder or an individual",
        // KN5
        "Describe what brain imaging, electrophysiology, therapeutic drug monitoring and genetic screening measure, and their limits as diagnostic evidence",
      ],
    },
    {
      title: "Cognitive-Affective Bases of Behavior",
      rangeLabel: "13% of the exam",
      weight: 13,
      gate: "Given a fictional behavior problem, explain it with the learning, memory, motivation or emotion theory that fits best, and design a change plan that follows from that theory.",
      sources: [S.contentAreas],
      objectives: [
        // KN6
        "Compare theories of intelligence -- general ability, hierarchical and multiple-factor models, triarchic and multiple-intelligences views -- and how each shapes assessment",
        // KN7
        "Apply classical conditioning: acquisition, extinction, spontaneous recovery, generalization and discrimination",
        "Apply operant conditioning: reinforcement and punishment, schedules of reinforcement, shaping and extinction bursts",
        "Apply observational and cognitive learning accounts to explain and change behavior",
        // KN8
        "Explain memory systems (sensory, working, long-term; explicit and implicit) and encoding, consolidation and retrieval",
        "Explain forgetting, interference and memory distortion, including suggestibility and false memories",
        // KN9
        "Compare theories of motivation: drive and arousal, incentive, self-determination and goal-setting",
        // KN10
        "Compare theories of emotion -- physiological, two-factor and appraisal accounts -- and models of emotion regulation",
        // KN11
        "Describe attention, perception, language and executive functioning, and judgment heuristics and biases in decision making",
        // KN12
        "Explain how cognition, behavior, affect, temperament and mood influence each other, as in cognitive models of depression and anxiety",
        // KN13
        "Explain how psychosocial factors such as stress, expectations and social context shape cognition and behavior",
      ],
    },
    {
      title: "Social and Cultural Bases of Behavior",
      rangeLabel: "11% of the exam",
      weight: 11,
      gate: "Given a fictional client, group or workplace, explain what is happening with social-psychological and cultural theory, and say how identity, privilege or oppression changes the picture.",
      sources: [S.contentAreas],
      objectives: [
        // KN14
        "Apply attribution theory and the common attribution errors to explain social judgments",
        "Explain how stereotypes, prejudice and discrimination form and what reduces them",
        "Explain attitude formation and change, including cognitive dissonance and persuasion",
        // KN15
        "Explain aggression, attraction, empathy and prosocial behavior, including bystander effects",
        // KN16
        "Explain group processes -- conformity, obedience, social facilitation and loafing, polarization, groupthink -- and leadership",
        "Apply systems thinking to families, schools and workplaces",
        // KN17
        "Compare personality theories and models: psychodynamic, trait (including the five-factor model), humanistic and social-cognitive",
        // KN18
        "Explain cultural and sociopolitical influences on behavior, including acculturation, worldview, privilege and religiosity",
        // KN19
        "Describe identity development models across diverse identities, and intersectionality and its psychological impact",
        // KN20
        "Explain the causes, forms and effects of oppression, including minority stress and microaggressions",
      ],
    },
    {
      title: "Growth and Lifespan Development",
      rangeLabel: "12% of the exam",
      weight: 12,
      gate: "Given a fictional person at any age, judge whether their development is typical, name the risk and protective factors in play, and explain it with the developmental theory that fits.",
      sources: [S.contentAreas],
      objectives: [
        // KN21
        "Describe typical physical, cognitive, social and emotional development from infancy through late adulthood",
        "Distinguish normal cognitive aging from mild neurocognitive disorder and dementia",
        // KN22
        "Explain how person-environment interaction -- temperament, goodness of fit, gene-environment correlation -- shapes development over time",
        // KN23
        "Compare developmental theories: Piaget, Vygotsky, Erikson, information processing and ecological systems",
        "Explain attachment theory and attachment patterns and what they predict later in life",
        "Compare theories of moral development",
        // KN24
        "Explain how diverse identities, including gender and sexual identity, develop and influence development",
        // KN25
        "Describe how family structure and functioning -- parenting styles, divorce, the family life cycle -- affect development across the lifespan",
        // KN26
        "Describe life events such as loss, trauma, illness and transitions that can alter a developmental trajectory",
        // KN27
        "Identify risk and protective factors -- nutrition, poverty, adverse childhood experiences, social support -- and explain resilience",
        // KN28
        "Recognize neurodevelopmental and other disorders and diseases that disrupt the expected course of development",
      ],
    },
    {
      title: "Assessment and Diagnosis",
      rangeLabel: "16% of the exam",
      weight: 16,
      gate: "Given a fictional referral, choose and adapt the assessment, conduct the intake and risk assessment, interpret the scores with their error and base rates, and reach and defend a DSM-5-TR differential diagnosis.",
      sources: [S.contentAreas, S.dsm],
      objectives: [
        // KN29
        "Apply classical test theory and item response theory: reliability types, standard error of measurement and confidence intervals",
        "Evaluate validity evidence -- content, criterion-related, construct -- and test fairness and bias",
        "Interpret norm-referenced scores: percentile ranks, z and T scores and standard scores",
        // KN30, KN31
        "Choose among interviews, observation, self-report, performance-based tests and collateral reports by their strengths and limitations",
        // KN31, KN33, KN36 -- exact title, a clinical sim attaches to it.
        "Conduct a diagnostic intake using DSM-5-TR criteria",
        // KN31, KN37 -- exact title, a clinical sim attaches to it.
        "Assess suicide risk and plan safety in a clinical interview",
        "Assess risk of violence toward others, and know what a risk estimate can and cannot predict",
        // KN32
        "Select commonly used intelligence, achievement, personality, neuropsychological and symptom measures and judge their fit for diverse populations",
        // KN33
        "Make a differential diagnosis, ruling out medical conditions, substance effects and other non-psychological explanations",
        // KN34
        "Assess groups and organizations with needs assessments and program evaluation",
        // KN35
        "Select and adapt assessments for disability, culture and language, including accommodations and working with interpreters",
        // KN36
        "Compare categorical and dimensional classification (DSM-5-TR and ICD) and their limitations",
        // KN37
        "Apply base rates, sensitivity, specificity and predictive values, and guard against confirmation bias and other judgment errors",
        // KN38
        "Describe the epidemiology of major disorders: prevalence, typical onset, course and sex and age differences",
        // KN39
        "Compare models of psychopathology: diathesis-stress, biopsychosocial, cognitive, behavioral and psychodynamic",
        // KN40
        "Measure outcomes and change, including reliable and clinically significant change",
        // KN41
        "Evaluate technology in assessment -- computerized and remote administration, scoring software -- for validity, security and cost",
      ],
    },
    {
      title: "Treatment, Intervention, Prevention, and Supervision",
      rangeLabel: "15% of the exam",
      weight: 15,
      gate: "Given a fictional client, group or organization, choose an evidence-based intervention that fits their problem, readiness and context, defend it against the alternatives, and say how you would supervise or consult on it.",
      sources: [S.contentAreas],
      objectives: [
        // KN42
        "Choose a treatment from research evidence, client characteristics and preferences, and readiness to change",
        // KN43
        "Compare treatment models: cognitive-behavioral, psychodynamic, humanistic, family systems and acceptance-based",
        // KN44
        "Compare the efficacy and effectiveness of treatment techniques, including common factors and the therapeutic alliance",
        "Match evidence-based treatments to common presentations, such as exposure for anxiety and OCD and trauma-focused therapy for PTSD",
        // KN45
        "Plan prevention (universal, selective, indicated) and rehabilitation for diverse and special populations",
        "Apply crisis intervention principles to stabilize a client in acute distress and connect them to the right level of care",
        // KN46
        "Use group, organizational and performance-enhancement interventions",
        // KN47
        "Compare consultation models -- mental health, behavioral and organizational -- and the stages of a consultation",
        // KN48
        "Apply theories of vocational and career development",
        // KN49
        "Deliver telepsychology appropriately: competence, consent, privacy, emergencies and practice across jurisdictions",
        // KN50
        "Explain how healthcare systems, integrated care and reimbursement shape intervention choices",
        // KN51
        "Apply health promotion, risk reduction and resilience approaches, including motivational interviewing and health behavior models",
        // KN52
        "Compare supervision models -- developmental, competency-based, process -- and their evidence",
      ],
    },
    {
      title: "Research Methods and Statistics",
      rangeLabel: "7% of the exam",
      weight: 7,
      gate: "Given a fictional study, name its design, choose the right analysis, interpret the result's significance and size, and list the threats to its validity.",
      sources: [S.contentAreas],
      objectives: [
        // KN53
        "Choose sampling and data-collection methods and recognize sampling bias",
        // KN54
        "Distinguish case, single-subject, correlational, quasi-experimental and experimental designs",
        // KN55
        "Choose the statistical test that fits a design and data type: t-tests, ANOVA, chi-square, correlation and regression",
        "Interpret qualitative methods, meta-analysis, factor analysis and causal modeling at a conceptual level",
        // KN56
        "Interpret statistical power, Type I and II errors, effect size, and clinical versus statistical significance",
        // KN57
        "Appraise internal and external validity and the threats to each",
        // KN58
        "Plan a program evaluation: needs assessment, formative and summative evaluation and cost-benefit analysis",
        // KN59, KN60
        "Involve communities in research and disseminate findings responsibly",
      ],
    },
    {
      title: "Ethical, Legal, and Professional Issues",
      rangeLabel: "16% of the exam",
      weight: 16,
      gate: "Given a fictional dilemma, name the ethical standards and legal duties in play, work through a decision model, and choose the action that protects the client and others while keeping you within the code and the law of the jurisdiction.",
      sources: [S.contentAreas, S.apaCode, S.apaTaskForce, S.waRule],
      objectives: [
        // KN61
        "Apply the APA Ethics Code's General Principles and enforceable Standards (2002, amended 2010 and 2016), and know how other codes such as the Canadian code compare",
        // KN62
        "Apply professional standards and guidelines for practice, such as the testing standards and record-keeping guidelines",
        // KN63
        "Apply the laws and court decisions that govern practice, knowing they vary by jurisdiction",
        // KN63, KN64, KN68 -- exact title, a clinical sim attaches to it.
        "Apply duty-to-warn and duty-to-protect obligations",
        // KN64, KN68
        "Protect confidentiality and privilege and know their limits, including mandated reporting of abuse",
        "Obtain informed consent, including with minors, couples and families, and people whose capacity is in question",
        "Identify and manage multiple relationships, conflicts of interest and boundary issues",
        "Handle fees, billing and advertising ethically",
        // KN65
        "Work through an ethical dilemma with a decision-making model, including when ethics and law conflict",
        // KN66
        "Maintain competence through continuing professional development, and recognize and respond to impairment",
        // KN67
        "Identify emerging social, legal, ethical and policy issues that affect practice",
        // KN68
        "Uphold client rights: access to records, complaints, termination and avoiding abandonment",
        // KN69
        "Apply ethical standards to research: consent, deception and debriefing, review boards and data integrity",
        // KN70
        "Apply ethical standards to supervision and training",
        // KN71
        "Apply ethical standards to technology-assisted services and social media",
      ],
    },
  ],
};

export const EPPP_TRACKS: readonly SeedTrack[] = [EPPP_TRACK];
