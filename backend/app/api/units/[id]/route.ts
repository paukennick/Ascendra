import { query } from "@/lib/db";
import { ok, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// GET /api/units/:id — one unit with its objectives and mastery.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const units = await query(
      `select cu.* from course_units cu
       join subject_tracks st on st.id = cu.track_id
       where cu.id = $1 and st.user_id = $2`,
      [id, user.id]
    );
    if (!units[0]) return notFound("Unit not found");

    const objectives = await query(
      `select o.*, m.status as mastery_status, m.score_0_4 as mastery_score, m.evidence as mastery_evidence
       from objectives o
       left join mastery m on m.objective_id = o.id and m.user_id = $2
       where o.unit_id = $1
       order by o.sort_order asc`,
      [id, user.id]
    );

    return ok({ unit: units[0], objectives });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
