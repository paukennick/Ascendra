import { query, getDefaultUserId } from "@/lib/db";
import { ok, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/attempts?trackId=&unitId=&objectiveId=&kind=&limit= — filterable answer history.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");
    const unitId = searchParams.get("unitId");
    const objectiveId = searchParams.get("objectiveId");
    const kind = searchParams.get("kind");
    const limit = Math.min(Number(searchParams.get("limit") ?? 200), 500);

    const userId = await getDefaultUserId();
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
      `select a.*, o.title as objective_title, cu.title as unit_title
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
    return serverError(err);
  }
}
