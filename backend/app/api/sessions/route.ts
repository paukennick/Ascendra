import { query, getDefaultUserId } from "@/lib/db";
import { ok, badRequest, serverError } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/sessions?trackId= — recent study sessions.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");
    const userId = await getDefaultUserId();
    const conditions = ["user_id = $1"];
    const values: unknown[] = [userId];
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
    return serverError(err);
  }
}

// POST /api/sessions — start a session. Body: { trackId }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trackId } = body ?? {};
    if (!trackId) return badRequest("trackId is required");
    const userId = await getDefaultUserId();
    const rows = await query(
      `insert into study_sessions (user_id, track_id) values ($1,$2) returning *`,
      [userId, trackId]
    );
    return ok({ session: rows[0] }, 201);
  } catch (err) {
    return serverError(err);
  }
}

// PATCH /api/sessions — end a session. Body: { id, summary? }
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, summary } = body ?? {};
    if (!id) return badRequest("id is required");
    const rows = await query(
      `update study_sessions set ended_at = now(), summary = coalesce($2, summary) where id = $1 returning *`,
      [id, summary ?? null]
    );
    return ok({ session: rows[0] });
  } catch (err) {
    return serverError(err);
  }
}
