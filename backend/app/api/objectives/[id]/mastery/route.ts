import { query, queryOne } from "@/lib/db";
import { ok, serverError, badRequest, unauthorized } from "@/lib/http";
import { MASTERY_LABELS, statusToScore, type MasteryStatus } from "@/lib/mastery";
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

// PUT /api/objectives/:id/mastery — set/override mastery status directly (e.g. from a
// unit-check screen, mirroring the Artifact apps' "accept & save to mastery matrix" action).
// Body: { status, evidence? }
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const status = body?.status as MasteryStatus;
    if (!MASTERY_LABELS.includes(status)) {
      return badRequest(`status must be one of: ${MASTERY_LABELS.join(", ")}`);
    }
    const user = await requireUser(req);
    const score = statusToScore(status);
    const rows = await query(
      `insert into mastery (user_id, objective_id, status, score_0_4, evidence, updated_at)
       values ($1,$2,$3,$4,$5, now())
       on conflict (user_id, objective_id) do update set
         status = excluded.status, score_0_4 = excluded.score_0_4, evidence = excluded.evidence, updated_at = now()
       returning *`,
      [user.id, id, status, score, body?.evidence ?? null]
    );
    return ok({ mastery: rows[0] });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
