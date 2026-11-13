// REQ-253 (migration 079): lesson primers ("Key terms") against a real
// Postgres with every migration applied. The model and the Batches API are
// fakes: no key, no network.
//
//   - migration 079: the table, its checks, cascade, RLS and API-role lock-out,
//     app_runtime's grants, item_kind 'primer' on item_holdbacks, a replay
//   - GET /api/objectives/:id/primer: written on first use, stored, cached,
//     rewritten when the lesson changes, held back (nothing stored, a 409),
//     access (404 for an unseen or retired objective, 409 before the lesson
//     exists), the learner's plan allowance untouched, the calls charged to them
//   - ensurePrimer: one write for concurrent requests; a lesson that changes
//     while the primer is written is not stored over
//   - pre-generation, primers mode: eligibility, submit under the cap,
//     collect through the checks with insert-if-absent and counts-only logs
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
const run = Date.now().toString(36);
process.env.ANTHROPIC_MODEL = `claude-sonnet-5-5-pr${run}`;
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query, queryOne, closePool } from "./db";
import { ownerQuery, closeOwner } from "./test-owner";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { flushAiCallLog, setAiCallSink } from "./ai-calls";
import { checkSchema, SCHEMA_PROBES } from "./schema-status";
import { saveLesson } from "./lesson-store";
import { loadObjective } from "./lesson-generation";
import { ensurePrimer, getPrimerRow, lessonHash, primerSourceOf, savePrimer, type PrimerContent, type PrimerWriter } from "./primers";
import { collectPrimersRun, selectPrimerCandidates, submitPrimersRun, primerRequestId } from "./pregen-primers";
import type { BatchInfo, BatchesClient } from "./pregen";
import { GET as primerGet } from "../app/api/objectives/[id]/primer/route";

const MODEL = process.env.ANTHROPIC_MODEL!;
const track = randomUUID();
const hiddenTrack = randomUUID();
const pgTrack = randomUUID();
const pgUnit = randomUUID();
const unit = randomUUID();
const hiddenUnit = randomUUID();
const users: string[] = [];
const ids: Record<string, string> = {};
const TITLE = "Variables and Python's core built-in types (int, float, str)";

const LESSON = {
  guessPrompt: "What do you think type(3.0) shows?",
  teach: "A variable is a name bound to a value. The core types are int (whole numbers), float (decimals) and str (text).",
  teachCards: null,
  fadeProblem: "x = 3.0. What is type(x)?",
  fadeChoices: ["float", "int", "str", "bool"],
  fadeCorrectIndex: 0,
  fadeWhy: "3.0 has a decimal point, so it is a float.",
  soloCheck: "Which of these is a str?",
  soloChoices: ["\"7\"", "7", "7.0", "True"],
  soloCorrectIndex: 0,
  soloWhy: "Quotes make text.",
  fadeOptionReasons: null,
  soloOptionReasons: null,
};

const T = (term: string, plain: string) => ({ term, plain, example: `Like a labeled jar for ${term}.`, examWording: `Python documentation: ${term}.` });
function primerBody(over: Partial<{ confidence: string; terms: unknown[] }> = {}) {
  return {
    terms: [
      T("variable", "A variable is a name that points to a value."),
      T("int", "An int is a whole number with no decimal point."),
      T("float", "A float is a number with a decimal point."),
      T("str", "A str is a piece of text."),
    ],
    confidence: "high",
    uncertainClaims: [],
    ...over,
  };
}

// --- the fake model ------------------------------------------------------------
let writerCalls = 0;
let checkerCalls = 0;
let writerOut: () => Record<string, unknown> = () => primerBody();
let checkerAnswer: (key: string) => number = () => 0;
let writerUserTurns: string[] = [];

function installModel() {
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("no create expected");
      },
      parse: async (body: any) => {
        const system = JSON.stringify(body.system);
        const user: string = body.messages[0].content;
        if (system.includes("independent fact-checker")) {
          checkerCalls++;
          const keys = [...user.matchAll(/<item key="(\w+)"/g)].map((m) => m[1]);
          return { parsed_output: { results: keys.map((k) => ({ key: k, answer: [checkerAnswer(k)], unsupportedClaims: [] })) }, stop_reason: "end_turn", usage: { input_tokens: 900, output_tokens: 400 } };
        }
        if (system.includes("Key terms")) {
          writerCalls++;
          writerUserTurns.push(user);
          return { parsed_output: writerOut(), stop_reason: "end_turn", usage: { input_tokens: 1500, output_tokens: 600 } };
        }
        throw new Error("unexpected model call");
      },
    },
  } as never);
}

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `primer-${run}-${users.length}@example.test`]);
  return u;
}
const req = (u: string, id: string) =>
  new Request(`http://t/api/objectives/${id}/primer`, { headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}` } });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
async function json<R = any>(res: Response, status = 200): Promise<R> {
  const body = await res.json();
  assert.equal(res.status, status, JSON.stringify(body));
  return body as R;
}

async function objective(key: string, unitId: string, sort: number, opts: { title?: string; retired?: boolean } = {}) {
  const id = randomUUID();
  ids[key] = id;
  await query(`insert into objectives (id, unit_id, title, sort_order, retired_at) values ($1, $2, $3, $4, $5)`, [
    id,
    unitId,
    opts.title ?? TITLE,
    sort,
    opts.retired ? new Date(Date.now() - 86_400_000) : null,
  ]);
}

before(async () => {
  setAiCallSink(null);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Python Programming', 'certification', null)`, [track, `PRA${run}`.toUpperCase()]);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id, hidden_at) values ($1, $2, 'Hidden', 'certification', null, now() - interval '1 day')`, [hiddenTrack, `PRH${run}`.toUpperCase()]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'Basics', 1)`, [unit, track]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'Hidden unit', 1)`, [hiddenUnit, hiddenTrack]);
  // Pre-generation runs on a track of its own.
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Python Programming', 'certification', null)`, [pgTrack, `PRG${run}`.toUpperCase()]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'Basics', 1)`, [pgUnit, pgTrack]);
  for (const [k, i] of [["route", 1], ["stale", 2], ["held", 3], ["race", 4], ["nolesson", 5], ["changed", 9]] as const) await objective(k, unit, i);
  for (const [k, i] of [["pg1", 1], ["pg2", 2], ["pgHas", 3]] as const) await objective(k, pgUnit, i);
  await objective("retired", unit, 20, { retired: true });
  await objective("hidden", hiddenUnit, 1);
  for (const k of ["route", "stale", "held", "race", "pg1", "pg2", "pgHas", "changed", "retired", "hidden"]) await saveLesson({ kind: "shared" }, ids[k], LESSON as never, MODEL);
});

after(async () => {
  __setClientForTest(null);
  await flushAiCallLog();
  await query(`delete from ai_calls where model = $1`, [MODEL]);
  await query(`delete from item_holdbacks where objective_id = any($1::uuid[])`, [Object.values(ids)]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track, hiddenTrack, pgTrack]]);
  if (users.length) await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await closeOwner();
  await closePool();
});

beforeEach(() => {
  writerCalls = 0;
  checkerCalls = 0;
  writerUserTurns = [];
  writerOut = () => primerBody();
  checkerAnswer = () => 0;
  installModel();
});

// ---------------------------------------------------------------------------

describe("migration 079", () => {
  test("schema-status probes it", async () => {
    const probes = SCHEMA_PROBES.filter((p) => p.migration === "079_lesson_primers.sql");
    assert.equal(probes.length, 1);
    assert.deepEqual((await checkSchema((sql) => query<{ ok: boolean }>(sql), probes)).missing, []);
  });

  test("FAIL-1720: 079 restates 067's item_holdbacks check under 067's name; both probes pass, and a replay of 067 keeps 'primer'", async () => {
    const p067 = SCHEMA_PROBES.filter((p) => p.migration === "067_sim_item_kind.sql");
    assert.equal(p067.length, 1);
    assert.deepEqual((await checkSchema((sql) => query<{ ok: boolean }>(sql), p067)).missing, []);
    assert.deepEqual((await checkSchema((sql) => query<{ ok: boolean }>(sql), SCHEMA_PROBES)).missing, [], "every probe passes with 079 applied");
    // 067 replayed (as lib/sims.dbtest.ts does): 'primer' is still allowed.
    const sql067 = readFileSync(join(__dirname, "..", "supabase", "migrations", "067_sim_item_kind.sql"), "utf8");
    await ownerQuery(`begin; ${sql067}; commit;`);
    await query(`insert into item_holdbacks (item_kind, objective_id, reason, claims, content) values ('primer', $1, 'uncertain', '[]', 'null')`, [ids.nolesson]);
    await query(`delete from item_holdbacks where objective_id = $1`, [ids.nolesson]);
    assert.deepEqual((await checkSchema((sql) => query<{ ok: boolean }>(sql), SCHEMA_PROBES)).missing, []);
  });

  test("terms must be a 1-12 item array and the hash 64 hex characters", async () => {
    const id = ids.nolesson;
    const ins = (terms: string, hash: string) =>
      query(`insert into lesson_primers (objective_id, terms, source_lesson_hash, model) values ($1, $2::jsonb, $3, 'm')`, [id, terms, hash]);
    const h = "a".repeat(64);
    await assert.rejects(ins("[]", h), /lesson_primers_terms_079/);
    await assert.rejects(ins("{}", h), /lesson_primers_terms_079/);
    await assert.rejects(ins(JSON.stringify(Array.from({ length: 13 }, () => ({}))), h), /lesson_primers_terms_079/);
    await assert.rejects(ins('[{"term":"x"}]', "not-a-hash"), /lesson_primers_hash_079/);
    await ins('[{"term":"x"}]', h);
    await query(`delete from lesson_primers where objective_id = $1`, [id]);
  });

  test("a primer is deleted with its objective", async () => {
    const tmp = randomUUID();
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'tmp', 99)`, [tmp, unit]);
    await query(`insert into lesson_primers (objective_id, terms, source_lesson_hash, model) values ($1, '[{"term":"x"}]', $2, 'm')`, [tmp, "b".repeat(64)]);
    await query(`delete from objectives where id = $1`, [tmp]);
    assert.equal(await queryOne(`select 1 from lesson_primers where objective_id = $1`, [tmp]), null);
  });

  test("RLS on, the API roles locked out, app_runtime has DML only", async () => {
    const r = await ownerQuery<{ rls: boolean; anon: boolean; authd: boolean; rt_sel: boolean; rt_ins: boolean; rt_upd: boolean; rt_del: boolean; rt_trunc: boolean; policy: boolean }>(
      `select c.relrowsecurity as rls,
              has_table_privilege('anon', 'lesson_primers', 'select') as anon,
              has_table_privilege('authenticated', 'lesson_primers', 'select') as authd,
              has_table_privilege('app_runtime', 'lesson_primers', 'select') as rt_sel,
              has_table_privilege('app_runtime', 'lesson_primers', 'insert') as rt_ins,
              has_table_privilege('app_runtime', 'lesson_primers', 'update') as rt_upd,
              has_table_privilege('app_runtime', 'lesson_primers', 'delete') as rt_del,
              has_table_privilege('app_runtime', 'lesson_primers', 'truncate') as rt_trunc,
              exists(select 1 from pg_policies where tablename = 'lesson_primers' and policyname = 'app_runtime_all') as policy
         from pg_class c where c.relname = 'lesson_primers'`
    );
    assert.deepEqual(r[0], { rls: true, anon: false, authd: false, rt_sel: true, rt_ins: true, rt_upd: true, rt_del: true, rt_trunc: false, policy: true });
  });

  test("item_holdbacks takes item_kind 'primer' and still refuses an unknown kind", async () => {
    await query(`insert into item_holdbacks (item_kind, objective_id, reason, claims, content) values ('primer', $1, 'uncertain', '[]', 'null')`, [ids.nolesson]);
    await assert.rejects(query(`insert into item_holdbacks (item_kind, objective_id, reason, claims, content) values ('nonsense', $1, 'uncertain', '[]', 'null')`, [ids.nolesson]));
    const kinds = await ownerQuery<{ conname: string }>(`select conname from pg_constraint where conrelid = 'item_holdbacks'::regclass and pg_get_constraintdef(oid) like '%item_kind%'`);
    assert.deepEqual(kinds.map((k) => k.conname), ["item_holdbacks_item_kind_067"], "restated under 067's own name (FAIL-1720)");
    await query(`delete from item_holdbacks where objective_id = $1`, [ids.nolesson]);
  });

  test("applying 079 again changes nothing (safe to run twice)", async () => {
    const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", "079_lesson_primers.sql"), "utf8");
    await ownerQuery(`begin; ${sql}; commit;`.replace("set local lock_timeout", "set local lock_timeout"));
    const n = await ownerQuery<{ n: number }>(`select count(*)::int as n from pg_constraint where conname like 'lesson_primers_%_079'`);
    assert.equal(n[0].n, 2);
    const hb = await ownerQuery<{ n: number }>(`select count(*)::int as n from pg_constraint where conrelid = 'item_holdbacks'::regclass and pg_get_constraintdef(oid) like '%item_kind%'`);
    assert.equal(hb[0].n, 1);
  });
});

describe("GET /api/objectives/:id/primer", () => {
  test("first use writes, checks and stores the primer; the next request is served from the table with no model call", async () => {
    const u = await newUser();
    const body = await json(await primerGet(req(u, ids.route), params(ids.route)));
    assert.equal(body.cached, false);
    assert.deepEqual(body.primer.terms.map((t: any) => t.term), ["variable", "int", "float", "str"]);
    assert.ok(body.primer.terms.every((t: any) => t.plain && t.example && t.examWording));
    assert.equal(writerCalls, 1);
    assert.equal(checkerCalls, 1);
    // Written from the shared lesson, intro and practice.
    assert.match(writerUserTurns[0], /A variable is a name bound to a value/);
    assert.match(writerUserTurns[0], /Which of these is a str\?/);
    const row = await getPrimerRow(ids.route);
    assert.equal(row!.source_lesson_hash, lessonHash(primerSourceOf((await queryOne<any>(`select * from lesson_content where objective_id = $1`, [ids.route]))!)));
    assert.deepEqual(Object.keys((row!.terms as any[])[0]).sort(), ["exam_wording", "example", "plain", "term"]);

    const again = await json(await primerGet(req(await newUser(), ids.route), params(ids.route)));
    assert.equal(again.cached, true);
    assert.equal(writerCalls, 1, "no second write");
  });

  test("the calls are charged to the learner who opened it (REQ-202) and use no plan allowance", async () => {
    const u = await newUser();
    await json(await primerGet(req(u, ids.stale), params(ids.stale)));
    await flushAiCallLog();
    const calls = await query<{ purpose: string }>(`select purpose from ai_calls where user_id = $1 and model = $2 order by purpose`, [u, MODEL]);
    assert.deepEqual(calls.map((c) => c.purpose), ["fact_check", "primer"]);
    const uses = await queryOne<{ n: number }>(`select count(*)::int as n from allowance_uses where user_id = $1`, [u]);
    assert.equal(uses!.n, 0);
  });

  test("a changed lesson makes the primer stale: rewritten on next use and replaced", async () => {
    const u = await newUser();
    const first = await json(await primerGet(req(u, ids.stale), params(ids.stale)));
    assert.equal(first.cached, true);
    await query(`update lesson_content set teach = teach || ' A float can also be written 1e3.' where objective_id = $1`, [ids.stale]);
    writerOut = () => primerBody({ terms: [T("variable", "A variable is a name that points to a value."), T("int", "An int is a whole number."), T("float", "A float has a decimal point."), T("str", "A str is text.")] });
    const second = await json(await primerGet(req(u, ids.stale), params(ids.stale)));
    assert.equal(second.cached, false);
    assert.notEqual(second.primer.lessonHash, first.primer.lessonHash);
    assert.equal(writerCalls, 1);
    assert.equal((await getPrimerRow(ids.stale))!.source_lesson_hash, second.primer.lessonHash);
  });

  test("held back twice (the fact-check disputes a definition): a 409 naming the reason, nothing stored, both drafts logged", async () => {
    const u = await newUser();
    checkerAnswer = (k) => (k === "term_1" ? 1 : 0);
    const body = await json(await primerGet(req(u, ids.held), params(ids.held)), 409);
    assert.equal(body.held, true);
    assert.match(body.error, /second check/);
    assert.equal(writerCalls, 2, "one steered retry");
    assert.match(writerUserTurns[1], /int: independent answer disagreed/);
    assert.equal(await getPrimerRow(ids.held), null);
    const held = await query<{ item_kind: string; reason: string }>(`select item_kind, reason from item_holdbacks where objective_id = $1 order by created_at`, [ids.held]);
    assert.deepEqual(held.map((h) => [h.item_kind, h.reason]), [["primer", "fact_check"], ["primer", "fact_check"]]);
  });

  test("a hard problem twice (a lesson term left out): a 409 retryable, nothing stored", async () => {
    const u = await newUser();
    writerOut = () => primerBody({ terms: [T("variable", "A variable is a name that points to a value.")] });
    const body = await json(await primerGet(req(u, ids.race), params(ids.race)), 409);
    assert.equal(body.retryable, true);
    assert.equal(checkerCalls, 0);
    assert.equal(await getPrimerRow(ids.race), null);
  });

  test("access: 404 for a retired, unseen or malformed objective; 409 lesson_not_ready before the lesson exists; 401 signed out", async () => {
    const u = await newUser();
    await json(await primerGet(req(u, ids.retired), params(ids.retired)), 404);
    await json(await primerGet(req(u, randomUUID()), params(randomUUID())), 404);
    await json(await primerGet(req(u, "not-a-uuid"), params("not-a-uuid")), 404);
    const nl = await json(await primerGet(req(u, ids.nolesson), params(ids.nolesson)), 409);
    assert.equal(nl.code, "lesson_not_ready");
    const anon = await primerGet(new Request(`http://t/api/objectives/${ids.route}/primer`), params(ids.route));
    assert.equal(anon.status, 401);
    // A private course of another learner is invisible.
    const other = await newUser();
    const priv = randomUUID();
    const pu = randomUUID();
    const po = randomUUID();
    await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Mine', 'certification', $3)`, [priv, `PRP${run}`.toUpperCase(), other]);
    await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'u', 1)`, [pu, priv]);
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'o', 1)`, [po, pu]);
    await json(await primerGet(req(u, po), params(po)), 404);
    await query(`delete from subject_tracks where id = $1`, [priv]);
    assert.equal(writerCalls, 0);
  });

  test("the 18+ rule: a mental health course needs the confirmation (403 mature_content_required)", async () => {
    const u = await newUser();
    const sub = await queryOne<{ id: string }>(`select s.id from education_subcategories s join education_categories c on c.id = s.category_id where c.slug = 'mental-health' limit 1`);
    const mh = randomUUID();
    const mu = randomUUID();
    const mo = randomUUID();
    await query(`insert into subject_tracks (id, code, title, track_type, user_id, subcategory_id) values ($1, $2, 'MH', 'certification', null, $3)`, [mh, `PRM${run}`.toUpperCase(), sub!.id]);
    await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'u', 1)`, [mu, mh]);
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'o', 1)`, [mo, mu]);
    const body = await json(await primerGet(req(u, mo), params(mo)), 403);
    assert.equal(body.code, "mature_content_required");
    await query(`delete from subject_tracks where id = $1`, [mh]);
  });
});

describe("ensurePrimer", () => {
  const lessonOf = async (id: string) => (await queryOne<any>(`select * from lesson_content where objective_id = $1`, [id]))!;
  const deps = (write: PrimerWriter) => ({ write, model: MODEL, userId: null, log: () => {} });
  const good = (): PrimerContent => ({
    terms: primerBody().terms.map((t: any) => ({ term: t.term, plain: t.plain, example: t.example, examWording: t.examWording })),
    confidence: "high",
    uncertainClaims: [],
  });

  test("two requests at once share one write", async () => {
    await query(`delete from lesson_primers where objective_id = $1`, [ids.race]);
    const obj = (await loadObjective(ids.race))!;
    const lesson = await lessonOf(ids.race);
    let n = 0;
    const write: PrimerWriter = async () => {
      n++;
      await new Promise((r) => setTimeout(r, 50));
      return good();
    };
    const opts = { userId: "x", deps: deps(write), currentLesson: () => lessonOf(ids.race) };
    const [a, b] = await Promise.all([ensurePrimer(ids.race, obj, lesson, opts), ensurePrimer(ids.race, obj, lesson, opts)]);
    assert.equal(n, 1);
    assert.equal(a.row.source_lesson_hash, b.row.source_lesson_hash);
  });

  test("a lesson that changes while the primer is written is not stored over", async () => {
    const obj = (await loadObjective(ids.changed))!;
    const lesson = await lessonOf(ids.changed);
    const res = await ensurePrimer(ids.changed, obj, lesson, {
      userId: "x",
      deps: deps(async () => good()),
      currentLesson: async () => ({ ...lesson, teach: `${lesson.teach} Changed.` }),
    });
    assert.equal(res.stored, false);
    assert.equal(await getPrimerRow(ids.changed), null);
  });

  test("savePrimer: the same lesson keeps the first row; an older one is replaced", async () => {
    const id = ids.changed;
    const h1 = "1".repeat(64);
    const h2 = "2".repeat(64);
    const first = await savePrimer(id, good(), h1, "m1");
    const same = await savePrimer(id, { ...good(), terms: good().terms.slice(0, 1) }, h1, "m2");
    assert.equal(same.model, "m1");
    assert.equal((same.terms as unknown[]).length, (first.terms as unknown[]).length);
    const next = await savePrimer(id, good(), h2, "m3");
    assert.equal(next.model, "m3");
    await query(`delete from lesson_primers where objective_id = $1`, [id]);
  });
});

// ---------------------------------------------------------------------------
// Pre-generation, primers mode
// ---------------------------------------------------------------------------

class FakeBatches implements BatchesClient {
  created: { id: string; requests: { custom_id: string; params: Record<string, any> }[] }[] = [];
  results_ = new Map<string, unknown[]>();
  private n = 0;
  async create(p: { requests: { custom_id: string; params: Record<string, unknown> }[] }) {
    const id = `msgbatch_PRIMER${run}${++this.n}`;
    this.created.push({ id, requests: p.requests as never });
    return { id };
  }
  async retrieve(id: string): Promise<BatchInfo> {
    return { id, processing_status: "ended", request_counts: { succeeded: 1 }, created_at: "2026-11-12T00:00:00Z", ended_at: "2026-11-12T01:00:00Z" };
  }
  async results(id: string) {
    const lines = this.results_.get(id) ?? [];
    return (async function* () {
      for (const l of lines) yield l;
    })();
  }
  list() {
    return (async function* () {})();
  }
}

const line = (objectiveId: string, body: unknown) => ({
  custom_id: primerRequestId(objectiveId),
  result: { type: "succeeded", message: { content: [{ type: "text", text: JSON.stringify(body) }], stop_reason: "end_turn", model: MODEL, usage: { input_tokens: 1500, output_tokens: 700 } } },
});

describe("pre-generation: primers", () => {
  const code = `PRG${run}`.toUpperCase();
  test("eligible: a servable shared lesson and no primer, active, listed, in priority order", async () => {
    await query(`insert into lesson_primers (objective_id, terms, source_lesson_hash, model) values ($1, '[{"term":"x"}]', $2, 'm') on conflict do nothing`, [ids.pgHas, "c".repeat(64)]);
    const rows = await selectPrimerCandidates({ tracks: [code] });
    const got = rows.map((r) => r.objective_id);
    assert.ok(got.includes(ids.pg1) && got.includes(ids.pg2));
    assert.ok(!got.includes(ids.pgHas), "already has a primer");
    assert.ok(!got.includes(ids.nolesson), "no lesson to write from");
    assert.ok(!got.includes(ids.retired), "retired");
    assert.ok(!(await selectPrimerCandidates({ tracks: [`PRH${run}`.toUpperCase()] })).length, "hidden track");
    assert.ok(got.indexOf(ids.pg1) < got.indexOf(ids.pg2));
  });

  test("submit refuses a cap below the first unit, builds requests with purpose pregen_primer otherwise; collect checks, saves insert-if-absent, logs counts only", async () => {
    const batches = new FakeBatches();
    const logs: string[] = [];
    const ctx = { batches, log: (m: string) => logs.push(m) };
    await assert.rejects(submitPrimersRun({ tracks: [code], limit: 2, maxUsd: 0.01, dryRun: false, allowConcurrent: false }, ctx), /over --max-usd/);
    const s = await submitPrimersRun({ tracks: [code], limit: 2, maxUsd: 5, dryRun: false, allowConcurrent: false }, ctx);
    assert.equal(s.kind, "primers");
    assert.equal(batches.created.length, 1);
    const reqs = batches.created[0].requests;
    assert.deepEqual(reqs.map((r) => r.custom_id).sort(), [primerRequestId(ids.pg1), primerRequestId(ids.pg2)].sort());
    assert.match(JSON.stringify(reqs[0].params.messages), /lesson_text/);

    // pg1 comes back clean; pg2 leaves out a lesson term and its live retry repeats it.
    batches.results_.set(s.batchId!, [line(ids.pg1, primerBody()), line(ids.pg2, primerBody({ terms: [T("variable", "A variable is a name.")] }))]);
    const retried: string[] = [];
    const out = await collectPrimersRun({ batchId: s.batchId!, tracks: [code], maxUsd: 5, dryRun: false }, {
      ...ctx,
      retryWriter: async ({ obj }) => {
        retried.push(obj.title);
        return { terms: [{ term: "variable", plain: "A variable is a name.", example: "e", examWording: "w" }], confidence: "high", uncertainClaims: [] };
      },
    });
    assert.equal(out.saved, 1);
    assert.equal(out.failed, 1);
    assert.equal(retried.length, 1);
    assert.ok(await getPrimerRow(ids.pg1));
    assert.equal(await getPrimerRow(ids.pg2), null);
    assert.ok(Object.keys(out.problemKinds ?? {}).some((k) => /no key term explains/.test(k)));
    const all = logs.join("\n");
    assert.ok(!all.includes("A variable is a name"), "no primer text in the log");
    assert.ok(!all.includes("bound to a value"), "no lesson text in the log");
    await flushAiCallLog();
    const purposes = await query<{ purpose: string }>(`select distinct purpose from ai_calls where model = $1 and user_id is null order by 1`, [MODEL]);
    assert.ok(purposes.some((p) => p.purpose === "pregen_primer"), JSON.stringify(purposes));
    assert.ok(purposes.some((p) => p.purpose === "pregen_fact_check"), JSON.stringify(purposes));

    // Collecting again does not save over pg1's stored primer; pg2, still
    // missing, gets its retry again and this time it passes.
    const pg1Before = await getPrimerRow(ids.pg1);
    const again = await collectPrimersRun({ batchId: s.batchId!, tracks: [code], maxUsd: 5, dryRun: false }, { ...ctx, retryWriter: async () => good() });
    assert.equal(again.alreadyHadOne, 1);
    assert.equal(again.saved, 1);
    assert.equal(again.savedAfterRetry, 1);
    assert.deepEqual(await getPrimerRow(ids.pg1), pg1Before);
  });
});

function good(): PrimerContent {
  return { terms: primerBody().terms.map((t: any) => ({ term: t.term, plain: t.plain, example: t.example, examWording: t.examWording })), confidence: "high", uncertainClaims: [] };
}
