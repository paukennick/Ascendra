// REQ-197: every exam change notice restates the seed. Each date is checked
// against the seed field it comes from, so moving a date in the seed fails
// here until the notice is updated too. No database.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";
import { EXAM_CHANGES, changesInWindow, examChangePeriodKey } from "./exam-changes";
import { copyProblems } from "./service-email-copy";

const track = (code: string) => {
  const t = CATALOG_TRACKS.find((x) => x.code === code);
  assert.ok(t, `no seed track ${code}`);
  return t!;
};
const day = (iso: string | undefined) => (iso ?? "").slice(0, 10);

describe("exam change notices match the seed", () => {
  test("AWSSAP: SAP-C03 from the day the C02 units retire", () => {
    const t = track("AWSSAP");
    const c = EXAM_CHANGES.find((x) => x.trackCode === "AWSSAP")!;
    assert.equal(t.credential?.effectiveDate, c.date);
    assert.equal(t.credential?.supersedes?.examCode, "SAP-C02");
    assert.ok(t.units.some((u) => day(u.retiredAt) === c.date));
    assert.equal(t.credential?.supersedes?.lastExamDate, "2026-11-16");
    assert.match(c.whatChanges, /November 16, 2026/);
  });

  test("AWSDVA: DVA-C03 from its effective date", () => {
    const t = track("AWSDVA");
    const c = EXAM_CHANGES.find((x) => x.trackCode === "AWSDVA")!;
    assert.equal(t.credential?.effectiveDate, c.date);
    assert.ok(t.units.some((u) => day(u.retiredAt) === c.date));
  });

  test("SECPLUS: V8 launch date and SY0-701's last English day come from the V8 track", () => {
    const v8 = track("SECPLUSV8");
    const c = EXAM_CHANGES.find((x) => x.trackCode === "SECPLUS")!;
    assert.equal(v8.credential?.effectiveDate, c.date);
    assert.equal(v8.credential?.supersedes?.examCode, "SY0-701");
    assert.equal(v8.credential?.supersedes?.lastExamDate, "2027-06-11");
    assert.match(c.whatChanges, /June 11, 2027/);
    assert.match(c.courseDid, new RegExp(v8.title.replace(/[()+]/g, "\\$&")));
  });

  test("CYSAPLUS: the date is CS0-003's last day, and V4 is already effective", () => {
    const t = track("CYSAPLUS");
    const c = EXAM_CHANGES.find((x) => x.trackCode === "CYSAPLUS")!;
    assert.equal(t.credential?.supersedes?.lastExamDate, c.date);
    assert.ok((t.credential?.effectiveDate ?? "9999") <= c.date);
  });

  test("GCPDEVOPS: the switch date is the course's review date (not rewritten yet, and the notice says so)", () => {
    const t = track("GCPDEVOPS");
    const c = EXAM_CHANGES.find((x) => x.trackCode === "GCPDEVOPS")!;
    assert.equal(day(t.contentReviewDueAt), c.date);
    assert.match(c.courseDid, /not been rewritten/);
    assert.equal(t.units.find((u) => !u.retiredAt)?.weight, 20, "the course still carries the old 20% section 1");
  });

  test("every notice has an https source, a unique period and plain copy", () => {
    const keys = new Set(EXAM_CHANGES.map(examChangePeriodKey));
    assert.equal(keys.size, EXAM_CHANGES.length);
    for (const c of EXAM_CHANGES) {
      assert.match(c.sourceUrl, /^https:\/\//);
      assert.deepEqual(copyProblems(`${c.exam} ${c.whatChanges} ${c.courseDid}`), [], c.trackCode);
    }
  });
});

describe("notice window", () => {
  test("30 days before to 7 days after", () => {
    const sap = EXAM_CHANGES.filter((c) => c.trackCode === "AWSSAP");
    assert.equal(changesInWindow("2026-10-17", sap).length, 0);
    assert.equal(changesInWindow("2026-10-18", sap).length, 1);
    assert.equal(changesInWindow("2026-11-24", sap).length, 1);
    assert.equal(changesInWindow("2026-11-25", sap).length, 0);
  });
});
