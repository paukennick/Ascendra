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
export function learnerTrackRow<T extends object>(row: T): T & { unbranded?: true } {
  const r = row as { code?: unknown; user_id?: unknown };
  if (typeof r.code !== "string" || r.user_id != null || !isUnbrandedCode(r.code)) return row;
  return { ...row, code: learnerTrackCode(r.code, null), unbranded: true as const };
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
  // The "Prepares you for" line and its disclaimer, only while the body's
  // switch is on (REFERENCE_LINE_ON below); null otherwise.
  reference: ExamReference | null;
}

export const PUBLISHED_FACTS_HEADING = "This course follows an exam with these published facts";

// Adaptive when the text says the exam adapts; linear when it says so (a
// fixed form every candidate answers in full). Anything else is unknown, and
// the facts test fails for it.
export function deliveryOf(questionFormat: string | null | undefined): "adaptive" | "linear" | null {
  const t = questionFormat ?? "";
  if (/\bnot adaptive\b|\bnon-adaptive\b|\blinear\b|\bfixed[- ]length\b/i.test(t)) return "linear";
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
  reference?: ExamReference | null;
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
    reference: x.reference ?? null,
  };
}

// ---------------------------------------------------------------------------
// The reference line (Nick, 2026-11-16 8:27 PM PT: Option 2 approved)
// ---------------------------------------------------------------------------
// Course titles stay descriptive (no mark in a title, the app name or the
// icon). Each course of a permission-only body gets, on its course page, one
// plain reference line naming the exam once:
//   "Prepares you for the <EXAM> exam offered by <Owner>."
// and under it a specific disclaimer, which replaces the generic notice at the
// end of the course description (supabase/seed/catalog.ts):
//   "<mark sentence> Ascendra is independent and is not affiliated with,
//    sponsored by or endorsed by <Owner>."
// ® is used only where the owner's own trademark page shows the mark
// registered, ™ where the owner marks it so, otherwise no symbol; the owner's
// legal name is the one its own site gives. Each body's evidence is in
// MARK_EVIDENCE, read 2026-11-16 (WebFetch of the owner's page). Never a logo,
// a real exam question, or "Official", "Approved", "Authorized", "Certified
// by" or "Master" (lib/unbranded.test.ts). Everything else in the course stays
// unbranded: exam card, prompts, emails, codes, lessons, labs and sims.
//
// A body whose marks could not be verified on its own site is switched off
// and keeps the generic notice until Nick decides (REFERENCE_LINE_ON).

export interface MarkEvidence {
  url: string;
  readAt: string; // YYYY-MM-DD
  via: "page" | "pdf";
  finding: string; // what the page says, quoted or closely paraphrased
}

export const MARK_EVIDENCE: Readonly<Record<string, readonly MarkEvidence[]>> = {
  ISC2: [{ url: "https://www.isc2.org/policies-procedures/copyright-information", readAt: "2026-11-16", via: "page",
    finding: "\"ISC2, CISSP, SSCP, CCSP, CGRC, CSSLP, HCISPP, ISSAP, ISSEP, ISSMP, CC, and CBK are registered marks of ISC2, Inc.\"" }],
  "EC-Council": [{ url: "https://www.eccouncil.org/legal/trademarks/", readAt: "2026-11-16", via: "page",
    finding: "EC-Council International Limited's (\"EC-Council\") trademarks; \"Trademarks followed by the ® symbol are registered trademarks of EC-Council\"; listed as CEH® and Certified Ethical Hacker®." }],
  ISACA: [{ url: "https://www.isaca.org/credentialing/cism", readAt: "2026-11-16", via: "page",
    finding: "\"Certified Information Security Manager® (CISM®)\"; © 2026 ISACA. Terms of use (https://www.isaca.org/terms-of-use): the ISACA name and trademarks are the trademarks of ISACA." }],
  BCEN: [
    { url: "https://bcen.org/trademark-policy/", readAt: "2026-11-16", via: "page",
      finding: "\"The CEN®, CFRN®, CPEN®, CTRN®, TCRN®, and CBRN® certification programs are accredited...\"; the marks belong to the Board of Certification for Emergency Nursing (BCEN®)." },
    { url: "https://bcen.org/wp-content/uploads/2022/11/8.1-Trademark-and-Logo-Usage_2025.pdf", readAt: "2026-11-16", via: "pdf",
      finding: "\"The Board of Certification for Emergency Nursing (BCEN®)\"; BCEN Marks are \"trademarks or registered trademarks of BCEN\"." },
  ],
  NBCC: [{ url: "https://www.nbcc.org/assets/policies/nbcctrademarkusepolicy.pdf", readAt: "2026-11-16", via: "pdf",
    finding: "Owner \"National Board for Certified Counselors, Inc.\"; lists \"NCE®\" and \"NCMHCE®\" (and \"National Counselor Examination™\")." }],
  NASM: [{ url: "https://www.nasm.org/policies/terms-and-conditions", readAt: "2026-11-16", via: "page",
    finding: "Sites \"owned and operated by the National Academy of Sports Medicine, LLC\"; 19.1: \"NASM/AFAA names and acronyms, including NASM® and AFAA® ... are trademarks or registered trademarks of NASM/AFAA\". NASM-CPT and NASM-CNC appear with no symbol." }],
  ACE: [{ url: "https://acefitness.org/legal/terms-of-use", readAt: "2026-11-16", via: "page",
    finding: "Operated by \"the American Council on Exercise\"; Trademark Ownership lists \"ACE®, ACE American Council on Exercise®, ...\". \"ACE Certified Personal Trainer\" does not appear with a symbol." }],
  ASQ: [
    { url: "https://asq.org/copyright", readAt: "2026-11-16", via: "page",
      finding: "\"The ASQ logo, the letters \"ASQ,\" American Society for Quality, ASQ Six Sigma Forum, and other marks are registered trademarks, trademarks, or service marks of the American Society for Quality.\"" },
    { url: "https://asq.org/cert/six-sigma-green-belt", readAt: "2026-11-16", via: "page",
      finding: "\"Certified Six Sigma Green Belt\" and \"CSSGB\" appear with no ® or ™." },
  ],
  ANCC: [
    { url: "https://nursingworld.org/our-certifications/family-nurse-practitioner", readAt: "2026-11-16", via: "page",
      finding: "Page title \"Family Nurse Practitioner Certification (FNP-BC™)\" (read in the search result title)." },
    { url: "https://www.nursingworld.org/legal", readAt: "2026-11-16", via: "page",
      finding: "Marks \"owned by the ANA Enterprise\"; \"©American Nurses Credentialing Center\". No legal suffix given." },
  ],
  AANPCB: [
    { url: "https://aanpcert.org/terms/", readAt: "2026-11-16", via: "page",
      finding: "\"American Academy of Nurse Practitioners Certification Board, Inc., doing business as NPCB\"." },
    { url: "https://www.aanpcert.org/wp-content/uploads/FNP-Candidate-Handbook-06-04-2026.pdf", readAt: "2026-11-16", via: "pdf",
      finding: "\"Use of the NP-C® Credential\"; \"The NP-C credential is a registered certification mark owned by NPCB\"; the exam is the \"Family Nurse Practitioner (FNP) certification examination\"." },
  ],
  "Python Institute": [{ url: "https://pythoninstitute.org/brand-resources", readAt: "2026-11-16", via: "page",
    finding: "\"PCEP™ (Entry)\", \"PCAP™ (Associate)\"; \"OpenEDG | Open Education and Development Group, LLC\"." }],
  "ABPTS (APTA)": [
    { url: "https://www.apta.org/siteassets/pdfs/policies/apta-name-and-mark-usage.pdf", readAt: "2026-11-16", via: "pdf",
      finding: "Marks are \"the property of the American Physical Therapy Association (APTA)\"; no list of the specialist designations or their registration." },
    { url: "https://specialization.apta.org/for-specialists/marketing/Promote-Certification", readAt: "2026-11-16", via: "page",
      finding: "\"APTA Specialist Certification - Governed by ABPTS\"; no ® or ™ on any designation; no trademark statement. NOT VERIFIED: escalated to Nick." },
  ],
  PeopleCert: [{ url: "https://www.peoplecert.org/Acknowledgements", readAt: "2026-11-16", via: "page",
    finding: "\"ITIL®, ... are registered trademarks of PeopleCert\"; \"PeopleCert International Limited and its affiliates (\"PeopleCert\")\"." }],
};

// Per body: on, or off pending Nick. ABPTS is on in plain words (Nick
// 2026-11-16): neither APTA nor ABPTS publishes which specialist designations
// are marks or registered, so its line names the specialty with no symbol and
// its disclaimer makes no ownership claim.
export const REFERENCE_LINE_ON: Readonly<Record<string, boolean>> = Object.freeze({
  ISC2: true,
  "EC-Council": true,
  ISACA: true,
  BCEN: true,
  NBCC: true,
  NASM: true,
  ACE: true,
  ASQ: true,
  ANCC: true,
  AANPCB: true,
  "Python Institute": true,
  "ABPTS (APTA)": true, // plain words only (Nick 2026-11-16)
  PeopleCert: true,
});

interface CourseReference {
  exam: string; // the exam as the line names it, with the symbol its owner uses
  owner: string; // who offers it, as the line and disclaimer name them
  // The first sentence of the disclaimer; empty when the owner publishes no
  // mark status (ABPTS, Nick 2026-11-16): then no mark or ownership is claimed.
  markSentence: string;
  // Who the disclaimer says Ascendra is not affiliated with, when wider than
  // the owner (ABPTS is governed by APTA).
  disclaimerOwner?: string;
}

const ISC2_INC = "ISC2, Inc.";
const NBCC_INC = "National Board for Certified Counselors, Inc.";
const NASM_SENTENCE = "NASM® is a registered trademark of National Academy of Sports Medicine, LLC.";
const PY_SENTENCE = (m: string) => `${m}™ is a trademark of Open Education and Development Group, LLC.`;

// ABPTS (Nick 2026-11-16): plain words, no symbol, no ownership sentence,
// because neither ABPTS nor APTA publishes the designations' mark status.
const ABPTS_OWNER = "the American Board of Physical Therapy Specialties";
const abpts = (specialty: string): CourseReference => ({
  exam: `${specialty} physical therapy specialist certification`,
  owner: ABPTS_OWNER,
  markSentence: "",
  disclaimerOwner: `${ABPTS_OWNER} or the American Physical Therapy Association`,
});

export const COURSE_REFERENCES: Readonly<Record<string, CourseReference>> = {
  ABPTSOCS: abpts("orthopedic"),
  ABPTSGCS: abpts("geriatric"),
  ABPTSNCS: abpts("neurologic"),
  ABPTSCCS: abpts("cardiovascular and pulmonary"),
  ABPTSPCS: abpts("pediatric"),
  ABPTSSCS: abpts("sports"),
  ABPTSONC: abpts("oncologic"),
  ABPTSECS: abpts("clinical electrophysiologic"),
  ABPTSPWCS: abpts("pelvic and women's health"),
  ABPTSWMS: abpts("wound management"),
  ISC2CC: { exam: "CC®", owner: "ISC2", markSentence: `CC® is a registered mark of ${ISC2_INC}` },
  CISSP: { exam: "CISSP®", owner: "ISC2", markSentence: `CISSP® is a registered mark of ${ISC2_INC}` },
  CEH: { exam: "CEH®", owner: "EC-Council", markSentence: "CEH® is a registered trademark of EC-Council International Limited." },
  CISM: { exam: "CISM®", owner: "ISACA", markSentence: "CISM® is a registered mark of ISACA." },
  CEN: { exam: "CEN®", owner: "BCEN", markSentence: "CEN® is a registered mark of the Board of Certification for Emergency Nursing." },
  NCE: { exam: "NCE®", owner: "NBCC", markSentence: `NCE® is a registered mark of ${NBCC_INC}` },
  NCMHCE: { exam: "NCMHCE®", owner: "NBCC", markSentence: `NCMHCE® is a registered mark of ${NBCC_INC}` },
  NASMCPT: { exam: "NASM® Certified Personal Trainer", owner: "the National Academy of Sports Medicine", markSentence: NASM_SENTENCE },
  NASMCNC: { exam: "NASM® Certified Nutrition Coach", owner: "the National Academy of Sports Medicine", markSentence: NASM_SENTENCE },
  ACECPT: { exam: "ACE® Certified Personal Trainer", owner: "the American Council on Exercise", markSentence: "ACE® is a registered mark of the American Council on Exercise." },
  CSSGB: { exam: "Certified Six Sigma Green Belt (CSSGB)", owner: "ASQ", markSentence: "CSSGB is a mark of the American Society for Quality." },
  FNPANCC: { exam: "FNP-BC™", owner: "ANCC", markSentence: "FNP-BC™ is a trademark of the American Nurses Credentialing Center." },
  FNPAANP: { exam: "family nurse practitioner (NP-C®)", owner: "NPCB", markSentence: "NP-C® is a registered certification mark of American Academy of Nurse Practitioners Certification Board, Inc." },
  PCEP: { exam: "PCEP™", owner: "the Python Institute", markSentence: PY_SENTENCE("PCEP") },
  PCAP: { exam: "PCAP™", owner: "the Python Institute", markSentence: PY_SENTENCE("PCAP") },
  ITIL5FND: { exam: "ITIL® Foundation (Version 5)", owner: "PeopleCert", markSentence: "ITIL® is a registered trademark of PeopleCert International Limited." },
  ITIL4FND: { exam: "ITIL® 4 Foundation", owner: "PeopleCert", markSentence: "ITIL® is a registered trademark of PeopleCert International Limited." },
};

export interface ExamReference {
  line: string;
  disclaimer: string;
}

export function examReferenceForCode(
  code: string | null | undefined,
  on: Readonly<Record<string, boolean>> = REFERENCE_LINE_ON
): ExamReference | null {
  if (!code) return null;
  const c = code.toUpperCase();
  const body = BY_CODE.get(c);
  const ref = COURSE_REFERENCES[c];
  if (!body || !ref || !on[body.name]) return null;
  return {
    line: `Prepares you for the ${ref.exam} exam offered by ${ref.owner}.`,
    disclaimer: `${ref.markSentence ? `${ref.markSentence} ` : ""}Ascendra is independent and is not affiliated with, sponsored by or endorsed by ${ref.disclaimerOwner ?? ref.owner}.`,
  };
}

// The generic notice every other permission-body course still ends with
// (lib/catalog-trademarks.test.ts GENERIC_NOTICE).
export const GENERIC_NOTICE_TEXT =
  "Independently developed exam prep; not affiliated with or endorsed by the organization that owns or administers this exam.";

// A course description as learners see it: for a course whose reference line
// is on, the generic notice at its end is replaced by the specific disclaimer.
export function learnerDescription(code: string, description: string): string {
  const ref = examReferenceForCode(code);
  if (!ref || !description.endsWith(GENERIC_NOTICE_TEXT)) return description;
  return `${description.slice(0, -GENERIC_NOTICE_TEXT.length)}${ref.disclaimer}`;
}
