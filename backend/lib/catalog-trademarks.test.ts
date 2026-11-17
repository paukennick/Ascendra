// REQ-194: course titles describe the exam they prepare for; they are not
// product names built on an exam body's mark ("PMP Coach", "AWS ... Coach").
//
// REQ-309 (Nick, 2026-11-16: "LIMIT TRADEMARKS"): every exam body's own
// trademark policy was read again on 2026-11-16 (WebFetch of the page named
// in POLICY_URL, CHANGELOG.md under REQ-309) and applied at its most
// conservative reading:
//   - "permission": the policy allows no use of its marks without written
//     permission (or says unauthorized use is prohibited). The course names
//     neither the body nor its marks in its title or description, and its
//     notice is the generic one. REQ-319 (Nick, 2026-11-16, option A): the
//     rest of the course names neither either (lib/unbranded.ts; scanned in
//     lib/unbranded.test.ts), and its page shows the exam's published facts.
//   - "nominative": the policy allows true, factual reference in plain text
//     but not the mark in a product's name. The title names no mark; the
//     description may name the exam and carries the body's notice.
//   - "unstated": no rule for third parties was found. Read the conservative
//     way: no mark in the title; the description names the exam once, with a
//     not-affiliated notice and the owner's attribution where we know it.
// REQ-324 (Nick, 2026-11-17: "Courses that are publicly named the course or
// exam should remain that way"; title form chosen 03:40 PT): every exam
// course's title names the exam as its body publishes it, "Exam Prep for
// <Exam> (<code>)" ("Exam Prep for CompTIA Security+ (SY0-701)", "Exam Prep
// for CISSP®"), the 13 "permission" bodies included. What the policies still
// decide: no "Official", "Approved", "Authorized", "Certified by" or
// "Master" claim of our own; ® or ™ only where the owner marks the name so
// (TITLE_SYMBOLS below, or the reference evidence in lib/unbranded.ts), and
// where a body's guideline asks for the symbol on first use (the Linux
// Foundation, PMI), it is there; every exam course's description still ends
// with its disclaimer; a permission body's course page keeps its reference
// line. The app's name and icon carry no mark (app.json, not checked here).
// Course codes are unchanged, so mastery stays mapped. Pure data test over the
// seed modules.
//
// Not legal advice: no lawyer has reviewed these titles or notices.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";
import { RELEASE_NOTES } from "./release-notes";
import { COURSE_REFERENCES, REFERENCE_LINE_ON, UNBRANDED_NAMING_ON, examReferenceForCode } from "./unbranded";

const byCode = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
const READ = "2026-11-16";

// Titles that may keep "Coach": degree programmes and general skills, which
// name no exam body's credential. Anything else ending in "Coach" fails, so a
// new certification course has to be named descriptively from the start.
const COACH_ALLOWED = new Set([
  "MSCS", "PYTHON", "JAVASCRIPT", "CMPCBS", "MSHI",
  // REQ-265 / REQ-267 (2026-11-14): general skill courses with no exam body.
  "SQL", "TSNODE",
  "CNA", "LPNVN", "ADNRN", "BSNRN", "DPT",
]);

const GENERIC_NOTICE =
  /Independently developed exam prep; not affiliated with or endorsed by the organization that owns or administers this exam\.$/;
const MS = /not affiliated with or endorsed by Microsoft\. Microsoft and Azure are trademarks of the Microsoft group of companies\.$/;
const PMI = /not affiliated with or endorsed by PMI\. PMI (and \S+ are marks|is a mark) of Project Management Institute, Inc\./;
const LF = /not affiliated with or endorsed by The Linux Foundation\./;
const DOCKER = /Docker is a trademark or registered trademark of Docker, Inc\. in the United States and\/or other countries\.$/;
const REDHAT = /Ascendra has no affiliation with Red Hat, LLC\. The .+ trademarks are used for identification purposes only and are not intended to indicate affiliation with or approval by Red Hat\./;

type Policy = "permission" | "nominative" | "unstated";
type Body = {
  name: string;
  policy: Policy;
  url: string; // the policy page read on READ
  codes: string[]; // every course of this body, codes unchanged
  marks: RegExp; // the body's own name and marks, as they appear in our copy
  notice?: RegExp; // for "nominative" and "unstated": the notice the description must carry
};

const BODIES: Body[] = [
  // --- "permission": no use without written permission -------------------
  { name: "ISC2", policy: "permission", url: "https://www.isc2.org/policies-procedures/copyright-information", codes: ["ISC2CC", "CISSP"],
    marks: /ISC2|\(ISC\)|CISSP|Certified in Cybersecurity|Certified Information Systems Security Professional|\bCC\b|\bCBK\b/ },
  { name: "EC-Council", policy: "permission", url: "https://www.eccouncil.org/legal/trademarks/", codes: ["CEH"],
    marks: /EC-Council|\bC\|?EH\b|Certified Ethical Hacker|312-50/ },
  { name: "ISACA", policy: "permission", url: "https://www.isaca.org/terms-of-use", codes: ["CISM"],
    marks: /ISACA|\bCISM\b|\bCISA\b|Certified Information Security Manager|COBIT/ },
  { name: "BCEN", policy: "permission", url: "https://bcen.org/wp-content/uploads/2022/11/8.1-Trademark-and-Logo-Usage_2025.pdf", codes: ["CEN"],
    marks: /BCEN|\bCEN\b|Certified Emergency Nurse|Board of Certification for Emergency Nursing/ },
  { name: "NBCC", policy: "permission", url: "https://www.nbcc.org/assets/policies/nbcctrademarkusepolicy.pdf", codes: ["NCE", "NCMHCE"],
    marks: /NBCC|\bNCE\b|NCMHCE|National Counselor Examination|National Clinical Mental Health Counseling Examination|\bNCC\b/ },
  { name: "NASM", policy: "permission", url: "https://www.nasm.org/policies/terms-and-conditions", codes: ["NASMCPT", "NASMCNC"],
    marks: /NASM|AFAA|Certified Nutrition Coach|\bCNC\b/ },
  { name: "ACE", policy: "permission", url: "https://acefitness.org/legal/terms-of-use", codes: ["ACECPT"],
    marks: /\bACE\b|American Council on Exercise/ },
  { name: "ASQ", policy: "permission", url: "https://asq.org/copyright", codes: ["CSSGB"],
    marks: /\bASQ\b|American Society for Quality|CSSGB|Certified Six Sigma/ },
  { name: "ANCC", policy: "permission", url: "https://www.nursingworld.org/legal", codes: ["FNPANCC"],
    marks: /ANCC|American Nurses Credentialing Center|FNP-BC|\bANA\b/ },
  { name: "AANPCB", policy: "permission", url: "https://aanpcert.org/terms/", codes: ["FNPAANP"],
    marks: /AANPCB|\bNPCB\b|\bAANP\b|American Academy of Nurse Practitioners|\bFNP-C\b|\bNP-C\b/ },
  { name: "Python Institute", policy: "permission", url: "https://pythoninstitute.org/brand-resources", codes: ["PCEP", "PCAP"],
    marks: /Python Institute|OpenEDG|PCEP|PCAP|PCPP/ },
  { name: "ABPTS (APTA)", policy: "permission", url: "https://www.apta.org/siteassets/pdfs/policies/apta-name-and-mark-usage.pdf",
    codes: ["ABPTSOCS", "ABPTSGCS", "ABPTSNCS", "ABPTSCCS", "ABPTSPCS", "ABPTSSCS", "ABPTSONC", "ABPTSECS", "ABPTSPWCS", "ABPTSWMS"],
    marks: /ABPTS|American Board of Physical Therapy Specialties|\bAPTA\b|\b(OCS|GCS|NCS|CCS|PCS|SCS|ECS|WCS|PWCS)\b/ },

  // --- "nominative": factual reference allowed, never the product's name ---
  { name: "CompTIA", policy: "nominative", url: "https://www.comptia.org/en-us/legal/trademarks/", notice: /not affiliated with or endorsed by CompTIA\. CompTIA and its certification names are trademarks of CompTIA\./,
    codes: ["SECPLUS", "SECPLUSV8", "LINUXPLUS", "CYSAPLUS", "PENTESTPLUS", "SECURITYX", "APLUS_CORE1", "APLUS_CORE2", "NETWORKPLUS", "CLOUDPLUS", "DATAPLUS", "SERVERPLUS", "PROJECTPLUS", "TECHPLUS", "AUTOOPSPLUS", "CLOUDNETX", "SECAIPLUS", "DATAAI"],
    marks: /CompTIA|[A-Za-z]\+|SecurityX|CloudNetX|DataAI|DataX|\b[A-Z]{2}\d-[0-9A-Z]{3}\b/ },
  { name: "AWS", policy: "nominative", url: "https://aws.amazon.com/trademark-guidelines", notice: /not affiliated with or endorsed by Amazon Web Services\. AWS and Amazon Web Services are trademarks of Amazon\.com, Inc\. or its affiliates\./,
    codes: ["AWSCLF", "AWSSAA", "AWSAIF", "AWSDVA", "AWSSOA", "AWSDEA", "AWSMLA", "AWSSAP", "AWSDOP", "AWSSCS", "AWSANS"],
    marks: /\bAWS\b|Amazon|\b[A-Z]{3}-C0\d\b/ },
  { name: "Microsoft", policy: "nominative", url: "https://www.microsoft.com/en-US/legal/intellectualproperty/trademarks/usage/general", notice: MS,
    codes: ["AZ900", "AZ104", "AZ305", "AI901", "DP900", "AZ700", "AZ140", "DP300", "AZ400", "AZ120", "PL300", "SC500", "AI200"],
    marks: /Microsoft|Azure|Power BI|\bSAP\b|\b(AZ|DP|PL|SC|AI)-\d{3}\b/ },
  { name: "Google Cloud", policy: "nominative", url: "https://about.google/brand-resource-center/guidance/", notice: /not affiliated with or endorsed by Google\. Google Cloud is a trademark of Google LLC\./,
    codes: ["GCPCDL", "GCPACE", "GCPPCA", "GCPPDE", "GCPDEVOPS", "GCPSEC", "GCPNET", "GCPDBE", "GCPDEV", "GCPMLE", "GCPGAIL"],
    marks: /Google|Cloud Digital Leader/ },
  { name: "PMI", policy: "nominative", url: "https://www.pmi.org/-/media/pmi/documents/public/pdf/about/press-media/trademark-usage-guidelines-new.pdf", notice: PMI,
    codes: ["CAPM", "PMP", "PMIACP", "PGMP", "PFMP", "PMIRMP", "PMISP", "PMICP", "PMIPMOCP", "PMIPBA", "PMICPMAI", "CSPP"],
    marks: /\bPMI\b|\bPMP\b|CAPM|PgMP|PfMP|PMBOK|Project Management Institute|\bCSPP\b|PRiSM/ },
  { name: "Linux Foundation / CNCF", policy: "nominative", url: "https://www.linuxfoundation.org/legal/trademark-usage", notice: LF,
    codes: ["CKA", "CKAD", "KCNA", "CKS", "KCSA", "PCA", "OTCA", "CGOA", "CAPA", "CCA", "ICA", "KCA", "CBA", "CNPA", "CNPE", "LFCS"],
    marks: /Linux Foundation|Kubernetes|CNCF|Cloud Native|Prometheus|OpenTelemetry|GitOps|\bArgo\b|Cilium|Istio|Kyverno|Backstage|eBPF|\b(CKA|CKAD|KCNA|CKS|KCSA|PCA|OTCA|CGOA|CAPA|CCA|ICA|KCA|CBA|CNPA|CNPE|LFCS)\b/ },
  { name: "Red Hat", policy: "nominative", url: "https://www.redhat.com/en/about/trademark-guidelines-and-policies", notice: REDHAT, codes: ["EX188", "EX280"],
    marks: /Red Hat|OpenShift|RHEL|\b(EX|RH|DO)\d{3}\b/ },
  { name: "Docker (DCA, now Mirantis)", policy: "nominative", url: "https://www.docker.com/legal/trademark-guidelines/", notice: DOCKER, codes: ["DCA"],
    marks: /Docker|Mirantis|\bDCA\b/ },
  { name: "NREMT", policy: "nominative", url: "https://nremt.org/about/trademarks",
    notice: /not affiliated with or endorsed by the National Registry\. National Registry of Emergency Medical Technicians and NREMT are trademarks of the National Registry of Emergency Medical Technicians\./,
    codes: ["NREMTEMT", "NREMTEMR", "NREMTPARAMEDIC", "NREMTAEMT"], marks: /National Registry|NREMT/ },
  { name: "Scrum.org", policy: "nominative", url: "https://www.scrum.org/scrumorg-trademark-and-copyright-guidelines",
    notice: /This course is not affiliated with Advanced Development Methods d\/b\/a Scrum\.org \(ADM\) and does not constitute an endorsement of any product, service or point of view by ADM\. Professional Scrum Master and PSM are trademarks and\/or registered trademarks of Advanced Development Methods, Inc\., d\/b\/a Scrum\.org\./,
    codes: ["PSMI"], marks: /Scrum\.org|Professional Scrum|\bPSM\b/ },
  { name: "NSCA", policy: "nominative", url: "https://www.nsca.com/certification/certification-resources/credential-guidelines/",
    notice: /not affiliated with or endorsed by the National Strength and Conditioning Association \(NSCA\)\. CSCS and NSCA-CPT are registered marks of the National Strength and Conditioning Association\./,
    codes: ["NSCACSCS", "NSCACPT"], marks: /NSCA|CSCS/ },

  // --- "unstated": no third-party rule found -------------------------------
  { name: "NCSBN", policy: "unstated", url: "https://trust.ncsbn.org/trademarks.page", codes: ["NCLEXRN", "NCLEXPN"],
    notice: /not affiliated with or endorsed by NCSBN\. NCLEX, NCLEX-RN and NCLEX-PN are registered trademarks of the National Council of State Boards of Nursing, Inc\./,
    marks: /NCLEX|NCSBN/ },
  { name: "AACN Certification Corporation", policy: "unstated", url: "https://www.aacn.org/-/media/aacn-website/certification/get-certified/handbooks/certpolicyhndbk.pdf",
    codes: ["CCRNADULT", "CCRNPEDS", "CCRNNEO", "PCCN"],
    notice: /not affiliated with or endorsed by AACN Certification Corporation\.( .*)? CCRN and PCCN are registered service marks of AACN Certification Corporation\./,
    marks: /AACN|CCRN|PCCN/ },
  { name: "MSNCB", policy: "unstated", url: "https://www.msncb.org/Terms-Conditions", codes: ["CMSRN"],
    notice: /not affiliated with or endorsed by the Medical-Surgical Nursing Certification Board \(MSNCB\)\. CMSRN is a registered mark of MSNCB\./, marks: /MSNCB|CMSRN/ },
  { name: "FSBPT", policy: "unstated", url: "https://www.fsbpt.org/Portals/0/documents/free-resources/NPTE_Candidate_Handbook.pdf", codes: ["NPTEPT", "NPTEPTA"],
    notice: /not affiliated with or endorsed by the Federation of State Boards of Physical Therapy \(FSBPT\)\. NPTE and FSBPT are registered trademarks of FSBPT\./, marks: /FSBPT|NPTE/ },
  { name: "ASPPB", policy: "unstated", url: "https://asppb.net/exams/asppb-examination-for-professional-psychology-eppp/", codes: ["EPPP"],
    notice: /not affiliated with or endorsed by the Association of State and Provincial Psychology Boards \(ASPPB\)/, marks: /ASPPB|EPPP/ },
  { name: "ASWB", policy: "unstated", url: "https://www.aswb.org/terms-conditions/", codes: ["ASWBCLINICAL", "ASWBMASTERS"],
    notice: /not affiliated with or endorsed by the Association of Social Work Boards \(ASWB\)/, marks: /ASWB|Association of Social Work Boards/ },
  { name: "ACSM", policy: "unstated", url: "https://acsm.org/terms-of-use/", codes: ["ACSMCPT"],
    notice: /not affiliated with or endorsed by the American College of Sports Medicine \(ACSM\)\. ACSM and ACSM-CPT are marks of the American College of Sports Medicine\./,
    marks: /ACSM|American College of Sports Medicine/ },
  { name: "NCCPT (ISSA)", policy: "unstated", url: "https://www.issa.com/about-issa/terms-and-conditions", codes: ["NCCPTCPT"],
    notice: /not affiliated with or endorsed by NCCPT or ISSA\. NCCPT is a mark of the National Council for Certified Personal Trainers\./, marks: /NCCPT|ISSA/ },
  { name: "Scrum Alliance", policy: "unstated", url: "https://www.scrumalliance.org/certification-and-license-terms-and-conditions", codes: ["CSM"],
    notice: /not affiliated with or endorsed by Scrum Alliance\. Certified ScrumMaster and CSM are marks of Scrum Alliance, Inc\./, marks: /Scrum Alliance|ScrumMaster|\bCSM\b/ },
  // REQ-308/REQ-309: PeopleCert's Marks Usage Policy v4.0 covers licensees only
  // and grants no descriptive use to others, so it is treated as permission-only.
  { name: "PeopleCert", policy: "permission", url: "https://www.peoplecert.org/-/media/folders-reorganized/legal-documents/marks-usage-policy.pdf", codes: ["ITIL5FND", "ITIL4FND"],
    marks: /ITIL|PeopleCert|PRINCE2|AXELOS/ },
];

const ALL_CODES = BODIES.flatMap((b) => b.codes);
const ANY_MARK = new RegExp(BODIES.map((b) => b.marks.source).join("|"));
const PERMISSION_MARKS = new RegExp(BODIES.filter((b) => b.policy === "permission").map((b) => b.marks.source).join("|"));

// REQ-324: "Coach" that is part of an exam's own name (NASM's Certified
// Nutrition Coach) is the exam, not our product name.
const notOwnCoach = (title: string) => title.replace("Certified Nutrition Coach", "");

// REQ-324: the title form (Nick, 2026-11-17 03:40 PT) and its parts.
const EXAM_TITLE = /^Exam Prep for \S.+\S$/;
// A published exam code: letters/digits joined by hyphens with a digit in it
// (SY0-701, SAA-C03, AZ-900, 220-1201, 312-50, PCEP-30-03). Names like
// NCLEX-RN, NPTE-PT or "EPPP Part 1" are not codes.
const EXAM_CODE = /^(?=.*\d)[A-Z0-9]+(-[A-Z0-9]+)+$/;
const NO_CLAIM = /\b(Official|Approved|Authorized|Certified by|Master)\b/gi;

// REQ-324: where a title may carry ® or ™ for a body outside the 13
// permission bodies (theirs come from lib/unbranded.ts COURSE_REFERENCES and
// its MARK_EVIDENCE). A body not listed gets no symbol: CompTIA's page asks
// only its authorized partners to mark its names; AWS, Microsoft, Google,
// NREMT, ACSM, NCCPT, ASWB and Red Hat were not seen marking these names on
// a page read for this change. `firstUse`: the guideline asks for the symbol
// at the first use of a listed mark (`unlisted`: courses whose marks the
// owner's list does not carry).
const TITLE_SYMBOLS: Record<string, { url: string; readAt: string; how: string; marks: string[]; firstUse?: boolean; unlisted?: string[] }> = {
  PMI: { url: "https://www.pmi.org/certifications", readAt: "2026-11-17", how: "page; guideline (Rev. Jan 2023 PDF, read 2026-11-17): the notice follows the mark when it first appears; training providers may use certification marks in course headings with notice of PMI's ownership",
    marks: ["CAPM®", "PMP®", "PgMP®", "PfMP®", "PMI-PMOCP™", "PMI-ACP®", "PMI-RMP®", "PMI-PBA®", "PMI-CP™", "(CSPP)™", "PMI-CPMAI™", "PMI-SP®"], firstUse: true },
  "Linux Foundation / CNCF": { url: "https://www.linuxfoundation.org/trademark-list/", readAt: "2026-11-17", how: "page; https://www.linuxfoundation.org/legal/trademark-usage (read 2026-11-17): \"the ® symbol immediately after the first usage\"",
    marks: ["Certified Kubernetes Administrator®", "Certified Kubernetes Application Developer®", "Certified Kubernetes Security Specialist®", "Kubernetes®", "Prometheus Certified Associate®", "OpenTelemetry®", "Certified GitOps Associate®", "Certified Argo Project Associate®", "Cilium Certified Associate®", "Istio Certified Associate®", "Kyverno®", "Backstage®", "Linux Foundation Certified System Administrator®"],
    firstUse: true, unlisted: ["CNPA", "CNPE"] },
  NCSBN: { url: "https://trust.ncsbn.org/trademarks.page", readAt: "2026-11-16", how: "REQ-309 policy read: NCLEX, NCLEX-RN and NCLEX-PN are registered trademarks", marks: ["NCLEX-RN®", "NCLEX-PN®"] },
  "AACN Certification Corporation": { url: "https://www.aacn.org/-/media/aacn-website/certification/get-certified/handbooks/certpolicyhndbk.pdf", readAt: "2026-11-16", how: "REQ-309 policy read (PDF): CCRN and PCCN are registered service marks", marks: ["CCRN®", "PCCN®"] },
  MSNCB: { url: "https://www.msncb.org/Terms-Conditions", readAt: "2026-11-16", how: "REQ-309 policy read: CMSRN is a registered mark", marks: ["CMSRN®"] },
  FSBPT: { url: "https://www.fsbpt.org/Portals/0/documents/free-resources/NPTE_Candidate_Handbook.pdf", readAt: "2026-11-16", how: "REQ-309 policy read (PDF): NPTE and FSBPT are registered trademarks", marks: ["NPTE®"] },
  ASPPB: { url: "https://asppb.net/exams/asppb-examination-for-professional-psychology-eppp/", readAt: "2026-11-16", how: "REQ-309 policy read: EPPP is a registered trademark of ASPPB", marks: ["EPPP®"] },
  NSCA: { url: "https://www.nsca.com/certification/certification-resources/credential-guidelines/", readAt: "2026-11-16", how: "REQ-309 policy read: CSCS and NSCA-CPT are registered marks", marks: ["CSCS®", "NSCA-CPT®"] },
  "Scrum Alliance": { url: "https://www.scrumalliance.org/get-certified/scrum-master-track", readAt: "2026-11-17", how: "page: heading \"Certified ScrumMaster®\"", marks: ["Certified ScrumMaster®"] },
  "Scrum.org": { url: "https://www.scrum.org/resources/suggested-reading-professional-scrum-master", readAt: "2026-11-17", how: "search result title only (\"Suggested Reading for Professional Scrum Master™ I\"); page not fetched", marks: ["Professional Scrum Master™"] },
};

describe("REQ-309: each exam body's trademark policy, at its most conservative reading", () => {
  test("every covered course still exists under its original code, so mastery stays mapped", () => {
    const missing = ALL_CODES.filter((c) => !byCode.has(c));
    assert.deepEqual(missing, []);
    assert.equal(new Set(ALL_CODES).size, ALL_CODES.length, "a code is listed under two bodies");
    assert.equal(ALL_CODES.length, 133);
  });

  test("every certification course of an exam body is covered here", () => {
    const uncovered = CATALOG_TRACKS.filter(
      (t) => t.trackType === "certification" && !COACH_ALLOWED.has(t.code) && !ALL_CODES.includes(t.code) && t.code !== "WAPSYCHJP"
    ).map((t) => t.code);
    assert.deepEqual(uncovered, [], "add the course's body (and its policy) to BODIES");
  });

  test("each body records the policy it was read under, and when", () => {
    for (const b of BODIES) assert.match(b.url, /^https:\/\//, b.name);
    assert.equal(READ, "2026-11-16");
  });

  test("REQ-324: unbranded naming is off, so titles, the exam card, prompts and emails name the exam", () => {
    assert.equal(UNBRANDED_NAMING_ON, false);
  });

  test("REQ-324: every exam course's title is 'Exam Prep for <Exam>', naming the exam by its body's own name or mark", () => {
    for (const b of BODIES)
      for (const code of b.codes) {
        const title = byCode.get(code)!.title;
        assert.match(title, EXAM_TITLE, `${b.name} ${code}: ${title}`);
        assert.match(title, b.marks, `${b.name} ${code}: the title names no mark of its exam body: ${title}`);
        assert.doesNotMatch(notOwnCoach(title), /\bCoach\b/, `${b.name} ${code}`);
      }
    assert.match(byCode.get("WAPSYCHJP")!.title, /^Exam Prep for Washington Psychology Jurisprudence Examination$/);
  });

  test("REQ-324: a published exam code is in parentheses after the exam's name (Red Hat course numbers aside)", () => {
    for (const b of BODIES)
      for (const code of b.codes) {
        const t = byCode.get(code)!;
        const examCode = t.credential?.examCode;
        if (!examCode || !EXAM_CODE.test(examCode) || b.name === "Red Hat") continue;
        assert.ok(t.title.includes(`(${examCode})`), `${code}: ${t.title} lacks (${examCode})`);
      }
    // The version distinctions that existed before REQ-324 survive.
    assert.equal(byCode.get("SECPLUS")!.title, "Exam Prep for CompTIA Security+ (SY0-701)");
    assert.equal(byCode.get("SECPLUSV8")!.title, "Exam Prep for CompTIA Security+ (SY0-801)");
    assert.equal(byCode.get("ITIL5FND")!.title, "Exam Prep for ITIL® Foundation (Version 5)");
    assert.equal(byCode.get("ITIL4FND")!.title, "Exam Prep for ITIL® 4 Foundation");
    for (const code of ["NASMCPT", "ACECPT", "ACSMCPT", "NSCACPT", "NCCPTCPT", "FNPAANP"]) assert.match(byCode.get(code)!.title, / \([a-z ]+ focus\)$/, code);
    assert.match(byCode.get("FNPANCC")!.title, / \(with professional role topics\)$/);
  });

  test("REQ-324: no title, reference line or disclaimer claims 'Official', 'Approved', 'Authorized', 'Certified by' or 'Master', unless the word is in the exam's own published name", () => {
    for (const t of CATALOG_TRACKS) {
      const ref = examReferenceForCode(t.code);
      for (const text of [t.title, ref?.line ?? "", ref?.disclaimer ?? ""])
        for (const m of text.matchAll(NO_CLAIM)) {
          const own = t.credential?.credentialName ?? "";
          assert.ok(new RegExp(`\\b${m[0]}\\b`, "i").test(own), `${t.code}: "${m[0]}" in "${text}" is not part of the exam's name (${own})`);
        }
    }
    assert.match("Exam Prep for Master CISSP®", NO_CLAIM);
  });

  test("REQ-324: ® and ™ only where the owner marks the name so, and on first use where its guideline asks", () => {
    for (const b of BODIES)
      for (const code of b.codes) {
        const title = byCode.get(code)!.title;
        const allowed = b.policy === "permission"
          ? [COURSE_REFERENCES[code].exam, COURSE_REFERENCES[code].markSentence].join(" ").match(/[^ (]+[®™]/g) ?? []
          : TITLE_SYMBOLS[b.name]?.marks ?? [];
        for (const m of title.matchAll(/[®™]/g)) {
          const upto = title.slice(0, m.index! + 1);
          assert.ok(allowed.some((a) => upto.endsWith(a)), `${b.name} ${code}: "${upto}" -- no evidence the owner marks it so`);
        }
        if (TITLE_SYMBOLS[b.name]?.firstUse && !(TITLE_SYMBOLS[b.name].unlisted ?? []).includes(code))
          assert.match(title, /[®™]/, `${b.name} ${code}: its guideline asks for the symbol on first use`);
      }
    for (const s of Object.values(TITLE_SYMBOLS)) {
      assert.match(s.url, /^https:\/\//);
      assert.match(s.readAt, /^2026-11-1[67]$/);
    }
  });

  // REQ-324 follow-up (Nick, 2026-11-17 08:59 PT): Microsoft courses are named
  // for the certification as Microsoft Learn names it, with "Microsoft" first
  // ("Microsoft Certified: Azure Fundamentals" -> "Exam Prep for Microsoft
  // Azure Fundamentals (AZ-900)"), as the AWS titles use the certification name.
  test("REQ-324: Microsoft titles are 'Exam Prep for Microsoft <certification> (<exam code>)'", () => {
    for (const code of BODIES.find((b) => b.name === "Microsoft")!.codes) {
      const t = byCode.get(code)!;
      const cert = t.credential!.credentialName.replace(/^Microsoft Certified: (Microsoft )?/, "");
      assert.equal(t.title, `Exam Prep for Microsoft ${cert} (${t.credential!.examCode})`, code);
    }
    assert.equal(byCode.get("AZ900")!.title, "Exam Prep for Microsoft Azure Fundamentals (AZ-900)");
  });

  test("titles are unique across the catalog", () => {
    const seen = new Map<string, string>();
    for (const t of CATALOG_TRACKS) {
      assert.ok(!seen.has(t.title), `${t.code} and ${seen.get(t.title)} share "${t.title}"`);
      seen.set(t.title, t.code);
    }
  });

  // REQ-319 (Nick, 2026-11-16, Option 2), kept by REQ-324: a permission
  // body's course page carries one plain reference line ("Prepares you for
  // the <EXAM> exam offered by <Owner>.") and its description ends with the
  // specific disclaimer instead of the generic notice.
  test("'permission' bodies: a reference line and the specific disclaimer at the end of the description", () => {
    for (const b of BODIES.filter((x) => x.policy === "permission"))
      for (const code of b.codes) {
        const t = byCode.get(code)!;
        assert.equal(REFERENCE_LINE_ON[b.name], true, b.name);
        const ref = examReferenceForCode(code);
        assert.ok(ref, `${b.name} ${code}: no reference line`);
        assert.match(ref.line, /^Prepares you for the .+ exam offered by .+\.$/, code);
        assert.match(ref.disclaimer, /^(.+ is a (registered (certification )?)?(mark|trademark|certification mark) of .+\. )?Ascendra is independent and is not affiliated with, sponsored by or endorsed by .+\.$/, code);
        assert.ok(t.description.endsWith(` ${ref.disclaimer}`), `${code}: the description ends with the specific disclaimer`);
        assert.doesNotMatch(t.description, GENERIC_NOTICE, code);
        // The exam's mark appears once in the line.
        const exam = COURSE_REFERENCES[code].exam;
        assert.equal(ref.line.split(exam).length - 1, 1, code);
      }
  });

  // REQ-324 follow-up (Nick, 2026-11-17 08:59 PT): a permission body's course
  // description names its exam as the title does (the title's exam name,
  // without a "(... focus)" tag), with the same symbols and evidence as the
  // title, and no other ® or ™ before the disclaimer.
  test("REQ-324: 'permission' bodies: the description names the exam as the title does, with the title's symbols only", () => {
    const examInTitle = (title: string) => title.replace(/^Exam Prep for /, "").replace(/ \((?:[a-z ]+ focus|with professional role topics)\)$/, "");
    for (const b of BODIES.filter((x) => x.policy === "permission"))
      for (const code of b.codes) {
        const t = byCode.get(code)!;
        const exam = examInTitle(t.title);
        const ref = examReferenceForCode(code)!;
        const body = t.description.slice(0, -ref.disclaimer.length);
        assert.ok(body.includes(exam), `${b.name} ${code}: the description does not name "${exam}"`);
        assert.equal(body.split(exam).length - 1, 1, `${code}: the exam is named once`);
        const allowed = [COURSE_REFERENCES[code].exam, COURSE_REFERENCES[code].markSentence].join(" ").match(/[^ (]+[®™]/g) ?? [];
        for (const m of body.matchAll(/[®™]/g)) {
          const upto = body.slice(0, m.index! + 1);
          assert.ok(allowed.some((a) => upto.endsWith(a)), `${code}: "${upto.slice(-40)}" -- no evidence the owner marks it so`);
        }
      }
    assert.equal(byCode.get("ITIL5FND")!.description.startsWith("Preparation for the ITIL® Foundation (Version 5) exam"), true);
  });

  test("'nominative' and 'unstated' bodies: the description carries the body's notice", () => {
    for (const b of BODIES.filter((x) => x.policy !== "permission"))
      for (const code of b.codes) assert.match(byCode.get(code)!.description, b.notice!, `${b.name} ${code}`);
  });

  test("CompTIA: a certification name in a description always carries the word CompTIA", () => {
    const bare = /(?<!CompTIA )\b(A|Network|Security|Linux|CySA|PenTest|Cloud|Data|Server|Project|Tech|AutoOps|SecAI|ITF)\+/;
    for (const t of CATALOG_TRACKS) assert.doesNotMatch(t.description, bare, t.code);
  });

  test("Red Hat: no course identification numbers in title or description", () => {
    for (const code of ["EX188", "EX280"]) {
      const t = byCode.get(code)!;
      assert.doesNotMatch(`${t.title} ${t.description}`, /\b(EX|RH|DO)\d{3}\b/, code);
    }
  });

  test("no catalog title pairs an exam body's mark with 'Coach'", () => {
    const bad = CATALOG_TRACKS.filter((t) => /\bCoach\b/.test(notOwnCoach(t.title)) && ANY_MARK.test(t.title)).map((t) => `${t.code}: ${t.title}`);
    assert.deepEqual(bad, []);
  });

  test("only degree and skill courses keep a 'Coach' title", () => {
    const bad = CATALOG_TRACKS.filter((t) => /\bCoach$/.test(notOwnCoach(t.title)) && !COACH_ALLOWED.has(t.code)).map((t) => `${t.code}: ${t.title}`);
    assert.deepEqual(bad, []);
  });
});

// REQ-309 kept README, the app's lists and What's new free of the
// permission bodies' names; REQ-324 names them again. What stays: the app's
// trademark owners list names every permission body (its owner and marks as
// lib/unbranded.ts has them), and the settings notice names none.
describe("REQ-309/REQ-324: the app's trademark owners list", () => {
  const repo = join(__dirname, "..", "..");
  const read = (p: string) => readFileSync(join(repo, p), "utf8");

  test("the app's trademark owners list names every 'permission' body, and the settings notice names none", () => {
    const vendor = read("mobile/src/lib/vendor.ts");
    const list = vendor.slice(vendor.indexOf("TRADEMARK_OWNERS")).replace(/\/\/.*$/gm, "");
    const entries = [...list.matchAll(/^\s*"([^"]+)",$/gm)].map((m) => m[1]);
    for (const b of BODIES.filter((x) => x.policy === "permission")) {
      const named = entries.filter((e) => b.marks.test(e) || b.codes.some((c) => COURSE_REFERENCES[c] && e.includes((COURSE_REFERENCES[c].markSentence.match(/ of (.+)\.$/)?.[1] ?? COURSE_REFERENCES[c].owner).replace(/^the /, ""))));
      assert.ok(named.length >= 1, `${b.name} is missing from TRADEMARK_OWNERS`);
    }
    const settings = read("mobile/app/(app)/settings.tsx");
    assert.doesNotMatch(settings.replace(/\{\/\*.*?\*\/\}|\/\/.*$/gm, ""), PERMISSION_MARKS);
  });

  test("README describes the REQ-324 titles, not the descriptive ones", () => {
    const readme = read("README.md");
    assert.doesNotMatch(readme, /Prep for an? [a-z]/);
    assert.match(readme, /Exam Prep for CISSP®/);
  });
});

// REQ-194 (Nick, 2026-11-09; migration 065): the Red Hat and Docker courses
// are hidden from the catalog, not deleted, so they can come back if the
// owners agree. Nothing else is hidden by accident.
// REQ-319 (Nick, 2026-11-16, option A): the six courses REQ-318 hid pending
// their exam body's permission (ISC2, EC-Council, NBCC, BCEN) are listed
// again, unbranded (lib/unbranded.ts, lib/unbranded.test.ts).
const UNHIDDEN_REQ319 = ["CEH", "CEN", "CISSP", "ISC2CC", "NCE", "NCMHCE"];

describe("hidden courses", () => {
  // REQ-308: ITIL4FND is hidden too, replaced by ITIL5FND (its reason is
  // checked in pm-frameworks-course.test.ts).
  // REQ-318 (Nick, 2026-11-16): the courses of ISC2, EC-Council, NBCC and
  // BCEN, whose policies allow no use of their marks without written
  // permission, are hidden until that permission or legal advice arrives.
  test("exactly EX188, EX280, DCA and ITIL4FND are hidden, each with its reason", () => {
    const hidden = CATALOG_TRACKS.filter((t) => t.hiddenAt).map((t) => t.code).sort();
    assert.deepEqual(hidden, ["DCA", "EX188", "EX280", "ITIL4FND"]);
    for (const code of ["EX188", "EX280"]) {
      const t = byCode.get(code)!;
      assert.ok(!Number.isNaN(Date.parse(t.hiddenAt!)), code);
      assert.match(t.hiddenReason ?? "", /https:\/\/www\.redhat\.com\/en\/about\/trademark-guidelines-and-policies/, code);
    }
    assert.match(byCode.get("DCA")!.hiddenReason ?? "", /https:\/\/www\.docker\.com\/legal\/trademark-guidelines/);
  });

  test("REQ-319: the six courses REQ-318 hid are listed again, with no hidden reason left behind", () => {
    const six = BODIES.filter((b) => ["ISC2", "EC-Council", "NBCC", "BCEN"].includes(b.name)).flatMap((b) => b.codes).sort();
    assert.deepEqual(six, UNHIDDEN_REQ319);
    for (const code of UNHIDDEN_REQ319) {
      const t = byCode.get(code)!;
      assert.equal(t.hiddenAt, undefined, code);
      assert.equal(t.hiddenReason, undefined, code);
    }
  });

  test("their content is kept: units and objectives are still seeded", () => {
    for (const code of ["EX188", "EX280", "DCA", ...UNHIDDEN_REQ319]) {
      const t = byCode.get(code)!;
      assert.ok(t.units.length > 0, code);
      assert.ok(t.units.every((u) => u.objectives.length > 0), code);
    }
  });
});
