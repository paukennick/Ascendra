// REQ-262: the pure rules of beginner lesson variants (lib/lesson-variant.ts):
// the wire names, the step shape, the staleness hash and the clinical rule.
// The resolver and the grade route run against a real Postgres in
// lib/lesson-variant.dbtest.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertBeginnerAllowed,
  beginnerAllowed,
  BEGINNER_LAUNCH_SET,
  BeginnerVariantRefused,
  isClinicalCourse,
  LessonVersionUnavailableError,
  parseTeachSteps,
  standardLessonHash,
  versionOfWire,
  wireOfVersion,
} from "./lesson-variant";
import { EDUCATION_CATEGORY_PLAN } from "./billing-config";

const check = { question: "Which is a variable?", choices: ["a name for a value", "a loop", "a file", "a bug"], correctIndex: 0, reasons: ["Yes.", "No.", "No.", "No."] };
const step = (n: number) => ({ title: `Step ${n}`, plain: "p", example: "e", precise: "t", check });

describe("which version an answer names", () => {
  test("absent, null and standard are the standard lesson; 'new' is the beginner version", () => {
    for (const v of [undefined, null, "standard"]) assert.equal(versionOfWire(v), "standard");
    assert.equal(versionOfWire("new"), "beginner");
    assert.equal(wireOfVersion("beginner"), "new");
    assert.equal(wireOfVersion("standard"), null);
  });
  test("anything else is refused (null), not read as standard", () => {
    for (const v of ["beginner", "NEW", "", 1, true, {}, ["new"]]) assert.equal(versionOfWire(v), null, JSON.stringify(v));
  });
});

describe("teach steps", () => {
  test("3 to 5 well-formed steps parse", () => {
    for (const n of [3, 4, 5]) assert.equal(parseTeachSteps(Array.from({ length: n }, (_, i) => step(i))!)?.length, n);
  });
  test("2 or 6 steps, a missing field, a bad key or mismatched reasons do not", () => {
    assert.equal(parseTeachSteps([step(1), step(2)]), null);
    assert.equal(parseTeachSteps(Array.from({ length: 6 }, (_, i) => step(i))), null);
    assert.equal(parseTeachSteps([step(1), step(2), { ...step(3), precise: "" }]), null);
    assert.equal(parseTeachSteps([step(1), step(2), { ...step(3), check: { ...check, correctIndex: 4 } }]), null);
    assert.equal(parseTeachSteps([step(1), step(2), { ...step(3), check: { ...check, reasons: ["x"] } }]), null);
    assert.equal(parseTeachSteps([step(1), step(2), { ...step(3), check: { ...check, choices: ["a", "b"], reasons: ["x", "y"] } }]), null);
    assert.equal(parseTeachSteps("steps"), null);
    assert.equal(parseTeachSteps(null), null);
  });
  test("what comes back is a copy of the known fields only", () => {
    const out = parseTeachSteps([step(1), step(2), { ...step(3), extra: "x" }])!;
    assert.deepEqual(Object.keys(out[2]).sort(), ["check", "example", "plain", "precise", "title"]);
  });
});

describe("the standard lesson's hash", () => {
  const base = {
    guess_prompt: "g", teach: "t", teach_cards: null, fade_problem: "f", fade_choices: ["a", "b", "c", "d"], fade_why: "w",
    solo_check: "s", solo_choices: ["a", "b", "c", "d"], solo_correct_index: 1, solo_why: "w", solo_option_reasons: null,
  };
  test("is stable and 64 hex characters", () => {
    assert.match(standardLessonHash(base), /^[0-9a-f]{64}$/);
    assert.equal(standardLessonHash(base), standardLessonHash({ ...base }));
  });
  test("a change to the teaching, the cards or any part of the Solo check changes it", () => {
    const h = standardLessonHash(base);
    for (const change of [
      { teach: "t2" }, { teach_cards: { cards: [] } }, { guess_prompt: "g2" }, { fade_problem: "f2" },
      { solo_check: "s2" }, { solo_choices: ["a", "b", "c", "x"] }, { solo_correct_index: 2 }, { solo_why: "w2" }, { solo_option_reasons: ["1", "2", "3", "4"] },
    ]) {
      assert.notEqual(standardLessonHash({ ...base, ...change }), h, JSON.stringify(change));
    }
  });
});

describe("clinical courses never get beginner versions", () => {
  test("every clinical education category is clinical here, whatever its subcategory", () => {
    const clinical = Object.entries(EDUCATION_CATEGORY_PLAN).filter(([, v]) => v === "clinical").map(([k]) => k);
    assert.ok(clinical.includes("healthcare-nursing") && clinical.includes("mental-health"));
    for (const slug of clinical) {
      assert.equal(isClinicalCourse(slug), true, slug);
      assert.equal(isClinicalCourse(slug, "anything"), true, slug);
      assert.equal(beginnerAllowed({ ownedByLearner: false, categorySlug: slug, subcategorySlug: null }), false, slug);
      assert.throws(() => assertBeginnerAllowed({ ownedByLearner: false, categorySlug: slug, subcategorySlug: null }), BeginnerVariantRefused);
    }
  });
  test("IT, cloud, development, project management and an uncategorized course are allowed; a learner's own course is not", () => {
    for (const slug of ["comptia-certifications", "aws-certifications", "development", "project-management-certifications", null]) {
      assert.equal(beginnerAllowed({ ownedByLearner: false, categorySlug: slug, subcategorySlug: null }), true, String(slug));
    }
    assert.equal(beginnerAllowed({ ownedByLearner: true, categorySlug: "development", subcategorySlug: null }), false);
    assert.throws(() => assertBeginnerAllowed({ ownedByLearner: true, categorySlug: "development", subcategorySlug: null }), (e: Error) => (e as BeginnerVariantRefused).why === "own_course");
  });
  test("the refusal says why in plain words", () => {
    assert.match(new BeginnerVariantRefused("clinical").message, /Clinical courses never get beginner lesson versions/);
  });
});

describe("the launch set", () => {
  test("lists the design's twelve courses, by catalog code, and nothing clinical", () => {
    assert.deepEqual(BEGINNER_LAUNCH_SET.map((c) => c.code).sort(), [
      "APLUS_CORE1", "APLUS_CORE2", "AWSCLF", "AZ900", "CAPM", "CMPCBS", "GCPCDL", "JAVASCRIPT", "NETWORKPLUS", "PYTHON", "SECPLUS", "TECHPLUS",
    ]);
    for (const c of BEGINNER_LAUNCH_SET) assert.doesNotMatch(c.code, /^(CCRN|CNA|EMR|EMT|NCLEX|NPTE|EPPP|NCE|NCMHCE|DPT|ABPTS)/, c.code);
  });
  test("no seed file switches a course on", () => {
    const root = join(__dirname, "..", "supabase", "seed");
    for (const f of ["data.ts", "seed-lib.ts", "seed.ts"]) {
      assert.doesNotMatch(readFileSync(join(root, f), "utf8"), /beginner_?[vV]ariants\s*:\s*true|beginner_variants\s*=\s*true/, f);
    }
  });
});

describe("a gone version", () => {
  test("is a 409 the learner can act on, never a 5xx", () => {
    const e = new LessonVersionUnavailableError();
    assert.equal(e.status, 409);
    assert.equal(e.extra?.code, "lesson_changed");
    assert.match(e.message, /Reload it/);
  });
});
