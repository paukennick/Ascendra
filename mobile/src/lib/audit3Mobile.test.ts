import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { homeReviewCard } from "./homeReview.ts";
import { plural, registerDictionary, t } from "./i18n.ts";
import { addMonths, longDate, monthGrid, monthTitle, parseIso, weekdayNames } from "./datePicker.ts";
import { ANSWER_DRAFT_MAX, answerDraftKey, answerDraftPayload, parseAnswerDraft } from "./drafts.ts";
import { localDataOwner, userLocalDataKeys } from "./localData.ts";
import { coverageRows } from "./coverageRows.ts";

// REQ-113 (Audit 3 mobile): the pure halves of H5, M3, L2 and L3.

describe("Home review card (H5, FAIL-255)", () => {
  test("driven by today's review, worded like the hub", () => {
    const c = homeReviewCard({ forToday: 4, unitChecks: [] });
    assert.equal(c?.line, "4 for today");
    assert.equal(c?.title, "Today's review");
  });
  test("a learner who rarely misses still sees the daily review (no error-log entries needed)", () => {
    assert.ok(homeReviewCard({ forToday: 1, unitChecks: [] }));
  });
  test("unit checks alone show the card; nothing due hides it", () => {
    const uc = { unitId: "u", unitTitle: "U", trackId: "t", trackTitle: "T", lastVerdict: null };
    assert.equal(homeReviewCard({ forToday: 0, unitChecks: [uc] })?.line, "1 unit check ready");
    assert.equal(homeReviewCard({ forToday: 2, unitChecks: [uc, uc] })?.line, "2 for today · 2 unit checks ready");
    assert.equal(homeReviewCard({ forToday: 0, unitChecks: [] }), null);
    assert.equal(homeReviewCard(null), null);
  });
});

describe("i18n groundwork (L2, FAIL-267)", () => {
  test("placeholders fill by name; unknown ones are left visible", () => {
    assert.equal(t("home.review.forToday", { count: 3 }), "3 for today");
    assert.equal(t("exam.timeLeft", {}), "Time left {clock}");
  });
  test("plurals follow the locale's rules, and a missing translation falls back to English", () => {
    assert.match(plural("exam.unsaved", 1, { list: "2" }), /question 2 isn't/);
    assert.match(plural("exam.unsaved", 3, { list: "1, 2, 3" }), /questions 1, 2, 3 aren't/);
    registerDictionary("xx", { "home.review.forToday": "{count} pour aujourd'hui" });
    assert.equal(t("home.review.forToday", { count: 2 }, "xx-YY"), "2 pour aujourd'hui");
    assert.equal(t("menu.review", {}, "xx"), "Review");
  });
});

describe("date picker (L2)", () => {
  test("ISO dates are validated, not just pattern-matched", () => {
    assert.deepEqual(parseIso("2026-12-31"), { y: 2026, m0: 11, d: 31 });
    assert.equal(parseIso("2026-02-30"), null);
    assert.equal(parseIso("12/31/2026"), null);
  });
  test("a month grid is whole weeks, padded, with days before `min` disabled", () => {
    const weeks = monthGrid(2026, 10, { min: "2026-11-07" }); // November 2026 starts on a Sunday
    assert.ok(weeks.every((w) => w.length === 7));
    assert.equal(weeks[0][0].iso, "2026-11-01");
    const all = weeks.flat();
    assert.equal(all.filter((c) => c.inMonth).length, 30);
    assert.equal(all.find((c) => c.iso === "2026-11-06")!.disabled, true);
    assert.equal(all.find((c) => c.iso === "2026-11-07")!.disabled, false);
    const monday = monthGrid(2026, 10, { weekStartsOn: 1 });
    assert.equal(monday[0][0].iso, "2026-10-26", "padded from the previous month");
  });
  test("months roll over years", () => {
    assert.deepEqual(addMonths(2026, 11, 1), { y: 2027, m0: 0 });
    assert.deepEqual(addMonths(2026, 0, -1), { y: 2025, m0: 11 });
  });
  test("names come from the locale, not English in code", () => {
    assert.match(monthTitle(2026, 10, "en-US"), /November 2026/);
    assert.match(monthTitle(2026, 10, "fr-FR"), /novembre 2026/);
    assert.match(longDate("2026-11-07", "en-US"), /Saturday, November 7, 2026/);
    assert.equal(weekdayNames(0, "en-US")[0], "Sun");
    assert.equal(weekdayNames(1, "en-US")[0], "Mon");
  });
});

describe("typed answers kept on the device (M3, FAIL-257)", () => {
  test("keys are per user and per question, and the logout sweep removes them", () => {
    const keys = [
      answerDraftKey("review", "u1", "sess-3"),
      answerDraftKey("unitcheck", "u1", "chk"),
      answerDraftKey("explain", "u1", "obj"),
      answerDraftKey("explain", "u2", "obj"),
    ];
    for (const k of keys.slice(0, 3)) assert.equal(localDataOwner(k), "u1");
    assert.deepEqual(userLocalDataKeys(keys, "u1"), keys.slice(0, 3));
    assert.equal(localDataOwner(answerDraftKey("review", "u1", "a.b.c")), "u1", "a dotted id can't move the user segment");
  });
  test("the text and the id it was sent with round-trip; junk is refused", () => {
    const p = answerDraftPayload({ text: "my answer", sentId: "id-1", sentText: "my answer" })!;
    assert.deepEqual(parseAnswerDraft(p), { text: "my answer", sentId: "id-1", sentText: "my answer" });
    assert.equal(answerDraftPayload({ text: "  ", sentId: null, sentText: null }), null, "nothing worth keeping clears it");
    assert.equal(parseAnswerDraft("{oops"), null);
    assert.equal(parseAnswerDraft(JSON.stringify({ text: 5 })), null);
    assert.equal(parseAnswerDraft(JSON.stringify({ text: "x".repeat(ANSWER_DRAFT_MAX + 10), sentId: null }))!.text.length, ANSWER_DRAFT_MAX);
  });
});

describe("coverage rows (L3)", () => {
  test("headings once per course and unit, one row per objective, in order", () => {
    const o = (id: string, track: string, unit: string, covered: boolean[]) => ({
      objectiveId: id,
      title: id,
      trackTitle: track,
      unitTitle: unit,
      terms: covered.map((c, i) => ({ term: `t${i}`, covered: c })),
    });
    const rows = coverageRows([o("a", "T1", "U1", [true, false]), o("b", "T1", "U1", []), o("c", "T1", "U2", [true]), o("d", "T2", "U1", [])] as never);
    assert.deepEqual(
      rows.map((r) => (r.kind === "objective" ? `o:${r.objective.objectiveId}:${r.percent}` : `${r.kind}:${r.title}`)),
      ["track:T1", "unit:U1", "o:a:50", "o:b:0", "unit:U2", "o:c:100", "track:T2", "unit:U1", "o:d:0"]
    );
    assert.equal(new Set(rows.map((r) => r.key)).size, rows.length, "keys are unique");
  });
});
