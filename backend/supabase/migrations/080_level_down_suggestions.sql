-- REQ-256 (learner levels follow-ups, Nick 2026-11-12: "I like all
-- recommended fixes"). Number 080 assigned by the lead. Builds on 078
-- (REQ-252) and REQ-255 (no migration).
--
-- Why a migration: 078's checks name every learner_events event and every
-- learner_level_changes reason. The follow-ups need three new events and one
-- new reason; nothing else (no table, no column).
--
-- 1. learner_events: three new events, each with a small `detail` built by
--    the server from fixed keys (never answer text; 078's 400-byte cap):
--      guess_matched         how a typed guess compared with the lesson
--                            (detail.match: close, partial or off), written
--                            by the guess-feedback route from the model's
--                            guessMatch. objective_id set. One of the two
--                            signals behind the move-down suggestion ("every
--                            guess off").
--      level_down_suggested  the lesson asked "This unit seems tougher than
--                            expected. Want more step-by-step help here?"
--                            (detail: unit, from, to, why). At most one per
--                            unit per LEVEL_DOWN_SNOOZE_DAYS
--                            (lib/learner-level-rules.ts).
--      level_down_declined   "Not now" on that suggestion (detail: unit);
--                            snoozes it for that unit for the same week.
--      goal_card_shown       REQ-255's lesson goal card was shown in a lesson
--                            (objective_id set). After GOAL_CARD_MAX_SHOWINGS
--                            lessons without an answer the server records it
--                            dismissed (course_goal_set, via lesson, reason
--                            auto) and stops showing it.
--    "Yes" on the suggestion is not an event of its own: it is a level change
--    (2) plus the usual level_changed event.
-- 2. learner_level_changes.reason may be 'suggested': the learner accepted a
--    move-down suggestion. Recorded with the unit's prior level like an
--    automatic change, so Undo puts it back exactly. Already seen (the
--    learner just chose it), so it is never shown as a notice; older apps
--    read notices only, and only reason 'mastery'.
--
-- Both checks are restated under new names (..._080), added NOT VALID and
-- then validated, as 078 did.
--
-- ORDER. Apply BEFORE the backend that writes these values: the level check,
-- the suggestion route, the goal-card route and the guess-feedback route
-- insert them, and /api/health probes for this file (lib/schema-status.ts).
-- The code before this migration never writes them, so applying early is
-- safe. Needs 078.
--
-- LOCKING. Two check constraints swapped: a brief ACCESS EXCLUSIVE lock on
-- learner_events and learner_level_changes for the DROP/ADD, then one scan of
-- each to VALIDATE; the migration tool runs the file in one transaction, so
-- the locks are held to commit (same shape and size as 078's own swap on
-- learner_events). lock_timeout 5 s as usual: a busy moment fails the
-- migration cleanly (nothing applied; re-run it).
--
-- ROLLBACK (deploy the earlier backend first):
--   delete from learner_events where event in ('guess_matched', 'level_down_suggested',
--     'level_down_declined', 'goal_card_shown');
--   update learner_level_changes set reason = 'learner' where reason = 'suggested';
--   -- then restate learner_events_event_078 (078's list) and drop
--   -- learner_events_event_080; restate learner_level_changes_reason_check
--   -- as check (reason in ('learner', 'mastery')) and drop
--   -- learner_level_changes_reason_080.
-- docs/deploy-runbook-integration.md lists it with the other down paths.
--
-- Safe to run twice: guarded DO blocks.

set local lock_timeout = '5s';

do $$
begin
    if not exists (select 1 from pg_constraint where conrelid = 'learner_events'::regclass and conname = 'learner_events_event_080') then
        alter table learner_events drop constraint if exists learner_events_event_078;
        alter table learner_events drop constraint if exists learner_events_event_check;
        alter table learner_events add constraint learner_events_event_080 check (event in (
            'lesson_started', 'lesson_finished', 'review_done', 'exam_taken',
            'placement_done', 'first_run_completed', 'exam_outcome',
            -- REQ-252 phase 1 (078)
            'course_goal_set', 'level_changed',
            'guess_shown', 'guess_answered', 'guess_skipped',
            'teach_card_viewed', 'guided_skipped', 'lesson_step_reached',
            'key_terms_opened', 'key_terms_closed',
            -- REQ-256 (080)
            'guess_matched', 'level_down_suggested', 'level_down_declined',
            'goal_card_shown')) not valid;
        alter table learner_events validate constraint learner_events_event_080;
    end if;

    if not exists (select 1 from pg_constraint where conrelid = 'learner_level_changes'::regclass and conname = 'learner_level_changes_reason_080') then
        alter table learner_level_changes drop constraint if exists learner_level_changes_reason_check;
        alter table learner_level_changes add constraint learner_level_changes_reason_080
            check (reason in ('learner', 'mastery', 'suggested')) not valid;
        alter table learner_level_changes validate constraint learner_level_changes_reason_080;
    end if;
end $$;
