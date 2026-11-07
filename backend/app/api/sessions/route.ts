import { query } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { visibleTrack } from "@/lib/visibility";
import { startOrTouchSession } from "@/lib/study-sessions";

export const dynamic = "force-dynamic";

// GET /api/sessions?trackId= — recent study sessions.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");
    const user = await requireUser(req);
    const conditions = ["user_id = $1"];
    const values: unknown[] = [user.id];
    if (trackId) {
      conditions.push(`track_id = $${values.length + 1}`);
      values.push(trackId);
    }
    const rows = await query(
      `select * from study_sessions where ${conditions.join(" and ")} order by started_at desc limit 100`,
      values
    );
    return ok({ sessions: rows });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// POST /api/sessions — start a session. Body: { trackId }
// 201 with a new session, or 200 with the learner's existing open session on this track
// (started within the last 30 minutes) after moving its started_at to now.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trackId } = body ?? {};
    if (!trackId || typeof trackId !== "string") return badRequest("trackId is required");
    const user = await requireUser(req);
    // REQ-091: a session can only be logged against a track the caller can see.
    if (!(await visibleTrack(trackId, user.id))) return notFound("Track not found");
    const { session, created } = await startOrTouchSession(user.id, trackId);
    return ok({ session }, created ? 201 : 200);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// PATCH /api/sessions — end a session. Body: { id, summary? }
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, summary } = body ?? {};
    if (!id) return badRequest("id is required");
    // REQ-079: was unauthenticated and matched by id alone -- anyone could
    // end anyone's session. Scoped to the caller's own rows.
    const user = await requireUser(req);
    const rows = await query(
      `update study_sessions set ended_at = now(), summary = coalesce($3, summary)
        where id = $1 and user_id = $2 returning *`,
      [id, user.id, summary ?? null]
    );
    if (!rows[0]) return notFound("Session not found");
    return ok({ session: rows[0] });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
