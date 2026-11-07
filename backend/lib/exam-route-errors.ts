import { badRequest, forbidden, notFound, serverError, unauthorized, ok } from "@/lib/http";
import { AuthError } from "@/lib/auth/requireUser";
import { AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { ExamSessionError } from "@/lib/exam-sessions";

// REQ-109: one error mapping for the /api/exam routes.
export function examError(err: unknown) {
  if (err instanceof AuthError) return unauthorized(err.message);
  if (err instanceof AcknowledgementError) return forbidden(err.message);
  if (err instanceof ExamSessionError) {
    if (err.status === 404) return notFound(err.message);
    if (err.status === 409) return ok({ error: err.message }, 409);
    return badRequest(err.message);
  }
  return serverError(err);
}
