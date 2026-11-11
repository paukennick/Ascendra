// REQ-204 (FAIL-882, 883, 884, 887, 888): a held-back or failed lesson
// generation, against a real Postgres with every migration applied. The model
// is replaced by an injected generator (no key exists).
//
//   FAIL-882  the six hour cooldown is per scope: a learner's failed
//             regenerate no longer locks the objective for everyone.
//   FAIL-883  a failure to queue the exec check is retryable, not a holdback.
//   FAIL-884  the held-back refusal is a 4xx carrying held/retryable.
//   FAIL-887  a failed regenerate keeps the learner's saved position.
//   FAIL-888  a regenerate that stored nothing gives its weekly use back.
process.env.AUTH_JWT_SECRET ??= "test-only-secret";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import {
  ContentHeldBackError,
  ExecQueueUnavailableError,
  ensureGeneration,
  releaseUseUnlessStored,
  startRegeneration,
  type LessonGenerator,
  type ObjectiveRow,
} from "./lesson-generation";
import { SHARED } from "./lesson-store";
import { saveLessonProgress } from "./lesson-progress-store";
import { consumeAllowance, grantEntitlement } from "./entitlements";
import { serverError } from "./http";

const run = Date.now().toString(36);
const track = randomUUID();
const unit = randomUUID();
const objs = Array.from({ length: 8 }, () => randomUUID());
const users: string[] = [];
const CHOICES = ["Port 80", "Port 443", "Port 8080", "Port 22"];
const objRow = (i: number): ObjectiveRow => ({ title: `Objective ${i + 1}`, unit_title: "Ports", track_title: "Web basics", ctx: null });
const practice = (tag: string, extra: Record<string, unknown> = {}) => ({
  fadeProblem: `fade ${tag}`, fadeChoices: CHOICES, fadeCorrectIndex: 1, fadeWhy: "w",
  soloCheck: `solo ${tag}`, soloChoices: CHOICES, soloCorrectIndex: 1, soloWhy: "w",
  confidence: "high" as const, uncertainClaims: [] as string[], ...extra,
});
const goodGen = (tag: string, counter = { n: 0 }): LessonGenerator => ({
  intro: async () => { counter.n++; return { guessPrompt: "g", teach: `teach ${tag}` }; },
  practice: async () => { counter.n++; return practice(tag); },
  model: () => "test",
});
const unsureGen = (): LessonGenerator => ({
  ...goodGen("bad"),
  practice: async () => practice("bad", { confidence: "low" as const, uncertainClaims: ["the limit changed in 2026"] }),
});
const fresh = () => new Map();
async function newUser(): Promise<string> {
  const u = randomUUID();
  users.push(u);
  await query(`insert into app_users (id, email) values ($1, $2)`, [u, `${u}@example.test`]);
  return u;
}
const outcome = (p: Promise<unknown>) => p.then(() => "served", (e: Error) => e.constructor.name);

before(async () => {
  await query(`insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Web basics', 'certification', null)`, [track, `LH${run}`]);
  await query(`insert into course_units (id, track_id, title, sort_order, weight) values ($1, $2, 'Ports', 1, 100)`, [unit, track]);
  for (const [i, o] of objs.entries()) await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, $3, $4)`, [o, unit, `Objective ${i + 1}`, i + 1]);
});
after(async () => {
  await query(`delete from item_holdbacks where objective_id = any($1::uuid[])`, [objs]);
  await query(`delete from app_users where id = any($1::uuid[])`, [users]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("FAIL-882: the cooldown is per scope", () => {
  test("one learner's failed regenerate does not lock the objective for another learner", async () => {
    const o = objs[0];
    await ensureGeneration(o, objRow(0), { scope: SHARED, generator: goodGen("shared"), pending: fresh() }).fullPromise;
    const a = await newUser();
    const b = await newUser();
    const h = await startRegeneration(a, o, objRow(0), { generator: unsureGen(), pending: fresh() });
    await assert.rejects(h.fullPromise, ContentHeldBackError);
    const counter = { n: 0 };
    const hb = await startRegeneration(b, o, objRow(0), { generator: goodGen("B", counter), pending: fresh() });
    assert.equal(await outcome(hb.fullPromise), "served", `generator calls ${counter.n}`);
  });

  test("the learner who was refused still waits out their own cooldown", async () => {
    const o = objs[1];
    await ensureGeneration(o, objRow(1), { scope: SHARED, generator: goodGen("shared"), pending: fresh() }).fullPromise;
    const a = await newUser();
    await assert.rejects((await startRegeneration(a, o, objRow(1), { generator: unsureGen(), pending: fresh() })).fullPromise, ContentHeldBackError);
    const counter = { n: 0 };
    const again = await startRegeneration(a, o, objRow(1), { generator: goodGen("A2", counter), pending: fresh() });
    assert.equal(await outcome(again.fullPromise), "ContentHeldBackError");
    assert.equal(counter.n, 0, "no model call is spent inside the cooldown");
    const row = await queryOne<{ scope_user_id: string }>(`select scope_user_id from item_holdbacks where objective_id = $1 order by created_at limit 1`, [o]);
    assert.equal(row?.scope_user_id, a);
  });

  test("a shared generation is not blocked by a learner-scope failure on the same objective", async () => {
    const o = objs[2];
    const a = await newUser();
    await query(
      `insert into lesson_content (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why, solo_check, solo_choices, solo_correct_index, solo_why, model)
       values ($1,'g','t','f','["a","b","c","d"]',0,'w','s','["a","b","c","d"]',0,'w','x')`,
      [o]
    );
    await assert.rejects((await startRegeneration(a, o, objRow(2), { generator: unsureGen(), pending: fresh() })).fullPromise, ContentHeldBackError);
    await query(`delete from lesson_content where objective_id = $1`, [o]); // pulled / replaced
    assert.equal(await outcome(ensureGeneration(o, objRow(2), { scope: SHARED, generator: goodGen("fresh"), pending: fresh() }).fullPromise), "served");
  });

  test("a shared holdback still cools down shared generation for everyone", async () => {
    const o = objs[3];
    const bad = unsureGen();
    assert.equal(await outcome(ensureGeneration(o, objRow(3), { scope: SHARED, generator: bad, pending: fresh() }).fullPromise), "ContentHeldBackError");
    const counter = { n: 0 };
    assert.equal(await outcome(ensureGeneration(o, objRow(3), { scope: SHARED, generator: goodGen("x", counter), pending: fresh() }).fullPromise), "ContentHeldBackError");
    assert.equal(counter.n, 0);
  });
});

// FAIL-967: REQ-202 charges a shared first generation to the learner who started
// it (triggeredBy). That learner must not become the holdback's scope: the shared
// cooldown looks for scope_user_id null, so it would never see the holdback and
// every reopening would pay for the same refusal again.
describe("FAIL-967: a shared generation started by a learner holds back for everyone", () => {
  // The teaching text (intro) and the practice half are held back by different functions.
  const unsureIntro = (): LessonGenerator => ({
    ...goodGen("bad-intro"),
    intro: async () => ({ guessPrompt: "g", teach: "teach", confidence: "low" as const, uncertainClaims: ["the limit changed in 2026"] }),
  });
  for (const [half, makeBad] of [["teaching text", unsureIntro], ["practice half", unsureGen]] as const) {
    test(`a held-back ${half}: the holdback is shared-scope and the cooldown stops the next learner before any model call`, async () => {
      const o = randomUUID();
      await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'Objective 99', 99)`, [o, unit]);
      objs.push(o);
      const starter = await newUser();
      const other = await newUser();
      const seen: Array<string | undefined> = [];
      const bad = makeBad();
      const charged: LessonGenerator = {
        ...bad,
        intro: async (r, a, meta) => (seen.push(meta?.userId), bad.intro(r, a, meta)),
      };
      assert.equal(await outcome(ensureGeneration(o, objRow(7), { scope: SHARED, triggeredBy: starter, generator: charged, pending: fresh() }).fullPromise), "ContentHeldBackError");
      assert.ok(seen.length > 0 && seen.every((u) => u === starter), "the calls are still charged to the learner who started it");
      const rows = await query<{ scope_user_id: string | null }>(`select scope_user_id from item_holdbacks where objective_id = $1`, [o]);
      assert.ok(rows.length >= 1);
      assert.ok(rows.every((r) => r.scope_user_id === null), "scoped to the shared generation, not to the learner charged");
      const counter = { n: 0 };
      assert.equal(await outcome(ensureGeneration(o, objRow(7), { scope: SHARED, triggeredBy: other, generator: goodGen("x", counter), pending: fresh() }).fullPromise), "ContentHeldBackError");
      assert.equal(counter.n, 0, "no model call is spent inside the shared cooldown");
    });
  }
});

describe("FAIL-883: a failure to queue the exec check is retryable", () => {
  test("one database blip starts no cooldown; the next request is served", async () => {
    const o = objs[4];
    let calls = 0;
    const flaky: LessonGenerator = {
      ...goodGen("x"),
      practice: async () => practice("flaky", { soloVerification: { language: "python", code: "print(443)", expected: "443" } }),
      queueExec: async () => {
        calls++;
        if (calls === 1) throw new Error("terminating connection due to administrator command");
      },
    };
    const first = ensureGeneration(o, objRow(4), { scope: SHARED, generator: flaky, pending: fresh() }).fullPromise;
    await assert.rejects(first, ExecQueueUnavailableError);
    assert.equal((await queryOne<{ n: number }>(`select count(*)::int as n from item_holdbacks where objective_id = $1`, [o]))?.n, 0, "not logged as a holdback");
    assert.equal(await outcome(ensureGeneration(o, objRow(4), { scope: SHARED, generator: flaky, pending: fresh() }).fullPromise), "served");
    const res = serverError(new ExecQueueUnavailableError());
    assert.equal(res.status, 409);
    assert.equal(((await res.json()) as { retryable: boolean }).retryable, true);
  });
});

describe("FAIL-884: a held-back lesson is a 4xx the app can show", () => {
  test("ContentHeldBackError answers 409 with held and retryable flags and its message", async () => {
    const res = serverError(new ContentHeldBackError());
    assert.equal(res.status, 409);
    const body = (await res.json()) as { error: string; held: boolean; retryable: boolean };
    assert.equal(body.held, true);
    assert.equal(body.retryable, false);
    assert.match(body.error, /accuracy checks/);
  });
});

describe("FAIL-887: a regenerate that stores nothing keeps the saved position", () => {
  const position = { step: "fade" as const, guess: "g", guessFeedback: null, confidence: 3, lessonKey: "k", checks: {} };
  const rows = async (u: string, o: string) => (await queryOne<{ n: number }>(`select count(*)::int as n from lesson_progress where user_id = $1 and objective_id = $2`, [u, o]))!.n;

  test("the practice half is refused after the intro was shown: position kept", async () => {
    const o = objs[5];
    const u = await newUser();
    await ensureGeneration(o, objRow(5), { scope: SHARED, generator: goodGen("orig"), pending: fresh() }).fullPromise;
    await saveLessonProgress(u, o, position, Date.now());
    const h = await startRegeneration(u, o, objRow(5), { generator: unsureGen(), pending: fresh() });
    assert.ok(await h.introPromise, "the learner was shown the new teaching text");
    await assert.rejects(h.fullPromise, ContentHeldBackError);
    assert.equal(await rows(u, o), 1);
  });

  test("a regenerate that is stored clears the old position, but not one saved since it started", async () => {
    const o = objs[6];
    const u = await newUser();
    await ensureGeneration(o, objRow(6), { scope: SHARED, generator: goodGen("orig"), pending: fresh() }).fullPromise;
    await saveLessonProgress(u, o, position, Date.now());
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow: LessonGenerator = { ...goodGen("new"), practice: async () => { await gate; return practice("new"); } };
    const h = await startRegeneration(u, o, objRow(6), { generator: slow, pending: fresh() });
    await h.introPromise;
    // The learner starts the new lesson while its practice half is generating.
    await saveLessonProgress(u, o, { ...position, step: "teach" as const, lessonKey: "k2" }, Date.now());
    release();
    await h.fullPromise;
    const left = await queryOne<{ lesson_key: string }>(`select lesson_key from lesson_progress where user_id = $1 and objective_id = $2`, [u, o]);
    assert.equal(left?.lesson_key, "k2");

    const o2 = objs[7];
    await ensureGeneration(o2, objRow(7), { scope: SHARED, generator: goodGen("orig"), pending: fresh() }).fullPromise;
    await saveLessonProgress(u, o2, position, Date.now());
    await (await startRegeneration(u, o2, objRow(7), { generator: goodGen("new"), pending: fresh() })).fullPromise;
    assert.equal(await rows(u, o2), 0, "old position cleared once the new lesson is stored");
  });
});

describe("FAIL-888: a regenerate that stored nothing gives its weekly use back", () => {
  const uses = async (u: string) => (await queryOne<{ n: number }>(`select count(*)::int as n from allowance_uses where user_id = $1 and kind = 'regeneration'`, [u]))!.n;

  test("refused: use returned; stored: use kept", async () => {
    process.env.BILLING_ENABLED = "yes";
    try {
      const u = await newUser();
      await grantEntitlement({ userId: u, tier: "plus" });
      const o = objs[0];
      const use = await consumeAllowance(u, "regeneration", "plus");
      assert.equal(await uses(u), 1);
      const refused = await startRegeneration(u, o, objRow(0), { generator: unsureGen(), pending: fresh() });
      await refused.introPromise.catch(() => undefined);
      await releaseUseUnlessStored(refused, use);
      assert.equal(await uses(u), 0, "use given back");

      const v = await newUser();
      await grantEntitlement({ userId: v, tier: "plus" });
      const kept = await consumeAllowance(v, "regeneration", "plus");
      const stored = await startRegeneration(v, o, objRow(0), { generator: goodGen("v"), pending: fresh() });
      await releaseUseUnlessStored(stored, kept);
      assert.equal(await uses(v), 1, "use kept for a stored lesson");
    } finally {
      delete process.env.BILLING_ENABLED;
    }
  });
});
