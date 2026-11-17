// REQ-194: course titles describe the exam they prepare for; they are not
// product names built on an exam body's mark ("PMP Coach", "AWS ... Coach").
// Each body's own trademark guidelines were read on 2026-11-09 (URLs in
// CHANGELOG.md under REQ-194). Pure data test over the seed modules.
//
// Not legal advice: no lawyer has reviewed these titles or notices.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";

const byCode = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));

// Titles that may keep "Coach": degree programmes and general skills, which
// name no exam body's credential. Anything else ending in "Coach" fails, so a
// new certification course has to be named descriptively from the start.
const COACH_ALLOWED = new Set([
  "MSCS", "PYTHON", "JAVASCRIPT", "CMPCBS", "MSHI",
  // REQ-265 / REQ-267 (2026-11-14): general skill courses with no exam body.
  "SQL", "TSNODE",
  "CNA", "LPNVN", "ADNRN", "BSNRN", "DPT",
]);

// Marks of the covered bodies, as they appeared in the old "<mark> Coach" titles.
const MARKS =
  /\b(AWS|Azure|Microsoft|Google Cloud|PMI|PMP|CAPM|PgMP|PfMP|CSPP|NCLEX|CCRN|NPTE|ABPTS|Clinical Specialist|Kubernetes|Prometheus|OpenTelemetry|GitOps|Argo|Cilium|Istio|Kyverno|Backstage|Cloud Native|Docker|DCA|Red Hat|OpenShift|NASM|ACE|ACSM|NSCA|CSCS|ISSA|NCCPT|CompTIA|NREMT|National Registry|Scrum|PSM|CSM|ITIL|ASQ|CSSGB)\b/;

const MS = /not affiliated with or endorsed by Microsoft\. Microsoft and Azure are trademarks of the Microsoft group of companies\.$/;
const PMI = /not affiliated with or endorsed by PMI\. PMI (and \S+ are marks|is a mark) of Project Management Institute, Inc\./;
const LF = /not affiliated with or endorsed by The Linux Foundation\./;
const DOCKER = /Docker is a trademark or registered trademark of Docker, Inc\. in the United States and\/or other countries\.$/;
// REQ-264: pythoninstitute.org marks PCEP™ and PCAP™ (read 2026-11-14).
const PYTHON_INSTITUTE = /not affiliated with or endorsed by the OpenEDG Python Institute\. PCEP™ and PCAP™ are marks of the OpenEDG Python Institute; Python is a trademark of the Python Software Foundation\.$/;
const REDHAT = /Ascendra has no affiliation with Red Hat, LLC\. The .+ trademarks are used for identification purposes only and are not intended to indicate affiliation with or approval by Red Hat\./;

type Body = { name: string; codes: string[]; notice?: RegExp };
const BODIES: Body[] = [
  { name: "AWS", codes: ["AWSCLF", "AWSSAA", "AWSAIF", "AWSDVA", "AWSSOA", "AWSDEA", "AWSMLA", "AWSSAP", "AWSDOP", "AWSSCS", "AWSANS"] },
  { name: "Microsoft", notice: MS, codes: ["AZ900", "AZ104", "AZ305", "AI901", "DP900", "AZ700", "AZ140", "DP300", "AZ400", "AZ120", "PL300", "SC500", "AI200"] },
  { name: "Google Cloud", codes: ["GCPCDL", "GCPACE", "GCPPCA", "GCPPDE", "GCPDEVOPS", "GCPSEC", "GCPNET", "GCPDBE", "GCPDEV", "GCPMLE", "GCPGAIL"] },
  { name: "PMI", notice: PMI, codes: ["CAPM", "PMP", "PMIACP", "PGMP", "PFMP", "PMIRMP", "PMISP", "PMICP", "PMIPMOCP", "PMIPBA", "PMICPMAI", "CSPP"] },
  { name: "NCSBN", codes: ["NCLEXRN", "NCLEXPN"] },
  { name: "AACN", codes: ["CCRNADULT", "CCRNPEDS", "CCRNNEO"] },
  { name: "FSBPT", codes: ["NPTEPT", "NPTEPTA"] },
  { name: "ABPTS", codes: ["ABPTSOCS", "ABPTSGCS", "ABPTSNCS", "ABPTSCCS", "ABPTSPCS", "ABPTSSCS", "ABPTSONC", "ABPTSECS", "ABPTSPWCS", "ABPTSWMS"] },
  { name: "Linux Foundation", notice: LF, codes: ["CKA", "CKAD", "KCNA", "CKS", "KCSA", "PCA", "OTCA", "CGOA", "CAPA", "CCA", "ICA", "KCA", "CBA", "CNPA", "CNPE"] },
  { name: "Docker", notice: DOCKER, codes: ["DCA"] },
  { name: "Red Hat", notice: REDHAT, codes: ["EX188", "EX280"] },
  { name: "Python Institute", notice: PYTHON_INSTITUTE, codes: ["PCEP", "PCAP"] },
  { name: "Fitness", codes: ["NASMCPT", "ACECPT", "ACSMCPT", "NSCACSCS", "NSCACPT", "NCCPTCPT", "NASMCNC"] },
];

describe("catalog titles and exam bodies' trademarks (REQ-194)", () => {
  test("every covered course still exists under its original code, so mastery stays mapped", () => {
    const missing = BODIES.flatMap((b) => b.codes).filter((c) => !byCode.has(c));
    assert.deepEqual(missing, []);
    assert.equal(BODIES.flatMap((b) => b.codes).length, 91);
  });

  test("covered courses are titled 'Prep for the ... Exam', never '<mark> Coach'", () => {
    for (const b of BODIES)
      for (const code of b.codes) {
        const title = byCode.get(code)!.title;
        assert.match(title, /^Prep for the .+ Exam$/, `${b.name} ${code}: ${title}`);
        assert.doesNotMatch(title, /\bCoach\b/, `${b.name} ${code}`);
      }
  });

  test("no catalog title pairs an exam body's mark with 'Coach'", () => {
    const bad = CATALOG_TRACKS.filter((t) => /\bCoach\b/.test(t.title) && MARKS.test(t.title)).map((t) => `${t.code}: ${t.title}`);
    assert.deepEqual(bad, []);
  });

  test("only degree and skill courses keep a 'Coach' title", () => {
    const bad = CATALOG_TRACKS.filter((t) => /\bCoach$/.test(t.title) && !COACH_ALLOWED.has(t.code)).map((t) => `${t.code}: ${t.title}`);
    assert.deepEqual(bad, []);
  });

  test("descriptions carry the notice where the body's guidelines ask for one", () => {
    for (const b of BODIES) {
      if (!b.notice) continue;
      for (const code of b.codes) assert.match(byCode.get(code)!.description, b.notice, `${b.name} ${code}`);
    }
  });

  test("Red Hat: no course identification numbers in title or description, and Red Hat is not the leading word", () => {
    for (const code of ["EX188", "EX280"]) {
      const t = byCode.get(code)!;
      assert.doesNotMatch(`${t.title} ${t.description}`, /\b(EX|RH|DO)\d{3}\b/, code);
      assert.doesNotMatch(t.title, /^Red Hat/, code);
      assert.match(t.title, /Red Hat®/, code);
    }
  });

  test("Docker: the Docker mark is not in the program title", () => {
    assert.doesNotMatch(byCode.get("DCA")!.title, /Docker/);
  });

  test("PMI and Linux Foundation marks carry the symbol their owner shows", () => {
    for (const code of ["CAPM", "PMP", "PMIACP", "PGMP", "PFMP", "PMIRMP", "PMISP", "PMIPBA"])
      assert.match(byCode.get(code)!.title, /® Certification Exam$/, code);
    for (const code of ["PMICP", "PMIPMOCP", "PMICPMAI", "CSPP"])
      assert.match(byCode.get(code)!.title, /™ Certification Exam$/, code);
    for (const code of ["CKA", "CKAD", "KCNA", "CKS", "KCSA", "PCA", "OTCA", "CGOA", "CAPA", "CCA", "ICA", "KCA", "CBA"])
      assert.match(byCode.get(code)!.title, /®/, code);
  });
});

// REQ-194 (Nick, 2026-11-09; migration 065): the Red Hat and Docker courses
// are hidden from the catalog, not deleted, so they can come back if the
// owners agree. Nothing else is hidden by accident.
describe("hidden courses", () => {
  // REQ-308: ITIL4FND is hidden too, replaced by ITIL5FND (its reason is
  // checked in pm-frameworks-course.test.ts).
  test("exactly EX188, EX280, DCA and ITIL4FND are hidden, each with its reason and guideline URL", () => {
    const hidden = CATALOG_TRACKS.filter((t) => t.hiddenAt).map((t) => t.code).sort();
    assert.deepEqual(hidden, ["DCA", "EX188", "EX280", "ITIL4FND"]);
    for (const code of ["EX188", "EX280"]) {
      const t = byCode.get(code)!;
      assert.ok(!Number.isNaN(Date.parse(t.hiddenAt!)), code);
      assert.match(t.hiddenReason ?? "", /https:\/\/www\.redhat\.com\/en\/about\/trademark-guidelines-and-policies/, code);
    }
    assert.match(byCode.get("DCA")!.hiddenReason ?? "", /https:\/\/www\.docker\.com\/legal\/trademark-guidelines/);
  });

  test("their content is kept: units and objectives are still seeded", () => {
    for (const code of ["EX188", "EX280", "DCA"]) {
      const t = byCode.get(code)!;
      assert.ok(t.units.length > 0, code);
      assert.ok(t.units.every((u) => u.objectives.length > 0), code);
    }
  });
});
