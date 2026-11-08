import { ok, unauthorized, serverError } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { whatsNewFor } from "@/lib/whats-new";

export const dynamic = "force-dynamic";

// GET /api/whats-new -- REQ-140: every release note this server shows (gates
// applied, newest first) and which ones this learner hasn't dismissed.
// { entries: [{ id, date, title, items: [{ headline, body, icon? }] }],
//   unseenIds: string[], seenId: string | null }
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return ok(await whatsNewFor(user.id));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
