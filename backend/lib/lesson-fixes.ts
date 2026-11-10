import { query, queryOne, withTransaction } from "@/lib/db";
import { lessonIntroProblems, lessonPracticeProblems } from "@/lib/content-validator";
import { confirmItemWrong, lessonItemId, recordHoldback, type ItemRef } from "@/lib/item-quality";
import { advisingContextFor, authoredAdvisingLesson, AUTHORED_ADVISING_MODEL, ADVISING_UNITS } from "@/lib/degree-advising";
import { parseTeachCards, teachFromCards, type TeachCards } from "@/lib/prompts";
import type { LessonRow } from "@/lib/lesson-store";

// REQ-187: correcting SHARED lessons a person has found wrong, through the
// app's own mechanisms -- never ad-hoc SQL. Used by scripts/lesson-fixes.ts
// (and its GitHub workflow against production) for the 2026-11-09 content
// audit, and reusable for any later audit.
//
// Every fix names its lesson by course code and objective title (the
// read-only lookup maps it to the objective and its lesson_content row) and
// lists text the stored lesson must contain (`expect`), so a lesson that was
// already regenerated since the audit is left alone rather than "fixed".
//
//   void       the lesson's keys are wrong. Both checks are confirmed wrong
//              (lib/item-quality.ts confirmItemWrong): every answer graded
//              against them is voided (kept, left out of mastery), the
//              learners' mastery is recomputed, and the lesson is no longer
//              served. The next visit generates a replacement through the
//              hardened pipeline (or, for a degree-advising objective, the
//              authored lesson).
//   replace    the lesson is corrected in place: exact text edits (each must
//              match), optional replacement fields, and a dated sources line
//              added to the teaching text. Checks listed in `voidChecks`
//              (their key or reasoning was wrong) are confirmed wrong first,
//              which voids the answers graded against them; their question
//              text must change, so the corrected check is a new item.
//              Answers to checks that were right are kept.
//   authored   a degree-advising objective (lib/degree-advising.ts): the
//              stored generated lesson is replaced by the authored one, and
//              learners' own regenerated copies of it are removed.
// Each replaced lesson's previous content is logged in item_holdbacks with
// the reason, so nothing is lost.

export interface FixSource {
  title: string;
  url: string;
  checkedAt: string; // YYYY-MM-DD
}

export interface TextEdit {
  find: string;
  replace: string;
}

export type LessonFieldSet = Partial<{
  fadeProblem: string;
  fadeChoices: string[];
  fadeCorrectIndex: number;
  fadeWhy: string;
  fadeOptionReasons: string[];
  soloCheck: string;
  soloChoices: string[];
  soloCorrectIndex: number;
  soloWhy: string;
  soloOptionReasons: string[];
}>;

export interface LessonFix {
  id: string;
  track: string;
  // The objective's title; a list when a parallel change may have reworded
  // it (objectives keep their id and mastery when reworded).
  objective: string | string[];
  action: "void" | "replace" | "authored";
  note: string;
  expect?: string[];
  edits?: TextEdit[];
  set?: LessonFieldSet;
  voidChecks?: ("fade" | "solo")[];
  sources?: FixSource[];
  // A wording-only correction (a typo, a leaked phrase, recomputed
  // arithmetic) that changes no factual claim needs no sources line.
  editorial?: boolean;
}

export interface FixTarget {
  objectiveId: string;
  unitTitle: string;
  lesson: LessonRow | null;
}

const LESSON_COLUMNS = `guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
  solo_check, solo_choices, solo_correct_index, solo_why, fade_option_reasons, solo_option_reasons, teach_cards, model, generated_at`;

// Read-only: the catalog objective a fix names, and its shared lesson.
export async function lookupFix(fix: Pick<LessonFix, "track" | "objective">): Promise<FixTarget[]> {
  const rows = await query<{ id: string; unit_title: string }>(
    `select o.id, cu.title as unit_title
       from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
      where st.user_id is null and upper(st.code) = upper($1) and o.title = any($2::text[]) and (o.retired_at is null or o.retired_at > now())`,
    [fix.track, Array.isArray(fix.objective) ? fix.objective : [fix.objective]]
  );
  const out: FixTarget[] = [];
  for (const r of rows) {
    const lesson = await queryOne<LessonRow>(`select ${LESSON_COLUMNS} from lesson_content where objective_id = $1`, [r.id]);
    out.push({ objectiveId: r.id, unitTitle: r.unit_title, lesson });
  }
  return out;
}

// Every text a stored lesson shows, for `expect` and edit counting.
export function lessonText(l: LessonRow): string {
  return [
    l.guess_prompt,
    l.teach,
    l.fade_problem,
    ...(l.fade_choices ?? []),
    l.fade_why,
    ...(l.fade_option_reasons ?? []),
    l.solo_check,
    ...(l.solo_choices ?? []),
    l.solo_why,
    ...(l.solo_option_reasons ?? []),
    l.teach_cards ? JSON.stringify(l.teach_cards) : "",
  ].join("\n");
}

const countOf = (hay: string, needle: string) => (needle ? hay.split(needle).length - 1 : 0);

function editString(s: string, edits: TextEdit[]): string {
  return edits.reduce((acc, e) => acc.split(e.find).join(e.replace), s);
}

function editCards(cards: TeachCards | null, edits: TextEdit[]): TeachCards | null {
  if (!cards) return null;
  return {
    cards: cards.cards.map((c) => ({ ...c, title: editString(c.title, edits), body: editString(c.body, edits), ...(c.steps ? { steps: c.steps.map((s) => editString(s, edits)) } : {}) })),
    selfExplain: cards.selfExplain
      ? { ...cards.selfExplain, question: editString(cards.selfExplain.question, edits), modelExplanation: editString(cards.selfExplain.modelExplanation, edits) }
      : null,
  };
}

export function sourcesLine(sources: FixSource[]): string {
  return `Sources (checked): ${sources.map((s) => `${s.title}, ${s.url} (${s.checkedAt})`).join("; ")}.`;
}

export interface CorrectedLesson {
  content: {
    guessPrompt: string;
    teach: string;
    teachCards: TeachCards | null;
    fadeProblem: string;
    fadeChoices: string[];
    fadeCorrectIndex: number;
    fadeWhy: string;
    fadeOptionReasons?: string[];
    soloCheck: string;
    soloChoices: string[];
    soloCorrectIndex: number;
    soloWhy: string;
    soloOptionReasons?: string[];
  };
  problems: string[];
}

// Pure: the corrected lesson, or the reasons it can't be built. Every edit
// must match the stored text at least once, every `expect` must be present,
// a voided check's question must change, and the result must pass the
// structural content checks (non-empty, distinct options, index in range).
// The distractor lint is not applied: this text is written and reviewed by
// a person, against sources.
export function correctedLesson(row: LessonRow, fix: LessonFix): CorrectedLesson {
  const problems: string[] = [];
  const text = lessonText(row);
  for (const e of fix.expect ?? []) if (!text.includes(e)) problems.push(`expected text not found: "${e.slice(0, 60)}"`);
  const edits = fix.edits ?? [];
  for (const e of edits) if (!countOf(text, e.find)) problems.push(`edit does not match: "${e.find.slice(0, 60)}"`);
  const ed = (s: string) => editString(s, edits);
  const reasons = (v: string[] | null) => (Array.isArray(v) ? v.map(ed) : undefined);
  let cards = editCards(parseTeachCards(row.teach_cards), edits);
  let teach = cards ? teachFromCards(cards) : ed(row.teach);
  if (fix.sources?.length) {
    const line = sourcesLine(fix.sources);
    if (cards) {
      const last = cards.cards.length - 1;
      cards = { ...cards, cards: cards.cards.map((c, i) => (i === last ? { ...c, body: `${c.body} ${line}` } : c)) };
      teach = teachFromCards(cards);
    } else {
      teach = `${teach}\n\n${line}`;
    }
  } else if (fix.action === "replace" && !fix.editorial) {
    problems.push("a corrected lesson must cite its sources");
  }
  const s = fix.set ?? {};
  const content: CorrectedLesson["content"] = {
    guessPrompt: ed(row.guess_prompt),
    teach,
    teachCards: cards,
    fadeProblem: s.fadeProblem ?? ed(row.fade_problem),
    fadeChoices: s.fadeChoices ?? row.fade_choices.map(ed),
    fadeCorrectIndex: s.fadeCorrectIndex ?? row.fade_correct_index,
    fadeWhy: s.fadeWhy ?? ed(row.fade_why),
    fadeOptionReasons: s.fadeOptionReasons ?? reasons(row.fade_option_reasons),
    soloCheck: s.soloCheck ?? ed(row.solo_check),
    soloChoices: s.soloChoices ?? row.solo_choices.map(ed),
    soloCorrectIndex: s.soloCorrectIndex ?? row.solo_correct_index,
    soloWhy: s.soloWhy ?? ed(row.solo_why),
    soloOptionReasons: s.soloOptionReasons ?? reasons(row.solo_option_reasons),
  };
  for (const stage of fix.voidChecks ?? []) {
    const before = stage === "fade" ? row.fade_problem : row.solo_check;
    const after = stage === "fade" ? content.fadeProblem : content.soloCheck;
    if (before === after) problems.push(`the ${stage} check is voided, so its question must change`);
  }
  const structural = lessonPracticeProblems(content).filter((p) => !LINT_ONLY.some((re) => re.test(p)));
  problems.push(...lessonIntroProblems(content), ...structural);
  return { content, problems };
}

// Distractor-lint messages (lib/content-validator.ts), skipped for a person's correction.
const LINT_ONLY = [/much longer than/, /absolute word/, /all\/none of the above/, /labels itself/, /asks for \d+ but/, /by its position/];

export interface FixOutcome {
  id: string;
  status: "applied" | "would_apply" | "skipped" | "error";
  detail: string;
  objectiveId?: string;
  voidedAnswers?: number;
}

function checkRef(objectiveId: string, stage: "fade" | "solo", question: string): ItemRef {
  return { kind: "lesson", itemId: lessonItemId(objectiveId, stage, question), objectiveId, question };
}

// Writes a lesson over the shared row, whatever is there (a person's
// correction). Same columns as lib/lesson-store.ts saveLesson.
async function overwriteShared(objectiveId: string, c: CorrectedLesson["content"], model: string): Promise<void> {
  const json = (v: unknown) => (v == null ? null : JSON.stringify(v));
  const reasons = (r: string[] | undefined, ch: string[]) => (Array.isArray(r) && r.length === ch.length ? json(r) : null);
  await query(
    `insert into lesson_content
      (objective_id, guess_prompt, teach, fade_problem, fade_choices, fade_correct_index, fade_why,
       solo_check, solo_choices, solo_correct_index, solo_why, fade_option_reasons, solo_option_reasons, teach_cards, model)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     on conflict (objective_id) do update set
       guess_prompt = excluded.guess_prompt, teach = excluded.teach,
       fade_problem = excluded.fade_problem, fade_choices = excluded.fade_choices,
       fade_correct_index = excluded.fade_correct_index, fade_why = excluded.fade_why,
       solo_check = excluded.solo_check, solo_choices = excluded.solo_choices,
       solo_correct_index = excluded.solo_correct_index, solo_why = excluded.solo_why,
       fade_option_reasons = excluded.fade_option_reasons, solo_option_reasons = excluded.solo_option_reasons,
       teach_cards = excluded.teach_cards, model = excluded.model, generated_at = now()`,
    [
      objectiveId,
      c.guessPrompt,
      c.teach,
      c.fadeProblem,
      JSON.stringify(c.fadeChoices),
      c.fadeCorrectIndex,
      c.fadeWhy,
      c.soloCheck,
      JSON.stringify(c.soloChoices),
      c.soloCorrectIndex,
      c.soloWhy,
      reasons(c.fadeOptionReasons, c.fadeChoices),
      reasons(c.soloOptionReasons, c.soloChoices),
      json(c.teachCards),
      model,
    ]
  );
}

async function logReplaced(objectiveId: string, row: LessonRow, why: string): Promise<void> {
  await recordHoldback({ kind: "lesson", objectiveId, reason: "fact_check", claims: [why.slice(0, 500)], content: row, model: row.model });
}

// Applies one fix. `apply` false: report what would happen, change nothing.
export async function applyLessonFix(fix: LessonFix, opts: { apply: boolean }): Promise<FixOutcome> {
  const targets = await lookupFix(fix);
  if (targets.length !== 1) return { id: fix.id, status: "error", detail: `objective matched ${targets.length} rows (want exactly 1)` };
  const [t] = targets;
  const base = { id: fix.id, objectiveId: t.objectiveId };
  if (!t.lesson) return { ...base, status: "skipped", detail: "no stored shared lesson; nothing to fix" };
  const row = t.lesson;
  const text = lessonText(row);
  const missing = (fix.expect ?? []).filter((e) => !text.includes(e));
  if (missing.length) return { ...base, status: "skipped", detail: `stored lesson differs from the audited one (missing: "${missing[0].slice(0, 60)}"); left alone` };
  const tag = `REQ-187 ${fix.id}: ${fix.note}`;

  if (fix.action === "void") {
    const done = await queryOne<{ n: number }>(
      `select count(*)::int as n from item_status where item_kind = 'lesson' and status = 'confirmed_wrong' and item_id = any($1::text[])`,
      [[lessonItemId(t.objectiveId, "fade", row.fade_problem), lessonItemId(t.objectiveId, "solo", row.solo_check)]]
    );
    if ((done?.n ?? 0) === 2) return { ...base, status: "skipped", detail: "already voided" };
    if (!opts.apply) return { ...base, status: "would_apply", detail: "would confirm both checks wrong, void their answers and pull the lesson" };
    let voided = 0;
    voided += await confirmItemWrong(checkRef(t.objectiveId, "fade", row.fade_problem), tag.slice(0, 480));
    voided += await confirmItemWrong(checkRef(t.objectiveId, "solo", row.solo_check), tag.slice(0, 480));
    return { ...base, status: "applied", detail: "both checks confirmed wrong; lesson pulled (regenerated on next visit)", voidedAnswers: voided };
  }

  if (fix.action === "authored") {
    const ctx = await advisingContextFor(t.objectiveId);
    if (!ctx) return { ...base, status: "error", detail: "not a degree-advising objective" };
    if (row.model === AUTHORED_ADVISING_MODEL) return { ...base, status: "skipped", detail: "already authored" };
    const l = authoredAdvisingLesson(ctx);
    if (!opts.apply) return { ...base, status: "would_apply", detail: "would replace the generated lesson with the authored one and remove learners' regenerated copies" };
    await logReplaced(t.objectiveId, row, tag);
    await overwriteShared(t.objectiveId, { ...l, teachCards: l.teachCards ?? null }, AUTHORED_ADVISING_MODEL);
    const removed = await removeOverrides(t.objectiveId);
    return { ...base, status: "applied", detail: `replaced with the authored lesson; ${removed} learner copies removed` };
  }

  if (row.model === `corrected:${fix.id}`) return { ...base, status: "skipped", detail: "already corrected" };
  const corrected = correctedLesson(row, fix);
  if (corrected.problems.length) return { ...base, status: "error", detail: corrected.problems.join(" | ") };
  if (!opts.apply) return { ...base, status: "would_apply", detail: `would correct the lesson${fix.voidChecks?.length ? ` and void answers to the old ${fix.voidChecks.join(" and ")} check` : ""}` };
  let voided = 0;
  for (const stage of fix.voidChecks ?? []) {
    voided += await confirmItemWrong(checkRef(t.objectiveId, stage, stage === "fade" ? row.fade_problem : row.solo_check), tag.slice(0, 480));
  }
  await logReplaced(t.objectiveId, row, tag);
  await overwriteShared(t.objectiveId, corrected.content, `corrected:${fix.id}`);
  return { ...base, status: "applied", detail: "lesson corrected", voidedAnswers: voided };
}

// Learners' own regenerated copies of an advising lesson are generated text
// too; the authored lesson replaces them. Their saved places reset.
async function removeOverrides(objectiveId: string): Promise<number> {
  return withTransaction(async (tx) => {
    const rows = await tx.query<{ user_id: string }>(`delete from lesson_content_overrides where objective_id = $1 returning user_id`, [objectiveId]);
    return rows.length;
  });
}

// Every degree-advising objective that has a stored lesson not yet authored,
// as "authored" fixes (R1).
export async function advisingFixes(): Promise<LessonFix[]> {
  const out: LessonFix[] = [];
  for (const [code, units] of Object.entries(ADVISING_UNITS)) {
    const rows = await query<{ title: string }>(
      `select o.title
         from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
         join lesson_content lc on lc.objective_id = o.id
        where st.user_id is null and upper(st.code) = $1 and cu.title = any($2::text[]) and (o.retired_at is null or o.retired_at > now())
          and lc.model <> $3
        order by cu.sort_order, o.sort_order`,
      [code, units, AUTHORED_ADVISING_MODEL]
    );
    for (const r of rows) {
      out.push({ id: `${code}-advising:${r.title.slice(0, 40)}`, track: code, objective: r.title, action: "authored", note: "degree-advising objective: authored lesson from the plan (audit R1)" });
    }
  }
  return out;
}
