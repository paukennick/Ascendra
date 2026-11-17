// REQ-316 (docs/sims.md 22.29): IT sims wave 4. Launch courses first; where
// another course's sim already teaches an objective, a band registers that
// case on this course's objective instead of a new case. Every document is
// selected by slug from lib/sim/it-wave4.ts (FAIL-2002), is learner-paced,
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
import { WAVE4 } from "./it-wave4.ts";

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

describe("IT sims wave 4 (REQ-316)", () => {
  test("every document is registered by slug, valid, learner-paced, engine 1.2 with an ending order, on its screen and profile", () => {
    assert.ok(WAVE4.length > 0);
    const slugs = new Set<string>();
    for (const w of WAVE4) {
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
      assert.equal(d.sources[0].checkedAt, "2026-11-16", `${w.slug}: this course's outline, read for this wave`);
    }
  });

  test("each document is on an active objective of its own course, one per objective in this wave", () => {
    const seen = new Set<string>();
    for (const w of WAVE4) {
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
    for (const w of WAVE4) {
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
    for (const w of WAVE4.filter((x) => x.kind === "band")) {
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

  test("no other exam body's marks outside the sources (trademarks, 2026-11-16)", () => {
    for (const w of WAVE4) {
      const { sources, ...rest } = docOf(w.slug) as unknown as Record<string, unknown>;
      const m = JSON.stringify(rest).match(MARKS);
      assert.equal(m, null, `${w.slug}: ${m?.[0]}`);
      // a band drops the base course's exam outline, which belongs to the base course
      if (w.kind === "band") for (const s of sources as { cite: string }[]) assert.ok(!MARKS.test(s.cite), `${w.slug}: source ${s.cite.slice(0, 60)}`);
    }
  });

  test("no lint error; terminal commands are bounded; nothing waits at the start; the client document drops the rubric", () => {
    for (const w of WAVE4) {
      const d = docOf(w.slug);
      const errs = lintScenario(d, { now: "2026-11-16", safetyFamily: "general" }).filter((p) => p.level === "error");
      assert.deepEqual(errs, [], w.slug);
      if (w.screen === "terminal") for (const id of d.phases[d.initialPhase].actions) for (const p of d.actions[id].params ?? []) assert.equal(p.kind, "choice", `${w.slug}.${id}`);
      const r = driver(d);
      assert.equal(waits(r.run).length, 0, `${w.slug}: no wait pending at the start`);
      const c = clientDocument(d) as unknown as Record<string, unknown>;
      assert.equal(c.scoring, undefined);
    }
  });
});

describe("what each wave 4 case teaches", () => {
  test("Security+ email: enforcing before PayrollCo is aligned breaks the payslips; the gateway rule protects only your own staff; the wire leaves at 10:30 unless held", () => {
    const d = docOf("spoofed-ceo-wire-dmarc");
    const early = driver(d);
    early.act("setPolicy", { p: "reject" });
    assert.equal(early.value("breaksPayroll"), true);
    const ok = driver(d);
    ok.act("alignPayroll");
    ok.act("setPolicy", { p: "quarantine" });
    assert.equal(ok.value("breaksPayroll"), false);
    const gw = driver(d);
    gw.act("gatewayRule");
    assert.equal(gw.value("policy"), "none", "a gateway rule does not change what other receivers see");
    while (gw.minutes() < 21) gw.act("watch");
    assert.equal(gw.value("inboxSpoofs"), 37, "the second wave is quarantined at the gateway");
    const late = driver(d);
    while (late.minutes() < 91) late.act("watch");
    assert.notEqual(late.value("wireSentAt"), null);
    const held = driver(d);
    held.act("holdWire");
    while (held.minutes() < 91) held.act("watch");
    assert.equal(held.value("wireSentAt"), null);
  });
  test("Security+ forensics: shutting down first loses memory; browsing taints; without a hold the 11:00 job deletes the mailbox and, if the laptop is still at the desk, reimages it", () => {
    const d = docOf("departing-engineer-usb-evidence");
    const off = driver(d);
    off.act("shutdown");
    assert.equal(off.value("memLost"), true);
    assert.equal(d.actions.memory.available.includes("not memLost"), true);
    const br = driver(d);
    br.act("browse");
    assert.equal(br.value("tainted"), true);
    const none = driver(d);
    while (none.minutes() < 61) none.act("watch");
    assert.equal(none.value("mailLost"), true);
    assert.equal(none.value("laptopWiped"), true);
    const seized = driver(d);
    seized.act("memory");
    while (seized.minutes() < 61) seized.act("watch");
    assert.equal(seized.value("mailLost"), true);
    assert.equal(seized.value("laptopWiped"), false, "a laptop in your custody is off the network job");
    const held = driver(d);
    held.act("legalHold");
    while (held.minutes() < 61) held.act("watch");
    assert.equal(held.value("mailLost"), false);
  });
});


describe("what each wave 4 case teaches (2)", () => {
  test("CloudOps health checks: the right path makes the targets healthy; widening the matcher also turns them green; suspending only stops the churn", () => {
    const d = docOf("alb-health-check-login-redirect");
    const ok = driver(d);
    ok.act("fixPath");
    while (ok.minutes() < 9) ok.act("watch");
    assert.equal(ok.value("targetsHealthy"), true);
    assert.equal(ok.value("churnOn"), false);
    const wide = driver(d);
    wide.act("widenMatcher");
    while (wide.minutes() < 9) wide.act("watch");
    assert.equal(wide.value("targetsHealthy"), true);
    assert.equal(wide.value("matcherWide"), true);
    const sus = driver(d);
    sus.act("suspend");
    assert.equal(sus.value("churnOn"), false);
    assert.equal(sus.value("targetsHealthy"), false);
    const late = driver(d);
    while (late.minutes() < 61) late.act("watch");
    assert.notEqual(late.value("campaignFailedAt"), null);
    assert.ok((late.value("replaced") as number) > 14, "the group keeps replacing");
  });
});
