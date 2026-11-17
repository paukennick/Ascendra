// REQ-313 (docs/sims.md 22.26): the governance board and tabletop renderers'
// pure parts, and the session's level-2 read button, against the seeded
// documents: the view models (every element labeled in words), what the
// screen reader hears (alarms at once, changes politely), "Read the board"
// and "Read the table", the capabilities the app advertises, and the golden
// paths replayed through the app's engine copy.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyCommand, createRun, readValue, stateHash, waits } from "./engine/v1/engine.ts";
import { replayGoldenPath, validateScenario } from "./engine/v1/validate.ts";
import type { Command, ScenarioDoc } from "./engine/v1/types.ts";
import type { Run } from "./engine/v1/engine.ts";
import { announce, newAnnouncer } from "./runtime/announcer.ts";
import { runView, sessionView } from "./runtime/view.ts";
import { governanceAlarmTexts, governanceNews, governanceSentence, governanceView } from "./runtime/governanceView.ts";
import { tabletopAlarmTexts, tabletopNews, tabletopSentence, tabletopView } from "./runtime/tabletopView.ts";
import { simCaps } from "./runtime/caps.ts";

const here = dirname(fileURLToPath(import.meta.url));
const sims = join(here, "..", "..", "..", "backend", "supabase", "seed", "sims");
const DOCS: Record<string, string> = {
  "cism-security-business-case-budget": "CISM",
  "cism-risk-appetite-exception": "CISM",
  "cism-ransomware-tabletop": "CISM",
  "cissp-flood-continuity-tabletop": "CISSP",
  "cc-ethics-shared-credentials": "ISC2CC",
  "cissp-ethics-audit-finding-pressure": "CISSP",
};
const doc = (slug: string): ScenarioDoc => JSON.parse(readFileSync(join(sims, DOCS[slug], `${slug}.sim.json`), "utf8")) as ScenarioDoc;
const golden = (slug: string) => JSON.parse(readFileSync(join(sims, DOCS[slug], `${slug}.golden.json`), "utf8"));

function play(slug: string, phase: string, busy: string, steps: (string | [string, Record<string, string>])[], untilSeconds = 0, watch = "watch", then: string[] = []): Run {
  const run = createRun(doc(slug), 1);
  let seq = 0;
  const send = (c: Record<string, unknown>) => assert.ok(applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command).ok, JSON.stringify(c));
  const act = (action: string, params?: Record<string, string>) => {
    send({ type: "act", action, ...(params ? { params } : {}) });
    while (readValue(run, busy) === true && run.state.phase === phase) {
      const w = waits(run)[0];
      send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
    }
  };
  for (const s of steps) typeof s === "string" ? act(s) : act(s[0], s[1]);
  while (run.state.phase === phase && run.state.tick * run.c.dt < untilSeconds) act(watch);
  for (const a of then) act(a);
  return run;
}

describe("governance board view model", () => {
  test("at the start: risks above appetite first, each in words; support in words; the budget; the docket", () => {
    for (const slug of ["cism-security-business-case-budget", "cism-risk-appetite-exception"]) {
      const v = governanceView(createRun(doc(slug), 1))!;
      assert.ok(v.aboveCount >= 1, `${slug}: a risk above appetite at the start`);
      assert.equal(v.risks[0].appetite, "above", "above appetite sorts first");
      assert.ok(v.risks.every((r) => /^.+: (Critical|High|Medium|Low) risk, (within|above) appetite/.test(r.a11y) && r.a11y.includes("Owner:")));
      assert.ok(v.stakeholders.every((k) => k.a11y.startsWith(k.spokenLabel) && /, \d+ of 10$/.test(k.a11y)));
      assert.ok(v.budget && v.budget.a11y.includes("thousand dollars") && !v.budget.over);
      assert.ok(v.docket.length >= 1);
    }
  });

  test("a risk above appetite and a budget overrun are alarms; a treated risk and support moving are polite news", () => {
    const start = createRun(doc("cism-security-business-case-budget"), 1);
    assert.ok(governanceAlarmTexts(governanceView(start)).some((t) => t.includes("above the risk appetite")));
    const before = governanceView(play("cism-security-business-case-budget", "quarter", "busy", ["quantify", "mapStrategy", "meetCfo", "meetCoo", ["package", { backups: "in", mfa: "in", callback: "in", mdr: "in", siem: "out" }], "submit"]));
    const after = governanceView(play("cism-security-business-case-budget", "quarter", "busy", ["quantify", "mapStrategy", "meetCfo", "meetCoo", ["package", { backups: "in", mfa: "in", callback: "in", mdr: "in", siem: "out" }], "submit"], 43 * 86400));
    assert.equal(after!.aboveCount, 0);
    assert.equal(governanceAlarmTexts(after).filter((t) => t.includes("risk appetite")).length, 0);
    const news = governanceNews(before, after);
    assert.ok(news.some((n) => n.includes("within appetite")), news.join(" | "));
    const signedRun = play("cism-security-business-case-budget", "quarter", "busy", ["quantify", "mapStrategy", "meetCfo", "meetCoo", ["package", { backups: "in", mfa: "in", callback: "in", mdr: "in", siem: "out" }], "submit"], 43 * 86400);
    const signedBefore = governanceView(signedRun);
    const signed = governanceView(play("cism-security-business-case-budget", "quarter", "busy", ["quantify", "mapStrategy", "meetCfo", "meetCoo", ["package", { backups: "in", mfa: "in", callback: "in", mdr: "in", siem: "out" }], "submit"], 43 * 86400, "watch", ["signSiem"]))!;
    assert.ok(signed.budget!.over);
    assert.ok(governanceAlarmTexts(signed).some((t) => t === "Security budget committed is over budget"));
    assert.ok(!governanceAlarmTexts(signedBefore).some((t) => t.includes("over budget")));
  });

  test("a flagged docket item is spoken at once; Read the board says the register, support and the budget", () => {
    const r = play("cism-security-business-case-budget", "quarter", "busy", [], 22 * 86400);
    const v = governanceView(r)!;
    assert.ok(governanceAlarmTexts(v).some((t) => t.startsWith("Board request:")));
    const s = governanceSentence(v);
    assert.ok(s.includes("above appetite") && s.includes("Support:") && s.includes("Security budget committed") && s.includes("Needs attention"));
  });
});

describe("tabletop view model", () => {
  test("at the start: the first inject waiting for a decision, roles and communications in words", () => {
    for (const slug of ["cism-ransomware-tabletop", "cissp-flood-continuity-tabletop"]) {
      const v = tabletopView(createRun(doc(slug), 1))!;
      assert.equal(v.injects.length, 1);
      assert.equal(v.openCount, 1);
      assert.ok(v.injects[0].a11y.startsWith("Waiting for a decision. Inject at "));
      assert.ok(v.roles.every((r) => r.a11y.startsWith(r.spokenLabel)));
      assert.ok(v.comms.every((c) => c.a11y.startsWith(c.spokenLabel)));
      assert.ok(tabletopAlarmTexts(v).some((t) => t.startsWith("New inject:")));
    }
  });

  test("injects read oldest first; a decided inject leaves the alarms and its decision is polite news", () => {
    const before = play("cism-ransomware-tabletop", "exercise", "busy", [], 0);
    const after = play("cism-ransomware-tabletop", "exercise", "busy", ["declare"], 2 * 3600);
    const v = tabletopView(after)!;
    assert.deepEqual(v.injects.map((j) => j.id), ["i1", "i2"]);
    assert.equal(v.injects[0].open, false);
    assert.equal(v.injects[1].open, true);
    const news = tabletopNews(tabletopView(before), v);
    assert.ok(news.some((n) => n.startsWith("Decided: Incident declared")), news.join(" | "));
    assert.ok(news.some((n) => n.startsWith("IT operations now engaged")));
  });

  test("a gap found turns a role into a gap; a late communication is an alarm; Read the table says what is waiting", () => {
    const r = play("cism-ransomware-tabletop", "exercise", "busy", ["declare", "askInsurer"], 7.5 * 3600);
    const v = tabletopView(r)!;
    assert.equal(v.roles.find((x) => x.id === "insurer")!.tone, "gap");
    assert.ok(tabletopAlarmTexts(v).some((t) => t === "Media statement is late"));
    const s = tabletopSentence(v);
    assert.ok(s.includes("waiting for a decision") && s.includes("Roles:") && s.includes("Communications:") && s.includes("Plan gaps found"));
  });
});

describe("session at level 2", () => {
  test("an ethics conversation names its read button; a client session keeps Read the client", () => {
    assert.equal(sessionView(createRun(doc("cc-ethics-shared-credentials"), 1))!.readLabel, "Read the conversation");
    const eppp = JSON.parse(readFileSync(join(sims, "EPPP", "suicide-risk-safety-plan.sim.json"), "utf8")) as ScenarioDoc;
    assert.equal(sessionView(createRun(eppp, 1))!.readLabel, "Read the client");
  });

  test("the app's validator refuses readLabel below level 2", () => {
    const d = doc("cissp-ethics-audit-finding-pressure");
    assert.deepEqual(validateScenario(d).map(String), []);
    d.screen.level = 1;
    assert.ok(validateScenario(d).map(String).some((e) => e.includes("readLabel")));
  });
});

describe("REQ-313 app integration", () => {
  test("the app advertises session@2, governance-board@1 and tabletop@1", () => {
    assert.match(simCaps(), /session@2/);
    assert.match(simCaps(), /governance-board@1/);
    assert.match(simCaps(), /tabletop@1/);
  });

  test("runView carries the new panels only on their own screens", () => {
    const g = runView(createRun(doc("cism-security-business-case-budget"), 1));
    assert.ok(g.governance && !g.tabletop && !g.session && !g.console);
    const t = runView(createRun(doc("cism-ransomware-tabletop"), 1));
    assert.ok(t.tabletop && !t.governance);
  });

  test("the announcer speaks a new inject at once and a decision politely", () => {
    const a0 = announce(newAnnouncer(), { alarms: tabletopAlarmTexts(tabletopView(createRun(doc("cism-ransomware-tabletop"), 1))), log: [], nowMs: 0, typing: false });
    assert.ok(a0.out.some((o) => o.assertive && o.text.includes("New inject")));
  });

  test("every golden path replays the same through the app's engine copy", () => {
    for (const slug of Object.keys(DOCS)) {
      for (const p of golden(slug).paths) {
        const r = replayGoldenPath(doc(slug), p, (run) => stateHash(run.state));
        assert.deepEqual(r.mismatches, [], `${slug}/${p.id}`);
      }
    }
  });
});
