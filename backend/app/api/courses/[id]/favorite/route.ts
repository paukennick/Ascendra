import { query, queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// PATCH /api/courses/:id/favorite — Body: { favorite: boolean }
// Only ever touches a track owned by the caller (see the `and user_id = $3`
// below) -- same ownership pattern as GET /api/courses/:id.
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

    const rows = await query(
      `update subject_tracks set is_favorite = $1 where id = $2 and user_id = $3 returning *`,
      [favorite, id, user.id]
    );
    if (!rows[0]) return notFound("Track not found");
    return ok({ track: rows[0] });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
