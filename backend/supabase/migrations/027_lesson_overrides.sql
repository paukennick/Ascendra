-- Per-learner lesson regeneration, and a database-level claim on generation.
--
-- lesson_content holds ONE lesson per objective (objective_id is unique), and
-- on a shared catalog track every learner is served that same row. "Regenerate
-- lesson" used to overwrite it, so one learner's tap replaced the lesson for
-- everyone on the track -- and, because the app saves each learner's place in a
-- lesson against a fingerprint of the lesson text (lesson_progress.lesson_key,
-- migration 025), it also threw away every other learner's saved position.
--
-- lesson_content_overrides is the per-learner copy. A learner's regenerate
-- writes only their own row here; lesson_content is never touched by it. Reads
-- serve the caller's override when one exists and the shared row otherwise. The
-- very first lesson for an objective is still generated once and stored in
-- lesson_content for everyone, as before. The content columns are the same as
-- lesson_content's so one row shape (LessonRow in lib/lesson-generation.ts)
-- reads from either table.
--
-- lesson_generation_claims fixes duplicate generation across server instances.
-- The in-memory "already generating" map only dedupes inside one process; on
-- Vercel a prefetch and the GET that follows it can land on different
-- instances and both call the model, so a learner could be shown the teach text
-- from one generation and the fade/solo checks from another. A claim row is a
-- short-lived lease: whoever inserts it generates, everyone else waits for the
-- result. It is a row rather than a held transaction or advisory lock because a
-- generation takes ~20s and the app's pool is five connections. A claim older
-- than its lease (see CLAIM_LEASE_SECONDS in lib/lesson-store.ts) is treated as
-- abandoned, so a crashed instance cannot block an objective for good.
-- `scope` is 'shared' (first generation) or 'user:<uuid>' (a regenerate).
--
-- Additive only, guarded with IF NOT EXISTS like every migration here.

create table if not exists lesson_content_overrides (
    user_id uuid not null references app_users(id) on delete cascade,
    objective_id uuid not null references objectives(id) on delete cascade,
    guess_prompt text not null,
    teach text not null,
    fade_problem text not null,
    fade_choices jsonb not null,              -- string[4]
    fade_correct_index int not null,
    fade_why text not null,
    solo_check text not null,
    solo_choices jsonb not null,
    solo_correct_index int not null,
    solo_why text not null,
    model varchar(100) not null,
    generated_at timestamptz not null default now(),
    primary key (user_id, objective_id)
);

create table if not exists lesson_generation_claims (
    objective_id uuid not null references objectives(id) on delete cascade,
    scope varchar(50) not null,
    claim_token uuid not null,
    claimed_at timestamptz not null default now(),
    primary key (objective_id, scope)
);
