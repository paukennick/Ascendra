import { ok, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { labRouteError, submitLab } from "@/lib/lab-routes";
import { rendersInteractiveLabs } from "@/lib/client-protocol";

export const dynamic = "force-dynamic";

// POST /api/labs/:id/submit -- REQ-123: grade one step of a lab run (a
// build lab's only step, or the current step of a case).
// Body: { runId, step, answers: string[] (one per rubric part), clientAttemptId? }.
// REQ-189: an interactive part's answer is its structured string (see
// lib/lab-interactive.ts) and is graded by rule, with no model call.
// A resend of an already-graded id replays the stored result; the id on any
// other lab, run, step, answer or route is a 409. The last step finishes the
// run and records ONE attempt (kind 'labtask', lab_build / lab_case) on the
// lab's objective. Returns { step, nextStep, final, replayed } -- see lib/labs.ts.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readJson(req);
    const user = await requireUser(req);
    return ok(await submitLab(user.id, id, body, undefined, { interactive: rendersInteractiveLabs(req) }));
  } catch (err) {
    return labRouteError(err);
  }
}
