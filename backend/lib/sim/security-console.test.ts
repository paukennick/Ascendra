// REQ-231 (docs/sims.md 20, 20.1, 22.7): the security operations console
// screen type and the Security+ incidents. The bindings are validated like
// the session's; the security profile refuses a looser threshold; the
// attacker moves on the analyst's clock; a V8 band is the same incident
// registered to the SY0-801 objective; every catalog objective title fits
// the document schema (FAIL-1321).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { applyCommand, createRun, lintScenario, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, ScenarioDoc } from "./engine/v1/index.ts";
import type { Run } from "./engine/v1/engine.ts";
import { clientDocument } from "./content-hash.ts";
import { pacingEligible } from "./server-run.ts";
import { scenarioSchema } from "./schema.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { isPerformanceObjective } from "../../scripts/generate-labs-lib.ts";

const SECURITY = ALL_DOCUMENTS.filter((e) => e.course === "SECPLUS" || e.course === "SECPLUSV8");
const docOf = (course: string, slug: string): ScenarioDoc => loadDocument(SECURITY.find((e) => e.course === course && e.slug === slug)!);
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
    finish: () => {
      while (readValue(run, "busy") === true && run.state.phase === "incident") {
        const w = waits(run)[0];
        send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
      }
    },
    value: (n: string) => readValue(run, n),
    minutes: () => (run.state.tick * run.c.dt) / 60,
  };
}

describe("Security+ incidents on the security console", () => {
  test("three incidents in SECPLUS and the same three as V8 bands, each valid, on the console, learner-paced", () => {
    assert.deepEqual(SECURITY.filter((e) => e.course === "SECPLUS").map((e) => e.kind), ["scenario", "scenario", "scenario"]);
    assert.deepEqual(SECURITY.filter((e) => e.course === "SECPLUSV8").map((e) => e.kind), ["band", "band", "band"]);
    for (const e of SECURITY) {
      const d = loadDocument(e);
      assert.deepEqual(errors(d), [], e.slug);
      assert.equal(d.screen.type, "security-console");
      assert.equal(d.outcome.profile, "security");
      assert.ok(d.endingOrder && d.endingOrder.length >= 2, "engine 1.2 ending order");
      assert.equal(d.engine.minor, 2);
      // Learner-paced (22.7): no running phase, so pacing never applies.
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), e.slug);
      assert.equal(pacingEligible(d, "general"), false);
      assert.ok(d.scoring.criteria.filter((c) => c.critical).length >= 3 && d.scoring.criteria.filter((c) => c.critical).length <= 4, `${e.slug}: 3-4 critical criteria`);
    }
  });

  test("a V8 band changes only the objective and its secondaries", () => {
    for (const b of SECURITY.filter((e) => e.kind === "band")) {
      const v8 = loadDocument(b);
      const base = docOf("SECPLUS", b.slug.replace(/-v8$/, ""));
      const strip = (d: ScenarioDoc) => ({ ...d, slug: "", objective: "", secondaryObjectives: [] });
      assert.deepEqual(strip(v8), strip(base), b.slug);
      assert.notEqual(v8.objective, base.objective);
    }
  });

  test("each SY0-701 incident is on its own objective, and each meets the generator's selection rule", () => {
    const objs = SECURITY.filter((e) => e.course === "SECPLUS").map((e) => loadDocument(e).objective);
    assert.equal(new Set(objs).size, 3);
    for (const o of objs) assert.ok(isPerformanceObjective(o, "general"), o);
  });

  test("the client document keeps the console bindings and drops the rubric", () => {
    for (const e of SECURITY) {
      const c = clientDocument(loadDocument(e)) as unknown as Record<string, any>;
      assert.ok(c.screen.console.alerts.length >= 1 && c.screen.console.assets.length >= 1);
      assert.equal(c.scoring, undefined);
      for (const m of Object.values(c.reasoning) as { parts?: unknown }[]) assert.equal(m.parts, undefined);
    }
  });
});

describe("console bindings (screen.console)", () => {
  const base = docOf("SECPLUS", "phish-to-account-takeover");

  test("a security-console screen without bindings is refused", () => {
    const d = clone(base);
    delete d.screen.console;
    assert.ok(errors(d).some((e) => e.includes("screen.console")));
  });

  test("alerts, events and assets bind to real state with the right types", () => {
    const d = clone(base);
    const c = d.screen.console!;
    c.alerts[0].open = "stage";
    c.alerts[0].at = "acctOpen";
    (c.alerts[1] as { severity: string }).severity = "urgent";
    c.events[0].when = "nosuchname";
    c.events[1].source = "";
    c.assets[0].tone = '"purple"';
    c.assets[1].spokenLabel = "";
    c.assets[2].id = c.assets[0].id;
    const e = errors(d).join("\n");
    assert.match(e, /alerts\[0\]\.open/);
    assert.match(e, /alerts\[0\]\.at/);
    assert.match(e, /alerts\[1\]\.severity/);
    assert.match(e, /events\[0\]\.when/);
    assert.match(e, /events\[1\]\.source/);
    assert.match(e, /assets\[0\]\.tone/);
    assert.match(e, /assets\[1\].*spokenLabel/);
    assert.match(e, /duplicate id/);
  });

  test("the security profile refuses a looser threshold than its default", () => {
    const d = clone(base);
    d.outcome.thresholds.containWindow.value = 4000;
    d.outcome.thresholds.containSpread.value = 1;
    const p = lintScenario(d, { now: "2026-11-11" }).map((x) => `${x.path}: ${x.message}`).join("\n");
    assert.match(p, /containWindow.*looser/);
    assert.match(p, /containSpread.*looser/);
  });
});

describe("the attacker moves on the analyst's clock", () => {
  test("a task costs analyst time, and nothing else can start until it finishes", () => {
    const d = driver(docOf("SECPLUS", "phish-to-account-takeover"));
    d.act("reviewSignins");
    assert.equal(d.run.state.tick, 0);
    const r = applyCommand(d.run, { seq: 99, tick: 0, type: "act", action: "searchMail" } as Command);
    assert.equal(r.ok, false);
    d.finish();
    assert.equal(d.minutes(), 5);
  });

  test("a password reset does not end the stolen session; the attacker builds persistence at 15 minutes", () => {
    const d = driver(docOf("SECPLUS", "phish-to-account-takeover"));
    d.act("containAccount", { who: "jpike", how: "reset" });
    d.finish();
    for (let i = 0; i < 2; i++) {
      d.act("watch");
      d.finish();
    }
    assert.equal(d.value("acctOpen"), true);
    assert.equal(typeof d.value("ruleAt"), "number", "the inbox rule was made");
  });

  test("ransomware: encryption runs until FS01 is isolated, then stops", () => {
    const d = driver(docOf("SECPLUS", "ransomware-file-server"));
    const at0 = d.value("encrypted") as number;
    d.act("triage");
    d.finish();
    const at5 = d.value("encrypted") as number;
    assert.ok(at5 > at0);
    d.act("isolateHost", { host: "fs01", how: "edr" });
    d.finish();
    d.act("watch");
    d.finish();
    const later = d.value("encrypted") as number;
    d.act("watch");
    d.finish();
    assert.equal(d.value("encrypted"), later, "no more encryption once isolated");
  });

  test("cloud: deactivating the leaked key alone leaves the attacker's administrator working", () => {
    const d = driver(docOf("SECPLUS", "cloud-iam-backdoor"));
    d.act("quarantine", { which: "ci" });
    d.finish();
    assert.equal(d.value("attackerActive"), true);
    d.act("quarantine", { which: "user" });
    d.finish();
    assert.equal(d.value("attackerActive"), false);
    assert.equal(typeof d.value("allOffAt"), "number");
  });
});

// REQ-231 (FAIL-1321): a sim is registered by the exact objective title, and
// the document schema capped it at 400 characters while 17 catalog titles
// were longer, so a sim could not be attached to them at all.
test("every catalog objective title fits the scenario schema's objective field", () => {
  const doc = clone(docOf("SECPLUS", "phish-to-account-takeover"));
  for (const t of CATALOG_TRACKS) {
    for (const u of activeUnits(t)) {
      for (const o of u.objectives) {
        doc.objective = o;
        const r = scenarioSchema.safeParse(doc);
        assert.ok(r.success || !r.error.issues.some((i) => i.path[0] === "objective"), `${t.code}: "${o.slice(0, 60)}..." (${o.length} chars)`);
      }
    }
  }
});
