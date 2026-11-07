import { queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { advanceReviewStage } from "@/lib/grading-service";
import { isUuid } from "@/lib/visibility";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// PATCH /api/errors/:id — advance or resolve a spaced-review entry.
// Body: { action: "reviewed" } advances review_stage (1 -> 7 -> 21 -> resolved)
//       (optional fromStage: the stage the learner saw; a repeat of the same tap is a no-op)
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

    if (!isUuid(id)) return notFound("Error log entry not found");

    if (action === "resolve") {
      const row = await queryOne(
        `update error_log set resolved = true, next_review_at = null
          where id = $1 and user_id = $2 returning *`,
        [id, user.id]
      );
      if (!row) return notFound("Error log entry not found");
      return ok({ error: row });
    }

    // REQ-091: one guarded UPDATE (see advanceReviewStage) instead of
    // read-then-write, so a retry can't skip a stage and a resolved entry
    // never moves past stage 3. `fromStage` is optional: the stage the
    // learner saw, so a repeat of the same tap is a no-op.
    const fromStage = Number.isInteger(body?.fromStage) ? (body.fromStage as number) : null;
    const result = await advanceReviewStage(user.id, id, fromStage);
    if (!result) return notFound("Error log entry not found");
    return ok({ error: result.row, advanced: result.advanced });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
