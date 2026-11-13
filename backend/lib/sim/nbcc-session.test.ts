// REQ-239: the NCE and NCMHCE client sessions (docs/sims.md 22.12). Same
// screen, profile and pacing as the EPPP sessions (REQ-225): learner-paced
// turns, the clinical-session profile, registered by course code and exact
// objective title. Each case has endings in all three classes, 3-4 critical
// criteria, KPIs, an expert path, a debrief per ending, 5-6 golden paths that
// reach every ending but time_up and score every criterion both met and
// missed, and an explicit endingOrder. The NCMHCE trauma case runs the exam's
// two-session shape.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NBCC_OBJECTIVES, NBCC_SESSION_DOCUMENTS, loadDocument } from "./documents.ts";
import { applyCommand, createRun, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, GoldenFile, ScenarioDoc } from "./engine/v1/index.ts";
import { pacingEligible } from "./server-run.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { NCE_SIM_OBJECTIVES, NCMHCE_SIM_OBJECTIVES } from "../../supabase/seed/tracks/nbcc";

const docOf = (slug: string): ScenarioDoc => loadDocument(NBCC_SESSION_DOCUMENTS.find((e) => e.slug === slug)!);
const goldenOf = (slug: string): GoldenFile => JSON.parse(readFileSync(NBCC_SESSION_DOCUMENTS.find((e) => e.slug === slug)!.golden!, "utf8")) as GoldenFile;

describe("REQ-239: NBCC client sessions", () => {
  test("two NCE and three NCMHCE sessions, each registered to an active objective of its own course by exact title", () => {
    assert.deepEqual(NBCC_SESSION_DOCUMENTS.map((e) => e.course), ["NCE", "NCE", "NCMHCE", "NCMHCE", "NCMHCE"]);
    assert.deepEqual(
      Object.values(NBCC_OBJECTIVES).sort(),
      [...Object.values(NCE_SIM_OBJECTIVES), ...Object.values(NCMHCE_SIM_OBJECTIVES)].sort(),
      "the sim registry and the course seed name the same titles"
    );
    for (const e of NBCC_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      assert.equal(d.objective, NBCC_OBJECTIVES[e.slug], e.slug);
      const track = CATALOG_TRACKS.find((t) => t.code === e.course)!;
      const hits = activeUnits(track).filter((u) => u.objectives.includes(d.objective));
      assert.equal(hits.length, 1, `${e.course} has exactly one active "${d.objective}"`);
      assert.equal(e.source, "authored");
    }
  });

  test("valid, session screen, clinical-session profile, learner-paced", () => {
    for (const e of NBCC_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      assert.deepEqual(validateScenario(d).map(String), [], e.slug);
      assert.equal(d.screen.type, "session");
      assert.ok(d.screen.session!.gauges.length >= 3, e.slug);
      assert.equal(d.outcome.profile, "clinical-session");
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), `${e.slug}: no running phase`);
      assert.equal(pacingEligible(d, "clinical"), false);
      assert.ok(d.outcome.noProgress, `${e.slug}: noProgress declared`);
    }
  });

  test("endings in all three classes, an explicit endingOrder, a debrief for every ending", () => {
    for (const e of NBCC_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      const classes = new Set(Object.values(d.endings).map((x) => x.class));
      assert.deepEqual([...classes].sort(), ["harm", "recovered", "target"], e.slug);
      const conditional = Object.entries(d.endings).filter(([, x]) => x.when).map(([k]) => k);
      assert.deepEqual([...(d.endingOrder ?? [])].sort(), conditional.sort(), `${e.slug}: endingOrder lists every conditional ending`);
      assert.equal(d.engine.minor, 2);
      for (const k of Object.keys(d.endings)) assert.ok(d.scoring.debrief?.[k], `${e.slug}: debrief for ${k}`);
    }
  });

  test("3-4 critical criteria, KPIs with expert values, an expert path, sources dated", () => {
    for (const e of NBCC_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      const critical = d.scoring.criteria.filter((c) => c.critical).length;
      assert.ok(critical >= 3 && critical <= 4, `${e.slug}: ${critical} critical`);
      assert.ok(d.scoring.kpis!.length >= 3 && d.scoring.kpis!.every((k) => k.expert), e.slug);
      assert.ok(d.scoring.expertPath!.length >= 4, e.slug);
      assert.ok(d.sources.length >= 2, e.slug);
      for (const s of d.sources) assert.match(s.checkedAt, /^2026-11-1[01]$/, `${e.slug}: ${s.cite}`);
      assert.ok(d.sources.some((s) => /nbcc\.org/.test(s.url ?? "")), `${e.slug}: cites the NBCC outline`);
    }
  });

  test("golden paths: 5-6 per case, every ending but time_up reached, every criterion both met and missed, a Good, a Mediocre and a Bad", () => {
    for (const e of NBCC_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      const g = goldenOf(e.slug);
      assert.ok(g.paths.length >= 5 && g.paths.length <= 6, `${e.slug}: ${g.paths.length} paths`);
      const reached = new Set(g.paths.map((p) => p.expect.ending));
      for (const k of Object.keys(d.endings)) if (k !== "time_up") assert.ok(reached.has(k), `${e.slug}: no golden path reaches ${k}`);
      const ratings = new Set(g.paths.map((p) => p.expect.rating));
      for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r as never), `${e.slug}: no ${r} path`);
      for (const c of d.scoring.criteria) {
        const scores = new Set(g.paths.map((p) => p.expect.criteria?.[c.id]));
        assert.ok(scores.has("met") && scores.has("missed"), `${e.slug}: ${c.id} is ${[...scores].join("/")}`);
      }
    }
  });

  test("crisis resources name 988 where suicide risk is in play", () => {
    for (const slug of ["ncmhce-suicide-safety-plan", "ncmhce-trauma-treatment-plan"]) {
      const d = docOf(slug);
      assert.ok(d.sources.some((s) => /988/.test(s.cite)), slug);
    }
    assert.match(JSON.stringify(docOf("ncmhce-suicide-safety-plan").actions.planStep), /988 by call or text/);
  });
});

describe("the people layer in the NBCC cases", () => {
  function driver(doc: ScenarioDoc) {
    const run = createRun(doc, 1);
    let seq = 0;
    const send = (c: Record<string, unknown>) => {
      const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
      assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
    };
    return {
      run,
      act: (action: string, params?: Record<string, string>) => send({ type: "act", action, ...(params ? { params } : {}) }),
      cont: () => {
        const w = waits(run)[0];
        send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
      },
      value: (n: string) => readValue(run, n),
    };
  }

  test("the substance case: withdrawal history needs trust; asked cold, he denies it", () => {
    const cold = driver(docOf("nce-substance-use-screen"));
    cold.act("askWithdrawal");
    assert.equal(cold.value("withdrawalKnown"), false);
    const warm = driver(docOf("nce-substance-use-screen"));
    warm.act("limits");
    warm.cont();
    warm.act("askWithdrawal");
    assert.equal(warm.value("withdrawalKnown"), true);
  });

  test("the trauma case runs two sessions: ending the first opens the second, three weeks on, and its own hour", () => {
    const d = driver(docOf("ncmhce-trauma-treatment-plan"));
    d.act("checkIn1");
    d.cont();
    d.act("endSession1");
    assert.equal(d.run.state.phase, "session2");
    assert.ok((d.value("distress") as number) > 5, "the anniversary has made things worse");
    d.act("checkIn2");
    d.cont();
    assert.equal(d.value("s2Opened"), true);
  });

  test("the NCMHCE intake: a gentle trauma question after building trust is answered; pressing for detail costs the alliance", () => {
    const d = driver(docOf("ncmhce-intake-ptsd-alcohol"));
    d.act("limits");
    d.cont();
    d.act("askTrauma");
    assert.equal(d.value("traumaKnown"), true);
    d.cont();
    const before = d.value("rapport") as number;
    d.act("pushDetail");
    assert.ok((d.value("rapport") as number) < before);
  });
});
