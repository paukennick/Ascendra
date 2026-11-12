// REQ-232: the PT treatment-session renderer's pure parts against the seeded
// DPT documents: the view model (patient, vitals as tiles, activity, tests
// and measures, red flags, dosage, stopping rules), what the screen reader
// hears (a met rule or a red flag at once, new results politely and
// rate-limited, "Read the patient"), and the golden paths replayed through
// the app's engine copy.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { advance, applyCommand, createRun, stateHash } from "./engine/v1/engine.ts";
import { replayGoldenPath } from "./engine/v1/validate.ts";
import type { Command, ScenarioDoc } from "./engine/v1/types.ts";
import type { Run } from "./engine/v1/engine.ts";
import { announce, newAnnouncer, POLITE_EVERY_MS } from "./runtime/announcer.ts";
import { alarmTexts, runView, tileViews, treatmentAlarmTexts, treatmentNews, treatmentView } from "./runtime/view.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "..", "..", "backend", "supabase", "seed", "sims", "DPT");
const SLUGS = ["icu-early-mobility", "tka-gait-dvt-red-flag", "stroke-balance-fall-risk"];
const doc = (slug: string): ScenarioDoc => JSON.parse(readFileSync(join(dir, `${slug}.sim.json`), "utf8")) as ScenarioDoc;
const golden = (slug: string) => JSON.parse(readFileSync(join(dir, `${slug}.golden.json`), "utf8"));

function driver(slug: string) {
  const run: Run = createRun(doc(slug), 1);
  let seq = 0;
  const send = (c: Record<string, unknown>) => assert.ok(applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command).ok, JSON.stringify(c));
  return {
    run,
    act: (action: string, params?: Record<string, string>) => send({ type: "act", action, ...(params ? { params } : {}) }),
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
  };
}

describe("treatment session view model", () => {
  test("at the start: the patient, the vitals as spoken tiles, every rule shown and none met, no results yet", () => {
    for (const slug of SLUGS) {
      const run = createRun(doc(slug), 1);
      const v = treatmentView(run)!;
      assert.ok(v.name.length > 0);
      assert.ok(v.presentation.length > 20 && !v.presentation.includes("{"), "the presentation is rendered from state");
      assert.ok(v.activity && !v.activity.includes("{"));
      assert.ok(v.rules.length >= 3);
      for (const r of v.rules) assert.match(r.a11y, /: not met\. /);
      assert.deepEqual(treatmentAlarmTexts(v), []);
      assert.equal(v.measures.length, 0);
      const tiles = tileViews(run);
      assert.ok(tiles.length >= 3, "a treatment session's vitals are read as tiles");
      for (const t of tiles) assert.ok(t.a11y.startsWith(t.spokenLabel));
      assert.deepEqual(runView(run).treatment, v);
    }
  });

  test("a bedside or session document has no treatment view", () => {
    const cna = JSON.parse(readFileSync(join(dir, "..", "CNA", "resident-found-on-floor.sim.json"), "utf8")) as ScenarioDoc;
    assert.equal(treatmentView(createRun(cna, 1)), null);
  });

  test("ICU: the SpO2 rule is met while she marches on FiO2 0.45, and it is spoken at once", () => {
    const d = driver("icu-early-mobility");
    d.act("screen");
    d.act("toEdge");
    d.wait(60);
    d.act("stand");
    const before = treatmentView(d.run)!;
    d.act("march");
    d.wait(120);
    const after = treatmentView(d.run)!;
    assert.equal(after.rules.find((r) => r.id === "ruleSpo2")!.met, true);
    assert.match(after.rules.find((r) => r.id === "ruleSpo2")!.a11y, /met now/);
    assert.ok(treatmentAlarmTexts(after).includes("Stop rule met: SpO2 below 88%"));
    assert.ok(alarmTexts(tileViews(d.run)).some((a) => /saturation low/.test(a)), "the SpO2 tile alarms too");
    let s = newAnnouncer();
    s = announce(s, { alarms: treatmentAlarmTexts(before), log: [], nowMs: 0, typing: false }).state;
    const r = announce(s, { alarms: treatmentAlarmTexts(after), log: [], nowMs: 1000, typing: false, news: treatmentNews(before, after) });
    assert.ok(r.out.some((o) => o.assertive && /SpO2 below 88%/.test(o.text)), JSON.stringify(r.out));
  });

  test("TKA: Thursday's calf findings are red flags, spoken as alarms; Monday's results arrive politely", () => {
    const d = driver("tka-gait-dvt-red-flag");
    const v0 = treatmentView(d.run)!;
    d.act("measureRom");
    const v1 = treatmentView(d.run)!;
    const news = treatmentNews(v0, v1);
    assert.ok(news.some((n) => n.startsWith("Left knee range of motion (Monday): Flexion 85")), news.join(" | "));
    assert.deepEqual(treatmentAlarmTexts(v1), []);
    d.wait(40);
    d.act("endVisit1");
    d.skip("daysT");
    d.act("measureGirth");
    d.act("palpateCalf");
    d.act("wells", { alt: "no" });
    const v2 = treatmentView(d.run)!;
    const flags = v2.measures.filter((m) => m.flag).map((m) => m.id);
    assert.deepEqual(flags.sort(), ["calf2", "girth2", "wells"]);
    assert.match(v2.measures.find((m) => m.id === "wells")!.result, /^4 points: DVT likely$/);
    assert.ok(v2.rules.find((r) => r.id === "ruleDvt")!.met);
    for (const f of ["calf2", "girth2", "wells"]) assert.ok(v2.measures.find((m) => m.id === f)!.a11y.startsWith("Red flag. "));
    assert.ok(!treatmentNews(v1, v2).some((n) => n.startsWith("Wells")), "red flags are not repeated as polite news");
  });

  test("Stroke: the dosage line names how intensity was set; polite news waits its turn", () => {
    const d = driver("stroke-balance-fall-risk");
    d.act("belt");
    const v0 = treatmentView(d.run)!;
    d.wait(40);
    d.act("standPrepared");
    d.act("walkTrain", { basis: "rpe" });
    const v1 = treatmentView(d.run)!;
    assert.ok(v1.dosage!.items.some((i) => /intensity by RPE/.test(i)));
    const news = treatmentNews(v0, v1);
    assert.ok(news.some((n) => n.startsWith("Given: ")));
    assert.ok(news.some((n) => /Walking fast/.test(n)), "the change of activity is spoken");
    let s = newAnnouncer();
    s = announce(s, { alarms: [], log: [], nowMs: 0, typing: false, news: ["first"] }).state;
    const held = announce(s, { alarms: [], log: [], nowMs: 1000, typing: false, news });
    assert.ok(!held.out.some((o) => !o.assertive), "within 10 s of the last polite sentence, news is held");
    const later = announce(held.state, { alarms: [], log: [], nowMs: 1000 + POLITE_EVERY_MS, typing: false });
    assert.ok(later.out.some((o) => !o.assertive));
  });
});

describe("DPT golden paths on the app's engine copy", () => {
  for (const slug of SLUGS) {
    test(`${slug}: every golden path reaches its ending and state hash`, () => {
      const d = doc(slug);
      for (const p of golden(slug).paths) {
        const r = replayGoldenPath(d, p, (run) => stateHash(run.state));
        assert.equal(r.error, null, `${p.id}: ${r.error}`);
        assert.deepEqual(r.mismatches, [], p.id);
        assert.equal(r.stateHash, p.expect.stateHash, p.id);
      }
    });
  }
});
