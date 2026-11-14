// REQ-264..268 (2026-11-14): the new technology courses -- PCEP and PCAP
// (OpenEDG Python Institute), SQL fundamentals, TypeScript & Node.js, PL-300,
// and SC-500 / AI-200, the replacements of the retired AZ-500 / AZ-204 -- as
// seeded: the published blueprints, dated unit sources with outline
// statements, the verification and review dates, and the hybrid lab plan.
// Pure data test over the seed modules; no database.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { LAB_SETS } from "../supabase/seed/labs";
import { unitPlan, type PlanTrack } from "../scripts/generate-labs-lib";
import { courseOutlineProblems } from "./content-currency";
import { unitReferenceLines } from "./current-facts";
import type { SeedTrack } from "../supabase/seed/data";

const byCode = new Map(CATALOG_TRACKS.map((t) => [t.code, t]));
const track = (code: string): SeedTrack => {
  const t = byCode.get(code);
  assert.ok(t, `${code} is in the catalog`);
  return t!;
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CHECKED = "2026-11-14";

const CERT: Record<string, { exam: string; weights: number[]; minutes: number; pass: string; host: RegExp }> = {
  PCEP: { exam: "PCEP-30-03", weights: [17, 23, 26, 20, 14], minutes: 50, pass: "70%", host: /pythoninstitute\.org\/pcep-exam-syllabus$/ },
  PCAP: { exam: "PCAP-31-04", weights: [12, 12, 9.5, 28.5, 24, 14], minutes: 65, pass: "72%", host: /pythoninstitute\.org\/pcap-exam-syllabus$/ },
  PL300: { exam: "PL-300", weights: [27.5, 27.5, 27.5, 17.5], minutes: 100, pass: "Minimum passing score 700", host: /study-guides\/pl-300$/ },
  SC500: { exam: "SC-500", weights: [24, 29, 24, 23], minutes: 120, pass: "Minimum passing score 700", host: /study-guides\/sc-500$/ },
  AI200: { exam: "AI-200", weights: [24, 29, 24, 23], minutes: 120, pass: "Minimum passing score 700", host: /study-guides\/ai-200$/ },
};
// Microsoft's published ranges (study guides read 2026-11-14).
const MS_RANGES: Record<string, [number, number][]> = {
  PL300: [[25, 30], [25, 30], [25, 30], [15, 20]],
  SC500: [[20, 25], [25, 30], [20, 25], [20, 25]],
  AI200: [[20, 25], [25, 30], [20, 25], [20, 25]],
};
const SKILL = ["SQL", "TSNODE"];
const ALL = [...Object.keys(CERT), ...SKILL];

describe("REQ-264..268: new technology courses", () => {
  test("each is in the catalog once with the descriptive title pattern", () => {
    for (const code of ALL) assert.equal(CATALOG_TRACKS.filter((t) => t.code === code).length, 1, code);
    for (const code of Object.keys(CERT)) assert.match(track(code).title, /^Prep for the .+ \([A-Z]+(-\d+)?\) Exam$/, code);
    assert.equal(track("SQL").title, "SQL Fundamentals Coach");
    assert.equal(track("TSNODE").title, "TypeScript & Node.js Programming Coach");
  });

  test("certification courses state the exam code, time and passing score as read", () => {
    for (const [code, c] of Object.entries(CERT)) {
      const t = track(code);
      assert.equal(t.trackType, "certification");
      assert.equal(t.freshnessModel, "certification_aligned");
      assert.equal(t.credential?.examCode, c.exam);
      assert.equal(t.credential?.durationMinutes, c.minutes);
      assert.equal(t.credential?.passingScorePolicy, c.pass);
      assert.equal(t.credential?.status, "active");
      assert.match(t.credential!.officialObjectivesUrl, c.host);
    }
  });

  test("unit weights are the published section weights; Microsoft's sit inside their ranges and total 100", () => {
    for (const [code, c] of Object.entries(CERT)) {
      assert.deepEqual(activeUnits(track(code)).map((u) => u.weight), c.weights, code);
      assert.ok(Math.abs(c.weights.reduce((a, b) => a + b, 0) - 100) < 1e-9, code);
    }
    for (const [code, ranges] of Object.entries(MS_RANGES)) {
      track(code).units.forEach((u, i) => assert.ok(u.weight! >= ranges[i][0] && u.weight! <= ranges[i][1], `${code} / ${u.title}`));
    }
  });

  test("PCEP and PCAP teach the versions released 2026-10-31 and say the old ones sunset 2027-11-30", () => {
    for (const code of ["PCEP", "PCAP"]) {
      const c = track(code).credential!;
      assert.equal(c.effectiveDate, "2026-10-31");
      assert.match(c.versionNote!, /2027-11-30/);
      assert.equal(c.objectivesRevision, "Blueprint version 1.5, last revised November 2, 2026");
    }
    // PCEP-30-03 has 35 objectives in five sections, PCAP-31-04 42 in six.
    const outlineCount = (code: string) => track(code).units.flatMap((u) => u.sources!.flatMap((s) => s.outline ?? [])).length;
    assert.equal(outlineCount("PCEP"), 35);
    assert.equal(outlineCount("PCAP"), 42);
  });

  test("every unit has dated sources; certification units carry their outline statements; objectives are our own words", () => {
    for (const code of ALL) {
      const t = track(code);
      const cert = code in CERT;
      for (const u of t.units) {
        assert.ok(u.sources?.length, `${code} / ${u.title} has sources`);
        for (const s of u.sources!) {
          assert.match(s.checkedAt, DATE);
          assert.equal(s.checkedAt, CHECKED, `${code} / ${u.title}: ${s.url}`);
          assert.match(s.url, /^https:\/\//);
        }
        assert.ok(u.sources!.some((s) => s.keyValues?.length), `${code} / ${u.title} has key values`);
        if (cert) {
          const o = u.sources!.find((s) => s.outline?.length);
          assert.ok(o, `${code} / ${u.title} has outline statements`);
          assert.equal(o!.kind, "exam_outline");
        }
        assert.ok((u.gate ?? "").length > 60, `${code} / ${u.title} gate`);
        assert.ok(u.objectives.length >= 4, `${code} / ${u.title}`);
      }
      const all = t.units.flatMap((u) => u.objectives);
      assert.equal(new Set(all).size, all.length, `${code}: objectives unique`);
      const statements = new Set(
        t.units
          .flatMap((u) => u.sources!.flatMap((s) => s.outline ?? []))
          .flatMap((l) => l.split(/[:;]/))
          .map((x) => x.replace(/^\d+\.\d+\.\d+ /, "").trim().toLowerCase())
      );
      for (const o of all) assert.ok(!statements.has(o.toLowerCase()), `${code}: "${o}" copies an outline statement`);
      assert.deepEqual(courseOutlineProblems(t, CHECKED), [], code);
    }
  });

  test("verified 2026-11-14 after the check, reviewed 12 months later", () => {
    for (const code of ALL) {
      const t = track(code);
      assert.equal(t.sourceVerifiedAt, "2026-11-14T00:00:00Z", code);
      assert.equal(t.contentReviewDueAt, "2027-11-14T00:00:00Z", code);
      if (t.credential) assert.equal(t.credential.lastVendorVerifiedAt, "2026-11-14T00:00:00Z", code);
    }
    for (const code of SKILL) {
      const t = track(code);
      assert.equal(t.freshnessModel, "technology_aligned");
      assert.equal(t.trackType, "graduate");
      assert.equal(t.curriculum?.kind, "language_reference");
      assert.equal(t.curriculum?.checkedAt, CHECKED);
      assert.equal(t.levelFlow, undefined, `${code}: levelFlow is the lead's switch`);
    }
  });

  test("the lesson writer gets current-version key values (PostgreSQL 18, TypeScript 7, Node.js 26, Python 3.15)", () => {
    const lines = (code: string, unit: string) => unitReferenceLines(track(code), unit).join("\n");
    assert.match(lines("SQL", "The relational model & first queries"), /PostgreSQL 18 is the newest supported major/);
    assert.match(lines("SQL", "Window functions"), /RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW/);
    assert.match(lines("SQL", "Schema design: DDL, data types & constraints"), /VIRTUAL .*by default/);
    assert.match(lines("TSNODE", "TypeScript setup & the type system"), /strict is true/);
    assert.match(lines("TSNODE", "The Node.js runtime & core APIs"), /Node\.js 26 is Active LTS/);
    assert.match(lines("PCAP", "Advanced Python Constructs and I/O"), /New in 3\.15 only: \* and \*\* unpacking inside comprehensions/);
    assert.match(lines("PCEP", "File Handling and Module Imports"), /PEP 686/);
  });
});

describe("FAIL-1800: AZ-500 and AZ-204 retired WITH replacements", () => {
  test("the retired exams are not taught; their replacements are", () => {
    for (const t of CATALOG_TRACKS) assert.ok(!["AZ-500", "AZ-204"].includes(t.credential?.examCode ?? ""), t.code);
    assert.match(track("SC500").credential!.versionNote!, /replaces AZ-500 \(retired 2026-08-31\)/);
    assert.match(track("AI200").credential!.versionNote!, /replaces AZ-204 \(retired 2026-07-31\)/);
    assert.match(track("SC500").description, /successor to the retired Azure Security Engineer Associate \(AZ-500\)/);
    assert.match(track("AI200").description, /successor to the retired Azure Developer Associate \(AZ-204\)/);
  });
  test("tracks/azure.ts no longer says they retired with no replacement", () => {
    const header = readFileSync(join(__dirname, "../supabase/seed/tracks/azure.ts"), "utf8").slice(0, 4000);
    assert.doesNotMatch(header, /retired with no active\s*\n?\/\/\s*replacement exam/);
    assert.match(header, /AI-200 for AZ-204/);
    assert.match(header, /SC-500 for AZ-500/);
  });
});

// Lab sets: the hybrid plan unit by unit, one lab per objective.
const LAB_CODES = ["PCEP", "PCAP", "SQL", "TSNODE"];
const EXPECTED_PLAN: Record<string, number[]> = {
  PCEP: [2, 2, 3, 2, 2],
  PCAP: [2, 2, 1, 3, 2, 2],
  SQL: [2, 2, 2, 2, 2, 2, 1, 1],
  TSNODE: [2, 2, 2, 2, 2, 2, 1],
};

describe("REQ-264..268: lab sets", () => {
  const planOf = (code: string): PlanTrack => ({
    code,
    family: "general",
    units: activeUnits(track(code)).map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })),
  });
  const setOf = (code: string) => LAB_SETS.find((s) => s.trackCode === code)!;
  for (const code of LAB_CODES) {
    test(`${code}: hybrid density unit by unit, one lab per objective, dated sources, fictional framing`, () => {
      const set = setOf(code);
      assert.ok(set, `${code} has a lab set`);
      const perUnit = activeUnits(track(code)).map((u) => set.labs.filter((l) => u.objectives.includes(l.objective)).length);
      assert.deepEqual(perUnit, unitPlan(planOf(code), "hybrid"), code);
      assert.deepEqual(perUnit, EXPECTED_PLAN[code], code);
      const objectives = set.labs.map((l) => l.objective);
      assert.equal(new Set(objectives).size, objectives.length, `${code}: one lab per objective`);
      for (const s of set.sources) assert.match(s.checkedAt, DATE);
      if (code in CERT) {
        const o = set.sources.find((s) => s.kind === "exam_outline");
        assert.ok(o && o.checkedAt === CHECKED, `${code} cites its outline, checked ${CHECKED}`);
      }
      for (const lab of set.labs) {
        assert.ok(lab.slug.startsWith(`${code.toLowerCase()}-`), lab.slug);
        assert.match(lab.brief, /fictional/i, `${lab.slug}: the brief says the organization is fictional`);
      }
    });
  }
});
