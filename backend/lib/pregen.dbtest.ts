// REQ-208 (FAIL-970..979): shared-lesson pre-generation against a real
// Postgres with every migration applied. The Batches API and the model are
// fakes; no key, no network. Run with:
//   DATABASE_URL=... PGSSLMODE=disable npm run test:db
//
//   - which objectives are eligible, and in what (priority) order
//   - the budget: the upper bound, the unit-by-unit cutoff, the refusals
//   - the two-batch flow: the practice requests carry the teaching text
//   - collect: the app's own gates (fact-check, holdbacks, exec queue),
//     insert-if-absent, usage in ai_calls, nothing printed but counts
//   - the global daily AI ceiling leaves pre-generation out
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
const run = Date.now().toString(36);
// A model id of the Sonnet 5.5 family (so it is priced and parameterised as
// one) that no other test uses, so ai_calls rows are ours alone.
process.env.ANTHROPIC_MODEL = `claude-sonnet-5-5-pg${run}`;
import { test, describe, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { __setClientForTest } from "./anthropic";
import { flushAiCallLog, setAiCallSink } from "./ai-calls";
import { globalSpendSinceUsd } from "./ai-budget";
import { AUTHORED_LESSONS } from "./authored-lessons";
import { saveLesson } from "./lesson-store";
import { lessonItemId } from "./item-quality";
import { lessonIntroProblems, lessonPracticeProblems } from "./content-validator";
import { introFromModel } from "./prompts";
import {
  collectRun,
  estimateRun,
  plan,
  practiceParams,
  selectCandidates,
  submitRun,
  liveRequestUpperUsd,
  liveRetryWriter,
  type BatchInfo,
  type BatchesClient,
  type Ctx,
  type RetryWriter,
} from "./pregen";
import { claudeGenerator, loadObjective } from "./lesson-generation";
import { fixFor, lessonPracticeLint } from "./content-validator";
import { ITEM_WRITING_RULES } from "./prompts";
import { BudgetError, batchUsageUsd, factCheckUpperUsd, parseRequestId, requestIds } from "../scripts/pregenerate-lib";

const MODEL = process.env.ANTHROPIC_MODEL!;
const codeA = `PGA${run}`.toUpperCase();
const codeB = `PGB${run}`.toUpperCase();
const codeH = `PGH${run}`.toUpperCase();
const trackA = randomUUID();
const trackB = randomUUID();
const trackH = randomUUID();
const trackPrivate = randomUUID();
const owner = randomUUID();
const unit = { a1: randomUUID(), a2: randomUUID(), b1: randomUUID(), h1: randomUUID(), retired: randomUUID(), priv: randomUUID() };
const ids: Record<string, string> = {};
const titleOf = new Map<string, string>();

async function objective(key: string, unitId: string, sort: number, extra = ""): Promise<void> {
  const id = randomUUID();
  ids[key] = id;
  titleOf.set(id, `Objective ${key} ${run}`);
  await query(`insert into objectives (id, unit_id, title, sort_order ${extra ? ", retired_at" : ""}) values ($1, $2, $3, $4 ${extra ? ", now() - interval '1 day'" : ""})`, [
    id,
    unitId,
    titleOf.get(id),
    sort,
  ]);
}

before(async () => {
  setAiCallSink(null);
  await query(`insert into app_users (id, email) values ($1, $2)`, [owner, `pregen-${run}@example.test`]);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Track A', 'certification', null)`, [trackA, codeA]);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Track B', 'certification', null)`, [trackB, codeB]);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id, hidden_at) values ($1, $2, 'Hidden', 'certification', null, now() - interval '1 day')`, [trackH, codeH]);
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Private', 'certification', $3)`, [trackPrivate, `PGP${run}`, owner]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'A unit 1', 1), ($3, $2, 'A unit 2', 2)`, [unit.a1, trackA, unit.a2]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'B unit 1', 1)`, [unit.b1, trackB]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'H unit', 1)`, [unit.h1, trackH]);
  await query(`insert into course_units (id, track_id, title, sort_order, retired_at) values ($1, $2, 'Retired unit', 3, now() - interval '1 day')`, [unit.retired, trackA]);
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'Private unit', 1)`, [unit.priv, trackPrivate]);
  // Track A: unit 1 has a1..a3 (a3 retired), unit 2 has a4 (has a lesson already) and a5 (authored) and a6.
  await objective("a1", unit.a1, 1);
  await objective("a2", unit.a1, 2);
  await objective("a3retired", unit.a1, 3, "retired");
  await objective("a4has", unit.a2, 1);
  await objective("a5authored", unit.a2, 2);
  await objective("a6", unit.a2, 3);
  await objective("a7inRetiredUnit", unit.retired, 1);
  await objective("b1", unit.b1, 1);
  await objective("b2", unit.b1, 2);
  await objective("h1", unit.h1, 1);
  await objective("p1", unit.priv, 1);
});

after(async () => {
  __setClientForTest(null);
  setAiCallSink(null);
  delete (AUTHORED_LESSONS as Record<string, unknown>)[codeA];
  await query(`delete from ai_calls where model = $1`, [MODEL]);
  await query(`delete from item_holdbacks where objective_id = any($1::uuid[])`, [Object.values(ids)]);
  await query(`delete from exec_checks where objective_id = any($1::uuid[])`, [Object.values(ids)]);
  await query(`delete from item_status where objective_id = any($1::uuid[])`, [Object.values(ids)]);
  await query(`delete from subject_tracks where id = any($1::uuid[])`, [[trackA, trackB, trackH, trackPrivate]]);
  await query(`delete from app_users where id = $1`, [owner]);
  await closePool();
});

// --- fakes -----------------------------------------------------------------

const CORRECT = "Use TCP port 443";
const choices = () => ["Use TCP port 80", CORRECT, "Use TCP port 8080", "Use TCP port 22"];
const reasons = () => ["Port 80 is plain HTTP.", "Port 443 is HTTPS.", "Port 8080 is an alternate HTTP port.", "Port 22 is SSH."];

function introBody(id: string, over: Record<string, unknown> = {}) {
  return {
    guessPrompt: `What do you already know about ${titleOf.get(id)}?`,
    definition: `TEACHMARK-${id.slice(0, 8)} is the idea this objective teaches, in plain words for a new learner.`,
    whyItMatters: "It matters because exam questions and real systems both depend on it.",
    exampleSetup: "A small company sets up a web server for its customers.",
    exampleSteps: ["The team picks the secure web protocol.", "They open the matching port on the firewall."],
    commonMistake: "Learners often confuse the plain and the secure web ports.",
    selfExplainStep: 2,
    selfExplainQuestion: "Why does opening the port follow from choosing the protocol?",
    selfExplainAnswer: "The firewall blocks traffic on any port that is not opened, so the protocol's port must be opened.",
    confidence: "high",
    uncertainClaims: [] as string[],
    ...over,
  };
}

function practiceBody(id: string, over: Record<string, unknown> = {}) {
  return {
    fadeProblem: `A team of ${id.slice(0, 4)} engineers is configuring a firewall. Which port must be opened so browsers can reach the secure site?`,
    fadeChoices: choices(),
    fadeCorrectIndex: 1,
    fadeWhy: "Secure web traffic uses port 443.",
    soloCheck: `Another team (${id.slice(4, 8)}) must allow secure browsing to its server. Which port does that need?`,
    soloChoices: choices(),
    soloCorrectIndex: 1,
    soloWhy: "Secure web traffic uses port 443.",
    fadeOptionReasons: reasons(),
    soloOptionReasons: reasons(),
    soloVerification: null,
    confidence: "high",
    uncertainClaims: [] as string[],
    ...over,
  };
}

// Sanity: the fixtures pass the app's own lint, so a held or failed lesson
// below is held for the reason the test gives.
{
  const id = randomUUID();
  assert.deepEqual(lessonIntroProblems(introFromModel(introBody(id) as never)), [], "intro fixture");
  assert.deepEqual(lessonPracticeProblems(practiceBody(id) as never), [], "practice fixture");
}

const okLine = (customId: string, body: unknown, usage = { input_tokens: 2000, output_tokens: 1500 }) => ({
  custom_id: customId,
  result: { type: "succeeded", message: { model: MODEL, content: [{ type: "text", text: JSON.stringify(body) }], stop_reason: "end_turn", usage } },
});

class FakeBatches implements BatchesClient {
  created: { id: string; requests: { custom_id: string; params: Record<string, any> }[] }[] = [];
  results_ = new Map<string, unknown[]>();
  info = new Map<string, BatchInfo>();
  listed: BatchInfo[] = [];
  private n = 0;
  async create(p: { requests: { custom_id: string; params: Record<string, unknown> }[] }) {
    const id = `msgbatch_FAKE${run}${++this.n}`;
    this.created.push({ id, requests: p.requests as never });
    return { id };
  }
  async retrieve(id: string): Promise<BatchInfo> {
    // stable per batch, as the API's is: the ai_calls row is dated by it
    if (!this.info.has(id)) this.info.set(id, { id, processing_status: "ended", request_counts: { succeeded: 1 }, created_at: "2026-11-10T00:00:00Z", ended_at: new Date().toISOString() });
    return this.info.get(id)!;
  }
  async results(id: string) {
    const lines = this.results_.get(id) ?? [];
    return (async function* () {
      for (const l of lines) yield l;
    })();
  }
  list() {
    const items = this.listed;
    return (async function* () {
      for (const b of items) yield b;
    })();
  }
}

let fake: FakeBatches;
let logs: string[];
// REQ-235: the one steered retry of a held half. By default the fake writer
// repeats the batch's own draft (so a held lesson is held again, as before
// REQ-235); a test can make the retry come back clean.
type Over = { intro?: (id: string) => Record<string, unknown>; practice?: (id: string) => Record<string, unknown> };
let batchOver: Over = {};
let retryOver: Over | null = null;
let retryCalls: { kind: "intro" | "practice"; id: string; steer: string | null }[] = [];
const idOfTitle = (title: string) => [...titleOf.entries()].find(([, t]) => t === title)![0];
const fakeRetryWriter: RetryWriter = {
  async intro(obj, steer) {
    const id = idOfTitle(obj.title);
    retryCalls.push({ kind: "intro", id, steer });
    const over = (retryOver ?? batchOver).intro?.(id) ?? {};
    return introFromModel(introBody(id, over) as never);
  },
  async practice(obj, _teach, steer) {
    const id = idOfTitle(obj.title);
    retryCalls.push({ kind: "practice", id, steer });
    return practiceBody(id, (retryOver ?? batchOver).practice?.(id) ?? {}) as never;
  },
};
const ctx = (): Ctx => ({ batches: fake, log: (m) => logs.push(m), retryWriter: fakeRetryWriter });

// The fact-check model: answers from a per-objective policy keyed by the tag
// in the question text.
type Policy = "agree" | "disagree" | "unsupported" | "omit-solo";
let policy: (questionText: string) => Policy;
let parseBodies: any[] = [];

function installModel() {
  __setClientForTest({
    messages: {
      create: async () => {
        throw new Error("no create expected");
      },
      parse: async (body: any) => {
        parseBodies.push(body);
        const user: string = body.messages[0].content;
        const blocks = [...user.matchAll(/<item key="(\w+)"[^>]*>([\s\S]*?)<\/item>/g)];
        const results = blocks
          .map((m) => {
            const text = m[2];
            const opts = [...text.matchAll(/^Option (\d+): (.*)$/gm)].map((o) => ({ i: Number(o[1]), t: o[2] }));
            const right = opts.find((o) => o.t === CORRECT)!.i;
            const p = policy(text);
            if (p === "omit-solo" && m[1] === "solo") return null;
            return {
              key: m[1],
              answer: [p === "disagree" ? (right + 1) % 4 : right],
              unsupportedClaims: p === "unsupported" ? ["SECRETCLAIM the limit changed in 2026"] : [],
            };
          })
          .filter(Boolean);
        return { parsed_output: { results }, stop_reason: "end_turn", usage: { input_tokens: 1200, output_tokens: 700 } };
      },
    },
  } as never);
}

beforeEach(async () => {
  // The base state of every test: a4 already has a lesson, a5 has an authored one.
  await insertLesson(ids.a4has, "has");
  (AUTHORED_LESSONS as Record<string, unknown>)[codeA] = { [titleOf.get(ids.a5authored)!]: { authored: true } };
  fake = new FakeBatches();
  logs = [];
  parseBodies = [];
  policy = () => "agree";
  batchOver = {};
  retryOver = null;
  retryCalls = [];
  installModel();
});

afterEach(async () => {
  const all = Object.values(ids);
  delete (AUTHORED_LESSONS as Record<string, unknown>)[codeA];
  await query(`delete from item_holdbacks where objective_id = any($1::uuid[])`, [all]);
  await query(`delete from exec_checks where objective_id = any($1::uuid[])`, [all]);
  await query(`delete from item_status where objective_id = any($1::uuid[])`, [all]);
  await query(`delete from lesson_content where objective_id = any($1::uuid[])`, [all]);
  await query(`update objectives set retired_at = null where id = $1`, [ids.a2]);
  await flushAiCallLog();
  await query(`delete from ai_calls where model = $1`, [MODEL]);
});

const A = () => ({ tracks: [codeB, codeA], limit: null as number | null });

async function insertLesson(objectiveId: string, tag: string) {
  await saveLesson({ kind: "shared" }, objectiveId, { ...introFromModel(introBody(objectiveId) as never), ...(practiceBody(objectiveId, { fadeProblem: `existing ${tag}` }) as object) } as never, "claude-sonnet-5");
}

// Drives a full run to the point where the practice batch is ended and its
// lines are in the fake. Returns the batch ids.
async function runToPracticeBatch(tracks: string[], over: Over = {}) {
  batchOver = over;
  await submitRun({ tracks, limit: null, maxUsd: 50, dryRun: false, allowConcurrent: false }, ctx());
  const introBatch = fake.created[0];
  fake.results_.set(introBatch.id, introBatch.requests.map((r) => okLine(r.custom_id, introBody(parseRequestId(r.custom_id)!.objectiveId, over.intro?.(parseRequestId(r.custom_id)!.objectiveId)))));
  const s1 = await collectRun({ batchId: introBatch.id, tracks, maxUsd: 50, dryRun: false, allowConcurrent: false }, ctx());
  const practiceBatch = fake.created[1];
  if (practiceBatch) {
    fake.results_.set(
      practiceBatch.id,
      practiceBatch.requests.map((r) => okLine(r.custom_id, practiceBody(parseRequestId(r.custom_id)!.objectiveId, over.practice?.(parseRequestId(r.custom_id)!.objectiveId)), { input_tokens: 3000, output_tokens: 2000 }))
    );
  }
  return { introBatch, practiceBatch, s1 };
}

const collectPractice = (introId: string, practiceId: string, tracks: string[], maxUsd = 50, dryRun = false) =>
  collectRun({ batchId: practiceId, introBatchId: introId, tracks, maxUsd, dryRun, allowConcurrent: false }, ctx());

const lessonRow = (id: string) => queryOne<{ fade_problem: string; fade_choices: string[]; fade_correct_index: number; solo_choices: string[]; solo_correct_index: number; model: string }>(
  `select fade_problem, fade_choices, fade_correct_index, solo_choices, solo_correct_index, model from lesson_content where objective_id = $1`,
  [id]
);

// --- eligibility -----------------------------------------------------------

describe("FAIL-973/974: which objectives pre-generation may touch", () => {
  test("priority order is the order of --tracks, then unit, then objective; excluded: retired, hidden track, private track, a lesson of any kind, authored", async () => {
    const rows = await selectCandidates({ tracks: [codeB, codeA, codeH, `PGP${run}`] });
    assert.deepEqual(
      rows.map((r) => r.objective_id),
      [ids.b1, ids.b2, ids.a1, ids.a2, ids.a6],
      "B first (as asked), then A by unit; no retired objective or unit, hidden or private track, existing lesson or authored objective"
    );
    // the other order puts A first
    const flipped = await selectCandidates({ tracks: [codeA, codeB] });
    assert.deepEqual(flipped.map((r) => r.objective_id), [ids.a1, ids.a2, ids.a6, ids.b1, ids.b2]);
    // lower-case codes work; --limit takes the first in priority order
    assert.deepEqual((await selectCandidates({ tracks: [codeB.toLowerCase(), codeA], limit: 3 })).map((r) => r.objective_id), [ids.b1, ids.b2, ids.a1]);
  });

  test("a PULLED lesson (a content fix voided it) is not selected: the app, not pre-generation, replaces it", async () => {
    await insertLesson(ids.a1, "voided");
    await query(
      `insert into item_status (item_kind, item_id, objective_id, question, status, reason) values ('lesson', $1, $2, 'q', 'confirmed_wrong', 'flags')`,
      [lessonItemId(ids.a1, "fade", "existing voided"), ids.a1]
    );
    const rows = await selectCandidates({ tracks: [codeA] });
    assert.ok(!rows.some((r) => r.objective_id === ids.a1));
    await query(`delete from lesson_content where objective_id = $1`, [ids.a1]);
    await query(`delete from item_status where objective_id = $1`, [ids.a1]);
  });

  test("an unknown track code is an error, not a silent 'nothing to do'; a hidden one is reported", async () => {
    await assert.rejects(estimateRun({ tracks: [codeA, "NOSUCHTRACK"], limit: null, maxUsd: null }, ctx()), /Unknown track code.*NOSUCHTRACK/);
    await estimateRun({ tracks: [codeH], limit: null, maxUsd: null }, ctx());
    assert.ok(logs.some((l) => l.includes("hidden from the catalog")));
  });
});

// --- budget ----------------------------------------------------------------

describe("FAIL-979: the budget guard", () => {
  test("estimate: per-track counts and cost, an upper bound, and nothing sent", async () => {
    const s = await estimateRun({ ...A(), maxUsd: null }, ctx());
    assert.equal(fake.created.length, 0);
    assert.equal(s.lessons, 5);
    assert.deepEqual(s.perTrack!.map((t) => [t.track, t.objectives]), [[codeB, 2], [codeA, 3]]);
    const perLesson = s.estimateUpperBoundUsd! / 5;
    // Upper bound: intro 4000 + practice 6000 output tokens at the batch price ($5/M) alone is $0.05;
    // the live fact-check at its max_tokens adds more. The old 'typical' figure was $0.0207.
    assert.ok(perLesson > 0.09 && perLesson < 0.2, String(perLesson));
    assert.ok(logs.some((l) => l.includes(codeB) && l.includes("2 lessons")));
  });

  test("a cap cuts off whole units from the end, in priority order, and says where", async () => {
    const full = await plan({ ...A(), maxUsd: null }, () => {});
    const unitCost = (unitId: string) => full.plan.selected.filter((c) => c.unitId === unitId).reduce((a, c) => a + c.usd, 0);
    // enough for B (2 lessons) and A unit 1 (2 lessons), not A unit 2
    const cap = unitCost(unit.b1) + unitCost(unit.a1) + unitCost(unit.a2) / 2;
    const s = await estimateRun({ ...A(), maxUsd: cap }, ctx());
    assert.deepEqual(s.perTrack!.map((t) => [t.track, t.objectives, t.available]), [[codeB, 2, 2], [codeA, 2, 3]]);
    assert.equal(s.cutoff!.track, codeA);
    assert.equal(s.cutoff!.unitTitle, "A unit 2");
    assert.equal(s.cutoff!.skippedObjectives, 1);
    assert.ok(s.estimateUpperBoundUsd! <= cap);
    assert.ok(logs.some((l) => l.includes("Cut off at") && l.includes("A unit 2")));
  });

  test("submit sends only what fits: intro requests for whole units, total under max_usd", async () => {
    const full = await plan({ ...A(), maxUsd: null }, () => {});
    const unitCost = (unitId: string) => full.plan.selected.filter((c) => c.unitId === unitId).reduce((a, c) => a + c.usd, 0);
    const cap = unitCost(unit.b1) + unitCost(unit.a1) + 0.001;
    const s = await submitRun({ ...A(), maxUsd: cap, dryRun: false, allowConcurrent: false }, ctx());
    assert.equal(fake.created.length, 1);
    const sent = fake.created[0].requests.map((r) => parseRequestId(r.custom_id)!);
    assert.ok(sent.every((p) => p.part === "intro"), "the first batch is intro requests only");
    assert.deepEqual(new Set(sent.map((p) => p.objectiveId)), new Set([ids.b1, ids.b2, ids.a1, ids.a2]));
    assert.ok(s.estimateUpperBoundUsd! <= cap);
    assert.equal(s.batchId, fake.created[0].id);
  });

  test("submit refuses when even the first unit is over max_usd, and sends nothing", async () => {
    await assert.rejects(submitRun({ ...A(), maxUsd: 0.05, dryRun: false, allowConcurrent: false }, ctx()), BudgetError);
    assert.equal(fake.created.length, 0);
  });

  test("submit refuses while another batch is running (a double click would pay twice), unless told otherwise", async () => {
    fake.listed = [{ id: "msgbatch_RUNNING1", processing_status: "in_progress" }];
    await assert.rejects(submitRun({ ...A(), maxUsd: 50, dryRun: false, allowConcurrent: false }, ctx()), /still running.*msgbatch_RUNNING1/);
    assert.equal(fake.created.length, 0);
    await submitRun({ ...A(), maxUsd: 50, dryRun: false, allowConcurrent: true }, ctx());
    assert.equal(fake.created.length, 1);
  });

  test("--dry-run builds every request and sends nothing (it does not even look at the workspace)", async () => {
    fake.listed = [{ id: "msgbatch_RUNNING1", processing_status: "in_progress" }];
    const s = await submitRun({ ...A(), maxUsd: 50, dryRun: true, allowConcurrent: false }, ctx());
    assert.equal(fake.created.length, 0);
    assert.equal(s.requests, 5);
    assert.equal(s.dryRun, true);
    assert.ok(logs.some((l) => l.startsWith("Dry run: built 5 intro requests")));
  });
});

// --- stage 1: intro batch -> practice batch --------------------------------

describe("FAIL-970/971/975: the practice batch is built from the teaching text, with the app's checks", () => {
  test("each practice request carries its own lesson's teaching text; the batch holds practice requests only", async () => {
    const { practiceBatch, s1 } = await runToPracticeBatch([codeB, codeA]);
    assert.ok(practiceBatch, "a practice batch was created");
    assert.equal(s1.introBatchId, fake.created[0].id);
    assert.equal(practiceBatch.requests.length, 5);
    for (const r of practiceBatch.requests) {
      const p = parseRequestId(r.custom_id)!;
      assert.equal(p.part, "practice");
      const user = JSON.stringify(r.params.messages);
      assert.ok(user.includes(`TEACHMARK-${p.objectiveId.slice(0, 8)}`), "the questions are written from this lesson's teaching text");
      assert.ok(!user.includes("TEACHMARK-") || !new RegExp(`TEACHMARK-(?!${p.objectiveId.slice(0, 8)})`).test(user), "and no other lesson's");
    }
  });

  test("a course that wants verification asks for the program (python/javascript/academic ctx); others get null", () => {
    const base = { title: "T", unit_title: "U", track_title: "Tr" };
    const academic = JSON.stringify(practiceParams(MODEL, { ...base, ctx: { trackType: "academic", categorySlug: null } as never }, "teach").messages);
    const plainCourse = JSON.stringify(practiceParams(MODEL, { ...base, ctx: null }, "teach").messages);
    assert.ok(academic.includes("recomputes the soloCheck answer"), "verification program requested");
    assert.ok(!plainCourse.includes("recomputes the soloCheck answer"));
  });

  test("an intro the writer is unsure of is held back (logged) and never continued in the batch; an unsure retry is held too", async () => {
    const { practiceBatch } = await runToPracticeBatch([codeB], {
      intro: (id) => (id === ids.b2 ? { confidence: "low", uncertainClaims: ["SECRETCLAIM a 2026 limit"] } : {}),
    });
    assert.deepEqual(practiceBatch.requests.map((r) => parseRequestId(r.custom_id)!.objectiveId), [ids.b1]);
    // REQ-235: retried once, steered; the retry was unsure too, so both drafts are logged and nothing is saved.
    const held = await query<{ item_kind: string; reason: string }>(`select item_kind, reason from item_holdbacks where objective_id = $1 order by created_at`, [ids.b2]);
    assert.deepEqual(held.map((h) => [h.item_kind, h.reason]), [["lesson_intro", "uncertain"], ["lesson_intro", "uncertain"]]);
    assert.equal(await lessonRow(ids.b2), null);
    assert.ok(!logs.join("\n").includes("SECRETCLAIM"), "claims are never printed");
  });

  test("the cap holds for the practice batch too: the intro batch's real cost comes off what is left", async () => {
    await submitRun({ tracks: [codeB], limit: null, maxUsd: 50, dryRun: false, allowConcurrent: false }, ctx());
    const b = fake.created[0];
    fake.results_.set(b.id, b.requests.map((r) => okLine(r.custom_id, introBody(parseRequestId(r.custom_id)!.objectiveId))));
    // 2 intros really cost 2 x $0.0095 = $0.019; leave less than one practice lesson's upper bound
    const s = await collectRun({ batchId: b.id, tracks: [codeB], maxUsd: 0.06, dryRun: false, allowConcurrent: false }, ctx());
    assert.equal(fake.created.length, 1, "no practice batch");
    assert.equal(s.lessons, 0);
    assert.ok(logs.some((l) => l.includes("Nothing fits")));
  });

  test("a second collect of the same intro batch refuses to start another practice batch", async () => {
    const { introBatch } = await runToPracticeBatch([codeB]);
    const created = fake.created[1];
    fake.listed = [{ id: created.id, processing_status: "in_progress", created_at: "2999-01-01T00:00:00Z" }];
    await assert.rejects(collectRun({ batchId: introBatch.id, tracks: [codeB], maxUsd: 50, dryRun: false, allowConcurrent: false }, ctx()), /may already have run/);
    assert.equal(fake.created.length, 2);
  });

  test("not finished: nothing is read, written or started", async () => {
    await submitRun({ tracks: [codeB], limit: null, maxUsd: 50, dryRun: false, allowConcurrent: false }, ctx());
    const b = fake.created[0];
    fake.info.set(b.id, { id: b.id, processing_status: "in_progress", request_counts: { processing: 2 } });
    const s = await collectRun({ batchId: b.id, tracks: [codeB], maxUsd: 50, dryRun: false, allowConcurrent: false }, ctx());
    assert.equal(s.batchStatus, "in_progress");
    assert.equal(fake.created.length, 1);
  });

  test("--dry-run on an ended intro batch builds the practice requests and creates nothing", async () => {
    await submitRun({ tracks: [codeB], limit: null, maxUsd: 50, dryRun: false, allowConcurrent: false }, ctx());
    const b = fake.created[0];
    fake.results_.set(b.id, b.requests.map((r) => okLine(r.custom_id, introBody(parseRequestId(r.custom_id)!.objectiveId))));
    const s = await collectRun({ batchId: b.id, tracks: [codeB], maxUsd: null, dryRun: true, allowConcurrent: false }, ctx());
    assert.equal(fake.created.length, 1);
    assert.equal(s.requests, 2);
    assert.equal(await queryOne(`select 1 from ai_calls where model = $1 and purpose = 'pregen'`, [MODEL]), null, "a dry run records nothing");
  });
});

// --- stage 2: practice batch -> saved lessons ------------------------------

describe("FAIL-970..978: collect saves through the app's own gates", () => {
  test("saves lessons, shuffles the stored answer position consistently, and checks with the course's context", async () => {
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB]);
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB]);
    assert.equal(s.saved, 2);
    for (const id of [ids.b1, ids.b2]) {
      const r = (await lessonRow(id))!;
      assert.equal(r.fade_choices[r.fade_correct_index], CORRECT, "the key still points at the right choice after the shuffle");
      assert.equal(r.solo_choices[r.solo_correct_index], CORRECT);
      assert.equal(r.model, MODEL);
    }
    // the fact-checker saw the objective's TITLE (not its id) and the choices in the stored order
    const user: string = parseBodies[0].messages[0].content;
    assert.match(user, /Objective: Objective b[12] /);
    assert.ok(!user.includes(ids.b1) && !user.includes(ids.b2));
    assert.equal(s.stage, "practice");
    assert.ok(s.actualUsd!.total > 0);
  });

  test("a disputed key, an unsure writer, or a missing verdict holds the lesson back: logged, not saved", async () => {
    policy = (text) => (text.includes("Objective b1 ") ? "disagree" : text.includes("Objective b2 ") ? "omit-solo" : "agree");
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB, codeA], {
      practice: (id) => (id === ids.a2 ? { confidence: "low", uncertainClaims: ["SECRETCLAIM unsure"] } : {}),
    });
    const callsBefore = parseBodies.length;
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB, codeA]);
    // REQ-216: b2's missing verdict is a check that did not run, not a verdict on the lesson:
    // not held, not saved, reported as failed so the next run tries it again.
    assert.equal(s.held, 2);
    assert.equal(s.failed, 1);
    assert.deepEqual(s.failedBy, { "fact-check did not run": 1 });
    assert.equal(s.saved, 2, "a1 and a6 pass");
    for (const id of [ids.b1, ids.b2, ids.a2]) assert.equal(await lessonRow(id), null, "held lessons are not saved");
    const reasons = await query<{ objective_id: string; reason: string }>(`select objective_id, reason from item_holdbacks where objective_id = any($1::uuid[])`, [[ids.b1, ids.b2, ids.a2]]);
    const by = new Map(reasons.map((r) => [r.objective_id, r.reason]));
    assert.equal(by.get(ids.b1), "fact_check");
    assert.equal(by.get(ids.b2), undefined, "a missing verdict is a check that did not run: no holdback (REQ-216)");
    assert.equal(by.get(ids.a2), "uncertain");
    // the unsure writer's lesson never reached the fact-check model
    // REQ-235: b1's steered retry (here the same disputed draft) is checked once more.
    assert.equal(parseBodies.length - callsBefore, 5, "4 first fact-checks for 5 lessons, plus b1's retry");
  });

  test("a verification program is queued for the sandbox job, never run", async () => {
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB], {
      practice: (id) => (id === ids.b1 ? { soloVerification: { language: "python", code: "print(443)", expected: "443" } } : {}),
    });
    await collectPractice(introBatch.id, practiceBatch.id, [codeB]);
    const q = await queryOne<{ expected: string; language: string }>(
      `select expected, language from exec_checks where item_kind = 'lesson' and objective_id = $1`,
      [ids.b1]
    );
    assert.deepEqual(q, { expected: "443", language: "python" });
    assert.equal(await queryOne(`select 1 from exec_checks where objective_id = $1`, [ids.b2]), null, "no program, nothing queued");
    const solo = (await queryOne<{ solo_check: string }>(`select solo_check from lesson_content where objective_id = $1`, [ids.b1]))!.solo_check;
    assert.ok(await queryOne(`select 1 from exec_checks where item_id = $1`, [lessonItemId(ids.b1, "solo", solo)]), "queued under the item id the sandbox job and the re-check use");
  });

  test("a lesson that appeared since submit is never replaced; a pulled (voided) one is not resurrected; a retired objective is skipped", async () => {
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB, codeA]);
    // since submit: b1 got a lesson (a learner's visit), a1 had its lesson voided by a content fix, a2 was retired
    await insertLesson(ids.b1, "learner visit");
    await insertLesson(ids.a1, "voided by fix");
    await query(
      `insert into item_status (item_kind, item_id, objective_id, question, status, reason) values ('lesson', $1, $2, 'q', 'confirmed_wrong', 'flags')`,
      [lessonItemId(ids.a1, "fade", "existing voided by fix"), ids.a1]
    );
    await query(`update objectives set retired_at = now() - interval '1 hour' where id = $1`, [ids.a2]);
    const before = await query<{ objective_id: string; fade_problem: string }>(`select objective_id, fade_problem from lesson_content where objective_id = any($1::uuid[]) order by objective_id`, [[ids.b1, ids.a1]]);
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB, codeA]);
    const after = await query<{ objective_id: string; fade_problem: string }>(`select objective_id, fade_problem from lesson_content where objective_id = any($1::uuid[]) order by objective_id`, [[ids.b1, ids.a1]]);
    assert.deepEqual(after, before, "neither existing lesson was touched");
    assert.equal(await lessonRow(ids.a2), null, "the retired objective got nothing");
    assert.equal(s.alreadyHadOne, 2);
    assert.equal(s.skipped, 1);
    assert.equal(s.saved, 2, "b2 and a6 are new");
    await query(`update objectives set retired_at = null where id = $1`, [ids.a2]);
    await query(`delete from item_status where objective_id = $1`, [ids.a1]);
    await query(`delete from lesson_content where objective_id = any($1::uuid[])`, [[ids.b1, ids.a1]]);
  });

  test("usage lands in ai_calls as purpose pregen (once, even if collected twice) and the fact-checks as pregen_fact_check", async () => {
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB]);
    await collectPractice(introBatch.id, practiceBatch.id, [codeB]);
    await flushAiCallLog();
    const rows = await query<{ purpose: string; input_tokens: number; output_tokens: number; user_id: string | null; n: number }>(
      `select purpose, sum(input_tokens)::int as input_tokens, sum(output_tokens)::int as output_tokens, max(user_id::text) as user_id, count(*)::int as n
         from ai_calls where model = $1 group by purpose order by purpose`,
      [MODEL]
    );
    const by = new Map(rows.map((r) => [r.purpose, r]));
    // intro: 2 x (2000 in, 1500 out); practice: 2 x (3000 in, 2000 out), one row per batch and model
    assert.equal(by.get("pregen")!.n, 2);
    assert.equal(by.get("pregen")!.input_tokens, 4000 + 6000);
    assert.equal(by.get("pregen")!.output_tokens, 3000 + 4000);
    assert.equal(by.get("pregen")!.user_id, null, "not attributed to a learner");
    assert.equal(by.get("pregen_fact_check")!.n, 2);
    assert.ok(!by.has("fact_check"), "the app's own fact_check purpose is not used");
    // collecting the same ended batches again does not count them twice
    await collectPractice(introBatch.id, practiceBatch.id, [codeB]);
    await flushAiCallLog();
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from ai_calls where model = $1 and purpose = 'pregen'`, [MODEL]))!.n, 2);
    await query(`delete from lesson_content where objective_id = any($1::uuid[])`, [[ids.b1, ids.b2]]);
    await query(`delete from ai_calls where model = $1`, [MODEL]);
  });

  test("the cap stops the live fact-checks: nothing more is checked or saved once the next one could pass it", async () => {
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB]);
    const before = parseBodies.length;
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB], 0.05);
    assert.equal(s.stoppedForBudget, true);
    assert.equal(parseBodies.length, before, "no fact-check call was made");
    assert.equal(s.saved, 0);
  });

  test("collect prints counts only: no claim, no teaching text, no id of a held lesson's content", async () => {
    // REQ-216: claims the checker could not confirm no longer hold a lesson back when its answer
    // agrees; b2's answer disagrees, so it is held, and b1 (low confidence) never reaches the checker.
    policy = (text) => (text.includes("Objective b2 ") ? "disagree" : "unsupported");
    const warned: string[] = [];
    const realWarn = console.warn;
    console.warn = (...a: unknown[]) => warned.push(a.map(String).join(" "));
    try {
      const { introBatch, practiceBatch } = await runToPracticeBatch([codeB], { practice: (id) => (id === ids.b1 ? { confidence: "low", uncertainClaims: ["SECRETCLAIM unsure"] } : {}) });
      await collectPractice(introBatch.id, practiceBatch.id, [codeB]);
    } finally {
      console.warn = realWarn;
    }
    const all = [...logs, ...warned].join("\n");
    assert.ok(!all.includes("SECRETCLAIM"), "claims stay in item_holdbacks");
    assert.ok(!all.includes("TEACHMARK"), "no teaching text");
    assert.ok(!all.includes("[item-quality]"));
    assert.ok(logs.some((l) => /Saved 0 new lessons; 0 already had one and were left alone; 2 held back/.test(l)));
    const claims = await query<{ claims: string[] }>(`select claims from item_holdbacks where objective_id = any($1::uuid[])`, [[ids.b1, ids.b2]]);
    assert.ok(JSON.stringify(claims).includes("SECRETCLAIM"), "but the person reviewing sees them");
  });

  test("a failed half is a failure with a category, not a partial lesson", async () => {
    await submitRun({ tracks: [codeB], limit: null, maxUsd: 50, dryRun: false, allowConcurrent: false }, ctx());
    const b = fake.created[0];
    fake.results_.set(b.id, [
      okLine(b.requests[0].custom_id, introBody(parseRequestId(b.requests[0].custom_id)!.objectiveId)),
      { custom_id: b.requests[1].custom_id, result: { type: "errored" } },
    ]);
    const s = await collectRun({ batchId: b.id, tracks: [codeB], maxUsd: 50, dryRun: false, allowConcurrent: false }, ctx());
    assert.equal(s.failed, 1);
    assert.deepEqual(s.failedBy, { "intro errored": 1 });
    assert.equal(fake.created.length, 2, "the good one continues");
    assert.equal(fake.created[1].requests.length, 1);
    assert.equal(parseRequestId(fake.created[1].requests[0].custom_id)!.objectiveId, parseRequestId(b.requests[0].custom_id)!.objectiveId);
    void requestIds;
  });
});

// --- REQ-235: the one steered retry ----------------------------------------

describe("REQ-235 (FAIL-1400): a held pre-generated half is retried once, steered, like the live gate", () => {
  test("a held intro is retried with its claims as the steer; a clean retry is finished live and saved, outside the practice batch", async () => {
    retryOver = { intro: () => ({}), practice: () => ({}) };
    const { practiceBatch, s1 } = await runToPracticeBatch([codeB], {
      intro: (id) => (id === ids.b2 ? { confidence: "low", uncertainClaims: ["SECRETCLAIM a 2026 limit"] } : {}),
    });
    assert.deepEqual(practiceBatch.requests.map((r) => parseRequestId(r.custom_id)!.objectiveId), [ids.b1], "b2 is not in the batch");
    assert.deepEqual(retryCalls.map((c) => [c.kind, c.id]), [["intro", ids.b2], ["practice", ids.b2]]);
    assert.match(retryCalls[0].steer ?? "", /SECRETCLAIM a 2026 limit/, "the retry is steered with what held the first draft");
    assert.equal(retryCalls[1].steer, null, "the first practice draft of a retried lesson is not a retry");
    assert.equal(s1.retried, 1);
    assert.equal(s1.savedAfterRetry, 1);
    assert.equal(s1.heldAfterRetry, 0);
    const row = await lessonRow(ids.b2);
    assert.ok(row, "saved after the retry");
    assert.equal(row!.fade_choices[row!.fade_correct_index], CORRECT);
    const held = await query<{ item_kind: string }>(`select item_kind from item_holdbacks where objective_id = $1`, [ids.b2]);
    assert.deepEqual(held.map((h) => h.item_kind), ["lesson_intro"], "the held first draft is logged once");
    assert.ok(parseBodies.length >= 1, "the retried lesson's checks went through the fact-check");
    assert.ok(!logs.join("\n").includes("SECRETCLAIM"), "claims are never printed");
  });

  test("a held practice half is retried with the steer; a clean retry is saved and counted", async () => {
    retryOver = { practice: () => ({}) };
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB], {
      practice: (id) => (id === ids.b1 ? { confidence: "low", uncertainClaims: ["SECRETCLAIM unsure"] } : {}),
    });
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB]);
    assert.equal(s.saved, 2);
    assert.equal(s.held, 0);
    assert.equal(s.retried, 1);
    assert.equal(s.savedAfterRetry, 1);
    assert.deepEqual(retryCalls.map((c) => [c.kind, c.id]), [["practice", ids.b1]]);
    assert.match(retryCalls[0].steer ?? "", /SECRETCLAIM unsure/);
    assert.ok(logs.some((l) => /Held practice halves retried once, steered: 1 retried, 1 saved after the retry, 0 held again/.test(l)));
  });

  test("a disputed key whose retry is disputed too is held: two drafts logged, nothing saved, counted as held after a retry", async () => {
    policy = (text) => (text.includes("Objective b1 ") ? "disagree" : "agree");
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB]);
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB]);
    assert.equal(s.held, 1);
    assert.equal(s.heldAfterRetry, 1);
    assert.equal(s.saved, 1);
    assert.equal(await lessonRow(ids.b1), null);
    const rows = await query<{ reason: string; claims: string[] }>(`select reason, claims from item_holdbacks where objective_id = $1 order by created_at`, [ids.b1]);
    assert.equal(rows.length, 2);
    assert.ok(rows.every((r) => r.reason === "fact_check"));
    assert.ok(JSON.stringify(rows[1].claims).includes("[not served"), "the second is marked not served");
  });

  test("a retry the cap cannot cover is not made: the lesson is held as before and counted", async () => {
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB], {
      practice: (id) => (id === ids.b1 ? { confidence: "low", uncertainClaims: ["unsure"] } : {}),
    });
    // Room for the two batches and a fact-check (and a half), not for a live practice retry.
    const batchUsd = 2 * batchUsageUsd(MODEL, { input_tokens: 2000, output_tokens: 1500 }) + 2 * batchUsageUsd(MODEL, { input_tokens: 3000, output_tokens: 2000 });
    const fact = factCheckUpperUsd(MODEL);
    assert.ok(liveRequestUpperUsd(MODEL, practiceParams(MODEL, (await loadObjective(ids.b1))!, "t".repeat(3000))) > fact / 2, "the fixture leaves no room for a retry");
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB], batchUsd + fact * 1.5);
    assert.equal(retryCalls.length, 0);
    assert.equal(s.notRetriedForBudget, 1);
    assert.equal(s.held, 1);
  });

  test("the live retry writer sends the steer, records purpose pregen_retry with no learner, and runs the app's lint", async () => {
    const objId = ids.b1;
    const obj = (await loadObjective(objId))!;
    let sent: any = null;
    __setClientForTest({
      messages: {
        create: async () => {
          throw new Error("no create expected");
        },
        parse: async (body: any) => {
          sent = body;
          return { parsed_output: practiceBody(objId), stop_reason: "end_turn", usage: { input_tokens: 1000, output_tokens: 500 } };
        },
      },
    } as never);
    const out = await liveRetryWriter.practice(obj, "the teaching text", "STEERMARK leave out the 2026 limit");
    assert.equal(out.fadeChoices[out.fadeCorrectIndex], CORRECT, "shuffled with the key kept");
    assert.ok(JSON.stringify(sent).includes("STEERMARK"), "the steer reaches the prompt");
    await flushAiCallLog();
    const row = await queryOne<{ purpose: string; user_id: string | null }>(`select purpose, user_id from ai_calls where model = $1 order by created_at desc limit 1`, [MODEL]);
    assert.deepEqual(row, { purpose: "pregen_retry", user_id: null });
    __setClientForTest({
      messages: {
        create: async () => {
          throw new Error("no create expected");
        },
        parse: async () => ({ parsed_output: practiceBody(objId, { fadeChoices: ["a", "a", "a", "a"] }), stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }),
      },
    } as never);
    await assert.rejects(liveRetryWriter.practice(obj, "t", null), /retry content check/);
  });
});

// --- REQ-248: style findings, as the app treats them ----------------------

// A first draft whose ONLY problem is a style finding: a distractor with a cue word.
const LINT = { soloChoices: ["Always use TCP port 80", CORRECT, "Use TCP port 8080", "Use TCP port 22"] };
// A hard problem: a duplicate option.
const HARD = { fadeChoices: ["Use TCP port 80", CORRECT, "Use TCP port 80", "Use TCP port 22"] };

describe("REQ-248 (FAIL-1600): a draft with style findings only gets the app's one steered retry, never a straight failure", () => {
  test("the fixtures: LINT is style findings only, HARD is a hard problem", () => {
    const id = randomUUID();
    assert.ok(lessonPracticeLint(practiceBody(id, LINT) as never).length > 0);
    assert.ok(lessonPracticeProblems(practiceBody(id, HARD) as never).some((p) => /duplicate/.test(p)));
  });

  test("style findings, then a clean retry: retried once, steered with the findings, fact-checked and saved", async () => {
    retryOver = { practice: () => ({}) };
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB], { practice: (id) => (id === ids.b1 ? LINT : {}) });
    const before = parseBodies.length;
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB]);
    assert.equal(s.saved, 2);
    assert.equal(s.failed, 0);
    assert.equal(s.styleRetried, 1);
    assert.equal(s.savedAfterStyleRetry, 1);
    assert.equal(s.servedWithStyleFindings, 0);
    assert.equal(s.retried, 0, "not a holdback retry");
    assert.deepEqual(retryCalls.map((c) => [c.kind, c.id]), [["practice", ids.b1]]);
    assert.match(retryCalls[0].steer ?? "", /^A previous draft failed these checks/, "the app's fixFor steer");
    assert.match(retryCalls[0].steer ?? "", /absolute word "always"/);
    assert.equal(parseBodies.length - before, 2, "both lessons were fact-checked, the retried one on its retry");
    const row = (await lessonRow(ids.b1))!;
    assert.ok(!row.solo_choices.some((c) => /Always/.test(c)), "the retry is what was saved");
    assert.deepEqual(s.problemKinds, {}, "nothing failed the content check");
    assert.ok(Object.keys(s.styleFindingKinds!).some((k) => /absolute word/.test(k)));
    assert.ok(logs.some((l) => /Practice drafts with style findings only, retried once, steered \(as the app does\): 1 retried, 1 saved after the retry \(0 with style findings left/.test(l)));
  });

  test("style findings, then a retry with style findings only: saved, as the app serves it, and logged in the app's words", async () => {
    retryOver = { practice: (id) => (id === ids.b1 ? LINT : {}) };
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB], { practice: (id) => (id === ids.b1 ? LINT : {}) });
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB]);
    assert.equal(s.saved, 2);
    assert.equal(s.styleRetried, 1);
    assert.equal(s.savedAfterStyleRetry, 1);
    assert.equal(s.servedWithStyleFindings, 1);
    assert.equal(retryCalls.length, 1, "one retry, never two");
    assert.ok(await lessonRow(ids.b1));
    const line = logs.find((l) => l.startsWith("[content-validator] lesson served with style findings after one retry: "));
    assert.ok(line, "the app's log line");
    assert.ok(!line!.includes("Always use TCP"), "kinds only, no option text");
  });

  test("style findings, then a retry with a hard problem: failed, not saved, still missing for a first visit", async () => {
    retryOver = { practice: (id) => (id === ids.b1 ? HARD : {}) };
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB], { practice: (id) => (id === ids.b1 ? LINT : {}) });
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB]);
    assert.equal(s.saved, 1);
    assert.equal(s.failed, 1);
    assert.deepEqual(s.failedBy, { "retry content check": 1 });
    assert.equal(s.failedAfterStyleRetry, 1);
    assert.equal(await lessonRow(ids.b1), null);
  });

  test("the cap cannot cover the style retry: not retried, no call, the lesson stays missing and is counted", async () => {
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB], { practice: (id) => (id === ids.b1 ? LINT : {}) });
    // Room for the two batches and a fact-check (and a half), not for a live practice retry.
    const batchUsd = 2 * batchUsageUsd(MODEL, { input_tokens: 2000, output_tokens: 1500 }) + 2 * batchUsageUsd(MODEL, { input_tokens: 3000, output_tokens: 2000 });
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB], batchUsd + factCheckUpperUsd(MODEL) * 1.5);
    assert.equal(retryCalls.length, 0);
    assert.equal(s.styleRetried, 0);
    assert.equal(s.styleNotRetriedForBudget, 1);
    assert.deepEqual(s.failedBy, { "style retry not affordable": 1 });
    assert.equal(await lessonRow(ids.b1), null);
    assert.equal(s.saved, 1, "b2 has no findings and fits");
  });

  test("a hard problem in the first draft still fails outright: no retry", async () => {
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB], { practice: (id) => (id === ids.b1 ? { ...HARD, ...LINT } : {}) });
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB]);
    assert.equal(retryCalls.length, 0);
    assert.deepEqual(s.failedBy, { "content check": 1 });
    assert.ok(Object.keys(s.problemKinds!).some((k) => /duplicate/.test(k)));
    assert.equal(s.saved, 1);
  });

  test("a held half's retry with style findings only gets the style retry too (the app's gen.practice is generateValid every call)", async () => {
    let n = 0;
    retryOver = { practice: () => (n++ === 0 ? LINT : {}) };
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB], {
      practice: (id) => (id === ids.b1 ? { confidence: "low", uncertainClaims: ["SECRETCLAIM unsure"] } : {}),
    });
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB]);
    assert.equal(s.saved, 2);
    assert.equal(s.retried, 1);
    assert.equal(s.styleRetried, 1);
    assert.equal(retryCalls.length, 2);
    assert.match(retryCalls[1].steer ?? "", /SECRETCLAIM unsure[\s\S]*A previous draft failed these checks/, "the holdback steer, then the style findings");
  });

  test("a dry run counts the drafts that would get a style retry and fails none of them", async () => {
    const { introBatch, practiceBatch } = await runToPracticeBatch([codeB], { practice: (id) => (id === ids.b1 ? LINT : {}) });
    const s = await collectPractice(introBatch.id, practiceBatch.id, [codeB], 50, true);
    assert.equal(s.failed, 0);
    assert.equal(s.wouldStyleRetry, 1);
    assert.equal(retryCalls.length, 0);
  });

  test("the live retry writer fails a retry on a hard problem only; style findings are returned to the caller", async () => {
    const obj = (await loadObjective(ids.b1))!;
    const reply = (body: unknown) =>
      __setClientForTest({
        messages: {
          create: async () => {
            throw new Error("no create expected");
          },
          parse: async () => ({ parsed_output: body, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }),
        },
      } as never);
    reply(practiceBody(ids.b1, LINT));
    const out = await liveRetryWriter.practice(obj, "t", null);
    assert.ok(lessonPracticeLint(out).length > 0);
    reply(practiceBody(ids.b1, HARD));
    await assert.rejects(liveRetryWriter.practice(obj, "t", null), /retry content check/);
  });
});

describe("REQ-248: the batch practice prompt is the app's, item-writing rules included", () => {
  test("practiceParams sends exactly what the app's generator sends for the same lesson, and its system prompt carries ITEM_WRITING_RULES", async () => {
    const obj = (await loadObjective(ids.b1))!;
    const teach = "TEACHMARK the teaching text";
    let sent: any = null;
    __setClientForTest({
      messages: {
        create: async () => {
          throw new Error("no create expected");
        },
        parse: async (body: any) => {
          sent = body;
          return { parsed_output: practiceBody(ids.b1), stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } };
        },
      },
    } as never);
    await claudeGenerator.practice(obj, undefined, { teach, sharedScope: true });
    const batch = practiceParams(MODEL, obj, teach);
    assert.deepEqual(JSON.parse(JSON.stringify(batch.system)), JSON.parse(JSON.stringify(sent.system)), "same system prompt");
    assert.deepEqual(JSON.parse(JSON.stringify(batch.messages)), JSON.parse(JSON.stringify(sent.messages)), "same user message");
    assert.equal(batch.max_tokens, sent.max_tokens);
    assert.ok(JSON.stringify(batch.system).includes(JSON.stringify(ITEM_WRITING_RULES).slice(1, -1)), "the item-writing rules are in the batch request");
    // and the steered retry is the app's: the findings after any other steer
    const steer = fixFor(lessonPracticeLint(practiceBody(ids.b1, LINT) as never))!;
    sent = null;
    await liveRetryWriter.practice(obj, teach, `HOLD\n\n${steer}`);
    assert.ok(JSON.stringify(sent.messages).includes(JSON.stringify(steer).slice(1, -1)));
    assert.equal(JSON.stringify(sent.system), JSON.stringify(batch.system), "the retry uses the same system prompt");
  });
});

// --- the global ceiling ----------------------------------------------------

describe("FAIL-977: pre-generation does not count toward AI_GLOBAL_DAILY_CEILING_USD", () => {
  test("pregen and pregen_fact_check rows are in ai_calls but outside the global sum; every other purpose still counts", async () => {
    const startOfDay = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const before = await globalSpendSinceUsd(startOfDay);
    const add = (purpose: string) =>
      query(
        `insert into ai_calls (purpose, model, input_tokens, output_tokens, latency_ms, ok) values ($1, $2, 1000000, 0, 0, true)`,
        [purpose, MODEL]
      );
    await add("pregen");
    await add("pregen_fact_check");
    const afterPregen = await globalSpendSinceUsd(startOfDay);
    assert.ok(Math.abs(afterPregen - before) < 1e-9, `a $2 batch row must not move the ceiling's sum (moved ${afterPregen - before})`);
    await add("lesson_intro");
    await add("fact_check");
    const afterApp = await globalSpendSinceUsd(startOfDay);
    assert.ok(Math.abs(afterApp - before - 4) < 1e-6, `two app rows of 1M input tokens at $2/M add $4 (added ${afterApp - before})`);
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from ai_calls where model = $1 and purpose like 'pregen%'`, [MODEL]))!.n, 2, "the pregen rows are still there for any report over the table");
    await query(`delete from ai_calls where model = $1`, [MODEL]);
  });
});
