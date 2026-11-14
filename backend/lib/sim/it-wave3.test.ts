// REQ-297 (docs/sims.md 22.16, docs/sims-coverage-it.md): IT sims wave 3 for
// existing non-clinical courses on the existing terminal, security console
// and board screens. Every document is learner-paced, engine 1.2 with an
// ending order, on a catalog objective of its own course, with endings in
// all three classes, 3-4 critical criteria and goldens that reach every
// ending but time_up and score every criterion both met and missed. Each
// case also has a behavior test of the decision it teaches.
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

// course/slug -> the screen and profile it is built on
export const WAVE3: readonly { course: string; slug: string; screen: string; profile: string; kind?: "band" }[] = [
  { course: "APLUS_CORE1", slug: "rogue-dhcp-soho-office", screen: "terminal", profile: "infrastructure" },
  { course: "APLUS_CORE2", slug: "home-office-laptop-malware", screen: "security-console", profile: "security" },
  { course: "KCNA", slug: "service-selector-no-endpoints", screen: "terminal", profile: "infrastructure" },
  { course: "CKA", slug: "service-selector-no-endpoints-cka", screen: "terminal", profile: "infrastructure", kind: "band" },
  { course: "GCPACE", slug: "public-bucket-customer-exports", screen: "board", profile: "security" },
  { course: "GCPCDL", slug: "bigquery-dashboard-bill", screen: "board", profile: "cloud" },
  { course: "SECPLUS", slug: "vuln-prioritization-kev-edge-secplus", screen: "security-console", profile: "security", kind: "band" },
  { course: "SECPLUS", slug: "alert-triage-lolbin-hunt-secplus", screen: "security-console", profile: "security", kind: "band" },
  { course: "AWSSAA", slug: "waf-login-flood-sqli", screen: "board", profile: "security" },
  { course: "AWSSOA", slug: "rds-update-without-where-pitr", screen: "board", profile: "cloud" },
  { course: "GCPACE", slug: "cloud-run-bad-revision-rollback", screen: "board", profile: "cloud" },
];

const entryOf = (slug: string) => ALL_DOCUMENTS.find((e) => e.slug === slug)!;
const docOf = (slug: string): ScenarioDoc => loadDocument(entryOf(slug));

function driver(doc: ScenarioDoc) {
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
        // a decision card that opens during the work is answered with its first choice
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

describe("IT sims wave 3 (REQ-297)", () => {
  test("every document is registered, valid, learner-paced, engine 1.2 with an ending order, on its screen and profile", () => {
    for (const w of WAVE3) {
      const e = entryOf(w.slug);
      assert.ok(e, `${w.slug} registered`);
      assert.equal(e.course, w.course);
      assert.equal(e.kind, w.kind ?? "scenario");
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
      const crit = d.scoring.criteria.filter((c) => c.critical).length;
      assert.ok(crit >= 3 && crit <= 4, `${w.slug}: ${crit} critical criteria`);
      const classes = new Set(Object.values(d.endings).filter((x) => x.terminal).map((x) => x.class));
      for (const k of ["target", "recovered", "harm"]) assert.ok(classes.has(k as never), `${w.slug}: ${k}`);
      for (const k of Object.keys(d.endings)) assert.ok(d.scoring.debrief[k], `${w.slug}: debrief for ${k}`);
      assert.ok(d.scoring.kpis.length >= 2 && d.scoring.expertPath.length >= 3, w.slug);
      assert.deepEqual(secondsUnitProblems(d), [], w.slug);
      assert.deepEqual(backslashEscapeProblems(d), [], w.slug);
      // a band keeps its base's dated sources and adds its own course's outline, read for this wave
      if (w.kind === "band") assert.equal(d.sources[0].checkedAt, "2026-11-14", `${w.slug}: band outline dated`);
      else assert.ok(d.sources.length >= 2 && d.sources.every((s) => s.checkedAt === "2026-11-14"), `${w.slug}: sources dated`);
      assert.ok(Object.keys(d.reasoning).length === 1, `${w.slug}: one reasoning moment`);
    }
  });

  test("each case is on a catalog objective of its own course, one sim per objective in this wave", () => {
    const seen = new Set<string>();
    for (const w of WAVE3) {
      const track = CATALOG_TRACKS.find((t) => t.code === w.course)!;
      const titles = new Set(activeUnits(track).flatMap((u) => u.objectives));
      const d = docOf(w.slug);
      assert.ok(titles.has(d.objective), `${w.course}: ${d.objective}`);
      for (const s of d.secondaryObjectives ?? []) assert.ok(titles.has(s), `${w.course}: secondary ${s}`);
      const key = `${w.course}|${d.objective}`;
      assert.ok(!seen.has(key), key);
      seen.add(key);
    }
  });

  test("the goldens reach every ending but time_up, every rating, and score every criterion both met and missed", () => {
    for (const w of WAVE3) {
      const e = entryOf(w.slug);
      const d = loadDocument(e);
      const g = JSON.parse(readFileSync(e.golden!, "utf8")) as GoldenFile;
      assert.ok(g.paths.length >= 5 && g.paths.length <= 6, `${w.slug}: 5-6 golden paths`);
      const endings = new Set(g.paths.map((p) => p.expect.ending));
      for (const k of Object.keys(d.endings)) if (k !== "time_up") assert.ok(endings.has(k), `${w.slug}: no golden path reaches ${k}`);
      const ratings = new Set(g.paths.map((p) => p.expect.rating));
      for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r as never), `${w.slug}: ${r}`);
      assert.equal(g.paths.find((p) => p.id === "expert")?.expect.class, "target", `${w.slug}: the expert path reaches target`);
      for (const c of d.scoring.criteria) {
        const s = new Set(g.paths.map((p) => p.expect.criteria?.[c.id]));
        assert.ok(s.has("met") && s.has("missed"), `${w.slug}: ${c.id} met and missed (${[...s].join(",")})`);
      }
    }
  });

  test("no lint error; terminal commands are bounded; nothing moves without an action; the client document drops the rubric", () => {
    for (const w of WAVE3) {
      const d = docOf(w.slug);
      const errs = lintScenario(d, { now: "2026-11-14", safetyFamily: "general" }).filter((p) => p.level === "error");
      assert.deepEqual(errs, [], w.slug);
      // on the terminal every command's arguments are a bounded list (22.10)
      if (w.screen === "terminal") for (const id of d.phases[d.initialPhase].actions) for (const p of d.actions[id].params ?? []) assert.equal(p.kind, "choice", `${w.slug}.${id}`);
      const r = driver(d);
      assert.equal(waits(r.run).length, 0, `${w.slug}: no wait pending at the start`);
      const c = clientDocument(d) as unknown as Record<string, any>;
      assert.equal(c.scoring, undefined);
    }
  });
});

describe("what each wave 3 case teaches", () => {
  test("A+ Core 1: a static address or a router reset leaves the second DHCP server answering; unplugging it and renewing fixes it", () => {
    const d = docOf("rogue-dhcp-soho-office");
    const s = driver(d);
    s.act("fix", { change: "static" });
    assert.equal(s.value("frontOk"), true);
    assert.equal(s.value("othersRogue"), true);
    assert.equal(s.value("rogueOn"), true);
    const reset = driver(d);
    reset.act("fix", { change: "reset" });
    reset.act("renew");
    assert.equal(reset.value("frontOk"), false, "a renew still takes the other server's offer");
    assert.equal(reset.value("faultsAdded"), 1);
    const ok = driver(d);
    ok.act("fix", { change: "unplug" });
    assert.equal(ok.value("frontOk"), false, "a PC keeps its wrong lease until it renews");
    ok.act("renew");
    ok.act("renewOthers");
    assert.equal(ok.value("frontOk"), true);
    assert.equal(ok.value("othersRogue"), false);
  });

  test("A+ Core 1: the 09:30 deadline is missed only if the front desk is still down after 60 minutes of work", () => {
    const d = docOf("rogue-dhcp-soho-office");
    const late = driver(d);
    while (late.minutes() < 61) late.act("watch");
    assert.notEqual(late.value("deadlineMissedAt"), null);
    const ok = driver(d);
    ok.act("fix", { change: "static" });
    while (ok.minutes() < 61) ok.act("watch");
    assert.equal(ok.value("deadlineMissedAt"), null);
  });

  test("A+ Core 2: a normal-mode scan or old definitions leave the trojan; updating over the network reconnects the laptop and its share", () => {
    const d = docOf("home-office-laptop-malware");
    const normal = driver(d);
    normal.act("quarantine");
    normal.act("updateDefs", { via: "usb" });
    normal.act("scan", { kind: "normal" });
    assert.equal(normal.value("infected"), true);
    const old = driver(d);
    old.act("quarantine");
    old.act("scan", { kind: "offline" });
    assert.equal(old.value("infected"), true, "month-old definitions miss it");
    const net = driver(d);
    net.act("quarantine");
    net.act("updateDefs", { via: "network" });
    assert.equal(net.value("connected"), true);
    assert.equal(net.value("nasMapped"), true);
    const ok = driver(d);
    ok.act("quarantine");
    ok.act("updateDefs", { via: "usb" });
    ok.act("scan", { kind: "offline" });
    assert.equal(ok.value("infected"), false);
    assert.equal(ok.value("connected"), false);
  });

  test("A+ Core 2: the stealer uploads at 20 minutes only while the laptop is online and infected", () => {
    const d = docOf("home-office-laptop-malware");
    const online = driver(d);
    online.act("investigate");
    online.act("backup");
    online.act("disableSr");
    online.act("educate");
    assert.ok(online.minutes() >= 20);
    assert.notEqual(online.value("credsUploadedAt"), null);
    const off = driver(d);
    off.act("quarantine");
    off.act("investigate");
    off.act("backup");
    off.act("disableSr");
    off.act("educate");
    assert.equal(off.value("credsUploadedAt"), null);
  });

  test("KCNA: a live selector patch is undone by self-heal; a restart changes nothing; a revert in Git stays", () => {
    const d = docOf("service-selector-no-endpoints");
    const restart = driver(d);
    restart.act("fix", { change: "restart" });
    assert.equal(restart.value("serving"), false);
    const live = driver(d);
    live.act("fix", { change: "patchLive" });
    assert.equal(live.value("serving"), true);
    live.act("watch");
    assert.equal(live.value("serving"), false, "self-heal applied Git's selector again");
    const git = driver(d);
    git.act("fix", { change: "gitRevert" });
    git.act("watch");
    git.act("watch");
    assert.equal(git.value("serving"), true);
    assert.equal(git.value("relapseAt"), null);
  });

  test("GCP ACE: object ACLs do nothing on a uniform bucket; removing allUsers ends exposure and breaks images until the copy finishes", () => {
    const d = docOf("public-bucket-customer-exports");
    const acl = driver(d);
    acl.act("objectAcl");
    assert.equal(acl.value("exposed"), true);
    const fix = driver(d);
    fix.act("removePublic");
    assert.equal(fix.value("exposed"), false);
    assert.equal(fix.value("imagesOk"), false);
    fix.act("makeImageBucket");
    assert.equal(fix.value("imagesOk"), true, "images are back once the 15-minute copy is done");
    assert.ok((fix.value("imgDownMin") as number) >= 15, "the copy's 15 minutes count as image outage (FAIL-2001)");
    const pap = driver(d);
    pap.act("makeImageBucket");
    pap.act("enforcePap");
    assert.equal(pap.value("exposed"), false);
    assert.equal(pap.value("imagesOk"), true, "the new public bucket is in another project");
  });

  test("GCP CDL: an alerts-only budget does not slow the spend; the owner's fix cuts it to cents an hour; cutting the dashboard off fails the review", () => {
    const d = docOf("bigquery-dashboard-bill");
    const alerts = driver(d);
    const s0 = alerts.value("spend") as number;
    alerts.act("ownerBudgetA");
    alerts.act("watch");
    alerts.act("watch");
    assert.ok((alerts.value("spend") as number) - s0 > 40, "about $50 an hour keeps accruing");
    const fix = driver(d);
    fix.act("findOwner");
    fix.act("meetOwner");
    fix.act("ownerFix");
    while (fix.value("dashFixed") !== true) fix.act("watch");
    const s1 = fix.value("spend") as number;
    fix.act("watch");
    fix.act("watch");
    assert.ok((fix.value("spend") as number) - s1 < 1);
    const cut = driver(d);
    cut.act("revokeDash");
    while (cut.minutes() < 301) cut.act("watch");
    assert.notEqual(cut.value("reviewFailedAt"), null);
  });

  test("AWS SAA: a security group cannot deny; a 2,000 limit blocks nothing; a 300 limit stops the flood until the botnet goes around an open origin", () => {
    const d = docOf("waf-login-flood-sqli");
    const sg = driver(d);
    sg.act("sgDeny");
    assert.equal(sg.value("floodAtOrigin"), true);
    const high = driver(d);
    high.act("createAcl");
    high.act("rateRule", { limit: "high" });
    assert.equal(high.value("floodAtOrigin"), true);
    const open = driver(d);
    open.act("createAcl");
    open.act("rateRule", { limit: "right" });
    assert.equal(open.value("floodAtOrigin"), false);
    while (open.minutes() < 31) open.act("watch");
    assert.notEqual(open.value("bypassAt"), null, "the botnet hits the ALB's own DNS name");
    assert.equal(open.value("floodAtOrigin"), true);
    open.act("originLock");
    assert.equal(open.value("floodAtOrigin"), false, "only CloudFront reaches the origin");
    assert.equal(open.value("campusBlockedAt"), null);
  });

  test("AWS SAA: the injection reaches the data at 45 minutes unless the SQL database rule group blocks it; a limit of 10 blocks customers", () => {
    const d = docOf("waf-login-flood-sqli");
    const late = driver(d);
    while (late.minutes() < 46) late.act("watch");
    assert.notEqual(late.value("dataOutAt"), null);
    const ok = driver(d);
    ok.act("createAcl");
    ok.act("sqliRule");
    ok.act("rateRule", { limit: "low" });
    assert.notEqual(ok.value("campusBlockedAt"), null);
    while (ok.minutes() < 46) ok.act("watch");
    assert.equal(ok.value("dataOutAt"), null);
  });

  test("AWS SOA: a copy restored to the latest restorable time still has the bad UPDATE; a copy on the default security group cannot be reached", () => {
    const d = docOf("rds-update-without-where-pitr");
    const latest = driver(d);
    latest.act("pauseRefunds");
    latest.act("restore", { point: "latest", sg: "custom" });
    while (latest.value("restoredReady") !== true) latest.act("watch");
    latest.act("repair");
    while (latest.value("repairing") === true) latest.act("watch");
    assert.equal(latest.value("repaired"), false);
    const sg = driver(d);
    sg.act("restore", { point: "pre", sg: "default" });
    while (sg.value("restoredReady") !== true) sg.act("watch");
    sg.act("repair");
    assert.equal(sg.value("repairFailed"), true);
    assert.equal(sg.value("repairing"), false);
  });

  test("AWS SOA: a column repair from 13:51 loses nothing; switching to the copy loses every order since; the refund worker refunds until paused", () => {
    const d = docOf("rds-update-without-where-pitr");
    const ok = driver(d);
    ok.act("pauseRefunds");
    ok.act("restore", { point: "pre", sg: "custom" });
    while (ok.value("restoredReady") !== true) ok.act("watch");
    ok.act("repair");
    while (ok.value("repairing") === true) ok.act("watch");
    assert.equal(ok.value("repaired"), true);
    assert.equal(ok.value("lostMin"), 0);
    assert.equal(ok.value("refundsOut"), 0);
    const swap = driver(d);
    swap.act("restore", { point: "pre", sg: "custom" });
    while (swap.value("restoredReady") !== true) swap.act("watch");
    swap.act("swap");
    assert.ok((swap.value("lostMin") as number) > 5);
    assert.ok((swap.value("refundsOut") as number) >= 1500, "three runs of 500 in the first 30 minutes");
  });

  test("GCP ACE: update-traffic to the previous revision stops the errors at once; more instances do not; a rebuild takes 15 minutes", () => {
    const d = docOf("cloud-run-bad-revision-rollback");
    const scale = driver(d);
    scale.act("scaleUp");
    assert.ok((scale.value("errFrac") as number) > 0.07);
    const rb = driver(d);
    rb.act("rollback");
    assert.equal(rb.value("errFrac"), 0);
    assert.ok((rb.value("availability") as number) >= 99.9);
    const re = driver(d);
    re.act("rebuild");
    assert.ok((re.value("errFrac") as number) > 0.07, "r42 serves while the build runs");
    while (re.value("rebuilt") !== true) re.act("watch");
    assert.equal(re.value("serving"), "r41");
    assert.ok(re.minutes() >= 15);
  });

  test("GCP ACE: a fix deployed with all traffic charges the sandbox; with --no-traffic the tag test catches it first", () => {
    const d = docOf("cloud-run-bad-revision-rollback");
    const full = driver(d);
    full.act("rollback");
    full.act("logs");
    full.act("deployFix", { mode: "full" });
    while (full.value("deployed43") !== true) full.act("watch");
    full.act("watch");
    assert.equal(full.value("serving"), "r43");
    assert.ok((full.value("unchargedOrders") as number) > 0);
    const safe = driver(d);
    safe.act("rollback");
    safe.act("logs");
    safe.act("deployFix", { mode: "noTraffic" });
    while (safe.value("deployed43") !== true) safe.act("watch");
    assert.equal(safe.value("serving"), "r41");
    safe.act("testTag");
    assert.equal(safe.value("tested43"), true);
    assert.equal(safe.value("unchargedOrders"), 0);
  });
});
