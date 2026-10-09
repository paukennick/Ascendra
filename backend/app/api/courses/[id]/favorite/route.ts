import { query, queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// PATCH /api/courses/:id/favorite — Body: { favorite: boolean }
// REQ-082: favorites are per user (course_favorites), not a flag on the
// track, now that catalog tracks are shared. The track must be visible to
// the caller (catalog or their own).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const body = await req.json();
    const favorite = body?.favorite;
    if (typeof favorite !== "boolean") return badRequest("favorite must be a boolean");

    const visible = await queryOne<{ id: string }>(
      `select id from subject_tracks where id = $1 and (user_id is null or user_id = $2)`,
      [id, user.id]
    );
    if (!visible) return notFound("Track not found");
    if (favorite) {
      await query(
        `insert into course_favorites (user_id, track_id) values ($1, $2) on conflict do nothing`,
        [user.id, id]
      );
    } else {
      await query(`delete from course_favorites where user_id = $1 and track_id = $2`, [user.id, id]);
    }
    const rows = await query(
      `select st.*, $2::boolean as is_favorite from subject_tracks st where st.id = $1`,
      [id, favorite]
    );
    return ok({ track: rows[0] });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
