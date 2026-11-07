import { query, queryOne, withTransaction } from "@/lib/db";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { coachQuizPrompt, coachQuizSchema, type CoachQuizItem } from "@/lib/prompts";
import { coachContextForObjective } from "@/lib/coach-context";
import { presentationOrder, presentationSeed, shownIndexOf, shuffleForPresentation, storedIndexAt } from "@/lib/choice-order";
import { recordPracticeAttemptTx } from "@/lib/practice-attempts";
import { weakSpotsFor, type WeakSpot } from "@/lib/learner-profile";

// REQ-110 (research #8): "Quiz me on my weak spots".
//
// The coach asks a short question on one of the learner's weakest objectives
// and grades it on the server (by index; no AI call to grade). A miss gets a
// graded hint -- a nudge, then a sharper one -- and another try; the answer is
// shown only after the third miss, when the item is no longer open. Answers
// are recorded as assessment_type coach_quiz (weight 0, migration 039): the
// first try with assist_reason 'coach', tries after a hint as 'retry'. So
// quizzing is real retrieval practice, kept in the learner's history, that
// never counts as unassisted evidence.
//
// Cost: one fast-model call per NEW question, and questions are shared per
// objective, so most quizzes reuse one already written. Answering is free.

export const MAX_TRIES = 3;
const STAGE = "coach_quiz";

export interface QuizItemRow {
  id: string;
  objective_id: string;
  question: string;
  choices: string[];
  correct_index: number;
  hints: string[];
  explanation: string;
}

interface TurnRow {
  id: string;
  user_id: string;
  track_id: string;
  item_id: string;
  tries: number;
  status: "open" | "correct" | "revealed";
}

export interface PresentedTurn {
  id: string;
  objectiveId: string;
  objectiveTitle: string;
  unitId: string;
  question: string;
  choices: string[];
  tries: number;
  maxTries: number;
  status: TurnRow["status"];
  hints: string[];
  // Only once the item is closed (answered correctly or revealed).
  correctIndex: number | null;
  explanation: string | null;
}

const normalize = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Does a hint give the answer away? Same test as the chat guard: the correct
// option's text appears in it (options shorter than 4 characters, such as
// "TCP", are too common to judge this way).
export function hintLeaks(hint: string, answer: string): boolean {
  const key = normalize(answer);
  return key.length >= 4 && ` ${normalize(hint)} `.includes(` ${key} `);
}

export const FALLBACK_HINTS = [
  "Go back to the core definition from the lesson. Which option fits it exactly, not just roughly?",
  "Look at the option you picked: which word in the question does it not account for? Rule that one out and compare the rest.",
];

export function safeHints(item: Pick<CoachQuizItem, "hints" | "choices" | "correctIndex">): string[] {
  const answer = item.choices[item.correctIndex] ?? "";
  return [0, 1].map((i) => {
    const h = item.hints[i];
    return h && h.trim() && !hintLeaks(h, answer) ? h : FALLBACK_HINTS[i];
  });
}

// Encouraging, mistake-as-information wording for each outcome. Pure.
export function quizFeedback(params: {
  correct: boolean;
  tries: number;
  hints: string[];
  correctText: string;
  explanation: string;
}): { message: string; status: TurnRow["status"] } {
  const { correct, tries, hints, correctText, explanation } = params;
  if (correct) {
    return {
      status: "correct",
      message:
        tries <= 1
          ? `Yes, that's it. ${explanation}`
          : `There it is. Working it out from a hint is exactly how it sticks. ${explanation}`,
    };
  }
  if (tries >= MAX_TRIES) {
    return {
      status: "revealed",
      message:
        `Here's the answer so it isn't left hanging: "${correctText}". ${explanation} ` +
        `That miss is useful information, not a verdict: this objective stays on your weak-spot list, so it will come round again.`,
    };
  }
  const hint = hints[Math.min(tries, hints.length) - 1] ?? FALLBACK_HINTS[0];
  return {
    status: "open",
    message:
      tries === 1
        ? `Not quite, and that's useful: it shows where to look. Hint: ${hint} Have another go.`
        : `Closer. Here's a sharper hint: ${hint} One more try.`,
  };
}

function orderFor(userId: string, objectiveId: string, question: string, n: number): number[] {
  return presentationOrder(presentationSeed(userId, objectiveId, STAGE, question), n);
}

export function presentTurn(userId: string, turn: TurnRow, item: QuizItemRow, objectiveTitle: string, unitId: string): PresentedTurn {
  const order = orderFor(userId, item.objective_id, item.question, item.choices.length);
  const closed = turn.status !== "open";
  const shownHints = safeHints({ hints: item.hints, choices: item.choices, correctIndex: item.correct_index }).slice(
    0,
    closed ? 0 : Math.min(turn.tries, 2)
  );
  return {
    id: turn.id,
    objectiveId: item.objective_id,
    objectiveTitle,
    unitId,
    question: item.question,
    choices: shuffleForPresentation(item.choices, order),
    tries: turn.tries,
    maxTries: MAX_TRIES,
    status: turn.status,
    hints: shownHints,
    correctIndex: closed ? shownIndexOf(order, item.correct_index) : null,
    explanation: closed ? item.explanation : null,
  };
}

async function loadTurn(userId: string, turnId: string) {
  return queryOne<TurnRow & QuizItemRow & { item_objective: string; objective_title: string; unit_id: string }>(
    `select t.id, t.user_id, t.track_id, t.item_id, t.tries, t.status,
            i.objective_id, i.question, i.choices, i.correct_index, i.hints, i.explanation,
            o.title as objective_title, o.unit_id
       from coach_quiz_turns t
       join coach_quiz_items i on i.id = t.item_id
       join objectives o on o.id = i.objective_id
      where t.id = $1 and t.user_id = $2`,
    [turnId, userId]
  );
}

function split(row: NonNullable<Awaited<ReturnType<typeof loadTurn>>>): { turn: TurnRow; item: QuizItemRow } {
  return {
    turn: { id: row.id, user_id: row.user_id, track_id: row.track_id, item_id: row.item_id, tries: row.tries, status: row.status },
    item: {
      id: row.item_id,
      objective_id: row.objective_id,
      question: row.question,
      choices: row.choices,
      correct_index: row.correct_index,
      hints: row.hints,
      explanation: row.explanation,
    },
  };
}

// Which weak objective to ask about: the one quizzed least in the last day,
// ties going to the weaker one, so a session moves across the weak spots
// instead of drilling one.
export function pickObjective(weak: WeakSpot[], recentTurns: Map<string, number>): WeakSpot | null {
  let best: WeakSpot | null = null;
  let bestCount = Infinity;
  for (const w of weak) {
    const n = recentTurns.get(w.objectiveId) ?? 0;
    if (n < bestCount) {
      best = w;
      bestCount = n;
    }
  }
  return best;
}

export type GenerateQuizItem = (objectiveId: string, userId: string) => Promise<CoachQuizItem>;

export const generateQuizItem: GenerateQuizItem = async (objectiveId, userId) => {
  const o = await queryOne<{ title: string; unit_title: string; track_title: string }>(
    `select o.title, cu.title as unit_title, st.title as track_title
       from objectives o join course_units cu on cu.id = o.unit_id join subject_tracks st on st.id = cu.track_id
      where o.id = $1`,
    [objectiveId]
  );
  if (!o) throw new Error("objective not found");
  const ctx = await coachContextForObjective(objectiveId);
  const { system, user } = coachQuizPrompt({
    trackTitle: o.track_title,
    unitTitle: o.unit_title,
    objectiveTitle: o.title,
    ctx: ctx ?? undefined,
  });
  return callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: coachQuizSchema,
    maxTokens: 900,
    model: getFastModel(),
    effort: "low",
    thinking: "off",
    purpose: "coach_quiz",
    userId,
  });
};

export type NextQuizResult =
  | { status: "ok"; turn: PresentedTurn; generated: boolean }
  | { status: "no_weak_spots" };

// Resume the learner's open quiz question in this course, or start a new one.
export async function nextQuizTurn(
  userId: string,
  trackId: string,
  opts: { generate?: GenerateQuizItem; beforeGenerate?: () => Promise<void> } = {}
): Promise<NextQuizResult> {
  const open = await queryOne<{ id: string }>(
    `select id from coach_quiz_turns where user_id = $1 and track_id = $2 and status = 'open'
      order by created_at desc limit 1`,
    [userId, trackId]
  );
  if (open) {
    const row = (await loadTurn(userId, open.id))!;
    const { turn, item } = split(row);
    return { status: "ok", turn: presentTurn(userId, turn, item, row.objective_title, row.unit_id), generated: false };
  }

  const weak = await weakSpotsFor(userId, trackId);
  if (!weak.length) return { status: "no_weak_spots" };
  const recent = await query<{ objective_id: string; n: number }>(
    `select i.objective_id, count(*)::int as n
       from coach_quiz_turns t join coach_quiz_items i on i.id = t.item_id
      where t.user_id = $1 and t.track_id = $2 and t.created_at > now() - interval '1 day'
      group by i.objective_id`,
    [userId, trackId]
  );
  const target = pickObjective(weak, new Map(recent.map((r) => [r.objective_id, r.n])))!;

  let item = await queryOne<QuizItemRow>(
    `select i.* from coach_quiz_items i
      where i.objective_id = $1
        and not exists (select 1 from coach_quiz_turns t where t.user_id = $2 and t.item_id = i.id)
      order by i.generated_at asc limit 1`,
    [target.objectiveId, userId]
  );
  let generated = false;
  if (!item) {
    await opts.beforeGenerate?.();
    const made = await (opts.generate ?? generateQuizItem)(target.objectiveId, userId);
    if (!Array.isArray(made.choices) || made.choices.length !== 4 || made.correctIndex < 0 || made.correctIndex > 3) {
      throw new Error("quiz item has the wrong shape");
    }
    item = await queryOne<QuizItemRow>(
      `insert into coach_quiz_items (objective_id, question, choices, correct_index, hints, explanation, model)
       values ($1, $2, $3, $4, $5, $6, $7) returning *`,
      [
        target.objectiveId,
        made.question,
        JSON.stringify(made.choices),
        made.correctIndex,
        JSON.stringify(safeHints(made)),
        made.explanation,
        getFastModel(),
      ]
    );
    generated = true;
  }
  // unique (user_id, item_id): a double tap that raced past the open-turn
  // check gets the turn the first request created.
  const turn = await queryOne<TurnRow>(
    `insert into coach_quiz_turns (user_id, track_id, item_id) values ($1, $2, $3)
     on conflict (user_id, item_id) do update set updated_at = coach_quiz_turns.updated_at
     returning *`,
    [userId, trackId, item!.id]
  );
  return { status: "ok", turn: presentTurn(userId, turn!, item!, target.title, target.unitId), generated };
}

export type AnswerQuizResult =
  | { status: "ok"; turn: PresentedTurn; correct: boolean; message: string; replayed: boolean }
  | { status: "not_found" }
  | { status: "closed"; turn: PresentedTurn }
  | { status: "bad_choice" };

export async function answerQuizTurn(
  userId: string,
  turnId: string,
  shownIndex: unknown,
  clientAttemptId: string | null
): Promise<AnswerQuizResult> {
  const pre = await loadTurn(userId, turnId);
  if (!pre) return { status: "not_found" };

  return withTransaction(async (tx) => {
    const locked = await tx.queryOne<TurnRow>(`select * from coach_quiz_turns where id = $1 and user_id = $2 for update`, [
      turnId,
      userId,
    ]);
    if (!locked) return { status: "not_found" as const };
    const { item } = split(pre);
    const current = () => presentTurn(userId, locked, item, pre.objective_title, pre.unit_id);

    // A retried submit: the stored answer stands, and the current state comes back.
    if (clientAttemptId) {
      const prior = await tx.queryOne<{ verdict: string; feedback: string | null }>(
        `select verdict, feedback from attempts where user_id = $1 and client_attempt_id = $2`,
        [userId, clientAttemptId]
      );
      if (prior) {
        return { status: "ok" as const, turn: current(), correct: prior.verdict === "correct", message: prior.feedback ?? "", replayed: true };
      }
    }
    if (locked.status !== "open") return { status: "closed" as const, turn: current() };

    const order = orderFor(userId, item.objective_id, item.question, item.choices.length);
    const stored = storedIndexAt(order, shownIndex);
    if (stored === null) return { status: "bad_choice" as const };
    const correct = stored === item.correct_index;
    const tries = locked.tries + 1;
    const hints = safeHints({ hints: item.hints, choices: item.choices, correctIndex: item.correct_index });
    const fb = quizFeedback({ correct, tries, hints, correctText: item.choices[item.correct_index], explanation: item.explanation });

    await recordPracticeAttemptTx(tx, {
      userId,
      unitId: pre.unit_id,
      objectiveId: item.objective_id,
      stage: "coach_quiz",
      assessmentType: "coach_quiz",
      question: item.question,
      answer: item.choices[stored],
      verdict: correct ? "correct" : "incorrect",
      feedback: fb.message,
      classification: correct ? "none" : "coach quiz miss",
      assistReason: tries === 1 ? "coach" : "retry",
      clientAttemptId,
    });
    const updated = await tx.queryOne<TurnRow>(
      `update coach_quiz_turns set tries = $2, status = $3, updated_at = now() where id = $1 returning *`,
      [turnId, tries, fb.status]
    );
    return {
      status: "ok" as const,
      turn: presentTurn(userId, updated!, item, pre.objective_title, pre.unit_id),
      correct,
      message: fb.message,
      replayed: false,
    };
  });
}
