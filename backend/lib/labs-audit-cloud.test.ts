// REQ-183: content audit fixes (2026-11-09) for the AWS, Azure and Google
// Cloud courses. Each test pins a corrected objective, answer key or figure
// so the old value cannot come back (FAIL-586..593).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LAB_SETS } from "../supabase/seed/labs";
import { CATALOG_TRACKS, activeUnits } from "../supabase/seed/catalog";

function track(code: string) {
  const t = CATALOG_TRACKS.find((x) => x.code === code);
  assert.ok(t, code);
  return t!;
}
function lab(code: string, slug: string) {
  const l = LAB_SETS.find((s) => s.trackCode === code)?.labs.find((x) => x.slug === slug);
  assert.ok(l, `${code}/${slug}`);
  return l!;
}
const text = (l: ReturnType<typeof lab>) =>
  [l.brief, ...l.steps.flatMap((s) => [s.text, s.ask, ...s.parts.flatMap((p) => [p.criteria, p.modelAnswer])])].join("\n");

describe("cloud content audit fixes (REQ-183)", () => {
  test("CLF-C02 support objective lists the current plans (FAIL-586)", () => {
    const o = track("AWSCLF").units.flatMap((u) => u.objectives).find((x) => /^AWS Support (plans|options)/.test(x))!;
    for (const p of ["Basic Support", "AWS Business Support+", "AWS Enterprise Support", "AWS Unified Operations"]) assert.ok(o.includes(p), p);
    assert.match(o, /end on 2027-01-01/);
  });

  test("SAP DR lab verifies the recovery Region with ARC Region switch plan evaluation, not readiness checks (FAIL-587)", () => {
    const l = lab("AWSSAP", "multi-region-dr-trading");
    const part = l.steps.flatMap((s) => s.parts).find((p) => p.label === "Artifacts and quotas")!;
    assert.match(part.modelAnswer, /Region switch plan's evaluation/);
    assert.match(part.modelAnswer, /closed to new customers/);
  });

  test("DEA throttling step: the hot partition is over 1,000 WCU while the table is under its 2,000 (FAIL-588)", () => {
    const t = text(lab("AWSDEA", "kinesis-throttling-case"));
    assert.match(t, /about 1,500 items per second/);
    assert.match(t, /80% of the writes/);
    assert.match(t, /about 1,200 -- land on one item collection/);
    assert.doesNotMatch(t, /70% of 9,000 writes/);
  });

  test("GKE Pod range: a /19 or /18 at 110 Pods per node is rejected; max Pods 32 with a /18 or a /16 at 110 (FAIL-589)", () => {
    const l = lab("GCPNET", "net-ip-plan-hybrid-gke");
    const part = l.steps[0].parts.find((p) => p.label === "GKE primary and secondary ranges")!;
    assert.match(part.criteria, /A \/18 or \/19 at the default 110 is wrong/);
    assert.match(part.modelAnswer, /max Pods per node to 32/);
    assert.doesNotMatch(part.criteria, /so a \/19 or larger/);
    // private services access sits outside the three regional /13s
    assert.match(text(l), /allocate 10\.152\.0\.0\/16 to servicenetworking/);
  });

  test("AZ-104 and DP-300 objectives follow the live study guides (FAIL-590)", () => {
    const az = track("AZ104").units.flatMap((u) => u.objectives);
    assert.ok(az.includes("Configuring Azure Disk Encryption for virtual machines"));
    assert.ok(!az.some((o) => /encryption at host/i.test(o)));
    const dp = track("DP300");
    assert.ok(dp.units.flatMap((u) => u.objectives).includes("Implementing Always Encrypted with secure enclaves"));
    assert.equal(dp.credential?.objectivesRevision, "Skills measured as of October 27, 2026");
  });

  test("ACE impersonation audit needs Data Access audit logs turned on (FAIL-591)", () => {
    assert.match(text(lab("GCPACE", "service-account-impersonation")), /Data Access audit logs/);
  });

  test("GCP DevOps follows the guide live on 2026-11-23 and the old units retire after 2026-11-22 (FAIL-592)", () => {
    const t = track("GCPDEVOPS");
    const active = activeUnits(t);
    assert.deepEqual(active.map((u) => u.weight), [18, 30, 18, 22, 12]);
    const retired = t.units.filter((u) => u.retiredAt);
    assert.equal(retired.length, 5);
    assert.ok(retired.every((u) => u.retiredAt === "2026-11-23T12:00:00Z"));
    assert.equal(t.credential?.effectiveDate, "2026-11-23");
    const objs = active.flatMap((u) => u.objectives);
    for (const o of ["Configuring and using Model Context Protocol (MCP) servers", "Isolating agent execution environments: GKE Agent Sandbox", "Managing short-lived credentials", "Optimizing token consumption"])
      assert.ok(objs.includes(o), o);
    assert.ok(active[0].objectives.some((o) => o.includes("Network Connectivity Center")));
    const set = LAB_SETS.find((s) => s.trackCode === "GCPDEVOPS")!;
    assert.equal(set.labs.length, 11);
    for (const l of set.labs) assert.ok(objs.includes(l.objective), `${l.slug} maps to the new outline`);
  });

  test("Google Cloud guide links point at live exam guides, not removed /guides/ pages (FAIL-593)", () => {
    const dead = ["cloud-database-engineer", "cloud-developer", "cloud-devops-engineer", "cloud-network-engineer", "cloud-security-engineer", "data-engineer", "machine-learning-engineer"];
    for (const t of CATALOG_TRACKS.filter((x) => x.code.startsWith("GCP"))) {
      for (const u of [t.sourceUrl, t.credential?.officialObjectivesUrl])
        for (const d of dead) assert.notEqual(u, `https://cloud.google.com/learn/certification/guides/${d}`, `${t.code} ${d}`);
    }
  });
});
