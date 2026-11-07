-- 033_exam_blueprints.sql (REQ-102)
--
-- Exam versions change under live courses (AWS SAP-C02 -> SAP-C03 on
-- 2026-11-17). Until now the seed could only rewrite a unit or objective in
-- place -- matching rows by sort_order -- which silently re-pointed every
-- learner's mastery, attempts and error log at different content, or leave
-- outgoing rows listed forever. Deleting them instead would cascade the
-- learners' mastery away.
--
-- This adds a retirement marker. A retired unit/objective keeps its row and
-- every learner record attached to it; the app stops listing it (course
-- view, unit view, progress rollups, next-lesson prefetch, PBQ objective
-- list, pregeneration) once retired_at has passed. A future retired_at
-- means "still taught until then", so an outgoing exam version stays
-- visible through its last test day.
--
-- Additive and idempotent; no data is changed here -- the seed sets the
-- markers (backend/supabase/seed/seed.ts).

alter table course_units add column if not exists retired_at timestamptz;
alter table objectives add column if not exists retired_at timestamptz;

comment on column course_units.retired_at is
  'REQ-102: when this unit stopped being taught (an exam-version change). Row and learner history are kept; listings hide it once retired_at <= now().';
comment on column objectives.retired_at is
  'REQ-102: when this objective stopped being taught. Row, mastery and attempts are kept; listings hide it once retired_at <= now().';

-- The two legacy rollup views (migrations 001/022) are no longer read by
-- the routes (lib/progress-sql.ts replaced them), but keep them consistent
-- with the routes so nothing that does read them counts retired content.
-- Same column list and order as before; only the join conditions change.
create or replace view view_unit_mastery as
select
    cu.id as unit_id,
    cu.track_id,
    cu.title as unit_title,
    count(o.id) as total_objectives,
    count(m.id) filter (where m.status in ('Independent', 'Transfer-ready')) as mastered_objectives,
    count(m.id) filter (where m.status = 'Needs review') as needs_review_objectives,
    round(
        avg(coalesce(m.score_0_4, 0))::numeric, 2
    ) as avg_score_0_4
from course_units cu
left join objectives o on o.unit_id = cu.id and (o.retired_at is null or o.retired_at > now())
left join mastery m on m.objective_id = o.id
group by cu.id, cu.track_id, cu.title;

create or replace view view_track_progress as
select
    st.id as track_id,
    st.title as track_title,
    st.track_type,
    count(distinct cu.id) as total_units,
    count(distinct o.id) as total_objectives,
    count(m.id) filter (where m.status in ('Independent', 'Transfer-ready')) as mastered_objectives,
    round(
        (count(m.id) filter (where m.status in ('Independent', 'Transfer-ready'))::numeric
        / greatest(count(distinct o.id), 1)) * 100, 1
    ) as percent_complete,
    count(m.id) as started_objectives,
    round(
        (count(m.id)::numeric
        / greatest(count(distinct o.id), 1)) * 100, 1
    ) as percent_progress
from subject_tracks st
left join course_units cu on cu.track_id = st.id and (cu.retired_at is null or cu.retired_at > now())
left join objectives o on o.unit_id = cu.id and (o.retired_at is null or o.retired_at > now())
left join mastery m on m.objective_id = o.id
group by st.id, st.title, st.track_type;
