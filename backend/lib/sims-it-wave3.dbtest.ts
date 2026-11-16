// REQ-297 (docs/sims.md 22.16, docs/sims-coverage-it.md): the IT sims of wave 3
// (terminal, security console and board, scenarios and bands) against a real
// Postgres with every migration applied. Documents are selected by slug from
// lib/sim/it-wave3.test.ts (FAIL-2000, FAIL-2002: never by course code, so a
// later wave in the same course cannot break this file). Stand-in courses
// carry the catalog objective titles, so the test does not depend on the
// catalog seed; the seed resolves each by course code and exact title and is
// idempotent; each screen's renderer is negotiated; pacing commands are
// refused; golden paths play through the routes to one attempt each. The
// model is faked. Built on lib/sims-security-w2.dbtest.ts (REQ-238).
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { query, closePool, sslOption } from "./db";
import { closeOwner } from "./test-owner";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { ALL_DOCUMENTS, loadDocument, type DocumentEntry } from "./sim/documents.ts";
import { replayGoldenPath, stateHash } from "./sim/engine/v1/index.ts";
import type { GoldenFile, GoldenPath, ScenarioDoc } from "./sim/engine/v1/index.ts";
import { replayRun } from "./sim/server-run.ts";
import { seedSims } from "../supabase/seed/sims-seed";
import { WAVE3 } from "./sim/it-wave3.ts";
import { GET as listGet } from "../app/api/sims/route";
import { POST as runsPost } from "../app/api/sims/[id]/runs/route";
import { POST as commandsPost } from "../app/api/sims/runs/[runId]/commands/route";
import { POST as reasoningPost } from "../app/api/sims/runs/[runId]/reasoning/route";
import { POST as finishPost } from "../app/api/sims/runs/[runId]/finish/route";

const run = Date.now().toString(36);
const COURSES = [...new Set(WAVE3.map((w) => w.course))];
const standIn = (c: string) => `W3${c.slice(0, 6)}-${run}`;
const tracks: Record<string, string> = Object.fromEntries(COURSES.map((c) => [standIn(c), randomUUID()]));
const users: string[] = [];
let pool: Pool;
let simIds: Record<string, string> = {};

const ALL = ["bedside@3", "board@3", "session@1", "security-console@1", "treatment-session@1", "terminal@1"];
const CAPS = `protocol=1;engine=1.2;renderers=${ALL.join(",")}`;
const without = (r: string) => `protocol=1;engine=1.2;renderers=${ALL.filter((x) => !x.startsWith(`${r}@`)).join(",")}`;

const SLUGS = new Set(WAVE3.map((w) => w.slug));
const SOURCES = ALL_DOCUMENTS.filter((e) => SLUGS.has(e.slug));
const entries = (): DocumentEntry[] => SOURCES.map((e) => ({ ...e, course: standIn(e.course) }));
const entryOf = (slug: string) => SOURCES.find((e) => e.slug === slug)!;
const docOf = (slug: string): ScenarioDoc => loadDocument(entryOf(slug));
const goldenOf = (slug: string): GoldenFile => JSON.parse(readFileSync(entryOf(slug).golden!, "utf8")) as GoldenFile;

let score: "met" | "partial" | "missed" = "met";

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `itw3-${run}-${users.length}@example.test`]);
  await recordStudyNoticeAcceptance(u);
  return u;
}
const req = (u: string, method = "GET", body?: unknown, caps: string = CAPS, url = "http://t/x") =>
  new Request(url, {
    method,
    headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json", "x-sim-caps": caps },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const json = async (res: Response) => ({ status: res.status, body: (await res.json()) as Record<string, any> });
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const runCtx = (runId: string) => ({ params: Promise.resolve({ runId }) });
const list = (u: string, track: string, caps = CAPS) => listGet(req(u, "GET", undefined, caps, `http://t/api/sims?trackId=${track}`)).then(json);
const start = (u: string, sim: string, caps = CAPS) => runsPost(req(u, "POST", { restart: true, deviceId: "dev-a" }, caps), idCtx(sim)).then(json);

function momentOpening(doc: ScenarioDoc, path: GoldenPath): { openedSeq: number; openedTick: number; moment: string } | null {
  for (let i = 0; i <= path.commands.length; i++) {
    const r = replayRun({ doc, seed: path.seed, from: null, commands: path.commands.slice(0, i), budget: 1e12 });
    if (r.run.state.openReasoning) return { openedSeq: i === 0 ? 0 : path.commands[i - 1].seq, openedTick: r.run.state.tick, moment: r.run.state.openReasoning };
  }
  return null;
}

async function playPath(u: string, slug: string, path: GoldenPath) {
  const doc = docOf(slug);
  const s = await start(u, simIds[slug]);
  assert.equal(s.status, 200, JSON.stringify(s.body));
  const runId = s.body.run.id as string;
  const lease = s.body.run.leaseEpoch as number;
  await query(`update sim_runs set seed = $2 where id = $1`, [runId, path.seed]);
  const open = momentOpening(doc, path);
  const grade = path.reasoning?.writeup ?? "missed";
  const cut = open ? open.openedSeq : path.commands.length;
  const before = path.commands.filter((c) => c.seq <= cut);
  const rest = path.commands.filter((c) => c.seq > cut);
  if (before.length) {
    const r = await commandsPost(req(u, "POST", { leaseEpoch: lease, commands: before, tick: open ? open.openedTick : undefined }), runCtx(runId)).then(json);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.rejected, null, JSON.stringify(r.body.rejected));
  }
  if (open && grade !== "missed") {
    score = grade as "met" | "partial";
    const g = await reasoningPost(req(u, "POST", { momentId: open.moment, openedSeq: open.openedSeq, openedTick: open.openedTick, answer: "Read the evidence first, made the change that fixes it, and checked it worked.", clientAttemptId: randomUUID() }), runCtx(runId)).then(json);
    assert.equal(g.status, 200, JSON.stringify(g.body));
  }
  const expected = replayGoldenPath(doc, structuredClone(path), (r) => stateHash(r.state));
  if (rest.length) {
    await query(`update sim_runs set last_sync_at = null where id = $1`, [runId]);
    const r = await commandsPost(req(u, "POST", { leaseEpoch: lease, commands: rest, tick: expected.finalTick }), runCtx(runId)).then(json);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.rejected, null, JSON.stringify(r.body.rejected));
    assert.equal(r.body.serverHash, expected.stateHash, "the server's replay reaches the engine's state");
  }
  const f = await finishPost(req(u, "POST", { leaseEpoch: lease, tick: expected.finalTick }), runCtx(runId)).then(json);
  assert.equal(f.status, 200, JSON.stringify(f.body));
  return f.body;
}

before(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 2 });
  setAiCallSink(null);
  for (const [code, id] of Object.entries(tracks)) {
    const unit = randomUUID();
    await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'IT wave 3 stand-in', 'certification', null)`, [id, code]);
    await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Unit', 0, 100)`, [unit, id]);
    const titles = SOURCES.filter((e) => standIn(e.course) === code).map((e) => loadDocument(e).objective);
    let i = 0;
    for (const t of titles) await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [randomUUID(), unit, t, i++]);
  }
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async (body: any) => {
        const text = JSON.stringify(body);
        if (!text.includes("Rubric parts:")) throw new Error("unexpected model call");
        const labels = [...text.matchAll(/\\n(\d+)\. ([^\\]+)\\n   Criteria:/g)].map((m) => m[2]);
        const out = {
          verdict: score === "met" ? "correct" : score === "partial" ? "partial" : "incorrect",
          feedback: `fake ${score}`,
          classification: "none",
          missedParts: score === "missed" ? labels : [],
          fixNext: "FIX",
          parts: labels.map((part) => ({ part, score, comment: "c" })),
        };
        return { parsed_output: out, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
      },
    },
  } as any);
});

beforeEach(() => {
  process.env.SIMS_ENABLED = "on";
  delete process.env.SIMS_RENDERERS;
  delete process.env.BILLING_ENABLED;
  score = "met";
});

after(async () => {
  __setClientForTest(null);
  delete process.env.SIMS_ENABLED;
  const ids = Object.values(simIds);
  await query(`delete from attempts where sim_id = any($1::uuid[])`, [ids]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from sims where objective_id in (select o.id from objectives o join course_units cu on cu.id = o.unit_id where cu.track_id = any($1::uuid[]))`, [Object.values(tracks)]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [Object.values(tracks)]);
  await pool.end();
  await closePool();
  await closeOwner();
});

describe("seeding the REQ-297 sims", () => {
  test("every wave 3 sim resolves to its objective on its screen, and a second seed changes nothing", async () => {
    assert.equal(SOURCES.length, WAVE3.length);
    const first = await seedSims(pool, entries());
    assert.deepEqual(first.map((r) => r.change), Array(WAVE3.length).fill("new"));
    simIds = Object.fromEntries(first.map((r) => [r.slug, r.simId]));
    const rows = await query<{ slug: string; screen_type: string; objective: string; code: string; family: string }>(
      `select s.slug, s.screen_type, o.title as objective, st.code, s.safety_family as family
         from sims s join objectives o on o.id = s.objective_id join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
        where s.id = any($1::uuid[]) order by s.slug`,
      [Object.values(simIds)]
    );
    assert.equal(rows.length, WAVE3.length);
    for (const r of rows) {
      const w = WAVE3.find((x) => x.slug === r.slug)!;
      assert.equal(r.screen_type, w.screen, r.slug);
      assert.equal(r.objective, docOf(r.slug).objective);
      assert.equal(r.code, standIn(w.course));
      assert.equal(r.family, "general");
    }
    const again = await seedSims(pool, entries());
    assert.ok(again.every((r) => r.change === "unchanged"));
  });
});

describe("renderers and pacing", () => {
  test("an app with the screen's renderer can run each sim; one without it is told to update", async () => {
    const u = await newUser();
    for (const w of WAVE3) {
      const t = tracks[standIn(w.course)];
      const l = await list(u, t);
      assert.equal(l.status, 200);
      const mine = l.body.sims.find((s: any) => s.id === simIds[w.slug]);
      assert.ok(mine, w.slug);
      assert.equal(mine.screenType, w.screen);
      assert.equal(mine.runnable, true, w.slug);
      const old = await list(u, t, without(w.screen));
      assert.equal(old.body.sims.find((s: any) => s.id === simIds[w.slug]).runnable, false, w.slug);
    }
    for (const screen of ["terminal", "security-console"]) {
      const w = WAVE3.find((x) => x.screen === screen)!;
      const s = await start(u, simIds[w.slug], without(screen));
      assert.equal(s.status, 409, w.slug);
      assert.equal(s.body.code, "app_update_required");
    }
  });

  test("learner-paced: a pace command is refused", async () => {
    const u = await newUser();
    const s = await start(u, simIds["firewall-change-backout"]);
    assert.equal(s.status, 200, JSON.stringify(s.body));
    const r = await commandsPost(req(u, "POST", { leaseEpoch: s.body.run.leaseEpoch, commands: [{ seq: 1, tick: 0, type: "pace", pace: 3 }] }), runCtx(s.body.run.id)).then(json);
    assert.ok(r.status >= 400 || r.body.rejected, JSON.stringify(r.body));
  });
});

describe("golden paths through the routes: one attempt each, the rating as verdict", () => {
  // the expert path and the first Bad path of every wave 3 document
  for (const w of WAVE3) {
    const g = JSON.parse(readFileSync(ALL_DOCUMENTS.find((e) => e.slug === w.slug)!.golden!, "utf8")) as GoldenFile;
    const ids = [g.paths.find((p) => p.id === "expert")!.id, g.paths.find((p) => p.expect.rating === "bad")!.id];
    for (const id of ids) {
      test(`${w.slug}/${id}`, async () => {
        const u = await newUser();
        const path = goldenOf(w.slug).paths.find((p) => p.id === id)!;
        const d = await playPath(u, w.slug, path);
        assert.equal(d.ending, path.expect.ending);
        assert.equal(d.outcomeClass, path.expect.class);
        assert.equal(d.rating, path.expect.rating);
        if (path.expect.score !== undefined) assert.equal(d.processScore, path.expect.score);
        const verdict = { good: "correct", mediocre: "partial", bad: "incorrect" }[path.expect.rating as string];
        const a = await query<{ kind: string; verdict: string; question: string }>(
          `select kind::text as kind, verdict::text as verdict, question from attempts where user_id = $1 and sim_id = $2`,
          [u, simIds[w.slug]]
        );
        assert.equal(a.length, 1);
        assert.deepEqual(a[0], { kind: "simtask", verdict, question: docOf(w.slug).title });
      });
    }
  }
});
