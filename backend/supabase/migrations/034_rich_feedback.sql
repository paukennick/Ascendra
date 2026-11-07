-- REQ-105: explain every option, show a model answer, then let the learner
-- revise once.
--
-- 1. A short reason for every multiple-choice option, generated with the
--    lesson's practice half. Nullable: lessons cached before this migration
--    have none and keep working (grading falls back to fade_why / solo_why);
--    nothing is regenerated.
-- 2. The grader's model answer and "what to fix" line, stored with the
--    attempt so a replayed request (same clientAttemptId) returns them too.
-- 3. attempts.retry_of: a revision after a miss points at the attempt it
--    revises. The unique index allows one revision per attempt, enforced in
--    the database so two taps or two devices can't both record one.
--
-- Additive only, guarded with IF NOT EXISTS like every migration here.

alter table lesson_content add column if not exists fade_option_reasons jsonb;
alter table lesson_content add column if not exists solo_option_reasons jsonb;
alter table lesson_content_overrides add column if not exists fade_option_reasons jsonb;
alter table lesson_content_overrides add column if not exists solo_option_reasons jsonb;

alter table attempts add column if not exists model_answer text;
alter table attempts add column if not exists fix_next text;
alter table attempts add column if not exists retry_of uuid references attempts(id) on delete cascade;

create unique index if not exists attempts_retry_of_unique on attempts(retry_of) where retry_of is not null;
