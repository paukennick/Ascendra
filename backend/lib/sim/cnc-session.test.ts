// REQ-282 (docs/sims.md 22.19): the NASM Certified Nutrition Coach coaching sessions. Same screen,
// profile and pacing as the NBCC sessions (REQ-239): learner-paced turns, the
// clinical-session profile (harm = a required protective step not taken; here
// the referral a coach's scope requires), registered by course code and exact
// objective title. Each case has endings in all three classes, 3-4 critical
// criteria, KPIs, an expert path, a debrief per ending, golden paths that
// reach every ending but time_up and score every criterion both met and
// missed, and an explicit endingOrder.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CNC_OBJECTIVES, CNC_SESSION_DOCUMENTS, loadDocument } from "./documents.ts";
import { applyCommand, createRun, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, GoldenFile, ScenarioDoc } from "./engine/v1/index.ts";
import { pacingEligible } from "./server-run.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { NASMCNC_SIM_OBJECTIVES } from "../../supabase/seed/tracks/fitness";

const entryOf = (slug: string) => CNC_SESSION_DOCUMENTS.find((e) => e.slug === slug)!;
const docOf = (slug: string): ScenarioDoc => loadDocument(entryOf(slug));
const goldenOf = (slug: string): GoldenFile => JSON.parse(readFileSync(entryOf(slug).golden!, "utf8")) as GoldenFile;

describe("REQ-282: NASM-CNC coaching sessions", () => {
  test("two sessions, each registered to an active NASMCNC objective by exact title", () => {
    assert.deepEqual(CNC_SESSION_DOCUMENTS.map((e) => e.slug), ["cnc-crash-diet-request", "cnc-greens-powder-warfarin"]);
    assert.deepEqual(Object.values(CNC_OBJECTIVES).sort(), Object.values(NASMCNC_SIM_OBJECTIVES).sort());
    const track = CATALOG_TRACKS.find((t) => t.code === "NASMCNC")!;
    for (const e of CNC_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      assert.equal(d.objective, CNC_OBJECTIVES[e.slug], e.slug);
      assert.equal(activeUnits(track).filter((u) => u.objectives.includes(d.objective)).length, 1, e.slug);
      assert.equal(e.source, "authored");
    }
  });

  test("valid, session screen, clinical-session profile, learner-paced", () => {
    for (const e of CNC_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      assert.deepEqual(validateScenario(d).map(String), [], e.slug);
      assert.equal(d.screen.type, "session");
      assert.ok(d.screen.session!.gauges.length >= 3, e.slug);
      assert.equal(d.outcome.profile, "clinical-session");
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), e.slug);
      assert.equal(pacingEligible(d, "clinical"), false);
      assert.ok(d.outcome.noProgress, e.slug);
      assert.equal(d.engine.minor, 2);
      const conditional = Object.entries(d.endings).filter(([, x]) => x.when).map(([k]) => k);
      assert.deepEqual([...(d.endingOrder ?? [])].sort(), conditional.sort(), e.slug);
      assert.deepEqual([...new Set(Object.values(d.endings).map((x) => x.class))].sort(), ["harm", "recovered", "target"], e.slug);
      for (const k of Object.keys(d.endings)) assert.ok(d.scoring.debrief?.[k], `${e.slug}: debrief for ${k}`);
    }
  });

  test("3-4 critical criteria, KPIs with expert values, an expert path, sources dated and NASM's scope cited", () => {
    for (const e of CNC_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      const critical = d.scoring.criteria.filter((c) => c.critical).length;
      assert.ok(critical >= 3 && critical <= 4, `${e.slug}: ${critical} critical`);
      assert.ok(d.scoring.kpis!.length >= 3 && d.scoring.kpis!.every((k) => k.expert), e.slug);
      assert.ok(d.scoring.expertPath!.length >= 4, e.slug);
      for (const s of d.sources) assert.equal(s.checkedAt, "2026-11-14", s.cite);
      assert.ok(d.sources.some((s) => /nasm\.org/.test(s.url ?? "")), e.slug);
    }
  });

  test("golden paths reach every ending but time_up, score every criterion met and missed, and include Good, Mediocre and Bad", () => {
    for (const e of CNC_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      const g = goldenOf(e.slug);
      assert.ok(g.paths.length >= 5 && g.paths.length <= 7, `${e.slug}: ${g.paths.length} paths`);
      const reached = new Set(g.paths.map((p) => p.expect.ending));
      for (const k of Object.keys(d.endings)) if (k !== "time_up") assert.ok(reached.has(k), `${e.slug}: ${k}`);
      const ratings = new Set(g.paths.map((p) => p.expect.rating));
      for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r as never), `${e.slug}: no ${r}`);
      for (const c of d.scoring.criteria) {
        const scores = new Set(g.paths.map((p) => p.expect.criteria?.[c.id]));
        assert.ok(scores.has("met") && scores.has("missed"), `${e.slug}: ${c.id}`);
      }
    }
  });
});

describe("coach scope in the CNC sessions", () => {
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
      choose: (choice: string) => send({ type: "choose", prompt: run.state.openPrompt, choice }),
      cont: () => {
        const w = waits(run)[0];
        send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
      },
      value: (n: string) => readValue(run, n),
    };
  }

  test("the crash-diet case: asked cold about feelings she laughs it off; after a recall and some trust she tells you", () => {
    const cold = driver(docOf("cnc-crash-diet-request"));
    cold.act("askFeelings");
    assert.equal(cold.value("cuesFound"), false);
    const warm = driver(docOf("cnc-crash-diet-request"));
    warm.act("askDay");
    warm.cont();
    warm.act("askFeelings");
    assert.equal(warm.value("cuesFound"), true);
  });

  test("the warfarin case: both a sudden increase and a sudden cut in greens are harm; only the prescriber route is target", () => {
    const d = docOf("cnc-greens-powder-warfarin");
    assert.equal(d.endings.endorsedHarm.class, "harm");
    assert.equal(d.endings.cutHarm.class, "harm");
    assert.match(d.endings.checked.when!, /referred/);
    assert.ok(d.sources.some((s) => /VitaminK/.test(s.url ?? "")), "cites the ODS vitamin K fact sheet");
  });
});
