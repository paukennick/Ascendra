// REQ-320 (docs/sims.md 22.30): cloud sims of the 2026-11-17 round. Breadth
// first for the Azure, AWS, Google Cloud and CNCF courses that had none, then
// depth; where another course's sim already teaches an objective, a band
// registers that case on this course's objective instead of a new case.
// Every document is selected by slug from lib/sim/it-cloud.ts (FAIL-2002), is learner-paced,
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
import { CLOUD } from "./it-cloud.ts";

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

describe("cloud sims (REQ-320)", () => {
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
      assert.equal(d.sources[0].checkedAt, "2026-11-17", `${w.slug}: this course's outline, read for this round`);
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
      const errs = lintScenario(d, { now: "2026-11-17", safetyFamily: "general" }).filter((p) => p.level === "error");
      assert.deepEqual(errs, [], w.slug);
      if (w.screen === "terminal") for (const id of d.phases[d.initialPhase].actions) for (const p of d.actions[id].params ?? []) assert.equal(p.kind, "choice", `${w.slug}.${id}`);
      const r = driver(d);
      assert.equal(waits(r.run).length, 0, `${w.slug}: no wait pending at the start`);
      const c = clientDocument(d) as unknown as Record<string, unknown>;
      assert.equal(c.scoring, undefined);
    }
  });
});

describe("what each new cloud case teaches (REQ-320)", () => {
  const until = (r: ReturnType<typeof driver>, m: number) => {
    while (r.minutes() < m && !r.run.state.ended && r.run.state.phase === "incident") r.act("watch");
  };
  test("CKS Falco: isolating the pod alone leaves the token good at 14:30; removing the RoleBinding cuts it off; deleting first loses the evidence", () => {
    const d = docOf("falco-shell-in-catalog-pod");
    const iso = driver(d);
    iso.act("quarantine");
    until(iso, 31);
    assert.notEqual(iso.value("stolenAt"), null, "the ReplicaSet's replacement still carries the token");
    const cut = driver(d);
    cut.act("rbac");
    until(cut, 31);
    assert.equal(cut.value("stolenAt"), null);
    const del = driver(d);
    del.act("deletePod");
    assert.equal(del.value("evidenceLost"), true);
    const roll = driver(d);
    roll.act("harden");
    assert.equal(roll.value("evidenceLost"), true, "a rollout replaces the compromised pod too");
  });
  test("DP-300 blocking: killing the waiting sessions leaves invoicing blocked; KILL on the head blocker ends it; a restart drops everyone", () => {
    const d = docOf("sleeping-session-blocks-orders");
    const v = driver(d);
    v.act("killVictims");
    until(v, 31);
    assert.notEqual(v.value("invMissAt"), null);
    const k = driver(d);
    k.act("kill");
    until(k, 31);
    assert.equal(k.value("invMissAt"), null);
    const r = driver(d);
    r.act("restart");
    assert.ok(r.minutes() >= 30, "the restart's recovery runs past the deadline");
  });
  test("AZ-700 routing: an NSG rule or a restart changes nothing; deleting the route restores traffic around the firewall; pointing it at the firewall fixes it", () => {
    const d = docOf("stale-udr-to-retired-nva");
    const s = driver(d);
    s.act("nsgAllow");
    s.act("restartVm");
    assert.equal(s.value("egressOk"), false);
    const b = driver(d);
    b.act("deleteRoute");
    assert.equal(b.value("egressOk"), true);
    assert.equal(b.value("bypass"), true);
    const f = driver(d);
    f.act("fixRoute");
    until(f, 46);
    assert.equal(f.value("batchMissAt"), null);
  });
  test("PCA p99: a gate on the mean still passes and v2 is promoted at 14:00; aborting holds it", () => {
    const d = docOf("canary-gate-wrong-p99-query");
    const m = driver(d);
    m.act("fixGate", { g: "mean" });
    until(m, 31);
    assert.equal(m.value("promoted"), true);
    const a = driver(d);
    a.act("query", { q: "right" });
    a.act("abort");
    until(a, 31);
    assert.equal(a.value("promoted"), false);
  });
  test("ICA retries: more retries take the healthy pods down at the sale; bounded retries hold; a 100% ejection limit is flagged", () => {
    const d = docOf("retry-storm-one-bad-ratings-pod");
    const more = driver(d);
    more.act("setRetries", { r: "more" });
    until(more, 41);
    assert.notEqual(more.value("saleDownAt"), null);
    const ok = driver(d);
    ok.act("setRetries", { r: "sane" });
    ok.act("setOutlier", { e: "half" });
    until(ok, 41);
    assert.equal(ok.value("saleDownAt"), null);
    assert.equal(ok.value("healthy"), true);
    const all = driver(d);
    all.act("setOutlier", { e: "all" });
    assert.equal(all.value("outlierOk"), false);
  });
  test("OTCA propagation: sampling everything does not join the traces; switching checkout to B3 splits inventory; setting payments to W3C joins them", () => {
    const d = docOf("split-traces-b3-propagator");
    const s = driver(d);
    s.act("sampleAll");
    assert.equal(s.value("linked"), false);
    const c = driver(d);
    c.act("setCheckout");
    assert.equal(c.value("linked"), true);
    assert.equal(c.value("checkoutProp"), "b3");
    const p = driver(d);
    p.act("setPay");
    p.act("readTrace");
    assert.equal(p.value("linked"), true);
    assert.notEqual(p.value("foundAt"), null);
  });
});

describe("what each case of the second cloud round teaches (REQ-320, sims-cloud-2)", () => {
  const until = (r: ReturnType<typeof driver>, m: number) => {
    while (r.minutes() < m && !r.run.state.ended && r.run.state.phase === "incident") r.act("watch");
  };
  test("AWS DEA Kinesis: memory and shards leave the shard blocked; LATEST skips the backlog; bisect with an S3 destination catches up in time", () => {
    const d = docOf("kinesis-poison-record-blocks-shard");
    const cap = driver(d);
    cap.act("memory");
    cap.act("reshard");
    until(cap, 61);
    assert.notEqual(cap.value("reportMissAt"), null);
    const skip = driver(d);
    skip.act("latest");
    assert.equal(skip.value("skipped"), true);
    const ok = driver(d);
    ok.act("configure", { d: "s3" });
    until(ok, 61);
    assert.equal(ok.value("reportMissAt"), null);
    assert.equal(ok.value("caughtUp"), true);
  });
  test("GCPNET Pod range: max Pods cannot change on the old pool and a bigger node subnet does nothing; a new Pod range and pool scale in time", () => {
    const d = docOf("gke-pod-range-exhausted-before-promo");
    const n = driver(d);
    n.act("tryMax");
    n.act("expand");
    until(n, 56);
    assert.notEqual(n.value("promoMissAt"), null);
    const ok = driver(d);
    ok.act("addRange");
    ok.act("nodePool");
    until(ok, 56);
    assert.equal(ok.value("poolReady"), true);
    assert.equal(ok.value("promoMissAt"), null);
  });
  test("GCPDBE pooling: max_connections and the pooler restart the database now; capping Cloud Run holds the peak", () => {
    const d = docOf("cloud-run-exhausts-sql-connections");
    for (const a of ["maxConn", "poolNow"]) {
      const r = driver(d);
      r.act(a);
      assert.equal(r.value("restarted"), true, a);
    }
    const ok = driver(d);
    ok.act("cap");
    until(ok, 41);
    assert.equal(ok.value("peakMissAt"), null);
  });
  test("GCPMLE out of memory: no-quota hardware and a retry never run; accumulation runs; reverting the batch runs with the wrong effective batch", () => {
    const d = docOf("nightly-retrain-cuda-oom-after-batch-change");
    for (const c of ["a100", "same"]) {
      const r = driver(d);
      r.act("submit", { c });
      until(r, 61);
      assert.notEqual(r.value("launchMissAt"), null, c);
    }
    const ok = driver(d);
    ok.act("submit", { c: "accum" });
    until(ok, 61);
    assert.equal(ok.value("launchMissAt"), null);
    const rv = driver(d);
    rv.act("submit", { c: "revert" });
    until(rv, 61);
    assert.equal(rv.value("healthy"), true);
    assert.equal(rv.value("cfg"), "revert");
  });
  test("AZ-120 latency: a resize changes nothing; detaching the table bypasses the firewall; removing the one route fixes it", () => {
    const d = docOf("nva-route-between-sap-app-and-db");
    const r = driver(d);
    r.act("resize");
    until(r, 51);
    assert.notEqual(r.value("closeMissAt"), null);
    const t = driver(d);
    t.act("deleteTable");
    assert.equal(t.value("tableDeleted"), true);
    const ok = driver(d);
    ok.act("removeRoute");
    until(ok, 51);
    assert.equal(ok.value("closeMissAt"), null);
  });
  test("AZ-140 FSLogix: restarts leave users denied; PreventLoginWithFailure locks everyone out; Contributor at the share fixes it in time", () => {
    const d = docOf("fslogix-share-missing-share-permission");
    const r = driver(d);
    r.act("restart");
    until(r, 46);
    assert.notEqual(r.value("shiftMissAt"), null);
    const l = driver(d);
    l.act("preventLogin");
    assert.equal(l.value("lockedOut"), true);
    const ok = driver(d);
    ok.act("grant", { w: "users" });
    until(ok, 46);
    assert.equal(ok.value("working"), true);
    assert.equal(ok.value("shiftMissAt"), null);
  });
  test("KCA enforce: background scans off leave the hotfix refused; a compliant manifest is admitted in time", () => {
    const d = docOf("policy-enforced-without-reading-reports");
    const b = driver(d);
    b.act("backgroundOff");
    until(b, 51);
    assert.notEqual(b.value("hotfixMissAt"), null);
    const ok = driver(d);
    ok.act("addLimit");
    ok.act("toAudit");
    until(ok, 51);
    assert.equal(ok.value("hotfixMissAt"), null);
  });
  test("CCA cluster pool: restarts and the mask leave the nodes idle; editing the pool breaks it; a new element fixes it", () => {
    const d = docOf("cluster-pool-exhausted-new-nodes");
    const r = driver(d);
    r.act("restart");
    r.act("mask");
    until(r, 51);
    assert.notEqual(r.value("peakMissAt"), null);
    const c = driver(d);
    c.act("changeCidr");
    until(c, 51);
    assert.equal(c.value("ready"), false);
    const ok = driver(d);
    ok.act("append");
    until(ok, 51);
    assert.equal(ok.value("ready"), true);
  });
  test("CBA proxy: restarts leave the 401; merging the PR works by exposing the token; the proxy works in time", () => {
    const d = docOf("plugin-token-marked-frontend");
    const r = driver(d);
    r.act("restart");
    until(r, 51);
    assert.notEqual(r.value("demoMissAt"), null);
    const m = driver(d);
    m.act("merge");
    assert.equal(m.value("merged"), true);
    const ok = driver(d);
    ok.act("proxy");
    until(ok, 51);
    assert.equal(ok.value("proxyLive"), true);
    assert.equal(ok.value("demoMissAt"), null);
  });
  test("AI-901 chat client: new packages leave the 404; the deployment name fixes it", () => {
    const d = docOf("chat-client-model-name-not-deployment");
    const r = driver(d);
    r.act("reinstall");
    until(r, 46);
    assert.notEqual(r.value("demoMissAt"), null);
    const ok = driver(d);
    ok.act("setDeployment");
    until(ok, 46);
    assert.equal(ok.value("demoMissAt"), null);
  });
  test("GCPPDE lateness: workers change nothing; a backfill alone leaves today short; draining with lateness plus a backfill reconciles", () => {
    const d = docOf("streaming-window-drops-late-rides");
    const s = driver(d);
    s.act("scale");
    until(s, 51);
    assert.notEqual(s.value("reconMissAt"), null);
    const b = driver(d);
    b.act("backfill");
    until(b, 51);
    assert.notEqual(b.value("reconMissAt"), null);
    const ok = driver(d);
    ok.act("deploy", { h: "drain" });
    ok.act("backfill");
    until(ok, 51);
    assert.equal(ok.value("reconMissAt"), null);
  });
});
