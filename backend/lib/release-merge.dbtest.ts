// Release 2026-11-07: the places where line A and line B met, against a real
// Postgres with every migration applied (052 and 053 included). No model is
// called. See docs/release-2026-11-07.md for what each resolution keeps.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { recordLabCompletion, findLabObjective, tryItLab, tryItFields, objectiveHasLab } from "./lab-attempts";
import { latestLabReport } from "./lesson-experience";
import { purgeExpired, RETENTION } from "./retention";
import { cancelEmailChangeToken } from "./auth/emailTokens";
import { labDisclaimer } from "./lab-disclaimer";
import { GET as labGet, POST as labPost } from "../app/api/objectives/[id]/lab/route";

process.env.AUTH_JWT_SECRET ??= "test-only-secret";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objective = randomUUID();
const users: string[] = [];

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `rm-${run}-${users.length}@example.test`]);
  return u;
}
const req = (u: string, url: string, method = "POST") =>
  new Request(`http://t${url}`, {
    method,
    headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` },
  });

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Release merge', 'certification', null)`, [
    track,
    `RM-${run}`,
  ]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'Unit', 1)`, [unit, track]);
  await query(`insert into objectives (id, unit_id, title, sort_order, lab_prompt) values ($1, $2, 'Objective', 1, '  Inspect a service with systemctl.  ')`, [
    objective,
    unit,
  ]);
});

after(async () => {
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("migration 052 (one data model per shared feature)", () => {
  test("legal_acceptances has A's source column; terms_acceptances is gone; B's choice feedback columns are gone", async () => {
    const r = await queryOne<{ source: boolean; terms: boolean; feedback: number }>(
      `select exists(select 1 from information_schema.columns where table_schema = 'public'
                      and table_name = 'legal_acceptances' and column_name = 'source') as source,
              to_regclass('public.terms_acceptances') is not null as terms,
              (select count(*)::int from information_schema.columns where table_schema = 'public'
                 and column_name in ('fade_choice_feedback', 'solo_choice_feedback')) as feedback`
    );
    assert.deepEqual(r, { source: true, terms: false, feedback: 0 });
  });

  test("RLS is on for every table in public (B's 026 rule, for A's tables too)", async () => {
    const rows = await query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity`
    );
    assert.deepEqual(rows, []);
  });

  test("a source outside register / google_signup / prompt is refused", async () => {
    const u = await newUser();
    await assert.rejects(
      query(`insert into legal_acceptances (user_id, document, version, source) values ($1, 'terms', 'x', 'email')`, [u]),
      /legal_acceptances_source_052/
    );
  });
});

describe("Try it lab self-report (REQ-096) on A's lab data model", () => {
  test("is stored under lab_objective_id with no objective_id, never as mastery or a lab report", async () => {
    const u = await newUser();
    const obj = await findLabObjective(objective, u);
    assert.ok(obj);
    assert.deepEqual(await recordLabCompletion(u, obj!), { recorded: true });
    assert.deepEqual(await recordLabCompletion(u, obj!), { recorded: false }, "a repeat within the window is a no-op");
    const rows = await query<{ objective_id: string | null; lab_objective_id: string; format: string; verdict: string | null }>(
      `select objective_id, lab_objective_id, format::text as format, verdict::text as verdict from attempts where user_id = $1`,
      [u]
    );
    assert.deepEqual(rows, [{ objective_id: null, lab_objective_id: objective, format: "lab", verdict: null }]);
    const mastery = await queryOne<{ n: number }>(`select count(*)::int as n from mastery where user_id = $1`, [u]);
    assert.equal(mastery?.n, 0);
    assert.equal(await latestLabReport(u, objective), null, "the lab card's report ignores a self-report");
  });

  test("the lesson's Try it fields carry the prompt and the lab disclaimer (B's contract), or nulls", () => {
    const disclaimer = labDisclaimer("general", null);
    assert.deepEqual(tryItFields({ prompt: "Inspect a service with systemctl.", disclaimer }), {
      labPrompt: "Inspect a service with systemctl.",
      labDisclaimer: disclaimer,
    });
    assert.deepEqual(tryItFields(null), { labPrompt: null, labDisclaimer: null });
  });

  // REQ-139 (FAIL-526): the lab card on the Done screen and the Try it step
  // showed the same lab_prompt twice. Try it is offered only when the lesson
  // has no lab card -- no lab the learner can see for the objective.
  test("an objective whose Done screen shows the lab card offers no Try it step, and the self-report route refuses it", async () => {
    const u = await newUser();
    const card = await labGet(req(u, `/api/objectives/${objective}/lab`, "GET"), { params: Promise.resolve({ id: objective }) });
    assert.equal(card.status, 200);
    assert.equal((await card.json()).lab?.prompt, "Inspect a service with systemctl.", "the lab card is shown");
    assert.equal(await tryItLab(u, objective), null, "so no Try it step");
    assert.deepEqual(tryItFields(await tryItLab(u, objective)), { labPrompt: null, labDisclaimer: null });
    const res = await labPost(req(u, `/api/objectives/${objective}/lab`), { params: Promise.resolve({ id: objective }) });
    assert.equal(res.status, 404);
    const n = await queryOne<{ n: number }>(`select count(*)::int as n from attempts where user_id = $1`, [u]);
    assert.equal(n?.n, 0);
  });

  test("a lab the learner can see counts: the lab card's prompt, or a build or case lab on the objective", async () => {
    const u = await newUser();
    const withPrompt = await findLabObjective(objective, u);
    assert.equal(await objectiveHasLab(u, withPrompt!), true);
    const built = randomUUID();
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'Built', 3)`, [built, unit]);
    const builtObj = await findLabObjective(built, u);
    assert.equal(await objectiveHasLab(u, builtObj!), false, "no prompt, no build or case lab");
    await query(
      `insert into labs (objective_id, slug, kind, title, brief, steps, rubric, source, review_status, content_hash)
       values ($1, 'rm-build', 'build', 'RM lab', 'A fictional brief long enough to pass.', $2, '[{"parts":[{"label":"P","criteria":"c","modelAnswer":"m"}]}]', 'authored', 'approved', 'h')`,
      [built, JSON.stringify([{ text: "RM lab: write the policy.", ask: "Name the statements." }])]
    );
    assert.equal(await objectiveHasLab(u, builtObj!), true, "a served build lab is a lab the learner can see");
  });

  test("no prompt, no Try it", async () => {
    const u = await newUser();
    const bare = randomUUID();
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'Bare', 2)`, [bare, unit]);
    assert.equal(await tryItLab(u, bare), null);
    const res = await labPost(req(u, `/api/objectives/${bare}/lab`), { params: Promise.resolve({ id: bare }) });
    assert.equal(res.status, 404);
  });
});

describe("one retention purge (B's windows, A's guarantees)", () => {
  test("deletes past each window, keeps what is inside it and any revoked token whose family is still live", async () => {
    const u = await newUser();
    const id = `rm-${run}`;
    const day = (n: number) => `now() - interval '${n} days'`;
    await query(
      `insert into auth_events (event_type, identifier, ip, created_at) values
         ('t', $1, '1.1.1.1', ${day(RETENTION.authEventsDays + 1)}), ('t', $1, '1.1.1.1', ${day(RETENTION.authEventsDays - 1)})`,
      [id]
    );
    await query(
      `insert into password_reset_tokens (user_id, token_hash, expires_at) values
         ($1, $2, ${day(RETENTION.expiredTokensDays + 1)}), ($1, $3, ${day(RETENTION.expiredTokensDays - 1)})`,
      [u, `old-${run}`, `new-${run}`]
    );
    const fam = randomUUID();
    const deadFam = randomUUID();
    await query(
      `insert into refresh_tokens (user_id, token_hash, family_id, expires_at, revoked_at) values
         ($1, $2, $4, now() + interval '30 days', ${day(RETENTION.endedSessionsDays + 5)}),
         ($1, $3, $4, now() + interval '30 days', null),
         ($1, $5, $6, ${day(RETENTION.endedSessionsDays + 2)}, ${day(RETENTION.endedSessionsDays + 5)})`,
      [u, `rev-live-${run}`, `live-${run}`, fam, `rev-dead-${run}`, deadFam]
    );
    await purgeExpired();
    const events = await query<{ n: number }>(`select count(*)::int as n from auth_events where identifier = $1`, [id]);
    assert.equal(events[0].n, 1);
    const resets = await query<{ token_hash: string }>(`select token_hash from password_reset_tokens where user_id = $1`, [u]);
    assert.deepEqual(resets.map((r) => r.token_hash), [`new-${run}`]);
    const tokens = await query<{ token_hash: string }>(`select token_hash from refresh_tokens where user_id = $1 order by token_hash`, [u]);
    assert.deepEqual(tokens.map((r) => r.token_hash), [`live-${run}`, `rev-live-${run}`]);
  });
});

// REQ-139 (FAIL-528): the "this wasn't me" link in the alert sent to the old
// address cancels a pending email change. The 7-day one-time-token window
// deleted the request it needs 7 days after the request expired, so the link
// stopped working; email-change records are now kept 30 days after expiry.
describe("email-change records outlive the other one-time tokens (REQ-139)", () => {
  const sha = (raw: string) => createHash("sha256").update(raw).digest("hex");

  test("windows: email change 30 days, every other window unchanged", () => {
    assert.equal(RETENTION.emailChangeDays, 30);
    assert.equal(RETENTION.expiredTokensDays, 7);
    assert.equal(RETENTION.endedSessionsDays, 30);
    assert.equal(RETENTION.authEventsDays, 90);
  });

  test("purge boundary: kept until 30 days after expiry, deleted after; other tokens still go at 7", async () => {
    const u = await newUser();
    const at = (days: number, hours: number) => `now() - interval '${days} days' ${hours >= 0 ? "-" : "+"} interval '${Math.abs(hours)} hours'`;
    await query(
      `insert into email_change_tokens (user_id, new_email, token_hash, expires_at) values
         ($1, 'n1@example.test', $2, ${at(RETENTION.emailChangeDays, -1)}),
         ($1, 'n2@example.test', $3, ${at(RETENTION.emailChangeDays, 1)}),
         ($1, 'n3@example.test', $4, ${at(RETENTION.expiredTokensDays, 1)})`,
      [u, `ec-inside-${run}`, `ec-past-${run}`, `ec-8d-${run}`]
    );
    await query(
      `insert into email_verification_tokens (user_id, token_hash, expires_at) values ($1, $2, ${at(RETENTION.expiredTokensDays, 1)})`,
      [u, `ev-8d-${run}`]
    );
    const out = await purgeExpired();
    assert.ok((out.email_change_tokens ?? 0) >= 1);
    const left = await query<{ token_hash: string }>(`select token_hash from email_change_tokens where user_id = $1 order by token_hash`, [u]);
    assert.deepEqual(left.map((r) => r.token_hash), [`ec-8d-${run}`, `ec-inside-${run}`]);
    const ev = await query(`select 1 from email_verification_tokens where user_id = $1`, [u]);
    assert.deepEqual(ev, [], "other one-time tokens keep the 7-day window");
  });

  test("the cancel link still works for a request that expired 8 days ago, after the purge has run", async () => {
    const u = await newUser();
    const cancel = `cancel-${run}-${randomUUID()}`;
    await query(
      `insert into email_change_tokens (user_id, new_email, token_hash, expires_at, cancel_token_hash, token_version)
       values ($1, 'thief@example.test', $2, now() - interval '8 days', $3, 0)`,
      [u, `ec-c-${run}`, sha(cancel)]
    );
    await query(
      `insert into refresh_tokens (user_id, token_hash, family_id, expires_at) values ($1, $2, $3, now() + interval '30 days')`,
      [u, `rt-c-${run}`, randomUUID()]
    );
    await purgeExpired();
    const r = await cancelEmailChangeToken(cancel);
    assert.equal(r.ok, true, r.message);
    const live = await query(`select 1 from refresh_tokens where user_id = $1 and revoked_at is null`, [u]);
    assert.deepEqual(live, [], "every device signed out");
  });
});
