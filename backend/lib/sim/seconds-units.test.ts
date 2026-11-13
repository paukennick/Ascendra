// REQ-236 (FAIL-1361, docs/sims.md 22.7): a named value with a time unit other
// than seconds may not be read where the engine reads sim seconds
// (`schedule.after`, a console alert's or event's `at`, a seconds format).
// The NAT gateway draft's "1440 min" day became 24 minutes.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ALL_DOCUMENTS, documentEntry, loadDocument } from "./documents.ts";
import { checkDocument, isNonSecondTimeUnit, secondsUnitProblems } from "./lint.ts";
import type { ScenarioDoc } from "./engine/v1/types.ts";

const NAT = documentEntry("AWSSAA", "nat-gateway-bill-spike");
const natDoc = (): ScenarioDoc => structuredClone(loadDocument(NAT));

// The draft as it was: one day per step written as 1440 with unit min.
function natInMinutes(): ScenarioDoc {
  const doc = natDoc();
  doc.params.dayWait = { ...doc.params.dayWait, value: 1440, unit: "min" };
  return doc;
}

describe("time units where the engine reads seconds (FAIL-1361)", () => {
  test("which units count as a non-second time unit", () => {
    for (const u of ["min", "h", "d", "ms", "hours", " Min "]) assert.equal(isNonSecondTimeUnit(u), true, u);
    for (const u of ["s", "sec", "seconds", "mL/min", "mL/h", "/min", "$", "mL", "pts", undefined]) assert.equal(isNonSecondTimeUnit(u), false, String(u));
  });

  test("the NAT gateway draft's 1440 min day is an error on every schedule.after that reads it", () => {
    const problems = secondsUnitProblems(natInMinutes());
    assert.ok(problems.length >= 3, JSON.stringify(problems));
    for (const p of problems) {
      assert.equal(p.level, "error");
      assert.match(p.path, /\.after$/);
      assert.match(p.message, /"dayWait" has unit "min"/);
    }
  });

  test("the seeded document (86400 with unit s) passes", () => {
    assert.deepEqual(secondsUnitProblems(natDoc()), []);
  });

  test("a rate converted in the expression (mL/min, * 60) is not flagged", () => {
    const doc = loadDocument(documentEntry("CCRNADULT", "tamponade-after-cabg"));
    assert.equal(doc.params.fluidRate?.unit, "mL/min");
    assert.deepEqual(secondsUnitProblems(doc), []);
  });

  test("a template slot with a seconds format reading a minutes param is an error", () => {
    const doc = natDoc();
    doc.params.dayWait = { ...doc.params.dayWait, value: 1440, unit: "min" };
    // only the template reads it here
    const json = JSON.stringify(doc).split('"after":"dayWait"').join('"after":"86400"');
    const d2 = JSON.parse(json) as ScenarioDoc;
    d2.brief.situation = `${d2.brief.situation} Each step is {dayWait|duration}.`;
    const problems = secondsUnitProblems(d2);
    assert.equal(problems.length, 1, JSON.stringify(problems));
    assert.equal(problems[0].path, "brief.situation");
    assert.match(problems[0].message, /\|duration format/);
  });

  test("a console alert's at reading a minutes param is an error", () => {
    const doc = structuredClone(loadDocument(documentEntry("SECPLUS", "ransomware-file-server")));
    const alert = doc.screen.console!.alerts[0];
    doc.params.alertDelay = { value: 5, unit: "min", source: { cite: "test", checkedAt: "2026-11-11", note: "test" } };
    alert.at = "alertDelay";
    const problems = secondsUnitProblems(doc);
    assert.ok(problems.some((p) => p.path === "screen.console.alerts[0].at"), JSON.stringify(problems));
  });

  test("sims:lint (checkDocument) reports it", () => {
    const dir = mkdtempSync(join(tmpdir(), "sim-units-"));
    try {
      const file = join(dir, "nat-gateway-bill-spike.sim.json");
      writeFileSync(file, JSON.stringify(natInMinutes()));
      const golden = join(dir, "nat-gateway-bill-spike.golden.json");
      writeFileSync(golden, readFileSync(NAT.golden!, "utf8"));
      const r = checkDocument({ ...NAT, file, golden }, { full: true, now: "2026-11-11", searchNodes: 50 });
      assert.ok(r.problems.some((p) => p.level === "error" && /"dayWait" has unit "min"/.test(p.message)), JSON.stringify(r.problems.filter((p) => p.level === "error")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("no seeded document reads a non-second time unit as seconds", () => {
    for (const e of ALL_DOCUMENTS) assert.deepEqual(secondsUnitProblems(loadDocument(e)), [], `${e.course}/${e.slug}`);
  });
});
