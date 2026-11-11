// REQ-232 (docs/sims.md 8.2, 9.2, 22.7): the PT treatment-session screen type
// and the DPT cases. The bindings are validated like the bedside tiles and the
// client session's; the physical-therapy profile refuses a looser threshold;
// the patient's vitals move on their own during exertion and recovery (which
// is why these sims take the clinical pace rule); the renderer is on by
// default and advertised by the app.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DPT_OBJECTIVES, DPT_TREATMENT_DOCUMENTS, loadDocument } from "./documents.ts";
import { advance, applyCommand, createRun, lintScenario, readValue, validateScenario } from "./engine/v1/index.ts";
import type { Command, ScenarioDoc } from "./engine/v1/index.ts";
import type { Run } from "./engine/v1/engine.ts";
import { clientDocument } from "./content-hash.ts";
import { DEFAULT_RENDERERS, pacingEligible, parseCaps, renderersOn, runnable } from "./server-run.ts";
import { safetyFamilyOf } from "./lint.ts";
import { PROFILE_THRESHOLDS } from "./engine/v1/validate.ts";

const docOf = (slug: string): ScenarioDoc => loadDocument(DPT_TREATMENT_DOCUMENTS.find((e) => e.slug === slug)!);
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
    act: (action: string, params?: Record<string, string>) => send({ type: "act", action, ...(params ? { params } : {}) }),
    answer: () => {
      if (run.state.openReasoning) send({ type: "reason", moment: run.state.openReasoning, answered: true });
    },
    // Real time in the running phase, answering the written question on the way.
    wait: (seconds: number) => {
      const to = run.state.tick + Math.round(seconds / run.c.dt);
      while (run.state.tick < to && !run.state.ended) {
        if (run.state.openReasoning) send({ type: "reason", moment: run.state.openReasoning, answered: true });
        if (!advance(run)) break;
      }
    },
    skip: (timer: string) => {
      const w = run.state.timers.find((x) => x.timer === timer)!;
      send({ type: "skip", timer, instance: w.id, to: w.due });
    },
    value: (n: string) => readValue(run, n) as number,
  };
}

describe("treatment-session bindings (screen.treatment)", () => {
  const base = docOf("icu-early-mobility");

  test("every DPT case is valid, uses the treatment-session screen and the physical-therapy profile, and runs in real time", () => {
    assert.equal(DPT_TREATMENT_DOCUMENTS.length, 3);
    for (const e of DPT_TREATMENT_DOCUMENTS) {
      const d = loadDocument(e);
      assert.deepEqual(errors(d), [], e.slug);
      assert.equal(d.screen.type, "treatment-session");
      assert.equal(d.outcome.profile, "physical-therapy");
      assert.ok(DPT_OBJECTIVES.includes(d.objective as (typeof DPT_OBJECTIVES)[number]), d.objective);
      assert.ok(d.screen.treatment!.vitals.length >= 3, "heart rate, saturation and more");
      assert.ok(d.screen.treatment!.rules.length >= 3, "stopping and escalation rules on screen");
      assert.ok(d.endingOrder && d.endingOrder.length >= 3, "an explicit ending order (engine 1.2)");
      // The clinical pace rule (docs/sims.md 5.4a): a running phase in a clinical track.
      assert.ok(Object.values(d.phases).some((p) => p.clock === "running"));
      assert.equal(safetyFamilyOf(d), "clinical");
      assert.equal(pacingEligible(d, "clinical"), true);
    }
    const objectives = DPT_TREATMENT_DOCUMENTS.map((e) => loadDocument(e).objective).sort();
    assert.deepEqual(objectives, [...DPT_OBJECTIVES].sort(), "one sim per objective");
  });

  test("a treatment-session screen without bindings is refused", () => {
    const d = clone(base);
    delete d.screen.treatment;
    assert.ok(errors(d).some((e) => e.includes("screen.treatment")));
  });

  test("the patient needs a name, vitals and at least one stopping rule", () => {
    const d = clone(base);
    d.screen.treatment!.patient.name = "";
    d.screen.treatment!.vitals = [];
    d.screen.treatment!.rules = [];
    const e = errors(d).join("\n");
    assert.match(e, /screen\.treatment\.patient/);
    assert.match(e, /screen\.treatment\.vitals/);
    assert.match(e, /screen\.treatment\.rules/);
  });

  test("vitals are checked exactly as bedside tiles", () => {
    const d = clone(base);
    d.screen.treatment!.vitals[0].spokenLabel = "";
    d.screen.treatment!.vitals[1].value = "nosuchname";
    d.screen.treatment!.vitals.push({ ...d.screen.treatment!.vitals[2] });
    const e = errors(d).join("\n");
    assert.match(e, /vitals\[0\].*spokenLabel/);
    assert.match(e, /vitals\[1\]\.value/);
    assert.match(e, /duplicate tile id spo2/);
  });

  test("measures, dosage and rules bind to real state with bool conditions and unique ids", () => {
    const d = clone(base);
    const tr = d.screen.treatment!;
    tr.measures![0].when = "spo2";
    tr.measures![3].flag = "nosuchname";
    tr.dosage!.items[0].when = "hr";
    tr.rules[0].met = "fio2";
    tr.rules[1].id = tr.measures![0].id;
    const e = errors(d).join("\n");
    assert.match(e, /measures\[0\]\.when/);
    assert.match(e, /measures\[3\]\.flag/);
    assert.match(e, /dosage\.items\[0\]\.when/);
    assert.match(e, /rules\[0\]\.met/);
    assert.match(e, /rules\[1\].*duplicate id/);
  });

  test("the physical-therapy profile refuses a looser threshold than its default", () => {
    const d = clone(base);
    d.outcome.thresholds.spo2Floor.value = 85;
    d.outcome.thresholds.stopWindow.value = 300;
    d.outcome.thresholds.escalateWindow.value = 1800;
    const p = lintScenario(d, { now: "2026-11-11" }).map((x) => `${x.path}: ${x.message}`).join("\n");
    assert.match(p, /spo2Floor.*looser/);
    assert.match(p, /stopWindow.*looser/);
    assert.match(p, /escalateWindow.*looser/);
    assert.deepEqual(Object.keys(PROFILE_THRESHOLDS["physical-therapy"]).sort(), ["escalateWindow", "spo2Floor", "stopWindow"]);
  });

  test("the client document keeps the bindings and drops the rubric", () => {
    for (const e of DPT_TREATMENT_DOCUMENTS) {
      const c = clientDocument(loadDocument(e)) as unknown as Record<string, any>;
      assert.ok(c.screen.treatment.rules.length >= 1);
      assert.equal(c.scoring, undefined);
      for (const m of Object.values(c.reasoning) as { parts?: unknown }[]) assert.equal(m.parts, undefined);
    }
  });
});

describe("the patient responds to exertion on the clock (why the clinical pace rule applies)", () => {
  test("ICU: with no command, SpO2 keeps falling while she marches, and HR settles within 5 minutes of rest", () => {
    const d = driver(docOf("icu-early-mobility"));
    d.act("screen");
    d.act("toEdge");
    d.wait(60);
    d.act("stand");
    d.act("march");
    const s0 = d.value("spo2");
    d.wait(60);
    const s1 = d.value("spo2");
    d.wait(30);
    assert.ok(d.value("spo2") < s1 && s1 < s0, `SpO2 ${s0} -> ${s1} -> ${d.value("spo2")} with no command`);
    assert.ok(d.value("spo2") < 88, "marching on FiO2 0.45 takes her below the floor");
    const peak = d.value("hr");
    d.act("sitRest");
    d.wait(300);
    assert.ok(d.value("hr") < peak - 10, `HR ${peak} -> ${d.value("hr")} after 5 min seated`);
    assert.ok(d.value("spo2") >= 88, "rest brings her saturation back above the floor");
  });

  test("Stroke: on metoprolol, his heart rate barely rises at near-maximal walking, so a heart-rate target over-drives him", () => {
    const d = driver(docOf("stroke-balance-fall-risk"));
    d.act("belt");
    d.wait(40);
    d.act("standPrepared");
    d.act("walkTrain", { basis: "hr" });
    d.wait(90);
    assert.ok(d.value("hr") < 85, `HR ${d.value("hr")} stays low on the beta blocker`);
    assert.ok(d.value("rpe") >= 17, `RPE ${d.value("rpe")} is near maximal`);
  });

  test("Stroke: standing after a long sit drops his systolic pressure by 20 or more; standing in stages does not", () => {
    const plain = driver(docOf("stroke-balance-fall-risk"));
    plain.act("belt");
    plain.wait(150);
    const seated = plain.value("sbp");
    plain.act("stand");
    plain.wait(20);
    assert.ok(seated - plain.value("sbp") >= 20, `drop ${seated - plain.value("sbp")}`);
    assert.equal(readValue(plain.run, "presyncope"), true);
    const staged = driver(docOf("stroke-balance-fall-risk"));
    staged.act("belt");
    staged.wait(150);
    staged.act("standPrepared");
    staged.wait(20);
    assert.equal(readValue(staged.run, "presyncope"), false);
  });

  test("TKA: an unscreened clot embolizes about 12 minutes into Thursday's visit; a same-day referral prevents it", () => {
    const go = (refer: boolean) => {
      const d = driver(docOf("tka-gait-dvt-red-flag"));
      d.wait(40);
      d.act("endVisit1");
      d.skip("daysT");
      assert.equal(d.run.state.phase, "visit2");
      if (refer) {
        d.act("askHistory");
        d.act("callSurgeon");
      }
      d.wait(780);
      return readValue(d.run, "pe");
    };
    assert.equal(go(false), true);
    assert.equal(go(true), false);
  });
});

describe("the renderer switch and capabilities", () => {
  test("a hyphenated screen type survives the capability header (FAIL-1340)", () => {
    const caps = parseCaps("protocol=1;engine=1.2;renderers=bedside@3,treatment-session@1");
    assert.deepEqual(caps!.renderers, [{ type: "bedside", level: 3 }, { type: "treatment-session", level: 1 }]);
  });

  test("treatment-session is on by default and an app advertising it at level 1 is offered the DPT cases", () => {
    assert.ok((DEFAULT_RENDERERS as readonly string[]).includes("treatment-session"));
    assert.ok(renderersOn({}).includes("treatment-session"));
    assert.ok(!renderersOn({ SIMS_RENDERERS: "bedside,board,session" }).includes("treatment-session"));
    const v = { engine_major: 1, engine_minor: 2, renderer_level: 1, screen_type: "treatment-session" };
    assert.equal(runnable(v, parseCaps("protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1,treatment-session@1")), true);
    // An app that does not know the screen is told to update, never offered it.
    assert.equal(runnable(v, parseCaps("protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1")), false);
  });
});
