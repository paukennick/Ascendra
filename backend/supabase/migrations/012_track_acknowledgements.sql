-- Per-track disclaimers that a user must actively accept before they can
-- start the course. Built for the nursing tracks: wrong content there has
-- real-world patient-safety implications, so the blanket app-wide
-- disclaimer in terms.tsx isn't enough -- the user has to acknowledge this
-- specific course, and we have to be able to show when they did.
--
-- Recorded against the account rather than the device, so acknowledging on
-- the phone also counts on the web app and survives a reinstall.

alter table subject_tracks
    add column if not exists requires_acknowledgement boolean not null default false,
    -- Which disclaimer body to show. Kept as a key rather than the text
    -- itself so wording lives in one place in the app and can be corrected
    -- without a data migration across every track that shares it.
    add column if not exists disclaimer_key varchar(100),
    -- Bumped when the disclaimer's wording materially changes; a user whose
    -- acknowledgement predates the current version is asked again rather
    -- than being silently treated as having agreed to text they never saw.
    add column if not exists disclaimer_version int not null default 1;

create table if not exists track_acknowledgements (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid not null references subject_tracks(id) on delete cascade,
    disclaimer_version int not null,
    acknowledged_at timestamptz not null default now(),
    -- Kept for the record of what they actually agreed to, since
    -- disclaimer_key on the track can be repointed later.
    disclaimer_key varchar(100) not null,
    -- One row per user/track/version: re-accepting the same version is a
    -- no-op, a new version creates a new row and leaves the old one as
    -- history rather than overwriting it.
    unique (user_id, track_id, disclaimer_version)
);

create index if not exists idx_track_ack_user on track_acknowledgements(user_id, track_id);
