-- REQ-108: backfill for 037_review_loop.sql, applied by the runner straight
-- after it in its own transaction.
--
-- 1. Enrol every (learner, objective) already at Guided or above, as the
--    trigger in 037 does for new levels from now on. A learner who already
--    knows many objectives must not open the app to a wall of them all due at
--    once, so first reviews are spread over the next seven days (by a hash of
--    the pair, so a re-run picks the same day). Today's review serves at most
--    12 a day whatever is due.
-- 2. Validate attempts_unit_check_item_fkey (added NOT VALID in 037). The
--    column is null on every existing row; VALIDATE takes a lock that does
--    not block reads or writes.
--
-- Safe to run twice: ON CONFLICT DO NOTHING; validating twice is a no-op.
-- Undo: `delete from review_schedule where reps = 0 and last_reviewed_at is
-- null` removes rows nobody has reviewed yet (they are recreated by the
-- trigger the next time the level is written).

insert into review_schedule (user_id, objective_id, due_on, enrolled_at)
select m.user_id, m.objective_id,
       (now() at time zone 'UTC')::date + 1 + (abs(hashtext(m.user_id::text || m.objective_id::text)) % 7),
       coalesce(m.updated_at, now())
  from mastery m
 where m.user_id is not null and m.objective_id is not null
   and m.status in ('Guided', 'Independent', 'Transfer-ready')
on conflict (user_id, objective_id) do nothing;

alter table attempts validate constraint attempts_unit_check_item_fkey;
