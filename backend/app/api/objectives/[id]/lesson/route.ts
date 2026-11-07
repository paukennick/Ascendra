import { after } from "next/server";
import { ok, notFound, unauthorized, forbidden, tooManyRequests, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { visibleObjective } from "@/lib/visibility";
import {
  requireAcknowledgementForObjective,
  AcknowledgementError,
} from "@/lib/auth/requireAcknowledgement";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import {
  loadObjective,
  rowToLesson,
  ensureGeneration,
  startRegeneration,
  readLessonForUser,
  pendingGeneration,
  pendingKey,
  REGEN_LIMIT,
  REGEN_RATE_EVENT,
  GENERATE_LIMIT,
  GENERATE_RATE_EVENT,
} from "@/lib/lesson-generation";
import { SHARED } from "@/lib/lesson-store";

export const dynamic = "force-dynamic";

// GET /api/objectives/:id/lesson -- returns the lesson this learner should
// see: their own regenerated lesson if they have one, otherwise the shared
// lesson for the objective. On a miss of both, generates the shared lesson
// and returns the guess+teach half as soon as it's ready
// (`practicePending: true`) instead of blocking on the full generation --
// measured around 20s combined, vs. ~13s for guess+teach alone. The learner
// spends real time on those two steps before reaching fade/solo, so the
// practice half generates invisibly in the background (`after()` keeps it
// running past this response) rather than as an up-front wait. A second GET
// once they reach fade either gets the now-complete cached row, or awaits the
// same in-flight generation if it's still running -- including one started
// early by .../lesson/prefetch-next for this exact objective, and including
// one running on a different server instance (see lib/lesson-generation.ts).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Was previously unauthenticated: any objective id would return its
    // lesson, and a cache miss would spend an Anthropic call doing it.
    const user = await requireUser(req);
    const viewer = { userId: user.id, objectiveId: id };
    // Audit 2: the access check REQ-091 added everywhere else. The disclaimer
    // gate below returns silently for a track the caller can't see, so it is
    // not an access check on its own.
    if (!(await visibleObjective(id, user.id))) return notFound("Objective not found");
    await requireAcknowledgementForObjective(id, user.id);

    // This learner's own regenerate still running in this process: wait for
    // it rather than serve the lesson they just replaced.
    const ownRegen = pendingGeneration.get(pendingKey(id, { kind: "user", userId: user.id }));
    if (ownRegen) {
      const generated = await ownRegen.fullPromise;
      return ok({ lesson: rowToLesson(generated, viewer), cached: false });
    }

    // Their own regenerated lesson if they have one, else the shared one.
    // (Waits first if their regenerate is running on another instance.)
    const existing = await readLessonForUser(user.id, id);
    if (existing) return ok({ lesson: rowToLesson(existing.row, viewer), cached: true });

    // Shared first generation already running in this process (a prefetch,
    // or another learner's first visit): wait for that same one.
    const inFlight = pendingGeneration.get(pendingKey(id, SHARED));
    if (inFlight) {
      const generated = await inFlight.fullPromise;
      return ok({ lesson: rowToLesson(generated, viewer), cached: false });
    }

    const objRow = await loadObjective(id);
    if (!objRow) return notFound("Objective not found");

    // REQ-098: starting a new generation counts against a per-learner budget.
    try {
      await consumeRateLimit(GENERATE_RATE_EVENT, user.id, GENERATE_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) {
        return tooManyRequests("You've opened a lot of new lessons just now. Please wait a few minutes and try again.");
      }
      throw err;
    }

    const handle = ensureGeneration(id, objRow, { scope: SHARED });
    const intro = await handle.introPromise;
    // null: another server instance is generating (or has just finished)
    // this lesson. Wait for its stored result so every part of what the
    // learner sees comes from one generation.
    if (!intro) {
      const generated = await handle.fullPromise;
      return ok({ lesson: rowToLesson(generated, viewer), cached: false });
    }
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

// POST /api/objectives/:id/lesson -- regenerate THIS learner's lesson for the
// objective. Per learner: it writes only the caller's own override row and
// never touches the shared lesson, so it changes nothing for anyone else
// (and nobody else's saved place in the lesson stops matching). Same
// progressive shape as GET: a freshly generated guess+teach comes back
// immediately, fade/solo regenerate in the background and are stored once
// both halves are done. `avoid` steers both halves away from the content the
// caller currently sees (their previous regenerate, else the shared lesson)
// so a regenerate actually comes back with different material instead of
// Claude converging back onto the same answer for the same prompt. Rate
// limited per learner; 429 when over.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Regeneration always spends Anthropic calls, so this needs auth at
    // least as much as the GET does.
    const user = await requireUser(req);
    const viewer = { userId: user.id, objectiveId: id };
    // Audit 2: the access check REQ-091 added everywhere else. The disclaimer
    // gate below returns silently for a track the caller can't see, so it is
    // not an access check on its own.
    if (!(await visibleObjective(id, user.id))) return notFound("Objective not found");
    await requireAcknowledgementForObjective(id, user.id);

    // Double tap, or a retry while the first regenerate is still running:
    // share that one. Free -- it does not count against the limit.
    const inFlight = pendingGeneration.get(pendingKey(id, { kind: "user", userId: user.id }));
    if (inFlight) {
      const generated = await inFlight.fullPromise;
      return ok({ lesson: rowToLesson(generated, viewer), cached: false });
    }

    const objRow = await loadObjective(id);
    if (!objRow) return notFound("Objective not found");

    try {
      await consumeRateLimit(REGEN_RATE_EVENT, user.id, REGEN_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) {
        return tooManyRequests("You have regenerated this lesson a lot just now. Please wait a few minutes and try again.");
      }
      throw err;
    }

    const handle = await startRegeneration(user.id, id, objRow);
    const intro = await handle.introPromise;
    // null: this learner's regenerate is already running on another
    // instance; hand back its finished result.
    if (!intro) {
      const generated = await handle.fullPromise;
      return ok({ lesson: rowToLesson(generated, viewer), cached: false });
    }
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
