import { query, queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { sanitizeLessonProgress } from "@/lib/lesson-progress";

export const dynamic = "force-dynamic";

// REQ-089: the caller's saved place inside one objective's lesson, so it
// follows the account across devices. See migration 025.

// The objective must sit in a track the caller can see (a shared catalog
// track or one of their own), the same check as PUT .../mastery (REQ-079).
async function visibleObjective(objectiveId: string, userId: string) {
  return queryOne<{ id: string }>(
    `select o.id from objectives o
     join course_units cu on cu.id = o.unit_id
     join subject_tracks st on st.id = cu.track_id
     where o.id = $1 and (st.user_id is null or st.user_id = $2)`,
    [objectiveId, userId]
  );
}

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

// PUT /api/objectives/:id/progress  Body: { step, guess, guessFeedback, confidence, lessonKey, checks }
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const input = sanitizeLessonProgress(await req.json().catch(() => null));
    if (typeof input === "string") return badRequest(input);
    if (!(await visibleObjective(id, user.id))) return notFound("Objective not found");
    await query(
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
    await query(`delete from lesson_progress where user_id = $1 and objective_id = $2`, [user.id, id]);
    return ok({ cleared: true });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
