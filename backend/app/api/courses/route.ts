import { query } from "@/lib/db";
import { ok, serverError, badRequest, unauthorized } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

const TRACK_TYPES = new Set([
  "graduate",
  "certification",
  "academic",
  "professional",
  "skills",
]);
const FRESHNESS_MODELS = new Set([
  "certification_aligned",
  "technology_aligned",
  "academic_foundational",
]);

// GET /api/courses — list all tracks with rollup progress + last-studied time.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const rows = await query(
      `select st.*, vp.total_units, vp.total_objectives, vp.mastered_objectives, vp.percent_complete,
              ss.last_studied_at
       from subject_tracks st
       left join view_track_progress vp on vp.track_id = st.id
       left join (
         select track_id, max(started_at) as last_studied_at
         from study_sessions
         where user_id = $1
         group by track_id
       ) ss on ss.track_id = st.id
       where st.user_id = $1
       order by st.created_at asc`,
      [user.id],
    );
    return ok({ tracks: rows });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// POST /api/courses — create a taxonomy-aligned course.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      code,
      title,
      description,
      trackType,
      subcategoryId,
      freshnessModel,
      credentialExamId,
      technologyName,
      technologyVersion,
      curriculumStandard,
      sourceUrl,
      sourceVerifiedAt,
      contentReviewDueAt,
    } = body ?? {};

    if (!code || !title || !trackType || !subcategoryId) {
      return badRequest(
        "code, title, trackType, and subcategoryId are required",
      );
    }
    if (!TRACK_TYPES.has(trackType)) return badRequest("invalid trackType");
    if (freshnessModel && !FRESHNESS_MODELS.has(freshnessModel)) {
      return badRequest("invalid freshnessModel");
    }

    const user = await requireUser(req);
    const rows = await query(
      `insert into subject_tracks (
         user_id, code, title, description, track_type, subcategory_id,
         freshness_model, credential_exam_id, technology_name, technology_version,
         curriculum_standard, source_url, source_verified_at, content_review_due_at
       )
       select $1, $2, $3, $4, $5, es.id,
              coalesce($7::content_freshness_model, es.freshness_model),
              $8, $9, $10, $11, $12, $13, $14
       from education_subcategories es
       where es.id = $6
       returning *`,
      [
        user.id,
        code,
        title,
        description ?? null,
        trackType,
        subcategoryId,
        freshnessModel ?? null,
        credentialExamId ?? null,
        technologyName ?? null,
        technologyVersion ?? null,
        curriculumStandard ?? null,
        sourceUrl ?? null,
        sourceVerifiedAt ?? null,
        contentReviewDueAt ?? null,
      ],
    );
    if (!rows[0]) return badRequest("subcategoryId does not exist");
    return ok({ track: rows[0] }, 201);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
