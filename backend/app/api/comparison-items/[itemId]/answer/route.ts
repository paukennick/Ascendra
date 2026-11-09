import { ok, badRequest, notFound, unauthorized, forbidden, conflict, serverError } from "@/lib/http";
import { replayMatches, REPLAY_CONFLICT } from "@/lib/replay-binding";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { requireAcknowledgementForTrack, AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { isUuid } from "@/lib/visibility";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { findClientAttempt, hasHintReveal, recordAttemptIdempotent } from "@/lib/grading-service";
import { presentationOrder, presentationSeed, shownIndexOf, storedIndexAt } from "@/lib/choice-order";
import { discriminationItem, recordMisconception, visibleConceptSet } from "@/lib/understanding-store";
import { diagnosisView } from "@/lib/understanding-grading";
import type { Diagnosis } from "@/lib/understanding";
import { requireFeature } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// POST /api/comparison-items/:itemId/answer -- REQ-111: grades a comparison
// card's "which fits this scenario?" question, server-side, with no model call.
// Body: { chosenIndex, clientAttemptId? }; chosenIndex is a position in the
// order the options were shown (this learner's fixed shuffle).
//
// Recorded as an attempt (kind quiz, stage discriminate, format mc,
// assessment_type discrimination) on the objective that teaches the right
// concept, so it counts in the weighted mastery model as application-level
// evidence. Assisted when the card was reopened during the question (hint) or
// this learner answered the question before (repeat). A miss is diagnosed
// ("You may be mixing up X with Y") and goes into review like any miss.
//
// Returns { verdict, feedback, correctIndex (shown), correctAnswer, why,
//   assisted, assistReason, diagnosis, recorded }.
export async function POST(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const user = await requireUser(req);
    const item = isUuid(itemId) ? await discriminationItem(itemId) : null;
    if (!item || !(await visibleConceptSet(item.set_id, user.id))) return notFound("Question not found");
    await requireAcknowledgementForTrack(item.track_id, user.id);
    await requireFeature(user.id, "comparison", item.track_id); // REQ-122, REQ-170
    const body = await req.json().catch(() => ({}));

    const order = presentationOrder(presentationSeed(user.id, item.set_id, "discriminate", item.scenario), item.options.length);
    const right = item.options[item.answer_position];
    const reveal = { correctIndex: shownIndexOf(order, item.answer_position), correctAnswer: right, why: item.why };

    const clientAttemptId = validClientAttemptId(body?.clientAttemptId);
    if (clientAttemptId) {
      const prior = await findClientAttempt(user.id, clientAttemptId);
      if (prior) {
        // REQ-116: replay only this card's own answer; the key of a card not
        // yet answered is never sent for an id recorded elsewhere.
        const same = replayMatches(prior.attempt, {
          objectiveId: item.objective_id,
          kind: "quiz",
          stage: "discriminate",
          question: item.scenario,
        });
        if (!same) return conflict(REPLAY_CONFLICT);
        return ok({ ...prior, ...reveal, diagnosis: null, recorded: true });
      }
    }

    const stored = storedIndexAt(order, body?.chosenIndex);
    if (stored === null) return badRequest(`chosenIndex must be 0-${item.options.length - 1}`);
    const picked = item.options[stored];
    const correct = stored === item.answer_position;
    const verdict = correct ? "correct" : "incorrect";
    const feedback = correct
      ? `Yes — this one is ${right}. ${item.why}`.trim()
      : `This one is ${right}, not ${picked}. ${item.why}`.trim();
    const diagnosis: Diagnosis | null = correct
      ? null
      : {
          source: "concept_match",
          tag: `confused ${right} with ${picked}`.slice(0, 120),
          sentence: `You may be mixing up ${picked} with ${right} — look for the cue that decides it.`,
          confusedWith: picked,
          confusedWithObjectiveId: null,
          conceptSetId: item.set_id,
        };

    // A card none of whose concepts this course teaches has nowhere to record
    // evidence; it can still be practised.
    if (!item.objective_id) {
      return ok({ verdict, feedback, ...reveal, assisted: false, assistReason: null, diagnosis: diagnosisView(diagnosis), recorded: false });
    }
    const peeked = await hasHintReveal(user.id, item.objective_id, "discriminate", item.scenario);
    const { attempt, prior } = await recordAttemptIdempotent({
      userId: user.id,
      unitId: item.unit_id,
      objectiveId: item.objective_id,
      kind: "quiz",
      stage: "discriminate",
      format: "mc",
      question: item.scenario,
      answer: picked,
      verdict,
      feedback,
      classification: correct ? "none" : "misconception",
      assessmentType: "discrimination",
      assist: peeked ? "hint" : null,
      clientAttemptId,
    });
    if (prior) return ok({ ...prior, ...reveal, diagnosis: null, recorded: true });
    if (diagnosis) {
      await recordMisconception(user.id, item.objective_id, attempt.id, diagnosis).catch(() => undefined);
    }
    return ok({
      verdict,
      feedback,
      ...reveal,
      assisted: attempt.assisted === true,
      assistReason: attempt.assist_reason ?? null,
      diagnosis: diagnosisView(diagnosis),
      recorded: true,
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
