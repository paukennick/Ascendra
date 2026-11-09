-- REQ-165: the study notice -- ONE disclaimer, accepted once per learner and
-- version, that covers all of Ascendra (lessons, questions, labs, sims and
-- the AI coach) and says what is sent to the AI provider (Google Play User
-- Data policy, clarified July 2026 to cover third-party AI).
--
-- Nick, 2026-11-09: it replaces the per-course disclaimers
-- (track_acknowledgements, 012) and the per-family clinical / fitness lab
-- acknowledgement (lab_disclaimer_acknowledgements, 051). Both tables stay,
-- with their rows, as the record of what was accepted then; no code reads
-- them to gate any more. Everyone -- including people who accepted them --
-- accepts the study notice once (lib/study-notice.ts holds the version,
-- mobile/src/lib/studyNotice.ts the text).
--
-- WHY legal_acceptances (027 + 052) and not a new table: it is already the
-- record of "which version of which text this account agreed to, how and
-- when" -- one row per document and version, never overwritten, deleted with
-- the account (on delete cascade) and in the account export. The notice is
-- one more document there: 'study_notice'. Only the document check widens.
-- lib/legal.ts reads only 'terms' and 'privacy' rows.
--
-- The original check is the unnamed column check from 027
-- (legal_acceptances_document_check); it is replaced by a named one. NOT
-- VALID then VALIDATE keeps the ACCESS EXCLUSIVE lock to the swap itself.
-- Apply BEFORE the backend that records the notice deploys (/api/health
-- probes the constraint). Safe to run twice.

set local lock_timeout = '5s';

alter table legal_acceptances drop constraint if exists legal_acceptances_document_check;
alter table legal_acceptances drop constraint if exists legal_acceptances_document_059;
alter table legal_acceptances
  add constraint legal_acceptances_document_059
  check (document in ('terms', 'privacy', 'study_notice')) not valid;
alter table legal_acceptances validate constraint legal_acceptances_document_059;
