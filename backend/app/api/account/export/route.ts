import { query } from "@/lib/db";
import { unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// GET /api/account/export — every query below is scoped to the caller's own
// user_id, so this can only ever return the requesting user's own data.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);

    const [profile, tracks, mastery, attempts, errorLog, chatMessages, studySessions] = await Promise.all([
      query("select id, email, display_name, created_at from app_users where id = $1", [user.id]),
      query("select * from subject_tracks where user_id = $1", [user.id]),
      query("select * from mastery where user_id = $1", [user.id]),
      query("select * from attempts where user_id = $1 order by created_at asc", [user.id]),
      query("select * from error_log where user_id = $1 order by created_at asc", [user.id]),
      query("select * from chat_messages where user_id = $1 order by created_at asc", [user.id]),
      query("select * from study_sessions where user_id = $1 order by started_at asc", [user.id]),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      profile: profile[0],
      tracks,
      mastery,
      attempts,
      errorLog,
      chatMessages,
      studySessions,
    };

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=\"ascendra-data-export.json\"",
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
