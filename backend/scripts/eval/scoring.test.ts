// Pure scoring, sampling, aggregation and report rendering for the evals.
// No model, database or key is involved.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LESSON_CRITERIA,
  LENGTH_LIMITS,
  aggregateGrading,
  aggregateLessons,
  allocateStrata,
  checkExplanationLength,
  choicesDistinct,
  compareLessonRuns,
  parseGradingCases,
  partMatches,
  scoreGradingCase,
  scoreLesson,
  sentenceCount,
  stratifiedSample,
  wordCount,
  type GradeOutput,
  type GradingCase,
  type GradingEvalRecord,
  type IndependentSolve,
  type LessonContentLike,
  type LessonEvalRecord,
  type LessonScore,
  type RubricJudgement,
} from "./scoring";
import { renderGradingSummary, renderLessonComparison, renderLessonSummary } from "./report";

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

const goodLesson = (over: Partial<LessonContentLike> = {}): LessonContentLike => ({
  guessPrompt: "What is X?",
  teach: words(200),
  fadeProblem: "Finish the example.",
  fadeChoices: ["alpha", "beta", "gamma", "delta"],
  fadeCorrectIndex: 1,
  fadeWhy: "Because beta follows from the rule.",
  soloCheck: "Solve this one.",
  soloChoices: ["one", "two", "three", "four"],
  soloCorrectIndex: 2,
  soloWhy: "Because three is the only one that fits.",
  ...over,
});

const item = (pass = true, note = "ok") => ({ pass, note });
const goodRubric = (over: Partial<RubricJudgement> = {}): RubricJudgement => ({
  termsDefined: { ...item(), namedTerms: ["x"], undefinedTerms: [] },
  oneWorkedExample: item(),
  misconceptionNamed: item(),
  inScope: item(),
  fadeChoicesPlausible: item(),
  soloChoicesPlausible: item(),
  ...over,
});
const agreeingSolve: IndependentSolve = { fadeReasoning: "r", fadeAnswerIndex: 1, soloReasoning: "r", soloAnswerIndex: 2 };

describe("text measures", () => {
  test("wordCount and sentenceCount", () => {
    assert.equal(wordCount("  one two   three "), 3);
    assert.equal(wordCount(""), 0);
    assert.equal(sentenceCount("It is so. It is also so! Really?"), 3);
    assert.equal(sentenceCount("A single sentence with e.g. an abbreviation."), 1);
    assert.equal(sentenceCount(""), 0);
  });
  test("choicesDistinct ignores case, spacing and trailing periods; needs exactly four", () => {
    assert.equal(choicesDistinct(["a", "b", "c", "d"]), true);
    assert.equal(choicesDistinct(["Alpha.", "alpha", "c", "d"]), false);
    assert.equal(choicesDistinct(["a", "b", "c"]), false);
  });
});

describe("explanation length", () => {
  test("accepts a normal lesson", () => {
    assert.equal(checkExplanationLength(goodLesson()).pass, true);
  });
  test("flags a too-short and a too-long teach, and long or multi-sentence why lines", () => {
    assert.match(checkExplanationLength(goodLesson({ teach: words(LENGTH_LIMITS.teachMinWords - 1) })).note, /min/);
    assert.match(checkExplanationLength(goodLesson({ teach: words(LENGTH_LIMITS.teachMaxWords + 1) })).note, /max/);
    assert.match(checkExplanationLength(goodLesson({ fadeWhy: words(LENGTH_LIMITS.whyMaxWords + 1) })).note, /fadeWhy is \d+ words/);
    assert.match(checkExplanationLength(goodLesson({ soloWhy: "One. Two. Three sentences." })).note, /soloWhy is 3 sentences/);
  });
});

describe("scoreLesson", () => {
  test("a clean lesson passes every criterion", () => {
    const s = scoreLesson(goodLesson(), goodRubric(), agreeingSolve);
    assert.equal(s.allPass, true);
    for (const c of LESSON_CRITERIA) assert.equal(s.criteria[c].pass, true, c);
  });

  test("a stored key that disagrees with the independent solve fails only that key", () => {
    const s = scoreLesson(goodLesson(), goodRubric(), { ...agreeingSolve, soloAnswerIndex: 0, soloReasoning: "four is wrong" });
    assert.equal(s.allPass, false);
    assert.equal(s.criteria.solo_key_correct.pass, false);
    assert.match(s.criteria.solo_key_correct.note, /stored index 2, independent solve chose 0/);
    assert.equal(s.criteria.fade_key_correct.pass, true);
  });

  test("undefined terms fail terms_defined even if the judge said pass, and are named", () => {
    const s = scoreLesson(
      goodLesson(),
      goodRubric({ termsDefined: { ...item(true), namedTerms: ["a", "b"], undefinedTerms: ["b"] } }),
      agreeingSolve
    );
    assert.equal(s.criteria.terms_defined.pass, false);
    assert.match(s.criteria.terms_defined.note, /not defined: b/);
  });

  test("duplicate choices fail choices_distinct_plausible even when the judge approved", () => {
    const s = scoreLesson(goodLesson({ fadeChoices: ["same", "Same.", "c", "d"] }), goodRubric(), agreeingSolve);
    assert.equal(s.criteria.choices_distinct_plausible.pass, false);
    assert.match(s.criteria.choices_distinct_plausible.note, /fadeChoices are not four distinct/);
  });

  test("an implausible solo choice set fails it, with the judge's note", () => {
    const s = scoreLesson(
      goodLesson(),
      goodRubric({ soloChoicesPlausible: item(false, "option 3 is silly filler") }),
      agreeingSolve
    );
    assert.equal(s.criteria.choices_distinct_plausible.pass, false);
    assert.match(s.criteria.choices_distinct_plausible.note, /silly filler/);
  });

  test("each judged criterion maps to its own rubric item", () => {
    for (const [key, crit] of [
      ["oneWorkedExample", "one_worked_example"],
      ["misconceptionNamed", "misconception_named"],
      ["inScope", "in_scope"],
    ] as const) {
      const s = scoreLesson(goodLesson(), goodRubric({ [key]: item(false, "bad") }), agreeingSolve);
      assert.deepEqual(LESSON_CRITERIA.filter((c) => !s.criteria[c].pass), [crit]);
    }
  });
});

describe("allocateStrata / stratifiedSample", () => {
  test("every stratum gets at least one when n allows, the rest in proportion", () => {
    assert.deepEqual(allocateStrata({ a: 100, b: 50, c: 10 }, 16), { a: 9, b: 5, c: 2 });
    const alloc = allocateStrata({ a: 1000, b: 1, c: 1 }, 10);
    assert.ok(alloc.b >= 1 && alloc.c >= 1);
    assert.equal(alloc.a + alloc.b + alloc.c, 10);
  });
  test("never exceeds a stratum's size, and caps at the total", () => {
    assert.deepEqual(allocateStrata({ a: 2, b: 3 }, 100), { a: 2, b: 3 });
    assert.deepEqual(allocateStrata({ a: 5 }, 0), { a: 0 });
    const alloc = allocateStrata({ a: 3, b: 3, c: 3 }, 2);
    assert.equal(Object.values(alloc).reduce((x, y) => x + y, 0), 2);
  });

  const items = Array.from({ length: 120 }, (_, i) => ({
    id: `id-${String(i).padStart(3, "0")}`,
    stratum: ["certification", "graduate", "skills", "professional"][i % 4 === 3 ? 3 : i % 3],
  }));

  test("is deterministic for the same data, n and seed, and independent of input order", () => {
    const a = stratifiedSample(items, 24, "seed-1");
    const b = stratifiedSample([...items].reverse(), 24, "seed-1");
    assert.deepEqual(a, b);
    assert.equal(a.length, 24);
    assert.equal(new Set(a.map((x) => x.id)).size, 24);
  });
  test("a different seed gives a different sample; every stratum is represented", () => {
    const a = stratifiedSample(items, 24, "seed-1");
    const c = stratifiedSample(items, 24, "seed-2");
    assert.notDeepEqual(a.map((x) => x.id), c.map((x) => x.id));
    assert.deepEqual(new Set(a.map((x) => x.stratum)), new Set(items.map((x) => x.stratum)));
  });
  test("asking for more than exists returns everything", () => {
    assert.equal(stratifiedSample(items.slice(0, 5), 50, "s").length, 5);
    assert.deepEqual(stratifiedSample([], 5, "s"), []);
  });
});

const rec = (id: string, type: string, failing: string[] = [], error?: string): LessonEvalRecord => {
  if (error) return { objectiveId: id, objective: `obj ${id}`, trackTitle: "T", trackType: type, error };
  const criteria = Object.fromEntries(
    LESSON_CRITERIA.map((c) => [c, { pass: !failing.includes(c), note: failing.includes(c) ? "bad" : "ok" }])
  ) as LessonScore["criteria"];
  return { objectiveId: id, objective: `obj ${id}`, trackTitle: "T", trackType: type, score: { criteria, allPass: failing.length === 0 } };
};

describe("aggregateLessons", () => {
  const records = [
    rec("1", "certification"),
    rec("2", "certification", ["terms_defined"]),
    rec("3", "skills", ["terms_defined", "in_scope"]),
    rec("4", "skills"),
    rec("5", "skills", [], "RateLimitError: 429"),
  ];
  const s = aggregateLessons(records);

  test("counts scored and errored separately; errors are not failures", () => {
    assert.equal(s.total, 5);
    assert.equal(s.scored, 4);
    assert.equal(s.errors, 1);
    assert.deepEqual(s.allPass, { pass: 2, total: 4, rate: 0.5 });
  });
  test("pass rate per criterion", () => {
    assert.deepEqual(s.passRates.terms_defined, { pass: 2, total: 4, rate: 0.5 });
    assert.deepEqual(s.passRates.in_scope, { pass: 3, total: 4, rate: 0.75 });
    assert.deepEqual(s.passRates.fade_key_correct, { pass: 4, total: 4, rate: 1 });
  });
  test("breakdown by track type", () => {
    assert.deepEqual(Object.keys(s.byTrackType), ["certification", "skills"]);
    assert.deepEqual(s.byTrackType.certification.allPass, { pass: 1, total: 2, rate: 0.5 });
    assert.deepEqual(s.byTrackType.skills.passRates.terms_defined, { pass: 1, total: 2, rate: 0.5 });
  });
  test("no records is all zeros, not NaN", () => {
    const e = aggregateLessons([]);
    assert.equal(e.allPass.rate, 0);
    assert.equal(e.passRates.terms_defined.rate, 0);
  });
});

describe("compareLessonRuns", () => {
  const base = [rec("1", "c"), rec("2", "c", ["in_scope"]), rec("3", "c")];
  const cand = [rec("1", "c", ["terms_defined"]), rec("2", "c"), rec("4", "c")];
  const cmp = compareLessonRuns(base, cand);

  test("reports rate deltas per criterion and overall, candidate minus baseline", () => {
    const inScope = cmp.criteria.find((c) => c.criterion === "in_scope")!;
    assert.ok(Math.abs(inScope.a - 2 / 3) < 1e-9);
    assert.equal(inScope.b, 1);
    assert.ok(Math.abs(inScope.delta - 1 / 3) < 1e-9);
    assert.ok(Math.abs(cmp.allPass.a - 2 / 3) < 1e-9);
    assert.ok(Math.abs(cmp.allPass.b - 2 / 3) < 1e-9);
  });
  test("lists per-objective flips in both directions, only for objectives in both runs", () => {
    assert.deepEqual(
      cmp.flipped.map((f) => `${f.objectiveId}:${f.criterion}:${f.from}->${f.to}`).sort(),
      ["1:terms_defined:true->false", "2:in_scope:false->true"]
    );
    assert.equal(cmp.commonObjectives, 2);
    assert.equal(cmp.onlyInA, 1);
    assert.equal(cmp.onlyInB, 1);
  });
  test("renders to markdown", () => {
    const md = renderLessonComparison(cmp, "baseline-dir");
    assert.match(md, /Compared with baseline-dir/);
    assert.match(md, /Flipped to failing \(1\)/);
    assert.match(md, /in_scope: 67% -> 100% \(\+33 pts\)/);
  });
});

describe("lesson summary markdown", () => {
  test("includes the headline, per-criterion rates, failures and errors", () => {
    const records = [rec("1", "certification"), rec("2", "certification", ["terms_defined"]), rec("3", "skills", [], "boom")];
    const md = renderLessonSummary(aggregateLessons(records), records, {
      kind: "lessons", startedAt: "t", seed: "s", models: { generation: "g", judge: "j" },
    });
    assert.match(md, /All criteria pass: 50% \(1\/2\)/);
    assert.match(md, /terms_defined: 50% \(1\/2\)/);
    assert.match(md, /## Failures/);
    assert.match(md, /obj 3: boom/);
  });
});

// --- grading ---------------------------------------------------------------

const gcase = (over: Partial<GradingCase> = {}): GradingCase => ({
  id: "c1", domain: "d1", tags: ["t1"], track: { trackTitle: "T" },
  question: "q", taughtText: "t", answer: "a", expectedVerdict: "partial", expectedMissedParts: ["the integrity definition"],
  ...over,
});
const out = (over: Partial<GradeOutput> = {}): GradeOutput => ({
  verdict: "partial", feedback: "f", classification: "incomplete", missedParts: ["Integrity was not defined"], ...over,
});

describe("partMatches", () => {
  test("matches when half the label's content words appear in one reported part, ignoring plurals and case", () => {
    assert.equal(partMatches("the integrity definition", ["Integrity was not defined"]), true);
    assert.equal(partMatches("(c) what the employee should have checked", ["Employee should check the sender"]), true);
    assert.equal(partMatches("the biceps reflex level (C5-C6)", ["Biceps reflex"]), true);
  });
  test("does not match an unrelated part, an empty list, or a label with no content words", () => {
    assert.equal(partMatches("the integrity definition", ["availability"]), false);
    assert.equal(partMatches("the integrity definition", []), false);
    assert.equal(partMatches("the and for", ["the and for"]), false);
  });
});

describe("scoreGradingCase", () => {
  test("verdict match, missed-part presence and recall", () => {
    assert.deepEqual(scoreGradingCase(gcase(), out()), {
      verdictMatch: true, missedPresenceMatch: true, missedRecall: 1, unexpectedMissedParts: 0,
    });
  });
  test("a wrong verdict, and an expected part the grader never named", () => {
    const s = scoreGradingCase(gcase(), out({ verdict: "correct", missedParts: [] }));
    assert.equal(s.verdictMatch, false);
    assert.equal(s.missedPresenceMatch, false);
    assert.equal(s.missedRecall, 0);
  });
  test("grader lists parts on a case that expected none -> over-flagging; recall is not applicable", () => {
    const s = scoreGradingCase(gcase({ expectedVerdict: "correct", expectedMissedParts: [] }), out({ verdict: "correct", missedParts: ["x", "y"] }));
    assert.equal(s.missedRecall, null);
    assert.equal(s.unexpectedMissedParts, 2);
    assert.equal(s.missedPresenceMatch, false);
  });
  test("a missing missedParts array counts as none", () => {
    const s = scoreGradingCase(gcase({ expectedVerdict: "incorrect", expectedMissedParts: [] }), out({ verdict: "incorrect", missedParts: undefined }));
    assert.equal(s.missedPresenceMatch, true);
  });
});

describe("aggregateGrading", () => {
  const mk = (c: GradingCase, o?: GradeOutput, error?: string): GradingEvalRecord =>
    o ? { case: c, output: o, score: scoreGradingCase(c, o) } : { case: c, error };
  const records = [
    mk(gcase({ id: "a", domain: "sec", tags: ["terse"], expectedVerdict: "correct", expectedMissedParts: [] }), out({ verdict: "correct", missedParts: [] })),
    mk(gcase({ id: "b", domain: "sec", tags: ["multi"] }), out({ verdict: "correct", missedParts: [] })), // too lenient
    mk(gcase({ id: "c", domain: "aws", tags: ["multi"] }), out()),
    mk(gcase({ id: "d", domain: "aws", tags: ["wrong"], expectedVerdict: "incorrect", expectedMissedParts: [] }), out({ verdict: "partial", missedParts: [] })), // too lenient
    mk(gcase({ id: "e", domain: "aws", tags: ["terse"], expectedVerdict: "correct", expectedMissedParts: [] }), out({ verdict: "partial", missedParts: ["extra"] })), // too harsh, over-flagged
    mk(gcase({ id: "f" }), undefined, "429"),
  ];
  const s = aggregateGrading(records);

  test("agreement excludes errored cases", () => {
    assert.equal(s.total, 6);
    assert.equal(s.scored, 5);
    assert.equal(s.errors, 1);
    assert.deepEqual(s.verdictAgreement, { pass: 2, total: 5, rate: 0.4 });
    assert.deepEqual(s.disagreements, ["b", "d", "e"]);
  });
  test("confusion matrix and lenient/harsh counts", () => {
    assert.equal(s.confusion.correct.correct, 1);
    assert.equal(s.confusion.partial.correct, 1);
    assert.equal(s.confusion.incorrect.partial, 1);
    assert.equal(s.confusion.correct.partial, 1);
    assert.equal(s.tooLenient, 2);
    assert.equal(s.tooHarsh, 1);
  });
  test("missed-parts metrics", () => {
    // presence matches: a (none/none) yes, b (some/none) no, c yes, d yes, e (none/some) no
    assert.deepEqual(s.missedPresenceAgreement, { pass: 3, total: 5, rate: 0.6 });
    assert.deepEqual(s.missedRecall, { mean: 0.5, cases: 2 }); // b: 0, c: 1
    assert.deepEqual(s.overFlagged, { pass: 1, total: 3, rate: 1 / 3 }); // cases expecting none: a, d, e
  });
  test("agreement by domain and tag", () => {
    assert.deepEqual(s.byDomain.sec, { pass: 1, total: 2, rate: 0.5 });
    assert.deepEqual(s.byDomain.aws, { pass: 1, total: 3, rate: 1 / 3 });
    assert.deepEqual(s.byTag.multi, { pass: 1, total: 2, rate: 0.5 });
  });
  test("renders to markdown with the draft-ground-truth warning", () => {
    const md = renderGradingSummary(s, { kind: "grading", startedAt: "t", models: { grader: "g" } });
    assert.match(md, /Verdict agreement: 40% \(2\/5\)/);
    assert.match(md, /not ground truth/);
    assert.match(md, /`b`, `d`, `e`/);
  });
  test("no records is zeros, not NaN", () => {
    const e = aggregateGrading([]);
    assert.equal(e.verdictAgreement.rate, 0);
    assert.equal(e.missedRecall.mean, 0);
  });
});

describe("grading-cases.json (the draft cases shipped with the harness)", () => {
  const raw = JSON.parse(readFileSync(join(__dirname, "grading-cases.json"), "utf8"));

  test("is marked as a draft at the very top of the file", () => {
    assert.equal(Object.keys(raw)[0], "_status");
    assert.match(raw._status, /^draft — written by Claude, needs the owner's review before it is treated as ground truth$/);
  });
  test("parses, with 40 ordinary cases plus the adversarial set, across the four domains", () => {
    const cases = parseGradingCases(raw);
    assert.equal(cases.filter((c) => !c.tags.includes("adversarial")).length, 40);
    assert.deepEqual([...new Set(cases.map((c) => c.domain))].sort(), ["aws-saa", "ccrn", "pt", "security-plus"]);
  });
  test("covers every verdict and the tricky shapes: skipped sub-part, terse-correct, confidently wrong", () => {
    const cases = parseGradingCases(raw);
    for (const v of ["correct", "partial", "incorrect"]) assert.ok(cases.some((c) => c.expectedVerdict === v), v);
    for (const tag of ["multi-part-skipped", "terse-correct", "confidently-wrong"]) {
      assert.ok(cases.filter((c) => c.tags.includes(tag)).length >= 5, tag);
    }
    // each domain has all three verdicts
    for (const d of ["aws-saa", "ccrn", "pt", "security-plus"]) {
      assert.equal(new Set(cases.filter((c) => c.domain === d).map((c) => c.expectedVerdict)).size, 3, d);
    }
  });
  // FAIL-184: the grader treats the learner answer as data. These cases have
  // not been run against the live model yet (no API key here).
  test("has at least 10 adversarial cases covering injection, fence breaks, restated, empty, irrelevant and other-language answers", () => {
    const adv = parseGradingCases(raw).filter((c) => c.tags.includes("adversarial"));
    assert.ok(adv.length >= 10, `${adv.length} adversarial cases`);
    for (const tag of ["prompt-injection", "fence-break", "restates-question", "empty-answer", "irrelevant", "other-language"]) {
      assert.ok(adv.some((c) => c.tags.includes(tag)), tag);
    }
    // An injection alone never earns credit; an otherwise-correct answer is graded on its content.
    for (const c of adv.filter((c) => c.tags.includes("fence-break") || c.tags.includes("restates-question"))) {
      assert.equal(c.expectedVerdict, "incorrect", c.id);
    }
    assert.ok(adv.some((c) => c.tags.includes("prompt-injection") && c.expectedVerdict === "correct"), "injection beside a correct answer");
  });
  test("every partial case names what was missed; every non-partial multi-part-free case names none", () => {
    for (const c of parseGradingCases(raw)) {
      if (c.expectedVerdict === "partial") assert.ok(c.expectedMissedParts.length > 0, c.id);
      if (c.expectedVerdict === "correct") assert.equal(c.expectedMissedParts.length, 0, c.id);
    }
  });
  test("rejects a duplicate id and a correct case that expects missed parts", () => {
    const one = raw.cases[0];
    assert.throws(() => parseGradingCases({ _status: "x", cases: [one, one] }), /Duplicate/);
    assert.throws(() => parseGradingCases({ _status: "x", cases: [{ ...one, expectedMissedParts: ["p"] }] }), /cannot expect missed parts/);
    assert.throws(() => parseGradingCases({ cases: [one] }));
  });
});
