// REQ-225 (docs/sims.md 8.2, 9.2, 20.2): the client session screen type and
// the EPPP sessions. The bindings are validated like the board's; the
// clinical-session profile refuses a looser threshold; the people layer
// moves with choices (disclosure needs trust) and with time (the hour ends
// the session); the documents need no course in the database (fixtures).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { EPPP_OBJECTIVES, EPPP_SESSION_DOCUMENTS, loadDocument } from "./documents.ts";
import { applyCommand, createRun, lintScenario, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, ScenarioDoc } from "./engine/v1/index.ts";
import type { Run } from "./engine/v1/engine.ts";
import { clientDocument } from "./content-hash.ts";
import { pacingEligible } from "./server-run.ts";

const docOf = (slug: string): ScenarioDoc => loadDocument(EPPP_SESSION_DOCUMENTS.find((e) => e.slug === slug)!);
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
    choose: (choice: string) => send({ type: "choose", prompt: run.state.openPrompt, choice }),
    cont: () => {
      const w = waits(run)[0];
      send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
    },
    value: (n: string) => readValue(run, n),
  };
}

describe("client session bindings (screen.session)", () => {
  const base = docOf("suicide-risk-safety-plan");

  test("every EPPP session is valid, uses the session screen and the clinical-session profile, and is turn-based", () => {
    assert.equal(EPPP_SESSION_DOCUMENTS.length, 3);
    for (const e of EPPP_SESSION_DOCUMENTS) {
      const d = loadDocument(e);
      assert.deepEqual(errors(d), [], e.slug);
      assert.equal(d.screen.type, "session");
      assert.equal(d.outcome.profile, "clinical-session");
      assert.ok(EPPP_OBJECTIVES.includes(d.objective as (typeof EPPP_OBJECTIVES)[number]), d.objective);
      // Learner-paced (docs/sims.md 5.4a): no running phase, so no pace, focused start or calm skip in any family.
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"));
      assert.equal(pacingEligible(d, "clinical"), false);
    }
  });

  test("a session screen without bindings is refused", () => {
    const d = clone(base);
    delete d.screen.session;
    assert.ok(errors(d).some((e) => e.includes("screen.session")));
  });

  test("a gauge needs one word more than bands, rising bands, a number value and a spoken label", () => {
    const d = clone(base);
    const g = d.screen.session!.gauges[0];
    g.words = ["guarded", "engaged"];
    g.bands = [6, 3];
    g.value = "talking";
    g.spokenLabel = "";
    const e = errors(d).join("\n");
    assert.match(e, /gauges\[0\]\.words/);
    assert.match(e, /gauges\[0\]\.bands/);
    assert.match(e, /gauges\[0\]\.value/);
    assert.match(e, /spokenLabel/);
  });

  test("notes and record bind to real state with bool conditions", () => {
    const d = clone(base);
    d.screen.session!.notes![0].when = "rapport";
    d.screen.session!.record!.items[0].when = "nosuchname";
    const e = errors(d).join("\n");
    assert.match(e, /notes\[0\]\.when/);
    assert.match(e, /record\.items\[0\]\.when/);
  });

  test("the clinical-session profile refuses a looser threshold than its default", () => {
    const d = clone(base);
    d.outcome.thresholds.allianceTarget.value = 4;
    d.outcome.thresholds.safetyWindow.value = 1800;
    const p = lintScenario(d, { now: "2026-11-10" }).map((x) => `${x.path}: ${x.message}`).join("\n");
    assert.match(p, /allianceTarget.*looser/);
    assert.match(p, /safetyWindow.*looser/);
  });

  test("the client document keeps the bindings and drops the rubric", () => {
    for (const e of EPPP_SESSION_DOCUMENTS) {
      const c = clientDocument(loadDocument(e)) as unknown as Record<string, any>;
      assert.ok(c.screen.session.gauges.length >= 1);
      assert.equal(c.scoring, undefined);
      for (const m of Object.values(c.reasoning) as { parts?: unknown }[]) assert.equal(m.parts, undefined);
    }
  });
});

describe("the people layer moves with choices and time", () => {
  test("disclosure needs trust: a cold direct question is denied, the same question after rapport is answered", () => {
    const cold = driver(docOf("suicide-risk-safety-plan"));
    cold.act("askSI");
    assert.equal(cold.value("siKnown"), false);
    assert.equal(cold.value("siDenied"), true);

    const warm = driver(docOf("suicide-risk-safety-plan"));
    warm.act("limits");
    assert.equal(warm.run.state.openPrompt, "askingSafe", "the unscored prediction opens once trust is there");
    warm.choose("noRise");
    warm.cont();
    warm.act("askSI");
    assert.equal(warm.value("siKnown"), true);
    assert.ok((warm.value("disclosed") as number) >= 3);
  });

  test("an exchange takes session time: no new question until the conversation continues", () => {
    const d = driver(docOf("duty-to-protect-threat"));
    d.act("checkIn");
    assert.equal(d.run.state.tick, 0);
    const r = applyCommand(d.run, { seq: 99, tick: 0, type: "act", action: "reflect" } as Command);
    assert.equal(r.ok, false);
  });

  test("time moves the client: high rapport settles distress while the conversation goes on", () => {
    const d = driver(docOf("diagnostic-intake-mood"));
    for (let i = 0; i < 3; i++) {
      d.act(i === 0 ? "limits" : "reflect");
      d.cont();
    }
    assert.ok((d.value("rapport") as number) >= 6);
    const before = d.value("distress") as number;
    d.act("askFunction"); // 2 min, no change to distress of its own
    d.cont();
    assert.ok((d.value("distress") as number) < before, "distress eases with time once rapport is high");
  });

  test("the hour ends the session mid-conversation and opens the written formulation", () => {
    // The same trigger with the hour shortened to 10 minutes.
    const doc = clone(docOf("diagnostic-intake-mood"));
    doc.params.sessionEnd.value = 600;
    const d = driver(doc);
    for (const a of ["limits", "askMood", "askNeuro"]) {
      d.act(a);
      d.cont();
    }
    assert.equal(d.run.state.phase, "session");
    d.act("askCog"); // 3 min: crosses minute 10
    if (d.run.state.openPrompt) d.choose("hypo");
    d.cont();
    assert.equal(d.run.state.phase, "note");
    assert.equal(d.run.state.tick * d.run.c.dt, 600, "the skip stops at the end of the hour");
    assert.equal(waits(d.run).length, 0, "the conversation wait is cancelled");
    assert.equal(d.run.state.openReasoning, "formulation");
    assert.ok(d.run.log.some((l) => /hour is up/.test(l.text)));
  });
});
