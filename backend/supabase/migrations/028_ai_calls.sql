-- AI call log: one row per model call, for cost, latency, failure-rate and
-- prompt-cache visibility.
--
-- Until now nothing recorded what the AI features cost or how often they
-- failed: a model upgrade, a prompt change or a caching change could make
-- lessons slower or dearer (or start returning errors) and the only signal was
-- a learner complaining. lib/anthropic.ts now writes a row here for every
-- call it makes, success or failure, via lib/ai-calls.ts.
--
-- What a row holds: which feature made the call (`purpose`: lesson_intro,
-- lesson_practice, grade_open, pbq_generate, pbq_grade, chat, guess_feedback),
-- which model, token counts as the API reports them (cache_read_tokens and
-- cache_write_tokens are cache_read_input_tokens / cache_creation_input_tokens
-- from the response `usage`; input_tokens excludes those), wall-clock latency,
-- whether the call succeeded, and a short error code on failure
-- (e.g. http_429_rate_limit_error). It never holds prompt text, learner
-- answers, model output or error messages.
--
-- `user_id` is null for work not attributable to one learner (the first,
-- shared generation of a lesson) and is set null, not deleted, when an account
-- is deleted, so cost history survives account deletion without keeping the
-- link to the person.
--
-- The writer is fire-and-forget and swallows its own failures, so this table
-- being absent (migration not yet applied) degrades to a console warning and
-- never fails a learner's request.
--
-- Additive only, guarded with IF NOT EXISTS like every migration here.

create table if not exists ai_calls (
    id uuid primary key default uuid_generate_v4(),
    created_at timestamptz not null default now(),
    user_id uuid references app_users(id) on delete set null,
    purpose varchar(40) not null,
    model varchar(80) not null,
    input_tokens int,
    output_tokens int,
    cache_read_tokens int,
    cache_write_tokens int,
    latency_ms int not null,
    ok boolean not null,
    error_code varchar(80)
);

create index if not exists ai_calls_created_at_idx on ai_calls (created_at);
