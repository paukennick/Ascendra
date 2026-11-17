// REQ-286 (Nick 2026-11-10 and 2026-11-14): the ASWB social work licensing
// exams, the fourth course family of the mental health wave (EPPP, NCE and
// NCMHCE are live). Clinical first, then Masters; Bachelors later. Both live
// under Mental Health > Social Work Licensure (migration 077), so the per-course
// 18+ acknowledgment with date of birth (REQ-259, lib/mature-content.ts)
// applies to them through the category, with no code change.
//
// What was read, and when (all 2026-11-14, in ASWB's own documents unless
// marked otherwise):
//   - ASWB, "ASWB Examination Guidebook" (the PDF at
//     aswb.org/wp-content/uploads/2026/05/2026-Social-Work-Licensing-Exam-Guidebook-5.4.2026.pdf;
//     despite the file name, its cover says "published in August 2026" and it
//     "reflects ... exams administered beginning August 3, 2026"; PDF metadata
//     created 2026-07-27, modified 2026-09-11; pages footed "08/2026"). Read in
//     full text. It gives, for every category: two sections of 61 multiple-
//     choice questions (122), of which 12 are unscored pretest questions mixed
//     in and 110 are scored; four hours in all, two hours per section, no return
//     to the first section once submitted, an optional scheduled break of up to
//     10 minutes between sections with the clock stopped; scores reported as
//     pass/fail with the number needed to pass and the number correct, the
//     passing number adjusted per form (equating); a 90-day wait to retake (a
//     waiver may be requested within 10 points of passing, where the
//     jurisdiction allows); fees US$230 (Masters) and US$260 (Clinical). The
//     2026 blueprints come from the 2024 practice analysis and have three
//     content areas, each split into lettered competencies with applied
//     knowledge statements:
//       Masters:  I Values and Ethics 35, II Assessment and Planning 33,
//                 III Intervention and Practice 32.
//       Clinical: I Values and Ethics 36, II Assessment and Planning 32,
//                 III Intervention and Practice 32. The Clinical outline page
//                 prints no percentage beside II; the guidebook's own example
//                 (p.6) says "the Clinical examination will have 32 percent of
//                 the questions testing Assessment and Planning and 32 percent
//                 ... Intervention and Practice", and 36 + 32 + 32 = 100.
//     Every applied knowledge statement of both outlines is carried below as
//     the units' outline statements (REQ-235), with its competency code.
//   - ASWB, "2026 changes to the Social Work Licensing Exams"
//     (aswb.org/?p=23265, undated) and "The new Social Work Licensing Exams
//     begin today" (2026-08-03): the 2026-blueprint forms began on Monday
//     2026-08-03, replacing the 2018-blueprint exam (170 questions, 20
//     unscored, four content areas); three content areas instead of four, fewer
//     questions, a higher share of three-option questions and of application
//     questions; time limit, fees, scoring and registration unchanged. No
//     further change is announced; the guidebook says it may be updated as
//     often as quarterly, so every ASWB source is rechecked by 2027-05-14.
//   - ASWB, "Content outlines" pages (aswb.org/exam/readiness-to-practice/
//     content-outlines/, modified 2026-08-03): the outlines are "developed using
//     2024 Analysis of the Practice of Social Work" and printed in the guidebook.
//   - NASW Code of Ethics (approved 1996, revised 2021): standards 1, 2 and 3
//     read in full on socialworkers.org (2026-11-14). NASW's Delegate Assembly
//     page (read 2026-11-14) says proposed amendments to the Code "will be voted
//     on at the culminating meeting of the Delegate Assembly on November 18,
//     2026": four days after this check. Recheck by 2026-12-15 and update the
//     course if the vote changes a standard it teaches.
//   - DSM-5-TR (American Psychiatric Association, 2022), the edition the ASWB
//     reference lists name (guidebook, Assessment and Planning references).
//     The manual was not read; objectives name it and never reproduce criteria.
//   - Washington: WAC 246-809-340 (read 2026-11-14 at app.leg.wa.gov):
//     "Either the American Association of State Social Work Board's advanced or
//     clinical examination is approved for use as the state examination for
//     licensure of social workers", with the testing company's passing score.
//     The rule does not name the Masters exam (recorded on the Masters
//     credential, not interpreted further).
//
// Outline statements are ASWB's applied knowledge statements, carried as
// printed (short statements, as the NBCC courses carry NBCC's lettered tasks).
// The objectives are our own words and copy no statement; the comments name
// the competency codes each objective covers.
//
// Four objectives have exact titles for the client-session sims listed as
// candidates in the REQ-286 report (lib/sim/documents.ts attaches sims by
// title; none is registered yet):
//   Clinical "Assess suicide and violence risk in a clinical social work session"
//            (Assessment and Planning: IIB risk, IIB DSM)
//            "Respond to a client's threat against an identifiable person under the NASW Code and state law"
//            (Values and Ethics: IB mandatory reporting, IA confidentiality)
//   Masters  "Engage an involuntary client and contract for goals"
//            (Intervention and Practice: IIIB engaging, contracting)
//            "Make a mandated child abuse report and keep the family engaged"
//            (Values and Ethics: IB mandatory reporting)
//
// Modeling: as the EPPP and the NBCC courses -- ASWB develops the exams the
// social work boards require for licensure, so credential_basis
// 'regulatory_licensure' with the exam's name as its code. requiresAcknowledgement
// (the study notice) with the mental health disclaimer key; the 18+ gate is
// keyed on the category.
//
// Trademarks: Nick's "Prep for the ..." pattern (REQ-097), with an independence
// statement in the description. No ASWB guideline for prep providers was found.

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
// The guidebook may change quarterly; six months after this check.
const REVIEW_DUE_AT = "2027-05-14T00:00:00Z";
const RECHECK = "2027-05-14";
// NASW's Delegate Assembly votes on Code amendments on 2026-11-18.
const NASW_RECHECK = "2026-12-15";

export const ASWB_GUIDEBOOK_URL = "https://www.aswb.org/wp-content/uploads/2026/05/2026-Social-Work-Licensing-Exam-Guidebook-5.4.2026.pdf";
const CHANGES_URL = "https://www.aswb.org/the-new-social-work-licensing-exams-begin-today/";

// REQ-165: the key only marks the course as gated (the study notice); the
// same key the EPPP and NBCC courses use.
const MENTAL_HEALTH_DISCLAIMER_KEY = "mental-health-clinical-content";

const src = (title: string, url: string, kind: UnitSource["kind"], recheckBy?: string, extra: Partial<UnitSource> = {}): UnitSource => ({
  title,
  ...source(url, kind, CHECKED, recheckBy),
  ...extra,
});

// ASWB's applied knowledge statements, by exam and content area, as printed in
// the August 2026 guidebook (Masters pp.46-52, Clinical pp.66-73), each with
// its competency code and name.
const OUTLINE = {
  clinicalI: [
    "IA Ethical principles and responsibilities: Legal and ethical issues regarding confidentiality, including limitations of confidentiality (e.g., HIPAA, PHI, privacy)",
    "IA Ethical principles and responsibilities: Legal and ethical issues related to the practice of social work, including responsibility to clients/client systems, colleagues, the profession, and society",
    "IA Ethical principles and responsibilities: Identifying and resolving ethical dilemmas",
    "IA Ethical principles and responsibilities: Principles and processes of obtaining informed consent",
    "IA Ethical principles and responsibilities: Professional values and principles (e.g., competence, social justice, integrity, dignity and worth of the person)",
    "IA Ethical principles and responsibilities: Burnout, secondary trauma, and compassion fatigue",
    "IA Ethical principles and responsibilities: Social worker self-care principles",
    "IA Ethical principles and responsibilities: Importance of professional development activities to improve practice and maintain current professional knowledge (e.g., in-service training, licensing requirements, reviews of literature, workshops, on-going supervision, consultation)",
    "IB Ethical service delivery: Protecting and enhancing client/client system self-determination (e.g., medication, medical treatment, counseling, placement, right to refuse services)",
    "IB Ethical service delivery: Professional boundaries in the social worker-client/client system relationship (e.g., power differences, influence, privilege, conflicts of interest, self-disclosure, dual relationships)",
    "IB Ethical service delivery: Legal and ethical issues regarding mandatory reporting (e.g., abuse, threat of harm, impaired professionals, duty to warn)",
    "IB Ethical service delivery: Legal and ethical issues regarding documentation (e.g., maintaining client records)",
    "IB Ethical service delivery: Responsible billing practices (e.g., managed care, insurance reimbursement, incident to billing)",
    "IB Ethical service delivery: Legal and ethical issues related to death and dying",
    "IB Ethical service delivery: Ethical issues in supervision and management",
    "IB Ethical service delivery: Impact of governmental policies on service delivery (e.g., local, state, federal legislation and policy)",
    "IB Ethical service delivery: Legal and ethical issues regarding termination",
    "IB Ethical service delivery: Ethical issues related to electronic practice",
    "IB Ethical service delivery: Research ethics (e.g., institutional review boards, use of human subjects, informed consent)",
    "IC Diversity and social justice: Anti-oppressive and anti-racist approaches",
    "IC Diversity and social justice: Social, racial, environmental, and economic justice principles",
    "IC Diversity and social justice: Impact of culture, race, ethnicity, sexual orientation, gender, and intersectionality on behaviors, attitudes, and identity formation",
    "IC Diversity and social justice: Accessibility including language, physical, and cultural access (e.g., translation and interpretation, neurodiversity, American Sign Language)",
    "IC Diversity and social justice: Power differential and racial privilege (e.g., internalized racial and ethnic inferiority and superiority)",
    "IC Diversity and social justice: Privilege and bias and their impact on client/client systems (e.g., implicit bias, microaggressions)",
    "IC Diversity and social justice: Cultural impacts of exploitation across marginalized communities (e.g., financial, immigration status, trafficking, Missing and Murdered Indigenous Women)",
    "IC Diversity and social justice: Social justice, truth and reconciliation, and restorative practices related to clients/client systems from historically oppressed and marginalized communities",
    "IC Diversity and social justice: Impact of globalization, immigration, and refugee or immigration status on clients/client systems and service delivery",
  ],
  clinicalII: [
    "IIA Assessment concepts: Indicators and impact of trauma, stressors, violence, and crises on individuals, families, groups, organizations, and communities (e.g., intergenerational, historical, and complex)",
    "IIA Assessment concepts: Family dynamics and functioning and the effects on individuals, families, groups, organizations, and communities",
    "IIA Assessment concepts: Dynamics of interpersonal relationships and relationship development (e.g., family, couples, groups, polyamory)",
    "IIA Assessment concepts: Indicators, dynamics, and impact of physical, sexual, and psychological abuse and neglect on individuals, families, groups, organizations, and communities",
    "IIA Assessment concepts: Indicators of mental and emotional illness throughout the lifespan",
    "IIA Assessment concepts: Co-occurring disorders and conditions",
    "IIA Assessment concepts: Biopsychosocial assessment model and related components and factors",
    "IIA Assessment concepts: Indicators and impact of addiction and substance use and abuse on individuals, families, groups, organizations, and communities",
    "IIA Assessment concepts: Impact of poverty on individuals, families, groups, organizations, and communities (e.g., social determinants of health)",
    "IIA Assessment concepts: Factors influencing self- and body-image (e.g., culture, race, religion/spirituality, age, ability, trauma, gender, sexuality, size)",
    "IIA Assessment concepts: Defense mechanisms and their effects on behavior and relationships",
    "IIA Assessment concepts: Characteristics of perpetrators of abuse, neglect, and exploitation",
    "IIA Assessment concepts: Impact of out-of-home placement (e.g., hospitalization, foster care, residential care, criminal justice system) on clients/client systems",
    "IIA Assessment concepts: Impact of caregiving on families",
    "IIA Assessment concepts: Indicators, dynamics, and impact of exploitation across the lifespan (e.g., financial, immigration status, trafficking)",
    "IIA Assessment concepts: Typical and atypical physical, cognitive, emotional, and sexual development throughout the lifespan",
    "IIA Assessment concepts: Effects of physical and mental ability throughout the lifespan",
    "IIA Assessment concepts: Impact of aging on the individual and family systems",
    "IIA Assessment concepts: Racial, ethnic, cultural, and spiritual/faith development throughout the lifespan",
    "IIA Assessment concepts: Factors of out-of-home displacement (e.g., homelessness, immigration, and refugee status) on clients/client systems",
    "IIA Assessment concepts: The influence and impact of technology, including social media, on client/client-systems (personal and professional)",
    "IIA Assessment concepts: Impact of urbanization, globalization, environmental hazards, and climate change on individuals, families, groups, organizations, and communities",
    "IIA Assessment concepts: Client/client system competence, self-determination, and self-monitoring techniques (e.g., financial decisions, treatment decisions, emancipation, age of consent, permanency planning)",
    "IIB Assessment methods and techniques: Methods of assessing risk of harm to self and others",
    "IIB Assessment methods and techniques: Principles and techniques of interviewing (e.g., supporting, clarifying, confronting, validating, feedback, reflecting, language differences, use of interpreters)",
    "IIB Assessment methods and techniques: Methods of involving clients/client systems in problem identification, problem solving, and intervention planning",
    "IIB Assessment methods and techniques: Indicators of and methods of assessing motivation, barriers, and readiness for change",
    "IIB Assessment methods and techniques: Methods for assessing resilience and coping abilities",
    "IIB Assessment methods and techniques: Methods, techniques, and instruments for assessing client/client system strengths, resources, needs, and challenges",
    "IIB Assessment methods and techniques: Methods for obtaining sensitive and/or confidential information (e.g., substance use, sexual abuse)",
    "IIB Assessment methods and techniques: Methods of assessing clients'/client systems' communication skills",
    "IIB Assessment methods and techniques: Use of the Diagnostic and Statistical Manual of Mental Disorders in assessment and common indicators of mental health and brain-related conditions",
    "IIB Assessment methods and techniques: Components and function of the mental status examination",
    "IIB Assessment methods and techniques: Methods of incorporating information from records and evaluations (e.g., employment, medical, psychological, school)",
    "IIC Assessment practices: Assessing the availability of and determining appropriate community resources",
    "IIC Assessment practices: Factors and processes used in goal planning, treatment planning, triage, and service plans",
    "IIC Assessment practices: Criteria used in the selection of intervention/treatment modalities (e.g., client/client system abilities, developmental level, culture, life stage)",
    "IIC Assessment practices: Cultural considerations in the creation of an intervention plan",
    "IIC Assessment practices: Use and side effects of common prescription, over-the-counter, and alternative medications",
    "IIC Assessment practices: Indicators of client/client system readiness for termination",
  ],
  clinicalIII: [
    "IIIA Practice concepts: Strengths-based and empowerment strategies and interventions",
    "IIIA Practice concepts: Principles and techniques for building and maintaining a helping relationship (e.g., acceptance, empathy, rapport)",
    "IIIA Practice concepts: Interdisciplinary and intra-disciplinary team collaboration (e.g., co-therapy, care conference, IEP)",
    "IIIA Practice concepts: The social worker's role in the problem-solving process",
    "IIIA Practice concepts: End of life practice (e.g., continuity of care, hospice, palliative care, stages of death and dying)",
    "IIIA Practice concepts: Parenting capacities and skill building",
    "IIIA Practice concepts: Policies, procedures, regulations, and legislation and their impact on social work practice and service delivery",
    "IIIA Practice concepts: Developing formal documents (e.g., grants, proposals, reports, evaluations)",
    "IIIB Intervention methods and techniques: Methods and approaches for providing trauma-informed care for various types of trauma (e.g., complex, vicarious)",
    "IIIB Intervention methods and techniques: Verbal and nonverbal communication (e.g., body language, congruence, feedback)",
    "IIIB Intervention methods and techniques: Principles of active listening and observation",
    "IIIB Intervention methods and techniques: Limit and boundary setting techniques",
    "IIIB Intervention methods and techniques: Crisis intervention and treatment approaches",
    "IIIB Intervention methods and techniques: Emotional regulation techniques",
    "IIIB Intervention methods and techniques: Evidence-based practices (e.g., cognitive behavioral therapy, dialectical behavior therapy, mindfulness based stress reduction, motivational interviewing, eye movement desensitization and reprocessing)",
    "IIIB Intervention methods and techniques: Methods of teaching coping and other self-care skills to clients",
    "IIIB Intervention methods and techniques: Stress management techniques",
    "IIIB Intervention methods and techniques: Practice with clients experiencing loss, separation, and grief",
    "IIIB Intervention methods and techniques: Methods for engaging and motivating voluntary and involuntary clients/client systems",
    "IIIB Intervention methods and techniques: Harm reduction techniques",
    "IIIB Intervention methods and techniques: Approaches to and methods of advocacy for needed services and resources",
    "IIIB Intervention methods and techniques: Psychoeducation methods",
    "IIIB Intervention methods and techniques: Contracting and goal-setting techniques (e.g., partializing, measurable objectives)",
    "IIIB Intervention methods and techniques: Problem-solving models and approaches",
    "IIIB Intervention methods and techniques: Techniques and methods for addiction intervention",
    "IIIB Intervention methods and techniques: Case management techniques (e.g., case recording, documentation, case presentation)",
    "IIIB Intervention methods and techniques: Conflict resolution methods",
    "IIIB Intervention methods and techniques: Anger management techniques",
    "IIIB Intervention methods and techniques: Family therapy models, interventions, and approaches",
    "IIIB Intervention methods and techniques: Discharge, aftercare, wrap-around services, and follow-up",
    "IIIB Intervention methods and techniques: Group work techniques and approaches (e.g., developing and managing group processes and cohesion)",
    "IIIB Intervention methods and techniques: Establishing service networks or community resources",
    "IIIB Intervention methods and techniques: Assertiveness training techniques",
    "IIIB Intervention methods and techniques: Role modeling techniques",
    "IIIB Intervention methods and techniques: Couples interventions and treatment approaches",
    "IIIB Intervention methods and techniques: Role play techniques",
    "IIIC Practice evaluation and research: Techniques for evaluating progress and effectiveness of intervention, treatment, and service plans",
    "IIIC Practice evaluation and research: Methods of establishing program objectives and outcomes",
    "IIIC Practice evaluation and research: Program evaluation and related impact on services",
    "IIIC Practice evaluation and research: Methods of evaluating agency programs (e.g., needs assessment, formative/summative assessment, cost-effectiveness, cost-benefit analysis, outcomes assessment)",
    "IIIC Practice evaluation and research: Basic and applied research design and methods, data collection and analysis methods, and methods to assess reliability and validity in social work research (e.g., objective, subjective, qualitative, quantitative)",
    "IIIC Practice evaluation and research: Quality assurance (e.g., program reviews and audits by external sources)",
    "IIID Supervision and administration: Supervisee's role in supervision (e.g., identifying learning needs, self-assessment, prioritizing)",
    "IIID Supervision and administration: Supervision and consultation models and techniques (e.g., individual, peer, group, case recording)",
    "IIID Supervision and administration: Transference and countertransference within supervisory relationships",
    "IIID Supervision and administration: Methods for creating, implementing, and evaluating policies and procedures that minimize risk for individuals, families, groups, organizations, and communities",
    "IIID Supervision and administration: Organizational development, structure, and functioning (e.g., policies, procedures)",
    "IIID Supervision and administration: Fiscal management and resource allocation techniques",
  ],
  mastersI: [
    "IA Ethical principles and responsibilities: Principles and processes of obtaining informed consent",
    "IA Ethical principles and responsibilities: Legal and ethical issues regarding confidentiality, including limitations of confidentiality (e.g., HIPAA, PHI, privacy)",
    "IA Ethical principles and responsibilities: Legal and ethical issues related to the practice of social work, including responsibility to clients/client systems, colleagues, the profession, and society",
    "IA Ethical principles and responsibilities: Identifying and resolving ethical dilemmas",
    "IA Ethical principles and responsibilities: Professional values and principles (e.g., competence, social justice, integrity, dignity and worth of the person)",
    "IA Ethical principles and responsibilities: Burnout, secondary trauma, and compassion fatigue",
    "IA Ethical principles and responsibilities: Social worker self-care principles",
    "IA Ethical principles and responsibilities: Importance of professional development activities to improve practice and maintain current professional knowledge (e.g., in-service training, licensing requirements, reviews of literature, workshops, on-going supervision, consultation)",
    "IB Ethical service delivery: Professional boundaries in the social worker-client/client system relationship (e.g., power differences, influence, privilege, conflicts of interest, self-disclosure, dual relationships)",
    "IB Ethical service delivery: Protecting and enhancing client/client system self-determination (e.g., medication, medical treatment, counseling, placement, right to refuse services)",
    "IB Ethical service delivery: Legal and ethical issues regarding mandatory reporting (e.g., abuse, threat of harm, impaired professionals, duty to warn)",
    "IB Ethical service delivery: Legal and ethical issues regarding documentation (e.g., maintaining client records)",
    "IB Ethical service delivery: Impact of governmental policies on service delivery (e.g., local, state, federal legislation and policy)",
    "IB Ethical service delivery: Legal and ethical issues related to death and dying",
    "IB Ethical service delivery: Ethical issues in supervision and management",
    "IB Ethical service delivery: Responsible billing practices (e.g., managed care, insurance reimbursement, incident to billing)",
    "IB Ethical service delivery: Ethical issues related to electronic practice",
    "IB Ethical service delivery: Legal and ethical issues regarding termination",
    "IC Diversity and social justice: Anti-oppressive and anti-racist approaches",
    "IC Diversity and social justice: Social, racial, environmental, and economic justice principles",
    "IC Diversity and social justice: Impact of culture, race, ethnicity, sexual orientation, gender, and intersectionality on behaviors, attitudes, and identity formation",
    "IC Diversity and social justice: Accessibility including language, physical, and cultural access (e.g., translation and interpretation, neurodiversity, American Sign Language)",
    "IC Diversity and social justice: Privilege and bias and their impact on client/client systems (e.g., implicit bias, microaggressions)",
    "IC Diversity and social justice: Power differential and racial privilege (e.g., internalized racial and ethnic inferiority and superiority)",
    "IC Diversity and social justice: Cultural impacts of exploitation across marginalized communities (e.g., financial, immigration status, trafficking, Missing and Murdered Indigenous Women)",
    "IC Diversity and social justice: Social justice, truth and reconciliation, and restorative practices related to clients/client systems from historically oppressed and marginalized communities",
    "IC Diversity and social justice: Impact of globalization, immigration, and refugee or immigration status on clients/client systems and service delivery",
  ],
  mastersII: [
    "IIA Assessment concepts: Indicators and impact of trauma, stressors, violence, and crises on individuals, families, groups, organizations, and communities (e.g., intergenerational, historical, and complex)",
    "IIA Assessment concepts: Family dynamics and functioning and the effects on individuals, families, groups, organizations, and communities",
    "IIA Assessment concepts: Impact of poverty on individuals, families, groups, organizations, and communities (e.g., social determinants of health)",
    "IIA Assessment concepts: Dynamics of interpersonal relationships and relationship development (e.g., family, couples, groups, polyamory)",
    "IIA Assessment concepts: Indicators, dynamics, and impact of physical, sexual, and psychological abuse and neglect on individuals, families, groups, organizations, and communities",
    "IIA Assessment concepts: Indicators of mental and emotional illness throughout the lifespan",
    "IIA Assessment concepts: Impact of out-of-home placement (e.g., hospitalization, foster care, residential care, criminal justice system) on clients/client systems",
    "IIA Assessment concepts: Impact of caregiving on families",
    "IIA Assessment concepts: Indicators and impact of addiction and substance use and abuse on individuals, families, groups, organizations, and communities",
    "IIA Assessment concepts: Co-occurring disorders and conditions",
    "IIA Assessment concepts: Biopsychosocial assessment model and related components and factors",
    "IIA Assessment concepts: Characteristics of perpetrators of abuse, neglect, and exploitation",
    "IIA Assessment concepts: Indicators, dynamics, and impact of exploitation across the lifespan (e.g., financial, immigration status, trafficking)",
    "IIA Assessment concepts: Defense mechanisms and their effects on behavior and relationships",
    "IIA Assessment concepts: Effects of physical and mental ability throughout the lifespan",
    "IIA Assessment concepts: Factors of out-of-home displacement (e.g., homelessness, immigration, and refugee status) on clients/client systems",
    "IIA Assessment concepts: Impact of aging on the individual and family systems",
    "IIA Assessment concepts: Factors influencing self- and body-image (e.g., culture, race, religion/spirituality, age, ability, trauma, gender, sexuality, size)",
    "IIA Assessment concepts: Racial, ethnic, cultural, and spiritual/faith development throughout the lifespan",
    "IIA Assessment concepts: Typical and atypical physical, cognitive, emotional, and sexual development throughout the lifespan",
    "IIA Assessment concepts: The influence and impact of technology, including social media, on client/client-systems (personal and professional)",
    "IIA Assessment concepts: Impact of urbanization, globalization, environmental hazards, and climate change on individuals, families, groups, organizations, and communities",
    "IIA Assessment concepts: Client/client system competence, self-determination, and self-monitoring techniques (e.g., financial decisions, treatment decisions, emancipation, age of consent, permanency planning)",
    "IIB Assessment methods and techniques: Principles and techniques of interviewing (e.g., supporting, clarifying, confronting, validating, feedback, reflecting, language differences, use of interpreters)",
    "IIB Assessment methods and techniques: Methods of assessing risk of harm to self and others",
    "IIB Assessment methods and techniques: Methods of involving clients/client systems in problem identification, problem solving, and intervention planning",
    "IIB Assessment methods and techniques: Methods, techniques, and instruments for assessing client/client system strengths, resources, needs, and challenges",
    "IIB Assessment methods and techniques: Methods for obtaining sensitive and/or confidential information (e.g., substance use, sexual abuse)",
    "IIB Assessment methods and techniques: Methods for assessing resilience and coping abilities",
    "IIB Assessment methods and techniques: Indicators of and methods of assessing motivation, barriers, and readiness for change",
    "IIB Assessment methods and techniques: Methods of assessing clients'/client systems' communication skills",
    "IIB Assessment methods and techniques: Methods of incorporating information from records and evaluations (e.g., employment, medical, psychological, school)",
    "IIB Assessment methods and techniques: Components and function of the mental status examination",
    "IIC Assessment practices: Assessing the availability of and determining appropriate community resources",
    "IIC Assessment practices: Cultural considerations in the creation of an intervention plan",
    "IIC Assessment practices: Factors and processes used in goal planning, treatment planning, triage, and service plans",
    "IIC Assessment practices: Criteria used in the selection of intervention/treatment modalities (e.g., client/client system abilities, developmental level, culture, life stage)",
    "IIC Assessment practices: Use and side effects of common prescription, over-the-counter, and alternative medications",
    "IIC Assessment practices: Indicators of client/client system readiness for termination",
  ],
  mastersIII: [
    "IIIA Practice concepts: Strengths-based and empowerment strategies and interventions",
    "IIIA Practice concepts: Principles and techniques for building and maintaining a helping relationship (e.g., acceptance, empathy, rapport)",
    "IIIA Practice concepts: The social worker's role in the problem-solving process",
    "IIIA Practice concepts: Interdisciplinary and intra-disciplinary team collaboration (e.g., co-therapy, care conference, IEP)",
    "IIIA Practice concepts: End of life practice (e.g., continuity of care, hospice, palliative care, stages of death and dying)",
    "IIIA Practice concepts: Parenting capacities and skill building",
    "IIIA Practice concepts: Policies, procedures, regulations, and legislation and their impact on social work practice and service delivery",
    "IIIA Practice concepts: Permanency planning (e.g., child welfare)",
    "IIIA Practice concepts: Community organizing, development, and mobilizing community participation",
    "IIIB Intervention methods and techniques: Limit and boundary setting techniques",
    "IIIB Intervention methods and techniques: Verbal and nonverbal communication (e.g., body language, congruence, feedback)",
    "IIIB Intervention methods and techniques: Methods and approaches for providing trauma-informed care for various types of trauma (e.g., complex, vicarious)",
    "IIIB Intervention methods and techniques: Principles of active listening and observation",
    "IIIB Intervention methods and techniques: Crisis intervention and treatment approaches",
    "IIIB Intervention methods and techniques: Emotional regulation techniques",
    "IIIB Intervention methods and techniques: Approaches to and methods of advocacy for needed services and resources",
    "IIIB Intervention methods and techniques: Methods of teaching coping and other self-care skills to clients",
    "IIIB Intervention methods and techniques: Practice with clients experiencing loss, separation, and grief",
    "IIIB Intervention methods and techniques: Methods for engaging and motivating voluntary and involuntary clients/client systems",
    "IIIB Intervention methods and techniques: Case management techniques (e.g., case recording, documentation, case presentation)",
    "IIIB Intervention methods and techniques: Evidence-based practices (e.g., cognitive behavioral therapy, dialectical behavior therapy, mindfulness based stress reduction, motivational interviewing, eye movement desensitization and reprocessing)",
    "IIIB Intervention methods and techniques: Stress management techniques",
    "IIIB Intervention methods and techniques: Harm reduction techniques",
    "IIIB Intervention methods and techniques: Contracting and goal-setting techniques (e.g., partializing, measurable objectives)",
    "IIIB Intervention methods and techniques: Problem-solving models and approaches",
    "IIIB Intervention methods and techniques: Discharge, aftercare, wrap-around services, and follow-up",
    "IIIB Intervention methods and techniques: Conflict resolution methods",
    "IIIB Intervention methods and techniques: Establishing service networks or community resources",
    "IIIB Intervention methods and techniques: Techniques and methods for addiction intervention",
    "IIIB Intervention methods and techniques: Psychoeducation methods",
    "IIIB Intervention methods and techniques: Anger management techniques",
    "IIIB Intervention methods and techniques: Group work techniques and approaches (e.g., developing and managing group processes and cohesion)",
    "IIIB Intervention methods and techniques: Family therapy models, interventions, and approaches",
    "IIIB Intervention methods and techniques: Social change and social planning methods",
    "IIIC Practice evaluation and research: Techniques for evaluating progress and effectiveness of intervention, treatment, and service plans",
    "IIIC Practice evaluation and research: Methods, techniques, and instruments used to evaluate social work practice",
    "IIIC Practice evaluation and research: Methods of evaluating agency programs (e.g., needs assessment, formative/summative assessment, cost-effectiveness, cost-benefit analysis, outcomes assessment)",
    "IIIC Practice evaluation and research: Basic and applied research design and methods, data collection and analysis methods, and methods to assess reliability and validity in social work research (e.g., objective, subjective, qualitative, quantitative)",
    "IIID Supervision and administration: Supervisee's role in supervision (e.g., identifying learning needs, self-assessment, prioritizing)",
    "IIID Supervision and administration: Methods for creating, implementing, and evaluating policies and procedures for safe, inclusive, and a healthy work environment",
    "IIID Supervision and administration: Methods for creating, implementing, and evaluating policies and procedures that minimize risk for individuals, families, groups, organizations, and communities",
    "IIID Supervision and administration: Supervision and consultation models and techniques (e.g., individual, peer, group, case recording)",
    "IIID Supervision and administration: Transference and countertransference within supervisory relationships",
  ],
} as const;

type Exam = "clinical" | "masters";
type Area = "I" | "II" | "III";
const AREA_NAME: Record<Area, string> = { I: "Values and Ethics", II: "Assessment and Planning", III: "Intervention and Practice" };
const EXAM_NAME: Record<Exam, string> = { clinical: "Clinical", masters: "Masters" };

const outlineSource = (exam: Exam, area: Area): UnitSource =>
  src(`ASWB Examination Guidebook (August 2026), ${EXAM_NAME[exam]} exam content outline, ${area}. ${AREA_NAME[area]}`, ASWB_GUIDEBOOK_URL, "exam_outline", RECHECK, {
    outline: [...OUTLINE[`${exam}${area}`]],
  });

export const ASWB_SOURCES = {
  format: src("ASWB Examination Guidebook (August 2026): exam format, scoring and retakes", ASWB_GUIDEBOOK_URL, "exam_outline", RECHECK, {
    keyValues: [
      "two sections of 61 multiple-choice questions (122); 110 scored and 12 unscored pretest questions mixed in",
      "four hours: two hours per section; once the first section is submitted it cannot be reopened; an optional scheduled break of up to 10 minutes between sections stops the clock",
      "questions are recall, application or reasoning; the Masters and Clinical exams have a larger share of application and reasoning than the Bachelors exam",
      "scores are pass/fail, reported with the number of questions needed to pass and the number answered correctly; the number needed is adjusted per form so every form is equally hard",
      "a retake needs a 90-day wait; a waiver may be requested within 10 points of passing where the jurisdiction allows it",
      "these are the 2026 blueprints (2024 practice analysis), used for every exam taken on or after 2026-08-03; the earlier exam had 170 questions and four content areas",
    ],
  }),
  changes: src("ASWB, The new Social Work Licensing Exams begin today (2026-08-03)", CHANGES_URL, "exam_outline", RECHECK, {
    keyValues: [
      "2026-blueprint forms began 2026-08-03: three content areas instead of four, fewer questions, more three-option questions and more application questions; time limit, fees and scoring unchanged",
    ],
  }),
  nasw: src("NASW Code of Ethics (approved 1996, revised 2021), standards 1-3 read in full; amendments go to a vote on 2026-11-18", "https://www.socialworkers.org/About/Ethics/Code-of-Ethics/Code-of-Ethics-English", "reference", NASW_RECHECK, {
    keyValues: [
      "1.02: self-determination may be limited when clients' actions or potential actions pose a serious, foreseeable, and imminent risk to themselves or others",
      "1.03(a): informed consent in clear language covers purpose, risks, limits from third-party payers, costs, reasonable alternatives, the right to refuse or withdraw, and the time frame; 1.03(d): involuntary clients are told the nature and extent of services and of their right to refuse",
      "1.06(c): no dual or multiple relationships with current or former clients where there is a risk of exploitation or harm; when unavoidable, the social worker sets clear, culturally sensitive boundaries; 1.06(h): avoid accepting clients' requests on social networking sites",
      "1.07(c): confidentiality yields when disclosure is necessary to prevent serious, foreseeable, and imminent harm to a client or others; disclose the least information necessary; 1.07(d): tell the client before disclosing when feasible",
      "1.09(c): no sexual activity or contact with former clients -- the Code sets no time limit, and a social worker claiming an exception bears the full burden of showing no exploitation; 1.09(d): no clinical services to a former sexual partner",
      "1.13(b): bartering only in very limited circumstances -- accepted locally, essential to services, negotiated without coercion, at the client's initiative and with informed consent",
      "1.16(c): no payment for a referral when no professional service was provided; 1.17(b)-(c): avoid abandonment; terminate for nonpayment only if the arrangement was clear, the client is not an imminent danger, and the consequences were discussed",
      "2.08-2.10: consult an impaired, incompetent or unethical colleague first when feasible, then act through employer, NASW, licensing board or other formal channels",
      "3.04: records accurate, timely and limited to what is relevant to services; kept as long as laws, agency policy and contracts require",
    ],
  }),
  dsm: src("American Psychiatric Association, DSM-5-TR (2022), the edition ASWB's reference lists name (not read; never reproduced)", "https://www.psychiatry.org/Patients-Families/What-is-the-DSM", "reference"),
  waRule: src("Washington WAC 246-809-340: social worker examination (ASWB advanced or clinical, the testing company's passing score)", "https://app.leg.wa.gov/wac/default.aspx?cite=246-809-340", "reference"),
} as const;

const S = ASWB_SOURCES;

const DESCRIPTION_TAIL =
  "Includes frank clinical material (suicide risk, abuse, violence, substance use, trauma) where the exam tests it, behind an 18+ content notice. Independently developed exam prep; not affiliated with or endorsed by the Association of Social Work Boards (ASWB).";

const VERSION_NOTE =
  "ASWB prints no version number; this is the 2026 blueprint from the 2024 practice analysis, in the August 2026 guidebook, used for every exam from 2026-08-03. The guidebook may be updated as often as quarterly; due for review by 2027-05-14.";

const FORMAT =
  "122 multiple-choice questions in two sections of 61, of which 110 are scored and 12 are unscored pretest questions you cannot tell apart; most questions have three or four options. Four hours in all: two hours per section, the first section cannot be reopened once submitted, and an optional 10-minute break between sections stops the clock. Questions test recall, application and reasoning. Computer-based at Pearson VUE test centers. (ASWB Examination Guidebook, August 2026; blueprint in use from 2026-08-03.)";
const PASSING =
  "Reported as pass or fail with the number of questions needed to pass and the number you answered correctly. ASWB adjusts the number needed slightly from form to form so every form is equally hard, and your passing or failing score is valid in every jurisdiction for that exam category. A retake needs a 90-day wait (a waiver may be requested within 10 points of passing where your jurisdiction allows), and some boards limit attempts.";

const aswbCredential = (o: { slug: string; name: string; code: string; recommended: string }): SeedTrack["credential"] => ({
  providerSlug: "aswb",
  providerName: "Association of Social Work Boards",
  providerUrl: "https://www.aswb.org/",
  subcategorySlug: "social-work-licensure",
  credentialType: "licensure_examination",
  credentialSlug: o.slug,
  credentialName: o.name,
  credentialUrl: "https://www.aswb.org/exam/",
  basis: "regulatory_licensure",
  examCode: o.code,
  examRevision: "2026 blueprint (2024 practice analysis), from 2026-08-03",
  standardName: `${o.code} content outline`,
  standardRevision: "ASWB Examination Guidebook, August 2026",
  objectivesRevision: "Three content areas, competencies IA-IIID, applied knowledge statements",
  versionNote: VERSION_NOTE,
  status: "active",
  effectiveDate: "2026-08-03",
  officialObjectivesUrl: ASWB_GUIDEBOOK_URL,
  lastVendorVerifiedAt: VERIFIED_AT,
  recommendedExperience: o.recommended,
  durationMinutes: 240,
  questionFormat: FORMAT,
  passingScorePolicy: PASSING,
});

// ---------------------------------------------------------------------------
// Objectives. Most are shared: the two outlines have the same three content
// areas and nearly the same statements. Each course adds what only its outline
// has (comments say which). Codes in the comments are ASWB competencies.
// ---------------------------------------------------------------------------
export const ASWB_CLINICAL_SIM_OBJECTIVES = {
  risk: "Assess suicide and violence risk in a clinical social work session",
  threat: "Respond to a client's threat against an identifiable person under the NASW Code and state law",
} as const;
export const ASWB_MASTERS_SIM_OBJECTIVES = {
  involuntary: "Engage an involuntary client and contract for goals",
  report: "Make a mandated child abuse report and keep the family engaged",
} as const;

const VALUES = [
  // IA confidentiality
  "Explain confidentiality and privileged communication, their limits, and how HIPAA protects health information",
  // IA legal and ethical issues, dilemmas
  "Resolve an ethical dilemma with a decision-making model, weighing duties to clients, colleagues, the profession and society",
  // IA informed consent
  "Obtain and document informed consent, including with involuntary clients, clients of limited capacity and services by technology",
  // IA professional values and principles
  "Apply the NASW Code of Ethics' core values and ethical principles to everyday practice decisions",
  // IA burnout, secondary trauma, self-care, professional development
  "Recognize burnout, secondary traumatic stress and compassion fatigue, and plan self-care and continuing professional development",
  // IB self-determination
  "Protect client self-determination and the right to refuse services, and recognize when imminent risk limits it",
  // IB boundaries
  "Manage boundaries, dual relationships, conflicts of interest and self-disclosure, including power differences and online contact",
  // IB documentation, billing
  "Keep accurate, relevant records and bill only for services provided, by the person who provided them",
  // IB death and dying
  "Address the legal and ethical questions of serious illness and dying: advance directives, surrogate decisions and client autonomy",
  // IB supervision and management
  "Recognize ethical duties in supervision and management, such as fair evaluation and not exploiting supervisees",
  // IB governmental policies
  "Explain how local, state and federal law and policy shape eligibility and service delivery",
  // IB termination
  "End services ethically: planned termination, transfer, nonpayment and avoiding abandonment",
  // IB electronic practice
  "Apply ethical standards to electronic practice: technology-assisted services, electronic records and online searches about clients",
  // IC anti-oppressive, justice principles
  "Apply anti-oppressive and anti-racist approaches and social, racial, environmental and economic justice principles",
  // IC culture, intersectionality
  "Explain how culture, race, ethnicity, sexual orientation, gender and intersectionality shape identity, behavior and help-seeking",
  // IC accessibility
  "Make services accessible in language, physical setting and culture, with qualified interpreters, ASL and accommodations for neurodivergent clients",
  // IC power, privilege, bias
  "Recognize privilege, implicit bias, microaggressions and internalized oppression and their effect on the helping relationship",
  // IC exploitation, immigration, truth and reconciliation, restorative practices
  "Assess how exploitation, trafficking, immigration and refugee status and historical injustice affect marginalized communities, and use restorative practices",
];

const ASSESSMENT = [
  // IIA trauma, stressors, violence, crises
  "Recognize indicators and effects of trauma, crises and violence, including intergenerational, historical and complex trauma",
  // IIA family dynamics, interpersonal relationships
  "Assess family dynamics and how relationships develop in families, couples and groups, including nontraditional relationship structures",
  // IIA abuse and neglect, perpetrators
  "Recognize indicators of physical, sexual and psychological abuse and neglect, and characteristics of people who abuse",
  // IIA mental illness, co-occurring
  "Recognize indicators of mental and emotional illness and co-occurring disorders across the lifespan",
  // IIA biopsychosocial
  "Conduct a biopsychosocial assessment that brings together biological, psychological, social, cultural and spiritual factors",
  // IIA addiction and substance use
  "Recognize indicators and effects of substance use and addiction on individuals, families and communities",
  // IIA poverty, displacement
  "Assess how poverty, homelessness, displacement and other social determinants of health affect a client",
  // IIA self- and body-image, defense mechanisms
  "Identify defense mechanisms and the factors that shape self-image, and how both affect behavior and relationships",
  // IIA out-of-home placement, caregiving
  "Assess the effects of out-of-home placement and of caregiving on clients and families",
  // IIA exploitation across the lifespan
  "Recognize financial exploitation and trafficking of children, adults and older adults",
  // IIA development, ability, aging, racial and spiritual development
  "Apply knowledge of typical and atypical development, disability and aging, including racial, cultural and spiritual identity development",
  // IIA technology, urbanization, environment, climate
  "Assess how technology and social media, urbanization and environmental hazards including climate change affect clients",
  // IIA competence and self-determination
  "Assess a client's capacity for decisions about money, treatment and consent, including emancipation and age of consent",
  // IIB interviewing
  "Use interviewing techniques -- clarifying, validating, reflecting, confronting -- and work well through interpreters",
  // IIB involving clients, motivation and readiness
  "Involve clients in defining problems, and assess their motivation, barriers and readiness for change",
  // IIB strengths, resilience, coping, communication
  "Assess strengths, resources, resilience, coping and communication with suitable methods and instruments",
  // IIB sensitive information
  "Ask about sensitive subjects such as substance use and sexual abuse in ways that make disclosure safer",
  // IIB mental status examination
  "Explain the components and purpose of the mental status examination and record one",
  // IIB records and evaluations
  "Integrate information from medical, school, employment and psychological records into an assessment",
  // IIC community resources, goal and service planning, triage
  "Identify community resources and use triage, goal planning and service planning",
  // IIC modality selection, cultural considerations
  "Select intervention modalities that fit the client's abilities, development, culture and life stage",
  // IIC medications
  "Recognize the uses and common side effects of prescription, over-the-counter and alternative medications, and when to refer",
  // IIC readiness for termination
  "Recognize when a client is ready for termination",
];

const INTERVENTION = [
  // IIIA strengths-based and empowerment
  "Use strengths-based and empowerment strategies with individuals, families and communities",
  // IIIA helping relationship
  "Build and maintain a helping relationship through acceptance, empathy and rapport",
  // IIIA interdisciplinary collaboration
  "Collaborate on interdisciplinary teams, in care conferences and in IEP meetings",
  // IIIA problem-solving role, IIIB problem-solving models
  "Guide clients through the problem-solving process using problem-solving models",
  // IIIA end of life, IIIB loss, separation and grief
  "Support clients and families through dying, loss, separation and grief, including hospice and palliative care",
  // IIIA parenting
  "Assess parenting capacities and build parenting skills",
  // IIIA policies, procedures, regulations, legislation
  "Work within the laws, regulations and agency policies that govern a service, and advocate to change harmful ones",
  // IIIB trauma-informed care
  "Provide trauma-informed care for complex and vicarious trauma",
  // IIIB verbal and nonverbal communication, active listening, limit setting
  "Use verbal and nonverbal communication, active listening and limit setting",
  // IIIB crisis intervention
  "Provide crisis intervention and stabilize a client in acute distress",
  // IIIB emotional regulation, coping, stress and anger management
  "Teach emotional regulation, coping, stress-management and anger-management skills",
  // IIIB evidence-based practices
  "Choose among evidence-based practices -- CBT, DBT, mindfulness-based approaches, motivational interviewing, EMDR -- for a presenting problem",
  // IIIB harm reduction, addiction intervention
  "Apply harm reduction and addiction interventions",
  // IIIB advocacy, service networks, discharge and aftercare
  "Advocate for needed services, build service networks and plan discharge, aftercare and wraparound follow-up",
  // IIIB psychoeducation
  "Deliver psychoeducation to individuals, families and groups",
  // IIIB case management
  "Manage a case: case recording, documentation and case presentation",
  // IIIB conflict resolution
  "Use conflict resolution methods with clients, families and groups",
  // IIIB family therapy
  "Apply family therapy models such as structural, strategic and Bowen family systems",
  // IIIB group work
  "Lead groups through their stages, building cohesion and managing group process",
  // IIIC evaluating progress
  "Evaluate client progress and intervention effectiveness with measures such as single-system designs",
  // IIIC program evaluation, research design
  "Evaluate programs -- needs assessment, formative and summative evaluation, cost-effectiveness -- and judge research design, reliability and validity",
  // IIID supervisee's role, models, transference
  "Use supervision and consultation well: the supervisee's role, supervision models, and transference and countertransference in supervision",
  // IIID risk policies
  "Create and evaluate policies and procedures that reduce risk to clients, staff and communities",
];

export const ASWB_CLINICAL_TRACK: SeedTrack = {
  code: "ASWBCLINICAL",
  title: "Exam Prep for ASWB Clinical Examination",
  description: `Preparation for the Association of Social Work Boards Clinical exam, the 2026 blueprint in use since August 3, 2026: values and ethics, assessment and planning, and intervention and practice, weighted as the exam weights them, with every applied knowledge statement ASWB lists. ${DESCRIPTION_TAIL}`,
  trackType: "certification",
  subcategorySlug: "social-work-licensure",
  freshnessModel: "certification_aligned",
  sourceUrl: ASWB_GUIDEBOOK_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: MENTAL_HEALTH_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: aswbCredential({
    slug: "aswb-clinical",
    name: "ASWB Clinical Examination",
    code: "ASWB Clinical",
    recommended:
      "ASWB's Clinical category assumes a master's degree in social work and two years (or what the jurisdiction counts as equivalent) of supervised clinical experience; your social work board decides eligibility and tells ASWB which exam you are approved to take. In Washington, WAC 246-809-340 approves ASWB's advanced or clinical examination for social work licensure, with the testing company's passing score. Check what your board requires.",
  }),
  units: [
    {
      title: "Values and Ethics",
      rangeLabel: "36% of the exam",
      weight: 36,
      gate: "Given a fictional clinical dilemma, name the NASW Code standards and laws in play, work through a decision model, and choose the action that protects the client and others, including what you say about consent, confidentiality and limits.",
      sources: [outlineSource("clinical", "I"), S.nasw, S.format, S.waRule],
      objectives: [
        ...VALUES,
        // IB research ethics (Clinical only)
        "Apply research ethics: institutional review board approval, voluntary informed consent and protection of participants",
        ASWB_CLINICAL_SIM_OBJECTIVES.threat,
      ],
    },
    {
      title: "Assessment and Planning",
      rangeLabel: "32% of the exam",
      weight: 32,
      gate: "Given a fictional intake, gather the biopsychosocial history, assess risk, use DSM-5-TR criteria to reach a working diagnosis with its rule-outs, and turn it into a plan with the client that fits their culture and readiness.",
      sources: [outlineSource("clinical", "II"), S.dsm, S.format],
      objectives: [
        ...ASSESSMENT,
        // IIB DSM (Clinical only)
        "Use DSM-5-TR criteria in assessment, including differential diagnosis and medical and substance rule-outs",
        ASWB_CLINICAL_SIM_OBJECTIVES.risk,
      ],
    },
    {
      title: "Intervention and Practice",
      rangeLabel: "32% of the exam",
      weight: 32,
      gate: "Given a fictional session, choose the intervention that fits the client's problem, readiness and culture, say what you expect it to do and how you will measure it, and handle the supervision or documentation question it raises.",
      sources: [outlineSource("clinical", "III"), S.nasw, S.format],
      objectives: [
        ...INTERVENTION,
        // IIIA formal documents (Clinical only)
        "Write formal documents such as clinical reports, evaluations and proposals",
        // IIIB assertiveness, role modeling, role play (Clinical only)
        "Use assertiveness training, role modeling and role play to build client skills",
        // IIIB couples (Clinical only)
        "Apply couples interventions and treatment approaches",
        // IIIC program objectives, quality assurance (Clinical only)
        "Set program objectives and outcomes and take part in quality assurance reviews",
        // IIID organizational development, fiscal management (Clinical only)
        "Explain how organizational structure, policy and fiscal management shape clinical services",
      ],
    },
  ],
};

export const ASWB_MASTERS_TRACK: SeedTrack = {
  code: "ASWBMASTERS",
  title: "Exam Prep for ASWB Masters Examination",
  description: `Preparation for the Association of Social Work Boards Masters exam, the 2026 blueprint in use since August 3, 2026: values and ethics, assessment and planning, and intervention and practice, weighted as the exam weights them, with every applied knowledge statement ASWB lists. ${DESCRIPTION_TAIL}`,
  trackType: "certification",
  subcategorySlug: "social-work-licensure",
  freshnessModel: "certification_aligned",
  sourceUrl: ASWB_GUIDEBOOK_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: MENTAL_HEALTH_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: aswbCredential({
    slug: "aswb-masters",
    name: "ASWB Masters Examination",
    code: "ASWB Masters",
    recommended:
      "ASWB's Masters category assumes a master's degree in social work; your social work board decides eligibility and tells ASWB which exam you are approved to take. Washington's rule (WAC 246-809-340) names ASWB's advanced and clinical examinations, not the Masters, so a Washington candidate should confirm with the Department of Health which exam their credential needs.",
  }),
  units: [
    {
      title: "Values and Ethics",
      rangeLabel: "35% of the exam",
      weight: 35,
      gate: "Given a fictional practice dilemma, name the NASW Code standards and laws in play, work through a decision model, and choose the action that protects the client, including what you say about consent, confidentiality, reporting and boundaries.",
      sources: [outlineSource("masters", "I"), S.nasw, S.format, S.waRule],
      objectives: [...VALUES, ASWB_MASTERS_SIM_OBJECTIVES.report],
    },
    {
      title: "Assessment and Planning",
      rangeLabel: "33% of the exam",
      weight: 33,
      gate: "Given a fictional referral, gather the history with the client, assess risk, strengths and needs, and build a service plan with community resources that fits the client's culture and readiness.",
      sources: [outlineSource("masters", "II"), S.dsm, S.format],
      objectives: [
        ...ASSESSMENT,
        // IIB risk of harm (both outlines; the Clinical course carries it as its sim objective)
        "Assess risk of harm to self and others and act on what you find",
      ],
    },
    {
      title: "Intervention and Practice",
      rangeLabel: "32% of the exam",
      weight: 32,
      gate: "Given a fictional client, family, group or community, choose the intervention that fits the problem and the client's readiness, contract for measurable goals, and say how you will evaluate it.",
      sources: [outlineSource("masters", "III"), S.nasw, S.format],
      objectives: [
        ...INTERVENTION,
        // IIIA permanency planning (Masters only)
        "Plan for permanency for children in the child welfare system",
        // IIIA community organizing (Masters only)
        "Organize communities and mobilize community participation",
        // IIIB social change and social planning (Masters only)
        "Use social change and social planning methods",
        // IIID healthy work environment (Masters only)
        "Create and evaluate policies for a safe, inclusive and healthy workplace",
        ASWB_MASTERS_SIM_OBJECTIVES.involuntary,
      ],
    },
  ],
};

export const ASWB_TRACKS: readonly SeedTrack[] = [ASWB_CLINICAL_TRACK, ASWB_MASTERS_TRACK];
