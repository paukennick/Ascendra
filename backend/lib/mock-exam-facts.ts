import type { ExamFormat } from "@/lib/exam-formats";

// REQ-298: the real exam behind a course's full-length mock, one entry per
// course, each read at the certifying body's own site and dated.
//
// WHY A SEPARATE FILE. The seed's credential block (credential_exams:
// duration_minutes, question_format, passing_score_policy) is prose in the
// vendor's words, and lib/exam-formats.ts turns "65 questions (50 scored, 15
// unscored)" into a number with a regular expression. That is good enough for
// a hint and wrong often enough to matter: it read the NSCA-CSCS exam as 40
// questions (FAIL-2020). An entry here is typed, read by a person from the
// source it names on the day it names, and wins over the parsed text when the
// mock is built. A course with no entry still gets a mock from the seed text,
// and the app says the length is approximate (see mockFormNote).
//
// WHAT AN ENTRY CLAIMS. Only what the source printed. A number a body does not
// publish is null, never a guess: AACN publishes no CCRN cut score, so the
// pass line says so. `readAt` is the day the page or PDF was read; `via` says
// whether it was the page itself or only a summary of it. `reviewDue` is when
// the entry should be read again (vendors retire and revise exams);
// scripts/mock-bank-report.ts lists the entries past it.
//
// Domain weights are NOT copied here: they live once, in the seed's unit
// weights (course_units.weight), which the blueprint tests keep at 100. They
// were compared with the guide for the entries below (see the REQ-298 report).

export interface ExamFactSource {
  title: string;
  url: string;
  readAt: string; // YYYY-MM-DD, the day it was read
  via: "page" | "pdf" | "summary";
}

// What the body reports as a result.
export type PassReport =
  // A published scale and a published passing score on it.
  | { kind: "scaled"; passing: number; scaleMin: number; scaleMax: number }
  // Pass or fail only; the body publishes no score at all.
  | { kind: "pass_fail_only" }
  // Pass or fail against a standard whose cut score is not published.
  | { kind: "cut_unpublished" };

export interface MockExamFacts {
  code: string; // catalog track code (subject_tracks.code)
  body: string; // who sets the exam, as a learner knows them ("AWS", "CompTIA")
  examCode: string | null;
  // Questions the candidate sees, scored and unscored together. When the body
  // prints "maximum of N", N, with questionsAreMaximum.
  questions: number;
  questionsAreMaximum?: boolean;
  // How many of them count toward the score, when published.
  scored: number | null;
  // Testing minutes. null when the body publishes none.
  minutes: number | null;
  minutesNote?: string;
  pass: PassReport;
  // Overrides of what the seed text implies, when the source says otherwise.
  formats?: ExamFormat[];
  exhibits?: boolean;
  // Item types on the real exam that a mock cannot show (we have no simulator
  // inside a mock): said to the learner, not hidden.
  notReproduced?: string;
  // Where this entry disagrees with the seed's credential block, and why the
  // entry is right (lib/mock-exam-facts.test.ts allows a difference only with
  // this note).
  seedDiffers?: string;
  sources: ExamFactSource[];
  reviewDue: string; // YYYY-MM-DD
}

const D = "2026-11-14"; // the day the entries below were read

const aws = (code: string, examCode: string, o: {
  questions: number;
  scored: number;
  minutes: number;
  passing: number;
  formats?: ExamFormat[];
  guide: string;
  page: string;
  seedDiffers?: string;
  reviewDue?: string;
  minutesNote?: string;
}): MockExamFacts => ({
  code,
  body: "AWS",
  examCode,
  questions: o.questions,
  scored: o.scored,
  minutes: o.minutes,
  minutesNote: o.minutesNote,
  pass: { kind: "scaled", passing: o.passing, scaleMin: 100, scaleMax: 1000 },
  formats: o.formats,
  seedDiffers: o.seedDiffers,
  sources: [
    { title: `AWS Certified exam guide (${examCode}): exam content and exam results`, url: o.guide, readAt: D, via: "page" },
    { title: `AWS Certification page (${examCode}): exam duration and format`, url: o.page, readAt: D, via: "page" },
  ],
  reviewDue: o.reviewDue ?? "2027-05-14",
});

const MC_MR: ExamFormat[] = ["multiple_choice", "multiple_response"];
const ALL4: ExamFormat[] = ["multiple_choice", "multiple_response", "ordering", "matching"];

const compTia = (code: string, examCode: string, o: {
  minutes: number;
  pass: PassReport;
  page: string;
  notReproduced?: string;
  seedDiffers?: string;
  reviewDue?: string;
  formats?: ExamFormat[];
}): MockExamFacts => ({
  code,
  body: "CompTIA",
  examCode,
  questions: 90,
  questionsAreMaximum: true,
  scored: null, // CompTIA does not say how many of the (up to) 90 are unscored
  minutes: o.minutes,
  pass: o.pass,
  formats: o.formats,
  notReproduced: o.notReproduced ?? "performance-based questions (hands-on simulations)",
  seedDiffers: o.seedDiffers,
  sources: [{ title: `CompTIA certification page (${examCode}): number of questions, duration, passing score`, url: o.page, readAt: D, via: "page" }],
  reviewDue: o.reviewDue ?? "2027-05-14",
});
const scaled900 = (passing: number): PassReport => ({ kind: "scaled", passing, scaleMin: 100, scaleMax: 900 });

const gcp = (code: string, o: {
  title: string;
  questions: number; // the upper end of the range Google prints
  minutes: number;
  page: string;
  formats?: ExamFormat[];
  seedDiffers?: string;
  note?: string;
}): MockExamFacts => ({
  code,
  body: "Google Cloud",
  examCode: null, // Google publishes no exam code
  questions: o.questions,
  questionsAreMaximum: true,
  scored: null, // Google does not say how many are unscored
  minutes: o.minutes,
  pass: { kind: "cut_unpublished" },
  formats: o.formats,
  seedDiffers: o.seedDiffers,
  sources: [{ title: `Google Cloud certification page (${o.title}): length and exam format`, url: o.page, readAt: D, via: "page" }],
  reviewDue: "2027-05-14",
});
const GCP_MC_ONLY = "The Google Cloud page lists multiple choice questions only; the seed text also lists multiple select.";

export const MOCK_EXAM_FACTS: readonly MockExamFacts[] = [
  // ---- AWS ---------------------------------------------------------------
  aws("AWSCLF", "CLF-C02", {
    questions: 65, scored: 50, minutes: 90, passing: 700, formats: MC_MR,
    guide: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html",
    page: "https://aws.amazon.com/certification/certified-cloud-practitioner/",
  }),
  aws("AWSAIF", "AIF-C01", {
    questions: 65, scored: 50, minutes: 90, passing: 700, formats: ALL4,
    guide: "https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01.html",
    page: "https://aws.amazon.com/certification/certified-ai-practitioner/",
  }),
  aws("AWSSAA", "SAA-C03", {
    questions: 65, scored: 50, minutes: 130, passing: 720, formats: MC_MR,
    guide: "https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html",
    page: "https://aws.amazon.com/certification/certified-solutions-architect-associate/",
  }),
  aws("AWSDVA", "DVA-C03", {
    questions: 65, scored: 50, minutes: 130, passing: 720, formats: MC_MR,
    guide: "https://docs.aws.amazon.com/aws-certification/latest/developer-associate-03/developer-associate-03.html",
    page: "https://aws.amazon.com/certification/certified-developer-associate/",
    seedDiffers: "The DVA-C03 exam guide lists two question types, multiple choice and multiple response; the seed text also lists ordering and matching.",
  }),
  aws("AWSSOA", "SOA-C03", {
    questions: 65, scored: 50, minutes: 130, passing: 720, formats: MC_MR,
    guide: "https://docs.aws.amazon.com/aws-certification/latest/sysops-administrator-associate-03/sysops-administrator-associate-03.html",
    page: "https://aws.amazon.com/certification/certified-cloudops-engineer-associate/",
  }),
  aws("AWSDEA", "DEA-C01", {
    questions: 65, scored: 50, minutes: 130, passing: 720, formats: MC_MR,
    guide: "https://docs.aws.amazon.com/aws-certification/latest/data-engineer-associate-01/data-engineer-associate-01.html",
    page: "https://aws.amazon.com/certification/certified-data-engineer-associate/",
    seedDiffers: "The seed records no duration for DEA-C01; the AWS page lists 130 minutes.",
  }),
  {
    ...aws("AWSMLA", "MLA-C02", {
      questions: 65, scored: 50, minutes: 130, passing: 720, formats: MC_MR,
      guide: "https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-02/machine-learning-engineer-associate-02.html",
      page: "https://aws.amazon.com/certification/certified-machine-learning-engineer-associate/",
      reviewDue: "2026-12-15",
      minutesNote:
        "AWS lists MLA-C02 only as a beta so far (85 questions in 170 minutes, 2 minutes a question) and has not published the general-availability time. This uses the same 2 minutes a question for the 65-question form the exam guide describes.",
      seedDiffers: "The seed records the 85-question, 170-minute beta form; the exam guide describes 65 questions (50 scored, 15 unscored) for the general-availability form.",
    }),
  },
  aws("AWSSAP", "SAP-C03", {
    questions: 75, scored: 65, minutes: 180, passing: 720, formats: MC_MR,
    guide: "https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/solutions-architect-professional-03.html",
    page: "https://aws.amazon.com/certification/certified-solutions-architect-professional/",
  }),
  aws("AWSDOP", "DOP-C02", {
    questions: 75, scored: 65, minutes: 180, passing: 750, formats: MC_MR,
    guide: "https://docs.aws.amazon.com/aws-certification/latest/devops-engineer-professional-02/devops-engineer-professional-02.html",
    page: "https://aws.amazon.com/certification/certified-devops-engineer-professional/",
  }),
  aws("AWSSCS", "SCS-C03", {
    questions: 65, scored: 50, minutes: 170, passing: 750, formats: ALL4,
    guide: "https://docs.aws.amazon.com/aws-certification/latest/security-specialty-03/security-specialty-03.html",
    page: "https://aws.amazon.com/certification/certified-security-specialty/",
  }),
  aws("AWSANS", "ANS-C01", {
    questions: 65, scored: 50, minutes: 170, passing: 750, formats: ["multiple_response", "matching"],
    guide: "https://docs.aws.amazon.com/aws-certification/latest/advanced-networking-specialty-01/advanced-networking-specialty-01.html",
    page: "https://aws.amazon.com/certification/certified-advanced-networking-specialty/",
    reviewDue: "2027-01-15",
    seedDiffers: "AWS retires this exam after 2026-12-31. The exam guide lists multiple response and matching; the certification page says multiple choice or multiple response.",
  }),

  // ---- CompTIA -----------------------------------------------------------
  compTia("SECPLUS", "SY0-701", {
    minutes: 90, pass: scaled900(750),
    page: "https://www.comptia.org/en-us/certifications/security/v7/",
    notReproduced: "performance-based questions (hands-on simulations); CompTIA retires SY0-701 in English on 2027-06-11",
  }),
  compTia("SECPLUSV8", "SY0-801", {
    minutes: 90, pass: scaled900(750),
    page: "https://www.comptia.org/en-us/certifications/security/v8/",
  }),
  compTia("LINUXPLUS", "XK0-006", { minutes: 90, pass: scaled900(720), page: "https://www.comptia.org/en-us/certifications/linux/" }),
  compTia("PENTESTPLUS", "PT0-003", { minutes: 165, pass: scaled900(750), page: "https://www.comptia.org/en/certifications/pentest/" }),
  compTia("SECURITYX", "CAS-005", { minutes: 165, pass: { kind: "pass_fail_only" }, page: "https://www.comptia.org/en-us/certifications/securityx/" }),
  compTia("APLUS_CORE1", "220-1201", {
    minutes: 90, pass: scaled900(675), page: "https://www.comptia.org/certifications/a",
    notReproduced: "performance-based questions (hands-on simulations)",
  }),
  compTia("APLUS_CORE2", "220-1202", {
    minutes: 90, pass: scaled900(700), page: "https://www.comptia.org/certifications/a",
    notReproduced: "performance-based questions (hands-on simulations)",
  }),
  compTia("NETWORKPLUS", "N10-009", { minutes: 90, pass: scaled900(720), page: "https://www.comptia.org/certifications/network" }),
  compTia("CLOUDPLUS", "CV0-004", { minutes: 90, pass: scaled900(750), page: "https://www.comptia.org/certifications/cloud" }),
  compTia("DATAPLUS", "DA0-002", { minutes: 90, pass: scaled900(675), page: "https://www.comptia.org/certifications/data" }),
  compTia("SERVERPLUS", "SK0-005", { minutes: 90, pass: scaled900(750), page: "https://www.comptia.org/certifications/server" }),
  compTia("PROJECTPLUS", "PK0-005", { minutes: 90, pass: scaled900(710), page: "https://www.comptia.org/certifications/project" }),
  {
    ...compTia("TECHPLUS", "FC0-U71", { minutes: 60, pass: scaled900(650), page: "https://www.comptia.org/certifications/tech" }),
    questions: 70,
    notReproduced: undefined,
  },
  compTia("CLOUDNETX", "CNX-001", { minutes: 165, pass: { kind: "pass_fail_only" }, page: "https://www.comptia.org/certifications/cloudnetx" }),

  // ---- Google Cloud ------------------------------------------------------
  // Google prints a range ("50-60 questions"); the mock uses the top of it.
  // The pages publish no passing score, so none is claimed.
  gcp("GCPCDL", { title: "Cloud Digital Leader", questions: 60, minutes: 90, page: "https://cloud.google.com/learn/certification/cloud-digital-leader" }),
  gcp("GCPACE", { title: "Associate Cloud Engineer", questions: 60, minutes: 120, page: "https://cloud.google.com/learn/certification/cloud-engineer" }),
  gcp("GCPPCA", { title: "Professional Cloud Architect", questions: 60, minutes: 120, page: "https://cloud.google.com/learn/certification/cloud-architect" }),
  gcp("GCPPDE", { title: "Professional Data Engineer", questions: 50, minutes: 120, page: "https://cloud.google.com/learn/certification/data-engineer" }),
  gcp("GCPDEVOPS", { title: "Professional Cloud DevOps Engineer", questions: 60, minutes: 120, formats: ["multiple_choice"], page: "https://cloud.google.com/learn/certification/cloud-devops-engineer" }),
  gcp("GCPSEC", { title: "Professional Cloud Security Engineer", questions: 60, minutes: 120, formats: ["multiple_choice"], seedDiffers: GCP_MC_ONLY, page: "https://cloud.google.com/learn/certification/cloud-security-engineer" }),
  gcp("GCPNET", { title: "Professional Cloud Network Engineer", questions: 60, minutes: 120, formats: ["multiple_choice"], seedDiffers: GCP_MC_ONLY, page: "https://cloud.google.com/learn/certification/cloud-network-engineer" }),
  gcp("GCPDBE", { title: "Professional Cloud Database Engineer", questions: 60, minutes: 120, formats: ["multiple_choice"], seedDiffers: GCP_MC_ONLY, page: "https://cloud.google.com/learn/certification/cloud-database-engineer" }),
  gcp("GCPDEV", { title: "Professional Cloud Developer", questions: 60, minutes: 120, formats: ["multiple_choice"], seedDiffers: GCP_MC_ONLY, page: "https://cloud.google.com/learn/certification/cloud-developer" }),
  gcp("GCPMLE", { title: "Professional Machine Learning Engineer", questions: 60, minutes: 120, formats: ["multiple_choice"], seedDiffers: GCP_MC_ONLY, page: "https://cloud.google.com/learn/certification/machine-learning-engineer" }),
  gcp("GCPGAIL", { title: "Generative AI Leader", questions: 60, minutes: 90, formats: ["multiple_choice"], page: "https://cloud.google.com/learn/certification/generative-ai-leader" }),

  // ---- AACN --------------------------------------------------------------
  {
    code: "CCRNADULT",
    body: "AACN",
    examCode: null, // AACN publishes no exam code for CCRN
    questions: 150,
    scored: 125,
    minutes: 180,
    pass: { kind: "cut_unpublished" },
    sources: [
      {
        title: "CCRN Exam Handbook - Direct Care, July 2026: CCRN Exam Content; Passing Point/Cut Score",
        url: "https://www.aacn.org/certification/preparation-tools-and-handbooks/~/media/aacn-website/certification/get-certified/handbooks/ccrnexamhandbook.pdf?la=en",
        readAt: D,
        via: "pdf",
      },
    ],
    reviewDue: "2027-05-14",
  },
];

// Courses that have no single exam to be full-length against. Their mock is a
// mixed practice test and says so: the length is ours, not an exam's.
export interface PracticeOnly {
  code: string;
  reason: string;
}
export const PRACTICE_ONLY: readonly PracticeOnly[] = [
  { code: "CNA", reason: "Nurse aide competency evaluations are set by each state, so there is no single national exam to match." },
  { code: "DPT", reason: "A DPT program's exams are set by each school; the licensing exam is the NPTE-PT, which has its own course." },
  { code: "PTPREREQ", reason: "These are prerequisite courses taken at a school; there is no certifying exam." },
];

const BY_CODE = new Map(MOCK_EXAM_FACTS.map((f) => [f.code, f]));
const PRACTICE_BY_CODE = new Map(PRACTICE_ONLY.map((p) => [p.code, p]));

export function mockExamFactsFor(code: string | null | undefined): MockExamFacts | null {
  return (code && BY_CODE.get(code)) || null;
}

export function practiceOnlyFor(code: string | null | undefined): PracticeOnly | null {
  return (code && PRACTICE_BY_CODE.get(code)) || null;
}

// ---------------------------------------------------------------------------
// What the learner is told about the pass score
// ---------------------------------------------------------------------------

// Honest by construction: a scaled score is never computed from a percentage.
// The bodies do not publish how raw answers convert to their scale, and the
// conversion differs between exam forms, so the app reports the share right
// and quotes the body's own passing score as a fact, not as a prediction.
// Said before the exam (the start screen) and after it (the results).
export function passPolicyText(facts: MockExamFacts | null): string {
  if (!facts) {
    return "Exams report a scaled score or a pass or fail result, not a percentage, so a mock score is not a predicted exam result.";
  }
  const who = facts.body;
  switch (facts.pass.kind) {
    case "scaled":
      return (
        `${who} reports a scaled score from ${facts.pass.scaleMin} to ${facts.pass.scaleMax}, and the passing score is ${facts.pass.passing}. ` +
        `That scale is not a percentage, and ${who} does not publish how correct answers convert to it, so we show the share you got right and never turn it into a scaled score or say whether you would pass.`
      );
    case "pass_fail_only":
      return `${who} reports pass or fail only for this exam and publishes no score, so there is no passing score to compare a mock with. We show the share you got right.`;
    case "cut_unpublished":
      return `${who} decides pass or fail against a standard it does not publish as a number, so there is no passing percentage to compare a mock with. We show the share you got right.`;
  }
}

export function passLine(facts: MockExamFacts | null, scored: { correct: number; total: number }): string {
  const pct = scored.total ? Math.round((scored.correct / scored.total) * 100) : 0;
  return `You got ${scored.correct} of ${scored.total} fully right (${pct}%). ${passPolicyText(facts)}`;
}

// One line for the start screen: what the real exam is and how this mock
// differs from it.
export function mockFormNote(facts: MockExamFacts | null, practice: PracticeOnly | null): string {
  if (practice) return `${practice.reason} This is a mixed practice test, not a copy of an exam.`;
  if (!facts) return "We haven't confirmed this exam's exact length against its official site yet, so the length here is approximate.";
  const n = facts.questionsAreMaximum ? `up to ${facts.questions}` : `${facts.questions}`;
  const scored = facts.scored != null && facts.scored < facts.questions
    ? ` (${facts.scored} count toward the real score; in a mock every question counts)`
    : "";
  return `${facts.body}'s exam has ${n} questions${scored}${facts.minutes ? ` in ${facts.minutes} minutes` : ""}.`;
}

// Entries past their review date, for the test and the report script.
export function staleFacts(today: string): MockExamFacts[] {
  return MOCK_EXAM_FACTS.filter((f) => f.reviewDue < today);
}
