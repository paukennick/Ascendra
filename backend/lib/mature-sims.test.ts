// REQ-327 (Nick, 2026-11-17): the per-sim 18+ gate, without a database.
// The capability a build sends (x-sim-caps features=mature), the SQL the gates
// use (the course gate reads course rows only; the sim gate reads course and
// sims rows; a sim is mature when any version says so), the 403 body's shape,
// and migration 087's guards. lib/mature-sims.dbtest.ts drives the routes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { matureCapable, parseCaps, MATURE_SIM_FEATURE } from "./sim/server-run.ts";
import {
  isMatureScope,
  matureContentNeededSql,
  matureContentRequiredBody,
  matureSimAckMissingSql,
  matureSimRequiredBody,
  matureSimSql,
  MATURE_CONTENT_NOTICE_VERSION,
  MATURE_CONTENT_REQUIRED_CODE,
} from "./mature-content";

test("a build that sends features=mature is capable; every older header is not", () => {
  assert.equal(MATURE_SIM_FEATURE, "mature");
  const now = parseCaps("protocol=1;engine=1.2;renderers=bedside@3;features=mature");
  assert.deepEqual(now?.features, ["mature"]);
  assert.equal(matureCapable(now), true);
  const older = parseCaps("protocol=1;engine=1.2;renderers=bedside@3");
  assert.equal(older?.features, undefined, "no features key: nothing added, so older shapes stay equal");
  assert.equal(matureCapable(older), false);
  assert.equal(matureCapable(null), false);
  assert.equal(matureCapable(undefined), false);
  assert.equal(matureCapable(parseCaps("protocol=1;engine=1.2;renderers=bedside@3;features=Mature,x y,mature-ish")), false, "exact, lowercase names only");
  assert.deepEqual(parseCaps("protocol=1;engine=1.2;renderers=bedside@3;features=other,mature")?.features, ["other", "mature"]);
});

test("the course gate counts only course acknowledgments; the sim gate counts course and sims ones", () => {
  const course = matureContentNeededSql("st", "$2");
  assert.match(course, /mca\.scope = 'course'/);
  assert.match(course, new RegExp(`notice_version = '${MATURE_CONTENT_NOTICE_VERSION}'`));
  const sims = matureSimAckMissingSql("$1::uuid", "$2::uuid");
  assert.match(sims, /^not exists/);
  assert.match(sims, /mca\.scope in \('course', 'sims'\)/);
  assert.match(sims, /mca\.track_id = \$1::uuid/);
  assert.match(sims, /mca\.user_id = \$2::uuid/);
});

test("a sim is mature when any of its versions' documents says mature: true", () => {
  const sql = matureSimSql("s");
  assert.match(sql, /from sim_versions msv where msv\.sim_id = s\.id/);
  assert.match(sql, /document @> '\{"mature": true\}'::jsonb/);
  assert.doesNotMatch(sql, /head_version_id|review_status/, "not only the head or an approved version");
});

test("the sim 403 has the course 403's fields plus scope and simId", () => {
  const c = matureContentRequiredBody("mental-health", "t1");
  const s = matureSimRequiredBody("t2", "s2", "healthcare-nursing");
  for (const k of Object.keys(c)) assert.ok(k in s, `sim body has ${k}`);
  assert.equal(s.code, MATURE_CONTENT_REQUIRED_CODE);
  assert.equal(s.scope, "sims");
  assert.equal(s.trackId, "t2");
  assert.equal(s.simId, "s2");
  assert.equal(s.minAge, 18);
  assert.equal(s.noticeVersion, MATURE_CONTENT_NOTICE_VERSION);
  assert.equal("scope" in c, false, "the course body is unchanged");
});

test("scopes are course and sims, as 087's check says", () => {
  assert.equal(isMatureScope("course"), true);
  assert.equal(isMatureScope("sims"), true);
  assert.equal(isMatureScope("sim"), false);
  assert.equal(isMatureScope(undefined), false);
  const sql = readFileSync(join(import.meta.dirname, "../supabase/migrations/087_mature_sim_acknowledgements.sql"), "utf8");
  assert.match(sql, /check \(scope in \('course', 'sims'\)\) not valid/);
  assert.match(sql, /add column if not exists scope varchar\(10\) not null default 'course'/);
  assert.match(sql, /if not exists \(select 1 from pg_constraint where conname = 'mature_course_acknowledgements_scope_087'\)/);
  assert.match(sql, /select app_runtime_sync\(\);\s*$/);
  const code = sql.split("\n").filter((l) => !l.trimStart().startsWith("--")).join("\n");
  assert.doesNotMatch(code, /primary key|_pkey/i, "the key the earlier backend's insert names is kept");
});
