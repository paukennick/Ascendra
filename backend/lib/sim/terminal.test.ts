// REQ-237 (docs/sims.md 20, 20.1, 22.10): the terminal and network screen
// type and the Linux+, Network+ and CKA outages. The bindings are validated
// like the console's; the infrastructure profile refuses a looser threshold;
// the outages move only on the operator's clock (each command costs minutes);
// every case meets the generator's selection rule, has endings in all three
// classes, 3-4 critical criteria and goldens that reach every ending but
// time_up and score every criterion both met and missed; the renderer is on by
// default and advertised by the app.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { applyCommand, createRun, lintScenario, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, ScenarioDoc } from "./engine/v1/index.ts";
import type { GoldenFile } from "./engine/v1/validate.ts";
import { PROFILE_THRESHOLDS } from "./engine/v1/validate.ts";
import type { Run } from "./engine/v1/engine.ts";
import { clientDocument } from "./content-hash.ts";
import { DEFAULT_RENDERERS, pacingEligible, parseCaps, renderersOn, runnable } from "./server-run.ts";
import { backslashEscapeProblems, safetyFamilyOf, secondsUnitProblems } from "./lint.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { isPerformanceObjective } from "../../scripts/generate-labs-lib.ts";

const COURSES = ["LINUXPLUS", "NETWORKPLUS", "CKA"];
const TERMINAL = ALL_DOCUMENTS.filter((e) => COURSES.includes(e.course));
const docOf = (slug: string): ScenarioDoc => loadDocument(TERMINAL.find((e) => e.slug === slug)!);
const clone = (d: ScenarioDoc): ScenarioDoc => JSON.parse(JSON.stringify(d)) as ScenarioDoc;
const errors = (d: ScenarioDoc): string[] => validateScenario(d).map(String);

function driver(doc: ScenarioDoc) {
  const run: Run = createRun(doc, 1);
  let seq = 0;
  const send = (c: Record<string, unknown>) => {
    const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
    assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
  };
  return {
    run,
    act: (action: string, params?: Record<string, string>) => {
      send({ type: "act", action, ...(params ? { params } : {}) });
      while (readValue(run, "busy") === true && run.state.phase === "incident") {
        const w = waits(run)[0];
        send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
      }
    },
    value: (n: string) => readValue(run, n),
    minutes: () => (run.state.tick * run.c.dt) / 60,
  };
}

describe("terminal outages: Linux+, Network+, CKA", () => {
  test("two per course, each valid, on the terminal screen, the infrastructure profile, engine 1.2, learner-paced", () => {
    for (const c of COURSES) assert.equal(TERMINAL.filter((e) => e.course === c).length, 2, c);
    for (const e of TERMINAL) {
      const d = loadDocument(e);
      assert.deepEqual(errors(d), [], e.slug);
      assert.equal(e.kind, "scenario");
      assert.equal(d.screen.type, "terminal");
      assert.ok(d.screen.terminal, e.slug);
      assert.equal(d.outcome.profile, "infrastructure");
      assert.equal(d.engine.minor, 2);
      assert.ok(d.endingOrder && d.endingOrder.length >= 2, `${e.slug}: engine 1.2 ending order`);
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), `${e.slug}: learner-paced`);
      assert.equal(safetyFamilyOf(d), "general");
      assert.equal(pacingEligible(d, "general"), false);
      const crit = d.scoring.criteria.filter((c) => c.critical).length;
      assert.ok(crit >= 3 && crit <= 4, `${e.slug}: ${crit} critical criteria`);
      const classes = new Set(Object.values(d.endings).filter((x) => x.terminal).map((x) => x.class));
      for (const k of ["target", "recovered", "harm"]) assert.ok(classes.has(k as never), `${e.slug}: ${k}`);
      for (const k of Object.keys(d.endings)) assert.ok(d.scoring.debrief[k], `${e.slug}: debrief for ${k}`);
      assert.ok(d.scoring.kpis.length >= 2 && d.scoring.expertPath.length >= 3, e.slug);
      assert.deepEqual(secondsUnitProblems(d), [], e.slug);
      assert.ok(d.sources.every((s) => s.checkedAt === "2026-11-11"), `${e.slug}: sources dated`);
    }
  });

  test("each case is on its own course objective, which meets the generator's selection rule", () => {
    for (const c of COURSES) {
      const track = CATALOG_TRACKS.find((t) => t.code === c)!;
      const titles = new Set(activeUnits(track).flatMap((u) => u.objectives));
      const objs = TERMINAL.filter((e) => e.course === c).map((e) => loadDocument(e).objective);
      assert.equal(new Set(objs).size, objs.length, c);
      for (const o of objs) {
        assert.ok(titles.has(o), `${c}: ${o} is a catalog objective`);
        assert.ok(isPerformanceObjective(o, "general"), o);
      }
    }
  });

  test("the goldens reach every ending but time_up, every rating, and score every criterion both met and missed", () => {
    for (const e of TERMINAL) {
      const d = loadDocument(e);
      const g = JSON.parse(readFileSync(e.golden!, "utf8")) as GoldenFile;
      assert.ok(g.paths.length >= 5 && g.paths.length <= 6, `${e.slug}: 5-6 golden paths`);
      const endings = new Set(g.paths.map((p) => p.expect.ending));
      for (const k of Object.keys(d.endings)) if (k !== "time_up") assert.ok(endings.has(k), `${e.slug}: no golden path reaches ${k}`);
      const ratings = new Set(g.paths.map((p) => p.expect.rating));
      for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r as never), `${e.slug}: ${r}`);
      for (const c of d.scoring.criteria) {
        const seen = new Set(g.paths.map((p) => p.expect.criteria?.[c.id]));
        assert.ok(seen.has("met") && seen.has("missed"), `${e.slug}: ${c.id} met and missed (${[...seen].join(",")})`);
      }
    }
  });

  test("the client document keeps the terminal bindings and drops the rubric", () => {
    for (const e of TERMINAL) {
      const c = clientDocument(loadDocument(e)) as unknown as Record<string, any>;
      assert.ok(c.screen.terminal.nodes.length >= 1 && typeof c.screen.terminal.prompt === "string");
      assert.equal(c.scoring, undefined);
      for (const m of Object.values(c.reasoning) as { parts?: unknown }[]) assert.equal(m.parts, undefined);
    }
  });

  test("commands are bounded: every incident action is plain or picks its arguments from lists", () => {
    for (const e of TERMINAL) {
      const d = loadDocument(e);
      for (const id of d.phases.incident.actions) for (const p of d.actions[id].params ?? []) assert.equal(p.kind, "choice", `${e.slug}.${id}`);
    }
  });
});

describe("terminal bindings (screen.terminal)", () => {
  const base = docOf("full-var-stops-database");

  test("a terminal screen without bindings is refused", () => {
    const d = clone(base);
    delete d.screen.terminal;
    assert.ok(errors(d).some((e) => e.includes("screen.terminal")));
  });

  test("nodes, links and lines bind to real state with the right types", () => {
    const d = clone(base);
    const t = d.screen.terminal!;
    t.nodes[0].tone = '"green"';
    t.nodes[1].spokenLabel = "";
    t.links[0].to = "nosuchnode";
    t.links[1].tone = "pgUp";
    t.lines[0].at = "pgUp";
    t.lines[1].error = "freeMb";
    t.lines[2].when = "nosuchname";
    t.links[2].id = t.nodes[0].id;
    const e = errors(d).join("\n");
    assert.match(e, /nodes\[0\]\.tone/);
    assert.match(e, /nodes\[1\].*spokenLabel/);
    assert.match(e, /links\[0\]\.to/);
    assert.match(e, /links\[1\]\.tone/);
    assert.match(e, /lines\[0\]\.at/);
    assert.match(e, /lines\[1\]\.error/);
    assert.match(e, /lines\[2\]\.when/);
    assert.match(e, /duplicate id/);
  });

  test("a terminal line's at is sim seconds (the seconds-unit lint)", () => {
    const d = clone(base);
    d.params.syncMin = { value: 45, unit: "min", source: d.params.syncDelay.source };
    d.screen.terminal!.lines[3].at = "syncMin";
    assert.ok(secondsUnitProblems(d).some((p) => p.path === "screen.terminal.lines[3].at"));
  });

  test("a backslash escape in a document string is a lint error (FAIL-1440); no seeded document has one", () => {
    const d = clone(base);
    d.actions.df.effects.push({ output: '{freeMb > 0 ? "a\\nb" : ""}' });
    d.screen.terminal!.lines[0].text = "C:\\> fine, a backslash before >";
    const p = backslashEscapeProblems(d);
    assert.equal(p.length, 1);
    assert.match(p[0].path, /^actions\.df\.effects/);
    for (const e of ALL_DOCUMENTS) assert.deepEqual(backslashEscapeProblems(loadDocument(e)), [], `${e.course}/${e.slug}`);
  });

  test("the infrastructure profile has defaults and refuses a looser threshold", () => {
    assert.equal(PROFILE_THRESHOLDS.infrastructure.restoreWindow.value, 3600);
    assert.equal(PROFILE_THRESHOLDS.infrastructure.newFaults.value, 0);
    const d = clone(base);
    d.outcome.thresholds.restoreWindow.value = 7200;
    d.outcome.thresholds.newFaults.value = 1;
    const e = errors(d).join("\n");
    assert.match(e, /restoreWindow/);
    assert.match(e, /newFaults/);
  });

  test("display only: a binding change leaves the run's state hash untouched", () => {
    const a = driver(base);
    const b = driver((() => {
      const d = clone(base);
      d.screen.terminal!.nodes[0].status = "something else";
      return d;
    })());
    for (const x of [a, b]) {
      x.act("df");
      x.act("lsof");
    }
    assert.deepEqual(a.run.state, b.run.state);
  });
});

describe("outages move on the operator's clock", () => {
  test("Linux+: the 09:45 sync fails only if the database is still down, and only once its minutes have passed", () => {
    const d = docOf("full-var-stops-database");
    const r = driver(d);
    r.act("df");
    assert.equal(r.value("syncFailedAt"), null);
    while (r.minutes() < 46) r.act("watch");
    assert.notEqual(r.value("syncFailedAt"), null);
    const ok = driver(d);
    ok.act("restartShopd");
    ok.act("startPg");
    while (ok.minutes() < 46) ok.act("watch");
    assert.equal(ok.value("syncFailedAt"), null);
  });

  test("Linux+: deleting other logs does not free the space a deleted, open file holds", () => {
    const r = driver(docOf("full-var-stops-database"));
    r.act("rmLogs");
    r.act("startPg");
    assert.equal(r.value("pgUp"), false);
    r.act("restartShopd");
    r.act("startPg");
    assert.equal(r.value("pgUp"), true);
  });

  test("Network+: a bare allowed list drops voice and the management session; add keeps them", () => {
    const bad = driver(docOf("vlan-missing-from-trunk"));
    bad.act("configTrunk", { line: "only20" });
    assert.equal(bad.value("voiceLost"), true);
    assert.equal(bad.value("swReachable"), false);
    const good = driver(docOf("vlan-missing-from-trunk"));
    good.act("configTrunk", { line: "add20" });
    assert.equal(good.value("vlan20On"), true);
    assert.equal(good.value("voiceLost"), false);
  });

  test("CKA: rollout undo does not fix a ConfigMap; fixing it and restarting does", () => {
    const r = driver(docOf("crashloop-bad-configmap"));
    r.act("rolloutUndo");
    assert.equal(r.value("rolloutDoneAt"), null);
    r.act("editCm", { port: "p8080" });
    assert.equal(r.value("rolloutDoneAt"), null, "running pods keep the environment they started with");
    r.act("rolloutRestart");
    assert.notEqual(r.value("rolloutDoneAt"), null);
  });

  test("CKA: a safe drain of w3 blocks on the budget while w2 is out, and completes once w2 is back", () => {
    const blocked = driver(docOf("node-notready-swap-drain"));
    blocked.act("drainW3", { flags: "safe" });
    assert.equal(blocked.value("w3Drained"), false);
    assert.equal(blocked.value("drainBlocked"), true);
    const ok = driver(docOf("node-notready-swap-drain"));
    ok.act("swapOffA");
    ok.act("restartKubelet");
    ok.act("drainW3", { flags: "safe" });
    assert.equal(ok.value("w3Drained"), true);
  });

  test("ten idle minutes change nothing: nothing advances without a command", () => {
    for (const e of TERMINAL) {
      const r = driver(loadDocument(e));
      const before = JSON.stringify(r.run.state);
      assert.equal(waits(r.run).length, 0, `${e.slug}: no wait pending at the start`);
      assert.equal(JSON.stringify(r.run.state), before);
    }
  });

  test("no lint error on any terminal document", () => {
    for (const e of TERMINAL) {
      const errs = lintScenario(loadDocument(e), { now: "2026-11-11", safetyFamily: "general" }).filter((p) => p.level === "error");
      assert.deepEqual(errs, [], e.slug);
    }
  });
});

describe("the terminal renderer is on and advertised", () => {
  test("SIMS_RENDERERS defaults to include terminal; the env can turn it off", () => {
    assert.ok((DEFAULT_RENDERERS as readonly string[]).includes("terminal"));
    assert.ok(renderersOn({}).includes("terminal"));
    assert.ok(!renderersOn({ SIMS_RENDERERS: "bedside,board" }).includes("terminal"));
  });

  test("an app that advertises terminal@1 can run these; one without it is told to update", () => {
    const need = { engine_major: 1, engine_minor: 2, renderer_level: 1, screen_type: "terminal" };
    assert.equal(runnable(need, parseCaps("protocol=1;engine=1.2;renderers=bedside@3,terminal@1")!), true);
    assert.equal(runnable(need, parseCaps("protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1,security-console@1,treatment-session@1")!), false);
  });
});
