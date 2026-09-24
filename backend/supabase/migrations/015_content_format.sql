-- REQ-037: decouple delivery format from track_type.
--
-- track_type (graduate, certification, academic, professional, skills) has
-- been doing two jobs: pedigree/audience, and delivery format. Every track
-- today is the same shape underneath -- units, objectives, mastery grading,
-- PBQ, chat -- so the mismatch hasn't hurt yet. It will the moment a track
-- that isn't a full guided course shows up (a practice-exam-only track, a
-- flashcard deck, a short reading), because there'd be nowhere to record
-- that except overloading track_type again.
--
-- content_format is that separate axis, added ahead of need while it's still
-- free: one value today, matching what every existing row already is.

do $$ begin
  create type content_format as enum ('full_course');
exception
  when duplicate_object then null;
end $$;

alter table subject_tracks
  add column if not exists content_format content_format not null default 'full_course';
