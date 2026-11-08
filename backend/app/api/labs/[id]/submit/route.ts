import { ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { labRouteError, submitLab } from "@/lib/lab-routes";

export const dynamic = "force-dynamic";

// POST /api/labs/:id/submit -- REQ-123: grade one step of a lab run (a
// build lab's only step, or the current step of a case).
// Body: { runId, step, answers: string[] (one per rubric part), clientAttemptId? }.
// A resend of an already-graded id replays the stored result; the id on any
// other lab, run, step, answer or route is a 409. The last step finishes the
// run and records ONE attempt (kind 'labtask', lab_build / lab_case) on the
// lab's objective. Returns { step, nextStep, final, replayed } -- see lib/labs.ts.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    return ok(await submitLab(user.id, id, body));
  } catch (err) {
    return labRouteError(err);
  }
}
