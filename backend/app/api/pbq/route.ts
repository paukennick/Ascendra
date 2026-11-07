import { query, queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, tooManyRequests, forbidden, serverError } from "@/lib/http";
import { callClaudeJSON, getFastModel } from "@/lib/anthropic";
import { pbqGenerationPrompt, gradePBQPrompt, type PBQScenario, type GradeResult } from "@/lib/prompts";
import { findClientAttempt, recordAttemptIdempotent } from "@/lib/grading-service";
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

// GET /api/pbq?unitId=... — returns the most recently generated PBQ scenario for a unit,
// or generates+caches a new one if none exists yet. Pass &fresh=1 to always generate a new one
// (a unit can accumulate several distinct scenarios over time, unlike per-objective lesson
// content which caches exactly one).
export async function GET(req: Request) {
  try {
    const authUser = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("unitId");
    const fresh = searchParams.get("fresh") === "1";
    if (!unitId) return badRequest("unitId query param is required");

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
    const generated = await callClaudeJSON<PBQScenario>({
      system,
      messages: [{ role: "user", content: user }],
      maxTokens: 1200,
      model: getFastModel(),
    });

    const rows = await query(
      `insert into pbq_scenarios (unit_id, title, scenario, sub_parts, model)
       values ($1,$2,$3,$4,$5) returning *`,
      [unitId, generated.title, generated.scenario, JSON.stringify(generated.subParts), process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5"]
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
      ctx: ctx ?? undefined,
    });
    const graded = await callClaudeJSON<GradeResult>({
      system,
      messages: [{ role: "user", content: user }],
      maxTokens: 900,
      model: getFastModel(),
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
      confidence,
    });

    if (prior) return ok(prior);
    return ok({ ...graded, attempt });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
