import { queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { sanitizeLessonProgress, progressAgeMs, validClientTime, MAX_PROGRESS_BODY_CHARS } from "@/lib/lesson-progress";
import { clearLessonProgressAt, saveLessonProgress } from "@/lib/lesson-progress-store";
import { taughtObjective, isUuid } from "@/lib/visibility";

export const dynamic = "force-dynamic";

// REQ-127: the caller's saved place inside one objective's lesson, so it
// follows the account across devices. See migration 027a.

// GET /api/objectives/:id/progress -> { progress: {...} | null }
// progress.savedAt is the server's clock; progress.ageMs (REQ-135) is how
// long ago it was saved, which the app uses so its own clock's skew
// doesn't matter.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    // REQ-135: a non-uuid id used to reach Postgres and come back as a 500.
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

// PUT /api/objectives/:id/progress  Body: { step, guess, guessFeedback, confidence, lessonKey, checks, savedAt }
// REQ-101: a save whose savedAt is not after the last DELETE is ignored
// ({ saved: false }) -- it was overtaken by the delete and is stale.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    // REQ-135: cap the body before parsing it (see lib/lesson-progress.ts).
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
    if (!(await taughtObjective(id, user.id))) return notFound("Objective not found");
    // REQ-101: ordered against deletes by the app's savedAt (tombstones);
    // REQ-135: the store also keeps this learner's saved positions bounded.
    const savedAt = validClientTime((body as Record<string, unknown>).savedAt);
    return ok(await saveLessonProgress(user.id, id, input, savedAt));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// DELETE /api/objectives/:id/progress  Body (optional): { clearedAt }
// Finished, regenerated, or abandoned.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    // REQ-135: nothing to clear for a non-uuid id (used to be a 500).
    if (!isUuid(id)) return ok({ cleared: true });
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    await clearLessonProgressAt(user.id, id, validClientTime(body?.clearedAt));
    return ok({ cleared: true });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
