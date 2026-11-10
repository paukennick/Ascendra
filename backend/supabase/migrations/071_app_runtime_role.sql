-- REQ-207 (FAIL-940, 941, 954): least privilege for the running app, and the
-- function hygiene the Supabase advisor flagged.
--
-- 1. app_runtime -- a NOLOGIN role for the web app's own connection, so a
--    leaked DATABASE_URL (or an injection bug) cannot run DDL, rewrite the
--    migration ledger, read the rollback backups or bypass RLS. The app has
--    connected as the table OWNER (Supabase's `postgres`) until now.
--      * DML (select/insert/update/delete) on every app table; select on the
--        views; usage + select on sequences; execute on the functions the
--        app calls (directly, from a column default or check, or through
--        another function). No DDL, no TRUNCATE, no CREATE on the schema.
--      * schema_migrations: SELECT only, with a select-only policy (the
--        health check reads the ledger).
--      * mastery_backup_*, error_log_backup_*: nothing (rollback copies).
--      * RLS. Every public table has RLS on with no policies (026, 052); the
--        owner connection bypasses that. The app does NOT depend on the
--        bypass as such -- every route filters by the signed-in user in SQL
--        -- but it reads and writes across all users (sign-in, the shared
--        catalog, retention purges), so it needs "all rows". It gets them
--        from an explicit app_runtime_all policy per table, not from
--        BYPASSRLS (which Supabase would not let a migration grant, and
--        which would also bypass every policy added later). A table added
--        later without a policy is therefore invisible to the app and fails
--        closed in the DB test, rather than silently open.
--      * Role settings that survive a transaction-mode pooler (a session
--        SET would not): statement_timeout 25 s (under the driver's 30 s
--        query_timeout, so the server stops the statement first),
--        idle_in_transaction_session_timeout 60 s, jit off (REQ-118 note
--        in docs/operations-runbook.md).
--    The role cannot log in here. Nick sets its password afterwards, by
--    hand (docs/ops/2026-11-10-lockdown-and-db-rotation.md, step 5):
--      alter role app_runtime login password '<generated>';
--    Until then nothing changes: the app keeps its current connection.
--
-- 2. app_runtime_sync() -- the one place the above is written down, so it
--    can be repeated. Every later migration that adds a table, view,
--    sequence or function, or restates a function with CREATE OR REPLACE
--    (which drops its search_path setting), ends with `select
--    app_runtime_sync();`. lib/app-runtime.dbtest.ts fails CI if one forgets.
--    The function itself is executable by the owner only.
--
-- 3. Functions (FAIL-941). EXECUTE is revoked from PUBLIC (and from the
--    Supabase API roles anon / authenticated) on every function in public
--    that is not an extension's, and each gets `search_path = public,
--    pg_temp` (advisor: function_search_path_mutable). Trigger functions are
--    granted to nobody: a trigger needs no EXECUTE at fire time. The
--    procedure recompute_mastery_batched() is owner-only (it creates a temp
--    table and commits); a procedure with a SET clause may not COMMIT, so it
--    gets no search_path -- it names every object it uses by plain name and
--    runs only from `call` in the owner's session.
--
-- 4. The 064 read policies on objectives and course_units let content_recheck
--    read every learner's PRIVATE course structure (FAIL-954). They are
--    restated to catalog tracks only (subject_tracks.user_id is null), the
--    same limit subject_tracks already had.
--
-- LOCKING. GRANT / CREATE POLICY / ALTER FUNCTION take brief catalog locks
-- per object; ALTER FUNCTION is the heaviest (it blocks while a transaction
-- is running that function). lock_timeout makes a busy moment fail the
-- migration (nothing applied) instead of queueing behind live traffic; run
-- it again. Safe to run twice: the role is created only if missing, policies
-- are dropped and created by name, grants and settings repeat harmlessly.
--
-- ROLLBACK (by hand; the app works either way, since it still connects as
-- the owner until Nick switches DATABASE_URL -- switch that back first):
--   reassign/drop the LOGIN password: alter role app_runtime nologin;
--   restore the 064 policies (scripts/rollback-071.sql does all of these):
--     objectives / course_units "recheck_read" back to `using (true)`
--   revoke all on all tables/sequences/functions in schema public from app_runtime;
--   drop policy app_runtime_all on every table that has it;
--   drop owned by app_runtime; drop role app_runtime;
--   drop function app_runtime_sync();
-- PUBLIC's EXECUTE and the functions' search_path are left hardened on
-- purpose: nothing depends on the old, looser state. To undo anyway:
--   grant execute on all functions in schema public to public;
--   alter function <name>(<args>) reset search_path;

set local lock_timeout = '5s';

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime nologin nocreatedb nocreaterole;
  end if;
end $$;

alter role app_runtime set statement_timeout = '25s';
alter role app_runtime set idle_in_transaction_session_timeout = '60s';
alter role app_runtime set jit = off;

create or replace function app_runtime_sync() returns void
language plpgsql
set search_path = public, pg_temp
as $fn$
declare
  r record;
  api_role text;
begin
  -- Nothing may create objects in public except the owner (PG 15+ already
  -- ships this; older clusters grant it to PUBLIC).
  revoke create on schema public from public;
  grant usage on schema public to app_runtime;

  -- Tables, views and sequences -------------------------------------------
  for r in
    select c.relname, c.relkind, c.relrowsecurity
      from pg_class c
     where c.relnamespace = 'public'::regnamespace
       and c.relkind in ('r', 'p', 'v', 'm', 'S')
       and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
       -- rollback copies: mastery_backup_029, error_log_backup_029, ...
       and c.relname !~ '_backup_[0-9]'
       -- a sequence owned by one of those copies
       and not exists (
         select 1 from pg_depend d
           join pg_class t on t.oid = d.refobjid
          where d.objid = c.oid and d.deptype in ('a', 'i') and c.relkind = 'S'
            and t.relname ~ '_backup_[0-9]')
  loop
    if r.relkind = 'S' then
      execute format('grant usage, select on sequence %I to app_runtime', r.relname);
    elsif r.relkind in ('v', 'm') then
      execute format('grant select on %I to app_runtime', r.relname);
    elsif r.relname = 'schema_migrations' then
      execute format('revoke all on %I from app_runtime', r.relname);
      execute format('grant select on %I to app_runtime', r.relname);
      if r.relrowsecurity then
        execute format('drop policy if exists app_runtime_all on %I', r.relname);
        execute format('create policy app_runtime_all on %I for select to app_runtime using (true)', r.relname);
      end if;
    else
      execute format('grant select, insert, update, delete on %I to app_runtime', r.relname);
      if r.relrowsecurity then
        execute format('drop policy if exists app_runtime_all on %I', r.relname);
        execute format('create policy app_runtime_all on %I for all to app_runtime using (true) with check (true)', r.relname);
      end if;
    end if;
  end loop;

  -- Functions and procedures that are the project's own --------------------
  for r in
    select p.proname, p.prokind, p.prorettype = 'trigger'::regtype as is_trigger,
           pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.prokind in ('f', 'p')
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on %s %I(%s) from public',
                   case when r.prokind = 'p' then 'procedure' else 'function' end, r.proname, r.args);
    foreach api_role in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = api_role) then
        execute format('revoke execute on %s %I(%s) from %I',
                       case when r.prokind = 'p' then 'procedure' else 'function' end, r.proname, r.args, api_role);
      end if;
    end loop;
    if r.prokind = 'f' then
      execute format('alter function %I(%s) set search_path = public, pg_temp', r.proname, r.args);
      if r.is_trigger or r.proname = 'app_runtime_sync' then
        execute format('revoke execute on function %I(%s) from app_runtime', r.proname, r.args);
      else
        execute format('grant execute on function %I(%s) to app_runtime', r.proname, r.args);
      end if;
    else
      execute format('revoke execute on procedure %I(%s) from app_runtime', r.proname, r.args);
    end if;
  end loop;
end
$fn$;

select app_runtime_sync();

-- FAIL-954: content_recheck reads catalog structure only ------------------------
drop policy if exists recheck_read on objectives;
create policy recheck_read on objectives for select to content_recheck
  using (exists (
    select 1 from course_units cu
      join subject_tracks t on t.id = cu.track_id
     where cu.id = objectives.unit_id and t.user_id is null));

drop policy if exists recheck_read on course_units;
create policy recheck_read on course_units for select to content_recheck
  using (exists (
    select 1 from subject_tracks t
     where t.id = course_units.track_id and t.user_id is null));
