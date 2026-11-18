// REQ-336 (docs/sims.md 22.40): the depth round for the CNCF ecosystem, CompTIA,
// security and project-management courses (depth-infra-sec-pm, 2026-11-17).
// Every document is selected by slug from lib/sim/depth-isp.ts (FAIL-2002), is
// learner-paced, engine 1.2 with an ending order, sits on an active objective
// of its own course, has endings in all three outcome classes and goldens
// rated Good, Mediocre and Bad. The new cases are review-paced: each decision
// arrives as a prompt with one choice that meets the criterion, one that is
// partly right and one that causes harm; the behavior tests play each harm
// choice and check it reaches its harm ending, and play the expert choices and
// check the target. The robust rule (round of 2026-11-17): each course in scope
// has at least 4 sims (8 at 60 objectives or more), and every unit with an
// objective that fits the selection rule has a sim whose main objective is in
// it, unless the unit is listed below as no fit with a reason.
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
import { selectionFor } from "./generator/selection.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { DEPTH_ISP } from "./depth-isp.ts";

const ROUND = "2026-11-17";
const entryOf = (slug: string) => ALL_DOCUMENTS.find((e) => e.slug === slug)!;
const docOf = (slug: string): ScenarioDoc => loadDocument(entryOf(slug));
const goldenOf = (slug: string): GoldenFile => JSON.parse(readFileSync(entryOf(slug).golden!, "utf8")) as GoldenFile;

// The courses this builder took to the robust target (lead's brief, 2026-11-17).
export const SCOPE = [
  "CAPA", "CBA", "CCA", "CGOA", "CKS", "ICA", "KCA", "OTCA", "PCA", "CKAD", "CNPA", "CNPE", "KCSA", "KCNA",
  "APLUS_CORE1", "APLUS_CORE2", "DATAAI", "PENTESTPLUS", "SECAIPLUS", "SECURITYX", "AUTOOPSPLUS", "CYSAPLUS", "DATAPLUS", "TECHPLUS", "LINUXFUND", "CEH",
  "CSPP", "ITIL5FND", "PFMP", "PGMP", "PMIPBA", "PMIPMOCP", "PMISP", "CSSGB", "PMICP", "PMICPMAI", "PMIRMP", "CAPM", "CSM", "PMIACP", "PSMI",
];
// Units with a fitting objective that are honestly no fit for a sim on the
// existing screens, as "COURSE|unit title" -> reason (docs/sims.md 22.40).
export const NO_FIT: Readonly<Record<string, string>> = {};

describe("REQ-336: the depth round's documents", () => {
  test("every document is registered by slug, valid, learner-paced, engine 1.2 with an ending order", () => {
    assert.ok(DEPTH_ISP.length > 0);
    const slugs = new Set<string>();
    for (const w of DEPTH_ISP) {
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
      assert.ok(d.endingOrder && d.endingOrder.length >= 3, `${w.slug}: ending order`);
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), `${w.slug}: learner-paced`);
      assert.equal(safetyFamilyOf(d), "general");
      assert.equal(pacingEligible(d, "general"), false);
      const classes = new Set(Object.values(d.endings).filter((x) => x.terminal).map((x) => x.class));
      for (const k of ["target", "recovered", "harm"]) assert.ok(classes.has(k as never), `${w.slug}: ${k}`);
      for (const k of Object.keys(d.endings)) assert.ok(d.scoring.debrief[k], `${w.slug}: debrief for ${k}`);
      // harm endings come first in the order, then target, then recovered
      const order = d.endingOrder!;
      const firstNonHarm = order.findIndex((k) => d.endings[k].class !== "harm");
      assert.ok(firstNonHarm > 0 && order.slice(firstNonHarm).every((k) => d.endings[k].class !== "harm"), `${w.slug}: harm first`);
      assert.deepEqual(secondsUnitProblems(d), [], w.slug);
      assert.deepEqual(backslashEscapeProblems(d), [], w.slug);
      assert.deepEqual(certMarkProblems(d), [], w.slug);
      assert.ok(d.sources[0].checkedAt <= ROUND, `${w.slug}: dated outline first`);
      for (const s of d.sources) assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt), `${w.slug}: every source dated`);
    }
  });

  test("each document is on an active objective of its own course, one sim per objective", () => {
    for (const w of DEPTH_ISP) {
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
    // A band replays its base's goldens unchanged, so its coverage is the
    // base's (some bases reach an ending only by searched path); the band
    // test below checks it matches the base outcome for outcome.
    for (const w of DEPTH_ISP.filter((x) => !x.base)) {
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

  test("a band keeps its base's case and golden outcomes, for another course, citing this course's outline first", () => {
    for (const w of DEPTH_ISP.filter((x) => x.kind === "band")) {
      const [bc, bs] = w.base!.split("/");
      const base = ALL_DOCUMENTS.find((e) => e.course === bc && e.slug === bs)!;
      assert.ok(base, `${w.slug}: base ${w.base}`);
      assert.notEqual(w.course, bc, `${w.slug}: a band is for another course`);
      const bd = loadDocument(base);
      const d = docOf(w.slug);
      assert.deepEqual(Object.keys(d.actions), Object.keys(bd.actions), w.slug);
      assert.deepEqual(d.endingOrder, bd.endingOrder, w.slug);
      const bg = JSON.parse(readFileSync(base.golden!, "utf8")) as GoldenFile;
      assert.deepEqual(goldenOf(w.slug).paths.map((p) => [p.id, p.expect.ending, p.expect.rating]), bg.paths.map((p) => [p.id, p.expect.ending, p.expect.rating]), w.slug);
      assert.notDeepEqual(d.sources[0], bd.sources[0], `${w.slug}: this course's outline first`);
    }
  });

  test("no lint error; no 'Official', 'Approved' or 'Authorized' claim; the client document drops the rubric", () => {
    for (const w of DEPTH_ISP) {
      const d = docOf(w.slug);
      const errs = lintScenario(d, { now: ROUND, safetyFamily: "general" }).filter((p) => p.level === "error");
      assert.deepEqual(errs, [], w.slug);
      // citations (sources, and a threshold's or noProgress's source) are not learner claims
      const learner = JSON.stringify(d, (k, v) => (k === "sources" || k === "source" ? undefined : v));
      const m = learner.match(/\b(Official|Approved|Authorized)\b[^."]{0,40}\b(PMI|CompTIA|exam|prep|training|partner|provider|course|content)\b/i);
      assert.equal(m, null, `${w.slug}: ${m?.[0]}`);
      assert.equal((clientDocument(d) as unknown as Record<string, unknown>).scoring, undefined);
    }
  });
});

// Behavior: the new cases move one review at a time and take each decision as
// a prompt. Playing the expert choices reaches target; playing one decision's
// harm choice (expert elsewhere) reaches that decision's harm ending.
describe("REQ-336: each new case behaves as taught", () => {
  function play(slug: string, pick: (prompt: string, choices: { id: string }[]) => string) {
    const d = docOf(slug);
    const run = createRun(d, 1);
    let seq = 0;
    const send = (c: Record<string, unknown>) => {
      const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
      assert.ok(r.ok, `${slug} ${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
    };
    let guard = 0;
    while (run.state.phase === "run" && !run.state.ended && guard++ < 50) {
      const w = waits(run).find((x) => x.timer === "period")!;
      send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
      while (run.state.openPrompt) {
        const p = d.prompts![run.state.openPrompt];
        send({ type: "choose", prompt: run.state.openPrompt, choice: pick(run.state.openPrompt, p.choices) });
      }
    }
    if (run.state.openReasoning) send({ type: "reason", moment: run.state.openReasoning, answered: true });
    send({ type: "act", action: "closeOut", params: { how: "honest" } });
    send({ type: "act", action: "close" });
    return { run, v: (n: string) => readValue(run, n) };
  }
  // the kit's grading is in the criteria rows: the "met" row names the good choice
  function graded(d: ScenarioDoc, prompt: string, score: "met" | "partial"): string {
    const decision = prompt.replace(/Prompt$/, "");
    const row = d.scoring.criteria.find((c) => c.id === `${decision}Crit`)!.rows.find((r) => r.score === score)!;
    return /"([^"]+)"/.exec(row.when)![1];
  }

  test("the expert choices reach target with no harm counted", () => {
    for (const w of DEPTH_ISP.filter((x) => x.kind === "scenario")) {
      const d = docOf(w.slug);
      const r = play(w.slug, (p) => graded(d, p, "met"));
      assert.equal(r.v("missCount"), 0, w.slug);
      assert.equal(r.run.state.ended?.ending, "target", w.slug);
    }
  });

  test("each harm choice reaches its own harm ending, even with every other decision right", () => {
    for (const w of DEPTH_ISP.filter((x) => x.kind === "scenario")) {
      const d = docOf(w.slug);
      for (const pid of Object.keys(d.prompts ?? {})) {
        const decision = pid.replace(/Prompt$/, "");
        const met = graded(d, pid, "met");
        const partial = graded(d, pid, "partial");
        const harm = d.prompts![pid].choices.map((c) => c.id).find((id) => id !== met && id !== partial)!;
        const r = play(w.slug, (p) => (p === pid ? harm : graded(d, p, "met")));
        assert.equal(r.v("missCount"), 1, `${w.slug}/${pid}`);
        assert.equal(r.run.state.ended?.ending, `${decision}Harm`, `${w.slug}/${pid}`);
        assert.equal(d.endings[`${decision}Harm`].class, "harm");
      }
    }
  });

  test("a partly right decision is never the target and never harm", () => {
    for (const w of DEPTH_ISP.filter((x) => x.kind === "scenario")) {
      const d = docOf(w.slug);
      const first = Object.keys(d.prompts ?? {})[0];
      const r = play(w.slug, (p) => graded(d, p, p === first ? "partial" : "met"));
      const end = r.run.state.ended?.ending;
      assert.equal(d.endings[end as string].class, "recovered", w.slug);
    }
  });
});

describe("REQ-336: the robust rule for every course in scope", () => {
  const mainUnit = (code: string, objective: string) => activeUnits(CATALOG_TRACKS.find((t) => t.code === code)!).find((u) => u.objectives.includes(objective));

  test("each course has at least 4 sims (8 at 60 objectives or more)", () => {
    for (const code of SCOPE) {
      const track = CATALOG_TRACKS.find((t) => t.code === code)!;
      assert.ok(track, code);
      const n = activeUnits(track).reduce((a, u) => a + u.objectives.length, 0);
      const sims = ALL_DOCUMENTS.filter((e) => e.course === code).length;
      assert.ok(sims >= (n >= 60 ? 8 : 4), `${code}: ${sims} sims for ${n} objectives`);
    }
  });

  test("every unit with an objective that fits the selection rule has a sim whose main objective is in it, or is recorded as no fit", () => {
    for (const code of SCOPE) {
      const track = CATALOG_TRACKS.find((t) => t.code === code)!;
      const mains = ALL_DOCUMENTS.filter((e) => e.course === code).map((e) => loadDocument(e).objective);
      for (const u of activeUnits(track)) {
        const fits = u.objectives.some((o) => selectionFor({ objective: o, unitTitle: u.title, unitWeight: u.weight ?? null, weightsAreExam: true } as never).qualifies);
        if (!fits) continue;
        const covered = mains.some((m) => mainUnit(code, m)?.title === u.title);
        assert.ok(covered || NO_FIT[`${code}|${u.title}`], `${code}: unit "${u.title}" has a fitting objective and no sim`);
      }
    }
  });

  // The lead's follow-up: purpose-written cases (not only bands) for each
  // course's top two domains. Rank units by weight; w2 is the second unit's
  // weight. Every unit weighted above w2 needs a scenario, and enough of the
  // units tied at w2 do to make two domains (one tied unit when a single unit
  // leads; two when several share the top weight).
  test("each course's top two domains have a purpose-written case, not only a band", () => {
    for (const code of SCOPE) {
      const track = CATALOG_TRACKS.find((t) => t.code === code)!;
      const units = activeUnits(track).filter((u) => typeof u.weight === "number");
      if (units.length < 2) continue; // no unit weights (Linux Fundamentals)
      const w2 = units.map((u) => u.weight as number).sort((a, b) => b - a)[1];
      const scenarioUnits = new Set(
        ALL_DOCUMENTS.filter((e) => e.course === code && e.kind === "scenario").map((e) => mainUnit(code, loadDocument(e).objective)?.title),
      );
      const higher = units.filter((x) => (x.weight as number) > w2);
      for (const u of higher) assert.ok(scenarioUnits.has(u.title), `${code}: top domain "${u.title}" has no purpose-written case`);
      const tied = units.filter((x) => x.weight === w2);
      const covered = tied.filter((u) => scenarioUnits.has(u.title)).length;
      assert.ok(covered >= 2 - higher.length, `${code}: ${covered} purpose-written case(s) among the domains tied at ${w2} (${tied.map((u) => u.title).join(", ")})`);
    }
  });
});

describe("REQ-336: sources", () => {
  // Facts a case's scoring depends on cite the primary page, read with
  // WebFetch; a search-listing source marked "to verify" may remain only as a
  // course outline (the first source) or in this allow-list of pages a band
  // inherits from another builder's base and that could not be reached here.
  const INHERITED_UNVERIFIED = new Set([
    "https://csrc.nist.gov/pubs/sp/800/61/r3/final",
    "https://www.nist.gov/publications/guide-test-training-and-exercise-programs-it-plans-and-capabilities-0",
  ]);
  test("no non-outline source is marked to verify, and every primary reading has an address and a read date", () => {
    for (const w of DEPTH_ISP) {
      const d = docOf(w.slug);
      const [, ...rest] = d.sources ?? [];
      for (const s of rest as { cite: string; note?: string; url?: string; checkedAt?: string }[]) {
        if ((s.note ?? "").includes("to verify")) assert.ok(s.url && INHERITED_UNVERIFIED.has(s.url), `${w.slug}: "${s.cite}" is still marked to verify`);
        if ((s.note ?? "").includes("with WebFetch")) assert.ok(s.url && /^\d{4}-\d{2}-\d{2}$/.test(s.checkedAt ?? ""), `${w.slug}: "${s.cite}" lacks an address or read date`);
      }
    }
  });
});
