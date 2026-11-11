// REQ-224 (migration 077): the 18+ mature-content confirmation for the
// mental health category. Recorded per account, category and notice version;
// required by every mental health course route (403 code
// "mature_content_required", never a 5xx); asked on the intake form; in the
// account export and deleted with the account. Other courses are untouched.
// No model is called.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool, withTransaction } from "./db";
import { signAccessToken } from "./auth/tokens";
import { STUDY_NOTICE_VERSION } from "./study-notice";
import { buildAccountExport } from "./account-export";
import { checkSchema, SCHEMA_PROBES } from "./schema-status";
import { MatureContentError, requireAcknowledgementForObjective, requireAcknowledgementForTrack } from "./auth/requireAcknowledgement";
import { MATURE_CONTENT_NOTICE_VERSION, MATURE_CONTENT_REQUIRED_MESSAGE } from "./mature-content";
import { GET as stateGet } from "../app/api/mature-content/route";
import { POST as acceptPost } from "../app/api/mature-content/accept/route";
import { GET as courseGet } from "../app/api/courses/[id]/route";
import { GET as labsGet } from "../app/api/labs/route";
import { POST as sessionsPost } from "../app/api/sessions/route";
import { PUT as intakePut } from "../app/api/intake/route";

const run = Date.now().toString(36);
const users: string[] = [];
const mh = randomUUID(); // a mental health course (psychology-licensure)
const mhNotice = randomUUID(); // a mental health course that also needs the study notice
const other = randomUUID(); // an ordinary course
let mhObjective = "";

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `mature-${run}-${users.length}@example.test`]);
  return u;
}
const req = (u: string, url: string, method = "GET", body?: unknown) =>
  new Request(`http://t${url}`, {
    method,
    headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const accept = (u: string, body: Record<string, unknown> = {}) =>
  acceptPost(req(u, "/api/mature-content/accept", "POST", { category: "mental-health", version: MATURE_CONTENT_NOTICE_VERSION, ...body }));

function assertMatureRefusal(body: any) {
  assert.equal(body.code, "mature_content_required");
  assert.equal(body.category, "mental-health");
  assert.equal(body.noticeVersion, MATURE_CONTENT_NOTICE_VERSION);
  assert.equal(body.minAge, 18);
  assert.equal(body.error, MATURE_CONTENT_REQUIRED_MESSAGE);
}

before(async () => {
  const sub = await queryOne<{ id: string }>(
    `select s.id from education_subcategories s join education_categories c on c.id = s.category_id
      where c.slug = 'mental-health' and s.slug = 'psychology-licensure'`
  );
  assert.ok(sub, "migration 077 must be applied");
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, requires_acknowledgement, subcategory_id)
     values ($1, $2, 'MH course', 'certification', null, false, $5),
            ($3, $4, 'MH course with notice', 'certification', null, true, $5),
            ($6, $7, 'Other course', 'certification', null, false, null)`,
    [mh, `MCA-${run}`, mhNotice, `MCB-${run}`, sub!.id, other, `MCC-${run}`]
  );
  const unit = await queryOne<{ id: string }>(
    `insert into course_units (track_id, title, sort_order) values ($1, 'Assessment and Diagnosis', 0) returning id`,
    [mh]
  );
  const obj = await queryOne<{ id: string }>(
    `insert into objectives (unit_id, title, sort_order) values ($1, 'Assess suicide risk and plan safety in a clinical interview', 0) returning id`,
    [unit!.id]
  );
  mhObjective = obj!.id;
});

after(async () => {
  if (users.length) await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[mh, mhNotice, other]]);
  await closePool();
});

describe("mature-content confirmation (REQ-224)", () => {
  test("schema-status probes migration 077", async () => {
    const probes = SCHEMA_PROBES.filter((p) => p.migration === "077_mental_health_mature_content.sql");
    assert.equal(probes.length, 1, "probe listed");
    const status = await checkSchema((sql) => query<{ ok: boolean }>(sql), probes);
    assert.deepEqual(status.missing, []);
  });

  test("opening a mental health course without it is a 403 with a stable code, and works after accepting", async () => {
    const u = await newUser();
    assertMatureRefusal(await json(await courseGet(req(u, `/api/courses/${mh}`), params(mh)), 403));
    // An ordinary course is not affected.
    await json(await courseGet(req(u, `/api/courses/${other}`), params(other)));

    const state = await json(await stateGet(req(u, "/api/mature-content")));
    assert.deepEqual(state.categories, [
      { category: "mental-health", confirmed: false, confirmedAt: null, noticeVersion: MATURE_CONTENT_NOTICE_VERSION, minAge: 18 },
    ]);

    const after = await json(await accept(u, { source: "course" }));
    assert.equal(after.categories[0].confirmed, true);
    assert.ok(after.categories[0].confirmedAt);
    const opened = await json(await courseGet(req(u, `/api/courses/${mh}`), params(mh)));
    assert.equal(opened.track.id, mh);
    assert.equal(opened.track.__mature_needed, undefined, "the gate column never leaves the server");
  });

  test("teaching routes refuse through the shared gate; the study notice still comes first", async () => {
    const u = await newUser();
    await assert.rejects(requireAcknowledgementForTrack(mh, u), (e: unknown) => e instanceof MatureContentError);
    await assert.rejects(requireAcknowledgementForObjective(mhObjective, u), (e: unknown) => e instanceof MatureContentError);
    assertMatureRefusal(await json(await labsGet(req(u, `/api/labs?objectiveId=${mhObjective}`)), 403));

    // Gated for the study notice too: that one is asked first.
    const first = await json(await labsGet(req(u, `/api/labs?trackId=${mhNotice}`)), 403);
    assert.equal(first.code, "study_notice_required");
    await query(`insert into legal_acceptances (user_id, document, version, source) values ($1, 'study_notice', $2, 'prompt')`, [u, STUDY_NOTICE_VERSION]);
    assertMatureRefusal(await json(await labsGet(req(u, `/api/labs?trackId=${mhNotice}`)), 403));

    await json(await accept(u));
    await requireAcknowledgementForTrack(mh, u);
    await requireAcknowledgementForObjective(mhObjective, u);
    await json(await labsGet(req(u, `/api/labs?trackId=${mhNotice}`)));
  });

  test("starting a mental health course (a study session) is refused through serverError as a 403, not a 500", async () => {
    const u = await newUser();
    assertMatureRefusal(await json(await sessionsPost(req(u, "/api/sessions", "POST", { trackId: mh })), 403));
    await json(await sessionsPost(req(u, "/api/sessions", "POST", { trackId: other })), 201);
    await json(await accept(u, { source: "catalog" }));
    await json(await sessionsPost(req(u, "/api/sessions", "POST", { trackId: mh })), 201);
  });

  test("the intake form cannot save a mental health course until it is confirmed", async () => {
    const u = await newUser();
    const today = new Date().toISOString().slice(0, 10);
    const body = { goal: "pass_exam", targets: [{ trackId: other }, { trackId: mh }], today };
    assertMatureRefusal(await json(await intakePut(req(u, "/api/intake", "PUT", body)), 403));
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from learner_intake_targets where user_id = $1`, [u]);
    assert.equal(n?.n, 0, "nothing saved");
    await json(await accept(u, { source: "intake" }));
    const saved = await json(await intakePut(req(u, "/api/intake", "PUT", body)));
    assert.deepEqual(saved.targets.map((t: { trackId: string }) => t.trackId).sort(), [mh, other].sort());
  });

  test("only the current version, a known category and a known source are recorded; repeats keep the first row", async () => {
    const u = await newUser();
    const old = await json(await accept(u, { version: "2020-01-01" }), 409);
    assert.equal(old.code, "mature_notice_outdated");
    assert.doesNotMatch(old.error, /must be|version \(/, "a plain message, not a validation string");
    await json(await accept(u, { category: "healthcare-nursing" }), 400);
    await json(await accept(u, { source: "somewhere" }), 400);
    const none = await queryOne<{ n: number }>(`select count(*)::int as n from mature_content_confirmations where user_id = $1`, [u]);
    assert.equal(none?.n, 0);

    const first = await json(await accept(u, { source: "intake" }));
    const again = await json(await accept(u, { source: "course" }));
    assert.equal(again.categories[0].confirmedAt, first.categories[0].confirmedAt);
    const rows = await query<{ source: string; min_age: number; notice_version: string }>(
      `select source, min_age, notice_version from mature_content_confirmations where user_id = $1`,
      [u]
    );
    assert.deepEqual(rows, [{ source: "intake", min_age: 18, notice_version: MATURE_CONTENT_NOTICE_VERSION }]);
  });

  test("the table refuses an unknown category, an age under 18 and an unknown source", async () => {
    const u = await newUser();
    for (const [cat, age, source] of [["fitness", 18, "course"], ["mental-health", 16, "course"], ["mental-health", 18, "web"]] as const) {
      await assert.rejects(
        query(`insert into mature_content_confirmations (user_id, category_slug, notice_version, min_age, source) values ($1, $2, 'v', $3, $4)`, [u, cat, age, source]),
        /check constraint/
      );
    }
  });

  test("in the account export, and deleted with the account", async () => {
    const u = await newUser();
    await json(await accept(u, { source: "intake" }));
    const out = (await withTransaction((tx) => buildAccountExport(u, (sql, p) => tx.query(sql, p)), { readOnlySnapshot: true })) as Record<string, any>;
    assert.equal(out.matureContentConfirmations.length, 1);
    assert.equal(out.matureContentConfirmations[0].category_slug, "mental-health");
    assert.equal(out.matureContentConfirmations[0].notice_version, MATURE_CONTENT_NOTICE_VERSION);
    assert.ok(out.matureContentConfirmations[0].confirmed_at);

    await query(`delete from app_users where id = $1`, [u]);
    const left = await queryOne<{ n: number }>(`select count(*)::int as n from mature_content_confirmations where user_id = $1`, [u]);
    assert.equal(left?.n, 0);
  });

  test("an unauthenticated caller gets 401, not the state", async () => {
    const res = await stateGet(new Request("http://t/api/mature-content"));
    assert.equal(res.status, 401);
  });
});
