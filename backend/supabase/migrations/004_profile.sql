-- Profile pictures. Stored as a resized/compressed image directly in
-- Postgres (bytea) rather than Supabase Storage -- this project has no
-- Storage/service-role integration today (the only DB access anywhere is a
-- single trusted server connection over DATABASE_URL), and avatars here are
-- small (server resizes to 256x256 JPEG before insert, see
-- lib/auth/avatar.ts), so adding a second storage system and its own
-- policy/credential surface isn't justified yet. Revisit if avatars need to
-- be reused outside this app or grow beyond thumbnail size. Additive only.

alter table app_users
    add column if not exists avatar_image bytea,
    add column if not exists avatar_content_type varchar(50),
    add column if not exists avatar_updated_at timestamptz;
