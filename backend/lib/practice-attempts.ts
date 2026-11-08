import type { TxClient } from "@/lib/db";
import { clampClassification } from "@/lib/grading-service";

// REQ-110: answers from "Quiz me" and the placement check.
//
// These go into attempts with an explicit assessment_type (migration 039),
// so the weighted model (031) counts them by that type's row: coach_quiz
// weighs 0, placement weighs as much as a guided step and can never be
// format evidence. They deliberately skip two things recordAttemptTx in
// lib/grading-service.ts does for lesson and PBQ answers:
//   - no error_log entry on a miss: a placement miss is something not yet
//     taught, and a quiz miss is followed straight away by a hint and another
//     try. Neither belongs in the spaced-review queue, and a beginner's
//     placement must not flood Review with things they never studied.
//   - no review-stage advance on a correct answer: these are not the item
//     the review entry is waiting on.
// Mastery is recomputed with mastery_from_attempts, under the same per-
// objective advisory lock live grading takes, so the two cannot interleave.

export interface PracticeAttemptInput {
  userId: string;
  unitId: string | null;
  objectiveId: string;
  stage: "coach_quiz" | "placement";
  assessmentType: "coach_quiz" | "placement";
  question: string;
  answer: string;
  verdict: "correct" | "incorrect";
  feedback?: string | null;
  classification?: string | null;
  // null = unassisted. 'coach' for a quiz first try, 'retry' for a quiz try
  // after a hint (031 leaves retries out of the accuracy entirely).
  assistReason: "coach" | "retry" | null;
  clientAttemptId?: string | null;
}

export async function recordPracticeAttemptTx(tx: TxClient, input: PracticeAttemptInput): Promise<{ id: string }> {
  await tx.query(`select pg_advisory_xact_lock(hashtext($1))`, [`grade:${input.userId}:${input.objectiveId}`]);
  const rows = await tx.query<{ id: string }>(
    `insert into attempts
       (user_id, unit_id, objective_id, kind, stage, format, question, answer, verdict, feedback,
        classification, client_attempt_id, assisted, assist_reason, assessment_type)
     values ($1, $2, $3, 'quiz', $4, 'mc', $5, $6, $7, $8, $9, $10, $11, $12, $13)
     returning id`,
    [
      input.userId,
      input.unitId,
      input.objectiveId,
      input.stage,
      input.question,
      input.answer,
      input.verdict,
      input.feedback ?? null,
      clampClassification(input.classification ?? null),
      input.clientAttemptId ?? null,
      input.assistReason !== null,
      input.assistReason,
      input.assessmentType,
    ]
  );
  await tx.query(
    `insert into mastery (user_id, objective_id, status, score_0_4, evidence, updated_at)
     select $1, $2, m.status, m.score, m.evidence, now() from mastery_from_attempts($1, $2) m
     on conflict (user_id, objective_id) do update set
       status = excluded.status, score_0_4 = excluded.score_0_4, evidence = excluded.evidence, updated_at = now()`,
    [input.userId, input.objectiveId]
  );
  return rows[0];
}
