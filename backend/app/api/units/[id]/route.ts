import { query, getDefaultUserId } from "@/lib/db";
import { ok, notFound, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/units/:id — one unit with its objectives and mastery.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getDefaultUserId();
    const units = await query(`select * from course_units where id = $1`, [params.id]);
    if (!units[0]) return notFound("Unit not found");

    const objectives = await query(
      `select o.*, m.status as mastery_status, m.score_0_4 as mastery_score, m.evidence as mastery_evidence
       from objectives o
       left join mastery m on m.objective_id = o.id and m.user_id = $2
       where o.unit_id = $1
       order by o.sort_order asc`,
      [params.id, userId]
    );

    return ok({ unit: units[0], objectives });
  } catch (err) {
    return serverError(err);
  }
}
