import { query, queryOne, withTransaction } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  sanitizeLessonProgress,
  progressAgeMs,
  MAX_PROGRESS_BODY_CHARS,
  MAX_PROGRESS_ROWS,
  PROGRESS_MAX_AGE_DAYS,
} from "@/lib/lesson-progress";
import { visibleObjective, isUuid } from "@/lib/visibility";

export const dynamic = "force-dynamic";

// REQ-089: the caller's saved place inside one objective's lesson, so it
// follows the account across devices. See migration 025.

// GET /api/objectives/:id/progress -> { progress: {...} | null }
// progress.savedAt is the server's clock; progress.ageMs (REQ-098) is how
// long ago it was saved, which the app uses so its own clock's skew
// doesn't matter.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    // REQ-098: a non-uuid id used to reach Postgres and come back as a 500.
    if (!isUuid(id)) return ok({ progress: null });
    const row = await queryOne<{
      step: string;
      guess: string;
      guess_feedback: string | null;
      confidence: number | null;
      lesson_key: string;
      checks: unknown;
      updated_at: string;
      db_now: string;
    }>(
      `select step, guess, guess_feedback, confidence, lesson_key, checks, updated_at, now() as db_now
         from lesson_progress where user_id = $1 and objective_id = $2`,
      [user.id, id]
    );
    if (!row) return ok({ progress: null });
    return ok({
      progress: {
        step: row.step,
        guess: row.guess,
        guessFeedback: row.guess_feedback,
        confidence: row.confidence,
        lessonKey: row.lesson_key,
        checks: row.checks ?? {},
        savedAt: new Date(row.updated_at).getTime(),
        ageMs: progressAgeMs(row.updated_at, row.db_now),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// PUT /api/objectives/:id/progress  Body: { step, guess, guessFeedback, confidence, lessonKey, checks }
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    // REQ-098: cap the body before parsing it (see lib/lesson-progress.ts).
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_PROGRESS_BODY_CHARS * 4) return badRequest("Saved position is too large");
    const raw = await req.text();
    if (raw.length > MAX_PROGRESS_BODY_CHARS) return badRequest("Saved position is too large");
    let body: unknown = null;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    const input = sanitizeLessonProgress(body);
    if (typeof input === "string") return badRequest(input);
    if (!(await visibleObjective(id, user.id))) return notFound("Objective not found");
    await withTransaction(async (tx) => {
      await tx.query(
        `insert into lesson_progress
           (user_id, objective_id, step, guess, guess_feedback, confidence, lesson_key, checks, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8, now())
         on conflict (user_id, objective_id) do update set
           step = excluded.step, guess = excluded.guess, guess_feedback = excluded.guess_feedback,
           confidence = excluded.confidence, lesson_key = excluded.lesson_key,
           checks = excluded.checks, updated_at = now()`,
        [
          user.id,
          id,
          input.step,
          input.guess,
          input.guessFeedback,
          input.confidence,
          input.lessonKey,
          JSON.stringify(input.checks),
        ]
      );
      // REQ-098: keep this learner's saved positions bounded -- drop any the
      // app would discard as stale anyway, and beyond the newest
      // MAX_PROGRESS_ROWS. Uses the primary key's user_id prefix.
      await tx.query(
        `delete from lesson_progress
          where user_id = $1
            and (updated_at < now() - make_interval(days => $2)
                 or objective_id in (
                   select objective_id from lesson_progress where user_id = $1
                    order by updated_at desc offset $3
                 ))`,
        [user.id, PROGRESS_MAX_AGE_DAYS, MAX_PROGRESS_ROWS]
      );
    });
    return ok({ saved: true });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// DELETE /api/objectives/:id/progress -- finished, regenerated, or abandoned.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    // REQ-098: nothing to clear for a non-uuid id (used to be a 500).
    if (!isUuid(id)) return ok({ cleared: true });
    await query(`delete from lesson_progress where user_id = $1 and objective_id = $2`, [user.id, id]);
    return ok({ cleared: true });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
