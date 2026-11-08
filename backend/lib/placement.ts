import { isActive } from "@/lib/progress-sql";
import { query, queryOne, withTransaction, type TxClient } from "@/lib/db";
import { presentationOrder, presentationSeed, shuffleForPresentation, storedIndexAt } from "@/lib/choice-order";
import { recordPracticeAttemptTx } from "@/lib/practice-attempts";

// REQ-110: an optional placement check when starting a course, so a learner
// at any stage starts in the right place.
//
// Up to placementCap() multiple-choice questions, taken from each objective's
// shared Guided item (lesson_content, already generated and cached: no AI
// call). It adapts per unit: a right answer jumps further into that unit, a
// miss closes the unit (it will be taught from the start). The first question
// is the course's very first objective, and a learner who misses the first
// BEGINNER_STOP is not asked more: the check ends kindly and they start at
// the beginning.
//
// Objectives answered correctly are "tested out": the study plan skips them
// and asks for one quick confirming check later. In the weighted model the
// answers are assessment_type placement (migration 039): unassisted,
// single-sitting, recognition-level evidence -- at most Guided on its own,
// never Independent or Transfer-ready. Answers are not shown during the
// check (that would teach to it), and misses do not go to Review.

export const PLACEMENT_MAX = 12;
// REQ-117 (Audit 3 T11, FAIL-350): the cap grows with the course, one
// question per three objectives, between PLACEMENT_MAX and PLACEMENT_CEILING,
// so an expert on a large course is not left with most of it to sit through.
// The plan also infers the objectives a correct late answer jumped over
// (lib/study-plan-store.ts).
export const PLACEMENT_CEILING = 30;
export function placementCap(candidateCount: number): number {
  return Math.min(PLACEMENT_CEILING, Math.max(PLACEMENT_MAX, Math.ceil(candidateCount / 3)));
}
export const BEGINNER_STOP = 4;
export const MIN_CANDIDATES = 3;
const STAGE = "placement";

export interface PlacementCandidate {
  objectiveId: string;
  unitId: string;
  unitSort: number;
  unitWeight: number | null;
  sortOrder: number;
}

export interface PlacementAnswer {
  objectiveId: string;
  correct: boolean | null;
}

// Which objective to ask next, or null when the check is over. Pure.
export function nextPlacementObjective(candidates: PlacementCandidate[], answers: PlacementAnswer[]): string | null {
  if (!candidates.length || answers.length >= placementCap(candidates.length)) return null;
  if (answers.length >= BEGINNER_STOP && answers.slice(0, BEGINNER_STOP).every((a) => a.correct === false)) return null;

  const units = new Map<string, PlacementCandidate[]>();
  for (const c of [...candidates].sort((a, b) => a.unitSort - b.unitSort || a.sortOrder - b.sortOrder)) {
    const list = units.get(c.unitId) ?? [];
    list.push(c);
    units.set(c.unitId, list);
  }
  const unitList = [...units.values()];
  // Gentle on-ramp: the first question is the first objective of the course.
  if (!answers.length) return unitList[0][0].objectiveId;

  const result = new Map(answers.map((a) => [a.objectiveId, a.correct]));
  let best: { id: string; asked: number; weight: number; sort: number } | null = null;
  for (const objs of unitList) {
    const asked = objs.map((o, i) => ({ i, r: result.get(o.objectiveId) })).filter((x) => x.r !== undefined);
    if (asked.some((x) => x.r === false)) continue; // a miss closes the unit
    let idx: number;
    if (!asked.length) idx = Math.floor((objs.length - 1) / 2);
    else {
      const last = Math.max(...asked.map((x) => x.i));
      idx = last + Math.ceil((objs.length - 1 - last) / 2);
      if (idx === last) continue; // reached the end of the unit
    }
    const cand = { id: objs[idx].objectiveId, asked: asked.length, weight: objs[0].unitWeight ?? 0, sort: objs[0].unitSort };
    if (
      !best ||
      cand.asked < best.asked ||
      (cand.asked === best.asked && (cand.weight > best.weight || (cand.weight === best.weight && cand.sort < best.sort)))
    ) {
      best = cand;
    }
  }
  return best?.id ?? null;
}

export function placementSummaryMessage(asked: number, correct: number, endedEarly: boolean): string {
  if (correct === 0) {
    return endedEarly
      ? "No need to keep going: this course is new to you, and that's exactly what it's for. We'll start at the beginning, one step at a time."
      : "This all looks new, and that's fine. We'll start at the beginning, one step at a time.";
  }
  if (correct === asked) {
    return `You knew all ${asked}. We'll skip ahead past those and confirm them with a quick check later.`;
  }
  return `You already know ${correct} of the ${asked} we asked about. We'll skip ahead past those, confirm them with a quick check later, and start with what's new.`;
}

async function candidatesFor(run: TxClient | null, trackId: string): Promise<(PlacementCandidate & { question: string; choices: string[]; correctIndex: number })[]> {
  const sql = `select o.id as objective_id, o.unit_id, cu.sort_order as unit_sort, cu.weight as unit_weight, o.sort_order,
                      lc.fade_problem as question, lc.fade_choices as choices, lc.fade_correct_index as correct_index
                 from objectives o
                 join course_units cu on cu.id = o.unit_id
                 join lesson_content lc on lc.objective_id = o.id
                where cu.track_id = $1 and lc.fade_problem is not null
                  and ${isActive("o")} and ${isActive("cu")}
                  and jsonb_typeof(lc.fade_choices) = 'array' and jsonb_array_length(lc.fade_choices) >= 2
                  and lc.fade_correct_index is not null`;
  type Row = { objective_id: string; unit_id: string; unit_sort: number; unit_weight: string | null; sort_order: number; question: string; choices: string[]; correct_index: number };
  const rows = run ? await run.query<Row>(sql, [trackId]) : await query<Row>(sql, [trackId]);
  return rows.map((r) => ({
    objectiveId: r.objective_id,
    unitId: r.unit_id,
    unitSort: r.unit_sort,
    unitWeight: r.unit_weight == null ? null : Number(r.unit_weight),
    sortOrder: r.sort_order,
    question: r.question,
    choices: r.choices,
    correctIndex: r.correct_index,
  }));
}

export interface PlacementItemView {
  seq: number;
  objectiveId: string;
  question: string;
  choices: string[];
}

export interface PlacementView {
  available: boolean;
  status: "none" | "active" | "done" | "skipped";
  asked: number;
  max: number;
  current: PlacementItemView | null;
  summary: { asked: number; correct: number; message: string } | null;
}

interface CheckRow {
  id: string;
  status: "active" | "done" | "skipped";
}
interface ItemRow {
  seq: number;
  objective_id: string;
  question: string;
  choices: string[];
  correct_index: number;
  correct: boolean | null;
}

function present(userId: string, it: ItemRow): PlacementItemView {
  const order = presentationOrder(presentationSeed(userId, it.objective_id, STAGE, it.question), it.choices.length);
  return { seq: it.seq, objectiveId: it.objective_id, question: it.question, choices: shuffleForPresentation(it.choices, order) };
}

async function view(tx: TxClient | null, userId: string, trackId: string): Promise<PlacementView> {
  const q = <T extends Record<string, unknown>>(sql: string, p: unknown[]) => (tx ? tx.query<T>(sql, p) : query<T>(sql, p));
  const check = (await q<CheckRow & Record<string, unknown>>(`select id, status from placement_checks where user_id = $1 and track_id = $2`, [userId, trackId]))[0];
  const candidates = await candidatesFor(tx, trackId);
  const available = candidates.length >= MIN_CANDIDATES;
  const max = placementCap(candidates.length);
  if (!check) return { available, status: "none", asked: 0, max, current: null, summary: null };
  const items = await q<ItemRow & Record<string, unknown>>(
    `select seq, objective_id, question, choices, correct_index, correct from placement_items where placement_id = $1 order by seq`,
    [check.id]
  );
  const answered = items.filter((i) => i.correct !== null);
  const open = items.find((i) => i.correct === null) ?? null;
  const correct = answered.filter((i) => i.correct).length;
  const endedEarly = answered.length >= BEGINNER_STOP && answered.length < max && correct === 0;
  return {
    available,
    status: check.status,
    asked: answered.length,
    max,
    current: check.status === "active" && open ? present(userId, open) : null,
    summary:
      check.status === "done"
        ? { asked: answered.length, correct, message: placementSummaryMessage(answered.length, correct, endedEarly) }
        : null,
  };
}

// Serve the next question, or close the check. Caller holds the check row lock.
async function advance(tx: TxClient, checkId: string, trackId: string): Promise<void> {
  const items = await tx.query<ItemRow>(
    `select seq, objective_id, question, choices, correct_index, correct from placement_items where placement_id = $1 order by seq`,
    [checkId]
  );
  if (items.some((i) => i.correct === null)) return; // one is already waiting
  const candidates = await candidatesFor(tx, trackId);
  const nextId = nextPlacementObjective(
    candidates,
    items.map((i) => ({ objectiveId: i.objective_id, correct: i.correct }))
  );
  const next = candidates.find((c) => c.objectiveId === nextId);
  if (!next) {
    await tx.query(`update placement_checks set status = 'done', finished_at = now() where id = $1`, [checkId]);
    return;
  }
  await tx.query(
    `insert into placement_items (placement_id, seq, objective_id, question, choices, correct_index)
     values ($1, $2, $3, $4, $5, $6)`,
    [checkId, items.length + 1, next.objectiveId, next.question, JSON.stringify(next.choices), next.correctIndex]
  );
}

export async function placementView(userId: string, trackId: string): Promise<PlacementView> {
  return view(null, userId, trackId);
}

export async function startPlacement(userId: string, trackId: string): Promise<PlacementView | { error: "unavailable" }> {
  const candidates = await candidatesFor(null, trackId);
  if (candidates.length < MIN_CANDIDATES) return { error: "unavailable" };
  return withTransaction(async (tx) => {
    await tx.query(
      `insert into placement_checks (user_id, track_id) values ($1, $2) on conflict (user_id, track_id) do nothing`,
      [userId, trackId]
    );
    const check = (await tx.queryOne<CheckRow>(
      `select id, status from placement_checks where user_id = $1 and track_id = $2 for update`,
      [userId, trackId]
    ))!;
    // Starting again after skipping is allowed; a finished check is not redone.
    if (check.status === "skipped") {
      await tx.query(`update placement_checks set status = 'active', finished_at = null where id = $1`, [check.id]);
      check.status = "active";
    }
    if (check.status === "active") await advance(tx, check.id, trackId);
    return view(tx, userId, trackId);
  });
}

export async function skipPlacement(userId: string, trackId: string): Promise<PlacementView> {
  await query(
    `insert into placement_checks (user_id, track_id, status, finished_at) values ($1, $2, 'skipped', now())
     on conflict (user_id, track_id) do update set status = 'skipped', finished_at = now()
       where placement_checks.status = 'active'`,
    [userId, trackId]
  );
  return placementView(userId, trackId);
}

export type AnswerPlacementResult =
  | { status: "ok"; view: PlacementView; replayed: boolean }
  | { status: "not_active" }
  | { status: "stale"; view: PlacementView }
  | { status: "bad_choice" };

export async function answerPlacement(
  userId: string,
  trackId: string,
  seq: unknown,
  shownIndex: unknown,
  clientAttemptId: string | null
): Promise<AnswerPlacementResult> {
  return withTransaction(async (tx) => {
    const check = await tx.queryOne<CheckRow>(
      `select id, status from placement_checks where user_id = $1 and track_id = $2 for update`,
      [userId, trackId]
    );
    if (!check) return { status: "not_active" as const };
    if (clientAttemptId) {
      const prior = await tx.queryOne(`select 1 from attempts where user_id = $1 and client_attempt_id = $2`, [userId, clientAttemptId]);
      if (prior) return { status: "ok" as const, view: await view(tx, userId, trackId), replayed: true };
    }
    if (check.status !== "active") return { status: "not_active" as const };
    const item = await tx.queryOne<ItemRow & { unit_id: string }>(
      `select pi.seq, pi.objective_id, pi.question, pi.choices, pi.correct_index, pi.correct, o.unit_id
         from placement_items pi join objectives o on o.id = pi.objective_id
        where pi.placement_id = $1 and pi.correct is null order by pi.seq limit 1`,
      [check.id]
    );
    // A second tab, or a submit for a question already answered.
    if (!item || item.seq !== seq) return { status: "stale" as const, view: await view(tx, userId, trackId) };
    const order = presentationOrder(presentationSeed(userId, item.objective_id, STAGE, item.question), item.choices.length);
    const stored = storedIndexAt(order, shownIndex);
    if (stored === null) return { status: "bad_choice" as const };
    const correct = stored === item.correct_index;
    const attempt = await recordPracticeAttemptTx(tx, {
      userId,
      unitId: item.unit_id,
      objectiveId: item.objective_id,
      stage: "placement",
      assessmentType: "placement",
      question: item.question,
      answer: item.choices[stored],
      verdict: correct ? "correct" : "incorrect",
      feedback: null,
      classification: correct ? "none" : "placement: not yet learned",
      assistReason: null,
      clientAttemptId,
    });
    await tx.query(
      `update placement_items set correct = $3, attempt_id = $4, answered_at = now() where placement_id = $1 and seq = $2`,
      [check.id, item.seq, correct, attempt.id]
    );
    await advance(tx, check.id, trackId);
    return { status: "ok" as const, view: await view(tx, userId, trackId), replayed: false };
  });
}
