-- REQ-125: the one-time acknowledgement a learner gives before their first
-- clinical (nursing, CCRN, physical therapy) or fitness lab.
--
-- Nick, 2026-11-07: every lab is served now, including ones no expert has
-- reviewed yet, and every lab carries a disclaimer. Clinical and fitness labs
-- carry a stronger one that the learner must accept once per subject family
-- before starting a lab there (lib/lab-disclaimer.ts holds the wording and
-- its version; the server refuses to start or grade a lab until it is
-- accepted).
--
-- WHY NOT track_acknowledgements (012): that table is per course and keyed
-- to the course's own disclaimer version. This acknowledgement is per
-- learner per SUBJECT FAMILY (one for all clinical courses, one for all
-- fitness courses) and versioned by the lab disclaimer's wording, so a row
-- there would need a course it doesn't belong to.
--
-- One row per learner, family and version: accepting the same version again
-- is a no-op, a new version (a meaning change in the wording) is a new row,
-- and old rows stay as the record of what was accepted when. Deleted with
-- the account (on delete cascade) and in the account export
-- (lib/account-export.ts labDisclaimerAcknowledgements).
--
-- Additive and instant: one new empty table, nothing read by older code.

create table if not exists lab_disclaimer_acknowledgements (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    family text not null constraint lab_disclaimer_ack_family_051 check (family in ('clinical', 'fitness')),
    version int not null check (version > 0),
    acknowledged_at timestamptz not null default now(),
    unique (user_id, family, version)
);
