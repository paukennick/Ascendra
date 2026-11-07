import { randomUUID } from "node:crypto";
import { query, queryOne } from "./db";
import { UserFacingError } from "./http";
import { NotVisibleError, visibleUnit } from "./visibility";
import { CLAIM_LEASE_SECONDS } from "./lesson-store";

// REQ-107: which PBQ scenario a learner is served for a unit.
//
// GET /api/pbq?unitId= used to return the unit's newest scenario from any
// learner, so a learner who had already answered it got it again. Now:
//
//   1. The newest scenario for the unit that this learner can see and has
//      not attempted is served. Scenarios already generated are reused
//      across learners (no model call), but only ones they may see: a
//      scenario belongs to a unit, and a unit to a track, so one generated
//      on a learner's private course is visible to that learner alone
//      (the same rule as lib/visibility.ts, applied in the query itself).
//   2. Only when every visible scenario has been attempted is a new one
//      generated. `fresh` (the app's "Try another scenario") always
//      generates, as before.
//
// Generating takes seconds, so two requests from the same learner for the
// same unit at once would both find nothing unseen and both generate. A
// lease in pbq_generation_claims (migration 036), one per (learner, unit),
// lets exactly one of them generate; the rest wait for its release and then
// serve what it stored. The lease has the same rules as the lesson
// generation lease (lib/lesson-store.ts): takeover only after it expires,
// heartbeat while generating, release by the holder's own token.
//
// Pure database access plus an injected generator, so it can be tested
// against a real Postgres with the model faked (lib/pbq-scenarios.dbtest.ts).

export interface PbqScenarioRow {
  id: string;
  unit_id: string;
  title: string;
  scenario: string;
  sub_parts: string[];
  model: string;
  generated_at: string;
}

export interface GeneratedScenario {
  title: string;
  scenario: string;
  subParts: string[];
  model: string;
}

// Spends the budget and calls the model. Called only by the lease holder,
// so a request that waits for another one's scenario costs nothing.
export type ScenarioGenerator = () => Promise<GeneratedScenario>;

export interface ServeOptions {
  userId: string;
  unitId: string;
  fresh: boolean;
  generate: ScenarioGenerator;
  // Test seams; production uses the defaults.
  waitMs?: number;
  pollMs?: number;
  heartbeatMs?: number;
}

const SCENARIO_COLUMNS = `ps.id, ps.unit_id, ps.title, ps.scenario, ps.sub_parts, ps.model, ps.generated_at`;

const DEFAULT_WAIT_MS = 90_000;
const DEFAULT_POLL_MS = 500;
const HEARTBEAT_MS = (CLAIM_LEASE_SECONDS * 1000) / 4;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// The newest scenario for the unit that the learner may see and has never
// attempted, or null. Newest first so that after "Try another scenario"
// (which generates) a plain reopen returns that same new scenario while it
// is still unanswered, and so concurrent callers agree on one row.
export async function findUnseenScenario(userId: string, unitId: string): Promise<PbqScenarioRow | null> {
  return queryOne<PbqScenarioRow>(
    `select ${SCENARIO_COLUMNS}
       from pbq_scenarios ps
       join course_units cu on cu.id = ps.unit_id
       join subject_tracks st on st.id = cu.track_id
      where ps.unit_id = $1
        and (st.user_id is null or st.user_id = $2)
        and not exists (
          select 1 from attempts a where a.user_id = $2 and a.pbq_scenario_id = ps.id
        )
      order by ps.generated_at desc, ps.id desc
      limit 1`,
    [unitId, userId]
  );
}

export async function tryPbqClaim(userId: string, unitId: string, token: string): Promise<boolean> {
  const rows = await query(
    `insert into pbq_generation_claims (user_id, unit_id, claim_token, claimed_at)
     values ($1, $2, $3, now())
     on conflict (user_id, unit_id) do update
       set claim_token = excluded.claim_token, claimed_at = now()
       where pbq_generation_claims.claimed_at < now() - make_interval(secs => $4::double precision)
     returning claim_token`,
    [userId, unitId, token, CLAIM_LEASE_SECONDS]
  );
  return rows.length > 0;
}

export async function renewPbqClaim(userId: string, unitId: string, token: string): Promise<boolean> {
  const rows = await query(
    `update pbq_generation_claims set claimed_at = now()
      where user_id = $1 and unit_id = $2 and claim_token = $3
      returning 1`,
    [userId, unitId, token]
  );
  return rows.length > 0;
}

export async function releasePbqClaim(userId: string, unitId: string, token: string): Promise<void> {
  await query(`delete from pbq_generation_claims where user_id = $1 and unit_id = $2 and claim_token = $3`, [
    userId,
    unitId,
    token,
  ]);
}

export async function isPbqClaimLive(userId: string, unitId: string): Promise<boolean> {
  const row = await queryOne(
    `select 1 from pbq_generation_claims
      where user_id = $1 and unit_id = $2
        and claimed_at >= now() - make_interval(secs => $3::double precision)`,
    [userId, unitId, CLAIM_LEASE_SECONDS]
  );
  return row !== null;
}

async function insertScenario(unitId: string, g: GeneratedScenario): Promise<PbqScenarioRow> {
  const rows = await query<PbqScenarioRow>(
    `insert into pbq_scenarios as ps (unit_id, title, scenario, sub_parts, model)
     values ($1,$2,$3,$4,$5) returning ${SCENARIO_COLUMNS}`,
    [unitId, g.title, g.scenario, JSON.stringify(g.subParts), g.model]
  );
  return rows[0];
}

export async function servePbqScenario(opts: ServeOptions): Promise<{ scenario: PbqScenarioRow; cached: boolean }> {
  const { userId, fresh, generate } = opts;
  // Belt and braces: the route has already checked the unit, but nothing
  // here may generate for, or serve from, a unit the caller cannot see.
  const unit = await visibleUnit(opts.unitId, userId);
  if (!unit) throw new NotVisibleError("Unit not found");
  const unitId = unit.id;

  if (!fresh) {
    const unseen = await findUnseenScenario(userId, unitId);
    if (unseen) return { scenario: unseen, cached: true };
  }

  const deadline = Date.now() + (opts.waitMs ?? DEFAULT_WAIT_MS);
  const pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
  const token = randomUUID();

  for (;;) {
    if (await tryPbqClaim(userId, unitId, token)) {
      const heartbeat = setInterval(() => {
        renewPbqClaim(userId, unitId, token).catch(() => {});
      }, opts.heartbeatMs ?? HEARTBEAT_MS);
      try {
        if (!fresh) {
          // Another request may have stored one between our first read and
          // the claim. Serve it rather than generating a second.
          const unseen = await findUnseenScenario(userId, unitId);
          if (unseen) return { scenario: unseen, cached: true };
        }
        const generated = await generate();
        // Stored even if the lease was lost to a takeover: the model call is
        // already spent, and an extra unseen scenario is still useful.
        return { scenario: await insertScenario(unitId, generated), cached: false };
      } finally {
        clearInterval(heartbeat);
        // Success or failure: release so a waiter proceeds at once.
        await releasePbqClaim(userId, unitId, token).catch(() => {});
      }
    }

    // This learner has another request generating for this unit. Wait for
    // it, then serve the newest unseen scenario -- the one it stored (also
    // for `fresh`: a double tap of "Try another scenario" is one request).
    for (;;) {
      if (Date.now() >= deadline) {
        throw new UserFacingError("Scenario generation is taking longer than expected. Please try again in a moment.");
      }
      await sleep(pollMs);
      if (!(await isPbqClaimLive(userId, unitId))) break;
    }
    const unseen = await findUnseenScenario(userId, unitId);
    if (unseen) return { scenario: unseen, cached: true };
    // The other request failed (or its holder died and the lease expired)
    // without storing anything: take the lease and generate ourselves.
  }
}
