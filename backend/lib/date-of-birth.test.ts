// REQ-259: the date of birth asked once at the first 18+ prompt, and the age
// the server computes from it -- in UTC date terms, whatever the server's or
// the learner's time zone.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ageOn, parseDateOfBirth, utcDay, EARLIEST_BIRTH_YEAR } from "./date-of-birth";

const at = (iso: string) => new Date(iso);

describe("ageOn", () => {
  test("turns the next age on the birthday, not the day before", () => {
    assert.equal(ageOn("2008-06-15", at("2026-06-14T12:00:00Z")), 17);
    assert.equal(ageOn("2008-06-15", at("2026-06-15T00:00:00Z")), 18);
    assert.equal(ageOn("2008-06-15", at("2026-06-15T23:59:59Z")), 18);
    assert.equal(ageOn("2008-06-15", at("2027-06-14T00:00:00Z")), 18);
  });
  test("an earlier month or a later month in the same year", () => {
    assert.equal(ageOn("2000-12-31", at("2026-01-01T00:00:00Z")), 25);
    assert.equal(ageOn("2000-01-01", at("2026-12-31T00:00:00Z")), 26);
  });
  test("born on 29 February: not yet on 28 February of a common year, 18 from 1 March", () => {
    assert.equal(ageOn("2008-02-29", at("2026-02-28T12:00:00Z")), 17);
    assert.equal(ageOn("2008-02-29", at("2026-03-01T00:00:00Z")), 18);
    // In a leap year the day itself counts.
    assert.equal(ageOn("2008-02-29", at("2028-02-28T23:59:59Z")), 19);
    assert.equal(ageOn("2008-02-29", at("2028-02-29T00:00:00Z")), 20);
  });
  test("is in UTC date terms: 18th birthday at 23:30 in Seattle is already the next UTC day", () => {
    // 2026-06-14 23:30 at UTC-7 is 2026-06-15 06:30 UTC: the birthday has come.
    assert.equal(ageOn("2008-06-15", at("2026-06-14T23:30:00-07:00")), 18);
    // 2026-06-15 01:00 at UTC+9 is 2026-06-14 16:00 UTC: not yet.
    assert.equal(ageOn("2008-06-15", at("2026-06-15T01:00:00+09:00")), 17);
  });
  test("the 16 and 18 lines the gate uses", () => {
    const now = at("2026-11-13T08:00:00Z");
    assert.equal(ageOn("2010-11-13", now), 16);
    assert.equal(ageOn("2010-11-14", now), 15);
    assert.equal(ageOn("2008-11-13", now), 18);
    assert.equal(ageOn("2008-11-14", now), 17);
  });
  test("refuses a malformed stored value", () => {
    assert.throws(() => ageOn("2008-6-15", at("2026-01-01T00:00:00Z")));
  });
});

describe("utcDay", () => {
  test("is the UTC calendar day", () => {
    assert.equal(utcDay(at("2026-11-13T23:59:59-08:00")), "2026-11-14");
  });
});

describe("parseDateOfBirth", () => {
  const now = at("2026-11-13T12:00:00Z");
  test("accepts a real past date", () => {
    assert.deepEqual(parseDateOfBirth("1990-01-15", now), { ok: true, iso: "1990-01-15" });
    assert.deepEqual(parseDateOfBirth("2008-02-29", now), { ok: true, iso: "2008-02-29" });
    assert.deepEqual(parseDateOfBirth(`${EARLIEST_BIRTH_YEAR}-01-01`, now), { ok: true, iso: "1900-01-01" });
    assert.deepEqual(parseDateOfBirth("2026-11-12", now), { ok: true, iso: "2026-11-12" });
  });
  test("missing", () => {
    for (const v of [undefined, null, ""]) assert.deepEqual(parseDateOfBirth(v, now), { ok: false, problem: "missing" });
  });
  test("not a string or not YYYY-MM-DD", () => {
    for (const v of [19900115, {}, [], true, "15/01/1990", "1990-1-5", "1990-01-15T00:00:00Z", " 1990-01-15", "1990-01-15 "]) {
      assert.deepEqual(parseDateOfBirth(v, now), { ok: false, problem: "format" }, JSON.stringify(v));
    }
  });
  test("a day that does not exist", () => {
    for (const v of ["2023-02-29", "1990-02-30", "1990-13-01", "1990-00-10", "1990-04-31", "1990-01-00"]) {
      assert.deepEqual(parseDateOfBirth(v, now), { ok: false, problem: "not_a_date" }, v);
    }
  });
  test("today and the future are refused, in UTC date terms", () => {
    assert.deepEqual(parseDateOfBirth("2026-11-13", now), { ok: false, problem: "future" });
    assert.deepEqual(parseDateOfBirth("2026-11-14", now), { ok: false, problem: "future" });
    assert.deepEqual(parseDateOfBirth("2999-01-01", now), { ok: false, problem: "future" });
    // 20:00 on 12 Nov in Seattle is already 13 Nov in UTC, so 13 Nov is today.
    assert.deepEqual(parseDateOfBirth("2026-11-13", at("2026-11-12T20:00:00-08:00")), { ok: false, problem: "future" });
    assert.equal(parseDateOfBirth("2026-11-12", at("2026-11-12T20:00:00-08:00")).ok, true);
  });
  test("before the earliest year", () => {
    assert.deepEqual(parseDateOfBirth("1899-12-31", now), { ok: false, problem: "too_early" });
    // Date.UTC reads years 0-99 as 1900-1999; they must not slip through as dates.
    assert.deepEqual(parseDateOfBirth("0001-01-01", now), { ok: false, problem: "too_early" });
    assert.deepEqual(parseDateOfBirth("0099-06-15", now), { ok: false, problem: "too_early" });
    assert.deepEqual(parseDateOfBirth("0000-00-00", now), { ok: false, problem: "too_early" });
  });
});
