// REQ-319 (Nick, 2026-11-16, option A): unbranded courses. An exam body whose
// trademark policy allows no use of its marks without written permission (the
// "permission" bodies of lib/catalog-trademarks.test.ts, policies read
// 2026-11-16 under REQ-309) is never named to learners, and nor are its
// credentials, exam codes or other marks. The course still says which exam it
// prepares for, by its published facts (question count, time, format,
// passing standard, eligibility, domains and weights), which are facts, not
// marks.
//
// This module is the one place that decides it:
//   - UNBRANDED_BODIES: each body, its provider slug in credential_providers,
//     its catalog course codes and its marks (the catalog test's pattern;
//     lib/unbranded.test.ts checks they match);
//   - learnerExamNames(): what any reader of credential_providers /
//     credentials / credential_exams hands a learner, a prompt or an email:
//     the names and code, or null for an unbranded provider (the neutral
//     wording is then the caller's generic one: "the exam", the course title);
//   - learnerTrackCode(): the course code a learner sees (CourseCard prints
//     it), a neutral display code for an unbranded catalog course;
//   - unbrandedPromptRule(): the line every model prompt for such a course
//     carries (lib/prompts.ts domainFraming).
// Course codes in the database are unchanged, so mastery stays mapped.
//
// Citations are the exception Nick allowed: a source may keep naming the
// body's own document as attribution (a unit source's title, a sim's
// `sources`), but no learner-facing heading is built from it.
//
// Not legal advice: no lawyer has reviewed this.

export interface UnbrandedBody {
  name: string; // for tests and reports only, never shown to learners
  providerSlugs: readonly string[]; // credential_providers.slug
  codes: readonly string[]; // catalog course codes (subject_tracks.code)
  marks: RegExp; // the body's own name and marks, as lib/catalog-trademarks.test.ts lists them
}

export const UNBRANDED_BODIES: readonly UnbrandedBody[] = [
  { name: "ISC2", providerSlugs: ["isc2"], codes: ["ISC2CC", "CISSP"],
    marks: /ISC2|\(ISC\)|CISSP|Certified in Cybersecurity|Certified Information Systems Security Professional|\bCC\b|\bCBK\b/ },
  { name: "EC-Council", providerSlugs: ["ec-council"], codes: ["CEH"], marks: /EC-Council|\bC\|?EH\b|Certified Ethical Hacker|312-50/ },
  { name: "ISACA", providerSlugs: ["isaca"], codes: ["CISM"], marks: /ISACA|\bCISM\b|\bCISA\b|Certified Information Security Manager|COBIT/ },
  { name: "BCEN", providerSlugs: ["bcen"], codes: ["CEN"], marks: /BCEN|\bCEN\b|Certified Emergency Nurse|Board of Certification for Emergency Nursing/ },
  { name: "NBCC", providerSlugs: ["nbcc"], codes: ["NCE", "NCMHCE"],
    marks: /NBCC|\bNCE\b|NCMHCE|National Counselor Examination|National Clinical Mental Health Counseling Examination|\bNCC\b/ },
  { name: "NASM", providerSlugs: ["nasm"], codes: ["NASMCPT", "NASMCNC"], marks: /NASM|AFAA|Certified Nutrition Coach|\bCNC\b/ },
  { name: "ACE", providerSlugs: ["ace"], codes: ["ACECPT"], marks: /\bACE\b|American Council on Exercise/ },
  { name: "ASQ", providerSlugs: ["asq"], codes: ["CSSGB"], marks: /\bASQ\b|American Society for Quality|CSSGB|Certified Six Sigma/ },
  { name: "ANCC", providerSlugs: ["ancc"], codes: ["FNPANCC"], marks: /ANCC|American Nurses Credentialing Center|FNP-BC|\bANA\b/ },
  { name: "AANPCB", providerSlugs: ["aanpcb"], codes: ["FNPAANP"],
    marks: /AANPCB|\bNPCB\b|\bAANP\b|American Academy of Nurse Practitioners|\bFNP-C\b|\bNP-C\b/ },
  { name: "Python Institute", providerSlugs: ["python-institute"], codes: ["PCEP", "PCAP"], marks: /Python Institute|OpenEDG|PCEP|PCAP|PCPP/ },
  { name: "ABPTS (APTA)", providerSlugs: ["abpts"],
    codes: ["ABPTSOCS", "ABPTSGCS", "ABPTSNCS", "ABPTSCCS", "ABPTSPCS", "ABPTSSCS", "ABPTSONC", "ABPTSECS", "ABPTSPWCS", "ABPTSWMS"],
    marks: /ABPTS|American Board of Physical Therapy Specialties|\bAPTA\b|\b(OCS|GCS|NCS|CCS|PCS|SCS|ECS|WCS|PWCS)\b/ },
  { name: "PeopleCert", providerSlugs: ["peoplecert"], codes: ["ITIL5FND", "ITIL4FND"], marks: /ITIL|PeopleCert|PRINCE2|AXELOS/ },
];

// Words that only look like a mark: "ACE inhibitor" (a drug class) is not the
// American Council on Exercise. Removed before a scan. Kept short on purpose:
// every other homonym is reworded in the content instead (REQ-319).
export const MARK_HOMONYMS = /\bACE inhibitors?\b/g;

const BY_CODE = new Map(UNBRANDED_BODIES.flatMap((b) => b.codes.map((c) => [c, b] as const)));
const PROVIDERS = new Set(UNBRANDED_BODIES.flatMap((b) => b.providerSlugs));

export const UNBRANDED_CODES: ReadonlySet<string> = new Set(BY_CODE.keys());

export function isUnbrandedCode(code: string | null | undefined): boolean {
  return !!code && UNBRANDED_CODES.has(code.toUpperCase());
}

export function isUnbrandedProvider(slug: string | null | undefined): boolean {
  return !!slug && PROVIDERS.has(slug);
}

// The body's marks for a catalog course, or null when the course is not unbranded.
export function marksForCode(code: string | null | undefined): RegExp | null {
  return (code && BY_CODE.get(code.toUpperCase())?.marks) || null;
}

// The first mark of the course's body that `text` names, homonyms aside.
export function markIn(code: string | null | undefined, text: string): string | null {
  const re = marksForCode(code);
  if (!re) return null;
  return text.replace(MARK_HOMONYMS, "").match(re)?.[0] ?? null;
}

// The neutral words learner copy uses instead of the body's or exam's name.
export const NEUTRAL_PROVIDER = "the certifying body";
export const NEUTRAL_CREDENTIAL = "this exam";

// What a learner, a prompt or an email may be told about the exam's identity.
// For an unbranded provider every name and code is null, so each caller falls
// back to its own generic wording (the course title, "Practice exam", the
// generic not-affiliated line) and `unbranded` says why.
export function learnerExamNames<T extends {
  providerSlug?: string | null;
  providerName?: string | null;
  credentialName?: string | null;
  examCode?: string | null;
  examRevision?: string | null;
}>(x: T): T & { unbranded: boolean } {
  if (!isUnbrandedProvider(x.providerSlug)) return { ...x, unbranded: false };
  return { ...x, providerName: null, credentialName: null, examCode: null, examRevision: null, unbranded: true };
}

// The code a learner sees for a catalog course. Unbranded courses show a
// neutral code built from the topic; the stored code (subject_tracks.code) is
// unchanged. The app never sends a code back to the server, it uses ids.
export const UNBRANDED_DISPLAY_CODES: Readonly<Record<string, string>> = {
  ISC2CC: "CYBER-ENTRY",
  CISSP: "INFOSEC-PRO",
  CEH: "ETHICAL-HACKING",
  CISM: "INFOSEC-MGMT",
  CEN: "EMERGENCY-RN",
  NCE: "COUNSELOR-KNOWLEDGE",
  NCMHCE: "COUNSELOR-CASES",
  NASMCPT: "TRAINER-TECHNIQUE",
  NASMCNC: "NUTRITION-COACHING",
  ACECPT: "TRAINER-ONBOARDING",
  CSSGB: "GREEN-BELT",
  FNPANCC: "FNP-ROLE",
  FNPAANP: "FNP-CLINICAL",
  PCEP: "PYTHON-ENTRY",
  PCAP: "PYTHON-ASSOCIATE",
  ABPTSOCS: "PT-ORTHOPEDIC",
  ABPTSGCS: "PT-GERIATRIC",
  ABPTSNCS: "PT-NEUROLOGIC",
  ABPTSCCS: "PT-CARDIOPULMONARY",
  ABPTSPCS: "PT-PEDIATRIC",
  ABPTSSCS: "PT-SPORTS",
  ABPTSONC: "PT-ONCOLOGIC",
  ABPTSECS: "PT-ELECTROPHYSIOLOGY",
  ABPTSPWCS: "PT-PELVIC-HEALTH",
  ABPTSWMS: "PT-WOUND",
  ITIL5FND: "ITSM-FOUNDATION-V5",
  ITIL4FND: "ITSM-FOUNDATION-V4",
};

export function learnerTrackCode(code: string, userId: string | null | undefined): string {
  if (userId) return code; // a learner's own course keeps the code they typed
  return UNBRANDED_DISPLAY_CODES[code.toUpperCase()] ?? code;
}

// A subject_tracks row as the app gets it: the display code for an
// unbranded catalog course, and `unbranded` so a new app build can show the
// exam's published facts instead of a provider line.
export function learnerTrackRow<T extends { code?: unknown; user_id?: unknown }>(row: T): T & { unbranded?: true } {
  if (typeof row.code !== "string" || row.user_id != null || !isUnbrandedCode(row.code)) return row;
  return { ...row, code: learnerTrackCode(row.code, null), unbranded: true };
}

// REQ-319: the line every model prompt for an unbranded course carries
// (lib/prompts.ts domainFraming), so lessons, key terms, practice items, labs
// feedback and the coach name neither the body nor its marks.
export function unbrandedPromptRule(): string {
  return (
    "Never name the organization that owns or administers this exam, its certification or exam names, " +
    "exam codes, credential letters, frameworks it owns or any of its other trademarks, even when the " +
    "references below name them; they are cited for attribution only. Say \"the exam\", \"the certifying " +
    "body\", \"the exam outline\", \"the code of ethics for this profession\" or describe the topic in its own " +
    "words (for a framework the body owns: \"the service management framework\", \"the governance framework\")."
  );
}

// REQ-319 (Nick: "will learners know what they are?"): the exam's published
// facts, shown at the top of an unbranded course's page in place of a name.
// Built from what the seed records for the exam (credential_exams, the unit
// weights in exam_domains); nothing is invented, and a missing value stays
// null. lib/unbranded.test.ts checks every unbranded course has them all.
export interface PublishedExamFacts {
  heading: string;
  questions: string | null; // the seed's question-format text, count included
  minutes: number | null;
  time: string | null; // "3 hours", "225 minutes"
  delivery: "adaptive" | "linear" | null;
  passing: string | null;
  eligibility: string | null;
  domains: { name: string; weightPercent: number | null }[];
}

export const PUBLISHED_FACTS_HEADING = "This course follows an exam with these published facts";

// Adaptive when the text says the exam adapts; linear when it says so (a
// fixed form every candidate answers in full). Anything else is unknown, and
// the facts test fails for it.
export function deliveryOf(questionFormat: string | null | undefined): "adaptive" | "linear" | null {
  const t = questionFormat ?? "";
  if (/\bnot adaptive\b|\bnon-adaptive\b|\blinear\b/i.test(t)) return "linear";
  if (/\badaptive\b/i.test(t)) return "adaptive";
  return null;
}

export function timeLabel(minutes: number | null | undefined): string | null {
  if (minutes == null || !(minutes > 0)) return null;
  if (minutes % 60 === 0) return minutes === 60 ? "1 hour" : `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

export function publishedExamFacts(x: {
  questionFormat: string | null;
  durationMinutes: number | null;
  passingScorePolicy: string | null;
  recommendedExperience: string | null;
  domains: { name: string; weightPercent: number | null }[];
}): PublishedExamFacts {
  return {
    heading: PUBLISHED_FACTS_HEADING,
    questions: x.questionFormat,
    minutes: x.durationMinutes,
    time: timeLabel(x.durationMinutes),
    delivery: deliveryOf(x.questionFormat),
    passing: x.passingScorePolicy,
    eligibility: x.recommendedExperience,
    domains: x.domains.map((d) => ({ name: d.name, weightPercent: d.weightPercent })),
  };
}
