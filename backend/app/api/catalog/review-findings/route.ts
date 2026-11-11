import { queryOne, withTransaction } from "@/lib/db";
import { textField } from "@/lib/text-input";
import { ok, badRequest, notFound, unauthorized, serverError, readJson } from "@/lib/http";
import { requireReviewAgent, ReviewAgentAuthError } from "@/lib/auth/requireReviewAgent";

export const dynamic = "force-dynamic";

const CONCLUSIONS = new Set(["current", "flagged"]);
// Re-check cadence after a confirmed-current finding. The agent itself runs
// quarterly (REQ-042); padding past that -- 4 months, not 3 -- means normal
// schedule jitter never leaves a track showing "Review due" in the gap
// before the next run has had a chance to check it.
const RECHECK_INTERVAL = "4 months";
const MAX_EVIDENCE_URL = 2000;
const MAX_SUMMARY = 8000;

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// The finding's check time: absent -> null (the database uses now()); a valid
// ISO date -> that time, never later than now (a clock-skewed or invented
// future date is capped); anything else -> false.
function checkedAtFrom(v: unknown): string | null | false {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || v.length > 40) return false;
  const t = Date.parse(v);
  if (!Number.isFinite(t) || t < Date.parse("2000-01-01T00:00:00Z")) return false;
  return new Date(Math.min(t, Date.now())).toISOString();
}

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
    const body = await readJson(req);
    const { trackCode, conclusion, evidenceUrl, summary, checkedAt } = body ?? {};

    if (!trackCode || !conclusion || !evidenceUrl || !summary) {
      return badRequest("trackCode, conclusion, evidenceUrl, and summary are required");
    }
    // REQ-219 (FAIL-1117): these went into the table as sent. Wrong types
    // reached Postgres as 500s or stored objects as text; a future checkedAt
    // pushed a track's "verified" date and next review into the future, so it
    // never showed "Review due"; an oversized summary was stored whole.
    if (typeof trackCode !== "string" || trackCode.length > 50) return badRequest("trackCode must be a track code (50 characters at most)");
    if (typeof conclusion !== "string" || !CONCLUSIONS.has(conclusion)) {
      return badRequest("conclusion must be 'current' or 'flagged'");
    }
    const url = textField(evidenceUrl, "evidenceUrl", MAX_EVIDENCE_URL, { required: true });
    if (!url.ok) return badRequest(url.error);
    if (!isHttpUrl(url.value)) return badRequest("evidenceUrl must be an http or https URL");
    const text = textField(summary, "summary", MAX_SUMMARY, { required: true });
    if (!text.ok) return badRequest(text.error);
    const checkedAtIso = checkedAtFrom(checkedAt);
    if (checkedAtIso === false) return badRequest("checkedAt must be a date and time (ISO 8601)");

    // Shared catalog only: a learner's private track can reuse a catalog
    // code (unique per user, not globally), and the agent must neither
    // review nor write to it.
    const track = await queryOne<{ id: string }>(
      `select id from subject_tracks where code = $1 and user_id is null`,
      [trackCode],
    );
    if (!track) return notFound(`No track with code ${trackCode}`);

    // One transaction: the finding and the freshness fields it backs land
    // together or not at all (a failed second write used to leave a finding
    // recorded with the track still showing "Review due", or the reverse).
    const finding = await withTransaction(async (tx) => {
      const row = await tx.queryOne(
        `insert into content_review_findings (track_id, conclusion, evidence_url, summary, checked_at)
         values ($1, $2, $3, $4, coalesce($5::timestamptz, now()))
         returning *`,
        [track.id, conclusion, url.value, text.value, checkedAtIso],
      );
      if (conclusion === "current") {
        await tx.query(
          `update subject_tracks
           set source_verified_at = coalesce($2::timestamptz, now()),
               content_review_due_at = coalesce($2::timestamptz, now()) + interval '${RECHECK_INTERVAL}'
           where id = $1`,
          [track.id, checkedAtIso],
        );
      } else {
        await tx.query(`update subject_tracks set content_review_due_at = now() where id = $1`, [track.id]);
      }
      return row;
    });

    return ok({ finding }, 201);
  } catch (err) {
    if (err instanceof ReviewAgentAuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
