import { query } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { visibleTrack, isUuid } from "@/lib/visibility";
import { textField } from "@/lib/text-input";
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
      // REQ-135: a non-uuid id used to reach Postgres and come back as a 500.
      if (!isUuid(trackId)) return ok({ sessions: [] });
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
    const body = await readJson(req);
    const { trackId } = body ?? {};
    if (!trackId || typeof trackId !== "string") return badRequest("trackId is required");
    const user = await requireUser(req);
    // REQ-129: a session can only be logged against a track the caller can see.
    const track = await visibleTrack(trackId, user.id);
    if (!track) return notFound("Track not found");
    // REQ-135: the canonical (lowercase) id, however the client spelled it.
    const { session, created } = await startOrTouchSession(user.id, track.id);
    return ok({ session }, created ? 201 : 200);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// PATCH /api/sessions — end a session. Body: { id, summary? }
export async function PATCH(req: Request) {
  try {
    const body = await readJson(req);
    const { id, summary } = body ?? {};
    if (!id) return badRequest("id is required");
    if (summary != null && typeof summary !== "string") return badRequest("summary must be a string");
    const s = textField(summary, "summary", 4_000);
    if (!s.ok) return badRequest(s.error);
    // REQ-079: was unauthenticated and matched by id alone -- anyone could
    // end anyone's session. Scoped to the caller's own rows.
    const user = await requireUser(req);
    if (!isUuid(id)) return notFound("Session not found");
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
