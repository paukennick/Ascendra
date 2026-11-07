-- REQ-135: indexes for queries that scanned whole tables.
--
-- chat_messages: chat history (GET /api/chat), the coach's last-40-turns
-- history and the replay lookup filter by user and track and order by
-- created_at. The only usable index was idx_chat_track (track_id,
-- created_at), so on a shared-catalog track Postgres walked every
-- learner's messages and filtered user_id out row by row.
--
-- study_sessions: had no index but its primary key. The open-session
-- lookup in POST /api/sessions, the sessions list and courses'
-- last_studied_at (max(started_at) per user and track) all scanned the
-- table.
--
-- Index builds and production size: these are plain CREATE INDEX, which
-- `npm run migrate` can run (it wraps each file in a transaction, and
-- CREATE INDEX CONCURRENTLY cannot run inside one). A plain build blocks
-- writes to the table while it runs. At current production size (a few
-- learners, thousands of rows) that is well under a second, so CONCURRENTLY
-- is not needed. If either table has grown to millions of rows by the time
-- this is applied, run the two statements by hand in the SQL editor with
-- CONCURRENTLY instead (one at a time, outside a transaction), then record
-- the file: insert into schema_migrations (filename) values
-- ('030_hardening_indexes.sql');
--
-- Additive only, guarded with IF NOT EXISTS like every migration here.
-- lib/schema-status.ts probes both indexes.

create index if not exists idx_chat_messages_user_track_created
    on chat_messages (user_id, track_id, created_at);

create index if not exists idx_study_sessions_user_track_started
    on study_sessions (user_id, track_id, started_at desc);
