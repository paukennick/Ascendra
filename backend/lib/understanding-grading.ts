import { queryOne } from "@/lib/db";
import { diagnoseMcMiss, graderDiagnosis, type Diagnosis } from "@/lib/understanding";
import { membersForObjective, recordMisconception } from "@/lib/understanding-store";

// REQ-111: naming the likely misconception behind a missed answer, and
// storing it per learner and objective (learner_misconceptions). Called by
// the graders after the attempt is recorded. Best effort: a failure here is
// logged and returns null; it never fails the grade the learner is waiting on.

export interface DiagnosisView {
  sentence: string;
  confusedWith: string | null;
  conceptSetId: string | null;
}

export function diagnosisView(d: Diagnosis | null): DiagnosisView | null {
  return d ? { sentence: d.sentence, confusedWith: d.confusedWith, conceptSetId: d.conceptSetId } : null;
}

// The lesson's per-option reasons for a stage, read from whichever lesson this
// learner is served (their regenerated one first). The columns
// (fade_option_reasons / solo_option_reasons) come from feat/lesson-experience;
// read through to_jsonb so this works, returning null, before they exist.
export async function optionReasonsForStage(
  userId: string,
  objectiveId: string,
  stage: "fade" | "solo",
  choiceCount: number
): Promise<string[] | null> {
  const row = await queryOne<{ reasons: unknown }>(
    `select (case when ov.user_id is not null then to_jsonb(ov) else to_jsonb(lc) end) -> $3 as reasons
       from (select 1) one
       left join lesson_content_overrides ov on ov.user_id = $1 and ov.objective_id = $2
       left join lesson_content lc on lc.objective_id = $2`,
    [userId, objectiveId, `${stage}_option_reasons`]
  );
  const r = row?.reasons;
  return Array.isArray(r) && r.length === choiceCount && r.every((x) => typeof x === "string") ? (r as string[]) : null;
}

// A missed lesson multiple-choice answer: no model call.
export async function diagnoseLessonMc(params: {
  userId: string;
  objectiveId: string;
  attemptId: string;
  stage: "fade" | "solo";
  choices: string[];
  pickedIndex: number; // stored order
  correctIndex: number; // stored order
}): Promise<DiagnosisView | null> {
  try {
    const obj = await queryOne<{ title: string }>(`select title from objectives where id = $1`, [params.objectiveId]);
    const reasons = await optionReasonsForStage(params.userId, params.objectiveId, params.stage, params.choices.length);
    const d = diagnoseMcMiss({
      objectiveTitle: obj?.title ?? "",
      picked: params.choices[params.pickedIndex] ?? "",
      correct: params.choices[params.correctIndex] ?? "",
      pickedReason: reasons?.[params.pickedIndex] ?? null,
      members: await membersForObjective(params.objectiveId),
    });
    await recordMisconception(params.userId, params.objectiveId, params.attemptId, d);
    return diagnosisView(d);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[understanding] mc diagnosis failed:", (err as Error).message);
    return null;
  }
}

// A free-response answer (lesson check or explain-back): the grader's own tag.
export async function recordGraderMisconception(params: {
  userId: string;
  objectiveId: string;
  attemptId: string;
  verdict: string;
  misconception?: string | null;
  confusedWith?: string | null;
}): Promise<DiagnosisView | null> {
  if (params.verdict === "correct") return null;
  try {
    const d = graderDiagnosis(params.misconception, params.confusedWith, await membersForObjective(params.objectiveId));
    if (!d) return null;
    await recordMisconception(params.userId, params.objectiveId, params.attemptId, d);
    return diagnosisView(d);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[understanding] grader misconception failed:", (err as Error).message);
    return null;
  }
}
