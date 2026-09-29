-- Fix: free-response and PBQ grading were failing outright with a raw
-- Postgres error ("value too long for type character varying(50)") shown
-- verbatim to the learner in place of their graded result -- looked to a
-- user exactly like "the submit button doesn't work," reproduced across
-- every course that uses free-response grading (not course-specific).
--
-- Root cause: attempts.classification and error_log.classification were
-- both varchar(50), but the grading prompt (backend/lib/prompts.ts) only
-- asks the model for "a short tag... e.g. 'misconception', 'incomplete',
-- 'off-scope', 'none'" -- a soft instruction, not a schema-enforced enum.
-- The model occasionally returns a longer descriptive phrase instead of a
-- short tag, and nothing before the INSERT caught or truncated it.
--
-- Multiple-choice grading never hit this: its classification is always the
-- hardcoded literal "none" (see backend/app/api/grade/route.ts's format
-- "mc" branch), never model-generated. Only free-response
-- (/api/grade format "open") and PBQ (/api/pbq) grading call the model for
-- this field, which is why the bug looked format-specific rather than
-- course-specific once actually reproduced.
--
-- Widened to text rather than a larger fixed bound: this field is
-- genuinely freeform (the column's own original comment says so), so an
-- arbitrary cap just reintroduces the same failure mode at a higher
-- threshold. Application-level truncation is added separately in
-- backend/lib/grading-service.ts as defense in depth, since a schema fix
-- alone still leaves an unbounded value able to bloat a row.

alter table attempts alter column classification type text;

-- error_log.classification can't be altered directly: view_due_reviews
-- (migration 001) does `select e.*` from error_log, and its row
-- descriptor is fixed to error_log's column types at view-creation time,
-- so Postgres blocks the ALTER while the view depends on it. Drop and
-- recreate the view around the change -- identical definition, so this is
-- a no-op for anything reading the view.
drop view if exists view_due_reviews;

alter table error_log alter column classification type text;

create or replace view view_due_reviews as
select e.*
from error_log e
where e.resolved = false
  and e.next_review_at is not null
  and e.next_review_at <= current_date;
