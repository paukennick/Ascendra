import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { startableTrack, visibleTrack } from "@/lib/visibility";
import { buildStudyPlan, keptSummary, sessionChoices } from "@/lib/study-plan";
import { loadPlanInput, planSettings, resolveToday, savePlanSettings, validateSettings } from "@/lib/study-plan-store";
import { placementView } from "@/lib/placement";

export const dynamic = "force-dynamic";

async function planResponse(userId: string, trackId: string, today: string) {
  const settings = await planSettings(userId, trackId);
  const input = await loadPlanInput(userId, trackId, today, settings);
  const plan = buildStudyPlan(input);
  const placement = await placementView(userId, trackId);
  return {
    settings,
    plan,
    sessions: sessionChoices(plan, input),
    kept: keptSummary(input.objectives),
    placement: {
      available: placement.available,
      status: placement.status,
      // Offered up front only to a learner who has not answered anything here yet.
      offer: placement.available && placement.status === "none" && input.objectives.every((o) => o.status === "Not started"),
    },
  };
}

// GET /api/courses/:id/plan?today=YYYY-MM-DD -- REQ-110: the study plan
// (recomputed from current mastery on every open; no AI call), the three
// session choices with a default, the kept-vs-completed summary and whether
// to offer the placement check. `today` is the learner's local date.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    if (!(await visibleTrack(id, user.id))) return notFound("Track not found");
    const today = resolveToday(new URL(req.url).searchParams.get("today"));
    return ok(await planResponse(user.id, id, today));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// PUT /api/courses/:id/plan { examDate: "YYYY-MM-DD" | null, weeklyHours, today? }
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const user = await requireUser(req);
    // REQ-194: setting a plan starts a course, so not on a hidden one the
    // caller never studied (GET stays on visibleTrack).
    if (!(await startableTrack(id, user.id))) return notFound("Track not found");
    const today = resolveToday(body?.today);
    const v = validateSettings(body, today);
    if (!v.ok) return badRequest(v.error);
    await savePlanSettings(user.id, id, v.value);
    return ok(await planResponse(user.id, id, today));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
