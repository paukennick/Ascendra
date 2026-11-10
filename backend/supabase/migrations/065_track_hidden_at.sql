-- REQ-194: a catalog course can be hidden without deleting it.
--
-- Nick, 2026-11-09: the two Red Hat courses (EX188, EX280) and the Docker
-- Certified Associate course (DCA) come out of the catalog. Red Hat's
-- trademark guidelines say certification training needs a Red Hat training
-- partnership and bar its course numbers; Docker's keep its mark out of
-- program titles (redhat.com/en/about/trademark-guidelines-and-policies,
-- docker.com/legal/trademark-guidelines). Their units, objectives and labs
-- stay, so they can come back if Red Hat or Docker agree.
--
-- hidden_at, when set and passed, means: not listed in GET /api/courses
-- (which is also what every search in the app filters) and not startable
-- by anyone who hasn't already studied it. A learner who has (sessions,
-- answers, mastery, lesson progress, or a free-course pick) keeps the
-- course in their list and keeps full access. The seed is the authority:
-- it sets and clears the column from each track's hiddenAt.
--
-- Nullable, no default: catalog-only change, no table rewrite, nothing
-- backfilled here (npm run seed sets the three rows). Apply BEFORE the
-- backend deploy: the course list reads the column and /api/health probes
-- it. Safe to run twice. Down: `alter table subject_tracks drop column if
-- exists hidden_at;` (the old code ignores it, so leaving it is also safe).

set local lock_timeout = '5s';

alter table subject_tracks add column if not exists hidden_at timestamptz;

comment on column subject_tracks.hidden_at is
  'REQ-194: once passed, the course is not listed or newly startable; learners who already studied it keep it. Set by the seed; content is kept.';
