import { query } from "@/lib/db";

// REQ-100: guardrails for "Ask the coach".
//
// The coach must not hand out the answer to an item the learner has not
// answered yet. The server works out which items are open (this file), names
// them to the model -- questions only, never the answer key -- and checks the
// reply against the answer key before it is sent or saved. Learner text is
// fenced so it is read as data, not instructions.

export interface OpenItem {
  // "quiz": an open "Quiz me" question (REQ-110, lib/coach-quiz.ts).
  kind: "lesson" | "pbq" | "review" | "exam" | "quiz";
  label: string; // objective or scenario title
  question: string;
  // Correct option text for a lesson item. Server-side only: used to check
  // the reply, never sent to the model or the app.
  answerKey: string | null;
}

const MAX_ITEMS = 12;
const MAX_QUESTION_CHARS = 400;
const MAX_EXAM_ITEMS = 24;

// Lesson items: the Guided and Solo questions of every lesson this learner
// has opened in the track (lesson_progress), from the lesson they were shown
// (their own regenerated one if any), that they have not answered -- or that
// have an unresolved review entry, so a retest is still pending.
// PBQ items: per unit the scenario the PBQ screen serves (the newest), plus
// any scenario with an unresolved review entry, unless answered correctly.
export async function openItemsFor(userId: string, trackId: string, unitId?: string | null): Promise<OpenItem[]> {
  const lesson = await query<{ kind: "lesson" | "review"; label: string; question: string; answer_key: string | null }>(
    `with lp as (
       select o.id as objective_id, o.title, lp.updated_at,
              case when ov.user_id is not null then ov.fade_problem else lc.fade_problem end as fade_q,
              case when ov.user_id is not null then ov.fade_choices else lc.fade_choices end as fade_c,
              case when ov.user_id is not null then ov.fade_correct_index else lc.fade_correct_index end as fade_i,
              case when ov.user_id is not null then ov.solo_check else lc.solo_check end as solo_q,
              case when ov.user_id is not null then ov.solo_choices else lc.solo_choices end as solo_c,
              case when ov.user_id is not null then ov.solo_correct_index else lc.solo_correct_index end as solo_i
         from lesson_progress lp
         join objectives o on o.id = lp.objective_id
         join course_units cu on cu.id = o.unit_id
         left join lesson_content_overrides ov on ov.user_id = lp.user_id and ov.objective_id = o.id
         left join lesson_content lc on lc.objective_id = o.id
        where lp.user_id = $1 and cu.track_id = $2
     ), items as (
       select objective_id, title, updated_at, 'fade' as stage, fade_q as question, fade_c ->> fade_i as answer_key from lp
       union all
       select objective_id, title, updated_at, 'solo', solo_q, solo_c ->> solo_i from lp
     )
     select case when exists (select 1 from attempts a where a.user_id = $1 and a.objective_id = i.objective_id
                                and a.stage = i.stage and a.question = i.question)
                 then 'review' else 'lesson' end as kind,
            i.title as label, i.question, i.answer_key
       from items i
      where i.question is not null
        and (not exists (select 1 from attempts a where a.user_id = $1 and a.objective_id = i.objective_id
                           and a.stage = i.stage and a.question = i.question)
             or exists (select 1 from error_log e join attempts a on a.id = e.attempt_id
                         where e.user_id = $1 and e.objective_id = i.objective_id and not e.resolved
                           and a.stage = i.stage and a.question = i.question))
      order by i.updated_at desc, i.stage
      limit ${MAX_ITEMS}`,
    [userId, trackId]
  );
  const pbq = await query<{ label: string; question: string; reviewing: boolean }>(
    `select s.title as label, s.scenario as question,
            exists (select 1 from error_log e where e.user_id = $1 and e.pbq_scenario_id = s.id and not e.resolved) as reviewing
       from pbq_scenarios s
       join course_units cu on cu.id = s.unit_id
      where cu.track_id = $2
        and ($3::uuid is null or s.unit_id = $3::uuid)
        and not exists (select 1 from attempts a where a.user_id = $1 and a.pbq_scenario_id = s.id and a.verdict = 'correct')
        and (exists (select 1 from error_log e where e.user_id = $1 and e.pbq_scenario_id = s.id and not e.resolved)
             or s.id = (select s2.id from pbq_scenarios s2 where s2.unit_id = s.unit_id order by s2.generated_at desc limit 1))
      order by s.generated_at desc
      limit 6`,
    [userId, trackId, unitId ?? null]
  );
  // REQ-109: questions in a sprint or mock exam this learner has open (not
  // yet submitted). One entry per right choice, so the reply check catches
  // any of them; ordering/matching items have no single key to check, but
  // are still named so the model holds back.
  const exam = await query<{ label: string; question: string; answer_key: string | null }>(
    `select cu.title as label, i.stem as question, k.key as answer_key
       from exam_sessions s
       join exam_session_items si on si.session_id = s.id
       join exam_items i on i.id = si.item_id
       join course_units cu on cu.id = si.unit_id
       left join lateral (
         select i.body -> 'choices' ->> (c.value)::int as key
           from jsonb_array_elements_text(coalesce(i.answer_key -> 'correct', '[]'::jsonb)) c
       ) k on true
      where s.user_id = $1 and s.track_id = $2 and s.status = 'in_progress'
      order by si.position
      limit ${MAX_EXAM_ITEMS}`,
    [userId, trackId]
  );
  // REQ-108: questions waiting in this learner's open Today's review
  // (prepared, not yet answered): the coach must not answer those either.
  const reviewing = await query<{ label: string; question: string; answer_key: string | null }>(
    `select o.title as label, ri.question, ri.choices ->> ri.correct_index as answer_key
       from review_session_items si
       join review_sessions s on s.id = si.session_id
       join review_items ri on ri.id = si.review_item_id
       join objectives o on o.id = si.objective_id
       join course_units cu on cu.id = o.unit_id
      where s.user_id = $1 and cu.track_id = $2 and si.answered_at is null and s.finished_at is null
        and ($3::uuid is null or cu.id = $3::uuid)
      order by si.position
      limit 6`,
    [userId, trackId, unitId ?? null]
  ).catch(() => []); // before migration 037 the tables are missing; the rest still applies
  return [
    ...exam.map((r) => ({ kind: "exam" as const, label: r.label, question: r.question, answerKey: r.answer_key })),
    ...reviewing.map((r) => ({ kind: "review" as const, label: r.label, question: r.question, answerKey: r.answer_key })),
    ...lesson.map((r) => ({ kind: r.kind, label: r.label, question: r.question, answerKey: r.answer_key })),
    ...pbq.map((r) => ({ kind: r.reviewing ? ("review" as const) : ("pbq" as const), label: r.label, question: r.question, answerKey: null })),
  ];
}

// Learner text inside tags the model is told to treat as data. Tag look-alikes
// inside the text are removed so it cannot close the fence early.
export function fenceLearnerText(text: string): string {
  return `<learner_message>\n${text.replace(/<\/?\s*learner_message\s*>/gi, "")}\n</learner_message>`;
}

const STOP = new Set(
  "about after again also because been before being both does doing each from have here into just like more most only other over same some such than that their them then there these they this those through very what when where which while with would your yours".split(
    " "
  )
);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4 && !STOP.has(t))
  );
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// The open items a message is plainly about: it shares at least half of an
// item's distinctive words, or quotes a long stretch of it.
export function matchOpenItems(message: string, items: OpenItem[]): OpenItem[] {
  const m = tokens(message);
  const flat = normalize(message);
  return items.filter((item) => {
    const q = [...tokens(item.question)].slice(0, 40);
    const shared = q.filter((t) => m.has(t)).length;
    if (q.length >= 3 && shared / q.length >= 0.5) return true;
    const nq = normalize(item.question);
    return nq.length >= 40 && flat.includes(nq.slice(0, 40));
  });
}

// Does the reply state an open item's answer? For an item the message was
// about, any answer key of 4+ characters counts; for the others only long
// keys, so a short common term ("TCP") is not flagged by coincidence.
export function leakedItems(reply: string, items: OpenItem[], matched: OpenItem[]): OpenItem[] {
  const r = ` ${normalize(reply)} `;
  return items.filter((item) => {
    if (!item.answerKey) return false;
    const key = normalize(item.answerKey);
    const min = matched.includes(item) ? 4 : 20;
    return key.length >= min && r.includes(` ${key} `);
  });
}

// Per-request block for the chat system prompt: the open items, questions
// only, and which of them this message is about.
export function openItemsBlock(items: OpenItem[], matched: OpenItem[]): string {
  if (!items.length) return "";
  const kindLabel = {
    lesson: "lesson question, not answered yet",
    pbq: "PBQ, not answered yet",
    review: "pending review retest",
    exam: "question in a practice exam they are taking now",
    quiz: "Quiz me question, not answered yet",
  };
  const list = items
    .map((it, i) => {
      const q = it.question.length > MAX_QUESTION_CHARS ? `${it.question.slice(0, MAX_QUESTION_CHARS)}...` : it.question;
      return `${i + 1}. [${kindLabel[it.kind]}] ${it.label}: ${q.replace(/\s+/g, " ")}`;
    })
    .join("\n");
  const about = matched.length
    ? `\n\nThe learner's new message appears to be about item(s) ${matched
        .map((m) => items.indexOf(m) + 1)
        .join(", ")}. Do not give the answer, the correct option, or a worked solution to it. Give a hint or ask a guiding question instead.`
    : "";
  return `\n\nItems this learner has open right now (graded work they have not answered yet, or a retest they still owe). These are questions only; you were not given their answers:\n${list}${about}`;
}

export const LEAK_RETRY_NOTE =
  "\n\nYour previous draft stated the answer to an open item. Rewrite it: no answer, no correct option, no full solution -- one hint and one guiding question, warmly.";

// Asks the model, checks the reply for an open item's answer, retries once
// with a firmer instruction, and falls back to a hint written here. `ask`
// receives the extra system note for the retry ("" the first time).
export async function guardedReply(
  ask: (extraNote: string) => Promise<string>,
  items: OpenItem[],
  matched: OpenItem[]
): Promise<{ reply: string; leakRetries: number; fellBack: boolean }> {
  const first = await ask("");
  if (!leakedItems(first, items, matched).length) return { reply: first, leakRetries: 0, fellBack: false };
  const second = await ask(LEAK_RETRY_NOTE);
  const leaked = leakedItems(second, items, matched);
  if (!leaked.length) return { reply: second, leakRetries: 1, fellBack: false };
  return { reply: safeHintReply(leaked[0]), leakRetries: 1, fellBack: true };
}

export function safeHintReply(item: OpenItem): string {
  return (
    `That one is still open for you ("${item.label}"), so I'll hold back the answer -- working it out yourself is ` +
    `what makes it stick, and a miss there just tells us what to look at next. Here's a nudge instead: go back to the ` +
    `key idea from the lesson and ask yourself which part of the question it applies to. What's your best guess so far, and why?`
  );
}
