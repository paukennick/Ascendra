import { query } from "@/lib/db";
import { ok, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// GET /api/courses/:id — one track with its units (+ per-unit mastery rollup) and objectives.
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(req);
    const userId = user.id;
    const tracks = await query(
      `select * from subject_tracks where id = $1`,
      [params.id]
    );
    if (!tracks[0]) return notFound("Track not found");

    const units = await query(
      `select cu.*, vm.total_objectives, vm.mastered_objectives, vm.needs_review_objectives, vm.avg_score_0_4
       from course_units cu
       left join view_unit_mastery vm on vm.unit_id = cu.id
       where cu.track_id = $1
       order by cu.sort_order asc`,
      [params.id]
    );

    const objectives = await query(
      `select o.*, m.status as mastery_status, m.score_0_4 as mastery_score, m.evidence as mastery_evidence
       from objectives o
       join course_units cu on cu.id = o.unit_id
       left join mastery m on m.objective_id = o.id and m.user_id = $2
       where cu.track_id = $1
       order by cu.sort_order asc, o.sort_order asc`,
      [params.id, userId]
    );

    const objectivesByUnit: Record<string, unknown[]> = {};
    for (const obj of objectives as Array<{ unit_id: string }>) {
      (objectivesByUnit[obj.unit_id] ??= []).push(obj);
    }

    const unitsWithObjectives = (units as Array<{ id: string }>).map((u) => ({
      ...u,
      objectives: objectivesByUnit[u.id] ?? [],
    }));

    return ok({ track: tracks[0], units: unitsWithObjectives });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
