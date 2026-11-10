import { query } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, tooManyRequests, serverError, readJson } from "@/lib/http";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { textField, TEXT_LIMITS } from "@/lib/text-input";
import { visibleObjective, visibleUnit } from "@/lib/visibility";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { isActive } from "@/lib/progress-sql";

export const dynamic = "force-dynamic";

// GET /api/errors?due=1&trackId=&limit=&offset= — error log. Pass due=1 to get only entries whose
// next_review_at has arrived (the spaced-review queue: 1/7/21 days out).
//
// REQ-118 (Audit 3 MEDIUM-6): bounded. It returned every unresolved entry
// (unbounded growth with history). Now at most `limit` rows (default
// ERRORS_PAGE_DEFAULT, max ERRORS_PAGE_MAX) from `offset`, with `total` (all
// matching entries, for counts like the home screen's) and `nextOffset`
// (null on the last page).
const ERRORS_PAGE_DEFAULT = 200;
const ERRORS_PAGE_MAX = 500;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const due = searchParams.get("due") === "1";
    const trackId = searchParams.get("trackId");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const limit = limitParam === null ? ERRORS_PAGE_DEFAULT : Number(limitParam);
    const offset = offsetParam === null ? 0 : Number(offsetParam);
    if (!Number.isSafeInteger(limit) || limit < 1) return badRequest("limit must be a whole number of 1 or more");
    if (!Number.isSafeInteger(offset) || offset < 0) return badRequest("offset must be a whole number of 0 or more");
    const pageSize = Math.min(limit, ERRORS_PAGE_MAX);
    const user = await requireUser(req);
    const userId = user.id;

    // FAIL-890: an entry for a retired objective or unit is not reviewed (the
    // seed also resolves them when it retires; this covers the gap before a
    // seed run and the rows of a unit retired another way). PBQ entries have
    // a unit and no objective, so the unit is checked too.
    const conditions: string[] = [
      "e.user_id = $1",
      "e.resolved = false",
      `(o.id is null or ${isActive("o")})`,
      `(cu.id is null or ${isActive("cu")})`,
    ];
    const values: unknown[] = [userId];
    if (due) conditions.push("e.next_review_at <= current_date");
    if (trackId) {
      conditions.push(`cu.track_id = $${values.length + 1}`);
      values.push(trackId);
    }

    // REQ-073: the Review screen groups entries by course and navigates
    // straight into the objective's lesson, so each row carries its track
    // (via the unit) alongside the objective/unit titles it always had.
    values.push(pageSize, offset);
    const rows = await query<Record<string, unknown>>(
      // REQ-116: titles only from courses the caller can see, so a row
      // stored before POST checked ids can't show another learner's titles.
      `select e.*,
              case when st.id is not null then o.title end as objective_title,
              case when st.id is not null then cu.title end as unit_title,
              case when st.id is not null then cu.track_id end as track_id,
              st.title as track_title, count(*) over () as __total
       from error_log e
       left join objectives o on o.id = e.objective_id
       left join course_units cu on cu.id = e.unit_id
       left join subject_tracks st on st.id = cu.track_id and (st.user_id is null or st.user_id = $1)
       where ${conditions.join(" and ")}
       order by e.next_review_at asc nulls last, e.created_at desc, e.id asc
       limit $${values.length - 1} offset $${values.length}`,
      values
    );
    // count(*) over () is the total before LIMIT; past the end there is no
    // row to carry it, so a separate count is not worth a round trip.
    const total = rows.length ? Number(rows[0].__total) : offset === 0 ? 0 : null;
    const errors = rows.map(({ __total, ...r }) => r);
    const nextOffset = total !== null && offset + errors.length < total ? offset + errors.length : null;
    return ok({ errors, total, nextOffset });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// POST /api/errors — manually log an error entry (rarely needed directly — grading
// routes create these automatically — but exposed for completeness / manual logging).
//
// REQ-116 (audit 3, finding 7): unitId and objectiveId used to be stored as
// sent, and GET then joined in their titles -- so posting another learner's
// private ids read back their private objective, unit and course titles.
// Both must now be visible to the caller (lib/visibility.ts; 404 otherwise,
// which doesn't confirm a private id exists) and the objective must belong
// to the unit when both are given. Text fields are capped (textField) and
// creation is rate limited.
const ERROR_LOG_LIMIT = { max: 60, windowMinutes: 10 };

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const { unitId, objectiveId } = body ?? {};
    const topic = textField(body?.topic, "topic", 200, { required: true });
    if (!topic.ok) return badRequest(topic.error);
    const errorText = textField(body?.errorText, "errorText", TEXT_LIMITS.answer, { required: true });
    if (!errorText.ok) return badRequest(errorText.error);
    const why = textField(body?.why, "why", TEXT_LIMITS.why);
    if (!why.ok) return badRequest(why.error);
    const classification = textField(body?.classification, "classification", 50);
    if (!classification.ok) return badRequest(classification.error);
    const user = await requireUser(req);
    const userId = user.id;

    let unit: string | null = null;
    let objective: string | null = null;
    if (objectiveId !== undefined && objectiveId !== null && objectiveId !== "") {
      const o = typeof objectiveId === "string" ? await visibleObjective(objectiveId, userId) : null;
      if (!o) return notFound("Objective not found");
      objective = o.id;
      unit = o.unit_id;
    }
    if (unitId !== undefined && unitId !== null && unitId !== "") {
      const u = typeof unitId === "string" ? await visibleUnit(unitId, userId) : null;
      if (!u) return notFound("Unit not found");
      if (unit && unit !== u.id) return badRequest("objectiveId is not in unitId");
      unit = u.id;
    }

    try {
      await consumeRateLimit("error_log_create", userId, ERROR_LOG_LIMIT, { userId });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("Too many entries just now. Try again in a few minutes.");
      throw err;
    }

    // FAIL-529: tomorrow by the database's clock, the one the due filter reads.
    const rows = await query(
      `insert into error_log (user_id, unit_id, objective_id, topic, error_text, why, classification, review_stage, next_review_at)
       values ($1,$2,$3,$4,$5,$6,$7,0,current_date + 1) returning *`,
      [userId, unit, objective, topic.value, errorText.value, why.value || null, classification.value || null]
    );
    return ok({ error: rows[0] }, 201);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
