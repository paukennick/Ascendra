-- REQ-332 (Nick, 2026-11-17 19:48 PT: "Is the give feedback only at the bottom
-- of page? Doesn't seem helpful for reviewers for it to be there."): reviewer
-- quick notes. A reviewer (or owner) taps the floating Feedback button on any
-- signed-in screen and sends a short note; the app records where they were.
-- A quick note is a reviewer_feedback row (088), so it shares the access
-- rules, the account export, the deletion cascade and the owner's list:
--
--   kind       'form' (the full REQ-331 form, every row so far) or 'quick'
--   quick_tag  the optional tag: inaccurate, unrealistic, unclear, sensitive
--              (a sensitive-topic concern), bug, praise
--   context    where the note was sent from, as the app captured it: the
--              route and screen title, the unit, objective (lesson) and lesson
--              step, the question (its kind, id or session position), the sim
--              run, phase and sim time, the practice exam session and question
--              number, the lab. Ids, numbers and short labels; no answers.
--
-- The note itself goes in the existing other_comments column ("Anything
-- else?"), so the full form can open and edit a quick note; track_id and
-- sim_id keep linking the course and the sim.
--
-- Personal data: the context is new detail about reviewer feedback (which
-- lesson, question, sim step or exam question it is about, and the screen it
-- came from). The Privacy Policy 2026-11-20 says so; docs/legal/data-inventory.md too.
--
-- ORDER. Apply BEFORE the backend that reads it: the reviewer and owner
-- feedback routes select the new columns, and /api/health probes them
-- (lib/schema-status.ts). The earlier backend never reads them, so applying
-- early is safe.
--
-- LOCKING. Three nullable or constant-default columns on a small table
-- (catalog-only, no rewrite), one check added NOT VALID then validated.
-- lock_timeout 5 s.
--
-- ROLLBACK (deploy the earlier backend first; it never reads any of this):
--   alter table reviewer_feedback drop column if exists context, drop column if exists quick_tag, drop column if exists kind;
-- (dropping the columns drops reviewer_feedback_quick_089). Quick notes stay as
-- rows with their text in other_comments; only the tag and the context go.
--
-- Safe to run twice: if not exists, guarded DO block.

set local lock_timeout = '5s';

alter table reviewer_feedback add column if not exists kind varchar(5) not null default 'form';
alter table reviewer_feedback add column if not exists quick_tag varchar(12);
alter table reviewer_feedback add column if not exists context jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reviewer_feedback_quick_089') then
    alter table reviewer_feedback add constraint reviewer_feedback_quick_089 check (
      kind in ('form', 'quick')
      and (quick_tag is null or quick_tag in ('inaccurate', 'unrealistic', 'unclear', 'sensitive', 'bug', 'praise'))
      and (context is null or (jsonb_typeof(context) = 'object' and pg_column_size(context) <= 4096))
      and (kind = 'quick' or (quick_tag is null and context is null))
      and (kind = 'form' or other_comments is not null)
    ) not valid;
  end if;
end $$;
alter table reviewer_feedback validate constraint reviewer_feedback_quick_089;

comment on column reviewer_feedback.kind is
  'REQ-332: form = the full reviewer form (REQ-331); quick = a quick note from the floating Feedback button (its text is other_comments).';
comment on column reviewer_feedback.quick_tag is
  'REQ-332: a quick note''s optional tag: inaccurate, unrealistic, unclear, sensitive (sensitive-topic concern), bug, praise.';
comment on column reviewer_feedback.context is
  'REQ-332: where a quick note was sent from (route, screen, unit, objective, lesson step, question, sim run/phase/time, exam session and question number, lab). Ids, numbers and short labels only.';
