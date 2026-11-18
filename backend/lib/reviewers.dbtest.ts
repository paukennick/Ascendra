// REQ-331: reviewers, against a real Postgres with every migration applied
// (088 included). No model, no network; owner notices fail closed (no
// RESEND_API_KEY) without failing anything.
//
//   1. The owner-only routes refuse everyone else (a learner, an unrestricted
//      account, a reviewer) and mark, list and unmark for the owner.
//   2. A reviewer has what a grant gives (every course, full AI in the pilot)
//      and the feedback form; /api/auth/me says so.
//   3. A reviewer creates, edits and lists only their own feedback; a
//      non-reviewer is refused; the owner reads everything, filtered.
//   4. Unmarking removes the form and, when marking created it, the access.
//   5. The 18+ gate still applies to a reviewer.
//   6. The export and account deletion include the new data; the schema probe.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query, queryOne, closePool } from "./db";
import { ownerClient, closeOwner } from "./test-owner";
import { signAccessToken } from "./auth/tokens";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { accessFor } from "./account-access";
import { aiAccessSummary } from "./ai-access";
import { tierFor } from "./entitlements";
import { buildAccountExport } from "./account-export";
import { checkSchema, SCHEMA_PROBES } from "./schema-status";
import { MATURE_CONTENT_NOTICE_VERSION } from "./mature-content";
import { NOT_A_REVIEWER_MESSAGE } from "./reviewers-config";
import { GET as reviewersGet, POST as reviewersPost } from "../app/api/access/reviewers/route";
import { DELETE as reviewerDelete } from "../app/api/access/reviewers/[id]/route";
import { GET as ownerFeedbackGet } from "../app/api/access/reviewer-feedback/route";
import { GET as feedbackGet, POST as feedbackPost } from "../app/api/reviewer/feedback/route";
import { GET as feedbackOneGet, PUT as feedbackPut } from "../app/api/reviewer/feedback/[id]/route";
import { POST as grantsPost } from "../app/api/access/grants/route";
import { GET as authMeGet } from "../app/api/auth/me/route";
import { GET as courseGet } from "../app/api/courses/[id]/route";
import { POST as acceptPost } from "../app/api/mature-content/accept/route";
import { DELETE as deleteAccount } from "../app/api/account/route";

const run = Date.now().toString(36);
const OWNER = `rv-owner-${run}@example.test`;
const PLAIN = randomUUID();
const MH = randomUUID();
let SIM = "";
let MH_SIM = "";
const users: string[] = [];
const ENV = ["OWNER_EMAILS", "AI_ACCESS_MODE", "BILLING_ENABLED"];

const auth = (u: string) => ({ authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" });
const call = (fn: any, url: string, u: string, method = "GET", body?: unknown, params?: unknown) =>
  fn(new Request(`http://t${url}`, { method, headers: auth(u), body: body === undefined ? undefined : JSON.stringify(body) }), params ? { params: Promise.resolve(params) } : undefined) as Promise<Response>;
async function json<T = any>(res: Response, status = 200): Promise<T> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as T;
}
async function newUser(opts: { email?: string; verified?: boolean; name?: string } = {}): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email, display_name, email_verified_at) values ($1, $2, $3, $4)`, [
    u,
    opts.email ?? `rv-${run}-${users.length}@example.test`,
    opts.name ?? null,
    opts.verified === false ? null : new Date(),
  ]);
  await recordStudyNoticeAcceptance(u);
  return u;
}
const emailOf = async (u: string) => (await queryOne<{ email: string }>(`select email from app_users where id = $1`, [u]))!.email;
let ownerId = "";
const mark = (email: string, extra: Record<string, unknown> = {}) => call(reviewersPost, "/api/access/reviewers", ownerId, "POST", { email, ...extra });
async function reviewer(extra: Record<string, unknown> = {}, name?: string): Promise<{ id: string; grantId: string }> {
  const u = await newUser({ name });
  const r = await json(await mark(await emailOf(u), extra));
  return { id: u, grantId: r.reviewer.id };
}
const send = (u: string, body: unknown) => call(feedbackPost, "/api/reviewer/feedback", u, "POST", body);
const ADULT = "1980-05-01";

before(async () => {
  const counseling = await queryOne<{ id: string }>(
    `select s.id from education_subcategories s join education_categories c on c.id = s.category_id
      where c.slug = 'mental-health' and s.slug = 'counseling-licensure'`
  );
  assert.ok(counseling, "migration 077 must be applied");
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, requires_acknowledgement, subcategory_id)
     values ($1, $2, 'Reviewer plain course', 'certification', null, false, null),
            ($3, $4, 'Reviewer counseling course', 'certification', null, false, $5)`,
    [PLAIN, `RVA-${run}`, MH, `RVB-${run}`, counseling!.id]
  );
  for (const [track, key] of [[PLAIN, "plain"], [MH, "mh"]] as const) {
    const unit = await queryOne<{ id: string }>(`insert into course_units (track_id, title, sort_order) values ($1, 'Unit', 0) returning id`, [track]);
    const o = await queryOne<{ id: string }>(`insert into objectives (unit_id, title, sort_order) values ($1, 'Objective', 0) returning id`, [unit!.id]);
    const s = await queryOne<{ id: string }>(
      `insert into sims (objective_id, slug, safety_family, screen_type, title) values ($1, $2, 'clinical', 'session', $3) returning id`,
      [o!.id, `rv-${key}-${run}`, key === "mh" ? "Intake session" : "Plain sim"]
    );
    if (key === "mh") MH_SIM = s!.id;
    else SIM = s!.id;
  }
  ownerId = await newUser({ email: OWNER, name: "Nick" });
});

after(async () => {
  for (const k of ENV) delete process.env[k];
  await query(`delete from account_access where email like $1`, [`%${run}%`]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[PLAIN, MH]]);
  await closeOwner();
  await closePool();
});

beforeEach(() => {
  for (const k of ENV) delete process.env[k];
  process.env.OWNER_EMAILS = OWNER;
});

describe("owner-only routes", () => {
  test("refuse a learner, an unrestricted account and a reviewer, on every method", async () => {
    const learner = await newUser();
    const granted = await newUser();
    await json(await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: await emailOf(granted) }));
    const rv = await reviewer();
    for (const u of [learner, granted, rv.id]) {
      assert.equal((await reviewersGet(new Request("http://t/api/access/reviewers", { headers: auth(u) }))).status, 403);
      assert.equal((await call(reviewersPost, "/api/access/reviewers", u, "POST", { email: `x-${run}@example.test` })).status, 403);
      assert.equal((await call(reviewerDelete, `/api/access/reviewers/${rv.grantId}`, u, "DELETE", undefined, { id: rv.grantId })).status, 403);
      assert.equal((await call(ownerFeedbackGet, "/api/access/reviewer-feedback", u)).status, 403);
    }
    assert.equal((await accessFor(rv.id))?.grant?.reviewer !== null, true, "a refused unmark changed nothing");
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from account_access where email = $1`, [`x-${run}@example.test`]))!.n, 0);
  });

  test("the owner marks by email (with areas and a note), lists, and an unknown area or an owner address is refused", async () => {
    const u = await newUser();
    const email = await emailOf(u);
    const r = await json(await mark(email.toUpperCase(), { areas: ["mental-health"], note: "LMHC friend" }));
    assert.equal(r.reviewer.email, email);
    assert.equal(r.reviewer.status, "active");
    assert.deepEqual(r.reviewer.reviewer.areas, ["mental-health"]);
    assert.equal(r.reviewer.reviewer.note, "LMHC friend");
    assert.equal(r.reviewer.reviewer.addedAccess, true);
    const list = await json(await reviewersGet(new Request("http://t/api/access/reviewers", { headers: auth(ownerId) })));
    assert.ok(list.reviewers.some((g: any) => g.email === email));
    assert.ok(list.categories.some((c: any) => c.slug === "mental-health"));
    const ev = await queryOne<{ action: string; actor_id: string }>(`select action, actor_id from account_access_events where email = $1 order by id desc limit 1`, [email]);
    assert.deepEqual(ev, { action: "reviewer_on", actor_id: ownerId }, "who marked it is recorded");
    const who = await queryOne<{ reviewer_by: string; reviewer_at: Date }>(`select reviewer_by, reviewer_at from account_access where email = $1 and revoked_at is null`, [email]);
    assert.equal(who!.reviewer_by, ownerId);
    assert.ok(who!.reviewer_at);
    assert.equal((await mark(email, { areas: ["no-such-category"] })).status, 400);
    assert.equal((await mark(OWNER)).status, 409);
    assert.equal((await mark("not-an-email")).status, 400);
  });
});

describe("what a reviewer gets", () => {
  test("every course (plan pro), full AI in the pilot, and the badge in /api/auth/me", async () => {
    process.env.AI_ACCESS_MODE = "granted";
    process.env.BILLING_ENABLED = "true";
    const plain = await newUser();
    const rv = await reviewer({ areas: ["mental-health"] });
    assert.equal(await tierFor(rv.id), "pro");
    assert.equal((await aiAccessSummary(rv.id))?.full, true);
    assert.equal((await aiAccessSummary(plain))?.full, false);
    const me = await json(await call(authMeGet, "/api/auth/me", rv.id));
    assert.equal(me.user.access.level, "unrestricted");
    assert.deepEqual(me.user.access.reviewer.areas, ["mental-health"]);
    const plainMe = await json(await call(authMeGet, "/api/auth/me", plain));
    assert.equal(plainMe.user.access, null);
  });

  test("an address marked before it has an account waits, and applies once it verifies", async () => {
    const u = await newUser({ verified: false });
    const r = await json(await mark(await emailOf(u)));
    assert.equal(r.reviewer.status, "waiting");
    assert.equal(await accessFor(u), null);
    await query(`update app_users set email_verified_at = now() where id = $1`, [u]);
    assert.ok((await accessFor(u))?.grant?.reviewer);
    assert.equal((await send(u, { recommend: "yes" })).status, 200);
  });
});

describe("feedback", () => {
  test("a non-reviewer is refused, an unrestricted account too, with the reviewers-only words", async () => {
    const learner = await newUser();
    const granted = await newUser();
    await json(await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: await emailOf(granted) }));
    for (const u of [learner, granted]) {
      const r = await send(u, { recommend: "yes" });
      assert.equal(r.status, 403);
      assert.equal((await r.json()).error, NOT_A_REVIEWER_MESSAGE);
      assert.equal((await call(feedbackGet, "/api/reviewer/feedback", u)).status, 403);
    }
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from reviewer_feedback where user_id = any($1::uuid[])`, [[learner, granted]]))!.n, 0);
  });

  test("a reviewer creates, edits and lists only their own; another's id is a 404", async () => {
    const a = await reviewer({}, "Pat Lee");
    const b = await reviewer();
    const form = {
      trackId: PLAIN,
      name: "Pat Lee",
      role: "lcsw",
      areas: ["Plain course"],
      tried: ["lessons", "sims"],
      ratings: { accuracy: 4, ease: 5 },
      texts: { missing: "More ethics cases" },
      recommend: "yes",
      followUp: true,
    };
    const created = (await json(await send(a.id, form))).feedback;
    assert.equal(created.trackTitle, "Reviewer plain course");
    assert.deepEqual(created.ratings, { accuracy: 4, simRealism: null, sensitive: null, usefulness: null, ease: 5 });
    const second = (await json(await send(a.id, { simId: SIM, ratings: { simRealism: 3 } }))).feedback;
    assert.equal(second.trackId, PLAIN, "a sim names its course");
    assert.equal(second.simTitle, "Plain sim");
    await json(await send(b.id, { texts: { otherComments: "b's view" } }));

    const mine = await json(await call(feedbackGet, `/api/reviewer/feedback?trackId=${PLAIN}&simId=${SIM}`, a.id));
    assert.deepEqual(mine.feedback.map((f: any) => f.id), [second.id, created.id], "own only, newest first");
    assert.equal(mine.prefill.name, "Pat Lee");
    assert.deepEqual(mine.context, { trackId: PLAIN, trackTitle: "Reviewer plain course", simId: SIM, simTitle: "Plain sim" });

    const edited = (await json(await call(feedbackPut, `/api/reviewer/feedback/${created.id}`, a.id, "PUT", { ...form, recommend: "maybe", texts: {} }, { id: created.id }))).feedback;
    assert.equal(edited.recommend, "maybe");
    assert.equal(edited.texts.missing, null, "an edit sends the whole form, so a field can be cleared");
    assert.equal((await json(await call(feedbackOneGet, `/api/reviewer/feedback/${created.id}`, a.id, "GET", undefined, { id: created.id }))).feedback.recommend, "maybe");

    // b can neither read nor change a's.
    assert.equal((await call(feedbackOneGet, `/api/reviewer/feedback/${created.id}`, b.id, "GET", undefined, { id: created.id })).status, 404);
    assert.equal((await call(feedbackPut, `/api/reviewer/feedback/${created.id}`, b.id, "PUT", { recommend: "no" }, { id: created.id })).status, 404);
    assert.equal((await queryOne<{ recommend: string }>(`select recommend from reviewer_feedback where id = $1`, [created.id]))!.recommend, "maybe");
  });

  test("bad input: an empty form, a sim from another course, a course or sim that isn't there", async () => {
    const a = await reviewer();
    assert.equal((await send(a.id, {})).status, 400);
    assert.equal((await send(a.id, { trackId: MH, simId: SIM, recommend: "yes" })).status, 400);
    assert.equal((await send(a.id, { trackId: randomUUID(), recommend: "yes" })).status, 400);
    assert.equal((await send(a.id, { simId: randomUUID(), recommend: "yes" })).status, 400);
    assert.equal((await send(a.id, { ratings: { accuracy: 9 } })).status, 400);
  });

  test("the owner reads every submission newest first, filtered by reviewer and course, and may try the form", async () => {
    const a = await reviewer({}, "Filter A");
    const b = await reviewer({}, "Filter B");
    const fa = (await json(await send(a.id, { trackId: PLAIN, recommend: "yes" }))).feedback;
    const fb = (await json(await send(b.id, { simId: MH_SIM, recommend: "no" }))).feedback;
    const own = (await json(await send(ownerId, { recommend: "maybe" }))).feedback;
    const all = await json(await call(ownerFeedbackGet, "/api/access/reviewer-feedback", ownerId));
    const ids = all.feedback.map((f: any) => f.id);
    assert.ok(ids.indexOf(own.id) < ids.indexOf(fb.id) && ids.indexOf(fb.id) < ids.indexOf(fa.id), "newest first");
    assert.ok(all.reviewers.some((r: any) => r.id === a.id && r.label === "Filter A"));
    assert.ok(all.courses.some((c: any) => c.id === MH));
    const byA = await json(await call(ownerFeedbackGet, `/api/access/reviewer-feedback?reviewer=${a.id}`, ownerId));
    assert.deepEqual(byA.feedback.map((f: any) => f.id), [fa.id]);
    assert.equal(byA.feedback[0].reviewerEmail, await emailOf(a.id));
    const byMh = await json(await call(ownerFeedbackGet, `/api/access/reviewer-feedback?course=${MH}`, ownerId));
    assert.deepEqual(byMh.feedback.map((f: any) => [f.id, f.simId]), [[fb.id, MH_SIM]]);
    assert.equal((await call(ownerFeedbackGet, "/api/access/reviewer-feedback?course=nope", ownerId)).status, 400);
  });
});

describe("unmarking", () => {
  test("takes away the form and the access that marking gave", async () => {
    const rv = await reviewer();
    await json(await send(rv.id, { recommend: "yes" }));
    const r = await json(await call(reviewerDelete, `/api/access/reviewers/${rv.grantId}`, ownerId, "DELETE", undefined, { id: rv.grantId }));
    assert.equal(r.unmarked.accessEnded, true);
    assert.equal(await accessFor(rv.id), null);
    assert.equal((await send(rv.id, { recommend: "no" })).status, 403);
    assert.equal((await call(feedbackGet, "/api/reviewer/feedback", rv.id)).status, 403);
    const me = await json(await call(authMeGet, "/api/auth/me", rv.id));
    assert.equal(me.user.access, null);
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from reviewer_feedback where user_id = $1`, [rv.id]))!.n, 1, "their feedback is kept");
    const actions = await query<{ action: string }>(`select action from account_access_events where access_id = $1 order by id`, [rv.grantId]);
    assert.deepEqual(actions.map((a) => a.action), ["reviewer_on", "reviewer_off", "revoke"]);
    assert.equal((await call(reviewerDelete, `/api/access/reviewers/${rv.grantId}`, ownerId, "DELETE", undefined, { id: rv.grantId })).status, 404);
  });

  test("keeps unrestricted access the account had before it was marked (and given again after)", async () => {
    const u = await newUser();
    const email = await emailOf(u);
    await json(await call(grantsPost, "/api/access/grants", ownerId, "POST", { email, note: "AI pilot" }));
    const r = await json(await mark(email, { areas: ["mental-health"] }));
    assert.equal(r.reviewer.reviewer.addedAccess, false);
    assert.equal(r.reviewer.note, "AI pilot", "the grant's own note is kept");
    await json(await call(reviewerDelete, `/api/access/reviewers/${r.reviewer.id}`, ownerId, "DELETE", undefined, { id: r.reviewer.id }));
    const a = await accessFor(u);
    assert.equal(a?.level, "unrestricted");
    assert.equal(a?.grant?.reviewer, null);
    assert.equal((await send(u, { recommend: "yes" })).status, 403);

    // Marked first, then given access explicitly: unmarking keeps the access.
    const v = await newUser();
    const vEmail = await emailOf(v);
    const m = await json(await mark(vEmail));
    assert.equal(m.reviewer.reviewer.addedAccess, true);
    await json(await call(grantsPost, "/api/access/grants", ownerId, "POST", { email: vEmail }));
    await json(await call(reviewerDelete, `/api/access/reviewers/${m.reviewer.id}`, ownerId, "DELETE", undefined, { id: m.reviewer.id }));
    assert.equal((await accessFor(v))?.level, "unrestricted");
  });
});

describe("the 18+ gate still applies to a reviewer (REQ-259/327)", () => {
  test("a reviewer must acknowledge a mental health course, with the attestation and the date of birth", async () => {
    const rv = await reviewer({ areas: ["mental-health"] });
    const refused = await courseGet(new Request(`http://t/api/courses/${MH}`, { headers: auth(rv.id) }), { params: Promise.resolve({ id: MH }) });
    assert.equal(refused.status, 403);
    const body = await refused.json();
    assert.equal(body.code, "mature_content_required");
    assert.equal(body.trackId, MH);
    // No attestation: still refused. A date under 18: still locked.
    const noAttest = await call(acceptPost, "/api/mature-content/accept", rv.id, "POST", { trackId: MH, version: MATURE_CONTENT_NOTICE_VERSION, attested: false, dateOfBirth: ADULT });
    assert.notEqual(noAttest.status, 200);
    const young = await reviewer();
    const yr = new Date().getUTCFullYear() - 15;
    await call(acceptPost, "/api/mature-content/accept", young.id, "POST", { trackId: MH, version: MATURE_CONTENT_NOTICE_VERSION, attested: true, dateOfBirth: `${yr}-01-01` });
    assert.equal((await courseGet(new Request(`http://t/api/courses/${MH}`, { headers: auth(young.id) }), { params: Promise.resolve({ id: MH }) })).status, 403);
    // The real acknowledgement opens it, exactly as for anyone.
    await json(await call(acceptPost, "/api/mature-content/accept", rv.id, "POST", { trackId: MH, version: MATURE_CONTENT_NOTICE_VERSION, attested: true, dateOfBirth: ADULT }));
    assert.equal((await courseGet(new Request(`http://t/api/courses/${MH}`, { headers: auth(rv.id) }), { params: Promise.resolve({ id: MH }) })).status, 200);
  });
});

describe("export, deletion and the schema probe", () => {
  test("the export holds the reviewer mark and the feedback; deletion removes both", async () => {
    const rv = await reviewer({ areas: ["mental-health"], note: "export note" });
    await json(await send(rv.id, { trackId: PLAIN, texts: { heavyTopics: "Handled with care" }, recommend: "yes" }));
    const data = (await buildAccountExport(rv.id, (sql, p) => query(sql, p))) as any;
    assert.equal(data.reviewerFeedback.length, 1);
    assert.equal(data.reviewerFeedback[0].heavy_topics, "Handled with care");
    assert.equal(data.reviewerFeedback[0].track_title, "Reviewer plain course");
    assert.deepEqual(data.accessGrants[0].reviewer_areas, ["mental-health"]);
    assert.equal(data.accessGrants[0].reviewer_note, "export note");
    assert.ok(data.accessEvents.some((e: any) => e.action === "reviewer_on"));
    assert.ok(!JSON.stringify(data).includes(OWNER), "the owner is named, not their address");

    const res = await call(deleteAccount, "/api/account", rv.id, "DELETE", {});
    assert.equal(res.status, 200, await res.clone().text());
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from reviewer_feedback where user_id = $1`, [rv.id]))!.n, 0);
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from account_access where id = $1`, [rv.grantId]))!.n, 0);
  });

  test("an owner's deletion keeps the reviewers they marked (reviewer_by set null)", async () => {
    const otherOwner = await newUser({ email: `rv-owner2-${run}@example.test` });
    process.env.OWNER_EMAILS = `${OWNER},rv-owner2-${run}@example.test`;
    const u = await newUser();
    const r = await json(await call(reviewersPost, "/api/access/reviewers", otherOwner, "POST", { email: await emailOf(u) }));
    await query(`delete from app_users where id = $1`, [otherOwner]);
    const row = await queryOne<{ reviewer_by: string | null; reviewer_at: Date | null }>(`select reviewer_by, reviewer_at from account_access where id = $1`, [r.reviewer.id]);
    assert.equal(row!.reviewer_by, null);
    assert.ok(row!.reviewer_at);
  });

  test("088 replays cleanly, and 056 replayed after it keeps the widened action check (FAIL-1720 rule)", async () => {
    const owner = await ownerClient();
    try {
      for (const f of ["088_reviewers.sql", "056_account_access.sql", "088_reviewers.sql"]) {
        const sql = readFileSync(join(import.meta.dirname, "../supabase/migrations", f), "utf8");
        await owner.query("begin");
        await owner.query(sql);
        await owner.query("commit");
      }
      const def = await owner.query(`select pg_get_constraintdef(oid) as d, convalidated from pg_constraint where conname = 'account_access_events_action_check'`);
      assert.equal(def.rowCount, 1, "one check, under the name 056's inline check had");
      assert.match(def.rows[0].d, /reviewer_on/);
      assert.equal(def.rows[0].convalidated, true);
      const own = await owner.query(`select convalidated from pg_constraint where conname = 'account_access_reviewer_088'`);
      assert.equal(own.rows[0].convalidated, true);
    } finally {
      owner.release();
    }
    const probes = SCHEMA_PROBES.filter((p) => p.migration === "088_reviewers.sql");
    assert.deepEqual((await checkSchema((sql) => query(sql), probes)).missing, []);
  });

  test("the 088 probe passes on a migrated database", async () => {
    const probes = SCHEMA_PROBES.filter((p) => p.migration === "088_reviewers.sql");
    assert.equal(probes.length, 1);
    const status = await checkSchema((sql) => query(sql), probes);
    assert.equal(status.current, true, JSON.stringify(status));
  });
});
