// REQ-327 (Nick, 2026-11-17): the per-sim 18+ gate against a real Postgres
// with every migration applied (087 included). A sim document marked
// `mature: true` in a course OUTSIDE the mental health category (an emergency
// nursing course here) is refused without the learner's 18+ acknowledgment of
// that course's sims (scope "sims"): 403 mature_content_required, the course
// gate's shape plus scope and simId. Same attestation, same date of birth asked
// once (a stored one is reused), under 18 locked, under 16 one owner mail with
// no date. A build without `features=mature` is told to update and never gets
// the brief. The rest of the course, and the mental health course gate, are
// unchanged. No model is called.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query, queryOne, closePool, withTransaction } from "./db";
import { ownerClient, closeOwner } from "./test-owner";
import { signAccessToken } from "./auth/tokens";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { buildAccountExport } from "./account-export";
import { checkSchema, SCHEMA_PROBES } from "./schema-status";
import { __setEmailTransportForTest, type EmailPayload } from "./email";
import { ALL_DOCUMENTS, loadDocument } from "./sim/documents.ts";
import { clientDocument, clientHash, contentHash } from "./sim/content-hash.ts";
import type { ScenarioDoc } from "./sim/engine/v1/index.ts";
import { MATURE_CONTENT_NOTICE_VERSION, MATURE_SIM_REQUIRED_MESSAGE } from "./mature-content";
import { MATURE_UPDATE_BRIEF } from "./sims";
import { GET as listGet } from "../app/api/sims/route";
import { GET as simGet } from "../app/api/sims/[id]/route";
import { POST as runsPost } from "../app/api/sims/[id]/runs/route";
import { POST as commandsPost } from "../app/api/sims/runs/[runId]/commands/route";
import { POST as finishPost } from "../app/api/sims/runs/[runId]/finish/route";
import { GET as stateGet } from "../app/api/mature-content/route";
import { POST as acceptPost } from "../app/api/mature-content/accept/route";
import { GET as courseGet } from "../app/api/courses/[id]/route";

const run = Date.now().toString(36);
const users: string[] = [];
const ER = randomUUID(); // an emergency nursing course (not mental health)
const PLAIN = randomUUID(); // a course with no 18+ sim
const MH = randomUUID(); // a mental health course (counseling licensure)
const IT = randomUUID(); // a non-clinical course (IT): the gate does not depend on the profession
let IT_MATURE = ""; // an 18+ sim with safety family 'general' (no study notice involved)
const sims: string[] = [];
let MATURE = ""; // the 18+ sim in ER
let ORDINARY = ""; // an ordinary sim in ER
let MH_MATURE = ""; // an 18+ sim in the mental health course
let MH_PLAIN = ""; // an ordinary sim in the mental health course

const CAPS = "protocol=1;engine=1.2;renderers=bedside@3,board@3;features=mature";
const OLD_CAPS = "protocol=1;engine=1.2;renderers=bedside@3,board@3"; // a build before REQ-327

const entry = (slug: string) => ALL_DOCUMENTS.find((e) => e.slug === slug)!;
const BASE = loadDocument(entry("tamponade-after-cabg"));
const BOARD = loadDocument(entry("ticketburst-launch-day"));
const doc = (slug: string, mature: boolean, base: ScenarioDoc = BASE): ScenarioDoc => ({ ...base, slug, ...(mature ? { mature: true } : {}) });

async function insertSim(objectiveId: string, d: ScenarioDoc, family: "clinical" | "general" = "clinical"): Promise<string> {
  const sim = await queryOne<{ id: string }>(
    `insert into sims (objective_id, slug, safety_family, screen_type, title) values ($1, $2, $5, $3, $4) returning id`,
    [objectiveId, d.slug, d.screen.type, `${d.title} ${d.slug}`, family]
  );
  const v = await queryOne<{ id: string }>(
    `insert into sim_versions (sim_id, version, schema_version, engine_major, engine_minor, renderer_level, document, client_document, content_hash, client_hash)
     values ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
    [sim!.id, d.schemaVersion, d.engine.major, d.engine.minor, d.screen.level ?? 1, JSON.stringify(d), JSON.stringify(clientDocument(d)), contentHash(d), clientHash(d)]
  );
  await query(`update sims set head_version_id = $2 where id = $1`, [sim!.id, v!.id]);
  sims.push(sim!.id);
  return sim!.id;
}

async function newUser(studyNotice = true): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `msim-${run}-${users.length}@example.test`]);
  if (studyNotice) await recordStudyNoticeAcceptance(u);
  return u;
}
const auth = (u: string) => `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`;
const req = (u: string, url: string, method = "GET", body?: unknown, caps: string | null = CAPS) =>
  new Request(`http://t${url}`, {
    method,
    headers: { authorization: auth(u), "content-type": "application/json", ...(caps ? { "x-sim-caps": caps } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
async function json(res: Response): Promise<{ status: number; body: Record<string, any> }> {
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const runCtx = (runId: string) => ({ params: Promise.resolve({ runId }) });
const list = (u: string, trackId: string, caps: string | null = CAPS) => listGet(req(u, `/api/sims?trackId=${trackId}`, "GET", undefined, caps)).then(json);
const view = (u: string, sim: string, caps: string | null = CAPS) => simGet(req(u, `/api/sims/${sim}`, "GET", undefined, caps), idCtx(sim)).then(json);
const start = (u: string, sim: string, caps: string | null = CAPS, body: Record<string, unknown> = {}) =>
  runsPost(req(u, `/api/sims/${sim}/runs`, "POST", body, caps), idCtx(sim)).then(json);
const accept = (u: string, trackId: string, extra: Record<string, unknown> = {}) =>
  acceptPost(req(u, "/api/mature-content/accept", "POST", { trackId, version: MATURE_CONTENT_NOTICE_VERSION, attested: true, source: "course", scope: "sims", ...extra })).then(json);

function dobAged(years: number, extraDays = 100): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() - extraDays);
  return d.toISOString().slice(0, 10);
}
const ADULT = dobAged(30);

function assertSimRefusal(r: { status: number; body: Record<string, any> }, simId: string, trackId = ER) {
  assert.equal(r.status, 403, JSON.stringify(r.body));
  assert.equal(r.body.code, "mature_content_required");
  assert.equal(r.body.scope, "sims");
  assert.equal(r.body.trackId, trackId);
  assert.equal(r.body.simId, simId);
  assert.equal(r.body.noticeVersion, MATURE_CONTENT_NOTICE_VERSION);
  assert.equal(r.body.minAge, 18);
  assert.equal(r.body.error, MATURE_SIM_REQUIRED_MESSAGE);
  assert.equal(JSON.stringify(r.body).includes(BASE.brief.situation.slice(0, 40)), false, "no content in the refusal");
}

let sent: EmailPayload[] = [];
const savedOwners = process.env.OWNER_EMAILS;

before(async () => {
  const counseling = await queryOne<{ id: string }>(
    `select s.id from education_subcategories s join education_categories c on c.id = s.category_id
      where c.slug = 'mental-health' and s.slug = 'counseling-licensure'`
  );
  assert.ok(counseling, "migration 077 must be applied");
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, requires_acknowledgement, subcategory_id)
     values ($1, $2, 'ER nursing', 'certification', null, false, null),
            ($3, $4, 'Plain course', 'certification', null, false, null),
            ($5, $6, 'Counseling course', 'certification', null, false, $7),
            ($8, $9, 'IT course', 'certification', null, false, null)`,
    [ER, `MSA-${run}`, PLAIN, `MSB-${run}`, MH, `MSC-${run}`, counseling!.id, IT, `MSD-${run}`]
  );
  const objs: Record<string, string> = {};
  for (const [track, key] of [[ER, "er"], [PLAIN, "plain"], [MH, "mh"], [IT, "it"]] as const) {
    const unit = await queryOne<{ id: string }>(`insert into course_units (track_id, title, sort_order) values ($1, 'Unit', 0) returning id`, [track]);
    const o = await queryOne<{ id: string }>(`insert into objectives (unit_id, title, sort_order) values ($1, 'Objective', 0) returning id`, [unit!.id]);
    objs[key] = o!.id;
  }
  MATURE = await insertSim(objs.er, doc(`msim-mature-${run}`, true));
  ORDINARY = await insertSim(objs.er, doc(`msim-plain-${run}`, false));
  await insertSim(objs.plain, doc(`msim-plaincourse-${run}`, false));
  MH_MATURE = await insertSim(objs.mh, doc(`msim-mh-mature-${run}`, true));
  MH_PLAIN = await insertSim(objs.mh, doc(`msim-mh-plain-${run}`, false));
  IT_MATURE = await insertSim(objs.it, doc(`msim-it-mature-${run}`, true, BOARD), "general");
  __setEmailTransportForTest(async (payload) => {
    sent.push(payload);
    return { error: null };
  });
  process.env.OWNER_EMAILS = `owner-${run}@example.test`;
});

beforeEach(() => {
  process.env.SIMS_ENABLED = "on";
  delete process.env.SIMS_RENDERERS;
  delete process.env.SIMS_SERVE_UNREVIEWED;
  delete process.env.BILLING_ENABLED;
});

afterEach(() => {
  sent = [];
});

after(async () => {
  __setEmailTransportForTest(null);
  if (savedOwners === undefined) delete process.env.OWNER_EMAILS;
  else process.env.OWNER_EMAILS = savedOwners;
  delete process.env.SIMS_ENABLED;
  if (users.length) await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from sims where id = any($1::uuid[])`, [sims]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[ER, PLAIN, MH, IT]]);
  await closePool();
  await closeOwner();
});

describe("REQ-327: the per-sim 18+ gate", () => {
  test("schema-status probes migration 087, and 087 replays cleanly (idempotent)", async () => {
    const probes = SCHEMA_PROBES.filter((p) => p.migration === "087_mature_sim_acknowledgements.sql");
    assert.equal(probes.length, 1);
    assert.deepEqual((await checkSchema((sql) => query<{ ok: boolean }>(sql), probes)).missing, []);
    const owner = await ownerClient();
    try {
      const sql = readFileSync(join(import.meta.dirname, "../supabase/migrations/087_mature_sim_acknowledgements.sql"), "utf8");
      await owner.query("begin");
      await owner.query(sql);
      await owner.query("commit");
      // 081 replayed after 087 keeps working (its guards), and 087's column survives.
      const s081 = readFileSync(join(import.meta.dirname, "../supabase/migrations/081_mature_course_acknowledgements.sql"), "utf8");
      await owner.query("begin");
      await owner.query(s081);
      await owner.query("commit");
      assert.deepEqual((await checkSchema((sql2) => query<{ ok: boolean }>(sql2), probes)).missing, []);
      const bad = await owner.query(`select 1 from pg_constraint where conname = 'mature_course_acknowledgements_scope_087' and convalidated`);
      assert.equal(bad.rowCount, 1, "the check is validated");
    } finally {
      owner.release();
    }
  });

  test("no acknowledgment: the list names the 18+ sim; opening or starting it is a 403 that asks; the ordinary sim beside it runs", async () => {
    const u = await newUser();
    const l = await list(u, ER);
    assert.equal(l.status, 200);
    const byId = Object.fromEntries(l.body.sims.map((s: any) => [s.id, s]));
    assert.equal(byId[MATURE].mature, true);
    assert.equal(byId[MATURE].runnable, true);
    assert.match(byId[MATURE].title, /msim-mature/);
    assert.equal(byId[ORDINARY].mature, false);
    assertSimRefusal(await view(u, MATURE), MATURE);
    assertSimRefusal(await start(u, MATURE), MATURE);
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from sim_runs where user_id = $1`, [u]))!.n, 0, "no run created");
    const ok = await start(u, ORDINARY);
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const st = await json(await stateGet(req(u, "/api/mature-content")));
    assert.deepEqual(st.body.acknowledgedSimTrackIds, []);
  });

  test("an older build (no features=mature, or no header) is told to update and never gets the brief", async () => {
    const u = await newUser();
    for (const caps of [OLD_CAPS, null]) {
      const l = await list(u, ER, caps);
      const item = l.body.sims.find((s: any) => s.id === MATURE);
      assert.equal(item.runnable, false, String(caps));
      const v = await view(u, MATURE, caps);
      assert.equal(v.status, 200);
      assert.deepEqual(v.body.sim.brief, { situation: MATURE_UPDATE_BRIEF });
      assert.equal(v.body.sim.runnable, false);
      assert.equal(v.body.sim.clientHash, null);
      const s = await start(u, MATURE, caps);
      assert.equal(s.status, 409);
      assert.equal(s.body.code, "app_update_required");
    }
    // Even acknowledged, the older build still cannot open it.
    await accept(u, ER, { dateOfBirth: ADULT });
    assert.equal((await start(u, MATURE, OLD_CAPS)).body.code, "app_update_required");
  });

  test("an adult's acknowledgment with the date of birth unlocks the course's 18+ sims; a second account with a date on file is not asked for it again", async () => {
    const u = await newUser();
    const noDob = await accept(u, ER);
    assert.equal(noDob.status, 400);
    assert.equal(noDob.body.code, "date_of_birth_required");
    const noAttest = await accept(u, ER, { dateOfBirth: ADULT, attested: false });
    assert.equal(noAttest.body.code, "attestation_required");
    const ok = await accept(u, ER, { dateOfBirth: ADULT });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.deepEqual(ok.body.acknowledgedSimTrackIds, [ER]);
    assert.deepEqual(ok.body.acknowledgedTrackIds, [], "not a course acknowledgment");
    const row = await queryOne<{ scope: string; source: string; min_age: number }>(`select scope, source, min_age from mature_course_acknowledgements where user_id = $1`, [u]);
    assert.deepEqual(row, { scope: "sims", source: "course", min_age: 18 });
    const v = await view(u, MATURE);
    assert.equal(v.status, 200);
    assert.equal(v.body.sim.mature, true);
    assert.equal(v.body.sim.brief.situation, BASE.brief.situation);
    const s = await start(u, MATURE);
    assert.equal(s.status, 200, JSON.stringify(s.body));
    // Resume and the run routes are open too.
    const again = await start(u, MATURE);
    assert.equal(again.status, 200);
    const sync = await json(await commandsPost(req(u, `/api/sims/runs/${s.body.run.id}/commands`, "POST", { leaseEpoch: again.body.run.leaseEpoch, commands: [] }), runCtx(s.body.run.id)));
    assert.equal(sync.status, 200, JSON.stringify(sync.body));

    // A date of birth already on file (given for a mental health course) is reused.
    const w = await newUser();
    await query(`update app_users set date_of_birth = $2::date, date_of_birth_entered_at = now() where id = $1`, [w, ADULT]);
    const reuse = await accept(w, ER);
    assert.equal(reuse.status, 200, JSON.stringify(reuse.body));
    const sent2 = await accept(w, ER, { dateOfBirth: dobAged(12) });
    assert.equal(sent2.status, 200, "a date sent alongside one on file is ignored");
    assert.equal((await queryOne<{ dob: string }>(`select date_of_birth::text as dob from app_users where id = $1`, [w]))!.dob, ADULT);
  });

  test("under 18: locked, nothing recorded, and no owner mail at 17", async () => {
    const u = await newUser();
    const r = await accept(u, ER, { dateOfBirth: dobAged(17) });
    assert.equal(r.status, 403);
    assert.equal(r.body.code, "mature_content_underage");
    assert.match(r.body.error, /This simulation is for learners who are 18 or older/);
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from mature_course_acknowledgements where user_id = $1`, [u]))!.n, 0);
    assertSimRefusal(await start(u, MATURE), MATURE);
    const st = await json(await stateGet(req(u, "/api/mature-content")));
    assert.equal(st.body.ageStatus, "under_18");
    assert.equal(sent.length, 0);
    // The ordinary sim of the same course stays open.
    assert.equal((await start(u, ORDINARY)).status, 200);
  });

  test("under 16: locked, and one owner mail with no date of birth; asking again sends no second mail", async () => {
    const u = await newUser();
    const dob = dobAged(14);
    const r = await accept(u, ER, { dateOfBirth: dob });
    assert.equal(r.body.code, "mature_content_underage");
    assert.equal(sent.length, 1);
    assert.equal(JSON.stringify(sent[0]).includes(dob), false, "no date in the mail");
    await accept(u, ER);
    assert.equal(sent.length, 1, "once per account");
  });

  test("the sims scope is refused for a mental health course, a course with no 18+ sim, and an unknown scope", async () => {
    const u = await newUser();
    const mh = await accept(u, MH, { dateOfBirth: ADULT });
    assert.equal(mh.status, 400);
    assert.match(mh.body.error, /mental health course/);
    assert.equal((await accept(u, PLAIN, { dateOfBirth: ADULT })).status, 400);
    assert.equal((await accept(u, ER, { dateOfBirth: ADULT, scope: "sim" })).status, 400);
    assert.equal((await accept(u, randomUUID(), { dateOfBirth: ADULT })).status, 404);
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from mature_course_acknowledgements where user_id = $1`, [u]))!.n, 0);
  });

  test("existing counseling-course gates are unchanged: the course gate answers first, and a course acknowledgment covers its 18+ sims", async () => {
    const u = await newUser();
    for (const sim of [MH_PLAIN, MH_MATURE]) {
      const r = await start(u, sim);
      assert.equal(r.status, 403);
      assert.equal(r.body.code, "mature_content_required");
      assert.equal(r.body.category, "mental-health");
      assert.equal(r.body.trackId, MH);
      assert.equal("scope" in r.body, false, "the course refusal, not the sims one");
    }
    assert.equal((await json(await courseGet(req(u, `/api/courses/${MH}`), idCtx(MH)))).status, 403);
    // FAIL-2430: the detail route (the brief) is behind the course gate too.
    for (const sim of [MH_PLAIN, MH_MATURE]) {
      const v = await view(u, sim);
      assert.equal(v.status, 403);
      assert.equal(v.body.code, "mature_content_required");
      assert.equal(v.body.trackId, MH);
      assert.equal("scope" in v.body, false);
      assert.equal(JSON.stringify(v.body).includes(BASE.brief.situation.slice(0, 40)), false);
    }
    const ack = await json(await acceptPost(req(u, "/api/mature-content/accept", "POST", { trackId: MH, version: MATURE_CONTENT_NOTICE_VERSION, attested: true, dateOfBirth: ADULT })));
    assert.equal(ack.status, 200, JSON.stringify(ack.body));
    assert.deepEqual(ack.body.acknowledgedTrackIds, [MH]);
    assert.equal((await start(u, MH_PLAIN)).status, 200);
    assert.equal((await start(u, MH_MATURE)).status, 200, "the course acknowledgment covers its sims");
    assert.equal((await view(u, MH_PLAIN)).status, 200);
    assert.equal((await json(await courseGet(req(u, `/api/courses/${MH}`), idCtx(MH)))).status, 200);
  });

  test("a sims acknowledgment never opens a mental health course; one for a course that becomes mental health is widened by the course acknowledgment", async () => {
    const u = await newUser();
    await query(`update app_users set date_of_birth = $2::date, date_of_birth_entered_at = now() where id = $1`, [u, ADULT]);
    await query(
      `insert into mature_course_acknowledgements (user_id, track_id, notice_version, min_age, source, scope) values ($1, $2, $3, 18, 'course', 'sims')`,
      [u, MH, MATURE_CONTENT_NOTICE_VERSION]
    );
    assert.equal((await json(await courseGet(req(u, `/api/courses/${MH}`), idCtx(MH)))).status, 403, "the course gate reads course rows only");
    const ack = await json(await acceptPost(req(u, "/api/mature-content/accept", "POST", { trackId: MH, version: MATURE_CONTENT_NOTICE_VERSION, attested: true })));
    assert.equal(ack.status, 200, JSON.stringify(ack.body));
    const rows = await query<{ scope: string }>(`select scope from mature_course_acknowledgements where user_id = $1`, [u]);
    assert.deepEqual(rows.map((r) => r.scope), ["course"]);
    assert.equal((await json(await courseGet(req(u, `/api/courses/${MH}`), idCtx(MH)))).status, 200);
  });

  test("a run begun before the sim was marked 18+ stops at the gate; an older build is told to update on the run routes", async () => {
    const u = await newUser();
    const objective = (await queryOne<{ objective_id: string }>(`select objective_id from sims where id = $1`, [ORDINARY]))!.objective_id;
    const later = await insertSim(objective, doc(`msim-later-${run}`, false));
    const s = await start(u, later);
    assert.equal(s.status, 200);
    // The author marks it: a new version with the flag; the open run stays pinned to version 1.
    const d = doc(`msim-later-${run}`, true);
    const v2 = await queryOne<{ id: string }>(
      `insert into sim_versions (sim_id, version, schema_version, engine_major, engine_minor, renderer_level, document, client_document, content_hash, client_hash)
       values ($1, 2, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [later, d.schemaVersion, d.engine.major, d.engine.minor, d.screen.level ?? 1, JSON.stringify(d), JSON.stringify(clientDocument(d)), contentHash(d), clientHash(d)]
    );
    await query(`update sims set head_version_id = $2 where id = $1`, [later, v2!.id]);
    const runId = s.body.run.id;
    const sync = await json(await commandsPost(req(u, `/api/sims/runs/${runId}/commands`, "POST", { leaseEpoch: s.body.run.leaseEpoch, commands: [] }), runCtx(runId)));
    assertSimRefusal(sync, later);
    const old = await json(await commandsPost(req(u, `/api/sims/runs/${runId}/commands`, "POST", { leaseEpoch: s.body.run.leaseEpoch, commands: [] }, OLD_CAPS), runCtx(runId)));
    assert.equal(old.status, 409);
    assert.equal(old.body.code, "app_update_required");
    const fin = await json(await finishPost(req(u, `/api/sims/runs/${runId}/finish`, "POST", { leaseEpoch: s.body.run.leaseEpoch, tick: 0 }, OLD_CAPS), runCtx(runId)));
    assert.equal(fin.body.code, "app_update_required");
    assertSimRefusal(await start(u, later), later);
  });

  test("any course, any profession: an 18+ sim in a non-clinical course (general family, no study notice) is gated the same way", async () => {
    const u = await newUser(false);
    const l = await list(u, IT);
    assert.equal(l.body.sims[0].mature, true);
    assertSimRefusal(await view(u, IT_MATURE), IT_MATURE, IT);
    assertSimRefusal(await start(u, IT_MATURE), IT_MATURE, IT);
    assert.equal((await start(u, IT_MATURE, OLD_CAPS)).body.code, "app_update_required");
    const ok = await accept(u, IT, { dateOfBirth: ADULT });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const s = await start(u, IT_MATURE);
    assert.equal(s.status, 200, JSON.stringify(s.body));
    const kid = await newUser(false);
    assert.equal((await accept(kid, IT, { dateOfBirth: dobAged(15) })).body.code, "mature_content_underage");
    assert.equal(sent.length, 1, "under 16 in a non-clinical course alerts the owners too");
    assertSimRefusal(await start(kid, IT_MATURE), IT_MATURE, IT);
  });

  test("the account export shows the scope; deleting the account deletes the rows", async () => {
    const u = await newUser();
    await accept(u, ER, { dateOfBirth: ADULT });
    const out = (await withTransaction((tx) => buildAccountExport(u, (sql, p) => tx.query(sql, p)), { readOnlySnapshot: true })) as Record<string, any[]>;
    assert.equal(out.matureCourseAcknowledgements.length, 1);
    assert.equal(out.matureCourseAcknowledgements[0].scope, "sims");
    assert.equal(out.matureCourseAcknowledgements[0].track_id, ER);
    await query(`delete from app_users where id = $1`, [u]);
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from mature_course_acknowledgements where user_id = $1`, [u]))!.n, 0);
  });
});
