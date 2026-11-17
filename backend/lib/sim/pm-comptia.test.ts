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
import { applyCommand, createRun, lintScenario, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, ScenarioDoc } from "./engine/v1/index.ts";
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
// on (one of) its highest-weighted domains. The second part of 22.31 adds
// PgMP, PfMP, PMI-PMOCP, PMI-PBA, CSPP and CAPA, and PMI-RMP's risk register
// on its 23% identification domain.
const COURSES = ["PMP", "CAPM", "PMIACP", "PROJECTPLUS", "PMISP", "PMICP", "SERVERPLUS", "CLOUDNETX", "CLOUDPLUS", "AUTOOPSPLUS", "DATAPLUS", "DATAAI", "TECHPLUS", "PMICPMAI", "CMPCBS", "PGMP", "PFMP", "PMIPMOCP", "PMIPBA", "CSPP", "CAPA", "PMIRMP"];

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

describe("REQ-321: the first predictive case on the project dashboard (PMP clinic fit-out)", () => {
  const SLUG = "pmp-clinic-fitout-schedule-variance";
  type Choices = { change: string; risk: string; report: string; claim: string; lessons: string };
  const PROMPT_KEY: Record<string, keyof Choices> = { sinkPrompt: "change", panelPrompt: "risk", reportPrompt: "report", claimPrompt: "claim" };
  function play(ch: Choices, stopAtWeek = 99) {
    const d = docOf(SLUG);
    const run = createRun(d, 1);
    let seq = 0;
    const send = (c: Record<string, unknown>) => {
      const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
      assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
    };
    while (run.state.phase === "build" && !run.state.ended && (readValue(run, "week") as number) < stopAtWeek) {
      const w = waits(run).find((x) => x.timer === "week")!;
      send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
      while (run.state.openPrompt) send({ type: "choose", prompt: run.state.openPrompt, choice: ch[PROMPT_KEY[run.state.openPrompt]] });
    }
    return { run, v: (n: string) => readValue(run, n) as number };
  }
  const EXPERT: Choices = { change: "ccb", risk: "contingency", report: "honest", claim: "review", lessons: "held" };

  test("predictive mode, the project (earned value) profile, a PMP objective in the Process domain", () => {
    const d = docOf(SLUG);
    assert.equal(d.screen.dashboard!.mode, "predictive");
    assert.equal(d.outcome.profile, "project");
    assert.equal(unitOf("PMP", d.objective)?.title, "Process");
    assert.ok(d.screen.dashboard!.chart!.series.some((s) => s.style === "plan"), "planned value line");
  });

  test("earned value: SPI = EV / PV and CPI = EV / AC; the clinic's late drawings put every path behind at week 5", () => {
    for (const risk of ["contingency", "wait", "crash"]) {
      const { v } = play({ ...EXPERT, risk }, 5);
      assert.equal(v("week"), 5);
      assert.equal(v("pv"), 150);
      assert.ok(Math.abs(v("spi") - v("ev") / v("pv")) < 1e-9);
      assert.ok(Math.abs(v("cpi") - v("ev") / v("ac")) < 1e-9);
      assert.ok(v("spi") < 0.95, `${risk}: behind at the status report (${v("spi")})`);
    }
  });

  test("waiting past R4's trigger costs two critical-path weeks; the planned contingency costs $3,000 and no time", () => {
    const planned = play(EXPERT);
    const waited = play({ ...EXPERT, risk: "wait" });
    assert.equal(planned.v("ev") - waited.v("ev"), 30);
    assert.equal(planned.v("spi"), 1);
    assert.ok(waited.v("spi") < 0.95);
  });

  test("the claim is half owed: assessed, $4,500; signed unread, $9,000", () => {
    const reviewed = play(EXPERT);
    const signed = play({ ...EXPERT, claim: "signed" });
    assert.equal(signed.v("ac") - reviewed.v("ac"), 4.5);
  });

  test("reporting green while behind is harm, whatever else went well; scope added outside change control is never the target", () => {
    const g = goldenOf(SLUG);
    assert.equal(g.paths.find((p) => p.id === "green")!.expect.class, "harm");
    for (const p of g.paths.filter((x) => x.expect.criteria?.changeCrit === "missed")) assert.notEqual(p.expect.class, "target", p.id);
    const d = docOf(SLUG);
    assert.equal(d.endingOrder![0], "misreported");
  });
});

// sims-pm-2 (docs/sims.md 22.31, second part): one behavior per new case. The
// review-paced cases move a period at a time and take each decision as a
// prompt, as their golden steps do (scripts/sim-golden/pm2-helpers.ts).
describe("REQ-321 (sims-pm-2): the new PMI, CSPP and CAPA cases behave as taught", () => {
  function playReviews(slug: string, answers: Record<string, string>, o: { counter?: string; phase?: string; timer?: string } = {}) {
    const counter = o.counter ?? "p", phase = o.phase ?? "run", timer = o.timer ?? "period";
    const run = createRun(docOf(slug), 1);
    let seq = 0;
    const send = (c: Record<string, unknown>) => {
      const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
      assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
    };
    let guard = 0;
    while (run.state.phase === phase && !run.state.ended && guard++ < 50) {
      const w = waits(run).find((x) => x.timer === timer)!;
      send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
      while (run.state.openPrompt) send({ type: "choose", prompt: run.state.openPrompt, choice: answers[run.state.openPrompt] });
    }
    void counter;
    return { run, v: (n: string) => readValue(run, n) as number | boolean | string };
  }
  const gold = (slug: string, id: string) => goldenOf(slug).paths.find((p) => p.id === id)!.expect;

  test("PgMP: a risk to a benefit left in a project fails certification and overspends; escalated, it stays within budget and appetite", () => {
    const S = "pgmp-transit-program-steering-review";
    const base = { statusPrompt: "consolidated", gatePrompt: "conditional", benefitPrompt: "corrective" };
    const left = playReviews(S, { ...base, riskPrompt: "team" });
    const up = playReviews(S, { ...base, riskPrompt: "escalated" });
    assert.equal(left.v("certSlip"), true);
    assert.equal(up.v("certSlip"), false);
    assert.ok((up.v("spent") as number) <= 6000 && (left.v("spent") as number) > 6000);
    assert.equal(up.v("aboveCount"), 0);
    assert.equal(gold(S, "selfGate").ending, "authority");
  });

  test("PfMP: scenario C, approved by the board, still breaks the meters' dependency on billing; scenario B keeps the 40 million budget", () => {
    const S = "pfmp-water-utility-rebalance";
    const base = { impactPrompt: "rescored", scenPrompt: "three", reallocPrompt: "reallocated" };
    assert.equal(playReviews(S, { ...base, recPrompt: "cutBilling" }).v("billingBreak"), true);
    const b = playReviews(S, { ...base, recPrompt: "governed" });
    assert.equal(b.v("billingBreak"), false);
    assert.equal(b.v("spent"), 40);
    assert.equal(gold(S, "direct").ending, "authority");
    assert.equal(gold("water-utility-rebalance-pmipmocp", "direct").ending, "authority");
  });

  test("CSPP: the broker's lot ends up dumped and a 'zero-impact' claim is exposed; the certified recycler and an honest report are not", () => {
    const S = "cspp-school-laptop-p5-review";
    const base = { p5Prompt: "full", offerPrompt: "repairable" };
    const bad = playReviews(S, { ...base, dispPrompt: "lowest", claimPrompt: "zero" });
    const good = playReviews(S, { ...base, dispPrompt: "certified", claimPrompt: "honest" });
    assert.equal(bad.v("dumped"), true);
    assert.equal(bad.v("exposed"), true);
    assert.equal(good.v("dumped"), false);
    assert.equal(good.v("aboveCount"), 0);
    assert.ok((good.v("spent") as number) <= 1600);
  });

  test("PMI-RMP: EMV 200 to 50 for 80 keeps the reserve; an accepted R2 overdraws it; a documented trigger starts the fallback at 91%", () => {
    const S = "pmirmp-warehouse-risk-register";
    const base = { regPrompt: "validated", qualPrompt: "matrix" };
    const exp = playReviews(S, { ...base, emvPrompt: "mitigate", trigPrompt: "documented" });
    assert.equal(exp.v("fallback"), true);
    assert.equal(exp.v("spent"), 140);
    assert.ok((playReviews(S, { ...base, emvPrompt: "accept", trigPrompt: "documented" }).v("spendPct") as number) > 100);
    assert.equal(playReviews(S, { ...base, emvPrompt: "mitigate", trigPrompt: "vague" }).v("failedGoLive"), true);
  });

  test("PMI-PBA: building on an unsigned baseline costs two weeks of earned value and is harm", () => {
    const S = "pmipba-claims-portal-baseline-signoff";
    const o = { counter: "week", phase: "build", timer: "week" };
    const base = { conflictPrompt: "workshop", allocPrompt: "allocated", crPrompt: "impact" };
    const signed = playReviews(S, { ...base, signPrompt: "consensus" }, o);
    const unsigned = playReviews(S, { ...base, signPrompt: "startBuild" }, o);
    assert.equal((signed.v("ev") as number) - (unsigned.v("ev") as number), 20);
    assert.equal(gold(S, "unsigned").class, "harm");
    assert.equal(docOf(S).endingOrder![0], "unsigned");
  });

  test("PMP move: a fixed price on uncertain scope costs a premium; termination before the cure step costs schedule; EAC is BAC / CPI", () => {
    const S = "pmp-contact-center-move-procurement";
    const o = { counter: "week", phase: "build", timer: "week" };
    const exp = { contractPrompt: "tm", resPrompt: "negotiate", vendorPrompt: "cure", financePrompt: "request" };
    const e = playReviews(S, exp, o);
    const fixed = playReviews(S, { ...exp, contractPrompt: "fixed" }, o);
    const term = playReviews(S, { ...exp, vendorPrompt: "terminate" }, o);
    assert.equal((fixed.v("ac") as number) - (e.v("ac") as number), 9);
    assert.equal((e.v("ev") as number) - (term.v("ev") as number), 30);
    assert.ok((e.v("spi") as number) >= 0.95 && (e.v("cpi") as number) >= 0.95);
    assert.ok(docOf(S).screen.dashboard!.meters!.some((m) => m.value.includes("300 / cpi")));
    assert.equal(unitOf("PMP", docOf(S).objective)?.title, "Process");
  });

  test("PMP permits: a hybrid plan with the amendment through change control goes live within the law; parked, it does not", () => {
    const S = "pmp-permit-portal-hybrid-plan";
    const o = { counter: "week", phase: "build", timer: "week" };
    const exp = { approachPrompt: "hybrid", estimatePrompt: "threePoint", changePrompt: "ccb", velocityPrompt: "reprioritize" };
    const e = playReviews(S, exp, o);
    assert.equal(e.v("legalGap"), false);
    assert.ok((e.v("spi") as number) >= 0.95);
    assert.equal(playReviews(S, { ...exp, changePrompt: "ignore" }, o).v("legalGap"), true);
    assert.equal(playReviews(S, { ...exp, approachPrompt: "adaptive" }, o).v("legalGap"), true);
    assert.equal((8 + 4 * 12 + 22) / 6, 13, "the PERT figure the case teaches");
    assert.equal(unitOf("PMP", docOf(S).objective)?.title, "Process");
  });

  test("CAPA: argo retry finishes before 05:30; resubmit is late; a run without eu-west is a wrong report; OnError is never the fix", () => {
    const S = "argo-nightly-dag-region-failure";
    function drive(how: string) {
      const run = createRun(docOf(S), 1);
      let seq = 0;
      const send = (c: Record<string, unknown>) => {
        const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
        assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
      };
      const settle = () => { while (readValue(run, "busy") === true && !run.state.ended) { const w = waits(run).find((x) => x.timer === "work")!; send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due }); } };
      send({ type: "act", action: "recover", params: { h: how } });
      settle();
      while (run.state.phase === "incident" && run.state.tick * run.c.dt < 3700) { send({ type: "act", action: "watch" }); settle(); }
      return (n: string) => readValue(run, n);
    }
    assert.notEqual(drive("retry")("reportAt"), null);
    assert.notEqual(drive("resubmit")("lateAt"), null);
    assert.equal(drive("partial")("partial"), true);
    for (const p of goldenOf(S).paths) if (p.commands.some((c) => (c as { params?: { r?: string } }).params?.r === "onError")) assert.notEqual(p.expect.criteria?.prevent, "met", p.id);
    assert.equal(gold(S, "resubmit").ending, "late");
  });
});
