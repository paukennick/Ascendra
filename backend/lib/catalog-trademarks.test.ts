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
  "CNA", "LPNVN", "ADNRN", "BSNRN", "DPT",
]);

// Marks of the covered bodies, as they appeared in the old "<mark> Coach" titles.
const MARKS =
  /\b(AWS|Azure|Microsoft|Google Cloud|PMI|PMP|CAPM|PgMP|PfMP|CSPP|NCLEX|CCRN|NPTE|ABPTS|Clinical Specialist|Kubernetes|Prometheus|OpenTelemetry|GitOps|Argo|Cilium|Istio|Kyverno|Backstage|Cloud Native|Docker|DCA|Red Hat|OpenShift|NASM|ACE|ACSM|NSCA|CSCS|ISSA|NCCPT|CompTIA|NREMT|National Registry)\b/;

const MS = /not affiliated with or endorsed by Microsoft\. Microsoft and Azure are trademarks of the Microsoft group of companies\.$/;
const PMI = /not affiliated with or endorsed by PMI\. PMI (and \S+ are marks|is a mark) of Project Management Institute, Inc\./;
const LF = /not affiliated with or endorsed by The Linux Foundation\./;
const DOCKER = /Docker is a trademark or registered trademark of Docker, Inc\. in the United States and\/or other countries\.$/;
const REDHAT = /Ascendra has no affiliation with Red Hat, LLC\. The .+ trademarks are used for identification purposes only and are not intended to indicate affiliation with or approval by Red Hat\./;

type Body = { name: string; codes: string[]; notice?: RegExp };
const BODIES: Body[] = [
  { name: "AWS", codes: ["AWSCLF", "AWSSAA", "AWSAIF", "AWSDVA", "AWSSOA", "AWSDEA", "AWSMLA", "AWSSAP", "AWSDOP", "AWSSCS", "AWSANS"] },
  { name: "Microsoft", notice: MS, codes: ["AZ900", "AZ104", "AZ305", "AI901", "DP900", "AZ700", "AZ140", "DP300", "AZ400", "AZ120"] },
  { name: "Google Cloud", codes: ["GCPCDL", "GCPACE", "GCPPCA", "GCPPDE", "GCPDEVOPS", "GCPSEC", "GCPNET", "GCPDBE", "GCPDEV", "GCPMLE", "GCPGAIL"] },
  { name: "PMI", notice: PMI, codes: ["CAPM", "PMP", "PMIACP", "PGMP", "PFMP", "PMIRMP", "PMISP", "PMICP", "PMIPMOCP", "PMIPBA", "PMICPMAI", "CSPP"] },
  { name: "NCSBN", codes: ["NCLEXRN", "NCLEXPN"] },
  { name: "AACN", codes: ["CCRNADULT", "CCRNPEDS", "CCRNNEO"] },
  { name: "FSBPT", codes: ["NPTEPT", "NPTEPTA"] },
  { name: "ABPTS", codes: ["ABPTSOCS", "ABPTSGCS", "ABPTSNCS", "ABPTSCCS", "ABPTSPCS", "ABPTSSCS", "ABPTSONC", "ABPTSECS", "ABPTSPWCS", "ABPTSWMS"] },
  { name: "Linux Foundation", notice: LF, codes: ["CKA", "CKAD", "KCNA", "CKS", "KCSA", "PCA", "OTCA", "CGOA", "CAPA", "CCA", "ICA", "KCA", "CBA", "CNPA", "CNPE"] },
  { name: "Docker", notice: DOCKER, codes: ["DCA"] },
  { name: "Red Hat", notice: REDHAT, codes: ["EX188", "EX280"] },
  { name: "Fitness", codes: ["NASMCPT", "ACECPT", "ACSMCPT", "NSCACSCS", "NSCACPT", "NCCPTCPT"] },
];

describe("catalog titles and exam bodies' trademarks (REQ-194)", () => {
  test("every covered course still exists under its original code, so mastery stays mapped", () => {
    const missing = BODIES.flatMap((b) => b.codes).filter((c) => !byCode.has(c));
    assert.deepEqual(missing, []);
    assert.equal(BODIES.flatMap((b) => b.codes).length, 85);
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
