import { queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { sanitizeLessonProgress, validClientTime } from "@/lib/lesson-progress";
import { clearLessonProgressAt, saveLessonProgress } from "@/lib/lesson-progress-store";
import { visibleObjective } from "@/lib/visibility";

export const dynamic = "force-dynamic";

// REQ-089: the caller's saved place inside one objective's lesson, so it
// follows the account across devices. See migration 025.

// GET /api/objectives/:id/progress -> { progress: {...} | null }
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const row = await queryOne<{
      step: string;
      guess: string;
      guess_feedback: string | null;
      confidence: number | null;
      lesson_key: string;
      checks: unknown;
      updated_at: string;
    }>(
      `select step, guess, guess_feedback, confidence, lesson_key, checks, updated_at
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
    const body = await req.json().catch(() => null);
    const input = sanitizeLessonProgress(body);
    if (typeof input === "string") return badRequest(input);
    if (!(await visibleObjective(id, user.id))) return notFound("Objective not found");
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
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    await clearLessonProgressAt(user.id, id, validClientTime(body?.clearedAt));
    return ok({ cleared: true });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
