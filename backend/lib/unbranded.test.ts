// REQ-319 (Nick, 2026-11-16, option A): courses of an exam body whose
// trademark policy is "permission" (lib/catalog-trademarks.test.ts) show
// learners none of that body's names or marks, and still say which exam they
// prepare for by its published facts. Seeds the catalog, labs and sims in
// memory and scans every learner-facing string of these courses against the
// body's marks; checks the one switch every reader goes through
// (lib/unbranded.ts) and the prompt and email paths built on it. Server
// responses are scanned in lib/unbranded.dbtest.ts.
//
// REQ-324 (Nick, 2026-11-17): naming is back on for these courses
// (UNBRANDED_NAMING_ON false), so the learner-facing scan is gone: the
// course, its exam card, prompts and emails name the exam. What is checked
// now: the switch is off and every reader honors it, turning it on still
// hides everything (so it can be turned on again in one line), the reference
// line and disclaimer stay, and sims still name none of these bodies
// (lib/sim/cert-marks.test.ts).
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
  MARK_EVIDENCE,
  COURSE_REFERENCES,
  UNBRANDED_NAMING_ON,
  deliveryOf,
  examReferenceForCode,
  learnerExamNames,
  namesHiddenForCode,
  namesHiddenForProvider,
  learnerTrackRow,
  markIn,
  publishedExamFacts,
  timeLabel,
  unbrandedPromptRule,
} from "./unbranded";
import { currentFactsBlock } from "./current-facts";
import { domainFraming, goalLine } from "./prompts";
import { shortCourseName } from "./reminder-plan";

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

// The one place an unbranded course names its body: the reference line and
// the specific disclaimer that ends its description (REQ-319, Option 2). Taken
// out before the scan; their own form is checked below and in
// lib/catalog-trademarks.test.ts.
function learnerStrings(code: string): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const t = byCode.get(code)!;
  const ref = examReferenceForCode(code);
  const description = ref && t.description.endsWith(ref.disclaimer) ? t.description.slice(0, -ref.disclaimer.length) : t.description;
  strings({ ...t, description }, "track", out);
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

describe("REQ-324: the switch is off, and on would still hide every name", () => {
  test("off: names, codes and the current-facts block name the exam", () => {
    assert.equal(UNBRANDED_NAMING_ON, false);
    assert.equal(namesHiddenForCode("CISSP"), false);
    assert.equal(namesHiddenForProvider("isc2"), false);
    const n = learnerExamNames({ providerSlug: "isc2", providerName: "ISC2", credentialName: "Certified Information Systems Security Professional (CISSP)", examCode: null });
    assert.deepEqual([n.providerName, n.credentialName, n.unbranded], ["ISC2", "Certified Information Systems Security Professional (CISSP)", false]);
    assert.deepEqual(learnerTrackRow({ code: "CISSP", user_id: null }), { code: "CISSP", user_id: null });
    assert.match(currentFactsBlock(byCode.get("CISSP")!) ?? "", /Certified Information Systems Security Professional \(CISSP\)/);
    assert.match(currentFactsBlock(byCode.get("PCEP")!) ?? "", /PCEP-30-03/);
  });

  test("on: every name and code is hidden again, by the same readers", () => {
    assert.equal(namesHiddenForCode("CISSP", true), true);
    assert.equal(namesHiddenForCode("SECPLUS", true), false);
    assert.equal(learnerExamNames({ providerSlug: "isc2", providerName: "ISC2", credentialName: "CISSP" }, true).credentialName, null);
    assert.equal(learnerTrackRow({ code: "CISSP", user_id: null }, true).code, "INFOSEC-PRO");
  });

  test("the scan helper still finds a body's mark (kept for the sims and for switching back)", () => {
    const t = structuredClone(byCode.get("CISSP")!) as SeedTrack;
    t.units[0].objectives[0] += " (ISC2)";
    const out: { path: string; text: string }[] = [];
    strings(t, "track", out);
    assert.ok(out.some((x) => markIn("CISSP", x.text)));
    assert.equal(markIn("ITIL5FND", "the ITIL value system"), "ITIL");
    assert.equal(markIn("FNPANCC", "an ACE inhibitor"), null, "homonym");
    assert.equal(markIn("SECPLUS", "ISC2"), null, "not an unbranded course");
    assert.ok(MARK_HOMONYMS.flags.includes("g"));
    assert.ok(learnerStrings("CISSP").length > 50);
  });

  test("objective titles REQ-319 renamed only for marks are the bodies' wording again (REQ-324)", () => {
    const has = (code: string, o: string) => byCode.get(code)!.units.some((u) => u.objectives.includes(o));
    assert.ok(has("CISSP", "Apply the ISC2 Code of Professional Ethics and an organizational code of ethics to a professional dilemma"));
    assert.ok(has("ISC2CC", "Apply the ISC2 Code of Ethics canons, due care and due diligence to a workplace dilemma"));
    assert.ok(byCode.get("ITIL5FND")!.units.some((u) => u.title === "The ITIL Value System"));
    const objectives = UNBRANDED_BODIES.flatMap((b) => b.codes).flatMap((c) => byCode.get(c)!.units.flatMap((u) => u.objectives));
    assert.deepEqual(objectives.filter((o) => /certifying body|the framework\b|phased integrated training model|five-phase ethical hacking methodology/.test(o)), []);
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
    });

  test("adaptive exams are the adaptive ones (the two security exams that use CAT), the rest linear", () => {
    const adaptive = [...UNBRANDED_CODES].filter((c) => deliveryOf(byCode.get(c)!.credential!.questionFormat) === "adaptive").sort();
    assert.deepEqual(adaptive, ["CISSP", "ISC2CC"]);
    assert.equal(deliveryOf("Computerized Adaptive Testing (CAT): 100-125 items"), "adaptive");
    assert.equal(deliveryOf("120 questions, linear (every candidate answers the full form)"), "linear");
    assert.equal(deliveryOf("40 questions, fixed length (every candidate answers the same number of questions)"), "linear");
    assert.equal(deliveryOf("120 questions"), null);
    assert.equal(timeLabel(180), "3 hours");
    assert.equal(timeLabel(60), "1 hour");
    assert.equal(timeLabel(255), "255 minutes");
  });

});

describe("REQ-319: every reader goes through one switch", () => {
  test("learnerExamNames nulls the names and code for an unbranded provider only, when the switch is on", () => {
    const n = learnerExamNames({ providerSlug: "isc2", providerName: "ISC2", credentialName: "CISSP", examCode: "X", examRevision: "CISSP v9" }, true);
    assert.deepEqual([n.providerName, n.credentialName, n.examCode, n.examRevision, n.unbranded], [null, null, null, null, true]);
    const c = learnerExamNames({ providerSlug: "comptia", providerName: "CompTIA", credentialName: "CompTIA Security+", examCode: "SY0-701" }, true);
    assert.deepEqual([c.providerName, c.examCode, c.unbranded], ["CompTIA", "SY0-701", false]);
  });

  test("learnerTrackRow shows the display code for a catalog course only, when the switch is on", () => {
    assert.deepEqual(learnerTrackRow({ code: "CISSP", user_id: null, title: "t" }, true), { code: "INFOSEC-PRO", user_id: null, title: "t", unbranded: true });
    assert.deepEqual(learnerTrackRow({ code: "CISSP", user_id: "u1" }, true), { code: "CISSP", user_id: "u1" }, "a learner's own course keeps its code");
    assert.deepEqual(learnerTrackRow({ code: "SECPLUS", user_id: null }, true), { code: "SECPLUS", user_id: null });
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

describe("REQ-319/REQ-324: prompts and emails for a permission body's course", () => {
  test("the prompt rule is added only when names are hidden; with the switch off the coach context carries none", () => {
    const ctx = { trackTitle: byCode.get("CISSP")!.title, trackType: "certification", unbranded: true, credentialName: null, providerName: null, examCode: null };
    assert.ok(domainFraming(ctx).includes(unbrandedPromptRule()));
    assert.ok(!domainFraming({ ...ctx, unbranded: false }).includes(unbrandedPromptRule()));
    assert.equal(markIn("CISSP", goalLine({ ...ctx, trackTitle: "a course" })), null);
    const names = learnerExamNames({ providerSlug: "isc2", providerName: "ISC2", credentialName: "CISSP", examCode: null });
    assert.equal(names.unbranded, false, "coach-context passes names.unbranded, so no rule is added");
  });

  test("the reminder and countdown short name names the exam", () => {
    for (const code of ["CISSP", "CISM", "NCE", "PCEP"]) {
      const t = byCode.get(code)!;
      const c = t.credential!;
      const name = shortCourseName(
        learnerExamNames({ providerSlug: c.providerSlug, providerName: c.providerName, credentialName: c.credentialName, examCode: c.examCode ?? null, trackTitle: t.title })
      );
      assert.ok(markIn(code, name), `${code}: ${name}`);
    }
  });
});

describe("REQ-319: the reference line (Nick, 2026-11-16, Option 2)", () => {
  test("every body has dated evidence from its own site, and a switch", () => {
    assert.deepEqual(Object.keys(REFERENCE_LINE_ON).sort(), UNBRANDED_BODIES.map((b) => b.name).sort());
    for (const b of UNBRANDED_BODIES) {
      const ev = MARK_EVIDENCE[b.name];
      assert.ok(ev?.length, b.name);
      for (const e of ev) {
        assert.match(e.url, /^https:\/\//, b.name);
        assert.match(e.readAt, /^\d{4}-\d{2}-\d{2}$/, b.name);
        assert.ok(e.finding.length > 20, b.name);
      }
    }
  });

  test("on for every body; the physical therapy specialty board in plain words with no mark claim (Nick 2026-11-16)", () => {
    assert.deepEqual(Object.entries(REFERENCE_LINE_ON).filter(([, on]) => !on).map(([n]) => n), []);
    for (const code of UNBRANDED_BODIES.find((b) => b.name === "ABPTS (APTA)")!.codes) {
      const ref = examReferenceForCode(code);
      assert.ok(ref, code);
      assert.doesNotMatch(ref.line + ref.disclaimer, /[®™]|\bmark\b|\btrademark\b/, code);
      assert.match(ref.line, /^Prepares you for the [a-z' ]+ physical therapy specialist certification exam offered by the American Board of Physical Therapy Specialties\.$/, code);
      assert.equal(ref.disclaimer, "Ascendra is independent and is not affiliated with, sponsored by or endorsed by the American Board of Physical Therapy Specialties or the American Physical Therapy Association.", code);
    }
  });

  test("every course of a body that is on has its line and disclaimer, with the owner's symbol rules", () => {
    for (const b of UNBRANDED_BODIES.filter((x) => REFERENCE_LINE_ON[x.name]))
      for (const code of b.codes) {
        const r = examReferenceForCode(code)!;
        assert.ok(r, code);
        const ref = COURSE_REFERENCES[code];
        assert.equal(r.line, `Prepares you for the ${ref.exam} exam offered by ${ref.owner}.`);
        assert.equal(r.disclaimer, `${ref.markSentence ? `${ref.markSentence} ` : ""}Ascendra is independent and is not affiliated with, sponsored by or endorsed by ${ref.disclaimerOwner ?? ref.owner}.`);
        // "registered" only with ®, a ™ mark is a "trademark", no symbol no claim of either.
        if (/registered/.test(ref.markSentence)) assert.match(ref.markSentence, /®/, code);
        if (/™/.test(ref.markSentence)) assert.doesNotMatch(ref.markSentence, /registered/, code);
        assert.doesNotMatch(`${r.line} ${r.disclaimer}`, /\b(Official|Approved|Authorized|Certified by|Master)\b/i, code);
        // The evidence for each symbol the line uses names it.
        const evidence = MARK_EVIDENCE[b.name].map((e) => e.finding).join(" ");
        if (ref.exam.includes("®")) assert.ok(evidence.includes("®") || /registered (trade|certification )?marks?/.test(evidence), `${code}: no evidence of registration`);
        if (ref.exam.includes("™")) assert.ok(evidence.includes("™"), `${code}: no evidence for ™`);
      }
  });

  test("a switch can turn one body off without touching the others", () => {
    const off = { ...REFERENCE_LINE_ON, ISC2: false };
    assert.equal(examReferenceForCode("CISSP", off), null);
    assert.ok(examReferenceForCode("CISM", off));
    assert.equal(examReferenceForCode("SECPLUS"), null, "not a permission body");
  });
});
