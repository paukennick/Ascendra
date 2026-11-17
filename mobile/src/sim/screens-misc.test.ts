// REQ-314 (docs/sims.md 22.27): the facility console, the sandbox report and
// the client trainer, against the seeded documents through the app's engine
// copy: each view model (state in words, ordering, the process tree's depth),
// what the screen reader hears at once and politely, the "Read" sentences,
// the capabilities the app advertises, and every golden path replayed.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyCommand, createRun, readValue, stateHash, waits } from "./engine/v1/engine.ts";
import { replayGoldenPath } from "./engine/v1/validate.ts";
import type { Command, ScenarioDoc } from "./engine/v1/types.ts";
import type { Run } from "./engine/v1/engine.ts";
import { runView } from "./runtime/view.ts";
import { facilityAlarmTexts, facilityNews, facilitySentence, facilityView } from "./runtime/facilityView.ts";
import { sandboxAlarmTexts, sandboxNews, sandboxSentence, sandboxView } from "./runtime/sandboxView.ts";
import { trainerAlarmTexts, trainerNews, trainerSentence, trainerView } from "./runtime/trainerView.ts";
import { SIM_RENDERERS, simCaps } from "./runtime/caps.ts";

const here = dirname(fileURLToPath(import.meta.url));
const seed = join(here, "..", "..", "..", "backend", "supabase", "seed", "sims");
const CASES: Record<string, string> = {
  "cpt-parq-chest-tightness": "NASMCPT",
  "cpt-squat-knees-cave": "NASMCPT",
  "cnc-ambivalent-food-record": "NASMCNC",
  "cissp-datahall-tailgate-cooling": "CISSP",
  "ceh-sandbox-invoice-loader": "CEH",
};
const doc = (slug: string): ScenarioDoc => JSON.parse(readFileSync(join(seed, CASES[slug], `${slug}.sim.json`), "utf8")) as ScenarioDoc;
const golden = (slug: string) => JSON.parse(readFileSync(join(seed, CASES[slug], `${slug}.golden.json`), "utf8"));

function play(slug: string, steps: (string | [string, Record<string, string>])[], run: Run = createRun(doc(slug), 1)): Run {
  let seq = run.lastSeq;
  const send = (c: Record<string, unknown>) => assert.ok(applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command).ok, JSON.stringify(c));
  for (const s of steps) {
    const [action, params] = typeof s === "string" ? [s, undefined] : s;
    send({ type: "act", action, ...(params ? { params } : {}) });
    while (readValue(run, "busy") === true && !run.state.ended) {
      const w = waits(run).find((x) => x.timer === "work") ?? waits(run)[0];
      send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
    }
  }
  return run;
}

describe("facility console view", () => {
  test("the tailgate is an open alarm spoken at once; zones, people and cameras say their state in words", () => {
    const run = createRun(doc("cissp-datahall-tailgate-cooling"), 1);
    const v = facilityView(run)!;
    assert.equal(v.openCount, 1);
    assert.match(v.alarms[0].a11y, /^High door alarm at 01:00(:00)?: Tailgating/);
    assert.deepEqual(facilityAlarmTexts(v), ["High door alarm: Tailgating at mantrap B: one badge, two people", "Unbadged man in hi-vis needs attention"]);
    assert.match(v.zones.find((z) => z.id === "hall")!.a11y, /Data hall, data center floor: in alarm/);
    assert.match(v.doors[0].a11y, /Mantrap B: tailgating detected/);
    assert.equal(v.doors[0].id, "d2", "newest door line first");
    assert.match(facilitySentence(v), /1 open alarm/);
    assert.equal(runView(run).facility?.site.name, "Harbor Point Data Center, night shift");
  });

  test("after the trip, the temperature rises out of range and is spoken; the standby unit brings it back", () => {
    const d = doc("cissp-datahall-tailgate-cooling");
    const run = play("cissp-datahall-tailgate-cooling", [["dispatch", { how: "pair" }], "suspendIn"]);
    let before = facilityView(run)!;
    for (let i = 0; i < 4; i++) play("cissp-datahall-tailgate-cooling", ["watch"], run);
    let after = facilityView(run)!;
    const news = facilityNews(before, after);
    assert.ok(news.some((n) => /new door log lines|New door log line/.test(n)) || news.some((n) => /now/.test(n)), news.join(" | "));
    // let it get warm
    for (let i = 0; i < 4; i++) play("cissp-datahall-tailgate-cooling", ["watch"], run);
    after = facilityView(run)!;
    const temp = after.environment.find((e) => e.id === "eTemp")!;
    assert.equal(temp.out, "high", temp.text);
    assert.ok(facilityAlarmTexts(after).includes("Row C inlet temperature too high"));
    before = after;
    play("cissp-datahall-tailgate-cooling", ["crac3"], run);
    for (let i = 0; i < 6; i++) play("cissp-datahall-tailgate-cooling", ["watch"], run);
    after = facilityView(run)!;
    assert.equal(after.environment.find((e) => e.id === "eTemp")!.out, null);
    assert.ok(d.screen.facility!.environment.length >= 1);
  });
});

describe("sandbox report view", () => {
  test("empty before analysis; the process tree nests under its parents once detonated; flagged lines say Malicious", () => {
    const run = createRun(doc("ceh-sandbox-invoice-loader"), 1);
    const v0 = sandboxView(run)!;
    assert.equal(v0.processes.length, 0);
    assert.equal(v0.flagged, 0);
    play("ceh-sandbox-invoice-loader", ["static", "detonate"], run);
    const v1 = sandboxView(run)!;
    assert.deepEqual(v1.processes.map((p) => [p.label, p.depth]), [["WINWORD.EXE", 0], ["powershell.exe", 1], ["updsvc.exe", 2]]);
    assert.match(v1.processes[1].a11y, /^Malicious\. Process powershell\.exe, started by WINWORD\.EXE, level 2/);
    assert.ok(v1.network.some((n) => !n.flag), "the benign update check is not flagged");
    const news = sandboxNews(v0, v1);
    assert.ok(news.some((n) => /new report lines/.test(n)), news.join(" | "));
    assert.match(sandboxSentence(v1), /marked malicious/);
    assert.deepEqual(sandboxAlarmTexts(v1), ["Workstation 114 infected"]);
  });

  test("indicators and rules carry a tone in words; a broad rule tests as too noisy; nothing is a link", () => {
    const run = play("ceh-sandbox-invoice-loader", ["static", "detonate", "iocs", "yaraBroad", "test"]);
    const v = sandboxView(run)!;
    assert.equal(v.rules[0].tone, "noisy");
    assert.match(v.rules[0].a11y, /too noisy.*Rule text: rule Any_Macro_Document/s);
    assert.ok(v.rules[0].text.includes("{") && !v.rules[0].text.includes("{{"), "literal braces render once");
    assert.ok(v.indicators.some((i) => i.tone === "benign"));
    for (const s of [...v.network.map((n) => n.label), ...v.indicators.map((i) => i.value)]) assert.ok(!/https?:\/\//.test(s), s);
  });
});

describe("client trainer view", () => {
  test("PAR-Q+ YES answers are flags; the stop rule is spoken while he exercises with a symptom", () => {
    const run = play("cpt-parq-chest-tightness", ["reviewParq", "stepTest"]);
    const v = trainerView(run)!;
    assert.ok(v.intake.filter((i) => i.flag).length >= 2);
    assert.ok(v.rules.find((r) => r.id === "rStop")!.met);
    const alarms = trainerAlarmTexts(v);
    assert.ok(alarms.some((a) => a.startsWith("Warning sign during exercise")), alarms.join(" | "));
    assert.match(trainerSentence(v), /Applies now: .*Warning sign during exercise/);
    assert.match(v.gauges[0].a11y, /^His trust in the trainer: /);
  });

  test("gauges are read in words and change politely; the journal is newest first", () => {
    const before = trainerView(createRun(doc("cnc-ambivalent-food-record"), 1))!;
    const run = play("cnc-ambivalent-food-record", ["openQ", "affirm", "reflect"]);
    const after = trainerView(run)!;
    assert.equal(before.gauges[0].word, "polite");
    assert.equal(after.gauges[0].word, "open");
    assert.ok(trainerNews(before, after).some((n) => n === "Rapport now open."));
    const knee = play("cpt-squat-knees-cave", ["front", ["program", { focus: "hip" }], "weeks"]);
    const kv = trainerView(knee)!;
    assert.match(kv.journal[0].text, /Four weeks/);
  });
});

describe("capabilities and goldens", () => {
  test("the app advertises the three screens at level 1", () => {
    for (const t of ["facility-console", "sandbox-report", "trainer"]) assert.ok(SIM_RENDERERS.some((r) => r.type === t && r.level === 1), t);
    assert.match(simCaps(), /facility-console@1,sandbox-report@1,trainer@1$/);
  });

  test("every golden path replays through the app's engine copy", () => {
    for (const slug of Object.keys(CASES)) {
      for (const p of golden(slug).paths) {
        const r = replayGoldenPath(doc(slug), p, (run) => stateHash(run.state));
        assert.deepEqual(r.mismatches, [], `${slug}/${p.id}`);
      }
    }
  });
});
