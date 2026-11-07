// Per-learner lesson regeneration and cross-instance generation claims
// (migration 027c) against a real Postgres. The model is replaced by a fake
// generator, so nothing here calls Anthropic. Run with:
//   DATABASE_URL=... PGSSLMODE=disable npm run test:db
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import {
  ensureGeneration,
  startRegeneration,
  readLessonForUser,
  pendingKey,
  REGEN_LIMIT,
  REGEN_RATE_EVENT,
  type GenerationHandle,
  type LessonGenerator,
  type ObjectiveRow,
} from "./lesson-generation";
import { SHARED, getLessonFor, getSharedLesson, tryClaim, releaseClaim, isClaimLive, CLAIM_LEASE_SECONDS } from "./lesson-store";
import type { LessonAvoid } from "./prompts";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "./auth/rateLimit";

const run = Date.now().toString(36);
const userA = randomUUID();
const userB = randomUUID();
const track = randomUUID();
const unit = randomUUID();
const objRow: ObjectiveRow = { title: "Obj", unit_title: "Unit", track_title: "Track", ctx: null };

async function newObjective(): Promise<string> {
  const id = randomUUID();
  await query(`insert into objectives (id, unit_id, title, sort_order) values ($1, $2, 'O', 1)`, [id, unit]);
  return id;
}

// Stands in for the model. Every call yields distinct text, records the
// `avoid` it was given, and can be slowed so concurrent callers overlap.
function fakeGenerator(
  label: string,
  opts: { introMs?: number; practiceMs?: number; failIntro?: boolean; failPractice?: boolean } = {}
) {
  const calls = {
    intro: 0,
    practice: 0,
    avoid: [] as (LessonAvoid | undefined)[],
    users: [] as (string | undefined)[],
    // "intro:start", "practice:start", "intro:end", ... in the order they happened.
    events: [] as string[],
  };
  const gen: LessonGenerator = {
    async intro(_o, avoid, meta) {
      const n = ++calls.intro;
      calls.avoid.push(avoid);
      calls.users.push(meta?.userId);
      calls.events.push("intro:start");
      if (opts.introMs) await new Promise((r) => setTimeout(r, opts.introMs));
      calls.events.push("intro:end");
      if (opts.failIntro) throw new Error("model unavailable");
      return { guessPrompt: `${label} guess ${n}`, teach: `${label} teach ${n}` };
    },
    async practice() {
      const n = ++calls.practice;
      calls.events.push("practice:start");
      if (opts.practiceMs) await new Promise((r) => setTimeout(r, opts.practiceMs));
      calls.events.push("practice:end");
      if (opts.failPractice) throw new Error("practice model unavailable");
      return {
        fadeProblem: `${label} fade ${n}`,
        fadeChoices: ["a", "b", "c", "d"],
        fadeCorrectIndex: 1,
        fadeWhy: "because",
        soloCheck: `${label} solo ${n}`,
        soloChoices: ["a", "b", "c", "d"],
        soloCorrectIndex: 2,
        soloWhy: "because",
      };
    },
    model: () => "fake-model",
  };
  return { gen, calls };
}

// A separate in-memory map stands in for a separate server instance.
const instance = () => new Map<string, GenerationHandle>();
const fast = { pollMs: 20, waitMs: 5000 };

before(async () => {
  for (const [id, email] of [[userA, `regen-a-${run}@example.test`], [userB, `regen-b-${run}@example.test`]]) {
    await query(`insert into app_users (id, email) values ($1, $2)`, [id, email]);
  }
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Regen track', 'certification', $3)`,
    [track, `RG-${run}`, userA]
  );
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'Regen unit', 1)`, [unit, track]);
});

after(async () => {
  await query(`delete from app_users where id = any($1)`, [[userA, userB]]);
  await query(`delete from subject_tracks where id = $1`, [track]);
  await closePool();
});

describe("first generation stays shared", () => {
  test("is stored in lesson_content for everyone and creates no override", async () => {
    const obj = await newObjective();
    const { gen, calls } = fakeGenerator("first");
    const h = ensureGeneration(obj, objRow, { scope: SHARED, generator: gen, pending: instance(), ...fast });
    const intro = await h.introPromise;
    const full = await h.fullPromise;

    assert.equal(intro?.teach, "first teach 1");
    assert.equal(full.teach, "first teach 1", "stored lesson is the one whose intro was shown");
    assert.equal(calls.avoid[0], undefined);
    assert.equal((await getSharedLesson(obj))?.teach, "first teach 1");
    assert.equal((await getLessonFor(userA, obj))?.source, "shared");
    assert.equal((await getLessonFor(userB, obj))?.source, "shared");
    assert.equal((await queryOne(`select 1 from lesson_content_overrides where objective_id = $1`, [obj])), null);
    assert.equal(await isClaimLive(obj, SHARED), false, "lease released");
  });

  test("never overwrites an existing shared lesson", async () => {
    const obj = await newObjective();
    const { gen: g1 } = fakeGenerator("one");
    await ensureGeneration(obj, objRow, { scope: SHARED, generator: g1, pending: instance(), ...fast }).fullPromise;
    const { gen: g2, calls } = fakeGenerator("two");
    const h = ensureGeneration(obj, objRow, { scope: SHARED, generator: g2, pending: instance(), ...fast });
    assert.equal(await h.introPromise, null, "no second intro for a lesson that already exists");
    assert.equal((await h.fullPromise).teach, "one teach 1");
    assert.equal(calls.intro, 0);
  });
});

describe("intro and practice run in parallel", () => {
  test("both calls start before either finishes", async () => {
    const obj = await newObjective();
    const { gen, calls } = fakeGenerator("par", { introMs: 80, practiceMs: 80 });
    const h = ensureGeneration(obj, objRow, { scope: SHARED, generator: gen, pending: instance(), ...fast });
    const full = await h.fullPromise;
    assert.deepEqual(calls.events.slice(0, 2).sort(), ["intro:start", "practice:start"]);
    assert.ok(
      calls.events.indexOf("practice:start") < calls.events.indexOf("intro:end"),
      `practice started only after intro finished: ${calls.events.join(",")}`
    );
    assert.equal(full.teach, "par teach 1");
    assert.equal(full.solo_check, "par solo 1");
  });

  test("the intro is still handed out ahead of a slower practice half", async () => {
    const obj = await newObjective();
    const { gen, calls } = fakeGenerator("early", { introMs: 20, practiceMs: 250 });
    const h = ensureGeneration(obj, objRow, { scope: SHARED, generator: gen, pending: instance(), ...fast });
    const intro = await h.introPromise;
    assert.equal(intro?.teach, "early teach 1");
    assert.ok(!calls.events.includes("practice:end"), "intro resolved while practice was still running");
    assert.equal((await h.fullPromise).fade_problem, "early fade 1");
  });

  test("a practice failure fails the generation but the intro was already delivered; nothing is stored", async () => {
    const obj = await newObjective();
    const { gen } = fakeGenerator("pf", { failPractice: true });
    const h = ensureGeneration(obj, objRow, { scope: SHARED, generator: gen, pending: instance(), ...fast });
    h.fullPromise.catch(() => {});
    assert.equal((await h.introPromise)?.teach, "pf teach 1");
    await assert.rejects(h.fullPromise, /practice model unavailable/);
    assert.equal(await getSharedLesson(obj), null);
    assert.equal(await isClaimLive(obj, SHARED), false, "lease released");
  });

  test("an intro failure fails both promises and leaves no unhandled rejection from the practice call", async () => {
    const obj = await newObjective();
    const { gen } = fakeGenerator("if", { failIntro: true, failPractice: true, practiceMs: 40 });
    const h = ensureGeneration(obj, objRow, { scope: SHARED, generator: gen, pending: instance(), ...fast });
    await assert.rejects(h.introPromise, /model unavailable/);
    await assert.rejects(h.fullPromise, /model unavailable/);
    await new Promise((r) => setTimeout(r, 100)); // let the discarded practice call reject
  });

  test("a regenerate attributes its calls to the learner; the shared generation to nobody", async () => {
    const obj = await newObjective();
    const shared = fakeGenerator("s");
    await ensureGeneration(obj, objRow, { scope: SHARED, generator: shared.gen, pending: instance(), ...fast }).fullPromise;
    assert.deepEqual(shared.calls.users, [undefined]);
    const regen = fakeGenerator("r");
    await (await startRegeneration(userA, obj, objRow, { generator: regen.gen, pending: instance(), ...fast })).fullPromise;
    assert.deepEqual(regen.calls.users, [userA]);
  });
});

describe("per-learner regenerate", () => {
  test("A's regenerate changes what A is served and nothing B is served", async () => {
    const obj = await newObjective();
    const { gen: g0 } = fakeGenerator("shared");
    await ensureGeneration(obj, objRow, { scope: SHARED, generator: g0, pending: instance(), ...fast }).fullPromise;
    const sharedBefore = await getSharedLesson(obj);

    const { gen, calls } = fakeGenerator("regen");
    const h = await startRegeneration(userA, obj, objRow, { generator: gen, pending: instance(), ...fast });
    assert.equal((await h.introPromise)?.teach, "regen teach 1");
    await h.fullPromise;

    assert.equal(calls.avoid[0]?.teach, "shared teach 1", "avoid is the content A was seeing");
    const a = await getLessonFor(userA, obj);
    const b = await getLessonFor(userB, obj);
    assert.equal(a?.source, "override");
    assert.equal(a?.row.teach, "regen teach 1");
    assert.equal(a?.row.solo_check, "regen solo 1");
    assert.equal(b?.source, "shared");
    assert.equal(b?.row.teach, "shared teach 1");
    assert.deepEqual(await getSharedLesson(obj), sharedBefore, "shared row untouched, including generated_at");
    assert.equal((await readLessonForUser(userA, obj))?.row.teach, "regen teach 1");
    assert.equal((await readLessonForUser(userB, obj))?.row.teach, "shared teach 1");
  });

  test("a second regenerate replaces A's override and avoids it, not the shared lesson", async () => {
    const obj = await newObjective();
    const { gen: g0 } = fakeGenerator("shared");
    await ensureGeneration(obj, objRow, { scope: SHARED, generator: g0, pending: instance(), ...fast }).fullPromise;
    const { gen: g1 } = fakeGenerator("r1");
    await (await startRegeneration(userA, obj, objRow, { generator: g1, pending: instance(), ...fast })).fullPromise;
    const { gen: g2, calls } = fakeGenerator("r2");
    await (await startRegeneration(userA, obj, objRow, { generator: g2, pending: instance(), ...fast })).fullPromise;

    assert.equal(calls.avoid[0]?.teach, "r1 teach 1");
    assert.equal((await getLessonFor(userA, obj))?.row.teach, "r2 teach 1");
    const n = await queryOne<{ n: number }>(
      `select count(*) as n from lesson_content_overrides where user_id = $1 and objective_id = $2`, [userA, obj]);
    assert.equal(n!.n, 1);
    assert.equal((await getSharedLesson(obj))?.teach, "shared teach 1");
  });

  test("regenerating before any shared lesson exists writes only the override", async () => {
    const obj = await newObjective();
    const { gen } = fakeGenerator("solo");
    const h = await startRegeneration(userA, obj, objRow, { generator: gen, pending: instance(), ...fast });
    await h.fullPromise;
    assert.equal(await getSharedLesson(obj), null);
    assert.equal((await getLessonFor(userA, obj))?.source, "override");
    assert.equal(await getLessonFor(userB, obj), null);
  });

  test("clears A's saved position but not B's", async () => {
    const obj = await newObjective();
    const { gen: g0 } = fakeGenerator("shared");
    await ensureGeneration(obj, objRow, { scope: SHARED, generator: g0, pending: instance(), ...fast }).fullPromise;
    for (const u of [userA, userB]) {
      await query(
        `insert into lesson_progress (user_id, objective_id, step, lesson_key) values ($1, $2, 'fade', 'key-1')`,
        [u, obj]
      );
    }
    const { gen } = fakeGenerator("regen");
    const h = await startRegeneration(userA, obj, objRow, { generator: gen, pending: instance(), ...fast });
    await h.introPromise;
    await h.fullPromise;

    const rows = await query<{ user_id: string; lesson_key: string }>(
      `select user_id, lesson_key from lesson_progress where objective_id = $1`, [obj]);
    assert.deepEqual(rows, [{ user_id: userB, lesson_key: "key-1" }]);
  });

  test("a failed regenerate leaves A's lesson and saved position alone", async () => {
    const obj = await newObjective();
    const { gen: g0 } = fakeGenerator("shared");
    await ensureGeneration(obj, objRow, { scope: SHARED, generator: g0, pending: instance(), ...fast }).fullPromise;
    await query(`insert into lesson_progress (user_id, objective_id, step, lesson_key) values ($1, $2, 'solo', 'k')`, [userA, obj]);

    const { gen } = fakeGenerator("bad", { failIntro: true });
    const h = await startRegeneration(userA, obj, objRow, { generator: gen, pending: instance(), ...fast });
    await assert.rejects(h.introPromise, /model unavailable/);
    await assert.rejects(h.fullPromise, /model unavailable/);

    assert.equal((await getLessonFor(userA, obj))?.source, "shared");
    assert.ok(await queryOne(`select 1 from lesson_progress where user_id = $1 and objective_id = $2`, [userA, obj]));
    assert.equal(await isClaimLive(obj, { kind: "user", userId: userA }), false, "lease released after failure");
  });

  test("two regenerates by different learners do not interfere", async () => {
    const obj = await newObjective();
    const { gen: ga } = fakeGenerator("A", { introMs: 50 });
    const { gen: gb } = fakeGenerator("B", { introMs: 50 });
    const [ha, hb] = [
      await startRegeneration(userA, obj, objRow, { generator: ga, pending: instance(), ...fast }),
      await startRegeneration(userB, obj, objRow, { generator: gb, pending: instance(), ...fast }),
    ];
    await Promise.all([ha.fullPromise, hb.fullPromise]);
    assert.equal((await getLessonFor(userA, obj))?.row.teach, "A teach 1");
    assert.equal((await getLessonFor(userB, obj))?.row.teach, "B teach 1");
  });
});

describe("cross-instance generation claims", () => {
  test("concurrent first generations on different instances run the generator exactly once", async () => {
    const obj = await newObjective();
    const { gen, calls } = fakeGenerator("once", { introMs: 150 });
    // Three separate pending maps = three server instances sharing one database.
    const handles = [0, 1, 2].map(() => ensureGeneration(obj, objRow, { scope: SHARED, generator: gen, pending: instance(), ...fast }));
    const intros = await Promise.all(handles.map((h) => h.introPromise));
    const fulls = await Promise.all(handles.map((h) => h.fullPromise));

    assert.equal(calls.intro, 1, "intro generated once");
    assert.equal(calls.practice, 1, "practice generated once");
    assert.equal(intros.filter((i) => i !== null).length, 1, "exactly one caller got an intro to show");
    assert.deepEqual(new Set(fulls.map((f) => f.teach)), new Set(["once teach 1"]));
    assert.deepEqual(new Set(fulls.map((f) => f.solo_check)), new Set(["once solo 1"]));
    const n = await queryOne<{ n: number }>(`select count(*) as n from lesson_content where objective_id = $1`, [obj]);
    assert.equal(n!.n, 1);
  });

  test("in the same instance the in-memory map still collapses callers onto one handle", async () => {
    const obj = await newObjective();
    const { gen, calls } = fakeGenerator("mem", { introMs: 50 });
    const map = instance();
    const h1 = ensureGeneration(obj, objRow, { scope: SHARED, generator: gen, pending: map, ...fast });
    const h2 = ensureGeneration(obj, objRow, { scope: SHARED, generator: gen, pending: map, ...fast });
    assert.equal(h1, h2);
    assert.ok(map.has(pendingKey(obj, SHARED)));
    await h1.fullPromise;
    await new Promise((r) => setImmediate(r));
    assert.equal(map.size, 0, "handle removed once done");
    assert.equal(calls.intro, 1);
  });

  test("when the claim holder fails, a waiting instance takes over and generates", async () => {
    const obj = await newObjective();
    const bad = fakeGenerator("bad", { introMs: 100, failIntro: true });
    const good = fakeGenerator("good");
    const first = ensureGeneration(obj, objRow, { scope: SHARED, generator: bad.gen, pending: instance(), ...fast });
    first.fullPromise.catch(() => {});
    await new Promise((r) => setTimeout(r, 20)); // let `first` take the claim
    const second = ensureGeneration(obj, objRow, { scope: SHARED, generator: good.gen, pending: instance(), ...fast });

    assert.equal(await second.introPromise, null, "second instance lost the claim first");
    assert.equal((await second.fullPromise).teach, "good teach 1");
    await assert.rejects(first.fullPromise, /model unavailable/);
    assert.equal(bad.calls.intro, 1);
    assert.equal(good.calls.intro, 1);
  });

  test("a claim older than the lease is taken over; a fresh one is not", async () => {
    const obj = await newObjective();
    const t1 = randomUUID();
    const t2 = randomUUID();
    assert.equal(await tryClaim(obj, SHARED, t1), true);
    assert.equal(await tryClaim(obj, SHARED, t2), false, "live claim blocks a second claimer");
    await query(
      `update lesson_generation_claims set claimed_at = now() - make_interval(secs => $2) where objective_id = $1`,
      [obj, CLAIM_LEASE_SECONDS + 5]
    );
    assert.equal(await isClaimLive(obj, SHARED), false);
    assert.equal(await tryClaim(obj, SHARED, t2), true, "stale claim is taken over");
    await releaseClaim(obj, SHARED, t1); // the old holder finishing late must not free the new lease
    assert.equal(await isClaimLive(obj, SHARED), true);
    await releaseClaim(obj, SHARED, t2);
    assert.equal(await isClaimLive(obj, SHARED), false);
  });

  test("simultaneous tryClaim calls: exactly one wins", async () => {
    const obj = await newObjective();
    const results = await Promise.all(Array.from({ length: 8 }, () => tryClaim(obj, SHARED, randomUUID())));
    assert.equal(results.filter(Boolean).length, 1);
  });

  test("a GET waits for the learner's own regenerate running elsewhere, then serves it", async () => {
    const obj = await newObjective();
    const { gen: g0 } = fakeGenerator("shared");
    await ensureGeneration(obj, objRow, { scope: SHARED, generator: g0, pending: instance(), ...fast }).fullPromise;

    // FAIL-088: practice must still be running when the lease is checked.
    // With practice instant, the regenerate could write the lesson and release
    // its lease between the intro resolving and the check below (about 1 run
    // in 12 of the full suite); practiceMs keeps the lease held for ~400 ms.
    const { gen } = fakeGenerator("regen", { introMs: 100, practiceMs: 500 });
    const h = await startRegeneration(userA, obj, objRow, { generator: gen, pending: instance(), ...fast });
    await h.introPromise; // practice still running, lease still held
    assert.equal(await isClaimLive(obj, { kind: "user", userId: userA }), true);

    const [forA, forB] = await Promise.all([readLessonForUser(userA, obj, fast), readLessonForUser(userB, obj, fast)]);
    assert.equal(forA?.row.teach, "regen teach 1", "A is not handed the pre-regenerate lesson mid-regenerate");
    assert.equal(forA?.row.fade_problem, "regen fade 1");
    assert.equal(forB?.row.teach, "shared teach 1", "B is not made to wait or switch");
    await h.fullPromise;
  });

  test("a second regenerate tap on another instance returns the first one's result without generating", async () => {
    const obj = await newObjective();
    const first = fakeGenerator("first", { introMs: 100 });
    const second = fakeGenerator("second");
    const h1 = await startRegeneration(userA, obj, objRow, { generator: first.gen, pending: instance(), ...fast });
    await new Promise((r) => setTimeout(r, 30)); // let the first instance take its lease
    const h2 = await startRegeneration(userA, obj, objRow, { generator: second.gen, pending: instance(), ...fast });
    assert.equal(await h2.introPromise, null);
    assert.equal((await h2.fullPromise).teach, "first teach 1");
    await h1.fullPromise;
    assert.equal(second.calls.intro, 0);
  });
});

describe("regenerate rate limit", () => {
  test("refuses the sixth regenerate in a window, per learner", async () => {
    for (let i = 0; i < REGEN_LIMIT.max; i++) {
      await checkRateLimit(REGEN_RATE_EVENT, userA, REGEN_LIMIT);
      await recordAuthEvent(REGEN_RATE_EVENT, userA, { userId: userA });
    }
    await assert.rejects(checkRateLimit(REGEN_RATE_EVENT, userA, REGEN_LIMIT), RateLimitError);
    await checkRateLimit(REGEN_RATE_EVENT, userB, REGEN_LIMIT); // B is unaffected
  });
});
