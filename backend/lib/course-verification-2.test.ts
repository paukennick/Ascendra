// REQ-310 (verify-2, 2026-11-17): courses checked against their owners'
// current published outlines. Regression tests for the defects that check
// found (FAIL-2390, FAIL-2391) and pins for what it confirmed unchanged, so a
// later edit that drifts from the owner's outline fails here first.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ABPTS_ECS_TRACK } from "../supabase/seed/tracks/pt-abpts";
import { PROJECTPLUS_TRACK } from "../supabase/seed/tracks/comptia";
import { CSPP_TRACK, PMIPBA_TRACK } from "../supabase/seed/tracks/pm";
import { GCP_PCA_TRACK, GCP_DEVOPS_TRACK } from "../supabase/seed/tracks/gcp";
import { CNPE_TRACK } from "../supabase/seed/tracks/cncf-ecosystem";
import type { SeedTrack } from "../supabase/seed/data";

const CHECKED = "2026-11-17T00:00:00Z";
const live = (t: SeedTrack) => t.units.filter((u) => !u.retiredAt);
const weights = (t: SeedTrack) => live(t).map((u) => u.weight);
const titles = (t: SeedTrack) => live(t).map((u) => u.title);

describe("REQ-310 verify-2: defects found", () => {
  test("FAIL-2390: ABPTSECS no longer tells learners to delay electrodiagnosis 3 weeks in suspected GBS/AIDP", () => {
    const all = ABPTS_ECS_TRACK.units.flatMap((u) => u.objectives);
    assert.ok(!all.some((o) => /delay NCS|at least 3 weeks after onset/i.test(o)), "the StatPearls 2022 delay advice is gone");
    const gbs = all.find((o) => /Guillain-Barre/.test(o));
    assert.ok(gbs, "a GBS electrodiagnosis objective exists");
    assert.match(gbs!, /early/i);
    assert.match(gbs!, /normal first-week study does not exclude/i);
    assert.match(gbs!, /repeat study/i);
  });

  test("FAIL-2391: Project+ unit 4 carries CompTIA's domain name, 'Basics of IT and Governance'", () => {
    assert.deepEqual(titles(PROJECTPLUS_TRACK), [
      "Project Management Concepts",
      "Project Life Cycle Phases",
      "Tools and Documentation",
      "Basics of IT and Governance",
    ]);
    assert.deepEqual(weights(PROJECTPLUS_TRACK), [33, 30, 19, 18]);
    // One objective per numbered PK0-005 objective: 1.1-1.11, 2.1-2.5, 3.1-3.3, 4.1-4.5.
    assert.deepEqual(live(PROJECTPLUS_TRACK).map((u) => u.objectives.length), [11, 5, 3, 5]);
    assert.equal(PROJECTPLUS_TRACK.sourceVerifiedAt, CHECKED);
  });
});

describe("REQ-310 verify-2: outlines confirmed unchanged on 2026-11-17", () => {
  test("CSPP keeps the Certified Practitioner pathway: five domains, 18/18/36/18/11 as printed (=101)", () => {
    assert.deepEqual(weights(CSPP_TRACK), [18, 18, 36, 18, 11]);
    assert.equal(CSPP_TRACK.credential?.durationMinutes, 120);
    assert.equal(CSPP_TRACK.sourceVerifiedAt, CHECKED);
  });

  test("PMI-PBA weights match PMI's page and the exam time is recorded", () => {
    assert.deepEqual(weights(PMIPBA_TRACK), [18, 22, 35, 15, 10]);
    assert.equal(PMIPBA_TRACK.credential?.durationMinutes, 240);
  });

  test("PCA follows the guide the English certification page links (~25/17.5/17.5/15/12.5/12.5), not the older v6.1 PDF", () => {
    assert.deepEqual(weights(GCP_PCA_TRACK), [25, 17.5, 17.5, 15, 12.5, 12.5]);
    assert.ok(live(GCP_PCA_TRACK).flatMap((u) => u.objectives).some((o) => /Agent Platform Pipelines/.test(o)));
    assert.equal(GCP_PCA_TRACK.sourceVerifiedAt, CHECKED);
  });

  test("Cloud DevOps Engineer switches guides on 2026-11-23: old units retire then, new units carry 18/30/18/22/12", () => {
    const retired = GCP_DEVOPS_TRACK.units.filter((u) => u.retiredAt);
    assert.equal(retired.length, 5);
    for (const u of retired) assert.equal(u.retiredAt, "2026-11-23T12:00:00Z");
    assert.deepEqual(weights(GCP_DEVOPS_TRACK), [18, 30, 18, 22, 12]);
    assert.equal(GCP_DEVOPS_TRACK.credential?.effectiveDate, "2026-11-23");
  });

  test("CNPE matches the Linux Foundation's own page: five domains, 15/25/25/20/15, 18 competencies", () => {
    assert.deepEqual(titles(CNPE_TRACK), [
      "Platform Architecture and Infrastructure",
      "GitOps and Continuous Delivery",
      "Platform APIs and Self-Service Capabilities",
      "Observability and Operations",
      "Security and Policy Enforcement",
    ]);
    assert.deepEqual(weights(CNPE_TRACK), [15, 25, 25, 20, 15]);
    assert.deepEqual(live(CNPE_TRACK).map((u) => u.objectives.length), [3, 3, 4, 3, 5]);
    assert.equal(CNPE_TRACK.sourceVerifiedAt, CHECKED);
  });
});
