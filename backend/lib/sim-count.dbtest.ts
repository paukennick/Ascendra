// REQ-249: GET /api/courses gives each course a sim_count, the sims a
// learner could start on it now, for the course cards' sims badge and
// Explore's "Has sims" filter. Against a real Postgres with every migration
// applied. Covers: the count, sims switched off (0, and no query), the
// renderer list, retired sims, rejected and pulled versions, unreviewed
// content switched off, another learner's private course, the 18+
// mature-content rule (REQ-224: the same as GET /api/sims?trackId=), and
// that the whole list costs one query.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { MATURE_CONTENT_NOTICE_VERSION } from "./mature-content";
import { ALL_DOCUMENTS, loadDocument } from "./sim/documents.ts";
import { clientDocument, clientHash, contentHash } from "./sim/content-hash.ts";
import type { ScenarioDoc } from "./sim/engine/v1/index.ts";
import { simCountsByTrack } from "./sim-count";
import { GET as coursesGet } from "../app/api/courses/route";
import { GET as simsGet } from "../app/api/sims/route";

const run = Date.now().toString(36);
const users: string[] = [];
const two = randomUUID(); // two served sims: a bedside and a board one
const none = randomUUID(); // no sims
const odd = randomUUID(); // one retired sim, one rejected-only, one pulled, one unreviewed
const priv = randomUUID(); // another learner's private course with a sim
const mh = randomUUID(); // a mental health course with a sim
const sims: string[] = [];

const entry = (slug: string) => ALL_DOCUMENTS.find((e) => e.slug === slug)!;
const TAMP_DOC = loadDocument(entry("tamponade-after-cabg")); // bedside
const TB_DOC = loadDocument(entry("ticketburst-launch-day")); // board

// ---- query counter: every statement any pool client sends ---------------
const proto = Client.prototype as unknown as { query: (...a: unknown[]) => unknown };
const origQuery = proto.query;
let counting = false;
let counted: string[] = [];
proto.query = function (this: unknown, ...args: unknown[]) {
  if (counting) {
    const a = args[0] as string | { text?: string };
    counted.push(typeof a === "string" ? a : a?.text ?? "");
  }
  return origQuery.apply(this, args);
};
async function countQueries<T>(fn: () => Promise<T>): Promise<{ result: T; n: number; sql: string[] }> {
  counted = [];
  counting = true;
  try {
    const result = await fn();
    return { result, n: counted.length, sql: counted };
  } finally {
    counting = false;
  }
}

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `simcount-${run}-${users.length}@example.test`]);
  return u;
}

async function course(id: string, code: string, owner: string | null = null, subcategoryId: string | null = null): Promise<string> {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id, subcategory_id) values ($1, $2, $3, 'certification', $4, $5)`, [
    id,
    `${code}-${run}`,
    `Sim count ${code}`,
    owner,
    subcategoryId,
  ]);
  const unit = await queryOne<{ id: string }>(`insert into course_units (track_id, title, sort_order) values ($1, 'U', 0) returning id`, [id]);
  const obj = await queryOne<{ id: string }>(`insert into objectives (unit_id, title, sort_order) values ($1, 'O', 0) returning id`, [unit!.id]);
  return obj!.id;
}

async function insertSim(objectiveId: string, doc: ScenarioDoc, slug: string, review: "needs_expert_review" | "approved" | "rejected" = "needs_expert_review"): Promise<{ sim: string; version: string }> {
  const sim = await queryOne<{ id: string }>(
    `insert into sims (objective_id, slug, safety_family, screen_type, title) values ($1, $2, 'general', $3, $4) returning id`,
    [objectiveId, `${slug}-${run}`, doc.screen.type, doc.title]
  );
  const v = await queryOne<{ id: string }>(
    `insert into sim_versions (sim_id, version, schema_version, engine_major, engine_minor, renderer_level, document, client_document, content_hash, client_hash, review_status)
     values ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
    [sim!.id, doc.schemaVersion, doc.engine.major, doc.engine.minor, doc.screen.level ?? 1, JSON.stringify(doc), JSON.stringify(clientDocument(doc)), contentHash(doc), clientHash(doc), review]
  );
  await query(`update sims set head_version_id = $2 where id = $1`, [sim!.id, v!.id]);
  sims.push(sim!.id);
  return { sim: sim!.id, version: v!.id };
}

const listCourses = async (u: string) => {
  const res = await coursesGet(
    new Request("http://t/api/courses", { headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` } })
  );
  const body = (await res.json()) as { tracks: { id: string; sim_count: number }[] };
  assert.equal(res.status, 200, JSON.stringify(body));
  return new Map(body.tracks.map((t) => [t.id, t.sim_count]));
};

let pulledVersion = "";

before(async () => {
  const owner = await newUser();
  const tObj = await course(two, "SCA");
  await insertSim(tObj, TAMP_DOC, "a-tamp");
  await insertSim(tObj, TB_DOC, "a-tb", "approved");
  await course(none, "SCB");
  const oObj = await course(odd, "SCC");
  const retired = await insertSim(oObj, TB_DOC, "c-retired");
  await query(`update sims set retired_at = now() where id = $1`, [retired.sim]);
  await insertSim(oObj, TB_DOC, "c-rejected", "rejected");
  const pulled = await insertSim(oObj, TB_DOC, "c-pulled", "approved");
  pulledVersion = pulled.version;
  await query(
    `insert into item_status (item_kind, item_id, objective_id, question, status, reason) values ('sim', $1, $2, 'pulled sim', 'quarantined', 'flags')`,
    [pulled.version, oObj]
  );
  await insertSim(oObj, TB_DOC, "c-unreviewed");
  const pObj = await course(priv, "SCD", owner);
  await insertSim(pObj, TB_DOC, "d-private");
  const sub = await queryOne<{ id: string }>(
    `select s.id from education_subcategories s join education_categories c on c.id = s.category_id
      where c.slug = 'mental-health' and s.slug = 'psychology-licensure'`
  );
  assert.ok(sub, "migration 077 must be applied");
  const mObj = await course(mh, "SCE", null, sub!.id);
  await insertSim(mObj, TB_DOC, "e-mh");
});

beforeEach(() => {
  process.env.SIMS_ENABLED = "on";
  delete process.env.SIMS_RENDERERS;
  delete process.env.SIMS_SERVE_UNREVIEWED;
});

after(async () => {
  delete process.env.SIMS_ENABLED;
  proto.query = origQuery;
  await query(`delete from item_status where item_kind = 'sim' and item_id = $1`, [pulledVersion]);
  await query(`delete from sims where id = any($1::uuid[])`, [sims]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[two, none, odd, priv, mh]]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
});

describe("GET /api/courses sim_count (REQ-249)", () => {
  test("counts the sims a learner could start on each course; none is 0", async () => {
    const u = await newUser();
    const counts = await listCourses(u);
    assert.equal(counts.get(two), 2);
    assert.equal(counts.get(none), 0);
    // Retired, rejected-only and pulled sims are not served; the unreviewed head is (the default).
    assert.equal(counts.get(odd), 1);
    for (const v of counts.values()) assert.equal(typeof v, "number", "every course carries a number");
  });

  test("SIMS_ENABLED off: every course is 0 and no sim query runs", async () => {
    const u = await newUser();
    delete process.env.SIMS_ENABLED;
    const { result: counts, sql } = await countQueries(() => listCourses(u));
    assert.equal(counts.get(two), 0);
    assert.equal(counts.get(odd), 0);
    assert.ok(!sql.some((s) => /from sims s/.test(s)), "no sim query while sims are off");
  });

  test("only switched-on renderers count (SIMS_RENDERERS)", async () => {
    const u = await newUser();
    process.env.SIMS_RENDERERS = "bedside";
    assert.equal((await listCourses(u)).get(two), 1, "the board sim is off");
    process.env.SIMS_RENDERERS = "session";
    assert.equal((await listCourses(u)).get(two), 0);
  });

  test("unreviewed content switched off: only approved versions count", async () => {
    const u = await newUser();
    process.env.SIMS_SERVE_UNREVIEWED = "off";
    const counts = await listCourses(u);
    assert.equal(counts.get(two), 1, "the approved board sim only");
    assert.equal(counts.get(odd), 0, "the approved one there is pulled");
  });

  test("another learner's private course is neither listed nor counted", async () => {
    const u = await newUser();
    assert.equal((await listCourses(u)).has(priv), false);
    assert.equal((await simCountsByTrack(u, [priv])).get(priv), undefined, "asked directly, still nothing");
    const owner = users[0];
    assert.equal((await simCountsByTrack(owner, [priv])).get(priv), 1, "its owner sees it");
  });

  test("REQ-224: a mental health course's count is what GET /api/sims?trackId= already shows, before and after the 18+ confirmation", async () => {
    const u = await newUser();
    // The sims list is not behind the 18+ gate (docs/sims.md 22.12, finding 3),
    // so the count reveals nothing more; starting one stays refused.
    const listed = async () => {
      const res = await simsGet(
        new Request(`http://t/api/sims?trackId=${mh}`, { headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` } })
      );
      assert.equal(res.status, 200);
      return ((await res.json()) as { sims: unknown[] }).sims.length;
    };
    assert.equal(await listed(), 1, "the list names it without the confirmation");
    assert.equal((await listCourses(u)).get(mh), 1, "so the count matches it");
    await query(`insert into mature_course_acknowledgements (user_id, track_id, notice_version) values ($1, $2, $3)`, [u, mh, MATURE_CONTENT_NOTICE_VERSION]);
    assert.equal(await listed(), 1);
    assert.equal((await listCourses(u)).get(mh), 1);
    // And for the plain course: the count equals the list's served sims.
    const res = await simsGet(
      new Request(`http://t/api/sims?trackId=${two}`, { headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` } })
    );
    assert.equal(((await res.json()) as { sims: unknown[] }).sims.length, (await listCourses(u)).get(two));
  });

  test("one query for the whole list, however many courses have sims", async () => {
    const u = await newUser();
    const one = await countQueries(() => simCountsByTrack(u, [two]));
    const many = await countQueries(() => simCountsByTrack(u, [two, none, odd, priv, mh]));
    assert.equal(one.n, 1);
    assert.equal(many.n, 1);
    assert.equal(many.result.get(two), 2);
    // The route adds exactly that one query to the list when sims are on.
    const on = await countQueries(() => listCourses(u));
    delete process.env.SIMS_ENABLED;
    const off = await countQueries(() => listCourses(u));
    assert.equal(on.n - off.n, 1, on.sql.join("\n---\n"));
  });

  test("no ids, malformed ids or no renderers: no query", async () => {
    const u = await newUser();
    assert.equal((await countQueries(() => simCountsByTrack(u, []))).n, 0);
    assert.equal((await countQueries(() => simCountsByTrack(u, ["not-a-uuid"]))).n, 0);
    process.env.SIMS_RENDERERS = " , ";
    assert.equal((await countQueries(() => simCountsByTrack(u, [two]))).n, 0);
  });
});
