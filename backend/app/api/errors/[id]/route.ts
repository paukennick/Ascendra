import { queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { nextReviewDate, toDateOnlyString } from "@/lib/mastery";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// PATCH /api/errors/:id — advance or resolve a spaced-review entry.
// Body: { action: "reviewed" } advances review_stage (1 -> 7 -> 21 -> resolved)
//       { action: "resolve" } marks resolved immediately (e.g. dismissed as understood)
//
// REQ-079: this route had no authentication at all and matched the row by
// id alone, so any caller who knew (or guessed) an id could resolve or
// advance another user's review entries. Every query is now scoped to the
// signed-in user's own rows, same as GET /api/errors always was.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const body = await req.json();
    const action = body?.action;
    if (action !== "reviewed" && action !== "resolve") {
      return badRequest("action must be 'reviewed' or 'resolve'");
    }

    const current = await queryOne<{ review_stage: number }>(
      `select review_stage from error_log where id = $1 and user_id = $2`,
      [id, user.id]
    );
    if (!current) return notFound("Error log entry not found");

    if (action === "resolve") {
      const row = await queryOne(
        `update error_log set resolved = true, next_review_at = null
          where id = $1 and user_id = $2 returning *`,
        [id, user.id]
      );
      return ok({ error: row });
    }

    const newStage = current.review_stage + 1;
    const next = nextReviewDate(new Date(), newStage);
    const row = await queryOne(
      `update error_log set review_stage = $3, next_review_at = $4, resolved = $5
        where id = $1 and user_id = $2 returning *`,
      [id, user.id, newStage, next ? toDateOnlyString(next) : null, next === null]
    );
    return ok({ error: row });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
