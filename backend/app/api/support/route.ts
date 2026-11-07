import { query, queryOne } from "@/lib/db";
import { ok, badRequest, unauthorized, serverError, tooManyRequests, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { sendSupportRequestNotification } from "@/lib/email";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { textField } from "@/lib/text-input";

export const dynamic = "force-dynamic";

// REQ-093: "content_report" is the in-lesson "Report a problem" button, tied
// to the objective and lesson step so the reviewer can find it.
const KINDS = ["ticket", "course_request", "content_report"] as const;
const STAGES = ["guess", "teach", "fade", "solo", "lab"] as const;
type Kind = (typeof KINDS)[number];

const MAX_SUBJECT = 200;
const MAX_BODY = 5000;
const MAX_COURSE_NAME = 200;
const MAX_URL = 2000;
// Anyone signed in can file these, and each one emails a human, so cap how
// many a single account can open per hour -- otherwise one account can
// flood both the queue and the mailbox.
const RATE_LIMIT_PER_HOUR = 10;

// REQ-119 (FAIL-400): a NUL character or half an emoji (a lone surrogate)
// in any field reached the INSERT and came back as a 500. textField refuses
// both with a 400, as every other learner-text route does (REQ-135).
function trimmedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !textField(trimmed, "field", max).ok) return null;
  return trimmed;
}

// GET /api/support — the caller's own submissions, newest first.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const rows = await query(
      `select id, kind, subject, body, status, track_id, course_name, course_source_url,
              objective_id, lesson_stage, admin_note, created_at, updated_at
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
    const payload = await readJson(req);

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

    let objectiveId: string | null = null;
    let lessonStage: string | null = null;
    if (kind === "content_report") {
      if (
        typeof payload?.objectiveId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.objectiveId)
      ) {
        return badRequest("objectiveId is required for a content report");
      }
      const obj = await queryOne<{ id: string }>(`select id from objectives where id = $1`, [payload.objectiveId]);
      if (!obj) return badRequest("objectiveId not found");
      objectiveId = obj.id;
      if (payload?.stage != null) {
        if (!STAGES.includes(payload.stage)) return badRequest(`stage must be one of: ${STAGES.join(", ")}`);
        lessonStage = payload.stage;
      }
    }

    // Only accept a track the caller actually owns -- otherwise the id is a
    // way to probe whether arbitrary track ids exist.
    let trackId: string | null = null;
    if (payload?.trackId) {
      const owned = await queryOne<{ id: string }>(
        `select id from subject_tracks where id = $1 and (user_id is null or user_id = $2)`,
        [payload.trackId, user.id]
      );
      if (!owned) return badRequest("trackId not found");
      trackId = owned.id;
    }

    // REQ-119 (FAIL-401): this was a count of the last hour's rows followed
    // by the insert, so requests sent at once all counted under the cap and
    // all got in (each emailing a human). consumeRateLimit counts and
    // records in one locked step.
    try {
      await consumeRateLimit("support_request", user.id, { max: RATE_LIMIT_PER_HOUR, windowMinutes: 60 }, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) {
        return tooManyRequests("You've submitted several requests recently. Try again in a little while.");
      }
      throw err;
    }

    const created = await queryOne(
      `insert into support_requests
         (user_id, kind, subject, body, track_id, course_name, course_source_url, objective_id, lesson_stage)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id, kind, subject, body, status, track_id, course_name, course_source_url,
                 objective_id, lesson_stage, created_at, updated_at`,
      [user.id, kind, subject, body, trackId, courseName, courseSourceUrl, objectiveId, lessonStage]
    );

    // Stored already -- a mail failure must not fail the submission.
    await sendSupportRequestNotification({
      kind,
      subject,
      body,
      fromEmail: user.email,
      courseName,
      courseSourceUrl,
      objectiveId,
      lessonStage,
    }).catch(() => undefined);

    return ok({ request: created }, 201);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
