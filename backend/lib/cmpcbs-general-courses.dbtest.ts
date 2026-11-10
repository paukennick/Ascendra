// REQ-195 against a real Postgres with every migration applied and the
// catalog seeded (CI's Database job seeds twice before test:db). The model is
// a fake client that fails the test if it is ever called.
//   1. the pre-REQ-195 CMPCBS shape, then the new one, through the real seed
//      code on a throwaway track: every row keeps its id, the logistics lines
//      are retired (a whole unit, and single lines in a unit that stays),
//      learners' mastery survives, and the course lists only what is taught;
//   2. the seeded catalog track names no school;
//   3. a retired objective is not served, even with a stored lesson, and
//      nothing is generated for it;
//   4. a reframed objective is served its authored lesson with no model call,
//      and the "authored" fix replaces an older stored lesson.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { query, queryOne, closePool, sslOption } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { AUTHORED_LESSON_MODEL, AUTHORED_LESSONS } from "./authored-lessons";
import { CMPCBS_COMPOSITION, CMPCBS_THEOLOGY_SURVEY } from "./authored-lessons-cmpcbs";
import { applyLessonFix, authoredFixes, lookupFix } from "./lesson-fixes";
import { getLessonFor, SHARED } from "./lesson-store";
import { ensureGeneration, loadObjective, RetiredObjectiveError } from "./lesson-generation";
import { seedTrack } from "../supabase/seed/seed-lib";
import { CMPCBS_TRACK, type SeedTrack } from "../supabase/seed/data";
import { GET as courseGet } from "../app/api/courses/[id]/route";
import { GET as lessonGet, POST as lessonPost } from "../app/api/objectives/[id]/lesson/route";

const run = Date.now().toString(36);
const user = randomUUID();
const code = `T-CMP-${run}`;
let pool: Pool;
let modelCalls = 0;

before(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 2 });
  await query(`insert into app_users (id, email) values ($1, $2)`, [user, `cmp-${run}@example.test`]);
  setAiCallSink(async () => {});
  const fail = async () => {
    modelCalls++;
    throw new Error("no model call expected");
  };
  __setClientForTest({ messages: { create: fail, parse: fail } } as any);
});

after(async () => {
  __setClientForTest(null);
  await query(`delete from app_users where id = $1`, [user]);
  await query(`delete from subject_tracks where code = $1`, [code]);
  await pool.end();
  await closePool();
});

const auth = { authorization: `Bearer ${signAccessToken({ sub: user, email: `${user}@example.test` })}` };
const req = (method = "GET") => new Request("http://t/x", { method, headers: auth });

async function course(trackId: string) {
  const res = await courseGet(req(), { params: Promise.resolve({ id: trackId }) });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  return body as { track: { title: string; description: string }; units: { title: string; objectives: { id: string; title: string }[] }[] };
}

// The track as it was before REQ-195: the same rows by position, nothing
// retired, the old reframed titles.
const OLD_TITLES: Record<string, string> = {
  [CMPCBS_COMPOSITION]: "Composition and Rhetoric (ENGL 101)",
  "Survey of the Old and New Testaments: canon, structure and literary genres": "Survey of Old and New Testament (BIBL 104)",
  [CMPCBS_THEOLOGY_SURVEY]: "Introduction to Theology Survey (THEO 104)",
};
const oldShape = (): SeedTrack => ({
  ...CMPCBS_TRACK,
  code,
  title: "Old degree coach",
  units: CMPCBS_TRACK.units.map(({ retiredAt: _r, objectiveRetiredAt: _o, ...u }) => ({ ...u, objectives: u.objectives.map((o) => OLD_TITLES[o] ?? o) })),
});
const newShape = (): SeedTrack => ({ ...CMPCBS_TRACK, code });

async function idsByPosition(trackId: string): Promise<Map<string, string>> {
  const rows = await query<{ pos: string; id: string }>(
    `select cu.sort_order || '.' || o.sort_order as pos, o.id from objectives o join course_units cu on cu.id = o.unit_id where cu.track_id = $1`,
    [trackId]
  );
  return new Map(rows.map((r) => [r.pos, r.id]));
}

describe("REQ-195: re-seeding the old shape with the new one retires and reframes in place", () => {
  test("ids by position survive, logistics lines are retired, mastery survives, the course lists only what is taught", async () => {
    await seedTrack(pool, null, oldShape());
    const trackId = (await queryOne<{ id: string }>(`select id from subject_tracks where code = $1`, [code]))!.id;
    const before = await idsByPosition(trackId);
    const comp = before.get("0.0")!;
    const elective = before.get("26.0")!;
    for (const o of [comp, elective]) await query(`insert into mastery (user_id, objective_id, status, score_0_4) values ($1, $2, 'Independent', 3)`, [user, o]);

    await seedTrack(pool, null, newShape());
    await seedTrack(pool, null, newShape()); // twice: idempotent
    const after = await idsByPosition(trackId);
    assert.deepEqual([...after.entries()].sort(), [...before.entries()].sort(), "no objective row moved, appeared or vanished");

    const obj = await queryOne<{ title: string; retired_at: Date | null }>(`select title, retired_at from objectives where id = $1`, [comp]);
    assert.deepEqual([obj!.title, obj!.retired_at], [CMPCBS_COMPOSITION, null], "composition reframed in place, still taught");
    const retired = await query<{ pos: string }>(
      `select cu.sort_order || '.' || o.sort_order as pos from objectives o join course_units cu on cu.id = o.unit_id
        where cu.track_id = $1 and o.retired_at is not null and o.retired_at <= now() order by cu.sort_order, o.sort_order`,
      [trackId]
    );
    const want = CMPCBS_TRACK.units.flatMap((u, i) => u.objectives.flatMap((_, j) => (u.retiredAt || u.objectiveRetiredAt?.[j] ? [`${i}.${j}`] : [])));
    assert.deepEqual(retired.map((r) => r.pos), want);
    // The REQ-187 advising set was 20 lines; 3 are reframed, 17 retired.
    assert.equal(want.length, 17);
    const units = await query<{ sort_order: number }>(`select sort_order from course_units where track_id = $1 and retired_at is not null order by sort_order`, [trackId]);
    assert.deepEqual(units.map((u) => u.sort_order), [1, 2, 3, 4, 26, 27]);

    const m = await query<{ objective_id: string; status: string }>(`select objective_id, status from mastery where user_id = $1 order by objective_id`, [user]);
    assert.equal(m.length, 2, "mastery on a reframed and on a retired objective is kept");

    const c = await course(trackId);
    assert.equal(c.units.length, 22);
    assert.deepEqual(c.units[0].objectives.map((o) => o.title), [CMPCBS_COMPOSITION]);
    const listed = c.units.flatMap((u) => u.objectives.map((o) => o.id));
    assert.ok(!listed.includes(elective), "a retired objective is not listed");
    const total = CMPCBS_TRACK.units.reduce((n, u) => n + u.objectives.length, 0);
    assert.equal(listed.length, total - want.length);
  });
});

describe("REQ-195: the seeded catalog track", () => {
  test("names no school in what the course view returns", async () => {
    const t = await queryOne<{ id: string }>(`select id from subject_tracks where code = 'CMPCBS' and user_id is null`);
    assert.ok(t, "seeded CMPCBS");
    const c = await course(t!.id);
    assert.equal(c.track.title, "Computer Science Degree Foundations");
    assert.doesNotMatch(JSON.stringify(c), /liberty/i);
    assert.doesNotMatch(c.units.map((u) => u.title).join(" "), /\b[A-Z]{4} \d{3}\b/);
  });
});

async function catalogObjective(where: string): Promise<{ id: string; title: string }> {
  const o = await queryOne<{ id: string; title: string }>(
    `select o.id, o.title from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
      where st.code = 'CMPCBS' and st.user_id is null and ${where} order by cu.sort_order, o.sort_order limit 1`
  );
  assert.ok(o, where);
  return o!;
}

async function insertLesson(objectiveId: string, model: string) {
  await query(
    `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, model)
     values ($1, 'g', 'old teaching', 'old fade', $2, 0, 'w', 'old solo', $2, 0, 'w', $3)
     on conflict (objective_id) do update set teach = excluded.teach, model = excluded.model`,
    [objectiveId, JSON.stringify(["a", "b", "c", "d"]), model]
  );
}

describe("REQ-195: retired objectives are not served", () => {
  test("GET and POST on a retired objective answer 404 even with a stored lesson; nothing is generated", async () => {
    const o = await catalogObjective(`cu.title = 'Free Electives'`);
    await insertLesson(o.id, "claude-sonnet-5");
    try {
      for (const [fn, m] of [[lessonGet, "GET"], [lessonPost, "POST"]] as const) {
        const res = await fn(req(m), { params: Promise.resolve({ id: o.id }) });
        const body = await res.json();
        assert.equal(res.status, 404, JSON.stringify(body));
        assert.match(JSON.stringify(body), /retired/);
      }
      const row = await loadObjective(o.id);
      assert.equal(row?.retired, true);
      assert.equal(row?.authored ?? null, null);
      assert.throws(() => ensureGeneration(o.id, row!, { scope: SHARED, pending: new Map() }), RetiredObjectiveError);
      assert.equal(modelCalls, 0);
    } finally {
      await query(`delete from lesson_content where objective_id = $1`, [o.id]);
    }
  });
  test("a single retired line inside a unit that stays is not served either", async () => {
    const o = await catalogObjective(`cu.sort_order = 0 and o.sort_order = 1`);
    assert.match(o.title, /^Communications elective/);
    const res = await lessonGet(req(), { params: Promise.resolve({ id: o.id }) });
    assert.equal(res.status, 404);
  });
  test("the audit's voids still find their (now retired) objectives", async () => {
    const { LESSON_FIXES_2026_11_09 } = await import("../scripts/lesson-fixes-2026-11-09");
    for (const id of ["CMPCBS-7", "CMPCBS-10", "CMPCBS-15"]) {
      const f = LESSON_FIXES_2026_11_09.find((x) => x.id === id)!;
      assert.equal((await lookupFix(f)).length, 1, id);
    }
  });
});

describe("REQ-195: reframed objectives are served their authored lesson", () => {
  test("first visit stores the authored lesson with sources and no model call", async () => {
    const o = await catalogObjective(`o.title = '${CMPCBS_COMPOSITION.replace(/'/g, "''")}'`);
    await query(`delete from lesson_content where objective_id = $1`, [o.id]);
    try {
      const objRow = await loadObjective(o.id);
      assert.deepEqual(objRow?.authored, { trackCode: "CMPCBS", objectiveTitle: CMPCBS_COMPOSITION });
      assert.equal(objRow?.retired, false);
      const row = await ensureGeneration(o.id, objRow!, { scope: SHARED, pending: new Map() }).fullPromise;
      assert.equal(row.model, AUTHORED_LESSON_MODEL);
      assert.match(row.teach, /Sources \(checked\): OpenStax, Writing Guide with Handbook/);
      // The route serves it.
      const res = await lessonGet(req(), { params: Promise.resolve({ id: o.id }) });
      const body = await res.json();
      assert.equal(res.status, 200, JSON.stringify(body));
      assert.equal(body.cached, true);
      assert.match(JSON.stringify(body.lesson), /College composition teaches academic writing/);
      assert.equal(modelCalls, 0);
    } finally {
      await query(`delete from lesson_content where objective_id = $1`, [o.id]);
    }
  });
  test("the authored fix replaces an older stored lesson (generated, or REQ-187's degree-plan one) and is not listed again", async () => {
    const o = await catalogObjective(`o.title = '${CMPCBS_THEOLOGY_SURVEY.replace(/'/g, "''")}'`);
    await insertLesson(o.id, "authored:degree-plan");
    try {
      const listed = await authoredFixes();
      const f = listed.find((x) => x.objective === o.title);
      assert.ok(f, "listed");
      assert.ok(!listed.some((x) => !Object.keys(AUTHORED_LESSONS.CMPCBS).includes(x.objective as string)), "only authored objectives are listed");
      const dry = await applyLessonFix(f!, { apply: false });
      assert.equal(dry.status, "would_apply");
      const r = await applyLessonFix(f!, { apply: true });
      assert.equal(r.status, "applied", r.detail);
      const row = (await getLessonFor(user, o.id))!.row;
      assert.equal(row.model, AUTHORED_LESSON_MODEL);
      assert.match(row.teach, /Sources \(checked\): OpenStax, World History Volume 2/);
      assert.ok(!(await authoredFixes()).some((x) => x.objective === o.title), "not listed again");
      const log = await queryOne<{ claims: string[] }>(`select claims from item_holdbacks where objective_id = $1 order by created_at desc limit 1`, [o.id]);
      assert.match(log!.claims[0], /^REQ-195 /);
    } finally {
      await query(`delete from lesson_content where objective_id = $1`, [o.id]);
      await query(`delete from item_holdbacks where objective_id = $1`, [o.id]);
    }
  });
});
