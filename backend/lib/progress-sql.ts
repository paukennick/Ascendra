// REQ-082: per-user progress rollups, replacing view_track_progress and
// view_unit_mastery in the routes. Those views join mastery with no user
// filter -- harmless while every user had a private copy of every track,
// wrong once catalog tracks are shared (user_id null), because one user's
// mastery would count toward everyone's progress.
//
// Both fragments are LATERAL subqueries meant to be dropped into a query
// that already has `subject_tracks st` (or `course_units cu`) in scope and
// binds the caller's user id as $1. The column names match the old views
// exactly so nothing downstream (API shape, mobile types) changes.
//
// "Catalog or mine" ownership predicate, for every route that used to say
// `st.user_id = $n`: a track is visible if it belongs to the catalog
// (user_id null) or to the caller.
export function ownedOrCatalog(userParam: string, alias = "st"): string {
  return `(${alias}.user_id is null or ${alias}.user_id = ${userParam})`;
}

// REQ-194 (migration 065): a course whose hidden_at has passed is out of the
// catalog -- not listed, not newly startable -- but anyone who already
// studied it keeps it. "Already studied" means any of: a study session, a
// free-course pick, a study plan, or mastery, an answer or lesson progress on one of its
// objectives (retired ones included, since that is still their history). A
// favorite alone does not count. A private course is always the owner's.
// Used for the course list and the start routes, never for the study routes,
// so a learner part-way through loses nothing. Pair with ownedOrCatalog.
export function listedOrStarted(userParam: string, alias = "st"): string {
  return `(${alias}.hidden_at is null or ${alias}.hidden_at > now()
    or ${alias}.user_id = ${userParam}
    or exists (select 1 from study_sessions hs where hs.track_id = ${alias}.id and hs.user_id = ${userParam})
    or exists (select 1 from free_course_choice hf where hf.track_id = ${alias}.id and hf.user_id = ${userParam})
    or exists (select 1 from study_plans hp where hp.track_id = ${alias}.id and hp.user_id = ${userParam})
    or exists (select 1 from course_units hu join objectives ho on ho.unit_id = hu.id
                where hu.track_id = ${alias}.id
                  and (exists (select 1 from mastery hm where hm.objective_id = ho.id and hm.user_id = ${userParam})
                       or exists (select 1 from attempts ha where ha.objective_id = ho.id and ha.user_id = ${userParam})
                       or exists (select 1 from lesson_progress hl where hl.objective_id = ho.id and hl.user_id = ${userParam}))))`;
}

// REQ-102 (migration 033): a unit or objective whose retired_at has passed
// is no longer taught -- an exam version moved on -- but its row and the
// learner's history on it are kept. Every listing and rollup filters with
// these so retired content neither shows in the course nor counts toward
// (or against) progress. A future retired_at means "still taught until
// then", so an outgoing exam version stays listed through its last day.
export function isActive(alias: string): string {
  return `(${alias}.retired_at is null or ${alias}.retired_at > now())`;
}

// Mirrors view_track_progress (migration 001 + 022 + 033) with m.user_id bound.
export function trackProgressLateral(userParam: string, trackAlias = "st"): string {
  return `left join lateral (
    select count(distinct cu.id) as total_units,
           count(distinct o.id) as total_objectives,
           count(m.id) filter (where m.status in ('Independent', 'Transfer-ready')) as mastered_objectives,
           round(
             (count(m.id) filter (where m.status in ('Independent', 'Transfer-ready'))::numeric
             / greatest(count(distinct o.id), 1)) * 100, 1
           ) as percent_complete,
           count(m.id) as started_objectives,
           round((count(m.id)::numeric / greatest(count(distinct o.id), 1)) * 100, 1) as percent_progress
      from course_units cu
      left join objectives o on o.unit_id = cu.id and ${isActive("o")}
      left join mastery m on m.objective_id = o.id and m.user_id = ${userParam}
     where cu.track_id = ${trackAlias}.id and ${isActive("cu")}
  ) vp on true`;
}

// Mirrors view_unit_mastery (migration 001 + 033) with m.user_id bound.
export function unitMasteryLateral(userParam: string, unitAlias = "cu"): string {
  return `left join lateral (
    select count(o.id) as total_objectives,
           count(m.id) filter (where m.status in ('Independent', 'Transfer-ready')) as mastered_objectives,
           count(m.id) filter (where m.status = 'Needs review') as needs_review_objectives,
           round(avg(coalesce(m.score_0_4, 0))::numeric, 2) as avg_score_0_4
      from objectives o
      left join mastery m on m.objective_id = o.id and m.user_id = ${userParam}
     where o.unit_id = ${unitAlias}.id and ${isActive("o")}
  ) vm on true`;
}

// Per-user favorite flag, replacing the is_favorite column on the track.
export function isFavoriteSelect(userParam: string, trackAlias = "st"): string {
  return `exists(select 1 from course_favorites cf where cf.user_id = ${userParam} and cf.track_id = ${trackAlias}.id) as is_favorite`;
}
