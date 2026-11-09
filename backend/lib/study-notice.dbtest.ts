// REQ-165: the study notice -- one disclaimer for all content plus the AI
// data disclosure, accepted once per learner and version in
// legal_acceptances (migration 059). Reported by GET /api/onboarding,
// required on the server for gated (clinical) courses in place of the
// per-course disclaimer, in the export, deleted with the account, and
// invisible to the Terms/Privacy logic. No model is called.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool, withTransaction } from "./db";
import { signAccessToken } from "./auth/tokens";
import { STUDY_NOTICE_REQUIRED_MESSAGE, STUDY_NOTICE_VERSION } from "./study-notice";
import { pendingAcceptance, termsState } from "./legal";
import { buildAccountExport } from "./account-export";
import { AcknowledgementError, requireAcknowledgementForTrack } from "./auth/requireAcknowledgement";
import { GET as onboardingGet } from "../app/api/onboarding/route";
import { POST as noticePost } from "../app/api/onboarding/notice/route";
import { GET as courseAckGet, POST as courseAckPost } from "../app/api/courses/[id]/acknowledgement/route";

const run = Date.now().toString(36);
const users: string[] = [];
const gated = randomUUID();
const open = randomUUID();

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `study-notice-${run}-${users.length}@example.test`]);
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
const accept = (u: string, version: unknown = STUDY_NOTICE_VERSION) =>
  noticePost(req(u, "/api/onboarding/notice", "POST", { version }));
const params = (id: string) => ({ params: Promise.resolve({ id }) });

before(async () => {
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, requires_acknowledgement, disclaimer_key, disclaimer_version)
     values ($1, $2, 'Gated', 'certification', null, true, 'nursing-clinical', 3), ($3, $4, 'Open', 'certification', null, false, null, 1)`,
    [gated, `SNG-${run}`, open, `SNO-${run}`]
  );
});

after(async () => {
  if (users.length) await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[gated, open]]);
  await closePool();
});

describe("study notice (REQ-165)", () => {
  test("needed until accepted; recorded once; the first time is kept", async () => {
    const u = await newUser();
    const before = await json(await onboardingGet(req(u, "/api/onboarding")));
    assert.deepEqual(before.notice, { currentVersion: STUDY_NOTICE_VERSION, acceptedAt: null, needed: true });

    const first = await json(await accept(u));
    assert.equal(first.notice.needed, false);
    assert.ok(first.notice.acceptedAt);

    const again = await json(await accept(u));
    assert.equal(again.notice.acceptedAt, first.notice.acceptedAt);
    const n = await queryOne<{ n: number }>(
      `select count(*)::int as n from legal_acceptances where user_id = $1 and document = 'study_notice'`,
      [u]
    );
    assert.equal(n?.n, 1);
  });

  test("an old or missing version is refused and records nothing", async () => {
    const u = await newUser();
    await json(await accept(u, "2020-01-01"), 400);
    await json(await noticePost(req(u, "/api/onboarding/notice", "POST", {})), 400);
    assert.equal((await json(await onboardingGet(req(u, "/api/onboarding")))).notice.needed, true);
  });

  test("a gated course requires the notice on the server; an old per-course acknowledgement does not count", async () => {
    const u = await newUser();
    await query(
      `insert into track_acknowledgements (user_id, track_id, disclaimer_version, disclaimer_key) values ($1, $2, 3, 'nursing-clinical')`,
      [u, gated]
    );
    await assert.rejects(requireAcknowledgementForTrack(gated, u), (e: unknown) => {
      assert.ok(e instanceof AcknowledgementError);
      assert.equal((e as Error).message, STUDY_NOTICE_REQUIRED_MESSAGE);
      return true;
    });
    await requireAcknowledgementForTrack(open, u); // an open course never needed one
    assert.deepEqual(await json(await courseAckGet(req(u, `/api/courses/${gated}/acknowledgement`), params(gated))), {
      required: true,
      acknowledged: false,
      notice: "study_notice",
      noticeVersion: STUDY_NOTICE_VERSION,
    });
    // The old per-course "I understand" records nothing.
    await json(await courseAckPost(req(u, `/api/courses/${gated}/acknowledgement`, "POST", { disclaimerVersion: 3 })), 400);

    await json(await accept(u));
    await requireAcknowledgementForTrack(gated, u);
    assert.equal((await json(await courseAckGet(req(u, `/api/courses/${gated}/acknowledgement`), params(gated)))).acknowledged, true);
  });

  test("does not count as accepting the Terms or Privacy Policy", async () => {
    const u = await newUser();
    await json(await accept(u));
    assert.deepEqual((await pendingAcceptance(u)).sort(), ["privacy", "terms"]);
    const t = await termsState(u);
    assert.equal(t.acceptedVersion, null);
    assert.equal(t.needsAcceptance, true);
  });

  test("in the account export and deleted with the account", async () => {
    const u = await newUser();
    await json(await accept(u));
    const out = (await withTransaction((tx) => buildAccountExport(u, (sql, p) => tx.query(sql, p)), { readOnlySnapshot: true })) as Record<string, any[]>;
    assert.ok(out.legalAcceptances.some((r) => r.document === "study_notice" && r.version === STUDY_NOTICE_VERSION));
    await query(`delete from app_users where id = $1`, [u]);
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from legal_acceptances where user_id = $1`, [u]);
    assert.equal(n?.n, 0);
  });

  test("the database refuses any other document name", async () => {
    const u = await newUser();
    await assert.rejects(
      query(`insert into legal_acceptances (user_id, document, version, source) values ($1, 'cookies', 'x', 'prompt')`, [u]),
      /legal_acceptances_document_059/
    );
  });
});
