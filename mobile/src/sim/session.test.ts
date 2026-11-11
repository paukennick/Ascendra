// REQ-225: the client session renderer's pure parts against the seeded EPPP
// documents: the view model (client, gauges in words, notes, alerts, the
// record), what the screen reader hears (alerts at once, band changes and
// new notes politely, rate-limited), the conversation wait's label, and the
// golden paths replayed through the app's engine copy.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyCommand, createRun, stateHash, waits } from "./engine/v1/engine.ts";
import { replayGoldenPath } from "./engine/v1/validate.ts";
import type { Command, ScenarioDoc } from "./engine/v1/types.ts";
import type { Run } from "./engine/v1/engine.ts";
import { announce, newAnnouncer, POLITE_EVERY_MS } from "./runtime/announcer.ts";
import { gaugeWord, runView, sessionAlarmTexts, sessionNews, sessionView, waitLabel } from "./runtime/view.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "..", "..", "backend", "supabase", "seed", "sims", "EPPP");
const SLUGS = ["suicide-risk-safety-plan", "duty-to-protect-threat", "diagnostic-intake-mood"];
const doc = (slug: string): ScenarioDoc => JSON.parse(readFileSync(join(dir, `${slug}.sim.json`), "utf8")) as ScenarioDoc;
const golden = (slug: string) => JSON.parse(readFileSync(join(dir, `${slug}.golden.json`), "utf8"));

function play(slug: string, steps: (string | [string, Record<string, string>])[], choice: string): Run {
  const run = createRun(doc(slug), 1);
  let seq = 0;
  const send = (c: Record<string, unknown>) => assert.ok(applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command).ok, JSON.stringify(c));
  for (const s of steps) {
    const [action, params] = typeof s === "string" ? [s, undefined] : s;
    send({ type: "act", action, ...(params ? { params } : {}) });
    if (run.state.openPrompt) send({ type: "choose", prompt: run.state.openPrompt, choice });
    const w = waits(run)[0];
    if (w && run.state.phase === "session") send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
  }
  return run;
}

describe("client session view model", () => {
  test("bands become words; one word more than bands", () => {
    const g = { bands: [3, 6], words: ["guarded", "warming", "engaged"] };
    assert.equal(gaugeWord(g, 0), "guarded");
    assert.equal(gaugeWord(g, 2.9), "guarded");
    assert.equal(gaugeWord(g, 3), "warming");
    assert.equal(gaugeWord(g, 6), "engaged");
    assert.equal(gaugeWord(g, 10), "engaged");
  });

  test("at the start: the client, each gauge as one spoken element with its word, no notes yet", () => {
    for (const slug of SLUGS) {
      const v = sessionView(createRun(doc(slug), 1))!;
      assert.ok(v.name.length > 0);
      assert.ok(v.presentation.length > 10, "the presentation is rendered from state");
      assert.ok(!v.presentation.includes("{"), "no unrendered template");
      assert.deepEqual(v.gauges.map((g) => g.id), ["rapport", "distress", "disclosure"]);
      for (const g of v.gauges) assert.match(g.a11y, new RegExp(`^${g.spokenLabel}: [a-z ]+, \\d+ of ${g.max}$`));
      assert.equal(v.notes.length, 0);
      assert.deepEqual(sessionAlarmTexts(v), []);
    }
    // A bedside or board run has no session view.
    assert.equal(runView(createRun(doc(SLUGS[0]), 1)).tiles.length, 0);
  });

  test("the handgun is an alert until it is secured, then a plain note", () => {
    const steps = ["limits", "checkIn", "reflect", "askSI", "askMethod"];
    const before = sessionView(play("suicide-risk-safety-plan", steps, "noRise"))!;
    const alert = before.notes.find((n) => n.id === "gunAlert")!;
    assert.equal(alert.alert, true);
    assert.match(alert.a11y, /^Alert\. Lethal means/);
    assert.equal(sessionAlarmTexts(before).length, 1);
    const after = sessionView(play("suicide-risk-safety-plan", [...steps, "askIntent", "askReasons", ["planStep", { step: "means" }]], "noRise"))!;
    assert.equal(after.notes.find((n) => n.id === "gunAlert")!.alert, false);
    assert.ok(after.notes.some((n) => n.id === "gunSafe"));
    assert.deepEqual(sessionAlarmTexts(after), []);
  });

  test("what changed is spoken: a gauge's new word, a new note, a new record line", () => {
    const a = sessionView(play("duty-to-protect-threat", [], "victimPolice"))!;
    const b = sessionView(play("duty-to-protect-threat", ["limits", "checkIn", "reflect", "reflect"], "victimPolice"))!;
    const news = sessionNews(a, b);
    assert.ok(news.includes("Rapport now engaged."), news.join(" | "));
    assert.ok(news.some((n) => n.startsWith("What he said:")));
    assert.deepEqual(sessionNews(b, b), [], "nothing new, nothing spoken");
    assert.deepEqual(sessionNews(null, b), [], "the first frame speaks nothing");
  });

  test("an actual threat is announced at once; band news waits its polite turn", () => {
    const quiet = sessionView(play("duty-to-protect-threat", ["limits", "checkIn"], "victimPolice"))!;
    const threat = sessionView(play("duty-to-protect-threat", ["limits", "checkIn", "reflect", "explore"], "victimPolice"))!;
    let s = newAnnouncer();
    s = announce(s, { alarms: sessionAlarmTexts(quiet), log: [], nowMs: 0, typing: false, news: ["Rapport now warming."] }).state;
    const r = announce(s, { alarms: sessionAlarmTexts(threat), log: [], nowMs: 1000, typing: false, news: sessionNews(quiet, threat) });
    assert.ok(r.out.some((o) => o.assertive && /Threat/.test(o.text)), JSON.stringify(r.out));
    assert.ok(!r.out.some((o) => !o.assertive), "polite news within 10 s is held");
    const later = announce(r.state, { alarms: sessionAlarmTexts(threat), log: [], nowMs: 1000 + POLITE_EVERY_MS, typing: false });
    assert.ok(later.out.some((o) => !o.assertive));
  });

  test("the conversation wait reads as itself, with the session time it takes", () => {
    const run = createRun(doc("diagnostic-intake-mood"), 1);
    assert.ok(applyCommand(run, { seq: 1, tick: 0, type: "act", action: "askNeuro" } as Command).ok);
    const l = waitLabel(run, waits(run)[0]);
    assert.equal(l.label, "Let the conversation continue (about 4 min)");
  });

  test("the record shows the documentation as it is written", () => {
    const run = play("diagnostic-intake-mood", ["limits", "askMood", "askNeuro"], "hypo");
    const v = sessionView(run)!;
    assert.ok(v.record!.items.some((i) => /2 of 4/.test(i)));
  });
});

describe("EPPP golden paths on the app's engine copy", () => {
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
