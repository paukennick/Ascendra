// REQ-311 (docs/sims.md 20, 22.24): the project dashboard (predictive and
// Sprint modes) and the ITIL service desk screen types, the scrum and service
// outcome profiles, and the first sims on them. The bindings are validated
// like the console's; each profile refuses a looser threshold; the screens
// are on by default and offered only to an app that advertises them (an
// older build gets "Update the app"); every case has endings in all three
// classes, 3-4 critical criteria, an explicit ending order and golden paths
// that reach every ending but time_up, score every criterion both met and
// missed, and include a Good, a Mediocre and a Bad run; every CSM document is
// a band of a PSMI one on the same objective; objective titles exist.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DESK_DOCUMENTS, ITIL5_DESK_OBJECTIVES, SCRUM_DASHBOARD_DOCUMENTS, SCRUM_OBJECTIVES, loadDocument } from "./documents.ts";
import { validateScenario } from "./engine/v1/index.ts";
import type { ScenarioDoc } from "./engine/v1/index.ts";
import type { GoldenFile } from "./engine/v1/validate.ts";
import { PROFILE_THRESHOLDS } from "./engine/v1/validate.ts";
import { DEFAULT_RENDERERS, pacingEligible, parseCaps, renderersOn, runnable } from "./server-run.ts";
import { safetyFamilyOf, secondsUnitProblems } from "./lint.ts";
import { scenarioSchema } from "./schema.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";

const clone = (d: ScenarioDoc): ScenarioDoc => JSON.parse(JSON.stringify(d)) as ScenarioDoc;
const errors = (d: ScenarioDoc): string[] => validateScenario(d).map(String);
const sprint = (): ScenarioDoc => loadDocument(SCRUM_DASHBOARD_DOCUMENTS.find((e) => e.slug === "sprint-status-meeting-daily-scrum")!);
const desk = (): ScenarioDoc => loadDocument(DESK_DOCUMENTS[0]);
const goldenOf = (file: string): GoldenFile => JSON.parse(readFileSync(file, "utf8")) as GoldenFile;
const titlesOf = (code: string): string[] => {
  const t = CATALOG_TRACKS.find((x) => x.code === code);
  return t ? activeUnits(t).flatMap((u) => u.objectives) : [];
};

describe("REQ-311: the screen types and their bindings", () => {
  test("both screens are on by default, can be switched off, and are offered only to an app that draws them", () => {
    assert.ok(DEFAULT_RENDERERS.includes("project-dashboard"));
    assert.ok(DEFAULT_RENDERERS.includes("service-desk"));
    assert.ok(!renderersOn({ SIMS_RENDERERS: "bedside,board,session,security-console,treatment-session,terminal" }).includes("project-dashboard"));
    const v = { engine_major: 1, engine_minor: 2, renderer_level: 1, screen_type: "project-dashboard" };
    // an older build (REQ-237's caps) gets "Update the app", never a screen it cannot draw
    const old = parseCaps("protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1,security-console@1,treatment-session@1,terminal@1");
    assert.equal(runnable(v, old), false);
    assert.equal(runnable({ ...v, screen_type: "service-desk" }, old), false);
    const now = parseCaps("protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1,security-console@1,treatment-session@1,terminal@1,project-dashboard@1,service-desk@1");
    assert.equal(runnable(v, now), true);
    assert.equal(runnable({ ...v, screen_type: "service-desk" }, now), true);
  });

  test("a project dashboard needs its bindings; Sprint mode needs the Sprint Goal; columns, the chart and gauges are checked", () => {
    const d = sprint();
    const none = clone(d);
    delete none.screen.dashboard;
    assert.ok(errors(none).some((e) => e.includes("a project dashboard needs")));
    const noGoal = clone(d);
    noGoal.screen.dashboard!.commitments = noGoal.screen.dashboard!.commitments.filter((c) => c.label !== "Sprint Goal");
    assert.ok(errors(noGoal).some((e) => e.includes("Sprint mode shows the Sprint Goal")));
    const badCol = clone(d);
    badCol.screen.dashboard!.items[0].column = "\"blocked\"";
    assert.ok(errors(badCol).some((e) => e.startsWith("screen.dashboard.items[0].column")), errors(badCol).join("\n"));
    const shortPlan = clone(d);
    shortPlan.screen.dashboard!.chart!.series[1].values = [29, 0];
    assert.ok(errors(shortPlan).some((e) => e.includes("needs 5 values, one per slot")));
    const noHist = clone(d);
    noHist.screen.dashboard!.chart!.series[0].history = "nope";
    assert.ok(errors(noHist).some((e) => e.includes("no history nope")));
    const words = clone(d);
    words.screen.dashboard!.people[0].words = ["one"];
    assert.ok(errors(words).some((e) => e.includes("one word more than bands")));
    const dup = clone(d);
    dup.screen.dashboard!.events[1].id = dup.screen.dashboard!.events[0].id;
    assert.ok(errors(dup).some((e) => e.includes("duplicate id")));
  });

  test("a service desk needs its matrix, tickets and services; the matrix's shape and targets are checked", () => {
    const d = desk();
    const none = clone(d);
    delete none.screen.desk;
    assert.ok(errors(none).some((e) => e.includes("a service desk needs")));
    const shape = clone(d);
    shape.screen.desk!.matrix.priorities = [[1, 2], [2, 3], [3, 4]];
    assert.ok(errors(shape).some((e) => e.includes("one row per impact level")));
    const noTarget = clone(d);
    noTarget.screen.desk!.matrix.targets = noTarget.screen.desk!.matrix.targets.filter((t) => t.priority !== 5);
    assert.ok(errors(noTarget).some((e) => e.includes("no service level target for priority 5")));
    const ref = clone(d);
    ref.screen.desk!.tickets[1].ref = ref.screen.desk!.tickets[0].ref;
    assert.ok(errors(ref).some((e) => e.includes("duplicate reference")));
    const tone = clone(d);
    tone.screen.desk!.services[0].tone = "\"broken\"";
    assert.ok(errors(tone).some((e) => e.startsWith("screen.desk.services[0].tone")));
  });

  test("the schema accepts both screens and the two profiles", () => {
    assert.ok(scenarioSchema.safeParse(sprint()).success);
    assert.ok(scenarioSchema.safeParse(desk()).success);
  });

  test("dashboard event and issue times and ticket times are sim seconds (the seconds-unit lint)", () => {
    const d = clone(sprint());
    d.state.mins = { type: "number", init: 0, unit: "min", min: 0, max: 100 };
    d.screen.dashboard!.events[0].at = "mins";
    assert.ok(secondsUnitProblems(d).some((p) => p.path === "screen.dashboard.events[0].at"));
    const k = clone(desk());
    k.state.mins = { type: "number", init: 0, unit: "min", min: 0, max: 100 };
    k.screen.desk!.tickets[0].due = "mins";
    assert.ok(secondsUnitProblems(k).some((p) => p.path === "screen.desk.tickets[0].due"));
  });
});

describe("REQ-311: the scrum and service profiles", () => {
  test("scrum is built on the Scrum Guide's commitments, not earned value", () => {
    const s = PROFILE_THRESHOLDS.scrum;
    assert.deepEqual(Object.keys(s).sort(), ["dailyScrumMax", "impedimentWindow", "trustRecovered", "trustTarget", "undoneShown"]);
    assert.equal(s.dailyScrumMax.value, 900);
    assert.equal(s.undoneShown.value, 0);
    assert.ok(!Object.keys(s).some((k) => /cpi|spi/i.test(k)), "no earned value in the Scrum profile");
    assert.ok(PROFILE_THRESHOLDS.project.cpiTarget, "the predictive project profile keeps earned value");
  });

  test("a looser threshold is refused", () => {
    const d = clone(sprint());
    d.outcome.thresholds.dailyScrumMax.value = 1800;
    assert.ok(errors(d).some((e) => e.includes("looser than the scrum default 900")));
    const k = clone(desk());
    k.outcome.thresholds.slaBreachRecovered.value = 3;
    assert.ok(errors(k).some((e) => e.includes("looser than the service default 1")));
  });
});

function caseChecks(e: { slug: string; golden: string | null; course: string }, d: ScenarioDoc): void {
  assert.deepEqual(errors(d), [], e.slug);
  assert.equal(d.engine.minor, 2);
  const conditional = Object.entries(d.endings).filter(([, x]) => x.when).map(([k]) => k);
  assert.deepEqual([...(d.endingOrder ?? [])].sort(), conditional.sort(), e.slug);
  assert.deepEqual([...new Set(Object.values(d.endings).map((x) => x.class))].sort(), ["harm", "recovered", "target"], e.slug);
  for (const k of Object.keys(d.endings)) assert.ok(d.scoring.debrief[k], `${e.slug}: debrief for ${k}`);
  assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), `${e.slug}: learner-paced`);
  assert.equal(safetyFamilyOf(d), "general");
  assert.equal(pacingEligible(d, "general"), false);
  const critical = d.scoring.criteria.filter((c) => c.critical).length;
  assert.ok(critical >= 3 && critical <= 4, `${e.slug}: ${critical} critical`);
  assert.ok(d.scoring.kpis.length >= 3 && d.scoring.kpis.every((k) => k.expert), e.slug);
  assert.ok(d.scoring.expertPath.length >= 4, e.slug);
  assert.deepEqual(secondsUnitProblems(d), [], e.slug);
  for (const s of d.sources) assert.equal(s.checkedAt, "2026-11-16", s.cite);
  const g = goldenOf(e.golden!);
  const reached = new Set(g.paths.map((p) => p.expect.ending));
  for (const k of Object.keys(d.endings)) if (k !== "time_up") assert.ok(reached.has(k), `${e.slug}: ${k} reached`);
  const ratings = new Set(g.paths.map((p) => p.expect.rating));
  for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r as never), `${e.slug}: a ${r} path`);
  for (const c of d.scoring.criteria) {
    const scores = new Set(g.paths.map((p) => p.expect.criteria?.[c.id]));
    assert.ok(scores.has("met") && scores.has("missed"), `${e.slug}: ${c.id} met and missed`);
  }
}

describe("REQ-311: Scrum Sprints on the project dashboard", () => {
  test("PSMI cases and their CSM bands, each on the same objective title", () => {
    const psmi = SCRUM_DASHBOARD_DOCUMENTS.filter((e) => e.course === "PSMI");
    const csm = SCRUM_DASHBOARD_DOCUMENTS.filter((e) => e.course === "CSM");
    assert.ok(psmi.length >= 2);
    assert.equal(csm.length, psmi.length, "every PSMI Sprint is a CSM band too");
    for (const e of psmi) assert.equal(e.kind, "scenario");
    for (const e of csm) {
      assert.equal(e.kind, "band");
      const band = JSON.parse(readFileSync(e.file, "utf8")) as { base: { course: string; slug: string } };
      assert.equal(band.base.course, "PSMI");
      assert.equal(loadDocument(e).objective, SCRUM_OBJECTIVES[band.base.slug], e.slug);
    }
  });

  test("each is registered to an active objective of its course by exact title, and its secondary objectives exist", () => {
    for (const e of SCRUM_DASHBOARD_DOCUMENTS) {
      const d = loadDocument(e);
      assert.equal(d.objective, SCRUM_OBJECTIVES[e.slug], e.slug);
      const titles = titlesOf(e.course);
      assert.equal(titles.filter((t) => t === d.objective).length, 1, `${e.course}: ${d.objective}`);
      for (const s of d.secondaryObjectives ?? []) assert.ok(titles.includes(s), `${e.course}: secondary ${s}`);
    }
  });

  test("valid, Sprint mode, the scrum profile, engine 1.2, learner-paced; goldens cover every ending, criterion and rating", () => {
    for (const e of SCRUM_DASHBOARD_DOCUMENTS) {
      const d = loadDocument(e);
      assert.equal(d.screen.type, "project-dashboard");
      assert.equal(d.screen.dashboard!.mode, "sprint");
      assert.equal(d.outcome.profile, "scrum");
      assert.ok(d.sources.some((s) => /scrumguides\.org/.test(s.url ?? "")), `${e.slug}: cites the Scrum Guide`);
      caseChecks(e, d);
    }
  });

  test("undone work shown as done is harm in every Sprint that has a Review (Scrum Guide 2020)", () => {
    const d = loadDocument(SCRUM_DASHBOARD_DOCUMENTS.find((e) => e.slug === "sprint-status-meeting-daily-scrum")!);
    assert.equal(d.endings.undone.class, "harm");
    assert.equal(d.endingOrder![0], "undone");
    const o = loadDocument(SCRUM_DASHBOARD_DOCUMENTS.find((e) => e.slug === "sprint-goal-becomes-obsolete")!);
    assert.equal(o.endings.smCancelled.class, "harm", "only the Product Owner may cancel a Sprint");
  });
});

describe("REQ-311: the ITIL service desk", () => {
  test("registered to ITIL5FND by the titles REQ-308 gave; checked against the catalog once that course is in it", () => {
    assert.equal(DESK_DOCUMENTS.length, 1);
    for (const e of DESK_DOCUMENTS) {
      const d = loadDocument(e);
      const [primary, ...secondary] = ITIL5_DESK_OBJECTIVES[e.slug];
      assert.equal(d.objective, primary);
      assert.deepEqual(d.secondaryObjectives, secondary);
      const titles = titlesOf("ITIL5FND");
      if (titles.length) {
        assert.equal(titles.filter((t) => t === primary).length, 1);
        for (const s of secondary) assert.ok(titles.includes(s), s);
      }
    }
  });

  test("valid, the service-desk screen, the service profile; goldens cover every ending, criterion and rating", () => {
    for (const e of DESK_DOCUMENTS) {
      const d = loadDocument(e);
      assert.equal(d.screen.type, "service-desk");
      assert.equal(d.outcome.profile, "service");
      caseChecks(e, d);
    }
  });
});
