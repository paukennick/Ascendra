// REQ-236 (docs/sims.md 12.2): a registration entry marked generated
// (entry(course, slug, { source: "generated" }), as the generator's
// .register.md writes it) seeds its version with source 'generated'; an
// authored entry stays 'authored'. A marking changed on unchanged content is
// corrected in place on the same version row (no new version, review kept).
// Uses a stand-in EPPP course (its own code, the three objective titles).
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { query, closePool, sslOption } from "./db";
import { closeOwner } from "./test-owner";
import { EPPP_OBJECTIVES, EPPP_SESSION_DOCUMENTS, type DocumentEntry } from "./sim/documents.ts";
import { seedSims } from "../supabase/seed/sims-seed";

const run = Date.now().toString(36);
const CODE = `EPPPG-${run}`;
const track = randomUUID();
let pool: Pool;

// The first EPPP session is registered as generated, the others as authored.
const GENERATED = EPPP_SESSION_DOCUMENTS[0].slug;
const entries = (generated: boolean): DocumentEntry[] =>
  EPPP_SESSION_DOCUMENTS.map((e) => ({ ...e, course: CODE, source: generated && e.slug === GENERATED ? "generated" : "authored" }));

async function sources(): Promise<Record<string, { id: string; source: string; review: string }>> {
  const rows = await query<{ slug: string; id: string; source: string; review_status: string }>(
    `select s.slug, v.id, v.source, v.review_status
       from sims s join sim_versions v on v.id = s.head_version_id
       join objectives o on o.id = s.objective_id join course_units cu on cu.id = o.unit_id
      where cu.track_id = $1`,
    [track]
  );
  return Object.fromEntries(rows.map((r) => [r.slug, { id: r.id, source: r.source, review: r.review_status }]));
}

before(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 2 });
  const unit = randomUUID();
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'EPPP stand-in', 'certification', null)`, [track, CODE]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Unit', 0, 100)`, [unit, track]);
  let i = 0;
  for (const t of EPPP_OBJECTIVES) await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [randomUUID(), unit, t, i++]);
});

after(async () => {
  await query(`delete from sims where objective_id in (select o.id from objectives o join course_units cu on cu.id = o.unit_id where cu.track_id = $1)`, [track]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await pool.end();
  await closePool();
  await closeOwner();
});

describe("sim_versions.source follows the registration entry (REQ-236)", () => {
  test("a generated entry seeds as 'generated'; authored ones stay 'authored'", async () => {
    const first = await seedSims(pool, entries(true));
    assert.deepEqual(first.map((r) => r.change), ["new", "new", "new"]);
    const s = await sources();
    assert.equal(Object.keys(s).length, 3);
    for (const [slug, v] of Object.entries(s)) {
      assert.equal(v.source, slug === GENERATED ? "generated" : "authored", slug);
      assert.equal(v.review, "needs_expert_review", slug);
    }
    const again = await seedSims(pool, entries(true));
    assert.deepEqual(again.map((r) => r.change), ["unchanged", "unchanged", "unchanged"]);
    assert.deepEqual(await sources(), s, "a second seed changes nothing");
  });

  test("a changed marking on unchanged content is corrected on the same version row", async () => {
    const before = await sources();
    await seedSims(pool, entries(false));
    const after = await sources();
    assert.equal(after[GENERATED].id, before[GENERATED].id, "no new version");
    assert.equal(after[GENERATED].source, "authored");
    const versions = await query<{ n: string }>(
      `select count(*)::text as n from sim_versions v join sims s on s.id = v.sim_id where s.slug = $1 and s.objective_id in
         (select o.id from objectives o join course_units cu on cu.id = o.unit_id where cu.track_id = $2)`,
      [GENERATED, track]
    );
    assert.equal(versions[0].n, "1");
  });
});
