import { queryOne } from "@/lib/db";
import { ok, serverError, unauthorized } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

// GET /api/objectives/:id/mastery — current mastery row for this objective (or defaults).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const row = await queryOne(
      `select * from mastery where user_id = $1 and objective_id = $2`,
      [user.id, id]
    );
    return ok({
      mastery: row ?? { objective_id: id, status: "Not started", score_0_4: 0, evidence: null },
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// PUT /api/objectives/:id/mastery used to let a learner set their own level,
// up to Transfer-ready, with no evidence. Mastery is now decided only from
// graded attempts (mastery_from_attempts, migration 029), so the override is
// gone (Audit 2, FAIL-038). Nothing in the app called it.
export async function PUT() {
  return new Response(JSON.stringify({ error: "Mastery is set by graded answers only" }), {
    status: 405,
    headers: { "content-type": "application/json", allow: "GET" },
  });
}
