import { randomInt } from "node:crypto";
import { query, queryOne, withTransaction } from "@/lib/db";
import { examBlueprintForTrack } from "@/lib/exam-blueprint";
import { courseReadiness } from "@/lib/readiness";
import { recordAttemptIdempotent } from "@/lib/grading-service";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import {
  answerText,
  attemptQuestionText,
  examFormatsFromText,
  examQuestionCount,
  gradeItem,
  isComplete,
  itemOrders,
  publicItem,
  responseFromShown,
  responseToShown,
  revealFor,
  type ExamFormat,
  type StoredExamItem,
  type StoredResponse,
} from "@/lib/exam-formats";
import {
  answeredQuestions,
  bankItems,
  copyAnsweredLessonChecks,
  generateForObjective,
  isSeen,
  ITEM_COLUMNS,
  ITEMS_PER_CALL,
  rowToItem,
  type ExamItemRow,
} from "@/lib/exam-items";
import {
  allocateByWeight,
  compareWithReadiness,
  DEADLINE_GRACE_SECONDS,
  DEFAULT_MOCK_QUESTIONS,
  domainBreakdown,
  examPaceSeconds,
  MAX_MOCK_QUESTIONS,
  mockTimer,
  pacingSummary,
  SPRINT_QUESTIONS,
  spreadOverObjectives,
  sprintTimer,
  type GradedItemSummary,
  type ReadinessSnapshot,
} from "@/lib/exam-plan";
import { calibrate } from "@/lib/exam-calibration";

// REQ-109: timed sprints and mock exams.
//
//   createSession   picks the questions (domain-weighted for a mock), from
//                   the shared bank first, generating only what is missing
//   sessionView     what the app shows: questions in this learner's shuffle,
//                   saved answers, flags, the deadline -- never a key
//   saveItem        one answer / flag / confidence / time, before submit
//   submitSession   grades every answer on the server, records each as an
//                   attempt (so mastery, the review log and the
//                   assisted/repeat rules apply exactly as for any answer),
//                   then returns the results
//
// The deadline is the server's: a timed session refuses saves after it
// (plus a short network grace), and a session left open past it is
// submitted the next time it is read.

export type ExamMode = "sprint" | "mock";

export class ExamSessionError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 409 = 400
  ) {
    super(message);
    this.name = "ExamSessionError";
  }
}

// How many objectives one session may ask the model about (each call writes
// up to ITEMS_PER_CALL items into the shared bank). A course with an empty
// bank fills over a few mocks rather than one very slow start.
export const MAX_GENERATIONS: Record<ExamMode, number> = { sprint: 4, mock: 12 };
const GENERATION_CONCURRENCY = 4;
// Per learner, per hour, so one account can't run up model cost.
export const GENERATION_RATE = { max: 40, windowMinutes: 60 };
// Multiple choice is most of every exam; the other formats share the rest.
const FORMAT_SHARE: Record<ExamFormat, number> = { multiple_choice: 2, multiple_response: 1, ordering: 1, matching: 1 };

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// What a course's exam looks like to this feature
// ---------------------------------------------------------------------------

export interface ExamProfile {
  examCode: string | null;
  credentialName: string | null;
  formats: ExamFormat[];
  exhibits: boolean;
  questionCount: number | null; // the vendor's, when published
  durationMinutes: number | null; // the vendor's, when published
  mockQuestions: number; // what a mock here will have
  secondsPerQuestion: number | null;
  questionFormatText: string | null;
}

export async function examProfile(trackId: string): Promise<ExamProfile> {
  const bp = await examBlueprintForTrack(trackId);
  const { formats, exhibits } = examFormatsFromText(bp?.questionFormat ?? null);
  const count = examQuestionCount(bp?.questionFormat ?? null);
  const duration = bp?.durationMinutes ?? null;
  return {
    examCode: bp?.examCode ?? null,
    credentialName: bp?.credentialName ?? null,
    formats,
    exhibits,
    questionCount: count,
    durationMinutes: duration,
    mockQuestions: Math.min(count ?? DEFAULT_MOCK_QUESTIONS, MAX_MOCK_QUESTIONS),
    secondsPerQuestion: examPaceSeconds(duration, count),
    questionFormatText: bp?.questionFormat ?? null,
  };
}

// ---------------------------------------------------------------------------
// Building a session
// ---------------------------------------------------------------------------

interface ActiveObjective {
  id: string;
  unit_id: string;
  unit_weight: number | null;
  studied: boolean;
}

async function activeObjectives(trackId: string, userId: string): Promise<ActiveObjective[]> {
  const rows = await query<{ id: string; unit_id: string; unit_weight: string | number | null; studied: boolean }>(
    `select o.id, o.unit_id, cu.weight as unit_weight,
            exists (select 1 from attempts a where a.user_id = $2 and a.objective_id = o.id) as studied
       from objectives o
       join course_units cu on cu.id = o.unit_id
      where cu.track_id = $1
        and (cu.retired_at is null or cu.retired_at > now())
        and (o.retired_at is null or o.retired_at > now())
      order by cu.sort_order, o.sort_order`,
    [trackId, userId]
  );
  return rows.map((r) => ({ ...r, unit_weight: r.unit_weight == null ? null : Number(r.unit_weight) }));
}

// Which objective each question slot is for.
export function planSlots(mode: ExamMode, objectives: ActiveObjective[], total: number): ActiveObjective[] {
  const byUnit = new Map<string, ActiveObjective[]>();
  for (const o of objectives) byUnit.set(o.unit_id, [...(byUnit.get(o.unit_id) ?? []), o]);
  if (mode === "mock") {
    const alloc = allocateByWeight(
      [...byUnit.entries()].map(([unitId, objs]) => ({ unitId, weight: objs[0].unit_weight, objectives: objs.length })),
      total
    );
    const slots: ActiveObjective[] = [];
    for (const [unitId, n] of alloc) slots.push(...spreadOverObjectives(byUnit.get(unitId)!, n, shuffle));
    return shuffle(slots);
  }
  // Sprint: mixed across units, from what the learner has studied when
  // there is enough of it (interleaving look-alike topics), else the course.
  const studied = objectives.filter((o) => o.studied);
  const pool = studied.length >= 3 ? studied : objectives;
  const units = shuffle([...new Set(pool.map((o) => o.unit_id))]).map((u) => shuffle(pool.filter((o) => o.unit_id === u)));
  const slots: ActiveObjective[] = [];
  for (let round = 0; slots.length < total && units.length; round++) {
    let added = false;
    for (const list of units) {
      if (slots.length >= total) break;
      if (round < list.length) {
        slots.push(list[round]);
        added = true;
      }
    }
    if (!added) {
      // Fewer objectives than questions: go round again.
      for (const list of units) if (slots.length < total) slots.push(list[round % list.length]);
    }
  }
  return slots;
}

interface FillState {
  chosen: (ExamItemRow | null)[];
  used: Set<string>;
  formatCount: Map<ExamFormat, number>;
}

function fill(
  slots: ActiveObjective[],
  state: FillState,
  pool: ExamItemRow[],
  answered: Set<string>,
  allowSeen: boolean,
  // Second pass: any objective of the slot's unit, so the domain still gets
  // its share when one objective has run out of items.
  sameUnit = false
): number {
  let placed = 0;
  const unitOf = new Map(slots.map((s) => [s.id, s.unit_id]));
  const byKey = new Map<string, ExamItemRow[]>();
  for (const r of shuffle(pool)) {
    const key = sameUnit ? unitOf.get(r.objective_id) ?? "" : r.objective_id;
    byKey.set(key, [...(byKey.get(key) ?? []), r]);
  }
  slots.forEach((slot, i) => {
    if (state.chosen[i]) return;
    const candidates = (byKey.get(sameUnit ? slot.unit_id : slot.id) ?? []).filter(
      (r) => !state.used.has(r.id) && (allowSeen || !isSeen(rowToItem(r), answered))
    );
    if (!candidates.length) return;
    // Spread formats: the one furthest below its share goes next.
    const score = (f: ExamFormat) => (state.formatCount.get(f) ?? 0) / FORMAT_SHARE[f];
    const best = candidates.reduce((a, b) => (score(b.item_format) < score(a.item_format) ? b : a));
    state.chosen[i] = best;
    state.used.add(best.id);
    state.formatCount.set(best.item_format, (state.formatCount.get(best.item_format) ?? 0) + 1);
    placed++;
  });
  return placed;
}

export function generationFormats(allowed: ExamFormat[], n = ITEMS_PER_CALL): ExamFormat[] {
  return Array.from({ length: n }, (_, i) => allowed[i % allowed.length]);
}

export interface Preparation {
  requested: number;
  built: number;
  fresh: number; // items this learner hasn't answered before
  repeats: number; // items they have (reduced credit)
  generatedCalls: number;
  generationFailed: boolean;
}

async function runLimited<T>(tasks: (() => Promise<T>)[], limit: number): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, async () => {
      while (next < tasks.length) {
        const i = next++;
        try {
          results[i] = { status: "fulfilled", value: await tasks[i]() };
        } catch (reason) {
          results[i] = { status: "rejected", reason };
        }
      }
    })
  );
  return results;
}

export async function createSession(opts: {
  userId: string;
  trackId: string;
  mode: ExamMode;
  timed: boolean;
  clientSessionId?: string | null;
  // Tests and offline use: never call the model.
  allowGeneration?: boolean;
}) {
  const { userId, trackId, mode } = opts;
  if (opts.clientSessionId) {
    const prior = await queryOne<{ id: string }>(
      `select id from exam_sessions where user_id = $1 and client_session_id = $2`,
      [userId, opts.clientSessionId]
    );
    if (prior) return { sessionId: prior.id, preparation: null };
  }

  const profile = await examProfile(trackId);
  const objectives = await activeObjectives(trackId, userId);
  if (!objectives.length) throw new ExamSessionError("This course has no objectives to practice yet.", 400);
  const total = mode === "sprint" ? SPRINT_QUESTIONS : profile.mockQuestions;
  const slots = planSlots(mode, objectives, total);
  const objectiveIds = [...new Set(slots.map((s) => s.id))];

  const answered = await answeredQuestions(userId, objectiveIds);
  const state: FillState = { chosen: new Array(slots.length).fill(null), used: new Set(), formatCount: new Map() };
  let pool = await bankItems(userId, objectiveIds, profile.formats);
  fill(slots, state, pool, answered, false);

  // Generate for objectives that still have an empty slot (shared bank).
  let generatedCalls = 0;
  let generationFailed = false;
  // Calls needed per objective: one per ITEMS_PER_CALL empty slots, made in
  // sequence for the same objective so each call sees (and avoids) what the
  // previous one wrote. Capped per session by MAX_GENERATIONS.
  const emptyBy = new Map<string, number>();
  slots.forEach((s, i) => {
    if (!state.chosen[i]) emptyBy.set(s.id, (emptyBy.get(s.id) ?? 0) + 1);
  });
  const missing = [...emptyBy.entries()].map(([id, n]) => ({ id, calls: Math.ceil(n / ITEMS_PER_CALL) }));
  if (missing.length && opts.allowGeneration !== false) {
    // Per-learner budget (auth_events, as lib/auth/rateLimit.ts counts it):
    // past it the session is built from what the bank already has.
    const row = await queryOne<{ n: number }>(
      `select count(*)::int as n from auth_events where event_type = 'exam_generate' and identifier = $1
          and created_at > now() - ($2 || ' minutes')::interval`,
      [userId.toLowerCase(), String(GENERATION_RATE.windowMinutes)]
    );
    let budget = Math.min(MAX_GENERATIONS[mode], Math.max(0, GENERATION_RATE.max - (row?.n ?? 0)));
    const todo: { id: string; calls: number }[] = [];
    // First one call for every objective, then extra calls, so a tight
    // budget still covers the whole blueprint.
    for (const m of missing) if (budget > 0) (todo.push({ id: m.id, calls: 1 }), budget--);
    for (const t of todo) {
      const extra = Math.min(missing.find((m) => m.id === t.id)!.calls - 1, budget);
      t.calls += extra;
      budget -= extra;
    }
    let madeCalls = 0;
    const results = await runLimited(
      todo.map((t) => async () => {
        for (let c = 0; c < t.calls; c++) {
          // REQ-098 / FAIL-230: count-and-record atomically per call. The
          // budget above is only a plan; two sessions started at once both
          // read it before either records, so the cap is enforced here.
          try {
            await consumeRateLimit("exam_generate", userId, GENERATION_RATE, { userId });
          } catch (err) {
            if (err instanceof RateLimitError) return;
            throw err;
          }
          madeCalls++;
          await generateForObjective({
            objectiveId: t.id,
            formats: generationFormats(profile.formats),
            exhibits: profile.exhibits,
            allowed: profile.formats,
            userId,
          });
        }
      }),
      GENERATION_CONCURRENCY
    );
    generatedCalls = madeCalls;
    generationFailed = results.some((r) => r.status === "rejected");
    if (generationFailed) {
      const first = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
      console.warn(`[exam-sessions] item generation failed: ${(first.reason as Error)?.message ?? first.reason}`);
    }
    pool = await bankItems(userId, objectiveIds, profile.formats);
    fill(slots, state, pool, answered, false);
  }
  fill(slots, state, pool, answered, false, true);
  const fresh = state.chosen.filter(Boolean).length;

  // Still short: reuse items this learner has seen, including the lesson
  // checks they answered (copied into the bank). Recorded as repeats.
  if (fresh < slots.length) {
    if (profile.formats.includes("multiple_choice")) {
      await copyAnsweredLessonChecks(userId, objectiveIds);
      pool = await bankItems(userId, objectiveIds, profile.formats);
    }
    fill(slots, state, pool, answered, true);
    fill(slots, state, pool, answered, true, true);
  }

  const picked = slots.map((s, i) => ({ slot: s, item: state.chosen[i] })).filter((x) => x.item) as {
    slot: ActiveObjective;
    item: ExamItemRow;
  }[];
  if (!picked.length) {
    throw new ExamSessionError(
      generationFailed
        ? "Practice questions for this course couldn't be prepared just now. Please try again in a few minutes."
        : "There are no practice questions for this course yet. Please try again in a few minutes.",
      409
    );
  }

  const timer =
    mode === "sprint"
      ? sprintTimer({ timed: opts.timed, durationMinutes: profile.durationMinutes, questionCount: profile.questionCount })
      : mockTimer({
          timed: opts.timed,
          durationMinutes: profile.durationMinutes,
          examQuestions: profile.questionCount,
          mockQuestions: picked.length,
        });
  const r = await courseReadiness(trackId, userId);
  const snapshot: ReadinessSnapshot = {
    status: r.status,
    readinessPercent: r.readinessPercent,
    coveragePercent: r.coveragePercent,
    accuracyPercent: r.accuracyPercent,
  };

  const sessionId = await withTransaction(async (tx) => {
    // One open session per mode and course: starting a new one closes the
    // old one without grading it (nothing in it counts).
    await tx.query(
      `update exam_sessions set status = 'abandoned'
        where user_id = $1 and track_id = $2 and mode = $3 and status = 'in_progress'`,
      [userId, trackId, mode]
    );
    const s = await tx.queryOne<{ id: string }>(
      `insert into exam_sessions (user_id, track_id, mode, time_limit_seconds, exam_duration_minutes, exam_question_count,
                                  deadline_at, readiness_before, client_session_id)
       values ($1, $2, $3, $4, $5, $6, case when $4::int is null then null else now() + make_interval(secs => $4::int) end,
               $7, $8)
       returning id`,
      [
        userId,
        trackId,
        mode,
        timer.timeLimitSeconds,
        profile.durationMinutes,
        profile.questionCount,
        JSON.stringify(snapshot),
        opts.clientSessionId ?? null,
      ]
    );
    for (let i = 0; i < picked.length; i++) {
      await tx.query(
        `insert into exam_session_items (session_id, position, item_id, objective_id, unit_id) values ($1, $2, $3, $4, $5)`,
        [s!.id, i, picked[i].item.id, picked[i].item.objective_id, picked[i].slot.unit_id]
      );
    }
    return s!.id;
  });

  const repeats = picked.filter((p) => isSeen(rowToItem(p.item), answered)).length;
  const preparation: Preparation = {
    requested: total,
    built: picked.length,
    fresh: picked.length - repeats,
    repeats,
    generatedCalls,
    generationFailed,
  };
  return { sessionId, preparation };
}

// ---------------------------------------------------------------------------
// Reading a session
// ---------------------------------------------------------------------------

interface SessionRow {
  id: string;
  user_id: string;
  track_id: string;
  mode: ExamMode;
  status: "in_progress" | "submitted" | "abandoned";
  time_limit_seconds: number | null;
  exam_duration_minutes: number | null;
  exam_question_count: number | null;
  started_at: Date;
  deadline_at: Date | null;
  submitted_at: Date | null;
  readiness_before: ReadinessSnapshot | null;
}

interface SessionItemRow extends ExamItemRow {
  position: number;
  unit_id: string;
  unit_title: string;
  unit_weight: string | number | null;
  response: StoredResponse | null;
  flagged: boolean;
  confidence: number | null;
  time_spent_ms: number;
  save_seq: string | number;
  verdict: "correct" | "partial" | "incorrect" | null;
  credited: boolean | null;
  partial_score: string | number | null;
  attempt_id: string | null;
  assist_reason: string | null;
}

async function loadSession(sessionId: string, userId: string): Promise<SessionRow> {
  const s = await queryOne<SessionRow>(`select * from exam_sessions where id = $1 and user_id = $2`, [sessionId, userId]);
  if (!s) throw new ExamSessionError("Session not found", 404);
  return s;
}

async function loadItems(sessionId: string): Promise<SessionItemRow[]> {
  return query<SessionItemRow>(
    `select si.position, si.unit_id, cu.title as unit_title, cu.weight as unit_weight,
            si.response, si.flagged, si.confidence, si.time_spent_ms, si.save_seq, si.verdict, si.credited, si.partial_score,
            si.attempt_id, a.assist_reason,
            ${ITEM_COLUMNS.split(", ").map((c) => `i.${c}`).join(", ")}
       from exam_session_items si
       join exam_items i on i.id = si.item_id
       join course_units cu on cu.id = si.unit_id
       left join attempts a on a.id = si.attempt_id
      where si.session_id = $1
      order by si.position`,
    [sessionId]
  );
}

const pastDeadline = (s: SessionRow, now = Date.now()) =>
  s.deadline_at != null && now > new Date(s.deadline_at).getTime() + DEADLINE_GRACE_SECONDS * 1000;

export async function sessionView(sessionId: string, userId: string) {
  let s = await loadSession(sessionId, userId);
  if (s.status === "in_progress" && pastDeadline(s)) {
    await submitSession(sessionId, userId);
    s = await loadSession(sessionId, userId);
  }
  const rows = await loadItems(sessionId);
  const submitted = s.status === "submitted";
  const items = rows.map((r) => {
    const item = rowToItem(r);
    const orders = itemOrders(userId, item);
    return {
      position: r.position,
      unitTitle: r.unit_title,
      ...publicItem(item, orders),
      response: responseToShown(item, orders, r.response),
      answered: isComplete(item, r.response),
      flagged: r.flagged,
      confidence: r.confidence,
      timeSpentMs: r.time_spent_ms,
      // REQ-113: the last save number applied; the app numbers on from it.
      saveSeq: Number(r.save_seq ?? 0),
      // Only once graded: the verdict, the key and the explanation.
      ...(submitted
        ? {
            verdict: r.verdict,
            credited: r.credited === true,
            partialScore: r.partial_score == null ? null : Number(r.partial_score),
            repeat: r.assist_reason === "repeat",
            counted: r.attempt_id != null,
            ...revealFor(item, orders),
          }
        : {}),
    };
  });
  return {
    session: {
      id: s.id,
      trackId: s.track_id,
      mode: s.mode,
      status: s.status,
      timeLimitSeconds: s.time_limit_seconds,
      startedAt: new Date(s.started_at).toISOString(),
      deadlineAt: s.deadline_at ? new Date(s.deadline_at).toISOString() : null,
      submittedAt: s.submitted_at ? new Date(s.submitted_at).toISOString() : null,
      serverNow: new Date().toISOString(),
    },
    items,
    results: submitted ? results(s, rows) : null,
  };
}

function results(s: SessionRow, rows: SessionItemRow[]) {
  const summaries: GradedItemSummary[] = rows.map((r) => ({
    unitId: r.unit_id,
    unitTitle: r.unit_title,
    unitWeight: r.unit_weight == null ? null : Number(r.unit_weight),
    credited: r.credited === true,
    partial: r.partial_score == null ? 0 : Number(r.partial_score),
    answered: r.response != null && isComplete(rowToItem(r), r.response),
    flagged: r.flagged,
    timeSpentMs: r.time_spent_ms,
  }));
  const correct = summaries.filter((x) => x.credited).length;
  const n = summaries.length;
  const end = s.submitted_at ? new Date(s.submitted_at).getTime() : Date.now();
  let used = Math.max(0, Math.round((end - new Date(s.started_at).getTime()) / 1000));
  if (s.time_limit_seconds) used = Math.min(used, s.time_limit_seconds);
  const target = examPaceSeconds(s.exam_duration_minutes, s.exam_question_count);
  const counted = rows.filter((r) => r.attempt_id).length;
  const repeats = rows.filter((r) => r.assist_reason === "repeat").length;
  return {
    correct,
    total: n,
    percent: n ? Math.round((correct / n) * 100) : 0,
    // Information only: the share of each item right, averaged. The score
    // above is all-or-nothing per item, as the vendors score.
    partialPercent: n ? Math.round((summaries.reduce((a, x) => a + x.partial, 0) / n) * 100) : 0,
    domains: domainBreakdown(summaries),
    pacing: pacingSummary(summaries, { usedSeconds: used, timeLimitSeconds: s.time_limit_seconds, targetSeconds: target }),
    readiness: s.mode === "mock" ? compareWithReadiness(correct, n, s.readiness_before) : null,
    calibration: calibrate(rows.map((r) => ({ confidence: r.confidence, correct: r.credited === true }))),
    evidence: {
      counted,
      repeats,
      line:
        counted === 0
          ? "Nothing from this session was answered, so nothing was added to your mastery."
          : `${counted} answer${counted === 1 ? "" : "s"} now count toward your mastery${
              repeats ? `; ${repeats} ${repeats === 1 ? "was a question" : "were questions"} you'd seen before, so ${repeats === 1 ? "it counts" : "they count"} for less` : ""
            }. Questions left blank don't count either way.`,
    },
  };
}

// ---------------------------------------------------------------------------
// Saving one answer
// ---------------------------------------------------------------------------

const MAX_ITEM_MS = 4 * 60 * 60 * 1000;

export async function saveItem(
  sessionId: string,
  userId: string,
  position: number,
  body: { response?: unknown; flagged?: unknown; confidence?: unknown; timeSpentMs?: unknown; seq?: unknown }
): Promise<{ saved: boolean; stale?: boolean; seq?: number }> {
  // REQ-113 (Audit 3 mobile H1, migration 047): the app numbers its saves per
  // question. A save numbered at or below the last one applied arrived late
  // (out of order, or a retry of a save the app had already given up on); a
  // newer save already won, so it is ignored, not an error. No number (an
  // older app) is applied as before.
  let seq: number | null = null;
  if (body.seq !== undefined && body.seq !== null) {
    if (!Number.isSafeInteger(body.seq) || (body.seq as number) < 1) throw new ExamSessionError("seq must be a positive whole number", 400);
    seq = body.seq as number;
  }
  const s = await loadSession(sessionId, userId);
  if (s.status !== "in_progress") throw new ExamSessionError("This session has already ended.", 409);
  if (pastDeadline(s)) {
    await submitSession(sessionId, userId);
    throw new ExamSessionError("Time is up: this session has been submitted with the answers saved before the deadline.", 409);
  }
  const row = await queryOne<ExamItemRow & { response: StoredResponse | null }>(
    `select si.response, ${ITEM_COLUMNS.split(", ").map((c) => `i.${c}`).join(", ")}
       from exam_session_items si join exam_items i on i.id = si.item_id
      where si.session_id = $1 and si.position = $2`,
    [sessionId, position]
  );
  if (!row) throw new ExamSessionError("No such question in this session", 404);
  const item = rowToItem(row);

  const sets: string[] = [];
  const params: unknown[] = [sessionId, position];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    sets.push(sql.replace("?", `$${params.length}`));
  };
  if (body.response !== undefined) {
    if (body.response === null) {
      add("response = ?", null);
      sets.push("answered_at = null");
    } else {
      const stored = responseFromShown(item, itemOrders(userId, item), body.response);
      if (typeof stored === "string") throw new ExamSessionError(stored, 400);
      add("response = ?", JSON.stringify(stored));
      sets.push("answered_at = now()");
    }
  }
  if (body.flagged !== undefined) {
    if (typeof body.flagged !== "boolean") throw new ExamSessionError("flagged must be true or false", 400);
    add("flagged = ?", body.flagged);
  }
  if (body.confidence !== undefined) {
    const c = body.confidence;
    if (c !== null && !(Number.isInteger(c) && (c as number) >= 1 && (c as number) <= 5)) {
      throw new ExamSessionError("confidence must be 1-5 or null", 400);
    }
    add("confidence = ?", c);
  }
  if (body.timeSpentMs !== undefined) {
    const t = body.timeSpentMs;
    if (!Number.isFinite(t) || (t as number) < 0) throw new ExamSessionError("timeSpentMs must be a non-negative number", 400);
    // The app reports the item's running total; never let it go down or past
    // the session's limit.
    const cap = s.time_limit_seconds ? s.time_limit_seconds * 1000 : MAX_ITEM_MS;
    add("time_spent_ms = greatest(time_spent_ms, ?::int)", Math.min(Math.round(t as number), cap));
  }
  if (!sets.length) throw new ExamSessionError("Nothing to save", 400);
  let seqCheck = "";
  if (seq !== null) {
    params.push(seq);
    sets.push(`save_seq = $${params.length}`);
    seqCheck = ` and si.save_seq < $${params.length}`;
  }
  // The status check is repeated in the UPDATE so a save racing a submit
  // can't change an answer after it was graded; the sequence check in the
  // same statement so two saves of one question can't both win.
  const updated = await queryOne<{ position: number }>(
    `update exam_session_items si set ${sets.join(", ")}
       from exam_sessions s
      where si.session_id = $1 and si.position = $2 and s.id = si.session_id and s.status = 'in_progress'${seqCheck}
      returning si.position`,
    params
  );
  if (!updated) {
    if (seq !== null) {
      const still = await queryOne<{ status: string }>(`select status from exam_sessions where id = $1`, [sessionId]);
      if (still?.status === "in_progress") return { saved: false, stale: true, seq };
    }
    throw new ExamSessionError("This session has already ended.", 409);
  }
  return seq !== null ? { saved: true, seq } : { saved: true };
}

// ---------------------------------------------------------------------------
// Submitting
// ---------------------------------------------------------------------------

export async function submitSession(sessionId: string, userId: string) {
  const s = await loadSession(sessionId, userId);
  if (s.status === "abandoned") throw new ExamSessionError("This session was replaced by a newer one.", 409);
  if (s.status === "submitted") return;
  const rows = await loadItems(sessionId);
  const graded: { position: number; verdict: string; credited: boolean; partial: number; attemptId: string | null }[] = [];
  for (const r of rows) {
    const item: StoredExamItem = rowToItem(r);
    const g = gradeItem(item, r.response);
    let attemptId: string | null = null;
    // A blank is wrong for the score but is no evidence about the learner
    // (often the clock ran out), so only answered items become attempts.
    if (r.response != null && hasAnyAnswer(r.response)) {
      const lead = g.verdict === "correct" ? "That's right." : g.verdict === "partial" ? "Partly right." : "Not quite.";
      const { attempt, prior } = await recordAttemptIdempotent({
        userId,
        unitId: r.unit_id,
        objectiveId: r.objective_id,
        kind: "quiz",
        stage: s.mode,
        format: "mc",
        question: attemptQuestionText(item),
        answer: answerText(item, r.response),
        verdict: g.verdict,
        feedback: `${lead} ${item.explanation}`.trim(),
        classification: "none",
        confidence: r.confidence,
        clientAttemptId: `exam:${sessionId}:${r.position}`,
        assessmentType: item.format,
        repeatAnySetting: true,
      });
      attemptId = (attempt?.id ?? (prior?.attempt as { id?: string } | undefined)?.id ?? null) as string | null;
    }
    graded.push({ position: r.position, verdict: g.verdict, credited: g.credited, partial: g.partial, attemptId });
  }
  await withTransaction(async (tx) => {
    const locked = await tx.queryOne<{ status: string }>(
      `select status from exam_sessions where id = $1 and user_id = $2 for update`,
      [sessionId, userId]
    );
    if (!locked || locked.status !== "in_progress") return;
    for (const g of graded) {
      await tx.query(
        `update exam_session_items set verdict = $3, credited = $4, partial_score = $5, attempt_id = $6
          where session_id = $1 and position = $2`,
        [sessionId, g.position, g.verdict, g.credited, g.partial, g.attemptId]
      );
    }
    await tx.query(`update exam_sessions set status = 'submitted', submitted_at = now() where id = $1`, [sessionId]);
  });
}

function hasAnyAnswer(r: StoredResponse): boolean {
  return (
    r.choice != null ||
    (r.choices?.length ?? 0) > 0 ||
    (r.order?.length ?? 0) > 0 ||
    (r.matches?.some((m) => m != null) ?? false)
  );
}

// Recent sessions on a course, for the start screen.
export async function listSessions(userId: string, trackId: string) {
  const rows = await query<{
    id: string;
    mode: ExamMode;
    status: string;
    started_at: Date;
    submitted_at: Date | null;
    deadline_at: Date | null;
    total: number;
    correct: number;
  }>(
    `select s.id, s.mode, s.status, s.started_at, s.submitted_at, s.deadline_at,
            (select count(*)::int from exam_session_items si where si.session_id = s.id) as total,
            (select count(*)::int from exam_session_items si where si.session_id = s.id and si.credited) as correct
       from exam_sessions s
      where s.user_id = $1 and s.track_id = $2 and s.status <> 'abandoned'
      order by s.started_at desc
      limit 20`,
    [userId, trackId]
  );
  return rows.map((r) => ({
    id: r.id,
    mode: r.mode,
    status: r.status,
    startedAt: new Date(r.started_at).toISOString(),
    submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
    deadlineAt: r.deadline_at ? new Date(r.deadline_at).toISOString() : null,
    total: r.total,
    correct: r.status === "submitted" ? r.correct : null,
  }));
}
