-- REQ-127: lesson position saved to the account, and idempotent grading.
--
-- REQ-126 saved a learner's place inside a lesson (Teach / Guided / Solo,
-- their guess, its feedback, their confidence) on the device only, so it
-- did not follow the account to another phone or to the web build. This
-- table is the account-level copy; the app keeps a device copy as an
-- offline fallback.
--
-- `checks` holds the graded result of the Guided and Solo checks
-- ({fade?: {...}, solo?: {...}}) so a learner who answered and then left
-- before tapping Continue comes back to their verdict instead of being
-- asked again -- which used to record a second attempt and skew mastery.
--
-- attempts.client_attempt_id is the second half of that fix: the app sends
-- one id per submitted answer and /api/grade returns the stored result for
-- an id it has already seen instead of grading and recording it again.
-- That covers a retry after a dropped connection (the server recorded the
-- attempt but the app never got the answer) and a double submit.
--
-- Additive only, guarded with IF NOT EXISTS like every migration here.

create table if not exists lesson_progress (
    user_id uuid not null references app_users(id) on delete cascade,
    objective_id uuid not null references objectives(id) on delete cascade,
    step varchar(10) not null check (step in ('teach', 'fade', 'solo')),
    guess text not null default '',
    guess_feedback text,
    confidence int check (confidence between 1 and 5),
    lesson_key varchar(64) not null,
    checks jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    primary key (user_id, objective_id)
);

alter table attempts add column if not exists client_attempt_id varchar(64);

create unique index if not exists attempts_user_client_attempt_unique
    on attempts (user_id, client_attempt_id)
    where client_attempt_id is not null;
