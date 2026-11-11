-- Roll back migration 064 (REQ-196: content_recheck and the exec_checks tables).
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f scripts/rollback-064.sql
--
-- (--single-transaction: any error leaves everything as it was.)
--
-- YOU PROBABLY DO NOT NEED THIS. 064 is additive: the app runs unchanged with
-- it in place, and the re-check / sandbox jobs are the only users. Use it only
-- to remove the role and the two tables entirely, and only after:
--   1. the code is rolled back or the jobs are disabled (the app tolerates
--      exec_checks being absent only by holding back every lesson that carries
--      a verification program -- it fails closed, so lessons with programs
--      stop being served), and
--   2. the LOGIN user that is a member of content_recheck (docs/content-review.md,
--      "Re-check database user") is dropped first: this refuses to run while
--      one exists, because dropping the group would strand it.
--
-- What it does:
--   * drops every row-level-security policy that names content_recheck
--     (recheck_read, recheck_stage; migration 071 restated two of them);
--   * revokes everything content_recheck holds and drops the role;
--   * drops exec_check_runs and exec_checks (all queued programs and results
--     are deleted: the staged findings in item_holdbacks stay);
--   * removes 064's row from schema_migrations so a re-apply runs the file.
-- It does NOT undo 071 (app_runtime keeps its grants on the two tables until
-- they are dropped, which removes them). Roll 071 back first if you are
-- rolling both back: scripts/rollback-071.sql.

set local lock_timeout = '5s';

do $$
declare
  member text;
  p record;
begin
  select string_agg(m.rolname, ', ') into member
    from pg_auth_members am
    join pg_roles g on g.oid = am.roleid and g.rolname = 'content_recheck'
    join pg_roles m on m.oid = am.member;
  if member is not null then
    raise exception 'content_recheck still has member role(s): %. Drop those LOGIN users first (drop role <name>).', member;
  end if;

  if exists (select 1 from pg_roles where rolname = 'content_recheck') then
    for p in
      select schemaname, tablename, policyname
        from pg_policies
       where 'content_recheck' = any (roles)
    loop
      execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    end loop;
    -- Privileges on every object in this database, then the role itself.
    execute 'drop owned by content_recheck';
    execute 'drop role content_recheck';
  end if;
end $$;

drop table if exists exec_check_runs;
drop table if exists exec_checks;

delete from schema_migrations where filename = '064_recheck_role.sql';
