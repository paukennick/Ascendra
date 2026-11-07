import { query, queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, tooManyRequests, forbidden, conflict, serverError } from "@/lib/http";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { pbqGenerationPrompt, gradePBQPrompt, pbqScenarioSchema, pbqGradeResultSchema, normalizePartScores } from "@/lib/prompts";
import {
  findClientAttempt,
  isDuplicateRetry,
  recordAttemptIdempotent,
  retryTargetFor,
  sameAttempt,
  IdempotencyConflictError,
} from "@/lib/grading-service";
import { ALREADY_REVISED, partsToRevise, retryRefusal } from "@/lib/revision";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { visibleScenario, isUuid, NotVisibleError } from "@/lib/visibility";
import { servePbqScenario } from "@/lib/pbq-scenarios";
import { recordHoldback, uncertaintyOf } from "@/lib/item-quality";
import { UserFacingError } from "@/lib/http";
import { textField, TEXT_LIMITS } from "@/lib/text-input";
import { isActive } from "@/lib/progress-sql";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForUnit,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { coachContextForUnit } from "@/lib/coach-context";

export const dynamic = "force-dynamic";

const HELD_SCENARIO_MESSAGE =
  "We couldn't write a scenario we're confident in just now. Please try again.";

// GET /api/pbq?scenarioId=... — one specific scenario (retry from Review).
// GET /api/pbq?unitId=... — REQ-107: the newest scenario for the unit that the
// learner can see and has not attempted (reused across learners on catalog
// courses, never across learners on a private one); a new one is generated
// only when none is unseen. Pass &fresh=1 to always generate a new one. Two
// requests at once from one learner for one unit generate at most once
// (lib/pbq-scenarios.ts).
export async function GET(req: Request) {
  try {
    const authUser = await requireUser(req);
    const { searchParams } = new URL(req.url);

    // REQ-097: ?scenarioId= returns that exact scenario, so a missed PBQ on
    // the Review screen can be retried (a correct retry advances its review
    // entry once it is due -- see recordAttemptTx).
    const scenarioId = searchParams.get("scenarioId");
    if (scenarioId) {
      const scenario = await visibleScenario(scenarioId, authUser.id);
      if (!scenario) return notFound("PBQ scenario not found");
      await requireAcknowledgementForUnit(scenario.unit_id, authUser.id);
      const row = await queryOne(`select * from pbq_scenarios where id = $1`, [scenario.id]);
      return ok({ scenario: row, cached: true });
    }

    const unitId = searchParams.get("unitId");
    const fresh = searchParams.get("fresh") === "1";
    if (!unitId) return badRequest("unitId or scenarioId query param is required");
    if (!isUuid(unitId)) return notFound("Unit not found");

    const unit = await queryOne<{ title: string; track_title: string }>(
      `select cu.title, st.title as track_title
       from course_units cu join subject_tracks st on st.id = cu.track_id
       where cu.id = $1 and (st.user_id is null or st.user_id = $2)`,
      [unitId, authUser.id]
    );
    if (!unit) return notFound("Unit not found");
    await requireAcknowledgementForUnit(unitId, authUser.id);

    // Runs only when nothing unseen is left (or fresh=1), and only in the
    // one request holding this learner's generation lease for the unit, so
    // serving a stored scenario -- or waiting for one -- spends no budget.
    const generate = async () => {
      await consumeRateLimit("pbq_generate", authUser.id, { max: 15, windowMinutes: 10 });

      const objectives = await query<{ title: string }>(
        `select o.title from objectives o where o.unit_id = $1 and ${isActive("o")} order by o.sort_order asc`,
        [unitId]
      );

      const ctx = await coachContextForUnit(unitId);
      const { system, user } = pbqGenerationPrompt({
        trackTitle: unit.track_title,
        unitTitle: unit.title,
        unitObjectives: objectives.map((o) => o.title),
        ctx: ctx ?? undefined,
      });
      // The model that generates is the model that gets recorded: this used to
      // store getModel() (Sonnet) although the fast model wrote the scenario.
      const generationModel = getFastModel();
      const generated = await callClaudeStructured({
        system,
        messages: [{ role: "user", content: user }],
        schema: pbqScenarioSchema,
        maxTokens: 1200,
        model: generationModel,
        effort: "low",
        thinking: "off",
        purpose: "pbq_generate",
        userId: authUser.id,
      });
      // REQ-114 (Audit 3 H1): a scenario its writer was unsure of is never
      // stored or shown; it is logged for review and the learner can retry.
      const unsure = uncertaintyOf(generated);
      if (unsure) {
        await recordHoldback({ kind: "pbq", unitId, reason: "uncertain", claims: unsure, content: generated, model: generationModel });
        throw new UserFacingError(HELD_SCENARIO_MESSAGE);
      }
      return { ...generated, model: generationModel };
    };

    try {
      const served = await servePbqScenario({ userId: authUser.id, unitId, fresh, generate });
      return ok(served);
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      if (err instanceof NotVisibleError) return notFound(err.message);
      throw err;
    }
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}

// POST /api/pbq — grade a PBQ answer.
// Body: { scenarioId, answer, clientAttemptId?, confidence?, unitId? }
// unitId is accepted for older clients but ignored: the unit (and so the
// track, visibility check and acknowledgement gate) comes from the scenario.
// clientAttemptId works as it does on /api/grade: a repeat returns the
// stored result instead of grading and recording a second attempt.
//
// REQ-105: { retryOf: <missed attempt id> } revises just the sub-parts that
// attempt missed (all of them if it named none), with its feedback and model
// answer on screen. Graded on those sub-parts only, recorded as assisted
// ("retry"), allowed once per attempt (409 after that). Returns modelAnswer
// and fixNext with the verdict, and revisedParts when it was a revision.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scenarioId } = body ?? {};
    if (!scenarioId || typeof scenarioId !== "string" || !body?.answer || typeof body.answer !== "string") {
      return badRequest("scenarioId and answer are required");
    }
    // REQ-098: length cap and storable text (400, not a 500 from the INSERT).
    const a = textField(body.answer, "answer", TEXT_LIMITS.pbqAnswer, { required: true });
    if (!a.ok) return badRequest(a.error);
    const answer = a.value;
    const rawConfidence = body.confidence;
    if (rawConfidence != null && !(Number.isInteger(rawConfidence) && rawConfidence >= 1 && rawConfidence <= 5)) {
      return badRequest("confidence must be a whole number from 1 to 5");
    }
    const confidence: number | null = rawConfidence ?? null;

    const authUser = await requireUser(req);

    // REQ-091: reach the scenario through its unit and track so a scenario in
    // another user's private track is a 404, and gate on the scenario's own
    // unit -- not on whatever unitId the client chose to send (or omit).
    const scenario = await visibleScenario(scenarioId, authUser.id);
    if (!scenario) return notFound("PBQ scenario not found");
    const unitId = scenario.unit_id;
    await requireAcknowledgementForUnit(unitId, authUser.id);

    // A retry (dropped connection, double tap) replays the stored result.
    // Checked before the rate limit and the Anthropic call.
    const clientAttemptId = validClientAttemptId(body.clientAttemptId);
    // REQ-098: only a replay of the same scenario and answer; anything else
    // under a used id is a 409 instead of the old result.
    if (clientAttemptId) {
      const prior = await findClientAttempt(authUser.id, clientAttemptId);
      if (prior) {
        const identity = {
          pbqScenarioId: scenario.id,
          kind: "pbq" as const,
          format: "pbq" as const,
          stage: null,
          question: scenario.title,
          answer,
        };
        if (!sameAttempt(prior.attempt, identity)) return conflict(new IdempotencyConflictError().message);
        return ok(prior);
      }
    }

    // REQ-105: which sub-parts a revision covers -- the ones the revised
    // attempt missed, matched against this scenario's own labels.
    const retryOf = body.retryOf ?? null;
    let revisedParts: string[] | undefined;
    if (retryOf !== null) {
      const found = await retryTargetFor(authUser.id, retryOf);
      const refused = retryRefusal(found, (t) => t.kind === "pbq" && t.pbq_scenario_id === scenario.id);
      if (refused) return refused;
      if (found.status === "ok") revisedParts = partsToRevise(scenario.sub_parts, found.target.missed_parts);
    }

    try {
      await consumeRateLimit("pbq_grade", authUser.id, { max: 40, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }

    const ctx = await coachContextForUnit(unitId);
    const { system, user } = gradePBQPrompt({
      scenario: scenario.scenario,
      subParts: scenario.sub_parts,
      answer,
      revisionOf: revisedParts,
      ctx: ctx ?? undefined,
    });
    const graded = await callClaudeStructured({
      system,
      messages: [{ role: "user", content: user }],
      schema: pbqGradeResultSchema,
      // REQ-105: +300 headroom for the model answer (one line per sub-part)
      // and fixNext; REQ-107: +300 for the per-part scores. max_tokens is a
      // ceiling, not a cost.
      maxTokens: 1500,
      model: getFastModel(),
      effort: "high",
      thinking: "off",
      purpose: "pbq_grade",
      userId: authUser.id,
    });

    // REQ-107: a score per sub-part, lined up with the scenario's own labels
    // (null when the grader's list can't be matched; the app then falls back
    // to missedParts). REQ-112 (j): stored with the attempt, so a replay
    // returns them too.
    const { parts, ...grade } = graded;
    const partScores = normalizePartScores(scenario.sub_parts, parts, graded.missedParts ?? []);

    // Two requests with the same id can race past the check above; the
    // unique index fails the slower one and it returns the winner's result.
    const { attempt, prior } = await recordAttemptIdempotent({
      userId: authUser.id,
      unitId,
      pbqScenarioId: scenario.id,
      clientAttemptId,
      kind: "pbq",
      format: "pbq",
      question: scenario.title,
      answer,
      verdict: graded.verdict,
      feedback: graded.feedback,
      classification: graded.classification,
      missedParts: graded.missedParts ?? [],
      modelAnswer: graded.modelAnswer ?? null,
      fixNext: graded.fixNext ?? null,
      retryOf,
      confidence,
      partScores,
    });

    if (prior) return ok(prior);
    return ok({
      ...grade,
      partScores,
      assisted: attempt?.assisted === true,
      assistReason: (attempt?.assist_reason as string | null | undefined) ?? null,
      ...(revisedParts ? { revisedParts } : {}),
      attempt,
    });
  } catch (err) {
    if (isDuplicateRetry(err)) return conflict(ALREADY_REVISED);
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof IdempotencyConflictError) return conflict(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
