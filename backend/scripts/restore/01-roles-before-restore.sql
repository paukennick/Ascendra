-- FAIL-1160: run BEFORE pg_restore, on the cluster you restore into.
--
-- A dump holds no roles (roles belong to the cluster), but the dump's RLS
-- policies are `... TO app_runtime` and `... TO content_recheck` (migrations
-- 064 and 071), so pg_restore fails on every one of them (about 120 errors)
-- in a cluster that has never had those roles. Create them first, with the
-- same attributes the migrations use. NOLOGIN: nothing can connect as them;
-- the LOGIN users that are members of them are made by hand afterwards
-- (docs/operations-runbook.md "Backups", docs/content-review.md).
--
-- Safe to run twice (a role that exists is left alone). The role settings
-- (statement_timeout, ...) and every grant come after the restore, from
-- migration 071 and 02-recheck-grants-after-restore.sql.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime nologin nocreatedb nocreaterole;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'content_recheck') then
    create role content_recheck nologin nocreatedb nocreaterole;
  end if;
end $$;
