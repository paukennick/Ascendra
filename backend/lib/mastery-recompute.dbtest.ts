// REQ-097: migration 029 (schema, the rule) and 029b (backup, backfill,
// recompute) back up mastery and review state, then recompute mastery from
// attempt history under the new rules. These run the migration files
// themselves (again -- CI already applied them to the empty database) over a
// fixture written the way the old code left it, then run them a third time to
// prove a re-run changes nothing and never overwrites the backup.
//
// REQ-100 (FAIL-076): re-running these files puts 029's mastery_from_attempts
// back. Committed, that silently replaced the live 031 rule for every test
// running alongside and for the rest of the run, and 029b's recompute rewrote
// every learner's mastery with it. The whole file runs on one connection
// inside one transaction that is rolled back at the end, so neither the 029
// rule nor its recompute is ever visible outside it. test:db also runs files
// one at a time (--test-concurrency=1): while this transaction is open it
// holds row locks on every mastery row 029b rewrote.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client, type QueryResultRow } from "pg";
import { sslOption } from "./db";

const MIGRATIONS = join(__dirname, "../supabase/migrations");
const SCHEMA_SQL = readFileSync(join(MIGRATIONS, "029_mastery_recompute.sql"), "utf8");
const BACKFILL_SQL = readFileSync(join(MIGRATIONS, "029b_mastery_backfill.sql"), "utf8");
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: sslOption() });
async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await client.query<T>(text, params)).rows;
}
async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}
// The runner applies 029 then 029b, each in its own transaction and later
// than anything before it. Here both run inside this file's one transaction,
// where now() never moves, so "later" is modelled: after each run this
// learner's mastery and backup timestamps are moved back a minute, as if the
// migration had committed a minute ago. Without that, every write in the file
// would carry the backup's own timestamp and the restore's "untouched since
// the backup" test (updated_at <= backed_up_at) could not tell them apart.
async function migrate(...users: string[]) {
  await query(SCHEMA_SQL);
  await query(BACKFILL_SQL);
  const who = users.length ? users : [user];
  await query(`update mastery set updated_at = updated_at - interval '1 minute' where user_id = any($1::uuid[]) and updated_at = now()`, [who]);
  await query(
    `update mastery_backup_029 set backed_up_at = backed_up_at - interval '1 minute',
            updated_at = case when created_by_029 then updated_at - interval '1 minute' else updated_at end
      where user_id = any($1::uuid[]) and backed_up_at = now()`,
    [who]
  );
}
const run = Date.now().toString(36);
const user = randomUUID();
const track = randomUUID();
const unit = randomUUID();
const scenario = randomUUID();
// oneSitting: Guided + Solo correct minutes apart -> old code said Transfer-ready.
// repeat:     Solo missed, then the same Solo item typed back correctly -> old code said Independent.
// spaced:     two different Solo items answered correctly two days apart -> stays Transfer-ready.
// mcOnly:     Solo answered as multiple choice -> Guided before and after.
// selfSet:    Transfer-ready set by the old PUT override, no attempts -> Not started (FAIL-111).
// pbqOnly:    a level whose only attempt on the objective was a PBQ -> Not started (PBQ isn't evidence).
// noRow:      a graded attempt but no mastery row -> the recompute creates one.
const o = {
  oneSitting: randomUUID(),
  repeat: randomUUID(),
  spaced: randomUUID(),
  mcOnly: randomUUID(),
  selfSet: randomUUID(),
  pbqOnly: randomUUID(),
  noRow: randomUUID(),
};

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
  await client.connect();
  await client.query("begin");
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

  await setOld(o.selfSet, "Transfer-ready", 4);

  await query(
    `insert into attempts (user_id, unit_id, objective_id, kind, format, question, answer, verdict)
     values ($1, $2, $3, 'pbq', 'pbq', 'S', 'a', 'correct')`,
    [user, unit, o.pbqOnly]
  );
  await setOld(o.pbqOnly, "Independent", 3);

  await attempt(o.noRow, "solo", "open", "solo q", "correct", "2 hours");

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

// Rolls back the fixture, every 029/029b re-run and the restore together.
after(async () => {
  await client.query("rollback");
  await client.end();
});

describe("029 recompute", () => {
  test("backs up the old state first, then recomputes under the new rules", async () => {
    await migrate();

    const backup = await query<{ objective_id: string; status: string; evidence: string }>(
      `select objective_id, status, evidence from mastery_backup_029 where user_id = $1 and not created_by_029`,
      [user]
    );
    assert.equal(backup.length, 6, "every mastery row is backed up");
    const created = await query<{ objective_id: string }>(
      `select objective_id from mastery_backup_029 where user_id = $1 and created_by_029`,
      [user]
    );
    assert.deepEqual(created.map((c) => c.objective_id), [o.noRow], "the row the recompute created is marked");
    const backedUp = Object.fromEntries(backup.map((b) => [b.objective_id, b.status]));
    assert.equal(backedUp[o.oneSitting], "Transfer-ready", "backup holds the pre-recompute value");
    assert.equal(backedUp[o.repeat], "Independent");
    assert.ok(backup.every((b) => b.evidence === "old rule"));
    assert.ok(await queryOne(`select 1 from error_log_backup_029 where user_id = $1`, [user]), "review state is backed up");

    assert.equal(await status(o.oneSitting), "Independent", "one sitting no longer reaches Transfer-ready");
    assert.equal(await status(o.repeat), "Guided", "a resubmitted item is assisted");
    assert.equal(await status(o.spaced), "Transfer-ready", "genuinely spaced evidence keeps its level");
    assert.equal(await status(o.mcOnly), "Guided");
    assert.equal(await status(o.selfSet), "Not started", "a self-set level with no evidence is dropped");
    assert.equal(await status(o.pbqOnly), "Not started", "PBQ answers are not objective evidence");
    assert.equal(await status(o.noRow), "Independent", "a missing row is created from its attempts");

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
    await migrate();
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

  // FAIL-114: the restore used to put every backed-up row back, rewinding
  // progress made after the backup. Now it only restores rows untouched since,
  // and removes the rows the recompute created.
  test("the documented restore puts untouched levels back and leaves later progress alone", async () => {
    const header = BACKFILL_SQL.split("\n").filter((l) => l.startsWith("--   ")).map((l) => l.slice(5));
    const block = header.slice(header.indexOf("begin;"), header.indexOf("commit;") + 1);
    assert.equal(block[0], "begin;");
    assert.equal(block[block.length - 1], "commit;");
    // Run the body only: its own commit would end this file's transaction and
    // commit everything after it, the 029 rule included.
    const restore = block.slice(1, -1).join("\n");
    assert.match(restore, /update mastery m/);
    // Real progress after the backup: a graded answer rewrote this row.
    await query(
      `update mastery set status = 'Guided', score_0_4 = 2, evidence = 'graded after 029', updated_at = now()
        where user_id = $1 and objective_id = $2`,
      [user, o.spaced]
    );
    await query(restore);
    assert.equal(await status(o.oneSitting), "Transfer-ready");
    assert.equal(await status(o.selfSet), "Transfer-ready");
    assert.equal(await status(o.pbqOnly), "Independent");
    assert.equal(await status(o.spaced), "Guided", "progress after the backup is kept");
    // The previous test's recompute_mastery() call changed this row after the backup too.
    assert.equal(await status(o.repeat), "Guided");
    assert.equal(await status(o.noRow), undefined, "the row the recompute created is gone, as before 029");
    // Re-running after a restore recomputes again, and the backup still holds
    // the original pre-029 values.
    await migrate();
    assert.equal(await status(o.oneSitting), "Independent");
    const b = await queryOne<{ status: string }>(`select status from mastery_backup_029 where user_id = $1 and objective_id = $2`, [
      user,
      o.oneSitting,
    ]);
    assert.equal(b?.status, "Transfer-ready");
  });

  // FAIL-115: the backup tables had no link to app_users, so a deleted
  // account's mastery and review history stayed behind in them.
  test("deleting the account removes its backup rows", async () => {
    const gone = randomUUID();
    await query(`insert into app_users (id, email) values ($1, $2)`, [gone, `rc-gone-${run}@example.test`]);
    await query(`insert into mastery (user_id, objective_id, status, score_0_4) values ($1, $2, 'Guided', 2)`, [gone, o.spaced]);
    await query(
      `insert into error_log (user_id, unit_id, objective_id, topic, error_text, review_stage, next_review_at)
       values ($1, $2, $3, 't', 'e', 0, current_date)`,
      [gone, unit, o.spaced]
    );
    await migrate(gone);
    const count = async () =>
      (await queryOne<{ n: number }>(
        `select (select count(*) from mastery_backup_029 where user_id = $1)
              + (select count(*) from error_log_backup_029 where user_id = $1) as n`,
        [gone]
      ))!.n;
    assert.equal(Number(await count()), 2);
    await query(`delete from app_users where id = $1`, [gone]); // what DELETE /api/account does
    assert.equal(Number(await count()), 0);
  });
});
