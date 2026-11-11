-- REQ-209 (docs/sims.md 5.4a-5.4e): pace, focused start, teaching answers and
-- chapter breaks are logged as commands, so sim_run_commands must accept the
-- four new command types. Number 073 assigned by the lead.
--
-- WHAT CHANGES
--   sim_run_commands.type may now also be 'pace', 'begin', 'teach' or
--   'chapter' (the skip offer is an ordinary 'skip' command with a flag in
--   its payload, so it needs nothing here). The column stays varchar(10); the
--   longest new name is 7 characters.
--
-- WHY IT MATTERS
--   Without this the first logged pace command is a failed insert and the sync
--   route answers 500. Runs that never log one are not affected, so the
--   change is safe to apply before the code that writes them (apply this
--   first). lib/schema-status.ts probes for it.
--
-- LOCKING. lock_timeout 5 s like 067. The new check is a strict superset of
-- the old one, so no existing row can fail it. It is added NOT VALID, the old
-- one dropped and the new one validated, which scans the table under ACCESS
-- EXCLUSIVE until the migration's transaction ends. The table holds one row
-- per learner command in a feature that has only just gone live, so the scan
-- is short.
--
-- ROLLBACK. Switch off by leaving the new commands unwritten: the previous
-- backend never writes them and runs unchanged on this schema. A full
-- removal is a forward migration that first deletes the rows
--   delete from sim_run_commands where type in ('pace', 'begin', 'teach', 'chapter');
-- (which makes the affected runs unreplayable, so abandon them first) and then
-- puts back 062's check in place of sim_run_commands_type_073.
--
-- Safe to run twice: guarded DO block.

set local lock_timeout = '5s';

do $$
declare
  c text;
begin
  if not exists (select 1 from pg_constraint where conrelid = 'sim_run_commands'::regclass and conname = 'sim_run_commands_type_073') then
    alter table sim_run_commands
      add constraint sim_run_commands_type_073
      check (type in ('act', 'choose', 'skip', 'pause', 'resume', 'reason', 'end', 'pace', 'begin', 'teach', 'chapter')) not valid;
  end if;
  -- 062's inline check (auto-named) goes; 073's stays.
  for c in select conname from pg_constraint
            where conrelid = 'sim_run_commands'::regclass and contype = 'c' and conname <> 'sim_run_commands_type_073'
              and pg_get_constraintdef(oid) like '%''act''%' loop
    execute format('alter table sim_run_commands drop constraint %I', c);
  end loop;
  alter table sim_run_commands validate constraint sim_run_commands_type_073;
end $$;
