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

  test("no action or state id is a server-only key name, so the client document's keys stay clean (FAIL-2500)", () => {
    const SERVER_ONLY = ["scoring", "parts", "modelAnswer", "modelReasoning", "debrief", "expertPath", "checkedAt", "recheckBy"];
    for (const w of CLOUD) {
      const d = docOf(w.slug);
      for (const id of [...Object.keys(d.actions), ...Object.keys(d.state ?? {})]) assert.ok(!SERVER_ONLY.includes(id), `${w.slug}: id "${id}" is a server-only key`);
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
  test("AWSDEA glue-join-skewed-on-guest-key: copying yesterday's output publishes wrong numbers; 60 workers change nothing; splitting the GUEST key makes 06:00", () => {
    const d = docOf("glue-join-skewed-on-guest-key");
    const h = driver(d);
    h.act("stale");
    assert.equal(h.value("harmed"), true, "stale causes harm");
    until(h, 61);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("workers");
    until(n, 61);
    assert.notEqual(n.value("missAt"), null, "workers changes nothing");
    const ok = driver(d);
    ok.act("split");
    until(ok, 61);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AWSSAP sqs-visibility-shorter-than-work: purging loses orders; long polling changes nothing; a longer visibility timeout and an idempotency key hold the renewals", () => {
    const d = docOf("sqs-visibility-shorter-than-work");
    const h = driver(d);
    h.act("purge");
    assert.equal(h.value("harmed"), true, "purge causes harm");
    until(h, 51);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("longpoll");
    until(n, 51);
    assert.notEqual(n.value("missAt"), null, "longpoll changes nothing");
    const ok = driver(d);
    ok.act("vis");
    until(ok, 51);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AWSSAP onprem-cannot-resolve-private-zone: a public record exposes the database; another VPC association changes nothing; an inbound endpoint and forwarder make the cutover", () => {
    const d = docOf("onprem-cannot-resolve-private-zone");
    const h = driver(d);
    h.act("public");
    assert.equal(h.value("harmed"), true, "public causes harm");
    until(h, 51);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("assoc");
    until(n, 51);
    assert.notEqual(n.value("missAt"), null, "assoc changes nothing");
    const ok = driver(d);
    ok.act("inbound");
    until(ok, 51);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AWSSAP region-scp-blocks-global-services: detaching the SCP removes the residency control; AdministratorAccess cannot beat an SCP deny; a NotAction exemption makes the launch", () => {
    const d = docOf("region-scp-blocks-global-services");
    const h = driver(d);
    h.act("detach");
    assert.equal(h.value("harmed"), true, "detach causes harm");
    until(h, 56);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("admin");
    until(n, 56);
    assert.notEqual(n.value("missAt"), null, "admin changes nothing");
    const ok = driver(d);
    ok.act("exempt");
    until(ok, 56);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AWSSAP cross-account-share-kms-denied: copying to SSE-S3 escapes the key's controls; more S3 permissions change nothing; Decrypt on both policies builds the report", () => {
    const d = docOf("cross-account-share-kms-denied");
    const h = driver(d);
    h.act("plain");
    assert.equal(h.value("harmed"), true, "plain causes harm");
    until(h, 56);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("s3perm");
    until(n, 56);
    assert.notEqual(n.value("missAt"), null, "s3perm changes nothing");
    const ok = driver(d);
    ok.act("grant");
    until(ok, 56);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ120 fence-agent-lost-role-before-maintenance: turning STONITH off risks two primaries; restarting Pacemaker changes nothing; restoring the fence role lets HANA move before maintenance", () => {
    const d = docOf("fence-agent-lost-role-before-maintenance");
    const h = driver(d);
    h.act("nostonith");
    assert.equal(h.value("harmed"), true, "nostonith causes harm");
    until(h, 121);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("restart");
    until(n, 121);
    assert.notEqual(n.value("missAt"), null, "restart changes nothing");
    const ok = driver(d);
    ok.act("role");
    until(ok, 121);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ120 migration-wave-blocked-by-vm-family-quota: another region splits SAP's tiers; a retry changes nothing; a family quota request makes the export window", () => {
    const d = docOf("migration-wave-blocked-by-vm-family-quota");
    const h = driver(d);
    h.act("region");
    assert.equal(h.value("harmed"), true, "region causes harm");
    until(h, 151);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("retry");
    until(n, 151);
    assert.notEqual(n.value("missAt"), null, "retry changes nothing");
    const ok = driver(d);
    ok.act("request");
    until(ok, 151);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ120 hana-log-writes-slow-no-write-accelerator: accelerating the data disks shares the limit with the log; Accelerated Networking changes nothing; Write Accelerator on the log disks restores commits", () => {
    const d = docOf("hana-log-writes-slow-no-write-accelerator");
    const h = driver(d);
    h.act("allwa");
    assert.equal(h.value("harmed"), true, "allwa causes harm");
    until(h, 121);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("accnet");
    until(n, 121);
    assert.notEqual(n.value("missAt"), null, "accnet changes nothing");
    const ok = driver(d);
    ok.act("enable");
    until(ok, 121);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ120 hana-vip-unreachable-tcp-timestamps: a takeover moves HANA onto the same problem; restarting the probe listener changes nothing; timestamps off restores the virtual IP", () => {
    const d = docOf("hana-vip-unreachable-tcp-timestamps");
    const h = driver(d);
    h.act("move");
    assert.equal(h.value("harmed"), true, "move causes harm");
    until(h, 81);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("restartnc");
    until(n, 81);
    assert.notEqual(n.value("missAt"), null, "restartnc changes nothing");
    const ok = driver(d);
    ok.act("ts");
    until(ok, 81);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ120 baseline-policy-denies-hana-vm-size: deleting the assignment removes the baseline everywhere; Owner cannot beat a policy deny; a narrow waiver makes the install", () => {
    const d = docOf("baseline-policy-denies-hana-vm-size");
    const h = driver(d);
    h.act("unassign");
    assert.equal(h.value("harmed"), true, "unassign causes harm");
    until(h, 91);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("owner");
    until(n, 91);
    assert.notEqual(n.value("missAt"), null, "owner changes nothing");
    const ok = driver(d);
    ok.act("exempt");
    until(ok, 91);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ140 tls-inspection-breaks-session-hosts: deleting the default route bypasses the firewall; restarting hosts changes nothing; excluding AVD traffic from inspection brings the hosts back", () => {
    const d = docOf("tls-inspection-breaks-session-hosts");
    const h = driver(d);
    h.act("bypass");
    assert.equal(h.value("harmed"), true, "bypass causes harm");
    until(h, 71);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("restart");
    until(n, 71);
    assert.notEqual(n.value("missAt"), null, "restart changes nothing");
    const ok = driver(d);
    ok.act("exempt");
    until(ok, 71);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ140 start-vm-on-connect-after-rg-move: Contributor on the subscription over-privileges AVD; toggling the feature changes nothing; the Power On role on the new scope starts the desktops", () => {
    const d = docOf("start-vm-on-connect-after-rg-move");
    const h = driver(d);
    h.act("contrib");
    assert.equal(h.value("harmed"), true, "contrib causes harm");
    until(h, 51);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("toggle");
    until(n, 51);
    assert.notEqual(n.value("missAt"), null, "toggle changes nothing");
    const ok = driver(d);
    ok.act("assign");
    until(ok, 51);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ140 scaling-plan-utc-forces-logoff-midshift: deleting the plan stops ramp-up too; undraining hosts is overwritten; fixing the time zone stops the sign-out", () => {
    const d = docOf("scaling-plan-utc-forces-logoff-midshift");
    const h = driver(d);
    h.act("delete");
    assert.equal(h.value("harmed"), true, "delete causes harm");
    until(h, 31);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("drain");
    until(n, 31);
    assert.notEqual(n.value("missAt"), null, "drain changes nothing");
    const ok = driver(d);
    ok.act("tz");
    until(ok, 31);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ140 one-minute-disconnect-limit-kills-field-sessions: unassigning the baseline removes all hardening; RDP Shortpath changes nothing; AVD session limits keep sessions through drops", () => {
    const d = docOf("one-minute-disconnect-limit-kills-field-sessions");
    const h = driver(d);
    h.act("unassign");
    assert.equal(h.value("harmed"), true, "unassign causes harm");
    until(h, 51);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("shortpath");
    until(n, 51);
    assert.notEqual(n.value("missAt"), null, "shortpath changes nothing");
    const ok = driver(d);
    ok.act("override");
    until(ok, 51);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ140 bad-image-version-spreads-to-new-hosts: deleting hosts loses open work and rebuilds the same image; restarts change nothing; excluding the version from latest stops the spread", () => {
    const d = docOf("bad-image-version-spreads-to-new-hosts");
    const h = driver(d);
    h.act("delete");
    assert.equal(h.value("harmed"), true, "delete causes harm");
    until(h, 51);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("restart");
    until(n, 51);
    assert.notEqual(n.value("missAt"), null, "restart changes nothing");
    const ok = driver(d);
    ok.act("exclude");
    until(ok, 51);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("DP300 public-access-off-reporting-resolves-public-ip: re-enabling public access exposes the database; a firewall rule cannot be created; linking the private DNS zone makes the refresh", () => {
    const d = docOf("public-access-off-reporting-resolves-public-ip");
    const h = driver(d);
    h.act("public");
    assert.equal(h.value("harmed"), true, "public causes harm");
    until(h, 71);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("fwrule");
    until(n, 71);
    assert.notEqual(n.value("missAt"), null, "fwrule changes nothing");
    const ok = driver(d);
    ok.act("link");
    until(ok, 71);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("DP300 plan-regression-order-search-query-store: clearing the plan cache causes a recompile storm; an index rebuild changes nothing; forcing the last good plan holds the bulk check", () => {
    const d = docOf("plan-regression-order-search-query-store");
    const h = driver(d);
    h.act("flush");
    assert.equal(h.value("harmed"), true, "flush causes harm");
    until(h, 41);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("rebuild");
    until(n, 41);
    assert.notEqual(n.value("missAt"), null, "rebuild changes nothing");
    const ok = driver(d);
    ok.act("force");
    until(ok, 41);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("DP300 app-pinned-to-old-primary-after-geo-failover: a forced failback loses recent orders; a restart changes nothing; the read-write listener restores writes", () => {
    const d = docOf("app-pinned-to-old-primary-after-geo-failover");
    const h = driver(d);
    h.act("forceback");
    assert.equal(h.value("harmed"), true, "forceback causes harm");
    until(h, 81);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("restart");
    until(n, 81);
    assert.notEqual(n.value("missAt"), null, "restart changes nothing");
    const ok = driver(d);
    ok.act("listener");
    until(ok, 81);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("DP300 log-backup-job-failing-expired-sas: SIMPLE recovery breaks the log chain; restarting Agent changes nothing; a new SAS credential lets the log backup run in time", () => {
    const d = docOf("log-backup-job-failing-expired-sas");
    const h = driver(d);
    h.act("simple");
    assert.equal(h.value("harmed"), true, "simple causes harm");
    until(h, 46);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("agent");
    until(n, 46);
    assert.notEqual(n.value("missAt"), null, "agent changes nothing");
    const ok = driver(d);
    ok.act("newsas");
    until(ok, 46);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("DP300 lrs-cutover-tail-backup-not-restored: completing without the tail loses orders; re-uploading to the same folder changes nothing; the tail in the flat folder completes the cutover", () => {
    const d = docOf("lrs-cutover-tail-backup-not-restored");
    const h = driver(d);
    h.act("complete");
    assert.equal(h.value("harmed"), true, "complete causes harm");
    until(h, 41);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("reupload");
    until(n, 41);
    assert.notEqual(n.value("missAt"), null, "reupload changes nothing");
    const ok = driver(d);
    ok.act("move");
    until(ok, 41);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("DP300 deploy-script-truncates-rates-table: swapping the copy in loses later bookings; the weekly load cannot run in time; restoring and copying back the table makes the cut-off", () => {
    const d = docOf("deploy-script-truncates-rates-table");
    const h = driver(d);
    h.act("swap");
    assert.equal(h.value("harmed"), true, "swap causes harm");
    until(h, 51);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("ltr");
    until(n, 51);
    assert.notEqual(n.value("missAt"), null, "ltr changes nothing");
    const ok = driver(d);
    ok.act("restore");
    until(ok, 51);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("DP300 managed-identity-login-fails-new-database: the admin login over-privileges the app; an Azure role grants no database access; a contained user for the identity lets invoicing run", () => {
    const d = docOf("managed-identity-login-fails-new-database");
    const h = driver(d);
    h.act("sa");
    assert.equal(h.value("harmed"), true, "sa causes harm");
    until(h, 46);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("contrib");
    until(n, 46);
    assert.notEqual(n.value("missAt"), null, "contrib changes nothing");
    const ok = driver(d);
    ok.act("user");
    until(ok, 46);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ140 ca-policy-targets-arm-provider-feed-fails: disabling the policy removes MFA; re-registering MFA changes nothing; removing the feed app from the targets fixes the feed", () => {
    const d = docOf("ca-policy-targets-arm-provider-feed-fails");
    const h = driver(d);
    h.act("disable");
    assert.equal(h.value("harmed"), true, "disable causes harm");
    until(h, 51);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("rereg");
    until(n, 51);
    assert.notEqual(n.value("missAt"), null, "rereg changes nothing");
    const ok = driver(d);
    ok.act("retarget");
    until(ok, 51);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPMLE new-model-version-took-all-traffic: clearing the traffic split takes the endpoint dark; more replicas change nothing; a 90/10 split restores the canary before the peak", () => {
    const d = docOf("new-model-version-took-all-traffic");
    const h = driver(d);
    h.act("clear");
    assert.equal(h.value("harmed"), true, "clear causes harm");
    until(h, 41);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("replicas");
    until(n, 41);
    assert.notEqual(n.value("missAt"), null, "replicas changes nothing");
    const ok = driver(d);
    ok.act("canary");
    until(ok, 41);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPMLE retrain-pipeline-trains-on-broken-feed: letting the run deploy ships zero forecasts; a bigger machine changes nothing; stopping before deploy keeps the good model", () => {
    const d = docOf("retrain-pipeline-trains-on-broken-feed");
    const h = driver(d);
    h.act("approve");
    assert.equal(h.value("harmed"), true, "approve causes harm");
    until(h, 51);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("bigger");
    until(n, 51);
    assert.notEqual(n.value("missAt"), null, "bigger changes nothing");
    const ok = driver(d);
    ok.act("stop");
    until(ok, 51);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPMLE eta-model-skew-miles-not-km: retraining on mixed units bakes the bug in; raising the threshold hides it; converting at preprocessing fixes ETAs before the rush", () => {
    const d = docOf("eta-model-skew-miles-not-km");
    const h = driver(d);
    h.act("retrain");
    assert.equal(h.value("harmed"), true, "retrain causes harm");
    until(h, 51);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("threshold");
    until(n, 51);
    assert.notEqual(n.value("missAt"), null, "threshold changes nothing");
    const ok = driver(d);
    ok.act("convert");
    until(ok, 51);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("DP900 delete-without-where-open-transaction: COMMIT makes the delete permanent; reopening a window changes nothing; ROLLBACK and a WHERE clause restore the customers", () => {
    const d = docOf("delete-without-where-open-transaction");
    const h = driver(d);
    h.act("commit");
    assert.equal(h.value("harmed"), true, "commit causes harm");
    until(h, 41);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("restart");
    until(n, 41);
    assert.notEqual(n.value("missAt"), null, "restart changes nothing");
    const ok = driver(d);
    ok.act("rollback");
    until(ok, 41);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("DP900 auditor-needs-archived-invoices-today: public access exposes the invoices; standard priority is too slow; a high-priority copy delivers by 15:00", () => {
    const d = docOf("auditor-needs-archived-invoices-today");
    const h = driver(d);
    h.act("public");
    assert.equal(h.value("harmed"), true, "public causes harm");
    until(h, 151);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("standard");
    until(n, 151);
    assert.notEqual(n.value("missAt"), null, "standard changes nothing");
    const ok = driver(d);
    ok.act("copyhigh");
    until(ok, 151);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("DP900 year-end-report-runs-on-checkout-database: a failover cuts off checkouts; more storage changes nothing; running the report on the read-only replica frees checkout", () => {
    const d = docOf("year-end-report-runs-on-checkout-database");
    const h = driver(d);
    h.act("failover");
    assert.equal(h.value("harmed"), true, "failover causes harm");
    until(h, 46);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("storage");
    until(n, 46);
    assert.notEqual(n.value("missAt"), null, "storage changes nothing");
    const ok = driver(d);
    ok.act("move");
    until(ok, 46);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPDBE new-feature-query-seq-scan-orders: a plain CREATE INDEX locks out checkout; more CPU changes nothing in time; CREATE INDEX CONCURRENTLY fixes the query before the campaign", () => {
    const d = docOf("new-feature-query-seq-scan-orders");
    const h = driver(d);
    h.act("plain");
    assert.equal(h.value("harmed"), true, "plain causes harm");
    until(h, 61);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("cpu");
    until(n, 61);
    assert.notEqual(n.value("missAt"), null, "cpu changes nothing");
    const ok = driver(d);
    ok.act("cic");
    until(ok, 61);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPDBE dms-cutover-delay-never-reaches-zero: promoting at 40 seconds of delay diverges the data; a bigger destination changes nothing; stopping the cron job lets the delay reach zero", () => {
    const d = docOf("dms-cutover-delay-never-reaches-zero");
    const h = driver(d);
    h.act("promote");
    assert.equal(h.value("harmed"), true, "promote causes harm");
    until(h, 51);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("restartjob");
    until(n, 51);
    assert.notEqual(n.value("missAt"), null, "restartjob changes nothing");
    const ok = driver(d);
    ok.act("stopcron");
    until(ok, 51);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPDBE reporting-query-stalls-read-replica: promoting the replica freezes it; more connections change nothing; cancelling the blocking query and separating reporting restores fresh reads", () => {
    const d = docOf("reporting-query-stalls-read-replica");
    const h = driver(d);
    h.act("promote");
    assert.equal(h.value("harmed"), true, "promote causes harm");
    until(h, 41);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("maxconn");
    until(n, 41);
    assert.notEqual(n.value("missAt"), null, "maxconn changes nothing");
    const ok = driver(d);
    ok.act("cancel");
    until(ok, 41);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPNET cloud-nat-port-exhaustion-payment-api: external node IPs expose nodes and break the allowlist; the UDP timeout changes nothing; dynamic ports with allowlisted IPs hold the sale", () => {
    const d = docOf("cloud-nat-port-exhaustion-payment-api");
    const h = driver(d);
    h.act("extip");
    assert.equal(h.value("harmed"), true, "extip causes harm");
    until(h, 46);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("udp");
    until(n, 46);
    assert.notEqual(n.value("missAt"), null, "udp changes nothing");
    const ok = driver(d);
    ok.act("dpa");
    until(ok, 46);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPNET cdn-serves-wrong-price-after-fix: invalidating everything overwhelms the origin; republishing at the origin changes nothing; invalidating the two paths fixes the price", () => {
    const d = docOf("cdn-serves-wrong-price-after-fix");
    const h = driver(d);
    h.act("all");
    assert.equal(h.value("harmed"), true, "all causes harm");
    until(h, 36);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("origin");
    until(n, 36);
    assert.notEqual(n.value("missAt"), null, "origin changes nothing");
    const ok = driver(d);
    ok.act("inval");
    until(ok, 36);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPNET psa-range-full-before-launch: an overlapping range breaks reachability from the plant; a retry changes nothing; a non-overlapping second range lets the services deploy", () => {
    const d = docOf("psa-range-full-before-launch");
    const h = driver(d);
    h.act("overlap");
    assert.equal(h.value("harmed"), true, "overlap causes harm");
    until(h, 111);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("retry");
    until(n, 111);
    assert.notEqual(n.value("missAt"), null, "retry changes nothing");
    const ok = driver(d);
    ok.act("alloc");
    until(ok, 111);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPNET ha-vpn-bgp-down-after-router-swap: recreating the gateway changes its IPs; resetting tunnels changes nothing; the right peer ASN brings BGP up", () => {
    const d = docOf("ha-vpn-bgp-down-after-router-swap");
    const h = driver(d);
    h.act("recreate");
    assert.equal(h.value("harmed"), true, "recreate causes harm");
    until(h, 51);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("reset");
    until(n, 51);
    assert.notEqual(n.value("missAt"), null, "reset changes nothing");
    const ok = driver(d);
    ok.act("asn");
    until(ok, 51);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPNET peered-vpc-no-route-to-onprem: a public NAT path exposes the ledger; a firewall rule cannot fix a missing route; exchanging custom routes and advertising the range connects the job", () => {
    const d = docOf("peered-vpc-no-route-to-onprem");
    const h = driver(d);
    h.act("public");
    assert.equal(h.value("harmed"), true, "public causes harm");
    until(h, 101);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("fw");
    until(n, 101);
    assert.notEqual(n.value("missAt"), null, "fw changes nothing");
    const ok = driver(d);
    ok.act("exchange");
    until(ok, 101);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPNET folder-policy-deny-blocks-app-to-db: detaching the policy removes the guardrail; VPC priority cannot beat a hierarchical deny; a goto_next rule restores the app", () => {
    const d = docOf("folder-policy-deny-blocks-app-to-db");
    const h = driver(d);
    h.act("detach");
    assert.equal(h.value("harmed"), true, "detach causes harm");
    until(h, 56);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("vpcprio");
    until(n, 56);
    assert.notEqual(n.value("missAt"), null, "vpcprio changes nothing");
    const ok = driver(d);
    ok.act("goto");
    until(ok, 56);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPSEC cmek-old-version-scheduled-for-destruction: KMS admin for the service agent changes nothing and over-privileges; a bigger reservation changes nothing; restoring the versions in time reads the data", () => {
    const d = docOf("cmek-old-version-scheduled-for-destruction");
    const h = driver(d);
    h.act("adminagent");
    assert.equal(h.value("harmed"), true, "adminagent causes harm");
    until(h, 81);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("rerun");
    until(n, 81);
    assert.notEqual(n.value("missAt"), null, "rerun changes nothing");
    const ok = driver(d);
    ok.act("restore");
    until(ok, 81);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPSEC service-account-key-on-public-repo: deleting the account takes production down; a password reset changes nothing; disabling the one key contains the leak", () => {
    const d = docOf("service-account-key-on-public-repo");
    const h = driver(d);
    h.act("deletesa");
    assert.equal(h.value("harmed"), true, "deletesa causes harm");
    until(h, 56);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("rotateuser");
    until(n, 56);
    assert.notEqual(n.value("missAt"), null, "rotateuser changes nothing");
    const ok = driver(d);
    ok.act("disable");
    until(ok, 56);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPSEC unsigned-hotfix-blocked-by-binauthz: allow-all admits an unscanned image; a retry admits nothing; sending the fix through CI deploys it in time", () => {
    const d = docOf("unsigned-hotfix-blocked-by-binauthz");
    const h = driver(d);
    h.act("allowall");
    assert.equal(h.value("harmed"), true, "allowall causes harm");
    until(h, 56);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("redeploy");
    until(n, 56);
    assert.notEqual(n.value("missAt"), null, "redeploy changes nothing");
    const ok = driver(d);
    ok.act("ci");
    until(ok, 56);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPSEC vpcsc-blocks-partner-delivery-export: removing the project from the perimeter exposes the data; more IAM changes nothing; a narrow egress rule makes the delivery", () => {
    const d = docOf("vpcsc-blocks-partner-delivery-export");
    const h = driver(d);
    h.act("remove");
    assert.equal(h.value("harmed"), true, "remove causes harm");
    until(h, 51);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("iamagain");
    until(n, 51);
    assert.notEqual(n.value("missAt"), null, "iamagain changes nothing");
    const ok = driver(d);
    ok.act("egress");
    until(ok, 51);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ700 expressroute-bgp-drops-over-prefix-limit: a default route hijacks Azure's internet path; a peering reset drops again; going back to summaries keeps the session up", () => {
    const d = docOf("expressroute-bgp-drops-over-prefix-limit");
    const h = driver(d);
    h.act("default");
    assert.equal(h.value("harmed"), true, "default causes harm");
    until(h, 66);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("reset");
    until(n, 66);
    assert.notEqual(n.value("missAt"), null, "reset changes nothing");
    const ok = driver(d);
    ok.act("filter");
    until(ok, 66);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ400 oidc-deploy-fails-after-environment-rename: a client secret breaks the no-secrets design; a re-run changes nothing; a federated credential for the new subject restores deploys", () => {
    const d = docOf("oidc-deploy-fails-after-environment-rename");
    const h = driver(d);
    h.act("secret");
    assert.equal(h.value("harmed"), true, "secret causes harm");
    until(h, 81);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("rerun");
    until(n, 81);
    assert.notEqual(n.value("missAt"), null, "rerun changes nothing");
    const ok = driver(d);
    ok.act("addfic");
    until(ok, 81);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AI200 orders-dead-lettered-after-schema-bug: purging the DLQ deletes paid orders; restarting the function changes nothing; resubmitting after the fix gets the orders processed", () => {
    const d = docOf("orders-dead-lettered-after-schema-bug");
    const h = driver(d);
    h.act("purge");
    assert.equal(h.value("harmed"), true, "purge causes harm");
    until(h, 81);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("restartfn");
    until(n, 81);
    assert.notEqual(n.value("missAt"), null, "restartfn changes nothing");
    const ok = driver(d);
    ok.act("resubmit");
    until(ok, 81);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AI200 cosmos-query-without-partition-key-429: recreating the container deletes orders; more retries change nothing; passing the partition key ends the throttling", () => {
    const d = docOf("cosmos-query-without-partition-key-429");
    const h = driver(d);
    h.act("rekey");
    assert.equal(h.value("harmed"), true, "rekey causes harm");
    until(h, 46);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("retries");
    until(n, 46);
    assert.notEqual(n.value("missAt"), null, "retries changes nothing");
    const ok = driver(d);
    ok.act("pk");
    until(ok, 46);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AWSDVA prod-alias-left-on-latest: deleting the alias breaks the API; publishing the current code changes nothing; repointing prod at version 41 restores production", () => {
    const d = docOf("prod-alias-left-on-latest");
    const h = driver(d);
    h.act("delalias");
    assert.equal(h.value("harmed"), true, "delalias causes harm");
    until(h, 66);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("publish");
    until(n, 66);
    assert.notEqual(n.value("missAt"), null, "publish changes nothing");
    const ok = driver(d);
    ok.act("repoint");
    until(ok, 66);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPDEVOPS drain-bad-region-from-global-lb: deleting the region loses redundancy and evidence; restarting changes nothing; draining with the capacity scaler saves the budget", () => {
    const d = docOf("drain-bad-region-from-global-lb");
    const h = driver(d);
    h.act("delete");
    assert.equal(h.value("harmed"), true, "delete causes harm");
    until(h, 26);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("restart");
    until(n, 26);
    assert.notEqual(n.value("missAt"), null, "restart changes nothing");
    const ok = driver(d);
    ok.act("drain");
    until(ok, 26);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("GCPDEVOPS cost-exclusion-hides-checkout-errors: disabling the _Default sink drops every log; a wider search finds nothing; narrowing the exclusion brings the errors back", () => {
    const d = docOf("cost-exclusion-hides-checkout-errors");
    const h = driver(d);
    h.act("disable");
    assert.equal(h.value("harmed"), true, "disable causes harm");
    until(h, 71);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("widen");
    until(n, 71);
    assert.notEqual(n.value("missAt"), null, "widen changes nothing");
    const ok = driver(d);
    ok.act("narrow");
    until(ok, 71);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ700 snat-exhaustion-carrier-api-before-cutoff: per-VM public IPs expose the VMs and break the allowlist; restarts change nothing; a NAT gateway with allowlisted IPs labels every parcel", () => {
    const d = docOf("snat-exhaustion-carrier-api-before-cutoff");
    const h = driver(d);
    h.act("pip");
    assert.equal(h.value("harmed"), true, "pip causes harm");
    until(h, 91);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("restart");
    until(n, 91);
    assert.notEqual(n.value("missAt"), null, "restart changes nothing");
    const ok = driver(d);
    ok.act("natgw");
    until(ok, 91);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AWSANS vpn-large-responses-hang-pmtud-blocked: an allow-all ACL removes the hardening; a larger instance changes nothing; allowing ICMP fragmentation-needed lets large reports through", () => {
    const d = docOf("vpn-large-responses-hang-pmtud-blocked");
    const h = driver(d);
    h.act("openall");
    assert.equal(h.value("harmed"), true, "openall causes harm");
    until(h, 81);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("resize");
    until(n, 81);
    assert.notEqual(n.value("missAt"), null, "resize changes nothing");
    const ok = driver(d);
    ok.act("allowicmp");
    until(ok, 81);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AZ400 storage-key-in-history-before-open-source: regenerating both keys takes production down; a deletion commit changes nothing; rotating one key and rewriting history makes the mirror safe", () => {
    const d = docOf("storage-key-in-history-before-open-source");
    const h = driver(d);
    h.act("both");
    assert.equal(h.value("harmed"), true, "both causes harm");
    until(h, 161);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("delete");
    until(n, 161);
    assert.notEqual(n.value("missAt"), null, "delete changes nothing");
    const ok = driver(d);
    ok.act("scrub");
    until(ok, 161);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("AWSSCS miner-instance-evidence-before-scale-in: terminating destroys the evidence; a reboot changes nothing; standby and capture before quarantine keep it", () => {
    const d = docOf("miner-instance-evidence-before-scale-in");
    const h = driver(d);
    h.act("terminate");
    assert.equal(h.value("harmed"), true, "terminate causes harm");
    until(h, 46);
    assert.notEqual(h.value("missAt"), null);
    const n = driver(d);
    n.act("reboot");
    until(n, 46);
    assert.notEqual(n.value("missAt"), null, "reboot changes nothing");
    const ok = driver(d);
    ok.act("preserve");
    until(ok, 46);
    assert.equal(ok.value("missAt"), null);
    assert.equal(ok.value("okAt") !== null, true);
  });
  test("PL300 merge-duplicates-double-region-revenue: the active-row dedupe ships the ledger's total; an inner join still double counts", () => {
    const d = docOf("merge-duplicates-double-region-revenue");
    const ok = driver(d);
    ok.act("look");
    ok.act("change", { f: "active" });
    ok.act("check");
    assert.equal(ok.value("fixed"), true);
    assert.equal(ok.value("testPassed"), true);
    ok.act("ship");
    assert.equal(ok.value("sentAs"), "right");
    const bad = driver(d);
    bad.act("look");
    bad.act("change", { f: "inner" });
    bad.act("ship");
    assert.equal(bad.value("sentAs"), "wrong", "inner ships a wrong result");
  });
  test("PL300 return-rate-trend-on-a-pie-chart: a line chart over months with a ratio measure answers the trend; a line of summed rates ships wrong numbers", () => {
    const d = docOf("return-rate-trend-on-a-pie-chart");
    const ok = driver(d);
    ok.act("look");
    ok.act("change", { f: "line" });
    ok.act("check");
    assert.equal(ok.value("fixed"), true);
    assert.equal(ok.value("testPassed"), true);
    ok.act("ship");
    assert.equal(ok.value("sentAs"), "right");
    const bad = driver(d);
    bad.act("look");
    bad.act("change", { f: "sumline" });
    bad.act("ship");
    assert.equal(bad.value("sentAs"), "wrong", "sumline ships a wrong result");
  });
  test("AWSAIF ticket-labels-change-on-every-run: temperature 0 with fixed labels routes consistently; a larger maxTokens changes nothing", () => {
    const d = docOf("ticket-labels-change-on-every-run");
    const ok = driver(d);
    ok.act("look");
    ok.act("change", { f: "zero" });
    ok.act("check");
    assert.equal(ok.value("fixed"), true);
    assert.equal(ok.value("testPassed"), true);
    ok.act("ship");
    assert.equal(ok.value("sentAs"), "right");
    const bad = driver(d);
    bad.act("look");
    bad.act("change", { f: "maxtok" });
    bad.act("ship");
    assert.equal(bad.value("sentAs"), "wrong", "maxtok ships a wrong result");
  });
  test("AWSAIF manual-in-every-prompt-triples-bill: sending only the relevant chunks cuts input tokens; a lower maxTokens barely moves the bill", () => {
    const d = docOf("manual-in-every-prompt-triples-bill");
    const ok = driver(d);
    ok.act("look");
    ok.act("change", { f: "chunks" });
    ok.act("check");
    assert.equal(ok.value("fixed"), true);
    assert.equal(ok.value("testPassed"), true);
    ok.act("ship");
    assert.equal(ok.value("sentAs"), "right");
    const bad = driver(d);
    bad.act("look");
    bad.act("change", { f: "maxout" });
    bad.act("ship");
    assert.equal(bad.value("sentAs"), "wrong", "maxout ships a wrong result");
  });
  test("AWSAIF guardrail-blocks-payroll-questions: a precise denied-topic definition keeps the block and lets payroll through; turning the guardrail off removes it", () => {
    const d = docOf("guardrail-blocks-payroll-questions");
    const ok = driver(d);
    ok.act("look");
    ok.act("change", { f: "precise" });
    ok.act("check");
    assert.equal(ok.value("fixed"), true);
    assert.equal(ok.value("testPassed"), true);
    ok.act("ship");
    assert.equal(ok.value("sentAs"), "right");
    const bad = driver(d);
    bad.act("look");
    bad.act("change", { f: "off" });
    bad.act("ship");
    assert.equal(bad.value("sentAs"), "wrong", "off ships a wrong result");
  });
  test("GCPGAIL hr-assistant-grounded-on-the-web: grounding on the HR handbook data store answers from the company's own policy; a lower temperature does not", () => {
    const d = docOf("hr-assistant-grounded-on-the-web");
    const ok = driver(d);
    ok.act("look");
    ok.act("change", { f: "own" });
    ok.act("check");
    assert.equal(ok.value("fixed"), true);
    assert.equal(ok.value("testPassed"), true);
    ok.act("ship");
    assert.equal(ok.value("sentAs"), "right");
    const bad = driver(d);
    bad.act("look");
    bad.act("change", { f: "temp" });
    bad.act("ship");
    assert.equal(bad.value("sentAs"), "wrong", "temp ships a wrong result");
  });
  test("AI901 hotel-reviews-hide-staff-complaints: opinion mining surfaces staff complaints; key phrases alone lose the sentiment", () => {
    const d = docOf("hotel-reviews-hide-staff-complaints");
    const ok = driver(d);
    ok.act("look");
    ok.act("change", { f: "opinion" });
    ok.act("check");
    assert.equal(ok.value("fixed"), true);
    assert.equal(ok.value("testPassed"), true);
    ok.act("ship");
    assert.equal(ok.value("sentAs"), "right");
    const bad = driver(d);
    bad.act("look");
    bad.act("change", { f: "phrases" });
    bad.act("ship");
    assert.equal(bad.value("sentAs"), "wrong", "phrases ships a wrong result");
  });
  test("GCPGAIL claims-assistant-pilot-on-an-api-key: moving to the Agent Platform with IAM, CMEK and data residency meets the controls; rotating the API key does not", () => {
    const d = docOf("claims-assistant-pilot-on-an-api-key");
    const ok = driver(d);
    ok.act("look");
    ok.act("change", { f: "platform" });
    ok.act("check");
    assert.equal(ok.value("fixed"), true);
    assert.equal(ok.value("testPassed"), true);
    ok.act("ship");
    assert.equal(ok.value("sentAs"), "right");
    const bad = driver(d);
    bad.act("look");
    bad.act("change", { f: "rotate" });
    bad.act("ship");
    assert.equal(bad.value("sentAs"), "wrong", "rotate ships a wrong result");
  });
  test("GCPMLE bqml-churn-predictions-without-training-transforms: retraining with TRANSFORM makes predictions match training; scoring raw columns ships nonsense", () => {
    const d = docOf("bqml-churn-predictions-without-training-transforms");
    const ok = driver(d);
    ok.act("look");
    ok.act("change", { f: "transform" });
    ok.act("check");
    assert.equal(ok.value("fixed"), true);
    assert.equal(ok.value("testPassed"), true);
    ok.act("ship");
    assert.equal(ok.value("sentAs"), "right");
    const bad = driver(d);
    bad.act("look");
    bad.act("change", { f: "threshold" });
    bad.act("ship");
    assert.equal(bad.value("sentAs"), "wrong", "threshold ships a wrong result");
  });
  test("GCPMLE partner-dataset-shares-raw-emails: deterministic encryption keeps the join and hides the emails; redaction breaks the join", () => {
    const d = docOf("partner-dataset-shares-raw-emails");
    const ok = driver(d);
    ok.act("look");
    ok.act("change", { f: "det" });
    ok.act("check");
    assert.equal(ok.value("fixed"), true);
    assert.equal(ok.value("testPassed"), true);
    ok.act("ship");
    assert.equal(ok.value("sentAs"), "right");
    const bad = driver(d);
    bad.act("look");
    bad.act("change", { f: "redact" });
    bad.act("ship");
    assert.equal(bad.value("sentAs"), "wrong", "redact ships a wrong result");
  });
});
