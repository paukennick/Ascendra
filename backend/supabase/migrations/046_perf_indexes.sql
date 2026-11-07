-- REQ-118 (Audit 3 performance, MEDIUM-4/6/7): indexes for reads that
-- walked a learner's whole history or a whole table.
--
--   attempts_user_unit_created   readyUnitChecks (review/today) looks up the
--                                latest unit check per unit, and the history
--                                screen filters a learner's attempts by unit;
--                                both used only the user_id prefix of
--                                (user_id, objective_id) and read every row
--                                the learner has.
--   attempts_unit                foreign key attempts.unit_id had no index,
--                                so deleting or retiring a unit scanned all
--                                attempts.
--   auth_events_user             foreign keys with ON DELETE SET NULL and no
--   ai_calls_user_created        index: deleting one account scanned 3M
--                                auth_events and 1.2M ai_calls rows (fixture).
--                                ai_calls_user_created also serves per-learner
--                                spend reads (user_id, created_at range).
--   *_attempt_id (error_log, review_log, review_session_items,
--   exam_session_items, placement_items)
--                                foreign keys to attempts with ON DELETE SET
--                                NULL and no index. Deleting an account deletes
--                                its attempts, and every deleted attempt
--                                scanned each of these tables: a 26k-attempt
--                                account delete ran over 13 minutes on the
--                                fixture (cancelled), holding its locks.
--   review_session_items_answered
--                                "answered in a review today" (dueObjectives)
--                                reads only the answered items of a learner's
--                                sessions.
--
-- attempts.pbq_scenario_id / unit_check_item_id indexes belong to 045
-- (mastery rule rewrite), not here.
--
-- PRODUCTION: the runner applies each file in one transaction, where CREATE
-- INDEX CONCURRENTLY is not allowed, and a plain CREATE INDEX blocks writes to
-- the table while it builds (all five: 6 s on the 2.75M-attempt, 6M-auth_events
-- audit fixture; production is smaller, but do not hold writes for it).
-- Build them first with CONCURRENTLY over the direct connection, as in
-- docs/operations-runbook.md ("046 indexes"); this file then finds
-- them and does nothing. Each statement is IF NOT EXISTS and safe to re-run.

set local lock_timeout = '5s';

create index if not exists attempts_user_unit_created
  on attempts (user_id, unit_id, created_at desc);

create index if not exists attempts_unit
  on attempts (unit_id);

create index if not exists auth_events_user
  on auth_events (user_id) where user_id is not null;

create index if not exists ai_calls_user_created
  on ai_calls (user_id, created_at) where user_id is not null;

create index if not exists review_session_items_answered
  on review_session_items (session_id, objective_id) where answered_at is not null;

create index if not exists error_log_attempt
  on error_log (attempt_id) where attempt_id is not null;

create index if not exists review_log_attempt
  on review_log (attempt_id) where attempt_id is not null;

create index if not exists review_session_items_attempt
  on review_session_items (attempt_id) where attempt_id is not null;

create index if not exists exam_session_items_attempt
  on exam_session_items (attempt_id) where attempt_id is not null;

create index if not exists placement_items_attempt
  on placement_items (attempt_id) where attempt_id is not null;
