// REQ-112: regressions for the silent conflicts found while merging every
// feature branch into integration/all (FAIL-230..236). No text conflict, but
// broken behaviour: each test failed on the merged tree before its fix.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { recordAttemptAndUpdateMastery } from "./grading-service";
import { planObjectives } from "./study-plan-store";
import { dueObjectives } from "./review-store";
import { unitCheckStatus } from "./unit-check";
import { weakSpotsFor } from "./learner-profile";
import { courseObjectives } from "./understanding-store";
import { utcDay } from "./review-scheduler";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const [live, retired] = [randomUUID(), randomUUID()];
const scenario = randomUUID();
const users: string[] = [];

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `imerge-${run}-${users.length}@example.test`]);
  return u;
}

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'IM', 'certification', null)`, [
    track,
    `IM-${run}`,
  ]);
  await query(`insert into course_units (id, track_id, title, sort_order, gate_description) values ($1, $2, 'IM unit', 1, 'gate')`, [
    unit,
    track,
  ]);
  await query(
    `insert into objectives (id, unit_id, title, sort_order, retired_at) values ($1, $3, 'IM live', 1, null), ($2, $3, 'IM retired', 2, now() - interval '1 day')`,
    [live, retired, unit]
  );
  await query(`insert into pbq_scenarios (id, unit_id, title, scenario, sub_parts, model) values ($1, $2, 'IM PBQ', 's', '["a"]', 't')`, [
    scenario,
    unit,
  ]);
});

after(async () => {
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("FAIL-231: every attempt kind goes through the assist rules", () => {
  const base = (u: string) => ({ userId: u, unitId: unit, answer: "a" });
  test("a PBQ revision is a retry", async () => {
    const u = await newUser();
    const miss = await recordAttemptAndUpdateMastery({
      ...base(u), pbqScenarioId: scenario, kind: "pbq", format: "pbq", question: "IM PBQ", verdict: "partial",
    });
    const rev = await recordAttemptAndUpdateMastery({
      ...base(u), pbqScenarioId: scenario, kind: "pbq", format: "pbq", question: "IM PBQ", verdict: "correct", retryOf: miss.id as string,
    });
    assert.equal(rev.assist_reason, "retry");
  });
  test("an exam question seen before is a repeat; a caller-known reason (review hint, explain-back reveal) is kept", async () => {
    const u = await newUser();
    const exam = () =>
      recordAttemptAndUpdateMastery({
        ...base(u), objectiveId: live, kind: "quiz", stage: "sprint", format: "mc", question: "IM exam q", verdict: "correct",
        assessmentType: "multiple_choice", repeatAnySetting: true,
      });
    assert.equal((await exam()).assist_reason, null);
    assert.equal((await exam()).assist_reason, "repeat");
    const review = await recordAttemptAndUpdateMastery({
      ...base(u), objectiveId: live, kind: "review", stage: "review", format: "open", question: `IM review ${randomUUID()}`,
      verdict: "correct", assessmentType: "free_response", assist: "hint",
    });
    assert.equal(review.assist_reason, "hint");
    const copied = await recordAttemptAndUpdateMastery({
      ...base(u), objectiveId: live, kind: "quiz", stage: "explain", format: "open", question: `IM explain ${randomUUID()}`,
      verdict: "correct", assessmentType: "explain_back", assist: "reveal",
    });
    assert.equal(copied.assist_reason, "reveal");
  });
});

describe("FAIL-200 class: retired objectives stay out of listings on the merged tree", () => {
  test("study plan, review due list, unit check counts, coach weak spots and the comparison-card outline skip a retired objective", async () => {
    const u = await newUser();
    for (const o of [live, retired]) {
      await query(`insert into mastery (user_id, objective_id, status, score_0_4, evidence) values ($1, $2, 'Guided', 2, 'e')`, [u, o]);
      await query(`insert into review_schedule (user_id, objective_id, due_on) values ($1, $2, current_date)
                   on conflict (user_id, objective_id) do update set due_on = current_date`, [u, o]);
    }
    assert.deepEqual((await planObjectives(u, track)).map((p) => p.id), [live]);
    assert.deepEqual((await dueObjectives(u, utcDay(new Date()), track)).map((d) => d.objectiveId), [live]);
    const uc = (await unitCheckStatus(u, unit))!;
    assert.equal(uc.total, 1, "a retired objective cannot block the unit check");
    assert.equal(uc.eligible, true);
    assert.ok(!(await weakSpotsFor(u, track)).some((w) => w.objectiveId === retired));
    assert.deepEqual((await courseObjectives(track)).map((o) => o.id), [live]);
  });
});
