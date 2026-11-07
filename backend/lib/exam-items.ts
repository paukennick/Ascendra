import { query, queryOne } from "@/lib/db";
import { callClaudeStructured, getModel } from "@/lib/anthropic";
import { coachContextForObjective } from "@/lib/coach-context";
import { examItemsPrompt, examItemsSchema } from "@/lib/prompts";
import {
  attemptQuestionText,
  validateItemDraft,
  type ExamFormat,
  type Exhibit,
  type ItemDraft,
  type StoredExamItem,
} from "@/lib/exam-formats";
import { factCheckGate, type CheckItem } from "@/lib/fact-check";
import { examCheckItem, recordHoldback, servableSql, uncertaintyOf } from "@/lib/item-quality";

// REQ-109: the shared exam_items bank (migration 038).
//
// Cost model: items are generated per OBJECTIVE, a few at a time, and kept
// for every learner who can see the objective -- like cached lessons -- so
// the model is only called when a learner has already seen every item for
// an objective in the formats their exam uses. One call writes up to
// ITEMS_PER_CALL items.
//
// Model: the lesson model (getModel), not the fast one. These items are
// shared and their answer keys are trusted by every learner who gets them;
// a wrong key costs far more than the per-objective call, which is paid
// once and amortised over everyone on the course.

export const ITEMS_PER_CALL = 4;

export interface ExamItemRow {
  id: string;
  objective_id: string;
  item_format: ExamFormat;
  stem: string;
  body: StoredExamItem["body"];
  answer_key: StoredExamItem["answerKey"];
  explanation: string;
  exhibit: Exhibit | null;
  source: "generated" | "lesson";
}

export function rowToItem(r: ExamItemRow): StoredExamItem {
  return {
    id: r.id,
    objectiveId: r.objective_id,
    format: r.item_format,
    stem: r.stem,
    body: r.body,
    answerKey: r.answer_key,
    explanation: r.explanation,
    exhibit: r.exhibit,
  };
}

export const ITEM_COLUMNS = "id, objective_id, item_format, stem, body, answer_key, explanation, exhibit, source";

// Every item in the bank for these objectives, in the given formats.
// Lesson copies are included only when this learner has answered that
// lesson question already (see migration 038: never a preview).
// REQ-114: an item pulled from rotation (item_status) is never served.
export async function bankItems(userId: string, objectiveIds: string[], formats: ExamFormat[]): Promise<ExamItemRow[]> {
  if (!objectiveIds.length) return [];
  return query<ExamItemRow>(
    `select ${ITEM_COLUMNS} from exam_items i
      where i.objective_id = any($1::uuid[]) and i.item_format = any($2::text[])
        and ${servableSql("exam", "i.id")}
        and (i.source = 'generated'
             or exists (select 1 from attempts a where a.user_id = $3 and a.objective_id = i.objective_id
                          and a.stage in ('fade', 'solo') and a.question = i.stem))
      order by i.created_at`,
    [objectiveIds, formats, userId]
  );
}

// Questions this learner has already answered on these objectives (any
// kind). An item whose question is here is a repeat: the answer was shown.
export async function answeredQuestions(userId: string, objectiveIds: string[]): Promise<Set<string>> {
  if (!objectiveIds.length) return new Set();
  const rows = await query<{ question: string }>(
    `select distinct question from attempts where user_id = $1 and objective_id = any($2::uuid[])`,
    [userId, objectiveIds]
  );
  return new Set(rows.map((r) => r.question));
}

export function isSeen(item: StoredExamItem, answered: Set<string>): boolean {
  return answered.has(attemptQuestionText(item));
}

export async function insertDraft(objectiveId: string, d: ItemDraft, model: string | null): Promise<ExamItemRow> {
  const row = await queryOne<ExamItemRow>(
    `insert into exam_items (objective_id, item_format, stem, body, answer_key, explanation, exhibit, model)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning ${ITEM_COLUMNS}`,
    [objectiveId, d.format, d.stem, JSON.stringify(d.body), JSON.stringify(d.answerKey), d.explanation, d.exhibit ? JSON.stringify(d.exhibit) : null, model]
  );
  return row!;
}

// Copies the lesson checks this learner has already answered on these
// objectives into the bank as multiple-choice items (once per question).
// Reuse without a model call; they are repeats for this learner, so they
// earn reduced credit, but they keep a mock possible when nothing else is.
export async function copyAnsweredLessonChecks(userId: string, objectiveIds: string[]): Promise<number> {
  if (!objectiveIds.length) return 0;
  const rows = await query<{ n: number }>(
    `with checks as (
       select lc.objective_id, s.stage, s.q, s.c, s.i, s.why
         from lesson_content lc
         cross join lateral (values ('fade', lc.fade_problem, lc.fade_choices, lc.fade_correct_index, lc.fade_why),
                                    ('solo', lc.solo_check, lc.solo_choices, lc.solo_correct_index, lc.solo_why))
                    s(stage, q, c, i, why)
        where lc.objective_id = any($2::uuid[])
          and s.q is not null and jsonb_typeof(s.c) = 'array' and jsonb_array_length(s.c) = 4 and s.i between 0 and 3
          and exists (select 1 from attempts a where a.user_id = $1 and a.objective_id = lc.objective_id
                        and a.stage = s.stage and a.question = s.q)
     ), ins as (
       insert into exam_items (objective_id, item_format, stem, body, answer_key, explanation, source, model)
       select objective_id, 'multiple_choice', q, jsonb_build_object('choices', c),
              jsonb_build_object('correct', jsonb_build_array(i)), coalesce(why, ''), 'lesson', null
         from checks
       on conflict do nothing
       returning 1
     )
     select count(*)::int as n from ins`,
    [userId, objectiveIds]
  );
  return rows[0]?.n ?? 0;
}

// Asks the model for up to ITEMS_PER_CALL items for one objective, keeps
// the ones that validate, and stores them. Returns the stored rows and how
// many were rejected. Throws only if the model call itself fails.
export async function generateForObjective(opts: {
  objectiveId: string;
  formats: ExamFormat[]; // the formats to ask for, one item each
  exhibits: boolean;
  allowed: ExamFormat[];
  userId: string;
}): Promise<{ stored: ExamItemRow[]; rejected: string[] }> {
  const meta = await queryOne<{ objective: string; unit: string; track: string; teach: string | null }>(
    `select o.title as objective, cu.title as unit, st.title as track, lc.teach
       from objectives o
       join course_units cu on cu.id = o.unit_id
       join subject_tracks st on st.id = cu.track_id
       left join lesson_content lc on lc.objective_id = o.id
      where o.id = $1`,
    [opts.objectiveId]
  );
  if (!meta) return { stored: [], rejected: ["objective not found"] };
  const existing = await query<{ stem: string }>(
    `select stem from exam_items where objective_id = $1 and source = 'generated' order by created_at desc limit 12`,
    [opts.objectiveId]
  );
  const ctx = await coachContextForObjective(opts.objectiveId);
  const { system, user } = examItemsPrompt({
    trackTitle: meta.track,
    unitTitle: meta.unit,
    objectiveTitle: meta.objective,
    formats: opts.formats,
    exhibits: opts.exhibits,
    taughtText: meta.teach,
    avoidStems: existing.map((e) => e.stem),
    ctx: ctx ?? undefined,
  });
  const model = getModel();
  const out = await callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: examItemsSchema,
    maxTokens: 900 * Math.max(1, opts.formats.length),
    model,
    effort: "medium",
    thinking: "off",
    purpose: "exam_items",
    userId: opts.userId,
  });
  const stored: ExamItemRow[] = [];
  const rejected: string[] = [];
  // REQ-114 (Audit 3 H1 + recommendation 1): an item whose writer listed
  // uncertain claims is held back; the rest go through the second-model
  // fact-check (one call for the batch) and only those it agrees with are
  // published to the shared bank.
  const candidates: { key: string; draft: ItemDraft }[] = [];
  for (const [i, raw] of (out.items ?? []).entries()) {
    const d = validateItemDraft(raw, opts.allowed, opts.exhibits);
    if (typeof d === "string") {
      rejected.push(d);
      continue;
    }
    const unsure = uncertaintyOf(raw);
    if (unsure) {
      rejected.push("held back: uncertain claims");
      await recordHoldback({ kind: "exam", objectiveId: opts.objectiveId, reason: "uncertain", claims: unsure, content: raw, model });
      continue;
    }
    candidates.push({ key: `e${i + 1}`, draft: d });
  }
  const checks = candidates
    .map((c) => examCheckItem(c.key, meta.objective, c.draft.format, c.draft.stem, c.draft.body as { choices?: string[]; steps?: string[]; prompts?: string[]; responses?: string[] }, c.draft.answerKey))
    .filter((c): c is CheckItem => !!c);
  const gate = await factCheckGate(checks, { ctx: ctx ?? undefined, userId: opts.userId });
  for (const c of candidates) {
    const v = gate.verdicts.get(c.key);
    if (!v?.publish) {
      rejected.push(`held back: fact check ${gate.error ? "error" : v?.outcome ?? "missing"}`);
      await recordHoldback({
        kind: "exam",
        objectiveId: opts.objectiveId,
        reason: gate.error ? "fact_check_error" : "fact_check",
        claims: gate.error ? [gate.error] : v?.unsupportedClaims ?? [],
        content: { draft: c.draft, checker: v ?? null },
        model,
      });
      continue;
    }
    stored.push(await insertDraft(opts.objectiveId, c.draft, model));
  }
  if (rejected.length) console.warn(`[exam-items] rejected ${rejected.length} generated item(s): ${rejected.join("; ")}`);
  return { stored, rejected };
}
