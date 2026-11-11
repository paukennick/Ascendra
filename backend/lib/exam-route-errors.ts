import { badRequest, forbidden, notFound, serverError, unauthorized, ok } from "@/lib/http";
import { AuthError } from "@/lib/auth/requireUser";
import { AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { ExamSessionError } from "@/lib/exam-sessions";

export const SESSION_ALREADY_STARTED = "That session was already started. Reload to continue it.";

// FAIL-880: the unique index on (user, clientSessionId) refused a second
// insert. That is the same start sent twice, not a server fault.
function isSessionStartConflict(err: unknown): boolean {
  const e = err as { code?: unknown; constraint?: unknown } | null;
  return e?.code === "23505" && e.constraint === "exam_sessions_user_client_unique";
}

// REQ-109: one error mapping for the /api/exam routes.
export function examError(err: unknown) {
  if (isSessionStartConflict(err)) return ok({ error: SESSION_ALREADY_STARTED }, 409);
  if (err instanceof AuthError) return unauthorized(err.message);
  if (err instanceof AcknowledgementError) return forbidden(err.message, err.extra);
  if (err instanceof ExamSessionError) {
    if (err.status === 404) return notFound(err.message);
    if (err.status === 409) return ok({ error: err.message }, 409);
    return badRequest(err.message);
  }
  return serverError(err);
}
