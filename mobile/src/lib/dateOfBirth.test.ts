// REQ-259: the date of birth boxes of the 18+ notice -- the same rules the
// server applies (backend/lib/date-of-birth.ts), in UTC date terms.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { digitsOnly, dobFromParts, EARLIEST_BIRTH_YEAR } from "./dateOfBirth.ts";

const now = new Date("2026-11-13T12:00:00Z");
const parts = (day: string, month: string, year: string) => ({ day, month, year });

describe("dobFromParts", () => {
  test("builds an ISO date from day, month and year, padding short ones", () => {
    assert.deepEqual(dobFromParts(parts("5", "1", "1990"), now), { ok: true, iso: "1990-01-05" });
    assert.deepEqual(dobFromParts(parts("15", "11", "2000"), now), { ok: true, iso: "2000-11-15" });
    assert.deepEqual(dobFromParts(parts("29", "2", "2008"), now), { ok: true, iso: "2008-02-29" });
    assert.deepEqual(dobFromParts(parts(" 5 ", "01", "1990"), now), { ok: true, iso: "1990-01-05" });
  });
  test("nothing entered is 'missing'; a part left out or a short year is 'incomplete'", () => {
    assert.equal((dobFromParts(parts("", "", ""), now) as { problem: string }).problem, "missing");
    for (const p of [parts("", "1", "1990"), parts("5", "", "1990"), parts("5", "1", ""), parts("5", "1", "90"), parts("5", "1", "199"), parts("123", "1", "1990"), parts("a", "1", "1990")]) {
      const r = dobFromParts(p, now);
      assert.equal(r.ok, false);
      assert.equal((r as { problem: string }).problem, "incomplete", JSON.stringify(p));
    }
  });
  test("a day that does not exist", () => {
    for (const p of [parts("30", "2", "1990"), parts("29", "2", "2023"), parts("31", "4", "1990"), parts("0", "1", "1990"), parts("1", "13", "1990"), parts("1", "0", "1990")]) {
      assert.equal((dobFromParts(p, now) as { problem: string }).problem, "not_a_date", JSON.stringify(p));
    }
  });
  test("today and the future are refused, by the UTC day", () => {
    assert.equal((dobFromParts(parts("13", "11", "2026"), now) as { problem: string }).problem, "future");
    assert.equal((dobFromParts(parts("1", "1", "2999"), now) as { problem: string }).problem, "future");
    assert.equal(dobFromParts(parts("12", "11", "2026"), now).ok, true);
    // 20:00 on 12 Nov in Seattle is 13 Nov in UTC.
    assert.equal(dobFromParts(parts("13", "11", "2026"), new Date("2026-11-12T20:00:00-08:00")).ok, false);
  });
  test("before the earliest year", () => {
    assert.equal((dobFromParts(parts("31", "12", "1899"), now) as { problem: string }).problem, "too_early");
    assert.equal(dobFromParts(parts("1", "1", "1900"), now).ok, true);
  });
  test("every refusal has a plain sentence", () => {
    const r = dobFromParts(parts("30", "2", "1990"), now);
    assert.equal(r.ok, false);
    assert.match((r as { message: string }).message, /doesn't exist/);
  });
  test("the earliest year is the server's", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const server = readFileSync(join(here, "..", "..", "..", "backend", "lib", "date-of-birth.ts"), "utf8");
    assert.equal(server.match(/EARLIEST_BIRTH_YEAR = (\d+)/)?.[1], String(EARLIEST_BIRTH_YEAR));
  });
});

test("digitsOnly keeps digits and caps the length as the learner types", () => {
  assert.equal(digitsOnly("1a2b3", 2), "12");
  assert.equal(digitsOnly("19 90", 4), "1990");
  assert.equal(digitsOnly("abc", 4), "");
});
