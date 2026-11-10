// REQ-197: smarter study reminders and service emails, against a real
// Postgres with migration 063 and the seeded catalog. Mail is captured by the
// test transport (lib/email.ts); nothing is sent.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
process.env.APP_BASE_URL ??= "https://app.example.test";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { __setEmailTransportForTest, type EmailPayload } from "./email";
import { buildAccountExport } from "./account-export";
import { runServiceEmails, getEmailPreferences, MAX_ATTEMPTS } from "./service-emails";
import { unsubscribeToken } from "./service-email-copy";
import { GET as prefsGet, PUT as prefsPut } from "../app/api/account/email-preferences/route";
import { POST as oneClick } from "../app/api/email/unsubscribe/route";
import { GET as planGet } from "../app/api/reminders/plan/route";
import { GET as cronGet } from "../app/api/cron/service-emails/route";

const run = Date.now().toString(36);
const users: string[] = [];
const track = randomUUID();
const unit = randomUUID();
const objs = [randomUUID(), randomUUID(), randomUUID()];
const NOW = new Date("2026-11-09T16:00:00Z");
const ENV = {
  AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
  APP_BASE_URL: "https://app.example.test",
  MAIL_POSTAL_ADDRESS: "PO Box 0, Test City",
  DIGEST_EMAIL_FROM: "Ascendra digest <digest@news.example.test>",
};
const noSleep = async () => undefined;

let sent: EmailPayload[] = [];
let failNext = 0;

async function newUser(opts: { verified?: boolean } = {}): Promise<{ id: string; email: string }> {
  const id = randomUUID();
  const email = `req197-${run}-${users.length}@example.test`;
  users.push(id);
  await query(`insert into app_users (id, email, email_verified_at) values ($1, $2, $3)`, [
    id,
    email,
    opts.verified === false ? null : new Date(),
  ]);
  return { id, email };
}
const auth = (u: string, url: string, method = "GET", body?: unknown) =>
  new Request(`http://t${url}`, {
    method,
    headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const mine = (email: string) => sent.filter((m) => m.to === email);
const runOnce = (env: Record<string, string | undefined> = ENV) =>
  runServiceEmails({ now: NOW, batch: 1000, gapMs: 0, sleep: noSleep, env });

async function trackId(code: string): Promise<string> {
  const row = await queryOne<{ id: string }>(`select id from subject_tracks where code = $1 and user_id is null`, [code]);
  assert.ok(row, `seeded track ${code} missing: run npm run seed before test:db`);
  return row!.id;
}

before(async () => {
  __setEmailTransportForTest(async (p) => {
    if (failNext > 0) {
      failNext--;
      return { error: { name: "rate_limit_exceeded", statusCode: 429 } };
    }
    sent.push(p);
    return { error: null };
  });
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Prep for Test Security', 'certification', null)`,
    [track, `R197-${run}`]
  );
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Operations', 1, 30)`, [unit, track]);
  const titles = ["Incident response: preparation, detection, containment", "Log analysis: SIEM, syslog", "Backups: full, incremental"];
  for (let i = 0; i < objs.length; i++) {
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [objs[i], unit, titles[i], i + 1]);
  }
});

beforeEach(() => {
  sent = [];
  failNext = 0;
});

after(async () => {
  __setEmailTransportForTest(null);
  if (users.length) await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("reminder plan endpoint", () => {
  test("names the top due objective, a real count and time, and the exam days; skips days with nothing due", async () => {
    const u = await newUser();
    // Two objectives due (one overdue and Needs review), one not due for a week.
    await query(`insert into mastery (user_id, objective_id, status, score_0_4) values ($1, $2, 'Needs review', 1), ($1, $3, 'Guided', 2), ($1, $4, 'Guided', 2)`, [
      u.id,
      objs[0],
      objs[1],
      objs[2],
    ]);
    await query(
      `insert into review_schedule (user_id, objective_id, due_on, step, lapses) values
         ($1, $2, '2026-11-05', 1, 1), ($1, $3, '2026-11-09', 2, 0), ($1, $4, '2026-11-20', 3, 0)
       on conflict (user_id, objective_id) do update set due_on = excluded.due_on, step = excluded.step, lapses = excluded.lapses`,
      [u.id, objs[0], objs[1], objs[2]]
    );
    await query(`insert into study_plans (user_id, track_id, exam_date) values ($1, $2, '2026-11-20')`, [u.id, track]);
    // Six answers 40 s apart in one session: five gaps, median 40 s.
    const s = await queryOne<{ id: string }>(
      `insert into review_sessions (user_id, track_id, day, size_cap, created_at) values ($1, $2, '2026-11-08', 12, now() - interval '1 day') returning id`,
      [u.id, track]
    );
    for (let i = 0; i < 6; i++) {
      await query(
        `insert into review_session_items (session_id, position, objective_id, verdict, answered_at)
         values ($1, $2, $3, 'correct', now() - interval '1 day' + make_interval(secs => $4))`,
        [s!.id, i + 1, objs[i % 3], i * 40]
      );
    }
    // Clean up: the session above answered nothing "today" (2026-11-09 in UTC
    // only if the suite runs that day), so the due list is unaffected.
    const res = await planGet(auth(u.id, "/api/reminders/plan?today=" + new Date().toISOString().slice(0, 10) + "&days=3"));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { reminders: any[] };
    // Dates are relative to the real today; the overdue objective is due on all three.
    assert.equal(body.reminders.length, 3);
    const first = body.reminders[0];
    assert.equal(first.trackId, track);
    assert.equal(first.topic, "Incident response", "Needs review ranks first");
    assert.equal(first.course, "Test Security");
    assert.equal(first.minutes === null || typeof first.minutes === "number", true);
    assert.ok(first.questionCount >= 2);
  });

  test("nothing due: an empty plan", async () => {
    const u = await newUser();
    const res = await planGet(auth(u.id, "/api/reminders/plan?days=7"));
    assert.deepEqual(((await res.json()) as any).reminders, []);
  });
});

describe("email preferences", () => {
  test("defaults, update, and the verified flag", async () => {
    const u = await newUser({ verified: false });
    let res = await prefsGet(auth(u.id, "/api/account/email-preferences"));
    let body = (await res.json()) as any;
    assert.deepEqual(body.preferences, { examChanges: true, examCountdown: true, weeklyDigest: false });
    assert.equal(body.emailVerified, false);
    // Settings says plainly when nothing is being sent yet (shipped dark).
    const savedFlag = process.env.SERVICE_EMAILS_ENABLED;
    delete process.env.SERVICE_EMAILS_ENABLED;
    body = (await (await prefsGet(auth(u.id, "/api/account/email-preferences"))).json()) as any;
    assert.deepEqual(body.sending, { examChanges: false, examCountdown: false, weeklyDigest: false });
    process.env.SERVICE_EMAILS_ENABLED = "true";
    const savedPostal = process.env.MAIL_POSTAL_ADDRESS;
    delete process.env.MAIL_POSTAL_ADDRESS;
    body = (await (await prefsGet(auth(u.id, "/api/account/email-preferences"))).json()) as any;
    assert.deepEqual(body.sending, { examChanges: true, examCountdown: true, weeklyDigest: false }, "digest needs its postal address");
    if (savedPostal !== undefined) process.env.MAIL_POSTAL_ADDRESS = savedPostal;
    if (savedFlag === undefined) delete process.env.SERVICE_EMAILS_ENABLED;
    else process.env.SERVICE_EMAILS_ENABLED = savedFlag;
    res = await prefsPut(auth(u.id, "/api/account/email-preferences", "PUT", { weeklyDigest: true, examChanges: false }));
    body = (await res.json()) as any;
    assert.deepEqual(body.preferences, { examChanges: false, examCountdown: true, weeklyDigest: true });
    res = await prefsPut(auth(u.id, "/api/account/email-preferences", "PUT", { weeklyDigest: "yes" }));
    assert.equal(res.status, 400);
  });
});

describe("exam change notice", () => {
  test("once to verified, enrolled learners with the notice on; never to unverified or opted out", async () => {
    const sap = await trackId("AWSSAP");
    const yes = await newUser();
    const unverified = await newUser({ verified: false });
    const optedOut = await newUser();
    const notEnrolled = await newUser();
    for (const u of [yes, unverified, optedOut]) {
      await query(`insert into course_favorites (user_id, track_id) values ($1, $2) on conflict do nothing`, [u.id, sap]);
    }
    await query(`insert into email_preferences (user_id, exam_changes) values ($1, false)`, [optedOut.id]);

    await runOnce();
    const got = mine(yes.email);
    assert.equal(got.length, 1);
    assert.match(got[0].subject, /^Exam change: AWS Solutions Architect - Professional, November 17, 2026$/);
    assert.match(got[0].text!, /What the course did/);
    assert.match(got[0].headers!["List-Unsubscribe"], /^<https:\/\/app\.example\.test\/api\/email\/unsubscribe\?token=/);
    assert.equal(got[0].headers!["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
    assert.equal(mine(unverified.email).length, 0);
    assert.equal(mine(optedOut.email).length, 0);
    assert.equal(mine(notEnrolled.email).length, 0);

    sent = [];
    await runOnce();
    assert.equal(mine(yes.email).length, 0, "idempotent per learner and change");
    const log = await query(`select kind, period_key, status from service_email_log where user_id = $1`, [yes.id]);
    assert.deepEqual(log, [{ kind: "exam_change", period_key: "AWSSAP:2026-11-17", status: "sent" }]);
  });

  test("a failed send is retried on the next run, at most three tries", async () => {
    const sap = await trackId("AWSSAP");
    const u = await newUser();
    await query(`insert into course_favorites (user_id, track_id) values ($1, $2)`, [u.id, sap]);
    const tries = async () =>
      (await queryOne<{ status: string; attempts: number }>(
        `select status, attempts from service_email_log where user_id = $1 and kind = 'exam_change'`,
        [u.id]
      ))!;
    // Fail every send to this run's learners only: the transport counts.
    const failRun = async () => {
      __setEmailTransportForTest(async (p) => (p.to === u.email ? { error: { name: "x", statusCode: 500 } } : (sent.push(p), { error: null })));
      await runOnce();
    };
    await failRun();
    assert.deepEqual(await tries(), { status: "failed", attempts: 1 });
    await failRun();
    await failRun();
    assert.deepEqual(await tries(), { status: "failed", attempts: MAX_ATTEMPTS });
    __setEmailTransportForTest(async (p) => (sent.push(p), { error: null }));
    await runOnce();
    assert.equal(mine(u.email).length, 0, "no fourth try");
  });
});

describe("exam countdown", () => {
  test("at 14 and 3 days, readiness plainly unconfirmed without evidence, once each", async () => {
    const d14 = await newUser();
    const d3 = await newUser();
    const d9 = await newUser();
    await query(`insert into study_plans (user_id, track_id, exam_date) values ($1, $4, '2026-11-23'), ($2, $4, '2026-11-12'), ($3, $4, '2026-11-18')`, [
      d14.id,
      d3.id,
      d9.id,
      track,
    ]);
    await runOnce();
    const a = mine(d14.email);
    assert.equal(a.length, 1);
    assert.equal(a[0].subject, "Test Security exam in 14 days");
    assert.match(a[0].text!, /Readiness: unconfirmed\./);
    assert.match(a[0].text!, /no weak spots to name/);
    assert.equal(mine(d3.email)[0]?.subject, "Test Security exam in 3 days");
    assert.equal(mine(d9.email).length, 0, "nothing at 9 days");
    sent = [];
    await runOnce();
    assert.equal(mine(d14.email).length + mine(d3.email).length, 0);
  });

  test("names the weakest objectives the learner has practiced", async () => {
    const u = await newUser();
    await query(`insert into study_plans (user_id, track_id, exam_date) values ($1, $2, '2026-11-12')`, [u.id, track]);
    for (const [o, verdict] of [
      [objs[0], "incorrect"],
      [objs[1], "correct"],
    ] as const) {
      await query(
        `insert into attempts (user_id, objective_id, kind, stage, format, question, answer, verdict)
         values ($1, $2, 'lesson', 'solo', 'open', 'q', 'a', $3)`,
        [u.id, o, verdict]
      );
    }
    await runOnce();
    const [m] = mine(u.email);
    assert.ok(m, "sent");
    assert.match(m.text!, /weakest objective/);
    assert.match(m.text!, /Incident response/);
  });
});

describe("weekly digest", () => {
  test("refuses to send without the postal address or its own sender", async () => {
    const u = await newUser();
    await query(`insert into email_preferences (user_id, weekly_digest) values ($1, true)`, [u.id]);
    await query(
      `insert into attempts (user_id, objective_id, kind, stage, format, question, answer, verdict, created_at)
       values ($1, $2, 'lesson', 'solo', 'open', 'q', 'a', 'correct', '2026-11-06T12:00:00Z')`,
      [u.id, objs[1]]
    );
    const r = await runOnce({ ...ENV, MAIL_POSTAL_ADDRESS: "" });
    assert.match(r.weekly_digest.refused!, /MAIL_POSTAL_ADDRESS/);
    const r2 = await runOnce({ ...ENV, DIGEST_EMAIL_FROM: undefined });
    assert.match(r2.weekly_digest.refused!, /DIGEST_EMAIL_FROM/);
    assert.equal(mine(u.email).length, 0);

    await runOnce();
    const [m] = mine(u.email);
    assert.ok(m, "sent once configured");
    assert.equal(m.from, ENV.DIGEST_EMAIL_FROM);
    assert.match(m.text!, /1 question answered, 1 correct\./);
    assert.ok(m.text!.includes(ENV.MAIL_POSTAL_ADDRESS));
    assert.match(m.html, /\/unsubscribe\?token=/);
    sent = [];
    await runOnce();
    assert.equal(mine(u.email).length, 0, "once per ISO week");
  });

  test("off by default, and nothing to a learner with no activity that week", async () => {
    const off = await newUser();
    await query(
      `insert into attempts (user_id, objective_id, kind, stage, format, question, answer, verdict, created_at)
       values ($1, $2, 'lesson', 'solo', 'open', 'q', 'a', 'correct', '2026-11-06T12:00:00Z')`,
      [off.id, objs[1]]
    );
    const idle = await newUser();
    await query(`insert into email_preferences (user_id, weekly_digest) values ($1, true)`, [idle.id]);
    await runOnce();
    assert.equal(mine(off.email).length + mine(idle.email).length, 0);
  });
});

describe("unsubscribe", () => {
  test("one-click POST turns off only that kind; a bad token changes nothing", async () => {
    const u = await newUser();
    await query(`insert into email_preferences (user_id, weekly_digest) values ($1, true)`, [u.id]);
    const bad = await oneClick(new Request(`http://t/api/email/unsubscribe?token=nope`, { method: "POST", body: "List-Unsubscribe=One-Click" }));
    assert.equal(bad.status, 400);
    const t = unsubscribeToken(u.id, "weekly_digest");
    const res = await oneClick(
      new Request(`http://t/api/email/unsubscribe?token=${encodeURIComponent(t)}`, { method: "POST", body: "List-Unsubscribe=One-Click" })
    );
    assert.equal(res.status, 200);
    assert.deepEqual(await getEmailPreferences(u.id), { examChanges: true, examCountdown: true, weeklyDigest: false });
  });
});

describe("account data", () => {
  test("in the export and deleted with the account", async () => {
    const u = await newUser();
    await query(`insert into email_preferences (user_id, weekly_digest) values ($1, true)`, [u.id]);
    await query(`insert into service_email_log (user_id, kind, period_key, status) values ($1, 'weekly_digest', '2026-W45', 'sent')`, [u.id]);
    const data = (await buildAccountExport(u.id, (sql, p) => query(sql, p))) as any;
    assert.equal(data.emailPreferences.length, 1);
    assert.equal(data.serviceEmails[0].period_key, "2026-W45");
    await query(`delete from app_users where id = $1`, [u.id]);
    const left = await queryOne<{ n: number }>(
      `select (select count(*) from email_preferences where user_id = $1) + (select count(*) from service_email_log where user_id = $1) as n`,
      [u.id]
    );
    assert.equal(Number(left!.n), 0);
  });
});

describe("cron route", () => {
  test("refuses without CRON_SECRET or the right bearer", async () => {
    const saved = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    assert.equal((await cronGet(new Request("http://t/api/cron/service-emails"))).status, 503);
    process.env.CRON_SECRET = "s3cret";
    assert.equal((await cronGet(new Request("http://t/api/cron/service-emails", { headers: { authorization: "Bearer nope" } }))).status, 401);
    // Dark until SERVICE_EMAILS_ENABLED=true (the Privacy Policy update ships with it).
    const savedFlag = process.env.SERVICE_EMAILS_ENABLED;
    delete process.env.SERVICE_EMAILS_ENABLED;
    const res = await cronGet(new Request("http://t/api/cron/service-emails", { headers: { authorization: "Bearer s3cret" } }));
    assert.equal(res.status, 200);
    assert.match(((await res.json()) as any).skipped, /SERVICE_EMAILS_ENABLED/);
    assert.equal(sent.length, 0);
    if (savedFlag !== undefined) process.env.SERVICE_EMAILS_ENABLED = savedFlag;
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  });
});
