-- REQ-199 (docs/sims.md 6, 22): "Report a problem" on a simulation. Number
-- 067 assigned by the lead (066 is held for the PT study-path work).
--
-- WHAT IS ADDED
--   1. The 'sim' item kind on item_flags, item_status and item_holdbacks (the
--      042 / 050 report-and-quarantine pipeline). A sim report's item_id is
--      the sim_versions.id: a report, a quarantine and a confirmation pull
--      that VERSION from rotation, not the whole sim (lib/sims.ts
--      servedVersion skips it). content_review_queue (055) checks item_kind
--      with a pattern and needs no change.
--   2. item_flags.context jsonb, nullable, at most 2000 bytes as text: the
--      machine data a report carries (sim id, version, run, the tick and
--      state hash the learner saw, the server's last tick and hash). The
--      learner's own words stay in item_flags.note. Older rows and every
--      other kind leave it null.
--
-- LOCKING. lock_timeout 5 s like 050. Each check is swapped under ACCESS
-- EXCLUSIVE on its table, held to the end of the migration's transaction:
-- the new constraint is added NOT VALID, the old ones dropped, and the new
-- one validated, which scans the table. These tables are small (one row per
-- report, pulled item or held-back generation), so the scan is short. The
-- column is nullable with no default (catalog only).
--
-- ROLLBACK. Switch off and leave the schema: with SIMS_ENABLED off nothing
-- writes kind 'sim' and the previous backend runs unchanged on this schema
-- (it never reads item_flags.context). A full removal is a forward
-- migration that first deletes or re-kinds every 'sim' row:
--   delete from item_flags where item_kind = 'sim';
--   delete from item_status where item_kind = 'sim';
--   delete from item_holdbacks where item_kind = 'sim';
--   alter table item_flags drop constraint if exists item_flags_context_067;
--   alter table item_flags drop column if exists context;
-- and then puts back 050's checks (item_flags_item_kind_050,
-- item_status_item_kind_050, item_holdbacks_item_kind_050) in place of the
-- *_067 ones.
--
-- Safe to run twice: guarded DO blocks and IF NOT EXISTS.

set local lock_timeout = '5s';

-- 1. Item kinds ------------------------------------------------------------------------

do $$
declare
  t text;
  c text;
begin
  foreach t in array array['item_flags', 'item_status'] loop
    if not exists (select 1 from pg_constraint where conrelid = t::regclass and conname = t || '_item_kind_067') then
      execute format(
        'alter table %I add constraint %I check (item_kind in (''lesson'', ''review'', ''exam'', ''quiz'', ''comparison'', ''lab'', ''sim'')) not valid',
        t, t || '_item_kind_067');
    end if;
    -- Every older item_kind check (042's inline one, 050's) goes; 067's stays.
    for c in select conname from pg_constraint
              where conrelid = t::regclass and contype = 'c' and conname <> t || '_item_kind_067'
                and pg_get_constraintdef(oid) like '%item_kind%' loop
      execute format('alter table %I drop constraint %I', t, c);
    end loop;
    execute format('alter table %I validate constraint %I', t, t || '_item_kind_067');
  end loop;

  if not exists (select 1 from pg_constraint where conrelid = 'item_holdbacks'::regclass and conname = 'item_holdbacks_item_kind_067') then
    alter table item_holdbacks add constraint item_holdbacks_item_kind_067 check (item_kind in
      ('lesson', 'lesson_intro', 'review', 'exam', 'quiz', 'comparison', 'pbq', 'unit_check', 'lab', 'sim')) not valid;
  end if;
  for c in select conname from pg_constraint
            where conrelid = 'item_holdbacks'::regclass and contype = 'c' and conname <> 'item_holdbacks_item_kind_067'
              and pg_get_constraintdef(oid) like '%item_kind%' loop
    execute format('alter table item_holdbacks drop constraint %I', c);
  end loop;
  alter table item_holdbacks validate constraint item_holdbacks_item_kind_067;
end $$;

-- 2. The report's machine context ---------------------------------------------------------

alter table item_flags add column if not exists context jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'item_flags'::regclass and conname = 'item_flags_context_067') then
    alter table item_flags add constraint item_flags_context_067
      check (context is null or (jsonb_typeof(context) = 'object' and length(context::text) <= 2000)) not valid;
  end if;
end $$;
alter table item_flags validate constraint item_flags_context_067;
