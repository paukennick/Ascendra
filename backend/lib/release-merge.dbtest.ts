// Release 2026-11-07: the places where line A and line B met, against a real
// Postgres with every migration applied (052 and 053 included). No model is
// called. See docs/release-2026-11-07.md for what each resolution keeps.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { signAccessToken } from "./auth/tokens";
import { recordLabCompletion, findLabObjective, tryItLab, tryItFields } from "./lab-attempts";
import { latestLabReport } from "./lesson-experience";
import { purgeExpired, RETENTION } from "./retention";
import { POST as labPost } from "../app/api/objectives/[id]/lab/route";

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

  test("the lesson's Try it fields carry the prompt and the lab disclaimer; POST records through the route", async () => {
    const u = await newUser();
    const lab = await tryItLab(u, objective);
    assert.equal(lab?.prompt, "Inspect a service with systemctl.");
    const fields = tryItFields(lab);
    assert.equal(fields.labPrompt, "Inspect a service with systemctl.");
    assert.ok(fields.labDisclaimer && fields.labDisclaimer.lines.length >= 1);
    const res = await labPost(req(u, `/api/objectives/${objective}/lab`), { params: Promise.resolve({ id: objective }) });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).recorded, true);
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
