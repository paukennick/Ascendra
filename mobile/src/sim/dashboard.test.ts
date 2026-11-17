// REQ-311: the project dashboard and service desk renderers' pure parts against
// the seeded documents: the view models (commitments, the board by column, the
// burn-down from a history and a fixed plan line, impediments, people in words;
// the desk's queue order, priority, due and breach text, the matrix in words),
// what the screen reader hears (open impediments, flagged items, breached
// tickets and down services at once; moves, band changes and new tickets
// politely), "Read the dashboard" and "Read the queue", the capabilities the
// app advertises, and the golden paths replayed through the app's engine copy
// with the board's columns checked at every command.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyCommand, createRun, stateHash } from "./engine/v1/engine.ts";
import { replayGoldenPath } from "./engine/v1/validate.ts";
import type { Command, ScenarioDoc } from "./engine/v1/types.ts";
import type { Run } from "./engine/v1/engine.ts";
import { runView } from "./runtime/view.ts";
import { dashboardAlarmTexts, dashboardNews, dashboardSentence, dashboardView, historyPoints } from "./runtime/dashboardView.ts";
import { deskAlarmTexts, deskNews, deskSentence, deskView, spanText } from "./runtime/deskView.ts";
import { SIM_RENDERERS, simCaps } from "./runtime/caps.ts";

const here = dirname(fileURLToPath(import.meta.url));
const seed = join(here, "..", "..", "..", "backend", "supabase", "seed", "sims");
const SPRINTS: [string, string][] = [
  ["PSMI", "sprint-status-meeting-daily-scrum"],
  ["PSMI", "sprint-goal-becomes-obsolete"],
  ["PSMI", "sprint-release-before-review"],
];
const DESKS: [string, string][] = [["ITIL5FND", "monday-service-desk-wifi-problem"]];
// REQ-321: the first predictive-mode case.
const PREDICTIVE: [string, string][] = [["PMP", "pmp-clinic-fitout-schedule-variance"]];
const ALL = [...SPRINTS, ...DESKS, ...PREDICTIVE];
const courseOf = (slug: string) => ALL.find((c) => c[1] === slug)![0];
const doc = (slug: string): ScenarioDoc => JSON.parse(readFileSync(join(seed, courseOf(slug), `${slug}.sim.json`), "utf8")) as ScenarioDoc;
const golden = (slug: string) => JSON.parse(readFileSync(join(seed, courseOf(slug), `${slug}.golden.json`), "utf8")) as { paths: { id: string; seed: number; commands: Command[] }[] };

// Replays a golden path's commands up to (not including) command `upTo`.
function replay(slug: string, pathId: string, upTo = Infinity): Run {
  const d = doc(slug);
  const p = golden(slug).paths.find((x) => x.id === pathId)!;
  const run = createRun(d, p.seed);
  p.commands.slice(0, upTo).forEach((c) => assert.ok(applyCommand(run, c).ok, `${pathId}: ${JSON.stringify(c)}`));
  return run;
}

describe("project dashboard (Sprint mode)", () => {
  test("the app advertises both new screens at level 1", () => {
    assert.ok(SIM_RENDERERS.some((r) => r.type === "project-dashboard" && r.level === 1));
    assert.ok(SIM_RENDERERS.some((r) => r.type === "service-desk" && r.level === 1));
    assert.match(simCaps(), /project-dashboard@1,service-desk@1/);
  });

  test("at the start: the Sprint Goal, the board by column, a burn-down with one sample and the plan line", () => {
    const run = createRun(doc("sprint-status-meeting-daily-scrum"), 1);
    const v = dashboardView(run)!;
    assert.equal(v.mode, "sprint");
    assert.equal(v.heading, "Sprint 14 · day 1 of 5");
    assert.ok(v.commitments.some((c) => c.label === "Sprint Goal" && /saved card/.test(c.text)));
    assert.deepEqual(v.columns.map((c) => c.label), ["To do", "In progress", "Done"]);
    assert.equal(v.columns[1].items.length, 3); // save a card, the reminder email, the flaky tests
    assert.deepEqual(v.chart!.series.find((s) => s.style === "plan")!.points, [29, 22, 15, 8, 0]);
    assert.deepEqual(historyPoints(run, "burn", 5), [29, null, null, null, null]);
    assert.match(v.chart!.summary, /Points remaining, Day 1 of 5: 29 points; Plan 29\./);
    assert.equal(v.openCount, 0);
    assert.deepEqual(dashboardAlarmTexts(v), []);
    assert.ok(v.people.every((g) => g.a11y.includes(" of 100")));
  });

  test("the expert path: the impediment is spoken at once and flags its item; the burn-down fills day by day; the board ends Done", () => {
    const g = golden("sprint-status-meeting-daily-scrum").paths.find((p) => p.id === "expert")!;
    // after Tuesday's Daily Scrum choice the impediment is open and the item flagged
    const i = g.commands.findIndex((c) => c.type === "choose");
    const tue = dashboardView(replay("sprint-status-meeting-daily-scrum", "expert", i + 1))!;
    assert.equal(tue.openCount, 1);
    const alarms = dashboardAlarmTexts(tue);
    assert.ok(alarms.some((a) => a.startsWith("Impediment: No sandbox keys")));
    assert.ok(alarms.some((a) => a.startsWith("Flagged: Save a card on file")));
    const before = dashboardView(replay("sprint-status-meeting-daily-scrum", "expert", i))!;
    assert.equal(before.openCount, 0, "nothing was open before the Daily Scrum surfaced it");
    const end = replay("sprint-status-meeting-daily-scrum", "expert");
    const v = dashboardView(end)!;
    const done = v.columns.find((c) => c.id === "done")!;
    assert.ok(["Save a card on file (provider tokenization)", "Pay with a saved card at checkout", "Checkout tests and accessibility pass"].every((l) => done.items.some((it) => it.label === l)));
    const actual = v.chart!.series.find((s) => s.style === "actual")!.points;
    assert.equal(actual.filter((p) => p !== null).length, 5);
    assert.equal(actual[0], 29);
    assert.ok((actual[4] as number) < 29);
    assert.equal(v.openCount, 0);
    assert.match(dashboardSentence(v), /^Sprint 14 · day 5 of 5\. Product Goal: .*Sprint Goal: .*Board: To do \d+; In progress \d+; Done \d+\. Sprint burn-down\. .*No open impediments\. People: /);
  });

  test("an item that moves column is said politely; a renegotiated Sprint Goal is announced", () => {
    const run0 = replay("sprint-goal-becomes-obsolete", "keptBuilding", 0);
    const a = dashboardView(run0)!;
    const run = replay("sprint-goal-becomes-obsolete", "keptBuilding");
    const b = dashboardView(run)!;
    const news = dashboardNews(a, b);
    assert.ok(news.some((n) => / moved to Done\./.test(n)), news.join(" | "));
    assert.ok(news.some((n) => /^Sprint Goal changed: Replaced mid-Sprint/.test(n)), news.join(" | "));
    assert.ok(b.columns.some((c) => c.items.some((it) => it.label.startsWith("Gift-card balance check"))));
  });

  test("every golden path: the board keeps its columns and shows each item once at every command, and the run view carries the dashboard", () => {
    for (const [, slug] of SPRINTS) {
      const d = doc(slug);
      const cols = d.screen.dashboard!.columns.map((c) => c.id);
      for (const p of golden(slug).paths) {
        const run = createRun(d, p.seed);
        for (const c of p.commands) {
          assert.ok(applyCommand(run, c).ok);
          const v = runView(run);
          assert.ok(v.dashboard && !v.desk, slug);
          assert.deepEqual(v.dashboard!.columns.map((col) => col.id), cols);
          // every item whose `when` holds is on the board exactly once
          const ids = v.dashboard!.columns.flatMap((col) => col.items.map((x) => x.id));
          assert.equal(new Set(ids).size, ids.length);
        }
      }
    }
  });
});

describe("project dashboard (predictive mode, REQ-321)", () => {
  const slug = "pmp-clinic-fitout-schedule-variance";
  test("at the start: the objective and baseline, work packages by column, planned value from the kickoff, and issues read as issues", () => {
    const run = createRun(doc(slug), 1);
    const v = dashboardView(run)!;
    assert.equal(v.mode, "predictive");
    assert.match(v.heading, /end of week 0 of 8/);
    assert.ok(v.commitments.some((c) => c.label === "Baseline" && /\$240,000/.test(c.text)));
    assert.equal(v.columns.flatMap((c) => c.items).length, 4, "the unplanned sinks are not on the board");
    const pv = v.chart!.series.find((x) => x.id === "pvS")!;
    assert.equal(pv.points[0], 0);
    assert.equal(pv.points[8], 240);
    assert.match(dashboardSentence(v), /No open issues\./);
  });

  test("every golden path: at the end the chart has nine samples, earned value meets the plan only on the expert path, and an open risk or claim is spoken as an issue", () => {
    for (const p of golden(slug).paths) {
      const run = replay(slug, p.id);
      const v = runView(run).dashboard!;
      assert.equal(v.mode, "predictive");
      const ev = v.chart!.series.find((x) => x.id === "evS")!.points;
      assert.ok(ev.every((x) => x !== null), `${p.id}: nine samples`);
      if (p.id === "expert") assert.equal(ev[8], 240);
      else assert.ok((ev[8] as number) <= 240, p.id);
      for (const t of dashboardAlarmTexts(v)) assert.match(t, /^(Open issue|Flagged): /);
      assert.match(v.chart!.summary, /Status meeting 9 of 9/);
    }
  });
});

describe("service desk", () => {
  const slug = "monday-service-desk-wifi-problem";

  test("the matrix in words and the priority each ticket shows matches it, at every command of every golden path", () => {
    const d = doc(slug);
    const m = d.screen.desk!.matrix;
    for (const p of golden(slug).paths) {
      const run = createRun(d, p.seed);
      for (const c of p.commands) {
        assert.ok(applyCommand(run, c).ok);
        for (const t of deskView(run)!.tickets) {
          if (t.impact >= 1 && t.urgency >= 1) assert.equal(t.priority, m.priorities[t.impact - 1][t.urgency - 1], `${p.id}: ${t.ref}`);
          else assert.equal(t.priority, 0, `${p.id}: ${t.ref} unassessed has no priority`);
        }
      }
    }
    const v = deskView(createRun(d, 1))!;
    assert.match(v.matrix.a11y, /^Priority matrix\. Impact 1 high: .*urgency 1 high: work stopped now is P1, .* Targets: P1 restore within 1 hour; /);
  });

  test("the queue: open first, then priority, then due; a breached ticket is spoken at once and a down service too", () => {
    const run = replay(slug, "neverEscalated");
    const v = deskView(run)!;
    const open = v.tickets.filter((t) => t.open);
    assert.equal(v.tickets.slice(0, open.length).every((t) => t.open), true);
    const cat = v.tickets.find((t) => t.ref === "INC-2102")!;
    assert.equal(cat.priorityText, "P1");
    assert.equal(cat.breached, true);
    assert.match(cat.dueText, /^Breached \d+ h( \d+ min)? ago$/);
    assert.equal(v.tickets[0].ref, "INC-2102");
    const alarms = deskAlarmTexts(v);
    assert.ok(alarms.includes("INC-2102 breached its target: Catalog search and the website's search are down for every branch"));
    assert.ok(alarms.includes("Catalog search is down"));
    assert.match(deskSentence(v), /^\d+ open tickets?, \d+ breached\. INC-2102, P1, /);
  });

  test("the expert path: the problem and the known error appear, the change is planned, nothing breached, and new tickets are announced", () => {
    const d = doc(slug);
    const p = golden(slug).paths.find((x) => x.id === "expert")!;
    const run = createRun(d, p.seed);
    let prev = deskView(run);
    const heard: string[] = [];
    for (const c of p.commands) {
      applyCommand(run, c);
      const next = deskView(run);
      heard.push(...deskNews(prev, next));
      prev = next;
    }
    const v = prev!;
    assert.equal(v.breachedCount, 0);
    assert.ok(v.tickets.some((t) => t.ref === "PRB-0412" && t.kind === "problem" && /Known error KE-0098/.test(t.status)));
    assert.ok(v.tickets.some((t) => t.ref === "CHG-0331" && t.kind === "change"));
    assert.ok(heard.some((h) => h.startsWith("New incident INC-2101")));
    assert.ok(heard.some((h) => h === "INC-2102 is now P1."));
    assert.equal(v.services.find((s) => s.id === "wifi")!.tone, "degraded");
  });

  test("span text", () => {
    assert.equal(spanText(4800), "1 h 20 min");
    assert.equal(spanText(3600), "1 h");
    assert.equal(spanText(45 * 60), "45 min");
    assert.equal(spanText(20), "1 min");
  });
});

describe("golden paths replay identically through the app's engine copy", () => {
  for (const [, slug] of ALL) {
    test(slug, () => {
      const d = doc(slug);
      const g = JSON.parse(readFileSync(join(seed, courseOf(slug), `${slug}.golden.json`), "utf8"));
      for (const p of g.paths) {
        const r = replayGoldenPath(d, p, (run: Run) => stateHash(run.state));
        assert.deepEqual(r.mismatches, [], `${slug}/${p.id}`);
        assert.equal(r.error ?? null, null);
      }
    });
  }
});
