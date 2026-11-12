// REQ-237: the terminal renderer's pure parts against the seeded Linux+,
// Network+ and CKA documents: the view model (transcript oldest first, output
// at the tick it ran merged with lines over sim time, nodes and links with a
// status and a tone in words), the bounded command line (exact matches only,
// suggestions, unavailable commands and anything else answered without a
// command), what the screen reader hears (down nodes as alarms, error lines
// at once, output politely, summarized and rate-limited), "Read the
// terminal", the capabilities the app advertises, and the golden paths
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
import { actionViews, runView } from "./runtime/view.ts";
import { commandProblem, matchCommand, suggestCommands, terminalAlarmTexts, terminalCommands, terminalErrors, terminalNews, terminalSentence, terminalView } from "./runtime/terminalView.ts";
import { SIM_RENDERERS, simCaps } from "./runtime/caps.ts";

const here = dirname(fileURLToPath(import.meta.url));
const seed = join(here, "..", "..", "..", "backend", "supabase", "seed", "sims");
const CASES: [string, string][] = [
  ["LINUXPLUS", "full-var-stops-database"],
  ["LINUXPLUS", "selinux-denies-moved-site"],
  ["NETWORKPLUS", "vlan-missing-from-trunk"],
  ["NETWORKPLUS", "branch-dns-route-typo"],
  ["CKA", "crashloop-bad-configmap"],
  ["CKA", "node-notready-swap-drain"],
];
const course = (slug: string) => CASES.find((c) => c[1] === slug)![0];
const doc = (slug: string): ScenarioDoc => JSON.parse(readFileSync(join(seed, course(slug), `${slug}.sim.json`), "utf8")) as ScenarioDoc;
const golden = (slug: string) => JSON.parse(readFileSync(join(seed, course(slug), `${slug}.golden.json`), "utf8"));

function play(slug: string, steps: (string | [string, Record<string, string>])[], run: Run = createRun(doc(slug), 1)): Run {
  let seq = run.lastSeq;
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

describe("terminal view model", () => {
  test("at the start: a prompt, a map with something down, an error line, every element labeled", () => {
    for (const [, slug] of CASES) {
      const v = terminalView(createRun(doc(slug), 1))!;
      assert.ok(v, slug);
      assert.ok(v.prompt.length > 0);
      assert.ok(v.nodes.every((n) => ["up", "degraded", "down", "out"].includes(n.tone) && n.a11y.startsWith(n.spokenLabel)), slug);
      assert.ok(v.links.every((l) => l.a11y.startsWith(l.label)), slug);
      assert.ok(v.nodes.some((n) => n.tone !== "up"), `${slug}: something is wrong at the start`);
      assert.ok(v.transcript.some((e) => e.error), `${slug}: the first report is an error line`);
    }
  });

  test("a screen without terminal bindings has no terminal view; runView carries it otherwise", () => {
    const d = doc("full-var-stops-database");
    delete d.screen.terminal;
    assert.equal(terminalView(createRun(d, 1)), null);
    const v = runView(createRun(doc("full-var-stops-database"), 1));
    assert.ok(v.terminal);
    assert.equal(v.console, null);
    assert.deepEqual(v.tiles, []);
  });

  test("the transcript is oldest first and holds each command's output at the tick it ran", () => {
    const run = play("full-var-stops-database", ["df", "du", "lsof"]);
    const v = terminalView(run)!;
    for (let i = 1; i < v.transcript.length; i++) assert.ok(v.transcript[i - 1].at <= v.transcript[i].at);
    const outs = v.transcript.filter((e) => e.kind === "output");
    assert.equal(outs.length, 3);
    assert.match(outs[0].text, /^root@app01:~# df -h \/var/);
    assert.match(outs[2].text, /debug\.log \(deleted\)/);
    assert.ok(outs[1].at > outs[0].at, "each command costs operator minutes");
  });

  test("a fix shows on the map in words", () => {
    const after = terminalView(play("full-var-stops-database", ["restartShopd", "startPg"]))!;
    const pg = after.nodes.find((n) => n.id === "pg")!;
    assert.equal(pg.tone, "up");
    assert.match(pg.a11y, /up\. Accepting connections/);
    assert.equal(after.downCount, 0);
  });
});

describe("the bounded command line", () => {
  const run = createRun(doc("vlan-missing-from-trunk"), 1);
  const cmds = terminalCommands(actionViews(run));

  test("a choice action becomes one command per option; nothing free-form", () => {
    assert.ok(cmds.some((c) => c.text === "ACC-SW2(config-if)# switchport trunk allowed vlan add 20" && c.params?.line === "add20"));
    assert.ok(cmds.some((c) => c.text === "PC-F2-14 ipconfig" && !c.params));
    assert.ok(cmds.every((c) => !c.needsForm));
  });

  test("only an exact command runs (case and spacing ignored); anything else is answered locally", () => {
    assert.equal(matchCommand(cmds, "  acc-sw2#   SHOW interfaces trunk ")?.action, "sw2Trunk");
    assert.equal(matchCommand(cmds, "show interfaces trunk"), null, "no partial match");
    assert.equal(matchCommand(cmds, "rm -rf /"), null);
    assert.match(commandProblem(cmds, "rm -rf /")!, /not available in this lab/);
    assert.equal(commandProblem(cmds, "ACC-SW2# show interfaces trunk"), null);
    assert.match(commandProblem(cmds, "")!, /Type a command/);
  });

  test("suggestions: prefix first, then contains, available before unavailable", () => {
    const s = suggestCommands(cmds, "show interfaces trunk");
    assert.deepEqual(s.map((c) => c.action).sort(), ["coreTrunk", "sw2Trunk"]);
    assert.ok(suggestCommands(cmds, "ACC-SW2(config").length >= 4);
    assert.deepEqual(suggestCommands(cmds, ""), []);
  });

  test("an unavailable command is refused with the reason", () => {
    const r = play("vlan-missing-from-trunk", [["configTrunk", { line: "only20" }]]);
    const c2 = terminalCommands(actionViews(r));
    assert.match(commandProblem(c2, "ACC-SW2# show interfaces trunk")!, /not available now.*console/);
  });

  test("a form action is offered but sent to the action list", () => {
    const r = play("vlan-missing-from-trunk", ["closeOutage"]);
    const c = terminalCommands(actionViews(r)).find((x) => x.action === "document")!;
    assert.equal(c.needsForm, true);
    assert.match(commandProblem([c], c.text)!, /action list/);
  });
});

describe("what the screen reader hears", () => {
  test("down nodes and links are alarms, spoken at once and again as cleared", () => {
    const a0 = terminalAlarmTexts(terminalView(createRun(doc("full-var-stops-database"), 1)));
    assert.ok(a0.includes("PostgreSQL is down"));
    const r1 = announce(newAnnouncer(), { alarms: a0, log: [], nowMs: 0, typing: false });
    assert.ok(r1.out.some((o) => o.assertive && /PostgreSQL is down/.test(o.text)));
    const a1 = terminalAlarmTexts(terminalView(play("full-var-stops-database", ["restartShopd", "startPg"])));
    const r2 = announce(r1.state, { alarms: a1, log: [], nowMs: 1000, typing: false });
    assert.ok(r2.out.some((o) => o.assertive && /cleared.*PostgreSQL is down/.test(o.text)));
  });

  test("a new error line is urgent: spoken at once, even inside the polite window and while typing", () => {
    const run = createRun(doc("full-var-stops-database"), 1);
    const prev = terminalView(run);
    while (run.state.tick * run.c.dt < 46 * 60) play("full-var-stops-database", ["watch"], run);
    const next = terminalView(run);
    const urgent = terminalErrors(prev, next);
    assert.equal(urgent.length, 1);
    assert.match(urgent[0], /^Error: warehouse-sync/);
    const s = { ...newAnnouncer(), lastPoliteMs: 0 };
    const r = announce(s, { alarms: [], log: [], nowMs: 1, typing: true, urgent });
    assert.deepEqual(r.out.map((o) => o.assertive), [true]);
  });

  test("new output is polite, one sentence for a burst, and rate-limited", () => {
    const prev = terminalView(createRun(doc("full-var-stops-database"), 1));
    const next = terminalView(play("full-var-stops-database", ["df", "du"]));
    const news = terminalNews(prev, next);
    assert.equal(news.length, 1);
    assert.match(news[0], /^2 new output blocks\. Newest: root@app01:~# du/);
    const r1 = announce(newAnnouncer(), { alarms: [], log: [], nowMs: 0, typing: false, news });
    assert.ok(r1.out.every((o) => !o.assertive));
    const r2 = announce(r1.state, { alarms: [], log: [], nowMs: POLITE_EVERY_MS - 1, typing: false, news: ["New output. x"] });
    assert.equal(r2.out.length, 0, "nothing polite inside 10 seconds");
    assert.deepEqual(terminalNews(null, next), []);
  });

  test("a tone change other than down is polite news", () => {
    const prev = terminalView(play("node-notready-swap-drain", ["swapOffA", "restartKubelet"]));
    const next = terminalView(play("node-notready-swap-drain", ["swapOffA", "restartKubelet", "cordonW2"]));
    assert.ok(terminalNews(prev, next).includes("worker w2 now out of service."));
  });

  test("Read the terminal: prompt, every node in words, links not up, meters, the latest error and output", () => {
    const v = terminalView(play("full-var-stops-database", ["df"]))!;
    const s = terminalSentence(v);
    assert.match(s, /^Prompt root@app01:~#\./);
    for (const n of v.nodes) assert.ok(s.includes(n.spokenLabel), n.spokenLabel);
    assert.match(s, /Links not up: Database connection down/);
    assert.match(s, /Free on \/var: 0 MB\./);
    assert.match(s, /Latest error: /);
    assert.match(s, /Latest output at .*df -h/);
  });
});

test("the app advertises the terminal, so the server offers its sims; older apps are told to update", () => {
  assert.ok(SIM_RENDERERS.some((r) => r.type === "terminal" && r.level === 1));
  assert.match(simCaps(), /renderers=.*terminal@1/);
});

describe("golden paths replay through the app's engine copy", () => {
  for (const [, slug] of CASES) {
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
