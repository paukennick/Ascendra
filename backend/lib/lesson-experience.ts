import { createHash } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { cleanLabQuestions, labQuestionsPrompt, labQuestionsSchema } from "@/lib/prompts";
import type { CoachContext } from "@/lib/coach-context";

// REQ-106: server side of the lesson-experience upgrades -- the learner
// history the adaptive Guided suggestion reads, and the lab report questions.

// ---------------------------------------------------------------------------
// Adaptive fading (research #12). Read-only: mastery and attempts are only
// read here. The level itself is decided elsewhere (mastery_from_attempts),
// and this file must not change it.
//
//   strong  the stored level is Independent or Transfer-ready
//   none    no graded answer on this objective and no level above Not started
//   some    anything else
// ---------------------------------------------------------------------------
export type LearnerHistory = "none" | "some" | "strong";

export function classifyHistory(status: string | null | undefined, gradedAnswers: number): LearnerHistory {
  if (status === "Independent" || status === "Transfer-ready") return "strong";
  if (gradedAnswers === 0 && (!status || status === "Not started")) return "none";
  return "some";
}

export async function learnerHistoryFor(userId: string, objectiveId: string): Promise<LearnerHistory> {
  const row = await queryOne<{ status: string | null; n: string }>(
    `select (select status::text from mastery where user_id = $1 and objective_id = $2) as status,
            (select count(*) from attempts where user_id = $1 and objective_id = $2 and verdict is not null) as n`,
    [userId, objectiveId]
  );
  return classifyHistory(row?.status ?? null, Number(row?.n ?? 0));
}

// ---------------------------------------------------------------------------
// Lab report questions (research #7). Generated once per objective and lab
// text with the fast model, stored in lab_report_questions (migration 035)
// and shared by every learner, so the cost is per objective, not per learner.
// ---------------------------------------------------------------------------
export function labPromptHash(labPrompt: string): string {
  return createHash("md5").update(labPrompt).digest("hex");
}

export interface LabQuestionGenerator {
  (params: { objectiveTitle: string; labPrompt: string; ctx?: CoachContext }): Promise<{ questions: string[]; model: string }>;
}

export const claudeLabQuestions: LabQuestionGenerator = async (params) => {
  const { system, user } = labQuestionsPrompt(params);
  const model = getFastModel();
  const out = await callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: labQuestionsSchema,
    maxTokens: 400,
    model,
    effort: "low",
    thinking: "off",
    purpose: "lab_questions",
  });
  return { questions: out.questions, model };
};

// Two learners opening the same lab at once share one generation in this
// process; across instances the insert below keeps the first stored row.
const pendingLabQuestions = new Map<string, Promise<string[]>>();

export async function labQuestionsFor(
  objectiveId: string,
  objectiveTitle: string,
  labPrompt: string,
  ctx?: CoachContext,
  generate: LabQuestionGenerator = claudeLabQuestions
): Promise<string[]> {
  const hash = labPromptHash(labPrompt);
  const stored = await queryOne<{ questions: unknown }>(
    `select questions from lab_report_questions where objective_id = $1 and prompt_hash = $2`,
    [objectiveId, hash]
  );
  if (stored) return cleanLabQuestions(stored.questions);

  const key = `${objectiveId}:${hash}`;
  const inFlight = pendingLabQuestions.get(key);
  if (inFlight) return inFlight;
  const run = (async () => {
    const { questions, model } = await generate({ objectiveTitle, labPrompt, ctx });
    const clean = cleanLabQuestions(questions);
    // A changed lab text replaces the old questions; the same text never
    // replaces questions another instance already stored.
    const rows = await query<{ questions: unknown }>(
      `insert into lab_report_questions (objective_id, prompt_hash, questions, model)
       values ($1, $2, $3, $4)
       on conflict (objective_id) do update
         set prompt_hash = excluded.prompt_hash, questions = excluded.questions,
             model = excluded.model, generated_at = now()
         where lab_report_questions.prompt_hash <> excluded.prompt_hash
       returning questions`,
      [objectiveId, hash, JSON.stringify(clean), model]
    );
    if (rows[0]) return cleanLabQuestions(rows[0].questions);
    const again = await queryOne<{ questions: unknown }>(
      `select questions from lab_report_questions where objective_id = $1`,
      [objectiveId]
    );
    return again ? cleanLabQuestions(again.questions) : clean;
  })();
  pendingLabQuestions.set(key, run);
  try {
    return await run;
  } finally {
    pendingLabQuestions.delete(key);
  }
}

export interface LabObjective {
  id: string;
  title: string;
  unit_id: string;
  lab_prompt: string | null;
}

export async function labObjective(objectiveId: string): Promise<LabObjective | null> {
  return queryOne<LabObjective>(`select id, title, unit_id, lab_prompt from objectives where id = $1`, [objectiveId]);
}

// The learner's most recent lab report for this objective, so the Done card
// can show it again instead of asking for a second report.
export async function latestLabReport(userId: string, objectiveId: string) {
  return queryOne<Record<string, unknown>>(
    `select id, question, answer, verdict, feedback, missed_parts, model_answer, fix_next, created_at
       from attempts where user_id = $1 and lab_objective_id = $2 and kind = 'lab'
      order by created_at desc, id desc limit 1`,
    [userId, objectiveId]
  );
}

// Validates the learner's report answers against the questions they were
// shown: one string per question, at least one non-blank, each bounded.
export const MAX_LAB_ANSWER = 2000;
export function labAnswersFor(answers: unknown, questionCount: number): string[] | string {
  if (!Array.isArray(answers) || answers.length !== questionCount) {
    return `answers must be a list of ${questionCount} strings, one per question`;
  }
  if (!answers.every((a) => typeof a === "string")) return "every answer must be a string";
  if (!answers.some((a) => (a as string).trim())) return "answer at least one question";
  if (answers.some((a) => (a as string).length > MAX_LAB_ANSWER)) {
    return `each answer must be at most ${MAX_LAB_ANSWER} characters`;
  }
  return answers as string[];
}

// What the app is sent for a stored lab report.
export function reportShape(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    attemptId: row.id,
    question: row.question,
    answer: row.answer,
    verdict: row.verdict,
    feedback: row.feedback ?? "",
    missedParts: Array.isArray(row.missed_parts) ? row.missed_parts : [],
    modelAnswer: row.model_answer ?? null,
    fixNext: row.fix_next ?? null,
    createdAt: row.created_at,
  };
}
