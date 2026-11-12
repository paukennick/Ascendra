import { query } from "@/lib/db";
import { ok, serverError, badRequest, unauthorized, tooManyRequests, readJson } from "@/lib/http";
import { consumeRateLimit, RateLimitError } from "@/lib/auth/rateLimit";
import { isCalendarDate, textField } from "@/lib/text-input";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { isFavoriteSelect, listedOrStarted, ownedOrCatalog, trackProgressLateral } from "@/lib/progress-sql";
import { simCountsByTrack } from "@/lib/sim-count";

export const dynamic = "force-dynamic";

const COURSE_CREATE_LIMIT = { max: 10, windowMinutes: 60 };

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
// taxonomy (category/subcategory), freshness status and (REQ-249) sim_count. REQ-036: this used
// to select st.* alone, leaving the client with nothing but track_type to
// group by even though the taxonomy and freshness status already existed.
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const rows = await query<{ id: string }>(
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
       -- REQ-194: hidden courses (hidden_at) stay listed only for learners
       -- who already studied them. Every course search in the app filters
       -- this list, so they drop out of search too.
       where ${ownedOrCatalog("$1")} and ${listedOrStarted("$1")}
       order by st.created_at asc`,
      [user.id],
    );
    // REQ-249: sim_count, the sims the learner could start on each course
    // now (lib/sims.ts simCountsByTrack: one query for the whole list, none
    // while sims are off), for the card's sims badge and Explore's filter.
    const sims = await simCountsByTrack(user.id, rows.map((r) => r.id));
    return ok({ tracks: rows.map((r) => ({ ...r, sim_count: sims.get(r.id) ?? 0 })) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

const COURSE_TEXT_LIMITS = { code: 50, title: 120, description: 4_000 } as const;

// POST /api/courses — create a taxonomy-aligned course.
export async function POST(req: Request) {
  try {
    const body = await readJson(req);
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
    // Audit 3 M3 (FAIL-298): a 300-character title was a 500 from the
    // varchar(255) column, and the title reaches the coach's prompts (quoted
    // as data by lib/prompts.ts quoteTitle). Validated as text, 400 on failure.
    for (const [value, name, max, required] of [
      [code, "code", COURSE_TEXT_LIMITS.code, true],
      [title, "title", COURSE_TEXT_LIMITS.title, true],
      [description, "description", COURSE_TEXT_LIMITS.description, false],
    ] as const) {
      const t = textField(value, name, max, { required });
      if (!t.ok) return badRequest(t.error);
      if (required && !t.value.trim()) return badRequest(`${name} is required`);
    }
    if (!TRACK_TYPES.has(trackType)) return badRequest("invalid trackType");
    if (freshnessModel && !FRESHNESS_MODELS.has(freshnessModel)) {
      return badRequest("invalid freshnessModel");
    }
    if (contentFormat && !CONTENT_FORMATS.has(contentFormat)) {
      return badRequest("invalid contentFormat");
    }

    // REQ-116 (audit 3, finding 7): bounded text and a creation limit. A
    // 100 KB description was stored as sent, and 30 courses could be made
    // back to back.
    const caps: Array<[unknown, string, number]> = [
      [code, "code", 50],
      [title, "title", 200],
      [description, "description", 4_000],
      [credentialExamId, "credentialExamId", 200],
      [technologyName, "technologyName", 200],
      [technologyVersion, "technologyVersion", 100],
      [curriculumStandard, "curriculumStandard", 200],
      [sourceUrl, "sourceUrl", 2_000],
    ];
    for (const [value, name, max] of caps) {
      const checked = textField(value, name, max);
      if (!checked.ok) return badRequest(checked.error);
    }

    // REQ-216 (low, FAIL-1019): a date that is not a date reached the INSERT and
    // came back as a 500 (Postgres 22007). 400 with the field named.
    for (const [value, name] of [
      [sourceVerifiedAt, "sourceVerifiedAt"],
      [contentReviewDueAt, "contentReviewDueAt"],
    ] as const) {
      if (value !== undefined && value !== null && value !== "" && !isCalendarDate(value)) {
        return badRequest(`${name} must be a date such as 2026-11-10`);
      }
    }

    const user = await requireUser(req);
    try {
      await consumeRateLimit("course_create", user.id, COURSE_CREATE_LIMIT, { userId: user.id });
    } catch (err) {
      if (err instanceof RateLimitError) return tooManyRequests("You've made a lot of courses just now. Try again in an hour.");
      throw err;
    }
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
        code.trim(),
        title.replace(/\s+/g, " ").trim(),
        description ?? null,
        trackType,
        subcategoryId,
        freshnessModel ?? null,
        credentialExamId ?? null,
        technologyName ?? null,
        technologyVersion ?? null,
        curriculumStandard ?? null,
        sourceUrl ?? null,
        sourceVerifiedAt || null,
        contentReviewDueAt || null,
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
