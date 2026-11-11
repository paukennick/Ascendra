// REQ-190 (docs/sims.md 16, "Server"): the sim routes against a real
// Postgres with every migration applied. The documents are the seeded ones
// (tamponade with the code module, the TicketBurst launch day), stored under
// a test course, and driven through the route handlers with their golden
// paths; the model is faked. Covers: the switch and renderer list,
// capability negotiation, start/resume/restart and the lease, idempotent
// command sync and its 409s, the speed bound, skip-to-wait, the reasoning
// ordering check and grading replay, finish (one attempt, rating as
// verdict, idempotent), the repeat rule, learner quit, the study notice,
// tier gating, the debrief route, and the schema probe. REQ-199: the app's
// journal replay through the step route, and "Report a problem" on a sim.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { query, queryOne, closePool, sslOption } from "./db";
import { ownerClient, closeOwner } from "./test-owner";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { grantEntitlement } from "./entitlements";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { checkSchema } from "./schema-status";
import { ALL_DOCUMENTS, loadDocument } from "./sim/documents.ts";
import { clientDocument, clientHash, contentHash } from "./sim/content-hash.ts";
import { replayGoldenPath, stateHash } from "./sim/engine/v1/index.ts";
import type { Command, GoldenFile, GoldenPath, ScenarioDoc } from "./sim/engine/v1/index.ts";
import { replayRun } from "./sim/server-run.ts";
import { GET as listGet } from "../app/api/sims/route";
import { GET as simGet } from "../app/api/sims/[id]/route";
import { POST as runsPost } from "../app/api/sims/[id]/runs/route";
import { POST as commandsPost } from "../app/api/sims/runs/[runId]/commands/route";
import { POST as skipPost } from "../app/api/sims/runs/[runId]/skip/route";
import { POST as reasoningPost } from "../app/api/sims/runs/[runId]/reasoning/route";
import { POST as finishPost } from "../app/api/sims/runs/[runId]/finish/route";
import { GET as debriefGet } from "../app/api/sims/runs/[runId]/debrief/route";
import { POST as reportPost } from "../app/api/items/report/route";
import { confirmItemWrong, quarantineThreshold } from "./item-quality";
import { listQueue, runContentSignals } from "./content-review-queue";

const run = Date.now().toString(36);
const track = randomUUID();
const otherTrack = randomUUID();
const unit = randomUUID();
const otherUnit = randomUUID();
const OBJ_TAMP = randomUUID();
const OBJ_TB = randomUUID();
const OBJ_PRIVATE = randomUUID();
const users: string[] = [];
let dbPool: Pool;

const entry = (slug: string) => ALL_DOCUMENTS.find((e) => e.slug === slug)!;
const TAMP_DOC = loadDocument(entry("tamponade-after-cabg"));
const TB_DOC = loadDocument(entry("ticketburst-launch-day"));
const golden = (slug: string) => JSON.parse(readFileSync(entry(slug).golden!, "utf8")) as GoldenFile;
const TAMP_GOLDEN = golden("tamponade-after-cabg");
const TB_GOLDEN = golden("ticketburst-launch-day");
const pathOf = (g: GoldenFile, id: string) => g.paths.find((p) => p.id === id)!;

let TAMP: string;
let TB: string;
let PRIVATE_SIM: string;

// REQ-209: the seeded tamponade case is engine minor 1, so the current app says 1.1.
const CAPS = "protocol=1;engine=1.1;renderers=bedside@3,board@3";
// The app as shipped before REQ-209.
const OLD_CAPS = "protocol=1;engine=1.0;renderers=bedside@3,board@3";

// The fake grader: every part scores `score`.
let score: "met" | "partial" | "missed" = "met";
let gradeCalls = 0;
let failModel = false;
// REQ-218: runs while the grader is "thinking" (between the request's checks and its insert).
let whileGrading: (() => Promise<void>) | null = null;

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `sim-${run}-${users.length}@example.test`]);
  await recordStudyNoticeAcceptance(u); // REQ-205: reasoning is graded by the model, so it needs the notice
  return u;
}
const headers = (u: string, caps: string | null = CAPS) => ({
  authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`,
  "content-type": "application/json",
  ...(caps ? { "x-sim-caps": caps } : {}),
});
const req = (u: string, method = "GET", body?: unknown, caps: string | null = CAPS, url = "http://t/x") =>
  new Request(url, { method, headers: headers(u, caps), ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const runCtx = (runId: string) => ({ params: Promise.resolve({ runId }) });
const start = (u: string, sim: string, body: Record<string, unknown> = {}, caps: string | null = CAPS) => runsPost(req(u, "POST", body, caps), idCtx(sim)).then(json);
const sync = (u: string, runId: string, body: Record<string, unknown>) => commandsPost(req(u, "POST", body), runCtx(runId)).then(json);
const skip = (u: string, runId: string, body: Record<string, unknown>) => skipPost(req(u, "POST", body), runCtx(runId)).then(json);
const reason = (u: string, runId: string, body: Record<string, unknown>) => reasoningPost(req(u, "POST", body), runCtx(runId)).then(json);
const finish = (u: string, runId: string, body: Record<string, unknown>) => finishPost(req(u, "POST", body), runCtx(runId)).then(json);
const debrief = (u: string, runId: string) => debriefGet(req(u), runCtx(runId)).then(json);
const list = (u: string, caps: string | null = CAPS) => listGet(req(u, "GET", undefined, caps, `http://t/api/sims?trackId=${track}`)).then(json);

// Runs in a running phase are bounded by real time (5.7). Tests replay
// half-hour paths in milliseconds, so they move the run's start back.
const backdate = (runId: string, hours = 6) => query(`update sim_runs set started_at = now() - make_interval(hours => $2) where id = $1`, [runId, hours]);
const lastSync = (runId: string) => query(`update sim_runs set last_sync_at = null where id = $1`, [runId]);

async function insertSim(objectiveId: string, doc: ScenarioDoc, family = "general"): Promise<string> {
  const sim = await queryOne<{ id: string }>(
    `insert into sims (objective_id, slug, safety_family, screen_type, title) values ($1, $2, $3, $4, $5) returning id`,
    [objectiveId, doc.slug, family, doc.screen.type, doc.title]
  );
  const v = await queryOne<{ id: string }>(
    `insert into sim_versions (sim_id, version, schema_version, engine_major, engine_minor, renderer_level, document, client_document, content_hash, client_hash)
     values ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
    [sim!.id, doc.schemaVersion, doc.engine.major, doc.engine.minor, doc.screen.level ?? 1, JSON.stringify(doc), JSON.stringify(clientDocument(doc)), contentHash(doc), clientHash(doc)]
  );
  await query(`update sims set head_version_id = $2 where id = $1`, [sim!.id, v!.id]);
  return sim!.id;
}

// Where a path's reasoning moment opens: the last seq applied then, and the tick.
function momentOpening(doc: ScenarioDoc, path: GoldenPath): { openedSeq: number; openedTick: number; moment: string } {
  for (let i = 0; i <= path.commands.length; i++) {
    const r = replayRun({ doc, seed: path.seed, from: null, commands: path.commands.slice(0, i), budget: 1e12 });
    const next = path.commands[i];
    // Advance real time toward the next command; the moment may open on the way.
    const r2 = next ? replayRun({ doc, seed: path.seed, from: null, commands: path.commands.slice(0, i), toTick: next.tick, budget: 1e12 }) : r;
    if (r2.run.state.openReasoning) return { openedSeq: i === 0 ? 0 : path.commands[i - 1].seq, openedTick: r2.run.state.tick, moment: r2.run.state.openReasoning };
  }
  throw new Error("the path never opens a reasoning moment");
}

// Drives one golden path through the routes: syncs the commands, answers
// the reasoning moment when it opens (with the fake grader at the path's
// expected grade), and finishes at the path's final tick.
async function playPath(u: string, sim: string, doc: ScenarioDoc, path: GoldenPath) {
  const s = await start(u, sim, { restart: true, deviceId: "dev-a" });
  assert.equal(s.status, 200, JSON.stringify(s.body));
  const runId = s.body.run.id as string;
  // The seed is the server's; golden paths fix their own, so pin it.
  await query(`update sim_runs set seed = $2 where id = $1`, [runId, path.seed]);
  await backdate(runId);
  const lease = s.body.run.leaseEpoch as number;
  const open = momentOpening(doc, path);
  const grade = (path as GoldenPath & { reasoning?: Record<string, string> }).reasoning?.[open.moment] ?? "missed";
  const before = path.commands.filter((c) => c.seq <= open.openedSeq);
  const rest = path.commands.filter((c) => c.seq > open.openedSeq);
  if (before.length) {
    const r = await sync(u, runId, { leaseEpoch: lease, commands: before, tick: open.openedTick });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.rejected, null, JSON.stringify(r.body.rejected));
  } else {
    await lastSync(runId);
    const r = await sync(u, runId, { leaseEpoch: lease, commands: [], tick: open.openedTick });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  if (grade !== "missed") {
    score = grade as "met" | "partial";
    const g = await reason(u, runId, { momentId: open.moment, openedSeq: open.openedSeq, openedTick: open.openedTick, answer: "Rising CVP with falling output: tamponade. Page the surgeon now.", clientAttemptId: randomUUID() });
    assert.equal(g.status, 200, JSON.stringify(g.body));
  }
  const expected = replayGoldenPath(doc, structuredClone(path), (r) => stateHash(r.state));
  const r = await sync(u, runId, { leaseEpoch: lease, commands: rest, tick: expected.finalTick });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.rejected, null, JSON.stringify(r.body.rejected));
  assert.equal(r.body.serverHash, expected.stateHash, "the server's replay reaches the engine's state");
  const f = await finish(u, runId, { leaseEpoch: lease, tick: expected.finalTick });
  assert.equal(f.status, 200, JSON.stringify(f.body));
  return { runId, lease, debrief: f.body, expected };
}

before(async () => {
  dbPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 2 });
  setAiCallSink(null);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'SIM course', 'certification', null)`, [track, `SIM-${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'SIM unit', 0, 100)`, [unit, track]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'SIM tamponade', 0), ($3, $2, 'SIM launch day', 1)`, [OBJ_TAMP, unit, OBJ_TB]);
  const owner = await newUser();
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Private', 'certification', $3)`, [otherTrack, `SIMP-${run}`, owner]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'P unit', 0)`, [otherUnit, otherTrack]);
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'P O', 0)`, [OBJ_PRIVATE, otherUnit]);
  TAMP = await insertSim(OBJ_TAMP, TAMP_DOC);
  TB = await insertSim(OBJ_TB, TB_DOC);
  PRIVATE_SIM = await insertSim(OBJ_PRIVATE, TB_DOC);
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("not used");
      },
      parse: async (body: any) => {
        const text = JSON.stringify(body);
        if (!text.includes("Rubric parts:")) throw new Error("unexpected model call");
        gradeCalls++;
        if (whileGrading) await whileGrading();
        if (failModel) throw new Error("model down");
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
  delete process.env.SIMS_SERVE_UNREVIEWED;
  delete process.env.BILLING_ENABLED;
  score = "met";
  gradeCalls = 0;
  failModel = false;
  whileGrading = null;
});

after(async () => {
  __setClientForTest(null);
  delete process.env.SIMS_ENABLED;
  await query(`delete from attempts where sim_id = any($1::uuid[])`, [[TAMP, TB, PRIVATE_SIM]]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from sims where id = any($1::uuid[])`, [[TAMP, TB, PRIVATE_SIM]]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track, otherTrack]]);
  await dbPool.end();
  await closePool();
  await closeOwner();
});

describe("switches, listing and capabilities", () => {
  test("SIMS_ENABLED off: every route is 404 sims_disabled", async () => {
    const u = await newUser();
    delete process.env.SIMS_ENABLED;
    const l = await list(u);
    assert.equal(l.status, 404);
    assert.equal(l.body.code, "sims_disabled");
    const s = await start(u, TB);
    assert.equal(s.body.code, "sims_disabled");
    const c = await sync(u, randomUUID(), { leaseEpoch: 1, commands: [] });
    assert.equal(c.body.code, "sims_disabled");
  });

  test("the list shows both sims with state and access; without capabilities nothing is runnable", async () => {
    const u = await newUser();
    const l = await list(u);
    assert.equal(l.status, 200);
    const byId = Object.fromEntries(l.body.sims.map((s: any) => [s.id, s]));
    assert.deepEqual(Object.keys(byId).sort(), [TAMP, TB].sort());
    assert.equal(byId[TB].screenType, "board");
    assert.equal(byId[TAMP].state, "new");
    assert.equal(byId[TAMP].access, "full", "billing off: everything is open");
    assert.equal(byId[TAMP].runnable, true);
    assert.equal("reviewStatus" in byId[TAMP], false, "review status stays internal (19.4 item 5)");
    const old = await list(u, null);
    assert.ok(old.body.sims.every((s: any) => s.runnable === false));
    const noBoard = await list(u, "protocol=1;engine=1.1;renderers=bedside@3");
    assert.equal(Object.fromEntries(noBoard.body.sims.map((s: any) => [s.id, s.runnable]))[TB], false);
  });

  test("SIMS_RENDERERS narrows the list and hides the other renderer's sims", async () => {
    const u = await newUser();
    process.env.SIMS_RENDERERS = "bedside";
    const l = await list(u);
    assert.deepEqual(l.body.sims.map((s: any) => s.id), [TAMP]);
    assert.equal((await simGet(req(u), idCtx(TB)).then(json)).status, 404);
  });

  test("another learner's private course is not visible", async () => {
    const u = await newUser();
    assert.equal((await simGet(req(u), idCtx(PRIVATE_SIM)).then(json)).status, 404);
    assert.equal((await start(u, PRIVATE_SIM)).status, 404);
  });

  test("a rejected head with nothing approved unlists the sim", async () => {
    const u = await newUser();
    await query(`update sim_versions set review_status = 'rejected' where sim_id = $1`, [TB]);
    try {
      const l = await list(u);
      assert.ok(!l.body.sims.some((s: any) => s.id === TB));
      assert.equal((await start(u, TB)).status, 404);
    } finally {
      await query(`update sim_versions set review_status = 'needs_expert_review' where sim_id = $1`, [TB]);
    }
  });
});

describe("starting, resuming and the lease", () => {
  test("an app that cannot run the version gets 409 app_update_required", async () => {
    const u = await newUser();
    const s = await start(u, TB, {}, "protocol=1;engine=1.1;renderers=board@2");
    assert.equal(s.status, 409);
    assert.equal(s.body.code, "app_update_required");
  });

  test("start returns the client document without server-only parts; resume keeps the run and takes the lease", async () => {
    const u = await newUser();
    const a = await start(u, TB, { deviceId: "dev-a" });
    assert.equal(a.status, 200);
    assert.equal(a.body.run.status, "open");
    assert.equal(a.body.clientHash, clientHash(TB_DOC));
    assert.equal(a.body.clientDocument.scoring, undefined, "scoring never leaves the server");
    assert.equal(JSON.stringify(a.body.clientDocument).includes("modelAnswer"), false, "nor the reasoning rubric");
    assert.ok(Number.isInteger(a.body.run.seed) && a.body.run.seed >= 0 && a.body.run.seed < 2 ** 32);
    const b = await start(u, TB, { deviceId: "dev-b", cachedHash: a.body.clientHash });
    assert.equal(b.body.run.id, a.body.run.id, "one open run per learner and sim");
    assert.equal(b.body.run.leaseEpoch, a.body.run.leaseEpoch + 1);
    assert.equal(b.body.clientDocument, undefined, "the cached document is not resent");
    // The first device's epoch is now stale.
    const stale = await sync(u, a.body.run.id, { leaseEpoch: a.body.run.leaseEpoch, commands: [{ seq: 1, tick: 0, type: "act", action: "toggleBackup" }] });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, "lease_lost");
    const fresh = await start(u, TB, { restart: true });
    assert.notEqual(fresh.body.run.id, a.body.run.id, "restart starts a new run");
    const old = await queryOne<{ status: string }>(`select status from sim_runs where id = $1`, [a.body.run.id]);
    assert.equal(old?.status, "abandoned");
  });

  test("a run belongs to its learner", async () => {
    const u = await newUser();
    const other = await newUser();
    const s = await start(u, TB);
    const r = await sync(other, s.body.run.id, { leaseEpoch: s.body.run.leaseEpoch, commands: [] });
    assert.equal(r.status, 404);
    assert.equal((await debrief(other, s.body.run.id)).status, 404);
  });
});

describe("syncing commands (the step route)", () => {
  test("idempotent by seq; a changed resend, a gap and an illegal command are refused", async () => {
    const u = await newUser();
    const s = await start(u, TB);
    const runId = s.body.run.id;
    const lease = s.body.run.leaseEpoch;
    const c1: Command = { seq: 1, tick: 0, type: "act", action: "toggleBackup" };
    const r1 = await sync(u, runId, { leaseEpoch: lease, commands: [c1] });
    assert.equal(r1.status, 200);
    assert.equal(r1.body.acceptedThrough, 1);
    const again = await sync(u, runId, { leaseEpoch: lease, commands: [c1] });
    assert.equal(again.status, 200, "the same command again is accepted");
    assert.equal(again.body.acceptedThrough, 1);
    const changed = await sync(u, runId, { leaseEpoch: lease, commands: [{ ...c1, action: "start" }] });
    assert.equal(changed.status, 409);
    assert.equal(changed.body.code, "seq_conflict");
    const gap = await sync(u, runId, { leaseEpoch: lease, commands: [{ seq: 3, tick: 0, type: "act", action: "toggleBackup" }] });
    assert.equal(gap.body.code, "seq_gap");
    // An illegal command: the legal prefix is stored, the rest refused with its seq.
    const mixed = await sync(u, runId, {
      leaseEpoch: lease,
      commands: [
        { seq: 2, tick: 0, type: "act", action: "toggleBackup" },
        { seq: 3, tick: 0, type: "act", action: "noSuchThing" },
      ],
    });
    assert.equal(mixed.status, 200);
    assert.equal(mixed.body.acceptedThrough, 2);
    assert.equal(mixed.body.rejected.seq, 3);
    const stored = await query<{ seq: number }>(`select seq from sim_run_commands where run_id = $1 order by seq`, [runId]);
    assert.deepEqual(stored.map((x) => x.seq), [1, 2]);
    const bad = await sync(u, runId, { leaseEpoch: lease, commands: [{ seq: 3, tick: 0, type: "act", action: "x", params: { a: "line\nbreak" } }] });
    assert.equal(bad.status, 400);
  });

  test("a client score or state is never read: only the server's replay hash comes back, and a wrong client hash is a desync", async () => {
    const u = await newUser();
    const s = await start(u, TB);
    const r = await sync(u, s.body.run.id, { leaseEpoch: s.body.run.leaseEpoch, commands: [{ seq: 1, tick: 0, type: "act", action: "toggleBackup" }], tick: 0, stateHash: "0000000000000000", score: 100, rating: "good" });
    assert.equal(r.status, 200);
    assert.equal(r.body.desync, true);
    const row = await queryOne<{ desyncs: number; state_hash: string }>(`select desyncs, state_hash from sim_runs where id = $1`, [s.body.run.id]);
    assert.equal(row?.desyncs, 1);
    assert.equal(row?.state_hash, r.body.serverHash);
  });

  test("speed bound: a real-time phase cannot run ahead of the wall clock", async () => {
    const u = await newUser();
    const s = await start(u, TAMP);
    const runId = s.body.run.id;
    const fast = await sync(u, runId, { leaseEpoch: s.body.run.leaseEpoch, commands: [{ seq: 1, tick: 600, type: "act", action: "look" }] });
    assert.equal(fast.status, 409);
    assert.equal(fast.body.code, "too_fast");
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from sim_run_commands where run_id = $1`, [runId]))?.n, 0, "nothing stored");
    await backdate(runId, 1);
    const ok = await sync(u, runId, { leaseEpoch: s.body.run.leaseEpoch, commands: [{ seq: 1, tick: 600, type: "act", action: "look" }] });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.tick, 600);
    assert.equal(ok.body.rejected, null);
  });

  test("heartbeats: at most one every 2 s; the tick only moves where the clock runs", async () => {
    const u = await newUser();
    const s = await start(u, TAMP);
    const runId = s.body.run.id;
    await backdate(runId, 1);
    const h1 = await sync(u, runId, { leaseEpoch: s.body.run.leaseEpoch, commands: [], tick: 60 });
    assert.equal(h1.status, 200);
    assert.equal(h1.body.lastTick, 60);
    const h2 = await sync(u, runId, { leaseEpoch: s.body.run.leaseEpoch, commands: [], tick: 61 });
    assert.equal(h2.status, 429);
    const tb = await start(u, TB);
    await lastSync(tb.body.run.id);
    const stopped = await sync(u, tb.body.run.id, { leaseEpoch: tb.body.run.leaseEpoch, commands: [], tick: 30 });
    assert.equal(stopped.status, 200);
    assert.match(stopped.body.rejected.reason, /unreachable/);
    assert.equal(stopped.body.lastTick, 0);
  });

  test("skip-wait: the server builds the skip to its own due tick and stores it; a resend is idempotent", async () => {
    const u = await newUser();
    const s = await start(u, TAMP);
    const runId = s.body.run.id;
    await backdate(runId, 1);
    const lease = s.body.run.leaseEpoch;
    const r = await skip(u, runId, { leaseEpoch: lease, seq: 1, tick: 10 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.command.type, "skip");
    assert.equal(r.body.command.seq, 1);
    assert.ok(r.body.stoppedAt > 10);
    const stored = await queryOne<{ payload: Command }>(`select payload from sim_run_commands where run_id = $1 and seq = 1`, [runId]);
    assert.deepEqual(stored?.payload, r.body.command);
    const again = await skip(u, runId, { leaseEpoch: lease, seq: 1, tick: 10 });
    assert.equal(again.status, 200);
    const behind = await skip(u, runId, { leaseEpoch: lease, seq: 2, tick: 5 });
    assert.equal(behind.status, 409);
  });
});

describe("written reasoning (docs/sims.md 10)", () => {
  test("graded only where the server's replay shows the moment open; replay by client id; one grade per moment", async () => {
    const u = await newUser();
    const path = pathOf(TB_GOLDEN, "reference");
    const open = momentOpening(TB_DOC, path);
    const s = await start(u, TB);
    const runId = s.body.run.id;
    await query(`update sim_runs set seed = $2 where id = $1`, [runId, path.seed]);
    const lease = s.body.run.leaseEpoch;
    const body = { momentId: open.moment, openedSeq: open.openedSeq, openedTick: open.openedTick, answer: "Two AZs behind an ALB, Multi-AZ RDS.", clientAttemptId: randomUUID() };
    const behind = await reason(u, runId, body);
    assert.equal(behind.status, 409);
    assert.equal(behind.body.code, "replay_behind");
    assert.equal(gradeCalls, 0);
    const synced = await sync(u, runId, { leaseEpoch: lease, commands: path.commands.filter((c) => c.seq <= open.openedSeq) });
    assert.equal(synced.status, 200);
    const wrongTick = await reason(u, runId, { ...body, openedSeq: open.openedSeq - 1, clientAttemptId: randomUUID() });
    assert.equal(wrongTick.status, 409, "not open after an earlier seq");
    const g = await reason(u, runId, body);
    assert.equal(g.status, 200, JSON.stringify(g.body));
    assert.equal(g.body.verdict, "correct");
    assert.equal(g.body.replayed, false);
    assert.ok(g.body.modelAnswer.length > 0, "the model answer is shown after grading");
    assert.equal(gradeCalls, 1);
    const replayed = await reason(u, runId, body);
    assert.equal(replayed.body.replayed, true);
    assert.equal(gradeCalls, 1, "a resend never calls the model again");
    const reused = await reason(u, runId, { ...body, answer: "something else" });
    assert.equal(reused.status, 409);
    const second = await reason(u, runId, { ...body, clientAttemptId: randomUUID() });
    assert.equal(second.status, 409);
    assert.equal(second.body.code, "already_graded");
    const long = await reason(u, runId, { ...body, answer: "x".repeat(2001), clientAttemptId: randomUUID() });
    assert.equal(long.status, 400);
  });

  test("a grader that fails three times is recorded as grader_failed and left out of the score", async () => {
    const u = await newUser();
    const path = pathOf(TB_GOLDEN, "reference");
    const open = momentOpening(TB_DOC, path);
    const s = await start(u, TB);
    await query(`update sim_runs set seed = $2 where id = $1`, [s.body.run.id, path.seed]);
    await sync(u, s.body.run.id, { leaseEpoch: s.body.run.leaseEpoch, commands: path.commands.filter((c) => c.seq <= open.openedSeq) });
    failModel = true;
    const g = await reason(u, s.body.run.id, { momentId: open.moment, openedSeq: open.openedSeq, openedTick: open.openedTick, answer: "A real answer about two AZs.", clientAttemptId: randomUUID() });
    assert.equal(g.status, 200);
    assert.equal(g.body.status, "grader_failed");
    assert.equal(gradeCalls, 3);
  });
});

describe("REQ-218 (FAIL-1083): a reasoning answer cannot be stored after the run ended", () => {
  test("an answer graded while the run ends is refused (409 run_ended) and stores nothing", async () => {
    const u = await newUser();
    const path = pathOf(TB_GOLDEN, "reference");
    const open = momentOpening(TB_DOC, path);
    const s = await start(u, TB);
    const runId = s.body.run.id as string;
    await query(`update sim_runs set seed = $2 where id = $1`, [runId, path.seed]);
    await sync(u, runId, { leaseEpoch: s.body.run.leaseEpoch, commands: path.commands.filter((c) => c.seq <= open.openedSeq) });
    whileGrading = async () => {
      await query(`update sim_runs set status = 'ended' where id = $1`, [runId]);
    };
    const g = await reason(u, runId, { momentId: open.moment, openedSeq: open.openedSeq, openedTick: open.openedTick, answer: "Two AZs behind an ALB, Multi-AZ RDS.", clientAttemptId: randomUUID() });
    assert.equal(g.status, 409, JSON.stringify(g.body));
    assert.equal(g.body.code, "run_ended");
    assert.equal(gradeCalls, 1);
    assert.equal((await query(`select 1 from sim_run_reasoning where run_id = $1`, [runId])).length, 0, "nothing stored against an ended run");
  });
});

describe("finishing, the attempt and the debrief (docs/sims.md 9)", () => {
  test("TicketBurst reference design: Good, one simtask attempt with the rating as verdict; finish is idempotent", async () => {
    const u = await newUser();
    const path = pathOf(TB_GOLDEN, "reference");
    const { runId, lease, debrief: d } = await playPath(u, TB, TB_DOC, path);
    assert.equal(d.rating, path.expect.rating);
    assert.equal(d.outcomeClass, path.expect.class);
    assert.equal(d.ending, path.expect.ending);
    if (path.expect.score !== undefined) assert.equal(d.processScore, path.expect.score);
    assert.equal(d.attempt.verdict, "correct");
    assert.equal(d.attempt.assisted, false);
    assert.ok(d.reasoningAnswers.length === 1 && d.reasoningAnswers[0].verdict === "correct");
    const attempts = await query<{ kind: string; assessment_type: string; format: string; objective_id: string; verdict: string; question: string }>(
      `select kind::text as kind, assessment_type, format, objective_id, verdict::text as verdict, question from attempts where user_id = $1 and sim_id = $2`,
      [u, TB]
    );
    assert.equal(attempts.length, 1);
    assert.deepEqual(attempts[0], { kind: "simtask", assessment_type: "sim_run", format: "open", objective_id: OBJ_TB, verdict: "correct", question: TB_DOC.title });
    const again = await finish(u, runId, { leaseEpoch: lease });
    assert.equal(again.status, 200);
    assert.equal(again.body.attempt.id, d.attempt.id);
    assert.equal((await query(`select 1 from attempts where user_id = $1 and sim_id = $2`, [u, TB])).length, 1, "still one attempt");
    const stored = await debrief(u, runId);
    assert.equal(stored.body.attempt.id, d.attempt.id);
    const m = await queryOne<{ n: number }>(`select count(*)::int as n from mastery where user_id = $1 and objective_id = $2`, [u, OBJ_TB]);
    assert.equal(m?.n, 1, "the objective's mastery is recomputed");
    // A second finished run of the same sim is a repeat (9.4).
    const second = await playPath(u, TB, TB_DOC, pathOf(TB_GOLDEN, "singleBox"));
    assert.equal(second.debrief.rating, "bad");
    assert.equal(second.debrief.attempt.assisted, true);
    assert.equal(second.debrief.attempt.assistReason, "repeat");
  });

  test("tamponade arrest path: the ending reached by time alone is confirmed at the app's tick; the skipped reasoning counts as missed", async () => {
    const u = await newUser();
    const path = pathOf(TAMP_GOLDEN, "arrest");
    const { debrief: d } = await playPath(u, TAMP, TAMP_DOC, path);
    assert.equal(d.ending, path.expect.ending);
    assert.equal(d.outcomeClass, "harm");
    assert.equal(d.rating, "bad");
    assert.equal(d.attempt.verdict, "incorrect");
    assert.equal(d.reasoning[0].score, "missed");
  });

  test("tamponade expert path through the routes: Good", async () => {
    const u = await newUser();
    const path = pathOf(TAMP_GOLDEN, "expert");
    const { debrief: d } = await playPath(u, TAMP, TAMP_DOC, path);
    assert.equal(d.rating, "good");
    assert.equal(d.ending, path.expect.ending);
  });

  test("finish before the end is 409 not_ended; learner quit records nothing but the next run is a repeat", async () => {
    const u = await newUser();
    const s = await start(u, TB);
    const runId = s.body.run.id;
    const lease = s.body.run.leaseEpoch;
    const early = await finish(u, runId, { leaseEpoch: lease });
    assert.equal(early.status, 409);
    assert.equal(early.body.code, "not_ended");
    await sync(u, runId, {
      leaseEpoch: lease,
      commands: [
        { seq: 1, tick: 0, type: "act", action: "toggleBackup" },
        { seq: 2, tick: 0, type: "end", reason: "learner_quit" },
      ],
    });
    const f = await finish(u, runId, { leaseEpoch: lease });
    assert.equal(f.status, 200);
    assert.equal(f.body.rating, null);
    assert.equal(f.body.attempt, null);
    assert.equal((await queryOne<{ status: string; revealed: boolean }>(`select status, revealed from sim_runs where id = $1`, [runId]))?.status, "abandoned");
    const next = await playPath(u, TB, TB_DOC, pathOf(TB_GOLDEN, "serverless"));
    assert.equal(next.debrief.attempt.assistReason, "repeat", "acting in an abandoned run reveals it (9.4)");
  });

  test("restarting before doing anything does not make the next run a repeat", async () => {
    const u = await newUser();
    await start(u, TB);
    const next = await playPath(u, TB, TB_DOC, pathOf(TB_GOLDEN, "serverless"));
    assert.equal(next.debrief.attempt.assisted, false);
  });
});

describe("study notice and tiers", () => {
  test("a clinical sim needs the study notice to start or sync (REQ-165)", async () => {
    const u = await newUser();
    await query(`delete from legal_acceptances where user_id = $1 and document = 'study_notice'`, [u]); // this test is about not having accepted it
    await query(`update sims set safety_family = 'clinical' where id = $1`, [TAMP]);
    try {
      const s = await start(u, TAMP);
      assert.equal(s.status, 403);
      await recordStudyNoticeAcceptance(u);
      const ok = await start(u, TAMP);
      assert.equal(ok.status, 200);
    } finally {
      await query(`update sims set safety_family = 'general' where id = $1`, [TAMP]);
    }
  });

  test("billing on: Free gets one sample sim per course; the other is locked; Pro opens both", async () => {
    process.env.BILLING_ENABLED = "true";
    const free = await newUser();
    const l = await list(free);
    const access = Object.fromEntries(l.body.sims.map((s: any) => [s.id, s.access]));
    assert.deepEqual(access, { [TAMP]: "sample", [TB]: "locked" }, "the first served sim in course order is the sample");
    const locked = await start(free, TB, { restart: true });
    assert.equal(locked.status, 402);
    const pro = await newUser();
    await grantEntitlement({ userId: pro, tier: "pro" });
    const pl = await list(pro);
    assert.ok(pl.body.sims.every((s: any) => s.access === "full"));
    assert.equal((await start(pro, TB, { restart: true })).status, 200);
  });
});

// ---------------------------------------------------------------------------
// REQ-209 (docs/sims.md 5.4a-5.4e): pace, focused start, the skip offer,
// teaching prompts and chapters, on a live server.
// ---------------------------------------------------------------------------

// The tamponade case as it was before REQ-209: engine minor 0, none of the new
// content, the original scoring row and the original q15 wait.
function preS1(doc: ScenarioDoc): ScenarioDoc {
  const d = structuredClone(doc) as any;
  d.engine.minor = 0;
  delete d.focusedStart;
  delete d.chapters;
  delete d.teaching;
  delete d.params.recognizeExpertAt;
  delete d.timers.q15check.wait.routine;
  d.scoring.criteria[0].rows = d.scoring.criteria[0].rows.filter((r: any) => !String(r.when).includes("focusedAt"));
  return d as ScenarioDoc;
}

describe("pacing (REQ-209)", () => {
  const pTrack = randomUUID();
  const pUnit = randomUUID();
  const objs = [randomUUID(), randomUUID()];
  let TAMP_C: string; // the seeded case in a clinical track
  let TAMP_OLD: string; // the pre-REQ-209 case, clinical
  let clin: string; // a learner who has accepted the study notice
  const OLD_DOC = preS1(TAMP_DOC);

  before(async () => {
    await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'SIM pacing', 'certification', null)`, [pTrack, `SIMPACE-${run}`]);
    await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'P unit', 0, 100)`, [pUnit, pTrack]);
    await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $3, 'P tamponade', 0), ($2, $3, 'P tamponade old', 1)`, [objs[0], objs[1], pUnit]);
    TAMP_C = await insertSim(objs[0], TAMP_DOC, "clinical");
    TAMP_OLD = await insertSim(objs[1], OLD_DOC, "clinical");
    clin = await newUser();
    await recordStudyNoticeAcceptance(clin);
  });
  after(async () => {
    await query(`delete from attempts where sim_id = any($1::uuid[])`, [[TAMP_C, TAMP_OLD]]);
    await query(`delete from sims where id = any($1::uuid[])`, [[TAMP_C, TAMP_OLD]]);
    await query(`delete from subject_tracks where id = $1`, [pTrack]);
  });

  const wallAgo = (runId: string, seconds: number) => query(`update sim_runs set started_at = now() - make_interval(secs => $2) where id = $1`, [runId, seconds]);
  async function fresh(sim: string, wallSeconds: number) {
    const s = await start(clin, sim, { restart: true, deviceId: "dev-a" });
    assert.equal(s.status, 200, JSON.stringify(s.body));
    await query(`update sim_runs set seed = 1 where id = $1`, [s.body.run.id]);
    await wallAgo(s.body.run.id, wallSeconds);
    return { runId: s.body.run.id as string, lease: s.body.run.leaseEpoch as number, body: s.body };
  }
  const pace3: Command = { seq: 1, tick: 0, type: "pace", pace: 3 };

  test("pacing is offered only for a running phase in a clinical or fitness track; 3x is then the default", async () => {
    const c = await start(clin, TAMP_C, { restart: true });
    assert.deepEqual(c.body.pacing, { eligible: true, studyPace: 3, examPace: 1, defaultPace: 3 });
    const g = await start(clin, TAMP, { restart: true });
    assert.equal(g.body.pacing.eligible, false, "the same case in a general track gets none");
    assert.equal(g.body.pacing.defaultPace, 1);
    const tb = await start(clin, TB, { restart: true });
    assert.equal(tb.body.pacing.eligible, false, "a turn-based cloud sim gets none");
    assert.equal(tb.body.pacing.defaultPace, 1);
  });

  test("a legitimate 3x run is accepted; the same ticks with no pace logged, or 4x, are refused as too fast", async () => {
    // 600 ticks at 3x need 200 s of wall time; 210 s have passed.
    const ok = await fresh(TAMP_C, 210);
    const a = await sync(clin, ok.runId, { leaseEpoch: ok.lease, commands: [pace3, { seq: 2, tick: 600, type: "act", action: "look" }], tick: 600 });
    assert.equal(a.status, 200, JSON.stringify(a.body));
    assert.equal(a.body.rejected, null);
    assert.equal(a.body.tick, 600);
    const row = await queryOne<{ realtime_ticks: number }>(`select realtime_ticks from sim_runs where id = $1`, [ok.runId]);
    assert.equal(row?.realtime_ticks, 600);

    // No pace logged: 1x, so 600 s are needed.
    const noPace = await fresh(TAMP_C, 210);
    const b = await sync(clin, noPace.runId, { leaseEpoch: noPace.lease, commands: [{ seq: 1, tick: 600, type: "act", action: "look" }] });
    assert.equal(b.status, 409);
    assert.equal(b.body.code, "too_fast");

    // Logged 3x, claims to be faster than that: 1200 ticks need 400 s.
    const over = await fresh(TAMP_C, 210);
    const c = await sync(clin, over.runId, { leaseEpoch: over.lease, commands: [pace3, { seq: 2, tick: 1200, type: "act", action: "look" }] });
    assert.equal(c.status, 409);
    assert.equal(c.body.code, "too_fast");
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from sim_run_commands where run_id = $1`, [over.runId]))?.n, 0, "nothing stored");

    // Changing pace mid-run is bounded per segment: 300 ticks at 3x (100 s) then 300 at 1x (300 s) need 400 s.
    const mid = await fresh(TAMP_C, 210);
    const d = await sync(clin, mid.runId, { leaseEpoch: mid.lease, commands: [pace3, { seq: 2, tick: 300, type: "pace", pace: 1 }, { seq: 3, tick: 600, type: "act", action: "look" }] });
    assert.equal(d.body.code, "too_fast");
    await wallAgo(mid.runId, 410);
    const e = await sync(clin, mid.runId, { leaseEpoch: mid.lease, commands: [pace3, { seq: 2, tick: 300, type: "pace", pace: 1 }, { seq: 3, tick: 600, type: "act", action: "look" }] });
    assert.equal(e.status, 200, JSON.stringify(e.body));
  });

  test("pause is not a pace: logging a pause at 3x costs no wall-clock allowance", async () => {
    const r = await fresh(TAMP_C, 60);
    const a = await sync(clin, r.runId, { leaseEpoch: r.lease, commands: [pace3, { seq: 2, tick: 120, type: "pause", reason: "learner" }, { seq: 3, tick: 120, type: "resume" }], tick: 120 });
    assert.equal(a.status, 200, JSON.stringify(a.body));
    assert.equal(a.body.rejected, null);
  });

  test("pace, begin, teach and chapter are refused (400) where pacing is not offered, and nothing is stored", async () => {
    for (const sim of [TB, TAMP]) {
      const s = await start(clin, sim, { restart: true });
      const r = await sync(clin, s.body.run.id, { leaseEpoch: s.body.run.leaseEpoch, commands: [{ seq: 1, tick: 0, type: "pace", pace: 3 }] });
      assert.equal(r.status, 400, JSON.stringify(r.body));
      assert.equal(r.body.code, "pacing_not_available");
      const k = await skip(clin, s.body.run.id, { leaseEpoch: s.body.run.leaseEpoch, seq: 1, tick: 0, calm: true });
      assert.equal(k.status, 400);
      assert.equal(k.body.code, "pacing_not_available");
      assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from sim_run_commands where run_id = $1`, [s.body.run.id]))?.n, 0);
    }
  });

  test("focused start: begin evolves the run to the scenario's start point, as the engine's own replay does", async () => {
    const r = await fresh(TAMP_C, 5);
    const a = await sync(clin, r.runId, { leaseEpoch: r.lease, commands: [{ seq: 1, tick: 0, type: "begin", start: "focused" }, { seq: 2, tick: 720, type: "pace", pace: 3 }], tick: 720 });
    assert.equal(a.status, 200, JSON.stringify(a.body));
    assert.equal(a.body.tick, 720, "the 720 ticks before it cost no wall time");
    const ref = replayRun({ doc: TAMP_DOC, seed: 1, from: null, commands: [{ seq: 1, tick: 0, type: "begin", start: "focused" }, { seq: 2, tick: 720, type: "pace", pace: 3 }], budget: 1e12 });
    assert.equal(a.body.serverHash, stateHash(ref.run.state));
    assert.equal((await queryOne<{ realtime_ticks: number }>(`select realtime_ticks from sim_runs where id = $1`, [r.runId]))?.realtime_ticks, 0);
    // begin is first-command-only.
    const late = await fresh(TAMP_C, 600);
    const b = await sync(clin, late.runId, { leaseEpoch: late.lease, commands: [{ seq: 1, tick: 0, type: "act", action: "look" }, { seq: 2, tick: 0, type: "begin", start: "focused" }] });
    assert.equal(b.status, 200);
    assert.equal(b.body.acceptedThrough, 1);
    assert.equal(b.body.rejected.seq, 2);
  });

  test("the skip offer: the server keeps the calm flag only when the engine agrees it stood", async () => {
    const early = await fresh(TAMP_C, 60);
    // Only the routine q15 check is pending: there is nothing to offer.
    const no = await skip(clin, early.runId, { leaseEpoch: early.lease, seq: 1, tick: 0, calm: true });
    assert.equal(no.status, 409, JSON.stringify(no.body));
    assert.equal(no.body.code, "no_offer");

    const r = await fresh(TAMP_C, 60);
    const a = await sync(clin, r.runId, { leaseEpoch: r.lease, commands: [pace3, { seq: 2, tick: 130, type: "act", action: "echo" }], tick: 130 });
    assert.equal(a.status, 200, JSON.stringify(a.body));
    const ok = await skip(clin, r.runId, { leaseEpoch: r.lease, seq: 3, tick: 130, calm: true, timer: "echoResultT" });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.command.calm, true);
    const stored = await queryOne<{ payload: Command }>(`select payload from sim_run_commands where run_id = $1 and seq = 3`, [r.runId]);
    assert.equal((stored?.payload as any).calm, true, "logged, so replay and the debrief see it");
    // An ordinary skip of the same kind carries no flag.
    const r2 = await fresh(TAMP_C, 60);
    await sync(clin, r2.runId, { leaseEpoch: r2.lease, commands: [pace3, { seq: 2, tick: 130, type: "act", action: "echo" }], tick: 130 });
    const plain = await skip(clin, r2.runId, { leaseEpoch: r2.lease, seq: 3, tick: 130, timer: "echoResultT" });
    assert.equal(plain.status, 200);
    assert.equal("calm" in plain.body.command, false);
  });

  test("chapters and teaching answers are stored as commands and replay on a second device", async () => {
    const r = await fresh(TAMP_C, 5000);
    const path = pathOf(TAMP_GOLDEN, "expert3x");
    // up to just before the first chapter break
    const cut = path.commands.filter((c) => c.tick < 1380);
    const a = await sync(clin, r.runId, { leaseEpoch: r.lease, commands: cut, tick: 1380 });
    assert.equal(a.status, 200, JSON.stringify(a.body));
    const seq = cut.length + 1;
    const later = await sync(clin, r.runId, { leaseEpoch: r.lease, commands: [{ seq, tick: 1380, type: "chapter", chapter: "surgeonAtBedside", choice: "later" }], tick: 1380 });
    assert.equal(later.status, 200, JSON.stringify(later.body));
    assert.equal(later.body.rejected, null);
    // another device takes the run
    const b = await start(clin, TAMP_C, { deviceId: "dev-b" });
    assert.equal(b.body.run.id, r.runId);
    assert.equal(b.body.commands.length, seq);
    assert.equal(b.body.commands[seq - 1].type, "chapter");
    assert.equal(b.body.run.lastTick, 1380);
    const ref = replayRun({ doc: TAMP_DOC, seed: 1, from: null, commands: b.body.commands, toTick: 1380, budget: 1e12 });
    assert.equal(stateHash(ref.run.state), later.body.serverHash);
  });

  test("full expert3x path through the routes: Good, and the debrief reports the pace and the sim minutes", async () => {
    const u = clin;
    const path = pathOf(TAMP_GOLDEN, "expert3x");
    const { debrief: d } = await playPath(u, TAMP_C, TAMP_DOC, path);
    assert.equal(d.rating, "good");
    assert.equal(d.ending, path.expect.ending);
    assert.equal(d.pacing.startPace, 3);
    assert.equal(d.pacing.finalPace, 3);
    assert.equal(d.pacing.studyTicks, 2580);
    assert.equal(d.pacing.examTicks, 0);
  });

  test("full focused3x path: the tubes criterion is excluded, not missed, and the rating stays Good", async () => {
    const path = pathOf(TAMP_GOLDEN, "focused3x");
    const { debrief: d } = await playPath(clin, TAMP_C, TAMP_DOC, path);
    assert.equal(d.rating, "good");
    assert.equal(d.focusedStart.tick, 720);
  });

  test("a run begun before REQ-209: runs to Good, and the old app can resume it mid-run from a checkpoint that has no pace fields", async () => {
    const path = pathOf(TAMP_GOLDEN, "expert");
    const full = await playPath(clin, TAMP_OLD, OLD_DOC, path);
    assert.equal(full.debrief.rating, "good");
    assert.equal(full.debrief.pacing, undefined, "no pacing in a minor-0 debrief");
    assert.equal(full.expected.stateHash, pathOf(TAMP_GOLDEN, "expert").expect.stateHash);

    // Mid-run: five commands in, then the checkpoint is rewritten as the old server wrote it.
    const r = await fresh(TAMP_OLD, 5000);
    const head = path.commands.slice(0, 5);
    const a = await sync(clin, r.runId, { leaseEpoch: r.lease, commands: head, tick: 660 });
    assert.equal(a.status, 200, JSON.stringify(a.body));
    const saved = await queryOne<{ checkpoint_state: any }>(`select checkpoint_state from sim_runs where id = $1`, [r.runId]);
    assert.ok(saved?.checkpoint_state, "a checkpoint was taken");
    await query(`update sim_runs set checkpoint_state = (checkpoint_state - 'paceTicks' - 'focusedAt') || jsonb_build_object('engine', '1.0') where id = $1`, [r.runId]);
    // The pre-REQ-209 app resumes (the version is minor 0, so it is handed back) ...
    const resumed = await start(clin, TAMP_OLD, { deviceId: "dev-old" }, OLD_CAPS);
    assert.equal(resumed.status, 200, JSON.stringify(resumed.body));
    assert.equal(resumed.body.run.id, r.runId);
    // ... and carries on to the same state the engine reaches.
    const rest = path.commands.slice(5, 10);
    const b = await sync(clin, r.runId, { leaseEpoch: resumed.body.run.leaseEpoch, commands: rest, tick: 800 });
    assert.equal(b.status, 200, JSON.stringify(b.body));
    assert.equal(b.body.rejected, null);
    const ref = replayRun({ doc: OLD_DOC, seed: 1, from: null, commands: path.commands.slice(0, 10), toTick: 800, budget: 1e12 });
    assert.equal(b.body.serverHash, stateHash(ref.run.state));
    assert.equal(ref.run.pace, 1);
    const row = await queryOne<{ realtime_ticks: number }>(`select realtime_ticks from sim_runs where id = $1`, [r.runId]);
    assert.equal(row?.realtime_ticks, 800, "judged at 1x, as before");
    // The old speed bound still applies to it: 1x, no pace logged.
    const fast = await fresh(TAMP_OLD, 100);
    const f = await sync(clin, fast.runId, { leaseEpoch: fast.lease, commands: [{ seq: 1, tick: 600, type: "act", action: "look" }] });
    assert.equal(f.body.code, "too_fast");
  });

  test("an open run on an engine-minor-1 version is not handed to an app that cannot replay it; a minor-0 run is", async () => {
    const r = await fresh(TAMP_C, 60);
    await sync(clin, r.runId, { leaseEpoch: r.lease, commands: [pace3], tick: 0 });
    const old = await start(clin, TAMP_C, { deviceId: "dev-old" }, OLD_CAPS);
    assert.equal(old.status, 409);
    assert.equal(old.body.code, "app_update_required");
    const current = await start(clin, TAMP_C, { deviceId: "dev-new" });
    assert.equal(current.status, 200);
    assert.equal(current.body.run.id, r.runId, "the run is kept for the updated app");
    const fresh0 = await start(clin, TAMP_OLD, { restart: true }, OLD_CAPS);
    assert.equal(fresh0.status, 200, "a minor-0 case still starts for the old app");
    const again = await start(clin, TAMP_OLD, {}, OLD_CAPS);
    assert.equal(again.body.run.id, fresh0.body.run.id);
  });
});

describe("schema", () => {
  test("the 067 probe passes and the migration runs twice", async () => {
    const status = await checkSchema(async (sql) => (await dbPool.query<{ ok: boolean }>(sql)).rows);
    assert.ok(!status.missing.some((m) => m.migration === "067_sim_item_kind.sql"), JSON.stringify(status.missing));
    const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", "067_sim_item_kind.sql"), "utf8");
    const c = await ownerClient(); // replaying a migration is an owner job (REQ-207)
    try {
      await c.query("begin");
      await c.query(sql);
      await c.query("commit");
    } finally {
      c.release();
    }
    const checks = await query<{ conname: string }>(
      `select conname from pg_constraint where conrelid in ('item_flags'::regclass, 'item_status'::regclass, 'item_holdbacks'::regclass)
          and contype = 'c' and pg_get_constraintdef(oid) like '%item_kind%' order by 1`
    );
    assert.deepEqual(checks.map((x) => x.conname), ["item_flags_item_kind_067", "item_holdbacks_item_kind_067", "item_status_item_kind_067"], "one item_kind check per table");
    const u = await newUser();
    await assert.rejects(
      query(`insert into item_flags (item_kind, item_id, question, user_id, source, context) values ('sim', 'x', 'q', $1, 'learner', $2)`, [u, JSON.stringify({ pad: "x".repeat(2100) })]),
      /item_flags_context_067/
    );
    await assert.rejects(query(`insert into item_flags (item_kind, item_id, question, user_id, source, context) values ('sim', 'x', 'q', $1, 'learner', '[1]')`, [u]), /item_flags_context_067/);
  });

  test("the 073 probe passes, the migration runs twice, and exactly the new command types are allowed (REQ-209)", async () => {
    const status = await checkSchema(async (sql) => (await dbPool.query<{ ok: boolean }>(sql)).rows);
    assert.ok(!status.missing.some((m) => m.migration === "073_sim_pacing_commands.sql"), JSON.stringify(status.missing));
    const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", "073_sim_pacing_commands.sql"), "utf8");
    const c = await ownerClient(); // replaying a migration is an owner job (REQ-207)
    try {
      await c.query("begin");
      await c.query(sql);
      await c.query("commit");
    } finally {
      c.release();
    }
    const checks = await query<{ conname: string }>(`select conname from pg_constraint where conrelid = 'sim_run_commands'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%act%'`);
    assert.deepEqual(checks.map((x) => x.conname), ["sim_run_commands_type_073"], "one type check");
    const u = await newUser();
    const s = await start(u, TB);
    const ins = (type: string) => query(`insert into sim_run_commands (run_id, seq, tick, type, payload, lease_epoch) values ($1, $2, 0, $3, '{}'::jsonb, 1)`, [s.body.run.id, Math.floor(Math.random() * 1e6) + 1, type]);
    for (const t of ["act", "choose", "skip", "pause", "resume", "reason", "end", "pace", "begin", "teach", "chapter"]) await ins(t);
    await assert.rejects(ins("rewind"), /sim_run_commands_type_073/);
  });

  test("the 062 probe passes and the migration runs twice", async () => {
    const status = await checkSchema(async (sql) => (await dbPool.query<{ ok: boolean }>(sql)).rows);
    assert.ok(!status.missing.some((m) => m.migration === "062_sim_engine.sql"), JSON.stringify(status.missing));
    const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", "062_sim_engine.sql"), "utf8");
    const c = await ownerClient(); // replaying a migration is an owner job (REQ-207)
    try {
      await c.query("begin");
      await c.query(sql);
      await c.query("commit");
    } finally {
      c.release();
    }
  });

  test("attempts_simtask_shape refuses a sim id on another kind", async () => {
    const u = await newUser();
    await assert.rejects(
      query(`insert into attempts (user_id, kind, format, question, answer, verdict, sim_id) values ($1, 'lesson', 'open', 'q', 'a', 'correct', $2)`, [u, TB]),
      /attempts_simtask_shape/
    );
  });
});

// ---------------------------------------------------------------------------
// REQ-199: what the app's on-device journal relies on. After an app kill the
// app takes the lease through the start route and resends the journal --
// commands the server may already hold -- through the step route.
// ---------------------------------------------------------------------------
describe("journal replay through the step route (REQ-199)", () => {
  const cmd = (seq: number): Command => ({ seq, tick: 0, type: "act", action: "toggleBackup" });

  test("kill mid-run: the resumed device resends its whole journal; what the server held is not stored twice", async () => {
    const u = await newUser();
    const s = await start(u, TB, { restart: true, deviceId: "dev-a" });
    const runId = s.body.run.id;
    // Only the first of three journaled commands reached the server.
    assert.equal((await sync(u, runId, { leaseEpoch: s.body.run.leaseEpoch, commands: [cmd(1)] })).body.acceptedThrough, 1);
    // The app was killed; on relaunch it resumes (a new lease) and replays the journal.
    const resumed = await start(u, TB, { deviceId: "dev-a2" });
    assert.equal(resumed.body.run.id, runId, "resume returns the same run");
    assert.deepEqual(resumed.body.commands.map((c: Command) => c.seq), [1]);
    const replayed = await sync(u, runId, { leaseEpoch: resumed.body.run.leaseEpoch, commands: [cmd(1), cmd(2), cmd(3)] });
    assert.equal(replayed.status, 200, JSON.stringify(replayed.body));
    assert.equal(replayed.body.acceptedThrough, 3);
    assert.equal(replayed.body.rejected, null);
    // A duplicate replay (the acknowledgement was lost) is accepted and adds nothing.
    const dup = await sync(u, runId, { leaseEpoch: resumed.body.run.leaseEpoch, commands: [cmd(2), cmd(3)] });
    assert.equal(dup.status, 200);
    assert.equal(dup.body.acceptedThrough, 3);
    const stored = await query<{ seq: number }>(`select seq from sim_run_commands where run_id = $1 order by seq`, [runId]);
    assert.deepEqual(stored.map((x) => x.seq), [1, 2, 3]);
  });

  test("a stale journal is refused without storing anything: the lease moved, another device acted, or the run ended", async () => {
    const u = await newUser();
    const a = await start(u, TB, { restart: true, deviceId: "dev-a" });
    const runId = a.body.run.id;
    // Device B takes the run and acts.
    const b = await start(u, TB, { deviceId: "dev-b" });
    assert.equal((await sync(u, runId, { leaseEpoch: b.body.run.leaseEpoch, commands: [{ seq: 1, tick: 0, type: "pause", reason: "learner" }] })).body.acceptedThrough, 1);
    // Device A's journal under its old lease: lease_lost.
    const old = await sync(u, runId, { leaseEpoch: a.body.run.leaseEpoch, commands: [cmd(1)] });
    assert.equal(old.status, 409);
    assert.equal(old.body.code, "lease_lost");
    // A retakes the lease, but its seq 1 differs from what B stored: seq_conflict.
    const a2 = await start(u, TB, { deviceId: "dev-a" });
    const conflict = await sync(u, runId, { leaseEpoch: a2.body.run.leaseEpoch, commands: [cmd(1)] });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.code, "seq_conflict");
    // The run ends; a journal with new commands for it is run_ended.
    await sync(u, runId, { leaseEpoch: a2.body.run.leaseEpoch, commands: [{ seq: 2, tick: 0, type: "end", reason: "learner_quit" }] });
    assert.equal((await finish(u, runId, { leaseEpoch: a2.body.run.leaseEpoch })).status, 200);
    const ended = await sync(u, runId, { leaseEpoch: a2.body.run.leaseEpoch, commands: [cmd(3)] });
    assert.equal(ended.status, 409);
    assert.equal(ended.body.code, "run_ended");
    const stored = await query<{ seq: number; type: string }>(`select seq, type from sim_run_commands where run_id = $1 order by seq`, [runId]);
    assert.deepEqual(stored.map((x) => `${x.seq}:${x.type}`), ["1:pause", "2:end"]);
  });
});

// ---------------------------------------------------------------------------
// REQ-199: "Report a problem" on a sim (migration 067). Last in the file: it
// pulls the TicketBurst version from rotation.
// ---------------------------------------------------------------------------
describe("Report a problem on a sim (REQ-199)", () => {
  const report = (u: string, body: Record<string, unknown>) => reportPost(req(u, "POST", body)).then(json);

  test("a report carries the version, the run's tick and state hash, and the learner's words; one per learner", async () => {
    const u = await newUser();
    const s = await start(u, TB, { restart: true });
    const runId = s.body.run.id;
    const synced = await sync(u, runId, { leaseEpoch: s.body.run.leaseEpoch, commands: [{ seq: 1, tick: 0, type: "act", action: "toggleBackup" }] });
    const r = await report(u, { kind: "sim", runId, tick: 0, stateHash: synced.body.serverHash, reason: "wrong_answer", note: "The backup toggle did nothing." });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.recorded, true);
    const versionId = s.body.run.versionId;
    const f = await queryOne<{ item_kind: string; item_id: string; objective_id: string; question: string; note: string; context: Record<string, unknown> }>(
      `select item_kind, item_id, objective_id, question, note, context from item_flags where user_id = $1`,
      [u]
    );
    assert.equal(f?.item_kind, "sim");
    assert.equal(f?.item_id, versionId, "the item is the sim version");
    assert.equal(f?.objective_id, OBJ_TB);
    assert.equal(f?.note, "The backup toggle did nothing.", "the learner's words stay in note");
    assert.equal(f?.question, `${TB_DOC.title} (version 1)`);
    assert.deepEqual(
      { simId: f?.context.simId, versionId: f?.context.versionId, version: f?.context.version, runId: f?.context.runId, tick: f?.context.tick, stateHash: f?.context.stateHash, serverHash: f?.context.serverHash },
      { simId: TB, versionId, version: 1, runId, tick: 0, stateHash: synced.body.serverHash, serverHash: synced.body.serverHash }
    );
    const again = await report(u, { kind: "sim", runId, tick: 0, note: "again" });
    assert.equal(again.body.recorded, false, "one flag per learner per version");
    // Malformed context is dropped, not stored.
    const v = await newUser();
    const vs = await start(v, TB, { restart: true });
    assert.equal((await report(v, { kind: "sim", runId: vs.body.run.id, tick: -4, stateHash: "<script>" })).status, 200);
    const vc = await queryOne<{ context: Record<string, unknown> }>(`select context from item_flags where user_id = $1`, [v]);
    assert.equal(vc?.context.tick, null);
    assert.equal(vc?.context.stateHash, null);
    await query(`delete from item_flags where item_kind = 'sim' and user_id = any($1::uuid[])`, [[u, v]]);
  });

  test("another learner's run, an unknown run and a missing run id cannot be reported; the switch off is 404", async () => {
    const u = await newUser();
    const s = await start(u, TB, { restart: true });
    const other = await newUser();
    assert.equal((await report(other, { kind: "sim", runId: s.body.run.id })).status, 404);
    assert.equal((await report(u, { kind: "sim", runId: randomUUID() })).status, 404);
    assert.equal((await report(u, { kind: "sim" })).status, 400);
    delete process.env.SIMS_ENABLED;
    assert.equal((await report(u, { kind: "sim", runId: s.body.run.id })).status, 404);
  });

  test("enough reports pull the version: it joins the review queue, new runs cannot start on it, and confirming it voids its attempts", async () => {
    const scorer = await newUser();
    const played = await playPath(scorer, TB, TB_DOC, pathOf(TB_GOLDEN, "reference"));
    const attemptId = played.debrief.attempt.id as string;
    const versionId = (await queryOne<{ sim_version_id: string }>(`select sim_version_id from sim_runs where id = $1`, [played.runId]))!.sim_version_id;
    // A learner mid-run on this version.
    const midway = await newUser();
    const open = await start(midway, TB, { restart: true });
    const threshold = await quarantineThreshold();
    for (let i = 0; i < threshold; i++) {
      const u = i === 0 ? scorer : await newUser();
      const s = i === 0 ? { body: { run: { id: played.runId } } } : await start(u, TB, { restart: true });
      const r = await report(u, { kind: "sim", runId: s.body.run.id, note: `report ${i}` });
      assert.equal(r.status, 200, JSON.stringify(r.body));
    }
    assert.equal((await queryOne<{ status: string }>(`select status from item_status where item_kind = 'sim' and item_id = $1`, [versionId]))?.status, "quarantined");
    // The review queue lists it, by version.
    await runContentSignals({ now: new Date(Date.now() + 60_000) });
    const q = await listQueue({ status: "open", limit: 500 });
    assert.ok(q.some((e) => e.item_kind === "sim" && e.item_id === versionId && e.signal === "learner_reports"), "the sim version is in the review queue");
    // Pulled from rotation: no version left to serve, so a new run cannot start.
    const fresh = await newUser();
    assert.notEqual((await start(fresh, TB, { restart: true })).status, 200);
    // A person confirms it: the scored run's attempt is voided.
    const voided = await confirmItemWrong({ kind: "sim", itemId: versionId, objectiveId: OBJ_TB, question: TB_DOC.title }, "test: wrong scoring");
    assert.ok(voided >= 1);
    assert.ok((await queryOne<{ voided_at: Date | null }>(`select voided_at from attempts where id = $1`, [attemptId]))?.voided_at, "the attempt is voided");
    // A fixed version 2 goes live; the learner mid-run on the condemned
    // version resumes into a new run on version 2, never scored on version 1.
    const v2 = await queryOne<{ id: string }>(
      `insert into sim_versions (sim_id, version, schema_version, engine_major, engine_minor, renderer_level, document, client_document, content_hash, client_hash)
       select sim_id, 2, schema_version, engine_major, engine_minor, renderer_level, document, client_document, md5(content_hash) || md5(content_hash || '-2'), client_hash from sim_versions where id = $1 returning id`,
      [versionId]
    );
    await query(`update sims set head_version_id = $2 where id = $1`, [TB, v2!.id]);
    const resumed = await start(midway, TB, {});
    assert.equal(resumed.status, 200, JSON.stringify(resumed.body));
    assert.notEqual(resumed.body.run.id, open.body.run.id, "a new run");
    assert.equal(resumed.body.run.versionId, v2!.id);
    assert.equal((await queryOne<{ status: string }>(`select status from sim_runs where id = $1`, [open.body.run.id]))?.status, "abandoned");
    assert.equal((await start(fresh, TB, { restart: true })).body.run.versionId, v2!.id, "new runs get version 2");
  });
});
