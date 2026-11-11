// REQ-231: the security console renderer's pure parts against the seeded
// Security+ documents: the view model (alert queue newest first with open
// alerts on top, log lines newest first, assets with a status and a tone in
// words), what the screen reader hears (open alerts at once, asset changes
// and new log lines politely, summarized and rate-limited), "Read the
// console", the capabilities the app advertises, and the golden paths
// replayed through the app's engine copy.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyCommand, createRun, readValue, stateHash, waits } from "./engine/v1/engine.ts";
import { replayGoldenPath } from "./engine/v1/validate.ts";
import type { Command, ScenarioDoc } from "./engine/v1/types.ts";
import type { Run } from "./engine/v1/engine.ts";
import { announce, newAnnouncer, POLITE_EVERY_MS } from "./runtime/announcer.ts";
import { runView } from "./runtime/view.ts";
import { consoleAlarmTexts, consoleNews, consoleSentence, consoleView } from "./runtime/consoleView.ts";
import { SIM_RENDERERS, simCaps } from "./runtime/caps.ts";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "..", "..", "backend", "supabase", "seed", "sims", "SECPLUS");
const SLUGS = ["phish-to-account-takeover", "ransomware-file-server", "cloud-iam-backdoor"];
const doc = (slug: string): ScenarioDoc => JSON.parse(readFileSync(join(dir, `${slug}.sim.json`), "utf8")) as ScenarioDoc;
const golden = (slug: string) => JSON.parse(readFileSync(join(dir, `${slug}.golden.json`), "utf8"));

function play(slug: string, steps: (string | [string, Record<string, string>])[]): Run {
  const run = createRun(doc(slug), 1);
  let seq = 0;
  const send = (c: Record<string, unknown>) => assert.ok(applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command).ok, JSON.stringify(c));
  for (const s of steps) {
    const [action, params] = typeof s === "string" ? [s, undefined] : s;
    send({ type: "act", action, ...(params ? { params } : {}) });
    while (readValue(run, "busy") === true && run.state.phase === "incident") {
      const w = waits(run)[0];
      send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
    }
  }
  return run;
}

describe("security console view model", () => {
  test("at the start: open alerts, assets with a tone in words, the first log lines, and every element labelled", () => {
    for (const slug of SLUGS) {
      const v = consoleView(createRun(doc(slug), 1))!;
      assert.ok(v, slug);
      assert.ok(v.openCount >= 1, `${slug}: an open alert at the start`);
      assert.ok(v.alerts.every((a) => a.a11y.includes(a.title) && /^(Critical|High|Medium|Low) alert at /.test(a.a11y)));
      assert.ok(v.assets.every((a) => ["ok", "watch", "bad", "held"].includes(a.tone) && a.a11y.startsWith(a.spokenLabel)));
      assert.ok(v.events.length >= 1 && v.events.every((e) => e.a11y.includes(e.source)));
      assert.ok(v.assets.some((a) => a.tone === "bad"), `${slug}: something is compromised at the start`);
    }
  });

  test("a screen without console bindings has no console view", () => {
    const d = doc("phish-to-account-takeover");
    delete d.screen.console;
    assert.equal(consoleView(createRun(d, 1)), null);
  });

  test("alerts: open first, newest first; log lines newest first", () => {
    const run = play("phish-to-account-takeover", ["reviewSignins", "watch", "watch"]);
    const v = consoleView(run)!;
    const open = v.alerts.filter((a) => a.open);
    assert.deepEqual(v.alerts.slice(0, open.length).map((a) => a.id), open.map((a) => a.id), "open alerts lead the queue");
    for (let i = 1; i < open.length; i++) assert.ok(open[i - 1].at >= open[i].at);
    for (let i = 1; i < v.events.length; i++) assert.ok(v.events[i - 1].at >= v.events[i].at);
    assert.equal(v.events[0].id, "e7", "the inbox rule at 15 minutes is the newest line");
  });

  test("containment shows on the asset in words and closes the alert", () => {
    const before = consoleView(createRun(doc("phish-to-account-takeover"), 1))!;
    const after = consoleView(play("phish-to-account-takeover", [["containAccount", { who: "jpike", how: "disable" }]]))!;
    assert.equal(before.assets.find((a) => a.id === "jpike")!.tone, "bad");
    const j = after.assets.find((a) => a.id === "jpike")!;
    assert.equal(j.tone, "held");
    assert.match(j.a11y, /contained/);
    assert.equal(after.alerts.find((a) => a.id === "travel")!.open, false);
  });

  test("runView carries the console; other screens' panels stay empty", () => {
    const v = runView(createRun(doc("ransomware-file-server"), 1));
    assert.ok(v.console);
    assert.equal(v.session, null);
    assert.deepEqual(v.tiles, []);
  });
});

describe("what the screen reader hears", () => {
  test("open alerts are spoken at once, as alarms, by severity and title; a closed alert is spoken as cleared", () => {
    const a0 = consoleAlarmTexts(consoleView(createRun(doc("phish-to-account-takeover"), 1)));
    assert.ok(a0.includes("High severity: Impossible travel: jpike signed in from Tacoma and from an overseas hosting provider 20 minutes apart"));
    let s = newAnnouncer();
    const r1 = announce(s, { alarms: a0, log: [], nowMs: 0, typing: false });
    assert.ok(r1.out.some((o) => o.assertive && /Impossible travel/.test(o.text)));
    s = r1.state;
    const a1 = consoleAlarmTexts(consoleView(play("phish-to-account-takeover", [["containAccount", { who: "jpike", how: "disable" }]])));
    const r2 = announce(s, { alarms: a1, log: [], nowMs: 1000, typing: false });
    assert.ok(r2.out.some((o) => o.assertive && /cleared.*Impossible travel/.test(o.text)));
  });

  test("asset changes and new log lines are polite, one summary sentence for a burst, and rate-limited", () => {
    const prev = consoleView(createRun(doc("ransomware-file-server"), 1));
    const next = consoleView(play("ransomware-file-server", ["triage", ["isolateHost", { host: "fs01", how: "edr" }], "reviewAuth"]));
    const news = consoleNews(prev, next);
    assert.ok(news.includes("File server FS01 now contained."));
    assert.equal(news.filter((n) => /new log lines?/.test(n)).length, 1, "a burst of lines is one sentence");
    assert.match(news.find((n) => /new log lines?/.test(n))!, /Newest: /);
    const r1 = announce(newAnnouncer(), { alarms: [], log: [], nowMs: 0, typing: false, news });
    assert.ok(r1.out.every((o) => !o.assertive));
    assert.equal(r1.out.length, 1, "several due at once are one announcement");
    const r2 = announce(r1.state, { alarms: [], log: [], nowMs: POLITE_EVERY_MS - 1, typing: false, news: ["Workstation WS-ACCT07 now contained."] });
    assert.equal(r2.out.length, 0, "nothing polite inside 10 seconds");
    assert.equal(consoleNews(null, next).length, 0);
  });

  test("Read the console: open alerts, every asset in words, the meters and the newest line", () => {
    const v = consoleView(createRun(doc("cloud-iam-backdoor"), 1))!;
    const s = consoleSentence(v);
    assert.match(s, /^2 open alerts: High, New administrator user support-ops/);
    for (const a of v.assets) assert.ok(s.includes(a.spokenLabel), a.spokenLabel);
    assert.match(s, /Unauthorized spend: \$0\./);
    assert.match(s, /Latest log line: /);
  });
});

test("the app advertises the console, so the server offers its sims; older apps are told to update", () => {
  assert.ok(SIM_RENDERERS.some((r) => r.type === "security-console" && r.level === 1));
  assert.match(simCaps(), /renderers=.*security-console@1/);
});

describe("golden paths replay through the app's engine copy", () => {
  for (const slug of SLUGS) {
    test(slug, () => {
      for (const p of golden(slug).paths) {
        const r = replayGoldenPath(doc(slug), p, (run) => stateHash(run.state));
        assert.equal(r.error, null, `${p.id}: ${r.error}`);
        assert.deepEqual(r.mismatches, [], p.id);
        assert.equal(r.stateHash, p.expect.stateHash, `${p.id}: state hash`);
      }
    });
  }
});
