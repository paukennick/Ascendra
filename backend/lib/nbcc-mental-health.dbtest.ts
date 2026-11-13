// REQ-239: the NCE and NCMHCE courses as seeded (npm run seed, as CI runs it
// before test:db), against a real Postgres with every migration applied:
//   - both sit in Mental Health > counseling licensure, so the REQ-224 18+
//     gate applies through the category with no code change: opening,
//     studying, labs and sims answer 403 mature_content_required until the
//     learner confirms, and the study notice is asked first;
//   - the exam rows carry NBCC's domains and weights (the NCMHCE's Areas of
//     Clinical Focus at 0);
//   - the 12 + 12 labs and the 5 client sessions are seeded against their
//     courses' objectives, and every session's expert path plays through the
//     routes to a target ending and one attempt.
// The model is faked.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { query, queryOne, closePool } from "./db";
import { closeOwner } from "./test-owner";
import { signAccessToken } from "./auth/tokens";
import { __setClientForTest } from "./anthropic";
import { setAiCallSink } from "./ai-calls";
import { recordStudyNoticeAcceptance } from "./study-notice";
import { MATURE_CONTENT_NOTICE_VERSION } from "./mature-content";
import { NBCC_SESSION_DOCUMENTS, loadDocument } from "./sim/documents.ts";
import { replayGoldenPath, stateHash } from "./sim/engine/v1/index.ts";
import type { GoldenFile, GoldenPath, ScenarioDoc } from "./sim/engine/v1/index.ts";
import { replayRun } from "./sim/server-run.ts";
import { GET as courseGet } from "../app/api/courses/[id]/route";
import { GET as labsGet } from "../app/api/labs/route";
import { POST as acceptPost } from "../app/api/mature-content/accept/route";
import { GET as simsGet } from "../app/api/sims/route";
import { POST as runsPost } from "../app/api/sims/[id]/runs/route";
import { POST as commandsPost } from "../app/api/sims/runs/[runId]/commands/route";
import { POST as reasoningPost } from "../app/api/sims/runs/[runId]/reasoning/route";
import { POST as finishPost } from "../app/api/sims/runs/[runId]/finish/route";

const run = Date.now().toString(36);
const users: string[] = [];
const tracks: Record<string, string> = {};
const CAPS = "protocol=1;engine=1.2;renderers=bedside@3,board@3,session@1";

async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `nbcc-${run}-${users.length}@example.test`]);
  return u;
}
const req = (u: string, url: string, method = "GET", body?: unknown) =>
  new Request(`http://t${url}`, {
    method,
    headers: { authorization: `Bearer ${signAccessToken({ sub: u, email: `${u}@example.test` })}`, "content-type": "application/json", "x-sim-caps": CAPS },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const json = async (res: Response) => ({ status: res.status, body: (await res.json()) as Record<string, any> });
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const runCtx = (runId: string) => ({ params: Promise.resolve({ runId }) });
// REQ-259: the 18+ acknowledgement is per course, and the account's first one carries a date of birth.
const confirm = (u: string, trackId: string) =>
  acceptPost(req(u, "/api/mature-content/accept", "POST", { trackId, version: MATURE_CONTENT_NOTICE_VERSION, attested: true, dateOfBirth: "1990-01-15", source: "course" })).then(json);
const docOf = (slug: string): ScenarioDoc => loadDocument(NBCC_SESSION_DOCUMENTS.find((e) => e.slug === slug)!);
const goldenOf = (slug: string): GoldenFile => JSON.parse(readFileSync(NBCC_SESSION_DOCUMENTS.find((e) => e.slug === slug)!.golden!, "utf8")) as GoldenFile;

before(async () => {
  setAiCallSink(null);
  for (const code of ["NCE", "NCMHCE"]) {
    const t = await queryOne<{ id: string }>(`select id from subject_tracks where code = $1 and user_id is null`, [code]);
    assert.ok(t, `${code} is seeded (run npm run seed before npm run test:db)`);
    tracks[code] = t!.id;
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
        const out = { verdict: "correct", feedback: "fake", classification: "none", missedParts: [], fixNext: "FIX", parts: labels.map((part) => ({ part, score: "met", comment: "c" })) };
        return { parsed_output: out, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
      },
    },
  } as any);
});

beforeEach(() => {
  process.env.SIMS_ENABLED = "on";
  delete process.env.SIMS_RENDERERS;
  delete process.env.BILLING_ENABLED;
});

after(async () => {
  __setClientForTest(null);
  delete process.env.SIMS_ENABLED;
  if (users.length) {
    await query(`delete from attempts where user_id = any($1::uuid[])`, [users]);
    await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  }
  await closePool();
  await closeOwner();
});

describe("REQ-239: the seeded NCE and NCMHCE courses", () => {
  test("both sit in Mental Health > counseling licensure, with NBCC's domains and weights on the exam row", async () => {
    for (const [code, weights] of [
      ["NCE", [12, 12, 29, 9, 30, 8]],
      ["NCMHCE", [15, 25, 0, 15, 30, 15]],
    ] as const) {
      const cat = await queryOne<{ cat: string; sub: string }>(
        `select c.slug as cat, s.slug as sub from subject_tracks t join education_subcategories s on s.id = t.subcategory_id
           join education_categories c on c.id = s.category_id where t.id = $1`,
        [tracks[code]]
      );
      assert.deepEqual(cat, { cat: "mental-health", sub: "counseling-licensure" }, code);
      const domains = await query<{ w: string | null }>(
        `select d.weight_percent::text as w from exam_domains d join credential_exams e on e.id = d.exam_id
          where e.exam_code = $1 order by d.sort_order`,
        [code]
      );
      assert.deepEqual(domains.map((d) => Number(d.w)), [...weights], code);
      const units = await query<{ n: string }>(`select count(*)::text as n from course_units where track_id = $1 and retired_at is null`, [tracks[code]]);
      assert.equal(units[0].n, "6");
    }
  });

  test("the 18+ gate applies through the category: opening the course, its labs and starting a sim refuse until confirmed; the study notice comes first", async () => {
    for (const code of ["NCE", "NCMHCE"]) {
      const id = tracks[code];
      const u = await newUser();
      const first = await json(await labsGet(req(u, `/api/labs?trackId=${id}`)));
      assert.equal(first.status, 403);
      assert.equal(first.body.code, "study_notice_required", `${code}: the study notice is asked first`);
      await recordStudyNoticeAcceptance(u);
      // The sims LIST names the sims (titles only, like the catalog) and is not
      // gated (REQ-224 gates the course, teaching and start routes); starting
      // one is.
      const listed = await json(await simsGet(req(u, `/api/sims?trackId=${id}`)));
      assert.equal(listed.status, 200);
      const simId = listed.body.sims[0].id as string;
      for (const res of [
        await courseGet(req(u, `/api/courses/${id}`), idCtx(id)),
        await labsGet(req(u, `/api/labs?trackId=${id}`)),
        await runsPost(req(u, "/api/x", "POST", { restart: true, deviceId: "dev-a" }), idCtx(simId)),
      ]) {
        const r = await json(res);
        assert.equal(r.status, 403, `${code}: ${JSON.stringify(r.body)}`);
        assert.equal(r.body.code, "mature_content_required");
        assert.equal(r.body.category, "mental-health");
        assert.equal(r.body.minAge, 18);
      }
      assert.equal((await confirm(u, id)).status, 200);
      const opened = await json(await courseGet(req(u, `/api/courses/${id}`), idCtx(id)));
      assert.equal(opened.status, 200, JSON.stringify(opened.body));
      const labs = await json(await labsGet(req(u, `/api/labs?trackId=${id}`)));
      assert.equal(labs.status, 200, JSON.stringify(labs.body));
    }
  });

  test("12 labs per course on active objectives of that course, both kinds", async () => {
    for (const code of ["NCE", "NCMHCE"]) {
      const r = await queryOne<{ n: string; kinds: string }>(
        `select count(*)::text as n, string_agg(distinct l.kind, ',' order by l.kind) as kinds
           from labs l join objectives o on o.id = l.objective_id join course_units cu on cu.id = o.unit_id
          where cu.track_id = $1 and o.retired_at is null`,
        [tracks[code]]
      );
      assert.deepEqual(r, { n: "12", kinds: "build,case" }, code);
    }
  });

  test("the five client sessions are seeded as session sims on their exact objectives", async () => {
    const rows = await query<{ slug: string; screen_type: string; objective: string; code: string }>(
      `select s.slug, s.screen_type, o.title as objective, t.code
         from sims s join objectives o on o.id = s.objective_id join course_units cu on cu.id = o.unit_id join subject_tracks t on t.id = cu.track_id
        where s.slug = any($1::text[]) order by s.slug`,
      [NBCC_SESSION_DOCUMENTS.map((e) => e.slug)]
    );
    assert.equal(rows.length, 5);
    for (const r of rows) {
      const e = NBCC_SESSION_DOCUMENTS.find((x) => x.slug === r.slug)!;
      assert.equal(r.code, e.course);
      assert.equal(r.screen_type, "session");
      assert.equal(r.objective, docOf(r.slug).objective);
    }
  });
});

function momentOpening(doc: ScenarioDoc, path: GoldenPath): { openedSeq: number; openedTick: number; moment: string } | null {
  for (let i = 0; i <= path.commands.length; i++) {
    const r = replayRun({ doc, seed: path.seed, from: null, commands: path.commands.slice(0, i), budget: 1e12 });
    if (r.run.state.openReasoning) return { openedSeq: i === 0 ? 0 : path.commands[i - 1].seq, openedTick: r.run.state.tick, moment: r.run.state.openReasoning };
  }
  return null;
}

describe("REQ-239: each session's expert path through the routes", () => {
  for (const e of NBCC_SESSION_DOCUMENTS) {
    test(`${e.course}/${e.slug}: target ending, a Good rating, one attempt`, async () => {
      const u = await newUser();
      await recordStudyNoticeAcceptance(u);
      await confirm(u, tracks[e.course]);
      const sim = await queryOne<{ id: string }>(`select id from sims where slug = $1`, [e.slug]);
      const doc = docOf(e.slug);
      const path = goldenOf(e.slug).paths.find((p) => p.id === "expert")!;
      const s = await json(await runsPost(req(u, "/api/x", "POST", { restart: true, deviceId: "dev-a" }), idCtx(sim!.id)));
      assert.equal(s.status, 200, JSON.stringify(s.body));
      const runId = s.body.run.id as string;
      const lease = s.body.run.leaseEpoch as number;
      await query(`update sim_runs set seed = $2 where id = $1`, [runId, path.seed]);
      const open = momentOpening(doc, path)!;
      const before = path.commands.filter((c) => c.seq <= open.openedSeq);
      const rest = path.commands.filter((c) => c.seq > open.openedSeq);
      const r1 = await json(await commandsPost(req(u, "/api/x", "POST", { leaseEpoch: lease, commands: before, tick: open.openedTick }), runCtx(runId)));
      assert.equal(r1.status, 200, JSON.stringify(r1.body));
      assert.equal(r1.body.rejected, null, JSON.stringify(r1.body.rejected));
      const g = await json(await reasoningPost(req(u, "/api/x", "POST", { momentId: open.moment, openedSeq: open.openedSeq, openedTick: open.openedTick, answer: "A full formulation of the case.", clientAttemptId: randomUUID() }), runCtx(runId)));
      assert.equal(g.status, 200, JSON.stringify(g.body));
      const expected = replayGoldenPath(doc, structuredClone(path), (r) => stateHash(r.state));
      await query(`update sim_runs set last_sync_at = null where id = $1`, [runId]);
      const r2 = await json(await commandsPost(req(u, "/api/x", "POST", { leaseEpoch: lease, commands: rest, tick: expected.finalTick }), runCtx(runId)));
      assert.equal(r2.status, 200, JSON.stringify(r2.body));
      assert.equal(r2.body.serverHash, expected.stateHash, "the server's replay reaches the engine's state");
      const f = await json(await finishPost(req(u, "/api/x", "POST", { leaseEpoch: lease, tick: expected.finalTick }), runCtx(runId)));
      assert.equal(f.status, 200, JSON.stringify(f.body));
      assert.equal(f.body.ending, path.expect.ending);
      assert.equal(f.body.outcomeClass, "target");
      assert.equal(f.body.rating, "good");
      const a = await query<{ verdict: string }>(`select verdict::text as verdict from attempts where user_id = $1 and sim_id = $2`, [u, sim!.id]);
      assert.deepEqual(a, [{ verdict: "correct" }]);
    });
  }
});
