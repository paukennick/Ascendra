import { query } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { toDateOnlyString } from "@/lib/mastery";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

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

    const conditions: string[] = ["e.user_id = $1", "e.resolved = false"];
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
      `select e.*, o.title as objective_title, cu.title as unit_title,
              cu.track_id, st.title as track_title, count(*) over () as __total
       from error_log e
       left join objectives o on o.id = e.objective_id
       left join course_units cu on cu.id = e.unit_id
       left join subject_tracks st on st.id = cu.track_id
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
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { unitId, objectiveId, topic, errorText, why, classification } = body ?? {};
    if (!topic || !errorText) return badRequest("topic and errorText are required");
    const user = await requireUser(req);
    const userId = user.id;
    const next = new Date();
    next.setDate(next.getDate() + 1);
    const rows = await query(
      `insert into error_log (user_id, unit_id, objective_id, topic, error_text, why, classification, review_stage, next_review_at)
       values ($1,$2,$3,$4,$5,$6,$7,0,$8) returning *`,
      [userId, unitId ?? null, objectiveId ?? null, topic, errorText, why ?? null, classification ?? null, toDateOnlyString(next)]
    );
    return ok({ error: rows[0] }, 201);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
