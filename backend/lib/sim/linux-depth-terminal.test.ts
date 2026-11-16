// REQ-292: the LFCS and Linux Fundamentals cases on the terminal screen
// (docs/sims.md 22.17): boot to emergency mode on a mistyped fstab UUID and
// a full database volume grown online with LVM (LFCS); a shared folder that
// says Permission denied and a web server that will not start after an edit
// (LINUXFUND). The same bar as the Linux+ and CKA cases
// (lib/sim/terminal.test.ts, REQ-237): valid, infrastructure profile, engine
// 1.2 with an ending order, learner-paced, 3-4 critical criteria, endings in
// all three classes, goldens that reach every ending but time_up and score
// every criterion met and missed, commands bounded, no lint error; plus the
// teaching facts each case turns on.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALL_DOCUMENTS, loadDocument } from "./documents.ts";
import { applyCommand, createRun, lintScenario, readValue, validateScenario, waits } from "./engine/v1/index.ts";
import type { Command, ScenarioDoc } from "./engine/v1/index.ts";
import type { GoldenFile } from "./engine/v1/validate.ts";
import type { Run } from "./engine/v1/engine.ts";
import { clientDocument } from "./content-hash.ts";
import { backslashEscapeProblems, safetyFamilyOf, secondsUnitProblems } from "./lint.ts";
import { CATALOG_TRACKS, activeUnits } from "../../supabase/seed/catalog";
import { LFCS_SIM_OBJECTIVES } from "../../supabase/seed/tracks/linux";
import { isPerformanceObjective } from "../../scripts/generate-labs-lib.ts";
import { selectionFor } from "./generator/selection.ts";

const LFCS = ALL_DOCUMENTS.filter((e) => e.course === "LFCS" || e.course === "LINUXFUND" || e.course === "PYAUTO");
// Nick (2026-11-14): sims follow coverage, not a count -- one per objective
// that fits the selection rule (docs/sims-coverage-depth.md).
const EXPECTED = [
  "LFCS/fstab-uuid-typo-emergency",
  "LFCS/lvm-database-volume-full",
  "LFCS/report-workers-starve-api",
  "LFCS/clock-skew-blocks-logins",
  "LFCS/sale-traffic-third-backend",
  "LFCS/service-no-restart-after-update",
  "LINUXFUND/shared-folder-permission-denied",
  "LINUXFUND/web-service-fails-after-edit",
  "LINUXFUND/nightly-backup-missing",
  "PYAUTO/debug-log-fills-var",
];
const docOf = (slug: string): ScenarioDoc => loadDocument(LFCS.find((e) => e.slug === slug)!);

function driver(doc: ScenarioDoc) {
  const run: Run = createRun(doc, 1);
  let seq = 0;
  const send = (c: Record<string, unknown>) => {
    const r = applyCommand(run, { ...c, seq: ++seq, tick: run.state.tick } as Command);
    assert.ok(r.ok, `${JSON.stringify(c)}: ${r.ok ? "" : r.reason}`);
  };
  return {
    act: (action: string) => {
      send({ type: "act", action });
      while (readValue(run, "busy") === true && run.state.phase === "incident") {
        const w = waits(run)[0];
        send({ type: "skip", timer: w.timer, instance: w.instance, to: w.due });
      }
    },
    value: (n: string) => readValue(run, n),
  };
}

describe("REQ-292: LFCS and Linux Fundamentals terminal cases", () => {
  test("each case valid, on the terminal screen, infrastructure profile, engine 1.2, learner-paced, dated sources", () => {
    assert.deepEqual(
      LFCS.map((e) => `${e.course}/${e.slug}`),
      EXPECTED
    );
    for (const e of LFCS) {
      const d = loadDocument(e);
      assert.deepEqual(validateScenario(d).map(String), [], e.slug);
      assert.equal(e.kind, "scenario");
      assert.equal(e.source, "authored");
      assert.equal(d.screen.type, "terminal");
      assert.equal(d.outcome.profile, "infrastructure");
      assert.equal(d.engine.minor, 2);
      assert.ok(d.endingOrder && d.endingOrder.length >= 2);
      assert.ok(!Object.values(d.phases).some((p) => p.clock === "running"), `${e.slug}: learner-paced`);
      assert.equal(safetyFamilyOf(d), "general");
      const crit = d.scoring.criteria.filter((c) => c.critical).length;
      assert.ok(crit >= 3 && crit <= 4, `${e.slug}: ${crit} critical criteria`);
      const classes = new Set(Object.values(d.endings).filter((x) => x.terminal).map((x) => x.class));
      for (const k of ["target", "recovered", "harm"]) assert.ok(classes.has(k as never), `${e.slug}: ${k}`);
      for (const k of Object.keys(d.endings)) assert.ok(d.scoring.debrief[k], `${e.slug}: debrief for ${k}`);
      assert.deepEqual(secondsUnitProblems(d), [], e.slug);
      assert.deepEqual(backslashEscapeProblems(d), [], e.slug);
      assert.ok(d.sources.every((s) => s.checkedAt === "2026-11-14"), `${e.slug}: sources dated`);
      if (e.course === "LFCS") assert.match(d.sources[0].url!, /linux-foundation-certified-sysadmin-lfcs/);
    }
  });

  test("each case is on its own course objective (LFCS by the titles the course exports)", () => {
    assert.equal(docOf("fstab-uuid-typo-emergency").objective, LFCS_SIM_OBJECTIVES.fstab);
    assert.equal(docOf("lvm-database-volume-full").objective, LFCS_SIM_OBJECTIVES.lvm);
    for (const e of LFCS) {
      const track = CATALOG_TRACKS.find((t) => t.code === e.course)!;
      const titles = new Set(activeUnits(track).flatMap((u) => u.objectives));
      const d = loadDocument(e);
      assert.ok(titles.has(d.objective), d.objective);
      // A hands-on objective (the labs' screen), or one the sim selection
      // screen qualifies (Nick's rule, lib/sim/generator/selection.ts).
      const qualifies = selectionFor({ objective: d.objective, unitTitle: "", unitWeight: null, weightsAreExam: false }).qualifies;
      assert.ok(isPerformanceObjective(d.objective, "general") || qualifies, d.objective);
      for (const s of d.secondaryObjectives ?? []) assert.ok(titles.has(s), `${e.slug}: ${s}`);
    }
    const objs = LFCS.map((e) => `${e.course}:${loadDocument(e).objective}`);
    assert.equal(new Set(objs).size, objs.length);
  });

  test("the goldens reach every ending but time_up, every rating, and score every criterion both met and missed", () => {
    for (const e of LFCS) {
      const d = loadDocument(e);
      const g = JSON.parse(readFileSync(e.golden!, "utf8")) as GoldenFile;
      assert.ok(g.paths.length >= 5 && g.paths.length <= 6, `${e.slug}: 5-6 golden paths`);
      const endings = new Set(g.paths.map((p) => p.expect.ending));
      for (const k of Object.keys(d.endings)) if (k !== "time_up") assert.ok(endings.has(k), `${e.slug}: no golden path reaches ${k}`);
      const ratings = new Set(g.paths.map((p) => p.expect.rating));
      for (const r of ["good", "bad"]) assert.ok(ratings.has(r as never), `${e.slug}: ${r}`);
      for (const c of d.scoring.criteria) {
        const seen = new Set(g.paths.map((p) => p.expect.criteria?.[c.id]));
        assert.ok(seen.has("met") && seen.has("missed"), `${e.slug}: ${c.id} met and missed (${[...seen].join(",")})`);
      }
    }
  });

  test("commands are bounded, and the client document keeps the bindings and drops the rubric", () => {
    for (const e of LFCS) {
      const d = loadDocument(e);
      for (const id of d.phases.incident.actions) for (const p of d.actions[id].params ?? []) assert.equal(p.kind, "choice", `${e.slug}.${id}`);
      const c = clientDocument(d) as unknown as Record<string, any>;
      assert.ok(c.screen.terminal.nodes.length >= 1);
      assert.equal(c.scoring, undefined);
    }
  });

  test("fstab: editing needs root remounted rw, and a fixed fstab boots only after daemon-reload", () => {
    const r = driver(docOf("fstab-uuid-typo-emergency"));
    r.act("fixUuid");
    assert.equal(r.value("uuidFixedAt"), null, "root is read-only in emergency mode");
    r.act("remountRw");
    r.act("fixUuid");
    assert.notEqual(r.value("uuidFixedAt"), null);
    r.act("continueBoot");
    assert.equal(r.value("bootedAt"), null, "systemd still has the old mount unit");
    assert.equal(r.value("failedBoots"), 1);
    r.act("remountRw");
    r.act("daemonReload");
    r.act("continueBoot");
    assert.notEqual(r.value("bootedAt"), null);
    assert.equal(r.value("dataOk"), true);
  });

  test("fstab: commenting the line out boots the host without the data disk", () => {
    const r = driver(docOf("fstab-uuid-typo-emergency"));
    r.act("remountRw");
    r.act("commentOut");
    r.act("daemonReload");
    r.act("continueBoot");
    assert.notEqual(r.value("bootedAt"), null);
    assert.equal(r.value("dataOk"), false);
    assert.equal(r.value("faultsAdded"), 1);
  });

  test("LVM: lvextend has nothing to allocate until vgextend, and without -r the filesystem stays 20G", () => {
    const r = driver(docOf("lvm-database-volume-full"));
    r.act("lvextend");
    assert.equal(r.value("lvGrownAt"), null, "no free extents in vg_data");
    r.act("vgextend");
    r.act("lvextend");
    assert.notEqual(r.value("lvGrownAt"), null);
    assert.equal(r.value("grown"), false, "the XFS filesystem is still 20G");
    r.act("resize2fs");
    assert.equal(r.value("grown"), false, "resize2fs does not grow XFS");
    r.act("xfsGrowfs");
    assert.equal(r.value("grown"), true);
  });

  test("LVM: pvcreate -ff on the in-use disk breaks the volume group", () => {
    const r = driver(docOf("lvm-database-volume-full"));
    r.act("pvcreateForce");
    r.act("vgextend");
    assert.equal(r.value("vgExtended"), false);
    assert.equal(r.value("faultsAdded"), 1);
  });

  test("permissions: id reads the group database, the old session does not have print; setgid is what keeps new files in the group", () => {
    const r = driver(docOf("shared-folder-permission-denied"));
    r.act("relog");
    r.act("chgrp");
    r.act("groupWrite");
    assert.equal(r.value("teamOk"), true);
    assert.equal(r.value("verifiedAt"), null);
    r.act("verify");
    assert.equal(r.value("verifiedAt"), null, "a new file still takes nora's group without setgid");
    r.act("setgid");
    r.act("verify");
    assert.notEqual(r.value("verifiedAt"), null);
  });

  test("nginx: restarts fail until the line is fixed, and enabling is separate from starting", () => {
    const r = driver(docOf("web-service-fails-after-edit"));
    r.act("restart");
    assert.equal(r.value("running"), false);
    r.act("reinstall");
    r.act("restart");
    assert.equal(r.value("running"), false, "a reinstall keeps the edited site file");
    r.act("fixLine");
    r.act("nginxT");
    r.act("restart");
    assert.equal(r.value("shopUp"), true);
    assert.equal(r.value("enabled"), false);
    assert.equal(r.value("blindRestarts"), 2);
  });

  test("processes: renicing the parent leaves the workers at 0; renicing all nine frees the API without stopping the report", () => {
    const r = driver(docOf("report-workers-starve-api"));
    r.act("reniceParent");
    assert.equal(r.value("apiFast"), false, "each process has its own nice value");
    r.act("reniceAll");
    assert.equal(r.value("apiFast"), true);
    assert.equal(r.value("reportKilled"), false);
  });

  test("processes: SIGKILL to postgres turns a slow API into a failed one", () => {
    const r = driver(docOf("report-workers-starve-api"));
    r.act("killDb");
    r.act("reniceAll");
    assert.equal(r.value("apiFast"), false);
    assert.equal(r.value("faultsAdded"), 1);
  });

  test("chrony: makestep has nothing to step without a source; a run-time source slews until makestep; a fixed chrony.conf steps at restart", () => {
    const a = driver(docOf("clock-skew-blocks-logins"));
    a.act("makestep");
    assert.equal(a.value("clockOk"), false, "no selected source, no correction");
    a.act("addRuntime");
    assert.equal(a.value("synced"), true);
    assert.equal(a.value("clockOk"), false, "makestep 1 3 no longer applies after 41 days: slewing");
    a.act("makestep");
    assert.equal(a.value("clockOk"), true);
    const b = driver(docOf("clock-skew-blocks-logins"));
    b.act("editConf");
    b.act("restart");
    assert.equal(b.value("clockOk"), true);
    assert.equal(b.value("confFixed"), true);
  });

  test("chrony: widening the Kerberos clock skew lets logins in and counts as a new fault", () => {
    const r = driver(docOf("clock-skew-blocks-logins"));
    r.act("widenSkew");
    assert.equal(r.value("loginsOk"), true);
    assert.equal(r.value("clockOk"), false);
    assert.equal(r.value("faultsAdded"), 1);
  });

  test("load balancer: a refused reload keeps nginx serving; a restart on the same file stops it; a pool member bound to localhost adds nothing", () => {
    const a = driver(docOf("sale-traffic-third-backend"));
    a.act("addTicket");
    a.act("reload");
    assert.equal(a.value("nginxStopped"), false, "slow_start is commercial-only: reload refused, old config kept");
    a.act("restart");
    assert.equal(a.value("nginxStopped"), true);
    const b = driver(docOf("sale-traffic-third-backend"));
    b.act("addPlain");
    b.act("nginxT");
    b.act("reload");
    assert.equal(b.value("activeHasApp3"), true);
    assert.equal(b.value("capacityOk"), false, "app3 listens on 127.0.0.1 only");
    b.act("fixBind");
    assert.equal(b.value("shopOk"), true);
    assert.equal(b.value("untestedApplies"), 0);
  });

  test("unit: a copied drop-in is not in effect until daemon-reload; systemctl edit reloads itself; the bad PDF crashes every start", () => {
    const a = driver(docOf("service-no-restart-after-update"));
    a.act("copyDropin");
    assert.equal(a.value("policyLoaded"), false);
    a.act("daemonReload");
    assert.equal(a.value("durable"), true);
    a.act("start");
    assert.equal(a.value("up"), false, "the malformed PDF is still first in the queue");
    a.act("quarantine");
    a.act("start");
    assert.equal(a.value("up"), true);
    const b = driver(docOf("service-no-restart-after-update"));
    b.act("edit");
    assert.equal(b.value("durable"), true);
    b.act("editVendor");
    b.act("daemonReload");
    assert.equal(b.value("durable"), true, "the drop-in in /etc still wins over the vendor file");
    const v = driver(docOf("service-no-restart-after-update"));
    v.act("editVendor");
    v.act("daemonReload");
    assert.equal(v.value("policyLoaded"), true);
    assert.equal(v.value("durable"), false, "the vendor file is replaced by the next update");
  });

  test("journal: this boot's errors do not show a run before the reboot; unmounted, /mnt/backup is the root filesystem; the backup takes its 20 minutes", () => {
    const a = driver(docOf("nightly-backup-missing"));
    a.act("bootErr");
    assert.equal(a.value("evidenceAt"), null);
    a.act("prevErr");
    assert.notEqual(a.value("evidenceAt"), null);
    a.act("rsyncManual");
    assert.equal(a.value("rootFilled"), true);
    const b = driver(docOf("nightly-backup-missing"));
    b.act("mount");
    assert.equal(b.value("mounted"), false, "the old password is refused");
    b.act("fixCred");
    b.act("mount");
    b.act("startBackup");
    assert.equal(b.value("backupDone"), false, "still copying");
    for (let i = 0; i < 4; i++) b.act("watch");
    assert.equal(b.value("backupDone"), true);
  });

  test("python log: rm on an open log frees nothing until restart; truncate frees it; backupCount 0 never rolls over", () => {
    const a = driver(docOf("debug-log-fills-var"));
    a.act("rmLog");
    assert.equal(a.value("spaceFreed"), false, "unlink keeps the file while invsync holds it open");
    a.act("restart");
    assert.equal(a.value("spaceFreed"), true);
    const b = driver(docOf("debug-log-fills-var"));
    b.act("truncate");
    assert.equal(b.value("spaceFreed"), true);
    b.act("editZero");
    b.act("restart");
    assert.equal(b.value("rotationLive"), false);
    b.act("editRot");
    assert.equal(b.value("rotationLive"), false, "not loaded until restart");
    b.act("restart");
    assert.equal(b.value("rotationLive"), true);
  });

  test("no lint error on any of these documents", () => {
    for (const e of LFCS) {
      const errs = lintScenario(loadDocument(e), { now: "2026-11-14", safetyFamily: "general" }).filter((p) => p.level === "error");
      assert.deepEqual(errs, [], e.slug);
    }
  });
});

// REQ-292: the Python data case runs on the terminal screen with a Python
// prompt and the `data` outcome profile (docs/sims.md 20: harm is a wrong
// result shipped; sending nothing is safe with no progress).
describe("REQ-292: Python for Data Analysis on the terminal screen", () => {
  const e = ALL_DOCUMENTS.find((x) => x.course === "PYDATA" && x.slug === "board-orders-by-region")!;
  const d = loadDocument(e);

  test("valid, data profile, Python prompt, engine 1.2, dated sources, on a catalog objective", () => {
    assert.deepEqual(validateScenario(d).map(String), []);
    assert.equal(d.screen.type, "terminal");
    assert.equal(d.outcome.profile, "data");
    assert.equal((d.screen as any).terminal.prompt, ">>>");
    assert.equal(d.engine.minor, 2);
    assert.ok(d.endingOrder && d.endingOrder.length >= 2);
    assert.ok(d.sources.every((s) => s.checkedAt === "2026-11-14"));
    const titles = new Set(activeUnits(CATALOG_TRACKS.find((t) => t.code === "PYDATA")!).flatMap((u) => u.objectives));
    assert.ok(titles.has(d.objective));
    for (const s of d.secondaryObjectives ?? []) assert.ok(titles.has(s), s);
    assert.ok(selectionFor({ objective: d.objective, unitTitle: "", unitWeight: null, weightsAreExam: false }).qualifies);
    const errs = lintScenario(d, { now: "2026-11-14", safetyFamily: "general" }).filter((p) => p.level === "error");
    assert.deepEqual(errs, []);
  });

  test("goldens reach every ending but time_up and score every criterion met and missed", () => {
    const g = JSON.parse(readFileSync(e.golden!, "utf8")) as GoldenFile;
    const endings = new Set(g.paths.map((p) => p.expect.ending));
    for (const k of Object.keys(d.endings)) if (k !== "time_up") assert.ok(endings.has(k), k);
    for (const c of d.scoring.criteria) {
      const seen = new Set(g.paths.map((p) => p.expect.criteria?.[c.id]));
      assert.ok(seen.has("met") && seen.has("missed"), c.id);
    }
  });

  test("count() skips missing values, groupby drops missing keys, size(dropna=False) counts every row", () => {
    const r = driver(d);
    assert.equal(r.value("tableTotal"), 19804);
    r.act("sizeDrop");
    assert.equal(r.value("tableTotal"), 44298);
    r.act("sizeAll");
    assert.equal(r.value("tableTotal"), 48210);
    r.act("check");
    assert.notEqual(r.value("assertedAt"), null);
    const x = driver(d);
    x.act("dropna");
    x.act("sizeAll");
    assert.notEqual(x.value("tableTotal"), 48210, "rows dropped from df stay dropped");
  });
});
