import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { isUuid } from "@/lib/visibility";
import { resolveToday } from "@/lib/study-plan-store";
import { deleteOutcome, updateOutcome, validateOutcome } from "@/lib/exam-outcomes";

export const dynamic = "force-dynamic";

// PATCH /api/exam-outcomes/:id { examDate?, result?, score?, today? } -- REQ-119.
// Only the caller's own report; anyone else's id answers 404.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!isUuid(id)) return notFound("Exam result not found");
    const body = await req.json().catch(() => null);
    const v = validateOutcome(body, resolveToday(body?.today), true);
    if (!v.ok) return badRequest(v.error);
    const outcome = await updateOutcome(user.id, id, v.value);
    if (!outcome) return notFound("Exam result not found");
    return ok({ outcome });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// DELETE /api/exam-outcomes/:id -- removes the report and its event.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!isUuid(id) || !(await deleteOutcome(user.id, id))) return notFound("Exam result not found");
    return ok({ deleted: true });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
