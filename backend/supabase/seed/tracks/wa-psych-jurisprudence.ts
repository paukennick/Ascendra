// REQ-287 (Nick 2026-11-10 and 2026-11-14): the Washington psychology
// jurisprudence course, the last of the first mental health wave.
//
// WHAT THE EXAM IS NOW. Washington's Examining Board of Psychology moved the
// jurisprudence examination from a licensure requirement to a continuing
// education one. WAC 246-924-230(1)(d), as amended by WSR 25-15-068 (filed
// 2025-07-14, effective 2025-08-14): "After initial licensure, a psychologist
// must take and pass the jurisprudence examination within their first CE
// cycle"; after that it is optional and earns one CE hour per three-year cycle
// (WAC 246-924-240(6)). The Department of Health's psychologist CE page (read
// 2026-11-14) says the same, that "Starting August 14, 2025 applicants are no
// longer required to complete the JP exam as a condition of licensure", that a
// psychologist licensed earlier may still need it if their CE cycle falls under
// the new rule, and that the exam link is requested by email from psychology
// staff. A reciprocity (probationary) applicant must still show it: RCW
// 18.83.170(2)(b) lets the department require "a jurisprudential examination",
// and WAC 246-924-493(3)(b) requires "Proof of passing the jurisprudence exam
// according to WAC 246-924-070" -- a cross-reference that no longer fits, since
// the 2025 amendment left 246-924-070 about the EPPP only (recorded, not
// interpreted). DOH publishes no content outline, question count or passing
// score for the exam; its "Jurisprudence Exam RCW and WAC References" page
// (read 2026-11-14) lists the laws it draws on, and those are this course's
// outline:
//   chapter 18.83 RCW and chapter 246-924 WAC ("directly relate to
//   psychology"); chapter 18.130 RCW (Uniform Disciplinary Act); RCW 26.44.030
//   (abuse of children); chapter 70.02 RCW (health care information); chapter
//   74.34 RCW (abuse of vulnerable adults); chapters 246-12, 246-15 and 246-16
//   WAC.
//
// What was read, and when (all 2026-11-14 at app.leg.wa.gov, current text,
// in full unless noted):
//   - chapter 18.83 RCW, every section. Latest amendments: 2024 c 371, sections
//     2-12 effective 2025-10-01 (the "licensed psychological associate"
//     license, RCW 18.19.020's effective-date note).
//   - chapter 246-924 WAC, every section. Latest: WSR 25-15-068 (most sections
//     effective 2025-08-14; the associate sections and 246-924-100 effective
//     2025-10-01) and WSR 25-12-013 (fees, effective 2025-10-01). DOH's "Rules
//     in Progress" page lists no psychology rulemaking after those.
//   - RCW 26.44.030 (latest 2025 c 197 and c 192), RCW 74.34.020 and .035,
//     RCW 70.02.030, .050, .080, .230 and .240 (70.02.230 has a version
//     effective until 2027-06-30 and another from 2027-06-30, read both),
//     RCW 18.130.160 and .180 (latest 2025 c 389), WAC 246-16-220 to -235,
//     WAC 246-15-020, WAC 246-12-030 and -040 (246-12-030 amended by WSR
//     26-11-023, effective 2026-06-14). Section lists only, not every section:
//     the rest of chapters 18.130, 70.02, 74.34, 246-12, 246-15 and 246-16.
//   - RCW 71.05.120(3), the duty to warn or protect: not on DOH's list, added
//     because the duty-to-protect objective needs the Washington rule.
//
// CATEGORY AND TITLE (Nick asked for the reasoning). The closest existing
// course is Prep for the EPPP (tracks/eppp.ts): a psychology licensing-board
// exam, under Mental Health > Psychology Licensure, trackType certification,
// credential basis regulatory_licensure, "Prep for the ..." title. This
// course follows it: same subcategory (migration 077 already names "the
// Washington psychology jurisprudence exam" as a psychology-licensure course,
// and lib/mature-content.ts lists it in the wave), so the per-course 18+
// acknowledgment applies through the category like every mental health
// course; title "Prep for the Washington Psychology Jurisprudence Exam". Two
// differences from the EPPP, both because the exam publishes no blueprint:
//   - domainWeights "study_emphasis" (REQ-220, as the CNA course): the unit
//     weights are our judgment of emphasis, never shown as "% of the exam";
//   - the credential is the exam itself (credentialType "jurisprudence_exam"),
//     not a license; no format or passing score is invented -- questionFormat
//     says DOH does not publish them.
// contentReviewDueAt 2027-05-15: Washington's 2027 session ends in April and
// its laws usually take effect in July, and RCW 70.02.230 changes on
// 2027-06-30; every source is rechecked before then.

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
const REVIEW_DUE_AT = "2027-05-15T00:00:00Z";
const RECHECK = "2027-05-15";

export const WA_JP_REFERENCES_URL =
  "https://doh.wa.gov/licenses-permits-and-certificates/professions-new-renew-or-update/psychologist/jurisprudence-exam-rcw-and-wac-references";
const DOH_CE_URL = "https://doh.wa.gov/licenses-permits-and-certificates/professions-new-renew-or-update/psychologist/continuing-education";
const rcw = (cite: string) => `https://app.leg.wa.gov/rcw/default.aspx?cite=${cite}`;
const wac = (cite: string) => `https://app.leg.wa.gov/wac/default.aspx?cite=${cite}`;

const MENTAL_HEALTH_DISCLAIMER_KEY = "mental-health-clinical-content";

const src = (title: string, url: string, extra: Partial<UnitSource> = {}): UnitSource => ({
  title,
  ...source(url, "reference", CHECKED, RECHECK),
  ...extra,
});

export const WA_JP_SOURCES = {
  references: src("Washington DOH, Jurisprudence Exam RCW and WAC References (the laws the exam draws on)", WA_JP_REFERENCES_URL, {
    outline: [
      "Chapter 18.83 RCW (psychologists)",
      "Chapter 246-924 WAC (psychologists)",
      "Chapter 18.130 RCW, Regulation of Health Professions - Uniform Disciplinary Act",
      "RCW 26.44.030, Abuse of Children and Adult Dependent Persons",
      "Chapter 70.02 RCW, Medical Records - Health Care Information Access and Disclosure",
      "Chapter 74.34 RCW, Abuse of Vulnerable Adults",
      "Chapter 246-12 WAC, Administrative Procedures and Requirements for Credentialed Health Care Providers",
      "Chapter 246-15 WAC, Whistleblower Complaints in Health Care Settings",
      "Chapter 246-16 WAC, Standards of Professional Conduct",
    ],
  }),
  dohCe: src("Washington DOH, Psychologist - Continuing Education (jurisprudence exam within the first CE cycle)", DOH_CE_URL, {
    keyValues: [
      "since 2025-08-14 the jurisprudence exam is not a condition of licensure; a psychologist must take and pass it within the first CE cycle after initial licensure, and may claim one CE hour per cycle for passing it after that",
      "the exam link is requested by email from DOH psychology staff; DOH publishes no question count, time limit or passing score",
    ],
  }),
  rcw1883: src("Chapter 18.83 RCW, Psychologists (2024 c 371 in effect from 2025-10-01)", rcw("18.83"), {
    keyValues: [
      "18.83.010: the practice of psychology is observing, evaluating, interpreting and modifying behavior by psychological principles, including testing, diagnosis and treatment, and counseling; it does not include prescribing drugs, teaching psychology at accredited institutions, or research",
      "18.83.020: the titles psychology, psychological, psychologist or a term of like import need a license; a licensed psychological associate gives each client a disclosure form at first contact saying they are supervised",
      "18.83.035: the examining board is nine psychologists and two public members appointed by the governor",
      "18.83.070: a psychologist license needs good moral character, a doctoral degree from an integrated program of graduate study in psychology, at least two years of supervised experience, and the board's examination",
      "18.83.082: a temporary permit allows practice up to 90 days in a calendar year, free of charge",
      "18.83.105: a licensed psychological associate is a doctoral student or postdoctoral resident deemed competent and practices only under a licensed supervisor; an applicant may practice under direct supervision for 120 days after a complete application",
      "18.83.110: client communications are privileged as attorney-client communications are, subject to RCW 71.05.217(6) and (7)",
      "18.83.115: at the start of treatment the psychologist gives written disclosure information (education and training, therapeutic orientation, proposed treatment, financial requirements, the right to refuse treatment, confidentiality) acknowledged in writing by both",
      "18.83.121: the board may discipline for breaking confidentiality, violating its ethics code, failing to inform research subjects of serious effects, practicing where clearly untrained, failing to supervise, licensing fraud, lacking required insurance, violating psychology laws or rules, and gross or continued overcharging",
      "18.83.180: using a title implying licensure without one, or practicing while suspended or revoked, is a gross misdemeanor",
      "18.83.200: exempt are university teaching and research, school psychologists credentialed by the professional educator standards board at work, certain government employees, business employees not offering services to the public (no clinical practice), students and trainees using a training title, and social psychologists who file their education",
    ],
  }),
  wac924Licensing: src("Chapter 246-924 WAC: licensure, supervised experience, associates, endorsement and permits (WSR 25-15-068)", wac("246-924"), {
    keyValues: [
      "246-924-043: 3,300 supervised hours -- a practicum of at least 300 hours over at least nine months, and at least two years and 3,000 hours that include an internship of at least 1,500 hours; 1,500 hours may be postdoctoral; reduced to 2,820 for three years as a substance use disorder professional in the last ten",
      "246-924-070: the EPPP with a scaled score of at least 500",
      "246-924-095: a third or later EPPP attempt needs a one-month wait and a board-approved action plan",
      "246-924-059: postdoctoral supervisees use a training title, clients are told who the supervisor is, services are never billed as the supervisor's, and at least 50 percent of postdoctoral supervision is by a licensed psychologist",
      "246-924-161: associate levels 1 (practicum), 2 (internship) and 3 (postdoctoral), each told to clients; a new supervision agreement within 30 days of a supervisor change (246-924-155)",
      "246-924-480: a temporary permit is valid no more than 90 days in a calendar year; 246-924-483: a temporary practice permit while the national background check finishes expires at licensure, a decision, or 210 days",
      "246-924-493: a reciprocity (probationary) license lasts one year and can be renewed once",
      "246-924-012: clinical telehealth needs a one-time telemedicine training, the Uniform Telehealth Act (chapter 18.134 RCW), documented client agreement, and technology consistent with HIPAA and chapter 70.02 RCW",
      "246-924-030: a psychologist supervising ancillary staff accepts full responsibility, tells clients the staff member's status and the supervisor's identity, and countersigns reports",
    ],
  }),
  wac924Ce: src("Chapter 246-924 WAC and chapter 246-12 WAC: continuing education, renewal and fees", wac("246-924-230"), {
    keyValues: [
      "246-924-230: 60 CE hours every three years, including at least four in ethics, two in health equity, six in suicide prevention every six years (from the DOH model list), and the jurisprudence exam within the first CE cycle",
      "246-924-240(5): teaching an approved CE program earns at most 30 hours per three years; (2) courses mainly about practice income or office efficiency do not count",
      "246-924-255: the first suicide prevention training is in assessment, treatment and management; later ones are advanced or in effective treatment modalities",
      "246-924-250(1): a license expired three years or more needs 40 CE hours, four in ethics, within the two years before reinstatement",
      "246-924-990(1): licenses renew every year on the practitioner's birthday (probationary licenses excepted); WAC 246-12-030: renewal fees are accepted no sooner than 90 days before expiration",
      "WAC 246-12-040: an expired credential may not be used to practice until returned to active status",
    ],
  }),
  wac924Ethics: src("Chapter 246-924 WAC: rules of ethical conduct (246-924-351 to -367)", wac("246-924-351"), {
    keyValues: [
      "246-924-353: practice only where competent by education, training or experience; refer when it is in the client's best interest",
      "246-924-354: document the presenting problem, fee arrangement, dates and services, tests and reports, consultations and progress notes; keep records at least eight years after last contact, and for a minor until age 22 or eight years, whichever is longer; keep a written plan for records if the psychologist retires, leaves or dies",
      "246-924-355: arrange for clients' emergency needs during anticipated absences",
      "246-924-356 and -357: do not start or continue when the psychologist's competency is impaired or objectivity is impaired by another relationship; end with notice and help the client find another professional",
      "246-924-358: never sexual misconduct with a current client or key party; none for five years after services end with a former client and two years with a key party, and never if the client may need services again or there is an imbalance of power; the client's consent or initiation is no excuse",
      "246-924-359: explain procedures truthfully; terminate when the client no longer needs, benefits from or is harmed by the service, and offer help finding alternatives",
      "246-924-363: disclose without written consent only as chapter 70.02 RCW allows; clarify confidentiality in writing when more than one party has an interest; tell clients under 13 or with a guardian the legal limits; clarify limits with 13-18-year-olds and their guardians at the outset; comply with chapter 26.44 RCW; documented consent before observing or recording",
      "246-924-364: no misleading fee information; bartering only if not clinically contraindicated and not exploitive",
      "246-924-365: give interpretive aids with results; never rely only on automated results; state limitations; protect test security",
    ],
  }),
  wac924Parenting: src("WAC 246-924-445 and -467: parenting evaluations and limited services", wac("246-924-445"), {
    keyValues: [
      "focus on the best interest of each child; consider each parent's relationship with the child, past parenting, ability to parent and the child's needs and development, and RCW 26.09.191's limiting factors",
      "conclusions rest on more than one source; a psychologist who treated any party should decline unless there are mitigating circumstances (rural or underserved areas); disclose fees, who requested and receives the report, and confidentiality limits in writing at the outset",
      "raw test data goes only to a qualified person with authorization, or as the court directs",
    ],
  }),
  rcw7002: src("Chapter 70.02 RCW, Uniform Health Care Information Act (RCW 70.02.230 changes on 2027-06-30)", rcw("70.02"), {
    keyValues: [
      "70.02.030: a valid authorization is in writing, dated and signed, names the information, the recipient, the discloser and the patient, and has an expiration date or event",
      "70.02.050(1)(c): a provider may disclose without authorization to someone able to prevent or lessen a serious and imminent threat to health or safety, including the target; the chapter does not oblige it",
      "70.02.080: a patient's written request to see or copy records is answered within 15 working days (up to 21 with a written reason for delay)",
      "70.02.230: the fact of admission and all mental health records stay confidential except as the chapter allows, such as to law enforcement and a person whose health and safety the patient has threatened; 70.02.240 covers minors treated under chapter 71.34 RCW",
    ],
  }),
  rcw7105: src("RCW 71.05.120(3): the duty to warn or to protect (not on DOH's list)", rcw("71.05.120"), {
    keyValues: [
      "the duty to warn or take reasonable precautions arises when a patient has communicated an actual threat of physical violence against a reasonably identifiable victim; it is discharged by reasonable efforts to communicate the threat to the victim and to law enforcement",
    ],
  }),
  rcw2644: src("RCW 26.44.030: mandated reports of child abuse or neglect (2025 amendments)", rcw("26.44.030"), {
    keyValues: [
      "psychologists are mandated reporters: with reasonable cause to believe a child has suffered abuse or neglect, report to law enforcement or the Department of Children, Youth, and Families",
      "the report is made at the first opportunity and in no case later than 48 hours after there is reasonable cause, and includes the identity of the accused if known",
      "abuse that happened in childhood and is discovered after the person is an adult need not be reported, unless other children are or may be at risk from the accused",
    ],
  }),
  rcw7434: src("Chapter 74.34 RCW: abuse of vulnerable adults (74.34.020 and .035)", rcw("74.34"), {
    keyValues: [
      "health care providers under chapter 18.130 RCW are mandated reporters; they report abandonment, abuse, financial exploitation or neglect of a vulnerable adult to the Department of Social and Health Services immediately",
      "suspected sexual assault, and physical assault (with narrow exceptions for minor injuries between vulnerable adults), is also reported immediately to law enforcement",
      "a vulnerable adult includes a person 60 or older unable to care for themselves, a person under guardianship, with a developmental disability, admitted to a facility, or receiving home health, hospice, home care or individual provider services",
      "the reporter's identity is confidential unless there is a judicial proceeding or they consent",
    ],
  }),
  uda: src("Chapter 18.130 RCW, Uniform Disciplinary Act (18.130.160 and .180, 2025 amendments)", rcw("18.130"), {
    keyValues: [
      "18.130.180 lists unprofessional conduct for every license holder, including moral turpitude or dishonesty, incompetence or negligence creating unreasonable risk of harm, violating the profession's laws or rules, failing to cooperate with the disciplining authority, practicing beyond scope, current misuse of alcohol or drugs, willful betrayal of privilege, abuse of or sexual contact with a client, and conversion therapy with a client under 18",
      "18.130.160 sanctions include revocation, suspension, restriction, remedial education or treatment, practice monitoring, censure or reprimand, probation, a fine of up to $5,000 per violation, corrective action, refund of fees, and surrender",
    ],
  }),
  wac24616: src("Chapter 246-16 WAC: standards of professional conduct and mandatory reporting (246-16-220 to -235)", wac("246-16"), {
    keyValues: [
      "a license holder self-reports any finding of unprofessional conduct, inability to practice safely due to a mental or physical condition, and Medicare or Medicaid disqualification",
      "a license holder with actual knowledge that another license holder has been found to have committed unprofessional conduct, or may be unable to practice safely, reports it (exceptions include treating that license holder when there is no clear and present danger to clients)",
      "reports go to the Department of Health within 30 calendar days of actual knowledge; where a patient was harmed, an impaired-practitioner program report does not substitute",
    ],
  }),
  wac24615: src("Chapter 246-15 WAC: whistleblower complaints in health care settings", wac("246-15"), {
    keyValues: [
      "a good-faith whistleblower's identity stays confidential, revealed only to agency staff or the disciplining authority, by court order, or if the complaint was not in good faith",
    ],
  }),
} as const;

const S = WA_JP_SOURCES;

export const WA_JP_TRACK: SeedTrack = {
  code: "WAPSYCHJP",
  title: "Prep for the Washington Psychology Jurisprudence Exam",
  description:
    "Preparation for Washington's jurisprudence examination for psychologists, which a newly licensed psychologist must pass within their first continuing education cycle: chapter 18.83 RCW and chapter 246-924 WAC, the Uniform Disciplinary Act, health care information and mental health records, mandated reporting of child and vulnerable adult abuse, and the Department of Health's standards of conduct, as the Department lists them. Unit weights are a study emphasis, not an exam blueprint (none is published). Includes frank material on abuse, sexual misconduct and threats of violence where the law covers it, behind an 18+ content notice. Independently developed; not affiliated with or endorsed by the Washington State Department of Health or the Examining Board of Psychology. Not legal advice.",
  trackType: "certification",
  subcategorySlug: "psychology-licensure",
  freshnessModel: "certification_aligned",
  sourceUrl: WA_JP_REFERENCES_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  requiresAcknowledgement: true,
  disclaimerKey: MENTAL_HEALTH_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  credential: {
    domainWeights: "study_emphasis", // REQ-220: DOH publishes no blueprint
    providerSlug: "wa-doh-psychology",
    providerName: "Washington State Department of Health, Examining Board of Psychology",
    providerUrl: "https://doh.wa.gov/licenses-permits-and-certificates/professions-new-renew-or-update/psychologist",
    subcategorySlug: "psychology-licensure",
    credentialType: "jurisprudence_exam",
    credentialSlug: "wa-psychology-jurisprudence",
    credentialName: "Washington Psychology Jurisprudence Examination",
    credentialUrl: DOH_CE_URL,
    basis: "regulatory_licensure",
    standardName: "Ch. 18.83 RCW, ch. 246-924 WAC and DOH's jurisprudence reference list",
    standardRevision: "In force 2026-11-14 (WAC 246-924 to WSR 25-15-068; RCW 18.83 to 2024 c 371)",
    objectivesRevision: "DOH reference list: 2 primary and 7 related chapters or sections",
    versionNote:
      "DOH prints no version, outline or blueprint for the exam; the course follows the laws on DOH's reference list as in force on 2026-11-14. Washington's 2027 session and RCW 70.02.230's 2027-06-30 change are why it is due for review by 2027-05-15.",
    status: "active",
    officialObjectivesUrl: WA_JP_REFERENCES_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "For psychologists licensed in Washington: since 2025-08-14 the exam is no longer a condition of licensure, but WAC 246-924-230 requires passing it within your first three-year continuing education cycle, and it counts as one CE hour (optional, one hour per cycle, after that). A probationary (reciprocity) applicant must also show a passed jurisprudence exam (WAC 246-924-493). Request the exam link from DOH's psychology staff.",
    questionFormat:
      "Online, taken through a link the Department of Health sends on request. DOH does not publish the number of questions, the time allowed or the format; this course does not guess them.",
    passingScorePolicy:
      "DOH does not publish a passing score. Passing earns one continuing education hour (WAC 246-924-240(6)); keep the documentation in case of a CE audit.",
  },
  units: [
    {
      title: "Licensure, Scope and the Examining Board",
      rangeLabel: "Study emphasis: about 15%",
      weight: 15,
      gate: "Given a fictional applicant, associate, trainee or out-of-state psychologist, say whether and under what license, title, permit or supervision they may practice in Washington, and which RCW or WAC section decides it.",
      sources: [S.references, S.rcw1883, S.wac924Licensing],
      objectives: [
        "Define the practice of psychology in Washington and what it excludes, including prescribing",
        "Identify who must be licensed to use the title psychologist and who is exempt",
        "State the education, supervised experience and examination requirements for a psychologist license",
        "Explain the licensed psychological associate license: who qualifies, levels of training, supervision and client disclosure",
        "Compare licensure by endorsement, reciprocity with a probationary license, and temporary permits for out-of-state psychologists",
        "Explain the examining board's composition and powers, including its ethics code and examinations",
        "Supervise trainees and ancillary staff as the rules require: training titles, client disclosure, records and billing",
      ],
    },
    {
      title: "Continuing Education, Renewal and Credential Status",
      rangeLabel: "Study emphasis: about 10%",
      weight: 10,
      gate: "Given a fictional psychologist's CE record and license dates, say whether they meet the three-year requirement, what is missing, when the license renews, and what an audit, extension or lapse would mean.",
      sources: [S.references, S.dohCe, S.wac924Ce],
      objectives: [
        "Plan a three-year continuing education cycle that meets the ethics, health equity, suicide prevention and jurisprudence requirements",
        "Identify activities that do and do not earn continuing education credit, and the documentation an audit needs",
        "Renew a license on time and return an expired, inactive or retired credential to active status",
        "Use the continuing education extension and waiver rules",
      ],
    },
    {
      title: "Rules of Ethical Conduct and Practice Standards",
      rangeLabel: "Study emphasis: about 30%",
      weight: 30,
      gate: "Given a fictional practice situation, name the WAC 246-924 rule of ethical conduct in play and what it requires, and say what the psychologist does next, including what is disclosed and documented.",
      sources: [S.references, S.rcw1883, S.wac924Ethics, S.wac924Licensing, S.wac924Parenting],
      objectives: [
        "Give clients the disclosure information Washington requires at the start of treatment",
        "Practice within competence, refer when it serves the client, and stop when impairment affects competence",
        "Recognize multiple relationships that impair objectivity and end them properly",
        "Apply Washington's sexual misconduct rule, including the waiting periods for former clients and key parties",
        "Keep and retain records as Washington requires, including a plan for records when a psychologist leaves practice",
        "Set fees, bartering and termination in line with the client welfare and fee rules",
        "Report and use assessment results with their limits, and protect test security",
        "Meet Washington's telehealth standards for psychologists",
        "Conduct a parenting evaluation to Washington's minimum standards",
      ],
    },
    {
      title: "Confidentiality, Privilege and Health Care Information",
      rangeLabel: "Study emphasis: about 20%",
      weight: 20,
      gate: "Given a fictional request for records or a disclosure without consent, decide whether Washington law requires, permits or forbids it, what form the authorization must take, and what to tell the client.",
      sources: [S.references, S.rcw1883, S.wac924Ethics, S.rcw7002, S.rcw7105],
      objectives: [
        "Explain psychologist-client privilege in Washington and how it differs from confidentiality",
        "Write a valid authorization to disclose health care information under chapter 70.02 RCW",
        "Decide when health care and mental health information may be disclosed without authorization",
        "Apply the duty to warn or protect when a client threatens an identifiable person",
        "Explain confidentiality with minors, guardians and multiple parties under Washington law",
        "Respond to a client's request to see or copy their record within the statutory time",
      ],
    },
    {
      title: "Mandatory Reporting",
      rangeLabel: "Study emphasis: about 15%",
      weight: 15,
      gate: "Given a fictional disclosure about a child, a vulnerable adult or a colleague, decide whether the law requires a report, to whom, by when, and what the report should contain.",
      sources: [S.references, S.rcw2644, S.rcw7434, S.wac24616, S.wac24615],
      objectives: [
        "Report suspected child abuse or neglect as a mandated reporter, on time and to the right agency",
        "Report suspected abuse, neglect or financial exploitation of a vulnerable adult",
        "Report another license holder's unprofessional conduct or impairment, and self-report, as the rules require",
        "Explain the protections for people who report in good faith, including whistleblowers",
      ],
    },
    {
      title: "Discipline Under the Uniform Disciplinary Act",
      rangeLabel: "Study emphasis: about 10%",
      weight: 10,
      gate: "Given a fictional complaint, identify the unprofessional conduct alleged under RCW 18.130.180 and 18.83.121, how the board would handle it, and the range of sanctions it could order.",
      sources: [S.references, S.uda, S.rcw1883, S.wac24616],
      objectives: [
        "Identify unprofessional conduct under the Uniform Disciplinary Act and the psychology-specific grounds",
        "Describe how a complaint is investigated and resolved, and the sanctions a board can order",
        "Distinguish unlicensed practice and its criminal penalties from discipline of a license holder",
      ],
    },
  ],
};

export const WA_JP_TRACKS: readonly SeedTrack[] = [WA_JP_TRACK];
