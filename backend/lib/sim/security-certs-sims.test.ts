// REQ-274 (docs/sims.md 22.19): security-console sims for the non-CompTIA
// security courses (ISC2 CC, CISSP, ISACA CISM, EC-Council CEH), built to the
// REQ-238 pattern. Each is valid, learner-paced, on its course's own catalog
// objective (one that meets the generator's selection rule), and names only
// documentation addresses and domains (RFC 5737, RFC 2606).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { applyCommand, createRun, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, ScenarioDoc } from "./engine/v1/index.ts";
import type { Run } from "./engine/v1/engine.ts";
import { pacingEligible } from "./server-run.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { isPerformanceObjective } from "../../scripts/generate-labs-lib.ts";

const COURSES = ["ISC2CC", "CISSP", "CISM", "CEH"] as const;
const DOCS = ALL_DOCUMENTS.filter((e) => (COURSES as readonly string[]).includes(e.course));
const docOf = (slug: string): ScenarioDoc => loadDocument(DOCS.find((e) => e.slug === slug)!);

function driver(doc: ScenarioDoc) {
  const run: Run = createRun(doc, 1);
  let seq = 0;
  const send = (c: Record<string, unknown>) => {
    const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
    assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
  };
  const finish = () => {
    while (readValue(run, "busy") === true && run.state.phase === "incident") {
      const w = waits(run)[0];
      send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
    }
  };
  return {
    run,
    task: (action: string, params?: Record<string, string>) => {
      send({ type: "act", action, ...(params ? { params } : {}) });
      finish();
    },
    value: (n: string) => readValue(run, n),
    minutes: () => (run.state.tick * run.c.dt) / 60,
  };
}

function visibleStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) visibleStrings(x, out);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (k !== "sources" && k !== "source") visibleStrings(x, out);
  return out;
}

const DOC_NETS = [/^192\.0\.2\.\d+$/, /^198\.51\.100\.\d+$/, /^203\.0\.113\.\d+$/];
const DOC_DOMAIN = /(^|\.)example\.(com|net|org)$|\.(test|example|invalid)$/;

describe("REQ-274 security-console sims", () => {
  test("at least two per course, each valid, on the console, learner-paced, security profile, engine 1.2 with endingOrder", () => {
    for (const c of COURSES) assert.ok(DOCS.filter((e) => e.course === c).length >= 2, c);
    for (const e of DOCS) {
      const d = loadDocument(e);
      assert.equal(e.kind, "scenario");
      assert.equal(e.source, "authored");
      assert.deepEqual(validateScenario(d).map(String), [], e.slug);
      assert.equal(d.screen.type, "security-console");
      assert.equal(d.outcome.profile, "security");
      assert.equal(d.engine.minor, 2);
      assert.ok(d.endingOrder && d.endingOrder.length >= 2, e.slug);
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), e.slug);
      assert.equal(pacingEligible(d, "general"), false);
      const crit = d.scoring.criteria.filter((c) => c.critical).length;
      assert.ok(crit >= 3 && crit <= 4, `${e.slug}: ${crit} critical criteria`);
      const classes = new Set(Object.entries(d.endings).filter(([id]) => id !== "time_up").map(([, x]) => x.class));
      assert.deepEqual([...classes].sort(), ["harm", "recovered", "target"], e.slug);
      for (const id of Object.keys(d.endings)) assert.ok(d.scoring.debrief[id], `${e.slug}: debrief for ${id}`);
      assert.ok(d.scoring.expertPath.length >= 3 && d.scoring.kpis.length >= 3, e.slug);
      for (const s of d.sources) assert.equal(typeof s.checkedAt, "string", `${e.slug}: ${s.cite}`);
    }
  });

  test("each is on an active objective of its own course, distinct, and meets the generator's selection rule", () => {
    const seen = new Set<string>();
    for (const e of DOCS) {
      const d = loadDocument(e);
      const track = CATALOG_TRACKS.find((t) => t.code === e.course)!;
      assert.ok(track, `${e.course} is in the catalog`);
      const titles = activeUnits(track).flatMap((u) => u.objectives);
      assert.ok(titles.includes(d.objective), `${e.slug}: objective is a ${e.course} catalog title`);
      for (const s of d.secondaryObjectives ?? []) assert.ok(titles.includes(s), `${e.slug}: secondary "${s.slice(0, 40)}"`);
      assert.ok(isPerformanceObjective(d.objective, "general"), d.objective);
      assert.ok(!seen.has(`${e.course}|${d.objective}`), "one sim per objective");
      seen.add(`${e.course}|${d.objective}`);
    }
  });

  test("every golden KPI is a whole number and every golden path has the six-path spread", () => {
    for (const e of DOCS) {
      const g = JSON.parse(readFileSync(e.golden!, "utf8")) as { paths: { id: string; expect: { rating: string; kpis?: Record<string, unknown> } }[] };
      const ratings = new Set(g.paths.map((p) => p.expect.rating));
      for (const r of ["good", "mediocre", "bad"]) assert.ok(ratings.has(r), `${e.slug}: a ${r} path`);
      for (const p of g.paths) for (const [k, v] of Object.entries(p.expect.kpis ?? {})) assert.ok(typeof v === "number" && Number.isInteger(v), `${e.slug}/${p.id}: ${k} = ${v}`);
    }
  });

  test("every address and domain a learner sees is reserved for documentation", () => {
    for (const e of DOCS) {
      const text = visibleStrings(loadDocument(e)).join("\n");
      for (const ip of text.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) ?? []) assert.ok(DOC_NETS.some((r) => r.test(ip)), `${e.slug}: ${ip}`);
      for (const host of text.match(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|info|biz|gov|edu|us|uk|ru|cn|xyz|app|dev|cloud|test|example)\b/g) ?? [])
        assert.ok(DOC_DOMAIN.test(host.toLowerCase()), `${e.slug}: ${host}`);
    }
  });
});

describe("REQ-274: the attacker moves on the analyst's clock", () => {
  test("CC leaver: disabling without revoking leaves the open sessions working; disable plus revoke closes the account path", () => {
    const d = driver(docOf("cc-leaver-account-still-active"));
    d.task("disable");
    assert.equal(d.value("inByAccount"), true);
    d.task("revoke");
    assert.equal(d.value("inByAccount"), false);
  });

  test("CC leaver: blocking the address does not stop the account, and it makes an API key at 30 min", () => {
    const d = driver(docOf("cc-leaver-account-still-active"));
    d.task("blockIp");
    while (d.minutes() < 31) d.task("watch");
    assert.equal(d.value("inByAccount"), true);
    assert.equal(typeof d.value("keyAt"), "number");
  });

  test("CC triage: the internal phish passes the sender block, and the staff warning keeps a second account safe", () => {
    const warned = driver(docOf("cc-triage-phish-correlation"));
    warned.task("blockSender");
    warned.task("warnStaff");
    while (warned.minutes() < 42) warned.task("watch");
    assert.equal(typeof warned.value("spreadAt"), "number");
    assert.equal(warned.value("victim2At"), null);
    const not = driver(docOf("cc-triage-phish-correlation"));
    not.task("blockSender");
    while (not.minutes() < 42) not.task("watch");
    assert.equal(typeof not.value("victim2At"), "number");
  });
  test("CISSP incident: isolating WEB02 early keeps the shell off WEB03; imaging first does not", () => {
    const fast = driver(docOf("cissp-web-tier-data-theft"));
    fast.task("isolateWeb2");
    while (fast.minutes() < 12) fast.task("watch");
    assert.equal(fast.value("web3At"), null);
    const slow = driver(docOf("cissp-web-tier-data-theft"));
    slow.task("image");
    assert.equal(typeof slow.value("web3At"), "number");
  });

  test("CISSP incident: a rebuilt server restored before the patch is reinfected", () => {
    const d = driver(docOf("cissp-web-tier-data-theft"));
    for (const a of ["isolateWeb2", "blockEgress", "image", "rebuild", "restore"]) d.task(a);
    while (d.run.state.phase === "incident") d.task("watch");
    assert.equal(typeof d.value("reinfectedAt"), "number");
  });

  test("CISSP recovery: unpaused replication carries the encryption to the warm site; a paused one keeps the clean point", () => {
    const d = driver(docOf("cissp-ransomware-recovery-site"));
    d.task("declare");
    while (d.minutes() < 21) d.task("watch");
    assert.equal(typeof d.value("replicaEncryptedAt"), "number");
    const paused = driver(docOf("cissp-ransomware-recovery-site"));
    paused.task("pauseRepl");
    while (paused.minutes() < 21) paused.task("watch");
    assert.equal(paused.value("replicaEncryptedAt"), null);
  });

  test("CISSP recovery: failing over before trust is rebuilt lets the stolen account follow", () => {
    const d = driver(docOf("cissp-ransomware-recovery-site"));
    for (const a of ["pauseRepl", "isolateBackup", "isolatePrimary", "declare"]) d.task(a);
    d.task("failover");
    assert.equal(typeof d.value("reinfectAt"), "number");
  });
  test("CISM supplier: rotating the key stops the attacker and keeps payroll running; suspending alone blocks payroll and leaves the key valid", () => {
    const r = driver(docOf("cism-payroll-supplier-breach"));
    r.task("rotate");
    assert.equal(r.value("attackerActive"), false);
    assert.equal(r.value("payrollBlocked"), false);
    const s = driver(docOf("cism-payroll-supplier-breach"));
    s.task("suspend");
    assert.equal(s.value("attackerActive"), true);
    assert.equal(s.value("payrollBlocked"), true);
  });

  test("CISM containment: the hosted fallback stops capture with the store open; a domain block is evaded", () => {
    const h = driver(docOf("cism-checkout-skimmer-containment"));
    h.task("hosted");
    assert.equal(h.value("skimActive"), false);
    assert.equal(h.value("proportionate"), true);
    const b = driver(docOf("cism-checkout-skimmer-containment"));
    b.task("cspBlock");
    assert.equal(b.value("skimActive"), false);
    while (b.minutes() < 15) b.task("watch");
    assert.equal(typeof b.value("switchAt"), "number");
    assert.equal(b.value("skimActive"), true);
  });
  test("CEH ARP: clearing caches while the device sends changes nothing; shutting its port stops the poisoning", () => {
    const d = driver(docOf("ceh-arp-poisoning-finance-vlan"));
    d.task("clearArp");
    assert.equal(d.value("poisoning"), true);
    d.task("trace");
    d.task("shutPort");
    assert.equal(d.value("poisoning"), false);
  });

  test("CEH SQLi: the WAF block is evaded after ten minutes; turning the feature off is not", () => {
    const w = driver(docOf("ceh-blind-sqli-search"));
    w.task("wafBlock");
    assert.equal(w.value("injectable"), false);
    while (w.minutes() < 14) w.task("watch");
    assert.equal(w.value("injectable"), true);
    const f = driver(docOf("ceh-blind-sqli-search"));
    f.task("flagOff");
    while (f.minutes() < 30) f.task("watch");
    assert.equal(f.value("injectable"), false);
    assert.equal(f.value("enumAt"), null);
  });

  test("CEH SQLi: a least-privilege login keeps the customers table out of reach even while injectable", () => {
    const d = driver(docOf("ceh-blind-sqli-search"));
    d.task("leastPriv");
    while (d.minutes() < 55) d.task("watch");
    assert.equal(d.value("injectable"), true);
    assert.equal(d.value("dumpStartAt"), null);
  });
});
