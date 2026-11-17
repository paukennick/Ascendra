// REQ-321 (docs/sims.md 22.31): sims for the PMI and CompTIA courses that had
// none (round of 2026-11-17). Breadth first: every course listed below gets a
// sim on its highest-weighted domain, then depth, highest weight first. Where
// another course's sim already teaches the objective, a band registers that
// case on this course's objective. Every document is selected by slug from
// lib/sim/pm-comptia.ts (FAIL-2002), is learner-paced, engine 1.2 with an
// ending order, sits on an active objective of its own course, has endings in
// all three outcome classes and goldens rated Good, Mediocre and Bad. Bands
// keep their base's behavior, carry this course's outline as their first
// source (read for this round), drop the base course's outline, and name no
// "Official", "Approved" or "Authorized" anywhere a learner reads.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { lintScenario, validateScenario } from "./engine/v1/index.ts";
import type { ScenarioDoc } from "./engine/v1/index.ts";
import type { GoldenFile } from "./engine/v1/validate.ts";
import { clientDocument } from "./content-hash.ts";
import { pacingEligible } from "./server-run.ts";
import { backslashEscapeProblems, certMarkProblems, safetyFamilyOf, secondsUnitProblems } from "./lint.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { PM_COMPTIA } from "./pm-comptia.ts";

const ROUND = "2026-11-17";
const entryOf = (slug: string) => ALL_DOCUMENTS.find((e) => e.slug === slug)!;
const docOf = (slug: string): ScenarioDoc => loadDocument(entryOf(slug));
const goldenOf = (slug: string): GoldenFile => JSON.parse(readFileSync(entryOf(slug).golden!, "utf8")) as GoldenFile;
const unitOf = (course: string, objective: string) => activeUnits(CATALOG_TRACKS.find((t) => t.code === course)!).find((u) => u.objectives.includes(objective));

// The courses this round covers, and the round's breadth rule: each has a sim
// on (one of) its highest-weighted domains.
const COURSES = ["PMP", "CAPM", "PMIACP", "PROJECTPLUS", "SERVERPLUS", "CLOUDNETX", "CLOUDPLUS", "AUTOOPSPLUS", "DATAPLUS", "DATAAI", "TECHPLUS", "PMICPMAI", "CMPCBS"];

describe("REQ-321: sims for the PMI and CompTIA courses that had none", () => {
  test("every document is registered by slug, valid, learner-paced, engine 1.2 with an ending order, on its screen and profile", () => {
    assert.ok(PM_COMPTIA.length > 0);
    const slugs = new Set<string>();
    for (const w of PM_COMPTIA) {
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
      assert.deepEqual(certMarkProblems(d), [], w.slug);
      assert.equal(d.sources[0].checkedAt, ROUND, `${w.slug}: this course's outline, read for this round`);
    }
  });

  test("each document is on an active objective of its own course, one sim per objective", () => {
    const seen = new Set<string>();
    for (const w of PM_COMPTIA) {
      const track = CATALOG_TRACKS.find((t) => t.code === w.course)!;
      assert.ok(track, `${w.course} in the catalog`);
      const titles = new Set(activeUnits(track).flatMap((u) => u.objectives));
      const d = docOf(w.slug);
      assert.ok(titles.has(d.objective), `${w.course}: ${d.objective}`);
      for (const s of d.secondaryObjectives ?? []) assert.ok(titles.has(s), `${w.course}: secondary ${s}`);
      const key = `${w.course}|${d.objective}`;
      assert.ok(!seen.has(key), key);
      seen.add(key);
      const others = ALL_DOCUMENTS.filter((e) => e.course === w.course && e.slug !== w.slug && loadDocument(e).objective === d.objective);
      assert.deepEqual(others.map((e) => e.slug), [], `${w.slug}: objective already covered`);
    }
  });

  test("breadth first: every course of this round has a sim on its highest-weighted domain", () => {
    for (const code of COURSES) {
      const track = CATALOG_TRACKS.find((t) => t.code === code)!;
      const units = activeUnits(track);
      const top = Math.max(...units.map((u) => u.weight ?? 0));
      const mine = PM_COMPTIA.filter((w) => w.course === code);
      assert.ok(mine.length > 0, `${code}: no sim`);
      // a course without unit weights (the degree foundations) counts any unit
      const onTop = mine.filter((w) => (unitOf(code, docOf(w.slug).objective)?.weight ?? 0) === top);
      assert.ok(onTop.length > 0, `${code}: no sim on a ${top}% domain`);
    }
  });

  test("the goldens reach every ending but time_up, rate Good, Mediocre and Bad, and the expert path reaches target", () => {
    for (const w of PM_COMPTIA) {
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
    for (const w of PM_COMPTIA.filter((x) => x.kind === "band")) {
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

  test("a band drops the base course's exam outline and cites this course's; no 'Official', 'Approved' or 'Authorized'", () => {
    const OUTLINE = /Exam Objectives|exam guide|course catalog|Domains & Competencies|Examination Content Outline|certification page/i;
    for (const w of PM_COMPTIA) {
      const d = docOf(w.slug);
      if (w.kind === "band") {
        const [bc] = w.base!.split("/");
        const rest = d.sources.slice(1);
        assert.ok(!rest.some((s) => OUTLINE.test(s.cite)), `${w.slug}: the base course (${bc}) outline is dropped`);
      }
      const { sources, ...learner } = d as unknown as Record<string, unknown>;
      void sources;
      // a claim of endorsement ("Official PMP prep", "CompTIA Authorized"), not
      // the plain verb a case uses for a change ("Approved: outbound TCP 443")
      const m = JSON.stringify(learner).match(/\b(Official|Approved|Authorized)\b[^."]{0,40}\b(PMI|CompTIA|exam|prep|training|partner|provider|course|content)\b|\b(PMI|CompTIA)\b[^."]{0,20}\b(Official|Approved|Authorized)\b/i);
      assert.equal(m, null, `${w.slug}: ${m?.[0]}`);
    }
  });

  test("no lint error; nothing typed reaches the engine on the terminal; the client document drops the rubric", () => {
    for (const w of PM_COMPTIA) {
      const d = docOf(w.slug);
      const errs = lintScenario(d, { now: ROUND, safetyFamily: "general" }).filter((p) => p.level === "error");
      assert.deepEqual(errs, [], w.slug);
      if (w.screen === "terminal") for (const id of d.phases[d.initialPhase].actions) for (const p of d.actions[id].params ?? []) assert.equal(p.kind, "choice", `${w.slug}.${id}`);
      const c = clientDocument(d) as unknown as Record<string, unknown>;
      assert.equal(c.scoring, undefined);
    }
  });
});
