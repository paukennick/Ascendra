// REQ-286 / REQ-287: the ASWB Clinical and Masters courses and the Washington
// psychology jurisprudence course as seeded (npm run seed, as CI runs it before
// test:db), against a real Postgres with every migration applied:
//   - each sits in its Mental Health subcategory, so the per-course 18+
//     acknowledgment applies with no code change (403 mature_content_required
//     naming THAT course until it is acknowledged);
//   - the ASWB exam rows carry the published weights; the jurisprudence
//     exam's domains are unweighted (study emphasis, REQ-220);
//   - 9 labs per course are seeded on active objectives.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { closeOwner } from "./test-owner";
import { signAccessToken } from "./auth/tokens";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { MATURE_CONTENT_NOTICE_VERSION } from "./mature-content";
import { GET as courseGet } from "../app/api/courses/[id]/route";
import { GET as labsGet } from "../app/api/labs/route";
import { POST as acceptPost } from "../app/api/mature-content/accept/route";

const run = Date.now().toString(36);
const users: string[] = [];
const tracks: Record<string, string> = {};
const CODES = { ASWBCLINICAL: "social-work-licensure", ASWBMASTERS: "social-work-licensure", WAPSYCHJP: "psychology-licensure" } as const;

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `aswb-${run}-${users.length}@example.test`]);
  return u;
}
const req = (u: string, url: string, method = "GET", body?: unknown) =>
  new Request(`http://t${url}`, {
    method,
    headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const json = async (res: Response) => ({ status: res.status, body: (await res.json()) as Record<string, any> });
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });

before(async () => {
  for (const code of Object.keys(CODES)) {
    const t = await queryOne<{ id: string }>(`select id from subject_tracks where code = $1 and user_id is null`, [code]);
    assert.ok(t, `${code} is seeded (run npm run seed before npm run test:db)`);
    tracks[code] = t!.id;
  }
});

after(async () => {
  if (users.length) await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closePool();
  await closeOwner();
});

describe("REQ-286 / REQ-287: the seeded ASWB and Washington jurisprudence courses", () => {
  test("each sits in its Mental Health subcategory with the exam row's weights (unweighted for the jurisprudence exam)", async () => {
    for (const [code, sub] of Object.entries(CODES)) {
      const cat = await queryOne<{ cat: string; sub: string }>(
        `select c.slug as cat, s.slug as sub from subject_tracks t join education_subcategories s on s.id = t.subcategory_id
           join education_categories c on c.id = s.category_id where t.id = $1`,
        [tracks[code]]
      );
      assert.deepEqual(cat, { cat: "mental-health", sub }, code);
    }
    const weights = async (examCode: string) =>
      (await query<{ w: string | null }>(`select d.weight_percent::text as w from exam_domains d join credential_exams e on e.id = d.exam_id where e.exam_code = $1 order by d.sort_order`, [examCode])).map((d) => d.w && Number(d.w));
    assert.deepEqual(await weights("ASWB Clinical"), [36, 32, 32]);
    assert.deepEqual(await weights("ASWB Masters"), [35, 33, 32]);
    const jp = await query<{ w: string | null }>(
      `select d.weight_percent::text as w from exam_domains d join credential_exams e on e.id = d.exam_id
         join credentials c on c.id = e.credential_id where c.slug = 'wa-psychology-jurisprudence'`
    );
    assert.equal(jp.length, 6);
    assert.ok(jp.every((d) => d.w === null), "study-emphasis weights are not stored as exam weights");
  });

  test("the per-course 18+ gate applies: refused until that course is acknowledged; another course's acknowledgment does not count", async () => {
    const u = await newUser();
    await recordStudyNoticeAcceptance(u);
    for (const code of Object.keys(CODES)) {
      const id = tracks[code];
      for (const res of [await courseGet(req(u, `/api/courses/${id}`), idCtx(id)), await labsGet(req(u, `/api/labs?trackId=${id}`))]) {
        const r = await json(res);
        assert.equal(r.status, 403, `${code}: ${JSON.stringify(r.body)}`);
        assert.equal(r.body.code, "mature_content_required");
        assert.equal(r.body.trackId, id);
      }
      const ok = await json(
        await acceptPost(req(u, "/api/mature-content/accept", "POST", { trackId: id, version: MATURE_CONTENT_NOTICE_VERSION, attested: true, dateOfBirth: "1990-01-15", source: "course" }))
      );
      assert.equal(ok.status, 200, `${code}: ${JSON.stringify(ok.body)}`);
      assert.equal((await json(await courseGet(req(u, `/api/courses/${id}`), idCtx(id)))).status, 200, code);
      assert.equal((await json(await labsGet(req(u, `/api/labs?trackId=${id}`)))).status, 200, code);
    }
  });

  test("9 labs per course on active objectives of that course, both kinds", async () => {
    for (const code of Object.keys(CODES)) {
      const r = await queryOne<{ n: string; kinds: string }>(
        `select count(*)::text as n, string_agg(distinct l.kind, ',' order by l.kind) as kinds
           from labs l join objectives o on o.id = l.objective_id join course_units cu on cu.id = o.unit_id
          where cu.track_id = $1 and o.retired_at is null`,
        [tracks[code]]
      );
      assert.deepEqual(r, { n: "9", kinds: "build,case" }, code);
    }
  });
});
