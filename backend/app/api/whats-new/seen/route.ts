import { ok, unauthorized, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { markNoteSeen } from "@/lib/whats-new";

export const dynamic = "force-dynamic";

// POST /api/whats-new/seen { id } -- REQ-140: "Got it". Marks that note and
// every older one as seen. Idempotent; the marker never moves backwards; an
// id the server doesn't show is a 400. Answers with the same body as GET.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    return ok(await markNoteSeen(user.id, body?.id));
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
