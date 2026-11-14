// REQ-298: the per-course official exam facts. Pure data test -- it reads the
// seed modules, no database, no network (the facts were read from the sources
// they name; this checks their shape, their agreement with the seed, and what
// the app tells a learner about the pass score).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";
import { EXAM_FORMATS, examQuestionCount } from "./exam-formats";
import { allocateByWeight } from "./exam-plan";
import { profileFrom } from "./exam-sessions";
import {
  MOCK_EXAM_FACTS,
  PRACTICE_ONLY,
  mockExamFactsFor,
  mockFormNote,
  passLine,
  passPolicyText,
  practiceOnlyFor,
  staleFacts,
} from "./mock-exam-facts";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const track = (code: string) => CATALOG_TRACKS.find((t) => t.code === code);
const blueprintOf = (code: string) => {
  const c = track(code)?.credential;
  return c ? { examCode: c.examCode ?? null, credentialName: c.credentialName, durationMinutes: c.durationMinutes ?? null, questionFormat: c.questionFormat ?? null } : null;
};

describe("every entry names what it was read from", () => {
  test("codes are catalog courses and appear once", () => {
    const codes = MOCK_EXAM_FACTS.map((f) => f.code);
    assert.equal(new Set(codes).size, codes.length);
    for (const c of codes) assert.ok(track(c), `${c} is not a catalog course`);
  });
  test("each has an https source with the day it was read, and a later review date", () => {
    for (const f of MOCK_EXAM_FACTS) {
      assert.ok(f.sources.length > 0, `${f.code} has no source`);
      for (const s of f.sources) {
        assert.ok(s.url.startsWith("https://"), `${f.code}: ${s.url}`);
        assert.match(s.readAt, DATE, f.code);
        assert.ok(["page", "pdf", "summary"].includes(s.via));
        assert.ok(s.title.length > 10);
      }
      assert.match(f.reviewDue, DATE);
      assert.ok(f.reviewDue > f.sources[0].readAt, `${f.code}: review date must be after the read date`);
      const months = (Date.parse(f.reviewDue) - Date.parse(f.sources[0].readAt)) / (86400_000 * 30);
      assert.ok(months <= 13, `${f.code}: a review more than a year out is not a review`);
    }
  });
  test("numbers are sane, and a count that is only part of the exam is not the exam's length", () => {
    for (const f of MOCK_EXAM_FACTS) {
      assert.ok(Number.isInteger(f.questions) && f.questions >= 5 && f.questions <= 400, f.code);
      if (f.scored != null) assert.ok(f.scored > 0 && f.scored <= f.questions, `${f.code}: scored`);
      if (f.minutes != null) assert.ok(f.minutes >= 20 && f.minutes <= 480, `${f.code}: minutes`);
      if (f.pass.kind === "scaled") {
        assert.ok(f.pass.scaleMin < f.pass.passing && f.pass.passing < f.pass.scaleMax, `${f.code}: passing score inside the scale`);
      }
      for (const fmt of f.formats ?? []) assert.ok((EXAM_FORMATS as readonly string[]).includes(fmt), `${f.code}: ${fmt}`);
      if (f.formats) assert.ok(f.formats.length > 0);
    }
  });
  test("a time the body did not publish says how it was derived", () => {
    for (const f of MOCK_EXAM_FACTS) if (f.minutes != null && f.minutesNote) assert.ok(f.minutesNote.length > 40, f.code);
  });
});

describe("agreement with the seeded credential block", () => {
  test("duration and question count match the seed, or the entry says why it differs", () => {
    const off: string[] = [];
    for (const f of MOCK_EXAM_FACTS) {
      const c = track(f.code)!.credential!;
      const seedMinutes = c.durationMinutes ?? null;
      const seedCount = examQuestionCount(c.questionFormat);
      const same = seedMinutes === f.minutes && (seedCount === f.questions || seedCount === null);
      if (!same && !f.seedDiffers) off.push(`${f.code}: seed ${seedMinutes} min / ${seedCount} q, entry ${f.minutes} min / ${f.questions} q`);
      if (f.examCode && c.examCode && c.examCode !== f.examCode) off.push(`${f.code}: exam code ${c.examCode} vs ${f.examCode}`);
    }
    assert.deepEqual(off, []);
  });
  test("an entry's domain allocation over its question count adds up, using the seed's weights", () => {
    for (const f of MOCK_EXAM_FACTS) {
      const units = track(f.code)!.units.filter((u) => !u.retiredAt);
      const a = allocateByWeight(units.map((u, i) => ({ unitId: `u${i}`, weight: u.weight ?? null, objectives: u.objectives.length })), f.questions);
      assert.equal([...a.values()].reduce((s, x) => s + x, 0), f.questions, f.code);
    }
  });
});

describe("courses with no single exam", () => {
  test("they have no entry, say why, and keep the stated default length", () => {
    for (const p of PRACTICE_ONLY) {
      assert.ok(track(p.code), p.code);
      assert.equal(mockExamFactsFor(p.code), null, `${p.code} is practice-only and has facts`);
      assert.ok(p.reason.length > 30);
      const prof = profileFrom({ code: p.code, blueprint: blueprintOf(p.code), weightsAreBlueprint: p.code !== "CNA" });
      assert.equal(prof.questionCount, null);
      assert.equal(prof.durationMinutes, null);
      assert.equal(prof.mockQuestions, 50);
      assert.equal(prof.mock.practiceOnly, p.reason);
      assert.match(prof.mock.note, /mixed practice test, not a copy of an exam/);
    }
  });
  test("CNA's weights are our emphasis, never presented as the exam's", () => {
    const prof = profileFrom({ code: "CNA", blueprint: blueprintOf("CNA"), weightsAreBlueprint: false });
    assert.equal(prof.mock.weights, "study_emphasis");
  });
});

describe("the mock takes the exam's length from the entry", () => {
  test("SAA-C03: 65 questions, 130 minutes, multiple choice and multiple response only", () => {
    const p = profileFrom({ code: "AWSSAA", blueprint: blueprintOf("AWSSAA"), weightsAreBlueprint: true });
    assert.equal(p.mockQuestions, 65);
    assert.equal(p.durationMinutes, 130);
    assert.equal(p.secondsPerQuestion, 120);
    assert.deepEqual(p.formats, ["multiple_choice", "multiple_response"]);
    assert.equal(p.mock.confirmed, true);
    assert.equal(p.mock.scored, 50);
    assert.match(p.mock.note, /AWS's exam has 65 questions \(50 count toward the real score; in a mock every question counts\) in 130 minutes\./);
  });
  test("DVA-C03: the seed text lists ordering and matching, the exam guide does not, so the mock does not offer them", () => {
    const p = profileFrom({ code: "AWSDVA", blueprint: blueprintOf("AWSDVA"), weightsAreBlueprint: true });
    assert.deepEqual(p.formats, ["multiple_choice", "multiple_response"]);
  });
  test("MLA-C02: the 65-question form with the beta's pace, and it says so", () => {
    const p = profileFrom({ code: "AWSMLA", blueprint: blueprintOf("AWSMLA"), weightsAreBlueprint: true });
    assert.equal(p.mockQuestions, 65);
    assert.equal(p.durationMinutes, 130);
    assert.match(p.mock.minutesNote ?? "", /beta/);
  });
  test("Security+ SY0-701: up to 90 questions in 90 minutes, and the simulations it cannot show are named", () => {
    const p = profileFrom({ code: "SECPLUS", blueprint: blueprintOf("SECPLUS"), weightsAreBlueprint: true });
    assert.equal(p.mockQuestions, 90);
    assert.equal(p.durationMinutes, 90);
    assert.equal(p.mock.questionsAreMaximum, true);
    assert.match(p.mock.notReproduced ?? "", /performance-based/);
    assert.match(p.mock.note, /up to 90 questions/);
  });
  test("CCRN Adult: 150 items in 3 hours, 125 scored", () => {
    const p = profileFrom({ code: "CCRNADULT", blueprint: blueprintOf("CCRNADULT"), weightsAreBlueprint: true });
    assert.equal(p.mockQuestions, 150);
    assert.equal(p.durationMinutes, 180);
    assert.equal(p.mock.scored, 125);
  });
  test("a course with no entry falls back to the seed text and says the length is approximate", () => {
    const p = profileFrom({ code: "AZ104", blueprint: blueprintOf("AZ104"), weightsAreBlueprint: true });
    assert.equal(p.mock.confirmed, false);
    assert.match(p.mock.note, /haven't confirmed this exam's exact length/);
    assert.equal(p.mockQuestions, 50);
  });
  test("FAIL-2020: NSCA-CSCS is not read as a 40-question exam", () => {
    const p = profileFrom({ code: "NSCACSCS", blueprint: blueprintOf("NSCACSCS"), weightsAreBlueprint: true });
    assert.notEqual(p.questionCount, 40);
  });
  test("a learner's own course never takes a catalog course's entry (no code is passed for it)", () => {
    const p = profileFrom({ code: null, blueprint: null, weightsAreBlueprint: true });
    assert.equal(p.mock.confirmed, false);
    assert.equal(p.mockQuestions, 50);
  });
});

describe("the pass score is reported honestly", () => {
  test("a scaled exam quotes the body's passing score and never converts the percentage", () => {
    const saa = mockExamFactsFor("AWSSAA");
    const line = passLine(saa, { correct: 40, total: 50 });
    assert.match(line, /40 of 50 fully right \(80%\)/);
    assert.match(line, /scaled score from 100 to 1000, and the passing score is 720/);
    assert.match(line, /never turn it into a scaled score or say whether you would pass/);
    assert.doesNotMatch(line, /\b820\b|you passed|you failed|likely to pass|on track to pass/i);
  });
  test("pass-or-fail-only and cut-unpublished exams say there is nothing to compare with", () => {
    assert.match(passPolicyText(mockExamFactsFor("SECURITYX")), /reports pass or fail only/);
    assert.match(passPolicyText(mockExamFactsFor("CCRNADULT")), /does not publish as a number/);
  });
  test("with no entry, no scale is claimed at all", () => {
    const t = passPolicyText(null);
    assert.doesNotMatch(t, /\d{3}/);
    assert.match(passLine(null, { correct: 0, total: 0 }), /0 of 0 fully right \(0%\)/);
  });
  test("every scaled entry's text carries its own scale and passing score", () => {
    for (const f of MOCK_EXAM_FACTS) {
      const t = passPolicyText(f);
      if (f.pass.kind === "scaled") {
        assert.ok(t.includes(String(f.pass.passing)) && t.includes(String(f.pass.scaleMax)), f.code);
      }
      assert.doesNotMatch(t, /predict/i, f.code);
    }
  });
  test("lookups tolerate no code", () => {
    assert.equal(mockExamFactsFor(null), null);
    assert.equal(practiceOnlyFor(undefined), null);
    assert.match(mockFormNote(null, null), /approximate/);
  });
});

describe("staleness is reported, not a build failure", () => {
  test("an entry is stale once its review date has passed", () => {
    assert.equal(staleFacts("2026-11-14").length, 0);
    assert.equal(staleFacts("2030-01-01").length, MOCK_EXAM_FACTS.length);
  });
});
