// REQ-298: the bank report -- how many items a full form still needs, and what
// pre-generating them would cost. Pure; no database, no model.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { courseBankRow, formatBankReport } from "./mock-bank-report";
import type { UnitBank } from "./mock-form";

const unit = (id: string, weight: number, total: number): UnitBank => ({ unitId: id, title: id, weight, objectives: 4, total, fresh: total });

describe("courseBankRow", () => {
  test("an empty bank needs the whole form: 65 items is $2.28 at 3.5 cents", () => {
    const r = courseBankRow({ code: "AWSSAA", title: "SAA", requested: 65, confirmed: true, units: [unit("a", 30, 0), unit("b", 26, 0), unit("c", 24, 0), unit("d", 20, 0)] });
    assert.equal(r.missing, 65);
    assert.equal(r.costUsd, 2.28);
    assert.equal(r.have, 0);
  });
  test("a half-filled bank needs only what each domain lacks, never padded from another domain", () => {
    // 65 questions split 19/17/16/13; the bank holds 19, 5, 16 and 0
    const r = courseBankRow({ code: "X", title: "X", requested: 65, confirmed: true, units: [unit("a", 30, 19), unit("b", 26, 5), unit("c", 24, 16), unit("d", 20, 0)] });
    assert.equal(r.have, 19 + 5 + 16);
    assert.equal(r.missing, 12 + 13);
    assert.equal(r.costUsd, 0.88);
  });
  test("surplus in one domain does not count toward another", () => {
    const r = courseBankRow({ code: "X", title: "X", requested: 20, confirmed: false, units: [unit("a", 50, 100), unit("b", 50, 0)] });
    assert.equal(r.have, 10);
    assert.equal(r.missing, 10);
  });
  test("a full bank costs nothing", () => {
    const r = courseBankRow({ code: "X", title: "X", requested: 20, confirmed: true, units: [unit("a", 50, 10), unit("b", 50, 10)] });
    assert.equal(r.missing, 0);
    assert.equal(r.costUsd, 0);
  });
});

describe("formatBankReport", () => {
  const rows = [
    courseBankRow({ code: "AWSSAA", title: "SAA", requested: 65, confirmed: true, units: [unit("a", 100, 0)] }),
    courseBankRow({ code: "AZ104", title: "AZ", requested: 50, confirmed: false, units: [unit("a", 100, 0)] }),
  ];
  test("says it is a report, separates read lengths from approximate ones, and totals", () => {
    const t = formatBankReport(rows, "static");
    assert.match(t, /STATIC/);
    assert.match(t, /read from the exam's own site: 1; 65 items, about \$2\.28/);
    assert.match(t, /All 2 courses: 115 items, about \$4\.03, at 3\.5 cents an item \(a REPORT; nothing was generated\)/);
    assert.match(formatBankReport(rows, "live"), /LIVE/);
  });
});
