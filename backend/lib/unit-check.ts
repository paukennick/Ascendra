import { consumeGradedAnswer } from "@/lib/ai-access";
import { isActive } from "@/lib/progress-sql";
import { query, queryOne, withTransaction } from "@/lib/db";
import { callClaudeStructured, getFastModel } from "@/lib/anthropic";
import { normalizePartScores } from "@/lib/prompts";
import { gradePbqAnswer } from "@/lib/pbq-grading";
import { coachContextForUnit } from "@/lib/coach-context";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { findClientAttempt, isDuplicateClientAttempt, recordAttemptTx } from "@/lib/grading-service";
import { unitCheckPrompt, unitCheckSchema } from "@/lib/review-prompts";
import { md5 } from "@/lib/review-plan";
import { heldBackSince } from "@/lib/item-quality";
import { generateGated, HeldForAccuracyError } from "@/lib/generation-gate";
import { randomUUID } from "node:crypto";
import { isPbqClaimLive, releasePbqClaim, renewPbqClaim, tryPbqClaim } from "@/lib/pbq-scenarios";
import { CLAIM_LEASE_SECONDS } from "@/lib/lesson-store";
import { ReviewError } from "@/lib/review-service";
import { replayMatches, REPLAY_CONFLICT } from "@/lib/replay-binding";
import { withGradingClaim } from "@/lib/grading-claims";
import { studyNoticeAcceptedSql } from "@/lib/study-notice";

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
             or ${studyNoticeAcceptedSql("$1")})
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

export const UNIT_CHECK_SUBJECT = "unit check";
const UNIT_CHECK_WAIT_MS = 90_000;
const UNIT_CHECK_POLL_MS = 500;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// The check to show: a stored one this learner has not answered, or a new one.
//
// REQ-216 (low): two requests at once for the same learner and unit used to
// both find nothing unseen and each write (and pay for) a check. Writing now
// takes the learner's lease for the unit (pbq_generation_claims, the one a PBQ
// generation takes, lib/pbq-scenarios.ts): one request writes, the others wait
// for its release and serve what it stored, or, when it was held back, say so
// in the same words instead of writing again. Sharing the PBQ lease only
// means a unit check and a PBQ for one learner and unit take turns.
export async function getOrWriteUnitCheck(
  userId: string,
  status: UnitCheckStatus,
  opts: { waitMs?: number; pollMs?: number; heartbeatMs?: number } = {}
): Promise<UnitCheckItem> {
  const gate = status.gate!;
  const hash = md5(gate);
  const existing = await unseenUnitCheck(userId, status.unitId, hash);
  if (existing) return existing;
  const deadline = Date.now() + (opts.waitMs ?? UNIT_CHECK_WAIT_MS);
  const token = randomUUID();
  const since = (await queryOne<{ t: Date }>(`select clock_timestamp() as t`))?.t ?? new Date();
  for (;;) {
    if (await tryPbqClaim(userId, status.unitId, token)) {
      const heartbeat = setInterval(() => {
        renewPbqClaim(userId, status.unitId, token).catch(() => {});
      }, opts.heartbeatMs ?? (CLAIM_LEASE_SECONDS * 1000) / 4);
      try {
        // Another request may have stored one between our read and the claim.
        const again = await unseenUnitCheck(userId, status.unitId, hash);
        if (again) return again;
        return await writeUnitCheck(userId, status, gate, hash);
      } finally {
        clearInterval(heartbeat);
        await releasePbqClaim(userId, status.unitId, token).catch(() => {});
      }
    }
    for (;;) {
      if (Date.now() >= deadline) {
        throw new ReviewError(409, "Preparing this check is taking longer than expected. Please try again in a moment.");
      }
      await sleep(opts.pollMs ?? UNIT_CHECK_POLL_MS);
      if (!(await isPbqClaimLive(userId, status.unitId))) break;
    }
    const stored = await unseenUnitCheck(userId, status.unitId, hash);
    if (stored) return stored;
    if (await heldBackSince("unit_check", { unitId: status.unitId }, since)) {
      throw new HeldForAccuracyError(UNIT_CHECK_SUBJECT, ["uncertain"]);
    }
    // The holder failed without storing anything: take the lease ourselves.
  }
}

async function writeUnitCheck(userId: string, status: UnitCheckStatus, gate: string, hash: string): Promise<UnitCheckItem> {
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
  // REQ-114 (Audit 3 H1), changed by REQ-216: a unit check is an invented
  // scenario graded holistically with no key, like a PBQ, so only the writer's
  // LOW confidence holds it back (listed claims are logged); written once
  // more, steered with its claims; held twice -> a 409 that says why.
  const gen = await generateGated({
    kind: "unit_check",
    unitId: status.unitId,
    model,
    subject: UNIT_CHECK_SUBJECT,
    generate: async (steer) => {
      const g = await callClaudeStructured({
        system,
        messages: [{ role: "user", content: steer ? `${user}\n\n${steer}` : user }],
        schema: unitCheckSchema,
        maxTokens: 900,
        model,
        effort: "low",
        thinking: "off",
        purpose: "unitcheck_generate",
        userId,
      });
      if (!g.scenario.trim() || g.subParts.map((s) => s.trim()).filter(Boolean).length < 1) throw new Error("unit check generation returned no scenario");
      return g;
    },
    uncertainty: (g) => g,
  });
  const subParts = gen.subParts.map((s) => s.trim()).filter(Boolean);
  const row = await queryOne<UnitCheckItem & Record<string, unknown>>(
    `insert into unit_check_items (unit_id, gate_hash, title, scenario, sub_parts, model)
     values ($1, $2, $3, $4, $5, $6) returning id, unit_id, title, scenario, sub_parts`,
    [status.unitId, hash, gen.title.trim(), gen.scenario.trim(), JSON.stringify(subParts), model]
  );
  return row!;
}

export const UNIT_CHECK_NOT_ELIGIBLE = "Study every objective in this unit before its check.";

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
  // REQ-116: only a replay of this unit-check item; another item's id is a 409.
  const replayStored = async () => {
    const prior = clientAttemptId ? await findClientAttempt(userId, clientAttemptId) : null;
    if (!prior) return null;
    if (!replayMatches(prior.attempt, { kind: "unitcheck", unitCheckItemId: item.id })) {
      throw new ReviewError(409, REPLAY_CONFLICT);
    }
    return { ...prior, subParts: item.sub_parts };
  };
  const done = await replayStored();
  if (done) return done;
  // REQ-121 (FAIL-442): eligibility applies to a NEW submission only, after
  // the stored-result lookup, so a resend of a check already graded gets its
  // result even if the unit has since gained an objective not yet studied.
  if (!status.eligible) throw new ReviewError(400, UNIT_CHECK_NOT_ELIGIBLE);
  const gradeAndRecord = async () => {
    try {
      await consumeRateLimit("unitcheck_grade", userId, { max: 20, windowMinutes: 10 }, { userId });
    } catch (err) {
      if (err instanceof RateLimitError) throw new ReviewError(429, err.message);
      throw err;
    }
    // REQ-201: under AI_ACCESS_MODE=granted a learner outside the pilot has
    // Free's daily graded typed answers for this too (given back if grading
    // fails). Nothing is counted otherwise, as before.
    const use = await consumeGradedAnswer(userId, null);
    const ctx = await coachContextForUnit(status.unitId);
    // Audit 3 M1/L1: the shared multi-part grader (lib/pbq-grading.ts) -- the
    // PBQ prompt with its matching per-part schema and a 1,500-token cap,
    // trivial answers graded without a call, verdicts checked against the
    // part scores.
    const { trivial: _trivial, ...graded } = await gradePbqAnswer({
      scenario: item.scenario,
      subParts: item.sub_parts,
      answer,
      ctx: ctx ?? undefined,
      userId,
      purpose: "unitcheck_grade",
    }).catch(async (err) => {
      await use.release();
      throw err;
    });
    const { parts, ...grade } = graded;
    // Lined up with the check's own labels; null when the grader's list can't
    // be matched, and the app then says "not scored" rather than guessing.
    const partScores = normalizePartScores(item.sub_parts, parts, graded.missedParts ?? []);
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
          partScores,
          errorLog: false,
        })
      );
      return { ...grade, partScores, attempt, subParts: item.sub_parts, replayed: false };
    } catch (err) {
      if (clientAttemptId && isDuplicateClientAttempt(err)) {
        const prior = await replayStored();
        if (prior) return prior;
      }
      throw err;
    }
  };
  // REQ-120 (FAIL-430): copies of one submission sent at once share one
  // grader call (lib/grading-claims.ts); the others replay the stored result.
  return withGradingClaim(userId, clientAttemptId, gradeAndRecord, replayStored);
}
