import { NextResponse } from "next/server";
import { ok, unauthorized, forbidden, serverError } from "@/lib/http";
import { AuthError } from "@/lib/auth/requireUser";
import { AcknowledgementError, requireAcknowledgementForObjective } from "@/lib/auth/requireAcknowledgement";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { withGradingClaim, GradingInProgressError } from "@/lib/grading-claims";
import { coachContextForObjective } from "@/lib/coach-context";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { isUuid } from "@/lib/visibility";
import { flagItem } from "@/lib/item-quality";
import { inBackground } from "@/lib/understanding-ai";
import { KEY_SUSPECT } from "@/lib/prompts";
import { gradeLabStep, labSafetyFamily, type LabStepModel } from "@/lib/lab-grading";
import { LabError, checkRunStep, labAnswers, recordStep, replayStep, visibleLab, type SubmitInput } from "@/lib/labs";

// REQ-123: the lab routes' shared error mapping and the submit flow, kept
// out of the route files so lib/labs.dbtest.ts drives exactly what runs.

export function labRouteError(err: unknown) {
  if (err instanceof AuthError) return unauthorized(err.message);
  if (err instanceof AcknowledgementError) return forbidden(err.message);
  if (err instanceof LabError) return NextResponse.json({ error: err.message }, { status: err.status });
  if (err instanceof GradingInProgressError) return NextResponse.json({ error: err.message }, { status: 409 });
  return serverError(err);
}

// Grading a lab is NOT under requireAiBudget, like every other grader
// (lib/ai-budget.ts: grading is cheap, rate-limited and the core of
// learning); it still counts toward the learner's daily total. The rate
// limit below bounds a burst: 40 graded steps in 10 minutes.
export const LAB_GRADE_LIMIT = { max: 40, windowMinutes: 10 } as const;

// POST /api/labs/:id/submit -- body { runId, step, answers: string[], clientAttemptId? }.
// Order matters: validation and visibility, then a resend of an id already
// graded is answered from the stored result (before the rate limit and the
// model call), then the run/step check for a NEW submission, then one
// grading call per submission (withGradingClaim), then the write.
export async function submitLab(
  userId: string,
  labId: string,
  body: Record<string, unknown> | null,
  model?: LabStepModel
) {
  if (!isUuid(labId)) throw new LabError(404, "Lab not found");
  const b = body ?? {};
  if (!isUuid(b.runId)) throw new LabError(400, "runId is required (start a run first)");
  if (!Number.isInteger(b.step) || (b.step as number) < 0 || (b.step as number) > 3) throw new LabError(400, "step must be 0-3");
  const lab = await visibleLab(labId, userId);
  if (!lab) throw new LabError(404, "Lab not found");
  await requireAcknowledgementForObjective(lab.objective_id, userId);
  const step = b.step as number;
  if (step >= lab.steps.length) throw new LabError(400, `This lab has ${lab.steps.length} step${lab.steps.length === 1 ? "" : "s"}`);
  const parts = lab.rubric[step]?.parts ?? [];
  const answers = labAnswers(b.answers, parts.length);
  if (typeof answers === "string") throw new LabError(400, answers);
  const input: SubmitInput = {
    userId,
    lab,
    runId: b.runId as string,
    step,
    answers,
    clientAttemptId: validClientAttemptId(b.clientAttemptId),
  };

  const replayed = await replayStep(input);
  if (replayed) return replayed;
  await checkRunStep(input);

  const gradeAndRecord = async () => {
    try {
      await consumeRateLimit("lab_grade", userId, LAB_GRADE_LIMIT, { userId });
    } catch (err) {
      if (err instanceof RateLimitError) throw new LabError(429, err.message);
      throw err;
    }
    const ctx = (await coachContextForObjective(lab.objective_id)) ?? undefined;
    const graded = await gradeLabStep(
      {
        labTitle: lab.title,
        brief: lab.brief,
        priorSteps: lab.steps.slice(0, step),
        step: lab.steps[step],
        stepIndex: step,
        stepCount: lab.steps.length,
        parts,
        answers,
        family: labSafetyFamily(ctx),
        ctx,
        userId,
      },
      model
    );
    const result = await recordStep(input, graded);
    // The grader judged the lab's own rubric wrong: that is this learner's
    // flag on the lab, and enough of them pull it for a person to check.
    if (!result.replayed && graded.classification === KEY_SUSPECT) {
      const ref = { kind: "lab" as const, itemId: lab.id, objectiveId: lab.objective_id, question: lab.title };
      inBackground(() => flagItem(ref, { userId, source: "key_suspect" }).catch(() => null));
    }
    return result;
  };
  return withGradingClaim(userId, input.clientAttemptId, gradeAndRecord, () => replayStep(input));
}

export function labResponse(data: unknown) {
  return ok(data);
}
