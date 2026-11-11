// REQ-232 (docs/sims.md 12, 22.7): the DPT treatment sessions against a real
// Postgres with every migration applied. A stand-in course (its own code, the
// three DPT objective titles, the physical-therapy subcategory) is created
// here, so the test needs no catalog seed: the seed resolves each document by
// course code and exact objective title and is idempotent; the course's
// healthcare category makes the sims clinical, so the clinical pace rule
// applies (study pace 3x by default); the renderer is negotiated
// (treatment-session@1) and switched by SIMS_RENDERERS; golden paths play
// through the routes to one attempt each. The model is faked.
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
import { DPT_OBJECTIVES, DPT_TREATMENT_DOCUMENTS, loadDocument, type DocumentEntry } from "./sim/documents.ts";
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
const CODE = `DPTT-${run}`; // a stand-in for the DPT course
const track = randomUUID();
const users: string[] = [];
let pool: Pool;
let simIds: Record<string, string> = {};

const CAPS = "protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1,treatment-session@1";
const NO_TREATMENT = "protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1";

const entriesFor = (course: string): DocumentEntry[] => DPT_TREATMENT_DOCUMENTS.map((e) => ({ ...e, course }));
const docOf = (slug: string): ScenarioDoc => loadDocument(DPT_TREATMENT_DOCUMENTS.find((e) => e.slug === slug)!);
const goldenOf = (slug: string): GoldenFile => JSON.parse(readFileSync(DPT_TREATMENT_DOCUMENTS.find((e) => e.slug === slug)!.golden!, "utf8")) as GoldenFile;

let score: "met" | "partial" | "missed" = "met";

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `pt-${run}-${users.length}@example.test`]);
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
const list = (u: string, caps = CAPS) => listGet(req(u, "GET", undefined, caps, `http://t/api/sims?trackId=${track}`)).then(json);
const start = (u: string, sim: string, caps = CAPS) => runsPost(req(u, "POST", { restart: true, deviceId: "dev-a" }, caps), idCtx(sim)).then(json);

function momentOpening(doc: ScenarioDoc, path: GoldenPath): { openedSeq: number; openedTick: number; moment: string } | null {
  for (let i = 0; i <= path.commands.length; i++) {
    // A moment that opens on the clock (these do, 30 s in) is open at the
    // tick of the command that answers it, so replay up to that tick.
    const toTick = i < path.commands.length ? path.commands[i].tick : null;
    const r = replayRun({ doc, seed: path.seed, from: null, commands: path.commands.slice(0, i), toTick, budget: 1e12 });
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
  // A running sim is held to wall time (the speed bound); this run "started"
  // long enough ago for every real-time tick of the path.
  await query(`update sim_runs set seed = $2, started_at = now() - interval '1 day' where id = $1`, [runId, path.seed]);
  const open = momentOpening(doc, path);
  const grade = path.reasoning?.plan ?? "missed";
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
    const g = await reasoningPost(req(u, "POST", { momentId: open.moment, openedSeq: open.openedSeq, openedTick: open.openedTick, answer: "Screen first, stage the activity, stop on the rules and call the team.", clientAttemptId: randomUUID() }), runCtx(runId)).then(json);
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
  await query(`update sim_runs set last_sync_at = null where id = $1`, [runId]);
  const f = await finishPost(req(u, "POST", { leaseEpoch: lease, tick: expected.finalTick }), runCtx(runId)).then(json);
  assert.equal(f.status, 200, JSON.stringify(f.body));
  return f.body;
}

before(async () => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslOption(), max: 2 });
  setAiCallSink(null);
  const unit = randomUUID();
  // The physical-therapy subcategory sits under healthcare (migration 020),
  // which is what makes these sims clinical.
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, subcategory_id)
     values ($1, $2, 'DPT stand-in', 'graduate', null, (select id from education_subcategories where slug = 'physical-therapy'))`,
    [track, CODE]
  );
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Unit', 0, 100)`, [unit, track]);
  let i = 0;
  for (const t of DPT_OBJECTIVES) await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [randomUUID(), unit, t, i++]);
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
  await query(`delete from sims where objective_id in (select o.id from objectives o join course_units cu on cu.id = o.unit_id where cu.track_id = any($1::uuid[]))`, [[track]]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[track]]);
  await pool.end();
  await closePool();
  await closeOwner();
});

describe("seeding", () => {
  test("the three DPT cases resolve to their objectives as clinical treatment-session sims, and a second seed changes nothing", async () => {
    const first = await seedSims(pool, entriesFor(CODE));
    assert.deepEqual(first.map((r) => r.change), ["new", "new", "new"]);
    simIds = Object.fromEntries(first.map((r) => [r.slug, r.simId]));
    const rows = await query<{ slug: string; screen_type: string; safety_family: string; objective: string; engine_minor: number; renderer_level: number }>(
      `select s.slug, s.screen_type, s.safety_family, o.title as objective, v.engine_minor, v.renderer_level
         from sims s join objectives o on o.id = s.objective_id join sim_versions v on v.id = s.head_version_id
        where s.id = any($1::uuid[]) order by s.slug`,
      [Object.values(simIds)]
    );
    assert.equal(rows.length, 3);
    for (const r of rows) {
      assert.equal(r.screen_type, "treatment-session");
      assert.equal(r.safety_family, "clinical");
      assert.equal(r.objective, docOf(r.slug).objective);
      assert.equal(r.engine_minor, 2);
      assert.equal(r.renderer_level, 1);
    }
    const again = await seedSims(pool, entriesFor(CODE));
    assert.deepEqual(again.map((r) => r.change), ["unchanged", "unchanged", "unchanged"]);
  });
});

describe("the treatment-session renderer", () => {
  test("an app with treatment-session@1 can run them, at study pace by default; one without it is told to update", async () => {
    const u = await newUser();
    const l = await list(u);
    assert.equal(l.status, 200);
    const mine = l.body.sims.filter((s: any) => Object.values(simIds).includes(s.id));
    assert.equal(mine.length, 3);
    assert.ok(mine.every((s: any) => s.screenType === "treatment-session" && s.runnable === true));
    const s = await start(u, simIds["icu-early-mobility"]);
    assert.equal(s.status, 200, JSON.stringify(s.body));
    assert.deepEqual(s.body.pacing, { eligible: true, studyPace: 3, examPace: 1, defaultPace: 3 });
    const old = await list(u, NO_TREATMENT);
    assert.ok(old.body.sims.filter((x: any) => Object.values(simIds).includes(x.id)).every((x: any) => x.runnable === false));
    const o = await start(u, simIds["stroke-balance-fall-risk"], NO_TREATMENT);
    assert.equal(o.status, 409);
    assert.equal(o.body.code, "app_update_required");
  });

  test("SIMS_RENDERERS without treatment-session hides them", async () => {
    const u = await newUser();
    process.env.SIMS_RENDERERS = "bedside,board,session";
    const l = await list(u);
    assert.equal(l.body.sims.filter((s: any) => Object.values(simIds).includes(s.id)).length, 0);
    assert.equal((await start(u, simIds["tka-gait-dvt-red-flag"])).status, 404);
  });
});

describe("golden paths through the routes: one attempt each, the rating as verdict", () => {
  for (const [slug, ids] of [
    ["icu-early-mobility", ["expert", "ignoredAlarms"]],
    ["tka-gait-dvt-red-flag", ["expert", "peCaught"]],
    ["stroke-balance-fall-risk", ["expert", "unguardedFall", "testsOnly"]],
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
