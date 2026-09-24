import { query } from "@/lib/db";
import { ok, unauthorized, serverError } from "@/lib/http";
import { requireReviewAgent, ReviewAgentAuthError } from "@/lib/auth/requireReviewAgent";

export const dynamic = "force-dynamic";

// GET /api/catalog/review-context -- REQ-042. Everything the quarterly
// catalog-review agent needs to decide what to check: each track's own
// recorded source, its credential exam's objectives URL/status if it has
// one, and when it was last verified. Read-only; the agent's one write path
// is POST /api/catalog/review-findings.
export async function GET(req: Request) {
  try {
    requireReviewAgent(req);
    const rows = await query(
      `select st.code, st.title, st.track_type, st.freshness_model,
              st.source_url, st.source_verified_at, st.content_review_due_at,
              ce.exam_code, ce.basis, ce.status as exam_status,
              ce.official_objectives_url, ce.retirement_date
       from subject_tracks st
       left join credential_exams ce on ce.id = st.credential_exam_id
       where st.source_url is not null
       order by st.code`,
    );
    return ok({ tracks: rows });
  } catch (err) {
    if (err instanceof ReviewAgentAuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
