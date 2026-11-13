-- REQ-253 (teaching learners at every level, phase 1B; design of 2026-11-12,
-- sections 4 and 5, and Nick's decisions of the same day): lesson primers,
-- the "Key terms" a learner can open at any step of a lesson.
--
-- 1. lesson_primers: ONE row per objective, shared by every learner (like
--    lesson_content). It has no level: a New learner sees it opened once at
--    the start, everyone else can open it from the Key terms button.
--      terms               jsonb array of 1 to 12 objects
--                          {term, plain, example, exam_wording}: the word or
--                          phrase, one plain sentence, an everyday example,
--                          and the precise wording the exam uses. The app
--                          asks for about 8 (lib/primers.ts MAX_PRIMER_TERMS);
--                          12 is a storage bound, not the target.
--      source_lesson_hash  sha256 (hex) of the shared lesson text the primer
--                          was written from (lib/primers.ts lessonHash). When
--                          the shared lesson changes (a content fix, a pulled
--                          check replaced) the hash differs and the primer is
--                          written again on its next use.
--      model               the writer model id
--      generated_at        when it was written
--    Deleted with the objective (on delete cascade). Nothing learner-owned:
--    no user_id, so account deletion and the account export are not affected
--    (docs/legal/data-inventory.md lists it as shared content).
--
-- 2. item_holdbacks may record item_kind 'primer': a primer the writer was
--    unsure of, or whose definitions the fact-check disputed, is logged
--    there like every other generated item (REQ-114, REQ-216). The check
--    item_holdbacks_item_kind_067 is restated, under the same name, with
--    every value 067 allowed plus 'primer', added NOT VALID and then
--    validated, as 067 did.
--
-- INDEPENDENT of 078 (learner level per course, another branch): nothing here
-- reads or writes its tables, so the two apply in either order.
--
-- ORDER. Apply BEFORE the backend that reads it: GET
-- /api/objectives/:id/primer reads and writes lesson_primers, and /api/health
-- probes it (lib/schema-status.ts). The code before this migration never
-- reads either object, so applying early is safe.
--
-- LOCKING. One new table; the item_holdbacks check is swapped with a brief
-- ACCESS EXCLUSIVE lock for the ADD/DROP and a SHARE UPDATE EXCLUSIVE scan for
-- VALIDATE (item_holdbacks is a small log table). lock_timeout 5 s like 077:
-- a busy moment fails the migration (nothing applied) rather than queueing
-- behind live traffic.
--
-- ROLLBACK (nothing learner-owned):
--   drop table if exists lesson_primers;
--   delete from item_holdbacks where item_kind = 'primer';
--   -- then restate item_holdbacks_item_kind_067 without 'primer' (067's list).
-- docs/deploy-runbook-integration.md lists it with the other down paths.
--
-- Safe to run twice: if not exists, guarded DO blocks.

set local lock_timeout = '5s';

-- 1. lesson_primers -----------------------------------------------------------

create table if not exists lesson_primers (
    objective_id uuid primary key references objectives(id) on delete cascade,
    terms jsonb not null,
    source_lesson_hash varchar(64) not null,
    model varchar(80) not null,
    generated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lesson_primers_terms_079') then
    alter table lesson_primers add constraint lesson_primers_terms_079
      check (jsonb_typeof(terms) = 'array' and jsonb_array_length(terms) between 1 and 12);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lesson_primers_hash_079') then
    alter table lesson_primers add constraint lesson_primers_hash_079
      check (source_lesson_hash ~ '^[0-9a-f]{64}$');
  end if;
end $$;

comment on table lesson_primers is
  'REQ-253: the Key terms primer of an objective, shared by every learner. Written from the shared lesson whose sha256 is source_lesson_hash; a different hash means the lesson changed and the primer is rewritten on next use.';

-- Supabase Data API lock-out, as 026, 052, 060 and 077 did for every table.
alter table lesson_primers enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on lesson_primers from anon, authenticated;
  end if;
end $$;

-- 2. item_holdbacks: 'primer' ---------------------------------------------------
-- FAIL-1720: restated under 067's own name, item_holdbacks_item_kind_067. A
-- new name would leave 067's schema probe (lib/schema-status.ts) reporting 067
-- as missing, and a replay of 067 (lib/sims.dbtest.ts does one) would drop the
-- new check, since 067 drops every item_kind check but its own.

do $$
declare
  c text;
  def text;
begin
  select pg_get_constraintdef(oid) into def from pg_constraint
   where conrelid = 'item_holdbacks'::regclass and conname = 'item_holdbacks_item_kind_067';
  if def is null or def not like '%''primer''%' then
    for c in select conname from pg_constraint
              where conrelid = 'item_holdbacks'::regclass and contype = 'c'
                and pg_get_constraintdef(oid) like '%item_kind%' loop
      execute format('alter table item_holdbacks drop constraint %I', c);
    end loop;
    alter table item_holdbacks add constraint item_holdbacks_item_kind_067 check (item_kind in
      ('lesson', 'lesson_intro', 'review', 'exam', 'quiz', 'comparison', 'pbq', 'unit_check', 'lab', 'sim', 'primer')) not valid;
    alter table item_holdbacks validate constraint item_holdbacks_item_kind_067;
  end if;
end $$;

-- REQ-207: grant the least-privilege runtime role what it needs on the new
-- table (DML and its app_runtime_all policy; the app writes a primer on first use).
select app_runtime_sync();
