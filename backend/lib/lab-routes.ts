import { consumeGradedAnswer } from "@/lib/ai-access";
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
import {
  LABS_FEATURE,
  LabError,
  checkRunStep,
  hasRun,
  interactiveAnswerProblem,
  labAccess,
  labAnswers,
  recordStep,
  replayStep,
  visibleLab,
  type LabAccess,
  type LabRow,
  type SubmitInput,
} from "@/lib/labs";
import { consumeAllowance, requireCourseAccess, requireFeature, tierForCourse } from "@/lib/entitlements";
import { requireStudyNotice } from "@/lib/study-notice";

// REQ-123: the lab routes' shared error mapping and the submit flow, kept
// out of the route files so lib/labs.dbtest.ts drives exactly what runs.

export function labRouteError(err: unknown) {
  if (err instanceof AuthError) return unauthorized(err.message);
  if (err instanceof AcknowledgementError) return forbidden(err.message, err.extra);
  if (err instanceof LabError) return NextResponse.json({ error: err.message }, { status: err.status });
  if (err instanceof GradingInProgressError) return NextResponse.json({ error: err.message }, { status: 409 });
  return serverError(err);
}

// Nick, 2026-11-07 (decisions 6 and 10). Labs are Pro; Free and Plus open
// their course's one sample lab (lib/labs.ts labAccess). What each lab route
// lets through:
//   - "view" (GET /api/labs/:id): the lab when it is open to the learner, or
//     any lab they have already run -- their own results stay readable, and
//     an open run can be finished after the plan changes.
//   - "resume" (POST runs without restart): an open run comes back whatever
//     the plan; with no open run it is a start.
//   - "start" (POST runs with restart): needs full or sample access.
// Free also studies one course (requireCourseAccess), except to finish or
// read a run already started. With billing off every check returns at once.
export async function gateLab(userId: string, lab: LabRow, mode: "view" | "resume" | "start"): Promise<LabAccess> {
  const access = await labAccess(userId, lab);
  const runs = mode === "start" ? { any: false, open: false } : await hasRun(userId, lab.id);
  const continuing = mode === "view" ? runs.any : runs.open;
  if (!continuing) {
    await requireCourseAccess(userId, lab.track_id);
    if (access === "locked") await requireFeature(userId, LABS_FEATURE, lab.track_id);
  }
  return access;
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
  model?: LabStepModel,
  opts: { interactive?: boolean } = {}
) {
  if (!isUuid(labId)) throw new LabError(404, "Lab not found");
  const b = body ?? {};
  if (!isUuid(b.runId)) throw new LabError(400, "runId is required (start a run first)");
  if (!Number.isInteger(b.step) || (b.step as number) < 0 || (b.step as number) > 3) throw new LabError(400, "step must be 0-3");
  const lab = await visibleLab(labId, userId);
  if (!lab) throw new LabError(404, "Lab not found");
  await requireAcknowledgementForObjective(lab.objective_id, userId);
  // REQ-165: a clinical or fitness lab needs the study notice (403 until
  // then), checked here and not only in the app. REQ-205 (FAIL-907): every
  // lab does, because every lab step sends the learner's answers to the model.
  await requireStudyNotice(userId);
  const step = b.step as number;
  if (step >= lab.steps.length) throw new LabError(400, `This lab has ${lab.steps.length} step${lab.steps.length === 1 ? "" : "s"}`);
  const parts = lab.rubric[step]?.parts ?? [];
  const answers = labAnswers(b.answers, parts.length);
  if (typeof answers === "string") throw new LabError(400, answers);
  // REQ-189: a structured answer must name only its part's own options.
  const badChoice = interactiveAnswerProblem(parts, answers);
  if (badChoice) throw new LabError(400, badChoice);
  const input: SubmitInput = {
    userId,
    lab,
    runId: b.runId as string,
    step,
    answers,
    clientAttemptId: validClientAttemptId(b.clientAttemptId),
    interactive: opts.interactive === true,
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
    // Decision 9 extended to sample labs: a graded lab step counts against
    // the daily graded-answer allowance on a tier that has a count (Free);
    // given back if grading fails. At the limit the run stays open for later.
    // REQ-170: the count that applies is the learner's tier on this course.
    const use = await consumeGradedAnswer(userId, async () => consumeAllowance(userId, "graded_answer", await tierForCourse(userId, lab.track_id))); // REQ-201
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
    ).catch(async (err) => {
      await use.release();
      throw err;
    });
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
