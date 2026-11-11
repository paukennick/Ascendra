-- Roll back migration 071 (REQ-207: app_runtime, app_runtime_sync(), and the
-- narrowed content_recheck read policies).
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f scripts/rollback-071.sql
--
-- Do this AFTER pointing Vercel's DATABASE_URL back at the owner login
-- (docs/ops/2026-11-10-lockdown-and-db-rotation.md, step 5 rollback), or the
-- live app loses its role mid-request.
--
-- What it does:
--   * puts the 064 read policies on objectives / course_units back to
--     `using (true)` (content_recheck sees every learner's private course
--     structure again: that is what 071 closed, so this reopens it);
--   * drops the app_runtime_all policies, revokes everything app_runtime holds
--     and drops the role;
--   * drops app_runtime_sync();
--   * removes 071's row from schema_migrations.
-- What it leaves, on purpose: the REVOKE of PUBLIC / anon / authenticated
-- EXECUTE on the project's functions and their fixed search_path. Nothing
-- depends on the old looser state. To undo those as well, per function:
--   grant execute on function <name>(<args>) to public;
--   alter function <name>(<args>) reset search_path;

set local lock_timeout = '5s';

drop policy if exists recheck_read on objectives;
create policy recheck_read on objectives for select to content_recheck using (true);
drop policy if exists recheck_read on course_units;
create policy recheck_read on course_units for select to content_recheck using (true);

do $$
declare
  p record;
begin
  if exists (select 1 from pg_roles where rolname = 'app_runtime') then
    -- Refuse while something is connected as the role: dropping it under a
    -- live session would break that session's next statement.
    if exists (select 1 from pg_stat_activity where usename = 'app_runtime') then
      raise exception 'app_runtime has open connections. Point DATABASE_URL back at the owner login, redeploy, wait a minute, then retry.';
    end if;
    for p in select schemaname, tablename, policyname from pg_policies where policyname = 'app_runtime_all' loop
      execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    end loop;
    alter role app_runtime nologin;
    execute 'drop owned by app_runtime';
    execute 'drop role app_runtime';
  end if;
end $$;

drop function if exists app_runtime_sync();

delete from schema_migrations where filename = '071_app_runtime_role.sql';
