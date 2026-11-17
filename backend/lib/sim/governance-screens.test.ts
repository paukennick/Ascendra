// REQ-313 (docs/sims.md 22.26): the governance board, the tabletop exercise
// and the professional-ethics conversation (the client session at level 2).
// Bindings and profiles in the validator, the renderer switch and the
// capability negotiation, the trademark lint, every document's shape and
// goldens, and one behavior per case on its own clock.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, GOVERNANCE_DOCUMENTS, loadDocument } from "./documents.ts";
import { applyCommand, createRun, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, ScenarioDoc } from "./engine/v1/index.ts";
import type { Run } from "./engine/v1/engine.ts";
import { PROFILE_THRESHOLDS } from "./engine/v1/validate.ts";
import { DEFAULT_RENDERERS, pacingEligible, parseCaps, renderersOn, runnable } from "./server-run.ts";
import { certMarkProblems } from "./lint.ts";
import { scenarioSchema } from "./schema.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";

const docOf = (slug: string): ScenarioDoc => loadDocument(ALL_DOCUMENTS.find((e) => e.slug === slug)!);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const errorsOf = (d: ScenarioDoc): string[] => validateScenario(d).map(String);

const SCREEN_OF: Record<string, string> = { governance: "governance-board", exercise: "tabletop", "professional-ethics": "session" };

function driver(doc: ScenarioDoc, phase: string, busy: string) {
  const run: Run = createRun(doc, 1);
  let seq = 0;
  const send = (c: Record<string, unknown>) => {
    const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
    assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
  };
  const finish = () => {
    while (readValue(run, busy) === true && run.state.phase === phase) {
      const w = waits(run)[0];
      send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
    }
  };
  const task = (action: string, params?: Record<string, string>) => {
    send({ type: "act", action, ...(params ? { params } : {}) });
    finish();
  };
  return {
    run,
    task,
    until: (seconds: number, watch: string) => {
      while (run.state.phase === phase && run.state.tick * run.c.dt < seconds) task(watch);
    },
    value: (n: string) => readValue(run, n),
  };
}

describe("REQ-313 bindings and profiles", () => {
  test("a governance board or tabletop with no bindings, and a bad tone, are errors", () => {
    const g = clone(docOf("cism-security-business-case-budget"));
    delete g.screen.governance;
    assert.ok(errorsOf(g).some((e) => e.includes("screen.governance")));
    const t = clone(docOf("cism-ransomware-tabletop"));
    t.screen.tabletop!.roles[0].tone = "\"busy\"";
    assert.ok(errorsOf(t).some((e) => e.includes("screen.tabletop.roles[0].tone")), errorsOf(t).join("; "));
    const r = clone(docOf("cism-security-business-case-budget"));
    r.screen.governance!.risks[0].appetite = "\"over\"";
    assert.ok(errorsOf(r).some((e) => e.includes("risks[0].appetite")));
  });

  test("ids are unique across a board's lists, and support words match the bands", () => {
    const g = clone(docOf("cism-security-business-case-budget"));
    g.screen.governance!.docket[0].id = g.screen.governance!.risks[0].id;
    assert.ok(errorsOf(g).some((e) => e.includes("duplicate id")));
    const w = clone(docOf("cism-security-business-case-budget"));
    w.screen.governance!.stakeholders[0].words.pop();
    assert.ok(errorsOf(w).some((e) => e.includes("stakeholders[0].words")));
  });

  test("a session's readLabel needs renderer level 2", () => {
    const d = clone(docOf("cc-ethics-shared-credentials"));
    assert.deepEqual(errorsOf(d), []);
    d.screen.level = 1;
    assert.ok(errorsOf(d).some((e) => e.includes("readLabel") && e.includes("level 2")));
    assert.equal(scenarioSchema.safeParse(d).success, true, "the schema itself accepts it; the validator holds the level rule");
  });

  test("the three profiles have their defaults, each tightening in the right direction", () => {
    assert.deepEqual(Object.keys(PROFILE_THRESHOLDS.governance).sort(), ["aboveAppetite", "budgetCap", "supportTarget"]);
    assert.equal(PROFILE_THRESHOLDS.governance.supportTarget.tighter, "higher");
    assert.deepEqual(Object.keys(PROFILE_THRESHOLDS.exercise).sort(), ["decisionWindow", "unownedGaps"]);
    assert.deepEqual(Object.keys(PROFILE_THRESHOLDS["professional-ethics"]).sort(), ["actWindow", "canonBreaches"]);
  });
});

describe("REQ-313 renderer switch and negotiation", () => {
  test("both new screens are on by default and the env narrows them", () => {
    assert.ok(DEFAULT_RENDERERS.includes("governance-board") && DEFAULT_RENDERERS.includes("tabletop"));
    assert.deepEqual(renderersOn({ SIMS_RENDERERS: "bedside,session" }), ["bedside", "session"]);
  });

  test("an app that does not advertise a screen, or has the session at level 1, is not offered the version", () => {
    const caps = parseCaps("protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1,security-console@1,treatment-session@1,terminal@1");
    const now = parseCaps("protocol=1;engine=1.2;renderers=session@2,governance-board@1,tabletop@1");
    for (const e of GOVERNANCE_DOCUMENTS) {
      const d = loadDocument(e);
      const need = { engine_major: 1, engine_minor: 2, renderer_level: d.screen.level ?? 1, screen_type: d.screen.type };
      assert.equal(runnable(need, caps), false, `${e.slug} must not reach an older app`);
      assert.equal(runnable(need, now), true, `${e.slug} runs on an app with the new renderers`);
    }
  });

  test("the capabilities header keeps the hyphenated governance-board type", () => {
    assert.deepEqual(parseCaps("protocol=1;engine=1.2;renderers=governance-board@1")!.renderers, [{ type: "governance-board", level: 1 }]);
  });
});

describe("REQ-313 documents", () => {
  test("every document: valid, on its profile's screen, learner-paced, engine 1.2, endings in all three classes, a debrief per ending", () => {
    assert.ok(GOVERNANCE_DOCUMENTS.length >= 10);
    for (const e of GOVERNANCE_DOCUMENTS) {
      const d = loadDocument(e);
      assert.deepEqual(errorsOf(d), [], e.slug);
      assert.equal(d.screen.type, SCREEN_OF[d.outcome.profile], e.slug);
      if (d.outcome.profile === "professional-ethics") assert.equal(d.screen.level, 2, `${e.slug}: session@2`);
      assert.equal(d.engine.minor, 2);
      assert.ok(d.endingOrder && d.endingOrder.length >= 3, e.slug);
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), e.slug);
      assert.equal(pacingEligible(d, "general"), false);
      const crit = d.scoring.criteria.filter((c) => c.critical).length;
      assert.ok(crit >= 3 && crit <= 4, `${e.slug}: ${crit} critical criteria`);
      const classes = new Set(Object.entries(d.endings).filter(([id]) => id !== "time_up").map(([, x]) => x.class));
      assert.deepEqual([...classes].sort(), ["harm", "recovered", "target"], e.slug);
      for (const id of Object.keys(d.endings)) assert.ok(d.scoring.debrief[id], `${e.slug}: debrief for ${id}`);
      assert.ok(d.scoring.expertPath.length >= 3 && d.scoring.kpis.length >= 3, e.slug);
      for (const s of d.sources) assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt) && (s.note ?? "").length > 20, `${e.slug}: ${s.cite} says when and how it was read`);
      assert.equal(scenarioSchema.safeParse(d).success, true, `${e.slug}: schema`);
    }
  });

  test("each is on an active objective of its own course; at most one authored sim per objective", () => {
    const seen = new Set<string>();
    for (const e of GOVERNANCE_DOCUMENTS) {
      const d = loadDocument(e);
      const track = CATALOG_TRACKS.find((t) => t.code === e.course);
      assert.ok(track, `${e.course} is in the catalog`);
      const titles = activeUnits(track).flatMap((u) => u.objectives);
      assert.ok(titles.includes(d.objective), `${e.slug}: objective is a ${e.course} catalog title`);
      for (const s of d.secondaryObjectives ?? []) assert.ok(titles.includes(s), `${e.slug}: secondary "${s.slice(0, 40)}"`);
      assert.ok(!seen.has(`${e.course}|${d.objective}`), `${e.slug}: one REQ-313 sim per objective`);
      seen.add(`${e.course}|${d.objective}`);
    }
  });

  test("goldens: a Good, a Mediocre and a Bad; every ending but time_up; every criterion met and missed", () => {
    for (const e of GOVERNANCE_DOCUMENTS) {
      const d = loadDocument(e);
      const g = JSON.parse(readFileSync(e.golden!, "utf8")) as { paths: { expect: { ending: string; rating: string; criteria: Record<string, string> } }[] };
      const ratings = new Set(g.paths.map((p) => p.expect.rating));
      for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r), `${e.slug}: a ${r} path`);
      const endings = new Set(g.paths.map((p) => p.expect.ending));
      for (const id of Object.keys(d.endings)) if (id !== "time_up") assert.ok(endings.has(id), `${e.slug}: ending ${id} reached`);
      for (const c of d.scoring.criteria) {
        const scores = new Set(g.paths.map((p) => p.expect.criteria[c.id]));
        assert.ok(scores.has("met") && scores.has("missed"), `${e.slug}: ${c.id} met and missed (${[...scores].join(", ")})`);
      }
    }
  });

  test("no learner-facing text names a certifying body's mark, and the rule catches one", () => {
    for (const e of GOVERNANCE_DOCUMENTS) assert.deepEqual(certMarkProblems(loadDocument(e)), [], e.slug);
    const d = clone(docOf("cc-ethics-shared-credentials"));
    d.brief.situation += " Your CISSP colleague agrees.";
    assert.equal(certMarkProblems(d).length, 1);
    assert.equal(certMarkProblems(docOf("cc-triage-phish-correlation")).length, 0, "other profiles are not checked");
  });
});

describe("REQ-313: each case on its own clock", () => {
  test("business case: a package within budget, the CFO briefed on money at risk, is approved at the week-7 board; the SIEM order after it puts spend over budget", () => {
    const d = driver(docOf("cism-security-business-case-budget"), "quarter", "busy");
    for (const a of ["quantify", "mapStrategy", "meetCfo", "meetCoo"]) d.task(a);
    d.task("package", { backups: "in", mfa: "in", callback: "in", mdr: "in", siem: "out" });
    d.task("submit");
    d.until(43 * 86400, "watch");
    assert.equal(d.value("approved"), true);
    assert.equal(d.value("spent"), 550);
    d.task("signSiem");
    assert.ok((d.value("spendPct") as number) > 100);
  });

  test("business case: an over-budget package is not approved, and the attack in week 11 finds encryptable backups", () => {
    const d = driver(docOf("cism-security-business-case-budget"), "quarter", "busy");
    for (const a of ["quantify", "mapStrategy", "meetCfo"]) d.task(a);
    d.task("package", { backups: "in", mfa: "in", callback: "in", mdr: "in", siem: "in" });
    d.task("submit");
    d.until(71 * 86400, "watch");
    assert.equal(d.value("approved"), false);
    assert.equal(d.value("ransomHit"), true);
  });

  test("exception: conditions live before the week-8 theft keep the data safe; six months unconditioned does not", () => {
    const ok = driver(docOf("cism-risk-appetite-exception"), "quarter", "busy");
    ok.task("decide", { d: "grant90" });
    ok.until(50 * 86400, "watch");
    assert.equal(ok.value("breached"), false);
    assert.equal(ok.run.state.ended, null);
    const bad = driver(docOf("cism-risk-appetite-exception"), "quarter", "busy");
    bad.task("decide", { d: "grant180" });
    bad.until(50 * 86400, "watch");
    assert.equal(bad.value("breached"), true);
  });

  test("ransomware tabletop: the leak inject stays open until counsel is in; a reporter left unanswered for two hours is a late story", () => {
    const d = driver(docOf("cism-ransomware-tabletop"), "exercise", "busy");
    d.task("declare");
    d.until(2 * 3600, "watch");
    assert.equal(d.value("counselAt"), null);
    d.until(7.5 * 3600, "watch");
    assert.equal(d.value("mediaLate"), true);
  });

  test("flood tabletop: not declaring before the generator's six hours run out is a hard crash", () => {
    const d = driver(docOf("cissp-flood-continuity-tabletop"), "exercise", "busy");
    d.task("safety", { s: "safe" });
    d.until(8.5 * 3600, "watch");
    assert.equal(d.value("hardDown"), true);
    const ok = driver(docOf("cissp-flood-continuity-tabletop"), "exercise", "busy");
    ok.until(2 * 3600, "watch");
    ok.task("declare");
    ok.until(8.5 * 3600, "watch");
    assert.equal(ok.value("hardDown"), false);
  });

  test("CC ethics: offering no route lets the lead insist at 12 minutes; the logging request comes at 8", () => {
    const d = driver(docOf("cc-ethics-shared-credentials"), "conversation", "talking");
    d.until(13 * 60, "wait");
    assert.equal(typeof d.value("logsAskAt"), "number");
    assert.equal(typeof d.value("insistAt"), "number");
    const ok = driver(docOf("cc-ethics-shared-credentials"), "conversation", "talking");
    ok.task("route");
    ok.until(13 * 60, "wait");
    assert.equal(ok.value("insistAt"), null);
  });

  test("CISSP ethics: a proposal before 15 minutes stops the CIO editing the draft herself", () => {
    const d = driver(docOf("cissp-ethics-audit-finding-pressure"), "conversation", "talking");
    d.task("propose");
    d.until(16 * 60, "wait");
    assert.equal(d.value("editAt"), null);
    const p = driver(docOf("cissp-ethics-audit-finding-pressure"), "conversation", "talking");
    p.task("hold");
    p.until(16 * 60, "wait");
    assert.equal(typeof p.value("editAt"), "number");
  });
});
