-- REQ-042: durable record of what the quarterly catalog-review agent
-- checked and found. Every call to POST /api/catalog/review-findings writes
-- one row here, whether or not it also touches subject_tracks -- so a
-- "still current" conclusion is never a silent write, and a "flagged" one
-- always has the evidence behind it on hand for review.

create table if not exists content_review_findings (
    id uuid primary key default uuid_generate_v4(),
    track_id uuid not null references subject_tracks(id) on delete cascade,
    -- 'current': source re-checked and unchanged: subject_tracks.source_verified_at
    -- and content_review_due_at are advanced. 'flagged': something changed or looks
    -- wrong (retirement, rename, revised objectives, unreachable source) --
    -- content_review_due_at is pulled to now so the track shows "Review due"
    -- immediately, but source_verified_at is left alone rather than implying
    -- a fresh check confirmed it.
    conclusion text not null check (conclusion in ('current', 'flagged')),
    evidence_url text not null,
    summary text not null,
    checked_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_review_findings_track on content_review_findings(track_id, checked_at desc);
