// REQ-224 (migration 077), REQ-259 (migration 081): the 18+ gate on the
// mental health courses. Acknowledged PER COURSE at a notice version, with the
// attestation recorded; the account's date of birth is asked once (the first
// time), age is computed from it in UTC date terms, under 18 keeps the course
// locked, under 16 also alerts the owners (the mail transport is captured, no
// mail leaves). Every mental health course route refuses without it (403 code
// "mature_content_required", never a 5xx); asked on the intake form; in the
// account export and deleted with the account. Other courses are untouched.
// No model is called.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool, withTransaction } from "./db";
import { signAccessToken } from "./auth/tokens";
import { STUDY_NOTICE_VERSION } from "./study-notice";
import { buildAccountExport } from "./account-export";
import { checkSchema, SCHEMA_PROBES } from "./schema-status";
import { __setEmailTransportForTest, type EmailPayload } from "./email";
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
const mh2 = randomUUID(); // a second mental health course
const mhNotice = randomUUID(); // a mental health course that also needs the study notice
const other = randomUUID(); // an ordinary course
let mhObjective = "";

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `mature-${run}-${users.length}@example.test`]);
  return u;
}
const emailOf = (u: string) => `mature-${run}-${users.indexOf(u) + 1}@example.test`;
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

// A date of birth that is `years` old today (and 100 days over), in UTC date terms.
function dobAged(years: number, extraDays = 100): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() - extraDays);
  return d.toISOString().slice(0, 10);
}
const ADULT = dobAged(30);

const acceptBody = (trackId: string, extra: Record<string, unknown> = {}) => ({
  trackId,
  version: MATURE_CONTENT_NOTICE_VERSION,
  attested: true,
  source: "course",
  ...extra,
});
const accept = (u: string, trackId: string, extra: Record<string, unknown> = {}) =>
  acceptPost(req(u, "/api/mature-content/accept", "POST", acceptBody(trackId, extra)));
const dobOf = async (u: string) =>
  queryOne<{ dob: string | null; entered: Date | null }>(`select date_of_birth::text as dob, date_of_birth_entered_at as entered from app_users where id = $1`, [u]);
const ackCount = async (u: string) =>
  (await queryOne<{ n: number }>(`select count(*)::int as n from mature_course_acknowledgements where user_id = $1`, [u]))!.n;

function assertMatureRefusal(body: any, trackId: string) {
  assert.equal(body.code, "mature_content_required");
  assert.equal(body.category, "mental-health");
  assert.equal(body.trackId, trackId);
  assert.equal(body.noticeVersion, MATURE_CONTENT_NOTICE_VERSION);
  assert.equal(body.minAge, 18);
  assert.equal(body.error, MATURE_CONTENT_REQUIRED_MESSAGE);
}

// Owner alert: the mail transport is captured; no mail leaves.
let sent: EmailPayload[] = [];
const savedOwners = process.env.OWNER_EMAILS;

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
            ($6, $7, 'Other course', 'certification', null, false, null),
            ($8, $9, 'MH course two', 'certification', null, false, $5)`,
    [mh, `MCA-${run}`, mhNotice, `MCB-${run}`, sub!.id, other, `MCC-${run}`, mh2, `MCD-${run}`]
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
  __setEmailTransportForTest(async (payload) => {
    sent.push(payload);
    return { error: null };
  });
  process.env.OWNER_EMAILS = `owner-${run}@example.test`;
});

afterEach(() => {
  sent = [];
});

after(async () => {
  __setEmailTransportForTest(null);
  if (savedOwners === undefined) delete process.env.OWNER_EMAILS;
  else process.env.OWNER_EMAILS = savedOwners;
  if (users.length) await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[mh, mh2, mhNotice, other]]);
  await closePool();
});

describe("per-course 18+ acknowledgment (REQ-259, REQ-224)", () => {
  test("schema-status probes migration 081", async () => {
    const probes = SCHEMA_PROBES.filter((p) => p.migration === "081_mature_course_acknowledgements.sql");
    assert.equal(probes.length, 1, "probe listed");
    const status = await checkSchema((sql) => query<{ ok: boolean }>(sql), probes);
    assert.deepEqual(status.missing, []);
  });

  test("opening a mental health course without it is a 403 naming the course; an ordinary course is not affected", async () => {
    const u = await newUser();
    assertMatureRefusal(await json(await courseGet(req(u, `/api/courses/${mh}`), params(mh)), 403), mh);
    await json(await courseGet(req(u, `/api/courses/${other}`), params(other)));

    const state = await json(await stateGet(req(u, "/api/mature-content")));
    assert.deepEqual(state, {
      noticeVersion: MATURE_CONTENT_NOTICE_VERSION,
      minAge: 18,
      dateOfBirthOnFile: false,
      ageStatus: "unknown",
      acknowledgedTrackIds: [],
    });
  });

  test("no date of birth on file: the first acknowledgment asks for one, and nothing is recorded without it", async () => {
    const u = await newUser();
    const none = await json(await accept(u, mh), 400);
    assert.equal(none.code, "date_of_birth_required");
    assert.equal(await ackCount(u), 0);
    assert.equal((await dobOf(u))!.dob, null);
    assertMatureRefusal(await json(await courseGet(req(u, `/api/courses/${mh}`), params(mh)), 403), mh);
  });

  test("an invalid date of birth is a 400 with a plain message and stores nothing", async () => {
    const u = await newUser();
    for (const [dateOfBirth, problem] of [
      ["2023-02-29", "not_a_date"],
      ["15/01/1990", "format"],
      ["1899-12-31", "too_early"],
      [dobAged(0, -3), "future"],
      [12345, "format"],
    ] as const) {
      const r = await json(await accept(u, mh, { dateOfBirth }), 400);
      assert.equal(r.code, "date_of_birth_invalid", String(dateOfBirth));
      assert.equal(r.problem, problem, String(dateOfBirth));
      assert.match(r.error, /\w/);
    }
    assert.equal((await dobOf(u))!.dob, null);
    assert.equal(await ackCount(u), 0);
  });

  test("attestation missing or not exactly true is a 400 and stores nothing, not even the date of birth", async () => {
    const u = await newUser();
    for (const attested of [undefined, false, "true", 1, null]) {
      const r = await json(await accept(u, mh, { dateOfBirth: ADULT, attested }), 400);
      assert.equal(r.code, "attestation_required", String(attested));
    }
    assert.equal((await dobOf(u))!.dob, null, "the date is not stored without the attestation");
    assert.equal(await ackCount(u), 0);
  });

  test("an adult's date of birth and the attestation unlock THAT course only; the second asks for the course, not the date", async () => {
    const u = await newUser();
    const first = await json(await accept(u, mh, { dateOfBirth: ADULT, source: "intake" }));
    assert.equal(first.dateOfBirthOnFile, true);
    assert.equal(first.ageStatus, "adult");
    assert.deepEqual(first.acknowledgedTrackIds, [mh]);
    assert.ok(!JSON.stringify(first).includes(ADULT), "the state never carries the date of birth");

    const stored = await dobOf(u);
    assert.equal(stored!.dob, ADULT);
    assert.ok(stored!.entered, "when it was entered is recorded");

    const opened = await json(await courseGet(req(u, `/api/courses/${mh}`), params(mh)));
    assert.equal(opened.track.id, mh);
    assert.equal(opened.track.__mature_needed, undefined, "the gate column never leaves the server");
    // Another mental health course is still locked, even though this account is acknowledged for one.
    assertMatureRefusal(await json(await courseGet(req(u, `/api/courses/${mh2}`), params(mh2)), 403), mh2);
    await assert.rejects(requireAcknowledgementForTrack(mh2, u), (e: unknown) => e instanceof MatureContentError && e.trackId === mh2);

    // The second course: no date needed, the attestation is.
    const second = await json(await accept(u, mh2));
    assert.deepEqual([...second.acknowledgedTrackIds].sort(), [mh, mh2].sort());
    await json(await courseGet(req(u, `/api/courses/${mh2}`), params(mh2)));
    assert.equal((await dobOf(u))!.dob, ADULT, "asked once, kept");

    const rows = await query<{ track_id: string; min_age: number; notice_version: string; source: string; attested_at: Date }>(
      `select track_id, min_age, notice_version, source, attested_at from mature_course_acknowledgements where user_id = $1 order by attested_at`,
      [u]
    );
    assert.deepEqual(rows.map((r) => [r.track_id, r.min_age, r.notice_version, r.source]), [
      [mh, 18, MATURE_CONTENT_NOTICE_VERSION, "intake"],
      [mh2, 18, MATURE_CONTENT_NOTICE_VERSION, "course"],
    ]);
    assert.ok(rows.every((r) => r.attested_at), "each has its attestation time");
    assert.deepEqual(sent, [], "an adult triggers no owner mail");
  });

  test("a category confirmation from 077 does not count; the old rows are left alone", async () => {
    const u = await newUser();
    await query(`insert into mature_content_confirmations (user_id, category_slug, notice_version, min_age, source) values ($1, 'mental-health', '2026-11-10', 18, 'course')`, [u]);
    assertMatureRefusal(await json(await courseGet(req(u, `/api/courses/${mh}`), params(mh)), 403), mh);
    await json(await accept(u, mh, { dateOfBirth: ADULT }));
    const old = await queryOne<{ n: number }>(`select count(*)::int as n from mature_content_confirmations where user_id = $1`, [u]);
    assert.equal(old?.n, 1, "kept for the record");
  });

  test("under 18: the course stays locked with a kind message; entering another date cannot unlock it", async () => {
    const u = await newUser();
    const teen = dobAged(17);
    const refused = await json(await accept(u, mh, { dateOfBirth: teen }), 403);
    assert.equal(refused.code, "mature_content_underage");
    assert.match(refused.error, /18 or older/);
    assert.match(refused.error, /support@/);
    assert.equal(await ackCount(u), 0);
    assert.equal((await dobOf(u))!.dob, teen, "the date entered is kept");
    assertMatureRefusal(await json(await courseGet(req(u, `/api/courses/${mh}`), params(mh)), 403), mh);

    // No retry loop: a new date is ignored, the stored one decides.
    const again = await json(await accept(u, mh, { dateOfBirth: ADULT }), 403);
    assert.equal(again.code, "mature_content_underage");
    assert.equal((await dobOf(u))!.dob, teen, "never replaced");
    assert.equal(await ackCount(u), 0);
    assert.equal((await json(await stateGet(req(u, "/api/mature-content")))).ageStatus, "under_18");
    assert.deepEqual(sent, [], "17 is under 18 but at or over the account minimum: no owner mail");
  });

  test("under 16: locked as for under 18, and the owners are alerted once, with no date of birth in the mail", async () => {
    const u = await newUser();
    const kid = dobAged(15);
    const refused = await json(await accept(u, mh, { dateOfBirth: kid }), 403);
    assert.equal(refused.code, "mature_content_underage");
    assert.equal(await ackCount(u), 0);
    assert.equal(sent.length, 1, "one owner, one mail");
    const mail = sent[0];
    assert.equal(mail.to, `owner-${run}@example.test`);
    const text = `${mail.subject} ${mail.html}`;
    assert.ok(text.includes(u), "names the account id");
    assert.ok(text.includes(emailOf(u)), "names the account address");
    assert.match(text, /below the (account )?minimum age/);
    assert.ok(!text.includes(kid), "never the date of birth");
    assert.ok(!text.includes(kid.slice(0, 4)), "not even its year");

    // Retrying (with the same or another date) does not alert again.
    await json(await accept(u, mh, { dateOfBirth: kid }), 403);
    await json(await accept(u, mh2, { dateOfBirth: ADULT }), 403);
    assert.equal(sent.length, 1);
    assert.equal((await dobOf(u))!.dob, kid);
  });

  test("an alert that cannot be sent never fails the request", async () => {
    const u = await newUser();
    __setEmailTransportForTest(async () => ({ error: { name: "validation_error", statusCode: 422 } }));
    try {
      const refused = await json(await accept(u, mh, { dateOfBirth: dobAged(14) }), 403);
      assert.equal(refused.code, "mature_content_underage");
    } finally {
      __setEmailTransportForTest(async (payload) => {
        sent.push(payload);
        return { error: null };
      });
    }
  });

  test("a date of birth on file is never overwritten through the flow, adult or not", async () => {
    const u = await newUser();
    await json(await accept(u, mh, { dateOfBirth: ADULT }));
    const other18 = dobAged(45);
    await json(await accept(u, mh2, { dateOfBirth: other18 }));
    assert.equal((await dobOf(u))!.dob, ADULT);
    // Two requests at once with different dates: exactly one wins and stays.
    const v = await newUser();
    const [a, b] = await Promise.all([
      accept(v, mh, { dateOfBirth: dobAged(25) }),
      accept(v, mh, { dateOfBirth: dobAged(35) }),
    ]);
    assert.deepEqual([a.status, b.status], [200, 200]);
    const winner = (await dobOf(v))!.dob;
    assert.ok(winner === dobAged(25) || winner === dobAged(35));
    await json(await accept(v, mh2, { dateOfBirth: dobAged(60) }));
    assert.equal((await dobOf(v))!.dob, winner);
  });

  test("only the current version is recorded; an older one is a 409 with a plain message", async () => {
    const u = await newUser();
    const old = await json(await accept(u, mh, { version: "2026-11-10", dateOfBirth: ADULT }), 409);
    assert.equal(old.code, "mature_notice_outdated");
    assert.doesNotMatch(old.error, /must be|version \(/, "a plain message, not a validation string");
    assert.equal(await ackCount(u), 0);
    assert.equal((await dobOf(u))!.dob, null);
  });

  test("a course that is not a visible mental health course, a bad id or a bad source is refused", async () => {
    const u = await newUser();
    await json(await accept(u, other, { dateOfBirth: ADULT }), 400);
    await json(await accept(u, randomUUID(), { dateOfBirth: ADULT }), 404);
    await json(await accept(u, "not-a-uuid", { dateOfBirth: ADULT }), 400);
    await json(await acceptPost(req(u, "/api/mature-content/accept", "POST", { version: MATURE_CONTENT_NOTICE_VERSION, attested: true, dateOfBirth: ADULT })), 400);
    await json(await accept(u, mh, { dateOfBirth: ADULT, source: "somewhere" }), 400);
    // Another learner's own course is not visible.
    const sub = (await queryOne<{ subcategory_id: string }>(`select subcategory_id from subject_tracks where id = $1`, [mh]))!.subcategory_id;
    const owner = await newUser();
    const mine = randomUUID();
    await query(`insert into subject_tracks (id, code, title, track_type, user_id, subcategory_id) values ($1, $2, 'Mine', 'certification', $3, $4)`, [mine, `MCE-${run}`, owner, sub]);
    try {
      await json(await accept(u, mine, { dateOfBirth: ADULT }), 404);
    } finally {
      await query(`delete from subject_tracks where id = $1`, [mine]);
    }
    assert.equal(await ackCount(u), 0);
    assert.equal((await dobOf(u))!.dob, null);
  });

  test("teaching routes refuse through the shared gate per course; the study notice still comes first", async () => {
    const u = await newUser();
    await assert.rejects(requireAcknowledgementForTrack(mh, u), (e: unknown) => e instanceof MatureContentError);
    await assert.rejects(requireAcknowledgementForObjective(mhObjective, u), (e: unknown) => e instanceof MatureContentError);
    assertMatureRefusal(await json(await labsGet(req(u, `/api/labs?objectiveId=${mhObjective}`)), 403), mh);

    // Gated for the study notice too: that one is asked first.
    const first = await json(await labsGet(req(u, `/api/labs?trackId=${mhNotice}`)), 403);
    assert.equal(first.code, "study_notice_required");
    await query(`insert into legal_acceptances (user_id, document, version, source) values ($1, 'study_notice', $2, 'prompt')`, [u, STUDY_NOTICE_VERSION]);
    assertMatureRefusal(await json(await labsGet(req(u, `/api/labs?trackId=${mhNotice}`)), 403), mhNotice);

    await json(await accept(u, mh, { dateOfBirth: ADULT }));
    await requireAcknowledgementForTrack(mh, u);
    await requireAcknowledgementForObjective(mhObjective, u);
    // The other course is still gated.
    assertMatureRefusal(await json(await labsGet(req(u, `/api/labs?trackId=${mhNotice}`)), 403), mhNotice);
    await json(await accept(u, mhNotice));
    await json(await labsGet(req(u, `/api/labs?trackId=${mhNotice}`)));
  });

  test("starting a mental health course (a study session) is a 403 through serverError, not a 500, and per course", async () => {
    const u = await newUser();
    assertMatureRefusal(await json(await sessionsPost(req(u, "/api/sessions", "POST", { trackId: mh })), 403), mh);
    await json(await sessionsPost(req(u, "/api/sessions", "POST", { trackId: other })), 201);
    await json(await accept(u, mh, { dateOfBirth: ADULT, source: "course" }));
    await json(await sessionsPost(req(u, "/api/sessions", "POST", { trackId: mh })), 201);
    assertMatureRefusal(await json(await sessionsPost(req(u, "/api/sessions", "POST", { trackId: mh2 })), 403), mh2);
  });

  test("the intake form cannot save a mental health course until THAT course is acknowledged", async () => {
    const u = await newUser();
    const today = new Date().toISOString().slice(0, 10);
    const body = { goal: "pass_exam", targets: [{ trackId: other }, { trackId: mh }], today };
    assertMatureRefusal(await json(await intakePut(req(u, "/api/intake", "PUT", body)), 403), mh);
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from learner_intake_targets where user_id = $1`, [u]);
    assert.equal(n?.n, 0, "nothing saved");
    await json(await accept(u, mh2, { dateOfBirth: ADULT, source: "intake" }));
    assertMatureRefusal(await json(await intakePut(req(u, "/api/intake", "PUT", body)), 403), mh);
    await json(await accept(u, mh, { source: "intake" }));
    const saved = await json(await intakePut(req(u, "/api/intake", "PUT", body)));
    assert.deepEqual(saved.targets.map((t: { trackId: string }) => t.trackId).sort(), [mh, other].sort());
  });

  test("the tables refuse an age under 18, an unknown source, a date before 1900 and a half-set date", async () => {
    const u = await newUser();
    for (const [age, source] of [[16, "course"], [18, "web"], [18, "catalog"]] as const) {
      await assert.rejects(
        query(`insert into mature_course_acknowledgements (user_id, track_id, notice_version, min_age, source) values ($1, $2, 'v', $3, $4)`, [u, mh, age, source]),
        /check constraint/
      );
    }
    await assert.rejects(query(`update app_users set date_of_birth = '1899-12-31', date_of_birth_entered_at = now() where id = $1`, [u]), /check constraint/);
    await assert.rejects(query(`update app_users set date_of_birth = '1990-01-01' where id = $1`, [u]), /check constraint/);
  });

  test("in the account export, and deleted with the account", async () => {
    const u = await newUser();
    await json(await accept(u, mh, { dateOfBirth: ADULT, source: "intake" }));
    const out = (await withTransaction((tx) => buildAccountExport(u, (sql, p) => tx.query(sql, p)), { readOnlySnapshot: true })) as Record<string, any>;
    assert.equal(out.profile.date_of_birth, ADULT);
    assert.ok(out.profile.date_of_birth_entered_at);
    assert.equal(out.matureCourseAcknowledgements.length, 1);
    assert.equal(out.matureCourseAcknowledgements[0].track_id, mh);
    assert.equal(out.matureCourseAcknowledgements[0].notice_version, MATURE_CONTENT_NOTICE_VERSION);
    assert.equal(out.matureCourseAcknowledgements[0].min_age, 18);
    assert.ok(out.matureCourseAcknowledgements[0].attested_at);

    await query(`delete from app_users where id = $1`, [u]);
    assert.equal(await ackCount(u), 0);
    assert.equal(await queryOne(`select 1 from app_users where id = $1`, [u]), null, "the date of birth went with the row");
  });

  test("deleting a course removes its acknowledgments and nothing else", async () => {
    const u = await newUser();
    const gone = randomUUID();
    const sub = (await queryOne<{ subcategory_id: string }>(`select subcategory_id from subject_tracks where id = $1`, [mh]))!.subcategory_id;
    await query(`insert into subject_tracks (id, code, title, track_type, user_id, subcategory_id) values ($1, $2, 'Gone', 'certification', null, $3)`, [gone, `MCF-${run}`, sub]);
    await json(await accept(u, gone, { dateOfBirth: ADULT }));
    await json(await accept(u, mh));
    await query(`delete from subject_tracks where id = $1`, [gone]);
    assert.equal(await ackCount(u), 1);
    assert.equal((await dobOf(u))!.dob, ADULT);
  });

  test("an unauthenticated caller gets 401, not the state", async () => {
    const res = await stateGet(new Request("http://t/api/mature-content"));
    assert.equal(res.status, 401);
    const post = await acceptPost(new Request("http://t/api/mature-content/accept", { method: "POST", body: "{}" }));
    assert.equal(post.status, 401);
  });
});
