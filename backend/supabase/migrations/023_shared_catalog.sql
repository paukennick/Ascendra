-- REQ-082: shared catalog.
--
-- Until now every catalog track was a per-user copy: the seed script
-- created the whole catalog under one user's id, so a second account saw
-- zero courses until someone re-ran the seed with their email. That was
-- fine for a single-user app and is the single biggest gap for anyone
-- else signing up.
--
-- From here on, a catalog track has user_id NULL and is visible to every
-- signed-in user; tracks created through POST /api/courses keep their
-- owner and stay private. subject_tracks.user_id was already nullable
-- (migration 001 declared it without NOT NULL), so no column change is
-- needed -- the ownership move itself is done by the seed script, which is
-- the only thing that knows which user it seeded under.
--
-- Two consequences this migration handles:
--
-- 1. unique(user_id, code) does not constrain rows whose user_id is NULL
--    (NULLs are distinct in a unique index), so a partial unique index
--    keeps the shared catalog free of duplicate codes.
--
-- 2. is_favorite (migration 005) lives on the track itself, which was
--    correct when each user had their own copy and is wrong the moment the
--    row is shared. Favorites move to a per-user table; the old column is
--    left in place (additive-only) and simply stops being read. Existing
--    favorites are carried over so nobody loses a starred course.
--
-- The user-agnostic rollup views (view_track_progress, view_unit_mastery)
-- are likewise left in place but are no longer used by any route: they
-- join mastery with no user filter, which on a shared track would add
-- every user's mastery together. The routes now compute the same numbers
-- per user (backend/lib/progress-sql.ts).

create unique index if not exists subject_tracks_catalog_code_unique
    on subject_tracks (code)
    where user_id is null;

create table if not exists course_favorites (
    user_id uuid not null references app_users(id) on delete cascade,
    track_id uuid not null references subject_tracks(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, track_id)
);

insert into course_favorites (user_id, track_id)
select user_id, id
  from subject_tracks
 where is_favorite = true and user_id is not null
on conflict do nothing;
