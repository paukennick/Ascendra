-- REQ-113 (Audit 3 mobile H1): exam answers saved in the order the learner
-- gave them.
--
-- The app saves each mock-exam answer as it is given, one PUT per change.
-- Two quick changes to the same question (A, then B) could reach the server
-- in the other order on a slow network, or a save the app had given up on
-- (timed out) could land after a newer one, leaving the older answer stored
-- and graded. The app now numbers its saves per question; the server keeps
-- the highest number it has applied and ignores an older one (it answers
-- 200 { saved: false, stale: true }, since a newer save already won).
--
-- save_seq starts at 0 and comes back with each item in the session view, so
-- an app resuming the session (or on another phone) continues from it. A
-- save without a number (an older app) is applied as before and leaves the
-- number alone.
--
-- Additive. A NOT NULL column with a constant default is a catalog-only
-- change on Postgres 11+ (no table rewrite); ACCESS EXCLUSIVE is held only
-- for that instant, under the usual 5 s lock_timeout. Safe to run twice.

set local lock_timeout = '5s';

alter table exam_session_items
    add column if not exists save_seq bigint not null default 0
        check (save_seq >= 0);
