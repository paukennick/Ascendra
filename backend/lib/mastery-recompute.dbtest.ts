// REQ-097: migration 029 backs up mastery and review state, then recomputes
// mastery from attempt history under the new rules. These run the migration
// file itself (again -- CI already applied it to the empty database) over a
// fixture written the way the old code left it, then run it a third time to
// prove a re-run changes nothing and never overwrites the backup.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query, queryOne, closePool } from "./db";

const SQL = readFileSync(join(__dirname, "../supabase/migrations/029_mastery_recompute.sql"), "utf8");
const run = Date.now().toString(36);
const user = randomUUID();
const track = randomUUID();
const unit = randomUUID();
const scenario = randomUUID();
// oneSitting: Guided + Solo correct minutes apart -> old code said Transfer-ready.
// repeat:     Solo missed, then the same Solo item typed back correctly -> old code said Independent.
// spaced:     two different Solo items answered correctly two days apart -> stays Transfer-ready.
// mcOnly:     Solo answered as multiple choice -> Guided before and after.
const o = { oneSitting: randomUUID(), repeat: randomUUID(), spaced: randomUUID(), mcOnly: randomUUID() };

async function attempt(objectiveId: string | null, stage: string | null, format: string, question: string, verdict: string, ago: string) {
  const r = await queryOne<{ id: string }>(
    `insert into attempts (user_id, unit_id, objective_id, pbq_scenario_id, kind, stage, format, question, answer, verdict, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'a', $9, now() - $10::interval) returning id`,
    [user, unit, objectiveId, objectiveId ? null : scenario, objectiveId ? "lesson" : "pbq", stage, format, question, verdict, ago]
  );
  return r!.id;
}
async function setOld(objectiveId: string, status: string, score: number) {
  await query(
    `insert into mastery (user_id, objective_id, status, score_0_4, evidence) values ($1, $2, $3, $4, 'old rule')`,
    [user, objectiveId, status, score]
  );
}
const status = async (objectiveId: string) =>
  (await queryOne<{ status: string }>(`select status from mastery where user_id = $1 and objective_id = $2`, [user, objectiveId]))?.status;
const snapshot = async () => ({
  mastery: await query(`select objective_id, status, score_0_4, evidence, updated_at from mastery where user_id = $1 order by objective_id`, [user]),
  backup: await query(`select mastery_id, status, score_0_4, evidence, backed_up_at from mastery_backup_029 where user_id = $1 order by mastery_id`, [user]),
  attempts: await query(`select id, assisted, assist_reason from attempts where user_id = $1 order by id`, [user]),
  errors: await query(`select id, pbq_scenario_id from error_log where user_id = $1 order by id`, [user]),
});

before(async () => {
  await query(`insert into app_users (id, email) values ($1, $2)`, [user, `rc-${run}@example.test`]);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'RC', 'certification', $3)`, [
    track,
    `RC-${run}`,
    user,
  ]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 1)`, [unit, track]);
  for (const [i, id] of Object.values(o).entries()) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [id, unit, `O${i}`, i]);
  }
  await query(`insert into pbq_scenarios (id, unit_id, title, scenario, sub_parts, model) values ($1, $2, 'S', 's', '[]', 't')`, [
    scenario,
    unit,
  ]);

  await attempt(o.oneSitting, "fade", "open", "fade q", "correct", "10 minutes");
  await attempt(o.oneSitting, "solo", "open", "solo q", "correct", "5 minutes");
  await setOld(o.oneSitting, "Transfer-ready", 4);

  await attempt(o.repeat, "solo", "open", "solo q", "incorrect", "1 day");
  await attempt(o.repeat, "solo", "open", "solo q", "correct", "1 hour");
  await setOld(o.repeat, "Independent", 3);

  await attempt(o.spaced, "solo", "open", "solo q1", "correct", "3 days");
  await attempt(o.spaced, "solo", "open", "solo q2", "correct", "1 hour");
  await setOld(o.spaced, "Transfer-ready", 4);

  await attempt(o.mcOnly, "solo", "mc", "solo q", "correct", "1 hour");
  await setOld(o.mcOnly, "Guided", 2);

  // A missed PBQ's review entry from before 029: linked only through attempt_id.
  const pbqAttempt = await attempt(null, null, "pbq", "S", "partial", "2 days");
  await query(
    `insert into error_log (user_id, unit_id, attempt_id, topic, error_text, review_stage, next_review_at)
     values ($1, $2, $3, 'S', 'a', 0, current_date)`,
    [user, unit, pbqAttempt]
  );
  // The migration only adds rows not yet backed up; this fixture's rows are new.
  assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from mastery_backup_029 where user_id = $1`, [user]))!.n, 0);
});

after(async () => {
  await query(`delete from mastery_backup_029 where user_id = $1`, [user]);
  await query(`delete from error_log_backup_029 where user_id = $1`, [user]);
  await query(`delete from app_users where id = $1`, [user]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("029 recompute", () => {
  test("backs up the old state first, then recomputes under the new rules", async () => {
    await query(SQL);

    const backup = await query<{ objective_id: string; status: string; evidence: string }>(
      `select objective_id, status, evidence from mastery_backup_029 where user_id = $1`,
      [user]
    );
    assert.equal(backup.length, 4, "every mastery row is backed up");
    const backedUp = Object.fromEntries(backup.map((b) => [b.objective_id, b.status]));
    assert.equal(backedUp[o.oneSitting], "Transfer-ready", "backup holds the pre-recompute value");
    assert.equal(backedUp[o.repeat], "Independent");
    assert.ok(backup.every((b) => b.evidence === "old rule"));
    assert.ok(await queryOne(`select 1 from error_log_backup_029 where user_id = $1`, [user]), "review state is backed up");

    assert.equal(await status(o.oneSitting), "Independent", "one sitting no longer reaches Transfer-ready");
    assert.equal(await status(o.repeat), "Guided", "a resubmitted item is assisted");
    assert.equal(await status(o.spaced), "Transfer-ready", "genuinely spaced evidence keeps its level");
    assert.equal(await status(o.mcOnly), "Guided");

    const repeatAttempt = await queryOne<{ assist_reason: string }>(
      `select assist_reason from attempts where user_id = $1 and objective_id = $2 and verdict = 'correct'`,
      [user, o.repeat]
    );
    assert.equal(repeatAttempt?.assist_reason, "repeat");
    const mc = await queryOne<{ assist_reason: string }>(`select assist_reason from attempts where user_id = $1 and objective_id = $2`, [
      user,
      o.mcOnly,
    ]);
    assert.equal(mc?.assist_reason, "hint");
    const err = await queryOne<{ pbq_scenario_id: string }>(`select pbq_scenario_id from error_log where user_id = $1`, [user]);
    assert.equal(err?.pbq_scenario_id, scenario, "PBQ review entry backfilled with its scenario");
  });

  test("is idempotent: a second run changes nothing and keeps the original backup", async () => {
    const first = await snapshot();
    await query(SQL);
    const second = await snapshot();
    assert.deepEqual(second, first);
  });

  // For a later rule change (B4): replace mastery_from_attempts, then call
  // recompute_mastery() again. It must reuse the same rule and never write the backup.
  test("recompute_mastery() can be called again on its own: same rule, no backup writes, 0 changes when current", async () => {
    const backupBefore = await query(`select * from mastery_backup_029 where user_id = $1 order by mastery_id`, [user]);
    await query(`update mastery set status = 'Transfer-ready', score_0_4 = 4 where user_id = $1 and objective_id = $2`, [user, o.repeat]);
    const changed = await queryOne<{ n: number }>(`select recompute_mastery($1) as n`, [user]);
    assert.equal(changed?.n, 1);
    assert.equal(await status(o.repeat), "Guided");
    assert.equal((await queryOne<{ n: number }>(`select recompute_mastery($1) as n`, [user]))?.n, 0);
    assert.deepEqual(await query(`select * from mastery_backup_029 where user_id = $1 order by mastery_id`, [user]), backupBefore);
  });

  test("the documented restore puts the old levels back", async () => {
    const header = SQL.split("\n").filter((l) => l.startsWith("--   ")).map((l) => l.slice(5));
    const restore = header.slice(header.indexOf("begin;"), header.indexOf("commit;") + 1).join("\n");
    assert.match(restore, /update mastery m/);
    await query(restore);
    assert.equal(await status(o.oneSitting), "Transfer-ready");
    assert.equal(await status(o.repeat), "Independent");
    // Re-running after a restore recomputes again, and the backup still holds
    // the original pre-029 values.
    await query(SQL);
    assert.equal(await status(o.oneSitting), "Independent");
    const b = await queryOne<{ status: string }>(`select status from mastery_backup_029 where user_id = $1 and objective_id = $2`, [
      user,
      o.oneSitting,
    ]);
    assert.equal(b?.status, "Transfer-ready");
  });
});
