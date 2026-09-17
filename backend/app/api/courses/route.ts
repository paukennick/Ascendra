import { query } from "@/lib/db";
import { ok, serverError, badRequest, unauthorized } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// GET /api/courses — list all tracks with rollup progress + last-studied time.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const rows = await query(
      `select st.*, vp.total_units, vp.total_objectives, vp.mastered_objectives, vp.percent_complete,
              ss.last_studied_at
       from subject_tracks st
       left join view_track_progress vp on vp.track_id = st.id
       left join (
         select track_id, max(started_at) as last_studied_at
         from study_sessions
         where user_id = $1
         group by track_id
       ) ss on ss.track_id = st.id
       where st.user_id = $1
       order by st.created_at asc`,
      [user.id]
    );
    return ok({ tracks: rows });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
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
    const user = await requireUser(req);
    const rows = await query(
      `insert into subject_tracks (user_id, code, title, description, track_type)
       values ($1, $2, $3, $4, $5) returning *`,
      [user.id, code, title, description ?? null, trackType]
    );
    return ok({ track: rows[0] }, 201);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
