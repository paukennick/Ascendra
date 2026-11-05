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
      query("select track_id, created_at from course_favorites where user_id = $1", [user.id]),
      query("select * from mastery where user_id = $1", [user.id]),
      query("select * from attempts where user_id = $1 order by created_at asc", [user.id]),
      query("select * from error_log where user_id = $1 order by created_at asc", [user.id]),
      query("select * from chat_messages where user_id = $1 order by created_at asc", [user.id]),
      query("select * from study_sessions where user_id = $1 order by started_at asc", [user.id]),
    ]);
    // REQ-093: everything else stored about the account. Secrets (token and
    // code hashes, MFA secrets) are left out: they are not information about
    // the person, and exporting them would only make a stolen export worse.
    const [supportRequests, acknowledgements, legalAcceptances, linkedAccounts, sessions, securityEvents] =
      await Promise.all([
        query("select * from support_requests where user_id = $1 order by created_at asc", [user.id]),
        query("select track_id, disclaimer_key, disclaimer_version, acknowledged_at from track_acknowledgements where user_id = $1", [user.id]),
        query("select document, version, accepted_at from legal_acceptances where user_id = $1 order by accepted_at asc", [user.id]),
        query("select provider, email, created_at from oauth_accounts where user_id = $1", [user.id]),
        query("select ip, user_agent, created_at, last_used_at, expires_at, revoked_at from refresh_tokens where user_id = $1 order by created_at asc", [user.id]),
        query("select event_type, ip, created_at from auth_events where user_id = $1 order by created_at asc", [user.id]),
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
      supportRequests,
      courseAcknowledgements: acknowledgements,
      legalAcceptances,
      linkedAccounts,
      sessions,
      securityEvents,
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
