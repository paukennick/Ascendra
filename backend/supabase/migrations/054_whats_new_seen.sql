-- REQ-140: "What's new". The newest release note each learner has seen, so
-- the in-app "What's new" sheet shows once per release on any device.
-- Release notes themselves live in backend/lib/release-notes.ts, not here.
--
-- NULL means the account has never dismissed a note: it is shown the newest
-- one once (lib/whats-new.ts). New accounts are given the newest id when they
-- are created (register and Google sign-up), so a brand-new learner's first
-- run is not interrupted. Ids are YYYY-MM-DD with an optional -suffix and
-- compare in "C" order; the server only ever moves the marker forward.
--
-- Additive: one nullable column, no default, no rewrite (an instant
-- ACCESS EXCLUSIVE on app_users; 5 s lock_timeout as usual). The code before
-- this release never reads it. Apply BEFORE the backend that writes it at
-- sign-up deploys (/api/health probes it). Safe to run twice.

set local lock_timeout = '5s';

alter table app_users add column if not exists whats_new_seen_id varchar(32);
