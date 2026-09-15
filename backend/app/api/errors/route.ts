import { query, getDefaultUserId } from "@/lib/db";
import { ok, badRequest, serverError } from "@/lib/http";
import { toDateOnlyString } from "@/lib/mastery";

export const dynamic = "force-dynamic";

// GET /api/errors?due=1&trackId= — error log. Pass due=1 to get only entries whose
// next_review_at has arrived (the spaced-review queue: 1/7/21 days out).
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const due = searchParams.get("due") === "1";
    const trackId = searchParams.get("trackId");
    const userId = await getDefaultUserId();

    const conditions: string[] = ["e.user_id = $1", "e.resolved = false"];
    const values: unknown[] = [userId];
    if (due) conditions.push("e.next_review_at <= current_date");
    if (trackId) {
      conditions.push(`cu.track_id = $${values.length + 1}`);
      values.push(trackId);
    }

    const rows = await query(
      `select e.*, o.title as objective_title, cu.title as unit_title
       from error_log e
       left join objectives o on o.id = e.objective_id
       left join course_units cu on cu.id = e.unit_id
       where ${conditions.join(" and ")}
       order by e.next_review_at asc nulls last, e.created_at desc`,
      values
    );
    return ok({ errors: rows });
  } catch (err) {
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
    const userId = await getDefaultUserId();
    const next = new Date();
    next.setDate(next.getDate() + 1);
    const rows = await query(
      `insert into error_log (user_id, unit_id, objective_id, topic, error_text, why, classification, review_stage, next_review_at)
       values ($1,$2,$3,$4,$5,$6,$7,0,$8) returning *`,
      [userId, unitId ?? null, objectiveId ?? null, topic, errorText, why ?? null, classification ?? null, toDateOnlyString(next)]
    );
    return ok({ error: rows[0] }, 201);
  } catch (err) {
    return serverError(err);
  }
}
