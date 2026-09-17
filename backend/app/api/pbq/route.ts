import { query, queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, tooManyRequests, serverError } from "@/lib/http";
import { callClaudeJSON, getFastModel } from "@/lib/anthropic";
import { pbqGenerationPrompt, gradePBQPrompt, type PBQScenario, type GradeResult } from "@/lib/prompts";
import { recordAttemptAndUpdateMastery } from "@/lib/grading-service";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { checkRateLimit, recordAuthEvent, RateLimitError } from "@/lib/auth/rateLimit";

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
       where cu.id = $1 and st.user_id = $2`,
      [unitId, authUser.id]
    );
    if (!unit) return notFound("Unit not found");

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

    const { system, user } = pbqGenerationPrompt({
      trackTitle: unit.track_title,
      unitTitle: unit.title,
      unitObjectives: objectives.map((o) => o.title),
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
    return serverError(err);
  }
}

// POST /api/pbq — grade a PBQ answer. Body: { scenarioId, unitId, answer, confidence? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scenarioId, unitId, answer, confidence } = body ?? {};
    if (!scenarioId || !answer) return badRequest("scenarioId and answer are required");

    const authUser = await requireUser(req);

    try {
      await checkRateLimit("pbq_grade", authUser.id, { max: 40, windowMinutes: 10 });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests(err.message);
      throw err;
    }
    await recordAuthEvent("pbq_grade", authUser.id);

    const scenario = await queryOne<{ scenario: string; sub_parts: string[]; title: string }>(
      `select scenario, sub_parts, title from pbq_scenarios where id = $1`,
      [scenarioId]
    );
    if (!scenario) return notFound("PBQ scenario not found");

    const { system, user } = gradePBQPrompt({
      scenario: scenario.scenario,
      subParts: scenario.sub_parts,
      answer,
    });
    const graded = await callClaudeJSON<GradeResult>({
      system,
      messages: [{ role: "user", content: user }],
      maxTokens: 900,
      model: getFastModel(),
    });

    const attempt = await recordAttemptAndUpdateMastery({
      userId: authUser.id,
      unitId,
      pbqScenarioId: scenarioId,
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

    return ok({ ...graded, attempt });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
