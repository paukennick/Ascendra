import { query } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// GET /api/attempts?trackId=&unitId=&objectiveId=&kind=&limit= — filterable answer history.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");
    const unitId = searchParams.get("unitId");
    const objectiveId = searchParams.get("objectiveId");
    const kind = searchParams.get("kind");
    // FAIL-892: ?limit=-1 went to Postgres as "limit -1" and came back a 500.
    // A limit that is not a whole number of 1 or more is a 400 (as on
    // /api/errors); a large one is capped.
    const limitParam = searchParams.get("limit");
    const requested = limitParam === null ? 200 : Number(limitParam);
    if (limitParam !== null && (limitParam.trim() === "" || !Number.isSafeInteger(requested) || requested < 1)) {
      return badRequest("limit must be a whole number of 1 or more");
    }
    const limit = Math.min(requested, 500);

    const user = await requireUser(req);
    const userId = user.id;
    const conditions: string[] = ["a.user_id = $1"];
    const values: unknown[] = [userId];

    if (trackId) {
      conditions.push(`cu.track_id = $${values.length + 1}`);
      values.push(trackId);
    }
    if (unitId) {
      conditions.push(`a.unit_id = $${values.length + 1}`);
      values.push(unitId);
    }
    if (objectiveId) {
      conditions.push(`a.objective_id = $${values.length + 1}`);
      values.push(objectiveId);
    }
    if (kind) {
      conditions.push(`a.kind = $${values.length + 1}`);
      values.push(kind);
    }

    values.push(limit);
    const rows = await query(
      `select a.*, o.title as objective_title, cu.title as unit_title, cu.track_id
       from attempts a
       left join objectives o on o.id = a.objective_id
       left join course_units cu on cu.id = a.unit_id
       where ${conditions.join(" and ")}
       order by a.created_at desc
       limit $${values.length}`,
      values
    );
    return ok({ attempts: rows });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
