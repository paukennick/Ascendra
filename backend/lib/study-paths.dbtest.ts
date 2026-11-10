// REQ-198: the study path API against a real Postgres with every migration
// applied (DATABASE_URL=... PGSSLMODE=disable npm run test:db).
//
// The three PT courses are seeded here through the real seed code
// (seedTrack, idempotent: the same upsert `npm run seed` runs), so the test
// does not depend on the seed having run first. The route handler is
// called directly with a signed bearer token.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { query, queryOne, closePool, sslOption } from "./db";
import { signAccessToken } from "./auth/tokens";
import { seedTrack } from "../supabase/seed/seed-lib";
import { CATALOG_TRACKS } from "../supabase/seed/catalog";
import { coursePaths } from "./study-paths";
import { GET as pathGet } from "../app/api/courses/[id]/path/route";

const run = Date.now().toString(36);
const alice = randomUUID();
const bob = randomUUID();
const aliceTrack = randomUUID();
const ids: Record<string, string> = {};
let pool: Pool;

const call = (u: string, id: string) =>
  pathGet(
    new Request(`http://t/api/courses/${id}/path`, {
      headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` },
    }),
    { params: Promise.resolve({ id }) }
  );

before(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 2 });
  for (const code of ["PTPREREQ", "DPT", "NPTEPT", "NPTEPTA"]) {
    await seedTrack(pool, null, CATALOG_TRACKS.find((t) => t.code === code)!);
    ids[code] = (await queryOne<{ id: string }>(`select id from subject_tracks where code = $1 and user_id is null`, [code]))!.id;
  }
  for (const [id, name] of [[alice, "alice"], [bob, "bob"]]) {
    await query(`insert into app_users (id, email, email_verified_at) values ($1, $2, now())`, [id, `${name}-path-${run}@example.test`]);
  }
  // Alice's own course reuses a catalog code: it must not be placed on the path.
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Alice DPT notes', 'graduate', $3)`, [
    aliceTrack,
    `DPT`,
    alice,
  ]);
});

after(async () => {
  await query(`delete from subject_tracks where id = $1`, [aliceTrack]);
  await query(`delete from app_users where id = any($1)`, [[alice, bob]]);
  await pool.end();
  await closePool();
});

describe("GET /api/courses/:id/path (REQ-198)", () => {
  test("DPT shows the refresher before and NPTE-PT after, with real ids and titles", async () => {
    const res = await call(bob, ids.DPT);
    assert.equal(res.status, 200);
    const { paths } = (await res.json()) as { paths: any[] };
    assert.equal(paths.length, 1);
    const [p] = paths;
    assert.equal(p.slug, "dpt-student");
    assert.deepEqual(p.steps.map((s: any) => s.trackId), [ids.PTPREREQ, ids.DPT, ids.NPTEPT]);
    assert.equal(p.before.trackId, ids.PTPREREQ);
    assert.equal(p.before.title, "PT School Prerequisites Refresher");
    assert.equal(p.after.trackId, ids.NPTEPT);
    assert.match(p.after.when, /6 to 9 months/);
  });

  test("NPTE-PT shows DPT before and nothing after; the refresher shows DPT after and nothing before", async () => {
    const npte = ((await (await call(bob, ids.NPTEPT)).json()) as any).paths[0];
    assert.equal(npte.before.trackId, ids.DPT);
    assert.equal(npte.after, null);
    const pre = ((await (await call(bob, ids.PTPREREQ)).json()) as any).paths[0];
    assert.equal(pre.before, null);
    assert.equal(pre.after.trackId, ids.DPT);
  });

  test("a course on no path gets an empty list", async () => {
    const res = await call(bob, ids.NPTEPTA);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { paths: [] });
  });

  test("a learner's own course with a catalog code is not on the path; others can't see it at all", async () => {
    assert.deepEqual(await coursePaths(aliceTrack), []);
    assert.deepEqual(await (await call(alice, aliceTrack)).json(), { paths: [] });
    assert.equal((await call(bob, aliceTrack)).status, 404, "another learner's course is 404, not confirmed");
  });

  test("unknown or malformed ids are 404; no token is 401", async () => {
    assert.equal((await call(bob, randomUUID())).status, 404);
    assert.equal((await call(bob, "not-a-uuid")).status, 404);
    const res = await pathGet(new Request(`http://t/api/courses/${ids.DPT}/path`), { params: Promise.resolve({ id: ids.DPT }) });
    assert.equal(res.status, 401);
  });

  test("seeding twice leaves one catalog row per path course", async () => {
    await seedTrack(pool, null, CATALOG_TRACKS.find((t) => t.code === "PTPREREQ")!);
    const n = await queryOne<{ n: string }>(`select count(*)::text as n from subject_tracks where code = 'PTPREREQ' and user_id is null`);
    assert.equal(n!.n, "1");
    const units = await queryOne<{ n: string }>(
      `select count(*)::text as n from objectives o join course_units cu on cu.id = o.unit_id where cu.track_id = $1`,
      [ids.PTPREREQ]
    );
    assert.equal(units!.n, "95");
  });
});
