// REQ-220 (FAIL-1136): the CNA course's unit weights are our own study
// emphasis (42 CFR 483.152 apportions no exam), so nothing may present them
// as an exam blueprint: not the course payload's unit weights ("% of exam"
// on every app build), not readiness (blueprintWeighted), not the study plan,
// and not the coach prompt. A real blueprint (Security+) is unchanged.
// Needs the seeded catalog (CI seeds twice before test:db).
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { courseReadiness, weightsAreExamBlueprint } from "./readiness";
import { coachContextForUnit } from "./coach-context";
import { loadPlanInput } from "./study-plan-store";
import { GET as courseGet } from "../app/api/courses/[id]/route";

const run = Date.now().toString(36);
const user = randomUUID();
const auth = { authorization: `Bearer ${signAccessToken({ sub: user, email: `${user}@example.test` })}` };
const trackId = async (code: string) =>
  (await queryOne<{ id: string }>(`select id from subject_tracks where code = $1 and user_id is null`, [code]))!.id;

before(async () => {
  await query(`insert into app_users (id, email) values ($1, $2)`, [user, `se-${run}@example.test`]);
});
after(async () => {
  await query(`delete from app_users where id = $1`, [user]);
  await closePool();
});

describe("study-emphasis weights are never shown as an exam blueprint (REQ-220)", () => {
  test("the seed leaves the CNA exam's domains unweighted while the units keep their emphasis", async () => {
    const id = await trackId("CNA");
    const doms = await query<{ weight_percent: string | null }>(
      `select d.weight_percent from subject_tracks st join exam_domains d on d.exam_id = st.credential_exam_id where st.id = $1`,
      [id]
    );
    assert.ok(doms.length >= 2);
    assert.ok(doms.every((d) => d.weight_percent == null));
    const units = await query<{ weight: string | null }>(`select weight from course_units where track_id = $1 and retired_at is null`, [id]);
    assert.ok(units.filter((u) => u.weight != null).length >= 2, "units still carry study emphasis");
    assert.equal(await weightsAreExamBlueprint(id), false);
    assert.equal(await weightsAreExamBlueprint(await trackId("SECPLUS")), true);
  });

  for (const [code, blueprint] of [["CNA", false], ["SECPLUS", true]] as const) {
    test(`${code}: course payload, readiness, plan and coach context ${blueprint ? "keep" : "drop"} the weights`, async () => {
      const id = await trackId(code);
      const res = await courseGet(new Request("http://t/x", { headers: auth }), { params: Promise.resolve({ id }) });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { units: { id: string; weight: number | string | null }[] };
      assert.ok(body.units.length >= 2);
      assert.equal(body.units.some((u) => u.weight != null), blueprint);

      const r = await courseReadiness(id, user);
      assert.equal(r.blueprintWeighted, blueprint);

      const plan = await loadPlanInput(user, id, "2026-11-10", { examDate: null, weeklyHours: 5, saved: false });
      assert.equal(plan.units.some((u) => u.weight != null), blueprint);

      const ctx = await coachContextForUnit(body.units[0].id);
      assert.equal(ctx?.unitWeight != null, blueprint);
    });
  }
});
