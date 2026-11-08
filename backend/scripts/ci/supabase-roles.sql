-- Supabase creates the `anon` and `authenticated` roles in every project;
-- migrations 026 (line B, REQ-092) and 052 revoke privileges from them, so a
-- plain Postgres (CI, a local cluster) needs them before `migrate --all`.
-- NOLOGIN: nothing can connect as them. Safe to run twice.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
