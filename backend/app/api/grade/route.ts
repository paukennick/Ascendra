import { ok, badRequest, notFound, unauthorized, forbidden, tooManyRequests, conflict, serverError, readJson } from "@/lib/http";
import { requireStudyNotice } from "@/lib/study-notice";
import { gradeFreeResponse } from "@/lib/free-response-grader";
import {
  findClientAttempt,
  hasHintReveal,
  isDuplicateRetry,
  lessonCheckFor,
  recordAttemptIdempotent,
  retryTargetFor,
  sameAttempt,
  IdempotencyConflictError,
  type AttemptIdentity,
  type LessonCheck,
} from "@/lib/grading-service";
import { ALREADY_REVISED, retryRefusal } from "@/lib/revision";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { visibleObjective, normUuid } from "@/lib/visibility";
import { textField, TEXT_LIMITS } from "@/lib/text-input";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireAcknowledgementForObjective, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { coachContextForObjective } from "@/lib/coach-context";
import {
  presentationOrder,
  presentationSeed,
  shownIndexOf,
  shuffleForPresentation,
  storedIndexAt,
} from "@/lib/choice-order";
import { storedIndexOfText } from "@/lib/lesson-choices";
import { diagnoseLessonMc, recordGraderMisconception } from "@/lib/understanding-grading";
import { KEY_SUSPECT } from "@/lib/prompts";
import { flagItem, lessonItemId } from "@/lib/item-quality";
import { inBackground } from "@/lib/understanding-ai";
import { withGradingClaim, GradingInProgressError } from "@/lib/grading-claims";
import { consumeAllowance, requireCourseAccess } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// POST /api/grade -- grades one answer to a lesson's Guided ("fade") or Solo
// ("solo") check and records the attempt, the mastery update and (if not
// correct) a spaced-review entry. PBQs have their own route (/api/pbq).
//
// REQ-134: grading is entirely server-side. The question, the teaching text
// and the answer key come from the lesson this learner was shown; the app
// sends only which check it is and its answer. Fields older clients send
// (question, taughtText, correctIndex, chosenText, why) are ignored. The
// answer key and explanation are returned only with the verdict.
//
//   { clientAttemptId?, format: "mc",   objectiveId, stage, chosenIndex, confidence? }
//   { clientAttemptId?, format: "open", objectiveId, stage, answer,      confidence?, retryOf? }
//
// chosenIndex is a position in the order the choices were shown, which is
// this learner's fixed shuffle (lib/choice-order.ts).
//
// REQ-105: retryOf is the id of this learner's missed free-response attempt
// on the same check. The answer is a revision written with that attempt's
// feedback and model answer on screen: graded normally, recorded as assisted
// ("retry"), allowed once per attempt (409 after that).
//
// Returns { verdict, feedback, classification, missedParts, modelAnswer?,
//   fixNext?, assisted, assistReason, correctIndex (shown order),
//   correctAnswer, why, optionReasons (shown order, or null), attempt,
//   diagnosis }.
//
// REQ-135 on top: the free-response answer is length-capped and must be
// storable text (400, not a 500 from the INSERT); confidence must be 1-5;
// ids are the canonical lowercase ones from the visibility check; a reused
// clientAttemptId for a different submission is a 409; the model call is
// behind the atomic rate limit.
//
// REQ-111: diagnosis is { sentence, confusedWith, conceptSetId } naming the
// likely misconception behind a miss (null otherwise), stored per learner in
// learner_misconceptions. Multiple choice: from the option picked, with no
// model call. Free response: the grader's misconception tag.
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const { format, stage, unitId } = body ?? {};
    const kind = body?.kind ?? "lesson";

    if (format !== "mc" && format !== "open") {
      return badRequest("format must be 'mc' or 'open' (use /api/pbq for PBQ grading)");
    }
    if (kind !== "lesson") return badRequest("only lesson checks are graded here");
    if (typeof body?.objectiveId !== "string" || !body.objectiveId) return badRequest("objectiveId is required");
    if (stage !== "fade" && stage !== "solo") return badRequest("stage must be 'fade' or 'solo'");
    if (unitId !== undefined && unitId !== null && typeof unitId !== "string") return badRequest("unitId must be a string");
    const rawConfidence = body.confidence;
    if (rawConfidence != null && !(Number.isInteger(rawConfidence) && rawConfidence >= 1 && rawConfidence <= 5)) {
      return badRequest("confidence must be a whole number from 1 to 5");
    }
    const confidence: number | null = rawConfidence ?? null;
    // Free-response text is validated before any database work.
    let openAnswer = "";
    if (format === "open") {
      const a = textField(body.answer, "answer", TEXT_LIMITS.answer, { required: true });
      if (!a.ok) return badRequest(a.error);
      if (!a.value.trim()) return badRequest("answer is required for format 'open'");
      openAnswer = a.value;
    }

    const authUser = await requireUser(req);
    // REQ-205 (FAIL-907): a written answer goes to the model, so the study
    // notice that says so must have been accepted -- checked here, not only in
    // the app. A multiple-choice answer sends nothing and is not held up.
    if (format === "open") await requireStudyNotice(authUser.id);

    // REQ-129: ids in the body are untrusted; the objective must be in a track
    // the caller can see, and a unitId sent alongside must be its own unit.
    // REQ-135: from here on the id is the canonical (lowercase) one the
    // visibility check returns, so lock keys, the shuffle seed and replay
    // comparisons match however the client spelled it.
    const objective = await visibleObjective(body.objectiveId, authUser.id);
    if (!objective) return notFound("Objective not found");
    if (unitId && objective.unit_id !== normUuid(unitId)) return badRequest("objectiveId does not belong to unitId");
    const objectiveId = objective.id;
    await requireAcknowledgementForObjective(objectiveId, authUser.id);
    // REQ-122: a Free learner studies one course (no-op while billing is off).
    const courseTier = await requireCourseAccess(authUser.id, objective.track_id); // REQ-170: the tier on this course

    const found = await lessonCheckFor(authUser.id, objectiveId, stage);
    if (found.status === "no-lesson") return notFound("No lesson for this objective yet");
    if (found.status !== "ok") {
      return badRequest("This lesson's practice questions are still being generated -- try again in a moment.");
    }
    const check = found.check;
    const order = presentationOrder(presentationSeed(authUser.id, objectiveId, stage, check.question), check.choices.length);
    const reveal: Reveal = {
      correctIndex: shownIndexOf(order, check.correctIndex),
      correctAnswer: check.choices[check.correctIndex] ?? null,
      why: check.why || null,
      // REQ-105: one reason per option, in the order THIS learner was shown.
      // null for a lesson cached before option reasons existed; the app then
      // shows `why` alone, as before.
      optionReasons: check.optionReasons ? shuffleForPresentation(check.optionReasons, order) : null,
    };

    // What is graded: the stored choice the shown position maps to, or the
    // free-response text.
    let answer: string;
    let storedChoice: number | null = null;
    if (format === "mc") {
      // Release 2026-11-07 merge: line B's grading (REQ-089, lib/lesson-choices.ts)
      // identified the pick by its text. A request with no chosenIndex but a
      // chosenText that is exactly one of this check's stored choices is
      // graded as that choice, so either client contract works. The answer
      // key still comes only from the stored lesson.
      storedChoice =
        typeof body.chosenIndex !== "number" && typeof body.chosenText === "string"
          ? storedIndexOfText(check.choices, body.chosenText)
          : storedIndexAt(order, body.chosenIndex);
      if (storedChoice === null) return badRequest(`chosenIndex must be 0-${check.choices.length - 1}`);
      answer = check.choices[storedChoice];
    } else {
      answer = openAnswer;
    }

    // REQ-127: an id the app already submitted is a retry -- hand back the
    // stored result rather than grading again. Checked before the rate limit
    // and the model call. The key is added back only if the stored attempt was
    // for the question this lesson still has (a regenerate changes it).
    // REQ-135: the replay is bound to the submission -- the same objective,
    // stage and format and the same graded answer (chosen stored choice or
    // free-response text). Anything else under a used id is a 409. The
    // question is not part of it: it comes from the stored lesson, not the
    // request.
    const identity: AttemptIdentity = { objectiveId, kind: "lesson", format, stage, answer };
    const clientAttemptId = validClientAttemptId(body.clientAttemptId);
    if (clientAttemptId) {
      const prior = await findClientAttempt(authUser.id, clientAttemptId);
      if (prior) {
        if (!sameAttempt(prior.attempt, identity)) return conflict(new IdempotencyConflictError().message);
        return ok(withReveal(prior, check, reveal));
      }
    }
    // Two requests with the same id can still race past that check; the
    // unique index makes the slower one fail, and it returns the winner's.
    const record = (input: Parameters<typeof recordAttemptIdempotent>[0]) =>
      recordAttemptIdempotent({ ...input, clientAttemptId });
    const common = { userId: authUser.id, unitId: objective.unit_id, objectiveId, kind: "lesson" as const, stage, confidence };

    const retryOf = body.retryOf ?? null;
    if (retryOf !== null && format !== "open") return badRequest("retryOf is only for a free-response revision");

    if (format === "mc") {
      // FAIL-039: Solo choices are only ever shown by the hint route, which
      // records the reveal, or (REQ-146, FAIL-530) by the lesson payload sent
      // to an app build without the hint flow, which records the same reveal
      // before sending them in the same shuffled order. A Solo multiple-choice
      // answer without one was never shown this learner's order, so its index
      // can't be trusted. Refuse it plainly; old builds show `error` in a banner.
      if (stage === "solo" && !(await hasHintReveal(authUser.id, objectiveId, stage, check.question))) {
        return badRequest(
          "Answer this check in your own words, or use \"Show choices\" first. If no choices appear, please update the app."
        );
      }
      const correct = storedChoice === check.correctIndex;
      const verdict = correct ? "correct" : "incorrect";
      // REQ-105: a miss also says why the picked option doesn't fit, when the
      // lesson has option reasons. This text is what Review shows later.
      const pickedReason = !correct && check.optionReasons ? check.optionReasons[storedChoice!] : "";
      const feedback = `${correct ? "That's right." : "Not quite."} ${pickedReason} ${check.why}`.replace(/\s+/g, " ").trim();
      const { attempt, prior } = await record({
        ...common,
        format: "mc",
        question: check.question,
        answer,
        verdict,
        feedback,
        classification: "none",
      });
      if (prior) return ok(withReveal(prior, check, reveal));
      const diagnosis = correct
        ? null
        : await diagnoseLessonMc({
            userId: authUser.id,
            objectiveId,
            attemptId: attempt.id,
            stage,
            choices: check.choices,
            pickedIndex: storedChoice!,
            correctIndex: check.correctIndex,
          });
      return ok({ verdict, feedback, classification: "none", missedParts: [], ...assistOf(attempt), ...reveal, attempt, diagnosis });
    }

    // (answer text was validated, and length-capped, before any database work)
    if (retryOf !== null) {
      const refused = retryRefusal(
        await retryTargetFor(authUser.id, retryOf),
        (t) => t.kind === "lesson" && t.format === "open" && t.objective_id === objectiveId && t.stage === stage && t.question === check.question
      );
      if (refused) return refused;
    }
    // REQ-117 (FAIL-359): copies of this submission racing past the replay
    // check above wait for the first one's result instead of each calling
    // the model (lib/grading-claims.ts).
    const replayStored = async () => {
      const prior = clientAttemptId ? await findClientAttempt(authUser.id, clientAttemptId) : null;
      if (!prior) return null;
      if (!sameAttempt(prior.attempt, identity)) return conflict(new IdempotencyConflictError().message);
      return ok(withReveal(prior, check, reveal));
    };
    return await withGradingClaim(authUser.id, clientAttemptId, () => gradeOpen(), replayStored);

    async function gradeOpen() {
      try {
        await consumeRateLimit("grade_open", authUser.id, { max: 40, windowMinutes: 10 });
      } catch (err) {
        if (err instanceof RateLimitError) return tooManyRequests(err.message);
        throw err;
      }
      // REQ-122: Free gets a few graded typed answers a day (Plus and Pro
      // are not counted; nothing is counted while billing is off). Given
      // back if grading fails. Multiple choice above is never counted.
      const use = await consumeAllowance(authUser.id, "graded_answer", courseTier);
      // REQ-076: grade in the voice of the learner's actual track/exam.
      const ctx = await coachContextForObjective(objectiveId);
      let graded: Awaited<ReturnType<typeof gradeFreeResponse>>;
      try {
        graded = await gradeFreeResponse({
          taughtText: check.teach,
          question: check.question,
          answerKey: answerKeyText(check),
          answer,
          ctx: ctx ?? undefined,
          userId: authUser.id,
        });
      } catch (err) {
        await use.release();
        throw err;
      }
      const { attempt, prior } = await record({
        ...common,
        format: "open",
        question: check.question,
        answer,
        verdict: graded.verdict,
        feedback: graded.feedback,
        classification: graded.classification,
        missedParts: graded.missedParts ?? [],
        modelAnswer: graded.modelAnswer ?? null,
        fixNext: graded.fixNext ?? null,
        retryOf,
      });
      if (prior) return ok(withReveal(prior, check, reveal));
      // REQ-114 (Audit 3 H3): the grader judged the lesson's own key wrong and
      // graded on the facts. That is this learner's flag on the shared check;
      // the one automated re-check runs after the response.
      if (graded.classification === KEY_SUSPECT) {
        const ref = { kind: "lesson" as const, itemId: lessonItemId(objectiveId, stage, check.question), objectiveId, question: check.question };
        const flagged = await flagItem(ref, { userId: authUser.id, source: "key_suspect" }).catch(() => null);
        if (flagged?.recheck) inBackground(() => flagged.recheck!);
      }
      const diagnosis = await recordGraderMisconception({
        userId: authUser.id,
        objectiveId,
        attemptId: attempt.id,
        verdict: graded.verdict,
        misconception: graded.misconception,
        confusedWith: graded.confusedWith,
      });
      return ok({ ...graded, ...assistOf(attempt), ...reveal, attempt, diagnosis });
    }
  } catch (err) {
    if (err instanceof GradingInProgressError) return conflict(err.message);
    if (isDuplicateRetry(err)) return conflict(ALREADY_REVISED);
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof IdempotencyConflictError) return conflict(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}

interface Reveal {
  correctIndex: number;
  correctAnswer: string | null;
  why: string | null;
  optionReasons: string[] | null;
}

function answerKeyText(check: LessonCheck): string {
  const right = check.choices[check.correctIndex];
  return check.why ? `${right}\nWhy: ${check.why}` : right;
}

function assistOf(attempt: Record<string, unknown> | null) {
  return {
    assisted: attempt?.assisted === true,
    assistReason: (attempt?.assist_reason as string | null | undefined) ?? null,
  };
}

function withReveal<T extends { attempt: Record<string, unknown> }>(
  prior: T,
  check: LessonCheck,
  reveal: Reveal
) {
  return prior.attempt.question === check.question && prior.attempt.stage === check.stage ? { ...prior, ...reveal } : prior;
}
