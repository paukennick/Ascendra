// REQ-312 (docs/sims.md 20.1, 22.25): the data and code console. The
// screen.data bindings are display-only and checked by the validator (a
// broken binding is an error, an editable cell must name an action with one
// choice param that a phase lists, a control chart needs its limits, code
// lines are literal and short), the data profile has its default
// thresholds, the renderer is on by default and an app without data@1 is
// told to update, and every data console sim is valid, learner-paced, on
// an active objective of its own course, with goldens that reach every
// ending but time_up, every rating, and every criterion met and missed.
// Documents are selected by slug from this requirement's own list
// (FAIL-2002), never by course code.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, DATA_CONSOLE_SLUGS, loadDocument } from "./documents.ts";
import { validateScenario } from "./engine/v1/index.ts";
import { PROFILE_THRESHOLDS } from "./engine/v1/validate.ts";
import type { GoldenFile } from "./engine/v1/validate.ts";
import type { ScenarioDoc } from "./engine/v1/types.ts";
import { DEFAULT_RENDERERS, pacingEligible, parseCaps, renderersOn, runnable } from "./server-run.ts";
import { backslashEscapeProblems, secondsUnitProblems } from "./lint.ts";
import { scenarioSchema } from "./schema.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";

const MINE = ALL_DOCUMENTS.filter((e) => DATA_CONSOLE_SLUGS.includes(e.slug));
const SCENARIOS = MINE.filter((e) => e.kind === "scenario");

function visibleStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) visibleStrings(x, out);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k !== "sources" && k !== "source") visibleStrings(x, out);
  return out;
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const base = (): ScenarioDoc => clone(loadDocument(SCENARIOS.find((e) => e.slug === "pl300-rls-region-manager")!));
const errors = (d: ScenarioDoc): string[] => validateScenario(d).map(String);

describe("REQ-312 screen.data bindings", () => {
  test("the seeded PL300 case is valid as written", () => {
    assert.deepEqual(errors(base()), []);
  });

  test("a data screen needs its bindings, and something to show", () => {
    const d = base();
    delete d.screen.data;
    assert.ok(errors(d).some((e) => e.startsWith("screen.data:")));
    const e = base();
    e.screen.data!.tables = [];
    e.screen.data!.charts = [];
    e.screen.data!.code = [];
    assert.ok(errors(e).some((x) => x.includes("at least one table, chart or code file")));
  });

  test("an editable cell names an action with exactly one choice param that a phase lists", () => {
    const d = base();
    d.screen.data!.tables[0].edits = [{ row: "mgr", column: "role", action: "checkAccess" }];
    assert.ok(errors(d).some((e) => e.includes("exactly one param, of kind choice")));
    const n = base();
    n.screen.data!.tables[0].edits = [{ row: "nope", column: "role", action: "setGroupRole" }];
    assert.ok(errors(n).some((e) => e.includes("no row nope")));
    const p = base();
    p.phases.work.actions = p.phases.work.actions.filter((a) => a !== "setGroupRole");
    assert.ok(errors(p).some((e) => e.includes("action setGroupRole is in no phase")));
    const twice = base();
    twice.screen.data!.tables[0].edits!.push({ row: "mgr", column: "role", action: "setGroupRole" });
    assert.ok(errors(twice).some((e) => e.includes("editable twice")));
  });

  test("rows need one cell per column; expressions are type-checked", () => {
    const d = base();
    d.screen.data!.tables[0].rows[0].cells.pop();
    assert.ok(errors(d).some((e) => e.includes("one cell per column")));
    const f = base();
    f.screen.data!.tables[0].rows[0].flag = "grpRole";
    assert.ok(errors(f).length > 0);
    const c = base();
    c.screen.data!.charts[0].points[0].value = "\"many\"";
    assert.ok(errors(c).length > 0);
  });

  test("charts: an axis with min below max, a control chart has limits", () => {
    const d = base();
    d.screen.data!.charts[0].min = 500;
    assert.ok(errors(d).some((e) => e.includes("min below max")));
    const c = base();
    c.screen.data!.charts[0].kind = "control";
    assert.ok(errors(c).some((e) => e.includes("center line and limits")));
  });

  test("code lines are literal, one per entry, at most 160 characters, with an enum mark", () => {
    const d = base();
    d.screen.data!.code[0].lines[0].text = "a\nb";
    assert.ok(errors(d).some((e) => e.includes("one line per entry")));
    const l = base();
    l.screen.data!.code[0].lines[0].text = "x".repeat(161);
    assert.ok(errors(l).some((e) => e.includes("at most 160")));
    assert.equal(scenarioSchema.safeParse(l).success, false, "the schema enforces the length too");
    const m = base();
    m.screen.data!.code[0].lines[0].mark = "\"bold\"";
    assert.ok(errors(m).length > 0);
    const braces = base();
    braces.screen.data!.code[0].lines[0].text = "blocked = {r for r in rows}";
    assert.deepEqual(errors(braces), [], "braces in code are literal, not template slots");
  });

  test("flags: a known severity and a boolean when; ids unique across the screen", () => {
    const d = base();
    (d.screen.data!.flags[0] as { severity: string }).severity = "fatal";
    assert.ok(errors(d).some((e) => e.includes("severity")));
    const u = base();
    u.screen.data!.flags[1].id = u.screen.data!.flags[0].id;
    assert.ok(errors(u).some((e) => e.includes("duplicate id")));
  });

  test("the data profile's default thresholds; authors may tighten, never loosen", () => {
    assert.equal(PROFILE_THRESHOLDS.data.deliverWindow.value, 7200);
    assert.equal(PROFILE_THRESHOLDS.data.rowsAlteredOutsideFix.value, 0);
    const d = base();
    d.outcome.thresholds.deliverWindow = { value: 9000, source: d.sources[0] };
    assert.ok(errors(d).some((e) => e.includes("looser than the data default")));
  });

  test("on by default; an app without data@1 is told to update", () => {
    assert.ok((DEFAULT_RENDERERS as readonly string[]).includes("data"));
    assert.ok(renderersOn({}).includes("data"));
    assert.ok(!renderersOn({ SIMS_RENDERERS: "bedside,terminal" }).includes("data"));
    const need = { engine_major: 1, engine_minor: 2, renderer_level: 1, screen_type: "data" };
    assert.equal(runnable(need, parseCaps("protocol=1;engine=1.2;renderers=bedside@3,terminal@1,data@1")!), true);
    assert.equal(runnable(need, parseCaps("protocol=1;engine=1.2;renderers=bedside@3,terminal@1")!), false);
  });
});

describe("REQ-312 data console sims", () => {
  test("every listed slug is registered", () => {
    assert.deepEqual(MINE.map((e) => e.slug).sort(), [...DATA_CONSOLE_SLUGS].sort());
  });

  test("valid, on the data screen and profile, learner-paced, engine 1.2 with endingOrder", () => {
    for (const e of SCENARIOS) {
      const d = loadDocument(e);
      assert.deepEqual(validateScenario(d).map(String), [], e.slug);
      assert.equal(scenarioSchema.safeParse(d).success, true, e.slug);
      assert.equal(d.screen.type, "data", e.slug);
      assert.equal(d.outcome.profile, "data", e.slug);
      assert.equal(d.engine.minor, 2);
      assert.ok(d.endingOrder && d.endingOrder.length >= 2, e.slug);
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), `${e.slug}: learner-paced`);
      assert.equal(pacingEligible(d, "general"), false);
      const crit = d.scoring.criteria.filter((c) => c.critical).length;
      assert.ok(crit >= 3 && crit <= 4, `${e.slug}: ${crit} critical criteria`);
      const classes = new Set(Object.entries(d.endings).filter(([id]) => id !== "time_up").map(([, x]) => x.class));
      assert.deepEqual([...classes].sort(), ["harm", "recovered", "target"], e.slug);
      for (const id of Object.keys(d.endings)) assert.ok(d.scoring.debrief[id], `${e.slug}: debrief for ${id}`);
      assert.ok(d.scoring.expertPath.length >= 3 && d.scoring.kpis.length >= 3, e.slug);
      assert.deepEqual(secondsUnitProblems(d), [], e.slug);
      assert.deepEqual(backslashEscapeProblems(d), [], e.slug);
      for (const s of d.sources) assert.match(s.checkedAt, /^2026-11-1[4-9]$/, `${e.slug}: ${s.cite}`);
    }
  });

  test("nothing is typed: every work-phase param is a choice (an edit is a bounded choice)", () => {
    for (const e of SCENARIOS) {
      const d = loadDocument(e);
      for (const id of d.phases.work.actions) for (const p of d.actions[id].params ?? []) assert.equal(p.kind, "choice", `${e.slug}.${id}`);
    }
  });

  test("each is on an active objective of its own course, distinct within the course", () => {
    const seen = new Map<string, Set<string>>();
    for (const e of MINE) {
      const track = CATALOG_TRACKS.find((t) => t.code === e.course)!;
      assert.ok(track, e.course);
      const titles = new Set(activeUnits(track).flatMap((u) => u.objectives));
      const d = loadDocument(e);
      assert.ok(titles.has(d.objective), `${e.course}: ${d.objective}`);
      for (const s of d.secondaryObjectives ?? []) assert.ok(titles.has(s), `${e.course}: secondary ${s}`);
      const set = seen.get(e.course) ?? new Set<string>();
      assert.ok(!set.has(d.objective), `${e.course}: two sims on ${d.objective}`);
      set.add(d.objective);
      seen.set(e.course, set);
    }
  });

  test("goldens reach every ending but time_up, every rating, and every criterion met and missed", () => {
    for (const e of SCENARIOS) {
      const d = loadDocument(e);
      const g = JSON.parse(readFileSync(e.golden!, "utf8")) as GoldenFile;
      assert.ok(g.paths.length >= 5 && g.paths.length <= 8, `${e.slug}: 5-8 golden paths`);
      const endings = new Set(g.paths.map((p) => p.expect.ending));
      for (const k of Object.keys(d.endings)) if (k !== "time_up") assert.ok(endings.has(k), `${e.slug}: no golden path reaches ${k}`);
      const ratings = new Set(g.paths.map((p) => p.expect.rating));
      for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r as never), `${e.slug}: ${r}`);
      for (const c of d.scoring.criteria) {
        const seen = new Set(g.paths.map((p) => p.expect.criteria?.[c.id]));
        assert.ok(seen.has("met") && seen.has("missed"), `${e.slug}: ${c.id} met and missed (${[...seen].join(",")})`);
      }
      const expert = g.paths.find((p) => p.id === "expert")!;
      assert.equal(expert.expect.class, "target", e.slug);
      assert.equal(expert.expect.rating, "good", e.slug);
    }
  });

  test("fictional names only: documentation domains and addresses (RFC 2606, RFC 5737)", () => {
    for (const e of MINE) {
      const text = visibleStrings(loadDocument(e)).join("\n");
      for (const m of text.match(/\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|io|dev)\b/gi) ?? []) assert.match(m, /(^|\.)example\.(com|net|org)$/i, `${e.slug}: ${m}`);
      for (const m of text.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) ?? []) assert.match(m, /^(192\.0\.2|198\.51\.100|203\.0\.113|10\.\d+\.\d+|127\.0\.0)\.\d+$/, `${e.slug}: ${m}`);
    }
  });
});
