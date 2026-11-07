import { query, queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, tooManyRequests, forbidden, serverError } from "@/lib/http";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { pbqGenerationPrompt, gradePBQPrompt, pbqScenarioSchema, gradeResultSchema } from "@/lib/prompts";
import { findClientAttempt, isDuplicateRetry, recordAttemptIdempotent, retryTargetFor } from "@/lib/grading-service";
import { ALREADY_REVISED, partsToRevise, retryRefusal } from "@/lib/revision";
import { conflict } from "@/lib/http";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { visibleScenario } from "@/lib/visibility";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForUnit,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";
import { coachContextForUnit } from "@/lib/coach-context";

export const dynamic = "force-dynamic";

// GET /api/pbq?scenarioId=... — one specific scenario (retry from Review).
// GET /api/pbq?unitId=... — returns the most recently generated PBQ scenario for a unit,
// or generates+caches a new one if none exists yet. Pass &fresh=1 to always generate a new one
// (a unit can accumulate several distinct scenarios over time, unlike per-objective lesson
// content which caches exactly one).
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

    const unit = await queryOne<{ title: string; track_title: string }>(
      `select cu.title, st.title as track_title
       from course_units cu join subject_tracks st on st.id = cu.track_id
       where cu.id = $1 and (st.user_id is null or st.user_id = $2)`,
      [unitId, authUser.id]
    );
    if (!unit) return notFound("Unit not found");
    await requireAcknowledgementForUnit(unitId, authUser.id);

    if (!fresh) {
      const existing = await queryOne(
        `select * from pbq_scenarios where unit_id = $1 order by generated_at desc limit 1`,
        [unitId]
      );
      if (existing) return ok({ scenario: existing, cached: true });
    }

    try {
      await checkRateLimit("pbq_generate", authUser.id, { max: 15, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    await recordAuthEvent("pbq_generate", authUser.id);

    const objectives = await query<{ title: string }>(
      `select title from objectives where unit_id = $1 order by sort_order asc`,
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

    const rows = await query(
      `insert into pbq_scenarios (unit_id, title, scenario, sub_parts, model)
       values ($1,$2,$3,$4,$5) returning *`,
      [unitId, generated.title, generated.scenario, JSON.stringify(generated.subParts), generationModel]
    );
    return ok({ scenario: rows[0], cached: false });
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
    const { scenarioId, answer, confidence } = body ?? {};
    if (!scenarioId || typeof scenarioId !== "string" || !answer || typeof answer !== "string") {
      return badRequest("scenarioId and answer are required");
    }

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
    if (clientAttemptId) {
      const prior = await findClientAttempt(authUser.id, clientAttemptId);
      if (prior) return ok(prior);
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
      await checkRateLimit("pbq_grade", authUser.id, { max: 40, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    await recordAuthEvent("pbq_grade", authUser.id);

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
      schema: gradeResultSchema,
      // REQ-105: +300 headroom for the model answer (one line per sub-part)
      // and fixNext; max_tokens is a ceiling, not a cost.
      maxTokens: 1200,
      model: getFastModel(),
      effort: "high",
      thinking: "off",
      purpose: "pbq_grade",
      userId: authUser.id,
    });

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
    });

    if (prior) return ok(prior);
    return ok({
      ...graded,
      assisted: attempt?.assisted === true,
      assistReason: (attempt?.assist_reason as string | null | undefined) ?? null,
      ...(revisedParts ? { revisedParts } : {}),
      attempt,
    });
  } catch (err) {
    if (isDuplicateRetry(err)) return conflict(ALREADY_REVISED);
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
