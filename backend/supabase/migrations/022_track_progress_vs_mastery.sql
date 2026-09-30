-- REQ-067 follow-up: "Overall progress" and "mastery" were the same number.
-- view_track_progress's percent_complete only ever counted objectives at
-- Independent/Transfer-ready -- that's a mastery rate, not how far into the
-- course a learner has gotten. Wiring it into anything labeled "progress"
-- (the course dashboard, course cards, the Home "continue" card) understated
-- progress for anyone who has started an objective but not yet mastered it:
-- e.g. five objectives all sitting at "Guided" read as 0% progress.
--
-- Adds a second, genuinely different metric: started_objectives/percent_progress,
-- counting any objective with a mastery row at all (mastery rows are only
-- ever inserted by PUT /api/objectives/:id/mastery once an objective has been
-- attempted -- see backend/app/api/objectives/[id]/mastery/route.ts -- so a
-- row's mere existence means "touched," regardless of what status it's at).
-- mastered_objectives/percent_complete keep their original Independent/
-- Transfer-ready-only meaning; nothing that already reads them changes
-- behavior.

-- Postgres CREATE OR REPLACE VIEW only allows appending columns, not
-- inserting them -- new columns go at the end, existing ones keep their
-- original position, or the migration fails with "cannot change name of
-- view column" instead of doing the rename it looks like it's asking for.
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
left join course_units cu on cu.track_id = st.id
left join objectives o on o.unit_id = cu.id
left join mastery m on m.objective_id = o.id
group by st.id, st.title, st.track_type;
