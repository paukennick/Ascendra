// REQ-231 (docs/sims.md 20, 22.7): the Security+ incidents on the security
// console against a real Postgres with every migration applied. Stand-in
// courses carry the SY0-701 and SY0-801 objective titles, so the test does not
// depend on the catalog seed: the seed resolves each document (the V8 ones are
// bands) by course code and exact title and is idempotent; the console
// renderer is negotiated (security-console@1, FAIL-1320) and switched by
// SIMS_RENDERERS; pacing commands are refused (learner-paced); golden paths
// play through the routes to one attempt each. The model is faked.
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
import { GET as listGet } from "../app/api/sims/route";
import { POST as runsPost } from "../app/api/sims/[id]/runs/route";
import { POST as commandsPost } from "../app/api/sims/runs/[runId]/commands/route";
import { POST as reasoningPost } from "../app/api/sims/runs/[runId]/reasoning/route";
import { POST as finishPost } from "../app/api/sims/runs/[runId]/finish/route";

const run = Date.now().toString(36);
const V7 = `SECT-${run}`; // stand-in for SECPLUS
const V8 = `SECV-${run}`; // stand-in for SECPLUSV8
const tracks = { [V7]: randomUUID(), [V8]: randomUUID() };
const users: string[] = [];
let pool: Pool;
let simIds: Record<string, string> = {};

const CAPS = "protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1,security-console@1";
const NO_CONSOLE = "protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1";

const SOURCES = ALL_DOCUMENTS.filter((e) => e.course === "SECPLUS" || e.course === "SECPLUSV8");
const entries = (): DocumentEntry[] => SOURCES.map((e) => ({ ...e, course: e.course === "SECPLUS" ? V7 : V8 }));
const entryOf = (slug: string) => SOURCES.find((e) => e.slug === slug)!;
const docOf = (slug: string): ScenarioDoc => loadDocument(entryOf(slug));
const goldenOf = (slug: string): GoldenFile => JSON.parse(readFileSync(entryOf(slug).golden!, "utf8")) as GoldenFile;

let score: "met" | "partial" | "missed" = "met";

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `secc-${run}-${users.length}@example.test`]);
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
    const g = await reasoningPost(req(u, "POST", { momentId: open.moment, openedSeq: open.openedSeq, openedTick: open.openedTick, answer: "Disabled the account and revoked sessions first, then scoped and preserved evidence.", clientAttemptId: randomUUID() }), runCtx(runId)).then(json);
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
    await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Security+ stand-in', 'certification', null)`, [id, code]);
    await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Unit', 0, 100)`, [unit, id]);
    const titles = SOURCES.filter((e) => (e.course === "SECPLUS" ? V7 : V8) === code).map((e) => loadDocument(e).objective);
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

describe("seeding the incidents and their V8 bands", () => {
  test("six sims resolve to their objectives on the security console, and a second seed changes nothing", async () => {
    const first = await seedSims(pool, entries());
    assert.deepEqual(first.map((r) => r.change), ["new", "new", "new", "new", "new", "new"]);
    simIds = Object.fromEntries(first.map((r) => [r.slug, r.simId]));
    const rows = await query<{ slug: string; screen_type: string; objective: string; code: string; family: string }>(
      `select s.slug, s.screen_type, o.title as objective, st.code, s.safety_family as family
         from sims s join objectives o on o.id = s.objective_id join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
        where s.id = any($1::uuid[]) order by s.slug`,
      [Object.values(simIds)]
    );
    assert.equal(rows.length, 6);
    for (const r of rows) {
      assert.equal(r.screen_type, "security-console");
      assert.equal(r.objective, docOf(r.slug).objective);
      assert.equal(r.code, r.slug.endsWith("-v8") ? V8 : V7);
      assert.equal(r.family, "general");
    }
    const again = await seedSims(pool, entries());
    assert.ok(again.every((r) => r.change === "unchanged"));
  });
});

describe("the security console renderer", () => {
  test("an app with security-console@1 can run them; one without it is told to update", async () => {
    const u = await newUser();
    for (const t of Object.values(tracks)) {
      const l = await list(u, t);
      assert.equal(l.status, 200);
      const mine = l.body.sims.filter((s: any) => Object.values(simIds).includes(s.id));
      assert.equal(mine.length, 3);
      assert.ok(mine.every((s: any) => s.screenType === "security-console" && s.runnable === true));
      const old = await list(u, t, NO_CONSOLE);
      assert.ok(old.body.sims.filter((s: any) => Object.values(simIds).includes(s.id)).every((s: any) => s.runnable === false));
    }
    const s = await start(u, simIds["ransomware-file-server"], NO_CONSOLE);
    assert.equal(s.status, 409);
    assert.equal(s.body.code, "app_update_required");
  });

  test("SIMS_RENDERERS without security-console hides them", async () => {
    const u = await newUser();
    process.env.SIMS_RENDERERS = "bedside,board,session";
    const l = await list(u, tracks[V7]);
    assert.equal(l.body.sims.filter((s: any) => Object.values(simIds).includes(s.id)).length, 0);
    assert.equal((await start(u, simIds["phish-to-account-takeover"])).status, 404);
  });

  test("learner-paced: a pace command is refused", async () => {
    const u = await newUser();
    const s = await start(u, simIds["cloud-iam-backdoor"]);
    assert.equal(s.status, 200, JSON.stringify(s.body));
    const r = await commandsPost(req(u, "POST", { leaseEpoch: s.body.run.leaseEpoch, commands: [{ seq: 1, tick: 0, type: "pace", pace: 3 }] }), runCtx(s.body.run.id)).then(json);
    assert.ok(r.status >= 400 || r.body.rejected, JSON.stringify(r.body));
  });
});

describe("golden paths through the routes: one attempt each, the rating as verdict", () => {
  for (const [slug, ids] of [
    ["phish-to-account-takeover", ["expert", "resetOnly"]],
    ["ransomware-file-server", ["expert", "powerOffRebuild"]],
    ["cloud-iam-backdoor", ["expert", "slowSpread"]],
    ["ransomware-file-server-v8", ["slowSpread"]],
  ] as const) {
    for (const id of ids) {
      test(`${slug}/${id}`, async () => {
        const u = await newUser();
        const path = goldenOf(slug).paths.find((p) => p.id === id)!;
        const d = await playPath(u, slug, path);
        assert.equal(d.ending, path.expect.ending);
        assert.equal(d.outcomeClass, path.expect.class);
        assert.equal(d.rating, path.expect.rating);
        if (path.expect.score !== undefined) assert.equal(d.processScore, path.expect.score);
        const verdict = { good: "correct", mediocre: "partial", bad: "incorrect" }[path.expect.rating as string];
        const a = await query<{ kind: string; verdict: string; question: string }>(
          `select kind::text as kind, verdict::text as verdict, question from attempts where user_id = $1 and sim_id = $2`,
          [u, simIds[slug]]
        );
        assert.equal(a.length, 1);
        assert.deepEqual(a[0], { kind: "simtask", verdict, question: docOf(slug).title });
      });
    }
  }
});
