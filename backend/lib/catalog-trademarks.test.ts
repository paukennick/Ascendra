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
// Every covered title names no mark of ANY covered body. Course codes are
// unchanged, so mastery stays mapped. Pure data test over the seed modules.
//
// Not legal advice: no lawyer has reviewed these titles or notices.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";
import { RELEASE_NOTES } from "./release-notes";
import { COURSE_REFERENCES, REFERENCE_LINE_ON, examReferenceForCode } from "./unbranded";

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

  test("titles are descriptive 'Prep for a/an ... exam' and name no covered body's mark, symbol or exam code", () => {
    for (const b of BODIES)
      for (const code of b.codes) {
        const title = byCode.get(code)!.title;
        assert.match(title, /^Prep for an? [^®™]+ (exam|assessment|test)( \([^()]+\))?$/, `${b.name} ${code}: ${title}`);
        assert.doesNotMatch(title, ANY_MARK, `${b.name} ${code}: ${title}`);
        assert.doesNotMatch(title, /\bCoach\b/, `${b.name} ${code}`);
      }
  });

  test("titles are unique across the catalog, so descriptive names still tell courses apart", () => {
    const seen = new Map<string, string>();
    for (const t of CATALOG_TRACKS) {
      assert.ok(!seen.has(t.title), `${t.code} and ${seen.get(t.title)} share "${t.title}"`);
      seen.set(t.title, t.code);
    }
  });

  // REQ-319 (Nick, 2026-11-16, Option 2): a permission body's course names
  // no mark in its title; its course page carries one plain reference line
  // ("Prepares you for the <EXAM> exam offered by <Owner>.") and its
  // description ends with the specific disclaimer instead of the generic
  // notice. A body whose marks could not be verified (switched off in
  // lib/unbranded.ts REFERENCE_LINE_ON) keeps the generic notice.
  test("'permission' bodies: no mark in the title; a reference line and the specific disclaimer, or the generic notice while switched off", () => {
    for (const b of BODIES.filter((x) => x.policy === "permission"))
      for (const code of b.codes) {
        const t = byCode.get(code)!;
        assert.doesNotMatch(t.title, PERMISSION_MARKS, `${b.name} ${code}`);
        const ref = examReferenceForCode(code);
        if (REFERENCE_LINE_ON[b.name] !== true) {
          assert.equal(ref, null, code);
          assert.doesNotMatch(t.description, PERMISSION_MARKS, `${b.name} ${code}`);
          assert.match(t.description, GENERIC_NOTICE, `${b.name} ${code}`);
          continue;
        }
        assert.ok(ref, `${b.name} ${code}: no reference line`);
        assert.match(ref.line, /^Prepares you for the .+ exam offered by .+\.$/, code);
        assert.match(ref.disclaimer, /^(.+ is a (registered (certification )?)?(mark|trademark|certification mark) of .+\. )?Ascendra is independent and is not affiliated with, sponsored by or endorsed by .+\.$/, code);
        assert.ok(t.description.endsWith(` ${ref.disclaimer}`), `${code}: the description ends with the specific disclaimer`);
        assert.doesNotMatch(t.description, GENERIC_NOTICE, code);
        assert.doesNotMatch(t.description.slice(0, -ref.disclaimer.length), PERMISSION_MARKS, `${code}: a mark outside the disclaimer`);
        for (const text of [ref.line, ref.disclaimer]) assert.doesNotMatch(text, /\b(Official|Approved|Authorized|Certified by|Master)\b/i, code);
        // The exam's mark appears once in the line.
        const exam = COURSE_REFERENCES[code].exam;
        assert.equal(ref.line.split(exam).length - 1, 1, code);
      }
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
    const bad = CATALOG_TRACKS.filter((t) => /\bCoach\b/.test(t.title) && ANY_MARK.test(t.title)).map((t) => `${t.code}: ${t.title}`);
    assert.deepEqual(bad, []);
  });

  test("only degree and skill courses keep a 'Coach' title", () => {
    const bad = CATALOG_TRACKS.filter((t) => /\bCoach$/.test(t.title) && !COACH_ALLOWED.has(t.code)).map((t) => `${t.code}: ${t.title}`);
    assert.deepEqual(bad, []);
  });
});

// REQ-309: the app and README copy and What's new name no "permission" body.
// (CC BY in the open-textbook credits is Creative Commons, not ISC2's CC.)
describe("REQ-309: app copy, README and What's new", () => {
  const repo = join(__dirname, "..", "..");
  const read = (p: string) => readFileSync(join(repo, p), "utf8");

  test("What's new text names no 'permission' body or mark", () => {
    for (const n of RELEASE_NOTES) {
      const text = [n.title, ...n.items.flatMap((i) => [i.headline, i.body])].join(" \n ");
      assert.doesNotMatch(text, PERMISSION_MARKS, n.id);
    }
  });

  test("README names no 'permission' body or mark", () => {
    assert.doesNotMatch(read("README.md"), PERMISSION_MARKS);
  });

  test("the app's trademark owners list names a 'permission' body only once its reference line is on, and the settings notice names none", () => {
    const vendor = read("mobile/src/lib/vendor.ts");
    const list = vendor.slice(vendor.indexOf("TRADEMARK_OWNERS")).replace(/\/\/.*$/gm, "");
    const entries = [...list.matchAll(/^\s*"([^"]+)",$/gm)].map((m) => m[1]);
    for (const b of BODIES.filter((x) => x.policy === "permission")) {
      const named = entries.filter((e) => b.marks.test(e) || b.codes.some((c) => COURSE_REFERENCES[c] && e.includes((COURSE_REFERENCES[c].markSentence.match(/ of (.+)\.$/)?.[1] ?? COURSE_REFERENCES[c].owner).replace(/^the /, ""))));
      if (REFERENCE_LINE_ON[b.name]) assert.ok(named.length >= 1, `${b.name} is missing from TRADEMARK_OWNERS`);
      else assert.deepEqual(named, [], `${b.name} is listed before its marks are verified`);
    }
    const settings = read("mobile/app/(app)/settings.tsx");
    assert.doesNotMatch(settings.replace(/\{\/\*.*?\*\/\}|\/\/.*$/gm, ""), PERMISSION_MARKS);
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
