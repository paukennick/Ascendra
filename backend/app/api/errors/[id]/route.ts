import { queryOne } from "@/lib/db";
import { ok, notFound, serverError } from "@/lib/http";
import { nextReviewDate, toDateOnlyString } from "@/lib/mastery";

export const dynamic = "force-dynamic";

// PATCH /api/errors/:id — advance or resolve a spaced-review entry.
// Body: { action: "reviewed" } advances review_stage (1 -> 7 -> 21 -> resolved)
//       { action: "resolve" } marks resolved immediately (e.g. dismissed as understood)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const action = body?.action;

    const current = await queryOne<{ review_stage: number }>(
      `select review_stage from error_log where id = $1`,
      [id]
    );
    if (!current) return notFound("Error log entry not found");

    if (action === "resolve") {
      const row = await queryOne(
        `update error_log set resolved = true, next_review_at = null where id = $1 returning *`,
        [id]
      );
      return ok({ error: row });
    }

    if (action === "reviewed") {
      const newStage = current.review_stage + 1;
      const next = nextReviewDate(new Date(), newStage);
      const row = await queryOne(
        `update error_log set review_stage = $2, next_review_at = $3, resolved = $4 where id = $1 returning *`,
        [id, newStage, next ? toDateOnlyString(next) : null, next === null]
      );
      return ok({ error: row });
    }

    return ok({ error: current });
  } catch (err) {
    return serverError(err);
  }
}
