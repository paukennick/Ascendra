// REQ-319 (Nick, 2026-11-16, option A): courses of an exam body whose
// trademark policy is "permission" (lib/catalog-trademarks.test.ts) show
// learners none of that body's names or marks, and still say which exam they
// prepare for by its published facts. Seeds the catalog, labs and sims in
// memory and scans every learner-facing string of these courses against the
// body's marks; checks the one switch every reader goes through
// (lib/unbranded.ts) and the prompt and email paths built on it. Server
// responses are scanned in lib/unbranded.dbtest.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";
import type { SeedTrack } from "../supabase/seed/data";
import { LAB_SETS } from "../supabase/seed/labs";
import { ALL_DOCUMENTS, loadDocument } from "./sim/documents";
import {
  UNBRANDED_BODIES,
  UNBRANDED_CODES,
  UNBRANDED_DISPLAY_CODES,
  MARK_HOMONYMS,
  REFERENCE_LINE_ON,
  deliveryOf,
  examReferenceFor,
  isUnbrandedCode,
  learnerExamNames,
  learnerTrackRow,
  markIn,
  publishedExamFacts,
  timeLabel,
  unbrandedPromptRule,
} from "./unbranded";
import { currentFactsBlock } from "./current-facts";
import { domainFraming, goalLine } from "./prompts";
import { shortCourseName } from "./reminder-plan";
import { MOCK_EXAM_FACTS } from "./mock-exam-facts";

const byCode = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
const ANY_PERMISSION_MARK = new RegExp(UNBRANDED_BODIES.map((b) => b.marks.source).join("|"));

// Fields that are not learner-facing text: the citations Nick allowed (a
// source's title and URL), the stored identity of the exam (read only through
// learnerExamNames, which nulls it for these courses), seed-only notes, and
// codes and slugs.
const NOT_LEARNER_TEXT = new Set([
  // citations
  "sources", "source", "cite", "url",
  // the exam's stored identity, nulled by learnerExamNames
  "providerSlug", "providerName", "providerUrl", "credentialSlug", "credentialName", "credentialUrl", "examCode", "examRevision",
  "objectivesRevision", "standardName", "standardRevision", "officialObjectivesUrl", "sourceUrl", "subcategorySlug",
  // seed-only notes and identifiers
  "versionNote", "publishedWeightsNote", "hiddenReason", "code", "trackCode", "slug", "curriculum",
]);
// A unit's source is a citation, but the outline statements and key values in
// it reach every prompt for the unit (lib/current-facts.ts), so they are scanned.
const SCANNED_SOURCE_FIELDS = ["outline", "keyValues"] as const;

function strings(x: unknown, path: string, out: { path: string; text: string }[]): void {
  if (typeof x === "string") return void out.push({ path, text: x });
  if (Array.isArray(x)) return x.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  if (!x || typeof x !== "object") return;
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (k === "sources" && Array.isArray(v)) {
      v.forEach((s, i) => {
        for (const f of SCANNED_SOURCE_FIELDS) if (s && typeof s === "object" && f in s) strings((s as Record<string, unknown>)[f], `${path}.sources[${i}].${f}`, out);
      });
      continue;
    }
    if (NOT_LEARNER_TEXT.has(k)) continue;
    strings(v, path ? `${path}.${k}` : k, out);
  }
}

function learnerStrings(code: string): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  strings(byCode.get(code)!, "track", out);
  for (const set of LAB_SETS.filter((s) => s.trackCode === code)) strings(set, "labs", out);
  for (const e of ALL_DOCUMENTS.filter((d) => d.course === code)) strings(loadDocument(e), `sim:${e.slug}`, out);
  return out;
}

describe("REQ-319: one list of unbranded bodies", () => {
  test("it is the 'permission' bodies of lib/catalog-trademarks.test.ts: same names, codes and marks", () => {
    const src = readFileSync(join(__dirname, "catalog-trademarks.test.ts"), "utf8");
    const listed = [...src.matchAll(/\{ name: "([^"]+)", policy: "permission",[\s\S]*?codes: (\[[^\]]*\]),?[\s\S]*?marks: \/(.+?)\/ \}/g)].map((m) => ({
      name: m[1],
      codes: JSON.parse(m[2].replace(/\s+/g, " ")) as string[],
      marks: m[3],
    }));
    assert.equal(listed.length, 13);
    assert.deepEqual(
      UNBRANDED_BODIES.map((b) => ({ name: b.name, codes: [...b.codes], marks: b.marks.source })),
      listed
    );
  });

  test("each body's provider slug is the one its courses are seeded with, and no other course uses it", () => {
    for (const b of UNBRANDED_BODIES)
      for (const code of b.codes) assert.ok(b.providerSlugs.includes(byCode.get(code)!.credential!.providerSlug), code);
    const slugs = new Set(UNBRANDED_BODIES.flatMap((b) => b.providerSlugs));
    const others = CATALOG_TRACKS.filter((t) => t.credential && slugs.has(t.credential.providerSlug) && !UNBRANDED_CODES.has(t.code)).map((t) => t.code);
    assert.deepEqual(others, []);
  });

  test("display codes: one per course, unique, never a catalog code, and naming no body's mark", () => {
    assert.deepEqual(Object.keys(UNBRANDED_DISPLAY_CODES).sort(), [...UNBRANDED_CODES].sort());
    const shown = Object.values(UNBRANDED_DISPLAY_CODES);
    assert.equal(new Set(shown).size, shown.length);
    for (const c of shown) {
      assert.ok(!byCode.has(c), c);
      assert.doesNotMatch(c, ANY_PERMISSION_MARK, c);
      assert.ok(c.length <= 50, c); // POST /api/courses' code limit
    }
  });
});

describe("REQ-319: no learner-facing string of an unbranded course names its body", () => {
  for (const b of UNBRANDED_BODIES)
    for (const code of b.codes)
      test(`${b.name} ${code}`, () => {
        const strs = learnerStrings(code);
        assert.ok(strs.length > 50, `${code}: only ${strs.length} strings scanned`);
        const bad = strs.filter((s) => markIn(code, s.text)).map((s) => `${s.path}: ${markIn(code, s.text)} in "${s.text.slice(0, 120)}"`);
        assert.deepEqual(bad, []);
      });

  test("the scan catches a mark in a unit title, an objective, a lab and a key value", () => {
    const t = structuredClone(byCode.get("CISSP")!) as SeedTrack;
    t.units[0].objectives[0] += " (ISC2)";
    const out: { path: string; text: string }[] = [];
    strings(t, "track", out);
    assert.ok(out.some((s) => markIn("CISSP", s.text)));
    assert.equal(markIn("ITIL5FND", "the ITIL value system"), "ITIL");
    assert.equal(markIn("FNPANCC", "an ACE inhibitor"), null, "homonym");
    assert.equal(markIn("SECPLUS", "ISC2"), null, "not an unbranded course");
    assert.ok(MARK_HOMONYMS.flags.includes("g"));
  });
});

describe("REQ-319: learners still know which exam it is", () => {
  for (const code of [...UNBRANDED_CODES])
    test(`${code}: every published fact is recorded`, () => {
      const t = byCode.get(code)!;
      const c = t.credential!;
      assert.match(c.questionFormat ?? "", /\d+/, `${code}: question count`);
      assert.ok(deliveryOf(c.questionFormat), `${code}: say whether the exam is adaptive or linear`);
      assert.ok((c.durationMinutes ?? 0) > 0, `${code}: time`);
      assert.ok((c.passingScorePolicy ?? "").length > 2, `${code}: passing standard`);
      assert.ok((c.recommendedExperience ?? "").length > 3, `${code}: eligibility`);
      const units = t.units.filter((u) => !u.retiredAt);
      assert.ok(units.length >= 2, `${code}: domains`);
      if (c.domainWeights !== "study_emphasis") assert.ok(units.every((u) => u.weight == null || u.weight >= 0), code);
      const facts = publishedExamFacts({
        questionFormat: c.questionFormat ?? null,
        durationMinutes: c.durationMinutes ?? null,
        passingScorePolicy: c.passingScorePolicy ?? null,
        recommendedExperience: c.recommendedExperience ?? null,
        domains: units.map((u) => ({ name: u.title, weightPercent: u.weight ?? null })),
      });
      assert.equal(facts.reference, null);
      assert.equal(markIn(code, JSON.stringify(facts)), null, code);
    });

  test("adaptive exams are the adaptive ones (the two security exams that use CAT), the rest linear", () => {
    const adaptive = [...UNBRANDED_CODES].filter((c) => deliveryOf(byCode.get(c)!.credential!.questionFormat) === "adaptive").sort();
    assert.deepEqual(adaptive, ["CISSP", "ISC2CC"]);
    assert.equal(deliveryOf("Computerized Adaptive Testing (CAT): 100-125 items"), "adaptive");
    assert.equal(deliveryOf("120 questions, linear (every candidate answers the full form)"), "linear");
    assert.equal(deliveryOf("120 questions"), null);
    assert.equal(timeLabel(180), "3 hours");
    assert.equal(timeLabel(60), "1 hour");
    assert.equal(timeLabel(255), "255 minutes");
  });

  test("no mock-exam fact entry names an unbranded course's body (there are none today)", () => {
    for (const f of MOCK_EXAM_FACTS) if (isUnbrandedCode(f.code)) assert.equal(markIn(f.code, `${f.body} ${f.examCode ?? ""} ${f.notReproduced ?? ""}`), null, f.code);
  });
});

describe("REQ-319: every reader goes through one switch", () => {
  test("learnerExamNames nulls the names and code for an unbranded provider only", () => {
    const n = learnerExamNames({ providerSlug: "isc2", providerName: "ISC2", credentialName: "CISSP", examCode: "X", examRevision: "CISSP v9" });
    assert.deepEqual([n.providerName, n.credentialName, n.examCode, n.examRevision, n.unbranded], [null, null, null, null, true]);
    const c = learnerExamNames({ providerSlug: "comptia", providerName: "CompTIA", credentialName: "CompTIA Security+", examCode: "SY0-701" });
    assert.deepEqual([c.providerName, c.examCode, c.unbranded], ["CompTIA", "SY0-701", false]);
  });

  test("learnerTrackRow shows the display code for a catalog course only", () => {
    assert.deepEqual(learnerTrackRow({ code: "CISSP", user_id: null, title: "t" }), { code: "INFOSEC-PRO", user_id: null, title: "t", unbranded: true });
    assert.deepEqual(learnerTrackRow({ code: "CISSP", user_id: "u1" }), { code: "CISSP", user_id: "u1" }, "a learner's own course keeps its code");
    assert.deepEqual(learnerTrackRow({ code: "SECPLUS", user_id: null }), { code: "SECPLUS", user_id: null });
  });

  test("every source file that reads the exam body's or credential's name passes it through learnerExamNames", () => {
    const root = join(__dirname, "..");
    const files: string[] = [];
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        if (f === "node_modules" || f.startsWith(".")) continue;
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f) && !/\.(db)?test\.ts$/.test(f)) files.push(p);
      }
    };
    walk(join(root, "lib"));
    walk(join(root, "app"));
    const readers = files.filter((p) => /join credential_providers/.test(readFileSync(p, "utf8")));
    assert.ok(readers.length >= 4, readers.join(", "));
    for (const p of readers) assert.match(readFileSync(p, "utf8"), /learnerExamNames\(/, p);
  });

  test("the course list, course view and favorite routes return the display code", () => {
    for (const p of ["app/api/courses/route.ts", "app/api/courses/[id]/route.ts", "app/api/courses/[id]/favorite/route.ts"])
      assert.match(readFileSync(join(__dirname, "..", p), "utf8"), /learnerTrackRow\(/, p);
  });
});

describe("REQ-319: prompts and emails for an unbranded course", () => {
  test("every prompt carries the rule, and the goal line names no exam", () => {
    const ctx = { trackTitle: byCode.get("CISSP")!.title, trackType: "certification", unbranded: true, credentialName: null, providerName: null, examCode: null };
    assert.ok(domainFraming(ctx).includes(unbrandedPromptRule()));
    assert.ok(!domainFraming({ ...ctx, unbranded: false }).includes(unbrandedPromptRule()));
    assert.equal(markIn("CISSP", goalLine(ctx)), null);
  });

  test("the current-facts block names no mark outside the cited source titles and URLs", () => {
    for (const code of UNBRANDED_CODES) {
      const t = byCode.get(code)!;
      const citations = t.units.flatMap((u) => (u.sources ?? []).flatMap((s) => [s.title, s.url]));
      for (const unit of [null, ...t.units.filter((u) => !u.retiredAt).map((u) => u.title)]) {
        let block = currentFactsBlock(t, unit) ?? "";
        for (const c of citations) block = block.split(c).join("");
        assert.equal(markIn(code, block), null, `${code} / ${unit ?? "course"}`);
      }
    }
  });

  test("the reminder and countdown short name falls back to the course title", () => {
    for (const code of UNBRANDED_CODES) {
      const t = byCode.get(code)!;
      const c = t.credential!;
      const name = shortCourseName(
        learnerExamNames({ providerSlug: c.providerSlug, providerName: c.providerName, credentialName: c.credentialName, examCode: c.examCode ?? null, trackTitle: t.title })
      );
      assert.equal(markIn(code, name), null, `${code}: ${name}`);
    }
  });
});

describe("REQ-319: the reference line is a per-body switch, off for every body", () => {
  test("off by default: nothing is shown", () => {
    assert.deepEqual(Object.keys(REFERENCE_LINE_ON).sort(), UNBRANDED_BODIES.map((b) => b.name).sort());
    assert.ok(Object.values(REFERENCE_LINE_ON).every((on) => on === false), "Nick has not decided (research memo, Option 2)");
    assert.equal(examReferenceFor({ providerSlug: "isc2", providerName: "ISC2", credentialName: "CISSP" }), null);
  });

  test("switched on for one body, only that body's courses get the line and its disclaimer", () => {
    const on = { ...REFERENCE_LINE_ON, ISC2: true };
    const r = examReferenceFor({ providerSlug: "isc2", providerName: "ISC2", credentialName: "Certified Information Systems Security Professional (CISSP)" }, on)!;
    assert.equal(r.line, "Prepares you for the Certified Information Systems Security Professional (CISSP) exam offered by ISC2.");
    assert.match(r.disclaimer, /is not affiliated with, sponsored by or endorsed by ISC2\.$/);
    assert.doesNotMatch(`${r.line} ${r.disclaimer}`, /Official|Approved|Authorized|Master|®/);
    assert.equal(examReferenceFor({ providerSlug: "isaca", providerName: "ISACA", credentialName: "CISM" }, on), null);
    assert.equal(examReferenceFor({ providerSlug: "comptia", providerName: "CompTIA", credentialName: "Security+" }, on), null);
  });
});
