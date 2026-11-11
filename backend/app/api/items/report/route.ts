import { ok, badRequest, notFound, unauthorized, forbidden, tooManyRequests, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { AcknowledgementError } from "@/lib/auth/requireAcknowledgement";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { ReportError, reportItem, resolveReport } from "@/lib/item-report";
import { inBackground } from "@/lib/understanding-ai";

export const dynamic = "force-dynamic";

// REQ-114 (Audit 3 H2): "Report a problem with this question".
//
// POST /api/items/report
//   { kind: "lesson", objectiveId, stage: "fade" | "solo", reason?, note? }
//   { kind: "review" | "exam", sessionId, position, reason?, note? }
//   { kind: "quiz", turnId, reason?, note? }
//   { kind: "comparison", itemId, reason?, note? }
//   { kind: "lab", labId, reason?, note? }
//   { kind: "sim", runId, tick?, stateHash?, reason?, note? }   (REQ-199; 404 while SIMS_ENABLED is off)
// reason: wrong_answer (default) | unclear | outdated | offensive | other;
// note: optional, up to 500 characters.
//
// Records one flag per learner per item. The item is pulled from rotation for
// everyone after enough independent reports, or after one report plus a
// failed automated re-check; the re-check (one fast-model call, at most once
// per item) runs after the response, so this route answers quickly and is not
// one of the app's long-timeout model routes. Rate limited because it can
// start that call.
// Returns { recorded, message } -- never whether the item was pulled, so a
// report cannot be used to probe other learners' reports.
const REPORT_EVENT = "item_report";
const REPORT_LIMIT = { max: 20, windowMinutes: 60 };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("A JSON body is required");
    const user = await requireUser(req);
    const input = await resolveReport(user.id, body as Record<string, unknown>);
    try {
      await consumeRateLimit(REPORT_EVENT, user.id, REPORT_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("You've reported a lot of questions this hour. Thank you -- please try again later.");
      throw err;
    }
    const out = await reportItem(user.id, input);
    if (out.recheck) inBackground(() => out.recheck!);
    const what = input.ref.kind === "sim" ? "simulation" : "question";
    return ok({
      recorded: out.recorded,
      message: out.recorded
        ? `Thanks -- we'll check this ${what}. If it's wrong, it won't count against you.`
        : `You've already reported this ${what}. Thanks -- it's being checked.`,
    });
  } catch (err) {
    if (err instanceof ReportError) return err.status === 404 ? notFound(err.message) : badRequest(err.message);
    if (err instanceof AuthError) return unauthorized(err.message);
    if (err instanceof AcknowledgementError) return forbidden(err.message, err.extra);
    return serverError(err);
  }
}
