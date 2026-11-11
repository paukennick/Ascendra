import { consumeGradedAnswer } from "@/lib/ai-access";
import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { query, queryOne, withTransaction, type TxClient } from "@/lib/db";
import { isActive } from "@/lib/progress-sql";
import { isUuid, normUuid } from "@/lib/visibility";
import { serverError, unauthorized, forbidden } from "@/lib/http";
import { AuthError } from "@/lib/auth/requireUser";
import { AcknowledgementError, requireAcknowledgementForObjective } from "@/lib/auth/requireAcknowledgement";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { withGradingClaim, GradingInProgressError } from "@/lib/grading-claims";
import { findClientAttempt, recordAttemptTx } from "@/lib/grading-service";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { cleanText, hasUnstorableText } from "@/lib/text-input";
import { coachContextForObjective } from "@/lib/coach-context";
import { consumeAllowance, hasFeature, requireCourseAccess, requireFeature } from "@/lib/entitlements";
import { requireStudyNotice } from "@/lib/study-notice";
import { servableSql, type ItemRef } from "@/lib/item-quality";
import type { Feature } from "@/lib/billing-config";
import { LAB_GRADE_LIMIT } from "@/lib/lab-routes";
import type { LabStepModel } from "@/lib/lab-grading";
import { gradeSimReasoning, modelAnswerOf } from "@/lib/sim-grading";
import { applyCommand, calmSkip, ENGINE_VERSION, minWallSeconds, scoreRun, stateHash, waits } from "@/lib/sim/engine/v1/index.ts";
import type { Checkpoint, Command, DebriefData, ReasoningGrade, ScenarioDoc, WaitInfo } from "@/lib/sim/engine/v1/index.ts";
import type { ClientDoc } from "@/lib/sim/content-hash.ts";
import {
  ReplayBudgetError,
  SIM_LIMITS,
  isRevealed,
  parseCommands,
  pausedSeconds,
  renderersOn,
  replayRun,
  runnable,
  sameCommand,
  serveUnreviewed,
  simsEnabled,
  situationSummary,
  verdictFor,
  pacingEligible,
  pacingRefusal,
  withinPacedSpeedBound,
  type SimCaps,
  type VersionNeeds,
} from "@/lib/sim/server-run.ts";

// REQ-190 (docs/sims.md 6, 7, 9, 10, 11): the sim store and the route flows.
// The routes (app/api/sims/**) are thin wrappers; lib/sims.dbtest.ts drives
// exactly what runs.
//
// Who owns what. The app runs the engine on the client document so the
// monitor is live; it sends only commands. The server pins the run's
// version, replays every command through the same deterministic engine from
// its last checkpoint, and its replay decides validity, the ending, the
// outcome class, the score and the one mastery attempt. A client score is
// never read.
//
// Content is served as built, under the one study notice (REQ-165; Nick,
// 2026-11-09, docs/sims.md 19.4 item 5). Review status is internal.

export const SIMS_FEATURE = "sims" as const satisfies Feature;

export class SimError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409 | 413 | 429,
    readonly code: string,
    message: string,
    readonly extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SimError";
  }
}

export function simRouteError(err: unknown) {
  if (err instanceof AuthError) return unauthorized(err.message);
  if (err instanceof AcknowledgementError) return forbidden(err.message, err.extra);
  if (err instanceof SimError) return NextResponse.json({ ...(err.extra ?? {}), error: err.message, code: err.code }, { status: err.status });
  if (err instanceof ReplayBudgetError) return NextResponse.json({ error: err.message, code: "replay_budget" }, { status: 413 });
  if (err instanceof GradingInProgressError) return NextResponse.json({ error: err.message, code: "grading_in_progress" }, { status: 409 });
  return serverError(err);
}

export function requireSimsEnabled(env: Record<string, string | undefined> = process.env): void {
  if (!simsEnabled(env)) throw new SimError(404, "sims_disabled", "Simulations are not available right now.");
}

const notFound = () => new SimError(404, "not_found", "Sim not found");
const runNotFound = () => new SimError(404, "not_found", "Run not found");

// ---------------------------------------------------------------------------
// Reading sims
// ---------------------------------------------------------------------------

export interface SimRow {
  id: string;
  objective_id: string;
  slug: string;
  title: string;
  screen_type: string;
  safety_family: "clinical" | "fitness" | "general";
  head_version_id: string | null;
  unit_id: string;
  track_id: string;
  objective_title: string;
}

export interface VersionRow {
  id: string;
  version: number;
  engine_major: number;
  engine_minor: number;
  renderer_level: number;
  client_hash: string;
  review_status: "needs_expert_review" | "approved" | "rejected";
}

const SIM_COLS = `s.id, s.objective_id, s.slug, s.title, s.screen_type, s.safety_family, s.head_version_id,
                  o.unit_id, cu.track_id, o.title as objective_title`;

// Which version new runs get (docs/sims.md 6): never one pulled from rotation
// by learner reports (REQ-199, item kind 'sim' in item_status, not
// cleared); then an approved head; else the
// latest approved; else the head unless rejected, while serving unreviewed
// content is on (the default). Among those, one the app can run (5.10): if
// the first choice is not runnable, the latest approved runnable one.
export async function servedVersion(
  sim: Pick<SimRow, "id" | "head_version_id" | "screen_type">,
  caps: SimCaps | null,
  env: Record<string, string | undefined> = process.env,
  db: Pick<TxClient, "query"> = { query }
): Promise<{ version: VersionRow; runnable: boolean } | null> {
  const rows = await db.query<VersionRow & { is_head: boolean }>(
    `select id, version, engine_major, engine_minor, renderer_level, client_hash, review_status, (id = $2::uuid) as is_head
       from sim_versions where sim_id = $1 and ${servableSql("sim", "id")} order by version desc`,
    [sim.id, sim.head_version_id]
  );
  const head = rows.find((r) => r.is_head) ?? null;
  const approved = rows.filter((r) => r.review_status === "approved");
  let first: VersionRow | null = null;
  if (head && head.review_status === "approved") first = head;
  else if (approved.length) first = approved[0];
  else if (head && head.review_status !== "rejected" && serveUnreviewed(env)) first = head;
  if (!first) return null;
  const can = (v: VersionRow) => runnable({ ...v, screen_type: sim.screen_type }, caps);
  if (can(first)) return { version: first, runnable: true };
  const fallback = approved.find(can);
  return fallback ? { version: fallback, runnable: true } : { version: first, runnable: false };
}

// A sim this learner may open: not retired, on an active objective of a
// track they can see, its renderer switched on. Null otherwise (404).
export async function visibleSim(simId: string, userId: string, env: Record<string, string | undefined> = process.env): Promise<SimRow | null> {
  if (!isUuid(simId)) return null;
  const sim = await queryOne<SimRow>(
    `select ${SIM_COLS}
       from sims s
       join objectives o on o.id = s.objective_id
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
      where s.id = $1 and s.retired_at is null and (st.user_id is null or st.user_id = $2)
        and ${isActive("o")} and ${isActive("cu")}`,
    [simId, userId]
  );
  if (!sim || !renderersOn(env).includes(sim.screen_type)) return null;
  return sim;
}

// ---------------------------------------------------------------------------
// Tier access (docs/sims.md 11.2): Pro; Free and Plus get one sample sim per
// course: the first approved sim in course order, else the first served one.
// ---------------------------------------------------------------------------

export type SimAccess = "full" | "sample" | "locked";

export async function sampleSimId(trackId: string, env: Record<string, string | undefined> = process.env): Promise<string | null> {
  const rows = await query<{ id: string; head_version_id: string | null; screen_type: string; approved: boolean }>(
    `select s.id, s.head_version_id, s.screen_type,
            exists(select 1 from sim_versions v where v.sim_id = s.id and v.review_status = 'approved') as approved
       from sims s
       join objectives o on o.id = s.objective_id
       join course_units cu on cu.id = o.unit_id
      where cu.track_id = $1 and s.retired_at is null and ${isActive("o")} and ${isActive("cu")}
      order by approved desc, cu.sort_order, o.sort_order, s.title, s.id`,
    [trackId]
  );
  const on = renderersOn(env);
  for (const r of rows) {
    if (!on.includes(r.screen_type)) continue;
    if (r.approved || (r.head_version_id && serveUnreviewed(env))) return r.id;
  }
  return null;
}

export async function simAccess(userId: string, sim: Pick<SimRow, "id" | "track_id">, env: Record<string, string | undefined> = process.env): Promise<SimAccess> {
  if (await hasFeature(userId, SIMS_FEATURE, sim.track_id, env as NodeJS.ProcessEnv)) return "full"; // REQ-170: on this course
  return (await sampleSimId(sim.track_id, env)) === sim.id ? "sample" : "locked";
}

async function runsOf(userId: string, simId: string): Promise<{ any: boolean; open: boolean }> {
  const r = await queryOne<{ any: boolean; open: boolean }>(
    `select count(*) > 0 as any, coalesce(bool_or(status = 'open'), false) as open from sim_runs where user_id = $1 and sim_id = $2`,
    [userId, simId]
  );
  return { any: r?.any === true, open: r?.open === true };
}

// view: open to the learner, or a sim they have run (their results stay
// readable). resume: an open run always comes back. start: full or sample.
export async function gateSim(userId: string, sim: SimRow, mode: "view" | "resume" | "start", env: Record<string, string | undefined> = process.env): Promise<SimAccess> {
  const access = await simAccess(userId, sim, env);
  const runs = mode === "start" ? { any: false, open: false } : await runsOf(userId, sim.id);
  const continuing = mode === "view" ? runs.any : runs.open;
  if (!continuing) {
    await requireCourseAccess(userId, sim.track_id, env as NodeJS.ProcessEnv);
    if (access === "locked") await requireFeature(userId, SIMS_FEATURE, sim.track_id, env as NodeJS.ProcessEnv);
  }
  return access;
}

// Clinical and fitness sims need the study notice (REQ-165), on every route
// that starts, syncs, grades or finishes a run.
async function requireNotice(sim: SimRow, userId: string): Promise<void> {
  await requireAcknowledgementForObjective(sim.objective_id, userId);
  if (sim.safety_family !== "general") await requireStudyNotice(userId);
}

// ---------------------------------------------------------------------------
// The list and one sim
// ---------------------------------------------------------------------------

export interface SimListItem {
  id: string;
  title: string;
  screenType: string;
  objectiveId: string;
  objectiveTitle: string;
  unitId: string;
  unitTitle: string;
  state: "new" | "in_progress" | "done";
  lastRating: "good" | "mediocre" | "bad" | null;
  runsFinished: number;
  access: SimAccess;
  // false = "Update the app to open this" (docs/sims.md 5.10).
  runnable: boolean;
}

export type SimScope = { trackId: string } | { unitId: string } | { objectiveId: string };

export async function listSims(userId: string, scope: SimScope, caps: SimCaps | null, env: Record<string, string | undefined> = process.env): Promise<SimListItem[]> {
  const [col, id] = "trackId" in scope ? ["cu.track_id", scope.trackId] : "unitId" in scope ? ["cu.id", scope.unitId] : ["o.id", scope.objectiveId];
  if (!isUuid(id)) return [];
  const rows = await query<SimRow & { unit_title: string; open_run: boolean; runs_finished: number; last_rating: SimListItem["lastRating"] }>(
    `select ${SIM_COLS}, cu.title as unit_title,
            exists(select 1 from sim_runs r where r.sim_id = s.id and r.user_id = $2 and r.status = 'open') as open_run,
            (select count(*)::int from sim_runs r where r.sim_id = s.id and r.user_id = $2 and r.status = 'ended') as runs_finished,
            (select r.rating from sim_runs r where r.sim_id = s.id and r.user_id = $2 and r.status = 'ended'
              order by r.ended_at desc, r.id desc limit 1) as last_rating
       from sims s
       join objectives o on o.id = s.objective_id
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
      where ${col} = $1 and s.retired_at is null and (st.user_id is null or st.user_id = $2)
        and ${isActive("o")} and ${isActive("cu")}
      order by cu.sort_order, o.sort_order, s.title, s.id`,
    [id, userId]
  );
  const on = renderersOn(env);
  // REQ-170: the tier on the listed course (a scope is one track, unit or objective).
  const full = await hasFeature(userId, SIMS_FEATURE, scope, env as NodeJS.ProcessEnv);
  const samples = new Map<string, string | null>();
  const out: SimListItem[] = [];
  for (const r of rows) {
    if (!on.includes(r.screen_type)) continue;
    const served = await servedVersion(r, caps, env);
    // Not served and never run: not listed. A run's results stay listed.
    if (!served && !r.open_run && r.runs_finished === 0) continue;
    if (!full && !samples.has(r.track_id)) samples.set(r.track_id, await sampleSimId(r.track_id, env));
    out.push({
      id: r.id,
      title: r.title,
      screenType: r.screen_type,
      objectiveId: r.objective_id,
      objectiveTitle: r.objective_title,
      unitId: r.unit_id,
      unitTitle: r.unit_title,
      state: r.open_run ? "in_progress" : r.runs_finished > 0 ? "done" : "new",
      lastRating: r.last_rating,
      runsFinished: r.runs_finished,
      access: full ? "full" : samples.get(r.track_id) === r.id ? "sample" : "locked",
      runnable: served?.runnable ?? false,
    });
  }
  return out;
}

interface RunRow {
  id: string;
  user_id: string;
  sim_id: string;
  sim_version_id: string;
  seed: string; // bigint
  engine_version: string;
  started_at: string;
  status: "open" | "ended" | "abandoned";
  lease_epoch: number;
  lease_device: string | null;
  last_seq: number;
  last_tick: number;
  last_sync_at: string | null;
  realtime_ticks: number;
  skipped_ticks: number;
  offline_ticks: number;
  revealed: boolean;
  checkpoint_tick: number | null;
  checkpoint_state: Checkpoint | null;
  state_hash: string | null;
  ending_id: string | null;
  outcome_class: string | null;
  rating: "good" | "mediocre" | "bad" | null;
  ended_at: string | null;
  score: SimDebrief | null;
  attempt_id: string | null;
  desyncs: number;
  engine_errors: number;
}

async function versionDoc(versionId: string, db: Pick<TxClient, "queryOne"> = { queryOne }): Promise<{ document: ScenarioDoc; client_document: ClientDoc; client_hash: string; version: number }> {
  const v = await db.queryOne<{ document: ScenarioDoc; client_document: ClientDoc; client_hash: string; version: number }>(
    `select document, client_document, client_hash, version from sim_versions where id = $1`,
    [versionId]
  );
  if (!v) throw new Error(`sim version ${versionId} is missing`);
  return v;
}

export interface SimView {
  sim: {
    id: string;
    title: string;
    screenType: string;
    objectiveId: string;
    objectiveTitle: string;
    unitId: string;
    trackId: string;
    safetyFamily: SimRow["safety_family"];
    access: SimAccess;
    brief: ScenarioDoc["brief"];
    runnable: boolean;
    clientHash: string | null;
  };
  openRun: { id: string; startedAt: string; lastTick: number } | null;
  lastFinished: { id: string; rating: SimDebrief["rating"]; endedAt: string } | null;
}

export async function simView(userId: string, simId: string, caps: SimCaps | null, env: Record<string, string | undefined> = process.env): Promise<SimView> {
  const sim = await visibleSim(simId, userId, env);
  if (!sim) throw notFound();
  const access = await gateSim(userId, sim, "view", env);
  const open = await queryOne<RunRow>(`select * from sim_runs where user_id = $1 and sim_id = $2 and status = 'open'`, [userId, sim.id]);
  const served = open ? null : await servedVersion(sim, caps, env);
  const versionId = open?.sim_version_id ?? served?.version.id ?? null;
  if (!versionId) throw notFound();
  const v = await versionDoc(versionId);
  const last = await queryOne<{ id: string; rating: SimDebrief["rating"]; ended_at: string }>(
    `select id, rating, ended_at from sim_runs where user_id = $1 and sim_id = $2 and status = 'ended' order by ended_at desc, id desc limit 1`,
    [userId, sim.id]
  );
  return {
    sim: {
      id: sim.id,
      title: sim.title,
      screenType: sim.screen_type,
      objectiveId: sim.objective_id,
      objectiveTitle: sim.objective_title,
      unitId: sim.unit_id,
      trackId: sim.track_id,
      safetyFamily: sim.safety_family,
      access,
      brief: v.document.brief,
      runnable: open ? true : served?.runnable ?? false,
      clientHash: v.client_hash,
    },
    openRun: open ? { id: open.id, startedAt: open.started_at, lastTick: open.last_tick } : null,
    lastFinished: last ? { id: last.id, rating: last.rating, endedAt: last.ended_at } : null,
  };
}

// ---------------------------------------------------------------------------
// Starting and resuming a run
// ---------------------------------------------------------------------------

export interface RunPayload {
  run: {
    id: string;
    simId: string;
    versionId: string;
    version: number;
    status: RunRow["status"];
    seed: number;
    leaseEpoch: number;
    lastSeq: number;
    lastTick: number;
    engineVersion: string;
  };
  clientHash: string;
  // Omitted when the app already holds this hash (it checks it before use).
  clientDocument?: ClientDoc;
  // Every accepted command, in seq order: the app replays them from tick 0
  // with the seed to reach the server's state.
  commands: Command[];
  // Reasoning moments already graded in this run.
  graded: string[];
  // REQ-209: whether this scenario offers pacing (a running phase in a
  // clinical or fitness track), and the paces. A run with no logged pace
  // plays at 1x, so a run that began before REQ-209 is unchanged.
  pacing: { eligible: boolean; studyPace: 3; examPace: 1; defaultPace: 3 | 1 };
}

async function runPayload(run: RunRow, cachedHash: string | null, family: SimRow["safety_family"]): Promise<RunPayload> {
  const v = await versionDoc(run.sim_version_id);
  const cmds = await query<{ payload: Command }>(`select payload from sim_run_commands where run_id = $1 order by seq`, [run.id]);
  const graded = await query<{ moment_id: string }>(`select moment_id from sim_run_reasoning where run_id = $1`, [run.id]);
  return {
    run: {
      id: run.id,
      simId: run.sim_id,
      versionId: run.sim_version_id,
      version: v.version,
      status: run.status,
      seed: Number(run.seed),
      leaseEpoch: run.lease_epoch,
      lastSeq: run.last_seq,
      lastTick: run.last_tick,
      engineVersion: run.engine_version,
    },
    clientHash: v.client_hash,
    ...(cachedHash === v.client_hash ? {} : { clientDocument: v.client_document }),
    commands: cmds.map((c) => c.payload),
    graded: graded.map((g) => g.moment_id),
    pacing: pacingFor(v.document, family),
  };
}

// The study pace (3x) is the default only where pacing is offered; everywhere
// else, and for any run that logged no pace, the pace is 1x.
export function pacingFor(doc: Pick<ScenarioDoc, "phases">, family: SimRow["safety_family"]): RunPayload["pacing"] {
  const eligible = pacingEligible(doc, family);
  return { eligible, studyPace: 3, examPace: 1, defaultPace: eligible ? 3 : 1 };
}

function deviceId(v: unknown): string | null {
  return typeof v === "string" && /^[A-Za-z0-9._:-]{1,100}$/.test(v) ? v : null;
}

// POST /api/sims/:id/runs { restart?, deviceId?, cachedHash? }. Without
// restart the open run comes back (a double tap or a second device never
// makes two) and this device takes the lease. restart abandons the open run
// (it stays revealed, so the next finished run is a repeat if the learner
// acted in it, 9.4) and starts a new one on the served version.
export async function startRun(
  userId: string,
  simId: string,
  body: Record<string, unknown> | null,
  caps: SimCaps | null,
  env: Record<string, string | undefined> = process.env
): Promise<RunPayload> {
  const sim = await visibleSim(simId, userId, env);
  if (!sim) throw notFound();
  await requireNotice(sim, userId);
  const restart = body?.restart === true;
  await gateSim(userId, sim, restart ? "start" : "resume", env);
  const device = deviceId(body?.deviceId);
  const cached = typeof body?.cachedHash === "string" ? body.cachedHash : null;
  const run = await withTransaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(hashtext('sim_run:' || $1 || ':' || $2))`, [userId, sim.id]);
    const open = await tx.queryOne<RunRow>(`select * from sim_runs where user_id = $1 and sim_id = $2 and status = 'open' for update`, [userId, sim.id]);
    // REQ-199: a run on a version a person confirmed wrong cannot be scored
    // (finishRun records no attempt for it), so resuming it is a restart on
    // the version served now. A quarantined version's open run continues; a
    // later confirmation voids its attempt (lib/item-quality.ts).
    const condemned = open && !restart ? await versionConfirmedWrong(open.sim_version_id, tx) : false;
    if (open && !restart && !condemned) {
      // REQ-209: a run pinned to a version that needs engine minor 1 or later
      // (it may hold pace/begin/teach/chapter commands an older app cannot
      // replay) is not handed to an app that lacks it. Runs on a minor-0
      // version, every run begun before REQ-209, are handed back as before.
      const needs = await tx.queryOne<VersionNeeds>(`select engine_major, engine_minor, renderer_level, $2::text as screen_type from sim_versions where id = $1`, [open.sim_version_id, sim.screen_type]);
      if (needs && needs.engine_minor >= 1 && !runnable(needs, caps)) throw new SimError(409, "app_update_required", "Update the app to continue this simulation.");
      return (await tx.queryOne<RunRow>(
        `update sim_runs set lease_epoch = lease_epoch + 1, lease_device = $2 where id = $1 returning *`,
        [open.id, device]
      ))!;
    }
    // A new run needs full or sample access (a resume above does not).
    if (!open || condemned) await gateSim(userId, sim, "start", env);
    const served = await servedVersion(sim, caps, env, tx);
    if (!served) throw notFound();
    if (!served.runnable) throw new SimError(409, "app_update_required", "Update the app to open this simulation.");
    if (open) await tx.query(`update sim_runs set status = 'abandoned', ended_at = now() where id = $1`, [open.id]);
    return (await tx.queryOne<RunRow>(
      `insert into sim_runs (user_id, sim_id, sim_version_id, seed, engine_version, lease_device)
       values ($1, $2, $3, $4, $5, $6) returning *`,
      [userId, sim.id, served.version.id, randomInt(0, 2 ** 32), ENGINE_VERSION, device]
    ))!;
  });
  return runPayload(run, cached, sim.safety_family);
}

// The run row for a route on that run, after the sim checks.
async function ownRun(userId: string, runId: string, env: Record<string, string | undefined>): Promise<{ run: RunRow; sim: SimRow }> {
  if (!isUuid(runId)) throw runNotFound();
  const run = await queryOne<RunRow>(`select * from sim_runs where id = $1 and user_id = $2`, [runId, userId]);
  if (!run) throw runNotFound();
  const sim = await visibleSim(run.sim_id, userId, env);
  if (!sim) throw runNotFound();
  await requireNotice(sim, userId);
  return { run, sim };
}

// ---------------------------------------------------------------------------
// Syncing commands (the "step" route) and skipping to a wait
// ---------------------------------------------------------------------------

export interface SyncResult {
  acceptedThrough: number;
  lastTick: number;
  tick: number;
  serverHash: string;
  rejected: { seq: number; reason: string } | null;
  // The run reached an end in the server's replay; call finish for the debrief.
  ended: { reason: string } | null;
  stoppedAt: number | null;
  stoppedBy: string | null;
  waits: WaitInfo[];
  desync: boolean;
  // Only on the skip-wait route: the command the server built.
  command?: Command;
}

interface SyncInput {
  leaseEpoch: number;
  commands: Command[];
  tick: number | null;
  stateHash: string | null;
  skip?: { seq: number; tick: number; timer: string | null; instance: number | null; calm: boolean };
}

function syncInput(body: Record<string, unknown> | null, kind: "commands" | "skip"): SyncInput {
  const b = body ?? {};
  if (!Number.isInteger(b.leaseEpoch)) throw new SimError(400, "bad_request", "leaseEpoch is required");
  if (b.tick !== undefined && b.tick !== null && !(Number.isInteger(b.tick) && (b.tick as number) >= 0)) throw new SimError(400, "bad_request", "tick must be a non-negative integer");
  const stateHash = typeof b.stateHash === "string" && /^[0-9a-f]{16}$/.test(b.stateHash) ? b.stateHash : null;
  if (kind === "skip") {
    if (!Number.isInteger(b.seq) || (b.seq as number) < 1) throw new SimError(400, "bad_request", "seq is required");
    if (!Number.isInteger(b.tick) || (b.tick as number) < 0) throw new SimError(400, "bad_request", "tick is required");
    const timer = typeof b.timer === "string" && /^[a-z][a-zA-Z0-9_]{0,47}$/.test(b.timer) ? b.timer : null;
    const instance = Number.isInteger(b.instance) ? (b.instance as number) : null;
    return { leaseEpoch: b.leaseEpoch as number, commands: [], tick: b.tick as number, stateHash, skip: { seq: b.seq as number, tick: b.tick as number, timer, instance, calm: b.calm === true } };
  }
  const commands = parseCommands(b.commands);
  if (typeof commands === "string") throw new SimError(400, "bad_request", commands);
  return { leaseEpoch: b.leaseEpoch as number, commands, tick: (b.tick as number | undefined) ?? null, stateHash };
}

export async function syncRun(userId: string, runId: string, body: Record<string, unknown> | null, env: Record<string, string | undefined> = process.env): Promise<SyncResult> {
  return sync(userId, runId, syncInput(body, "commands"), env);
}

// POST /api/sims/runs/:runId/skip { leaseEpoch, seq, tick, timer?, instance? }:
// skip to a pending wait (the named one, else the soonest). The server
// builds the skip command from its own replay (the due tick is the server's),
// stores it like any other and returns it, so the app applies the same one.
export async function skipWait(userId: string, runId: string, body: Record<string, unknown> | null, env: Record<string, string | undefined> = process.env): Promise<SyncResult> {
  return sync(userId, runId, syncInput(body, "skip"), env);
}

async function sync(userId: string, runId: string, input: SyncInput, env: Record<string, string | undefined>): Promise<SyncResult> {
  const { sim } = await ownRun(userId, runId, env);
  return withTransaction(async (tx) => {
    const row = await tx.queryOne<RunRow>(`select * from sim_runs where id = $1 and user_id = $2 for update`, [runId, userId]);
    if (!row) throw runNotFound();
    if (row.lease_epoch !== input.leaseEpoch) {
      throw new SimError(409, "lease_lost", "This run continued on another device.", { leaseEpoch: row.lease_epoch });
    }
    // Idempotent resend: a seq already stored must be the same command.
    let incoming = input.commands;
    const resent = incoming.filter((c) => c.seq <= row.last_seq);
    let isResend = resent.length > 0;
    if (resent.length) {
      const stored = await tx.query<{ seq: number; payload: Command }>(
        `select seq, payload from sim_run_commands where run_id = $1 and seq = any($2::int[])`,
        [row.id, resent.map((c) => c.seq)]
      );
      for (const c of resent) {
        const s = stored.find((x) => x.seq === c.seq);
        if (!s || !sameCommand(s.payload, c)) throw new SimError(409, "seq_conflict", `Command ${c.seq} was already received with different content.`);
      }
      incoming = incoming.filter((c) => c.seq > row.last_seq);
    }
    if (input.skip && input.skip.seq <= row.last_seq) {
      const s = await tx.queryOne<{ payload: Command }>(`select payload from sim_run_commands where run_id = $1 and seq = $2`, [row.id, input.skip.seq]);
      if (!s || s.payload.type !== "skip" || s.payload.tick !== input.skip.tick) throw new SimError(409, "seq_conflict", `Command ${input.skip.seq} was already received with different content.`);
      input = { ...input, skip: undefined };
      incoming = [];
      isResend = true;
      // Fall through: report the current state with that stored command.
    }
    if (row.status !== "open") {
      if (incoming.length || input.skip) throw new SimError(409, "run_ended", "This run has ended.");
    }
    if (incoming.length && incoming[0].seq !== row.last_seq + 1) {
      throw new SimError(409, "seq_gap", `Expected command ${row.last_seq + 1} next.`, { lastSeq: row.last_seq });
    }
    if (row.last_seq + incoming.length + (input.skip ? 1 : 0) > SIM_LIMITS.commandsPerRun) {
      throw new SimError(413, "run_too_long", "This run has reached its command limit.");
    }
    // Per-run sync interval (7): a heartbeat at most every 2 s; a sync that
    // carries commands is always allowed.
    const now = Date.now();
    if (!incoming.length && !input.skip && !isResend && row.last_sync_at && now - new Date(row.last_sync_at).getTime() < SIM_LIMITS.heartbeatMinMs) {
      throw new SimError(429, "sync_too_fast", "Syncing too often.");
    }

    const v = await versionDoc(row.sim_version_id, tx);
    const doc = v.document;
    // REQ-209: pace, begin, teach, chapter and the calm flag only where pacing is offered.
    const eligible = pacingEligible(doc, sim.safety_family);
    const refusal = pacingRefusal(incoming, eligible) ?? (input.skip?.calm && !eligible ? "the skip offer is not available in this simulation" : null);
    if (refusal) throw new SimError(400, "pacing_not_available", refusal);
    const cpSeq = row.checkpoint_state?.lastSeq ?? 0;
    const stored = await tx.query<{ payload: Command }>(`select payload from sim_run_commands where run_id = $1 and seq > $2 order by seq`, [row.id, cpSeq]);
    const all = [...stored.map((s) => s.payload), ...incoming];
    const toTick = input.skip ? input.skip.tick : input.tick;
    const r = replayRun({ doc, seed: Number(row.seed), from: row.checkpoint_state, commands: all, toTick });
    const run = r.run;
    let accepted = r.acceptedThrough;
    let rejected = r.rejected;
    let stoppedAt = r.stoppedAt;
    let stoppedBy = r.stoppedBy;
    let built: Command | undefined;

    if (input.skip && !rejected) {
      if (r.unreachable || run.state.tick !== input.skip.tick) {
        throw new SimError(409, "replay_behind", "Sync the run before skipping.", { tick: run.state.tick });
      }
      if (input.skip.seq !== run.lastSeq + 1) throw new SimError(409, "seq_gap", `Expected command ${run.lastSeq + 1} next.`, { lastSeq: run.lastSeq });
      const pending = waits(run);
      const w = pending.find((x) => (input.skip!.timer === null || x.timer === input.skip!.timer) && (input.skip!.instance === null || x.instance === input.skip!.instance));
      if (!w) throw new SimError(409, "no_wait", "There is nothing to skip to right now.");
      // REQ-209: the calm flag is kept only when the engine agrees the offer
      // stood: the same pure rule the app used (engine calmSkip).
      if (input.skip.calm) {
        const offer = calmSkip(run);
        if (!offer || offer.timer !== w.timer || offer.instance !== w.instance) throw new SimError(409, "no_offer", "The skip offer is not available right now.");
      }
      built = { seq: input.skip.seq, tick: input.skip.tick, type: "skip", timer: w.timer, instance: w.instance, to: w.due, ...(input.skip.calm ? { calm: true as const } : {}) };
      const ar = applyCommand(run, built);
      if (!ar.ok) throw new SimError(409, "rejected", ar.reason);
      accepted = run.lastSeq;
      stoppedAt = ar.stoppedAt ?? null;
      stoppedBy = ar.stoppedBy ?? null;
      incoming = [built];
    } else if (input.tick !== null && r.unreachable && !rejected) {
      // A heartbeat past what the clock allows (a stopped, blocked or turns
      // phase): the commands are kept, the tick is not.
      rejected = { seq: run.lastSeq, reason: `tick ${input.tick} is unreachable: ${r.unreachable}` };
    }

    // Speed bound (5.7), on the server's own clock.
    const dt = run.c.dt;
    const wallSeconds = (now - new Date(row.started_at).getTime()) / 1000;
    if (!withinPacedSpeedBound(minWallSeconds(run), wallSeconds)) {
      throw new SimError(409, "too_fast", "The run is ahead of real time. Sync again in a moment.", { lastTick: row.last_tick });
    }

    const keep = incoming.filter((c) => c.seq <= accepted);
    for (const c of keep) {
      await tx.query(
        `insert into sim_run_commands (run_id, seq, tick, type, payload, lease_epoch) values ($1, $2, $3, $4, $5, $6)`,
        [row.id, c.seq, c.tick, c.type, JSON.stringify(c), row.lease_epoch]
      );
    }
    const newRealtime = run.realtimeTicks - row.realtime_ticks;
    // Offline play is judged in wall time: at 3x, 2 minutes of wall time is 6
    // minutes of sim time. Once a run has played at 3x the threshold uses the
    // fastest pace (it can only under-flag, and offline play is recorded, not
    // penalised); a run that never logged 3x is judged exactly as before.
    const offline = (newRealtime * dt) / (run.paceTicks[3] > 0 ? 3 : 1) > SIM_LIMITS.offlineSeconds ? newRealtime : 0;
    const serverHash = stateHash(run.state);
    const desync = input.stateHash !== null && input.tick === run.state.tick && input.stateHash !== serverHash;
    const engineError = run.state.ended?.reason === "engine_error" && row.engine_errors === 0;
    const cp = r.checkpoint;
    await tx.query(
      `update sim_runs set
         last_seq = $2, last_tick = greatest(last_tick, $3), last_sync_at = now(),
         realtime_ticks = greatest(realtime_ticks, $4), skipped_ticks = greatest(skipped_ticks, $5),
         offline_ticks = offline_ticks + $6, revealed = revealed or $7, state_hash = $8,
         desyncs = desyncs + $9, engine_errors = engine_errors + $10,
         checkpoint_tick = coalesce($11, checkpoint_tick), checkpoint_state = coalesce($12::jsonb, checkpoint_state)
       where id = $1`,
      [
        row.id,
        accepted,
        run.state.tick,
        run.realtimeTicks,
        run.skippedTicks,
        offline,
        isRevealed(run),
        serverHash,
        desync ? 1 : 0,
        engineError ? 1 : 0,
        cp ? cp.tick : null,
        cp ? JSON.stringify(cp) : null,
      ]
    );
    return {
      acceptedThrough: accepted,
      lastTick: Math.max(row.last_tick, run.state.tick),
      tick: run.state.tick,
      serverHash,
      rejected,
      ended: run.state.ended ? { reason: run.state.ended.reason } : null,
      stoppedAt,
      stoppedBy,
      waits: waits(run),
      desync,
      ...(built ? { command: built } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Written reasoning (docs/sims.md 10)
// ---------------------------------------------------------------------------

export interface ReasoningResult {
  momentId: string;
  status: "graded" | "grader_failed";
  verdict: "correct" | "partial" | "incorrect" | null;
  feedback: string;
  partScores: { part: string; score: string; comment: string }[];
  fixNext: string | null;
  modelAnswer: string;
  replayed: boolean;
}

interface ReasoningRow {
  run_id: string;
  moment_id: string;
  client_attempt_id: string | null;
  answer: string;
  status: "graded" | "skipped" | "grader_failed";
  verdict: ReasoningResult["verdict"];
  feedback: string | null;
  part_scores: ReasoningResult["partScores"] | null;
  fix_next: string | null;
}

function reasoningShape(row: ReasoningRow, doc: ScenarioDoc, replayed: boolean): ReasoningResult {
  return {
    momentId: row.moment_id,
    status: row.status === "grader_failed" ? "grader_failed" : "graded",
    verdict: row.verdict,
    feedback: row.feedback ?? "",
    partScores: Array.isArray(row.part_scores) ? row.part_scores : [],
    fixNext: row.fix_next,
    modelAnswer: modelAnswerOf(doc.reasoning[row.moment_id]?.parts ?? []),
    replayed,
  };
}

export const SIM_REPLAY_CONFLICT = "This id was already used for a different answer.";

// POST /api/sims/runs/:runId/reasoning { momentId, openedSeq, openedTick, answer, clientAttemptId }.
// The server grades only a moment its own replay shows open at openedTick
// with openedSeq the last applied command; otherwise 409 replay_behind (the
// app syncs first). A resend of a graded id returns the stored result. One
// model call per submission (withGradingClaim), the lab rate limit and the
// daily graded-answer allowance. The grade never changes sim state.
export async function gradeReasoning(
  userId: string,
  runId: string,
  body: Record<string, unknown> | null,
  model?: LabStepModel,
  env: Record<string, string | undefined> = process.env
): Promise<ReasoningResult> {
  const b = body ?? {};
  if (typeof b.momentId !== "string" || !/^[a-z][a-zA-Z0-9_]{0,47}$/.test(b.momentId)) throw new SimError(400, "bad_request", "momentId is required");
  if (!Number.isInteger(b.openedSeq) || (b.openedSeq as number) < 0) throw new SimError(400, "bad_request", "openedSeq is required");
  if (!Number.isInteger(b.openedTick) || (b.openedTick as number) < 0) throw new SimError(400, "bad_request", "openedTick is required");
  if (typeof b.answer !== "string") throw new SimError(400, "bad_request", "answer is required");
  if (b.answer.length > SIM_LIMITS.reasoningMax) throw new SimError(400, "bad_request", `The answer must be at most ${SIM_LIMITS.reasoningMax} characters.`);
  if (hasUnstorableText(b.answer)) throw new SimError(400, "bad_request", "The answer contains characters that can't be stored.");
  const momentId = b.momentId;
  const openedSeq = b.openedSeq as number;
  const openedTick = b.openedTick as number;
  const answer = b.answer;
  const clientAttemptId = validClientAttemptId(b.clientAttemptId);

  const { run, sim } = await ownRun(userId, runId, env);
  const v = await versionDoc(run.sim_version_id);
  const doc = v.document;
  const moment = doc.reasoning[momentId];
  if (!moment) throw new SimError(404, "not_found", "Reasoning moment not found");

  const replay = async (): Promise<ReasoningResult | null> => {
    const row = clientAttemptId
      ? await queryOne<ReasoningRow & { user_id: string }>(`select * from sim_run_reasoning where user_id = $1 and client_attempt_id = $2`, [userId, clientAttemptId])
      : null;
    if (row) {
      if (row.run_id !== run.id || row.moment_id !== momentId || row.answer.trim() !== answer.trim()) throw new SimError(409, "id_conflict", SIM_REPLAY_CONFLICT);
      return reasoningShape(row, doc, true);
    }
    if (clientAttemptId && (await findClientAttempt(userId, clientAttemptId))) throw new SimError(409, "id_conflict", SIM_REPLAY_CONFLICT);
    const done = await queryOne<ReasoningRow>(`select * from sim_run_reasoning where run_id = $1 and moment_id = $2`, [run.id, momentId]);
    if (done) throw new SimError(409, "already_graded", "This reasoning moment was already answered.", { result: reasoningShape(done, doc, true) });
    return null;
  };
  const prior = await replay();
  if (prior) return prior;
  if (run.status !== "open") throw new SimError(409, "run_ended", "This run has ended.");

  // The ordering check (10): replay the commands up to openedSeq, advance to
  // openedTick, and the moment must be open there.
  if (openedSeq > run.last_seq || openedTick > run.last_tick) throw new SimError(409, "replay_behind", "Sync the run before sending the answer.");
  const cmds = await query<{ payload: Command }>(`select payload from sim_run_commands where run_id = $1 and seq <= $2 order by seq`, [run.id, openedSeq]);
  const r = replayRun({ doc, seed: Number(run.seed), from: null, commands: cmds.map((c) => c.payload), toTick: openedTick });
  if (r.rejected || r.run.state.tick !== openedTick || r.run.state.openReasoning !== momentId) {
    throw new SimError(409, "replay_behind", "This reasoning moment is not open at that point of the run.");
  }
  const situation = situationSummary(r.run);

  const gradeAndRecord = async (): Promise<ReasoningResult> => {
    try {
      await consumeRateLimit("lab_grade", userId, LAB_GRADE_LIMIT, { userId });
    } catch (err) {
      if (err instanceof RateLimitError) throw new SimError(429, "rate_limited", err.message);
      throw err;
    }
    const use = await consumeGradedAnswer(userId, () => consumeAllowance(userId, "graded_answer")); // REQ-201
    const ctx = (await coachContextForObjective(sim.objective_id)) ?? undefined;
    const out = await gradeSimReasoning(
      {
        simTitle: sim.title,
        brief: [doc.brief.situation, ...(doc.brief.handover ?? [])].join("\n"),
        situation,
        question: moment.question,
        parts: moment.parts,
        answer,
        family: sim.safety_family,
        ctx,
        userId,
      },
      model
    );
    if (out.failed) await use.release();
    const g = out.graded;
    try {
      // REQ-218 (M3): the run is locked FOR SHARE for the insert and must still
      // be open. finishRun holds the row FOR UPDATE while it scores, so an
      // answer either lands before the finish (and is scored) or is refused;
      // before, one graded while the finish ran was stored against an ended
      // run and the debrief and score disagreed. A refused answer stores
      // nothing, so the graded-answer use is given back.
      const row = await withTransaction(async (tx) => {
        const live = await tx.queryOne<{ status: string }>(`select status from sim_runs where id = $1 for share`, [run.id]);
        if (!live || live.status !== "open") {
          if (!out.failed) await use.release();
          throw new SimError(409, "run_ended", "This run has ended.");
        }
        return tx.queryOne<ReasoningRow>(
          `insert into sim_run_reasoning
             (run_id, moment_id, user_id, opened_tick, opened_seq, client_attempt_id, answer, status, verdict, feedback,
              part_scores, missed_parts, classification, fix_next)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           on conflict (run_id, moment_id) do nothing
           returning *`,
          [
            run.id,
            momentId,
            userId,
            openedTick,
            openedSeq,
            clientAttemptId,
            answer,
            g ? "graded" : "grader_failed",
            g?.verdict ?? null,
            g ? cleanText(g.feedback, 4000) : "The grader could not be reached. This moment is left out of your score.",
            g ? JSON.stringify(g.partScores.map((p) => ({ part: cleanText(p.part, 300), score: p.score, comment: cleanText(p.comment ?? "", 600) }))) : null,
            g ? JSON.stringify(g.missedParts.map((m) => cleanText(m, 300))) : null,
            g ? cleanText(g.classification ?? "", 200) : null,
            g ? cleanText(g.fixNext ?? "", 600) : null,
          ]
          );
      });
      if (!row) {
        const again = await replay();
        if (again) return again;
        throw new SimError(409, "already_graded", "This reasoning moment was already answered.");
      }
      return reasoningShape(row, doc, false);
    } catch (err) {
      const e = err as { code?: string; constraint?: string };
      if (clientAttemptId && e?.code === "23505") {
        const again = await replay();
        if (again) return again;
      }
      throw err;
    }
  };
  return withGradingClaim(userId, clientAttemptId, gradeAndRecord, async () => replay());
}

// ---------------------------------------------------------------------------
// Finishing (the "submit" route) and the debrief (docs/sims.md 9)
// ---------------------------------------------------------------------------

export interface SimDebrief extends DebriefData {
  runId: string;
  simId: string;
  title: string;
  version: number;
  // The learner's reasoning answers with their grades and the model answer.
  reasoningAnswers: { moment: string; question: string; answer: string; status: string; verdict: string | null; feedback: string; modelAnswer: string }[];
  attempt: { id: string; verdict: string; assisted: boolean; assistReason: string | null } | null;
  endReason: string;
}

function transcript(d: DebriefData, answers: SimDebrief["reasoningAnswers"]): string {
  const lines = d.timeline.map((t) => `${t.time} ${t.text}`);
  for (const a of answers) lines.push(`Reasoning (${a.question}): ${a.answer.trim() || "(blank)"}`);
  return lines.join("\n").slice(0, 20_000);
}

// POST /api/sims/runs/:runId/finish { leaseEpoch, tick? }: called when the
// app reaches an end (an ending, or the learner ends early with an `end`
// command already synced). The server replays to the end -- advancing real
// time to `tick` when the ending came with no command -- confirms it, scores
// it, and records ONE attempt (kind 'simtask') for a terminal ending.
// A learner_quit run records nothing for mastery (9.4). Idempotent.
export async function finishRun(userId: string, runId: string, body: Record<string, unknown> | null, env: Record<string, string | undefined> = process.env): Promise<SimDebrief> {
  const b = body ?? {};
  const tick = Number.isInteger(b.tick) && (b.tick as number) >= 0 ? (b.tick as number) : null;
  const { run: first, sim } = await ownRun(userId, runId, env);
  if (first.status !== "open" && first.score) return first.score;
  if (!Number.isInteger(b.leaseEpoch)) throw new SimError(400, "bad_request", "leaseEpoch is required");
  return withTransaction(async (tx) => {
    const row = await tx.queryOne<RunRow>(`select * from sim_runs where id = $1 and user_id = $2 for update`, [runId, userId]);
    if (!row) throw runNotFound();
    if (row.status !== "open" && row.score) return row.score;
    if (row.lease_epoch !== b.leaseEpoch) throw new SimError(409, "lease_lost", "This run continued on another device.", { leaseEpoch: row.lease_epoch });
    const v = await versionDoc(row.sim_version_id, tx);
    const doc = v.document;
    const cmdRows = await tx.query<{ payload: Command; type: string; received_at: string }>(
      `select payload, type, received_at from sim_run_commands where run_id = $1 order by seq`,
      [row.id]
    );
    const r = replayRun({ doc, seed: Number(row.seed), from: null, commands: cmdRows.map((c) => c.payload), toTick: tick, budget: SIM_LIMITS.replayBudget * 3 });
    const run = r.run;
    if (r.rejected) throw new SimError(409, "replay_mismatch", `The server could not replay this run: ${r.rejected.reason}`);
    if (!run.state.ended) throw new SimError(409, "not_ended", "This run has not ended yet.", { tick: run.state.tick });
    const wallSeconds = (Date.now() - new Date(row.started_at).getTime()) / 1000;
    if (!withinPacedSpeedBound(minWallSeconds(run), wallSeconds)) {
      throw new SimError(409, "too_fast", "The run is ahead of real time. Finish again in a moment.");
    }
    const gradedRows = await tx.query<ReasoningRow>(`select * from sim_run_reasoning where run_id = $1`, [row.id]);
    const grades: ReasoningGrade[] = gradedRows.map((g) => ({
      moment: g.moment_id,
      score: g.status === "grader_failed" ? "grader_failed" : g.verdict === "correct" ? "met" : g.verdict === "partial" ? "partial" : "missed",
    }));
    const data = scoreRun(run, { reasoningGrades: grades, pausedSeconds: pausedSeconds(cmdRows) });
    const answers: SimDebrief["reasoningAnswers"] = Object.keys(doc.reasoning).flatMap((id) => {
      const g = gradedRows.find((x) => x.moment_id === id);
      if (!g && !run.state.reasoningOpened.includes(id)) return [];
      return [
        {
          moment: id,
          question: doc.reasoning[id].question,
          answer: g?.answer ?? "",
          status: g?.status ?? "skipped",
          verdict: g?.verdict ?? null,
          feedback: g?.feedback ?? "Not answered: counted as missed.",
          modelAnswer: modelAnswerOf(doc.reasoning[id].parts),
        },
      ];
    });
    const ended = run.state.ended;
    const terminal = ended.reason === "ending" || ended.reason === "time_up";
    let attempt: SimDebrief["attempt"] = null;
    // REQ-199: no attempt from a version a person confirmed wrong.
    if (terminal && data.rating && !(await versionConfirmedWrong(row.sim_version_id, tx))) {
      const verdict = verdictFor(data.rating);
      const missed = data.criteria.filter((c) => c.score === "missed").map((c) => c.label);
      const rec = (await recordAttemptTx(tx, {
        userId,
        unitId: sim.unit_id,
        objectiveId: sim.objective_id,
        kind: "simtask",
        format: "open",
        question: sim.title,
        answer: transcript(data, answers),
        verdict,
        feedback: `${data.headline} Process score ${data.processScore ?? "-"}.`,
        classification: data.outcomeClass ?? null,
        missedParts: missed,
        modelAnswer: doc.scoring.modelReasoning,
        assessmentType: "sim_run",
        simId: sim.id,
        simRunId: row.id,
        partScores: data.criteria.filter((c) => c.score !== "na").map((c) => ({ part: c.label, score: c.score, comment: c.why })),
      })) as { id: string; verdict: string; assisted: boolean; assist_reason: string | null };
      attempt = { id: rec.id, verdict: rec.verdict, assisted: rec.assisted === true, assistReason: rec.assist_reason ?? null };
    }
    const debrief: SimDebrief = {
      ...data,
      runId: row.id,
      simId: sim.id,
      title: sim.title,
      version: v.version,
      reasoningAnswers: answers,
      attempt,
      endReason: ended.reason,
    };
    const status = ended.reason === "learner_quit" ? "abandoned" : "ended";
    await tx.query(
      `update sim_runs set status = $2, ending_id = $3, outcome_class = $4, rating = $5, ended_at = now(), score = $6,
              attempt_id = $7, revealed = revealed or $8, last_tick = greatest(last_tick, $9)
        where id = $1`,
      [row.id, status, data.ending, data.outcomeClass, data.rating, JSON.stringify(debrief), attempt?.id ?? null, isRevealed(run), run.state.tick]
    );
    return debrief;
  });
}

// ---------------------------------------------------------------------------
// "Report a problem" on a sim (REQ-199, migration 067)
// ---------------------------------------------------------------------------

async function versionConfirmedWrong(versionId: string, db: Pick<TxClient, "queryOne"> = { queryOne }): Promise<boolean> {
  const r = await db.queryOne<{ status: string }>(`select status from item_status where item_kind = 'sim' and item_id = $1`, [versionId]);
  return r?.status === "confirmed_wrong";
}

export interface SimReportTarget {
  ref: ItemRef;
  // item_flags.context: what the reviewer needs to reproduce the moment.
  context: Record<string, unknown>;
}

const HASH_RE = /^[A-Za-z0-9:_-]{1,128}$/;

// The sim version a learner is reporting, resolved from a run THEY own (the
// app sends a run id, never a version id or a title that is trusted). The
// tick and state hash the app saw are kept as the learner's view; the
// server's last tick and hash beside them are the record.
export async function simReportTarget(
  userId: string,
  body: { runId?: unknown; tick?: unknown; stateHash?: unknown },
  env: Record<string, string | undefined> = process.env
): Promise<SimReportTarget> {
  requireSimsEnabled(env);
  if (typeof body.runId !== "string") throw new SimError(400, "bad_request", "runId is required");
  const { run, sim } = await ownRun(userId, body.runId, env);
  const v = await queryOne<{ version: number }>(`select version from sim_versions where id = $1`, [run.sim_version_id]);
  const tick = Number.isInteger(body.tick) && (body.tick as number) >= 0 && (body.tick as number) <= 10_000_000 ? (body.tick as number) : null;
  const stateHash = typeof body.stateHash === "string" && HASH_RE.test(body.stateHash) ? body.stateHash : null;
  return {
    ref: { kind: "sim", itemId: run.sim_version_id, objectiveId: sim.objective_id, question: `${sim.title} (version ${v?.version ?? "?"})` },
    context: {
      simId: sim.id,
      versionId: run.sim_version_id,
      version: v?.version ?? null,
      runId: run.id,
      runStatus: run.status,
      tick,
      stateHash,
      serverTick: run.last_tick,
      serverHash: run.state_hash,
      engineVersion: run.engine_version,
    },
  };
}

// GET /api/sims/runs/:runId/debrief: the stored debrief of an ended run.
export async function getDebrief(userId: string, runId: string, env: Record<string, string | undefined> = process.env): Promise<SimDebrief> {
  if (!isUuid(runId)) throw runNotFound();
  const run = await queryOne<RunRow>(`select * from sim_runs where id = $1 and user_id = $2`, [normUuid(runId), userId]);
  if (!run) throw runNotFound();
  const sim = await visibleSim(run.sim_id, userId, env);
  if (!sim) throw runNotFound();
  if (!run.score) throw new SimError(409, "not_ended", "This run has no debrief yet.");
  return run.score;
}
