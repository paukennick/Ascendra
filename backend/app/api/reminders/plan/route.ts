import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { resolveToday } from "@/lib/study-plan-store";
import { clampPlanDays } from "@/lib/reminder-plan";
import { reminderPlan } from "@/lib/reminder-plan-store";

export const dynamic = "force-dynamic";

// GET /api/reminders/plan?today=YYYY-MM-DD&days=7 -- REQ-197: what the next
// study reminders say, one per day at most, from the learner's real review
// schedule (lib/reminder-plan.ts). `today` is the learner's local date. A day
// with nothing due is missing from `reminders`, and the app sends nothing then.
// Read-only; no AI call.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const url = new URL(req.url);
    const today = resolveToday(url.searchParams.get("today"));
    const days = clampPlanDays(url.searchParams.get("days"));
    return ok({ today, reminders: await reminderPlan(user.id, today, days) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
