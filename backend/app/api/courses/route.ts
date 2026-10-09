import { query } from "@/lib/db";
import { ok, serverError, badRequest, unauthorized } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { isFavoriteSelect, ownedOrCatalog, trackProgressLateral } from "@/lib/progress-sql";

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
// REQ-037: delivery format, kept separate from trackType (which is
// pedigree/audience). Only one format exists so far; new ones are additive.
const CONTENT_FORMATS = new Set(["full_course"]);

// GET /api/courses — list all tracks with rollup progress, last-studied time,
// taxonomy (category/subcategory), and freshness status. REQ-036: this used
// to select st.* alone, leaving the client with nothing but track_type to
// group by even though the taxonomy and freshness status already existed.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const rows = await query(
      // REQ-082: catalog tracks (user_id null) are visible to everyone;
      // progress and favorite are computed for the caller. is_favorite is
      // selected after st.* on purpose -- node-pg assigns duplicate column
      // names in order, so the per-user value wins over the legacy column.
      `select st.*, vp.total_units, vp.total_objectives, vp.mastered_objectives, vp.percent_complete,
              vp.started_objectives, vp.percent_progress,
              ss.last_studied_at,
              vcf.freshness_status,
              esc.slug as subcategory_slug, esc.name as subcategory_name,
              ec.id as category_id, ec.slug as category_slug, ec.name as category_name,
              ec.sort_order as category_sort_order,
              ${isFavoriteSelect("$1")}
       from subject_tracks st
       ${trackProgressLateral("$1")}
       left join (
         select track_id, max(started_at) as last_studied_at
         from study_sessions
         where user_id = $1
         group by track_id
       ) ss on ss.track_id = st.id
       left join view_content_freshness vcf on vcf.track_id = st.id
       left join education_subcategories esc on esc.id = st.subcategory_id
       left join education_categories ec on ec.id = esc.category_id
       where ${ownedOrCatalog("$1")}
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
      contentFormat,
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
    if (contentFormat && !CONTENT_FORMATS.has(contentFormat)) {
      return badRequest("invalid contentFormat");
    }

    const user = await requireUser(req);
    const rows = await query(
      `insert into subject_tracks (
         user_id, code, title, description, track_type, subcategory_id,
         freshness_model, credential_exam_id, technology_name, technology_version,
         curriculum_standard, source_url, source_verified_at, content_review_due_at,
         content_format
       )
       select $1, $2, $3, $4, $5, es.id,
              coalesce($7::content_freshness_model, es.freshness_model),
              $8, $9, $10, $11, $12, $13, $14,
              coalesce($15::content_format, 'full_course')
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
        contentFormat ?? null,
      ],
    );
    if (!rows[0]) return badRequest("subcategoryId does not exist");
    return ok({ track: rows[0] }, 201);
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
