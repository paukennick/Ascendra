-- Course favorites. A single boolean on subject_tracks rather than a
-- separate favorites table -- the only favoritable object in this product
-- today is a course/track (lessons and objectives don't have stable
-- standalone identity the way a course does), so a join table would be
-- unused complexity. Revisit if favoriting is ever extended past courses.
-- Additive only.

alter table subject_tracks
    add column if not exists is_favorite boolean not null default false;
