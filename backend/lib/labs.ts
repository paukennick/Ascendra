import { query, queryOne, withTransaction } from "@/lib/db";
import { isActive } from "@/lib/progress-sql";
import { servableSql } from "@/lib/item-quality";
import type { Feature } from "@/lib/billing-config";
import { hasFeature } from "@/lib/entitlements";
import { labDisclaimerFor, type LabDisclaimer } from "@/lib/lab-disclaimer";
import type { LabSafetyFamily } from "@/lib/lab-grading";
import { recordAttemptTx, findClientAttempt, isDuplicateClientAttempt } from "@/lib/grading-service";
import { cleanText, hasUnstorableText } from "@/lib/text-input";
import {
  LAB_ANSWER_TOTAL_MAX,
  LAB_PART_MAX,
  runSummary,
  runVerdict,
  type LabRubricPart,
  type LabStepGraded,
  type LabStepText,
} from "@/lib/lab-grading";

// REQ-123: verifiable labs (migration 050). The store, the learner-facing
// shapes and the rules that do not need a model. Grading is
// lib/lab-grading.ts; the routes are app/api/labs/**.
//
// What a learner sees of a lab:
//   - the brief and the steps up to the one they are on. A case's later
//     steps are not sent before the earlier ones are graded: their text
//     moves the story on and could give away an earlier answer.
//   - the rubric part LABELS of the current step (one answer field each),
//     and the criteria and reference answer of a part only after that step
//     is graded.
//
// Which labs are served: not retired, not pulled by "Report a problem"
// (item_status), not rejected, and either approved by an expert or still
// waiting for review -- the latter unless LABS_SERVE_UNREVIEWED is set off.
// REQ-125 (Nick, 2026-11-07): every lab is available now, in every subject,
// each with the lab disclaimer (lib/lab-disclaimer.ts) and, until approved,
// the "Awaiting expert review" badge (docs/labs.md, "Serving").

// The single feature key for tier gating, shared with the self-reported
// CompTIA labs (lib/billing-config.ts FEATURES.labs). `satisfies Feature`
// makes a key the billing config doesn't know a compile error (FAIL-510).
export const LABS_FEATURE = "labs" as const satisfies Feature;

export type { LabKind, ReviewStatus, LabContent } from "@/lib/lab-content";
export { LAB_LIMITS, labContentProblems, labContentHash } from "@/lib/lab-content";
import type { LabKind, ReviewStatus } from "@/lib/lab-content";

export interface LabRow {
  id: string;
  objective_id: string;
  slug: string;
  kind: LabKind;
  title: string;
  brief: string;
  steps: LabStepText[];
  rubric: { parts: LabRubricPart[] }[];
  safety_note: string | null;
  sources: string[];
  source: "authored" | "generated";
  review_status: ReviewStatus;
  unit_id: string;
  track_id: string;
  objective_title: string;
  // REQ-125: clinical / fitness / general, from the course's category (the
  // same rule as lib/lab-grading.ts labSafetyFamily), for the disclaimer.
  safety_family: LabSafetyFamily;
}

export class LabError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 429,
    message: string
  ) {
    super(message);
    this.name = "LabError";
  }
}

// Which review statuses are served. Approved always; rejected never;
// needs_expert_review by default (REQ-125, Nick 2026-11-07: "for now we can
// make the labs available"), in every subject family. This reverses
// REQ-124 decision 11, which never served unreviewed clinical and fitness
// labs; the stronger clinical/fitness disclaimer and its one-time
// acknowledgement (lib/lab-disclaimer.ts) stand in its place.
// LABS_SERVE_UNREVIEWED=off (or 0 / false / no) turns unreviewed labs off
// again everywhere, without a deploy of the app.
export function servedReviewStatuses(env: Record<string, string | undefined> = process.env): ReviewStatus[] {
  const v = (env.LABS_SERVE_UNREVIEWED ?? "").trim().toLowerCase();
  const off = v === "off" || v === "0" || v === "false" || v === "no";
  return off ? ["approved"] : ["approved", "needs_expert_review"];
}

// The subject family of a course for the lab disclaimer: the course
// taxonomy's healthcare-* categories are clinical, health-fitness is
// fitness, everything else general -- the rule lib/lab-grading.ts
// labSafetyFamily applies to the coach context's category slug.
// `track` is the alias of subject_tracks in the calling query.
export function labFamilySql(track: string): string {
  return `coalesce((select case when ec.slug like 'healthcare%' then 'clinical' when ec.slug = 'health-fitness' then 'fitness' end
                      from education_subcategories esc join education_categories ec on ec.id = esc.category_id
                     where esc.id = ${track}.subcategory_id), 'general')`;
}

const SERVABLE = (alias: string) =>
  `${alias}.retired_at is null and ${servableSql("lab", `${alias}.id`)}
   and (${alias}.review_status = 'approved' or ${alias}.review_status = any($REVIEW::text[]))`;
function servable(alias: string, paramIndex: number): string {
  return SERVABLE(alias).replace("$REVIEW", `$${paramIndex}`);
}

// ---------------------------------------------------------------------------
// Tier access (Nick, 2026-11-07, decision 10)
// ---------------------------------------------------------------------------
//
// Labs are Pro. Free and Plus get ONE sample lab per course: the first
// approved build or case lab of the course, in course order (unit, then
// objective, then kind and title -- the order the labs list shows). An
// unreviewed lab is never the sample, even where LABS_SERVE_UNREVIEWED
// serves it. With billing off every learner is Pro, so everything is "full".
export type LabAccess = "full" | "sample" | "locked";

export async function sampleLabId(trackId: string): Promise<string | null> {
  const row = await queryOne<{ id: string }>(
    `select l.id
       from labs l
       join objectives o on o.id = l.objective_id
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
      where cu.track_id = $1 and l.retired_at is null
        and ${servableSql("lab", "l.id")} and ${isActive("o")} and ${isActive("cu")}
      -- REQ-125: labs are served before expert review, so the sample is the
      -- first approved lab when there is one, else the first served lab.
      order by (l.review_status = 'approved') desc, cu.sort_order, o.sort_order, l.kind, l.title, l.id
      limit 1`,
    [trackId]
  );
  return row?.id ?? null;
}

export async function labAccess(userId: string, lab: Pick<LabRow, "id" | "track_id">): Promise<LabAccess> {
  if (await hasFeature(userId, LABS_FEATURE)) return "full";
  return (await sampleLabId(lab.track_id)) === lab.id ? "sample" : "locked";
}

// Whether this learner has ever run this lab (an open run can always be
// finished and past results always read, whatever the plan is now).
export async function hasRun(userId: string, labId: string): Promise<{ any: boolean; open: boolean }> {
  const r = await queryOne<{ any: boolean; open: boolean }>(
    `select count(*) > 0 as any, coalesce(bool_or(completed_at is null and abandoned_at is null), false) as open
       from lab_runs where user_id = $1 and lab_id = $2`,
    [userId, labId]
  );
  return { any: r?.any === true, open: r?.open === true };
}

// ---------------------------------------------------------------------------
// Answers (pure)
// ---------------------------------------------------------------------------

// One string per rubric part, within the caps, storable, at least one with
// something in it. Returns the cleaned list or the 400 message.
export function labAnswers(answers: unknown, partCount: number): string[] | string {
  if (!Array.isArray(answers) || answers.length !== partCount) {
    return `answers must be a list of ${partCount} strings, one per part`;
  }
  if (!answers.every((a) => typeof a === "string")) return "every answer must be a string";
  const list = answers as string[];
  if (!list.some((a) => a.trim())) return "answer at least one part";
  if (list.some((a) => a.length > LAB_PART_MAX)) return `each answer must be at most ${LAB_PART_MAX} characters`;
  if (list.reduce((n, a) => n + a.length, 0) > LAB_ANSWER_TOTAL_MAX) return `the answers together must be at most ${LAB_ANSWER_TOTAL_MAX} characters`;
  if (list.some(hasUnstorableText)) return "an answer contains characters that can't be stored";
  return list;
}

export function sameAnswers(stored: unknown, sent: string[]): boolean {
  return (
    Array.isArray(stored) &&
    stored.length === sent.length &&
    stored.every((s, i) => typeof s === "string" && s.trim() === sent[i].trim())
  );
}

// The attempt's answer text: every step's parts, labelled, for history,
// export and the review screens.
export function runTranscript(lab: Pick<LabRow, "steps" | "rubric">, answers: string[][]): string {
  return answers
    .map((parts, i) => {
      const head = lab.steps.length > 1 ? `Step ${i + 1}\n` : "";
      return head + parts.map((a, j) => `${lab.rubric[i]?.parts[j]?.label ?? `Part ${j + 1}`}: ${a.trim() || "(blank)"}`).join("\n");
    })
    .join("\n\n");
}

export function modelAnswerText(lab: Pick<LabRow, "steps" | "rubric">, upTo = lab.rubric.length): string {
  return lab.rubric
    .slice(0, upTo)
    .map((s, i) => {
      const head = lab.steps.length > 1 ? `Step ${i + 1}\n` : "";
      return head + s.parts.map((p) => `${p.label}: ${p.modelAnswer}`).join("\n");
    })
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Reading labs
// ---------------------------------------------------------------------------

const LAB_COLS = `l.id, l.objective_id, l.slug, l.kind, l.title, l.brief, l.steps, l.rubric, l.safety_note, l.sources,
                  l.source, l.review_status, o.unit_id, cu.track_id, o.title as objective_title,
                  ${labFamilySql("st")} as safety_family`;

// A lab this learner may open: served, on an active objective of a track they
// can see (shared catalog or their own). Null otherwise -- the routes answer 404.
export async function visibleLab(labId: string, userId: string, env = process.env): Promise<LabRow | null> {
  return queryOne<LabRow>(
    `select ${LAB_COLS}
       from labs l
       join objectives o on o.id = l.objective_id
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
      where l.id = $1 and (st.user_id is null or st.user_id = $2)
        and ${isActive("o")} and ${isActive("cu")} and ${servable("l", 3)}`,
    [labId, userId, servedReviewStatuses(env)]
  );
}

export interface LabListItem {
  id: string;
  kind: LabKind;
  title: string;
  objectiveId: string;
  objectiveTitle: string;
  unitId: string;
  unitTitle: string;
  stepCount: number;
  reviewStatus: ReviewStatus;
  state: "new" | "in_progress" | "done";
  stepsDone: number;
  runsFinished: number;
  lastVerdict: "correct" | "partial" | "incorrect" | null;
  // Decision 10: "full" (Pro, or billing off), "sample" (this course's one
  // sample lab on Free and Plus) or "locked" (listed, opens the plan sheet).
  access: LabAccess;
}

export type LabScope = { trackId: string } | { unitId: string } | { objectiveId: string };

export async function listLabs(userId: string, scope: LabScope, env = process.env): Promise<LabListItem[]> {
  const [col, id] =
    "trackId" in scope ? ["cu.track_id", scope.trackId] : "unitId" in scope ? ["cu.id", scope.unitId] : ["o.id", scope.objectiveId];
  const rows = await query<{
    id: string;
    kind: LabKind;
    title: string;
    objective_id: string;
    objective_title: string;
    unit_id: string;
    unit_title: string;
    step_count: number;
    review_status: ReviewStatus;
    track_id: string;
    open_steps: number | null;
    runs_finished: number;
    last_verdict: LabListItem["lastVerdict"];
  }>(
    `select l.id, l.kind, l.title, o.id as objective_id, o.title as objective_title, cu.id as unit_id, cu.title as unit_title, cu.track_id,
            jsonb_array_length(l.steps) as step_count, l.review_status,
            (select count(*)::int from lab_run_steps s where s.run_id = r.id) as open_steps,
            (select count(*)::int from lab_runs f where f.user_id = $2 and f.lab_id = l.id and f.completed_at is not null) as runs_finished,
            (select a.verdict::text from attempts a where a.user_id = $2 and a.lab_id = l.id
              order by a.created_at desc, a.id desc limit 1) as last_verdict
       from labs l
       join objectives o on o.id = l.objective_id
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
       left join lab_runs r on r.lab_id = l.id and r.user_id = $2 and r.completed_at is null and r.abandoned_at is null
      where ${col} = $1 and (st.user_id is null or st.user_id = $2)
        and ${isActive("o")} and ${isActive("cu")} and ${servable("l", 3)}
      order by cu.sort_order, o.sort_order, l.kind, l.title, l.id`,
    [id, userId, servedReviewStatuses(env)]
  );
  const full = await hasFeature(userId, LABS_FEATURE);
  const samples = new Map<string, string | null>();
  if (!full) {
    for (const r of rows) if (!samples.has(r.track_id)) samples.set(r.track_id, await sampleLabId(r.track_id));
  }
  return rows.map((r) => ({
    access: full ? ("full" as const) : samples.get(r.track_id) === r.id ? ("sample" as const) : ("locked" as const),
    id: r.id,
    kind: r.kind,
    title: r.title,
    objectiveId: r.objective_id,
    objectiveTitle: r.objective_title,
    unitId: r.unit_id,
    unitTitle: r.unit_title,
    stepCount: r.step_count,
    reviewStatus: r.review_status,
    state: r.open_steps != null && r.open_steps > 0 ? "in_progress" : r.runs_finished > 0 ? "done" : "new",
    stepsDone: r.open_steps ?? 0,
    runsFinished: r.runs_finished,
    lastVerdict: r.last_verdict,
  }));
}

// Per-unit progress for a course: labs available, tried (a finished run),
// and met (latest attempt correct).
export function labProgress(items: LabListItem[]) {
  const units = new Map<string, { unitId: string; unitTitle: string; total: number; finished: number; correct: number }>();
  for (const it of items) {
    const u = units.get(it.unitId) ?? { unitId: it.unitId, unitTitle: it.unitTitle, total: 0, finished: 0, correct: 0 };
    u.total++;
    if (it.runsFinished > 0) u.finished++;
    if (it.lastVerdict === "correct") u.correct++;
    units.set(it.unitId, u);
  }
  const list = [...units.values()];
  return {
    total: list.reduce((n, u) => n + u.total, 0),
    finished: list.reduce((n, u) => n + u.finished, 0),
    correct: list.reduce((n, u) => n + u.correct, 0),
    units: list,
  };
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export interface RunRow {
  id: string;
  user_id: string;
  lab_id: string;
  started_at: string;
  completed_at: string | null;
  abandoned_at: string | null;
  attempt_id: string | null;
}

export interface StepRow {
  step_index: number;
  client_attempt_id: string | null;
  answers: string[];
  verdict: "correct" | "partial" | "incorrect";
  feedback: string | null;
  classification: string | null;
  missed_parts: string[] | null;
  part_scores: { part: string; score: string; comment: string }[] | null;
  fix_next: string | null;
}

async function stepsOf(runId: string): Promise<StepRow[]> {
  return query<StepRow>(
    `select step_index, client_attempt_id, answers, verdict::text as verdict, feedback, classification, missed_parts, part_scores, fix_next
       from lab_run_steps where run_id = $1 order by step_index`,
    [runId]
  );
}

// The run to show: the open one, else the latest finished one.
export async function currentRun(userId: string, labId: string): Promise<RunRow | null> {
  return queryOne<RunRow>(
    `select * from lab_runs where user_id = $1 and lab_id = $2 and abandoned_at is null
      order by (completed_at is null) desc, started_at desc, id desc limit 1`,
    [userId, labId]
  );
}

// Opens a run: the open one if there is one (unless restart), else a new
// one. Restart abandons the open run; its graded steps stay, and make the
// next finished run a repeat (lib/grading-service.ts labAssistReason).
export async function openRun(userId: string, labId: string, restart: boolean): Promise<RunRow> {
  return withTransaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(hashtext('lab_run:' || $1 || ':' || $2))`, [userId, labId]);
    const open = await tx.queryOne<RunRow>(
      `select * from lab_runs where user_id = $1 and lab_id = $2 and completed_at is null and abandoned_at is null`,
      [userId, labId]
    );
    if (open && !restart) return open;
    if (open) await tx.query(`update lab_runs set abandoned_at = now() where id = $1`, [open.id]);
    const created = await tx.queryOne<RunRow>(`insert into lab_runs (user_id, lab_id) values ($1, $2) returning *`, [userId, labId]);
    return created!;
  });
}

export interface StepResultShape {
  index: number;
  verdict: "correct" | "partial" | "incorrect";
  feedback: string;
  partScores: { part: string; score: string; comment: string }[];
  missedParts: string[];
  fixNext: string | null;
  answers: string[];
  // The step's rubric, revealed once the step is graded.
  reference: { label: string; criteria: string; modelAnswer: string }[];
}

function stepResultShape(lab: LabRow, s: StepRow): StepResultShape {
  return {
    index: s.step_index,
    verdict: s.verdict,
    feedback: s.feedback ?? "",
    partScores: Array.isArray(s.part_scores) ? s.part_scores : [],
    missedParts: Array.isArray(s.missed_parts) ? s.missed_parts : [],
    fixNext: s.fix_next,
    answers: Array.isArray(s.answers) ? s.answers : [],
    reference: (lab.rubric[s.step_index]?.parts ?? []).map((p) => ({ label: p.label, criteria: p.criteria, modelAnswer: p.modelAnswer })),
  };
}

export interface LabView {
  lab: {
    id: string;
    kind: LabKind;
    title: string;
    brief: string;
    safetyNote: string | null;
    objectiveId: string;
    objectiveTitle: string;
    unitId: string;
    trackId: string;
    stepCount: number;
    reviewStatus: ReviewStatus;
    // Decision 10: "sample" is labelled as this course's sample lab.
    access: LabAccess;
    // Steps revealed so far: graded ones and the current one.
    steps: { index: number; text: string; ask: string; parts: string[] }[];
  };
  // REQ-125: the disclaimer to show before the learner starts and with the
  // results, and whether the one-time clinical/fitness acknowledgement is
  // still owed (lib/lab-disclaimer.ts).
  disclaimer: LabDisclaimer;
  run: {
    id: string;
    status: "open" | "finished";
    stepsDone: number;
    results: StepResultShape[];
    final: FinalShape | null;
  } | null;
  runsFinished: number;
}

export interface FinalShape {
  verdict: "correct" | "partial" | "incorrect";
  summary: string;
  assisted: boolean;
  assistReason: string | null;
  attemptId: string | null;
}

function revealedSteps(lab: LabRow, upTo: number) {
  return lab.steps.slice(0, Math.min(upTo + 1, lab.steps.length)).map((s, i) => ({
    index: i,
    text: s.text,
    ask: s.ask,
    parts: (lab.rubric[i]?.parts ?? []).map((p) => p.label),
  }));
}

async function finalShape(run: RunRow, steps: StepRow[]): Promise<FinalShape | null> {
  if (!run.completed_at) return null;
  const a = run.attempt_id
    ? await queryOne<{ id: string; verdict: FinalShape["verdict"]; assisted: boolean; assist_reason: string | null }>(
        `select id, verdict::text as verdict, assisted, assist_reason from attempts where id = $1`,
        [run.attempt_id]
      )
    : null;
  const parts = steps.map((s) => ({ partScores: Array.isArray(s.part_scores) ? s.part_scores : [] }));
  return {
    verdict: a?.verdict ?? runVerdict(parts),
    summary: runSummary(parts),
    assisted: a?.assisted === true,
    assistReason: a?.assist_reason ?? null,
    attemptId: a?.id ?? null,
  };
}

export async function labView(lab: LabRow, userId: string, runId?: string | null, access: LabAccess = "full"): Promise<LabView> {
  const run = runId
    ? await queryOne<RunRow>(`select * from lab_runs where id = $1 and user_id = $2 and lab_id = $3`, [runId, userId, lab.id])
    : await currentRun(userId, lab.id);
  if (runId && !run) throw new LabError(404, "Run not found");
  const steps = run ? await stepsOf(run.id) : [];
  const finished = await queryOne<{ n: number }>(
    `select count(*)::int as n from lab_runs where user_id = $1 and lab_id = $2 and completed_at is not null`,
    [userId, lab.id]
  );
  const base = {
    id: lab.id,
    kind: lab.kind,
    title: lab.title,
    brief: lab.brief,
    safetyNote: lab.safety_note,
    objectiveId: lab.objective_id,
    objectiveTitle: lab.objective_title,
    unitId: lab.unit_id,
    trackId: lab.track_id,
    stepCount: lab.steps.length,
    reviewStatus: lab.review_status,
    access,
  };
  return {
    lab: { ...base, steps: revealedSteps(lab, steps.length) },
    run: run
      ? {
          id: run.id,
          status: run.completed_at ? "finished" : "open",
          stepsDone: steps.length,
          results: steps.map((s) => stepResultShape(lab, s)),
          final: await finalShape(run, steps),
        }
      : null,
    runsFinished: finished?.n ?? 0,
    disclaimer: await labDisclaimerFor(userId, lab.safety_family, lab.review_status),
  };
}

// ---------------------------------------------------------------------------
// Submitting a step
// ---------------------------------------------------------------------------

export interface SubmitInput {
  userId: string;
  lab: LabRow;
  runId: string;
  step: number;
  answers: string[];
  clientAttemptId: string | null;
}

export interface SubmitResult {
  step: StepResultShape;
  nextStep: { index: number; text: string; ask: string; parts: string[] } | null;
  final: FinalShape | null;
  replayed: boolean;
}

export const LAB_REPLAY_CONFLICT = "This id was already used for a different question.";

// A stored result for this client attempt id, if the same submission was
// already graded (a retry after a dropped connection). A reused id for
// anything else -- another lab, run, step or answer, or an answer on another
// route -- is the shared 409.
export async function replayStep(input: SubmitInput): Promise<SubmitResult | null> {
  if (!input.clientAttemptId) return null;
  const row = await queryOne<StepRow & { run_id: string; lab_id: string }>(
    `select s.step_index, s.client_attempt_id, s.answers, s.verdict::text as verdict, s.feedback, s.classification,
            s.missed_parts, s.part_scores, s.fix_next, s.run_id, r.lab_id
       from lab_run_steps s join lab_runs r on r.id = s.run_id
      where s.user_id = $1 and s.client_attempt_id = $2`,
    [input.userId, input.clientAttemptId]
  );
  if (!row) {
    // An id already used by another route's answer.
    const other = await findClientAttempt(input.userId, input.clientAttemptId);
    if (other) throw new LabError(409, LAB_REPLAY_CONFLICT);
    return null;
  }
  if (row.lab_id !== input.lab.id || row.run_id !== input.runId || row.step_index !== input.step || !sameAnswers(row.answers, input.answers)) {
    throw new LabError(409, LAB_REPLAY_CONFLICT);
  }
  const run = await queryOne<RunRow>(`select * from lab_runs where id = $1`, [row.run_id]);
  const steps = await stepsOf(row.run_id);
  const isLast = row.step_index === input.lab.steps.length - 1;
  return {
    step: stepResultShape(input.lab, row),
    nextStep: isLast ? null : revealedSteps(input.lab, row.step_index + 1)[row.step_index + 1] ?? null,
    final: isLast && run ? await finalShape(run, steps) : null,
    replayed: true,
  };
}

// Checks a NEW submission is for this learner's open run and the step it is
// on. Steps are answered in order, once per run.
export async function checkRunStep(input: SubmitInput): Promise<RunRow> {
  const run = await queryOne<RunRow>(`select * from lab_runs where id = $1 and user_id = $2 and lab_id = $3`, [
    input.runId,
    input.userId,
    input.lab.id,
  ]);
  if (!run) throw new LabError(404, "Run not found");
  if (run.completed_at || run.abandoned_at) throw new LabError(409, "This run is finished. Start a new run to try the lab again.");
  const done = await queryOne<{ n: number }>(`select count(*)::int as n from lab_run_steps where run_id = $1`, [run.id]);
  const n = done?.n ?? 0;
  if (input.step < n) throw new LabError(409, "This step was already answered.");
  if (input.step > n || input.step >= input.lab.steps.length) throw new LabError(400, `Answer step ${n + 1} first.`);
  return run;
}

// Stores a graded step; on the last step also finishes the run and records
// the one attempt (mastery evidence on the lab's objective), in the same
// transaction.
export async function recordStep(input: SubmitInput, graded: LabStepGraded): Promise<SubmitResult> {
  const lab = input.lab;
  const isLast = input.step === lab.steps.length - 1;
  try {
    return await withTransaction(async (tx) => {
      const ins = await tx.queryOne<StepRow>(
        `insert into lab_run_steps
           (run_id, user_id, step_index, client_attempt_id, answers, verdict, feedback, classification, missed_parts, part_scores, fix_next)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         on conflict (run_id, step_index) do nothing
         returning step_index, client_attempt_id, answers, verdict::text as verdict, feedback, classification, missed_parts, part_scores, fix_next`,
        [
          input.runId,
          input.userId,
          input.step,
          input.clientAttemptId,
          JSON.stringify(input.answers),
          graded.verdict,
          cleanText(graded.feedback, 4000),
          cleanText(graded.classification ?? "", 200),
          JSON.stringify(graded.missedParts.map((m) => cleanText(m, 300))),
          JSON.stringify(graded.partScores.map((p) => ({ part: cleanText(p.part, 300), score: p.score, comment: cleanText(p.comment ?? "", 600) }))),
          cleanText(graded.fixNext ?? "", 600),
        ]
      );
      if (!ins) throw new LabError(409, "This step was already answered.");
      let final: FinalShape | null = null;
      if (isLast) {
        const steps = await tx.query<StepRow>(
          `select step_index, client_attempt_id, answers, verdict::text as verdict, feedback, classification, missed_parts, part_scores, fix_next
             from lab_run_steps where run_id = $1 order by step_index`,
          [input.runId]
        );
        const parts = steps.map((s) => ({ partScores: Array.isArray(s.part_scores) ? s.part_scores : [] }));
        const verdict = runVerdict(parts);
        const summary = runSummary(parts);
        const allScores = steps.flatMap((s) =>
          (s.part_scores ?? []).map((p) => ({ ...p, part: lab.steps.length > 1 ? `Step ${s.step_index + 1}: ${p.part}` : p.part }))
        );
        const missed = allScores.filter((p) => p.score === "missed").map((p) => p.part);
        const attempt = (await recordAttemptTx(tx, {
          userId: input.userId,
          unitId: lab.unit_id,
          objectiveId: lab.objective_id,
          kind: "labtask",
          format: "open",
          question: lab.title,
          answer: runTranscript(lab, steps.map((s) => (Array.isArray(s.answers) ? s.answers : []))),
          verdict,
          feedback: lab.steps.length > 1 ? summary : graded.feedback,
          classification: graded.classification,
          missedParts: missed,
          modelAnswer: modelAnswerText(lab),
          fixNext: graded.fixNext,
          clientAttemptId: input.clientAttemptId,
          assessmentType: lab.kind === "build" ? "lab_build" : "lab_case",
          labId: lab.id,
          labRunId: input.runId,
          partScores: allScores,
          // REQ-124 (decision 14): a first-try run moves the objective's
          // review schedule like a Solo answer -- a miss is logged for
          // review, a correct run moves due review on (recordAttemptTx). A
          // repeat run changes neither.
        })) as { id: string; verdict: FinalShape["verdict"]; assisted: boolean; assist_reason: string | null };
        await tx.query(`update lab_runs set completed_at = now(), attempt_id = $2 where id = $1`, [input.runId, attempt.id]);
        final = { verdict, summary, assisted: attempt.assisted === true, assistReason: attempt.assist_reason ?? null, attemptId: attempt.id };
      }
      return {
        step: stepResultShape(lab, ins),
        nextStep: isLast ? null : revealedSteps(lab, input.step + 1)[input.step + 1] ?? null,
        final,
        replayed: false,
      };
    });
  } catch (err) {
    // Two copies of one submission raced past the claim (or the claim
    // expired): the slower one replays the winner's stored result.
    if (input.clientAttemptId && (isDuplicateClientAttempt(err) || isDuplicateStepClient(err))) {
      const prior = await replayStep(input);
      if (prior) return prior;
    }
    throw err;
  }
}

function isDuplicateStepClient(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string } | null;
  return !!e && e.code === "23505" && e.constraint === "lab_run_steps_client_attempt";
}
