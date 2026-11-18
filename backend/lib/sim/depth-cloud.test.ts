// REQ-335 (docs/sims.md 22.39): depth sims for the AWS, Azure and Google Cloud
// courses, round of 2026-11-17 (evening): purpose-written cases for each
// course's top two domains, and bands where another course's case already
// teaches the same decision. Every document is selected by slug from
// lib/sim/depth-cloud.ts (FAIL-2002), is learner-paced,
// engine 1.2 with an ending order, sits on an active objective of its own
// course, has endings in all three outcome classes and goldens rated Good,
// Mediocre and Bad. Bands keep their base's behavior (same paths, same
// endings), carry this course's outline as their first source, dated, and
// name no other exam body's marks outside their sources (trademarks,
// round of 2026-11-16).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { applyCommand, createRun, lintScenario, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, ScenarioDoc } from "./engine/v1/index.ts";
import type { GoldenFile } from "./engine/v1/validate.ts";
import type { Run } from "./engine/v1/engine.ts";
import { clientDocument } from "./content-hash.ts";
import { pacingEligible } from "./server-run.ts";
import { backslashEscapeProblems, safetyFamilyOf, secondsUnitProblems } from "./lint.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { DEPTH_CLOUD as CLOUD } from "./depth-cloud.ts";

const entryOf = (slug: string) => ALL_DOCUMENTS.find((e) => e.slug === slug)!;
const docOf = (slug: string): ScenarioDoc => loadDocument(entryOf(slug));
const goldenOf = (slug: string): GoldenFile => JSON.parse(readFileSync(entryOf(slug).golden!, "utf8")) as GoldenFile;
const MARKS = /\b(CISSP|CISM|CEH|ISC2|ISACA|EC-Council|SSCP|CCSP|Certified Ethical Hacker|Certified Information)\b/;

export function driver(doc: ScenarioDoc) {
  const run: Run = createRun(doc, 1);
  let seq = 0;
  const live = doc.initialPhase;
  const send = (c: Record<string, unknown>) => {
    const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
    assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
  };
  return {
    run,
    act: (action: string, params?: Record<string, string>) => {
      send({ type: "act", action, ...(params ? { params } : {}) });
      while (run.state.phase === live && !run.state.ended) {
        if (run.state.openPrompt) {
          send({ type: "choose", prompt: run.state.openPrompt, choice: doc.prompts![run.state.openPrompt].choices[0].id });
          continue;
        }
        if (readValue(run, "busy") !== true) break;
        const w = waits(run)[0];
        send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
      }
    },
    value: (n: string) => readValue(run, n),
    minutes: () => (run.state.tick * run.c.dt) / 60,
  };
}

describe("depth cloud sims (REQ-335)", () => {
  test("every document is registered by slug, valid, learner-paced, engine 1.2 with an ending order, on its screen and profile", () => {
    assert.ok(CLOUD.length > 0);
    const slugs = new Set<string>();
    for (const w of CLOUD) {
      assert.ok(!slugs.has(w.slug), `${w.slug} listed twice`);
      slugs.add(w.slug);
      const e = entryOf(w.slug);
      assert.ok(e, `${w.slug} registered`);
      assert.equal(e.course, w.course);
      assert.equal(e.kind, w.kind);
      assert.equal(e.source, "authored");
      const d = loadDocument(e);
      assert.deepEqual(validateScenario(d).map(String), [], w.slug);
      assert.equal(d.screen.type, w.screen, w.slug);
      assert.equal(d.outcome.profile, w.profile, w.slug);
      assert.equal(d.engine.minor, 2);
      assert.ok(d.endingOrder && d.endingOrder.length >= 2, `${w.slug}: ending order`);
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), `${w.slug}: learner-paced`);
      assert.equal(safetyFamilyOf(d), "general");
      assert.equal(pacingEligible(d, "general"), false);
      const classes = new Set(Object.values(d.endings).filter((x) => x.terminal).map((x) => x.class));
      for (const k of ["target", "recovered", "harm"]) assert.ok(classes.has(k as never), `${w.slug}: ${k}`);
      for (const k of Object.keys(d.endings)) assert.ok(d.scoring.debrief[k], `${w.slug}: debrief for ${k}`);
      assert.deepEqual(secondsUnitProblems(d), [], w.slug);
      assert.deepEqual(backslashEscapeProblems(d), [], w.slug);
      assert.ok(["2026-11-17", "2026-11-18"].includes(d.sources[0].checkedAt), `${w.slug}: this course's outline, read for this round`);
    }
  });

  test("each document is on an active objective of its own course, one per objective in this wave", () => {
    const seen = new Set<string>();
    for (const w of CLOUD) {
      const track = CATALOG_TRACKS.find((t) => t.code === w.course)!;
      const titles = new Set(activeUnits(track).flatMap((u) => u.objectives));
      const d = docOf(w.slug);
      assert.ok(titles.has(d.objective), `${w.course}: ${d.objective}`);
      for (const s of d.secondaryObjectives ?? []) assert.ok(titles.has(s), `${w.course}: secondary ${s}`);
      const key = `${w.course}|${d.objective}`;
      assert.ok(!seen.has(key), key);
      seen.add(key);
      // no other sim of the course already sits on the objective
      const others = ALL_DOCUMENTS.filter((e) => e.course === w.course && e.slug !== w.slug && loadDocument(e).objective === d.objective);
      assert.deepEqual(others.map((e) => e.slug), [], `${w.slug}: objective already covered`);
    }
  });

  test("the goldens reach every ending but time_up, rate Good, Mediocre and Bad, and the expert path reaches target", () => {
    for (const w of CLOUD) {
      const d = docOf(w.slug);
      const g = goldenOf(w.slug);
      assert.ok(g.paths.length >= 5, `${w.slug}: ${g.paths.length} golden paths`);
      const endings = new Set(g.paths.map((p) => p.expect.ending));
      for (const k of Object.keys(d.endings)) if (k !== "time_up") assert.ok(endings.has(k), `${w.slug}: no golden path reaches ${k}`);
      const ratings = new Set(g.paths.map((p) => p.expect.rating));
      for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r as never), `${w.slug}: ${r}`);
      assert.equal(g.paths.find((p) => p.id === "expert")?.expect.class, "target", `${w.slug}: the expert path reaches target`);
      for (const c of d.scoring.criteria.filter((x) => x.critical)) {
        const s = new Set(g.paths.map((p) => p.expect.criteria?.[c.id]));
        assert.ok(s.has("met") && s.has("missed"), `${w.slug}: ${c.id} met and missed (${[...s].join(",")})`);
      }
    }
  });

  test("a band keeps its base's case: same actions, endings and ending order, and the same golden outcomes", () => {
    for (const w of CLOUD.filter((x) => x.kind === "band")) {
      const [bc, bs] = w.base!.split("/");
      const base = ALL_DOCUMENTS.find((e) => e.course === bc && e.slug === bs)!;
      assert.ok(base, `${w.slug}: base ${w.base}`);
      const bd = loadDocument(base);
      const d = docOf(w.slug);
      assert.notEqual(w.course, bc, `${w.slug}: a band is for another course`);
      assert.deepEqual(Object.keys(d.actions), Object.keys(bd.actions), w.slug);
      assert.deepEqual(d.endingOrder, bd.endingOrder, w.slug);
      assert.deepEqual(Object.keys(d.endings), Object.keys(bd.endings), w.slug);
      const bg = JSON.parse(readFileSync(base.golden!, "utf8")) as GoldenFile;
      const g = goldenOf(w.slug);
      assert.deepEqual(
        g.paths.map((p) => [p.id, p.expect.ending, p.expect.rating]),
        bg.paths.map((p) => [p.id, p.expect.ending, p.expect.rating]),
        `${w.slug}: golden outcomes match the base`,
      );
    }
  });

  test("no permission-only exam body's marks outside the sources (REQ-309/319)", () => {
    for (const w of CLOUD) {
      const { sources, ...rest } = docOf(w.slug) as unknown as Record<string, unknown>;
      const m = JSON.stringify(rest).match(MARKS);
      assert.equal(m, null, `${w.slug}: ${m?.[0]}`);
      // a band drops the base course's exam outline, which belongs to the base course
      if (w.kind === "band") for (const s of sources as { cite: string }[]) assert.ok(!MARKS.test(s.cite), `${w.slug}: source ${s.cite.slice(0, 60)}`);
    }
  });

  test("no lint error; terminal commands are bounded; nothing waits at the start; the client document drops the rubric", () => {
    for (const w of CLOUD) {
      const d = docOf(w.slug);
      const errs = lintScenario(d, { now: "2026-11-18", safetyFamily: "general" }).filter((p) => p.level === "error");
      assert.deepEqual(errs, [], w.slug);
      if (w.screen === "terminal") for (const id of d.phases[d.initialPhase].actions) for (const p of d.actions[id].params ?? []) assert.equal(p.kind, "choice", `${w.slug}.${id}`);
      const r = driver(d);
      assert.equal(waits(r.run).length, 0, `${w.slug}: no wait pending at the start`);
      const c = clientDocument(d) as unknown as Record<string, unknown>;
      assert.equal(c.scoring, undefined);
    }
  });
});

describe("what each new depth cloud case teaches (REQ-335)", () => {
  const until = (r: ReturnType<typeof driver>, m: number) => {
    while (r.minutes() < m && !r.run.state.ended && r.run.state.phase === "incident") r.act("watch");
  };
  test("the list is not empty", () => assert.ok(until && CLOUD.length > 0));
  test("AWSDEA s3-eventbridge-rule-never-fires: a single-element put deletes the orders trigger; widening the rule changes nothing; a merged put makes the close load", () => {
    const d = docOf("s3-eventbridge-rule-never-fires");
    const h = driver(d);
    h.act("putOnly");
    assert.equal(h.value("harmed"), true, "putOnly causes harm");
    until(h, 41);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("widen");
    until(n, 41);
    assert.notEqual(n.value("missAt"), null, "widen changes nothing");
    const ok = driver(d);
    ok.act("merge");
    until(ok, 41);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AWSDEA redshift-idle-transaction-blocks-load: a reboot rolls the load back; more WLM slots change nothing; ending the idle holder makes the review", () => {
    const d = docOf("redshift-idle-transaction-blocks-load");
    const h = driver(d);
    h.act("reboot");
    assert.equal(h.value("harmed"), true, "reboot causes harm");
    until(h, 46);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("wlmslots");
    until(n, 46);
    assert.notEqual(n.value("missAt"), null, "wlmslots changes nothing");
    const ok = driver(d);
    ok.act("terminate");
    until(ok, 46);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AWSDEA athena-todays-partition-missing: re-running the loads doubles the data; MSCK REPAIR finds no non-Hive folders; ALTER TABLE ADD PARTITION makes the report", () => {
    const d = docOf("athena-todays-partition-missing");
    const h = driver(d);
    h.act("rerun");
    assert.equal(h.value("harmed"), true, "rerun causes harm");
    until(h, 41);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("msck");
    until(n, 41);
    assert.notEqual(n.value("missAt"), null, "msck changes nothing");
    const ok = driver(d);
    ok.act("addPart");
    until(ok, 41);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AWSDEA dynamodb-backfill-throttles-checkout: more workers throttle checkout harder; Lambda memory changes nothing; capping the backfill with backoff holds the lunch peak", () => {
    const d = docOf("dynamodb-backfill-throttles-checkout");
    const h = driver(d);
    h.act("more");
    assert.equal(h.value("harmed"), true, "more causes harm");
    until(h, 46);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("memory");
    until(n, 46);
    assert.notEqual(n.value("missAt"), null, "memory changes nothing");
    const ok = driver(d);
    ok.act("cap");
    until(ok, 46);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
});
