// REQ-312: the data and code console's pure parts against the seeded data
// console documents: the view model (flags, charts placed on their axis with
// reference lines, tables with flagged rows and choice-only editable cells,
// the code viewer numbered by the lines shown, results newest first), what
// the screen reader hears (error flags as alarms, the rest politely),
// "Read the console", the edit command (only the cell's own options), the
// capabilities the app advertises, and the golden paths replayed through
// the app's engine copy.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyCommand, createRun, readValue, stateHash, waits } from "./engine/v1/engine.ts";
import { replayGoldenPath } from "./engine/v1/validate.ts";
import type { Command, ScenarioDoc } from "./engine/v1/types.ts";
import type { Run } from "./engine/v1/engine.ts";
import { actionViews, runView } from "./runtime/view.ts";
import { dataAlarmTexts, dataNews, dataSentence, dataView, editCommand, numberText } from "./runtime/dataView.ts";
import { SIM_RENDERERS, simCaps } from "./runtime/caps.ts";

const here = dirname(fileURLToPath(import.meta.url));
const seed = join(here, "..", "..", "..", "backend", "supabase", "seed", "sims");
const CASES: [string, string][] = [
  ["PYTHON", "py-report-too-slow-profile"],
  ["PL300", "pl300-rls-region-manager"],
  ["PL300", "pl300-stock-on-hand-summed"],
  ["CSSGB", "cssgb-fill-weight-chart"],
  ["CSSGB", "cssgb-capability-tool-wear"],
  ["PYTHON", "py-import-crash-traceback"],
  ["JAVASCRIPT", "js-rate-board-zero-percent"],
  ["JAVASCRIPT", "js-checkout-shipping-concatenated"],
  ["SQL", "sql-not-in-null-empty-list"],
];
const course = (slug: string) => CASES.find((c) => c[1] === slug)![0];
const doc = (slug: string): ScenarioDoc => JSON.parse(readFileSync(join(seed, course(slug), `${slug}.sim.json`), "utf8")) as ScenarioDoc;
const golden = (slug: string) => JSON.parse(readFileSync(join(seed, course(slug), `${slug}.golden.json`), "utf8"));

function play(slug: string, steps: (string | [string, Record<string, string>])[], run: Run = createRun(doc(slug), 1)): Run {
  let seq = run.lastSeq;
  const send = (c: Record<string, unknown>) => assert.ok(applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command).ok, JSON.stringify(c));
  for (const s of steps) {
    const [action, params] = typeof s === "string" ? [s, undefined] : s;
    send({ type: "act", action, ...(params ? { params } : {}) });
    while (readValue(run, "busy") === true && run.state.phase === "work") {
      const w = waits(run)[0];
      send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
    }
  }
  return run;
}

describe("data console view model", () => {
  test("at the start: a workspace, something to read, every element labeled", () => {
    for (const [, slug] of CASES) {
      const run = createRun(doc(slug), 1);
      const v = dataView(run, actionViews(run))!;
      assert.ok(v, slug);
      assert.ok(v.workspace.length > 0);
      assert.ok(v.charts.length + v.tables.length + v.code.length > 0);
      for (const c of v.charts) {
        assert.ok(c.points.every((p) => p.pos >= 0 && p.pos <= 1 && p.a11y.startsWith(p.label)), slug);
        assert.ok(c.summary.startsWith(c.spokenLabel), slug);
      }
      for (const t of v.tables) for (const r of t.rows) assert.equal(r.cells.length, t.columns.length, `${slug}.${t.id}.${r.id}`);
      for (const f of v.code) assert.deepEqual(f.lines.map((l) => l.n), f.lines.map((_, i) => i + 1), slug);
      assert.equal(runView(run).data?.workspace, v.workspace);
    }
  });

  test("the PYTHON case: the chart flags slow nights, the profile table appears, a fix changes the code lines", () => {
    const slug = "py-report-too-slow-profile";
    let run = createRun(doc(slug), 1);
    let v = dataView(run)!;
    const chart = v.charts[0];
    assert.equal(chart.lines[0].value, 80);
    assert.ok(chart.points.find((p) => p.id === "sun")!.flagged);
    assert.ok(!chart.points.find((p) => p.id === "mon")!.flagged);
    assert.equal(chart.points.find((p) => p.id === "now")!.value, 95);
    assert.ok(!v.tables.some((t) => t.id === "prof"), "no profile before profiling");
    const before = v.code[0].lines.length;
    run = play(slug, ["profileStep"]);
    v = dataView(run)!;
    const prof = v.tables.find((t) => t.id === "prof")!;
    assert.equal(prof.flaggedCount, 1);
    assert.ok(v.code[0].lines.some((l) => l.mark === "focus"), "the profile points at the membership test");
    assert.equal(v.results[0].text?.includes("cProfile"), true, "results newest first");
    run = play(slug, ["fixSet"], run);
    v = dataView(run)!;
    const changed = v.code[0].lines.filter((l) => l.mark === "changed");
    assert.equal(changed.length, 1);
    assert.match(changed[0].text, /blocked = \{/);
    assert.equal(v.code[0].lines.length, before, "one line swapped for another");
    assert.equal(v.charts[0].points.find((p) => p.id === "now")!.value, 2);
  });

  test("the PL300 case: editable cells carry their action and options; an edit is the cell's own action", () => {
    const slug = "pl300-rls-region-manager";
    const run = createRun(doc(slug), 1);
    let v = dataView(run, actionViews(run))!;
    const access = v.tables.find((t) => t.id === "access")!;
    const mgr = access.rows.find((r) => r.id === "mgr")!;
    assert.ok(mgr.flagged, "a Member is flagged");
    const cell = mgr.cells[1];
    assert.ok(cell.editable && cell.editable.available);
    assert.equal(cell.editable!.action, "setGroupRole");
    assert.deepEqual(cell.editable!.options.map((o) => o.value), ["admin", "member", "contributor", "viewer", "removed"]);
    assert.match(cell.a11y, /editable/);
    assert.equal(access.rows.find((r) => r.id === "you")!.cells[1].editable, null);
    assert.equal(editCommand(cell, "superuser"), null, "only the cell's own options");
    const cmd = editCommand(cell, "viewer")!;
    assert.deepEqual(cmd, { type: "act", action: "setGroupRole", params: { role: "viewer" } });
    assert.ok(applyCommand(run, { ...cmd, seq: 1, tick: run.state.tick } as Command).ok);
    v = dataView(run, actionViews(run))!;
    const after = v.tables.find((t) => t.id === "access")!.rows.find((r) => r.id === "mgr")!;
    assert.equal(after.cells[1].text, "viewer");
    assert.equal(after.flagged, false);
    assert.equal(after.cells[1].editable!.available, false, "busy while the change applies");
    assert.equal(editCommand(after.cells[1], "member"), null, "an unavailable cell sends nothing");
  });

  test("the chart reads back what the model would show", () => {
    const slug = "pl300-rls-region-manager";
    let run = createRun(doc(slug), 1);
    assert.equal(dataView(run)!.charts[0].flaggedCount, 3);
    run = play(slug, [["setGroupRole", { role: "viewer" }], ["mapRole", { who: "sg" }]]);
    const c = dataView(run)!.charts[0];
    assert.equal(c.flaggedCount, 0);
    assert.deepEqual(c.points.map((p) => p.value), [312, 0, 0, 0]);
    assert.match(c.summary, /none flagged/);
  });

  test("the CSSGB case: picking the chart in its cell swaps an attribute chart for X-bar and R with limits", () => {
    const slug = "cssgb-fill-weight-chart";
    let run = createRun(doc(slug), 1);
    let v = dataView(run, actionViews(run))!;
    assert.deepEqual(v.charts.map((c) => c.id), ["p"]);
    assert.equal(v.charts[0].flaggedCount, 0, "the p chart shows nothing");
    run = play(slug, [["setChart", { kind: "xbar" }], "rules"]);
    v = dataView(run, actionViews(run))!;
    assert.deepEqual(v.charts.map((c) => c.id), ["xbar", "r"]);
    const x = v.charts[0];
    assert.equal(x.kind, "control");
    assert.deepEqual(x.lines.map((l) => [l.label, l.value]), [["UCL", 503.8], ["CL", 502], ["LCL", 500.2]]);
    assert.equal(x.flaggedCount, 8, "the run of 8 below the center line");
    assert.ok(x.lines[1].pos > 0.4 && x.lines[1].pos < 0.6);
    assert.match(x.summary, /X-bar chart of mean fill, control chart, 20 points/);
    assert.equal(v.tables.find((t) => t.id === "setup")!.flaggedCount, 0);
    run = play(slug, ["wait", "wait"], run);
    v = dataView(run)!;
    assert.equal(v.charts[0].points.length, 22, "new subgroups appear over time");
    assert.ok(dataAlarmTexts(v).some((a) => a.includes("below the lower control limit")));
  });

  test("numbers read naturally", () => {
    assert.equal(numberText(12.5), "12.5");
    assert.equal(numberText(1840), "1840");
    assert.equal(numberText(0.03125), "0.0313");
    assert.equal(numberText(3), "3");
  });
});

describe("what the screen reader hears", () => {
  test("an error flag is an alarm; a new warning and new results are polite news", () => {
    const slug = "pl300-rls-region-manager";
    const a = createRun(doc(slug), 1);
    const v0 = dataView(a)!;
    assert.deepEqual(dataAlarmTexts(v0), []);
    const b = play(slug, ["dropMargin"]);
    const v1 = dataView(b)!;
    assert.equal(dataAlarmTexts(v1).length, 1);
    assert.match(dataAlarmTexts(v1)[0], /^Finance: /);
    const news = dataNews(v0, v1);
    assert.ok(news.some((n) => n.startsWith("New result.")), news.join(" | "));
    assert.ok(!news.some((n) => n.startsWith("Finance")), "an error flag is not repeated as news");
    assert.deepEqual(dataNews(null, v1), []);
  });

  test("Read the console speaks the workspace, flags, charts, tables, marked code and the latest result", () => {
    const run = play("py-report-too-slow-profile", ["profileStep"]);
    const s = dataSentence(dataView(run)!);
    assert.match(s, /^Open: overdue_report\.py/);
    assert.match(s, /Run time by night, bar chart, 8 points/);
    assert.match(s, /flagged: Thu 41 min/);
    assert.match(s, /the profile: 4 rows, 1 flagged/);
    assert.match(s, /marked: line \d+ look here/);
    assert.match(s, /Latest result: /);
  });
});

describe("capabilities and goldens", () => {
  test("the app advertises data@1", () => {
    assert.ok(SIM_RENDERERS.some((r) => r.type === "data" && r.level === 1));
    assert.match(simCaps(), /renderers=.*data@1/);
  });

  test("the golden paths replay through the app's engine copy", () => {
    for (const [, slug] of CASES) {
      const g = golden(slug);
      for (const p of g.paths) {
        const r = replayGoldenPath(doc(slug), p, (run) => stateHash(run.state));
        assert.equal(r.error, null, `${slug}/${p.id}: ${r.error}`);
        assert.deepEqual(r.mismatches, [], `${slug}/${p.id}`);
        assert.equal(r.stateHash, p.expect.stateHash, `${slug}/${p.id}: state hash`);
      }
    }
  });
});
