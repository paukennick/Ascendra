import { query } from "@/lib/db";
import { ok, notFound, unauthorized, serverError, forbidden } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { isActive, isFavoriteSelect, ownedOrCatalog, trackProgressLateral, unitMasteryLateral } from "@/lib/progress-sql";
import { courseReadiness, STUDY_EMPHASIS_WEIGHTS_SQL } from "@/lib/readiness";
import { cachedExamBlueprint, courseReadinessCache, stampOf } from "@/lib/readiness-cache";
import { featureLock } from "@/lib/entitlements";
import { READINESS_LOCKED_TEXT } from "@/lib/billing-config";
import { studyNoticeAcceptedSql } from "@/lib/study-notice";
import { isMatureCategory, matureContentNeededSql, matureContentRequiredBody, MATURE_CONTENT_REQUIRED_MESSAGE } from "@/lib/mature-content";

export const dynamic = "force-dynamic";

// REQ-118 (Audit 3 MEDIUM-5): this was 9 sequential queries plus a full
// readiness recompute per request. Now: the track row carries the
// disclaimer flag and the learner's newest-answer stamp (1 query), then
// units and objectives (2); readiness comes from a per-learner/course cache
// that the stamp invalidates (lib/readiness-cache.ts), and the exam
// blueprint -- catalog data, the same for everyone -- from a per-course cache.
// Warm: 3 queries. Measured in lib/perf-audit3.dbtest.ts.

// GET /api/courses/:id — one track with its units (+ per-unit mastery rollup), objectives,
// and REQ-100 readiness (coverage, accuracy and blueprint-weighted readiness; lib/readiness.ts).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser(req);
    const userId = user.id;
    const tracks = await query(
      `select st.*, vp.total_units, vp.total_objectives, vp.mastered_objectives, vp.percent_complete,
              vp.started_objectives, vp.percent_progress,
              ${isFavoriteSelect("$2")},
              -- REQ-165: a gated course now needs the one study notice.
              ${studyNoticeAcceptedSql("$2")} as __acknowledged,
              -- REQ-224: a mental health course needs the 18+ confirmation.
              ${matureContentNeededSql("st", "$2")} as __mature_needed,
              (select max(a.created_at)::text from attempts a where a.user_id = $2) as __attempt_stamp
       from subject_tracks st
       ${trackProgressLateral("$2")}
       where st.id = $1 and ${ownedOrCatalog("$2")}`,
      [id, userId]
    );
    if (!tracks[0]) return notFound("Track not found");
    // REQ-224: opening a mental health course without the 18+ confirmation is
    // refused before any of its content is read; the app shows the notice and
    // asks again (mobile/src/lib/matureContent.ts).
    const matureNeeded = (tracks[0] as { __mature_needed?: unknown }).__mature_needed;
    if (isMatureCategory(matureNeeded)) return forbidden(MATURE_CONTENT_REQUIRED_MESSAGE, matureContentRequiredBody(matureNeeded));

    // REQ-220 (FAIL-1136): a course whose weights are only our study
    // emphasis (the CNA course) sends no weight, so no app build -- old or
    // new -- labels a unit "% of exam".
    const units = await query(
      `select cu.*, case when ${STUDY_EMPHASIS_WEIGHTS_SQL} then null else cu.weight end as weight,
              vm.total_objectives, vm.mastered_objectives, vm.needs_review_objectives, vm.avg_score_0_4
       from course_units cu
       join subject_tracks st on st.id = cu.track_id
       ${unitMasteryLateral("$2")}
       where cu.track_id = $1 and ${isActive("cu")}
       order by cu.sort_order asc`,
      [id, userId]
    );

    // REQ-250 (FAIL-1642): lesson_saved_at is when the learner's saved place in
    // the objective's lesson was last written, or null. A place left at Teach
    // (before any graded check, so no mastery row) read as "Not started" and
    // the course offered "Start course". The app resumes a place only within
    // its 7-day window (SNAPSHOT_MAX_AGE_MS, mobile/src/lib/lessonProgress.ts),
    // so an older one is not reported. Same query: the warm budget is unchanged.
    const objectives = await query(
      `select o.*, m.status as mastery_status, m.score_0_4 as mastery_score, m.evidence as mastery_evidence,
              lp.updated_at as lesson_saved_at
       from objectives o
       join course_units cu on cu.id = o.unit_id
       left join mastery m on m.objective_id = o.id and m.user_id = $2
       left join lesson_progress lp on lp.objective_id = o.id and lp.user_id = $2
                                   and lp.updated_at > now() - interval '7 days'
       where cu.track_id = $1 and ${isActive("cu")} and ${isActive("o")}
       order by cu.sort_order asc, o.sort_order asc`,
      [id, userId]
    );

    const objectivesByUnit: Record<string, unknown[]> = {};
    for (const obj of objectives as Array<{ unit_id: string }>) {
      (objectivesByUnit[obj.unit_id] ??= []).push(obj);
    }

    const unitsWithObjectives = (units as Array<{ id: string }>).map((u) => ({
      ...u,
      objectives: objectivesByUnit[u.id] ?? [],
    }));

    // Tracks carrying a required disclaimer (nursing) report whether this
    // user has accepted the current version, so the client can gate entry.
    // The real enforcement is in requireAcknowledgement() on the endpoints
    // that actually teach or grade -- this flag only drives the UI.
    const track = tracks[0] as {
      requires_acknowledgement?: boolean;
      disclaimer_version?: number;
    };
    const { __acknowledged, __attempt_stamp, __mature_needed: _mature, ...trackOut } = tracks[0] as Record<string, unknown>;
    const acknowledgement: { required: boolean; acknowledged: boolean } = track.requires_acknowledgement
      ? { required: true, acknowledged: __acknowledged === true }
      : { required: false, acknowledged: true };

    // REQ-122 / REQ-124: the readiness score is in Plus and Pro (Nick,
    // 2026-11-07). Free gets null and readinessLocked, whose message is the
    // one line the app shows instead of a number; not computed for Free. No
    // database read while billing is off.
    const lock = await featureLock(userId, "readiness", id);
    const readinessLocked = lock ? { ...lock, message: READINESS_LOCKED_TEXT } : null;
    const readiness = readinessLocked
      ? null
      : (await courseReadinessCache.get(userId, id, stampOf(__attempt_stamp), () => courseReadiness(id, userId))).value;

    // REQ-102: the exam this track prepares for -- code, status and dates,
    // duration, question format, passing policy, weighted domains -- for
    // mock-exam and readiness features to read. null for non-exam tracks.
    const exam = await cachedExamBlueprint(id, (tracks[0] as { credential_exam_id?: unknown }).credential_exam_id);

    return ok({ track: trackOut, units: unitsWithObjectives, acknowledgement, readiness, exam, ...(readinessLocked ? { readinessLocked } : {}) });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
