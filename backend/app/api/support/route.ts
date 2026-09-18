import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError, tooManyRequests } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { sendSupportRequestNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

const KINDS = ["ticket", "course_request"] as const;
type Kind = (typeof KINDS)[number];

const MAX_SUBJECT = 200;
const MAX_BODY = 5000;
const MAX_COURSE_NAME = 200;
const MAX_URL = 2000;
// Anyone signed in can file these, and each one emails a human, so cap how
// many a single account can open per hour -- otherwise one account can
// flood both the queue and the mailbox.
const RATE_LIMIT_PER_HOUR = 10;

function trimmedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

// GET /api/support — the caller's own submissions, newest first.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const rows = await query(
      `select id, kind, subject, body, status, track_id, course_name, course_source_url,
              admin_note, created_at, updated_at
         from support_requests
        where user_id = $1
        order by created_at desc`,
      [user.id]
    );
    return ok({ requests: rows });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// POST /api/support — { kind, subject, body, trackId?, courseName?, courseSourceUrl? }
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const payload = await req.json();

    const kind = payload?.kind as Kind;
    if (!KINDS.includes(kind)) return badRequest(`kind must be one of: ${KINDS.join(", ")}`);

    const subject = trimmedString(payload?.subject, MAX_SUBJECT);
    if (!subject) return badRequest(`subject is required (max ${MAX_SUBJECT} characters)`);

    const body = trimmedString(payload?.body, MAX_BODY);
    if (!body) return badRequest(`body is required (max ${MAX_BODY} characters)`);

    let courseName: string | null = null;
    let courseSourceUrl: string | null = null;
    if (kind === "course_request") {
      courseName = trimmedString(payload?.courseName, MAX_COURSE_NAME);
      if (!courseName) return badRequest(`courseName is required (max ${MAX_COURSE_NAME} characters)`);
      if (payload?.courseSourceUrl != null && payload.courseSourceUrl !== "") {
        courseSourceUrl = trimmedString(payload.courseSourceUrl, MAX_URL);
        if (!courseSourceUrl) return badRequest("courseSourceUrl is not a valid value");
        if (!/^https?:\/\//i.test(courseSourceUrl)) {
          return badRequest("courseSourceUrl must start with http:// or https://");
        }
      }
    }

    // Only accept a track the caller actually owns -- otherwise the id is a
    // way to probe whether arbitrary track ids exist.
    let trackId: string | null = null;
    if (payload?.trackId) {
      const owned = await queryOne<{ id: string }>(
        `select id from subject_tracks where id = $1 and user_id = $2`,
        [payload.trackId, user.id]
      );
      if (!owned) return badRequest("trackId not found");
      trackId = owned.id;
    }

    const recent = await queryOne<{ count: string }>(
      `select count(*)::text as count from support_requests
        where user_id = $1 and created_at > now() - interval '1 hour'`,
      [user.id]
    );
    if (recent && Number(recent.count) >= RATE_LIMIT_PER_HOUR) {
      return tooManyRequests("You've submitted several requests recently. Try again in a little while.");
    }

    const created = await queryOne(
      `insert into support_requests (user_id, kind, subject, body, track_id, course_name, course_source_url)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id, kind, subject, body, status, track_id, course_name, course_source_url, created_at, updated_at`,
      [user.id, kind, subject, body, trackId, courseName, courseSourceUrl]
    );

    // Stored already -- a mail failure must not fail the submission.
    await sendSupportRequestNotification({
      kind,
      subject,
      body,
      fromEmail: user.email,
      courseName,
      courseSourceUrl,
    }).catch(() => undefined);

    return ok({ request: created }, 201);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
