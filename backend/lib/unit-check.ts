import { isActive } from "@/lib/progress-sql";
import { query, queryOne, withTransaction } from "@/lib/db";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { gradePBQPrompt, gradeResultSchema } from "@/lib/prompts";
import { coachContextForUnit } from "@/lib/coach-context";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { findClientAttempt, isDuplicateClientAttempt, recordAttemptTx } from "@/lib/grading-service";
import { unitCheckPrompt, unitCheckSchema } from "@/lib/review-prompts";
import { md5 } from "@/lib/review-plan";
import { recordHoldback, uncertaintyOf } from "@/lib/item-quality";
import { UserFacingError } from "@/lib/http";
import { ReviewError } from "@/lib/review-service";

// REQ-108 (research item #1): the unit gate check. Every unit carries a
// gate statement in the seed (course_units.gate_description) -- what a
// learner who has really got the unit can do. Once every objective of the
// unit has been studied (has graded answers), the learner is offered one
// transfer scenario written from the gate, graded by the PBQ grader, and
// recorded as kind 'unitcheck' with assessment_type 'unit_check' in the
// same shape as a unit PBQ (objective_id null, unit_id set, format 'pbq'),
// so recordAttemptTx recomputes the unit's studied objectives exactly as it
// does after a PBQ. See migration 037 for why the weighted rule does not
// read it yet.
//
// Scenarios are written once per unit (cheap model) and shared; a learner is
// served one they have not answered, and a new one is written only when they
// have answered every stored one.

export interface UnitCheckStatus {
  unitId: string;
  unitTitle: string;
  trackId: string;
  gate: string | null;
  total: number;
  studied: number;
  eligible: boolean;
  passed: boolean;
  lastVerdict: string | null;
}

export async function unitCheckStatus(userId: string, unitId: string): Promise<UnitCheckStatus | null> {
  const r = await queryOne<{
    title: string;
    track_id: string;
    gate_description: string | null;
    total: number;
    studied: number;
    passed: boolean;
    last_verdict: string | null;
  }>(
    `select cu.title, cu.track_id, cu.gate_description,
            (select count(*) from objectives o where o.unit_id = cu.id and ${isActive("o")}) as total,
            (select count(*) from objectives o join mastery m on m.objective_id = o.id and m.user_id = $2
              where o.unit_id = cu.id and ${isActive("o")} and m.status <> 'Not started') as studied,
            exists (select 1 from attempts a where a.user_id = $2 and a.unit_id = cu.id and a.kind = 'unitcheck'
                     and a.verdict = 'correct') as passed,
            (select a.verdict::text from attempts a where a.user_id = $2 and a.unit_id = cu.id and a.kind = 'unitcheck'
              order by a.created_at desc limit 1) as last_verdict
       from course_units cu join subject_tracks st on st.id = cu.track_id
      where cu.id = $1 and (st.user_id is null or st.user_id = $2) and ${isActive("cu")}`,
    [unitId, userId]
  );
  if (!r) return null;
  const total = Number(r.total);
  const studied = Number(r.studied);
  return {
    unitId,
    unitTitle: r.title,
    trackId: r.track_id,
    gate: r.gate_description,
    total,
    studied,
    eligible: !!r.gate_description && total > 0 && studied >= total,
    passed: r.passed,
    lastVerdict: r.last_verdict,
  };
}

// Units ready for a check and not yet passed, most recently studied first.
// A short list on purpose (Review shows a few, not a wall).
export async function readyUnitChecks(userId: string, trackId: string | null, limit = 3) {
  return query<{ unit_id: string; unit_title: string; track_id: string; track_title: string; last_verdict: string | null }>(
    `select cu.id as unit_id, cu.title as unit_title, cu.track_id, st.title as track_title,
            (select a.verdict::text from attempts a where a.user_id = $1 and a.unit_id = cu.id and a.kind = 'unitcheck'
              order by a.created_at desc limit 1) as last_verdict
       from course_units cu
       join subject_tracks st on st.id = cu.track_id
      where (st.user_id is null or st.user_id = $1)
        and ($2::uuid is null or cu.track_id = $2::uuid)
        and coalesce(cu.gate_description, '') <> ''
        and ${isActive("cu")}
        and exists (select 1 from objectives o where o.unit_id = cu.id and ${isActive("o")})
        and not exists (
          select 1 from objectives o
           where o.unit_id = cu.id and ${isActive("o")}
             and not exists (select 1 from mastery m where m.user_id = $1 and m.objective_id = o.id and m.status <> 'Not started'))
        and not exists (select 1 from attempts a where a.user_id = $1 and a.unit_id = cu.id and a.kind = 'unitcheck' and a.verdict = 'correct')
        and (not coalesce(st.requires_acknowledgement, false)
             or exists (select 1 from track_acknowledgements ta
                         where ta.user_id = $1 and ta.track_id = st.id and ta.disclaimer_version = st.disclaimer_version))
      order by (select max(m.updated_at) from mastery m join objectives o on o.id = m.objective_id
                 where m.user_id = $1 and o.unit_id = cu.id) desc nulls last
      limit $3`,
    [userId, trackId, limit]
  );
}

export interface UnitCheckItem {
  id: string;
  unit_id: string;
  title: string;
  scenario: string;
  sub_parts: string[];
}

export async function unseenUnitCheck(userId: string, unitId: string, gateHash: string): Promise<UnitCheckItem | null> {
  return queryOne<UnitCheckItem & Record<string, unknown>>(
    `select i.id, i.unit_id, i.title, i.scenario, i.sub_parts from unit_check_items i
      where i.unit_id = $1 and i.gate_hash = $2
        and not exists (select 1 from attempts a where a.user_id = $3 and a.unit_check_item_id = i.id)
      order by i.generated_at, i.id limit 1`,
    [unitId, gateHash, userId]
  );
}

// The check to show: a stored one this learner has not answered, or a new one.
export async function getOrWriteUnitCheck(userId: string, status: UnitCheckStatus): Promise<UnitCheckItem> {
  const gate = status.gate!;
  const hash = md5(gate);
  const existing = await unseenUnitCheck(userId, status.unitId, hash);
  if (existing) return existing;
  try {
    await consumeRateLimit("unitcheck_generate", userId, { max: 10, windowMinutes: 60 }, { userId });
  } catch (err) {
    if (err instanceof RateLimitError) throw new ReviewError(429, err.message);
    throw err;
  }
  const objectives = await query<{ title: string }>(`select o.title from objectives o where o.unit_id = $1 and ${isActive("o")} order by o.sort_order`, [
    status.unitId,
  ]);
  const track = await queryOne<{ title: string }>(`select title from subject_tracks where id = $1`, [status.trackId]);
  const ctx = await coachContextForUnit(status.unitId);
  const { system, user } = unitCheckPrompt({
    trackTitle: track?.title ?? "",
    unitTitle: status.unitTitle,
    gate,
    objectiveTitles: objectives.map((o) => o.title),
    ctx: ctx ?? undefined,
  });
  const model = getFastModel();
  const gen = await callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: unitCheckSchema,
    maxTokens: 900,
    model,
    effort: "low",
    thinking: "off",
    purpose: "unitcheck_generate",
    userId,
  });
  const subParts = gen.subParts.map((s) => s.trim()).filter(Boolean);
  if (!gen.scenario.trim() || subParts.length < 1) throw new Error("unit check generation returned no scenario");
  // REQ-114 (Audit 3 H1): never store a scenario its writer was unsure of.
  const unsure = uncertaintyOf(gen);
  if (unsure) {
    await recordHoldback({ kind: "unit_check", unitId: status.unitId, reason: "uncertain", claims: unsure, content: gen, model });
    throw new UserFacingError("We couldn't write a check we're confident in just now. Please try again.");
  }
  const row = await queryOne<UnitCheckItem & Record<string, unknown>>(
    `insert into unit_check_items (unit_id, gate_hash, title, scenario, sub_parts, model)
     values ($1, $2, $3, $4, $5, $6) returning id, unit_id, title, scenario, sub_parts`,
    [status.unitId, hash, gen.title.trim(), gen.scenario.trim(), JSON.stringify(subParts), model]
  );
  return row!;
}

export async function gradeUnitCheck(
  userId: string,
  status: UnitCheckStatus,
  itemId: string,
  answer: string,
  clientAttemptId: string | null
) {
  const item = await queryOne<UnitCheckItem & Record<string, unknown>>(
    `select id, unit_id, title, scenario, sub_parts from unit_check_items where id = $1 and unit_id = $2`,
    [itemId, status.unitId]
  );
  if (!item) throw new ReviewError(404, "Unit check not found");
  if (clientAttemptId) {
    const prior = await findClientAttempt(userId, clientAttemptId);
    if (prior) return { ...prior, subParts: item.sub_parts };
  }
  try {
    await consumeRateLimit("unitcheck_grade", userId, { max: 20, windowMinutes: 10 }, { userId });
  } catch (err) {
    if (err instanceof RateLimitError) throw new ReviewError(429, err.message);
    throw err;
  }
  const ctx = await coachContextForUnit(status.unitId);
  const { system, user } = gradePBQPrompt({ scenario: item.scenario, subParts: item.sub_parts, answer, ctx: ctx ?? undefined });
  const graded = await callClaudeStructured({
    system,
    messages: [{ role: "user", content: user }],
    schema: gradeResultSchema,
    maxTokens: 900,
    model: getFastModel(),
    effort: "high",
    thinking: "off",
    purpose: "unitcheck_grade",
    userId,
  });
  try {
    const attempt = await withTransaction((tx) =>
      recordAttemptTx(tx, {
        userId,
        unitId: status.unitId,
        kind: "unitcheck",
        format: "pbq",
        question: item.title,
        answer,
        verdict: graded.verdict,
        feedback: graded.feedback,
        classification: graded.classification,
        missedParts: graded.missedParts ?? [],
        clientAttemptId,
        assessmentType: "unit_check",
        unitCheckItemId: item.id,
        errorLog: false,
      })
    );
    return { ...graded, attempt, subParts: item.sub_parts, replayed: false };
  } catch (err) {
    if (clientAttemptId && isDuplicateClientAttempt(err)) {
      const prior = await findClientAttempt(userId, clientAttemptId);
      if (prior) return { ...prior, subParts: item.sub_parts };
    }
    throw err;
  }
}
