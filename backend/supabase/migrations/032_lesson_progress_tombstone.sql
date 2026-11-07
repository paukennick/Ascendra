-- REQ-101 (FAIL-092): a finished lesson must not come back from a late save.
--
-- When a lesson moves to "done" (or back to Guess after a regenerate) the app
-- DELETEs the account copy of the learner's place. A save sent a moment
-- earlier can reach the server after that delete -- a slow request, a retry,
-- the debounced save flushed as the screen closes -- and its upsert recreated
-- the row, so reopening the finished objective resumed at Solo.
--
-- Each save now carries the client's savedAt and each delete its clearedAt
-- (both milliseconds on the app's clock). The delete records the time here;
-- a save whose savedAt is not after it is ignored. One row per user and
-- objective, overwritten by the next delete, so it stays bounded.
--
-- Additive only, guarded with IF NOT EXISTS like every migration here.

create table if not exists lesson_progress_tombstones (
    user_id uuid not null references app_users(id) on delete cascade,
    objective_id uuid not null references objectives(id) on delete cascade,
    cleared_at timestamptz not null,
    primary key (user_id, objective_id)
);
