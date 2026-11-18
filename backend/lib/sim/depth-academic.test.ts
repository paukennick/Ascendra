// REQ-333 (docs/sims.md 22.37): sim depth for the academic and programming
// courses (round of 2026-11-17). Every document is selected by slug from
// lib/sim/depth-academic.ts (FAIL-2002), is learner-paced, engine 1.2 with an
// ending order, sits on an active objective of its own course (one sim per
// objective), has endings in all three outcome classes and goldens rated
// Good, Mediocre and Bad. A band keeps its base's behavior and carries, as its
// first source, a source read for this round on this course's objective.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { applyCommand, createRun, lintScenario, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, ScenarioDoc } from "./engine/v1/index.ts";
import type { GoldenFile } from "./engine/v1/validate.ts";
import { clientDocument } from "./content-hash.ts";
import { pacingEligible } from "./server-run.ts";
import { backslashEscapeProblems, certMarkProblems, safetyFamilyOf, secondsUnitProblems } from "./lint.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { DEPTH_ACADEMIC, DEPTH_ACADEMIC_ROUND as ROUND } from "./depth-academic.ts";

const entryOf = (slug: string) => ALL_DOCUMENTS.find((e) => e.slug === slug)!;
const docOf = (slug: string): ScenarioDoc => loadDocument(entryOf(slug));
const goldenOf = (slug: string): GoldenFile => JSON.parse(readFileSync(entryOf(slug).golden!, "utf8")) as GoldenFile;

describe("REQ-333: sim depth for the academic and programming courses", () => {
  test("every document is registered by slug, valid, learner-paced, engine 1.2 with an ending order, on its screen and profile", () => {
    assert.ok(DEPTH_ACADEMIC.length > 0);
    const slugs = new Set<string>();
    for (const w of DEPTH_ACADEMIC) {
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
      const fam = safetyFamilyOf(d);
      if (fam === "general") assert.equal(pacingEligible(d, "general"), false);
      const classes = new Set(Object.values(d.endings).filter((x) => x.terminal).map((x) => x.class));
      for (const k of ["target", "recovered", "harm"]) assert.ok(classes.has(k as never), `${w.slug}: ${k}`);
      for (const k of Object.keys(d.endings)) assert.ok(d.scoring.debrief[k], `${w.slug}: debrief for ${k}`);
      assert.deepEqual(secondsUnitProblems(d), [], w.slug);
      assert.deepEqual(backslashEscapeProblems(d), [], w.slug);
      assert.deepEqual(certMarkProblems(d), [], w.slug);
      assert.equal(d.sources[0].checkedAt, ROUND, `${w.slug}: a source on this course's objective, read for this round`);
    }
  });

  test("each document is on an active objective of its own course, one sim per objective", () => {
    for (const w of DEPTH_ACADEMIC) {
      const track = CATALOG_TRACKS.find((t) => t.code === w.course)!;
      assert.ok(track, `${w.course} in the catalog`);
      const titles = new Set(activeUnits(track).flatMap((u) => u.objectives));
      const d = docOf(w.slug);
      assert.ok(titles.has(d.objective), `${w.course}: ${d.objective}`);
      for (const s of d.secondaryObjectives ?? []) assert.ok(titles.has(s), `${w.course}: secondary ${s}`);
      const others = ALL_DOCUMENTS.filter((e) => e.course === w.course && e.slug !== w.slug && loadDocument(e).objective === d.objective);
      assert.deepEqual(others.map((e) => e.slug), [], `${w.slug}: objective already covered`);
    }
  });

  test("the goldens reach every ending but time_up, rate Good, Mediocre and Bad, and the expert path reaches target", () => {
    for (const w of DEPTH_ACADEMIC) {
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
    for (const w of DEPTH_ACADEMIC.filter((x) => x.kind === "band")) {
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

  test("no lint error; nothing typed reaches the engine; no claim of endorsement; the client document drops the rubric", () => {
    for (const w of DEPTH_ACADEMIC) {
      const d = docOf(w.slug);
      const errs = lintScenario(d, { now: ROUND, safetyFamily: safetyFamilyOf(d) }).filter((p) => p.level === "error");
      assert.deepEqual(errs, [], w.slug);
      if (w.screen === "terminal" || w.screen === "data") for (const id of d.phases[d.initialPhase].actions) for (const p of d.actions[id].params ?? []) assert.equal(p.kind, "choice", `${w.slug}.${id}`);
      const { sources, ...learner } = d as unknown as Record<string, unknown>;
      void sources;
      const m = JSON.stringify(learner).match(/\b(Official|Approved|Authorized)\b[^."]{0,40}\b(Python Institute|PCEP|PCAP|exam|prep|training|partner|provider|course|content)\b/i);
      assert.equal(m, null, `${w.slug}: ${m?.[0]}`);
      const c = clientDocument(d) as unknown as Record<string, unknown>;
      assert.equal(c.scoring, undefined);
    }
  });
});

// One behavior per authored case, driven through the engine.
type Drive = { act: (a: string, p?: Record<string, string>) => void; v: (n: string) => unknown };
function driver(slug: string, phase = "work"): Drive {
  const run = createRun(docOf(slug), 1);
  let seq = 0;
  const send = (c: Record<string, unknown>) => {
    const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
    assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
  };
  return {
    act: (action, params) => {
      send({ type: "act", action, ...(params ? { params } : {}) });
      let n = 0;
      while (readValue(run, "busy") === true && run.state.phase === phase && !run.state.ended && n++ < 50) {
        const w = waits(run).find((x) => x.timer === "work")!;
        send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
      }
    },
    v: (n) => readValue(run, n),
  };
}

describe("REQ-333: the new cases behave as taught", () => {
  test("MSHI A1c: only a unit-aware conversion gives 18.1%; leaving Harbor out inflates the rate through missing results; dividing by 10 deflates it", () => {
    const S = "mshi-a1c-units-quality-dashboard";
    const rate = (f?: string) => {
      const d = driver(S);
      if (f) d.act("rewrite", { f });
      return d.v("rate");
    };
    assert.equal(rate(), 41.2);
    assert.equal(rate("convert"), 18.1);
    assert.ok((rate("exclude") as number) > 30, "640 patients look untested and count as poor control");
    assert.ok((rate("divide") as number) < 17.6);
    assert.equal(Math.round((0.09148 * 75 + 2.152) * 10) / 10, 9, "the NGSP equation: 75 mmol/mol is 9%");
    const o = driver(S);
    o.act("overwrite");
    assert.equal(o.v("rate"), 18.1);
    assert.equal(o.v("rowsAlteredOutsideFix"), 1406);
    assert.equal(docOf(S).endingOrder![0], "altered");
  });
});
