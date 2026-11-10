// REQ-198: the PT School Prerequisites Refresher (PTPREREQ): seed shape,
// dated sources per unit, and its labs (validity, density, framing).
// The generic lab rules (content shape, real objective, unique slug) also
// run over this set in labs.test.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";
import { PT_PREREQ_TRACK, PTPREREQ_SCOPE_SOURCES, PTPREREQ_UNIT_SOURCES } from "../supabase/seed/tracks/pt-prereq";
import { LAB_SETS } from "../supabase/seed/labs";
import { CLINICAL_SAFETY } from "../supabase/seed/labs/types";
import { SOURCE_KINDS } from "../supabase/seed/sources";
import { labContentProblems } from "./lab-content";
import { seedLabContent } from "../supabase/seed/seed-lib";
import { courseOutlineProblems } from "./content-currency";
import { unitPlan, isPerformanceObjective, type PlanTrack } from "../scripts/generate-labs-lib";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const T = PT_PREREQ_TRACK;
const units = activeUnits(T);
const objectives = units.flatMap((u) => u.objectives);

describe("PT School Prerequisites Refresher: seed shape (REQ-198)", () => {
  test("in the catalog once, with an unused code", () => {
    assert.equal(CATALOG_TRACKS.filter((t) => t.code === "PTPREREQ").length, 1);
    assert.equal(CATALOG_TRACKS.filter((t) => t.code === T.code).length, 1);
  });

  test("same category and subcategory as the DPT course, gated by the same study notice", () => {
    const dpt = CATALOG_TRACKS.find((t) => t.code === "DPT")!;
    assert.equal(T.subcategorySlug, dpt.subcategorySlug);
    assert.equal(T.subcategorySlug, "physical-therapy");
    assert.equal(T.trackType, "graduate");
    assert.equal(T.freshnessModel, dpt.freshnessModel);
    assert.equal(T.requiresAcknowledgement, true);
    assert.equal(T.disclaimerKey, dpt.disclaimerKey);
  });

  test("title and description say what it is and use no exam body's mark as a product name", () => {
    assert.equal(T.title, "PT School Prerequisites Refresher");
    for (const mark of [/NPTE/, /FSBPT/, /CAPTE/, /PTCAS/, /APTA/, /ACAPT/, /OpenStax/, /\bCoach\b/, /®|™/]) {
      assert.doesNotMatch(T.title, mark, `title: ${mark}`);
      assert.doesNotMatch(T.description, mark, `description: ${mark}`);
    }
    assert.match(T.description, /refresher/i);
    assert.match(T.description, /does not replace/i, "says it is not the program's coursework");
  });

  test("no exam: no credential, no weights (the course screen would print them as '% of exam'), a dated curriculum", () => {
    assert.equal(T.credential, undefined);
    assert.equal(T.sourceUrl, undefined, "no Verified / Review due badge");
    assert.ok(units.every((u) => u.weight == null && u.rangeLabel == null));
    assert.deepEqual(courseOutlineProblems(T, "2026-11-09"), []);
    assert.equal(T.curriculum!.kind, "self_defined");
    assert.match(T.curriculum!.checkedAt, DATE);
  });

  test("covers every common prerequisite area APTA lists, leaning on the DPT year-one core", () => {
    const titles = units.map((u) => u.title).join(" | ");
    for (const area of [/Musculoskeletal/, /Muscle physiology/, /Biomechanics/, /Nervous/, /Cardiovascular/, /Respiratory/, /Physics/, /Chemistry/, /Psychology/, /Statistics/, /Cells/]) {
      assert.match(titles, area);
    }
    assert.equal(units.length, 11);
    assert.equal(objectives.length, 95);
    const core = units.slice(0, 6).reduce((n, u) => n + u.objectives.length, 0);
    assert.equal(core, 62);
    assert.ok(core / objectives.length >= 0.6, "the six core units hold at least 60% of the objectives");
    for (const u of units.slice(0, 6)) assert.ok(u.objectives.length >= units.slice(6).reduce((m, v) => Math.max(m, v.objectives.length), 0), `${u.title} is at least as deep as any later unit`);
  });

  test("objectives are specific and testable: unique, an action verb first, no vague verbs", () => {
    assert.equal(new Set(objectives).size, objectives.length);
    for (const o of objectives) {
      assert.match(o, /^(Match|Compare|Apply|Explain|Classify|Identify|Use|Name|Analyse|Sequence|Interpret|Calculate|Resolve|Modify|Distinguish|Trace|Recognise|Evaluate|Set up|Choose)\b/, o);
      assert.doesNotMatch(o, /^(Understand|Know|Learn|Be familiar|Appreciate|Describe)\b/i, o);
      assert.ok(o.length >= 60 && o.length <= 260, `length ${o.length}: ${o}`);
    }
    for (const u of units) assert.ok(u.gate && u.gate.length > 30, `${u.title} has a gate`);
  });

  test("every unit has dated sources with the sections it rests on; the scope sources are dated too", () => {
    assert.deepEqual(Object.keys(PTPREREQ_UNIT_SOURCES), units.map((u) => u.title), "one entry per unit, in order");
    for (const [unit, list] of Object.entries(PTPREREQ_UNIT_SOURCES)) {
      assert.ok(list.length >= 1, unit);
      for (const s of list) {
        assert.ok(s.url.startsWith("https://openstax.org/details/books/"), `${unit}: ${s.url}`);
        assert.match(s.checkedAt, DATE, unit);
        assert.ok((SOURCE_KINDS as readonly string[]).includes(s.kind));
        assert.match(s.sections, /^\d+\.\d+/, `${unit}: names sections`);
      }
    }
    const books = new Set(Object.values(PTPREREQ_UNIT_SOURCES).flat().map((s) => s.url.split("/").pop()));
    for (const b of ["anatomy-and-physiology-2e", "chemistry-2e", "college-physics-2e", "biology-2e", "psychology-2e", "introductory-statistics-2e"]) {
      assert.ok(books.has(b), `cites ${b}`);
    }
    assert.ok(PTPREREQ_SCOPE_SOURCES.some((s) => s.url.includes("apta.org")));
    assert.ok(PTPREREQ_SCOPE_SOURCES.every((s) => DATE.test(s.checkedAt) && s.url.startsWith("https://")));
  });
});

describe("PT School Prerequisites Refresher: labs (REQ-198)", () => {
  const set = LAB_SETS.find((s) => s.trackCode === "PTPREREQ")!;

  test("there is a lab set, citing dated sources", () => {
    assert.ok(set);
    assert.ok(set.sources.length >= 2 && set.sources.every((s) => s.url.startsWith("https://") && DATE.test(s.checkedAt)));
  });

  test("every lab is valid, on a real objective, framed as fictional practice", () => {
    const titles = new Set(objectives);
    for (const lab of set.labs) {
      assert.deepEqual(labContentProblems(seedLabContent(lab)), [], lab.slug);
      assert.ok(titles.has(lab.objective), `${lab.slug}: ${lab.objective}`);
      assert.match(lab.slug, /^ptprereq-/);
      assert.equal(lab.safetyNote, CLINICAL_SAFETY, lab.slug);
      assert.match(lab.brief, /fictional/i, lab.slug);
      const asks = lab.steps.map((s) => s.ask).join(" ");
      assert.doesNotMatch(asks, /\byour (own )?(patient|client)s?\b/i, lab.slug);
      if (lab.kind === "build") assert.equal(lab.steps[0].text, "", lab.slug);
    }
  });

  test("written-answer labs only: interactive answer types are not on this branch's base", () => {
    for (const lab of set.labs) {
      assert.ok(lab.kind === "build" || lab.kind === "case", lab.slug);
      assert.equal(Object.keys(lab).filter((k) => /answerType|interactive/i.test(k)).length, 0, lab.slug);
    }
  });

  test("hybrid density unit by unit, one lab per objective, each on a performance objective", () => {
    const plan: PlanTrack = { code: "PTPREREQ", family: "clinical", units: units.map((u) => ({ title: u.title, weight: u.weight ?? null, objectives: u.objectives })) };
    const want = unitPlan(plan, "hybrid");
    assert.deepEqual(want, [2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1]);
    assert.deepEqual(units.map((u) => set.labs.filter((l) => u.objectives.includes(l.objective)).length), want);
    const objs = set.labs.map((l) => l.objective);
    assert.equal(new Set(objs).size, objs.length);
    for (const lab of set.labs) assert.ok(isPerformanceObjective(lab.objective, "clinical"), lab.slug);
  });

  test("the torque, physics and statistics labs ask for the numbers worked out in the header", () => {
    const answer = (slug: string) => set.labs.find((l) => l.slug === slug)!.steps.flatMap((s) => s.parts.map((p) => p.modelAnswer)).join(" ");
    assert.match(answer("ptprereq-elbow-equilibrium"), /19\.11 N m/);
    assert.match(answer("ptprereq-elbow-equilibrium"), /478 N/);
    assert.match(answer("ptprereq-elbow-equilibrium"), /409 N/);
    assert.match(answer("ptprereq-elbow-equilibrium"), /380 N/);
    assert.match(answer("ptprereq-moment-arm-progression"), /31\.36 N m/);
    assert.match(answer("ptprereq-stair-climb-power"), /2,058 J/);
    assert.match(answer("ptprereq-stair-climb-power"), /343 W/);
    assert.match(answer("ptprereq-grip-strength-summary"), /33\.0 kg/);
    assert.match(answer("ptprereq-grip-strength-summary"), /31\.5 kg/);
    assert.match(answer("ptprereq-saline-molarity"), /154 mmol\/L/);
    assert.match(answer("ptprereq-map-pulse-pressure"), /MAP = 80 \+ 40\/3 = 93/);
  });

  test("the numbers themselves are right (recomputed here)", () => {
    const g = 9.8;
    const load = 2.0 * g * 0.15 + 5.0 * g * 0.33;
    assert.equal(load.toFixed(2), "19.11");
    assert.equal(Math.round(load / 0.04), 478);
    assert.equal(Math.round(load / 0.04 - 7 * g), 409);
    assert.equal(Math.round((2.0 * g * 0.15 + 5.0 * g * 0.25) / 0.04), 380);
    assert.equal((8 * g * 0.4).toFixed(2), "31.36");
    assert.equal(70 * g * 3, 2058);
    assert.equal(Math.round((70 * g * 3) / 6), 343);
    const d = [28, 31, 33, 30, 35, 29, 32, 46];
    const mean = d.reduce((a, b) => a + b, 0) / d.length;
    const sd = Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / (d.length - 1));
    assert.equal(mean, 33);
    assert.equal(sd.toFixed(1), "5.7");
    assert.equal(Math.round((9 / 58.44) * 1000), 154);
    assert.equal(Math.round(80 + 40 / 3), 93);
  });
});
