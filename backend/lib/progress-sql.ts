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

// Mirrors view_track_progress (migration 001 + 022) with m.user_id bound.
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
      left join objectives o on o.unit_id = cu.id
      left join mastery m on m.objective_id = o.id and m.user_id = ${userParam}
     where cu.track_id = ${trackAlias}.id
  ) vp on true`;
}

// Mirrors view_unit_mastery (migration 001) with m.user_id bound.
export function unitMasteryLateral(userParam: string, unitAlias = "cu"): string {
  return `left join lateral (
    select count(o.id) as total_objectives,
           count(m.id) filter (where m.status in ('Independent', 'Transfer-ready')) as mastered_objectives,
           count(m.id) filter (where m.status = 'Needs review') as needs_review_objectives,
           round(avg(coalesce(m.score_0_4, 0))::numeric, 2) as avg_score_0_4
      from objectives o
      left join mastery m on m.objective_id = o.id and m.user_id = ${userParam}
     where o.unit_id = ${unitAlias}.id
  ) vm on true`;
}

// Per-user favorite flag, replacing the is_favorite column on the track.
export function isFavoriteSelect(userParam: string, trackAlias = "st"): string {
  return `exists(select 1 from course_favorites cf where cf.user_id = ${userParam} and cf.track_id = ${trackAlias}.id) as is_favorite`;
}
