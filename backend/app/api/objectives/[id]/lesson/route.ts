import { after } from "next/server";
import { queryOne } from "@/lib/db";
import { ok, notFound, unauthorized, forbidden, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import {
  requireAcknowledgementForObjective,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import {
  loadObjective,
  rowToAvoid,
  rowToLesson,
  ensureGeneration,
  pendingGeneration,
  type LessonRow,
} from "@/lib/lesson-generation";

export const dynamic = "force-dynamic";

// GET /api/objectives/:id/lesson -- returns cached lesson content. On a cache
// miss, generates and returns the guess+teach half as soon as it's ready
// (`practicePending: true`) instead of blocking on the full generation --
// measured around 20s combined, vs. ~13s for guess+teach alone. The learner
// spends real time on those two steps before reaching fade/solo, so the
// practice half generates invisibly in the background (`after()` keeps it
// running past this response) rather than as an up-front wait. A second GET
// once they reach fade either gets the now-complete cached row, or awaits the
// same in-flight generation if it's still running -- including one started
// early by .../lesson/prefetch-next for this exact objective.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Was previously unauthenticated: any objective id would return its
    // lesson, and a cache miss would spend an Anthropic call doing it.
    const user = await requireUser(req);
    await requireAcknowledgementForObjective(id, user.id);

    const inFlight = pendingGeneration.get(id);
    if (inFlight) {
      const generated = await inFlight.fullPromise;
      return ok({ lesson: rowToLesson(generated), cached: false });
    }

    const existing = await queryOne<LessonRow>(
      `select * from lesson_content where objective_id = $1`,
      [id]
    );
    if (existing) return ok({ lesson: rowToLesson(existing), cached: true });

    const objRow = await loadObjective(id);
    if (!objRow) return notFound("Objective not found");

    const handle = ensureGeneration(id, objRow);
    const intro = await handle.introPromise;
    after(() => handle.fullPromise.catch(() => {}));

    return ok({
      lesson: { guessPrompt: intro.guessPrompt, teach: intro.teach },
      cached: false,
      practicePending: true,
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}

// POST /api/objectives/:id/lesson -- force-regenerate lesson content
// (overwrites the cache). Same progressive shape as GET: a freshly generated
// guess+teach comes back immediately, fade/solo regenerate in the background
// and overwrite the row once both halves are done. `avoid` steers both halves
// away from the objective's current cached content so a regenerate actually
// comes back with different material instead of Claude converging back onto
// the same answer for the same prompt.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Regeneration always spends an Anthropic call and overwrites the
    // cache, so this needs auth at least as much as the GET does.
    const user = await requireUser(req);
    await requireAcknowledgementForObjective(id, user.id);

    const inFlight = pendingGeneration.get(id);
    if (inFlight) {
      const generated = await inFlight.fullPromise;
      return ok({ lesson: rowToLesson(generated), cached: false });
    }

    const objRow = await loadObjective(id);
    if (!objRow) return notFound("Objective not found");

    const existing = await queryOne<LessonRow>(
      `select * from lesson_content where objective_id = $1`,
      [id]
    );
    const avoid = existing ? rowToAvoid(existing) : undefined;

    const handle = ensureGeneration(id, objRow, avoid);
    const intro = await handle.introPromise;
    after(() => handle.fullPromise.catch(() => {}));

    return ok({
      lesson: { guessPrompt: intro.guessPrompt, teach: intro.teach },
      cached: false,
      practicePending: true,
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message);
    return serverError(err);
  }
}
