// REQ-107: PBQ scenarios per learner (lib/pbq-scenarios.ts, migration 036)
// against a real Postgres with every migration applied. The model is a fake
// generator, so nothing here calls Anthropic. Run with:
//   DATABASE_URL=... PGSSLMODE=disable npm run test:db
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { query, queryOne, closePool } from "./db";
import { NotVisibleError } from "./visibility";
import { CLAIM_LEASE_SECONDS } from "./lesson-store";
import {
  servePbqScenario,
  findUnseenScenario,
  tryPbqClaim,
  isPbqClaimLive,
  type ScenarioGenerator,
} from "./pbq-scenarios";

const run = Date.now().toString(36);
const alice = randomUUID();
const bob = randomUUID();
const catalogTrack = randomUUID();
const aliceTrack = randomUUID(); // private to alice

async function newUnit(trackId: string): Promise<string> {
  const id = randomUUID();
  await query(`insert into course_units (id, track_id, title, sort_order) values ($1, $2, 'U', 1)`, [id, trackId]);
  return id;
}

async function seedScenario(unitId: string, title: string, ageSeconds = 0): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `insert into pbq_scenarios (unit_id, title, scenario, sub_parts, model, generated_at)
     values ($1, $2, 'text', '["a","b"]', 'seed', now() - make_interval(secs => $3::double precision)) returning id`,
    [unitId, title, ageSeconds]
  );
  return row!.id;
}

async function attempt(userId: string, unitId: string, scenarioId: string) {
  await query(
    `insert into attempts (user_id, unit_id, pbq_scenario_id, kind, format, question, answer, verdict)
     values ($1, $2, $3, 'pbq', 'pbq', 'S', 'answer', 'partial')`,
    [userId, unitId, scenarioId]
  );
}

// Stands in for the model: counts calls, can be slowed so concurrent
// callers overlap, and can fail.
function fakeGenerator(opts: { delayMs?: number; fail?: Error } = {}) {
  let calls = 0;
  const gen: ScenarioGenerator = async () => {
    calls++;
    const n = calls;
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
    if (opts.fail) throw opts.fail;
    return { title: `gen-${run}-${n}-${randomUUID()}`, scenario: "s", subParts: ["x", "y"], model: "fake" };
  };
  return { gen, calls: () => calls };
}

const fast = { pollMs: 20, waitMs: 10_000 };

before(async () => {
  for (const [id, name] of [[alice, "alice"], [bob, "bob"]]) {
    await query(`insert into app_users (id, email) values ($1, $2)`, [id, `pbq-${name}-${run}@example.test`]);
  }
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id, source_url)
     values ($1, $2, 'Catalog', 'certification', null, 'https://example.test/src')`,
    [catalogTrack, `PBQ-${run}`]
  );
  await query(
    `insert into subject_tracks (id, code, title, track_type, user_id) values ($1, $2, 'Alice private', 'certification', $3)`,
    [aliceTrack, `PBQPRIV-${run}`, alice]
  );
});

after(async () => {
  await query(`delete from app_users where id = any($1)`, [[alice, bob]]);
  await query(`delete from subject_tracks where id = any($1)`, [[catalogTrack, aliceTrack]]);
  await closePool();
});

describe("PBQ selection per learner (REQ-107)", () => {
  test("serves a scenario the learner has not attempted, reusing stored ones before generating", async () => {
    const unit = await newUnit(catalogTrack);
    const older = await seedScenario(unit, "older", 60);
    const newer = await seedScenario(unit, "newer", 0);
    const g = fakeGenerator();

    // Old behaviour: the newest scenario, answered or not. Now: the newest
    // UNSEEN one.
    let r = await servePbqScenario({ userId: alice, unitId: unit, fresh: false, generate: g.gen, ...fast });
    assert.equal(r.scenario.id, newer);
    assert.equal(r.cached, true);
    await attempt(alice, unit, newer);

    r = await servePbqScenario({ userId: alice, unitId: unit, fresh: false, generate: g.gen, ...fast });
    assert.equal(r.scenario.id, older, "the answered scenario is not served again");
    assert.equal(g.calls(), 0, "stored scenarios are used before the model is called");
    await attempt(alice, unit, older);

    r = await servePbqScenario({ userId: alice, unitId: unit, fresh: false, generate: g.gen, ...fast });
    assert.equal(r.cached, false);
    assert.equal(g.calls(), 1, "a new scenario only once every stored one has been attempted");
    assert.ok(![older, newer].includes(r.scenario.id));
    assert.deepEqual(r.scenario.sub_parts, ["x", "y"]);
    assert.equal(r.scenario.unit_id, unit);

    // Unanswered, so a plain reopen returns the same one without generating.
    const again = await servePbqScenario({ userId: alice, unitId: unit, fresh: false, generate: g.gen, ...fast });
    assert.equal(again.scenario.id, r.scenario.id);
    assert.equal(g.calls(), 1);
  });

  test("a catalog scenario one learner answered is still served to another learner", async () => {
    const unit = await newUnit(catalogTrack);
    const s = await seedScenario(unit, "shared");
    await attempt(alice, unit, s);
    const g = fakeGenerator();
    const r = await servePbqScenario({ userId: bob, unitId: unit, fresh: false, generate: g.gen, ...fast });
    assert.equal(r.scenario.id, s);
    assert.equal(g.calls(), 0);
  });

  test("fresh=1 always generates, even with an unseen scenario stored", async () => {
    const unit = await newUnit(catalogTrack);
    const s = await seedScenario(unit, "unseen");
    const g = fakeGenerator();
    const r = await servePbqScenario({ userId: alice, unitId: unit, fresh: true, generate: g.gen, ...fast });
    assert.notEqual(r.scenario.id, s);
    assert.equal(r.cached, false);
    assert.equal(g.calls(), 1);
  });

  test("5 concurrent plain requests from one learner for one unit generate exactly one scenario", async () => {
    const unit = await newUnit(catalogTrack);
    const g = fakeGenerator({ delayMs: 300 });
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        servePbqScenario({ userId: alice, unitId: unit, fresh: false, generate: g.gen, ...fast })
      )
    );
    assert.equal(g.calls(), 1, "the model was called once");
    const ids = new Set(results.map((r) => r.scenario.id));
    assert.equal(ids.size, 1, "all five got the same scenario");
    const stored = await queryOne<{ n: number }>(`select count(*)::int as n from pbq_scenarios where unit_id = $1`, [unit]);
    assert.equal(stored!.n, 1, "one row stored");
    assert.equal(results.filter((r) => !r.cached).length, 1);
    assert.equal(await isPbqClaimLive(alice, unit), false, "lease released");
  });

  test("5 concurrent fresh=1 requests (a burst of taps) generate exactly one scenario", async () => {
    const unit = await newUnit(catalogTrack);
    await seedScenario(unit, "existing", 60);
    const g = fakeGenerator({ delayMs: 300 });
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        servePbqScenario({ userId: alice, unitId: unit, fresh: true, generate: g.gen, ...fast })
      )
    );
    assert.equal(g.calls(), 1);
    assert.equal(new Set(results.map((r) => r.scenario.id)).size, 1);
    const stored = await queryOne<{ n: number }>(`select count(*)::int as n from pbq_scenarios where unit_id = $1`, [unit]);
    assert.equal(stored!.n, 2);
  });

  test("two learners on one catalog unit are not serialised against each other", async () => {
    const unit = await newUnit(catalogTrack);
    const g = fakeGenerator({ delayMs: 200 });
    const [a, b] = await Promise.all([
      servePbqScenario({ userId: alice, unitId: unit, fresh: true, generate: g.gen, ...fast }),
      servePbqScenario({ userId: bob, unitId: unit, fresh: true, generate: g.gen, ...fast }),
    ]);
    assert.equal(g.calls(), 2);
    assert.notEqual(a.scenario.id, b.scenario.id);
  });

  test("a failed generation releases the lease; a waiter then generates instead of hanging", async () => {
    const unit = await newUnit(catalogTrack);
    const bad = fakeGenerator({ delayMs: 200, fail: new Error("model down") });
    const good = fakeGenerator();
    const first = servePbqScenario({ userId: alice, unitId: unit, fresh: false, generate: bad.gen, ...fast });
    await new Promise((r) => setTimeout(r, 50));
    const second = servePbqScenario({ userId: alice, unitId: unit, fresh: false, generate: good.gen, ...fast });
    await assert.rejects(first, /model down/);
    const r = await second;
    assert.equal(r.cached, false);
    assert.equal(bad.calls(), 1);
    assert.equal(good.calls(), 1);
    assert.equal(await isPbqClaimLive(alice, unit), false);
  });

  test("a lease past its expiry is taken over; a live one is not", async () => {
    const unit = await newUnit(catalogTrack);
    assert.equal(await tryPbqClaim(alice, unit, randomUUID()), true);
    assert.equal(await tryPbqClaim(alice, unit, randomUUID()), false, "live lease holds");
    await query(
      `update pbq_generation_claims set claimed_at = now() - make_interval(secs => $3::double precision)
        where user_id = $1 and unit_id = $2`,
      [alice, unit, CLAIM_LEASE_SECONDS + 5]
    );
    const g = fakeGenerator();
    const r = await servePbqScenario({ userId: alice, unitId: unit, fresh: false, generate: g.gen, ...fast });
    assert.equal(r.cached, false);
    assert.equal(g.calls(), 1);
  });

  test("a waiter gives up with a user-facing error at its deadline", async () => {
    const unit = await newUnit(catalogTrack);
    assert.equal(await tryPbqClaim(alice, unit, randomUUID()), true);
    const g = fakeGenerator();
    await assert.rejects(
      servePbqScenario({ userId: alice, unitId: unit, fresh: false, generate: g.gen, pollMs: 20, waitMs: 150 }),
      (err: Error) => err.name === "UserFacingError" && /longer than expected/.test(err.message)
    );
    assert.equal(g.calls(), 0);
    await query(`delete from pbq_generation_claims where user_id = $1 and unit_id = $2`, [alice, unit]);
  });

  test("scenarios on a learner's private course are never served to another learner", async () => {
    const unit = await newUnit(aliceTrack);
    const g = fakeGenerator();
    const mine = await servePbqScenario({ userId: alice, unitId: unit, fresh: false, generate: g.gen, ...fast });
    assert.equal(mine.cached, false);
    // Bob can't use the unit at all: no scenario served, nothing generated,
    // no lease taken.
    await assert.rejects(
      servePbqScenario({ userId: bob, unitId: unit, fresh: false, generate: g.gen, ...fast }),
      NotVisibleError
    );
    await assert.rejects(
      servePbqScenario({ userId: bob, unitId: unit, fresh: true, generate: g.gen, ...fast }),
      NotVisibleError
    );
    assert.equal(g.calls(), 1);
    assert.equal(await findUnseenScenario(bob, unit), null, "the selection query applies visibility itself");
    assert.equal(await isPbqClaimLive(bob, unit), false);
  });

  test("an uppercase unit id shares the learner's lease and finds the same scenarios", async () => {
    const unit = await newUnit(catalogTrack);
    const g = fakeGenerator({ delayMs: 200 });
    const [a, b] = await Promise.all([
      servePbqScenario({ userId: alice, unitId: unit, fresh: false, generate: g.gen, ...fast }),
      servePbqScenario({ userId: alice, unitId: unit.toUpperCase(), fresh: false, generate: g.gen, ...fast }),
    ]);
    assert.equal(g.calls(), 1);
    assert.equal(a.scenario.id, b.scenario.id);
  });
});
