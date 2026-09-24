import { query, queryOne } from "@/lib/db";
import { ok, badRequest, notFound, unauthorized, serverError } from "@/lib/http";
import { requireReviewAgent, ReviewAgentAuthError } from "@/lib/auth/requireReviewAgent";

export const dynamic = "force-dynamic";

const CONCLUSIONS = new Set(["current", "flagged"]);
// Re-check cadence after a confirmed-current finding. The agent itself runs
// quarterly (REQ-042); padding past that -- 4 months, not 3 -- means normal
// schedule jitter never leaves a track showing "Review due" in the gap
// before the next run has had a chance to check it.
const RECHECK_INTERVAL = "4 months";

// POST /api/catalog/review-findings -- REQ-042. The quarterly catalog-review
// agent's one write path. Every call records a durable finding (evidence +
// summary) in content_review_findings first, so nothing here is silent.
// Only a 'current' conclusion touches the live freshness fields the
// Verified/Unverified badges and filter (REQ-036/038) read, and always
// alongside the finding that backs it. A 'flagged' conclusion never marks a
// track as newly verified -- it pulls content_review_due_at to now so the
// track shows "Review due" immediately, without guessing at what changed.
export async function POST(req: Request) {
  try {
    requireReviewAgent(req);
    const body = await req.json();
    const { trackCode, conclusion, evidenceUrl, summary, checkedAt } = body ?? {};

    if (!trackCode || !conclusion || !evidenceUrl || !summary) {
      return badRequest("trackCode, conclusion, evidenceUrl, and summary are required");
    }
    if (!CONCLUSIONS.has(conclusion)) {
      return badRequest("conclusion must be 'current' or 'flagged'");
    }

    const track = await queryOne<{ id: string }>(
      `select id from subject_tracks where code = $1`,
      [trackCode],
    );
    if (!track) return notFound(`No track with code ${trackCode}`);

    const finding = await queryOne(
      `insert into content_review_findings (track_id, conclusion, evidence_url, summary, checked_at)
       values ($1, $2, $3, $4, coalesce($5::timestamptz, now()))
       returning *`,
      [track.id, conclusion, evidenceUrl, summary, checkedAt ?? null],
    );

    if (conclusion === "current") {
      await query(
        `update subject_tracks
         set source_verified_at = coalesce($2::timestamptz, now()),
             content_review_due_at = coalesce($2::timestamptz, now()) + interval '${RECHECK_INTERVAL}'
         where id = $1`,
        [track.id, checkedAt ?? null],
      );
    } else {
      await query(
        `update subject_tracks set content_review_due_at = now() where id = $1`,
        [track.id],
      );
    }

    return ok({ finding }, 201);
  } catch (err) {
    if (err instanceof ReviewAgentAuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
