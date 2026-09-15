import { query, getDefaultUserId } from "@/lib/db";
import { ok, serverError, badRequest } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/courses — list all tracks with rollup progress.
export async function GET() {
  try {
    const rows = await query(
      `select st.*, vp.total_units, vp.total_objectives, vp.mastered_objectives, vp.percent_complete
       from subject_tracks st
       left join view_track_progress vp on vp.track_id = st.id
       order by st.created_at asc`
    );
    return ok({ tracks: rows });
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/courses — create a new track (course). Body: { code, title, description?, trackType }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, title, description, trackType } = body ?? {};
    if (!code || !title || !trackType) {
      return badRequest("code, title, and trackType are required");
    }
    const userId = await getDefaultUserId();
    const rows = await query(
      `insert into subject_tracks (user_id, code, title, description, track_type)
       values ($1, $2, $3, $4, $5) returning *`,
      [userId, code, title, description ?? null, trackType]
    );
    return ok({ track: rows[0] }, 201);
  } catch (err) {
    return serverError(err);
  }
}
