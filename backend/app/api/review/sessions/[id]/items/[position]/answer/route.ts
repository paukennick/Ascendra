import { ok, badRequest, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth/requireUser";
import { isUuid } from "@/lib/visibility";
import { validClientAttemptId } from "@/lib/lesson-progress";
import { answerItem } from "@/lib/review-service";
import { positionOf, reviewRouteError } from "@/lib/review-routes";

// REQ-202: seconds this route may run (one fast-model grade). Never above 300, the Hobby
// plan ceiling with Fluid compute (docs/billing.md, "Function duration").
export const maxDuration = 120;

export const dynamic = "force-dynamic";

const MAX_ANSWER = 8000;

// POST /api/review/sessions/:id/items/:position/answer -- REQ-108: grade one
// review answer on the server and record it as spaced, unassisted evidence
// (kind 'review'; a typed answer after "Show choices" is a hint).
//   { clientAttemptId?, format: "open", answer }
//   { clientAttemptId?, format: "mc", chosenIndex }   (after Show choices)
// Returns { verdict, feedback, missedParts, assisted, correctIndex (shown
// order), correctAnswer, why, terms, termsCredited, nextDueOn, advanced }.
// A repeat of the same clientAttemptId, or a second submit of an answered
// question, returns the stored result.
export async function POST(req: Request, { params }: { params: Promise<{ id: string; position: string }> }) {
  try {
    const { id, position } = await params;
    const user = await requireUser(req);
    const pos = positionOf(position);
    if (!isUuid(id) || pos === null) return notFound("Review question not found");
    const body = await req.json().catch(() => null);
    const format = body?.format;
    if (format !== "mc" && format !== "open") return badRequest("format must be 'mc' or 'open'");
    if (format === "open") {
      if (typeof body.answer !== "string" || !body.answer.trim()) return badRequest("answer is required for format 'open'");
      if (body.answer.length > MAX_ANSWER) return badRequest(`answer must be at most ${MAX_ANSWER} characters`);
    }
    const result = await answerItem(user.id, id, pos, {
      format,
      answer: body.answer,
      chosenIndex: body.chosenIndex,
      clientAttemptId: validClientAttemptId(body.clientAttemptId),
    });
    return ok(result);
  } catch (err) {
    return reviewRouteError(err);
  }
}
