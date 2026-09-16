import { query } from "@/lib/db";
import {
  accuracyFromAttempts,
  suggestStatus,
  statusToScore,
  toDateOnlyString,
} from "@/lib/mastery";

export interface AttemptInput {
  userId: string;
  unitId?: string | null;
  objectiveId?: string | null;
  pbqScenarioId?: string | null;
  kind: "lesson" | "quiz" | "pbq" | "unitcheck" | "lab";
  stage?: string | null;
  format: "mc" | "open" | "pbq";
  question: string;
  answer: string;
  verdict: "correct" | "partial" | "incorrect";
  feedback?: string | null;
  classification?: string | null;
  missedParts?: string[] | null;
  confidence?: number | null;
}

export async function recordAttemptAndUpdateMastery(input: AttemptInput) {
  const userId = input.userId;

  const attemptRows = await query(
    `insert into attempts
      (user_id, unit_id, objective_id, pbq_scenario_id, kind, stage, format, question, answer,
       verdict, feedback, classification, missed_parts, confidence)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     returning *`,
    [
      userId,
      input.unitId ?? null,
      input.objectiveId ?? null,
      input.pbqScenarioId ?? null,
      input.kind,
      input.stage ?? null,
      input.format,
      input.question,
      input.answer,
      input.verdict,
      input.feedback ?? null,
      input.classification ?? null,
      input.missedParts ? JSON.stringify(input.missedParts) : null,
      input.confidence ?? null,
    ]
  );
  const attempt = attemptRows[0];

  // Update mastery only when the attempt is tied to a specific objective (PBQs are
  // tied to a unit, not one objective, so they don't directly drive per-objective mastery).
  if (input.objectiveId) {
    const priorAttempts = await query<{ verdict: string | null }>(
      `select verdict from attempts where user_id = $1 and objective_id = $2 and format != 'pbq'`,
      [userId, input.objectiveId]
    );
    const acc = accuracyFromAttempts(priorAttempts);
    const newStatus = suggestStatus({
      acc,
      lastFormat: input.format === "pbq" ? "open" : input.format,
      lastVerdict: input.verdict,
    });
    const score = statusToScore(newStatus);
    await query(
      `insert into mastery (user_id, objective_id, status, score_0_4, evidence, updated_at)
       values ($1,$2,$3,$4,$5, now())
       on conflict (user_id, objective_id) do update set
         status = excluded.status, score_0_4 = excluded.score_0_4, evidence = excluded.evidence, updated_at = now()`,
      [
        userId,
        input.objectiveId,
        newStatus,
        score,
        `${input.kind}/${input.stage ?? input.format} on ${new Date().toISOString().slice(0, 10)}: ${input.verdict}`,
      ]
    );
  }

  // Any non-correct verdict goes into the spaced-review error log (1/7/21 days out),
  // seeded with review_stage 0 (first review due in 1 day).
  if (input.verdict !== "correct") {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    await query(
      `insert into error_log
        (user_id, unit_id, objective_id, attempt_id, topic, error_text, why, classification, review_stage, next_review_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,0,$9)`,
      [
        userId,
        input.unitId ?? null,
        input.objectiveId ?? null,
        attempt.id,
        input.question.slice(0, 200),
        input.answer,
        input.feedback ?? null,
        input.classification ?? null,
        toDateOnlyString(next),
      ]
    );
  }

  return attempt;
}
